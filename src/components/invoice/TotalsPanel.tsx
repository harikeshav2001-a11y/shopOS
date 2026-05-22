import type { Totals } from '../../utils/calculations';
import type { GstType } from '../../db/types';
import { formatCurrency } from '../../utils/currency';

interface Props {
  totals:     Totals;
  gstEnabled: boolean;
  gstType:    GstType;
  gstRate:    number;
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={muted ? 'text-sm text-[var(--text-muted)]' : 'text-sm text-[var(--text-secondary)]'}>
        {label}
      </span>
      <span className={bold
        ? 'text-base font-bold tabular-nums text-[var(--text-primary)]'
        : 'text-sm tabular-nums text-[var(--text-primary)]'
      }>
        {value}
      </span>
    </div>
  );
}

export function TotalsPanel({ totals, gstEnabled, gstType, gstRate }: Props) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
      <div className="max-w-xs ml-auto divide-y divide-[var(--border)]">
        <div className="pb-2">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
        </div>

        {gstEnabled && totals.gstAmount > 0 && (
          <div className="py-2">
            {gstType === 'CGST_SGST' ? (
              <>
                <Row label={`CGST (${gstRate / 2}%)`} value={formatCurrency(totals.cgst)} muted />
                <Row label={`SGST (${gstRate / 2}%)`} value={formatCurrency(totals.sgst)} muted />
              </>
            ) : (
              <Row label={`IGST (${gstRate}%)`} value={formatCurrency(totals.igst)} muted />
            )}
          </div>
        )}

        <div className="pt-2">
          <Row label="Total" value={formatCurrency(totals.total)} bold />
        </div>
      </div>
    </div>
  );
}
