import { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';
import { addRelation } from '@shared/db/operations';
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
  affects: 'Wplywa na',
};

interface RelationPickerProps {
  sourceId: string;
  sourceType: EntityType;
  onClose: () => void;
  initialTargetType?: EntityType;
  initialRelationType?: RelationType;
  initialRelationMeta?: RelationMeta;
  lockTargetType?: boolean;
  lockRelationType?: boolean;
  allowedTargetTypes?: EntityType[];
}

export function RelationPicker({
  sourceId,
  sourceType,
  onClose,
  initialTargetType = 'npc',
  initialRelationType = 'related_to',
  initialRelationMeta,
  lockTargetType = false,
  lockRelationType = false,
  allowedTargetTypes,
}: RelationPickerProps) {
  const { db } = useCampaign();
  const [targetType, setTargetType] = useState<EntityType>(initialTargetType);
  const [relationType, setRelationType] = useState<RelationType>(initialRelationType);
  const [relationMeta, setRelationMeta] = useState<RelationMeta | undefined>(initialRelationMeta);
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectableTargetTypes = allowedTargetTypes?.length ? allowedTargetTypes : ENTITY_TYPES;

  useEffect(() => {
    if (!selectableTargetTypes.includes(targetType)) {
      setTargetType(selectableTargetTypes[0] ?? 'npc');
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
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się dodać relacji');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Dodaj relacje"
      size="md"
      onClose={onClose}
      initialFocusRef={searchRef}
      aria-label="Dodaj relację"
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
            <label className="text-xs font-medium text-surface-600">Typ questline</label>
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
                onClick={() => handleAdd(entity.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 shrink-0 text-primary-500" />
                <span className="font-medium text-surface-800">{entity.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
