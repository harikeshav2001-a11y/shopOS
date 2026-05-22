import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Clock, Mail, CheckCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getDaysOverdue } from '../../utils/dates';
import { differenceInDays } from 'date-fns';
import { cn } from '../../utils/cn';

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { overdueInvoices, upcomingBills, backupOverdue, daysSinceBackup } = useNotifications();

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const hasAnything = overdueInvoices.length > 0 || upcomingBills.length > 0 || backupOverdue;

  function go(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'fixed z-50 bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl',
        'flex flex-col',
        // Desktop: anchored left of sidebar bottom area
        'md:left-[244px] md:bottom-4 md:w-80 md:max-h-[70vh] md:rounded-2xl',
        // Mobile: bottom sheet
        'left-0 right-0 bottom-0 max-h-[75vh] rounded-t-2xl md:right-auto',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {!hasAnything && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <CheckCircle className="w-10 h-10 text-[var(--success)] mb-3 opacity-60" />
              <p className="text-sm font-medium text-[var(--text-primary)]">All clear</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">No overdue items or reminders.</p>
            </div>
          )}

          {/* ── Overdue invoices ── */}
          {overdueInvoices.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-[var(--danger)] uppercase tracking-wide">
                Overdue Invoices · {overdueInvoices.length}
              </p>
              {overdueInvoices.map(inv => {
                const days    = getDaysOverdue(inv.dueDate);
                const balance = inv.total - inv.paidAmount;
                return (
                  <button
                    key={inv.id}
                    onClick={() => go(`/invoices/${inv.id}`)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors text-left border-b border-[var(--border)] last:border-0"
                  >
                    <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{inv.customerSnapshot.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{inv.invoiceNumber} · {days}d overdue</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--danger)] shrink-0">
                      {formatCurrency(balance)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Upcoming bills ── */}
          {upcomingBills.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-[var(--warning)] uppercase tracking-wide">
                Bills Due Soon · {upcomingBills.length}
              </p>
              {upcomingBills.map(bill => {
                const days = differenceInDays(new Date(bill.dueDate), new Date());
                return (
                  <button
                    key={bill.id}
                    onClick={() => go('/bills')}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors text-left border-b border-[var(--border)] last:border-0"
                  >
                    <Clock className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{bill.vendorName}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Due {formatDate(bill.dueDate)} · {days === 0 ? 'today' : `${days}d left`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--warning)] shrink-0">
                      {formatCurrency(bill.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Backup reminder ── */}
          {backupOverdue && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                Backup Reminder
              </p>
              <button
                onClick={() => go('/settings/data')}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors text-left"
              >
                <Mail className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {daysSinceBackup === null ? 'No backup sent yet' : `Last backup ${daysSinceBackup} days ago`}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Tap to go to Settings → Data and send a backup email.</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
