
import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS4, 助動詞, 下一段_サ行, 下一段_マ行 } from "../../types/pos.js";

export function isCausativeAuxLemma(token: Pick<RuntimeHaruToken, "pos" | "dictionaryForm" | "surface">): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return (
    pos4 === 下一段_サ行 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる")
  ) || (
      pos4 === 下一段_マ行 &&
      (token.dictionaryForm === "しめる" || token.surface === "しめ" || token.surface === "しめる")
    );
}
