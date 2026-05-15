export type JourneyMode = 'guided' | 'lite' | 'custom';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserJourneyState {
  readonly schemaVersion: number;
  readonly consecrationId: string;
  readonly mode: JourneyMode;
  readonly startDate: string;
  readonly currentDay: number;
  readonly completedDays: readonly number[];
  readonly completedDayTimestamps: Readonly<Record<number, string>>;
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

export interface ReflectionEntry {
  readonly id: string;
  readonly consecrationId: string;
  readonly day: number;
  readonly text: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type TimelineEntryType = 'completion' | 'reflection' | 'phase-milestone';

export interface TimelineEntry {
  readonly id: string;
  readonly type: TimelineEntryType;
  readonly consecrationId: string;
  readonly day: number;
  readonly occurredAt: string;
  readonly title: string;
  readonly description?: string;
}
