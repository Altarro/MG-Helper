import { useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { TagInput } from '@shared/components/TagInput';
import { buildMultilineFromRows } from '../buildMultiline';
import { CLOCK_SEGMENTS } from '../types';
import type { ClockKind, ClockSegments } from '../types';

const clockFormSchema = z
  .object({
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
    /** Warunki tykania zapisywane na powiązanym zagrożeniu (relacja tracks) */
    threatTriggerWhen: z.array(z.object({ value: z.string().max(300) })).max(25).default([]),
    /** Warunki „Zegar tyka, gdy” zapisane na encji zegara (zegar wolny) */
    clockTickWhen: z.array(z.object({ value: z.string().max(300) })).max(25).default([]),
  })
  .superRefine((data, ctx) => {
    const threatJoined = buildMultilineFromRows(data.threatTriggerWhen);
    if (threatJoined.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Łączna długość warunków (po złączeniu wierszy) nie może przekraczać 500 znaków.',
        path: ['threatTriggerWhen'],
      });
    }
    const clockJoined = buildMultilineFromRows(data.clockTickWhen);
    if (clockJoined.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Łączna długość warunków (po złączeniu wierszy) nie może przekraczać 500 znaków.',
        path: ['clockTickWhen'],
      });
    }
  });

export type ClockFormValues = z.infer<typeof clockFormSchema>;

interface ClockFormProps {
  defaultValues?: Partial<ClockFormValues>;
  onSubmit: (values: ClockFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
  /** Gdy ustawione — pokazuj edycję „Zegar tyka, gdy” (zapis na zagrożeniu przy zapisie formularza) */
  linkedThreatId?: string;
  /** `session` — uproszczony formularz (bez opisów tyknięć i bez „Zegar tyka, gdy”). */
  clockKind?: ClockKind;
}

export function ClockForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
  linkedThreatId,
  clockKind = 'free',
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
      threatTriggerWhen: [],
      clockTickWhen: [],
      ...defaultValues,
    },
  });

  const segments = Number(watch('segments'));
  const { fields: tickFields, replace } = useFieldArray({
    control,
    name: 'tickLabels',
  });
  const {
    fields: threatTriggerFields,
    append: appendThreatTrigger,
    remove: removeThreatTrigger,
  } = useFieldArray({ control, name: 'threatTriggerWhen' });
  const {
    fields: clockTickWhenFields,
    append: appendClockTickWhen,
    remove: removeClockTickWhen,
  } = useFieldArray({ control, name: 'clockTickWhen' });

  const isSessionClock = clockKind === 'session';

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

      {!isSessionClock && tickFields.length > 0 && (
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

      {!isSessionClock && linkedThreatId && (
        <div className="app-panel rounded-[1.35rem] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-surface-800 text-sm font-semibold">Zegar tyka, gdy</h3>
              <p className="text-surface-500 mt-1 text-xs leading-relaxed">
                To samo pole co na karcie powiązanego zagrożenia — zapisuje się razem z zegarem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => appendThreatTrigger({ value: '' })}
              className="text-primary-700 hover:text-primary-800 flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Dodaj warunek
            </button>
          </div>
          {errors.threatTriggerWhen?.message && (
            <p role="alert" className="text-danger-700 mb-2 text-xs">
              {String(errors.threatTriggerWhen.message)}
            </p>
          )}
          {threatTriggerFields.length === 0 && (
            <p className="text-surface-500 mb-2 text-xs">Brak warunków — dodaj pierwszy wiersz.</p>
          )}
          <div className="flex flex-col gap-2">
            {threatTriggerFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...register(`threatTriggerWhen.${index}.value`)}
                  className="app-input text-surface-800 focus:border-primary-500 flex-1 rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder={`Warunek ${index + 1}…`}
                />
                <button
                  type="button"
                  onClick={() => removeThreatTrigger(index)}
                  aria-label="Usuń warunek tykania"
                  className="app-button-secondary rounded-2xl p-2.5 text-surface-600 transition-colors hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSessionClock && !linkedThreatId && clockKind === 'free' && (
        <div className="app-panel rounded-[1.35rem] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-surface-800 text-sm font-semibold">Zegar tyka, gdy</h3>
              <p className="text-surface-500 mt-1 text-xs leading-relaxed">
                Zapisane na tej encji zegara — jeden warunek na wiersz.
              </p>
            </div>
            <button
              type="button"
              onClick={() => appendClockTickWhen({ value: '' })}
              className="text-primary-700 hover:text-primary-800 flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Dodaj warunek
            </button>
          </div>
          {errors.clockTickWhen?.message && (
            <p role="alert" className="text-danger-700 mb-2 text-xs">
              {String(errors.clockTickWhen.message)}
            </p>
          )}
          {clockTickWhenFields.length === 0 && (
            <p className="text-surface-500 mb-2 text-xs">Brak warunków — dodaj pierwszy wiersz.</p>
          )}
          <div className="flex flex-col gap-2">
            {clockTickWhenFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...register(`clockTickWhen.${index}.value`)}
                  className="app-input text-surface-800 focus:border-primary-500 flex-1 rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder={`Warunek ${index + 1}…`}
                />
                <button
                  type="button"
                  onClick={() => removeClockTickWhen(index)}
                  aria-label="Usuń warunek tykania"
                  className="app-button-secondary rounded-2xl p-2.5 text-surface-600 transition-colors hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
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
