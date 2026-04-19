import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Printer,
  Download,
  Users,
  MapPin,
  GitBranch,
  Lightbulb,
  Clock,
  StickyNote,
  BookOpen,
  Package,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useSessionById } from '../hooks/useSessionById';
import { isNamedLocation } from '@modules/locations/types';
import { useNotesBySession } from '@modules/notes/hooks/useNotesBySession';
import { getEntityById } from '@shared/db/operations';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { exportSessionMarkdown } from '@modules/data-io/utils/exportSessionMarkdown';
import { toast } from 'sonner';
import type { Entity } from '@shared/types/entity';
import type { MgHelperDb } from '@shared/db/database';

// ── Data aggregation ──────────────────────────────────────────────────────────

function useSessionAppearancesForReport(db: MgHelperDb, sessionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!sessionId)
        return { npcs: [], locations: [], items: [], threads: [], clues: [], clocks: [] };
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((r) => r.type === 'appears_in')
        .toArray();
      const entities = await Promise.all(rels.map((r) => getEntityById(db, r.sourceId)));
      const valid = entities.filter((e): e is Entity => e !== undefined);
      return {
        npcs: valid.filter((e) => e.type === 'npc'),
        locations: valid.filter(isNamedLocation),
        items: valid.filter((e) => e.type === 'item'),
        threads: valid.filter((e) => e.type === 'thread'),
        clues: valid.filter((e) => e.type === 'clue'),
        clocks: valid.filter((e) => e.type === 'clock'),
      };
    }, [db, sessionId]) ?? { npcs: [], locations: [], items: [], threads: [], clues: [], clocks: [] }
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────

function ReportSection({
  icon,
  title,
  iconColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="mb-3 flex items-center gap-2 border-b border-surface-100 pb-1 text-base font-semibold text-surface-800 print:border-surface-300">
        <span className={`print:hidden ${iconColor}`}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionReport() {
  const { id } = useParams<{ id: string }>();
  const { db } = useCampaign();
  const { session } = useSessionById(id);
  const appearances = useSessionAppearancesForReport(db, id);
  const notes = useNotesBySession(id ?? '');

  if (session === undefined || notes === undefined) return <LoadingSpinner />;

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Sesja nie znaleziona.</p>
        <Link to="/sessions" className="text-primary-600 hover:underline">
          ← Powrót do sesji
        </Link>
      </div>
    );
  }

  const title = session.name || `Sesja ${session.data.number}`;
  const formattedDate = session.data.date
    ? format(parseISO(session.data.date), 'd MMMM yyyy', { locale: pl })
    : '';

  function handlePrint() {
    window.print();
  }

  async function handleExport() {
    try {
      const md = await exportSessionMarkdown(db, id!);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Plik .md pobrany');
    } catch {
      toast.error('Nie udało się wyeksportować raportu');
    }
  }

  const sortedNotes = notes ? [...notes].sort((a, b) =>
    a.data.createdAt.localeCompare(b.data.createdAt),
  ) : [];

  return (
    <div className="min-h-screen bg-surface-50 p-4 print:bg-white print:p-0">
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center gap-2 print:hidden">
        <Link
          to={`/sessions/${id}`}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
        >
          <ArrowLeft className="h-4 w-4" /> Sesja
        </Link>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-surface-300 px-3 py-1.5 text-sm hover:bg-surface-50"
          >
            <Download className="h-3.5 w-3.5" /> Eksportuj .md
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Printer className="h-3.5 w-3.5" /> Drukuj
          </button>
        </div>
      </div>

      {/* Report document — A4-like, white background */}
      <div className="mx-auto max-w-[800px] rounded-xl bg-white p-8 shadow-sm print:rounded-none print:shadow-none">
        {/* Header */}
        <div className="mb-6 border-b border-surface-200 pb-4 print:border-surface-300">
          <div className="mb-1 flex items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-primary-500 print:hidden" />
            <h1 className="text-2xl font-bold text-surface-900">{title}</h1>
          </div>
          {formattedDate && (
            <p className="text-sm text-surface-500">{formattedDate}</p>
          )}
          {session.data.summary && (
            <p className="mt-3 text-sm italic text-surface-600">{session.data.summary}</p>
          )}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {/* Notatki */}
          {sortedNotes.length > 0 && (
            <ReportSection
              icon={<StickyNote className="h-4 w-4" />}
              iconColor="text-amber-500"
              title="Notatki"
            >
              <ol className="flex flex-col gap-3">
                {sortedNotes.map((note, i) => (
                  <li key={note.id} className="flex gap-2.5">
                    <span className="mt-0.5 w-5 shrink-0 text-right text-xs text-surface-400">
                      {i + 1}.
                    </span>
                    <div>
                      <p className="text-sm text-surface-800">{note.data.content}</p>
                      <p className="mt-0.5 text-xs text-surface-400">
                        {format(new Date(note.data.createdAt), 'HH:mm · dd.MM.yyyy')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </ReportSection>
          )}

          {/* Postacie */}
          {appearances.npcs.length > 0 && (
            <ReportSection
              icon={<Users className="h-4 w-4" />}
              iconColor="text-blue-500"
              title="Postacie"
            >
              <ul className="flex flex-wrap gap-2">
                {appearances.npcs.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/npcs/${e.id}`}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-700 hover:bg-blue-100 print:bg-transparent print:text-surface-800"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          {/* Lokacje */}
          {appearances.locations.length > 0 && (
            <ReportSection
              icon={<MapPin className="h-4 w-4" />}
              iconColor="text-green-500"
              title="Lokacje"
            >
              <ul className="flex flex-wrap gap-2">
                {appearances.locations.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/locations/${e.id}`}
                      className="rounded-full bg-green-50 px-2.5 py-0.5 text-sm text-green-700 hover:bg-green-100 print:bg-transparent print:text-surface-800"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          {/* Wątki */}
          {appearances.threads.length > 0 && (
            <ReportSection
              icon={<GitBranch className="h-4 w-4" />}
              iconColor="text-indigo-500"
              title="Wątki"
            >
              <ul className="flex flex-wrap gap-2">
                {appearances.threads.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/threads/${e.id}`}
                      className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm text-indigo-700 hover:bg-indigo-100 print:bg-transparent print:text-surface-800"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          {/* Wskazówki */}
          {appearances.clues.length > 0 && (
            <ReportSection
              icon={<Lightbulb className="h-4 w-4" />}
              iconColor="text-yellow-500"
              title="Wskazówki"
            >
              <ul className="flex flex-wrap gap-2">
                {appearances.clues.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/clues/${e.id}`}
                      className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-sm text-yellow-700 hover:bg-yellow-100 print:bg-transparent print:text-surface-800"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          {/* Przedmioty */}
          {appearances.items.length > 0 && (
            <ReportSection
              icon={<Package className="h-4 w-4" />}
              iconColor="text-orange-500"
              title="Przedmioty"
            >
              <ul className="flex flex-wrap gap-2">
                {appearances.items.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/items/${e.id}`}
                      className="rounded-full bg-orange-50 px-2.5 py-0.5 text-sm text-orange-700 hover:bg-orange-100 print:bg-transparent print:text-surface-800"
                    >
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          {/* Zegary */}
          {appearances.clocks.length > 0 && (
            <ReportSection
              icon={<Clock className="h-4 w-4" />}
              iconColor="text-rose-500"
              title="Zegary"
            >
              <ul className="flex flex-col gap-1.5">
                {appearances.clocks.map((e) => {
                  const cd = e.data as { filled: number; segments: number };
                  const pct = Math.round((cd.filled / cd.segments) * 100);
                  return (
                    <li key={e.id} className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-surface-800">{e.name}</span>
                      <span className="text-surface-400">
                        {cd.filled}/{cd.segments}
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-100">
                        <div
                          className="h-full rounded-full bg-rose-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ReportSection>
          )}

          {/* Empty state */}
          {sortedNotes.length === 0 &&
            appearances.npcs.length === 0 &&
            appearances.locations.length === 0 &&
            appearances.threads.length === 0 &&
            appearances.clues.length === 0 &&
            appearances.items.length === 0 &&
            appearances.clocks.length === 0 && (
              <p className="text-sm text-surface-400 italic">
                Brak danych — dodaj powiązania poprzez "Na żywo".
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
