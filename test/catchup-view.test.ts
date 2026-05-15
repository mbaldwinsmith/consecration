import { describe, expect, it } from 'vitest';
import { createCatchUpView } from '../src/ui/views/catch-up-view';
import { loadCatchUpSelection } from '../src/domain/catchup/catchup-selection-store';

describe('catch-up view', () => {
  it('renders option buttons and persists the selected path', () => {
    window.history.replaceState({}, '', '/catch-up');
    const view = createCatchUpView(3);
    const summarize = [...view.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Summarize recent days'),
    );

    expect(view.dataset.testid).toBe('catch-up-options');
    expect(view.textContent).toContain('Catch up in one session');
    expect(view.textContent).toContain('Use Lite for now');

    summarize?.click();

    expect(loadCatchUpSelection()?.path).toBe('summarize-missed-days');
    expect(window.location.pathname).toBe('/day/3');
  });
});
