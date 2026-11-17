/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/inner.rs, analysis/node.rs
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
import { InfoSubset } from "./subset.js";
import type { WordInfo } from "./word-info.js";
import { WordId } from "./word-id.js";
import type { InputBuffer } from "./input-text.js";
import type { LexiconSet } from "./lexicon-set.js";
import { Mode } from "./mode.js";

export class Node {
  constructor(
    readonly begin: number,
    readonly end: number,
    readonly leftId: number,
    readonly rightId: number,
    readonly cost: number,
    readonly wordId: WordId,
    readonly removedLongVowels = 0
  ) {}
}

export class NodeIdx {
  static readonly EMPTY = new NodeIdx(0xffff, 0xffff);

  constructor(readonly end: number, readonly index: number) {}

  isEmpty(): boolean {
    return this.end === 0xffff && this.index === 0xffff;
  }
}

export class ResultNode {
  readonly begin: number;
  readonly end: number;
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly wordId: WordId;
  readonly removedLongVowels: number;

  constructor(
    node: Node,
    readonly totalCost: number,
    readonly beginBytes: number,
    readonly endBytes: number,
    readonly wordInfo: WordInfo,
    readonly originalSurface: string = wordInfo.surface()
  ) {
    this.begin = node.begin;
    this.end = node.end;
    this.leftId = node.leftId;
    this.rightId = node.rightId;
    this.cost = node.cost;
    this.wordId = node.wordId;
    this.removedLongVowels = node.removedLongVowels;
  }

  numSplits(mode: Mode): number {
    switch (mode) {
      case Mode.A:
        return this.wordInfo.aUnitSplit().length;
      case Mode.B:
        return this.wordInfo.bUnitSplit().length;
      case Mode.C:
        return 0;
    }
  }

  split(
    mode: Mode,
    lexicon: LexiconSet,
    subset: InfoSubset,
    text: InputBuffer
  ): ResultNode[] {
    const splits =
      mode === Mode.A
        ? this.wordInfo.aUnitSplit()
        : mode === Mode.B
          ? this.wordInfo.bUnitSplit()
          : [];

    const nodes: ResultNode[] = [];
    let charOffset = this.begin;
    let byteOffset = this.beginBytes;
    for (const [index, wordId] of splits.entries()) {
      const wordInfo = lexicon.getWordInfo(wordId, subset);
      const byteEnd =
        index + 1 === splits.length
          ? this.endBytes
          : byteOffset + wordInfo.headWordLength();
      const charEnd = index + 1 === splits.length ? this.end : text.chIdx(byteEnd);
      nodes.push(
        new ResultNode(
          new Node(charOffset, charEnd, 0xffff, 0xffff, 0x7fff, wordId),
          Number.MAX_SAFE_INTEGER,
          byteOffset,
          byteEnd,
          wordInfo
        )
      );
      charOffset = charEnd;
      byteOffset = byteEnd;
    }
    return nodes;
  }
}
