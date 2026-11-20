
import type { RuntimeHaruToken } from "../../types/token.js";
import { bisectLeft } from "../source-coordinate.js";
import type { TokenTextSpan } from "../source-coordinate.js";

export function projectDeletionOnlyBoundaries(
  sourceText: string,
  targetText: string,
  sourceBoundaries: ReadonlySet<number>
): ReadonlySet<number> {
  if (sourceBoundaries.size === 0 || sourceText === targetText) {
    return sourceBoundaries;
  }
  const source = Array.from(sourceText);
  const target = Array.from(targetText);
  const prefixMatched: number[] = Array(source.length + 1).fill(0);
  let targetIndex = 0;
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    if (source[sourceIndex] === target[targetIndex]) {
      targetIndex += 1;
    }
    prefixMatched[sourceIndex + 1] = targetIndex;
  }
  const suffixStart: number[] = Array(source.length + 1).fill(target.length);
  targetIndex = target.length - 1;
  suffixStart[source.length] = target.length;
  for (let sourceIndex = source.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
    if (source[sourceIndex] === target[targetIndex]) {
      targetIndex -= 1;
    }
    suffixStart[sourceIndex] = targetIndex + 1;
  }
  const intervals: { readonly start: number; readonly end: number }[] = [];
  for (const boundary of sourceBoundaries) {
    if (boundary < 0 || boundary > source.length) {
      continue;
    }
    const start = suffixStart[boundary] ?? target.length;
    const end = prefixMatched[boundary] ?? 0;
    if (start <= end) {
      intervals.push({ start, end });
    }
  }
  intervals.sort((left, right) => left.start - right.start || left.end - right.end);
  const projected = new Set<number>();
  let mergedStart: number | null = null;
  let mergedEnd: number | null = null;
  const flush = (): void => {
    if (mergedStart === null || mergedEnd === null) return;
    for (let boundary = mergedStart; boundary <= mergedEnd; boundary += 1) {
      projected.add(boundary);
    }
  };
  for (const interval of intervals) {
    if (mergedStart === null || mergedEnd === null || interval.start > mergedEnd + 1) {
      flush();
      mergedStart = interval.start;
      mergedEnd = interval.end;
    } else {
      mergedEnd = Math.max(mergedEnd, interval.end);
    }
  }
  flush();
  return projected;
}

export function projectBoundariesAcrossRemovedSpans(
  boundaries: ReadonlySet<number>,
  removedTextSpans: readonly TokenTextSpan[]
): ReadonlySet<number> {
  if (boundaries.size === 0 || removedTextSpans.length === 0) {
    return boundaries;
  }
  const projected = new Set<number>();
  for (const boundary of boundaries) {
    if (removedTextSpans.some((span) => boundary > span.start && boundary < span.end)) {
      continue;
    }
    const removedBefore = removedTextSpans.reduce(
      (total, span) => total + (span.end <= boundary ? span.end - span.start : 0),
      0
    );
    projected.add(boundary - removedBefore);
  }
  return projected;
}

export function projectSpansAcrossBoundaryProjection(
  spans: readonly TokenTextSpan[],
  project: (boundaries: ReadonlySet<number>) => ReadonlySet<number>
): readonly TokenTextSpan[] {
  if (spans.length === 0) {
    return spans;
  }
  return spans.flatMap((span) => {
    const [start] = project(new Set([span.start]));
    const [end] = project(new Set([span.end]));
    return start === undefined || end === undefined || end <= start ? [] : [{ start, end }];
  });
}

export function projectBoundariesAcrossRemovedOffsets(
  boundaries: ReadonlySet<number>,
  removedOffsets: ReadonlySet<number>
): ReadonlySet<number> {
  if (boundaries.size === 0 || removedOffsets.size === 0) {
    return boundaries;
  }
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  return new Set([...boundaries].map((boundary) => boundary - bisectLeft(sortedRemoved, boundary)));
}

export function tokenTextSpansForSourceText(
  tokens: readonly RuntimeHaruToken[],
  sourceChars: readonly string[]
): readonly (TokenTextSpan | null)[] {
  const spans: (TokenTextSpan | null)[] = [];
  let sourceIndex = 0;
  for (const token of tokens) {
    const surfaceChars = Array.from(token.surface);
    let matched = 0;
    let start = -1;
    let end = -1;
    while (matched < surfaceChars.length && sourceIndex < sourceChars.length) {
      if (sourceChars[sourceIndex] === surfaceChars[matched]) {
        if (start < 0) start = sourceIndex;
        end = sourceIndex + 1;
        matched += 1;
      }
      sourceIndex += 1;
    }
    spans.push(matched === surfaceChars.length && start >= 0 ? { start, end } : null);
  }
  return spans;
}
