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

  // Close on outside click
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
        className="flex items-center gap-1.5 rounded-md border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm font-medium text-surface-800 hover:bg-surface-100"
      >
        <FolderOpen className="h-3.5 w-3.5 text-primary-600" />
        <span className="max-w-[140px] truncate">{campaignName || 'Wybierz kampanię'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-surface-200 bg-white py-1 shadow-lg">
          {others.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-surface-400">
                Kampanie
              </div>
              {others.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSwitch(c.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-800 hover:bg-surface-50"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              <div className="my-1 border-t border-surface-100" />
            </>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/campaigns'); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-surface-600 hover:bg-surface-50"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            Zarządzaj kampaniami
          </button>
        </div>
      )}
    </div>
  );
}
