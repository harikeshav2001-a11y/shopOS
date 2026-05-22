import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, FileText, CreditCard, Receipt, Users, Settings, Sun, Moon, Bell,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../store/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationsPanel } from '../notifications/NotificationsPanel';

const navItems = [
  { to: '/',          icon: LayoutGrid,  label: 'Dashboard'  },
  { to: '/invoices',  icon: FileText,    label: 'Invoices'   },
  { to: '/bills',     icon: CreditCard,  label: 'Bills'      },
  { to: '/expenses',  icon: Receipt,     label: 'Expenses'   },
  { to: '/customers', icon: Users,       label: 'Customers'  },
];

function ShopOSLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="32" height="32" rx="9" fill="#2D7255" />
      {/* Awning / sign bar */}
      <rect x="5" y="9" width="22" height="5" rx="2" fill="white" />
      {/* Building body */}
      <rect x="6" y="14" width="20" height="12" rx="1.5" fill="none" stroke="white" strokeWidth="2" />
      {/* Door */}
      <rect x="13" y="19" width="6" height="7" rx="1" fill="white" />
      {/* Left window */}
      <rect x="8" y="16.5" width="4" height="3.5" rx="0.75" fill="white" opacity="0.55" />
      {/* Right window */}
      <rect x="20" y="16.5" width="4" height="3.5" rx="0.75" fill="white" opacity="0.55" />
    </svg>
  );
}

export function Sidebar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { total } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  const cycleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[var(--sidebar-bg)] h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <ShopOSLogo />
          <span className="text-xl font-bold text-white tracking-tight">ShopOS</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--sidebar-active)] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          {/* Notifications bell */}
          <button
            onClick={() => setPanelOpen(v => !v)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full relative',
              panelOpen
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <span className="relative">
              <Bell className="w-5 h-5 shrink-0" />
              {total > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--danger)] rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                  {total > 9 ? '9+' : total}
                </span>
              )}
            </span>
            Notifications
          </button>

          <button
            onClick={cycleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            {resolvedTheme === 'dark'
              ? <><Sun className="w-5 h-5" /> Light mode</>
              : <><Moon className="w-5 h-5" /> Dark mode</>
            }
          </button>

          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-[var(--sidebar-active)] text-white font-semibold'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Notifications panel */}
      <NotificationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
