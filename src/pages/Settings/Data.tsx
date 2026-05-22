import { useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { exportBackup, importBackup } from '../../utils/backup';
import { db } from '../../db/db';

export default function Data() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [showReset, setShowReset] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBackup();
      toast('success', 'Backup downloaded');
    } catch {
      toast('error', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importBackup(file);
      toast('success', 'Data restored from backup');
      window.location.reload();
    } catch {
      toast('error', 'Invalid backup file');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (resetInput !== 'RESET') return;
    await db.transaction('rw',
      [db.settings, db.customers, db.invoices, db.invoiceItems,
       db.columnTemplates, db.expenses, db.payments],
      async () => {
        await Promise.all([
          db.settings.clear(), db.customers.clear(), db.invoices.clear(),
          db.invoiceItems.clear(), db.columnTemplates.clear(),
          db.expenses.clear(), db.payments.clear(),
        ]);
      }
    );
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Data & Backup</h2>
        <p className="text-sm text-[var(--text-secondary)]">All your data is stored on this device. Export a backup regularly.</p>
      </div>

      {/* Export */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Export Backup</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Downloads a JSON file with all your invoices, customers, and expenses. Save it somewhere safe — USB drive or email it to yourself.</p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} loading={exporting} onClick={handleExport}>
          Download Backup
        </Button>
      </div>

      {/* Import */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Restore from Backup</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">This will <span className="text-[var(--warning)] font-medium">replace all current data</span> with the backup file. Make sure you have the right file before restoring.</p>
        </div>
        <Button variant="secondary" icon={<Upload className="w-4 h-4" />} loading={importing} onClick={() => fileRef.current?.click()}>
          Choose Backup File
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* Reset */}
      <div className="p-5 rounded-xl border border-[var(--danger-subtle)] bg-[var(--danger-subtle)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--danger)]">Reset Everything</p>
          <p className="text-xs text-[var(--danger)] opacity-80 mt-0.5">Permanently deletes all data from this device. This cannot be undone.</p>
        </div>
        {!showReset ? (
          <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setShowReset(true)}>
            Reset App
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[var(--danger)]">Type <strong>RESET</strong> to confirm:</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={resetInput}
                onChange={e => setResetInput(e.target.value.toUpperCase())}
                placeholder="Type RESET"
                className="flex-1 rounded-lg border border-[var(--danger)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--danger)]"
              />
              <Button variant="danger" onClick={handleReset} disabled={resetInput !== 'RESET'}>Confirm</Button>
              <Button variant="ghost" onClick={() => { setShowReset(false); setResetInput(''); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
