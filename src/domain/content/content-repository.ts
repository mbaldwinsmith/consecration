import { RuntimeContentIndex } from './content-index';
import type { CompiledDayPayload, ContentIndex } from './content-types';

export interface ContentRepositoryOptions {
  readonly baseUrl?: string;
  readonly fetcher?: FetchLike;
}

export type FetchLike = (input: string) => Promise<FetchLikeResponse>;

export interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export class ContentRepository {
  readonly #baseUrl: string;
  readonly #fetcher: FetchLike;
  #index: RuntimeContentIndex | undefined;

  public constructor(options: ContentRepositoryOptions = {}) {
    this.#baseUrl = options.baseUrl ?? '';
    this.#fetcher = options.fetcher ?? window.fetch.bind(window);
  }

  public async loadIndex(): Promise<RuntimeContentIndex> {
    if (this.#index !== undefined) {
      return this.#index;
    }

    const index = await this.#fetchJson<ContentIndex>('content-index.json');
    this.#index = new RuntimeContentIndex(index);

    return this.#index;
  }

  public async getDay(
    consecrationId: string,
    day: number,
  ): Promise<CompiledDayPayload> {
    const index = await this.loadIndex();
    const entry = index.requireDay(consecrationId, day);

    return this.#fetchJson<CompiledDayPayload>(entry.path);
  }

  async #fetchJson<T>(path: string): Promise<T> {
    const response = await this.#fetcher(joinUrl(this.#baseUrl, path));

    if (!response.ok) {
      throw new Error(
        `Unable to load content asset ${path}: HTTP ${String(response.status)}.`,
      );
    }

    return (await response.json()) as T;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, '');

  if (baseUrl.length === 0) {
    return cleanPath;
  }

  return `${baseUrl.replace(/\/+$/, '')}/${cleanPath}`;
}
