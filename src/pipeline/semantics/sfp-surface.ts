import { LONG_VOWEL_MARKS, kanaVowel, type KanaVowel } from "../../analyzer/reduction-variant.js";
import { isTerminalParticleToken } from "../../types/pos.js";
import { morphSurface, type LongVowelReductionMetadata } from "../../types/token.js";

export type CanonicalTerminalSfpSurface = string;

let terminalSfpLexemes: readonly string[] = [];

const SMALL_TO_LARGE_KANA: ReadonlyMap<string, string> = new Map([
  ["ぁ", "あ"], ["ぃ", "い"], ["ぅ", "う"], ["ぇ", "え"], ["ぉ", "お"],
  ["ゃ", "や"], ["ゅ", "ゆ"], ["ょ", "よ"], ["ゎ", "わ"]
]);

const PURE_VOWEL_KANA: ReadonlySet<string> = new Set(["あ", "い", "う", "え", "お"]);

function toHiraganaChar(char: string): string {
  const cp = char.codePointAt(0);
  if (cp !== undefined && cp >= 0x30a1 && cp <= 0x30f6) {
    return String.fromCodePoint(cp - 0x60);
  }
  return char;
}

function largeKana(char: string): string {
  return SMALL_TO_LARGE_KANA.get(char) ?? char;
}

function isProlongationOf(char: string, vowel: KanaVowel | undefined): boolean {
  if (LONG_VOWEL_MARKS.has(char)) {
    return true;
  }
  if (vowel === undefined) {
    return false;
  }
  const large = largeKana(char);
  if (!PURE_VOWEL_KANA.has(large)) {
    return false;
  }
  const extended = kanaVowel(large);
  return extended === vowel || (vowel === "o" && large === "う") || (vowel === "e" && large === "い");
}

function spellingExplainsLexeme(spelling: readonly string[], lexeme: string): boolean {
  const lexemeChars = [...lexeme];
  let j = 0;
  let vowel: KanaVowel | undefined;
  let prolongable = false;
  for (const raw of spelling) {
    const char = toHiraganaChar(raw);
    const expected = lexemeChars[j];
    if (expected !== undefined && largeKana(char) === largeKana(expected)) {
      j += 1;
      prolongable = expected !== "っ";
      vowel = expected === "ん" ? undefined : kanaVowel(expected) ?? vowel;
      continue;
    }
    if (prolongable && isProlongationOf(char, vowel)) {
      continue;
    }
    return false;
  }
  return j === lexemeChars.length;
}

let lexicalVariants: ReadonlyMap<string, CanonicalTerminalSfpSurface> = new Map();
const SPELLING_LEXEME_MEMO_LIMIT = 65536;
const spellingLexemeMemo = new Map<string, CanonicalTerminalSfpSurface | null>();
let spellingLexemeEvictionOrder = spellingLexemeMemo.keys();

export function registerTerminalSfpLexicon(
  lexemes: Iterable<string>,
  variants: Iterable<readonly [variant: string, lexeme: string]>
): void {
  const lexemeList = [...new Set([...lexemes].filter((lexeme) => lexeme.length > 0))];
  const lexemeSet = new Set(lexemeList);
  const next = new Map<string, CanonicalTerminalSfpSurface>();
  for (const [variant, lexeme] of variants) {
    if (!lexemeSet.has(lexeme)) {
      throw new Error(`sfp.toml lexical_variant: unknown terminal SFP lexeme "${lexeme}" for "${variant}"`);
    }
    next.set(variant, lexeme);
  }
  terminalSfpLexemes = lexemeList;
  lexicalVariants = next;
  spellingLexemeMemo.clear();
  spellingLexemeEvictionOrder = spellingLexemeMemo.keys();
}

export function canonicalTerminalSfpSurface(surface: string | null | undefined): CanonicalTerminalSfpSurface | null {
  if (surface === null || surface === undefined || surface.length === 0) {
    return null;
  }
  const memo = spellingLexemeMemo.get(surface);
  if (memo !== undefined) {
    return memo;
  }
  let resolved: CanonicalTerminalSfpSurface | null = lexicalVariants.get(surface) ?? null;
  if (resolved === null) {
    const spelling = [...surface];
    resolved = terminalSfpLexemes.find((lexeme) => spellingExplainsLexeme(spelling, lexeme)) ?? null;
  }
  if (spellingLexemeMemo.size >= SPELLING_LEXEME_MEMO_LIMIT) {
    const oldest = spellingLexemeEvictionOrder.next();
    if (oldest.done !== true) spellingLexemeMemo.delete(oldest.value);
  }
  spellingLexemeMemo.set(surface, resolved);
  return resolved;
}

export interface TerminalSfpIdentityToken {
  readonly surface: string;
  readonly pos: number;
  readonly longVowelReduction?: LongVowelReductionMetadata;
}

export function terminalSfpLexeme(
  token: TerminalSfpIdentityToken | null | undefined
): CanonicalTerminalSfpSurface | null {
  if (token === null || token === undefined || !isTerminalParticleToken(token)) {
    return null;
  }
  const direct = canonicalTerminalSfpSurface(token.surface);
  if (direct !== null) {
    return direct;
  }
  const reduced = morphSurface(token);
  return reduced === token.surface ? null : canonicalTerminalSfpSurface(reduced);
}

export type TerminalSfpIdentitySource = string | TerminalSfpIdentityToken | null | undefined;

function lexemeOf(source: TerminalSfpIdentitySource): CanonicalTerminalSfpSurface | null {
  return typeof source === "string" || source === null || source === undefined
    ? canonicalTerminalSfpSurface(source)
    : terminalSfpLexeme(source);
}

export function isPlainNaParticleSurface(surface: string | null | undefined): boolean {
  return surface === "な" || surface === "ナ";
}

export function isFusedSelfQuestionSfpSurface(source: TerminalSfpIdentitySource): boolean {
  const canonical = lexemeOf(source);
  return canonical === "かしら" || canonical === "かな";
}

export function isKanaQuestionNaParticleSurface(source: TerminalSfpIdentitySource): boolean {
  const canonical = lexemeOf(source);
  return canonical === "な" || canonical === "のう";
}

export function isTerminalNeSfpSurface(source: TerminalSfpIdentitySource): boolean {
  return lexemeOf(source) === "ね";
}

export function isTerminalYoSfpSurface(source: TerminalSfpIdentitySource): boolean {
  return lexemeOf(source) === "よ";
}

export function isTerminalWaSfpSurface(source: TerminalSfpIdentitySource): boolean {
  return lexemeOf(source) === "わ";
}

export function isTerminalSkipSfpSurface(source: TerminalSfpIdentitySource): boolean {
  const canonical = lexemeOf(source);
  return canonical === "よ" || canonical === "ぞ" || canonical === "ぜ" || canonical === "さ";
}

export function isNeutralTerminalSfpToken(token: TerminalSfpIdentityToken | null | undefined): boolean {
  const lexeme = terminalSfpLexeme(token);
  return lexeme === "よ" || lexeme === "ぞ" || lexeme === "ぜ" || lexeme === "さ" || lexeme === "わ";
}

export function isColloquialNaiNeeSurface(surface: string | null | undefined): boolean {
  return surface === "ねぇ" || surface === "ねえ" || surface === "ねー";
}

export function isKnownTailTerminalSfpSurface(source: TerminalSfpIdentitySource): boolean {
  return lexemeOf(source) !== null;
}
