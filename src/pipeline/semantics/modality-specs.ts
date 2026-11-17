
import { lazyValue, type DataLoader } from "../../data-loader.js";
import { resolveDataSection } from "../../dictionary/data-section.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { TokenCursor } from "../token-cursor.js";
import {
  isMizenkeiForm,
  isRareruAuxToken,
  matchQuotedPassiveTailTokens
} from "../quote/reporting-passive.js";

import { POS0, 助詞, 動詞, 名詞 } from "../../types/pos.js";
export interface ModalitySpecToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export type QuotedJudgmentMode = "quoted" | "role";

export interface QuotedJudgmentPassiveSpec {
  readonly mode: QuotedJudgmentMode;
  readonly tailLemma: string;
  readonly auxiliaryLemma: string;
  readonly predicateForms: readonly string[];
  readonly nounDf?: string | null;
  readonly requireCopulaForNominalHead?: boolean;
}

export interface QuotedJudgmentPassiveTailMatch {
  readonly kind: "direct" | "noun_verb";
  readonly spec: QuotedJudgmentPassiveSpec;
  readonly predicatePos: number;
  readonly passivePos: number;
  readonly markerSurface: string | null;
}

export interface ModalitySpecTables {
  readonly quotedJudgmentDirect: readonly QuotedJudgmentPassiveSpec[];
  readonly quotedJudgmentNounVerb: readonly QuotedJudgmentPassiveSpec[];
}

type ModalitySpecTableName =
  | "quoted_judgment_direct"
  | "quoted_judgment_noun_verb";

const MODALITY_SPEC_TABLE_RELATIVE_PATH = "head-tail/modality_specs.jsonl";
const MODALITY_SPEC_KEYS = new Set([
  "table",
  "mode",
  "tailLemma",
  "auxiliaryLemma",
  "predicateForms",
  "nounDf",
  "requireCopulaForNominalHead"
]);

let _modalitySpecText: string | undefined;

export async function initModalitySpecs(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), MODALITY_SPEC_TABLE_RELATIVE_PATH);
  _modalitySpecText = await loader.readTextFile(filePath);
}

const MODALITY_SPEC_TABLES: ModalitySpecTables = lazyValue(() => loadModalitySpecTables());

export const QUOTED_JUDGMENT_DIRECT_SPECS: readonly QuotedJudgmentPassiveSpec[] = lazyValue(() => [
  ...MODALITY_SPEC_TABLES.quotedJudgmentDirect
]);
export const QUOTED_JUDGMENT_NOUN_VERB_SPECS: readonly QuotedJudgmentPassiveSpec[] = lazyValue(() => [
  ...MODALITY_SPEC_TABLES.quotedJudgmentNounVerb
]);

function modalitySpecQuoteMarker(
  tokens: readonly ModalitySpecToken[],
  pos: number,
  canonicalSurface: "と" | "って"
): boolean {
  const marker = quoteMarkerRelationAt(tokens, pos, { consumers: ["modality_specs"] });
  return marker?.canonicalSurface === canonicalSurface && marker.tokenCount === 1;
}

export function matchQuotedJudgmentPassiveTail(
  cursor: TokenCursor<ModalitySpecToken>,
  options: {
    readonly hasCopulaBeforeMarker?: boolean;
    readonly nominalHead?: boolean;
  } = {}
): QuotedJudgmentPassiveTailMatch | null {
  const { tokens, pos: quotePos } = cursor;
  const n = cursor.end;
  if (quotePos >= n || !modalitySpecQuoteMarker(tokens, quotePos, "と")) {
    return null;
  }

  for (const spec of QUOTED_JUDGMENT_DIRECT_SPECS) {
    const tailMatch = matchQuotedPassiveTailTokens(cursor, spec.predicateForms);
    if (tailMatch === null || !quotedJudgmentSpecAcceptsHead(spec, options)) {
      continue;
    }
    const [predicatePos, passivePos, markerSurface] = tailMatch;
    return {
      kind: "direct",
      spec,
      predicatePos,
      passivePos,
      markerSurface
    };
  }

  let markerSurface: string | null = null;
  let nounPos = quotePos + 1;
  if (
    nounPos < n &&
    (tokens[nounPos]?.surface === "も" || tokens[nounPos]?.surface === "は") &&
    ((tokens[nounPos]?.pos ?? 0) & POS0) === 助詞
  ) {
    markerSurface = tokens[nounPos]?.surface ?? null;
    nounPos += 1;
  }
  const predicatePos = nounPos + 1;
  const passivePos = nounPos + 2;
  const nounTok = tokens[nounPos];
  const predTok = tokens[predicatePos];
  const passiveTok = tokens[passivePos];
  if (
    passivePos >= n ||
    nounTok === undefined ||
    predTok === undefined ||
    passiveTok === undefined ||
    (nounTok.pos & POS0) !== 名詞 ||
    (predTok.pos & POS0) !== 動詞 ||
    !isMizenkeiForm(predTok) ||
    !isRareruAuxToken(passiveTok)
  ) {
    return null;
  }

  for (const spec of QUOTED_JUDGMENT_NOUN_VERB_SPECS) {
    if (nounTok.dictionaryForm !== spec.nounDf || !spec.predicateForms.includes(predTok.dictionaryForm)) {
      continue;
    }
    if (!quotedJudgmentSpecAcceptsHead(spec, options)) {
      continue;
    }
    return {
      kind: "noun_verb",
      spec,
      predicatePos,
      passivePos,
      markerSurface
    };
  }
  return null;
}

function quotedJudgmentSpecAcceptsHead(
  spec: QuotedJudgmentPassiveSpec,
  options: {
    readonly hasCopulaBeforeMarker?: boolean;
    readonly nominalHead?: boolean;
  }
): boolean {
  return !(
    spec.requireCopulaForNominalHead === true &&
    options.nominalHead === true &&
    options.hasCopulaBeforeMarker !== true
  );
}

function loadModalitySpecTables(): ModalitySpecTables {
  if (_modalitySpecText === undefined) {
    throw new Error("Modality specs not initialized — call initModalitySpecs() first");
  }
  return parseModalitySpecTablesText(_modalitySpecText);
}

export function parseModalitySpecTablesText(text: string): ModalitySpecTables {
  const quotedJudgmentDirect: QuotedJudgmentPassiveSpec[] = [];
  const quotedJudgmentNounVerb: QuotedJudgmentPassiveSpec[] = [];
  const seenAuxiliaryLemmas = new Map<string, number>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`invalid modality spec row at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const raw = parsed as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!MODALITY_SPEC_KEYS.has(key)) {
        throw new Error(`unknown modality spec key '${key}' at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    switch (parseModalitySpecTable(raw.table, lineNumber)) {
      case "quoted_judgment_direct": {
        const spec = parseQuotedJudgmentSpec(raw, lineNumber, { requiresNoun: false });
        recordModalityAuxiliaryLemma(seenAuxiliaryLemmas, spec.auxiliaryLemma, lineNumber);
        quotedJudgmentDirect.push(spec);
        break;
      }
      case "quoted_judgment_noun_verb": {
        const spec = parseQuotedJudgmentSpec(raw, lineNumber, { requiresNoun: true });
        recordModalityAuxiliaryLemma(seenAuxiliaryLemmas, spec.auxiliaryLemma, lineNumber);
        quotedJudgmentNounVerb.push(spec);
        break;
      }
    }
  }
  return {
    quotedJudgmentDirect,
    quotedJudgmentNounVerb
  };
}

function recordModalityAuxiliaryLemma(seen: Map<string, number>, auxiliaryLemma: string, lineNumber: number): void {
  const firstLine = seen.get(auxiliaryLemma);
  if (firstLine !== undefined) {
    throw new Error(
      `duplicate modality auxiliaryLemma '${auxiliaryLemma}' at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}; first defined at line ${firstLine}`
    );
  }
  seen.set(auxiliaryLemma, lineNumber);
}

function parseModalitySpecTable(value: unknown, lineNumber: number): ModalitySpecTableName {
  if (
    value === "quoted_judgment_direct" ||
    value === "quoted_judgment_noun_verb"
  ) {
    return value;
  }
  throw new Error(`invalid modality spec table at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseQuotedJudgmentSpec(
  raw: { readonly [key: string]: unknown },
  lineNumber: number,
  options: { readonly requiresNoun: boolean }
): QuotedJudgmentPassiveSpec {
  const nounDf = raw.nounDf === undefined ? undefined : parseNullableString(raw.nounDf, "nounDf", lineNumber);
  if (options.requiresNoun && nounDf === undefined) {
    throw new Error(`missing quoted judgment nounDf at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    mode: parseQuotedJudgmentMode(raw.mode, lineNumber),
    tailLemma: parseString(raw.tailLemma, "tailLemma", lineNumber),
    auxiliaryLemma: parseString(raw.auxiliaryLemma, "auxiliaryLemma", lineNumber),
    predicateForms: parseStringArray(raw.predicateForms, "predicateForms", lineNumber),
    ...(nounDf === undefined ? {} : { nounDf }),
    ...(raw.requireCopulaForNominalHead === undefined
      ? {}
      : { requireCopulaForNominalHead: parseBoolean(raw.requireCopulaForNominalHead, "requireCopulaForNominalHead", lineNumber) })
  };
}

function parseStringArray(value: unknown, field: string, lineNumber: number): readonly string[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item): item is string => typeof item === "string" && item.length > 0)
  ) {
    const seen = new Set<string>();
    for (const item of value) {
      if (seen.has(item)) {
        throw new Error(`duplicate modality ${field} '${item}' at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
      seen.add(item);
    }
    return value;
  }
  throw new Error(`invalid modality ${field} at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseQuotedJudgmentMode(value: unknown, lineNumber: number): QuotedJudgmentMode {
  if (value === "quoted" || value === "role") {
    return value;
  }
  throw new Error(`invalid modality mode at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseString(value: unknown, field: string, lineNumber: number): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(`invalid modality ${field} at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseNullableString(value: unknown, field: string, lineNumber: number): string | null {
  if ((typeof value === "string" && value.length > 0) || value === null) {
    return value;
  }
  throw new Error(`invalid modality ${field} at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseBoolean(value: unknown, field: string, lineNumber: number): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error(`invalid modality ${field} at ${MODALITY_SPEC_TABLE_RELATIVE_PATH}:${lineNumber}`);
}
