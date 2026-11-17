import type { RuntimeHaruToken } from "../../types/token.js";
import type { AuxTokenArrayElement, ContentPostAuxPatternLike } from "./types.js";
import type { AuxTokens } from "../matchers.js";

export function normalizeContentPostAuxPattern(pattern: ContentPostAuxPatternLike): ContentPostAuxPatternLike & { readonly triggerLength: number } {
  const tailLemma = pattern.tailLemma ?? null;
  const tailIrregular = pattern.tailIrregular ?? null;
  const tailKoreanPos = pattern.tailKoreanPos ?? null;
  const mainVerbEnding = pattern.mainVerbEnding ?? null;
  const connectiveEnding = pattern.connectiveEnding ?? null;
  const tailText = pattern.tailText ?? null;
  const middleText = pattern.middleText ?? null;
  const triggerLength = pattern.triggerLength ?? 0;
  const outputMode = pattern.outputMode ?? "standard";
  const auxPrecondition = pattern.auxPrecondition ?? null;
  return {
    ...pattern,
    outputMode,
    auxPrecondition,
    mainVerbEnding,
    connectiveEnding,
    tailLemma,
    tailIrregular,
    tailKoreanPos,
    tailText,
    middleText,
    triggerLength
  };
}

export function auxTokensArray(
  auxTokens: readonly AuxTokenArrayElement[] | AuxTokens
): readonly RuntimeHaruToken[] {
  const tokens = auxTokens;
  return tokens.map((token) => ({
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? "",
    dictionaryFormReading: token.dictionaryFormReading ?? "",
    pos: token.pos,
    dictionaryId: "dictionaryId" in token ? token.dictionaryId ?? 0 : 0
  }));
}
