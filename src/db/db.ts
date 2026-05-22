import Dexie, { type Table } from 'dexie';
import type {
  Settings, Customer, Invoice, InvoiceItem,
  ColumnTemplate, Expense, Payment, Bill,
} from './types';

export class ShopOSDatabase extends Dexie {
  settings!: Table<Settings>;
  customers!: Table<Customer>;
  invoices!: Table<Invoice>;
  invoiceItems!: Table<InvoiceItem>;
  columnTemplates!: Table<ColumnTemplate>;
  expenses!: Table<Expense>;
  payments!: Table<Payment>;
  bills!: Table<Bill>;

  constructor() {
    super('shopOS_db');
    this.version(1).stores({
      settings:        '++id',
      customers:       '++id, name, createdAt',
      invoices:        '++id, customerId, date, dueDate, status, invoiceNumber',
      invoiceItems:    '++id, invoiceId, sortOrder',
      columnTemplates: '++id, sortOrder, isActive',
      expenses:        '++id, date, category',
      payments:        '++id, invoiceId, date',
    });
    // v2 — adds bills table
    this.version(2).stores({
      bills: '++id, dueDate, status, vendorName',
    });
    // v3 — adds email backup fields to settings (no schema change, just defaults)
    this.version(3).stores({});
  }
}

export const db = new ShopOSDatabase();

// ── Default settings factory ──
export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  shopName: '',
  shopAddress: '',
  shopPhone: '',
  shopEmail: '',
  logoBase64: '',
  invoicePrefix: 'INV',
  invoiceCounter: 0,
  paymentTermsDays: 45,
  gstEnabled: false,
  gstNumber: '',
  defaultGstRate: 18,
  defaultGstType: 'CGST_SGST',
  expenseCategories: ['Materials', 'Rent', 'Utilities', 'Tools', 'Other'],
  theme: 'system',
  onboardingComplete: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  backupEmail:       '',
  emailjsServiceId:  '',
  emailjsTemplateId: '',
  emailjsPublicKey:  '',
};

export async function getOrCreateSettings(): Promise<Settings> {
  let settings = await db.settings.get(1);
  if (!settings) {
    await db.settings.add({ ...DEFAULT_SETTINGS, id: 1 });
    settings = await db.settings.get(1);
  }
  return settings!;
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  await db.settings.update(1, { ...partial, updatedAt: new Date() });
}

// ── Industry column templates ──
export const INDUSTRY_TEMPLATES: Record<string, Omit<ColumnTemplate, 'id' | 'createdAt'>[]> = {
  machine_shop: [
    { name: 'Grinding Type', key: 'grindingType', type: 'dropdown', options: ['Inner Bore', 'Outer (Butter)'], calcRole: 'none', sortOrder: 0, isActive: true },
    { name: 'Diameter (mm)', key: 'diameter', type: 'number', options: [], calcRole: 'none', sortOrder: 1, isActive: true },
    { name: 'Length (mm)', key: 'length', type: 'number', options: [], calcRole: 'none', sortOrder: 2, isActive: true },
    { name: 'Hours', key: 'hours', type: 'number', options: [], calcRole: 'multiplier', sortOrder: 3, isActive: true },
    { name: 'Rate / hr', key: 'rate', type: 'number', options: [], calcRole: 'rate', sortOrder: 4, isActive: true },
  ],
  printing_press: [
    { name: 'Paper Size', key: 'paperSize', type: 'dropdown', options: ['A4', 'A3', 'Letter', 'Custom'], calcRole: 'none', sortOrder: 0, isActive: true },
    { name: 'Print Type', key: 'printType', type: 'dropdown', options: ['Colour', 'Black & White'], calcRole: 'none', sortOrder: 1, isActive: true },
    { name: 'Qty', key: 'qty', type: 'number', options: [], calcRole: 'multiplier', sortOrder: 2, isActive: true },
    { name: 'Rate / unit', key: 'rate', type: 'number', options: [], calcRole: 'rate', sortOrder: 3, isActive: true },
  ],
  tailoring: [
    { name: 'Garment', key: 'garment', type: 'text', options: [], calcRole: 'none', sortOrder: 0, isActive: true },
    { name: 'Fabric', key: 'fabric', type: 'text', options: [], calcRole: 'none', sortOrder: 1, isActive: true },
    { name: 'Qty', key: 'qty', type: 'number', options: [], calcRole: 'multiplier', sortOrder: 2, isActive: true },
    { name: 'Rate / piece', key: 'rate', type: 'number', options: [], calcRole: 'rate', sortOrder: 3, isActive: true },
  ],
  general_service: [
    { name: 'Hours', key: 'hours', type: 'number', options: [], calcRole: 'multiplier', sortOrder: 0, isActive: true },
    { name: 'Rate / hr', key: 'rate', type: 'number', options: [], calcRole: 'rate', sortOrder: 1, isActive: true },
  ],
};
