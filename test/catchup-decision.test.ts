import { describe, expect, it } from 'vitest';
import { calculateMissedDays, resolveCatchUpDecision } from '../src/domain/catchup/catchup-decision';

describe('catch-up decision engine', () => {
  it('calculates missed days from start date and current day', () => {
    expect(
      calculateMissedDays({
        startDate: '2026-05-15',
        currentDay: 2,
        totalDays: 33,
        today: '2026-05-18',
      }),
    ).toBe(2);
  });

  it.each([
    [1, '2026-05-15', 'show-current-day', '/day/1'],
    [1, '2026-05-16', 'normal-resume', '/day/1'],
    [1, '2026-05-17', 'offer-options', '/catch-up'],
    [1, '2026-05-20', 'suggest-lite', '/catch-up'],
  ] as const)('maps the planned branch for current day %i on %s', (currentDay, today, kind, route) => {
    expect(
      resolveCatchUpDecision(
        {
          startDate: '2026-05-15',
          currentDay,
        },
        33,
        new Date(`${today}T12:00:00.000Z`),
      ),
    ).toMatchObject({
      kind,
      route,
    });
  });
});
