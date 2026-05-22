import { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { InvoicePrintView } from './InvoicePrintView';
import { Button } from '../ui/Button';
import type { Invoice, InvoiceItem, Payment, ColumnTemplate, Settings } from '../../db/types';

interface Props {
  open:       boolean;
  onClose:    () => void;
  onDownload: () => void;
  generating: boolean;
  invoice:    Invoice;
  items:      InvoiceItem[];
  payments:   Payment[];
  columns:    ColumnTemplate[];
  settings:   Settings;
}

export function InvoicePreviewModal({
  open, onClose, onDownload, generating,
  invoice, items, payments, columns, settings,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const printId = `invoice-print-${invoice.id}`;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />

      {/* Scrollable container */}
      <div style={{ position: 'relative', height: '100%', overflowY: 'auto', padding: '0 16px 40px' }}>

        {/* Sticky toolbar */}
        <div style={{
          position:       'sticky',
          top:            0,
          zIndex:         10,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '12px 16px',
          background:     'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(8px)',
          marginBottom:   '20px',
          borderBottom:   '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px', margin: 0 }}>
            Invoice Preview — {invoice.invoiceNumber}
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              icon={<Download className="w-4 h-4" />}
              loading={generating}
              onClick={onDownload}
            >
              Download PDF
            </Button>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94A3B8',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* Invoice print view — rendered visibly, centred on a page-like background */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)', borderRadius: '4px', overflow: 'hidden' }}>
            <InvoicePrintView
              id={printId}
              invoice={invoice}
              items={items}
              payments={payments}
              columns={columns}
              settings={settings}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
