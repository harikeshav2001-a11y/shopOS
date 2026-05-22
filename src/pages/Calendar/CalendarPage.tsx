import { useState, useMemo } from 'react';
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameMonth, isSameDay, isToday,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus,
  Pencil, Trash2, FileText, CreditCard, Pin, CheckCircle2,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  useCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../../hooks/useCalendar';
import { Button }   from '../../components/ui/Button';
import { Input }    from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal }    from '../../components/ui/Modal';
import { Badge }    from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/currency';
import { cn } from '../../utils/cn';
import type { CalendarEvent } from '../../db/types';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ── Add/Edit Event modal ──────────────────────────────────────────────────────
interface EventModalProps {
  open:        boolean;
  onClose:     () => void;
  initial?:    CalendarEvent | null;
  defaultDate: Date;
}

function EventModal({ open, onClose, initial, defaultDate }: EventModalProps) {
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [title,  setTitle]  = useState('');
  const [date,   setDate]   = useState('');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setTitle(initial?.title ?? '');
    setDate(format(initial ? new Date(initial.date) : defaultDate, 'yyyy-MM-dd'));
    setNotes(initial?.notes ?? '');
    setLastOpen(true);
  }
  if (!open && lastOpen) setLastOpen(false);

  async function save() {
    if (!title.trim()) { toast('error', 'Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date:  new Date(`${date}T00:00:00`),
        notes: notes.trim(),
      };
      if (isEdit) {
        await updateCalendarEvent(initial!.id!, payload);
        toast('success', 'Event updated');
      } else {
        await addCalendarEvent(payload);
        toast('success', 'Event added');
      }
      onClose();
    } catch {
      toast('error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Event' : 'New Event'}>
      <div className="space-y-4 mt-4">
        <Input
          label="Title"
          placeholder="e.g. Machine delivery, Team meeting"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <Textarea
          label="Notes (optional)"
          placeholder="Any additional details..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isEdit ? 'Save Changes' : 'Add Event'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay,  setSelectedDay]  = useState(() => new Date());
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editEvent,    setEditEvent]    = useState<CalendarEvent | null>(null);

  const invoices       = useLiveQuery(() => db.invoices.toArray(),  []) ?? [];
  const bills          = useLiveQuery(() => db.bills.toArray(),      []) ?? [];
  const calendarEvents = useCalendarEvents();

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // ── Dot map (for grid indicators) ────────────────────────────────────────
  // Only unpaid items get dots — dots signal things needing attention
  const dotMap = useMemo(() => {
    const map = new Map<string, { inv: boolean; bill: boolean; event: boolean }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { inv: false, bill: false, event: false });
      return map.get(key)!;
    };
    invoices.forEach(inv => {
      if (inv.status === 'paid') return;
      ensure(format(new Date(inv.dueDate), 'yyyy-MM-dd')).inv = true;
    });
    bills.forEach(b => {
      if (b.status === 'paid') return;
      ensure(format(new Date(b.dueDate), 'yyyy-MM-dd')).bill = true;
    });
    calendarEvents.forEach(ev => {
      ensure(format(new Date(ev.date), 'yyyy-MM-dd')).event = true;
    });
    return map;
  }, [invoices, bills, calendarEvents]);

  // ── Day detail data (ALL items including paid) ────────────────────────────
  const selectedKey = format(selectedDay, 'yyyy-MM-dd');

  const dayInvoices = useMemo(() =>
    invoices.filter(inv => format(new Date(inv.dueDate), 'yyyy-MM-dd') === selectedKey),
    [invoices, selectedKey]
  );
  const dayBills = useMemo(() =>
    bills.filter(b => format(new Date(b.dueDate), 'yyyy-MM-dd') === selectedKey),
    [bills, selectedKey]
  );
  const dayEvents = useMemo(() =>
    calendarEvents.filter(ev => format(new Date(ev.date), 'yyyy-MM-dd') === selectedKey),
    [calendarEvents, selectedKey]
  );

  const hasAnything = dayInvoices.length > 0 || dayBills.length > 0 || dayEvents.length > 0;

  function openAdd()               { setEditEvent(null); setModalOpen(true); }
  function openEdit(ev: CalendarEvent) { setEditEvent(ev); setModalOpen(true); }
  async function handleDelete(id: number) {
    if (!confirm('Delete this event?')) return;
    await deleteCalendarEvent(id);
    toast('success', 'Event deleted');
  }

  // ── Day cell ──────────────────────────────────────────────────────────────
  function DayCell({ day }: { day: Date }) {
    const key      = format(day, 'yyyy-MM-dd');
    const dots     = dotMap.get(key);
    const inMonth  = isSameMonth(day, currentMonth);
    const selected = isSameDay(day, selectedDay);
    const today    = isToday(day);

    return (
      <button
        onClick={() => {
          setSelectedDay(day);
          if (!isSameMonth(day, currentMonth)) setCurrentMonth(day);
        }}
        className={cn(
          'flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5 rounded-lg transition-colors',
          'hover:bg-[var(--bg-elevated)]',
          selected && 'bg-[var(--bg-elevated)] ring-1 ring-[var(--primary)]',
          !inMonth && 'opacity-25 pointer-events-none',
        )}
      >
        {/* Date number */}
        <span className={cn(
          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium leading-none',
          today  ? 'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--text-primary)]',
        )}>
          {format(day, 'd')}
        </span>
        {/* Dots row */}
        <div className="flex gap-[3px] h-1.5 items-center">
          {dots?.inv   && <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]"  />}
          {dots?.bill  && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />}
          {dots?.event && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />}
          {!dots?.inv && !dots?.bill && !dots?.event && <span className="w-1.5 h-1.5" />}
        </div>
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Calendar card ── */}
        <div className="w-full lg:w-auto lg:shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="w-full" style={{ minWidth: 280, maxWidth: 320 }}>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                {!isSameDay(currentMonth, new Date()) && (
                  <button
                    onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
                    className="text-[10px] text-[var(--primary)] font-semibold hover:underline"
                  >
                    Today
                  </button>
                )}
              </div>
              <button
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-0.5">
              {DOW.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-muted)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map(day => (
                <DayCell key={day.toISOString()} day={day} />
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
              {[
                { color: 'var(--danger)',  label: 'Invoice' },
                { color: 'var(--warning)', label: 'Bill' },
                { color: 'var(--primary)', label: 'Event' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Day detail card ── */}
        <div className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {format(selectedDay, 'EEEE, d MMMM yyyy')}
              </p>
              {isToday(selectedDay) && (
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--primary)' }}>Today</p>
              )}
            </div>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd}>
              Add event
            </Button>
          </div>

          {/* Empty state */}
          {!hasAnything && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Pin className="w-7 h-7 text-[var(--text-muted)] opacity-30 mb-2" />
              <p className="text-sm text-[var(--text-muted)]">Nothing on this day</p>
              <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">Tap "Add event" to create one.</p>
            </div>
          )}

          {/* ── Invoice dues ── */}
          {dayInvoices.length > 0 && (
            <section className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--danger)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--danger)' }}>
                  Invoices Due · {dayInvoices.length}
                </p>
              </div>
              <div className="space-y-1.5">
                {dayInvoices.map(inv => {
                  const paid    = inv.status === 'paid';
                  const balance = inv.total - inv.paidAmount;
                  return (
                    <div
                      key={inv.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border',
                        paid
                          ? 'bg-[var(--bg-elevated)] border-[var(--border)] opacity-60'
                          : 'bg-[var(--bg-elevated)] border-[var(--border)]'
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {paid && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--success)]" />}
                        <div className="min-w-0">
                          <p className={cn('text-sm font-medium truncate', paid ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]')}>
                            {inv.customerSnapshot.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{inv.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {paid
                          ? <Badge status="paid" />
                          : <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--danger)' }}>
                              {formatCurrency(balance)}
                            </span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Bill dues ── */}
          {dayBills.length > 0 && (
            <section className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--warning)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--warning)' }}>
                  Bills Due · {dayBills.length}
                </p>
              </div>
              <div className="space-y-1.5">
                {dayBills.map(bill => {
                  const paid = bill.status === 'paid';
                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border',
                        paid
                          ? 'bg-[var(--bg-elevated)] border-[var(--border)] opacity-60'
                          : 'bg-[var(--bg-elevated)] border-[var(--border)]'
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {paid && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--success)]" />}
                        <div className="min-w-0">
                          <p className={cn('text-sm font-medium truncate', paid ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]')}>
                            {bill.vendorName}
                          </p>
                          {bill.description && (
                            <p className="text-xs text-[var(--text-muted)] truncate">{bill.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {paid
                          ? <Badge status="paid" />
                          : <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--warning)' }}>
                              {formatCurrency(bill.amount)}
                            </span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Manual events ── */}
          {dayEvents.length > 0 && (
            <section className="mb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Pin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                  Events · {dayEvents.length}
                </p>
              </div>
              <div className="space-y-1.5">
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{ev.title}</p>
                      {ev.notes && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{ev.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => openEdit(ev)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id!)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEvent(null); }}
        initial={editEvent}
        defaultDate={selectedDay}
      />
    </>
  );
}
