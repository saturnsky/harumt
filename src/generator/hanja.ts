
import { KANJI_KOREAN_READINGS } from "../third-party/kanjidic2/index.js";
import { UNI_HANJA_READINGS } from "../third-party/unihan/hanja-readings.js";
import { CHOSEONG_JAMO, JUNGSEONG_JAMO, JONGSEONG_JAMO, HANGUL_BASE, HANGUL_END } from "./hangul.js";

const CHO_L = "ㄹ";
const CHO_N = "ㄴ";
const CHO_ZERO = "ㅇ";
const I_Y_MEDIALS = new Set(["ㅑ", "ㅒ", "ㅕ", "ㅖ", "ㅛ", "ㅠ", "ㅣ"]);

const hanjaToHangulCache = new Map<string, string | undefined>();

export function hanjaToHangul(text: string): string | undefined {
  const cached = hanjaToHangulCache.get(text);
  if (cached !== undefined || hanjaToHangulCache.has(text)) {
    return cached;
  }
  const parts: string[] = [];
  for (const ch of text) {
    const reading = lookupHanjaReading(ch);
    if (reading === undefined) {
      hanjaToHangulCache.set(text, undefined);
      return undefined;
    }
    parts.push(reading);
  }
  const result = parts.length === 0 ? undefined : parts.join("");
  hanjaToHangulCache.set(text, result);
  return result;
}

export function applyInitialDueum(text: string): string {
  const first = text[0];
  if (first === undefined) {
    return text;
  }
  const decomposed = decomposeHangul(first);
  if (decomposed === undefined) {
    return text;
  }
  const { choseong, jungseong, jongseong } = decomposed;
  if (choseong === CHO_L) {
    const nextChoseong = I_Y_MEDIALS.has(jungseong) ? CHO_ZERO : CHO_N;
    return `${composeHangul(nextChoseong, jungseong, jongseong)}${text.slice(first.length)}`;
  }
  if (choseong === CHO_N && I_Y_MEDIALS.has(jungseong)) {
    return `${composeHangul(CHO_ZERO, jungseong, jongseong)}${text.slice(first.length)}`;
  }
  return text;
}

function lookupHanjaReading(ch: string): string | undefined {
  const kanjidicReadings = KANJI_KOREAN_READINGS[ch as keyof typeof KANJI_KOREAN_READINGS];
  const unihanReading = UNI_HANJA_READINGS[ch as keyof typeof UNI_HANJA_READINGS];
   
  if (kanjidicReadings !== undefined) {
    const best = selectBonum(kanjidicReadings);
    if (
      best !== undefined &&
       
      unihanReading !== undefined &&
      areDueumVariants(best, unihanReading) &&
      bonumPriority(unihanReading) > bonumPriority(best)
    ) {
      return unihanReading;
    }
    return best;
  }
  return unihanReading;
}

function selectBonum(candidates: readonly string[]): string | undefined {
  let best = candidates[0];
  if (best === undefined) {
    return undefined;
  }
  for (const candidate of candidates.slice(1)) {
    if (areDueumVariants(best, candidate) && bonumPriority(candidate) > bonumPriority(best)) {
      best = candidate;
    }
  }
  return best;
}

function areDueumVariants(left: string, right: string): boolean {
  if (left.length !== right.length || left.length === 0 || left.slice(1) !== right.slice(1)) {
    return false;
  }
  const leftHead = decomposeHangul(left[0] ?? "");
  const rightHead = decomposeHangul(right[0] ?? "");
  if (leftHead === undefined || rightHead === undefined) {
    return false;
  }
  if (leftHead.jungseong !== rightHead.jungseong || leftHead.jongseong !== rightHead.jongseong) {
    return false;
  }
  const pair = new Set([leftHead.choseong, rightHead.choseong]);
  const isIy = I_Y_MEDIALS.has(leftHead.jungseong);
  if (pair.size !== 2) {
    return false;
  }
  if (pair.has(CHO_L) && pair.has(CHO_N) && !isIy) {
    return true;
  }
  if (pair.has(CHO_L) && pair.has(CHO_ZERO) && isIy) {
    return true;
  }
  if (pair.has(CHO_N) && pair.has(CHO_ZERO) && isIy) {
    return true;
  }
  return false;
}

function bonumPriority(text: string): number {
  const first = text[0];
  if (first === undefined) {
    return 0;
  }
  const decomposed = decomposeHangul(first);
  if (decomposed === undefined) {
    return 0;
  }
  if (decomposed.choseong === CHO_L) {
    return 3;
  }
  if (decomposed.choseong === CHO_N && I_Y_MEDIALS.has(decomposed.jungseong)) {
    return 2;
  }
  if (decomposed.choseong === CHO_ZERO && I_Y_MEDIALS.has(decomposed.jungseong)) {
    return 0;
  }
  return 1;
}

function decomposeHangul(ch: string): { readonly choseong: string; readonly jungseong: string; readonly jongseong: string } | undefined {
  const code = ch.codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_END) {
    return undefined;
  }
  const offset = code - HANGUL_BASE;
  const choseong = CHOSEONG_JAMO[Math.floor(offset / 588)];
  const jungseong = JUNGSEONG_JAMO[Math.floor((offset % 588) / 28)];
  const jongseong = JONGSEONG_JAMO[offset % 28];
  return choseong === undefined || jungseong === undefined || jongseong === undefined
    ? undefined
    : { choseong, jungseong, jongseong };
}

function composeHangul(choseong: string, jungseong: string, jongseong: string): string {
  const cho = CHOSEONG_JAMO.indexOf(choseong as (typeof CHOSEONG_JAMO)[number]);
  const jung = JUNGSEONG_JAMO.indexOf(jungseong as (typeof JUNGSEONG_JAMO)[number]);
  const jong = JONGSEONG_JAMO.indexOf(jongseong as (typeof JONGSEONG_JAMO)[number]);
  return cho < 0 || jung < 0 || jong < 0 ? "" : String.fromCodePoint(HANGUL_BASE + cho * 588 + jung * 28 + jong);
}
