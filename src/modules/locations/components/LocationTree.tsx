import { ChevronRight, MapPin, Plus } from 'lucide-react';
import type { LocationTreeNode } from '../hooks/useLocationTree';

interface LocationTreeProps {
  nodes: LocationTreeNode[];
  depth?: number;
  onNavigate: (id: string) => void;
  /** Called when user wants to add a sub-location under parentId */
  onAddChild?: (parentId: string) => void;
}

export function LocationTree({ nodes, depth = 0, onNavigate, onAddChild }: LocationTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className={depth === 0 ? 'flex flex-col gap-1' : 'ml-5 mt-1 flex flex-col gap-1 border-l border-surface-200 pl-3'}>
      {nodes.map(({ location, children }) => (
        <li key={location.id}>
          <div className="flex items-center gap-1 group">
            <button
              type="button"
              onClick={() => onNavigate(location.id)}
              className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-surface-700 hover:bg-surface-50 hover:text-surface-900 text-left min-w-0"
            >
              {children.length > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-surface-400" />
              ) : (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-surface-300" />
              )}
              <span className="truncate">{location.name}</span>
            </button>
            {onAddChild && (
              <button
                type="button"
                onClick={() => onAddChild(location.id)}
                aria-label={`Dodaj podlokację w ${location.name}`}
                className="hidden shrink-0 rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 group-hover:flex"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {children.length > 0 && (
            <LocationTree
              nodes={children}
              depth={depth + 1}
              onNavigate={onNavigate}
              onAddChild={onAddChild}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
