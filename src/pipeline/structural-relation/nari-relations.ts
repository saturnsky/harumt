import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/index.js";
import type { Clause, ClauseLayout } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { hostedConnectiveMarkerAt } from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import type { ContentMap } from "../particles/index.js";
import { POS01, 助詞_接続助詞, 助詞_副助詞, 助詞_格助詞, POS0, POS1, POS4, POS5A, 助詞, 代名詞, 動詞, 副助詞, 接尾辞, 接続助詞, 連体形_, 終止形_, 助動詞_タ } from "../../types/pos.js";
import type { StructuralAnchor, StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralNariParallelItem, StructuralNariParallelItemKind, BuildStructuralRelationGraphOptions } from "./types.js";
import { hasHardSentenceBoundaryBetween, clauseAnchor, spanAnchor, predicateAnchor, nextContentTokenIndex } from "./relation-coordinates.js";
import { nextParallelItemStart, parallelItemStartBeforeMarker, spanHasPredicateLikeToken, isParallelPredicateToken, parallelSeparatorSpans } from "./parallel-item-evidence.js";

interface NariParallelMarkerEvidence {
  readonly nariIdx: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly clauseIndex: number;
}

export function collectNariParallelRelations(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const consumedMarkers = new Set<number>();
  const { tokens, layout } = options;
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    if (consumedMarkers.has(c.pos)) {
      c.advance();
      continue;
    }
    const firstMarker = nariParallelMarkerAt(tokens, layout, c.pos);
    if (firstMarker === null) {
      c.advance();
      continue;
    }
    const firstStart = parallelItemStartBeforeMarker(tokens, layout, firstMarker.markerSpan.start);
    if (firstStart === null || firstStart >= firstMarker.markerSpan.start) {
      c.advance();
      continue;
    }
    const markers: NariParallelMarkerEvidence[] = [firstMarker];
    const itemStarts: number[] = [firstStart];
    let currentMarker = firstMarker;

    while (true) {
      const nextStart = nextParallelItemStart(c.fork(currentMarker.markerSpan.endExclusive));
      if (nextStart === null) {
        break;
      }
      const nextMarker = nextNariParallelMarker(c.fork(nextStart), layout);
      if (nextMarker === null || nextMarker.nariIdx <= currentMarker.nariIdx) {
        break;
      }
      if (hasHardSentenceBoundaryBetween(tokens, currentMarker.markerSpan.endExclusive, nextMarker.nariIdx)) {
        break;
      }
      if (!layout.sameQuoteScope(firstMarker.nariIdx, nextMarker.nariIdx)) {
        break;
      }
      if (nextStart >= nextMarker.markerSpan.start) {
        break;
      }
      markers.push(nextMarker);
      itemStarts.push(nextStart);
      currentMarker = nextMarker;
    }
    if (markers.length < 2) {
      c.advance();
      continue;
    }
    const itemKinds = markers.map((marker, markerIndex) => nariParallelItemKind(
      c.fork(itemStarts[markerIndex] as number, marker.markerSpan.start),
      options.contentMap,
    ));
    const wildcardFlags = markers.map((marker, markerIndex) => isWildcardPronounNariItem(
      tokens,
      itemStarts[markerIndex] as number,
      marker.markerSpan.start,
    ));
    const commonKind = nariParallelCommonItemKind(itemKinds, wildcardFlags);
    if (commonKind === null) {
      c.advance();
      continue;
    }
    const lastMarker = markers[markers.length - 1] as NariParallelMarkerEvidence;
    const trailingParticleSpan = nariParallelTrailingParticleSpan(tokens, lastMarker.markerSpan.endExclusive);
    const sourceEnd = trailingParticleSpan?.endExclusive ?? lastMarker.markerSpan.endExclusive;
    const itemAnchors: readonly StructuralNariParallelItem[] = markers.map((marker, markerIndex) => ({
      source: spanAnchor({
        start: itemStarts[markerIndex] as number,
        endExclusive: marker.markerSpan.start,
        clauseIndex: marker.clauseIndex,
      }),
      markerSpan: marker.markerSpan,
      itemKind: itemKinds[markerIndex] as StructuralNariParallelItemKind,
      predicateIdx: nariParallelPredicateIndex(options, itemStarts[markerIndex] as number, marker.markerSpan.start),
    }));
    const separatorSpans = markers.slice(0, -1).flatMap((marker, markerIndex) => parallelSeparatorSpans(
      c.fork(marker.markerSpan.endExclusive, itemStarts[markerIndex + 1] as number),
      "nari_parallel_separator",
    ));
    const markerSpans = markers.map((marker) => marker.markerSpan);
    const suppressibleSpans = [
      ...markerSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_marker" })),
      ...separatorSpans.map((span) => ({ start: span.start, endExclusive: span.endExclusive, reason: "relation_separator" })),
      ...(trailingParticleSpan === null ? [] : [{
        start: trailingParticleSpan.start,
        endExclusive: trailingParticleSpan.endExclusive,
        reason: "relation_trailing_particle",
      }]),
    ];
    relations.push({
      kind: "nari_parallel_choice",
      source: spanAnchor({
        start: firstStart,
        endExclusive: sourceEnd,
        clauseIndex: firstMarker.clauseIndex,
      }),
      target: null,
      markerSpans,
      candidateSuppressibleTokenSpans: suppressibleSpans,
      projection: {
        sourceForm: "listing",
        connectiveKind: "nari_parallel_choice",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      nariParallel: {
        itemAnchors,
        markerSpans,
        separatorSpans,
        itemKind: commonKind,
        trailingParticleSpan,
      },
      provenance: "structural_relation_owner",
    });
    for (const marker of markers) {
      consumedMarkers.add(marker.nariIdx);
    }
    c.advance();
  }
  return relations;
}

function nariParallelMarkerAt(
  tokens: readonly ClauseToken[],
  layout: ClauseLayout,
  index: number,
): NariParallelMarkerEvidence | null {
  const token = tokens[index];
  if (!isNariParallelMarkerToken(token)) {
    return null;
  }
  const clauseIndex = layout.clauseIndexOfToken(index);
  return {
    nariIdx: index,
    markerSpan: {
      start: index,
      endExclusive: index + 1,
      surface: token.surface,
      role: "nari_parallel_marker",
    },
    clauseIndex,
  };
}

function isNariParallelMarkerToken(token: ClauseToken | undefined): token is ClauseToken {
  if (token === undefined || token.surface !== "なり") {
    return false;
  }
  const pos0 = token.pos & POS0;
  const pos1 = token.pos & POS1;
  return (pos0 === 助詞 && (pos1 === 副助詞 || pos1 === 接続助詞)) || pos0 === 接尾辞;
}

function nextNariParallelMarker(
  cursor: TokenCursor<ClauseToken>,
  layout: ClauseLayout,
): NariParallelMarkerEvidence | null {
  const c = cursor.fork();
  while (c.current()) {
    const token = c.current()!;
    if (isHardTerminalPunctuationToken(token)) {
      return null;
    }
    const marker = nariParallelMarkerAt(c.tokens, layout, c.pos);
    if (marker !== null) {
      return marker;
    }
    c.advance();
  }
  return null;
}

function nariParallelItemKind(
  itemCursor: TokenCursor<ClauseToken>,
  contentMap: ContentMap | null,
): StructuralNariParallelItemKind {
  return spanHasPredicateLikeToken(itemCursor, contentMap) ? "predicate" : "nominal";
}

function nariParallelCommonItemKind(
  itemKinds: readonly StructuralNariParallelItemKind[],
  wildcardFlags: readonly boolean[],
): StructuralNariParallelItemKind | null {
  const first = itemKinds[0] ?? null;
  if (first === null) {
    return null;
  }
  if (itemKinds.every((kind) => kind === first)) {
    return first;
  }
  const mixedAcceptable = itemKinds.every((kind, index) =>
    kind === "predicate" || wildcardFlags[index] === true
  ) && itemKinds.some((kind) => kind === "predicate");
  return mixedAcceptable ? "predicate" : null;
}

function isWildcardPronounNariItem(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  let sole: ClauseToken | null = null;
  for (let index = start; index < endExclusive; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (sole !== null) {
      return false;
    }
    sole = token;
  }
  return sole !== null &&
    (sole.pos & POS0) === 代名詞 &&
    ["何", "なん", "なに"].includes(sole.surface);
}

function nariParallelPredicateIndex(
  options: BuildStructuralRelationGraphOptions,
  start: number,
  endExclusive: number,
): number | null {
  for (let index = endExclusive - 1; index >= start; index -= 1) {
    if (options.contentMap.has(index) && isParallelPredicateToken(options.tokens[index])) {
      return index;
    }
  }
  return null;
}

function nariParallelTrailingParticleSpan(
  tokens: readonly ClauseToken[],
  markerEndExclusive: number,
): StructuralRelationMarkerSpan | null {
  const index = nextNonSpaceIndex(tokens, markerEndExclusive, tokens.length);
  const token = index === null ? undefined : tokens[index];
  if (index === null || token === undefined || (token.pos & POS01) !== 助詞_格助詞) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "nari_parallel_trailing_particle",
  };
}

export function collectImmediateNariSequenceRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  nariParallelRelations: readonly StructuralRelation[],
): readonly StructuralRelation[] {
  const relations: StructuralRelation[] = [];
  const { tokens, layout, contentMap } = options;
  const pairedMarkerStarts = nariParallelMarkerStarts(nariParallelRelations);
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    const hosted = immediateSequenceHostedMarkerAt(tokens, c.pos);
    const marker = immediateNariSequenceMarkerAt(tokens, c.pos) ??
      stativeHoldNariMarkerAt(tokens, c.pos) ??
      hosted?.marker ??
      null;
    if (marker === null || pairedMarkerStarts.has(marker.start)) {
      c.advance();
      continue;
    }
    const sourceClauseIndex = layout.clauseIndexOfToken(c.pos);
    const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
    if (sourceClause === undefined) {
      c.advance();
      continue;
    }
    const sourcePredicate = immediateNariSourcePredicate(contentMap, sourceClause, c.pos);
    if (
      sourcePredicate === null ||
      (hosted !== null && !sourcePredicateContentEndsWithHost(contentMap, sourcePredicate, hosted.hostIndex))
    ) {
      c.advance();
      continue;
    }
    const target = immediateNariTargetAnchor(options, nodes, marker.endExclusive);
    if (target === null) {
      c.advance();
      continue;
    }
    const stativeHold = marker.role === "stative_hold_marker";
    relations.push({
      kind: stativeHold ? "stative_hold_sequence" : "immediate_sequence",
      source: predicateAnchor(sourcePredicate, sourceClauseIndex),
      target,
      markerSpans: [marker],
      candidateSuppressibleTokenSpans: [{
        start: marker.start,
        endExclusive: marker.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "connective",
        connectiveKind: stativeHold ? "stative_hold" : "sequence_immediate",
        targetSlot: "clause_prefix",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      provenance: "structural_relation_owner",
    });
    c.advance();
  }
  return relations;
}

function nariParallelMarkerStarts(relations: readonly StructuralRelation[]): ReadonlySet<number> {
  const starts = new Set<number>();
  for (const relation of relations) {
    if (relation.kind !== "nari_parallel_choice") {
      continue;
    }
    for (const marker of relation.markerSpans) {
      if (marker.role === "nari_parallel_marker") {
        starts.add(marker.start);
      }
    }
  }
  return starts;
}

function immediateNariSequenceMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): StructuralRelationMarkerSpan | null {
  const token = tokens[index];
  if (
    token === undefined || token.surface !== "なり" || (token.pos & POS01) !== 助詞_接続助詞
  ) {
    return null;
  }
  const previous = previousNonSpaceIndex(tokens, index, 0);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (
    previousToken === undefined ||
    (previousToken.pos & POS0) !== 動詞 ||
    ((previousToken.pos & POS5A) !== 終止形_ && (previousToken.pos & POS5A) !== 連体形_)
  ) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "immediate_sequence_marker",
  };
}

function immediateSequenceHostedMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): { readonly marker: StructuralRelationMarkerSpan; readonly hostIndex: number } | null {
  const hosted = hostedConnectiveMarkerAt(tokens, index, "sequence_immediate");
  if (hosted === null) {
    return null;
  }
  return {
    marker: {
      start: index,
      endExclusive: index + 1,
      surface: hosted.surface,
      role: "immediate_sequence_marker",
    },
    hostIndex: hosted.hostIndex,
  };
}

function sourcePredicateContentEndsWithHost(
  contentMap: ContentMap,
  sourcePredicate: number,
  hostIndex: number,
): boolean {
  const span = contentMap.get(sourcePredicate);
  return span !== undefined && span.start <= hostIndex && span.start + span.consumed - 1 === hostIndex;
}

function stativeHoldNariMarkerAt(
  tokens: readonly ClauseToken[],
  index: number,
): StructuralRelationMarkerSpan | null {
  const token = tokens[index];
  if (
    token === undefined || token.surface !== "なり" || (token.pos & POS01) !== 助詞_副助詞
  ) {
    return null;
  }
  const previous = previousNonSpaceIndex(tokens, index, 0);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (previousToken === undefined || (previousToken.pos & POS4) !== 助動詞_タ) {
    return null;
  }
  return {
    start: index,
    endExclusive: index + 1,
    surface: token.surface,
    role: "stative_hold_marker",
  };
}

function immediateNariSourcePredicate(
  contentMap: ContentMap,
  sourceClause: Clause,
  markerIdx: number,
): number | null {
  for (let index = sourceClause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = sourceClause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerIdx && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function immediateNariTargetAnchor(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  start: number,
): StructuralAnchor | null {
  const { tokens, layout } = options;
  const targetTokenIdx = nextContentTokenIndex(tokens, start, tokens.length);
  if (targetTokenIdx === null) {
    return null;
  }
  const targetClauseIndex = layout.clauseIndexOfToken(targetTokenIdx);
  if (targetClauseIndex < 0) {
    return null;
  }
  const targetClause = layout.clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  if (targetClause.start >= start) {
    return clauseAnchor(nodes, targetClauseIndex);
  }
  const predicateIdx = targetClause.predicates.find((candidate) => candidate >= targetTokenIdx) ?? null;
  return predicateIdx === null
    ? clauseAnchor(nodes, targetClauseIndex)
    : predicateAnchor(predicateIdx, targetClauseIndex);
}
