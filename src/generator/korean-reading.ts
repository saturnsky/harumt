
import { parse } from "smol-toml";

import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import { isKatakana, normalizeFullwidthAscii } from "../utils/char-class.js";
import { latinWordKatakanaKoreanReading } from "./readings.js";

interface KoreanReadingsData {
  readonly letter_names?: { readonly [letter: string]: string };
  readonly japanese_letter_names?: { readonly [letter: string]: readonly string[] };
  readonly latin_word_final_coda?: { readonly [kana: string]: string };
  readonly latin_word_final_stop_syllable?: { readonly [kana: string]: string };
  readonly word_read?: { readonly [token: string]: string };
  readonly unit_read?: { readonly [symbol: string]: string };
  readonly greek_letter_names?: { readonly [letter: string]: string };
}

interface ReadingTables {
  readonly letterNames: ReadonlyMap<string, string>;
  readonly japaneseLetterNames: ReadonlyMap<string, readonly string[]>;
  readonly latinWordFinalCoda: ReadonlyMap<string, string>;
  readonly latinWordFinalStopSyllable: ReadonlyMap<string, string>;
  readonly wordRead: ReadonlyMap<string, string>;
  readonly unitRead: ReadonlyMap<string, string>;
  readonly maxUnitSymbolLength: number;
  readonly greekLetterNames: ReadonlyMap<string, string>;
}

let _readingsToml: string | undefined;
let _tables: ReadingTables | undefined;

export async function initKoreanReadings(loader: DataLoader): Promise<void> {
  const configPath = loader.joinPath(resolveDataSection("config"), "korean_readings.toml");
  _readingsToml = await loader.readTextFile(configPath);
  _tables = undefined;
}

function tables(): ReadingTables {
  if (_tables !== undefined) {
    return _tables;
  }
  if (_readingsToml === undefined) {
    throw new Error("korean readings not initialized: call initKoreanReadings() first");
  }
  const data = parse(_readingsToml) as KoreanReadingsData;
  const letterNames = new Map<string, string>();
  for (const [letter, reading] of Object.entries(data.letter_names ?? {})) {
    letterNames.set(letter.toLowerCase(), String(reading));
  }
  if (letterNames.size !== 26) {
    throw new Error(`korean_readings.toml [letter_names] must cover 26 letters (got ${letterNames.size})`);
  }
  const japaneseLetterNames = new Map<string, readonly string[]>();
  for (const [letter, names] of Object.entries(data.japanese_letter_names ?? {})) {
    japaneseLetterNames.set(letter.toLowerCase(), names.map((name) => String(name)));
  }
  if (japaneseLetterNames.size !== 26) {
    throw new Error(`korean_readings.toml [japanese_letter_names] must cover 26 letters (got ${japaneseLetterNames.size})`);
  }
  const latinWordFinalCoda = new Map<string, string>();
  for (const [kana, coda] of Object.entries(data.latin_word_final_coda ?? {})) {
    latinWordFinalCoda.set(kana, String(coda));
  }
  const latinWordFinalStopSyllable = new Map<string, string>();
  for (const [kana, syllable] of Object.entries(data.latin_word_final_stop_syllable ?? {})) {
    latinWordFinalStopSyllable.set(kana, String(syllable));
  }
  const wordRead = new Map<string, string>();
  for (const [token, reading] of Object.entries(data.word_read ?? {})) {
    wordRead.set(token.toUpperCase(), String(reading));
  }
  const unitRead = new Map<string, string>();
  let maxUnitSymbolLength = 0;
  for (const [symbol, reading] of Object.entries(data.unit_read ?? {})) {
    if (symbol.length === 0) {
      throw new Error("korean_readings.toml [unit_read] has an empty symbol key");
    }
    unitRead.set(symbol, String(reading));
    maxUnitSymbolLength = Math.max(maxUnitSymbolLength, symbol.length);
  }
  const greekLetterNames = new Map<string, string>();
  for (const [letter, reading] of Object.entries(data.greek_letter_names ?? {})) {
    greekLetterNames.set(letter, String(reading));
  }
  _tables = { letterNames, japaneseLetterNames, latinWordFinalCoda, latinWordFinalStopSyllable, wordRead, unitRead, maxUnitSymbolLength, greekLetterNames };
  return _tables;
}

function isInitialismNotation(segment: string): boolean {
  return segment.length === 1 || segment === segment.toUpperCase();
}

export function latinSegmentKoreanReading(
  segment: string,
  options: { readonly digitPrefixed: boolean }
): string | undefined {
  if (segment.length === 0 || options.digitPrefixed) {
    return undefined;
  }
  const { letterNames, wordRead } = tables();
  const lexicalized = wordRead.get(segment.toUpperCase());
  if (lexicalized !== undefined) {
    return lexicalized;
  }
  if (!isInitialismNotation(segment)) {
    return undefined;
  }
  let reading = "";
  for (const char of segment) {
    const name = letterNames.get(char.toLowerCase());
    if (name === undefined) {
      return undefined;
    }
    reading += name;
  }
  return reading;
}

export function latinWordFinalCorrespondences(): {
  readonly coda: ReadonlyMap<string, string>;
  readonly stopSyllable: ReadonlyMap<string, string>;
} {
  const { latinWordFinalCoda, latinWordFinalStopSyllable } = tables();
  return { coda: latinWordFinalCoda, stopSyllable: latinWordFinalStopSyllable };
}

function isPureKatakana(text: string): boolean {
  if (text.length === 0) {
    return false;
  }
  for (const ch of text) {
    if (!isKatakana(ch) && ch !== "ー") {
      return false;
    }
  }
  return true;
}

function readingSpellsJapaneseLetterNames(notation: string, reading: string): boolean {
  const { japaneseLetterNames } = tables();
  let offsets = new Set<number>([0]);
  for (const char of notation) {
    const names = japaneseLetterNames.get(char.toLowerCase());
    if (names === undefined) {
      return false;
    }
    const next = new Set<number>();
    for (const offset of offsets) {
      for (const name of names) {
        if (reading.startsWith(name, offset)) {
          next.add(offset + name.length);
        }
      }
    }
    if (next.size === 0) {
      return false;
    }
    offsets = next;
  }
  return offsets.has(reading.length);
}

export function latinInitialismSourceReadingKorean(
  notation: string,
  sourceReading: string,
  options: { readonly dictionaryTransliteration?: string } = {}
): string | undefined {
  if (!latinNotationAcceptsSourceReading(notation, sourceReading)) {
    return undefined;
  }
  const halfwidth = normalizeFullwidthAscii(notation.trim());
  const { wordRead } = tables();
  if (wordRead.has(halfwidth) || readingSpellsJapaneseLetterNames(halfwidth, sourceReading)) {
    return undefined;
  }
  return options.dictionaryTransliteration ?? latinWordKatakanaKoreanReading(sourceReading, latinWordFinalCorrespondences());
}

export function latinNotationAcceptsSourceReading(notation: string, sourceReading: string): boolean {
  return /^[A-Z]+$/u.test(normalizeFullwidthAscii(notation.trim())) && isPureKatakana(sourceReading);
}

export function greekLetterKoreanReading(letter: string): string | undefined {
  const names = tables().greekLetterNames;
  return names.get(letter) ?? names.get(letter.toLowerCase());
}

export function unitSymbolKoreanReading(symbol: string): string | undefined {
  return tables().unitRead.get(normalizeFullwidthAscii(symbol.trim()));
}

export function isUnitSymbolSurface(text: string): boolean {
  return tables().unitRead.has(normalizeFullwidthAscii(text.trim()));
}

function unitSymbolCompetesWithLetterName(symbol: string): boolean {
  return /^[A-Za-z]$/u.test(symbol);
}

export function matchTrailingUnitSymbol(
  text: string,
  options: { readonly quantityPrefixed: (symbol: string) => boolean; readonly precededByContent: (symbol: string) => boolean }
): { readonly symbol: string; readonly reading: string } | undefined {
  const { unitRead, maxUnitSymbolLength } = tables();
  const limit = Math.min(maxUnitSymbolLength, text.length);
  for (let length = limit; length >= 1; length -= 1) {
    const symbol = text.slice(text.length - length);
    const reading = unitRead.get(symbol);
    if (reading === undefined) {
      continue;
    }
    if (options.quantityPrefixed(symbol)) {
      return { symbol, reading };
    }
    if (!unitSymbolCompetesWithLetterName(symbol) && !options.precededByContent(symbol)) {
      return { symbol, reading };
    }
    return undefined;
  }
  return undefined;
}
