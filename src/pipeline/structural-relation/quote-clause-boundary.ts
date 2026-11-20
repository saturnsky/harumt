import type { LookupTables } from "../lookup-tables.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import type { ClauseBoundary } from "../head-tail/tail/predicate-root/commit.js";
import type { ConnectiveKind, QuoteBoundaryKoreanClauseForm, QuoteBoundaryPayload, RequestQuoteTailKind } from "../head-tail/tail/predicate-root/grammar.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralRelationTokenSpan } from "./types.js";
import { POS0, POS4, POS5A, 形容詞0, 終止形_, 助動詞, 助動詞_ダ, 動詞, 連体形_ } from "../../types/pos.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { quoteContentRightEdgeHasAdjectivalDistribution, quoteHostHasBareNominalPassiveEvidence, quoteReportingPassiveMarkerEvidence, quoteReportingPassiveHostNeedsCompanionDisambiguation, quoteReportingPassiveIsBeTold, quoteNominalRoleParticleFromRelation } from "./quote-nominal-and-passive.js";
import { requestKoreanClauseForm } from "./quote-request.js";
import { type QuoteStructuralRelation, quoteRelationOwnsMarkerRealization } from "./quote-payload.js";
import { tokenSpan } from "./quote-content-span.js";

type QuoteConnectiveKind = Extract<
  ConnectiveKind,
  "quotative" | "question_content_alternative" | "question_quotative" | "cognitive_complement" | "wish_complement" | "request_complement"
>;

export function quoteConsumedMarkerSpanFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  _lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): StructuralRelationTokenSpan | null {
  if (!quoteRelationOwnsMarkerRealization(relation)) {
    return null;
  }
  const lowerBound = options.lowerBoundInclusive ?? 0;
  const markerIdx = relation.quote.markerIdx;
  if (relation.quote.slotKind === "question_content") {
    const questionBoundarySpan = relation.quote.questionBoundarySpan;
    return questionBoundarySpan !== null && questionBoundarySpan.start >= lowerBound
      ? questionBoundarySpan
      : null;
  }
  if (relation.quote.markerSpan.endExclusive > markerIdx + 1) {
    return markerIdx < lowerBound ? null : relation.quote.markerSpan;
  }
  if (relation.quote.slotKind === "quoted_content") {
    const redundantCopulaStart = redundantPredicateQuoteCopulaStart(tokens, markerIdx, { lowerBoundInclusive: lowerBound });
    return tokenSpan(redundantCopulaStart ?? relation.quote.markerSpan.start, relation.quote.markerSpan.endExclusive);
  }
  if (markerIdx < lowerBound) {
    return null;
  }
  return tokenSpan(markerIdx, markerIdx + 1);
}

export function quoteBoundarySurfaceFromRelation(
  _tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  _lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): string | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  if (relation.quote.slotKind === "question_content") {
    const questionBoundarySpan = relation.quote.questionBoundarySpan;
    if (questionBoundarySpan === null || questionBoundarySpan.start < lowerBound) {
      return null;
    }
    return relation.quote.markerBaseSurface === "かどうか" ? "かどうか" : "かと";
  }
  const baseMarkerSurface = baseQuoteMarkerSurface(_tokens, relation);
  if (baseMarkerSurface === null) {
    return null;
  }
  if (relation.quote.slotKind !== "quoted_content") {
    return baseMarkerSurface;
  }
  const redundantCopulaStart = redundantPredicateQuoteCopulaStart(_tokens, relation.quote.markerIdx, { lowerBoundInclusive: lowerBound });
  return _tokens
    .slice(redundantCopulaStart ?? relation.quote.markerSpan.start, relation.quote.markerSpan.endExclusive)
    .map((token) => token.surface)
    .join("");
}

export function quoteBoundaryTokenIndexFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): number | null {
  const span = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, options);
  if (span === null) {
    return null;
  }
  return relation.quote.focusParticle === undefined
    ? span.endExclusive - 1
    : relation.quote.markerIdx;
}

export function quoteConnectiveKindFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteConnectiveKind | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  if (relation.quote.slotKind === "question_content" && relation.quote.markerBaseSurface === "かどうか") {
    return quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, { lowerBoundInclusive: lowerBound }) === null
      ? null
      : "question_content_alternative";
  }
  const baseMarkerSurface = baseQuoteMarkerSurface(tokens, relation);
  if (baseMarkerSurface === null) {
    return null;
  }
  if (relation.quote.slotKind === "question_content") {
    const questionStart = relation.quote.questionBoundarySpan?.start;
    if (questionStart === undefined || questionStart < lowerBound) {
      return null;
    }
    return relation.quote.request === undefined ? "question_quotative" : "request_complement";
  }
  if (relation.quote.slotKind === "wish_content") {
    return "wish_complement";
  }
  if (relation.quote.slotKind === "request_content") {
    return "request_complement";
  }
  if (lookups.QUOTE_HOST_REGISTRY.hostHasCapability(relation.quote.hostMatch, "cognitive_complement")) {
    return "cognitive_complement";
  }
  if (
    relation.quote.request?.tailKind !== null &&
    relation.quote.request?.tailKind !== undefined
  ) {
    return "request_complement";
  }
  return "quotative";
}

export function quoteKoreanClauseFormFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteBoundaryKoreanClauseForm | null {
  const connectiveKind = quoteConnectiveKindFromRelation(tokens, relation, lookups, options);
  if (connectiveKind === null) {
    return null;
  }
  if (connectiveKind === "request_complement") {
    return requestKoreanClauseForm(relation.quote.request?.tailKind ?? null);
  }
  if (connectiveKind === "wish_complement") {
    return "기를";
  }
  if (connectiveKind === "question_quotative" || connectiveKind === "question_content_alternative") {
    return "는지";
  }
  if (connectiveKind === "cognitive_complement") {
    return "다는 것을";
  }
  if (quoteReportingPassiveIsBeTold(tokens, relation, lookups)) {
    return "다는 말을";
  }
  return "다고";
}

export function quoteClauseBoundaryFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): ClauseBoundary | null {
  const connectiveKind = quoteConnectiveKindFromRelation(tokens, relation, lookups, options);
  const koreanClauseForm = quoteKoreanClauseFormFromRelation(tokens, relation, lookups, options);
  const surface = quoteBoundarySurfaceFromRelation(tokens, relation, lookups, options);
  const tokenIdx = quoteBoundaryTokenIndexFromRelation(tokens, relation, lookups, options);
  const span = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, options);
  const nominalRoleParticle = quoteNominalRoleParticleFromRelation(tokens, relation, lookups);
  const reportingPassiveRoleLabel =
    relation.quote.markerBaseSurface === "と" &&
    quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) &&
    quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups);
  const adjectivalDistributionContent =
    quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) &&
    quoteReportingPassiveMarkerEvidence(tokens, relation, lookups) &&
    quoteContentRightEdgeHasAdjectivalDistribution(tokens, relation);
  if (connectiveKind === null || koreanClauseForm === null || surface === null || tokenIdx === null || span === null) {
    return null;
  }
  return buildQuoteClauseBoundary({
    connectiveKind,
    koreanClauseForm,
    surface,
    tokenIdx,
    tokenSpan: { start: span.start, end: span.endExclusive - 1 },
    requestTailKind: relation.quote.request?.tailKind ?? null,
    ...(relation.quote.focusParticle === undefined ? {} : { focusParticle: relation.quote.focusParticle }),
    ...(nominalRoleParticle === null ? {} : { nominalRoleParticle }),
    reportingPassiveRoleLabel,
    adjectivalDistributionContent
  });
}

export interface QuoteClauseBoundaryBuildInput {
  readonly connectiveKind: QuoteConnectiveKind;
  readonly koreanClauseForm: QuoteBoundaryKoreanClauseForm;
  readonly surface: string;
  readonly tokenIdx: number;
  readonly tokenSpan: { readonly start: number; readonly end: number };
  readonly requestTailKind: RequestQuoteTailKind | null;
  readonly focusParticle?: QuoteBoundaryPayload["focusParticle"];
  readonly nominalRoleParticle?: QuoteBoundaryPayload["nominalRoleParticle"];
  readonly reportingPassiveRoleLabel?: boolean;
  readonly adjectivalDistributionContent?: boolean;
}

export function buildQuoteClauseBoundary(input: QuoteClauseBoundaryBuildInput): ClauseBoundary {
  const quoteBoundary: QuoteBoundaryPayload = {
    koreanClauseForm: input.koreanClauseForm,
    requestTailKind: input.requestTailKind,
    ...(input.focusParticle === undefined ? {} : { focusParticle: input.focusParticle }),
    ...(input.nominalRoleParticle === undefined ? {} : { nominalRoleParticle: input.nominalRoleParticle }),
    ...(input.reportingPassiveRoleLabel === true ? { reportingPassiveRoleLabel: true } : {}),
    ...(input.adjectivalDistributionContent === true ? { adjectivalDistributionContent: true } : {})
  };
  return {
    kind: "接続助詞",
    connectiveKind: input.connectiveKind,
    surface: input.surface,
    tokenIdx: input.tokenIdx,
    tokenSpan: input.tokenSpan,
    quoteBoundary
  };
}

export function buildQuoteConnectiveOpFromBoundary(
  source: import("../head-tail/tail/predicate-root/grammar.js").OpSource,
  boundary: ClauseBoundary,
  connectiveOverride?: QuoteConnectiveKind
): import("../head-tail/tail/predicate-root/grammar.js").ConnectiveOp {
  if (boundary.kind === "terminal") {
    throw new Error("terminal boundary cannot materialize a quote connective op");
  }
  return createConnectiveOp({
    connective: connectiveOverride ?? boundary.connectiveKind,
    surface: boundary.surface,
    source,
    ...(boundary.quoteBoundary === undefined ? {} : { quoteBoundary: boundary.quoteBoundary })
  });
}

export function quoteStructuralRelationHostIsAttributiveIu(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const hostMatch = relation.quote.hostMatch;
  if (!IU_LEXEME_FORMS.has(hostMatch.hostForm)) {
    return false;
  }
  const pos = tokens[hostMatch.hostIdx]?.pos ?? 0;
  return (pos & POS5A) === 連体形_;
}

function baseQuoteMarkerSurface(
  _tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): string | null {
  return relation.quote.markerBaseSurface;
}

export function redundantPredicateQuoteCopulaStart(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  options: { readonly lowerBoundInclusive?: number } = {}
): number | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  const marker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (marker?.canonicalSurface !== "と") {
    return null;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, markerIdx, lowerBound);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (
    copulaIdx === null || copula === undefined || copula.surface !== "だ" || (copula.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 終止形_)
  ) {
    return null;
  }
  const beforeCopulaIdx = previousNonSpaceIndex(tokens, copulaIdx, lowerBound);
  const beforeCopula = beforeCopulaIdx === null ? undefined : tokens[beforeCopulaIdx];
  return tokenCanStandBeforeRedundantQuoteCopula(beforeCopula) ? copulaIdx : null;
}

function tokenCanStandBeforeRedundantQuoteCopula(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  const pos5A = token.pos & POS5A;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  return pos5A === 終止形_ || pos5A === 連体形_;
}
