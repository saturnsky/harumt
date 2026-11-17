import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { POS1_OF_NAME, POS4_OF_NAME, POS5_SET_OF_NAME } from "../../../../types/pos.js";
import { makeParseErrorContext, parseBoolean, parseString, parseStringArray } from "../../data/jsonl-parse-helpers.js";
import type { ObligationVariant } from "./grammar.js";

const OBLIGATION_PATTERN_TABLE_RELATIVE_PATH = "head-tail/obligation_patterns.jsonl";
const ctx = makeParseErrorContext("obligation", OBLIGATION_PATTERN_TABLE_RELATIVE_PATH);

export interface ObligationPattern {
  readonly variant: ObligationVariant;
  readonly prefix: readonly TokenPredicate[];
  readonly bodyVerbs: readonly string[];
  readonly lexicalBodyForms?: readonly string[];
  readonly dialectBodyVerbs?: readonly string[];
  readonly allowDameBody?: boolean;
  readonly prohibitionBody?: boolean;
}

export interface ObligationPatternSampleRow extends ObligationPattern {
  readonly sampleSurface: string;
}

export interface TokenPredicate {
  readonly surface?: string;
  readonly dictionaryForm?: string;
  readonly naiOrNu?: boolean;
  readonly pos1?: number;
  readonly pos1In?: readonly number[];
  readonly pos4?: number;
  readonly pos5Includes?: (pos: number) => boolean;
}

const OBLIGATION_VARIANTS = new Set<ObligationVariant>([
  "standard_nakute_wa",
  "standard_nakereba",
  "colloquial_nakya",
  "colloquial_nakucha",
  "colloquial_naito",
  "colloquial_naito_elided",
  "beki"
]);

const OBLIGATION_PATTERN_KEYS = new Set([
  "variant",
  "sampleSurface",
  "prefix",
  "bodyVerbs",
  "lexicalBodyForms",
  "dialectBodyVerbs",
  "allowDameBody",
  "prohibitionBody"
]);

const TOKEN_PREDICATE_KEYS = new Set([
  "surface",
  "dictionaryForm",
  "naiOrNu",
  "pos1",
  "pos1In",
  "pos4",
  "pos5Includes"
]);

let _cache: string | undefined;

export async function initObligationPatternData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), OBLIGATION_PATTERN_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const OBLIGATION_PATTERN_SAMPLE_ROWS: readonly ObligationPatternSampleRow[] = lazyValue(() => loadObligationPatternRows());
export const OBLIGATION_PATTERNS: readonly ObligationPattern[] = lazyValue(() =>
  OBLIGATION_PATTERN_SAMPLE_ROWS.map(({ sampleSurface: _sampleSurface, ...pattern }) => pattern)
);

let obligationBodyLemmaCache: ReadonlySet<string> | undefined;

export function obligationBodyLemmas(): ReadonlySet<string> {
  return (obligationBodyLemmaCache ??= new Set(
    OBLIGATION_PATTERNS.flatMap((pattern) => [...pattern.bodyVerbs, ...(pattern.dialectBodyVerbs ?? [])])
  ));
}

let prohibitionBodyPatternCache: ObligationPattern | undefined;

export function prohibitionBodyPattern(): ObligationPattern {
  if (prohibitionBodyPatternCache !== undefined) {
    return prohibitionBodyPatternCache;
  }
  const rows = OBLIGATION_PATTERNS.filter((pattern) => pattern.prohibitionBody === true);
  const row = rows[0];
  if (rows.length !== 1 || row === undefined || row.bodyVerbs.length === 0) {
    throw new Error(`${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}: exactly one row with a non-empty body must declare prohibitionBody`);
  }
  return (prohibitionBodyPatternCache = row);
}

function loadObligationPatternRows(): readonly ObligationPatternSampleRow[] {
  if (_cache === undefined) throw new Error("Data not initialized");
  const text = _cache;
  const patterns: ObligationPatternSampleRow[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!OBLIGATION_PATTERN_KEYS.has(key)) {
        throw new Error(`unknown obligation pattern key '${key}' at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    patterns.push(parseObligationPattern(raw, lineNumber));
  }
  return patterns;
}

function parseObligationPattern(
  raw: { readonly [key: string]: unknown },
  lineNumber: number
): ObligationPatternSampleRow {
  return {
    variant: parseObligationVariant(raw.variant, lineNumber),
    sampleSurface: parseString(raw.sampleSurface, "sampleSurface", ctx, lineNumber),
    prefix: parseTokenPredicates(raw.prefix, lineNumber),
    bodyVerbs: parseStringArray(raw.bodyVerbs, "bodyVerbs", ctx, lineNumber, { allowEmpty: true }),
    ...(raw.lexicalBodyForms === undefined
      ? {}
      : { lexicalBodyForms: parseStringArray(raw.lexicalBodyForms, "lexicalBodyForms", ctx, lineNumber, { allowEmpty: false }) }),
    ...(raw.dialectBodyVerbs === undefined
      ? {}
      : { dialectBodyVerbs: parseStringArray(raw.dialectBodyVerbs, "dialectBodyVerbs", ctx, lineNumber, { allowEmpty: false }) }),
    ...(raw.allowDameBody === undefined ? {} : { allowDameBody: parseBoolean(raw.allowDameBody, "allowDameBody", ctx, lineNumber) }),
    ...(raw.prohibitionBody === undefined ? {} : { prohibitionBody: parseBoolean(raw.prohibitionBody, "prohibitionBody", ctx, lineNumber) })
  };
}

function parseObligationVariant(value: unknown, lineNumber: number): ObligationVariant {
  if (typeof value === "string" && OBLIGATION_VARIANTS.has(value as ObligationVariant)) {
    return value as ObligationVariant;
  }
  throw new Error(`invalid obligation variant at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTokenPredicates(value: unknown, lineNumber: number): readonly TokenPredicate[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`invalid obligation prefix at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value.map((item, itemIndex) => parseTokenPredicate(item, lineNumber, itemIndex));
}

function parseTokenPredicate(value: unknown, lineNumber: number, itemIndex: number): TokenPredicate {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid obligation prefix predicate at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}:${itemIndex + 1}`);
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!TOKEN_PREDICATE_KEYS.has(key)) {
      throw new Error(`unknown obligation prefix key '${key}' at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}:${itemIndex + 1}`);
    }
  }
  return {
    ...(raw.surface === undefined ? {} : { surface: parseString(raw.surface, "surface", ctx, lineNumber) }),
    ...(raw.dictionaryForm === undefined ? {} : { dictionaryForm: parseString(raw.dictionaryForm, "dictionaryForm", ctx, lineNumber) }),
    ...(raw.naiOrNu === undefined ? {} : { naiOrNu: parseBoolean(raw.naiOrNu, "naiOrNu", ctx, lineNumber) }),
    ...(raw.pos1 === undefined ? {} : { pos1: parsePos1(raw.pos1, "pos1", lineNumber) }),
    ...(raw.pos1In === undefined
      ? {}
      : { pos1In: parseStringArray(raw.pos1In, "pos1In", ctx, lineNumber, { allowEmpty: false }).map((item) => parsePos1(item, "pos1In", lineNumber)) }),
    ...(raw.pos4 === undefined ? {} : { pos4: parsePos4(raw.pos4, "pos4", lineNumber) }),
    ...(raw.pos5Includes === undefined ? {} : { pos5Includes: parsePos5Includes(raw.pos5Includes, "pos5Includes", lineNumber) })
  };
}

function parsePos1(value: unknown, field: string, lineNumber: number): number {
  const raw = parseString(value, field, ctx, lineNumber);
  const pos = POS1_OF_NAME[raw];
  if (pos === undefined) throw new Error(`invalid ${field} '${raw}' at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
  return pos;
}

function parsePos4(value: unknown, field: string, lineNumber: number): number {
  const raw = parseString(value, field, ctx, lineNumber);
  const pos = POS4_OF_NAME[raw];
  if (pos === undefined) throw new Error(`invalid ${field} '${raw}' at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
  return pos;
}

function parsePos5Includes(value: unknown, field: string, lineNumber: number): (pos: number) => boolean {
  const raw = parseString(value, field, ctx, lineNumber);
  const pred = POS5_SET_OF_NAME[raw];
  if (pred === undefined) throw new Error(`invalid ${field} '${raw}' at ${OBLIGATION_PATTERN_TABLE_RELATIVE_PATH}:${lineNumber}`);
  return pred;
}
