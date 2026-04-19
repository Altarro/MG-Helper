import { Link } from 'react-router';
import type { Threat } from '../types';

interface ThreatGenealogySectionProps {
  threats: Threat[];
  returnToSessionLive?: string | null;
}

interface ThreatNode {
  threat: Threat;
  children: ThreatNode[];
}

function buildThreatForest(threats: Threat[]): ThreatNode[] {
  const byId = new Map(threats.map((threat) => [threat.id, threat]));
  const childrenByParent = new Map<string, Threat[]>();
  const roots: Threat[] = [];

  for (const threat of threats) {
    const parentId = typeof threat.data.forkThreatId === 'string' ? threat.data.forkThreatId : '';
    if (parentId && byId.has(parentId)) {
      const bucket = childrenByParent.get(parentId) ?? [];
      bucket.push(threat);
      childrenByParent.set(parentId, bucket);
    } else {
      roots.push(threat);
    }
  }

  const sortThreats = (items: Threat[]) => [...items].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const buildNode = (threat: Threat): ThreatNode => ({
    threat,
    children: sortThreats(childrenByParent.get(threat.id) ?? []).map(buildNode),
  });

  return sortThreats(roots).map(buildNode);
}

function ThreatGenealogyNode({
  node,
  depth,
  returnToSessionLive,
}: {
  node: ThreatNode;
  depth: number;
  returnToSessionLive?: string | null;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <li className="space-y-2">
      <div
        className="rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-sm"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center gap-2 text-sm">
          {depth > 0 && <span className="text-surface-300">↳</span>}
          <Link
            to={`/threats/${node.threat.id}`}
            state={returnToSessionLive ? { returnToSessionLive } : undefined}
            className="font-medium text-primary-700 hover:underline"
          >
            {node.threat.name}
          </Link>
        </div>
        {typeof node.threat.data.inheritanceNotes === 'string' && node.threat.data.inheritanceNotes.trim().length > 0 && (
          <p className="mt-1 text-xs text-surface-500 line-clamp-3">
            {node.threat.data.inheritanceNotes}
          </p>
        )}
        {hasChildren && (
          <p className="mt-1 text-xs text-surface-400">
            Wynikające dalej: {node.children.length}
          </p>
        )}
      </div>

      {hasChildren && (
        <ul className="space-y-2">
          {node.children.map((child) => (
            <ThreatGenealogyNode
              key={child.threat.id}
              node={child}
              depth={depth + 1}
              returnToSessionLive={returnToSessionLive}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ThreatGenealogySection({ threats, returnToSessionLive }: ThreatGenealogySectionProps) {
  const forest = buildThreatForest(threats);
  const hasDerivedThreats = threats.some((threat) => typeof threat.data.forkThreatId === 'string' && threat.data.forkThreatId.trim().length > 0);

  if (!hasDerivedThreats) {
    return (
      <p className="text-sm text-surface-500">
        W tym froncie nie ma jeszcze łańcuchów zagrożeń wynikających.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {forest.map((node) => (
        <ThreatGenealogyNode
          key={node.threat.id}
          node={node}
          depth={0}
          returnToSessionLive={returnToSessionLive}
        />
      ))}
    </ul>
  );
}
