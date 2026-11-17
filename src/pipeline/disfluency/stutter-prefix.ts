import type { RuntimeHaruToken, StutterPrefixRuntimeMetadata } from "../../types/token.js";
import { hardTerminalPunctuationSurfaceClassForToken, isZeroWidthTerminalPunctuationContinuationToken } from "../head-tail/boundary/punctuation.js";

const SMALL_KANA = new Set(Array.from("ァィゥェォャュョヮ"));
const COMMA_SURFACES = new Set(["、", ","]);
const HARD_SENTENCE_BOUNDARIES = new Set(["。", "！", "!", "？", "?"]);
const OPENING_BOUNDARY_SURFACES = new Set(["「", "『", "（", "(", "［", "[", "｛", "{", "〈", "《", "“", "\"", "'", "‘"]);
const LEADING_DASH_SURFACES = new Set(["―", "—", "–"]);

function toKatakanaChar(char: string): string | null {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return null;
  }
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCodePoint(code + 0x60);
  }
  if (code >= 0x30A1 && code <= 0x30FA) {
    return char;
  }
  return null;
}

function splitKanaMorae(surface: string): readonly string[] | null {
  const morae: string[] = [];
  for (const rawChar of Array.from(surface)) {
    const char = toKatakanaChar(rawChar);
    if (char === null) {
      return null;
    }
    if (SMALL_KANA.has(char)) {
      if (morae.length === 0) {
        return null;
      }
      morae[morae.length - 1] = `${morae[morae.length - 1]}${char}`;
      continue;
    }
    morae.push(char);
  }
  return morae.length > 0 ? morae : null;
}

function singleMoraSurface(surface: string): string | null {
  const morae = splitKanaMorae(surface);
  return morae !== null && morae.length === 1 ? morae[0]! : null;
}

function singleMoraTokenSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): string | null {
  if (start >= endExclusive) {
    return null;
  }
  return singleMoraSurface(tokens.slice(start, endExclusive).map((token) => token.surface).join(""));
}

function firstReadingMora(token: RuntimeHaruToken | undefined): string | null {
  const reading = token?.reading !== undefined && token.reading.length > 0
    ? token.reading
    : token?.dictionaryFormReading ?? "";
  const morae = splitKanaMorae(reading);
  return morae?.[0] ?? null;
}

interface FragmentSeparator {
  readonly start: number;
  readonly endExclusive: number;
  readonly surface: StutterPrefixRuntimeMetadata["separatorSurface"];
}

function ellipsisPauseRunEnd(tokens: readonly RuntimeHaruToken[], start: number): number | null {
  let index = start;
  let asciiPeriods = 0;
  let ellipsisMarks = 0;
  while (index < tokens.length) {
    const surfaceClass = hardTerminalPunctuationSurfaceClassForToken(tokens[index], index);
    if (index > start && isZeroWidthTerminalPunctuationContinuationToken(tokens[index])) {
    } else if (surfaceClass === "ellipsis") {
      ellipsisMarks += 1;
    } else if (surfaceClass === "ascii_period") {
      asciiPeriods += 1;
    } else {
      break;
    }
    index += 1;
  }
  return ellipsisMarks > 0 || asciiPeriods >= 2 ? index : null;
}

function nextFragmentSeparator(
  tokens: readonly RuntimeHaruToken[],
  start: number
): FragmentSeparator | null {
  for (let index = start; index < tokens.length; index += 1) {
    const surface = tokens[index]?.surface ?? "";
    if (COMMA_SURFACES.has(surface)) {
      return { start: index, endExclusive: index + 1, surface: surface === "," ? "," : "、" };
    }
    const pauseEnd = ellipsisPauseRunEnd(tokens, index);
    if (pauseEnd !== null) {
      return { start: index, endExclusive: pauseEnd, surface: "…" };
    }
    if (HARD_SENTENCE_BOUNDARIES.has(surface)) {
      return null;
    }
  }
  return null;
}

function isFragmentStartBoundary(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  if (index === 0) {
    return true;
  }
  const previous = tokens[index - 1]?.surface ?? "";
  return COMMA_SURFACES.has(previous) ||
    HARD_SENTENCE_BOUNDARIES.has(previous) ||
    OPENING_BOUNDARY_SURFACES.has(previous) ||
    LEADING_DASH_SURFACES.has(previous) ||
    /^\s+$/u.test(previous);
}

export function attachMoraStutterPrefixes(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  const mutable = tokens as RuntimeHaruToken[];
  for (const token of mutable) {
    delete token.stutterPrefix;
    delete token.stutterPrefixSuppressed;
  }

  let index = 0;
  while (index < mutable.length) {
    if (!isFragmentStartBoundary(mutable, index)) {
      index += 1;
      continue;
    }
    const firstSeparator = nextFragmentSeparator(mutable, index);
    if (firstSeparator === null) {
      break;
    }
    const firstMora = singleMoraTokenSpan(mutable, index, firstSeparator.start);
    if (firstMora === null) {
      index += 1;
      continue;
    }

    let repeatCount = 1;
    let cursor = firstSeparator.endExclusive;
    while (cursor < mutable.length) {
      const separator = nextFragmentSeparator(mutable, cursor);
      if (separator === null) {
        break;
      }
      const repeatedMora = singleMoraTokenSpan(mutable, cursor, separator.start);
      if (repeatedMora !== firstMora) {
        break;
      }
      repeatCount += 1;
      cursor = separator.endExclusive;
    }

    const hostIndex = cursor;
    const hostMora = firstReadingMora(mutable[hostIndex]);
    if (hostMora !== firstMora) {
      index += 1;
      continue;
    }

    for (let sourceIndex = index; sourceIndex < hostIndex; sourceIndex += 1) {
      mutable[sourceIndex]!.stutterPrefixSuppressed = true;
    }
    mutable[hostIndex]!.stutterPrefix = {
      repeatCount,
      sourceMora: firstMora,
      separatorSurface: firstSeparator.surface,
      sourceSpan: { start: index, endExclusive: hostIndex }
    };
    index = hostIndex + 1;
  }
  return mutable;
}

export function moraStutterRepeatIndex(text: string): number | null {
  for (let index = 0; index < text.length;) {
    const code = text.codePointAt(index);
    if (code === undefined) {
      return null;
    }
    const char = String.fromCodePoint(code);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return index;
    }
    if (!/[\p{P}\p{S}\s]/u.test(char)) {
      return null;
    }
    index += char.length;
  }
  return null;
}
