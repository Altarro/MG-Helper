# Story Domain Contract

## Purpose

This document describes the agreed narrative contract for the core story entities:

- `front`
- `threat`
- `thread`
- `clue`

It is the Phase 1 reference point for future implementation work.
Its goal is to keep data model, UI and gameplay workflow aligned before deeper refactors.

## Narrative Roles

### Front

`front` is the strategic container of the campaign.

It represents:

- a large agenda,
- a broad conflict axis,
- a long-running campaign force.

It should move the slowest and stay the highest-level story object.

### Threat

`threat` is active pressure in the fiction.

It represents:

- a concrete force,
- an active problem,
- a pressure engine that can escalate over time.

Rules:

- a threat may belong to a `front`,
- a threat may also stay free,
- a threat should eventually describe what makes it tick via a textual trigger field.
- a completed threat may spawn a new derived threat,
- a derived threat should keep a backlink to its source threat,
- a derived threat should have its own explicit inheritance section, separate from the general description,
- if a source threat had a clock, only already completed clock steps may be carried forward into the derived threat context,
- unfinished future clock steps must stay visible only in the original threat.

### Thread

`thread` is a playable story unit.

It is not a generic note.
It is closest to the table and should be treated as:

- a quest,
- a case,
- a lead,
- a problem the players can directly engage with.

Rules:

- a thread may stay free,
- a thread may affect multiple threats,
- a thread may derive from another thread,
- thread-to-thread relations should support questline structure:
  - continuation,
  - branch,
  - alternative,
  - consequence.

### Clue

`clue` is an atomic piece of information.

It may be:

- a discovered hint,
- a lead,
- a secret,
- a free-standing piece of information not yet attached to a larger structure.

Rules:

- a clue may stay free,
- a clue may point to `thread`,
- a clue may point to `threat`,
- a clue may exceptionally point to `front`,
- a clue may point to multiple narrative objects at once.

## Agreed Story Structure

Target structure:

- `Front -> Threat`
- `Threat <-> Thread`
- `Thread -> Clue`

Allowed exceptions:

- free `threat`
- free `thread`
- free `clue`
- `clue -> threat`
- `clue -> front`

## Relation Semantics

### Existing relations that remain valid

- `belongs_to`
  Used for `threat -> front`.
- `derives_from`
  Used for `thread -> thread`.
  Storage direction stays:
  `source thread -> target parent thread`.
- `clues_for`
  Used for `clue -> thread|threat|front`.
- `appears_in`
  Session-scoping relation only.
  It does not define story hierarchy.

## Clue Strength Contract

`clues_for` may optionally carry lightweight relation metadata describing how strongly
the clue points to its narrative target.

Official kinds:

- `weak` = `Luzny trop`
- `standard` = `Standardowa wskazowka`
- `strong` = `Mocna wskazowka`

Rules:

- the weight is optional,
- old `clues_for` relations without weight remain valid,
- the weight is not a separate `RelationType`,
- the weight should help MG reading the story, not become a required bookkeeping step.

### Relations that are not a long-term source of truth

- `related_to`
  May still exist as a generic fallback, but should not be the main narrative contract
  for `thread <-> threat`.

### Planned explicit story relation

Planned semantic name:

- `affects`

Intended meaning:

- a thread affects one or more threats,
- a threat is affected by one or more threads,
- the relation is directional in storage, but should be understandable both ways in UX.

Uwaga: relacja `affects` jest już zaimplementowana i walidowana w runtime (zob. `src/shared/db/relationRules.ts`).

## Questline Contract

### Direction of `derives_from`

Canonical meaning:

- `source` = newer / child / derived thread
- `target` = parent / origin thread

Example:

- if thread B is created because thread A led to it,
- then store: `B derives_from A`

This keeps compatibility with the current hierarchy model and with existing session thread trees.

### Official questline kinds for `thread -> thread`

The long-term semantic kinds are:

- `followup` = `Nastepstwo`
- `alternative` = `Alternatywa`
- `branch` = `Odnoga`
- `consequence` = `Konsekwencja`

Their intended meanings:

- `followup`
  Direct continuation of the parent thread.
- `alternative`
  Different path or option that answers the same story situation.
- `branch`
  Side branch that grows out of the parent thread without replacing it.
- `consequence`
  New thread that exists because the parent thread caused it.

### UX reading direction

Planned wording when reading the relation from the child thread outward:

- `followup` -> `Nastepstwo po`
- `alternative` -> `Alternatywa dla`
- `branch` -> `Odnoga od`
- `consequence` -> `Konsekwencja po`

Planned wording when reading from the parent thread inward:

- `followup` -> `Prowadzi do nastepstwa`
- `alternative` -> `Ma alternatywe`
- `branch` -> `Ma odnoge`
- `consequence` -> `Prowadzi do konsekwencji`

### Storage decision for later phases

Phase 5a decision:

- keep `derives_from` as the single `RelationType` for `thread -> thread`,
- do not add four separate relation types,
- in later runtime phases, subtype should be stored as relation metadata, not as a new top-level relation type.

Reasoning:

- it keeps import/export safer,
- it preserves current thread-tree behaviour,
- it avoids exploding the relation matrix for one story concept,
- it allows old data to remain valid.

### Backward compatibility

Existing `derives_from` relations without subtype remain valid.

Compatibility policy:

- old relations are treated as generic legacy questline links,
- they must still render and work in hierarchy-based views,
- no migration is required to keep old campaigns readable,
- future UI may allow promoting a legacy link into one of the official kinds.

## Session Live Scope

For Session Live, only threads explicitly attached to the session should be shown.

Preferred context order:

- `Location`
- `NPC`
- `Thread`

Threads should support the scene, not compete with the primary scene context.

## Deferred To Later Phases

The following items are intentionally not implemented in Phase 1:

- `thread.kind`,
- `threat.trigger` / `tickTrigger`,
- questline relation kinds beyond plain `derives_from`,
- Session Live presentation refactor for threads.

## Implementation Guardrails

- do not break existing imports/exports,
- do not reinterpret `appears_in` as story structure,
- do not force every threat into a front,
- do not force every thread into a threat,
- do not use `related_to` as the final answer for narrative hierarchy,
- evolve the model in small, reversible phases.
