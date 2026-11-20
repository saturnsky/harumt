
import { alignReading, isKanji } from "../../generator/kanji-alignment.js";
import type { RuntimeHaruToken, SourceRubyReadingFragment } from "../../types/token.js";
import { codepointLength } from "../source-coordinate.js";
import { applySourceRubyReadingFragments } from "../source-ruby-replay.js";
import type { AlignmentForSurfaceChar } from "./parenthetical-ruby-absorption.js";
import type { TerminalRoleOccurrence, TokenTextSpan } from "../source-coordinate.js";
import { normalizeInferredRubyReadingToKatakana } from "./ruby-annotation.js";
import { tokenTextSpansForSourceText } from "./text-offset-projection.js";

export interface NarouRubyInputProjection {
  readonly baseTextSpan: TokenTextSpan;
  readonly baseSurface: string;
  readonly alignment: readonly AlignmentForSurfaceChar[];
}

interface NarouRubyTokenizationInput {
  readonly text: string;
  readonly projections: readonly NarouRubyInputProjection[];
  readonly removedTextSpans: readonly TokenTextSpan[];
}

export function collectNarouRubyTokenizationInput(
  sourceText: string,
  baseBarriers: ReadonlySet<number> = new Set()
): NarouRubyTokenizationInput {
  const chars = Array.from(sourceText);
  const output: string[] = [];
  const projections: NarouRubyInputProjection[] = [];
  const removedTextSpans: TokenTextSpan[] = [];
  let index = 0;
  while (index < chars.length) {
    if (chars[index] !== "《") {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    const close = chars.indexOf("》", index + 1);
    if (close < 0 || chars.slice(index + 1, close).includes("《")) {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    let baseStart = index;
    while (
      baseStart > 0 &&
      !baseBarriers.has(baseStart) &&
      isKanji(chars[baseStart - 1] ?? "")
    ) {
      baseStart -= 1;
    }
    const baseSurface = chars.slice(baseStart, index).join("");
    const rubyReading = normalizeInferredRubyReadingToKatakana(chars.slice(index + 1, close).join(""));
    const aligned = rubyReading === null || baseSurface.length === 0
      ? null
      : alignReading(baseSurface, rubyReading);
    if (aligned === null) {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    const baseLength = codepointLength(baseSurface);
    const baseEnd = output.length;
    projections.push({
      baseTextSpan: { start: baseEnd - baseLength, end: baseEnd },
      baseSurface,
      alignment: aligned.map(([surface, reading]) => ({ surface, reading }))
    });
    removedTextSpans.push({ start: index, end: close + 1 });
    index = close + 1;
  }
  return { text: output.join(""), projections, removedTextSpans };
}

export function projectTerminalRoleOccurrencesAcrossNarouRuby(
  occurrences: readonly TerminalRoleOccurrence[],
  removedTextSpans: readonly TokenTextSpan[]
): readonly TerminalRoleOccurrence[] {
  return occurrences.flatMap((occurrence) => {
    if (removedTextSpans.some((span) => occurrence.pos > span.start && occurrence.pos < span.end)) {
      return [];
    }
    const removedBefore = removedTextSpans.reduce(
      (total, span) => total + (span.end <= occurrence.pos ? span.end - span.start : 0),
      0
    );
    return [{ ...occurrence, pos: occurrence.pos - removedBefore }];
  });
}

export function attachNarouRubySourceFragments(
  tokens: RuntimeHaruToken[],
  tokenizationText: string,
  projections: readonly NarouRubyInputProjection[],
  removedOffsets: ReadonlySet<number>
): boolean {
  if (projections.length === 0) {
    return true;
  }
  const projected = projections.map((projection) =>
    projectNarouRubyAcrossRemovedOffsets(projection, removedOffsets)
  );
  if (projected.some((projection) => projection === null)) {
    return false;
  }
  const tokenSpans: readonly (TokenTextSpan | null)[] =
    tokens.every((token) => token.sourceCharSpan !== undefined)
      ? tokens.map((token) => token.sourceCharSpan!)
      : tokenTextSpansForSourceText(tokens, Array.from(tokenizationText));
  const fragmentsByToken = new Map<number, SourceRubyReadingFragment[]>();
  for (const projection of projected) {
    if (projection === null) {
      return false;
    }
    let covered = 0;
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex]!;
      const tokenSpan = tokenSpans[tokenIndex];
      if (
        tokenSpan === null ||
        tokenSpan === undefined ||
        tokenSpan.end <= projection.baseTextSpan.start ||
        tokenSpan.start >= projection.baseTextSpan.end
      ) {
        continue;
      }
      const overlapStart = Math.max(tokenSpan.start, projection.baseTextSpan.start);
      const overlapEnd = Math.min(tokenSpan.end, projection.baseTextSpan.end);
      const sourceOffset = overlapStart - projection.baseTextSpan.start;
      const tokenOffset = overlapStart - tokenSpan.start;
      const length = overlapEnd - overlapStart;
      const readingsByCharacter = projection.alignment
        .slice(sourceOffset, sourceOffset + length)
        .map((pair) => pair.reading);
      if (
        readingsByCharacter.length !== length ||
        Array.from(token.surface).slice(tokenOffset, tokenOffset + length).join("") !==
          Array.from(projection.baseSurface).slice(sourceOffset, sourceOffset + length).join("")
      ) {
        return false;
      }
      const sourceOrdinal = token.sourceOrdinal;
      if (sourceOrdinal === undefined) {
        return false;
      }
      const fragment: SourceRubyReadingFragment = {
        sourceOrdinal,
        sourceSurface: token.surface,
        coveredStart: tokenOffset,
        coveredEnd: tokenOffset + length,
        readingsByCharacter
      };
      const existing = fragmentsByToken.get(tokenIndex);
      if (existing === undefined) {
        fragmentsByToken.set(tokenIndex, [fragment]);
      } else {
        existing.push(fragment);
      }
      covered += length;
    }
    if (covered !== codepointLength(projection.baseSurface)) {
      return false;
    }
  }
  for (const [tokenIndex, fragments] of fragmentsByToken) {
    tokens[tokenIndex]!.sourceRubyReadingFragments = fragments;
  }
  const allFragments = [...fragmentsByToken.values()].flat();
  const patchabilityProbe = tokens.map((token) => ({ ...token }));
  if (!applySourceRubyReadingFragments(patchabilityProbe, allFragments)) {
    return false;
  }
  return true;
}

function projectNarouRubyAcrossRemovedOffsets(
  projection: NarouRubyInputProjection,
  removedOffsets: ReadonlySet<number>
): NarouRubyInputProjection | null {
  for (const offset of removedOffsets) {
    if (offset >= projection.baseTextSpan.start && offset < projection.baseTextSpan.end) {
      return null;
    }
  }
  const beforeStart = [...removedOffsets].filter((offset) => offset < projection.baseTextSpan.start).length;
  const beforeEnd = [...removedOffsets].filter((offset) => offset < projection.baseTextSpan.end).length;
  return {
    ...projection,
    baseTextSpan: {
      start: projection.baseTextSpan.start - beforeStart,
      end: projection.baseTextSpan.end - beforeEnd
    }
  };
}
