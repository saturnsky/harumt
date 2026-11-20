import { wakeFrameOwnsHeadAt } from "../../../../semantics/wake.js";
import { explanatoryMonReadingAt } from "../../../../semantics/explanatory-mon-reading.js";
import { isKoroTemporalNiHeadToken, isTokoroAboutToHeadToken, isTokoroAlmostHeadToken, isTokoroConcessiveDeHeadToken, isTokoroResultHeadToken, isTokoroTemporalDeHeadToken } from "../../families/tokoro-semantics.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isSecondaryParticle } from "../../../../particles/secondary-particle.js";
import { isCopulaAuxToken } from "../../../../semantics/copula-tail-runtime.js";
import { matchCopula } from "../matchers/copula.js";
import { isAdnominalCopulaToken, isLikenessModalAdnominalTailEnd, isProjectingModalAdnominalTailEnd, isAppearanceModalAdnominalTailEnd, isAffirmativeCopulaSupportVerbToken, isIntrinsicHonorificCopulaSupportVerbToken, isMizenVoiceHonorificCopulaSupportVerbToken, copulaHonorificVoiceClusterLength, isEquivalenceCarrierAdnominalToken, isEquivalenceCarrierPredicativeNoun, isTeSurfaceConnectiveToken } from "../classifiers/tokens.js";
import { matchScopeBridge } from "../matchers/scope-bridge.js";
import { matchTokoroResultConnectiveAt } from "../matchers/tokoro-result-connective.js";
import { isObligationSpanStartingAtToken } from "../matchers/obligation.js";
import { matchPredicateProjectionConnectiveAt, matchQuotativeMannerSimileConnectiveAt, keijoujiAttributiveMarkerAt, perceptionCarrierVerbMatch } from "../matchers/predicate-projection-connective.js";
import { isKeijoujiCopulaPredicateStart, isNominalCopulaHostPos, nounCompoundSuffixRunEnd } from "./readiness.js";
import { attributiveHeadAnchorAt } from "../nominal-host-phrase.js";
import { closesUtteranceAs, utteranceClosureAfter, utteranceClosureTokenIdx, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { activeProtoLayout, protoLayoutForTokens } from "../../../../clause-layout/index.js";
import { findAdverbialModifierPredicate } from "../../../../clause-layout/adverbial-predicate.js";
import { leadingQuoteAttributiveNominalHeadAnchorAfterToken } from "../../../../clause-layout/prenominal-head-reach.js";
import { isAttributiveHeadNounishToken, type BareKeijoujiAttributiveEvidence, type ExplicitAdnominalNoAttributiveEvidence } from "../../../../clause-layout/nominal-anchor-evidence.js";
import { explicitAdnominalNoAttributiveEvidence } from "../../../../clause-layout/nominal-anchors.js";
import { DETACHED_SEPARATIONS, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "../../../../clause-layout/trivia.js";
import { activeProtoClosesClauseAtDetachedTerminalNodaAfter, activeProtoClosesUtteranceBefore, activeProtoClosesUtteranceBeforeGivenFormalNounHead, activeProtoClosedPropositionBeforeMarkerAt } from "../../../../clause-layout/proto-state.js";
import { detectSfp } from "../../../../semantics/grammar-runtime.js";
import { matchEpistemicHedgeCarrierShapeAtHead } from "../matchers/epistemic-hedge.js";
import { classifyDatteMarkerAt, toiuAttributiveBoundarySplitAt, toiuAttributiveContinuationHeadIndex, toiuAttributiveHeadIndex, toiuAttributiveTailEnd } from "../../../../semantics/marker-roles.js";
import { isSettingAdjunctAttributiveHead } from "../../../candidate/semantic-classifiers.js";
import { MONO_FORMAL_NOUN_FORMS } from "../../../data/semantic-helper-sets.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { appearancePerceptionProjectionForToken, type AppearancePerceptionProjection } from "../appearance-perception-carrier-table.js";
import { declaredProjectionCarrierTokenBranchEndingAt } from "../projection-carrier-form-table.js";
import { classifyAttributiveHeadKind, isExternalRelationNominalModifierHead, isLikenessTransparentFormalNounHead } from "../structural-attributive-head-table.js";
import { bareQuoteCarrierBindsUtteranceContentHead, bareQuoteCarrierVolitionalContentFlavor } from "../quote-attributive-head-frame.js";
import { isDerivedNominalPhraseHead, resolveDerivationalSuffixProfile } from "../derivational-suffix-table.js";
import type { AttributiveBoundaryPayload, AttributiveBoundaryHeadKind, QuoteAttributiveFlavor } from "../grammar.js";
import { copulaDeMarkerRelationForToken, copulaHonorificSupportRelationAt, copulaNiMarkerRelationForToken, kaMarkerRelationAt, nominalLinkMarkerRelationAt } from "../../../boundary/marker.js";
import { isRhetoricalMonoKaHeadAt } from "../../../boundary/ka-ownership.js";
import { datteQuoteMarkerRelationAt, quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { isAdjNai, isVerbLemma } from "../../../../matchers.js";
import { INFLECTABLE_BITS, NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS4, POS5A, 意志推量形_, 形状詞, 終止形_, 助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ヌ, 助動詞_マス, 助動詞語幹, 動詞, 名詞, 連体形_, isAdverbCapableNominal, isAuxiliaryStemToken, isNaAdjCapable, isNonIndependentVerbToken, isNaAdjCapableNoun, isSubstantiveNounToken, isTerminalParticleToken, isNominalizerParticleToken, isPastAuxiliaryPos, isPoliteAuxiliaryPos, isMizenInflection, isVerbPredicateToken, isRareruAuxiliaryToken, PREDICATE_BITS, isTerminalOrAttributiveInflection, isAttributiveOrHomophonousTerminalInflection, 助詞_終助詞, 助詞_副助詞, 助詞_係助詞, isNaAdjectiveDerivationalSuffix, isRenyouInflection } from "../../../../../types/pos.js";
import { isNominalLikeAttributiveHead } from "./predicate-evidence.js";
import { findHostBearingExternalNominalizerPredicateFrame, isDeicticCopulaPredicateStart, negativeScopeBridgeEndAt, isAdverbCopulaPredicateStart, isNominalLikenessPredicateStart, youNiCarrierVerbIndex, isYouNiChangeControlCarrierStart, isYouNiPerceptionCarrierStart } from "./predicate-start-evidence.js";

export function classifyZeroHeadAttributiveChunkBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): { readonly payload: AttributiveBoundaryPayload } | null {
  const splitAt = zeroHeadAttributiveBoundarySplitAt(tokens, startIdx, contentEndIdx, lookups);
  if (splitAt === null) {
    return null;
  }
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const head = tokens[headIdx];
  if (!isNominalLikeAttributiveHead(head)) {
    return null;
  }
  const headKind = classifyAttributiveHeadKind(head);
  if (!canExternalContentOwnAttributiveHead(tokens, startIdx, contentEndIdx, headIdx, headKind, lookups)) {
    return null;
  }
  return {
    payload: {
      kind: "attributiveBoundary",
      source: { tokens: [head], tokenIndices: [headIdx] },
      head: {
        surface: head.surface,
        dictionaryForm: head.dictionaryForm,
        pos: head.pos,
        tokenIdx: headIdx
      },
      headKind,
      projectionContext: {
        tokens,
        contentIdx: contentEndIdx
      },
      projection: "ordinary_nominal"
    }
  };
}

function zeroHeadAttributiveBoundarySplitAt(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): number | null {
  const directSplitAt = contentEndIdx + 1;
  if (isNominalLikeAttributiveHead(tokens[directSplitAt])) {
    return directSplitAt;
  }
  const nonSpaceSplitAt = nextNonSpaceIndex(tokens, directSplitAt, tokens.length);
  if (
    nonSpaceSplitAt !== null &&
    nonSpaceSplitAt !== directSplitAt &&
    isNominalLikeAttributiveHead(tokens[nonSpaceSplitAt])
  ) {
    return nonSpaceSplitAt;
  }
  return attributiveBoundarySplitAt(tokens, startIdx, contentEndIdx, lookups);
}

export function structuralAttributiveAssemblerSuffixPayload(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  suffixStart: number,
  lookups: LookupTables
): AttributiveBoundaryPayload | null {
  if (suffixStart <= start) {
    return null;
  }
  if (
    !isStructuralAttributivePrefixEnd(tokens[suffixStart - 1]) &&
    !isBareQuoteAttributiveCarrierBoundary(tokens, suffixStart - 1, suffixStart, lookups) &&
    !isRecentPastBakariAdnominalAttributivePrefixEnd(tokens, start, suffixStart - 1) &&
    !isEquivalenceDouzenAdnominalAttributivePrefixEnd(tokens, start, suffixStart - 1) &&
    !isDeclaredProjectionCarrierAdnominalPrefixEnd(tokens, start, suffixStart - 1)
  ) {
    return null;
  }
  return classifyStructuralAttributiveBoundaryPayload(tokens, start, suffixStart - 1, suffixStart, lookups);
}

function isRecentPastBakariAdnominalAttributivePrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  if (contentEndIdx < start + 2) {
    return false;
  }
  const no = tokens[contentEndIdx];
  if (
    no === undefined ||
    no.surface !== "の" ||
    (no.pos & POS0) !== 助詞 ||
    !isSecondaryParticle(tokens[contentEndIdx - 1], "ばかり")
  ) {
    return false;
  }
  return isPastAttributiveTailEnd(tokens[contentEndIdx - 2]);
}

function isDeclaredProjectionCarrierAdnominalPrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  const declared = declaredProjectionCarrierTokenBranchEndingAt(tokens, contentEndIdx);
  return declared !== null &&
    declared.branch.terminal === "attributive" &&
    declared.markerStart > start;
}

function isEquivalenceDouzenAdnominalAttributivePrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  const minimumLength = isEquivalenceCarrierAdnominalToken(tokens[contentEndIdx]) ? 2 : 3;
  return contentEndIdx >= start + minimumLength &&
    isEquivalenceDouzenAdnominalTailEnd(tokens, contentEndIdx);
}

function isEquivalenceDouzenAdnominalTailEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  if (isEquivalenceCarrierAdnominalToken(tokens[contentEndIdx])) {
    return contentEndIdx >= 2 &&
      isEquivalenceCarrierMoMarker(tokens[contentEndIdx - 1]) &&
      isEquivalenceCarrierHostTailEnd(tokens[contentEndIdx - 2]);
  }
  const no = tokens[contentEndIdx];
  const carrier = tokens[contentEndIdx - 1];
  if (
    no === undefined ||
    carrier === undefined ||
    contentEndIdx < 3 ||
    no.surface !== "の" ||
    (no.pos & POS0) !== 助詞 ||
    !isEquivalenceCarrierPredicativeNoun(carrier) ||
    !isEquivalenceCarrierMoMarker(tokens[contentEndIdx - 2])
  ) {
    return false;
  }
  return isEquivalenceCarrierHostTailEnd(tokens[contentEndIdx - 3]);
}

function isEquivalenceCarrierMoMarker(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && token.surface === "も" && (token.pos & POS01) === 助詞_係助詞;
}

function isEquivalenceCarrierHostTailEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (isPastAttributiveTailEnd(token)) {
    return true;
  }
  const pos0 = token.pos & POS0;
  return (pos0 === 助動詞0 || pos0in(pos0, PREDICATE_BITS)) &&
    isTerminalOrAttributiveInflection(token.pos);
}

export function isStructuralAttributivePrefixEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  const form5A = token.pos & POS5A;
  if (pos0in(pos0, INFLECTABLE_BITS)) {
    return form5A === 連体形_ || form5A === 終止形_;
  }
  if (pos0 === 助動詞0) {
    return form5A === 連体形_ || form5A === 終止形_;
  }
  return false;
}

export function derivationalPredicateHeadEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number | null {
  if (tokens[start] === undefined) {
    return null;
  }
  let idx = start + 1;
  while (idx < tokens.length && isDerivationalHostChainToken(tokens[idx]!)) {
    idx += 1;
  }
  const suffix = tokens[idx];
  if (suffix === undefined || !isNaAdjectiveDerivationalSuffix(suffix)) {
    return null;
  }
  const chainFinal = tokens[idx - 1] ?? tokens[start];
  const profile = resolveDerivationalSuffixProfile(chainFinal, suffix.dictionaryForm);
  return profile === undefined || profile.hostForm === "noun_compound" ? null : idx + 1;
}

function isDerivationalHostChainToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助動詞0 || pos0 === 動詞;
}

const ELIDED_ADVERBIAL_TARGET_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

export function isSoudaYotaiAdverbialModifierBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  if (appearancePerceptionProjectionForToken(tokens[end - 1]) !== "sou_appearance") {
    return false;
  }
  if (
    copulaNiMarkerRelationForToken(tokens[end], end, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  if (perceptionCarrierVerbMatch(tokens[end + 1], tokens[end + 2]) !== null) {
    return false;
  }
  if (findAdverbialModifierPredicate(tokens, end, {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS
  }) !== null) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, end + 1),
    ELIDED_ADVERBIAL_TARGET_CLOSURES
  );
}

export function isDeclaredProjectionCarrierAdverbialBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  lookups: LookupTables
): boolean {
  const declared = declaredProjectionCarrierTokenBranchEndingAt(tokens, end);
  if (declared === null || declared.branch.terminal !== "adverbial_modifier" || declared.markerStart <= start) {
    return false;
  }
  if (findAdverbialModifierPredicate(tokens, end, {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS
  }) !== null) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, end + 1),
    ELIDED_ADVERBIAL_TARGET_CLOSURES
  );
}

export function shouldSuppressFormalToSuruControlForAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  _startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  const splitAt = nextNonSpaceIndex(tokens, contentEndIdx + 1, tokens.length) ?? contentEndIdx + 1;
  if (protoLayoutForTokens(tokens, lookups).boundaryEventAt(splitAt)?.kind !== "attributive") {
    return false;
  }
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const head = tokens[headIdx];
  if (!isNominalLikeAttributiveHead(head)) {
    return false;
  }
  return classifyAttributiveHeadKind(head) === "ordinary_nominal";
}

export function renyouCompoundPrenominalAttributiveTerminalAllowed(contentEndIdx: number): boolean {
  return activeProtoLayout()?.isRenyouCompoundPrenominalHead(contentEndIdx + 1) === true;
}

function isRenyouCompoundPrenominalResultativeState(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  splitAt: number,
  head: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  if (
    splitAt !== contentEndIdx + 1 ||
    !renyouCompoundPrenominalAttributiveTerminalAllowed(contentEndIdx) ||
    isSettingAdjunctAttributiveHead(head, lookups)
  ) {
    return false;
  }
  const end = tokens[contentEndIdx];
  if (end === undefined) {
    return false;
  }
  if (isRareruAuxiliaryToken(end)) {
    return true;
  }
  return isVerbPredicateToken(end) && lookups.isTeIruResultativeVerb(end.dictionaryForm);
}

export function attributiveBoundarySplitAt(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): number | null {
  const directSplitAt = contentEndIdx + 1;
  const layout = protoLayoutForTokens(tokens, lookups);
  const isAttributiveEventAt = (splitAt: number): boolean => layout.boundaryEventAt(splitAt)?.kind === "attributive";
  if (isAttributiveEventAt(directSplitAt)) {
    return directSplitAt;
  }
  const nonSpaceSplitAt = nextNonSpaceIndex(tokens, directSplitAt, tokens.length);
  if (
    nonSpaceSplitAt !== null &&
    nonSpaceSplitAt !== directSplitAt &&
    isAttributiveEventAt(nonSpaceSplitAt)
  ) {
    return nonSpaceSplitAt;
  }
  for (let markerIdx = startIdx + 1; markerIdx < contentEndIdx; markerIdx += 1) {
    if (toiuAttributiveTailEnd(tokens, markerIdx, tokens.length) !== contentEndIdx + 1) {
      continue;
    }
    const boundarySplitAt = toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups);
    if (
      boundarySplitAt !== null &&
      isAttributiveEventAt(boundarySplitAt)
    ) {
      return boundarySplitAt;
    }
  }
  return null;
}

function bareKeijoujiAttributiveHostEvidence(start: number): BareKeijoujiAttributiveEvidence | undefined {
  return activeProtoLayout()?.bareKeijoujiAttributiveEvidenceAt(start + 1);
}

export function adnominalCopulaAttributiveHeadCanBeExternallyOwned(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number,
  headSearchStart: number,
  lookups?: LookupTables
): boolean {
  const headIdx = lookups === undefined
    ? headSearchStart
    : attributiveEventModifierChainHeadIndexAt(tokens, headSearchStart, lookups) ?? headSearchStart;
  const head = tokens[headIdx];
  if (
    head === undefined ||
    !(isNominalLikeAttributiveHead(head) || isDerivedNominalPhraseHead(tokens, headIdx))
  ) {
    return false;
  }
  const headKind = classifyAttributiveHeadKind(head);
  if (headKind === "ordinary_nominal") {
    return true;
  }
  if (isAppearanceModalAdnominalTailEnd(tokens, contentEndIdx)) {
    return false;
  }
  return lookups !== undefined &&
    canExternalContentOwnAttributiveHead(tokens, spanStartIdx, contentEndIdx, headIdx, headKind, lookups);
}

function bareKeijoujiDirectAttributiveBoundaryEvidence(
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): BareKeijoujiAttributiveEvidence | undefined {
  if (startIdx !== contentEndIdx || splitAt !== startIdx + 1) {
    return undefined;
  }
  return bareKeijoujiAttributiveHostEvidence(startIdx);
}

function explicitAdnominalNoAttributiveBoundaryEvidence(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  if (startIdx + 1 !== contentEndIdx || splitAt !== contentEndIdx + 1) {
    return null;
  }
  return explicitAdnominalNoAttributiveEvidenceAt(tokens, contentEndIdx, lookups);
}

export function explicitAdnominalNoAttributiveEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  const layout = activeProtoLayout();
  return layout === null ? null : explicitAdnominalNoAttributiveEvidence(layout, tokens, markerIdx, lookups);
}

function isCopulaSupportAuxiliaryVerbToken(
  token: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    (token.dictionaryForm === "御座る" || token.dictionaryForm === "ござる");
}

function isPoliteChainClosedByUtteranceSeparation(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number
): boolean {
  const politeIdx = isPastAuxiliaryPos(tokens[contentEndIdx]?.pos ?? 0) ? contentEndIdx - 1 : contentEndIdx;
  if (!isPoliteAuxiliaryPos(tokens[politeIdx]?.pos ?? 0)) {
    return false;
  }
  if (isCopulaSupportAuxiliaryVerbToken(tokens[politeIdx - 1])) {
    return false;
  }
  return separatedAs(tokens, headIdx, DETACHED_SEPARATIONS);
}

function isLikenessModalOwnedAttributiveBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  return isLikenessModalAdnominalTailEnd(tokens, contentEndIdx);
}

export function classifyStructuralAttributiveBoundaryPayload(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): AttributiveBoundaryPayload | null {
  if (
    isTerminalParticleToken(tokens[contentEndIdx] ?? { pos: 0 }) ||
    isNominalizerParticleToken(tokens[contentEndIdx] ?? { pos: 0 }) ||
    activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, contentEndIdx + 1)
  ) {
    return null;
  }
  if (modalAttributiveSpanRestsOnClosedUtterance(tokens, startIdx, contentEndIdx, splitAt, lookups)) {
    return null;
  }
  const toNoAttributiveCarrierBoundary = isToNoAttributiveCarrierBoundary(
    tokens,
    startIdx,
    contentEndIdx,
    lookups
  );
  const bareQuoteCarrierBoundary = isBareQuoteAttributiveCarrierBoundary(tokens, contentEndIdx, splitAt, lookups);
  const toiuCarrierBoundary = isToiuAttributiveCarrierBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const predicateQuoteCarrierBoundary =
    toiuCarrierBoundary ||
    isTosuruAttributiveCarrierBoundary(tokens, startIdx, contentEndIdx, splitAt) ||
    toNoAttributiveCarrierBoundary ||
    bareQuoteCarrierBoundary;
  const bareQuoteVolitionalContentFlavor = bareQuoteCarrierBoundary
    ? bareQuoteVolitionalContentAttributiveFlavor(tokens, contentEndIdx, splitAt, lookups)
    : null;
  const quotedContentHeadBinding = toiuCarrierBoundary ||
    (bareQuoteCarrierBoundary && bareQuoteCarrierBindsContentHead(tokens, splitAt, lookups));
  const explicitAdnominalNo = explicitAdnominalNoAttributiveBoundaryEvidence(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const attributiveReachedHeadIdx = explicitAdnominalNo?.headIdx ??
    attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const nounCopulaAttributiveBoundary =
    isNounCopulaDearuAttributiveBoundary(tokens, startIdx, contentEndIdx, attributiveReachedHeadIdx) ||
    isNounScopeBridgeAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt) ||
    isNegativeCopulaAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const bareKeijoujiAttributiveEvidence =
    bareKeijoujiDirectAttributiveBoundaryEvidence(startIdx, contentEndIdx, splitAt);
  const bareKeijoujiAttributiveBoundary = bareKeijoujiAttributiveEvidence !== undefined;
  const likenessModalBoundaryEnd =
    isLikenessModalOwnedAttributiveBoundaryEnd(tokens, contentEndIdx);
  if (
    isNominalLikenessPredicateStart(tokens, startIdx) &&
    !isYouNiChangeControlCarrierStart(tokens, startIdx) &&
    !isYouNiPerceptionCarrierStart(tokens, startIdx)
  ) {
    const nominalHostBoundary =
      isNominalHostLikenessAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
    if (!nominalHostBoundary && !predicateQuoteCarrierBoundary) {
      return null;
    }
  }
  if (
    !likenessModalBoundaryEnd &&
    findHostBearingExternalNominalizerPredicateFrame(tokens, startIdx, contentEndIdx) !== null
  ) {
    return null;
  }
  const headAnchor = toNoAttributiveCarrierBoundary
    ? structuredToNoAttributiveHeadAnchor(tokens, contentEndIdx, lookups)
    : (() => {
      const anchor = attributiveHeadAnchorAt(tokens, attributiveReachedHeadIdx);
      return anchor === undefined ? undefined : { ...anchor, sourceToken: anchor.token };
    })();
  if (
    headAnchor === undefined ||
    !(
      isNominalLikeAttributiveHead(headAnchor.token) ||
      isDerivedNominalPhraseHead(tokens, headAnchor.tokenIdx)
    )
  ) {
    return null;
  }
  if (isPoliteChainClosedByUtteranceSeparation(tokens, contentEndIdx, headAnchor.tokenIdx)) {
    return null;
  }
  const head = headAnchor.token;
  const headIdx = headAnchor.tokenIdx;
  const headKind = classifyAttributiveHeadKind(head);
  const youNiCarrierSpan = attributiveSpanCarriesYouNiCarrierChain(tokens, startIdx, contentEndIdx);
  if (
    headKind === "ordinary_nominal" &&
    attributiveSpanEndsWithAdnominalCopula(tokens, contentEndIdx) &&
    !predicateModalAttributiveSpan(tokens, startIdx, contentEndIdx, "any") &&
    !isSimpleKeijoujiAdnominalAttributiveSpan(tokens, startIdx, contentEndIdx) &&
    !isStandaloneLikenessMarkerAttributiveSpan(tokens, startIdx, contentEndIdx)
  ) {
    return null;
  }
  if (
    !canExternalContentOwnAttributiveHead(tokens, startIdx, contentEndIdx, headIdx, headKind, lookups) &&
    !predicateQuoteCarrierBoundaryCanBypassExternalHeadGuard(predicateQuoteCarrierBoundary, head, headKind) &&
    !nounCopulaAttributiveBoundary
  ) {
    return null;
  }
  const projection = (
    isPastAttributiveTailEnd(tokens[contentEndIdx]) ||
    isExperienceKotoGaAruAttributiveTail(tokens, startIdx, contentEndIdx)
  )
    ? "lexical_past"
    : isRenyouCompoundPrenominalResultativeState(tokens, contentEndIdx, splitAt, head, lookups)
      ? "resultative_state"
      : "ordinary_nominal";
  return {
    kind: "attributiveBoundary",
    source: { tokens: [headAnchor.sourceToken], tokenIndices: [headIdx] },
    head: {
      surface: head.surface,
      dictionaryForm: head.dictionaryForm,
      pos: head.pos,
      tokenIdx: headIdx
    },
    headKind,
    projectionContext: {
      tokens,
      contentIdx: contentEndIdx
    },
    projection,
    ...(youNiCarrierSpan && headKind === "scope_or_bound" && isFutureCommitmentHeadNoun(head, lookups)
      ? { headRequestsFutureProjection: true } as const
      : {}),
    ...(bareKeijoujiAttributiveBoundary ? { bareKeijoujiDirectAttributive: true } as const : {}),
    ...(bareKeijoujiAttributiveEvidence?.katakanaRun === true
      ? { bareKeijoujiKatakanaRun: true } as const
      : {}),
    ...(explicitAdnominalNo === null
      ? {}
      : { explicitAdnominalMarker: { tokens: [tokens[contentEndIdx]!], tokenIndices: [contentEndIdx] } }),
    ...(bareQuoteVolitionalContentFlavor === null ? {} : { bareQuoteVolitionalContentFlavor }),
    ...(quotedContentHeadBinding ? { quotedContentHeadBinding: true } as const : {})
  };
}

function isFutureCommitmentHeadNoun(
  head: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  return lookups.JP_FUTURE_HEAD_NOUNS.has(head.dictionaryForm) ||
    lookups.JP_FUTURE_HEAD_NOUNS.has(head.surface);
}

export function attributiveEventModifierChainHeadIndexAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): number | null {
  const event = protoLayoutForTokens(tokens, lookups).boundaryEventAt(splitAt);
  return event?.kind === "attributive" ? event.attributiveModifierChainHeadIdx ?? null : null;
}

function structuredToNoAttributiveHeadAnchor(
  tokens: readonly RuntimeHaruToken[],
  markerEndIdx: number,
  lookups: LookupTables,
): {
  readonly token: RuntimeHaruToken;
  readonly sourceToken: RuntimeHaruToken;
  readonly tokenIdx: number;
} | undefined {
  const layout = protoLayoutForTokens(tokens, lookups);
  const headAnchor = leadingQuoteAttributiveNominalHeadAnchorAfterToken(layout, tokens, markerEndIdx);
  if (headAnchor === null) {
    return undefined;
  }
  return {
    token: headAnchor.headToken,
    sourceToken: headAnchor.sourceToken,
    tokenIdx: headAnchor.tokenIdx
  };
}

function isToNoAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  for (let markerIdx = startIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const projection = matchPredicateProjectionConnectiveAt(tokens, markerIdx, {
      requireEnd: false,
      lookups
    });
    if (
      projection?.connective === "predicate_projection_quote_attributive" &&
      markerIdx + projection.consumed - 1 === contentEndIdx
    ) {
      return true;
    }
  }
  return false;
}

function isNounScopeBridgeAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): boolean {
  const host = tokens[startIdx];
  if (
    host === undefined ||
    !isNominalCopulaHostPos(host.pos) ||
    contentEndIdx + 1 !== splitAt ||
    !isNominalLikeAttributiveHead(tokens[splitAt])
  ) {
    return false;
  }
  const cursor = new TokenCursor(tokens, startIdx + 1, contentEndIdx + 1);
  const bridge = cursor.tx(matchScopeBridge);
  return bridge !== null && cursor.pos === contentEndIdx + 1;
}

function isNegativeCopulaAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const host = tokens[startIdx];
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  if (
    host === undefined ||
    contentEndIdx + 1 !== splitAt ||
    !isAttributiveHeadNounishToken(tokens[headIdx]) ||
    separatedAs(tokens, splitAt, DETACHED_SEPARATIONS)
  ) {
    return false;
  }
  return negativeCopulaPredicateSpanEndExclusive(tokens, startIdx, lookups) === contentEndIdx + 1;
}

export function negativeCopulaPredicateSpanEndExclusive(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  const bridgeIdx = negativeCopulaAttributiveHostEnd(tokens, startIdx, lookups);
  if (bridgeIdx === null) {
    return null;
  }
  const copula = matchCopula(tokens, bridgeIdx, lookups);
  const coreEnd = copula !== null && copula.op.polarity === "negative"
    ? bridgeIdx + copula.consumed
    : negativeScopeBridgeEndAt(tokens, bridgeIdx);
  if (coreEnd === null) {
    return null;
  }
  const tenseTail = tokens[coreEnd];
  if (tenseTail === undefined || (tenseTail.pos & POS4) !== 助動詞_タ) {
    return coreEnd;
  }
  const tenseForm = tenseTail.pos & POS5A;
  return tenseForm === 連体形_ || tenseForm === 終止形_ ? coreEnd + 1 : coreEnd;
}

function negativeCopulaAttributiveHostEnd(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  const host = tokens[startIdx];
  if (host === undefined) {
    return null;
  }
  if (isNominalCopulaHostPos(host.pos)) {
    return nounCompoundSuffixRunEnd(tokens, startIdx + 1, host, lookups);
  }
  if (isKeijoujiCopulaPredicateStart(tokens, startIdx)) {
    return startIdx + 1;
  }
  return isAdverbCopulaPredicateStart(tokens, startIdx, lookups) ||
    isDeicticCopulaPredicateStart(tokens, startIdx, lookups)
    ? startIdx + 1
    : null;
}

function predicateQuoteCarrierBoundaryCanBypassExternalHeadGuard(
  predicateQuoteCarrierBoundary: boolean,
  head: RuntimeHaruToken,
  headKind: AttributiveBoundaryHeadKind
): boolean {
  if (!predicateQuoteCarrierBoundary) {
    return false;
  }
  return headKind === "ordinary_nominal" ||
    isKotoAttributiveHead(head) ||
    isMonoAttributiveHead(head) ||
    headKind === "scope_or_bound";
}

function isNominalHostLikenessAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const host = tokens[startIdx];
  if (
    !isNounishAttributiveHost(host) &&
    keijoujiAttributiveMarkerAt(tokens, startIdx + 1) !== "no"
  ) {
    return false;
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, startIdx + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessIdx = hasNoMarker ? startIdx + 2 : startIdx + 1;
  const likeness = tokens[likenessIdx];
  if (likeness === undefined || (likeness.surface !== "よう" && likeness.surface !== "みたい")) {
    return false;
  }
  if ((likeness.pos & POS1) !== 助動詞語幹) {
    return false;
  }
  if (!hasNoMarker && likeness.surface !== "みたい") {
    return false;
  }
  const copulaIdx = likenessIdx + 1;
  const copula = tokens[copulaIdx];
  if (
    contentEndIdx === copulaIdx && splitAt === copulaIdx + 1 && copula !== undefined && (copula.pos & (POS4 | POS5A)) === (助動詞_ダ | 連体形_)
  ) {
    const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
    return isNominalLikeAttributiveHead(tokens[headIdx]) || isDerivedNominalPhraseHead(tokens, headIdx);
  }

  for (let markerIdx = likenessIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
    const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
    if (
      headIdx !== null &&
      tailEnd !== null &&
      contentEndIdx === tailEnd - 1 &&
      splitAt === toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups)
    ) {
      return isNominalLikeAttributiveHead(tokens[headIdx]) || isDerivedNominalPhraseHead(tokens, headIdx);
    }
  }
  return false;
}

export function isBareQuoteAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables | undefined
): boolean {
  const quote = quoteMarkerRelationAt(tokens, contentEndIdx, {
    consumers: ["tail_multi_clause"]
  });
  const head = tokens[splitAt];
  if (
    quote?.canonicalSurface !== "って" ||
    quote.span.endExclusive !== splitAt ||
    !isBareTteAttributiveNounHead(head) ||
    isMonoAttributiveHead(head)
  ) {
    return false;
  }
  let predIdx = previousNonSpaceIndex(tokens, contentEndIdx, 0);
  while (predIdx !== null) {
    const pred = tokens[predIdx];
    if (pred !== undefined && (pred.pos & POS01) === 助詞_終助詞) {
      predIdx = previousNonSpaceIndex(tokens, predIdx, 0);
      continue;
    }
    break;
  }
  const predicate = predIdx === null ? undefined : tokens[predIdx];
  if (predicate !== undefined && (predicate.pos & POS5A) === 意志推量形_) {
    if (
      lookups !== undefined &&
      bareQuoteVolitionalContentAttributiveFlavor(tokens, contentEndIdx, splitAt, lookups) !== null
    ) {
      return true;
    }
    if (classifyAttributiveHeadKind(head) === "ordinary_nominal") {
      return false;
    }
  }
  return true;
}

function bareQuoteVolitionalContentAttributiveFlavor(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  splitAt: number,
  lookups: LookupTables
): QuoteAttributiveFlavor | null {
  const closed = activeProtoClosedPropositionBeforeMarkerAt(tokens, markerIdx);
  if (closed?.evidence !== "bare_volitional") {
    return null;
  }
  const layout = activeProtoLayout();
  if (layout === null || layout.clauseCarriesInterrogativeFormAt(tokens, closed.hostIdx, lookups)) {
    return null;
  }
  const head = bareQuoteCarrierReachedContentHead(tokens, splitAt);
  return head === undefined ? null : bareQuoteCarrierVolitionalContentFlavor(head, lookups);
}

function bareQuoteCarrierReachedContentHead(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): RuntimeHaruToken | undefined {
  const headIdx = toiuAttributiveContinuationHeadIndex(tokens, splitAt, tokens.length);
  const head = headIdx === null ? undefined : tokens[headIdx];
  return head !== undefined && isNominalLikeAttributiveHead(head) ? head : undefined;
}

function bareQuoteCarrierBindsContentHead(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): boolean {
  const head = bareQuoteCarrierReachedContentHead(tokens, splitAt);
  return head !== undefined && bareQuoteCarrierBindsUtteranceContentHead(head, lookups);
}

function isToiuAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  for (let markerIdx = startIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
    const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
    if (
      headIdx !== null &&
      tailEnd !== null &&
      contentEndIdx === tailEnd - 1 &&
      splitAt === toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups)
    ) {
      return true;
    }
  }
  return false;
}

function isTosuruAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): boolean {
  if (!isNominalLikeAttributiveHead(tokens[splitAt])) {
    return false;
  }
  for (let markerIdx = startIdx + 1; markerIdx < contentEndIdx; markerIdx += 1) {
    const marker = quoteMarkerRelationAt(tokens, markerIdx, {
      consumers: ["tail_multi_clause"]
    });
    if (marker?.canonicalSurface !== "と" && marker?.canonicalSurface !== "って") {
      continue;
    }
    const carrierIdx = marker.span.endExclusive;
    if (carrierIdx !== contentEndIdx) {
      continue;
    }
    const carrier = tokens[carrierIdx];
    if (
      carrier !== undefined && carrier.dictionaryForm === "する" && (carrier.pos & (POS0 | POS5A)) === (動詞 | 連体形_)
    ) {
      return true;
    }
  }
  return false;
}

function isNounCopulaDearuAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  headIdx: number
): boolean {
  if (!isNominalLikeAttributiveHead(tokens[headIdx])) {
    return false;
  }
  const stem = tokens[startIdx];
  if (
    stem === undefined ||
    !(
      pos0in(stem.pos, NOMINAL_BITS) ||
      (isNaAdjCapable(stem) && !isAuxiliaryStemToken(stem))
    )
  ) {
    return false;
  }
  const supportIdx = copulaSupportAttributiveChainBodyIndex(tokens, contentEndIdx);
  return supportIdx !== null &&
    supportIdx - 1 > startIdx &&
    copulaSupportMarkerOwnsDeAt(tokens, supportIdx - 1);
}

export function copulaSupportMarkerOwnsDeAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  return copulaDeMarkerRelationForToken(tokens[idx], idx, { consumers: ["copula_rules"] }) !== null ||
    copulaHonorificSupportRelationAt(tokens, idx, { consumers: ["copula_rules"] }) !== null;
}

function copulaSupportAttributiveChainBodyIndex(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number | null {
  return copulaSupportChainBodyIndex(tokens, contentEndIdx, isTerminalOrAttributiveInflection);
}

export function copulaChainIndexBelowTenseAndPoliteLayers(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number {
  let cursor = contentEndIdx;
  if (isPastAuxiliaryPos(tokens[cursor]?.pos ?? 0)) {
    cursor -= 1;
  }
  if (isPoliteAuxiliaryPos(tokens[cursor]?.pos ?? 0)) {
    cursor -= 1;
  }
  return cursor;
}

export function copulaSupportChainBodyIndex(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  admitsChainEndInflection: (pos: number) => boolean
): number | null {
  const chainEnd = tokens[contentEndIdx];
  if (chainEnd === undefined || !admitsChainEndInflection(chainEnd.pos)) {
    return null;
  }
  let cursor = copulaChainIndexBelowTenseAndPoliteLayers(tokens, contentEndIdx);
  let honorificVoice = false;
  for (const length of [2, 1]) {
    const clusterStart = cursor - length + 1;
    if (clusterStart > 0 && copulaHonorificVoiceClusterLength(tokens, clusterStart) === length) {
      cursor = clusterStart - 1;
      honorificVoice = true;
      break;
    }
  }
  const support = tokens[cursor];
  if (support === undefined) {
    return null;
  }
  if (honorificVoice) {
    return isMizenVoiceHonorificCopulaSupportVerbToken(support) && isMizenInflection(support.pos)
      ? cursor
      : null;
  }
  if (
    !isAffirmativeCopulaSupportVerbToken(support) &&
    !isIntrinsicHonorificCopulaSupportVerbToken(support)
  ) {
    return null;
  }
  return cursor === contentEndIdx || isRenyouInflection(support.pos) ? cursor : null;
}

function isNounishAttributiveHost(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

export function canExternalContentOwnAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number,
  headIdx: number,
  kind: AttributiveBoundaryHeadKind,
  lookups: LookupTables
): boolean {
  if (isProjectingModalFormalNounAttributiveHead(tokens, contentEndIdx, headIdx)) {
    return true;
  }
  if (hedgeFrameClaimsAttributiveHead(tokens, headIdx)) {
    return false;
  }
  switch (kind) {
    case "ordinary_nominal":
      return !monHeadFollowerReservesModalReading(tokens, contentEndIdx, headIdx, lookups);
    case "future_commitment":
    case "stative_point":
      return true;
    case "scope_or_bound":
      return !isAssemblyFrameOwnedAttributiveHead(tokens, headIdx, lookups);
    case "external_relation": {
      const head = tokens[headIdx];
      return head !== undefined && isExternalRelationNominalModifierHead(head) &&
        nominalLinkMarkerRelationAt(tokens, headIdx + 1, { consumers: ["semantic_helpers"] }) !== null;
    }
    case "reason_or_purpose":
    case "likeness":
      return false;
  }
}

function isAssemblyFrameOwnedAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  if (
    isRhetoricalMonoKaHeadAt(tokens, headIdx) ||
    wakeFrameOwnsHeadAt(tokens, headIdx, lookups)
  ) {
    return true;
  }
  return isLegacyTokoroResultHead(tokens, headIdx, lookups) ||
    isTokoroTemporalDeHeadToken(tokens, headIdx, lookups) ||
    isTokoroConcessiveDeHeadToken(tokens, headIdx, lookups) ||
    isKoroTemporalNiHeadToken(tokens, headIdx) ||
    isTokoroAlmostHeadToken(tokens, headIdx, lookups) ||
    isTokoroAboutToHeadToken(tokens, headIdx, lookups);
}

function isLegacyTokoroResultHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  return isTokoroResultHeadToken(tokens, headIdx, lookups) &&
    matchTokoroResultConnectiveAt(tokens, headIdx, { lookups }) === null;
}

export function isSimpleKeijoujiAdnominalAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  const stem = tokens[startIdx];
  if (stem === undefined) {
    return false;
  }
  if (
    contentEndIdx === derivationalPredicateHeadEnd(tokens, startIdx) ||
    (
      contentEndIdx > startIdx + 1 &&
      isNominalCopulaHostPos(stem.pos) &&
      contentEndIdx === nounCompoundSuffixRunEnd(tokens, startIdx + 1)
    )
  ) {
    return true;
  }
  if (contentEndIdx !== startIdx + 1) {
    return false;
  }
  if ((stem.pos & POS0) === 形状詞) {
    return appearancePerceptionProjectionForToken(stem) === null;
  }
  return isNominalAdnominalCopulaHostSpan(tokens, startIdx, contentEndIdx);
}

export function isNominalAdnominalCopulaHostSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  const stem = tokens[startIdx];
  if (stem === undefined || contentEndIdx !== startIdx + 1) {
    return false;
  }
  if (isNaAdjCapableNoun(stem)) {
    return true;
  }
  return isSubstantiveNounToken(stem) &&
    isAdnominalCopulaToken(tokens[contentEndIdx]) &&
    adnominalCopulaHasAttributiveHeadEvidence(tokens, contentEndIdx);
}

function adnominalCopulaHasAttributiveHeadEvidence(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const splitAt = nextNonSpaceIndex(tokens, copulaIdx + 1);
  const clause = activeProtoLayout()?.clauseOfToken(copulaIdx);
  return splitAt !== null &&
    clause !== undefined &&
    clause.terminatedBy === "attributive" &&
    clause.end === splitAt;
}

export function isStandaloneLikenessMarkerAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  return contentEndIdx === startIdx + 1 &&
    isLikenessModalAdnominalTailEnd(tokens, contentEndIdx) &&
    nominalLinkMarkerRelationAt(tokens, startIdx - 1, { consumers: ["tail_multi_clause"] }) === null &&
    adnominalCopulaHasAttributiveHeadEvidence(tokens, contentEndIdx);
}

export function attributiveSpanEndsWithAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const token = tokens[contentEndIdx];
  return token !== undefined && (token.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_ダ | 連体形_);
}

export function predicateModalAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  projection: AppearancePerceptionProjection | "any"
): boolean {
  for (let idx = startIdx + 1; idx < contentEndIdx; idx += 1) {
    const stemProjection = appearancePerceptionProjectionForToken(tokens[idx]);
    if (stemProjection === null) {
      continue;
    }
    if (projection === "any" || stemProjection === projection) {
      return true;
    }
  }
  return false;
}

function modalAttributiveSpanRestsOnClosedUtterance(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  headIdx: number,
  lookups: LookupTables
): boolean {
  const stemIdx = contentEndIdx - 1;
  if (
    stemIdx <= startIdx ||
    !isAdnominalCopulaToken(tokens[contentEndIdx]) ||
    appearancePerceptionProjectionForToken(tokens[stemIdx]) === null
  ) {
    return false;
  }
  const closes = activeProtoClosesUtteranceBefore(stemIdx) ||
    (
      activeProtoClosesUtteranceBeforeGivenFormalNounHead(stemIdx) &&
      isLikenessTransparentFormalNounAttributiveHead(tokens[headIdx])
    );
  if (!closes) {
    return false;
  }
  if (attributiveSpanCarriesObligationIdiom(tokens, startIdx, contentEndIdx)) {
    return false;
  }
  return matchQuotativeMannerSimileConnectiveAt(tokens, stemIdx, lookups) === null;
}

function isLikenessTransparentFormalNounAttributiveHead(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    isLikenessTransparentFormalNounHead(token);
}

const MON_DATTE_TERMINAL_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal",
  "clause_boundary"
]);

function monHeadFollowerReservesModalReading(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number,
  lookups: LookupTables
): boolean {
  const head = tokens[headIdx];
  if (head === undefined || !isSurfaceOrDictionaryForm(head, [...MONO_FORMAL_NOUN_FORMS])) {
    return false;
  }
  const reading = explanatoryMonReadingAt(activeProtoLayout(), tokens, headIdx);
  if (reading.kind === "explanatory_sfp") {
    return true;
  }
  if (reading.kind === "pause_pending") {
    return false;
  }
  const closure = utteranceClosureAfter(activeProtoLayout(), tokens, headIdx + 1);
  const followerIdx = utteranceClosureTokenIdx(closure);
  if (followerIdx === null) {
    return true;
  }
  const follower = tokens[followerIdx];
  const copula = matchCopula(tokens, followerIdx, lookups);
  if (copula?.op.polarity === "negative") {
    return false;
  }
  const predicate = tokens[contentEndIdx];
  if (
    (follower !== undefined && isCopulaAuxToken(follower)) ||
    copula !== null ||
    kaMarkerRelationAt(tokens, followerIdx, ["tail_multi_clause"]) !== null
  ) {
    return predicate === undefined || !isAttributiveOrHomophonousTerminalInflection(predicate.pos);
  }
  if (quoteMarkerRelationAt(tokens, followerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  if (datteQuoteMarkerRelationAt(tokens, followerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    const role = classifyDatteMarkerAt(
      new TokenCursor(tokens, followerIdx, tokens.length, followerIdx),
      lookups,
      closesUtteranceAs(utteranceClosureAfter(activeProtoLayout(), tokens, followerIdx + 1), MON_DATTE_TERMINAL_CLOSURES)
        ? { terminalBoundary: true }
        : {}
    );
    if (role.isQuote || role.role === "hearsay_terminal") {
      return true;
    }
  }
  const predicatePos0 = predicate === undefined ? 名詞 : predicate.pos & POS0;
  const sfpCursor = new TokenCursor(tokens, followerIdx, tokens.length, followerIdx);
  detectSfp(sfpCursor, predicatePos0, predicatePos0 === 助動詞0, true);
  return sfpCursor.consumed > 0;
}

function isBareTteMarkerBeforeHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  return prev !== undefined && prev.surface === "って" && (prev.pos & POS01) === 助詞_副助詞;
}

function hedgeFrameClaimsAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): boolean {
  const shape = matchEpistemicHedgeCarrierShapeAtHead(tokens, headIdx);
  if (shape === null) {
    return false;
  }
  return !isBareTteMarkerBeforeHead(tokens, headIdx) || shape.spec.acceptsQuotative === true;
}

function isMonoAttributiveHeadToken(token: RuntimeHaruToken | undefined): boolean {
  return isSurfaceOrDictionaryForm(token, [...MONO_FORMAL_NOUN_FORMS]);
}

export function isProjectingModalFormalNounAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number
): boolean {
  return isLikenessTransparentFormalNounAttributiveHead(tokens[headIdx]) &&
    isProjectingModalAdnominalTailEnd(tokens, contentEndIdx);
}

export function attributiveSpanCarriesObligationIdiom(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number
): boolean {
  for (let idx = Math.max(0, spanStartIdx); idx <= contentEndIdx; idx += 1) {
    if (isObligationSpanStartingAtToken(tokens, idx)) {
      return true;
    }
  }
  return false;
}

function attributiveSpanCarriesYouNiCarrierChain(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number
): boolean {
  for (let idx = Math.max(0, spanStartIdx); idx <= contentEndIdx; idx += 1) {
    if (!isYouNiChangeControlCarrierStart(tokens, idx)) {
      continue;
    }
    const carrierIdx = youNiCarrierVerbIndex(tokens, idx);
    if (carrierIdx !== null && youNiCarrierChainClosesSpan(tokens, carrierIdx, contentEndIdx)) {
      return true;
    }
  }
  return false;
}

function youNiCarrierChainClosesSpan(
  tokens: readonly RuntimeHaruToken[],
  carrierIdx: number,
  contentEndIdx: number
): boolean {
  if (carrierIdx > contentEndIdx) {
    return false;
  }
  let idx = carrierIdx;
  while (idx < contentEndIdx) {
    const next = tokens[idx + 1];
    if (next === undefined) {
      return false;
    }
    if ((next.pos & POS0) === 助動詞0) {
      idx += 1;
      continue;
    }
    const teAuxiliary = tokens[idx + 2];
    if (
      isTeSurfaceConnectiveToken(next) &&
      teAuxiliary !== undefined &&
      isNonIndependentVerbToken(teAuxiliary)
    ) {
      idx += 2;
      continue;
    }
    return false;
  }
  return idx === contentEndIdx;
}

function isSurfaceOrDictionaryForm(
  token: RuntimeHaruToken | undefined,
  values: readonly string[]
): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return values.includes(token.surface) || values.includes(token.dictionaryForm);
}

function isKotoAttributiveHead(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 && (token.surface === "こと" || token.surface === "事");
}

export function isMonoAttributiveHead(token: RuntimeHaruToken): boolean {
  return isMonoAttributiveHeadToken(token) && (token.pos & POS0) === 名詞;
}

export function isBareTteAttributiveNounHead(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  if (isAdverbCapableNominal(token) && classifyAttributiveHeadKind(token) === "ordinary_nominal") {
    return false;
  }
  return true;
}

function isExperienceKotoGaAruAttributiveTail(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  for (let kotoPos = startIdx + 1; kotoPos <= contentEndIdx - 2; kotoPos++) {
    const koto = tokens[kotoPos];
    if (koto === undefined || (koto.pos & POS0) !== 名詞 || koto.surface !== "こと") {
      continue;
    }
    const beforeKoto = tokens[kotoPos - 1];
    if (beforeKoto === undefined || (beforeKoto.pos & POS4) !== 助動詞_タ) {
      continue;
    }
    const particle = tokens[kotoPos + 1];
    if (
      particle === undefined ||
      (particle.pos & POS0) !== 助詞 ||
      !(particle.surface === "が" || particle.surface === "も")
    ) {
      continue;
    }
    if (experiencePredicateEndsAt(tokens, kotoPos + 2, contentEndIdx)) {
      return true;
    }
  }
  return false;
}

function experiencePredicateEndsAt(
  tokens: readonly RuntimeHaruToken[],
  predicatePos: number,
  contentEndIdx: number
): boolean {
  const predicate = tokens[predicatePos];
  if (predicate === undefined) {
    return false;
  }
  if (isVerbLemma(predicate, "ある")) {
    if (predicatePos === contentEndIdx) {
      return true;
    }
    const masu = tokens[predicatePos + 1];
    const nu = tokens[predicatePos + 2];
    if (
      masu?.dictionaryForm === "ます" &&
      (masu.pos & POS4) === 助動詞_マス &&
      nu?.dictionaryForm === "ぬ" &&
      (nu.pos & POS4) === 助動詞_ヌ
    ) {
      if (predicatePos + 2 === contentEndIdx) {
        return true;
      }
      const desu = tokens[predicatePos + 3];
      const ta = tokens[predicatePos + 4];
      return predicatePos + 4 === contentEndIdx &&
        desu?.dictionaryForm === "です" &&
        (desu.pos & POS4) === 助動詞_デス &&
        ta !== undefined &&
        (ta.pos & POS4) === 助動詞_タ;
    }
    const masuPast = tokens[predicatePos + 1];
    const ta = tokens[predicatePos + 2];
    return predicatePos + 2 === contentEndIdx &&
      masuPast?.dictionaryForm === "ます" &&
      (masuPast.pos & POS4) === 助動詞_マス &&
      ta !== undefined &&
      (ta.pos & POS4) === 助動詞_タ;
  }
  if (isAdjNai(predicate)) {
    if (predicatePos === contentEndIdx) {
      return true;
    }
    const next = tokens[predicatePos + 1];
    return predicatePos + 1 === contentEndIdx &&
      next !== undefined &&
      ((next.pos & POS4) === 助動詞_タ || (next.pos & POS4) === 助動詞_デス);
  }
  return false;
}

function isPastAttributiveTailEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) !== 助動詞0) {
    return false;
  }
  return token.dictionaryForm === "た" || token.surface === "た" || token.surface === "だ";
}
