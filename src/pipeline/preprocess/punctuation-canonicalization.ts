
import {
  type RuntimeHaruToken,
  splitBoundaryRuntimeStateForPieces,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import {
  canonicalHardTerminalPunctuationSurfaceFor,
  isHardTerminalPunctuationSurface,
  isZeroWidthTerminalPunctuationContinuationToken
} from "../head-tail/boundary/punctuation.js";
import {
  isMultiGlyphDelimiterSymbolToken,
  MULTI_GLYPH_DELIMITER_SPLIT_REASON
} from "../head-tail/boundary/parenthetical.js";
import { POS0, POS012, 形状詞, 形容詞0, 動詞, 副詞, 接頭辞, 補助記号, 補助記号_括弧閉, 補助記号_括弧開, 名詞, 補助記号_句点 } from "../../types/pos.js";
import { TokenCursor } from "../token-cursor.js";

export const SYMMETRIC_QUOTE_SURFACES = new Set(["\"", "'", "＂", "＇"]);

function startsNewSourceLine(token: RuntimeHaruToken | undefined): boolean {
  return token?.sourceLineBreakBefore === true;
}

export function symmetricQuoteDirections(
  tokens: readonly RuntimeHaruToken[],
  toggleSurfaces: ReadonlySet<string>
): ReadonlyMap<number, number> {
  const directions = new Map<number, number>();
  if (toggleSurfaces.size === 0) {
    return directions;
  }
  let lineStart = 0;
  for (let index = 0; index <= tokens.length; index += 1) {
    if (index !== tokens.length && !(index > lineStart && startsNewSourceLine(tokens[index]))) {
      continue;
    }
    assignSymmetricQuoteDirectionsInLine(tokens, lineStart, index, toggleSurfaces, directions);
    lineStart = index;
  }
  return directions;
}

function assignSymmetricQuoteDirectionsInLine(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
  toggleSurfaces: ReadonlySet<string>,
  directions: Map<number, number>
): void {
  const occurrencesBySurface = new Map<string, number[]>();
  for (let index = start; index < endExclusive; index += 1) {
    const surface = tokens[index]!.surface;
    if (!toggleSurfaces.has(surface)) {
      continue;
    }
    const seen = occurrencesBySurface.get(surface);
    if (seen === undefined) {
      occurrencesBySurface.set(surface, [index]);
    } else {
      seen.push(index);
    }
  }
  for (const occurrences of occurrencesBySurface.values()) {
    for (const [ordinal, index] of occurrences.entries()) {
      const unpaired = occurrences.length % 2 === 1 && ordinal === occurrences.length - 1;
      const opening = unpaired ? index === start : ordinal % 2 === 0;
      directions.set(index, opening ? 補助記号_括弧開 : 補助記号_括弧閉);
    }
  }
}

export function hasFollowingPrefixHost(tokens: readonly RuntimeHaruToken[], from: number): boolean {
  const c = new TokenCursor(tokens, from);
  while (c.pos < c.end) {
    const pos0 = (c.current()?.pos ?? 0) & POS0;
    if (((1 << 補助記号) | (1 << 接頭辞)) >> pos0 & 1) {
      c.advance();
      continue;
    }
    return (((1 << 名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 副詞) | (1 << 形状詞)) >> pos0 & 1) === 1;
  }
  return false;
}

export function canonicalizeTerminalPunctuationNotation(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = [...tokens];
  for (let index = 0; index < result.length; index += 1) {
    const head = result[index];
    if (head === undefined || head.surface.length === 0) {
      continue;
    }
    const headSurface = canonicalHardTerminalPunctuationSurfaceFor(head);
    if (headSurface === null) {
      continue;
    }
    let endExclusive = index + 1;
    while (
      endExclusive < result.length &&
      isZeroWidthTerminalPunctuationContinuationToken(result[endExclusive])
    ) {
      endExclusive += 1;
    }
    if (endExclusive === index + 1) {
      continue;
    }
    const surfaces: string[] = [headSurface];
    for (let cursor = index + 1; cursor < endExclusive; cursor += 1) {
      const continuationSurface = canonicalHardTerminalPunctuationSurfaceFor(result[cursor]);
      if (continuationSurface === null) {
        break;
      }
      surfaces.push(continuationSurface);
    }
    if (surfaces.length !== endExclusive - index) {
      continue;
    }
    for (let cursor = index; cursor < endExclusive; cursor += 1) {
      const token = result[cursor]!;
      result[cursor] = {
        ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: surfaces[cursor - index]! }),
        syntheticReason: "terminal_punctuation_notation_canonicalization"
      };
    }
    dirty = true;
    index = endExclusive - 1;
  }
  return expandMultiGlyphDelimiterSymbolTokens(dirty ? result : tokens);
}

function expandMultiGlyphDelimiterSymbolTokens(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const pieces = splitMultiGlyphDelimiterSymbolToken(token);
    if (pieces === null) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(...pieces);
  }
  return dirty ? result : [...tokens];
}

function splitMultiGlyphDelimiterSymbolToken(
  token: RuntimeHaruToken
): RuntimeHaruToken[] | null {
  if (!isMultiGlyphDelimiterSymbolToken(token)) {
    return null;
  }
  const chars = [...token.surface];
  const charSpan = token.sourceCharSpan;
  if (charSpan !== undefined && charSpan !== null && charSpan.end - charSpan.start !== chars.length) {
    return null;
  }
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
  const lastIndex = chars.length - 1;
  return chars.map((char, offset) => {
    const piece: Record<string, unknown> = {
      ...(offset === 0 ? head : inner),
      ...(offset === lastIndex ? tail : {}),
      surface: char,
      dictionaryForm: char,
      reading: char,
      dictionaryFormReading: char,
      pos: delimiterSplitPiecePos(char, token.pos),
      dictionaryId: 0,
      syntheticReason: MULTI_GLYPH_DELIMITER_SPLIT_REASON
    };
    delete piece.splitA;
    delete piece.splitB;
    if (charSpan === undefined || charSpan === null) {
      delete piece.sourceCharSpan;
    } else {
      piece.sourceCharSpan = { start: charSpan.start + offset, end: charSpan.start + offset + 1 };
    }
    return piece as unknown as RuntimeHaruToken;
  });
}

function delimiterSplitPiecePos(char: string, basePos: number): number {
  const highBits = basePos & ~POS012;
  if (/^[\p{Ps}\p{Pi}]$/u.test(char)) {
    return 補助記号_括弧開 | highBits;
  }
  if (/^[\p{Pe}\p{Pf}]$/u.test(char)) {
    return 補助記号_括弧閉 | highBits;
  }
  return (isHardTerminalPunctuationSurface(char) ? 補助記号_句点 : 補助記号) | highBits;
}
