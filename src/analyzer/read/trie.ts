/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/lexicon/trie.rs
 *
 * Copyright (c) 2021-2024 Works Applications Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file has been modified: ported from Rust to TypeScript and adapted
 * for HaruMT.
 */
import { EagerDataSource, type DictionaryDataSource } from "../dictionary-provider.js";

export interface TrieEntry {
  readonly value: number;
  readonly end: number;
}

export class Trie {
  private constructor(
    private readonly source: DictionaryDataSource,
    private readonly offset: number,
    private readonly size: number
  ) {}

  static fromSource(source: DictionaryDataSource, offset: number, size: number): Trie {
    return new Trie(source, offset, size);
  }

  static fromUnits(units: readonly number[]): Trie {
    const buf = new Uint8Array(units.length * 4);
    const view = new DataView(buf.buffer);
    for (let i = 0; i < units.length; i++) {
      view.setUint32(i * 4, units[i]! >>> 0, true);
    }
    return new Trie(new EagerDataSource(buf), 0, units.length);
  }

  totalSize(): number {
    return 4 * this.size;
  }

  *commonPrefixEntries(input: Uint8Array, offset: number): Iterable<TrieEntry> {
    let index = offset;
    for (const entry of this.commonPrefixEntriesOfStream(() => (index < input.byteLength ? input[index++]! : -1))) {
      yield { value: entry.value, end: offset + entry.end };
    }
  }

  *commonPrefixEntriesOfStream(nextKey: () => number): Iterable<TrieEntry> {
    const root = this.get(0);
    if (root === undefined) {
      return;
    }

    let nodePos = Trie.offset(root);

    for (let consumed = 1; ; consumed += 1) {
      const key = nextKey();
      if (key < 0) {
        return;
      }

      nodePos = (nodePos ^ key) >>> 0;
      const unit = this.get(nodePos);
      if (unit === undefined || Trie.label(unit) !== key) {
        return;
      }

      nodePos = (nodePos ^ Trie.offset(unit)) >>> 0;
      if (Trie.hasLeaf(unit)) {
        const valueNode = this.get(nodePos);
        if (valueNode === undefined) {
          return;
        }
        yield { value: Trie.value(valueNode), end: consumed };
      }
    }
  }

  private get(index: number): number | undefined {
    if (index < 0 || index >= this.size) return undefined;
    const buf = this.source.slice(this.offset + index * 4, 4);
    if (buf.byteLength < 4) return undefined;
    return new DataView(buf.buffer, buf.byteOffset, 4).getUint32(0, true);
  }

  private static hasLeaf(unit: number): boolean {
    return ((unit >>> 8) & 1) === 1;
  }

  private static value(unit: number): number {
    return unit & 0x7fff_ffff;
  }

  private static label(unit: number): number {
    return unit & ((1 << 31) | 0xff);
  }

  private static offset(unit: number): number {
    return (unit >>> 10) << ((unit & (1 << 9)) >>> 6);
  }
}
