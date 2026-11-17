

export const HANGUL_BASE = 0xac00;
export const HANGUL_END = 0xd7a3;
export const JUNGSEONG_COUNT = 21;
export const JONGSEONG_COUNT = 28;


export const JONG_NONE = 0;
export const JONG_NIEUN = 4;
export const JONG_DIGEUT = 7;
export const JONG_RIEUL = 8;
export const JONG_RIEUL_MIEUM = 10;
export const JONG_MIEUM = 16;
export const JONG_BIEUP = 17;
export const JONG_SIOT = 19;
export const JONG_SSANG_SIOT = 20;
export const JONG_HIEUT = 27;


export const JUNG_A = 0;
export const JUNG_AE = 1;
export const JUNG_YA = 2;
export const JUNG_YAE = 3;
export const JUNG_EO = 4;
export const JUNG_E = 5;
export const JUNG_YEO = 6;
export const JUNG_O = 8;
export const JUNG_WA = 9;
export const JUNG_WAE = 10;
export const JUNG_OE = 11;
export const JUNG_U = 13;
export const JUNG_WEO = 14;
export const JUNG_EU = 18;
export const JUNG_I = 20;

export const POSITIVE_VOWELS = new Set<number>([JUNG_A, JUNG_O]);

export type HangulInfo = readonly [cho: number, jung: number, jong: number];


export function decompose(char: string): HangulInfo | undefined {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return undefined;
  }
  if (HANGUL_BASE <= code && code <= HANGUL_END) {
    let offset = code - HANGUL_BASE;
    const jong = offset % JONGSEONG_COUNT;
    offset = Math.floor(offset / JONGSEONG_COUNT);
    const jung = offset % JUNGSEONG_COUNT;
    const cho = Math.floor(offset / JUNGSEONG_COUNT);
    return [cho, jung, jong];
  }
  return undefined;
}

export function compose(cho: number, jung: number, jong = JONG_NONE): string {
  return String.fromCodePoint(
    HANGUL_BASE + (cho * JUNGSEONG_COUNT + jung) * JONGSEONG_COUNT + jong
  );
}

export function getInfo(char: string): HangulInfo {
  const info = decompose(char);
  if (info === undefined) {
    throw new Error(`Not a Hangul syllable: ${JSON.stringify(char)}`);
  }
  return info;
}

export function setJongseong(char: string, jong: number): string {
  const [cho, jung] = getInfo(char);
  return compose(cho, jung, jong);
}

export function isPositive(jung: number): boolean {
  return POSITIVE_VOWELS.has(jung);
}


export const CHOSEONG_JAMO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;
export const JUNGSEONG_JAMO = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"] as const;
export const JONGSEONG_JAMO = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

const JONGSEONG_BY_JAMO: ReadonlyMap<string, number> = new Map(
  JONGSEONG_JAMO.map((j, i) => [j, i] as const)
);


export function addCoda(syllable: string, coda: string): string {
  if (syllable.length !== 1) {
    return `${syllable}${coda}`;
  }
  const code = syllable.codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_END || (code - HANGUL_BASE) % JONGSEONG_COUNT !== 0) {
    return `${syllable}${coda}`;
  }
  return String.fromCodePoint(code + (JONGSEONG_BY_JAMO.get(coda) ?? 0));
}

export function hasNoCoda(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return false;
  }
  return HANGUL_BASE <= code && code <= HANGUL_END && (code - HANGUL_BASE) % JONGSEONG_COUNT === 0;
}


const ALLOMORPH_TRAILING_DECORATION = /^[\p{P}\p{Z}\p{S}]$/u;

export function lastSyllableForAllomorph(text: string): string {
  let end = text.length;
  while (end > 0 && ALLOMORPH_TRAILING_DECORATION.test(text[end - 1]!)) {
    end -= 1;
  }
  return end === 0 ? text.slice(-1) : text[end - 1]!;
}

export function getJongseongIndex(text: string): number | undefined {
  if (text.length === 0) {
    return undefined;
  }
  const code = lastSyllableForAllomorph(text).charCodeAt(0);
  if (HANGUL_BASE <= code && code <= HANGUL_END) {
    return (code - HANGUL_BASE) % JONGSEONG_COUNT;
  }
  return undefined;
}

export function hasBatchim(text: string): boolean | undefined {
  const jongseongIndex = getJongseongIndex(text);
  if (jongseongIndex === undefined) {
    return undefined;
  }
  return jongseongIndex !== JONG_NONE;
}


const COMPAT_CONSONANT_BASE = 0x3131;
const COMPAT_CONSONANT_END  = 0x314E;

const COMPAT_CHO_INDEX: ReadonlyMap<number, number> = new Map([
  [0x3131,  0],
  [0x3132,  1],
  [0x3134,  2],
  [0x3137,  3],
  [0x3138,  4],
  [0x3139,  5],
  [0x3141,  6],
  [0x3142,  7],
  [0x3143,  8],
  [0x3145,  9],
  [0x3146, 10],
  [0x3147, 11],
  [0x3148, 12],
  [0x3149, 13],
  [0x314A, 14],
  [0x314B, 15],
  [0x314C, 16],
  [0x314D, 17],
  [0x314E, 18],
]);

export function sanitizeIncompleteHangul(text: string): string {
  let result = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (COMPAT_CONSONANT_BASE <= code && code <= COMPAT_CONSONANT_END) {
      const cho = COMPAT_CHO_INDEX.get(code);
      if (cho !== undefined) {
        result += compose(cho, JUNG_EU);
        continue;
      }
    }
    result += ch;
  }
  return result;
}
