
import type {
  IndefiniteNumeralPrefixClass,
  NumericTables
} from "./numeric-lookup.js";

type NumeralSystem = "native" | "sino" | "native_or_sino";
export type JapaneseNumber = number | bigint;

export const COUNTER_TABLE: Record<string, readonly [string, NumeralSystem]> = {
  "回": ["번", "native"],
  "冊": ["권", "native"],
  "人": ["명", "native"],
  "名": ["명", "sino"],
  "匹": ["마리", "native"],
  "個": ["개", "native"],
  "枚": ["장", "native"],
  "杯": ["잔", "native"],
  "台": ["대", "native"],
  "機": ["대", "native"],
  "着": ["벌", "native"],
  "足": ["켤레", "native"],
  "室": ["실", "native"],
  "本": ["개", "native"],
  "つ": ["개", "native"],
  "切れ": ["조각", "native"],
  "頭": ["마리", "native"],
  "羽": ["마리", "native"],
  "尾": ["마리", "native"],
  "軒": ["채", "native"],
  "棟": ["동", "native"],
  "通": ["통", "native"],
  "席": ["석", "native"],
  "点": ["점", "native"],
  "錠": ["정", "native"],
  "粒": ["알", "native"],
  "箇所": ["곳", "native"],
  "時間": ["시간", "native"],
  "艘": ["척", "native"],
  "度目": ["번째", "native"],
  "年": ["년", "sino"],
  "月": ["월", "sino"],
  "ヶ月": ["개월", "sino"],
  "日": ["일", "sino"],
  "時": ["시", "native_or_sino"],
  "分": ["분", "sino"],
  "秒": ["초", "sino"],
  "週": ["주", "sino"],
  "階": ["층", "sino"],
  "番": ["번", "sino"],
  "泊": ["박", "sino"],
  "号": ["호", "sino"],
  "課": ["과", "sino"],
  "章": ["장", "sino"],
  "巻": ["권", "sino"],
  "期": ["기", "sino"],
  "刻": ["각", "sino"],
  "字": ["자", "sino"],
  "話": ["화", "native"],
  "色": ["색", "sino"],
  "割": ["할", "sino"],
  "代": ["대", "sino"],
  "年生": ["학년", "sino"],
  "号館": ["호관", "sino"],
  "号室": ["호실", "sino"],
  "位": ["위", "sino"],
  "年間": ["년간", "sino"],
  "月間": ["월간", "sino"],
  "週間": ["주간", "sino"],
  "日間": ["일간", "sino"]
};

const KANJI_DIGIT: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9
};
const KANJI_ZERO: Record<string, number> = { "零": 0, "〇": 0 };
const KANJI_POWER: Record<string, number> = { "十": 10, "百": 100, "千": 1000 };
const NATIVE_NUMERAL_STEMS: Record<string, number> = {
  "ひと": 1,
  "ふた": 2,
  "み": 3,
  "みっ": 3,
  "よ": 4,
  "よっ": 4,
  "いつ": 5,
  "む": 6,
  "むっ": 6,
  "なな": 7,
  "や": 8,
  "やっ": 8,
  "ここの": 9,
  "とお": 10
};
const LARGE_UNIT: Record<string, number> = {
  "万": 10_000,
  "億": 100_000_000,
  "兆": 1_000_000_000_000,
  "京": 10_000_000_000_000_000,
  "垓": 100_000_000_000_000_000_000
};
const LARGE_UNIT_BIGINT: Record<string, bigint> = {
  "万": 10_000n,
  "億": 100_000_000n,
  "兆": 1_000_000_000_000n,
  "京": 10_000_000_000_000_000n,
  "垓": 100_000_000_000_000_000_000n
};
const KANJI_POWER_BIGINT: Record<string, bigint> = {
  "十": 10n,
  "百": 100n,
  "千": 1000n
};
const ALL_UNITS: Record<string, number> = { ...KANJI_POWER, ...LARGE_UNIT };
const ALL_DIGITS: Record<string, number> = { ...KANJI_DIGIT, ...KANJI_ZERO };
const COUNTER_KEY_ALIASES: Record<string, string> = {
  "か月": "ヶ月",
  "カ月": "ヶ月",
  "ヵ月": "ヶ月",
  "箇月": "ヶ月",
  "か所": "箇所",
  "カ所": "箇所",
  "ヶ所": "箇所",
  "ケ所": "箇所",
  "個所": "箇所"
};
const SINO_UNIT_SUFFIX = new Set(["만", "억", "조"]);

const NATIVE_CARDINAL_ONES = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"] as const;
const NATIVE_COUNTER_ONES = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"] as const;
const NATIVE_TENS_CARDINAL = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"] as const;
const NATIVE_TENS_COUNTER_EXACT = ["", "열", "스무", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"] as const;
const NATIVE_TENS_COUNTER_COMBINE = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"] as const;
const SINO_ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"] as const;
const SINO_TENS = ["", "십", "이십", "삼십", "사십", "오십", "육십", "칠십", "팔십", "구십"] as const;
const SINO_LARGE_UNITS_BIGINT: readonly (readonly [bigint, string])[] = [
  [1_0000_0000_0000n, "조"],
  [1_0000_0000n, "억"],
  [1_0000n, "만"]
];
const LARGE_UNIT_KR: Record<string, string> = {
  "万": "만",
  "億": "억",
  "兆": "조",
  "京": "경",
  "垓": "해"
};
const SMALL_UNIT_KR: Record<string, string> = {
  "十": "십",
  "百": "백",
  "千": "천"
};
const DIGIT_GROUP_SEPARATORS = new Set([",", "\uFF0C"]);
const DECIMAL_POINTS = new Set([".", "\uFF0E"]);
export interface IndefiniteNumeralReading {
  readonly sourcePrefix: string;
  readonly prefixClass: IndefiniteNumeralPrefixClass;
  readonly structure: "bare_prefix" | "numeric_compound";
  readonly korean: string;
}

function stripIlPrefix(sino: string): string {
  return sino.length > 1 && sino.startsWith("일") && SINO_UNIT_SUFFIX.has(sino.slice(1)) ? sino.slice(1) : sino;
}

function normalizeCounterKey(counterKey: string): string {
  return COUNTER_KEY_ALIASES[counterKey] ?? counterKey;
}

export function getCounterKorean(counterKey: string): string | undefined {
  const entry = COUNTER_TABLE[normalizeCounterKey(counterKey)];
  return entry?.[0];
}

export function nativeBareNumeral(number: JapaneseNumber): string | undefined {
  if (typeof number !== "number") {
    return undefined;
  }
  return nativeCardinal(number);
}

export function getIndefiniteNumeralReading(
  dictionaryForm: string,
  numeric: NumericTables
): IndefiniteNumeralReading | undefined {
  for (const metadata of numeric.INDEFINITE_NUMERAL_PREFIX_METADATA) {
    if (!dictionaryForm.startsWith(metadata.sourcePrefix)) {
      continue;
    }
    const rest = dictionaryForm.slice(metadata.sourcePrefix.length);
    if (rest.length === 0) {
      return { ...metadata, structure: "bare_prefix", korean: "수" };
    }
    const parsed = parseJapaneseNumber(rest);
    if (parsed === undefined) {
      continue;
    }
    const unitSino = sinoKorean(parsed);
    if (unitSino === undefined) {
      continue;
    }
    return { ...metadata, structure: "numeric_compound", korean: `수${stripIlPrefix(unitSino)}` };
  }
  return undefined;
}

export interface NumeralSurfaceRealization {
  readonly text: string;
  readonly hasUnitWord: boolean;
}

export interface NumeralSurfaceAnalysis {
  readonly value: JapaneseNumber;
  readonly positional: boolean;
  readonly realization: NumeralSurfaceRealization | null;
  readonly amountFormatted: boolean;
}

export function analyzeNumeralSurface(surface: string): NumeralSurfaceAnalysis | undefined {
  if (surface.length === 0) {
    return undefined;
  }
  const native = NATIVE_NUMERAL_STEMS[surface];
  if (native !== undefined) {
    return { value: native, positional: false, realization: null, amountFormatted: false };
  }
  const positional = scanPositionalNumeralSurface(surface);
  if (positional !== undefined) {
    return positional;
  }
  const value = parseMultiplicative(surface) ?? parsePositional(surface);
  if (value === undefined) {
    return undefined;
  }
  const amountFormatted = Array.from(surface).some((ch) => ALL_UNITS[ch] !== undefined);
  return { value, positional: false, realization: null, amountFormatted };
}

interface PositionalTerm {
  readonly mantissa: bigint;
  readonly fractionDigits: number;
  readonly unit: bigint;
}

function scanPositionalNumeralSurface(surface: string): NumeralSurfaceAnalysis | undefined {
  const chars = Array.from(surface);
  const parts: string[] = [];
  let index = 0;
  let total = 0n;
  let hasUnitWord = false;
  let hasGroupSeparator = false;
  while (index < chars.length) {
    const terms: PositionalTerm[] = [];
    let groupText = "";
    let largeUnit = 1n;
    let largeKorean: string | undefined;
    let previousSmallUnit: bigint | undefined;
    let lastTermPlain = false;
    for (;;) {
      const nextSmallChar = chars[index] ?? "";
      const nextSmall = KANJI_POWER_BIGINT[nextSmallChar];
      if (nextSmall !== undefined) {
        if (previousSmallUnit === undefined || nextSmall >= previousSmallUnit) {
          return undefined;
        }
        terms.push({ mantissa: 1n, fractionDigits: 0, unit: nextSmall });
        groupText += SMALL_UNIT_KR[nextSmallChar] ?? "";
        previousSmallUnit = nextSmall;
        hasUnitWord = true;
        index += 1;
      } else {
        let mantissa = 0n;
        let fractionDigits = 0;
        let sawDot = false;
        let digitCount = 0;
        let kanjiDigitCount = 0;
        let text = "";
        while (index < chars.length) {
          const ch = chars[index] ?? "";
          const decimal = unicodeDecimalDigit(ch);
          const kanji = sawDot ? undefined : ALL_DIGITS[ch];
          const digit = decimal ?? kanji;
          if (digit !== undefined) {
            mantissa = mantissa * 10n + BigInt(digit);
            if (sawDot) {
              fractionDigits += 1;
            }
            digitCount += 1;
            if (decimal === undefined) {
              kanjiDigitCount += 1;
            }
            text += String(digit);
            index += 1;
            continue;
          }
          const nextIsDigit = unicodeDecimalDigit(chars[index + 1] ?? "") !== undefined;
          if (digitCount > 0 && nextIsDigit && !sawDot && DIGIT_GROUP_SEPARATORS.has(ch)) {
            text += ",";
            hasGroupSeparator = true;
            index += 1;
            continue;
          }
          if (digitCount > 0 && nextIsDigit && !sawDot && DECIMAL_POINTS.has(ch)) {
            sawDot = true;
            text += ".";
            index += 1;
            continue;
          }
          break;
        }
        if (digitCount === 0) {
          return undefined;
        }
        if (kanjiDigitCount > 0 && (kanjiDigitCount !== digitCount || digitCount < 2)) {
          return undefined;
        }
        const smallChar = chars[index] ?? "";
        const small = KANJI_POWER_BIGINT[smallChar];
        if (small !== undefined) {
          if (previousSmallUnit !== undefined && small >= previousSmallUnit) {
            return undefined;
          }
          terms.push({ mantissa, fractionDigits, unit: small });
          groupText += `${text}${SMALL_UNIT_KR[smallChar] ?? ""}`;
          previousSmallUnit = small;
          hasUnitWord = true;
          index += 1;
        } else {
          terms.push({ mantissa, fractionDigits, unit: 1n });
          groupText += text;
          lastTermPlain = true;
        }
      }
      const closing = chars[index];
      if (closing === undefined) {
        break;
      }
      const large = LARGE_UNIT_BIGINT[closing];
      if (large !== undefined) {
        if (lastTermPlain && terms.length > 1) {
          return undefined;
        }
        largeUnit = large;
        largeKorean = LARGE_UNIT_KR[closing];
        hasUnitWord = true;
        index += 1;
        break;
      }
      if (lastTermPlain) {
        return undefined;
      }
    }
    const maxFraction = terms.reduce((max, term) => Math.max(max, term.fractionDigits), 0);
    const divisor = 10n ** BigInt(maxFraction);
    let scaled = 0n;
    for (const term of terms) {
      scaled += term.mantissa * term.unit * 10n ** BigInt(maxFraction - term.fractionDigits);
    }
    scaled *= largeUnit;
    if (scaled % divisor !== 0n) {
      return undefined;
    }
    total += scaled / divisor;
    parts.push(largeKorean === undefined ? groupText : `${groupText}${largeKorean}`);
  }
  if (parts.length === 0) {
    return undefined;
  }
  return {
    value: safeNumberOrBigInt(total),
    positional: true,
    realization: { text: parts.join(""), hasUnitWord },
    amountFormatted: hasUnitWord || hasGroupSeparator
  };
}

export interface NumeralValueToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly normalizedForm?: string;
}

export function declaredNumeralValue(normalizedForm: string | undefined): JapaneseNumber | undefined {
  if (normalizedForm === undefined || !/^[0-9]+$/u.test(normalizedForm)) {
    return undefined;
  }
  const value = BigInt(normalizedForm);
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
}

export interface NumeralTokenReadOptions {
  readonly zeroQuantitySurfaces?: ReadonlySet<string>;
  readonly counterCombined?: boolean;
}

export function readNumeralToken(
  token: NumeralValueToken,
  options: NumeralTokenReadOptions = {}
): NumeralSurfaceAnalysis | undefined {
  const analysis = analyzeNumeralSurface(token.surface) ?? zeroQuantityAnalysis(token.surface, options);
  if (analysis === undefined) {
    return undefined;
  }
  const declared = declaredNumeralValue(token.normalizedForm);
  return declared === undefined || declared === analysis.value ? analysis : { ...analysis, value: declared };
}

function zeroQuantityAnalysis(
  surface: string,
  options: NumeralTokenReadOptions
): NumeralSurfaceAnalysis | undefined {
  return options.counterCombined === true && options.zeroQuantitySurfaces?.has(surface) === true
    ? { value: 0, positional: false, realization: null, amountFormatted: false }
    : undefined;
}

export function resolveNumeralTokenValue(
  token: NumeralValueToken,
  options: NumeralTokenReadOptions = {}
): JapaneseNumber | undefined {
  return readNumeralToken(token, options)?.value;
}

export function parseJapaneseNumber(surface: string): JapaneseNumber | undefined {
  return analyzeNumeralSurface(surface)?.value;
}

export function isPositionalNumber(surface: string): boolean {
  return analyzeNumeralSurface(surface)?.positional ?? false;
}

export function formatCounterPhrase(
  number: JapaneseNumber,
  counterKey: string,
  options: { forceArabic?: boolean; arabicSurface?: NumeralSurfaceRealization | null } = {}
): string | undefined {
  const entry = COUNTER_TABLE[normalizeCounterKey(counterKey)];
  if (entry === undefined || number < (typeof number === "bigint" ? 0n : 0)) {
    return undefined;
  }
  const [koreanCounter, initialSystem] = entry;
  if (options.forceArabic === true) {
    if (options.arabicSurface !== undefined && options.arabicSurface !== null) {
      const attached = koreanCounter.startsWith("-");
      const counter = attached ? koreanCounter.slice(1) : koreanCounter;
      const sep = attached || !options.arabicSurface.hasUnitWord ? "" : " ";
      return `${options.arabicSurface.text}${sep}${counter}`;
    }
    return `${String(number)}${koreanCounter}`;
  }

  let system = initialSystem;
  if (system === "native_or_sino") {
    system = number <= 12 ? "native" : "sino";
  }

  let numeral: string | undefined;
  let useSpace = false;
  if (system === "native") {
    numeral = typeof number === "number" ? nativeAttributiveForCounter(number) : undefined;
    useSpace = true;
    if (numeral === undefined) {
      numeral = sinoKorean(number);
    }
  } else {
    numeral = sinoKorean(number);
  }

  if (numeral === undefined) {
    numeral = String(number);
    useSpace = false;
  }
  return useSpace ? `${numeral} ${koreanCounter}` : `${numeral}${koreanCounter}`;
}

export function formatApproxCounterPhrase(
  number: JapaneseNumber,
  counterKey: string,
  options: { arabicSurface?: NumeralSurfaceRealization | null } = {}
): string | undefined {
  const entry = COUNTER_TABLE[normalizeCounterKey(counterKey)];
  if (entry === undefined || number <= (typeof number === "bigint" ? 0n : 0)) {
    return undefined;
  }
  const numeral = options.arabicSurface?.text ?? sinoKorean(number) ?? String(number);
  return `${numeral}여${entry[0]}`;
}

export function sinoKorean(n: JapaneseNumber): string | undefined {
  const value = typeof n === "bigint" ? n : BigInt(n);
  if (value < 1n) {
    return undefined;
  }
  const parts: string[] = [];
  let remainder = value;
  for (const [divisor, unit] of SINO_LARGE_UNITS_BIGINT) {
    if (remainder >= divisor) {
      const high = remainder / divisor;
      remainder %= divisor;
      const highStr = sinoKoreanBelow10000(high);
      if (highStr === undefined) {
        return undefined;
      }
      parts.push(`${highStr}${unit}`);
    }
  }
  if (remainder > 0n) {
    const lowStr = sinoKoreanBelow10000(remainder);
    if (lowStr === undefined) {
      return undefined;
    }
    parts.push(lowStr);
  }
  return parts.length > 0 ? parts.join("") : undefined;
}

function sinoKoreanBelow10000(n: JapaneseNumber): string | undefined {
  const value = typeof n === "bigint" ? n : BigInt(n);
  if (value < 1n || value > 9999n) {
    return undefined;
  }
  const parts: string[] = [];
  const thousands = Number(value / 1000n);
  let remainder = Number(value % 1000n);
  if (thousands > 0) {
    parts.push(`${thousands === 1 ? "" : SINO_ONES[thousands]}천`);
  }
  const hundreds = Math.floor(remainder / 100);
  remainder %= 100;
  if (hundreds > 0) {
    parts.push(`${hundreds === 1 ? "" : SINO_ONES[hundreds]}백`);
  }
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;
  if (tens > 0) {
    parts.push(SINO_TENS[tens] ?? "");
  }
  if (ones > 0) {
    parts.push(SINO_ONES[ones] ?? "");
  }
  return parts.length > 0 ? parts.join("") : undefined;
}

function nativeAttributiveForCounter(number: number): string | undefined {
  return composeNative(number, NATIVE_COUNTER_ONES, NATIVE_TENS_COUNTER_EXACT, NATIVE_TENS_COUNTER_COMBINE);
}

function parsePositional(surface: string): JapaneseNumber | undefined {
  let result = 0n;
  for (const ch of surface) {
    const digit = ALL_DIGITS[ch];
    if (digit === undefined) {
      return undefined;
    }
    result = result * 10n + BigInt(digit);
  }
  return safeNumberOrBigInt(result);
}

function parseMultiplicative(surface: string): JapaneseNumber | undefined {
  let result = 0n;
  let group = 0n;
  let current = 0n;
  for (const ch of surface) {
    if (KANJI_DIGIT[ch] !== undefined) {
      current = BigInt(KANJI_DIGIT[ch]);
      continue;
    }
    if (KANJI_POWER_BIGINT[ch] !== undefined) {
      if (current === 0n) {
        current = 1n;
      }
      group += current * KANJI_POWER_BIGINT[ch];
      current = 0n;
      continue;
    }
    if (LARGE_UNIT_BIGINT[ch] !== undefined) {
      group += current;
      current = 0n;
      if (group === 0n) {
        group = 1n;
      }
      result += group * LARGE_UNIT_BIGINT[ch];
      group = 0n;
      continue;
    }
    return undefined;
  }
  return safeNumberOrBigInt(result + group + current);
}

function safeNumberOrBigInt(value: bigint): JapaneseNumber {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
}

function unicodeDecimalDigit(ch: string): number | undefined {
  const code = ch.codePointAt(0);
  if (code === undefined) {
    return undefined;
  }
  for (const zero of UNICODE_DECIMAL_ZERO_CODEPOINTS) {
    const digit = code - zero;
    if (0 <= digit && digit <= 9) {
      return digit;
    }
  }
  return undefined;
}

const UNICODE_DECIMAL_ZERO_CODEPOINTS = [
  0x0030,
  0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66,
  0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x0e50, 0x0ed0, 0x0f20,
  0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90,
  0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0,
  0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0, 0x10d30, 0x11066,
  0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0, 0x11650,
  0x116c0, 0x11730, 0x118e0, 0x11950, 0x11c50, 0x11d50, 0x11da0,
  0x11f50, 0x16a60, 0x16ac0, 0x16b50, 0x1d7ce, 0x1d7d8, 0x1d7e2,
  0x1d7ec, 0x1d7f6, 0x1e140, 0x1e2f0, 0x1e4f0, 0x1e950, 0x1fbf0
] as const;

function nativeCardinal(number: number): string | undefined {
  return composeNative(number, NATIVE_CARDINAL_ONES, NATIVE_TENS_CARDINAL, NATIVE_TENS_CARDINAL);
}

function composeNative(
  number: number,
  onesTable: readonly string[],
  tensExact: readonly string[],
  tensCombine: readonly string[]
): string | undefined {
  if (number < 1 || number > 99) {
    return undefined;
  }
  const tens = Math.floor(number / 10);
  const ones = number % 10;
  if (ones === 0) {
    return tensExact[tens];
  }
  if (tens === 0) {
    return onesTable[ones];
  }
  return `${tensCombine[tens]}${onesTable[ones]}`;
}
