import { nextNonSpaceIndex } from "../clause-layout/index.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "../clause-layout/punctuation.js";
import type { RelationConnectiveSpanMatch } from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { isTameHead } from "../lookup-tables.js";
import { previousContentTokenIndex } from "../reason-source-evidence.js";
import type { StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralPurposeClauseCoordinationPayload, StructuralRelationTargetSpan, BuildStructuralRelationGraphOptions } from "./types.js";
import { POS0, pos0in, POS5A, 形状詞, 形容詞0, 助詞, 動詞, 連体形_, 連体詞, NOMINAL_BITS } from "../../types/pos.js";
import { markerSurface, clauseAnchor, predicateAnchor, targetSpanAnchor, nextContentTokenIndex } from "./relation-coordinates.js";
import { type CollectResult, degraded, markerSpanFromMatch, projectionRequest, layoutBoundaryRelationPayload, renderEnabledRelationPayload } from "./connective-relation-match.js";
import { hasStrictReasonEvidence } from "./reason-relations.js";

interface PurposeClauseCoordinationEvidence {
  readonly tameIdx: number;
  readonly coordinationIdx: number;
  readonly sourcePredicateIdx: number;
  readonly sourceClauseIndex: number;
  readonly targetTameIdx: number;
  readonly targetClauseIndex: number;
}

export function collectPurposeClauseCoordinationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  for (let index = 0; index < options.tokens.length; index += 1) {
    const evidence = purposeClauseCoordinationEvidenceAt(options, index);
    if (evidence === null) {
      continue;
    }
    const purposeMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.tameIdx,
      endExclusive: evidence.tameIdx + 1,
      surface: options.tokens[evidence.tameIdx]?.surface ?? "ため",
      role: "purpose_marker",
    };
    const coordinationMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.coordinationIdx,
      endExclusive: evidence.coordinationIdx + 1,
      surface: options.tokens[evidence.coordinationIdx]?.surface ?? "と",
      role: "purpose_coordination_marker",
    };
    const targetPurposeMarkerSpan: StructuralRelationMarkerSpan = {
      start: evidence.targetTameIdx,
      endExclusive: purposeTameMarkerEndExclusive(options.tokens, evidence.targetTameIdx),
      surface: markerSurface(options.tokens, evidence.targetTameIdx, purposeTameMarkerEndExclusive(options.tokens, evidence.targetTameIdx)),
      role: "target_purpose_marker",
    };
    const payload: StructuralPurposeClauseCoordinationPayload = {
      sourcePredicateIdx: evidence.sourcePredicateIdx,
      purposeMarkerSpan,
      coordinationMarkerSpan,
      targetPurposeMarkerSpan,
    };
    relations.push({
      kind: "purpose_clause_coordination",
      source: predicateAnchor(evidence.sourcePredicateIdx, evidence.sourceClauseIndex),
      target: clauseAnchor(nodes, evidence.targetClauseIndex),
      markerSpans: [purposeMarkerSpan, coordinationMarkerSpan, targetPurposeMarkerSpan],
      candidateSuppressibleTokenSpans: [
        { start: purposeMarkerSpan.start, endExclusive: purposeMarkerSpan.endExclusive, reason: "relation_marker" },
        { start: coordinationMarkerSpan.start, endExclusive: coordinationMarkerSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: {
        sourceForm: "connective",
        connectiveKind: "tame_purpose",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      purposeClauseCoordination: payload,
      provenance: "structural_relation_owner",
    });
  }
  return relations;
}

function purposeClauseCoordinationEvidenceAt(
  options: BuildStructuralRelationGraphOptions,
  tameIdx: number,
): PurposeClauseCoordinationEvidence | null {
  const { tokens, layout } = options;
  if (!isTameHead(tokens[tameIdx])) {
    return null;
  }
  const coordinationIdx = nextNonSpaceIndex(tokens, tameIdx + 1);
  const coordination = coordinationIdx === null ? undefined : tokens[coordinationIdx];
  if (
    coordinationIdx === null ||
    coordination === undefined ||
    (coordination.pos & POS0) !== 助詞 ||
    coordination.surface !== "と"
  ) {
    return null;
  }
  const sourcePredicate = purposeSourcePredicateBeforeTame(options, tameIdx, 0);
  if (
    sourcePredicate === null ||
    !hasPurposeClauseCoordinationSourceEvidence(options, sourcePredicate, tameIdx)
  ) {
    return null;
  }
  const targetTameIdx = followingPurposeTameMarkerIndex(options, coordinationIdx + 1);
  if (targetTameIdx === null) {
    return null;
  }
  const targetPredicate = purposeSourcePredicateBeforeTame(options, targetTameIdx, coordinationIdx + 1);
  if (
    targetPredicate === null ||
    !hasPurposeClauseCoordinationSourceEvidence(options, targetPredicate, targetTameIdx)
  ) {
    return null;
  }
  if (!layout.sameQuoteScope(tameIdx, targetTameIdx)) {
    return null;
  }
  return {
    tameIdx,
    coordinationIdx,
    sourcePredicateIdx: sourcePredicate.predicateIdx,
    sourceClauseIndex: sourcePredicate.clauseIndex,
    targetTameIdx,
    targetClauseIndex: targetPredicate.clauseIndex,
  };
}

function purposeSourcePredicateBeforeTame(
  options: BuildStructuralRelationGraphOptions,
  tameIdx: number,
  lowerBoundInclusive: number,
): { readonly predicateIdx: number; readonly clauseIndex: number } | null {
  const { layout, contentMap } = options;
  const predicateIdx = layout.primaryPredicateOfChildClause(tameIdx)
    ?? layout.previousPredicateInClause(tameIdx);
  if (predicateIdx === undefined || predicateIdx < lowerBoundInclusive || !contentMap.has(predicateIdx)) {
    return null;
  }
  const clauseIndex = layout.clauseIndexOfPredicate(predicateIdx);
  return clauseIndex === undefined ? null : { predicateIdx, clauseIndex };
}

function hasPurposeClauseCoordinationSourceEvidence(
  options: BuildStructuralRelationGraphOptions,
  source: { readonly predicateIdx: number; readonly clauseIndex: number },
  tameIdx: number,
): boolean {
  const clause = options.layout.clauses[source.clauseIndex];
  if (clause === undefined || !options.contentMap.has(source.predicateIdx)) {
    return false;
  }
  if (hasStrictReasonEvidence(options.tokens, clause, tameIdx, purposeTameMarkerEndExclusive(options.tokens, tameIdx), options.contentMap)) {
    return false;
  }
  const last = previousContentTokenIndex(options.tokens, tameIdx - 1, clause.start);
  const finalPredicate = last === null ? undefined : options.tokens[last];
  return finalPredicate !== undefined && (finalPredicate.pos & (POS0 | POS5A)) === (動詞 | 連体形_);
}

function followingPurposeTameMarkerIndex(
  options: BuildStructuralRelationGraphOptions,
  start: number,
): number | null {
  const { tokens } = options;
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return null;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      c.advance();
      continue;
    }
    if (!isTameHead(token)) {
      c.advance();
      continue;
    }
    const next = nextNonSpaceIndex(tokens, c.pos + 1);
    const nextToken = next === null ? undefined : tokens[next];
    if (
      next === null ||
      (nextToken !== undefined &&
        (nextToken.pos & POS0) === 助詞 &&
        (nextToken.surface === "に" || nextToken.surface === "と"))
    ) {
      return c.pos;
    }
    c.advance();
  }
  return null;
}

function purposeTameMarkerEndExclusive(tokens: readonly ClauseToken[], tameIdx: number): number {
  const next = nextNonSpaceIndex(tokens, tameIdx + 1);
  const nextToken = next === null ? undefined : tokens[next];
  if (
    next !== null &&
    nextToken !== undefined &&
    (nextToken.pos & POS0) === 助詞 &&
    nextToken.surface === "に"
  ) {
    return next + 1;
  }
  return tameIdx + 1;
}

export function collectPurposeModifierRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const evidence = purposeModifierEvidence(options, markerStart, match);
  if (!evidence.ok) {
    return degraded(match, markerStart, evidence.reason);
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, "purpose_marker");
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseAnchor(nodes, evidence.sourceClauseIndex),
      target: targetSpanAnchor(evidence.targetSpan),
      markerSpans: [markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: markerSpan.start,
        endExclusive: markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: projectionRequest(match.projection ?? "purpose_attributive", match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

type PurposeModifierEvidence =
  | {
    readonly ok: true;
    readonly sourcePredicate: number;
    readonly sourceClauseIndex: number;
    readonly targetSpan: StructuralRelationTargetSpan;
  }
  | { readonly ok: false; readonly reason: string };

function purposeModifierEvidence(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): PurposeModifierEvidence {
  const { tokens, layout } = options;
  const sourcePredicate = layout.predicateBeforeNominalClosure(markerStart)
    ?? layout.previousPredicateInClause(markerStart);
  const sourceClauseIndex = sourcePredicate === undefined ? -1 : layout.clauseIndexOfPredicate(sourcePredicate) ?? -1;
  if (sourcePredicate === undefined || sourceClauseIndex < 0 || !options.contentMap.has(sourcePredicate)) {
    return { ok: false, reason: "purpose modifier marker has no source predicate" };
  }
  const sourceClause = layout.clauses[sourceClauseIndex];
  if (
    sourceClause !== undefined &&
    hasStrictReasonEvidence(tokens, sourceClause, markerStart, match.endExclusive, options.contentMap)
  ) {
    return { ok: false, reason: "purpose modifier marker conflicts with strict reason evidence" };
  }
  if (!hasPurposeModifierSourceEvidence(tokens, sourcePredicate, markerStart, sourceClause?.start ?? 0)) {
    return { ok: false, reason: "purpose modifier marker lacks purpose source evidence" };
  }
  if (explicitNominalPurposeFrameFollows(tokens, match.endExclusive)) {
    return { ok: false, reason: "purpose modifier marker is owned by explicit nominal frame" };
  }
  const targetSpan = nounPhraseTargetAfter(tokens, match.endExclusive, purposeModifierTargetSearchEnd(tokens, match.endExclusive));
  if (targetSpan === null) {
    return { ok: false, reason: "purpose modifier marker has no target noun phrase" };
  }
  if (!hasPurposeModifierTargetArgumentEvidence(tokens, targetSpan)) {
    return { ok: false, reason: "purpose modifier target lacks argument evidence" };
  }
  return { ok: true, sourcePredicate, sourceClauseIndex, targetSpan };
}

function hasPurposeModifierSourceEvidence(
  tokens: readonly ClauseToken[],
  sourcePredicate: number,
  markerStart: number,
  lowerBoundInclusive: number,
): boolean {
  const predicate = tokens[sourcePredicate];
  if (predicate === undefined) {
    return false;
  }
  const conj5A = predicate.pos & POS5A;
  const pos0 = predicate.pos & POS0;
  if (pos0 !== 動詞 || conj5A !== 連体形_) {
    return false;
  }
  const last = previousContentTokenIndex(tokens, markerStart - 1, lowerBoundInclusive);
  return last === sourcePredicate;
}

function explicitNominalPurposeFrameFollows(tokens: readonly ClauseToken[], markerEndExclusive: number): boolean {
  const next = nextContentTokenIndex(tokens, markerEndExclusive, tokens.length);
  if (next === null) {
    return false;
  }
  const token = tokens[next];
  return token !== undefined && (token.pos & POS0) === 助詞 && (token.surface === "の" || token.surface === "に");
}

function purposeModifierTargetSearchEnd(tokens: readonly ClauseToken[], start: number): number {
  const c = new TokenCursor(tokens, start, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token) || isClausePunctuationToken(token)) {
      return c.pos;
    }
    c.advance();
  }
  return tokens.length;
}

function hasPurposeModifierTargetArgumentEvidence(
  tokens: readonly ClauseToken[],
  targetSpan: StructuralRelationTargetSpan,
): boolean {
  const next = nextContentTokenIndex(tokens, targetSpan.endExclusive, tokens.length);
  if (next === null) {
    return true;
  }
  const token = tokens[next];
  if (
    token === undefined ||
    (token.pos & POS0) !== 助詞 ||
    !(token.surface === "が" || token.surface === "は" || token.surface === "も" || token.surface === "を")
  ) {
    return false;
  }
  if ((token.surface === "が" || token.surface === "は" || token.surface === "も") && !targetSpanHasPrenominalModifier(tokens, targetSpan)) {
    return false;
  }
  return true;
}

function targetSpanHasPrenominalModifier(
  tokens: readonly ClauseToken[],
  targetSpan: StructuralRelationTargetSpan,
): boolean {
  const c = new TokenCursor(tokens, targetSpan.start, targetSpan.endExclusive - 1);
  while (c.current()) {
    const token = c.current()!;
    const pos0 = token.pos & POS0;
    if (pos0 === 形状詞 || pos0 === 形容詞0 || pos0 === 連体詞 || token.surface === "な" || token.surface === "の") {
      return true;
    }
    c.advance();
  }
  return false;
}

export function hasNounModifierTarget(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): boolean {
  return purposeModifierEvidence(options, markerStart, match).ok;
}

export function shouldDeferContiguousForPurposeModifier(
  options: BuildStructuralRelationGraphOptions,
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): boolean {
  return purposeModifierEvidence(options, markerStart, match).ok;
}

function nounPhraseTargetAfter(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
): StructuralRelationTargetSpan | null {
  const first = nextContentTokenIndex(tokens, start, upperBoundExclusive);
  if (first === null) {
    return null;
  }
  const c = new TokenCursor(tokens, first, upperBoundExclusive);
  while (c.current()) {
    const token = c.current()!;
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, NOMINAL_BITS)) {
      return tokenSpanWithKind(first, c.pos + 1, "noun_phrase");
    }
    if (pos0 === 形状詞 || pos0 === 形容詞0 || pos0 === 連体詞 || token.surface === "な" || token.surface === "の") {
      c.advance();
      continue;
    }
    return null;
  }
  return null;
}

function tokenSpanWithKind(start: number, endExclusive: number, kind: StructuralRelationTargetSpan["kind"]): StructuralRelationTargetSpan {
  return { start, endExclusive, kind };
}
