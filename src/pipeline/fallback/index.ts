import { NASAL_VOCALIZATION_RUN_REASON, STANDALONE_SMALL_KANA_REASON } from "../preprocess/youon-remerge.js";
import { applyInitialDueum, hanjaToHangul } from "../../generator/hanja.js";
import { formatCounterPhrase, parseJapaneseNumber, readNumeralToken, sinoKorean } from "../../generator/numerals.js";
import {
  generateKoreanReadings,
  isLoanwordKatakana,
  normalizeKana,
  renderKatakanaWithDict,
  renderTokens,
  tokenizeKana,
  type ReadingRule
} from "../../generator/readings.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import type { HaruTokenRuntimeFields } from "../../types/token.js";
import { mergeRuntimeTokenSourceIdentity, rewriteRuntimeTokenSurface, splitBoundaryRuntimeStateForPieces, splitTrailingBoundaryRuntimeState, withRuntimeTokenSourceSpan } from "../../types/token.js";
import { honorificClusterSuffixOverride, type HonorificClusterOverrideLookups } from "../honorific-nominal-cluster.js";
import { CONTENT_POS_BITS } from "../lookup-tables.js";
import { readExtentPhraseAt } from "../semantics/extent-phrase.js";
import { TokenCursor } from "../token-cursor.js";
import { translationForKorean } from "../translation/metadata.js";

import {
  POS0,
  POS01,
  POS012,
  POS1,
  POS2,
  POS3,
  POS4,
  POS5,
  POS5A,
  posFromStrings,
  感動詞,
  記号,
  形状詞,
  形容詞0,
  固有名詞,
  地名,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_タイ,
  人名,
  数詞,
  姓,
  接続詞,
  接頭辞,
  接尾辞,
  代名詞,
  動詞,
  副詞,
  補助記号,
  名,
  名詞,
  名詞_固有名詞,
  名詞_固有名詞_地名,
  名詞_普通名詞,
  未然形_一般,
  連体詞,
  連体形_,
  連用形_,
  isLexicalPureNaAdjStem,
  下一段_サ行,
  五段_カ行,
  五段_ガ行,
  五段_サ行,
  五段_タ行,
  五段_ナ行,
  五段_バ行,
  五段_マ行,
  五段_ラ行,
  五段_ワア行,
  감탄사,
  관형사,
  동사,
  명사,
  부사,
  접속사,
  형용사,
  기호,
  INFLECTABLE_BITS, NOMINAL_KEIJOU_BITS, isCounterCapableToken, isNumeralToken, pos0in,
  isKoreanNounAble,
  koreanNounLemma,
  isAuxiliaryStemToken,
  isSymbolCharacterToken, isProperPlaceNameToken,
} from "../../types/pos.js";
export type ChainSegment =
  | { readonly kind: "consume"; readonly text: string }
  | { readonly kind: "preserve"; readonly text: string }
  | { readonly kind: "kata"; readonly reading: string };

export interface PosSurfaceToken {
  readonly surface?: string;
  readonly pos?: number;
}

export interface FallbackToken extends HaruTokenRuntimeFields {
  surface: string;
  dictionaryForm: string;
  reading: string;
  dictionaryFormReading: string;
  pos: number;
  dictionaryId?: number;
  splitA?: readonly FallbackToken[];
  splitB?: readonly FallbackToken[];
}

export interface FallbackDictionaryEntry extends MorphemeEntry {
  senses?: readonly MorphemeSense[];
  synthetic?: boolean;
  syntheticReason?: string;
}

export interface FallbackDictionary {
  readonly formOnlyIndex?: ReadonlyMap<string, readonly FallbackDictionaryEntry[]>;
  lookup?(dictionaryForm: string, reading: string, pos: number | string | readonly string[]): Promise<FallbackDictionaryEntry | null | undefined>;
  lookupTokenRelaxed?(token: FallbackToken): Promise<FallbackDictionaryEntry | undefined>;
  findKatakanaTransliteration?(kana: string, options?: { readonly preferNameRole?: boolean }): Promise<string | undefined>;
  findKoreanByReading?(kana: string, surface?: string): string | undefined;
  resolveSubtokenSenses?(entry: FallbackDictionaryEntry, subtokens: readonly FallbackToken[], index: number): FallbackDictionaryEntry;
}

export interface NumericSplits {
  match(tokens: readonly FallbackToken[], index: number): readonly [number, readonly FallbackToken[]] | undefined | null;
}

export const JP_POS_TO_KR: Record<string, number> = {
  "動詞": 동사,
  "形容詞": 형용사,
  "形状詞": 형용사,
  "名詞": 명사,
  "副詞": 부사,
  "連体詞": 관형사,
  "代名詞": 명사,
  "接続詞": 접속사,
  "感動詞": 감탄사
};

export const JP_POS_TO_KR_NUM: ReadonlyMap<number, number> = new Map([
  [動詞, 동사],
  [形容詞0, 형용사],
  [形状詞, 형용사],
  [名詞, 명사],
  [副詞, 부사],
  [連体詞, 관형사],
  [代名詞, 명사],
  [接続詞, 접속사],
  [感動詞, 감탄사]
]);

export const PASSTHROUGH_POS = new Set(["補助記号", "記号"]);
export const PASSTHROUGH_POS_BITS = (1 << 補助記号) | (1 << 記号);

const NON_LEXICAL_SYMBOL_CHAR = /^[\p{P}\p{S}]$/u;

export function isNonLexicalSymbolSurface(surface: string | undefined): boolean {
  if (surface === undefined || surface.length === 0) {
    return false;
  }
  return Array.from(surface).every((char) => NON_LEXICAL_SYMBOL_CHAR.test(char));
}

export function isSymbolCounterToken(token: { readonly surface: string; readonly pos: number }): boolean {
  return isNonLexicalSymbolSurface(token.surface) && isCounterCapableToken(token);
}

function symbolCounterHasNumeralEvidence(
  tokens: readonly { readonly pos: number }[],
  idx: number
): boolean {
  for (let index = idx - 1; index >= 0; index -= 1) {
    const previous = tokens[index];
    if (previous === undefined) {
      return false;
    }
    return isNumeralToken(previous);
  }
  return false;
}

export function isLexicalSymbolTokenAt(
  tokens: readonly { readonly surface: string; readonly pos: number }[],
  idx: number
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    isSymbolCounterToken(token) &&
    symbolCounterHasNumeralEvidence(tokens, idx);
}

export function isNonLexicalSymbolTokenAt(
  tokens: readonly { readonly surface: string; readonly pos: number }[],
  idx: number
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    isNonLexicalSymbolSurface(token.surface) &&
    !isLexicalSymbolTokenAt(tokens, idx);
}

export function isNonLexicalSymbolToken(token: { readonly surface: string; readonly pos: number }): boolean {
  return isNonLexicalSymbolSurface(token.surface) && !isSymbolCounterToken(token);
}

export const NONPREDICATE_CONTENT_POS = new Set(["名詞", "代名詞", "副詞", "連体詞", "接続詞", "感動詞"]);
export const NONPREDICATE_CONTENT_POS_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 副詞) | (1 << 連体詞) | (1 << 接続詞) | (1 << 感動詞);
const FUNCTIONAL_SPLIT_POS_BITS = (1 << 助詞) | (1 << 助動詞);

const SERU_CAUSATIVE_STEM_RESTORE: ReadonlyMap<string, {
  readonly surfaceEnding: string;
  readonly readingSource: string;
  readonly readingEnding: string;
  readonly conjugationType: number;
}> = new Map([
  ["か", { surfaceEnding: "く", readingSource: "カ", readingEnding: "ク", conjugationType: 五段_カ行 }],
  ["が", { surfaceEnding: "ぐ", readingSource: "ガ", readingEnding: "グ", conjugationType: 五段_ガ行 }],
  ["さ", { surfaceEnding: "す", readingSource: "サ", readingEnding: "ス", conjugationType: 五段_サ行 }],
  ["た", { surfaceEnding: "つ", readingSource: "タ", readingEnding: "ツ", conjugationType: 五段_タ行 }],
  ["な", { surfaceEnding: "ぬ", readingSource: "ナ", readingEnding: "ヌ", conjugationType: 五段_ナ行 }],
  ["ば", { surfaceEnding: "ぶ", readingSource: "バ", readingEnding: "ブ", conjugationType: 五段_バ行 }],
  ["ま", { surfaceEnding: "む", readingSource: "マ", readingEnding: "ム", conjugationType: 五段_マ行 }],
  ["ら", { surfaceEnding: "る", readingSource: "ラ", readingEnding: "ル", conjugationType: 五段_ラ行 }],
  ["わ", { surfaceEnding: "う", readingSource: "ワ", readingEnding: "ウ", conjugationType: 五段_ワア行 }]
]);

export const CHAIN_A_SEPARATORS = new Set(["・", "･", "=", "＝"]);
export const CHAIN_B_SEPARATORS = new Set(["＆", "&", "/", "／", "〜", "~", "+", "＋"]);

export const FOREIGN_FUNCTION_WORDS = new Set([
  "ド", "デ", "ダ",
  "デュ",
  "フォン",
  "バン",
  "オブ",
  "トゥ",
  "ラ", "レ",
  "ル",
  "ザ",
  "アンド",
  "ウント",
  "エト",
  "ヴァン", "ヴォン",
  "ビン", "ベン",
  "イ"
]);

export const PLACE_ADMIN_SUFFIX: Record<string, string> = {
  "県\u0000ケン": "현",
  "市\u0000シ": "시",
  "郡\u0000グン": "군",
  "都\u0000ト": "도",
  "府\u0000フ": "부",
  "区\u0000ク": "구",
  "道\u0000ドウ": "도",
  "町\u0000チョウ": "정",
  "町\u0000マチ": "정",
  "村\u0000ソン": "촌",
  "村\u0000ムラ": "촌"
};

export function isHanjaChar(ch: string): boolean {
  return ("一" <= ch && ch <= "鿿") || ("㐀" <= ch && ch <= "䶿");
}

import { isKana, isPureKatakanaSurface } from "../../utils/char-class.js";

export function isKanaChar(ch: string): boolean {
  return isKana(ch);
}

export { isPureKatakanaSurface };

export function isChainableKataToken(token: PosSurfaceToken): boolean {
  const pos = token.pos ?? 0;
  return pos0in(pos, NOMINAL_KEIJOU_BITS) && isPureKatakanaSurface(token.surface ?? "");
}

export function chainSeparatorSurface(token: PosSurfaceToken): string | undefined {
  const pos = token.pos ?? 0;
  if ((pos & POS0) !== 補助記号) {
    return undefined;
  }
  const surface = token.surface ?? "";
  return CHAIN_A_SEPARATORS.has(surface) || CHAIN_B_SEPARATORS.has(surface) ? surface : undefined;
}

export function chainGatePasses(chainTokens: readonly FallbackToken[], dictionary: FallbackDictionary): boolean {
  const kataTokens = chainTokens.filter(isChainableKataToken);
  const index = dictionary.formOnlyIndex;
  let compoundVotes = 0;
  let listVotes = 0;

  for (const token of kataTokens) {
    const reading = token.reading || token.surface;
    if (FOREIGN_FUNCTION_WORDS.has(reading)) {
      return true;
    }
    const entries = index?.get(reading);
    if (entries === undefined || entries.length === 0) {
      continue;
    }
    const hasNameRole = entries.some((entry) => {
      const pos = typeof entry.pos === "number" ? entry.pos : 0;
      return (pos & POS0) === 名詞 && (entry.senses ?? []).some((translation) => translationNameRole(translation) === true);
    });
    if (hasNameRole) {
      compoundVotes += 1;
    } else {
      listVotes += 1;
    }
  }

  return compoundVotes >= 1 && compoundVotes >= listVotes;
}

export function buildChainSynthetic(chainTokens: readonly FallbackToken[]): FallbackToken {
  const surfaceParts: string[] = [];
  const segments: ChainSegment[] = [];

  for (const token of chainTokens) {
    const surface = token.surface;
    surfaceParts.push(surface);
    if (CHAIN_A_SEPARATORS.has(surface)) {
      segments.push({ kind: "consume", text: surface });
    } else if (CHAIN_B_SEPARATORS.has(surface)) {
      segments.push({ kind: "preserve", text: surface });
    } else {
      segments.push({ kind: "kata", reading: token.reading || surface });
    }
  }

  const surface = surfaceParts.join("");
  const mergedReading = segments.map((segment) => segment.kind === "kata" ? segment.reading : segment.text).join("");
  const lexical = {
    dictionaryForm: surface,
    reading: mergedReading,
    dictionaryFormReading: mergedReading,
    pos: 名詞_固有名詞,
    syntheticReason: "katakana_chain_merged",
    chainSegments: segments
  } as const;
  const [first, ...rest] = chainTokens;
  const last = chainTokens[chainTokens.length - 1];
  if (first === undefined || last === undefined) {
    return { surface, ...lexical };
  }
  const rewritten = rewriteRuntimeTokenSurface(first, { kind: "merge", sources: chainTokens });
  const identityProvable = chainTokens.every(
    (token) => token.sourceSpan !== undefined && token.sourceSpan !== null
  );
  const merged = (identityProvable
    ? mergeRuntimeTokenSourceIdentity(rewritten, [first, ...rest])
    : withRuntimeTokenSourceSpan({
      ...splitTrailingBoundaryRuntimeState(rewritten).leading,
      ...splitTrailingBoundaryRuntimeState(last).trailing
    }, null)) as unknown as Record<string, unknown>;
  delete merged.dictionaryId;
  delete merged.normalizedForm;
  delete merged.splitA;
  delete merged.splitB;
  return { ...merged, surface, ...lexical } as unknown as FallbackToken;
}

export function isTaiSplitTail(subtokens: readonly PosSurfaceToken[]): boolean {
  if (subtokens.length < 2) {
    return false;
  }
  const last = subtokens[subtokens.length - 1];
  if (last?.pos === undefined || (last.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_タイ)) {
    return false;
  }
  return subtokens.slice(0, -1).some((subtoken) => subtoken.pos !== undefined && (subtoken.pos & POS0) === 動詞);
}

export function isPersonSurname(token: PosSurfaceToken): boolean {
  const pos = token.pos ?? 0;
  return (pos & (POS1 | POS2 | POS3)) === (固有名詞 | 人名 | 姓);
}

export function isPersonGivenName(token: PosSurfaceToken): boolean {
  const pos = token.pos ?? 0;
  return (pos & (POS1 | POS2 | POS3)) === (固有名詞 | 人名 | 名);
}

export function tryNumeralCompound(token: Pick<FallbackToken, "surface">): string | undefined {
  const surface = token.surface;
  for (let splitPos = 1; splitPos < surface.length; splitPos += 1) {
    const numPart = surface.slice(0, splitPos);
    const counterPart = surface.slice(splitPos);
    const parsed = parseJapaneseNumber(numPart);
    if (parsed !== undefined) {
      const result = formatCounterPhrase(parsed, counterPart);
      if (result !== null && result !== undefined) {
        return result;
      }
    }
  }
  return undefined;
}

export function splitFallbackKorean(entry: Pick<MorphemeEntry, "senses">): string {
  const senses = entry.senses ?? [];
  if (senses.length === 0) {
    return "";
  }
  const nounTranslation = senses.find((translation) => isKoreanNounAble(translation.koreanPos ?? 명사, translation.nominalized));
  if (nounTranslation !== undefined) {
    return koreanNounLemma(nounTranslation.korean, nounTranslation.koreanPos ?? 명사, nounTranslation.nominalized);
  }
  const fallback = translationForKorean(entry, null);
  const korean = fallback.korean ?? "";
  const koreanPos = fallback.koreanPos;
  if (koreanPos === 형용사 && korean.endsWith("하다")) {
    return korean.slice(0, -2);
  }
  return korean;
}

export class PipelineFallbackMixin {
  readonly dictionary: FallbackDictionary;
  readonly numeric: NumericTables;
  readonly numericSplits: NumericSplits | undefined;
  readonly readingFallbackRule: ReadingRule | undefined;

  constructor(options: {
    readonly dictionary: FallbackDictionary;
    readonly numeric: NumericTables;
    readonly numericSplits?: NumericSplits | undefined;
    readonly readingFallbackRule?: ReadingRule | undefined;
  }) {
    this.dictionary = options.dictionary;
    this.numeric = options.numeric;
    this.numericSplits = options.numericSplits;
    this.readingFallbackRule = options.readingFallbackRule;
  }

  mergeKatakanaNameChains(tokens: readonly FallbackToken[]): FallbackToken[] {
    const result: FallbackToken[] = [];
    const outer = new TokenCursor<FallbackToken>(tokens, 0, tokens.length);
    while (outer.pos < outer.end) {
      const token = outer.current();
      if (token === undefined || !isChainableKataToken(token)) {
        if (token !== undefined) {
          result.push(token);
        }
        outer.advance();
        continue;
      }

      const chain: FallbackToken[] = [token];
      const inner = outer.fork(outer.pos + 1, outer.end);
      while (inner.pos + 1 < inner.end) {
        const separator = inner.current();
        const next = inner.peek(1);
        if (separator === undefined || next === undefined || chainSeparatorSurface(separator) === undefined || !isChainableKataToken(next)) {
          break;
        }
        chain.push(separator, next);
        inner.advance(2);
      }

      const kataCount = chain.filter(isChainableKataToken).length;
      if (kataCount >= 2 && chainGatePasses(chain, this.dictionary)) {
        result.push(buildChainSynthetic(chain));
        outer.advance(inner.pos - outer.pos);
      } else {
        result.push(token);
        outer.advance();
      }
    }
    return result;
  }

  async renderChainSegments(segments: readonly ChainSegment[], rule: ReadingRule): Promise<string | undefined> {
    const mergedKata = segments.filter((segment) => segment.kind === "kata").map((segment) => segment.reading).join("・");
    const chainLoanword = isLoanwordKatakana(mergedKata, mergedKata);
    const parts: string[] = [];
    for (const segment of segments) {
      if (segment.kind === "consume") {
        if (parts.length > 0 && (parts[parts.length - 1] ?? "").endsWith(" ")) {
          continue;
        }
        parts.push(" ");
        continue;
      }
      if (segment.kind === "preserve") {
        parts.push(segment.text);
        continue;
      }
      const kana = segment.reading;
      const direct = await this.findKatakanaTransliteration(kana, { preferNameRole: true });
      let rendered: string | undefined;
      if (direct !== undefined) {
        rendered = direct;
      } else {
        const mixed = await renderKatakanaWithDict(kana, {
          surface: kana,
          findTransliteration: (candidate) => this.findKatakanaTransliteration(candidate),
          minMatches: isLoanwordKatakana(kana, kana) ? 1 : 2
        });
        if (mixed !== undefined) {
          rendered = mixed[rule];
        } else if (chainLoanword) {
          const ktokens = tokenizeKana(normalizeKana(kana));
          rendered = ktokens === undefined ? undefined : renderTokens(ktokens, "loanword", new Set());
        } else {
          rendered = generateKoreanReadings(kana, { surface: kana })[rule];
        }
      }
      if (rendered === undefined || rendered.length === 0) {
        return undefined;
      }
      parts.push(rendered);
    }
    const result = parts.join("").trim();
    return result.length === 0 ? undefined : result;
  }

  expandNumericSplits(tokens: readonly FallbackToken[]): FallbackToken[] {
    if (this.numericSplits === undefined) {
      return [...tokens];
    }
    const result: FallbackToken[] = [];
    let index = 0;
    while (index < tokens.length) {
      const match = this.numericSplits.match(tokens, index);
      if (match === undefined || match === null) {
        const token = tokens[index];
        if (token !== undefined) {
          result.push(token);
        }
        index += 1;
        continue;
      }
      const [consumed, emitted] = match;
      const consumedTokens = tokens.slice(index, index + consumed);
      const firstConsumed = consumedTokens[0];
      const lastConsumed = consumedTokens[consumedTokens.length - 1];
      const pieces = firstConsumed === undefined
        ? { head: {}, inner: {}, tail: {} }
        : splitBoundaryRuntimeStateForPieces(firstConsumed);
      const trailing = lastConsumed === undefined
        ? {}
        : splitTrailingBoundaryRuntimeState(lastConsumed).trailing;
      const lastEmitted = emitted.length - 1;
      result.push(...emitted.map((token, position) => {
        const state: Record<string, unknown> = {
          ...(position === 0 ? pieces.head : pieces.inner),
          ...(position === lastEmitted ? trailing : {})
        };
        delete state.dictionaryId;
        delete state.normalizedForm;
        delete state.splitA;
        delete state.splitB;
        return { ...state, ...token, syntheticReason: "numeric_split" } as unknown as FallbackToken;
      }));
      index += consumed;
    }
    return result;
  }

  async resolveOovLemma(
    token: FallbackToken,
    koreanPos: number,
    options: { readonly demoteKoyuuHanja?: boolean } = {}
  ): Promise<readonly [string, string]> {
    if (isNonLexicalSymbolToken(token)) {
      return [token.surface, "symbol_passthrough"];
    }
    if (koreanPos === 동사 || koreanPos === 형용사) {
      return [`${token.dictionaryForm}다`, "lemma_fallback"];
    }
    if (!isPersonSurname(token) && !isPersonGivenName(token)) {
      const numeralCompound = tryNumeralCompound(token);
      if (numeralCompound !== undefined) {
        return [numeralCompound, "numeral_compound"];
      }
    }
    if (options.demoteKoyuuHanja === true) {
      const hanjaFallback = this.getHanjaFallback(token);
      if (hanjaFallback !== undefined) {
        return [applyInitialDueum(hanjaFallback), "hanja_fallback"];
      }
    }
    const readingFallback = await this.getReadingFallback(token);
    if (readingFallback !== undefined) {
      return [readingFallback, "reading_fallback"];
    }
    const hanjaFallback = this.getHanjaFallback(token);
    if (hanjaFallback !== undefined) {
      return [applyInitialDueum(hanjaFallback), "hanja_fallback"];
    }
    return [token.surface, "surface_fallback"];
  }

  async synthesizeEntry(token: FallbackToken, options: { readonly nextToken?: FallbackToken | null } = {}): Promise<FallbackDictionaryEntry> {
    const pos0 = token.pos & POS0;
    const isNonLexicalSymbol = isNonLexicalSymbolToken(token);
    let koreanPos = isNonLexicalSymbol ? 기호 : JP_POS_TO_KR_NUM.get(pos0) ?? 명사;
    if (!isNonLexicalSymbol && token.surface.length > 0 && Array.from(token.surface).every((ch) => /^[\x00-\x7F]$/u.test(ch))) {
      koreanPos = 명사;
    }
    const isSingleHanjaKoyuu = Array.from(token.surface).length === 1
      && (token.pos & POS1) === 固有名詞
      && (token.pos & POS2) !== 人名
      && hanjaToHangul(token.surface) !== undefined;
    const nextToken = options.nextToken ?? null;
    const nextIsSuffix = nextToken !== null && (nextToken.pos & POS0) === 接尾辞;
    const [korean, syntheticReason] = await this.resolveOovLemma(token, koreanPos, {
      demoteKoyuuHanja: isSingleHanjaKoyuu && !nextIsSuffix
    });
    const entry: FallbackDictionaryEntry = {
      dictionaryForm: token.dictionaryForm,
      senses: [{
        korean,
        koreanPos
      }],
      synthetic: true,
      syntheticReason
    };
    return entry;
  }

  async expandOovSplits(tokens: readonly FallbackToken[]): Promise<FallbackToken[]> {
    const result: FallbackToken[] = [];
    for (const [index, token] of tokens.entries()) {
      if (isNonLexicalSymbolTokenAt(tokens, index)) {
        result.push(token);
        continue;
      }
      if ((await this.lookupTokenRelaxed(token)) !== undefined) {
        result.push(token);
        continue;
      }
      const tokenPos0 = token.pos & POS0;
      if (!pos0in(tokenPos0, CONTENT_POS_BITS)) {
        result.push(token);
        continue;
      }
      if (isProperPlaceNameToken(token)) {
        result.push(token);
        continue;
      }
      const expanded = await this.expandableSplit(token);
      if (expanded !== undefined) {
        result.push(...await this.applyCausativeSeruReanalysis(expanded));
        continue;
      }
      const reanalyzed = await this.reanalyzeLexicalizedCausativeSeru(token);
      result.push(...reanalyzed ?? [token]);
    }
    return result;
  }

  private async applyCausativeSeruReanalysis(subtokens: readonly FallbackToken[]): Promise<FallbackToken[]> {
    const result: FallbackToken[] = [];
    for (const subtoken of subtokens) {
      const prev = result.at(-1);
      const prevIsVerbRenyou = prev !== undefined && (prev.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
      if (prevIsVerbRenyou) {
        const entry = await this.lookupTokenRelaxed(subtoken);
        if (entry === undefined || entry.matchReason === "potential_base_restored") {
          const pair = await this.reanalyzeLexicalizedCausativeSeru(subtoken);
          if (pair !== undefined) {
            result.push(...pair);
            continue;
          }
        }
      }
      result.push(subtoken);
    }
    return result;
  }

  private async reanalyzeLexicalizedCausativeSeru(token: FallbackToken): Promise<readonly [FallbackToken, FallbackToken] | undefined> {
    if ((token.pos & (POS0 | POS4)) !== (動詞 | 下一段_サ行)) {
      return undefined;
    }
    const dictForm = token.dictionaryForm;
    if (dictForm.length < 3 || !dictForm.endsWith("せる")) {
      return undefined;
    }
    const restore = SERU_CAUSATIVE_STEM_RESTORE.get(dictForm.at(-3) ?? "");
    if (restore === undefined) {
      return undefined;
    }
    const stem = dictForm.slice(0, -2);
    if (!token.surface.startsWith(stem) || token.surface.length <= stem.length) {
      return undefined;
    }
    const suffixLength = token.surface.length - stem.length;
    if (token.reading.length <= suffixLength) {
      return undefined;
    }
    const stemReading = token.reading.slice(0, token.reading.length - suffixLength);
    if (stemReading.at(-1) !== restore.readingSource) {
      return undefined;
    }
    const baseForm = `${dictForm.slice(0, -3)}${restore.surfaceEnding}`;
    const baseReading = `${stemReading.slice(0, -1)}${restore.readingEnding}`;
    const baseEntry = await this.dictionary.lookup?.(baseForm, baseReading, 動詞);
    if (baseEntry === undefined || baseEntry === null) {
      return undefined;
    }
    if (((baseEntry.conjugationType ?? 0) & POS4) !== restore.conjugationType) {
      return undefined;
    }
    const { splitA: _splitA, splitB: _splitB, ...shared } = token;
    const stemShared = rewriteRuntimeTokenSurface(shared, {
      kind: "remove_suffix",
      suffix: token.surface.slice(stem.length)
    });
    const suffixShared = rewriteRuntimeTokenSurface(shared, {
      kind: "remove_prefix",
      prefix: stem
    });
    return [
      {
        ...stemShared,
        dictionaryForm: baseForm,
        reading: stemReading,
        dictionaryFormReading: baseReading,
        pos: 動詞 | (token.pos & POS1) | ((baseEntry.conjugationType ?? 0) & POS4) | 未然形_一般,
        syntheticReason: "causative_seru_reanalysis"
      },
      {
        ...suffixShared,
        dictionaryForm: "せる",
        reading: token.reading.slice(stemReading.length),
        dictionaryFormReading: "セル",
        pos: 助動詞 | 下一段_サ行 | (token.pos & POS5),
        syntheticReason: "causative_seru_reanalysis"
      }
    ];
  }

  async recoverOovFunctionalSplits(tokens: readonly FallbackToken[]): Promise<FallbackToken[]> {
    const result: FallbackToken[] = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i]!;
      const recovered = await this.recoverFunctionalSplit(token, tokens[i - 1]);
      result.push(...recovered ?? [token]);
    }
    return result;
  }

  async renderSplitFallback(token: FallbackToken, honorificOverride?: HonorificClusterOverrideLookups): Promise<string | undefined> {
    const placeResult = await this.renderPlaceNameFallback(token);
    if (placeResult !== undefined) {
      return placeResult;
    }
    for (const subtokens of [token.splitB, token.splitA]) {
      if (subtokens === undefined || subtokens.length === 0) {
        continue;
      }
      const outputParts: string[] = [];
      let anyResolved = false;
      let hanjaDueumApplied = false;
      const c = new TokenCursor<FallbackToken>(subtokens, 0, subtokens.length);
      while (c.pos < c.end) {
        const subtoken = c.current();
        if (subtoken === undefined) {
          c.advance();
          continue;
        }
        const pos0 = subtoken.pos & POS0;
        const previous = c.peek(-1);
        if (previous !== undefined && outputParts.length > 0 && isPersonGivenName(subtoken) && isPersonSurname(previous)) {
          outputParts.push(" ");
        }
        if (pos0in(pos0, PASSTHROUGH_POS_BITS)) {
          outputParts.push(subtoken.surface);
          c.advance();
          continue;
        }
        if (pos0 === 名詞 && (subtoken.pos & POS1) === 数詞 && c.pos + 1 < c.end) {
          const reading = readNumeralToken(subtoken, {
            zeroQuantitySurfaces: this.numeric.ZERO_QUANTITY_NUMERALS,
            counterCombined: true
          });
          const parsed = reading?.value;
          if (parsed !== undefined) {
            const next = c.peek(1);
            const counter = next === undefined ? undefined : formatCounterPhrase(parsed, next.dictionaryForm, {
              forceArabic: reading?.positional === true,
              arabicSurface: reading?.realization ?? null
            });
            if (counter !== undefined) {
              outputParts.push(counter);
              anyResolved = true;
              c.advance(2);
              continue;
            }
            if (c.pos >= 1 && c.peek(-1)?.surface === "第" && ((c.peek(-1)?.pos ?? 0) & POS0) === 接頭辞) {
              const sino = sinoKorean(parsed);
              if (sino !== undefined) {
                outputParts.push(sino);
                anyResolved = true;
                c.advance();
                continue;
              }
            }
          }
        }
        if (honorificOverride !== undefined) {
          const clusterRealization = honorificClusterSuffixOverride(subtokens, c.pos, honorificOverride);
          if (clusterRealization !== null) {
            outputParts.push(clusterRealization.attachLeft ? clusterRealization.korean : ` ${clusterRealization.korean}`);
            anyResolved = true;
            c.advance();
            continue;
          }
        }
        const isPersonComponent = isPersonSurname(subtoken) || isPersonGivenName(subtoken);
        const lookedUp = isPersonComponent ? undefined : await this.lookupTokenRelaxed(subtoken);
        const entry = lookedUp === undefined
          ? undefined
          : this.dictionary.resolveSubtokenSenses?.(lookedUp, subtokens, c.pos) ?? lookedUp;
        if (entry !== undefined) {
          outputParts.push(splitFallbackKorean(entry));
          anyResolved = true;
          c.advance();
          continue;
        }
        const numeral = !isPersonSurname(subtoken) && !isPersonGivenName(subtoken)
          ? tryNumeralCompound(subtoken) : undefined;
        if (numeral !== undefined) {
          outputParts.push(numeral);
          anyResolved = true;
          c.advance();
          continue;
        }
        const readingFallback = await this.getReadingFallback(subtoken);
        if (readingFallback !== undefined) {
          outputParts.push(readingFallback);
          anyResolved = true;
          c.advance();
          continue;
        }
        let hanjaFallback = this.getHanjaFallback(subtoken, { allowSuffix: true });
        if (hanjaFallback !== undefined) {
          if (!hanjaDueumApplied) {
            hanjaFallback = applyInitialDueum(hanjaFallback);
            hanjaDueumApplied = true;
          }
          outputParts.push(hanjaFallback);
          anyResolved = true;
          c.advance();
          continue;
        }
        outputParts.push(subtoken.surface);
        c.advance();
      }
      if (anyResolved && outputParts.length > 0) {
        const hasInternalSpace = outputParts.some((part) => part.trim().includes(" "));
        return hasInternalSpace ? outputParts.filter((part) => part.length > 0).join(" ").replaceAll(/ {2,}/gu, " ").trim() : outputParts.join("");
      }
    }
    return await this.renderMixedScriptAtomicFallback(token);
  }

  async renderPlaceNameFallback(token: FallbackToken): Promise<string | undefined> {
    const pos = token.pos;
    if ((pos & POS012) !== 名詞_固有名詞_地名) {
      return undefined;
    }
    const tokenSplitA = token.splitA;
    if (tokenSplitA === undefined || tokenSplitA.length === 0) {
      return undefined;
    }
    const tokenSplitB = token.splitB;
    const bSegments = tokenSplitB !== undefined && tokenSplitB.length > 0 ? tokenSplitB : [token];

    const aSlices: FallbackToken[][] = [];
    let cursor = 0;
    for (const segment of bSegments) {
      const slice: FallbackToken[] = [];
      let length = 0;
      while (cursor < tokenSplitA.length && length < segment.surface.length) {
        const item = tokenSplitA[cursor];
        if (item === undefined) {
          return undefined;
        }
        slice.push(item);
        length += item.surface.length;
        cursor += 1;
      }
      if (length !== segment.surface.length) {
        return undefined;
      }
      aSlices.push(slice);
    }
    if (cursor !== tokenSplitA.length) {
      return undefined;
    }
    const outputs: string[] = [];
    let anyAdminSplit = false;
    for (const [index, segment] of bSegments.entries()) {
      const aSlice = aSlices[index] ?? [];
      const last = aSlice.at(-1);
      const adminKorean = last === undefined || aSlice.length < 2 ? undefined : PLACE_ADMIN_SUFFIX[`${last.surface}\0${last.reading}`];
      if (adminKorean !== undefined) {
        const placeParts = aSlice.slice(0, -1);
        const placeSurface = placeParts.map((part) => part.surface).join("");
        const placeReading = placeParts.map((part) => part.reading).join("");
        const synthetic = makeFallbackToken(placeSurface, placeReading, ["名詞", "固有名詞", "地名", "一般", "*", "*"]);
        const entry = await this.lookupTokenRelaxed(synthetic);
        const placeKorean = entry === undefined ? await this.getReadingFallback(synthetic) : splitFallbackKorean(entry);
        if (placeKorean !== undefined && placeKorean.length > 0) {
          outputs.push(`${placeKorean}${adminKorean}`);
          anyAdminSplit = true;
          continue;
        }
      }
      const segmentFallback = await this.getReadingFallback(segment);
      if (segmentFallback === undefined) {
        return undefined;
      }
      outputs.push(segmentFallback);
    }
    return anyAdminSplit ? outputs.join(" ") : undefined;
  }

  async renderMixedScriptAtomicFallback(token: FallbackToken): Promise<string | undefined> {
    if (this.readingFallbackRule === undefined || !pos0in(token.pos & POS0, NONPREDICATE_CONTENT_POS_BITS) || token.surface.length < 2) {
      return undefined;
    }
    if (token.splitA || token.splitB) {
      return undefined;
    }
    const chars = Array.from(token.surface);
    if (!(chars.some(isHanjaChar) && chars.some(isKanaChar))) {
      return undefined;
    }
    for (let suffixLength = chars.length - 1; suffixLength > 0; suffixLength -= 1) {
      const prefix = chars.slice(0, -suffixLength).join("");
      const suffix = chars.slice(-suffixLength).join("");
      if (prefix.length === 0 || suffix.length === 0) {
        continue;
      }
      if (Array.from(suffix).length === 1 && isKanaChar(suffix)) {
        continue;
      }
      const entry = await this.lookupTokenRelaxed(makeSyntheticNounToken(suffix));
      if (entry === undefined || !(entry.senses ?? []).some((translation) => isKoreanNounAble(translation.koreanPos ?? 명사, translation.nominalized))) {
        continue;
      }
      const suffixKorean = splitFallbackKorean(entry);
      if (suffixKorean.length === 0) {
        continue;
      }
      const prefixKorean = await this.renderAtomicPrefix(prefix);
      if (prefixKorean === undefined) {
        return undefined;
      }
      return `${prefixKorean}${suffixKorean}`;
    }
    return undefined;
  }

  async renderAtomicPrefix(prefix: string): Promise<string | undefined> {
    if (prefix.length === 0 || this.readingFallbackRule === undefined) {
      return undefined;
    }
    const chars = Array.from(prefix);
    if (chars.every(isKanaChar)) {
      return generateKoreanReadings(normalizeKana(prefix), { surface: prefix })[this.readingFallbackRule];
    }
    if (chars.every(isHanjaChar)) {
      const hanja = hanjaToHangul(prefix);
      return hanja === undefined ? undefined : applyInitialDueum(hanja);
    }
    if (!(chars.some(isHanjaChar) && chars.some(isKanaChar))) {
      return undefined;
    }
    for (let suffixLength = chars.length - 1; suffixLength > 0; suffixLength -= 1) {
      const subPrefix = chars.slice(0, -suffixLength).join("");
      const subSuffix = chars.slice(-suffixLength).join("");
      if (Array.from(subSuffix).length === 1 && isKanaChar(subSuffix)) {
        continue;
      }
      const entry = await this.lookupTokenRelaxed(makeSyntheticNounToken(subSuffix));
      if (entry === undefined || !(entry.senses ?? []).some((translation) => isKoreanNounAble(translation.koreanPos ?? 명사, translation.nominalized))) {
        continue;
      }
      const suffixKorean = splitFallbackKorean(entry);
      const prefixKorean = await this.renderAtomicPrefix(subPrefix);
      if (suffixKorean.length > 0 && prefixKorean !== undefined) {
        return `${prefixKorean}${suffixKorean}`;
      }
    }
    return undefined;
  }

  async getReadingFallback(token: FallbackToken): Promise<string | undefined> {
    if (this.readingFallbackRule === undefined) {
      return undefined;
    }
    if (isSymbolCharacterToken(token)) {
      return undefined;
    }
    const chainSegments = token.chainSegments;
    if (chainSegments !== undefined && chainSegments.length > 0) {
      return await this.renderChainSegments(chainSegments, this.readingFallbackRule);
    }
    const surface = token.surface;
    if (surface.length > 0 && Array.from(surface).every((ch) => /^[\x00-\x7F]$/u.test(ch))) {
      return undefined;
    }
    const isProperNoun = (token.pos & POS1) === 固有名詞;
    const isRemergedYouon = token.syntheticReason === "youon_split_remerged" || token.syntheticReason === STANDALONE_SMALL_KANA_REASON
      || token.syntheticReason === NASAL_VOCALIZATION_RUN_REASON;
    const hasKatakana = Array.from(surface).some((ch) => ("゠" <= ch && ch <= "ヿ") || ch === "ー");
    if (!isProperNoun && !hasKatakana && !isRemergedYouon) {
      return undefined;
    }
    if (token.reading.length > 0 && Array.from(token.reading).every((ch) => ("゠" <= ch && ch <= "ヿ") || ch === "ー")) {
      const loanword = isLoanwordKatakana(token.reading, surface);
      const pos2 = token.pos & POS2;
      const useReadingLookup = Array.from(surface).some(isHanjaChar) && pos2 !== 人名 && pos2 !== 地名;
      const mixed = await renderKatakanaWithDict(token.reading, {
        surface,
        findTransliteration: useReadingLookup
          ? async (kana) => (await this.findKatakanaTransliteration(kana)) ?? this.findKoreanByReading(kana, surface)
          : (kana) => this.findKatakanaTransliteration(kana),
        minMatches: loanword ? 1 : 2
      });
      if (mixed !== undefined) {
        return mixed[this.readingFallbackRule];
      }
    }
    return generateKoreanReadings(token.reading, { surface })[this.readingFallbackRule];
  }

  getHanjaFallback(token: FallbackToken, options: { readonly allowSuffix?: boolean } = {}): string | undefined {
    if (this.readingFallbackRule === undefined) {
      return undefined;
    }
    const pos0 = token.pos & POS0;
    const allowed = pos0in(pos0, NONPREDICATE_CONTENT_POS_BITS) || (options.allowSuffix === true && pos0 === 接尾辞);
    if (!allowed || token.surface.length === 0) {
      return undefined;
    }
    return hanjaToHangul(token.surface);
  }

  private async lookupTokenRelaxed(token: FallbackToken): Promise<FallbackDictionaryEntry | undefined> {
    return await this.dictionary.lookupTokenRelaxed?.(token);
  }

  private async findKatakanaTransliteration(kana: string, options: { readonly preferNameRole?: boolean } = {}): Promise<string | undefined> {
    return await this.dictionary.findKatakanaTransliteration?.(kana, options);
  }

  private findKoreanByReading(kana: string, surface?: string): string | undefined {
    return this.dictionary.findKoreanByReading?.(kana, surface);
  }

  private async expandableSplit(token: FallbackToken): Promise<readonly FallbackToken[] | undefined> {
    for (const subtokens of [token.splitB, token.splitA]) {
      if (subtokens === undefined || subtokens.length === 0) {
        continue;
      }
      const lastPos0 = (subtokens[subtokens.length - 1]?.pos ?? 0) & POS0;
      if (!pos0in(lastPos0, CONTENT_POS_BITS) && !isTaiSplitTail(subtokens)) {
        continue;
      }
      const tokenPos0 = token.pos & POS0;
      if (
        tokenPos0 === 名詞 &&
        subtokens.every((subtoken) => pos0in(subtoken.pos & POS0, CONTENT_POS_BITS)) &&
        !isExtentPhraseSplitCandidate(subtokens, this.numeric) &&
        !isPhrasalContentSplit(subtokens)
      ) {
        continue;
      }
      let anyFound = false;
      for (const subtoken of subtokens) {
        if ((await this.lookupTokenRelaxed(subtoken)) !== undefined) {
          anyFound = true;
          break;
        }
      }
      if (anyFound) {
        return subtokens;
      }
    }
    return undefined;
  }

  private async isProperNounPhraseSplit(subtokens: readonly FallbackToken[]): Promise<boolean> {
    if (subtokens[0] === undefined || isFunctionalSplitToken(subtokens[0])) {
      return false;
    }
    for (const subtoken of subtokens) {
      if (isFunctionalSplitToken(subtoken)) {
        continue;
      }
      if ((subtoken.pos & POS01) !== 名詞_固有名詞 || (await this.getReadingFallback(subtoken)) === undefined) {
        return false;
      }
    }
    return true;
  }

  private async recoverFunctionalSplit(
    token: FallbackToken,
    previous: FallbackToken | undefined
  ): Promise<readonly FallbackToken[] | undefined> {
    if (isNonLexicalSymbolToken(token)) {
      return undefined;
    }
    if (
      !keijoujiAttributiveMarkerLedSplit(token, previous) &&
      (await this.lookupTokenRelaxed(token)) !== undefined
    ) {
      return undefined;
    }
    const subtokens = preferredSplit(token);
    if (subtokens === undefined || subtokens.length < 2) {
      return undefined;
    }
    if (subtokens.map((subtoken) => subtoken.surface).join("") !== token.surface) {
      return undefined;
    }
    if (!subtokens.some(isFunctionalSplitToken)) {
      return undefined;
    }
    let hasResolvedContent = false;
    for (const subtoken of subtokens) {
      if (!isRecoverableSplitContentToken(subtoken)) {
        continue;
      }
      if ((await this.lookupTokenRelaxed(subtoken)) !== undefined) {
        hasResolvedContent = true;
        break;
      }
    }
    if (!hasResolvedContent && !(await this.isProperNounPhraseSplit(subtokens))) {
      return undefined;
    }
    return subtokens.map((subtoken) => ({
      ...subtoken,
      syntheticReason: subtoken.syntheticReason ?? "oov_functional_split"
    }));
  }
}

function isExtentPhraseSplitCandidate(subtokens: readonly FallbackToken[], numeric: NumericTables): boolean {
  return subtokens[0]?.dictionaryForm === "もう" && readExtentPhraseAt(new TokenCursor(subtokens, 1, subtokens.length), numeric) !== null;
}

function isPhrasalContentSplit(subtokens: readonly FallbackToken[]): boolean {
  if (subtokens.length < 2) {
    return false;
  }
  const last = subtokens[subtokens.length - 1];
  if (((last?.pos ?? 0) & POS0) !== 名詞) {
    return false;
  }
  for (let i = 0; i < subtokens.length - 1; i += 1) {
    const subtoken = subtokens[i];
    if (subtoken === undefined) {
      continue;
    }
    if (isPersonSurname(subtoken) || isPersonGivenName(subtoken)) {
      return false;
    }
    const pos0 = subtoken.pos & POS0;
    if ((pos0in(pos0, INFLECTABLE_BITS)) && (subtoken.pos & POS5A) === 連体形_) {
      return true;
    }
  }
  return false;
}

function keijoujiAttributiveMarkerLedSplit(
  token: FallbackToken,
  previous: FallbackToken | undefined
): boolean {
  if (previous === undefined || !isLexicalPureNaAdjStem(previous)) {
    return false;
  }
  const head = preferredSplit(token)?.[0];
  return head !== undefined && head.surface === "の" && (head.pos & POS01) === 助詞_格助詞;
}

function preferredSplit(token: FallbackToken): readonly FallbackToken[] | undefined {
  const tokenSplitB = token.splitB;
  if (tokenSplitB !== undefined && tokenSplitB.length > 0) {
    return tokenSplitB;
  }
  return token.splitA;
}

function isFunctionalSplitToken(token: FallbackToken): boolean {
  return pos0in(token.pos & POS0, FUNCTIONAL_SPLIT_POS_BITS) || isAuxiliaryStemToken(token);
}

function isRecoverableSplitContentToken(token: FallbackToken): boolean {
  const pos0 = token.pos & POS0;
  return !isFunctionalSplitToken(token) && pos0in(pos0, CONTENT_POS_BITS) && !isNonLexicalSymbolToken(token);
}

function translationNameRole(translation: MorphemeSense): boolean | undefined {
  const value = translation.nameRole;
  return typeof value === "boolean" ? value : undefined;
}

function makeFallbackToken(surface: string, reading: string, pos: readonly string[] | number): FallbackToken {
  return {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: typeof pos === "number" ? pos : posFromStrings(pos)
  };
}

function makeSyntheticNounToken(surface: string): FallbackToken {
  const kanaOnly = Array.from(surface).every(isKanaChar);
  const reading = kanaOnly ? normalizeKana(surface) : "";
  return makeFallbackToken(surface, reading, 名詞_普通名詞);
}
