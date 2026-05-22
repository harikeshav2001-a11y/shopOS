import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useColumns, addColumn, updateColumn, deleteColumn, reorderColumns } from '../../hooks/useColumns';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import type { ColumnTemplate, CalcRole, ColumnType } from '../../db/types';

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableColumn({
  col,
  onEdit,
  onDelete,
}: {
  col: ColumnTemplate;
  onEdit: (col: ColumnTemplate) => void;
  onDelete: (col: ColumnTemplate) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.id! });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const roleLabel = col.calcRole === 'multiplier'
    ? '× multiplier'
    : col.calcRole === 'rate'
      ? '× rate'
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]"
    >
      <button {...attributes} {...listeners} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--text-primary)]">{col.name}</span>
        <span className="ml-2 text-xs text-[var(--text-muted)]">{col.type}</span>
        {roleLabel && (
          <span className="ml-2 text-xs bg-[var(--primary-subtle)] text-[var(--primary-text)] px-1.5 py-0.5 rounded">
            {roleLabel}
          </span>
        )}
      </div>
      <button onClick={() => onEdit(col)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(col)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Column form (add / edit) ──────────────────────────────────────────────────
interface ColumnFormData {
  name: string;
  type: ColumnType;
  calcRole: CalcRole;
  options: string;
}

function ColumnForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ColumnFormData>;
  onSave: (data: ColumnFormData) => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [type, setType]         = useState<ColumnType>(initial?.type ?? 'text');
  const [calcRole, setCalcRole] = useState<CalcRole>(initial?.calcRole ?? 'none');
  const [options, setOptions]   = useState(initial?.options ?? '');
  const [error, setError]       = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Column name is required'); return; }
    onSave({ name: name.trim(), type, calcRole, options });
  };

  return (
    <div className="space-y-4">
      <Input label="Column Name" placeholder="e.g. Hours, Quantity, Paper Size" value={name} onChange={e => { setName(e.target.value); setError(''); }} error={error} autoFocus />

      <Select
        label="Type"
        value={type}
        onChange={e => setType(e.target.value as ColumnType)}
        options={[
          { value: 'text',     label: 'Text — free typing' },
          { value: 'number',   label: 'Number — digits only' },
          { value: 'dropdown', label: 'Dropdown — pick from a list' },
        ]}
        hint="Number columns can be used in the amount formula"
      />

      {type === 'dropdown' && (
        <Input
          label="Dropdown Options"
          placeholder="Inner Bore, Outer (Butter)"
          value={options}
          onChange={e => setOptions(e.target.value)}
          hint="Separate each option with a comma"
        />
      )}

      {type === 'number' && (
        <Select
          label="Role in Amount Calculation"
          value={calcRole}
          onChange={e => setCalcRole(e.target.value as CalcRole)}
          options={[
            { value: 'none',       label: 'No role — just for display' },
            { value: 'multiplier', label: 'Multiplier (e.g. Hours, Qty)' },
            { value: 'rate',       label: 'Rate (e.g. Rate/hr, Rate/unit)' },
          ]}
          hint="Amount = Multiplier × Rate"
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={handleSave}>Save Column</Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Columns() {
  const columns   = useColumns();
  const { toast } = useToast();
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<ColumnTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const multiplierCol = columns.find(c => c.calcRole === 'multiplier');
  const rateCol       = columns.find(c => c.calcRole === 'rate');

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);
    const reordered = [...columns];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    await reorderColumns(reordered.map(c => c.id!));
  };

  const handleAdd = async (data: ColumnFormData) => {
    const key = data.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await addColumn({
      name: data.name,
      key,
      type: data.type,
      calcRole: data.type === 'number' ? data.calcRole : 'none',
      options: data.type === 'dropdown' ? data.options.split(',').map(s => s.trim()).filter(Boolean) : [],
      sortOrder: columns.length,
      isActive: true,
    });
    setShowAdd(false);
    toast('success', `"${data.name}" column added`);
  };

  const handleEdit = async (data: ColumnFormData) => {
    if (!editing?.id) return;
    await updateColumn(editing.id, {
      name: data.name,
      type: data.type,
      calcRole: data.type === 'number' ? data.calcRole : 'none',
      options: data.type === 'dropdown' ? data.options.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
    setEditing(null);
    toast('success', 'Column updated');
  };

  const handleDelete = async (col: ColumnTemplate) => {
    await deleteColumn(col.id!);
    toast('success', `"${col.name}" removed`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Invoice Line Item Columns</h2>
        <p className="text-sm text-[var(--text-secondary)]">Define what fields appear on each job row in your invoices. Drag to reorder.</p>
      </div>

      {/* Formula summary */}
      {(multiplierCol || rateCol) && (
        <div className="p-3 rounded-lg bg-[var(--primary-subtle)] text-sm text-[var(--primary-text)]">
          Amount formula: <strong>{multiplierCol?.name ?? '?'}</strong> × <strong>{rateCol?.name ?? '?'}</strong> = Amount
        </div>
      )}

      {/* Standard field notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
        <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
        <span className="text-xs text-[var(--text-secondary)]"><strong>Description</strong> and <strong>Amount</strong> are always present on every invoice.</span>
      </div>

      {/* Column list */}
      {columns.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">No custom columns yet. Add your first one below.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => c.id!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {columns.map(col => (
                <SortableColumn
                  key={col.id}
                  col={col}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
        Add Column
      </Button>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Column" description="This column will appear on every invoice line item.">
        <ColumnForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Column">
        {editing && (
          <ColumnForm
            initial={{
              name: editing.name,
              type: editing.type,
              calcRole: editing.calcRole,
              options: editing.options.join(', '),
            }}
            onSave={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
