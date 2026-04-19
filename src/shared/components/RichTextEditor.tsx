import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
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
      className={`rounded p-1.5 text-surface-600 transition-colors hover:bg-surface-100 ${
        active ? 'bg-surface-100 text-surface-900' : ''
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Wpisz opis…',
  className = '',
}: RichTextEditorProps) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-32 px-3 py-2 focus:outline-none',
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

  // Sync external value changes (e.g. form reset)
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

  function setLink() {
    const url = window.prompt('URL linku:');
    if (!url) return;
    editor?.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className={`overflow-hidden rounded-md border border-surface-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-surface-200 bg-surface-50 px-2 py-1">
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
        <div className="mx-1 w-px bg-surface-200" aria-hidden="true" />
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
        <div className="mx-1 w-px bg-surface-200" aria-hidden="true" />
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
        <div className="mx-1 w-px bg-surface-200" aria-hidden="true" />
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          label="Wstaw link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="ml-auto flex gap-0.5">
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
      <EditorContent editor={editor} />
    </div>
  );
}
