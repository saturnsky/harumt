import type { PauseJunctureBoundaryEvidence, TransparentPauseRunEvidence } from "../pipeline/clause-layout/juncture-verdict.js";
import type {
  AnnotatedSegment,
  AnnotatedText,
  AnnotationMetadata,
  AnnotationEntry,
  TransparentPauseAnnotation,
} from "../types/annotation.js";
import { nextAnnotationKey } from "./table-update.js";

const ELLIPSIS_PAUSE_CHARS = new Set(["…", "⋯", "‥"]);

function isEllipsisPauseChar(ch: string): boolean {
  return ELLIPSIS_PAUSE_CHARS.has(ch);
}

function isPauseChar(ch: string): boolean {
  return isEllipsisPauseChar(ch) || isWavePauseChar(ch);
}

function isAsciiRangeSide(ch: string | undefined): boolean {
  return ch !== undefined && /^[0-9A-Za-z]$/u.test(ch);
}

import {
  isKana as isKanaBase,
  isKanji as isKanjiBase,
  isWavePauseChar,
} from "../utils/char-class.js";

function isKana(ch: string | undefined): boolean {
  return ch !== undefined && isKanaBase(ch);
}

function isKanji(ch: string | undefined): boolean {
  return ch !== undefined && isKanjiBase(ch);
}

function nearestNonWhitespaceIndex(
  chars: readonly string[],
  start: number,
  direction: -1 | 1
): number | undefined {
  for (let index = start; index >= 0 && index < chars.length; index += direction) {
    const ch = chars[index];
    if (ch !== undefined && !isWhitespace(ch)) return index;
  }
  return undefined;
}

function isTransparentPauseRun(
  chars: readonly string[],
  start: number,
  end: number,
  waveRunOrdinal: number,
  options: TransparentPauseForwardOptions
): boolean {
  const run = chars.slice(start, end);
  if (!run.every(isWavePauseChar)) return true;

  const leftIndex = nearestNonWhitespaceIndex(chars, start - 1, -1);
  const rightIndex = nearestNonWhitespaceIndex(chars, end, 1);
  const left = leftIndex === undefined ? undefined : chars[leftIndex];
  const right = rightIndex === undefined ? undefined : chars[rightIndex];
  if (left === undefined) return false;
  if (
    (left !== undefined && isEllipsisPauseChar(left)) ||
    (right !== undefined && isEllipsisPauseChar(right))
  ) {
    return true;
  }
  if (isAsciiRangeSide(left) || isAsciiRangeSide(right)) return false;
  if (isKanji(left) && isKanji(right)) return false;
  if (options.opaqueWavePauseRunOrdinals?.has(waveRunOrdinal) === true) {
    return false;
  }
  return isKana(left) || right === undefined;
}

function isWhitespace(ch: string): boolean {
  return /\s/u.test(ch);
}

interface PauseRun {
  readonly start: number;
  readonly end: number;
  readonly surface: string;
  readonly cleanGap: number;
  readonly analysisSurface?: string;
  readonly ellipsisRunOrdinal?: number;
}

interface SegmentScanResult {
  readonly chars: readonly string[];
  readonly runs: readonly PauseRun[];
  readonly cleanLength: number;
}

export interface TransparentPauseForwardOptions {
  readonly preserveEllipsisRunOrdinals?: ReadonlySet<number>;
  readonly opaqueWavePauseRunOrdinals?: ReadonlySet<number>;
  readonly ellipsisRunBoundaryEvidence?: ReadonlyMap<number, readonly PauseJunctureBoundaryEvidence[]>;
}

function pauseRunExtent(
  chars: readonly string[],
  start: number
): { readonly end: number; readonly isEllipsisRun: boolean } {
  const isEllipsisRun = isEllipsisPauseChar(chars[start]!);
  const sameClass = isEllipsisRun ? isEllipsisPauseChar : isWavePauseChar;
  let end = start + 1;
  while (end < chars.length && sameClass(chars[end]!)) {
    end += 1;
  }
  return { end, isEllipsisRun };
}

export interface WavePauseRunSpan {
  readonly ordinal: number;
  readonly start: number;
  readonly end: number;
}

export function wavePauseRunSpans(text: string): readonly WavePauseRunSpan[] {
  const chars = Array.from(text);
  const spans: WavePauseRunSpan[] = [];
  let ordinal = 0;
  for (let index = 0; index < chars.length; index += 1) {
    if (!isPauseChar(chars[index]!)) continue;
    const { end, isEllipsisRun } = pauseRunExtent(chars, index);
    if (!isEllipsisRun) {
      spans.push({ ordinal, start: index, end });
      ordinal += 1;
    }
    index = end - 1;
  }
  return spans;
}

export function provisionalTransparentPauseRunSpans(text: string): readonly { readonly start: number; readonly end: number }[] {
  return scanSegment(text, {}, { nextOrdinal: 0 }, { nextOrdinal: 0 }).runs
    .filter((run) => run.analysisSurface === undefined)
    .map((run) => ({ start: run.start, end: run.end }));
}

function scanSegment(
  text: string,
  options: TransparentPauseForwardOptions,
  ellipsisRunState: { nextOrdinal: number },
  waveRunState: { nextOrdinal: number },
): SegmentScanResult {
  const chars = Array.from(text);
  const runs: PauseRun[] = [];
  let cleanLength = 0;

  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index]!;
    if (!isPauseChar(ch)) {
      cleanLength += 1;
      continue;
    }

    const start = index;
    const { end, isEllipsisRun } = pauseRunExtent(chars, start);
    const surface = chars.slice(start, end).join("");
    const ellipsisRunOrdinal = isEllipsisRun ? ellipsisRunState.nextOrdinal++ : null;
    const waveRunOrdinal = isEllipsisRun ? -1 : waveRunState.nextOrdinal++;
    const preserveForGrammar = ellipsisRunOrdinal !== null &&
      options.preserveEllipsisRunOrdinals?.has(ellipsisRunOrdinal) === true;
    if (preserveForGrammar) {
      const analysisSurface = chars[start]!;
      const restoredSurface = chars.slice(start + 1, end).join("");
      cleanLength += 1;
      if (restoredSurface.length > 0) {
        runs.push({
          start,
          end,
          surface: restoredSurface,
          cleanGap: cleanLength,
          analysisSurface,
        });
      }
    } else if (!isTransparentPauseRun(chars, start, end, waveRunOrdinal, options)) {
      cleanLength += end - start;
    } else if (cleanLength > 0) {
      const previous = runs[runs.length - 1];
      if (previous !== undefined && previous.end === start) {
        const mergedEllipsisRunOrdinal = previous.analysisSurface === undefined
          ? previous.ellipsisRunOrdinal ?? ellipsisRunOrdinal ?? undefined
          : undefined;
        runs[runs.length - 1] = {
          start: previous.start,
          end,
          surface: `${previous.surface}${surface}`,
          cleanGap: previous.cleanGap,
          ...(previous.analysisSurface === undefined
            ? {}
            : { analysisSurface: previous.analysisSurface }),
          ...(mergedEllipsisRunOrdinal === undefined ? {} : { ellipsisRunOrdinal: mergedEllipsisRunOrdinal }),
        };
      } else {
        runs.push({
          start,
          end,
          surface,
          cleanGap: cleanLength,
          ...(ellipsisRunOrdinal === null ? {} : { ellipsisRunOrdinal }),
        });
      }
    } else {
      cleanLength += end - start;
    }
    index = end - 1;
  }

  return { chars, runs, cleanLength };
}

const OUTPUT_PUNCTUATION = new Set([
  ",",
  "、",
  ".",
  "。",
  "!",
  "！",
  "?",
  "？",
  "(",
  ")",
  "（",
  "）",
  "[",
  "]",
  "［",
  "］",
  "{",
  "}",
  "｛",
  "｝",
  "「",
  "」",
  "『",
  "』",
]);

function isOutputContentChar(ch: string): boolean {
  return !isWhitespace(ch) && !OUTPUT_PUNCTUATION.has(ch);
}

function segmentKeys(
  baseKeys: readonly number[] | undefined,
  extraKeys: readonly number[]
): readonly number[] | undefined {
  if (baseKeys === undefined || baseKeys.length === 0) {
    return extraKeys.length === 0 ? undefined : extraKeys;
  }
  if (extraKeys.length === 0) return baseKeys;
  return [...new Set([...baseKeys, ...extraKeys])];
}

function pushChunk(
  chunks: AnnotatedSegment[],
  text: string,
  baseKeys: readonly number[] | undefined,
  extraKeys: readonly number[] = []
): boolean {
  if (text.length === 0) return false;
  const keys = segmentKeys(baseKeys, extraKeys);
  chunks.push({
    text,
    ...(keys !== undefined && keys.length > 0 ? { keys } : {}),
  });
  return true;
}

function addKeyToPreviousChunk(
  chunks: AnnotatedSegment[],
  key: number
): void {
  const previous = chunks[chunks.length - 1];
  if (previous === undefined) return;
  const keys = previous.keys === undefined ? [key] : [...previous.keys, key];
  chunks[chunks.length - 1] = { text: previous.text, keys };
}

export function forward<A extends AnnotationEntry>(
  input: AnnotatedText<A>,
  options: TransparentPauseForwardOptions = {},
): AnnotatedText<A | TransparentPauseAnnotation> {
  const ellipsisRunState = { nextOrdinal: 0 };
  const waveRunState = { nextOrdinal: 0 };
  const scans = input.segments.map((segment) => scanSegment(segment.text, options, ellipsisRunState, waveRunState));
  const totalCleanLength = scans.reduce((sum, scan) => sum + scan.cleanLength, 0);
  let newTable: Map<number, A | TransparentPauseAnnotation> | undefined;
  let newMetadata: Map<number, AnnotationMetadata> | undefined;
  let newSegments: AnnotatedSegment[] | undefined;
  let keyCounter = -1;
  let cleanOffset = 0;
  let pendingRightKeys: number[] = [];

  for (let si = 0; si < input.segments.length; si += 1) {
    const seg = input.segments[si]!;
    const scan = scans[si]!;
    if (scan.runs.length === 0) {
      if (newSegments !== undefined) {
        if (pendingRightKeys.length === 0) {
          newSegments.push(seg);
        } else if (pushChunk(newSegments, seg.text, seg.keys, pendingRightKeys)) {
          pendingRightKeys = [];
        }
      }
      cleanOffset += scan.cleanLength;
      continue;
    }

    if (newSegments === undefined) {
      newTable = new Map<number, A | TransparentPauseAnnotation>(input.table);
      newMetadata = new Map<number, AnnotationMetadata>(input.metadata);
      newSegments = input.segments.slice(0, si);
      keyCounter = nextAnnotationKey(input.table);
    }

    const chunks: AnnotatedSegment[] = [];
    let cursor = 0;
    for (const run of scan.runs) {
      if (pushChunk(chunks, scan.chars.slice(cursor, run.start).join(""), seg.keys, pendingRightKeys)) {
        pendingRightKeys = [];
      }
      const key = keyCounter++;
      newTable!.set(key, {
        kind: "transparent-pause",
        surface: run.surface,
      });
      const transparentPauseRun: TransparentPauseRunEvidence | undefined = run.ellipsisRunOrdinal === undefined
        ? undefined
        : {
          ellipsisRunOrdinal: run.ellipsisRunOrdinal,
          boundaryEvidence: options.ellipsisRunBoundaryEvidence?.get(run.ellipsisRunOrdinal) ?? [],
        };
      newMetadata!.set(key, {
        kind: "char-point",
        cleanOffset: cleanOffset + run.cleanGap,
        cleanLength: totalCleanLength,
        attach: "both",
        restore: {
          surface: run.surface,
          mode: "boundary",
        },
        ...(transparentPauseRun === undefined ? {} : { transparentPauseRun }),
      });
      if (run.analysisSurface !== undefined) {
        if (pushChunk(chunks, run.analysisSurface, seg.keys, [key, ...pendingRightKeys])) {
          pendingRightKeys = [];
        }
      } else {
        addKeyToPreviousChunk(chunks, key);
        pendingRightKeys.push(key);
      }
      cursor = run.end;
    }
    if (pushChunk(chunks, scan.chars.slice(cursor).join(""), seg.keys, pendingRightKeys)) {
      pendingRightKeys = [];
    }
    newSegments.push(...chunks);
    cleanOffset += scan.cleanLength;
  }

  if (newSegments === undefined) return input;
  return { segments: newSegments, table: newTable!, metadata: newMetadata! };
}

function transparentPauseKeys<A extends AnnotationEntry>(
  table: ReadonlyMap<number, A>
): Map<number, TransparentPauseAnnotation> {
  const keys = new Map<number, TransparentPauseAnnotation>();
  for (const [key, value] of table) {
    if (value.kind === "transparent-pause") {
      keys.set(key, value);
    }
  }
  return keys;
}

interface RestorableCharPoint {
  readonly surface: string;
  readonly cleanOffset: number;
  readonly cleanLength: number;
}

export function outputPauseSurface(surface: string): string {
  return Array.from(surface)
    .map((ch) => (isWavePauseChar(ch) ? "~" : ch))
    .join("");
}

function restorableCharPoints(
  pauseKeys: ReadonlyMap<number, TransparentPauseAnnotation>,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): Map<number, RestorableCharPoint> {
  const points = new Map<number, RestorableCharPoint>();
  if (metadata === undefined) return points;
  for (const [key] of pauseKeys) {
    const point = metadata.get(key);
    if (point?.kind !== "char-point" || point.restore === undefined) continue;
    if (point.materialized === true) continue;
    points.set(key, {
      surface: outputPauseSurface(point.restore.surface),
      cleanOffset: point.cleanOffset,
      cleanLength: point.cleanLength,
    });
  }
  return points;
}

interface PauseKeyMembership {
  has(key: number): boolean;
}

function nonPauseKeys(
  keys: readonly number[] | undefined,
  pauseKeys: PauseKeyMembership
): readonly number[] | undefined {
  if (keys === undefined) return undefined;
  const remaining = [...new Set(keys.filter((key) => !pauseKeys.has(key)))];
  return remaining.length === 0 ? undefined : remaining;
}

function segmentPauseKeys(
  seg: AnnotatedSegment,
  pauseKeys: PauseKeyMembership
): number[] {
  const keys: number[] = [];
  for (const key of seg.keys ?? []) {
    if (pauseKeys.has(key) && !keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

function combinedNonPauseKeys(
  segments: readonly AnnotatedSegment[],
  pauseKeys: PauseKeyMembership
): readonly number[] | undefined {
  const keys = new Set<number>();
  for (const seg of segments) {
    for (const key of nonPauseKeys(seg.keys, pauseKeys) ?? []) {
      keys.add(key);
    }
  }
  const result = [...keys];
  return result.length === 0 ? undefined : result;
}

function removeKeys(
  keys: readonly number[] | undefined,
  removed: ReadonlySet<number>
): readonly number[] | undefined {
  if (keys === undefined || removed.size === 0) return keys;
  const remaining = keys.filter((key) => !removed.has(key));
  return remaining.length === 0 ? undefined : remaining;
}

function remainingMetadata(
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined,
  removed: ReadonlyMap<number, unknown>
): ReadonlyMap<number, AnnotationMetadata> | undefined {
  if (metadata === undefined) return undefined;
  const next = new Map<number, AnnotationMetadata>();
  for (const [key, value] of metadata) {
    if (!removed.has(key)) next.set(key, value);
  }
  return next.size === 0 ? undefined : next;
}

function pauseSegmentIndexes(
  segments: readonly AnnotatedSegment[],
  pauseKeys: ReadonlyMap<number, RestorableCharPoint>
): Map<number, number[]> {
  const indexes = new Map<number, number[]>();
  for (let index = 0; index < segments.length; index += 1) {
    for (const key of segmentPauseKeys(segments[index]!, pauseKeys)) {
      const current = indexes.get(key);
      if (current === undefined) {
        indexes.set(key, [index]);
      } else {
        current.push(index);
      }
    }
  }
  return indexes;
}

interface BoundaryPauseCandidate {
  readonly key: number;
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly spacerIndexes: readonly number[];
}

function boundaryPauseCandidate(
  key: number,
  indexes: readonly number[],
  segments: readonly AnnotatedSegment[],
  pauseKeys: ReadonlyMap<number, RestorableCharPoint>,
  allPauseKeys: PauseKeyMembership,
  consumed: ReadonlySet<number>
): BoundaryPauseCandidate | null {
  if (consumed.has(key) || !pauseKeys.has(key)) return null;
  const contentIndexes = indexes.filter((index) => !/^\s*$/u.test(segments[index]?.text ?? ""));
  if (contentIndexes.length !== 2) return null;
  const [leftIndex, rightIndex] = contentIndexes as [number, number];
  if (leftIndex >= rightIndex) return null;

  const spacerIndexes: number[] = [];
  for (let index = leftIndex + 1; index < rightIndex; index += 1) {
    const segment = segments[index];
    if (segment === undefined || !/^\s*$/u.test(segment.text)) return null;
    if (nonPauseKeys(segment.keys, allPauseKeys) !== undefined) return null;
    spacerIndexes.push(index);
  }
  return { key, leftIndex, rightIndex, spacerIndexes };
}

interface BoundaryPauseResult {
  readonly segments: readonly AnnotatedSegment[];
  readonly consumedPauseKeys: ReadonlySet<number>;
}

function applyBoundaryPauseInsertions(
  segments: readonly AnnotatedSegment[],
  pauseKeys: ReadonlyMap<number, RestorableCharPoint>,
  allPauseKeys: PauseKeyMembership
): BoundaryPauseResult {
  const consumed = new Set<number>();
  const suffixBySegment = new Map<number, string>();
  const stripLeadingWhitespace = new Set<number>();
  const suppressWhitespaceSegments = new Set<number>();
  const segmentIndexesByKey = pauseSegmentIndexes(segments, pauseKeys);

  for (const [key, indexes] of segmentIndexesByKey) {
    const pause = pauseKeys.get(key);
    if (pause === undefined || pause.cleanOffset >= pause.cleanLength) continue;
    const candidate = boundaryPauseCandidate(
      key,
      indexes,
      segments,
      pauseKeys,
      allPauseKeys,
      consumed
    );
    if (candidate === null) continue;
    suffixBySegment.set(
      candidate.leftIndex,
      `${suffixBySegment.get(candidate.leftIndex) ?? ""}${pause.surface}`
    );
    stripLeadingWhitespace.add(candidate.rightIndex);
    for (const index of candidate.spacerIndexes) {
      suppressWhitespaceSegments.add(index);
    }
    consumed.add(key);
  }

  if (consumed.size === 0) {
    return { segments, consumedPauseKeys: consumed };
  }

  const mapped: AnnotatedSegment[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const seg = segments[index]!;
    const keys = removeKeys(seg.keys, consumed);
    if (suppressWhitespaceSegments.has(index) && keys === undefined) {
      continue;
    }
    const suffix = suffixBySegment.get(index) ?? "";
    const text = stripLeadingWhitespace.has(index)
      ? seg.text.replace(/^\s+/u, "")
      : seg.text;
    mapped.push({
      text: `${text}${suffix}`,
      ...(keys !== undefined && keys.length > 0 ? { keys } : {}),
    });
  }

  return {
    consumedPauseKeys: consumed,
    segments: mapped,
  };
}

function countOutputContent(chars: readonly string[]): number {
  let count = 0;
  for (const ch of chars) {
    if (isOutputContentChar(ch)) count += 1;
  }
  return count;
}

function outputOffsetAfterContent(chars: readonly string[], target: number): number {
  if (target <= 0) return 0;
  let count = 0;
  for (let index = 0; index < chars.length; index += 1) {
    if (isOutputContentChar(chars[index]!)) {
      count += 1;
      if (count >= target) return index + 1;
    }
  }
  return chars.length;
}

function shiftToNearbyWordBoundary(chars: readonly string[], offset: number): number {
  if (offset <= 0 || offset >= chars.length || isWhitespace(chars[offset]!)) {
    return offset;
  }
  if (OUTPUT_PUNCTUATION.has(chars[offset]!)) return offset;
  const next = offset + 1;
  return next < chars.length && isWhitespace(chars[next]!) ? next : offset;
}

function allocateOutputChunks(
  sourceLengths: readonly number[],
  outputLength: number
): number[] {
  if (sourceLengths.length === 0) return [];
  if (outputLength <= 0) return sourceLengths.map(() => 0);
  const sourceTotal = sourceLengths.reduce((sum, length) => sum + length, 0);
  if (sourceTotal <= 0) return sourceLengths.map(() => 0);

  const exact = sourceLengths.map((length) => (length / sourceTotal) * outputLength);
  const sizes = exact.map((value) => Math.floor(value));
  let remaining = outputLength - sizes.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => {
      if (right.fraction !== left.fraction) return right.fraction - left.fraction;
      return left.index - right.index;
    });

  for (let cursor = 0; remaining > 0; cursor = (cursor + 1) % order.length) {
    const slot = order[cursor]!;
    sizes[slot.index] = (sizes[slot.index] ?? 0) + 1;
    remaining -= 1;
  }

  return sizes;
}

function insertionOffsetsForPauses(
  pauses: readonly RestorableCharPoint[],
  outputChars: readonly string[]
): Map<number, string> {
  const byGap = new Map<number, string>();
  let cleanLength = 0;
  for (const pause of pauses) {
    cleanLength = Math.max(cleanLength, pause.cleanLength);
    if (pause.cleanOffset >= pause.cleanLength) continue;
    if (!byGap.has(pause.cleanOffset)) {
      byGap.set(pause.cleanOffset, pause.surface);
    }
  }

  const insertions = new Map<number, string>();
  const trailing = pauses.filter((pause) => pause.cleanOffset >= pause.cleanLength);
  const outputLength = countOutputContent(outputChars);
  const gaps = [...byGap.keys()].sort((left, right) => left - right);

  if (gaps.length > 0 && cleanLength > 0) {
    const sourceLengths: number[] = [];
    let previous = 0;
    for (const gap of gaps) {
      sourceLengths.push(Math.max(0, gap - previous));
      previous = gap;
    }
    sourceLengths.push(Math.max(0, cleanLength - previous));

    const outputChunks = allocateOutputChunks(sourceLengths, outputLength);
    let cumulative = 0;
    for (let index = 0; index < gaps.length; index += 1) {
      cumulative += outputChunks[index] ?? 0;
      const offset = shiftToNearbyWordBoundary(
        outputChars,
        outputOffsetAfterContent(outputChars, cumulative)
      );
      if (offset >= outputChars.length && trailing.length > 0) continue;
      insertions.set(offset, byGap.get(gaps[index]!)!);
    }
  }

  for (const pause of trailing) {
    const previous = insertions.get(outputChars.length) ?? "";
    insertions.set(outputChars.length, previous + pause.surface);
  }

  return insertions;
}

function insertPauses(text: string, pauses: readonly RestorableCharPoint[]): string {
  if (pauses.length === 0) return text;
  const chars = Array.from(text);
  const insertions = [...insertionOffsetsForPauses(pauses, chars).entries()]
    .sort((left, right) => right[0] - left[0]);

  for (const [offset, surface] of insertions) {
    let deleteCount = 0;
    if (offset < chars.length) {
      while (offset + deleteCount < chars.length && isWhitespace(chars[offset + deleteCount]!)) {
        deleteCount += 1;
      }
    }
    chars.splice(offset, deleteCount, surface);
  }
  return chars.join("");
}

export function backward<A extends AnnotationEntry>(
  input: AnnotatedText<A>
): AnnotatedText<Exclude<A, TransparentPauseAnnotation>> {
  const pauseKeys = transparentPauseKeys(input.table);
  if (pauseKeys.size === 0) return input as AnnotatedText<Exclude<A, TransparentPauseAnnotation>>;
  const pauseKeySet = new Set(pauseKeys.keys());
  const pausePoints = restorableCharPoints(pauseKeys, input.metadata);

  const newTable = new Map<number, Exclude<A, TransparentPauseAnnotation>>();
  for (const [key, value] of input.table) {
    if (!pauseKeys.has(key)) newTable.set(key, value as Exclude<A, TransparentPauseAnnotation>);
  }

  if (pausePoints.size === 0) {
    const newSegments = input.segments.map((seg) => {
      const keys = removeKeys(seg.keys, pauseKeySet);
      return {
        text: seg.text,
        ...(keys !== undefined && keys.length > 0 ? { keys } : {}),
      };
    });
    const newMetadata = remainingMetadata(input.metadata, pauseKeys);
    return {
      segments: newSegments,
      table: newTable,
      ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
    };
  }

  const boundaryApplied = applyBoundaryPauseInsertions(input.segments, pausePoints, pauseKeySet);
  const activePauseKeys = new Map<number, RestorableCharPoint>();
  for (const [key, pause] of pausePoints) {
    if (!boundaryApplied.consumedPauseKeys.has(key)) {
      activePauseKeys.set(key, pause);
    }
  }

  const usedKeys = new Set<number>();
  const newSegments: AnnotatedSegment[] = [];
  for (let index = 0; index < boundaryApplied.segments.length; index += 1) {
    const seg = boundaryApplied.segments[index]!;
    const firstPauseKeys = segmentPauseKeys(seg, activePauseKeys).filter((key) => !usedKeys.has(key));
    if (firstPauseKeys.length === 0) {
      const keys = nonPauseKeys(seg.keys, pauseKeySet);
      newSegments.push({
        text: seg.text,
        ...(keys !== undefined && keys.length > 0 ? { keys } : {}),
      });
      continue;
    }

    const run: AnnotatedSegment[] = [seg];
    const runPauseKeys = new Set(firstPauseKeys);
    while (index + 1 < boundaryApplied.segments.length) {
      const next = boundaryApplied.segments[index + 1]!;
      const nextPauseKeys = segmentPauseKeys(next, activePauseKeys).filter((key) => !usedKeys.has(key));
      if (!nextPauseKeys.some((key) => runPauseKeys.has(key))) {
        break;
      }
      run.push(next);
      for (const key of nextPauseKeys) {
        runPauseKeys.add(key);
      }
      index += 1;
    }

    const pauses: RestorableCharPoint[] = [];
    for (const key of runPauseKeys) {
      const pause = activePauseKeys.get(key);
      if (pause === undefined) continue;
      pauses.push(pause);
      usedKeys.add(key);
    }

    const keys = combinedNonPauseKeys(run, pauseKeySet);
    newSegments.push({
      text: insertPauses(run.map((part) => part.text).join(""), pauses),
      ...(keys !== undefined && keys.length > 0 ? { keys } : {}),
    });
  }

  const newMetadata = remainingMetadata(input.metadata, pauseKeys);
  return {
    segments: newSegments,
    table: newTable,
    ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
  };
}
