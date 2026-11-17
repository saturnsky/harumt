
import { addCoda, hasNoCoda, HANGUL_BASE, HANGUL_END, sanitizeIncompleteHangul } from "./hangul.js";
import { alignReadingSegments } from "./kanji-alignment.js";

export type ReadingRule = "official" | "common";

export const TRANSLITERATION_SIMILARITY_THRESHOLD = 0.75;

const SEPARATORS = new Set([" ", "·", "・", "･", "-", "‐", "‑"]);
const SMALL_YOON = new Set(["ャ", "ュ", "ョ"]);
const SMALL_VOWELS = new Set(["ァ", "ィ", "ゥ", "ェ", "ォ"]);
const CONTINUATION_HEAD = /^ー*[ンッァィゥェォャュョ]/u;
const SMALL_TO_FULL_KANA: { readonly [kana: string]: string } = {
  "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ", "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ"
};
const PURE_VOWELS = new Set(["ア", "イ", "ウ", "エ", "オ"]);
export const EXTENSION_KANA_PAIRS = new Set([
  "ファ", "フィ", "フェ", "フォ", "フュ",
  "フャ", "フョ",
  "ヴァ", "ヴィ", "ヴェ", "ヴォ", "ヴャ", "ヴュ", "ヴョ",
  "ウァ", "ウィ", "ウェ", "ウォ",
  "クァ", "クィ", "クェ", "クォ", "グァ", "グィ", "グェ", "グォ",
  "ティ", "ディ", "トゥ", "ドゥ", "テャ", "テュ", "テョ", "デャ", "デュ", "デョ",
  "チェ", "ジェ", "シェ",
  "ツァ", "ツィ", "ツェ", "ツォ",
  "イェ", "キィ", "キェ", "ギィ", "ギェ", "スィ", "ズィ", "ニェ",
  "ヒェ", "ビィ", "ビェ", "ピィ", "ピェ", "ミィ", "ミェ", "リィ", "リェ"
]);
const LONG_VOWEL_BY_PRECEDING: { readonly [vowel: string]: "drop" | "promoteI" } = {
  a: "drop",
  i: "drop",
  u: "drop",
  e: "promoteI",
  o: "drop"
};
const LOANWORD_FINAL_CODA: { readonly [kana: string]: string } = { "ル": "ㄹ", "ム": "ㅁ" };
const CODA_COMPETING = ["ー", "ン", "ッ"];
const LOANWORD_FINAL_EU_SYLLABLE: { readonly [kana: string]: string } = {
  "ト": "트", "ド": "드", "ク": "크", "グ": "그", "プ": "프", "ブ": "브", "フ": "프"
};
export const SOKUON_ABSORB_CODA: { readonly [kana: string]: string } = {
  "カ": "ㄱ", "キ": "ㄱ", "ク": "ㄱ", "ケ": "ㄱ", "コ": "ㄱ",
  "ガ": "ㄱ", "ギ": "ㄱ", "グ": "ㄱ", "ゲ": "ㄱ", "ゴ": "ㄱ",
  "パ": "ㅂ", "ピ": "ㅂ", "プ": "ㅂ", "ペ": "ㅂ", "ポ": "ㅂ",
  "バ": "ㅂ", "ビ": "ㅂ", "ブ": "ㅂ", "ベ": "ㅂ", "ボ": "ㅂ",
  "タ": "ㅅ", "テ": "ㅅ", "ト": "ㅅ",
  "ダ": "ㅅ", "デ": "ㅅ", "ド": "ㅅ"
};
export const SOKUON_NON_ABSORB_FOLLOWERS = new Set([
  "サ", "シ", "ス", "セ", "ソ", "ザ", "ジ", "ズ", "ゼ", "ゾ", "チ", "ツ",
  "ハ", "ヒ", "フ", "ヘ", "ホ",
  "シャ", "シュ", "ショ", "ジャ", "ジュ", "ジョ", "チャ", "チュ", "チョ",
  "シェ", "ジェ", "チェ"
]);
export const SOKUON_FOLLOWERS = new Set([...Object.keys(SOKUON_ABSORB_CODA), ...SOKUON_NON_ABSORB_FOLLOWERS]);
const N_BILABIAL_NEXT = new Set(["パ", "ピ", "プ", "ペ", "ポ", "バ", "ビ", "ブ", "ベ", "ボ"]);
const N_VELAR_NEXT = new Set(["カ", "キ", "ク", "ケ", "コ", "ガ", "ギ", "グ", "ゲ", "ゴ"]);
const A_ROW_ER_SUBSTITUTE: { readonly [kana: string]: string } = {
  "カ": "커", "ガ": "거", "タ": "터", "ダ": "더", "ナ": "너",
  "ハ": "허", "バ": "버", "パ": "퍼", "サ": "서", "ザ": "저",
  "マ": "머", "ラ": "러", "ヤ": "여", "ワ": "워"
};

const HIRAGANA_TO_KATAKANA: { readonly [char: string]: string } = {
  "ぁ": "ァ", "あ": "ア", "ぃ": "ィ", "い": "イ", "ぅ": "ゥ", "う": "ウ", "ぇ": "ェ", "え": "エ", "ぉ": "ォ", "お": "オ",
  "か": "カ", "が": "ガ", "き": "キ", "ぎ": "ギ", "く": "ク", "ぐ": "グ", "け": "ケ", "げ": "ゲ", "こ": "コ", "ご": "ゴ",
  "さ": "サ", "ざ": "ザ", "し": "シ", "じ": "ジ", "す": "ス", "ず": "ズ", "せ": "セ", "ぜ": "ゼ", "そ": "ソ", "ぞ": "ゾ",
  "た": "タ", "だ": "ダ", "ち": "チ", "ぢ": "ヂ", "っ": "ッ", "つ": "ツ", "づ": "ヅ", "て": "テ", "で": "デ", "と": "ト", "ど": "ド",
  "な": "ナ", "に": "ニ", "ぬ": "ヌ", "ね": "ネ", "の": "ノ",
  "は": "ハ", "ば": "バ", "ぱ": "パ", "ひ": "ヒ", "び": "ビ", "ぴ": "ピ", "ふ": "フ", "ぶ": "ブ", "ぷ": "プ", "へ": "ヘ", "べ": "ベ", "ぺ": "ペ", "ほ": "ホ", "ぼ": "ボ", "ぽ": "ポ",
  "ま": "マ", "み": "ミ", "む": "ム", "め": "メ", "も": "モ",
  "ゃ": "ャ", "や": "ヤ", "ゅ": "ュ", "ゆ": "ユ", "ょ": "ョ", "よ": "ヨ",
  "ら": "ラ", "り": "リ", "る": "ル", "れ": "レ", "ろ": "ロ",
  "ゎ": "ヮ", "わ": "ワ", "ゐ": "ヰ", "ゑ": "ヱ", "を": "ヲ", "ん": "ン",
  "ゔ": "ヴ", "ゕ": "ヵ", "ゖ": "ヶ", "ー": "ー"
};

type Entry = readonly [initial: string, medial: string, vowel: string];
function entry(initial: string, medial: string, vowel: string): Entry {
  return [initial, medial, vowel];
}

const OFFICIAL_MAP: { readonly [kana: string]: Entry } = {
  "ア": entry("아", "아", "a"), "イ": entry("이", "이", "i"), "ウ": entry("우", "우", "u"), "エ": entry("에", "에", "e"), "オ": entry("오", "오", "o"),
  "カ": entry("가", "카", "a"), "キ": entry("기", "키", "i"), "ク": entry("구", "쿠", "u"), "ケ": entry("게", "케", "e"), "コ": entry("고", "코", "o"),
  "ガ": entry("가", "가", "a"), "ギ": entry("기", "기", "i"), "グ": entry("구", "구", "u"), "ゲ": entry("게", "게", "e"), "ゴ": entry("고", "고", "o"),
  "サ": entry("사", "사", "a"), "シ": entry("시", "시", "i"), "ス": entry("스", "스", "u"), "セ": entry("세", "세", "e"), "ソ": entry("소", "소", "o"),
  "ザ": entry("자", "자", "a"), "ジ": entry("지", "지", "i"), "ズ": entry("즈", "즈", "u"), "ゼ": entry("제", "제", "e"), "ゾ": entry("조", "조", "o"),
  "タ": entry("다", "타", "a"), "チ": entry("지", "치", "i"), "ツ": entry("쓰", "쓰", "u"), "テ": entry("데", "테", "e"), "ト": entry("도", "토", "o"),
  "ダ": entry("다", "다", "a"), "ヂ": entry("지", "지", "i"), "ヅ": entry("즈", "즈", "u"), "デ": entry("데", "데", "e"), "ド": entry("도", "도", "o"),
  "ナ": entry("나", "나", "a"), "ニ": entry("니", "니", "i"), "ヌ": entry("누", "누", "u"), "ネ": entry("네", "네", "e"), "ノ": entry("노", "노", "o"),
  "ハ": entry("하", "하", "a"), "ヒ": entry("히", "히", "i"), "フ": entry("후", "후", "u"), "ヘ": entry("헤", "헤", "e"), "ホ": entry("호", "호", "o"),
  "バ": entry("바", "바", "a"), "ビ": entry("비", "비", "i"), "ブ": entry("부", "부", "u"), "ベ": entry("베", "베", "e"), "ボ": entry("보", "보", "o"),
  "パ": entry("파", "파", "a"), "ピ": entry("피", "피", "i"), "プ": entry("푸", "푸", "u"), "ペ": entry("페", "페", "e"), "ポ": entry("포", "포", "o"),
  "マ": entry("마", "마", "a"), "ミ": entry("미", "미", "i"), "ム": entry("무", "무", "u"), "メ": entry("메", "메", "e"), "モ": entry("모", "모", "o"),
  "ヤ": entry("야", "야", "a"), "ユ": entry("유", "유", "u"), "ヨ": entry("요", "요", "o"),
  "ラ": entry("라", "라", "a"), "リ": entry("리", "리", "i"), "ル": entry("루", "루", "u"), "レ": entry("레", "레", "e"), "ロ": entry("로", "로", "o"),
  "ワ": entry("와", "와", "a"), "ヰ": entry("이", "이", "i"), "ヱ": entry("에", "에", "e"), "ヲ": entry("오", "오", "o"),
  "キャ": entry("갸", "캬", "a"), "キュ": entry("규", "큐", "u"), "キョ": entry("교", "쿄", "o"),
  "ギャ": entry("갸", "갸", "a"), "ギュ": entry("규", "규", "u"), "ギョ": entry("교", "교", "o"),
  "シャ": entry("샤", "샤", "a"), "シュ": entry("슈", "슈", "u"), "ショ": entry("쇼", "쇼", "o"),
  "ジャ": entry("자", "자", "a"), "ジュ": entry("주", "주", "u"), "ジョ": entry("조", "조", "o"),
  "ヂャ": entry("자", "자", "a"), "ヂュ": entry("주", "주", "u"), "ヂョ": entry("조", "조", "o"),
  "チャ": entry("자", "차", "a"), "チュ": entry("주", "추", "u"), "チョ": entry("조", "초", "o"),
  "ニャ": entry("냐", "냐", "a"), "ニュ": entry("뉴", "뉴", "u"), "ニョ": entry("뇨", "뇨", "o"),
  "ヒャ": entry("햐", "햐", "a"), "ヒュ": entry("휴", "휴", "u"), "ヒョ": entry("효", "효", "o"),
  "ビャ": entry("뱌", "뱌", "a"), "ビュ": entry("뷰", "뷰", "u"), "ビョ": entry("뵤", "뵤", "o"),
  "ピャ": entry("퍄", "퍄", "a"), "ピュ": entry("퓨", "퓨", "u"), "ピョ": entry("표", "표", "o"),
  "ミャ": entry("먀", "먀", "a"), "ミュ": entry("뮤", "뮤", "u"), "ミョ": entry("묘", "묘", "o"),
  "リャ": entry("랴", "랴", "a"), "リュ": entry("류", "류", "u"), "リョ": entry("료", "료", "o"),
  "ファ": entry("파", "파", "a"), "フィ": entry("피", "피", "i"), "フェ": entry("페", "페", "e"), "フォ": entry("포", "포", "o"), "フャ": entry("퍄", "퍄", "a"), "フュ": entry("퓨", "퓨", "u"), "フョ": entry("표", "표", "o"),
  "ヴァ": entry("바", "바", "a"), "ヴィ": entry("비", "비", "i"), "ヴェ": entry("베", "베", "e"), "ヴォ": entry("보", "보", "o"), "ヴャ": entry("뱌", "뱌", "a"), "ヴュ": entry("뷰", "뷰", "u"), "ヴョ": entry("뵤", "뵤", "o"), "ヴ": entry("브", "브", "u"),
  "ウァ": entry("와", "와", "a"), "ウィ": entry("위", "위", "i"), "ウェ": entry("웨", "웨", "e"), "ウォ": entry("워", "워", "o"),
  "クァ": entry("콰", "콰", "a"), "クィ": entry("퀴", "퀴", "i"), "クェ": entry("퀘", "퀘", "e"), "クォ": entry("쿼", "쿼", "o"),
  "グァ": entry("과", "과", "a"), "グィ": entry("귀", "귀", "i"), "グェ": entry("궤", "궤", "e"), "グォ": entry("궈", "궈", "o"),
  "イェ": entry("예", "예", "e"),
  "ティ": entry("티", "티", "i"), "ディ": entry("디", "디", "i"), "トゥ": entry("투", "투", "u"), "ドゥ": entry("두", "두", "u"), "テャ": entry("탸", "탸", "a"), "テュ": entry("튜", "튜", "u"), "テョ": entry("툐", "툐", "o"), "デャ": entry("댜", "댜", "a"), "デュ": entry("듀", "듀", "u"), "デョ": entry("됴", "됴", "o"),
  "チェ": entry("체", "체", "e"), "ジェ": entry("제", "제", "e"), "シェ": entry("셰", "셰", "e"),
  "ツァ": entry("차", "차", "a"), "ツィ": entry("치", "치", "i"), "ツェ": entry("체", "체", "e"), "ツォ": entry("초", "초", "o"),
  "キィ": entry("키", "키", "i"), "キェ": entry("켸", "켸", "e"), "ギィ": entry("기", "기", "i"), "ギェ": entry("계", "계", "e"),
  "スィ": entry("시", "시", "i"), "ズィ": entry("지", "지", "i"), "ニェ": entry("녜", "녜", "e"),
  "ヒェ": entry("혜", "혜", "e"), "ビィ": entry("비", "비", "i"), "ビェ": entry("볘", "볘", "e"), "ピィ": entry("피", "피", "i"), "ピェ": entry("폐", "폐", "e"),
  "ミィ": entry("미", "미", "i"), "ミェ": entry("몌", "몌", "e"), "リィ": entry("리", "리", "i"), "リェ": entry("례", "례", "e"),
  "ナァ": entry("나", "나", "a"), "ニィ": entry("니", "니", "i"), "シィ": entry("시", "시", "i"),
  "ボォ": entry("보", "보", "o"), "クゥ": entry("구", "쿠", "u"), "ズゥ": entry("즈", "즈", "u"), "ワァ": entry("와", "와", "a"),
  "ヤァ": entry("야", "야", "a"), "ラァ": entry("라", "라", "a"), "パァ": entry("파", "파", "a"), "ガァ": entry("가", "가", "a"), "アァ": entry("아", "아", "a"),
  "ゴォ": entry("고", "고", "o"), "オォ": entry("오", "오", "o"), "ポォ": entry("포", "포", "o"), "ホォ": entry("호", "호", "o"),
  "グゥ": entry("구", "구", "u"), "ウゥ": entry("우", "우", "u"), "ルゥ": entry("루", "루", "u"), "プゥ": entry("푸", "푸", "u"), "ユゥ": entry("유", "유", "u"),
  "ヒィ": entry("히", "히", "i")
};

const COMMON_OVERRIDES: { readonly [kana: string]: string } = {
  "カ": "카", "キ": "키", "ク": "쿠", "ケ": "케", "コ": "코",
  "タ": "타", "チ": "치", "ツ": "츠", "テ": "테", "ト": "토",
  "キャ": "캬", "キュ": "큐", "キョ": "쿄",
  "チャ": "챠", "チュ": "츄", "チョ": "쵸",
  "ジャ": "쟈", "ジュ": "쥬", "ジョ": "죠",
  "ヂャ": "쟈", "ヂュ": "쥬", "ヂョ": "죠"
};

export type KoreanReadings = Partial<Record<ReadingRule, string>>;

export function generateKoreanReadings(kana: string, options: { readonly surface?: string } = {}): KoreanReadings {
  const normalized = normalizeKana(kana);
  if (normalized.length === 0) {
    return {};
  }
  const nasalRun = /^(ン{2,})(ッ?)$/u.exec(normalized);
  if (nasalRun !== null) {
    const rendered = `${"으".repeat(nasalRun[1]!.length - 1)}${nasalRun[2] === "" ? "음" : "읏"}`;
    return { official: rendered, common: rendered };
  }
  const segments = options.surface === undefined || options.surface.length === 0 ? [normalized] : alignReadingSegmentsFallback(options.surface, normalized);
  const tokens: string[] = [];
  const boundaries = new Set<number>();
  for (const [index, segment] of segments.entries()) {
    const segmentTokens = tokenizeKana(segment);
    if (segmentTokens === undefined) {
      return {};
    }
    if (index > 0 && segmentTokens.length > 0) {
      boundaries.add(tokens.length);
    }
    tokens.push(...segmentTokens);
  }
  if (isLoanwordKatakana(normalized, options.surface ?? "")) {
    const rendered = renderTokens(tokens, "loanword", boundaries);
    return rendered === undefined ? {} : { official: rendered, common: rendered };
  }
  const official = renderTokens(tokens, "official", boundaries);
  const common = renderTokens(tokens, "common", boundaries);
  return official === undefined || common === undefined ? {} : { official, common };
}

export interface LatinWordFinalCorrespondences {
  readonly coda: ReadonlyMap<string, string>;
  readonly stopSyllable: ReadonlyMap<string, string>;
}

export function latinWordKatakanaKoreanReading(
  kana: string,
  correspondences: LatinWordFinalCorrespondences
): string | undefined {
  const normalized = normalizeKana(kana);
  if (normalized.length === 0) {
    return undefined;
  }
  const render = (text: string): string | undefined => {
    const readings = generateKoreanReadings(text);
    return readings.official ?? readings.common;
  };
  const coda = correspondences.coda.get(normalized.at(-1) ?? "");
  if (coda !== undefined && normalized.length >= 2) {
    const head = render(normalized.slice(0, -1));
    if (head !== undefined && head.length > 0) {
      const merged = addCoda(head.slice(-1), coda);
      if (merged.length === 1) {
        return head.slice(0, -1) + merged;
      }
    }
    return render(normalized);
  }
  const stopSyllable = correspondences.stopSyllable.get(normalized.slice(-2));
  if (stopSyllable !== undefined && normalized.length >= 3) {
    const head = render(normalized.slice(0, -2));
    return head === undefined || head.length === 0 ? render(normalized) : head + stopSyllable;
  }
  return render(normalized);
}

export function normalizeKana(kana: string): string {
  const text = Array.from(kana.trim()).map((ch) => HIRAGANA_TO_KATAKANA[ch] ?? ch).join("");
  if (text.length === 0) {
    return "";
  }
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    if (SEPARATORS.has(char) || ["ー", "ン", "ッ"].includes(char) || SMALL_YOON.has(char) || PURE_VOWELS.has(char) || OFFICIAL_MAP[char] !== undefined) {
      continue;
    }
    if (SMALL_VOWELS.has(char)) {
      continue;
    }
    return "";
  }
  return text;
}

export function isLoanwordKatakana(kana: string, surface = ""): boolean {
  if (kana.length === 0) {
    return false;
  }
  if (kana.includes("ー") || kana.includes("ヴ")) {
    return true;
  }
  for (let i = 0; i < kana.length - 1; i += 1) {
    if (EXTENSION_KANA_PAIRS.has(kana.slice(i, i + 2))) {
      return true;
    }
  }
  if (kana.length >= 2 && kana.at(-2) === "ッ" && SOKUON_FOLLOWERS.has(kana.at(-1) ?? "")) {
    return true;
  }
  if (!surfaceHasKanji(surface)) {
    for (let i = 0; i < kana.length - 1; i += 1) {
      if (kana[i] === "ッ" && SOKUON_FOLLOWERS.has(kana[i + 1] ?? "")) {
        return true;
      }
    }
  }
  return false;
}

export function tokenizeKana(kana: string): string[] | undefined {
  const tokens: string[] = [];
  let i = 0;
  while (i < kana.length) {
    const char = kana[i] ?? "";
    if (SEPARATORS.has(char) || ["ー", "ン", "ッ"].includes(char)) {
      tokens.push(char);
      i += 1;
      continue;
    }
    if (SMALL_YOON.has(char) || SMALL_VOWELS.has(char)) {
      tokens.push(SMALL_TO_FULL_KANA[char] ?? char);
      i += 1;
      continue;
    }
    if (SMALL_YOON.has(kana[i + 1] ?? "")) {
      const pair = kana.slice(i, i + 2);
      if (OFFICIAL_MAP[pair] === undefined) {
        return undefined;
      }
      tokens.push(pair);
      i += 2;
      continue;
    }
    if (SMALL_VOWELS.has(kana[i + 1] ?? "")) {
      const pair = kana.slice(i, i + 2);
      if (OFFICIAL_MAP[pair] !== undefined) {
        tokens.push(pair);
        i += 2;
        continue;
      }
    }
    if (OFFICIAL_MAP[char] === undefined) {
      return undefined;
    }
    tokens.push(char);
    i += 1;
  }
  return tokens;
}

export function renderTokens(tokens: readonly string[], rule: "official" | "common" | "loanword", boundaries = new Set<number>()): string | undefined {
  const parts: string[] = [];
  let isInitial = true;
  let previousVowel = "";
  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx] ?? "";
    if (boundaries.has(idx)) {
      previousVowel = "";
    }
    if (SEPARATORS.has(token)) {
      if (parts.length > 0 && parts.at(-1) !== " ") {
        parts.push(" ");
      }
      isInitial = true;
      previousVowel = "";
      idx += 1;
      continue;
    }
    if (token === "ー") {
      if (rule === "loanword" && LONG_VOWEL_BY_PRECEDING[previousVowel] === "promoteI") {
        parts.push("이");
        previousVowel = "i";
        isInitial = false;
      }
      idx += 1;
      continue;
    }
    if (token === "ン") {
      if (parts.length === 0 || !hasNoCoda(parts.at(-1) ?? "")) {
        parts.push("응");
        previousVowel = "";
        isInitial = false;
        idx += 1;
        continue;
      }
      let coda = "ㄴ";
      if (rule === "loanword") {
        const head = (tokens[idx + 1] ?? "")[0] ?? "";
        if (N_BILABIAL_NEXT.has(head)) {
          coda = "ㅁ";
        } else if (N_VELAR_NEXT.has(head)) {
          coda = "ㅇ";
        }
      }
      parts[parts.length - 1] = addCoda(parts.at(-1) ?? "", coda);
      previousVowel = "";
      isInitial = false;
      idx += 1;
      continue;
    }
    if (token === "ッ") {
      if (parts.length === 0) {
        parts.push("읏");
        previousVowel = "";
        isInitial = false;
        idx += 1;
        continue;
      }
      if (!hasNoCoda(parts.at(-1) ?? "")) {
        previousVowel = "";
        idx += 1;
        continue;
      }
      if (rule !== "loanword" || idx + 1 >= tokens.length) {
        parts[parts.length - 1] = addCoda(parts.at(-1) ?? "", "ㅅ");
        previousVowel = "";
        isInitial = false;
        idx += 1;
        continue;
      }
      const next = tokens[idx + 1] ?? "";
      const coda = SOKUON_ABSORB_CODA[next];
      if (coda === undefined) {
        previousVowel = "";
        idx += 1;
        continue;
      }
      let canAbsorb = isWordEnd(tokens, idx + 1);
      const after = tokens[idx + 2];
      if (after !== undefined && !["ッ", "ン", "ー"].includes(after) && LOANWORD_FINAL_CODA[after] === undefined) {
        canAbsorb = true;
      }
      if (canAbsorb) {
        parts[parts.length - 1] = addCoda(parts.at(-1) ?? "", coda);
        previousVowel = "";
        isInitial = false;
        idx += 2;
      } else {
        previousVowel = "";
        idx += 1;
      }
      continue;
    }
    if (rule === "loanword" && LOANWORD_FINAL_CODA[token] !== undefined && parts.length > 0 && hasNoCoda(parts.at(-1) ?? "") && !CODA_COMPETING.includes(tokens[idx + 1] ?? "")) {
      parts[parts.length - 1] = addCoda(parts.at(-1) ?? "", LOANWORD_FINAL_CODA[token] ?? "");
      previousVowel = "";
      isInitial = false;
      idx += 1;
      continue;
    }
    if (rule === "loanword" && LOANWORD_FINAL_EU_SYLLABLE[token] !== undefined && (isWordEnd(tokens, idx) || isBeforeConsonantMora(tokens, idx))) {
      parts.push(LOANWORD_FINAL_EU_SYLLABLE[token] ?? "");
      previousVowel = "u";
      isInitial = false;
      idx += 1;
      continue;
    }
    if (rule === "loanword" && A_ROW_ER_SUBSTITUTE[token] !== undefined && tokens[idx + 1] === "ー" && isWordEnd(tokens, idx + 1) && countPrecedingInSegment(tokens, idx) >= 2) {
      parts.push(A_ROW_ER_SUBSTITUTE[token] ?? "");
      previousVowel = "eo";
      isInitial = false;
      idx += 2;
      continue;
    }
    const mapped = OFFICIAL_MAP[token];
    if (mapped === undefined) {
      return undefined;
    }
    const [initialForm, medialForm, vowel] = mapped;
    if (shouldSkipAsLongVowel(previousVowel, token)) {
      idx += 1;
      continue;
    }
    const syllable = rule === "loanword" ? medialForm : rule === "common" ? COMMON_OVERRIDES[token] ?? medialForm : isInitial ? initialForm : medialForm;
    parts.push(syllable);
    previousVowel = vowel;
    isInitial = false;
    idx += 1;
  }
  return sanitizeIncompleteHangul(parts.join("").trim());
}

export function decomposeToJamo(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code !== undefined && HANGUL_BASE <= code && code <= HANGUL_END) {
      const syl = code - 0xAC00;
      const lead = Math.floor(syl / 588);
      const vowel = Math.floor((syl % 588) / 28);
      const tail = syl % 28;
      out.push(String.fromCodePoint(0x1100 + lead), String.fromCodePoint(0x1161 + vowel));
      if (tail !== 0) {
        out.push(String.fromCodePoint(0x11A7 + tail));
      }
    } else {
      out.push(ch);
    }
  }
  return out.join("");
}

export function estimateTransliterationSimilarity(kana: string, korean: string): number {
  if (kana.length === 0 || korean.length === 0) {
    return 0;
  }
  const candidates = Object.values(generateKoreanReadings(kana));
  const forcedTokens = tokenizeKana(normalizeKana(kana));
  const forced = forcedTokens === undefined ? undefined : renderTokens(forcedTokens, "loanword");
  if (forced !== undefined) {
    candidates.push(forced);
  }
  const target = decomposeToJamo(korean);
  return candidates.reduce((best, candidate) => Math.max(best, sequenceRatio(target, decomposeToJamo(candidate))), 0);
}

export async function renderKatakanaWithDict(
  kana: string,
  options: {
    readonly surface?: string;
    readonly findTransliteration: (kana: string) => string | undefined | Promise<string | undefined>;
    readonly minMorae?: number;
    readonly minMatches?: number;
  }
): Promise<{ readonly official: string; readonly common: string } | undefined> {
  const normalized = normalizeKana(kana);
  const tokens = tokenizeKana(normalized);
  if (tokens === undefined || tokens.length === 0) {
    return undefined;
  }
  const minMorae = options.minMorae ?? 2;
  const minMatches = options.minMatches ?? 1;
  const positions = [0];
  for (const token of tokens) {
    positions.push((positions.at(-1) ?? 0) + token.length);
  }
  const prefix: [number, number, string][] = [];
  let i = 0;
  while (i < tokens.length) {
    let found = false;
    for (let j = tokens.length; j >= i + minMorae; j -= 1) {
      const kr = await options.findTransliteration(normalized.slice(positions[i], positions[j]));
      if (kr !== undefined) {
        prefix.push([i, j, kr]);
        i = j;
        found = true;
        break;
      }
    }
    if (!found) {
      break;
    }
  }
  const leftEnd = i;
  const suffix: [number, number, string][] = [];
  i = tokens.length;
  while (i > leftEnd) {
    let found = false;
    for (let start = leftEnd; start <= i - minMorae; start += 1) {
      const kr = await options.findTransliteration(normalized.slice(positions[start], positions[i]));
      if (kr !== undefined) {
        suffix.push([start, i, kr]);
        i = start;
        found = true;
        break;
      }
    }
    if (!found) {
      break;
    }
  }
  suffix.reverse();
  if (prefix.length + suffix.length < Math.max(1, minMatches)) {
    return undefined;
  }
  const segments: [string, string | undefined][] = [];
  for (const [start, end, kr] of prefix) {
    segments.push([normalized.slice(positions[start], positions[end]), kr]);
  }
  if (i > leftEnd) {
    segments.push([normalized.slice(positions[leftEnd], positions[i]), undefined]);
  }
  for (const [start, end, kr] of suffix) {
    segments.push([normalized.slice(positions[start], positions[end]), kr]);
  }
  const parts: string[] = [];
  for (const [segment, kr] of segments) {
    if (kr !== undefined) {
      parts.push(kr);
      continue;
    }
    if (segments[0]?.[0] !== segment && CONTINUATION_HEAD.test(segment)) {
      return undefined;
    }
    const segmentTokens = tokenizeKana(segment);
    const rendered = segmentTokens === undefined ? undefined : renderTokens(segmentTokens, "loanword");
    if (rendered === undefined) {
      return undefined;
    }
    parts.push(rendered);
  }
  const result = parts.join("").trim();
  return { official: result, common: result };
}

function alignReadingSegmentsFallback(surface: string, kana: string): string[] {
  if (!surfaceHasKanji(surface)) {
    return [kana];
  }
  return alignReadingSegments(surface, kana) ?? [kana];
}

function surfaceHasKanji(surface: string): boolean {
  return Array.from(surface).some((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return (0x4E00 <= code && code <= 0x9FFF)
      || (0x3400 <= code && code <= 0x4DBF)
      || (0xF900 <= code && code <= 0xFAFF)
      || (0x20000 <= code && code <= 0x2FFFF);
  });
}

function isWordEnd(tokens: readonly string[], idx: number): boolean {
  return idx + 1 >= tokens.length || SEPARATORS.has(tokens[idx + 1] ?? "");
}

function countPrecedingInSegment(tokens: readonly string[], idx: number): number {
  let count = 0;
  for (let j = idx - 1; j >= 0 && !SEPARATORS.has(tokens[j] ?? ""); j -= 1) {
    count += 1;
  }
  return count;
}

function isBeforeConsonantMora(tokens: readonly string[], idx: number): boolean {
  const next = tokens[idx + 1];
  return next !== undefined && !SEPARATORS.has(next) && !PURE_VOWELS.has(next) && !["ー", "ッ", "ン"].includes(next);
}

function shouldSkipAsLongVowel(previousVowel: string, token: string): boolean {
  return (token === "ア" && previousVowel === "a")
    || (token === "イ" && previousVowel === "i")
    || (token === "ウ" && (previousVowel === "u" || previousVowel === "o"))
    || (token === "オ" && previousVowel === "o");
}


function sequenceRatio(left: string, right: string): number {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const matches = matchingBlocks(leftChars, rightChars).reduce((total, block) => total + block.size, 0);
  const length = leftChars.length + rightChars.length;
  return length === 0 ? 1 : (2 * matches) / length;
}

function matchingBlocks(
  left: readonly string[],
  right: readonly string[]
): readonly { readonly left: number; readonly right: number; readonly size: number }[] {
  const blocks: { left: number; right: number; size: number }[] = [];
  const queue: [number, number, number, number][] = [[0, left.length, 0, right.length]];
  const rightIndex = sequenceRightIndex(right);

  while (queue.length > 0) {
    const [leftStart, leftEnd, rightStart, rightEnd] = queue.pop()!;
    const match = findLongestMatch(left, right, rightIndex, leftStart, leftEnd, rightStart, rightEnd);
    if (match.size === 0) {
      continue;
    }
    blocks.push(match);
    if (leftStart < match.left && rightStart < match.right) {
      queue.push([leftStart, match.left, rightStart, match.right]);
    }
    if (match.left + match.size < leftEnd && match.right + match.size < rightEnd) {
      queue.push([match.left + match.size, leftEnd, match.right + match.size, rightEnd]);
    }
  }

  blocks.sort((a, b) => a.left - b.left || a.right - b.right);
  const merged: { left: number; right: number; size: number }[] = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (previous !== undefined && previous.left + previous.size === block.left && previous.right + previous.size === block.right) {
      previous.size += block.size;
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

function sequenceRightIndex(right: readonly string[]): ReadonlyMap<string, readonly number[]> {
  const index = new Map<string, number[]>();
  for (const [position, char] of right.entries()) {
    const positions = index.get(char);
    if (positions === undefined) {
      index.set(char, [position]);
    } else {
      positions.push(position);
    }
  }

  if (right.length >= 200) {
    const popularThreshold = Math.floor(right.length / 100) + 1;
    for (const [char, positions] of index) {
      if (positions.length > popularThreshold) {
        index.delete(char);
      }
    }
  }
  return index;
}

function findLongestMatch(
  left: readonly string[],
  right: readonly string[],
  rightIndex: ReadonlyMap<string, readonly number[]>,
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number
): { readonly left: number; readonly right: number; readonly size: number } {
  let bestLeft = leftStart;
  let bestRight = rightStart;
  let bestSize = 0;
  let previousLengths = new Map<number, number>();

  for (let i = leftStart; i < leftEnd; i += 1) {
    const currentLengths = new Map<number, number>();
    for (const j of rightIndex.get(left[i] ?? "") ?? []) {
      if (j < rightStart) {
        continue;
      }
      if (j >= rightEnd) {
        break;
      }
      const k = (previousLengths.get(j - 1) ?? 0) + 1;
      currentLengths.set(j, k);
      if (k > bestSize) {
        bestLeft = i - k + 1;
        bestRight = j - k + 1;
        bestSize = k;
      }
    }
    previousLengths = currentLengths;
  }

  while (
    bestLeft > leftStart &&
    bestRight > rightStart &&
    left[bestLeft - 1] === right[bestRight - 1]
  ) {
    bestLeft -= 1;
    bestRight -= 1;
    bestSize += 1;
  }
  while (
    bestLeft + bestSize < leftEnd &&
    bestRight + bestSize < rightEnd &&
    left[bestLeft + bestSize] === right[bestRight + bestSize]
  ) {
    bestSize += 1;
  }

  return { left: bestLeft, right: bestRight, size: bestSize };
}
