import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { BoundaryToken } from "../../../boundary/punctuation.js";
import { POS0, POS4, 下一段_サ行, 下一段_マ行, 助動詞 } from "../../../../../types/pos.js";

export function isSeruCausativeAuxToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 助動詞 &&
    (token.pos & POS4) === 下一段_サ行 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

export function isShimeruCausativeAuxToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 下一段_マ行) &&
    (token.dictionaryForm === "しめる" || token.surface === "しめ" || token.surface === "しめる");
}
