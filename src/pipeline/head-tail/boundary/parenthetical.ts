import type { BoundaryToken } from "./punctuation.js";
import {
  carriesLexicalSurface,
  OPENING_PUNCTUATION_SURFACES,
  TRAILING_PUNCTUATION_SURFACES
} from "./punctuation.js";
import type { BoundaryRelationConsumer, ParentheticalSpanRelation, ParentheticalSpanRole } from "./relation.js";


import { POS01, 補助記号_括弧閉, 補助記号_括弧開 } from "../../../types/pos.js";
export const OPENING_BRACKET_BY_CLOSING: ReadonlyMap<string, string> = new Map([
  ["」", "「"],
  ["』", "『"],
  ["”", "“"],
  ["’", "‘"],
  ["\"", "\""],
  ["'", "'"],
  ["＂", "＂"],
  ["）", "（"],
  [")", "("],
  ["]", "["],
  ["］", "［"],
  ["】", "【"],
  ["〉", "〈"],
  ["》", "《"],
  ["〟", "〝"]
]);

export const CLOSING_BRACKET_BY_OPENING: ReadonlyMap<string, string> = new Map(
  [...OPENING_BRACKET_BY_CLOSING.entries()].map(([closing, opening]) => [opening, closing])
);

const EXPLICIT_QUOTE_CLOSINGS = new Set(["」", "』", "”", "’", "\"", "'", "＂", "〟"]);
const PARENTHETICAL_CLOSINGS = new Set(["）", ")", "]", "］"]);

export function parentheticalSpanEndingAt(
  tokens: readonly BoundaryToken[],
  closeIndex: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly strength?: ParentheticalSpanRelation["strength"];
  } = {}
): ParentheticalSpanRelation | null {
  const close = tokens[closeIndex];
  if (!isParentheticalClosingToken(close)) {
    return null;
  }
  const openingSurface = OPENING_BRACKET_BY_CLOSING.get(close.surface);
  if (openingSurface === undefined) {
    return null;
  }
  const openingIdx = findOpeningBracketIndex(tokens, closeIndex, openingSurface, close.surface);
  if (openingIdx === null) {
    return null;
  }
  return {
    kind: "parenthetical_span",
    span: { start: openingIdx, endExclusive: closeIndex + 1 },
    strength: options.strength ?? "readiness",
    reason: `matched ${roleForClosingSurface(close.surface)} ending at bracket closer`,
    consumers: options.consumers ?? defaultConsumersForClosing(close.surface),
    openingSurface,
    closingSurface: close.surface,
    openingIdx,
    closingIdx: closeIndex,
    role: roleForClosingSurface(close.surface)
  };
}

export function parentheticalSpanStartingAt(
  tokens: readonly BoundaryToken[],
  openIndex: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly strength?: ParentheticalSpanRelation["strength"];
  } = {}
): ParentheticalSpanRelation | null {
  const open = tokens[openIndex];
  if (!isParentheticalOpeningToken(open)) {
    return null;
  }
  const closingSurface = CLOSING_BRACKET_BY_OPENING.get(open.surface);
  if (closingSurface === undefined) {
    return null;
  }
  const closingIdx = findClosingBracketIndex(tokens, openIndex, open.surface, closingSurface);
  if (closingIdx === null) {
    return null;
  }
  return {
    kind: "parenthetical_span",
    span: { start: openIndex, endExclusive: closingIdx + 1 },
    strength: options.strength ?? "readiness",
    reason: `matched ${roleForClosingSurface(closingSurface)} starting at bracket opener`,
    consumers: options.consumers ?? defaultConsumersForClosing(closingSurface),
    openingSurface: open.surface,
    closingSurface,
    openingIdx: openIndex,
    closingIdx,
    role: roleForClosingSurface(closingSurface)
  };
}

export function isParentheticalClosingToken(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined && (token.pos & POS01) === 補助記号_括弧閉 && OPENING_BRACKET_BY_CLOSING.has(token.surface);
}

export function isParentheticalOpeningToken(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined && (token.pos & POS01) === 補助記号_括弧開 && CLOSING_BRACKET_BY_OPENING.has(token.surface);
}

function findOpeningBracketIndex(
  tokens: readonly BoundaryToken[],
  closeIndex: number,
  openingSurface: string,
  closingSurface: string
): number | null {
  let nestedClosers = 0;
  for (let cursor = closeIndex - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return null;
    }
    if (token.surface === closingSurface && (token.pos & POS01) === 補助記号_括弧閉) {
      nestedClosers += 1;
      continue;
    }
    if (token.surface === openingSurface && (token.pos & POS01) === 補助記号_括弧開) {
      if (nestedClosers === 0) {
        return cursor;
      }
      nestedClosers -= 1;
    }
  }
  return null;
}

function findClosingBracketIndex(
  tokens: readonly BoundaryToken[],
  openIndex: number,
  openingSurface: string,
  closingSurface: string
): number | null {
  let nestedOpeners = 0;
  for (let cursor = openIndex + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return null;
    }
    if (token.surface === openingSurface && (token.pos & POS01) === 補助記号_括弧開) {
      nestedOpeners += 1;
      continue;
    }
    if (token.surface === closingSurface && (token.pos & POS01) === 補助記号_括弧閉) {
      if (nestedOpeners === 0) {
        return cursor;
      }
      nestedOpeners -= 1;
    }
  }
  return null;
}

export function roleForClosingSurface(surface: string): ParentheticalSpanRole {
  if (EXPLICIT_QUOTE_CLOSINGS.has(surface)) {
    return "explicit_quote_span";
  }
  if (PARENTHETICAL_CLOSINGS.has(surface)) {
    return "parenthetical_span";
  }
  return "bracketed_span";
}

export function roleForOpeningSurface(surface: string): ParentheticalSpanRole | null {
  const closing = CLOSING_BRACKET_BY_OPENING.get(surface);
  return closing === undefined ? null : roleForClosingSurface(closing);
}

function defaultConsumersForClosing(surface: string): readonly BoundaryRelationConsumer[] {
  if (EXPLICIT_QUOTE_CLOSINGS.has(surface)) {
    return ["nominal_head_parser", "quote_content", "embedded_question"];
  }
  return ["nominal_head_parser", "embedded_question"];
}

export const MULTI_GLYPH_DELIMITER_SPLIT_REASON = "multi_glyph_delimiter_split";

export function isDelimiterGlyph(char: string): boolean {
  return OPENING_PUNCTUATION_SURFACES.has(char) ||
    TRAILING_PUNCTUATION_SURFACES.has(char) ||
    /^[\p{Ps}\p{Pe}\p{Pi}\p{Pf}]$/u.test(char);
}

export function isMultiGlyphDelimiterSymbolToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const chars = [...token.surface];
  if (chars.length < 2 || carriesLexicalSurface(token.surface)) {
    return false;
  }
  return chars.some((char) => isDelimiterGlyph(char)) && !containsSelfContainedBracketPair(chars);
}

function containsSelfContainedBracketPair(chars: readonly string[]): boolean {
  for (const [open, openChar] of chars.entries()) {
    const closingSurface = CLOSING_BRACKET_BY_OPENING.get(openChar);
    if (closingSurface === undefined || closingSurface === openChar) {
      continue;
    }
    for (let close = open + 1; close < chars.length; close += 1) {
      const char = chars[close]!;
      if (char === closingSurface) {
        return true;
      }
      if (isDelimiterGlyph(char)) {
        break;
      }
    }
  }
  return false;
}
