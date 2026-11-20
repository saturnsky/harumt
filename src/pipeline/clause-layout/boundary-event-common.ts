import { TokenCursor } from "../token-cursor.js";
import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import type { BoundaryKind, ClauseToken } from "./layout-types.js";
import { isClausePredicateEvidenceToken } from "./token-evidence.js";
import { isBoundaryPunct, isAbsorbablePunct } from "./punctuation.js";
import type { ClauseBoundaryDetectionContext, ClauseBoundaryDetectionState } from "./boundary-detection.js";

const BOUNDARY_KIND_DECISION_ORDER = [
  "attributive",
  "connective",
  "punctuation"
] as const satisfies readonly BoundaryKind[];

export function upsertBoundaryEvent(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  splitAt: number,
  kind: BoundaryKind,
  evidence: { readonly witnessesWhitespaceSplit?: boolean } = {}
): void {
  const { n, zeroNominalizedParallelMoInteriorSplits } = ctx;
  const { raw, nonWhitespaceWitnessSplits, whitespaceWitnessSplits } = state;
  if (splitAt <= 0 || splitAt >= n || zeroNominalizedParallelMoInteriorSplits.has(splitAt)) {
    return;
  }
  (evidence.witnessesWhitespaceSplit === false ? nonWhitespaceWitnessSplits : whitespaceWitnessSplits)
    .add(splitAt);
  const existing = raw.get(splitAt);
  if (existing === undefined || preferredBoundaryKind(kind, existing) === kind) {
    raw.set(splitAt, kind);
  }
}

function preferredBoundaryKind(left: BoundaryKind, right: BoundaryKind): BoundaryKind {
  for (const kind of BOUNDARY_KIND_DECISION_ORDER) {
    if (left === kind || right === kind) {
      return kind;
    }
  }
  return left;
}

export function hasFollowingClausePredicateEvidence(
  cursor: TokenCursor<ClauseToken>,
  balancedSpanOpeningAt?: (openingIdx: number) => BalancedDelimiterSpan | undefined
): boolean {
  const { tokens } = cursor;
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const span = balancedSpanOpeningAt?.(index);
    if (span !== undefined) {
      index = span.endExclusive - 1;
      continue;
    }
    const token = tokens[index];
    if (token === undefined || isAbsorbablePunct(token)) {
      continue;
    }
    if (isBoundaryPunct(token)) {
      return false;
    }
    if (isClausePredicateEvidenceToken(token)) {
      return true;
    }
  }
  return false;
}
