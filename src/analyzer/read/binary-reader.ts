/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/read/u16str.rs
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
import { SudachiError } from "../error.js";

export class BinaryReader {
  readonly bytes: Uint8Array;
  private readonly view: DataView;
  offset: number;

  constructor(bytes: Uint8Array, offset = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.offset = offset;
  }

  remaining(): number {
    return this.bytes.byteLength - this.offset;
  }

  readUint8(): number {
    this.ensure(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readInt16(): number {
    this.ensure(2);
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint16(): number {
    this.ensure(2);
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint32(): number {
    this.ensure(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readInt32(): number {
    this.ensure(4);
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint64(): bigint {
    this.ensure(8);
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readBytes(length: number): Uint8Array {
    if (!Number.isInteger(length) || length < 0) {
      throw new SudachiError({
        code: "InvalidRange",
        message: `Invalid range: ${this.offset}..${this.offset + length}`
      });
    }
    this.ensure(length);
    const start = this.offset;
    this.offset += length;
    return this.bytes.subarray(start, this.offset);
  }

  readStringLength(): number {
    const length = this.readUint8();
    if (length < 128) {
      return length;
    }
    const low = this.readUint8();
    return ((length & 0x7f) << 8) | low;
  }

  private ensure(length: number): void {
    if (this.remaining() < length) {
      throw new SudachiError({
        code: "NomParseError",
        message: `Unexpected end of input at ${this.offset}, need ${length} bytes`
      });
    }
  }
}
