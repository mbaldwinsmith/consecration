import { describe, expect, it } from 'vitest';
import { BootSettingsStore } from '../src/infra/storage/boot-settings-store';
import { createPersistentStores } from '../src/infra/storage/persistent-store';

describe('storage adapters', () => {
  it('saves and loads boot settings through the localStorage wrapper', () => {
    const store = new BootSettingsStore();

    store.save({
      theme: 'dark',
      lastRoute: '/day/3',
      reduceMotion: true,
      largeText: true,
      consecrationId: 'montfort',
      mode: 'lite',
      reminderEnabled: true,
      reminderTimeLocal: '07:30',
      hideStreakMetrics: true,
    });

    expect(store.checkHealth()).toBe(true);
    expect(store.load()).toEqual({
      theme: 'dark',
      lastRoute: '/day/3',
      reduceMotion: true,
      largeText: true,
      consecrationId: 'montfort',
      mode: 'lite',
      reminderEnabled: true,
      reminderTimeLocal: '07:30',
      hideStreakMetrics: true,
    });
  });

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    const stores = await createPersistentStores();

    expect(stores.health.adapter).toBe('localStorage');
    expect(stores.health.status).toBe('available');
  });
});
