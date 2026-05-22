import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { updateSettings } from '../../db/db';
import { db, INDUSTRY_TEMPLATES } from '../../db/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Toggle } from '../../components/ui/Toggle';
import { Select } from '../../components/ui/Select';
import { cn } from '../../utils/cn';

const STEPS = ['Your Shop', 'GST', 'Invoice Settings', 'Job Columns', 'Done'];

const TEMPLATES = [
  { id: 'machine_shop',    label: 'Machine Shop',     desc: 'Grinding, lathe, milling — hours × rate' },
  { id: 'printing_press',  label: 'Printing Press',   desc: 'Paper size, qty × rate per copy' },
  { id: 'tailoring',       label: 'Tailoring',        desc: 'Garment type, qty × rate per piece' },
  { id: 'general_service', label: 'General Service',  desc: 'Any hourly service — hours × rate' },
  { id: 'none',            label: 'Set up later',     desc: 'I\'ll add columns in Settings' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Shop
  const [shopName,    setShopName]    = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone,   setShopPhone]   = useState('');

  // Step 2 — GST
  const [gstEnabled,  setGstEnabled]  = useState(false);
  const [gstNumber,   setGstNumber]   = useState('');
  const [gstRate,     setGstRate]     = useState(18);
  const [gstType,     setGstType]     = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');

  // Step 3 — Invoice
  const [prefix, setPrefix]     = useState('INV');
  const [terms,  setTerms]      = useState(45);

  // Step 4 — Template
  const [template, setTemplate] = useState<string | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!shopName.trim())    e.shopName    = 'Required';
      if (!shopAddress.trim()) e.shopAddress = 'Required';
      if (!shopPhone.trim())   e.shopPhone   = 'Required';
    }
    if (step === 2) {
      if (!prefix.trim())    e.prefix = 'Required';
      if (!terms || terms < 1) e.terms = 'Must be at least 1 day';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step === 3) { finish(); return; }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => s - 1);

  const finish = async () => {
    setSaving(true);
    try {
      await updateSettings({
        shopName, shopAddress, shopPhone,
        gstEnabled, gstNumber,
        defaultGstRate: gstRate,
        defaultGstType: gstEnabled ? gstType : 'none',
        invoicePrefix: prefix.toUpperCase(),
        paymentTermsDays: terms,
        onboardingComplete: true,
      });

      if (template && template !== 'none') {
        const cols = INDUSTRY_TEMPLATES[template];
        if (cols) {
          await db.columnTemplates.bulkAdd(cols.map(c => ({ ...c, createdAt: new Date() })));
        }
      }

      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    await updateSettings({ onboardingComplete: true });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-[var(--text-primary)]">ShopOS</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5 pb-1 flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)] font-medium">Step {step + 1} of {STEPS.length}</p>
          <button onClick={skip} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Skip setup
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2">

          {/* Step 0 — Shop details */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Tell us about your shop</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">This will appear on every invoice you print.</p>
              </div>
              <Input label="Shop Name" placeholder="e.g. Raj Grinding Works" value={shopName} onChange={e => setShopName(e.target.value)} error={errors.shopName} autoFocus />
              <Textarea label="Address" placeholder="Street, area, city, pincode" value={shopAddress} onChange={e => setShopAddress(e.target.value)} error={errors.shopAddress} />
              <Input label="Phone Number" placeholder="9876543210" value={shopPhone} onChange={e => setShopPhone(e.target.value)} error={errors.shopPhone} />
            </div>
          )}

          {/* Step 1 — GST */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Does your shop have a GST number?</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">If registered, invoices will show a full GST breakdown.</p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                <Toggle checked={gstEnabled} onCheckedChange={setGstEnabled} label="My shop is GST registered" />
              </div>
              {gstEnabled && (
                <div className="space-y-3">
                  <Input label="GST Number" placeholder="27AAAAA0000A1Z5" value={gstNumber} onChange={e => setGstNumber(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Default GST Rate (%)" type="number" value={gstRate} onChange={e => setGstRate(Number(e.target.value))} />
                    <Select
                      label="GST Type"
                      value={gstType}
                      onChange={e => setGstType(e.target.value as 'CGST_SGST' | 'IGST')}
                      options={[
                        { value: 'CGST_SGST', label: 'CGST + SGST' },
                        { value: 'IGST',      label: 'IGST' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Invoice settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Set up your invoice numbering</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Every invoice gets a unique number automatically.</p>
              </div>
              <Input
                label="Invoice Prefix"
                placeholder="INV"
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase())}
                error={errors.prefix}
                hint={`Preview: ${prefix.toUpperCase() || 'INV'}0001, ${prefix.toUpperCase() || 'INV'}0002...`}
                maxLength={6}
              />
              <Input
                label="Payment Terms (days)"
                type="number"
                value={terms}
                onChange={e => setTerms(Number(e.target.value))}
                error={errors.terms}
                hint="How many days until a bill is overdue. Most shops use 45."
              />
            </div>
          )}

          {/* Step 3 — Template */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">What kind of shop do you run?</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">We'll pre-fill your invoice columns. You can change them later.</p>
              </div>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors',
                      template === t.id
                        ? 'border-[var(--primary)] bg-[var(--primary-subtle)]'
                        : 'border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                    )}
                  >
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', template === t.id ? 'text-[var(--primary-text)]' : 'text-[var(--text-primary)]')}>{t.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
                    </div>
                    {template === t.id && <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[var(--success-subtle)] flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-[var(--success)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">You're all set!</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">Your first invoice takes about 2 minutes. Let's go.</p>
            </div>
          )}

          {/* Navigation */}
          <div className={cn('flex mt-6', step > 0 && step < 4 ? 'justify-between' : 'justify-end')}>
            {step > 0 && step < 4 && (
              <Button variant="ghost" onClick={back} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
            )}
            {step < 3 && (
              <Button onClick={next} icon={<ChevronRight className="w-4 h-4" />}>
                {step === 0 ? 'Next' : step === 1 && !gstEnabled ? 'Skip GST' : 'Next'}
              </Button>
            )}
            {step === 3 && (
              <Button onClick={next} loading={saving} disabled={!template}>
                {template === 'none' ? 'Finish setup' : 'Apply & Finish'}
              </Button>
            )}
            {step === 4 && (
              <Button onClick={() => navigate('/')} loading={saving}>Open ShopOS</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
