import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { CLOCK_SEGMENTS } from '../types';
import type { ClockSegments } from '../types';

const clockFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  segments: z.coerce.number().refine((v): v is ClockSegments => (CLOCK_SEGMENTS as readonly number[]).includes(v), {
    message: 'Niepoprawna liczba segmentów',
  }),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string()).max(50).default([]),
  tickLabels: z.array(z.object({ value: z.string().max(300) })).default([]),
  isActive: z.boolean().default(true),
});

export type ClockFormValues = z.infer<typeof clockFormSchema>;

interface ClockFormProps {
  defaultValues?: Partial<ClockFormValues>;
  onSubmit: (values: ClockFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function ClockForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: ClockFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClockFormValues>({
    resolver: zodResolver(clockFormSchema),
    defaultValues: {
      name: '',
      segments: 6,
      description: '',
      tags: [],
      tickLabels: [],
      isActive: true,
      ...defaultValues,
    },
  });

  const segments = watch('segments');
  const { fields: tickFields, replace: replaceTickLabels } = useFieldArray({
    control,
    name: 'tickLabels',
  });

  // Keep tickLabels array length in sync with selected segments count
  const prevSegments = tickFields.length;
  if (prevSegments !== Number(segments)) {
    const current = tickFields.map((f) => ({ value: (f as { value: string }).value ?? '' }));
    const next = Number(segments);
    const updated = Array.from({ length: next }, (_, i) => current[i] ?? { value: '' });
    replaceTickLabels(updated);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="clock-name" className="text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="clock-name"
          {...register('name')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Nazwa zegara…"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'clock-name-error' : undefined}
        />
        {errors.name && (
          <p id="clock-name-error" role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Segments */}
      <div className="flex flex-col gap-1">
        <label htmlFor="clock-segments" className="text-sm font-medium text-surface-700">
          Liczba segmentów
        </label>
        <select
          id="clock-segments"
          {...register('segments')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {CLOCK_SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Opis</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tick labels */}
      {tickFields.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-surface-700">Opisy tyknięć</label>
          {tickFields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-surface-400 font-medium">{index + 1}.</span>
              <input
                {...register(`tickLabels.${index}.value`)}
                className="flex-1 rounded-md border border-surface-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder={`Co się dzieje po tyknięciu ${index + 1}?`}
              />
            </div>
          ))}
        </div>
      )}

      {/* isActive toggle */}
      <div className="flex items-center gap-3">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                field.value ? 'bg-primary-600' : 'bg-surface-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                  field.value ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        />
        <label className="text-sm text-surface-700">Zegar aktywny</label>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving ? 'Zapisuję…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
