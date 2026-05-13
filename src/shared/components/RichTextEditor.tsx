import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import { ENTITY_TYPES, type EntityType } from '@shared/types/entity';
import { ENTITY_TYPE_LABELS, getEntityDetailPath } from '@shared/utils/entityTypeMeta';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-xl p-2 text-surface-700 transition-colors hover:bg-[rgba(223,225,218,0.75)] ${
        active ? 'app-pill text-primary-800' : ''
      }`}
    >
      {children}
    </button>
  );
}

const EntityLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-id'),
        renderHTML: (attributes) =>
          attributes.entityId ? { 'data-entity-id': attributes.entityId as string } : {},
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes) =>
          attributes.entityType ? { 'data-entity-type': attributes.entityType as string } : {},
      },
    };
  },
});

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Wpisz opis...',
  className = '',
}: RichTextEditorProps) {
  const { db } = useCampaign();
  const isInternalChange = useRef(false);
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('npc');
  const [entityQuery, setEntityQuery] = useState('');
  const entityCandidates = useLiveQuery(
    () =>
      db.entities
        .where('type')
        .equals(entityType)
        .toArray(),
    [db, entityType],
  );
  const filteredEntities = useMemo(() => {
    const lowerQuery = entityQuery.trim().toLowerCase();
    return (entityCandidates ?? [])
      .filter((entity) => !lowerQuery || entity.name.toLowerCase().includes(lowerQuery))
      .slice(0, 30);
  }, [entityCandidates, entityQuery]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      EntityLink.configure({ openOnClick: false, autolink: false, linkOnPaste: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-36 px-4 py-3 focus:outline-none text-surface-900',
        'aria-label': 'Edytor tekstu',
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
    onBlur() {
      onBlur?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  function insertEntityLink(entityId: string, type: EntityType, name: string) {
    const path = getEntityDetailPath(type, entityId);
    if (!path) return;

    editor
      ?.chain()
      .focus()
      .insertContent({
        type: 'text',
        text: name,
        marks: [
          {
            type: 'link',
            attrs: {
              href: `#${path}`,
              entityId,
              entityType: type,
            },
          },
        ],
      })
      .insertContent(' ')
      .run();
    setEntityPickerOpen(false);
    setEntityQuery('');
  }

  return (
    <div className={`app-input-shell overflow-hidden rounded-[1.25rem] focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 ${className}`}>
      <div className="flex flex-wrap gap-1 border-b border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.72)] px-2.5 py-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="Pogrubienie"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="Kursywa"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 w-px bg-[rgba(86,93,94,0.14)]" aria-hidden="true" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          label="Nagłówek H2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          label="Nagłówek H3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 w-px bg-[rgba(86,93,94,0.14)]" aria-hidden="true" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="Lista punktowana"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="Lista numerowana"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 w-px bg-[rgba(86,93,94,0.14)]" aria-hidden="true" />
        <ToolbarButton
          onClick={() => setEntityPickerOpen((open) => !open)}
          active={entityPickerOpen}
          label="Wstaw link do encji"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="ml-auto flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            label="Cofnij"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            label="Ponów"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
      {entityPickerOpen && (
        <div className="border-b border-[rgba(86,93,94,0.14)] bg-surface-50 px-3 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as EntityType)}
              className="app-input rounded-xl px-3 py-2 text-sm"
              aria-label="Typ encji linku"
            >
              {ENTITY_TYPES.filter((type) => type !== 'event').map((type) => (
                <option key={type} value={type}>
                  {ENTITY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              value={entityQuery}
              onChange={(event) => setEntityQuery(event.target.value)}
              placeholder="Szukaj encji..."
              className="app-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
              aria-label="Szukaj encji do linku"
            />
            <button
              type="button"
              onClick={() => setEntityPickerOpen(false)}
              className="app-button-secondary rounded-xl px-3 py-2 text-sm font-medium"
            >
              Zamknij
            </button>
          </div>
          <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-surface-200 bg-white p-1">
            {filteredEntities.length === 0 ? (
              <p className="px-3 py-2 text-sm text-surface-500">Brak wyników</p>
            ) : (
              filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => insertEntityLink(entity.id, entity.type, entity.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-50"
                >
                  <span className="min-w-0 truncate font-medium text-surface-800">{entity.name}</span>
                  <span className="shrink-0 text-xs text-surface-500">{ENTITY_TYPE_LABELS[entity.type]}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
