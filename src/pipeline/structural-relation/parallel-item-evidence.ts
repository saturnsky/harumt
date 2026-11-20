import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClauseEvidenceTransparentPunctuation } from "../clause-layout/punctuation.js";
import { TokenCursor } from "../token-cursor.js";
import type { ContentMap } from "../particles/index.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { tailRootClosesWithBareKeijoujiAttributive } from "../head-tail/tail/predicate-root/inspect.js";
import type { StructuralRelationMarkerSpan } from "./types.js";
import { POS0, pos0in, PREDICATE_AUX_BITS } from "../../types/pos.js";

export function nextParallelItemStart(
  cursor: TokenCursor<ClauseToken>,
): number | null {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isClauseEvidenceTransparentPunctuation(token)) {
      c.advance();
      continue;
    }
    return c.pos;
  }
  return null;
}

export function parallelItemStartBeforeMarker(
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  markerStart: number,
): number | null {
  const clauseIndex = layout.clauseIndexOfToken(markerStart);
  const clause = clauseIndex < 0 ? undefined : layout.clauses[clauseIndex];
  let start = clause?.start ?? 0;
  for (let index = markerStart - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      start = index + 1;
      break;
    }
  }
  return nextParallelItemStart(new TokenCursor(tokens, start, markerStart));
}

export function spanHasPredicateLikeToken(
  cursor: TokenCursor<ClauseToken>,
  contentMap: ContentMap | null,
): boolean {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isParallelPredicateToken(token)) {
      return true;
    }
    const plan = contentMap?.get(c.pos)?.renderPlan ?? null;
    if (isKaParallelPredicateEvidencePlan(plan)) {
      return true;
    }
    c.advance();
  }
  return false;
}

export function isKaParallelPredicateEvidencePlan(plan: RenderPlan | null): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) &&
    !tailRootClosesWithBareKeijoujiAttributive(plan.realization.root);
}

export function isParallelPredicateToken(token: ClauseToken | undefined): boolean {
  const pos0 = (token?.pos ?? 0) & POS0;
  return pos0in(pos0, PREDICATE_AUX_BITS);
}

export function parallelSeparatorSpans(
  cursor: TokenCursor<ClauseToken>,
  role: string,
): readonly StructuralRelationMarkerSpan[] {
  const spans: StructuralRelationMarkerSpan[] = [];
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isClauseEvidenceTransparentPunctuation(token)) {
      spans.push({
        start: c.pos,
        endExclusive: c.pos + 1,
        surface: token.surface,
        role,
      });
    }
    c.advance();
  }
  return spans;
}
