import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { EntityCard } from '@shared/components/EntityCard';
import { EntityForm } from '@shared/components/EntityForm';
import { TagInput } from '@shared/components/TagInput';
import { Modal } from '@shared/components/Modal';
import { AnchoredPanel } from '@shared/components/AnchoredPanel';
import { SearchBar } from '@shared/components/SearchBar';
import { createRef, useRef, useState } from 'react';
import type { Entity } from '@shared/types/entity';

// ── EntityCard ──────────────────────────────────────────────────────────────

const SAMPLE_ENTITY: Entity = {
  id: 'abc123',
  type: 'npc',
  name: 'Ivar Cruelhand',
  description: '<p>Dangerous warlord.</p>',
  tags: ['villain', 'warrior'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  data: {},
};

describe('EntityCard', () => {
  it('renders entity name and type badge', () => {
    renderWithProviders(<EntityCard entity={SAMPLE_ENTITY} />);
    expect(screen.getByText('Ivar Cruelhand')).toBeInTheDocument();
    expect(screen.getByText('NPC')).toBeInTheDocument();
  });

  it('renders stripped description preview', () => {
    renderWithProviders(<EntityCard entity={SAMPLE_ENTITY} />);
    expect(screen.getByText('Dangerous warlord.')).toBeInTheDocument();
  });

  it('renders tags', () => {
    renderWithProviders(<EntityCard entity={SAMPLE_ENTITY} />);
    expect(screen.getByText('villain')).toBeInTheDocument();
    expect(screen.getByText('warrior')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(200);
    const entity = { ...SAMPLE_ENTITY, description: longDesc };
    renderWithProviders(<EntityCard entity={entity} />);
    const preview = screen.getByText(/A+…/);
    expect(preview.textContent!.length).toBeLessThanOrEqual(155); // 150 + ellipsis
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = renderWithProviders(<EntityCard entity={SAMPLE_ENTITY} onClick={onClick} />);
    fireEvent.click(container.querySelector('article[role="button"]') as HTMLElement);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders renderExtra content', () => {
    renderWithProviders(
      <EntityCard
        entity={SAMPLE_ENTITY}
        renderExtra={() => <span>Extra info</span>}
      />,
    );
    expect(screen.getByText('Extra info')).toBeInTheDocument();
  });
});

// ── EntityForm ───────────────────────────────────────────────────────────────

// Mock RichTextEditor to avoid Tiptap DOM issues in jsdom
vi.mock('@shared/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('EntityForm', () => {
  it('renders name input and submit button', () => {
    renderWithProviders(<EntityForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/Nazwa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zapisz/i })).toBeInTheDocument();
  });

  it('shows error when name is empty and form is submitted', async () => {
    renderWithProviders(<EntityForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));
    const error = await screen.findByRole('alert');
    expect(error).toBeInTheDocument();
  });

  it('calls onSubmit with correct values when valid', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<EntityForm onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Nazwa/i), {
        target: { value: 'Test Entity' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));
    });
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].name).toBe('Test Entity');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    renderWithProviders(<EntityForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Anuluj/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

// ── TagInput ─────────────────────────────────────────────────────────────────

describe('TagInput', () => {
  it('renders existing tags', () => {
    renderWithProviders(<TagInput value={['alpha', 'beta']} onChange={vi.fn()} />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('adds tag on Enter key', () => {
    const onChange = vi.fn();
    renderWithProviders(<TagInput value={[]} onChange={onChange} />);
    const input = screen.getByLabelText('Wprowadź tag');
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['newtag']);
  });

  it('removes tag when X is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(<TagInput value={['mytag']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Usuń tag mytag'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('does not add duplicate tags', () => {
    const onChange = vi.fn();
    renderWithProviders(<TagInput value={['dup']} onChange={onChange} />);
    const input = screen.getByLabelText('Wprowadź tag');
    fireEvent.change(input, { target: { value: 'dup' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── Modal ────────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders children', () => {
    renderWithProviders(<Modal onClose={vi.fn()}><span>modal content</span></Modal>);
    expect(screen.getByText('modal content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWithProviders(<Modal title="Test title" onClose={vi.fn()}><span /></Modal>);
    expect(screen.getByText('Test title')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderWithProviders(<Modal onClose={onClose}><span>content</span></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<Modal onClose={onClose}><span>content</span></Modal>);
    // The backdrop is the fixed inset-0 div with aria-hidden
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when panel content is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<Modal onClose={onClose}><span>content</span></Modal>);
    fireEvent.click(screen.getByText('content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses the preferred element and restores focus on close', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const inputRef = useRef<HTMLInputElement>(null);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>open modal</button>
          {open && (
            <Modal
              title="Focus test"
              onClose={() => setOpen(false)}
              initialFocusRef={inputRef}
            >
              <input ref={inputRef} aria-label="Modal input" />
            </Modal>
          )}
        </>
      );
    }

    renderWithProviders(<Harness />);
    const opener = screen.getByRole('button', { name: 'open modal' });
    opener.focus();

    fireEvent.click(opener);

    await waitFor(() => expect(screen.getByLabelText('Modal input')).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('traps focus inside the modal when tabbing forward', () => {
    renderWithProviders(
      <Modal title="Trap test" onClose={vi.fn()}>
        <button type="button">first action</button>
        <button type="button">last action</button>
      </Modal>,
    );

    const buttons = screen.getAllByRole('button');
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    lastButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(firstButton).toHaveFocus();
  });
});

// ── AnchoredPanel ─────────────────────────────────────────────────────────────

describe('AnchoredPanel', () => {
  it('renders children in document', () => {
    const ref = createRef<HTMLButtonElement>();
    renderWithProviders(
      <>
        <button ref={ref}>anchor</button>
        <AnchoredPanel anchorRef={ref} onClose={vi.fn()}>
          <span>panel content</span>
        </AnchoredPanel>
      </>,
    );
    expect(screen.getByText('panel content')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    renderWithProviders(
      <>
        <button ref={ref}>anchor</button>
        <AnchoredPanel anchorRef={ref} onClose={onClose}>
          <span>panel</span>
        </AnchoredPanel>
      </>,
    );
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    renderWithProviders(
      <>
        <button ref={ref}>anchor</button>
        <AnchoredPanel anchorRef={ref} onClose={onClose}>
          <span>panel</span>
        </AnchoredPanel>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('SearchBar', () => {
  it('focuses the search input on Ctrl+K', () => {
    window.history.pushState({}, '', '/');
    renderWithProviders(<SearchBar />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('shows and clears the draft query before submit', () => {
    window.history.pushState({}, '', '/search');
    renderWithProviders(<SearchBar compact={false} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'alpha' } });

    expect(screen.getByRole('button', { name: /wyczy/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /wyczy/i }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('navigates to search results on Enter', async () => {
    window.history.pushState({}, '', '/');
    renderWithProviders(<SearchBar />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'wiedzmin' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/search');
      expect(window.location.search).toBe('?q=wiedzmin');
    });
  });
});
