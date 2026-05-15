import { describe, expect, it } from 'vitest';
import { ContentRepository } from '../src/domain/content/content-repository';
import type {
  CompiledDayPayload,
  ContentIndex,
} from '../src/domain/content/content-types';

describe('content repository', () => {
  it('loads a compiled day payload through the content index', async () => {
    const index: ContentIndex = {
      schemaVersion: 1,
      generatedAt: '2026-05-15T00:00:00.000Z',
      consecrations: [
        { id: 'montfort', title: 'St. Louis de Montfort', totalDays: 1 },
      ],
      days: [
        {
          consecrationId: 'montfort',
          day: 1,
          title: 'Day 1',
          phase: 'preparation',
          durationMinutes: 5,
          path: 'days/montfort/1.json',
          tags: ['preparation'],
          summaryKeys: ['begin'],
        },
      ],
    };

    const payload: CompiledDayPayload = {
      content: {
        consecrationId: 'montfort',
        day: 1,
        title: 'Day 1',
        phase: 'preparation',
        author: 'Test',
        durationMinutes: 5,
        sections: [],
      },
      summaryKeys: ['begin'],
      recurringContentIds: [],
    };

    const repository = new ContentRepository({
      baseUrl: '/compiled',
      fetcher: (input) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              input === '/compiled/content-index.json' ? index : payload,
            ),
        }),
    });

    await expect(repository.getDay('montfort', 1)).resolves.toEqual(payload);
  });

  it('reports missing day lookups clearly', async () => {
    const repository = new ContentRepository({
      fetcher: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              schemaVersion: 1,
              generatedAt: '2026-05-15T00:00:00.000Z',
              consecrations: [],
              days: [],
            } satisfies ContentIndex),
        }),
    });

    await expect(repository.getDay('montfort', 9)).rejects.toThrow(
      'montfort day 9',
    );
  });
});
