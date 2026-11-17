/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/connect.rs
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
import type { DictionaryDataSource } from "./dictionary-provider.js";

export class ConnectionMatrix {
  readonly numLeft: number;
  readonly numRight: number;
  private readonly matrix: DataView;
  private readonly overrides = new Map<number, number>();

  private constructor(
    matrix: DataView,
    numLeft: number,
    numRight: number
  ) {
    this.matrix = matrix;
    this.numLeft = numLeft;
    this.numRight = numRight;
  }

  static fromSource(
    source: DictionaryDataSource,
    offset: number,
    numLeft: number,
    numRight: number
  ): ConnectionMatrix {
    const size = numLeft * numRight;
    const byteLength = size * 2;
    if (offset + byteLength > source.byteLength) {
      throw new SudachiError({
        code: "InvalidDictionaryGrammar",
        message: "Invalid grammar"
      }).withContext("connection matrix");
    }

    const bytes = source.slice(offset, byteLength);
    const matrix = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return new ConnectionMatrix(matrix, numLeft, numRight);
  }

  cost(left: number, right: number): number {
    const idx = this.index(left, right);
    if (this.overrides.size > 0) {
      const override = this.overrides.get(idx);
      if (override !== undefined) return override;
    }
    return this.matrix.getInt16(idx * 2, true);
  }

  update(left: number, right: number, value: number): void {
    this.overrides.set(this.index(left, right), value);
  }

  private index(left: number, right: number): number {
    if (left < 0 || left >= this.numLeft || right < 0 || right >= this.numRight) {
      throw SudachiError.invalidRange(left, right);
    }
    return right * this.numLeft + left;
  }
}
