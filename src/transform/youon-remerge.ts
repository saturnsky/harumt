import type { RuntimeHaruToken } from "../types/token.js";
import { mergeRuntimeTokenSourceIdentity, rewriteRuntimeTokenSurface } from "../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../pipeline/clause-layout/trivia.js";
import { isKana, isYouonHostKana, isYouonSmallKana, toKatakana } from "../utils/char-class.js";

export type YouonMergedPosResolver = (candidate: RuntimeHaruToken) => Promise<number | undefined>;

export async function remergeSplitYouon(
  tokens: readonly RuntimeHaruToken[],
  resolvePos: YouonMergedPosResolver
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    if (prev === undefined || !isSplitYouonTail(prev, tokens, i)) {
      result.push(token);
      continue;
    }
    const surface = `${prev.surface}${token.surface}`;
    const reading = `${prev.reading}${toKatakana(token.surface)}`;
    const merged = mergeRuntimeTokenSourceIdentity({
      surface,
      dictionaryForm: surface,
      reading,
      dictionaryFormReading: reading,
      pos: 0,
      dictionaryId: 0,
      syntheticReason: "youon_split_remerged"
    } as RuntimeHaruToken, [prev, token]);
    const pos = await resolvePos(merged);
    if (pos === undefined) {
      result.push(token);
      continue;
    }
    dirty = true;
    result[result.length - 1] = { ...merged, pos };
  }
  return dirty ? result : [...tokens];
}

const SMALL_KANA = new Set(Array.from("ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ"));
const SYMBOL_POS0 = new Set(["補助記号", "記号"]);
export const STANDALONE_SMALL_KANA_REASON = "standalone_small_kana";

export function retagStandaloneSmallKana(
  tokens: readonly RuntimeHaruToken[],
  posName: (token: RuntimeHaruToken) => string,
  interjectionPos: number
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    const chars = [...token.surface];
    if (chars.length === 0 || !SMALL_KANA.has(chars[0]!) || !chars.every(isKana) || !SYMBOL_POS0.has(posName(token))) {
      return token;
    }
    if (!standsAlone(tokens, index, posName)) {
      return token;
    }
    dirty = true;
    const reading = toKatakana(token.surface);
    return {
      ...token,
      dictionaryForm: token.surface,
      reading,
      dictionaryFormReading: reading,
      pos: interjectionPos,
      syntheticReason: STANDALONE_SMALL_KANA_REASON
    };
  });
  return dirty ? result : [...tokens];
}

function isSplitYouonTail(
  prev: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index]!;
  const first = [...token.surface][0];
  if (first === undefined || !isYouonSmallKana(first) || ![...token.surface].every(isKana)) {
    return false;
  }
  if ([...prev.surface].length !== 1 || !isYouonHostKana(prev.surface)) {
    return false;
  }
  if (separatedAs(tokens, index, DETACHED_SEPARATIONS)) {
    return false;
  }
  return prev.sourceSpan != null && token.sourceSpan != null;
}

export const NASAL_VOCALIZATION_RUN_REASON = "nasal_vocalization_run";
const NASAL_RUN_SURFACE = /^[んン]+[っッ]?$/u;

export function mergeNasalVocalizationRuns(
  tokens: readonly RuntimeHaruToken[],
  posName: (token: RuntimeHaruToken) => string,
  interjectionPos: number
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const end = nasalRunEnd(tokens, index);
    if (end === null || !standsAlone(tokens, index, posName) || rightBoundToFunctionWord(tokens, end, posName)) {
      result.push(tokens[index]!);
      continue;
    }
    const run = tokens.slice(index, end) as [RuntimeHaruToken, ...RuntimeHaruToken[]];
    const last = run[run.length - 1]!;
    const closedInSurface = /[っッ]$/u.test(last.surface);
    const surface = run.map((token) => token.surface).join("");
    const closedBySokuon = !closedInSurface && (last.trailingSokuon ?? 0) > 0;
    const reading = `${toKatakana(surface)}${closedBySokuon ? "ッ" : ""}`;
    const merged = mergeRuntimeTokenSourceIdentity({
      surface,
      dictionaryForm: surface,
      reading,
      dictionaryFormReading: reading,
      pos: interjectionPos,
      dictionaryId: 0,
      syntheticReason: NASAL_VOCALIZATION_RUN_REASON
    } as RuntimeHaruToken, run);
    result.push(merged);
    dirty = true;
    index = end - 1;
  }
  return dirty ? result : [...tokens];
}

function nasalRunEnd(tokens: readonly RuntimeHaruToken[], index: number): number | null {
  let nasalCount = 0;
  let cursor = index;
  for (; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor]!;
    if (!NASAL_RUN_SURFACE.test(token.surface) || token.sourceSpan == null) {
      break;
    }
    if (cursor > index && separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      break;
    }
    nasalCount += [...token.surface].filter((char) => char === "ん" || char === "ン").length;
    if (/[っッ]$/u.test(token.surface)) {
      cursor += 1;
      break;
    }
  }
  if (nasalCount < 2 || cursor === index) {
    return null;
  }
  const single = cursor === index + 1;
  return single && !((tokens[index]!.trailingSokuon ?? 0) > 0 && !/[っッ]$/u.test(tokens[index]!.surface)) ? null : cursor;
}

function rightBoundToFunctionWord(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  posName: (token: RuntimeHaruToken) => string
): boolean {
  const next = tokens[end];
  return next !== undefined
    && !separatedAs(tokens, end, DETACHED_SEPARATIONS)
    && RIGHT_BINDING_POS0.has(posName(next));
}

const RIGHT_BINDING_POS0 = new Set(["助詞", "助動詞", "接尾辞"]);

function standsAlone(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  posName: (token: RuntimeHaruToken) => string
): boolean {
  const prev = tokens[index - 1];
  return prev === undefined
    || separatedAs(tokens, index, DETACHED_SEPARATIONS)
    || ![...prev.surface].some(isKana) && !/\p{Script=Han}/u.test(prev.surface)
    || posName(prev) === "感動詞";
}

export const WORD_ELONGATION_REASON = "word_elongation_small_vowel";
const SMALL_VOWEL_RUN = /^[ぁぃぅぇぉァィゥェォ]+$/u;
const ELONGATION_MARK = "～";
const ELONGATION_HOST_POS0 = new Set(["名詞", "代名詞", "形状詞", "形容詞", "動詞", "副詞", "連体詞", "接尾辞"]);

export function canonicalizeWordElongationSmallVowels(
  tokens: readonly RuntimeHaruToken[],
  posName: (token: RuntimeHaruToken) => string
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (!SMALL_VOWEL_RUN.test(token.surface) || !SYMBOL_POS0.has(posName(token)) || index === 0) {
      return token;
    }
    if (separatedAs(tokens, index, DETACHED_SEPARATIONS) || standsAlone(tokens, index, posName)) {
      return token;
    }
    if (!ELONGATION_HOST_POS0.has(posName(tokens[index - 1]!))) {
      return token;
    }
    dirty = true;
    return {
      ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: ELONGATION_MARK }),
      dictionaryForm: "~",
      reading: "~",
      dictionaryFormReading: "~",
      syntheticReason: WORD_ELONGATION_REASON
    };
  });
  return dirty ? result : [...tokens];
}
