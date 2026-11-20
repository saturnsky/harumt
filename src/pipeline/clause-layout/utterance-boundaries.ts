import { kaMarkerRelationForToken, predicateNominalizerRelationForToken, topicFocusMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { teUtteranceFinalLeftAt } from "./chuushi-closure.js";
import { kaOwnershipKindAt, terminalQuestionKaRelationAt } from "../head-tail/boundary/ka-ownership.js";
import { isBoundaryPunctuationCategoryToken, isTrailingPunctuationToken, isWeakPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { teIisashiSignalsAt } from "./speech-act.js";
import type { LookupTables } from "../lookup-tables.js";
import { collectClauseTerminalPunctuationRunEvidence, isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken, isClauseTrailingPunctuationToken, isClausePunctuationToken, type ClauseTerminalPunctuationRunEvidence } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, isTransparentPauseSeparatedFromPreviousNonSpaceToken, DETACHED_SEPARATIONS, separatedAs } from "./trivia.js";
import { copulaHostParticleMarkerSubtype } from "./particle-phrase-copula.js";
import { balancedDelimiterSpanEndingAtIn, type BalancedDelimiterSpan } from "./balanced-delimiter.js";
import { runClosesUtteranceAs, utteranceClosureRunAfter, type UtteranceClosureKind, type UtteranceClosureRunEvidence, type UtteranceClosureRunKind } from "./utterance-closure.js";
import { demoDiscourseUtteranceInitialMatchLengthAt, isUtteranceBoundaryPunctuationToken, utteranceInitialDetachedEdgeQualifies, utteranceInitialPauseEdgeVerdict, type UtteranceInitialPauseEdgeVerdict } from "../demo-discourse.js";
import { POS0, POS01, POS4, POS5A, isNominalLike, isProperPersonNameToken, isBungoInflectClass, isTerminalParticleToken, isVerbPredicateToken, pos0in, 意志推量形_, 記号, 形容詞0, 終止形_, 助動詞, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 助動詞_ヌ, 接頭辞, 接尾辞, 動詞, 助詞_副助詞, 助詞_準体助詞, 補助記号, 補助記号_括弧開, 補助記号_括弧閉, 名詞, 名詞_固有名詞, INFLECTABLE_BITS, 助詞_格助詞, 助詞_係助詞, isClauseClosingInflection, isClosingCopulaFamilyToken } from "../../types/pos.js";
import type { ClauseToken, DemoDiscourseLeftBoundaryEvidenceKind, DemoDiscourseLeftBoundaryEvidence } from "./layout-types.js";
import { clauseCarriesInterrogativeForm, type PauseEdgeArgumentScope, type PauseEdgeScopeLayout, pauseEdgeArgumentScopeAt } from "./navigation.js";
import { upsertBoundaryEvent } from "./boundary-event-common.js";
import { isFinitePredicateBoundaryLeft, isSubjectTopicParticle } from "./token-evidence.js";
import { isPersonReferringHeadToken } from "./vocative.js";
import { detachedRemainderCannotGovernNominalPhrase, isCopulaConditionalBoundaryLeft } from "./connective-boundaries.js";
import type { ProtoClauseLayout } from "./proto-layout.js";
import type { ClauseBoundaryDetectionContext, ClauseBoundaryDetectionState } from "./boundary-detection.js";
import type { RenyouClosureBoundaryEvents } from "./boundary-settlement.js";

function collectUtteranceClosureRunEvidence(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables
): ReadonlyMap<number, UtteranceClosureRunEvidence> {
  const runs = new Map<number, UtteranceClosureRunEvidence>();
  let index = 0;
  while (index < tokens.length) {
    const run = utteranceClosureRunFrom(tokens, index, lookups);
    if (run === null) {
      index += 1;
      continue;
    }
    if (run.endIdx !== null) {
      const bareNodaOnly = run.sawNodaMarker && !run.sawTerminalCopula && run.terminalParticleCount === 0;
      const kind: UtteranceClosureRunKind =
        !bareNodaOnly
          ? (run.terminalParticleCount > 0 ? "terminal_particle_run" : "terminal_copula_run")
          : clauseCarriesInterrogativeForm(tokens, proto, run.hostIdx, lookups)
            ? "interrogative_noda_run"
            : "formal_noun_dependent";
      runs.set(run.endIdx, {
        kind: "utteranceClosureRun",
        run: kind,
        endIdx: run.endIdx,
        hostIdx: run.hostIdx,
        ...(kind === "terminal_particle_run" && run.terminalParticleStartIdx !== null
          ? { terminalParticleStartIdx: run.terminalParticleStartIdx }
          : {})
      });
    }
    index = Math.max(run.scanNext, index + 1);
  }
  collectPoliteTerminalChainClosureRuns(tokens, proto, lookups, runs);
  return runs;
}

function collectPoliteTerminalChainClosureRuns(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables,
  runs: Map<number, UtteranceClosureRunEvidence>
): void {
  const formulaicHostLemmas = lookups.GRAMMAR_BOUNDARY_POLITE_FORMULAIC_TERMINAL_HOST_LEMMAS;
  let index = 0;
  while (index < tokens.length) {
    if (((tokens[index]?.pos ?? 0) & POS0) !== 助動詞) {
      index += 1;
      continue;
    }
    const chainIndices: number[] = [];
    let cursor: number | null = index;
    while (cursor !== null && ((tokens[cursor]?.pos ?? 0) & POS0) === 助動詞) {
      chainIndices.push(cursor);
      cursor = nextNonSpaceIndex(tokens, cursor + 1);
    }
    const endIdx = cursor ?? tokens.length;
    const hostIdx = previousNonSpaceIndex(tokens, index);
    const chainPos4 = [...chainIndices].reverse().map((idx) => (tokens[idx]?.pos ?? 0) & POS4);
    const lastChainIdx = chainIndices[chainIndices.length - 1]!;
    const closingForm = ((tokens[lastChainIdx]?.pos ?? 0) & POS5A) === 終止形_;
    if (
      closingForm &&
      utteranceBoundarySignalAfter(tokens, proto, lastChainIdx, endIdx) &&
      !runs.has(endIdx) &&
      politeTerminalChainClosesUtterance(chainPos4, tokens[hostIdx ?? -1], formulaicHostLemmas)
    ) {
      runs.set(endIdx, {
        kind: "utteranceClosureRun",
        run: "polite_terminal_chain",
        endIdx,
        hostIdx: hostIdx ?? index
      });
    }
    index = chainIndices[chainIndices.length - 1]! + 1;
  }
}

const POLITE_TERMINAL_CHAIN_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

function utteranceBoundarySignalAfter(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  chainEndIdx: number,
  endIdx: number
): boolean {
  if (endIdx < tokens.length && separatedAs(tokens, endIdx, DETACHED_SEPARATIONS)) {
    return true;
  }
  return runClosesUtteranceAs(
    utteranceClosureRunAfter(proto, tokens, chainEndIdx + 1),
    POLITE_TERMINAL_CHAIN_CLOSING_KINDS
  );
}

export function isPoliteMasuChainTerminalEndAt(tokens: readonly ClauseToken[], lastIdx: number): boolean {
  const last = tokens[lastIdx];
  if (last === undefined || (last.pos & POS0) !== 助動詞 || (last.pos & POS5A) !== 終止形_) {
    return false;
  }
  for (let idx: number | null = lastIdx; idx !== null && ((tokens[idx]?.pos ?? 0) & POS0) === 助動詞; idx = previousNonSpaceIndex(tokens, idx)) {
    if (((tokens[idx]?.pos ?? 0) & POS4) === 助動詞_マス) {
      return true;
    }
  }
  return false;
}

function politeTerminalChainClosesUtterance(
  chainPos4: readonly number[],
  host: ClauseToken | undefined,
  formulaicHostLemmas: ReadonlySet<string>
): boolean {
  if (chainPos4.includes(助動詞_デス)) {
    return true;
  }
  const masuAt = chainPos4.indexOf(助動詞_マス);
  if (masuAt < 0) {
    return false;
  }
  if (chainPos4.slice(0, masuAt).includes(助動詞_ヌ)) {
    return true;
  }
  return host !== undefined && formulaicHostLemmas.has(host.dictionaryForm);
}

function utteranceClosureRunFrom(
  tokens: readonly ClauseToken[],
  startIdx: number,
  lookups: LookupTables
): {
  readonly hostIdx: number;
  readonly endIdx: number | null;
  readonly scanNext: number;
  readonly sawNodaMarker: boolean;
  readonly sawTerminalCopula: boolean;
  readonly terminalParticleCount: number;
  readonly terminalParticleStartIdx: number | null;
} | null {
  const first = tokens[startIdx];
  if (
    first === undefined ||
    (
      !isTerminalNodaMarkerToken(first, startIdx) &&
      !isClosingCopulaBoundaryToken(first) &&
      !isTerminalParticleToken(first)
    )
  ) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, startIdx);
  if (hostIdx === null || !isUtteranceClosingPredicateLeft(tokens[hostIdx])) {
    return null;
  }
  const runIndices: number[] = [];
  let cursor: number | null = startIdx;
  let sawNodaMarker = false;
  if (cursor !== null && isTerminalNodaMarkerToken(tokens[cursor], cursor)) {
    if (isContractedTerminalNodaMarkerToken(tokens[cursor], cursor) && isBungoInflectClass(tokens[hostIdx])) {
      return null;
    }
    sawNodaMarker = true;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  let sawTerminalCopula = false;
  if (cursor !== null && isClosingCopulaBoundaryToken(tokens[cursor])) {
    sawTerminalCopula = true;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  let terminalParticleCount = 0;
  const terminalParticleStartIdx = cursor;
  while (cursor !== null && isTerminalParticleToken(tokens[cursor]!)) {
    terminalParticleCount += 1;
    runIndices.push(cursor);
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  const lastRunIdx = runIndices[runIndices.length - 1];
  if (lastRunIdx === undefined) {
    return null;
  }
  const scanNext = lastRunIdx + 1;
  if (
    runIndices.some((idx) =>
      kaMarkerRelationForToken(tokens[idx], idx) !== null &&
      !politeTerminalQuestionKaClosesRun(tokens, idx, lookups))
  ) {
    return { hostIdx, endIdx: null, scanNext, sawNodaMarker, sawTerminalCopula, terminalParticleCount, terminalParticleStartIdx: null };
  }
  return {
    hostIdx,
    endIdx: cursor,
    scanNext,
    sawNodaMarker,
    sawTerminalCopula,
    terminalParticleCount,
    terminalParticleStartIdx: terminalParticleCount > 0 ? terminalParticleStartIdx : null
  };
}

function isUtteranceClosingPredicateLeft(token: ClauseToken | undefined): boolean {
  if (isFinitePredicateBoundaryLeft(token)) {
    return true;
  }
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 形容詞0 || pos0 === 助動詞) && (token.pos & POS5A) === 意志推量形_;
}

function politeTerminalQuestionKaClosesRun(
  tokens: readonly ClauseToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return terminalQuestionKaRelationAt(tokens, kaIdx, { lookups })?.evidence === "polite_host" &&
    kaOwnershipKindAt(tokens, kaIdx, lookups) === "question";
}

function isTerminalNodaMarkerToken(token: ClauseToken | undefined, index: number): boolean {
  return predicateNominalizerRelationForToken(token, index, {
    requirement: "terminal_noda_marker",
    consumers: ["clause_layout"]
  })?.nominalizerKind === "no";
}

function isContractedTerminalNodaMarkerToken(token: ClauseToken | undefined, index: number): boolean {
  return predicateNominalizerRelationForToken(token, index, {
    requirement: "terminal_noda_marker",
    acceptedSurfaces: ["ん", "ン"],
    consumers: ["clause_layout"]
  })?.nominalizerKind === "no";
}

function isClosingCopulaBoundaryToken(token: ClauseToken | undefined): boolean {
  return token !== undefined && isClosingCopulaFamilyToken(token);
}

function detachedTerminalNodaClauseClosureSplits(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): ReadonlySet<number> {
  const splits = new Set<number>();
  for (let index = 1; index < tokens.length; index += 1) {
    const splitAt = detachedTerminalNodaClauseClosureSplitAt(tokens, index, lookups);
    if (splitAt !== null) {
      splits.add(splitAt);
    }
  }
  return splits;
}

export function detachedTerminalNodaClauseClosureSplitAt(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): number | null {
  const marker = tokens[markerIdx];
  if (
    predicateNominalizerRelationForToken(marker, markerIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind !== "no"
  ) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (hostIdx === null || !isFinitePredicateBoundaryLeft(tokens[hostIdx])) {
    return null;
  }
  const runIndices: number[] = [markerIdx];
  for (;;) {
    const nextIdx = nextNonSpaceIndex(tokens, runIndices[runIndices.length - 1]! + 1);
    if (nextIdx === null || !isTerminalParticleToken(tokens[nextIdx]!)) {
      break;
    }
    runIndices.push(nextIdx);
  }
  const bareNodaRun =
    runIndices.length === 1 &&
    !isTerminalParticleToken(marker!) &&
    !isCopulaConditionalBoundaryLeft(tokens[hostIdx]);
  if (runIndices.some((index) => kaMarkerRelationForToken(tokens[index], index) !== null)) {
    return null;
  }
  const splitAt = nextNonSpaceIndex(tokens, runIndices[runIndices.length - 1]! + 1);
  if (splitAt === null || !separatedAs(tokens, splitAt, DETACHED_SEPARATIONS)) {
    return null;
  }
  if (isClausePunctuationToken(tokens[splitAt])) {
    return null;
  }
  if (bareNodaRun && !detachedRemainderCannotGovernNominalPhrase(tokens, splitAt, lookups)) {
    return null;
  }
  return splitAt;
}

function collectUtteranceOnsetLeftBoundaryEvidence(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  scope: UtteranceOnsetLeftBoundaryScope
): readonly DemoDiscourseLeftBoundaryEvidence[] {
  const evidence: DemoDiscourseLeftBoundaryEvidence[] = [];
  for (let index = 1; index < tokens.length; index += 1) {
    const found = utteranceOnsetLeftBoundaryEvidenceAt(tokens, index, lookups, scope);
    if (found !== null) {
      evidence.push({ kind: "demo_discourse_left_boundary", ...found, connectiveIdx: index });
    }
  }
  return evidence;
}

export interface UtteranceOnsetLeftBoundaryScope {
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
  pauseEdgeArgumentScopeAt(edgeIdx: number): PauseEdgeArgumentScope;
}

export function utteranceOnsetLeftBoundaryEvidenceAt(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  scope: UtteranceOnsetLeftBoundaryScope
): {
  readonly boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind;
  readonly markerIdx: number;
} | null {
  if (index < 1) {
    return null;
  }
  const matchLength = demoDiscourseUtteranceInitialMatchLengthAt(tokens, index);
  if (matchLength === null) {
    return null;
  }
  if (separatedAs(tokens, index, DETACHED_SEPARATIONS)) {
    const label = transcriptionSpeakerLabelRunBefore(tokens, index, lookups);
    if (label !== null && label.chainHasProperNoun) {
      return { boundaryKind: "speaker_label", markerIdx: label.headIdx };
    }
    const vocativeIdx = detachedVocativeHeadBefore(tokens, index, index + matchLength);
    if (vocativeIdx !== null) {
      return { boundaryKind: "detached_vocative", markerIdx: vocativeIdx };
    }
  }
  const closedUtteranceIdx = closedUtteranceQuoteBefore(tokens, index, scope);
  if (closedUtteranceIdx !== null) {
    return { boundaryKind: "pause_traversed_onset", markerIdx: closedUtteranceIdx };
  }
  const pauseEdgeIdx = pauseTraversedUtteranceOnsetEdgeAt(tokens, index, scope);
  return pauseEdgeIdx === null
    ? null
    : { boundaryKind: "pause_traversed_onset", markerIdx: pauseEdgeIdx };
}

export interface DetachedUtteranceOnsetEdge {
  readonly edgeIdx: number;
  readonly gapIdx: number | null;
}

export interface DetachedUtteranceOnsetEvidence {
  readonly queryIdx: number;
  readonly gapIdx: number;
  readonly edgeIdx: number;
}

export function detachedUtteranceOnsetEdgeAt(
  tokens: readonly ClauseToken[],
  index: number
): DetachedUtteranceOnsetEdge | null {
  if (index < 1) {
    return null;
  }
  let cursor = index;
  let gapIdx: number | null = null;
  for (let step = 0; step < tokens.length; step += 1) {
    if (gapIdx === null && separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      gapIdx = cursor;
    }
    const prevIdx = previousNonSpaceIndex(tokens, cursor);
    if (prevIdx === null) {
      return null;
    }
    const prev = tokens[prevIdx];
    if (prev === undefined || isTrailingPunctuationToken(prev)) {
      return null;
    }
    if (isUtteranceBoundaryPunctuationToken(prev)) {
      return { edgeIdx: prevIdx, gapIdx };
    }
    const pos0 = prev.pos & POS0;
    if (pos0 === 補助記号 || pos0 === 記号) {
      cursor = prevIdx;
      continue;
    }
    return gapIdx !== null && utteranceInitialDetachedEdgeQualifies(tokens, prevIdx)
      ? { edgeIdx: prevIdx, gapIdx }
      : null;
  }
  return null;
}

function collectDetachedUtteranceOnsetBoundaries(
  tokens: readonly ClauseToken[]
): ReadonlyMap<number, DetachedUtteranceOnsetEvidence> {
  const boundaries = new Map<number, DetachedUtteranceOnsetEvidence>();
  for (let index = 1; index < tokens.length; index += 1) {
    const isGapCoordinate = separatedAs(tokens, index, DETACHED_SEPARATIONS);
    const isRowCoordinate = demoDiscourseUtteranceInitialMatchLengthAt(tokens, index) !== null;
    if (!isGapCoordinate && !isRowCoordinate) {
      continue;
    }
    const edge = detachedUtteranceOnsetEdgeAt(tokens, index);
    if (edge === null || edge.gapIdx === null) {
      continue;
    }
    boundaries.set(index, {
      queryIdx: index,
      gapIdx: edge.gapIdx,
      edgeIdx: edge.edgeIdx
    });
  }
  return boundaries;
}

function closedUtteranceQuoteBefore(
  tokens: readonly ClauseToken[],
  index: number,
  scope: UtteranceOnsetLeftBoundaryScope
): number | null {
  const closeIdx = previousNonSpaceIndex(tokens, index);
  if (closeIdx === null) {
    return null;
  }
  const span = scope.balancedDelimiterSpanEndingAt(closeIdx);
  if (span === undefined || (span.role !== "explicit_quote_span" && span.role !== "bracketed_span")) {
    return null;
  }
  const contentEndIdx = previousNonSpaceIndex(tokens, span.closingIdx, span.openingIdx + 1);
  return contentEndIdx !== null && isClauseHardTerminalPunctuationToken(tokens[contentEndIdx])
    ? span.closingIdx
    : null;
}

export function copulaComplementLiesBeyondPauseAt(
  layout: PauseEdgeScopeLayout,
  tokens: readonly ClauseToken[],
  index: number
): boolean {
  if (!isCopulaTailContinuationStart(tokens[index]) || utterancePauseOnsetMarkerBefore(tokens, index) === null) {
    return false;
  }
  const scope: UtteranceOnsetLeftBoundaryScope = {
    balancedDelimiterSpanEndingAt: (closingIdx) => layout.balancedDelimiterSpanEndingAt(closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(layout, tokens, edgeIdx)
  };
  return pauseTraversedUtteranceOnsetEdgeAt(tokens, index, scope) === null;
}

function pauseTraversedUtteranceOnsetEdgeAt(
  tokens: readonly ClauseToken[],
  index: number,
  scope: UtteranceOnsetLeftBoundaryScope
): number | null {
  const marker = utterancePauseOnsetMarkerBefore(tokens, index);
  if (marker === null) {
    return null;
  }
  const pauseIdx = marker.markerIdx;
  let cursor = pauseIdx;
  for (let step = 0; step < tokens.length; step += 1) {
    const edgeIdx = previousNonSpaceIndex(tokens, cursor);
    if (edgeIdx === null) {
      return pauseIdx;
    }
    const edge = tokens[edgeIdx];
    if (edge === undefined) {
      return pauseIdx;
    }
    if (isTrailingPunctuationToken(edge)) {
      return null;
    }
    if (isWeakPunctuationToken(edge)) {
      cursor = edgeIdx;
      continue;
    }
    if (isUtteranceBoundaryPunctuationToken(edge)) {
      return edgeIdx;
    }
    if (isBoundaryPunctuationCategoryToken(edge)) {
      cursor = edgeIdx;
      continue;
    }
    if (marker.kind !== "weak_pause" && copulaHostParticleMarkerSubtype(tokens[edgeIdx]) !== null) {
      return null;
    }
    return pauseEdgeVerdictAt(tokens, edgeIdx, scope.pauseEdgeArgumentScopeAt(edgeIdx)).grade === "complement"
      ? null
      : edgeIdx;
  }
  return null;
}

export function pauseEdgeVerdictAt(
  tokens: readonly ClauseToken[],
  edgeIdx: number,
  scope: PauseEdgeArgumentScope
): UtteranceInitialPauseEdgeVerdict {
  return utteranceInitialPauseEdgeVerdict(
    tokens,
    edgeIdx,
    hasOpenSubjectTopicArgumentBefore(tokens, edgeIdx, scope)
  );
}

function hasOpenSubjectTopicArgumentBefore(
  tokens: readonly ClauseToken[],
  edgeIdx: number,
  scope: PauseEdgeArgumentScope
): boolean {
  let verbTraversed = false;
  for (let idx = edgeIdx - 1; idx >= scope.start; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      return false;
    }
    if (
      (pos0in(token.pos, INFLECTABLE_BITS) || (token.pos & POS0) === 助動詞) &&
      isClauseClosingInflection(token.pos)
    ) {
      return false;
    }
    if (isVerbPredicateToken(token)) {
      verbTraversed = true;
      continue;
    }
    if (
      isSubjectTopicParticle(token) &&
      (!verbTraversed || isTopicMarkerToken(tokens, idx)) &&
      subjectTopicParticleHasContentHost(tokens, idx, scope)
    ) {
      return true;
    }
  }
  return false;
}

function isTopicMarkerToken(tokens: readonly ClauseToken[], idx: number): boolean {
  return topicFocusMarkerRelationForToken(tokens[idx], idx, {
    consumers: ["clause_layout"]
  })?.focusKind === "topic";
}

function subjectTopicParticleHasContentHost(
  tokens: readonly ClauseToken[],
  particleIdx: number,
  scope: PauseEdgeArgumentScope
): boolean {
  const topicMarker = isTopicMarkerToken(tokens, particleIdx);
  for (let idx = particleIdx - 1; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const mention = scope.balancedDelimiterSpanEndingAt(idx);
    if (
      mention !== undefined &&
      (mention.role === "explicit_quote_span" || mention.role === "bracketed_span")
    ) {
      return true;
    }
    if (idx < scope.start) {
      return false;
    }
    const particleSubtype = token.pos & POS01;
    if (particleSubtype === 助詞_係助詞 || particleSubtype === 助詞_副助詞) {
      continue;
    }
    if (particleSubtype === 助詞_格助詞) {
      if (!topicMarker) {
        return false;
      }
      continue;
    }
    if (particleSubtype === 助詞_準体助詞) {
      return true;
    }
    return isNominalLike(token);
  }
  return false;
}

type UtterancePauseOnsetMarkerKind = "weak_pause" | "transparent_pause" | "notation_run";

function utterancePauseOnsetMarkerBefore(
  tokens: readonly ClauseToken[],
  index: number
): { readonly markerIdx: number; readonly kind: UtterancePauseOnsetMarkerKind } | null {
  let cursor = index;
  let traversedNotationRun = false;
  for (let step = 0; step < tokens.length; step += 1) {
    if (isTransparentPauseSeparatedFromPreviousNonSpaceToken(tokens, cursor)) {
      return { markerIdx: cursor, kind: "transparent_pause" };
    }
    const prevIdx = previousNonSpaceIndex(tokens, cursor);
    if (prevIdx === null) {
      return null;
    }
    const prev = tokens[prevIdx];
    if (prev === undefined || isTrailingPunctuationToken(prev)) {
      return null;
    }
    if (isWeakPunctuationToken(prev)) {
      return { markerIdx: prevIdx, kind: "weak_pause" };
    }
    if (isBoundaryPunctuationCategoryToken(prev)) {
      traversedNotationRun = true;
      cursor = prevIdx;
      continue;
    }
    return traversedNotationRun ? { markerIdx: cursor, kind: "notation_run" } : null;
  }
  return null;
}

function isTranscriptionSpeakerLabelMarkerToken(token: ClauseToken, lookups: LookupTables): boolean {
  return (token.pos & POS0) === 補助記号 &&
    lookups.TRANSCRIPTION_SPEAKER_LABEL_MARKER_SURFACES.has(token.surface);
}

function isTranscriptionSpeakerLabelBodyToken(token: ClauseToken): boolean {
  const p0 = token.pos & POS0;
  if (p0 === 名詞 || p0 === 接尾辞 || p0 === 接頭辞 || p0 === 記号) {
    return true;
  }
  const p01 = token.pos & POS01;
  return p01 === 補助記号_括弧開 || p01 === 補助記号_括弧閉;
}

interface TranscriptionSpeakerLabelRun {
  readonly headIdx: number;
  readonly chainHasProperNoun: boolean;
}

function transcriptionSpeakerLabelRunBefore(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): TranscriptionSpeakerLabelRun | null {
  const headIdx = previousNonSpaceIndex(tokens, index);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (headIdx === null || head === undefined || !isPersonReferringHeadToken(head, lookups)) {
    return null;
  }
  let sawProperNoun = false;
  for (let cursor = headIdx; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return null;
    }
    if (isTranscriptionSpeakerLabelMarkerToken(token, lookups)) {
      const onset = transcriptionSpeakerLabelOnsetBefore(tokens, cursor, lookups);
      return onset === null
        ? null
        : { headIdx, chainHasProperNoun: sawProperNoun || onset.chainHasProperNoun };
    }
    if (!isTranscriptionSpeakerLabelBodyToken(token) || separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      return null;
    }
    if ((token.pos & POS01) === 名詞_固有名詞) {
      sawProperNoun = true;
    }
  }
  return null;
}

function transcriptionSpeakerLabelOnsetBefore(
  tokens: readonly ClauseToken[],
  markerIdx: number,
  lookups: LookupTables
): { readonly chainHasProperNoun: boolean } | null {
  const beforeIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (beforeIdx === null) {
    return { chainHasProperNoun: false };
  }
  const before = tokens[beforeIdx];
  if (before !== undefined && isClauseHardTerminalPunctuationToken(before)) {
    return { chainHasProperNoun: false };
  }
  if (!separatedAs(tokens, markerIdx, DETACHED_SEPARATIONS)) {
    return null;
  }
  const previousLabel = transcriptionSpeakerLabelRunBefore(tokens, markerIdx, lookups);
  return previousLabel === null ? null : { chainHasProperNoun: previousLabel.chainHasProperNoun };
}

function detachedVocativeHeadBefore(
  tokens: readonly ClauseToken[],
  index: number,
  connectiveEndExclusive: number
): number | null {
  const nameIdx = previousNonSpaceIndex(tokens, index);
  const name = nameIdx === null ? undefined : tokens[nameIdx];
  if (nameIdx === null || name === undefined || !isProperPersonNameToken(name)) {
    return null;
  }
  if (!separatedAs(tokens, nameIdx, DETACHED_SEPARATIONS)) {
    return null;
  }
  const edgeIdx = previousNonSpaceIndex(tokens, nameIdx);
  if (edgeIdx === null || !utteranceInitialDetachedEdgeQualifies(tokens, edgeIdx)) {
    return null;
  }
  return connectiveRightEdgeIsBroken(tokens, connectiveEndExclusive) ? nameIdx : null;
}

function connectiveRightEdgeIsBroken(tokens: readonly ClauseToken[], atIdx: number): boolean {
  const next = tokens[atIdx];
  if (next === undefined) {
    return true;
  }
  return separatedAs(tokens, atIdx, DETACHED_SEPARATIONS) || isUtteranceClosingPunct(next);
}

export interface UtteranceEdgeEvidence {
  readonly onsetScope: UtteranceOnsetLeftBoundaryScope;
  readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence>;
  readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
  readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[];
}

export function detectDetachedTerminalNodaClosureBoundaries(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState): ReadonlySet<number> {
  const { tokens, lookups } = ctx;
  const detachedTerminalNodaClosures = detachedTerminalNodaClauseClosureSplits(tokens, lookups);
  for (const splitAt of detachedTerminalNodaClosures) {
    upsertBoundaryEvent(ctx, state, splitAt, "punctuation");
  }
  return detachedTerminalNodaClosures;
}

export function collectUtteranceEdgeEvidence(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  renyou: RenyouClosureBoundaryEvents
): UtteranceEdgeEvidence {
  const { tokens, n, lookups, balancedDelimiterSpans, teRequestSets } = ctx;
  const { demoDiscourseLeftBoundaries, teUtteranceActs } = state;
  const { events, evidenceLayout } = renyou;
  const onsetScope: UtteranceOnsetLeftBoundaryScope = {
    balancedDelimiterSpanEndingAt: (closingIdx) =>
      balancedDelimiterSpanEndingAtIn(balancedDelimiterSpans, closingIdx),
    pauseEdgeArgumentScopeAt: (edgeIdx) => pauseEdgeArgumentScopeAt(evidenceLayout, tokens, edgeIdx)
  };
  demoDiscourseLeftBoundaries.push(
    ...collectUtteranceOnsetLeftBoundaryEvidence(tokens, lookups, onsetScope)
  );
  const clauseStarts = [0, ...events.map((event) => event.splitAt)];
  const clauseEnds = [...events.map((event) => event.splitAt), n];
  const utteranceClosureRuns = collectUtteranceClosureRunEvidence(tokens, evidenceLayout, lookups);
  const detachedUtteranceOnsetBoundaries = collectDetachedUtteranceOnsetBoundaries(tokens);
  for (const [index] of tokens.entries()) {
    if (teUtteranceActs.has(index)) {
      continue;
    }
    const finalLeft = teUtteranceFinalLeftAt(tokens, index);
    if (finalLeft !== null) {
      teUtteranceActs.set(index, {
        kind: "teUtteranceAct",
        connectiveIdx: finalLeft.connectiveIdx,
        predicateIdx: finalLeft.predicateIdx,
        position: "utterance_final",
        iisashiSignals: teIisashiSignalsAt(tokens, finalLeft, teRequestSets)
      });
    }
  }
  const terminalPunctuationRuns = collectClauseTerminalPunctuationRunEvidence(
    tokens,
    clauseStarts.map((start, index) => ({
      start,
      endExclusive: clauseEnds[index] ?? n
    }))
  );
  return { onsetScope, utteranceClosureRuns, detachedUtteranceOnsetBoundaries, terminalPunctuationRuns };
}

export function isUtteranceClosingPunct(token: ClauseToken): boolean {
  return isClauseHardTerminalPunctuationToken(token) || isClauseTrailingPunctuationToken(token);
}

export function isCopulaTailContinuationStart(token: ClauseToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  return token.dictionaryForm === "だ" || token.dictionaryForm === "です" || (token.pos & POS4) === 助動詞_ダ;
}
