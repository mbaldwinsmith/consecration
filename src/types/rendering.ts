export type CompletionCriteria = 'strict' | 'essential-only' | 'custom';

export interface RenderDayPlan {
  readonly sections: readonly RenderSectionPlan[];
  readonly estimatedMinutes: number;
  readonly canAutoSummarizeMissedDays: boolean;
  readonly completionCriteria: CompletionCriteria;
}

export interface RenderSectionPlan {
  readonly id: string;
  readonly required: boolean;
  readonly collapsedByDefault: boolean;
}
