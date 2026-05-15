import type { JourneyMode } from './journey';

export type CompletionCriteria = 'strict' | 'essential-only' | 'custom';

export interface RenderDayPlan {
  readonly mode: JourneyMode;
  readonly sections: readonly RenderSectionPlan[];
  readonly estimatedMinutes: number;
  readonly canAutoSummarizeMissedDays: boolean;
  readonly completionCriteria: CompletionCriteria;
  readonly pacing: RenderPacing;
  readonly reminders: readonly RenderReminderHook[];
}

export interface RenderSectionPlan {
  readonly id: string;
  readonly required: boolean;
  readonly collapsedByDefault: boolean;
  readonly included: boolean;
  readonly reason: SectionInclusionReason;
}

export type SectionInclusionReason = 'guided' | 'essential' | 'custom-included' | 'custom-excluded' | 'optional-omitted';

export interface RenderPacing {
  readonly targetMinutes: number;
  readonly isShortened: boolean;
  readonly missedDays: number;
}

export interface RenderReminderHook {
  readonly id: string;
  readonly tone: 'gentle';
  readonly message: string;
}
