
const utf8Encoder = new TextEncoder();

export const LONG_VOWEL_MARKS: ReadonlySet<string> = new Set(["ー", "ｰ"]);

const FULL_VOWEL_KANA: ReadonlySet<string> = new Set([
  "あ", "い", "う", "え", "お",
  "ア", "イ", "ウ", "エ", "オ"
]);

const SMALL_VOWEL_KANA: ReadonlySet<string> = new Set([
  "ぁ", "ぃ", "ぅ", "ぇ", "ぉ",
  "ァ", "ィ", "ゥ", "ェ", "ォ"
]);

const VOWEL_RUN_MIN = 2;

export type KanaVowel = "a" | "i" | "u" | "e" | "o";
type Vowel = KanaVowel;

const HIRAGANA_VOWEL: Readonly<Record<string, Vowel>> = buildHiraganaVowelMap();

function buildHiraganaVowelMap(): Record<string, Vowel> {
  const groups: Record<Vowel, string> = {
    a: "あかがさざただなはばぱまやらわぁゃゎ",
    i: "いきぎしじちぢにひびぴみりゐぃ",
    u: "うくぐすずつづぬふぶぷむゆるぅゅゔ",
    e: "えけげせぜてでねへべぺめれゑぇ",
    o: "おこごそぞとどのほぼぽもよろをぉょ"
  };
  const map: Record<string, Vowel> = {};
  for (const vowel of Object.keys(groups) as Vowel[]) {
    for (const char of groups[vowel]) {
      map[char] = vowel;
    }
  }
  return map;
}

export function kanaVowel(char: string): Vowel | undefined {
  let cp = char.codePointAt(0);
  if (cp === undefined) {
    return undefined;
  }
  if (cp >= 0x30a1 && cp <= 0x30f6) {
    cp -= 0x60;
  }
  return HIRAGANA_VOWEL[String.fromCodePoint(cp)];
}

import { isKanji, isHiragana } from "../utils/char-class.js";

function isKatakanaExcludingChoonpu(char: string): boolean {
  if (char === "ー") return false;
  const cp = char.codePointAt(0) ?? 0;
  return (cp >= 0x30a1 && cp <= 0x30fa) || (cp >= 0xff66 && cp <= 0xff9d);
}

function isElongationHost(char: string): boolean {
  return isHiragana(char) || isKatakanaExcludingChoonpu(char) || isKanji(char);
}

export function inputHasElongation(chars: readonly string[]): boolean {
  let runChar: string | undefined;
  let runLen = 0;
  for (const char of chars) {
    if (LONG_VOWEL_MARKS.has(char) || SMALL_VOWEL_KANA.has(char)) {
      return true;
    }
    if (FULL_VOWEL_KANA.has(char) && char === runChar) {
      runLen += 1;
      if (runLen >= VOWEL_RUN_MIN) {
        return true;
      }
    } else if (FULL_VOWEL_KANA.has(char)) {
      runChar = char;
      runLen = 1;
    } else {
      runChar = undefined;
      runLen = 0;
    }
  }
  return false;
}

export interface ReducedBuffer {
  readonly bytes: Uint8Array;
  readonly reducedByteEndToOrigCharEnd: readonly number[];
  readonly removedCountAtReducedEnd: readonly number[];
  readonly markRemovedCountAtReducedEnd: readonly number[];
  readonly katakanaMarkRemovedCountAtReducedEnd: readonly number[];
  readonly nonTrailingVowelRepeatCountAtReducedEnd: readonly number[];
  readonly collapsedVowelRun: boolean;
}

export function buildReducedBuffer(
  chars: readonly string[],
  startCharIdx: number,
  maxSpan: number,
  vowelRunKeep = 1
): ReducedBuffer | null {
  const end = Math.min(startCharIdx + maxSpan, chars.length);
  const bytes: number[] = [];
  const reducedByteEndToOrigCharEnd: number[] = [];
  const removedCountAtReducedEnd: number[] = [];
  const markRemovedCountAtReducedEnd: number[] = [];
  const katakanaMarkRemovedCountAtReducedEnd: number[] = [];
  const nonTrailingVowelRepeatCountAtReducedEnd: number[] = [];

  let removed = 0;
  let markRemoved = 0;
  let katakanaMarkRemoved = 0;
  let collapsedVowelRun = false;
  let prevKept: string | undefined;
  let prevKeptIsHost = false;
  let prevKeptIsKatakana = false;
  let pendingVowelRepeat = 0;
  let sealedNonTrailingVowelRepeat = 0;

  const record = (origCharEnd: number): void => {
    const len = bytes.length;
    reducedByteEndToOrigCharEnd[len] = origCharEnd;
    removedCountAtReducedEnd[len] = removed;
    markRemovedCountAtReducedEnd[len] = markRemoved;
    katakanaMarkRemovedCountAtReducedEnd[len] = katakanaMarkRemoved;
    nonTrailingVowelRepeatCountAtReducedEnd[len] = sealedNonTrailingVowelRepeat;
  };
  const append = (char: string): void => {
    sealedNonTrailingVowelRepeat += pendingVowelRepeat;
    pendingVowelRepeat = 0;
    for (const byte of utf8Encoder.encode(char)) {
      bytes.push(byte);
    }
    prevKept = char;
    prevKeptIsHost = isElongationHost(char);
    prevKeptIsKatakana = isKatakanaExcludingChoonpu(char);
  };

  record(startCharIdx);

  let i = startCharIdx;
  while (i < end) {
    const char = chars[i];
    if (char === undefined) {
      break;
    }

    if (LONG_VOWEL_MARKS.has(char) && prevKeptIsHost) {
      removed += 1;
      markRemoved += 1;
      if (prevKeptIsKatakana) {
        katakanaMarkRemoved += 1;
      }
      record(i + 1);
      i += 1;
      continue;
    }

    if (
      SMALL_VOWEL_KANA.has(char) &&
      prevKept !== undefined &&
      kanaVowel(char) !== undefined &&
      kanaVowel(char) === kanaVowel(prevKept)
    ) {
      removed += 1;
      record(i + 1);
      i += 1;
      continue;
    }

    if (FULL_VOWEL_KANA.has(char)) {
      let runLen = 1;
      while (i + runLen < end && chars[i + runLen] === char) {
        runLen += 1;
      }
      if (runLen >= VOWEL_RUN_MIN) {
        const keepN = Math.min(vowelRunKeep, runLen);
        for (let k = 0; k < keepN; k += 1) {
          append(char);
          record(i + k + 1);
        }
        for (let k = keepN; k < runLen; k += 1) {
          removed += 1;
          pendingVowelRepeat += 1;
          record(i + k + 1);
        }
        collapsedVowelRun = true;
        i += runLen;
        continue;
      }
    }

    append(char);
    record(i + 1);
    i += 1;
  }

  if (removed === 0) {
    return null;
  }
  return {
    bytes: Uint8Array.from(bytes),
    reducedByteEndToOrigCharEnd,
    removedCountAtReducedEnd,
    markRemovedCountAtReducedEnd,
    katakanaMarkRemovedCountAtReducedEnd,
    nonTrailingVowelRepeatCountAtReducedEnd,
    collapsedVowelRun
  };
}

export interface ReductionCostProfile {
  readonly minCost: number;
  readonly maxCost: number;
}

const DEFAULT_COST_PROFILE: ReductionCostProfile = {
  minCost: -32768,
  maxCost: 32767
};

const REDUCTION_PENALTY = {
  markBase: 3000,
  markScaled: 4000,
  perMarkHiragana: 1000,
  perMarkKatakana: 9000,
  perEmphasis: 200
} as const;

export function longVowelReductionPenalty(
  rawWordCost: number,
  removedCount: number,
  markRemovedCount: number,
  katakanaMarkRemovedCount: number,
  profile: ReductionCostProfile = DEFAULT_COST_PROFILE
): number {
  const range = Math.max(1, profile.maxCost - profile.minCost);
  const strength = clamp((profile.maxCost - rawWordCost) / range, 0, 1);
  const emphasisRemoved = Math.max(0, removedCount - markRemovedCount);
  const hiraganaMark = Math.max(0, markRemovedCount - katakanaMarkRemovedCount);
  let penalty =
    REDUCTION_PENALTY.perMarkKatakana * katakanaMarkRemovedCount +
    REDUCTION_PENALTY.perMarkHiragana * hiraganaMark +
    REDUCTION_PENALTY.perEmphasis * emphasisRemoved;
  if (markRemovedCount > 0) {
    penalty += REDUCTION_PENALTY.markBase + Math.round(REDUCTION_PENALTY.markScaled * strength);
  }
  return penalty;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ProlongedReductionContract {
  readonly dependentHeadwordPos0: ReadonlySet<string>;
  readonly candidateInflectClasses: ReadonlySet<string>;
}

const REDUCTION_KEY_SEPARATOR = "\u0000";

export function prolongedReductionKeyPart(
  contract: ProlongedReductionContract | undefined
): string {
  if (contract === undefined || contract.dependentHeadwordPos0.size === 0) {
    return "";
  }
  const headwords = [...contract.dependentHeadwordPos0].sort().join("|");
  const candidates = [...contract.candidateInflectClasses].sort().join("|");
  return `${REDUCTION_KEY_SEPARATOR}pr${headwords}/${candidates}${REDUCTION_KEY_SEPARATOR}`;
}
