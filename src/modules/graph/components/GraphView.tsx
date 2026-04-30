import { useRef, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraphData } from '../hooks/useGraphData';
import type { GraphNode, GraphLink } from '../hooks/useGraphData';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

const ENTITY_ROUTES: Record<EntityType, string> = {
  npc: '/npcs',
  location: '/locations',
  front: '/fronts',
  threat: '/threats',
  clock: '/clocks',
  session: '/sessions',
  faction: '/factions',
  item: '/items',
  clue: '/clues',
  thread: '/threads',
  note: '/notes',
  event: '/sessions',
};

const NODE_COLORS: Record<EntityType, string> = {
  npc: '#6366f1',      // indigo
  location: '#10b981', // emerald
  front: '#ef4444',    // red
  threat: '#f97316',   // orange
  clock: '#8b5cf6',    // violet
  session: '#0ea5e9',  // sky
  faction: '#3b82f6',  // blue
  item: '#f59e0b',     // amber
  clue: '#06b6d4',     // cyan
  thread: '#d946ef',   // fuchsia
  note: '#f59e0b',     // amber
  event: '#84cc16',    // lime
};

function getGraphRelationLabel(type: RelationType): string {
  return type === 'affects' ? 'powiązanie fabularne' : type;
}

interface GraphViewProps {
  visibleTypes: Set<EntityType>;
  visibleRelations: Set<RelationType>;
}

export function GraphView({ visibleTypes, visibleRelations }: GraphViewProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphData = useGraphData(visibleTypes, visibleRelations);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setDimensions({ width: rect.width, height: rect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const n = node as GraphNode;
      navigate(`${ENTITY_ROUTES[n.type]}/${n.id}`);
    },
    [navigate],
  );

  const nodeCanvasObject = useCallback((node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode & { x?: number; y?: number };
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    const r = 6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = NODE_COLORS[n.type] ?? '#999';
    ctx.fill();
    const fontSize = Math.max(8, 12 / globalScale);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#374151';
    ctx.fillText(n.name.length > 18 ? n.name.slice(0, 17) + '…' : n.name, x, y + r + 2);
  }, []);

  const handleNodeHover = useCallback((node: object | null, _prev: object | null, event: MouseEvent) => {
    if (!node) { setTooltip(null); return; }
    const n = node as GraphNode;
    setTooltip({ x: event.clientX + 10, y: event.clientY + 10, label: `${n.name}\n${n.type}` });
  }, []);

  if (!graphData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-surface-400">Ładowanie grafu…</p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-surface-400">Brak encji do wyświetlenia.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 bg-surface-50">
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={{ nodes: graphData.nodes as object[], links: graphData.links as object[] }}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover as Parameters<typeof ForceGraph2D>[0]['onNodeHover']}
        linkColor={() => '#cbd5e1'}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkLabel={(link) => getGraphRelationLabel((link as GraphLink).type)}
        cooldownTicks={100}
        enableNodeDrag
      />
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-[200px] rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-md text-xs whitespace-pre"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
