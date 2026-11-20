
import { POS0, isTerminalParticleToken, 副詞, 助詞 } from "../../types/pos.js";
import type { SeparationEvidence, SeparationKind } from "../../types/token.js";
import type { ClauseToken } from "./layout-types.js";

export interface ClauseTriviaToken {
  readonly pos: number;
}

export interface ClauseAdjacencyToken {
  readonly whitespaceBefore?: SeparationEvidence;
  readonly transparentPauseAfter?: boolean;
}

export function isDetachedFromPreviousToken<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  return separatedAs(tokens, idx, DETACHED_SEPARATIONS);
}

const TRANSPARENT_PAUSE_EVIDENCE: SeparationEvidence = {
  separation: "authored_pause",
  reason: "transparent_pause"
};

function separationsBefore<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): readonly SeparationEvidence[] {
  const evidence: SeparationEvidence[] = [];
  const whitespace = tokens[idx]?.whitespaceBefore;
  if (whitespace !== undefined) {
    evidence.push(whitespace);
  }
  if (tokens[idx - 1]?.transparentPauseAfter === true) {
    evidence.push(TRANSPARENT_PAUSE_EVIDENCE);
  }
  return evidence;
}

export function separationBefore<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): SeparationEvidence | null {
  return separationsBefore(tokens, idx)[0] ?? null;
}

export function isWitnessedChunkBreakBefore<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  const separation = tokens[idx]?.whitespaceBefore;
  return separation?.separation === "chunk_break" &&
    separation.runOrdinal !== undefined &&
    separation.chunkBreakWitnesses !== undefined &&
    separation.chunkBreakWitnesses.length > 0;
}

export function separatedAs<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number,
  admitted: ReadonlySet<SeparationKind>
): boolean {
  return separationsBefore(tokens, idx).some((evidence) => admitted.has(evidence.separation));
}

export const DETACHED_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "word_separator",
  "authored_pause"
]);

export const SEPARATION_OPENS_BOUNDARY: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "word_separator"
]);

export const SEPARATION_BREAKS_MORPHEME_CHAIN: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "authored_pause"
]);

export function isTransparentPauseSeparatedFromPreviousToken<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  return tokens[idx - 1]?.transparentPauseAfter === true;
}

export function isTransparentPauseSeparatedFromPreviousNonSpaceToken<T extends ClauseAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  return separatedAs(tokens, idx, AUTHORED_PAUSE_SEPARATIONS);
}

export const AUTHORED_PAUSE_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "authored_pause"
]);

export const NO_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>();

export interface ClauseSourceAdjacencyToken extends ClauseAdjacencyToken {
  readonly sourceOrdinal?: number;
  readonly sourceSpan?: {
    readonly startOrdinal: number;
    readonly endOrdinal: number;
  } | null;
}

export function isSourceSeparatedFromPreviousToken<T extends ClauseSourceAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  return isDetachedFromPreviousToken(tokens, idx) || hasSourceOrdinalGapBeforeToken(tokens, idx);
}

export function hasSourceOrdinalGapBeforeToken<T extends ClauseSourceAdjacencyToken>(
  tokens: readonly T[],
  idx: number
): boolean {
  const previousEnd = sourceEndOrdinal(tokens[idx - 1]);
  const currentStart = sourceStartOrdinal(tokens[idx]);
  return previousEnd !== undefined && currentStart !== undefined && currentStart > previousEnd;
}

function sourceStartOrdinal(token: ClauseSourceAdjacencyToken | undefined): number | undefined {
  return token?.sourceSpan?.startOrdinal ?? token?.sourceOrdinal;
}

function sourceEndOrdinal(token: ClauseSourceAdjacencyToken | undefined): number | undefined {
  return token?.sourceSpan?.endOrdinal ??
    (token?.sourceOrdinal === undefined ? undefined : token.sourceOrdinal + 1);
}

export interface ClauseTransparentEvidenceResult {
  readonly index: number;
  readonly skipped: number;
}

export interface ClauseTransparentEvidenceScanOptionsBase<T extends ClauseTriviaToken> {
  readonly maxSkip?: number;
  readonly isTransparentToken?: (token: T, index: number) => boolean;
}

export interface ClauseForwardTransparentEvidenceScanOptions<T extends ClauseTriviaToken>
  extends ClauseTransparentEvidenceScanOptionsBase<T> {
  readonly endExclusive?: number;
  readonly lowerBoundInclusive?: never;
  readonly transparentSpanEndExclusive?: (tokens: readonly T[], index: number, endExclusive: number) => number | null;
}

export interface ClauseReverseTransparentEvidenceScanOptions<T extends ClauseTriviaToken>
  extends ClauseTransparentEvidenceScanOptionsBase<T> {
  readonly endExclusive?: never;
  readonly lowerBoundInclusive?: number;
  readonly transparentSpanEndExclusive?: never;
}

export function isClauseSpaceOrAdverbToken(token: ClauseTriviaToken | undefined): boolean {
  if (token === undefined) return false;
  return (token.pos & POS0) === 副詞;
}

export function isClauseContentHeadTransparentToken(token: ClauseTriviaToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return pos0 === 助詞 || pos0 === 副詞;
}

export function nextNonSpaceIndex<T extends ClauseTriviaToken>(
  tokens: readonly T[],
  start: number,
  endExclusive = tokens.length
): number | null {
  return start < endExclusive ? start : null;
}

export function previousNonSpaceIndex<T extends ClauseTriviaToken>(
  tokens: readonly T[],
  start: number,
  lowerBoundInclusive = 0
): number | null {
  return start - 1 >= lowerBoundInclusive ? start - 1 : null;
}

export function nextTransparentEvidenceIndex<T extends ClauseTriviaToken>(
  tokens: readonly T[],
  start: number,
  options: ClauseForwardTransparentEvidenceScanOptions<T> = {}
): ClauseTransparentEvidenceResult | null {
  const endExclusive = options.endExclusive ?? tokens.length;
  const maxSkip = options.maxSkip ?? Number.POSITIVE_INFINITY;
  let skipped = 0;
  let index = start;
  while (index < endExclusive) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    const spanEnd = options.transparentSpanEndExclusive?.(tokens, index, endExclusive) ?? null;
    if (spanEnd !== null) {
      if (skipped >= maxSkip) {
        return null;
      }
      index = spanEnd;
      skipped += 1;
      continue;
    }
    if (options.isTransparentToken?.(token, index) === true) {
      if (skipped >= maxSkip) {
        return null;
      }
      index += 1;
      skipped += 1;
      continue;
    }
    if (skipped >= maxSkip) {
      return null;
    }
    return { index, skipped };
  }
  return null;
}

export function previousTransparentEvidenceIndex<T extends ClauseTriviaToken>(
  tokens: readonly T[],
  start: number,
  options: ClauseReverseTransparentEvidenceScanOptions<T> = {}
): ClauseTransparentEvidenceResult | null {
  const lowerBoundInclusive = options.lowerBoundInclusive ?? 0;
  const maxSkip = options.maxSkip ?? Number.POSITIVE_INFINITY;
  let skipped = 0;
  for (let index = start - 1; index >= lowerBoundInclusive; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (options.isTransparentToken?.(token, index) === true) {
      if (skipped >= maxSkip) {
        return null;
      }
      skipped += 1;
      continue;
    }
    if (skipped >= maxSkip) {
      return null;
    }
    return { index, skipped };
  }
  return null;
}

export function skipTerminalParticleRun(
  tokens: readonly ClauseToken[],
  startIdx: number,
  limit?: number
): number | null {
  let cursor: number | null = nextNonSpaceIndex(tokens, startIdx, limit);
  while (cursor !== null && isTerminalParticleToken(tokens[cursor]!)) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  return cursor;
}

export function lastNonSpaceIndexInRange<T extends ClauseToken>(
  tokens: readonly T[],
  start: number,
  end: number
): number | undefined {
  const last = Math.min(end, tokens.length) - 1;
  return last >= start ? last : undefined;
}

export function indicesInRange(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset);
}

export function lastNonSpaceIndex(tokens: readonly ClauseToken[], start: number, end: number): number | null {
  return previousNonSpaceIndex(tokens, end, start);
}
