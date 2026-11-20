import { quoteStructuralRelationIndex } from "../structural-relation/quote.js";
import { matchMonoNoConcessiveConnectiveStart, matchNoNiConcessiveConnectiveStart, isQuotativeToTokensWide } from "../semantics/helpers.js";
import { isBaSufficiencyConditionalAt } from "../semantics/permission-idiom.js";
import { TokenCursor } from "../token-cursor.js";
import { adjectivalConcessiveTomoRelationAt, dewaScopeBridgeRelationAt, kaMarkerRelationForToken, nominalizerReasonConnectiveRelationAt } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { copulaFocusContinuationRelationAt } from "../head-tail/boundary/window.js";
import { negativeCopulaCorrectionShapeAt, type NegativeCopulaCorrectionEvidence } from "./negative-copula-correction.js";
import type { SeparationKind } from "../../types/token.js";
import { chuushiClosureRight, isChuushiClauseCoordinationPreludeToken, type ChuushiClosureRightInputs, isChuushiClosureTopicMarkerToken, teChuushiClosureLeftAt } from "./chuushi-closure.js";
import { isNominalizerFunctionalContinuationToken } from "../head-tail/tail/predicate-root/matchers/nominalizer.js";
import { hardTerminalPunctuationSurfaceClassForToken, isHardTerminalPunctuationToken, isWeakPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { terminalPunctuationRunQuestionIndex } from "./speech-act.js";
import { connectiveAdmitsEllipticFollowerClause, hasEllipticFollowerClauseEvidence, isRefusedUtteranceHeadToken } from "../head-tail/boundary/clause-start.js";
import { compositeConnectivePatternRelationAt, layoutBoundaryShieldAt, relationConnectiveSpansAt, relationDiscontinuousClosureSpanAfter } from "../head-tail/tail/connective-span-scanner.js";
import { isTeConnectiveToken, isTeTailImperativeFormClosureAt, matchTeTailContinuationAt, teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { findTeEvaluationFollowerIndex } from "../head-tail/tail/postverb-events.js";
import { connectiveSurfaceRequiresFinalPosition, lookupConnectiveBySurface } from "../head-tail/tail/predicate-root/connective-surface-lookup.js";
import { boundNominalReasonCompositeFollowerAdmitted } from "../head-tail/tail/predicate-root/matchers/tame-connective.js";
import { isObligationSpanContaining } from "../head-tail/tail/predicate-root/matchers/obligation.js";
import { fusedCopulaSupportConnectiveKindOf, fusedCopulaSupportHostSlotAt, isClassicalZuIzenkeiToken, isSuruVerbToken, volitionalAttemptMarkerAt } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { volitionalLexicalBindingAt } from "./volitional-intent-binding.js";
import type { FusedCopulaSupportHostSlot } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { likenessEvaluativeConditionMarkerEndAt } from "../head-tail/tail/predicate-root/matchers/scope-bridge.js";
import { matchQuotedJudgmentPassiveTail } from "../semantics/modality-specs.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClauseHardTerminalPunctuationToken, isClauseOpeningPunctuationToken, isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, SEPARATION_OPENS_BOUNDARY, separatedAs } from "./trivia.js";
import { balancedDelimiterSpanOpeningAtIn } from "./balanced-delimiter.js";
import { quotedJudgmentHeadBeforeMarker } from "./quoted-judgment.js";
import { demoDiscourseUtteranceInitialMatchLengthAt } from "../demo-discourse.js";
import { POS0, POS01, POS1, POS4, POS5A, isNominalLike, isNominalScopeParticleToken, isCaseParticleToken, isLexicalBareNaAdjStem, isLexicalAdverb, isMizenInflection, isNegativeAuxiliaryPos, isSahenCapableNominal, isTerminalParticleToken, isVerbPredicateToken, isVolitionalInflection, pos0in, 意志推量形_, 已然形_, 仮定形_, 格助詞, 感動詞, 形状詞, 形容詞0, 終止形_, 助詞, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 助動詞_マス, 接続助詞, 接頭辞, 代名詞, 動詞, 名詞, 命令形_, 連体形_, 連用形_, INFLECTABLE_BITS, INFLECTABLE_AUX_BITS, 助詞_格助詞, 助詞_係助詞, 助詞_接続助詞, isIndependentWordToken, isUtteranceInterjectionToken, isConjunctionToken } from "../../types/pos.js";
import { pairedVolitionalPredicateShape, type PairedVolitionalPredicateShape } from "./predicate-parallel.js";
import type { BoundaryKind, ClauseToken, PairedVolitionalConcessiveEvidence } from "./layout-types.js";
import { upsertBoundaryEvent, hasFollowingClausePredicateEvidence } from "./boundary-event-common.js";
import { isFinitePredicateBoundaryLeft, isClausePredicateEvidenceToken } from "./token-evidence.js";
import { isPostposedVocativeHead } from "./vocative.js";
import { skipTerminalParticleRun } from "./trivia.js";
import { isBoundaryPunct, isAbsorbablePunct } from "./punctuation.js";
import { isInsideClauseOpaqueNominalFrameSurface } from "./nominal-frame-reach.js";
import type { ClauseBoundaryScanSignal, ClauseBoundaryDetectionContext, ClauseBoundaryDetectionState } from "./boundary-detection.js";
import { nominalCopulaPredicateAt } from "./predicate-shape.js";
import { nominalZeroCopulaPredicateAt } from "./predicate-token-shape.js";

function chuushiClosureEdgeDetachedKind(
  tokens: readonly ClauseToken[],
  followerIdx: number,
  lookups: LookupTables
): "vocative" | "interjection" | null {
  const follower = tokens[followerIdx];
  if (follower === undefined) {
    return null;
  }
  if (isUtteranceInterjectionToken(follower) && interjectionClosesItsOwnUtterance(tokens, followerIdx)) {
    return "interjection";
  }
  const vocativeIdx = isWeakPunctuationToken(follower) ? nextNonSpaceIndex(tokens, followerIdx + 1) : followerIdx;
  return vocativeIdx !== null && isPostposedVocativeHead(tokens, vocativeIdx, lookups, "noun_phrase") ? "vocative" : null;
}

export function chuushiClosureDetachedRightInputs(
  tokens: readonly ClauseToken[],
  followerIdx: number,
  lookups: LookupTables
): Pick<ChuushiClosureRightInputs, "edgeDetachedKind" | "separatedUtteranceHead" | "discourseOnsetHead"> {
  return {
    edgeDetachedKind: chuushiClosureEdgeDetachedKind(tokens, followerIdx, lookups),
    separatedUtteranceHead:
      separatedAs(tokens, followerIdx, CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS) &&
      chuushiClosureFollowerOpensUtterance(tokens, followerIdx),
    discourseOnsetHead: chuushiClosureFollowerIsDiscourseOnset(tokens, followerIdx, lookups)
  };
}

function interjectionClosesItsOwnUtterance(tokens: readonly ClauseToken[], idx: number): boolean {
  const cursor = skipTerminalParticleRun(tokens, idx + 1);
  if (cursor === null || isClausePunctuationToken(tokens[cursor])) {
    return true;
  }
  return separatedAs(tokens, idx + 1, CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS);
}

const CHUUSHI_CLOSURE_UTTERANCE_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "authored_pause"
]);

export function chuushiClosureRightUtteranceShape(
  tokens: readonly ClauseToken[],
  splitAt: number
): { readonly topicIdx?: number; readonly closesAsQuestion: boolean } {
  let markerIdx: number | undefined;
  let topicIdx: number | undefined;
  for (let idx = splitAt; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (isBoundaryPunct(token)) {
      return {
        ...(topicIdx === undefined ? {} : { topicIdx }),
        closesAsQuestion: isClauseHardTerminalPunctuationToken(token) && terminalPunctuationRunQuestionIndex(tokens, idx) !== null
      };
    }
    if (markerIdx === undefined && isChuushiClosureTopicMarkerToken(token)) {
      markerIdx = idx;
    } else if (markerIdx !== undefined && topicIdx === undefined && isIndependentWordToken(token)) {
      topicIdx = markerIdx;
    }
  }
  return { ...(topicIdx === undefined ? {} : { topicIdx }), closesAsQuestion: false };
}

function chuushiClosureFollowerOpensContent(follower: ClauseToken | undefined): boolean {
  return follower !== undefined && isIndependentWordToken(follower) && !isRefusedUtteranceHeadToken(follower);
}

function chuushiClosureFollowerIsDiscourseOnset(tokens: readonly ClauseToken[], followerIdx: number, lookups: LookupTables): boolean {
  const follower = tokens[followerIdx];
  return follower !== undefined &&
    !isChuushiClauseCoordinationPreludeToken(follower as RuntimeHaruToken, lookups) &&
    (isConjunctionToken(follower) || demoDiscourseUtteranceInitialMatchLengthAt(tokens, followerIdx) !== null);
}

export function chuushiClosureFollowerOpensUtterance(
  tokens: readonly ClauseToken[],
  followerIdx: number
): boolean {
  return demoDiscourseUtteranceInitialMatchLengthAt(tokens, followerIdx) !== null ||
    chuushiClosureFollowerOpensContent(tokens[followerIdx]);
}

type DetachedRemainderGovernance =
  | "functional_continuation"
  | "governor_present"
  | "no_governor";

function detachedRemainderGovernance(
  tokens: readonly ClauseToken[],
  splitAt: number,
  lookups: LookupTables
): DetachedRemainderGovernance {
  let limit = tokens.length;
  for (let index = splitAt; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || isClausePunctuationToken(token)) {
      limit = index;
      break;
    }
  }
  const first = tokens[splitAt];
  if (first !== undefined && isNominalizerFunctionalContinuationToken(first)) {
    return "functional_continuation";
  }
  for (let index = splitAt; index < limit; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (
      pos0in(token.pos, INFLECTABLE_AUX_BITS) ||
      nominalZeroCopulaPredicateAt(tokens, index, limit) ||
      nominalCopulaPredicateAt(tokens, index, limit)
    ) {
      return "governor_present";
    }
  }
  const edgeIdx = detachedRemainderEdgePredicateIndex(tokens, splitAt, limit);
  if (edgeIdx !== null && !isPostposedVocativeHead(tokens, edgeIdx, lookups)) {
    return "governor_present";
  }
  return "no_governor";
}

function detachedRemainderEdgePredicateIndex(
  tokens: readonly ClauseToken[],
  splitAt: number,
  limit: number
): number | null {
  let cursor: number | null = previousNonSpaceIndex(tokens, limit, splitAt);
  while (cursor !== null) {
    const token = tokens[cursor]!;
    if (isNominalLike(token) || isLexicalBareNaAdjStem(token)) {
      return boundParticleRunClosesUtteranceAfter(tokens, cursor, limit) ? cursor : null;
    }
    if (!isTerminalParticleToken(token) && !isNominalScopeParticleToken(token)) {
      return null;
    }
    cursor = previousNonSpaceIndex(tokens, cursor, splitAt);
  }
  return null;
}

function boundParticleRunClosesUtteranceAfter(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  let cursor = skipTerminalParticleRun(tokens, idx + 1, limit);
  while (
    cursor !== null &&
    isNominalScopeParticleToken(tokens[cursor]!) &&
    !isCaseParticleToken(tokens[cursor]!)
  ) {
    cursor = skipTerminalParticleRun(tokens, cursor + 1, limit);
  }
  return cursor === null || isClausePunctuationToken(tokens[cursor]);
}

export function detachedRemainderCannotGovernNominalPhrase(
  tokens: readonly ClauseToken[],
  splitAt: number,
  lookups: LookupTables
): boolean {
  const governance = detachedRemainderGovernance(tokens, splitAt, lookups);
  if (governance === "functional_continuation") {
    return false;
  }
  return isPostposedVocativeHead(tokens, splitAt, lookups) || governance === "no_governor";
}

export function detectPairedVolitionalConcessiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { pairedConcessiveByMarker } = ctx;
  if (pairedConcessiveByMarker.has(index)) {
    upsertBoundaryEvent(ctx, state, index + 1, "connective");
    return "continue";
  }
  return "next";
}

export function detectDiscourseResumptionCopulaBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): void {
  const { tokens, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  if (
    isDiscourseResumptionCopulaConnectiveStart(tokens, index, lookups, clauseCursorAt) &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, index, "punctuation");
  }
}

export function detectConditionalAuxBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, runtimeTokens, clauseCursorAt } = ctx;
  if (
    isConditionalAuxClauseBoundaryToken(tokens, index) &&
    !isObligationSpanContaining(runtimeTokens, index) &&
    hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1))
  ) {
    upsertBoundaryEvent(ctx, state, index + 1, "connective");
    return "continue";
  }
  return "next";
}

export function detectShieldedCompositeConnectiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { runtimeTokens, clauseCursorAt } = ctx;
  const shield = layoutBoundaryShieldAt(clauseCursorAt(index));
  const shieldAdmitted = shield === null ||
    lookupConnectiveBySurface(shield.surface) !== "tame_reason" ||
    boundNominalReasonCompositeFollowerAdmitted(runtimeTokens, shield.endExclusive);
  if (shield !== null && shieldAdmitted && hasFollowingClausePredicateEvidence(clauseCursorAt(shield.endExclusive))) {
    upsertBoundaryEvent(ctx, state, shield.endExclusive, "connective");
    return "continue";
  }
  return "next";
}

export function detectHostedCompositeConnectiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  const hostedComposite = compositeConnectivePatternRelationAt(clauseCursorAt(index), {
    consumers: ["clause_layout"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (
    hostedComposite?.hostIndex !== undefined &&
    hasFollowingClausePredicateEvidence(clauseCursorAt(hostedComposite.span.endExclusive)) &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, hostedComposite.span.endExclusive, "connective");
    return "continue";
  }
  return "next";
}

export function detectDiscontinuousListingBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  const discontinuousListingSplitAt = discontinuousListingBoundarySplitAt(clauseCursorAt(index), lookups);
  if (
    discontinuousListingSplitAt !== null &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, discontinuousListingSplitAt, "connective");
    return "continue";
  }
  return "next";
}

export function detectConnectiveParticleBoundary(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  index: number,
  token: ClauseToken,
  pos0: number,
  pos1: number
): ClauseBoundaryScanSignal {
  const { tokens, n, lookups, clauseCursorAt } = ctx;
  const { raw, negativeCopulaCorrections, chuushiClosureCandidates, teUtteranceActs } = state;
  if (pos0 === 助詞 && pos1 === 接続助詞) {
    const clauseCursor = clauseCursorAt(index);
    if (detectConnectiveParticlePreemption(ctx, state, index, clauseCursor) === "continue") {
      return "continue";
    }
    const connectiveKind = lookupConnectiveBySurface(token.surface);
    if (
      connectiveKind !== undefined &&
      connectiveSurfaceRequiresFinalPosition(connectiveKind, token.surface) &&
      !finalOnlyConnectiveHasImmediateClauseContinuation(tokens, index + 1, n, clauseCursorAt)
    ) {
      return "continue";
    }
    if (isBaSufficiencyConditionalAt(tokens, index)) {
      return "continue";
    }
    const { connectivePattern, connectiveSplitAt } = connectiveParticleSplit(ctx, index, token, clauseCursor);
    if (token.surface === "と" && isTerminalQuoteFocusEvenTail(clauseCursorAt(connectiveSplitAt))) {
      return "continue";
    }
    const { negativeCopulaCorrection, followingPredicate, closureFollowingPredicate, constructionGoverned } =
      connectiveParticleGovernance(ctx, index, token, clauseCursor, connectivePattern, connectiveKind, connectiveSplitAt);
    const { teClosureLeft, teClosureRightShape, teClosureRight } =
      teChuushiClosureAt(ctx, index, connectiveSplitAt, constructionGoverned, closureFollowingPredicate);
    const teConnectiveNextIdx = nextNonSpaceIndex(tokens, index + 1, n);
    if (
      isTeConnectiveToken(token) &&
      connectiveSplitAt === index + 1 &&
      !constructionGoverned &&
      teConnectiveNextIdx !== null &&
      hardTerminalPunctuationSurfaceClassForToken(tokens[teConnectiveNextIdx], teConnectiveNextIdx) !== null
    ) {
      return "continue";
    }
    if (!followingPredicate && !constructionGoverned && teClosureRight === null) {
      return "continue";
    }
    if (!hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)) {
      return "continue";
    }
    if (negativeCopulaCorrection !== null) {
      negativeCopulaCorrections.set(negativeCopulaCorrection.splitAt, negativeCopulaCorrection);
    }
    if (teClosureLeft !== null && teClosureRight !== null) {
      teUtteranceActs.set(teClosureLeft.connectiveIdx, {
        kind: "teUtteranceAct",
        connectiveIdx: teClosureLeft.connectiveIdx,
        predicateIdx: teClosureLeft.predicateIdx,
        position: "closure_left",
        iisashiSignals: []
      });
      chuushiClosureCandidates.set(connectiveSplitAt, {
        kind: "chuushiClosure",
        hostKind: "te",
        connectiveIdx: teClosureLeft.connectiveIdx,
        splitAt: teClosureLeft.splitAt,
        predicateIdx: teClosureLeft.predicateIdx,
        followerIdx: teClosureLeft.followerIdx,
        ...teClosureRight,
        ...(teClosureRightShape?.topicIdx === undefined ? {} : { rightTopicIdx: teClosureRightShape.topicIdx })
      });
    }
    const opensNewBoundary = !followingPredicate && !constructionGoverned;
    upsertBoundaryEvent(ctx, state, connectiveSplitAt, "connective", opensNewBoundary ? { witnessesWhitespaceSplit: false } : {});
    return "continue";
  }
  return "next";
}

function detectConnectiveParticlePreemption(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, clauseCursor: TokenCursor<ClauseToken>): ClauseBoundaryScanSignal {
  const { tokens, n, lookups, runtimeTokens, runtimeCursorAt } = ctx;
  const postverbOperatorTailEnd = postverbOperatorTailSpanAfterTe(tokens, index, n, lookups);
  if (postverbOperatorTailEnd !== null) {
    if (hasSeparatedFinitePredicateBoundary(tokens, postverbOperatorTailEnd)) {
      upsertBoundaryEvent(ctx, state, postverbOperatorTailEnd, "punctuation");
    }
    return "continue";
  }
  if (isObligationSpanContaining(runtimeTokens, index)) {
    return "continue";
  }
  if (isInsideClauseOpaqueNominalFrameSurface(tokens, index)) {
    return "continue";
  }
  if (isQuoteContentTailMarker(runtimeCursorAt(index), lookups)) {
    return "continue";
  }
  if (isQuotedJudgmentPassiveTailMarker(clauseCursor)) {
    return "continue";
  }
  return "next";
}

function connectiveParticleSplit(ctx: ClauseBoundaryDetectionContext, index: number, token: ClauseToken, clauseCursor: TokenCursor<ClauseToken>): { readonly connectivePattern: ReturnType<typeof compositeConnectivePatternRelationAt>; readonly connectiveSplitAt: number } {
  const { tokens, runtimeTokens } = ctx;
  const compositePattern = compositeConnectivePatternRelationAt(clauseCursor, {
    consumers: ["clause_layout"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  const connectivePattern = compositePattern !== null &&
    compositePattern.connectiveKind === "tame_reason" &&
    !boundNominalReasonCompositeFollowerAdmitted(runtimeTokens, compositePattern.span.endExclusive)
    ? null
    : compositePattern;
  let connectiveSplitAt = connectivePattern?.span.endExclusive ?? index + 1;
  if (connectivePattern === null && token.surface === "て" && isTeConnectiveToken(token)) {
    const nakuIdx = previousNonSpaceIndex(tokens, index);
    const naku = nakuIdx === null ? undefined : tokens[nakuIdx];
    const nakuIsNegativeRenyou = naku !== undefined &&
      (naku.pos & POS5A) === 連用形_ &&
      (((naku.pos & POS4) === 助動詞_ナイ) ||
        ((naku.pos & POS0) === 形容詞0 && (naku.dictionaryForm === "ない" || naku.dictionaryForm === "無い")));
    const stemIdx = nakuIdx === null ? null : previousNonSpaceIndex(tokens, nakuIdx);
    const stem = stemIdx === null ? undefined : tokens[stemIdx];
    const stemIsCopulaDe = stem !== undefined && ((stem.pos & POS4) === 助動詞_ダ || stem.surface === "じゃ");
    const stemPrevIdx = stemIdx === null ? null : previousNonSpaceIndex(tokens, stemIdx);
    const stemPrev = stemPrevIdx === null ? undefined : tokens[stemPrevIdx];
    const stemIsTeCompound = stem !== undefined && (stem.pos & POS0) === 動詞 &&
      stemPrev !== undefined && isTeConnectiveToken(stemPrev);
    if (nakuIsNegativeRenyou && !stemIsCopulaDe && !stemIsTeCompound) {
      const haIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
      const ha = haIdx === null || haIdx === undefined ? undefined : tokens[haIdx];
      if (haIdx !== null && haIdx !== undefined && ha !== undefined && (ha.pos & POS01) === 助詞_係助詞 && ha.surface === "は") {
        connectiveSplitAt = haIdx + 1;
      }
    }
  }
  return { connectivePattern, connectiveSplitAt };
}

function connectiveParticleGovernance(ctx: ClauseBoundaryDetectionContext, index: number, token: ClauseToken, clauseCursor: TokenCursor<ClauseToken>, connectivePattern: ReturnType<typeof compositeConnectivePatternRelationAt>, connectiveKind: ReturnType<typeof lookupConnectiveBySurface>, connectiveSplitAt: number): { readonly negativeCopulaCorrection: NegativeCopulaCorrectionEvidence | null; readonly followingPredicate: boolean; readonly closureFollowingPredicate: boolean; readonly constructionGoverned: boolean } {
  const { tokens, n, lookups, balancedDelimiterSpans, clauseCursorAt, runtimeCursorAt } = ctx;
  const condToLeftIdx = previousNonSpaceIndex(tokens, index);
  const condToLeftPos0 = condToLeftIdx !== null ? (tokens[condToLeftIdx]!.pos & POS0) : 0;
  const condToNextIdx = nextNonSpaceIndex(tokens, index + 1);
  const condToNext = condToNextIdx === null ? undefined : tokens[condToNextIdx];
  const condToLeftIsCopula =
    condToLeftIdx !== null && isCopulaConditionalBoundaryLeft(tokens[condToLeftIdx]);
  const condToCopulaNonConditional =
    condToNext !== undefined &&
    (((condToNext.pos & POS0) === 助詞 &&
      (condToNext.surface === "の" || condToNext.surface === "か" || condToNext.surface === "は" ||
        condToNext.surface === "も" || quoteFocusEvenSequenceStartsAt(tokens, condToNextIdx))) ||
      ((condToNext.pos & POS0) === 動詞 &&
        (condToNext.dictionaryForm === "する" || condToNext.surface === "する")));
  const condToCopulaAdmissible =
    condToLeftIsCopula &&
    !condToCopulaNonConditional &&
    !isQuotativeToTokensWide(runtimeCursorAt(index), lookups, { scope: "sentence" });
  const conditionalToConsequent =
    token.surface === "と" &&
    (pos0in(condToLeftPos0, INFLECTABLE_BITS) || condToCopulaAdmissible) &&
    hasFollowingConditionalConsequent(clauseCursorAt(connectiveSplitAt));
  const hasEllipticFollowerAt = (start: number): boolean =>
    hasEllipticFollowerClauseEvidence(
      tokens,
      start,
      n,
      (clauseTokens, idx) => {
        const candidate = clauseTokens[idx];
        return candidate !== undefined && isClausePredicateEvidenceToken(candidate);
      }
    );
  const condBaLeftIdx = token.surface === "ば" ? previousNonSpaceIndex(tokens, index) : null;
  const condBaLeft = condBaLeftIdx === null ? undefined : tokens[condBaLeftIdx];
  const condBaLeftPos5A = (condBaLeft?.pos ?? 0) & POS5A;
  const conditionalBaToConsequent =
    token.surface === "ば" &&
    (
      condBaLeftPos5A === 仮定形_ ||
      condBaLeftPos5A === 已然形_ ||
      isClassicalZuIzenkeiToken(condBaLeft)
    ) &&
    hasEllipticFollowerAt(connectiveSplitAt);
  const ellipticFollower =
    connectiveAdmitsEllipticFollowerClause(connectivePattern?.connectiveKind ?? connectiveKind, lookups) &&
    hasEllipticFollowerAt(connectiveSplitAt);
  const negativeCopulaCorrection = hasEllipticFollowerAt(connectiveSplitAt)
    ? negativeCopulaCorrectionShapeAt(tokens, index, connectiveSplitAt)
    : null;
  const followingPredicate = hasFollowingClausePredicateEvidence(clauseCursorAt(connectiveSplitAt));
  const closureFollowingPredicate = hasFollowingClausePredicateEvidence(
    clauseCursorAt(connectiveSplitAt),
    (openingIdx) => balancedDelimiterSpanOpeningAtIn(balancedDelimiterSpans, openingIdx)
  );
  const constructionGoverned =
    hasFollowingTeEvaluationHeadEvidence(clauseCursor, connectiveSplitAt, lookups) ||
    conditionalToConsequent ||
    conditionalBaToConsequent ||
    ellipticFollower ||
    negativeCopulaCorrection !== null;
  return { negativeCopulaCorrection, followingPredicate, closureFollowingPredicate, constructionGoverned };
}

function teChuushiClosureAt(ctx: ClauseBoundaryDetectionContext, index: number, connectiveSplitAt: number, constructionGoverned: boolean, closureFollowingPredicate: boolean): { readonly teClosureLeft: ReturnType<typeof teChuushiClosureLeftAt>; readonly teClosureRightShape: ReturnType<typeof chuushiClosureRightUtteranceShape> | null; readonly teClosureRight: ReturnType<typeof chuushiClosureRight> } {
  const { tokens, n, lookups } = ctx;
  const teClosureLeft = teChuushiClosureLeftAt(tokens, index, connectiveSplitAt);
  const teClosureRightShape = teClosureLeft === null ? null : chuushiClosureRightUtteranceShape(tokens, connectiveSplitAt);
  const teClosureRight = teClosureLeft === null
    ? null
    : chuushiClosureRight({
      governedBy: constructionGoverned ? "construction" : closureFollowingPredicate ? "predicate" : null,
      ...chuushiClosureDetachedRightInputs(tokens, teClosureLeft.followerIdx, lookups),
      ownTopicQuestion: teClosureRightShape?.topicIdx !== undefined && teClosureRightShape.closesAsQuestion,
      elliptic:
        chuushiClosureFollowerOpensContent(tokens[teClosureLeft.followerIdx]) &&
        hasEllipticFollowerClauseEvidence(
          tokens,
          connectiveSplitAt,
          n,
          (clauseTokens, idx) => {
            const candidate = clauseTokens[idx];
            return candidate !== undefined && isClausePredicateEvidenceToken(candidate);
          },
          "independent_word"
        )
    });
  return { teClosureLeft, teClosureRightShape, teClosureRight };
}

export function detectCaseParticleToConditionalBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, token: ClauseToken, pos0: number, pos1: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, pairedConcessiveByMarker, clauseCursorAt, runtimeCursorAt } = ctx;
  const { raw, volitionalIntentBindings } = state;
  if (pos0 === 助詞 && pos1 === 格助詞 && token.surface === "と") {
    if (isTerminalQuoteFocusEvenTail(clauseCursorAt(index + 1))) {
      return "continue";
    }
    const quotedConcessivePattern = compositeConnectivePatternRelationAt(clauseCursorAt(index), {
      consumers: ["clause_layout"],
      lookupConnectiveKind: lookupConnectiveBySurface
    });
    if (
      quotedConcessivePattern?.connectiveKind === "quoted_concessive" &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(quotedConcessivePattern.span.endExclusive)) &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsertBoundaryEvent(ctx, state, quotedConcessivePattern.span.endExclusive, "connective");
      return "continue";
    }
    const prevIdx = previousNonSpaceIndex(tokens, index);
    const nextIdx = nextNonSpaceIndex(tokens, index + 1);
    const nextTok = nextIdx === null ? undefined : tokens[nextIdx];
    const leftIsVolitionalConcessive = prevIdx !== null && isVolitionalConcessiveBoundaryLeft(tokens, prevIdx);
    const adjectivalConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, index, {
      consumers: ["clause_layout"]
    });
    const lexicalBinding = pairedConcessiveByMarker.has(index)
      ? null
      : volitionalLexicalBindingAt(tokens, index, clauseStartSinceLastBoundary(raw, index), lookups);
    if (lexicalBinding !== null) {
      volitionalIntentBindings.set(index, lexicalBinding);
    }
    const volitionalIntentBinding = leftIsVolitionalConcessive &&
      (lexicalBinding !== null || volitionalAttemptMarkerAt(tokens, index) !== null);
    const volitionalAttempt = volitionalIntentBinding;
    const volitionalConcessiveTomoMo =
      leftIsVolitionalConcessive &&
      !volitionalAttempt &&
      nextTok !== undefined &&
      nextTok.surface === "も" &&
      (nextTok.pos & POS0) === 助詞;
    const leftPos0 = prevIdx !== null ? (tokens[prevIdx]!.pos & POS0) : 0;
    const leftIsVerbOrAdjective = pos0in(leftPos0, INFLECTABLE_BITS);
    const leftIsCopula = prevIdx !== null && isCopulaConditionalBoundaryLeft(tokens[prevIdx]);
    const followedByCopulaQuoteFocusEven = leftIsCopula && quoteFocusEvenSequenceStartsAt(tokens, nextIdx);
    const followedByNonConditionalMarker =
      nextTok !== undefined &&
      !volitionalConcessiveTomoMo &&
      adjectivalConcessiveTomo === null &&
      (volitionalIntentBinding ||
        ((nextTok.pos & POS0) === 助詞 && (nextTok.surface === "の" || nextTok.surface === "か" || nextTok.surface === "は" || nextTok.surface === "も" || followedByCopulaQuoteFocusEven)) ||
        isSuruVerbToken(nextTok));
    const concessiveSplitAt = adjectivalConcessiveTomo !== null
      ? adjectivalConcessiveTomo.span.endExclusive
      : volitionalConcessiveTomoMo && nextIdx !== null ? nextIdx + 1 : index + 1;
    const canUseLooseConditionalConsequent =
      !leftIsVolitionalConcessive && adjectivalConcessiveTomo === null && (leftIsVerbOrAdjective || leftIsCopula);
    const followingConsequent = canUseLooseConditionalConsequent
      ? hasFollowingConditionalConsequent(clauseCursorAt(concessiveSplitAt))
      : hasFollowingClausePredicateEvidence(clauseCursorAt(concessiveSplitAt));
    const quoteReadingBlocksConcessiveTo =
      isQuoteContentTailMarker(runtimeCursorAt(index), lookups) ||
      isQuotativeToTokensWide(runtimeCursorAt(index), lookups, { scope: "sentence" });
    if (
      prevIdx !== null &&
      (isFinitePredicateBoundaryLeft(tokens[prevIdx]) || leftIsVolitionalConcessive || adjectivalConcessiveTomo !== null) &&
      !followedByNonConditionalMarker &&
      (adjectivalConcessiveTomo !== null || !quoteReadingBlocksConcessiveTo) &&
      followingConsequent &&
      hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
    ) {
      upsertBoundaryEvent(ctx, state, concessiveSplitAt, "connective");
    }
    return "continue";
  }
  return "next";
}

export function detectSuffixTaggedConcessiveTomoBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  const suffixTaggedConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, index, {
    consumers: ["clause_layout"]
  });
  if (
    suffixTaggedConcessiveTomo !== null &&
    suffixTaggedConcessiveTomo.span.start === index &&
    hasFollowingClausePredicateEvidence(clauseCursorAt(suffixTaggedConcessiveTomo.span.endExclusive)) &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, suffixTaggedConcessiveTomo.span.endExclusive, "connective");
    return "continue";
  }
  return "next";
}

export function detectAdversativeGaBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  if (
    (isFinitePredicateAdversativeGaBoundary(tokens, index) ||
      isVolitionalConcessiveGaBoundary(tokens, index)) &&
    hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1)) &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, index + 1, "connective");
    return "continue";
  }
  return "next";
}

export function detectMonoNoConcessiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { clauseCursorAt, runtimeCursorAt } = ctx;
  const monoNoConsumed = matchMonoNoConcessiveConnectiveStart(runtimeCursorAt(index));
  if (monoNoConsumed !== null) {
    const splitAt = index + monoNoConsumed;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  return "next";
}

export function detectNoNiConcessiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, clauseCursorAt, runtimeCursorAt } = ctx;
  const noNiConsumed = matchNoNiConcessiveConnectiveStart(runtimeCursorAt(index), lookups);
  if (noNiConsumed !== null) {
    const splitAt = index + noNiConsumed;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
    let runEnd = splitAt;
    for (;;) {
      const nextIdx = nextNonSpaceIndex(tokens, runEnd);
      if (nextIdx === null || !isTerminalParticleToken(tokens[nextIdx]!)) {
        break;
      }
      runEnd = nextIdx + 1;
    }
    if (detachedRemainderCannotGovernNominalPhrase(tokens, runEnd, lookups)) {
      upsertBoundaryEvent(ctx, state, runEnd, "connective");
      return "continue";
    }
  }
  return "next";
}

export function detectNodeReasonBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { lookups, clauseCursorAt } = ctx;
  const nodeReasonConsumed = matchNodeReasonConnectiveStart(clauseCursorAt(index), lookups);
  if (nodeReasonConsumed !== null) {
    const splitAt = index + nodeReasonConsumed;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  return "next";
}

export function detectLikenessEvaluativeConditionBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { clauseCursorAt, runtimeCursorAt } = ctx;
  const likenessConditionEnd = likenessEvaluativeConditionMarkerEndAt(runtimeCursorAt(index));
  if (likenessConditionEnd !== null) {
    const splitAt = likenessConditionEnd;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  return "next";
}

export function detectPostpositionalConnectiveBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, token: ClauseToken): ClauseBoundaryScanSignal {
  const { clauseCursorAt } = ctx;
  if (isPostpositionalClauseConnectiveToken(token)) {
    const splitAt = index + 1;
    if (hasFollowingClausePredicateEvidence(clauseCursorAt(splitAt))) {
      upsertBoundaryEvent(ctx, state, splitAt, "connective");
      return "continue";
    }
  }
  return "next";
}

function finalOnlyConnectiveHasImmediateClauseContinuation(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  cursorAt: (index: number) => TokenCursor<ClauseToken>
): boolean {
  const marker = tokens[start - 1];
  let next = nextNonSpaceIndex(tokens, start, endExclusive);
  if (next === null) return false;
  const first = tokens[next];
  if (first === undefined || isClauseOpeningPunctuationToken(first)) return false;
  if (isClausePunctuationToken(first)) {
    if (first.surface !== "、" && first.surface !== ",") return false;
    next = nextNonSpaceIndex(tokens, next + 1, endExclusive);
    if (next === null) return false;
  }
  const follower = tokens[next];
  if (follower === undefined || (follower.pos & POS0) === 助詞) return false;
  if (
    marker?.sourceOrdinal !== undefined &&
    follower.sourceOrdinal !== undefined &&
    follower.sourceOrdinal - marker.sourceOrdinal > 2
  ) {
    return false;
  }
  return hasFollowingClausePredicateEvidence(cursorAt(next));
}

const CONDITIONAL_BOUNDARY_FUSED_HOST_SLOTS: ReadonlySet<FusedCopulaSupportHostSlot> =
  new Set<FusedCopulaSupportHostSlot>(["copula_host", "none"]);

export function isConditionalAuxClauseBoundaryToken(
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (
    fusedCopulaSupportConnectiveKindOf(token) !== null &&
    CONDITIONAL_BOUNDARY_FUSED_HOST_SLOTS.has(fusedCopulaSupportHostSlotAt(tokens, index))
  ) {
    return true;
  }
  if (token.surface === "なけりゃ" && (token.pos & POS5A) === 仮定形_) {
    return (
      ((token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ)) ||
      ((token.pos & POS0) === 形容詞0 && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い"))
    );
  }
  if ((token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 仮定形_)) {
    return true;
  }
  return false;
}

function isDiscourseResumptionCopulaConnectiveStart(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  cursorAt: (position: number) => TokenCursor<ClauseToken>
): boolean {
  const token = tokens[index];
  if (
    token === undefined ||
    !separatedAs(tokens, index, SEPARATION_OPENS_BOUNDARY) ||
    (token.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 終止形_)
  ) {
    return false;
  }
  const connectiveIdx = nextNonSpaceIndex(tokens, index + 1);
  const connective = connectiveIdx === null ? undefined : tokens[connectiveIdx];
  if (
    connective === undefined ||
    connectiveIdx === null ||
    (connective.pos & POS01) !== (助詞 | 接続助詞) ||
    !lookups.GRAMMAR_BOUNDARY_DISCOURSE_RESUMPTION_CONNECTIVE_SURFACES.has(connective.surface)
  ) {
    return false;
  }
  const composite = compositeConnectivePatternRelationAt(cursorAt(connectiveIdx), {
    consumers: ["clause_layout"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (composite?.connectiveKind === "quoted_concessive") {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, index);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined) {
    return false;
  }
  const leftPos0 = left.pos & POS0;
  if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0 && leftPos0 !== 助動詞) {
    return false;
  }
  const leftForm = left.pos & POS5A;
  return leftForm === 終止形_ || leftForm === 意志推量形_;
}

export function isConditionalCopulaClauseBoundaryToken(token: ClauseToken): boolean {
  return (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 仮定形_);
}

function isFinitePredicateAdversativeGaBoundary(
  tokens: readonly ClauseToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞
  ) {
    return false;
  }
  const left = previousNonSpaceIndex(tokens, markerIdx);
  if (left === null) {
    return false;
  }
  return isFinitePredicateBoundaryLeft(tokens[left]);
}

function isVolitionalConcessiveGaBoundary(
  tokens: readonly ClauseToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞
  ) {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, markerIdx);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined) {
    return false;
  }
  const leftPos0 = left.pos & POS0;
  if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0) {
    return false;
  }
  return (left.pos & POS5A) === 意志推量形_;
}

export function isCopulaConditionalBoundaryLeft(token: ClauseToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if ((token.pos & POS0) !== 助動詞 || (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function quoteFocusEvenSequenceEndAt(tokens: readonly ClauseToken[], index: number | null): number | null {
  if (index === null) {
    return null;
  }
  const bridge = dewaScopeBridgeRelationAt(tokens, index, { consumers: ["clause_layout"] });
  return bridge === null || bridge.focusParticle !== "mo" ? null : bridge.span.endExclusive;
}

function quoteFocusEvenSequenceStartsAt(tokens: readonly ClauseToken[], index: number | null): boolean {
  return quoteFocusEvenSequenceEndAt(tokens, index) !== null;
}

function isVolitionalConcessiveBoundaryLeft(tokens: readonly ClauseToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  if ((token.pos & POS5A) !== 意志推量形_) {
    return false;
  }
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_マス || pos4 === 助動詞_デス) {
    return false;
  }
  const before = tokens[idx - 1];
  if (before !== undefined) {
    const beforeIsTeAux = (before.pos & POS01) === 助詞_接続助詞 && (before.surface === "て" || before.surface === "で");
    if (beforeIsTeAux) {
      return false;
    }
  }
  return true;
}

export function collectPairedVolitionalConcessiveEvidence(
  tokens: readonly ClauseToken[]
): readonly PairedVolitionalConcessiveEvidence[] {
  const evidence: PairedVolitionalConcessiveEvidence[] = [];
  for (let firstMarkerIdx = 1; firstMarkerIdx < tokens.length; firstMarkerIdx += 1) {
    if (tokens[firstMarkerIdx]?.surface !== "と") continue;
    const positive = positiveVolitionalPredicateBefore(tokens, firstMarkerIdx);
    const negative = negativeVolitionalPredicateAfter(tokens, firstMarkerIdx);
    if (positive === null || negative === null || positive.lemma !== negative.lemma) continue;

    const negativeAuxIdx = nextNonSpaceIndex(tokens, negative.inflectionIdx + 1, tokens.length);
    const negativeAux = negativeAuxIdx === null ? undefined : tokens[negativeAuxIdx];
    if (
      negativeAuxIdx === null ||
      negativeAux === undefined ||
      !isNegativeAuxiliaryPos(negativeAux.pos) ||
      !isVolitionalInflection(negativeAux.pos)
    ) continue;

    const secondMarkerIdx = nextNonSpaceIndex(tokens, negativeAuxIdx + 1, tokens.length);
    if (secondMarkerIdx === null || tokens[secondMarkerIdx]?.surface !== "と") continue;
    evidence.push({
      kind: "paired_volitional_concessive",
      lemma: positive.lemma,
      positivePredicateIdx: positive.predicateIdx,
      positiveInflectionIdx: positive.inflectionIdx,
      firstMarkerIdx,
      negativePredicateIdx: negative.predicateIdx,
      negativeInflectionIdx: negative.inflectionIdx,
      negativeAuxIdx,
      secondMarkerIdx,
    });
  }
  return evidence;
}

function positiveVolitionalPredicateBefore(
  tokens: readonly ClauseToken[],
  markerIdx: number
): PairedVolitionalPredicateShape | null {
  const inflectionIdx = previousNonSpaceIndex(tokens, markerIdx);
  const inflection = inflectionIdx === null ? undefined : tokens[inflectionIdx];
  if (
    inflectionIdx === null ||
    inflection === undefined ||
    !isVerbPredicateToken(inflection) ||
    !isVolitionalInflection(inflection.pos)
  ) {
    return null;
  }
  return pairedVolitionalPredicateShape(tokens, inflectionIdx, inflection);
}

function negativeVolitionalPredicateAfter(
  tokens: readonly ClauseToken[],
  markerIdx: number
): PairedVolitionalPredicateShape | null {
  const startIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  const start = startIdx === null ? undefined : tokens[startIdx];
  if (startIdx === null || start === undefined) {
    return null;
  }
  if (isVerbPredicateToken(start) && isMizenInflection(start.pos)) {
    return pairedVolitionalPredicateShape(tokens, startIdx, start);
  }
  if (!isSahenCapableNominal(start)) {
    return null;
  }
  const inflectionIdx = nextNonSpaceIndex(tokens, startIdx + 1, tokens.length);
  const inflection = inflectionIdx === null ? undefined : tokens[inflectionIdx];
  if (
    inflectionIdx === null ||
    inflection === undefined ||
    !isVerbPredicateToken(inflection) ||
    !isMizenInflection(inflection.pos) ||
    (inflection.dictionaryForm || inflection.surface) !== "する"
  ) {
    return null;
  }
  return {
    lemma: `${start.dictionaryForm || start.surface}+する`,
    predicateIdx: startIdx,
    inflectionIdx,
  };
}

function postverbOperatorTailSpanAfterTe(tokens: readonly ClauseToken[], idx: number, n: number, lookups: LookupTables): number | null {
  const relation = teDeContinuationRelationAt(tokens, idx, {
    requirement: "layout_nonspace_tail",
    consumers: ["clause_layout"],
    lookups
  });
  if (relation === null) {
    return null;
  }
  const continuation = matchTeTailContinuationAt(tokens, relation.continuationIdx, lookups, {
    ...(relation.focusParticle === undefined ? {} : { focusParticle: relation.focusParticle })
  });
  if (continuation === null || relation.span.endExclusive > n) {
    return null;
  }
  return relation.span.endExclusive;
}

function matchNodeReasonConnectiveStart(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables
): number | null {
  const { tokens, pos: index } = cursor;
  const prev = tokens[index - 1];
  const relation = nominalizerReasonConnectiveRelationAt(tokens, index, {
    consumers: ["clause_layout"]
  });
  if (relation === null || relation.span.endExclusive > cursor.end || lookupConnectiveBySurface("ので") !== "reason") {
    return null;
  }
  const afterNext = tokens[relation.span.endExclusive];
  if (copulaFocusContinuationRelationAt(tokens, relation.span.endExclusive, {
    consumer: "clause_layout",
    lowerBoundInclusive: index,
    lookups
  }) !== null) {
    return null;
  }
  if (cursor.lookahead(relation.span.endExclusive - cursor.pos, isNodeDeNegativeQuestionFrame)) {
    return null;
  }
  if (isBareAdjectivalPronominalNoDeFrame(prev, afterNext)) {
    return null;
  }
  return relation.span.endExclusive - index;
}

function isNodeDeNegativeQuestionFrame(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens, pos: naiIdx } = cursor;
  const nai = tokens[naiIdx];
  if (
    nai === undefined ||
    (nai.pos & POS0) !== 形容詞0 ||
    (nai.dictionaryForm !== "ない" && nai.dictionaryForm !== "無い")
  ) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, naiIdx + 1);
  return next !== null &&
    next < cursor.end &&
    kaMarkerRelationForToken(tokens[next], next, ["clause_layout"]) !== null;
}

function isBareAdjectivalPronominalNoDeFrame(
  prev: ClauseToken | undefined,
  afterNoDe: ClauseToken | undefined
): boolean {
  if (
    prev === undefined || afterNoDe === undefined || (prev.pos & (POS0 | POS5A)) !== (形容詞0 | 連体形_)
  ) {
    return false;
  }
  return pos0in(afterNoDe.pos, (1 << 形容詞0) | (1 << 形状詞));
}

function isPostpositionalClauseConnectiveToken(token: ClauseToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助詞 || (token.pos & POS1) === 接続助詞 || token.surface === "も") {
    return false;
  }
  return lookupConnectiveBySurface(token.surface) === "concession";
}

function isQuoteContentTailMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens: runtimeTokens, pos: index } = cursor;
  if (
    quoteMarkerRelationAt(runtimeTokens, index, { consumers: ["clause_layout"] }) === null &&
    tokaTteCompositeQuoteCandidateAt(runtimeTokens, index, { consumers: ["clause_layout"] }) === null
  ) {
    return false;
  }
  const relation = quoteStructuralRelationIndex(cursor, lookups, {
    allowBuildProtoForTariAdverbialEvidence: false
  }).winnerAtOwnedPosition(index);
  return relation !== undefined;
}

function isQuotedJudgmentPassiveTailMarker(
  cursor: TokenCursor<ClauseToken>
): boolean {
  const { tokens, pos: index } = cursor;
  if (quoteMarkerRelationAt(tokens, index, { consumers: ["clause_layout"] }) === null) {
    return false;
  }
  const head = quotedJudgmentHeadBeforeMarker(tokens, index, isBoundaryPunct);
  return matchQuotedJudgmentPassiveTail(cursor, {
    hasCopulaBeforeMarker: head.hasCopula,
    nominalHead: head.nominalHead
  }) !== null;
}

export function hasSeparatedFinitePredicateBoundary(
  tokens: readonly ClauseToken[],
  splitAt: number,
): boolean {
  if (!separatedAs(tokens, splitAt, SEPARATION_OPENS_BOUNDARY)) {
    return false;
  }
  return finitePredicateClosesBeforeFollowingClause(tokens, splitAt - 1, splitAt);
}

export function finitePredicateClosesBeforeFollowingClause(
  tokens: readonly ClauseToken[],
  leftIdx: number,
  followingIdx: number,
): boolean {
  const following = tokens[followingIdx];
  if (following === undefined) {
    return false;
  }
  const tailForm = (tokens[leftIdx]?.pos ?? 0) & POS5A;
  return (
    tailForm === 終止形_ ||
    (tailForm === 命令形_ && !isConditionalBaParticle(following)) ||
    isTeTailImperativeFormClosureAt(tokens, leftIdx)
  ) &&
    hasFollowingClausePredicateEvidence(new TokenCursor(tokens, followingIdx, tokens.length));
}

export function isConditionalBaParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && token.surface === "ば";
}

function hasFollowingConditionalConsequent(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens } = cursor;
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return false;
    }
    return true;
  }
  return false;
}

function isTerminalQuoteFocusEvenTail(cursor: TokenCursor<ClauseToken>): boolean {
  const { tokens } = cursor;
  const focusEnd = quoteFocusEvenSequenceEndAt(tokens, cursor.pos);
  if (focusEnd === null) {
    return false;
  }
  for (let index = focusEnd; index < cursor.end; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return true;
    }
    if (isAbsorbablePunct(token)) {
      continue;
    }
    return false;
  }
  return true;
}

function discontinuousListingBoundarySplitAt(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables
): number | null {
  const matches = relationConnectiveSpansAt(cursor);
  for (const match of matches) {
    if (match.relationPolicy !== "listing_example" || match.markerPolicy !== "discontinuous") {
      continue;
    }
    const closure = relationDiscontinuousClosureSpanAfter(
      cursor.fork(match.endExclusive, cursor.end, match.endExclusive),
      match
    );
    if (closure === null) {
      continue;
    }
    const next = nextNonSpaceIndex(cursor.tokens, closure.endExclusive, cursor.end);
    const nextToken = next === null ? undefined : cursor.tokens[next];
    if (nextToken === undefined || isClausePunctuationToken(nextToken)) {
      continue;
    }
    if ((nextToken.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(nextToken.dictionaryForm || nextToken.surface)) {
      continue;
    }
    if (!hasFollowingClausePredicateEvidence(cursor.fork(closure.endExclusive, cursor.end, closure.endExclusive))) {
      continue;
    }
    return closure.endExclusive;
  }
  return null;
}

function hasFollowingTeEvaluationHeadEvidence(
  cursor: TokenCursor<ClauseToken>,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const { tokens, pos: markerIdx } = cursor;
  if (!isTeConnectiveAfterBenefactiveTail(tokens, markerIdx, lookups)) {
    return false;
  }
  return findTeEvaluationFollowerIndex(tokens, splitAt, cursor.end, lookups) !== undefined;
}

function isTeConnectiveAfterBenefactiveTail(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): boolean {
  if (!isTeConnectiveToken(tokens[markerIdx])) {
    return false;
  }
  const tailIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (tailIdx === null) {
    return false;
  }
  const previousConnector = previousNonSpaceIndex(tokens, tailIdx);
  if (previousConnector === null || !isTeConnectiveToken(tokens[previousConnector])) {
    return false;
  }
  const continuation = matchTeTailContinuationAt(tokens, tailIdx, lookups);
  if (continuation === null || continuation.kind !== "benefactive") {
    return false;
  }
  return nextNonSpaceIndex(tokens, tailIdx + continuation.consumed) === markerIdx;
}

function clauseStartSinceLastBoundary(boundaries: ReadonlyMap<number, BoundaryKind>, idx: number): number {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= idx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  return clauseStart;
}

export function hasPrecedingContentSinceLastBoundary(
  tokens: readonly ClauseToken[],
  connIdx: number,
  boundaries: ReadonlyMap<number, BoundaryKind>,
  lookups: LookupTables
): boolean {
  let clauseStart = 0;
  for (const splitAt of boundaries.keys()) {
    if (splitAt <= connIdx) {
      clauseStart = Math.max(clauseStart, splitAt);
    }
  }
  const CONTENT_POS0_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 感動詞) | (1 << 接頭辞);
  for (let i = clauseStart; i < connIdx; i += 1) {
    const pos0 = (tokens[i]?.pos ?? 0) & POS0;
    if (pos0in(pos0, CONTENT_POS0_BITS)) {
      return true;
    }
    if (isDeicticCopulaPredicateContentAt(tokens, i, connIdx, lookups)) {
      return true;
    }
  }
  return false;
}

function isDeicticCopulaPredicateContentAt(
  tokens: readonly ClauseToken[],
  index: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const adverb = tokens[index];
  if (adverb === undefined || !isLexicalAdverb(adverb)) {
    return false;
  }
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(adverb.dictionaryForm || adverb.surface)) {
    return false;
  }
  const copulaIdx = nextNonSpaceIndex(tokens, index + 1, endExclusive);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (copula === undefined || (copula.pos & POS0) !== 助動詞) {
    return false;
  }
  const family = copula.pos & POS4;
  if (family !== 助動詞_ダ && family !== 助動詞_デス) {
    return false;
  }
  const form = copula.pos & POS5A;
  return form === 終止形_ || form === 連用形_;
}
