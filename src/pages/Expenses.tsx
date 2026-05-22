import { useState, useMemo } from 'react';
import { Wallet, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval } from 'date-fns';
import { useExpenses, addExpense, updateExpense, deleteExpense } from '../hooks/useExpenses';
import { useSettingsValue } from '../hooks/useSettings';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dates';
import { cn } from '../utils/cn';
import type { Expense } from '../db/types';

// ── Expense form modal ─────────────────────────────────────────────────────────
interface FormModalProps {
  open:      boolean;
  onClose:   () => void;
  initial?:  Expense;
  categories: string[];
}

function ExpenseFormModal({ open, onClose, initial, categories }: FormModalProps) {
  const { toast } = useToast();
  const isEdit    = !!initial?.id;

  const [date,        setDate]        = useState(
    initial ? format(new Date(initial.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [category,    setCategory]    = useState(initial?.category    ?? categories[0] ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : '');
  const [saving,      setSaving]      = useState(false);

  async function save() {
    if (!amount || Number(amount) <= 0) { toast('error', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      const payload = {
        date:        new Date(date),
        category:    category || categories[0] || 'Other',
        description: description.trim(),
        amount:      parseFloat(amount),
      };
      if (isEdit) {
        await updateExpense(initial!.id!, payload);
        toast('success', 'Expense updated');
      } else {
        await addExpense(payload);
        toast('success', 'Expense added');
      }
      onClose();
    } catch {
      toast('error', 'Could not save expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Expense' : 'Add Expense'}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What was this expense for?"
          autoFocus
        />
        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isEdit ? 'Save Changes' : 'Add Expense'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Expenses() {
  const expenses   = useExpenses();
  const settings   = useSettingsValue();
  const { toast }  = useToast();

  const categories = settings?.expenseCategories ?? ['Materials', 'Rent', 'Utilities', 'Tools', 'Other'];

  const [viewMonth,     setViewMonth]     = useState(new Date());
  const [catFilter,     setCatFilter]     = useState('all');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<Expense | undefined>();
  const [deleteTarget,  setDeleteTarget]  = useState<Expense | undefined>();
  const [deleting,      setDeleting]      = useState(false);

  // ── Month-filtered expenses ──
  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);

  const monthExpenses = useMemo(
    () => expenses.filter(e => isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })),
    [expenses, viewMonth]
  );

  const filtered = catFilter === 'all'
    ? monthExpenses
    : monthExpenses.filter(e => e.category === catFilter);

  // ── Stats ──
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id!);
      toast('success', 'Expense deleted');
      setDeleteTarget(undefined);
    } catch {
      toast('error', 'Could not delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Expenses</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Track your business spending</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(undefined); setShowForm(true); }}>
          Add Expense
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setViewMonth(prev => subMonths(prev, 1))}
          className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {format(viewMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setViewMonth(prev => addMonths(prev, 1))}
          className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"
          disabled={startOfMonth(addMonths(viewMonth, 1)) > new Date()}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {monthExpenses.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Total This Month
            </p>
            <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
              {formatCurrency(monthTotal)}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {monthExpenses.length} expense{monthExpenses.length !== 1 ? 's' : ''}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
              Top Categories
            </p>
            <div className="space-y-1.5">
              {byCategory.slice(0, 3).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)] truncate">{cat}</span>
                  <span className="text-xs tabular-nums font-medium text-[var(--text-primary)]">
                    {formatCurrency(amt)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {expenses.length === 0 && (
        <EmptyState
          icon={<Wallet className="w-12 h-12" strokeWidth={1.5} />}
          title="No expenses yet"
          description="Start recording your business expenses to track your spending."
          action={{ label: 'Add Expense', onClick: () => setShowForm(true) }}
        />
      )}

      {expenses.length > 0 && (
        <>
          {/* Category filter chips */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setCatFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                catFilter === 'all'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              )}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  catFilter === c
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* No results for this month */}
          {monthExpenses.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">
              No expenses in {format(viewMonth, 'MMMM yyyy')}.
            </div>
          )}

          {/* Filtered empty */}
          {monthExpenses.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">
              No "{catFilter}" expenses this month.
            </div>
          )}

          {/* Table */}
          {filtered.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Date</span>
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Category</span>
                <span className="col-span-5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Description</span>
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Amount</span>
                <span className="col-span-1" />
              </div>

              {filtered.map((exp, i) => (
                <div
                  key={exp.id}
                  className={cn(
                    'grid grid-cols-12 gap-3 px-4 py-3 items-center',
                    i < filtered.length - 1 && 'border-b border-[var(--border)]'
                  )}
                >
                  <div className="col-span-2 text-sm text-[var(--text-secondary)]">
                    {formatDate(exp.date)}
                  </div>

                  <div className="col-span-2">
                    <span className="inline-flex px-2 py-0.5 rounded-sm text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                      {exp.category}
                    </span>
                  </div>

                  <div className="col-span-5">
                    <p className="text-sm text-[var(--text-primary)] truncate">{exp.description || '—'}</p>
                  </div>

                  <div className="col-span-2 text-right">
                    <p className="text-sm tabular-nums font-medium text-[var(--text-primary)]">
                      {formatCurrency(exp.amount)}
                    </p>
                  </div>

                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditing(exp); setShowForm(true); }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(exp)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Month subtotal row */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
                <div className="col-span-9 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  {catFilter === 'all' ? 'Month Total' : `${catFilter} Total`}
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm tabular-nums font-bold text-[var(--text-primary)]">
                    {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
                  </p>
                </div>
                <div className="col-span-1" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <ExpenseFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          initial={editing}
          categories={categories}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        title="Delete Expense"
        description="Are you sure? This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
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
