import type { RuntimeHaruToken, SourceTokenSpan } from "../../types/token.js";
import {
  isNominalHeadTailChainRenderPlan,
  isPredicateHeadTailChainRenderPlan
} from "../../types/render-plan.js";
import type {
  AttributiveRealization,
  LemmaRealization,
  ParticleSourceProvenance,
  ReasonBecausePayload,
  RenderPlan,
  PredicateHeadTailChainRenderPlan,
  StructuralRelationSequencePart,
  StructuralRelationSequencePlan
} from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { lazyValue } from "../../data-loader.js";
import { isClauseEvidenceTransparentPunctuation, isClauseOpeningPunctuationToken } from "../clause-layout/punctuation.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { attachParticleRenderPlan, contractPossessivePronounPlan, particleKeyFromAllomorph } from "../rendering/particle-plan.js";
import { matchCopulaTailWithOptionalConditional } from "../semantics/copula-tail-runtime.js";
import { TokenCursor } from "../token-cursor.js";
import type { NominalHeadTailChainPlan } from "../head-tail/lifecycle/head-tail-render-plan.js";
import { loadConnectiveSurfaceEntries } from "../head-tail/tail/predicate-root/connective-surface-table.js";
import { CONNECTIVE_RENDER_MAP } from "../head-tail/tail/predicate-root/connective-render-table.js";
import { nominalPhraseOwnerPrefix } from "../head-tail/head/adapters/nominal/commit.js";
import { resolveCandidateSetLayer, resolveCandidateSetStem } from "../head-tail/tail/predicate-root/commit.js";
import {
  isConditionalQuoteProductionMatch,
  normalizeProductionMatch,
  probeProductionDispatch,
} from "../head-tail/tail/predicate-root/production-registry.js";
import { SFP_NA_EXCLAMATORY_NOMINALIZERS, TYPIFICATION_QUOTATIVE_HEADS } from "../head-tail/data/semantic-helper-sets.js";
import { quoteProjectionForSfpEffect } from "../semantics/sfp-quote-projection.js";
import { type AuxLayerNode, type AuxOpNode, type ConnectiveKind, type ConnectiveOp, type ObligationIdiomOp, type OpSource, type QuoteBoundaryFocusParticle, type SfpEffect, type SfpNode, type StemNode, type TailNode, type TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import { firstAuxLayer, isBenefactiveAspectOp, tailPredicateHostPrefersTameReason, tailRootVoiceOps } from "../head-tail/tail/predicate-root/inspect.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import { REASON_BECAUSE_BOUND_NOUN, attributiveModifierPlanSourceFacts, realizeRenderPlan } from "../rendering/render-plan.js";
import { TranslationUnit, UnitType, type TranslationUnitProvenance } from "../translation/unit.js";
import { selectPlainVerbAttributiveEnding } from "../attributive.js";
import { projectionUnavailable, relationConflict } from "./diagnostics.js";
import {
  isNominalizedConjectureMatrixQuestionPlan,
  projectNominalizedConjectureMatrixQuestionContinuationPlan,
} from "./ka-parallel-plan.js";
import { asIrregular, conjugate, type IrregularType } from "../../generator/conjugator.js";
import type {
  StructuralRelation,
  StructuralRelationDiagnostic,
  StructuralRelationGraph,
  StructuralKaParallelClosure,
  StructuralKaParallelItem,
  StructuralNariParallelItem,
  StructuralNominalExemplificationPayload,
  StructuralQuotePayload,
  StructuralReasonCopulaSfp,
  StructuralRelationTokenSpan,
} from "./types.js";
import type { ParticleKey } from "../../generator/particles.js";

import { POS0, POS4, POS5A, 助動詞_タ, 動詞, 名詞, 代名詞, 補助記号, 記号, 連用形_, isTerminalAssertiveCopulaToken, 대명사, 동사, 명사, 수사, 형용사, 구, 기호 } from "../../types/pos.js";
import { isTameReasonHeadContext } from "../attributive.js";
import { sourceSpanForTokenIndexes } from "../assembler.js";
import {
  reasonCopulaQuoteContentMatchBeforeMarker,
  type ReasonCopulaQuoteContentMatch,
} from "./quote.js";
import { createConjectureOp, createConnectiveOp, createIdiomOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { nounCopulaDiscursiveSfpEnding } from "../head-tail/tail/predicate-root/renderers/sfp-question.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
export interface StructuralRelationRenderProjectRequest {
  readonly relation: StructuralRelation;
  readonly sourceUnits: readonly TranslationUnit[];
  readonly markerUnits: readonly TranslationUnit[];
  readonly targetUnits: readonly TranslationUnit[];
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

export type StructuralRelationRenderProjectResult =
  | { readonly ok: true; readonly renderPlan: RenderPlan }
  | { readonly ok: false; readonly reason: string };

export type StructuralRelationRenderProjector = (
  request: StructuralRelationRenderProjectRequest,
) => StructuralRelationRenderProjectResult;

export interface StructuralRelationRenderConfig {
  readonly enabledRelationKinds: ReadonlySet<string>;
  readonly projectRelation?: StructuralRelationRenderProjector;
  readonly requireRelationRenderEnabled?: boolean;
  readonly useStructuredDefaultProjection?: boolean;
}

export interface StructuralRelationRenderResult {
  readonly units: readonly TranslationUnit[];
  readonly diagnostics: readonly StructuralRelationDiagnostic[];
  readonly renderedRelations: readonly StructuralRelation[];
}

const DEFAULT_RENDER_ENABLED_RELATION_KINDS: ReadonlySet<string> = lazyValue(() => new Set(loadConnectiveSurfaceEntries({
  isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0,
})
  .filter((entry) => entry.relationPolicy !== undefined && entry.renderEnabledByDefault === true)
  .map((entry) => entry.relationPolicy as string)
  .concat(["punctuated_attributive_modifier", "tari_listing_coordination", "te_attendant_simultaneous", "ka_parallel_choice", "ka_parallel_question_content", "toka_parallel_listing", "toka_nominal_listing", "embedded_question_attributive_quote", "nari_parallel_choice", "purpose_clause_coordination", "quoted_content", "question_content", "request_content", "wish_content", "reason_copula_explanation", "immediate_sequence", "stative_hold_sequence"])));

export function defaultStructuralRelationRenderConfig(): StructuralRelationRenderConfig | null {
  if (DEFAULT_RENDER_ENABLED_RELATION_KINDS.size === 0) {
    return null;
  }
  return {
    enabledRelationKinds: DEFAULT_RENDER_ENABLED_RELATION_KINDS,
    requireRelationRenderEnabled: true,
    useStructuredDefaultProjection: true,
  };
}

interface RelationRenderOperation {
  readonly relation: StructuralRelation;
  readonly insertBeforeUnitIndex: number;
  readonly suppressUnitIndexes: readonly number[];
  readonly sourceUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly projectionTokenIndexes: readonly number[];
  readonly projectionHeadTokenIndex?: number;
  readonly renderPlan: RenderPlan;
  readonly attachLeft?: boolean;
  readonly attachRight?: boolean;
  readonly replaceUnitIndex?: number;
  readonly quotativeMarkerUnitIndex?: number;
  readonly unitRenderPlanReplacements?: readonly {
    readonly unitIndex: number;
    readonly renderPlan: RenderPlan;
  }[];
}

export function applyStructuralRelationRender(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly graph: StructuralRelationGraph;
  readonly config: StructuralRelationRenderConfig;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): StructuralRelationRenderResult {
  const diagnostics: StructuralRelationDiagnostic[] = [];
  const renderedRelations: StructuralRelation[] = [];
  const projectRelation = options.config.projectRelation;
  if (options.config.enabledRelationKinds.size === 0) {
    return {
      units: options.units,
      diagnostics,
      renderedRelations,
    };
  }

  const operations: RelationRenderOperation[] = [];
  const claimedSuppressionUnits = new Set<number>();
  for (const relation of renderCandidateRelations(options.graph, options.config)) {
    const operation = buildRenderOperation({
      ...options,
      relation,
      diagnostics,
      useStructuredDefaultProjection: options.config.useStructuredDefaultProjection !== false,
      ...(projectRelation === undefined ? {} : { projectRelation }),
    });
    if (operation === null) {
      continue;
    }
    const renderBlocker = relationRenderOperationBlocker(operation, options.lookups, options.numeric);
    if (renderBlocker !== null) {
      diagnostics.push(projectionUnavailable({
        message: `relation ${relation.kind} render plan failed validation (${renderBlocker})`,
        relationKind: relation.kind,
        confidence: relation.confidence,
        markerSpans: relation.markerSpans,
      }));
      continue;
    }
    if (operation.suppressUnitIndexes.some((unitIndex) => claimedSuppressionUnits.has(unitIndex))) {
      diagnostics.push(relationConflict({
        message: `relation ${relation.kind} overlaps an already rendered relation`,
        relationKind: relation.kind,
        confidence: relation.confidence,
        markerSpans: relation.markerSpans,
      }));
      continue;
    }
    for (const unitIndex of operation.suppressUnitIndexes) {
      claimedSuppressionUnits.add(unitIndex);
    }
    operations.push(operation);
    renderedRelations.push(operation.relation);
  }

  if (operations.length === 0) {
    return {
      units: options.units,
      diagnostics,
      renderedRelations,
    };
  }

  return {
    units: applyRenderOperations(options.tokens, options.units, operations),
    diagnostics,
    renderedRelations,
  };
}

export function structuralRelationRenderTokenSpans(
  graph: StructuralRelationGraph,
  config: StructuralRelationRenderConfig,
): readonly StructuralRelationTokenSpan[] {
  const spans: StructuralRelationTokenSpan[] = [];
  for (const relation of renderCandidateRelations(graph, config)) {
    spans.push(relation.source.span);
    if (relation.target !== null) {
      spans.push(relation.target.span);
    }
    for (const marker of relation.markerSpans) {
      spans.push({ start: marker.start, endExclusive: marker.endExclusive });
    }
  }
  return spans;
}

function renderCandidateRelations(
  graph: StructuralRelationGraph,
  config: StructuralRelationRenderConfig,
): readonly StructuralRelation[] {
  return graph.relations
    .filter((relation) => {
      const typedProhibitiveRequest = relation.kind === "request_content" &&
        relation.quote?.terminalSfp?.effect === "na_prohib";
      return relation.confidence === "strict" &&
        config.enabledRelationKinds.has(relation.kind) &&
        (config.requireRelationRenderEnabled !== true || relation.renderEnabledByDefault === true || typedProhibitiveRequest);
    })
    .sort((left, right) => {
      const leftStart = relationSourceStart(graph, left);
      const rightStart = relationSourceStart(graph, right);
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }
      const leftMarkerStart = left.markerSpans[0]?.start ?? leftStart;
      const rightMarkerStart = right.markerSpans[0]?.start ?? rightStart;
      if (leftMarkerStart !== rightMarkerStart) {
        return leftMarkerStart - rightMarkerStart;
      }
      return left.kind.localeCompare(right.kind);
    });
}

function buildRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly graph: StructuralRelationGraph;
  readonly relation: StructuralRelation;
  readonly projectRelation?: StructuralRelationRenderProjector;
  readonly useStructuredDefaultProjection?: boolean;
  readonly diagnostics: StructuralRelationDiagnostic[];
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): RelationRenderOperation | null {
  const { relation, units, diagnostics } = options;
  const sourceSpan = relation.source.span;
  const targetSpan = relation.target?.span ?? null;
  if (
    targetSpan === null &&
    relation.kind !== "tari_listing_coordination" &&
    relation.kind !== "ka_parallel_choice" &&
    relation.kind !== "ka_parallel_question_content" &&
    relation.kind !== "toka_parallel_listing" &&
    relation.kind !== "toka_nominal_listing" &&
    relation.kind !== "nari_parallel_choice" &&
    relation.kind !== "reason_copula_explanation"
  ) {
    diagnostics.push(projectionUnavailable({
      message: `relation ${relation.kind} has no renderable source or target span`,
      relationKind: relation.kind,
      confidence: relation.confidence,
      markerSpans: relation.markerSpans,
    }));
    return null;
  }

  const markerSpans = relation.candidateSuppressibleTokenSpans ?? [];
  const markerUnitIndexes = markerSpans
    .flatMap((span) => unitIndexesInSpan(units, span));
  const sourceSpanUnitIndexes = unitIndexesInSpan(units, sourceSpan)
    .filter((unitIndex) => {
      const unit = units[unitIndex];
      return unit !== undefined && !unitFullyCoveredBySpans(unit, markerSpans);
    });
  const sourceUnitIndexes = sourceSpanUnitIndexes
    .filter((unitIndex) => units[unitIndex]?.unitType !== UnitType.SYMBOL);
  if (sourceUnitIndexes.length === 0) {
    diagnostics.push(projectionUnavailable({
      message: `relation ${relation.kind} has no renderable source units`,
      relationKind: relation.kind,
      confidence: relation.confidence,
      markerSpans: relation.markerSpans,
    }));
    return null;
  }

  const requiresStructuredProjection = relationRequiresStructuredProjection(relation, units, sourceUnitIndexes, markerUnitIndexes);
  if (options.useStructuredDefaultProjection === true) {
    const structuredOperation = buildDefaultStructuredRenderOperation({
      ...options,
      relation,
      sourceUnitIndexes,
      sourceSpanUnitIndexes,
      markerUnitIndexes: uniqueSorted(markerUnitIndexes),
      targetUnitIndexes: targetSpan === null ? [] : unitIndexesInSpan(units, targetSpan),
      lookups: options.lookups,
    });
    if (structuredOperation !== null) {
      return structuredOperation;
    }
    if (requiresStructuredProjection) {
      diagnostics.push(projectionUnavailable({
        message: `relation ${relation.kind} requires structured source-bearing projection`,
        relationKind: relation.kind,
        confidence: relation.confidence,
        markerSpans: relation.markerSpans,
      }));
      return null;
    }
  } else if (requiresStructuredProjection) {
    diagnostics.push(projectionUnavailable({
      message: `relation ${relation.kind} requires structured source-bearing projection; custom projector disabled for this family`,
      relationKind: relation.kind,
      confidence: relation.confidence,
      markerSpans: relation.markerSpans,
    }));
    return null;
  }

  if (options.projectRelation === undefined) {
    diagnostics.push(projectionUnavailable({
      message: `relation ${relation.kind} has no structured projection or fallback projector`,
      relationKind: relation.kind,
      confidence: relation.confidence,
      markerSpans: relation.markerSpans,
    }));
    return null;
  }

  const suppressUnitIndexes = uniqueSorted([...sourceUnitIndexes, ...markerUnitIndexes])
    .filter((unitIndex) => units[unitIndex]?.unitType !== UnitType.SYMBOL);
  const targetUnitIndexes = targetSpan === null ? [] : unitIndexesInSpan(units, targetSpan);
  const renderPlan = projectRelationForSharedUnitIr({
    relation,
    units,
    sourceUnitIndexes,
    targetUnitIndexes,
    markerUnitIndexes: uniqueSorted(markerUnitIndexes),
    projectRelation: options.projectRelation,
    diagnostics,
    lookups: options.lookups,
    numeric: options.numeric,
  });
  if (renderPlan === null) {
    return null;
  }

  return {
    relation,
    insertBeforeUnitIndex: sourceUnitIndexes[0] as number,
    suppressUnitIndexes,
    sourceUnitIndexes,
    targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => units[unitIndex]?.jpIndices ?? [])),
    renderPlan,
  };
}

function relationRenderOperationBlocker(
  operation: RelationRenderOperation,
  lookups: LookupTables,
  numeric: NumericTables,
): string | null {
  for (const formal of [false, true] as const) {
    try {
      realizeRenderPlan(operation.renderPlan, { formal, lookups, numeric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `${formal ? "formal" : "casual"}: ${message}`;
    }
  }
  return null;
}

function relationRequiresStructuredProjection(
  relation: StructuralRelation,
  _units: readonly TranslationUnit[],
  _sourceUnitIndexes: readonly number[],
  _markerUnitIndexes: readonly number[],
): boolean {
  return relation.kind === "simultaneous_progression" ||
    relation.kind === "te_attendant_simultaneous" ||
    relation.kind === "listing_example" ||
    relation.kind === "tari_listing_coordination" ||
    relation.kind === "ka_parallel_choice" ||
    relation.kind === "ka_parallel_question_content" ||
    relation.kind === "toka_parallel_listing" ||
    relation.kind === "toka_nominal_listing" ||
    relation.kind === "embedded_question_attributive_quote" ||
    relation.kind === "nari_parallel_choice" ||
    relation.kind === "purpose_clause_coordination" ||
    ((relation.kind === "quoted_content" || relation.kind === "question_content" || relation.kind === "request_content" || relation.kind === "wish_content") && relation.quote !== undefined) ||
    relation.kind === "reason_copula_explanation" ||
    relation.kind === "immediate_sequence" ||
    relation.kind === "stative_hold_sequence" ||
    relation.kind === "concession" ||
    relation.kind === "punctuated_attributive_modifier" ||
    relation.kind === "purpose_modifier" ||
    relation.kind === "correlative_degree";
}

function buildDefaultStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly graph: StructuralRelationGraph;
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly sourceSpanUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  if (options.relation.kind === "purpose_modifier") {
    const purposeOperation = buildPurposeModifierStructuredRenderOperation(options);
    if (purposeOperation !== null) {
      return purposeOperation;
    }
  }
  if (
    options.relation.kind === "punctuated_attributive_modifier"
  ) {
    const attributiveOperation = buildPunctuatedAttributiveStructuredRenderOperation(options);
    if (attributiveOperation !== null) {
      return attributiveOperation;
    }
  }
  if (options.relation.kind === "correlative_degree") {
    const correlativeOperation = buildCorrelativeDegreeStructuredRenderOperation(options);
    if (correlativeOperation !== null) {
      return correlativeOperation;
    }
  }
  if (
    options.relation.kind === "ka_parallel_choice" ||
    options.relation.kind === "ka_parallel_question_content" ||
    options.relation.kind === "toka_parallel_listing"
  ) {
    const kaOperation = buildKaParallelStructuredRenderOperation(options);
    if (kaOperation !== null) {
      return kaOperation;
    }
  }
  if (options.relation.kind === "embedded_question_attributive_quote") {
    const embeddedQuestionQuoteOperation = buildEmbeddedQuestionAttributiveQuoteStructuredRenderOperation(options);
    if (embeddedQuestionQuoteOperation !== null) {
      return embeddedQuestionQuoteOperation;
    }
  }
  if (options.relation.kind === "nari_parallel_choice") {
    const nariOperation = buildNariParallelStructuredRenderOperation(options);
    if (nariOperation !== null) {
      return nariOperation;
    }
  }
  if (options.relation.kind === "toka_nominal_listing") {
    const tokaOperation = buildTokaNominalListingStructuredRenderOperation(options);
    if (tokaOperation !== null) {
      return tokaOperation;
    }
  }
  if (options.relation.kind === "request_content" && options.relation.quote !== undefined) {
    return buildSfpQuoteStructuredRenderOperation(options);
  }
  if (options.relation.kind === "wish_content" && options.relation.quote !== undefined) {
    return buildConditionalWishQuoteStructuredRenderOperation(options);
  }
  if (
    (options.relation.kind === "quoted_content" || options.relation.kind === "question_content") &&
    options.relation.quote !== undefined
  ) {
    const bareKaQuestionOperation = buildBareKaQuestionContentStructuredRenderOperation(options);
    if (bareKaQuestionOperation !== null) {
      return bareKaQuestionOperation;
    }
    const typificationOperation = buildAttributiveTypificationQuoteStructuredRenderOperation(options);
    if (typificationOperation !== null) {
      return typificationOperation;
    }
    const conjectureOperation = buildConjectureQuoteStructuredRenderOperation(options);
    if (conjectureOperation !== null) {
      return conjectureOperation;
    }
    const absorbedCopulaOperation = buildMarkerAbsorbedContentCopulaRenderOperation(options);
    if (absorbedCopulaOperation !== null) {
      return absorbedCopulaOperation;
    }
    const sfpQuoteOperation = buildSfpQuoteStructuredRenderOperation(options);
    if (sfpQuoteOperation !== null) {
      return sfpQuoteOperation;
    }
    const reasonCopulaQuoteOperation = buildReasonCopulaQuoteStructuredRenderOperation(options);
    if (reasonCopulaQuoteOperation !== null) {
      return reasonCopulaQuoteOperation;
    }
    const conditionalThoughtOperation = buildConditionalWishQuoteStructuredRenderOperation(options);
    if (conditionalThoughtOperation !== null) {
      return conditionalThoughtOperation;
    }
    const conditionalQuoteOperation = buildConditionalThoughtQuoteMarkerStructuredRenderOperation(options);
    if (conditionalQuoteOperation !== null) {
      return conditionalQuoteOperation;
    }
    const conditionalReportOperation = buildConditionalReportQuoteStructuredRenderOperation(options);
    if (conditionalReportOperation !== null) {
      return conditionalReportOperation;
    }
    const quoteOperation = buildPredicateBoundTameQuoteStructuredRenderOperation(options);
    if (quoteOperation !== null) {
      return quoteOperation;
    }
  }
  if (options.relation.kind === "reason_copula_explanation") {
    const reasonCopulaOperation = buildReasonCopulaExplanationStructuredRenderOperation(options);
    if (reasonCopulaOperation !== null) {
      return reasonCopulaOperation;
    }
  }
  const connective = sourcePredicateConnectiveProjection(options.relation);
  if (connective === null) {
    return null;
  }
  for (const unitIndex of sourcePredicateProjectionCandidateUnitIndexes(
    options.units,
    options.relation,
    options.sourceUnitIndexes,
    options.markerUnitIndexes,
  )) {
    const unit = options.units[unitIndex];
    if (unit === undefined || unit.unitType === UnitType.SYMBOL) {
      continue;
    }
    const projectedPlan = projectUnitPredicateConnectivePlan(
      unit,
      connective,
      opSourceForMarkerSpans(options.tokens, options.relation.markerSpans),
    );
    if (projectedPlan === null) {
      continue;
    }
    const suppressUnitIndexes = uniqueSorted([unitIndex, ...options.markerUnitIndexes])
      .filter((candidateIndex) => options.units[candidateIndex]?.unitType !== UnitType.SYMBOL);
    const edgeAttachment = projectionEdgeAttachment(options.units, suppressUnitIndexes);
    return {
      relation: options.relation,
      insertBeforeUnitIndex: unitIndex,
      suppressUnitIndexes,
      ...edgeAttachment,
      sourceUnitIndexes: options.sourceUnitIndexes,
      targetUnitIndexes: options.targetUnitIndexes,
      projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
        options.units[candidateIndex]?.jpIndices ?? []
      ))),
      renderPlan: projectedPlan,
    };
  }
  if (options.relation.kind === "concession") {
    return buildNominalConcessionStructuredRenderOperation(options);
  }
  return null;
}

function buildBareKaQuestionContentStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (
    quote?.slotKind !== "question_content" ||
    (quote.questionBoundaryKind !== "bare_ka" && quote.questionBoundaryKind !== "nominalized_no_ka") ||
    quote.contentPredicateIdx === undefined ||
    quote.contentPredicateIdx === null
  ) {
    return null;
  }
  const sourceUnitIndex = options.sourceUnitIndexes.find((unitIndex) =>
    options.units[unitIndex]?.jpIndices.includes(quote.contentPredicateIdx!) === true
  );
  const sourceUnit = sourceUnitIndex === undefined ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === undefined || sourceUnit === undefined) {
    return null;
  }
  const sourcePlan = sourceUnit.renderPlan;
  if (quote.contentPredicateAnchorKind === "interrogative_head" && isPredicateHeadTailChainRenderPlan(sourcePlan)) {
    const tail = sourcePlan.realization.root.tail;
    const anchoredAtHead = tail.kind === "auxLayer" &&
      tail.stem.semanticAnchors.some((anchor) => tail.stem.source.tokenIndices[anchor] === quote.contentPredicateIdx);
    if (!anchoredAtHead) {
      return null;
    }
  }
  const projectedPlan = projectNominalizedConjectureMatrixQuestionContinuationPlan(
    sourceUnit.renderPlan,
    quote.markerIdx,
    quote.markerBaseSurface,
  ) ?? normalizeConfirmedQuestionContentAlternativePlan(
    sourceUnit.renderPlan,
    quote.markerIdx,
    quote.markerBaseSurface,
  ) ?? projectUnitHeadTailConnectivePlan(
    sourceUnit,
    { connective: "question_content", surface: quote.markerBaseSurface },
    opSourceForMarkerSpans(options.tokens, options.relation.markerSpans),
    true,
  ) ?? projectBareNounZeroCopulaQuestionContentPlan(
    sourceUnit.renderPlan,
    quote.contentPredicateAnchorKind,
    quote.markerBaseSurface,
  ) ?? projectNominalFrameQuestionContentPlan(
    sourceUnit.renderPlan,
    quote.markerBaseSurface,
  ) ?? (
    quote.contentPredicateAnchorKind === "zero_copula_nominal"
      ? null
      : projectNominalQuestionContentPlan(sourceUnit.renderPlan)
  );
  if (projectedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted(options.markerUnitIndexes.filter((unitIndex) => unitIndex !== sourceUnitIndex));
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...sourceUnit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: markStructuralKaParallelQuestionContentPlan(projectedPlan),
  };
}

function projectBareNounZeroCopulaQuestionContentPlan(
  plan: RenderPlan | null,
  anchorKind: StructuralQuotePayload["contentPredicateAnchorKind"],
  markerSurface: string,
): RenderPlan | null {
  if (anchorKind !== "zero_copula_nominal" || plan?.kind !== "lemma") {
    return null;
  }
  if (plan.koreanPos !== 명사 && plan.koreanPos !== 대명사 && plan.koreanPos !== 수사) {
    return null;
  }
  const ending = CONNECTIVE_RENDER_MAP.get(markerSurface)?.korean;
  if (ending === undefined) {
    return null;
  }
  const { connective: _legacyConnective, suffix: _legacySuffix, ...head } = plan;
  return { ...head, connective: ending, sfp: null, terminalSfp: null };
}

function projectNominalFrameQuestionContentPlan(
  plan: RenderPlan | null,
  markerSurface: string,
): RenderPlan | null {
  if (!isNominalHeadTailChainRenderPlan(plan) || plan.realization.frame.projection.kind !== "headLexicalForm") {
    return null;
  }
  const ending = CONNECTIVE_RENDER_MAP.get(markerSurface)?.korean;
  if (ending === undefined) {
    return null;
  }
  const headText = nominalPhraseOwnerPrefix(plan, "");
  if (headText.length === 0) {
    return null;
  }
  const hintPos = plan.realization.root.kind === "nominalPhrase"
    ? plan.realization.root.head.allomorphHint?.koreanPos
    : undefined;
  return {
    kind: "lemma",
    entry: null,
    koreanLemma: headText,
    koreanPos: hintPos === 대명사 ? 대명사 : 명사,
    irregular: null,
    auxTokens: [],
    connective: ending,
    sfp: null,
    terminalSfp: null,
  };
}

function projectNominalQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind === "fixedText") {
    return structuralRelationSequencePlan([
      plan,
      { kind: "structuralText", text: "인지", koreanPos: 구 },
    ]);
  }
  if (plan?.kind === "registerText") {
    return structuralRelationSequencePlan([
      plan,
      { kind: "structuralText", text: "인지", koreanPos: 구 },
    ]);
  }
  return null;
}

function normalizeConfirmedQuestionContentAlternativePlan(
  plan: RenderPlan | null,
  markerIdx: number,
  markerSurface: string,
): PredicateHeadTailChainRenderPlan | null {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const alternative = plan.realization.root.tail.ops.find((op): op is ConnectiveOp =>
    op.kind === "connective" &&
    op.connective === "alternative" &&
    op.source.tokenIndices.includes(markerIdx)
  );
  if (alternative === undefined) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    { connective: "question_content", surface: markerSurface },
    alternative.source,
    true,
  );
}

function buildConjectureQuoteStructuredRenderOperation(options: {
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (quote === undefined || quote.slotKind !== "quoted_content") return null;
  const sourceUnitIndex = [...options.sourceUnitIndexes].reverse().find((unitIndex) =>
    isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan)
  );
  if (sourceUnitIndex === undefined) return null;
  const unit = options.units[sourceUnitIndex];
  const sourcePlan = unit?.renderPlan;
  if (unit === undefined || !isPredicateHeadTailChainRenderPlan(sourcePlan)) return null;
  const committed = materializeSfpOwnerStem(sourcePlan);
  const layer = firstAuxLayer(committed.realization.root.tail);
  if (layer === null) return null;
  const quoteIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "quotative");
  if (quoteIdx < 0) return null;
  const beforeQuote = layer.ops.slice(0, quoteIdx);
  const conjectural = layer.stem.kind === "noun"
    ? beforeQuote.some((op) => op.kind === "copula" && op.variant === "conjecture")
    : (layer.stem.kind === "verb" || layer.stem.kind === "adj") &&
      beforeQuote.some((op) => op.kind === "conjecture");
  if (!conjectural) return null;
  const suppressUnitIndexes = options.markerUnitIndexes.filter((unitIndex) => unitIndex !== sourceUnitIndex);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...unit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: {
      kind: "conjectureThoughtQuote",
      root: committed.realization.root,
      ...(committed.realization.hostProjection === undefined
        ? {}
        : { hostProjection: committed.realization.hostProjection }),
      koreanPos: 구
    },
  };
}

function buildAttributiveTypificationQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (quote === undefined || !IU_LEXEME_FORMS.has(quote.hostMatch.hostForm)) {
    return null;
  }
  const hostUnitIndex = options.units.findIndex((unit) => {
    if (!unit.jpIndices.includes(quote.hostMatch.hostIdx)) return false;
    const facts = attributiveModifierPlanSourceFacts(unit.renderPlan);
    return facts !== null && facts.sourcePast &&
      TYPIFICATION_QUOTATIVE_HEADS.has(facts.headDictionaryForm ?? "");
  });
  if (hostUnitIndex < 0) return null;
  const predicateUnitIndex = [...options.sourceUnitIndexes].reverse().find((unitIndex) =>
    isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan)
  ) ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined) return null;
  const unquoted = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    opSourceForMarkerSpans(options.tokens, options.relation.markerSpans),
  );
  const attributive = unquoted === null ? null : projectPredicateHeadTailAttributivePlan(unquoted);
  if (attributive === null) return null;
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    options.sourceUnitIndexes,
    new Map([[predicateUnitIndex, attributive]]),
  );
  if (sourcePlan === null) return null;
  const renderPlan = structuralRelationSequencePlan([
    sourcePlan,
    { kind: "structuralText", text: " 등의", koreanPos: 구 },
  ]);
  if (renderPlan === null) return null;
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    hostUnitIndex,
  ]).filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: options.sourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? [])),
    renderPlan,
  };
}

function buildMarkerAbsorbedContentCopulaRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  const copulaIdx = quote?.markerAbsorbedContentCopulaIdx;
  const contentPredicateIdx = quote?.contentPredicateIdx;
  if (
    quote === undefined ||
    copulaIdx === undefined ||
    contentPredicateIdx === undefined ||
    contentPredicateIdx === null ||
    quote.terminalSfp !== undefined && quote.terminalSfp !== null
  ) {
    return null;
  }
  const sourceUnitIndex = options.sourceUnitIndexes.find((unitIndex) =>
    options.units[unitIndex]?.jpIndices.includes(contentPredicateIdx) === true
  );
  const sourceUnit = sourceUnitIndex === undefined ? undefined : options.units[sourceUnitIndex];
  const plan = sourceUnit?.renderPlan;
  const absorbedAux = plan?.kind === "lemma" ? plan.auxTokens[0] : undefined;
  if (
    sourceUnitIndex === undefined ||
    sourceUnit === undefined ||
    plan?.kind !== "lemma" ||
    (plan.koreanPos !== 명사 && plan.koreanPos !== 대명사) ||
    (plan.terminalSfp !== undefined && plan.terminalSfp !== null) ||
    plan.auxTokens.length !== 1 ||
    absorbedAux === undefined ||
    !sourceUnit.jpIndices.includes(copulaIdx) ||
    absorbedAux.surface !== "だ" ||
    !isTerminalAssertiveCopulaToken(absorbedAux)
  ) {
    return null;
  }
  const quotativeMarkerUnitIndex = options.markerUnitIndexes.find((unitIndex) =>
    unitIndex !== sourceUnitIndex &&
    options.units[unitIndex]?.unitType === UnitType.FUNCTIONAL
  );
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    replaceUnitIndex: sourceUnitIndex,
    suppressUnitIndexes: [],
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(sourceUnit.jpIndices),
    renderPlan: { ...plan, auxTokens: [] },
    ...(quotativeMarkerUnitIndex === undefined ? {} : { quotativeMarkerUnitIndex }),
  };
}

function buildSfpQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const quote = options.relation.quote;
  if (
    quote === undefined ||
    (quote.slotKind !== "quoted_content" && quote.slotKind !== "question_content" && quote.slotKind !== "request_content") ||
    quote.terminalSfp === undefined ||
    quote.terminalSfp === null
  ) {
    return null;
  }
  const sourceUnitIndex = quote.contentPredicateIdx === undefined || quote.contentPredicateIdx === null
    ? null
    : options.sourceUnitIndexes.find((unitIndex) =>
      options.units[unitIndex]?.jpIndices.includes(quote.contentPredicateIdx!) === true
    ) ?? null;
  const sourceUnit = sourceUnitIndex === null ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === null || sourceUnit === undefined) return null;
  const ownerPlan = sourceUnit.renderPlan;
  if (ownerPlan === null) return null;
  const requestReportedAsSpeech = quote.slotKind === "request_content" && (
    quote.hostMatch.requestReportingRole === "speech" || options.targetUnitIndexes.some((unitIndex) => {
    const targetPlan = options.units[unitIndex]?.renderPlan;
    if (targetPlan?.kind === "quoteHostReportingPassive") return true;
    if (
      targetPlan?.kind === "lemma" &&
      (targetPlan.voice === "passive" || targetPlan.forcePassive === true || targetPlan.passiveClass !== undefined)
    ) return true;
    if (targetPlan?.kind === "attributive" && targetPlan.voice === "passive") return true;
    return isPredicateHeadTailChainRenderPlan(targetPlan) &&
      tailRootVoiceOps(targetPlan.realization.root).some((op) => op.voice === "passive");
  }));
  const requestAttributiveHostUnitIndex = quote.slotKind === "request_content"
    ? options.targetUnitIndexes.find((unitIndex) => {
      const unit = options.units[unitIndex];
      return unit?.jpIndices.includes(quote.hostMatch.hostIdx) === true &&
        attributiveModifierPlanSourceFacts(unit.renderPlan)?.carriesNonTenseOperator === false;
    })
    : undefined;
  const requestAttributive = requestAttributiveHostUnitIndex !== undefined && (
    requestReportedAsSpeech || quote.hostMatch.kind === "report"
  );
  if (quote.slotKind === "request_content") {
    if (quote.terminalSfp.effect !== "na_prohib" && quote.terminalSfp.effect !== "na_soft_imperative") return null;
  }
  const wishProjection = quote.hostMatch.kind === "thought" && quote.terminalSfp.effect === "na_excl"
    ? projectSufficiencyWishQuotePlan(ownerPlan)
    : null;
  const nominalRequestFocus = requestReportedAsSpeech ? quote.focusParticle : undefined;
  const projected = wishProjection ?? quoteSfpOwnerInPlacePlan(
    ownerPlan,
    quote.terminalSfp,
    requestReportedAsSpeech,
    requestAttributive,
    nominalRequestFocus,
    quote.terminalSfpMarkerBridgeSpan != null
  );
  if (projected === null) return null;
  const markerUnitIndex = projected.retainQuotativeMarker
    ? options.markerUnitIndexes.find((unitIndex) => options.units[unitIndex]?.jpIndices.includes(quote.markerIdx) === true)
    : undefined;
  const markerSharesOwnerUnit = markerUnitIndex === sourceUnitIndex;
  const ownerProjection = projected.retainQuotativeMarker && (markerUnitIndex === undefined || markerSharesOwnerUnit)
    ? completeSfpQuoteOwnerPlan(projected.plan, quote.terminalSfp)
    : projected.plan;
  if (ownerProjection === null) return null;
  const retainsSeparateMarker = projected.retainQuotativeMarker && markerUnitIndex !== undefined && !markerSharesOwnerUnit;
  const focusParticleKey: ParticleKey | null =
    quote.focusParticle === "は" ? "은/는"
      : quote.focusParticle === "も" ? "도"
      : quote.focusParticle === "でも" ? "이라도/라도"
      : null;
  const ownerChainRealizesQuoteFocus = isPredicateHeadTailChainRenderPlan(ownerProjection) &&
    ownerProjection.realization.root.sfp?.quoteProjection === "terminal_mood" &&
    ownerProjection.realization.root.sfp.quoteFocusParticle !== undefined;
  const focusedPlan = focusParticleKey === null || retainsSeparateMarker ||
    ownerChainRealizesQuoteFocus ||
    (nominalRequestFocus !== undefined && wishProjection === null)
    ? ownerProjection
    : attachParticleRenderPlan(ownerProjection, focusParticleKey);
  if (focusedPlan === null) return null;
  const quotativeMarkerUnitIndex = retainsSeparateMarker ? markerUnitIndex : undefined;
  const suppressUnitIndexes = options.markerUnitIndexes.filter((unitIndex) =>
    unitIndex !== quotativeMarkerUnitIndex && unitIndex !== sourceUnitIndex
  ).concat(!requestAttributive || requestAttributiveHostUnitIndex === undefined ? [] : [requestAttributiveHostUnitIndex]);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted([
      ...sourceUnit.jpIndices,
      ...suppressUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? []),
    ]),
    renderPlan: focusedPlan,
    replaceUnitIndex: sourceUnitIndex,
    ...(quotativeMarkerUnitIndex === undefined ? {} : { quotativeMarkerUnitIndex }),
  };
}

function projectSufficiencyWishQuotePlan(
  plan: RenderPlan,
): { readonly plan: RenderPlan; readonly retainQuotativeMarker: boolean } | null {
  if (!isPredicateHeadTailChainRenderPlan(plan)) return null;
  const ownerPlan = materializeSfpOwnerStem(plan);
  const tail = rewriteSufficiencyWishTail(ownerPlan.realization.root.tail);
  if (tail === null) return null;
  const conditionalPlan: PredicateHeadTailChainRenderPlan = {
    ...ownerPlan,
    realization: {
      ...ownerPlan.realization,
      root: { ...ownerPlan.realization.root, tail, sfp: null },
    },
  };
  const renderPlan = structuralRelationSequencePlan([
    conditionalPlan,
    { kind: "structuralText", text: " 좋겠다고", koreanPos: 구 },
  ]);
  return renderPlan === null ? null : { plan: renderPlan, retainQuotativeMarker: false };
}

function rewriteSufficiencyWishTail(node: TailNode): TailNode | null {
  if (node.kind === "connective") {
    const inner = rewriteSufficiencyWishAuxLayer(node.inner);
    if (inner !== null) return { ...node, inner };
    const outer = rewriteSufficiencyWishTail(node.outer);
    return outer === null ? null : { ...node, outer };
  }
  return rewriteSufficiencyWishAuxLayer(node);
}

function rewriteSufficiencyWishAuxLayer(layer: AuxLayerNode): AuxLayerNode | null {
  const index = layer.ops.findIndex((op) => op.kind === "idiom" && op.idiom === "sufficiency_conditional");
  const idiom = index < 0 ? undefined : layer.ops[index];
  if (idiom === undefined) return null;
  const conditional: ConnectiveOp = createConnectiveOp({

    connective: "conditional",
    surface: "ば",
    conditionalFlavor: "plain",
    source: idiom.source,
  });
  const prefixOps = layer.ops.slice(0, index).map((op) => {
    if (op.kind !== "voice" || op.candidates?.includes("potential") !== true) return op;
    const { candidates: _candidates, passiveClass: _passiveClass, ...voice } = op;
    return { ...voice, voice: "potential" as const };
  });
  return {
    ...layer,
    terminal: null,
    ops: [...prefixOps, conditional, ...layer.ops.slice(index + 1)],
  };
}

function completeSfpQuoteOwnerPlan(plan: RenderPlan, sfp: SfpNode): RenderPlan | null {
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return {
      ...plan,
      realization: {
        ...plan.realization,
        root: {
          ...plan.realization.root,
          sfp: { ...(plan.realization.root.sfp ?? sfp), quoteProjection: "terminal_mood" },
        },
      },
    };
  }
  return structuralRelationSequencePlan([
    plan,
    { kind: "structuralText", text: "라고", koreanPos: 구 },
  ]);
}

function quoteSfpOwnerInPlacePlan(
  plan: RenderPlan,
  sfp: SfpNode,
  requestReportedAsSpeech = false,
  requestAttributive = false,
  nominalRequestFocus?: QuoteBoundaryFocusParticle,
  markerSeparatedByPunctuation = false,
): { readonly plan: RenderPlan; readonly retainQuotativeMarker: boolean } | null {
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const ownerPlan = materializeSfpOwnerStem(plan);
    const terminalStem = firstAuxLayer(ownerPlan.realization.root.tail)?.stem;
    const terminalStemSourceForm = terminalStem?.source.tokens[terminalStem.semanticAnchors[0] ?? 0]?.dictionaryForm ??
      terminalStem?.source.tokens[terminalStem.semanticAnchors[0] ?? 0]?.surface;
    const plainNominalNa = sfp.effect === "na_excl" && sfp.surface === "な" && terminalStem?.kind === "noun" &&
      !SFP_NA_EXCLAMATORY_NOMINALIZERS.has(terminalStemSourceForm ?? "");
    if (plainNominalNa) {
      const withoutSfp = {
        ...ownerPlan,
        realization: {
          ...ownerPlan.realization,
          root: { ...ownerPlan.realization.root, sfp: null },
        },
      };
      const quoted = projectHeadTailConnectivePlan(
        withoutSfp,
        { connective: "quotative", surface: "" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    const imperative = ownerPlan.realization.root.tail.kind === "auxLayer" &&
      ownerPlan.realization.root.tail.terminal === "imperative";
    if (
      sfp.effect === "na_soft_imperative" &&
      ownerPlan.realization.root.tail.kind === "auxLayer" &&
      ownerPlan.realization.root.tail.stem.kind === "verb" &&
      ownerPlan.realization.root.tail.ops.length === 0
    ) {
      const stem = ownerPlan.realization.root.tail.stem;
      return {
        plan: {
          kind: "conjugatedLemma",
          koreanLemma: stem.lemma,
          irregular: stem.irregular,
          koreanPos: 동사,
          ending: "(으)라고",
          auxTokens: [],
        },
        retainQuotativeMarker: false,
      };
    }
    const quoteProjection = quoteProjectionForSfpEffect(sfp.effect, imperative);
    if (quoteProjection === "assertive") {
      const withoutSfp = {
        ...ownerPlan,
        realization: {
          ...ownerPlan.realization,
          root: { ...ownerPlan.realization.root, sfp: null },
        },
      };
      const quoted = projectHeadTailConnectivePlan(
        withoutSfp,
        { connective: "quotative", surface: "" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    if (quoteProjection === "terminal_mood" && !imperative) {
      if (markerSeparatedByPunctuation) {
        return { plan: ownerPlan, retainQuotativeMarker: true };
      }
      if (sfp.effect === "na_soft_imperative") {
        const withoutSfp = {
          ...ownerPlan,
          realization: {
            ...ownerPlan.realization,
            root: { ...ownerPlan.realization.root, sfp: null },
          },
        };
        const quoted = projectHeadTailConnectivePlan(
          withoutSfp,
          { connective: "quotative", surface: "", quotativeMood: "imperative" },
          sfp.source,
        );
        return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
      }
      return {
        plan: {
          ...ownerPlan,
          realization: {
            ...ownerPlan.realization,
            root: {
              ...ownerPlan.realization.root,
              sfp: { ...(ownerPlan.realization.root.sfp ?? sfp), quoteProjection: "terminal_mood" },
            },
          },
        },
        retainQuotativeMarker: false,
      };
    }
    const prohibitiveProjection: SfpNode["quoteProjection"] = requestReportedAsSpeech
      ? "reported_request"
      : requestAttributive
        ? "attributive_request"
        : "prohibitive";
    const projected = {
      ...ownerPlan,
      realization: {
        ...ownerPlan.realization,
        root: {
          ...ownerPlan.realization.root,
          sfp: quoteProjection === "prohibitive"
            ? {
              ...(ownerPlan.realization.root.sfp ?? sfp),
              quoteProjection: prohibitiveProjection,
              ...(prohibitiveProjection === "reported_request" && nominalRequestFocus !== undefined
                ? { quoteFocusParticle: nominalRequestFocus }
                : {}),
            }
            : null,
        },
      },
    };
    if (imperative) {
      const quoted = projectHeadTailConnectivePlan(
        projected,
        { connective: "quotative", surface: "", quotativeMood: "imperative" },
        sfp.source,
      );
      return quoted === null ? null : { plan: quoted, retainQuotativeMarker: false };
    }
    return { plan: projected, retainQuotativeMarker: false };
  }
  if (plan.kind === "lemma") {
    const predicate = plan.koreanPos === 동사 || plan.koreanPos === 형용사;
    if (sfp.effect === "ka") {
      const questionPlan: LemmaRealization = { ...plan, sfp: null, terminalSfp: null, connective: "는지" };
      if (plan.koreanPos === 명사) return { plan: questionPlan, retainQuotativeMarker: false };
      const quotedQuestion = structuralRelationSequencePlan([
        questionPlan,
        { kind: "structuralText", text: "라고", koreanPos: 구 },
      ]);
      return quotedQuestion === null ? null : { plan: quotedQuestion, retainQuotativeMarker: false };
    }
    if (!predicate) {
      const preserve = quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood" &&
        (sfp.effect !== "na_excl" || sfp.surface !== "な" || SFP_NA_EXCLAMATORY_NOMINALIZERS.has(plan.jpDictForm ?? ""));
      return {
        plan: preserve ? plan : { ...plan, auxTokens: [], sfp: null, connective: null },
        retainQuotativeMarker: true,
      };
    }
    const projected = quoteLemmaSfpOwnerPlan(plan, sfp.effect);
    if (projected === null) return null;
    const retain = plan.isImperative !== true &&
      sfp.effect !== "na_prohib" &&
      sfp.effect !== "na_soft_imperative" &&
      quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood";
    return { plan: retain ? plan : projected, retainQuotativeMarker: retain };
  }
  if (plan.kind === "copulaPredicate") {
    const preserve = quoteProjectionForSfpEffect(sfp.effect, false) === "terminal_mood";
    return preserve
      ? { plan, retainQuotativeMarker: true }
      : { plan: { ...plan, sfp: null, connective: "다고" }, retainQuotativeMarker: false };
  }
  return null;
}

function materializeSfpOwnerStem(plan: PredicateHeadTailChainRenderPlan): PredicateHeadTailChainRenderPlan {
  const materializedTail = clearTailNodeTerminal(materializeTailNodeStem(plan.realization.root.tail));
  return materializedTail === plan.realization.root.tail
    ? plan
    : {
      ...plan,
      realization: {
        ...plan.realization,
        root: { ...plan.realization.root, tail: materializedTail },
      },
    };
}

function clearTailNodeTerminal(node: TailNode): TailNode {
  if (node.kind === "connective") {
    const inner = node.inner.terminal === null ? node.inner : { ...node.inner, terminal: null };
    const outer = clearTailNodeTerminal(node.outer);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return node.terminal === null ? node : { ...node, terminal: null };
}

function materializeTailNodeStem(node: TailNode): TailNode {
  if (node.kind === "connective") {
    const inner = materializeAuxLayerStem(node.inner);
    const outer = materializeTailNodeStem(node.outer);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return materializeAuxLayerStem(node);
}

function materializeAuxLayerStem(node: AuxLayerNode): AuxLayerNode {
  return resolveCandidateSetLayer(node);
}

function quoteLemmaSfpOwnerPlan(sourcePlan: LemmaRealization, effect: SfpEffect | null): RenderPlan | null {
  const predicate = sourcePlan.koreanPos === 동사 || sourcePlan.koreanPos === 형용사;
  if (!predicate) {
    return null;
  }
  if (effect === "na_prohib") {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "지 말라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (effect === "na_soft_imperative") {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "(으)라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (sourcePlan.isImperative === true) {
    return {
      kind: "conjugatedLemma",
      koreanLemma: sourcePlan.koreanLemma,
      irregular: sourcePlan.irregular,
      koreanPos: sourcePlan.koreanPos,
      ending: "(으)라고",
      auxTokens: sourcePlan.auxTokens,
      ...(typeof sourcePlan.prefix === "string" ? { prefix: sourcePlan.prefix } : {}),
      ...(sourcePlan.jpDictForm === undefined ? {} : { jpDictForm: sourcePlan.jpDictForm }),
      ...(sourcePlan.verbConjType === undefined ? {} : { verbConjType: sourcePlan.verbConjType }),
      ...(sourcePlan.voice === undefined ? {} : { voice: sourcePlan.voice }),
    };
  }
  if (quoteProjectionForSfpEffect(effect, false) === "terminal_mood") {
    return sourcePlan;
  }
  return {
    ...sourcePlan,
    connective: "다고",
    sfp: null,
  } satisfies LemmaRealization;
}

function buildReasonCopulaQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  if (
    quote === undefined ||
    quote.slotKind !== "quoted_content" ||
    quote.contentSpan.endExclusive !== quote.markerIdx
  ) {
    return null;
  }
  const match = reasonCopulaQuoteContentMatchBeforeMarker(options.tokens, quote.contentSpan, quote.markerIdx);
  if (match === null) {
    return null;
  }
  const predicateUnitIndex = sourceUnitIndexesWithToken(options.units, options.sourceUnitIndexes, match.reasonMarkerIdx)
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const reasonPlan = reasonBecauseNominalPlanFromUnit(predicateUnit, match.reasonMarkerIdx);
  if (reasonPlan === null) {
    return null;
  }
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    sourceUnitIndexesExcludingFullyCoveredSpans(options.units, options.sourceUnitIndexes, [
      { start: match.reasonMarkerIdx, endExclusive: match.reasonMarkerIdx + 1 },
      { start: match.copulaStart, endExclusive: match.copulaEndExclusive },
    ]),
    new Map([[predicateUnitIndex, reasonPlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const quotedPlan = reasonCopulaQuotedRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, quote.markerSpan));
  if (quotedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes])
    .filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation,
    insertBeforeUnitIndex: options.sourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: quotedPlan,
  };
}

function buildReasonCopulaExplanationStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly sourceSpanUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const reasonMarker = options.relation.markerSpans.find((span) => span.role === "reason_marker") ?? null;
  const copulaMarker = options.relation.markerSpans.find((span) => span.role === "explanatory_copula") ?? null;
  const reasonCopula = options.relation.reasonCopula;
  if (reasonMarker === null || copulaMarker === null || reasonCopula === undefined) {
    return null;
  }
  const predicateUnitIndex = sourceUnitIndexesWithToken(options.units, options.sourceUnitIndexes, reasonMarker.start)
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const reasonPlan = reasonBecauseNominalPlanFromUnit(predicateUnit, reasonMarker.start);
  if (reasonPlan === null) {
    return null;
  }
  const match: ReasonCopulaQuoteContentMatch = {
    reasonMarkerIdx: reasonMarker.start,
    copulaStart: copulaMarker.start,
    copulaEndExclusive: copulaMarker.endExclusive,
    past: reasonCopula.past,
    polite: reasonCopula.polite,
    conjunctive: reasonCopula.connective,
    negative: reasonCopula.negative,
    additiveMo: reasonCopula.additiveMo,
    conjecture: reasonCopula.conjecture,
  };
  const projectedUnitIndexes = options.sourceSpanUnitIndexes;
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    projectedUnitIndexes,
    new Map([[predicateUnitIndex, reasonPlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const quoteMarker = options.relation.markerSpans.find((span) => span.role === "quotative_marker") ?? null;
  const renderPlan = quoteMarker === null
    ? reasonCopulaTerminalRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, copulaMarker), reasonCopula.sfp)
    : reasonCopulaQuotedRenderPlan(sourcePlan, match, sourceSpanForStructuralTokenSpan(options.tokens, quoteMarker));
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...projectedUnitIndexes, ...options.markerUnitIndexes]);
  const edgeAttachment = projectionEdgeAttachment(options.units, projectedUnitIndexes);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: projectedUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    ...edgeAttachment,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function reasonBecauseNominalPlanFromUnit(
  unit: TranslationUnit,
  reasonMarkerIdx: number,
): RenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  const stem = layer.stem.kind === "candidateSet"
    ? layer.stem.committedSense === undefined
      ? null
      : resolveCandidateSetStem(layer.stem)
    : layer.stem;
  if (stem === null) {
    return null;
  }
  if (stem.kind !== "verb" && stem.kind !== "adj" && stem.kind !== "noun") {
    return null;
  }
  const ops = layer.ops.filter((op) => (
    op.kind !== "connective" &&
    op.source.tokenIndices.every((tokenIndex) => tokenIndex < reasonMarkerIdx)
  ));
  const voiceOp = [...ops].reverse().find((op) => op.kind === "voice") ?? null;
  const voice = voiceOp?.kind === "voice"
    ? voiceFromTailVoice(voiceOp.voice)
    : "active";
  const projectionOps = reasonProjectionOpsWithStemMood(ops, stem);
  const payload: ReasonBecausePayload = {
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    irregular: stem.kind === "noun" ? null : stem.irregular,
    auxTokens: auxTokensForOps(ops.filter((op) => op.kind !== "adjCopulaBridge")),
    koreanPos: stem.kind === "verb" ? 동사 : stem.kind === "adj" ? 형용사 : 명사,
    projection: "nominal",
    voice,
    jpDictForm: stem.source.tokens[stem.semanticAnchors[0] ?? 0]?.dictionaryForm ?? null,
    sahenCompound: false,
    sahenNoun: stem.kind === "noun" && stem.sahen ? stem.lemma : null,
    negative: ops.some((op) =>
      op.kind === "negation" || ("polarity" in op && op.polarity === "negative")
    ),
    past: ops.some((op) =>
      (op.kind === "tense" && op.tense === "past") ||
      (op.kind === "negation" && op.chainPast)
    ),
    predicateRoot: {
      ...plan.realization.root,
      tail: {
        ...layer,
        ops: projectionOps,
        terminal: null
      },
      sfp: null
    },
    ...(plan.realization.hostProjection === undefined
      ? {}
      : { predicateHostProjection: plan.realization.hostProjection }),
    ...(voiceOp?.kind === "voice" && voiceOp.passiveClass !== undefined
      ? { passiveClass: voiceOp.passiveClass }
      : {}),
  };
  return {
    kind: "reasonBecause",
    payload,
  };
}

function reasonProjectionOpsWithStemMood(
  ops: readonly AuxOpNode[],
  stem: StemNode,
): readonly AuxOpNode[] {
  if (stem.stemMood !== "conjectural" || ops.some((op) => op.kind === "conjecture")) {
    return ops;
  }
  const moodToken = stem.source.tokens[stem.conjugationAnchor];
  if (moodToken === undefined) {
    return ops;
  }
  return [
    ...ops,
    createConjectureOp({
      polite: false,
      source: {
        tokens: [moodToken],
        tokenIndices: [stem.source.tokenIndices[stem.conjugationAnchor] ?? -1],
      },
    }),
  ];
}

function reasonCopulaQuotedRenderPlan(
  reasonPlan: RenderPlan,
  match: ReasonCopulaQuoteContentMatch,
  sourceSpan: SourceTokenSpan | null,
): RenderPlan | null {
  if (match.negative || match.conjecture !== null) {
    return null;
  }
  if (!match.past) {
    return attachParticleRenderPlan(reasonPlan, "이라고/라고");
  }
  return structuralRelationSequencePlan([
    reasonPlan,
    {
      kind: "structuralText",
      text: "이었다고",
      koreanPos: 구,
      sourceSpan,
    },
  ]);
}

function reasonCopulaTerminalRenderPlan(
  reasonPlan: RenderPlan,
  match: ReasonCopulaQuoteContentMatch,
  _sourceSpan: SourceTokenSpan | null,
  sfp: StructuralReasonCopulaSfp | null = null,
): RenderPlan | null {
  if (match.negative) {
    if (match.conjecture !== null) {
      const focusedPlan = attachParticleRenderPlan(reasonPlan, match.additiveMo ? "도" : "은/는");
      if (focusedPlan === null) return null;
      const suffix = match.conjecture.polite
        ? match.past ? "아니었겠죠" : "아니겠죠"
        : match.past ? "아니었겠지" : "아니겠지";
      return structuralRelationSequencePlan([
        focusedPlan,
        {
          kind: "structuralText",
          text: ` ${suffix}`,
          koreanPos: 구,
        },
      ]);
    }
    const particle = match.additiveMo ? "도" : match.conjunctive ? "이/가" : "은/는";
    const focusedPlan = attachParticleRenderPlan(reasonPlan, particle);
    if (focusedPlan === null) {
      return null;
    }
    const suffix = match.conjunctive
      ? match.past
        ? { casual: "아니었고", formal: "아니었고" }
        : { casual: "아니고", formal: "아니고" }
      : match.past && match.polite
        ? { casual: "아니었어요", formal: "아니었습니다" }
      : match.past
        ? { casual: "아니었어", formal: "아니었다" }
      : match.polite
        ? { casual: "아니에요", formal: "아닙니다" }
        : { casual: "아니야", formal: "아니다" };
    return structuralRelationSequencePlan([
      focusedPlan,
      {
        kind: "registerText",
        casual: ` ${suffix.casual}`,
        formal: ` ${suffix.formal}`,
        koreanPos: 구,
      },
    ]);
  }
  if (match.conjunctive) {
    return structuralRelationSequencePlan([
      reasonPlan,
      {
        kind: "structuralText",
        text: "이고",
        koreanPos: 구,
      },
    ]);
  }
  const suffix = reasonCopulaTerminalSuffix(match, sfp);
  if (suffix === null) {
    return null;
  }
  return structuralRelationSequencePlan([
    reasonPlan,
    {
      kind: "registerText",
      casual: suffix.casual,
      formal: suffix.formal,
      koreanPos: 구,
    },
  ]);
}

function reasonCopulaTerminalSuffix(
  match: ReasonCopulaQuoteContentMatch,
  sfp: StructuralReasonCopulaSfp | null,
): { readonly casual: string; readonly formal: string } | null {
  const effect = sfp?.effect ?? null;
  const conjecture = match.conjecture !== null;
  const polite = match.conjecture?.polite ?? match.polite;
  if (effect !== null) {
    const casual = nounCopulaDiscursiveSfpEnding(REASON_BECAUSE_BOUND_NOUN, match.past, false, polite, effect, conjecture);
    const formal = nounCopulaDiscursiveSfpEnding(REASON_BECAUSE_BOUND_NOUN, match.past, true, polite, effect, conjecture);
    return casual === null || formal === null ? null : { casual, formal };
  }
  if (conjecture) {
    const suffix = polite
      ? match.past ? "이었겠죠" : "이겠죠"
      : match.past ? "이었겠지" : "이겠지";
    return { casual: suffix, formal: suffix };
  }
  return match.past && match.polite
    ? { casual: "이었어요", formal: "이었습니다" }
    : match.past
      ? { casual: "이었어", formal: "이었다" }
    : match.polite
      ? { casual: "이에요", formal: "입니다" }
      : { casual: "이야", formal: "이다" };
}

function voiceFromTailVoice(voice: string): NonNullable<ReasonBecausePayload["voice"]> {
  if (voice === "potential") {
    return "potential";
  }
  if (voice === "passive" || voice === "causative_passive" || voice === "honorific") {
    return "passive";
  }
  return "active";
}

function auxTokensForOps(ops: readonly AuxLayerNode["ops"][number][]): readonly RuntimeHaruToken[] {
  const byIndex = new Map<number, RuntimeHaruToken>();
  for (const op of ops) {
    for (const [offset, tokenIndex] of op.source.tokenIndices.entries()) {
      const token = op.source.tokens[offset];
      if (token !== undefined) {
        byIndex.set(tokenIndex, token);
      }
    }
  }
  return [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, token]) => token);
}

function sourceUnitIndexesExcludingFullyCoveredSpans(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  spans: readonly StructuralRelationTokenSpan[],
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => {
    const unit = units[unitIndex];
    return unit !== undefined && !unitFullyCoveredBySpans(unit, spans);
  });
}

function conditionalClauseSpanAt(
  graph: StructuralRelationGraph,
  conditionalIdx: number,
): StructuralRelationTokenSpan | null {
  return graph.nodes
    .filter((node) => node.span.start <= conditionalIdx && conditionalIdx < node.span.endExclusive)
    .sort((left, right) =>
      (left.span.endExclusive - left.span.start) - (right.span.endExclusive - right.span.start)
    )[0]?.span ?? null;
}

function conditionalClauseSourceUnitIndexes(
  graph: StructuralRelationGraph,
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  conditionalIdx: number,
): readonly number[] {
  const span = conditionalClauseSpanAt(graph, conditionalIdx);
  if (span === null) return sourceUnitIndexes;
  return sourceUnitIndexes.filter((unitIndex) =>
    units[unitIndex]?.jpIndices.some((tokenIndex) =>
      span.start <= tokenIndex && tokenIndex < span.endExclusive
    ) === true
  );
}

function rootWithStructuralQuoteMarker(
  root: TailRoot,
  quote: NonNullable<StructuralRelation["quote"]>,
  markerSource: OpSource,
  connective: "quotative" | "wish_complement",
): TailRoot {
  if (root.tail.kind !== "auxLayer") return root;
  const last = root.tail.ops.at(-1);
  if (
    last?.kind === "connective" &&
    (
      last.connective === "quotative" ||
      last.connective === "question_quotative" ||
      last.connective === "wish_complement"
    )
  ) {
    return root;
  }
  const markerConnective: ConnectiveOp = createConnectiveOp({

    connective,
    surface: quote.markerBaseSurface,
    source: markerSource,
  });
  return {
    ...root,
    tail: { ...root.tail, ops: [...root.tail.ops, markerConnective] },
  };
}

function thoughtHostHasConditionalContinuation(options: {
  readonly units: readonly TranslationUnit[];
  readonly targetUnitIndexes: readonly number[];
  readonly hostIdx: number;
}): boolean {
  const hostUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    options.targetUnitIndexes,
    options.hostIdx,
  ).find((unitIndex) => isPredicateHeadTailChainRenderPlan(options.units[unitIndex]?.renderPlan ?? null));
  if (hostUnitIndex === undefined) return false;
  const plan = options.units[hostUnitIndex]?.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  const finalOp = plan.realization.root.tail.ops.at(-1);
  return finalOp?.kind === "connective" && finalOp.connective === "conditional";
}

function rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(root: TailRoot): boolean {
  if (root.tail.kind !== "auxLayer") return false;
  return root.tail.ops.some((op, index, ops) => {
    if (
      !isBenefactiveAspectOp(op) ||
      !op.benefactive.potential ||
      (op.benefactive.kind !== "morau" && op.benefactive.kind !== "itadaku")
    ) {
      return false;
    }
    const conditional = ops[index + 1];
    return conditional?.kind === "connective" && conditional.connective === "conditional";
  });
}

function quoteMarkerDirectlyPrecedesHost(
  tokens: readonly RuntimeHaruToken[],
  quote: NonNullable<StructuralRelation["quote"]>,
): boolean {
  const hostStart = quote.hostMatch.supportIdx ?? quote.hostMatch.hostIdx;
  const previous = previousNonSpaceIndex(tokens, hostStart);
  return previous !== null &&
    quote.markerSpan.start <= previous &&
    previous < quote.markerSpan.endExclusive;
}

function buildConditionalWishQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly graph: StructuralRelationGraph;
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  if (
    quote === undefined ||
    !(
      (quote.slotKind === "quoted_content" && quote.hostMatch.kind === "thought") ||
      (quote.slotKind === "wish_content" && quote.hostMatch.kind === "wish")
    ) ||
    quote.contentSpan.endExclusive !== quote.markerIdx
  ) {
    return null;
  }
  if (quote.conditionalContent?.subtype !== "affirmative_wish") {
    return null;
  }
  const thoughtHostConditionalContinuation = quote.hostMatch.kind === "thought" &&
    thoughtHostHasConditionalContinuation({
      units: options.units,
      targetUnitIndexes: options.targetUnitIndexes,
      hostIdx: quote.hostMatch.hostIdx,
    });
  const conditionalIdx = quote.conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const predicateRenderPlan = predicateUnit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(predicateRenderPlan) ||
    predicateRenderPlan.realization.root.tail.kind !== "auxLayer"
  ) {
    return null;
  }
  if (
    thoughtHostConditionalContinuation &&
    !rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root)
  ) {
    return null;
  }
  const quoteMarkerSource = opSourceForMarkerSpans(options.tokens, relation.markerSpans);
  if (quoteMarkerSource === null) {
    return null;
  }
  const productionRoot = rootWithStructuralQuoteMarker(
    predicateRenderPlan.realization.root,
    quote,
    quoteMarkerSource,
    "wish_complement",
  );
  const productionDispatch = probeProductionDispatch(
    productionRoot,
    {
      relations: [relation],
      intake: { site: "committed_render", partial: false }
    }
  );
  if (
    productionDispatch.kind !== "registry" ||
    !isConditionalQuoteProductionMatch(productionDispatch.match)
  ) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    quoteMarkerSource,
    rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root) ||
      quoteMarkerDirectlyPrecedesHost(options.tokens, quote),
    normalizeProductionMatch(productionRoot, productionDispatch.match),
  );
  if (predicatePlan === null) {
    return null;
  }
  const localSourceUnitIndexes = conditionalClauseSourceUnitIndexes(
    options.graph,
    options.units,
    options.sourceUnitIndexes,
    conditionalIdx,
  );
  const conditionalClauseSpan = conditionalClauseSpanAt(options.graph, conditionalIdx) ?? quote.contentSpan;
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, conditionalClauseSpan)
    .filter((unitIndex) => options.units[unitIndex]?.unitType === UnitType.SYMBOL);
  const wishSourceUnitIndexes = uniqueSorted([
    ...localSourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    wishSourceUnitIndexes,
    new Map([[predicateUnitIndex, predicatePlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const thoughtSuffix: StructuralRelationSequencePart = {
    kind: "structuralText",
    text: " 좋겠다고",
    koreanPos: 구,
    sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, relation.markerSpans[0] ?? quote.markerSpan),
  };
  const renderPlan = structuralRelationSequencePlan([sourcePlan, thoughtSuffix]);
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...wishSourceUnitIndexes, ...options.markerUnitIndexes]);
  return {
    relation,
    insertBeforeUnitIndex: wishSourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: wishSourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function sourceTokensOverlap(
  left: RuntimeHaruToken,
  right: RuntimeHaruToken
): boolean {
  if (left.sourceSpan !== undefined && left.sourceSpan !== null && right.sourceSpan !== undefined && right.sourceSpan !== null) {
    return left.sourceSpan.startOrdinal < right.sourceSpan.endOrdinal &&
      right.sourceSpan.startOrdinal < left.sourceSpan.endOrdinal;
  }
  return left.sourceOrdinal !== undefined &&
    right.sourceOrdinal !== undefined &&
    left.sourceOrdinal === right.sourceOrdinal;
}

function buildConditionalThoughtQuoteMarkerStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  const conditionalContent = quote?.conditionalContent;
  const conditionalSubtype = conditionalContent?.subtype;
  const continuationHandoff = quote !== undefined &&
    conditionalSubtype === "affirmative_wish" &&
    thoughtHostHasConditionalContinuation({
      units: options.units,
      targetUnitIndexes: options.targetUnitIndexes,
      hostIdx: quote.hostMatch.hostIdx,
    });
  if (
    quote === undefined ||
    quote.slotKind !== "quoted_content" ||
    quote.hostMatch.kind !== "thought" ||
    quote.contentSpan.endExclusive !== quote.markerIdx ||
    conditionalContent === undefined ||
    !(conditionalSubtype === "conditional" || continuationHandoff)
  ) {
    return null;
  }
  const conditionalIdx = conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const quoteMarkerSource = opSourceForMarkerSpans(options.tokens, relation.markerSpans);
  const predicateRenderPlan = predicateUnit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(predicateRenderPlan) ||
    predicateRenderPlan.realization.root.tail.kind !== "auxLayer" ||
    quoteMarkerSource === null
  ) {
    return null;
  }
  const productionRoot = rootWithStructuralQuoteMarker(
    predicateRenderPlan.realization.root,
    quote,
    quoteMarkerSource,
    "quotative",
  );
  const productionDispatch = probeProductionDispatch(productionRoot, {
    relations: [relation],
    intake: { site: "committed_render", partial: false },
  });
  if (
    productionDispatch.kind !== "registry" ||
    !isConditionalQuoteProductionMatch(productionDispatch.match)
  ) {
    return null;
  }
  if (
    continuationHandoff &&
    rootHasDirectPositivePotentialRecipientBenefactiveWishEvidence(predicateRenderPlan.realization.root)
  ) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    quoteMarkerSource,
    continuationHandoff,
    normalizeProductionMatch(productionRoot, productionDispatch.match),
  );
  const obligationPlan = predicatePlan === null
    ? null
    : continuationHandoff
      ? predicatePlan
      : projectNegativeConditionalObligationPlan(predicatePlan, options.tokens, conditionalIdx) ?? predicatePlan;
  const quotedPredicatePlan = obligationPlan === null
    ? null
    : projectHeadTailConnectivePlan(
      obligationPlan,
      { connective: "quotative", surface: quote.markerBaseSurface },
      quoteMarkerSource,
      false,
      null,
      "append",
    );
  if (quotedPredicatePlan === null) {
    return null;
  }
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    options.sourceUnitIndexes,
    new Map([[predicateUnitIndex, quotedPredicatePlan]])
  );
  if (sourcePlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes])
    .filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation,
    insertBeforeUnitIndex: options.sourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: sourcePlan,
  };
}

function buildConditionalReportQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  if (
    quote === undefined ||
    quote.slotKind !== "quoted_content" ||
    quote.contentSpan.endExclusive !== quote.markerIdx ||
    quote.hostMatch.kind !== "report" ||
    quote.conditionalContent === undefined
  ) {
    return null;
  }
  const conditionalIdx = quote.conditionalContent.tokenIdx;
  const predicateUnitIndex = sourceUnitIndexesWithToken(
    options.units,
    uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]),
    conditionalIdx,
  )
    .find((unitIndex) => options.units[unitIndex]?.renderPlan?.kind === "headTailChain") ?? null;
  const predicateUnit = predicateUnitIndex === null ? undefined : options.units[predicateUnitIndex];
  if (predicateUnitIndex === null || predicateUnit === undefined || predicateUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const predicatePlan = projectUnitWithoutQuoteMarkerConnectivePlan(
    predicateUnit,
    opSourceForMarkerSpans(options.tokens, relation.markerSpans),
  );
  if (predicatePlan === null) {
    return null;
  }
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, quote.contentSpan)
    .filter((unitIndex) => options.units[unitIndex]?.unitType === UnitType.SYMBOL);
  const reportSourceUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const sourcePlan = composeRelationSourceUnitPlans(
    options.tokens,
    options.units,
    reportSourceUnitIndexes,
    new Map([[predicateUnitIndex, predicatePlan]]),
  );
  if (sourcePlan === null) {
    return null;
  }
  const quoteSuffix: StructuralRelationSequencePart = {
    kind: "structuralText",
    text: " 하고",
    koreanPos: 구,
    sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, relation.markerSpans[0] ?? quote.markerSpan),
  };
  const renderPlan = structuralRelationSequencePlan([sourcePlan, quoteSuffix]);
  if (renderPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...reportSourceUnitIndexes, ...options.markerUnitIndexes]);
  return {
    relation,
    insertBeforeUnitIndex: reportSourceUnitIndexes[0] ?? predicateUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: reportSourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => (
      options.units[unitIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function projectNegativeConditionalObligationPlan(
  plan: PredicateHeadTailChainRenderPlan,
  tokens: readonly RuntimeHaruToken[],
  conditionalIdx: number,
): PredicateHeadTailChainRenderPlan | null {
  const tail = plan.realization.root.tail;
  if (tail.kind !== "auxLayer") return null;
  const conditionalOpIdx = tail.ops.findIndex((op) =>
    op.kind === "connective" && op.source.tokenIndices.includes(conditionalIdx)
  );
  if (conditionalOpIdx < 0) return null;
  let negationOpIdx = -1;
  for (let index = conditionalOpIdx - 1; index >= 0; index -= 1) {
    if (tail.ops[index]?.kind === "negation") {
      negationOpIdx = index;
      break;
    }
  }
  if (negationOpIdx < 0) return null;
  const conditionalOp = tail.ops[conditionalOpIdx]!;
  const negationOp = tail.ops[negationOpIdx]!;
  const sourceIndices = uniqueSorted([...negationOp.source.tokenIndices, conditionalIdx]);
  const obligation: ObligationIdiomOp = createIdiomOp({

    idiom: "obligation",
    variant: tokens[conditionalIdx]?.surface === "ば" ? "standard_nakereba" : "colloquial_naito_elided",
    polarity: "affirmative",
    polite: false,
    past: false,
    source: {
      tokens: sourceIndices.flatMap((index) => tokens[index] === undefined ? [] : [tokens[index]]),
      tokenIndices: sourceIndices,
    },
  });
  const ops = tail.ops.filter((_, index) => index !== negationOpIdx && index !== conditionalOpIdx);
  ops.splice(Math.min(negationOpIdx, ops.length), 0, obligation);
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...tail, ops },
      },
    },
  };
}

function buildPredicateBoundTameQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const relation = options.relation;
  const quote = relation.quote;
  if (quote === undefined || quote.slotKind !== "quoted_content") {
    return null;
  }
  const tameIdx = previousNonSpaceTokenIndex(options.tokens, quote.markerIdx);
  const tame = tameIdx === null ? undefined : options.tokens[tameIdx];
  const tameForm = tame?.dictionaryForm || tame?.surface;
  if (
    tameIdx === null ||
    tameIdx < quote.contentSpan.start ||
    tameIdx >= quote.contentSpan.endExclusive ||
    (tameForm !== "ため" && tameForm !== "為")
  ) {
    return null;
  }
  const sourceUnitIndex = sourceUnitIndexesWithPredicateBoundTame(options.units, options.sourceUnitIndexes, tameIdx)[0] ?? null;
  const sourceUnit = sourceUnitIndex === null ? undefined : options.units[sourceUnitIndex];
  if (sourceUnitIndex === null || sourceUnit === undefined || sourceUnit.unitType === UnitType.SYMBOL || sourceUnit.renderPlan === null) {
    return null;
  }
  const sourcePlan = projectUnitPredicateConnectivePlan(
    sourceUnit,
    predicateBoundTameQuoteConnective(sourceUnit, options.tokens, tameIdx, tame?.surface ?? "ため", options.lookups)
  ) ?? sourceUnit.renderPlan;
  const quotedPlan = attachParticleRenderPlan(sourcePlan, "이라고/라고");
  if (quotedPlan === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([sourceUnitIndex, ...options.markerUnitIndexes])
    .filter((candidateIndex) => options.units[candidateIndex]?.unitType !== UnitType.SYMBOL);
  return {
    relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: quotedPlan,
  };
}

function sourceUnitIndexesWithPredicateBoundTame(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  tameIdx: number,
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => {
    const unit = units[unitIndex];
    return unit !== undefined &&
      unit.renderPlan?.kind === "headTailChain" &&
      unit.jpIndices.includes(tameIdx);
  });
}

function sourceUnitIndexesWithToken(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  tokenIdx: number,
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => units[unitIndex]?.jpIndices.includes(tokenIdx) === true);
}

function projectUnitWithoutQuoteMarkerConnectivePlan(
  unit: TranslationUnit,
  quoteMarkerSource: OpSource | null,
  allowSeparatedMarker = false,
  registryNormalizedRoot: TailRoot | null = null,
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (
    !isPredicateHeadTailChainRenderPlan(plan) ||
    plan.realization.root.tail.kind !== "auxLayer" ||
    quoteMarkerSource === null ||
    (registryNormalizedRoot !== null && registryNormalizedRoot.tail.kind !== "auxLayer")
  ) {
    return null;
  }
  const layer = plan.realization.root.tail;
  const ownsQuoteMarker = layer.ops.some((op) =>
    op.kind === "connective" && opSourceCoveredBy(op.source, quoteMarkerSource)
  );
  if (!ownsQuoteMarker && !allowSeparatedMarker) {
    return null;
  }
  const normalizedLayer = registryNormalizedRoot?.tail.kind === "auxLayer"
    ? registryNormalizedRoot.tail
    : null;
  const projectedOps = (normalizedLayer?.ops ?? layer.ops.filter((op) => !(
    op.kind === "connective" && opSourceCoveredBy(op.source, quoteMarkerSource)
  ))).map((op) => (
    op.kind === "connective" && op.connective === "conditional" && op.surface === "ば"
      ? { ...op, conditionalFlavor: "plain" as const }
      : op
  ));
  const projectedLayer: AuxLayerNode = {
    ...(normalizedLayer ?? layer),
    ops: projectedOps,
    terminal: null,
  };
  const projectedRoot = {
    ...(registryNormalizedRoot ?? plan.realization.root),
    tail: projectedLayer,
  };
  const lastConnective = [...projectedOps].reverse().find((op): op is ConnectiveOp => op.kind === "connective") ?? null;
  const projectedBoundary = lastConnective === null
    ? { kind: "terminal" as const }
    : connectiveBoundaryForProjection(
      plan,
      { connective: lastConnective.connective, surface: lastConnective.surface },
      lastConnective.source
    );
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  const { partial: _partial, ...realizationWithoutPartial } = plan.realization;
  return {
    ...planWithoutOriginalSourceCandidate,
    clauseRole: { ...plan.clauseRole, outgoingBoundary: projectedBoundary },
    realization: {
      ...realizationWithoutPartial,
      root: projectedRoot,
      warnings: resolvedStructuralProjectionWarnings(plan.realization.warnings),
    },
  };
}

function predicateBoundTameQuoteConnective(
  unit: TranslationUnit,
  tokens: readonly RuntimeHaruToken[],
  tameIdx: number,
  surface: string,
  lookups: LookupTables,
): { readonly connective: ConnectiveKind; readonly surface: string } {
  const plan = unit.renderPlan;
  return {
    connective: plan?.kind === "headTailChain" &&
      plan.realization.kind === "predicate" &&
      tailPredicateHostPrefersTameReason({
        root: plan.realization.root,
        tokens,
        tameIndex: tameIdx,
        lookups,
      })
      ? "tame_reason"
      : "tame_purpose",
    surface,
  };
}

function buildPunctuatedAttributiveStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  if (options.relation.nominalExemplification !== undefined) {
    return buildNominalExemplificationAttributiveRenderOperation({
      ...options,
      exemplification: options.relation.nominalExemplification,
    });
  }
  const unitIndex = sourcePredicateUnitIndexForRelation(options.units, options.relation, options.sourceUnitIndexes);
  if (unitIndex === null) {
    return null;
  }
  const unit = options.units[unitIndex];
  if (unit === undefined || unit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const projectedPlan = projectUnitAttributivePlan(unit, targetHeadToken(options.tokens, options.relation), {
    tokens: options.tokens,
    lookups: options.lookups,
  });
  if (projectedPlan === null) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex: unitIndex,
    suppressUnitIndexes: [unitIndex],
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: [...unit.jpIndices],
    renderPlan: projectedPlan,
  };
}

function buildNominalExemplificationAttributiveRenderOperation(options: {
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly exemplification: StructuralNominalExemplificationPayload;
}): RelationRenderOperation | null {
  const exemplification = options.exemplification;
  const hostUnitIndex = sourcePredicateUnitIndexForRelation(options.units, options.relation, options.sourceUnitIndexes);
  if (hostUnitIndex === null) {
    return null;
  }
  const absorbedStart = exemplification.exemplificationMarkerSpan?.start ?? exemplification.quoteMarkerSpan.start;
  const carrierUnitIndexes = uniqueSorted([hostUnitIndex, ...options.markerUnitIndexes])
    .filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  if (carrierUnitIndexes.some((unitIndex) =>
    options.units[unitIndex]?.jpIndices.every((jpIndex) => absorbedStart <= jpIndex) !== true
  )) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex: carrierUnitIndexes[0] ?? hostUnitIndex,
    suppressUnitIndexes: carrierUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(carrierUnitIndexes.flatMap((unitIndex) => options.units[unitIndex]?.jpIndices ?? [])),
    renderPlan: {
      kind: "fixedText",
      text: exemplification.exemplificationMarkerSpan === null ? "같은" : "등의",
      koreanPos: 구,
    },
  };
}

function buildNominalConcessionStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly sourceSpanUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const sourcePredicateIdx = relationSourcePredicateIdx(options.relation);
  if (sourcePredicateIdx !== null) {
    return null;
  }
  const projectedUnitIndexes = options.sourceSpanUnitIndexes;
  const sourcePlan = composeRelationSourceUnitPlans(options.tokens, options.units, projectedUnitIndexes);
  if (sourcePlan === null) {
    return null;
  }
  const sourceUnitIndex = projectedUnitIndexes[0] ?? null;
  if (sourceUnitIndex === null) {
    return null;
  }
  const suppressUnitIndexes = uniqueSorted([...projectedUnitIndexes, ...options.markerUnitIndexes]);
  const edgeAttachment = projectionEdgeAttachment(options.units, suppressUnitIndexes);
  return {
    relation: options.relation,
    insertBeforeUnitIndex: sourceUnitIndex,
    suppressUnitIndexes,
    ...edgeAttachment,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: {
      kind: "nominalConnectiveScope",
      payload: {
        content: sourcePlan,
        connectiveKind: "concession",
        koreanPos: 구,
      },
    },
  };
}

function composeRelationSourceUnitPlans(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  replacements?: ReadonlyMap<number, RenderPlan>,
): RenderPlan | null {
  const parts = relationSourceUnitSequenceParts(tokens, units, unitIndexes, replacements);
  return parts === null ? null : structuralRelationSequencePlan(parts.map((entry) => entry.part));
}

export interface RelationSourceUnitSequencePart {
  readonly part: StructuralRelationSequencePart;
  readonly unit: TranslationUnit | null;
  readonly sourceSpan: SourceTokenSpan | null;
}

export function relationSourceUnitSequenceParts(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  replacements?: ReadonlyMap<number, RenderPlan>,
): RelationSourceUnitSequencePart[] | null {
  const parts: RelationSourceUnitSequencePart[] = [];
  let previousUnit: TranslationUnit | undefined;
  for (const unitIndex of unitIndexes) {
    const unit = units[unitIndex];
    if (unit === undefined) {
      continue;
    }
    const unitPlan = replacements?.get(unitIndex) ?? relationSourceUnitPlan(tokens, unit);
    if (unitPlan === null && unit.allomorphKey !== null) {
      const host = particleHostPhraseInParts(parts);
      const previousPlan = host?.plan ?? null;
      const particle = particleKeyFromAllomorph(unit.allomorphKey);
      const possessiveContraction = particle === "의" && previousPlan !== null
        ? contractPossessivePronounPlan(previousPlan)
        : null;
      if (possessiveContraction !== null && host !== null) {
        parts.splice(host.fromIndex, parts.length - host.fromIndex, {
          part: possessiveContraction,
          unit: host.unit,
          sourceSpan: combineRelationSourceSpans(host.sourceSpan, unit.sourceSpan)
        });
        previousUnit = unit;
        continue;
      }
      const attached: RenderPlan | null = previousPlan === null
        ? null
        : attachAllomorphParticlePlan(previousPlan, unit.allomorphKey, unit.register, {
          sourceSpan: unit.sourceSpan,
          unit
        });
      if (attached === null || host === null) {
        return null;
      }
      parts.splice(host.fromIndex, parts.length - host.fromIndex, {
        part: attached,
        unit: host.unit,
        sourceSpan: host.sourceSpan
      });
      previousUnit = unit;
      continue;
    }
    if (unitPlan === null) {
      return null;
    }
    if (parts.length > 0) {
      const separator = !unit.attachLeft && previousUnit?.attachRight !== true ? " " : "";
      if (separator.length > 0) {
        parts.push({
          part: { kind: "structuralText", text: separator, koreanPos: 구 },
          unit: null,
          sourceSpan: null
        });
      }
    }
    parts.push({ part: unitPlan, unit, sourceSpan: unit.sourceSpan });
    previousUnit = unit;
  }
  return parts;
}

function lastSequenceRenderPlan(parts: readonly StructuralRelationSequencePart[]): RenderPlan | null {
  const last = parts[parts.length - 1];
  return last === undefined || last.kind === "structuralText" ? null : last;
}

function particleHostPhraseInParts(
  parts: readonly RelationSourceUnitSequencePart[],
): {
  readonly plan: RenderPlan;
  readonly fromIndex: number;
  readonly unit: TranslationUnit | null;
  readonly sourceSpan: SourceTokenSpan | null;
} | null {
  let index = parts.length - 1;
  while (index >= 0 && parts[index]?.part.kind === "structuralText") {
    index -= 1;
  }
  const anchor = parts[index];
  if (index < 0 || anchor === undefined || anchor.part.kind === "structuralText") {
    return null;
  }
  if (index === parts.length - 1) {
    return { plan: anchor.part, fromIndex: index, unit: anchor.unit, sourceSpan: anchor.sourceSpan };
  }
  const group = parts.slice(index);
  const grouped = structuralRelationSequencePlan(group.map((entry) => entry.part));
  return grouped === null
    ? null
    : {
      plan: grouped,
      fromIndex: index,
      unit: anchor.unit,
      sourceSpan: group.reduce<SourceTokenSpan | null>(
        (span, entry) => combineRelationSourceSpans(span, entry.sourceSpan),
        null
      )
    };
}

function combineRelationSourceSpans(
  left: SourceTokenSpan | null,
  right: SourceTokenSpan | null
): SourceTokenSpan | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return {
    startOrdinal: Math.min(left.startOrdinal, right.startOrdinal),
    endOrdinal: Math.max(left.endOrdinal, right.endOrdinal)
  };
}

function structuralRelationSequencePlan(parts: readonly StructuralRelationSequencePart[]): RenderPlan | null {
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    const only = parts[0];
    return only === undefined || only.kind === "structuralText"
      ? null
      : only;
  }
  return {
    kind: "structuralRelationSequence",
    parts,
    koreanPos: 구,
  } satisfies StructuralRelationSequencePlan;
}

function relationSourceUnitPlan(
  tokens: readonly RuntimeHaruToken[],
  unit: TranslationUnit,
): StructuralRelationSequencePart | null {
  if (unit.renderPlan !== null) {
    return unit.renderPlan;
  }
  if (unit.unitType === UnitType.SYMBOL) {
    const tokenIndexes = uniqueSorted(unit.jpIndices);
    const text = tokenIndexes
      .flatMap((index) => tokens[index] === undefined ? [] : [tokens[index].surface])
      .join("");
    const first = tokenIndexes[0];
    const last = tokenIndexes.at(-1);
    return text.length === 0 || first === undefined || last === undefined
      ? null
      : {
        kind: "structuralText",
        text,
        koreanPos: 기호,
        sourceSpan: sourceSpanForStructuralTokenSpan(tokens, {
          start: first,
          endExclusive: last + 1,
        }),
      };
  }
  return null;
}

function attachAllomorphParticlePlan(
  content: RenderPlan,
  allomorphKey: string,
  register: "none" | "respect",
  source?: ParticleSourceProvenance,
): RenderPlan | null {
  const particle = particleKeyFromAllomorph(allomorphKey);
  if (particle === null) {
    return null;
  }
  return attachParticleRenderPlan(content, particle, {
    register,
    ...(source === undefined ? {} : { source })
  });
}

function buildPurposeModifierStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  for (let index = options.sourceUnitIndexes.length - 1; index >= 0; index -= 1) {
    const unitIndex = options.sourceUnitIndexes[index];
    const unit = unitIndex === undefined ? undefined : options.units[unitIndex];
    if (unitIndex === undefined || unit === undefined || unit.unitType === UnitType.SYMBOL) {
      continue;
    }
    const projectedPlan = projectUnitPurposeAttributivePlan(unit);
    if (projectedPlan === null) {
      continue;
    }
    const suppressUnitIndexes = uniqueSorted([unitIndex, ...options.markerUnitIndexes])
      .filter((candidateIndex) => options.units[candidateIndex]?.unitType !== UnitType.SYMBOL);
    return {
      relation: options.relation,
      insertBeforeUnitIndex: unitIndex,
      suppressUnitIndexes,
      sourceUnitIndexes: options.sourceUnitIndexes,
      targetUnitIndexes: options.targetUnitIndexes,
      projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
        options.units[candidateIndex]?.jpIndices ?? []
      ))),
      renderPlan: projectedPlan,
    };
  }
  return null;
}

function buildCorrelativeDegreeStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
}): RelationRenderOperation | null {
  const degreeMarker = options.relation.markerSpans.find((span) => span.role === "degree_marker") ?? null;
  if (degreeMarker === null) {
    return null;
  }
  const candidateUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes]);
  const degreeUnitIndex = candidateUnitIndexes.find((unitIndex) => {
    const unit = options.units[unitIndex];
    return unit !== undefined && unit.jpIndices.some((jpIndex) => (
      degreeMarker.start <= jpIndex && jpIndex < degreeMarker.endExclusive
    ));
  }) ?? null;
  const degreeUnit = degreeUnitIndex === null ? undefined : options.units[degreeUnitIndex];
  if (degreeUnitIndex === null || degreeUnit === undefined || degreeUnit.unitType === UnitType.SYMBOL) {
    return null;
  }
  const projectedPlan = projectUnitHeadTailConnectivePlan(
    degreeUnit,
    { connective: "predicate_projection_correlative_degree", surface: degreeMarker.surface },
    opSourceForMarkerSpans(options.tokens, [degreeMarker]),
  );
  if (projectedPlan === null) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex: degreeUnitIndex,
    suppressUnitIndexes: [degreeUnitIndex],
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: [...degreeUnit.jpIndices],
    renderPlan: projectedPlan,
  };
}

function buildKaParallelStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.kaParallel;
  const minimumItemCount = options.relation.kind === "toka_parallel_listing" ? 1 : 2;
  if (payload === undefined || payload.itemAnchors.length < minimumItemCount) {
    return null;
  }
  const explicitTerminalPunctuation = payload.terminalPunctuation;
  const matrixQuestionItems = payload.matrixQuestionItems;
  const yieldsLastItemToTerminalOwner = payload.terminalOwnerBoundary !== undefined;
  const projectedItems = yieldsLastItemToTerminalOwner
    ? payload.itemAnchors.slice(0, -1)
    : payload.itemAnchors;
  if (projectedItems.length === 0) return null;
  if (
    relationWindowHasExternalBoundarySymbol(
      options.tokens,
      options.units,
      options.relation.source.span.start,
      yieldsLastItemToTerminalOwner
        ? projectedItems.at(-1)!.markerSpan.endExclusive
        : payload.itemAnchors.at(-1)?.markerSpan.start ?? options.relation.source.span.endExclusive,
    )
  ) return null;
  const itemPlans: RenderPlan[] = [];
  for (const [itemIndex, item] of projectedItems.entries()) {
    const isLastItem = !yieldsLastItemToTerminalOwner && itemIndex === projectedItems.length - 1;
    const plan = kaParallelItemPlan(
      options.tokens,
      options.units,
      item,
      options.relation.kind,
      isLastItem,
      payload.closure,
      yieldsLastItemToTerminalOwner ? false : matrixQuestionItems
    );
    if (plan === null) {
      return null;
    }
    itemPlans.push(plan);
  }
  const trailingSuffix = yieldsLastItemToTerminalOwner
    ? {
      suffix: payload.separatorSpans.length > 0 ? "," : null,
      suffixUnitIndexes: payload.separatorSpans.flatMap((span) => unitIndexesInSpan(options.units, span)),
    }
    : kaParallelTrailingSuffixPlan(
      options.tokens,
      options.units,
      options.sourceUnitIndexes,
      options.relation.source.span.endExclusive,
      options.lookups,
      payload.closure,
    );
  const projectedSourceSpan = yieldsLastItemToTerminalOwner
    ? {
      start: projectedItems[0]!.source.span.start,
      endExclusive: projectedItems.at(-1)!.markerSpan.endExclusive,
    }
    : options.relation.source.span;
  const relationSourceUnitIndexes = yieldsLastItemToTerminalOwner
    ? unitIndexesInSpan(options.units, projectedSourceSpan)
    : options.sourceUnitIndexes;
  const relationMarkerUnitIndexes = yieldsLastItemToTerminalOwner
    ? projectedItems.flatMap((item) => unitIndexesInSpan(options.units, item.markerSpan))
    : options.markerUnitIndexes;
  const internalSymbolUnitIndexes = unitIndexesInSpan(options.units, options.relation.source.span)
    .filter((unitIndex) =>
      options.units[unitIndex]?.unitType === UnitType.SYMBOL &&
      options.units[unitIndex].jpIndices.some((jpIndex) =>
        jpIndex >= projectedSourceSpan.start && jpIndex < projectedSourceSpan.endExclusive
      )
    );
  const ownedSourceUnitIndexes = uniqueSorted([
    ...relationSourceUnitIndexes,
    ...internalSymbolUnitIndexes,
  ]);
  const suppressUnitIndexes = uniqueSorted([
    ...ownedSourceUnitIndexes,
    ...relationMarkerUnitIndexes,
    ...trailingSuffix.suffixUnitIndexes,
  ]);
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  const terminalOwnerPlanReplacements = payload.terminalOwnerBoundary === "matrix_terminal_question"
    ? kaParallelTerminalOwnerPlanReplacement(options.units, payload.itemAnchors.at(-1)!)
    : [];
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: ownedSourceUnitIndexes,
    targetUnitIndexes: yieldsLastItemToTerminalOwner ? [] : options.targetUnitIndexes,
    unitRenderPlanReplacements: terminalOwnerPlanReplacements,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: {
      kind: "kaParallel",
      relationKind: options.relation.kind === "ka_parallel_choice" ? "choice" : "question_content",
      itemPlans,
      itemSourceSpans: projectedItems.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.source.span)),
      markerSourceSpans: projectedItems.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.markerSpan)),
      separator: payload.separatorSpans.length > 0 ? "comma" : "space",
      terminalPunctuation: yieldsLastItemToTerminalOwner ? null : explicitTerminalPunctuation,
      terminalPunctuationRun: yieldsLastItemToTerminalOwner ? [] : payload.terminalPunctuationRun,
      ...(trailingSuffix.suffix === null ? {} : { suffix: trailingSuffix.suffix }),
      koreanPos: 구,
    },
  };
}

function kaParallelTerminalOwnerPlanReplacement(
  units: readonly TranslationUnit[],
  item: StructuralKaParallelItem,
): readonly { readonly unitIndex: number; readonly renderPlan: RenderPlan }[] {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) return [];
  const plan = units[predicateUnitIndex]?.renderPlan;
  if (plan === undefined || plan === null) return [];
  return [{ unitIndex: predicateUnitIndex, renderPlan: markQuestionContentTerminalPlan(plan) }];
}

function buildEmbeddedQuestionAttributiveQuoteStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.embeddedQuestionAttributiveQuote;
  if (payload === undefined) return null;
  const itemPlan = kaParallelItemPlan(
    options.tokens,
    options.units,
    payload.item,
    options.relation.kind,
    true,
    payload.closure,
    false,
  );
  if (itemPlan === null) return null;
  const suffixUnitIndexes = unitIndexesInSpan(options.units, payload.closure.markerSpan);
  if (suffixUnitIndexes.length === 0) return null;
  const sourceUnitIndexSet = new Set(options.sourceUnitIndexes);
  const closureEscapesMarkerSpan = suffixUnitIndexes.some((unitIndex) => {
    if (sourceUnitIndexSet.has(unitIndex)) return false;
    const unit = options.units[unitIndex];
    return unit === undefined || !unitFullyCoveredBySpans(unit, [payload.closure.markerSpan]);
  });
  if (closureEscapesMarkerSpan) return null;
  const particleUnitIndexes = payload.closure.particleSpan === undefined
    ? []
    : unitIndexesInSpan(options.units, payload.closure.particleSpan);
  const suffix = payload.closure.realization === "light_koto"
    ? " 하는"
    : payload.closure.realization === "pronominal_no" ? "라는 것" : "라는";
  const sequencePlan = structuralRelationSequencePlan([
    itemPlan,
    {
      kind: "structuralText",
      text: suffix,
      koreanPos: 구,
      sourceSpan: sourceSpanForStructuralTokenSpan(options.tokens, payload.closure.markerSpan),
    },
  ]);
  if (sequencePlan === null) return null;
  const trailingParticle = particleUnitIndexes
    .map((unitIndex) => options.units[unitIndex]?.allomorphKey ?? null)
    .map((key) => key === null ? null : particleKeyFromAllomorph(key))
    .find((key) => key !== null) ?? null;
  const renderPlan = payload.closure.realization === "pronominal_no" && trailingParticle !== null
    ? attachParticleRenderPlan(sequencePlan, trailingParticle)
    : sequencePlan;
  if (renderPlan === null) return null;
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    ...suffixUnitIndexes,
    ...particleUnitIndexes,
  ]).filter((unitIndex) => options.units[unitIndex]?.unitType !== UnitType.SYMBOL);
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) return null;
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((unitIndex) => (
      options.units[unitIndex]?.jpIndices ?? []
    ))),
    renderPlan,
  };
}

function relationWindowHasExternalBoundarySymbol(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  start: number,
  endExclusive: number,
): boolean {
  return units.some((unit) =>
    unit.unitType === UnitType.SYMBOL &&
    unit.jpIndices.some((jpIndex) => {
      if (jpIndex < start || jpIndex >= endExclusive) return false;
      const token = tokens[jpIndex];
      return token !== undefined &&
        !isClauseOpeningPunctuationToken(token) &&
        !isClauseEvidenceTransparentPunctuation(token);
    })
  );
}

function buildNariParallelStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.nariParallel;
  if (payload === undefined || payload.itemAnchors.length < 2) {
    return null;
  }
  const itemPlans: RenderPlan[] = [];
  for (const item of payload.itemAnchors) {
    if (nariItemSpanContainsTransparentPunctuation(options.tokens, item.source.span)) {
      return null;
    }
    const plan = nariParallelItemPlan(options.tokens, options.units, item, item.itemKind);
    if (plan === null) {
      return null;
    }
    itemPlans.push(plan);
  }
  const trailingParticle = nariParallelTrailingParticleKey(
    options.units,
    payload.trailingParticleSpan ?? null,
  );
  const consumeTrailing = payload.trailingParticleSpan !== null &&
    payload.trailingParticleSpan !== undefined && trailingParticle !== null;
  const unconsumedTrailingUnitIndexes = consumeTrailing || payload.trailingParticleSpan === null || payload.trailingParticleSpan === undefined
    ? []
    : unitIndexesInSpan(options.units, payload.trailingParticleSpan);
  const suppressUnitIndexes = uniqueSorted([...options.sourceUnitIndexes, ...options.markerUnitIndexes])
    .filter((unitIndex) => !unconsumedTrailingUnitIndexes.includes(unitIndex));
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  return {
    relation: options.relation,
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: options.sourceUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    renderPlan: {
      kind: "nariParallel",
      itemKind: payload.itemKind,
      itemKinds: payload.itemAnchors.map((item) => item.itemKind),
      itemPlans,
      itemSourceSpans: payload.itemAnchors.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.source.span)),
      markerSourceSpans: payload.markerSpans.map((span) => sourceSpanForStructuralTokenSpan(options.tokens, span)),
      separator: payload.separatorSpans.length > 0 ? "comma" : "space",
      ...(consumeTrailing && trailingParticle !== null ? { trailingParticle } : {}),
      koreanPos: 구,
    },
  };
}

function buildTokaNominalListingStructuredRenderOperation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly units: readonly TranslationUnit[];
  readonly relation: StructuralRelation;
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly lookups: LookupTables;
}): RelationRenderOperation | null {
  const payload = options.relation.tokaNominalListing;
  if (payload === undefined || payload.itemAnchors.length < 2) {
    return null;
  }
  const itemPlans: RenderPlan[] = [];
  const relationCoreSpans: StructuralRelationTokenSpan[] = [
    ...payload.itemAnchors.map((item) => item.span),
    ...options.relation.markerSpans,
    ...payload.separatorSpans,
  ];
  if (tokaNominalListingHasUnownedSourceGap(options.tokens, relationCoreSpans)) {
    return null;
  }
  const itemUnitIndexesForSuppression: number[] = [];
  for (const item of payload.itemAnchors) {
    if (nariItemSpanContainsTransparentPunctuation(options.tokens, item.span)) {
      return null;
    }
    const itemUnitIndexes = unitIndexesInSpan(options.units, item.span);
    if (itemUnitIndexes.some((unitIndex) => {
      const unit = options.units[unitIndex];
      return unit === undefined || !unitFullyCoveredBySpans(unit, [item.span]);
    })) {
      return null;
    }
    const itemPlan = composeRelationSourceUnitPlans(
      options.tokens,
      options.units,
      itemUnitIndexes,
    );
    if (itemPlan === null) {
      return null;
    }
    itemUnitIndexesForSuppression.push(...itemUnitIndexes);
    itemPlans.push(itemPlan);
  }
  const trailingParticle = payload.closure === "closed"
    ? nariParallelTrailingParticleKey(options.units, payload.trailingParticleSpan)
    : null;
  const consumeTrailing = payload.closure === "closed" &&
    payload.trailingParticleSpan !== null && trailingParticle !== null;
  const unconsumedTrailingUnitIndexes = !consumeTrailing && payload.trailingParticleSpan !== null
    ? unitIndexesInSpan(options.units, payload.trailingParticleSpan)
    : [];
  const suppressUnitIndexes = uniqueSorted([
    ...options.sourceUnitIndexes,
    ...options.markerUnitIndexes,
    ...itemUnitIndexesForSuppression,
  ]).filter((unitIndex) => !unconsumedTrailingUnitIndexes.includes(unitIndex));
  const suppressibleSpans: StructuralRelationTokenSpan[] = [
    ...payload.itemAnchors.map((item) => item.span),
    ...options.relation.markerSpans,
    ...payload.separatorSpans,
    ...(consumeTrailing && payload.trailingParticleSpan !== null
      ? [payload.trailingParticleSpan]
      : []),
  ];
  if (suppressUnitIndexes.some((unitIndex) => {
    const unit = options.units[unitIndex];
    return unit === undefined || !unitFullyCoveredBySpans(unit, suppressibleSpans);
  })) {
    return null;
  }
  const insertBeforeUnitIndex = suppressUnitIndexes[0] ?? options.sourceUnitIndexes[0] ?? null;
  if (insertBeforeUnitIndex === null) {
    return null;
  }
  return {
    relation: consumeTrailing || payload.trailingParticleSpan === null
      ? options.relation
      : tokaNominalListingRelationWithoutTrailingParticle(options.relation),
    insertBeforeUnitIndex,
    suppressUnitIndexes,
    sourceUnitIndexes: suppressUnitIndexes,
    targetUnitIndexes: options.targetUnitIndexes,
    projectionTokenIndexes: uniqueSorted(suppressUnitIndexes.flatMap((candidateIndex) => (
      options.units[candidateIndex]?.jpIndices ?? []
    ))),
    ...(consumeTrailing && payload.trailingParticleSpan !== null
      ? { projectionHeadTokenIndex: payload.trailingParticleSpan.start }
      : {}),
    renderPlan: {
      kind: "nariParallel",
      itemKind: "nominal",
      itemPlans,
      itemSourceSpans: payload.itemAnchors.map((item) => sourceSpanForStructuralTokenSpan(options.tokens, item.span)),
      markerSourceSpans: options.relation.markerSpans.map((span) => sourceSpanForStructuralTokenSpan(options.tokens, span)),
      separator: "space",
      itemSeparatorTexts: payload.itemAnchors.slice(0, -1).map((_, index) => {
        const markerEnd = options.relation.markerSpans[index]?.endExclusive ?? 0;
        const nextItemStart = payload.itemAnchors[index + 1]?.span.start ?? markerEnd;
        const separatorSpans = payload.separatorSpans.filter((span) =>
          span.start >= markerEnd && span.endExclusive <= nextItemStart
        );
        return separatorSpans.length === 0
          ? " "
          : separatorSpans.map((span) => span.surface).join("");
      }),
      itemSeparatorSourceSpans: payload.itemAnchors.slice(0, -1).map((_, index) => {
        const markerEnd = options.relation.markerSpans[index]?.endExclusive ?? 0;
        const nextItemStart = payload.itemAnchors[index + 1]?.span.start ?? markerEnd;
        const separatorSpans = payload.separatorSpans.filter((span) =>
          span.start >= markerEnd && span.endExclusive <= nextItemStart
        );
        const firstSeparator = separatorSpans[0];
        const lastSeparator = separatorSpans.at(-1);
        return firstSeparator === undefined || lastSeparator === undefined
          ? null
          : sourceSpanForStructuralTokenSpan(options.tokens, {
              start: firstSeparator.start,
              endExclusive: lastSeparator.endExclusive,
            });
      }),
      ...(consumeTrailing && trailingParticle !== null && payload.trailingParticleSpan !== null
        ? {
            trailingParticle,
            trailingParticleSourceSpan: sourceSpanForStructuralTokenSpan(
              options.tokens,
              payload.trailingParticleSpan,
            ),
          }
        : {}),
      nominalListingStyle: "toka",
      nominalListingClosure: payload.closure,
      koreanPos: 구,
    },
  };
}

function tokaNominalListingHasUnownedSourceGap(
  tokens: readonly RuntimeHaruToken[],
  spans: readonly StructuralRelationTokenSpan[],
): boolean {
  const indexes = uniqueSorted(spans.flatMap((span) => {
    const values: number[] = [];
    for (let index = span.start; index < span.endExclusive; index += 1) {
      values.push(index);
    }
    return values;
  }));
  for (let position = 1; position < indexes.length; position += 1) {
    const previous = tokens[indexes[position - 1] as number];
    const current = tokens[indexes[position] as number];
    const previousSpan = previous?.sourceSpan;
    const currentSpan = current?.sourceSpan;
    if (
      previousSpan !== undefined &&
      previousSpan !== null &&
      currentSpan !== undefined &&
      currentSpan !== null &&
      previousSpan.endOrdinal < currentSpan.startOrdinal
    ) {
      return true;
    }
  }
  return false;
}

function tokaNominalListingRelationWithoutTrailingParticle(
  relation: StructuralRelation,
): StructuralRelation {
  const payload = relation.tokaNominalListing;
  if (payload === undefined || payload.trailingParticleSpan === null) {
    return relation;
  }
  const sourceEnd = Math.max(
    ...payload.itemAnchors.map((item) => item.span.endExclusive),
    ...relation.markerSpans.map((span) => span.endExclusive),
  );
  return {
    ...relation,
    source: {
      ...relation.source,
      span: { ...relation.source.span, endExclusive: sourceEnd },
    },
    ...(relation.candidateSuppressibleTokenSpans === undefined ? {} : {
      candidateSuppressibleTokenSpans: relation.candidateSuppressibleTokenSpans.filter(
        (span) => span.reason !== "relation_trailing_particle",
      ),
    }),
    tokaNominalListing: {
      ...payload,
      trailingParticleSpan: null,
    },
  };
}

function nariParallelItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  item: StructuralNariParallelItem,
  itemKind: "nominal" | "predicate",
): RenderPlan | null {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  if (unitIndexes.length === 0) {
    return null;
  }
  if (itemKind === "nominal") {
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
  }
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) {
    return null;
  }
  const predicateUnit = units[predicateUnitIndex];
  if (predicateUnit === undefined) {
    return null;
  }
  const projected = nariParallelPredicateProjectionPlan(predicateUnit.renderPlan);
  if (projected === null) {
    return null;
  }
  const extraUnitIndexes = unitIndexes.filter((unitIndex) =>
    unitIndex !== predicateUnitIndex && units[unitIndex]?.unitType !== UnitType.SYMBOL
  );
  if (extraUnitIndexes.length === 0) {
    return projected;
  }
  if (extraUnitIndexes.some((unitIndex) => unitIndex > predicateUnitIndex)) {
    return null;
  }
  return composeRelationSourceUnitPlans(
    tokens,
    units,
    unitIndexes,
    new Map([[predicateUnitIndex, projected]]),
  );
}

function nariParallelPredicateProjectionPlan(plan: RenderPlan | null): LemmaRealization | null {
  if (plan?.kind === "lemma") {
    if (
      (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) ||
      plan.prefix !== undefined ||
      plan.suffix !== undefined ||
      (plan.connective !== undefined && plan.connective !== null) ||
      (plan.sfp !== undefined && plan.sfp !== null)
    ) {
      return null;
    }
    return {
      ...plan,
      connective: "든",
      sfp: null,
    };
  }
  if (plan?.kind !== "headTailChain" || plan.realization.kind !== "predicate" || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  if (layer.ops.length !== 0 || layer.terminal !== null || plan.realization.root.sfp !== null) {
    return null;
  }
  const stem = layer.stem;
  if (stem.kind !== "verb" && stem.kind !== "adj") {
    return null;
  }
  return {
    kind: "lemma",
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    koreanPos: stem.kind === "verb" ? 동사 : 형용사,
    irregular: stem.irregular,
    auxTokens: [],
    connective: "든",
    voice: "active",
  };
}

function nariItemSpanContainsTransparentPunctuation(
  tokens: readonly RuntimeHaruToken[],
  span: { readonly start: number; readonly endExclusive: number },
): boolean {
  for (let index = span.start; index < span.endExclusive; index += 1) {
    const token = tokens[index];
    if (token !== undefined && isClauseEvidenceTransparentPunctuation(token)) {
      return true;
    }
  }
  return false;
}

function nariParallelTrailingParticleKey(
  units: readonly TranslationUnit[],
  span: StructuralRelationTokenSpan | null,
): ParticleKey | null {
  if (span === null) {
    return null;
  }
  for (const unitIndex of unitIndexesInSpan(units, span)) {
    const key = units[unitIndex]?.allomorphKey;
    if (key === undefined || key === null) {
      continue;
    }
    const particle = particleKeyFromAllomorph(key);
    if (particle !== null) {
      return particle;
    }
  }
  return null;
}

function kaParallelTrailingSuffixPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  sourceEndExclusive: number,
  lookups: LookupTables,
  closure: StructuralKaParallelClosure,
): { readonly suffix: RenderPlan | string | null; readonly suffixUnitIndexes: readonly number[] } {
  const cursor = new TokenCursor(tokens, sourceEndExclusive, tokens.length, sourceEndExclusive);
  const externalSuffix = kaParallelExternalDakeCopulaSuffixPlan(cursor, units, lookups);
  if (externalSuffix !== null) {
    return externalSuffix;
  }
  const embeddedQuestionQuote = kaParallelEmbeddedQuestionQuoteSuffix(units, closure);
  if (embeddedQuestionQuote !== null) {
    return embeddedQuestionQuote;
  }
  for (const unitIndex of sourceUnitIndexes) {
    const unit = units[unitIndex];
    const plan = unit?.renderPlan;
    if (
      unit === undefined ||
      plan?.kind !== "predicateScopeCarrier" ||
      plan.suffix === undefined ||
      !unit.jpIndices.some((jpIndex) => jpIndex >= sourceEndExclusive)
    ) {
      continue;
    }
    return { suffix: plan.suffix, suffixUnitIndexes: [unitIndex] };
  }
  return { suffix: null, suffixUnitIndexes: [] };
}

function kaParallelEmbeddedQuestionQuoteSuffix(
  units: readonly TranslationUnit[],
  closure: StructuralKaParallelClosure,
): { readonly suffix: string; readonly suffixUnitIndexes: readonly number[] } | null {
  if (closure.kind !== "attributive_quote") {
    return null;
  }
  const suffixUnitIndexes = unitIndexesInSpan(units, {
    start: closure.markerSpan.start,
    endExclusive: closure.markerSpan.endExclusive
  });
  return suffixUnitIndexes.length === 0
    ? null
    : {
      suffix: closure.realization === "light_koto"
        ? " 하는"
        : closure.realization === "pronominal_no" ? "라는 것" : "라는",
      suffixUnitIndexes
    };
}

function kaParallelExternalDakeCopulaSuffixPlan(
  cursor: TokenCursor<RuntimeHaruToken>,
  units: readonly TranslationUnit[],
  lookups: LookupTables,
): { readonly suffix: RenderPlan; readonly suffixUnitIndexes: readonly number[] } | null {
  const { tokens, pos: sourceEndExclusive } = cursor;
  const dakeIndex = nextNonSpaceTokenIndex(cursor);
  const dake = dakeIndex === null ? undefined : tokens[dakeIndex];
  if (dakeIndex === null || dake?.surface !== "だけ") {
    return null;
  }
  const copulaTail = matchCopulaTailWithOptionalConditional(cursor.fork(dakeIndex + 1, cursor.end, dakeIndex + 1), { skipLeadingSpace: true });
  if (copulaTail === null || (copulaTail.auxTokens.length === 0 && copulaTail.connective === null)) {
    return null;
  }
  let endExclusive = dakeIndex + 1 + copulaTail.consumed;
  let connective: string | null = copulaTail.connective;
  const tameReasonConsumed = kaParallelTameReasonTail(cursor.fork(endExclusive), sourceEndExclusive - 1, lookups);
  if (tameReasonConsumed !== null) {
    connective = "기 때문에";
    endExclusive += tameReasonConsumed;
  } else if (!kaParallelSuffixCanEndAt(cursor.fork(endExclusive))) {
    return null;
  }
  const suffixUnitIndexes = unitIndexesInSpan(units, {
    start: dakeIndex,
    endExclusive,
  });
  if (suffixUnitIndexes.length === 0) {
    return null;
  }
  return {
    suffix: {
      kind: "lemma",
      entry: null,
      koreanLemma: "뿐",
      koreanPos: 명사,
      irregular: null,
      auxTokens: copulaTail.auxTokens,
      formalOverride: true,
      ...(connective === null ? {} : { connective }),
    },
    suffixUnitIndexes,
  };
}

function kaParallelTameReasonTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  contentIdx: number,
  lookups: LookupTables,
): number | null {
  const headIndex = nextNonSpaceTokenIndex(cursor);
  const headToken = headIndex === null ? null : cursor.tokens[headIndex] ?? null;
  if (!isTameReasonHeadContext(headToken, cursor.tokens, contentIdx, lookups)) {
    return null;
  }
  if (headIndex === null) {
    return null;
  }
  return headIndex - cursor.pos + 1;
}

function kaParallelSuffixCanEndAt(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const index = nextNonSpaceTokenIndex(cursor);
  if (index === null) {
    return true;
  }
  const token = cursor.tokens[index];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 補助記号 || pos0 === 記号;
}

function nextNonSpaceTokenIndex(cursor: TokenCursor<RuntimeHaruToken>): number | null {
  const c = cursor.fork();
  return c.pos < c.end ? c.pos : null;
}

function previousNonSpaceTokenIndex(tokens: readonly RuntimeHaruToken[], start: number): number | null {
  for (let index = Math.min(start - 1, tokens.length - 1); index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return index;
  }
  return null;
}

function kaParallelItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  item: StructuralKaParallelItem,
  relationKind: string,
  isLast: boolean,
  closure: StructuralKaParallelClosure,
  matrixQuestionItems: boolean,
): RenderPlan | null {
  const unitIndexes = unitIndexesInSpan(units, item.source.span);
  if (unitIndexes.length === 0) {
    return null;
  }
  if (relationKind === "toka_parallel_listing") {
    return tokaParallelListingItemPlan(tokens, units, unitIndexes, item);
  }
  if (relationKind === "ka_parallel_choice") {
    const replacements = new Map<number, RenderPlan>();
    for (const unitIndex of unitIndexes) {
      const unit = units[unitIndex];
      if (unit === undefined) {
        continue;
      }
      const projected = projectUnitWithoutKaSfpPlan(unit, item.markerSpan, tokens);
      if (projected !== null) {
        replacements.set(unitIndex, projected);
      }
    }
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
  }
  const negativeAlternative = kaParallelNegativeAlternativePlan(item);
  if (negativeAlternative !== null) {
    return negativeAlternative;
  }
  const predicateUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  if (predicateUnitIndex === null) {
    if (!matrixQuestionItems) {
      return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
    }
    const replacements = new Map<number, RenderPlan>();
    for (const unitIndex of unitIndexes) {
      const plan = units[unitIndex]?.renderPlan;
      if (plan === undefined || plan === null) continue;
      const projected = markQuestionContentTerminalPlan(plan);
      if (projected !== plan) replacements.set(unitIndex, projected);
    }
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
  }
  const predicateUnit = units[predicateUnitIndex];
  if (predicateUnit === undefined) {
    return null;
  }
  if (isLast && closure.kind === "terminal_fragment" && isNominalizedConjectureMatrixQuestionPlan(predicateUnit.renderPlan)) {
    return composeRelationSourceUnitPlans(tokens, units, unitIndexes);
  }
  const projectedPredicateBase = projectSimpleNegativeHeadTailQuestionContentPlan(predicateUnit.renderPlan) ??
    projectUnitHeadTailConnectivePlan(
      predicateUnit,
      { connective: "question_content", surface: item.markerSpan.surface },
      opSourceForMarkerSpans(tokens, [item.markerSpan]),
      true,
      closure.kind === "attributive_quote"
        ? opSourceForMarkerSpans(tokens, [item.markerSpan, closure.markerSpan])
        : null,
    ) ??
    projectLemmaQuestionContentPlan(predicateUnit.renderPlan) ??
    projectConjugatedLemmaQuestionContentPlan(predicateUnit.renderPlan) ??
    projectPredicateScopeCarrierQuestionContentPlan(predicateUnit.renderPlan);
  if (projectedPredicateBase === null) {
    return null;
  }
  const projectedPredicate = matrixQuestionItems
    ? markQuestionContentTerminalPlan(projectedPredicateBase)
    : markStructuralKaParallelQuestionContentPlan(projectedPredicateBase);
  return composeRelationSourceUnitPlans(tokens, units, unitIndexes, new Map([[predicateUnitIndex, projectedPredicate]]));
}

function tokaParallelListingItemPlan(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  item: StructuralKaParallelItem,
): RenderPlan | null {
  const replacements = new Map<number, RenderPlan>();
  const ownerUnitIndex = parallelPredicateUnitIndex(units, unitIndexes, item.predicateIdx);
  const plan = ownerUnitIndex === null ? null : units[ownerUnitIndex]?.renderPlan ?? null;
  if (ownerUnitIndex !== null && plan !== null) {
    const copulaIdx = previousNonSpaceTokenIndex(tokens, item.markerSpan.start);
    const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
    const basePlan: RenderPlan = plan.kind === "lemma"
      ? {
        ...plan,
        auxTokens: copula === undefined
          ? plan.auxTokens
          : plan.auxTokens.filter((token) => !sourceTokensOverlap(token, copula)),
        sfp: null,
        terminalSfp: null,
      } satisfies LemmaRealization
      : plan;
    const exemplified = item.predicateCategory === "predicate"
      ? projectTokaPredicateListingPlan(basePlan, opSourceForMarkerSpans(tokens, [item.markerSpan]))
      : attachParticleRenderPlan(basePlan, "이라든가/라든가");
    if (exemplified === null) {
      return null;
    }
    replacements.set(ownerUnitIndex, exemplified);
  }
  return composeRelationSourceUnitPlans(tokens, units, unitIndexes, replacements);
}

function projectTokaPredicateListingPlan(
  plan: RenderPlan,
  source: OpSource | null,
): RenderPlan | null {
  if (plan.kind === "lemma") {
    const rule = CONNECTIVE_RENDER_MAP.get("とか");
    if (rule === undefined || (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사)) {
      return null;
    }
    return {
      ...plan,
      connective: plan.koreanPos === 형용사 ? rule.adjEnding ?? rule.korean : rule.korean,
      ...(rule.suffixText === undefined ? {} : { suffix: `${plan.suffix ?? ""}${rule.suffixText}` }),
      sfp: null,
      terminalSfp: null,
    };
  }
  if (!isPredicateHeadTailChainRenderPlan(plan) || source === null) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    { connective: "exemplification", surface: "とか" },
    source,
  );
}

function markQuestionContentTerminalPlan(plan: RenderPlan): RenderPlan {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return plan;
  }
  const layer = plan.realization.root.tail;
  const ops = layer.ops.map((op) =>
    op.kind === "connective" && op.connective === "question_content"
      ? markQuestionContentTerminalOp(op)
      : op
  );
  if (ops.every((op, index) => op === layer.ops[index])) return plan;
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...layer, ops }
      }
    }
  };
}

function markStructuralKaParallelQuestionContentPlan(plan: RenderPlan): RenderPlan {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return plan;
  }
  const layer = plan.realization.root.tail;
  const ops = layer.ops.map((op) =>
    op.kind === "connective" && op.connective === "question_content"
      ? markStructuralKaParallelQuestionContentOp(op)
      : op
  );
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: { ...layer, ops }
      }
    }
  };
}

export function markQuestionContentTerminalOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return { ...op, questionContentRole: "terminal" };
}

export function markStructuralKaParallelQuestionContentOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return {
    ...op,
    questionContentRole: op.questionContentRole ?? "embedded",
    ownedByStructuralKaParallel: true
  };
}

function kaParallelNegativeAlternativePlan(item: StructuralKaParallelItem): RenderPlan | null {
  if (item.itemKind !== "negative_alternative") {
    return null;
  }
  return {
    kind: "kaParallelNegativeAlternative",
    koreanPos: 구,
  };
}

function projectUnitWithoutKaSfpPlan(
  unit: TranslationUnit,
  markerSpan: { readonly start: number; readonly endExclusive: number },
  tokens: readonly RuntimeHaruToken[],
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const sfp = plan.realization.root.sfp;
  const markerSource = opSourceForMarkerSpans(tokens, [{
    start: markerSpan.start,
    endExclusive: markerSpan.endExclusive,
    surface: "",
    role: "ka_parallel_marker",
  }]);
  if (markerSource === null || sfp?.effect !== "ka" || !opSourceCoveredBy(sfp.source, markerSource)) {
    return null;
  }
  const projectedRoot = {
    ...plan.realization.root,
    sfp: null,
  };
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  return {
    ...planWithoutOriginalSourceCandidate,
    realization: { ...plan.realization, root: projectedRoot },
    clauseRole: { ...plan.clauseRole, outgoingBoundary: { kind: "terminal" } },
  };
}

function lastRealizedUnitIndexAfter(
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  anchorPos: number
): number | null {
  for (let index = unitIndexes.length - 1; index >= anchorPos; index -= 1) {
    const unitIndex = unitIndexes[index];
    if (unitIndex === undefined) {
      continue;
    }
    const unit = units[unitIndex];
    if (unit !== undefined && unit.unitType !== UnitType.SYMBOL && unit.renderPlan !== null) {
      return unitIndex;
    }
  }
  return null;
}

function isNominalHeadUnit(unit: TranslationUnit | undefined): boolean {
  const pos0 = (unit?.jpHead.pos ?? 0) & POS0;
  return pos0 === 名詞 || pos0 === 代名詞;
}

function parallelPredicateUnitIndex(
  units: readonly TranslationUnit[],
  unitIndexes: readonly number[],
  predicateIdx: number | null,
): number | null {
  if (predicateIdx !== null) {
    const anchorPos = unitIndexes.findIndex((unitIndex) => units[unitIndex]?.jpIndices.includes(predicateIdx) === true);
    if (anchorPos >= 0) {
      const closingUnitIndex = lastRealizedUnitIndexAfter(units, unitIndexes, anchorPos);
      if (closingUnitIndex !== null && isNominalHeadUnit(units[closingUnitIndex])) {
        return closingUnitIndex;
      }
      const anchorUnitIndex = unitIndexes[anchorPos];
      if (anchorUnitIndex !== undefined) {
        return anchorUnitIndex;
      }
    }
  }
  for (let index = unitIndexes.length - 1; index >= 0; index -= 1) {
    const unitIndex = unitIndexes[index];
    if (unitIndex === undefined) {
      continue;
    }
    const unit = units[unitIndex];
    if (unit !== undefined && unit.unitType !== UnitType.SYMBOL && unit.renderPlan !== null) {
      return unitIndex;
    }
  }
  return null;
}

function projectLemmaQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "lemma") {
    return null;
  }
  if (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사 && plan.koreanPos !== 명사 && plan.koreanPos !== 대명사) {
    return null;
  }
  return {
    ...plan,
    connective: "는지",
    sfp: null,
  };
}

function projectConjugatedLemmaQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "conjugatedLemma") {
    return null;
  }
  if (!("koreanLemma" in plan) || !("ending" in plan) || plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) {
    return null;
  }
  return {
    ...plan,
    ending: plan.koreanPos === 형용사 ? "ㄴ/은지" : "는지",
  };
}

function projectPredicateScopeCarrierQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind !== "predicateScopeCarrier") {
    return null;
  }
  if (plan.projection.kind === "direct" && predicateHeadTailPlanHasQuestionContent(plan.projection.base)) {
    return projectSimpleNegativeHeadTailQuestionContentPlan(plan.projection.base) ?? plan.projection.base;
  }
  return projectLemmaQuestionContentPlan(plan.projection.base);
}

function predicateHeadTailPlanHasQuestionContent(plan: RenderPlan | null): plan is PredicateHeadTailChainRenderPlan {
  if (plan === null) {
    return false;
  }
  if (plan.kind !== "headTailChain" || plan.realization.kind !== "predicate" || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) => (
    op.kind === "connective" &&
    (op.connective === "question_content" || op.connective === "question_content_alternative")
  ));
}

function projectSimpleNegativeHeadTailQuestionContentPlan(plan: RenderPlan | null): RenderPlan | null {
  if (!predicateHeadTailPlanHasQuestionContent(plan)) {
    return null;
  }
  if (plan.realization.root.tail.kind !== "auxLayer" || plan.realization.root.tail.terminal !== null || plan.realization.root.sfp !== null) {
    return null;
  }
  const layer = plan.realization.root.tail;
  if (layer.ops.length !== 2) {
    return null;
  }
  const [negative, connective] = layer.ops;
  if (
    negative?.kind !== "negation" ||
    connective?.kind !== "connective" ||
    (connective.connective !== "question_content" && connective.connective !== "question_content_alternative")
  ) {
    return null;
  }
  const stem = committedPredicateStemView(layer.stem);
  if (stem === null) {
    return null;
  }
  if (stem.category === "adjectival_predicate") {
    return {
      kind: "lemma",
      entry: plan.realization.entry ?? null,
      koreanLemma: "않다",
      koreanPos: 형용사,
      irregular: null,
      prefix: `${conjugate(stem.lemma, asIrregular(stem.irregular), "지")} `,
      auxTokens: [],
      connective: "ㄴ/은지",
      voice: "active",
    };
  }
  return {
    kind: "lemma",
    entry: plan.realization.entry ?? null,
    koreanLemma: stem.lemma,
    koreanPos: 동사,
    irregular: stem.irregular,
    auxTokens: negative.source.tokens,
    connective: "는지",
    voice: "active",
  };
}

function committedPredicateStemView(
  stem: StemNode
): { readonly category: "verbal_predicate" | "adjectival_predicate"; readonly lemma: string; readonly irregular: IrregularType | null } | null {
  if (stem.kind === "verb") {
    return { category: "verbal_predicate", lemma: stem.lemma, irregular: stem.irregular };
  }
  if (stem.kind === "adj") {
    return { category: "adjectival_predicate", lemma: stem.lemma, irregular: stem.irregular };
  }
  if (
    stem.kind !== "candidateSet" ||
    stem.committedSense === undefined
  ) {
    return null;
  }
  const category = committedCandidateSetPredicateCategory(stem);
  if (category === null) {
    return null;
  }
  const candidate = stem.candidates.find((item) =>
    stemCandidateIdentitiesEqual(stemCandidateIdentity(item), stem.committedSense!)
  );
  return candidate === undefined
    ? null
    : {
        category,
        lemma: candidate.lemma,
        irregular: candidate.irregular
      };
}

function committedCandidateSetPredicateCategory(
  stem: Extract<StemNode, { readonly kind: "candidateSet" }>
): "verbal_predicate" | "adjectival_predicate" | null {
  const category = stem.committedSenseRealization?.category;
  if (category !== undefined) {
    return category === "verbal_predicate" || category === "adjectival_predicate"
      ? category
      : null;
  }
  switch (stem.sourcePredicateShape) {
    case "verb":
    case "sahen_verbalization":
      return "verbal_predicate";
    case "i_adjective":
    case "na_adjective":
      return "adjectival_predicate";
    case "nominal":
    case "particle_phrase":
    case "lexical_adverb":
    case undefined:
      return null;
  }
  return null;
}

function sourcePredicateHeadTailUnitIndexForRelation(
  units: readonly TranslationUnit[],
  relation: StructuralRelation,
  sourceUnitIndexes: readonly number[],
): number | null {
  const predicateIdx = relationSourcePredicateIdx(relation);
  if (predicateIdx === null) {
    return null;
  }
  return sourceUnitIndexes.find((unitIndex) => {
    const unit = units[unitIndex];
    return unit?.jpIndices.includes(predicateIdx) === true && unit.renderPlan?.kind === "headTailChain";
  }) ?? null;
}

function sourcePredicateUnitIndexForRelation(
  units: readonly TranslationUnit[],
  relation: StructuralRelation,
  sourceUnitIndexes: readonly number[],
): number | null {
  const predicateIdx = relationSourcePredicateIdx(relation);
  if (predicateIdx === null) {
    return null;
  }
  return sourceUnitIndexes.find((unitIndex) => units[unitIndex]?.jpIndices.includes(predicateIdx) === true) ?? null;
}

function relationSourcePredicateIdx(relation: StructuralRelation): number | null {
  return relation.source.kind === "predicate"
    ? relation.source.predicateIdx
    : relation.source.kind === "clause"
      ? relation.source.predicateIdx
      : null;
}

function sourcePredicateProjectionCandidateUnitIndexes(
  units: readonly TranslationUnit[],
  relation: StructuralRelation,
  sourceUnitIndexes: readonly number[],
  markerUnitIndexes: readonly number[],
): readonly number[] {
  if (relation.kind === "concession" && relationSourcePredicateIdx(relation) === null) {
    return sourceUnitIndexes.filter((unitIndex) => markerUnitIndexes.includes(unitIndex)).reverse();
  }
  const anchoredUnitIndex = sourcePredicateHeadTailUnitIndexForRelation(units, relation, sourceUnitIndexes);
  return anchoredUnitIndex === null
    ? [...sourceUnitIndexes].reverse()
    : [anchoredUnitIndex];
}

function sourcePredicateConnectiveProjection(
  relation: StructuralRelation,
): { readonly connective: ConnectiveKind; readonly surface: string } | null {
  switch (relation.kind) {
    case "simultaneous_progression":
    case "te_attendant_simultaneous":
      return { connective: "simultaneous", surface: "ながら" };
    case "listing_example":
      return { connective: "exemplification", surface: "たり" };
    case "tari_listing_coordination":
      return { connective: "alternative", surface: "たり" };
    case "purpose_clause_coordination":
      return { connective: "tame_purpose", surface: purposeClauseCoordinationSurface(relation) };
    case "immediate_sequence":
      return { connective: "sequence_immediate", surface: relation.markerSpans[0]?.surface ?? "なり" };
    case "stative_hold_sequence":
      return { connective: "stative_hold", surface: "なり" };
    case "concession":
      return { connective: "concession", surface: concessionProjectionSurface(relation) };
    default:
      return null;
  }
}

function purposeClauseCoordinationSurface(relation: StructuralRelation): string {
  return relation.purposeClauseCoordination?.purposeMarkerSpan.surface ?? "ため";
}

function concessionProjectionSurface(relation: StructuralRelation): string {
  const surface = relation.markerSpans[0]?.surface ?? "にもかかわらず";
  return surface.endsWith("にもかかわらず") ? "にもかかわらず" : surface;
}

function projectRelationForSharedUnitIr(options: {
  readonly relation: StructuralRelation;
  readonly units: readonly TranslationUnit[];
  readonly sourceUnitIndexes: readonly number[];
  readonly markerUnitIndexes: readonly number[];
  readonly targetUnitIndexes: readonly number[];
  readonly projectRelation: StructuralRelationRenderProjector;
  readonly diagnostics: StructuralRelationDiagnostic[];
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): RenderPlan | null {
  const projected = options.projectRelation({
    relation: options.relation,
    sourceUnits: options.sourceUnitIndexes.flatMap((unitIndex) => options.units[unitIndex] ?? []),
    markerUnits: options.markerUnitIndexes.flatMap((unitIndex) => options.units[unitIndex] ?? []),
    targetUnits: options.targetUnitIndexes.flatMap((unitIndex) => options.units[unitIndex] ?? []),
    lookups: options.lookups,
    numeric: options.numeric,
  });
  if (!projected.ok) {
    options.diagnostics.push(projectionUnavailable({
      message: `relation ${options.relation.kind} projection failed (${projected.reason})`,
      relationKind: options.relation.kind,
      confidence: options.relation.confidence,
      markerSpans: options.relation.markerSpans,
    }));
    return null;
  }
  return projected.renderPlan;
}

function applyRenderOperations(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  operations: readonly RelationRenderOperation[],
): readonly TranslationUnit[] {
  const operationsByInsertIndex = new Map<number, RelationRenderOperation[]>();
  for (const operation of operations) {
    for (const replacement of operation.unitRenderPlanReplacements ?? []) {
      const unit = units[replacement.unitIndex];
      if (unit === undefined) continue;
      unit.setRenderPlan(replacement.renderPlan, {
        rule: "structural_relation_owner",
        cacheValue: "",
      });
    }
    if (operation.replaceUnitIndex === undefined) {
      const existing = operationsByInsertIndex.get(operation.insertBeforeUnitIndex);
      if (existing === undefined) {
        operationsByInsertIndex.set(operation.insertBeforeUnitIndex, [operation]);
      } else {
        existing.push(operation);
      }
    } else {
      const unit = units[operation.replaceUnitIndex];
      if (unit !== undefined) {
        unit.setRenderPlan(operation.renderPlan, {
          rule: "structural_relation_owner",
          cacheValue: "",
        });
        unit.provenance = "structural_relation_owner";
        unit.provenanceReason = `relation:${operation.relation.kind}`;
      }
      const markerUnit = operation.quotativeMarkerUnitIndex === undefined
        ? undefined
        : units[operation.quotativeMarkerUnitIndex];
      if (markerUnit !== undefined) {
        markerUnit.setKorean("", { rule: "structural_relation_owner" });
        markerUnit.allomorphKey = "이라고/라고";
        markerUnit.provenance = "structural_relation_owner";
        markerUnit.provenanceReason = `relation:${operation.relation.kind}`;
      }
    }
    for (const unitIndex of operation.suppressUnitIndexes) {
      const unit = units[unitIndex];
      if (unit === undefined) {
        continue;
      }
      unit.suppress({ rule: "structural_relation_owner" });
      unit.provenance = "structural_relation_owner";
      unit.provenanceReason = `relation:${operation.relation.kind}`;
    }
  }

  const output: TranslationUnit[] = [];
  for (const [unitIndex, unit] of units.entries()) {
    const insertions = operationsByInsertIndex.get(unitIndex) ?? [];
    for (const operation of insertions) {
      output.push(makeRelationProjectionUnit(tokens, operation));
    }
    output.push(unit);
  }
  return output;
}

function projectionEdgeAttachment(
  units: readonly TranslationUnit[],
  projectedUnitIndexes: readonly number[],
): { readonly attachLeft?: boolean; readonly attachRight?: boolean } {
  const first = units[projectedUnitIndexes[0] ?? -1];
  const last = units[projectedUnitIndexes[projectedUnitIndexes.length - 1] ?? -1];
  return {
    ...(first?.attachLeft === true ? { attachLeft: true } : {}),
    ...(last?.attachRight === true ? { attachRight: true } : {}),
  };
}

function makeRelationProjectionUnit(
  tokens: readonly RuntimeHaruToken[],
  operation: RelationRenderOperation,
): TranslationUnit {
  const tokenIndexes = operation.projectionTokenIndexes;
  const firstTokenIndex = operation.projectionHeadTokenIndex ??
    tokenIndexes[0] ??
    operation.relation.markerSpans[0]?.start ??
    0;
  const head = tokens[firstTokenIndex];
  if (head === undefined) {
    throw new Error("cannot build clause relation projection unit without source token");
  }
  return new TranslationUnit({
    jpIndices: tokenIndexes,
    sourceSpan: sourceSpanForTokenIndexes(tokens, tokenIndexes),
    sourceRawSurface: [...tokenIndexes].sort((left, right) => left - right).map((index) => tokens[index]?.surface ?? "").join(""),
    jpHead: head,
    jpPos: (head.pos & POS0),
    koreanBase: "",
    korean: "",
    koreanPos: 구,
    entry: null,
    renderPlan: operation.renderPlan,
    unitType: UnitType.CONTENT,
    attachLeft: operation.attachLeft ?? false,
    attachRight: operation.attachRight ?? false,
    provenance: "structural_relation_owner" satisfies TranslationUnitProvenance,
    provenanceReason: `relation:${operation.relation.kind}`,
  });
}

function sourceSpanForStructuralTokenSpan(
  tokens: readonly RuntimeHaruToken[],
  span: StructuralRelationTokenSpan,
): SourceTokenSpan | null {
  const indexes: number[] = [];
  for (let index = Math.max(0, span.start); index < Math.min(tokens.length, span.endExclusive); index += 1) {
    indexes.push(index);
  }
  return sourceSpanForTokenIndexes(tokens, indexes);
}

function unitIndexesInSpan(
  units: readonly TranslationUnit[],
  span: StructuralRelationTokenSpan,
): readonly number[] {
  const indexes: number[] = [];
  for (const [unitIndex, unit] of units.entries()) {
    if (unit.jpIndices.some((jpIndex) => span.start <= jpIndex && jpIndex < span.endExclusive)) {
      indexes.push(unitIndex);
    }
  }
  return indexes;
}

function unitFullyCoveredBySpans(
  unit: TranslationUnit,
  spans: readonly StructuralRelationTokenSpan[],
): boolean {
  return unit.jpIndices.length > 0 && unit.jpIndices.every((jpIndex) => (
    spans.some((span) => span.start <= jpIndex && jpIndex < span.endExclusive)
  ));
}

function relationSourceStart(_graph: StructuralRelationGraph, relation: StructuralRelation): number {
  return relation.source.span.start;
}

function uniqueSorted(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function projectUnitHeadTailConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  },
  sourceOverride: OpSource | null = null,
  suppressNodaOwnedByRelation = false,
  quoteOwnerSource: OpSource | null = null,
): PredicateHeadTailChainRenderPlan | null {
  const plan = unit.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  return projectHeadTailConnectivePlan(
    plan,
    connective,
    sourceOverride,
    suppressNodaOwnedByRelation,
    quoteOwnerSource,
  );
}

function projectHeadTailConnectivePlan(
  plan: PredicateHeadTailChainRenderPlan,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  },
  sourceOverride: OpSource | null = null,
  suppressNodaOwnedByRelation = false,
  quoteOwnerSource: OpSource | null = null,
  connectiveProjection: "replace_last" | "append" = "replace_last",
): PredicateHeadTailChainRenderPlan | null {
  if (plan.realization.root.tail.kind !== "auxLayer") return null;
  const layer = plan.realization.root.tail;
  const source = sourceOverride ?? [...layer.ops].reverse().find((op): op is ConnectiveOp => op.kind === "connective")?.source ?? layer.stem.source;
  const suppressQuestionSfp = shouldProjectQuestionSfp(plan.realization.root, connective, source);
  const suppressNominalizedQuestionSfp = suppressQuestionSfp && isNominalizedQuestionSurface(connective.surface);
  const baseOps = layer.ops.filter((op) => {
    if (
      quoteOwnerSource !== null &&
      op.kind === "predicateQuoteCarrier" &&
      opSourceCoveredBy(op.source, quoteOwnerSource)
    ) {
      return false;
    }
    return !(suppressNominalizedQuestionSfp || suppressNodaOwnedByRelation) || !(
      op.kind === "modal" &&
      op.modal === "noda" &&
      (suppressNodaOwnedByRelation || opSourceCoveredBy(op.source, source))
    );
  });
  const replacement = buildStructuralProjectionConnectiveOp(source, connective);
  const projectedOps = connectiveProjection === "append"
    ? [...baseOps, replacement]
    : replaceLastConnectiveOp(baseOps, replacement);
  const projectedLayer: AuxLayerNode = {
    ...layer,
    ops: projectedOps,
    terminal: null,
  };
  const projectedRoot = {
    ...plan.realization.root,
    tail: projectedLayer,
    ...(suppressQuestionSfp ? { sfp: null } : {}),
  };
  const projectedBoundary = connectiveBoundaryForProjection(plan, connective, source);
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  const { partial: _partial, ...realizationWithoutPartial } = plan.realization;
  const projectedPlan: PredicateHeadTailChainRenderPlan = {
    ...planWithoutOriginalSourceCandidate,
    clauseRole: { ...plan.clauseRole, outgoingBoundary: projectedBoundary },
    realization: {
      ...realizationWithoutPartial,
      root: projectedRoot,
      warnings: resolvedStructuralProjectionWarnings(plan.realization.warnings),
    },
  };
  return projectedPlan;
}

function resolvedStructuralProjectionWarnings(
  warnings: PredicateHeadTailChainRenderPlan["realization"]["warnings"],
): PredicateHeadTailChainRenderPlan["realization"]["warnings"] {
  return warnings.filter((warning) =>
    warning.type !== "partial_tail_suffix_unresolved" &&
    warning.type !== "tail_boundary_attachment_weak"
  );
}

function projectUnitPredicateConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
  },
  sourceOverride: OpSource | null = null,
): PredicateHeadTailChainRenderPlan | LemmaRealization | null {
  return projectUnitHeadTailConnectivePlan(unit, connective, sourceOverride) ??
    projectUnitLemmaConnectivePlan(unit, connective);
}

export function buildStructuralProjectionConnectiveOp(
  source: OpSource,
  projection: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
    readonly quotativeMood?: "declarative" | "imperative";
  }
): ConnectiveOp {
  return createConnectiveOp({
    connective: projection.connective,
    surface: projection.surface,
    source,
    ...(projection.quotativeMood === undefined ? {} : { quotativeMood: projection.quotativeMood })
  });
}

function projectUnitLemmaConnectivePlan(
  unit: TranslationUnit,
  connective: {
    readonly connective: ConnectiveKind;
    readonly surface: string;
  },
): LemmaRealization | null {
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma") {
    return null;
  }
  if (connective.connective === "stative_hold") {
    return projectUnitLemmaStativeHoldPlan(plan);
  }
  if (connective.connective !== "sequence_immediate") {
    return null;
  }
  if (plan.koreanPos !== 동사 && plan.koreanPos !== 형용사) {
    return null;
  }
  if (plan.sfp !== undefined && plan.sfp !== null) {
    return null;
  }
  if (plan.suffix !== undefined) {
    return null;
  }
  return {
    ...plan,
    connective: "자",
    suffix: "마자",
    sfp: null,
  };
}

function projectUnitLemmaStativeHoldPlan(plan: LemmaRealization): LemmaRealization | null {
  if (plan.koreanPos !== 동사) {
    return null;
  }
  if (plan.sfp !== undefined && plan.sfp !== null) {
    return null;
  }
  if (plan.suffix !== undefined || (plan.negationChainDepth ?? 0) !== 0) {
    return null;
  }
  if (plan.auxTokens.length === 0 || !plan.auxTokens.every((token) => (token.pos & POS4) === 助動詞_タ)) {
    return null;
  }
  return {
    ...plan,
    auxTokens: [],
    connective: "ㄴ/은",
    suffix: " 채",
    sfp: null,
  };
}

function shouldProjectQuestionSfp(
  root: PredicateHeadTailChainRenderPlan["realization"]["root"],
  connective: { readonly connective: ConnectiveKind; readonly surface: string },
  source: OpSource,
): boolean {
  if (connective.connective !== "question_content" || root.sfp === null) {
    return false;
  }
  if (root.sfp.effect === "ka") {
    return opSourceCoveredBy(root.sfp.source, source);
  }
  if (root.sfp.effect === "kana") {
    return opSourceOverlaps(root.sfp.source, source);
  }
  return false;
}

function opSourceOverlaps(candidate: OpSource, other: OpSource): boolean {
  const otherIndices = new Set(other.tokenIndices);
  return candidate.tokenIndices.some((tokenIndex) => otherIndices.has(tokenIndex));
}

function isNominalizedQuestionSurface(surface: string): boolean {
  return surface.includes("の") || surface.includes("ん");
}

function opSourceCoveredBy(candidate: OpSource, covering: OpSource): boolean {
  const coveringIndices = new Set(covering.tokenIndices);
  return candidate.tokenIndices.length > 0 && candidate.tokenIndices.every((tokenIndex) => coveringIndices.has(tokenIndex));
}

function connectiveBoundaryForProjection(
  plan: PredicateHeadTailChainRenderPlan,
  connective: { readonly connective: ConnectiveKind; readonly surface: string },
  source: OpSource,
): PredicateHeadTailChainRenderPlan["clauseRole"]["outgoingBoundary"] {
  const sortedIndices = [...source.tokenIndices].sort((left, right) => left - right);
  const start = sortedIndices[0] ?? plan.clauseRole.tokenSpan.end;
  const end = sortedIndices[sortedIndices.length - 1] ?? start;
  return {
    kind: "接続助詞",
    connectiveKind: connective.connective,
    surface: connective.surface,
    tokenIdx: end,
    tokenSpan: { start, end },
  };
}

function projectUnitAttributivePlan(
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): RenderPlan | null {
  const plan = unit.renderPlan;
  if (plan === null) {
    return null;
  }
  if (plan.kind === "attributive") {
    return plan;
  }
  if (plan.kind === "lemma") {
    return projectLemmaAttributivePlan(plan, unit, headNounToken, options);
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return projectPredicateHeadTailAttributivePlan(plan);
  }
  return null;
}

function projectLemmaAttributivePlan(
  plan: LemmaRealization,
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): AttributiveRealization | null {
  if (plan.prefix !== undefined && typeof plan.prefix !== "string") {
    return null;
  }
  const plainVerbEnding = plainVerbAttributiveEndingForProjection(plan, unit, headNounToken, options);
  return {
    kind: "attributive",
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    auxTokens: plan.auxTokens,
    contentToken: unit.jpHead,
    ...(plan.prefix === undefined ? {} : { prefix: plan.prefix }),
    ...(plan.sahenNoun === undefined ? {} : { sahenNoun: plan.sahenNoun }),
    ...(headNounToken === null ? {} : { headNounToken }),
    ...(plainVerbEnding === null ? {} : { plainVerbEnding }),
    ...(plan.voice === undefined ? {} : { voice: plan.voice }),
    ...(plan.passiveClass === undefined ? {} : { passiveClass: plan.passiveClass }),
    ...(isRenyouLemmaProjectionHost(unit.jpHead) ? { tailLemmaMode: true } : {}),
    ...(plan.teIruContractToPast === undefined ? {} : { teIruContractToPast: plan.teIruContractToPast }),
  };
}

function isRenyouLemmaProjectionHost(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
}

function plainVerbAttributiveEndingForProjection(
  plan: LemmaRealization,
  unit: TranslationUnit,
  headNounToken: RuntimeHaruToken | null,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
): string | null {
  if (plan.koreanPos !== 동사 || plan.auxTokens.length !== 0) {
    return null;
  }
  const contentIdx = unit.jpIndices[0] ?? null;
  if (contentIdx === null) {
    return null;
  }
  return selectPlainVerbAttributiveEnding(plan.koreanLemma, unit.jpHead, headNounToken, {
    tokens: options.tokens,
    contentIdx,
    lookups: options.lookups,
  });
}

export function projectPredicateHeadTailAttributivePlan(
  plan: PredicateHeadTailChainRenderPlan,
): PredicateHeadTailChainRenderPlan | null {
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  if (plan.realization.root.tail.ops.some((op) => op.kind === "connective")) {
    return null;
  }
  if (plan.realization.root.tail.terminal === "attributive") {
    return plan;
  }
  const sfp = plan.realization.root.sfp;
  const projectedRoot = {
    ...plan.realization.root,
    ...(sfp !== null && sfp.source.tokenIndices.length === 0 ? { sfp: null } : {}),
    tail: {
      ...plan.realization.root.tail,
      terminal: "attributive" as const,
    },
  };
  const {
    headTailCandidate: _headTailCandidate,
    headTailSourceCandidate: _headTailSourceCandidate,
    ...planWithoutOriginalSourceCandidate
  } = plan;
  return {
    ...planWithoutOriginalSourceCandidate,
    realization: { ...plan.realization, root: projectedRoot },
  };
}

function targetHeadToken(
  tokens: readonly RuntimeHaruToken[],
  relation: StructuralRelation,
): RuntimeHaruToken | null {
  if (relation.target?.kind !== "noun_phrase") {
    return null;
  }
  const headIdx = relation.target.headIdx;
  if (headIdx === null) {
    return null;
  }
  return tokens[headIdx] ?? null;
}

function opSourceForMarkerSpans(
  tokens: readonly RuntimeHaruToken[],
  markerSpans: readonly StructuralRelation["markerSpans"][number][],
): OpSource | null {
  const tokenIndices = uniqueSorted(markerSpans.flatMap((span) => {
    const indexes: number[] = [];
    for (let idx = span.start; idx < span.endExclusive; idx += 1) {
      indexes.push(idx);
    }
    return indexes;
  }));
  if (tokenIndices.length === 0) {
    return null;
  }
  const sourceTokens = tokenIndices.map((index) => tokens[index]);
  if (sourceTokens.some((token) => token === undefined)) {
    return null;
  }
  return {
    tokens: sourceTokens as RuntimeHaruToken[],
    tokenIndices,
  };
}

function replaceLastConnectiveOp(
  ops: readonly AuxLayerNode["ops"][number][],
  replacement: ConnectiveOp,
): readonly AuxLayerNode["ops"][number][] {
  const projected = [...ops];
  for (let index = projected.length - 1; index >= 0; index -= 1) {
    if (projected[index]?.kind === "connective") {
      projected[index] = replacement;
      return projected;
    }
  }
  return [...projected, replacement];
}

function projectUnitPurposeAttributivePlan(unit: TranslationUnit): NominalHeadTailChainPlan | null {
  const plan = unit.renderPlan;
  if (!isNominalHeadTailChainRenderPlan(plan)) {
    return null;
  }
  return {
    ...plan,
    realization: { ...plan.realization, projection: { kind: "purpose_attributive" } }
  };
}
