import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import type { IrregularType } from "../../../../generator/conjugator.js";
import { makeParseErrorContext, parseBoolean, parseNullableIrregular, parseString } from "../../data/jsonl-parse-helpers.js";
import { KOPOS_OF_NAME, 동사, 형용사 } from "../../../../types/pos.js";
import { caseParticleMarkerSurface } from "../../boundary/marker.js";
import type { CaseParticleMarkerSurface } from "../../boundary/relation.js";

const EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH = "head-tail/epistemic_hedge_carriers.jsonl";
const ctx = makeParseErrorContext("epistemic hedge carrier", EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH);

export type EpistemicHedgePrefixKind = "proposition" | "feeling" | "mood";
export type EpistemicHedgeTailKoreanPos = typeof 동사 | typeof 형용사;
export type EpistemicHedgeFocusPlacement = "replaces_case" | "after_case";

export interface EpistemicHedgeCarrierSpec {
  readonly nounDf: string;
  readonly predicate: string;
  readonly caseParticles: readonly CaseParticleMarkerSurface[];
  readonly focusPlacement: EpistemicHedgeFocusPlacement;
  readonly allowsCaseOmission: boolean;
  readonly requiresLikenessPrefix?: boolean;
  readonly potentialPredicate?: string;
  readonly prefixKind: EpistemicHedgePrefixKind;
  readonly tailLemma: string;
  readonly tailKoreanPos: EpistemicHedgeTailKoreanPos;
  readonly tailIrregular?: IrregularType | null;
  readonly acceptsQuotative?: boolean;
}

const EPISTEMIC_HEDGE_CARRIER_KEYS = new Set([
  "nounDf",
  "predicate",
  "caseParticles",
  "focusPlacement",
  "allowsCaseOmission",
  "requiresLikenessPrefix",
  "potentialPredicate",
  "prefixKind",
  "tailLemma",
  "tailKoreanPos",
  "tailIrregular",
  "acceptsQuotative"
]);

let _cache: string | undefined;

export async function initEpistemicHedgeCarrierData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const EPISTEMIC_HEDGE_CARRIERS: readonly EpistemicHedgeCarrierSpec[] = lazyValue(() => {
  if (_cache === undefined) throw new Error("Epistemic hedge carrier data not initialized");
  return parseEpistemicHedgeCarrierSpecsText(_cache);
});

export function parseEpistemicHedgeCarrierSpecsText(text: string): readonly EpistemicHedgeCarrierSpec[] {
  const specs: EpistemicHedgeCarrierSpec[] = [];
  const seenFrames = new Map<string, number>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`invalid epistemic hedge carrier row at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const raw = parsed as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!EPISTEMIC_HEDGE_CARRIER_KEYS.has(key)) {
        throw new Error(`unknown epistemic hedge carrier key '${key}' at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const spec = parseEpistemicHedgeCarrierSpec(raw, lineNumber);
    const frameKey = `${spec.nounDf}\u0000${spec.predicate}`;
    const firstLine = seenFrames.get(frameKey);
    if (firstLine !== undefined) {
      throw new Error(
        `duplicate epistemic hedge carrier frame '${spec.nounDf}+${spec.predicate}' at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}; first defined at line ${firstLine}`
      );
    }
    seenFrames.set(frameKey, lineNumber);
    specs.push(spec);
  }
  return specs;
}

function parseEpistemicHedgeCarrierSpec(
  raw: { readonly [key: string]: unknown },
  lineNumber: number
): EpistemicHedgeCarrierSpec {
  return {
    nounDf: parseString(raw.nounDf, "nounDf", ctx, lineNumber),
    predicate: parseString(raw.predicate, "predicate", ctx, lineNumber),
    caseParticles: parseCaseParticles(raw.caseParticles, lineNumber),
    focusPlacement: parseFocusPlacement(raw.focusPlacement, lineNumber),
    allowsCaseOmission: parseBoolean(raw.allowsCaseOmission, "allowsCaseOmission", ctx, lineNumber),
    ...(raw.requiresLikenessPrefix === undefined
      ? {}
      : { requiresLikenessPrefix: parseBoolean(raw.requiresLikenessPrefix, "requiresLikenessPrefix", ctx, lineNumber) }),
    ...(raw.potentialPredicate === undefined
      ? {}
      : { potentialPredicate: parseString(raw.potentialPredicate, "potentialPredicate", ctx, lineNumber) }),
    prefixKind: parsePrefixKind(raw.prefixKind, lineNumber),
    tailLemma: parseString(raw.tailLemma, "tailLemma", ctx, lineNumber),
    tailKoreanPos: parseTailKoreanPos(raw.tailKoreanPos, lineNumber),
    ...(raw.tailIrregular === undefined
      ? {}
      : { tailIrregular: parseNullableIrregular(raw.tailIrregular, "tailIrregular", ctx, lineNumber) }),
    ...(raw.acceptsQuotative === undefined
      ? {}
      : { acceptsQuotative: parseBoolean(raw.acceptsQuotative, "acceptsQuotative", ctx, lineNumber) })
  };
}

function parseCaseParticles(value: unknown, lineNumber: number): readonly CaseParticleMarkerSurface[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`invalid epistemic hedge carrier caseParticles at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value.map((entry, entryIndex) => {
    const surface = typeof entry === "string" ? caseParticleMarkerSurface(entry) : null;
    if (surface === null) {
      throw new Error(
        `invalid epistemic hedge carrier caseParticles[${entryIndex}] at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`
      );
    }
    return surface;
  });
}

function parseFocusPlacement(value: unknown, lineNumber: number): EpistemicHedgeFocusPlacement {
  if (value === "replaces_case" || value === "after_case") {
    return value;
  }
  throw new Error(`invalid epistemic hedge carrier focusPlacement at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePrefixKind(value: unknown, lineNumber: number): EpistemicHedgePrefixKind {
  if (value === "proposition" || value === "feeling" || value === "mood") {
    return value;
  }
  throw new Error(`invalid epistemic hedge carrier prefixKind at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTailKoreanPos(value: unknown, lineNumber: number): EpistemicHedgeTailKoreanPos {
  const resolved = typeof value === "string" ? KOPOS_OF_NAME[value] : value;
  if (resolved === 동사 || resolved === 형용사) {
    return resolved;
  }
  throw new Error(`invalid epistemic hedge carrier tailKoreanPos at ${EPISTEMIC_HEDGE_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}
