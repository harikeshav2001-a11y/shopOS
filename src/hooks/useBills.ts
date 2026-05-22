import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Bill } from '../db/types';

// ── Queries ────────────────────────────────────────────────────────────────────
export function useBills() {
  return useLiveQuery(
    () => db.bills.orderBy('dueDate').toArray(),
    []
  ) ?? [];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function addBill(data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  return db.bills.add({ ...data, createdAt: new Date(), updatedAt: new Date() });
}

export async function updateBill(id: number, data: Partial<Bill>): Promise<void> {
  await db.bills.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteBill(id: number): Promise<void> {
  await db.bills.delete(id);
}

export async function markBillPaid(id: number): Promise<void> {
  await db.bills.update(id, { status: 'paid', paidDate: new Date(), updatedAt: new Date() });
}

export async function markBillUnpaid(id: number): Promise<void> {
  await db.bills.update(id, { status: 'pending', paidDate: undefined, updatedAt: new Date() });
}
