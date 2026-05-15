import type { KeyValueStore, StorageHealth } from './storage-types';

export interface IndexedDbAdapterOptions {
  readonly databaseName: string;
  readonly storeName: string;
  readonly storeNames?: readonly string[];
  readonly version?: number;
  readonly indexedDB?: IDBFactory;
}

export class IndexedDbAdapter<T extends object> implements KeyValueStore<T> {
  readonly #databaseName: string;
  readonly #storeName: string;
  readonly #storeNames: readonly string[];
  readonly #version: number;
  readonly #indexedDB: IDBFactory | undefined;
  #databasePromise: Promise<IDBDatabase> | undefined;

  public constructor(options: IndexedDbAdapterOptions) {
    this.#databaseName = options.databaseName;
    this.#storeName = options.storeName;
    this.#storeNames = options.storeNames ?? [options.storeName];
    this.#version = options.version ?? 1;
    this.#indexedDB = options.indexedDB ?? globalThis.indexedDB;
  }

  public async get(key: string): Promise<T | undefined> {
    return this.#withStore('readonly', (store) =>
      requestToPromise(store.get(key) as IDBRequest<T | undefined>),
    );
  }

  public async set(key: string, value: T): Promise<void> {
    await this.#withStore('readwrite', (store) =>
      requestToPromise(store.put(value, key)),
    );
  }

  public async delete(key: string): Promise<void> {
    await this.#withStore('readwrite', (store) =>
      requestToPromise(store.delete(key)),
    );
  }

  public async getAll(): Promise<readonly T[]> {
    return this.#withStore('readonly', (store) =>
      requestToPromise(store.getAll() as IDBRequest<T[]>),
    );
  }

  public async checkHealth(): Promise<StorageHealth> {
    if (this.#indexedDB === undefined) {
      return {
        status: 'unavailable',
        adapter: 'indexedDB',
        reason: 'IndexedDB is not available.',
      };
    }

    try {
      await this.#openDatabase();

      return { status: 'available', adapter: 'indexedDB' };
    } catch (error) {
      return {
        status: 'unavailable',
        adapter: 'indexedDB',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async #withStore<R>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<R>,
  ): Promise<R> {
    const database = await this.#openDatabase();
    const transaction = database.transaction(this.#storeName, mode);
    const store = transaction.objectStore(this.#storeName);

    return operation(store);
  }

  async #openDatabase(): Promise<IDBDatabase> {
    if (this.#indexedDB === undefined) {
      throw new Error('IndexedDB is not available.');
    }

    this.#databasePromise ??= new Promise((resolve, reject) => {
      const request = this.#indexedDB?.open(this.#databaseName, this.#version);

      if (request === undefined) {
        reject(new Error('IndexedDB is not available.'));
        return;
      }

      request.onupgradeneeded = () => {
        const database = request.result;

        for (const storeName of this.#storeNames) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
          }
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              `Unable to open IndexedDB database ${this.#databaseName}.`,
            ),
        );
      };
    });

    return this.#databasePromise;
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}
