import type { Migration, MigrationResult, UserJourneyState } from '../../types';
import { CURRENT_SCHEMA_VERSION, migrationRegistry } from '../../types';

export interface MigrationRunnerOptions {
  readonly currentVersion?: number;
  readonly migrations?: ReadonlyMap<number, Migration>;
}

export function migrateJourneyState(
  state: unknown,
  options: MigrationRunnerOptions = {},
): MigrationResult {
  const currentVersion = options.currentVersion ?? CURRENT_SCHEMA_VERSION;
  const migrations = options.migrations ?? migrationRegistry;
  let workingState = state;
  const fromVersion = readSchemaVersion(workingState);

  if (fromVersion > currentVersion) {
    throw new Error(
      `Journey state schema v${String(fromVersion)} is newer than supported schema v${String(currentVersion)}.`,
    );
  }

  for (let version = fromVersion; version < currentVersion; version += 1) {
    const migration = migrations.get(version);

    if (migration === undefined) {
      throw new Error(
        `Missing migration from journey schema v${String(version)} to v${String(version + 1)}.`,
      );
    }

    workingState = migration(workingState);
  }

  const migratedState = coerceJourneyState(workingState);

  return {
    state: migratedState,
    migrated: fromVersion !== currentVersion,
    fromVersion,
    toVersion: currentVersion,
  };
}

export function coerceJourneyState(state: unknown): UserJourneyState {
  if (!isRecord(state)) {
    throw new Error('Journey state must be an object.');
  }

  const candidate = state as Partial<UserJourneyState>;

  if (typeof candidate.schemaVersion !== 'number') {
    throw new Error('Journey state is missing schemaVersion.');
  }

  if (
    typeof candidate.consecrationId !== 'string' ||
    candidate.consecrationId.length === 0
  ) {
    throw new Error('Journey state is missing consecrationId.');
  }

  if (
    candidate.mode !== 'guided' &&
    candidate.mode !== 'lite' &&
    candidate.mode !== 'custom'
  ) {
    throw new Error('Journey state has an invalid mode.');
  }

  if (
    !Array.isArray(candidate.completedDays) ||
    !candidate.completedDays.every(isPositiveInteger)
  ) {
    throw new Error(
      'Journey state completedDays must be an array of positive integers.',
    );
  }

  return {
    schemaVersion: candidate.schemaVersion,
    consecrationId: candidate.consecrationId,
    mode: candidate.mode,
    startDate: requireString(candidate.startDate, 'startDate'),
    currentDay: requirePositiveInteger(candidate.currentDay, 'currentDay'),
    completedDays: [...new Set(candidate.completedDays)].sort(
      (left, right) => left - right,
    ),
    completedDayTimestamps: candidate.completedDayTimestamps ?? {},
    lastOpened: requireString(candidate.lastOpened, 'lastOpened'),
    streak: typeof candidate.streak === 'number' ? candidate.streak : 0,
    reflections: candidate.reflections ?? {},
    preferences: {
      theme: candidate.preferences?.theme ?? 'system',
      reduceMotion: candidate.preferences?.reduceMotion ?? false,
      largeText: candidate.preferences?.largeText ?? false,
      reminders: candidate.preferences?.reminders,
    },
  };
}

function readSchemaVersion(state: unknown): number {
  if (!isRecord(state) || typeof state.schemaVersion !== 'number') {
    throw new Error('Journey state is missing schemaVersion.');
  }

  return state.schemaVersion;
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Journey state is missing ${key}.`);
  }

  return value;
}

function requirePositiveInteger(value: unknown, key: string): number {
  if (!isPositiveInteger(value)) {
    throw new Error(`Journey state ${key} must be a positive integer.`);
  }

  return value;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
