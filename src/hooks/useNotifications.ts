import { useLiveQuery } from 'dexie-react-hooks';
import { differenceInDays } from 'date-fns';
import { db } from '../db/db';
import { isOverdue } from '../utils/dates';
import { useSettingsValue } from './useSettings';
import type { Invoice, Bill } from '../db/types';

export interface NotificationData {
  overdueInvoices: Invoice[];
  upcomingBills:   Bill[];    // due within 7 days
  backupOverdue:   boolean;
  daysSinceBackup: number | null;
  total:           number;
}

export function useNotifications(): NotificationData {
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const bills    = useLiveQuery(() => db.bills.toArray(),    []);
  const settings = useSettingsValue();

  const overdueInvoices = (invoices ?? []).filter(inv =>
    isOverdue(inv.dueDate, inv.status)
  );

  const upcomingBills = (bills ?? []).filter(b => {
    if (b.status === 'paid') return false;
    const days = differenceInDays(new Date(b.dueDate), new Date());
    return days >= 0 && days <= 7;
  });

  const daysSinceBackup = settings?.lastBackupDate
    ? differenceInDays(new Date(), new Date(settings.lastBackupDate))
    : null;

  const backupOverdue = daysSinceBackup === null || daysSinceBackup >= 30;

  const total =
    overdueInvoices.length +
    upcomingBills.length +
    (backupOverdue ? 1 : 0);

  return { overdueInvoices, upcomingBills, backupOverdue, daysSinceBackup, total };
}
