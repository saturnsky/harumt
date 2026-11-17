/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/subset.rs
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
export class InfoSubset {
  static readonly SURFACE = new InfoSubset(1 << 0);
  static readonly HEAD_WORD_LENGTH = new InfoSubset(1 << 1);
  static readonly POS_ID = new InfoSubset(1 << 2);
  static readonly NORMALIZED_FORM = new InfoSubset(1 << 3);
  static readonly DIC_FORM_WORD_ID = new InfoSubset(1 << 4);
  static readonly READING_FORM = new InfoSubset(1 << 5);
  static readonly SPLIT_A = new InfoSubset(1 << 6);
  static readonly SPLIT_B = new InfoSubset(1 << 7);
  static readonly WORD_STRUCTURE = new InfoSubset(1 << 8);
  static readonly SYNONYM_GROUP_ID = new InfoSubset(1 << 9);

  private static readonly allBits =
    InfoSubset.SURFACE.bits |
    InfoSubset.HEAD_WORD_LENGTH.bits |
    InfoSubset.POS_ID.bits |
    InfoSubset.NORMALIZED_FORM.bits |
    InfoSubset.DIC_FORM_WORD_ID.bits |
    InfoSubset.READING_FORM.bits |
    InfoSubset.SPLIT_A.bits |
    InfoSubset.SPLIT_B.bits |
    InfoSubset.WORD_STRUCTURE.bits |
    InfoSubset.SYNONYM_GROUP_ID.bits;

  readonly bits: number;

  constructor(bits: number) {
    this.bits = bits >>> 0;
  }

  static empty(): InfoSubset {
    return new InfoSubset(0);
  }

  static all(): InfoSubset {
    return new InfoSubset(InfoSubset.allBits);
  }

  static default(): InfoSubset {
    return InfoSubset.all();
  }

  contains(other: InfoSubset): boolean {
    return (this.bits & other.bits) === other.bits;
  }

  intersects(other: InfoSubset): boolean {
    return (this.bits & other.bits) !== 0;
  }

  isEmpty(): boolean {
    return this.bits === 0;
  }

  or(other: InfoSubset): InfoSubset {
    return new InfoSubset(this.bits | other.bits);
  }

  remove(other: InfoSubset): InfoSubset {
    return new InfoSubset(this.bits & ~other.bits);
  }

  normalize(): InfoSubset {
    let result: InfoSubset = this;
    if (
      result.intersects(
        InfoSubset.READING_FORM.or(InfoSubset.NORMALIZED_FORM)
      )
    ) {
      result = result.or(InfoSubset.SURFACE);
    }

    if (result.intersects(InfoSubset.SPLIT_A.or(InfoSubset.SPLIT_B))) {
      result = result.or(InfoSubset.HEAD_WORD_LENGTH);
    }

    return result;
  }
}
