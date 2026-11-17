/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/word_id.rs
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

const WORD_MASK = 0x0fff_ffff;
const DIC_MASK = 0x0f;

export class WordId {
  static readonly MAX_WORD = WORD_MASK;

  static readonly INVALID = WordId.fromRaw(0xffff_ffff);
  static readonly BOS = WordId.fromRaw(0xffff_fffe);
  static readonly EOS = WordId.fromRaw(0xffff_fffd);

  readonly raw: number;

  private constructor(raw: number) {
    this.raw = raw >>> 0;
  }

  static fromRaw(raw: number): WordId {
    return new WordId(raw);
  }

  static new(dic: number, word: number): WordId {
    const dicPart = (dic & DIC_MASK) << 28;
    const wordPart = word & WORD_MASK;
    return WordId.fromRaw((dicPart | wordPart) >>> 0);
  }

  static checked(dic: number, word: number): WordId {
    if (!Number.isInteger(dic) || dic < 0 || dic > DIC_MASK) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Dictionary ID is too large: ${dic}`
      });
    }

    if (!Number.isInteger(word) || word < 0 || word > WORD_MASK) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Word ID is too large: ${word}, max ${WORD_MASK}`
      });
    }

    return WordId.new(dic, word);
  }

  static oov(posId: number): WordId {
    return WordId.new(0x0f, posId);
  }

  dic(): number {
    return this.raw >>> 28;
  }

  word(): number {
    return this.raw & WORD_MASK;
  }

  isSystem(): boolean {
    return this.dic() === 0;
  }

  isUser(): boolean {
    const dic = this.dic();
    return dic !== 0 && dic !== 0x0f;
  }

  isOov(): boolean {
    return this.dic() === 0x0f;
  }

  isSpecial(): boolean {
    return this.raw >= WordId.EOS.raw && this.raw < WordId.INVALID.raw;
  }

  asRaw(): number {
    return this.raw;
  }

  equals(other: WordId): boolean {
    return this.raw === other.raw;
  }

  toString(): string {
    const dic = this.isOov() ? -1 : this.dic();
    return `(${dic}, ${this.word()})`;
  }
}
