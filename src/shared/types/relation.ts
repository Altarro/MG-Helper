import type {
  ClueStrengthOption,
  ThreadDerivationKindOption,
} from '@shared/domain/storyContracts';

export const RELATION_TYPES = [
  'contains',      // location → location, location/session → npc/item/threat
  'belongs_to',    // threat → front, npc → faction
  'tracks',        // threat → clock
  'appears_in',    // npc/location/item/thread/note/clue/clock/event/threat → session
  'owns',          // npc → item
  'related_to',    // generic bidirectional
  'clues_for',     // clue → threat|front
  'derives_from',  // thread → thread (parent-child thread hierarchy)
  'affects',       // thread <-> threat narrative pressure
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export interface RelationMeta {
  threadDerivationKind?: ThreadDerivationKindOption;
  clueStrength?: ClueStrengthOption;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  label?: string;    // optional custom label
  meta?: RelationMeta;
  createdAt: string; // ISO 8601
}

export type NewRelation = Omit<Relation, 'id' | 'createdAt'>;
