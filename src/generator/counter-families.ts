

import type { NumericTables } from "./numeric-lookup.js";
import {
  formatCounterPhrase,
  nativeBareNumeral,
  type JapaneseNumber,
  type NumeralSurfaceRealization
} from "./numerals.js";

import { POS0, 動詞 } from "../types/pos.js";
export type CounterRenderResult = readonly [koreanSurface: string, absorbsParticle: boolean];
export interface CounterRenderOptions {
  forceArabic?: boolean;
  arabicSurface?: NumeralSurfaceRealization | null;
}
export type CounterRenderer = (
  number: JapaneseNumber,
  counterKey: string,
  options?: CounterRenderOptions
) => CounterRenderResult | undefined;
export type TsuRelation =
  | "prev_no"
  | "after_no"
  | "after_no_modified"
  | "prev_case"
  | "focus_no"
  | "none";

const KIND_TSU_RELATIONS = new Set<TsuRelation>(["after_no", "after_no_modified", "prev_case"]);
const GENITIVE_TSU_RELATIONS = KIND_TSU_RELATIONS;
const ATTRIBUTIVE_TSU_RELATIONS = new Set<TsuRelation>(["after_no"]);

export class CounterFamily {
  constructor(
    readonly name: string,
    private readonly renderer: CounterRenderer
  ) {}

  render(
    number: JapaneseNumber,
    counterKey: string,
    options: CounterRenderOptions = {}
  ): CounterRenderResult | undefined {
    if (this === COUNTER) {
      const surface = formatCounterPhrase(number, counterKey, options);
      return surface === undefined ? undefined : [surface, false];
    }
    return this.renderer(number, counterKey, options) ?? COUNTER.render(number, counterKey, options);
  }
}

function renderCounter(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  const surface = formatCounterPhrase(number, counterKey, options);
  return surface === undefined ? undefined : [surface, false];
}

function renderLone(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "人" && number === 1) {
    return ["혼자", true];
  }
  const bare = nativeBareNumeral(number);
  if (bare !== undefined && counterKey === "人") {
    return [bare, false];
  }
  return renderCounter(number, counterKey, options);
}

function renderLoneDe(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "人" && number === 1) {
    return ["혼자서", true];
  }
  const bare = nativeBareNumeral(number);
  if (bare !== undefined && number < 10 && counterKey === "人") {
    return [`${bare}이서`, true];
  }
  const counter = formatCounterPhrase(number, counterKey, options);
  return counter === undefined ? undefined : [`${counter}이서`, true];
}

function renderLoneKiri(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "人" && number === 1) {
    return ["홀로", true];
  }
  const bare = nativeBareNumeral(number);
  if (bare !== undefined && number < 10 && counterKey === "人") {
    return [`단 ${bare}이`, true];
  }
  const counter = formatCounterPhrase(number, counterKey, options);
  return counter === undefined ? undefined : [`단 ${counter}이`, true];
}

function renderOutcast(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "人" && number === 1) {
    return ["외톨이", false];
  }
  const bare = nativeBareNumeral(number);
  if (bare !== undefined && number < 10 && counterKey === "人") {
    return [bare, false];
  }
  return renderCounter(number, counterKey, options);
}

function renderBareTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "つ") {
    const bare = nativeBareNumeral(number);
    if (bare !== undefined && number < 10) {
      return [bare, false];
    }
  }
  return renderCounter(number, counterKey, options);
}

function renderKindTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey !== "つ") {
    return renderCounter(number, counterKey, options);
  }
  const surface = formatCounterPhrase(number, counterKey, options);
  if (surface === undefined) {
    return undefined;
  }
  return surface.endsWith("개")
    ? [`${surface.slice(0, -1)}가지`, true]
    : [`${surface} 가지`, true];
}

function renderGenitiveTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey !== "つ") {
    return renderCounter(number, counterKey, options);
  }
  if (number === 1 || number === 1n) {
    return ["하나의", true];
  }
  return renderKindTsu(number, counterKey, options);
}

function renderAttributiveTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey !== "つ") {
    return renderCounter(number, counterKey, options);
  }
  if (number === 1 || number === 1n) {
    return ["하나의", true];
  }
  const surface = formatCounterPhrase(number, counterKey, options);
  if (surface === undefined) {
    return undefined;
  }
  return [`${surface}의`, true];
}

function renderOrdinalTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey !== "つ") {
    return renderCounter(number, counterKey, options);
  }
  if (number === 1) {
    return ["첫 번째", true];
  }
  const surface = formatCounterPhrase(number, counterKey, options);
  if (surface === undefined) {
    return undefined;
  }
  return surface.endsWith("개")
    ? [`${surface.slice(0, -1)}번째`, true]
    : [`${surface} 번째`, true];
}

function renderDistributiveTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey !== "つ") {
    return renderCounter(number, counterKey, options);
  }
  if (number === 1) {
    return ["하나씩", true];
  }
  const surface = formatCounterPhrase(number, counterKey, options);
  return surface === undefined ? undefined : [`${surface}씩`, true];
}

function renderFocusTsu(number: JapaneseNumber, counterKey: string, options: CounterRenderOptions = {}): CounterRenderResult | undefined {
  if (counterKey === "つ" && number === 1) {
    return ["하나", false];
  }
  return renderCounter(number, counterKey, options);
}

export const COUNTER = new CounterFamily("counter", renderCounter);
export const LONE = new CounterFamily("lone", renderLone);
export const LONE_DE = new CounterFamily("lone_de", renderLoneDe);
export const LONE_KIRI = new CounterFamily("lone_kiri", renderLoneKiri);
export const LONE_SHITE = new CounterFamily("lone_shite", renderLoneDe);
export const OUTCAST = new CounterFamily("outcast", renderOutcast);
export const BARE_TSU = new CounterFamily("bare_tsu", renderBareTsu);
export const KIND_TSU = new CounterFamily("kind_tsu", renderKindTsu);
export const GENITIVE_TSU = new CounterFamily("genitive_tsu", renderGenitiveTsu);
export const ATTRIBUTIVE_TSU = new CounterFamily("attributive_tsu", renderAttributiveTsu);
export const ORDINAL_TSU = new CounterFamily("ordinal_tsu", renderOrdinalTsu);
export const DISTRIBUTIVE_TSU = new CounterFamily("distributive_tsu", renderDistributiveTsu);
export const FOCUS_TSU = new CounterFamily("focus_tsu", renderFocusTsu);

export interface CounterFamilyContext {
  countedNounForm?: string | null;
  tsuRelation?: TsuRelation | null;
  prevToken?: CounterContextToken | null;
  nextToken?: CounterContextToken | null;
  particle?: string | null;
  particleStartsCopulaPredicate?: boolean;
}

export interface CounterContextToken {
  surface?: string;
  dictionaryForm?: string;
  pos?: number;
}

export function selectCounterFamily(
  number: JapaneseNumber,
  counterKey: string,
  numeric: NumericTables,
  context: CounterFamilyContext = {}
): CounterFamily {
  const { countedNounForm, tsuRelation, nextToken, particle } = context;
  const particleStartsCopulaPredicate = context.particleStartsCopulaPredicate === true;
  if (counterKey === "つ" && nextToken?.surface === "目") {
    return ORDINAL_TSU;
  }
  if (counterKey === "つ" && particle === "ずつ") {
    return DISTRIBUTIVE_TSU;
  }
  if (
    counterKey === "つ" &&
    tsuRelation !== undefined &&
    tsuRelation !== null &&
    KIND_TSU_RELATIONS.has(tsuRelation) &&
    countedNounForm !== undefined &&
    countedNounForm !== null &&
    numeric.KIND_TSU_NOUNS.has(countedNounForm)
  ) {
    return KIND_TSU;
  }
  if (
    counterKey === "つ" &&
    tsuRelation !== undefined &&
    tsuRelation !== null &&
    GENITIVE_TSU_RELATIONS.has(tsuRelation) &&
    countedNounForm !== undefined &&
    countedNounForm !== null &&
    numeric.GENITIVE_TSU_NOUNS.has(countedNounForm)
  ) {
    return GENITIVE_TSU;
  }
  if (counterKey === "つ" && number === 1 && (particle === "だけ" || particle === "も" || particle === "しか")) {
    return FOCUS_TSU;
  }
  if (
    counterKey === "つ" &&
    countedNounForm !== undefined &&
    countedNounForm !== null &&
    numeric.BARE_TSU_NOUNS.has(countedNounForm) &&
    (tsuRelation === undefined || tsuRelation === null || tsuRelation === "after_no" || tsuRelation === "focus_no")
  ) {
    return BARE_TSU;
  }
  if (counterKey === "つ" && tsuRelation !== undefined && tsuRelation !== null && ATTRIBUTIVE_TSU_RELATIONS.has(tsuRelation)) {
    return ATTRIBUTIVE_TSU;
  }
  if (counterKey === "人" && particle === "きり") {
    return LONE_KIRI;
  }
  if (counterKey === "人" && particle === "で") {
    if (particleStartsCopulaPredicate) {
      return LONE;
    }
    if (nextToken?.surface === "は") {
      return LONE;
    }
    if (nextToken?.surface === "も") {
      return LONE_DE;
    }
    const pos = nextToken?.pos;
    if (typeof pos === "number" && (pos & POS0) === 動詞) {
      return LONE_DE;
    }
  }
  if (counterKey === "人" && number === 1 && (particle === "が" || particle === "は") && nextToken !== undefined && nextToken !== null) {
    const predicate = nextToken.dictionaryForm;
    if (typeof predicate === "string" && numeric.OUTCAST_PREDICATES.has(predicate)) {
      return OUTCAST;
    }
    if (typeof predicate === "string" && numeric.LONE_PREDICATES.has(predicate)) {
      return LONE;
    }
  }
  if (counterKey === "人" && number === 1 && nextToken?.dictionaryForm === "ぼっち") {
    return OUTCAST;
  }
  return COUNTER;
}
