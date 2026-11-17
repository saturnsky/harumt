/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/lexicon_set.rs
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
import { SudachiError } from "./error.js";
import { InfoSubset } from "./subset.js";
import { WordId } from "./word-id.js";
import { WordInfo } from "./word-info.js";
import type { WordInfoData } from "./word-info.js";

export interface LexiconEntry {
  readonly wordId: WordId;
  readonly end: number;
}

export class LexiconSet {
  private readonly lexicons: LexiconLike[] = [];
  private systemLexiconCount = 0;

  constructor(lexicons: readonly LexiconLike[] = []) {
    for (const lexicon of lexicons) {
      this.add(lexicon);
    }
  }

  get lexiconCount(): number {
    return this.lexicons.length;
  }

  get frozenLexiconCount(): number {
    return this.systemLexiconCount;
  }

  add(lexicon: LexiconLike): void {
    lexicon.setDicId(this.lexicons.length);
    this.lexicons.push(lexicon);
  }

  freezeSystemLexicons(): void {
    this.systemLexiconCount = this.lexicons.length;
  }

  replaceUserLexicons(lexicons: readonly LexiconLike[]): void {
    this.lexicons.length = this.systemLexiconCount;
    for (const lexicon of lexicons) {
      this.add(lexicon);
    }
  }

  lookup(input: string | Uint8Array, offset = 0): LexiconEntry[] {
    const result: LexiconEntry[] = [];
    for (const lexicon of this.lexicons) {
      result.push(...lexicon.lookup(input, offset));
    }
    return result;
  }

  getWordInfo(wordId: WordId, subset = InfoSubset.all()): WordInfo {
    const lexicon = this.lexicons[wordId.dic()];
    if (lexicon === undefined) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Unknown dictionary id: ${wordId.dic()}`
      });
    }
    return lexicon.getWordInfo(wordId.word(), subset);
  }

  getWordParam(wordId: WordId): readonly [number, number, number] {
    const lexicon = this.lexicons[wordId.dic()];
    if (lexicon === undefined) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Unknown dictionary id: ${wordId.dic()}`
      });
    }
    return lexicon.getWordParam(wordId.word());
  }
}

export interface InMemoryLexiconEntry {
  readonly surface: string;
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly wordInfo: WordInfoData;
}

export interface LexiconLike {
  setDicId(id: number): void;
  lookup(input: string | Uint8Array, offset?: number): LexiconEntry[];
  getWordInfo(wordId: number, subset: InfoSubset): WordInfo;
  getWordParam(wordId: number): readonly [number, number, number];
}

export class InMemoryLexicon implements LexiconLike {
  private lexId = 0xff;
  private readonly entries: (InMemoryLexiconEntry & { surfaceByteLength: number })[];
  private readonly entriesBySurface = new Map<string, number[]>();
  private readonly surfaceLengths: number[];
  private readonly maxSurfaceByteLength: number;
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();

  constructor(entries: readonly InMemoryLexiconEntry[]) {
    this.entries = entries.map((entry) => ({
      ...entry,
      surfaceByteLength: this.encoder.encode(entry.surface).byteLength
    }));
    this.maxSurfaceByteLength = this.entries.reduce(
      (max, entry) => Math.max(max, entry.surfaceByteLength),
      0
    );
    for (const [index, entry] of this.entries.entries()) {
      const indexes = this.entriesBySurface.get(entry.surface) ?? [];
      indexes.push(index);
      this.entriesBySurface.set(entry.surface, indexes);
    }
    this.surfaceLengths = [
      ...new Set([...this.entriesBySurface.keys()].map((surface) => surface.length))
    ].sort((a, b) => a - b);
  }

  setDicId(id: number): void {
    this.lexId = id;
  }

  lookup(input: string | Uint8Array, offset = 0): LexiconEntry[] {
    const isString = typeof input === "string";
    const text = isString
      ? input
      : this.decoder.decode(input.subarray(offset, offset + this.maxSurfaceByteLength + 3));
    const start = isString ? offset : 0;
    const remaining = text.length - start;
    const byteOffset = isString
      ? this.encoder.encode(input.slice(0, offset)).byteLength
      : offset;
    const result: LexiconEntry[] = [];
    for (const length of this.surfaceLengths) {
      if (length > remaining) {
        break;
      }
      const candidate = text.slice(start, start + length);
      const indexes = this.entriesBySurface.get(candidate);
      if (indexes === undefined) {
        continue;
      }
      const end = byteOffset + (this.entries[indexes[0] ?? 0]?.surfaceByteLength ?? 0);
      for (const index of indexes) {
        result.push({
          wordId: WordId.new(this.lexId, index),
          end
        });
      }
    }
    return result;
  }

  getWordInfo(wordId: number, _subset: InfoSubset): WordInfo {
    const entry = this.entries[wordId];
    if (entry === undefined) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Unknown in-memory word id: ${wordId}`
      });
    }
    return new WordInfo(entry.wordInfo);
  }

  getWordParam(wordId: number): readonly [number, number, number] {
    const entry = this.entries[wordId];
    if (entry === undefined) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Unknown in-memory word id: ${wordId}`
      });
    }
    return [entry.leftId, entry.rightId, entry.cost];
  }
}
