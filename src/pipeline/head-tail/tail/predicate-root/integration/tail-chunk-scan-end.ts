import { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { fusedCopulaSupportConnectiveKindOf, fusedCopulaSupportHostSlotAt } from "../classifiers/tokens.js";
import type { FusedCopulaSupportHostSlot } from "../classifiers/tokens.js";
import { matchCompositeConnectiveAt } from "../matchers/connective.js";
import { obligationSpanEndExclusiveAt } from "../matchers/obligation.js";
import { isLikenessCarrierHeadToken } from "../matchers/predicate-projection-connective.js";
import { terminalOnlyPredicateEndpointClosesBefore } from "./readiness.js";
import { skipHostEnclosingQuoteClose } from "../nominal-host-phrase.js";
import type { UtteranceClosureRunEvidence, UtteranceClosureRunKind } from "../../../../clause-layout/utterance-closure.js";
import { activeProtoLayout, isClausePunctuationToken } from "../../../../clause-layout/index.js";
import { conjecturalCopulaAttributiveEndpointClaimed } from "../../../../clause-layout/attributive-boundaries.js";
import { isConditionalCopulaClauseBoundaryToken, hasSeparatedFinitePredicateBoundary } from "../../../../clause-layout/connective-boundaries.js";
import { SEPARATION_OPENS_BOUNDARY, nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "../../../../clause-layout/trivia.js";
import { activeProtoUtteranceClosureRunAt } from "../../../../clause-layout/proto-state.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import { teDeContinuationRelationAt, isTeTailImperativeFormClosureAt } from "../../postverb-tail-classifier.js";
import { appearancePerceptionReadingForToken } from "../appearance-perception-carrier-table.js";
import { isRefusedUtteranceHeadToken } from "../../../boundary/clause-start.js";
import { copulaNiMarkerRelationForToken, predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { kaOwnershipKindAt, speakerAcknowledgmentKaClosureIndexAt } from "../../../boundary/ka-ownership.js";
import { NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS5A, isAssertiveCopulaFamilyPos, 終止形_, 助動詞 as 助動詞0, 助動詞語幹, 動詞, 命令形_, 連体形_, isPoliteCopulaPos, INFLECTABLE_AUX_BITS, 助詞_格助詞, 接続詞, isAuxiliaryToken, isIndependentWordToken, isTerminalInflection, isVolitionalInflection, isRenyouInflection } from "../../../../../types/pos.js";
import { demoDiscourseUtteranceInitialMatchLengthAt } from "../../../../demo-discourse.js";
import { negativeCopulaPredicateSpanEndExclusive, copulaSupportMarkerOwnsDeAt, copulaChainIndexBelowTenseAndPoliteLayers, copulaSupportChainBodyIndex } from "./attributive-boundary.js";
import { nominalTerminalQuestionDetachedClosureIndexAt, hostlessTerminalQuoteMarkerClosesSourceAt } from "./predicate-start-evidence.js";

export function findTailChunkScanEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): number {
  const acknowledgmentClosure = speakerAcknowledgmentKaClosureIndexAt(tokens, start, lookups);
  const nominalQuestionClosure = nominalTerminalQuestionDetachedClosureIndexAt(
    new TokenCursor(tokens, start, tokens.length, start),
    start,
    numeric,
    lookups
  );
  let end = start;
  while (end < tokens.length) {
    if (acknowledgmentClosure !== null && end === acknowledgmentClosure) {
      return end - 1;
    }
    if (nominalQuestionClosure !== null && end === nominalQuestionClosure) {
      return end - 1;
    }
    if (terminalOnlyPredicateEndpointClosesBefore(tokens, start, end)) {
      return end - 1;
    }
    if (isClausePunctuationToken(tokens[end])) {
      const afterHostQuoteClose = skipHostEnclosingQuoteClose(tokens, start, end);
      if (end !== start + 1 || afterHostQuoteClose === end) {
        break;
      }
      end = afterHostQuoteClose;
      continue;
    }
    if (whitespaceJunctureEndsTailChunkAt(tokens, start, end)) {
      return end - 1;
    }
    if (pauseJunctureEndsTailChunkAt(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkFromConjunctionClause(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkAfterYouNiCarrier(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkFromFollowingPostverbClause(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkAfterFiniteObligationClause(tokens, start, end)) {
      return end - 1;
    }
    if (terminalCopulaSeparatedFromFollowingClause(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (utteranceClosureRunEndsTailChunkAt(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (
      end > start &&
      fusedCopulaSupportConnectiveKindOf(tokens[end]) !== null &&
      TAIL_CHUNK_SCAN_END_FUSED_HOST_SLOTS.has(fusedCopulaSupportHostSlotAt(tokens, end))
    ) {
      return end;
    }
    const nominalizedConditionalEnd = nominalizedCopulaConditionalTailChunkEndAt(tokens, start, end);
    if (nominalizedConditionalEnd !== null) {
      return nominalizedConditionalEnd;
    }
    end += 1;
  }
  return end - 1;
}

export function whitespaceJunctureEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (idx <= start) {
    return false;
  }
  const runOrdinal = tokens[idx]?.whitespaceBefore?.runOrdinal;
  const juncture = activeProtoLayout()?.whitespaceJunctureAt(idx);
  return juncture !== undefined && runOrdinal !== undefined &&
    juncture.runOrdinal === runOrdinal && juncture.verdict === "boundary";
}

export function pauseJunctureEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (idx <= start) {
    return false;
  }
  const runOrdinal = tokens[idx - 1]?.transparentPauseRunAfter?.ellipsisRunOrdinal;
  const juncture = activeProtoLayout()?.pauseJunctureAt(idx);
  return juncture !== undefined && runOrdinal !== undefined &&
    juncture.runOrdinal === runOrdinal && juncture.verdict === "boundary";
}

function nominalizedCopulaConditionalTailChunkEndAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): number | null {
  const token = tokens[idx];
  if (idx <= start || token === undefined || !isConditionalCopulaClauseBoundaryToken(token)) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx, start);
  if (hostIdx === null) {
    return null;
  }
  const nominalizer = predicateNominalizerRelationForToken(tokens[hostIdx], hostIdx, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const composite = matchCompositeConnectiveAt(
    new TokenCursor(tokens, idx, tokens.length, idx),
    { requireEnd: false }
  );
  return composite === null ? idx : idx + composite.consumed - 1;
}

const TAIL_CHUNK_SCAN_END_FUSED_HOST_SLOTS: ReadonlySet<FusedCopulaSupportHostSlot> =
  new Set<FusedCopulaSupportHostSlot>(["copula_host", "nominalized_host", "none"]);

const TAIL_CHUNK_SCAN_END_CLOSURE_RUNS: ReadonlySet<UtteranceClosureRunKind> = new Set<UtteranceClosureRunKind>([
  "terminal_particle_run"
]);

const TAIL_CHUNK_SCAN_END_CLOSURE_RUNS_REQUIRING_UTTERANCE_HEAD: ReadonlySet<UtteranceClosureRunKind> =
  new Set<UtteranceClosureRunKind>(["terminal_copula_run", "polite_terminal_chain"]);

function tailChunkScanEndAdmitsClosureRun(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  run: UtteranceClosureRunKind
): boolean {
  if (TAIL_CHUNK_SCAN_END_CLOSURE_RUNS.has(run)) {
    return true;
  }
  if (!TAIL_CHUNK_SCAN_END_CLOSURE_RUNS_REQUIRING_UTTERANCE_HEAD.has(run)) {
    return false;
  }
  const head = tokens[idx];
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (head === undefined || prev === null) {
    return false;
  }
  return followingChunkHeadAdmitted(tokens, idx, head, tailChunkLeftClauseLayer(tokens, start, prev));
}


function utteranceClosureRunEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (idx <= start || idx >= tokens.length) {
    return false;
  }
  const closure = activeProtoUtteranceClosureRunAt(idx);
  if (closure === null || !tailChunkScanEndAdmitsClosureRun(tokens, start, idx, closure.run)) {
    return false;
  }
  if (utteranceClosureRunConsumedByFollowingOwner(tokens, closure, idx, lookups)) {
    return false;
  }
  return closure.hostIdx >= start;
}

function utteranceClosureRunConsumedByFollowingOwner(
  tokens: readonly RuntimeHaruToken[],
  closure: UtteranceClosureRunEvidence,
  idx: number,
  lookups: LookupTables
): boolean {
  if (isLikenessCarrierHeadToken(tokens[idx])) {
    return true;
  }
  const cursor = new TokenCursor(tokens, idx, tokens.length, idx);
  const relation = quoteStructuralRelationAt(cursor, lookups);
  if (
    relation !== undefined &&
    relation.quote.contentSpan.start <= closure.hostIdx &&
    closure.hostIdx < relation.quote.contentSpan.endExclusive
  ) {
    return true;
  }
  const kaIdx = nextNonSpaceIndex(tokens, idx + 1, tokens.length);
  if (kaIdx !== null && kaOwnershipKindAt(tokens, kaIdx, lookups) === "toka_listing") {
    return true;
  }
  if (hostlessTerminalQuoteMarkerClosesSourceAt(tokens, idx)) {
    return true;
  }
  return false;
}

function spaceSeparatesTailChunkAfterYouNiCarrier(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  let prev = previousNonSpaceIndex(tokens, idx, start);
  while (prev !== null && ((tokens[prev]!.pos & POS0) === 助動詞0)) {
    prev = previousNonSpaceIndex(tokens, prev, start);
  }
  if (prev === null) {
    return false;
  }
  const carrier = tokens[prev]!;
  if ((carrier.pos & POS0) !== 動詞 || (carrier.pos & POS5A) === 連体形_) {
    return false;
  }
  const carrierForm = carrier.dictionaryForm ?? carrier.surface;
  const isCarrierVerb =
    carrierForm === "する" || carrierForm === "なる" || carrierForm === "なれる" || carrierForm === "成る" ||
    appearancePerceptionReadingForToken(carrier) !== null;
  if (!isCarrierVerb) {
    return false;
  }
  const niIdx = previousNonSpaceIndex(tokens, prev, 0);
  if (niIdx === null) {
    return false;
  }
  const mergedNoYouni = tokens[niIdx]!;
  if (mergedNoYouni.surface === "のように" && (mergedNoYouni.pos & POS01) === 助詞_格助詞) {
    return true;
  }
  if (
    copulaNiMarkerRelationForToken(tokens[niIdx], niIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  const youIdx = previousNonSpaceIndex(tokens, niIdx, 0);
  const you = youIdx !== null ? tokens[youIdx] : undefined;
  return (
    you !== undefined &&
    (you.surface === "よう" || you.surface === "様" || you.surface === "みたい" || you.surface === "そう") &&
    (you.pos & POS1) === 助動詞語幹
  );
}

function spaceSeparatesTailChunkFromConjunctionClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  if ((token.pos & POS0) !== 接続詞) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  const prevForm = tokens[prev]!.pos & POS5A;
  return prevForm === 終止形_ || prevForm === 命令形_ || isTeTailImperativeFormClosureAt(tokens, prev);
}

export function spaceSeparatesTailChunkFromFollowingPostverbClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  const prevForm = tokens[prev]!.pos & POS5A;
  if (prevForm !== 終止形_ && prevForm !== 命令形_ && !isTeTailImperativeFormClosureAt(tokens, prev)) {
    return false;
  }
  let prevIsPostverbOperatorTail = false;
  for (let teIdx = prev - 1; teIdx >= start; teIdx -= 1) {
    const relation = teDeContinuationRelationAt(tokens, teIdx, {
      requirement: "layout_nonspace_tail",
      consumers: ["tail_multi_clause"],
      lookups
    });
    if (relation !== null && relation.span.endExclusive === prev + 1) {
      prevIsPostverbOperatorTail = true;
      break;
    }
  }
  if (!prevIsPostverbOperatorTail) {
    return false;
  }
  for (let i = idx; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, INFLECTABLE_AUX_BITS)) {
      return true;
    }
  }
  return false;
}

function spaceSeparatesTailChunkAfterFiniteObligationClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  if (!hasSeparatedFinitePredicateBoundary(tokens, idx)) {
    return false;
  }
  for (let spanStart = idx - 1; spanStart >= start; spanStart -= 1) {
    if (obligationSpanEndExclusiveAt(tokens, spanStart) === idx) {
      return true;
    }
  }
  return false;
}

export function terminalCopulaSeparatedFromFollowingClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  const head = tokens[idx];
  if (head === undefined) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  if (!copulaPredicateChainEndsAt(tokens, start, idx, prev, lookups)) {
    return false;
  }
  return followingChunkHeadAdmitted(tokens, idx, head, tailChunkLeftClauseLayer(tokens, start, prev));
}

function copulaPredicateChainEndsAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  prev: number,
  lookups: LookupTables
): boolean {
  if (isClauseClosingCopulaTailEndToken(tokens[prev])) {
    return true;
  }
  if (copulaSupportChainClosesUnattributivelyAt(tokens, start, prev)) {
    return true;
  }
  if (homophonousTerminalCopulaChainLayerAt(tokens, start, prev) !== null) {
    return true;
  }
  if (negativeCopulaPredicateEndsAt(tokens, start, idx, lookups)) {
    return true;
  }
  return spaceSeparatesTailChunkAfterYouNiCarrier(tokens, start, idx);
}

function copulaSupportChainClosesUnattributivelyAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): boolean {
  const bodyIdx = copulaSupportChainBodyIndex(tokens, prev, isVolitionalInflection);
  if (bodyIdx === null || bodyIdx - 1 < start || !copulaSupportMarkerOwnsDeAt(tokens, bodyIdx - 1)) {
    return false;
  }
  return !conjecturalCopulaAttributiveEndpointClaimed(tokens, prev);
}

type HomophonousTerminalCopulaLayer = "support" | "simple_tensed";

function homophonousTerminalCopulaChainLayerAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): HomophonousTerminalCopulaLayer | null {
  const supportBodyIdx = copulaSupportChainBodyIndex(tokens, prev, isTerminalInflection);
  if (
    supportBodyIdx !== null &&
    supportBodyIdx - 1 >= start &&
    copulaSupportMarkerOwnsDeAt(tokens, supportBodyIdx - 1)
  ) {
    return "support";
  }
  return simpleTensedCopulaChainClosesAt(tokens, start, prev) ? "simple_tensed" : null;
}

function simpleTensedCopulaChainClosesAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): boolean {
  const chainEnd = tokens[prev];
  if (chainEnd === undefined || !isTerminalInflection(chainEnd.pos)) {
    return false;
  }
  const bodyIdx = copulaChainIndexBelowTenseAndPoliteLayers(tokens, prev);
  if (bodyIdx === prev || bodyIdx < start) {
    return false;
  }
  const body = tokens[bodyIdx];
  if (body === undefined || !isAuxiliaryToken(body)) {
    return false;
  }
  if (!isAssertiveCopulaFamilyPos(body.pos) && !isPoliteCopulaPos(body.pos)) {
    return false;
  }
  return isRenyouInflection(body.pos);
}

type TailChunkLeftClauseLayer = "clause_closing" | "clause_closing_adnominal_capable" | "non_closing";

function tailChunkLeftClauseLayer(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): TailChunkLeftClauseLayer {
  const token = tokens[prev];
  if (token === undefined) {
    return "non_closing";
  }
  if (homophonousTerminalCopulaChainLayerAt(tokens, start, prev) === "support") {
    return "clause_closing_adnominal_capable";
  }
  return isTerminalInflection(token.pos) || isVolitionalInflection(token.pos) ? "clause_closing" : "non_closing";
}

function followingChunkHeadAdmitted(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  head: RuntimeHaruToken,
  layer: TailChunkLeftClauseLayer
): boolean {
  if (isRefusedUtteranceHeadToken(head)) {
    return false;
  }
  if (layer === "non_closing") {
    return pos0in(head.pos, NOMINAL_BITS);
  }
  if (demoDiscourseUtteranceInitialMatchLengthAt(tokens, idx) !== null) {
    return true;
  }
  if (!isIndependentWordToken(head)) {
    return false;
  }
  return layer === "clause_closing" || !pos0in(head.pos, NOMINAL_BITS);
}

function negativeCopulaPredicateEndsAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  for (let hostIdx = idx - 1; hostIdx >= start; hostIdx -= 1) {
    if (negativeCopulaPredicateSpanEndExclusive(tokens, hostIdx, lookups) === idx) {
      return true;
    }
  }
  return false;
}

function isClauseClosingCopulaTailEndToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !isAuxiliaryToken(token)) {
    return false;
  }
  if (!isAssertiveCopulaFamilyPos(token.pos) && !isPoliteCopulaPos(token.pos)) {
    return false;
  }
  return isTerminalInflection(token.pos) || isVolitionalInflection(token.pos);
}
