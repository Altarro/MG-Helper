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
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { toast } from 'sonner';
import { CLUE_STRENGTH_LABELS, getClueStrengthLabel } from '@shared/domain/storyContracts';
import type { ClueFormValues } from './ClueForm';

export function ClueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db, campaignId } = useCampaign();
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
  const [targetPickerType, setTargetPickerType] = useState<'thread' | 'threat' | 'front' | null>(
    null,
  );
  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
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
          clueTypes: values.clueTypes,
          clueType: values.clueTypes[0],
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
  const strongTargets = resolvedClueTargets.filter(
    (item) => item.relation.meta?.clueStrength === 'strong',
  );
  const standardTargets = resolvedClueTargets.filter(
    (item) => item.relation.meta?.clueStrength === 'standard',
  );
  const weakTargets = resolvedClueTargets.filter(
    (item) => item.relation.meta?.clueStrength === 'weak',
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {/* Back */}
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex items-center gap-4">
          <div className="rounded-[1.25rem] border border-cyan-200/70 bg-cyan-100/70 p-3 text-cyan-800 shadow-[0_14px_28px_rgba(34,211,238,0.12)]">
            {clue.data.discovered ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
              {clue.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {clue.data.clueTypes.map((type) => (
                <span key={type} className="inline-flex rounded-full border border-cyan-200/80 bg-cyan-100/75 px-3 py-1 text-xs font-semibold text-cyan-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  {getCatalogLabelByValue('clueType', type, campaignId)}
                </span>
              ))}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  clue.data.discovered
                    ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                    : 'app-pill-muted'
                }`}
              >
                {clue.data.discovered ? 'Odkryta' : 'Ukryta'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <MarkdownExportButton entity={clue} />
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <ClueForm
            defaultValues={{
              name: clue.name,
              description: clue.description,
              tags: clue.tags,
              clueTypes: clue.data.clueTypes,
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
            contentClassName="flex flex-col gap-5 lg:gap-6"
          >
            {/* Toggle discovered */}
            <button
              type="button"
              onClick={handleToggleDiscovered}
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                clue.data.discovered
                  ? 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-emerald-100'
                  : 'app-button-secondary'
              }`}
            >
              {clue.data.discovered ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Odkryta — kliknij, aby ukryć
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" /> Nieodkryta — kliknij, aby odkryć
                </>
              )}
            </button>

            {/* Hint */}
            {clue.data.hint && (
              <div className="rounded-[1.45rem] border border-cyan-200/70 bg-[linear-gradient(180deg,rgba(223,247,250,0.96)_0%,rgba(208,240,245,0.98)_100%)] px-5 py-5 shadow-[0_14px_28px_rgba(18,45,66,0.06),inset_0_1px_0_rgba(255,255,255,0.24)]">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-cyan-800 uppercase">
                  Wskazówka
                </h2>
                <p className="text-surface-800 text-sm">{clue.data.hint}</p>
              </div>
            )}

            {/* Description */}
            {clue.description && (
              <div>
                <h2 className="text-surface-500 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Opis
                </h2>
                <div
                  className="prose prose-sm text-surface-700 max-w-none"
                  dangerouslySetInnerHTML={{ __html: clue.description }}
                />
              </div>
            )}

            {/* Tags */}
            {clue.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {clue.tags.map((tag) => (
                  <span
                    key={tag}
                    className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection
            title="Prowadzi do"
            description="Docelowe byty fabularne oraz siła tropu dla każdego kierunku."
            contentClassName="flex flex-col gap-5"
          >
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                    Prowadzi do
                  </h2>
                  <p className="text-surface-400 mt-1 text-sm">
                    Określ, czy wskazówka prowadzi do wątku, zagrożenia albo frontu oraz jak mocny
                    to trop.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetPickerType('thread')}
                    className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    + Wątek
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPickerType('threat')}
                    className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    + Zagrożenie
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPickerType('front')}
                    className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    + Front
                  </button>
                </div>
              </div>

              {resolvedClueTargets.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {strongTargets.length > 0 && (
                    <span className="inline-flex rounded-full border border-cyan-200/80 bg-cyan-100/75 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                      {CLUE_STRENGTH_LABELS.strong}: {strongTargets.length}
                    </span>
                  )}
                  {standardTargets.length > 0 && (
                    <span className="app-pill-muted inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                      {CLUE_STRENGTH_LABELS.standard}: {standardTargets.length}
                    </span>
                  )}
                  {weakTargets.length > 0 && (
                    <span className="app-danger-pill inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                      {CLUE_STRENGTH_LABELS.weak}: {weakTargets.length}
                    </span>
                  )}
                </div>
              )}

              <NarrativeLinksSection
                title="Cele wskazówki"
                items={resolvedClueTargets}
                emptyMessage="Ta wskazówka nie wskazuje jeszcze jawnie na front, zagrożenie ani wątek."
                meta={(item) =>
                  item.relation.meta?.clueStrength
                    ? getClueStrengthLabel(item.relation.meta.clueStrength)
                    : null
                }
              />
            </div>
          </DetailSection>

          <DetailSection
            title="Powiązania świata"
            description="Relacje dodatkowe poza głównym kontraktem wskazówki."
            action={null}
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
                  Pozostałe powiązania
                </h2>
                <button
                  onClick={() => setShowRelPicker(true)}
                  className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
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
