import type { DictionaryDataSource } from "./dictionary-provider.js";


const PAGE_SHIFT = 16;
const PAGE_SIZE = 1 << PAGE_SHIFT;

export const DEFAULT_SYSTEM_DICTIONARY_PAGE_BUDGET = 1024;

export function pageCountForBytes(bytes: number): number {
  if (!Number.isFinite(bytes) || !(bytes > 0)) {
    throw new RangeError(`page cache bytes must be a finite positive number: ${String(bytes)}`);
  }
  return Math.max(1, Math.floor(bytes / PAGE_SIZE));
}

export class PageCacheBudget {
  private readonly lru = new Set<CachedPage>();

  constructor(readonly maxPages: number) {
    if (!(maxPages >= 1) || !Number.isFinite(maxPages)) {
      throw new RangeError(`maxPages must be a finite number of at least 1: ${String(maxPages)}`);
    }
  }

  get cachedPages(): number {
    return this.lru.size;
  }

  touch(page: CachedPage): void {
    this.lru.delete(page);
    this.lru.add(page);
  }

  admit(page: CachedPage): void {
    this.lru.add(page);
    while (this.lru.size > this.maxPages) {
      const oldest = this.lru.values().next().value!;
      this.lru.delete(oldest);
      oldest.owner.evict(oldest.index);
    }
  }

  release(page: CachedPage): void {
    this.lru.delete(page);
  }
}

interface CachedPage {
  readonly owner: PageCachedSource;
  readonly index: number;
  readonly bytes: Uint8Array;
}

export interface PageCachedSourceOptions {
  readonly budget?: PageCacheBudget;
}

export interface PageCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly cachedPages: number;
}

export interface RandomAccessReader {
  readonly byteLength: number;
  readAt(target: Uint8Array, position: number): number;
  close(): void;
}

export class PageCachedSource implements DictionaryDataSource {
  readonly byteLength: number;
  private readonly pages = new Map<number, CachedPage>();
  private readonly sections = new Map<string, Uint8Array>();
  private budget: PageCacheBudget | undefined;
  private hits = 0;
  private misses = 0;

  constructor(private readonly reader: RandomAccessReader, options: PageCachedSourceOptions = {}) {
    this.budget = options.budget;
    this.byteLength = reader.byteLength;
  }

  slice(offset: number, length: number): Uint8Array {
    if (length <= 0 || offset >= this.byteLength) {
      return new Uint8Array(0);
    }
    const end = Math.min(offset + length, this.byteLength);
    const actualLength = end - offset;

    const startPage = offset >>> PAGE_SHIFT;
    const endPage = (end - 1) >>> PAGE_SHIFT;

    if (startPage === endPage) {
      const page = this.loadPage(startPage);
      const pageOffset = offset - (startPage << PAGE_SHIFT);
      return page.subarray(pageOffset, pageOffset + actualLength);
    }

    const result = new Uint8Array(actualLength);
    let written = 0;
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
      const page = this.loadPage(pageIndex);
      const pageStart = pageIndex << PAGE_SHIFT;
      const readStart = Math.max(offset, pageStart) - pageStart;
      const readEnd = Math.min(end, pageStart + PAGE_SIZE) - pageStart;
      result.set(page.subarray(readStart, readEnd), written);
      written += readEnd - readStart;
    }
    return result;
  }

  readSection(offset: number, length: number): Uint8Array {
    const key = `${offset}:${length}`;
    const cached = this.sections.get(key);
    if (cached !== undefined) return cached;
    let bytes: Uint8Array;
    if (length <= 0 || offset >= this.byteLength) {
      bytes = new Uint8Array(0);
    } else {
      bytes = new Uint8Array(Math.min(offset + length, this.byteLength) - offset);
      this.readFully(bytes, offset);
    }
    this.sections.set(key, bytes);
    return bytes;
  }

  pageCacheStats(): PageCacheStats {
    return { hits: this.hits, misses: this.misses, cachedPages: this.pages.size };
  }

  close(): void {
    if (this.budget !== undefined) {
      for (const page of this.pages.values()) this.budget.release(page);
    }
    this.pages.clear();
    this.sections.clear();
    try {
      this.reader.close();
    } catch {                   }
  }

  moveToBudget(budget: PageCacheBudget | undefined): void {
    if (this.budget !== undefined) {
      for (const page of this.pages.values()) this.budget.release(page);
    }
    this.budget = budget;
    if (budget !== undefined) {
      for (const page of this.pages.values()) budget.admit(page);
    }
  }

  evict(pageIndex: number): void {
    this.pages.delete(pageIndex);
  }

  private loadPage(pageIndex: number): Uint8Array {
    const cached = this.pages.get(pageIndex);
    if (cached !== undefined) {
      this.hits += 1;
      if (this.budget !== undefined) this.budget.touch(cached);
      return cached.bytes;
    }
    this.misses += 1;

    const pageOffset = pageIndex << PAGE_SHIFT;
    const bytes = new Uint8Array(Math.min(PAGE_SIZE, this.byteLength - pageOffset));
    this.readFully(bytes, pageOffset);
    const page: CachedPage = { owner: this, index: pageIndex, bytes };
    this.pages.set(pageIndex, page);
    if (this.budget !== undefined) this.budget.admit(page);
    return bytes;
  }

  private readFully(target: Uint8Array, position: number): void {
    let read = 0;
    while (read < target.byteLength) {
      const n = this.reader.readAt(target.subarray(read), position + read);
      if (n <= 0) throw new Error(`unexpected end of dictionary file at ${position + read}`);
      read += n;
    }
  }
}

export interface SyncAccessHandleLike {
  getSize(): number;
  read(buffer: Uint8Array, options: { at: number }): number;
  close(): void;
}

export class SyncAccessHandleDataSource extends PageCachedSource {
  constructor(handle: SyncAccessHandleLike, options: PageCachedSourceOptions = {}) {
    super(
      {
        byteLength: handle.getSize(),
        readAt: (target, position) => handle.read(target, { at: position }),
        close: () => handle.close()
      },
      options
    );
  }
}
