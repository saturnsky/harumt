import { nextNonSpaceIndex } from "../clause-layout/index.js";
import type { Clause } from "../clause-layout/final-layout.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "../clause-layout/punctuation.js";
import { relationDiscontinuousClosureSpanAfter, type RelationConnectiveSpanMatch } from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isSayVerbToken } from "../head-tail/data/quoted-reporting-sets.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ContentMap } from "../particles/index.js";
import { POS01, 助詞_係助詞, 助詞_副助詞, POS0, pos0in, 助詞, 動詞, NOMINAL_BITS, stemFormName } from "../../types/pos.js";
import { isVerbLemma } from "../matchers.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { StructuralAnchor, StructuralRelationNode, StructuralRelation, StructuralRelationMarkerSpan, StructuralTariListingClosure, StructuralTariListingItem, BuildStructuralRelationGraphOptions } from "./types.js";
import { hasHardSentenceBoundaryBetween, clauseAnchor, predicateAnchor, structuralRelationNodeId, nextClauseIndex, nextContentTokenIndex, tokenSpan } from "./relation-coordinates.js";
import { type CollectResult, degraded, markerSpanFromMatch, projectionRequest, layoutBoundaryRelationPayload, renderEnabledRelationPayload } from "./connective-relation-match.js";

interface TariListingItemEvidence {
  readonly markerIdx: number;
  readonly predicateIdx: number;
  readonly clauseIndex: number;
  readonly source: StructuralAnchor;
  readonly markerSpan: StructuralRelationMarkerSpan;
}

interface TariListingGroupEvidence {
  readonly items: readonly TariListingItemEvidence[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly closure: StructuralTariListingClosure;
  readonly target: StructuralAnchor | null;
}

export function collectTariListingCoordinationRelations(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly StructuralRelation[] {
  const groups = collectTariListingGroups(options, nodes);
  return groups.flatMap((group) => {
    const itemAnchors: readonly StructuralTariListingItem[] = group.items.map((item) => ({
      source: item.source,
      markerSpan: item.markerSpan,
    }));
    const markerSpans = group.items.map((item) => item.markerSpan);
    return group.items.map((item, itemIndex): StructuralRelation => ({
      kind: "tari_listing_coordination",
      source: item.source,
      target: group.target,
      markerSpans: [item.markerSpan],
      candidateSuppressibleTokenSpans: [{
        start: item.markerSpan.start,
        endExclusive: item.markerSpan.endExclusive,
        reason: "relation_marker",
      }],
      projection: {
        sourceForm: "listing",
        connectiveKind: "alternative",
        targetSlot: "coordination",
      },
      confidence: "strict",
      renderEnabledByDefault: true,
      tariListing: {
        itemAnchors,
        markerSpans,
        separatorSpans: group.separatorSpans,
        itemIndex,
        closure: group.closure,
      },
      provenance: "structural_relation_owner",
    }));
  });
}

function collectTariListingGroups(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
): readonly TariListingGroupEvidence[] {
  const items = collectTariListingItems(options, nodes);
  if (items.length === 0) {
    return [];
  }
  const groups: TariListingGroupEvidence[] = [];
  let pending: TariListingItemEvidence[] = [];
  for (const item of items) {
    const previous = pending[pending.length - 1] ?? null;
    if (previous !== null && !tariItemsCanBelongToSameGroup(options, previous, item)) {
      pushTariListingGroup(options, nodes, pending, groups);
      pending = [];
    }
    pending.push(item);
  }
  pushTariListingGroup(options, nodes, pending, groups);
  return groups;
}

function collectTariListingItems(
  options: BuildStructuralRelationGraphOptions,
  _nodes: readonly StructuralRelationNode[],
): readonly TariListingItemEvidence[] {
  const { tokens, layout, contentMap } = options;
  const items: TariListingItemEvidence[] = [];
  const c = new TokenCursor(tokens, 0, tokens.length);
  while (c.current()) {
    const token = c.current()!;
    if (!isTariListingMarkerToken(token) || isTariListingExampleMarker(tokens, c.pos)) {
      c.advance();
      continue;
    }
    const clauseIndex = layout.clauseIndexOfToken(c.pos);
    const clause = clauseIndex < 0 ? undefined : layout.clauses[clauseIndex];
    if (clause === undefined) {
      c.advance();
      continue;
    }
    const predicateIdx = tariListingItemPredicateIndex(contentMap, clause, c.pos);
    if (predicateIdx === null) {
      c.advance();
      continue;
    }
    const markerSpan = tariListingMarkerSpan(tokens, c.pos);
    items.push({
      markerIdx: c.pos,
      predicateIdx,
      clauseIndex,
      source: predicateAnchor(predicateIdx, clauseIndex),
      markerSpan,
    });
    c.advance();
  }
  return items;
}

function tariListingMarkerSpan(tokens: readonly ClauseToken[], markerIdx: number): StructuralRelationMarkerSpan {
  const marker = tokens[markerIdx];
  const focusIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  const focus = focusIdx === null ? undefined : tokens[focusIdx];
  if (
    marker !== undefined && focusIdx === markerIdx + 1 && focus !== undefined && focus.surface === "は" && (focus.pos & POS01) === 助詞_係助詞
  ) {
    return {
      start: markerIdx,
      endExclusive: focusIdx + 1,
      surface: `${marker.surface}${focus.surface}`,
      role: "listing_tail_focus",
    };
  }
  return {
    start: markerIdx,
    endExclusive: markerIdx + 1,
    surface: marker?.surface ?? "",
    role: "listing_tail",
  };
}

function pushTariListingGroup(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  pending: readonly TariListingItemEvidence[],
  groups: TariListingGroupEvidence[],
): void {
  if (pending.length === 0) {
    return;
  }
  const closure = tariListingClosureForGroup(options, nodes, pending);
  if (pending.length < 2 && !singleTariClosureShouldProjectAsListing(options, closure.closure)) {
    return;
  }
  groups.push({
    items: [...pending],
    separatorSpans: tariListingSeparatorSpans(options.tokens, pending),
    closure: closure.closure,
    target: closure.target,
  });
}

function singleTariClosureShouldProjectAsListing(
  options: BuildStructuralRelationGraphOptions,
  closure: StructuralTariListingClosure,
): boolean {
  if (closure.kind !== "explicit_predicate") {
    return false;
  }
  const span = options.contentMap.get(closure.predicateIdx);
  if (span?.hasNegative === true) {
    return true;
  }
  const plan = span?.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) => op.kind === "negation");
}

function isTariListingMarkerToken(token: ClauseToken): boolean {
  return (token.pos & POS01) === 助詞_副助詞 && (token.surface === "たり" || token.surface === "だり");
}

function isTariListingExampleMarker(tokens: readonly ClauseToken[], markerIdx: number): boolean {
  const next = nextNonSpaceIndex(tokens, markerIdx + 1);
  const token = next === null ? undefined : tokens[next];
  return token !== undefined && token.surface === "と" && (token.pos & POS0) === 助詞;
}

function tariListingItemPredicateIndex(
  contentMap: ContentMap,
  clause: Clause,
  markerIdx: number,
): number | null {
  for (let index = clause.predicates.length - 1; index >= 0; index -= 1) {
    const predicateIdx = clause.predicates[index];
    if (predicateIdx !== undefined && predicateIdx < markerIdx && contentMap.has(predicateIdx)) {
      return predicateIdx;
    }
  }
  return null;
}

function tariItemsCanBelongToSameGroup(
  options: BuildStructuralRelationGraphOptions,
  previous: TariListingItemEvidence,
  next: TariListingItemEvidence,
): boolean {
  if (next.markerIdx <= previous.markerIdx || next.clauseIndex < previous.clauseIndex) {
    return false;
  }
  for (let clauseIdx = previous.clauseIndex + 1; clauseIdx < next.clauseIndex; clauseIdx += 1) {
    const between = options.layout.clauses[clauseIdx];
    if (between === undefined || between.terminatedBy !== "connective" || options.layout.chuushiClosureAt(between.end)?.right !== "governed") {
      return false;
    }
  }
  if (hasHardSentenceBoundaryBetween(options.tokens, previous.markerSpan.endExclusive, next.markerIdx)) {
    return false;
  }
  if (!options.layout.sameQuoteScope(previous.markerIdx, next.markerIdx)) {
    return false;
  }
  return true;
}

function tariListingClosureForGroup(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  items: readonly TariListingItemEvidence[],
): {
  readonly closure: StructuralTariListingClosure;
  readonly target: StructuralAnchor | null;
} {
  const last = items[items.length - 1];
  if (last === undefined) {
    return {
      closure: { kind: "sentence_fragment" },
      target: null,
    };
  }
  const closurePredicateIdx = nextNonSpaceIndex(options.tokens, last.markerSpan.endExclusive);
  const closurePredicate = closurePredicateIdx === null ? undefined : options.tokens[closurePredicateIdx];
  if (
    closurePredicateIdx !== null &&
    closurePredicate !== undefined &&
    isTariClosurePredicate(closurePredicate) &&
    options.layout.sameQuoteScope(last.markerIdx, closurePredicateIdx)
  ) {
    const closureClauseIndex = options.layout.clauseIndexOfToken(closurePredicateIdx);
    return {
      closure: {
        kind: "explicit_predicate",
        predicateIdx: closurePredicateIdx,
      },
      target: predicateAnchor(closurePredicateIdx, closureClauseIndex),
    };
  }
  if (closurePredicateIdx !== null) {
    const quote = quoteMarkerRelationAt(options.tokens, closurePredicateIdx, {
      consumers: ["structural_relation_tari_listing"]
    });
    const sayIdx = quote?.canonicalSurface === "と"
      ? nextNonSpaceIndex(options.tokens, quote.span.endExclusive)
      : null;
    const say = sayIdx === null ? undefined : options.tokens[sayIdx];
    const headIdx = sayIdx === null ? null : nextNonSpaceIndex(options.tokens, sayIdx + 1, options.tokens.length);
    const head = headIdx === null ? undefined : options.tokens[headIdx];
    if (
      quote?.canonicalSurface === "と" &&
      sayIdx !== null &&
      say !== undefined &&
      isSayVerbToken(say) &&
      stemFormName(say.pos)?.startsWith("連体形") === true &&
      headIdx !== null &&
      head !== undefined &&
      pos0in(head.pos, NOMINAL_BITS) &&
      options.layout.sameQuoteScope(last.markerIdx, headIdx)
    ) {
      return {
        closure: {
          kind: "attributive_quote",
          markerSpan: {
            start: quote.span.start,
            endExclusive: sayIdx + 1,
            surface: `${quote.surface}${say.surface}`,
            role: "attributive_quote_marker"
          },
          headIdx
        },
        target: {
          kind: "noun_phrase",
          span: tokenSpan(headIdx, headIdx + 1),
          headIdx
        }
      };
    }
  }
  const followingClauseIndex = nextClauseIndex(options.layout, last.clauseIndex);
  const followingClause = followingClauseIndex === null ? undefined : options.layout.clauses[followingClauseIndex];
  if (followingClauseIndex !== null && followingClause !== undefined) {
    const targetEvidenceIdx = followingClause.primaryPredicate ?? followingClause.start;
    if (!options.layout.sameQuoteScope(last.markerIdx, targetEvidenceIdx)) {
      return {
        closure: { kind: "sentence_fragment" },
        target: null,
      };
    }
    return {
      closure: {
        kind: "following_clause",
        clauseId: structuralRelationNodeId(followingClauseIndex),
      },
      target: clauseAnchor(nodes, followingClauseIndex),
    };
  }
  return {
    closure: { kind: "sentence_fragment" },
    target: null,
  };
}

function isTariClosurePredicate(token: ClauseToken): boolean {
  return isVerbLemma(token, "する", "為る");
}

function tariListingSeparatorSpans(
  tokens: readonly ClauseToken[],
  items: readonly TariListingItemEvidence[],
): readonly StructuralRelationMarkerSpan[] {
  const spans: StructuralRelationMarkerSpan[] = [];
  for (let itemIndex = 0; itemIndex < items.length - 1; itemIndex += 1) {
    const previous = items[itemIndex];
    const next = items[itemIndex + 1];
    if (previous === undefined || next === undefined) {
      continue;
    }
    for (let tokenIndex = previous.markerSpan.endExclusive; tokenIndex < next.source.span.start; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      if (token === undefined || !isClauseEvidenceTransparentPunctuation(token)) {
        continue;
      }
      spans.push({
        start: tokenIndex,
        endExclusive: tokenIndex + 1,
        surface: token.surface,
        role: "listing_separator",
      });
    }
  }
  return spans;
}

export function collectListingExampleRelation(
  options: BuildStructuralRelationGraphOptions,
  nodes: readonly StructuralRelationNode[],
  markerStart: number,
  match: RelationConnectiveSpanMatch,
): CollectResult {
  const { tokens, layout } = options;
  const sourceClauseIndex = layout.clauseIndexOfToken(markerStart);
  const sourceClause = sourceClauseIndex < 0 ? undefined : layout.clauses[sourceClauseIndex];
  if (sourceClause === undefined) {
    return degraded(match, markerStart, "listing marker has no source clause");
  }
  const closure = relationDiscontinuousClosureSpanAfter(new TokenCursor(tokens, match.endExclusive, sourceClause.end), match);
  if (closure === null) {
    return degraded(match, markerStart, "listing marker has no closure と");
  }
  if (!listingClosureCanCloseBeforeClauseBoundary(tokens, closure.endExclusive, sourceClause.end, options.lookups)) {
    return degraded(match, markerStart, "listing closure と is not a clause-final example marker");
  }
  const targetClauseIndex = nextClauseIndex(layout, sourceClauseIndex);
  const targetClause = targetClauseIndex === null ? undefined : layout.clauses[targetClauseIndex];
  if (targetClauseIndex === null || targetClause === undefined) {
    return degraded(match, markerStart, "listing relation has no target clause");
  }
  const markerSpan = markerSpanFromMatch(markerStart, match, match.markerRole ?? "listing_tail");
  const closureSpan: StructuralRelationMarkerSpan = {
    start: closure.start,
    endExclusive: closure.endExclusive,
    surface: closure.surface,
    role: closure.role ?? "closure_marker",
  };
  const clauseSource = clauseAnchor(nodes, sourceClauseIndex);
  const markerHostPredicate = layout.previousPredicateInClause(markerStart);
  return {
    kind: "relation",
    relation: {
      kind: match.relationPolicy,
      source: clauseSource.kind === "clause" && markerHostPredicate !== undefined
        ? { ...clauseSource, predicateIdx: markerHostPredicate }
        : clauseSource,
      target: clauseAnchor(nodes, targetClauseIndex),
      markerSpans: [markerSpan, closureSpan],
      candidateSuppressibleTokenSpans: [
        { start: markerSpan.start, endExclusive: markerSpan.endExclusive, reason: "relation_marker" },
        { start: closureSpan.start, endExclusive: closureSpan.endExclusive, reason: "relation_marker" },
      ],
      projection: projectionRequest(match.projection ?? "listing", match),
      confidence: "strict",
      ...layoutBoundaryRelationPayload(match),
      ...renderEnabledRelationPayload(match),
      provenance: "structural_relation_owner",
    },
  };
}

function listingClosureCanCloseBeforeClauseBoundary(
  tokens: readonly ClauseToken[],
  start: number,
  upperBoundExclusive: number,
  lookups: LookupTables,
): boolean {
  const next = nextContentTokenIndex(tokens, start, upperBoundExclusive);
  if (next === null) {
    return true;
  }
  const nextToken = tokens[next];
  if (nextToken !== undefined && isClausePunctuationToken(nextToken)) {
    return true;
  }
  if (nextToken !== undefined && (nextToken.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(nextToken.dictionaryForm || nextToken.surface)) {
    return false;
  }
  return false;
}
