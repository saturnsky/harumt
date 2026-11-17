
import type { IrregularType } from "../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { AuxTokens } from "../matchers.js";

export interface PostAuxPatternResolverLike {
  readonly patterns?: {
    matchPostAux?(
      tokens: readonly RuntimeHaruToken[],
      after: number,
      auxTokens?: readonly RuntimeHaruToken[] | AuxTokens
    ): PostAuxPatternLike | null | undefined;
  };
}

export interface PostAuxPatternLike {
  readonly id?: string;
  readonly triggerLength: number;
  readonly outputMode?: string | null;
  readonly connectiveEnding?: string | null;
  readonly tailLemma?: string | null;
  readonly tailIrregular?: IrregularType | string | null;
  readonly tailKoreanPos?: number | null;
  readonly mainVerbEnding?: string | null;
  readonly middleText?: string | null;
  readonly tailText?: string | null;
  readonly auxPrecondition?: { matches(auxTokens: readonly RuntimeHaruToken[] | AuxTokens): boolean } | null;
}
