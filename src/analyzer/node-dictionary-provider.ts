import { openSync, readSync, closeSync, fstatSync } from "node:fs";
import type { DictionaryDataSource } from "./dictionary-provider.js";

const PAGE_SHIFT = 16;
const PAGE_SIZE = 1 << PAGE_SHIFT;

export class PageCachedFileSource implements DictionaryDataSource {
  private readonly fd: number;
  readonly byteLength: number;
  private readonly pages = new Map<number, Buffer>();

  constructor(path: string) {
    this.fd = openSync(path, "r");
    this.byteLength = fstatSync(this.fd).size;
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

    const result = Buffer.allocUnsafe(actualLength);
    let written = 0;
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
      const page = this.loadPage(pageIndex);
      const pageStart = pageIndex << PAGE_SHIFT;
      const readStart = Math.max(offset, pageStart) - pageStart;
      const readEnd = Math.min(end, pageStart + PAGE_SIZE) - pageStart;
      page.copy(result, written, readStart, readEnd);
      written += readEnd - readStart;
    }
    return result;
  }

  close(): void {
    this.pages.clear();
    try {
      closeSync(this.fd);
    } catch {                   }
  }

  private loadPage(pageIndex: number): Buffer {
    let page = this.pages.get(pageIndex);
    if (page !== undefined) return page;

    const pageOffset = pageIndex << PAGE_SHIFT;
    const remaining = this.byteLength - pageOffset;
    const size = Math.min(PAGE_SIZE, remaining);
    page = Buffer.allocUnsafe(size);
    readSync(this.fd, page, 0, size, pageOffset);
    this.pages.set(pageIndex, page);
    return page;
  }
}
