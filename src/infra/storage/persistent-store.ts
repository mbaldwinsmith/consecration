import type { ReflectionEntry, UserJourneyState } from '../../types';
import { IndexedDbAdapter } from './indexeddb-adapter';
import { LocalStorageAdapter } from './local-storage-adapter';
import type { KeyValueStore, StorageHealth } from './storage-types';

export interface PersistentStores {
  readonly journey: KeyValueStore<UserJourneyState>;
  readonly reflections: KeyValueStore<ReflectionEntry>;
  readonly health: StorageHealth;
}

const databaseName = 'consecration';
const storeNames = ['journey', 'reflections'] as const;

export async function createPersistentStores(
  storage: Storage = window.localStorage,
): Promise<PersistentStores> {
  const journeyIndexedDb = new IndexedDbAdapter<UserJourneyState>({
    databaseName,
    storeName: 'journey',
    storeNames,
  });
  const health = await journeyIndexedDb.checkHealth();

  if (health.status === 'available') {
    return {
      journey: journeyIndexedDb,
      reflections: new IndexedDbAdapter<ReflectionEntry>({
        databaseName,
        storeName: 'reflections',
        storeNames,
      }),
      health,
    };
  }

  return {
    journey: new LocalStorageAdapter<UserJourneyState>(
      'consecration.journey',
      storage,
    ),
    reflections: new LocalStorageAdapter<ReflectionEntry>(
      'consecration.reflections',
      storage,
    ),
    health: {
      status: 'available',
      adapter: 'localStorage',
      reason: `IndexedDB fallback: ${health.reason ?? 'unavailable'}`,
    },
  };
}
