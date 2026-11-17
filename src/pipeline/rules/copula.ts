import { auxHasConditionalNara, auxHasNegativePolite, auxHasPast, auxHasPolite, collectAuxTokens, isAdjNai, isVerbLemma, type AuxTokens, type MatcherToken } from "../matchers.js";
import { copulaDeMarkerRelationForToken, dewaScopeBridgeRelationAt } from "../head-tail/boundary/marker.js";
import { TokenCursor } from "../token-cursor.js";

import { POS0, POS1, POS4, POS5A, 助詞, 助動詞, 助動詞_ジャ, 助動詞_ダ, 副助詞, 連用形_ } from "../../types/pos.js";


function isNaiAdjective(token: MatcherToken): boolean {
  return isAdjNai(token);
}

function matchCopulaNegationHead(cursor: TokenCursor<MatcherToken>): { readonly additiveMo: boolean } | undefined {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const head = cursor.current();
  if (head === undefined) {
    return undefined;
  }

  if (
    head.surface === "じゃ" &&
    (head.pos & POS0) === 助動詞 &&
    ((head.pos & POS4) === 助動詞_ダ || (head.pos & POS4) === 助動詞_ジャ)
  ) {
    cursor.advance(1);
    return { additiveMo: false };
  }

  if (head.surface === "でも" && (head.pos & POS1) === 副助詞) {
    cursor.advance(1);
    return { additiveMo: true };
  }

  const dewaBridge = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["copula_rules"]
  });
  const dewaBridgeIsTopicFocus =
    dewaBridge?.focusParticle === "wa" || dewaBridge?.focusParticle === "mo";
  if (dewaBridge !== null && dewaBridgeIsTopicFocus && pos + 2 < n) {
    const dePos0 = head.pos & POS0;
    if (dePos0 === 助詞) {
      cursor.advance(dewaBridge.span.endExclusive - pos);
      return { additiveMo: dewaBridge.focusParticle === "mo" };
    }
    if (dePos0 === 助動詞) {
      if ((head.pos & POS4) !== 助動詞_ダ) {
        return undefined;
      }
      cursor.advance(dewaBridge.span.endExclusive - pos);
      return { additiveMo: dewaBridge.focusParticle === "mo" };
    }
    return undefined;
  }

  if (
    copulaDeMarkerRelationForToken(head, pos, { consumers: ["copula_rules"] }) !== null &&
    (head.pos & POS4) === 助動詞_ダ &&
    pos + 1 < n
  ) {
    const next = tokens[pos + 1];
    if (next !== undefined && (isNaiAdjective(next) || isVerbLemma(next, "ある"))) {
      cursor.advance(1);
      return { additiveMo: false };
    }
  }

  return undefined;
}

export function matchCopulaNegation(cursor: TokenCursor<MatcherToken>): readonly [polite: boolean, past: boolean, connective: boolean, additiveMo: boolean, conditionalNara: boolean, auxTokens: AuxTokens] | undefined {
  return cursor.tryParse((c) => {
    const tokens = c.tokens;
    const pos = c.pos;
    const n = c.end;

    if (pos + 1 >= n) {
      return undefined;
    }

    const headInfo = matchCopulaNegationHead(c);
    if (headInfo === undefined) {
      return undefined;
    }
    const negStart = c.pos;
    const { additiveMo } = headInfo;
    if (negStart >= n) {
      return undefined;
    }

    const token = tokens[negStart];
    if (token === undefined) {
      return undefined;
    }
    if (isNaiAdjective(token)) {
      const aux = c.lookahead(1, (inner) => collectAuxTokens(inner));
      const connective = (token.pos & POS5A) === 連用形_ && !auxHasPast(aux) && !auxHasPolite(aux);
      c.advance(1 + aux.length);
      return [auxHasPolite(aux), auxHasPast(aux), connective, additiveMo, auxHasConditionalNara(aux), aux] as const;
    }

    if (isVerbLemma(token, "ある")) {
      const aux = c.lookahead(1, (inner) => collectAuxTokens(inner));
      if (!auxHasNegativePolite(aux)) {
        return undefined;
      }
      c.advance(1 + aux.length);
      return [auxHasPolite(aux), auxHasPast(aux), false, additiveMo, auxHasConditionalNara(aux), aux] as const;
    }

    return undefined;
  });
}
