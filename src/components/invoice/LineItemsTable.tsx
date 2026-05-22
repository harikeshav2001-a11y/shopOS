import { Plus, Trash2 } from 'lucide-react';
import type { ColumnTemplate } from '../../db/types';
import type { LineItemInput } from '../../hooks/useInvoices';
import { calculateLineAmount } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';
import { cn } from '../../utils/cn';

interface Props {
  columns:  ColumnTemplate[];
  items:    LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  readOnly?: boolean;
}

function emptyItem(columns: ColumnTemplate[]): LineItemInput {
  const customFields: Record<string, string | number> = {};
  columns.forEach(col => {
    customFields[col.key] = col.type === 'number' ? 0 : '';
  });
  return { description: '', customFields, amount: 0 };
}

export function LineItemsTable({ columns, items, onChange, readOnly = false }: Props) {
  const hasFormula =
    columns.some(c => c.calcRole === 'multiplier') &&
    columns.some(c => c.calcRole === 'rate');

  function addRow() {
    onChange([...items, emptyItem(columns)]);
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, key: string, value: string | number) {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      const newFields = { ...item.customFields, [key]: value };
      const calc = calculateLineAmount(newFields, columns);
      return {
        ...item,
        customFields: newFields,
        amount: calc !== null ? calc : item.amount,
      };
    });
    onChange(updated);
  }

  function updateDescription(idx: number, value: string) {
    onChange(items.map((item, i) => i === idx ? { ...item, description: value } : item));
  }

  function updateAmount(idx: number, value: number) {
    onChange(items.map((item, i) => i === idx ? { ...item, amount: isNaN(value) ? 0 : value } : item));
  }

  const subtotal = items.reduce((s, item) => s + (isNaN(item.amount) ? 0 : item.amount), 0);

  // Build grid template: description col + one col per custom field + amount col + delete col
  const colCount = columns.length;
  const gridCols = readOnly
    ? `2fr ${Array(colCount).fill('1fr').join(' ')} 1fr`
    : `2fr ${Array(colCount).fill('1fr').join(' ')} 1fr 40px`;

  return (
    <div>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden overflow-x-auto">
        {/* Header row */}
        <div
          className="grid bg-[var(--bg-elevated)] border-b border-[var(--border)]"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap">
            Description
          </div>
          {columns.map(col => (
            <div key={col.key} className="px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right whitespace-nowrap">
              {col.name}
            </div>
          ))}
          <div className="px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right whitespace-nowrap">
            Amount
          </div>
          {!readOnly && <div />}
        </div>

        {/* Data rows */}
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              'grid items-center',
              idx < items.length - 1 && 'border-b border-[var(--border)]'
            )}
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Description */}
            <div className="px-2 py-1.5">
              {readOnly ? (
                <p className="text-sm text-[var(--text-primary)] px-1 py-1">{item.description || '—'}</p>
              ) : (
                <input
                  value={item.description}
                  onChange={e => updateDescription(idx, e.target.value)}
                  placeholder="Description"
                  className="w-full px-2 py-1.5 rounded-md bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors"
                />
              )}
            </div>

            {/* Custom field cells */}
            {columns.map(col => (
              <div key={col.key} className="px-2 py-1.5">
                {readOnly ? (
                  <p className="text-sm text-right text-[var(--text-secondary)] px-1 py-1">
                    {item.customFields[col.key] ?? '—'}
                  </p>
                ) : col.type === 'dropdown' ? (
                  <select
                    value={String(item.customFields[col.key] ?? '')}
                    onChange={e => updateField(idx, col.key, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm text-[var(--text-primary)] text-right"
                  >
                    <option value="">—</option>
                    {col.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={item.customFields[col.key] ?? ''}
                    onChange={e => updateField(
                      idx, col.key,
                      col.type === 'number' ? Number(e.target.value) : e.target.value
                    )}
                    placeholder={col.type === 'number' ? '0' : ''}
                    className="w-full px-2 py-1.5 rounded-md bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm text-[var(--text-primary)] text-right placeholder:text-[var(--text-muted)] transition-colors"
                  />
                )}
              </div>
            ))}

            {/* Amount cell */}
            <div className="px-2 py-1.5">
              {readOnly || hasFormula ? (
                <p className="text-sm tabular-nums text-right text-[var(--text-primary)] px-1 py-1">
                  {formatCurrency(item.amount)}
                </p>
              ) : (
                <input
                  type="number"
                  value={item.amount || ''}
                  onChange={e => updateAmount(idx, Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2 py-1.5 rounded-md bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm text-[var(--text-primary)] text-right placeholder:text-[var(--text-muted)] transition-colors"
                />
              )}
            </div>

            {/* Delete button */}
            {!readOnly && (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle,#fef2f2)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No items yet — click "Add Row" below to begin
          </div>
        )}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
          <p className="text-sm text-[var(--text-secondary)]">
            Subtotal:{' '}
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
              {formatCurrency(subtotal)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
