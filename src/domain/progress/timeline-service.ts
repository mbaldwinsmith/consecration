import type {
  ContentPhase,
  ReflectionEntry,
  TimelineEntry,
  UserJourneyState,
} from '../../types';

export interface TimelinePhaseDay {
  readonly day: number;
  readonly phase: ContentPhase;
  readonly title: string;
}

export function buildTimelineEntries(
  state: UserJourneyState,
  reflections: readonly ReflectionEntry[] = [],
  phaseDays: readonly TimelinePhaseDay[] = [],
): readonly TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...buildCompletionEntries(state),
    ...buildReflectionEntries(reflections),
    ...buildPhaseMilestoneEntries(state, phaseDays),
  ];

  return entries.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
}

function buildCompletionEntries(
  state: UserJourneyState,
): readonly TimelineEntry[] {
  return state.completedDays.flatMap((day) => {
    const occurredAt = state.completedDayTimestamps[day];

    if (occurredAt === undefined) {
      return [];
    }

    return [
      {
        id: `completion:${state.consecrationId}:${String(day)}`,
        type: 'completion',
        consecrationId: state.consecrationId,
        day,
        occurredAt,
        title: `Completed day ${String(day)}`,
      } satisfies TimelineEntry,
    ];
  });
}

function buildReflectionEntries(
  reflections: readonly ReflectionEntry[],
): readonly TimelineEntry[] {
  return reflections.map((reflection) => ({
    id: `reflection:${reflection.id}`,
    type: 'reflection',
    consecrationId: reflection.consecrationId,
    day: reflection.day,
    occurredAt: reflection.updatedAt,
    title: `Reflection for day ${String(reflection.day)}`,
    description: reflection.text,
  }));
}

function buildPhaseMilestoneEntries(
  state: UserJourneyState,
  phaseDays: readonly TimelinePhaseDay[],
): readonly TimelineEntry[] {
  const completed = new Set(state.completedDays);
  const phaseEnds = new Map<ContentPhase, TimelinePhaseDay>();

  for (const phaseDay of phaseDays) {
    phaseEnds.set(phaseDay.phase, phaseDay);
  }

  return [...phaseEnds.values()].flatMap((phaseDay) => {
    if (!completed.has(phaseDay.day)) {
      return [];
    }

    const occurredAt = state.completedDayTimestamps[phaseDay.day];

    if (occurredAt === undefined) {
      return [];
    }

    return [
      {
        id: `phase:${state.consecrationId}:${phaseDay.phase}`,
        type: 'phase-milestone',
        consecrationId: state.consecrationId,
        day: phaseDay.day,
        occurredAt,
        title: phaseDay.title,
      } satisfies TimelineEntry,
    ];
  });
}
