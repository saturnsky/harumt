import { TokenCursor } from "../token-cursor.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken, isClauseTrailingPunctuationToken, isClausePunctuationToken, type ClauseTerminalPunctuationRunEvidence } from "./punctuation.js";
import { previousNonSpaceIndex } from "./trivia.js";
import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import { POS0, isBindingParticleToken, isNominalLike, isNominalizerParticleToken, isLexicalBareNaAdjStem, 感動詞, 記号, 補助記号 } from "../../types/pos.js";
import { isPostposedAdverbialReachTransparentToken } from "./reachability.js";
import type { ClauseToken, ClauseBoundaryEvent, ProjectionEvidenceLayout } from "./layout-types.js";
import { isFinitePredicateBoundaryLeft } from "./token-evidence.js";
import { skipTerminalParticleRun, lastNonSpaceIndexInRange } from "./trivia.js";
import { isBoundaryPunct, isAbsorbablePunct } from "./punctuation.js";
import type { ClauseLayout } from "./final-layout.js";
import { isInsideKaContinuationNominalFrameSurface } from "./nominal-frame-reach.js";
import type { ProtoClauseLayout } from "./proto-layout.js";

export function nextClauseNonPunctuationIndex<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  upperBoundExclusive: number
): number | null {
  let index = start;
  while (index < upperBoundExclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isClausePunctuationToken(token)) return index;
    index += 1;
  }
  return null;
}

export function previousClauseNonPunctuationIndex<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  lowerBoundInclusive: number
): number | null {
  let index = start;
  while (index >= lowerBoundInclusive) {
    const token = tokens[index];
    if (token === undefined) return null;
    if (!isClausePunctuationToken(token)) return index;
    index -= 1;
  }
  return null;
}

export function clauseCarriesInterrogativeForm(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  hostIdx: number,
  lookups: LookupTables
): boolean {
  const clause = proto.clauseOfToken(hostIdx);
  const clauseStart = clause?.start ?? 0;
  for (let index = hostIdx; index >= clauseStart; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface || "";
    if (
      lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_PRENOMINAL_FORMS.has(form) ||
      lookups.INTERROGATIVE_NOMINAL_FORMS.has(form)
    ) {
      return true;
    }
  }
  return false;
}

export function firstBoundaryEventInRangeOf(
  events: ReadonlyMap<number, ClauseBoundaryEvent>,
  start: number,
  endExclusive: number
): ClauseBoundaryEvent | undefined {
  for (const event of events.values()) {
    if (event.splitAt >= endExclusive) {
      return undefined;
    }
    if (event.splitAt >= start) {
      return event;
    }
  }
  return undefined;
}

export function boundaryEventsInRangeOf(
  events: ReadonlyMap<number, ClauseBoundaryEvent>,
  start: number,
  endExclusive: number
): readonly ClauseBoundaryEvent[] {
  const inRange: ClauseBoundaryEvent[] = [];
  for (const event of events.values()) {
    if (event.splitAt >= endExclusive) {
      break;
    }
    if (event.splitAt >= start) {
      inRange.push(event);
    }
  }
  return inRange;
}

function nominalizedClauseSubjectMarkerAt(
  tokens: readonly ClauseToken[],
  idx: number,
  floor: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isBindingParticleToken(token)) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx, floor);
  if (hostIdx === null) {
    return false;
  }
  const host = tokens[hostIdx]!;
  if (isNominalizerParticleToken(host)) {
    return true;
  }
  if (!isNominalLike(host)) {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, hostIdx, floor);
  return leftIdx !== null && isFinitePredicateBoundaryLeft(tokens[leftIdx]);
}

function segmentFinalNominalPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || (!isNominalLike(token) && !isLexicalBareNaAdjStem(token))) {
    return false;
  }
  const cursor = skipTerminalParticleRun(tokens, idx + 1, limit);
  return cursor === null || isClausePunctuationToken(tokens[cursor]);
}

export function findPrecedingPredicateEvidenceIndex(
  layout: ProjectionEvidenceLayout & { clauseOfToken(tokenIdx: number): { start: number } | undefined },
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  options: { readonly limit?: number; readonly includeAuxiliary?: boolean },
  isEvidence: (token: ClauseToken, index: number) => boolean
): number | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return null;
  }
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, tokenIdx);
  const start = Math.max(evidenceWindow?.start ?? clause.start, options.limit ?? 0);
  for (let index = tokenIdx - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return null;
    }
    if (isEvidence(token, index)) {
      return index;
    }
    if (segmentFinalNominalPredicateAt(tokens, index, tokenIdx)) {
      return index;
    }
    if (nominalizedClauseSubjectMarkerAt(tokens, index, start)) {
      return null;
    }
    if (!isPostposedAdverbialReachTransparentToken(token)) {
      return null;
    }
  }
  return null;
}

export function findFollowingPredicateEvidenceIndex(
  layout: ProjectionEvidenceLayout & { clauseOfToken(tokenIdx: number): { end: number } | undefined },
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  options: { readonly limit?: number; readonly includeAuxiliary?: boolean },
  isEvidence: (token: ClauseToken, index: number) => boolean
): number | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return null;
  }
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, tokenIdx);
  const end = Math.min(evidenceWindow?.end ?? clause.end, options.limit ?? tokens.length);
  const c = new TokenCursor(tokens, tokenIdx + 1, end);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined || isAbsorbablePunct(token)) {
      c.advance();
      continue;
    }
    if (isBoundaryPunct(token)) {
      return null;
    }
    if (isEvidence(token, c.pos)) {
      return c.pos;
    }
    c.advance();
  }
  return null;
}

export function extraClausalRun(tokens: readonly ClauseToken[], start: number, endExclusive: number): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const pos0 = (tokens[index]?.pos ?? 0) & POS0;
    if (pos0 !== 補助記号 && pos0 !== 記号 && pos0 !== 感動詞) {
      return false;
    }
  }
  return true;
}

export function utteranceRangeOfTokenIn(
  tokenCount: number,
  terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[],
  tokenIdx: number
): { readonly start: number; readonly endExclusive: number } {
  let start = 0;
  let endExclusive = tokenCount;
  for (const run of terminalPunctuationRuns) {
    if (run.span.endExclusive <= tokenIdx) {
      start = Math.max(start, run.span.endExclusive);
      continue;
    }
    if (run.span.start > tokenIdx) {
      endExclusive = Math.min(endExclusive, run.span.start);
    }
  }
  return { start, endExclusive };
}

export interface ClauseProjectionEvidenceWindow {
  readonly start: number;
  readonly end: number;
}

export function clauseProjectionEvidenceWindowForToken<T extends ClauseToken>(
  layout: ProjectionEvidenceLayout,
  tokens: readonly T[],
  tokenIdx: number
): ClauseProjectionEvidenceWindow | undefined {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return undefined;
  }
  let start = clause.start;
  let end = clause.end;
  const clauseIndex = layout.clauseIndexOfToken(tokenIdx);

  while (start > 0) {
    const currentClauseIndex = layout.clauseIndexOfToken(start);
    const previousClause = layout.clauseOfToken(start - 1);
    if (previousClause === undefined || previousClause.end !== start) {
      break;
    }
    if (previousClause.kind === "relative" && previousClause.parentIdx === currentClauseIndex) {
      start = previousClause.start;
      continue;
    }
    const boundary = lastNonSpaceIndexInRange(tokens, previousClause.start, previousClause.end);
    if (boundary === undefined || !isClauseEvidenceTransparentPunctuation(tokens[boundary]!)) {
      break;
    }
    start = previousClause.start;
  }

  while (end < tokens.length) {
    const boundary = lastNonSpaceIndexInRange(tokens, start, end);
    if (boundary === undefined || !isClauseEvidenceTransparentPunctuation(tokens[boundary]!)) {
      break;
    }
    const nextClause = layout.clauseOfToken(end);
    if (nextClause === undefined || nextClause.start !== end) {
      break;
    }
    end = nextClause.end;
  }
  if (
    clause.kind === "relative" &&
    clause.parentIdx !== null &&
    isInsideKaContinuationNominalFrameSurface(tokens, tokenIdx)
  ) {
    const parentClauseIndex = layout.clauseIndexOfToken(clause.end);
    const parentClause = layout.clauseOfToken(clause.end);
    if (
      parentClause !== undefined &&
      parentClauseIndex === clause.parentIdx &&
      parentClause.start === clause.end &&
      parentClauseIndex === clauseIndex + 1
    ) {
      end = Math.max(end, parentClause.end);
    }
  }

  return { start, end };
}

export interface PauseEdgeArgumentScope {
  readonly start: number;
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
}

export interface PauseEdgeScopeLayout extends ProjectionEvidenceLayout {
  readonly quoteSpans: readonly (readonly [number, number])[];
  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined;
  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined;
}

export function pauseEdgeArgumentScopeAt<T extends ClauseToken>(
  layout: PauseEdgeScopeLayout,
  tokens: readonly T[],
  edgeIdx: number
): PauseEdgeArgumentScope {
  const window = clauseProjectionEvidenceWindowForToken(layout, tokens, edgeIdx);
  let start = window?.start ?? edgeIdx;
  const enclosing = layout.enclosingQuoteSpan(edgeIdx);
  if (enclosing !== undefined) {
    start = Math.max(start, enclosing[0] + 1);
  }
  for (const [, closeIdx] of layout.quoteSpans) {
    if (closeIdx < edgeIdx) {
      start = Math.max(start, closeIdx + 1);
    }
  }
  return {
    start,
    balancedDelimiterSpanEndingAt: (closingIdx) => layout.balancedDelimiterSpanEndingAt(closingIdx)
  };
}

export function clauseSentenceOrdinals(
  layout: ClauseLayout,
  tokens: readonly ClauseToken[]
): readonly number[] {
  const ordinals: number[] = [];
  let sentence = 0;
  for (const clause of layout.clauses) {
    ordinals.push(sentence);
    let idx = clause.end - 1;
    while (idx >= clause.start) {
      const token = tokens[idx];
      if (token === undefined || isClauseTrailingPunctuationToken(token)) {
        idx -= 1;
        continue;
      }
      break;
    }
    if (idx >= clause.start && isClauseHardTerminalPunctuationToken(tokens[idx])) {
      sentence += 1;
    }
  }
  return ordinals;
}
