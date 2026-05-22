import { useLiveQuery } from 'dexie-react-hooks';
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval } from 'date-fns';
import { db } from '../db/db';
import type { Invoice } from '../db/types';

export interface MonthPoint {
  month:     string;
  billed:    number;
  collected: number;
  expenses:  number;
}

export interface DashboardData {
  monthlyBilled:    number;
  monthlyCollected: number;
  totalOutstanding: number;
  monthlyExpenses:  number;
  overdueInvoices:  Invoice[];
  recentInvoices:   Invoice[];
  chartData:        MonthPoint[];
}

export function useDashboard(): DashboardData | undefined {
  return useLiveQuery(async (): Promise<DashboardData> => {
    const now        = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd   = endOfMonth(now);

    const [invoices, payments, expenses] = await Promise.all([
      db.invoices.toArray(),
      db.payments.toArray(),
      db.expenses.toArray(),
    ]);

    // ── This month stats ──────────────────────────────────────────────────────
    const monthInvoices = invoices.filter(inv =>
      isWithinInterval(new Date(inv.date), { start: monthStart, end: monthEnd })
    );
    const monthPayments = payments.filter(p =>
      isWithinInterval(new Date(p.date), { start: monthStart, end: monthEnd })
    );
    const monthExpenses = expenses.filter(e =>
      isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
    );

    const monthlyBilled    = monthInvoices.reduce((s, inv) => s + inv.total,  0);
    const monthlyCollected = monthPayments.reduce((s, p)   => s + p.amount,   0);
    const monthlyExpenses  = monthExpenses.reduce((s, e)   => s + e.amount,   0);

    // ── Outstanding (all time) ────────────────────────────────────────────────
    const totalOutstanding = invoices
      .filter(inv => inv.status === 'unpaid' || inv.status === 'partial')
      .reduce((s, inv) => s + Math.max(0, inv.total - inv.paidAmount), 0);

    // ── Overdue invoices (oldest first, max 5) ────────────────────────────────
    const overdueInvoices = invoices
      .filter(inv =>
        (inv.status === 'unpaid' || inv.status === 'partial') &&
        new Date() > new Date(inv.dueDate)
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    // ── Recent invoices (newest first, max 5) ─────────────────────────────────
    const recentInvoices = [...invoices]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(inv => inv.status !== 'draft')
      .slice(0, 5);

    // ── 6-month chart data ────────────────────────────────────────────────────
    const chartData: MonthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d     = subMonths(now, i);
      const start = startOfMonth(d);
      const end   = endOfMonth(d);

      const mBilled    = invoices
        .filter(inv => isWithinInterval(new Date(inv.date), { start, end }))
        .reduce((s, inv) => s + inv.total, 0);
      const mCollected = payments
        .filter(p => isWithinInterval(new Date(p.date), { start, end }))
        .reduce((s, p) => s + p.amount, 0);
      const mExpenses  = expenses
        .filter(e => isWithinInterval(new Date(e.date), { start, end }))
        .reduce((s, e) => s + e.amount, 0);

      chartData.push({
        month:     format(d, 'MMM'),
        billed:    mBilled,
        collected: mCollected,
        expenses:  mExpenses,
      });
    }

    return {
      monthlyBilled,
      monthlyCollected,
      totalOutstanding,
      monthlyExpenses,
      overdueInvoices,
      recentInvoices,
      chartData,
    };
  }, []);
}
