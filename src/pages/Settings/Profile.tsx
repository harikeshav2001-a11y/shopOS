import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const schema = z.object({
  shopName:        z.string().min(1, 'Shop name is required'),
  shopAddress:     z.string().min(1, 'Address is required'),
  shopPhone:       z.string().min(1, 'Phone number is required'),
  shopEmail:       z.string().email('Enter a valid email').or(z.literal('')),
  invoicePrefix:   z.string().min(1, 'Prefix is required').max(6, 'Max 6 characters').toUpperCase(),
  paymentTermsDays: z.coerce.number().min(1).max(365),
});
type FormData = z.infer<typeof schema>;

export default function Profile() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { shopName: '', shopAddress: '', shopPhone: '', shopEmail: '', invoicePrefix: 'INV', paymentTermsDays: 45 },
  });

  useEffect(() => {
    if (settings) reset({
      shopName:         settings.shopName,
      shopAddress:      settings.shopAddress,
      shopPhone:        settings.shopPhone,
      shopEmail:        settings.shopEmail,
      invoicePrefix:    settings.invoicePrefix,
      paymentTermsDays: settings.paymentTermsDays,
    });
  }, [settings, reset]);

  const onSubmit = async (data: FormData) => {
    await updateSettings(data);
    toast('success', 'Shop profile saved');
    reset(data);
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSettings({ logoBase64: reader.result as string });
    reader.readAsDataURL(file);
  };

  const removeLogo = () => updateSettings({ logoBase64: '' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Shop Profile</h2>
        <p className="text-sm text-[var(--text-secondary)]">This information appears on every invoice you print.</p>
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Shop Logo <span className="font-normal text-[var(--text-muted)]">(optional)</span></p>
        {settings?.logoBase64 ? (
          <div className="flex items-center gap-3">
            <img src={settings.logoBase64} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-[var(--border)]" />
            <Button type="button" variant="ghost" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={removeLogo}>Remove</Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-fit"
          >
            <Upload className="w-4 h-4" /> Upload logo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Shop Name" placeholder="e.g. Raj Grinding Works" error={errors.shopName?.message} {...register('shopName')} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Address" placeholder="Street, area, city, pincode" error={errors.shopAddress?.message} {...register('shopAddress')} />
        </div>
        <Input label="Phone Number" placeholder="9876543210" error={errors.shopPhone?.message} {...register('shopPhone')} />
        <Input label="Email" placeholder="shop@email.com (optional)" error={errors.shopEmail?.message} {...register('shopEmail')} />
      </div>

      <div className="border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Invoice Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Invoice Prefix"
            placeholder="INV"
            hint="e.g. RGW → generates RGW0001"
            error={errors.invoicePrefix?.message}
            {...register('invoicePrefix')}
          />
          <Input
            label="Payment Terms (days)"
            type="number"
            min={1}
            max={365}
            hint="How many days before a bill is overdue"
            error={errors.paymentTermsDays?.message}
            {...register('paymentTermsDays')}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save Profile</Button>
      </div>
    </form>
  );
}
