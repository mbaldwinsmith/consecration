import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../src/infra/storage/local-storage-adapter';
import { ProgressStore } from '../src/domain/progress/progress-store';
import type { UserJourneyState } from '../src/types';

describe('progress store', () => {
  it('persists journey state across store instances', async () => {
    const adapter = new LocalStorageAdapter<UserJourneyState>('test.journey');
    const firstStore = new ProgressStore(adapter);

    const created = await firstStore.getOrCreate({
      consecrationId: 'montfort',
      startDate: '2026-05-15',
      now: '2026-05-15T08:00:00.000Z',
    });

    const secondStore = new ProgressStore(
      new LocalStorageAdapter<UserJourneyState>('test.journey'),
    );

    await expect(secondStore.get('montfort')).resolves.toEqual(created);
  });

  it('migrates loaded state and saves the migrated result', async () => {
    const adapter = new LocalStorageAdapter<UserJourneyState>('test.migration');
    const legacy = {
      schemaVersion: 1,
      consecrationId: 'montfort',
      mode: 'guided',
      startDate: '2026-05-15',
      currentDay: 1,
      completedDays: [1],
      lastOpened: '2026-05-15T08:00:00.000Z',
      streak: 1,
      reflections: {},
      preferences: {
        theme: 'system',
        reduceMotion: false,
        largeText: false,
      },
    } as unknown as UserJourneyState;

    await adapter.set('montfort', legacy);

    const store = new ProgressStore(adapter, {
      currentVersion: 2,
      migrations: new Map([
        [
          1,
          (state) => ({
            ...(state as Record<string, unknown>),
            schemaVersion: 2,
            completedDayTimestamps: { 1: '2026-05-15T08:00:00.000Z' },
          }),
        ],
      ]),
    });

    const migrated = await store.get('montfort');

    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.completedDayTimestamps[1]).toBe(
      '2026-05-15T08:00:00.000Z',
    );
    await expect(adapter.get('montfort')).resolves.toEqual(migrated);
  });
});
