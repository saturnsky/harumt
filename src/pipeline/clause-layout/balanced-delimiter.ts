import type { RuntimeHaruToken } from "../../types/token.js";
import {
  isParentheticalClosingToken,
  parentheticalSpanEndingAt
} from "../head-tail/boundary/parenthetical.js";
import type { ParentheticalSpanRole } from "../head-tail/boundary/relation.js";
import { previousNonSpaceIndex } from "./trivia.js";

export interface BalancedDelimiterSpan {
  readonly start: number;
  readonly endExclusive: number;
  readonly openingIdx: number;
  readonly closingIdx: number;
  readonly contentEndExclusive: number;
  readonly role: ParentheticalSpanRole;
}

export function collectBalancedDelimiterSpans(
  tokens: readonly RuntimeHaruToken[]
): readonly BalancedDelimiterSpan[] {
  const spans: BalancedDelimiterSpan[] = [];
  for (const [closeIdx, token] of tokens.entries()) {
    if (!isParentheticalClosingToken(token)) {
      continue;
    }
    const span = parentheticalSpanEndingAt(tokens, closeIdx, { consumers: ["nominal_head_parser"] });
    if (span !== null) {
      spans.push({
        start: span.span.start,
        endExclusive: span.span.endExclusive,
        openingIdx: span.openingIdx,
        closingIdx: span.closingIdx,
        contentEndExclusive:
          (previousNonSpaceIndex(tokens, span.closingIdx, span.openingIdx + 1) ?? span.openingIdx) + 1,
        role: span.role
      });
    }
  }
  return spans;
}

export function balancedDelimiterSpanEndingAtIn(
  spans: readonly BalancedDelimiterSpan[],
  closingIdx: number
): BalancedDelimiterSpan | undefined {
  return spans.find((span) => span.closingIdx === closingIdx);
}

export function balancedDelimiterSpanOpeningAtIn(
  spans: readonly BalancedDelimiterSpan[],
  openingIdx: number
): BalancedDelimiterSpan | undefined {
  return spans.find((span) => span.openingIdx === openingIdx);
}

export function enclosingBalancedSpanIn(
  spans: readonly BalancedDelimiterSpan[],
  tokenIdx: number
): BalancedDelimiterSpan | undefined {
  return spans.find((span) => span.start < tokenIdx && tokenIdx < span.endExclusive - 1);
}
