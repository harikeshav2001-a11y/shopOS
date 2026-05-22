import { useState } from 'react';
import { Receipt, Plus, Pencil, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useBills, addBill, updateBill, deleteBill, markBillPaid, markBillUnpaid } from '../hooks/useBills';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dates';
import { cn } from '../utils/cn';
import type { Bill, BillStatus } from '../db/types';

// ── Helpers ────────────────────────────────────────────────────────────────────
function isBillOverdue(bill: Bill): boolean {
  return bill.status === 'pending' && new Date() > new Date(bill.dueDate);
}

type FilterValue = 'all' | 'pending' | 'overdue' | 'paid';

// ── Bill Form Modal ────────────────────────────────────────────────────────────
interface FormModalProps {
  open:    boolean;
  onClose: () => void;
  initial?: Bill;
}

function BillFormModal({ open, onClose, initial }: FormModalProps) {
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [vendorName,  setVendorName]  = useState(initial?.vendorName  ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : '');
  const [dueDate,     setDueDate]     = useState(
    initial ? format(new Date(initial.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [notes,       setNotes]       = useState(initial?.notes ?? '');
  const [saving,      setSaving]      = useState(false);

  async function save() {
    if (!vendorName.trim())            { toast('error', 'Vendor name is required'); return; }
    if (!amount || Number(amount) <= 0) { toast('error', 'Enter a valid amount');   return; }

    setSaving(true);
    try {
      const payload = {
        vendorName:  vendorName.trim(),
        description: description.trim(),
        amount:      parseFloat(amount),
        dueDate:     new Date(dueDate),
        status:      (initial?.status ?? 'pending') as BillStatus,
        notes:       notes.trim(),
      };
      if (isEdit) {
        await updateBill(initial!.id!, payload);
        toast('success', 'Bill updated');
      } else {
        await addBill(payload);
        toast('success', 'Bill added');
      }
      onClose();
    } catch {
      toast('error', 'Could not save bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Bill' : 'Add Bill'}>
      <div className="space-y-3">
        <Input
          label="Vendor / Supplier"
          value={vendorName}
          onChange={e => setVendorName(e.target.value)}
          placeholder="e.g. Steel Suppliers Ltd."
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this bill for?"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (₹)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra details…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isEdit ? 'Save Changes' : 'Add Bill'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BillsTracker() {
  const bills      = useBills();
  const { toast }  = useToast();

  const [filter,       setFilter]       = useState<FilterValue>('all');
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<Bill | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Bill | undefined>();
  const [deleting,     setDeleting]     = useState(false);

  const pendingBills = bills.filter(b => b.status === 'pending');
  const overdueBills = bills.filter(isBillOverdue);
  const totalPending = pendingBills.reduce((s, b) => s + b.amount, 0);
  const totalOverdue = overdueBills.reduce((s, b) => s + b.amount, 0);

  const filtered = bills.filter(b => {
    const overdue = isBillOverdue(b);
    if (filter === 'pending') return b.status === 'pending' && !overdue;
    if (filter === 'overdue') return overdue;
    if (filter === 'paid')    return b.status === 'paid';
    return true;
  });

  async function togglePaid(bill: Bill) {
    try {
      if (bill.status === 'paid') {
        await markBillUnpaid(bill.id!);
        toast('success', 'Marked as pending');
      } else {
        await markBillPaid(bill.id!);
        toast('success', 'Marked as paid');
      }
    } catch {
      toast('error', 'Could not update bill');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBill(deleteTarget.id!);
      toast('success', 'Bill deleted');
      setDeleteTarget(undefined);
    } catch {
      toast('error', 'Could not delete bill');
    } finally {
      setDeleting(false);
    }
  }

  const FILTERS: { label: string; value: FilterValue }[] = [
    { label: 'All',     value: 'all'     },
    { label: 'Pending', value: 'pending' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Paid',    value: 'paid'    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Bills Tracker</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Track what you owe to vendors and suppliers</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(undefined); setShowForm(true); }}>
          <span className="hidden sm:inline">Add Bill</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Stats */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Pending</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums text-[var(--warning)]">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{pendingBills.length} bill{pendingBills.length !== 1 ? 's' : ''}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Overdue</p>
            <p className={cn('text-xl md:text-2xl font-bold tabular-nums', totalOverdue > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
              {formatCurrency(totalOverdue)}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{overdueBills.length} bill{overdueBills.length !== 1 ? 's' : ''}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Total</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums text-[var(--text-primary)]">{bills.length}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{bills.filter(b => b.status === 'paid').length} paid</p>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {bills.length === 0 && (
        <EmptyState
          icon={<Receipt className="w-12 h-12" strokeWidth={1.5} />}
          title="No bills yet"
          description="Add bills from your vendors and suppliers to keep track of what you owe."
          action={{ label: 'Add Bill', onClick: () => setShowForm(true) }}
        />
      )}

      {bills.length > 0 && (
        <>
          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">No bills match this filter.</div>
          )}

          {filtered.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">

              {/* ── Desktop table ── */}
              <div className="hidden md:block">
                <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Vendor</span>
                  <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Description</span>
                  <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Due Date</span>
                  <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Amount</span>
                  <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Actions</span>
                </div>

                {filtered.map((bill, i) => {
                  const overdue = isBillOverdue(bill);
                  const status  = overdue ? 'overdue' : bill.status;
                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        'grid grid-cols-12 gap-3 px-4 py-3 items-center',
                        i < filtered.length - 1 && 'border-b border-[var(--border)]',
                        overdue && 'border-l-2 border-l-[var(--danger)]'
                      )}
                    >
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{bill.vendorName}</p>
                        {bill.notes && <p className="text-xs text-[var(--text-muted)] truncate">{bill.notes}</p>}
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-[var(--text-secondary)] truncate">{bill.description || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[var(--text-secondary)]">{formatDate(bill.dueDate)}</p>
                        {bill.status === 'paid' && bill.paidDate && (
                          <p className="text-xs text-[var(--text-muted)]">Paid {formatDate(bill.paidDate)}</p>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm tabular-nums font-medium text-[var(--text-primary)]">{formatCurrency(bill.amount)}</p>
                        <Badge status={status} />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          title={bill.status === 'paid' ? 'Mark as pending' : 'Mark as paid'}
                          onClick={() => togglePaid(bill)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success-subtle,#f0fdf4)] transition-colors"
                        >
                          {bill.status === 'paid' ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          title="Edit"
                          onClick={() => { setEditing(bill); setShowForm(true); }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)] hover:bg-opacity-10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setDeleteTarget(bill)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle,#fef2f2)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Mobile cards ── */}
              <div className="md:hidden divide-y divide-[var(--border)]">
                {filtered.map(bill => {
                  const overdue = isBillOverdue(bill);
                  const status  = overdue ? 'overdue' : bill.status;
                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        'px-4 py-3.5',
                        overdue && 'border-l-2 border-l-[var(--danger)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{bill.vendorName}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {bill.description || 'No description'} · Due {formatDate(bill.dueDate)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                            {formatCurrency(bill.amount)}
                          </span>
                          <Badge status={status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 justify-end">
                        <button
                          title={bill.status === 'paid' ? 'Mark as pending' : 'Mark as paid'}
                          onClick={() => togglePaid(bill)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success-subtle,#f0fdf4)] transition-colors"
                        >
                          {bill.status === 'paid' ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setEditing(bill); setShowForm(true); }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)] hover:bg-opacity-10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(bill)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle,#fef2f2)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <BillFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          initial={editing}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        title="Delete Bill"
        description={`Delete the bill from "${deleteTarget?.vendorName}"? This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
          <Button variant="danger" loading={deleting} icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
