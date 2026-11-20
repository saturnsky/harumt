import type { RuntimeHaruToken } from "../../../types/token.js";
import { POS0, POS01, POS5A, isSahenCapableNominal, 動詞, 名詞_普通名詞, 接頭辞, 未然形_, 連用形_ } from "../../../types/pos.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import type { AuxOpNode } from "../tail/predicate-root/grammar.js";
import { isSeruCausativeAuxToken } from "../tail/predicate-root/classifiers/causative-aux.js";
import { buildVoiceOp } from "../tail/predicate-root/op-builders.js";

export type HonorificFormulaicHostKind = "sahen_noun" | "renyou_verb" | "nominalized_renyou_verb" | "lexical_respect_verb";

export interface HonorificFormulaicHost {
  readonly headIdx: number;
  readonly headEnd: number;
  readonly head: RuntimeHaruToken;
  readonly headKind: HonorificFormulaicHostKind;
  readonly requiresHonorificClosure: boolean;
  readonly causative: { readonly op: AuxOpNode; readonly endExclusive: number } | null;
}

export function honorificFormulaicHostAt(
  tokens: readonly RuntimeHaruToken[],
  index: number
): HonorificFormulaicHost | null {
  const n = tokens.length;
  const first = tokens[index];
  if (first === undefined) {
    return null;
  }
  if (isHonorificPrefix(first)) {
    const beforeIdx = previousNonSpaceIndex(tokens, index);
    const before = beforeIdx === null ? undefined : tokens[beforeIdx];
    if (before !== undefined && isHonorificPrefix(before)) {
      return null;
    }
    const headIdx = nextNonSpaceIndex(tokens, index + 1, n) ?? n;
    const head = tokens[headIdx];
    if (head === undefined) {
      return null;
    }
    const headKind = formulaicHeadKind(head, true);
    if (headKind !== null) {
      return { headIdx, headEnd: headIdx + 1, head, headKind, requiresHonorificClosure: true, causative: null };
    }
    return formulaicCausativeHostAt(tokens, headIdx, head);
  }
  const lexicalKind = lexicalRespectHostKind(first);
  if (lexicalKind !== null) {
    return {
      headIdx: index,
      headEnd: index + 1,
      head: first,
      headKind: lexicalKind,
      requiresHonorificClosure: true,
      causative: null
    };
  }
  const bareKind = formulaicHeadKind(first, false);
  if (bareKind !== null) {
    return {
      headIdx: index,
      headEnd: index + 1,
      head: first,
      headKind: bareKind,
      requiresHonorificClosure: isPrecollapsedHonorificSahenHost(first),
      causative: null
    };
  }
  return null;
}

export function honorificPrefixRenyouVerbHostAt(
  tokens: readonly RuntimeHaruToken[],
  prefixIdx: number
): number | null {
  const prefix = tokens[prefixIdx];
  if (prefix === undefined || !isHonorificPrefix(prefix)) {
    return null;
  }
  const host = honorificFormulaicHostAt(tokens, prefixIdx);
  return host !== null && host.headKind === "renyou_verb" && host.causative === null
    ? host.headIdx
    : null;
}

function formulaicCausativeHostAt(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  head: RuntimeHaruToken
): HonorificFormulaicHost | null {
  if ((head.pos & (POS0 | POS5A)) !== (動詞 | 未然形_)) {
    return null;
  }
  const causativeIdx = nextNonSpaceIndex(tokens, headIdx + 1, tokens.length) ?? tokens.length;
  const causative = tokens[causativeIdx];
  if (
    causative === undefined ||
    !isSeruCausativeAuxToken(causative) ||
    (causative.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  return {
    headIdx,
    headEnd: headIdx + 1,
    head,
    headKind: "renyou_verb",
    requiresHonorificClosure: true,
    causative: {
      op: buildVoiceOp(opSourceFromIndices(tokens, [causativeIdx]), "causative"),
      endExclusive: causativeIdx + 1
    }
  };
}

function formulaicHeadKind(
  token: RuntimeHaruToken | undefined,
  hasPrefix: boolean
): HonorificFormulaicHostKind | null {
  if (token === undefined) {
    return null;
  }
  if (isSahenRequestNoun(token)) {
    return "sahen_noun";
  }
  if (isHonorificRequestRenyouVerb(token)) {
    return "renyou_verb";
  }
  if (hasPrefix && isPotentialNominalizedRenyouHost(token)) {
    return "nominalized_renyou_verb";
  }
  return hasPrefix ? lexicalRespectHostKind(token) : null;
}

function lexicalRespectHostKind(token: RuntimeHaruToken): HonorificFormulaicHostKind | null {
  const form = token.dictionaryForm || token.surface;
  return form === "ご覧" ? "lexical_respect_verb" : null;
}

export function isPrecollapsedHonorificSahenHost(token: RuntimeHaruToken): boolean {
  return isSahenRequestNoun(token) && (token.dictionaryForm || token.surface) === "お願い";
}

export function previousNonSpaceIndex(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number
): number | null {
  for (let idx = beforeIdx - 1; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined || token.surface.trim() === "") {
      continue;
    }
    return idx;
  }
  return null;
}

export function isHonorificPrefix(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return (token.pos & POS0) === 接頭辞 && (form === "ご" || form === "御" || form === "お");
}

export function isSahenRequestNoun(token: RuntimeHaruToken): boolean {
  return isSahenCapableNominal(token);
}

export function isHonorificRequestRenyouVerb(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
}

function isPotentialNominalizedRenyouHost(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 名詞_普通名詞 && token.surface.length > 0 && token.reading.length > 0;
}

export function opSourceFromIndices(
  tokens: readonly RuntimeHaruToken[],
  indices: readonly number[]
): { readonly tokens: readonly RuntimeHaruToken[]; readonly tokenIndices: readonly number[] } {
  const sourceTokens: RuntimeHaruToken[] = [];
  const tokenIndices: number[] = [];
  for (const idx of indices) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    sourceTokens.push(token);
    tokenIndices.push(idx);
  }
  return { tokens: sourceTokens, tokenIndices };
}
