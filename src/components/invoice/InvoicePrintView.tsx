// InvoicePrintView — clean full-white design.
// All inline styles with hardcoded hex colours so the PDF is always clean
// regardless of the app's dark/light mode state.

import type { Invoice, InvoiceItem, Payment, ColumnTemplate, Settings } from '../../db/types';
import { formatDate } from '../../utils/dates';

const C = {
  white:       '#FFFFFF',
  bg:          '#FFFFFF',
  accent:      '#2D7255',   // medium green
  accentLight: '#D4EDDA',   // light green subtle
  brand:       '#1B3A2D',   // dark green — INVOICE heading
  textPrimary: '#111514',
  textSecond:  '#475250',
  textMuted:   '#8A9896',
  border:      '#E5E9E8',
  rowAlt:      '#F7F9F8',
  success:     '#16A34A',
  warning:     '#D97706',
  danger:      '#DC2626',
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
        background: C.bg,
        fontFamily: "'Google Sans Flex', 'Google Sans', -apple-system, 'Segoe UI', sans-serif",
        fontSize:   '13px',
        color:      C.textPrimary,
        lineHeight: '1.5',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '36px 40px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

        {/* Left — shop identity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            {settings.logoBase64 && (
              <img
                src={settings.logoBase64}
                alt="logo"
                style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'contain' }}
              />
            )}
            <p style={{ fontSize: '22px', fontWeight: 700, color: C.brand, margin: 0, letterSpacing: '-0.3px' }}>
              {settings.shopName || 'Your Shop'}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: C.textMuted, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {settings.shopAddress && (
              <span style={{ maxWidth: '240px', lineHeight: '1.45' }}>{settings.shopAddress}</span>
            )}
            {settings.shopPhone && <span>{settings.shopPhone}</span>}
            {settings.shopEmail && <span>{settings.shopEmail}</span>}
            {settings.gstNumber && (
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.textSecond, marginTop: '3px' }}>
                GSTIN: {settings.gstNumber}
              </span>
            )}
          </div>
        </div>

        {/* Right — invoice label */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '36px', fontWeight: 800, color: C.brand, margin: '0 0 4px', letterSpacing: '-1.5px' }}>
            INVOICE
          </p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: C.accent, margin: '0 0 10px', fontFamily: 'monospace' }}>
            #{invoice.invoiceNumber}
          </p>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
            background: `${displayColor}18`, color: displayColor,
            border: `1.5px solid ${displayColor}44`,
          }}>
            {displayStatus}
          </span>
        </div>
      </div>

      {/* ── Amber rule ── */}
      <div style={{ height: '3px', background: C.accent, margin: '0 40px' }} />

      {/* ── Invoice details + Bill to ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px',
        padding: '24px 40px', borderBottom: `1px solid ${C.border}`,
      }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
            Invoice Details
          </p>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ color: C.textMuted, paddingRight: '16px', paddingBottom: '5px' }}>Invoice Date</td>
                <td style={{ fontWeight: 600, paddingBottom: '5px' }}>{formatDate(invoice.date)}</td>
              </tr>
              <tr>
                <td style={{ color: C.textMuted, paddingRight: '16px' }}>Due Date</td>
                <td style={{ fontWeight: 600 }}>{formatDate(invoice.dueDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
            Bill To
          </p>
          <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>{invoice.customerSnapshot.name}</p>
          {invoice.customerSnapshot.phone   && <p style={{ color: C.textSecond, margin: '0 0 2px', fontSize: '12px' }}>{invoice.customerSnapshot.phone}</p>}
          {invoice.customerSnapshot.address && <p style={{ color: C.textSecond, margin: '0 0 2px', fontSize: '12px' }}>{invoice.customerSnapshot.address}</p>}
          {invoice.customerSnapshot.gstNumber && (
            <p style={{ color: C.textMuted, fontSize: '11px', fontFamily: 'monospace', margin: '5px 0 0', fontWeight: 600 }}>
              GSTIN: {invoice.customerSnapshot.gstNumber}
            </p>
          )}
        </div>
      </div>

      {/* ── Line items ── */}
      <div style={{ padding: '24px 40px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: C.rowAlt, borderBottom: `2px solid ${C.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 10px 10px 0', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.6px' }}>
                Description
              </th>
              {columns.map(col => (
                <th key={col.key} style={{ textAlign: 'right', padding: '10px 0 10px 12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.6px' }}>
                  {col.name}
                </th>
              ))}
              <th style={{ textAlign: 'right', padding: '10px 0 10px 12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.6px' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? C.rowAlt : C.white, borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '9px 10px 9px 0', verticalAlign: 'top' }}>{item.description || '—'}</td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '9px 0 9px 12px', textAlign: 'right', verticalAlign: 'top', color: C.textSecond }}>
                    {item.customFields[col.key] !== undefined ? String(item.customFields[col.key]) : '—'}
                  </td>
                ))}
                <td style={{ padding: '9px 0 9px 12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div style={{ padding: '16px 40px 28px', display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', minWidth: '260px' }}>
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
              <tr style={{ background: C.accentLight, borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 24px 8px 8px', fontWeight: 700, color: C.accent }}>Balance Due</td>
                <td style={{ padding: '8px 8px 8px 0', textAlign: 'right', fontWeight: 700, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{fmt(balance)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ padding: '0 40px 20px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Notes</p>
          <p style={{ color: C.textSecond, whiteSpace: 'pre-wrap', margin: 0, fontSize: '12px' }}>{invoice.notes}</p>
        </div>
      )}

      {/* ── Payment history ── */}
      {payments.length > 0 && (
        <div style={{ padding: '0 40px 24px', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Payment History</p>
          {payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < payments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.textSecond, fontSize: '12px' }}>{formatDate(p.date)}{p.note ? ` — ${p.note}` : ''}</span>
              <span style={{ color: C.success, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>+ {fmt(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        padding: '14px 40px',
        borderTop: `2px solid ${C.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '8px',
      }}>
        <span style={{ fontSize: '12px', color: C.textMuted }}>Thank you for your business!</span>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: C.textMuted }}>
          {settings.shopPhone && <span>{settings.shopPhone}</span>}
          {settings.shopEmail && <span>{settings.shopEmail}</span>}
        </div>
      </div>
    </div>
  );
}
