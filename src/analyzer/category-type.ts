/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/category_type.rs
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

type CategoryName =
  | "DEFAULT"
  | "SPACE"
  | "KANJI"
  | "SYMBOL"
  | "NUMERIC"
  | "ALPHA"
  | "HIRAGANA"
  | "KATAKANA"
  | "KANJINUMERIC"
  | "GREEK"
  | "CYRILLIC"
  | "USER1"
  | "USER2"
  | "USER3"
  | "USER4"
  | "NOOOVBOW"
  | "NOOOVBOW2"
  | "ALL";

const categoryEntries: Array<[CategoryName, number]> = [
  ["DEFAULT", 1 << 0],
  ["SPACE", 1 << 1],
  ["KANJI", 1 << 2],
  ["SYMBOL", 1 << 3],
  ["NUMERIC", 1 << 4],
  ["ALPHA", 1 << 5],
  ["HIRAGANA", 1 << 6],
  ["KATAKANA", 1 << 7],
  ["KANJINUMERIC", 1 << 8],
  ["GREEK", 1 << 9],
  ["CYRILLIC", 1 << 10],
  ["USER1", 1 << 11],
  ["USER2", 1 << 12],
  ["USER3", 1 << 13],
  ["USER4", 1 << 14],
  ["NOOOVBOW", 2 ** 30],
  ["NOOOVBOW2", 2 ** 31],
  ["ALL", 0x3fff_ffff]
];

const categoryBitsByName = new Map(categoryEntries);
const displayEntries = categoryEntries.filter(([name]) => name !== "ALL");

export class CategoryType {
  static readonly DEFAULT = new CategoryType(1 << 0);
  static readonly SPACE = new CategoryType(1 << 1);
  static readonly KANJI = new CategoryType(1 << 2);
  static readonly SYMBOL = new CategoryType(1 << 3);
  static readonly NUMERIC = new CategoryType(1 << 4);
  static readonly ALPHA = new CategoryType(1 << 5);
  static readonly HIRAGANA = new CategoryType(1 << 6);
  static readonly KATAKANA = new CategoryType(1 << 7);
  static readonly KANJINUMERIC = new CategoryType(1 << 8);
  static readonly GREEK = new CategoryType(1 << 9);
  static readonly CYRILLIC = new CategoryType(1 << 10);
  static readonly USER1 = new CategoryType(1 << 11);
  static readonly USER2 = new CategoryType(1 << 12);
  static readonly USER3 = new CategoryType(1 << 13);
  static readonly USER4 = new CategoryType(1 << 14);
  static readonly NOOOVBOW = new CategoryType(2 ** 30);
  static readonly NOOOVBOW2 = new CategoryType(2 ** 31);
  static readonly ALL = new CategoryType(0x3fff_ffff);

  readonly bits: number;

  constructor(bits: number) {
    this.bits = bits >>> 0;
  }

  static empty(): CategoryType {
    return new CategoryType(0);
  }

  static all(): CategoryType {
    return CategoryType.ALL;
  }

  static default(): CategoryType {
    return CategoryType.DEFAULT;
  }

  static parse(value: string): CategoryType {
    let bits = 0;
    for (const part of value.split("|")) {
      const name = part.trim() as CategoryName;
      const partBits = categoryBitsByName.get(name);
      if (partBits === undefined) {
        throw SudachiError.invalidCharacterCategoryType(value);
      }
      bits |= partBits;
    }
    return new CategoryType(bits);
  }

  contains(other: CategoryType): boolean {
    return (this.bits & other.bits) === other.bits;
  }

  intersects(other: CategoryType): boolean {
    return (this.bits & other.bits) !== 0;
  }

  isEmpty(): boolean {
    return this.bits === 0;
  }

  and(other: CategoryType): CategoryType {
    return new CategoryType(this.bits & other.bits);
  }

  or(other: CategoryType): CategoryType {
    return new CategoryType(this.bits | other.bits);
  }

  count(): number {
    let bits = this.bits;
    let count = 0;
    while (bits !== 0) {
      bits &= bits - 1;
      count += 1;
    }
    return count;
  }

  *iter(): Iterable<CategoryType> {
    for (const [, bits] of displayEntries) {
      if ((this.bits & bits) === bits) {
        yield new CategoryType(bits);
      }
    }
  }

  equals(other: CategoryType): boolean {
    return this.bits === other.bits;
  }

  toString(): string {
    const names = displayEntries
      .filter(([, bits]) => (this.bits & bits) === bits)
      .map(([name]) => name);
    return names.length === 0 ? "(empty)" : names.join(" | ");
  }
}
