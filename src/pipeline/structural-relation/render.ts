import type { RuntimeHaruToken } from "../../types/token.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { lazyValue } from "../../data-loader.js";
import { loadConnectiveSurfaceEntries } from "../head-tail/tail/predicate-root/connective-surface-table.js";
import { realizeRenderPlan } from "../rendering/render-plan.js";
import { TranslationUnit, UnitType, type TranslationUnitProvenance } from "../translation/unit.js";
import { projectionUnavailable, relationConflict } from "./diagnostics.js";
import type { StructuralRelation, StructuralRelationDiagnostic, StructuralRelationGraph, StructuralRelationTokenSpan } from "./types.js";

import { POS0, 구 } from "../../types/pos.js";
import { sourceSpanForTokenIndexes } from "../source-coordinate.js";
import { type RelationRenderOperation, projectionEdgeAttachment, unitIndexesInSpan, unitFullyCoveredBySpans, uniqueSorted, opSourceForMarkerSpans } from "./render-unit-spans.js";
import { buildBareKaQuestionContentStructuredRenderOperation, buildKaParallelStructuredRenderOperation, buildEmbeddedQuestionAttributiveQuoteStructuredRenderOperation, buildNariParallelStructuredRenderOperation, buildTokaNominalListingStructuredRenderOperation } from "./render-parallel.js";
import { buildConjectureQuoteStructuredRenderOperation, buildAttributiveTypificationQuoteStructuredRenderOperation, buildMarkerAbsorbedContentCopulaRenderOperation, buildSfpQuoteStructuredRenderOperation, buildConditionalWishQuoteStructuredRenderOperation, buildConditionalThoughtQuoteMarkerStructuredRenderOperation, buildConditionalReportQuoteStructuredRenderOperation, buildPredicateBoundTameQuoteStructuredRenderOperation } from "./render-quote.js";
import { buildReasonCopulaQuoteStructuredRenderOperation, buildReasonCopulaExplanationStructuredRenderOperation } from "./render-reason-copula.js";
import { buildPunctuatedAttributiveStructuredRenderOperation, buildPurposeModifierStructuredRenderOperation } from "./render-attributive.js";
import { buildNominalConcessionStructuredRenderOperation, buildCorrelativeDegreeStructuredRenderOperation, sourcePredicateProjectionCandidateUnitIndexes, sourcePredicateConnectiveProjection } from "./render-clause-connective.js";
import { projectUnitPredicateConnectivePlan } from "./render-connective-plan.js";
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

function relationSourceStart(_graph: StructuralRelationGraph, relation: StructuralRelation): number {
  return relation.source.span.start;
}
