
import { asIrregular, type IrregularType } from "../../generator/conjugator.js";
import type { KoreanPoliteForms, MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import { 명사 } from "../../types/pos.js";

export interface MetadataTranslation extends MorphemeSense {
  memo?: string;
}

export interface MetadataEntry extends MorphemeEntry {}

export type MetadataFlagKey =
  | "teIruResultative"
  | "teIruDropAux"
  | "teIruContractToPast"
  | "dropFirstNegativeAux"
  | "dropFirstPassiveAux"
  | "dropFirstCausativeAux";

export type MetadataValueKey =
  | MetadataFlagKey
  | "korean"
  | "koreanPos"
  | "irregular"
  | "memo";

export type MetadataValue = string | number | boolean | null | undefined;

export function translationForKorean(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined
): Partial<MetadataTranslation> {
  const senses = entry?.senses ?? [];
  if (koreanLemma !== undefined && koreanLemma !== null) {
    const selected = senses.find((translation) => translation.korean === koreanLemma);
    if (selected !== undefined) {
      return selected;
    }
  }
  return senses[0] ?? {};
}


export function metadataIrregular(entry: MetadataEntry | null | undefined, koreanLemma: string | null | undefined = undefined): IrregularType | null | undefined {
  const raw = translationForKorean(entry, koreanLemma)?.irregular;
  return raw === undefined ? undefined : asIrregular(raw);
}


export function metadataKoreanPos(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined = undefined,
  options: { default?: number } = {}
): number {
  const translation = translationForKorean(entry, koreanLemma);
  return translation.koreanPos ?? options.default ?? 명사;
}


export function metadataAdverbial(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined = undefined
): string | null {
  return translationForKorean(entry, koreanLemma).adverbial ?? null;
}

export function metadataNominalized(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined = undefined
): string | null {
  return translationForKorean(entry, koreanLemma).nominalized ?? null;
}


export function metadataKoreanPolite(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined = undefined
): KoreanPoliteForms | undefined {
  return translationForKorean(entry, koreanLemma).koreanPolite;
}


export function metadataTeIruResultative(entry: MetadataEntry | null | undefined, koreanLemma: string | null | undefined = undefined): boolean {
  const translation = translationForKorean(entry, koreanLemma);
  return translation.teIruResultative === true;
}


export function metadataFlag(entry: MetadataEntry | null | undefined, koreanLemma: string | null | undefined, key: MetadataFlagKey): boolean {
  return metadataValue(entry, koreanLemma, key) === true;
}


export function metadataValue(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string | null | undefined,
  key: MetadataValueKey | string,
  defaultValue: MetadataValue = undefined
): MetadataValue {
  const translation = translationForKorean(entry, koreanLemma);
  switch (key) {
    case "korean":
      return translation.korean;
    case "koreanPos":
    case "korean_pos":
      return translation.koreanPos;
    case "irregular":
      return translation.irregular;
    case "memo":
      return translation.memo;
    case "teIruResultative":
    case "te_iru_resultative":
      return translation.teIruResultative;
    case "teIruDropAux":
    case "te_iru_drop_aux":
      return translation.teIruDropAux;
    case "teIruContractToPast":
    case "te_iru_contract_to_past":
      return translation.teIruContractToPast;
    case "dropFirstNegativeAux":
    case "drop_first_negative_aux":
      return translation.dropFirstNegativeAux;
    case "dropFirstPassiveAux":
    case "drop_first_passive_aux":
      return translation.dropFirstPassiveAux;
    case "dropFirstCausativeAux":
    case "drop_first_causative_aux":
      return translation.dropFirstCausativeAux;
    default:
      return defaultValue;
  }
}
