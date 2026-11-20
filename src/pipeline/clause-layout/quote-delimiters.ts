import { POS01, 補助記号_括弧閉 } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";

export const EXPLICIT_OPENING_QUOTATION_SURFACES: ReadonlySet<string> = new Set(["「", "『", "“", "‘"]);

export const EXPLICIT_CLOSING_FOR_OPENING_QUOTATION: ReadonlyMap<string, string> = new Map([
  ["「", "」"],
  ["『", "』"],
  ["“", "”"],
  ["‘", "’"]
] as const);

export const EXPLICIT_CLOSING_QUOTATION_SURFACES: ReadonlySet<string> =
  new Set(EXPLICIT_CLOSING_FOR_OPENING_QUOTATION.values());

export interface QuoteDelimiterToken {
  readonly surface: string;
  readonly pos: number;
}

export function isExplicitQuoteClosingSurface(surface: string): boolean {
  return EXPLICIT_CLOSING_QUOTATION_SURFACES.has(surface);
}

export function isExplicitQuoteClosingToken(token: QuoteDelimiterToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 補助記号_括弧閉 &&
    isExplicitQuoteClosingSurface(token.surface);
}

export function detectQuoteSpans(tokens: readonly ClauseToken[]): readonly (readonly [number, number])[] {
  const stack: { surface: string; index: number }[] = [];
  const spans: [number, number][] = [];
  for (const [index, token] of tokens.entries()) {
    if (EXPLICIT_OPENING_QUOTATION_SURFACES.has(token.surface)) {
      stack.push({ surface: token.surface, index });
      continue;
    }
    const last = stack.at(-1);
    if (last !== undefined && EXPLICIT_CLOSING_FOR_OPENING_QUOTATION.get(last.surface) === token.surface) {
      stack.pop();
      spans.push([last.index, index]);
    }
  }
  return spans;
}
