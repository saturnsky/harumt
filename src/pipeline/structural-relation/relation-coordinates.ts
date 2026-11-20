import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseNominalClosureAnchor, ClauseToken } from "../clause-layout/layout-types.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import type { ContentMap } from "../particles/index.js";
import type { StructuralAnchor, StructuralRelationNode, StructuralRelationTargetSpan, StructuralRelationTokenSpan } from "./types.js";

export function hasHardSentenceBoundaryBetween(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (token !== undefined && isHardTerminalPunctuationToken(token)) {
      return true;
    }
  }
  return false;
}

export function markerSurface(tokens: readonly ClauseToken[], start: number, endExclusive: number): string {
  return tokens.slice(start, endExclusive).map((token) => token.surface).join("");
}

export function buildStructuralRelationNodes(layout: ClauseLayout, contentMap: ContentMap): readonly StructuralRelationNode[] {
  return layout.clauses.map((clause, clauseIndex): StructuralRelationNode => {
    const contentSpanStart = contentSpanStartForClause(clause.start, clause.end, clause.primaryPredicate, contentMap);
    return {
      id: structuralRelationNodeId(clauseIndex),
      span: tokenSpan(clause.start, clause.end),
      kind: clause.kind,
      predicateIndex: clause.primaryPredicate,
      renderHandle: null,
      contentSpanId: contentSpanStart === null ? null : structuralRelationContentSpanId(contentSpanStart),
    };
  });
}

export function clauseAnchor(nodes: readonly StructuralRelationNode[], clauseIndex: number): StructuralAnchor {
  const node = nodes[clauseIndex];
  return {
    kind: "clause",
    clauseId: node?.id ?? structuralRelationNodeId(clauseIndex),
    span: node?.span ?? tokenSpan(0, 0),
    predicateIdx: node?.predicateIndex ?? null,
  };
}

export function spanAnchor(options: {
  readonly start: number;
  readonly endExclusive: number;
  readonly clauseIndex: number | null;
}): StructuralAnchor {
  return {
    kind: "span",
    span: tokenSpan(options.start, options.endExclusive),
    clauseId: options.clauseIndex === null || options.clauseIndex < 0
      ? null
      : structuralRelationNodeId(options.clauseIndex),
  };
}

export function predicateAnchor(predicateIdx: number, clauseIndex: number | null): StructuralAnchor {
  return {
    kind: "predicate",
    predicateIdx,
    clauseId: clauseIndex === null || clauseIndex < 0
      ? null
      : structuralRelationNodeId(clauseIndex),
    span: tokenSpan(predicateIdx, predicateIdx + 1),
  };
}

export function targetSpanAnchor(targetSpan: StructuralRelationTargetSpan): StructuralAnchor {
  if (targetSpan.kind === "noun_phrase") {
    return {
      kind: "noun_phrase",
      span: tokenSpan(targetSpan.start, targetSpan.endExclusive),
      headIdx: targetSpan.endExclusive > targetSpan.start ? targetSpan.endExclusive - 1 : null,
    };
  }
  return {
    kind: "span",
    span: tokenSpan(targetSpan.start, targetSpan.endExclusive),
    clauseId: null,
  };
}

export function nounPhraseAnchor(anchor: ClauseNominalClosureAnchor): StructuralAnchor {
  return {
    kind: "noun_phrase",
    span: tokenSpan(anchor.span.start, anchor.span.endExclusive),
    headIdx: anchor.headIdx,
  };
}

function contentSpanStartForClause(
  start: number,
  endExclusive: number,
  primaryPredicate: number | null,
  contentMap: ContentMap,
): number | null {
  if (primaryPredicate !== null && contentMap.has(primaryPredicate)) {
    return primaryPredicate;
  }
  const sortedContentStarts = Array.from(contentMap.keys()).sort((left, right) => left - right);
  for (const contentStart of sortedContentStarts) {
    if (start <= contentStart && contentStart < endExclusive) {
      return contentStart;
    }
  }
  return null;
}

export function structuralRelationNodeId(clauseIndex: number): string {
  return `clause:${clauseIndex}`;
}

export function structuralRelationContentSpanId(contentStart: number): string {
  return `content:${contentStart}`;
}

export function nextClauseIndex(layout: ClauseLayout, sourceClauseIndex: number): number | null {
  const next = sourceClauseIndex + 1;
  return next < layout.clauses.length ? next : null;
}

export function nextContentTokenIndex(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): number | null {
  for (let index = start; index < upperBoundExclusive; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return index;
  }
  return null;
}

export function tokenSpan(start: number, endExclusive: number): StructuralRelationTokenSpan {
  return { start, endExclusive };
}
