import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import { useInvoice, updateInvoice } from '../../hooks/useInvoices';
import { useColumns } from '../../hooks/useColumns';
import { CustomerCombobox } from '../../components/invoice/CustomerCombobox';
import { LineItemsTable } from '../../components/invoice/LineItemsTable';
import { TotalsPanel } from '../../components/invoice/TotalsPanel';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { calculateTotals } from '../../utils/calculations';
import type { LineItemInput } from '../../hooks/useInvoices';
import type { GstType } from '../../db/types';

export default function InvoiceEdit() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const columns   = useColumns();

  const data = useInvoice(Number(id));

  const [ready,         setReady]         = useState(false);
  const [customerId,    setCustomerId]    = useState<number | null>(null);
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date,          setDate]          = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [gstEnabled,    setGstEnabled]    = useState(false);
  const [gstType,       setGstType]       = useState<GstType>('CGST_SGST');
  const [gstRate,       setGstRate]       = useState(18);
  const [notes,         setNotes]         = useState('');
  const [items,         setItems]         = useState<LineItemInput[]>([]);
  const [saving,        setSaving]        = useState(false);

  // Populate form from loaded invoice (runs once)
  useEffect(() => {
    if (!data || ready) return;
    const { invoice, items: existingItems } = data;
    setCustomerId(invoice.customerId);
    setCustomerName(invoice.customerSnapshot.name);
    setCustomerPhone(invoice.customerSnapshot.phone);
    setDate(format(new Date(invoice.date), 'yyyy-MM-dd'));
    setDueDate(format(new Date(invoice.dueDate), 'yyyy-MM-dd'));
    setGstEnabled(invoice.gstEnabled);
    setGstType(invoice.gstType === 'none' ? 'CGST_SGST' : invoice.gstType);
    setGstRate(invoice.gstRate);
    setNotes(invoice.notes);
    setItems(existingItems.map(item => ({
      description:  item.description,
      customFields: item.customFields,
      amount:       item.amount,
    })));
    setReady(true);
  }, [data, ready]);

  const totals = calculateTotals(items.map(i => i.amount), gstEnabled, gstRate, gstType);

  async function submit() {
    if (!customerName.trim()) { toast('error', 'Customer name is required'); return; }
    if (items.length === 0)   { toast('error', 'Add at least one line item'); return; }
    setSaving(true);
    try {
      await updateInvoice(
        Number(id),
        { customerId, customerName, customerPhone, date, dueDate, gstEnabled, gstType, gstRate, notes },
        items
      );
      toast('success', 'Invoice updated');
      navigate(`/invoices/${id}`);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Could not update invoice');
    } finally {
      setSaving(false);
    }
  }

  if (data === undefined) return <PageSpinner />;
  if (!data) return <div className="p-6 text-[var(--text-muted)]">Invoice not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(`/invoices/${id}`)}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Invoice
      </button>

      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
        Edit {data.invoice.invoiceNumber}
      </h1>

      <div className="space-y-5">
        {/* ── Customer ── */}
        <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Customer</h2>
          <CustomerCombobox
            customerId={customerId}
            customerName={customerName}
            customerPhone={customerPhone}
            onChange={(cid, name, phone) => {
              setCustomerId(cid);
              setCustomerName(name);
              setCustomerPhone(phone);
            }}
          />
        </section>

        {/* ── Invoice details ── */}
        <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Invoice Date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any instructions or remarks…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
            />
          </div>
        </section>

        {/* ── GST ── */}
        <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">GST</h2>
            <Toggle checked={gstEnabled} onCheckedChange={setGstEnabled} />
          </div>
          {gstEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">GST Type</label>
                <select
                  value={gstType}
                  onChange={e => setGstType(e.target.value as GstType)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                >
                  <option value="CGST_SGST">CGST + SGST (intra-state)</option>
                  <option value="IGST">IGST (inter-state)</option>
                </select>
              </div>
              <Input
                label="GST Rate (%)"
                type="number"
                min="0"
                max="100"
                value={String(gstRate)}
                onChange={e => setGstRate(Number(e.target.value))}
              />
            </div>
          )}
        </section>

        {/* ── Line items ── */}
        <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Items</h2>
          <LineItemsTable columns={columns} items={items} onChange={setItems} />
        </section>

        {/* ── Totals ── */}
        <TotalsPanel totals={totals} gstEnabled={gstEnabled} gstType={gstType} gstRate={gstRate} />

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pb-6">
          <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)}>Cancel</Button>
          <Button
            icon={<Save className="w-4 h-4" />}
            loading={saving}
            onClick={submit}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
