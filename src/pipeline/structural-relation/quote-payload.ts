import type { LookupTables } from "../lookup-tables.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import type { QuoteBoundaryFocusParticle } from "../head-tail/tail/predicate-root/grammar.js";
import type { QuoteHostMatch } from "../quote/host-taxonomy.js";
import { kaMarkerRelationAt, questionContentContinuationAfterKaRelationAt } from "../head-tail/boundary/marker.js";
import { kaOwnershipKindAt } from "../head-tail/boundary/ka-ownership.js";
import type { RuleTraceDetailValue } from "../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralQuoteBridgeKind, StructuralQuoteContentSlotKind, StructuralQuoteMarkerPayload, StructuralRelation, StructuralRelationTokenSpan } from "./types.js";
import { type QuoteRequestSourceEvidence, quoteRequestPayloadAtProduction } from "./quote-request.js";
import { tokenSpan } from "./quote-content-span.js";
import { tokaNominalListingRunEvidenceForMarker } from "./toka-nominal-listing-run.js";
import { quoteConditionalContentPayload, quoteRenderEnabledPayload } from "./quote-content-endings.js";

export type QuoteStructuralRelation = StructuralRelation & {
  readonly quote: NonNullable<StructuralRelation["quote"]>;
};

export function quoteRelationOwnsMarkerRealization(relation: QuoteStructuralRelation): boolean {
  return relation.quote.markerRealization !== "exemplification";
}

export function quoteStructuralRelationKoreanClauseForm(relation: QuoteStructuralRelation): "기를" | "다고" | "는지" | "라고" {
  if (relation.quote.slotKind === "wish_content") {
    return "기를";
  }
  if (relation.quote.slotKind === "request_content") {
    return "라고";
  }
  if (relation.quote.slotKind === "question_content") {
    return "는지";
  }
  return "다고";
}

export function makeQuoteStructuralRelation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly slotKind: StructuralQuoteContentSlotKind;
  readonly marker: StructuralQuoteMarkerPayload;
  readonly questionBoundaryMarker?: StructuralQuoteMarkerPayload;
  readonly focusParticle?: QuoteBoundaryFocusParticle;
  readonly hostMatch: QuoteHostMatch;
  readonly contentTokenStart: number;
  readonly contentTokenEnd: number;
  readonly bridgeKind: StructuralQuoteBridgeKind | null;
  readonly requestSource: QuoteRequestSourceEvidence | null;
  readonly explicitQuotation?: boolean;
}): QuoteStructuralRelation {
  const markerSpan = options.marker.markerSpan;
  const contentSpan = tokenSpan(options.contentTokenStart, options.contentTokenEnd);
  const proto = activeProtoLayout();
  const sourceClauseIndex = proto?.clauseIndexOfToken(options.contentTokenStart) ?? -1;
  const targetClauseIndex = proto?.clauseIndexOfToken(options.hostMatch.hostIdx) ?? -1;
  const conditionalContent = quoteConditionalContentPayload(
    options.tokens,
    contentSpan,
    options.marker.markerIdx,
    options.slotKind,
    options.hostMatch,
    options.lookups,
  );
  const relation: QuoteStructuralRelation = {
    kind: options.slotKind,
    source: {
      kind: "span",
      span: contentSpan,
      clauseId: sourceClauseIndex < 0 ? null : `clause:${sourceClauseIndex}`,
    },
    target: {
      kind: "predicate",
      predicateIdx: options.hostMatch.hostIdx,
      clauseId: targetClauseIndex < 0 ? null : `clause:${targetClauseIndex}`,
      span: tokenSpan(options.hostMatch.supportIdx ?? options.hostMatch.hostIdx, options.hostMatch.hostIdx + 1),
    },
    markerSpans: [{
      start: markerSpan.start,
      endExclusive: markerSpan.endExclusive,
      surface: options.tokens.slice(markerSpan.start, markerSpan.endExclusive).map((token) => token.surface).join(""),
      role: `${options.slotKind}_marker`,
    }],
    candidateSuppressibleTokenSpans: [{
      start: markerSpan.start,
      endExclusive: markerSpan.endExclusive,
      reason: "quote_marker",
    }],
    projection: {
      sourceForm: "terminal",
      targetSlot: "clause_prefix",
    },
    confidence: "strict",
    ...quoteRenderEnabledPayload(options.tokens, contentSpan, options.marker.markerIdx, options.hostMatch),
    quote: {
      ...options.marker,
      questionBoundarySpan: quoteQuestionBoundarySpanAtProduction(
        options.tokens,
        options.slotKind,
        options.questionBoundaryMarker ?? options.marker,
        options.hostMatch,
        options.lookups,
      ),
      ...(options.focusParticle === undefined ? {} : { focusParticle: options.focusParticle }),
      contentSpan,
      hostPredicateIdx: options.hostMatch.hostIdx,
      hostTokenIdx: options.hostMatch.hostIdx,
      hostMatch: {
        kind: options.hostMatch.kind,
        hostForm: options.hostMatch.hostForm,
        hostIdx: options.hostMatch.hostIdx,
        supportIdx: options.hostMatch.supportIdx,
        ...(options.hostMatch.requestReportingRole === null ? {} : {
          requestReportingRole: options.hostMatch.requestReportingRole,
        }),
      },
      slotKind: options.slotKind,
      ...(options.explicitQuotation === true ? { explicitQuotation: true } : {}),
      bridgeKind: options.bridgeKind,
      ...(conditionalContent === null ? {} : { conditionalContent }),
    },
    provenance: "structural_relation_owner",
  };
  const request = quoteRequestPayloadAtProduction(options.tokens, relation, options.requestSource, options.lookups);
  return request === null
    ? relation
    : { ...relation, quote: { ...relation.quote, request } };
}

function quoteQuestionBoundarySpanAtProduction(
  tokens: readonly RuntimeHaruToken[],
  slotKind: StructuralQuoteContentSlotKind,
  marker: StructuralQuoteMarkerPayload,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): StructuralRelationTokenSpan | null {
  if (slotKind !== "question_content") return null;
  if (marker.markerBaseSurface === "かどうか") {
    const alternative = questionContentContinuationAfterKaRelationAt(tokens, marker.markerIdx, {
      consumers: ["quote_content"],
      requireAdjacent: true,
      limit: hostMatch.hostIdx + 1,
    });
    return alternative?.continuationKind === "question_alternative_marker"
      ? alternative.span
      : null;
  }
  const questionStart = previousNonSpaceIndex(tokens, marker.markerIdx, 0);
  if (questionStart === null || kaMarkerRelationAt(tokens, questionStart, ["quote_content"]) === null) {
    return null;
  }
  if (kaOwnershipKindAt(tokens, questionStart, lookups) === "toka_listing") {
    const listingMarkerIdx = previousNonSpaceIndex(tokens, questionStart, 0);
    if (
      listingMarkerIdx !== null &&
      tokaNominalListingRunEvidenceForMarker(tokens, listingMarkerIdx, lookups) !== null
    ) {
      return null;
    }
  }
  return tokenSpan(questionStart, marker.markerIdx + 1);
}

export function quoteStructuralRelationTraceDetail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  options: {
    readonly contentIdx: number;
    readonly koreanClauseForm?: string | null;
    readonly consumedMarker?: boolean;
  }
): { readonly [key: string]: RuleTraceDetailValue } {
  const marker = tokens[relation.quote.markerIdx];
  const hostMatch = relation.quote.hostMatch;
  const detail: { [key: string]: RuleTraceDetailValue } = {
    slotKind: relation.quote.slotKind,
    markerIdx: relation.quote.markerIdx,
    markerSurface: marker?.surface ?? null,
    contentIdx: options.contentIdx,
    contentTokenStart: relation.quote.contentSpan.start,
    contentTokenEnd: relation.quote.contentSpan.endExclusive,
    hostIdx: hostMatch.hostIdx,
    hostForm: hostMatch.hostForm,
    hostKind: hostMatch.kind,
    koreanClauseForm: options.koreanClauseForm ?? quoteStructuralRelationKoreanClauseForm(relation),
    bridgeKind: relation.quote.bridgeKind,
    boundarySource: "proto_clause",
    consumedMarker: options.consumedMarker ?? true
  };
  if (hostMatch.supportIdx !== null) {
    detail.supportIdx = hostMatch.supportIdx;
  }
  return detail;
}
