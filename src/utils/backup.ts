import { db } from '../db/db';
import { format } from 'date-fns';

export async function exportBackup(): Promise<void> {
  const [settings, customers, invoices, invoiceItems, columnTemplates, expenses, payments] =
    await Promise.all([
      db.settings.toArray(),
      db.customers.toArray(),
      db.invoices.toArray(),
      db.invoiceItems.toArray(),
      db.columnTemplates.toArray(),
      db.expenses.toArray(),
      db.payments.toArray(),
    ]);

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings, customers, invoices, invoiceItems, columnTemplates, expenses, payments,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shopOS-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.version || !data.settings) throw new Error('Invalid backup file');

  await db.transaction('rw',
    [db.settings, db.customers, db.invoices, db.invoiceItems,
     db.columnTemplates, db.expenses, db.payments],
    async () => {
      await db.settings.clear();
      await db.customers.clear();
      await db.invoices.clear();
      await db.invoiceItems.clear();
      await db.columnTemplates.clear();
      await db.expenses.clear();
      await db.payments.clear();

      if (data.settings?.length)       await db.settings.bulkAdd(data.settings);
      if (data.customers?.length)      await db.customers.bulkAdd(data.customers);
      if (data.invoices?.length)       await db.invoices.bulkAdd(data.invoices);
      if (data.invoiceItems?.length)   await db.invoiceItems.bulkAdd(data.invoiceItems);
      if (data.columnTemplates?.length) await db.columnTemplates.bulkAdd(data.columnTemplates);
      if (data.expenses?.length)       await db.expenses.bulkAdd(data.expenses);
      if (data.payments?.length)       await db.payments.bulkAdd(data.payments);
    }
  );
}
