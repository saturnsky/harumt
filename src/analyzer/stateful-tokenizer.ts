/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/stateful_tokenizer.rs, plugin/oov/
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
import { Dictionary } from "./dictionary.js";
import { POS_DEPTH, type PartOfSpeech } from "./grammar.js";
import { isFunctionalReadingPos, isIndependentWordPos0Name } from "../types/pos.js";
import { InfoSubset } from "./subset.js";
import { WordId } from "./word-id.js";
import { WordInfo } from "./word-info.js";
import { InputBuffer, type BarrierLeftMaterial } from "./input-text.js";
import { Mode } from "./mode.js";
import { Lattice } from "./lattice.js";
import { Node, ResultNode } from "./node.js";
import type { InputTextPlugin } from "./plugin.js";
import {
  buildReducedBuffer,
  inputHasElongation,
  longVowelReductionPenalty,
  type ProlongedReductionContract,
  type ReducedBuffer
} from "./reduction-variant.js";

const utf8Encoder = new TextEncoder();

const POS4_INDEX = 4;

const MAX_REDUCE_SPAN_CHARS = 12;

export interface TokenizeWithInputResult {
  readonly nodes: ResultNode[];
  readonly input: InputBuffer;
}

export class StatefulTokenizer {
  private readonly lattice = new Lattice();
  private subset = InfoSubset.all();

  constructor(
    readonly dictionary: Dictionary,
    private mode: Mode = Mode.C,
    private readonly prolongedReduction?: ProlongedReductionContract
  ) {}

  setMode(mode: Mode): Mode {
    const old = this.mode;
    this.mode = mode;
    this.subset = this.subset
      .or(mode === Mode.A ? InfoSubset.SPLIT_A : InfoSubset.empty())
      .or(mode === Mode.B ? InfoSubset.SPLIT_B : InfoSubset.empty())
      .normalize();
    return old;
  }

  tokenize(text: string, mode = this.mode, inputPlugins?: readonly InputTextPlugin[]): ResultNode[] {
    return this.tokenizeWithInput(text, mode, inputPlugins).nodes;
  }

  tokenizeWithInput(
    text: string,
    mode = this.mode,
    inputPlugins?: readonly InputTextPlugin[]
  ): TokenizeWithInputResult {
    this.setMode(mode);
    const input = InputBuffer.from(text);
    for (const plugin of [...(inputPlugins ?? []), ...this.dictionary.inputTextPlugins]) {
      plugin.rewrite(input);
    }
    input.build(this.dictionary.grammar);
    if (input.current().length === 0) {
      return { nodes: [], input };
    }

    this.buildLattice(input);
    return { nodes: this.resolveBestPath(input), input };
  }

  private buildLattice(input: InputBuffer): void {
    this.lattice.reset(input.currentChars().length);
    const bytes = utf8Encoder.encode(input.current());
    const hasReducible = inputHasElongation(input.currentChars());

    for (const [charOffset, byteOffset] of input.currByteOffsets().entries()) {
      if (!this.lattice.hasPreviousNode(charOffset)) {
        continue;
      }

      const createdLengths = new Set<number>();
      const typedWordIdsByLength = hasReducible ? new Map<number, WordId[]>() : undefined;
      for (const entry of this.dictionary.lexicons.lookup(bytes, byteOffset)) {
        if (entry.end < bytes.byteLength && !input.canBow(entry.end)) {
          continue;
        }
        const [leftId, rightId, cost] = this.dictionary.lexicons.getWordParam(
          entry.wordId
        );
        const node = new Node(
          charOffset,
          input.chIdx(entry.end),
          leftId,
          rightId,
          cost,
          entry.wordId
        );
        if (!this.insertUnlessCrossingBarrier(input, node)) {
          continue;
        }
        const length = node.end - node.begin;
        createdLengths.add(length);
        if (typedWordIdsByLength !== undefined) {
          const bucket = typedWordIdsByLength.get(length);
          if (bucket === undefined) {
            typedWordIdsByLength.set(length, [entry.wordId]);
          } else {
            bucket.push(entry.wordId);
          }
        }
      }

      if (hasReducible) {
        for (const node of this.reducedVariantNodes(
          input,
          bytes,
          charOffset,
          typedWordIdsByLength ?? new Map()
        )) {
          this.insertUnlessCrossingBarrier(input, node);
        }
      }

      const blocksOovBow = input
        .catAtChar(charOffset)
        .intersects(CategoryType.NOOOVBOW.or(CategoryType.NOOOVBOW2));
      if (!blocksOovBow) {
        for (const provider of this.dictionary.oovProviders) {
          const nodes =
            provider.kind === "simple"
              ? this.simpleOovNodes(provider, input, charOffset, createdLengths)
              : provider.kind === "mecab"
                ? this.meCabOovNodes(provider, input, charOffset, createdLengths)
                : this.regexOovNodes(provider, input, charOffset, createdLengths);
          for (const node of nodes) {
            if (this.insertUnlessCrossingBarrier(input, node)) {
              createdLengths.add(node.end - node.begin);
            }
          }
        }
      }

      if (createdLengths.size === 0) {
        const lastProvider = this.dictionary.oovProviders.at(-1);
        if (lastProvider !== undefined) {
          const nodes =
            lastProvider.kind === "simple"
              ? this.simpleOovNodes(lastProvider, input, charOffset, createdLengths)
              : lastProvider.kind === "mecab"
                ? this.meCabOovNodes(lastProvider, input, charOffset, createdLengths)
                : this.regexOovNodes(lastProvider, input, charOffset, createdLengths);
          for (const node of nodes) {
            if (this.insertUnlessCrossingBarrier(input, node)) {
              createdLengths.add(node.end - node.begin);
            }
          }
        }
      }

      if (input.hasBarrierBefore(charOffset)) {
        this.lattice.reopenBarrierSeam(charOffset, this.dictionary.grammar.connection);
      }
    }

    this.lattice.connectEos(this.dictionary.grammar.connection);
  }

  private insertUnlessCrossingBarrier(input: InputBuffer, node: Node): boolean {
    if (input.crossesBarrier(node.begin, node.end)) {
      return false;
    }
    if (!input.barrierGuardsEdgeAt(node.begin)) {
      this.lattice.insert(node, this.dictionary.grammar.connection);
      return true;
    }
    const pos0 = this.nodePos(node)[0];
    this.lattice.insert(
      node,
      this.dictionary.grammar.connection,
      (left: Node): boolean =>
        input.barrierRefusesEdge(node.begin, pos0, this.barrierLeftMaterial(left))
    );
    return true;
  }

  private barrierLeftMaterial(left: Node): BarrierLeftMaterial {
    const pos = this.nodePos(left);
    return { pos0: pos[0], inflectionForm: (pos[POS_DEPTH - 1] ?? "*").split("-")[0] ?? "*" };
  }

  private nodePos(node: Node): PartOfSpeech {
    const posId = node.wordId.isOov()
      ? node.wordId.word()
      : this.dictionary.lexicons.getWordInfo(node.wordId, InfoSubset.POS_ID).posId();
    return this.dictionary.grammar.posComponents(posId);
  }

  private reductionKeepsLexeme(
    typedWordIds: readonly WordId[],
    candidateWordId: WordId
  ): boolean {
    const candidate = this.dictionary.lexicons
      .getWordInfo(candidateWordId, InfoSubset.NORMALIZED_FORM)
      .normalizedForm();
    for (const wordId of typedWordIds) {
      const typed = this.dictionary.lexicons
        .getWordInfo(wordId, InfoSubset.NORMALIZED_FORM)
        .normalizedForm();
      if (typed !== candidate) {
        return false;
      }
    }
    return true;
  }

  private reductionOpensDependentReading(
    typedWordIds: readonly WordId[],
    candidateWordId: WordId
  ): boolean {
    const contract = this.prolongedReduction;
    if (contract === undefined || contract.dependentHeadwordPos0.size === 0) {
      return false;
    }
    const candidate = this.dictionary.lexicons
      .getWordInfo(candidateWordId, InfoSubset.SURFACE.or(InfoSubset.POS_ID));
    const candidatePos = this.dictionary.grammar.posComponents(candidate.posId());
    const candidatePos0 = candidatePos[0];
    const candidateInflectClass = candidatePos[POS4_INDEX];
    if (candidatePos0 === undefined || candidateInflectClass === undefined ||
      !isFunctionalReadingPos(candidatePos0, candidateInflectClass, contract.candidateInflectClasses)) {
      return false;
    }
    const reducedSurface = candidate.surface();
    for (const wordId of typedWordIds) {
      const typed = this.dictionary.lexicons.getWordInfo(
        wordId,
        InfoSubset.POS_ID.or(InfoSubset.NORMALIZED_FORM)
      );
      const pos0 = this.dictionary.grammar.posComponents(typed.posId())[0];
      if (pos0 === undefined || !contract.dependentHeadwordPos0.has(pos0)) {
        return false;
      }
      if (typed.normalizedForm() !== reducedSurface) {
        return false;
      }
    }
    return true;
  }

  private reductionOpensFunctionalReadingOverContentHeadword(
    typedWordIds: readonly WordId[],
    candidateWordId: WordId
  ): boolean {
    const contract = this.prolongedReduction;
    if (contract === undefined || contract.dependentHeadwordPos0.size === 0) {
      return false;
    }
    const candidatePos = this.nodePosOfWord(candidateWordId);
    const candidatePos0 = candidatePos[0];
    const candidateInflectClass = candidatePos[POS4_INDEX];
    if (candidatePos0 === undefined || candidateInflectClass === undefined ||
      !isFunctionalReadingPos(candidatePos0, candidateInflectClass, contract.candidateInflectClasses)) {
      return false;
    }
    for (const wordId of typedWordIds) {
      const pos0 = this.nodePosOfWord(wordId)[0];
      if (pos0 === undefined || !isIndependentWordPos0Name(pos0)) {
        return false;
      }
    }
    return true;
  }

  private nodePosOfWord(wordId: WordId): PartOfSpeech {
    const posId = this.dictionary.lexicons.getWordInfo(wordId, InfoSubset.POS_ID).posId();
    return this.dictionary.grammar.posComponents(posId);
  }

  private reducedVariantNodes(
    input: InputBuffer,
    bytes: Uint8Array,
    charOffset: number,
    typedWordIdsByLength: ReadonlyMap<number, readonly WordId[]>
  ): Node[] {
    const keep1 = buildReducedBuffer(
      input.currentChars(),
      charOffset,
      MAX_REDUCE_SPAN_CHARS,
      1
    );
    if (keep1 === null) {
      return [];
    }
    const byKey = new Map<string, Node>();
    this.collectReducedNodes(input, bytes, charOffset, keep1, typedWordIdsByLength, byKey);
    if (keep1.collapsedVowelRun) {
      const keep2 = buildReducedBuffer(
        input.currentChars(),
        charOffset,
        MAX_REDUCE_SPAN_CHARS,
        2
      );
      if (keep2 !== null) {
        this.collectReducedNodes(input, bytes, charOffset, keep2, typedWordIdsByLength, byKey);
      }
    }
    return [...byKey.values()];
  }

  private collectReducedNodes(
    input: InputBuffer,
    bytes: Uint8Array,
    charOffset: number,
    reduced: ReducedBuffer,
    typedWordIdsByLength: ReadonlyMap<number, readonly WordId[]>,
    byKey: Map<string, Node>
  ): void {
    for (const entry of this.dictionary.lexicons.lookup(reduced.bytes, 0)) {
      const origCharEnd = reduced.reducedByteEndToOrigCharEnd[entry.end];
      const removed = reduced.removedCountAtReducedEnd[entry.end];
      if (origCharEnd === undefined || removed === undefined || removed === 0) {
        continue;
      }
      const markOnly = removed === (reduced.markRemovedCountAtReducedEnd[entry.end] ?? 0);
      const typedWordIds = typedWordIdsByLength.get(origCharEnd - charOffset);
      if (typedWordIds !== undefined &&
        (!markOnly ||
          !(this.reductionKeepsLexeme(typedWordIds, entry.wordId) ||
            this.reductionOpensDependentReading(typedWordIds, entry.wordId) ||
            this.reductionOpensFunctionalReadingOverContentHeadword(typedWordIds, entry.wordId)))) {
        continue;
      }
      const nonTrailing =
        reduced.nonTrailingVowelRepeatCountAtReducedEnd[entry.end] ?? 0;
      if (nonTrailing > 0) {
        continue;
      }
      const key = `${origCharEnd}:${entry.wordId.asRaw()}`;
      if (byKey.has(key)) {
        continue;
      }
      const origByteEnd = input.toCurrByteIdx(origCharEnd);
      if (origByteEnd < bytes.byteLength && !input.canBow(origByteEnd)) {
        continue;
      }
      const [leftId, rightId, cost] = this.dictionary.lexicons.getWordParam(
        entry.wordId
      );
      const markRemoved = reduced.markRemovedCountAtReducedEnd[entry.end] ?? 0;
      const katakanaMarkRemoved =
        reduced.katakanaMarkRemovedCountAtReducedEnd[entry.end] ?? 0;
      const penalty = longVowelReductionPenalty(
        cost,
        removed,
        markRemoved,
        katakanaMarkRemoved
      );
      byKey.set(
        key,
        new Node(
          charOffset,
          origCharEnd,
          leftId,
          rightId,
          cost + penalty,
          entry.wordId,
          removed
        )
      );
    }
  }

  private simpleOovNodes(
    oov: NonNullable<Dictionary["simpleOov"]>,
    input: InputBuffer,
    charOffset: number,
    createdLengths: Set<number>
  ): Node[] {
    if (createdLengths.size > 0) {
      return [];
    }
    const limit = input.barrierLimitFrom(charOffset);
    const length = Math.min(input.getWordCandidateLength(charOffset), limit - charOffset);
    return [
      new Node(
        charOffset,
        charOffset + length,
        oov.leftId,
        oov.rightId,
        oov.cost,
        WordId.oov(oov.posId)
      )
    ];
  }

  private meCabOovNodes(
    provider: Extract<Dictionary["oovProviders"][number], { kind: "mecab" }>,
    input: InputBuffer,
    charOffset: number,
    createdLengths: Set<number>
  ): Node[] {
    const charLength = Math.min(
      input.catContinuousLen(charOffset),
      input.barrierLimitFrom(charOffset) - charOffset
    );
    if (charLength <= 0) {
      return [];
    }

    const nodes: Node[] = [];
    for (const category of input.catAtChar(charOffset).iter()) {
      const info = provider.categories.get(category.bits);
      if (info === undefined || (!info.isInvoke && createdLengths.size > 0)) {
        continue;
      }
      const oovs = provider.oovList.get(info.categoryType.bits) ?? [];
      let limitedLength = charLength;
      if (info.isGroup) {
        for (const oov of oovs) {
          nodes.push(this.oovNode(oov, charOffset, charOffset + charLength));
        }
        limitedLength -= 1;
      }
      for (let length = 1; length <= info.length; length += 1) {
        const sublength = input.charDistance(charOffset, length);
        if (sublength > limitedLength) {
          break;
        }
        for (const oov of oovs) {
          nodes.push(this.oovNode(oov, charOffset, charOffset + sublength));
        }
      }
    }
    return nodes;
  }

  private regexOovNodes(
    provider: Extract<Dictionary["oovProviders"][number], { kind: "regex" }>,
    input: InputBuffer,
    charOffset: number,
    createdLengths: Set<number>
  ): Node[] {
    if (provider.boundaries === "strict" && charOffset > 0 && !input.hasBarrierBefore(charOffset)) {
      const current = input.catContinuousLen(charOffset);
      const previous = input.catContinuousLen(charOffset - 1);
      if (current + 1 === previous) {
        return [];
      }
    }

    const end = Math.min(
      input.currentChars().length,
      charOffset + provider.maxLength,
      input.barrierLimitFrom(charOffset)
    );
    const text = input.currSliceC(charOffset, end);
    const match = provider.regex.exec(text);
    if (match === null || match.index !== 0) {
      return [];
    }
    const matched = match[0];
    const matchLength = [...matched].length;
    if (createdLengths.has(matchLength)) {
      return [];
    }
    return [
      this.oovNode(provider, charOffset, charOffset + matchLength)
    ];
  }

  private oovNode(
    oov: { leftId: number; rightId: number; cost: number; posId: number },
    start: number,
    end: number
  ): Node {
    return new Node(
      start,
      end,
      oov.leftId,
      oov.rightId,
      oov.cost,
      WordId.oov(oov.posId)
    );
  }

  private resolveBestPath(input: InputBuffer): ResultNode[] {
    const path = this.lattice.fillTopPath().reverse();
    return path.map((nodeIdx) => {
      const [inner, totalCost] = this.lattice.node(nodeIdx);
      const beginByte = input.toCurrByteIdx(inner.begin);
      const endByte = input.toCurrByteIdx(inner.end);
      const originalSurface = input.origSlice(beginByte, endByte);
      const currentSurface = input.currSliceC(inner.begin, inner.end);
      const wordInfo = inner.wordId.isOov()
        ? new WordInfo({
            surface: currentSurface,
            headWordLength: 0,
            posId: inner.wordId.word(),
            normalizedForm: "",
            dictionaryFormWordId: -1,
            dictionaryForm: "",
            readingForm: "",
            aUnitSplit: [],
            bUnitSplit: [],
            wordStructure: [],
            synonymGroupIds: []
          })
        : this.dictionary.lexicons.getWordInfo(inner.wordId, this.subset);
      return new ResultNode(
        inner,
        totalCost,
        beginByte,
        endByte,
        wordInfo,
        originalSurface
      );
    });
  }
}
