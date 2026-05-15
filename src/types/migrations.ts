import type { UserJourneyState } from './journey';

export const CURRENT_SCHEMA_VERSION = 1;

export type Migration = (state: unknown) => unknown;

export const migrationRegistry: ReadonlyMap<number, Migration> = new Map();

export interface MigrationResult {
  readonly state: UserJourneyState;
  readonly migrated: boolean;
  readonly fromVersion: number;
  readonly toVersion: number;
}
