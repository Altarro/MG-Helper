import type { EntityType } from '@shared/types/entity';

export const MIND_MAP_ENTITY_TYPES = [
  'front',
  'threat',
  'thread',
  'clue',
  'npc',
  'location',
  'faction',
  'item',
] as const;

export type MindMapEntityType = (typeof MIND_MAP_ENTITY_TYPES)[number];

export interface MindMapDraftNode {
  id: string;
  parentId: string | null;
  type: MindMapEntityType;
  name: string;
  collapsed: boolean;
}

export const ALLOWED_MIND_MAP_CHILDREN: Record<MindMapEntityType, readonly MindMapEntityType[]> = {
  front: ['threat', 'clue'],
  threat: ['thread', 'clue'],
  thread: ['clue', 'npc', 'location', 'faction', 'item'],
  faction: ['npc', 'location', 'item'],
  location: ['npc', 'item'],
  npc: ['item'],
  clue: [],
  item: [],
};

export const MIND_MAP_ENTITY_LABELS: Record<MindMapEntityType, string> = {
  front: 'Front',
  threat: 'Zagrożenie',
  thread: 'Wątek',
  clue: 'Wskazówka',
  npc: 'Postać',
  location: 'Lokacja',
  faction: 'Frakcja',
  item: 'Przedmiot',
};

export const MIND_MAP_DEFAULT_NAMES: Record<MindMapEntityType, string> = {
  front: 'Nowy front',
  threat: 'Nowe zagrożenie',
  thread: 'Nowy wątek',
  clue: 'Nowa wskazówka',
  npc: 'Nowa postać',
  location: 'Nowa lokacja',
  faction: 'Nowa frakcja',
  item: 'Nowy przedmiot',
};

export function isMindMapEntityType(type: EntityType): type is MindMapEntityType {
  return MIND_MAP_ENTITY_TYPES.includes(type as MindMapEntityType);
}

export function getAllowedMindMapChildren(type: MindMapEntityType): readonly MindMapEntityType[] {
  return ALLOWED_MIND_MAP_CHILDREN[type];
}

export function canAddMindMapChild(parentType: MindMapEntityType, childType: MindMapEntityType): boolean {
  return getAllowedMindMapChildren(parentType).includes(childType);
}

export function createInitialMindMapDraft(): MindMapDraftNode[] {
  return [
    {
      id: 'root',
      parentId: null,
      type: 'front',
      name: MIND_MAP_DEFAULT_NAMES.front,
      collapsed: false,
    },
  ];
}

export function getMindMapDescendantIds(nodes: readonly MindMapDraftNode[], nodeId: string): Set<string> {
  const childrenByParent = new Map<string, MindMapDraftNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  const descendantIds = new Set<string>();
  const stack = [...(childrenByParent.get(nodeId) ?? [])];

  while (stack.length > 0) {
    const child = stack.pop();
    if (!child) continue;
    descendantIds.add(child.id);
    stack.push(...(childrenByParent.get(child.id) ?? []));
  }

  return descendantIds;
}

export function removeMindMapNodeWithDescendants(
  nodes: readonly MindMapDraftNode[],
  nodeId: string,
): MindMapDraftNode[] {
  const idsToRemove = getMindMapDescendantIds(nodes, nodeId);
  idsToRemove.add(nodeId);
  return nodes.filter((node) => node.parentId === null || !idsToRemove.has(node.id));
}

export function summarizeMindMapDraft(nodes: readonly MindMapDraftNode[]): Record<MindMapEntityType, number> {
  const summary = Object.fromEntries(MIND_MAP_ENTITY_TYPES.map((type) => [type, 0])) as Record<
    MindMapEntityType,
    number
  >;

  for (const node of nodes) {
    summary[node.type] += 1;
  }

  return summary;
}
