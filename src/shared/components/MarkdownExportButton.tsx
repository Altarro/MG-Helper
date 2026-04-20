import { FileDown } from 'lucide-react';
import { downloadEntityMarkdown } from '@shared/utils/exportMarkdown';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { Entity } from '@shared/types/entity';
import type { Relation } from '@shared/types/relation';

interface MarkdownExportProps {
  entity: Entity;
}

export function MarkdownExportButton({ entity }: MarkdownExportProps) {
  const { db } = useCampaign();

  async function handleExport() {
    try {
      const [asSource, asTarget] = await Promise.all([
        db.relations.where('sourceId').equals(entity.id).toArray(),
        db.relations.where('targetId').equals(entity.id).toArray(),
      ]);
      const relations: Relation[] = [...asSource, ...asTarget];
      const otherIds = relations.map((r) => (r.sourceId === entity.id ? r.targetId : r.sourceId));
      const others = await Promise.all(otherIds.map((id) => db.entities.get(id)));
      const relatedMap = new Map<string, Entity>();
      others.forEach((e) => {
        if (e) relatedMap.set(e.id, e);
      });
      downloadEntityMarkdown(entity, relations, relatedMap);
      toast.success('Plik Markdown pobrany');
    } catch {
      toast.error('Eksport nie powiódł się');
    }
  }

  return (
    <button
      onClick={handleExport}
      title="Eksportuj do Markdown"
      className="app-button-secondary text-surface-700 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
    >
      <FileDown className="h-3.5 w-3.5" />
      .md
    </button>
  );
}
