import { useState, useEffect, useRef } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import { addRelation, updateRelation } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { isRelationAllowed } from '@shared/db/relationRules';
import { useDebounce } from '@shared/hooks/useDebounce';
import { toast } from 'sonner';
import { ENTITY_TYPES } from '@shared/types/entity';
import type { EntityType } from '@shared/types/entity';
import { RELATION_TYPES } from '@shared/types/relation';
import type { RelationMeta, RelationType } from '@shared/types/relation';
import { ENTITY_TYPE_LABELS } from '@shared/utils/entityTypeMeta';
import {
  CLUE_STRENGTH_LABELS,
  CLUE_STRENGTH_OPTIONS,
  THREAD_DERIVATION_KIND_LABELS,
  THREAD_DERIVATION_KIND_OPTIONS,
} from '@shared/domain/storyContracts';
import { Modal } from './Modal';

const RELATION_LABELS: Record<RelationType, string> = {
  contains: 'Zawiera',
  belongs_to: 'Należy do',
  tracks: 'Śledzi',
  appears_in: 'Pojawia się w',
  owns: 'Posiada',
  related_to: 'Powiązany z',
  clues_for: 'Wskazówka do',
  derives_from: 'Wynika z',
  affects: 'Powiązanie fabularne',
};

interface RelationPickerProps {
  sourceId: string;
  sourceType: EntityType;
  onClose: () => void;
  initialTargetType?: EntityType;
  initialTargetId?: string;
  initialRelationType?: RelationType;
  initialRelationMeta?: RelationMeta;
  initialLabel?: string;
  initialRelationId?: string;
  lockTargetType?: boolean;
  lockRelationType?: boolean;
  allowedTargetTypes?: EntityType[];
  onSaved?: () => void;
}

export function RelationPicker({
  sourceId,
  sourceType,
  onClose,
  initialTargetType = 'npc',
  initialTargetId,
  initialRelationType = 'related_to',
  initialRelationMeta,
  initialLabel = '',
  initialRelationId,
  lockTargetType = false,
  lockRelationType = false,
  allowedTargetTypes,
  onSaved,
}: RelationPickerProps) {
  const { db } = useCampaign();
  const isEditing = Boolean(initialRelationId);
  const [targetType, setTargetType] = useState<EntityType>(initialTargetType);
  const [selectedTargetId, setSelectedTargetId] = useState(initialTargetId ?? '');
  const [relationType, setRelationType] = useState<RelationType>(initialRelationType);
  const [relationMeta, setRelationMeta] = useState<RelationMeta | undefined>(initialRelationMeta);
  const [label, setLabel] = useState(initialLabel);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectableTargetTypes = allowedTargetTypes?.length ? allowedTargetTypes : ENTITY_TYPES;

  useEffect(() => {
    if (!selectableTargetTypes.includes(targetType)) {
      setTargetType(selectableTargetTypes[0] ?? 'npc');
      setSelectedTargetId('');
    }
  }, [selectableTargetTypes, targetType]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const candidates = useEntitiesByType(targetType);

  const filtered = candidates?.filter(
    (e) =>
      e.id !== sourceId &&
      (debouncedQuery === '' ||
        e.name.toLowerCase().includes(debouncedQuery.toLowerCase())),
  ) ?? [];
  const selectedTarget = candidates?.find((entity) => entity.id === selectedTargetId);

  const allowedRelations = (RELATION_TYPES as readonly RelationType[]).filter((rt) =>
    isRelationAllowed(sourceType, targetType, rt),
  );

  useEffect(() => {
    if (!allowedRelations.includes(relationType)) {
      setRelationType(allowedRelations[0] ?? 'related_to');
    }
  }, [allowedRelations, relationType]);

  useEffect(() => {
    const isThreadDerivation =
      relationType === 'derives_from' &&
      sourceType === 'thread' &&
      targetType === 'thread';
    const isWeightedClueRelation =
      relationType === 'clues_for' &&
      sourceType === 'clue' &&
      (targetType === 'thread' || targetType === 'threat' || targetType === 'front');

    if (isThreadDerivation) {
      setRelationMeta((current) => ({
        threadDerivationKind: current?.threadDerivationKind ?? 'followup',
      }));
      return;
    }

    if (isWeightedClueRelation) {
      setRelationMeta((current) => (
        current?.clueStrength
          ? { clueStrength: current.clueStrength }
          : undefined
      ));
      return;
    }

    if (!isThreadDerivation) {
      setRelationMeta(undefined);
    }
  }, [relationType, sourceType, targetType]);

  async function handleAdd(targetId: string) {
    setSaving(true);
    try {
      await addRelation(db, {
        sourceId,
        targetId,
        type: relationType,
        label: label.trim() || undefined,
        meta: relationMeta,
      });
      toast.success('Relacja dodana');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się dodać relacji');
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!initialRelationId || !selectedTargetId) return;

    setSaving(true);
    try {
      await updateRelation(db, initialRelationId, {
        targetId: selectedTargetId,
        type: relationType,
        label: label.trim() || undefined,
        meta: relationMeta,
      });
      toast.success('Relacja zaktualizowana');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zaktualizować relacji');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edytuj relację' : 'Dodaj relację'}
      size="md"
      onClose={onClose}
      initialFocusRef={searchRef}
      aria-label={isEditing ? 'Edytuj relację' : 'Dodaj relację'}
    >
      <div className="flex flex-col gap-4">

        {/* Target type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Typ docelowy</label>
          {lockTargetType ? (
            <div className="rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700">
              {ENTITY_TYPE_LABELS[targetType]}
            </div>
          ) : (
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as EntityType);
                setSelectedTargetId('');
                setRelationType('related_to');
              }}
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {selectableTargetTypes.map((t) => (
                <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          )}
        </div>

        {/* Relation type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Typ relacji</label>
          {lockRelationType ? (
            <div className="rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700">
              {RELATION_LABELS[relationType]}
            </div>
          ) : (
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {(allowedRelations.length > 0 ? allowedRelations : (RELATION_TYPES as readonly RelationType[])).map((rt) => (
                <option key={rt} value={rt}>{RELATION_LABELS[rt]}</option>
              ))}
            </select>
          )}
        </div>

        {relationType === 'derives_from' && sourceType === 'thread' && targetType === 'thread' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-600">Typ linii wątku</label>
            <select
              value={relationMeta?.threadDerivationKind ?? 'followup'}
              onChange={(e) =>
                setRelationMeta({
                  ...relationMeta,
                  threadDerivationKind: e.target.value as (typeof THREAD_DERIVATION_KIND_OPTIONS)[number],
                })
              }
              className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {THREAD_DERIVATION_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {THREAD_DERIVATION_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
        )}

        {relationType === 'clues_for' &&
          sourceType === 'clue' &&
          (targetType === 'thread' || targetType === 'threat' || targetType === 'front') && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-surface-600">Siła wskazówki</label>
              <select
                value={relationMeta?.clueStrength ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setRelationMeta(
                    nextValue
                      ? { clueStrength: nextValue as (typeof CLUE_STRENGTH_OPTIONS)[number] }
                      : undefined,
                  );
                }}
                className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Bez doprecyzowania</option>
                {CLUE_STRENGTH_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {CLUE_STRENGTH_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
          )}

        {/* Optional label */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Etykieta (opcjonalnie)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="np. sojusznik, wróg…"
            maxLength={80}
            className="rounded-md border border-surface-300 px-3 py-2 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-600">Wybierz encję</label>
          {isEditing && selectedTarget ? (
            <div className="mb-1 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-900">
              Wybrano: <span className="font-semibold">{selectedTarget.name}</span>
            </div>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj…"
              className="w-full rounded-md border border-surface-300 py-2 pl-8 pr-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Results */}
        <ul className="max-h-48 overflow-auto flex flex-col gap-1">
          {filtered.length === 0 && (
            <li className="py-2 text-center text-xs text-surface-400">Brak wyników</li>
          )}
          {filtered.map((entity) => (
            <li key={entity.id}>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (isEditing) {
                    setSelectedTargetId(entity.id);
                    return;
                  }
                  void handleAdd(entity.id);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 disabled:opacity-50 ${
                  selectedTargetId === entity.id ? 'bg-primary-50 text-primary-900' : ''
                }`}
              >
                {selectedTargetId === entity.id ? (
                  <Check className="h-4 w-4 shrink-0 text-primary-600" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-primary-500" />
                )}
                <span className="font-medium text-surface-800">{entity.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {isEditing ? (
          <div className="flex justify-end gap-2 border-t border-surface-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              disabled={saving || !selectedTargetId}
              onClick={() => void handleUpdate()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz relację'}
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
