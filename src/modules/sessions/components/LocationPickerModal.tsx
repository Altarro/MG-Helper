import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin, ArrowDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation, assignContainment } from '@shared/db/operations';
import { Modal } from '@shared/components/Modal';
import { createLocationData, isNamedLocation } from '@modules/locations/types';
import { toast } from 'sonner';
import type { Entity } from '@shared/types';

// ── Data hook ─────────────────────────────────────────────────────────────────

function useLocationContext(focusedId: string | null) {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const allLocations = await db.entities
      .filter(isNamedLocation)
      .toArray();
    const locationSet = new Set(allLocations.map((l) => l.id));

    async function isRoot(id: string): Promise<boolean> {
      const parentRel = await db.relations
        .where('targetId').equals(id)
        .filter((r) => r.type === 'contains')
        .first();
      return !parentRel || !locationSet.has(parentRel.sourceId);
    }

    if (!focusedId) {
      const roots: Entity[] = [];
      for (const loc of allLocations) {
        if (await isRoot(loc.id)) roots.push(loc);
      }
      return { focused: null, parent: null, siblings: roots, children: [] };
    }

    const focused = await db.entities.get(focusedId);
    if (!focused) return { focused: null, parent: null, siblings: [], children: [] };

    // Parent
    const parentRel = await db.relations
      .where('targetId').equals(focusedId)
      .filter((r) => r.type === 'contains')
      .first();
    let parent: Entity | null = null;
    if (parentRel && locationSet.has(parentRel.sourceId)) {
      const pe = await db.entities.get(parentRel.sourceId);
      if (pe?.type === 'location') parent = pe;
    }

    // Siblings (or roots if no parent)
    let siblings: Entity[];
    if (parent) {
      const sibRels = await db.relations
        .where('sourceId').equals(parent.id)
        .filter((r) => r.type === 'contains')
        .toArray();
      const sibRaw = await Promise.all(sibRels.map((r) => db.entities.get(r.targetId)));
      siblings = sibRaw.filter(
        (e): e is Entity => e !== undefined && isNamedLocation(e) && locationSet.has(e.id),
      );
    } else {
      siblings = [];
      for (const loc of allLocations) {
        if (await isRoot(loc.id)) siblings.push(loc);
      }
    }

    // Children
    const childRels = await db.relations
      .where('sourceId').equals(focusedId)
      .filter((r) => r.type === 'contains')
      .toArray();
    const childRaw = await Promise.all(childRels.map((r) => db.entities.get(r.targetId)));
    const children = childRaw.filter(
      (e): e is Entity => e !== undefined && isNamedLocation(e) && locationSet.has(e.id),
    );

    return { focused, parent, siblings, children };
  }, [db, focusedId]);
}

// ── Location tile ─────────────────────────────────────────────────────────────

interface TileProps {
  entity: Entity;
  variant: 'parent' | 'sibling' | 'focused' | 'child';
  isActive: boolean;
  onClick: () => void;
  onAddChild?: (parentId: string, name: string) => Promise<void>;
}

function LocationTile({ entity, variant, isActive, onClick, onAddChild }: TileProps) {
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [savingChild, setSavingChild] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const base = 'flex flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center transition-all cursor-pointer select-none';
  const styles: Record<TileProps['variant'], string> = {
    parent:  'border-surface-200 bg-surface-50 text-surface-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 w-40',
    sibling: 'border-surface-200 bg-white text-surface-700 hover:border-primary-300 hover:bg-surface-50 hover:shadow-sm w-36',
    focused: 'border-primary-400 bg-primary-50 text-primary-800 shadow ring-2 ring-primary-200 w-44',
    child:   'border-surface-200 bg-white text-surface-700 hover:border-primary-300 hover:bg-surface-50 hover:shadow-sm w-36',
  };
  const iconSize: Record<TileProps['variant'], string> = {
    parent: 'h-4 w-4 text-surface-400', sibling: 'h-4 w-4 text-surface-400',
    focused: 'h-6 w-6 text-primary-500', child: 'h-4 w-4 text-surface-400',
  };
  const textSize: Record<TileProps['variant'], string> = {
    parent: 'text-xs font-medium', sibling: 'text-sm font-medium',
    focused: 'text-base font-semibold', child: 'text-sm font-medium',
  };

  useEffect(() => {
    if (variant !== 'focused') {
      setShowAddChild(false);
      setChildName('');
    }
  }, [variant]);

  useEffect(() => {
    if (!showAddChild) return undefined;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!wrapperRef.current?.contains(target)) {
        setShowAddChild(false);
        setChildName('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowAddChild(false);
        setChildName('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAddChild]);

  async function handleSubmitChild() {
    const trimmed = childName.trim();
    if (!trimmed || !onAddChild || savingChild) return;

    setSavingChild(true);
    try {
      await onAddChild(entity.id, trimmed);
      setChildName('');
      setShowAddChild(false);
    } catch {
      // Parent callback already shows an error toast.
    } finally {
      setSavingChild(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button type="button" onClick={onClick} className={`${base} ${styles[variant]}`}>
        <MapPin className={`shrink-0 ${iconSize[variant]}`} />
        <span className={`leading-tight ${textSize[variant]}`}>{entity.name}</span>
        {isActive && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-700">
            aktywna
          </span>
        )}
      </button>
      {variant === 'focused' && onAddChild && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowAddChild((prev) => !prev);
            }}
            aria-label={`Dodaj podlokację w ${entity.name}`}
            title="Dodaj podlokację"
            className="absolute bottom-2 right-2 z-10 inline-flex h-3 w-3 items-center justify-center rounded-full border border-surface-300 bg-white text-surface-400 shadow-sm transition-colors hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-2 w-2" />
          </button>
          {showAddChild && (
            <div
              className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg border border-surface-200 bg-white p-3 text-left shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold text-surface-800">Nowa podlokacja</p>
              <p className="mt-1 text-[11px] text-surface-500">
                Jak nazwać miejsce w "{entity.name}"?
              </p>
              <input
                autoFocus
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSubmitChild();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setShowAddChild(false);
                    setChildName('');
                  }
                }}
                placeholder="Nazwa podlokacji..."
                className="mt-2 w-full rounded-md border border-surface-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChild(false);
                    setChildName('');
                  }}
                  className="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-50"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitChild()}
                  disabled={!childName.trim() || savingChild}
                  className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingChild ? 'Dodaje...' : 'Dodaj'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LevelArrow() {
  return (
    <div className="flex justify-center py-1 text-surface-300">
      <ArrowDown className="h-5 w-5" />
    </div>
  );
}

function DragScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth);
  }

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    const mo = new MutationObserver(updateArrows);
    ro.observe(el);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    dragging.current = true;
    startX.current = e.pageX - ref.current.getBoundingClientRect().left;
    scrollLeftRef.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !ref.current) return;
    const x = e.pageX - ref.current.getBoundingClientRect().left;
    ref.current.scrollLeft = scrollLeftRef.current - (x - startX.current);
  }

  function onMouseUp() {
    dragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  }

  const TILE = 156; // w-36 (144px) + gap-3 (12px)

  return (
    <div className="relative flex w-full items-center gap-1">
      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: -TILE, behavior: 'smooth' })}
        aria-label="Przewiń w lewo"
        className={`shrink-0 rounded-full p-1 text-surface-400 transition-opacity hover:bg-surface-100 hover:text-surface-700 ${
          canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={ref}
        className="flex-1 cursor-grab select-none overflow-x-auto text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent, black 48px' : 'black'}, ${canScrollRight ? 'black calc(100% - 48px), transparent' : 'black'})`,
          WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent, black 48px' : 'black'}, ${canScrollRight ? 'black calc(100% - 48px), transparent' : 'black'})`,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onScroll={updateArrows}
      >
        <div className="inline-flex gap-3 px-3 pb-1 text-left">
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: TILE, behavior: 'smooth' })}
        aria-label="Przewiń w prawo"
        className={`shrink-0 rounded-full p-1 text-surface-400 transition-opacity hover:bg-surface-100 hover:text-surface-700 ${
          canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LocationPickerModalProps {
  title?: string;
  emptySelectionLabel?: string;
  sessionId?: string;
  currentLocationId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export function LocationPickerModal({
  title = 'Wybierz lokację',
  emptySelectionLabel = 'Pusta scena',
  sessionId,
  currentLocationId,
  onSelect,
  onClose,
}: LocationPickerModalProps) {
  const { db } = useCampaign();
  const [focusedId, setFocusedId] = useState<string | null>(currentLocationId);
  const ctx = useLocationContext(focusedId);
  const { focused, parent, siblings, children } = ctx ?? { focused: null, parent: null, siblings: [], children: [] };
  const focusedName = focused?.name ?? emptySelectionLabel;

  async function handleAddChild(parentId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const child = await addEntity(db, {
        type: 'location',
        name: trimmed,
        description: '',
        tags: [],
        data: createLocationData(),
      });

      const relations: Promise<unknown>[] = [
        assignContainment(db, { sourceId: parentId, targetId: child.id }),
      ];

      if (sessionId) {
        relations.push(addRelation(db, { type: 'appears_in', sourceId: child.id, targetId: sessionId }));
      }

      await Promise.all(relations);
      setFocusedId(child.id);
      toast.success(`Lokacja "${trimmed}" dodana`);
    } catch {
      toast.error('Nie udało się dodać podlokacji');
      throw new Error('Failed to create child location');
    }
  }

  return (
    <Modal title={title} size="xl" onClose={onClose}>
      <div className="relative min-h-[360px] flex flex-col items-center gap-0 py-2 pt-14">

        {/* Pusta scena — fixed in top-left corner */}
        <button
          type="button"
          onClick={() => setFocusedId(null)}
          className={`absolute top-[10px] left-[10px] flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center transition-all w-32 ${
            focusedId === null
              ? 'border-primary-400 bg-primary-50 text-primary-700 shadow ring-2 ring-primary-200'
              : 'border-dashed border-surface-300 text-surface-400 hover:border-surface-400 hover:text-surface-600'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium italic leading-tight">{emptySelectionLabel}</span>
          {currentLocationId === null && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-700">
              aktywna
            </span>
          )}
        </button>

        {parent && (
          <>
            <div className="flex justify-center">
              <LocationTile
                entity={parent}
                variant="parent"
                isActive={parent.id === currentLocationId}
                onClick={() => setFocusedId(parent.id)}
                onAddChild={handleAddChild}
              />
            </div>
            <LevelArrow />
          </>
        )}
        {siblings.length > 0 && (
          <DragScrollRow>
            {siblings.map((loc) => (
              <LocationTile
                key={loc.id}
                entity={loc}
                variant={loc.id === focusedId ? 'focused' : 'sibling'}
                isActive={loc.id === currentLocationId}
                onClick={() => setFocusedId(loc.id)}
                onAddChild={handleAddChild}
              />
            ))}
          </DragScrollRow>
        )}
        {children.length > 0 && (
          <>
            <LevelArrow />
            <DragScrollRow>
              {children.map((loc) => (
                <LocationTile
                  key={loc.id}
                  entity={loc}
                  variant="child"
                  isActive={loc.id === currentLocationId}
                  onClick={() => setFocusedId(loc.id)}
                  onAddChild={handleAddChild}
                />
              ))}
            </DragScrollRow>
          </>
        )}
        {siblings.length === 0 && !parent && children.length === 0 && (
          <p className="mt-8 text-sm text-surface-400">Brak lokacji w kampanii</p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-3 border-t border-surface-200 pt-4">
        <button type="button" onClick={onClose} className="rounded-md border border-surface-300 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50">Anuluj</button>
        <button type="button" onClick={() => { onSelect(focusedId); onClose(); }} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Wybierz: „{focusedName}"</button>
      </div>
    </Modal>
  );
}
