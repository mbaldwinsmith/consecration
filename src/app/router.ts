import type { AppManifestPointer } from './manifest';
import { findConsecration } from './manifest';

export type AppRoute =
  | { readonly name: 'today'; readonly path: '/today' }
  | { readonly name: 'day'; readonly path: `/day/${number}`; readonly day: number }
  | { readonly name: 'timeline'; readonly path: '/timeline' }
  | { readonly name: 'settings'; readonly path: '/settings' }
  | { readonly name: 'catch-up'; readonly path: '/catch-up' };

export type RouteChangeHandler = (route: AppRoute) => void;

export function resolveInitialRoute(
  manifest: AppManifestPointer,
  consecrationId: string,
  currentPath: string,
  lastRoute: string,
): AppRoute {
  const activeConsecration = findConsecration(manifest, consecrationId);
  const path = currentPath === '/' ? lastRoute : currentPath;

  return parseRoute(path, activeConsecration.totalDays);
}

export function parseRoute(path: string, totalDays: number): AppRoute {
  if (path === '/timeline') {
    return { name: 'timeline', path };
  }

  if (path === '/settings') {
    return { name: 'settings', path };
  }

  if (path === '/catch-up') {
    return { name: 'catch-up', path };
  }

  const dayMatch = /^\/day\/(?<day>\d+)$/.exec(path);
  const parsedDay = dayMatch?.groups?.day === undefined ? undefined : Number(dayMatch.groups.day);

  if (parsedDay !== undefined && Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= totalDays) {
    return { name: 'day', path: toDayPath(parsedDay), day: parsedDay };
  }

  return { name: 'today', path: '/today' };
}

function toDayPath(day: number): `/day/${number}` {
  return `/day/${String(day)}` as `/day/${number}`;
}

export function navigateTo(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function listenForRouteChanges(
  manifest: AppManifestPointer,
  consecrationId: string,
  handler: RouteChangeHandler,
): () => void {
  const activeConsecration = findConsecration(manifest, consecrationId);
  const listener = (): void => {
    handler(parseRoute(window.location.pathname, activeConsecration.totalDays));
  };

  window.addEventListener('popstate', listener);

  return () => {
    window.removeEventListener('popstate', listener);
  };
}
