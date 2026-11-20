import type { RuntimeHaruToken, SourceTokenSpan } from "../../types/token.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { OpSource } from "../head-tail/tail/predicate-root/grammar.js";
import type { TranslationUnit } from "../translation/unit.js";
import type { StructuralRelation, StructuralRelationTokenSpan } from "./types.js";
import { sourceSpanForTokenIndexes } from "../source-coordinate.js";

export interface RelationRenderOperation {
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

export function sourceUnitIndexesWithToken(
  units: readonly TranslationUnit[],
  sourceUnitIndexes: readonly number[],
  tokenIdx: number,
): readonly number[] {
  return sourceUnitIndexes.filter((unitIndex) => units[unitIndex]?.jpIndices.includes(tokenIdx) === true);
}

export function previousNonSpaceTokenIndex(tokens: readonly RuntimeHaruToken[], start: number): number | null {
  for (let index = Math.min(start - 1, tokens.length - 1); index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    return index;
  }
  return null;
}

export function relationSourcePredicateIdx(relation: StructuralRelation): number | null {
  return relation.source.kind === "predicate"
    ? relation.source.predicateIdx
    : relation.source.kind === "clause"
      ? relation.source.predicateIdx
      : null;
}

export function projectionEdgeAttachment(
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

export function sourceSpanForStructuralTokenSpan(
  tokens: readonly RuntimeHaruToken[],
  span: StructuralRelationTokenSpan,
): SourceTokenSpan | null {
  const indexes: number[] = [];
  for (let index = Math.max(0, span.start); index < Math.min(tokens.length, span.endExclusive); index += 1) {
    indexes.push(index);
  }
  return sourceSpanForTokenIndexes(tokens, indexes);
}

export function unitIndexesInSpan(
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

export function unitFullyCoveredBySpans(
  unit: TranslationUnit,
  spans: readonly StructuralRelationTokenSpan[],
): boolean {
  return unit.jpIndices.length > 0 && unit.jpIndices.every((jpIndex) => (
    spans.some((span) => span.start <= jpIndex && jpIndex < span.endExclusive)
  ));
}

export function uniqueSorted(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function opSourceForMarkerSpans(
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
