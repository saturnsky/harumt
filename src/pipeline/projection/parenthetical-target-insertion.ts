
import { POS0, 名詞 } from "../../types/pos.js";
import type { ProjectionConfidence, TargetSegment } from "../../types/projection.js";
import type { RuntimeHaruToken, SourceTokenBoundary, SourceTokenSpan } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import type { EnclosingDelimiterKind } from "../clause-layout/layout-types.js";
import { codepointLength } from "../source-coordinate.js";
import { sourceBoundaryAfterSourceSpan, sourceBoundaryBeforeSourceSpan } from "./parenthetical-source-boundary.js";
import type { ParentheticalIsland, ParentheticalProportionalProjection } from "./prepared-translation.js";

interface ParentheticalInternalInsertionResult {
  readonly inserted: boolean;
  readonly warning?: Warning;
}

export function insertParentheticalIntoInternalTargetBoundary(
  segments: TargetSegment[],
  island: ParentheticalIsland,
  innerSegments: readonly TargetSegment[],
  sourceTokens: readonly RuntimeHaruToken[]
): ParentheticalInternalInsertionResult {
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const boundaryTarget = (segment.sourceInternalBoundaryTargets ?? []).find((target) =>
      sourceBoundaryEquals(target.sourceBoundary, island.sourceBoundary)
    );
    if (boundaryTarget === undefined || segment.sourceSpan === null) {
      continue;
    }
    const targetOffset = targetOffsetForInternalBoundary(segment.text, boundaryTarget);
    if (targetOffset === null) {
      const splitSegments = splitTargetSegmentAtIndependentParentheticalBoundary(
        segment,
        boundaryTarget,
        island
      );
      if (splitSegments !== null) {
        segments.splice(
          index,
          1,
          ...splitSegments.left,
          ...parentheticalTargetSegments(island, innerSegments, "fallback"),
          ...splitSegments.right
        );
        return { inserted: true };
      }
      continue;
    }
    const splitSegments = splitTargetSegmentAtParentheticalBoundary(segment, targetOffset, island);
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "exact"),
      ...splitSegments.right
    );
    return { inserted: true };
  }
  for (let index = 0; index < segments.length; index += 1) {
    const splitSegments = splitKoreanSahenLightVerbAtParentheticalBoundary(
      segments,
      index,
      island
    );
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "fallback"),
      ...splitSegments.right
    );
    return { inserted: true };
  }
  if (island.pause !== undefined && island.proportionalProjection === undefined) {
    return { inserted: false };
  }
  if (
    hasExactSemanticRightBoundaryForParenthetical(segments, island) &&
    !hasProportionalProjectionTargetSegment(segments, island, sourceTokens)
  ) {
    return { inserted: false };
  }
  for (let index = 0; index < segments.length; index += 1) {
    const splitSegments = splitTargetSegmentAtProportionalParentheticalBoundary(
      segments[index],
      island,
      sourceTokens
    );
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "fallback"),
      ...splitSegments.right
    );
    return {
      inserted: true,
      warning: parentheticalProjectionFallbackWarning(island)
    };
  }
  return { inserted: false };
}

function buildParentheticalSplitSegments(
  segment: TargetSegment,
  leftText: string,
  rightText: string,
  sourceSpan: SourceTokenSpan,
  island: ParentheticalIsland,
  extraFields?: Partial<TargetSegment>
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const leftSourceSpan: SourceTokenSpan = {
    startOrdinal: sourceSpan.startOrdinal,
    endOrdinal: island.sourceSpan.startOrdinal
  };
  const rightSourceSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.endOrdinal,
    endOrdinal: sourceSpan.endOrdinal
  };
  if (
    leftSourceSpan.endOrdinal <= leftSourceSpan.startOrdinal ||
    rightSourceSpan.endOrdinal <= rightSourceSpan.startOrdinal
  ) {
    return null;
  }
  const leftSegment: TargetSegment = {
    ...segment,
    text: leftText,
    sourceSpan: leftSourceSpan,
    boundaryBefore: sourceBoundaryBeforeSourceSpan(leftSourceSpan),
    boundaryAfter: sourceBoundaryAfterSourceSpan(leftSourceSpan),
    attachRight: true,
    sourceInternalBoundaryTargets: [],
    ...extraFields
  };
  const rightSegment: TargetSegment = {
    ...segment,
    text: rightText,
    sourceSpan: rightSourceSpan,
    boundaryBefore: sourceBoundaryBeforeSourceSpan(rightSourceSpan),
    boundaryAfter: sourceBoundaryAfterSourceSpan(rightSourceSpan),
    attachLeft: true,
    sourceInternalBoundaryTargets: [],
    ...extraFields
  };
  return { left: [leftSegment], right: [rightSegment] };
}

function splitTargetSegmentAtIndependentParentheticalBoundary(
  segment: TargetSegment,
  boundaryTarget: NonNullable<TargetSegment["sourceInternalBoundaryTargets"]>[number],
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment.sourceSpan;
  const leftText = boundaryTarget.leftSplitTargetText;
  const rightText = boundaryTarget.rightSplitTargetText;
  if (
    sourceSpan === null ||
    leftText === undefined ||
    rightText === undefined ||
    leftText.length === 0 ||
    rightText.length === 0
  ) {
    return null;
  }
  return buildParentheticalSplitSegments(segment, leftText, rightText, sourceSpan, island, { projectionConfidence: "fallback" });
}

function hasProportionalProjectionTargetSegment(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): boolean {
  const insertion = targetInsertionForParenthetical(segments, island);
  const exactRight = insertion.confidence === "exact" ? segments[insertion.index] : undefined;
  if (exactRight !== undefined && isSemanticParentheticalRightSegment(exactRight)) {
    const projection = island.proportionalProjection;
    const rightSourceSpan = exactRight.sourceSpan;
    const projectionToken = projection === undefined
      ? undefined
      : sourceTokens.find((token) =>
        token.sourceSpan !== undefined &&
        token.sourceSpan !== null &&
        sourceSpanEquals(token.sourceSpan, projection.sourceSpan)
      );
    return projection !== undefined &&
      projectionToken !== undefined &&
      (projectionToken.pos & POS0) === 名詞 &&
      rightSourceSpan !== null &&
      rightSourceSpan.startOrdinal === projection.sourceSpan.startOrdinal &&
      sourceSpanContains(rightSourceSpan, projection.sourceSpan) &&
      splitTargetSegmentAtProportionalParentheticalBoundary(exactRight, island, sourceTokens) !== null;
  }
  return segments.some((segment) =>
    splitTargetSegmentAtProportionalParentheticalBoundary(segment, island, sourceTokens) !== null
  );
}

function hasExactSemanticRightBoundaryForParenthetical(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland
): boolean {
  const insertion = targetInsertionForParenthetical(segments, island);
  if (insertion.confidence !== "exact") {
    return false;
  }
  const next = segments[insertion.index];
  return next !== undefined && isSemanticParentheticalRightSegment(next);
}

function isSemanticParentheticalRightSegment(segment: TargetSegment): boolean {
  return segment.text.trim().length > 0 &&
    segment.kind !== "punctuation" &&
    segment.kind !== "quote" &&
    segment.kind !== "parenthetical" &&
    segment.kind !== "annotation";
}

function targetOffsetForInternalBoundary(
  text: string,
  boundaryTarget: NonNullable<TargetSegment["sourceInternalBoundaryTargets"]>[number]
): number | null {
  const leftOffset = boundaryTarget.leftTargetText !== undefined && boundaryTarget.leftTargetText.length > 0 && text.startsWith(boundaryTarget.leftTargetText)
    ? boundaryTarget.leftTargetText.length
    : null;
  const rightOffset = boundaryTarget.rightTargetText !== undefined && boundaryTarget.rightTargetText.length > 0 && text.endsWith(boundaryTarget.rightTargetText)
    ? text.length - boundaryTarget.rightTargetText.length
    : null;
  const offset = leftOffset !== null && rightOffset !== null
    ? leftOffset === rightOffset ? leftOffset : null
    : leftOffset ?? rightOffset;
  return offset !== null && offset > 0 && offset < text.length ? offset : null;
}

function splitTargetSegmentAtParentheticalBoundary(
  segment: TargetSegment,
  targetOffset: number,
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment.sourceSpan;
  if (sourceSpan === null) {
    return null;
  }
  const leftText = segment.text.slice(0, targetOffset);
  const rightText = segment.text.slice(targetOffset);
  if (leftText.length === 0 || rightText.length === 0) {
    return null;
  }
  return buildParentheticalSplitSegments(segment, leftText, rightText, sourceSpan, island);
}

function splitKoreanSahenLightVerbAtParentheticalBoundary(
  segments: readonly TargetSegment[],
  index: number,
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const segment = segments[index];
  const next = segments[index + 1];
  const sourceSpan = segment?.sourceSpan ?? null;
  if (
    segment === undefined ||
    sourceSpan === null ||
    next === undefined ||
    island.sourceBoundary.afterOrdinal === null ||
    sourceSpan.startOrdinal >= island.sourceBoundary.afterOrdinal ||
    sourceSpan.endOrdinal <= island.sourceSpan.endOrdinal ||
    !segment.text.endsWith("하") ||
    !isHeadTailConnectiveSegment(next)
  ) {
    return null;
  }
  const leftText = segment.text.slice(0, -1);
  if (leftText.length === 0) {
    return null;
  }
  const leftSourceSpan: SourceTokenSpan = {
    startOrdinal: sourceSpan.startOrdinal,
    endOrdinal: island.sourceBoundary.afterOrdinal
  };
  const rightSourceSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.endOrdinal,
    endOrdinal: sourceSpan.endOrdinal
  };
  if (
    leftSourceSpan.endOrdinal <= leftSourceSpan.startOrdinal ||
    rightSourceSpan.endOrdinal <= rightSourceSpan.startOrdinal
  ) {
    return null;
  }
  return {
    left: [{
      ...segment,
      text: leftText,
      sourceSpan: leftSourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(leftSourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(leftSourceSpan),
      sourceInternalBoundaryTargets: []
    }],
    right: [{
      ...segment,
      text: "하",
      sourceSpan: rightSourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(rightSourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(rightSourceSpan),
      attachLeft: true,
      sourceInternalBoundaryTargets: []
    }]
  };
}

function splitTargetSegmentAtProportionalParentheticalBoundary(
  segment: TargetSegment | undefined,
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment?.sourceSpan ?? null;
  const projection = sourceSpan === null
    ? null
    : island.proportionalProjection ?? proportionalProjectionForParentheticalSourceBoundary(
      sourceSpan,
      island,
      sourceTokens
    );
  if (
    segment === undefined ||
    sourceSpan === null ||
    projection === null ||
    segment.text.trim().length === 0 ||
    !sourceSpanContains(sourceSpan, projection.sourceSpan)
  ) {
    return null;
  }
  const sourcePosition = proportionalSourcePositionInSegmentSource(
    sourceSpan,
    projection,
    sourceTokens
  );
  if (sourcePosition === null) {
    return null;
  }
  const targetLength = codepointLength(segment.text);
  if (targetLength < 2) {
    return null;
  }
  const targetCodepointOffset = proportionalTargetCodepointOffset(
    sourcePosition.offset,
    sourcePosition.length,
    targetLength
  );
  if (targetCodepointOffset <= 0 || targetCodepointOffset >= targetLength) {
    return null;
  }
  const targetOffset = codeUnitOffsetForCodepointOffset(segment.text, targetCodepointOffset);
  const leftText = segment.text.slice(0, targetOffset);
  const rightText = segment.text.slice(targetOffset);
  if (leftText.length === 0 || rightText.length === 0) {
    return null;
  }
  return {
    left: [{
      ...segment,
      text: leftText,
      boundaryAfter: null,
      attachRight: true,
      projectionConfidence: "fallback",
      sourceInternalBoundaryTargets: []
    }],
    right: [{
      ...segment,
      text: rightText,
      boundaryBefore: null,
      attachLeft: true,
      projectionConfidence: "fallback",
      sourceInternalBoundaryTargets: []
    }]
  };
}

function proportionalProjectionForParentheticalSourceBoundary(
  segmentSourceSpan: SourceTokenSpan,
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): ParentheticalProportionalProjection | null {
  const afterOrdinal = island.sourceBoundary.afterOrdinal;
  if (
    afterOrdinal === null ||
    afterOrdinal <= segmentSourceSpan.startOrdinal ||
    afterOrdinal >= segmentSourceSpan.endOrdinal
  ) {
    return null;
  }
  let sourceOffset = 0;
  let sourceLength = 0;
  const sourceSurfaces: string[] = [];
  for (const token of sourceTokens) {
    const span = token.sourceSpan ?? null;
    if (span === null || !sourceSpanContains(segmentSourceSpan, span)) {
      continue;
    }
    const tokenLength = codepointLength(token.surface);
    if (span.endOrdinal <= afterOrdinal) {
      sourceOffset += tokenLength;
    } else if (span.startOrdinal < afterOrdinal) {
      return null;
    }
    sourceLength += tokenLength;
    sourceSurfaces.push(token.surface);
  }
  if (sourceLength <= 0 || sourceOffset <= 0 || sourceOffset >= sourceLength) {
    return null;
  }
  return {
    sourceSpan: segmentSourceSpan,
    sourceOffset,
    sourceLength,
    sourceSurface: sourceSurfaces.join("")
  };
}

function proportionalSourcePositionInSegmentSource(
  segmentSourceSpan: SourceTokenSpan,
  projection: ParentheticalProportionalProjection,
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly offset: number; readonly length: number } | null {
  let offset: number | null = null;
  let length = 0;
  for (const token of sourceTokens) {
    const tokenSpan = token.sourceSpan ?? null;
    if (tokenSpan === null || !sourceSpanContains(segmentSourceSpan, tokenSpan)) {
      continue;
    }
    if (sourceSpanEquals(tokenSpan, projection.sourceSpan)) {
      offset = length + projection.sourceOffset;
    }
    length += codepointLength(token.surface);
  }
  if (offset !== null && length > 0) {
    return { offset, length };
  }
  if (sourceSpanEquals(segmentSourceSpan, projection.sourceSpan)) {
    return { offset: projection.sourceOffset, length: projection.sourceLength };
  }
  return null;
}

function proportionalTargetCodepointOffset(
  sourceOffset: number,
  sourceLength: number,
  targetLength: number
): number {
  const rounded = Math.round((sourceOffset / sourceLength) * targetLength);
  if (rounded < 1) {
    return 1;
  }
  if (rounded >= targetLength) {
    return targetLength - 1;
  }
  return rounded;
}

function codeUnitOffsetForCodepointOffset(text: string, codepointOffset: number): number {
  return Array.from(text).slice(0, codepointOffset).join("").length;
}

function sourceSpanContains(outer: SourceTokenSpan, inner: SourceTokenSpan): boolean {
  return outer.startOrdinal <= inner.startOrdinal && outer.endOrdinal >= inner.endOrdinal;
}

function sourceSpanEquals(left: SourceTokenSpan, right: SourceTokenSpan): boolean {
  return left.startOrdinal === right.startOrdinal && left.endOrdinal === right.endOrdinal;
}

function parentheticalProjectionFallbackWarning(island: ParentheticalIsland): Warning {
  const projection = island.proportionalProjection;
  const sourceSurface = projection?.sourceSurface ?? "source span";
  return {
    type: "parenthetical_projection_fallback",
    severity: "warning",
    opKind: "parenthetical_proportional_projection",
    message: `parenthetical island was restored by proportional target placement inside ${sourceSurface}.`
  };
}

interface ParentheticalTargetInsertion {
  readonly index: number;
  readonly confidence: ProjectionConfidence;
}

function isRestoredParentheticalDelimiterSegment(segment: TargetSegment): boolean {
  return (segment.kind === "parenthetical" || segment.kind === "annotation") &&
    segment.renderPlanKind === null &&
    segment.unit === null;
}

export function parentheticalInsertionBeforeLaterRestoredIslands(
  segments: readonly TargetSegment[],
  index: number,
  island: ParentheticalIsland
): number {
  let result = index;
  while (result > 0) {
    const closing = segments[result - 1];
    if (
      closing === undefined ||
      !isRestoredParentheticalDelimiterSegment(closing) ||
      closing.attachLeft !== true
    ) {
      return result;
    }
    let depth = 0;
    let cursor = result - 1;
    for (; cursor >= 0; cursor -= 1) {
      const segment = segments[cursor]!;
      if (!isRestoredParentheticalDelimiterSegment(segment)) {
        continue;
      }
      if (segment.attachLeft === true) {
        depth += 1;
      } else if (segment.attachRight === true) {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    const opening = cursor >= 0 ? segments[cursor] : undefined;
    if (
      opening === undefined ||
      opening.sourceSpan === null ||
      opening.sourceSpan.startOrdinal < island.sourceSpan.endOrdinal
    ) {
      return result;
    }
    result = cursor;
  }
  return result;
}

export function targetInsertionForParenthetical(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland
): ParentheticalTargetInsertion {
  let exactAfterIndex: number | null = null;
  for (const [index, segment] of segments.entries()) {
    if (
      sourceBoundaryEquals(segment.boundaryAfter, island.sourceBoundary) &&
      segment.text.trim().length > 0 &&
      !isRestoredParentheticalDelimiterSegment(segment)
    ) {
      exactAfterIndex = index + 1;
    }
  }
  if (exactAfterIndex !== null) {
    return { index: exactAfterIndex, confidence: "exact" };
  }
  for (const [index, segment] of segments.entries()) {
    if (sourceBoundaryEquals(segment.boundaryBefore, island.sourceBoundary)) {
      return { index, confidence: "exact" };
    }
  }
  const afterOrdinal = island.sourceBoundary.afterOrdinal;
  if (afterOrdinal !== null) {
    for (const [index, segment] of segments.entries()) {
      const span = segment.sourceSpan;
      if (span !== null && span.startOrdinal < afterOrdinal && span.endOrdinal > afterOrdinal) {
        return { index: index + 1, confidence: "fallback" };
      }
    }
  }
  for (const [index, segment] of segments.entries()) {
    if (segment.sourceSpan !== null && segment.sourceSpan.startOrdinal >= island.sourceSpan.endOrdinal) {
      return { index, confidence: "fallback" };
    }
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const span = segments[index]?.sourceSpan;
    if (span !== undefined && span !== null && span.endOrdinal <= island.sourceSpan.startOrdinal) {
      return { index: index + 1, confidence: "fallback" };
    }
  }
  return { index: segments.length, confidence: "fallback" };
}

export function normalizeParentheticalInsertionAtKoreanBoundary(
  segments: TargetSegment[],
  insertionIndex: number
): number {
  if (insertionIndex <= 0 || insertionIndex >= segments.length) {
    return insertionIndex;
  }
  const previous = segments[insertionIndex - 1];
  const next = segments[insertionIndex];
  if (previous === undefined || next === undefined || !isHeadTailConnectiveSegment(next)) {
    return insertionIndex;
  }
  if (next.text.startsWith("다고") && !previous.text.endsWith("다")) {
    segments[insertionIndex - 1] = { ...previous, text: `${previous.text}다` };
    segments[insertionIndex] = { ...next, text: next.text.slice(1) };
    return insertionIndex;
  }
  if (next.text.startsWith("라는") && !previous.text.endsWith("라")) {
    segments[insertionIndex - 1] = { ...previous, text: `${previous.text}라` };
    segments[insertionIndex] = { ...next, text: next.text.slice(1) };
    return insertionIndex;
  }
  if (isUnsafeKoreanConnectiveInternalBoundary(previous, next)) {
    return insertionIndex + 1;
  }
  return insertionIndex;
}

function isHeadTailConnectiveSegment(segment: TargetSegment): boolean {
  return segment.kind === "connective" && segment.renderPlanKind === "headTailChain";
}

function isUnsafeKoreanConnectiveInternalBoundary(
  previous: TargetSegment,
  next: TargetSegment
): boolean {
  if (next.text !== "지만") {
    return false;
  }
  return previous.kind === "lexeme" || previous.kind === "aux";
}

export function parentheticalTargetSegments(
  island: ParentheticalIsland,
  innerSegments: readonly TargetSegment[],
  projectionConfidence: ProjectionConfidence
): readonly TargetSegment[] {
  if (island.pause !== undefined) {
    return [{
      text: island.pause.surface,
      sourceSpan: island.sourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(island.sourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(island.sourceSpan),
      unit: null,
      renderPlanKind: null,
      kind: "punctuation",
      annotationKeys: [island.pause.key],
      attachLeft: true,
      transparentPause: true,
      transparentForAllomorph: true,
      projectionConfidence
    }];
  }
  if (island.rubyAnnotationKey !== undefined) {
    return innerSegments.map(seg => ({
      ...seg,
      annotationKeys: [...(seg.annotationKeys ?? []), island.rubyAnnotationKey!]
    }));
  }
  const openingSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.startOrdinal,
    endOrdinal: island.sourceSpan.startOrdinal + 1
  };
  const closingStartOrdinal = Math.max(island.sourceSpan.startOrdinal, island.sourceSpan.endOrdinal - 1);
  const closingSpan: SourceTokenSpan = {
    startOrdinal: closingStartOrdinal,
    endOrdinal: closingStartOrdinal + 1
  };
  const segmentKind = parentheticalDelimiterTargetSegmentKind(island.delimiter.open);
  return [
    {
      text: island.delimiter.open,
      sourceSpan: openingSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(openingSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(openingSpan),
      unit: null,
      renderPlanKind: null,
      kind: segmentKind,
      ...(island.delimiterAnnotationKeys?.open !== undefined ? {
        annotationKeys: island.delimiterAnnotationKeys.open
      } : {}),
      attachRight: true,
      transparentForAllomorph: true,
      projectionConfidence
    },
    ...innerSegments,
    {
      text: island.delimiter.close,
      sourceSpan: closingSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(closingSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(closingSpan),
      unit: null,
      renderPlanKind: null,
      kind: segmentKind,
      ...(island.delimiterAnnotationKeys?.close !== undefined ? {
        annotationKeys: island.delimiterAnnotationKeys.close
      } : {}),
      attachLeft: true,
      transparentForAllomorph: true,
      projectionConfidence
    }
  ];
}

export function parentheticalDelimiterTargetSegmentKind(openingSurface: string): EnclosingDelimiterKind & TargetSegment["kind"] {
  return openingSurface === "[" || openingSurface === "［"
    ? "annotation"
    : "parenthetical";
}

export function restoreWordBoundaryAfterParenthetical(
  segments: TargetSegment[],
  insertionIndex: number,
  islandLength: number
): void {
  if (islandLength === 0) {
    return;
  }
  const before = segments[insertionIndex - 1];
  const afterIndex = insertionIndex + islandLength;
  const after = segments[afterIndex];
  if (before === undefined || after === undefined) {
    return;
  }
  if (before.consumedWordBoundaryAfter !== true || /^\s/u.test(after.text)) {
    return;
  }
  if (!isSemanticParentheticalRightSegment(after)) {
    return;
  }
  segments.splice(afterIndex, 0, {
    text: " ",
    sourceSpan: null,
    boundaryBefore: null,
    boundaryAfter: null,
    unit: null,
    renderPlanKind: null,
    kind: "synthetic",
    transparentForAllomorph: true,
    projectionConfidence: "fallback"
  });
}

export function shouldSuppressIntraOwnerSpaceForParenthetical(
  segments: readonly TargetSegment[],
  insertionIndex: number
): boolean {
  const spacer = segments[insertionIndex];
  const previous = segments[insertionIndex - 1];
  const next = segments[insertionIndex + 1];
  return spacer !== undefined &&
    previous !== undefined &&
    next !== undefined &&
    spacer.sourceSpan === null &&
    /^\s+$/.test(spacer.text) &&
    spacer.renderPlanKind !== null &&
    previous.renderPlanKind === spacer.renderPlanKind &&
    next.renderPlanKind === spacer.renderPlanKind &&
    targetSourceSpanEquals(previous.sourceSpan, next.sourceSpan);
}

function targetSourceSpanEquals(
  left: TargetSegment["sourceSpan"],
  right: TargetSegment["sourceSpan"]
): boolean {
  if (left === null || right === null) return false;
  return left.startOrdinal === right.startOrdinal && left.endOrdinal === right.endOrdinal;
}

function sourceBoundaryEquals(
  left: SourceTokenBoundary | null,
  right: SourceTokenBoundary | null
): boolean {
  return left !== null &&
    right !== null &&
    left.beforeOrdinal === right.beforeOrdinal &&
    left.afterOrdinal === right.afterOrdinal;
}
