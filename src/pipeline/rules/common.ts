import {
  auxHasNegativePolite,
  auxHasPast,
  auxHasPolite,
  collectAuxTokens,
  isVerbLemma,
  type MatcherToken
} from "../matchers.js";
import { matchCopulaNegation } from "./copula.js";
import type { TokenCursor } from "../token-cursor.js";

import { POS0, 形容詞0, 助詞, 名詞 } from "../../types/pos.js";
export const OUTER_SCOPE_HEADS = new Set(["ワケ", "コト"]);

function matchSimpleNegativeTail(cursor: TokenCursor<MatcherToken>): readonly [polite: boolean, past: boolean] | null {
  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  if ((token.pos & POS0) === 形容詞0 && (token.dictionaryForm === "ない" || token.reading === "ナイ")) {
    const aux = cursor.tx(c => {
      c.advance();
      while (c.currentIs(next => (next.pos & POS0) === 形容詞0 && (next.dictionaryForm === "ない" || next.reading === "ナイ"))) {
        c.advance();
      }
      return collectAuxTokens(c);
    });
    if (aux === null) {
      return null;
    }
    return [auxHasPolite(aux), auxHasPast(aux)];
  }
  if (isVerbLemma(token, "ある")) {
    const matched = cursor.tx(c => {
      c.advance();
      const aux = collectAuxTokens(c);
      return auxHasNegativePolite(aux) ? aux : null;
    });
    if (matched !== null) {
      return [auxHasPolite(matched), auxHasPast(matched)];
    }
  }
  return null;
}

export function matchScopeDoubleNegationOuter(
  cursor: TokenCursor<MatcherToken>
): readonly [headReading: string, additiveMo: boolean, polite: boolean, past: boolean] | null {
  const head = cursor.current();
  const headReading = head?.reading;
  if (head === undefined || (head.pos & POS0) !== 名詞 || (headReading !== "ワケ" && headReading !== "コト")) {
    return null;
  }

  if (headReading === "ワケ") {
    const outer = cursor.tx(c => {
      c.advance();
      const matched = matchCopulaNegation(c) ?? null;
      return matched !== null && !matched[2] ? matched : null;
    });
    if (outer === null) {
      return null;
    }
    const [polite, past, _outerConnective, additiveMo] = outer;
    return [headReading, additiveMo, polite, past];
  }

  const particle = cursor.peek(1);
  if ((particle?.surface !== "は" && particle?.surface !== "も") || (particle.pos & POS0) !== 助詞) {
    return null;
  }
  const additiveMo = particle.surface === "も";
  const outer = cursor.tx(c => {
    c.advance(2);
    return matchSimpleNegativeTail(c);
  });
  if (outer === null) {
    return null;
  }
  const [polite, past] = outer;
  return [headReading, additiveMo, polite, past];
}
