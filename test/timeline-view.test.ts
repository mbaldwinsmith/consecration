import { describe, expect, it, vi } from 'vitest';
import { createTimelineView } from '../src/ui/views/timeline-view';
import type { TimelineEntry } from '../src/types';

describe('timeline view', () => {
  const entries: readonly TimelineEntry[] = [
    {
      id: 'completion:montfort:1',
      type: 'completion',
      consecrationId: 'montfort',
      day: 1,
      occurredAt: '2026-05-15T08:00:00.000Z',
      title: 'Completed day 1',
    },
    {
      id: 'phase:montfort:preparation',
      type: 'phase-milestone',
      consecrationId: 'montfort',
      day: 7,
      occurredAt: '2026-05-21T08:00:00.000Z',
      title: 'Preparation week completed',
    },
  ];

  it('renders journey entries and hides milestone metrics when toggled', () => {
    const onToggle = vi.fn();
    const visible = createTimelineView({
      entries,
      hideStreakMetrics: false,
      onToggleHideStreakMetrics: onToggle,
    });
    const hidden = createTimelineView({ entries, hideStreakMetrics: true });
    const toggle = visible.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );

    if (toggle !== null) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    }

    expect(visible.textContent).toContain('Completed day 1');
    expect(visible.textContent).toContain('Preparation week completed');
    expect(hidden.textContent).not.toContain('Preparation week completed');
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
