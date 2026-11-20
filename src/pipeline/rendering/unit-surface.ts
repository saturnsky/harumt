import type { RuntimeHaruToken } from "../../types/token.js";
import { POS01, POS012, 名詞_普通名詞, 名詞_固有名詞 } from "../../types/pos.js";
import type { TranslationUnit } from "../translation/unit.js";
import { moraStutterRepeatIndex } from "../disfluency/stutter-prefix.js";

export function applyMoraStutterPrefixToGeneratedText(unit: TranslationUnit, text: string): string {
  const stutter = unit.jpHead.stutterPrefix;
  if (stutter === undefined || stutter.repeatCount <= 0) {
    return text;
  }
  const index = moraStutterRepeatIndex(text);
  if (index === null) {
    return text;
  }
  const char = String.fromCodePoint(text.codePointAt(index)!);
  const prefix = Array.from({ length: stutter.repeatCount }, () => `${char}, `).join("");
  return `${text.slice(0, index)}${prefix}${text.slice(index)}`;
}

export const SUFFIX_NOUN_CHARS = new Set(Array.from("図集論伝記書誌表巻編"));

export function isSuffixNounUnit(unit: Pick<TranslationUnit, "jpHead">): boolean {
  const surface = unit.jpHead.surface;
  const pos = unit.jpHead.pos;
  return surface.length === 1 && SUFFIX_NOUN_CHARS.has(surface) && (pos & POS012) === 名詞_普通名詞                             ;
}

export function prevIsNominalUnit(unit: Pick<TranslationUnit, "jpHead"> | null | undefined): boolean {
  const pos = unit?.jpHead.pos ?? 0;
  return (pos & POS01) === 名詞_普通名詞 || (pos & POS01) === 名詞_固有名詞;
}

export type GeneratedSurfacePair = readonly [TranslationUnit, string];

export function continuesReduplication(
  unit: TranslationUnit,
  previous: GeneratedSurfacePair | undefined,
  text: string,
  tokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  if (previous === undefined || tokens === undefined || unit.jpIndices.length === 0 || previous[1] !== text) {
    return false;
  }
  const head = tokens[Math.min(...unit.jpIndices)];
  return head?.sourceReduplication === true && previous[0].jpIndices.includes(Math.min(...unit.jpIndices) - 1);
}

export function hasUserDictOverride(unit: TranslationUnit, tokens: readonly RuntimeHaruToken[]): boolean {
  return unit.jpIndices.some(i => tokens[i]?.koreanOverride !== undefined);
}
