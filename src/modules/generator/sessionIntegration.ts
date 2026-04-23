import { addEntity, addRelation } from '@shared/db/operations';
import type { MgHelperDb } from '@shared/db/database';
import type { Entity } from '@shared/types';
import { createLocationData } from '@modules/locations/types';
import { ensureSessionDraftLocation } from '@modules/sessions/utils/draftScene';
import { setNpcCurrentLocation } from '@modules/sessions/utils/liveSessionCommands';
import type { GeneratorRollResult } from './contracts';

interface SessionIntegrationBase {
  db: MgHelperDb;
  sessionId: string;
  roll: GeneratorRollResult;
  tags?: string[];
}

interface CreateNpcFromRollInput extends SessionIntegrationBase {
  currentLocationId: string | null;
  placeOnSceneNow?: boolean;
  saveAsDraft?: boolean;
}

interface CreateLocationFromRollInput extends SessionIntegrationBase {
  saveAsDraft?: boolean;
}

export async function createNpcFromRoll(input: CreateNpcFromRollInput): Promise<Entity> {
  const { db, sessionId, roll, currentLocationId, placeOnSceneNow = false, saveAsDraft = false, tags } = input;
  const npcName = normalizeNpcName(roll.resultText);
  return db.transaction('rw', db.entities, db.relations, async () => {
    const duplicate = await findEntityByNameInSession(db, sessionId, 'npc', npcName);
    if (duplicate) return duplicate;

    const npc = await addEntity(db, {
      type: 'npc',
      name: npcName,
      description: '',
      tags: mergeTags(tags, saveAsDraft),
      data: {
        instinct: '',
        motivation: '',
        appearance: '',
        playStyle: '',
        playerName: '',
        isPC: false,
        isDraft: saveAsDraft,
        generatedFromRollId: roll.id,
      },
    });
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: sessionId });

    if (placeOnSceneNow) {
      const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
      await setNpcCurrentLocation(db, npc.id, targetLocationId, sessionId);
    }

    return npc;
  });
}

export async function createLocationFromRoll(input: CreateLocationFromRollInput): Promise<Entity> {
  const { db, sessionId, roll, saveAsDraft = false, tags } = input;
  const parsed = parseLocationRoll(roll.resultText);
  return db.transaction('rw', db.entities, db.relations, async () => {
    const duplicate = await findEntityByNameInSession(db, sessionId, 'location', parsed.name);
    if (duplicate) return duplicate;

    const location = await addEntity(db, {
      type: 'location',
      name: parsed.name,
      description: '',
      tags: mergeTags(tags, saveAsDraft),
      data: createLocationData({
        locationType: parsed.locationType,
        danger: 0,
        senses: { see: '', hear: '', smell: '', feel: '' },
        isDraft: saveAsDraft,
      }),
    });
    await addRelation(db, { type: 'appears_in', sourceId: location.id, targetId: sessionId });
    return location;
  });
}

export async function createSessionNoteFromRoll(input: SessionIntegrationBase): Promise<Entity> {
  const { db, sessionId, roll, tags } = input;
  return db.transaction('rw', db.entities, db.relations, async () => {
    const note = await addEntity(db, {
      type: 'note',
      name: `Inspiracja: ${roll.kind}`,
      description: '',
      tags: mergeTags(tags, false),
      data: {
        content: roll.resultText,
        sessionId,
        createdAt: roll.createdAt,
        generatedFromRollId: roll.id,
      },
    });
    await addRelation(db, { type: 'appears_in', sourceId: note.id, targetId: sessionId });
    return note;
  });
}

function normalizeNpcName(text: string): string {
  return text.replace(/\s+/g, ' ').trim() || 'Nowa postac';
}

function mergeTags(tags: string[] | undefined, saveAsDraft: boolean): string[] {
  const merged = ['inspiracja', ...(tags ?? [])];
  if (saveAsDraft) merged.push('szkic');
  return Array.from(new Set(merged.map((tag) => tag.trim()).filter(Boolean)));
}

function parseLocationRoll(text: string): { locationType: 'region' | 'city' | 'ruins' | 'dungeon' | 'wilderness' | 'building' | 'room'; name: string } {
  const separatorIndex = text.indexOf(':');
  const leftRaw = separatorIndex >= 0 ? text.slice(0, separatorIndex) : text;
  const rightRaw = separatorIndex >= 0 ? text.slice(separatorIndex + 1) : undefined;
  const left = leftRaw.trim().toLowerCase();
  const right = (rightRaw ?? '').trim();

  const mapType: Record<string, 'region' | 'city' | 'ruins' | 'dungeon' | 'wilderness' | 'building' | 'room'> = {
    region: 'region',
    miasto: 'city',
    city: 'city',
    ruiny: 'ruins',
    ruins: 'ruins',
    lochy: 'dungeon',
    dungeon: 'dungeon',
    dzicz: 'wilderness',
    wilderness: 'wilderness',
    budynek: 'building',
    building: 'building',
    pomieszczenie: 'room',
    room: 'room',
  };

  const locationType = mapType[left] ?? 'region';
  const name = right || (rightRaw === undefined ? text.trim() : 'Nowa lokacja') || 'Nowa lokacja';
  return { locationType, name };
}

async function findEntityByNameInSession(
  db: MgHelperDb,
  sessionId: string,
  type: Entity['type'],
  name: string,
): Promise<Entity | null> {
  const relations = await db.relations
    .where('targetId')
    .equals(sessionId)
    .filter((relation) => relation.type === 'appears_in')
    .toArray();
  const ids = relations.map((relation) => relation.sourceId);
  if (ids.length === 0) return null;
  const entities = await db.entities.where('id').anyOf(ids).toArray();
  return (
    entities.find(
      (entity) => entity.type === type && entity.name.trim().toLowerCase() === name.trim().toLowerCase(),
    ) ?? null
  );
}

