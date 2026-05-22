import { useState, useRef, useEffect } from 'react';
import { Search, User, Plus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { cn } from '../../utils/cn';

interface Props {
  customerId:    number | null;
  customerName:  string;
  customerPhone: string;
  onChange: (customerId: number | null, name: string, phone: string) => void;
}

export function CustomerCombobox({ customerId, customerName, customerPhone, onChange }: Props) {
  const customers  = useCustomers();
  const [query,    setQuery]  = useState(customerName);
  const [open,     setOpen]   = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync query text when an external customerId is provided
  useEffect(() => {
    if (customerId) {
      const c = customers.find(c => c.id === customerId);
      if (c) setQuery(c.name);
    }
  }, [customerId, customers.length]);

  const filtered = customers
    .filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
    )
    .slice(0, 8);

  const showCreateOption =
    query.trim().length > 1 &&
    !customers.find(c => c.name.toLowerCase() === query.trim().toLowerCase());

  function selectExisting(c: { id?: number; name: string; phone: string }) {
    setQuery(c.name);
    setOpen(false);
    onChange(c.id ?? null, c.name, c.phone);
  }

  function handleInput(value: string) {
    setQuery(value);
    setOpen(true);
    // Clear the resolved customer ID while the user is typing
    onChange(null, value, customerPhone);
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">
        Customer <span className="text-[var(--danger)]">*</span>
      </label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or phone, or type a new customer name…"
          className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
        {/* Green dot — existing customer resolved */}
        {customerId && (
          <span
            title="Existing customer"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--success)]"
          />
        )}
      </div>

      {/* Phone number for new (unresolved) customer */}
      {!customerId && query.trim().length > 1 && (
        <input
          value={customerPhone}
          onChange={e => onChange(null, query, e.target.value)}
          placeholder="Phone (optional)"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      )}

      {/* Dropdown */}
      {open && (filtered.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectExisting(c)}
              className={cn(
                'w-full text-left px-4 py-3 flex items-center gap-3',
                'hover:bg-[var(--bg-elevated)] transition-colors',
                'border-b border-[var(--border)] last:border-0'
              )}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-[var(--primary)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-[var(--text-muted)]">{c.phone}</p>}
              </div>
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => { setOpen(false); onChange(null, query.trim(), customerPhone); }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--success)] bg-opacity-10 flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Create "{query.trim()}"</p>
                <p className="text-xs text-[var(--text-muted)]">Will be added as a new customer</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
