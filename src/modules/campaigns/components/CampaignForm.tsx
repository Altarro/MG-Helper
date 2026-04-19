import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(100, 'Nazwa może mieć max 100 znaków'),
  description: z.string().max(500, 'Opis może mieć max 500 znaków').optional(),
});

export type CampaignFormValues = z.infer<typeof schema>;

interface CampaignFormProps {
  /** If provided, the form is in edit mode */
  defaultValues?: Partial<CampaignFormValues>;
  saving?: boolean;
  onSubmit: (values: CampaignFormValues) => void;
  onCancel: () => void;
}

export function CampaignForm({ defaultValues, saving, onSubmit, onCancel }: CampaignFormProps) {
  const isEditing = !!defaultValues?.name;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CampaignFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
    });
  }, [defaultValues, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-surface-900">
            {isEditing ? 'Zmień nazwę kampanii' : 'Nowa kampania'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700" htmlFor="campaign-name">
              Nazwa <span className="text-red-500">*</span>
            </label>
            <input
              id="campaign-name"
              {...register('name')}
              autoFocus
              placeholder="np. Kampania Wiedźmin"
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700" htmlFor="campaign-description">
              Opis
            </label>
            <textarea
              id="campaign-description"
              {...register('description')}
              rows={3}
              placeholder="Krótki opis kampanii…"
              className="resize-none rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Zapisywanie…' : isEditing ? 'Zapisz' : 'Utwórz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
