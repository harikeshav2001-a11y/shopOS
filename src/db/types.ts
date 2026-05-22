// ── All TypeScript interfaces for ShopOS database entities ──

export type Theme = 'light' | 'dark' | 'system';
export type GstType = 'CGST_SGST' | 'IGST' | 'none';
export type InvoiceStatus = 'draft' | 'unpaid' | 'partial' | 'paid';
export type ColumnType = 'text' | 'number' | 'dropdown';
export type CalcRole = 'multiplier' | 'rate' | 'none';

export interface Settings {
  id?: number;
  // Shop profile
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  logoBase64: string;
  // Invoice
  invoicePrefix: string;
  invoiceCounter: number;
  paymentTermsDays: number;
  // GST
  gstEnabled: boolean;
  gstNumber: string;
  defaultGstRate: number;
  defaultGstType: GstType;
  // Expense categories
  expenseCategories: string[];
  // App
  theme: Theme;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gstNumber: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSnapshot {
  name: string;
  phone: string;
  address: string;
  gstNumber: string;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  customerId: number;
  customerSnapshot: CustomerSnapshot;
  date: Date;
  dueDate: Date;
  status: InvoiceStatus;
  gstEnabled: boolean;
  gstType: GstType;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  paidAmount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id?: number;
  invoiceId: number;
  description: string;
  customFields: Record<string, string | number>;
  amount: number;
  sortOrder: number;
}

export interface ColumnTemplate {
  id?: number;
  name: string;
  key: string;
  type: ColumnType;
  options: string[];
  calcRole: CalcRole;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Expense {
  id?: number;
  date: Date;
  category: string;
  description: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id?: number;
  invoiceId: number;
  date: Date;
  amount: number;
  note: string;
  createdAt: Date;
}

// ── Computed / derived types ──

export interface CustomerWithStats extends Customer {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  lastInvoiceDate: Date | null;
}

export interface InvoiceWithStatus extends Invoice {
  isOverdue: boolean;
  daysOverdue: number;
}

export interface DashboardStats {
  monthlyBilled: number;
  monthlyCollected: number;
  totalOutstanding: number;
  monthlyExpenses: number;
  netPosition: number;
  overdueInvoices: InvoiceWithStatus[];
  recentInvoices: Invoice[];
}
