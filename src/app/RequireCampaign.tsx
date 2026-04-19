import { Navigate } from 'react-router';
import { getActiveCampaignId, listCampaigns } from '@shared/db/campaignStore';
import type { ReactNode } from 'react';

interface RequireCampaignProps {
  children: ReactNode;
}

export function RequireCampaign({ children }: RequireCampaignProps) {
  const activeId = getActiveCampaignId();
  const campaigns = listCampaigns();

  const isValid = activeId !== null && campaigns.some((c) => c.id === activeId);

  if (!isValid) {
    return <Navigate to="/campaigns" replace />;
  }

  return <>{children}</>;
}
