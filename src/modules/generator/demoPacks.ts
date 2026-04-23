import { generateId } from '@shared/utils/id';
import { nowISO } from '@shared/utils/date';
import type { GeneratorPackRecord } from '@shared/types/generator';
import type { GeneratorTableRecord } from '@shared/types/generator';

export function createGeneratorDemoPacks(campaignId: string): GeneratorPackRecord[] {
  const now = nowISO();
  return [
    createPack(campaignId, now, 'Demo PL - Fantasy', 'Polski zestaw demo do szybkiego startu.', {
      firstName: ['Aldor', 'Mira', 'Zofia', 'Borys', 'Kaja'],
      lastName: ['z Brzeziny', 'Kamienny', 'Srebrna', 'Wronowski', 'z Doliny'],
      nickname: ['Lis', 'Mlot', 'Mgla', 'Kruk', 'Sztych'],
      locationType: ['Miasto', 'Ruiny', 'Lochy', 'Budynek'],
      locationName: ['Czarna Baszta', 'Port Cieni', 'Twierdza Popiolu', 'Podziemny Bazyliszek'],
      event: ['Zgasly wszystkie latarnie.', 'Przybywa poslaniec z grozba.', 'Rozlega sie dzwon alarmowy.'],
    }),
    createPack(campaignId, now, 'Demo EN - Dark Frontier', 'English demo set for quick improvisation.', {
      firstName: ['Arlen', 'Maeve', 'Rowan', 'Selene', 'Victor'],
      lastName: ['Blackwater', 'Ashford', 'Holloway', 'Stone', 'Graves'],
      nickname: ['Whisper', 'Ironhand', 'Raven', 'Scar', 'Nightglass'],
      locationType: ['City', 'Ruins', 'Dungeon', 'Wilderness'],
      locationName: ['Red Harbor', 'Ashkeep', 'Morrow Vault', 'Bleakwood Crossing'],
      event: ['A courier collapses with a blood-sealed letter.', 'The market square erupts into panic.', 'A bell tolls thirteen times.'],
    }),
  ];
}

function createPack(
  campaignId: string,
  now: string,
  name: string,
  description: string,
  source: Record<string, string[]>,
): GeneratorPackRecord {
  return {
    id: generateId(),
    campaignId,
    name,
    description,
    isActive: false,
    tables: Object.entries(source).map(([type, values]) => createTable(type, values, now)),
    createdAt: now,
    updatedAt: now,
  };
}

function createTable(type: string, values: string[], now: string): GeneratorTableRecord {
  return {
    id: generateId(),
    name: type,
    type,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    entries: values.map((value) => ({
      id: generateId(),
      value,
      weight: 1,
      tags: [],
      isActive: true,
    })),
  };
}

