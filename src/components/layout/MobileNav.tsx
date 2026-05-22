import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, FileText, CreditCard, Receipt, Bell } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationsPanel } from '../notifications/NotificationsPanel';

const navItems = [
  { to: '/',          icon: LayoutGrid, label: 'Home'     },
  { to: '/invoices',  icon: FileText,   label: 'Invoices' },
  { to: '/bills',     icon: CreditCard, label: 'Bills'    },
  { to: '/expenses',  icon: Receipt,    label: 'Expenses' },
];

export function MobileNav() {
  const { total } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--sidebar-bg)] border-t border-white/10 px-2 pb-safe">
        <div className="flex justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-w-0',
                isActive ? 'text-[var(--sidebar-active)]' : 'text-slate-500'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}

          {/* Bell */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors relative',
              panelOpen ? 'text-[var(--sidebar-active)]' : 'text-slate-500'
            )}
          >
            <span className="relative">
              <Bell className="w-5 h-5" />
              {total > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-[var(--danger)] rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  {total > 9 ? '9+' : total}
                </span>
              )}
            </span>
            Alerts
          </button>
        </div>
      </nav>

      <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
