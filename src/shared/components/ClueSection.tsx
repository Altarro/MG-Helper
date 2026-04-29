import { useState } from 'react';
import { Link } from 'react-router';
import { Link2 } from 'lucide-react';
import { useCluesFor } from '@modules/clues/hooks/useCluesFor';
import { ClueRow } from '@modules/clues/components/ClueCard';
import { ClueForm } from '@modules/clues/components/ClueForm';
import { addEntity, addRelation, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { InlineEmptyState } from '@shared/components/InlineEmptyState';
import {
  CLUE_STRENGTH_LABELS,
  CLUE_STRENGTH_OPTIONS,
} from '@shared/domain/storyContracts';
import { toast } from 'sonner';
import type { Clue } from '@modules/clues/types';
import type { ClueRelationItem } from '@modules/clues/hooks/useCluesFor';
import type { ClueFormValues } from '@modules/clues/components/ClueForm';

interface ClueSectionProps {
  /** The threat, front or thread this section belongs to */
  parentId: string;
  /** Label for the section header */
  title?: string;
  showTitle?: boolean;
  onRemoveRelation?: (item: ClueRelationItem) => void;
}

/**
 * Reusable section panel for displaying clues linked to a threat, front or thread.
 * Shows a compact list and inline quick-add form.
 * Cascade-delete is handled by the caller (via deleteEntity on the parent which uses the DB cascade).
 */
export function ClueSection({ parentId, title = 'Wskazówki', onRemoveRelation }: ClueSectionProps) {
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
      toast.success(`Wskazówka „${values.name}” dodana`);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-surface-500 text-xs font-semibold tracking-wide uppercase">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="app-button-secondary focus:ring-primary-500/30 rounded-full px-3 py-1.5 text-xs font-medium focus:ring-2 focus:outline-none"
        >
          {showForm ? 'Anuluj' : '+ Dodaj wskazówkę'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-[1.2rem] app-input-shell p-4">
          <div className="mb-3 flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-600">Siła wskazówki dla tej relacji</label>
            <select
              value={clueStrength}
              onChange={(e) => setClueStrength(e.target.value)}
              className="rounded-[0.85rem] border border-[rgba(86,93,94,0.18)] bg-[rgba(255,250,240,0.55)] px-3 py-2 text-sm text-surface-800 focus:border-primary-500 focus:outline-none"
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
          <InlineEmptyState
            message="Brak wskazówek. Dodaj pierwszą wskazówkę wg zasady trzech poszlak."
            icon={<Link2 className="h-4 w-4" />}
          />
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {clues.map((item) => (
            <ClueRow
              key={item.clue.id}
              clue={item.clue}
              metaLabel={item.relation.meta?.clueStrength ? CLUE_STRENGTH_LABELS[item.relation.meta.clueStrength] : undefined}
              onToggleDiscovered={handleToggleDiscovered}
              onRemove={onRemoveRelation ? () => onRemoveRelation(item) : undefined}
            />
          ))}
          <Link
            to="/clues"
            className="text-surface-400 hover:text-primary-600 mt-0.5 text-right text-xs transition-colors"
          >
            Wszystkie wskazówki →
          </Link>
        </div>
      )}
    </div>
  );
}
