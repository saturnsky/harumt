import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ConnectiveKind } from "../head-tail/tail/predicate-root/grammar.js";
import { type TranslationUnit, UnitType } from "../translation/unit.js";
import type { StructuralRelation } from "./types.js";
import { 구 } from "../../types/pos.js";
import { type RelationRenderOperation, relationSourcePredicateIdx, projectionEdgeAttachment, uniqueSorted, opSourceForMarkerSpans } from "./render-unit-spans.js";
import { composeRelationSourceUnitPlans } from "./render-source-sequence.js";
import { projectUnitHeadTailConnectivePlan } from "./render-connective-plan.js";

export function buildNominalConcessionStructuredRenderOperation(options: {
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

export function buildCorrelativeDegreeStructuredRenderOperation(options: {
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

export function sourcePredicateProjectionCandidateUnitIndexes(
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

export function sourcePredicateConnectiveProjection(
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
