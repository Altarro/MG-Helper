import { useState } from 'react';
import { Plus, MapPin, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { createLocationData, isNamedLocation } from '@modules/locations/types';
import type { MgHelperDb } from '@shared/db/database';
import { addEntity, addRelation, assignContainment } from '@shared/db/operations';
import { DroppableLocationZone } from '@shared/components/DroppableLocationZone';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationNodeProps {
  db: MgHelperDb;
  location: Entity;
  sessionId: string;
  depth: number;
  isActive: boolean;
  onSelect: (id: string) => void;
}

// ── Recursive node ────────────────────────────────────────────────────────────

function LocationNode({ db, location, sessionId, depth, isActive, onSelect }: LocationNodeProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState(depth === 0);

  const children = useLiveQuery(async () => {
    const rels = await db.relations
      .where('sourceId')
      .equals(location.id)
      .filter((r) => r.type === 'contains')
      .toArray();
    const ids = rels.map((r) => r.targetId);
    if (ids.length === 0) return [];
    return db.entities
      .where('id')
      .anyOf(ids)
      .filter(isNamedLocation)
      .toArray();
  }, [db, location.id]) ?? [];

  async function handleAddChild() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const child = await addEntity(db, {
        type: 'location',
        name: trimmed,
        description: '',
        tags: [],
        data: createLocationData(),
      });
      await Promise.all([
        assignContainment(db, { sourceId: location.id, targetId: child.id }),
        addRelation(db, { type: 'appears_in', sourceId: child.id, targetId: sessionId }),
      ]);
      toast.success(`Lokacja „${trimmed}" dodana`);
      setNewName('');
      setAdding(false);
      setExpanded(true);
    } catch {
      toast.error('Nie udało się dodać lokacji');
    }
  }

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <DroppableLocationZone locationId={location.id}>
        <div
          className={`group flex items-center gap-1 rounded px-1 py-0.5 text-sm cursor-pointer ${
            isActive
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-surface-700 hover:bg-surface-100'
          }`}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-0.5 flex-1 min-w-0"
          >
            {children.length > 0 ? (
              <ChevronRight
                className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            ) : (
              <MapPin className="h-3 w-3 shrink-0 text-surface-400" />
            )}
            <span className="truncate ml-0.5" onClick={(e) => { e.stopPropagation(); onSelect(location.id); }}>
              {location.name}
            </span>
          </button>
          <button
            onClick={() => setAdding((v) => !v)}
            className="hidden group-hover:flex h-4 w-4 items-center justify-center rounded text-surface-400 hover:text-primary-600"
            title="Dodaj podlokację"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </DroppableLocationZone>

      {adding && (
        <div style={{ paddingLeft: (depth + 1) * 12 }} className="mt-0.5 flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChild();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            placeholder="Nazwa podlokacji…"
            className="flex-1 rounded border border-surface-300 px-2 py-0.5 text-xs focus:border-primary-500 focus:outline-none"
          />
        </div>
      )}

      {expanded &&
        children.map((child) => (
          <LocationNode
            key={child.id}            db={db}            location={child}
            sessionId={sessionId}
            depth={depth + 1}
            isActive={isActive && false}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface LocationTreePanelProps {
  sessionId: string;
  activeLocationId: string | null;
  onSelectLocation: (id: string | null) => void;
}

export function LocationTreePanel({ sessionId, activeLocationId, onSelectLocation }: LocationTreePanelProps) {
  const { db } = useCampaign();
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootName, setRootName] = useState('');

  // Locations that appear_in this session
  const sessionLocations = useLiveQuery(async () => {
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const ids = rels.map((r) => r.sourceId);
    if (ids.length === 0) return [];
    return db.entities
      .where('id')
      .anyOf(ids)
      .filter(isNamedLocation)
      .toArray();
  }, [db, sessionId]) ?? [];

  // Root locations = those NOT referenced as a child of another session location
  const childIds = useLiveQuery(async () => {
    if (sessionLocations.length === 0) return new Set<string>();
    const locIds = sessionLocations.map((l) => l.id);
    const containsRels = await db.relations
      .where('sourceId')
      .anyOf(locIds)
      .filter((r) => r.type === 'contains')
      .toArray();
    return new Set(containsRels.map((r) => r.targetId));
  }, [db, sessionLocations]) ?? new Set<string>();

  const rootLocations = sessionLocations.filter((l) => !childIds.has(l.id));

  async function handleAddRoot() {
    const trimmed = rootName.trim();
    if (!trimmed) return;
    try {
      const loc = await addEntity(db, {
        type: 'location',
        name: trimmed,
        description: '',
        tags: [],
        data: createLocationData(),
      });
      await addRelation(db, { type: 'appears_in', sourceId: loc.id, targetId: sessionId });
      toast.success(`Lokacja „${trimmed}" dodana`);
      setRootName('');
      setAddingRoot(false);
    } catch {
      toast.error('Nie udało się dodać lokacji');
    }
  }

  function handleSelect(id: string) {
    onSelectLocation(activeLocationId === id ? null : id);
  }

  if (rootLocations.length === 0 && !addingRoot) {
    return (
      <div className="text-xs text-surface-400">
        <p className="mb-1">Brak lokacji w sesji.</p>
        <button
          onClick={() => setAddingRoot(true)}
          className="flex items-center gap-1 text-primary-600 hover:underline"
        >
          <Plus className="h-3 w-3" /> Dodaj lokację
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {rootLocations.map((loc) => (
        <LocationNode
          key={loc.id}
          db={db}
          location={loc}
          sessionId={sessionId}
          depth={0}
          isActive={activeLocationId === loc.id}
          onSelect={handleSelect}
        />
      ))}

      {addingRoot ? (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoot();
              if (e.key === 'Escape') { setAddingRoot(false); setRootName(''); }
            }}
            placeholder="Nazwa lokacji…"
            className="flex-1 rounded border border-surface-300 px-2 py-0.5 text-xs focus:border-primary-500 focus:outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingRoot(true)}
          className="mt-1 flex items-center gap-1 text-xs text-surface-400 hover:text-primary-600"
        >
          <Plus className="h-3 w-3" /> Dodaj lokację
        </button>
      )}
    </div>
  );
}
