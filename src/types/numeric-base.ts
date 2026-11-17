
import type { CounterFamily } from "../generator/counter-families.js";
import type { QuantityApproximationMarker } from "../generator/numeric-lookup.js";
import type { JapaneseNumber, NumeralSurfaceRealization } from "../generator/numerals.js";
import type { NounPhraseSurfacePart } from "../pipeline/nominal-phrase-surface.js";

export interface NumeralPlan {
  kind: "numeral";
  family: CounterFamily;
  parsedNumber: JapaneseNumber;
  counterKey: string;
  symbolicPrefix: string;
  arabicSurface: NumeralSurfaceRealization | null;
  lexicalOwnerSurface?: string | null;
  positional: boolean;
  amountFormatted?: boolean;
  forceArabicByTargetConvention?: boolean;
  approximation?: QuantityApproximationMarker | null;
  koreanPos: number;
}

export interface FixedTextPlan {
  kind: "fixedText";
  text: string;
  koreanPos?: number | null;
  fusedFromLemma?: boolean;
}

export type NumericBasePayload = NumeralPlan | FixedTextPlan;

export interface NumericStemBase {
  readonly plan: NumericBasePayload;
  readonly suffixParts?: readonly NounPhraseSurfacePart[];
}
