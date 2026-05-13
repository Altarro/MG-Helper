import { useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Compass,
  Flame,
  GitBranchPlus,
  MapPin,
  Maximize2,
  Milestone,
  Minus,
  Move,
  Package,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  canAddMindMapChild,
  createInitialMindMapDraft,
  getAllowedMindMapChildren,
  getMindMapDescendantIds,
  MIND_MAP_DEFAULT_NAMES,
  MIND_MAP_ENTITY_LABELS,
  MIND_MAP_ENTITY_TYPES,
  removeMindMapNodeWithDescendants,
  summarizeMindMapDraft,
  type MindMapDraftNode,
  type MindMapEntityType,
} from '../mindMapModel';

const NODE_WIDTH = 188;
const NODE_HEIGHT = 66;
const X_GAP = 270;
const Y_GAP = 98;
const CANVAS_PADDING = 96;

type LayoutPoint = { x: number; y: number };
type DragState = {
  nodeId: string;
  pointerId: number;
  startX: number;
  startY: number;
  initialOffset: LayoutPoint;
};

const TYPE_ICONS: Record<MindMapEntityType, typeof Flame> = {
  front: Flame,
  threat: AlertTriangle,
  thread: Milestone,
  clue: Compass,
  npc: Users,
  location: MapPin,
  faction: Shield,
  item: Package,
};

const TYPE_STYLES: Record<MindMapEntityType, { node: string; badge: string; line: string }> = {
  front: {
    node: 'border-rose-200 bg-rose-50 text-rose-950 shadow-[0_14px_34px_rgba(159,18,57,0.12)]',
    badge: 'bg-rose-100 text-rose-800 ring-rose-200',
    line: '#be123c',
  },
  threat: {
    node: 'border-orange-200 bg-orange-50 text-orange-950 shadow-[0_12px_30px_rgba(194,65,12,0.1)]',
    badge: 'bg-orange-100 text-orange-800 ring-orange-200',
    line: '#c2410c',
  },
  thread: {
    node: 'border-violet-200 bg-violet-50 text-violet-950 shadow-[0_12px_30px_rgba(109,40,217,0.09)]',
    badge: 'bg-violet-100 text-violet-800 ring-violet-200',
    line: '#7c3aed',
  },
  clue: {
    node: 'border-cyan-200 bg-cyan-50 text-cyan-950 shadow-[0_10px_26px_rgba(8,145,178,0.08)]',
    badge: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
    line: '#0891b2',
  },
  npc: {
    node: 'border-blue-200 bg-blue-50 text-blue-950 shadow-[0_10px_26px_rgba(37,99,235,0.08)]',
    badge: 'bg-blue-100 text-blue-800 ring-blue-200',
    line: '#2563eb',
  },
  location: {
    node: 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[0_10px_26px_rgba(5,150,105,0.08)]',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    line: '#059669',
  },
  faction: {
    node: 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-[0_10px_26px_rgba(79,70,229,0.08)]',
    badge: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
    line: '#4f46e5',
  },
  item: {
    node: 'border-teal-200 bg-teal-50 text-teal-950 shadow-[0_10px_26px_rgba(13,148,136,0.08)]',
    badge: 'bg-teal-100 text-teal-800 ring-teal-200',
    line: '#0d9488',
  },
};

function buildChildrenMap(nodes: readonly MindMapDraftNode[]) {
  const childrenByParent = new Map<string, MindMapDraftNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  return childrenByParent;
}

function getVisibleNodeIds(nodes: readonly MindMapDraftNode[]) {
  const root = nodes.find((node) => node.parentId === null);
  const visibleIds = new Set<string>();
  if (!root) return visibleIds;

  const childrenByParent = buildChildrenMap(nodes);
  const stack = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    visibleIds.add(node.id);
    if (node.collapsed) continue;
    const children = childrenByParent.get(node.id) ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child) stack.push(child);
    }
  }

  return visibleIds;
}

function computeLayout(nodes: readonly MindMapDraftNode[]) {
  const root = nodes.find((node) => node.parentId === null);
  const visibleIds = getVisibleNodeIds(nodes);
  const childrenByParent = buildChildrenMap(nodes);
  const positions = new Map<string, LayoutPoint>();
  let leafIndex = 0;

  function place(node: MindMapDraftNode, depth: number): number {
    const visibleChildren = (childrenByParent.get(node.id) ?? []).filter((child) => visibleIds.has(child.id));
    const childYs = node.collapsed ? [] : visibleChildren.map((child) => place(child, depth + 1));
    const y =
      childYs.length > 0
        ? (Math.min(...childYs) + Math.max(...childYs)) / 2
        : CANVAS_PADDING + leafIndex++ * Y_GAP;

    positions.set(node.id, { x: CANVAS_PADDING + depth * X_GAP, y });
    return y;
  }

  if (root) place(root, 0);

  return { positions, visibleIds };
}

function getNodePosition(
  nodeId: string,
  positions: Map<string, LayoutPoint>,
  offsets: Record<string, LayoutPoint>,
): LayoutPoint {
  const base = positions.get(nodeId) ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
  const offset = offsets[nodeId] ?? { x: 0, y: 0 };
  return { x: base.x + offset.x, y: base.y + offset.y };
}

function clampZoom(value: number) {
  return Math.min(1.4, Math.max(0.65, value));
}

export function MindMapPanel() {
  const [nodes, setNodes] = useState<MindMapDraftNode[]>(() => createInitialMindMapDraft());
  const [selectedId, setSelectedId] = useState('root');
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState<LayoutPoint>({ x: 0, y: 0 });
  const [offsets, setOffsets] = useState<Record<string, LayoutPoint>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const nextId = useRef(1);

  const { positions, visibleIds } = useMemo(() => computeLayout(nodes), [nodes]);
  const visibleNodes = nodes.filter((node) => visibleIds.has(node.id));
  const childrenByParent = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const summary = useMemo(() => summarizeMindMapDraft(nodes), [nodes]);
  const unnamedCount = nodes.filter((node) => node.name.trim().length === 0).length;

  const bounds = useMemo(() => {
    const points = visibleNodes.map((node) => getNodePosition(node.id, positions, offsets));
    const maxX = Math.max(...points.map((point) => point.x), CANVAS_PADDING);
    const maxY = Math.max(...points.map((point) => point.y), CANVAS_PADDING);
    return {
      width: maxX + NODE_WIDTH + CANVAS_PADDING,
      height: maxY + NODE_HEIGHT + CANVAS_PADDING,
    };
  }, [offsets, positions, visibleNodes]);

  function updateNodeName(nodeId: string, name: string) {
    setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, name } : node)));
  }

  function addChild(parent: MindMapDraftNode, type: MindMapEntityType) {
    if (!canAddMindMapChild(parent.type, type)) return;

    const child: MindMapDraftNode = {
      id: `${type}-${nextId.current++}`,
      parentId: parent.id,
      type,
      name: MIND_MAP_DEFAULT_NAMES[type],
      collapsed: false,
    };

    setNodes((current) => [...current, child]);
    setSelectedId(child.id);
    setOpenMenuFor(null);
  }

  function removeNode(nodeId: string) {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node || node.parentId === null) return;

    const descendantIds = getMindMapDescendantIds(nodes, nodeId);
    setNodes((current) => removeMindMapNodeWithDescendants(current, nodeId));
    setOffsets((current) => {
      const next = { ...current };
      delete next[nodeId];
      for (const id of descendantIds) delete next[id];
      return next;
    });
    setSelectedId(node.parentId);
    setOpenMenuFor(null);
  }

  function toggleCollapsed(nodeId: string) {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, collapsed: !node.collapsed } : node)),
    );
  }

  function resetDraft() {
    setNodes(createInitialMindMapDraft());
    setSelectedId('root');
    setOpenMenuFor(null);
    setOffsets({});
    setPan({ x: 0, y: 0 });
    setZoom(0.9);
    nextId.current = 1;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, nodeId: string) {
    if ((event.target as HTMLElement).closest('button, input')) return;
    const currentOffset = offsets[nodeId] ?? { x: 0, y: 0 };
    setSelectedId(nodeId);
    setDrag({
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialOffset: currentOffset,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    setOffsets((current) => ({
      ...current,
      [drag.nodeId]: {
        x: drag.initialOffset.x + dx,
        y: drag.initialOffset.y + dy,
      },
    }));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    event.currentTarget.releasePointerCapture(drag.pointerId);
    setDrag(null);
  }

  return (
    <div className="grid min-h-[660px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" data-testid="mind-map-panel">
      <section className="app-panel overflow-hidden rounded-[1.5rem]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200/80 px-4 py-3">
          <div>
            <div className="text-primary-700 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <GitBranchPlus className="h-4 w-4" aria-hidden />
              Mapa myśli
            </div>
            <p className="mt-1 text-xs text-surface-500">
              Osobny szkic w Za kulisami. Na tym etapie nic nie zapisuje encji.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="rounded-xl p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              aria-label="Oddal mapę"
              title="Oddal mapę"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-surface-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="rounded-xl p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              aria-label="Przybliż mapę"
              title="Przybliż mapę"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-xl p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
              onClick={() => setPan({ x: 0, y: 0 })}
              aria-label="Wyśrodkuj mapę"
              title="Wyśrodkuj mapę"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-xl p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
              onClick={resetDraft}
              aria-label="Wyczyść szkic mapy"
              title="Wyczyść szkic mapy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-surface-200/70 bg-surface-50/80 px-4 py-2">
          {[
            ['left', 'W lewo', -120, 0],
            ['right', 'W prawo', 120, 0],
            ['up', 'W górę', 0, -90],
            ['down', 'W dół', 0, 90],
          ].map(([key, label, dx, dy]) => (
            <button
              key={key}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-white px-2.5 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-50 hover:text-surface-900"
              onClick={() => setPan((current) => ({ x: current.x + Number(dx), y: current.y + Number(dy) }))}
            >
              <Move className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="h-[560px] overflow-auto bg-[linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:32px_32px]">
          <div
            className="relative"
            style={{
              width: bounds.width,
              height: bounds.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={bounds.width}
              height={bounds.height}
              aria-hidden="true"
            >
              {visibleNodes.flatMap((node) => {
                if (node.collapsed) return [];
                const parentPosition = getNodePosition(node.id, positions, offsets);
                return (childrenByParent.get(node.id) ?? [])
                  .filter((child) => visibleIds.has(child.id))
                  .map((child) => {
                    const childPosition = getNodePosition(child.id, positions, offsets);
                    const startX = parentPosition.x + NODE_WIDTH - 6;
                    const startY = parentPosition.y + NODE_HEIGHT / 2;
                    const endX = childPosition.x + 6;
                    const endY = childPosition.y + NODE_HEIGHT / 2;
                    const curve = Math.max(70, (endX - startX) * 0.45);

                    return (
                      <path
                        key={`${node.id}-${child.id}`}
                        d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke={TYPE_STYLES[child.type].line}
                        strokeLinecap="round"
                        strokeOpacity="0.42"
                        strokeWidth="3"
                      />
                    );
                  });
              })}
            </svg>

            {visibleNodes.map((node) => {
              const position = getNodePosition(node.id, positions, offsets);
              const allowedChildren = getAllowedMindMapChildren(node.type);
              const Icon = TYPE_ICONS[node.type];
              const isSelected = selectedId === node.id;
              const directChildren = childrenByParent.get(node.id) ?? [];

              return (
                <div
                  key={node.id}
                  className={`absolute rounded-2xl border px-3 py-2 transition-shadow ${
                    TYPE_STYLES[node.type].node
                  } ${isSelected ? 'ring-primary-400 ring-2 ring-offset-2' : ''}`}
                  style={{ left: position.x, top: position.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
                  onPointerDown={(event) => handlePointerDown(event, node.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <button
                    type="button"
                    className="block w-full cursor-grab text-left active:cursor-grabbing"
                    onClick={() => setSelectedId(node.id)}
                  >
                    <span
                      className={`mb-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        TYPE_STYLES[node.type].badge
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{MIND_MAP_ENTITY_LABELS[node.type]}</span>
                    </span>
                    <span className="block truncate text-sm font-semibold" title={node.name || 'Bez nazwy'}>
                      {node.name.trim() || 'Bez nazwy'}
                    </span>
                  </button>

                  <div className="absolute -right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {directChildren.length > 0 ? (
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white text-surface-600 shadow-sm transition-colors hover:text-primary-700"
                        onClick={() => toggleCollapsed(node.id)}
                        aria-label={node.collapsed ? `Rozwiń ${node.name}` : `Zwiń ${node.name}`}
                        title={node.collapsed ? 'Rozwiń' : 'Zwiń'}
                      >
                        {node.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}

                    {allowedChildren.length > 0 ? (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
                        onClick={() => setOpenMenuFor((current) => (current === node.id ? null : node.id))}
                        aria-label={`Dodaj gałąź do ${node.name}`}
                        title="Dodaj gałąź"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  {openMenuFor === node.id && (
                    <div
                      className="absolute left-[calc(100%+1.25rem)] top-0 z-20 min-w-44 rounded-xl border border-surface-200 bg-white p-1.5 shadow-lg"
                      role="menu"
                    >
                      {allowedChildren.map((childType) => {
                        const ChildIcon = TYPE_ICONS[childType];
                        return (
                          <button
                            key={childType}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-950"
                            onClick={() => addChild(node, childType)}
                            role="menuitem"
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" aria-hidden />
                            {MIND_MAP_ENTITY_LABELS[childType]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="app-panel rounded-[1.5rem] p-4">
          <h3 className="text-sm font-semibold text-surface-900">Właściwości węzła</h3>
          {selectedNode ? (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="mind-map-node-name" className="text-xs font-semibold text-surface-600">
                  Nazwa
                </label>
                <input
                  id="mind-map-node-name"
                  value={selectedNode.name}
                  onChange={(event) => updateNodeName(selectedNode.id, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">Typ</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-surface-800">
                  {MIND_MAP_ENTITY_LABELS[selectedNode.type]}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">
                  Dozwolone dzieci
                </div>
                <div className="flex flex-wrap gap-2">
                  {getAllowedMindMapChildren(selectedNode.type).length > 0 ? (
                    getAllowedMindMapChildren(selectedNode.type).map((childType) => (
                      <button
                        key={childType}
                        type="button"
                        className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-950"
                        onClick={() => addChild(selectedNode, childType)}
                      >
                        {MIND_MAP_ENTITY_LABELS[childType]}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-surface-500">Ten typ jest liściem mapy.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
                  onClick={() => toggleCollapsed(selectedNode.id)}
                  disabled={(childrenByParent.get(selectedNode.id) ?? []).length === 0}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                  {selectedNode.collapsed ? 'Rozwiń' : 'Zwiń'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => removeNode(selectedNode.id)}
                  disabled={selectedNode.parentId === null}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Usuń
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="app-panel rounded-[1.5rem] p-4">
          <h3 className="text-sm font-semibold text-surface-900">Podsumowanie szkicu</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MIND_MAP_ENTITY_TYPES.filter((type) => summary[type] > 0).map((type) => (
              <div key={type} className="rounded-xl border border-surface-200 bg-white px-3 py-2">
                <div className="text-[11px] font-medium text-surface-500">{MIND_MAP_ENTITY_LABELS[type]}</div>
                <div className="text-lg font-semibold text-surface-900">{summary[type]}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-primary-200 bg-primary-50/70 p-3 text-xs leading-5 text-primary-900">
            To jeszcze szkic roboczy. Generowanie encji i relacji zostaje osobnym, późniejszym etapem.
          </div>
          {unnamedCount > 0 ? (
            <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-900">
              {unnamedCount === 1 ? 'Jeden węzeł nie ma nazwy.' : `${unnamedCount} węzły nie mają nazwy.`}
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
