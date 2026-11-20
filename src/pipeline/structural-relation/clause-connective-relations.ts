import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClausePunctuationToken } from "../clause-layout/punctuation.js";
import { relationConnectiveSpansAt, type RelationConnectiveSpanMatch } from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM } from "../head-tail/tail/te-tail-continuation-table.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { POS01, 助詞_接続助詞 } from "../../types/pos.js";
import { layoutBlocker, projectionUnavailable, structuralRelationDegraded } from "./diagnostics.js";
import type { StructuralRelationNode, StructuralRelation, StructuralRelationDiagnostic, StructuralRelationMarkerSpan, BuildStructuralRelationGraphOptions } from "./types.js";
import { collectListingExampleRelation } from "./tari-listing-relations.js";
import { collectPurposeModifierRelation, hasNounModifierTarget, shouldDeferContiguousForPurposeModifier } from "./purpose-relations.js";
import { clauseAnchor, spanAnchor, predicateAnchor, structuralRelationNodeId, nextClauseIndex, nextContentTokenIndex } from "./relation-coordinates.js";
import { type CollectResult, degraded, markerSpanFromMatch, projectionRequest, layoutBoundaryRelationPayload, renderEnabledRelationPayload, layoutBoundaryDiagnosticPayload } from "./connective-relation-match.js";
import { hasStrictReasonEvidence } from "./reason-relations.js";

export function collectContiguousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  cursor: TokenCursor<ClauseToken>,
): {
  readonly relations: readonly StructuralRelation[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
} {
  const relations: StructuralRelation[] = [];
  const diagnostics: StructuralRelationDiagnostic[] = [];
  const { tokens, layout } = options;
  while (cursor.pos < tokens.length) {
    const index = cursor.pos;
    const matches = relationConnectiveSpansAt(cursor);
    const nounModifierMatch = matches.find((candidate) => candidate.targetSlot === "noun_modifier");
    if (nounModifierMatch !== undefined) {
      if (shouldDeferContiguousForPurposeModifier(options, index, nounModifierMatch)) {
        cursor.advance(nounModifierMatch.tokenCount);
        continue;
      }
    }
    const match = matches.find((candidate) => candidate.markerPolicy !== "discontinuous" && candidate.targetSlot !== "noun_modifier") ?? null;
    if (match === null) {
      cursor.advance();
      continue;
    }
    const markerSpan = markerSpanFromMatch(index, match);
    const sourceClauseIndex = layout.clauseIndexOfToken(index);
    const markerEndClauseIndex = layout.clauseIndexOfToken(match.endExclusive - 1);
    if (sourceClauseIndex < 0 || markerEndClauseIndex < 0 || sourceClauseIndex !== markerEndClauseIndex) {
      diagnostics.push(layoutBlocker({
        message: `ClauseLayout splits relation marker ${match.surface}`,
        relationKind: match.relationPolicy,
        confidence: "strict",
        ...layoutBoundaryDiagnosticPayload(match),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    const sourceClause = layout.clauses[sourceClauseIndex];
    const targetClauseIndex = nextClauseIndex(layout, sourceClauseIndex);
    const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
    if (sourceClause === undefined || targetClauseIndex === null || targetClause === undefined) {
      diagnostics.push(structuralRelationDegraded({
        message: `relation marker ${match.surface} has no target clause`,
        relationKind: match.relationPolicy,
        confidence: "weak",
        ...layoutBoundaryDiagnosticPayload(match),
        ...(sourceClauseIndex < 0 ? {} : { clauseId: structuralRelationNodeId(sourceClauseIndex) }),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    if (match.relationPolicy === "reason" && !hasStrictReasonEvidence(tokens, sourceClause, markerSpan.start, match.endExclusive, options.contentMap)) {
      diagnostics.push(structuralRelationDegraded({
        message: `reason marker ${match.surface} lacks strict reason evidence`,
        relationKind: match.relationPolicy,
        confidence: "weak",
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    const projection = match.projection;
    if (projection === undefined) {
      diagnostics.push(projectionUnavailable({
        message: `relation marker ${match.surface} has no projection metadata`,
        relationKind: match.relationPolicy,
        confidence: "strict",
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpan,
        markerSpans: [markerSpan],
      }));
      cursor.advance(match.endExclusive - cursor.pos);
      continue;
    }
    relations.push({
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: projectionRequest(projection, match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    });
    cursor.advance(match.endExclusive - cursor.pos);
  }
  return { relations, diagnostics };
}

export function collectDiscontinuousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  cursor: TokenCursor<ClauseToken>,
): {
  readonly relations: readonly StructuralRelation[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
} {
  const relations: StructuralRelation[] = [];
  const diagnostics: StructuralRelationDiagnostic[] = [];
  const { tokens } = options;
  while (cursor.pos < tokens.length) {
    const index = cursor.pos;
    const matches = relationConnectiveSpansAt(cursor);
    let consumed = 1;
    for (const match of matches) {
      if (match.relationPolicy === "listing_example" && match.markerPolicy === "discontinuous") {
        const result = collectListingExampleRelation(options, nodes, index, match);
        pushCollectResult(result, relations, diagnostics);
        consumed = Math.max(consumed, match.tokenCount);
        continue;
      }
      if (match.relationPolicy === "correlative_degree" && match.markerPolicy === "discontinuous" && match.markerRole === "conditional_marker") {
        const result = collectCorrelativeDegreeRelation(options, nodes, index, match);
        pushCollectResult(result, relations, diagnostics);
        consumed = Math.max(consumed, match.tokenCount);
        continue;
      }
      if (match.relationPolicy === "purpose_modifier" && match.targetSlot === "noun_modifier") {
        if (hasNounModifierTarget(options, index, match)) {
          const result = collectPurposeModifierRelation(options, nodes, index, match);
          pushCollectResult(result, relations, diagnostics);
        }
        consumed = Math.max(consumed, match.tokenCount);
      }
    }
    cursor.advance(consumed);
  }
  return { relations, diagnostics };
}

export function collectTeAttendantSimultaneousRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  for (let clauseIndex = 0; clauseIndex < layout.clauses.length - 1; clauseIndex += 1) {
    const sourceClause = layout.clauses[clauseIndex];
    const targetClauseIndex = nextClauseIndex(layout, clauseIndex);
    const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
    if (sourceClause === undefined || targetClauseIndex === null || targetClause === undefined) {
      continue;
    }
    if (sourceClause.terminatedBy !== "connective") {
      continue;
    }
    const sourcePredicate = sourceClause.predicates[sourceClause.predicates.length - 1] ?? null;
    if (sourcePredicate === null) {
      continue;
    }
    const span = contentMap.get(sourcePredicate);
    if (span?.teConnectiveClassificationState?.committed?.surfaceRole !== "manner") {
      continue;
    }
    const markerSpan = teConnectiveMarkerSpanForCommittedSpan(tokens, sourcePredicate, span.consumed);
    if (markerSpan === null) {
      continue;
    }
    relations.push({
      kind: "te_attendant_simultaneous",
      source: predicateAnchor(sourcePredicate, clauseIndex),
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "connective",
        connectiveKind: "simultaneous",
        targetSlot: "clause_prefix",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function teConnectiveMarkerSpanForCommittedSpan(
  tokens: readonly ClauseToken[],
  predicateIdx: number,
  consumed: number | undefined,
): StructuralRelationMarkerSpan | null {
  const endExclusive = consumed === undefined ? predicateIdx + 1 : predicateIdx + consumed;
  const c = new TokenCursor(tokens, predicateIdx + 1, Math.min(tokens.length, endExclusive));
  while (c.current()) {
    const token = c.current()!;
    if ((token.pos & POS01) === 助詞_接続助詞 && (token.surface === "て" || token.surface === "で")) {
      return {
        start: c.pos,
        endExclusive: c.pos + 1,
        surface: token.surface,
        role: "te_attendant_marker",
      };
    }
    c.advance();
  }
  return null;
}

function pushCollectResult(
  result: CollectResult,
  relations: StructuralRelation[],
  diagnostics: StructuralRelationDiagnostic[],
): void {
  if (result.kind === "relation") {
    relations.push(result.relation);
    return;
  }
  if (result.kind === "diagnostic") {
    diagnostics.push(result.diagnostic);
  }
}

function collectCorrelativeDegreeRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const { tokens, layout, contentMap } = options;
  const searchEnd = correlativeSearchEnd(tokens, match.endExclusive);
  const degree = findCorrelativeDegreeMarker(tokens, match.endExclusive, searchEnd);
  if (degree === null) {
    return degraded(match, markerStart, "correlative marker has no degree marker");
  }
  const sourceClauseIndex = layout.clauseIndexOfToken(markerStart);
  const degreeClauseIndex = layout.clauseIndexOfToken(degree.start);
  const targetIndex = nextContentTokenIndex(tokens, degree.endExclusive, tokens.length);
  const targetClauseIndex = targetIndex === null ? null : layout.clauseIndexOfToken(targetIndex);
  if (sourceClauseIndex < 0 || degreeClauseIndex < 0 || targetClauseIndex === null || targetClauseIndex < 0) {
    return degraded(match, markerStart, "correlative relation has no target clause");
  }
  const targetClause = layout.clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return degraded(match, markerStart, "correlative relation target clause missing");
  }
  const leftPredicate = layout.predicateOccurrenceBefore(tokens, contentMap, markerStart);
  const rightPredicate = layout.predicateOccurrenceBefore(tokens, contentMap, degree.start);
  const confidence = correlativeConfidence(tokens, leftPredicate, rightPredicate);
  if (confidence === "weak") {
    return {
      kind: "diagnostic",
      diagnostic: structuralRelationDegraded({
        message: "correlative degree markers lack strict predicate compatibility",
        relationKind: match.relationPolicy,
        confidence,
        ...layoutBoundaryDiagnosticPayload(match),
        clauseId: structuralRelationNodeId(sourceClauseIndex),
        span: markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker"),
        markerSpans: [
          markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker"),
          degree.markerSpan,
        ],
      }),
    };
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, match.markerRole ?? "conditional_marker");
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, sourceClauseIndex),
      target: spanAnchor({
        start: degree.endExclusive,
        endExclusive: targetClause.end,
        clauseIndex: targetClauseIndex,
      }),
      markerSpans: [markerSpan, degree.markerSpan],
      candidateSuppressibleTokenSpans: [
        { start: markerSpan.start, endExclusive: markerSpan.endExclusive, reason: "relation_marker" },
        { start: degree.markerSpan.start, endExclusive: degree.markerSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: projectionRequest(match.projection ?? "correlative_degree", match),
      confidence,
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

function findCorrelativeDegreeMarker(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): {
  readonly start: number;
  readonly endExclusive: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
} | null {
  let index = start;
  while (index < upperBoundExclusive) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (isClausePunctuationToken(token)) {
      return null;
    }
    const degreeMatch = relationConnectiveSpansAt(new TokenCursor(tokens, index))
      .find((match) => match.relationPolicy === "correlative_degree" && match.markerRole === "degree_marker");
    if (degreeMatch !== undefined) {
      return {
        start: index,
        endExclusive: degreeMatch.endExclusive,
        markerSpan: markerSpanFromMatch(index, degreeMatch, degreeMatch.markerRole ?? "degree_marker"),
      };
    }
    index += 1;
  }
  return null;
}

function correlativeSearchEnd(tokens: readonly ClauseToken[], start: number): number {
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return c.pos;
    }
    c.advance();
  }
  return tokens.length;
}

const relationTokenLemma = (token: ClauseToken): string => token.dictionaryForm || token.surface;

function correlativeConfidence(
  tokens: readonly ClauseToken[],
  leftPredicate: { readonly predicateIdx: number; readonly closureIdx: number } | undefined,
  rightPredicate: { readonly predicateIdx: number; readonly closureIdx: number } | undefined,
): "strict" | "weak" {
  if (
    leftPredicate === undefined ||
    rightPredicate === undefined ||
    leftPredicate.predicateIdx === rightPredicate.predicateIdx
  ) {
    return "weak";
  }
  const headLemma = relationTokenLemma(tokens[leftPredicate.predicateIdx]!);
  const closureLemma = relationTokenLemma(tokens[leftPredicate.closureIdx]!);
  const rightHeadLemma = relationTokenLemma(tokens[rightPredicate.predicateIdx]!);
  const rightClosureLemma = relationTokenLemma(tokens[rightPredicate.closureIdx]!);
  const carrierIdentity = TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(closureLemma) ?? closureLemma;
  return (
    (headLemma.length > 0 && headLemma === rightHeadLemma) ||
    (carrierIdentity === (TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(rightHeadLemma) ?? rightHeadLemma) &&
      carrierIdentity === (TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(rightClosureLemma) ?? rightClosureLemma))
  ) ? "strict" : "weak";
}
