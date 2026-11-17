import { alignReading } from "../generator/kanji-alignment.js";
import type { RuntimeHaruToken, SourceRubyReadingFragment } from "../types/token.js";

export function applySourceRubyReadingFragments(
  tokens: RuntimeHaruToken[],
  fragments: readonly SourceRubyReadingFragment[]
): boolean {
  for (const token of tokens) {
    delete token.sourceRubyReadingFragments;
  }
  let applied = true;
  for (const fragment of fragments) {
    applied = applySourceRubyReadingFragment(tokens, fragment) && applied;
  }
  return applied;
}

function applySourceRubyReadingFragment(
  tokens: RuntimeHaruToken[],
  fragment: SourceRubyReadingFragment
): boolean {
  const positions: {
    readonly token: RuntimeHaruToken;
    readonly tokenIndex: number;
    readonly charIndex: number;
    readonly char: string;
  }[] = [];
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    const span = token.sourceSpan ?? (
      token.sourceOrdinal === undefined
        ? null
        : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
    );
    if (
      span === null ||
      fragment.sourceOrdinal < span.startOrdinal ||
      fragment.sourceOrdinal >= span.endOrdinal
    ) {
      continue;
    }
    for (const [charIndex, char] of Array.from(token.surface).entries()) {
      positions.push({ token, tokenIndex, charIndex, char });
    }
  }
  const sourceChars = Array.from(fragment.sourceSurface);
  const matchStarts: number[] = [];
  for (let start = 0; start + sourceChars.length <= positions.length; start += 1) {
    if (sourceChars.every((char, offset) => positions[start + offset]?.char === char)) {
      matchStarts.push(start);
    }
  }
  if (matchStarts.length !== 1) {
    return false;
  }
  const coveredStart = matchStarts[0]! + fragment.coveredStart;
  const coveredEnd = matchStarts[0]! + fragment.coveredEnd;
  if (
    coveredEnd - coveredStart !== fragment.readingsByCharacter.length ||
    coveredStart < 0 ||
    coveredEnd > positions.length
  ) {
    return false;
  }

  const ranges = new Map<number, {
    readonly token: RuntimeHaruToken;
    start: number;
    end: number;
    readings: string[];
  }>();
  for (let index = coveredStart; index < coveredEnd; index += 1) {
    const position = positions[index];
    const reading = fragment.readingsByCharacter[index - coveredStart];
    if (position === undefined || reading === undefined) {
      return false;
    }
    const current = ranges.get(position.tokenIndex);
    if (current === undefined) {
      ranges.set(position.tokenIndex, {
        token: position.token,
        start: position.charIndex,
        end: position.charIndex + 1,
        readings: [reading]
      });
    } else {
      if (position.charIndex !== current.end) {
        return false;
      }
      current.end += 1;
      current.readings.push(reading);
    }
  }

  const patches: {
    readonly token: RuntimeHaruToken;
    readonly reading: string;
    readonly dictionaryFormReading: string;
  }[] = [];
  for (const range of ranges.values()) {
    const patch = sourceRubyReadingPatch(
      range.token,
      range.start,
      range.end,
      range.readings
    );
    if (patch === null) {
      return false;
    }
    patches.push({ token: range.token, ...patch });
  }
  for (const patch of patches) {
    patch.token.reading = patch.reading;
    patch.token.dictionaryFormReading = patch.dictionaryFormReading;
    patch.token.sourceRubyReadingFragments = [
      ...(patch.token.sourceRubyReadingFragments ?? []),
      fragment
    ];
  }
  return true;
}

function sourceRubyReadingPatch(
  token: RuntimeHaruToken,
  coveredStart: number,
  coveredEnd: number,
  readingsByCharacter: readonly string[]
): { readonly reading: string; readonly dictionaryFormReading: string } | null {
  const surfaceChars = Array.from(token.surface);
  if (
    coveredStart < 0 ||
    coveredEnd > surfaceChars.length ||
    coveredStart >= coveredEnd ||
    readingsByCharacter.length !== coveredEnd - coveredStart
  ) {
    return null;
  }
  const surfaceAlignment = alignReading(token.surface, token.reading);
  let reading: string;
  if (coveredStart === 0 && coveredEnd === surfaceChars.length) {
    reading = readingsByCharacter.join("");
  } else {
    if (surfaceAlignment === null || surfaceAlignment.length !== surfaceChars.length) {
      return null;
    }
    const segments = surfaceAlignment.map(([, segment]) => segment);
    segments.splice(coveredStart, coveredEnd - coveredStart, ...readingsByCharacter);
    reading = segments.join("");
  }

  const dictionaryFormReading = conservativeRubyDictionaryFormReading(
    token,
    surfaceChars,
    surfaceAlignment,
    coveredStart,
    coveredEnd,
    readingsByCharacter,
    reading
  );
  return { reading, dictionaryFormReading };
}

function conservativeRubyDictionaryFormReading(
  token: RuntimeHaruToken,
  surfaceChars: readonly string[],
  surfaceAlignment: readonly (readonly [string, string])[] | null,
  coveredStart: number,
  coveredEnd: number,
  readingsByCharacter: readonly string[],
  nextSurfaceReading: string
): string {
  if (
    token.dictionaryForm === token.surface &&
    token.dictionaryFormReading === token.reading
  ) {
    return nextSurfaceReading;
  }
  if (surfaceAlignment === null || surfaceAlignment.length !== surfaceChars.length) {
    return token.dictionaryFormReading;
  }
  const dictionaryChars = Array.from(token.dictionaryForm);
  const dictionaryAlignment = alignReading(token.dictionaryForm, token.dictionaryFormReading);
  if (dictionaryAlignment === null || dictionaryAlignment.length !== dictionaryChars.length) {
    return token.dictionaryFormReading;
  }
  const dictionaryReadings = dictionaryAlignment.map(([, reading]) => reading);
  let changed = false;
  for (let index = coveredStart; index < coveredEnd; index += 1) {
    const prefixMatches = surfaceChars
      .slice(0, index + 1)
      .every((char, prefixIndex) => dictionaryChars[prefixIndex] === char);
    if (
      !prefixMatches ||
      surfaceAlignment[index]?.[1] !== dictionaryAlignment[index]?.[1]
    ) {
      continue;
    }
    dictionaryReadings[index] = readingsByCharacter[index - coveredStart]!;
    changed = true;
  }
  return changed ? dictionaryReadings.join("") : token.dictionaryFormReading;
}
