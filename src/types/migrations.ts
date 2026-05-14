import type { UserJourneyState } from './journey';

export const CURRENT_SCHEMA_VERSION = 1;

export type Migration = (state: Readonly<unknown>) => UserJourneyState;

export const migrationRegistry: ReadonlyMap<number, Migration> = new Map();
