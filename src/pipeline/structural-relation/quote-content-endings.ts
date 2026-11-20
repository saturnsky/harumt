import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { isConditionalAuxClauseBoundaryToken, isConditionalCopulaClauseBoundaryToken } from "../clause-layout/connective-boundaries.js";
import type { QuoteHostMatch } from "../quote/host-taxonomy.js";
import { conditionalTailConnectiveRelationForToken, isNegativeConditionalBoundaryAt, quoteHostSearchBridgeArgumentRelationAt } from "../head-tail/boundary/marker.js";
import { quoteBridgePunctuationRelationAt } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralQuoteContentSlotKind, StructuralRelation, StructuralRelationTokenSpan } from "./types.js";
import { POS1, POS5A, 接続助詞, 已然形_, isIAdjectivePredicateToken, isTerminalOrAttributiveInflection, isVerbPredicateToken } from "../../types/pos.js";
import { isCopulaSupportCapableToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { quoteContentEndsWithReasonCopulaBeforeQuoteMarker, isBasicCopulaAuxToken } from "./quote-reason-copula.js";
import { posLooksPredicateEvidence } from "./quote-content-span.js";

export function quoteConditionalContentPayload(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  slotKind: StructuralQuoteContentSlotKind,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): NonNullable<NonNullable<StructuralRelation["quote"]>["conditionalContent"]> | null {
  const tokenIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (tokenIdx === null || tokenIdx < contentSpan.start || tokenIdx >= contentSpan.endExclusive) {
    return null;
  }
  const supported =
    (slotKind === "quoted_content" && hostMatch.kind === "thought" &&
      quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)) ||
    (slotKind === "quoted_content" && hostMatch.kind === "report" &&
      quoteContentEndsWithConditionalBeforeReportHost(tokens, contentSpan, markerIdx, hostMatch)) ||
    (slotKind === "wish_content" && hostMatch.kind === "wish" &&
      quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx));
  if (!supported) {
    return null;
  }
  const affirmativeWish = hostMatch.kind === "thought"
    ? lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "conditional_wish") &&
      quoteContentEndsWithWishConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)
    : hostMatch.kind === "wish" && quoteContentEndsWithWishConditionalBeforeWishHost(tokens, contentSpan, markerIdx, hostMatch);
  return {
    tokenIdx,
    subtype: affirmativeWish ? "affirmative_wish" : "conditional",
  };
}

export function quoteRenderEnabledPayload(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: QuoteHostMatch,
): Pick<StructuralRelation, "renderEnabledByDefault"> {
  return quoteContentEndsWithPredicateBoundTame(tokens, contentSpan, markerIdx) ||
    quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithConditionalBeforeReportHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithWishConditionalBeforeWishHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithReasonCopulaBeforeQuoteMarker(tokens, contentSpan, markerIdx)
    ? { renderEnabledByDefault: true }
    : {};
}

export function quoteContentEndsWithConditionalBeforeThoughtHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  return hostMatch.kind === "thought" &&
    quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx);
}

export function quoteContentEndsWithConditionalBeforeReportHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  return hostMatch.kind === "report" &&
    quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx);
}

function quoteContentEndsWithConditionalBeforeSupportedHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number
): boolean {
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (conditionalIdx === null || conditionalIdx < contentSpan.start || conditionalIdx >= contentSpan.endExclusive) {
    return false;
  }
  return conditionalTailConnectiveRelationForToken(tokens[conditionalIdx], conditionalIdx, {
    consumers: ["quote_content"]
  }) !== null ||
    isConditionalAuxClauseBoundaryToken(tokens, conditionalIdx) ||
    isConditionalCopulaClauseBoundaryToken(tokens[conditionalIdx]!);
}

export function quoteContentEndsWithWishConditionalBeforeThoughtHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  if (!quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)) {
    return false;
  }
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  return conditionalIdx !== null &&
    !isNegativeConditionalBoundaryAt(tokens, conditionalIdx, contentSpan.start);
}

export function quoteContentEndsWithWishConditionalBeforeWishHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  if (
    hostMatch.kind !== "wish" ||
    !quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx)
  ) {
    return false;
  }
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  return conditionalIdx !== null &&
    !isNegativeConditionalBoundaryAt(tokens, conditionalIdx, contentSpan.start);
}

function quoteContentEndsWithPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): boolean {
  const tameIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (tameIdx === null || tameIdx < contentSpan.start || tameIdx >= contentSpan.endExclusive) {
    return false;
  }
  const tame = tokens[tameIdx];
  const form = tame?.dictionaryForm || tame?.surface;
  if (form !== "ため" && form !== "為") {
    return false;
  }
  const tamePredCursor = new TokenCursor(tokens, contentSpan.start, tameIdx);
  while (tamePredCursor.pos < tamePredCursor.end) {
    if (posLooksPredicateEvidence(tamePredCursor.current()?.pos ?? 0)) {
      return true;
    }
    tamePredCursor.advance();
  }
  return false;
}

export function quoteHostMatchIsTowaIeConcessive(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (quoteMarker?.canonicalSurface !== "と") {
    return false;
  }
  const waIdx = nextNonSpaceIndex(tokens, quoteMarker.span.endExclusive);
  if (waIdx === null || waIdx >= hostMatch.hostIdx || tokens[waIdx]?.surface !== "は") {
    return false;
  }
  const host = tokens[hostMatch.hostIdx];
  const hostForm = host?.dictionaryForm || host?.surface;
  return host !== undefined &&
    IU_LEXEME_FORMS.has(hostForm ?? "") &&
    (host.pos & POS5A) === 已然形_;
}

export function quoteHostMatchHasLooseSetsuzokuToBridge(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  const marker = tokens[markerIdx];
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (marker === undefined || quoteMarker?.canonicalSurface !== "と" || (marker.pos & POS1) !== 接続助詞) {
    return false;
  }
  const hostStart = hostMatch.supportIdx !== null ? hostMatch.supportIdx : hostMatch.hostIdx;
  let sawSubject = false;
  let sawObject = false;
  let index = quoteMarker.span.endExclusive;
  while (index < hostStart) {
    if (quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null) {
      index += 1;
      continue;
    }
    const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, index, {
      consumers: ["quote_content"]
    });
    if (bridgeArgument?.argumentKind === "subject_topic") {
      sawSubject = true;
    }
    if (bridgeArgument?.argumentKind === "object") {
      sawObject = true;
    }
    index += 1;
  }
  return (sawSubject && sawObject) ||
    (
      hostMatch.kind === "thought" &&
      sawObject &&
      quoteMarkerFollowsFinitePredicateClosure(tokens, markerIdx)
    );
}

function quoteMarkerFollowsFinitePredicateClosure(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): boolean {
  const predicateIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (predicateIdx === null) {
    return false;
  }
  const predicate = tokens[predicateIdx];
  const basicCopula = Boolean(isBasicCopulaAuxToken(predicate));
  return predicate !== undefined &&
    !basicCopula &&
    !isCopulaSupportCapableToken(predicate) &&
    (isVerbPredicateToken(predicate) || isIAdjectivePredicateToken(predicate)) &&
    isTerminalOrAttributiveInflection(predicate.pos);
}
