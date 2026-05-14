export type JourneyMode = 'guided' | 'lite' | 'custom';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserJourneyState {
  readonly schemaVersion: number;
  readonly consecrationId: string;
  readonly mode: JourneyMode;
  readonly startDate: string;
  readonly currentDay: number;
  readonly completedDays: readonly number[];
  readonly lastOpened: string;
  readonly streak: number;
  readonly reflections: Readonly<Record<number, string>>;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly reminders?: ReminderPreference;
  readonly theme: ThemePreference;
  readonly reduceMotion: boolean;
  readonly largeText: boolean;
}

export interface ReminderPreference {
  readonly enabled: boolean;
  readonly timeLocal?: string;
}
