import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCampaigns,
  saveCampaign,
  deleteCampaignMeta,
  getActiveCampaignId,
  setActiveCampaignId,
} from '@shared/db/campaignStore';
import type { CampaignMeta } from '@shared/types/campaign';

const CAMPAIGNS_KEY = 'mg-campaigns';
const ACTIVE_KEY = 'mg-active-campaign';

const meta1: CampaignMeta = {
  id: 'c1',
  name: 'Kampania 1',
  description: 'Opis 1',
  createdAt: '2024-01-01T00:00:00.000Z',
};
const meta2: CampaignMeta = {
  id: 'c2',
  name: 'Kampania 2',
  description: '',
  createdAt: '2024-02-01T00:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
});

describe('listCampaigns', () => {
  it('returns empty array when no key set', () => {
    expect(listCampaigns()).toEqual([]);
  });

  it('returns parsed campaigns from localStorage', () => {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify([meta1]));
    expect(listCampaigns()).toEqual([meta1]);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(CAMPAIGNS_KEY, 'not-json');
    expect(listCampaigns()).toEqual([]);
  });
});

describe('saveCampaign', () => {
  it('adds new campaign to empty list', () => {
    saveCampaign(meta1);
    expect(listCampaigns()).toEqual([meta1]);
  });

  it('appends new campaign to existing list', () => {
    saveCampaign(meta1);
    saveCampaign(meta2);
    expect(listCampaigns()).toHaveLength(2);
    expect(listCampaigns()[1]).toEqual(meta2);
  });

  it('updates existing campaign by id', () => {
    saveCampaign(meta1);
    const updated: CampaignMeta = { ...meta1, name: 'Zmieniona nazwa' };
    saveCampaign(updated);
    const list = listCampaigns();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Zmieniona nazwa');
  });
});

describe('deleteCampaignMeta', () => {
  it('removes campaign by id', () => {
    saveCampaign(meta1);
    saveCampaign(meta2);
    deleteCampaignMeta('c1');
    const list = listCampaigns();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('c2');
  });

  it('is no-op when id does not exist', () => {
    saveCampaign(meta1);
    deleteCampaignMeta('nonexistent');
    expect(listCampaigns()).toHaveLength(1);
  });
});

describe('getActiveCampaignId / setActiveCampaignId', () => {
  it('returns null when not set', () => {
    expect(getActiveCampaignId()).toBeNull();
  });

  it('returns id after setting it', () => {
    setActiveCampaignId('c1');
    expect(getActiveCampaignId()).toBe('c1');
    expect(localStorage.getItem(ACTIVE_KEY)).toBe('c1');
  });
});
