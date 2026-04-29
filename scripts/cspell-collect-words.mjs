import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync('pnpm', ['exec', 'cspell', 'lint', '--no-progress'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
  maxBuffer: 20 * 1024 * 1024,
});
const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
const words = new Set();
const re = /Unknown word \(([^)]+)\)/g;
let m;
while ((m = re.exec(text)) !== null) {
  words.add(m[1]);
}
const sorted = [...words].sort((a, b) => a.localeCompare(b, 'pl'));
const header =
  '# Zebrane z `pnpm exec cspell lint` (nie-UTF8 w źródłach też trafiają tu — warto je poprawić w kodzie).\n';
writeFileSync(join(root, 'cspell-words-project.txt'), header + sorted.join('\n') + '\n', 'utf8');
console.log(`Wrote ${sorted.length} unique tokens to cspell-words-project.txt (exit ${r.status ?? 0})`);
