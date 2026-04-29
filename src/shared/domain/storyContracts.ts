/**
 * Phase 1 preparation layer for the narrative model.
 *
 * This file does not change runtime relations yet.
 * It captures agreed semantics so future phases can evolve the data model
 * without re-deciding core story roles from scratch.
 */

export const STORY_ENTITY_ROLES = {
  front: 'Strategic campaign container and long-running story umbrella.',
  threat: 'Active pressure in the fiction. May belong to a front or stay free.',
  /** Z założenia składowa / ślad przy zagrożeniu frontu (nie „równorzędna” całości presji). */
  thread: 'Playable quest / case / lead closest to the table.',
  clue: 'Atomic piece of information. May stay free or point to a story object.',
} as const;

export const STORY_FREE_ENTITY_TYPES = ['threat', 'thread', 'clue'] as const;

/**
 * Planned relation semantic for Thread <-> Threat.
 * It is intentionally not part of RelationType yet.
 */
export const PLANNED_STORY_RELATIONS = ['affects'] as const;

/**
 * Minimal Phase 2-ready business skeleton for threads.
 * Runtime adoption is intentionally deferred.
 */
export const THREAD_KIND_OPTIONS = ['main', 'side', 'personal'] as const;
export type ThreadKindOption = (typeof THREAD_KIND_OPTIONS)[number];

/**
 * Future questline semantics for thread -> thread relations.
 * Runtime adoption is intentionally deferred.
 */
export const THREAD_DERIVATION_KIND_OPTIONS = [
  'followup',
  'alternative',
  'branch',
  'consequence',
] as const;
export type ThreadDerivationKindOption = (typeof THREAD_DERIVATION_KIND_OPTIONS)[number];

export const THREAD_DERIVATION_KIND_LABELS: Record<ThreadDerivationKindOption, string> = {
  followup: 'Nastepstwo',
  alternative: 'Alternatywa',
  branch: 'Odnoga',
  consequence: 'Konsekwencja',
};

/**
 * Canonical questline meaning:
 * source thread derives from target thread, so source is the newer / child thread,
 * while target is the parent / origin thread.
 */
export const THREAD_DERIVATION_KIND_DESCRIPTIONS: Record<ThreadDerivationKindOption, string> = {
  followup: 'Source thread is a direct continuation of the parent thread.',
  alternative: 'Source thread is an alternative path or variant of the parent thread.',
  branch: 'Source thread is a side branch that grows out of the parent thread.',
  consequence: 'Source thread exists because the parent thread caused or triggered it.',
};

/**
 * Planned UX wording for both reading directions.
 * This keeps future detail views and pickers aligned before runtime rollout.
 */
export const THREAD_DERIVATION_DIRECTION_LABELS: Record<
  ThreadDerivationKindOption,
  { outgoing: string; incoming: string }
> = {
  followup: {
    outgoing: 'Nastepstwo po',
    incoming: 'Prowadzi do następstwa',
  },
  alternative: {
    outgoing: 'Alternatywa dla',
    incoming: 'Ma alternatywe',
  },
  branch: {
    outgoing: 'Odnoga od',
    incoming: 'Ma odnoge',
  },
  consequence: {
    outgoing: 'Konsekwencja po',
    incoming: 'Prowadzi do konsekwencji',
  },
};

/**
 * Phase 5a decision:
 * - storage relation type stays `derives_from`
 * - future subtype should live as relation metadata, not a brand new RelationType
 * - old derives_from relations without subtype remain valid legacy links
 */
export const PLANNED_THREAD_DERIVATION_CONTRACT = {
  relationType: 'derives_from',
  futureMetadataKey: 'kind',
  backwardCompatibleWithoutKind: true,
  legacyDisplayKind: 'legacy_unspecified',
} as const;

export function getThreadDerivationKindLabel(kind: ThreadDerivationKindOption): string {
  return THREAD_DERIVATION_KIND_LABELS[kind];
}

export function getThreadDerivationDirectionLabel(
  kind: ThreadDerivationKindOption,
  direction: 'outgoing' | 'incoming',
): string {
  return THREAD_DERIVATION_DIRECTION_LABELS[kind][direction];
}

/**
 * Optional signal strength for clue -> narrative object relations.
 * The metadata may be omitted and should not break legacy campaigns.
 */
export const CLUE_STRENGTH_OPTIONS = ['weak', 'standard', 'strong'] as const;
export type ClueStrengthOption = (typeof CLUE_STRENGTH_OPTIONS)[number];

export const CLUE_STRENGTH_LABELS: Record<ClueStrengthOption, string> = {
  weak: 'Luźny trop',
  standard: 'Standardowa wskazówka',
  strong: 'Mocna wskazówka',
};

export const CLUE_STRENGTH_DESCRIPTIONS: Record<ClueStrengthOption, string> = {
  weak: 'Sugestia lub trop, który pomaga, ale nie prowadzi jeszcze jednoznacznie.',
  standard: 'Pełnowartościowa wskazówka prowadząca sensownie do obiektu fabularnego.',
  strong: 'Bardzo mocna wskazówka, niemal wprost prowadząca do obiektu fabularnego.',
};

export function getClueStrengthLabel(kind: ClueStrengthOption): string {
  return CLUE_STRENGTH_LABELS[kind];
}
