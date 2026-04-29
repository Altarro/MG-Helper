import { GENERATOR_SYSTEM_TABLE_TYPES } from './contracts';
import { REQUIRED_AI_KEYWORDS } from './releaseContract';

export function buildGeneratorAiPrompt(topic: string): string {
  return [
    'Wygeneruj slownik/tabele dla generatora RPG jako poprawny JSON.',
    'Zwroc TYLKO JSON, bez komentarzy i bez markdown.',
    'W opisie paczki (`pack.description`) MUSZA pojawic sie wszystkie keywordy kontraktu AI.',
    `Keywordy wymagane: ${REQUIRED_AI_KEYWORDS.join(', ')}`,
    'Uzyj formatu:',
    '{ "pack": { "name": "...", "description": "...", "tables": [ { "name": "...", "type": "firstName|lastName|nickname|locationType|locationName|event|custom:...", "entries": [ { "value": "...", "weight": 1, "tags": [] } ] } ] } }',
    `Dozwolone typy systemowe: ${GENERATOR_SYSTEM_TABLE_TYPES.join(', ')}`,
    `Temat pakietu: ${topic}`,
  ].join('\n');
}

