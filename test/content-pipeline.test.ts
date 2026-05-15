import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatValidationErrors,
  validateContent,
} from '../scripts/content-pipeline';

describe('content pipeline', () => {
  it('returns actionable validation errors for invalid front matter', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'consecration-content-'));
    const days = path.join(root, 'broken', 'days');
    const recurring = path.join(root, 'broken', 'recurring');

    await import('node:fs/promises').then(async ({ mkdir }) => {
      await mkdir(days, { recursive: true });
      await mkdir(recurring, { recursive: true });
    });

    await writeFile(
      path.join(days, '1.md'),
      [
        '---',
        'title: Broken Day',
        'phase: preparation',
        'author: Test',
        'duration: 5',
        'sectionType: reading',
        'tags: [sample]',
        '---',
        'Body',
      ].join('\n'),
      'utf8',
    );

    await expect(validateContent({ contentRoot: root })).rejects.toThrow(
      'front matter "summaryKeys" must be an array',
    );
  });

  it('formats validation errors for CLI output', () => {
    expect(formatValidationErrors(['first problem'])).toContain(
      '- first problem',
    );
  });
});
