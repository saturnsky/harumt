import type { TargetSegment, TargetSegmentKind } from "../../types/projection.js";
import { convertPunctuationSegments, type PunctuationSegment } from "./punctuation.js";
import type { DataPathOptions } from "../data-paths.js";

export function renderTargetSegmentsText(
  segments: readonly TargetSegment[],
  options: DataPathOptions = {}
): string {
  return convertPunctuationSegments(punctuationSegmentsForTargetSegments(segments), options)
    .map((segment) => segment.text)
    .join("");
}

export function punctuationSegmentsForTargetSegments(
  segments: readonly TargetSegment[]
): PunctuationSegment[] {
  return segments.map((segment, index) => ({
    text: segment.text,
    ...(continuesPrecedingWord(segments[index - 1], segment) ? { boundToPrevious: true as const } : {}),
    ...(segment.transparentPause === true ? { verbatim: true as const } : {}),
    ...(segment.relocatedPunctuation === true ? { relocated: true as const } : {})
  }));
}

function continuesPrecedingWord(
  previous: TargetSegment | undefined,
  segment: TargetSegment
): boolean {
  if (previous === undefined || !realizesBoundMorpheme(segment)) {
    return false;
  }
  if (previous.renderedByUnit != null && previous.renderedByUnit === segment.renderedByUnit) {
    return true;
  }
  if (previous.unit !== null && previous.unit === segment.unit) {
    return true;
  }
  return segment.unit?.attachLeft === true;
}

function realizesBoundMorpheme(segment: TargetSegment): boolean {
  return BOUND_MORPHEME_SEGMENT_KINDS.has(segment.kind);
}

const BOUND_MORPHEME_SEGMENT_KINDS: ReadonlySet<TargetSegmentKind> = new Set([
  "particle",
  "aux",
  "modal",
  "connective"
]);
