import type { ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { CampaignProvider } from '@shared/db/CampaignContext';
import { setActiveCampaignId, saveCampaign } from '@shared/db/campaignStore';

// Set up a default campaign for tests
setActiveCampaignId('__legacy__');
saveCampaign({ id: '__legacy__', name: 'Test Campaign', description: '', createdAt: new Date().toISOString() });

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <CampaignProvider>{children}</CampaignProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}
