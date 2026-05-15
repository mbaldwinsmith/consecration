import type {
  DayContent,
  RenderDayPlan,
  RenderSectionPlan,
  Section,
} from '../../types';
import { attachSwipeNavigation } from '../gestures/swipe-navigation';
import { createLongPressCompleteButton } from '../components/long-press-complete';

export interface DayViewOptions {
  readonly dayContent: DayContent;
  readonly renderPlan: RenderDayPlan;
  readonly totalDays: number;
  readonly onNavigatePrevious?: () => void;
  readonly onNavigateNext?: () => void;
  readonly onComplete?: () => void;
  readonly onUndoComplete?: () => void;
  readonly initialReflection?: string;
  readonly onSaveReflection?: (text: string) => void;
}

export function createDayView(options: DayViewOptions): HTMLElement {
  const article = document.createElement('article');
  article.className = 'day-view';
  article.dataset.testid = 'day-view';
  article.tabIndex = -1;

  const skipLink = document.createElement('a');
  skipLink.className = 'skip-link';
  skipLink.href = '#day-sections';
  skipLink.textContent = 'Skip to sections';

  const header = document.createElement('header');
  header.className = 'day-view-header';

  const eyebrow = document.createElement('p');
  eyebrow.textContent = `${toPhaseLabel(options.dayContent.phase)} - ${String(options.renderPlan.estimatedMinutes)} min`;

  const heading = document.createElement('h2');
  heading.textContent = options.dayContent.title;

  const meta = document.createElement('p');
  meta.textContent = `${options.renderPlan.mode} mode - ${options.renderPlan.completionCriteria} completion`;

  header.append(eyebrow, heading, meta);

  const sections = document.createElement('div');
  sections.id = 'day-sections';
  sections.className = 'day-sections';
  sections.append(
    ...createSectionElements(options.dayContent, options.renderPlan),
  );

  const reflectionPrompt = createReflectionPrompt(
    options.initialReflection ?? '',
    options.onSaveReflection ?? noopText,
  );

  const completion = createLongPressCompleteButton({
    onComplete: options.onComplete ?? noop,
    onUndo: options.onUndoComplete,
  });

  article.append(skipLink, header, sections, reflectionPrompt, completion);
  attachSwipeNavigation(article, {
    onPrevious: options.onNavigatePrevious ?? noop,
    onNext: options.onNavigateNext ?? noop,
  });

  return article;
}

function createReflectionPrompt(
  initialReflection: string,
  onSaveReflection: (text: string) => void,
): HTMLElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'reflection-prompt';

  const legend = document.createElement('legend');
  legend.textContent = 'Optional reflection';

  const label = document.createElement('label');
  label.htmlFor = 'day-reflection';
  label.textContent = 'A short note from today';

  const textarea = document.createElement('textarea');
  textarea.id = 'day-reflection';
  textarea.rows = 4;
  textarea.value = initialReflection;

  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = 'Save reflection';
  save.addEventListener('click', () => {
    onSaveReflection(textarea.value);
  });

  fieldset.append(legend, label, textarea, save);

  return fieldset;
}

function createSectionElements(
  dayContent: DayContent,
  renderPlan: RenderDayPlan,
): readonly HTMLElement[] {
  const planById = new Map(
    renderPlan.sections.map((sectionPlan) => [sectionPlan.id, sectionPlan]),
  );

  return dayContent.sections.flatMap((section) => {
    const sectionPlan = planById.get(section.id);

    if (sectionPlan?.included === false) {
      return [];
    }

    return [createSectionElement(section, sectionPlan)];
  });
}

function createSectionElement(
  section: Section,
  sectionPlan: RenderSectionPlan | undefined,
): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'day-section reveal-on-scroll';

  const headingId = `${section.id}-heading`;
  const bodyId = `${section.id}-body`;

  const heading = document.createElement('h3');
  heading.id = headingId;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'section-toggle';
  toggle.setAttribute('aria-controls', bodyId);
  toggle.setAttribute(
    'aria-expanded',
    String(sectionPlan?.collapsedByDefault !== true),
  );
  toggle.textContent = section.title;
  heading.append(toggle);

  const body = document.createElement('div');
  body.id = bodyId;
  body.className = 'section-body';
  body.setAttribute('role', 'region');
  body.setAttribute('aria-labelledby', headingId);
  body.hidden = sectionPlan?.collapsedByDefault === true;
  body.innerHTML = section.html;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    body.hidden = expanded;
  });

  wrapper.append(heading, body);

  return wrapper;
}

function toPhaseLabel(phase: string): string {
  return phase
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function noop(): void {
  return undefined;
}

function noopText(): void {
  return undefined;
}
