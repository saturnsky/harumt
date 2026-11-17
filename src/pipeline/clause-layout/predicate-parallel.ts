
import type { ClauseToken } from "./index.js";
import { isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./trivia.js";
import {
  POS0,
  POS01,
  POS5A,
  PREDICATE_BITS,
  isAdverbCapable,
  isNaAdjCapable,
  isNegativeAuxiliaryPos,
  isSahenCapableNominal,
  isTerminalOrAttributiveInflection,
  isVerbPredicateToken,
  pos0in,
  終止形_,
  助動詞,
  助詞_係助詞,
  連体形_,
  連用形_,
} from "../../types/pos.js";
import { isWeakPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { CARRIER_ONLY_EQUIVALENCE_NOUNS } from "../head-tail/data/semantic-helper-sets.js";

export interface PairedVolitionalPredicateShape {
  readonly lemma: string;
  readonly predicateIdx: number;
  readonly inflectionIdx: number;
}

export function pairedVolitionalPredicateShape<T extends ClauseToken>(
  tokens: readonly T[],
  inflectionIdx: number,
  inflection: ClauseToken
): PairedVolitionalPredicateShape {
  if ((inflection.dictionaryForm || inflection.surface) === "する") {
    const nominalIdx = previousNonSpaceIndex(tokens, inflectionIdx);
    const nominal = nominalIdx === null ? undefined : tokens[nominalIdx];
    if (nominalIdx !== null && nominal !== undefined && isSahenCapableNominal(nominal)) {
      return {
        lemma: `${nominal.dictionaryForm || nominal.surface}+する`,
        predicateIdx: nominalIdx,
        inflectionIdx,
      };
    }
  }
  return {
    lemma: inflection.dictionaryForm || inflection.surface,
    predicateIdx: inflectionIdx,
    inflectionIdx,
  };
}

export interface ZeroNominalizedParallelMoEvidence {
  readonly kind: "zero_nominalized_parallel_mo";
  readonly lemma: string;
  readonly positiveHeadIdx: number;
  readonly positiveChainEndIdx: number;
  readonly firstMarkerIdx: number;
  readonly negativeHeadIdx: number;
  readonly negativeChainEndIdx: number;
  readonly secondMarkerIdx: number;
}

export function collectZeroNominalizedParallelMoEvidence<T extends ClauseToken>(
  tokens: readonly T[]
): readonly ZeroNominalizedParallelMoEvidence[] {
  const evidence: ZeroNominalizedParallelMoEvidence[] = [];
  for (let firstMarkerIdx = 1; firstMarkerIdx < tokens.length; firstMarkerIdx += 1) {
    if (!isParallelMoMarkerToken(tokens[firstMarkerIdx])) continue;
    const positive = parallelMoPredicateChainBefore(tokens, firstMarkerIdx);
    if (positive === null || positive.negated) continue;
    const secondStartIdx = parallelMoNextItemStart(tokens, firstMarkerIdx + 1);
    if (secondStartIdx === null) continue;
    const negative = parallelMoPredicateChainAfter(tokens, secondStartIdx);
    if (negative === null || !negative.negated) continue;
    const secondMarkerIdx = nextNonSpaceIndex(tokens, negative.chainEndIdx + 1, tokens.length);
    if (secondMarkerIdx === null || !isParallelMoMarkerToken(tokens[secondMarkerIdx])) continue;
    if (!parallelMoLemmaIdentity(positive.lemma, negative.lemma)) continue;
    if (isCarrierOnlyEquivalencePredicateAfter(tokens, secondMarkerIdx)) continue;
    evidence.push({
      kind: "zero_nominalized_parallel_mo",
      lemma: positive.lemma,
      positiveHeadIdx: positive.headIdx,
      positiveChainEndIdx: positive.chainEndIdx,
      firstMarkerIdx,
      negativeHeadIdx: negative.headIdx,
      negativeChainEndIdx: negative.chainEndIdx,
      secondMarkerIdx,
    });
  }
  return evidence;
}

interface ParallelMoPredicateChainShape {
  readonly lemma: string;
  readonly headIdx: number;
  readonly chainEndIdx: number;
  readonly negated: boolean;
}

function isParallelMoMarkerToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && token.surface === "も" && (token.pos & POS01) === 助詞_係助詞;
}

function isParallelMoChainAuxToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 助動詞;
}

function isParallelMoChainClosingForm(pos: number): boolean {
  const form = pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function parallelMoNextItemStart<T extends ClauseToken>(
  tokens: readonly T[],
  from: number
): number | null {
  for (let idx = from; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) return null;
    if (isClauseHardTerminalPunctuationToken(token)) return null;
    if (isClauseEvidenceTransparentPunctuation(token)) continue;
    if (isAdverbCapable(token)) continue;
    return idx;
  }
  return null;
}

function parallelMoPredicateChainBefore<T extends ClauseToken>(
  tokens: readonly T[],
  markerIdx: number
): ParallelMoPredicateChainShape | null {
  const chainEndIdx = previousNonSpaceIndex(tokens, markerIdx);
  const chainEnd = chainEndIdx === null ? undefined : tokens[chainEndIdx];
  if (chainEndIdx === null || chainEnd === undefined || !isParallelMoChainClosingForm(chainEnd.pos)) {
    return null;
  }
  let negated = false;
  let idx: number | null = chainEndIdx;
  while (idx !== null) {
    const token = tokens[idx];
    if (token === undefined) return null;
    if (isNegativeAuxiliaryPos(token.pos)) negated = true;
    if (isVerbPredicateToken(token)) {
      const shape = pairedVolitionalPredicateShape(tokens, idx, token);
      return { lemma: shape.lemma, headIdx: shape.predicateIdx, chainEndIdx, negated };
    }
    if (!isParallelMoChainAuxToken(token)) return null;
    idx = previousNonSpaceIndex(tokens, idx);
  }
  return null;
}

function parallelMoPredicateChainAfter<T extends ClauseToken>(
  tokens: readonly T[],
  startIdx: number
): ParallelMoPredicateChainShape | null {
  const start = tokens[startIdx];
  if (start === undefined) return null;
  let inflectionIdx: number;
  let headIdx: number;
  let lemma: string;
  if (isVerbPredicateToken(start)) {
    const shape = pairedVolitionalPredicateShape(tokens, startIdx, start);
    inflectionIdx = startIdx;
    headIdx = shape.predicateIdx;
    lemma = shape.lemma;
  } else if (isSahenCapableNominal(start)) {
    const suruIdx = nextNonSpaceIndex(tokens, startIdx + 1, tokens.length);
    const suru = suruIdx === null ? undefined : tokens[suruIdx];
    if (
      suruIdx === null ||
      suru === undefined ||
      !isVerbPredicateToken(suru) ||
      (suru.dictionaryForm || suru.surface) !== "する"
    ) {
      return null;
    }
    inflectionIdx = suruIdx;
    headIdx = startIdx;
    lemma = `${start.dictionaryForm || start.surface}+する`;
  } else {
    return null;
  }
  let negated = isNegativeAuxiliaryPos(tokens[inflectionIdx]!.pos);
  let chainEndIdx = inflectionIdx;
  for (;;) {
    const nextIdx = nextNonSpaceIndex(tokens, chainEndIdx + 1, tokens.length);
    const next = nextIdx === null ? undefined : tokens[nextIdx];
    if (nextIdx === null || next === undefined || !isParallelMoChainAuxToken(next)) break;
    if (isNegativeAuxiliaryPos(next.pos)) negated = true;
    chainEndIdx = nextIdx;
  }
  return isParallelMoChainClosingForm(tokens[chainEndIdx]!.pos)
    ? { lemma, headIdx, chainEndIdx, negated }
    : null;
}

function isCarrierOnlyEquivalencePredicateAfter<T extends ClauseToken>(
  tokens: readonly T[],
  markerIdx: number
): boolean {
  const followerIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  const follower = followerIdx === null ? undefined : tokens[followerIdx];
  return follower !== undefined &&
    CARRIER_ONLY_EQUIVALENCE_NOUNS.has(follower.dictionaryForm || follower.surface) &&
    isNaAdjCapable(follower);
}

function parallelMoLemmaIdentity(positiveLemma: string, negativeLemma: string): boolean {
  return positiveLemma === negativeLemma ||
    (negativeLemma === "する" && positiveLemma.endsWith("+する"));
}

const zeroNominalizedParallelMoMarkerCache = new WeakMap<object, ReadonlySet<number>>();

export function zeroNominalizedParallelMoMarkerIndices<T extends ClauseToken>(
  tokens: readonly T[]
): ReadonlySet<number> {
  const cached = zeroNominalizedParallelMoMarkerCache.get(tokens);
  if (cached !== undefined) {
    return cached;
  }
  const markers = new Set<number>();
  for (const evidence of collectZeroNominalizedParallelMoEvidence(tokens)) {
    markers.add(evidence.firstMarkerIdx);
    markers.add(evidence.secondMarkerIdx);
  }
  zeroNominalizedParallelMoMarkerCache.set(tokens, markers);
  return markers;
}


export function parallelPredicateMoOwnershipYieldMarkers<T extends ClauseToken>(
  tokens: readonly T[]
): ReadonlySet<number> {
  const cached = parallelPredicateMoOwnershipYieldCache.get(tokens);
  if (cached !== undefined) {
    return cached;
  }
  const markers = new Set<number>([
    ...parallelPredicateMoSeriesMarkerIndices(tokens),
    ...zeroNominalizedParallelMoMarkerIndices(tokens)
  ]);
  parallelPredicateMoOwnershipYieldCache.set(tokens, markers);
  return markers;
}

const parallelPredicateMoOwnershipYieldCache = new WeakMap<object, ReadonlySet<number>>();

function parallelPredicateMoSeriesMarkerIndices<T extends ClauseToken>(
  tokens: readonly T[]
): ReadonlySet<number> {
  const cached = parallelPredicateMoSeriesCache.get(tokens);
  if (cached !== undefined) {
    return cached;
  }
  const markers = new Set<number>();
  for (let markerIdx = 1; markerIdx < tokens.length; markerIdx += 1) {
    if (isParallelMoMarkerToken(tokens[markerIdx]) && hasParallelPredicateMoBefore(tokens, markerIdx)) {
      markers.add(markerIdx);
    }
  }
  parallelPredicateMoSeriesCache.set(tokens, markers);
  return markers;
}

const parallelPredicateMoSeriesCache = new WeakMap<object, ReadonlySet<number>>();

function hasParallelPredicateMoBefore<T extends ClauseToken>(
  tokens: readonly T[],
  markerIdx: number
): boolean {
  for (let idx = markerIdx - 1; idx > 0; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined || isClauseHardTerminalPunctuationToken(token)) {
      return false;
    }
    if (isParallelMoMarkerToken(token)) {
      return isParallelMoChainClosingToken(tokens[idx - 1]);
    }
    if (isWeakPunctuationToken(token)) {
      if (isRenyouSuspendedPredicateToken(tokens[idx - 1])) {
        return false;
      }
      continue;
    }
    if (!isPredicateChainToken(token)) {
      return false;
    }
  }
  return false;
}

function isPredicateChainToken(token: ClauseToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助動詞 || pos0in(pos0, PREDICATE_BITS);
}

function isParallelMoChainClosingToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && isPredicateChainToken(token) && isTerminalOrAttributiveInflection(token.pos);
}

function isRenyouSuspendedPredicateToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && isPredicateChainToken(token) && (token.pos & POS5A) === 連用形_;
}

export interface RenyouFocusParallelSeriesEvidence {
  readonly kind: "renyou_focus_parallel_series";
  readonly markerIdxs: readonly number[];
  readonly finalMarkerIdx: number;
}

export function collectRenyouFocusParallelSeriesEvidence<T extends ClauseToken>(
  tokens: readonly T[]
): readonly RenyouFocusParallelSeriesEvidence[] {
  const successors = renyouFocusParallelItemSuccessors(tokens);
  const nonFinal = new Set<number>(successors.keys());
  const continued = new Set<number>(successors.values());
  const evidence: RenyouFocusParallelSeriesEvidence[] = [];
  for (const headMarkerIdx of nonFinal) {
    if (continued.has(headMarkerIdx)) continue;
    const markerIdxs: number[] = [headMarkerIdx];
    let cursor = headMarkerIdx;
    for (;;) {
      const next = successors.get(cursor);
      if (next === undefined) break;
      markerIdxs.push(next);
      cursor = next;
    }
    evidence.push({
      kind: "renyou_focus_parallel_series",
      markerIdxs,
      finalMarkerIdx: markerIdxs[markerIdxs.length - 1]!
    });
  }
  return evidence;
}

const renyouFocusParallelSeriesCache = new WeakMap<object, ReadonlyMap<number, number>>();

export function renyouFocusParallelSeriesFinalMarkerByItem<T extends ClauseToken>(
  tokens: readonly T[]
): ReadonlyMap<number, number> {
  const cached = renyouFocusParallelSeriesCache.get(tokens);
  if (cached !== undefined) {
    return cached;
  }
  const byItem = new Map<number, number>();
  for (const evidence of collectRenyouFocusParallelSeriesEvidence(tokens)) {
    for (const markerIdx of evidence.markerIdxs) {
      if (markerIdx !== evidence.finalMarkerIdx) {
        byItem.set(markerIdx, evidence.finalMarkerIdx);
      }
    }
  }
  renyouFocusParallelSeriesCache.set(tokens, byItem);
  return byItem;
}

function renyouFocusParallelItemSuccessors<T extends ClauseToken>(
  tokens: readonly T[]
): ReadonlyMap<number, number> {
  const successors = new Map<number, number>();
  for (let markerIdx = 1; markerIdx < tokens.length; markerIdx += 1) {
    if (!isParallelMoMarkerToken(tokens[markerIdx])) continue;
    if (renyouFocusItemChainHeadBefore(tokens, markerIdx) === null) continue;
    const nextStartIdx = parallelMoNextItemStart(tokens, markerIdx + 1);
    if (nextStartIdx === null) continue;
    const nextChainEndIdx = renyouFocusItemChainEndAfter(tokens, nextStartIdx);
    if (nextChainEndIdx === null) continue;
    const nextMarkerIdx = nextNonSpaceIndex(tokens, nextChainEndIdx + 1, tokens.length);
    if (nextMarkerIdx === null || !isParallelMoMarkerToken(tokens[nextMarkerIdx])) continue;
    successors.set(markerIdx, nextMarkerIdx);
  }
  return successors;
}

function renyouFocusItemChainHeadBefore<T extends ClauseToken>(
  tokens: readonly T[],
  markerIdx: number
): number | null {
  const chainEndIdx = previousNonSpaceIndex(tokens, markerIdx);
  const chainEnd = chainEndIdx === null ? undefined : tokens[chainEndIdx];
  if (chainEndIdx === null || chainEnd === undefined || (chainEnd.pos & POS5A) !== 連用形_) {
    return null;
  }
  let idx: number | null = chainEndIdx;
  while (idx !== null) {
    const token = tokens[idx];
    if (token === undefined) return null;
    if (isVerbPredicateToken(token)) return idx;
    if (!isParallelMoChainAuxToken(token)) return null;
    idx = previousNonSpaceIndex(tokens, idx);
  }
  return null;
}

function renyouFocusItemChainEndAfter<T extends ClauseToken>(
  tokens: readonly T[],
  startIdx: number
): number | null {
  const start = tokens[startIdx];
  if (start === undefined) {
    return null;
  }
  let chainEndIdx = startIdx;
  if (!isVerbPredicateToken(start)) {
    if (!isSahenCapableNominal(start)) {
      return null;
    }
    const suruIdx = nextNonSpaceIndex(tokens, startIdx + 1, tokens.length);
    const suru = suruIdx === null ? undefined : tokens[suruIdx];
    if (
      suruIdx === null ||
      suru === undefined ||
      !isVerbPredicateToken(suru) ||
      (suru.dictionaryForm || suru.surface) !== "する"
    ) {
      return null;
    }
    chainEndIdx = suruIdx;
  }
  for (;;) {
    const nextIdx = nextNonSpaceIndex(tokens, chainEndIdx + 1, tokens.length);
    const next = nextIdx === null ? undefined : tokens[nextIdx];
    if (nextIdx === null || next === undefined || !isParallelMoChainAuxToken(next)) break;
    chainEndIdx = nextIdx;
  }
  return (tokens[chainEndIdx]!.pos & POS5A) === 連用形_ ? chainEndIdx : null;
}
