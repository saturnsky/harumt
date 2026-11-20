import type { RuntimeHaruToken, HaruTokenRuntimeFields } from "../../types/token.js";
import { isLongVowelReductionAligned } from "../../types/token.js";

export interface RuntimePreprocessToken extends HaruTokenRuntimeFields {
  readonly surface: string;
  readonly normalizedForm?: string;
  readonly dictionaryForm: string;
  readonly reading: string;
  readonly dictionaryFormReading: string;
  readonly pos: number;
  readonly dictionaryId?: number;
  readonly splitA?: readonly RuntimePreprocessToken[];
  readonly splitB?: readonly RuntimePreprocessToken[];
}

export function runtimeTokenFromPreprocess(token: RuntimePreprocessToken): RuntimeHaruToken {
  const { splitA, splitB, longVowelReduction, ...flatToken } = token;
  const alignedMetadata = longVowelReduction !== undefined &&
    isLongVowelReductionAligned({ surface: token.surface, longVowelReduction })
    ? longVowelReduction
    : undefined;
  return {
    ...flatToken,
    ...(alignedMetadata === undefined ? {} : { longVowelReduction: alignedMetadata }),
    dictionaryId: token.dictionaryId ?? -1,
    ...(splitA === undefined ? {} : { splitA: splitA.map((item) => runtimeTokenFromPreprocess(item)) }),
    ...(splitB === undefined ? {} : { splitB: splitB.map((item) => runtimeTokenFromPreprocess(item)) })
  };
}
