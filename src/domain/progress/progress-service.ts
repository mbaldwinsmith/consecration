import type { ContentPhase, UserJourneyState } from '../../types';
import type { ProgressStore } from './progress-store';

export interface ProgressSummary {
  readonly completedCount: number;
  readonly completionPercent: number;
  readonly streak: number;
  readonly nextDay: number;
  readonly phaseProgress: readonly PhaseProgress[];
}

export interface PhaseProgress {
  readonly phase: ContentPhase;
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
}

export interface PhaseDay {
  readonly day: number;
  readonly phase: ContentPhase;
}

export interface ProgressServiceOptions {
  readonly totalDays: number;
  readonly phases?: readonly PhaseDay[];
  readonly now?: () => Date;
}

export class ProgressService {
  readonly #store: ProgressStore;
  readonly #totalDays: number;
  readonly #phases: readonly PhaseDay[];
  readonly #now: () => Date;

  public constructor(store: ProgressStore, options: ProgressServiceOptions) {
    this.#store = store;
    this.#totalDays = options.totalDays;
    this.#phases = options.phases ?? [];
    this.#now = options.now ?? (() => new Date());
  }

  public async markDayComplete(
    consecrationId: string,
    day: number,
  ): Promise<UserJourneyState> {
    this.#assertValidDay(day);
    const completedAt = this.#now().toISOString();

    return this.#store.update(consecrationId, (state) =>
      completeDay(state, day, completedAt, this.#totalDays),
    );
  }

  public async markDayIncomplete(
    consecrationId: string,
    day: number,
  ): Promise<UserJourneyState> {
    this.#assertValidDay(day);

    return this.#store.update(consecrationId, (state) =>
      uncompleteDay(state, day, this.#totalDays),
    );
  }

  public summarize(state: UserJourneyState): ProgressSummary {
    return summarizeProgress(state, {
      totalDays: this.#totalDays,
      phases: this.#phases,
    });
  }

  #assertValidDay(day: number): void {
    if (!Number.isInteger(day) || day < 1 || day > this.#totalDays) {
      throw new Error(
        `Day ${String(day)} is outside the 1-${String(this.#totalDays)} journey range.`,
      );
    }
  }
}

export function completeDay(
  state: UserJourneyState,
  day: number,
  completedAt: string,
  totalDays: number,
): UserJourneyState {
  if (state.completedDays.includes(day)) {
    return state;
  }

  const completedDays = [...state.completedDays, day].sort(
    (left, right) => left - right,
  );
  const completedDayTimestamps = {
    ...state.completedDayTimestamps,
    [day]: completedAt,
  };
  const nextDay = findNextDay(completedDays, totalDays);

  return {
    ...state,
    completedDays,
    completedDayTimestamps,
    currentDay: nextDay,
    lastOpened: completedAt,
    streak: computeStreak(completedDayTimestamps),
  };
}

export function uncompleteDay(
  state: UserJourneyState,
  day: number,
  totalDays: number,
): UserJourneyState {
  if (!state.completedDays.includes(day)) {
    return state;
  }

  const completedDays = state.completedDays.filter(
    (completedDay) => completedDay !== day,
  );
  const completedDayTimestamps = Object.fromEntries(
    Object.entries(state.completedDayTimestamps).filter(
      ([completedDay]) => Number(completedDay) !== day,
    ),
  );
  const nextDay = Math.min(day, findNextDay(completedDays, totalDays));

  return {
    ...state,
    completedDays,
    completedDayTimestamps,
    currentDay: nextDay,
    streak: computeStreak(completedDayTimestamps),
  };
}

export function summarizeProgress(
  state: UserJourneyState,
  options: Pick<ProgressServiceOptions, 'totalDays' | 'phases'>,
): ProgressSummary {
  const totalDays = options.totalDays;
  const completedCount = state.completedDays.length;

  return {
    completedCount,
    completionPercent: Math.round((completedCount / totalDays) * 100),
    streak: computeStreak(state.completedDayTimestamps),
    nextDay: findNextDay(state.completedDays, totalDays),
    phaseProgress: computePhaseProgress(
      state.completedDays,
      options.phases ?? [],
    ),
  };
}

export function computeStreak(
  completedDayTimestamps: Readonly<Record<number, string>>,
): number {
  const completionDates = new Set(
    Object.values(completedDayTimestamps)
      .map(toDateKey)
      .filter((dateKey): dateKey is string => dateKey !== undefined),
  );

  if (completionDates.size === 0) {
    return 0;
  }

  let cursor = [...completionDates].sort().at(-1);
  let streak = 0;

  while (cursor !== undefined && completionDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function computePhaseProgress(
  completedDays: readonly number[],
  phases: readonly PhaseDay[],
): readonly PhaseProgress[] {
  const completed = new Set(completedDays);
  const phaseOrder: ContentPhase[] = [];
  const totals = new Map<ContentPhase, number>();
  const phaseCompletions = new Map<ContentPhase, number>();

  for (const phaseDay of phases) {
    if (!totals.has(phaseDay.phase)) {
      phaseOrder.push(phaseDay.phase);
    }

    totals.set(phaseDay.phase, (totals.get(phaseDay.phase) ?? 0) + 1);

    if (completed.has(phaseDay.day)) {
      phaseCompletions.set(
        phaseDay.phase,
        (phaseCompletions.get(phaseDay.phase) ?? 0) + 1,
      );
    }
  }

  return phaseOrder.map((phase) => {
    const total = totals.get(phase) ?? 0;
    const completedForPhase = phaseCompletions.get(phase) ?? 0;

    return {
      phase,
      completed: completedForPhase,
      total,
      percent: total === 0 ? 0 : Math.round((completedForPhase / total) * 100),
    };
  });
}

function findNextDay(
  completedDays: readonly number[],
  totalDays: number,
): number {
  const completed = new Set(completedDays);

  for (let day = 1; day <= totalDays; day += 1) {
    if (!completed.has(day)) {
      return day;
    }
  }

  return totalDays;
}

function toDateKey(value: string): string | undefined {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
