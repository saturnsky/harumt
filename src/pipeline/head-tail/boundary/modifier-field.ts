import type { RuntimeHaruToken } from "../../../types/token.js";
import { TokenCursor } from "../../token-cursor.js";
import {
  isClauseAdverbialPreludeToken,
  isClauseArgumentOrTopicMarkerToken
} from "./clause-start.js";
import { copulaNiMarkerRelationForToken, nominalLinkMarkerRelationForToken } from "./marker.js";
import {
  isBoundaryPunctuationCategoryToken,
  isHardTerminalPunctuationToken
} from "./punctuation.js";
import { isParentheticalClosingToken, parentheticalSpanStartingAt } from "./parenthetical.js";
import {
  isAuxiliaryStemToken,
  isNaAdjCapable,
  isNaAdjCapableNoun,
  isNominalLike,
  POS0,
  接頭辞
} from "../../../types/pos.js";


export const MATRIX_MODIFIER_SPAN = 8;

export function matrixModifierAdvance(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  endExclusive: number
): number | null {
  const token = tokens[idx];
  if (token === undefined) {
    return null;
  }
  const pos0 = token.pos & POS0;
  if (isHardTerminalPunctuationToken(token)) {
    return null;
  }
  const parenthetical = parentheticalSpanStartingAt(tokens, idx, { consumers: ["tail_multi_clause"] });
  if (parenthetical !== null) {
    return parenthetical.span.endExclusive - idx;
  }
  if (isParentheticalClosingToken(token)) {
    return null;
  }
  const punctuation: boolean = isBoundaryPunctuationCategoryToken(token);
  if (punctuation) {
    return 1;
  }
  if (isClauseAdverbialPreludeToken(token) || isClauseArgumentOrTopicMarkerToken(token)) {
    return 1;
  }
  if (
    nominalLinkMarkerRelationForToken(token, idx, { consumers: ["tail_multi_clause"] }) !== null &&
    isMatrixNominalFrameHeadToken(tokens[idx + 1])
  ) {
    return 1;
  }
  if (isNaAdjCapable(token) && !isAuxiliaryStemToken(token)) {
    if (
      idx + 1 < endExclusive &&
      copulaNiMarkerRelationForToken(tokens[idx + 1], idx + 1, { consumers: ["tail_boundary_readiness"] }) !== null
    ) {
      return 2;
    }
    return isNaAdjCapableNoun(token) && isMatrixArgumentFrameMarkerToken(tokens[idx + 1], idx + 1)
      ? 1
      : null;
  }
  if (pos0 === 接頭辞) {
    return isMatrixNominalFrameHeadToken(tokens[idx + 1]) ? 1 : null;
  }
  if (isNominalLike(token)) {
    return 1;
  }
  return null;
}

export function skipMatrixFrameTrivia(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  endExclusive: number
): number {
  let probe = idx;
  while (probe < endExclusive) {
    const token = tokens[probe];
    if (token === undefined || isHardTerminalPunctuationToken(token)) {
      break;
    }
    const trivia: boolean = isBoundaryPunctuationCategoryToken(token);
    if (!trivia) {
      break;
    }
    probe += 1;
  }
  return probe;
}

export function isMatrixNominalFrameHeadToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return isNominalLike(token) || (token.pos & POS0) === 接頭辞;
}

export function isMatrixArgumentFrameMarkerToken(
  token: RuntimeHaruToken | undefined,
  idx: number
): boolean {
  if (token === undefined) {
    return false;
  }
  return isClauseArgumentOrTopicMarkerToken(token) ||
    nominalLinkMarkerRelationForToken(token, idx, { consumers: ["tail_multi_clause"] }) !== null;
}

export type MatrixPredicateReach = "predicate" | "consequentless" | "unresolved";

export interface MatrixPredicateDetectors {
  readonly registeredPredicateStart: (
    tokens: readonly RuntimeHaruToken[],
    idx: number
  ) => boolean;
  readonly openPredicateStart: (tokens: readonly RuntimeHaruToken[], idx: number) => boolean;
  readonly modifierSpan?: number;
}

export function matrixPredicateReach(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  detectors: MatrixPredicateDetectors
): MatrixPredicateReach {
  const { tokens } = cursor;
  const limit = Math.min(cursor.end, start + (detectors.modifierSpan ?? MATRIX_MODIFIER_SPAN));
  let idx = start;
  let sawMatrixMaterial = false;
  while (idx < limit) {
    if (detectors.registeredPredicateStart(tokens, idx)) {
      return "predicate";
    }
    const advance = matrixModifierAdvance(tokens, idx, limit);
    if (advance === null) {
      if (detectors.openPredicateStart(tokens, idx)) {
        return "predicate";
      }
      return isHardTerminalPunctuationToken(tokens[idx]) && sawMatrixMaterial
        ? "consequentless"
        : "unresolved";
    }
    if (!isBoundaryPunctuationCategoryToken(tokens[idx])) {
      sawMatrixMaterial = true;
    }
    idx += advance;
  }
  return idx >= cursor.end && sawMatrixMaterial ? "consequentless" : "unresolved";
}

export function matrixPredicateReachAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
  detectors: MatrixPredicateDetectors
): MatrixPredicateReach {
  return matrixPredicateReach(
    new TokenCursor(tokens, start, endExclusive, start),
    start,
    detectors
  );
}
