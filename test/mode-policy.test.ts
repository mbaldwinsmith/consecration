import { describe, expect, it } from 'vitest';
import { resolveDayPlan, validateCustomRules } from '../src/domain/modes/mode-policy';
import type { DayContent } from '../src/types';

const dayContent: DayContent = {
  consecrationId: 'montfort',
  day: 4,
  title: 'Look Toward Christ',
  phase: 'preparation',
  author: 'Test',
  durationMinutes: 12,
  sections: [
    {
      id: 'reading',
      type: 'reading',
      title: 'Reading',
      html: '<p>Turn toward Christ with a steady heart.</p>',
      required: true,
      tags: ['reading'],
    },
    {
      id: 'prayer',
      type: 'prayer',
      title: 'Prayer',
      html: '<p>Lord, guide this day.</p>',
      required: true,
      tags: ['essential'],
    },
    {
      id: 'reflection',
      type: 'reflection',
      title: 'Reflection',
      html: '<p>Notice one invitation.</p>',
      required: false,
      tags: ['optional'],
    },
  ],
};

describe('mode policy resolver', () => {
  it('resolves guided mode with every source section included', () => {
    expect(
      resolveDayPlan({
        mode: 'guided',
        dayContent,
        missedDays: 0,
      }),
    ).toMatchInlineSnapshot(`
      {
        "canAutoSummarizeMissedDays": false,
        "completionCriteria": "strict",
        "estimatedMinutes": 3,
        "mode": "guided",
        "pacing": {
          "isShortened": false,
          "missedDays": 0,
          "targetMinutes": 12,
        },
        "reminders": [],
        "sections": [
          {
            "collapsedByDefault": false,
            "id": "reading",
            "included": true,
            "reason": "guided",
            "required": true,
          },
          {
            "collapsedByDefault": false,
            "id": "prayer",
            "included": true,
            "reason": "guided",
            "required": true,
          },
          {
            "collapsedByDefault": false,
            "id": "reflection",
            "included": true,
            "reason": "guided",
            "required": false,
          },
        ],
      }
    `);
  });

  it('resolves lite mode with essential sections and summary eligibility', () => {
    const plan = resolveDayPlan({
      mode: 'lite',
      dayContent,
      missedDays: 2,
    });

    expect(plan.completionCriteria).toBe('essential-only');
    expect(plan.canAutoSummarizeMissedDays).toBe(true);
    expect(plan.reminders).toContainEqual(
      expect.objectContaining({
        tone: 'gentle',
      }),
    );
    expect(plan.sections).toEqual([
      expect.objectContaining({ id: 'reading', included: true, reason: 'essential' }),
      expect.objectContaining({ id: 'prayer', included: true, reason: 'essential' }),
      expect.objectContaining({ id: 'reflection', included: false, reason: 'optional-omitted' }),
    ]);
  });

  it('resolves custom mode without mutating source content', () => {
    const before = structuredClone(dayContent);
    const plan = resolveDayPlan({
      mode: 'custom',
      dayContent,
      missedDays: 1,
      customRules: {
        includeSectionIds: ['reflection'],
        excludeSectionIds: ['prayer'],
        maxEstimatedMinutes: 3,
      },
    });

    expect(dayContent).toEqual(before);
    expect(plan.completionCriteria).toBe('custom');
    expect(plan.sections).toEqual([
      expect.objectContaining({ id: 'reading', included: true }),
      expect.objectContaining({ id: 'prayer', included: false }),
      expect.objectContaining({ id: 'reflection', included: true }),
    ]);
  });

  it('supports lite mode when optional sections are missing', () => {
    const requiredOnly: DayContent = {
      ...dayContent,
      sections: dayContent.sections.filter((section) => section.required),
    };

    expect(() =>
      resolveDayPlan({
        mode: 'lite',
        dayContent: requiredOnly,
        missedDays: 0,
      }),
    ).not.toThrow();
  });

  it('validates custom rules that cannot produce a completable day', () => {
    expect(
      validateCustomRules(dayContent, {
        excludeSectionIds: ['reading', 'prayer'],
        completionRequiresAllIncluded: true,
      }),
    ).toContain('Custom mode cannot require completion when every required section is excluded.');
  });
});
