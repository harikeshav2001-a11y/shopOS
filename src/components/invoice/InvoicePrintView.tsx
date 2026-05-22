// InvoicePrintView — plain block element rendered by InvoicePreviewModal.
// Uses explicit hex colours + inline styles so html2canvas always captures
// a clean white PDF regardless of the app's dark / light mode state.

import type { Invoice, InvoiceItem, Payment, ColumnTemplate, Settings } from '../../db/types';
import { formatDate } from '../../utils/dates';

const C = {
  headerBg:    '#1E293B',
  headerText:  '#F8FAFC',
  accent:      '#3B82F6',
  textPrimary: '#111827',
  textSecond:  '#374151',
  textMuted:   '#6B7280',
  border:      '#E5E7EB',
  rowAlt:      '#F9FAFB',
  success:     '#16A34A',
  warning:     '#D97706',
  danger:      '#DC2626',
  white:       '#FFFFFF',
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);
}

interface Props {
  id:       string;
  invoice:  Invoice;
  items:    InvoiceItem[];
  payments: Payment[];
  columns:  ColumnTemplate[];
  settings: Settings;
}

export function InvoicePrintView({ id, invoice, items, payments, columns, settings }: Props) {
  const balance = invoice.total - invoice.paidAmount;
  const cgst    = invoice.gstType === 'CGST_SGST' ? invoice.gstAmount / 2 : 0;
  const sgst    = invoice.gstType === 'CGST_SGST' ? invoice.gstAmount / 2 : 0;
  const igst    = invoice.gstType === 'IGST'      ? invoice.gstAmount     : 0;

  const statusLabel: Record<string, string> = { paid: 'PAID', unpaid: 'UNPAID', partial: 'PARTIAL', draft: 'DRAFT' };
  const statusColor: Record<string, string> = { paid: C.success, unpaid: C.warning, partial: C.warning, draft: C.textMuted };
  const displayStatus = statusLabel[invoice.status] ?? invoice.status.toUpperCase();
  const displayColor  = statusColor[invoice.status]  ?? C.textMuted;

  return (
    <div
      id={id}
      style={{
        width:      '794px',
        background: C.white,
        fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
        fontSize:   '13px',
        color:      C.textPrimary,
        lineHeight: '1.5',
      }}
    >
      {/* ── Header band ── */}
      <div style={{ background: C.headerBg, padding: '28px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {settings.logoBase64 && (
              <img src={settings.logoBase64} alt="logo" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'contain', background: C.white }} />
            )}
            <div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: C.headerText, margin: 0 }}>{settings.shopName || 'Your Shop'}</p>
              {settings.shopAddress && <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>{settings.shopAddress}</p>}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {settings.shopPhone && <span>Ph: {settings.shopPhone}</span>}
            {settings.shopEmail && <span>Email: {settings.shopEmail}</span>}
            {settings.gstNumber && <span>GST: {settings.gstNumber}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: C.headerText, margin: '0 0 4px', letterSpacing: '-0.5px' }}>INVOICE</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: C.accent, margin: '0 0 8px' }}>#{invoice.invoiceNumber}</p>
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', background: `${displayColor}22`, color: displayColor, border: `1px solid ${displayColor}44` }}>
            {displayStatus}
          </span>
        </div>
      </div>

      {/* ── Date + Bill-to row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '24px 32px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Invoice Details</p>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ color: C.textMuted, paddingRight: '16px', paddingBottom: '4px' }}>Invoice Date</td>
                <td style={{ fontWeight: 500, paddingBottom: '4px' }}>{formatDate(invoice.date)}</td>
              </tr>
              <tr>
                <td style={{ color: C.textMuted, paddingRight: '16px', paddingBottom: '4px' }}>Due Date</td>
                <td style={{ fontWeight: 500, paddingBottom: '4px' }}>{formatDate(invoice.dueDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Bill To</p>
          <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 3px' }}>{invoice.customerSnapshot.name}</p>
          {invoice.customerSnapshot.phone   && <p style={{ color: C.textSecond, margin: '0 0 2px' }}>{invoice.customerSnapshot.phone}</p>}
          {invoice.customerSnapshot.address && <p style={{ color: C.textSecond, margin: '0 0 2px' }}>{invoice.customerSnapshot.address}</p>}
          {invoice.customerSnapshot.gstNumber && <p style={{ color: C.textMuted, fontSize: '11px', fontFamily: 'monospace', margin: '4px 0 0' }}>GST: {invoice.customerSnapshot.gstNumber}</p>}
        </div>
      </div>

      {/* ── Line items ── */}
      <div style={{ padding: '24px 32px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: C.rowAlt }}>
              <th style={{ textAlign: 'left', padding: '10px 10px 10px 0', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', borderBottom: `2px solid ${C.border}` }}>Description</th>
              {columns.map(col => (
                <th key={col.key} style={{ textAlign: 'right', padding: '10px 0 10px 12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', borderBottom: `2px solid ${C.border}` }}>{col.name}</th>
              ))}
              <th style={{ textAlign: 'right', padding: '10px 0 10px 12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', borderBottom: `2px solid ${C.border}` }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? C.rowAlt : C.white }}>
                <td style={{ padding: '9px 10px 9px 0', borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' }}>{item.description || '—'}</td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '9px 0 9px 12px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, verticalAlign: 'top', color: C.textSecond }}>
                    {item.customFields[col.key] !== undefined ? String(item.customFields[col.key]) : '—'}
                  </td>
                ))}
                <td style={{ padding: '9px 0 9px 12px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontWeight: 500, fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div style={{ padding: '16px 32px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', minWidth: '240px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 24px 4px 0', color: C.textMuted }}>Subtotal</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(invoice.subtotal)}</td>
            </tr>
            {invoice.gstEnabled && invoice.gstAmount > 0 && invoice.gstType === 'CGST_SGST' && <>
              <tr>
                <td style={{ padding: '4px 24px 4px 0', color: C.textMuted }}>CGST ({invoice.gstRate / 2}%)</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.textSecond }}>{fmt(cgst)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 24px 4px 0', color: C.textMuted }}>SGST ({invoice.gstRate / 2}%)</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.textSecond }}>{fmt(sgst)}</td>
              </tr>
            </>}
            {invoice.gstEnabled && invoice.gstAmount > 0 && invoice.gstType === 'IGST' &&
              <tr>
                <td style={{ padding: '4px 24px 4px 0', color: C.textMuted }}>IGST ({invoice.gstRate}%)</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.textSecond }}>{fmt(igst)}</td>
              </tr>
            }
            <tr style={{ borderTop: `2px solid ${C.border}` }}>
              <td style={{ padding: '10px 24px 4px 0', fontWeight: 700, fontSize: '15px' }}>Total</td>
              <td style={{ padding: '10px 0 4px', textAlign: 'right', fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{fmt(invoice.total)}</td>
            </tr>
            {invoice.paidAmount > 0 && (
              <tr>
                <td style={{ padding: '4px 24px 4px 0', color: C.success }}>Paid</td>
                <td style={{ padding: '4px 0', textAlign: 'right', color: C.success, fontVariantNumeric: 'tabular-nums' }}>− {fmt(invoice.paidAmount)}</td>
              </tr>
            )}
            {balance > 0 && (
              <tr style={{ background: `${C.warning}11`, borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 24px 8px 8px', fontWeight: 700, color: C.warning }}>Balance Due</td>
                <td style={{ padding: '8px 8px 8px 0', textAlign: 'right', fontWeight: 700, color: C.warning, fontVariantNumeric: 'tabular-nums' }}>{fmt(balance)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ padding: '0 32px 20px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Notes</p>
          <p style={{ color: C.textSecond, whiteSpace: 'pre-wrap', margin: 0 }}>{invoice.notes}</p>
        </div>
      )}

      {/* ── Payment history ── */}
      {payments.length > 0 && (
        <div style={{ padding: '0 32px 24px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Payment History</p>
          {payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < payments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.textSecond }}>{formatDate(p.date)}{p.note ? ` — ${p.note}` : ''}</span>
              <span style={{ color: C.success, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>+ {fmt(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ margin: '8px 32px 32px', padding: '16px 20px', background: C.rowAlt, borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: C.textMuted }}>
        Thank you for your business!
        {settings.shopPhone && ` · ${settings.shopPhone}`}
        {settings.shopEmail && ` · ${settings.shopEmail}`}
      </div>
    </div>
  );
}
