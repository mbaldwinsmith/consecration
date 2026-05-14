export function createAppShell(schemaVersion: number): HTMLElement {
  const shell = document.createElement('section');
  shell.className = 'app-shell';
  shell.dataset.testid = 'app-shell';

  const heading = document.createElement('h1');
  heading.textContent = 'Consecration';

  const status = document.createElement('p');
  status.textContent = `App shell ready. Schema v${String(schemaVersion)}.`;

  shell.append(heading, status);

  return shell;
}
