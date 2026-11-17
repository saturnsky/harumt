
import { latinInitialismSourceReadingKorean, isUnitSymbolSurface, unitSymbolKoreanReading } from "../../generator/korean-reading.js";
import type { TargetSegment } from "../../types/projection.js";
import { runtimeTokenSourceSpan, type SourceTokenSpan } from "../../types/token.js";
import { isCounterCapableToken, isNumeralToken } from "../../types/pos.js";
import { UnitType } from "../translation/unit.js";
import { normalizeFullwidthAscii } from "../../utils/char-class.js";

export function segmentIsAllomorphTransparent(segment: TargetSegment): boolean {
  if (segment.text.length === 0) {
    return true;
  }
  if (segment.allomorphRole === "source_anchor" || isUnitSymbolSurface(segment.text)) {
    return false;
  }
  return segment.transparentForAllomorph === true ||
    segment.kind === "punctuation" ||
    segment.kind === "quote";
}

export function segmentIsGeneratedSpacing(segment: TargetSegment): boolean {
  return segment.text.length === 0 || /^\s+$/u.test(segment.text);
}

export function segmentIsNumeralHost(segment: TargetSegment): boolean {
  if (segment.renderPlanKind === "numeral") {
    return true;
  }
  const unit = segment.unit;
  if (unit === null) {
    return false;
  }
  return unit.unitType === UnitType.NUMERAL || (unit.jpHead !== null && isNumeralToken(unit.jpHead));
}

export function quantityUnitPhraseStartIndex(
  segments: readonly TargetSegment[],
  anchorIndex: number
): number | undefined {
  const anchor = segments[anchorIndex];
  if (anchor === undefined || !isUnitSymbolSurface(anchor.text)) {
    return undefined;
  }
  let cursor = anchorIndex - 1;
  while (cursor >= 0 && segmentIsGeneratedSpacing(segments[cursor]!)) {
    cursor -= 1;
  }
  const preceding = cursor < 0 ? undefined : segments[cursor];
  return preceding !== undefined && segmentIsNumeralHost(preceding) ? cursor : undefined;
}

export function allomorphReadingForRealizedText(
  text: string,
  head: AllomorphReadingSourceToken | null | undefined,
  options: { readonly readUnitSymbol: boolean }
): string {
  if (options.readUnitSymbol) {
    return unitSymbolKoreanReading(text) ?? text;
  }
  if (head === null || head === undefined || head.reading.length === 0 || isCounterCapableToken(head)) {
    return text;
  }
  return latinInitialismSourceReadingKorean(normalizeFullwidthAscii(text.trim()), head.reading, {
    ...(head.latinNotationTransliteration === undefined
      ? {}
      : { dictionaryTransliteration: head.latinNotationTransliteration })
  }) ?? text;
}

export interface AllomorphReadingSourceToken {
  readonly pos: number;
  readonly reading: string;
  readonly latinNotationTransliteration?: string;
  readonly sourceOrdinal?: number;
  readonly sourceSpan?: SourceTokenSpan | null;
}

function segmentAllomorphReading(
  segment: TargetSegment,
  options: { readonly readUnitSymbol: boolean }
): string {
  return allomorphReadingForRealizedText(segment.text, segment.unit?.jpHead, options);
}

export function allomorphHostTextFromRange(
  segments: readonly TargetSegment[],
  startIndex: number,
  options: { readonly readUnitSymbols: boolean } = { readUnitSymbols: false }
): string {
  let text = "";
  for (let index = Math.max(0, startIndex); index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined || segmentIsAllomorphTransparent(segment)) {
      continue;
    }
    text += segmentAllomorphReading(segment, { readUnitSymbol: options.readUnitSymbols });
  }
  return text;
}

export function allomorphHostTextFromAnchor(
  segments: readonly TargetSegment[],
  anchorIndex: number
): string {
  const quantityStartIndex = quantityUnitPhraseStartIndex(segments, anchorIndex);
  return allomorphHostTextFromRange(
    segments,
    quantityStartIndex ?? anchorIndex,
    { readUnitSymbols: quantityStartIndex !== undefined }
  );
}

function lastVisibleSegmentIndex(segments: readonly TargetSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== undefined && !segmentIsGeneratedSpacing(segment)) {
      return index;
    }
  }
  return -1;
}

function trailingAllomorphAnchorIndex(segments: readonly TargetSegment[]): number {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== undefined && !segmentIsAllomorphTransparent(segment)) {
      return index;
    }
  }
  return lastVisibleSegmentIndex(segments);
}

export function trailingAllomorphHostText(
  segments: readonly TargetSegment[],
  options: { readonly tokens?: readonly AllomorphReadingSourceToken[] } = {}
): string {
  const anchorIndex = trailingAllomorphAnchorIndex(segments);
  const anchor = anchorIndex < 0 ? undefined : segments[anchorIndex];
  if (anchor === undefined) {
    return "";
  }
  const quantityStartIndex = quantityUnitPhraseStartIndex(segments, anchorIndex);
  if (quantityStartIndex !== undefined) {
    return allomorphHostTextFromRange(segments, quantityStartIndex, { readUnitSymbols: true });
  }
  const reading = allomorphReadingForRealizedText(
    anchor.text,
    sourceTokenForSegment(anchor, options.tokens),
    { readUnitSymbol: false }
  );
  if (reading === anchor.text) {
    return segments.map((segment) => segment.text).join("");
  }
  return [
    ...segments.slice(0, anchorIndex).map((segment) => segment.text),
    reading,
    ...segments.slice(anchorIndex + 1).map((segment) => segment.text)
  ].join("");
}

function sourceTokenForSegment(
  segment: TargetSegment,
  tokens: readonly AllomorphReadingSourceToken[] | undefined
): AllomorphReadingSourceToken | undefined {
  const span = segment.sourceSpan;
  if (span !== null && tokens !== undefined) {
    let overlapping: AllomorphReadingSourceToken | undefined;
    for (const token of tokens) {
      const tokenSpan = runtimeTokenSourceSpan(token);
      if (tokenSpan === null || tokenSpan === undefined) {
        continue;
      }
      if (tokenSpan.startOrdinal < span.endOrdinal && tokenSpan.endOrdinal > span.startOrdinal) {
        overlapping = token;
      }
    }
    if (overlapping !== undefined) {
      return overlapping;
    }
  }
  return segment.unit === null ? undefined : segment.unit?.jpHead;
}

export function trailingNumeralHostKorean(segments: readonly TargetSegment[]): string | undefined {
  const index = lastVisibleSegmentIndex(segments);
  const segment = index < 0 ? undefined : segments[index];
  return segment !== undefined && segmentIsNumeralHost(segment) ? segment.text : undefined;
}

export function quantityUnitPhraseReading(
  precedingNumeralKorean: string | undefined,
  unitSurface: string
): string | undefined {
  if (precedingNumeralKorean === undefined || !isUnitSymbolSurface(unitSurface)) {
    return undefined;
  }
  const reading = unitSymbolKoreanReading(unitSurface);
  return reading === undefined ? undefined : precedingNumeralKorean + reading;
}
