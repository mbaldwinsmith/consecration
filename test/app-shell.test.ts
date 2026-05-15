import { describe, expect, it } from 'vitest';
import { bundledManifestPointer } from '../src/app/manifest';
import { parseRoute } from '../src/app/router';
import { createAppShell } from '../src/app/shell';

describe('app shell', () => {
  it('renders the app shell with the current schema version', () => {
    const shell = createAppShell({
      manifest: bundledManifestPointer,
      route: { name: 'today', path: '/today' },
      schemaVersion: 1,
      settings: {
        theme: 'system',
        lastRoute: '/today',
        reduceMotion: false,
        largeText: false,
        consecrationId: 'montfort',
        mode: 'guided',
        reminderEnabled: false,
        reminderTimeLocal: '08:00',
        hideStreakMetrics: false,
      },
    });

    expect(shell.dataset.testid).toBe('app-shell');
    expect(shell.textContent).toContain('Schema v1');
    expect(shell.querySelector('[data-testid="day-view"]')).not.toBeNull();
    expect(shell.querySelector('[data-testid="day-pager"]')).not.toBeNull();
  });

  it('guards invalid day routes back to today', () => {
    expect(parseRoute('/day/34', 33)).toEqual({
      name: 'today',
      path: '/today',
    });
  });

  it('parses supported direct routes', () => {
    expect(parseRoute('/timeline', 33)).toEqual({
      name: 'timeline',
      path: '/timeline',
    });
    expect(parseRoute('/settings', 33)).toEqual({
      name: 'settings',
      path: '/settings',
    });
    expect(parseRoute('/catch-up', 33)).toEqual({
      name: 'catch-up',
      path: '/catch-up',
    });
    expect(parseRoute('/day/7', 33)).toEqual({
      name: 'day',
      path: '/day/7',
      day: 7,
    });
  });

  it('renders timeline and expanded settings controls', () => {
    const baseSettings = {
      theme: 'system',
      lastRoute: '/today',
      reduceMotion: false,
      largeText: false,
      consecrationId: 'montfort',
      mode: 'lite' as const,
      reminderEnabled: true,
      reminderTimeLocal: '07:30',
      hideStreakMetrics: false,
    } as const;

    const timeline = createAppShell({
      manifest: bundledManifestPointer,
      route: { name: 'timeline', path: '/timeline' },
      schemaVersion: 1,
      settings: baseSettings,
    });
    const settings = createAppShell({
      manifest: bundledManifestPointer,
      route: { name: 'settings', path: '/settings' },
      schemaVersion: 1,
      settings: baseSettings,
    });

    expect(
      timeline.querySelector('[data-testid="timeline-view"]'),
    ).not.toBeNull();
    expect(settings.textContent).toContain('Mode');
    expect(settings.textContent).toContain('Reminder');
  });
});
