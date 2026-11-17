import type { LookupTables } from "../../lookup-tables.js";
import type { MatcherToken } from "../../matchers.js";
import { isVerbLemma } from "../../matchers.js";
import { isClauseSpaceOrAdverbToken, nextNonSpaceIndex, nextTransparentEvidenceIndex, previousNonSpaceIndex } from "../../clause-layout/trivia.js";
import {
  PRONOMINAL_NO_DE_HEAD_SURFACES,
  PRONOMINAL_NO_DE_PREDICATE_FORMS
} from "../data/semantic-helper-sets.js";
import { isTeConnectiveToken } from "../tail/postverb-tail-classifier.js";
import { TokenCursor } from "../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import { quoteStructuralRelationAt } from "../../structural-relation/quote.js";
import { toiuAttributiveHeadIndex, toiuAttributiveTailEnd } from "../../semantics/marker-roles.js";
import { matrixPredicateReachAt } from "./modifier-field.js";
import { isBoundaryPunctuationCategoryToken, isHardTerminalPunctuationToken } from "./punctuation.js";
import { isStativeTeTailContinuationToken } from "../tail/postverb-tail-classifier.js";
import { secondaryParticleCanonical } from "../../particles/secondary-particle.js";

import { POS0, POS01, POS1, POS4, POS5, POS5A, PREDICATE_AUX_BITS, isRareruAuxiliaryToken, isSahenCapableNominal, isTerminalOrAttributiveInflection, isAssertiveCopulaFamilyPos, isIAdjectivePredicateToken, isPoliteCopulaPos, isNaAdjCapable, isNominalLike, isNumeralToken, isSahenLightVerbToken, isRentaishiToken, isVerbPredicateToken, isVoiceOrCausativeAuxiliaryToken, 助詞_副助詞, 助詞_接続助詞, 助詞_終助詞, 記号, 形容詞0, 終止形_, 助詞, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ジャ, 連用形_一般, 接続助詞, 代名詞, 動詞, 非自立可能, 補助記号, 未然形_, 名詞, 連体形_, 連体詞, 連用形_, pos0in } from "../../../types/pos.js";
import {
  caseParticleMarkerRelationForToken,
  copulaDeMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  nominalLinkMarkerRelationAt,
  nominalLinkMarkerRelationForToken,
  nominalizerAdversativeConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  pronominalNoDeScopeBridgeRelationAt,
  pronominalNoMarkerRelationAt,
  topicFocusMarkerRelationForToken
} from "./marker.js";

interface SemanticClauseSpan {
  readonly start: number;
  readonly end: number;
}

const PRONOMINAL_NO_NOMINAL_HEAD_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 連体詞);
const PRONOMINAL_NO_PUNCTUATION_BITS = (1 << 補助記号) | (1 << 記号);

function cursorAt<R>(cursor: TokenCursor<MatcherToken>, pos: number, fn: (cursor: TokenCursor<MatcherToken>) => R): R {
  return cursor.lookahead(pos - cursor.pos, fn);
}

function auxiliaryTailBoundaryOrModifierAt(cursor: TokenCursor<MatcherToken>, pos: number): boolean {
  const current = cursorAt(cursor, pos, skipAuxiliaryPredicateTail);
  return cursorAt(cursor, current, isPredicateBoundary) || cursorAt(cursor, pos, auxiliaryTailModifiesNoun);
}

export function noNiFocusParticleBlocksAdversative(
  tokens: readonly MatcherToken[],
  noPos: number
): boolean {
  return noNiBindingParticleFollows(tokens, noPos, ["も"]);
}

export function noNiBindingParticleBlocksAdversative(
  tokens: readonly MatcherToken[],
  noPos: number
): boolean {
  return noNiBindingParticleFollows(tokens, noPos, undefined);
}

function noNiBindingParticleFollows(
  tokens: readonly MatcherToken[],
  noPos: number,
  acceptedSurfaces: readonly ("は" | "も")[] | undefined
): boolean {
  if (nominalizerAdversativeConnectiveRelationAt(tokens, noPos, { consumers: ["semantic_helpers"] }) === null) {
    return false;
  }
  const markerIdx = nextNonSpaceIndex(tokens, noPos + 2);
  if (markerIdx === null) {
    return false;
  }
  return topicFocusMarkerRelationForToken(tokens[markerIdx], markerIdx, {
    ...(acceptedSurfaces === undefined ? {} : { acceptedSurfaces }),
    consumers: ["semantic_helpers"]
  }) !== null;
}

export function looksPronominalNoTo(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): boolean {
  if (toiuAttributiveHeadIndex(tokens, index, tokens.length) !== null) {
    return false;
  }
  return quoteStructuralRelationAt(new TokenCursor(tokens, index, tokens.length, index), lookups) === undefined;
}

export function looksPronominalNoNi(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  const noPos = cursor.pos;
  const tokens = cursor.tokens;
  const n = cursor.end;
  if (noPos <= 0 || noPos + 1 >= n) {
    return false;
  }
  const prev = tokens[noPos - 1];
  if (pos0in(prev?.pos ?? 0, PRONOMINAL_NO_NOMINAL_HEAD_BITS)) {
    return true;
  }
  if (caseParticleMarkerRelationForToken(tokens[noPos + 1], noPos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["semantic_helpers"]
  }) === null) {
    return false;
  }
  if (prev === undefined || !pos0in(prev.pos, PREDICATE_AUX_BITS)) {
    return false;
  }
  if (noNiFocusParticleBlocksAdversative(tokens, noPos)) {
    return !looksLikePurposeEvaluationNoNi(cursor, lookups, options);
  }
  const limit = Math.min(noPos + 7, n, options.clause?.end ?? n);
  let idx = noPos + 2;
  while (idx < limit) {
    const evidence = nextTransparentEvidenceIndex(tokens, idx, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    });
    if (evidence === null) {
      return false;
    }
    idx = evidence.index;
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, PRONOMINAL_NO_PUNCTUATION_BITS)) {
      return false;
    }
    if (
      pos0 === 助詞 &&
      (
        token.surface === "は" ||
        token.surface === "が" ||
        caseParticleMarkerRelationForToken(token, idx, {
          acceptedSurfaces: ["を"],
          consumers: ["semantic_helpers"]
        }) !== null
      )
    ) {
      return false;
    }
    if (isSahenCapableNominal(token)) {
      const nextIdx = nextTransparentEvidenceIndex(tokens, idx + 1, {
        endExclusive: limit,
        isTransparentToken: isClauseSpaceOrAdverbToken
      })?.index ?? limit;
      if (nextIdx < limit && isVerbLemma(tokens[nextIdx]!, "する")) {
        return lookups.NO_PRONOMINAL_NI_RESULT_SAHEN_NOUNS.has(token.dictionaryForm) ||
          lookups.NO_PRONOMINAL_NI_TARGET_SAHEN_NOUNS.has(token.dictionaryForm);
      }
    }
    if (pos0 === 動詞) {
      return cursorAt(cursor, idx, c => looksPronominalNoNiVerb(c, lookups));
    }
    idx += 1;
  }
  return false;
}

export function looksPronominalNoNiResult(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  const noPos = cursor.pos;
  const tokens = cursor.tokens;
  const n = cursor.end;
  if (noPos <= 0 || noPos + 1 >= n) {
    return false;
  }
  if (nominalizerAdversativeConnectiveRelationAt(tokens, noPos, { consumers: ["semantic_helpers"] }) === null) {
    return false;
  }
  const prev = tokens[noPos - 1];
  if (prev === undefined || !pos0in(prev.pos, PREDICATE_AUX_BITS)) {
    return false;
  }
  const limit = Math.min(noPos + 7, n, options.clause?.end ?? n);
  let idx = noPos + 2;
  while (idx < limit) {
    const evidence = nextTransparentEvidenceIndex(tokens, idx, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    });
    if (evidence === null) {
      return false;
    }
    idx = evidence.index;
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, PRONOMINAL_NO_PUNCTUATION_BITS)) {
      return false;
    }
    if (isSahenCapableNominal(token)) {
      const nextIdx = nextTransparentEvidenceIndex(tokens, idx + 1, {
        endExclusive: limit,
        isTransparentToken: isClauseSpaceOrAdverbToken
      })?.index ?? limit;
      return nextIdx < limit
        && ((tokens[nextIdx]?.pos ?? 0) & POS0) === 動詞
        && tokens[nextIdx]?.dictionaryForm === "する"
        && lookups.NO_PRONOMINAL_NI_RESULT_SAHEN_NOUNS.has(token.dictionaryForm);
    }
    if (pos0 === 動詞) {
      return lookups.NO_PRONOMINAL_NI_RESULT_VERBS.has(token.dictionaryForm);
    }
    return false;
  }
  return false;
}

function admitsPurposeEvaluationNoNiHost(
  tokens: readonly MatcherToken[],
  noPos: number,
  lookups: LookupTables
): boolean {
  const host = tokens[noPos - 1];
  if (host === undefined || !isTerminalOrAttributiveInflection(host.pos)) {
    return false;
  }
  const pos0 = host.pos & POS0;
  if (pos0 === 助動詞) {
    return isVoiceOrCausativeAuxiliaryToken(host) && !isRareruAuxiliaryToken(host);
  }
  if (pos0 !== 動詞) {
    return false;
  }
  const prev = tokens[noPos - 2];
  if (
    lookups.NO_NONI_RESOURCE_EXISTENCE_PREDICATES.has(host.dictionaryForm || host.surface) &&
    (prev === undefined ||
      copulaDeMarkerRelationForToken(prev, noPos - 2, { consumers: ["semantic_helpers"] }) === null)
  ) {
    return false;
  }
  if (prev === undefined) {
    return true;
  }
  if (isTeConnectiveToken(prev) && isStativeTeTailContinuationToken(host)) {
    return false;
  }
  return toiuAttributiveTailEnd(tokens, noPos - 2, noPos) === null;
}

function noNiQuantityPredicateClosesClause(
  tokens: readonly MatcherToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNumeralToken(token)) {
    return false;
  }
  let probe = idx + 1;
  const unit = tokens[probe];
  if (unit !== undefined && (unit.pos & POS0) === 名詞 && !isNumeralToken(unit)) {
    probe += 1;
  }
  const marker = tokens[probe];
  const approximation = marker === undefined
    ? null
    : secondaryParticleCanonical(marker) ?? (marker.dictionaryForm || marker.surface);
  if (approximation !== null && lookups.NO_NONI_QUANTITY_APPROXIMATION_MARKERS.has(approximation)) {
    probe += 1;
  }
  return noNiClauseClosesAfter(tokens, probe, endExclusive);
}

const NONI_MATRIX_MODIFIER_SPAN = 10;

function noNiClauseClosesAfter(
  tokens: readonly MatcherToken[],
  idx: number,
  endExclusive: number
): boolean {
  for (let probe = idx; probe < endExclusive; probe += 1) {
    const token = tokens[probe];
    if (token === undefined) {
      return true;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return true;
    }
    const punctuation: boolean = isBoundaryPunctuationCategoryToken(token);
    if (!punctuation && (token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  return true;
}

function noNiStandsInPredicatePosition(
  tokens: readonly MatcherToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  if (isVerbPredicateToken(token) || isIAdjectivePredicateToken(token)) {
    return true;
  }
  if (noNiSahenLightVerbBindingAt(tokens, idx, endExclusive, lookups)) {
    return true;
  }
  const nextIdx = idx + 1;
  if (noNiClauseClosesAfter(tokens, nextIdx, endExclusive)) {
    return true;
  }
  const next = tokens[nextIdx];
  if (next === undefined) {
    return true;
  }
  if (copulaNiMarkerRelationForToken(next, nextIdx, { consumers: ["tail_boundary_readiness"] }) !== null) {
    return false;
  }
  if (
    isAssertiveCopulaFamilyPos(next.pos) ||
    isPoliteCopulaPos(next.pos) ||
    copulaDeMarkerRelationForToken(next, nextIdx, { consumers: ["semantic_helpers"] }) !== null
  ) {
    return true;
  }
  if (noNiResourceBindingPredicateAt(tokens, nextIdx, lookups)) {
    return true;
  }
  if ((next.pos & POS01) === 助詞_接続助詞) {
    return true;
  }
  if (!isNaAdjCapable(token)) {
    return false;
  }
  if ((next.pos & POS01) === 助詞_副助詞) {
    return true;
  }
  return nominalLinkMarkerRelationForToken(next, nextIdx, { consumers: ["tail_multi_clause"] }) !== null &&
    isNominalLike(tokens[nextIdx + 1] ?? { pos: 0 });
}

function noNiSahenLightVerbBindingAt(
  tokens: readonly MatcherToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isSahenCapableNominal(token)) {
    return false;
  }
  const nextIdx = idx + 1;
  const lightIdx = noNiResourceArgumentMarkerAt(tokens, nextIdx) ? nextIdx + 1 : nextIdx;
  if (lightIdx >= endExclusive) {
    return false;
  }
  const light = tokens[lightIdx];
  if (light === undefined || (light.pos & POS0) !== 動詞) {
    return false;
  }
  const lemma = light.dictionaryForm || light.surface;
  return isSahenLightVerbToken(light) ||
    lookups.HONORIFIC_SAHEN_LIGHT_VERBS.has(lemma) ||
    lookups.NO_SAHEN_POTENTIAL_LIGHT_VERBS.has(lemma);
}

function noNiResourceBindingPredicateAt(
  tokens: readonly MatcherToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const key = token.dictionaryForm || token.surface;
  return lookups.NO_NONI_PURPOSE_EVALUATION_PREDICATE_HEADS.has(key) ||
    lookups.NO_NONI_RESOURCE_EXISTENCE_PREDICATES.has(key);
}

function noNiResourceArgumentMarkerAt(tokens: readonly MatcherToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return false;
  }
  return token.surface === "が" || token.surface === "は" || token.surface === "も" ||
    caseParticleMarkerRelationForToken(token, idx, {
      acceptedSurfaces: ["を"],
      consumers: ["semantic_helpers"]
    }) !== null;
}

function noNiResourceNounStandsAsPredicate(
  tokens: readonly MatcherToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables,
  markArgument: () => void
): boolean {
  if (noNiStandsInPredicatePosition(tokens, idx, endExclusive, lookups)) {
    return true;
  }
  if (noNiResourceBindingPredicateAt(tokens, idx + 1, lookups)) {
    return true;
  }
  if (noNiResourceArgumentMarkerAt(tokens, idx + 1)) {
    markArgument();
  }
  return false;
}

function noNiQuantitySubjectAdmitsResourceFrame(
  tokens: readonly MatcherToken[],
  start: number,
  quantityIdx: number,
  lookups: LookupTables
): boolean {
  for (let probe = quantityIdx - 1; probe >= start; probe -= 1) {
    const token = tokens[probe];
    if (token === undefined) {
      continue;
    }
    if ((token.pos & POS0) !== 助詞 || !(token.surface === "は" || token.surface === "が" || token.surface === "も")) {
      continue;
    }
    const headIdx = previousNonSpaceIndex(tokens, probe, start);
    const head = headIdx === null ? undefined : tokens[headIdx];
    return head !== undefined &&
      lookups.NO_NONI_PURPOSE_RESOURCE_NOUNS.has(head.dictionaryForm || head.surface);
  }
  return true;
}

export function looksLikePurposeEvaluationNoNi(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  const noPos = cursor.pos;
  const tokens = cursor.tokens;
  const n = cursor.end;
  if (noPos <= 0 || noPos + 1 >= n) {
    return false;
  }
  if (nominalizerAdversativeConnectiveRelationAt(tokens, noPos, { consumers: ["semantic_helpers"] }) === null) {
    return false;
  }
  if (
    !noNiBindingParticleBlocksAdversative(tokens, noPos) &&
    !admitsPurposeEvaluationNoNiHost(tokens, noPos, lookups)
  ) {
    return false;
  }
  const limit = Math.min(n, options.clause?.end ?? n);
  const start = noPos + 2;
  if (start >= limit) {
    return false;
  }
  let resourceArgumentPending = false;
  return matrixPredicateReachAt(tokens as readonly RuntimeHaruToken[], start, limit, {
    registeredPredicateStart: (candidates, idx) => {
      const token = candidates[idx];
      if (token === undefined) {
        return false;
      }
      const key = token.dictionaryForm || token.surface;
      if (lookups.NO_NONI_PURPOSE_EVALUATION_PREDICATE_HEADS.has(key)) {
        return noNiStandsInPredicatePosition(candidates, idx, limit, lookups);
      }
      if (lookups.NO_NONI_PURPOSE_RESOURCE_NOUNS.has(key)) {
        return noNiResourceNounStandsAsPredicate(candidates, idx, limit, lookups, () => {
          resourceArgumentPending = true;
        });
      }
      return noNiQuantityPredicateClosesClause(candidates, idx, limit, lookups) &&
        noNiQuantitySubjectAdmitsResourceFrame(candidates, start, idx, lookups);
    },
    openPredicateStart: (candidates, idx) =>
      resourceArgumentPending && noNiResourceBindingPredicateAt(candidates, idx, lookups),
    modifierSpan: NONI_MATRIX_MODIFIER_SPAN
  }) === "predicate";
}

export function looksPronominalNoDe(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  const noPos = cursor.pos;
  const tokens = cursor.tokens;
  const n = cursor.end;
  if (noPos <= 0 || noPos + 1 >= n) {
    return false;
  }
  if (pronominalNoDeScopeBridgeRelationAt(tokens, noPos, {
    allowLooseCopulaDe: true,
    consumers: ["semantic_helpers"]
  }) === null) {
    return false;
  }
  const prev = tokens[noPos - 1];
  if (pos0in(prev?.pos ?? 0, PRONOMINAL_NO_NOMINAL_HEAD_BITS)) {
    return true;
  }
  if (prev === undefined || !pos0in(prev.pos, PREDICATE_AUX_BITS)) {
    return false;
  }
  const limit = Math.min(noPos + 6, n, options.clause?.end ?? n);
  let idx = noPos + 2;
  while (idx < limit) {
    const evidence = nextTransparentEvidenceIndex(tokens, idx, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    });
    if (evidence === null) {
      return false;
    }
    idx = evidence.index;
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, PRONOMINAL_NO_PUNCTUATION_BITS)) {
      return false;
    }
    if (pos0 === 助詞 && (token.surface === "も" || token.surface === "は")) {
      return true;
    }
    if (PRONOMINAL_NO_DE_PREDICATE_FORMS.has(token.dictionaryForm)) {
      return true;
    }
    if (PRONOMINAL_NO_DE_HEAD_SURFACES.has(token.surface)) {
      return true;
    }
    if (pos0in(pos0, PREDICATE_AUX_BITS) || pos0 === 名詞) {
      return false;
    }
    idx += 1;
  }
  return false;
}

function looksPronominalNoNiVerb(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  const verbIdx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  const token = tokens[verbIdx];
  if (token === undefined) {
    return false;
  }
  const pos5 = token.pos & POS5;
  if (token.dictionaryForm === "対する" && (pos5 & POS5A) === 連体形_) {
    const nextIdx = nextTransparentEvidenceIndex(tokens, verbIdx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    return nextIdx < limit && ((tokens[nextIdx]?.pos ?? 0) & POS0) === 名詞;
  }
  if (token.dictionaryForm === "対する" && (pos5 & POS5A) === 終止形_) {
    const nextIdx = nextTransparentEvidenceIndex(tokens, verbIdx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    return cursorAt(cursor, nextIdx, isPredicateBoundary);
  }
  if (token.dictionaryForm === "対する" && (pos5 & POS5A) === 未然形_) {
    const nextIdx = nextTransparentEvidenceIndex(tokens, verbIdx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    if (!cursorAt(cursor, nextIdx, isAuxiliaryPredicateTail)) {
      return false;
    }
    return auxiliaryTailBoundaryOrModifierAt(cursor, nextIdx);
  }
  if (token.dictionaryForm === "対する" && (pos5 & POS5A) === 連用形_) {
    const nextIdx = nextTransparentEvidenceIndex(tokens, verbIdx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    if (nextIdx < limit) {
      const next = tokens[nextIdx];
      if (next?.surface === "た" && (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ)) {
        if ((next.pos & POS5A) === 連体形_) {
          const nounIdx = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
            endExclusive: limit,
            isTransparentToken: isClauseSpaceOrAdverbToken
          })?.index ?? limit;
          return nounIdx < limit && ((tokens[nounIdx]?.pos ?? 0) & POS0) === 名詞;
        }
        if ((next.pos & POS5A) === 終止形_) {
          const afterTa = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
            endExclusive: limit,
            isTransparentToken: isClauseSpaceOrAdverbToken
          })?.index ?? limit;
          return cursorAt(cursor, afterTa, isPredicateBoundary);
        }
      }
      if (cursorAt(cursor, nextIdx, isAuxiliaryPredicateTail)) {
        return auxiliaryTailBoundaryOrModifierAt(cursor, nextIdx);
      }
      if (next !== undefined && isTeConnectiveToken(next)) {
        const noIdx = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
          endExclusive: limit,
          isTransparentToken: isClauseSpaceOrAdverbToken
        })?.index ?? limit;
        if (noIdx < limit && nominalLinkMarkerRelationAt(tokens, noIdx, { consumers: ["semantic_helpers"] }) !== null) {
          const nounIdx = nextTransparentEvidenceIndex(tokens, noIdx + 1, {
            endExclusive: limit,
            isTransparentToken: isClauseSpaceOrAdverbToken
          })?.index ?? limit;
          return nounIdx < limit && ((tokens[nounIdx]?.pos ?? 0) & POS0) === 名詞;
        }
        const afterTe = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
          endExclusive: limit,
          isTransparentToken: isClauseSpaceOrAdverbToken
        })?.index ?? limit;
        if (afterTe < limit && (tokens[afterTe]?.surface === "は" || tokens[afterTe]?.surface === "も") && ((tokens[afterTe]?.pos ?? 0) & POS0) === 助詞) {
          const afterFocus = nextTransparentEvidenceIndex(tokens, afterTe + 1, {
            endExclusive: limit,
            isTransparentToken: isClauseSpaceOrAdverbToken
          })?.index ?? limit;
          if (cursorAt(cursor, afterFocus, isAuxiliaryPredicateTail)) {
            return auxiliaryTailBoundaryOrModifierAt(cursor, afterFocus);
          }
          return false;
        }
        if (cursorAt(cursor, afterTe, isAuxiliaryPredicateStart)) {
          return auxiliaryTailBoundaryOrModifierAt(cursor, afterTe);
        }
        return cursorAt(cursor, afterTe, auxiliaryTailModifiesNoun);
      }
      if (next?.surface === "ては" && (next.pos & POS1) === 接続助詞) {
        const afterFocus = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
          endExclusive: limit,
          isTransparentToken: isClauseSpaceOrAdverbToken
        })?.index ?? limit;
        if (cursorAt(cursor, afterFocus, isAuxiliaryPredicateTail)) {
          return auxiliaryTailBoundaryOrModifierAt(cursor, afterFocus);
        }
        return false;
      }
      if (cursorAt(cursor, nextIdx, isContractedTeAux)) {
        return auxiliaryTailBoundaryOrModifierAt(cursor, nextIdx);
      }
    }
  }
  if (
    lookups.NO_PRONOMINAL_NI_RESULT_VERBS.has(token.dictionaryForm) &&
    cursorAt(cursor, verbIdx, noNiResultVerbHasFiniteAuxiliaryTail)
  ) {
    return false;
  }
  return lookups.NO_PRONOMINAL_NI_RESULT_VERBS.has(token.dictionaryForm);
}

export function noNiResultVerbHasFiniteAuxiliaryTail(
  cursor: TokenCursor<MatcherToken>
): boolean {
  const verbIdx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  const token = tokens[verbIdx];
  if (((token?.pos ?? 0) & POS0) !== 動詞) {
    return false;
  }
  const nextIdx = nextTransparentEvidenceIndex(tokens, verbIdx + 1, {
    endExclusive: limit,
    isTransparentToken: isClauseSpaceOrAdverbToken
  })?.index ?? limit;
  const next = tokens[nextIdx];
  if (next === undefined) {
    return false;
  }
  if (cursorAt(cursor, nextIdx, isAuxiliaryPredicateTail) || cursorAt(cursor, nextIdx, isContractedTeAux)) {
    return true;
  }
  if (isTeConnectiveToken(next) || (next.surface === "ては" && (next.pos & POS1) === 接続助詞)) {
    const afterTe = nextTransparentEvidenceIndex(tokens, nextIdx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    return cursorAt(cursor, afterTe, isAuxiliaryPredicateTail) ||
      cursorAt(cursor, afterTe, isContractedTeAux);
  }
  return false;
}

function isAuxiliaryPredicateStart(cursor: TokenCursor<MatcherToken>): boolean {
  const idx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  if (idx >= limit) {
    return false;
  }
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const form = token?.dictionaryForm || token?.surface;
  return (token.pos & POS0) === 動詞 &&
    ((token.pos & POS1) === 非自立可能 || ["しまう", "みる", "見る", "くる", "来る", "いく", "行く", "おく", "置く", "いる", "居る", "ある", "有る"].includes(form ?? ""));
}

function isAuxiliaryPredicateTail(cursor: TokenCursor<MatcherToken>): boolean {
  const idx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  if (idx >= limit) {
    return false;
  }
  const token = tokens[idx];
  const form = token?.dictionaryForm || token?.surface;
  return isAuxiliaryPredicateStart(cursor) ||
    ((token?.pos ?? 0) & POS0) === 助動詞 ||
    (((token?.pos ?? 0) & POS0) === 形容詞0 && (form === "ない" || form === "無い"));
}

function isContractedTeAux(cursor: TokenCursor<MatcherToken>): boolean {
  const idx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  return idx < limit && ((tokens[idx]?.pos ?? 0) & POS0) === 助動詞 && tokens[idx]?.dictionaryForm === "てる";
}

function isPredicateBoundary(cursor: TokenCursor<MatcherToken>): boolean {
  const idx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  if (idx >= limit) {
    return true;
  }
  const token = tokens[idx];
  const pos0 = (token?.pos ?? 0) & POS0;
  const pos1 = (token?.pos ?? 0) & POS1;
  if (pos0 === 補助記号 || pos0 === 記号 || pos1 === 接続助詞) {
    return true;
  }
  if (
    predicateNominalizerRelationForToken(token, idx, {
      requirement: "tail_connective_marker",
      consumers: ["semantic_helpers"]
    })?.nominalizerKind === "no"
  ) {
    const afterNo = nextTransparentEvidenceIndex(tokens, idx + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
    if (afterNo >= limit) {
      return false;
    }
    const after = tokens[afterNo];
    const caseMarker = caseParticleMarkerRelationForToken(after, afterNo, {
      acceptedSurfaces: ["に", "を"],
      consumers: ["semantic_helpers"]
    });
    const copulaDeMarker = copulaDeMarkerRelationForToken(after, afterNo, {
      consumers: ["semantic_helpers"]
    });
    return caseMarker !== null ||
      after?.surface === "は" ||
      after?.surface === "も" ||
      after?.surface === "が" ||
      ((copulaDeMarker !== null || after?.surface === "だ" || after?.surface === "です") && ((after?.pos ?? 0) & POS0) === 助動詞);
  }
  return false;
}

function auxiliaryTailModifiesNoun(cursor: TokenCursor<MatcherToken>): boolean {
  const idx = cursor.pos;
  const tokens = cursor.tokens;
  const limit = cursor.end;
  if (idx >= limit || !isAuxiliaryPredicateTail(cursor)) {
    return false;
  }
  let current = idx;
  let lastTail = idx;
  while (cursorAt(cursor, current, isAuxiliaryPredicateTail)) {
    lastTail = current;
    current = nextTransparentEvidenceIndex(tokens, current + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
  }
  return current < limit && ((tokens[current]?.pos ?? 0) & POS0) === 名詞 && ((tokens[lastTail]?.pos ?? 0) & POS5A) === 連体形_;
}

function skipAuxiliaryPredicateTail(cursor: TokenCursor<MatcherToken>): number {
  const tokens = cursor.tokens;
  const limit = cursor.end;
  let current = cursor.pos;
  while (cursorAt(cursor, current, isAuxiliaryPredicateTail)) {
    current = nextTransparentEvidenceIndex(tokens, current + 1, {
      endExclusive: limit,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? limit;
  }
  return current;
}

export interface RentaishiPronominalNoHeadSpan {
  readonly start: number;
  readonly markerIndex: number;
  readonly endExclusive: number;
}

export function rentaishiPronominalNoHeadSpanAt(
  tokens: readonly RuntimeHaruToken[],
  start: number
): RentaishiPronominalNoHeadSpan | null {
  const head = tokens[start];
  if (head === undefined || !isRentaishiToken(head)) {
    return null;
  }
  const markerIndex = start + 1;
  if (pronominalNoMarkerRelationAt(tokens, markerIndex, {
    requirement: "bare_adnominal_tail",
    consumers: ["nominal_head", "nominal_head_parser"]
  }) === null) {
    return null;
  }
  return { start, markerIndex, endExclusive: markerIndex + 1 };
}

export function pronominalNoCopulaDeFollows(token: RuntimeHaruToken | undefined): boolean {
  const relation = copulaDeMarkerRelationForToken(token, -1, {
    consumers: ["pronominal_no_dispatch"]
  });
  return relation !== null &&
    (relation.auxiliaryFamily === 助動詞_ダ ||
      relation.auxiliaryFamily === 助動詞_デス ||
      relation.auxiliaryFamily === 助動詞_ジャ) &&
    ((token?.pos ?? 0) & POS5) === 連用形_一般;
}
