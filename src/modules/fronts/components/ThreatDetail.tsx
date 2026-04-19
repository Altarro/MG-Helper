import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, Link, useLocation } from 'react-router';
import { AlertTriangle, ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { useThreatById } from '../hooks/useThreatById';
import { ThreatForm } from './ThreatForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ClueSection } from '@shared/components/ClueSection';
import { DetailSection } from '@shared/components/DetailSection';
import { NotesList } from '@modules/notes/components/NotesList';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { TickProgress } from '@shared/components/TickProgress';
import {
  addEntity,
  addRelation,
  deleteEntity,
  updateEntity,
} from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { useThreatDetailPath } from '@shared/hooks/useThreatDetailPath';
import { isClock } from '@modules/clocks/types';
import { toast } from 'sonner';
import { THREAT_TYPE_LABELS } from '../types';
import { getThreatStatus } from '@shared/utils/entityData';
import type { ThreatFormValues } from './ThreatForm';

export function ThreatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { threat } = useThreatById(id);
  const { threat: forkSourceThreat } = useThreatById(threat?.data.forkThreatId);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const returnToSessionLive = (location.state as { returnToSessionLive?: string } | null)?.returnToSessionLive;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/threats';

  const forkSourcePath = useThreatDetailPath(forkSourceThreat?.id);

  const linkedClock = useLiveQuery(async () => {
    if (!id) return null;

    const rel = await db.relations
      .where('sourceId')
      .equals(id)
      .filter((relation) => relation.type === 'tracks')
      .first();

    if (!rel) return null;
    const entity = await db.entities.get(rel.targetId);
    return entity && isClock(entity) ? entity : null;
  }, [db, id]);

  const parentFront = useRelatedEntities(id, {
    relationTypes: ['belongs_to'],
    direction: 'outgoing',
    otherTypes: ['front'],
  });
  const relatedThreads = useRelatedEntities(id, {
    relationTypes: ['affects'],
    direction: 'both',
    otherTypes: ['thread'],
  });

  if (threat === undefined) return <LoadingSpinner />;

  if (!threat || !id) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Zagrozenie nie znalezione.</p>
        <Link to="/threats" className="text-primary-600 hover:underline">
          ← Powrot do zagrozen
        </Link>
      </div>
    );
  }

  const currentThreat = threat;
  const threatId = id;
  const threatStatus = getThreatStatus(currentThreat);

  async function handleUpdate(values: ThreatFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, threatId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...currentThreat.data,
          threatType: values.threatType,
          impulse: values.impulse,
          moves: values.moves,
          trigger: values.trigger,
          status: values.status,
          reasonOfDead: values.reasonOfDead,
          forkThreatId: values.forkThreatId,
        },
      });

      if (values.clock && !linkedClock) {
        const clockEntity = await addEntity(db, {
          type: 'clock',
          name: values.clock.name,
          description: '',
          tags: [],
          data: { segments: values.clock.segments, filled: 0, tickLabels: [], isActive: true },
        });
        await addRelation(db, { type: 'tracks', sourceId: threatId, targetId: clockEntity.id });
      }

      toast.success('Zagrozenie zaktualizowane');
      setIsEditing(false);
    } catch {
      toast.error('Nie udalo sie zapisac zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      if (linkedClock) {
        await deleteEntity(db, linkedClock.id);
      }

      await deleteEntity(db, threatId);
      toast.success(`Zagrozenie "${currentThreat.name}" usuniete`);
      navigate(backPath);
    } catch {
      toast.error('Nie udalo sie usunac zagrozenia');
    }
  }

  async function handleTickLinkedClock() {
    if (!linkedClock) return;
    const data = linkedClock.data;
    if (data.filled >= data.segments) return;
    const nextFilled = data.filled + 1;
    try {
      await updateEntity(db, linkedClock.id, {
        data: {
          ...data,
          filled: nextFilled,
        },
      });
      if (nextFilled >= data.segments) {
        toast.success(`Zegar „${linkedClock.name}” wypełniony!`);
      }
    } catch {
      toast.error('Nie udało się odnotować kolejnego tyknięcia');
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <Link
        to={backPath}
        className="flex w-fit items-center gap-2 text-sm text-surface-500 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'Zagrozenia'}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{currentThreat.name}</h1>
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {THREAT_TYPE_LABELS[currentThreat.data.threatType]}
            </span>
            <span className={`ml-2 mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              threatStatus === 'completed' ? 'bg-surface-200 text-surface-700' : 'bg-green-100 text-green-700'
            }`}>
              {threatStatus === 'completed' ? 'Zakończone' : 'Aktywne'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <Edit2 className="h-3.5 w-3.5" /> {isEditing ? 'Anuluj' : 'Edytuj'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usun
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <ThreatForm
            defaultValues={{
                name: currentThreat.name,
                threatType: currentThreat.data.threatType,
                status: getThreatStatus(currentThreat),
                impulse: currentThreat.data.impulse,
                trigger: currentThreat.data.trigger ?? '',
                reasonOfDead: currentThreat.data.reasonOfDead ?? '',
                forkThreatId: currentThreat.data.forkThreatId,
                moves: currentThreat.data.moves,
                description: currentThreat.description,
                tags: currentThreat.tags,
                clock: linkedClock
                  ? { name: linkedClock.name, segments: linkedClock.data.segments }
                  : null,
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
            currentThreatId={currentThreat.id}
          />
        </div>
      ) : (
        <>
          <DetailSection
            title="Kontekst zagrozenia"
            description="Glowne informacje o presji fabularnej i jej miejscu w kampanii."
            tone="accent"
          >
          {currentThreat.data.impulse && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Impuls</h2>
              <p className="text-sm italic text-surface-800">{currentThreat.data.impulse}</p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-surface-200 bg-white p-5">
              <NarrativeLinksSection
                title="Front nadrzedny"
                items={parentFront}
                emptyMessage="To zagrozenie nie jest jeszcze podpiete do zadnego frontu."
              />
            </div>

            <div className="rounded-xl border border-surface-200 bg-white p-5">
              <NarrativeLinksSection
                title="Powiazane watki"
                items={relatedThreads}
                emptyMessage="To zagrozenie nie ma jeszcze podpietych watkow przez relacje affects."
                actionLabel="+ Dodaj watek"
                onAction={() => setShowThreadPicker(true)}
              />
            </div>
          </div>
          </DetailSection>

          {(currentThreat.data.trigger || forkSourceThreat || currentThreat.data.reasonOfDead) && (
            <DetailSection
              title="Historia i tykanie"
              description="Trigger, pochodzenie i stan wygaszenia zagrozenia."
            >
              <div className="grid gap-4 lg:grid-cols-2">
              {currentThreat.data.trigger && (
                <div className="rounded-xl border border-surface-200 bg-white p-5">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Trigger tykania
                  </h2>
                  <p className="text-sm whitespace-pre-wrap text-surface-700">{currentThreat.data.trigger}</p>
                </div>
              )}

              {forkSourceThreat && (
                <div className="rounded-xl border border-surface-200 bg-white p-5">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Powstalo z zagrozenia
                  </h2>
                  {forkSourcePath ? (
                    <Link to={forkSourcePath} className="text-sm font-medium text-primary-600 hover:underline">
                      {forkSourceThreat.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-surface-700">{forkSourceThreat.name}</p>
                  )}
                </div>
              )}

              {currentThreat.data.reasonOfDead && (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-5 lg:col-span-2">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
                    Powod wygaszenia / smierci
                  </h2>
                  <p className="text-sm whitespace-pre-wrap text-surface-700">{currentThreat.data.reasonOfDead}</p>
                </div>
              )}
              </div>
            </DetailSection>
          )}

          {currentThreat.data.moves.length > 0 && (
            <DetailSection
              title="Ruchy zagrozenia"
              description="Lista ruchow, po ktorych MG moze siegac podczas eskalacji."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
                Ruchy zagrozenia
              </h2>
              <ul className="list-disc list-inside space-y-1.5">
                {currentThreat.data.moves.map((move, index) => (
                  <li key={index} className="text-sm text-surface-700">
                    {move}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {linkedClock && (
            <DetailSection
              title="Zegar presji"
              description="Operacyjny licznik eskalacji przypiety do tego zagrozenia."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
                Powiazany zegar
              </h2>
              <Link
                to={`/clocks/${linkedClock.id}`}
                className="flex items-center gap-4 rounded-lg border border-transparent p-2 -m-2 transition-colors hover:border-primary-200 hover:bg-primary-50"
              >
                <ClockWidget clock={linkedClock} size={56} showLabel />
                <div className="min-w-0">
                  <p className="font-medium text-surface-900">{linkedClock.name}</p>
                  <p className="text-sm text-surface-500">
                    {linkedClock.data.filled}/{linkedClock.data.segments} segmentow
                  </p>
                </div>
              </Link>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleTickLinkedClock()}
                  disabled={linkedClock.data.filled >= linkedClock.data.segments}
                  className="rounded-md border border-primary-200 bg-white px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                >
                  +1 tick
                </button>
              </div>

              {linkedClock.data.tickLabels && linkedClock.data.tickLabels.length > 0 && (
                <div className="mt-4">
                  <TickProgress
                    tickLabels={linkedClock.data.tickLabels}
                    filled={linkedClock.data.filled}
                    segments={linkedClock.data.segments}
                  />
                </div>
              )}
            </DetailSection>
          )}

          {currentThreat.description && (
            <DetailSection
              title="Opis"
              description="Pelny opis zagrozenia i jego roli w kampanii."
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
              <div
                className="prose prose-sm max-w-none text-surface-700"
                dangerouslySetInnerHTML={{ __html: currentThreat.description }}
              />
            </DetailSection>
          )}

          {currentThreat.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentThreat.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <DetailSection
            title="Wskazowki zagrozenia"
            description="Tropy prowadzace bezposrednio do tego zagrozenia."
          >
            <ClueSection parentId={threatId} title="Wskazowki" />
          </DetailSection>

          <DetailSection
            title="Powiazania swiata"
            description="Relacje dodatkowe poza glownym kontraktem zagrozenia."
            action={(
              <button
                type="button"
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + Dodaj
              </button>
            )}
          >
            <RelationList
              entityId={currentThreat.id}
              excludeRelationTypes={['belongs_to', 'affects', 'tracks', 'clues_for']}
              emptyMessage="Brak dodatkowych relacji swiata dla tego zagrozenia."
            />
          </DetailSection>

          <DetailSection
            title="Notatki MG"
            description="Zaplecze robocze dla prowadzacego poza glowna presja i jej tropami."
          >
            <NotesList
              entityId={currentThreat.id}
              showTitle={false}
              emptyMessage="Brak notatek podpietych do tego zagrozenia."
            />
          </DetailSection>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usun zagrozenie"
        description={`Czy na pewno chcesz usunac zagrozenie "${currentThreat.name}"? Tej operacji nie mozna cofnac.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {showThreadPicker && (
        <RelationPicker
          sourceId={currentThreat.id}
          sourceType="threat"
          initialTargetType="thread"
          initialRelationType="affects"
          lockTargetType
          lockRelationType
          onClose={() => setShowThreadPicker(false)}
        />
      )}

      {showRelPicker && (
        <RelationPicker
          sourceId={currentThreat.id}
          sourceType="threat"
          onClose={() => setShowRelPicker(false)}
        />
      )}
    </div>
  );
}
