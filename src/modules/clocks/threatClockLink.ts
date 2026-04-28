import type { MgHelperDb } from '@shared/db/database';
import { updateEntity } from '@shared/db/operations';
import { getClockData } from '@shared/utils/entityData';
import { isClock } from './types';

/**
 * Po powiązaniu zegara z zagrożeniem (`tracks`) zegar staje się zegarem presji zagrożenia,
 * a nie „wolnym” zegarem kampanii (pomijamy `kind: 'session'`).
 */
export async function markClockLinkedToThreat(db: MgHelperDb, clockId: string): Promise<void> {
  const entity = await db.entities.get(clockId);
  if (!entity || !isClock(entity)) return;
  const data = getClockData(entity);
  if (data.kind === 'session') return;
  await updateEntity(db, clockId, {
    data: { ...data, kind: 'threat' },
  });
}

/** Po odłączeniu zegara od zagrożenia zegar wraca do puli wolnych (jeśli był `threat`). */
export async function markClockUnlinkedFromThreat(db: MgHelperDb, clockId: string): Promise<void> {
  const entity = await db.entities.get(clockId);
  if (!entity || !isClock(entity)) return;
  const data = getClockData(entity);
  if (data.kind !== 'threat') return;
  await updateEntity(db, clockId, {
    data: { ...data, kind: 'free' },
  });
}
