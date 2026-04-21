import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import { createLocationData, isNamedLocation } from '@modules/locations/types';
import { Modal } from '@shared/components/Modal';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation, assignContainment } from '@shared/db/operations';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import type { Entity } from '@shared/types';

function useLocationContext(focusedId: string | null) {
  const { db } = useCampaign();

  return useLiveQuery(async () => {
    const allLocations = await db.entities.filter(isNamedLocation).toArray();
    const locationSet = new Set(allLocations.map((location) => location.id));

    async function isRoot(id: string): Promise<boolean> {
      const parentRel = await db.relations
        .where('targetId')
        .equals(id)
        .filter((relation) => relation.type === 'contains')
        .first();
      return !parentRel || !locationSet.has(parentRel.sourceId);
    }

    if (!focusedId) {
      const roots: Entity[] = [];
      for (const location of allLocations) {
        if (await isRoot(location.id)) roots.push(location);
      }
      return { focused: null, parent: null, siblings: roots, children: [] };
    }

    const focused = await db.entities.get(focusedId);
    if (!focused) return { focused: null, parent: null, siblings: [], children: [] };

    const parentRel = await db.relations
      .where('targetId')
      .equals(focusedId)
      .filter((relation) => relation.type === 'contains')
      .first();

    let parent: Entity | null = null;
    if (parentRel && locationSet.has(parentRel.sourceId)) {
      const parentEntity = await db.entities.get(parentRel.sourceId);
      if (parentEntity?.type === 'location') parent = parentEntity;
    }

    let siblings: Entity[];
    if (parent) {
      const siblingRelations = await db.relations
        .where('sourceId')
        .equals(parent.id)
        .filter((relation) => relation.type === 'contains')
        .toArray();
      const siblingEntities = await Promise.all(
        siblingRelations.map((relation) => db.entities.get(relation.targetId)),
      );
      siblings = siblingEntities.filter(
        (entity): entity is Entity =>
          entity !== undefined && isNamedLocation(entity) && locationSet.has(entity.id),
      );
    } else {
      siblings = [];
      for (const location of allLocations) {
        if (await isRoot(location.id)) siblings.push(location);
      }
    }

    const childRelations = await db.relations
      .where('sourceId')
      .equals(focusedId)
      .filter((relation) => relation.type === 'contains')
      .toArray();
    const childEntities = await Promise.all(
      childRelations.map((relation) => db.entities.get(relation.targetId)),
    );
    const children = childEntities.filter(
      (entity): entity is Entity =>
        entity !== undefined && isNamedLocation(entity) && locationSet.has(entity.id),
    );

    return { focused, parent, siblings, children };
  }, [db, focusedId]);
}

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

  const base =
    'flex cursor-pointer select-none flex-col items-center gap-2 rounded-[1.35rem] border px-4 py-4 text-center transition-all shadow-[0_12px_24px_rgba(18,45,66,0.08)]';
  const styles: Record<TileProps['variant'], string> = {
    parent: 'app-panel w-40 text-surface-600 hover:border-primary-300 hover:text-primary-700',
    sibling:
      'app-card w-36 text-surface-700 hover:border-primary-300 hover:bg-[rgba(229,231,223,0.98)]',
    focused:
      'w-44 border-primary-300 bg-[linear-gradient(180deg,rgba(186,207,214,0.42)_0%,rgba(163,190,201,0.56)_100%)] text-primary-900 ring-2 ring-primary-200 shadow-[0_18px_36px_rgba(18,45,66,0.12)]',
    child:
      'app-card w-36 text-surface-700 hover:border-primary-300 hover:bg-[rgba(229,231,223,0.98)]',
  };
  const iconSize: Record<TileProps['variant'], string> = {
    parent: 'h-4 w-4 text-surface-400',
    sibling: 'h-4 w-4 text-surface-400',
    focused: 'h-6 w-6 text-primary-500',
    child: 'h-4 w-4 text-surface-400',
  };
  const textSize: Record<TileProps['variant'], string> = {
    parent: 'text-xs font-medium',
    sibling: 'text-sm font-medium',
    focused: 'text-base font-semibold',
    child: 'text-sm font-medium',
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
          <span className="rounded-full border border-emerald-300/70 bg-emerald-100/80 px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-800 uppercase">
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
            className="app-button-secondary text-surface-600 absolute right-3 bottom-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {showAddChild && (
            <div
              className="app-panel-strong absolute top-full left-1/2 z-20 mt-3 w-64 -translate-x-1/2 rounded-[1.35rem] p-4 text-left shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-surface-500 text-xs font-semibold tracking-[0.16em] uppercase">
                Nowa podlokacja
              </p>
              <p className="text-surface-700 mt-2 text-sm">Jak nazwać miejsce w „{entity.name}”?</p>
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
                className="app-input focus:border-primary-500 mt-3 w-full rounded-[1rem] px-3 py-2 text-sm focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChild(false);
                    setChildName('');
                  }}
                  className="app-button-secondary rounded-xl px-3 py-2 text-xs font-medium"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitChild()}
                  disabled={!childName.trim() || savingChild}
                  className="app-button-primary rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {savingChild ? 'Dodawanie...' : 'Dodaj'}
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
    <div className="text-surface-300 flex justify-center py-1">
      <ArrowDown className="h-5 w-5" />
    </div>
  );
}

function DragScrollRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const element = ref.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 0);
    setCanScrollRight(Math.ceil(element.scrollLeft) < element.scrollWidth - element.clientWidth);
  }

  useEffect(() => {
    updateArrows();
    const element = ref.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(updateArrows);
    const mutationObserver = new MutationObserver(updateArrows);
    resizeObserver.observe(element);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  function onMouseDown(event: React.MouseEvent) {
    if (!ref.current) return;
    dragging.current = true;
    startX.current = event.pageX - ref.current.getBoundingClientRect().left;
    scrollLeftRef.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    event.preventDefault();
  }

  function onMouseMove(event: React.MouseEvent) {
    if (!dragging.current || !ref.current) return;
    const positionX = event.pageX - ref.current.getBoundingClientRect().left;
    ref.current.scrollLeft = scrollLeftRef.current - (positionX - startX.current);
  }

  function onMouseUp() {
    dragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  }

  const tileWidth = 156;

  return (
    <div className="relative flex w-full items-center gap-1">
      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: -tileWidth, behavior: 'smooth' })}
        aria-label="Przewiń w lewo"
        className={`text-surface-400 hover:bg-surface-100 hover:text-surface-700 shrink-0 rounded-full p-1 transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={ref}
        className="flex-1 cursor-grab overflow-x-auto text-center select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <div className="inline-flex gap-3 px-3 pb-1 text-left">{children}</div>
      </div>

      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: tileWidth, behavior: 'smooth' })}
        aria-label="Przewiń w prawo"
        className={`text-surface-400 hover:bg-surface-100 hover:text-surface-700 shrink-0 rounded-full p-1 transition-opacity ${
          canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  const context = useLocationContext(focusedId);
  const { focused, parent, siblings, children } = context ?? {
    focused: null,
    parent: null,
    siblings: [],
    children: [],
  };
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
        relations.push(
          addRelation(db, { type: 'appears_in', sourceId: child.id, targetId: sessionId }),
        );
      }

      await Promise.all(relations);
      setFocusedId(child.id);
      toast.success(`Lokacja „${trimmed}” dodana`);
    } catch {
      toast.error('Nie udało się dodać podlokacji');
      throw new Error('Failed to create child location');
    }
  }

  return (
    <Modal title={title} size="xl" onClose={onClose}>
      <div className="app-panel mb-4 rounded-[1.35rem] px-4 py-4">
        <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
          Nawigacja po miejscach
        </p>
        <p className="text-surface-700 mt-2 text-sm leading-6">
          Wybierz aktualną lokację sceny albo dodaj nową podlokację bez wychodzenia z sesji.
        </p>
      </div>

      <div className="relative flex min-h-[380px] flex-col items-center gap-0 rounded-[1.6rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.34)] px-2 py-4 pt-16">
        <button
          type="button"
          onClick={() => setFocusedId(null)}
          className={`absolute top-[10px] left-[10px] flex w-36 flex-col items-center gap-1 rounded-[1.2rem] border px-3 py-3 text-center transition-all ${
            focusedId === null
              ? 'border-primary-300 text-primary-800 ring-primary-200 bg-[linear-gradient(180deg,rgba(186,207,214,0.42)_0%,rgba(163,190,201,0.56)_100%)] shadow-[0_18px_36px_rgba(18,45,66,0.12)] ring-2'
              : 'app-card text-surface-500 hover:border-surface-400 hover:text-surface-700 border-dashed'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-[11px] leading-tight font-medium italic">
            {emptySelectionLabel}
          </span>
          {currentLocationId === null && (
            <span className="rounded-full border border-emerald-300/70 bg-emerald-100/80 px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-800 uppercase">
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
            {siblings.map((location) => (
              <LocationTile
                key={location.id}
                entity={location}
                variant={location.id === focusedId ? 'focused' : 'sibling'}
                isActive={location.id === currentLocationId}
                onClick={() => setFocusedId(location.id)}
                onAddChild={handleAddChild}
              />
            ))}
          </DragScrollRow>
        )}

        {children.length > 0 && (
          <>
            <LevelArrow />
            <DragScrollRow>
              {children.map((location) => (
                <LocationTile
                  key={location.id}
                  entity={location}
                  variant="child"
                  isActive={location.id === currentLocationId}
                  onClick={() => setFocusedId(location.id)}
                  onAddChild={handleAddChild}
                />
              ))}
            </DragScrollRow>
          </>
        )}

        {siblings.length === 0 && !parent && children.length === 0 && (
          <p className="text-surface-500 mt-8 text-sm">Brak lokacji w kampanii.</p>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3 border-t border-[rgba(86,93,94,0.12)] pt-4">
        <button
          type="button"
          onClick={onClose}
          className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect(focusedId);
            onClose();
          }}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium"
        >
          Wybierz: „{focusedName}”
        </button>
      </div>
    </Modal>
  );
}
