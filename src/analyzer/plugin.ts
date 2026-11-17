/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/plugin/input_text/, plugin/path_rewrite/
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
import { Morpheme, MorphemeList } from "./morpheme.js";
import { CategoryType } from "./category-type.js";
import { CharacterCategory } from "./character-category.js";
import { WordInfo, type WordInfoData } from "./word-info.js";
import { WordId } from "./word-id.js";
import type { Dictionary } from "./dictionary.js";
import { SudachiError } from "./error.js";
import { InputBuffer, type WhitespaceBarrierContract } from "./input-text.js";
import {
  NumericParser,
  NumericParserError
} from "./numeric-parser.js";

export interface InputTextPlugin {
  readonly kind: "inputText";
  rewrite(input: InputBuffer): void;
}

export interface PathRewritePlugin {
  readonly kind: "pathRewrite";
  rewrite(path: MorphemeList, input?: InputBuffer): MorphemeList;
}

const utf8Encoder = new TextEncoder();
const numericCategory = CategoryType.NUMERIC.or(CategoryType.KANJINUMERIC);

const WHITE_SPACE = /\p{White_Space}/u;

function wouldCreateWhitespace(source: string, result: string): boolean {
  return !WHITE_SPACE.test(source) && WHITE_SPACE.test(result);
}

export class DefaultInputTextPlugin implements InputTextPlugin {
  readonly kind = "inputText" as const;
  private readonly ignoreNormalize = new Set<string>();
  private readonly replacements = new Map<string, string>();
  private readonly replacementKeys: string[] = [];

  static fromRewriteText(text: string): DefaultInputTextPlugin {
    const plugin = new DefaultInputTextPlugin();
    plugin.readRewriteLists(text);
    return plugin;
  }

  static fromConfig(config: {
    readonly ignoreNormalize?: readonly string[];
    readonly replaceChars?: Readonly<Record<string, string>>;
  }): DefaultInputTextPlugin {
    const plugin = new DefaultInputTextPlugin();
    for (const value of config.ignoreNormalize ?? []) {
      if ([...value].length !== 1) {
        throw SudachiError.invalidDataFormat(0, `${value} is not character`);
      }
      plugin.ignoreNormalize.add(value);
    }
    for (const [from, to] of Object.entries(config.replaceChars ?? {})) {
      plugin.replacements.set(from, to);
    }
    plugin.refreshReplacementKeys();
    return plugin;
  }

  whitespaceCreatingReplacements(): readonly (readonly [from: string, to: string])[] {
    return [...this.replacements].filter(([from, to]) => wouldCreateWhitespace(from, to));
  }

  readRewriteLists(data: string): void {
    for (const [lineIndex, rawLine] of data.split(/\r?\n/u).entries()) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("#")) {
        continue;
      }
      const columns = line.split(/\s+/u);
      if (columns.length === 1) {
        const value = columns[0];
        if (value === undefined || [...value].length !== 1) {
          throw SudachiError.invalidDataFormat(lineIndex, `${value} is not character`);
        }
        this.ignoreNormalize.add(value);
        continue;
      }
      if (columns.length === 2) {
        const [from, to] = columns;
        if (from === undefined || to === undefined) {
          throw SudachiError.invalidDataFormat(lineIndex, "");
        }
        if (this.replacements.has(from)) {
          throw SudachiError.invalidDataFormat(lineIndex, `${from} is already defined`);
        }
        this.replacements.set(from, to);
        continue;
      }
      throw SudachiError.invalidDataFormat(lineIndex, "");
    }

    this.refreshReplacementKeys();
  }

  rewrite(input: InputBuffer): void {
    const current = input.current();
    const byteOffsets = byteOffsetsByStringIndex(current);
    input.withEditor((_, editor) => {
      for (let stringIndex = 0; stringIndex < current.length; ) {
        const candidate = this.findReplacement(current, stringIndex);
        const forced = candidate !== undefined && barrierInsideRange(
          input, byteOffsets, stringIndex, stringIndex + candidate[0].length
        )
          ? undefined
          : candidate;
        if (forced !== undefined) {
          const [from, to] = forced;
          editor.replaceRef(
            byteOffsets.get(stringIndex) ?? 0,
            byteOffsets.get(stringIndex + from.length) ?? 0,
            to
          );
          stringIndex += from.length;
          continue;
        }

        const codePoint = current.codePointAt(stringIndex);
        const char =
          codePoint === undefined
            ? current[stringIndex] ?? ""
            : String.fromCodePoint(codePoint);
        const lower = char.toLocaleLowerCase();
        const normalized = this.ignoreNormalize.has(char)
          ? lower
          : lower.normalize("NFKC");
        if (normalized !== char && !wouldCreateWhitespace(char, normalized)) {
          editor.replaceRef(
            byteOffsets.get(stringIndex) ?? 0,
            byteOffsets.get(stringIndex + char.length) ?? 0,
            normalized
          );
        }
        stringIndex += char.length;
      }
    });
  }

  private findReplacement(
    current: string,
    stringIndex: number
  ): readonly [string, string] | undefined {
    for (const key of this.replacementKeys) {
      if (current.startsWith(key, stringIndex)) {
        return [key, this.replacements.get(key) ?? ""];
      }
    }
    return undefined;
  }

  private refreshReplacementKeys(): void {
    this.replacementKeys.splice(
      0,
      this.replacementKeys.length,
      ...[...this.replacements.keys()].sort(
        (left, right) => right.length - left.length
      )
    );
  }
}



export interface WhitespaceRunDeletion {
  readonly start: number;
  readonly end: number;
  readonly barrier: boolean;
  readonly bondExempt: boolean;
}

export class WhitespaceInputTextPlugin implements InputTextPlugin {
  readonly kind = "inputText" as const;

  constructor(
    private readonly deletions: readonly WhitespaceRunDeletion[],
    private readonly barrierContract: WhitespaceBarrierContract | null = null
  ) {}

  rewrite(input: InputBuffer): void {
    input.setBarrierContract(this.barrierContract);
    if (this.deletions.length === 0) {
      return;
    }
    const byteOffsets = codepointByteOffsets(input.current());
    input.withEditor((buffer, editor) => {
      for (const deletion of this.deletions) {
        const startByte = byteOffsets[deletion.start];
        const endByte = byteOffsets[deletion.end];
        if (startByte === undefined || endByte === undefined || endByte <= startByte) {
          continue;
        }
        editor.replaceRef(startByte, endByte, "");
        buffer.recordDeletedRun({
          origStartByte: startByte,
          origEndByte: endByte,
          barrier: deletion.barrier,
          bondExempt: deletion.bondExempt
        });
      }
    });
  }
}

function codepointByteOffsets(text: string): number[] {
  const offsets: number[] = [];
  let byteOffset = 0;
  for (const char of text) {
    offsets.push(byteOffset);
    byteOffset += utf8Encoder.encode(char).byteLength;
  }
  offsets.push(byteOffset);
  return offsets;
}

export class ProlongedSoundMarkPlugin implements InputTextPlugin {
  readonly kind = "inputText" as const;
  private readonly marks: Set<string>;

  constructor(
    marks: readonly string[] = ["ー", "-", "⁓", "〜", "〰"],
    private readonly replacement = "ー"
  ) {
    this.marks = new Set(marks);
  }

  rewrite(input: InputBuffer): void {
    const current = input.current();
    const byteOffsets = byteOffsetsByStringIndex(current);
    input.withEditor((_, editor) => {
      let runStart: number | undefined;
      let runLength = 0;
      for (let stringIndex = 0; stringIndex < current.length; ) {
        const codePoint = current.codePointAt(stringIndex);
        const char =
          codePoint === undefined
            ? current[stringIndex] ?? ""
            : String.fromCodePoint(codePoint);
        if (runStart !== undefined && input.barrierAtCurrentByte(byteOffsets.get(stringIndex) ?? 0)) {
          if (runLength >= 2) {
            editor.replaceRef(
              byteOffsets.get(runStart) ?? 0,
              byteOffsets.get(stringIndex) ?? 0,
              this.replacement
            );
          }
          runStart = undefined;
          runLength = 0;
        }
        if (this.marks.has(char)) {
          runStart ??= stringIndex;
          runLength += 1;
        } else {
          if (runStart !== undefined && runLength >= 2) {
            editor.replaceRef(
              byteOffsets.get(runStart) ?? 0,
              byteOffsets.get(stringIndex) ?? 0,
              this.replacement
            );
          }
          runStart = undefined;
          runLength = 0;
        }
        stringIndex += char.length;
      }
      if (runStart !== undefined && runLength >= 2) {
        editor.replaceRef(
          byteOffsets.get(runStart) ?? 0,
          byteOffsets.get(current.length) ?? 0,
          this.replacement
        );
      }
    });
  }
}

export class JoinNumericPlugin implements PathRewritePlugin {
  readonly kind = "pathRewrite" as const;

  constructor(
    private readonly numericPosId: number,
    private readonly enableNormalize = true
  ) {}

  rewrite(path: MorphemeList, input?: InputBuffer): MorphemeList {
    let rewritten = [...path];
    let beginIdx = -1;
    let commaAsDigit = true;
    let periodAsDigit = true;
    const parser = new NumericParser();
    const rewriteInput = input ?? path.input ?? inputFromPath(path);
    let i = -1;

    while (i < rewritten.length - 1) {
      i += 1;
      const morpheme = rewritten[i];
      if (morpheme === undefined) {
        continue;
      }
      const normalized = morpheme.normalizedForm();
      const category = rewriteInput.catOfRange(
        morpheme.currentBeginC,
        morpheme.currentEndC
      );
      if (
        category.intersects(numericCategory) ||
        (commaAsDigit && normalized === ",") ||
        (periodAsDigit && normalized === ".")
      ) {
        if (beginIdx < 0) {
          parser.clear();
          beginIdx = i;
        }
        for (const char of normalized) {
          if (!parser.append(char)) {
            if (beginIdx >= 0) {
              if (parser.errorState === NumericParserError.Comma) {
                commaAsDigit = false;
                i = beginIdx - 1;
              } else if (parser.errorState === NumericParserError.Point) {
                periodAsDigit = false;
                i = beginIdx - 1;
              }
              beginIdx = -1;
            }
            break;
          }
        }
        continue;
      }

      const asciiChar = normalized.length === 1 && normalized.charCodeAt(0) <= 0x7f
        ? normalized
        : "\uffff";
      if (beginIdx >= 0) {
        if (parser.done()) {
          rewritten = this.concat(path.dictionary, rewritten, beginIdx, i, parser, path.input);
          i = beginIdx + 1;
        } else {
          const previous = rewritten[i - 1]?.normalizedForm();
          if (
            (parser.errorState === NumericParserError.Comma && previous === ",") ||
            (parser.errorState === NumericParserError.Point && previous === ".")
          ) {
            rewritten = this.concat(path.dictionary, rewritten, beginIdx, i - 1, parser, path.input);
            i = beginIdx + 2;
          }
        }
      }
      beginIdx = -1;
      if (!commaAsDigit && asciiChar !== ",") {
        commaAsDigit = true;
      }
      if (!periodAsDigit && asciiChar !== ".") {
        periodAsDigit = true;
      }
    }

    if (beginIdx >= 0) {
      const len = rewritten.length;
      if (parser.done()) {
        rewritten = this.concat(path.dictionary, rewritten, beginIdx, len, parser, path.input);
      } else {
        const previous = rewritten[len - 1]?.normalizedForm();
        if (
          (parser.errorState === NumericParserError.Comma && previous === ",") ||
          (parser.errorState === NumericParserError.Point && previous === ".")
        ) {
          rewritten = this.concat(path.dictionary, rewritten, beginIdx, len - 1, parser, path.input);
        }
      }
    }

    return new MorphemeList(path.dictionary, rewritten, path.input);
  }

  private concat(
    dictionary: Dictionary,
    path: Morpheme[],
    begin: number,
    end: number,
    parser: NumericParser,
    input?: InputBuffer
  ): Morpheme[] {
    const first = path[begin];
    const last = path[end - 1];
    if (
      first === undefined ||
      last === undefined ||
      first.partOfSpeechId() !== this.numericPosId ||
      end <= begin
    ) {
      return path;
    }

    const surface = path
      .slice(begin, end)
      .map((morpheme) => morpheme.surface())
      .join("");
    const normalized = this.enableNormalize
      ? parser.getNormalized()
      : first.normalizedForm();
    if (
      end - begin === 1 &&
      (!this.enableNormalize || normalized === first.normalizedForm())
    ) {
      return path;
    }

    const infoData: WordInfoData = {
      surface,
      headWordLength: last.currentEndBytes - first.currentBeginBytes,
      posId: first.partOfSpeechId(),
      normalizedForm: normalized,
      dictionaryFormWordId: -1,
      dictionaryForm: surface,
      readingForm: path
        .slice(begin, end)
        .map((morpheme) => morpheme.readingForm())
        .join(""),
      aUnitSplit: [],
      bUnitSplit: [],
      wordStructure: [],
      synonymGroupIds: []
    };
    const joined = new Morpheme(
      dictionary,
      first.wordId(),
      new WordInfo(infoData),
      first.currentBeginC,
      last.currentEndC,
      first.currentBeginBytes,
      last.currentEndBytes,
      undefined,
      input
    );
    return [...path.slice(0, begin), joined, ...path.slice(end)];
  }
}

export class JoinKatakanaOovPlugin implements PathRewritePlugin {
  readonly kind = "pathRewrite" as const;

  constructor(
    private readonly oovPosId: number,
    private readonly minLength = 3
  ) {}

  rewrite(path: MorphemeList, input?: InputBuffer): MorphemeList {
    const rewriteInput = input ?? inputFromPath(path);
    let rewritten = [...path];
    let i = 0;
    while (i < rewritten.length) {
      const morpheme = rewritten[i];
      if (
        morpheme === undefined ||
        (!(morpheme.isOov() || this.isShorter(morpheme)) ||
          !this.isKatakanaNode(rewriteInput, morpheme))
      ) {
        i += 1;
        continue;
      }

      let begin = i - 1;
      while (begin >= 0) {
        const current = rewritten[begin];
        if (
          current === undefined ||
          !this.isKatakanaNode(rewriteInput, current)
        ) {
          begin += 1;
          break;
        }
        begin -= 1;
      }
      if (begin < 0) {
        begin = 0;
      }

      let end = i + 1;
      while (end < rewritten.length) {
        const current = rewritten[end];
        if (
          current === undefined ||
          !this.isKatakanaNode(rewriteInput, current)
        ) {
          break;
        }
        end += 1;
      }

      while (begin !== end) {
        const current = rewritten[begin];
        if (
          current === undefined ||
          this.canOovBowNode(rewriteInput, current)
        ) {
          break;
        }
        begin += 1;
      }

      if (end - begin > 1) {
        rewritten = this.concat(path.dictionary, rewritten, begin, end, path.input);
        i = begin + 1;
      }
      i += 1;
    }

    return new MorphemeList(path.dictionary, rewritten, path.input);
  }

  private isShorter(morpheme: Morpheme): boolean {
    return [...morpheme.surface()].length < this.minLength;
  }

  private isKatakanaNode(input: InputBuffer, morpheme: Morpheme): boolean {
    return input
      .catOfRange(morpheme.currentBeginC, morpheme.currentEndC)
      .contains(CategoryType.KATAKANA);
  }

  private canOovBowNode(input: InputBuffer, morpheme: Morpheme): boolean {
    return !input.catAtChar(morpheme.currentBeginC).contains(CategoryType.NOOOVBOW);
  }

  private concat(
    dictionary: Dictionary,
    path: Morpheme[],
    begin: number,
    end: number,
    input?: InputBuffer
  ): Morpheme[] {
    const first = path[begin];
    const last = path[end - 1];
    if (first === undefined || last === undefined || end <= begin) {
      return path;
    }

    const nodes = path.slice(begin, end);
    const originalSurface = nodes.map((morpheme) => morpheme.surface()).join("");
    const surface = nodes.map((morpheme) => morpheme.getWordInfo().surface()).join("");
    const headWordLength = nodes.reduce(
      (total, morpheme) => total + morpheme.getWordInfo().headWordLength(),
      0
    );
    const maxWordId = nodes.reduce((max, morpheme) =>
      morpheme.wordId().asRaw() > max.asRaw() ? morpheme.wordId() : max,
      WordId.fromRaw(0)
    );
    const wordId = maxWordId.isOov()
      ? maxWordId
      : WordId.new(maxWordId.dic(), WordId.MAX_WORD);
    const infoData: WordInfoData = {
      surface,
      headWordLength,
      posId: this.oovPosId,
      normalizedForm: surface,
      dictionaryFormWordId: -1,
      dictionaryForm: surface,
      readingForm: "",
      aUnitSplit: [],
      bUnitSplit: [],
      wordStructure: [],
      synonymGroupIds: []
    };
    const joined = new Morpheme(
      dictionary,
      wordId,
      new WordInfo(infoData),
      first.currentBeginC,
      last.currentEndC,
      first.currentBeginBytes,
      last.currentEndBytes,
      originalSurface,
      input
    );
    return [...path.slice(0, begin), joined, ...path.slice(end)];
  }
}

export class IgnoreYomiganaPlugin implements InputTextPlugin {
  readonly kind = "inputText" as const;
  private readonly category: CharacterCategory;
  private readonly leftBrackets: Set<string>;
  private readonly rightBrackets: Set<string>;
  private readonly maxYomiganaLength: number;

  constructor(
    options: {
      category?: CharacterCategory;
      leftBrackets?: readonly string[];
      rightBrackets?: readonly string[];
      maxYomiganaLength?: number;
    } = {}
  ) {
    this.category = options.category ?? CharacterCategory.default();
    this.leftBrackets = new Set(options.leftBrackets ?? ["(", "（"]);
    this.rightBrackets = new Set(options.rightBrackets ?? [")", "）"]);
    this.maxYomiganaLength = options.maxYomiganaLength ?? 4;
  }

  rewrite(input: InputBuffer): void {
    const current = input.current();
    const chars = [...current];
    const byteOffsets = byteOffsetsByCharIndex(chars);
    input.withEditor((_, editor) => {
      for (let index = 1; index < chars.length; index += 1) {
        const left = chars[index];
        if (left === undefined || !this.leftBrackets.has(left)) {
          continue;
        }
        const previous = chars[index - 1];
        if (
          previous === undefined ||
          !this.category.getCategoryTypes(previous).contains(CategoryType.KANJI)
        ) {
          continue;
        }
        if (input.barrierAtCurrentByte(byteOffsets[index] ?? 0)) {
          continue;
        }

        let cursor = index + 1;
        let readingLength = 0;
        while (cursor < chars.length) {
          const char = chars[cursor];
          if (char === undefined || this.rightBrackets.has(char)) {
            break;
          }
          const category = this.category.getCategoryTypes(char);
          if (
            !category.intersects(CategoryType.HIRAGANA.or(CategoryType.KATAKANA))
          ) {
            readingLength = this.maxYomiganaLength + 1;
            break;
          }
          readingLength += 1;
          cursor += 1;
        }

        const right = chars[cursor];
        let crossesBarrier = false;
        for (let probe = index + 1; probe <= cursor; probe += 1) {
          if (input.barrierAtCurrentByte(byteOffsets[probe] ?? 0)) {
            crossesBarrier = true;
            break;
          }
        }
        if (
          !crossesBarrier &&
          right !== undefined &&
          this.rightBrackets.has(right) &&
          readingLength >= 1 &&
          readingLength <= this.maxYomiganaLength
        ) {
          editor.replaceRef(
            byteOffsets[index] ?? 0,
            byteOffsets[cursor + 1] ?? 0,
            ""
          );
          index = cursor;
        }
      }
    });
  }
}



function barrierInsideRange(
  input: InputBuffer,
  byteOffsets: Map<number, number>,
  startStringIndex: number,
  endStringIndex: number
): boolean {
  for (let index = startStringIndex + 1; index < endStringIndex; index += 1) {
    const byteOffset = byteOffsets.get(index);
    if (byteOffset !== undefined && input.barrierAtCurrentByte(byteOffset)) {
      return true;
    }
  }
  return false;
}

function byteOffsetsByStringIndex(text: string): Map<number, number> {
  const offsets = new Map<number, number>();
  let byteOffset = 0;
  for (let stringIndex = 0; stringIndex < text.length; ) {
    offsets.set(stringIndex, byteOffset);
    const codePoint = text.codePointAt(stringIndex);
    const char =
      codePoint === undefined
        ? text[stringIndex] ?? ""
        : String.fromCodePoint(codePoint);
    byteOffset += utf8Encoder.encode(char).byteLength;
    stringIndex += char.length;
  }
  offsets.set(text.length, byteOffset);
  return offsets;
}

function byteOffsetsByCharIndex(chars: readonly string[]): number[] {
  const offsets: number[] = [];
  let byteOffset = 0;
  for (const [index, char] of chars.entries()) {
    offsets[index] = byteOffset;
    byteOffset += utf8Encoder.encode(char).byteLength;
  }
  offsets[chars.length] = byteOffset;
  return offsets;
}


function inputFromPath(path: MorphemeList): InputBuffer {
  const input = InputBuffer.from(path.map((morpheme) => morpheme.surface()).join(""));
  input.build(path.dictionary.grammar);
  return input;
}
