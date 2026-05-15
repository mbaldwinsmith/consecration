import type {
  AudioRef,
  ContentPhase,
  DayContent,
  SectionType,
} from '../../types';

export type {
  AudioRef,
  ContentPhase,
  DayContent,
  Section,
  SectionType,
} from '../../types';

export interface ContentMetadata {
  readonly title: string;
  readonly phase: ContentPhase;
  readonly author: string;
  readonly duration: number;
  readonly audio?: AudioRef;
  readonly sectionType: SectionType;
  readonly required: boolean;
  readonly tags: readonly string[];
  readonly summaryKeys: readonly string[];
}

export interface ContentIndexEntry {
  readonly consecrationId: string;
  readonly day: number;
  readonly title: string;
  readonly phase: ContentPhase;
  readonly durationMinutes: number;
  readonly path: string;
  readonly tags: readonly string[];
  readonly summaryKeys: readonly string[];
}

export interface ContentIndex {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly consecrations: readonly CompiledConsecration[];
  readonly days: readonly ContentIndexEntry[];
}

export interface CompiledConsecration {
  readonly id: string;
  readonly title: string;
  readonly totalDays: number;
}

export interface CompiledDayPayload {
  readonly content: DayContent;
  readonly summaryKeys: readonly string[];
  readonly recurringContentIds: readonly string[];
}
