import { useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { useCluesFor } from '@modules/clues/hooks/useCluesFor';
import { ClueRow } from '@modules/clues/components/ClueCard';
import { ClueForm } from '@modules/clues/components/ClueForm';
import { addEntity, addRelation, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import {
  CLUE_STRENGTH_LABELS,
  CLUE_STRENGTH_OPTIONS,
} from '@shared/domain/storyContracts';
import { toast } from 'sonner';
import type { Clue } from '@modules/clues/types';
import type { ClueFormValues } from '@modules/clues/components/ClueForm';

interface ClueSectionProps {
  /** The threat, front or thread this section belongs to */
  parentId: string;
  /** Label for the section header */
  title?: string;
  showTitle?: boolean;
}

/**
 * Reusable section panel for displaying clues linked to a threat, front or thread.
 * Shows a compact list and inline quick-add form.
 * Cascade-delete is handled by the caller (via deleteEntity on the parent which uses the DB cascade).
 */
export function ClueSection({ parentId, title = 'Wskazówki' }: ClueSectionProps) {
  const { db } = useCampaign();
  const clues = useCluesFor(parentId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clueStrength, setClueStrength] = useState('');

  async function handleCreate(values: ClueFormValues) {
    setSaving(true);
    try {
      const clue = await addEntity(db, {
        type: 'clue',
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
      await addRelation(db, {
        type: 'clues_for',
        sourceId: clue.id,
        targetId: parentId,
        meta: clueStrength
          ? { clueStrength: clueStrength as (typeof CLUE_STRENGTH_OPTIONS)[number] }
          : undefined,
      });
      toast.success(`Wskazówka „${values.name}" dodana`);
      setShowForm(false);
      setClueStrength('');
    } catch {
      toast.error('Nie udało się dodać wskazówki');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDiscovered(clue: Clue) {
    try {
      await updateEntity(db, clue.id, {
        data: { ...clue.data, discovered: !clue.data.discovered },
      });
    } catch {
      toast.error('Nie udało się zaktualizować wskazówki');
    }
  }

  const count = clues?.length ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
          {title}
          {count > 0 && (
            <span className="ml-1.5 rounded-full bg-cyan-100 px-1.5 py-0.5 text-cyan-700 normal-case">
              {count}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <Plus className="h-3 w-3" /> Dodaj
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-surface-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-600">Siła wskazówki dla tej relacji</label>
            <select
              value={clueStrength}
              onChange={(e) => setClueStrength(e.target.value)}
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Bez doprecyzowania</option>
              {CLUE_STRENGTH_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {CLUE_STRENGTH_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <ClueForm
            onSubmit={handleCreate}
            onCancel={() => {
              setShowForm(false);
              setClueStrength('');
            }}
            isSaving={saving}
          />
        </div>
      )}

      {!clues || clues.length === 0 ? (
        !showForm && (
          <p className="text-xs text-surface-400">
            Brak wskazówek. Dodaj pierwszą wskazówkę wg zasady trzech poszlak.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-1">
          {clues.map((item) => (
            <ClueRow
              key={item.clue.id}
              clue={item.clue}
              metaLabel={item.relation.meta?.clueStrength ? CLUE_STRENGTH_LABELS[item.relation.meta.clueStrength] : undefined}
              onToggleDiscovered={handleToggleDiscovered}
            />
          ))}
          <Link
            to="/clues"
            className="mt-1 text-xs text-surface-400 hover:text-primary-600 text-right"
          >
            Wszystkie wskazówki →
          </Link>
        </div>
      )}
    </div>
  );
}
