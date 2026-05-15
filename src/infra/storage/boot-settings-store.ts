import type { BootSettings } from '../../app/settings';
import {
  loadBootSettings,
  persistHideStreakMetrics,
  persistLargeText,
  persistLastRoute,
  persistMode,
  persistReminderEnabled,
  persistReminderTimeLocal,
  persistReduceMotion,
  persistTheme,
} from '../../app/settings';

export class BootSettingsStore {
  readonly #storage: Storage;

  public constructor(storage: Storage = window.localStorage) {
    this.#storage = storage;
  }

  public load(): BootSettings {
    return loadBootSettings(this.#storage);
  }

  public save(settings: BootSettings): void {
    persistTheme(settings.theme, this.#storage);
    persistLastRoute(settings.lastRoute, this.#storage);
    persistReduceMotion(settings.reduceMotion, this.#storage);
    persistLargeText(settings.largeText, this.#storage);
    persistMode(settings.mode, this.#storage);
    persistReminderEnabled(settings.reminderEnabled, this.#storage);
    persistReminderTimeLocal(settings.reminderTimeLocal, this.#storage);
    persistHideStreakMetrics(settings.hideStreakMetrics, this.#storage);
    this.#storage.setItem(
      'consecration.consecrationId',
      settings.consecrationId,
    );
  }

  public checkHealth(): boolean {
    const key = 'consecration.boot.healthcheck';

    try {
      this.#storage.setItem(key, 'true');
      this.#storage.removeItem(key);

      return true;
    } catch {
      return false;
    }
  }
}
