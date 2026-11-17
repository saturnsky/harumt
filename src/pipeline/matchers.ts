
import {
  POS0,
  POS01,
  POS4,
  POS5A,
  is上一段,
  is下一段,
  カ行変格,
  サ行変格,
  仮定形_,
  形容詞0,
  助詞,
  助詞_終助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  動詞,
  非自立可能,
  文語助動詞_ナリ_伝聞,
  文語助動詞_ナリ_断定,
  未然形_,
  名詞,
  終止形_一般,
  連用形_,
} from "../types/pos.js";
import type { RuntimeHaruToken, SeparationEvidence, SourceTokenSpan } from "../types/token.js";
import { isColloquialNaiNeeSurface } from "./semantics/sfp-surface.js";
import type { TokenCursor } from "./token-cursor.js";

export interface MatcherToken {
  surface: string;
  normalizedForm?: string;
  dictionaryForm: string;
  pos: number;
  reading?: string;
  dictionaryFormReading?: string;
  dictionaryId?: number;
  sourceOrdinal?: number;
  sourceSpan?: SourceTokenSpan | null;
  numericCounterHeadForm?: string;
  latinNotationTransliteration?: string;
  whitespaceBefore?: SeparationEvidence;
  transparentPauseAfter?: boolean;
}

export function runtimeToken(token: MatcherToken): RuntimeHaruToken {
  return {
    surface: token.surface,
    ...(token.normalizedForm !== undefined ? { normalizedForm: token.normalizedForm } : {}),
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? "",
    dictionaryFormReading: token.dictionaryFormReading ?? "",
    pos: token.pos,
    dictionaryId: token.dictionaryId ?? -1,
    ...(token.sourceOrdinal !== undefined ? { sourceOrdinal: token.sourceOrdinal } : {}),
    ...(token.sourceSpan !== undefined ? { sourceSpan: token.sourceSpan } : {}),
    ...(token.numericCounterHeadForm !== undefined ? { numericCounterHeadForm: token.numericCounterHeadForm } : {}),
    ...(token.latinNotationTransliteration !== undefined ? { latinNotationTransliteration: token.latinNotationTransliteration } : {})
  };
}

export function runtimeTokens(tokens: readonly MatcherToken[]): RuntimeHaruToken[] {
  return tokens.map(runtimeToken);
}

export const runtimeAuxTokens = runtimeTokens;

export function runtimeTokensFromMatcher(tokens: readonly MatcherToken[]): readonly RuntimeHaruToken[] {
  return tokens.map((token) => ({
    surface: token.surface,
    ...(token.normalizedForm !== undefined ? { normalizedForm: token.normalizedForm } : {}),
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? token.surface,
    dictionaryFormReading: token.dictionaryFormReading ?? token.reading ?? token.surface,
    pos: token.pos,
    dictionaryId: token.dictionaryId ?? -1,
    ...(token.sourceOrdinal !== undefined ? { sourceOrdinal: token.sourceOrdinal } : {}),
    ...(token.sourceSpan !== undefined ? { sourceSpan: token.sourceSpan } : {}),
    ...(token.numericCounterHeadForm !== undefined ? { numericCounterHeadForm: token.numericCounterHeadForm } : {}),
    ...(token.latinNotationTransliteration !== undefined ? { latinNotationTransliteration: token.latinNotationTransliteration } : {})
  }));
}


export type AuxTokens = readonly MatcherToken[];

export const EMPTY_AUX: AuxTokens = Object.freeze([]);


export function isParticleSurface(token: MatcherToken, ...surfaces: readonly string[]): boolean {
  return (token.pos & POS0) === 助詞 && surfaces.includes(token.surface);
}

export function isVerbLemma(token: MatcherToken, ...lemmas: readonly string[]): boolean {
  return (token.pos & POS0) === 動詞 && lemmas.includes(token.dictionaryForm);
}

export function isVerbLemmaIn(token: MatcherToken, lemmas: ReadonlySet<string>): boolean {
  return (token.pos & POS0) === 動詞 && lemmas.has(token.dictionaryForm);
}

export function isAdjNai(token: { readonly surface: string; readonly dictionaryForm?: string; readonly reading?: string; readonly pos: number }): boolean {
  return ((token.pos & POS0) === 形容詞0 && (
    token.dictionaryForm === "ない" ||
    token.dictionaryForm === "無い" ||
    token.reading === "ナイ"
  )) || isColloquialNaiAdjectiveAuxToken(token);
}

export function isKotoNoun(token: MatcherToken): boolean {
  return (token.pos & POS0) === 名詞 && ["こと", "事"].includes(token.surface);
}

function collectAuxCore(cursor: TokenCursor<MatcherToken>, includeAdjNai: boolean): MatcherToken[] {
  const aux: MatcherToken[] = [];
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      break;
    }
    if ((token.pos & POS0) === 助動詞) {
      aux.push(token);
      continue;
    }
    if (isColloquialNaiAuxToken(cursor.tokens, index, cursor.pos)) {
      aux.push(colloquialNaiAuxToken(token));
      continue;
    }
    if (isCollectibleColloquialNaiAdjectiveAuxToken(cursor.tokens, index, cursor.pos)) {
      aux.push(colloquialNaiAuxToken(token));
      continue;
    }
    if (includeAdjNai && isAuxCollectibleNaiAdjective(token)) {
      aux.push({
        ...token,
        pos: normalizeNaiAdjectivePos(token.pos)
      });
      continue;
    }
    break;
  }
  return aux;
}

export function collectAuxTokens(cursor: TokenCursor<MatcherToken>): AuxTokens {
  const aux = collectAuxCore(cursor, false);
  cursor.advance(aux.length);
  return aux;
}

export function collectAuxWithAdjNai(cursor: TokenCursor<MatcherToken>): readonly MatcherToken[] {
  return collectAuxCore(cursor, true);
}


export function auxHasPast(auxTokens: Iterable<MatcherToken>): boolean {
  return [...auxTokens].some((token) => (token.pos & POS4) === 助動詞_タ);
}

export function auxHasPolite(auxTokens: Iterable<MatcherToken>): boolean {
  return [...auxTokens].some((token) => {
    const p4 = token.pos & POS4;
    return p4 === 助動詞_マス || p4 === 助動詞_デス;
  });
}

export function auxHasNegation(auxTokens: Iterable<MatcherToken>): boolean {
  return [...auxTokens].some((token) => {
    const p4 = token.pos & POS4;
    return p4 === 助動詞_ナイ || p4 === 助動詞_ヌ;
  });
}

export function auxHasCausative(auxTokens: Iterable<MatcherToken>): boolean {
  return [...auxTokens].some((token) => token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

export function auxHasNegativePolite(auxTokens: Iterable<MatcherToken>): boolean {
  const tokens = [...auxTokens];
  return auxHasPolite(tokens) && tokens.some((token) => (token.pos & POS4) === 助動詞_ヌ);
}

export function auxHasConditionalNara(auxTokens: Iterable<MatcherToken>): boolean {
  return [...auxTokens].some((token) =>
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_) &&
    token.surface === "なら"
  );
}

export function auxIsPolite(auxTokens: Iterable<MatcherToken>): boolean {
  return auxHasPolite(auxTokens) || auxHasNegativePolite(auxTokens);
}

export function isCopulaDaOrDesuDictionaryForm(token: { readonly dictionaryForm?: string }): boolean {
  return token.dictionaryForm === "だ" || token.dictionaryForm === "です";
}

export function isCopulaDaDeRenyouToken(token: { readonly surface: string; readonly dictionaryForm?: string; readonly pos: number }): boolean {
  return token.surface === "で" && token.dictionaryForm === "だ" && (token.pos & (POS0 | POS5A)) === (助動詞 | 連用形_);
}

export function isCopulaLikeToken(token: { readonly dictionaryForm?: string; readonly pos: number }): boolean {
  const pos4 = token.pos & POS4;
  return token.dictionaryForm === "だ" || token.dictionaryForm === "です" || pos4 === 助動詞_ダ || pos4 === 助動詞_デス;
}

function isAuxCollectibleNaiAdjective(token: MatcherToken): boolean {
  return (token.pos & POS01) === (形容詞0 | 非自立可能) &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
}

function isColloquialNaiAdjectiveAuxToken(token: { readonly surface: string; readonly pos: number }): boolean {
  return (token.pos & POS01) === (形容詞0 | 非自立可能) &&
    isColloquialNaiNeeSurface(token.surface);
}

function isCollectibleColloquialNaiAdjectiveAuxToken(tokens: readonly MatcherToken[], index: number, auxStart: number): boolean {
  const token = tokens[index];
  if (token === undefined || !isColloquialNaiAdjectiveAuxToken(token)) {
    return false;
  }
  if (index > auxStart) {
    return true;
  }
  const host = tokens[index - 1];
  if (host === undefined) {
    return false;
  }
  const hostPos0 = host.pos & POS0;
  if (hostPos0 === 動詞) {
    return isColloquialNaiHostForm(host);
  }
  if (hostPos0 === 形容詞0) {
    return (host.pos & POS5A) === 連用形_;
  }
  return false;
}

function normalizeNaiAdjectivePos(pos: number): number {
  return (pos & ~(POS0 | POS4)) | 助動詞 | 助動詞_ナイ;
}

function isColloquialNaiAuxToken(tokens: readonly MatcherToken[], index: number, auxStart: number): boolean {
  if (index !== auxStart) {
    return false;
  }
  const token = tokens[index];
  const host = tokens[index - 1];
  if (
    token === undefined ||
    host === undefined ||
    !isColloquialNaiNeeSurface(token.surface) ||
    (token.pos & POS01) !== 助詞_終助詞 ||
    (host.pos & POS0) !== 動詞
  ) {
    return false;
  }
  return isColloquialNaiHostForm(host);
}

function colloquialNaiAuxToken(token: MatcherToken): MatcherToken {
  return {
    ...token,
    dictionaryForm: "ない",
    dictionaryFormReading: token.dictionaryFormReading ?? "ナイ",
    pos: (token.pos & ~(POS01 | POS4 | POS5A)) | 助動詞 | 助動詞_ナイ | 終止形_一般
  };
}

export function isClassicalNariMizenNaraToken(token: MatcherToken | undefined): boolean {
  if (token === undefined || token.surface !== "なら") {
    return false;
  }
  const pos4 = token.pos & POS4;
  return (
    (pos4 === 文語助動詞_ナリ_伝聞 || pos4 === 文語助動詞_ナリ_断定 || token.dictionaryForm === "なり") &&
    (token.pos & POS5A) === 未然形_
  );
}

export function isClassicalNuRenyouZuToken(token: MatcherToken | undefined): boolean {
  if (token === undefined || token.surface !== "ず") {
    return false;
  }
  const pos4 = token.pos & POS4;
  return (
    (pos4 === 助動詞_ヌ || token.dictionaryForm === "ず" || token.dictionaryForm === "ぬ") &&
    (token.pos & POS5A) === 連用形_
  );
}

function isColloquialNaiHostForm(host: MatcherToken): boolean {
  const form = host.pos & POS5A;
  if (form === 未然形_) {
    return true;
  }
  if (form !== 連用形_) {
    return false;
  }
  const conj = host.pos & POS4;
  return is上一段(host.pos) || is下一段(host.pos) || conj === サ行変格 || conj === カ行変格;
}
