import type { NumericTables } from "../../generator/numeric-lookup.js";
import {
  formatCounterPhrase,
  parseJapaneseNumber,
  resolveNumeralTokenValue,
  type JapaneseNumber
} from "../../generator/numerals.js";
import type { NumeralPlan } from "../../types/render-plan.js";
import type { MatcherToken } from "../matchers.js";
import { TokenCursor } from "../token-cursor.js";
import {
  formatDegreeRepetition,
  tryNumeral,
  trySplitNumeralCounterSurface
} from "./numeric.js";

export type ExtentPhraseKind =
  | "numeric_counter"
  | "scalar_amount"
  | "scalar_duration"
  | "distance"
  | "degree";

export const EXTENT_PHRASE_KINDS: ReadonlySet<ExtentPhraseKind> = new Set([
  "numeric_counter",
  "scalar_amount",
  "scalar_duration",
  "distance",
  "degree"
]);

export interface ExtentPhraseReading {
  readonly start: number;
  readonly end: number;
  readonly sourceSurface: string;
  readonly kind: ExtentPhraseKind;
  readonly number: JapaneseNumber | null;
  readonly counterKey: string | null;
  readonly counterSurface: string | null;
  readonly familyName: string | null;
  readonly lexicalKey: string | null;
  readonly renderPlan: NumeralPlan | null;
  readonly immediateKorean: string | null;
  readonly absorbsParticle: boolean;
  readonly syntheticSplit: boolean;
}

export interface ExtentPhraseCondition {
  readonly kinds?: string | readonly string[];
  readonly counterSurface?: string | readonly string[];
  readonly counterKey?: string | readonly string[];
  readonly counterLookup?: string | readonly string[];
  readonly lexicalLookup?: string | readonly string[];
  readonly family?: string | readonly string[];
  readonly number?: number | string | readonly (number | string)[];
  readonly minNumber?: number;
  readonly maxNumber?: number;
}

export function readExtentPhraseAt(
  cursor: TokenCursor<MatcherToken>,
  numeric: NumericTables
): ExtentPhraseReading | null {
  return readNumericExtentPhraseAt(cursor, numeric) ?? readScalarExtentPhraseAt(cursor, numeric);
}

export function extentPhraseMatchesCondition(
  reading: ExtentPhraseReading,
  condition: unknown,
  numeric: NumericTables
): boolean {
  if (!isPlainObject(condition)) {
    return false;
  }
  const spec = condition as ExtentPhraseCondition;
  if (!matchesStringField(reading.kind, spec.kinds)) {
    return false;
  }
  if (!matchesNullableStringField(reading.counterSurface, spec.counterSurface)) {
    return false;
  }
  if (!matchesNullableStringField(reading.counterKey, spec.counterKey)) {
    return false;
  }
  if (!matchesLookup(reading.counterSurface, spec.counterLookup, numeric) && !matchesLookup(reading.counterKey, spec.counterLookup, numeric)) {
    return false;
  }
  if (!matchesLookup(reading.lexicalKey, spec.lexicalLookup, numeric)) {
    return false;
  }
  if (!matchesNullableStringField(reading.familyName, spec.family)) {
    return false;
  }
  if (!matchesNumberField(reading.number, spec.number)) {
    return false;
  }
  if (spec.minNumber !== undefined && !numberComparable(reading.number, (value) => value >= spec.minNumber!)) {
    return false;
  }
  if (spec.maxNumber !== undefined && !numberComparable(reading.number, (value) => value <= spec.maxNumber!)) {
    return false;
  }
  return true;
}

function readNumericExtentPhraseAt(
  cursor: TokenCursor<MatcherToken>,
  numeric: NumericTables
): ExtentPhraseReading | null {
  const { tokens, pos: index } = cursor;
  const numeralCursor = cursor;
  const numeral = tryNumeral(numeralCursor, numeric);
  if (numeral !== undefined) {
    const consumed = numeralCursor.consumed;
    const output = numeral;
    const numberToken = tokens[index];
    if (numberToken === undefined) {
      return null;
    }
    let counterKey: string | null = null;
    let counterSurface: string | null = null;
    let number: JapaneseNumber | null = resolveNumeralTokenValue(numberToken, {
      zeroQuantitySurfaces: numeric.ZERO_QUANTITY_NUMERALS,
      counterCombined: consumed >= 2
    }) ?? null;
    let familyName: string | null = null;
    let renderPlan: NumeralPlan | null = null;
    let immediateKorean: string | null = null;
    let absorbsParticle = false;
    if (typeof output === "string") {
      immediateKorean = output;
      if (consumed >= 2) {
        const counterToken = tokens[index + 1];
        counterKey = counterToken?.dictionaryForm ?? null;
        counterSurface = counterToken?.surface ?? counterKey;
      }
    } else {
      renderPlan = output;
      number = output.parsedNumber;
      counterKey = output.counterKey.length > 0 ? output.counterKey : null;
      const counterToken = tokens[index + 1];
      counterSurface = counterToken?.surface ?? counterKey;
      familyName = output.family.name;
      absorbsParticle = output.family.render(output.parsedNumber, output.counterKey, { forceArabic: output.positional })?.[1] ?? false;
    }
    return {
      start: index,
      end: index + consumed,
      sourceSurface: sourceSurface(tokens, index, index + consumed),
      kind: "numeric_counter",
      number,
      counterKey,
      counterSurface,
      familyName,
      lexicalKey: null,
      renderPlan,
      immediateKorean,
      absorbsParticle,
      syntheticSplit: tokens.slice(index, index + consumed).some(hasSyntheticReason)
    };
  }

  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  const split =
    trySplitNumeralCounterSurface(token.dictionaryForm) ??
    trySplitNumeralCounterSurface(token.surface);
  if (split === null) {
    return null;
  }
  const [number, counterSurface] = split;
  const immediateKorean =
    counterSurface === "度"
      ? formatDegreeRepetition(token, number, { positional: false })
      : (formatCounterPhrase(number, counterSurface) ?? null);
  cursor.advance();
  return {
    start: index,
    end: index + 1,
    sourceSurface: token.surface,
    kind: "numeric_counter",
    number,
    counterKey: counterSurface,
    counterSurface,
    familyName: null,
    lexicalKey: null,
    renderPlan: null,
    immediateKorean,
    absorbsParticle: false,
    syntheticSplit: hasSyntheticReason(token)
  };
}

function readScalarExtentPhraseAt(cursor: TokenCursor<MatcherToken>, numeric: NumericTables): ExtentPhraseReading | null {
  const index = cursor.pos;
  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  const lexicalKey = scalarExtentKey(token, numeric);
  if (lexicalKey === null) {
    return null;
  }
  cursor.advance();
  return {
    start: index,
    end: index + 1,
    sourceSurface: token.surface,
    kind: "scalar_amount",
    number: null,
    counterKey: null,
    counterSurface: null,
    familyName: null,
    lexicalKey,
    renderPlan: null,
    immediateKorean: "조금",
    absorbsParticle: false,
    syntheticSplit: hasSyntheticReason(token)
  };
}

function scalarExtentKey(token: MatcherToken, numeric: NumericTables): string | null {
  for (const key of [token.dictionaryForm, token.surface]) {
    if (numeric.EXTENT_SCALAR_AMOUNT.has(key)) {
      return key;
    }
  }
  return null;
}

function sourceSurface(tokens: readonly MatcherToken[], start: number, end: number): string {
  return tokens.slice(start, end).map((token) => token.surface).join("");
}

function hasSyntheticReason(token: MatcherToken): boolean {
  return typeof (token as { readonly syntheticReason?: unknown }).syntheticReason === "string";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: string | readonly string[] | undefined): readonly string[] | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return [value];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function matchesStringField(actual: string, expected: string | readonly string[] | undefined): boolean {
  const values = stringList(expected);
  return values === null || values.includes(actual);
}

function matchesNullableStringField(actual: string | null, expected: string | readonly string[] | undefined): boolean {
  const values = stringList(expected);
  if (values === null) {
    return true;
  }
  return actual !== null && values.includes(actual);
}

function matchesLookup(actual: string | null, lookupNames: string | readonly string[] | undefined, numeric: NumericTables): boolean {
  const names = stringList(lookupNames);
  if (names === null) {
    return true;
  }
  if (actual === null) {
    return false;
  }
  return names.some((name) => numeric.extentLookupSet(name)?.has(actual) === true);
}

function matchesNumberField(
  actual: JapaneseNumber | null,
  expected: number | string | readonly (number | string)[] | undefined
): boolean {
  if (expected === undefined) {
    return true;
  }
  if (actual === null) {
    return false;
  }
  const values = Array.isArray(expected) ? expected : [expected];
  return values.some((value) => String(value) === String(actual));
}

function numberComparable(actual: JapaneseNumber | null, predicate: (value: number) => boolean): boolean {
  if (typeof actual !== "number") {
    return false;
  }
  return predicate(actual);
}
