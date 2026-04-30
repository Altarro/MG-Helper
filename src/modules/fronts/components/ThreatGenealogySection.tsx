import { AlertTriangle, ArrowDownRight, GitBranch, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { getThreatStatus } from '@shared/utils/entityData';
import { useCampaign } from '@shared/db/CampaignContext';
import { getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import type { Threat } from '../types';

interface ThreatGenealogySectionProps {
  threats: Threat[];
  returnToSessionLive?: string | null;
}

interface ThreatNode {
  threat: Threat;
  children: ThreatNode[];
}

function buildThreatForest(threats: Threat[]) {
  const byId = new Map(threats.map((threat) => [threat.id, threat]));
  const childrenByParent = new Map<string, Threat[]>();
  const roots: Threat[] = [];
  const chainedIds = new Set<string>();

  for (const threat of threats) {
    const parentId =
      typeof threat.data.forkThreatId === 'string' ? threat.data.forkThreatId.trim() : '';
    if (parentId && byId.has(parentId)) {
      const bucket = childrenByParent.get(parentId) ?? [];
      bucket.push(threat);
      childrenByParent.set(parentId, bucket);
      chainedIds.add(threat.id);
      chainedIds.add(parentId);
    } else {
      roots.push(threat);
    }
  }

  const sortThreats = (items: Threat[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const buildNode = (threat: Threat): ThreatNode => ({
    threat,
    children: sortThreats(childrenByParent.get(threat.id) ?? []).map(buildNode),
  });

  const forest = sortThreats(roots).map(buildNode);
  const chainRoots = forest.filter((node) => node.children.length > 0);
  const standaloneThreats = sortThreats(threats.filter((threat) => !chainedIds.has(threat.id)));

  return { chainRoots, standaloneThreats, chainedIds };
}

function summarizeThreat(threat: Threat) {
  const inheritanceNotes =
    typeof threat.data.inheritanceNotes === 'string' ? threat.data.inheritanceNotes.trim() : '';
  const impulse = typeof threat.data.impulse === 'string' ? threat.data.impulse.trim() : '';
  return inheritanceNotes || impulse;
}

function genealogyRole(depth: number) {
  return depth === 0 ? 'Źródło' : 'Następstwo';
}

function countDescendants(node: ThreatNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

function ThreatGenealogyNode({
  node,
  depth,
  returnToSessionLive,
  campaignId,
}: {
  node: ThreatNode;
  depth: number;
  returnToSessionLive?: string | null;
  campaignId: string;
}) {
  const summary = summarizeThreat(node.threat);
  const hasChildren = node.children.length > 0;
  const status = getThreatStatus(node.threat);
  const isCompleted = status === 'completed';
  const descendants = countDescendants(node);

  return (
    <li className="space-y-3">
      <div className="relative">
        {depth > 0 && (
          <div className="pointer-events-none absolute top-0 -left-5 flex h-full w-4 justify-center">
            <div className="w-px rounded-full bg-[rgba(86,93,94,0.22)]" />
          </div>
        )}

        <div
          className={`rounded-[1.4rem] border px-5 py-4 shadow-[0_14px_28px_rgba(18,45,66,0.08)] ${
            depth === 0 ? 'app-danger-card' : 'app-panel'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    depth === 0 ? 'app-danger-pill' : 'app-pill-muted'
                  }`}
                >
                  {depth === 0 ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {genealogyRole(depth)}
                </span>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isCompleted
                      ? 'app-pill-muted'
                      : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
                  }`}
                >
                  {isCompleted ? 'Wygaszone' : 'Aktywne'}
                </span>

                <span className="app-danger-pill inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {getCatalogLabelByValue('threatType', node.threat.data.threatType, campaignId)}
                </span>

                <span className="app-pill-muted inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {hasChildren ? `${descendants} dalej` : 'Koniec gałęzi'}
                </span>
              </div>

              <Link
                to={`/threats/${node.threat.id}`}
                state={returnToSessionLive ? { returnToSessionLive } : undefined}
                className="text-surface-900 hover:text-primary-800 block truncate text-base font-semibold tracking-[-0.02em] hover:underline"
              >
                {node.threat.name}
              </Link>

              {summary && (
                <p className="text-surface-700 mt-2 line-clamp-3 text-sm leading-6">{summary}</p>
              )}
            </div>

            <Link
              to={`/threats/${node.threat.id}`}
              state={returnToSessionLive ? { returnToSessionLive } : undefined}
              className="app-button-secondary shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              Detail
            </Link>
          </div>
        </div>
      </div>

      {hasChildren && (
        <ul className="ml-6 space-y-3 border-l border-[rgba(86,93,94,0.16)] pl-5">
          {node.children.map((child) => (
            <ThreatGenealogyNode
              key={child.threat.id}
              node={child}
              depth={depth + 1}
              returnToSessionLive={returnToSessionLive}
              campaignId={campaignId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function StandaloneThreatCard({
  threat,
  returnToSessionLive,
}: {
  threat: Threat;
  returnToSessionLive?: string | null;
}) {
  const summary = summarizeThreat(threat);
  const isCompleted = getThreatStatus(threat) === 'completed';

  return (
    <Link
      to={`/threats/${threat.id}`}
      state={returnToSessionLive ? { returnToSessionLive } : undefined}
      className="app-card group flex flex-col gap-3 rounded-[1.3rem] p-4 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2">
        <div className="text-warning-600 rounded-[0.95rem] border border-[rgba(210,166,67,0.24)] bg-[rgba(242,196,88,0.12)] p-2">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-surface-900 group-hover:text-primary-800 truncate text-sm font-semibold">
            {threat.name}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="app-pill-muted rounded-full px-2.5 py-1 text-[11px] font-medium">
          Samodzielne
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isCompleted
              ? 'app-pill-muted'
              : 'border border-emerald-300/70 bg-emerald-100/80 text-emerald-800'
          }`}
        >
          {isCompleted ? 'Wygaszone' : 'Aktywne'}
        </span>
      </div>

      {summary && <p className="text-surface-700 line-clamp-3 text-sm leading-6">{summary}</p>}
    </Link>
  );
}

export function ThreatGenealogySection({
  threats,
  returnToSessionLive,
}: ThreatGenealogySectionProps) {
  const { campaignId } = useCampaign();
  const { chainRoots, standaloneThreats, chainedIds } = buildThreatForest(threats);
  const totalChains = chainRoots.length;
  const totalChainedThreats = chainedIds.size;

  if (totalChains === 0) {
    return (
      <div className="app-input-shell text-surface-500 rounded-[1.3rem] border-dashed px-4 py-5 text-sm">
        W tym froncie nie ma jeszcze łańcuchów zagrożeń wynikających.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="app-panel rounded-[1.35rem] px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-primary-700 inline-flex items-center gap-2 rounded-full border border-[rgba(33,71,102,0.14)] bg-[rgba(111,146,164,0.14)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
            <GitBranch className="h-3.5 w-3.5" />
            Łańcuch eskalacji
          </span>
          <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
            Gałęzie: {totalChains}
          </span>
          <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
            W łańcuchach: {totalChainedThreats}
          </span>
          {standaloneThreats.length > 0 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
              Samodzielne: {standaloneThreats.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {chainRoots.map((node) => (
          <section key={node.threat.id} className="app-panel rounded-[1.55rem] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="app-danger-pill rounded-full px-2.5 py-1 text-[11px] font-semibold">
                Źródło gałęzi
              </span>
              <span className="text-surface-500 text-xs font-medium">{node.threat.name}</span>
            </div>

            <ul className="space-y-3">
              <ThreatGenealogyNode
                node={node}
                depth={0}
                returnToSessionLive={returnToSessionLive}
                campaignId={campaignId}
              />
            </ul>
          </section>
        ))}
      </div>

      {standaloneThreats.length > 0 && (
        <section className="app-panel rounded-[1.55rem] p-5">
          <div className="mb-4">
            <h3 className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">
              Pozostałe zagrożenia frontu
            </h3>
            <p className="text-surface-700 mt-2 text-sm leading-6">
              Zagrożenia należące do frontu, ale jeszcze niepodpięte do żadnego łańcucha
              dziedziczenia.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {standaloneThreats.map((threat) => (
              <StandaloneThreatCard
                key={threat.id}
                threat={threat}
                returnToSessionLive={returnToSessionLive}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
