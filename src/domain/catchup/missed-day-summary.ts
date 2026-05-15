import type { CompiledDayPayload } from '../content/content-types';

export interface MissedDaySummaryOptions {
  readonly maxItems?: number;
  readonly maxCharacters?: number;
}

export interface MissedDaySummary {
  readonly dayRangeLabel: string;
  readonly items: readonly string[];
  readonly text: string;
}

const defaultMaxItems = 5;
const defaultMaxCharacters = 420;

export function generateMissedDaySummary(
  payloads: readonly CompiledDayPayload[],
  options: MissedDaySummaryOptions = {},
): MissedDaySummary {
  const maxItems = options.maxItems ?? defaultMaxItems;
  const maxCharacters = options.maxCharacters ?? defaultMaxCharacters;
  const sortedPayloads = [...payloads].sort((left, right) => left.content.day - right.content.day);
  const items = sortedPayloads
    .flatMap((payload) => payload.summaryKeys.map((key) => toSummaryItem(payload.content.day, key)))
    .slice(0, maxItems);
  const text = capText(
    items.length === 0
      ? 'These days can be resumed with a quiet reading of the next available section.'
      : `A simple way back in: ${items.join(' ')}`,
    maxCharacters,
  );

  return {
    dayRangeLabel: toDayRangeLabel(sortedPayloads.map((payload) => payload.content.day)),
    items,
    text,
  };
}

function toSummaryItem(day: number, key: string): string {
  const sentence = key
    .split('-')
    .filter(Boolean)
    .join(' ');

  return `Day ${String(day)}: ${sentence}.`;
}

function toDayRangeLabel(days: readonly number[]): string {
  if (days.length === 0) {
    return 'No days selected';
  }

  const first = days[0] ?? 0;
  const last = days.at(-1) ?? first;

  return first === last ? `Day ${String(first)}` : `Days ${String(first)}-${String(last)}`;
}

function capText(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) {
    return text;
  }

  const trimmed = text.slice(0, Math.max(0, maxCharacters - 1)).trimEnd();

  return `${trimmed}.`;
}
