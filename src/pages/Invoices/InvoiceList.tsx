import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import { useInvoiceList } from '../../hooks/useInvoices';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { formatDate, isOverdue } from '../../utils/dates';
import { cn } from '../../utils/cn';

type FilterValue = 'all' | 'unpaid' | 'overdue' | 'partial' | 'paid' | 'draft';

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All',     value: 'all'     },
  { label: 'Unpaid',  value: 'unpaid'  },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid',    value: 'paid'    },
  { label: 'Draft',   value: 'draft'   },
];

export default function InvoiceList() {
  const invoices       = useInvoiceList();
  const navigate       = useNavigate();
  const [search,       setSearch]  = useState('');
  const [activeFilter, setFilter]  = useState<FilterValue>('all');

  const filtered = invoices.filter(inv => {
    const overdue       = isOverdue(inv.dueDate, inv.status);
    const displayStatus = overdue ? 'overdue' : inv.status;

    if (activeFilter !== 'all' && displayStatus !== activeFilter) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;

    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerSnapshot.name.toLowerCase().includes(q) ||
      inv.customerSnapshot.phone.includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Invoices</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} total
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/invoices/new')}>
          New Invoice
        </Button>
      </div>

      {/* Empty state */}
      {invoices.length === 0 && (
        <EmptyState
          icon={<FileText className="w-12 h-12" strokeWidth={1.5} />}
          title="No invoices yet"
          description="Create your first invoice to get started."
          action={{ label: 'New Invoice', onClick: () => navigate('/invoices/new') }}
        />
      )}

      {invoices.length > 0 && (
        <>
          {/* Status filter chips */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  activeFilter === f.value
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by invoice number or customer name…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>

          {/* No results */}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">
              No invoices match your filters.
            </div>
          )}

          {/* Table */}
          {filtered.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Invoice</span>
                <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Customer</span>
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Due Date</span>
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Amount</span>
                <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Status</span>
              </div>

              {filtered.map((inv, i) => {
                const overdue = isOverdue(inv.dueDate, inv.status);
                const status  = overdue ? 'overdue' : inv.status;

                return (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className={cn(
                      'grid grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer',
                      'hover:bg-[var(--bg-elevated)] transition-colors',
                      i < filtered.length - 1 && 'border-b border-[var(--border)]',
                      overdue && 'border-l-2 border-l-[var(--danger)]'
                    )}
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{inv.invoiceNumber}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(inv.date)}</p>
                    </div>

                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{inv.customerSnapshot.name}</p>
                      {inv.customerSnapshot.phone && (
                        <p className="text-xs text-[var(--text-muted)]">{inv.customerSnapshot.phone}</p>
                      )}
                    </div>

                    <div className="col-span-2 text-sm text-[var(--text-secondary)]">
                      {formatDate(inv.dueDate)}
                    </div>

                    <div className="col-span-2 text-right">
                      <p className="text-sm tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(inv.total)}
                      </p>
                      {inv.paidAmount > 0 && inv.paidAmount < inv.total && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Pd {formatCurrency(inv.paidAmount)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <Badge status={status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
