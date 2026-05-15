import type { CatchUpPath } from './catchup-decision';

export interface CatchUpSelection {
  readonly path: CatchUpPath;
  readonly selectedAt: string;
}

const storageKey = 'consecration.catchUp.selection';

export function persistCatchUpSelection(
  path: CatchUpPath,
  storage: Storage = window.localStorage,
  now: Date = new Date(),
): CatchUpSelection {
  const selection = {
    path,
    selectedAt: now.toISOString(),
  };

  storage.setItem(storageKey, JSON.stringify(selection));

  return selection;
}

export function loadCatchUpSelection(storage: Storage = window.localStorage): CatchUpSelection | undefined {
  const value = storage.getItem(storageKey);

  if (value === null) {
    return undefined;
  }

  const parsed = JSON.parse(value) as Partial<CatchUpSelection>;

  if (
    (parsed.path === 'one-session' || parsed.path === 'summarize-missed-days' || parsed.path === 'temporary-lite') &&
    typeof parsed.selectedAt === 'string'
  ) {
    return {
      path: parsed.path,
      selectedAt: parsed.selectedAt,
    };
  }

  return undefined;
}
