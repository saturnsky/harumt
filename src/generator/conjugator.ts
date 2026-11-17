
import { parse, type TomlValueWithoutBigInt } from "smol-toml";

import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import type { Warning } from "../types/warning.js";
import {
  JONG_BIEUP,
  JONG_DIGEUT,
  JONG_HIEUT,
  JONG_MIEUM,
  JONG_NIEUN,
  JONG_NONE,
  JONG_RIEUL,
  JONG_RIEUL_MIEUM,
  JONG_SIOT,
  JONG_SSANG_SIOT,
  JUNG_A,
  JUNG_AE,
  JUNG_E,
  JUNG_EO,
  JUNG_EU,
  JUNG_I,
  JUNG_O,
  JUNG_OE,
  JUNG_U,
  JUNG_WA,
  JUNG_WAE,
  JUNG_WEO,
  JUNG_YA,
  JUNG_YAE,
  JUNG_YEO,
  compose,
  decompose,
  getInfo,
  isPositive,
  setJongseong
} from "./hangul.js";

export type IrregularType = "ㅂ" | "ㄷ" | "ㅅ" | "ㅎ" | "르" | "러" | "ㄹ" | "으" | "여" | "ㅣ" | "뵙" | "옵" | "아니";

export function irregularType(value: string | null | undefined): IrregularType | null {
  switch (value) {
    case "ㅂ":
    case "ㄷ":
    case "ㅅ":
    case "ㅎ":
    case "르":
    case "러":
    case "ㄹ":
    case "으":
    case "여":
    case "ㅣ":
    case "뵙":
    case "옵":
    case "아니":
      return value;
    default:
      return null;
  }
}

export const asIrregular = irregularType;

type ConjugationWarningSink = (warning: Warning, dedupeKey: string) => void;

let activeConjugationWarningSink: ConjugationWarningSink | null = null;

export function withConjugationWarningCollection<T>(fn: () => T): { readonly value: T; readonly warnings: readonly Warning[] } {
  const previous = activeConjugationWarningSink;
  const warnings: Warning[] = [];
  const seen = new Set<string>();
  activeConjugationWarningSink = (warning, dedupeKey) => {
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      warnings.push(warning);
    }
    previous?.(warning, dedupeKey);
  };
  try {
    const result = fn();
    if (result instanceof Promise) {
      return {
        value: result.finally(() => { activeConjugationWarningSink = previous; }) as T,
        warnings
      };
    }
    activeConjugationWarningSink = previous;
    return { value: result, warnings };
  } catch (error) {
    activeConjugationWarningSink = previous;
    throw error;
  }
}

export function emitConjugationWarning(warning: Warning, dedupeKey: string): void {
  activeConjugationWarningSink?.(warning, dedupeKey);
}

function tryRieulDrop(stem: string, irregular: IrregularType | null | undefined, suffix: string): string | null {
  if (irregular !== "ㄹ" || suffix.length === 0) return null;
  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);
  if (jong !== JONG_RIEUL) return null;
  const firstCho = getInfo(suffix[0] ?? "")[0];
  if (firstCho === 2 || firstCho === 7 || firstCho === 9) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}${suffix}`;
  }
  return null;
}

function recordNonDaPredicateLemmaWarning(lemma: string, fallbackLemma: string): void {
  activeConjugationWarningSink?.({
    type: "dictionary_entry_issue",
    severity: "warning",
    opKind: "non_da_predicate_lemma",
    candidates: [lemma],
    winner: fallbackLemma,
    message: `한국어 용언 lemma ${JSON.stringify(lemma)}가 "다"로 끝나지 않아 ${JSON.stringify(fallbackLemma)}로 보정했습니다. 사전 엔트리의 korean/korean_pos 값을 확인하세요.`
  }, `non_da_predicate_lemma:${lemma}:${fallbackLemma}`);
}


type EndingPath =
  | "ae"
  | "past"
  | "direct"
  | "nominal_m"
  | "stem_root"
  | "eu_medial"
  | "adnominal_present"
  | "adnominal_future"
  | "adnominal_past"
  | "verb_quotative"
  | "formal_declarative"
  | "formal_declarative_ka"
  | "formal_propositive"
  | "consonant_suffix";

interface EndingSpec {
  path: EndingPath;
  arg?: string;
  post?: string;
  foreign?: string;
}

let _endingsToml: string | undefined;

export async function initConjugator(loader: DataLoader): Promise<void> {
  const configPath = loader.joinPath(resolveDataSection("config"), "korean_endings.toml");
  _endingsToml = await loader.readTextFile(configPath);
}

let _endings: Readonly<Record<string, EndingSpec>> | undefined;

function getEndings(): Readonly<Record<string, EndingSpec>> {
  _endings ??= loadEndingsConfig();
  return _endings;
}

function loadEndingsConfig(): Readonly<Record<string, EndingSpec>> {
  if (_endingsToml === undefined) {
    throw new Error("conjugator not initialized: call initConjugator() first");
  }
  const loaded = parse(_endingsToml, { integersAsBigInt: false });
  const endings = loaded["ending"];
  if (!Array.isArray(endings)) {
    throw new Error("korean_endings.toml requires [[ending]] entries");
  }
  const result: Record<string, EndingSpec> = {};
  for (const entryValue of endings) {
    const entry = endingSpecFromToml(entryValue);
    const { key, path, arg, post, foreign } = entry;
    result[key] = {
      path,
      ...(arg === undefined ? {} : { arg }),
      ...(post === undefined ? {} : { post }),
      ...(foreign === undefined ? {} : { foreign })
    };
  }
  return result;
}

function endingSpecFromToml(value: TomlValueWithoutBigInt): EndingSpec & { readonly key: string } {
  if (!isTomlStringTable(value)) {
    throw new Error("invalid korean ending entry");
  }
  const key = stringField(value, "key");
  const path = endingPathField(value, "path");
  const arg = optionalStringField(value, "arg");
  const post = optionalStringField(value, "post");
  const foreign = optionalStringField(value, "foreign");
  return {
    key,
    path,
    ...(arg === undefined ? {} : { arg }),
    ...(post === undefined ? {} : { post }),
    ...(foreign === undefined ? {} : { foreign })
  };
}

function isTomlStringTable(value: TomlValueWithoutBigInt): value is { readonly [key: string]: TomlValueWithoutBigInt } {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function stringField(table: { readonly [key: string]: TomlValueWithoutBigInt }, key: string): string {
  const value = table[key];
  if (typeof value !== "string") {
    throw new Error(`korean ending entry requires string ${key}`);
  }
  return value;
}

function optionalStringField(table: { readonly [key: string]: TomlValueWithoutBigInt }, key: string): string | undefined {
  const value = table[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`korean ending entry requires string ${key}`);
  }
  return value;
}

function endingPathField(table: { readonly [key: string]: TomlValueWithoutBigInt }, key: string): EndingPath {
  const value = stringField(table, key);
  if (!isEndingPath(value)) {
    throw new Error(`unknown korean ending path: ${JSON.stringify(value)}`);
  }
  return value;
}

function isEndingPath(value: string): value is EndingPath {
  return (
    value === "ae" ||
    value === "past" ||
    value === "direct" ||
    value === "nominal_m" ||
    value === "stem_root" ||
    value === "eu_medial" ||
    value === "adnominal_present" ||
    value === "adnominal_future" ||
    value === "adnominal_past" ||
    value === "verb_quotative" ||
    value === "formal_declarative" ||
    value === "formal_declarative_ka" ||
    value === "formal_propositive" ||
    value === "consonant_suffix"
  );
}


export class UnknownEndingError extends Error {
  constructor(ending: string) {
    super(`Unknown ending: ${JSON.stringify(ending)}`);
    this.name = "UnknownEndingError";
  }
}

export function isKnownEnding(ending: string): boolean {
  return getEndings()[ending] !== undefined;
}

export function conjugate(
  lemma: string,
  irregular: IrregularType | null | undefined,
  ending: string
): string {
  let effectiveLemma = lemma;
  let effectiveIrregular = irregular;
  if (!effectiveLemma.endsWith("다")) {
    if (effectiveLemma.length === 0) {
      throw new Error(`Lemma must end with 다: ${JSON.stringify(lemma)}`);
    }
    const fallbackLemma = `${effectiveLemma}하다`;
    recordNonDaPredicateLemmaWarning(effectiveLemma, fallbackLemma);
    effectiveLemma = fallbackLemma;
    effectiveIrregular = "여";
  }
  const stem = effectiveLemma.slice(0, -1);
  if (stem.length === 0) {
    throw new Error(`Stem is empty: ${JSON.stringify(effectiveLemma)}`);
  }

  const spec = getEndings()[ending];
  if (spec === undefined) {
    throw new UnknownEndingError(ending);
  }

  if (decompose(stem[stem.length - 1] ?? "") === undefined) {
    if (spec.foreign === undefined) {
      throw new UnknownEndingError(ending);
    }
    return stem + spec.foreign;
  }

  const post = spec.post ?? "";
  switch (spec.path) {
    case "ae":
      if (effectiveIrregular === "아니" && post.length > 0) {
        return `${stem}어${post}`;
      }
      return conjugateAe(stem, effectiveIrregular) + post;
    case "past":
      return conjugatePast(stem, effectiveIrregular) + post;
    case "direct":
      return stem + requiredArg(spec, ending) + post;
    case "nominal_m":
      return conjugateNominalM(stem, effectiveIrregular) + post;
    case "stem_root":
      return conjugateStemRoot(stem) + post;
    case "eu_medial":
      return conjugateEuMedial(stem, effectiveIrregular, requiredArg(spec, ending)) + post;
    case "adnominal_present":
      return conjugateAdnominalPresent(stem, effectiveIrregular) + post;
    case "adnominal_future":
      return conjugateAdnominalFuture(stem, effectiveIrregular) + post;
    case "adnominal_past":
      return conjugateAdnominalPast(stem, effectiveIrregular) + post;
    case "verb_quotative":
      return conjugateVerbQuotative(stem, effectiveIrregular) + post;
    case "formal_declarative":
      return conjugateFormalDeclarative(stem, effectiveIrregular) + post;
    case "formal_declarative_ka":
      return `${conjugateFormalDeclarative(stem, effectiveIrregular).slice(0, -1)}까${post}`;
    case "formal_propositive":
      return conjugateFormalPropositive(stem, effectiveIrregular) + post;
    case "consonant_suffix":
      return conjugateConsonantSuffix(stem, effectiveIrregular, requiredArg(spec, ending)) + post;
  }
}

export const PREDICATE_STEM_ROOT_ENDING = "어근";

export function predicateStemRoot(lemma: string): string | null {
  if (!lemma.endsWith("하다") || lemma.length <= 2) {
    return null;
  }
  return conjugate(lemma, null, PREDICATE_STEM_ROOT_ENDING);
}


function conjugateAe(stem: string, irregular: IrregularType | null | undefined): string {
  if (irregular === "아니") {
    return `${stem}야`;
  }
  if (irregular === "여" || stem.endsWith("하")) {
    return stem.endsWith("하") ? `${stem.slice(0, -1)}해` : `${stem}해`;
  }

  if (irregular === "뵙") {
    return `${bopVowelStem(stem)}어`;
  }

  if (irregular === "옵") {
    return opVowelStem(stem);
  }

  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);

  if (irregular === "으") {
    return aeEuIrregular(stem, cho);
  }

  if (irregular === "ㅣ") {
    return `${stem}어`;
  }

  if (irregular === "르") {
    return aeReuIrregular(stem);
  }

  if (irregular === "러") {
    return `${stem}러`;
  }

  if (jong !== JONG_NONE) {
    return aeConsonantStem(stem, last, cho, jung, jong, irregular);
  }
  return aeVowelStem(stem, cho, jung);
}

function aeConsonantStem(
  stem: string,
  _last: string,
  cho: number,
  jung: number,
  jong: number,
  irregular: IrregularType | null | undefined
): string {
  const prefix = stem.slice(0, -1);

  if (irregular === "ㅂ") {
    const base = compose(cho, jung, JONG_NONE);
    if (prefix.length === 0 && jung === JUNG_O) {
      return `${base}와`;
    }
    return `${prefix}${base}워`;
  }

  if (irregular === "ㄷ") {
    const newLast = compose(cho, jung, JONG_RIEUL);
    return `${prefix}${newLast}${isPositive(jung) ? "아" : "어"}`;
  }

  if (irregular === "ㅅ") {
    const base = compose(cho, jung, JONG_NONE);
    return `${prefix}${base}${isPositive(jung) ? "아" : "어"}`;
  }

  if (irregular === "ㅎ") {
    return prefix + compose(cho, jung === JUNG_YA ? JUNG_YAE : JUNG_AE, JONG_NONE);
  }

  return `${stem}${isPositive(jung) ? "아" : "어"}`;
}

function aeVowelStem(stem: string, cho: number, jung: number): string {
  const prefix = stem.slice(0, -1);

  if (jung === JUNG_EU) {
    return aeEuIrregular(stem, cho);
  }

  if (jung === JUNG_A || jung === JUNG_EO || jung === JUNG_YEO || jung === JUNG_YA || jung === JUNG_AE || jung === JUNG_E) {
    return stem;
  }

  if (jung === JUNG_O) {
    return prefix + compose(cho, JUNG_WA);
  }

  if (jung === JUNG_U) {
    return prefix + compose(cho, JUNG_WEO);
  }

  if (jung === JUNG_OE) {
    return prefix + compose(cho, JUNG_WAE);
  }

  if (jung === JUNG_I) {
    if (cho === 3 || cho === 4) {
      return `${stem}어`;
    }
    return prefix + compose(cho, JUNG_YEO);
  }

  return `${stem}${isPositive(jung) ? "아" : "어"}`;
}

function aeEuIrregular(stem: string, cho: number): string {
  const prefix = stem.slice(0, -1);

  if (prefix.length > 0) {
    const prev = prefix[prefix.length - 1] ?? "";
    const prevInfo = decompose(prev);
    if (prevInfo !== undefined) {
      const [, prevJung] = prevInfo;
      return prefix + compose(cho, isPositive(prevJung) ? JUNG_A : JUNG_EO);
    }
  }

  return prefix + compose(cho, JUNG_EO);
}

function bopVowelStem(stem: string): string {
  return `${stem.slice(0, -1)}뵈`;
}

function opVowelStem(stem: string): string {
  return `${stem.slice(0, -1)}오`;
}

function aeReuIrregular(stem: string): string {
  const prefix = stem.slice(0, -1);
  if (prefix.length === 0) {
    throw new Error("르 irregular requires a preceding syllable");
  }
  const prev = prefix[prefix.length - 1] ?? "";
  const [prevCho, prevJung] = getInfo(prev);
  const newPrev = compose(prevCho, prevJung, JONG_RIEUL);
  return `${prefix.slice(0, -1)}${newPrev}${isPositive(prevJung) ? "라" : "러"}`;
}


function conjugatePast(stem: string, irregular: IrregularType | null | undefined): string {
  if (irregular === "아니") {
    return `${stem}었`;
  }
  if (irregular === "옵") {
    if (stem === "이옵") {
      return "이었";
    }
    return `${opVowelStem(stem)}었`;
  }
  const ae = conjugateAe(stem, irregular);
  const last = ae[ae.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);
  if (jong !== JONG_NONE) {
    return `${ae}었`;
  }
  return ae.slice(0, -1) + compose(cho, jung, JONG_SSANG_SIOT);
}


function conjugateEuMedial(stem: string, irregular: IrregularType | null | undefined, suffix: string): string {
  if (irregular === "여" || irregular === "으" || irregular === "르" || irregular === "러") {
    return stem + suffix;
  }

  if (irregular === "뵙") {
    return bopVowelStem(stem) + suffix;
  }

  if (irregular === "옵") {
    return opVowelStem(stem) + suffix;
  }
  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);

  if (irregular === "ㅂ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}우${suffix}`;
  }

  if (irregular === "ㄷ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_RIEUL)}으${suffix}`;
  }

  if (irregular === "ㅅ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}으${suffix}`;
  }

  if (irregular === "ㅎ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}${suffix}`;
  }

  if (jong === JONG_NONE) {
    return stem + suffix;
  }

  if (jong === JONG_RIEUL) {
    return tryRieulDrop(stem, irregular, suffix) ?? stem + suffix;
  }

  return `${stem}으${suffix}`;
}

function conjugateEuCodaEnding(
  stem: string,
  irregular: IrregularType | null | undefined,
  coda: number,
  euForm: string,
  uForm: string
): string {
  if (irregular === "여" || irregular === "으" || irregular === "르" || irregular === "러") {
    const last = stem[stem.length - 1] ?? "";
    const [cho, jung] = getInfo(last);
    return stem.slice(0, -1) + compose(cho, jung, coda);
  }

  if (irregular === "뵙") {
    const vowelStem = bopVowelStem(stem);
    const last = vowelStem[vowelStem.length - 1] ?? "";
    const [cho, jung] = getInfo(last);
    return vowelStem.slice(0, -1) + compose(cho, jung, coda);
  }

  if (irregular === "옵") {
    const vowelStem = opVowelStem(stem);
    const last = vowelStem[vowelStem.length - 1] ?? "";
    const [cho, jung] = getInfo(last);
    return vowelStem.slice(0, -1) + compose(cho, jung, coda);
  }

  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, finalJong] = getInfo(last);

  if (irregular === "ㄹ" && finalJong === JONG_RIEUL) {
    return stem.slice(0, -1) + compose(cho, jung, coda);
  }

  if (irregular === "ㅂ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}${uForm}`;
  }

  if (irregular === "ㄷ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_RIEUL)}${euForm}`;
  }

  if (irregular === "ㅅ") {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}${euForm}`;
  }

  if (irregular === "ㅎ") {
    return stem.slice(0, -1) + compose(cho, jung, coda);
  }

  if (finalJong === JONG_NONE) {
    return stem.slice(0, -1) + compose(cho, jung, coda);
  }

  return stem + euForm;
}

function conjugateStemRoot(stem: string): string {
  if (!stem.endsWith("하")) {
    throw new Error(`Stem root requires a 하- predicate stem: ${JSON.stringify(stem)}`);
  }
  return stem.slice(0, -1);
}

function conjugateNominalM(stem: string, irregular: IrregularType | null | undefined): string {
  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);
  if (irregular === "ㅂ" && jong === JONG_BIEUP) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}움`;
  }
  if (irregular === "ㄷ" && jong === JONG_DIGEUT) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_RIEUL)}음`;
  }
  if (irregular === "ㅅ" && jong === JONG_SIOT) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NONE)}음`;
  }
  if (irregular === "ㅎ" && jong === JONG_HIEUT) {
    return stem.slice(0, -1) + compose(cho, jung, JONG_MIEUM);
  }
  if (irregular === "뵙") {
    return conjugateNominalM(bopVowelStem(stem), null);
  }
  if (irregular === "옵") {
    return conjugateNominalM(opVowelStem(stem), null);
  }
  if (jong === JONG_NONE) {
    return stem.slice(0, -1) + compose(cho, jung, JONG_MIEUM);
  }
  if (jong === JONG_RIEUL) {
    return stem.slice(0, -1) + compose(cho, jung, JONG_RIEUL_MIEUM);
  }
  return `${stem}음`;
}


function conjugateAdnominalPresent(stem: string, irregular: IrregularType | null | undefined): string {
  if (irregular === "아니") {
    const last = stem[stem.length - 1] ?? "";
    const [cho, jung] = getInfo(last);
    return stem.slice(0, -1) + compose(cho, jung, JONG_NIEUN);
  }
  if (irregular === "여" || irregular === "으" || irregular === "르" || irregular === "러" || irregular === "뵙" || irregular === "옵") {
    return `${stem}는`;
  }
  const last = stem[stem.length - 1] ?? "";
  const [, , jong] = getInfo(last);

  if (irregular === "ㄹ" && jong === JONG_RIEUL) {
    return `${stem.slice(0, -1)}${setJongseong(last, JONG_NONE)}는`;
  }
  return `${stem}는`;
}

function conjugateAdnominalFuture(stem: string, irregular: IrregularType | null | undefined): string {
  return conjugateEuCodaEnding(stem, irregular, JONG_RIEUL, "을", "울");
}

function conjugateAdnominalPast(stem: string, irregular: IrregularType | null | undefined): string {
  if (stem.endsWith("겠")) {
    return `${stem}는`;
  }
  if (stem === "있" || stem === "없" || stem.endsWith("있") || stem.endsWith("없")) {
    return `${stem}는`;
  }
  return conjugateEuCodaEnding(stem, irregular, JONG_NIEUN, "은", "운");
}

function conjugateVerbQuotative(stem: string, irregular: IrregularType | null | undefined): string {
  if (irregular === "뵙") {
    return `${stem}는다`;
  }
  if (irregular === "옵") {
    return `${stem}다`;
  }

  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);

  if (irregular === "ㄹ" && jong === JONG_RIEUL) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NIEUN)}다`;
  }

  if (jong === JONG_NONE) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_NIEUN)}다`;
  }

  return `${stem}는다`;
}

function conjugateConsonantSuffix(stem: string, irregular: IrregularType | null | undefined, suffix: string): string {
  return tryRieulDrop(stem, irregular, suffix) ?? stem + suffix;
}

function conjugateFormalDeclarative(stem: string, irregular: IrregularType | null | undefined): string {
  if (irregular === "옵") {
    return `${stem}니다`;
  }

  const last = stem[stem.length - 1] ?? "";
  const [cho, jung, jong] = getInfo(last);

  if (irregular === "ㄹ" && jong === JONG_RIEUL) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_BIEUP)}니다`;
  }

  if (jong === JONG_NONE) {
    return `${stem.slice(0, -1)}${compose(cho, jung, JONG_BIEUP)}니다`;
  }

  return `${stem}습니다`;
}

function conjugateFormalPropositive(stem: string, irregular: IrregularType | null | undefined): string {
  return `${conjugateEuCodaEnding(stem, irregular, JONG_BIEUP, "읍", "웁")}시다`;
}

function requiredArg(spec: EndingSpec, ending: string): string {
  if (spec.arg === undefined) {
    throw new Error(`Ending requires arg: ${JSON.stringify(ending)}`);
  }
  return spec.arg;
}
