import { HashRouter } from 'react-router';
import { AppRouter } from './router';
import { AppShell } from './layout/AppShell';
import { Toaster } from '@shared/components/Toaster';
import { OnboardingDialog } from '@shared/components/OnboardingDialog';
import { CampaignProvider } from '@shared/db/CampaignContext';

export function App() {
  return (
    <HashRouter>
      <CampaignProvider>
        <AppShell>
          <AppRouter />
        </AppShell>
        <Toaster />
        <OnboardingDialog />
      </CampaignProvider>
    </HashRouter>
  );
}
