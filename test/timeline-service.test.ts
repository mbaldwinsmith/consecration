import { describe, expect, it } from 'vitest';
import { buildTimelineEntries } from '../src/domain/progress/timeline-service';
import type { ReflectionEntry, UserJourneyState } from '../src/types';

describe('timeline service', () => {
  it('builds completion, reflection, and phase milestone entries', () => {
    const state: UserJourneyState = {
      schemaVersion: 1,
      consecrationId: 'montfort',
      mode: 'guided',
      startDate: '2026-05-15',
      currentDay: 3,
      completedDays: [1, 2],
      completedDayTimestamps: {
        1: '2026-05-15T08:00:00.000Z',
        2: '2026-05-16T08:00:00.000Z',
      },
      lastOpened: '2026-05-16T08:00:00.000Z',
      streak: 2,
      reflections: {},
      preferences: {
        theme: 'system',
        reduceMotion: false,
        largeText: false,
      },
    };
    const reflection: ReflectionEntry = {
      id: 'reflection-1',
      consecrationId: 'montfort',
      day: 1,
      text: 'A simple note.',
      createdAt: '2026-05-15T09:00:00.000Z',
      updatedAt: '2026-05-15T09:00:00.000Z',
    };

    const entries = buildTimelineEntries(
      state,
      [reflection],
      [
        { day: 1, phase: 'preparation', title: 'Preparation began' },
        { day: 2, phase: 'preparation', title: 'Preparation milestone' },
      ],
    );

    expect(entries.map((entry) => entry.type)).toContain('completion');
    expect(entries.map((entry) => entry.type)).toContain('reflection');
    expect(entries).toContainEqual(
      expect.objectContaining({
        id: 'phase:montfort:preparation',
        type: 'phase-milestone',
        day: 2,
      }),
    );
  });
});
