import { describe, expect, it } from 'vitest';
import { generateMissedDaySummary } from '../src/domain/catchup/missed-day-summary';
import type { CompiledDayPayload } from '../src/domain/content/content-types';

describe('missed day summary', () => {
  it('generates capped summary text from compiled payload metadata', () => {
    const payloads: readonly CompiledDayPayload[] = [
      createPayload(2, ['make-room-for-grace', 'ask-mary-to-lead-us-to-jesus']),
      createPayload(1, ['begin-with-a-simple-desire-for-god']),
    ];

    const summary = generateMissedDaySummary(payloads, {
      maxItems: 2,
      maxCharacters: 120,
    });

    expect(summary.dayRangeLabel).toBe('Days 1-2');
    expect(summary.items).toEqual([
      'Day 1: begin with a simple desire for god.',
      'Day 2: make room for grace.',
    ]);
    expect(summary.text.length).toBeLessThanOrEqual(120);
    expect(summary.text).not.toMatch(/behind|failed|overdue|penalty/i);
  });
});

function createPayload(day: number, summaryKeys: readonly string[]): CompiledDayPayload {
  return {
    content: {
      consecrationId: 'montfort',
      day,
      title: `Day ${String(day)}`,
      phase: 'preparation',
      durationMinutes: 5,
      sections: [],
    },
    summaryKeys,
    recurringContentIds: [],
  };
}
