import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSettings } from '../../hooks/useSettings';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const schema = z.object({
  gstNumber:      z.string(),
  defaultGstRate: z.coerce.number().min(0).max(100),
  defaultGstType: z.enum(['CGST_SGST', 'IGST']),
});
type FormData = z.infer<typeof schema>;

export default function GST() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { gstNumber: '', defaultGstRate: 18, defaultGstType: 'CGST_SGST' },
  });

  useEffect(() => {
    if (settings) reset({
      gstNumber:      settings.gstNumber,
      defaultGstRate: settings.defaultGstRate,
      defaultGstType: settings.defaultGstType === 'none' ? 'CGST_SGST' : settings.defaultGstType,
    });
  }, [settings, reset]);

  const onSubmit = async (data: FormData) => {
    await updateSettings(data);
    toast('success', 'GST settings saved');
    reset(data);
  };

  const gstEnabled = settings?.gstEnabled ?? false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">GST Settings</h2>
        <p className="text-sm text-[var(--text-secondary)]">When GST is on, all invoices show a full tax breakdown.</p>
      </div>

      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        <Toggle
          checked={gstEnabled}
          onCheckedChange={v => updateSettings({ gstEnabled: v })}
          label="GST Enabled"
          description={gstEnabled ? 'Invoices will show CGST / SGST / IGST breakdown' : 'Invoices show only the total — no tax breakdown'}
        />
      </div>

      {gstEnabled && (
        <div className="space-y-4">
          <Input
            label="GST Number"
            placeholder="27AAAAA0000A1Z5"
            hint="Printed on every invoice"
            error={errors.gstNumber?.message}
            {...register('gstNumber')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Default GST Rate (%)"
              type="number"
              min={0}
              max={100}
              hint="e.g. 18 for 18% GST"
              error={errors.defaultGstRate?.message}
              {...register('defaultGstRate')}
            />
            <Select
              label="Default GST Type"
              options={[
                { value: 'CGST_SGST', label: 'CGST + SGST (same state)' },
                { value: 'IGST',      label: 'IGST (different state)' },
              ]}
              hint="Can be changed per invoice"
              error={errors.defaultGstType?.message}
              {...register('defaultGstType')}
            />
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-sm">
            <p className="font-medium text-[var(--text-primary)] mb-2">How it will look on invoices</p>
            <div className="space-y-1 text-[var(--text-secondary)]">
              <div className="flex justify-between"><span>Subtotal</span><span>₹10,000</span></div>
              {settings?.defaultGstType === 'IGST' ? (
                <div className="flex justify-between"><span>IGST ({settings?.defaultGstRate ?? 18}%)</span><span>₹{(10000 * (settings?.defaultGstRate ?? 18) / 100).toLocaleString('en-IN')}</span></div>
              ) : (
                <>
                  <div className="flex justify-between"><span>CGST ({(settings?.defaultGstRate ?? 18) / 2}%)</span><span>₹{(10000 * (settings?.defaultGstRate ?? 18) / 200).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>SGST ({(settings?.defaultGstRate ?? 18) / 2}%)</span><span>₹{(10000 * (settings?.defaultGstRate ?? 18) / 200).toLocaleString('en-IN')}</span></div>
                </>
              )}
              <div className="flex justify-between font-semibold text-[var(--text-primary)] border-t border-[var(--border)] pt-1 mt-1">
                <span>Total</span>
                <span>₹{(10000 * (1 + (settings?.defaultGstRate ?? 18) / 100)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {gstEnabled && (
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save GST Settings</Button>
        </div>
      )}
    </form>
  );
}
