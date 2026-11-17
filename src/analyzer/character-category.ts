/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/character_category.rs
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
import { CategoryType } from "./category-type.js";

export type CharacterCategoryConfig = Record<string, {
  readonly invoke?: boolean;
  readonly group?: boolean;
  readonly length?: number;
  readonly mapping?: string;
}>;

export interface CategoryRange {
  readonly begin: number;
  readonly end: number;
  readonly categories: CategoryType;
  readonly names: readonly string[];
}

export function characterCategoryRanges(
  source: string | CharacterCategoryConfig
): readonly CategoryRange[] {
  return typeof source === "string"
    ? readCharacterDefinition(source)
    : readCharacterCategoryConfig(source);
}

export class CharacterCategory {
  private constructor(
    private readonly boundaries: number[],
    private readonly categories: CategoryType[]
  ) {}

  static default(): CharacterCategory {
    return new CharacterCategory([], [CategoryType.DEFAULT]);
  }

  static fromBytes(bytes: Uint8Array): CharacterCategory {
    return CharacterCategory.fromString(new TextDecoder("utf-8").decode(bytes));
  }

  static fromString(data: string): CharacterCategory {
    return CharacterCategory.compile(readCharacterDefinition(data));
  }

  static fromConfig(data: CharacterCategoryConfig): CharacterCategory {
    return CharacterCategory.compile(readCharacterCategoryConfig(data));
  }

  getCategoryTypes(char: string): CategoryType {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      return CategoryType.DEFAULT;
    }

    if (this.boundaries.length === 0) {
      return CategoryType.DEFAULT;
    }

    const index = binarySearch(this.boundaries, codePoint);
    return index >= 0
      ? this.categories[index + 1] ?? CategoryType.DEFAULT
      : this.categories[~index] ?? CategoryType.DEFAULT;
  }

  private static compile(ranges: readonly CategoryRange[]): CharacterCategory {
    if (ranges.length === 0) {
      return CharacterCategory.default();
    }

    const boundaries = [...new Set(ranges.flatMap((range) => [range.begin, range.end]))].sort(
      (left, right) => left - right
    );
    const categories = Array.from(
      { length: boundaries.length },
      () => CategoryType.empty()
    );

    for (const range of ranges) {
      const start = boundaries.indexOf(range.begin) + 1;
      for (let index = start; index < boundaries.length; index += 1) {
        const boundary = boundaries[index];
        if (boundary === undefined || boundary > range.end) {
          break;
        }
        categories[index] = (categories[index] ?? CategoryType.empty()).or(
          range.categories
        );
      }
    }

    categories[0] = CategoryType.DEFAULT;

    const finalBoundaries: number[] = [];
    const finalCategories: CategoryType[] = [];
    let lastCategory = categories[0] ?? CategoryType.DEFAULT;
    let lastBoundary = boundaries[0] ?? 0;

    for (let index = 1; index < categories.length; index += 1) {
      const category = categories[index] ?? CategoryType.DEFAULT;
      const boundary = boundaries[index] ?? lastBoundary;
      if (category.bits === lastCategory.bits) {
        lastBoundary = boundary;
        continue;
      }

      finalBoundaries.push(lastBoundary);
      finalCategories.push(lastCategory);
      lastCategory = category;
      lastBoundary = boundary;
    }

    finalCategories.push(lastCategory);
    finalBoundaries.push(lastBoundary);

    for (let index = 0; index < finalCategories.length; index += 1) {
      if (finalCategories[index]?.isEmpty()) {
        finalCategories[index] = CategoryType.DEFAULT;
      }
    }
    finalCategories.push(CategoryType.DEFAULT);

    return new CharacterCategory(finalBoundaries, finalCategories);
  }
}

function readCharacterCategoryConfig(data: CharacterCategoryConfig): CategoryRange[] {
  const ranges: CategoryRange[] = [];
  for (const [categoryName, config] of Object.entries(data)) {
    const mapping = typeof config.mapping === "string" ? config.mapping.trim() : "";
    if (mapping.length === 0) {
      continue;
    }
    let categories: CategoryType;
    try {
      categories = CategoryType.parse(categoryName);
    } catch {
      throw invalidCharacterCategory(`Invalid type ${categoryName}`);
    }
    for (const part of mapping.split(",")) {
      const range = part.trim();
      if (range.length === 0) {
        continue;
      }
      const [beginRaw, endRaw] = range.split("-");
      const begin = parseHexCodePoint(beginRaw, categoryName);
      const endInclusive = endRaw === undefined
        ? begin
        : parseHexCodePoint(endRaw, categoryName);
      const end = endInclusive + 1;
      if (begin >= end || !isValidCodePoint(begin) || end > 0x11_0000) {
        throw invalidCharacterCategory(`Invalid mapping ${range} for ${categoryName}`);
      }
      ranges.push({ begin, end, categories, names: [categoryName] });
    }
  }
  return ranges;
}

function readCharacterDefinition(data: string): CategoryRange[] {
  const ranges: CategoryRange[] = [];
  const lines = data.split(/\r?\n/u);

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || !line.startsWith("0x")) {
      continue;
    }

    const columns = line.split(/\s+/u);
    const rangeColumn = columns[0];
    if (rangeColumn === undefined || columns.length < 2) {
      throw invalidCharacterCategory(`Invalid format at line ${index}`);
    }

    const [beginRaw, endRaw] = rangeColumn.split("..");
    const begin = parseCodePoint(beginRaw, index);
    const end = endRaw === undefined ? begin + 1 : parseCodePoint(endRaw, index) + 1;
    if (begin >= end || !isValidCodePoint(begin) || end > 0x11_0000) {
      throw invalidCharacterCategory(`Invalid format at line ${index}`);
    }

    let categories = CategoryType.empty();
    const names: string[] = [];
    for (const token of columns.slice(1)) {
      if (token.startsWith("#")) {
        break;
      }
      try {
        categories = categories.or(CategoryType.parse(token));
      } catch {
        throw invalidCharacterCategory(`Invalid type ${token} at line ${index}`);
      }
      names.push(token);
    }

    ranges.push({ begin, end, categories, names });
  }

  return ranges;
}

function parseCodePoint(value: string | undefined, line: number): number {
  if (value === undefined || !value.startsWith("0x")) {
    throw invalidCharacterCategory(`Invalid format at line ${line}`);
  }
  const codePoint = Number.parseInt(value.slice(2), 16);
  if (!Number.isFinite(codePoint)) {
    throw invalidCharacterCategory(`Invalid format at line ${line}`);
  }
  return codePoint;
}

function parseHexCodePoint(value: string | undefined, categoryName: string): number {
  if (value === undefined || !/^[0-9a-f]+$/iu.test(value)) {
    throw invalidCharacterCategory(`Invalid mapping for ${categoryName}`);
  }
  const codePoint = Number.parseInt(value, 16);
  if (!Number.isFinite(codePoint)) {
    throw invalidCharacterCategory(`Invalid mapping for ${categoryName}`);
  }
  return codePoint;
}

function isValidCodePoint(codePoint: number): boolean {
  return codePoint >= 0 && codePoint <= 0x10_ffff;
}

function binarySearch(values: readonly number[], query: number): number {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const value = values[mid] ?? 0;
    if (value === query) return mid;
    if (value < query) low = mid + 1;
    else high = mid - 1;
  }
  return ~low;
}

function invalidCharacterCategory(message: string): SudachiError {
  return new SudachiError({
    code: "InvalidCharacterCategory",
    message: `Invalid character category definition: ${message}`
  });
}
