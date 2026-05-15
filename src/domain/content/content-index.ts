import type { ContentIndex, ContentIndexEntry } from './content-types';

export class RuntimeContentIndex {
  readonly #entriesByKey: ReadonlyMap<string, ContentIndexEntry>;

  public constructor(public readonly index: ContentIndex) {
    this.#entriesByKey = new Map(
      index.days.map((entry) => [
        toEntryKey(entry.consecrationId, entry.day),
        entry,
      ]),
    );
  }

  public findDay(
    consecrationId: string,
    day: number,
  ): ContentIndexEntry | undefined {
    return this.#entriesByKey.get(toEntryKey(consecrationId, day));
  }

  public requireDay(consecrationId: string, day: number): ContentIndexEntry {
    const entry = this.findDay(consecrationId, day);

    if (entry === undefined) {
      throw new Error(
        `Content index does not include ${consecrationId} day ${String(day)}.`,
      );
    }

    return entry;
  }

  public listDays(consecrationId: string): readonly ContentIndexEntry[] {
    return this.index.days.filter(
      (entry) => entry.consecrationId === consecrationId,
    );
  }
}

function toEntryKey(consecrationId: string, day: number): string {
  return `${consecrationId}:${String(day)}`;
}
