import type { UserJourneyState } from '../../types';

export type CatchUpDecisionKind = 'show-current-day' | 'normal-resume' | 'offer-options' | 'suggest-lite';
export type CatchUpPath = 'one-session' | 'summarize-missed-days' | 'temporary-lite';

export interface CatchUpDecision {
  readonly kind: CatchUpDecisionKind;
  readonly missedDays: number;
  readonly expectedDay: number;
  readonly currentDay: number;
  readonly suggestedPaths: readonly CatchUpPath[];
  readonly route: `/day/${number}` | '/catch-up';
}

export interface MissedDayInput {
  readonly startDate: string;
  readonly currentDay: number;
  readonly totalDays: number;
  readonly today: string;
}

export function calculateMissedDays(input: MissedDayInput): number {
  const expectedDay = calculateExpectedDay(input.startDate, input.today, input.totalDays);

  return Math.max(0, expectedDay - input.currentDay);
}

export function resolveCatchUpDecision(
  state: Pick<UserJourneyState, 'startDate' | 'currentDay'>,
  totalDays: number,
  today: Date = new Date(),
): CatchUpDecision {
  const todayKey = toDateKey(today);
  const expectedDay = calculateExpectedDay(state.startDate, todayKey, totalDays);
  const missedDays = Math.max(0, expectedDay - state.currentDay);

  if (missedDays === 0) {
    return toDecision('show-current-day', missedDays, expectedDay, state.currentDay, []);
  }

  if (missedDays === 1) {
    return toDecision('normal-resume', missedDays, expectedDay, state.currentDay, ['one-session']);
  }

  if (missedDays <= 3) {
    return toDecision('offer-options', missedDays, expectedDay, state.currentDay, [
      'one-session',
      'summarize-missed-days',
      'temporary-lite',
    ]);
  }

  return toDecision('suggest-lite', missedDays, expectedDay, state.currentDay, [
    'temporary-lite',
    'summarize-missed-days',
    'one-session',
  ]);
}

function calculateExpectedDay(startDate: string, today: string, totalDays: number): number {
  const start = parseDateKey(startDate);
  const current = parseDateKey(today);
  const elapsedDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);

  return Math.min(totalDays, Math.max(1, elapsedDays + 1));
}

function toDecision(
  kind: CatchUpDecisionKind,
  missedDays: number,
  expectedDay: number,
  currentDay: number,
  suggestedPaths: readonly CatchUpPath[],
): CatchUpDecision {
  return {
    kind,
    missedDays,
    expectedDay,
    currentDay,
    suggestedPaths,
    route: suggestedPaths.length >= 2 ? '/catch-up' : (`/day/${String(currentDay)}` as `/day/${number}`),
  };
}

function parseDateKey(value: string): Date {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${value}".`);
  }

  return date;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
