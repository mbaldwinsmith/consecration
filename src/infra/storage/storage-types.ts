export interface KeyValueStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  getAll(): Promise<readonly T[]>;
}

export type StorageHealthStatus = 'available' | 'unavailable';

export interface StorageHealth {
  readonly status: StorageHealthStatus;
  readonly adapter: string;
  readonly reason?: string;
}

export interface JsonSerializer<T> {
  parse(value: unknown): T;
  stringify(value: T): string;
}

export function identityJsonSerializer<T>(): JsonSerializer<T> {
  return {
    parse: (value) => value as T,
    stringify: (value) => JSON.stringify(value),
  };
}
