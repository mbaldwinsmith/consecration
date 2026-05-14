export type ContentPhase = 'preparation' | 'knowledge-of-self' | 'knowledge-of-mary' | 'knowledge-of-jesus' | 'consecration';

export type SectionType = 'reading' | 'prayer' | 'hymn' | 'litany' | 'reflection' | 'summary';

export interface AudioRef {
  readonly src: string;
  readonly durationSeconds?: number;
  readonly narrator?: string;
}

export interface Section {
  readonly id: string;
  readonly type: SectionType;
  readonly title: string;
  readonly html: string;
  readonly required: boolean;
  readonly tags: readonly string[];
  readonly audio?: AudioRef;
}

export interface DayContent {
  readonly consecrationId: string;
  readonly day: number;
  readonly title: string;
  readonly phase: ContentPhase;
  readonly author?: string;
  readonly durationMinutes: number;
  readonly sections: readonly Section[];
}
