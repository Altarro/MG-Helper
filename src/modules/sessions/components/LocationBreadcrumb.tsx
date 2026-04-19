import { useState, useRef, type RefObject } from 'react';
import { ChevronRight, Info, MapPin, Search, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { AnchoredPanel } from '@shared/components/AnchoredPanel';
import { isNamedLocation } from '@modules/locations/types';
import { LocationPreviewModal } from './LocationPreviewModal';
import type { Entity } from '@shared/types';
import type { Relation } from '@shared/types';

// ── Build ancestor chain for breadcrumb ───────────────────────────────────────

function useLocationAncestors(locationId: string | null) {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!locationId) return [];
      const chain: Entity[] = [];
      let currentId: string | null = locationId;
      const visited = new Set<string>();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const entity = await db.entities.get(currentId);
        if (!entity) break;
        chain.unshift(entity);
        // Find parent (contains relation where this entity is targetId + type=location)
        const parentRel: Relation | undefined = await db.relations
          .where('targetId')
          .equals(currentId)
          .filter((r) => r.type === 'contains')
          .first();
        currentId = parentRel ? parentRel.sourceId : null;
        if (currentId) {
          const parentEntity = await db.entities.get(currentId);
          if (!parentEntity || parentEntity.type !== 'location') currentId = null;
        }
      }
      return chain;
    }, [db, locationId]) ?? []
  );
}

// ── LocationTreePopover ───────────────────────────────────────────────────────

interface LocationTreeNodeProps {
  locationId: string;
  sessionId: string;
  depth: number;
  onSelect: (id: string) => void;
}

function LocationTreeNode({ locationId, sessionId, depth, onSelect }: LocationTreeNodeProps) {
  const { db } = useCampaign();
  const [expanded, setExpanded] = useState(depth === 0);

  const entity = useLiveQuery(() => db.entities.get(locationId), [db, locationId]);

  const children = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId')
      .equals(locationId)
      .filter((r) => r.type === 'contains')
      .toArray();
    const ids = rels.map((r) => r.targetId);
    if (ids.length === 0) return [];
    // Filter to only locations that appear_in the session
    const sessionRels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const sessionIds = new Set(sessionRels.map((r) => r.sourceId));
    return db.entities
      .where('id')
      .anyOf(ids)
      .filter((e) => isNamedLocation(e) && sessionIds.has(e.id))
      .toArray();
  }, [db, locationId, sessionId]) ?? [];

  if (!entity) return null;

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-5 w-5 items-center justify-center rounded text-surface-400 hover:text-surface-700"
        >
          {children.length > 0 ? (
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(entity.id)}
          className="flex-1 min-w-0 rounded px-1 py-0.5 text-left text-sm text-surface-800 hover:bg-primary-50 hover:text-primary-700"
        >
          {entity.name}
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <LocationTreeNode
            key={child.id}
            locationId={child.id}
            sessionId={sessionId}
            depth={depth + 1}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

interface LocationPickerPanelProps {
  anchorRef: RefObject<HTMLElement | null>;
  sessionId: string;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

function LocationPickerPanel({ anchorRef, sessionId, onSelect, onClose }: LocationPickerPanelProps) {
  const { db } = useCampaign();
  const [searchQuery, setSearchQuery] = useState('');

  // All session locations + derive root ones
  const locationData = useLiveQuery(async () => {
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(rels.map((r) => db.entities.get(r.sourceId)));
    const locations = entities.filter(
      (e): e is Entity => e !== undefined && isNamedLocation(e),
    );
    const locationIds = new Set(locations.map((l) => l.id));
    const rootOnes: Entity[] = [];
    for (const loc of locations) {
      const parentRel = await db.relations
        .where('targetId')
        .equals(loc.id)
        .filter((r) => r.type === 'contains')
        .first();
      if (!parentRel || !locationIds.has(parentRel.sourceId)) {
        rootOnes.push(loc);
      }
    }
    return { rootOnes, allLocations: locations };
  }, [db, sessionId]);

  const rootLocations = locationData?.rootOnes ?? [];
  const allLocations = locationData?.allLocations ?? [];

  const q = searchQuery.toLowerCase().trim();
  const searchResults = q ? allLocations.filter((l) => l.name.toLowerCase().includes(q)) : [];

  return (
    <AnchoredPanel anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <div className="min-w-[240px] rounded-lg border border-surface-200 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-surface-100 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-surface-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj lokacji…"
            className="flex-1 text-sm outline-none placeholder:text-surface-400"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-surface-400 hover:text-surface-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* "Pusta scena" button */}
        <button
          type="button"
          onClick={() => { onSelect(null); onClose(); }}
          className="flex w-full items-center gap-2 border-b border-surface-100 px-3 py-1.5 text-left text-sm text-surface-500 hover:bg-surface-50 hover:text-surface-800"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="italic">Pusta scena</span>
        </button>

        <div className="max-h-56 overflow-y-auto p-1">
          {q ? (
            searchResults.length === 0 ? (
              <p className="px-2 py-2 text-xs text-surface-400">Brak wyników</p>
            ) : (
              searchResults.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => { onSelect(loc.id); onClose(); }}
                  className="flex w-full items-center rounded px-2 py-1 text-left text-sm text-surface-800 hover:bg-primary-50 hover:text-primary-700"
                >
                  {loc.name}
                </button>
              ))
            )
          ) : rootLocations.length === 0 ? (
            <p className="px-1 py-2 text-xs text-surface-400">Brak nazwanych lokacji w sesji</p>
          ) : (
            rootLocations.map((loc) => (
              <LocationTreeNode
                key={loc.id}
                locationId={loc.id}
                sessionId={sessionId}
                depth={0}
                onSelect={(id) => { onSelect(id); onClose(); }}
              />
            ))
          )}
        </div>
      </div>
    </AnchoredPanel>
  );
}

// ── LocationBreadcrumb ────────────────────────────────────────────────────────

interface LocationBreadcrumbProps {
  sessionId: string;
  currentLocationId: string | null;
  onSelect: (id: string | null) => void;
}

export function LocationBreadcrumb({
  sessionId,
  currentLocationId,
  onSelect,
}: LocationBreadcrumbProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [previewLocationId, setPreviewLocationId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ancestors = useLocationAncestors(currentLocationId);

  return (
    <div className="relative flex items-center gap-1 text-sm">
      {/* Root button — always visible */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
        aria-label="Wybierz lokację"
      >
        <MapPin className="h-3.5 w-3.5" />
        {currentLocationId === null && (
          <span className="text-xs text-surface-400 italic">Pusta scena</span>
        )}
      </button>

      {/* Ancestor breadcrumb chain */}
      {ancestors.map((loc, i) => (
        <span key={loc.id} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-surface-300" />
          {i < ancestors.length - 1 ? (
            <button
              type="button"
              onClick={() => onSelect(loc.id)}
              className="rounded px-1 py-0.5 text-xs text-surface-500 hover:text-surface-800"
            >
              {loc.name}
            </button>
          ) : (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setPopoverOpen((v) => !v)}
                className="rounded px-1 py-0.5 text-xs font-medium text-surface-800 hover:bg-surface-100"
              >
                {loc.name}
              </button>
              <button
                type="button"
                onClick={() => setPreviewLocationId(loc.id)}
                aria-label="Podgląd lokacji"
                className="rounded p-0.5 text-surface-400 hover:text-surface-700"
              >
                <Info className="h-3 w-3" />
              </button>
            </span>
          )}
        </span>
      ))}

      {/* Clear button */}
      {currentLocationId && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Wyczyść lokację"
          className="rounded p-0.5 text-surface-400 hover:text-surface-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Floating picker (AnchoredPanel) */}
      {previewLocationId && (
        <LocationPreviewModal
          locationId={previewLocationId}
          sessionId={sessionId}
          onClose={() => setPreviewLocationId(null)}
        />
      )}

      {popoverOpen && (
        <LocationPickerPanel
          anchorRef={triggerRef}
          sessionId={sessionId}
          onSelect={onSelect}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </div>
  );
}
