import type { AppManifestPointer } from './manifest';
import { findConsecration } from './manifest';
import type { AppRoute } from './router';
import { navigateTo } from './router';
import type { BootSettings } from './settings';
import {
  applyAccessibilityPreferences,
  applyThemePreference,
  persistLargeText,
  persistReduceMotion,
  persistTheme,
} from './settings';
import type { ThemePreference } from '../types';

export interface AppShellOptions {
  readonly manifest: AppManifestPointer;
  readonly route: AppRoute;
  readonly schemaVersion: number;
  readonly settings: BootSettings;
}

export function createAppShell(options: AppShellOptions): HTMLElement {
  const activeConsecration = findConsecration(options.manifest, options.settings.consecrationId);
  const shell = document.createElement('section');
  shell.className = 'app-shell';
  shell.dataset.testid = 'app-shell';

  const header = createHeader(options.manifest.appName, activeConsecration.title, options.route);
  const dayPager = createDayPager(options.route, activeConsecration.totalDays);
  const view = createView(options.route, activeConsecration.title, options.schemaVersion, options.settings);
  const actions = createBottomActions(options.route);

  shell.append(header, dayPager, view, actions);

  return shell;
}

function createHeader(appName: string, consecrationTitle: string, route: AppRoute): HTMLElement {
  const header = document.createElement('header');
  header.className = 'app-header';

  const titleWrap = document.createElement('div');

  const heading = document.createElement('h1');
  heading.textContent = appName;

  const subtitle = document.createElement('p');
  subtitle.textContent = consecrationTitle;

  titleWrap.append(heading, subtitle);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Primary');
  nav.append(
    createNavButton('Today', '/today', route),
    createNavButton('Timeline', '/timeline', route),
    createNavButton('Settings', '/settings', route),
  );

  header.append(titleWrap, nav);

  return header;
}

function createDayPager(route: AppRoute, totalDays: number): HTMLElement {
  const pager = document.createElement('div');
  pager.className = 'day-pager';
  pager.dataset.testid = 'day-pager';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'icon-button';
  previous.ariaLabel = 'Previous day';
  previous.textContent = '<';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'icon-button';
  next.ariaLabel = 'Next day';
  next.textContent = '>';

  const currentDay = route.name === 'day' ? route.day : 1;
  previous.disabled = currentDay <= 1;
  next.disabled = currentDay >= totalDays;
  previous.addEventListener('click', () => {
    navigateTo(`/day/${String(currentDay - 1)}`);
  });
  next.addEventListener('click', () => {
    navigateTo(`/day/${String(currentDay + 1)}`);
  });

  const label = document.createElement('p');
  label.textContent = route.name === 'day' ? `Day ${String(route.day)} of ${String(totalDays)}` : 'Today';

  pager.append(previous, label, next);

  return pager;
}

function createView(
  route: AppRoute,
  consecrationTitle: string,
  schemaVersion: number,
  settings: BootSettings,
): HTMLElement {
  const view = document.createElement('article');
  view.className = 'route-view';
  view.dataset.route = route.name;

  const heading = document.createElement('h2');
  heading.textContent = getRouteTitle(route);

  const status = document.createElement('p');
  status.textContent = getRouteSummary(route, consecrationTitle, schemaVersion);

  view.append(heading, status);

  if (route.name === 'settings') {
    view.append(createSettingsControls(settings));
  }

  return view;
}

function createSettingsControls(settings: BootSettings): HTMLElement {
  const form = document.createElement('form');
  form.className = 'settings-panel';

  const themeGroup = document.createElement('fieldset');
  const themeLegend = document.createElement('legend');
  themeLegend.textContent = 'Theme';
  themeGroup.append(themeLegend);

  const themeOptions: readonly ThemePreference[] = ['system', 'light', 'dark'];
  for (const theme of themeOptions) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = theme;
    input.checked = settings.theme === theme;
    input.addEventListener('change', () => {
      persistTheme(theme);
      applyThemePreference(theme);
    });
    label.append(input, document.createTextNode(theme));
    themeGroup.append(label);
  }

  const reduceMotion = createPreferenceCheckbox('Reduce motion', settings.reduceMotion, (enabled) => {
    persistReduceMotion(enabled);
    applyAccessibilityPreferences({ reduceMotion: enabled, largeText: settings.largeText });
  });

  const largeText = createPreferenceCheckbox('Large text', settings.largeText, (enabled) => {
    persistLargeText(enabled);
    applyAccessibilityPreferences({ reduceMotion: settings.reduceMotion, largeText: enabled });
  });

  form.append(themeGroup, reduceMotion, largeText);

  return form;
}

function createPreferenceCheckbox(
  labelText: string,
  checked: boolean,
  onChange: (enabled: boolean) => void,
): HTMLLabelElement {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  label.append(input, document.createTextNode(labelText));

  return label;
}

function createBottomActions(route: AppRoute): HTMLElement {
  const actions = document.createElement('footer');
  actions.className = 'bottom-actions';

  const catchUp = document.createElement('button');
  catchUp.type = 'button';
  catchUp.textContent = 'Catch up';
  catchUp.addEventListener('click', () => {
    navigateTo('/catch-up');
  });

  const complete = document.createElement('button');
  complete.type = 'button';
  complete.className = 'primary-action';
  complete.textContent = route.name === 'day' || route.name === 'today' ? 'Mark complete' : 'Return to today';
  complete.addEventListener('click', () => {
    navigateTo('/today');
  });

  actions.append(catchUp, complete);

  return actions;
}

function createNavButton(label: string, path: AppRoute['path'], route: AppRoute): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.ariaCurrent = route.path === path ? 'page' : null;
  button.addEventListener('click', () => {
    navigateTo(path);
  });

  return button;
}

function getRouteTitle(route: AppRoute): string {
  switch (route.name) {
    case 'today':
      return 'Today';
    case 'day':
      return `Day ${String(route.day)}`;
    case 'timeline':
      return 'Timeline';
    case 'settings':
      return 'Settings';
    case 'catch-up':
      return 'Catch up';
  }
}

function getRouteSummary(route: AppRoute, consecrationTitle: string, schemaVersion: number): string {
  switch (route.name) {
    case 'today':
      return `${consecrationTitle} is ready for today's prayer. Schema v${String(schemaVersion)}.`;
    case 'day':
      return `${consecrationTitle}, day ${String(route.day)}.`;
    case 'timeline':
      return 'Your journey history will appear here as progress and reflections are added.';
    case 'settings':
      return 'Theme, motion, text size, mode, and reminders will be adjusted here.';
    case 'catch-up':
      return 'Choose a gentle path back into the rhythm when a few days have passed.';
  }
}
