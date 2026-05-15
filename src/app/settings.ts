import type { JourneyMode, ThemePreference } from '../types';

export interface BootSettings {
  readonly theme: ThemePreference;
  readonly lastRoute: string;
  readonly reduceMotion: boolean;
  readonly largeText: boolean;
  readonly consecrationId: string;
  readonly mode: JourneyMode;
  readonly reminderEnabled: boolean;
  readonly reminderTimeLocal: string;
  readonly hideStreakMetrics: boolean;
}

const storageKeys = {
  theme: 'consecration.theme',
  lastRoute: 'consecration.lastRoute',
  reduceMotion: 'consecration.reduceMotion',
  largeText: 'consecration.largeText',
  consecrationId: 'consecration.consecrationId',
  mode: 'consecration.mode',
  reminderEnabled: 'consecration.reminderEnabled',
  reminderTimeLocal: 'consecration.reminderTimeLocal',
  hideStreakMetrics: 'consecration.hideStreakMetrics',
} as const;

const defaultSettings: BootSettings = {
  theme: 'system',
  lastRoute: '/today',
  reduceMotion: false,
  largeText: false,
  consecrationId: 'montfort',
  mode: 'guided',
  reminderEnabled: false,
  reminderTimeLocal: '08:00',
  hideStreakMetrics: false,
};

export function loadBootSettings(
  storage: Storage = window.localStorage,
): BootSettings {
  return {
    theme: parseTheme(storage.getItem(storageKeys.theme)),
    lastRoute: parseRoute(storage.getItem(storageKeys.lastRoute)),
    reduceMotion: storage.getItem(storageKeys.reduceMotion) === 'true',
    largeText: storage.getItem(storageKeys.largeText) === 'true',
    consecrationId:
      storage.getItem(storageKeys.consecrationId) ??
      defaultSettings.consecrationId,
    mode: parseMode(storage.getItem(storageKeys.mode)),
    reminderEnabled: storage.getItem(storageKeys.reminderEnabled) === 'true',
    reminderTimeLocal: parseTime(
      storage.getItem(storageKeys.reminderTimeLocal),
    ),
    hideStreakMetrics:
      storage.getItem(storageKeys.hideStreakMetrics) === 'true',
  };
}

export function persistLastRoute(
  route: string,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.lastRoute, parseRoute(route));
}

export function persistTheme(
  theme: ThemePreference,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.theme, theme);
}

export function persistReduceMotion(
  enabled: boolean,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.reduceMotion, String(enabled));
}

export function persistLargeText(
  enabled: boolean,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.largeText, String(enabled));
}

export function persistMode(
  mode: JourneyMode,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.mode, mode);
}

export function persistReminderEnabled(
  enabled: boolean,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.reminderEnabled, String(enabled));
}

export function persistReminderTimeLocal(
  timeLocal: string,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.reminderTimeLocal, parseTime(timeLocal));
}

export function persistHideStreakMetrics(
  enabled: boolean,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(storageKeys.hideStreakMetrics, String(enabled));
}

export function applyAccessibilityPreferences(
  settings: Pick<BootSettings, 'largeText' | 'reduceMotion'>,
): void {
  document.documentElement.classList.toggle('large-text', settings.largeText);
  document.documentElement.classList.toggle(
    'reduce-motion',
    settings.reduceMotion,
  );
}

export function applyThemePreference(theme: ThemePreference): void {
  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.theme = resolvedTheme;
}

function parseTheme(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return defaultSettings.theme;
}

function parseMode(value: string | null): JourneyMode {
  if (value === 'guided' || value === 'lite' || value === 'custom') {
    return value;
  }

  return defaultSettings.mode;
}

function parseTime(value: string | null): string {
  if (value !== null && /^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return defaultSettings.reminderTimeLocal;
}

function parseRoute(value: string | null): string {
  if (value?.startsWith('/') === true) {
    return value;
  }

  return defaultSettings.lastRoute;
}
