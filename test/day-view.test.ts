import { describe, expect, it, vi } from 'vitest';
import { resolveDayPlan } from '../src/domain/modes/mode-policy';
import { getBundledDayContent } from '../src/domain/content/bundled-days';
import { createDayView } from '../src/ui/views/day-view';
import { attachSwipeNavigation } from '../src/ui/gestures/swipe-navigation';
import { createLongPressCompleteButton } from '../src/ui/components/long-press-complete';

describe('day view', () => {
  it('renders day metadata and accessible collapsible sections', () => {
    const dayContent = getBundledDayContent('montfort', 1);
    const plan = resolveDayPlan({ mode: 'guided', dayContent, missedDays: 0 });
    const view = createDayView({
      dayContent,
      renderPlan: plan,
      totalDays: 33,
    });
    const firstToggle =
      view.querySelector<HTMLButtonElement>('.section-toggle');
    const firstBody = view.querySelector<HTMLElement>('.section-body');

    expect(view.dataset.testid).toBe('day-view');
    expect(view.textContent).toContain('Preparation');
    expect(view.textContent).toContain('guided mode');
    expect(firstToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(firstBody?.hidden).toBe(false);

    firstToggle?.click();

    expect(firstToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(firstBody?.hidden).toBe(true);
  });

  it('supports keyboard completion and undo', () => {
    const onComplete = vi.fn();
    const onUndo = vi.fn();
    const control = createLongPressCompleteButton({
      onComplete,
      onUndo,
    });
    const complete = control.querySelector<HTMLButtonElement>(
      '.long-press-complete',
    );
    const undo = [...control.querySelectorAll('button')].find(
      (button) => button.textContent === 'Undo',
    );

    complete?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    undo?.click();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('saves optional reflection text without completing the day', () => {
    const onSaveReflection = vi.fn();
    const onComplete = vi.fn();
    const dayContent = getBundledDayContent('montfort', 1);
    const plan = resolveDayPlan({ mode: 'guided', dayContent, missedDays: 0 });
    const view = createDayView({
      dayContent,
      renderPlan: plan,
      totalDays: 33,
      initialReflection: 'Earlier note',
      onSaveReflection,
      onComplete,
    });
    const textarea = view.querySelector<HTMLTextAreaElement>('#day-reflection');
    const save = [...view.querySelectorAll('button')].find(
      (button) => button.textContent === 'Save reflection',
    );

    expect(textarea?.value).toBe('Earlier note');
    if (textarea !== null) {
      textarea.value = 'A new note';
    }
    save?.click();

    expect(onSaveReflection).toHaveBeenCalledWith('A new note');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not complete on a short pointer tap', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const control = createLongPressCompleteButton({
      holdMs: 500,
      onComplete,
    });
    const complete = control.querySelector<HTMLButtonElement>(
      '.long-press-complete',
    );

    complete?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(200);
    complete?.dispatchEvent(new Event('pointerup', { bubbles: true }));
    vi.advanceTimersByTime(500);

    expect(onComplete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('navigates by touch swipe', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const element = document.createElement('div');
    attachSwipeNavigation(element, { onPrevious, onNext, thresholdPixels: 40 });

    element.dispatchEvent(createPointerEvent('pointerdown', 120));
    element.dispatchEvent(createPointerEvent('pointerup', 20));
    element.dispatchEvent(createPointerEvent('pointerdown', 20));
    element.dispatchEvent(createPointerEvent('pointerup', 120));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

function createPointerEvent(type: string, clientX: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    pointerType: { value: 'touch' },
  });

  return event;
}
