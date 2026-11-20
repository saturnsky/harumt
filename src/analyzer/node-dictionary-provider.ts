import { openSync, readSync, closeSync, fstatSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { DictionaryDataSource } from "./dictionary-provider.js";
import {
  DEFAULT_SYSTEM_DICTIONARY_PAGE_BUDGET,
  PageCacheBudget,
  PageCachedSource,
  type PageCachedSourceOptions,
  type PageCacheStats
} from "./page-cached-source.js";

export class PageCachedFileSource extends PageCachedSource {
  readonly mtimeNs: bigint;

  constructor(path: string, options: PageCachedSourceOptions = {}) {
    const fd = openSync(path, "r");
    const stat = fstatSync(fd, { bigint: true });
    super(
      {
        byteLength: Number(stat.size),
        readAt: (target, position) => readSync(fd, target, 0, target.byteLength, position),
        close: () => closeSync(fd)
      },
      options
    );
    this.mtimeNs = stat.mtimeNs;
  }
}

export class SharedFileSourceRegistry {
  private readonly entries = new Map<string, SharedFileSourceEntry>();

  private readonly sourceOptions: PageCachedSourceOptions;

  constructor(options: { readonly maxPages?: number } = {}) {
    this.sourceOptions = options.maxPages === undefined ? {} : { budget: new PageCacheBudget(options.maxPages) };
  }

  private retire(entry: SharedFileSourceEntry): void {
    const shared = this.sourceOptions.budget;
    entry.retire(shared === undefined ? undefined : new PageCacheBudget(shared.maxPages));
  }

  open(path: string): DictionaryDataSource {
    const key = resolve(path);
    const stat = statSync(key, { bigint: true });
    let entry = this.entries.get(key);
    if (entry !== undefined && (entry.source.byteLength !== Number(stat.size) || entry.source.mtimeNs !== stat.mtimeNs)) {
      this.entries.delete(key);
      this.retire(entry);
      entry = undefined;
    }
    if (entry === undefined) {
      entry = new SharedFileSourceEntry(new PageCachedFileSource(key, this.sourceOptions));
      this.entries.set(key, entry);
    }
    return entry.acquire();
  }

  clear(): void {
    for (const entry of this.entries.values()) this.retire(entry);
    this.entries.clear();
  }

  budgetedPages(): number | undefined {
    return this.sourceOptions.budget?.cachedPages;
  }

  pageCacheStats(): ReadonlyMap<string, PageCacheStats> {
    const result = new Map<string, PageCacheStats>();
    for (const [key, entry] of this.entries) result.set(key, entry.source.pageCacheStats());
    return result;
  }
}

class SharedFileSourceEntry {
  private handles = 0;
  private retired = false;

  constructor(readonly source: PageCachedFileSource) {}

  acquire(): DictionaryDataSource {
    this.handles += 1;
    return new SharedFileSourceHandle(this);
  }

  release(): void {
    this.handles -= 1;
    this.closeIfUnused();
  }

  retire(privateBudget: PageCacheBudget | undefined): void {
    this.retired = true;
    this.source.moveToBudget(privateBudget);
    this.closeIfUnused();
  }

  private closeIfUnused(): void {
    if (this.retired && this.handles === 0) this.source.close();
  }
}

class SharedFileSourceHandle implements DictionaryDataSource {
  readonly byteLength: number;
  private closed = false;

  constructor(private readonly entry: SharedFileSourceEntry) {
    this.byteLength = entry.source.byteLength;
  }

  slice(offset: number, length: number): Uint8Array {
    return this.live().slice(offset, length);
  }

  readSection(offset: number, length: number): Uint8Array {
    return this.live().readSection(offset, length);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.entry.release();
  }

  private live(): PageCachedFileSource {
    if (this.closed) throw new Error("dictionary data source is closed");
    return this.entry.source;
  }
}

const systemDictionarySources = new SharedFileSourceRegistry({ maxPages: DEFAULT_SYSTEM_DICTIONARY_PAGE_BUDGET });

export function openSharedSystemDictionarySource(path: string): DictionaryDataSource {
  return systemDictionarySources.open(path);
}

export function clearSystemDictionarySources(): void {
  systemDictionarySources.clear();
}

export function systemDictionarySourceStats(): ReadonlyMap<string, PageCacheStats> {
  return systemDictionarySources.pageCacheStats();
}
