import { describe, expect, it } from 'vitest';
import { createAppShell } from '../src/app/shell';

describe('app shell', () => {
  it('renders the app shell with the current schema version', () => {
    const shell = createAppShell(1);

    expect(shell.dataset.testid).toBe('app-shell');
    expect(shell.textContent).toContain('Schema v1');
  });
});
