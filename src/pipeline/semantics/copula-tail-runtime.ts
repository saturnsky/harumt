import type { RuntimeHaruToken } from "../../types/token.js";
import type { IrregularType } from "../../generator/conjugator.js";
import { collectAuxTokens, isCopulaDaDeRenyouToken, isCopulaLikeToken } from "../matchers.js";
import type { MetadataEntry } from "../translation/metadata.js";
import { copulaDeMarkerRelationForToken, kaMarkerRelationAt, predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { isAffirmativeCopulaSupportVerbToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { hasHardTerminalPunctuationClass } from "../head-tail/boundary/punctuation.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { compositeConnectivePatternRelationAt } from "../head-tail/tail/connective-span-scanner.js";
import { lookupConnectiveBySurface } from "../head-tail/tail/predicate-root/grammar.js";
import { hasTerminalSentenceMark } from "./terminal-runtime.js";
import { isKanaQuestionNaParticleSurface, isTerminalNeSfpSurface, isTerminalSkipSfpSurface, isTerminalYoSfpSurface } from "./sfp-surface.js";
import { TokenCursor } from "../token-cursor.js";

import {
  POS0,
  POS01,
  POS4,
  POS5A,
  isNaAdjectiveDerivationalSuffix,
  isNaAdjCapableNoun,
  終助詞,
  助詞,
  助詞_格助詞,
  助詞_係助詞,
  助詞_終助詞,
  助詞_接続助詞,
  助詞_副助詞,
  助動詞,
  助動詞_ダ,
  助動詞_デス,
  動詞,
  補助記号,
  連用形_,
  대명사,
  동사,
  명사,
  수사,
  접미사,
  형용사, 接尾辞_名詞的,
} from "../../types/pos.js";
export interface CopulaTailRuntimeToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export interface CopulaTailHostUnit {
  readonly koreanPos: number;
  readonly discourseConnective?: boolean;
  readonly jpHead: {
    readonly dictionaryForm: string;
    readonly pos?: number;
  };
}

export interface CopulaTailWithOptionalConditionalMatch {
  readonly auxTokens: readonly RuntimeHaruToken[];
  readonly consumed: number;
  readonly connective: string | null;
  readonly connectiveBeforeWeakBoundary: string | null;
}

const TRAILING_COPULA_CONNECTIVE_HOST_POS = new Set([명사, 대명사, 수사]);
const TRAILING_COPULA_ADVERBS = new Set([
  "これから",
  "それから",
  "あれから",
  "これまで",
  "それまで",
  "あれまで",
  "どのくらい",
  "このあと",
  "そのあと",
  "あのあと",
  "あのころ"
]);

export const ORPHAN_CONN_MAP: Readonly<Record<string, string>> = {
  "が": "하지만",
  "けど": "하지만",
  "けれど": "하지만",
  "から": "그러니까",
  "し": "게다가"
};

export const ORPHAN_NANOCONN_MAP: Readonly<Record<string, string>> = {
  "で": "그래서",
  "に": "그런데도"
};

export function connectiveCompositeTokenCountAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  limit: number
): number {
  const marker = tokens[markerIdx];
  if (marker === undefined) {
    return 1;
  }
  const relation = compositeConnectivePatternRelationAt(
    new TokenCursor(tokens, markerIdx, limit, markerIdx),
    { consumers: ["copula_tail_runtime"], lookupConnectiveKind: lookupConnectiveBySurface }
  );
  if (relation === null) {
    return 1;
  }
  const markerKind = lookupConnectiveBySurface(marker.surface);
  return markerKind !== undefined && relation.connectiveKind === markerKind ? relation.tokenCount : 1;
}

export function isPrefaceConnectiveCopulaHostAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const leftIdx = previousNonSpaceIndex(tokens, copulaIdx);
  if (leftIdx === null) {
    return false;
  }
  const left = tokens[leftIdx];
  if (left === undefined) {
    return false;
  }
  if ((left.pos & POS01) === 助詞_接続助詞) {
    return true;
  }
  if ((left.pos & POS01) !== 助詞_係助詞) {
    return false;
  }
  const focusHostIdx = previousNonSpaceIndex(tokens, leftIdx);
  const focusHost = focusHostIdx === null ? undefined : tokens[focusHostIdx];
  return focusHost !== undefined && (focusHost.pos & POS01) === 助詞_接続助詞;
}

export interface TrailingCopulaConnectiveTail {
  readonly ending: string;
  readonly politeEnding: string | null;
  readonly politeFormalEnding: string | null;
}

export function trailingCopulaConnectiveTailDetailed(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly prefaceHost?: boolean } = {}
): TrailingCopulaConnectiveTail | null {
  const start = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  const token = cursor.tokens[start];
  if (start >= cursor.end || token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  if ((token.pos & POS01) !== 助詞_接続助詞) {
    return null;
  }
  const nominalEnding = lookups.DEARU_CONN_ENDINGS.get(token.surface);
  if (nominalEnding === undefined) {
    return null;
  }
  const preface = options.prefaceHost === true;
  const ending = preface
    ? lookups.PREFACE_DEARU_CONN_ENDINGS.get(token.surface) ?? nominalEnding
    : nominalEnding;
  const consumed = connectiveCompositeTokenCountAt(cursor.tokens, start, cursor.end);
  cursor.advance((start - cursor.pos) + consumed);
  return {
    ending,
    politeEnding: preface ? lookups.PREFACE_DEARU_CONN_ENDINGS_POLITE.get(token.surface) ?? null : null,
    politeFormalEnding: preface ? lookups.PREFACE_DEARU_CONN_ENDINGS_POLITE_FORMAL.get(token.surface) ?? null : null
  };
}

export function trailingCopulaConnectiveTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly prefaceHost?: boolean } = {}
): string | null {
  return trailingCopulaConnectiveTailDetailed(cursor, lookups, options)?.ending ?? null;
}

export function matchCopulaTailWithOptionalConditional(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly skipLeadingSpace?: boolean } = {}
): CopulaTailWithOptionalConditionalMatch | null {
  const { tokens, pos: start, end: limit } = cursor;
  const firstIndex = options.skipLeadingSpace === true
    ? nextNonSpaceIndex(tokens, start, limit)
    : start;
  const first = firstIndex === null ? undefined : tokens[firstIndex];
  if (firstIndex === null || first === undefined || firstIndex >= limit) {
    return null;
  }
  if (isBareConditionalCopulaToken(first)) {
    return {
      auxTokens: [],
      consumed: firstIndex - start + 1,
      connective: "라면",
      connectiveBeforeWeakBoundary: null,
    };
  }
  if (first.surface === "であれば") {
    return {
      auxTokens: [],
      consumed: firstIndex - start + 1,
      connective: "라면",
      connectiveBeforeWeakBoundary: null,
    };
  }
  if (!isCopulaAuxToken(first)) {
    return null;
  }
  const baseAux = collectAuxTokens(cursor.fork(firstIndex, limit)) as readonly RuntimeHaruToken[];
  if (baseAux.length === 0) {
    return null;
  }
  const afterBaseAux = firstIndex + baseAux.length;
  const support = tokens[afterBaseAux];
  if (!isCopulaAruSupportToken(support)) {
    const conditional = splitConditionalCopulaAuxTokens(baseAux);
    return {
      auxTokens: conditional.auxTokens,
      consumed: firstIndex - start + baseAux.length,
      connective: conditional.connective,
      connectiveBeforeWeakBoundary: conditional.connective === null && isCopulaRenyouDeToken(first) ? "고" : null,
    };
  }
  const supportAux = collectAuxTokens(cursor.fork(afterBaseAux + 1, limit)) as readonly RuntimeHaruToken[];
  const supportConditional = splitConditionalCopulaAuxTokens(supportAux);
  return {
    auxTokens: supportConditional.connective === null
      ? [...baseAux, ...supportAux]
      : [...baseAux, ...supportConditional.auxTokens],
    consumed: firstIndex - start + baseAux.length + 1 + supportAux.length,
    connective: supportConditional.connective,
    connectiveBeforeWeakBoundary: null,
  };
}

function isCopulaRenyouDeToken(token: RuntimeHaruToken): boolean {
  return isCopulaDaDeRenyouToken(token);
}

function isCopulaAruSupportToken(token: RuntimeHaruToken | undefined): boolean {
  return isAffirmativeCopulaSupportVerbToken(token);
}

export function isCopulaSupportChainStartAt(
  tokens: readonly CopulaTailRuntimeToken[],
  deIdx: number
): boolean {
  const de = tokens[deIdx];
  return de !== undefined &&
    (de.pos & POS4) === 助動詞_ダ &&
    (de.pos & POS5A) === 連用形_ &&
    copulaDeMarkerRelationForToken(de, deIdx, { consumers: ["copula_rules"] }) !== null &&
    isAffirmativeCopulaSupportVerbToken(tokens[deIdx + 1]);
}

function isBareConditionalCopulaToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "なら" &&
    token.dictionaryForm === "だ" &&
    (token.pos & POS0) === 助動詞;
}

function splitConditionalCopulaAuxTokens(auxTokens: readonly RuntimeHaruToken[]): { readonly auxTokens: readonly RuntimeHaruToken[]; readonly connective: string | null } {
  const naraIndex = auxTokens.findIndex(isBareConditionalCopulaToken);
  if (naraIndex < 0) {
    return { auxTokens, connective: null };
  }
  return {
    auxTokens: auxTokens.slice(0, naraIndex),
    connective: "라면",
  };
}

export function matchOrphanCopulaConn(
  cursor: TokenCursor<CopulaTailRuntimeToken>
): readonly [korean: string, consumed: number] | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const token = tokens[i];
  if (i + 1 >= n) {
    return undefined;
  }
  const next = tokens[i + 1];
  if (
    token === undefined ||
    next === undefined ||
    (token.dictionaryForm !== "だ" && token.dictionaryForm !== "です") ||
    (next.pos & POS01) !== 助詞_接続助詞
  ) {
    return undefined;
  }
  const korean = ORPHAN_CONN_MAP[next.surface];
  if (korean === undefined) {
    return undefined;
  }
  const consumed = i + 2 < n &&
    ((tokens[i + 2]?.pos ?? 0) & POS01) === 助詞_係助詞 &&
    tokens[i + 2]?.surface === "も"
    ? 3
    : 2;
  return [korean, consumed];
}

export function matchOrphanNanoconn(
  cursor: TokenCursor<CopulaTailRuntimeToken>
): readonly [korean: string, consumed: number] | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const token = tokens[i];
  const no = tokens[i + 1];
  const conn = tokens[i + 2];
  if (token === undefined || no === undefined || conn === undefined || i + 2 >= n) {
    return undefined;
  }
  if ((token.pos & POS0) !== 助動詞 || token.surface !== "な" || (token.dictionaryForm !== "だ" && token.dictionaryForm !== "です")) {
    return undefined;
  }
  if (predicateNominalizerRelationForToken(no, i + 1, {
    requirement: "tail_connective_marker",
    consumers: ["copula_tail_runtime"]
  })?.nominalizerKind !== "no") {
    return undefined;
  }
  const korean = ORPHAN_NANOCONN_MAP[conn.surface];
  return korean === undefined ? undefined : [korean, 3];
}

export function canHostTrailingCopula(previousUnit: CopulaTailHostUnit | undefined, preceding: string): boolean {
  if (previousUnit === undefined || preceding.length === 0 || isDiscourseConnectiveUnit(previousUnit)) {
    return false;
  }
  if (TRAILING_COPULA_ADVERBS.has(previousUnit.jpHead.dictionaryForm)) {
    return true;
  }
  if (TRAILING_COPULA_CONNECTIVE_HOST_POS.has(previousUnit.koreanPos)) {
    return true;
  }
  return isBoundNominalSuffixHost(previousUnit) ||
    isNaAdjectiveSuffixHost(previousUnit) ||
    isParticlePhraseHost(previousUnit);
}

export function canHostTrailingCopulaConnective(previousUnit: CopulaTailHostUnit | undefined, preceding: string): boolean {
  if (previousUnit === undefined || preceding.length === 0 || isDiscourseConnectiveUnit(previousUnit)) {
    return false;
  }
  if (TRAILING_COPULA_CONNECTIVE_HOST_POS.has(previousUnit.koreanPos)) {
    return true;
  }
  return isBoundNominalSuffixHost(previousUnit) ||
    isNaAdjectiveSuffixHost(previousUnit) ||
    isParticlePhraseHost(previousUnit);
}

function isDiscourseConnectiveUnit(unit: CopulaTailHostUnit): boolean {
  return unit.discourseConnective === true;
}

function isParticlePhraseHost(unit: CopulaTailHostUnit): boolean {
  const pos = unit.jpHead.pos;
  if (pos === undefined || (pos & POS0) !== 助詞) {
    return false;
  }
  const pos01 = pos & POS01;
  return pos01 === 助詞_格助詞 || pos01 === 助詞_副助詞;
}

function isBoundNominalSuffixHost(unit: CopulaTailHostUnit): boolean {
  const pos = unit.jpHead.pos;
  return unit.koreanPos === 접미사 && pos !== undefined && (pos & POS01) === 接尾辞_名詞的;
}

function isNaAdjectiveSuffixHost(unit: CopulaTailHostUnit): boolean {
  const pos = unit.jpHead.pos;
  return unit.koreanPos === 접미사 && pos !== undefined && isNaAdjectiveDerivationalSuffix({ pos });
}

export function trailingCopulaTariTail(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const start = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  const token = cursor.tokens[start];
  if (start >= cursor.end || token === undefined) {
    return false;
  }
  if (token.surface === "たり" && (token.pos & POS01) === 助詞_副助詞) {
    cursor.advance((start - cursor.pos) + 1);
    return true;
  }
  return false;
}

export function trailingCopulaSfpTail(
  cursor: TokenCursor<RuntimeHaruToken>
): string | null {
  const start = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  const token = cursor.tokens[start];
  if (start >= cursor.end || token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
    return null;
  }
  if (isTerminalYoSfpSurface(token) && start + 1 < cursor.end) {
    const next = cursor.tokens[start + 1];
    if (
      next !== undefined
      && (next.pos & POS01) === 助詞_終助詞
      && isTerminalNeSfpSurface(next)
    ) {
      const after = nextNonSpaceIndex(cursor.tokens, start + 2, cursor.end) ?? cursor.end;
      if (after >= cursor.end || ((cursor.tokens[after]?.pos ?? 0) & POS0) === 補助記号) {
        cursor.advance((start - cursor.pos) + 2);
        return "ne";
      }
    }
  }
  const after = nextNonSpaceIndex(cursor.tokens, start + 1, cursor.end) ?? cursor.end;
  if (after < cursor.end && ((cursor.tokens[after]?.pos ?? 0) & POS0) !== 補助記号) {
    return null;
  }
  if (isTerminalNeSfpSurface(token)) {
    cursor.advance((start - cursor.pos) + 1);
    return "ne";
  }
  if (isKanaQuestionNaParticleSurface(token)) {
    cursor.advance((start - cursor.pos) + 1);
    return "na_excl";
  }
  if (isTerminalSkipSfpSurface(token)) {
    cursor.advance((start - cursor.pos) + 1);
    return "sfp_yo";
  }
  return null;
}

export { hasTerminalSentenceMark };


export function resolveCopulaAdj(
  entry: MetadataEntry | null | undefined,
  koreanLemma: string,
  koreanPos: number,
  irregular: IrregularType | null | undefined,
  jpPos: number | null | undefined
): readonly [string, number, IrregularType | null | undefined] {
  if (koreanPos !== 명사 || jpPos === undefined || jpPos === null || jpPos === 0 || !isNaAdjCapableNoun({ pos: jpPos })) {
    return [koreanLemma, koreanPos, irregular];
  }
  for (const translation of entry?.senses ?? []) {
    if (translation.koreanPos === 형용사 || translation.koreanPos === 동사) {
      return [translation.korean, translation.koreanPos, translation.irregular];
    }
  }
  return [koreanLemma, koreanPos, irregular];
}


export function isCopulaAuxToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  return isCopulaLikeToken(token);
}

export function terminalQuestionTail(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly absorbPeriod: boolean } | null {
  const start = cursor.pos;
  const tokens = cursor.tokens;
  const n = cursor.end;
  const i = nextNonSpaceIndex(tokens, start, n) ?? n;
  if (i >= n) {
    return null;
  }
  if (kaMarkerRelationAt(tokens, i, ["terminal_runtime"])?.particleSubtype1 !== 終助詞) {
    return null;
  }
  const j = nextNonSpaceIndex(tokens, i + 1, n) ?? n;
  if (j >= n) {
    cursor.advance((i + 1) - start);
    return { absorbPeriod: true };
  }
  if (((tokens[j]?.pos ?? 0) & POS0) === 補助記号) {
    if (hasHardTerminalPunctuationClass(tokens[j], j, ["japanese_period"], ["terminal_runtime"])) {
      cursor.advance((j + 1) - start);
      return { absorbPeriod: true };
    }
    if (hasHardTerminalPunctuationClass(tokens[j], j, ["question"], ["terminal_runtime"])) {
      cursor.advance((i + 1) - start);
      return { absorbPeriod: false };
    }
  }
  cursor.advance((i + 1) - start);
  return { absorbPeriod: false };
}
