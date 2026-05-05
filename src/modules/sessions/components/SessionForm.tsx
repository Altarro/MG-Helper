import { useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { SESSION_PROGRESS_STATUSES } from '../types';

export const SCENE_MIN_MINUTES = 5;

function coerceSceneMinutes(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Maks. minut dla ostatniej sceny względem planu i sumy wcześniejszych scen; `null` = brak planu albo zostało mniej niż min. na scenę. */
function maxLastSceneEstimateMin(
  plannedDurationMin: number | undefined,
  scenes: { estimatedDurationMin?: unknown }[] | undefined,
  lastIndex: number,
): number | null {
  if (lastIndex < 0) return null;
  if (plannedDurationMin == null || !Number.isFinite(plannedDurationMin) || plannedDurationMin < 1) return null;
  let used = 0;
  for (let i = 0; i < lastIndex; i++) {
    used += coerceSceneMinutes(scenes?.[i]?.estimatedDurationMin);
  }
  const remaining = plannedDurationMin - used;
  if (remaining < SCENE_MIN_MINUTES) return null;
  return Math.min(24 * 60, remaining);
}

const sessionFormSchema = z
  .object({
    number: z.coerce.number().int().min(1, 'Numer sesji musi być ≥ 1'),
    date: z.string().min(1, 'Data jest wymagana'),
    name: z.string().max(200).default(''),
    sessionGoal: z.string().max(1000).default(''),
    progressStatus: z.enum(SESSION_PROGRESS_STATUSES).default('planned'),
    summary: z.string().max(2000).default(''),
    plannedDurationMin: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().int().min(1, 'Podaj min. 1 minutę').max(24 * 60, 'Maks. 1440 minut').optional(),
    ),
    scenes: z.array(
      z.object({
        name: z.string().min(1, 'Nazwa sceny jest wymagana').max(30, 'Maks. 30 znaków'),
        goal: z.string().max(1000).default(''),
        estimatedDurationMin: z.coerce
          .number()
          .int()
          .min(SCENE_MIN_MINUTES, `Min. ${SCENE_MIN_MINUTES} minut`)
          .max(24 * 60, 'Maks. 1440 minut'),
      }),
    ).max(50).default([]),
    description: z.string().max(100_000).default(''),
    tags: z.array(z.string()).max(50).default([]),
  })
  .superRefine((data, ctx) => {
    const p = data.plannedDurationMin;
    if (p == null || !Number.isFinite(p) || p < 1) return;
    let cum = 0;
    for (let i = 0; i < data.scenes.length; i++) {
      const scene = data.scenes[i];
      if (!scene) continue;
      cum += scene.estimatedDurationMin;
      if (cum > p) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Łączny czas scen przekracza plan sesji — wydłuż plan lub skróć sceny.',
          path: ['plannedDurationMin'],
        });
        return;
      }
    }
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionFormProps {
  defaultValues?: Partial<SessionFormValues>;
  onSubmit: (values: SessionFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function SessionForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: SessionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      number: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      sessionGoal: '',
      progressStatus: 'planned',
      summary: '',
      plannedDurationMin: undefined,
      scenes: [],
      description: '',
      tags: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'scenes',
  });
  const watchedScenes = useWatch({
    control,
    name: 'scenes',
  });
  const watchedPlannedMin = useWatch({
    control,
    name: 'plannedDurationMin',
  });

  /** Brak w planie miejsca na min. scenę — pola zablokowane (skróć wcześniejsze lub usuń tę scenę). */
  const sceneHardDisabledByPlan = useMemo(() => {
    const scenes = watchedScenes ?? [];
    const planned = watchedPlannedMin;
    if (planned == null || !Number.isFinite(planned) || planned < 1) {
      return scenes.map(() => false);
    }
    const d = scenes.map((s) => coerceSceneMinutes(s?.estimatedDurationMin));
    return scenes.map((_, i) => {
      const start = d.slice(0, i).reduce((a, b) => a + b, 0);
      const remaining = planned - start;
      return remaining < SCENE_MIN_MINUTES;
    });
  }, [watchedPlannedMin, watchedScenes]);

  /** Wpisany czas sceny przekracza pozostały plan — karta ostrzega, pola nadal edytowalne (można skrócić). */
  const sceneOverPlanDuration = useMemo(() => {
    const scenes = watchedScenes ?? [];
    const planned = watchedPlannedMin;
    if (planned == null || !Number.isFinite(planned) || planned < 1) {
      return scenes.map(() => false);
    }
    const d = scenes.map((s) => coerceSceneMinutes(s?.estimatedDurationMin));
    return scenes.map((_, i) => {
      const start = d.slice(0, i).reduce((a, b) => a + b, 0);
      const remaining = planned - start;
      if (remaining < SCENE_MIN_MINUTES) return false;
      return (d[i] ?? 0) > remaining;
    });
  }, [watchedPlannedMin, watchedScenes]);

  const spareMinutesForNewScene = useMemo(() => {
    const planned = watchedPlannedMin;
    if (planned == null || !Number.isFinite(planned) || planned < 1) return null;
    const used = (watchedScenes ?? []).reduce((acc, s) => acc + coerceSceneMinutes(s?.estimatedDurationMin), 0);
    return planned - used;
  }, [watchedPlannedMin, watchedScenes]);

  const canAppendScene = spareMinutesForNewScene === null || spareMinutesForNewScene >= SCENE_MIN_MINUTES;

  useEffect(() => {
    const n = fields.length;
    if (n === 0) return;
    const lastIdx = n - 1;
    const planned = getValues('plannedDurationMin');
    const scenes = getValues('scenes') ?? [];
    const max = maxLastSceneEstimateMin(planned, scenes, lastIdx);
    if (max === null) return;
    const cur = scenes[lastIdx]?.estimatedDurationMin;
    const curN = typeof cur === 'number' ? cur : Number(cur);
    if (Number.isFinite(curN) && Math.floor(curN) > max) {
      setValue(`scenes.${lastIdx}.estimatedDurationMin`, max, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedPlannedMin, watchedScenes, fields.length, getValues, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Number + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-number" className="text-sm font-medium text-surface-800">
            Nr sesji <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="session-number"
            type="number"
            min={1}
            {...register('number')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-invalid={errors.number ? 'true' : 'false'}
          />
          {errors.number && (
            <p role="alert" className="text-xs text-red-600">{errors.number.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-date" className="text-sm font-medium text-surface-800">
            Data <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="session-date"
            type="date"
            {...register('date')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-invalid={errors.date ? 'true' : 'false'}
          />
          {errors.date && (
            <p role="alert" className="text-xs text-red-600">{errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Optional name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-name" className="text-sm font-medium text-surface-800">Tytuł sesji (opcjonalny)</label>
        <input
          id="session-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder={'Np. \u201eUcieczka z Czerwonej Wie\u017cy\u201d...'}
        />
      </div>

      {/* Session goal */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-goal" className="text-sm font-medium text-surface-800">Cel sesji</label>
        <textarea
          id="session-goal"
          {...register('sessionGoal')}
          rows={2}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
          placeholder="Po co jest ta sesja i co ma domknąć?"
        />
      </div>

      {/* Session progress status */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-progress-status" className="text-sm font-medium text-surface-800">Status sesji</label>
        <select
          id="session-progress-status"
          {...register('progressStatus')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="planned">Zaplanowana</option>
          <option value="completed">Zakończona</option>
        </select>
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-summary" className="text-sm font-medium text-surface-800">
          Streszczenie po sesji
        </label>
        <textarea
          id="session-summary"
          {...register('summary')}
          rows={3}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
          placeholder="Uzupełnij po sesji (najczęściej podczas cleanup)."
        />
      </div>

      {/* Session planned duration */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-planned-duration" className="text-sm font-medium text-surface-800">
          Planowany czas sesji (min)
        </label>
        <input
          id="session-planned-duration"
          type="number"
          min={1}
          step={1}
          {...register('plannedDurationMin')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Np. 210"
        />
        {errors.plannedDurationMin && (
          <p role="alert" className="text-xs text-red-600">{errors.plannedDurationMin.message}</p>
        )}
      </div>

      {/* Scenes */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <label className="text-sm font-medium text-surface-800">Sceny</label>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button
              type="button"
              disabled={!canAppendScene}
              title={
                !canAppendScene && spareMinutesForNewScene !== null
                  ? `Sesja jest za krótka w planie — zostało ${spareMinutesForNewScene} min, a nowa scena wymaga min. ${SCENE_MIN_MINUTES} min.`
                  : undefined
              }
              onClick={() => append({ name: '', goal: '', estimatedDurationMin: 15 })}
              className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45"
            >
              Dodaj scenę
            </button>
            {!canAppendScene && spareMinutesForNewScene !== null ? (
              <p className="max-w-[220px] text-right text-[10px] leading-snug text-amber-800 sm:text-left">
                Sesja za krótka w planie — zostało {spareMinutesForNewScene} min (min. {SCENE_MIN_MINUTES} min na nową scenę).
              </p>
            ) : null}
          </div>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-surface-500">Brak scen. Dodaj je, jeśli chcesz planować przebieg sesji.</p>
        )}
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const hardOff = sceneHardDisabledByPlan[index] ?? false;
            const softWarn = sceneOverPlanDuration[index] ?? false;
            return (
            <div
              key={field.id}
              className={`rounded-2xl border p-3 ${
                hardOff ? 'border-amber-200/80 bg-surface-50/80' : softWarn ? 'border-amber-100 bg-amber-50/40' : 'border-surface-200'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">Scena {index + 1}</p>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 text-xs text-surface-500 hover:text-danger-700"
                >
                  Usuń
                </button>
              </div>
              {hardOff ? (
                <p className="mb-2 text-[11px] leading-snug text-amber-900">
                  Sesja jest za krótka w planie — przed tą sceną nie ma już {SCENE_MIN_MINUTES} min w planie. Skróć wcześniejsze sceny lub usuń tę (i kolejne).
                </p>
              ) : null}
              {!hardOff && softWarn ? (
                <p className="mb-2 text-[11px] leading-snug text-amber-900">
                  Ta scena trwa dłużej niż zostaje czasu do końca planu — skróć czas tej lub wcześniejszej sceny.
                </p>
              ) : null}
              <fieldset
                disabled={hardOff}
                className="min-w-0 border-0 p-0 m-0 disabled:pointer-events-none disabled:opacity-50"
              >
                <legend className="sr-only">Scena {index + 1}</legend>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-surface-700" htmlFor={`scene-name-${index}`}>Nazwa</label>
                      <span className="text-[10px] text-surface-500">
                        {(watchedScenes?.[index]?.name?.length ?? 0)}/30
                      </span>
                    </div>
                    <input
                      id={`scene-name-${index}`}
                      {...register(`scenes.${index}.name`)}
                      className="app-input rounded-xl px-3 py-2 text-sm"
                      maxLength={30}
                      placeholder="Np. Wejście do dzielnicy portowej"
                    />
                    {errors.scenes?.[index]?.name && (
                      <p role="alert" className="text-xs text-red-600">{errors.scenes[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-surface-700" htmlFor={`scene-time-${index}`}>Czas (min)</label>
                    <input
                      id={`scene-time-${index}`}
                      type="number"
                      min={SCENE_MIN_MINUTES}
                      step={1}
                      {...register(`scenes.${index}.estimatedDurationMin`, {
                        onBlur: (e) => {
                          if (index !== fields.length - 1 || fields.length === 0) return;
                          const planned = getValues('plannedDurationMin');
                          const max = maxLastSceneEstimateMin(planned, getValues('scenes'), index);
                          if (max === null) return;
                          const raw = e.target.value === '' ? NaN : Number(e.target.value);
                          if (!Number.isFinite(raw)) return;
                          const v = Math.floor(raw);
                          if (v > max) {
                            toast.error(
                              `Czas ostatniej sceny przekracza plan sesji — do końca zostało ${max} min. Ustawiono ${max} min.`,
                            );
                            setValue(`scenes.${index}.estimatedDurationMin`, max, { shouldValidate: true });
                          }
                        },
                      })}
                      className="app-input rounded-xl px-3 py-2 text-sm"
                    />
                    {errors.scenes?.[index]?.estimatedDurationMin && (
                      <p role="alert" className="text-xs text-red-600">{errors.scenes[index]?.estimatedDurationMin?.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-surface-700" htmlFor={`scene-goal-${index}`}>Cel (opcjonalnie)</label>
                  <textarea
                    id={`scene-goal-${index}`}
                    rows={2}
                    {...register(`scenes.${index}.goal`)}
                    className="app-input resize-y rounded-xl px-3 py-2 text-sm"
                    placeholder="Po co ta scena i co ma wnieść?"
                  />
                  {errors.scenes?.[index]?.goal && (
                    <p role="alert" className="text-xs text-red-600">{errors.scenes[index]?.goal?.message}</p>
                  )}
                </div>
              </fieldset>
            </div>
            );
          })}
        </div>
      </div>

      {/* Notes (Tiptap) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Notatki (szczegółowe)</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      {/* Actions */}
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
          {isSaving ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
