import { cn } from '../../utils/cn';
import type { InvoiceStatus, BillStatus } from '../../db/types';

interface BadgeProps {
  status: InvoiceStatus | BillStatus | 'overdue';
  className?: string;
}

const styles: Record<string, string> = {
  draft:   'bg-[var(--neutral-subtle)] text-[var(--neutral)]',
  unpaid:  'bg-[var(--warning-subtle)] text-[var(--warning)]',
  overdue: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  paid:    'bg-[var(--success-subtle)] text-[var(--success)]',
  pending: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
};

const labels: Record<string, string> = {
  draft:   'Draft',
  unpaid:  'Unpaid',
  overdue: 'Overdue',
  partial: 'Partial',
  paid:    'Paid',
  pending: 'Pending',
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
      styles[status] ?? styles.draft,
      className
    )}>
      {labels[status] ?? status}
    </span>
  );
}
