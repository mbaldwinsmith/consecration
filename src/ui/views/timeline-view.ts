import type { TimelineEntry } from '../../types';

export interface TimelineViewOptions {
  readonly entries: readonly TimelineEntry[];
  readonly hideStreakMetrics: boolean;
  readonly onToggleHideStreakMetrics?: (enabled: boolean) => void;
}

export function createTimelineView(options: TimelineViewOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'timeline-view';
  container.dataset.testid = 'timeline-view';

  const filters = document.createElement('fieldset');
  filters.className = 'timeline-filters';

  const legend = document.createElement('legend');
  legend.textContent = 'Timeline filters';

  const hideStreakLabel = document.createElement('label');
  const hideStreak = document.createElement('input');
  hideStreak.type = 'checkbox';
  hideStreak.checked = options.hideStreakMetrics;
  hideStreak.addEventListener('change', () => {
    options.onToggleHideStreakMetrics?.(hideStreak.checked);
  });
  hideStreakLabel.append(
    hideStreak,
    document.createTextNode('Hide streak metrics'),
  );
  filters.append(legend, hideStreakLabel);

  const list = document.createElement('ol');
  list.className = 'timeline-list';

  const visibleEntries = options.hideStreakMetrics
    ? options.entries.filter((entry) => entry.type !== 'phase-milestone')
    : options.entries;

  for (const entry of visibleEntries) {
    list.append(createTimelineItem(entry));
  }

  if (visibleEntries.length === 0) {
    const empty = document.createElement('p');
    empty.textContent =
      'Your journey history will appear here as days are completed and reflections are saved.';
    container.append(filters, empty);
    return container;
  }

  container.append(filters, list);

  return container;
}

function createTimelineItem(entry: TimelineEntry): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'timeline-item';

  const title = document.createElement('h3');
  title.textContent = entry.title;

  const meta = document.createElement('p');
  meta.textContent = `Day ${String(entry.day)} - ${formatDate(entry.occurredAt)}`;

  item.append(title, meta);

  if (entry.description !== undefined) {
    const description = document.createElement('p');
    description.textContent = entry.description;
    item.append(description);
  }

  return item;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
