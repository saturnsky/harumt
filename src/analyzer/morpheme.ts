/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/morpheme.rs, analysis/mlist.rs
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
import type { Dictionary } from "./dictionary.js";
import { InfoSubset } from "./subset.js";
import type { PartOfSpeech } from "./grammar.js";
import type { WordInfo } from "./word-info.js";
import type { WordId } from "./word-id.js";
import type { InputBuffer } from "./input-text.js";
import { Mode } from "./mode.js";
import type { ResultNode } from "./node.js";


export class Morpheme {
  private readonly origSurface: string;

  readonly currentBeginC: number;
  readonly currentEndC: number;
  readonly currentBeginBytes: number;
  readonly currentEndBytes: number;

  constructor(
    private readonly dictionary: Dictionary,
    private readonly id: WordId,
    private readonly info: WordInfo,
    beginChar: number,
    endChar: number,
    beginByte: number,
    endByte: number,
    originalSurface?: string,
    private readonly input?: InputBuffer,
    readonly removedLongVowels = 0
  ) {
    this.origSurface = originalSurface ?? info.surface();
    this.currentBeginC = beginChar;
    this.currentEndC = endChar;
    this.currentBeginBytes = beginByte;
    this.currentEndBytes = endByte;
  }

  static fromResultNode(
    dictionary: Dictionary,
    node: ResultNode,
    input?: InputBuffer
  ): Morpheme {
    return new Morpheme(
      dictionary,
      node.wordId,
      node.wordInfo,
      node.begin,
      node.end,
      node.beginBytes,
      node.endBytes,
      node.originalSurface,
      input,
      node.removedLongVowels
    );
  }

  surface(): string {
    if (this.input !== undefined) {
      return this.input.origSliceExcludingDeleted(this.currentBeginBytes, this.currentEndBytes);
    }
    return this.origSurface;
  }

  begin(): number {
    return this.originalCharIndexAt(this.trimmedOriginalByteSpan()[0]);
  }

  end(): number {
    return this.originalCharIndexAt(this.trimmedOriginalByteSpan()[1]);
  }

  private trimmedOriginalByteSpan(): readonly [number, number] {
    if (this.input === undefined) {
      return [this.currentBeginBytes, this.currentEndBytes];
    }
    return this.input.origByteSpanTrimmed(this.currentBeginBytes, this.currentEndBytes);
  }

  partOfSpeech(): PartOfSpeech {
    return this.dictionary.grammar.posComponents(this.info.posId());
  }

  partOfSpeechId(): number {
    return this.info.posId();
  }

  dictionaryForm(): string {
    return this.info.dictionaryForm();
  }

  normalizedForm(): string {
    return this.info.normalizedForm();
  }

  readingForm(): string {
    return this.info.readingForm();
  }

  isOov(): boolean {
    return this.id.isOov();
  }

  wordId(): WordId {
    return this.id;
  }

  dictionaryId(): number {
    return this.id.isOov() ? -1 : this.id.dic();
  }

  synonymGroupIds(): readonly number[] {
    return this.info.synonymGroupIds();
  }

  getWordInfo(): WordInfo {
    return this.info;
  }

  dictionaryFormReading(): string {
    if (this.surface() === this.dictionaryForm()) {
      return this.readingForm();
    }

    const dictionaryFormWordId = this.info.dictionaryFormWordId();
    for (const entry of this.dictionary.lookup(this.dictionaryForm())) {
      if (
        dictionaryFormWordId >= 0 &&
        entry.wordId.dic() === this.dictionaryId() &&
        entry.wordId.word() === dictionaryFormWordId
      ) {
        return this.dictionary.lexicons.getWordInfo(entry.wordId).readingForm();
      }
    }

    return this.readingForm();
  }

  split(mode: Mode): MorphemeList {
    const splits =
      mode === Mode.A
        ? this.info.aUnitSplit()
        : mode === Mode.B
          ? this.info.bUnitSplit()
          : [];
    if (splits.length === 0) {
      return new MorphemeList(this.dictionary, [], this.input);
    }
    if (this.removedLongVowels > 0) {
      return this.splitReducedVariant(splits);
    }
    const parentChars = [...this.origSurface];
    let beginChar = this.currentBeginC;
    let beginByte = this.currentBeginBytes;
    const morphemes = splits.map((wordId, index) => {
      const wordInfo = this.dictionary.lexicons.getWordInfo(
        wordId,
        InfoSubset.all()
      );
      const endByte =
        index + 1 === splits.length
          ? this.currentEndBytes
          : beginByte + wordInfo.headWordLength();
      const endChar =
        index + 1 === splits.length
          ? this.currentEndC
          : beginChar + [...wordInfo.surface()].length;
      const subSurface = this.input === undefined
        ? fallbackSplitSurface(parentChars, beginChar - this.currentBeginC, endChar - this.currentBeginC, index + 1 === splits.length)
        : this.input.origSliceExcludingDeleted(beginByte, endByte);
      const morpheme = new Morpheme(
        this.dictionary,
        wordId,
        wordInfo,
        beginChar,
        endChar,
        beginByte,
        endByte,
        subSurface,
        this.input
      );
      beginChar = endChar;
      beginByte = endByte;
      return morpheme;
    });
    return new MorphemeList(this.dictionary, morphemes, this.input);
  }

  private splitReducedVariant(splits: readonly WordId[]): MorphemeList {
    const input = this.input;
    if (input === undefined) {
      return new MorphemeList(this.dictionary, [], undefined);
    }
    const chars = input.currentChars();
    const morphemes: Morpheme[] = [];
    let p = this.currentBeginC;
    for (let index = 0; index < splits.length; index += 1) {
      const wordId = splits[index];
      if (wordId === undefined) {
        continue;
      }
      const wordInfo = this.dictionary.lexicons.getWordInfo(wordId, InfoSubset.all());
      const isLast = index + 1 === splits.length;
      const startChar = p;
      let removed = 0;
      for (const hostChar of wordInfo.surface()) {
        while (p < this.currentEndC && chars[p] !== hostChar) {
          removed += 1;
          p += 1;
        }
        if (p < this.currentEndC) {
          p += 1;
        }
      }
      if (isLast) {
        while (p < this.currentEndC) {
          removed += 1;
          p += 1;
        }
      } else {
        const nextWordId = splits[index + 1];
        const nextFirst = nextWordId === undefined
          ? undefined
          : [
              ...this.dictionary.lexicons
                .getWordInfo(nextWordId, InfoSubset.all())
                .surface()
            ][0];
        while (
          p < this.currentEndC &&
          nextFirst !== undefined &&
          chars[p] !== nextFirst
        ) {
          removed += 1;
          p += 1;
        }
      }
      const endChar = p;
      const beginByte = input.toCurrByteIdx(startChar);
      const endByte = input.toCurrByteIdx(endChar);
      const subSurface = input.origSliceExcludingDeleted(beginByte, endByte);
      morphemes.push(
        new Morpheme(
          this.dictionary,
          wordId,
          wordInfo,
          startChar,
          endChar,
          beginByte,
          endByte,
          subSurface,
          input,
          removed
        )
      );
    }
    return new MorphemeList(this.dictionary, morphemes, input);
  }

  length(): number {
    return this.end() - this.begin();
  }

  private originalCharIndexAt(originalByte: number): number {
    if (this.input === undefined) {
      return originalByte;
    }
    return this.input.origCharIndexAt(originalByte);
  }
}

export class MorphemeList extends Array<Morpheme> {
  static get [Symbol.species](): ArrayConstructor {
    return Array;
  }

  constructor(
    readonly dictionary: Dictionary,
    morphemes: readonly Morpheme[] = [],
    readonly input?: InputBuffer
  ) {
    super(...morphemes);
  }

  static fromResultNodes(
    dictionary: Dictionary,
    nodes: readonly ResultNode[],
    input?: InputBuffer
  ): MorphemeList {
    return new MorphemeList(
      dictionary,
      nodes.map((node) => Morpheme.fromResultNode(dictionary, node, input)),
      input
    );
  }

  get(index: number): Morpheme | undefined {
    return this[index];
  }
}

function fallbackSplitSurface(
  parentChars: readonly string[],
  relBegin: number,
  relEnd: number,
  isLast: boolean
): string {
  return parentChars.slice(relBegin, isLast ? undefined : relEnd).join("");
}
