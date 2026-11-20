
import { type RuntimeHaruToken, inheritedSourceIdentity } from "../../types/token.js";
import {
  POS0,
  POS01,
  助詞_格助詞,
  助動詞,
  助動詞_ダ,
  連用形_一般,
  名詞,
  連用形_,
  サ行変格,
  動詞_非自立可能,
  isDesireAuxiliaryPos,
  isPoliteCopulaPos,
  isRenyouInflection
} from "../../types/pos.js";

export function retagMistaggedWakedeCopulaRenyou(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (token.surface !== "で" || (token.pos & POS01) !== 助詞_格助詞) {
      return token;
    }
    const prev = tokens[index - 1];
    if (prev === undefined || prev.reading !== "ワケ" || (prev.pos & POS0) !== 名詞) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next !== undefined &&
      (next.surface === "は" || next.surface === "も" || next.dictionaryForm === "ある")
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      dictionaryForm: "だ",
      dictionaryFormReading: "ダ",
      pos: 助動詞 | 助動詞_ダ | 連用形_,
      syntheticReason: "wakede_copula_renyou"
    };
  });
  return dirty ? result : [...tokens];
}

export function resplitImpossibleDesuRenyouDesire(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    if (
      !isPoliteCopulaPos(token.pos) ||
      !isRenyouInflection(token.pos) ||
      next === undefined ||
      !isDesireAuxiliaryPos(next.pos)
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "で", dictionaryForm: "で", reading: "デ", dictionaryFormReading: "デ",
      pos: 助詞_格助詞, dictionaryId: 0, ...provenance,
      syntheticReason: "desu_renyou_desire_resplit:case"
    });
    result.push({
      surface: "し", dictionaryForm: "する", reading: "シ", dictionaryFormReading: "スル",
      pos: 動詞_非自立可能 | サ行変格 | 連用形_一般, dictionaryId: 0, ...provenance,
      syntheticReason: "desu_renyou_desire_resplit:predicate"
    });
  }
  return dirty ? result : [...tokens];
}
