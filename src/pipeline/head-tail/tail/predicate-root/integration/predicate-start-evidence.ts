import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { NumeralPlan } from "../../../../../types/render-plan.js";
import type { NumericBasePayload } from "../../../../../types/numeric-base.js";
import { tryNumeral, type NumeralResolutionContext } from "../../../../semantics/numeric.js";
import { isCopulaSupportChainStartAt } from "../../../../semantics/copula-tail-runtime.js";
import { adnominalCopulaTailFollows, matchCopula, terminalNodaCarrierFollowsAdnominalCopula } from "../matchers/copula.js";
import { matchNegationEnding } from "../matchers/negation-ending.js";
import { isAffirmativeCopulaSupportVerbToken, isGozaruPoliteSupportToken } from "../classifiers/tokens.js";
import { matchScopeBridgeBeforeBasicCopula } from "../matchers/scope-bridge.js";
import { matchCompositeConnectiveAt } from "../matchers/connective.js";
import { isLikenessCarrierHeadToken, fusedNoYouNiKeijoujiAttributiveAt, perceptionCarrierVerbMatch } from "../matchers/predicate-projection-connective.js";
import { copulaStartsPredicateAt, adverbHostCopulaDeMarkerAt, nounCompoundSuffixRunEnd } from "./readiness.js";
import { closesUtteranceAs, utteranceClosureAfter, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { activeProtoLayout, isClauseEvidenceTransparentPunctuation, isClausePunctuationToken, skipClausePunctuationForward } from "../../../../clause-layout/index.js";
import { DETACHED_SEPARATIONS, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "../../../../clause-layout/trivia.js";
import { closesUtteranceForSpeakerDirection } from "../../../../clause-layout/speech-act.js";
import { activeProtoClosesClauseAtDetachedTerminalNodaAfter } from "../../../../clause-layout/proto-state.js";
import { quoteHostMatchAfterMarker } from "../../../../quote/host-taxonomy.js";
import { participatesInStructuralKaParallel } from "../../../../structural-relation/ka-parallel-ownership.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import { isTeConnectiveToken } from "../../postverb-tail-classifier.js";
import type { CopulaOp } from "../grammar.js";
import { hasRealContentAfterIndex, isTrailingPunctuationToken } from "../../../boundary/punctuation.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, copulaNiMarkerRelationForToken, externalNominalizerContinuationRelationAt, kaMarkerRelationAt, nominalLinkMarkerRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, quotativeDerivedIdiomClaimAt } from "../../../boundary/marker.js";
import { kaOwnershipKindAt } from "../../../boundary/ka-ownership.js";
import type { KaOwnershipKind } from "../../../boundary/ka-ownership.js";
import { datteQuoteMarkerRelationAt, quoteMarkerRelationAt, tokaQuoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../../../boundary/quote-marker.js";
import { isAdjNai } from "../../../../matchers.js";
import { clauseContainsInterrogativeBeforeKa, looksQuestionContentNominalizedAfterKa, looksQuestionTakingAfter, tokenIsInterrogativeLexeme } from "../../../../quote/embedded-question.js";
import { looksQuestionTakingAfterViaLayout } from "../../../../quote/question-taking-enumeration.js";
import { INFLECTABLE_BITS, POS0, POS01, pos0in, POS1, POS5A, 仮定形_, 形状詞, 終止形_, 終助詞, 助詞, 助詞_接続助詞, 助動詞 as 助動詞0, 助動詞語幹, 代名詞, 動詞, 動詞_非自立可能, 非自立可能, 副詞, 補助記号, 名詞, 連体形_, 連用形_, 수사, isNumeralToken, 助詞_終助詞 } from "../../../../../types/pos.js";

export interface HostBearingExternalNominalizerPredicateFrame {
  readonly hostEnd: number;
  readonly predicateStart: number;
}

export function findHostBearingExternalNominalizerPredicateFrame(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  scanEnd: number
): HostBearingExternalNominalizerPredicateFrame | null {
  for (let idx = start + 1; idx + 2 <= scanEnd; idx += 1) {
    const relation = externalNominalizerContinuationRelationAt(tokens, idx, {
      requireEnd: false,
      consumers: ["tail_multi_clause"]
    });
    const hasPredicateBridge = relation === null &&
      hasExternalNominalizerPredicateBridge(tokens, idx, scanEnd);
    if (relation?.connectiveKind !== "external_nominalizer_comparison" && !hasPredicateBridge) {
      continue;
    }
    if (!isExternalNominalizerPredicateHead(tokens, idx + 2, scanEnd)) {
      continue;
    }
    return {
      hostEnd: idx - 1,
      predicateStart: idx + 2
    };
  }
  return null;
}

function hasExternalNominalizerPredicateBridge(
  tokens: readonly RuntimeHaruToken[],
  nominalizerIdx: number,
  scanEnd: number
): boolean {
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  });
  const niIdx = nominalizerIdx + 1;
  const ni = tokens[niIdx];
  return nominalizer?.nominalizerKind === "no" &&
    niIdx < scanEnd &&
    caseParticleMarkerRelationForToken(ni, niIdx, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    isExternalNominalizerPredicateHead(tokens, nominalizerIdx + 2, scanEnd);
}

function isExternalNominalizerPredicateHead(
  tokens: readonly RuntimeHaruToken[],
  predicateStart: number,
  scanEnd: number
): boolean {
  const predicate = tokens[predicateStart];
  if (
    predicate === undefined ||
    (predicate.pos & POS0) !== 動詞 ||
    (predicate.dictionaryForm || predicate.surface) !== "対する"
  ) {
    return false;
  }
  const next = tokens[predicateStart + 1];
  if (predicate.surface === "対し") {
    const hasTe =
      next !== undefined &&
      ((isTeConnectiveToken(next) && next.surface.charAt(0) === "て") || isTeFocusAspectBoundary(next));
    const continuationStart = hasTe ? predicateStart + 2 : predicateStart + 1;
    return continuationStart <= scanEnd && isExternalNominalizerPredicateContinuation(tokens, continuationStart);
  }
  return true;
}

export function questionContentBoundaryHasHostAfterScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables,
): boolean {
  const { tokens } = cursor;
  const nextIdx = nextNonSpaceIndex(tokens, scanEnd + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || nextIdx === null) {
    return false;
  }
  if (!isClausePunctuationToken(next) && !separatedAs(tokens, nextIdx, DETACHED_SEPARATIONS)) {
    return true;
  }
  const nextContent = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
  const scanCursor = cursor.fork(scanEnd, tokens.length, scanEnd);
  const prevIdx = previousNonSpaceIndex(tokens, scanEnd);
  const nominalizer = prevIdx === null
    ? null
    : predicateNominalizerRelationForToken(tokens[prevIdx], prevIdx, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    });
  const permitsNominalArgumentTraversal =
    nominalizer?.nominalizerKind === "no" ||
    clauseContainsInterrogativeBeforeKa(tokens, scanEnd, lookups, activeProtoLayout() ?? undefined);
  const skipNominalArguments = permitsNominalArgumentTraversal &&
    next !== undefined && isClauseEvidenceTransparentPunctuation(next);
  const layout = activeProtoLayout();
  const layoutQuestionHost = skipNominalArguments && layout !== null &&
    looksQuestionTakingAfterViaLayout(
      layout,
      tokens,
      nextContent,
      tokens.length,
      lookups,
      { scope: "sentence", traverseMatrixArguments: true, hostCapability: "content" }
    );
  return layoutQuestionHost || scanCursor.lookahead(nextContent - scanEnd, c =>
    looksQuestionTakingAfter(c, lookups, {
      ...(skipNominalArguments ? { skipNominalArguments: true as const } : {}),
      scope: "clause",
      hostCapability: "content",
    })
  ) ||
    looksQuestionContentNominalizedAfterKa(scanCursor);
}

export function isTeFocusAspectBoundary(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 助詞_接続助詞 && (token.surface === "ては" || token.surface === "では" ||
    token.surface === "ても" || token.surface === "でも");
}

export function isExternalNominalizerPredicateContinuation(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): boolean {
  const next = tokens[splitAt];
  if (next === undefined) return true;
  if (isClausePunctuationToken(next)) return false;
  if (next.surface === "は" || next.surface === "も") {
    return isExternalNominalizerPredicateContinuation(tokens, splitAt + 1);
  }
  if (predicateNominalizerRelationForToken(next, splitAt, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  })?.nominalizerKind === "no") return true;
  if ((next.pos & POS0) === 助動詞0) return true;
  if (isAdjNai(next)) {
    return true;
  }
  if ((next.pos & POS0) !== 動詞) {
    return false;
  }
  const lemma = next.dictionaryForm || next.surface;
  return (next.pos & POS1) === 非自立可能 ||
    ["いる", "居る", "ある", "有る", "しまう", "おく", "置く", "いく", "行く", "くる", "来る"].includes(lemma);
}

export function isDeicticCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 副詞) return false;
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  const copula = tokens[idx + 1];
  if (copula === undefined) return false;
  const form = copula.pos & POS5A;
  const conjugatedBridge = form === 終止形_ || form === 連用形_ || form === 仮定形_;
  if (form === 連体形_) {
    if (!deicticAdnominalCopulaBoundTailFollows(tokens, idx, lookups)) return false;
  }
  const matched = matchCopula(tokens, idx + 1, lookups);
  if (matched?.op.variant === "basic" || matched?.op.variant === "conditional_nara") {
    if (form !== 連体形_ && !conjugatedBridge && matched.op.polarity !== "negative") return false;
    const afterCopula = idx + 1 + matched.consumed;
    if (
      matched.op.polarity !== "negative" &&
      !isDeicticSupportCopulaRealization(tokens, matched) &&
      kaMarkerRelationAt(tokens, afterCopula, ["tail_multi_clause"]) !== null
    ) {
      return false;
    }
    if (
      matched.op.variant === "conditional_nara" &&
      ((tokens[afterCopula]?.pos ?? 0) & POS01) === 助詞_終助詞
    ) {
      return false;
    }
    if (
      !terminalSfpRunClosesUtteranceAt(tokens, afterCopula) &&
      !confirmationKaRunIsQuotedAt(tokens, afterCopula, lookups)
    ) return false;
    return !deicticNegativeConjectureQuoteShapeAt(tokens, idx + 1, matched, lookups);
  }
  if (form === 連体形_ || conjugatedBridge) return false;
  const bridgeEnd = negativeScopeBridgeEndAt(tokens, idx + 1);
  if (bridgeEnd === null) return false;
  return terminalSfpRunClosesUtteranceAt(tokens, bridgeEnd) ||
    confirmationKaRunIsQuotedAt(tokens, bridgeEnd, lookups);
}

function isDeicticSupportCopulaRealization(
  tokens: readonly RuntimeHaruToken[],
  matched: { readonly op: CopulaOp; readonly consumed: number }
): boolean {
  if (matched.consumed < 2) return false;
  const deIdx = matched.op.source.tokenIndices[0];
  return deIdx !== undefined && isCopulaSupportChainStartAt(tokens, deIdx);
}

export function negativeScopeBridgeEndAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  return new TokenCursor(tokens, pos).lookahead(0, (c) => {
    const bridge = matchScopeBridgeBeforeBasicCopula(c);
    if (bridge === null || bridge.polarity !== "negative") return null;
    return c.pos;
  });
}

function deicticAdnominalCopulaBoundTailFollows(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const previousIdx = previousNonSpaceIndex(tokens, idx, 0);
  if (previousIdx !== null && quoteSpanClosesAt(tokens, previousIdx)) return false;
  if (deicticTerminalNokaClosesUtterance(tokens, idx, lookups)) return false;
  if (deicticTerminalNodaCopulaYieldsFollowingOwner(tokens, idx, lookups)) return false;
  return adnominalCopulaTailFollows(tokens, idx + 2, lookups);
}

function deicticTerminalNodaCopulaYieldsFollowingOwner(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  if (!terminalNodaCarrierFollowsAdnominalCopula(tokens, idx + 2)) return false;
  const copula = matchCopula(tokens, idx + 3, lookups);
  if (copula === null) return false;
  const afterIdx = idx + 3 + copula.consumed;
  const marker = kaMarkerRelationAt(tokens, afterIdx, ["tail_multi_clause"]);
  if (marker !== null && marker.particleSubtype1 !== 終助詞) return true;
  return isLikenessCarrierHeadToken(tokens[afterIdx]);
}

function quoteSpanClosesAt(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return isTrailingPunctuationToken(tokens[idx]);
  }
  return proto.quoteSpans.some(([, close]) => close === idx);
}

function deicticTerminalNokaClosesUtterance(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const followerIdx = idx + 2;
  const match = matchCompositeConnectiveAt(new TokenCursor(tokens, followerIdx, tokens.length), {
    requireEnd: false
  });
  if (match?.connective !== "question_content") return false;
  const closeIdx = followerIdx + match.consumed;
  if (tokens[closeIdx] === undefined) return false;
  if (
    closesUtteranceForSpeakerDirection(tokens, closeIdx, {
      utteranceBreakDashSurfaces: lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES
    })
  ) {
    return true;
  }
  if (quoteMarkerRelationAt(tokens, closeIdx, { consumers: ["tail_multi_clause"] }) === null) return false;
  return !interrogativeAnchorQuotedQuestionContinues(tokens, idx, closeIdx, lookups);
}

function interrogativeAnchorQuotedQuestionContinues(
  tokens: readonly RuntimeHaruToken[],
  anchorIdx: number,
  markerIdx: number,
  lookups: LookupTables
): boolean {
  const anchor = tokens[anchorIdx];
  if (anchor === undefined || !tokenIsInterrogativeLexeme(anchor, lookups)) return false;
  const relation = questionContentContinuationAfterKaRelationAt(tokens, markerIdx - 1, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  });
  if (relation?.continuationKind !== "question_quote_marker") return false;
  return quoteHostMatchAfterMarker(new TokenCursor(tokens, markerIdx, tokens.length, markerIdx), lookups) !== null;
}

function terminalSfpRunClosesUtteranceAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const idx = terminalSfpRunEndAt(tokens, pos);
  if (idx === pos) return true;
  const after = tokens[idx];
  return after === undefined ||
    (after.pos & POS0) === 補助記号 ||
    activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, idx);
}

export function terminalSfpRunEndAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): number {
  let idx = pos;
  if (
    lookups !== undefined &&
    ((tokens[idx]?.pos ?? 0) & POS01) !== 助詞_終助詞 &&
    isTerminalQuestionKaOwnership(kaOwnershipKindAt(tokens, idx, lookups))
  ) {
    idx += 1;
  }
  while (((tokens[idx]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    idx += 1;
  }
  return idx;
}

function isTerminalQuestionKaOwnership(kind: KaOwnershipKind | null): boolean {
  return kind === "question" || kind === "self_question_kana";
}

function confirmationKaRunIsQuotedAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): boolean {
  if (kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) === null) return false;
  const runEnd = terminalSfpRunEndAt(tokens, pos, lookups);
  if (runEnd === pos) return false;
  if (runEnd > pos + 1 && kaOwnershipKindAt(tokens, pos, lookups) !== "self_question_kana") {
    return false;
  }
  const continuationView = runEnd === pos + 1
    ? tokens
    : [...tokens.slice(0, pos + 1), ...tokens.slice(runEnd)];
  if (questionContentContinuationAfterKaRelationAt(continuationView, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  })?.continuationKind !== "question_quote_marker") {
    return false;
  }
  return kaOwnershipKindAt(tokens, runEnd + 1, lookups) !== "toka_listing";
}

function deicticNegativeConjectureQuoteShapeAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  matched: { readonly op: CopulaOp; readonly consumed: number },
  lookups: LookupTables
): boolean {
  if (matched.op.polarity !== "negative") return false;
  const conjectureIdx = copulaIdx + matched.consumed;
  const conjecture = matchCopula(tokens, conjectureIdx, lookups);
  if (conjecture?.op.variant !== "conjecture") return false;
  const marker = quoteMarkerRelationAt(tokens, conjectureIdx + conjecture.consumed, {
    consumers: ["tail_multi_clause"]
  });
  return marker?.canonicalSurface === "と" || marker?.canonicalSurface === "って";
}

export function isAdverbCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 副詞) return false;
  if (lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  const copula = tokens[idx + 1];
  if (copula === undefined) return false;
  if (
    copula.surface === "で" &&
    adverbHostCopulaDeMarkerAt(tokens, idx, lookups) === null &&
    !copulaDeNegationBridgeFollows(tokens, idx + 2) &&
    !isDetachedCopulaSupportVerbStart(tokens, idx + 2) &&
    negativeScopeBridgeEndAt(tokens, idx + 1) === null
  ) {
    return false;
  }
  if (matchCopula(tokens, idx + 1, lookups)?.op.variant === "basic") return true;
  return negativeScopeBridgeEndAt(tokens, idx + 1) !== null;
}

function copulaDeNegationBridgeFollows(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const next = tokens[pos];
  if (next === undefined) return false;
  if (
    next.surface === "は" &&
    (next.pos & POS0) === 助詞 &&
    matchNegationEnding(tokens, pos + 1, { allowAttributive: true }) !== null
  ) {
    return true;
  }
  return matchNegationEnding(tokens, pos, { allowAttributive: true }) !== null;
}

export function isDetachedCopulaSupportVerbStart(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const token = tokens[start];
  if (
    token === undefined ||
    (token.pos & POS01) !== 動詞_非自立可能 ||
    !isAffirmativeCopulaSupportVerbToken(token) ||
    isGozaruPoliteSupportToken(token)
  ) {
    return false;
  }
  return copulaDeMarkerRelationForToken(tokens[start - 1], start - 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
}

export interface NounPhraseHeadSpan {
  readonly numeral: NumericBasePayload | null;
  readonly suffixStart: number;
  readonly endExclusive: number;
}

export function nounPhraseHeadSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  reserved?: NumericHostSpanReservation | null,
  lookups?: LookupTables
): NounPhraseHeadSpan {
  const { tokens } = cursor;
  if (reserved !== undefined && reserved !== null) {
    const suffixStart = idx + reserved.consumed;
    return {
      numeral: reserved.plan,
      suffixStart,
      endExclusive: nounCompoundSuffixRunEnd(tokens, suffixStart)
    };
  }
  const head = tokens[idx];
  if (head !== undefined && isNumeralToken(head)) {
    const numeralCursor = cursor.fork(idx, tokens.length, idx);
    const numeral = tryNumeral(numeralCursor, numeric, numeralResolutionContext(tokens, lookups));
    if (numeral !== undefined) {
      return {
        numeral: numericBasePlanFrom(numeral),
        suffixStart: numeralCursor.pos,
        endExclusive: nounCompoundSuffixRunEnd(tokens, numeralCursor.pos)
      };
    }
  }
  return {
    numeral: null,
    suffixStart: idx + 1,
    endExclusive: nounCompoundSuffixRunEnd(tokens, idx + 1)
  };
}

export function numeralResolutionContext(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables | undefined
): NumeralResolutionContext {
  return { copulaPredicateStartsAt: (idx) => copulaStartsPredicateAt(tokens, idx, lookups) };
}

export interface NumericHostSpanReservation {
  readonly consumed: number;
  readonly plan: NumericBasePayload;
}

export function isQuestionComplementHostPos(pos0: number): boolean {
  return pos0 === 名詞 || pos0 === 代名詞 || pos0 === 副詞;
}

export interface QuestionComplementProjection {
  readonly compositeConnective: string | null;
  readonly questionQuoteMarker: boolean;
}

export function questionComplementProjectionAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): QuestionComplementProjection | null {
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined || lookups === undefined) {
    return null;
  }
  if (!isQuestionComplementHostPos(token.pos & POS0)) {
    return null;
  }
  const kaIdx = start + 1;
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "kadouka") {
    return null;
  }
  if (participatesInStructuralKaParallel(new TokenCursor(tokens, kaIdx, tokens.length), lookups)) {
    return null;
  }
  if (quotativeDerivedIdiomClaimAt(tokens, kaIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return null;
  }
  if (
    nominalTerminalQuestionClosesUtteranceAt(
      cursor,
      kaIdx,
      terminalSfpRunEndAt(tokens, kaIdx, lookups),
      lookups
    )
  ) {
    return null;
  }
  const compositeConnective = matchCompositeConnectiveAt(
    cursor.fork(kaIdx, tokens.length, kaIdx),
    { requireEnd: false }
  )?.connective ?? null;
  return {
    compositeConnective: compositeConnective === "question_content_alternative" && kaOwnership !== "kadouka"
      ? null
      : compositeConnective,
    questionQuoteMarker: questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
      consumers: ["tail_multi_clause"],
      requireAdjacent: true
    })?.continuationKind === "question_quote_marker"
  };
}

export function isQuestionComplementPredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): boolean {
  if (isBareInterrogativeQuestionComplementStart(cursor, start, lookups)) {
    return true;
  }
  const projection = questionComplementProjectionAt(cursor, start, lookups);
  if (projection === null) {
    return false;
  }
  return projection.questionQuoteMarker ||
    projection.compositeConnective === "question_content" ||
    projection.compositeConnective === "question_content_alternative";
}

export function isBareInterrogativeQuestionComplementStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): boolean {
  const token = cursor.tokens[start];
  if (lookups === undefined || token === undefined || !tokenIsInterrogativeLexeme(token, lookups)) {
    return false;
  }
  const kaIdx = start + 1;
  const ownership = kaOwnershipKindAt(cursor.tokens, kaIdx, lookups);
  if (ownership !== "question" && ownership !== "wh_indefinite") return false;
  if (participatesInStructuralKaParallel(new TokenCursor(cursor.tokens, kaIdx, cursor.tokens.length), lookups)) {
    return false;
  }
  if (
    questionContentContinuationAfterKaRelationAt(cursor.tokens, kaIdx, {
      consumers: ["tail_multi_clause"], requireAdjacent: true
    })?.continuationKind === "question_quote_marker" ||
    activeProtoLayout()?.lexicalAdverbialAffiliationAt(kaIdx)?.relation === "request_adjunct"
  ) return false;
  return looksQuestionTakingAfter(cursor.fork(kaIdx + 1, cursor.tokens.length, kaIdx + 1), lookups, {
    hostCapability: "content"
  });
}

export function nominalTerminalQuestionDetachedClosureIndexAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): number | null {
  if (!isNominalQuestionTerminalStart(cursor, start, numeric, lookups)) {
    return null;
  }
  const { tokens } = cursor;
  const kaIdx = nounPhraseHeadSpan(cursor, start, numeric, null, lookups).endExclusive;
  const runEnd = terminalSfpRunEndAt(tokens, kaIdx, lookups);
  return NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES.has(
    utteranceClosureAfter(activeProtoLayout(), tokens, runEnd, { closureMarkerIdx: kaIdx }).closure
  )
    ? runEnd
    : null;
}

export function isNominalQuestionTerminalStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 代名詞) {
    return false;
  }
  const kaIdx = nounPhraseHeadSpan(cursor, start, numeric, null, lookups).endExclusive;
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "self_question_kana") {
    return false;
  }
  if (participatesInStructuralKaParallel(new TokenCursor(tokens, kaIdx, tokens.length), lookups)) {
    return false;
  }
  const runEnd = terminalSfpRunEndAt(tokens, kaIdx, lookups);
  if (
    confirmationKaRunIsQuotedAt(tokens, kaIdx, lookups) &&
    hostlessTerminalQuoteMarkerClosesSourceAt(tokens, runEnd)
  ) {
    return true;
  }
  return nominalTerminalQuestionClosesUtteranceAt(cursor, kaIdx, runEnd, lookups);
}

const NOMINAL_TERMINAL_QUESTION_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal",
  "detached_separation"
]);

const NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>(["detached_separation"]);

function nominalTerminalQuestionClosesUtteranceAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number,
  runEnd: number,
  lookups: LookupTables
): boolean {
  const evidence = utteranceClosureAfter(
    activeProtoLayout(),
    cursor.tokens,
    runEnd,
    { closureMarkerIdx: kaIdx }
  );
  if (!closesUtteranceAs(evidence, NOMINAL_TERMINAL_QUESTION_CLOSURES)) {
    return false;
  }
  if (!NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES.has(evidence.closure)) {
    return true;
  }
  return !questionContentBoundaryHasHostAfterScanEnd(cursor, runEnd - 1, lookups);
}

export function nominalTerminalQuestionClosureEndsChunkAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  return nominalTerminalQuestionDetachedClosureIndexAt(cursor, start, numeric, lookups) === scanEnd + 1;
}

export function isNominalLikenessPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const next = tokens[start + 1];
  if (next?.surface === "のように" && (next.pos & POS0) === 助詞) {
    return true;
  }
  const nominalLinked = nominalLinkMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likeness = nominalLinked ? tokens[start + 2] : next;
  if (likeness === undefined) {
    return false;
  }
  if (
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return false;
  }
  const host = tokens[start];
  const hostIsPredicateLikenessStem =
    pos0in(host?.pos ?? 0, INFLECTABLE_BITS) ||
    (host !== undefined && (host.pos & POS0) === 形状詞);
  if (likeness.surface === "みたい" && hostIsPredicateLikenessStem) {
    return false;
  }
  if (likeness.surface === "よう" && !nominalLinked && hostIsPredicateLikenessStem) {
    return false;
  }
  return true;
}

export function youNiCarrierVerbIndex(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number | null {
  if (fusedNoYouNiKeijoujiAttributiveAt(tokens, start + 1)) {
    const fusedCarrier = tokens[start + 2];
    return fusedCarrier !== undefined && (fusedCarrier.pos & POS0) === 動詞 ? start + 2 : null;
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessIdx = hasNoMarker ? start + 2 : start + 1;
  const likeness = tokens[likenessIdx];
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return null;
  }
  const niIdx = likenessIdx + 1;
  if (
    copulaNiMarkerRelationForToken(tokens[niIdx], niIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return null;
  }
  const carrierIdx = niIdx + 1;
  const carrier = tokens[carrierIdx];
  if (carrier === undefined || (carrier.pos & POS0) !== 動詞) {
    return null;
  }
  return carrierIdx;
}

export function isYouNiChangeControlCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const carrierIdx = youNiCarrierVerbIndex(tokens, start);
  if (carrierIdx === null) {
    return false;
  }
  const carrier = tokens[carrierIdx]!;
  const form = carrier.dictionaryForm || carrier.surface;
  return form === "なる" || form === "なれる" || form === "する";
}

export function isYouNiPerceptionCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const carrierIdx = youNiCarrierVerbIndex(tokens, start);
  if (carrierIdx === null) {
    return false;
  }
  return perceptionCarrierVerbMatch(tokens[carrierIdx], tokens[carrierIdx + 1]) !== null;
}

export function hostlessTerminalQuoteMarkerClosesSourceAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const marker = tokaTteCompositeQuoteCandidateAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    tokaQuoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    quoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    datteQuoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] });
  if (marker === null) {
    return false;
  }
  return !hasRealContentAfterIndex(tokens, marker.span.endExclusive, { stopAtHardTerminal: true });
}
export function numericBasePlanFrom(numeral: NumeralPlan | string): NumericBasePayload {
  return typeof numeral === "string"
    ? { kind: "fixedText", text: numeral, koreanPos: 수사 }
    : numeral;
}
