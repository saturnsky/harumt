
import type { AnnotatedSegment } from "../../types/annotation.js";
import type { TargetSegment } from "../../types/projection.js";
import type { RuntimeHaruToken, SourceTokenSpan } from "../../types/token.js";
import { collectAnnotationKeys } from "../translation/unit.js";

export function collectAnnotationKeysForTargetSegment(
  segment: TargetSegment,
  tokens: readonly RuntimeHaruToken[]
): number[] {
  const keys = new Set<number>();
  for (const key of segment.annotationKeys ?? []) {
    keys.add(key);
  }
  if (segment.sourceSpan !== null) {
    for (const token of tokens) {
      const tokenSpan = token.sourceSpan ?? (token.sourceOrdinal === undefined ? null : {
        startOrdinal: token.sourceOrdinal,
        endOrdinal: token.sourceOrdinal + 1,
      });
      if (
        tokenSpan === null ||
        tokenSpan.endOrdinal <= segment.sourceSpan.startOrdinal ||
        segment.sourceSpan.endOrdinal <= tokenSpan.startOrdinal ||
        token.annotationKeys === undefined
      ) {
        continue;
      }
      for (const key of token.annotationKeys) {
        keys.add(key);
      }
    }
  }
  if (keys.size === 0 && segment.sourceSpan === null && segment.unit !== null) {
    for (const key of collectAnnotationKeys(segment.unit, tokens)) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}

export function applyTransparentPauseBoundaryAnnotationKeys(
  annotated: AnnotatedSegment[],
  segments: readonly TargetSegment[],
  tokens: readonly RuntimeHaruToken[]
): void {
  for (const token of tokens) {
    const keys = token.annotationKeys;
    if (keys === undefined || keys.length === 0) continue;
    const span = token.sourceSpan ?? (token.sourceOrdinal === undefined ? null : {
      startOrdinal: token.sourceOrdinal,
      endOrdinal: token.sourceOrdinal + 1,
    });
    if (span === null) continue;
    if (targetSegmentAlreadyCarriesTokenPauseKey(annotated, segments, span, keys)) {
      continue;
    }
    if (token.transparentPauseAfter === true) {
      const index = targetSegmentIndexBeforeSourceBoundary(segments, span.endOrdinal);
      if (index !== null) addAnnotationKeysToSegment(annotated[index], keys);
    }
    if (token.transparentPauseBefore === true) {
      const index = targetSegmentIndexAfterSourceBoundary(segments, span.startOrdinal);
      if (index !== null) addAnnotationKeysToSegment(annotated[index], keys);
    }
  }
}

function targetSegmentAlreadyCarriesTokenPauseKey(
  annotated: readonly AnnotatedSegment[],
  segments: readonly TargetSegment[],
  tokenSpan: SourceTokenSpan,
  keys: readonly number[]
): boolean {
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const span = segment?.sourceSpan ?? null;
    if (
      span === null ||
      span.endOrdinal <= tokenSpan.startOrdinal ||
      tokenSpan.endOrdinal <= span.startOrdinal
    ) {
      continue;
    }
    const segmentKeys = annotated[index]?.keys;
    if (segmentKeys?.some((key) => keys.includes(key)) === true) {
      return true;
    }
  }
  return false;
}

function targetSegmentIndexBeforeSourceBoundary(
  segments: readonly TargetSegment[],
  boundaryOrdinal: number
): number | null {
  let bestIndex: number | null = null;
  let bestEnd = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) continue;
    const span = segment.sourceSpan;
    if (span === null || /^\s*$/u.test(segment.text)) continue;
    if (span.endOrdinal > boundaryOrdinal) continue;
    if (span.endOrdinal > bestEnd) {
      bestEnd = span.endOrdinal;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function targetSegmentIndexAfterSourceBoundary(
  segments: readonly TargetSegment[],
  boundaryOrdinal: number
): number | null {
  let bestIndex: number | null = null;
  let bestStart = Number.POSITIVE_INFINITY;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) continue;
    const span = segment.sourceSpan;
    if (span === null || /^\s*$/u.test(segment.text)) continue;
    if (span.startOrdinal < boundaryOrdinal) continue;
    if (span.startOrdinal < bestStart) {
      bestStart = span.startOrdinal;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function addAnnotationKeysToSegment(
  segment: AnnotatedSegment | undefined,
  keys: readonly number[]
): void {
  if (segment === undefined || keys.length === 0) return;
  const merged = new Set(segment.keys ?? []);
  for (const key of keys) merged.add(key);
  const next = Array.from(merged);
  if (next.length > 0) {
    (segment as { keys?: readonly number[] }).keys = next;
  }
}

export function annotatedSegmentsWithSpacerKeys(segments: readonly AnnotatedSegment[]): AnnotatedSegment[] {
  return segments.map((segment, index) => {
    if (segment.keys !== undefined || !/^\s+$/u.test(segment.text)) {
      return segment;
    }
    const previousKeys = segments[index - 1]?.keys;
    const nextKeys = segments[index + 1]?.keys;
    if (previousKeys === undefined || nextKeys === undefined) {
      return segment;
    }
    const shared = previousKeys.filter((key) => nextKeys.includes(key));
    return shared.length === 0
      ? segment
      : { ...segment, keys: [...new Set(shared)] };
  });
}
