
import { collectAuxTokens, type AuxTokens, type MatcherToken } from "../../../matchers.js";
import { TokenCursor } from "../../../token-cursor.js";

import {
  NOMINAL_KEIJOU_BITS,
  POS1,
  pos0in,
  助動詞語幹,
} from "../../../../types/pos.js";


export function matchSouDaHearsay(cursor: TokenCursor<MatcherToken>): AuxTokens | undefined {
  const sou = cursor.current();
  if (
    sou === undefined ||
    !pos0in(sou.pos, NOMINAL_KEIJOU_BITS) ||
    (sou.pos & POS1) !== 助動詞語幹 ||
    sou.surface !== "そう"
  ) {
    return undefined;
  }
  cursor.advance();
  return collectAuxTokens(cursor);
}
