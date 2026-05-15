import type { KeyValueStore } from '../../infra/storage/storage-types';
import type {
  JourneyMode,
  ThemePreference,
  UserJourneyState,
} from '../../types';
import { CURRENT_SCHEMA_VERSION } from '../../types';
import {
  migrateJourneyState,
  type MigrationRunnerOptions,
} from './migration-runner';

export interface CreateJourneyStateOptions {
  readonly consecrationId: string;
  readonly startDate: string;
  readonly mode?: JourneyMode;
  readonly theme?: ThemePreference;
  readonly reduceMotion?: boolean;
  readonly largeText?: boolean;
  readonly now?: string;
}

export class ProgressStore {
  readonly #storage: KeyValueStore<UserJourneyState>;
  readonly #migrationOptions: MigrationRunnerOptions;

  public constructor(
    storage: KeyValueStore<UserJourneyState>,
    migrationOptions: MigrationRunnerOptions = {},
  ) {
    this.#storage = storage;
    this.#migrationOptions = migrationOptions;
  }

  public async get(
    consecrationId: string,
  ): Promise<UserJourneyState | undefined> {
    const state = await this.#storage.get(consecrationId);

    if (state === undefined) {
      return undefined;
    }

    const migration = migrateJourneyState(state, this.#migrationOptions);

    if (migration.migrated) {
      await this.save(migration.state);
    }

    return migration.state;
  }

  public async getOrCreate(
    options: CreateJourneyStateOptions,
  ): Promise<UserJourneyState> {
    const existing = await this.get(options.consecrationId);

    if (existing !== undefined) {
      return existing;
    }

    const created = createDefaultJourneyState(options);
    await this.save(created);

    return created;
  }

  public async save(state: UserJourneyState): Promise<void> {
    await this.#storage.set(state.consecrationId, state);
  }

  public async update(
    consecrationId: string,
    updater: (state: UserJourneyState) => UserJourneyState,
  ): Promise<UserJourneyState> {
    const current = await this.get(consecrationId);

    if (current === undefined) {
      throw new Error(`Journey state for ${consecrationId} does not exist.`);
    }

    const updated = updater(current);
    await this.save(updated);

    return updated;
  }

  public async delete(consecrationId: string): Promise<void> {
    await this.#storage.delete(consecrationId);
  }
}

export function createDefaultJourneyState(
  options: CreateJourneyStateOptions,
): UserJourneyState {
  const now = options.now ?? new Date().toISOString();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    consecrationId: options.consecrationId,
    mode: options.mode ?? 'guided',
    startDate: options.startDate,
    currentDay: 1,
    completedDays: [],
    completedDayTimestamps: {},
    lastOpened: now,
    streak: 0,
    reflections: {},
    preferences: {
      theme: options.theme ?? 'system',
      reduceMotion: options.reduceMotion ?? false,
      largeText: options.largeText ?? false,
    },
  };
}
