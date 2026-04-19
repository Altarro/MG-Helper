import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { openCampaignDb } from '@shared/db/database';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';
import { isNote } from '@modules/notes/types';
import { renderHook, waitFor } from '@testing-library/react';
import { CampaignProvider } from '@shared/db/CampaignContext';
import React from 'react';
import { useNotesBySession } from '@modules/notes/hooks/useNotesBySession';
import { useNotesFor } from '@modules/notes/hooks/useNotesFor';

const TEST_CAMPAIGN_ID = '__notes-test__';
const db = openCampaignDb(TEST_CAMPAIGN_ID);
setActiveCampaignId(TEST_CAMPAIGN_ID);
saveCampaign({ id: TEST_CAMPAIGN_ID, name: 'Notes Test', description: '', createdAt: new Date().toISOString() });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CampaignProvider, null, children);
}

function makeNote(sessionId: string, content = 'Treść notatki', createdAt?: string) {
  return addEntity(db, {
    type: 'note',
    name: content.slice(0, 60),
    description: '',
    tags: [],
    data: {
      content,
      sessionId,
      createdAt: createdAt ?? new Date().toISOString(),
    },
  });
}

describe('Notes integration', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('creates a note and reads it back as Note type', async () => {
    const note = await makeNote('session-1', 'Ważna obserwacja');
    const stored = await db.entities.get(note.id);
    expect(stored).toBeDefined();
    expect(isNote(stored!)).toBe(true);
    expect((stored!.data as { content: string }).content).toBe('Ważna obserwacja');
    expect((stored!.data as { sessionId: string }).sessionId).toBe('session-1');
  });

  it('auto-links note to session via appears_in', async () => {
    const session = await addEntity(db, {
      type: 'session',
      name: 'Sesja 1',
      description: '',
      tags: [],
      data: { number: 1, date: '', status: 'planned' },
    });
    const note = await makeNote(session.id);
    await addRelation(db, { type: 'appears_in', sourceId: note.id, targetId: session.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(note.id)
      .filter((r) => r.type === 'appears_in')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(session.id);
  });

  it('links note to NPC via related_to', async () => {
    const session = await addEntity(db, {
      type: 'session', name: 'Sesja 2', description: '', tags: [],
      data: { number: 2, date: '', status: 'planned' },
    });
    const npc = await addEntity(db, {
      type: 'npc', name: 'Aldric', description: '', tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });
    const note = await makeNote(session.id, 'Aldric zachowywał się podejrzanie');
    await addRelation(db, { type: 'related_to', sourceId: note.id, targetId: npc.id });

    const rel = await db.relations
      .where('sourceId')
      .equals(note.id)
      .filter((r) => r.type === 'related_to')
      .first();
    expect(rel).toBeDefined();
    expect(rel!.targetId).toBe(npc.id);
  });

  it('useNotesBySession returns notes for a session sorted newest-first', async () => {
    const sessionId = 'test-session-xyz';
    const n1 = await addEntity(db, {
      type: 'note', name: 'n1', description: '', tags: [],
      data: { content: 'Pierwsza', sessionId, createdAt: '2024-01-01T10:00:00Z' },
    });
    const n2 = await addEntity(db, {
      type: 'note', name: 'n2', description: '', tags: [],
      data: { content: 'Druga', sessionId, createdAt: '2024-01-01T11:00:00Z' },
    });
    // A note for another session — should NOT appear
    await addEntity(db, {
      type: 'note', name: 'other', description: '', tags: [],
      data: { content: 'Inna sesja', sessionId: 'other-session', createdAt: '2024-01-01T12:00:00Z' },
    });

    const { result } = renderHook(() => useNotesBySession(sessionId), {
      wrapper,
    });
    await waitFor(() => expect(result.current).not.toBeUndefined());
    expect(result.current).toHaveLength(2);
    // sorted newest first
    expect(result.current![0].id).toBe(n2.id);
    expect(result.current![1].id).toBe(n1.id);
  });

  it('useNotesFor returns notes linked via related_to', async () => {
    const npc = await addEntity(db, {
      type: 'npc', name: 'Mirela', description: '', tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });
    const note1 = await addEntity(db, {
      type: 'note', name: 'n1', description: '', tags: [],
      data: { content: 'Mirela kłamała', sessionId: 's1', createdAt: '2024-01-01T10:00:00Z' },
    });
    const note2 = await addEntity(db, {
      type: 'note', name: 'n2', description: '', tags: [],
      data: { content: 'Mirela umknęła', sessionId: 's1', createdAt: '2024-01-01T11:00:00Z' },
    });
    // Unrelated note
    await addEntity(db, {
      type: 'note', name: 'n3', description: '', tags: [],
      data: { content: 'Niezwiązana', sessionId: 's2', createdAt: '2024-01-01T09:00:00Z' },
    });

    await addRelation(db, { type: 'related_to', sourceId: note1.id, targetId: npc.id });
    await addRelation(db, { type: 'related_to', sourceId: note2.id, targetId: npc.id });

    const { result } = renderHook(() => useNotesFor(npc.id), {
      wrapper,
    });
    await waitFor(() => expect(result.current).not.toBeUndefined());
    expect(result.current).toHaveLength(2);
    const ids = result.current!.map((n) => n.id);
    expect(ids).toContain(note1.id);
    expect(ids).toContain(note2.id);
  });

  it('cascade-deletes note with its relations', async () => {
    const npc = await addEntity(db, {
      type: 'npc', name: 'Ktoś', description: '', tags: [],
      data: { instinct: '', motivation: '', appearance: '', playStyle: '', isPC: false, playerName: '' },
    });
    const note = await makeNote('s1', 'Do usunięcia');
    await addRelation(db, { type: 'related_to', sourceId: note.id, targetId: npc.id });

    await deleteEntity(db, note.id);

    const stored = await db.entities.get(note.id);
    expect(stored).toBeUndefined();
    const rels = await db.relations.where('sourceId').equals(note.id).toArray();
    expect(rels).toHaveLength(0);
  });
});
