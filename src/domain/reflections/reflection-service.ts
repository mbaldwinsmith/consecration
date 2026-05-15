import type { KeyValueStore } from '../../infra/storage/storage-types';
import type { ReflectionEntry } from '../../types';

export interface SaveReflectionOptions {
  readonly consecrationId: string;
  readonly day: number;
  readonly text: string;
  readonly now?: Date;
}

export class ReflectionService {
  readonly #store: KeyValueStore<ReflectionEntry>;

  public constructor(store: KeyValueStore<ReflectionEntry>) {
    this.#store = store;
  }

  public async saveReflection(
    options: SaveReflectionOptions,
  ): Promise<ReflectionEntry | undefined> {
    const id = toReflectionId(options.consecrationId, options.day);
    const existing = await this.#store.get(id);
    const text = options.text.trim();

    if (text.length === 0) {
      await this.#store.delete(id);
      return undefined;
    }

    const now = (options.now ?? new Date()).toISOString();
    const entry: ReflectionEntry = {
      id,
      consecrationId: options.consecrationId,
      day: options.day,
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.#store.set(id, entry);

    return entry;
  }

  public getReflection(
    consecrationId: string,
    day: number,
  ): Promise<ReflectionEntry | undefined> {
    return this.#store.get(toReflectionId(consecrationId, day));
  }

  public async listReflections(
    consecrationId: string,
  ): Promise<readonly ReflectionEntry[]> {
    const entries = await this.#store.getAll();

    return entries
      .filter((entry) => entry.consecrationId === consecrationId)
      .sort(
        (left, right) =>
          left.day - right.day || left.updatedAt.localeCompare(right.updatedAt),
      );
  }
}

function toReflectionId(consecrationId: string, day: number): string {
  return `${consecrationId}:${String(day)}`;
}
