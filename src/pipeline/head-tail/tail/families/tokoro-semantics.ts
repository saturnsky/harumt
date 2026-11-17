
import { koreanPredicateAuxChain, renderKoreanPredicateConnective } from "../../../../generator/aux-map.js";
import { irregularType, type IrregularType } from "../../../../generator/conjugator.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { MatcherToken } from "../../../matchers.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { getArgumentNounBeforeParticle, PredicateArgumentView } from "../../candidate/semantic-classifiers.js";
import { activeProtoLayout, activeProtoScopedScanEnd } from "../../../clause-layout/proto-state.js";
import {
  clauseProjectionEvidenceWindowForToken,
  isClauseEvidenceTransparentPunctuation
} from "../../../clause-layout/index.js";
import { caseParticleMarkerRelationAt, nominalizerReasonConnectiveRelationAt } from "../../boundary/marker.js";

import { transparentTokenRelationForConsumer } from "../../boundary/punctuation.js";
import { isHelplessEvaluativeAdjectiveToken } from "../postverb-tail-classifier.js";

import {
  POS0,
  POS4,
  POS5A,
  サ行変格,
  記号,
  形状詞,
  形容詞0,
  助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  接続詞,
  接尾辞,
  動詞,
  副詞,
  補助記号,
  未然形_,
  名詞,
  連体形_,
  連用形_,
  pos0in, PREDICATE_BITS,
} from "../../../../types/pos.js";

export function isTokoroResultHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null, lookups: LookupTables): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isTokoroResultHeadToken(tokens!, headIdx, lookups);
}

export function isTokoroTemporalDeHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null, lookups: LookupTables): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isTokoroTemporalDeHeadToken(tokens!, headIdx, lookups);
}

export function isKoroTemporalNiHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isKoroTemporalNiHeadToken(tokens!, headIdx);
}

export function isTokoroConcessiveDeHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null, lookups: LookupTables): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isTokoroConcessiveDeHeadToken(tokens!, headIdx, lookups);
}

export function isTokoroAlmostHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null, lookups: LookupTables): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isTokoroAlmostHeadToken(tokens!, headIdx, lookups);
}

export function isTokoroAboutToHeadContext(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null, lookups: LookupTables): boolean {
  const headIdx = tokoroHeadIndex(headNounToken, tokens, contentIdx);
  return headIdx === null ? false : isTokoroAboutToHeadToken(tokens!, headIdx, lookups);
}


export function isTokoroResultHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (!isTokoroPastHeadToken(tokens, headIdx) || tokoroPastContentIdx(tokens, headIdx) === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, headIdx + 1) ?? tokens.length;
  const next = tokens[nextIdx];
  return next !== undefined && (lookups.GRAMMAR_BOUNDARY_CLAUSE_RESULT_SURFACES.has(next.surface) || (next.pos & POS0) === 補助記号 || (next.pos & POS0) === 記号);
}

const TOKORO_REPORT_SOURCE_MAX_JOIN_TOKENS = 4;

export function isTokoroReportSourceHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (!isTokoroPastHeadToken(tokens, headIdx) || tokoroPastContentIdx(tokens, headIdx) === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  if (nextIdx === null) {
    return false;
  }
  const next = tokens[nextIdx];
  if (next === undefined) {
    return false;
  }
  if (lookups.TOKORO_REPORT_SOURCE_SUFFIXES.has(next.surface) || lookups.TOKORO_REPORT_SOURCE_SUFFIXES.has(next.dictionaryForm)) {
    return true;
  }
  let joined = "";
  let joinIdx: number | null = nextIdx;
  for (let count = 0; count < TOKORO_REPORT_SOURCE_MAX_JOIN_TOKENS && joinIdx !== null; count += 1) {
    const token = tokens[joinIdx];
    if (token === undefined) {
      break;
    }
    joined += token.surface;
    if (lookups.TOKORO_REPORT_SOURCE_SUFFIXES.has(joined)) {
      return true;
    }
    joinIdx = nextNonSpaceIndex(tokens, joinIdx + 1);
  }
  return false;
}

export function tokoroEvidenceHeadShape(tokens: readonly MatcherToken[], headIdx: number): number | null {
  if (!isTokoroPastHeadToken(tokens, headIdx) || tokoroPastContentIdx(tokens, headIdx) === null) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  if (nextIdx === null) {
    return null;
  }
  const next = tokens[nextIdx];
  if (next === undefined || (next.pos & POS0) === 助詞 || (next.pos & POS0) === 補助記号 || (next.pos & POS0) === 記号) {
    return null;
  }
  return nextIdx;
}

export function isTokoroEvidenceHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  const nextIdx = tokoroEvidenceHeadShape(tokens, headIdx);
  if (nextIdx === null) {
    return false;
  }
  return scanTokoroFollowingPredicate(tokens, nextIdx, 8, lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS, null, lookups, true);
}

export function isTokoroSituationHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (headIdx < 0 || headIdx >= tokens.length || !isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  const prev = tokoroPrevContentToken(tokens, headIdx);
  if (prev === null || ((prev.pos & POS0) !== 形容詞0 && (prev.pos & POS0) !== 形状詞)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  if (nextIdx === null) {
    return false;
  }
  const next = tokens[nextIdx];
  if (next === undefined || (next.pos & POS0) === 助詞) {
    return false;
  }
  const projectionWindow = tokoroClauseProjectionEvidenceWindow(tokens, headIdx);
  let evidenceStart = nextIdx;
  if ((next.pos & POS0) === 補助記号 || (next.pos & POS0) === 記号) {
    if (
      projectionWindow === null ||
      nextIdx < projectionWindow.start ||
      nextIdx >= projectionWindow.end ||
      !isClauseEvidenceTransparentPunctuation(next)
    ) {
      return false;
    }
    const afterPunctuationIdx = nextNonSpaceIndex(tokens, nextIdx + 1);
    if (afterPunctuationIdx === null) {
      return false;
    }
    const afterPunctuation = tokens[afterPunctuationIdx];
    if (
      afterPunctuation === undefined ||
      (afterPunctuation.pos & POS0) === 助詞 ||
      (afterPunctuation.pos & POS0) === 補助記号 ||
      (afterPunctuation.pos & POS0) === 記号
    ) {
      return false;
    }
    evidenceStart = afterPunctuationIdx;
  }
  if (projectionWindow !== null) {
    return scanTokoroFollowingPredicate(tokens, evidenceStart, 6, lookups.TOKORO_SITUATION_AFTER_FORMS, null, lookups, true, {
      upperBound: projectionWindow.end
    });
  }
  return scanTokoroFollowingPredicate(tokens, evidenceStart, 6, lookups.TOKORO_SITUATION_AFTER_FORMS, null, lookups, true);
}

export function isTokoroTemporalDeHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (!isTokoroPastHeadToken(tokens, headIdx)) {
    return false;
  }
  const contentIdx = tokoroPastContentIdx(tokens, headIdx);
  if (contentIdx === null) {
    return false;
  }
  const prevForm = tokens[contentIdx]?.dictionaryForm || tokens[contentIdx]?.surface || "";
  if (!lookups.TOKORO_TEMPORAL_DE_PREV_FORMS.has(prevForm)) {
    return false;
  }
  const suffixIdx = tokoroDeSuffixIdx(tokens, headIdx);
  if (suffixIdx === null) {
    return false;
  }
  return !hasTokoroConcessiveSignal(tokens, headIdx, suffixIdx, lookups);
}

export function isKoroTemporalNiHeadToken(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (!isKoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  if (!isKoroPastHeadToken(tokens, headIdx) || tokoroPastContentIdx(tokens, headIdx) === null) {
    return false;
  }
  return koroNiSuffixIdx(tokens, headIdx) !== null;
}

export function isTokoroConcessiveDeHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (!isTokoroPastHeadToken(tokens, headIdx)) {
    return false;
  }
  const contentIdx = tokoroPastContentIdx(tokens, headIdx);
  if (contentIdx === null) {
    return false;
  }
  const suffixIdx = tokoroDeSuffixIdx(tokens, headIdx);
  if (suffixIdx === null) {
    return false;
  }
  const prevForm = tokens[contentIdx]?.dictionaryForm || tokens[contentIdx]?.surface || "";
  const temporalSignal = lookups.TOKORO_TEMPORAL_DE_PREV_FORMS.has(prevForm);
  const concessiveSignal = hasTokoroConcessiveSignal(tokens, headIdx, suffixIdx, lookups);
  return concessiveSignal && !temporalSignal;
}

function isTokoroProgressHead(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (headIdx < 0 || headIdx >= tokens.length || !isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  const prevForm = prev?.dictionaryForm ?? "";
  const prevPos0 = (prev?.pos ?? 0) & POS0;
  if (prev === undefined || (!["いる", "おる", "てる"].includes(prevForm) && !["てる", "でる"].includes(prev.surface))) {
    return false;
  }
  return prevPos0 === 動詞 || prevPos0 === 助動詞;
}

export function isTokoroProgressNiHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (!isTokoroProgressHead(tokens, headIdx)) {
    return false;
  }
  const suffixIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  if (suffixIdx === null) {
    return false;
  }
  if (caseParticleMarkerRelationAt(tokens, suffixIdx, {
    acceptedSurfaces: ["に"],
    consumers: ["tokoro_semantics"]
  }) === null) {
    return false;
  }
  return hasTokoroProgressIntrusionSignal(tokens, suffixIdx + 1, lookups);
}

export function isTokoroProgressWoObservationHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  return isTokoroProgressWoHeadToken(tokens, headIdx) && hasTokoroProgressObservationSignal(tokens, tokoroAfterSuffixStart(tokens, headIdx), lookups);
}

export function isTokoroProgressWoInterruptionHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  return isTokoroProgressWoHeadToken(tokens, headIdx) && hasTokoroProgressInterruptionSignal(tokens, tokoroAfterSuffixStart(tokens, headIdx), lookups);
}

export function tokoroAfterSuffixStart(tokens: readonly MatcherToken[], headIdx: number): number {
  const suffixIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  return (suffixIdx ?? headIdx) + 1;
}

export function isTokoroProgressWoHeadToken(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (!isTokoroProgressHead(tokens, headIdx)) {
    return false;
  }
  const suffixIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  return caseParticleMarkerRelationAt(tokens, suffixIdx ?? -1, {
    acceptedSurfaces: ["を"],
    consumers: ["tokoro_semantics"]
  }) !== null;
}

export function isTokoroTraitGaHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (headIdx < 0 || headIdx >= tokens.length || !isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  const suffixIdx = nextNonSpaceIndex(tokens, headIdx + 1);
  if (suffixIdx === null) {
    return false;
  }
  if (caseParticleMarkerRelationAt(tokens, suffixIdx, {
    acceptedSurfaces: ["が"],
    consumers: ["tokoro_semantics"]
  }) === null) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  const prevPos0 = (prev?.pos ?? 0) & POS0;
  const prevForm = prev?.dictionaryForm || prev?.surface || "";
  const prevOk =
    prevPos0 === 動詞 ||
    prevPos0 === 形容詞0 ||
    prevPos0 === 形状詞 ||
    (prevPos0 === 助動詞 && ["ない", "ぬ", "無い"].includes(prevForm)) ||
    (prevPos0 === 助動詞 && prevForm === "だ" && ((prev?.pos ?? 0) & POS5A) === 連体形_) ||
    (prevPos0 === 助動詞 && ["たがる", "させる", "せる"].includes(prevForm) && ((prev?.pos ?? 0) & POS5A) === 連体形_);
  if (!prevOk) {
    return false;
  }
  const nextIdx = tokoroNextContentIdx(tokens, suffixIdx + 1);
  if (nextIdx === null) {
    return false;
  }
  const nextForm = tokens[nextIdx]?.dictionaryForm || tokens[nextIdx]?.surface || "";
  return lookups.TOKORO_TRAIT_GA_AFTER_FORMS.has(nextForm) && tokoroPredicateTakesHeadArgument(tokens, nextIdx, "が", lookups);
}

export function isTokoroAlmostHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  return isTokoroSurfaceHead(tokens[headIdx]) && tokoroAlmostTailInfo(tokens, headIdx) !== null && hasTokoroAlmostSignal(tokens, headIdx, lookups);
}

export function isTokoroAboutToHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (headIdx < 0 || headIdx >= tokens.length || !isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  if (tokoroCopulaTailInfo(tokens, headIdx) === null) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null || ((tokens[prevIdx]?.pos ?? 0) & POS0) !== 動詞) {
    return false;
  }
  return hasTokoroAboutToSignal(tokens, headIdx, lookups);
}

export function isTokoroTeiruCopulaProgressHeadToken(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (headIdx < 0 || headIdx >= tokens.length || !isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  if (tokoroCopulaTailInfo(tokens, headIdx) === null) {
    return false;
  }
  const contentIdx = tokoroTeiruContentIdx(tokens, headIdx);
  if (contentIdx === null) {
    return false;
  }
  const contentForm = tokens[contentIdx]?.dictionaryForm || tokens[contentIdx]?.surface || "";
  if (lookups.TOKORO_TEIRU_COPULA_PLACE_LIKE_FORMS.has(contentForm)) {
    return false;
  }
  return lookups.TOKORO_TEIRU_COPULA_PROGRESS_FORMS.has(contentForm) || hasTokoroTeiruCopulaTimeCue(tokens, headIdx, lookups);
}


export function tokoroCopulaTailInfo(tokens: readonly MatcherToken[], headIdx: number): readonly [consumed: number, polite: boolean, past: boolean] | null {
  const idx = nextNonSpaceIndex(tokens, headIdx + 1) ?? tokens.length;
  const copula = tokens[idx];
  if (copula === undefined || (copula.pos & POS0) !== 助動詞 || ((copula.pos & POS4) !== 助動詞_ダ && (copula.pos & POS4) !== 助動詞_デス)) {
    return null;
  }
  const polite = (copula.pos & POS4) === 助動詞_デス;
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1) ?? tokens.length;
  const past = tokens[nextIdx];
  if (past?.dictionaryForm === "た" && (past.pos & POS0) === 助動詞 && ((past.pos & POS4) === 0 || (past.pos & POS4) === 助動詞_タ)) {
    return [nextIdx - headIdx + 1, polite, true];
  }
  return [idx - headIdx + 1, polite, false];
}

export function tokoroTeiruContentIdx(tokens: readonly MatcherToken[], headIdx: number): number | null {
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return null;
  }
  const prev = tokens[prevIdx];
  const prevForm = prev?.dictionaryForm ?? "";
  const prevPos0 = (prev?.pos ?? 0) & POS0;
  if (prev === undefined || (!["いる", "おる", "てる"].includes(prevForm) && !["てる", "でる"].includes(prev.surface))) {
    return null;
  }
  if (prevPos0 !== 動詞 && prevPos0 !== 助動詞) {
    return null;
  }
  let contentIdx = prevIdx - 1;
  while (contentIdx >= 0) {
    const pos0 = (tokens[contentIdx]?.pos ?? 0) & POS0;
    if (pos0 === 助詞 || pos0 === 助動詞 || pos0 === 接尾辞) {
      contentIdx -= 1;
      continue;
    }
    break;
  }
  if (contentIdx < 0) {
    return null;
  }
  const contentPos0 = (tokens[contentIdx]?.pos ?? 0) & POS0;
  return pos0in(contentPos0, PREDICATE_BITS) ? contentIdx : null;
}

export function hasTokoroTeiruCopulaTimeCue(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  return tokoroWindowContent(tokens, headIdx - 12, headIdx).some((token) =>
    lookups.TOKORO_TEIRU_COPULA_TIME_CUES.has(token.surface) || lookups.TOKORO_TEIRU_COPULA_TIME_CUES.has(token.dictionaryForm)
  );
}

export function tokoroAlmostTailInfo(tokens: readonly MatcherToken[], headIdx: number): readonly [consumed: number, polite: boolean, past: boolean] | null {
  const tail = tokoroCopulaTailInfo(tokens, headIdx);
  if (tail === null || !tail[2]) {
    return null;
  }
  return tail;
}

export function tokoroHeadIndex(headNounToken: MatcherToken | null, tokens: readonly MatcherToken[] | null, contentIdx: number | null): number | null {
  if (headNounToken === null || tokens === null || contentIdx === null) {
    return null;
  }
  for (let idx = contentIdx + 1; idx < tokens.length; idx += 1) {
    if (tokens[idx] === headNounToken) {
      return idx;
    }
  }
  for (let idx = contentIdx + 1; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && token.dictionaryForm === headNounToken.dictionaryForm && token.surface === headNounToken.surface && token.pos === headNounToken.pos) {
      return idx;
    }
  }
  return null;
}

export function isTokoroSurfaceHead(token: MatcherToken | undefined): boolean {
  return token !== undefined && token.surface === "ところ" && token.dictionaryForm === "ところ" && (token.pos & POS0) === 名詞;
}

export function isKoroSurfaceHead(token: MatcherToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return token.surface === "ころ" || token.surface === "頃" || form === "ころ" || form === "頃";
}

export function isTokoroPastHeadToken(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (!isTokoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  return prev !== undefined && (prev.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 連体形_);
}

function isKoroPastHeadToken(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (!isKoroSurfaceHead(tokens[headIdx])) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  return prev !== undefined && (prev.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 連体形_);
}

export function tokoroPastContentIdx(tokens: readonly MatcherToken[], headIdx: number): number | null {
  let idx = headIdx - 2;
  while (idx >= 0) {
    const pos0 = (tokens[idx]?.pos ?? 0) & POS0;
    if (pos0 === 助動詞) {
      idx -= 1;
      continue;
    }
    break;
  }
  const token = tokens[idx];
  return token !== undefined && (pos0in(token.pos, PREDICATE_BITS)) ? idx : null;
}

export function tokoroDeSuffixIdx(tokens: readonly MatcherToken[], headIdx: number): number | null {
  const idx = nextNonSpaceIndex(tokens, headIdx + 1) ?? tokens.length;
  return caseParticleMarkerRelationAt(tokens, idx, {
    acceptedSurfaces: ["で"],
    consumers: ["tokoro_semantics"]
  }) !== null ? idx : null;
}

export function koroNiSuffixIdx(tokens: readonly MatcherToken[], headIdx: number): number | null {
  const idx = nextNonSpaceIndex(tokens, headIdx + 1) ?? tokens.length;
  return caseParticleMarkerRelationAt(tokens, idx, {
    acceptedSurfaces: ["に"],
    consumers: ["tokoro_semantics"]
  }) !== null ? idx : null;
}

export function koroTemporalNiSuffixConsumedAndText(tokens: readonly MatcherToken[], headIdx: number): readonly [consumed: number, text: string] | null {
  const niIdx = koroNiSuffixIdx(tokens, headIdx);
  if (niIdx === null) {
    return null;
  }
  const afterNi = nextNonSpaceIndex(tokens, niIdx + 1);
  if (afterNi !== null && tokens[afterNi]?.surface === "は" && ((tokens[afterNi]?.pos ?? 0) & POS0) === 助詞) {
    return [(afterNi - headIdx) + 1, "때쯤에는"];
  }
  return [(niIdx - headIdx) + 1, "때쯤에"];
}

export function tokoroWindowContent(tokens: readonly MatcherToken[], start: number, end: number): readonly MatcherToken[] {
  return tokens.slice(Math.max(0, start), Math.min(tokens.length, end)).filter((token, offset) =>
    transparentTokenRelationForConsumer(token, Math.max(0, start) + offset, "tokoro_semantics") === null
  );
}

export function hasTokoroAlmostSignal(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  const contentIndices: number[] = [];
  for (let idx = Math.max(0, headIdx - 12); idx < Math.min(tokens.length, headIdx); idx += 1) {
    const token = tokens[idx];
    if (
      token !== undefined &&
      transparentTokenRelationForConsumer(token, idx, "tokoro_semantics") === null
    ) {
      contentIndices.push(idx);
    }
  }
  return contentIndices.some((tokenIdx, idx) => {
    const token = tokens[tokenIdx]!;
    const surface = token.surface;
    const form = token.dictionaryForm;
    if (lookups.TOKORO_ALMOST_BEFORE_SURFACES.has(surface) || lookups.TOKORO_ALMOST_BEFORE_SURFACES.has(form)) {
      return true;
    }
    if (
      surface === "もう" &&
      idx + 2 < contentIndices.length &&
      (tokens[contentIndices[idx + 1]!]?.surface === "すこし" || tokens[contentIndices[idx + 1]!]?.surface === "少し") &&
      caseParticleMarkerRelationAt(tokens, contentIndices[idx + 2]!, {
        acceptedSurfaces: ["で"],
        consumers: ["tokoro_semantics"]
      }) !== null
    ) {
      return true;
    }
    if (
      form === "思う" &&
      idx + 1 < contentIndices.length &&
      (tokens[contentIndices[idx + 1]!]!.surface === "ず" || tokens[contentIndices[idx + 1]!]!.dictionaryForm === "ず" || tokens[contentIndices[idx + 1]!]!.dictionaryForm === "ぬ")
    ) {
      return true;
    }
    return false;
  });
}

export function hasTokoroAboutToSignal(tokens: readonly MatcherToken[], headIdx: number, lookups: LookupTables): boolean {
  if (tokoroWindowContent(tokens, headIdx - 8, headIdx).some((token) => lookups.TOKORO_ABOUT_TO_BEFORE_SURFACES.has(token.surface) || lookups.TOKORO_ABOUT_TO_BEFORE_SURFACES.has(token.dictionaryForm))) {
    return true;
  }
  for (let idx = Math.max(0, headIdx - 10); idx < headIdx - 1; idx += 1) {
    const first = tokens[idx];
    if (first?.surface !== "今" && first?.surface !== "これ") {
      continue;
    }
    const next = nextNonSpaceIndex(tokens, idx + 1);
    if (
      next !== null &&
      next < headIdx &&
      caseParticleMarkerRelationAt(tokens, next, {
        acceptedSurfaces: ["から"],
        consumers: ["tokoro_semantics"]
      }) !== null
    ) {
      return true;
    }
  }
  return false;
}

export function hasTokoroProgressIntrusionSignal(tokens: readonly MatcherToken[], start: number, lookups: LookupTables): boolean {
  return scanTokoroFollowingPredicate(tokens, start, 6, lookups.TOKORO_PROGRESS_NI_AFTER_FORMS, "に", lookups);
}

export function tokoroNextContentIdx(tokens: readonly MatcherToken[], start: number): number | null {
  let idx = start;
  while (idx < tokens.length) {
    const pos0 = (tokens[idx]?.pos ?? 0) & POS0;
    if (pos0 === 助詞 || pos0 === 助動詞 || pos0 === 副詞) {
      idx += 1;
      continue;
    }
    if (pos0 === 補助記号 || pos0 === 記号) {
      return null;
    }
    return idx;
  }
  return null;
}

export function hasTokoroProgressObservationSignal(tokens: readonly MatcherToken[], start: number, lookups: LookupTables): boolean {
  return scanTokoroFollowingPredicate(tokens, start, 8, lookups.TOKORO_PROGRESS_WO_OBSERVATION_FORMS, "を", lookups, true);
}

export function hasTokoroProgressInterruptionSignal(tokens: readonly MatcherToken[], start: number, lookups: LookupTables): boolean {
  return scanTokoroFollowingPredicate(tokens, start, 8, lookups.TOKORO_PROGRESS_WO_INTERRUPTION_FORMS, "を", lookups, true);
}

function scanTokoroFollowingPredicate(
  tokens: readonly MatcherToken[],
  start: number,
  maxSeen: number,
  forms: ReadonlySet<string>,
  particle: string | null,
  lookups: LookupTables,
  skipAdverbs = false,
  options: {
    readonly upperBound?: number;
  } = {}
): boolean {
  let seen = 0;
  let idx = start;
  const scopedEnd = activeProtoScopedScanEnd(tokens, start, "evidence_window");
  const upperBound = Math.min(tokens.length, options.upperBound ?? tokens.length, scopedEnd ?? tokens.length);
  while (idx < upperBound && seen < maxSeen) {
    const token = tokens[idx];
    const pos0 = (token?.pos ?? 0) & POS0;
    if (pos0 === 助詞 || pos0 === 助動詞 || (skipAdverbs && pos0 === 副詞)) {
      idx += 1;
      continue;
    }
    if (pos0 === 補助記号 || pos0 === 記号) {
      return false;
    }
    seen += 1;
    const form = token?.dictionaryForm || token?.surface || "";
    const formMatches = forms.has(form) ||
      (forms.has("すみません") && isTokoroFormulaicApologyPredicateStart(tokens, idx));
    if (formMatches && (particle === null || tokoroPredicateTakesHeadArgument(tokens, idx, particle, lookups))) {
      return true;
    }
    idx += 1;
  }
  return false;
}

function isTokoroFormulaicApologyPredicateStart(
  tokens: readonly MatcherToken[],
  idx: number
): boolean {
  const head = tokens[idx];
  if (head === undefined || !isTokoroSumuApologyStemToken(head)) {
    return false;
  }
  if ((head.pos & POS5A) === 連用形_) {
    const masuIdx = nextNonSpaceIndex(tokens, idx + 1);
    const masu = tokens[masuIdx ?? -1];
    const negativeIdx = masuIdx === null ? null : nextNonSpaceIndex(tokens, masuIdx + 1);
    const negative = tokens[negativeIdx ?? -1];
    return isTokoroMasuAuxToken(masu) && masu?.surface === "ませ" && isTokoroNuNegativeAuxToken(negative);
  }
  if ((head.pos & POS5A) === 未然形_) {
    const negativeIdx = nextNonSpaceIndex(tokens, idx + 1);
    const negative = tokens[negativeIdx ?? -1];
    return isTokoroNaiNegativeAuxToken(negative) || isTokoroNuNegativeAuxToken(negative);
  }
  return false;
}

function isTokoroSumuApologyStemToken(token: MatcherToken): boolean {
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form === "すむ" || form === "済む";
}

function isTokoroMasuAuxToken(token: MatcherToken | undefined): token is MatcherToken {
  return token !== undefined && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_マス);
}

function isTokoroNuNegativeAuxToken(token: MatcherToken | undefined): token is MatcherToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヌ) &&
    ((token.dictionaryForm || token.surface) === "ぬ" || token.surface === "ん");
}

function isTokoroNaiNegativeAuxToken(token: MatcherToken | undefined): token is MatcherToken {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
    (token.dictionaryForm || token.surface) === "ない";
}

function tokoroClauseProjectionEvidenceWindow(
  tokens: readonly MatcherToken[],
  headIdx: number
): { readonly start: number; readonly end: number } | null {
  const proto = activeProtoLayout();
  if (proto === null) {
    return null;
  }
  const window = clauseProjectionEvidenceWindowForToken(proto, tokens, headIdx);
  if (window === undefined || headIdx < window.start || headIdx >= window.end) {
    return null;
  }
  return window;
}

export function tokoroPredicateTakesHeadArgument(tokens: readonly MatcherToken[], predicateIdx: number, particle: string, lookups: LookupTables): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(predicateIdx);
  if (proto !== null && clause !== undefined) {
    for (const particleIdx of clause.particleIndices) {
      if (particleIdx >= predicateIdx || proto.isQuoteTrapped(particleIdx, predicateIdx)) {
        continue;
      }
      const particleToken = tokens[particleIdx];
      if (particleToken?.surface !== particle) {
        continue;
      }
      const noun = getArgumentNounBeforeParticle(tokens, particleIdx, lookups);
      if (noun !== null && lookups.TOKORO_ARGUMENT_FORMS.has(noun.dictionaryForm)) {
        return true;
      }
    }
    return false;
  }
  if (proto === null) {
    return false;
  }
  return new PredicateArgumentView(tokens, predicateIdx, { protoLayout: proto, lookups }).hasArgumentNounSurface(particle, Array.from(lookups.TOKORO_ARGUMENT_FORMS));
}

export function hasTokoroConcessiveSignal(tokens: readonly MatcherToken[], headIdx: number, suffixIdx: number, lookups: LookupTables): boolean {
  const beforeForms = new Set(tokoroWindowContent(tokens, headIdx - 10, headIdx).map((token) => token.surface || token.dictionaryForm));
  const afterForms = new Set(tokoroWindowContent(tokens, suffixIdx + 1, suffixIdx + 11).map((token) => token.surface || token.dictionaryForm));
  return intersects(beforeForms, lookups.TOKORO_CONCESSIVE_BEFORE_SURFACES) ||
    intersects(afterForms, lookups.TOKORO_CONCESSIVE_AFTER_FORMS) ||
    hasTokoroShouganaiSignal(tokens, suffixIdx + 1, suffixIdx + 12);
}

export function hasTokoroShouganaiSignal(tokens: readonly MatcherToken[], start: number, end: number): boolean {
  let idx = Math.max(0, start);
  const high = Math.min(tokens.length, end);
  while (idx < high) {
    const token = tokens[idx];
    if (isHelplessEvaluativeAdjectiveToken(token)) {
      return true;
    }
    if ((token?.surface || token?.dictionaryForm) !== "しょう") {
      idx += 1;
      continue;
    }
    const gaIdx = nextNonSpaceIndex(tokens, idx + 1);
    if (gaIdx === null || gaIdx >= high || tokens[gaIdx]?.surface !== "が") {
      idx += 1;
      continue;
    }
    const naiIdx = nextNonSpaceIndex(tokens, gaIdx + 1);
    if (naiIdx === null || naiIdx >= high) {
      return false;
    }
    const nai = tokens[naiIdx];
    if (nai !== undefined && ["ない", "無い"].includes(nai.dictionaryForm || nai.surface)) {
      return true;
    }
    idx += 1;
  }
  return false;
}

function intersects(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

export function tokoroConcessiveDeText(options: {
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly auxTokens: readonly MatcherToken[];
  readonly contentToken: MatcherToken;
  readonly sahenNoun?: string | null;
  readonly forcePassive: boolean;
  readonly lookups: LookupTables;
}): string {
  let connectiveAux = [...options.auxTokens];
  if (((connectiveAux.at(-1)?.pos ?? 0) & POS4) === 助動詞_タ) {
    connectiveAux = connectiveAux.slice(0, -1);
  }
  return renderKoreanPredicateConnective(
    options.koreanLemma,
    irregularType(options.irregular),
    options.koreanPos,
    koreanPredicateAuxChain(connectiveAux),
    "아/어도",
    {
      lookups: options.lookups,
      jpDictForm: options.contentToken.dictionaryForm,
      sahenCompound: isSahenContentToken(options.contentToken),
      ...(options.sahenNoun === undefined || options.sahenNoun === null ? {} : { sahenNoun: options.sahenNoun }),
      forcePassive: options.forcePassive,
      ...((options.contentToken.pos & POS4) === 0 ? {} : { verbConjType: options.contentToken.pos & POS4 })
    }
  );
}

export function tokoroSuffixConsumed(tokens: readonly MatcherToken[], start: number): number {
  const nextIdx = nextNonSpaceIndex(tokens, start + 1);
  return nextIdx === null ? 1 : (nextIdx - start) + 1;
}

export function tokoroNextContentForm(tokens: readonly MatcherToken[], start: number): string | null {
  let idx = start;
  while (idx < tokens.length) {
    const pos0 = (tokens[idx]?.pos ?? 0) & POS0;
    if (pos0 === 補助記号 || pos0 === 記号 || pos0 === 助詞 || pos0 === 接続詞 || pos0 === 助動詞) {
      idx += 1;
      continue;
    }
    return tokens[idx]?.dictionaryForm || tokens[idx]?.surface || null;
  }
  return null;
}

export function tokoroPrevContentToken(tokens: readonly MatcherToken[], start: number): MatcherToken | null {
  let idx = start - 1;
  while (idx >= 0) {
    const token = tokens[idx];
    const pos0 = (token?.pos ?? 0) & POS0;
    if (pos0 === 補助記号 || pos0 === 記号) {
      idx -= 1;
      continue;
    }
    if (pos0 === 助詞 || pos0 === 接続詞) {
      return null;
    }
    if (pos0 === 助動詞 || pos0 === 接尾辞) {
      idx -= 1;
      continue;
    }
    return token ?? null;
  }
  return null;
}

export function isTokoroOriginFromHead(tokens: readonly MatcherToken[], start: number, lookups: LookupTables): boolean {
  return isTokoroFromOrUntilHead(tokens, start, { suffix: "から", afterForms: lookups.TOKORO_ORIGIN_AFTER_FORMS });
}

export function isTokoroLimitUntilHead(tokens: readonly MatcherToken[], start: number, lookups: LookupTables): boolean {
  return isTokoroFromOrUntilHead(tokens, start, { suffix: "まで", afterForms: lookups.TOKORO_LIMIT_AFTER_FORMS });
}

function isTokoroFromOrUntilHead(
  tokens: readonly MatcherToken[],
  start: number,
  options: { readonly suffix: string; readonly afterForms: ReadonlySet<string> }
): boolean {
  const head = tokens[start];
  if (head === undefined || (head.pos & POS0) !== 名詞 || (head.dictionaryForm !== "ところ" && head.dictionaryForm !== "所" && head.reading !== "トコロ")) {
    return false;
  }
  const suffixIdx = nextNonSpaceIndex(tokens, start + 1);
  if (suffixIdx === null || tokens[suffixIdx]?.surface !== options.suffix) {
    return false;
  }
  const prev = tokoroPrevContentToken(tokens, start);
  if (prev === null || (prev.pos & POS0) !== 動詞) {
    return false;
  }
  const nextForm = tokoroNextContentForm(tokens, suffixIdx + 1);
  return nextForm !== null && options.afterForms.has(nextForm);
}

export function tokoroPrevContentForm(tokens: readonly MatcherToken[], start: number): string | null {
  const token = tokoroPrevContentToken(tokens, start);
  return token === null ? null : token.dictionaryForm || token.surface;
}

export function tokoroPrevIsKiNiNaru(tokens: readonly MatcherToken[], start: number): boolean {
  let idx = start - 1;
  while (idx >= 0) {
    const pos0 = (tokens[idx]?.pos ?? 0) & POS0;
    if (pos0 === 補助記号 || pos0 === 記号 || pos0 === 助動詞 || pos0 === 接尾辞) {
      idx -= 1;
      continue;
    }
    break;
  }
  if (idx < 0 || tokens[idx]?.dictionaryForm !== "なる") {
    return false;
  }
  const niIdx = previousNonSpaceIndex(tokens, idx);
  const kiIdx = niIdx === null ? null : previousNonSpaceIndex(tokens, niIdx);
  return niIdx !== null &&
    kiIdx !== null &&
    caseParticleMarkerRelationAt(tokens, niIdx, {
      acceptedSurfaces: ["に"],
      consumers: ["tokoro_semantics"]
    }) !== null &&
    tokens[kiIdx]?.dictionaryForm === "気";
}

export function isTokoroDesiredResultHead(tokens: readonly MatcherToken[], start: number): boolean {
  return tokoroCopulaTailInfo(tokens, start) !== null && tokoroPrevContentForm(tokens, start) === "望む";
}

export function isTokoroKininaruHead(tokens: readonly MatcherToken[], start: number): boolean {
  return tokoroCopulaTailInfo(tokens, start) !== null &&
    (tokoroPrevContentForm(tokens, start) === "気になる" || tokoroPrevIsKiNiNaru(tokens, start));
}

export function tokoroProgressCopulaTailInfo(tokens: readonly MatcherToken[], start: number): readonly [consumed: number, polite: boolean, past: boolean, connector: string | null] | null {
  const tail = tokoroCopulaTailInfo(tokens, start);
  if (tail === null) {
    return null;
  }
  const [consumed, polite, past] = tail;
  const nextIdx = nextNonSpaceIndex(tokens, start + consumed);
  if (nextIdx !== null && nextIdx + 1 < tokens.length) {
    if (nominalizerReasonConnectiveRelationAt(tokens, nextIdx, { consumers: ["semantic_helpers"] }) !== null) {
      return [nextIdx - start + 2, polite, past, "ので"];
    }
  }
  return [consumed, polite, past, null];
}

function isSahenContentToken(token: MatcherToken): boolean {
  return token.dictionaryForm === "する" && (token.pos & POS4) === サ行変格;
}


export const TOKORO_DISCOVERY_PIN_ID = "tokoro_result_discovery";

export function tokenHasTokoroDiscoveryPin(
  token: { readonly reanalysisReadingPins?: readonly string[] } | undefined
): boolean {
  return (token?.reanalysisReadingPins ?? []).includes(TOKORO_DISCOVERY_PIN_ID);
}

export interface TokoroReadingClaimInput {
  readonly tokens: readonly MatcherToken[];
  readonly headIdx: number;
  readonly headToken: { readonly reanalysisReadingPins?: readonly string[] } | undefined;
  readonly lookups: LookupTables;
}

export type TokoroReadingClaim = (input: TokoroReadingClaimInput) => boolean;

export const TOKORO_READING_CLAIMS = {
  koro_temporal_ni: ({ tokens, headIdx }) => isKoroTemporalNiHeadToken(tokens, headIdx),
  origin_from: ({ tokens, headIdx, lookups }) => isTokoroOriginFromHead(tokens, headIdx, lookups),
  limit_until: ({ tokens, headIdx, lookups }) => isTokoroLimitUntilHead(tokens, headIdx, lookups),
  report_source: ({ tokens, headIdx, lookups }) => isTokoroReportSourceHeadToken(tokens, headIdx, lookups),
  evidence: ({ tokens, headIdx, headToken, lookups }) =>
    isTokoroEvidenceHeadToken(tokens, headIdx, lookups) || tokenHasTokoroDiscoveryPin(headToken),
  situation: ({ tokens, headIdx, lookups }) => isTokoroSituationHeadToken(tokens, headIdx, lookups),
  temporal_or_concessive_de: ({ tokens, headIdx, lookups }) =>
    isTokoroTemporalDeHeadToken(tokens, headIdx, lookups) ||
    isTokoroConcessiveDeHeadToken(tokens, headIdx, lookups),
  almost: ({ tokens, headIdx, lookups }) => isTokoroAlmostHeadToken(tokens, headIdx, lookups),
  teiru_copula_progress: ({ tokens, headIdx, lookups }) =>
    isTokoroTeiruCopulaProgressHeadToken(tokens, headIdx, lookups),
  about_to: ({ tokens, headIdx, lookups }) => isTokoroAboutToHeadToken(tokens, headIdx, lookups),
  desired_result: ({ tokens, headIdx }) => isTokoroDesiredResultHead(tokens, headIdx),
  kininaru: ({ tokens, headIdx }) => isTokoroKininaruHead(tokens, headIdx),
  progress_ni: ({ tokens, headIdx, lookups }) => isTokoroProgressNiHeadToken(tokens, headIdx, lookups),
  progress_wo_interruption: ({ tokens, headIdx, lookups }) =>
    isTokoroProgressWoInterruptionHeadToken(tokens, headIdx, lookups),
  progress_wo_observation: ({ tokens, headIdx, lookups }) =>
    isTokoroProgressWoObservationHeadToken(tokens, headIdx, lookups),
  trait_ga: ({ tokens, headIdx, lookups }) => isTokoroTraitGaHeadToken(tokens, headIdx, lookups),
  result: ({ tokens, headIdx, lookups }) => isTokoroResultHeadToken(tokens, headIdx, lookups)
} as const satisfies Readonly<Record<string, TokoroReadingClaim>>;

export type TokoroReadingClaimId = keyof typeof TOKORO_READING_CLAIMS;

export function tokoroSemanticReadingClaimsHead(input: TokoroReadingClaimInput): boolean {
  return Object.values(TOKORO_READING_CLAIMS as Readonly<Record<string, TokoroReadingClaim>>)
    .some((claims) => claims(input));
}
