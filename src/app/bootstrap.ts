import '../styles/tokens.css';
import '../styles/theme.css';
import { bundledManifestPointer } from './manifest';
import { listenForRouteChanges, resolveInitialRoute } from './router';
import { applyAccessibilityPreferences, applyThemePreference, loadBootSettings, persistLastRoute } from './settings';
import { createAppShell } from './shell';
import { getSchemaVersion } from './schema';

const mount = document.querySelector<HTMLElement>('#app');

if (mount === null) {
  throw new Error('App mount element #app was not found.');
}

const settings = loadBootSettings();
const route = resolveInitialRoute(
  bundledManifestPointer,
  settings.consecrationId,
  window.location.pathname,
  settings.lastRoute,
);

applyAccessibilityPreferences(settings);
applyThemePreference(settings.theme);
persistLastRoute(route.path);

if (window.location.pathname !== route.path) {
  window.history.replaceState({}, '', route.path);
}

const render = (nextRoute: typeof route): void => {
  const nextSettings = loadBootSettings();
  applyAccessibilityPreferences(nextSettings);
  applyThemePreference(nextSettings.theme);

  mount.replaceChildren(
    createAppShell({
      manifest: bundledManifestPointer,
      route: nextRoute,
      schemaVersion: getSchemaVersion(),
      settings: nextSettings,
    }),
  );
};

render(route);

listenForRouteChanges(bundledManifestPointer, settings.consecrationId, (nextRoute) => {
  persistLastRoute(nextRoute.path);
  render(nextRoute);
});
