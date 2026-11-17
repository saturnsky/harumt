
import type { RuntimeHaruToken } from "../types/token.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";


import { POS0, POS01, POS2, POS5A, isSahenCapableNominalOrCompound, サ変可能, 助詞, 代名詞, 動詞_非自立可能, 名詞, 形容詞0, 連用形_ } from "../types/pos.js";
export function isAdverbial(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (形容詞0 | 連用形_);
}

export function isSahenNounToken(token: Pick<RuntimeHaruToken, "pos">): boolean {
  return (token.pos & (POS0 | POS2)) === (名詞 | サ変可能);
}

function isSahenNounTokenOrOovCompound(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 名詞) return false;
  return isSahenCapableNominalOrCompound(token);
}

export function isSahenBoundVerbAfterSahen(tokens: readonly RuntimeHaruToken[], i: number): boolean {
  if (i <= 0) {
    return false;
  }
  const tok = tokens[i];
  if (tok === undefined) {
    return false;
  }
  if (
    ((tok.pos & POS01) !== 動詞_非自立可能) ||
    (tok.dictionaryForm !== "する" && tok.dictionaryForm !== "できる" && tok.dictionaryForm !== "出来る")
  ) {
    return false;
  }
  const prev = tokens[i - 1];
  return prev !== undefined && isSahenNounTokenOrOovCompound(prev);
}

export function isNounToSareruContext(
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number
): boolean {
  const marker = tokens[predicateTokenIdx - 1];
  const host = tokens[predicateTokenIdx - 2];
  const quoteMarker = quoteMarkerRelationAt(tokens, predicateTokenIdx - 1, { consumers: ["predicate_helpers"] });
  if (quoteMarker?.canonicalSurface !== "と" || ((marker?.pos ?? 0) & POS0) !== 助詞 || host === undefined) {
    return false;
  }
  const hostPos0 = host.pos & POS0;
  return (hostPos0 & POS0) === 名詞 || (hostPos0 & POS0) === 代名詞;
}
