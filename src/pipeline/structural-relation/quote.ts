
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import type { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import type { RequestQuoteTailKind } from "../head-tail/tail/predicate-root/grammar.js";
import { type QuoteHostMatch, quoteHostMatchAfterMarker, quoteHostMatchBlockedByNegativeCondition, quoteHostMatchIsAttributiveIu } from "../quote/host-taxonomy.js";
import { caseParticleMarkerRelationForToken, predicateNominalizerRelationForToken, quotativeDerivedIdiomClaimAt } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { canonicalReformulationMarkerRelationIndex, kaOwnershipKindAt, whIndefiniteKaKindAt } from "../head-tail/boundary/ka-ownership.js";
import { classifyDatteMarkerAt } from "../semantics/marker-roles.js";
import { quoteMarkerPrecededByRequestCommandContent } from "../quote/prohibitive-request.js";
import { detectNoda } from "../semantics/grammar-runtime.js";
import { tariKeijoujiAdverbialToEvidence } from "../semantics/tari-adverbial-marker.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralQuoteContentSlotKind, StructuralQuoteMarkerPayload, StructuralRelationTokenSpan } from "./types.js";
import { tokaNominalListingRunEvidenceForMarker, tokenSpansOverlap } from "./toka-nominal-listing-run.js";

import { POS0, 助詞, isAuxiliaryStemToken } from "../../types/pos.js";
import { quoteHostAllowsBareNominalContent, quoteStructuralRelationLooksBareNominalContent, quoteStructuralRelationLooksAdverbialToContent, quoteHostMatchForPassiveSareru } from "./quote-nominal-and-passive.js";
import { quoteConsumedMarkerSpanFromRelation } from "./quote-clause-boundary.js";
import { type QuoteRequestSourceEvidence, quoteHostHandoffKindFromRelation, quoteRequestSourceBeforeMarker } from "./quote-request.js";
import { type QuoteStructuralRelation, quoteRelationOwnsMarkerRealization, makeQuoteStructuralRelation } from "./quote-payload.js";
import { tokenSpan, explicitQuoteSpanImmediatelyBeforeMarker, quoteMarkerFocusParticleAfterMarker, contentTokenEndForMarker, quoteContentTokenStart, quoteCognitiveCopularContentCanBridgePunctuation, defaultContentTokenStartFallback, bridgeKindBetweenMarkerAndHost } from "./quote-content-span.js";
import { buildQuestionAlternativeContentRelationUncached, isEuphemisticJudgmentKato, isKatoQuestionMarker, isWhIndefiniteToMarker } from "./quote-question-content.js";
import { closedPropositionTokaAtMarker, questionClosedTokaQuotePayload, closedPropositionTokaQuoteHostMatch } from "./quote-closed-toka.js";
import { quoteHostMatchIsTowaIeConcessive, quoteHostMatchHasLooseSetsuzokuToBridge } from "./quote-content-endings.js";

export interface QuoteStructuralRelationIndex {
  winnerAtOwnedPosition(position: number): QuoteStructuralRelation | undefined;
  canonicalWinnerAt(position: number): QuoteStructuralRelation | undefined;
  winners(): IterableIterator<QuoteStructuralRelation>;
}

class MutableQuoteStructuralRelationIndex
  implements QuoteStructuralRelationIndex {
  private readonly canonicalWinners = new Map<number, QuoteStructuralRelation>();
  private readonly ownedPositionAliases = new Map<number, number>();

  winnerAtOwnedPosition(position: number): QuoteStructuralRelation | undefined {
    const relation = this.producedWinnerAt(position);
    return relation === undefined || quoteRelationOwnsMarkerRealization(relation) ? relation : undefined;
  }

  producedWinnerAt(position: number): QuoteStructuralRelation | undefined {
    return this.canonicalWinnerAt(this.ownedPositionAliases.get(position) ?? position);
  }

  canonicalWinnerAt(position: number): QuoteStructuralRelation | undefined {
    return this.canonicalWinners.get(position);
  }

  winners(): IterableIterator<QuoteStructuralRelation> {
    return this.canonicalWinners.values();
  }

  canonicalEntries(): IterableIterator<[number, QuoteStructuralRelation]> {
    return this.canonicalWinners.entries();
  }

  setCanonicalWinner(position: number, relation: QuoteStructuralRelation): void {
    this.canonicalWinners.set(position, relation);
  }

  deleteCanonicalWinner(position: number): void {
    this.canonicalWinners.delete(position);
  }

  bindOwnedPosition(position: number, canonicalMarkerIdx: number): void {
    if (position === canonicalMarkerIdx) {
      this.ownedPositionAliases.delete(position);
      return;
    }
    this.ownedPositionAliases.set(position, canonicalMarkerIdx);
  }

  bindOwnedSpan(span: StructuralRelationTokenSpan, canonicalMarkerIdx: number): void {
    for (let position = span.start; position < span.endExclusive; position += 1) this.bindOwnedPosition(position, canonicalMarkerIdx);
  }

  rebindOwnedPositions(previousMarkerIdx: number, canonicalMarkerIdx: number): void {
    for (const [position, target] of this.ownedPositionAliases) {
      if (target === previousMarkerIdx) {
        this.ownedPositionAliases.set(position, canonicalMarkerIdx);
      }
    }
    this.bindOwnedPosition(previousMarkerIdx, canonicalMarkerIdx);
  }
}

interface RelationCacheBucket {
  readonly byProto: WeakMap<object, Map<number, MutableQuoteStructuralRelationIndex>>;
  readonly withoutProto: WeakMap<LookupTables, Map<number, MutableQuoteStructuralRelationIndex>>;
}

type QuoteRelationIndexVariant = "canonical" | "boundary_formation";

const relationIndexCaches: { readonly [V in QuoteRelationIndexVariant]: WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket> } = {
  canonical: new WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket>(),
  boundary_formation: new WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket>()
};

function cachedQuoteRelationsFor(
  tokens: readonly RuntimeHaruToken[],
  proto: object | null,
  lookups: LookupTables | null,
  end: number,
  variant: QuoteRelationIndexVariant = "canonical"
): QuoteStructuralRelationIndex | undefined {
  const bucket = relationIndexCaches[variant].get(tokens);
  if (proto !== null) {
    return bucket?.byProto.get(proto)?.get(end);
  }
  return lookups === null ? undefined : bucket?.withoutProto.get(lookups)?.get(end);
}

function cacheQuoteRelationsFor(
  tokens: readonly RuntimeHaruToken[],
  proto: object | null,
  lookups: LookupTables,
  end: number,
  relations: MutableQuoteStructuralRelationIndex,
  variant: QuoteRelationIndexVariant
): void {
  const cache = relationIndexCaches[variant];
  let bucket = cache.get(tokens);
  if (bucket === undefined) {
    bucket = {
      byProto: new WeakMap<object, Map<number, MutableQuoteStructuralRelationIndex>>(),
      withoutProto: new WeakMap<LookupTables, Map<number, MutableQuoteStructuralRelationIndex>>()
    };
    cache.set(tokens, bucket);
  }
  if (proto === null) {
    let byLookups = bucket.withoutProto.get(lookups);
    if (byLookups === undefined) {
      byLookups = new Map<number, MutableQuoteStructuralRelationIndex>();
      bucket.withoutProto.set(lookups, byLookups);
    }
    byLookups.set(end, relations);
    return;
  }
  let byEnd = bucket.byProto.get(proto);
  if (byEnd === undefined) {
    byEnd = new Map<number, MutableQuoteStructuralRelationIndex>();
    bucket.byProto.set(proto, byEnd);
  }
  byEnd.set(end, relations);
}

export function cachedQuoteStructuralRelationIndex(
  tokens: readonly RuntimeHaruToken[],
  end: number = tokens.length
): QuoteStructuralRelationIndex | undefined {
  const proto = activeProtoLayout();
  return proto === null ? undefined : cachedQuoteRelationsFor(tokens, proto, null, end);
}

export function cachedQuoteBindingForContentRoot(
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  markerIdx: number,
  end: number = tokens.length
): "unbound" | "quoted_content" {
  const relations = cachedQuoteStructuralRelationIndex(tokens, end);
  if (relations === undefined) {
    throw new Error("quote binding requires the cached quote relation index");
  }
  const relation = relations.winnerAtOwnedPosition(markerIdx);
  return relation?.quote.slotKind === "quoted_content" &&
    relation.quote.contentSpan.start <= predicateTokenIdx &&
    predicateTokenIdx < relation.quote.contentSpan.endExclusive
    ? "quoted_content"
    : "unbound";
}

interface QuoteStructuralRelationIndexOptions {
  readonly allowBuildProtoForTariAdverbialEvidence?: boolean;
  readonly admitWhIndefiniteBareNominalContent?: boolean;
}

export function quoteStructuralRelationAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): QuoteStructuralRelation | undefined {
  return quoteStructuralRelationIndex(cursor, lookups).winnerAtOwnedPosition(cursor.pos);
}

export function whIndefiniteBareNominalQuoteRelationAt(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): QuoteStructuralRelation | null {
  if (!isQuoteContentMarker(markerCursor, lookups)) {
    return null;
  }
  const relation = buildQuoteStructuralRelationUncached(
    markerCursor,
    lookups,
    quoteStructuralRelationIndex(markerCursor, lookups),
    { admitWhIndefiniteBareNominalContent: true }
  );
  return relation !== null && quoteHostAllowsBareNominalContent(markerCursor.tokens, relation, lookups)
    ? relation
    : null;
}

export function quoteStructuralRelationsForHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): readonly QuoteStructuralRelation[] {
  return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners()).filter((relation) => relation.quote.hostMatch.hostIdx === cursor.pos);
}

export function quoteStructuralRelationContainingContentToken(
  cursor: TokenCursor<RuntimeHaruToken>,
  tokenIdx: number,
  lookups: LookupTables,
): QuoteStructuralRelation | undefined {
  return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners()).find((relation) =>
    relation.quote.contentSpan.start <= tokenIdx && tokenIdx < relation.quote.contentSpan.endExclusive
  );
}

export function quoteStructuralRelationStartingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteStructuralRelation | undefined {
  const startIdx = cursor.pos;
  const n = cursor.end;
  const lowerBound = options.lowerBoundInclusive ?? 0;
  if (startIdx < lowerBound || startIdx >= n) {
    return undefined;
  }
  const direct = quoteStructuralRelationAt(cursor, lookups);
  if (
    direct !== undefined &&
    quoteConsumedMarkerSpanFromRelation(cursor.tokens, direct, lookups, { lowerBoundInclusive: lowerBound })?.start === startIdx
  ) {
    return direct;
  }
  const nextIdx = startIdx + 1;
  if (nextIdx >= n) {
    return undefined;
  }
  const next = quoteStructuralRelationAt(cursor.fork(nextIdx), lookups);
  return next !== undefined &&
    quoteConsumedMarkerSpanFromRelation(cursor.tokens, next, lookups, { lowerBoundInclusive: lowerBound })?.start === startIdx
    ? next
    : undefined;
}

export function quoteHostHandoffKindAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  const relation = quoteStructuralRelationAt(cursor, lookups);
  return relation === undefined ? null : quoteHostHandoffKindFromRelation(cursor.tokens, relation, cursor.end, lookups);
}

export function quoteHostHandoffKindForHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  for (const relation of quoteStructuralRelationsForHost(cursor, lookups)) {
    const kind = quoteHostHandoffKindFromRelation(cursor.tokens, relation, cursor.end, lookups);
    if (kind !== null) {
      return kind;
    }
  }
  return null;
}

export function quoteStructuralRelationIndex(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: Pick<QuoteStructuralRelationIndexOptions, "allowBuildProtoForTariAdverbialEvidence"> = {}
): QuoteStructuralRelationIndex {
  const tokens = cursor.tokens;
  const end = cursor.end;
  if (tokens.length === 0) {
    return new MutableQuoteStructuralRelationIndex();
  }
  const variant: QuoteRelationIndexVariant = options.allowBuildProtoForTariAdverbialEvidence === false
    ? "boundary_formation"
    : "canonical";
  const proto = activeProtoLayout();
  const cached = cachedQuoteRelationsFor(tokens, proto, lookups, end, variant);
  if (cached !== undefined) {
    return cached;
  }

  const relations = new MutableQuoteStructuralRelationIndex();
  const producerMarkerIndices = new Map<number, number>();
  const outerCursor = cursor.fork(0, Math.min(tokens.length, end));
  while (outerCursor.pos < outerCursor.end) {
    const markerIdx = outerCursor.pos;
    const markerCursor = cursor.fork(markerIdx, end);
    const relation = relations.producedWinnerAt(markerIdx) !== undefined
      ? null
      : isQuoteContentMarker(markerCursor, lookups)
        ? buildQuoteStructuralRelationUncached(markerCursor, lookups, relations, options)
        : buildQuestionAlternativeContentRelationUncached(markerCursor, lookups, relations);
    if (relation !== null) {
      const winner = arbitrateQuoteRelationAtProduction(
        tokens,
        lookups,
        markerIdx,
        relation,
        relations,
        producerMarkerIndices,
      );
      if (winner !== null) {
        const canonicalMarkerIdx = winner.quote.markerIdx;
        relations.setCanonicalWinner(canonicalMarkerIdx, winner);
        producerMarkerIndices.set(canonicalMarkerIdx, markerIdx);
        relations.bindOwnedPosition(markerIdx, canonicalMarkerIdx);
        relations.bindOwnedSpan(winner.quote.markerSpan, canonicalMarkerIdx);
        if (winner.quote.questionBoundarySpan !== null) {
          relations.bindOwnedSpan(winner.quote.questionBoundarySpan, canonicalMarkerIdx);
        }
      }
    }
    outerCursor.advance();
  }
  cacheQuoteRelationsFor(tokens, proto, lookups, end, relations, variant);
  return relations;
}

function arbitrateQuoteRelationAtProduction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  producerMarkerIdx: number,
  relation: QuoteStructuralRelation,
  priorRelations: MutableQuoteStructuralRelationIndex,
  producerMarkerIndices: Map<number, number>,
): QuoteStructuralRelation | null {
  let winner = relation;
  const listingRun = producerMarkerIdx === relation.quote.markerIdx
    ? null
    : tokaNominalListingRunEvidenceForMarker(tokens, producerMarkerIdx, lookups);
  if (listingRun !== null) {
    for (const [priorMarkerIdx, prior] of priorRelations.canonicalEntries()) {
      if (
        prior.quote.hostMatch.hostIdx === winner.quote.hostMatch.hostIdx &&
        prior.quote.slotKind === winner.quote.slotKind &&
        listingRun.markerSpans.some((span) => tokenSpansOverlap(span, prior.quote.markerSpan))
      ) {
        priorRelations.deleteCanonicalWinner(priorMarkerIdx);
        priorRelations.rebindOwnedPositions(priorMarkerIdx, winner.quote.markerIdx);
        producerMarkerIndices.delete(priorMarkerIdx);
      }
    }
  }
  for (const [priorMarkerIdx, prior] of priorRelations.canonicalEntries()) {
    const priorProducerMarkerIdx = producerMarkerIndices.get(priorMarkerIdx) ?? priorMarkerIdx;
    if (prior.quote.hostMatch.hostIdx !== winner.quote.hostMatch.hostIdx) {
      continue;
    }
    if (
      priorProducerMarkerIdx !== prior.quote.markerIdx &&
      prior.quote.markerSpan.start === winner.quote.markerSpan.start &&
      prior.quote.markerSpan.endExclusive === winner.quote.markerSpan.endExclusive
    ) {
      return null;
    }
    if (
      winner.quote.slotKind !== "question_content" ||
      winner.quote.questionBoundarySpan !== null ||
      prior.quote.questionBoundarySpan === null ||
      producerMarkerIdx <= priorProducerMarkerIdx ||
      tokaNominalListingRunEvidenceForMarker(tokens, priorProducerMarkerIdx, lookups) === null
    ) {
      continue;
    }
    priorRelations.deleteCanonicalWinner(priorMarkerIdx);
    priorRelations.rebindOwnedPositions(priorMarkerIdx, winner.quote.markerIdx);
    producerMarkerIndices.delete(priorMarkerIdx);
    winner = {
      ...winner,
      quote: {
        ...winner.quote,
        questionBoundarySpan: prior.quote.questionBoundarySpan,
      },
    };
  }
  return winner;
}

export function collectQuoteStructuralRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  return Array.from(quoteStructuralRelationIndex(options.cursor, options.lookups).winners());
}

function buildQuoteStructuralRelationUncached(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  priorRelations: QuoteStructuralRelationIndex,
  options: QuoteStructuralRelationIndexOptions = {}
): QuoteStructuralRelation | null {
  const { tokens, pos: markerIdx, end: n } = markerCursor;
  const marker = tokens[markerIdx];
  const markerSurface = marker?.surface;
  if (!isQuoteContentMarker(markerCursor, lookups)) {
    return null;
  }
  if (markerSurface === undefined) {
    return null;
  }
  if (markerSurface === "と") {
    const preceding = previousNonSpaceIndex(tokens, markerIdx);
    if (preceding !== null && caseParticleMarkerRelationForToken(tokens[preceding], preceding, { consumers: ["quote_content"] })?.caseSurface === "へ") return null;
  }
  if (
    markerSurface === "か" &&
    kaOwnershipKindAt(tokens, markerIdx, lookups) === "wh_indefinite" &&
    whIndefiniteKaKindAt(tokens, markerIdx, lookups) !== "pronominal" &&
    whIndefiniteKaKindAt(tokens, markerIdx, lookups) !== "counter_quantity"
  ) {
    return null;
  }
  const whIndefinite = isWhIndefiniteToMarker(tokens, markerIdx, lookups);

  const closedToka = closedPropositionTokaAtMarker(tokens, markerIdx, lookups);
  const hostMatch = closedToka !== null
    ? closedPropositionTokaQuoteHostMatch(markerCursor, lookups, closedToka.kaIdx)
    : quoteHostMatchAfterMarker(markerCursor, lookups) ??
      quoteHostMatchForPassiveSareru(markerCursor);
  if (
    hostMatch === null ||
    quoteHostMatchBlockedByNegativeCondition(markerCursor, hostMatch, lookups) ||
    (
      quoteHostMatchIsAttributiveIu(tokens, hostMatch) &&
      !attributiveIuHostHasNodaTail(markerCursor, hostMatch.hostIdx) &&
      !attributiveIuHostProjectsAuxiliaryStemMood(tokens, markerIdx, hostMatch) &&
      !quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
    ) ||
    quoteHostMatchIsTowaIeConcessive(tokens, markerIdx, hostMatch) ||
    quoteHostMatchHasLooseSetsuzokuToBridge(tokens, markerIdx, hostMatch)
  ) {
    return null;
  }
  const reformulation = canonicalReformulationMarkerRelationIndex(tokens, lookups)
    .relationAtQuoteMarker(markerIdx);
  if (
    reformulation?.hostIdx === hostMatch.hostIdx &&
    reformulation.eligibleForQuotePreemption
  ) {
    return null;
  }
  const quotativeIdiom = quotativeDerivedIdiomClaimAt(tokens, markerIdx - 1, { consumers: ["quote_content"] });
  if (
    quotativeIdiom?.quoteMarkerIdx === markerIdx &&
    quotativeIdiom.quoteHostIdx === hostMatch.hostIdx
  ) {
    return null;
  }
  if (tariKeijoujiAdverbialToEvidence(markerCursor.fork(markerIdx, n), {
    allowProtoFollowingPredicateEvidence: true,
    allowBuildProtoFollowingPredicateEvidence: options.allowBuildProtoForTariAdverbialEvidence !== false,
    lookups
  }) !== null) {
    return null;
  }

  const euphemisticJudgmentKato = isEuphemisticJudgmentKato(markerCursor, hostMatch, lookups);
  const compositeCandidate = tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"],
  });
  const requestSource = quoteRequestSourceBeforeMarker(tokens, markerIdx, 0, lookups, {
    includeDesiderative: hostMatch.kind !== "question",
    includeBareDirective: compositeCandidate === null,
  });
  const slotKind = closedToka?.questionEvidence === "question_ka"
    ? "question_content"
    : slotKindForMarker(markerCursor, hostMatch, requestSource, compositeCandidate !== null, lookups);
  if (slotKind === null) {
    return null;
  }
  if (whIndefinite && slotKind !== "question_content" && options.admitWhIndefiniteBareNominalContent !== true) {
    return null;
  }
  const explicitQuoteSpan = explicitQuoteSpanImmediatelyBeforeMarker(tokens, markerIdx);
  const contentTokenEnd = explicitQuoteSpan?.[1] ?? contentTokenEndForMarker(tokens, markerIdx, slotKind);
  const contentTokenStart = explicitQuoteSpan === undefined
    ? quoteContentTokenStart(tokens, defaultContentTokenStartFallback(markerIdx), contentTokenEnd, priorRelations, {
      allowQuotedListPunctuation: quoteCognitiveCopularContentCanBridgePunctuation(tokens, markerIdx, hostMatch, lookups)
    })
    : explicitQuoteSpan[0] + 1;
  if (contentTokenEnd < contentTokenStart) {
    return null;
  }
  const bridgeKind = bridgeKindBetweenMarkerAndHost(tokens, markerIdx, hostMatch, lookups);
  const markerFocus = slotKind === "quoted_content" || slotKind === "request_content"
    ? quoteMarkerFocusParticleAfterMarker(tokens, markerIdx, hostMatch.hostIdx)
    : null;
  const ownedQuoteMarker = tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  }) ?? quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  const listingRun = ownedQuoteMarker?.canonicalSurface === "とかって"
    ? tokaNominalListingRunEvidenceForMarker(tokens, ownedQuoteMarker.span.start, lookups)
    : null;
  const retreatedTteIdx = listingRun === null || ownedQuoteMarker?.canonicalSurface !== "とかって"
    ? null
    : ownedQuoteMarker.span.endExclusive - 1;
  const questionBoundaryMarker: StructuralQuoteMarkerPayload | undefined = retreatedTteIdx === null
    ? undefined
    : {
      markerIdx,
      markerSurface,
      markerSpan: tokenSpan(markerIdx, markerIdx + 1),
      markerBaseSurface: markerSurface,
    };
  const ownedMarker: StructuralQuoteMarkerPayload = markerFocus !== null
    ? {
      markerIdx,
      markerSurface: tokens.slice(markerIdx, markerFocus.index + 1).map((token) => token.surface).join(""),
      markerSpan: tokenSpan(markerIdx, markerFocus.index + 1),
      markerBaseSurface: markerSurface,
    }
    : retreatedTteIdx !== null
      ? {
        markerIdx: retreatedTteIdx,
        markerSurface: tokens[retreatedTteIdx]?.surface ?? "って",
        markerSpan: tokenSpan(retreatedTteIdx, retreatedTteIdx + 1),
        markerBaseSurface: tokens[retreatedTteIdx]?.surface ?? "って",
      }
      : ownedQuoteMarker?.canonicalSurface === "とかって"
      ? {
        markerIdx: ownedQuoteMarker.span.start,
        markerSurface: ownedQuoteMarker.canonicalSurface,
        markerSpan: ownedQuoteMarker.span,
        markerBaseSurface: markerSurface,
      }
      : closedToka !== null
      ? {
        markerIdx,
        markerSurface: tokens.slice(markerIdx, closedToka.kaIdx + 1).map((token) => token.surface).join(""),
        markerSpan: tokenSpan(markerIdx, closedToka.kaIdx + 1),
        markerBaseSurface: markerSurface,
      }
      : {
        markerIdx,
        markerSurface,
        markerSpan: tokenSpan(markerIdx, markerIdx + 1),
        markerBaseSurface: markerSurface,
      };
  const baseRelation = makeQuoteStructuralRelation({
    tokens,
    lookups,
    slotKind,
    marker: ownedMarker,
    ...(questionBoundaryMarker === undefined ? {} : { questionBoundaryMarker }),
    ...(markerFocus === null ? {} : { focusParticle: markerFocus.surface }),
    hostMatch,
    contentTokenStart,
    contentTokenEnd,
    bridgeKind,
    requestSource,
    explicitQuotation: explicitQuoteSpan !== undefined,
  });
  const relation: QuoteStructuralRelation = {
    ...baseRelation,
    quote: {
      ...baseRelation.quote,
      ...(euphemisticJudgmentKato ? { questionBoundaryKind: "euphemistic_judgment_kato" } : {}),
      ...questionClosedTokaQuotePayload(closedToka?.questionEvidence),
    },
    ...(closedToka?.questionEvidence === "question_ka"
      ? { candidateSuppressibleTokenSpans: [], renderEnabledByDefault: false }
      : {}),
  };
  if (quoteStructuralRelationLooksAdverbialToContent(tokens, relation)) {
    return null;
  }
  if (
    quoteStructuralRelationLooksBareNominalContent(tokens, relation) &&
    !quoteHostAllowsBareNominalContent(tokens, relation, lookups)
  ) {
    return null;
  }
  return relation;
}

function attributiveIuHostHasNodaTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostIdx: number
): boolean {
  const { tokens, end: n } = cursor;
  const nominalizerIdx = nextNonSpaceIndex(tokens, hostIdx + 1, n);
  if (nominalizerIdx === null) {
    return false;
  }
  if (cursor.lookahead(nominalizerIdx - cursor.pos, detectNoda) !== null) return true;
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "terminal_noda_marker",
    consumers: ["quote_content"],
  });
  const clause = activeProtoLayout()?.clauseOfToken(nominalizerIdx);
  return nominalizer?.nominalizerKind === "no" && clause?.terminatedBy === "punctuation";
}

function attributiveIuHostProjectsAuxiliaryStemMood(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  if (quoteMarkerFocusParticleAfterMarker(tokens, markerIdx, hostMatch.hostIdx) === null) {
    return false;
  }
  const moodIdx = nextNonSpaceIndex(tokens, hostMatch.hostIdx + 1);
  const mood = moodIdx === null ? undefined : tokens[moodIdx];
  return mood !== undefined && isAuxiliaryStemToken(mood);
}

function slotKindForMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostMatch: QuoteHostMatch,
  requestSource: QuoteRequestSourceEvidence | null,
  compositeCandidate: boolean,
  lookups: LookupTables,
): StructuralQuoteContentSlotKind | null {
  const { tokens, pos: markerIdx } = cursor;
  if (isKatoQuestionMarker(cursor, hostMatch, lookups)) {
    return isEuphemisticJudgmentKato(cursor, hostMatch, lookups)
      ? "quoted_content"
      : "question_content";
  }
  const markerSurface = tokens[markerIdx]?.surface;
  if (markerSurface === "だって") {
    if (hostMatch.kind === "thought" || hostMatch.kind === "report" || hostMatch.kind === "question") {
      return "quoted_content";
    }
    return null;
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (compositeCandidate) {
    return hostMatch.kind === "wish" ? "wish_content" : "quoted_content";
  }
  if (
    quoteMarker?.tokenCount === 1 &&
    (quoteMarker.canonicalSurface === "と" || quoteMarker.canonicalSurface === "って")
  ) {
    if (hostMatch.kind === "wish") {
      return "wish_content";
    }
    if (
      hostMatch.kind === "request" ||
      (
        lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "command_request") &&
        quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
      ) ||
      (hostMatch.kind === "question" && requestSource !== null)
    ) {
      return "request_content";
    }
    return "quoted_content";
  }
  return null;
}

function isQuoteContentMarker(cursor: TokenCursor<RuntimeHaruToken>, lookups: LookupTables): boolean {
  const { tokens, pos: markerIdx } = cursor;
  const marker = tokens[markerIdx];
  const surface = marker?.surface;
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (
    quoteMarker !== null &&
    quoteMarker.tokenCount === 1 &&
    (quoteMarker.canonicalSurface === "と" || quoteMarker.canonicalSurface === "って")
  ) {
    return true;
  }
  if (tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  }) !== null) {
    return true;
  }
  if (marker === undefined || surface !== "だって" || (marker.pos & POS0) !== 助詞) {
    return false;
  }
  return classifyDatteMarkerAt(cursor, lookups).role === "quote_marker";
}
