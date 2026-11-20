
import { isUnitSymbolSurface } from "../../generator/korean-reading.js";
import { PARTICLE_PAIRS, type ParticleKey, selectParticle } from "../../generator/particles.js";
import type { TargetSegment } from "../../types/projection.js";
import { OPENING_BRACKET_BY_CLOSING } from "../head-tail/boundary/parenthetical.js";
import { carriesLexicalSurface, isTrailingPunctuationSurface } from "../head-tail/boundary/punctuation.js";
import type { TranslationUnit } from "../translation/unit.js";
import { allomorphHostTextFromAnchor, segmentIsAllomorphTransparent, segmentIsGeneratedSpacing } from "./allomorph-host.js";
import { punctuationOpensWordBoundaryAfter } from "./punctuation.js";

function sourceAlignedAllomorphSourceIndexFromTargetSegments(
  segments: readonly TargetSegment[],
  unit: TranslationUnit
): number {
  const particleSpan = unit.sourceSpan;
  if (particleSpan === null) {
    return -1;
  }
  let bestIndex = -1;
  let bestEndOrdinal = -1;
  for (const [index, segment] of segments.entries()) {
    if (segmentIsAllomorphTransparent(segment) || segment.sourceSpan === null) {
      continue;
    }
    if (segment.allomorphRole !== "source_anchor") {
      continue;
    }
    const overlapsParticleStart = segment.sourceSpan.startOrdinal <= particleSpan.startOrdinal &&
      segment.sourceSpan.endOrdinal > particleSpan.startOrdinal;
    const strictlyBeforeParticle = segment.sourceSpan.endOrdinal <= particleSpan.startOrdinal;
    if (!overlapsParticleStart && !strictlyBeforeParticle) {
      continue;
    }
    const rank = overlapsParticleStart
      ? 1_000_000_000 + segment.sourceSpan.startOrdinal
      : segment.sourceSpan.endOrdinal;
    if (rank < bestEndOrdinal) {
      continue;
    }
    bestIndex = index;
    bestEndOrdinal = rank;
  }
  return bestIndex;
}

export interface AllomorphIslandHost {
  readonly startOrdinal: number;
  readonly endOrdinal: number;
  readonly text: string;
}

function restoredIslandAllomorphHost(
  islandHosts: readonly AllomorphIslandHost[],
  segments: readonly TargetSegment[],
  unit: TranslationUnit
): AllomorphIslandHost | null {
  const particleStartOrdinal = unit.sourceSpan?.startOrdinal ?? null;
  if (islandHosts.length === 0 || particleStartOrdinal === null) {
    return null;
  }
  const overlapsParticleStart = segments.some((segment) =>
    !segmentIsAllomorphTransparent(segment) &&
    segment.sourceSpan !== null &&
    segment.sourceSpan.startOrdinal <= particleStartOrdinal &&
    segment.sourceSpan.endOrdinal > particleStartOrdinal);
  if (overlapsParticleStart) {
    return null;
  }
  let nearest: AllomorphIslandHost | null = null;
  for (const island of islandHosts) {
    if (island.text.length === 0 || island.endOrdinal > particleStartOrdinal) {
      continue;
    }
    if (nearest === null || island.startOrdinal > nearest.startOrdinal) {
      nearest = island;
    }
  }
  if (nearest === null) {
    return null;
  }
  const realizedAfterIsland = segments.some((segment) =>
    !segmentIsAllomorphTransparent(segment) &&
    segment.sourceSpan !== null &&
    segment.sourceSpan.startOrdinal >= nearest.endOrdinal &&
    segment.sourceSpan.endOrdinal <= particleStartOrdinal);
  if (realizedAfterIsland) {
    return null;
  }
  return islandIsAppendedNotation(segments, lastRealizedFragment(segments)) ? null : nearest;
}

function lastRealizedFragment(segments: readonly TargetSegment[]): TargetSegment | undefined {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== undefined && !segmentIsGeneratedSpacing(segment)) {
      return segment;
    }
  }
  return undefined;
}

function islandIsAppendedNotation(
  segments: readonly TargetSegment[],
  previous: TargetSegment | undefined
): boolean {
  if (previous === undefined) {
    return false;
  }
  if (carriesLexicalSurface(previous.text) || isUnitSymbolSurface(previous.text)) {
    return true;
  }
  const closingChar = previous.text.trimEnd().at(-1);
  if (closingChar === undefined ||
    !isTrailingPunctuationSurface(closingChar) ||
    punctuationOpensWordBoundaryAfter(closingChar)) {
    return false;
  }
  const word = trailingRealizedWord(segments);
  const openingChar = OPENING_BRACKET_BY_CLOSING.get(closingChar) ?? closingChar;
  if (openingChar !== closingChar) {
    return word.includes(openingChar);
  }
  return [...word].filter((char) => char === closingChar).length % 2 === 0;
}

function trailingRealizedWord(segments: readonly TargetSegment[]): string {
  let word = "";
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const text = segments[index]?.text ?? "";
    const spaceAt = text.search(/\s(?![\s\S]*\s)/u);
    if (/\s/u.test(text)) {
      return text.slice(spaceAt + 1) + word;
    }
    word = text + word;
  }
  return word;
}

export function allomorphSourceFromTargetSegments(
  segments: readonly TargetSegment[],
  unit: TranslationUnit,
  islandHosts: readonly AllomorphIslandHost[] = []
): { readonly text: string; readonly sourceSpan: TargetSegment["sourceSpan"] } {
  const island = restoredIslandAllomorphHost(islandHosts, segments, unit);
  if (island !== null) {
    return {
      text: island.text,
      sourceSpan: { startOrdinal: island.startOrdinal, endOrdinal: island.endOrdinal }
    };
  }
  const sourceAlignedIndex = sourceAlignedAllomorphSourceIndexFromTargetSegments(segments, unit);
  if (sourceAlignedIndex >= 0) {
    const sourceAlignedText = allomorphHostTextFromAnchor(segments, sourceAlignedIndex);
    if (sourceAlignedText.length > 0) {
      return {
        text: sourceAlignedText,
        sourceSpan: segments[sourceAlignedIndex]?.sourceSpan ?? null
      };
    }
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (
      segment === undefined ||
      segmentIsAllomorphTransparent(segment)
    ) {
      continue;
    }
    return { text: segment.text, sourceSpan: null };
  }
  return { text: "", sourceSpan: null };
}

export function tracedAllomorphSurface(
  unit: TranslationUnit,
  allomorphSource: { readonly text: string; readonly sourceSpan: TargetSegment["sourceSpan"] }
): string {
  const key = unit.allomorphKey;
  if (key === null) {
    return unit.korean;
  }
  if (!isParticleKey(key)) {
    throw new Error(`unknown particle key: ${key}`);
  }
  return selectParticle(allomorphSource.text, key, { register: unit.register });
}

export function isParticleKey(value: string): value is ParticleKey {
  return value in PARTICLE_PAIRS;
}
