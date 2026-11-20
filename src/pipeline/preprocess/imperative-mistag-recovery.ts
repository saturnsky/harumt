
import type { RuntimeHaruToken } from "../../types/token.js";
import {
  POS0,
  POS01,
  POS1,
  POS4,
  POS5,
  POS5A,
  仮定形_一般,
  助詞_格助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助詞_副助詞,
  助詞_接続助詞,
  動詞,
  補助記号,
  意志推量形_,
  命令形_,
  連用形_,
  非自立可能,
  is下一段,
  五段_カ行,
  五段_ガ行,
  五段_サ行,
  五段_タ行,
  五段_ナ行,
  五段_バ行,
  五段_マ行,
  五段_ラ行,
  五段_ワア行,
  下一段_ア行,
  下一段_カ行,
  下一段_ガ行,
  下一段_サ行,
  下一段_タ行,
  下一段_ナ行,
  下一段_バ行,
  下一段_マ行,
  下一段_ラ行,
  助動詞語幹,
  連用形_ニ,
  動詞_非自立可能,
  isNaAdjCapable,
  is文語助動詞
} from "../../types/pos.js";

export function isGodanImperativeYoMistagCandidate(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 動詞 || !is下一段(token.pos)) {
    return false;
  }
  const pos5a = token.pos & POS5A;
  if (pos5a !== 命令形_ && pos5a !== 意志推量形_) {
    return false;
  }
  return token.surface.endsWith("よ") && token.surface.length >= 2;
}

export const ICHIDAN_TO_GODAN_ROW: ReadonlyMap<number, number> = new Map([
  [下一段_カ行, 五段_カ行],
  [下一段_ガ行, 五段_ガ行],
  [下一段_サ行, 五段_サ行],
  [下一段_タ行, 五段_タ行],
  [下一段_ナ行, 五段_ナ行],
  [下一段_バ行, 五段_バ行],
  [下一段_マ行, 五段_マ行],
  [下一段_ラ行, 五段_ラ行],
  [下一段_ア行, 五段_ワア行]
]);

export function recoverColloquialTteAuxBeforeBa(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      token.surface !== "って" ||
      token.dictionaryForm !== "って" ||
      (token.pos & POS0) !== 助動詞
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next === undefined ||
      next.dictionaryForm !== "ば" ||
      (next.pos & POS01) !== 助詞_接続助詞
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: 助詞_副助詞,
      dictionaryFormReading: "ッテ",
      syntheticReason: "colloquial_tte_aux_retag"
    };
  });
  return dirty ? result : [...tokens];
}

export function recoverImperativeTaggedAuxBeforeBa(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      (token.pos & POS0) !== 助動詞 ||
      (token.pos & POS5A) !== 命令形_ ||
      is文語助動詞(token.pos)
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next === undefined ||
      next.dictionaryForm !== "ば" ||
      (next.pos & POS01) !== 助詞_接続助詞
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: (token.pos & ~POS5) | 仮定形_一般,
      syntheticReason: "imperative_tagged_aux_before_ba_retag"
    };
  });
  return dirty ? result : [...tokens];
}

const COPULA_NI_POS = 助動詞 | 助動詞_ダ | 連用形_ | 連用形_ニ;

export function recoverCopulaNiBeforeStateChangeImperative(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (token.surface !== "に" || (token.pos & POS01) !== 助詞_格助詞) {
      return token;
    }
    const head = tokens[index - 1];
    if (head === undefined || !isNaAdjCapable(head)) {
      return token;
    }
    const carrier = tokens[index + 1];
    if (
      carrier === undefined ||
      (carrier.pos & POS01) !== 動詞_非自立可能 ||
      carrier.dictionaryForm !== "なる" ||
      (carrier.pos & POS5A) !== 命令形_
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: COPULA_NI_POS,
      dictionaryForm: "だ",
      syntheticReason: "copula_ni_before_state_change_imperative"
    };
  });
  return dirty ? result : [...tokens];
}

const NARU_IMPERATIVE_POS = 動詞 | 非自立可能 | 五段_ラ行 | 命令形_;

export function recoverNaruImperativeMistaggedAsNarePotential(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      token.surface !== "なれ" ||
      (token.pos & POS01) !== 動詞_非自立可能 ||
      token.dictionaryForm !== "なれる" ||
      (token.pos & POS5A) !== 連用形_
    ) {
      return token;
    }
    const ni = tokens[index - 1];
    const head = tokens[index - 2];
    const headIsYouMitaiProjection = head !== undefined &&
      (head.surface === "よう" || head.surface === "みたい") &&
      (head.pos & POS1) === 助動詞語幹;
    const pastMannerHost = headIsYouMitaiProjection &&
      ((tokens[index - 3]?.pos ?? 0) & POS4) === 助動詞_タ;
    const headIsNaruImperativeHost = head !== undefined &&
      (isNaAdjCapable(head) || headIsYouMitaiProjection) &&
      !pastMannerHost;
    if (
      ni === undefined || ni.surface !== "に" || (ni.pos & POS0) !== 助動詞 ||
      !headIsNaruImperativeHost
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (next !== undefined && (next.pos & POS0) !== 補助記号) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: NARU_IMPERATIVE_POS,
      dictionaryForm: "なる",
      syntheticReason: "naru_imperative_mistagged_as_nare_potential"
    };
  });
  return dirty ? result : [...tokens];
}
