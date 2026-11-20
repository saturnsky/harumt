import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isExternalNominalizerConnectiveKind } from "../../../boundary/relation.js";
import { detectSfp } from "../../../../semantics/grammar-runtime.js";
import { classifyDatteMarkerAt } from "../../../../semantics/marker-roles.js";
import { matchHokaAdditiveConnectiveStart, matchMonoNoConcessiveConnectiveStart } from "../../../boundary/connective-start.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { boundNominalReasonClauseContinuationEvidenceAt } from "../integration/readiness.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { adjectivalConcessiveTomoRelationAt, caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, dewaScopeBridgeRelationAt, kaMarkerRelationAt, predicateNominalizerRelationForToken, registeredClauseConnectiveRelationForToken } from "../../../boundary/marker.js";
import { nextNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { parallelPredicateMoOwnershipYieldMarkers, renyouFocusParallelSeriesFinalMarkerByItem, zeroNominalizedParallelMoMarkerIndices } from "../../../../clause-layout/predicate-parallel.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { quoteMarkerRelationAt, tokaQuoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../../../boundary/quote-marker.js";
import { closedPropositionTokaKaRelationAt, closedPropositionTokaListingEvidenceAt, kaOwnershipKindAt, type ClosedPropositionTokaKaRelation } from "../../../boundary/ka-ownership.js";
import { tokenMatchesConnectiveKind } from "../../connective-span-scanner.js";
import { hasRealContentAfterIndex, isHardTerminalPunctuationToken } from "../../../boundary/punctuation.js";
import { isTeConnectiveToken } from "../../postverb-tail-classifier.js";
import { type AuxOpNode, type OpSource, type QuotedPropositionMood, type ConnectiveOp, retrospectiveQuotativeFlavorForStemMood, type StemNode, type VolitionalAttemptFocusParticle } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { srcSingle, srcSlice } from "../source.js";
import { isBareMoConcessivePreviousToken, focusedNegationShapeAt, isNaiOrNuToken, isTariListingParticleToken, volitionalAttemptMarkerAt } from "../classifiers/tokens.js";
import { matchBoundNominalListingConnectiveAt, matchBoundNominalReasonConnectiveAt, boundNominalReasonQuoteCarrierStemAt } from "./bound-nominal-connective.js";
import { matchTameConnectiveAt, matchTameQuotedJudgmentPassiveConnectiveAt } from "./tame-connective.js";
import { matchTokoroResultConnectiveAt } from "./tokoro-result-connective.js";
import { type CompositeConnectiveMatch, matchCompositeConnectiveAt, matchQuotedConcessiveConnectiveAt, matchReformulationConnectiveAt, matchRetrospectiveQuoteConnectiveAt, matchQuestionReformulationConnectiveAt } from "./connective.js";
import { POS0, POS01, POS1, POS2, POS4, POS5A, 意志推量形_, 格助詞, isConjunctiveParticleToken, isPastAuxConditionalForm, 形状詞可能, 形容詞0, 終止形_, 助詞, 助動詞, 助動詞_ダ, 助動詞_デス, 接続助詞, 連体形_, 連用形_, 助詞_係助詞, 助詞_格助詞 } from "../../../../../types/pos.js";
import { createConnectiveOp, markTerminalDiscourseHostConnectiveOp } from "../op-builders.js";
import { buildClassifiedConnectiveOp } from "../parser.js";
import { connectiveOpFromMatch } from "../connective-ops.js";
import { sfpEffectFromDetected } from "./terminal-sfp.js";
import { matchPredicateQuoteCarrier } from "./predicate-quote.js";
import { installsPredicateHeadOverStem, buildReportedRequestQuotativeOp, quotedPropositionMood } from "../quote-tail-context.js";
import { terminalDiscourseSfpRunClosesUtterance } from "../parse-closure.js";
import { sourceIndexForInputPosition, contextAlignedPosition } from "../parse-coordinates.js";
import { isAdjLikeStemNode, isVerbLikeStemNode, opLastSourceToken } from "../parse-stem.js";

export function boundNominalReasonQuoteCarrierHostAt(
  input: ParseInput,
  ops: readonly AuxOpNode[],
  stemPos: number
): boolean {
  const dominatingHead = ops.filter(installsPredicateHeadOverStem).at(-1);
  if (dominatingHead !== undefined) {
    return dominatingHead.kind === "predicateQuoteCarrier" &&
      (dominatingHead.style === "compact_toiu" || dominatingHead.style === "question_toiu");
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  return boundNominalReasonQuoteCarrierStemAt(
    contextTokens,
    sourceIndexForInputPosition(input, stemPos)
  );
}

export function matchBoundNominalReasonConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchBoundNominalReasonConnectiveAt(cursor.tokens, cursor.pos);
  if (match === null) return null;
  if (match.requiresClauseContinuation === true) {
    const context = contextAlignedPosition(input, cursor, cursor.pos);
    if (
      context.tokens !== cursor.tokens &&
      matchBoundNominalReasonConnectiveAt(context.tokens, context.index) === null
    ) {
      return null;
    }
    if (!boundNominalReasonClauseContinuationFollows(input, cursor.pos + match.consumed)) {
      return null;
    }
  }
  const op = connectiveOpFromMatch(match, cursor);
  return match.formalNoun === "mono" ? { ...op, boundNominalReasonMonoNoun: true } : op;
}

function boundNominalReasonClauseContinuationFollows(
  input: ParseInput,
  connectiveEndPos: number
): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  return boundNominalReasonClauseContinuationEvidenceAt(
    contextTokens,
    sourceIndexForInputPosition(input, Math.max(connectiveEndPos - 1, 0)),
    sourceIndexForInputPosition(input, connectiveEndPos),
    input.lookups
  );
}

export function matchBoundNominalListingConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchBoundNominalListingConnectiveAt(cursor.tokens, cursor.pos);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchTameQuotedJudgmentPassiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchTameQuotedJudgmentPassiveConnectiveAt(cursor);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchTokoroResultConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const contextTokens = input.contextTokens ?? input.tokens;
  const index = sourceIndexForInputPosition(input, cursor.pos);
  if (contextTokens[index] !== cursor.tokens[cursor.pos]) {
    return null;
  }
  const match = matchTokoroResultConnectiveAt(contextTokens, index, { previousOps, lookups: input.lookups });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchTameConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemToken: RuntimeHaruToken,
  lookups: LookupTables
): ConnectiveOp | null {
  const match = matchTameConnectiveAt(cursor.tokens, cursor.pos, { previousOps, stemToken, lookups });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchNodeReasonConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && match.surface === "ので") {
    return connectiveOpFromMatch(match, cursor);
  }
  const openMatch = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (openMatch === null || openMatch.surface !== "ので") return null;
  const carrierProbe = cursor.fork(cursor.pos + openMatch.consumed);
  if (matchPredicateQuoteCarrier(carrierProbe, lookups)?.style !== "compact_toiu") return null;
  if (carrierProbe.current() !== undefined) return null;
  return connectiveOpFromMatch(openMatch, cursor);
}

export function matchNoNiAdversativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken,
  input?: ParseInput
): ConnectiveOp | null {
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  let terminalDiscourseHost = false;
  if ((match === null || match.surface !== "のに") && stemToken !== undefined) {
    match = matchCompositeConnectiveBeforeTrailingSfp(cursor, stemToken, (m) => m.surface === "のに");
    terminalDiscourseHost = match !== null &&
      terminalDiscourseSfpRunClosesUtterance(cursor, input, match.consumed);
  }
  if (match === null || match.surface !== "のに") {
    match = matchCompositeConnectiveBeforeTerminalQuoteClosure(
      cursor,
      input,
      (m) => m.surface === "のに",
      stemToken
    );
  }
  if (match === null || match.surface !== "のに") return null;
  const op = connectiveOpFromMatch(match, cursor);
  return terminalDiscourseHost ? markTerminalDiscourseHostConnectiveOp(op) : op;
}

function terminalQuoteClosureFollows(
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number,
  input: ParseInput | undefined
): boolean {
  const marker = tokaTteCompositeQuoteCandidateAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] }) ??
    tokaQuoteMarkerRelationAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] }) ??
    quoteMarkerRelationAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker === null) {
    return false;
  }
  if (
    marker.canonicalSurface !== "と" &&
    marker.canonicalSurface !== "って" &&
    marker.canonicalSurface !== "とか" &&
    marker.canonicalSurface !== "とかって"
  ) {
    return false;
  }
  if (marker.span.endExclusive < cursor.end) {
    return false;
  }
  const contextTokens = input?.contextTokens ?? input?.tokens;
  if (input === undefined || contextTokens === undefined) {
    return false;
  }
  return !hasRealContentAfterIndex(
    contextTokens,
    sourceIndexForInputPosition(input, marker.span.endExclusive),
    { stopAtHardTerminal: true }
  );
}

function matchCompositeConnectiveBeforeTerminalQuoteClosure(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined,
  accepts: (match: CompositeConnectiveMatch) => boolean,
  stemToken?: RuntimeHaruToken
): CompositeConnectiveMatch | null {
  const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (loose === null || !accepts(loose)) {
    return null;
  }
  const markerPos = cursor.pos + loose.consumed;
  if (terminalQuoteClosureFollows(cursor, markerPos, input)) {
    return loose;
  }
  if (stemToken === undefined) {
    return null;
  }
  const sfpCursor = cursor.fork(markerPos, cursor.tokens.length, markerPos);
  const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
  const sfpConsumed = sfpCursor.consumed;
  if (sfpConsumed <= 0 || sfpEffectFromDetected(detected) === null) {
    return null;
  }
  return terminalQuoteClosureFollows(cursor, markerPos + sfpConsumed, input) ? loose : null;
}

function matchCompositeConnectiveBeforeTrailingSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  accepts: (match: CompositeConnectiveMatch) => boolean
): CompositeConnectiveMatch | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (loose === null || !accepts(loose)) return null;
  const sfpStart = pos + loose.consumed;
  const sfpCursor = cursor.fork(sfpStart, tokens.length, sfpStart);
  const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
  const sfpConsumed = sfpCursor.consumed;
  if (
    sfpConsumed > 0 &&
    sfpStart + sfpConsumed >= tokens.length &&
    sfpEffectFromDetected(detected) !== null
  ) {
    return loose;
  }
  return null;
}

export function matchExternalNominalizerConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || !isExternalNominalizerConnectiveKind(match.connective)) {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

export function matchNominalizedEvenIfConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const nominalizer = predicateNominalizerRelationForToken(cursor.current(), cursor.pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || match.connective !== "even_if") {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

export function matchAdjectivalConcessiveTomoConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const relation = adjectivalConcessiveTomoRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["tail_multi_clause"]
  });
  if (relation === null || relation.span.start !== cursor.pos) {
    return null;
  }
  if (relation.span.endExclusive < cursor.end) {
    return null;
  }
  return connectiveOpFromMatch(
    {
      connective: relation.connectiveKind,
      surface: relation.surface,
      consumed: relation.span.endExclusive - relation.span.start
    },
    cursor
  );
}

function isTeMoConcessiveSurface(surface: string): boolean {
  return surface === "ても" || surface === "でも" || surface === "てでも" || surface === "ででも";
}

export function matchTeMoConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken,
  input?: ParseInput
): ConnectiveOp | null {
  const ownershipTokens = input?.contextTokens ?? cursor.tokens;
  const ownershipPos = input === undefined
    ? cursor.pos
    : sourceIndexForInputPosition(input, cursor.pos);
  const scopeRelation = dewaScopeBridgeRelationAt(ownershipTokens, ownershipPos, {
    anchorIdx: ownershipPos,
    consumers: ["tail_multi_clause"]
  });
  const scopeTail = scopeRelation === null
    ? undefined
    : ownershipTokens[scopeRelation.span.endExclusive];
  if (
    scopeRelation?.focusParticle === "mo" &&
    scopeTail !== undefined &&
    isNaiOrNuToken(scopeTail)
  ) {
    return null;
  }
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if ((match === null || !isTeMoConcessiveSurface(match.surface)) && stemToken !== undefined) {
    match = matchCompositeConnectiveBeforeTrailingSfp(cursor, stemToken, (m) => isTeMoConcessiveSurface(m.surface));
  }
  if (match === null || !isTeMoConcessiveSurface(match.surface)) return null;
  return connectiveOpFromMatch(match, cursor);
}

function isZeroNominalizedParallelMoMarkerAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  return zeroNominalizedParallelMoMarkerIndices(tokens).has(anchor);
}

export function isParallelPredicateMoOwnershipYieldAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  return parallelPredicateMoOwnershipYieldMarkers(tokens).has(anchor);
}

export function matchRenyouFocusSupportEllipsisConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    tokens[pos + 1] !== undefined ||
    !isRenyouFocusSupportEllipsisMarkerAtCursor(cursor, input)
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({
    connective: "listing",
    surface: "__renyou_mo_focus_ellipsis",
    source: srcSlice(tokens, pos, 1)
  });
}

function isRenyouFocusSupportEllipsisMarkerAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  const finalMarkerIdx = renyouFocusParallelSeriesFinalMarkerByItem(tokens).get(anchor);
  return finalMarkerIdx !== undefined && focusedNegationShapeAt(tokens, finalMarkerIdx) !== null;
}

export function matchBareMoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    tokens[pos + 1] !== undefined ||
    !isBareMoConcessivePreviousToken(tokens[pos - 1]) ||
    isZeroNominalizedParallelMoMarkerAtCursor(cursor, input)
  ) {
    return null;
  }
  const previous = tokens[pos - 1];
  const previousForm5A = (previous?.pos ?? 0) & POS5A;
  cursor.advance(1);
  return createConnectiveOp({

    connective: "concession",
    surface: previousForm5A === 連用形_ ? "__renyou_mo" : "も",
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchCopulaMoFocusConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  const previous = tokens[pos - 1];
  const ownershipTokens = input?.contextTokens ?? tokens;
  const ownershipPos = input === undefined
    ? pos - 1
    : sourceIndexForInputPosition(input, pos - 1);
  const scopeRelation = dewaScopeBridgeRelationAt(ownershipTokens, ownershipPos, {
    anchorIdx: ownershipPos,
    consumers: ["tail_multi_clause"]
  });
  const scopeTail = scopeRelation === null
    ? undefined
    : ownershipTokens[scopeRelation.span.endExclusive];
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    previous === undefined ||
    copulaDeMarkerRelationForToken(previous, pos - 1, { consumers: ["tail_multi_clause"] }) === null ||
    tokens[pos + 1] !== undefined ||
    (scopeTail !== undefined && isNaiOrNuToken(scopeTail))
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "even_if",
    surface: "でも",
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchVolitionalPurposeToConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "と" ||
    (token.pos & POS0) !== 助詞 ||
    ((token.pos & POS1) !== 格助詞 && (token.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  const suruAttempt = volitionalAttemptMarkerAt(tokens, pos);
  const sourcePos = sourceIndexForInputPosition(input, pos);
  const lexicalBinding = suruAttempt === null ? activeProtoLayout()?.volitionalIntentBindingAt(sourcePos) : undefined;
  const atSliceEnd = cursor.peek(1) === undefined;
  const lexicalInSlice = lexicalBinding !== undefined &&
    (atSliceEnd || pos + (lexicalBinding.predicateIdx - sourcePos) < cursor.end);
  const attempt = suruAttempt ?? (lexicalInSlice && !atSliceEnd ? lexicalBinding : null);
  if (attempt === null && !atSliceEnd) {
    return null;
  }
  const binding = suruAttempt === null && lexicalInSlice ? "lexical" : "suru_attempt";
  const lastOp = ops[ops.length - 1];
  const sourceToken = lastOp === undefined ? stemTok : opLastSourceToken(lastOp);
  if (sourceToken === undefined || (sourceToken.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  if ((sourceToken.pos & POS0) === 形容詞0) {
    if (attempt?.focusParticle !== undefined) {
      return null;
    }
    cursor.advance(1);
    return createConnectiveOp({
      connective: "even_if",
      surface: "と",
      source: srcSlice(tokens, pos, 1)
    });
  }
  const consumed = attempt?.tokenCount ?? 1;
  cursor.advance(consumed);
  return buildVolitionalPurposeToConnectiveOp(srcSlice(tokens, pos, consumed), binding, attempt?.focusParticle);
}

export function buildVolitionalPurposeToConnectiveOp(
  source: OpSource,
  binding: "suru_attempt" | "lexical",
  focusParticle: VolitionalAttemptFocusParticle | undefined
): ConnectiveOp {
  return createConnectiveOp({

    connective: binding === "lexical" ? "volitional_purpose" : "conditional",
    surface: "と",
    source,
    ...(focusParticle === undefined ? {} : { attemptFocusParticle: focusParticle })
  });
}

export function matchDatteFocusParticleConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || token.surface !== "だって" || (token.pos & POS0) !== 助詞) {
    return null;
  }
  if (tokens[pos + 1] !== undefined) {
    return null;
  }
  const previous = previousOps.at(-1);
  const sourceMarkerIndex = sourceIndexForInputPosition(input, pos);
  const contextTokens = input.contextTokens ?? tokens;
  const followingContextIndex = nextNonSpaceIndex(
    contextTokens,
    sourceMarkerIndex + 1,
    contextTokens.length
  );
  const terminalBoundary = followingContextIndex === null ||
    isHardTerminalPunctuationToken(contextTokens[followingContextIndex]);
  const typedContext =
    previous?.kind === "aspect" &&
    (previous.aspect === "te_kudasai" || previous.aspect === "te_kure_tanomu")
      ? {
        precedingRequestAspect: previous.aspect,
        ...(terminalBoundary ? { terminalBoundary: true as const } : {})
      }
      : {};
  const role = classifyDatteMarkerAt(cursor, input.lookups, typedContext).role;
  if (role === "terminal_reported_request") {
    cursor.advance(1);
    return buildReportedRequestQuotativeOp(srcSlice(tokens, pos, 1));
  }
  if (role !== "focus_particle") {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "even_if",
    surface: "だって",
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchSfpClosedExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
): ConnectiveOp | null {
  return matchClosedPropositionExemplificationConnective(input, cursor, "terminal_particle_run");
}

export function matchBareVolitionalClosedExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
): ConnectiveOp | null {
  return matchClosedPropositionExemplificationConnective(input, cursor, "bare_volitional");
}

export function bareVolitionalExemplificationBoundaryMood(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  markerPos: number,
  connectiveKind: ConnectiveOp["connective"],
  previousOps: readonly AuxOpNode[],
): { readonly closedChainMood?: QuotedPropositionMood } {
  if (connectiveKind !== "exemplification" || cursor.tokens[markerPos]?.surface !== "と") {
    return {};
  }
  const context = contextAlignedPosition(input, cursor, markerPos);
  const kaContextIdx = nextNonSpaceIndex(context.tokens, context.index + 1);
  const closure = kaContextIdx === null ? null : closedPropositionTokaKaRelationAt(context.tokens, kaContextIdx);
  if (closure?.evidence !== "bare_volitional" || closure.markerIdx !== context.index) {
    return {};
  }
  return { closedChainMood: quotedPropositionMood(input.tokens[input.start], previousOps, null) };
}

function matchClosedPropositionExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  evidence: ClosedPropositionTokaKaRelation["evidence"],
): ConnectiveOp | null {
  const pos = cursor.pos;
  if (cursor.tokens[pos]?.surface !== "と" || pos + 1 >= cursor.end) {
    return null;
  }
  const context = contextAlignedPosition(input, cursor, pos);
  const kaContextIdx = nextNonSpaceIndex(context.tokens, context.index + 1);
  const closure = kaContextIdx === null
    ? null
    : closedPropositionTokaKaRelationAt(context.tokens, kaContextIdx);
  if (closure === null || closure.evidence !== evidence || closure.markerIdx !== context.index) {
    return null;
  }
  const composite = tokaTteCompositeQuoteCandidateAt(context.tokens, context.index, { consumers: ["tail_multi_clause"] });
  if (evidence === "bare_volitional" && composite !== null) {
    return null;
  }
  const markerEndExclusive = composite?.span.endExclusive ?? closure.kaIdx + 1;
  if (
    evidence !== "bare_volitional" &&
    !hasRealContentAfterIndex(context.tokens, markerEndExclusive, { stopAtHardTerminal: true })
  ) {
    return null;
  }
  const quoteRelation = quoteStructuralRelationAt(
    new TokenCursor(context.tokens, context.index, context.tokens.length, context.index),
    input.lookups,
  );
  if (quoteRelation?.quote.markerSpan.start === context.index) {
    return null;
  }
  if (evidence === "bare_volitional" && !closedPropositionTokaListingEvidenceAt(context.tokens, closure, input.lookups)) {
    return null;
  }
  return cursor.tx((c) => matchExemplificationConnective(c, input.lookups, {
    closedVolitionalLeft: evidence === "bare_volitional",
  }));
}

export function matchExemplificationConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: {
    readonly closedVolitionalLeft?: boolean;
  } = {},
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  const tokaKa = tokens[pos + 1];
  if (
    token?.surface === "と" &&
    tokaKa !== undefined &&
    kaMarkerRelationAt(tokens, pos - 1, ["tail_multi_clause"]) === null &&
    (options.closedVolitionalLeft === true || ((tokens[pos - 1]?.pos ?? 0) & POS5A) !== 意志推量形_) &&
    kaOwnershipKindAt(tokens, pos + 1, lookups) === "toka_listing"
  ) {
    cursor.advance(2);
    return createConnectiveOp({

      connective: "exemplification",
      surface: "とか",
      source: srcSlice(tokens, pos, 2),
    });
  }
  if (
    token === undefined ||
    !tokenMatchesConnectiveKind(token, "exemplification")
  ) {
    return null;
  }
  const genitive = tokens[pos + 1];
  const hasGenitiveProjection =
    genitive !== undefined &&
    tokens[pos + 2] === undefined &&
    genitive.surface === "の" &&
    (genitive.pos & POS01) === 助詞_格助詞;
  if (tokens[pos + 1] !== undefined && !hasGenitiveProjection) {
    return null;
  }
  const consumed = hasGenitiveProjection ? 2 : 1;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: "exemplification",
    surface: hasGenitiveProjection ? `${token.surface}${genitive.surface}` : token.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

export function matchTeKaraSequenceConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const te = cursor.current();
  const kara = cursor.peek(1);
  if (
    te === undefined ||
    kara === undefined ||
    !isTeConnectiveToken(te) ||
    caseParticleMarkerRelationForToken(kara, pos + 1, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return null;
  }
  cursor.advance(2);
  return createConnectiveOp({

    connective: "sequence_after",
    surface: `${te.surface}から`,
    source: srcSlice(tokens, pos, 2)
  });
}

export function matchTeIraiTemporalSinceConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const te = cursor.current();
  const irai = cursor.peek(1);
  if (
    te === undefined ||
    irai === undefined ||
    !isTeConnectiveToken(te) ||
    (irai.dictionaryForm || irai.surface) !== "以来"
  ) {
    return null;
  }
  cursor.advance(2);
  return createConnectiveOp({

    connective: "temporal_since",
    surface: `${te.surface}以来`,
    source: srcSlice(tokens, pos, 2)
  });
}

export function matchZuniConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemNode: StemNode
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const ni = cursor.current();
  const previous = ops[ops.length - 1];
  const previousTok = previous === undefined ? undefined : opLastSourceToken(previous);
  const previousNegativeSurface = previousTok?.surface;
  const followsSuppletiveZuStem =
    previous === undefined &&
    stemNode.commitment === "suppletive_negation" &&
    tokens[pos - 1]?.surface === "ず";
  if (
    ni === undefined ||
    caseParticleMarkerRelationForToken(ni, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    !(
      (
        previous?.kind === "negation" &&
        (previousNegativeSurface === "ず" || previousNegativeSurface === "ぬ")
      ) ||
      followsSuppletiveZuStem
    )
  ) {
    return null;
  }
  const surface = previousNegativeSurface === "ぬ" ? "ぬに" : "ずに";
  cursor.advance(1);
  return createConnectiveOp({

    connective: "listing",
    surface,
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchTariEnumerativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || !isTariListingParticleToken(token)) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "listing",
    surface: token.surface,
    source: srcSlice(tokens, pos, 1)
  });
}

export function matchNaraBaConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || match.surface !== "ならば") return null;
  return connectiveOpFromMatch(match, cursor);
}

export function matchClassicalConditionalBaConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const conditional = cursor.current();
  const ba = cursor.peek(1);
  if (
    conditional === undefined ||
    !isPastAuxConditionalForm(conditional.pos) ||
    ba === undefined ||
    ba.surface !== "ば" ||
    !isConjunctiveParticleToken(ba)
  ) {
    return null;
  }
  cursor.advance(2);
  return buildClassifiedConnectiveOp(conditional, pos, previousOps, srcSlice(tokens, pos, 2));
}

function isInventoryCompositeConnectiveMatch(match: CompositeConnectiveMatch): boolean {
  return match.hostBound === true ||
    match.surface === "けども" ||
    match.surface === "けれども" ||
    match.surface === "ながらも" ||
    match.surface === "つつも" ||
    match.surface === "からこそ" ||
    match.connective === "question_content_alternative";
}

export function matchInventoryCompositeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && isInventoryCompositeConnectiveMatch(match)) {
    return connectiveOpFromMatch(match, cursor);
  }
  if (stemToken === undefined) {
    return null;
  }
  const beforeSfp = matchCompositeConnectiveBeforeTrailingSfp(
    cursor,
    stemToken,
    isInventoryCompositeConnectiveMatch
  );
  return beforeSfp === null ? null : connectiveOpFromMatch(beforeSfp, cursor);
}

export function matchReformulationConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput
): ConnectiveOp | null {
  const sourcePos = sourceIndexForInputPosition(input, cursor.pos);
  const match = matchReformulationConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd: true,
    canonicalRelation:
      input.canonicalReformulationMarkerRelations?.relationAtQuoteMarker(sourcePos) ?? null
  });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchQuotedConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchQuotedConcessiveConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchRetrospectiveQuoteConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemNode: StemNode
): ConnectiveOp | null {
  const match = matchRetrospectiveQuoteConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  if (match === null) return null;
  const retrospectiveQuotativeFlavor = match.retrospectiveQuotativeFlavor === undefined
    ? undefined
    : retrospectiveQuotativeFlavorForStemMood(
      match.retrospectiveQuotativeFlavor,
      stemNode.stemMood
    );
  return connectiveOpFromMatch({
    ...match,
    ...(retrospectiveQuotativeFlavor === undefined ? {} : { retrospectiveQuotativeFlavor })
  }, cursor);
}

export function matchQuestionReformulationConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchQuestionReformulationConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchHokaAdditiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const consumed = cursor.lookahead(0, matchHokaAdditiveConnectiveStart);
  if (consumed === null || pos + consumed !== tokens.length) {
    return null;
  }
  const surface = tokens.slice(pos, pos + consumed).map((token) => token.surface).join("");
  cursor.advance(consumed);
  return buildHokaAdditiveConnectiveOp(srcSlice(tokens, pos, consumed), surface);
}

export function buildHokaAdditiveConnectiveOp(
  source: OpSource,
  surface: string
): ConnectiveOp {
  return createConnectiveOp({ connective: "additive_besides", surface, source });
}

export function matchMonoNoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const consumed = cursor.lookahead(0, c => matchMonoNoConcessiveConnectiveStart(c, { allowChunkEos: true }));
  if (consumed === null || pos + consumed !== tokens.length) {
    return null;
  }
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: "concession",
    surface: "ものの",
    source: srcSlice(tokens, pos, consumed)
  });
}

export function matchKuseNiConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && match.connective !== "concession") {
    match = null;
  }
  if (match === null) {
    const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
    if (loose !== null && loose.connective === "concession") {
      const sfpStart = pos + loose.consumed;
      const sfpCursor = cursor.fork(sfpStart, tokens.length, sfpStart);
      const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
      const sfpConsumed = sfpCursor.consumed;
      if (
        sfpConsumed > 0 &&
        sfpStart + sfpConsumed >= tokens.length &&
        sfpEffectFromDetected(detected) !== null
      ) {
        match = loose;
      }
    }
  }
  if (match === null) {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

export function matchNaBridgedKuseNiConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const na = cursor.current();
  if (
    na === undefined ||
    na.surface !== "な" ||
    (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連体形_)
  ) {
    return null;
  }
  const match = matchCompositeConnectiveAt(cursor.fork(pos + 1, cursor.end, pos + 1), { requireEnd: true });
  if (match === null || match.connective !== "concession") {
    return null;
  }
  const consumed = 1 + match.consumed;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: match.connective,
    surface: match.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

export function matchRenyouNominalCopulaReasonConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stemNode: StemNode
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (
    !isVerbLikeStemNode(stemNode) ||
    (stemTok.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const copula = tokens[pos];
  const kara = tokens[pos + 1];
  const koso = tokens[pos + 2];
  const copulaPos4 = (copula?.pos ?? 0) & POS4;
  const copulaPos5A = (copula?.pos ?? 0) & POS5A;
  if (
    copula === undefined ||
    (copula.pos & POS0) !== 助動詞 ||
    (copulaPos4 !== 助動詞_ダ && copulaPos4 !== 助動詞_デス) ||
    copulaPos5A !== 終止形_
  ) {
    return null;
  }
  if (
    caseParticleMarkerRelationForToken(kara, pos + 1, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    koso?.surface !== "こそ" ||
    (koso.pos & POS0) !== 助詞
  ) {
    return null;
  }
  cursor.advance(3);
  return createConnectiveOp({

    connective: "origin",
    surface: "からこそ",
    source: srcSlice(tokens, pos, 3)
  });
}

export function matchPostpositionalInventoryConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode
): ConnectiveOp | null {
  const pos = cursor.pos;
  const token = cursor.current();
  const registered = registeredClauseConnectiveRelationForToken(token, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (token === undefined || registered === null) {
    return null;
  }
  const kind = registered.connectiveKind;
  if (
    token.surface === "が" &&
    (token.pos & POS1) === 格助詞 &&
    kind === "adversative" &&
    previousOps.some((op) => op.kind === "copula")
  ) {
    cursor.advance(1);
    return createConnectiveOp({

      connective: kind,
      surface: token.surface,
      source: srcSingle(token, pos)
    });
  }
  if (token.surface === "も") {
    return null;
  }
  if (kind !== "concession") {
    return null;
  }
  if (
    token.surface === "にもかかわらず" &&
    !canOwnNimoKakawarazuConnective(previousOps, stemNode)
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: kind,
    surface: token.surface,
    source: srcSingle(token, pos)
  });
}

export function canOwnNimoKakawarazuConnective(
  ops: readonly AuxOpNode[],
  stemNode: StemNode
): boolean {
  return isVerbLikeStemNode(stemNode) ||
    isAdjLikeStemNode(stemNode) ||
    (stemNode.source.tokens[0] !== undefined && (stemNode.source.tokens[0].pos & POS2) === 形状詞可能) ||
    hasNimoKakawarazuCopulaOwnerOp(ops);
}

function hasNimoKakawarazuCopulaOwnerOp(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => op.kind === "copula");
}
