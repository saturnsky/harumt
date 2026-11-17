import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS0, POS01, POS4, POS5, POS5A, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_デス, 助動詞_ヌ, 助動詞_マス, 助詞_接続助詞, 動詞, 名詞, 形容詞0, 連用形_, 連用形_促音便 } from "../../../../../types/pos.js";
import { caseParticleMarkerRelationForToken } from "../../../boundary/marker.js";
import type { PredicateProjectionCarrierOp } from "../grammar.js";
import { srcSlice } from "../source.js";
import { isAruVerbToken } from "../classifiers/tokens.js";
import { buildPredicateProjectionCarrierOp } from "../op-builders.js";

function isChigaiNoun(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (token.surface === "違い" || token.surface === "ちがい" || token.dictionaryForm === "違い" || token.dictionaryForm === "ちがい");
}

export function matchNiChigaiNaiProjectionCarrierAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const ni = tokens[pos];
  const chigai = tokens[pos + 1];
  if (caseParticleMarkerRelationForToken(ni, pos, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) === null || !isChigaiNoun(chigai)) {
    return null;
  }
  const after = tokens[pos + 2];
  if (
    after !== undefined &&
    after.dictionaryForm === "ない" &&
    (after.pos & POS0) === 形容詞0
  ) {
    const pastAux = tokens[pos + 3];
    const past = (after.pos & POS5) === 連用形_促音便 &&
      pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
    const consumed = past ? 4 : 3;
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, consumed),
        "certainty_ni_chigai_nai",
        tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
        "certainty_adjectival",
        false,
        past
      ),
      consumed
    };
  }
  if (
    after !== undefined &&
    isAruVerbToken(after) &&
    (after.pos & POS5A) === 連用形_
  ) {
    const masu = tokens[pos + 3];
    const nu = tokens[pos + 4];
    if (masu !== undefined && (masu.pos & POS4) === 助動詞_マス && nu !== undefined && (nu.pos & POS4) === 助動詞_ヌ) {
      const desu = tokens[pos + 5];
      const ta = tokens[pos + 6];
      const past = desu !== undefined && (desu.pos & POS4) === 助動詞_デス && ta !== undefined && (ta.pos & POS4) === 助動詞_タ;
      const consumed = past ? 7 : 5;
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, consumed),
          "certainty_ni_chigai_nai",
          tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
          "certainty_verb_support",
          true,
          past
        ),
        consumed
      };
    }
  }
  return null;
}

function isKimaruVerb(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === "決まる";
}

function isTeConnectiveParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 助詞_接続助詞 &&
    (token.surface === "て" || token.surface === "で");
}

function isIruAuxVerb(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === "いる";
}

function isTeruContractedAux(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 助動詞0 && token.dictionaryForm === "てる";
}

export function matchNiKimatteIruProjectionCarrierAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const ni = tokens[pos];
  if (caseParticleMarkerRelationForToken(ni, pos, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) === null) {
    return null;
  }
  if (!isKimaruVerb(tokens[pos + 1])) {
    return null;
  }
  const te = tokens[pos + 2];
  let consumed: number;
  if (isTeConnectiveParticle(te) && isIruAuxVerb(tokens[pos + 3])) {
    consumed = 4;
  } else if (isTeruContractedAux(te)) {
    consumed = 3;
  } else {
    return null;
  }
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "certainty_ni_kimatte_iru",
      tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
      null,
      false,
      false
    ),
    consumed
  };
}
