import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";
import type { IrregularType } from "../../../generator/conjugator.js";
import { makeParseErrorContext, parseBoolean, parseNullableIrregular, parseString, parseStringArray } from "../data/jsonl-parse-helpers.js";
import type { CaseParticleMarkerSurface } from "../boundary/relation.js";
import { KOPOS_OF_NAME, 동사, 형용사 } from "../../../types/pos.js";

const SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH = "head-tail/semantic_carrier_predicates.jsonl";
const ctx = makeParseErrorContext("semantic carrier predicate", SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH);

export interface SemanticCarrierPredicateRealizationSpec {
  readonly prefix: string;
  readonly lemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: typeof 동사 | typeof 형용사;
  readonly absorbNegativeAux?: boolean;
}

export interface SemanticCarrierPredicateSpec {
  readonly id: string;
  readonly carrierReadings: readonly string[];
  readonly carrierForms: readonly string[];
  readonly particle: CaseParticleMarkerSurface;
  readonly predicateForms: readonly string[];
  readonly affirmative: SemanticCarrierPredicateRealizationSpec;
  readonly negative: SemanticCarrierPredicateRealizationSpec;
}

const SEMANTIC_CARRIER_PREDICATE_KEYS = new Set([
  "id",
  "carrierReadings",
  "carrierForms",
  "particle",
  "predicateForms",
  "affirmative",
  "negative"
]);

const SEMANTIC_CARRIER_PREDICATE_REALIZATION_KEYS = new Set([
  "prefix",
  "lemma",
  "irregular",
  "koreanPos",
  "absorbNegativeAux"
]);

let _cache: string | undefined;

export async function initSemanticCarrierPredicateData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const SEMANTIC_CARRIER_PREDICATES: readonly SemanticCarrierPredicateSpec[] = lazyValue(() => {
  if (_cache === undefined) throw new Error("Semantic carrier predicate data not initialized");
  return parseSemanticCarrierPredicateSpecsText(_cache);
});

export function parseSemanticCarrierPredicateSpecsText(text: string): readonly SemanticCarrierPredicateSpec[] {
  const specs: SemanticCarrierPredicateSpec[] = [];
  const seenIds = new Map<string, number>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`invalid semantic carrier predicate row at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const raw = parsed as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!SEMANTIC_CARRIER_PREDICATE_KEYS.has(key)) {
        throw new Error(`unknown semantic carrier predicate key '${key}' at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const spec = parseSemanticCarrierPredicateSpec(raw, lineNumber);
    const firstLine = seenIds.get(spec.id);
    if (firstLine !== undefined) {
      throw new Error(
        `duplicate semantic carrier predicate id '${spec.id}' at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}; first defined at line ${firstLine}`
      );
    }
    seenIds.set(spec.id, lineNumber);
    specs.push(spec);
  }
  return specs;
}

function parseSemanticCarrierPredicateSpec(
  raw: { readonly [key: string]: unknown },
  lineNumber: number
): SemanticCarrierPredicateSpec {
  return {
    id: parseString(raw.id, "id", ctx, lineNumber),
    carrierReadings: parseStringArray(raw.carrierReadings, "carrierReadings", ctx, lineNumber),
    carrierForms: parseStringArray(raw.carrierForms, "carrierForms", ctx, lineNumber),
    particle: parseCaseParticleSurface(raw.particle, "particle", lineNumber),
    predicateForms: parseStringArray(raw.predicateForms, "predicateForms", ctx, lineNumber),
    affirmative: parseRealizationSpec(raw.affirmative, "affirmative", lineNumber),
    negative: parseRealizationSpec(raw.negative, "negative", lineNumber)
  };
}

function parseRealizationSpec(
  value: unknown,
  field: string,
  lineNumber: number
): SemanticCarrierPredicateRealizationSpec {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`invalid semantic carrier predicate ${field} at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!SEMANTIC_CARRIER_PREDICATE_REALIZATION_KEYS.has(key)) {
      throw new Error(`unknown semantic carrier predicate ${field} key '${key}' at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  return {
    prefix: parseString(raw.prefix, `${field}.prefix`, ctx, lineNumber),
    lemma: parseString(raw.lemma, `${field}.lemma`, ctx, lineNumber),
    irregular: parseNullableIrregular(raw.irregular, `${field}.irregular`, ctx, lineNumber),
    koreanPos: parseKoreanPos(raw.koreanPos, `${field}.koreanPos`, lineNumber),
    ...(raw.absorbNegativeAux === undefined
      ? {}
      : { absorbNegativeAux: parseBoolean(raw.absorbNegativeAux, `${field}.absorbNegativeAux`, ctx, lineNumber) })
  };
}


function parseKoreanPos(value: unknown, field: string, lineNumber: number): typeof 동사 | typeof 형용사 {
  const resolved = typeof value === "string" ? KOPOS_OF_NAME[value] : value;
  if (resolved === 동사 || resolved === 형용사) {
    return resolved;
  }
  throw new Error(`invalid semantic carrier predicate ${field} at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseCaseParticleSurface(value: unknown, field: string, lineNumber: number): CaseParticleMarkerSurface {
  if (
    value === "が" ||
    value === "を" ||
    value === "に" ||
    value === "で" ||
    value === "から" ||
    value === "より" ||
    value === "へ" ||
    value === "と" ||
    value === "の"
  ) {
    return value;
  }
  throw new Error(`invalid semantic carrier predicate ${field} at ${SEMANTIC_CARRIER_PREDICATE_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

