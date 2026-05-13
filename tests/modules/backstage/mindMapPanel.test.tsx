import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MindMapPanel } from '@modules/backstage/components/MindMapPanel';

describe('MindMapPanel', () => {
  it('adds only children allowed by the selected node type', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel />);

    await user.click(screen.getByRole('button', { name: 'Dodaj gałąź do Nowy front' }));

    const rootMenu = screen.getByRole('menu');
    expect(within(rootMenu).getByRole('menuitem', { name: 'Zagrożenie' })).toBeInTheDocument();
    expect(within(rootMenu).getByRole('menuitem', { name: 'Wskazówka' })).toBeInTheDocument();
    expect(within(rootMenu).queryByRole('menuitem', { name: 'Wątek' })).not.toBeInTheDocument();

    await user.click(within(rootMenu).getByRole('menuitem', { name: 'Zagrożenie' }));

    expect(screen.getByDisplayValue('Nowe zagrożenie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wątek' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wskazówka' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Postać' })).not.toBeInTheDocument();
  });

  it('keeps leaf nodes from exposing an add button', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel />);

    await user.click(screen.getByRole('button', { name: 'Dodaj gałąź do Nowy front' }));
    await user.click(screen.getByRole('menuitem', { name: 'Wskazówka' }));

    expect(screen.getByDisplayValue('Nowa wskazówka')).toBeInTheDocument();
    expect(screen.getByText('Ten typ jest liściem mapy.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dodaj gałąź do Nowa wskazówka' })).not.toBeInTheDocument();
  });
});
