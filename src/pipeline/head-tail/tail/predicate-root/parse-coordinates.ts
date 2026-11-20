import type { RuntimeHaruToken } from "../../../../types/token.js";
import { TokenCursor } from "../../../token-cursor.js";
import type { ParseInput } from "./parse-input.js";
import { hostEnclosingQuoteCloseToken } from "./nominal-host-phrase.js";

export function sourceIndexForInputPosition(input: ParseInput, pos: number): number {
  return input.sourceIndexMap?.[pos] ?? ((input.streamStart ?? 0) + pos);
}

export function contextAlignedPosition(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): { readonly tokens: readonly RuntimeHaruToken[]; readonly index: number } {
  const sliceTokens = cursor.tokens;
  const contextTokens = input.contextTokens;
  if (contextTokens === undefined || contextTokens === sliceTokens) {
    return { tokens: sliceTokens, index: pos };
  }
  const index = sourceIndexForInputPosition(input, pos);
  if (contextTokens[index] !== sliceTokens[pos]) {
    return { tokens: sliceTokens, index: pos };
  }
  return { tokens: contextTokens, index };
}

export function hostEnclosingQuoteCloseInParseSlice(
  input: ParseInput,
  start: number
): RuntimeHaruToken | null {
  const sourceHostStart = sourceIndexForInputPosition(input, start);
  if (
    start + 1 >= input.tokens.length ||
    sourceIndexForInputPosition(input, start + 1) !== sourceHostStart + 1
  ) {
    return null;
  }
  return hostEnclosingQuoteCloseToken(
    input.contextTokens ?? input.tokens,
    sourceHostStart,
    sourceHostStart + 1
  );
}

export function contextCursorForInputPosition(
  input: ParseInput,
  pos: number
): TokenCursor<RuntimeHaruToken> {
  const tokens = input.contextTokens ?? input.tokens;
  return new TokenCursor(tokens, sourceIndexForInputPosition(input, pos));
}
