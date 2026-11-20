
import { isUnitSymbolSurface } from "../../generator/korean-reading.js";
import type {
  ProjectionConfidence,
  SourceInternalBoundaryTarget,
  TargetSegment,
  TargetSegmentKind
} from "../../types/projection.js";
import { FunctionalKind, type TranslationUnit, UnitType } from "../translation/unit.js";

function targetSegmentKindForUnit(unit: TranslationUnit): TargetSegmentKind {
  if (unit.unitType === UnitType.SYMBOL) {
    return "punctuation";
  }
  if (unit.unitType === UnitType.FUNCTIONAL) {
    return unit.functionalKind === FunctionalKind.PARTICLE || unit.allomorphKey !== null || unit.particleRole !== null
      ? "particle"
      : "connective";
  }
  if (unit.unitType === UnitType.NUMERAL) {
    return "lexeme";
  }
  if (unit.renderPlan?.kind === "legacySurfaceComposition" || unit.provenance === "fallback" || unit.provenance === "legacy_tail") {
    return "fallback";
  }
  if (unit.renderPlan?.kind === "headTailChain") {
    return "modal";
  }
  return "lexeme";
}

function projectionConfidenceForUnit(unit: TranslationUnit): ProjectionConfidence {
  if (unit.provenance === "legacy_tail" || unit.provenance === "fallback") {
    return "fallback";
  }
  if (unit.renderPlan === null) {
    return "semantic";
  }
  return "owner";
}

export function targetSegmentForUnit(
  unit: TranslationUnit,
  text: string,
  options: { readonly allomorphSourceSpan?: TargetSegment["allomorphSourceSpan"] } = {}
): TargetSegment {
  const sourceSpan = unit.sourceSpan;
  const sourceInternalBoundaryTargets = sourceInternalBoundaryTargetsForUnit(unit);
  const symbolIsTransparent = unit.unitType === UnitType.SYMBOL && !isUnitSymbolSurface(text);
  const anchorsAllomorph = !symbolIsTransparent && sourceSpan !== null && unit.allomorphKey === null;
  return {
    text,
    sourceSpan,
    boundaryBefore: sourceSpan === null ? null : {
      beforeOrdinal: sourceSpan.startOrdinal - 1 >= 0 ? sourceSpan.startOrdinal - 1 : null,
      afterOrdinal: sourceSpan.startOrdinal
    },
    boundaryAfter: sourceSpan === null ? null : {
      beforeOrdinal: sourceSpan.endOrdinal - 1,
      afterOrdinal: sourceSpan.endOrdinal
    },
    unit,
    renderPlanKind: unit.renderPlan?.kind ?? null,
    kind: targetSegmentKindForUnit(unit),
    attachLeft: unit.attachLeft,
    attachRight: unit.attachRight,
    transparentForAllomorph: symbolIsTransparent,
    ...(symbolIsTransparent
      ? { allomorphRole: "transparent" as const }
      : anchorsAllomorph
        ? { allomorphRole: "source_anchor" as const }
        : {}),
    ...(options.allomorphSourceSpan === undefined ? {} : {
      allomorphSourceSpan: options.allomorphSourceSpan
    }),
    ...(sourceInternalBoundaryTargets.length === 0 ? {} : { sourceInternalBoundaryTargets }),
    projectionConfidence: projectionConfidenceForUnit(unit)
  };
}

function sourceInternalBoundaryTargetsForUnit(unit: TranslationUnit): readonly SourceInternalBoundaryTarget[] {
  const boundaries = unit.jpHead.sourceCompoundProjectionBoundaries ?? [];
  if (boundaries.length === 0) {
    return [];
  }
  return boundaries.map((boundary) => ({
    sourceBoundary: boundary.sourceBoundary,
    ...(boundary.leftTargetText === undefined ? {} : { leftTargetText: boundary.leftTargetText }),
    ...(boundary.rightTargetText === undefined ? {} : { rightTargetText: boundary.rightTargetText }),
    ...(boundary.leftSplitTargetText === undefined ? {} : { leftSplitTargetText: boundary.leftSplitTargetText }),
    ...(boundary.rightSplitTargetText === undefined ? {} : { rightSplitTargetText: boundary.rightSplitTargetText })
  }));
}

export function attachSourceInternalBoundaryTargetsToTargetSegments(
  segments: readonly TargetSegment[],
  unit: TranslationUnit
): TargetSegment[] {
  const sourceInternalBoundaryTargets = sourceInternalBoundaryTargetsForUnit(unit);
  if (sourceInternalBoundaryTargets.length === 0) {
    return [...segments];
  }
  return segments.map((segment) => {
    if (segment.unit !== unit) {
      return segment;
    }
    return {
      ...segment,
      sourceInternalBoundaryTargets
    };
  });
}

export function interUnitSpaceSegment(): TargetSegment {
  return {
    text: " ",
    sourceSpan: null,
    boundaryBefore: null,
    boundaryAfter: null,
    unit: null,
    renderPlanKind: null,
    kind: "punctuation",
    attachLeft: false,
    attachRight: false,
    transparentForAllomorph: true,
    allomorphRole: "transparent",
    projectionConfidence: "exact"
  };
}

export function lastOutputSegmentIndex(segments: readonly TargetSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== undefined && segment.text.length > 0 && !/^\s+$/u.test(segment.text)) {
      return index;
    }
  }
  return -1;
}

export function lastOutputSegmentText(segments: readonly TargetSegment[]): string {
  const index = lastOutputSegmentIndex(segments);
  return index < 0 ? "" : segments[index]?.text ?? "";
}

export function replaceLastUnitSegmentText(
  segments: TargetSegment[],
  unit: TranslationUnit,
  text: string
): void {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment?.unit !== unit) {
      continue;
    }
    segments[index] = { ...segment, text };
    return;
  }
}

export function markConsumedWordBoundaryOnLastSegment(segments: TargetSegment[]): void {
  const index = lastOutputSegmentIndex(segments);
  const segment = index < 0 ? undefined : segments[index];
  if (segment === undefined) {
    return;
  }
  segments[index] = { ...segment, consumedWordBoundaryAfter: true };
}

export function removeTrailingQuestionFromLastSegment(segments: TargetSegment[]): void {
  const index = lastOutputSegmentIndex(segments);
  const segment = index < 0 ? undefined : segments[index];
  if (segment === undefined || !segment.text.endsWith("?")) {
    return;
  }
  segments[index] = { ...segment, text: segment.text.slice(0, -1) };
}

export function preserveOutputTextInTargetSegments(
  segments: readonly TargetSegment[],
  expectedText: string
): TargetSegment[] {
  const actualText = segments.map(segment => segment.text).join("");
  if (actualText === expectedText) {
    return [...segments];
  }
  if (segments.length === 1) {
    const segment = segments[0];
    return segment === undefined ? [] : [{ ...segment, text: expectedText }];
  }
  const first = segments[0];
  if (first === undefined) {
    return [];
  }
  return [{
    ...first,
    text: expectedText,
    projectionConfidence: "fallback"
  }];
}
