import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { Modal } from '@shared/components/Modal';
import { addEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { nowISO } from '@shared/utils/date';

export function NoteList() {
  const { db } = useCampaign();
  const navigate = useNavigate();
  const notes = useNotes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (notes === undefined) return <LoadingSpinner />;

  async function handleCreate() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const note = await addEntity(db, {
        type: 'note',
        name: trimmed.slice(0, 60),
        description: '',
        tags: [],
        data: {
          content: trimmed,
          sessionId: '',
          createdAt: nowISO(),
          cleanupDecision: 'keep',
        },
      });

      toast.success('Notatka dodana');
      setContent('');
      setIsCreateOpen(false);
      navigate(`/notes/${note.id}`);
    } catch {
      toast.error('Nie udało się dodać notatki');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.42)] bg-[rgba(242,196,88,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
              Zapis stołu
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">Notatki</h1>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="app-pill-muted rounded-full px-3 py-1 text-xs">{notes.length}</span>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="app-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Nowa notatka
            </button>
          </div>
        </div>
        <p className="mt-3 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
          Notatki możesz dopisywać w trybie na żywo albo ręcznie po sesji.
        </p>
      </section>

      {notes.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<StickyNote className="h-10 w-10 text-primary-300" />}
            title="Brak notatek"
            description="Dodaj pierwszą notatkę ręcznie albo zapisz ją podczas sesji na żywo."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {isCreateOpen && (
        <Modal title="Nowa notatka" size="md" onClose={() => setIsCreateOpen(false)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-surface-800">Treść notatki</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void handleCreate();
                }}
                maxLength={500}
                rows={7}
                placeholder="Zapisz ustalenie, pomysł albo rzecz do sprawdzenia..."
                className="app-input text-surface-800 placeholder:text-surface-500 min-h-[180px] resize-none rounded-[1.25rem] px-4 py-3 text-sm leading-7 focus:outline-none"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isSaving || !content.trim()}
                className="app-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isSaving ? 'Zapisywanie...' : 'Dodaj notatkę'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
