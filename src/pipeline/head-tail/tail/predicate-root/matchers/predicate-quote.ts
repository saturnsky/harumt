import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { QuoteMarkerRelation } from "../../../boundary/relation.js";
import type { ClauseBoundary } from "../commit.js";
import { classifyDatteMarkerAt, toiuAttributiveContinuationHeadIndex, toiuIuStandsAsAttributiveCarrier } from "../../../../semantics/marker-roles.js";
import { isAdjNai } from "../../../../matchers.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { quoteClauseBoundaryFromRelation, quoteBoundarySurfaceFromRelation, buildQuoteConnectiveOpFromBoundary, quoteConsumedMarkerSpanFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteStructuralRelationAt, quoteStructuralRelationStartingAt } from "../../../../structural-relation/quote.js";
import { adverbialToCapableKeijoujiHost, tariKeijoujiAdverbialToEvidence } from "../../../../semantics/tari-adverbial-marker.js";
import { quoteFocusMarkerStartingAt } from "../../segments/quote-focus.js";
import { tosuruConstructionModeForToken, tosuruResultativeMakeYieldsToAttributiveQuoteHead } from "../tosuru-construction-mode.js";
import { conditionalToConnectiveRelationAt, dewaScopeBridgeRelationAt, questionContentContinuationAfterKaRelationAt, topicFocusMarkerRelationForToken } from "../../../boundary/marker.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { utteranceClosureAfter, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { isTeFormPredicateHeadToken } from "../../../../quote/prohibitive-request.js";
import { quoteMarkerRelationAt, tokaQuoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../../../boundary/quote-marker.js";
import { hasRealContentAfterIndex, isBoundaryPunctuationToken, isHardTerminalPunctuationToken } from "../../../boundary/punctuation.js";
import { matchTeConnectiveHeadAt } from "../../postverb-tail-classifier.js";
import type { AuxOpNode, OpSource, PredicateQuoteCarrierOp, SfpNode, QuotedPropositionMood, ConnectiveOp } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { isTeAuxActivationAccepted } from "../postverb-auxiliary-parser.js";
import { srcSlice } from "../source.js";
import { isSuruVerbToken, isWakeNounToken } from "../classifiers/tokens.js";
import { isSayVerbToken } from "../../../data/quoted-reporting-sets.js";
import { matchTameConnectiveAt } from "./tame-connective.js";
import { matchPredicateProjectionConnectiveAt } from "./predicate-projection-connective.js";
import { matchCompositeConnectiveAt } from "./connective.js";
import { matchScopeBridge } from "./scope-bridge.js";
import { POS0, POS01, pos0in, POS1, POS4, POS5A, PUNCTUATION_BITS, 意志推量形_, 仮定形_, 格助詞, 係助詞, isPastAuxiliaryPos, isTerminalOrAttributiveInflection, isImperativeInflection, 終止形_, 助詞, 助詞_終助詞, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_タイ, 助動詞_ナイ, 助動詞_マス, 接続助詞, 動詞, 未然形_, 命令形_, 連体形_, 連用形_, 助詞_接続助詞 } from "../../../../../types/pos.js";
import { createConnectiveOp, createPredicateQuoteCarrierOp } from "../op-builders.js";
import { classifyAux } from "../parser.js";
import { matchWakeImpossibleIdiom } from "./lexical-idioms.js";
import { wakeExplanatoryCopulaPolite, wakeExplanatoryCopulaConjecture } from "./modal-tail.js";
import { TERMINAL_SFP_RUN_BRIDGE_LIMIT, matchTerminalSfpArbitration, opsCanAcceptTerminalSfp } from "./terminal-sfp.js";
import { quotedPropositionMood } from "../quote-tail-context.js";
import { matchYouda } from "./likeness-modal.js";
import { terminalDiscourseSfpRunClosesUtterance } from "../parse-closure.js";
import { sourceIndexForInputPosition, contextAlignedPosition, contextCursorForInputPosition } from "../parse-coordinates.js";
import { opLastSourceToken } from "../parse-stem.js";
import { matchTeConnectiveHead } from "./te-host.js";

interface PredicateQuoteCarrierOptions {
  readonly allowTerminalBareTo?: boolean;
  readonly allowTerminalToka?: boolean;
  readonly quotedPropositionClosedBySfp?: boolean;
}

interface PredicateQuoteCarrierContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
  readonly hostStem: RuntimeHaruToken | undefined;
  readonly previousOps: readonly AuxOpNode[];
  readonly input: ParseInput | undefined;
  readonly options: PredicateQuoteCarrierOptions;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly pos: number;
  readonly n: number;
  readonly carrierMood: QuotedPropositionMood;
  readonly moodPayload: Pick<PredicateQuoteCarrierOp, "quotedMood">;
  readonly withTosuruMode: (
    op: PredicateQuoteCarrierOp,
    carrier: RuntimeHaruToken,
    after: number
  ) => PredicateQuoteCarrierOp;
  readonly atSourceTerminal: (endExclusive: number) => boolean;
}

export function matchPredicateQuoteCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  hostStem?: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[] = [],
  input?: ParseInput,
  options: PredicateQuoteCarrierOptions = {}
): PredicateQuoteCarrierOp | null {
  const { tokens, pos, end: n } = cursor;
  const carrierMood = quotedPropositionMood(hostStem, previousOps);
  const moodPayload = quotedMoodPayload(carrierMood);
  const withTosuruMode = (
    op: PredicateQuoteCarrierOp,
    carrier: RuntimeHaruToken,
    after: number
  ): PredicateQuoteCarrierOp => {
    if (op.style !== "suru_attributive" || hostStem === undefined) {
      return op;
    }
    const mode = tosuruConstructionModeForToken(hostStem);
    const effectiveMode = mode === "resultative_make" &&
      tosuruResultativeMakeYieldsToAttributiveQuoteHead(carrier, tokens[after])
      ? "quote"
      : mode;
    return { ...op, tosuruMode: effectiveMode };
  };
  const atSourceTerminal = (endExclusive: number): boolean => {
    const contextTokens = input?.contextTokens ?? input?.tokens;
    return contextTokens !== undefined &&
      !hasRealContentAfterIndex(
        contextTokens,
        sourceIndexForInputPosition(input!, endExclusive),
        { stopAtHardTerminal: true }
      );
  };
  const quote = tokens[pos];
  const qc: PredicateQuoteCarrierContext = {
    cursor,
    lookups,
    hostStem,
    previousOps,
    input,
    options,
    tokens,
    pos,
    n,
    carrierMood,
    moodPayload,
    withTosuruMode,
    atSourceTerminal
  };
  const redundantCopula = matchRedundantCopulaQuoteCarrier(qc, quote);
  if (redundantCopula !== null) return redundantCopula;
  const questionQuote = matchQuestionQuoteCarrier(qc);
  if (questionQuote !== null) return questionQuote;
  if (
    quote !== undefined &&
    quote.surface === "だって" &&
    (quote.pos & POS0) === 助詞
  ) {
    return matchDatteQuoteCarrier(qc, quote);
  }
  const terminalToka = matchTerminalTokaQuoteCarrier(qc);
  if (terminalToka !== null) return terminalToka;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return null;
  }
  const carrier = tokens[quoteMarker.span.endExclusive];
  const contextTokens = input?.contextTokens ?? input?.tokens;
  const sourceTerminal = contextTokens !== undefined &&
    !hasRealContentAfterIndex(
      contextTokens,
      sourceIndexForInputPosition(input!, quoteMarker.span.endExclusive),
      { stopAtHardTerminal: true }
    );
  const markerClosesSlice = carrier === undefined || sourceTerminal;
  if (markerClosesSlice) {
    return matchHostElidedTerminalQuoteCarrier(qc, quoteMarker, carrier, sourceTerminal);
  }
  if (isNonQuoteToSuruContext(tokens, pos, carrier)) {
    return null;
  }
  if (
    quoteMarker.canonicalSurface === "って" &&
    isWakeNounToken(carrier) &&
    cursor.lookahead(quoteMarker.span.endExclusive - pos, c => predicateQuoteCarrierCanContinue(c, lookups))
  ) {
    cursor.advance(quoteMarker.span.endExclusive - pos);
    return buildPredicateQuoteCarrierOp(
      srcSlice(tokens, pos, quoteMarker.span.endExclusive - pos),
      "compact_toiu",
      quoteMarker.surface,
      moodPayload
    );
  }
  const after = quoteMarker.span.endExclusive + 1;
  const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
  if (style === null) {
    return null;
  }
  if (!cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
    return null;
  }
  cursor.advance(after - pos);
  return withTosuruMode(buildPredicateQuoteCarrierOp(
    srcSlice(tokens, pos, after - pos),
    style,
    `${quoteMarker.surface}${carrier.surface}`,
    moodPayload
  ), carrier, after);
}

function matchRedundantCopulaQuoteCarrier(
  qc: PredicateQuoteCarrierContext,
  quote: RuntimeHaruToken | undefined
): PredicateQuoteCarrierOp | null {
  const { cursor, lookups, input, tokens, pos, moodPayload, withTosuruMode } = qc;
  if (isRedundantPredicateQuoteCopula(quote)) {
    const carrier = tokens[pos + 2];
    const actualQuoteMarker = quoteMarkerRelationAt(tokens, pos + 1, {
      consumers: ["tail_multi_clause"]
    });
    if (
      actualQuoteMarker?.canonicalSurface === "と" &&
      carrier !== undefined
    ) {
      const after = pos + 3;
      const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
      if (style !== null && cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
        cursor.advance(3);
        return withTosuruMode(buildPredicateQuoteCarrierOp(
          srcSlice(tokens, pos, 3),
          style,
          `${quote.surface}${actualQuoteMarker.surface}${carrier.surface}`,
          moodPayload
        ), carrier, after);
      }
    }
  }
  return null;
}

function matchQuestionQuoteCarrier(qc: PredicateQuoteCarrierContext): PredicateQuoteCarrierOp | null {
  const { cursor, lookups, hostStem, previousOps, input, tokens, pos, n } = qc;
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: n
  });
  const lastPreviousOp = previousOps.at(-1);
  const followsNodaQuestionContent = lastPreviousOp?.kind === "modal" && lastPreviousOp.modal === "noda";
  if (questionQuote?.continuationKind === "question_quote_marker" && !followsNodaQuestionContent) {
    const carrier = tokens[questionQuote.span.endExclusive];
    if (
      carrier !== undefined &&
      predicateQuoteCarrierStyle(cursor, carrier, questionQuote.span.endExclusive + 1, lookups, input) === "compact_toiu"
    ) {
      const after = questionQuote.span.endExclusive + 1;
      if (cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
        cursor.advance(after - pos);
        return buildPredicateQuoteCarrierOp(
          srcSlice(tokens, pos, after - pos),
          "question_toiu",
          `${questionQuote.surface}${carrier.surface}`,
          quotedMoodPayload(quotedPropositionMood(hostStem, previousOps, null, true))
        );
      }
    }
  }
  return null;
}

function matchDatteQuoteCarrier(
  qc: PredicateQuoteCarrierContext,
  quote: RuntimeHaruToken
): PredicateQuoteCarrierOp | null {
  const { cursor, lookups, previousOps, input, tokens, pos, moodPayload, withTosuruMode, atSourceTerminal } = qc;
  const carrier = tokens[pos + 1];
  const datteTerminalSfpRunCloses = carrier !== undefined &&
    input !== undefined &&
    terminalDiscourseSfpRunClosesUtterance(cursor, input, 1);
  if (
    (carrier === undefined || datteTerminalSfpRunCloses) &&
    atSourceTerminal(pos + 1) &&
    classifyDatteMarkerAt(cursor, lookups, {
      terminalBoundary: true,
      ...(previousOps.at(-1)?.kind === "aspect" &&
        (previousOps.at(-1) as { aspect?: string }).aspect !== undefined &&
        ((previousOps.at(-1) as { aspect?: string }).aspect === "te_kudasai" ||
          (previousOps.at(-1) as { aspect?: string }).aspect === "te_kure_tanomu")
        ? { precedingRequestAspect: (previousOps.at(-1) as { aspect: "te_kudasai" | "te_kure_tanomu" }).aspect }
        : {})
    }).role === "hearsay_terminal"
  ) {
    cursor.advance(1);
    return buildPredicateQuoteCarrierOp(srcSlice(tokens, pos, 1), "compact_toiu", "だって", {
      sourceTerminal: true,
      ...moodPayload
    });
  }
  if (carrier === undefined) {
    return null;
  }
  const after = pos + 2;
  const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
  if (style === null) {
    return null;
  }
  if (!cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
    return null;
  }
  cursor.advance(2);
  return withTosuruMode(buildPredicateQuoteCarrierOp(
    srcSlice(tokens, pos, 2),
    style,
    `${quote.surface}${carrier.surface}`,
    moodPayload
  ), carrier, after);
}

function matchTerminalTokaQuoteCarrier(qc: PredicateQuoteCarrierContext): PredicateQuoteCarrierOp | null {
  const { cursor, previousOps, options, tokens, pos, n, moodPayload, atSourceTerminal } = qc;
  if (options.allowTerminalToka === true) {
    const tokaMarker = tokaTteCompositeQuoteCandidateAt(tokens, pos, {
      consumers: ["tail_multi_clause"]
    }) ?? tokaQuoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
    const closingOpForToka = previousOps.at(-1);
    const tokaQuoteEvidence = tokaMarker?.canonicalSurface === "とかって" ||
      options.quotedPropositionClosedBySfp === true ||
      (closingOpForToka?.kind === "modal" && closingOpForToka.modal === "noda") ||
      (closingOpForToka?.kind === "connective" && closingOpForToka.connective === "adversative");
    if (
      tokaMarker !== null &&
      tokaQuoteEvidence &&
      tokaMarker.span.endExclusive >= n &&
      atSourceTerminal(tokaMarker.span.endExclusive)
    ) {
      cursor.advance(tokaMarker.span.endExclusive - pos);
      return buildPredicateQuoteCarrierOp(
        srcSlice(tokens, pos, tokaMarker.span.endExclusive - pos),
        "compact_toiu",
        tokaMarker.surface,
        { sourceTerminal: true, ...moodPayload }
      );
    }
  }
  return null;
}

function matchHostElidedTerminalQuoteCarrier(
  qc: PredicateQuoteCarrierContext,
  quoteMarker: QuoteMarkerRelation,
  carrier: RuntimeHaruToken | undefined,
  sourceTerminal: boolean
): PredicateQuoteCarrierOp | null {
  const { cursor, hostStem, previousOps, input, options, tokens, pos, carrierMood } = qc;
  const bareTerminalTo = options.allowTerminalBareTo === true &&
    quoteMarker.canonicalSurface === "と";
  const quotedNominalTo = input?.quotedNominalHost === true &&
    quoteMarker.canonicalSurface === "と" &&
    carrier === undefined;
  if (quoteMarker.canonicalSurface === "って" || bareTerminalTo || quotedNominalTo) {
    const imperativeHost = hostStem !== undefined && isImperativeInflection(hostStem.pos);
    if (imperativeHost && input?.quoteAttributiveHeadFrame === undefined && !quotedNominalTo) {
      return null;
    }
    if (bareTerminalTo && !quotedNominalTo && !sourceTerminal) {
      return null;
    }
    if (
      bareTerminalTo &&
      !quotedNominalTo &&
      !quotedPropositionMoodExcludesConditional(
        tokens,
        pos,
        previousOps,
        options.quotedPropositionClosedBySfp === true
      )
    ) {
      return null;
    }
    cursor.advance(quoteMarker.span.endExclusive - pos);
    return buildPredicateQuoteCarrierOp(
      srcSlice(tokens, pos, quoteMarker.span.endExclusive - pos),
      "compact_toiu",
      quoteMarker.surface,
      {
        ...(sourceTerminal ? { sourceTerminal: true } : {}),
        ...quotedMoodPayload(carrierMood),
        ...(carrierMood === "volitional" &&
          !sourceTerminal &&
          quoteMarker.canonicalSurface === "って" &&
          input?.quoteAttributiveHeadFrame?.bareQuoteVolitionalContentFlavor !== undefined
          ? { volitionalContentAttributive: input.quoteAttributiveHeadFrame.bareQuoteVolitionalContentFlavor }
          : {})
      }
    );
  }
  return null;
}

export function matchTerminalPastQuoteAllomorphCarrier(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): PredicateQuoteCarrierOp | null {
  const { tokens, pos, end: n } = cursor;
  const te = tokens[pos];
  if (te === undefined || te.surface !== "て" || (te.pos & POS01) !== 助詞_接続助詞) {
    return null;
  }
  const lastOp = ops[ops.length - 1];
  if (lastOp?.kind !== "tense" || lastOp.tense !== "past") {
    return null;
  }
  const pastToken = lastOp.source.tokens[lastOp.source.tokens.length - 1];
  if (
    pastToken === undefined ||
    !isPastAuxiliaryPos(pastToken.pos) ||
    !isTerminalOrAttributiveInflection(pastToken.pos)
  ) {
    return null;
  }
  if (pos + 1 < n && !terminalDiscourseSfpRunClosesUtterance(cursor, input, 1)) {
    return null;
  }
  cursor.advance(1);
  return buildPredicateQuoteCarrierOp(srcSlice(tokens, pos, 1), "compact_toiu", "って", {
    sourceTerminal: true,
    ...quotedMoodPayload(quotedPropositionMood(undefined, ops))
  });
}

export function buildPredicateQuoteCarrierOp(
  source: OpSource,
  style: PredicateQuoteCarrierOp["style"],
  surface: string,
  options: Pick<PredicateQuoteCarrierOp, "quotedMood" | "tosuruMode" | "sourceTerminal" | "volitionalContentAttributive"> = {}
): PredicateQuoteCarrierOp {
  return createPredicateQuoteCarrierOp({ style, surface, source, ...options });
}

export function predicateQuoteCarrierStyle(
  cursor: TokenCursor<RuntimeHaruToken>,
  carrier: RuntimeHaruToken,
  after: number,
  lookups: LookupTables,
  input?: ParseInput
): PredicateQuoteCarrierOp["style"] | null {
  const { tokens, end: n } = cursor;
  const form5A = carrier.pos & POS5A;
  if (form5A === 連体形_) {
    if (isSayVerbToken(carrier)) {
      return "compact_toiu";
    }
    if (isSuruVerbToken(carrier)) {
      return "suru_attributive";
    }
  }
  if (isSayVerbToken(carrier) && after - 1 >= cursor.pos) {
    const context = input === undefined
      ? { tokens, index: after - 1 }
      : contextAlignedPosition(input, cursor, after - 1);
    if (context.tokens[context.index] === carrier && toiuIuStandsAsAttributiveCarrier(context.tokens, context.index)) {
      return "compact_toiu";
    }
  }
  if (isSuruVerbToken(carrier) && form5A === 連用形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 未然形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 仮定形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 意志推量形_) {
    return "suru_attributive";
  }
  if (
    (carrier.pos & POS0) === 動詞 &&
    carrier.dictionaryForm === "なる" &&
    isTeAuxActivationAccepted(carrier, tokens[after])
  ) {
    return "naru_result";
  }
  if (
    isSuruVerbToken(carrier) &&
    form5A === 終止形_ &&
    (after >= n ||
      cursor.lookahead(after - cursor.pos, c => predicateQuoteCarrierStartsAt(c, lookups)) ||
      suruHostClauseContinuationFollows(tokens, after))
  ) {
    return "suru_attributive";
  }
  return null;
}

function suruHostClauseContinuationFollows(
  tokens: readonly RuntimeHaruToken[],
  after: number
): boolean {
  const next = tokens[after];
  if (next === undefined) {
    return false;
  }
  if ((next.pos & POS0) === 助詞) {
    const pos1 = next.pos & POS1;
    return pos1 === 接続助詞 || pos1 === 格助詞 || pos1 === 係助詞;
  }
  return classifyAux(next, tokens[after + 1]).classifications.includes("connective");
}

export function predicateQuoteCarrierStartsAt(
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
  if (carrier === undefined || isNonQuoteToSuruContext(tokens, pos, carrier)) {
    return false;
  }
  const after = quoteMarker.span.endExclusive + 1;
  return predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input) !== null &&
    cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups));
}

function isNonQuoteToSuruContext(
  tokens: readonly RuntimeHaruToken[],
  quoteIdx: number,
  carrier: RuntimeHaruToken
): boolean {
  if (!isSuruVerbToken(carrier)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, quoteIdx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev !== undefined && (prev.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return adverbialToCapableKeijoujiHost(prev);
}

export function predicateQuoteCarrierCanContinue(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos, end: n } = cursor;
  if (pos >= n) {
    return true;
  }
  const teMo = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (teMo !== null && (teMo.surface === "ても" || teMo.surface === "でも")) {
    return true;
  }
  if (matchTeConnectiveHeadAt(tokens, pos) !== null) {
    return true;
  }
  if (matchTameConnectiveAt(tokens, pos, { requireEnd: true, lookups }) !== null) {
    return true;
  }
  if (matchToConditionalConnective(cursor) !== null) {
    return true;
  }
  if (predicateQuoteCarrierStartsAt(cursor, lookups)) {
    return true;
  }
  const modalStemIdx = previousNonSpaceIndex(tokens, pos);
  const modalStem = (modalStemIdx === null ? undefined : tokens[modalStemIdx]) ?? tokens[pos]!;
  if (cursor.lookahead(0, c => matchYouda(c, modalStem)) !== null) {
    return true;
  }
  if (classifyAux(tokens[pos]!, tokens[pos + 1]).classifications.length > 0) {
    return true;
  }
  if (cursor.lookahead(0, matchScopeBridge) !== null) {
    return true;
  }
  if (toiuAttributiveContinuationHeadIndex(tokens, pos, n) !== null) {
    return true;
  }
  if (cursor.lookahead(0, matchWakeImpossibleIdiom) !== null) {
    return true;
  }
  if (wakeExplanatoryCopulaPolite(tokens[pos], tokens[pos + 1]) !== null) {
    return true;
  }
  if (wakeExplanatoryCopulaConjecture(tokens[pos], tokens[pos + 1]) !== null) {
    return true;
  }
  return matchPredicateProjectionConnectiveAt(tokens, pos, { requireEnd: true, lookups }) !== null;
}

export function isRedundantPredicateQuoteCopula(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    token.surface === "だ" &&
    (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 終止形_);
}

export function matchToConditionalConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (
    t0 === undefined ||
    (t0.pos & POS0) !== 助詞 ||
    ((t0.pos & POS1) !== 格助詞 && (t0.pos & POS1) !== 接続助詞)
  ) return null;
  if (conditionalToConnectiveRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) === null) return null;
  const t1 = cursor.peek(1);
  if (t1 !== undefined) return null;
  cursor.advance(1);
  return createConnectiveOp({

    connective: "conditional",
    surface: "と",
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchElidedHostCommandQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens, pos } = cursor;
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined
  ) {
    return null;
  }
  if (!quotedPropositionMoodIsDirective(tokens, pos, previousOps)) {
    return null;
  }
  cursor.advance(1);
  return buildElidedHostCommandQuotativeOp(srcSlice(tokens, pos, 1));
}

function quotedPropositionMoodExcludesConditional(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousOps: readonly AuxOpNode[],
  closedByTerminalSfp = false
): boolean {
  if (closedByTerminalSfp) {
    return true;
  }
  const closing = previousOps.at(-1);
  if (closing?.kind === "modal" && closing.modal === "noda") {
    return true;
  }
  if (closing?.kind === "idiom" && closing.idiom === "obligation" && closing.variant === "beki") {
    return true;
  }
  if (closing?.kind === "connective" && closing.connective === "adversative") {
    return true;
  }
  if (closing?.kind === "connective" && closing.connective === "te_form") {
    return true;
  }
  const prev = tokens[markerPos - 1];
  if (prev === undefined) {
    return false;
  }
  const aux = prev.pos & POS4;
  if (aux === 助動詞_タ || aux === 助動詞_タイ) {
    return true;
  }
  const form = prev.pos & POS5A;
  return form === 意志推量形_ || form === 命令形_;
}

export function quotedMoodPayload(
  mood: QuotedPropositionMood
): Pick<PredicateQuoteCarrierOp, "quotedMood"> {
  return mood === "declarative" ? {} : { quotedMood: mood };
}

export function absorbBareTeDirectiveIntoCarrier(
  ops: AuxOpNode[],
  carrier: PredicateQuoteCarrierOp,
  hostStem?: RuntimeHaruToken
): PredicateQuoteCarrierOp {
  if (carrier.sourceTerminal !== true) {
    return carrier;
  }
  const last = ops.at(-1);
  if (last?.kind !== "connective" || last.connective !== "te_form") {
    return carrier;
  }
  if (carrier.surface !== "と" && carrier.quotedSfp === undefined) {
    return carrier;
  }
  if (chainCarriesRequestOrProhibitionAspect(ops)) {
    return carrier;
  }
  const teHead = ops.at(-2) === undefined
    ? hostStem
    : opLastSourceToken(ops[ops.length - 2]!) ?? hostStem;
  if (!isTeFormPredicateHeadToken(teHead)) {
    return carrier;
  }
  ops.pop();
  return {
    ...carrier,
    quotedMood: "imperative",
    ...(carrier.quotedSfp === undefined ? {} : { quotedChainMood: "imperative" as const }),
    source: {
      tokens: [...last.source.tokens, ...carrier.source.tokens],
      tokenIndices: [...last.source.tokenIndices, ...carrier.source.tokenIndices]
    }
  };
}

function chainCarriesRequestOrProhibitionAspect(previousOps: readonly AuxOpNode[]): boolean {
  return previousOps.some((op) =>
    op.kind === "aspect" &&
    (op.aspect === "te_kudasai" ||
      op.aspect === "te_kure_tanomu" ||
      op.aspect === "naide_kudasai"));
}

function quotedPropositionMoodIsDirective(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousOps: readonly AuxOpNode[]
): boolean {
  const requestMood = previousOps.some((op) =>
    op.kind === "aspect" &&
    (op.aspect === "te_kudasai" ||
      op.aspect === "te_kure_tanomu" ||
      op.aspect === "naide_kudasai")
  );
  return requestMood || ((tokens[markerPos - 1]?.pos ?? 0) & POS5A) === 命令形_;
}

export function buildElidedHostCommandQuotativeOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "と",
    quotativeMood: "imperative",
    source
  });
}

export function buildHostlessQuotativeClosureOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "と",
    quotativeClosure: "hostless_source_terminal",
    source
  });
}

export function matchElidedHostPoliteVolitionalQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined
  ) {
    return null;
  }
  const lastOp = previousOps.at(-1);
  if (
    lastOp?.kind !== "polite" ||
    ((opLastSourceToken(lastOp)?.pos ?? 0) & (POS4 | POS5A)) !== (助動詞_マス | 意志推量形_)
  ) {
    return null;
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 1, contextTokens.length);
  if (nextIdx !== null && !isBoundaryPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

export function matchElidedHostPoliteCopulaQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    cursor.peek(1) !== undefined ||
    previousOps[0]?.kind !== "copula" ||
    !previousOps.some((op) => op.kind === "polite")
  ) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

export function matchElidedHostConditionalQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  const conditional = previousOps.at(-1);
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined ||
    !(
      (conditional?.kind === "connective" && conditional.connective === "conditional") ||
      (conditional?.kind === "copula" && conditional.variant === "conditional_nara")
    )
  ) {
    return null;
  }
  if (
    conditional?.kind === "connective" &&
    conditional.conditionalQuoteEllipsis === "prohibitive_concern"
  ) {
    return null;
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 1, contextTokens.length);
  if (nextIdx !== null && !isHardTerminalPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

export function matchElidedHostQuoteFocusEvenConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  const focus = dewaScopeBridgeRelationAt(cursor.tokens, cursor.pos + 1, {
    consumers: ["tail_multi_clause"]
  });
  if (focus === null || focus.focusParticle !== "mo") {
    return null;
  }
  for (let offset = 3; cursor.peek(offset) !== undefined; offset += 1) {
    const rest = cursor.peek(offset)!;
    if (!pos0in(rest.pos, PUNCTUATION_BITS)) {
      return null;
    }
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 3, contextTokens.length);
  if (nextIdx !== null && !isHardTerminalPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(3);
  return {
    ...buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 3, 3)),
    quoteBoundary: {
      koreanClauseForm: "다고",
      requestTailKind: null,
      focusParticle: "でも"
    }
  };
}

const ELIDED_HOST_EXCLAMATIVE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close"
]);

export function matchElidedHostQuoteTopicExclamativeSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  const marker = cursor.current();
  if (
    !opsCanAcceptTerminalSfp(ops) ||
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    quotedPropositionMoodIsDirective(cursor.tokens, cursor.pos, ops)
  ) {
    return null;
  }
  if (topicFocusMarkerRelationForToken(cursor.peek(1), cursor.pos + 1, {
    acceptedSurfaces: ["は"],
    acceptedParticleSubtypes: [係助詞],
    consumers: ["tail_multi_clause"]
  }) === null) {
    return null;
  }
  let consumed = 2;
  while (((cursor.peek(consumed)?.pos ?? 0) & POS01) === 助詞_終助詞) {
    consumed += 1;
  }
  for (let offset = consumed; cursor.peek(offset) !== undefined; offset += 1) {
    const rest = cursor.peek(offset)!;
    if (!pos0in(rest.pos, PUNCTUATION_BITS)) {
      return null;
    }
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  if (!ELIDED_HOST_EXCLAMATIVE_CLOSURES.has(
    utteranceClosureAfter(activeProtoLayout(), contextTokens, contextCursor.pos + consumed).closure
  )) {
    return null;
  }
  const source = srcSlice(cursor.tokens, cursor.pos, consumed);
  cursor.advance(consumed);
  return {
    effect: "quotative_topic_excl",
    surface: "とは",
    consumed,
    repeatCount: 1,
    source
  };
}

export function matchBareTteQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens, pos } = cursor;
  const marker = quoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "って") return null;
  if (cursor.peek(1) !== undefined) return null;
  if (!hasRealContentAfterIndex(tokens, marker.span.endExclusive)) return null;
  cursor.advance(marker.span.endExclusive - pos);
  return createConnectiveOp({

    connective: "quotative",
    surface: marker.surface,
    source: srcSlice(tokens, pos, marker.span.endExclusive - pos)
  });
}

export function isContractedNegativeConditionalToken(token: RuntimeHaruToken): boolean {
  return (token.surface === "なけりゃ" || token.surface === "なきゃ") &&
    (token.pos & POS5A) === 仮定形_ &&
    (
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) ||
      isAdjNai(token)
    );
}

export function matchQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const tokens = input.tokens;
  const pos = cursor.pos;
  const contextCursor = contextCursorForInputPosition(input, pos);
  const contextTokens = contextCursor.tokens;
  const relation = quoteStructuralRelationStartingAt(contextCursor, input.lookups);
  if (
    relation === undefined ||
    (relation.quote.slotKind !== "quoted_content" && relation.quote.slotKind !== "request_content")
  ) return null;
  const boundary = quoteClauseBoundaryFromRelation(contextTokens, relation, input.lookups);
  const markerSpan = quoteConsumedMarkerSpanFromRelation(contextTokens, relation, input.lookups);
  const surface = quoteBoundarySurfaceFromRelation(contextTokens, relation, input.lookups);
  const sourcePos = sourceIndexForInputPosition(input, pos);
  if (
    boundary === null ||
    boundary.kind === "terminal" ||
    markerSpan === null ||
    markerSpan.start !== sourcePos ||
    surface === null
  ) return null;
  if (tariKeijoujiAdverbialToEvidence(contextCursorForInputPosition(input, pos), {
    allowProtoFollowingPredicateEvidence: true,
    lookups: input.lookups
  }) !== null) {
    return null;
  }
  cursor.advance(markerSpan.endExclusive - markerSpan.start);
  return buildQuoteConnectiveOpFromBoundary(
    srcSlice(tokens, pos, markerSpan.endExclusive - markerSpan.start),
    boundary,
    "quotative"
  );
}

export function matchBareTeRequestQuoteConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null || teHead.focusParticle !== undefined || teHead.consumed !== 1) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, pos + teHead.consumed, cursor.end);
  if (markerIdx === null) {
    return null;
  }
  const boundary = quoteRequestComplementBoundaryForInput(input, markerIdx);
  if (boundary === null) {
    return null;
  }
  const markerSourceIdx = sourceIndexForInputPosition(input, markerIdx);
  if (boundary.tokenSpan.start !== markerSourceIdx) {
    return null;
  }
  const markerTokenCount = boundary.tokenSpan.end - boundary.tokenSpan.start + 1;
  const consumed = markerIdx - pos + markerTokenCount;
  cursor.advance(consumed);
  return buildQuoteConnectiveOpFromBoundary(srcSlice(tokens, pos, consumed), boundary);
}

export function matchQuoteFocusQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  if (!ops.some((op) => op.kind === "modal" && op.modal === "youda")) {
    return null;
  }
  const frame = quoteFocusMarkerStartingAt(cursor);
  if (frame === null) {
    return null;
  }
  cursor.advance();
  return createConnectiveOp({

    connective: "quotative",
    surface: "と",
    source: srcSlice(cursor.tokens, frame.quoteIdx, 1)
  });
}

export function matchQuestionQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: tokens.length
  });
  if (questionQuote?.continuationKind !== "question_quote_marker") return null;
  if (tokens[questionQuote.span.endExclusive] !== undefined) return null;
  cursor.advance(questionQuote.span.endExclusive - pos);
  return createConnectiveOp({

    connective: "question_quotative",
    surface: questionQuote.surface,
    source: srcSlice(tokens, pos, questionQuote.span.endExclusive - pos)
  });
}

export function quoteRequestComplementBoundaryForInput(
  input: ParseInput,
  inputPos: number
): Exclude<ClauseBoundary, { readonly kind: "terminal" }> | null {
  const cursor = contextCursorForInputPosition(input, inputPos);
  const relation = quoteStructuralRelationStartingAt(cursor, input.lookups);
  if (relation === undefined || relation.quote.slotKind !== "request_content") {
    return null;
  }
  const boundary = quoteClauseBoundaryFromRelation(cursor.tokens, relation, input.lookups);
  if (boundary?.kind !== "接続助詞" || boundary.connectiveKind !== "request_complement") {
    return null;
  }
  return boundary;
}

export function matchSfpBridgedQuoteCarrier(
  input: ParseInput,
  c: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
) {
  let quotedSfp: SfpNode | null = null;
  for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
    const next = matchTerminalSfpArbitration(input, c, stemTok, ops);
    if (next === null) {
      return null;
    }
    if (quotedSfp === null) {
      quotedSfp = next;
    }
    const carrier = matchPredicateQuoteCarrier(c, input.lookups, stemTok, ops, input, {
      allowTerminalBareTo: true,
      allowTerminalToka: true,
      quotedPropositionClosedBySfp: true
    });
    if (carrier === null) {
      continue;
    }
    if (carrier.sourceTerminal === true) {
      return { quotedSfp, carrier };
    }
    return input.quoteAttributiveHeadFrame?.quotedContentHeadBinding === true
      ? { quotedSfp, carrier }
      : null;
  }
  return null;
}

export function predicateQuoteCarrierSpanEnd(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): number | null {
  if (markerIdx < 0 || markerIdx >= tokens.length) {
    return null;
  }
  const cursor = new TokenCursor(tokens, markerIdx, tokens.length);
  const carrier = matchPredicateQuoteCarrier(cursor, lookups);
  if (carrier === null) {
    return null;
  }
  const last = carrier.source.tokenIndices.at(-1);
  return last === undefined ? null : last + 1;
}
