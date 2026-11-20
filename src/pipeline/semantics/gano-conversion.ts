
import { pairKey, type LookupTables } from "../lookup-tables.js";
import type { AttributiveStemProjection, ClauseKind } from "../clause-layout/layout-types.js";
import { isClauseSpaceOrAdverbToken, nextNonSpaceIndex, nextTransparentEvidenceIndex } from "../clause-layout/trivia.js";
import type { MatcherToken } from "../matchers.js";
import { secondaryParticleCanonical } from "../particles/secondary-particle.js";
import { isNoArgumentRelationalNominalAt } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import {
  getReferentTokenBeforeParticle,
  isObliqueCaseChain,
  isQuantityMeasureToken,
  isTimeExpressionBeforeParticle
} from "./helpers.js";
import { POS0, POS1, POS2, POS01, POS5A, isAdjectivalDerivationalSuffix, isNominalDerivationalSuffix, isSahenCapableNominal, 形容詞0, 動詞, 助詞, 助詞_格助詞, 助動詞, 数詞, 助数詞, 語幹_, 連体詞, 連用形_ } from "../../types/pos.js";


export interface GaNoClauseSpan {
  readonly start: number;
  readonly end: number;
  readonly kind: ClauseKind;
  readonly attributiveStemProjection?: AttributiveStemProjection | null;
}

export interface GaNoConversionOptions {
  readonly clause: GaNoClauseSpan | null;
  readonly lookups: LookupTables;
}

export function isCaseParticleNoToken(token: MatcherToken | undefined): boolean {
  return token !== undefined && token.surface === "の" && (token.pos & POS01) === 助詞_格助詞;
}

export function isGaNoConvertedSubjectParticle(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  predicateIdx: number,
  options: GaNoConversionOptions
): boolean {
  if (!isCaseParticleNoToken(tokens[particleIdx])) {
    return false;
  }
  const clause = options.clause;
  if (clause === null || clause.kind !== "relative" || particleIdx < clause.start || particleIdx >= clause.end) {
    return false;
  }
  if (!noParticleDirectlyReachesPredicate(tokens, particleIdx, predicateIdx)) {
    return false;
  }
  if (noParticleShouldRemainNominalModifier(tokens, particleIdx, { clause, lookups: options.lookups })) {
    return false;
  }
  if (clause.attributiveStemProjection === "renyou_compound_prenominal") {
    return false;
  }
  if (relationalHeadOwnsNoAsGenitive(tokens, predicateIdx, clause, options.lookups)) {
    return false;
  }
  return gaNoConversionAdjectivePredicateAllowed(tokens, particleIdx, predicateIdx, options.lookups);
}

function relationalHeadOwnsNoAsGenitive(
  tokens: readonly MatcherToken[],
  predicateIdx: number,
  clause: GaNoClauseSpan,
  lookups: LookupTables
): boolean {
  const predicate = effectivePredicate(tokens, predicateIdx);
  if (
    predicate === null ||
    predicate.category !== "verbal" ||
    !lookups.GANO_NO_HEAD_SUBJECT_PROPERTY_VERBS.has(predicate.token.dictionaryForm || predicate.token.surface)
  ) {
    return false;
  }
  for (let idx = predicate.tokenIdx + 1; idx < clause.end; idx += 1) {
    if (((tokens[idx]?.pos ?? 0) & POS0) !== 助動詞) {
      return false;
    }
  }
  const headIdx = nextNonSpaceIndex(tokens, clause.end, tokens.length);
  return headIdx !== null && isNoArgumentRelationalNominalAt(tokens, headIdx);
}

export function noParticleDirectlyReachesPredicate(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  predicateIdx: number
): boolean {
  if (predicateIdx <= particleIdx) {
    return false;
  }
  return nextTransparentEvidenceIndex(tokens, particleIdx + 1, {
    endExclusive: predicateIdx,
    isTransparentToken: isClauseSpaceOrAdverbToken
  }) === null;
}

export function noParticleShouldRemainNominalModifier(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  options: { readonly clause?: GaNoClauseSpan | null; readonly lookups: LookupTables }
): boolean {
  const lookups = options.lookups;
  return isTimeExpressionBeforeParticle(tokens, particleIdx, lookups, { clause: options.clause ?? null }) ||
    noParticleFollowsSpatialModifierHead(tokens, particleIdx, lookups) ||
    noParticleFollowsIndefiniteQuantityModifier(tokens, particleIdx, lookups) ||
    noParticleFollowsNpClosingSecondaryParticle(tokens, particleIdx, lookups) ||
    noParticleFollowsAdnominalDeterminer(tokens, particleIdx) ||
    isObliqueCaseChain(tokens, particleIdx, lookups);
}

function noParticleFollowsAdnominalDeterminer(
  tokens: readonly MatcherToken[],
  particleIdx: number
): boolean {
  if (particleIdx <= 0) {
    return false;
  }
  return ((tokens[particleIdx - 1]?.pos ?? 0) & POS0) === 連体詞;
}

type EffectivePredicateCategory = "verbal" | "adjectival" | "nominal";

function predicateTokenCategory(token: MatcherToken | undefined): EffectivePredicateCategory | null {
  if (token === undefined) {
    return null;
  }
  if ((token.pos & POS0) === 動詞) {
    return "verbal";
  }
  if ((token.pos & POS0) === 形容詞0 || isAdjectivalDerivationalSuffix(token)) {
    return "adjectival";
  }
  if (isNominalDerivationalSuffix(token)) {
    return "nominal";
  }
  return null;
}

function continuesCompoundPredicate(token: MatcherToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos5a = token.pos & POS5A;
  return pos5a === 連用形_ || pos5a === 語幹_;
}

function effectivePredicate(
  tokens: readonly MatcherToken[],
  predicateIdx: number
): { readonly token: MatcherToken; readonly category: EffectivePredicateCategory; readonly tokenIdx: number } | null {
  const start = tokens[predicateIdx];
  if (start === undefined) {
    return null;
  }
  let idx = predicateIdx;
  let category = predicateTokenCategory(start);
  let categoryIdx = predicateIdx;
  if (category === null && !isSahenCapableNominal(start)) {
    return null;
  }
  while (true) {
    const nextIdx = nextNonSpaceIndex(tokens, idx + 1, tokens.length);
    const nextToken = nextIdx === null ? undefined : tokens[nextIdx];
    if (nextIdx === null || nextToken === undefined) {
      break;
    }
    if ((nextToken.pos & POS0) === 助動詞) {
      idx = nextIdx;
      continue;
    }
    const nextCategory = predicateTokenCategory(nextToken);
    if (nextCategory === null) {
      break;
    }
    if (category !== null && !continuesCompoundPredicate(tokens[idx])) {
      break;
    }
    idx = nextIdx;
    categoryIdx = nextIdx;
    category = nextCategory;
  }
  const token = tokens[categoryIdx];
  return token === undefined || category === null ? null : { token, category, tokenIdx: categoryIdx };
}

function gaNoConversionAdjectivePredicateAllowed(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  predicateIdx: number,
  lookups: LookupTables
): boolean {
  const predicate = effectivePredicate(tokens, predicateIdx);
  if (predicate === null) {
    return true;
  }
  if (predicate.category === "nominal") {
    return false;
  }
  if (predicate.category !== "adjectival") {
    return true;
  }
  const predicateDictForm = predicate.token.dictionaryForm || predicate.token.surface;
  if (lookups.GANO_NO_SUBJECT_ADJECTIVE_ALLOWLIST.has(predicateDictForm)) {
    return true;
  }
  if (lookups.named("gano_no_subject_stative_verbs")?.has(predicateDictForm) === true) {
    return true;
  }
  const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
  if (referent === null) {
    return false;
  }
  return lookups.GANO_NO_SUBJECT_ADJECTIVE_PAIRS.has(pairKey(referent.dictionaryForm || referent.surface, predicateDictForm));
}

function noParticleFollowsNpClosingSecondaryParticle(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  lookups: LookupTables
): boolean {
  if (particleIdx <= 0) {
    return false;
  }
  const canonical = secondaryParticleCanonical(tokens[particleIdx - 1]);
  return canonical !== null && lookups.GANO_NO_NP_CLOSING_SECONDARY_PARTICLES.has(canonical);
}

function noParticleFollowsSpatialModifierHead(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  lookups: LookupTables
): boolean {
  if (particleIdx <= 0) {
    return false;
  }
  const prev = tokens[particleIdx - 1];
  if (prev === undefined) {
    return false;
  }
  return lookups.NO_RELATIVE_SUBJECT_BLOCKING_SPATIAL_HEADS.has(prev.dictionaryForm || prev.surface) ||
    lookups.NO_RELATIVE_SUBJECT_BLOCKING_SPATIAL_HEADS.has(prev.surface);
}

function noParticleFollowsIndefiniteQuantityModifier(
  tokens: readonly MatcherToken[],
  noParticleIdx: number,
  lookups: LookupTables
): boolean {
  const kaIdx = noParticleIdx - 1;
  const ka = tokens[kaIdx];
  if (
    ka === undefined ||
    (ka.pos & POS0) !== 助詞 ||
    (ka.surface !== "か" && ka.dictionaryForm !== "か")
  ) {
    return false;
  }

  let sawQuantityUnit = false;
  for (let idx = kaIdx - 1; idx >= Math.max(0, kaIdx - 4); idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (isIndefiniteQuantityHeadToken(token, lookups)) {
      return true;
    }
    if (isQuantityMeasureToken(token, lookups)) {
      sawQuantityUnit = true;
      continue;
    }
    if (sawQuantityUnit && (token.pos & POS1) === 数詞) {
      return true;
    }
    break;
  }
  return false;
}

function isIndefiniteQuantityHeadToken(token: MatcherToken, lookups: LookupTables): boolean {
  const form = token.dictionaryForm || token.surface;
  if (lookups.QUANTITY_INDEFINITE_HEADS.has(form) || lookups.QUANTITY_INDEFINITE_HEADS.has(token.surface)) {
    return true;
  }
  const splitA = (token as MatcherToken & { readonly splitA?: readonly MatcherToken[] }).splitA;
  if (splitA === undefined || splitA.length === 0) {
    return false;
  }
  return splitA.some((part) => (part.pos & POS1) === 数詞) &&
    splitA.some((part) =>
      (part.pos & POS2) === 助数詞 ||
      lookups.QUANTITY_INDEFINITE_HEADS.has(part.dictionaryForm || part.surface)
    );
}
