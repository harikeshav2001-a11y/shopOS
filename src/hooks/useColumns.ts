import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { ColumnTemplate } from '../db/types';

export function useColumns() {
  const columns = useLiveQuery(
    () => db.columnTemplates.where('isActive').equals(1).sortBy('sortOrder'),
    []
  ) ?? [];
  return columns;
}

export async function addColumn(col: Omit<ColumnTemplate, 'id' | 'createdAt'>): Promise<void> {
  await db.columnTemplates.add({ ...col, createdAt: new Date() });
}

export async function updateColumn(id: number, changes: Partial<ColumnTemplate>): Promise<void> {
  await db.columnTemplates.update(id, changes);
}

export async function deleteColumn(id: number): Promise<void> {
  // Soft delete — never hard delete (would break old invoice display)
  await db.columnTemplates.update(id, { isActive: false });
}

export async function reorderColumns(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.columnTemplates, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.columnTemplates.update(orderedIds[i], { sortOrder: i });
    }
  });
}
