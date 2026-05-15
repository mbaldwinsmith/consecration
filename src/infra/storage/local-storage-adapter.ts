import type {
  JsonSerializer,
  KeyValueStore,
  StorageHealth,
} from './storage-types';
import { identityJsonSerializer } from './storage-types';

export class LocalStorageAdapter<T> implements KeyValueStore<T> {
  readonly #storage: Storage;
  readonly #namespace: string;
  readonly #serializer: JsonSerializer<T>;

  public constructor(
    namespace: string,
    storage: Storage = window.localStorage,
    serializer = identityJsonSerializer<T>(),
  ) {
    this.#namespace = namespace;
    this.#storage = storage;
    this.#serializer = serializer;
  }

  public get(key: string): Promise<T | undefined> {
    const value = this.#storage.getItem(this.#toStorageKey(key));

    if (value === null) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(this.#serializer.parse(JSON.parse(value)));
  }

  public set(key: string, value: T): Promise<void> {
    this.#storage.setItem(
      this.#toStorageKey(key),
      this.#serializer.stringify(value),
    );
    return Promise.resolve();
  }

  public delete(key: string): Promise<void> {
    this.#storage.removeItem(this.#toStorageKey(key));
    return Promise.resolve();
  }

  public getAll(): Promise<readonly T[]> {
    const values: T[] = [];

    for (let index = 0; index < this.#storage.length; index += 1) {
      const key = this.#storage.key(index);

      if (key?.startsWith(`${this.#namespace}:`) !== true) {
        continue;
      }

      const value = this.#storage.getItem(key);

      if (value !== null) {
        values.push(this.#serializer.parse(JSON.parse(value)));
      }
    }

    return Promise.resolve(values);
  }

  public checkHealth(): StorageHealth {
    const probeKey = this.#toStorageKey('__healthcheck__');

    try {
      this.#storage.setItem(probeKey, 'true');
      this.#storage.removeItem(probeKey);

      return { status: 'available', adapter: 'localStorage' };
    } catch (error) {
      return {
        status: 'unavailable',
        adapter: 'localStorage',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  #toStorageKey(key: string): string {
    return `${this.#namespace}:${key}`;
  }
}
