export function isKanji(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (0x3400 <= code && code <= 0x4dbf) ||
    (0x4e00 <= code && code <= 0x9fff) ||
    (0xf900 <= code && code <= 0xfaff) ||
    (0x20000 <= code && code <= 0x2ffff)
  );
}

export function isKana(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (0x3040 <= code && code <= 0x30ff) || ch === "ー";
}

const WAVE_PAUSE_CHARS: ReadonlySet<string> = new Set(["～", "〜", "~"]);

export function isWavePauseChar(ch: string): boolean {
  return WAVE_PAUSE_CHARS.has(ch);
}

export function isWavePauseSurface(text: string): boolean {
  if (text.length === 0) return false;
  for (const ch of text) {
    if (!isWavePauseChar(ch)) return false;
  }
  return true;
}

const SMALL_KANA: ReadonlySet<string> = new Set(
  Array.from("ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ")
);

export function isSmallKana(ch: string): boolean {
  return SMALL_KANA.has(ch);
}

const VOICING_MARKS: ReadonlySet<string> = new Set(["゙", "゚", "゛", "゜"]);

export function isNonOnsetKanaChar(ch: string): boolean {
  return SMALL_KANA.has(ch) || VOICING_MARKS.has(ch) || ch === "ー";
}

const YOUON_SMALL_KANA: ReadonlySet<string> = new Set(Array.from("ゃゅょャュョ"));

export function isYouonSmallKana(ch: string): boolean {
  return YOUON_SMALL_KANA.has(ch);
}

const YOUON_HOST_KANA: ReadonlySet<string> = new Set(
  Array.from("きしちにひみりぎじぢびぴキシチニヒミリギジヂビピ")
);

export function isYouonHostKana(ch: string): boolean {
  return YOUON_HOST_KANA.has(ch);
}

export function isKatakanaLetter(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return 0x30a1 <= code && code <= 0x30fa;
}

const GOJUON_ROWS: readonly string[] = [
  "アイウエオ",
  "カキクケコ",
  "サシスセソ",
  "タチツテト",
  "ナニヌネノ",
  "ハヒフヘホ",
  "マミムメモ",
  "ヤユヨ",
  "ラリルレロ",
  "ワヲ",
];

const GOJUON_FIRST = "ア";
const GOJUON_LAST = "ン";

export function isGojuonFullSpanPair(left: string, right: string): boolean {
  return left === GOJUON_FIRST && right === GOJUON_LAST;
}

export function isGojuonRowRangePair(left: string, right: string): boolean {
  for (const row of GOJUON_ROWS) {
    const leftIndex = row.indexOf(left);
    if (leftIndex < 0) continue;
    return row.indexOf(right) > leftIndex;
  }
  return false;
}

const FULLWIDTH_ASCII_OFFSET = 0xfee0;

export function fullwidthAsciiToHalfwidth(char: string): string | null {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return null;
  }
  if ((code >= 0xff21 && code < 0xff3b) || (code >= 0xff41 && code < 0xff5b) || (code >= 0xff10 && code < 0xff1a)) {
    return String.fromCodePoint(code - FULLWIDTH_ASCII_OFFSET);
  }
  return null;
}

export function normalizeFullwidthAscii(text: string): string {
  let changed = false;
  const mapped = Array.from(text, (ch) => {
    const half = fullwidthAsciiToHalfwidth(ch);
    if (half === null) {
      return ch;
    }
    changed = true;
    return half;
  });
  return changed ? mapped.join("") : text;
}

export function isHiragana(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x3041 && code <= 0x3096;
}

export function isKatakana(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x30a1 && code <= 0x30ff;
}

export function toKatakana(str: string): string {
  if (str.length === 1) {
    const code = str.charCodeAt(0);
    return (0x3041 <= code && code < 0x3097)
      ? String.fromCharCode(code + 0x60)
      : str;
  }
  return Array.from(str, (ch) => {
    const code = ch.codePointAt(0);
    if (code !== undefined && 0x3041 <= code && code < 0x3097) {
      return String.fromCodePoint(code + 0x60);
    }
    return ch;
  }).join("");
}

export function isPureKatakanaSurface(text: string): boolean {
  if (text.length === 0) {
    return false;
  }
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code >= 0x30A0 && code <= 0x30FF) {
      continue;
    }
    if (ch === "ー") {
      continue;
    }
    return false;
  }
  return true;
}
