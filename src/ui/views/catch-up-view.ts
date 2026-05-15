import { persistCatchUpSelection } from '../../domain/catchup/catchup-selection-store';
import type { CatchUpPath } from '../../domain/catchup/catchup-decision';
import { navigateTo } from '../../app/router';

export function createCatchUpView(targetDay = 1): HTMLElement {
  const container = document.createElement('div');
  container.className = 'catch-up-options';
  container.dataset.testid = 'catch-up-options';

  container.append(
    createOption({
      path: 'one-session',
      title: 'Catch up in one session',
      body: 'Read the next sections together at a steady pace.',
      route: `/day/${String(targetDay)}`,
    }),
    createOption({
      path: 'summarize-missed-days',
      title: 'Summarize recent days',
      body: 'Review the main points, then continue with the next day.',
      route: `/day/${String(targetDay)}`,
    }),
    createOption({
      path: 'temporary-lite',
      title: 'Use Lite for now',
      body: 'Keep the essential prayers and readings for a shorter session.',
      route: `/day/${String(targetDay)}`,
    }),
  );

  return container;
}

interface CatchUpOption {
  readonly path: CatchUpPath;
  readonly title: string;
  readonly body: string;
  readonly route: string;
}

function createOption(option: CatchUpOption): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'catch-up-option';

  const title = document.createElement('strong');
  title.textContent = option.title;

  const body = document.createElement('span');
  body.textContent = option.body;

  button.append(title, body);
  button.addEventListener('click', () => {
    persistCatchUpSelection(option.path);
    navigateTo(option.route);
  });

  return button;
}
