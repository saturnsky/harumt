import { conjugate, type IrregularType } from "../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../types/token.js";


import { POS4, 助動詞_ナイ, 助動詞_ヌ } from "../../types/pos.js";
export function isNegativeAuxToken(token: RuntimeHaruToken): boolean {
  return token.pos !== 0 && ((token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ);
}

export function stripFirstNegativeAux(
  auxTokens: readonly RuntimeHaruToken[]
): readonly [stripped: RuntimeHaruToken[], removed: boolean] {
  const stripped: RuntimeHaruToken[] = [];
  let removed = false;
  for (const aux of auxTokens) {
    if (!removed && isNegativeAuxToken(aux)) {
      removed = true;
      continue;
    }
    stripped.push(aux);
  }
  return [stripped, removed];
}

export function longNegativeLemma(
  koreanLemma: string,
  irregular: IrregularType | null
): string | null {
  let stem: string;
  try {
    stem = conjugate(koreanLemma, irregular, "지");
  } catch {
    return null;
  }
  if (!stem) {
    return null;
  }
  return `${stem} 않다`;
}
