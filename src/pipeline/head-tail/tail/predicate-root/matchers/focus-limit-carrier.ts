import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  POS4,
  POS5A,
  動詞,
  助動詞_ダ,
  助動詞_タ,
  助動詞_デス,
  終止形_,
  連体形_,
  連用形_,
  連用形_促音便
} from "../../../../../types/pos.js";
import { detectSfp } from "../../../../semantics/grammar-runtime.js";
import type { TokenCursor } from "../../../../token-cursor.js";
import type { PredicateProjectionCarrierOp } from "../grammar.js";
import { srcSingle, srcSlice } from "../source.js";
import { buildPredicateProjectionCarrierOp } from "../op-builders.js";
import { isAruVerbToken, isCopulaJaNegativeBridgeToken, isTerminalQuestionSfpParticleStart } from "../classifiers/tokens.js";
import { matchNegationEnding } from "./negation-ending.js";
import { isDakeFocusParticle, isFocusParticle, matchDakeDeFocusBridge } from "./focus-connective.js";

function isFocusLimitCarrierParticle(token: RuntimeHaruToken | undefined): boolean {
  return isDakeFocusParticle(token) ||
    isFocusParticle(token, "ばかり");
}

export function matchFocusLimitCarrier(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  if (!isFocusLimitCarrierParticle(tokens[pos])) {
    return null;
  }
  const negative = matchFocusLimitNegativeCarrier(tokens, pos);
  if (negative !== null) {
    return negative;
  }
  const copula = tokens[pos + 1];
  if (
    copula === undefined ||
    cursor.lookahead(1, isTerminalQuestionSfpParticleStart) ||
    cursor.lookahead(1, c => {
      const start = c.pos;
      detectSfp(c, 動詞, true);
      return c.pos > start;
    })
  ) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSingle(tokens[pos]!, pos),
        "limit_dake",
        "だけ",
        "limit_bare"
      ),
      consumed: 1
    };
  }
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;
  if (copulaPos4 !== 助動詞_ダ && copulaPos4 !== 助動詞_デス) {
    return null;
  }
  if (copulaPos5A === 終止形_) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "limit_dake",
        tokens.slice(pos, pos + 2).map((token) => token.surface).join(""),
        "limit_copular",
        copulaPos4 === 助動詞_デス
      ),
      consumed: 2
    };
  }
  if (
    copulaPos4 === 助動詞_ダ &&
    copulaPos5A === 連体形_ &&
    copula.surface === "な"
  ) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "limit_dake",
        tokens.slice(pos, pos + 2).map((token) => token.surface).join(""),
        "limit_copular"
      ),
      consumed: 2
    };
  }
  if (copulaPos5A === 連用形_) {
    const after = tokens[pos + 2];
    if (isAruVerbToken(after)) {
      const aruPos5A = after.pos & POS5A;
      if (
        aruPos5A === 終止形_ ||
        aruPos5A === 連体形_ ||
        aruPos5A === 連用形_ ||
        aruPos5A === 連用形_促音便
      ) {
        const pastAux = tokens[pos + 3];
        const past = (aruPos5A === 連用形_ || aruPos5A === 連用形_促音便) &&
          pastAux !== undefined &&
          (pastAux.pos & POS4) === 助動詞_タ;
        const consumed = past ? 4 : 3;
        return {
          op: buildPredicateProjectionCarrierOp(
            srcSlice(tokens, pos, consumed),
            "limit_dake",
            tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
            "limit_verb_support",
            false,
            past
          ),
          consumed
        };
      }
    }
    if (after !== undefined && (after.pos & POS4) === 助動詞_タ) {
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, 3),
          "limit_dake",
          tokens.slice(pos, pos + 3).map((token) => token.surface).join(""),
          "limit_copular",
          copulaPos4 === 助動詞_デス,
          true
        ),
        consumed: 3
      };
    }
    if (after?.surface === "たり" || after?.surface === "だり") {
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, 2),
          "limit_dake",
          tokens.slice(pos, pos + 2).map((token) => token.surface).join(""),
          "limit_copular",
          copulaPos4 === 助動詞_デス
        ),
        consumed: 2
      };
    }
  }
  return null;
}

function matchFocusLimitNegativeCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const ja = tokens[pos + 1];
  if (isCopulaJaNegativeBridgeToken(ja)) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      const consumed = 2 + negEnd.consumed;
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, consumed),
          "limit_dake_negative",
          tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
          null,
          negEnd.polite
        ),
        consumed
      };
    }
  }
  const bridge = matchDakeDeFocusBridge(tokens, pos);
  if (bridge !== null) {
    const negEnd = matchNegationEnding(tokens, pos + bridge.consumed, { allowAttributive: true });
    if (negEnd !== null) {
      const consumed = bridge.consumed + negEnd.consumed;
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, consumed),
          "limit_dake_negative",
          tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
          null,
          negEnd.polite
        ),
        consumed
      };
    }
  }
  return null;
}
