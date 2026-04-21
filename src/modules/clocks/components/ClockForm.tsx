import { useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { TagInput } from '@shared/components/TagInput';
import { CLOCK_SEGMENTS } from '../types';
import type { ClockSegments } from '../types';

const clockFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  segments: z.coerce
    .number()
    .refine(
      (value): value is ClockSegments => (CLOCK_SEGMENTS as readonly number[]).includes(value),
      {
        message: 'Niepoprawna liczba segmentów',
      },
    ),
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

  const segments = Number(watch('segments'));
  const { fields: tickFields, replace } = useFieldArray({
    control,
    name: 'tickLabels',
  });

  useEffect(() => {
    if (tickFields.length === segments) return;

    const current = tickFields.map((field) => ({ value: field.value ?? '' }));
    const next = Array.from({ length: segments }, (_, index) => current[index] ?? { value: '' });
    replace(next);
  }, [segments, tickFields, replace]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col gap-2">
          <label htmlFor="clock-name" className="text-surface-700 text-sm font-medium">
            Nazwa <span className="text-red-500">*</span>
          </label>
          <input
            id="clock-name"
            {...register('name')}
            className="app-input text-surface-800 focus:border-primary-500 rounded-[1.15rem] px-4 py-3 text-sm focus:outline-none"
            placeholder="Np. Latarnia zgaśnie po raz trzeci"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'clock-name-error' : undefined}
          />
          {errors.name && (
            <p id="clock-name-error" role="alert" className="text-danger-700 text-xs">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="clock-segments" className="text-surface-700 text-sm font-medium">
            Liczba segmentów
          </label>
          <select
            id="clock-segments"
            {...register('segments')}
            className="app-input text-surface-800 focus:border-primary-500 rounded-[1.15rem] px-4 py-3 text-sm focus:outline-none"
          >
            {CLOCK_SEGMENTS.map((segmentCount) => (
              <option key={segmentCount} value={segmentCount}>
                {segmentCount}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-surface-700 text-sm font-medium">Opis</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>

      {tickFields.length > 0 && (
        <div className="app-panel rounded-[1.35rem] p-4">
          <div className="mb-4">
            <h3 className="text-surface-800 text-sm font-semibold">Opisy tyknięć</h3>
            <p className="text-surface-500 mt-1 text-xs">Krótkie opisy kolejnych etapów presji.</p>
          </div>

          <div className="flex flex-col gap-3">
            {tickFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <span className="app-pill mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {index + 1}
                </span>
                <input
                  {...register(`tickLabels.${index}.value`)}
                  className="app-input text-surface-800 focus:border-primary-500 w-full rounded-[1.1rem] px-4 py-3 text-sm focus:outline-none"
                  placeholder={`Co dzieje się po tyknięciu ${index + 1}?`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-panel rounded-[1.35rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-surface-800 text-sm font-semibold">Status zegara</h3>
            <p className="text-surface-500 mt-1 text-xs">
              Określa, czy zegar ma dalej brać udział w presji.
            </p>
          </div>

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
                  className={`relative inline-flex h-6 w-11 rounded-full border border-transparent transition-colors ${
                    field.value ? 'bg-primary-600' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`mt-0.5 ml-0.5 inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                      field.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            />
            <span className="text-surface-700 text-sm font-medium">
              {watch('isActive') ? 'Aktywny' : 'Wstrzymany'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-surface-700 text-sm font-medium">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
