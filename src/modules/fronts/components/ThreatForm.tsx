import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Clock } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import { useCampaign } from '@shared/db/CampaignContext';
import { getActiveCatalogOptions, getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import {
  THREAT_DEATH_REASON_PRESETS,
  THREAT_STATUSES,
  THREAT_STATUS_LABELS,
  THREAT_TYPES,
  THREAT_TYPE_PRESETS,
  THREAT_COMPLETION_OUTCOMES,
  THREAT_COMPLETION_OUTCOME_LABELS,
  DEFAULT_RADAR_ARCHETYPE,
} from '../types';
import type { RadarArchetype, ThreatCompletionOutcome } from '../types';
import { getAllRadarArchetypes, getRadarArchetypeLabel } from '@modules/backstage/radarSettings';
import { CLOCK_SEGMENTS } from '@modules/clocks/types';
import type { ClockSegments } from '@modules/clocks/types';

const threatFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  threatType: z.string().min(1),
  radarArchetype: z.string().min(1).default(DEFAULT_RADAR_ARCHETYPE),
  status: z.enum(THREAT_STATUSES).default('active'),
  impulse: z.string().max(400),
  trigger: z.string().max(500).default(''),
  completionReason: z.string().max(1000).default(''),
  completionOutcome: z.enum(THREAT_COMPLETION_OUTCOMES).optional(),
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
  threatType: import('../types').ThreatType;
  radarArchetype: RadarArchetype;
  status: (typeof THREAT_STATUSES)[number];
  impulse: string;
  trigger: string;
  completionReason: string;
  completionOutcome?: ThreatCompletionOutcome;
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
  const { campaignId } = useCampaign();
  const [showClock, setShowClock] = useState(!!defaultValues?.clock);
  const allThreats = useEntitiesByType('threat');
  const forkThreatCandidates = allThreats.filter((threat) => threat.id !== currentThreatId);
  const radarArchetypes = getAllRadarArchetypes(campaignId);

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
      radarArchetype: defaultValues?.radarArchetype ?? DEFAULT_RADAR_ARCHETYPE,
      status: defaultValues?.status ?? 'active',
      impulse: defaultValues?.impulse ?? '',
      trigger: defaultValues?.trigger ?? '',
      completionReason: defaultValues?.completionReason ?? '',
      completionOutcome: defaultValues?.completionOutcome,
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
  const selectedThreatTypeValue = watch('threatType');
  const threatTypeOptionsBase = getActiveCatalogOptions(campaignId, 'threatType');
  const threatTypeOptions = threatTypeOptionsBase.some((x) => x.id === selectedThreatTypeValue)
    ? threatTypeOptionsBase
    : [
        ...threatTypeOptionsBase,
        {
          id: selectedThreatTypeValue,
          label: getCatalogLabelByValue('threatType', selectedThreatTypeValue, campaignId),
        },
      ];
  const selectedThreatType = selectedThreatTypeValue;
  const selectedStatus = watch('status');
  const selectedPreset =
    (THREAT_TYPES as readonly string[]).includes(selectedThreatType)
      ? THREAT_TYPE_PRESETS[selectedThreatType as keyof typeof THREAT_TYPE_PRESETS]
      : undefined;

  useEffect(() => {
    if (selectedStatus !== 'completed') return;
    const current = getValues('completionOutcome');
    if (current === undefined) {
      setValue('completionOutcome', 'resolved_early', { shouldDirty: false, shouldValidate: true });
    }
  }, [selectedStatus, getValues, setValue]);

  function applyThreatTypePreset() {
    const selected = getValues('threatType');
    if (!(THREAT_TYPES as readonly string[]).includes(selected)) return;
    const preset = THREAT_TYPE_PRESETS[selected as keyof typeof THREAT_TYPE_PRESETS];
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
      threatType: raw.threatType as import('../types').ThreatType,
      radarArchetype: (raw.radarArchetype || DEFAULT_RADAR_ARCHETYPE) as RadarArchetype,
      trigger: raw.trigger.trim(),
      completionReason: raw.completionReason.trim(),
      completionOutcome:
        raw.status === 'completed'
          ? raw.completionOutcome ?? 'resolved_early'
          : undefined,
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
            {threatTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
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
        <label htmlFor="threat-radar-archetype" className="text-sm font-medium text-surface-800">
          Archetyp radaru (Za kulisami)
        </label>
        <select
          id="threat-radar-archetype"
          {...register('radarArchetype')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          {radarArchetypes.map((a) => (
            <option key={a} value={a}>{getRadarArchetypeLabel(a, campaignId)}</option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-surface-600">
          Osobno od rodzaju PBTA: steruje wagami podpowiedzi radaru. Obecność na stole liczy też wątki i wskazówki
          powiązane z zagrożeniem; NPC — gdy ma relację „powiązany z” z tym zagrożeniem.
        </p>
      </div>

      {selectedStatus === 'completed' && (
        <div className="flex flex-col gap-2 rounded-[1.1rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.35)] p-3">
          <p className="text-surface-800 text-xs font-semibold tracking-wide uppercase">
            Sposób zakończenia
          </p>
          <p className="text-surface-600 text-xs leading-relaxed">
            <strong className="text-surface-800">Rozwiązane</strong> — bez domknięcia zegara.{' '}
            <strong className="text-surface-800">Ukończone</strong> — domknięcie ostatniego segmentu zegara.
          </p>
          <div className="flex flex-col gap-2">
            {THREAT_COMPLETION_OUTCOMES.map((outcome) => (
              <label
                key={outcome}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-[rgba(223,225,218,0.6)]"
              >
                <input
                  type="radio"
                  value={outcome}
                  className="mt-0.5"
                  {...register('completionOutcome')}
                />
                <span className="text-surface-800 text-sm">{THREAT_COMPLETION_OUTCOME_LABELS[outcome]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
          <label htmlFor="threat-completion-reason" className="text-sm font-medium text-surface-800">
            Powód wygaszenia / śmierci
          </label>
          <textarea
            id="threat-completion-reason"
            {...register('completionReason')}
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
              onClick={() => setValue('completionReason', preset, { shouldDirty: true, shouldValidate: true })}
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
