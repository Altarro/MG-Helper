import { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Clock } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import {
  THREAT_DEATH_REASON_PRESETS,
  THREAT_STATUSES,
  THREAT_STATUS_LABELS,
  THREAT_TYPES,
  THREAT_TYPE_LABELS,
  THREAT_TYPE_PRESETS,
} from '../types';
import { CLOCK_SEGMENTS } from '@modules/clocks/types';
import type { ClockSegments } from '@modules/clocks/types';

const threatFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  threatType: z.enum(THREAT_TYPES),
  status: z.enum(THREAT_STATUSES).default('active'),
  impulse: z.string().max(400),
  trigger: z.string().max(500).default(''),
  reasonOfDead: z.string().max(1000).default(''),
  inheritanceNotes: z.string().max(4000).default(''),
  forkThreatId: z.string().default(''),
  moves: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
  clockName: z.string().max(200).default(''),
  clockSegments: z.coerce.number().refine(
    (v): v is ClockSegments => (CLOCK_SEGMENTS as readonly number[]).includes(v),
  ).default(6),
});

type ThreatFormRaw = z.infer<typeof threatFormSchema>;

export interface ThreatFormValues {
  name: string;
  threatType: (typeof THREAT_TYPES)[number];
  status: (typeof THREAT_STATUSES)[number];
  impulse: string;
  trigger: string;
  reasonOfDead: string;
  inheritanceNotes: string;
  forkThreatId?: string;
  moves: string[];
  description: string;
  tags: string[];
  clock?: { name: string; segments: ClockSegments } | null;
}

interface ThreatFormProps {
  defaultValues?: Partial<ThreatFormValues>;
  onSubmit: (values: ThreatFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
  currentThreatId?: string;
}

export function ThreatForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
  currentThreatId,
}: ThreatFormProps) {
  const [showClock, setShowClock] = useState(!!defaultValues?.clock);
  const allThreats = useEntitiesByType('threat');
  const forkThreatCandidates = allThreats.filter((threat) => threat.id !== currentThreatId);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ThreatFormRaw>({
    resolver: zodResolver(threatFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      threatType: defaultValues?.threatType ?? 'ambitious_organization',
      status: defaultValues?.status ?? 'active',
      impulse: defaultValues?.impulse ?? '',
      trigger: defaultValues?.trigger ?? '',
      reasonOfDead: defaultValues?.reasonOfDead ?? '',
      inheritanceNotes: defaultValues?.inheritanceNotes ?? '',
      forkThreatId: defaultValues?.forkThreatId ?? '',
      moves: (defaultValues?.moves ?? []).map((v) => ({ value: v })),
      description: defaultValues?.description ?? '',
      tags: defaultValues?.tags ?? [],
      clockName: defaultValues?.clock?.name ?? '',
      clockSegments: defaultValues?.clock?.segments ?? 6,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'moves' });
  const selectedThreatType = watch('threatType');
  const selectedPreset = THREAT_TYPE_PRESETS[selectedThreatType];

  function applyThreatTypePreset() {
    const preset = THREAT_TYPE_PRESETS[getValues('threatType')];
    if (!preset) return;

    if (!getValues('impulse').trim()) {
      setValue('impulse', preset.impulse, { shouldDirty: true, shouldValidate: true });
    }

    if (!getValues('trigger').trim()) {
      setValue('trigger', preset.trigger, { shouldDirty: true, shouldValidate: true });
    }

    const hasAnyMove = getValues('moves').some((move) => move.value.trim().length > 0);
    if (!hasAnyMove) {
      replace(preset.moves.map((value) => ({ value })));
    }
  }

  function handleValidSubmit(raw: ThreatFormRaw) {
    return onSubmit({
      ...raw,
      trigger: raw.trigger.trim(),
      reasonOfDead: raw.reasonOfDead.trim(),
      inheritanceNotes: raw.inheritanceNotes.trim(),
      forkThreatId: raw.forkThreatId || undefined,
      moves: raw.moves.map((m) => m.value).filter(Boolean),
      clock: showClock && raw.clockName.trim()
        ? { name: raw.clockName.trim(), segments: raw.clockSegments }
        : null,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="threat-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="threat-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Nazwa zagrożenia..."
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="threat-type" className="text-sm font-medium text-surface-800">
            Rodzaj zagrożenia
          </label>
          <select
            id="threat-type"
            {...register('threatType')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {THREAT_TYPES.map((t) => (
              <option key={t} value={t}>{THREAT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs leading-6 text-surface-600">
              Szybki start: uzupełnij puste pola propozycją dla wybranego rodzaju.
            </p>
            <button
              type="button"
              onClick={applyThreatTypePreset}
              disabled={!selectedPreset}
              className="app-pill-muted shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
            >
              Wstaw szablon
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="threat-status" className="text-sm font-medium text-surface-800">
            Status
          </label>
          <select
            id="threat-status"
            {...register('status')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {THREAT_STATUSES.map((status) => (
              <option key={status} value={status}>{THREAT_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="threat-impulse" className="text-sm font-medium text-surface-800">
          Impuls
        </label>
        <input
          id="threat-impulse"
          {...register('impulse')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Czego to zagrożenie desperacko pragnie..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="threat-trigger" className="text-sm font-medium text-surface-800">
          Trigger tykania
        </label>
        <textarea
          id="threat-trigger"
          {...register('trigger')}
          rows={3}
          className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Kiedy to zagrożenie tyka albo eskaluje?"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="threat-fork-source" className="text-sm font-medium text-surface-800">
          Powstało z innego zagrożenia
        </label>
        <select
          id="threat-fork-source"
          {...register('forkThreatId')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Brak</option>
          {forkThreatCandidates.map((threat) => (
            <option key={threat.id} value={threat.id}>{threat.name}</option>
          ))}
        </select>
        <p className="text-xs leading-6 text-surface-600">
          Przydatne, gdy nowe zagrożenie wyrasta z poprzedniego albo jest jego odgałęzieniem.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="threat-reason-of-dead" className="text-sm font-medium text-surface-800">
            Powód wygaszenia / śmierci
          </label>
          <textarea
            id="threat-reason-of-dead"
            {...register('reasonOfDead')}
            rows={3}
            className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Opcjonalnie: co sprawiło, że to zagrożenie zniknęło albo utraciło znaczenie?"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {THREAT_DEATH_REASON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setValue('reasonOfDead', preset, { shouldDirty: true, shouldValidate: true })}
              className="app-pill-muted rounded-full px-3 py-1.5 text-xs transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="threat-inheritance-notes" className="text-sm font-medium text-surface-800">
          Dziedzictwo zagrożenia
        </label>
        <textarea
          id="threat-inheritance-notes"
          {...register('inheritanceNotes')}
          rows={4}
          className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Co to zagrożenie odziedziczyło po wcześniejszym? Jakie skutki, etapy lub konsekwencje przeszły dalej?"
        />
        <p className="text-xs leading-6 text-surface-600">
          To osobne pole na konsekwencje i ciąg dalszy po poprzednim zagrożeniu, niezależnie od zwykłego opisu.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-800">Ruchy zagrożenia</label>
          <button
            type="button"
            onClick={() => append({ value: '' })}
            className="flex items-center gap-1 text-xs font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj ruch
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-surface-500">Brak ruchów - dodaj, co zagrożenie może zrobić.</p>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`moves.${i}.value`)}
              className="app-input flex-1 rounded-2xl px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder={`Ruch ${i + 1}...`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Usuń ruch"
              className="app-button-secondary rounded-2xl p-2.5 text-surface-600 transition-colors hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="app-panel rounded-[1.45rem] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-surface-500" />
            <span className="text-sm font-medium text-surface-800">Powiązany zegar</span>
          </div>
          <button
            type="button"
            onClick={() => setShowClock((v) => !v)}
            className="text-xs font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            {showClock ? 'Usuń zegar' : '+ Dodaj zegar'}
          </button>
        </div>
        {showClock && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="threat-clock-name" className="text-xs font-medium text-surface-600">Nazwa zegara</label>
              <input
                id="threat-clock-name"
                {...register('clockName')}
                className="app-input rounded-2xl px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Np. Odliczanie do ataku..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="threat-clock-segments" className="text-xs font-medium text-surface-600">Segmenty</label>
              <select
                id="threat-clock-segments"
                {...register('clockSegments')}
                className="app-input rounded-2xl px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {CLOCK_SEGMENTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis / Notatki</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
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
