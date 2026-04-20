import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useClueById } from '../hooks/useClueById';
import { ClueForm } from './ClueForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { NarrativeLinksSection } from '@shared/components/NarrativeLinksSection';
import { DetailSection } from '@shared/components/DetailSection';
import { useRelatedEntities } from '@shared/hooks/useRelatedEntities';
import { NotesList } from '@modules/notes/components/NotesList';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import {
  CLUE_STRENGTH_LABELS,
  getClueStrengthLabel,
} from '@shared/domain/storyContracts';
import { CLUE_TYPE_LABELS } from '../types';
import type { ClueFormValues } from './ClueForm';

export function ClueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { clue } = useClueById(id);
  const clueTargets = useRelatedEntities(id, {
    relationTypes: ['clues_for'],
    direction: 'outgoing',
    otherTypes: ['thread', 'threat', 'front'],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [targetPickerType, setTargetPickerType] = useState<'thread' | 'threat' | 'front' | null>(null);
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/clues';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Wskazówki';

  if (clue === undefined) return <LoadingSpinner />;

  if (!clue) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Wskazówka nie istnieje.</p>
        <Link to="/clues" className="text-primary-600 hover:underline">
          ← Wróć do listy wskazówek
        </Link>
      </div>
    );
  }

  async function handleUpdate(values: ClueFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, clue!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          clueType: values.clueType,
          hint: values.hint,
          discovered: values.discovered,
        },
      });
      toast.success('Wskazówka zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const name = clue!.name;
    try {
      await deleteEntity(db, clue!.id);
      toast.success(`Wskazówka „${name}" usunięta`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć wskazówki');
    }
  }

  async function handleToggleDiscovered() {
    try {
      await updateEntity(db, clue!.id, {
        data: { ...clue!.data, discovered: !clue!.data.discovered },
      });
      toast.success(clue!.data.discovered ? 'Wskazówka ukryta' : 'Wskazówka odkryta przez graczy');
    } catch {
      toast.error('Nie udało się zaktualizować statusu');
    }
  }

  const resolvedClueTargets = clueTargets ?? [];
  const strongTargets = resolvedClueTargets.filter((item) => item.relation.meta?.clueStrength === 'strong');
  const standardTargets = resolvedClueTargets.filter((item) => item.relation.meta?.clueStrength === 'standard');
  const weakTargets = resolvedClueTargets.filter((item) => item.relation.meta?.clueStrength === 'weak');

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link to={backPath} className="flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 w-fit">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{clue.name}</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
              {CLUE_TYPE_LABELS[clue.data.clueType]}
            </span>
            {clue.data.discovered && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Odkryta
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <MarkdownExportButton entity={clue} />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <ClueForm
            defaultValues={{
              name: clue.name,
              description: clue.description,
              tags: clue.tags,
              clueType: clue.data.clueType,
              hint: clue.data.hint,
              discovered: clue.data.discovered,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSaving={saving}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <DetailSection
            title="Kontekst wskazówki"
            description="Status tropu, jego rdzeń i najkrótsza informacja, z której korzysta MG przy stole."
            tone="accent"
          >
          {/* Toggle discovered */}
          <button
            type="button"
            onClick={handleToggleDiscovered}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium w-fit transition-colors ${
              clue.data.discovered
                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-surface-300 bg-white text-surface-700 hover:bg-surface-50'
            }`}
          >
            {clue.data.discovered
              ? <><CheckCircle2 className="h-4 w-4" /> Odkryta — kliknij, aby ukryć</>
              : <><Circle className="h-4 w-4" /> Nieodkryta — kliknij, aby odkryć</>
            }
          </button>

          {/* Hint */}
          {clue.data.hint && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">Wskazówka</h2>
              <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-surface-800">
                {clue.data.hint}
              </p>
            </div>
          )}

          {/* Description */}
          {clue.description && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">Opis</h2>
              <div
                className="prose prose-sm max-w-none text-surface-700"
                dangerouslySetInnerHTML={{ __html: clue.description }}
              />
            </div>
          )}

          {/* Tags */}
          {clue.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {clue.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          </DetailSection>

          <DetailSection
            title="Prowadzi do"
            description="Docelowe byty fabularne oraz siła tropu dla każdego kierunku."
          >
            <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                  Prowadzi do
                </h2>
                <p className="mt-1 text-sm text-surface-400">
                  Określ, czy wskazówka prowadzi do wątku, zagrożenia albo frontu oraz jak mocny to trop.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetPickerType('thread')}
                  className="rounded-full border border-surface-300 px-2.5 py-1 text-xs font-medium text-surface-600 hover:bg-surface-50"
                >
                  + Wątek
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPickerType('threat')}
                  className="rounded-full border border-surface-300 px-2.5 py-1 text-xs font-medium text-surface-600 hover:bg-surface-50"
                >
                  + Zagrożenie
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPickerType('front')}
                  className="rounded-full border border-surface-300 px-2.5 py-1 text-xs font-medium text-surface-600 hover:bg-surface-50"
                >
                  + Front
                </button>
              </div>
            </div>

            {resolvedClueTargets.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {strongTargets.length > 0 && (
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-800">
                    {CLUE_STRENGTH_LABELS.strong}: {strongTargets.length}
                  </span>
                )}
                {standardTargets.length > 0 && (
                  <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700">
                    {CLUE_STRENGTH_LABELS.standard}: {standardTargets.length}
                  </span>
                )}
                {weakTargets.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {CLUE_STRENGTH_LABELS.weak}: {weakTargets.length}
                  </span>
                )}
              </div>
            )}

            <NarrativeLinksSection
              title="Cele wskazówki"
              items={resolvedClueTargets}
              emptyMessage="Ta wskazówka nie wskazuje jeszcze jawnie na front, zagrożenie ani wątek."
              meta={(item) => (
                item.relation.meta?.clueStrength
                  ? getClueStrengthLabel(item.relation.meta.clueStrength)
                  : null
              )}
            />
            </div>
          </DetailSection>

          <DetailSection
            title="Powiązania świata"
            description="Relacje dodatkowe poza głównym kontraktem wskazówki."
            action={(
              <button
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + Dodaj
              </button>
            )}
          >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500">Pozostałe powiązania</h2>
              <button
                onClick={() => setShowRelPicker(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + Dodaj
              </button>
            </div>
            <RelationList
              entityId={clue.id}
              excludeRelationTypes={['clues_for']}
              emptyMessage="Brak dodatkowych powiązań dla tej wskazówki."
            />
          </div>
          </DetailSection>

          <DetailSection
            title="Notatki MG"
            description="Zaplecze robocze dla prowadzącego, poza czystym tropem i jego celem."
          >
            <NotesList
              entityId={clue.id}
              showTitle={false}
              emptyMessage="Brak notatek podpiętych do tej wskazówki."
            />
          </DetailSection>
        </div>
      )}

      {showRelPicker && (
        <RelationPicker
          sourceId={clue.id}
          sourceType="clue"
          onClose={() => setShowRelPicker(false)}
        />
      )}

      {targetPickerType && (
        <RelationPicker
          sourceId={clue.id}
          sourceType="clue"
          initialTargetType={targetPickerType}
          initialRelationType="clues_for"
          lockTargetType
          lockRelationType
          onClose={() => setTargetPickerType(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń wskazówkę"
        description={`Czy na pewno chcesz usunąć wskazówkę „${clue.name}"? Tej operacji nie można cofnąć.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
