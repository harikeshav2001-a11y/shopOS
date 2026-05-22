import type { ColumnTemplate, GstType } from '../db/types';
import { db } from '../db/db';

// ── Line item amount ───────────────────────────────────────────────────────────
export function calculateLineAmount(
  customFields: Record<string, string | number>,
  columns: ColumnTemplate[]
): number | null {
  const mCol = columns.find(c => c.calcRole === 'multiplier');
  const rCol = columns.find(c => c.calcRole === 'rate');
  if (!mCol || !rCol) return null; // no formula — manual entry
  const m = Number(customFields[mCol.key] ?? 0);
  const r = Number(customFields[rCol.key] ?? 0);
  return m * r;
}

// ── Invoice totals ─────────────────────────────────────────────────────────────
export interface Totals {
  subtotal:  number;
  gstAmount: number;
  cgst:      number;
  sgst:      number;
  igst:      number;
  total:     number;
}

export function calculateTotals(
  itemAmounts: number[],
  gstEnabled: boolean,
  gstRate: number,
  gstType: GstType
): Totals {
  const subtotal  = itemAmounts.reduce((s, a) => s + (isNaN(a) ? 0 : a), 0);
  if (!gstEnabled || gstType === 'none') {
    return { subtotal, gstAmount: 0, cgst: 0, sgst: 0, igst: 0, total: subtotal };
  }
  const gstAmount = parseFloat((subtotal * gstRate / 100).toFixed(2));
  const half      = parseFloat((gstAmount / 2).toFixed(2));
  return {
    subtotal,
    gstAmount,
    cgst:  gstType === 'CGST_SGST' ? half : 0,
    sgst:  gstType === 'CGST_SGST' ? half : 0,
    igst:  gstType === 'IGST'      ? gstAmount : 0,
    total: parseFloat((subtotal + gstAmount).toFixed(2)),
  };
}

// ── Invoice number ─────────────────────────────────────────────────────────────
export async function generateInvoiceNumber(): Promise<string> {
  const settings = await db.settings.get(1);
  if (!settings) throw new Error('Settings not found');
  const next = (settings.invoiceCounter ?? 0) + 1;
  await db.settings.update(1, { invoiceCounter: next, updatedAt: new Date() });
  return `${settings.invoicePrefix}${String(next).padStart(4, '0')}`;
}

// ── Overdue helpers (re-exported from dates for convenience) ───────────────────
export { isOverdue, getDaysOverdue } from './dates';
