import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCustomers, addCustomer } from '../../hooks/useCustomers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { cn } from '../../utils/cn';

interface AddForm {
  name: string;
  phone: string;
  email: string;
  city: string;
}

export default function CustomerList() {
  const customers     = useCustomers();
  const navigate      = useNavigate();
  const { toast }     = useToast();
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddForm>({
    defaultValues: { name: '', phone: '', email: '', city: '' },
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const onAdd = async (data: AddForm) => {
    try {
      await addCustomer({
        name:      data.name.trim(),
        phone:     data.phone.trim(),
        email:     data.email.trim(),
        city:      data.city.trim(),
        address:   '',
        gstNumber: '',
        notes:     '',
      });
      toast('success', `${data.name} added`);
      reset();
      setShowAdd(false);
    } catch {
      toast('error', 'Could not add customer');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          <span className="hidden sm:inline">Add Customer</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Search */}
      {customers.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      )}

      {/* Empty state */}
      {customers.length === 0 && (
        <EmptyState
          icon={<Users className="w-12 h-12" strokeWidth={1.5} />}
          title="No customers yet"
          description="Add your first customer, or they'll be added automatically when you create an invoice."
          action={{ label: 'Add Customer', onClick: () => setShowAdd(true) }}
        />
      )}

      {/* Table */}
      {customers.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">

          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
              No customers match "{search}"
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <span className="col-span-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Customer</span>
                  <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Total Billed</span>
                  <span className="col-span-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Outstanding</span>
                  <span className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">Last Invoice</span>
                </div>

                {filtered.map((c, i) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3.5 items-center cursor-pointer',
                      'hover:bg-[var(--bg-elevated)] transition-colors',
                      i < filtered.length - 1 && 'border-b border-[var(--border)]'
                    )}
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-sm tabular-nums text-[var(--text-primary)]">
                        {c.totalBilled > 0 ? formatCurrency(c.totalBilled) : <span className="text-[var(--text-muted)]">—</span>}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      {c.outstanding > 0 ? (
                        <span className="text-sm tabular-nums font-medium text-[var(--warning)]">{formatCurrency(c.outstanding)}</span>
                      ) : (
                        <span className="text-sm text-[var(--success)]">Paid up</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end gap-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {c.lastInvoiceDate ? formatDate(c.lastInvoiceDate) : '—'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Mobile cards ── */}
              <div className="md:hidden divide-y divide-[var(--border)]">
                {filtered.map(c => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.outstanding > 0 ? (
                        <span className="text-sm tabular-nums font-medium text-[var(--warning)]">
                          {formatCurrency(c.outstanding)} due
                        </span>
                      ) : c.totalBilled > 0 ? (
                        <span className="text-xs text-[var(--success)]">All paid</span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add customer modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); reset(); }}
        title="Add Customer"
        description="Basic details — you can add more later from the customer page."
      >
        <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Raj Engineering Works"
            error={errors.name?.message}
            autoFocus
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Phone"
            placeholder="9876543210"
            error={errors.phone?.message}
            {...register('phone', { required: 'Phone is required' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" placeholder="optional" {...register('email')} />
            <Input label="City" placeholder="e.g. Pune" {...register('city')} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
