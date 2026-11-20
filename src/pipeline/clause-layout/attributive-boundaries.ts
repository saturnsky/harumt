import { toiuAttributiveBoundarySplitAt, toiuAttributiveHeadIndex } from "../semantics/marker-roles.js";
import { attachedDerivedNominalHeadIndexAt, prenominalModifierChainHeadIndex } from "./attributive-head.js";
import { matchMonoNoConcessiveConnectiveStart, matchNoNiConcessiveConnectiveStart } from "../semantics/helpers.js";
import { copulaDeMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { isWhitespaceAttributiveReadingLicense, type WhitespaceAdnominalLicense } from "./juncture-verdict.js";
import { derivedNominalPhraseHeadIndexAt } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { renyouNominalHeadAdmissionAt } from "../head-tail/head/adapters/nominal/renyou-nominal-head.js";
import { conjecturalCopulaHonorificSupportSpanStartAt } from "../head-tail/tail/predicate-root/matchers/copula.js";
import { isAffirmativeCopulaSupportVerbToken, isLikenessModalAdnominalTailEnd } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, AUTHORED_PAUSE_SEPARATIONS, DETACHED_SEPARATIONS, hasSourceOrdinalGapBeforeToken, isWitnessedChunkBreakBefore, separatedAs, separationBefore } from "./trivia.js";
import { balancedDelimiterSpanOpeningAtIn } from "./balanced-delimiter.js";
import { EXPLICIT_OPENING_QUOTATION_SURFACES, isExplicitQuoteClosingToken } from "./quote-delimiters.js";
import { isAnimateReferentToken } from "../head-tail/candidate/semantic-classifiers.js";
import { tokenIsInterrogativeLexeme } from "../quote/embedded-question.js";
import { POS0, isNaAdjCapable, isCaseParticleToken, isAttributiveInflection, isAdnominalGenitiveMarkerToken, isCommonNounToken, isGeneralRenyouInflectedToken, isNonIndependentVerbToken, isPrefixAffixToken, isRareruAuxiliaryToken, isTerminalOrAttributiveInflection, isVerbPredicateToken, isVolitionalInflection, pos0in, NOMINAL_BITS, isAuxiliaryStemToken, isAttributiveOrHomophonousTerminalInflection, isAdnominalOnlyInflection } from "../../types/pos.js";
import type { BoundaryKind, ClauseToken, WhitespaceAttributiveReadingInput, LexicalRenyouHeadClaims } from "./layout-types.js";
import { upsertBoundaryEvent, hasFollowingClausePredicateEvidence } from "./boundary-event-common.js";
import { NOUNISH_POS0_NUM } from "./token-evidence.js";
import { isAttributiveHeadNounishToken } from "./nominal-anchor-evidence.js";
import { isBareKeijoujiDirectAttributiveHost } from "./prenominal-head-reach.js";
import { isInsideClauseOpaqueNominalFrameSurface } from "./nominal-frame-reach.js";
import type { ClauseBoundaryScanSignal, ClauseBoundaryDetectionContext, ClauseBoundaryDetectionState } from "./boundary-detection.js";
import type { JunctureNominalUnitSources } from "./boundary-settlement.js";
import { adjectiveAdverbialModifiedPredicate, adjectiveAdverbialModifierLookupOptions } from "./adverbial-predicate.js";

function attributiveEndpointQualification(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, token: ClauseToken): { readonly conjecturalCopulaEndpoint: boolean; readonly renyouCompoundPrenominalEndpoint: boolean; readonly homophonousTerminalEndpoint: boolean } {
  const { tokens, lookups, options, runtimeTokens } = ctx;
  const { raw } = state;
  const conjecturalCopulaEndpoint = conjecturalCopulaAttributiveEndpointClaimed(runtimeTokens, index);
  const renyouCompoundPrenominalEndpoint =
    isRenyouCompoundPrenominalAttributiveEndpoint(tokens, index) &&
    renyouCompoundPassiveHeadAdmitted(tokens, index, lookups) &&
    !ownsCaseParticleSinceLastBoundary(tokens, index, raw) &&
    !renyouLexicalNounCompoundHeadAdmittedAt(runtimeTokens, index, lookups, options.lexicalRenyouHeadClaims);
  const homophonousTerminalEndpoint =
    !isAttributiveInflection(token.pos) &&
    !conjecturalCopulaEndpoint &&
    !renyouCompoundPrenominalEndpoint &&
    isAttributiveOrHomophonousTerminalInflection(token.pos);
  return { conjecturalCopulaEndpoint, renyouCompoundPrenominalEndpoint, homophonousTerminalEndpoint };
}

export function detectAttributiveBoundary(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  index: number,
  token: ClauseToken
): ClauseBoundaryScanSignal {
  const { tokens, lookups, runtimeTokens, whitespaceAdnominalLicenses } = ctx;
  const { conjecturalCopulaEndpoint, renyouCompoundPrenominalEndpoint, homophonousTerminalEndpoint } =
    attributiveEndpointQualification(ctx, state, index, token);
  if (
    isAttributiveInflection(token.pos) ||
    conjecturalCopulaEndpoint ||
    renyouCompoundPrenominalEndpoint ||
    homophonousTerminalEndpoint
  ) {
    if (isInsideClauseOpaqueNominalFrameSurface(tokens, index)) {
      return "continue";
    }
    if (adjectiveAdverbialModifiedPredicate(tokens, index, adjectiveAdverbialModifierLookupOptions(lookups)) !== null) {
      return "continue";
    }
    if (detectToiuAttributiveCarrierBoundary(ctx, state, index) === "continue") {
      return "continue";
    }
    const next = nextNonSpaceIndex(tokens, index + 1);
    const likenessOwnedHeadReach = isLikenessModalAdnominalTailEnd(runtimeTokens, index);
    if (!homophonousTerminalEndpoint && next !== null && isAttributiveHeadNounishToken(tokens[next])) {
      if (detectNominalHeadAttributiveBoundary(ctx, state, next, likenessOwnedHeadReach, renyouCompoundPrenominalEndpoint) === "continue") {
        return "continue";
      }
    } else if (
      !homophonousTerminalEndpoint &&
      next !== null &&
      EXPLICIT_OPENING_QUOTATION_SURFACES.has(tokens[next]?.surface ?? "")
    ) {
      detectQuotedHeadAttributiveBoundary(ctx, state, next);
    } else if (
      next !== null &&
      token.transparentPauseAfter !== true &&
      (!homophonousTerminalEndpoint ||
        (!isAttributiveHeadNounishToken(tokens[next]) &&
          (!separatedAs(tokens, next, DETACHED_SEPARATIONS) ||
            governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) !== undefined)))
    ) {
      detectModifierChainAttributiveBoundary(ctx, state, index, next, likenessOwnedHeadReach);
    }
  }
  return "next";
}

function detectToiuAttributiveCarrierBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, n, lookups } = ctx;
  const { raw, attributiveModifierChainHeadBySplitAt, quoteAttributiveCarrierBySplitAt } = state;
  const markerIdx = previousNonSpaceIndex(tokens, index);
  if (markerIdx !== null) {
    const toiuHeadIdx = toiuAttributiveHeadIndex(tokens, markerIdx, n);
    const toiuSplitAt = toiuAttributiveBoundarySplitAt(tokens, markerIdx, n, lookups);
    if (toiuHeadIdx !== null && toiuSplitAt !== null) {
      upsertBoundaryEvent(ctx, state, toiuSplitAt, "attributive");
      if (raw.get(toiuSplitAt) === "attributive") {
        attributiveModifierChainHeadBySplitAt.set(toiuSplitAt, toiuHeadIdx);
        quoteAttributiveCarrierBySplitAt.set(toiuSplitAt, [markerIdx, toiuHeadIdx]);
      }
      return "continue";
    }
  }
  return "next";
}

function detectNominalHeadAttributiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, next: number, likenessOwnedHeadReach: boolean, renyouCompoundPrenominalEndpoint: boolean): ClauseBoundaryScanSignal {
  const { tokens, n, lookups, clauseCursorAt, runtimeCursorAt } = ctx;
  const { raw, attributiveModifierChainHeadBySplitAt, renyouCompoundPrenominalSplits } = state;
  const monoNoConsumed = matchMonoNoConcessiveConnectiveStart(runtimeCursorAt(next));
  if (monoNoConsumed !== null) {
    const splitAt = next + monoNoConsumed;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  const noNiConsumed = matchNoNiConcessiveConnectiveStart(runtimeCursorAt(next), lookups);
  if (noNiConsumed !== null) {
    const splitAt = next + noNiConsumed;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  upsertBoundaryEvent(ctx, state, next, "attributive");
  const fastPathDerivedHeadIdx = attachedDerivedNominalHeadIndexAt(
    tokens,
    next,
    n,
    (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
    likenessOwnedHeadReach ? AUTHORED_PAUSE_SEPARATIONS : DETACHED_SEPARATIONS
  );
  if (fastPathDerivedHeadIdx !== null && raw.get(next) === "attributive") {
    attributiveModifierChainHeadBySplitAt.set(next, fastPathDerivedHeadIdx);
  }
  if (renyouCompoundPrenominalEndpoint && raw.get(next) === "attributive") {
    renyouCompoundPrenominalSplits.add(next);
  }
  return "next";
}

function detectQuotedHeadAttributiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, next: number): void {
  const { tokens } = ctx;
  const inside = nextNonSpaceIndex(tokens, next + 1);
  if (inside !== null && NOUNISH_POS0_NUM.has((tokens[inside]?.pos ?? 0) & POS0)) {
    const afterInside = nextNonSpaceIndex(tokens, inside + 1);
    if (afterInside !== null && isExplicitQuoteClosingToken(tokens[afterInside]!)) {
      upsertBoundaryEvent(ctx, state, next, "attributive");
    }
  }
}

function detectModifierChainAttributiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, next: number, likenessOwnedHeadReach: boolean): void {
  const { tokens, n, lookups, runtimeTokens, whitespaceAdnominalLicenses } = ctx;
  const { raw, attributiveModifierChainHeadBySplitAt } = state;
  const modifierChainHeadIdx = attributiveEndpointModifierChainHeadIndex(
    tokens,
    next,
    lookups,
    likenessOwnedHeadReach,
    true,
    governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) ??
      firstAdnominalOnlyFormLicensedGapFrom(whitespaceAdnominalLicenses, next, n),
    undefined,
    governedReadingLicensedGapAt(whitespaceAdnominalLicenses, index, next) === undefined
      ? undefined
      : interrogativeAdverbAt(runtimeTokens, lookups)
  );
  if (modifierChainHeadIdx !== null) {
    upsertBoundaryEvent(ctx, state, next, "attributive");
    if (raw.get(next) === "attributive") {
      attributiveModifierChainHeadBySplitAt.set(next, modifierChainHeadIdx);
    }
  }
}

function renyouLexicalNounCompoundHeadAdmittedAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined
): boolean {
  const nounEnd = claims?.lexicalNounCompoundEnds.get(idx);
  return nounEnd !== undefined &&
    renyouNominalHeadAdmissionAt(tokens, idx, lookups, { lexicalNounCompoundEnd: nounEnd })?.kind === "lexical_noun_compound";
}

function attributiveEndpointModifierChainHeadIndex(
  tokens: readonly ClauseToken[],
  next: number,
  lookups: LookupTables,
  likenessOwnedHeadReach: boolean,
  boundaryEventOnset: boolean,
  permeableGapIdx?: number,
  nominalUnitHeadIndexAt?: (idx: number) => number | null,
  isPredicateBoundAdverbAt?: (idx: number) => boolean
): number | null {
  const admitsUnmarkedAdnominalHost = likenessOwnedHeadReach || boundaryEventOnset;
  return prenominalModifierChainHeadIndex(tokens, next, tokens.length, {
    auxiliaryStem: "opaque",
    separationRefused: likenessOwnedHeadReach
      ? AUTHORED_PAUSE_SEPARATIONS
      : DETACHED_SEPARATIONS,
    reach: likenessOwnedHeadReach ? "likeness_owned_phrase" : "adnominal_stack",
    ...(admitsUnmarkedAdnominalHost
      ? { isUnmarkedAdnominalHostAt: (hostIdx: number) => isBareKeijoujiDirectAttributiveHost(tokens, hostIdx, lookups) }
      : {}),
    derivedNominalHeadIndexAt: (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
    ...(permeableGapIdx === undefined ? {} : { permeableGapIdx }),
    ...(nominalUnitHeadIndexAt === undefined ? {} : { nominalUnitHeadIndexAt }),
    ...(isPredicateBoundAdverbAt === undefined ? {} : { isPredicateBoundAdverbAt })
  });
}

export function genitiveNominalContinuationHeadIndex(
  tokens: readonly ClauseToken[],
  next: number,
  lookups: LookupTables
): number | null {
  return attributiveEndpointModifierChainHeadIndex(tokens, next, lookups, false, false);
}

function interrogativeAdverbAt(tokens: readonly RuntimeHaruToken[], lookups: LookupTables): (idx: number) => boolean {
  return (idx) => {
    const token = tokens[idx];
    return token !== undefined && tokenIsInterrogativeLexeme(token, lookups);
  };
}

export function collectWhitespaceAdnominalLicenses(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  nominalUnits: JunctureNominalUnitSources,
  attributiveReadings: ReadonlyMap<number, WhitespaceAttributiveReadingInput> | undefined
): ReadonlyMap<number, WhitespaceAdnominalLicense> {
  const licenses = new Map<number, WhitespaceAdnominalLicense>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    if (!isWitnessedChunkBreakBefore(tokens, gapIdx)) {
      continue;
    }
    const leftIdx = previousNonSpaceIndex(tokens, gapIdx);
    const left = leftIdx === null ? undefined : tokens[leftIdx];
    if (leftIdx === null || left === undefined) {
      continue;
    }
    const adnominalOnly = isAdnominalOnlyInflection(left.pos);
    const reading = adnominalOnly ? undefined : attributiveReadings?.get(gapIdx);
    if (!adnominalOnly && reading?.leftIdx !== leftIdx) {
      continue;
    }
    const headIdx = gapPermeableAttributiveHeadReach(
      tokens, runtimeTokens, leftIdx, gapIdx, lookups, nominalUnits,
      adnominalOnly ? undefined : interrogativeAdverbAt(runtimeTokens, lookups)
    );
    if (headIdx === null) {
      continue;
    }
    if (adnominalOnly) {
      licenses.set(gapIdx, { kind: "adnominal_only_form", headIdx });
    } else if (reading?.headIdx === headIdx) {
      licenses.set(gapIdx, { kind: reading.witness.kind, headIdx, leftIdx });
    }
  }
  return licenses;
}

function governedReadingLicensedGapAt(
  licenses: ReadonlyMap<number, WhitespaceAdnominalLicense>,
  endpointIdx: number,
  next: number
): number | undefined {
  const license = licenses.get(next);
  return isWhitespaceAttributiveReadingLicense(license) && license.leftIdx === endpointIdx ? next : undefined;
}

function firstAdnominalOnlyFormLicensedGapFrom(
  licenses: ReadonlyMap<number, WhitespaceAdnominalLicense>,
  from: number,
  end: number
): number | undefined {
  let first: number | undefined;
  for (const [gapIdx, license] of licenses) {
    if (license.kind === "adnominal_only_form" && gapIdx >= from && gapIdx < end && (first === undefined || gapIdx < first)) {
      first = gapIdx;
    }
  }
  return first;
}

function whitespaceJunctureNominalUnitHeadAt(
  tokens: readonly ClauseToken[],
  idx: number,
  units: JunctureNominalUnitSources
): number | null {
  const span = balancedDelimiterSpanOpeningAtIn(units.balancedDelimiterSpans, idx);
  if (span !== undefined) {
    const inside = nextNonSpaceIndex(tokens, idx + 1);
    return inside !== null && isAttributiveHeadNounishToken(tokens[inside]) &&
      nextNonSpaceIndex(tokens, inside + 1) === span.closingIdx
      ? inside
      : null;
  }
  return units.bareKeijoujiAttributiveHeads.get(idx + 1)?.katakanaRun === true ? idx + 1 : null;
}

export function gapPermeableAttributiveHeadReach(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  leftIdx: number,
  gapIdx: number,
  lookups: LookupTables,
  nominalUnits: JunctureNominalUnitSources,
  isPredicateBoundAdverbAt?: (idx: number) => boolean
): number | null {
  const left = tokens[leftIdx];
  if (
    left === undefined ||
    (!isAttributiveOrHomophonousTerminalInflection(left.pos) &&
      !isConjecturalCopulaAttributiveEndpoint(runtimeTokens, leftIdx))
  ) {
    return null;
  }
  return attributiveEndpointModifierChainHeadIndex(
    tokens,
    gapIdx,
    lookups,
    isLikenessModalAdnominalTailEnd(runtimeTokens, leftIdx),
    false,
    gapIdx,
    (idx) => whitespaceJunctureNominalUnitHeadAt(tokens, idx, nominalUnits),
    isPredicateBoundAdverbAt
  );
}

function conjecturalCopulaSupportSpanStart(
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  if (isAffirmativeCopulaSupportVerbToken(token) && isVolitionalInflection(token.pos)) {
    const markerIdx = previousNonSpaceIndex(tokens, index);
    if (
      markerIdx !== null &&
      copulaDeMarkerRelationForToken(tokens[markerIdx], markerIdx, { consumers: ["copula_rules"] }) !== null
    ) {
      return markerIdx;
    }
  }
  return conjecturalCopulaHonorificSupportSpanStartAt(tokens, index);
}

function isConjecturalCopulaAttributiveEndpoint(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const markerIdx = conjecturalCopulaSupportSpanStart(tokens, index);
  if (markerIdx === null) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined) {
    return false;
  }
  return isTerminalOrAttributiveInflection(host.pos) ||
    pos0in(host.pos, NOMINAL_BITS) ||
    (isNaAdjCapable(host) && !isAuxiliaryStemToken(host));
}

export function conjecturalCopulaAttributiveEndpointClaimed(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || isAttributiveInflection(token.pos)) {
    return false;
  }
  if (!isConjecturalCopulaAttributiveEndpoint(tokens, index)) {
    return false;
  }
  const followerIdx = nextNonSpaceIndex(tokens, index + 1);
  return followerIdx !== null && !separatedAs(tokens, followerIdx, DETACHED_SEPARATIONS);
}

export function isRenyouCompoundPrenominalAttributiveEndpoint(
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || !isGeneralRenyouInflectedToken(token)) {
    return false;
  }
  const verbIdx = isRareruAuxiliaryToken(token) ? index - 1 : index;
  const verb = tokens[verbIdx];
  if (
    verb === undefined ||
    !isVerbPredicateToken(verb) ||
    isNonIndependentVerbToken(verb) ||
    (verbIdx !== index && separationBefore(tokens, index) !== null)
  ) {
    return false;
  }
  const headIdx = index + 1;
  const head = tokens[headIdx];
  if (
    head === undefined ||
    !isCommonNounToken(head) ||
    separationBefore(tokens, headIdx) !== null ||
    hasSourceOrdinalGapBeforeToken(tokens, headIdx)
  ) {
    return false;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, verbIdx);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix === undefined || !isPrefixAffixToken(prefix);
}

function renyouCompoundPassiveHeadAdmitted(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): boolean {
  const token = tokens[index];
  if (token === undefined || !isRareruAuxiliaryToken(token)) {
    return true;
  }
  const head = tokens[index + 1];
  return head !== undefined && isAnimateReferentToken(head, lookups);
}

function ownsCaseParticleSinceLastBoundary(
  tokens: readonly ClauseToken[],
  verbIdx: number,
  boundaries: ReadonlyMap<number, BoundaryKind>
): boolean {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= verbIdx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  for (let idx = clauseStart; idx < verbIdx; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && isCaseParticleToken(token) && !isAdnominalGenitiveMarkerToken(token)) {
      return true;
    }
  }
  return false;
}
