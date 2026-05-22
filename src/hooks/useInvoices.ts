import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { generateInvoiceNumber, calculateTotals } from '../utils/calculations';
import { findOrCreateCustomer } from './useCustomers';
import type { Invoice, InvoiceItem, Payment, GstType } from '../db/types';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface LineItemInput {
  description:  string;
  customFields: Record<string, string | number>;
  amount:       number;
}

export interface InvoiceInput {
  customerId:   number | null;
  customerName: string;
  customerPhone: string;
  date:         string;        // 'yyyy-MM-dd'
  dueDate:      string;
  gstEnabled:   boolean;
  gstType:      GstType;
  gstRate:      number;
  notes:        string;
}

// ── Queries ────────────────────────────────────────────────────────────────────
export function useInvoiceList() {
  return useLiveQuery(async () => {
    const invoices  = await db.invoices.orderBy('date').reverse().toArray();
    const customers = await db.customers.toArray();
    const custMap   = new Map(customers.map(c => [c.id!, c]));
    return invoices.map(inv => ({ ...inv, customer: custMap.get(inv.customerId) }));
  }, []) ?? [];
}

export function useInvoice(id: number) {
  return useLiveQuery(async () => {
    const [invoice, items, payments] = await Promise.all([
      db.invoices.get(id),
      db.invoiceItems.where('invoiceId').equals(id).sortBy('sortOrder'),
      db.payments.where('invoiceId').equals(id).sortBy('date'),
    ]);
    if (!invoice) return undefined;
    const customer = await db.customers.get(invoice.customerId);
    return { invoice, items, payments, customer };
  }, [id]);
}

export function useInvoicePayments(invoiceId: number): Payment[] {
  return useLiveQuery(
    () => db.payments.where('invoiceId').equals(invoiceId).sortBy('date'),
    [invoiceId]
  ) ?? [];
}

// ── Save (create) ──────────────────────────────────────────────────────────────
export async function saveInvoice(
  input: InvoiceInput,
  lineItems: LineItemInput[],
  isDraft: boolean
): Promise<number> {
  return db.transaction('rw', [db.invoices, db.invoiceItems, db.customers, db.settings], async () => {
    // Resolve customer
    let customerId = input.customerId;
    if (!customerId && input.customerName.trim()) {
      customerId = await findOrCreateCustomer(input.customerName.trim(), input.customerPhone.trim());
    }
    if (!customerId) throw new Error('Customer is required');

    const customer = await db.customers.get(customerId);

    // Totals
    const amounts = lineItems.map(i => i.amount);
    const totals  = calculateTotals(amounts, input.gstEnabled, input.gstRate, input.gstType);

    // Invoice number
    const invoiceNumber = isDraft ? 'DRAFT' : await generateInvoiceNumber();

    const invoiceId = await db.invoices.add({
      invoiceNumber,
      customerId,
      customerSnapshot: {
        name:      customer?.name      ?? input.customerName,
        phone:     customer?.phone     ?? input.customerPhone,
        address:   customer?.address   ?? '',
        gstNumber: customer?.gstNumber ?? '',
      },
      date:       new Date(input.date),
      dueDate:    new Date(input.dueDate),
      status:     isDraft ? 'draft' : 'unpaid',
      gstEnabled: input.gstEnabled,
      gstType:    input.gstEnabled ? input.gstType : 'none',
      gstRate:    input.gstRate,
      ...totals,
      paidAmount: 0,
      notes:      input.notes,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    } as Invoice);

    await db.invoiceItems.bulkAdd(
      lineItems.map((item, idx) => ({
        invoiceId,
        description:  item.description,
        customFields: item.customFields,
        amount:       item.amount,
        sortOrder:    idx,
      } as InvoiceItem))
    );

    return invoiceId;
  });
}

// ── Update (edit) ──────────────────────────────────────────────────────────────
export async function updateInvoice(
  id: number,
  input: InvoiceInput,
  lineItems: LineItemInput[]
): Promise<void> {
  await db.transaction('rw', [db.invoices, db.invoiceItems, db.customers, db.settings], async () => {
    const existing = await db.invoices.get(id);
    if (!existing) throw new Error('Invoice not found');

    let customerId = input.customerId ?? existing.customerId;
    if (!customerId && input.customerName.trim()) {
      customerId = await findOrCreateCustomer(input.customerName.trim(), input.customerPhone.trim());
    }
    const customer = await db.customers.get(customerId);

    const amounts = lineItems.map(i => i.amount);
    const totals  = calculateTotals(amounts, input.gstEnabled, input.gstRate, input.gstType);

    // Assign number if it was a draft being saved properly
    let invoiceNumber = existing.invoiceNumber;
    if (invoiceNumber === 'DRAFT' && existing.status === 'draft') {
      invoiceNumber = await generateInvoiceNumber();
    }

    await db.invoices.update(id, {
      invoiceNumber,
      customerId,
      customerSnapshot: {
        name:      customer?.name      ?? input.customerName,
        phone:     customer?.phone     ?? input.customerPhone,
        address:   customer?.address   ?? '',
        gstNumber: customer?.gstNumber ?? '',
      },
      date:       new Date(input.date),
      dueDate:    new Date(input.dueDate),
      status:     existing.status === 'draft' ? 'unpaid' : existing.status,
      gstEnabled: input.gstEnabled,
      gstType:    input.gstEnabled ? input.gstType : 'none',
      gstRate:    input.gstRate,
      ...totals,
      notes:      input.notes,
      updatedAt:  new Date(),
    });

    // Replace all items
    await db.invoiceItems.where('invoiceId').equals(id).delete();
    await db.invoiceItems.bulkAdd(
      lineItems.map((item, idx) => ({
        invoiceId: id,
        description:  item.description,
        customFields: item.customFields,
        amount:       item.amount,
        sortOrder:    idx,
      } as InvoiceItem))
    );
  });
}

// ── Record payment ─────────────────────────────────────────────────────────────
export async function recordPayment(
  invoiceId: number,
  amount: number,
  date: Date,
  note: string
): Promise<void> {
  await db.transaction('rw', [db.invoices, db.payments], async () => {
    await db.payments.add({ invoiceId, amount, date, note, createdAt: new Date() } as Payment);

    const all = await db.payments.where('invoiceId').equals(invoiceId).toArray();
    const paidAmount = parseFloat(all.reduce((s, p) => s + p.amount, 0).toFixed(2));
    const invoice    = await db.invoices.get(invoiceId);
    if (!invoice) return;

    const status = paidAmount >= invoice.total ? 'paid'
                 : paidAmount > 0              ? 'partial'
                 : 'unpaid';

    await db.invoices.update(invoiceId, { paidAmount, status, updatedAt: new Date() });
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────────
export async function deleteInvoice(id: number): Promise<void> {
  await db.transaction('rw', [db.invoices, db.invoiceItems, db.payments], async () => {
    await db.invoiceItems.where('invoiceId').equals(id).delete();
    await db.payments.where('invoiceId').equals(id).delete();
    await db.invoices.delete(id);
  });
}
