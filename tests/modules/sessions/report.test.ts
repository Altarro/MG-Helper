import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addRelation } from '@shared/db/operations';
import { db } from '@shared/db/database';
import { exportSessionMarkdown } from '@modules/data-io/utils/exportSessionMarkdown';

async function makeSession(number = 1, summary = '') {
  return addEntity(db, {
    type: 'session',
    name: `Sesja ${number}`,
    description: '',
    tags: [],
    data: { number, date: '2024-03-01', summary },
  });
}

async function makeNpc(name: string) {
  return addEntity(db, {
    type: 'npc',
    name,
    description: '',
    tags: [],
    data: { instinct: '', motivation: '', appearance: '' },
  });
}

async function makeNote(sessionId: string, content: string) {
  return addEntity(db, {
    type: 'note',
    name: content.slice(0, 60),
    description: '',
    tags: [],
    data: { content, sessionId, createdAt: new Date().toISOString() },
  });
}

describe('exportSessionMarkdown', () => {
  beforeEach(async () => {
    await db.entities.clear();
    await db.relations.clear();
  });

  it('includes session title and date in output', async () => {
    const session = await makeSession(3, 'Wielka bitwa');
    const md = await exportSessionMarkdown(db, session.id);
    expect(md).toContain('# Sesja 3');
    expect(md).toContain('1 marca 2024');
    expect(md).toContain('Wielka bitwa');
  });

  it('includes NPC name linked via appears_in', async () => {
    const session = await makeSession(1);
    const npc = await makeNpc('Aldric Thornwood');
    await addRelation(db, { type: 'appears_in', sourceId: npc.id, targetId: session.id });
    const md = await exportSessionMarkdown(db, session.id);
    expect(md).toContain('## Postacie');
    expect(md).toContain('Aldric Thornwood');
  });

  it('includes notes in chronological order', async () => {
    const session = await makeSession(2);
    await makeNote(session.id, 'Pierwsza notatka');
    await makeNote(session.id, 'Druga notatka');
    const md = await exportSessionMarkdown(db, session.id);
    expect(md).toContain('## Notatki');
    const first = md.indexOf('Pierwsza notatka');
    const second = md.indexOf('Druga notatka');
    expect(first).toBeLessThan(second);
  });

  it('does not include empty sections', async () => {
    const session = await makeSession(4);
    const md = await exportSessionMarkdown(db, session.id);
    expect(md).not.toContain('## Postacie');
    expect(md).not.toContain('## Notatki');
    expect(md).not.toContain('## Lokacje');
  });

  it('throws when session does not exist', async () => {
    await expect(exportSessionMarkdown(db, 'non-existent-id')).rejects.toThrow(
      'Session not found',
    );
  });

  it('includes clock with filled/total in output', async () => {
    const session = await makeSession(5);
    const clock = await addEntity(db, {
      type: 'clock',
      name: 'Zegar zagłady',
      description: '',
      tags: [],
      data: { segments: 6, filled: 3, isActive: true },
    });
    await addRelation(db, { type: 'appears_in', sourceId: clock.id, targetId: session.id });
    const md = await exportSessionMarkdown(db, session.id);
    expect(md).toContain('## Zegary');
    expect(md).toContain('Zegar zagłady (3/6)');
  });
});
