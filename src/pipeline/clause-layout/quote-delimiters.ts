import { POS01, 補助記号_括弧閉 } from "../../types/pos.js";

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
