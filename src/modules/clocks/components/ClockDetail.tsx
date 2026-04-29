import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Clock3, Minus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { withClockAdvanceMeta } from '../clockAdvance';
import { useClockById } from '../hooks/useClockById';
import { ClockVisual } from './ClockVisual';
import { buildMultilineFromRows } from '../buildMultiline';
import { ClockForm, type ClockFormValues } from './ClockForm';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingPage } from '@shared/components/LoadingSpinner';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { isThreat } from '@modules/fronts/types';
import { formatDate } from '@shared/utils/date';
import { getClockData, getThreatData } from '@shared/utils/entityData';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { Entity } from '@shared/types/entity';

function parseMultilineToFormRows(text?: string): { value: string }[] {
  if (text == null || text === '') return [];
  return text.split(/\r?\n/).map((line) => ({ value: line }));
}

export function ClockDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { clock } = useClockById(id);

  const trackingThreat = useLiveQuery(async () => {
    if (!id) return null;
    const entity = await db.entities.get(id);
    if (!entity || entity.type !== 'clock') return null;
    const kd = getClockData(entity);
    if (kd.kind !== 'threat') return null;
    const rel = await db.relations
      .where('targetId')
      .equals(id)
      .filter((r) => r.type === 'tracks')
      .first();
    if (!rel) return null;
    const src = await db.entities.get(rel.sourceId);
    return src && isThreat(src) ? src : null;
  }, [db, id]);

  const threatDetailPath = useThreatDetailPath(trackingThreat?.id);

  const threatTriggerDisplayLines = useMemo(() => {
    if (!trackingThreat) return [];
    return (trackingThreat.data.trigger ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [trackingThreat]);

  const freeClockTickDisplayLines = useMemo(() => {
    return (clock?.data.tickWhen ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [clock?.data.tickWhen]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/clocks';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Zegary';

  const clockTocItems = useMemo(() => {
    if (!clock || isEditing) return [];
    const kind = getClockData(clock).kind ?? 'free';
    const labels = clock.data.tickLabels ?? [];
    const items: { id: string; label: string }[] = [
      { id: 'clock-detail-sterowanie', label: 'Sterowanie' },
    ];
    if (kind !== 'session') {
      if (kind === 'free' || (kind === 'threat' && trackingThreat)) {
        items.push({ id: 'clock-detail-warunki', label: 'Zegar tyka, gdy' });
      }
      if (labels.length > 0) {
        items.push({ id: 'clock-detail-tyki', label: 'Tyknięcia' });
      }
    }
    items.push({ id: 'clock-detail-relacje', label: 'Relacje' });
    return items;
  }, [clock, isEditing, trackingThreat]);

  if (!id) return null;
  if (clock === undefined) return <LoadingPage />;

  if (!clock) {
    return (
      <DetailNotFound
        icon={Clock3}
        title="Zegar nie znaleziony"
        description="Mógł zostać usunięty albo odnośnik jest nieaktualny."
        to={backPath}
        linkLabel={returnToSessionLive ? 'Wróć do sesji na żywo' : 'Wróć do listy zegarów'}
      />
    );
  }

  const currentClock = clock;
  const clockKindResolved = getClockData(currentClock).kind ?? 'free';
  const segments = currentClock.data.segments;
  const filled = currentClock.data.filled;
  const tickLabels = currentClock.data.tickLabels ?? [];
  const isActive = currentClock.data.isActive !== false;
  const isCompleted = filled >= segments;

  async function handleTick(newFilled: number) {
    try {
      const clampedFilled = Math.max(0, Math.min(newFilled, segments));
      await updateEntity(db, currentClock.id, {
        data: withClockAdvanceMeta(currentClock.data, clampedFilled) as unknown as Record<string, unknown>,
      });

      if (clampedFilled >= segments && filled < segments) {
        toast.success('Zegar został domknięty');
      } else {
        toast.success('Zegar zaktualizowany');
      }
    } catch {
      toast.error('Nie udało się zaktualizować zegara');
    }
  }

  async function handleReset() {
    try {
      await updateEntity(db, currentClock.id, {
        data: { ...currentClock.data, filled: 0 },
      });
      toast.success('Zegar został zresetowany');
    } catch {
      toast.error('Nie udało się zresetować zegara');
    }
  }

  async function handleToggleActive() {
    try {
      await updateEntity(db, currentClock.id, {
        data: { ...currentClock.data, isActive: !isActive },
      });
      toast.success(isActive ? 'Zegar został wstrzymany' : 'Zegar znów jest aktywny');
    } catch {
      toast.error('Nie udało się zmienić statusu zegara');
    }
  }

  async function handleEdit(values: ClockFormValues) {
    const kind = getClockData(currentClock).kind ?? 'free';

    if (trackingThreat) {
      const triggerStr = buildMultilineFromRows(values.threatTriggerWhen);
      if (triggerStr.length > 500) {
        toast.error('Łączna długość warunków nie może przekraczać 500 znaków.');
        return;
      }
    }

    if (!trackingThreat && kind === 'free') {
      const tickWhenStr = buildMultilineFromRows(values.clockTickWhen);
      if (tickWhenStr.length > 500) {
        toast.error('Łączna długość warunków nie może przekraczać 500 znaków.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const tickLabelsNext =
        kind === 'session'
          ? (currentClock.data.tickLabels ?? [])
          : values.tickLabels.map((item) => item.value);

      let nextClockData = {
        ...currentClock.data,
        segments: values.segments,
        filled: Math.min(currentClock.data.filled, values.segments),
        tickLabels: tickLabelsNext,
        isActive: values.isActive,
      };

      if (trackingThreat) {
        nextClockData = { ...nextClockData, tickWhen: undefined };
      } else if (kind === 'free') {
        const tickWhenStr = buildMultilineFromRows(values.clockTickWhen);
        nextClockData = { ...nextClockData, tickWhen: tickWhenStr || undefined };
      }

      await updateEntity(db, currentClock.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: nextClockData,
      });
      if (trackingThreat) {
        const triggerStr = buildMultilineFromRows(values.threatTriggerWhen);
        await updateEntity(db, trackingThreat.id, {
          data: { ...getThreatData(trackingThreat), trigger: triggerStr },
        });
      }
      toast.success('Zegar zaktualizowany');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, currentClock.id);
      toast.success(`Zegar „${currentClock.name}” został usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć zegara');
    }
  }

  function handleNavigateToEntity(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (!detailPath) return;

    navigate(detailPath, {
      state: returnToSessionLive ? { returnToSessionLive } : undefined,
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div className="text-primary-800 rounded-[1.25rem] border border-[rgba(33,71,102,0.14)] bg-[rgba(111,146,164,0.14)] p-3 shadow-[0_14px_28px_rgba(18,45,66,0.12)]">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
              {currentClock.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="app-pill rounded-full px-3 py-1 text-xs font-semibold">
                {filled}/{segments} segmentów
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isActive
                    ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                    : 'app-pill-muted'
                }`}
              >
                {isActive ? 'Aktywny' : 'Wstrzymany'}
              </span>
              {isCompleted && (
                <span className="app-danger-pill rounded-full px-3 py-1 text-xs font-semibold">
                  Domknięty
                </span>
              )}
            </div>
            <p className="text-surface-500 mt-3 text-xs">
              Utworzony {formatDate(currentClock.createdAt)} · Edytowany{' '}
              {formatDate(currentClock.updatedAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <MarkdownExportButton entity={currentClock} />
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edytuj
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <ClockForm
            clockKind={clockKindResolved}
            defaultValues={{
              name: currentClock.name,
              segments: currentClock.data.segments,
              description: currentClock.description ?? '',
              tags: currentClock.tags,
              tickLabels: tickLabels.map((value) => ({ value })),
              isActive,
              threatTriggerWhen: trackingThreat
                ? parseMultilineToFormRows(trackingThreat.data.trigger)
                : [],
              clockTickWhen: parseMultilineToFormRows(currentClock.data.tickWhen),
            }}
            linkedThreatId={trackingThreat?.id}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
            submitLabel="Zapisz zmiany"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <DetailTocBar ariaLabel="Sekcje karty zegara" items={clockTocItems} />
          <DetailSection
            sectionId="clock-detail-sterowanie"
            title="Sterowanie"
            description="Najważniejsze informacje o stanie zegara i szybkie akcje do pracy przy stole."
            tone="accent"
            contentClassName="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-center"
          >
            <div className="app-panel rounded-[1.55rem] px-5 py-6 text-center shadow-[0_14px_28px_rgba(18,45,66,0.08)]">
              <ClockVisual
                segments={segments}
                filled={filled}
                size={200}
                onTick={isActive ? handleTick : undefined}
                className="mx-auto"
              />
              <p className="text-surface-600 mt-5 text-sm">
                <span className="text-primary-800 text-3xl font-semibold tracking-[-0.04em]">
                  {filled}
                </span>
                <span className="text-surface-400 mx-1">/</span>
                <span className="font-semibold">{segments}</span>
                <span className="ml-1">segmentów</span>
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  disabled={!isActive || filled <= 0}
                  onClick={() => void handleTick(filled - 1)}
                  className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                  -1 tick
                </button>
                <button
                  type="button"
                  disabled={!isActive || filled >= segments}
                  onClick={() => void handleTick(filled + 1)}
                  className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  +1 tick
                </button>
                <button
                  type="button"
                  disabled={filled === 0}
                  onClick={() => void handleReset()}
                  className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleActive()}
                  className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                >
                  {isActive ? 'Wstrzymaj' : 'Wznów'}
                </button>
              </div>

              <div className="app-panel rounded-[1.35rem] p-4">
                <h3 className="text-surface-800 text-sm font-semibold">Jak z nim pracować</h3>
                <p className="text-surface-700 mt-2 text-sm leading-7">
                  Kliknij bezpośrednio w tarczę albo użyj przycisków sterowania, by szybko przesuwać
                  presję podczas sesji.
                </p>
              </div>

              {currentClock.description && (
                <div className="app-panel rounded-[1.35rem] p-4">
                  <h3 className="text-surface-500 mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
                    Opis
                  </h3>
                  <div
                    className="prose prose-sm text-surface-700 max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentClock.description }}
                  />
                </div>
              )}

              {currentClock.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentClock.tags.map((tag) => (
                    <span
                      key={tag}
                      className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DetailSection>

          {trackingThreat && getClockData(currentClock).kind === 'threat' && (
            <DetailSection
              sectionId="clock-detail-warunki"
              title="Zegar tyka, gdy"
              contentClassName="flex flex-col gap-3"
              action={
                <Link
                  to={threatDetailPath ?? `/threats/${trackingThreat.id}`}
                  className="app-pill-muted inline-flex max-w-[20rem] items-center truncate rounded-full px-3 py-1.5 text-xs font-semibold text-primary-800 transition-colors hover:underline"
                  title={trackingThreat.name}
                >
                  {trackingThreat.name}
                </Link>
              }
            >
              {threatTriggerDisplayLines.length === 0 ? (
                <p className="text-surface-500 text-sm">Brak zapisanych warunków tykania.</p>
              ) : (
                <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
                  <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
                    {threatTriggerDisplayLines.map((line, index) => (
                      <li
                        key={`clock-trigger-ro-${index}`}
                        className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
                      >
                        <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                          {index + 1}
                        </span>
                        <p className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">{line}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailSection>
          )}

          {clockKindResolved === 'free' && (
            <DetailSection
              sectionId="clock-detail-warunki"
              title="Zegar tyka, gdy"
              contentClassName="flex flex-col gap-3"
            >
              {freeClockTickDisplayLines.length === 0 ? (
                <p className="text-surface-500 text-sm">Brak zapisanych warunków tykania.</p>
              ) : (
                <div className="app-panel rounded-[1.5rem] p-5 shadow-[0_12px_24px_rgba(18,45,66,0.06)] lg:p-6">
                  <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-2">
                    {freeClockTickDisplayLines.map((line, index) => (
                      <li
                        key={`clock-free-tick-when-${index}`}
                        className="app-input-shell flex min-h-full min-w-0 gap-3 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.04)]"
                      >
                        <span className="app-pill-muted inline-flex h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                          {index + 1}
                        </span>
                        <p className="text-surface-800 min-w-0 flex-1 text-sm leading-6 break-words">{line}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailSection>
          )}

          {clockKindResolved !== 'session' && tickLabels.length > 0 && (
            <DetailSection
              sectionId="clock-detail-tyki"
              title="Opisy tyknięć"
              description="Kolejne etapy zegara, które pomagają czytać tempo eskalacji."
              contentClassName="grid gap-3"
            >
              {tickLabels.map((label, index) => {
                const isCurrent = index === filled - 1;
                const isPast = index < filled - 1;

                return (
                  <div
                    key={`${currentClock.id}-tick-${index}`}
                    className={`rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_24px_rgba(18,45,66,0.06)] ${
                      isCurrent
                        ? 'border-primary-300/70 bg-[rgba(186,207,214,0.32)]'
                        : isPast
                          ? 'border-emerald-300/50 bg-[rgba(209,229,218,0.52)]'
                          : 'app-input-shell'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isCurrent
                            ? 'app-pill'
                            : isPast
                              ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
                              : 'app-pill-muted'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-surface-800 text-sm leading-6">
                          {label || 'Brak opisu dla tego etapu.'}
                        </p>
                        <p className="text-surface-500 mt-1 text-xs">
                          {isCurrent
                            ? 'Aktualnie aktywny etap.'
                            : isPast
                              ? 'Ten etap został już osiągnięty.'
                              : 'Etap jeszcze przed Wami.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </DetailSection>
          )}

          <DetailSection
            sectionId="clock-detail-relacje"
            title="Relacje"
            description="Powiązania tego zegara z innymi elementami kampanii."
            action={
              <button
                type="button"
                onClick={() => setShowRelationPicker(true)}
                className="app-button-secondary inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj relację
              </button>
            }
          >
            <RelationList entityId={currentClock.id} onNavigate={handleNavigateToEntity} />
          </DetailSection>

          <DetailScrollTopFab enabled={clockTocItems.length > 0} />
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Usuń zegar"
        description={`Czy na pewno chcesz usunąć zegar „${currentClock.name}”?`}
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showRelationPicker && (
        <RelationPicker
          sourceId={currentClock.id}
          sourceType="clock"
          onClose={() => setShowRelationPicker(false)}
        />
      )}
    </div>
  );
}
