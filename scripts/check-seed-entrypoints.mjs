import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dbDir = path.join(repoRoot, 'src', 'shared', 'db');
const srcDir = path.join(repoRoot, 'src');

function walkFiles(root) {
  const entries = readdirSync(root);
  const result = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...walkFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

const seedFiles = readdirSync(dbDir).filter((name) => /^seed.*\.ts$/i.test(name)).sort();
const allowedSeedFiles = ['seed.ts', 'seedCampaign.ts'];
if (JSON.stringify(seedFiles) !== JSON.stringify(allowedSeedFiles)) {
  console.error(
    `Niedozwolony zestaw plików seed w src/shared/db. Oczekiwane: ${allowedSeedFiles.join(', ')}; otrzymano: ${seedFiles.join(', ')}`,
  );
  process.exit(1);
}

const sourceFiles = walkFiles(srcDir).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
const offenders = sourceFiles.filter((filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('/src/shared/db/seed.ts')) return false;
  const content = readFileSync(filePath, 'utf8');
  return (
    content.includes("@shared/db/seedCampaign") ||
    content.includes("from './seedCampaign'") ||
    content.includes('from "./seedCampaign"')
  );
});

if (offenders.length > 0) {
  console.error('Wykryto niedozwolone importy seedCampaign poza seed.ts:');
  for (const offender of offenders) console.error(`- ${offender}`);
  process.exit(1);
}

console.log('Seed guard OK: jeden publiczny entrypoint i brak bezpośrednich importów seedCampaign.');
