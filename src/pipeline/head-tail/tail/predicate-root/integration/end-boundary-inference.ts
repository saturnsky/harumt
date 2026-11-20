import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { focusedNegationShapeAt, isAffirmativeCopulaSupportVerbToken, fusedCopulaSupportConnectiveKindOf, volitionalConcessiveMarkerTokenCountAt, DEAROU_CONCESSIVE_CONNECTIVE_SURFACE, isBareMoConcessivePreviousToken } from "../classifiers/tokens.js";
import { isLikenessCarrierStemToken } from "../matchers/scope-bridge.js";
import { matchCompositeConnectiveAt, type CompositeConnectiveMatch } from "../matchers/connective.js";
import { matchTameConnectiveAt } from "../matchers/tame-connective.js";
import { detectSahenPredicateStart, hasSupportedClauseContinuation, terminalOnlyPredicateEndpointClosesBefore } from "./readiness.js";
import { activeProtoLayout, protoLayoutForTokens, skipClausePunctuationForward } from "../../../../clause-layout/index.js";
import { isFinitePredicateBoundaryLeft } from "../../../../clause-layout/token-evidence.js";
import { previousClauseNonPunctuationIndex } from "../../../../clause-layout/navigation.js";
import type { ChuushiClosureEvidence } from "../../../../clause-layout/chuushi-closure.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { zeroNominalizedParallelMoMarkerIndices } from "../../../../clause-layout/predicate-parallel.js";
import { matchPermissionPredicateAt } from "../../../../semantics/permission-idiom.js";
import { quoteClauseBoundaryFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { participatesInStructuralKaParallel } from "../../../../structural-relation/ka-parallel-ownership.js";
import { matchHokaAdditiveConnectiveStart, matchMonoNoConcessiveConnectiveStart } from "../../../boundary/connective-start.js";
import { KAMO_SHIRENAI_LEMMAS } from "../../../../lookup-tables.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { ClauseBoundary } from "../commit.js";
import { lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import type { ConnectiveKind } from "../grammar.js";
import { isBoundaryPunctuationToken } from "../../../boundary/punctuation.js";
import { adjectivalConcessiveTomoRelationAt, copulaDeMarkerRelationForToken, externalNominalizerContinuationRelationAt, kaMarkerRelationAt, questionContentContinuationAfterKaRelationAt } from "../../../boundary/marker.js";
import { closedPropositionTokaKaRelationAt, closedPropositionTokaListingEvidenceAt, kaOwnershipKindAt, terminalQuestionKaRelationAt } from "../../../boundary/ka-ownership.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../../../boundary/quote-marker.js";
import { canonicalTerminalSfpSurface } from "../../../../semantics/sfp-surface.js";
import { isVerbLemma } from "../../../../matchers.js";
import { boundaryRelationsForToken } from "../../../boundary/scanner.js";
import type { MarkerBoundaryRelation } from "../../../boundary/relation.js";
import { looksEmbeddedQuestionKaAdjectivalNounBoundary, looksEmbeddedQuestionKaBoundary, looksEmbeddedQuestionKaExternalSuffixBoundary, looksEmbeddedQuestionKaNominalizedBoundary, looksPredicateChoiceKaClauseBoundary } from "../../../../quote/embedded-question.js";
import { looksAttributiveQuoteSiblingQuestionContentAfterViaLayout } from "../../../../quote/question-taking-enumeration.js";
import { POS0, POS01, POS1, POS4, POS5A, 意志推量形_, isAssertiveCopulaFamilyPos, 仮定形_, 係助詞, 形容詞0, 終止形_, 助詞, 助詞_接続助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 動詞, 動詞_非自立可能, 副助詞, 連体形_, 助詞_副助詞, 助詞_係助詞, 助詞_格助詞 } from "../../../../../types/pos.js";
import { questionContentBoundaryHasHostAfterScanEnd, isExternalNominalizerPredicateContinuation, isQuestionComplementPredicateStart, nominalTerminalQuestionClosureEndsChunkAt } from "./predicate-start-evidence.js";
import { pauseJunctureEndsTailChunkAt, spaceSeparatesTailChunkFromFollowingPostverbClause, terminalCopulaSeparatedFromFollowingClause } from "./tail-chunk-scan-end.js";

export function explicitQuoteSpanContentTailRelation(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): { readonly relation: NonNullable<ReturnType<typeof quoteStructuralRelationAt>>; readonly closeIdx: number } | null {
  const tokens = cursor.tokens;
  const proto = activeProtoLayout();
  if (proto === null) {
    return null;
  }
  const closeIdx = nextNonSpaceIndex(tokens, scanEnd + 1, tokens.length);
  if (closeIdx === null) {
    return null;
  }
  const span = proto.quoteSpans.find(([, close]) => close === closeIdx);
  if (span === undefined) {
    return null;
  }
  const [open] = span;
  if (previousNonSpaceIndex(tokens, closeIdx, open + 1) !== scanEnd) {
    return null;
  }
  if (kaMarkerRelationAt(tokens, scanEnd, ["tail_multi_clause"]) !== null) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, closeIdx + 1, tokens.length);
  if (markerIdx === null) {
    return null;
  }
  const relation = quoteStructuralRelationAt(cursor.fork(markerIdx, tokens.length, markerIdx), lookups);
  if (relation === undefined || relation.quote.slotKind !== "quoted_content") {
    return null;
  }
  return { relation, closeIdx };
}

function explicitQuoteSpanContentTailBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const tokens = cursor.tokens;
  const info = explicitQuoteSpanContentTailRelation(cursor, scanEnd, lookups);
  return info === null
    ? null
    : quoteClauseBoundaryFromRelation(tokens, info.relation, lookups, { lowerBoundInclusive: info.closeIdx + 1 });
}

export function inferTailChunkEndBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): ClauseBoundary {
  const { tokens } = cursor;
  if (spaceSeparatesTailChunkFromFollowingPostverbClause(tokens, 0, scanEnd + 1, lookups)) {
    return { kind: "terminal" };
  }
  if (terminalCopulaSeparatedFromFollowingClause(tokens, 0, scanEnd + 1, lookups)) {
    return { kind: "terminal" };
  }
  if (pauseJunctureEndsTailChunkAt(tokens, 0, scanEnd + 1)) {
    return { kind: "terminal" };
  }
  if (terminalOnlyPredicateEndpointClosesBefore(tokens, start, scanEnd + 1)) {
    return { kind: "terminal" };
  }
  if (nominalTerminalQuestionClosureEndsChunkAt(cursor, start, scanEnd, numeric, lookups)) {
    return { kind: "terminal" };
  }
  const quoteSpanContentBoundary = explicitQuoteSpanContentTailBoundary(cursor, scanEnd, lookups);
  if (quoteSpanContentBoundary !== null) {
    return quoteSpanContentBoundary;
  }
  const externalNominalizerBoundary = inferExternalNominalizerBoundaryAtScanEnd(cursor, scanEnd, lookups);
  if (externalNominalizerBoundary !== null) {
    return externalNominalizerBoundary;
  }
  const questionContentBoundary = inferQuestionContentCompositeBoundaryAtScanEnd(cursor, scanEnd, lookups);
  if (questionContentBoundary !== null) {
    return questionContentBoundary;
  }
  const questionQuotativeBoundary = inferQuestionQuotativeBoundaryAtScanEnd(cursor, start, scanEnd, lookups);
  if (questionQuotativeBoundary !== null) {
    return questionQuotativeBoundary;
  }
  if (chuushiClosureEvidenceAt(tokens, scanEnd + 1, lookups)?.right === "detached") {
    return { kind: "terminal" };
  }
  const boundary = classifySingleTokenBoundary(cursor, scanEnd, lookups);
  if (boundary.kind === "terminal") {
    return { kind: "terminal" };
  }
  if (
    boundary.kind === "合成接続" &&
    boundary.connectiveKind === "question_content" &&
    !questionContentBoundaryHasHostAfterScanEnd(cursor, scanEnd, lookups) &&
    !questionContentBoundaryHasSourceBearingKaAtScanEnd(tokens, scanEnd)
  ) {
    return { kind: "terminal" };
  }
  if (questionKaQuoteMarkerEndsAt(tokens, scanEnd, lookups)) {
    return { kind: "terminal" };
  }
  const nextContent = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
  if (nextContent < tokens.length) {
    return boundary;
  }
  return { kind: "terminal" };
}

function questionKaQuoteMarkerEndsAt(
  tokens: readonly RuntimeHaruToken[],
  scanEnd: number,
  lookups: LookupTables
): boolean {
  const kaIdx = scanEnd - 1;
  if (kaIdx < 0) {
    return false;
  }
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "kadouka") {
    return false;
  }
  const continuation = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  });
  return continuation?.continuationKind === "question_quote_marker" && continuation.span.endExclusive === scanEnd + 1;
}

function inferQuestionQuotativeBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const kaIdx = scanEnd - 1;
  if (!isQuestionComplementPredicateStart(cursor, start, lookups) || !questionKaQuoteMarkerEndsAt(tokens, scanEnd, lookups)) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: "question_quotative",
    surface: `${tokens[kaIdx]?.surface ?? ""}${tokens[scanEnd]?.surface ?? ""}`,
    tokenIdx: scanEnd,
    tokenSpan: { start: kaIdx, end: scanEnd }
  };
}

function inferQuestionContentCompositeBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const lower = Math.max(0, scanEnd - 4);
  for (let start = lower; start <= scanEnd; start += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false });
    if (
      match === null ||
      match.connective !== "question_content" ||
      start + match.consumed - 1 !== scanEnd
    ) {
      continue;
    }
    if (
      !questionContentBoundaryHasHostAfterScanEnd(cursor, scanEnd, lookups) &&
      !questionContentBoundaryHasSourceBearingKaAtScanEnd(tokens, scanEnd)
    ) {
      continue;
    }
    return {
      kind: "合成接続",
      connectiveKind: match.connective,
      surface: match.surface,
      tokenIdx: scanEnd,
      tokenSpan: { start, end: scanEnd }
    };
  }
  return null;
}

function questionContentBoundaryHasSourceBearingKaAtScanEnd(
  tokens: readonly RuntimeHaruToken[],
  scanEnd: number
): boolean {
  return kaMarkerRelationAt(tokens, scanEnd, ["tail_multi_clause"])?.particleSubtype1 === 副助詞;
}

export function inferExternalNominalizerBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const lower = Math.max(0, scanEnd - 5);
  for (let start = lower; start <= scanEnd; start += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false });
    if (
      match === null ||
      (
        match.connective !== "external_nominalizer_comparison" &&
        match.connective !== "external_nominalizer_concessive" &&
        match.connective !== "external_nominalizer_additive"
      ) ||
      start + match.consumed - 1 !== scanEnd
    ) {
      continue;
    }
    const nextStart = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
    if (!hasSupportedClauseContinuation(tokens, nextStart, tokens.length, lookups)) {
      continue;
    }
    if (isSuppressedCompositeBoundary(cursor, match, scanEnd + 1)) {
      continue;
    }
    return {
      kind: "合成接続",
      connectiveKind: match.connective,
      surface: match.surface,
      tokenIdx: scanEnd,
      tokenSpan: { start, end: scanEnd }
    };
  }
  return null;
}

export function chuushiClosureEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): ChuushiClosureEvidence | undefined {
  return protoLayoutForTokens(tokens, lookups).chuushiClosureAt(splitAt);
}

export function isSimpleAspectAuxiliaryToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS01) !== 動詞_非自立可能) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  return lemma === "いる" || lemma === "居る" || lemma === "おる" ||
    lemma === "ある" || lemma === "有る" ||
    lemma === "おく" || lemma === "置く" ||
    lemma === "しまう" ||
    lemma === "みる" || lemma === "見る" ||
    lemma === "くる" || lemma === "来る" ||
    lemma === "いく" || lemma === "行く";
}

export function isSuppressedCompositeBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  match: CompositeConnectiveMatch,
  splitAt: number
): boolean {
  const { tokens } = cursor;
  const next = tokens[splitAt];
  if (next === undefined) return true;
  const nextLemma = next.dictionaryForm || next.surface;

  if (
    match.connective === "external_nominalizer_comparison" ||
    match.connective === "external_nominalizer_additive"
  ) {
    return isExternalNominalizerPredicateContinuation(tokens, splitAt);
  }
  if (match.connective === "external_nominalizer_concessive") {
    return false;
  }

  if ((match.surface === "のか" || match.surface === "んか") && startsKamoShirenaiModalAfterBoundary(tokens, splitAt)) {
    return true;
  }

  if (match.surface === "ので") {
    return (
      (next.pos & POS0) === 動詞 && nextLemma === "ある" ||
      ((next.pos & POS0) === 形容詞0 && (nextLemma === "ない" || nextLemma === "無い"))
    );
  }

  if (match.surface === "のに") {
    return (
      nextLemma === "対する" ||
      next.surface === "対し" ||
      next.surface === "対して" ||
      isPronominalNoNiResultVerb(tokens, splitAt)
    );
  }

  if (match.surface === "ても" || match.surface === "でも") {
    if (isSimpleAspectAuxiliaryToken(next)) {
      return true;
    }
    if (isExternalNominalizerFocusPredicateContinuation(tokens, splitAt - match.consumed)) {
      return true;
    }
    return (
      ((next.pos & POS0) === 形容詞0 && ["いい", "良い", "よい", "好い"].includes(nextLemma)) ||
      matchPermissionPredicateAt(tokens, splitAt) !== null
    );
  }

  return false;
}

function startsKamoShirenaiModalAfterBoundary(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): boolean {
  const focus = tokens[splitAt];
  if (focus?.surface !== "も") {
    return false;
  }
  const predicate = tokens[splitAt + 1];
  if (predicate === undefined) {
    return false;
  }
  const form = predicate.dictionaryForm || predicate.surface;
  return KAMO_SHIRENAI_LEMMAS.has(form) || predicate.surface === "しれ" || predicate.surface === "知れ";
}

function isExternalNominalizerFocusPredicateContinuation(
  tokens: readonly RuntimeHaruToken[],
  teIdx: number
): boolean {
  const relation = externalNominalizerContinuationRelationAt(tokens, teIdx - 3, {
    requireEnd: false,
    consumers: ["tail_multi_clause"]
  });
  return relation?.connectiveKind === "external_nominalizer_comparison" &&
    relation.span.endExclusive > teIdx;
}

const PRONOMINAL_NONI_RESULT_VERBS = new Set(["する", "変える", "替える", "交換する"]);

function isPronominalNoNiResultVerb(tokens: readonly RuntimeHaruToken[], splitAt: number): boolean {
  const next = tokens[splitAt];
  if (next === undefined) return false;
  if (PRONOMINAL_NONI_RESULT_VERBS.has(next.dictionaryForm || next.surface)) {
    return true;
  }
  const sahen = detectSahenPredicateStart(tokens, splitAt);
  if (sahen !== null && sahen.hostKind === "nominal") {
    const lemma = `${sahen.nounToken.dictionaryForm || sahen.nounToken.surface}する`;
    return PRONOMINAL_NONI_RESULT_VERBS.has(lemma);
  }
  return false;
}

export function withQuotedQuestionContext(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: ClauseBoundary,
  _lookups: LookupTables
): ClauseBoundary {
  if (
    boundary.kind === "terminal" ||
    boundary.connectiveKind !== "question_content" ||
    boundary.quotedQuestionContext === true
  ) {
    return boundary;
  }
  const { tokens } = cursor;
  const toIdx = nextNonSpaceIndex(tokens, boundary.tokenIdx + 1, tokens.length);
  const to = toIdx === null ? undefined : tokens[toIdx];
  if (to === undefined || (to.pos & POS01) !== 助詞_格助詞 || to.surface !== "と") {
    return boundary;
  }
  const kaIdx = toIdx === null ? null : nextNonSpaceIndex(tokens, toIdx + 1, tokens.length);
  const ka = kaIdx === null ? undefined : tokens[kaIdx];
  return ka !== undefined && (ka.pos & POS01) === 助詞_副助詞 && (ka.surface === "か")
    ? { ...boundary, quotedQuestionContext: true }
    : boundary;
}

export function normalizeTokaListingBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: ClauseBoundary,
  lookups: LookupTables,
): ClauseBoundary {
  if (boundary.kind === "terminal") {
    return boundary;
  }
  const toIdx = boundary.connectiveKind === "question_content"
    ? previousNonSpaceIndex(cursor.tokens, boundary.tokenIdx, 0)
    : boundary.connectiveKind === "conditional" && boundary.surface === "と"
      ? boundary.tokenIdx
      : null;
  if (toIdx === null) {
    return boundary;
  }
  const kaIdx = boundary.connectiveKind === "question_content"
    ? boundary.tokenIdx
    : nextNonSpaceIndex(cursor.tokens, toIdx + 1, cursor.tokens.length);
  if (kaIdx === null || kaOwnershipKindAt(cursor.tokens, kaIdx, lookups) !== "toka_listing") {
    return boundary;
  }
  const precedingIdx = previousNonSpaceIndex(cursor.tokens, toIdx, 0);
  if (
    boundary.connectiveKind === "conditional" &&
    !isFinitePredicateBoundaryLeft(precedingIdx === null ? undefined : cursor.tokens[precedingIdx])
  ) {
    return boundary;
  }
  if (precedingIdx !== null && kaMarkerRelationAt(cursor.tokens, precedingIdx, ["tail_multi_clause"]) !== null) {
    return boundary;
  }
  if (precedingIdx !== null && ((cursor.tokens[precedingIdx]?.pos ?? 0) & POS5A) === 意志推量形_) {
    const closure = closedPropositionTokaKaRelationAt(cursor.tokens, kaIdx);
    if (
      closure?.evidence !== "bare_volitional" ||
      tokaTteCompositeQuoteCandidateAt(cursor.tokens, toIdx, { consumers: ["tail_multi_clause"] }) !== null ||
      quoteStructuralRelationAt(new TokenCursor(cursor.tokens, toIdx, cursor.tokens.length, toIdx), lookups)
        ?.quote.markerSpan.start === toIdx ||
      !closedPropositionTokaListingEvidenceAt(cursor.tokens, closure, lookups)
    ) {
      return boundary;
    }
  }
  return {
    ...boundary,
    connectiveKind: "exemplification",
    surface: "とか",
    tokenIdx: kaIdx,
    tokenSpan: { start: toIdx, end: Math.max(boundary.tokenSpan.end, kaIdx) },
  };
}

export function isZeroNominalizedParallelMoMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  return zeroNominalizedParallelMoMarkerIndices(tokens).has(markerIdx);
}

function volitionalConcessiveToBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lowerBoundInclusive: number
): ClauseBoundary | null {
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined || (tok.pos & POS0) !== 助詞) {
    return null;
  }
  let markerStartIdx: number;
  let concessiveSurface: "と" | "とも" | "が" | typeof DEAROU_CONCESSIVE_CONNECTIVE_SURFACE;
  if (tok.surface === "とも") {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "とも";
  } else if (tok.surface === "と") {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "と";
  } else if (tok.surface === "が" && (tok.pos & POS01) === 助詞_格助詞) {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "が";
  } else if (tok.surface === "も" && (tok.pos & POS1) === 係助詞) {
    const prevTo = tokens[boundaryTokenIdx - 1];
    if (prevTo === undefined || prevTo.surface !== "と" || (prevTo.pos & POS0) !== 助詞) {
      return null;
    }
    markerStartIdx = boundaryTokenIdx - 1;
    concessiveSurface = "とも";
  } else {
    return null;
  }
  const leftIdx = previousClauseNonPunctuationIndex(tokens, markerStartIdx - 1, lowerBoundInclusive);
  if (leftIdx === null) {
    return null;
  }
  const left = tokens[leftIdx];
  if (left === undefined || (left.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  const leftPos4 = left.pos & POS4;
  if (leftPos4 === 助動詞_マス || leftPos4 === 助動詞_デス) {
    return null;
  }
  if (concessiveSurface === "が") {
    const leftPos0 = left.pos & POS0;
    if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0) {
      return null;
    }
  }
  const beforeLeft = tokens[leftIdx - 1];
  if (beforeLeft !== undefined) {
    const beforeIsTeAux = (beforeLeft.pos & POS01) === 助詞_接続助詞 &&
      (beforeLeft.surface === "て" || beforeLeft.surface === "で");
    if (beforeIsTeAux) {
      return null;
    }
  }
  if (
    concessiveSurface !== "が" &&
    volitionalConcessiveMarkerTokenCountAt(tokens, markerStartIdx) === null
  ) {
    return null;
  }
  const leftIsCopulaConjecture = isAssertiveCopulaFamilyPos(left.pos) ||
    (isAffirmativeCopulaSupportVerbToken(left) &&
      copulaDeMarkerRelationForToken(beforeLeft, leftIdx - 1, { consumers: ["tail_multi_clause"] })
        ?.isAssertiveCopulaFamily === true);
  return {
    kind: "合成接続",
    connectiveKind: "even_if",
    surface: leftIsCopulaConjecture && concessiveSurface !== "が"
      ? DEAROU_CONCESSIVE_CONNECTIVE_SURFACE
      : concessiveSurface,
    tokenIdx: boundaryTokenIdx,
    tokenSpan: { start: markerStartIdx, end: boundaryTokenIdx }
  };
}

function politeVolitionalHostlessQuotativeBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lowerBoundInclusive: number
): ClauseBoundary | null {
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined || tok.surface !== "と" || (tok.pos & POS0) !== 助詞) {
    return null;
  }
  const leftIdx = previousClauseNonPunctuationIndex(tokens, boundaryTokenIdx - 1, lowerBoundInclusive);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined || (left.pos & (POS4 | POS5A)) !== (助動詞_マス | 意志推量形_)) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, boundaryTokenIdx + 1, tokens.length);
  if (nextIdx !== null && !isBoundaryPunctuationToken(tokens[nextIdx])) {
    return null;
  }
  return {
    kind: "合成接続",
    connectiveKind: "quotative",
    surface: "と",
    tokenIdx: boundaryTokenIdx,
    tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
  };
}

export function classifySingleTokenBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundaryTokenIdx: number,
  lookups: LookupTables,
  lowerBoundInclusive = 0
): ClauseBoundary {
  const { tokens } = cursor;
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined) return { kind: "terminal" };
  const surface = tok.surface;
  const volitionalConcessive = volitionalConcessiveToBoundary(tokens, boundaryTokenIdx, lowerBoundInclusive);
  if (volitionalConcessive !== null) {
    return volitionalConcessive;
  }
  const adjectivalConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, boundaryTokenIdx, {
    lowerBoundInclusive,
    consumers: ["tail_multi_clause"]
  });
  if (adjectivalConcessiveTomo !== null) {
    return {
      kind: "合成接続",
      connectiveKind: adjectivalConcessiveTomo.connectiveKind,
      surface: adjectivalConcessiveTomo.surface,
      tokenIdx: adjectivalConcessiveTomo.span.endExclusive - 1,
      tokenSpan: { start: adjectivalConcessiveTomo.span.start, end: adjectivalConcessiveTomo.span.endExclusive - 1 }
    };
  }
  const politeVolitionalQuotative = politeVolitionalHostlessQuotativeBoundary(
    tokens,
    boundaryTokenIdx,
    lowerBoundInclusive
  );
  if (politeVolitionalQuotative !== null) {
    return politeVolitionalQuotative;
  }
  if (quoteMarkerRelationAt(tokens, boundaryTokenIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    const relation = quoteStructuralRelationAt(cursor.fork(boundaryTokenIdx, tokens.length, boundaryTokenIdx), lookups);
    if (relation !== undefined) {
      const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups);
      if (boundary !== null) {
        return boundary;
      }
    }
  }
  const fusedSupportConnectiveKind = fusedCopulaSupportConnectiveKindOf(tok);
  if (fusedSupportConnectiveKind !== null) {
    const hostIdx = previousNonSpaceIndex(tokens, boundaryTokenIdx, lowerBoundInclusive);
    if (hostIdx !== null && isLikenessCarrierStemToken(tokens[hostIdx])) {
      return {
        kind: "合成接続",
        connectiveKind: fusedSupportConnectiveKind === "conditional" ? "conditional" : "even_if",
        surface: fusedSupportConnectiveKind === "conditional" ? "ば" : "ても",
        tokenIdx: boundaryTokenIdx,
        tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
      };
    }
  }
  const relationBoundary = clauseBoundaryFromMarkerBoundaryRelation(tokens, boundaryTokenIdx, lookups);
  if (relationBoundary !== null) {
    return normalizeTokaListingBoundary(cursor, relationBoundary, lookups);
  }
  if (isFiniteOrCopulaAdversativeGaBoundary(tokens, boundaryTokenIdx, lowerBoundInclusive)) {
    return {
      kind: "合成接続",
      connectiveKind: "adversative",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if (
    surface === "も" && (tok.pos & POS01) === 助詞_係助詞 &&
    isBareMoConcessivePreviousToken(tokens[boundaryTokenIdx - 1]) &&
    focusedNegationShapeAt(tokens, boundaryTokenIdx) === null &&
    !isZeroNominalizedParallelMoMarker(tokens, boundaryTokenIdx)
  ) {
    return {
      kind: "合成接続",
      connectiveKind: "concession",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)) {
    return {
      kind: "助動詞-タ仮定",
      connectiveKind: "conditional",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_)) {
    return {
      kind: "助動詞-ダ仮定",
      connectiveKind: "conditional",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  const boundaryCursor = cursor.fork(boundaryTokenIdx, tokens.length, boundaryTokenIdx);
  const protoLayout = activeProtoLayout();
  const attributiveQuoteSiblingQuestionContent = protoLayout !== null &&
    looksAttributiveQuoteSiblingQuestionContentAfterViaLayout(
      protoLayout,
      tokens,
      boundaryTokenIdx,
      tokens.length,
      lookups,
    );
  const anaphoricConjectureSelfQuestion =
    protoLayout?.anaphoricConjectureSelfQuestionAt(boundaryTokenIdx) !== undefined;
  const structuralKaParallelOwner = participatesInStructuralKaParallel(boundaryCursor, lookups);
  const ownedByExistingKaStructure =
    looksEmbeddedQuestionKaBoundary(boundaryCursor, lookups, { scope: "sentence" }) ||
    looksEmbeddedQuestionKaNominalizedBoundary(boundaryCursor) ||
    looksEmbeddedQuestionKaExternalSuffixBoundary(boundaryCursor, lookups) ||
    looksEmbeddedQuestionKaAdjectivalNounBoundary(boundaryCursor, lookups, { scope: "sentence" }) ||
    attributiveQuoteSiblingQuestionContent ||
    structuralKaParallelOwner;
  const terminalQuestionKa = terminalQuestionKaRelationAt(tokens, boundaryTokenIdx, {
    ownedByExistingStructure: ownedByExistingKaStructure,
    lookups,
    anaphoricConjectureSelfQuestion,
  });
  if (terminalQuestionKa !== null) {
    return { kind: "terminal" };
  }
  const kaOwnership = kaOwnershipKindAt(tokens, boundaryTokenIdx, lookups);
  if (kaOwnership === "question") {
    const questionSurface = canonicalTerminalSfpSurface(surface) === "か" ? "か" : surface;
    return withQuotedQuestionContext(cursor, {
      kind: "合成接続",
      connectiveKind: attributiveQuoteSiblingQuestionContent
        ? "question_content"
        : looksPredicateChoiceKaClauseBoundary(boundaryCursor, lookups)
        ? "alternative"
        : "question_content",
      surface: questionSurface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    }, lookups);
  }
  const hokaConsumed = boundaryCursor.lookahead(0, matchHokaAdditiveConnectiveStart);
  if (hokaConsumed !== null) {
    const end = boundaryTokenIdx + hokaConsumed - 1;
    return {
      kind: "合成接続",
      connectiveKind: "additive_besides",
      surface: tokens.slice(boundaryTokenIdx, boundaryTokenIdx + hokaConsumed).map((token) => token.surface).join(""),
      tokenIdx: end,
      tokenSpan: { start: boundaryTokenIdx, end }
    };
  }
  const monoNoConsumed = boundaryCursor.lookahead(0, matchMonoNoConcessiveConnectiveStart);
  if (monoNoConsumed !== null) {
    const end = boundaryTokenIdx + monoNoConsumed - 1;
    return {
      kind: "合成接続",
      connectiveKind: "concession",
      surface: "ものの",
      tokenIdx: end,
      tokenSpan: { start: boundaryTokenIdx, end }
    };
  }
  return { kind: "terminal" };
}

function clauseBoundaryFromMarkerBoundaryRelation(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const token = tokens[boundaryTokenIdx];
  if (token === undefined) {
    return null;
  }
  const relation = boundaryRelationsForToken(tokens, boundaryTokenIdx, {
    consumers: ["tail_multi_clause", "clause_layout"],
    lookups
  }).find((candidate): candidate is MarkerBoundaryRelation =>
    candidate.kind === "clause_connective" &&
    candidate.span.endExclusive === boundaryTokenIdx + 1 &&
    candidate.connectiveKind !== undefined &&
    (
      (candidate.connectiveKind !== "tame_reason" && candidate.connectiveKind !== "tame_purpose") ||
      matchTameConnectiveAt(tokens, candidate.span.start, { requireEnd: false, lookups }) !== null
    )
  );
  if (relation === undefined) {
    return null;
  }
  const end = relation.span.endExclusive - 1;
  return {
    kind: relation.span.endExclusive === boundaryTokenIdx + 1 && (token.pos & POS01) === 助詞_接続助詞
      ? "接続助詞"
      : "合成接続",
    connectiveKind: relation.connectiveKind as ConnectiveKind,
    surface: relation.surface,
    tokenIdx: end,
    tokenSpan: { start: relation.span.start, end }
  };
}

export function isFiniteOrCopulaAdversativeGaBoundary(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lowerBoundInclusive: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞 || lookupConnectiveBySurface(marker.surface) !== "adversative"
  ) {
    return false;
  }
  const leftEnd = previousClauseNonPunctuationIndex(tokens, markerIdx - 1, lowerBoundInclusive);
  if (leftEnd === null) {
    return false;
  }
  if (isFinitePredicateAdversativeGaLeft(tokens[leftEnd])) {
    return true;
  }
  return isExplicitDearuCopulaEnd(tokens, leftEnd, lowerBoundInclusive) ||
    isExplicitNounCopulaNegativeEnd(tokens, leftEnd, lowerBoundInclusive);
}

function isFinitePredicateAdversativeGaLeft(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞0) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function isExplicitDearuCopulaEnd(
  tokens: readonly RuntimeHaruToken[],
  leftEnd: number,
  lowerBoundInclusive: number
): boolean {
  const end = tokens[leftEnd];
  if (end === undefined) {
    return false;
  }
  if ((end.pos & POS4) === 助動詞_タ) {
    const prev = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
    return prev !== null && isExplicitDearuCopulaEnd(tokens, prev, lowerBoundInclusive);
  }
  if (!isVerbLemma(end, "ある")) {
    return false;
  }
  const prev = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
  const de = prev === null ? undefined : tokens[prev];
  return de !== undefined &&
    (de.surface === "で" || de.dictionaryForm === "だ") &&
    ((de.pos & POS0) === 助動詞0 || (de.pos & POS0) === 助詞);
}

function isExplicitNounCopulaNegativeEnd(
  tokens: readonly RuntimeHaruToken[],
  leftEnd: number,
  lowerBoundInclusive: number
): boolean {
  const end = tokens[leftEnd];
  if (end === undefined || end.dictionaryForm !== "ない") {
    return false;
  }
  const maybeFocus = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
  if (maybeFocus === null) {
    return false;
  }
  const focus = tokens[maybeFocus];
  const copulaIdx = focus?.surface === "は"
    ? previousClauseNonPunctuationIndex(tokens, maybeFocus - 1, lowerBoundInclusive)
    : maybeFocus;
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  return copula !== undefined &&
    (copula.surface === "で" || copula.surface === "じゃ") &&
    (copula.pos & POS0) === 助詞;
}
