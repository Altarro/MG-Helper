import type { GraphNode, GraphLink } from '../hooks/useGraphData';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  npc: 'NPC',
  location: 'Lokacja',
  front: 'Front',
  threat: 'Zagrożenie',
  clock: 'Zegar',
  session: 'Sesja',
  faction: 'Frakcja',
  item: 'Przedmiot',
  clue: 'Wskazówka',
  thread: 'Wątek',
  note: 'Notatka',
  event: 'Zdarzenie',
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  contains: 'zawiera',
  belongs_to: 'należy do',
  tracks: 'śledzi',
  appears_in: 'pojawia się',
  owns: 'posiada',
  related_to: 'powiązany',
  clues_for: 'wskaz?wka do',
  derives_from: 'wynika z',
  affects: 'wplywa na',
};

interface NodeTooltipProps {
  node: GraphNode;
}

export function NodeTooltip({ node }: NodeTooltipProps) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md text-xs max-w-[180px]">
      <p className="font-semibold text-surface-900 truncate">{node.name}</p>
      <p className="text-surface-500">{ENTITY_TYPE_LABELS[node.type] ?? node.type}</p>
      {node.tags.length > 0 && (
        <p className="mt-1 text-surface-400 truncate">{node.tags.join(', ')}</p>
      )}
    </div>
  );
}

interface LinkTooltipProps {
  link: GraphLink;
}

export function LinkTooltip({ link }: LinkTooltipProps) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-surface-900">{RELATION_TYPE_LABELS[link.type] ?? link.type}</p>
      {link.label && <p className="text-surface-500">{link.label}</p>}
    </div>
  );
}
