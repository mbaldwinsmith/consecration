import type { DayContent, JourneyMode, RenderDayPlan, RenderReminderHook, RenderSectionPlan, Section } from '../../types';

export interface ResolveDayPlanOptions {
  readonly mode: JourneyMode;
  readonly dayContent: DayContent;
  readonly missedDays: number;
  readonly customRules?: CustomModeRules;
}

export interface CustomModeRules {
  readonly includeSectionIds?: readonly string[];
  readonly excludeSectionIds?: readonly string[];
  readonly maxEstimatedMinutes?: number;
  readonly completionRequiresAllIncluded?: boolean;
}

export function resolveDayPlan(options: ResolveDayPlanOptions): RenderDayPlan {
  switch (options.mode) {
    case 'guided':
      return resolveGuidedPlan(options.dayContent, options.missedDays);
    case 'lite':
      return resolveLitePlan(options.dayContent, options.missedDays);
    case 'custom':
      return resolveCustomPlan(options.dayContent, options.missedDays, options.customRules ?? {});
  }
}

export function validateCustomRules(dayContent: DayContent, rules: CustomModeRules): readonly string[] {
  const errors: string[] = [];
  const sectionIds = new Set(dayContent.sections.map((section) => section.id));

  for (const sectionId of rules.includeSectionIds ?? []) {
    if (!sectionIds.has(sectionId)) {
      errors.push(`Custom mode includes unknown section "${sectionId}".`);
    }
  }

  for (const sectionId of rules.excludeSectionIds ?? []) {
    if (!sectionIds.has(sectionId)) {
      errors.push(`Custom mode excludes unknown section "${sectionId}".`);
    }
  }

  const includedIds = resolveCustomIncludedIds(dayContent, rules);
  const includedRequiredSections = dayContent.sections.filter((section) => section.required && includedIds.has(section.id));

  if (includedIds.size === 0) {
    errors.push('Custom mode must include at least one section.');
  }

  if (rules.completionRequiresAllIncluded === true && includedRequiredSections.length === 0) {
    errors.push('Custom mode cannot require completion when every required section is excluded.');
  }

  if (rules.maxEstimatedMinutes !== undefined && rules.maxEstimatedMinutes < 1) {
    errors.push('Custom mode maxEstimatedMinutes must be at least 1.');
  }

  return errors;
}

function resolveGuidedPlan(dayContent: DayContent, missedDays: number): RenderDayPlan {
  const sections = dayContent.sections.map(
    (section): RenderSectionPlan => ({
      id: section.id,
      required: section.required,
      collapsedByDefault: false,
      included: true,
      reason: 'guided',
    }),
  );

  return {
    mode: 'guided',
    sections,
    estimatedMinutes: estimateSections(dayContent.sections),
    canAutoSummarizeMissedDays: missedDays > 0,
    completionCriteria: 'strict',
    pacing: {
      targetMinutes: dayContent.durationMinutes,
      isShortened: false,
      missedDays,
    },
    reminders: createReminderHooks(missedDays),
  };
}

function resolveLitePlan(dayContent: DayContent, missedDays: number): RenderDayPlan {
  const essentialIds = new Set(dayContent.sections.filter(isEssentialSection).map((section) => section.id));
  const includedSections = dayContent.sections.filter((section) => essentialIds.has(section.id));
  const sections = dayContent.sections.map(
    (section): RenderSectionPlan => ({
      id: section.id,
      required: section.required,
      collapsedByDefault: section.type === 'reading' && !section.required,
      included: essentialIds.has(section.id),
      reason: essentialIds.has(section.id) ? 'essential' : 'optional-omitted',
    }),
  );

  return {
    mode: 'lite',
    sections,
    estimatedMinutes: Math.max(1, Math.ceil(estimateSections(includedSections) * 0.75)),
    canAutoSummarizeMissedDays: missedDays > 0 || includedSections.length < dayContent.sections.length,
    completionCriteria: 'essential-only',
    pacing: {
      targetMinutes: Math.max(1, Math.ceil(dayContent.durationMinutes * 0.6)),
      isShortened: true,
      missedDays,
    },
    reminders: createReminderHooks(missedDays),
  };
}

function resolveCustomPlan(dayContent: DayContent, missedDays: number, rules: CustomModeRules): RenderDayPlan {
  const errors = validateCustomRules(dayContent, rules);

  if (errors.length > 0) {
    throw new Error(['Invalid custom mode rules:', ...errors.map((error) => `- ${error}`)].join('\n'));
  }

  const includedIds = resolveCustomIncludedIds(dayContent, rules);
  const includedSections = dayContent.sections.filter((section) => includedIds.has(section.id));
  const maxEstimatedMinutes = rules.maxEstimatedMinutes;
  const estimatedMinutes = estimateSections(includedSections);

  if (maxEstimatedMinutes !== undefined && estimatedMinutes > maxEstimatedMinutes) {
    throw new Error(
      `Invalid custom mode rules:\n- Included sections estimate ${String(estimatedMinutes)} minutes, above the ${String(
        maxEstimatedMinutes,
      )} minute limit.`,
    );
  }

  return {
    mode: 'custom',
    sections: dayContent.sections.map((section) => {
      const included = includedIds.has(section.id);

      return {
        id: section.id,
        required: section.required,
        collapsedByDefault: !included || !section.required,
        included,
        reason: included ? 'custom-included' : 'custom-excluded',
      };
    }),
    estimatedMinutes,
    canAutoSummarizeMissedDays: missedDays > 0 || includedSections.length < dayContent.sections.length,
    completionCriteria: rules.completionRequiresAllIncluded === true ? 'strict' : 'custom',
    pacing: {
      targetMinutes: maxEstimatedMinutes ?? estimatedMinutes,
      isShortened: includedSections.length < dayContent.sections.length,
      missedDays,
    },
    reminders: createReminderHooks(missedDays),
  };
}

function resolveCustomIncludedIds(dayContent: DayContent, rules: CustomModeRules): ReadonlySet<string> {
  const excludeIds = new Set(rules.excludeSectionIds ?? []);
  const explicitIncludeIds = new Set(rules.includeSectionIds ?? []);
  const includedIds = new Set<string>();

  for (const section of dayContent.sections) {
    if (excludeIds.has(section.id)) {
      continue;
    }

    if (section.required || explicitIncludeIds.has(section.id)) {
      includedIds.add(section.id);
    }
  }

  return includedIds;
}

function isEssentialSection(section: Section): boolean {
  return section.required || section.tags.includes('essential') || section.tags.includes('lite');
}

function estimateSections(sections: readonly Section[]): number {
  return sections.reduce((total, section) => total + estimateSection(section), 0);
}

function estimateSection(section: Section): number {
  const text = section.html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 180));
}

function createReminderHooks(missedDays: number): readonly RenderReminderHook[] {
  if (missedDays <= 0) {
    return [];
  }

  return [
    {
      id: 'return-gently',
      tone: 'gentle',
      message: 'Begin again with the section that is most helpful today.',
    },
  ];
}
