import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../src/infra/storage/local-storage-adapter';
import { ProgressService } from '../src/domain/progress/progress-service';
import { ProgressStore } from '../src/domain/progress/progress-store';
import type { UserJourneyState } from '../src/types';

describe('progress service', () => {
  it('marks completion idempotently and computes summary values', async () => {
    const store = new ProgressStore(
      new LocalStorageAdapter<UserJourneyState>('test.progress-service'),
    );
    await store.getOrCreate({
      consecrationId: 'montfort',
      startDate: '2026-05-15',
      now: '2026-05-15T06:00:00.000Z',
    });

    const service = new ProgressService(store, {
      totalDays: 7,
      phases: [
        { day: 1, phase: 'preparation' },
        { day: 2, phase: 'preparation' },
        { day: 3, phase: 'knowledge-of-self' },
      ],
      now: () => new Date('2026-05-15T08:00:00.000Z'),
    });

    const first = await service.markDayComplete('montfort', 1);
    const second = await service.markDayComplete('montfort', 1);

    expect(second).toEqual(first);
    expect(second.completedDays).toEqual([1]);
    expect(second.completedDayTimestamps[1]).toBe('2026-05-15T08:00:00.000Z');

    const summary = service.summarize(second);

    expect(summary.completedCount).toBe(1);
    expect(summary.completionPercent).toBe(14);
    expect(summary.nextDay).toBe(2);
    expect(summary.phaseProgress).toContainEqual({
      phase: 'preparation',
      completed: 1,
      total: 2,
      percent: 50,
    });
  });

  it('computes streaks from distinct consecutive completion dates', async () => {
    const store = new ProgressStore(
      new LocalStorageAdapter<UserJourneyState>('test.streak'),
    );
    await store.save({
      schemaVersion: 1,
      consecrationId: 'montfort',
      mode: 'guided',
      startDate: '2026-05-15',
      currentDay: 4,
      completedDays: [1, 2, 3],
      completedDayTimestamps: {
        1: '2026-05-15T08:00:00.000Z',
        2: '2026-05-16T08:00:00.000Z',
        3: '2026-05-18T08:00:00.000Z',
      },
      lastOpened: '2026-05-18T08:00:00.000Z',
      streak: 0,
      reflections: {},
      preferences: {
        theme: 'system',
        reduceMotion: false,
        largeText: false,
      },
    });

    const service = new ProgressService(store, { totalDays: 7 });
    const state = await store.get('montfort');

    if (state === undefined) {
      throw new Error('Expected journey state to exist.');
    }

    expect(service.summarize(state).streak).toBe(1);
  });
});
