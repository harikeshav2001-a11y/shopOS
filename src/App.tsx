import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ThemeProvider } from './store/theme';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './components/layout/AppShell';
import { getOrCreateSettings } from './db/db';

// Pages
import Onboarding       from './pages/Onboarding/Onboarding';
import Dashboard        from './pages/Dashboard';
import InvoiceList      from './pages/Invoices/InvoiceList';
import InvoiceNew       from './pages/Invoices/InvoiceNew';
import InvoiceDetail    from './pages/Invoices/InvoiceDetail';
import InvoiceEdit      from './pages/Invoices/InvoiceEdit';
import BillsTracker     from './pages/BillsTracker';
import Expenses         from './pages/Expenses';
import CustomerList     from './pages/Customers/CustomerList';
import CustomerDetail  from './pages/Customers/CustomerDetail';
import SettingsLayout   from './pages/Settings/SettingsLayout';
import Profile          from './pages/Settings/Profile';
import Columns          from './pages/Settings/Columns';
import GST              from './pages/Settings/GST';
import Categories       from './pages/Settings/Categories';
import Appearance       from './pages/Settings/Appearance';
import Data             from './pages/Settings/Data';

// ── Guard: redirect to onboarding if setup not complete ──
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const settings = useLiveQuery(() => getOrCreateSettings(), []);

  // Still loading
  if (settings === undefined) return null;

  if (!settings.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Onboarding — outside main shell */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Main app */}
            <Route element={
              <OnboardingGuard>
                <AppShell />
              </OnboardingGuard>
            }>
              <Route index element={<Dashboard />} />
              <Route path="invoices"          element={<InvoiceList />} />
              <Route path="invoices/new"      element={<InvoiceNew />} />
              <Route path="invoices/:id"      element={<InvoiceDetail />} />
              <Route path="invoices/:id/edit" element={<InvoiceEdit />} />
              <Route path="bills"     element={<BillsTracker />} />
              <Route path="expenses"  element={<Expenses />} />
              <Route path="customers"    element={<CustomerList />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="settings"  element={<SettingsLayout />}>
                <Route index           element={<Profile />} />
                <Route path="columns"    element={<Columns />} />
                <Route path="gst"        element={<GST />} />
                <Route path="categories" element={<Categories />} />
                <Route path="appearance" element={<Appearance />} />
                <Route path="data"       element={<Data />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
