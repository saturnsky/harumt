import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isTerminalNeSfpSurface, isTerminalYoSfpSurface } from "../../../../semantics/sfp-surface.js";
import { isAdjNai } from "../../../../matchers.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { matchProhibitionPredicateAt, type ProhibitionPredicateMatch } from "../../../../semantics/prohibition-idiom.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { quoteConsumedMarkerSpanFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteStructuralRelationStartingAt } from "../../../../structural-relation/quote.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, conditionalToConnectiveRelationAt, dewaScopeBridgeRelationAt, predicateNominalizerRelationForToken, topicFocusMarkerRelationForToken } from "../../../boundary/marker.js";
import { parentheticalSpanEndingAt } from "../../../boundary/parenthetical.js";
import { getArgumentNounBeforeParticle } from "../../../candidate/semantic-classifiers.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { kaOwnershipKindAt } from "../../../boundary/ka-ownership.js";
import { isTerminalishPunctuationToken } from "../../../boundary/punctuation.js";
import type { AuxOpNode, ForbiddenIdiomOp, ObligationIdiomOp, OpSource, StemNode } from "../grammar.js";
import type { ParseInput, StemInput } from "../parse-input.js";
import type { ObligationPattern } from "../obligation-pattern-table.js";
import { srcSlice } from "../source.js";
import { isAffirmativeCopulaSupportVerbToken, isCopulaJaNegativeBridgeToken } from "../classifiers/tokens.js";
import { buildObligationIdiomOp, canCloseBareBekiBeforeBoundary, type ElidedColloquialObligationContext, isObligationSpanStartingAtToken, matchObligationBody, normalizeElidedColloquialObligationContext, tryMatchObligation } from "./obligation.js";
import { matchNegationEnding } from "./negation-ending.js";
import { matchCopulaWithMoodReading } from "./copula.js";
import { POS0, POS4, POS5A, 意志推量形_, 仮定形_, 終止形_, 助動詞_ジャ, 助動詞_ダ, 助動詞_デス, 助動詞_ヤ, 文語助動詞_ベシ, 補助記号, 連体形_, 連用形_, conjectureCopulaPoliteness, isTerminalCopulaFamilyToken, isTerminalParticleToken } from "../../../../../types/pos.js";
import { createIdiomOp } from "../op-builders.js";
import { isNegationToken, buildConjectureOp } from "../parser.js";
import { remainderIsChainFinalSfpRun } from "./terminal-sfp.js";
import { predicateQuoteCarrierStyle, predicateQuoteCarrierCanContinue, isRedundantPredicateQuoteCopula } from "./predicate-quote.js";
import { sourceIndexForInputPosition, contextCursorForInputPosition } from "../parse-coordinates.js";
import { matchTeConnectiveHead, stemSourceCannotHostDirectionalIku } from "./te-host.js";

interface BekiMatch {
  readonly op: ObligationIdiomOp;
  readonly ops?: readonly AuxOpNode[];
  readonly consumed: number;
}

function matchBekiNegationEnding(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): ReturnType<typeof matchNegationEnding> {
  const terminal = matchNegationEnding(tokens, start);
  if (terminal !== null) {
    return terminal;
  }
  const attributive = matchNegationEnding(tokens, start, { allowAttributive: true });
  if (attributive === null) {
    return null;
  }
  return bekiNegationNominalizerRunClosesAsQuestion(tokens, start + attributive.consumed, lookups)
    ? null
    : attributive;
}

function bekiNegationNominalizerRunClosesAsQuestion(
  tokens: readonly RuntimeHaruToken[],
  nominalizerIdx: number,
  lookups: LookupTables
): boolean {
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return false;
  }
  const carrierIdx = nextNonSpaceIndex(tokens, nominalizerIdx + 1, tokens.length);
  if (carrierIdx === null) {
    return predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    }) === null;
  }
  const carrier = tokens[carrierIdx];
  if (carrier === undefined || isTerminalishPunctuationToken(carrier)) {
    return true;
  }
  if (kaOwnershipKindAt(tokens, carrierIdx, lookups) === "question") {
    return true;
  }
  if (!isTerminalCopulaFamilyToken(carrier) && conjectureCopulaPoliteness(carrier.pos) === null) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, carrierIdx + 1, tokens.length);
  return kaIdx !== null && kaOwnershipKindAt(tokens, kaIdx, lookups) === "question";
}

function matchBeki(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): BekiMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || (t0.pos & POS4) !== 文語助動詞_ベシ) return null;
  if (t0.surface === "べく" && (t0.pos & POS5A) === 連用形_) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return cursor.lookahead(1, canCloseBareBekiBeforeBoundary)
      ? {
        op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
        consumed: 1
      }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (isConjectureAuxToken(t1)) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }

  const bekiDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (bekiDewa?.focusParticle === "wa") {
    const negEnd = matchBekiNegationEnding(tokens, bekiDewa.span.endExclusive, input.lookups);
    if (negEnd !== null) {
      const consumed = bekiDewa.span.endExclusive - pos + negEnd.consumed;
      return {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, consumed),
          "beki",
          "negative",
          negEnd.polite
        ),
        consumed
      };
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchBekiNegationEnding(tokens, pos + 2, input.lookups);
    if (negEnd !== null) {
      return {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, 2 + negEnd.consumed),
          "beki",
          "negative",
          negEnd.polite
        ),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  const obligationOp = (source: OpSource, polite = false): ObligationIdiomOp =>
    buildObligationIdiomOp(source, "beki", "affirmative", polite);

  const bekiCopulaDe = copulaDeMarkerRelationForToken(t1, pos + 1, {
    consumers: ["tail_multi_clause"]
  });
  if (
    bekiCopulaDe !== null &&
    t1pos5A === 連用形_ &&
    isAffirmativeCopulaSupportVerbToken(tokens[pos + 2])
  ) {
    const supported = matchBekiCopulaSupport(input, cursor, pos + 1);
    if (supported !== null) {
      return supported;
    }
  }

  if (bekiRedundantQuoteCopulaBoundaryStartsAt(input, pos + 1)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }

  if (
    (t1pos5A === 終止形_ || t1pos5A === 連用形_) &&
    (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス)
  ) {
    return {
      op: buildObligationIdiomOp(
        srcSlice(tokens, pos, 2),
        "beki",
        "affirmative",
        t1pos4 === 助動詞_デス
      ),
      consumed: 2
    };
  }
  if (cursor.lookahead(1, c => canBekiFeedPredicateQuoteCarrier(c, input.lookups, input))) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (bekiClosesBeforeTypedQuoteBoundary(input, pos + 1)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (t1pos5A === 連体形_ && (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_ジャ || t1pos4 === 助動詞_ヤ)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (cursor.lookahead(1, canCloseBareBekiBeforeBoundary)) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }
  if (
    (t0.pos & POS5A) === 連体形_ &&
    isTerminalParticleToken(t1) &&
    (isTerminalYoSfpSurface(t1) || isTerminalNeSfpSurface(t1)) &&
    remainderIsChainFinalSfpRun(cursor, pos + 1, t0)
  ) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }
  return null;
}

function matchBekiCopulaSupport(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  copulaPos: number
): BekiMatch | null {
  const { tokens, pos } = cursor;
  const match = matchCopulaWithMoodReading(tokens, copulaPos, input.lookups, {
    sourceContext: {
      tokens: input.contextTokens ?? input.tokens,
      index: sourceIndexForInputPosition(input, copulaPos)
    }
  });
  if (match === null || match.consumed < copulaPos - pos + 1) {
    return null;
  }
  const trailing = (match.ops ?? []).filter(op => op !== match.op);
  const consumed = copulaPos - pos + match.consumed;
  if (match.op.polarity === "negative") {
    return match.op.variant === "basic" && trailing.length === 0
      ? {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, consumed),
          "beki",
          "negative",
          match.op.polite
        ),
        consumed
      }
      : null;
  }
  const negationIdx = copulaPos + match.consumed;
  const negation = tokens[negationIdx];
  if (
    negation !== undefined &&
    trailing.length === 0 &&
    match.op.variant === "basic" &&
    isNegationToken(negation, tokens[negationIdx + 1]) &&
    !isObligationSpanStartingAtToken(tokens, negationIdx)
  ) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, consumed + 1), "beki", "negative", false),
      consumed: consumed + 1
    };
  }
  if (trailing.length > 0) {
    if (match.op.variant !== "basic") {
      return null;
    }
    const op = buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki");
    return { op, ops: [op, ...trailing], consumed };
  }
  if (match.op.variant === "basic") {
    return { op: buildObligationIdiomOp(srcSlice(tokens, pos, consumed), "beki"), consumed };
  }
  if (match.op.variant === "conjecture") {
    const op = buildObligationIdiomOp(srcSlice(tokens, pos, copulaPos - pos + 1), "beki");
    const conjecture = buildConjectureOp(
      srcSlice(tokens, copulaPos + 1, consumed - (copulaPos - pos + 1)),
      false
    );
    return { op, ops: [op, conjecture], consumed };
  }
  return null;
}

export function matchBekiAtCursor(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly op: ObligationIdiomOp; readonly ops?: readonly AuxOpNode[] } | null {
  const match = matchBeki(input, cursor);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops })
  };
}

function bekiRedundantQuoteCopulaBoundaryStartsAt(
  input: ParseInput,
  copulaPos: number
): boolean {
  const copula = input.tokens[copulaPos];
  if (!isRedundantPredicateQuoteCopula(copula)) {
    return false;
  }
  const quotePos = copulaPos + 1;
  const quote = input.tokens[quotePos];
  if (quote === undefined) {
    return false;
  }

  const startIndex = sourceIndexForInputPosition(input, copulaPos);
  const endIndex = sourceIndexForInputPosition(input, quotePos);
  const hint = input.outgoingBoundaryHint;
  if (
    hint !== undefined &&
    hint.quoteBoundary !== undefined &&
    hint.tokenSpan.start === startIndex &&
    hint.tokenSpan.end === endIndex
  ) {
    return true;
  }

  const relation = quoteStructuralRelationStartingAt(contextCursorForInputPosition(input, copulaPos), input.lookups);
  const markerSpan = relation === undefined
    ? null
    : quoteConsumedMarkerSpanFromRelation(input.tokens, relation, input.lookups);
  return relation !== undefined &&
    relation.quote.slotKind === "quoted_content" &&
    markerSpan !== null &&
    markerSpan.start === copulaPos &&
    markerSpan.endExclusive - 1 === quotePos;
}

function bekiClosesBeforeTypedQuoteBoundary(
  input: ParseInput,
  boundaryPos: number
): boolean {
  const hint = input.outgoingBoundaryHint;
  if (hint === undefined || input.tokens[boundaryPos] === undefined) {
    return false;
  }
  if (hint.tokenSpan.start !== sourceIndexForInputPosition(input, boundaryPos)) {
    return false;
  }
  return hint.quoteBoundary !== undefined ||
    (hint.connectiveKind === "predicate_projection_quote_attributive" && hint.attributiveBoundary !== undefined);
}

function canBekiFeedPredicateQuoteCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  input?: ParseInput
): boolean {
  const { tokens, pos } = cursor;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return false;
  }
  const carrier = tokens[quoteMarker.span.endExclusive];
  if (carrier === undefined) {
    return false;
  }
  const after = quoteMarker.span.endExclusive + 1;
  return predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input) !== null &&
    cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups));
}

function isConjectureAuxToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const pos5A = token.pos & POS5A;
  return pos5A === 意志推量形_ &&
    (pos4 === 助動詞_ダ || pos4 === 助動詞_デス || pos4 === 助動詞_ヤ);
}

export function matchForbidden(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  precedingOps: readonly AuxOpNode[]
): ForbiddenIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null || teHead.focusParticle !== "は") {
    return null;
  }
  const predicate = matchProhibitionPredicateAt(tokens, pos + teHead.consumed, {
    hostCannotHostDirectionalIku: stemSourceCannotHostDirectionalIku(stem, precedingOps)
  });
  if (predicate === null) {
    return null;
  }
  const consumed = teHead.consumed + predicate.consumed;
  cursor.advance(consumed);
  return buildForbiddenIdiomOp(
    srcSlice(tokens, pos, consumed),
    forbiddenSourceAllomorphFor(predicate),
    predicate.polite,
    predicate.past
  );
}

function forbiddenSourceAllomorphFor(predicate: ProhibitionPredicateMatch): ForbiddenIdiomOp["sourceAllomorph"] {
  switch (predicate.body) {
    case "dame":
      return "copular_dame";
    case "dialect_verb":
      return "verb_dialect_aku";
    case "verb":
      return predicate.bodyLemma === "いける" ? "verb_ikeru" :
        predicate.bodyLemma === "いく" ? "verb_iku" : "verb_naru";
  }
}

export function buildForbiddenIdiomOp(
  source: OpSource,
  sourceAllomorph: ForbiddenIdiomOp["sourceAllomorph"],
  polite = false,
  past = false
): ForbiddenIdiomOp {
  return createIdiomOp({

    idiom: "forbidden",
    source,
    polarity: "negative",
    polite,
    past,
    sourceAllomorph
  });
}

export function matchNaitoAfterNegativeNounCopula(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  allowElidedNaitoObligation: boolean
): ObligationIdiomOp | null {
  const hasNegativeCopulaOp =
    ops.length === 1 &&
    ops[0]?.kind === "copula" &&
    ops[0].polarity === "negative";
  const hasAffirmativeCopulaExternalNegation =
    ops.length === 2 &&
    ops[0]?.kind === "copula" &&
    ops[0].polarity === "affirmative" &&
    ops[1]?.kind === "negation" &&
    ops[1].chainDepth === 1 &&
    !ops[1].chainPast;
  if (!hasNegativeCopulaOp && !hasAffirmativeCopulaExternalNegation) {
    return null;
  }
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const marker = c.current();
    if (marker === undefined || conditionalToConnectiveRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) === null) {
      return null;
    }
    const bodyPattern: ObligationPattern = {
      variant: "colloquial_naito",
      prefix: [],
      bodyVerbs: ["なる", "成る", "いける", "行ける", "いく", "行く"],
      allowDameBody: true
    };
    c.advance();
    const bodyPolite = matchObligationBody(c, bodyPattern);
    const variant = bodyPolite === null ? "colloquial_naito_elided" : "colloquial_naito";
    if (bodyPolite === null) {
      if (!allowElidedNaitoObligation) return null;
      const nextTok = tokens[pos + 1];
      if (nextTok !== undefined && (nextTok.pos & POS0) !== 補助記号) return null;
    }
    return buildObligationIdiomOp(
      srcSlice(tokens, pos, c.pos - pos),
      variant,
      "affirmative",
      bodyPolite ?? false
    );
  });
}


export function elidedColloquialObligationContextFor(input: ParseInput): ElidedColloquialObligationContext {
  return normalizeElidedColloquialObligationContext(
    input.allowElidedColloquialObligation ??
    input.allowElidedNaitoObligation ??
    true
  );
}

interface StemHostedSuppletiveObligation {
  readonly op: AuxOpNode;
  readonly cursorStart: number;
  readonly stem: StemInput;
}

export function matchStemHostedSuppletiveObligation(
  input: ParseInput,
  stemTok: RuntimeHaruToken
): StemHostedSuppletiveObligation | null {
  const { tokens, start, stem } = input;
  if (
    !isAdjNai(stemTok) ||
    (stemTok.pos & POS5A) !== 仮定形_ ||
    (stem.kind !== "adj" && stem.kind !== "verb")
  ) {
    return null;
  }
  const affirmativeLemma = input.lookups.SUPPLETIVE_AFFIRMATIVE_KOREAN_LEMMAS.get(stemTok.dictionaryForm);
  if (affirmativeLemma === undefined || !hasExistentialArgumentMarkerBefore(input, start)) {
    return null;
  }
  const cursor = new TokenCursor(tokens, start);
  const op = tryMatchObligation(cursor, "none");
  if (op === null) {
    return null;
  }
  return {
    op,
    cursorStart: cursor.pos,
    stem: { ...stem, lemma: affirmativeLemma, irregular: null, commitment: "resolved_sense" }
  };
}

function hasExistentialArgumentMarkerBefore(input: ParseInput, start: number): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  const markerIdx = previousNonSpaceIndex(contextTokens, sourceIndexForInputPosition(input, start));
  if (markerIdx === null) {
    return false;
  }
  const marker = contextTokens[markerIdx];
  const isExistentialMarker = caseParticleMarkerRelationForToken(marker, markerIdx, {
    acceptedSurfaces: ["が", "に"],
    consumers: ["tail_multi_clause"]
  }) !== null ||
    topicFocusMarkerRelationForToken(marker, markerIdx, { consumers: ["tail_multi_clause"] }) !== null;
  return isExistentialMarker &&
    getArgumentNounBeforeParticle(
      contextTokens,
      existentialArgumentNounQueryIndex(contextTokens, markerIdx),
      input.lookups
    ) !== null;
}

function existentialArgumentNounQueryIndex(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): number {
  const closeIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (closeIdx === null) {
    return markerIdx;
  }
  return parentheticalSpanEndingAt(tokens, closeIdx) === null ? markerIdx : closeIdx;
}
