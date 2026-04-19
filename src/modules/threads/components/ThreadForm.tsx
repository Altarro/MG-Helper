import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import {
  THREAD_COLORS,
  THREAD_KIND_LABELS,
  THREAD_KINDS,
  THREAD_PRIORITY_LABELS,
  THREAD_PRIORITIES,
  THREAD_STATUS_LABELS,
} from '../types';

const threadFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string().min(1).max(50)).max(50).default([]),
  color: z.string().default('#6366f1'),
  status: z.enum(['active', 'completed']).default('active'),
  kind: z.enum(THREAD_KINDS).default('side'),
  priority: z.enum(THREAD_PRIORITIES).default('normal'),
  resolution: z.string().max(2000).default(''),
});

export type ThreadFormValues = z.infer<typeof threadFormSchema>;

interface ThreadFormProps {
  defaultValues?: Partial<ThreadFormValues>;
  onSubmit: (values: ThreadFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ThreadForm({ defaultValues, onSubmit, onCancel, isSaving }: ThreadFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ThreadFormValues>({
    resolver: zodResolver(threadFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: [],
      color: '#6366f1',
      status: 'active',
      kind: 'side',
      priority: 'normal',
      resolution: '',
      ...defaultValues,
    },
  });

  const selectedColor = watch('color');

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
          placeholder="np. Zaginięcie klucznika"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Color */}
      <div>
        <label className="mb-2 block text-sm font-medium text-surface-700">Kolor</label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {THREAD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field.onChange(c)}
                  aria-label={`Kolor ${c}`}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    field.value === c ? 'ring-2 ring-offset-2 ring-surface-700 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        />
        <div
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-surface-200 px-2 py-1"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-xs text-surface-500">{selectedColor}</span>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Status</label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <div className="flex gap-2">
              {(Object.entries(THREAD_STATUS_LABELS) as [string, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    field.value === value
                      ? 'bg-surface-800 text-white'
                      : 'border border-surface-300 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Typ w?tku</label>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {THREAD_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    field.value === value
                      ? 'bg-primary-600 text-white'
                      : 'border border-surface-300 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  {THREAD_KIND_LABELS[value]}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Priorytet przy stole</label>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {THREAD_PRIORITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    field.value === value
                      ? 'bg-amber-500 text-white'
                      : 'border border-surface-300 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  {THREAD_PRIORITY_LABELS[value]}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Rozwiazanie / efekt</label>
        <textarea
          {...register('resolution')}
          rows={3}
          className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          placeholder="Jak ten w?tek zako?czy? si? albo do czego powinien doprowadzi??"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">Opis</label>
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
