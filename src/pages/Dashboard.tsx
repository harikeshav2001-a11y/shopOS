import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import { useSettingsValue } from '../hooks/useSettings';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/currency';
import { formatDate, getDaysOverdue, isOverdue } from '../utils/dates';
import { cn } from '../utils/cn';

// ── Stat card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label:     string;
  value:     string;
  sub?:      string;
  color?:    'default' | 'primary' | 'success' | 'warning' | 'danger';
  icon?:     React.ReactNode;
}

function StatCard({ label, value, sub, color = 'default', icon }: StatCardProps) {
  const valueColor = {
    default: 'text-[var(--text-primary)]',
    primary: 'text-[var(--primary)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    danger:  'text-[var(--danger)]',
  }[color];

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
            {icon}
          </div>
        )}
      </div>
      <p className={cn('text-2xl font-bold tabular-nums leading-none', valueColor)}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Custom tooltip for Recharts ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-[var(--text-primary)] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[var(--text-secondary)] capitalize">{entry.name}:</span>
          <span className="font-medium text-[var(--text-primary)] tabular-nums">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate();
  const data      = useDashboard();
  const settings  = useSettingsValue();

  if (!data) return <PageSpinner />;

  const {
    monthlyBilled,
    monthlyCollected,
    totalOutstanding,
    monthlyExpenses,
    overdueInvoices,
    recentInvoices,
    chartData,
  } = data;

  const hasAnyData = recentInvoices.length > 0 || monthlyExpenses > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {settings?.shopName ? `Welcome back` : 'Dashboard'}
          </h1>
          {settings?.shopName && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{settings.shopName}</p>
          )}
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/invoices/new')}
        >
          New Invoice
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Billed This Month"
          value={formatCurrency(monthlyBilled)}
          sub="Total invoiced"
          color="primary"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Collected This Month"
          value={formatCurrency(monthlyCollected)}
          sub="Payments received"
          color={monthlyCollected >= monthlyBilled && monthlyBilled > 0 ? 'success' : 'default'}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          sub={totalOutstanding > 0 ? 'Across all invoices' : 'All clear!'}
          color={totalOutstanding > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Expenses This Month"
          value={formatCurrency(monthlyExpenses)}
          sub="Business spending"
          color={monthlyExpenses > monthlyBilled && monthlyBilled > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* ── Overdue alert ── */}
      {overdueInvoices.length > 0 && (
        <div className="bg-[var(--danger-subtle,#fef2f2)] border border-[var(--danger)] border-opacity-30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
            <p className="text-sm font-semibold text-[var(--danger)]">
              {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-2">
            {overdueInvoices.map(inv => {
              const days = getDaysOverdue(inv.dueDate);
              const balance = inv.total - inv.paidAmount;
              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{inv.invoiceNumber}</span>
                    <span className="text-xs text-[var(--text-muted)]">{inv.customerSnapshot.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--danger)]">{days}d overdue</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      {hasAnyData && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Revenue Overview</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 6 months</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F97316" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L`
                  : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K`
                  : `₹${v}`
                }
                width={56}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
              />
              <Area
                type="monotone"
                dataKey="billed"
                name="Billed"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gradBilled)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#gradCollected)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#gradExpenses)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Bottom section: recent invoices ── */}
      {recentInvoices.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm dark:shadow-none overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Invoices</h2>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-[var(--primary)] font-medium hover:underline"
            >
              View all →
            </button>
          </div>

          {recentInvoices.map((inv, i) => {
            const overdue = isOverdue(inv.dueDate, inv.status);
            const status  = overdue ? 'overdue' : inv.status;

            return (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className={cn(
                  'flex items-center justify-between px-5 py-3.5 cursor-pointer',
                  'hover:bg-[var(--bg-elevated)] transition-colors',
                  i < recentInvoices.length - 1 && 'border-b border-[var(--border)]'
                )}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{inv.invoiceNumber}</p>
                    <p className="text-xs text-[var(--text-muted)]">{inv.customerSnapshot.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                    {formatDate(inv.date)}
                  </span>
                  <Badge status={status} />
                  <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] min-w-[80px] text-right">
                    {formatCurrency(inv.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state — brand new install ── */}
      {!hasAnyData && overdueInvoices.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] bg-opacity-10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Ready to go</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5 max-w-sm mx-auto">
            Create your first invoice and your dashboard will start filling up with data.
          </p>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/invoices/new')}>
            Create First Invoice
          </Button>
        </div>
      )}
    </div>
  );
}
