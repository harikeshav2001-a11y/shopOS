import { useRef, useState } from 'react';
import { Download, Upload, Trash2, ExternalLink, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import emailjs from '@emailjs/browser';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../hooks/useSettings';
import { exportBackup, importBackup, getBackupData } from '../../utils/backup';
import { db } from '../../db/db';
import { updateSettings } from '../../db/db';

export default function Data() {
  const { toast }   = useToast();
  const { settings } = useSettings();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [importing,  setImporting]  = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [sending,    setSending]    = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [showReset,  setShowReset]  = useState(false);

  // EmailJS config local state (saved to settings on blur/change)
  const [serviceId,   setServiceId]   = useState(settings?.emailjsServiceId  ?? '');
  const [templateId,  setTemplateId]  = useState(settings?.emailjsTemplateId ?? '');
  const [publicKey,   setPublicKey]   = useState(settings?.emailjsPublicKey  ?? '');
  const [backupEmail, setBackupEmail] = useState(settings?.backupEmail       ?? '');

  // Sync from settings once loaded
  const [synced, setSynced] = useState(false);
  if (settings && !synced) {
    setServiceId(settings.emailjsServiceId ?? '');
    setTemplateId(settings.emailjsTemplateId ?? '');
    setPublicKey(settings.emailjsPublicKey ?? '');
    setBackupEmail(settings.backupEmail ?? '');
    setSynced(true);
  }

  function saveEmailConfig() {
    updateSettings({
      emailjsServiceId:  serviceId.trim(),
      emailjsTemplateId: templateId.trim(),
      emailjsPublicKey:  publicKey.trim(),
      backupEmail:       backupEmail.trim(),
    });
  }

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

  const handleSendBackup = async () => {
    if (!serviceId || !templateId || !publicKey) {
      toast('error', 'Complete the EmailJS setup first');
      return;
    }
    if (!backupEmail) {
      toast('error', 'Enter a recipient email address');
      return;
    }

    setSending(true);
    try {
      const data   = await getBackupData();
      const json   = JSON.stringify(data, null, 2);
      const sizeKB = Math.round(json.length / 1024);

      const statsText = [
        `Invoices: ${data.invoices.length}`,
        `Customers: ${data.customers.length}`,
        `Expenses: ${data.expenses.length}`,
        `Bills: ${(data as any).bills?.length ?? 0}`,
        `Payments: ${data.payments.length}`,
      ].join(' | ');

      await emailjs.send(
        serviceId.trim(),
        templateId.trim(),
        {
          to_email:    backupEmail.trim(),
          shop_name:   settings?.shopName || 'Your Shop',
          backup_date: format(new Date(), 'dd MMM yyyy'),
          stats:       statsText,
          backup_data: sizeKB <= 40 ? json : `[Data too large to email (${sizeKB}KB). Please use "Download Backup" instead.]`,
          size_note:   sizeKB > 40 ? `Note: Your data (${sizeKB}KB) exceeded email limits. Please download the backup file manually.` : '',
        },
        publicKey.trim()
      );

      await updateSettings({ lastBackupDate: new Date() });
      toast('success', `Backup sent to ${backupEmail}`);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Failed to send email. Check your EmailJS credentials.');
    } finally {
      setSending(false);
    }
  };

  const emailConfigured = serviceId && templateId && publicKey && backupEmail;
  const lastBackup = settings?.lastBackupDate;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Data & Backup</h2>
        <p className="text-sm text-[var(--text-secondary)]">All your data is stored on this device. Back it up regularly.</p>
      </div>

      {/* ── Email Backup ── */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Email Backup</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Sends your full data as a JSON file to your email. Uses EmailJS (free).
              {lastBackup && (
                <span className="ml-1 text-[var(--success)]">
                  · Last sent {format(new Date(lastBackup), 'dd MMM yyyy')}
                </span>
              )}
            </p>
          </div>
          {emailConfigured && (
            <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
          )}
        </div>

        {/* Setup instructions */}
        <div className="bg-[var(--bg-elevated)] rounded-lg p-3.5 space-y-1.5">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">One-time setup (5 min):</p>
          <ol className="text-xs text-[var(--text-muted)] space-y-1 list-decimal list-inside">
            <li>Create a free account at <a href="https://emailjs.com" target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-0.5">emailjs.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
            <li>Add an Email Service (Gmail works) → copy the <strong>Service ID</strong></li>
            <li>Create an Email Template with variables: <code className="bg-[var(--border)] px-1 rounded">{'{{to_email}}'}</code> <code className="bg-[var(--border)] px-1 rounded">{'{{shop_name}}'}</code> <code className="bg-[var(--border)] px-1 rounded">{'{{backup_date}}'}</code> <code className="bg-[var(--border)] px-1 rounded">{'{{stats}}'}</code> <code className="bg-[var(--border)] px-1 rounded">{'{{backup_data}}'}</code> → copy the <strong>Template ID</strong></li>
            <li>Go to Account → API Keys → copy your <strong>Public Key</strong></li>
          </ol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Service ID"
            placeholder="service_xxxxxxx"
            value={serviceId}
            onChange={e => setServiceId(e.target.value)}
            onBlur={saveEmailConfig}
          />
          <Input
            label="Template ID"
            placeholder="template_xxxxxxx"
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            onBlur={saveEmailConfig}
          />
          <Input
            label="Public Key"
            placeholder="xxxxxxxxxxxxxxxxxxxx"
            value={publicKey}
            onChange={e => setPublicKey(e.target.value)}
            onBlur={saveEmailConfig}
          />
          <Input
            label="Send Backup To"
            type="email"
            placeholder="your@email.com"
            value={backupEmail}
            onChange={e => setBackupEmail(e.target.value)}
            onBlur={saveEmailConfig}
          />
        </div>

        <Button
          icon={<Send className="w-4 h-4" />}
          loading={sending}
          disabled={!emailConfigured}
          onClick={handleSendBackup}
        >
          Send Backup Email
        </Button>
      </div>

      {/* ── Export ── */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Download Backup</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Downloads a JSON file with all your data. Good for large datasets or when email backup is not set up.</p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} loading={exporting} onClick={handleExport}>
          Download Backup
        </Button>
      </div>

      {/* ── Import ── */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Restore from Backup</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">This will <span className="text-[var(--warning)] font-medium">replace all current data</span> with the backup file.</p>
        </div>
        <Button variant="secondary" icon={<Upload className="w-4 h-4" />} loading={importing} onClick={() => fileRef.current?.click()}>
          Choose Backup File
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* ── Reset ── */}
      <div className="p-5 rounded-xl border border-[var(--danger-subtle)] bg-[var(--danger-subtle)] space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--danger)]">Reset Everything</p>
          <p className="text-xs text-[var(--danger)] opacity-80 mt-0.5">Permanently deletes all data from this device. Cannot be undone.</p>
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
