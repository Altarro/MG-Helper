import type { CampaignMeta } from '@shared/types/campaign';

const CAMPAIGNS_KEY = 'mg-campaigns';
const ACTIVE_KEY = 'mg-active-campaign';

export function listCampaigns(): CampaignMeta[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CampaignMeta[];
  } catch {
    return [];
  }
}

export function saveCampaign(meta: CampaignMeta): void {
  const campaigns = listCampaigns();
  const idx = campaigns.findIndex((c) => c.id === meta.id);
  if (idx >= 0) {
    campaigns[idx] = meta;
  } else {
    campaigns.push(meta);
  }
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function deleteCampaignMeta(id: string): void {
  const campaigns = listCampaigns().filter((c) => c.id !== id);
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function getActiveCampaignId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveCampaignId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}
