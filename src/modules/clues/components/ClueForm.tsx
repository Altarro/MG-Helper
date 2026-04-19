import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { CLUE_TYPE_LABELS } from '../types';

const clueFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string().min(1).max(50)).max(50).default([]),
  clueType: z.enum(['character', 'location', 'event']).default('event'),
  hint: z.string().max(2000).default(''),
  discovered: z.boolean().default(false),
});

export type ClueFormValues = z.infer<typeof clueFormSchema>;

interface ClueFormProps {
  defaultValues?: Partial<ClueFormValues>;
  onSubmit: (values: ClueFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ClueForm({ defaultValues, onSubmit, onCancel, isSaving }: ClueFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClueFormValues>({
    resolver: zodResolver(clueFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: [],
      clueType: 'event',
      hint: '',
      discovered: false,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          placeholder="np. Odcisk buta przy drzwiach"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Typ wskazówki</label>
        <select
          {...register('clueType')}
          className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {(Object.entries(CLUE_TYPE_LABELS) as [string, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Hint */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Wskazówka</label>
        <textarea
          {...register('hint')}
          rows={3}
          className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          placeholder="Co gracze mogą z niej wywnioskować lub co bezpośrednio odkrywają…"
        />
      </div>

      {/* Discovered toggle */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="discovered"
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                field.value ? 'bg-green-500' : 'bg-surface-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  field.value ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        />
        <span className="text-sm text-surface-700">Odkryta przez graczy</span>
      </div>

      {/* Description (rich text) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Opis (opcjonalny)</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-surface-300 px-4 py-2 text-sm hover:bg-surface-50"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </form>
  );
}
