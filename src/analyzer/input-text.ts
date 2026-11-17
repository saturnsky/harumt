/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/input_text/buffer/
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
import { CategoryType } from "./category-type.js";
import { Grammar } from "./grammar.js";
import { SudachiError } from "./error.js";

const MAX_LENGTH = Math.floor(0xffff / 4) * 3;
const utf8Encoder = new TextEncoder();

export class InputBuffer {
  private originalValue = "";
  private modifiedValue = "";
  private modChars: string[] = [];
  private modCharToByte: number[] = [];
  private modByteToChar: number[] = [];
  private modByteToStringIndex: number[] = [];
  private origByteToStringIndex: number[] = [];
  private origByteToCharIndex: number[] = [];
  private modifiedToOriginal: number[] = [];
  private modBow: boolean[] = [];
  private modCategories: CategoryType[] = [];
  private modCategoryContinuity: number[] = [];
  private deletedRuns: DeletedRun[] = [];
  private modBarrierPrefix: number[] = [];
  private modNextBarrier: number[] = [];
  private modBondExemptBarrier: Set<number> = new Set();
  private barrierContract: WhitespaceBarrierContract | null = null;
  private bondExemptLeftChar: RegExp | null = null;

  static from(text: string): InputBuffer {
    const buffer = new InputBuffer();
    buffer.reset(text);
    buffer.startBuild();
    return buffer;
  }

  reset(text = ""): void {
    this.originalValue = text;
    this.modifiedValue = "";
    this.modChars = [];
    this.modCharToByte = [];
    this.modByteToChar = [];
    this.modByteToStringIndex = [];
    this.origByteToStringIndex = [];
    this.origByteToCharIndex = [];
    this.modBow = [];
    this.modCategories = [];
    this.modCategoryContinuity = [];
    this.modifiedToOriginal = [];
    this.deletedRuns = [];
    this.modBarrierPrefix = [];
    this.modNextBarrier = [];
    this.modBondExemptBarrier = new Set();
    this.barrierContract = null;
    this.bondExemptLeftChar = null;
  }

  recordDeletedRun(run: DeletedRun): void {
    this.deletedRuns.push(run);
  }

  setBarrierContract(contract: WhitespaceBarrierContract | null): void {
    this.barrierContract = contract;
    this.bondExemptLeftChar = contract === null || contract.bondExemptLeftCharClasses.length === 0
      ? null
      : new RegExp(
        `^[${contract.bondExemptLeftCharClasses.map((name) => `\\p{${name}}`).join("")}]$`,
        "u"
      );
  }

  startBuild(): void {
    const byteLength = utf8Encoder.encode(this.originalValue).byteLength;
    if (byteLength > MAX_LENGTH) {
      throw SudachiError.inputTooLong(byteLength, MAX_LENGTH);
    }
    this.modifiedValue = this.originalValue;
    this.modifiedToOriginal = Array.from({ length: byteLength + 1 }, (_, index) => index);
  }

  withEditor(callback: (buffer: InputBuffer, editor: InputEditor) => void): void {
    const editor = new InputEditor();
    callback(this, editor);
    this.commitEdits(editor.operations);
  }

  build(grammar: Grammar): void {
    this.modChars = [];
    this.modCharToByte = [];
    this.modByteToChar = [];
    this.modByteToStringIndex = [];
    this.origByteToStringIndex = buildByteToStringIndex(this.originalValue);
    this.origByteToCharIndex = buildByteToCharIndex(this.originalValue);
    this.deletedRuns.sort((left, right) => left.origStartByte - right.origStartByte);
    this.modBow = [];
    this.modCategories = [];

    const nonStarting = CategoryType.ALPHA.or(CategoryType.GREEK).or(
      CategoryType.CYRILLIC
    );
    let prevCategory = CategoryType.empty();
    let nextBow = true;
    let byteOffset = 0;
    let charIndex = 0;
    let stringIndex = 0;

    for (const char of this.modifiedValue) {
      const charByteLength = utf8Encoder.encode(char).byteLength;
      this.modChars.push(char);
      this.modCharToByte.push(byteOffset);
      const category = grammar.characterCategory.getCategoryTypes(char);
      this.modCategories.push(category);

      for (let index = 0; index < charByteLength; index += 1) {
        this.modByteToChar[byteOffset + index] = charIndex;
        this.modByteToStringIndex[byteOffset + index] = stringIndex;
      }

      const canBow = !nextBow
        ? false
        : category.intersects(CategoryType.NOOOVBOW2)
          ? false
          : category.intersects(CategoryType.NOOOVBOW)
            ? false
            : category.intersects(nonStarting)
              ? !category.intersects(prevCategory)
              : true;

      this.modBow[byteOffset] = canBow;
      if (!nextBow) {
        nextBow = true;
      } else if (category.intersects(CategoryType.NOOOVBOW2)) {
        nextBow = false;
      }

      prevCategory = category;
      byteOffset += charByteLength;
      stringIndex += char.length;
      charIndex += 1;
    }

    this.modCharToByte.push(byteOffset);
    this.modByteToChar.push(charIndex);
    this.modByteToStringIndex.push(this.modifiedValue.length);
    this.fillCategoryContinuity();
    this.fillBarrierPrefix();
  }

  private fillBarrierPrefix(): void {
    const barrierEnds = new Map<number, boolean>();
    for (const run of this.deletedRuns) {
      if (run.barrier) {
        barrierEnds.set(run.origEndByte, run.bondExempt);
      }
    }
    const length = this.modChars.length;
    this.modBarrierPrefix = Array(length + 1).fill(0) as number[];
    this.modNextBarrier = Array(length + 1).fill(length) as number[];
    this.modBondExemptBarrier = new Set();
    if (barrierEnds.size === 0) {
      return;
    }
    for (let index = 0; index < length; index += 1) {
      const byteOffset = this.modCharToByte[index] ?? 0;
      const originalByte = this.modifiedToOriginal[byteOffset];
      const isBarrier = index > 0 &&
        originalByte !== undefined &&
        barrierEnds.has(originalByte);
      if (isBarrier && originalByte !== undefined && barrierEnds.get(originalByte) === true) {
        this.modBondExemptBarrier.add(index);
      }
      this.modBarrierPrefix[index + 1] = (this.modBarrierPrefix[index] ?? 0) + (isBarrier ? 1 : 0);
      if (isBarrier) {
        this.modBow[byteOffset] = true;
      }
    }
    let next = length;
    for (let index = length; index >= 0; index -= 1) {
      this.modNextBarrier[index] = next;
      if (index > 0 && (this.modBarrierPrefix[index + 1] ?? 0) > (this.modBarrierPrefix[index] ?? 0)) {
        next = index;
      }
    }
  }

  hasBarrierBefore(charIndex: number): boolean {
    if (this.modBarrierPrefix.length === 0 || charIndex <= 0) {
      return false;
    }
    const upper = this.modBarrierPrefix[charIndex + 1];
    const lower = this.modBarrierPrefix[charIndex];
    return upper !== undefined && lower !== undefined && upper > lower;
  }

  barrierAtCurrentByte(byteOffset: number): boolean {
    if (this.deletedRuns.length === 0) {
      return false;
    }
    const originalByte = this.modifiedToOriginal[byteOffset];
    if (originalByte === undefined) {
      return false;
    }
    return this.deletedRuns.some((run) => run.barrier && run.origEndByte === originalByte);
  }

  barrierRefusesEdge(beginChar: number, rightPos0: string, left: BarrierLeftMaterial): boolean {
    const contract = this.barrierContract;
    if (contract === null || !this.hasBarrierBefore(beginChar)) {
      return false;
    }
    if (contract.boundLeftPos0.has(left.pos0)) {
      return true;
    }
    if (contract.boundRightSuffixPos0.has(rightPos0)) {
      return !this.bondExemptLeftEdge(beginChar);
    }
    return contract.boundRightInflectionPos0.has(rightPos0) &&
      contract.inflectionHostForms.has(left.inflectionForm);
  }

  private bondExemptLeftEdge(beginChar: number): boolean {
    if (!this.modBondExemptBarrier.has(beginChar)) {
      return false;
    }
    const pattern = this.bondExemptLeftChar;
    const left = this.modChars[beginChar - 1];
    return pattern !== null && left !== undefined && pattern.test(left);
  }

  barrierGuardsEdgeAt(beginChar: number): boolean {
    return this.barrierContract !== null && this.hasBarrierBefore(beginChar);
  }

  crossesBarrier(beginChar: number, endChar: number): boolean {
    if (this.modBarrierPrefix.length === 0 || endChar <= beginChar + 1) {
      return false;
    }
    const upper = this.modBarrierPrefix[endChar] ?? this.modBarrierPrefix.at(-1) ?? 0;
    const lower = this.modBarrierPrefix[beginChar + 1] ?? this.modBarrierPrefix.at(-1) ?? 0;
    return upper > lower;
  }

  barrierLimitFrom(charIndex: number): number {
    const length = this.modChars.length;
    if (charIndex < 0 || charIndex >= length) {
      return length;
    }
    return this.modNextBarrier[charIndex] ?? length;
  }

  origSliceExcludingDeleted(startByte: number, endByte: number): string {
    const [start, end] = this.toOrig(startByte, endByte);
    if (this.deletedRuns.length === 0) {
      return this.origSliceBytes(start, end);
    }
    let cursor = start;
    let result = "";
    for (let index = this.firstRunEndingAfter(start); index < this.deletedRuns.length; index += 1) {
      const run = this.deletedRuns[index]!;
      if (run.origStartByte >= end) {
        break;
      }
      if (run.origEndByte <= cursor) {
        continue;
      }
      result += this.origSliceBytes(cursor, Math.min(run.origStartByte, end));
      cursor = Math.max(cursor, run.origEndByte);
    }
    if (cursor < end) {
      result += this.origSliceBytes(cursor, end);
    }
    return result;
  }

  private firstRunEndingAfter(byte: number): number {
    let low = 0;
    let high = this.deletedRuns.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((this.deletedRuns[mid]?.origEndByte ?? 0) > byte) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  private runEndingAt(byte: number): DeletedRun | undefined {
    const index = this.firstRunEndingAfter(byte - 1);
    const run = this.deletedRuns[index];
    return run !== undefined && run.origEndByte === byte ? run : undefined;
  }

  private runStartingAt(byte: number): DeletedRun | undefined {
    let low = 0;
    let high = this.deletedRuns.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((this.deletedRuns[mid]?.origStartByte ?? 0) >= byte) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const run = this.deletedRuns[low];
    return run !== undefined && run.origStartByte === byte ? run : undefined;
  }

  origByteSpanTrimmed(startByte: number, endByte: number): readonly [number, number] {
    let [start, end] = this.toOrig(startByte, endByte);
    if (this.deletedRuns.length === 0) {
      return [start, end];
    }
    for (;;) {
      const trailing = this.runEndingAt(end);
      if (trailing === undefined || trailing.origStartByte < start) {
        break;
      }
      end = trailing.origStartByte;
    }
    for (;;) {
      const leading = this.runStartingAt(start);
      if (leading === undefined || leading.origEndByte > end) {
        break;
      }
      start = leading.origEndByte;
    }
    return [start, end];
  }

  private origSliceBytes(startByte: number, endByte: number): string {
    const index =
      this.origByteToStringIndex.length === 0
        ? buildByteToStringIndex(this.originalValue)
        : this.origByteToStringIndex;
    return sliceByByte(this.originalValue, index, startByte, endByte);
  }

  origCharIndexAt(byteOffset: number): number {
    const index = this.origByteToCharIndex.length === 0
      ? buildByteToCharIndex(this.originalValue)
      : this.origByteToCharIndex;
    return index[byteOffset] ?? index.at(-1) ?? 0;
  }

  original(): string {
    return this.originalValue;
  }

  current(): string {
    return this.modifiedValue;
  }

  currentChars(): readonly string[] {
    return this.modChars;
  }

  currByteOffsets(): readonly number[] {
    return this.modCharToByte.slice(0, -1);
  }

  currSliceC(start: number, end: number): string {
    return this.currSlice(this.modCharToByte[start] ?? 0, this.modCharToByte[end] ?? 0);
  }

  origSlice(startByte: number, endByte: number): string {
    const [start, end] = this.toOrig(startByte, endByte);
    const index =
      this.origByteToStringIndex.length === 0
        ? buildByteToStringIndex(this.originalValue)
        : this.origByteToStringIndex;
    return sliceByByte(this.originalValue, index, start, end);
  }

  currSlice(startByte: number, endByte: number): string {
    return sliceByByte(this.modifiedValue, this.modByteToStringIndex, startByte, endByte);
  }

  toOrig(startByte: number, endByte: number): readonly [number, number] {
    return [
      this.modifiedToOriginal[startByte] ?? this.originalByteLength(),
      this.modifiedToOriginal[endByte] ?? this.originalByteLength()
    ];
  }

  chIdx(byteOffset: number): number {
    return this.modByteToChar[byteOffset] ?? this.modChars.length;
  }

  getOriginalIndex(byteOffset: number): number {
    return this.modifiedToOriginal[byteOffset] ?? this.originalByteLength();
  }

  toCurrByteIdx(charIndex: number): number {
    return this.modCharToByte[charIndex] ?? this.modCharToByte.at(-1) ?? 0;
  }

  canBow(byteOffset: number): boolean {
    return this.modBow[byteOffset] ?? false;
  }

  catAtChar(offset: number): CategoryType {
    return this.modCategories[offset] ?? CategoryType.DEFAULT;
  }

  catOfRange(start: number, end: number): CategoryType {
    if (start >= end) {
      return CategoryType.empty();
    }
    let category = CategoryType.all();
    for (let index = start; index < end; index += 1) {
      category = category.and(this.catAtChar(index));
    }
    return category;
  }

  catContinuousLen(offset: number): number {
    return this.modCategoryContinuity[offset] ?? 0;
  }

  charDistance(index: number, offset: number): number {
    return Math.min(index + offset, this.modChars.length) - index;
  }

  getWordCandidateLength(charIndex: number): number {
    for (let index = charIndex + 1; index < this.modChars.length; index += 1) {
      const byteIndex = this.modCharToByte[index] ?? 0;
      if (this.canBow(byteIndex)) {
        return index - charIndex;
      }
    }
    return this.modChars.length - charIndex;
  }

  private fillCategoryContinuity(): void {
    if (this.modCategories.length === 0) {
      return;
    }
    this.modCategoryContinuity = Array(this.modCategories.length).fill(1);
    let category = this.modCategories.at(-1) ?? CategoryType.all();
    for (let index = this.modCategories.length - 2; index >= 0; index -= 1) {
      const current = this.modCategories[index] ?? CategoryType.DEFAULT;
      const common = current.and(category);
      if (!common.isEmpty()) {
        this.modCategoryContinuity[index] =
          (this.modCategoryContinuity[index + 1] ?? 0) + 1;
        category = common;
      } else {
        category = current;
      }
    }
  }

  private originalByteLength(): number {
    return this.origByteToStringIndex.length - 1;
  }

  private commitEdits(operations: readonly ReplaceOperation[]): void {
    if (operations.length === 0) {
      return;
    }

    const source = this.modifiedValue;
    const sourceMapping = this.modifiedToOriginal;
    const sourceByteToStringIndex = buildByteToStringIndex(source);
    let sourceByteStart = 0;
    let target = "";
    const targetMapping: number[] = [];

    for (const operation of operations) {
      target += sliceByByte(
        source,
        sourceByteToStringIndex,
        sourceByteStart,
        operation.start
      );
      targetMapping.push(...sourceMapping.slice(sourceByteStart, operation.start));
      addReplacementMapping(
        targetMapping,
        sourceMapping,
        operation.start,
        operation.end,
        operation.replacement
      );
      target += operation.replacement;
      sourceByteStart = operation.end;
    }

    target += sliceByByte(
      source,
      sourceByteToStringIndex,
      sourceByteStart,
      sourceMapping.length - 1
    );
    targetMapping.push(...sourceMapping.slice(sourceByteStart));
    if (targetMapping.length > 0) {
      targetMapping[0] = 0;
    }

    this.modifiedValue = target;
    this.modifiedToOriginal = targetMapping;
  }
}

export interface WhitespaceBarrierContract {
  readonly boundLeftPos0: ReadonlySet<string>;
  readonly boundRightSuffixPos0: ReadonlySet<string>;
  readonly boundRightInflectionPos0: ReadonlySet<string>;
  readonly inflectionHostForms: ReadonlySet<string>;
  readonly bondExemptLeftCharClasses: readonly string[];
}

export interface BarrierLeftMaterial {
  readonly pos0: string;
  readonly inflectionForm: string;
}

export interface DeletedRun {
  readonly origStartByte: number;
  readonly origEndByte: number;
  readonly barrier: boolean;
  readonly bondExempt: boolean;
}

interface ReplaceOperation {
  readonly start: number;
  readonly end: number;
  readonly replacement: string;
}

export class InputEditor {
  readonly operations: ReplaceOperation[] = [];

  replaceRef(start: number, end: number, replacement: string): void {
    this.operations.push({ start, end, replacement });
  }

  replaceChar(start: number, end: number, replacement: string): void {
    this.operations.push({ start, end, replacement });
  }

  replaceOwn(start: number, end: number, replacement: string): void {
    this.operations.push({ start, end, replacement });
  }
}

function buildByteToCharIndex(text: string): number[] {
  const result: number[] = [];
  let byteOffset = 0;
  let charIndex = 0;
  for (const char of text) {
    const byteLength = utf8Encoder.encode(char).byteLength;
    for (let index = 0; index < byteLength; index += 1) {
      result[byteOffset + index] = charIndex;
    }
    byteOffset += byteLength;
    charIndex += 1;
  }
  result[byteOffset] = charIndex;
  return result;
}

function buildByteToStringIndex(text: string): number[] {
  const result: number[] = [];
  let byteOffset = 0;
  let stringIndex = 0;
  for (const char of text) {
    const byteLength = utf8Encoder.encode(char).byteLength;
    for (let index = 0; index < byteLength; index += 1) {
      result[byteOffset + index] = stringIndex;
    }
    byteOffset += byteLength;
    stringIndex += char.length;
  }
  result[byteOffset] = text.length;
  return result;
}

function sliceByByte(
  text: string,
  byteToStringIndex: readonly number[],
  startByte: number,
  endByte: number
): string {
  const start = byteToStringIndex[startByte] ?? text.length;
  const end = byteToStringIndex[endByte] ?? text.length;
  return text.slice(start, end);
}

function addReplacementMapping(
  targetMapping: number[],
  sourceMapping: readonly number[],
  start: number,
  end: number,
  replacement: string
): void {
  const replacementLength = utf8Encoder.encode(replacement).byteLength;
  if (replacementLength === 0) {
    return;
  }

  targetMapping.push(sourceMapping[start] ?? 0);
  const originalEnd = sourceMapping[end] ?? sourceMapping.at(-1) ?? 0;
  for (let index = 1; index < replacementLength; index += 1) {
    targetMapping.push(originalEnd);
  }
}
