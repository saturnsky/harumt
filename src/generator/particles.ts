
import {
  HANGUL_BASE,
  HANGUL_END,
  JONG_NIEUN,
  JONG_NONE,
  JONG_RIEUL,
  getJongseongIndex,
  hasBatchim
} from "./hangul.js";
import { greekLetterKoreanReading, latinSegmentKoreanReading, matchTrailingUnitSymbol, unitSymbolKoreanReading } from "./korean-reading.js";
import { sinoKorean } from "./numerals.js";
import { isKana, normalizeFullwidthAscii } from "../utils/char-class.js";

import type { HonorificLevel } from "../types/pipeline.js";

export { hasBatchim };

export type { HonorificLevel };

export const PARTICLE_PAIRS = {
  "은/는": ["은", "는"],
  "이/가": ["이", "가"],
  "을/를": ["을", "를"],
  "과/와": ["과", "와"],
  "으로/로": ["으로", "로"],
  "으로도/로도": ["으로도", "로도"],
  "아/야": ["아", "야"],
  "이라도/라도": ["이라도", "라도"],
  "이라고/라고": ["이라고", "라고"],
  "이라고는/라고는": ["이라고는", "라고는"],
  "이냐고/냐고": ["이냐고", "냐고"],
  "이라니까/라니까": ["이라니까", "라니까"],
  "이라는/라는": ["이라는", "라는"],
  "이란/란": ["이란", "란"],
  "이라/라": ["이라", "라"],
  "이라기보다/라기보다": ["이라기보다", "라기보다"],
  "이니/니": ["이니", "니"],
  "이나/나": ["이나", "나"],
  "으로서/로서": ["으로서", "로서"],
  "이기/기": ["이기", "기"],
  "이라면/라면": ["이라면", "라면"],
  "이면/면": ["이면", "면"],
  "이더라도/더라도": ["이더라도", "더라도"],
  "이든/든": ["이든", "든"],
  "이든지/든지": ["이든지", "든지"],
  "이야말로/야말로": ["이야말로", "야말로"],
  "이여/여": ["이여", "여"],
  "은/는커녕": ["은커녕", "는커녕"],
  "으로써/로써": ["으로써", "로써"],
  "을 바탕으로/를 바탕으로": ["을 바탕으로", "를 바탕으로"],
  "을 비롯해/를 비롯해": ["을 비롯해", "를 비롯해"],
  "을 불문하고/를 불문하고": ["을 불문하고", "를 불문하고"],
  "을 대신해서/를 대신해서": ["을 대신해서", "를 대신해서"],
  "을 중심으로/를 중심으로": ["을 중심으로", "를 중심으로"],
  "을 따라/를 따라": ["을 따라", "를 따라"],
  "을 통해/를 통해": ["을 통해", "를 통해"],
  "을 둘러싸고/를 둘러싸고": ["을 둘러싸고", "를 둘러싸고"],
  "도": ["도", "도"],
  "만": ["만", "만"],
  "의": ["의", "의"],
  "에게": ["에게", "에게"],
  "이었/였": ["이었", "였"],
  "이에요/예요": ["이에요", "예요"],
  "이잖아/잖아": ["이잖아", "잖아"],
  "이다/다": ["이다", "다"],
  "이야/야": ["이야", "야"],
  "이지만/지만": ["이지만", "지만"],
  "이니까/니까": ["이니까", "니까"],
  "이라서/라서": ["이라서", "라서"],
  "이므로/므로": ["이므로", "므로"],
  "이고/고": ["이고", "고"],
  "이거나/거나": ["이거나", "거나"],
  "이라든가/라든가": ["이라든가", "라든가"]
} as const;

export type ParticleKey = keyof typeof PARTICLE_PAIRS;

const PARTICLE_PAIRS_HONORIFIC: Partial<Record<ParticleKey, readonly [string, string]>> = {
  "이/가": ["께서", "께서"],
  "에게": ["께", "께"]
};

const ROMAN_NO_BATCHIM = new Set(
  "aeiouy"
  + "sxz"
  + "wh"
  + "bdfgv"
  + "r"
);
const ROMAN_RIEUL = new Set("l");
const ROMAN_NASAL_BATCHIM = new Set("mn");

const HIRAGANA_START = 0x3040;
const HIRAGANA_END = 0x309F;
const KATAKANA_START = 0x30A0;
const KATAKANA_END = 0x30FF;

export function selectParticle(
  precedingText: string,
  particleKey: ParticleKey,
  options: { register?: HonorificLevel } = {}
): string {
  const pair = options.register !== undefined && options.register !== "none"
    ? (PARTICLE_PAIRS_HONORIFIC[particleKey] ?? PARTICLE_PAIRS[particleKey])
    : PARTICLE_PAIRS[particleKey];
   
  if (pair === undefined) {
    throw new Error(`unknown particle key: ${particleKey}`);
  }
  const [withBatchim, withoutBatchim] = pair;
  const jongseongIndex = allomorphJongseongIndex(precedingText);
  if (jongseongIndex === undefined) {
    return withBatchim;
  }

  if (
    (particleKey === "으로/로" || particleKey === "으로도/로도" ||
      particleKey === "으로써/로써" || particleKey === "으로서/로서") &&
    (jongseongIndex === JONG_NONE || jongseongIndex === JONG_RIEUL)
  ) {
    return withoutBatchim;
  }

  return jongseongIndex === JONG_NONE ? withoutBatchim : withBatchim;
}

export function nounPastCopulaStem(noun: string, allomorphHost?: string): string {
  return noun + selectParticle(allomorphHost ?? noun, "이었/였");
}

function allomorphJongseongIndex(text: string): number | undefined {
  if (text.length === 0) {
    return undefined;
  }
  const effectiveText = resolveParenthetical(normalizeFullwidthAscii(text));
  return getJongseongIndex(effectiveText) ?? nonHangulJongseongIndex(effectiveText);
}

export function hasDeterminateAllomorphJongseong(text: string): boolean {
  return allomorphJongseongIndex(text) !== undefined;
}

export function hasAllomorphBatchim(text: string): boolean {
  const jongseongIndex = allomorphJongseongIndex(text);
  return jongseongIndex === undefined ? true : jongseongIndex !== JONG_NONE;
}

function nonHangulJongseongIndex(text: string): number | undefined {
  const segment = extractTrailingNonHangulSegment(text);
  if (segment === undefined) {
    return undefined;
  }
  if (segment.kind === "unit") {
    const reading = unitSymbolKoreanReading(segment.body);
    return reading === undefined ? undefined : getJongseongIndex(reading);
  }
  if (segment.kind === "digits") {
    return digitSegmentJongIndex(segment.body);
  }
  if (segment.kind === "greek") {
    const reading = greekLetterKoreanReading(segment.body);
    return reading === undefined ? undefined : getJongseongIndex(reading);
  }
  if (segment.kind === "kana") {
    return segment.body === 'ン' || segment.body === 'ん' ? JONG_NIEUN : JONG_NONE;
  }
  const reading = latinSegmentKoreanReading(segment.body, { digitPrefixed: segment.digitPrefixed });
  if (reading !== undefined) {
    return getJongseongIndex(reading);
  }
  return romanSegmentJongIndex(segment.body);
}

function extractTrailingUnitSymbolSegment(
  text: string
): { kind: "unit"; body: string; digitPrefixed: boolean } | undefined {
  const trimmed = text.replace(/\s+$/u, "");
  const head = (symbol: string): string =>
    trimmed.slice(0, trimmed.length - symbol.length).replace(/\s+$/u, "");
  const match = matchTrailingUnitSymbol(trimmed, {
    quantityPrefixed: (symbol) => /[0-9]$/u.test(head(symbol)),
    precededByContent: (symbol) => /[\p{L}\p{N}]/u.test(head(symbol))
  });
  if (match === undefined) {
    return undefined;
  }
  return { kind: "unit", body: match.symbol, digitPrefixed: true };
}

function extractTrailingNonHangulSegment(
  text: string
): { kind: "digits" | "roman" | "kana" | "unit" | "greek"; body: string; digitPrefixed: boolean } | undefined {
  const unitSegment = extractTrailingUnitSymbolSegment(text);
  if (unitSegment !== undefined) {
    return unitSegment;
  }
  const chars = Array.from(text);
  let index = chars.length - 1;
  while (index >= 0 && isIgnorableTrailingChar(chars[index] ?? "")) {
    index -= 1;
  }
  if (index < 0) {
    return undefined;
  }

  const ch = chars[index] ?? "";
  if (/^[0-9]$/.test(ch)) {
    const end = index + 1;
    while (index >= 0 && /^[0-9]$/.test(chars[index] ?? "")) {
      index -= 1;
    }
    return { kind: "digits", body: chars.slice(index + 1, end).join(""), digitPrefixed: false };
  }
  if (/^[A-Za-z]$/.test(ch)) {
    const end = index + 1;
    while (index >= 0 && /^[A-Za-z]$/.test(chars[index] ?? "")) {
      index -= 1;
    }
    let precedingIndex = index;
    while (precedingIndex >= 0 && /^\s$/u.test(chars[precedingIndex] ?? "")) {
      precedingIndex -= 1;
    }
    const digitPrefixed = /^[0-9]$/.test(chars[precedingIndex] ?? "");
    return { kind: "roman", body: chars.slice(index + 1, end).join(""), digitPrefixed };
  }
  if (isKana(ch)) {
    return { kind: "kana", body: ch, digitPrefixed: false };
  }
  if (/^\p{Script=Greek}$/u.test(ch)) {
    const isolated = !/^\p{Script=Greek}$/u.test(chars[index - 1] ?? "");
    return isolated ? { kind: "greek", body: ch, digitPrefixed: false } : undefined;
  }
  return undefined;
}

function isIgnorableTrailingChar(ch: string): boolean {
  return /^[\p{P}\p{Z}\p{S}]$/u.test(ch);
}


function resolveParenthetical(text: string): string {
  let current = text;
  for (let i = 0; i < 3; i++) {
    const resolved = resolveParentheticalOnce(current);
    if (resolved === current) break;
    current = resolved;
  }
  return current;
}

function resolveParentheticalOnce(text: string): string {
  const chars = Array.from(text);
  let endIdx = chars.length - 1;

  while (endIdx >= 0) {
    const ch = chars[endIdx]!;
    if (ch === ')' || ch === '）') break;
    if (!isIgnorableTrailingChar(ch)) return text;
    endIdx--;
  }

  if (endIdx < 0) return text;

  const closeCh = chars[endIdx]!;
  const openCh = closeCh === ')' ? '(' : '（';

  let depth = 0;
  let openIdx = -1;
  for (let j = endIdx; j >= 0; j--) {
    if (chars[j] === closeCh) depth++;
    else if (chars[j] === openCh) {
      depth--;
      if (depth === 0) { openIdx = j; break; }
    }
  }

  if (openIdx < 0) return text;

  const innerText = chars.slice(openIdx + 1, endIdx).join('');
  const beforeText = chars.slice(0, openIdx).join('');

  const innerLetter = findLastLetter(innerText);
  const beforeLetter = findLastLetter(beforeText);

  if (innerLetter === undefined && beforeLetter === undefined) return text;
  if (innerLetter === undefined) return trimTrailingNonContent(beforeText);
  if (beforeLetter === undefined) return trimTrailingNonContent(innerText);

  const innerTier = letterTier(innerLetter);
  const beforeTier = letterTier(beforeLetter);

  let chosen: string;
  if (beforeTier > innerTier) chosen = beforeText;
  else if (innerTier > beforeTier) chosen = innerText;
  else if (innerTier > 0) chosen = innerText;
  else chosen = beforeText;

  return trimTrailingNonContent(chosen);
}

function findLastLetter(text: string): string | undefined {
  const chars = Array.from(text);
  for (let i = chars.length - 1; i >= 0; i--) {
    if (/^\p{L}$/u.test(chars[i]!)) return chars[i]!;
  }
  return undefined;
}

function letterTier(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (HANGUL_BASE <= code && code <= HANGUL_END) return 2;
  if ((HIRAGANA_START <= code && code <= HIRAGANA_END) ||
    (KATAKANA_START <= code && code <= KATAKANA_END)) return 1;
  return 0;
}

function trimTrailingNonContent(text: string): string {
  return text.replace(/[^\p{L}\p{N}]+$/u, '');
}

const SINO_ZERO_READING = "영";

function digitSegmentJongIndex(digits: string): number | undefined {
  const n = BigInt(digits);
  const sino = n === 0n ? SINO_ZERO_READING : sinoKorean(n);
  return sino === undefined ? undefined : getJongseongIndex(sino);
}

function romanSegmentJongIndex(letters: string): number | undefined {
  if (letters.length === 0) {
    return undefined;
  }

  const tail = letters.toLowerCase();
  const last = tail.at(-1);
  if (last === "e" && tail.length >= 2) {
    const prev = tail.at(-2);
    if (prev !== undefined && ROMAN_RIEUL.has(prev)) {
      return JONG_RIEUL;
    }
    if (prev !== undefined && ROMAN_NASAL_BATCHIM.has(prev)) {
      return JONG_NIEUN;
    }
    if (prev !== undefined && /^[a-z]$/.test(prev)) {
      return JONG_NONE;
    }
  }
  if (last !== undefined && ROMAN_NO_BATCHIM.has(last)) {
    return JONG_NONE;
  }
  if (last !== undefined && ROMAN_RIEUL.has(last)) {
    return JONG_RIEUL;
  }
  if (last !== undefined && ROMAN_NASAL_BATCHIM.has(last)) {
    return JONG_NIEUN;
  }
  return undefined;
}
