import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { saveCampaign, setActiveCampaignId } from '@shared/db/campaignStore';
import { openCampaignDb } from '@shared/db/database';
import { addEntity, addRelation } from '@shared/db/operations';
import { RichTextContent } from '@shared/components/RichTextContent';

const TEST_ID = '__rich-text-content__';
const db = openCampaignDb(TEST_ID);

describe('RichTextContent', () => {
  beforeEach(async () => {
    setActiveCampaignId(TEST_ID);
    saveCampaign({
      id: TEST_ID,
      name: 'Rich Text Content Test',
      description: '',
      createdAt: new Date().toISOString(),
    });
    await db.entities.clear();
    await db.relations.clear();
  });

  it('opens entity links in a lightweight read-only preview modal', async () => {
    const user = userEvent.setup();
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Marta z Doku',
      description: '<p>Kontakt od spraw <a href="#/factions/faction-old" data-entity-id="faction-old" data-entity-type="faction">Bractwa</a>.</p>',
      tags: ['kontakt'],
      data: { role: 'Informator' },
    });
    const faction = await addEntity(db, {
      type: 'faction',
      name: 'Bractwo Latarni',
      description: '<p>Strażnicy starej przysięgi.</p>',
      tags: ['sojusznik'],
      data: { factionType: 'order' },
    });
    await addRelation(db, {
      type: 'belongs_to',
      sourceId: npc.id,
      targetId: faction.id,
    });

    render(
      <CampaignProvider>
        <RichTextContent
          html={`<p>Porozmawiaj z <a href="#/npcs/${npc.id}" data-entity-id="${npc.id}" data-entity-type="npc">Martą</a>.</p>`}
        />
      </CampaignProvider>,
    );

    await user.click(screen.getByRole('link', { name: 'Martą' }));

    const dialog = await screen.findByRole('dialog', { name: 'Marta z Doku' });
    expect(within(dialog).getByText('NPC')).toBeInTheDocument();
    expect(within(dialog).getByText('kontakt')).toBeInTheDocument();
    expect(within(dialog).getByText(/Edytowano:/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Kontakt od spraw/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Bractwa' })).toBeInTheDocument();
    expect(within(dialog).queryByText('Szczegóły')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Rola')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Informator')).not.toBeInTheDocument();
    expect(await within(dialog).findByText('Relacje')).toBeInTheDocument();
    expect(within(dialog).getByText('Bractwo Latarni')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Bractwo Latarni/i })).not.toBeInTheDocument();
  });

  it('does not navigate deeper when clicking links inside the preview modal', async () => {
    const user = userEvent.setup();
    const faction = await addEntity(db, {
      type: 'faction',
      name: 'Bractwo Latarni',
      description: '<p>Strażnicy starej przysięgi.</p>',
      tags: [],
      data: {},
    });
    const npc = await addEntity(db, {
      type: 'npc',
      name: 'Marta z Doku',
      description: `<p>Kontakt od <a href="#/factions/${faction.id}" data-entity-id="${faction.id}" data-entity-type="faction">Bractwa</a>.</p>`,
      tags: [],
      data: {},
    });

    render(
      <CampaignProvider>
        <RichTextContent
          html={`<p>Porozmawiaj z <a href="#/npcs/${npc.id}" data-entity-id="${npc.id}" data-entity-type="npc">Martą</a>.</p>`}
        />
      </CampaignProvider>,
    );

    await user.click(screen.getByRole('link', { name: 'Martą' }));
    const dialog = await screen.findByRole('dialog', { name: 'Marta z Doku' });

    await user.click(within(dialog).getByRole('link', { name: 'Bractwa' }));

    expect(screen.getByRole('dialog', { name: 'Marta z Doku' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Bractwo Latarni' })).not.toBeInTheDocument();
  });
});
