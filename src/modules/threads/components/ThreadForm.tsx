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

const THREAD_RESOLUTION_PRESETS = [
  'Wątek został domknięty przy stole.',
  'Bohaterowie rozwiązali sprawę i ponoszą jej konsekwencje.',
  'Wątek wygasł, ale zostawił otwarte następstwa.',
];

const threadFormSchema = z
  .object({
    name: z.string().min(1, 'Nazwa jest wymagana').max(200),
    description: z.string().max(100_000).default(''),
    tags: z.array(z.string().min(1).max(50)).max(50).default([]),
    color: z.string().default('#6366f1'),
    status: z.enum(['active', 'completed']).default('active'),
    kind: z.enum(THREAD_KINDS).default('side'),
    priority: z.enum(THREAD_PRIORITIES).default('normal'),
    resolution: z.string().max(2000).default(''),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'completed' && data.resolution.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Podaj rozwiązanie lub efekt zakończenia wątku',
        path: ['resolution'],
      });
    }
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
    setValue,
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
  const selectedStatus = watch('status');
  const nameErrorId = errors.name ? 'thread-name-error' : undefined;
  const resolutionErrorId = errors.resolution ? 'thread-resolution-error' : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="thread-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500">*</span>
        </label>
        <input
          id="thread-name"
          {...register('name')}
          className="app-input w-full rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="np. Zaginięcie klucznika"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={nameErrorId}
        />
        {errors.name && (
          <p id="thread-name-error" role="alert" className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Kolor</label>
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
        <div className="app-input-shell inline-flex items-center gap-2 rounded-2xl border-surface-200 px-3 py-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-xs text-surface-500">{selectedColor}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Status</label>
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Typ wątku</label>
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Priorytet przy stole</label>
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Rozwiązanie / efekt</label>
        <textarea
          {...register('resolution')}
          rows={3}
          className="app-input w-full rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Jak ten wątek zakończył się albo do czego powinien doprowadzić?"
          aria-invalid={errors.resolution ? 'true' : 'false'}
          aria-describedby={resolutionErrorId}
        />
        {selectedStatus === 'completed' && (
          <div className="flex flex-wrap gap-2">
            {THREAD_RESOLUTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue('resolution', preset, { shouldDirty: true, shouldValidate: true })}
                className="app-pill-muted rounded-full px-3 py-1.5 text-xs transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        )}
        {errors.resolution && (
          <p id="thread-resolution-error" role="alert" className="text-xs text-red-600">
            {errors.resolution.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </form>
  );
}
