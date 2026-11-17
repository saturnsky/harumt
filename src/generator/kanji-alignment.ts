
import { KANJI_READINGS } from "../third-party/kanjidic2/index.js";

const RENDAKU_MAP = {
  "カ": ["ガ"],
  "キ": ["ギ"],
  "ク": ["グ"],
  "ケ": ["ゲ"],
  "コ": ["ゴ"],
  "サ": ["ザ"],
  "シ": ["ジ"],
  "ス": ["ズ"],
  "セ": ["ゼ"],
  "ソ": ["ゾ"],
  "タ": ["ダ"],
  "チ": ["ヂ"],
  "ツ": ["ヅ"],
  "テ": ["デ"],
  "ト": ["ド"],
  "ハ": ["バ", "パ"],
  "ヒ": ["ビ", "ピ"],
  "フ": ["ブ", "プ"],
  "ヘ": ["ベ", "ペ"],
  "ホ": ["ボ", "ポ"]
} as const;

const SOKUON_FINAL = new Set(["ツ", "チ", "ク", "キ"]);

export type AlignmentPair = readonly [surface: string, reading: string];

import { isKanji, isKana, isSmallKana, toKatakana } from "../utils/char-class.js";

const SOKUON_KANA: ReadonlySet<string> = new Set(["っ", "ッ"]);
export { isKanji };


const candidateCache = new Map<string, readonly string[]>();

function readingCandidates(kanji: string, allowRendaku: boolean, allowSokuon: boolean = false): readonly string[] {
  const cacheKey = `${kanji}${allowRendaku ? "\x01" : ""}${allowSokuon ? "\x02" : ""}`;
  const cached = candidateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const base = KANJI_READINGS[kanji as keyof typeof KANJI_READINGS];
  if (base === undefined) {
    const empty: readonly string[] = [];
    candidateCache.set(cacheKey, empty);
    return empty;
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const reading of base) {
    if (reading.length > 0 && !seen.has(reading)) {
      out.push(reading);
      seen.add(reading);
    }
    if (allowRendaku && reading.length > 0) {
      const first = reading[0] as keyof typeof RENDAKU_MAP;
      for (const voiced of RENDAKU_MAP[first] ?? []) {
        const alt = `${voiced}${reading.slice(1)}`;
        if (!seen.has(alt)) {
          out.push(alt);
          seen.add(alt);
        }
      }
    }
    if (allowSokuon && reading.length > 1) {
      const last = reading[reading.length - 1]!;
      if (SOKUON_FINAL.has(last)) {
        const alt = `${reading.slice(0, -1)}ッ`;
        if (!seen.has(alt)) {
          out.push(alt);
          seen.add(alt);
        }
      }
    }
  }
  out.sort((a, b) => b.length - a.length);
  candidateCache.set(cacheKey, out);
  return out;
}


function alignmentPieces(surfaceChars: readonly string[], index: number): readonly string[] {
  const ch = surfaceChars[index]!;
  if (isKanji(ch)) {
    return readingCandidates(ch, index > 0, index < surfaceChars.length - 1);
  }
  if (isKana(ch)) return [toKatakana(ch)];
  return EMPTY_PIECE;
}

const EMPTY_PIECE: readonly string[] = [""];

function solveAlignment(surfaceChars: readonly string[], reading: string): AlignmentPair[] | null {
  const n = surfaceChars.length;
  const width = reading.length + 1;
  const pieces: (readonly string[])[] = [];
  const minRest = new Array<number>(n + 1).fill(0);
  const maxRest = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i += 1) {
    const options = alignmentPieces(surfaceChars, i);
    if (options.length === 0) return null;
    pieces.push(options);
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let min = Infinity;
    let max = 0;
    for (const piece of pieces[i]!) {
      if (piece.length < min) min = piece.length;
      if (piece.length > max) max = piece.length;
    }
    minRest[i] = minRest[i + 1]! + min;
    maxRest[i] = maxRest[i + 1]! + max;
  }
  if (minRest[0]! > reading.length || maxRest[0]! < reading.length) return null;

  const reachable = new Uint8Array((n + 1) * width);
  reachable[n * width + reading.length] = 1;
  for (let i = n - 1; i >= 0; i -= 1) {
    const lo = Math.max(0, reading.length - maxRest[i]!);
    const hi = reading.length - minRest[i]!;
    for (let pos = lo; pos <= hi; pos += 1) {
      for (const piece of pieces[i]!) {
        const next = pos + piece.length;
        if (next < width && reachable[(i + 1) * width + next] === 1 && reading.startsWith(piece, pos)) {
          reachable[i * width + pos] = 1;
          break;
        }
      }
    }
  }
  if (reachable[0] !== 1) return null;

  const result: AlignmentPair[] = [];
  let pos = 0;
  for (let i = 0; i < n; i += 1) {
    for (const piece of pieces[i]!) {
      const next = pos + piece.length;
      if (next < width && reachable[(i + 1) * width + next] === 1 && reading.startsWith(piece, pos)) {
        result.push([surfaceChars[i]!, piece]);
        pos = next;
        break;
      }
    }
  }
  return result;
}

const fullAlignCache = new Map<string, AlignmentPair[] | null>();

function fullAlign(surfaceChars: readonly string[], reading: string): AlignmentPair[] | null {
  const key = `${surfaceChars.join("")}\n${reading}`;
  const memo = fullAlignCache.get(key);
  if (memo !== undefined || fullAlignCache.has(key)) {
    return memo ?? null;
  }
  const result = solveAlignment(surfaceChars, reading);
  fullAlignCache.set(key, result);
  return result;
}

export function minimumAlignedReadingLength(surface: string): number {
  let total = 0;
  for (const ch of surface) {
    if (isKanji(ch)) total += 1;
    else if (isKana(ch)) total += toKatakana(ch).length;
  }
  return total;
}


function forwardGreedy(
  surfaceChars: readonly string[],
  reading: string
): readonly [matches: AlignmentPair[], sEnd: number, rEnd: number] {
  const matches: AlignmentPair[] = [];
  let rIdx = 0;
  let sIdx = 0;
  while (sIdx < surfaceChars.length) {
    const ch = surfaceChars[sIdx]!;
    let matched: string | null = null;
    if (isKanji(ch)) {
      for (const candidate of readingCandidates(ch, sIdx > 0, sIdx < surfaceChars.length - 1)) {
        if (reading.startsWith(candidate, rIdx)) {
          matched = candidate;
          break;
        }
      }
    } else if (isKana(ch)) {
      const katakana = toKatakana(ch);
      if (reading.startsWith(katakana, rIdx)) {
        matched = katakana;
      }
    }
    if (matched === null) break;
    matches.push([ch, matched]);
    rIdx += matched.length;
    sIdx += 1;
  }
  return [matches, sIdx, rIdx];
}

function endsWithAt(s: string, sub: string, endIdx: number): boolean {
  const start = endIdx - sub.length;
  if (start < 0) return false;
  for (let i = 0; i < sub.length; i++) {
    if (s.charCodeAt(start + i) !== sub.charCodeAt(i)) return false;
  }
  return true;
}

function backwardGreedy(
  surfaceChars: readonly string[],
  reading: string,
  sStop: number,
  rStop: number
): readonly [matches: AlignmentPair[], sStart: number, rStart: number] {
  const tail: AlignmentPair[] = [];
  let sIdx = surfaceChars.length;
  let rIdx = reading.length;
  while (sIdx > sStop && rIdx > rStop) {
    const ch = surfaceChars[sIdx - 1]!;
    let matched: string | null = null;
    if (isKanji(ch)) {
      for (const candidate of readingCandidates(ch, sIdx > 1, sIdx < surfaceChars.length)) {
        if (endsWithAt(reading, candidate, rIdx)) {
          matched = candidate;
          break;
        }
      }
    } else if (isKana(ch)) {
      const katakana = toKatakana(ch);
      if (endsWithAt(reading, katakana, rIdx)) {
        matched = katakana;
      }
    }
    if (matched === null) break;
    tail.push([ch, matched]);
    rIdx -= matched.length;
    sIdx -= 1;
  }
  tail.reverse();
  return [tail, sIdx, rIdx];
}


export function alignReading(
  surface: string,
  readingKatakana: string
): AlignmentPair[] | null {
  return fullAlign(Array.from(surface), readingKatakana);
}

export function canBeReading(
  surface: string,
  readingKatakana: string
): boolean {
  return fullAlign(Array.from(surface), readingKatakana) !== null;
}

function toReadingSegments(pairs: readonly AlignmentPair[]): string[] {
  const segments: string[] = [];
  for (const [surface, segment] of pairs) {
    if (segment.length === 0) continue;
    if (segments.length > 0 && isKana(surface) && isSmallKana(surface) && !SOKUON_KANA.has(surface)) {
      segments[segments.length - 1] += segment;
      continue;
    }
    segments.push(segment);
  }
  return segments;
}

export function alignReadingSegments(
  surface: string | null | undefined,
  readingKatakana: string | null | undefined
): string[] | null {
  if (!surface || !readingKatakana) return null;

  const surfaceChars = Array.from(surface);
  if (!surfaceChars.some(isKanji)) return null;

  const full = fullAlign(surfaceChars, readingKatakana);
  if (full !== null) {
    return toReadingSegments(full);
  }

  const [head, sEnd, rEnd] = forwardGreedy(surfaceChars, readingKatakana);
  const [tail, , rStart] = backwardGreedy(surfaceChars, readingKatakana, sEnd, rEnd);
  const middle = readingKatakana.slice(rEnd, rStart);

  const segments = toReadingSegments([...head, ["", middle], ...tail]);
  if (segments.length < 2) return null;
  return segments;
}
