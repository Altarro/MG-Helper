import type { GeneratorPack, GeneratorTable } from './contracts';

export function downloadGeneratorPackJson(pack: GeneratorPack): void {
  const payload = JSON.stringify({ packs: [pack] }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const fileName = `generator-pack-${slugify(pack.name)}.json`;
  triggerDownload(blob, fileName);
}

export function downloadGeneratorTableCsv(table: GeneratorTable): void {
  const header = 'value,weight,tags';
  const rows = table.entries.map((entry) => {
    const tags = entry.tags.join('|');
    return [escapeCsv(entry.value), String(entry.weight), escapeCsv(tags)].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const fileName = `generator-table-${slugify(table.name)}.csv`;
  triggerDownload(blob, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

