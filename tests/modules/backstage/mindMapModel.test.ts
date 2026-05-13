import { describe, expect, it } from 'vitest';
import {
  canAddMindMapChild,
  createInitialMindMapDraft,
  getMindMapDescendantIds,
  removeMindMapNodeWithDescendants,
  summarizeMindMapDraft,
  type MindMapDraftNode,
} from '@modules/backstage/mindMapModel';

describe('mind map model', () => {
  it('keeps allowed children aligned with the backstage mind map contract', () => {
    expect(canAddMindMapChild('front', 'threat')).toBe(true);
    expect(canAddMindMapChild('front', 'clue')).toBe(true);
    expect(canAddMindMapChild('front', 'thread')).toBe(false);

    expect(canAddMindMapChild('location', 'npc')).toBe(true);
    expect(canAddMindMapChild('location', 'item')).toBe(true);
    expect(canAddMindMapChild('clue', 'item')).toBe(false);
  });

  it('removes a draft node together with its descendants', () => {
    const nodes: MindMapDraftNode[] = [
      ...createInitialMindMapDraft(),
      { id: 'threat-1', parentId: 'root', type: 'threat', name: 'Kult', collapsed: false },
      { id: 'thread-1', parentId: 'threat-1', type: 'thread', name: 'Porwania', collapsed: false },
      { id: 'clue-1', parentId: 'thread-1', type: 'clue', name: 'Ślady', collapsed: false },
      { id: 'clue-2', parentId: 'root', type: 'clue', name: 'Plotka', collapsed: false },
    ];

    expect([...getMindMapDescendantIds(nodes, 'threat-1')].sort()).toEqual(['clue-1', 'thread-1']);

    const remaining = removeMindMapNodeWithDescendants(nodes, 'threat-1');
    expect(remaining.map((node) => node.id)).toEqual(['root', 'clue-2']);
    expect(summarizeMindMapDraft(remaining)).toMatchObject({ front: 1, clue: 1, threat: 0 });
  });
});
