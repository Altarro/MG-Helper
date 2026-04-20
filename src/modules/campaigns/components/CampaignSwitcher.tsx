import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, FolderOpen, Settings } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import { listCampaigns } from '@shared/db/campaignStore';

export function CampaignSwitcher() {
  const { campaignId, campaignName, setActiveCampaign } = useCampaign();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const campaigns = listCampaigns();
  const others = campaigns.filter((c) => c.id !== campaignId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSwitch(id: string) {
    setActiveCampaign(id);
    setOpen(false);
    navigate('/');
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="app-input flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-medium text-surface-800 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
      >
        <FolderOpen className="h-3.5 w-3.5 text-primary-700" />
        <span className="max-w-[140px] truncate">{campaignName || 'Wybierz kampanię'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-surface-500" />
      </button>

      {open && (
        <div className="app-panel-strong absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl py-1.5">
          {others.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-surface-500">
                Kampanie
              </div>
              {others.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSwitch(c.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-800 transition-colors hover:bg-[rgba(223,225,218,0.72)]"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-surface-500" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              <div className="my-1 border-t border-[rgba(86,93,94,0.12)]" />
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/campaigns');
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-700 transition-colors hover:bg-[rgba(223,225,218,0.72)]"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            Zarządzaj kampaniami
          </button>
        </div>
      )}
    </div>
  );
}
