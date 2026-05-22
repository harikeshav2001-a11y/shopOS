import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Expense } from '../db/types';

// ── Queries ────────────────────────────────────────────────────────────────────
export function useExpenses() {
  return useLiveQuery(
    () => db.expenses.orderBy('date').reverse().toArray(),
    []
  ) ?? [];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  return db.expenses.add({ ...data, createdAt: new Date(), updatedAt: new Date() });
}

export async function updateExpense(id: number, data: Partial<Expense>): Promise<void> {
  await db.expenses.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id);
}
