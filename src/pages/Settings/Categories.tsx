import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export default function Categories() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [newCat, setNewCat] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = settings?.expenseCategories ?? [];

  const add = async () => {
    const trimmed = newCat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    await updateSettings({ expenseCategories: [...categories, trimmed] });
    setNewCat('');
    toast('success', `"${trimmed}" added`);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(categories[idx]);
  };

  const saveEdit = async () => {
    if (editingIdx === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const updated = [...categories];
    updated[editingIdx] = trimmed;
    await updateSettings({ expenseCategories: updated });
    setEditingIdx(null);
    toast('success', 'Category updated');
  };

  const remove = async (idx: number) => {
    const updated = categories.filter((_, i) => i !== idx);
    await updateSettings({ expenseCategories: updated });
    toast('success', 'Category removed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Expense Categories</h2>
        <p className="text-sm text-[var(--text-secondary)]">Add or rename categories to match how your shop tracks costs.</p>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="New category name"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          className="flex-1"
        />
        <Button type="button" onClick={add} icon={<Plus className="w-4 h-4" />} disabled={!newCat.trim()}>
          Add
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
            {editingIdx === idx ? (
              <>
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIdx(null); }}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none border-b border-[var(--primary)]"
                />
                <button onClick={saveEdit} className="text-[var(--success)] hover:opacity-80"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingIdx(null)} className="text-[var(--text-muted)] hover:opacity-80"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-[var(--text-primary)]">{cat}</span>
                <button onClick={() => startEdit(idx)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(idx)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
