import type { RuntimeHaruToken } from "../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../pipeline/clause-layout/trivia.js";
import {
  POS0,
  POS01,
  isLexicalPureNaAdjStem,
  助詞,
  助動詞,
  助動詞_ダ,
  助詞_格助詞,
  助詞_接続助詞,
  連用形_一般,
  連用形_ニ
} from "../types/pos.js";


export const KEIJOUJI_COPULA_DE_RETAG_REASON = "keijouji_copula_de_retag";
export const KEIJOUJI_COPULA_NI_RETAG_REASON = "keijouji_copula_ni_retag";

const COPULA_RENYOU_MARKERS: ReadonlyMap<string, { readonly inflection: number; readonly reason: string }> = new Map([
  ["で", { inflection: 連用形_一般, reason: KEIJOUJI_COPULA_DE_RETAG_REASON }],
  ["に", { inflection: 連用形_ニ, reason: KEIJOUJI_COPULA_NI_RETAG_REASON }]
]);

function attachedCaseParticleCopulaMarker(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const marker = tokens[idx];
  return marker !== undefined &&
    COPULA_RENYOU_MARKERS.has(marker.surface) &&
    ((marker.pos & POS01) === 助詞_格助詞 || (marker.pos & POS01) === 助詞_接続助詞) &&
    !separatedAs(tokens, idx, DETACHED_SEPARATIONS) &&
    !isAdnominalNoAfter(tokens, idx);
}

function isAdnominalNoAfter(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  for (let i = idx + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      return false;
    }
    if (token.surface.trim().length === 0) {
      continue;
    }
    return token.surface === "の" && (token.pos & POS0) === 助詞;
  }
  return false;
}

const COPULA_DICTIONARY_FORM = "だ";
const COPULA_DICTIONARY_READING = "ダ";

function copulaRenyouRetaggedToken(
  marker: RuntimeHaruToken,
  form: { readonly inflection: number; readonly reason: string }
): RuntimeHaruToken {
  return {
    ...marker,
    pos: 助動詞 | 助動詞_ダ | form.inflection,
    dictionaryForm: COPULA_DICTIONARY_FORM,
    dictionaryFormReading: COPULA_DICTIONARY_READING,
    normalizedForm: COPULA_DICTIONARY_FORM,
    dictionaryId: 0,
    syntheticReason: form.reason
  };
}

export function retagKeijoujiCopulaRenyou(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let mutated = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const host = tokens[i - 1];
    const form = COPULA_RENYOU_MARKERS.get(token.surface);
    if (form !== undefined && host !== undefined && isLexicalPureNaAdjStem(host) && attachedCaseParticleCopulaMarker(tokens, i)) {
      result.push(copulaRenyouRetaggedToken(token, form));
      mutated = true;
      continue;
    }
    result.push(token);
  }
  return mutated ? result : (tokens as RuntimeHaruToken[]);
}
