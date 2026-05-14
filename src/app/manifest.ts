export interface AppManifestPointer {
  readonly appName: string;
  readonly defaultConsecrationId: string;
  readonly consecrations: readonly ConsecrationManifestSummary[];
}

export interface ConsecrationManifestSummary {
  readonly id: string;
  readonly title: string;
  readonly totalDays: number;
  readonly defaultRoute: string;
}

export const bundledManifestPointer: AppManifestPointer = {
  appName: 'Consecration',
  defaultConsecrationId: 'montfort',
  consecrations: [
    {
      id: 'montfort',
      title: 'St. Louis de Montfort',
      totalDays: 33,
      defaultRoute: '/today',
    },
  ],
};

export function findConsecration(
  manifest: AppManifestPointer,
  consecrationId: string,
): ConsecrationManifestSummary {
  return (
    manifest.consecrations.find((consecration) => consecration.id === consecrationId) ??
    manifest.consecrations[0] ??
    unreachableManifest()
  );
}

function unreachableManifest(): never {
  throw new Error('App manifest must include at least one consecration.');
}
