import type { LookupTables } from "../lookup-tables.js";
import { auxHasNegation, collectAuxTokens, isVerbLemma, type MatcherToken } from "../matchers.js";
import type { TokenCursor } from "../token-cursor.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { matchFollowingConnective } from "./connective-helpers.js";

import { POS0, 形容詞0, 助詞, 名詞 } from "../../types/pos.js";
export type WakeHelperToken = MatcherToken;

export function isWakeToken(token: WakeHelperToken): boolean {
  return (token.pos & POS0) === 名詞 && token.reading === "ワケ";
}

export function matchWakeNegativeTail(
  cursor: TokenCursor<WakeHelperToken>
): readonly WakeHelperToken[] | null {
  const aux = cursor.lookahead(0, c => [...collectAuxTokens(c)]);
  if (aux.length > 0 && auxHasNegation(aux)) {
    cursor.advance(aux.length);
    return aux;
  }
  const negTok = cursor.current();
  if (
    negTok !== undefined &&
    (negTok.pos & POS0) === 形容詞0 &&
    (negTok.dictionaryForm === "ない" || negTok.reading === "ナイ")
  ) {
    const trailingAux = cursor.lookahead(1, c => [...collectAuxTokens(c)]);
    cursor.advance(1 + trailingAux.length);
    return trailingAux;
  }
  return null;
}

export function matchWakeImpossibleTail(
  cursor: TokenCursor<WakeHelperToken>,
  lookups: LookupTables
): readonly [focusSurface: string, auxTokens: readonly WakeHelperToken[], connective: string | null] | null {
  if (cursor.peek(3) === undefined) {
    return null;
  }
  if (!cursor.currentIs(token => (token.pos & POS0) === 名詞 && token.reading === "ワケ")) {
    return null;
  }
  if (caseParticleMarkerRelationForToken(cursor.peek(1), cursor.pos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["wake_semantics"]
  }) === null) {
    return null;
  }
  const focus = cursor.peek(2);
  if ((focus?.surface !== "は" && focus?.surface !== "も") || (focus.pos & POS0) !== 助詞) {
    return null;
  }
  const verb = cursor.peek(3);
  if (verb === undefined || !isVerbLemma(verb, "いく", "ゆく")) {
    return null;
  }
  const matched = cursor.tx(c => {
    c.advance(4);
    const matchedNegative = matchWakeNegativeTail(c);
    if (matchedNegative === null) {
      return null;
    }
    const connEnding = matchFollowingConnective(c, lookups, { includeWakeTailMarkers: true });
    return { aux: matchedNegative, connEnding };
  });
  if (matched === null) {
    return null;
  }
  return [focus.surface, matched.aux, matched.connEnding];
}
