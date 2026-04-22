import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const DAY_MS = 24 * 60 * 60 * 1000;

function storageKey(campaignId: string): string {
  return `mg-helper:lastBackupAt:${campaignId}`;
}

function sessionKey(campaignId: string): string {
  return `mg-helper:backupToastShown:${campaignId}`;
}

/**
 * Reads the timestamp of the last successful backup for a campaign.
 * Returns `null` when no backup has ever been recorded.
 */
export function getLastBackupAt(campaignId: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists "backup taken now" for the given campaign. Call this from every
 * successful export (JSON or full ZIP).
 */
export function markBackupDone(campaignId: string, at: number = Date.now()): void {
  try {
    localStorage.setItem(storageKey(campaignId), String(at));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

/**
 * Once per browser session, if the latest backup for this campaign is older
 * than 24h (or never happened), show a toast nudging the user to `/settings`.
 */
export function useBackupReminder(campaignId: string | null | undefined): void {
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!campaignId || firedRef.current) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(sessionKey(campaignId)) === '1';
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) {
      firedRef.current = true;
      return;
    }

    const last = getLastBackupAt(campaignId);
    const stale = last === null || Date.now() - last > DAY_MS;
    if (!stale) {
      firedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      firedRef.current = true;
      try {
        sessionStorage.setItem(sessionKey(campaignId), '1');
      } catch {
        // ignore
      }
      toast('Minęła doba od ostatniego backupu', {
        description: 'Zrób kopię zapasową, żeby nie stracić postępów.',
        action: {
          label: 'Zrób backup',
          onClick: () => navigate('/settings'),
        },
        duration: 10_000,
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [campaignId, navigate]);
}
