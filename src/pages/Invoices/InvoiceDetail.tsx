import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { useInvoice, recordPayment, deleteInvoice } from '../../hooks/useInvoices';
import { useColumns } from '../../hooks/useColumns';
import { LineItemsTable } from '../../components/invoice/LineItemsTable';
import { TotalsPanel } from '../../components/invoice/TotalsPanel';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/currency';
import { formatDate, isOverdue, getDaysOverdue } from '../../utils/dates';

export default function InvoiceDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const columns   = useColumns();

  const data = useInvoice(Number(id));

  const [showPayment, setShowPayment] = useState(false);
  const [payAmt,      setPayAmt]      = useState('');
  const [payDate,     setPayDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payNote,     setPayNote]     = useState('');
  const [paying,      setPaying]      = useState(false);

  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  if (data === undefined) return <PageSpinner />;
  if (!data) return <div className="p-6 text-[var(--text-muted)]">Invoice not found.</div>;

  const { invoice, items, payments, customer } = data;
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const status  = overdue ? 'overdue' : invoice.status;
  const days    = overdue ? getDaysOverdue(invoice.dueDate) : 0;
  const balance = invoice.total - invoice.paidAmount;

  async function handlePayment() {
    const amount = parseFloat(payAmt);
    if (!amount || amount <= 0) { toast('error', 'Enter a valid amount'); return; }
    setPaying(true);
    try {
      await recordPayment(invoice.id!, amount, new Date(payDate), payNote);
      toast('success', 'Payment recorded');
      setShowPayment(false);
      setPayAmt('');
      setPayNote('');
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Could not record payment');
    } finally {
      setPaying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id!);
      toast('success', 'Invoice deleted');
      navigate('/invoices');
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Could not delete');
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> All Invoices
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{invoice.invoiceNumber}</h1>
            <Badge status={status} />
          </div>
          {overdue && (
            <p className="text-sm text-[var(--danger)]">{days} day{days !== 1 ? 's' : ''} overdue</p>
          )}
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Issued {formatDate(invoice.date)} · Due {formatDate(invoice.dueDate)}
          </p>
        </div>

        <div className="flex gap-2">
          {invoice.status !== 'paid' && (
            <Button
              size="sm"
              icon={<IndianRupee className="w-3.5 h-3.5" />}
              onClick={() => setShowPayment(true)}
            >
              Record Payment
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setShowDelete(true)}
            className="text-[var(--danger)] hover:bg-[var(--danger-subtle,#fef2f2)]"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Customer + Invoice info ── */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Bill To</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{invoice.customerSnapshot.name}</p>
            {invoice.customerSnapshot.phone && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{invoice.customerSnapshot.phone}</p>
            )}
            {invoice.customerSnapshot.address && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{invoice.customerSnapshot.address}</p>
            )}
            {invoice.customerSnapshot.gstNumber && (
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">GST: {invoice.customerSnapshot.gstNumber}</p>
            )}
            {customer && (
              <button
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="text-xs text-[var(--primary)] hover:underline mt-2 block"
              >
                View customer →
              </button>
            )}
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Summary</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Total</span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Paid</span>
                <span className="tabular-nums text-[var(--success)]">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm border-t border-[var(--border)] pt-1.5 mt-1.5">
                  <span className="font-medium text-[var(--text-secondary)]">Balance Due</span>
                  <span className="font-bold tabular-nums text-[var(--warning)]">{formatCurrency(balance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Line items ── */}
        <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Items</h2>
          <LineItemsTable columns={columns} items={items} onChange={() => {}} readOnly />
        </section>

        {/* ── Totals ── */}
        <TotalsPanel
          totals={{
            subtotal:  invoice.subtotal,
            gstAmount: invoice.gstAmount,
            cgst:      invoice.gstType === 'CGST_SGST' ? invoice.gstAmount / 2 : 0,
            sgst:      invoice.gstType === 'CGST_SGST' ? invoice.gstAmount / 2 : 0,
            igst:      invoice.gstType === 'IGST'      ? invoice.gstAmount : 0,
            total:     invoice.total,
          }}
          gstEnabled={invoice.gstEnabled}
          gstType={invoice.gstType}
          gstRate={invoice.gstRate}
        />

        {/* ── Notes ── */}
        {invoice.notes && (
          <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Notes</h2>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{invoice.notes}</p>
          </section>
        )}

        {/* ── Payment history ── */}
        {payments.length > 0 && (
          <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
              Payments ({payments.length})
            </h2>
            <div className="space-y-2">
              {payments.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(p.date)}</p>
                    {p.note && <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.note}</p>}
                  </div>
                  <span className="text-sm font-medium tabular-nums text-[var(--success)]">
                    + {formatCurrency(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
        description={`Balance due: ${formatCurrency(balance)}`}
      >
        <div className="space-y-3">
          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            step="0.01"
            value={payAmt}
            onChange={e => setPayAmt(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
          <Input
            label="Payment Date"
            type="date"
            value={payDate}
            onChange={e => setPayDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Note (optional)</label>
            <input
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              placeholder="e.g. Cash, UPI, Cheque…"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button loading={paying} onClick={handlePayment}>Record</Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Invoice"
        description={`Delete ${invoice.invoiceNumber}? This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleting}
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
