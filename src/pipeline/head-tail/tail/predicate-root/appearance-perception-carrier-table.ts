import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { makeParseErrorContext, parseStringArray } from "../../data/jsonl-parse-helpers.js";


import { POS1, 助動詞語幹 } from "../../../../types/pos.js";
const APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH = "head-tail/appearance_perception_carriers.jsonl";
const ctx = makeParseErrorContext("appearance perception", APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH);

export type AppearancePerceptionProjection = "attributive_like" | "sou_appearance";
export type AppearancePerceptionReading = "visual" | "inferential" | "felt";

export interface AppearancePerceptionCarrierTables {
  readonly projectionBySurface: ReadonlyMap<string, AppearancePerceptionProjection>;
  readonly perceptionByForm: ReadonlyMap<string, AppearancePerceptionReading>;
}

const ROW_KEYS = new Set([
  "type",
  "surfaces",
  "projection",
  "forms",
  "perception"
]);

let _cache: string | undefined;

export async function initAppearancePerceptionCarrierData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const APPEARANCE_PERCEPTION_CARRIERS: AppearancePerceptionCarrierTables = lazyValue(() => {
  if (_cache === undefined) throw new Error("Appearance perception carrier data not initialized");
  return parseAppearancePerceptionCarrierTablesText(_cache);
});

export function appearancePerceptionProjectionForToken(
  token: Pick<RuntimeHaruToken, "surface" | "pos"> | undefined
): AppearancePerceptionProjection | null {
  if (token === undefined || (token.pos & POS1) !== 助動詞語幹) {
    return null;
  }
  return APPEARANCE_PERCEPTION_CARRIERS.projectionBySurface.get(token.surface) ?? null;
}

export function appearancePerceptionReadingForToken(
  token: (Pick<RuntimeHaruToken, "surface"> & Partial<Pick<RuntimeHaruToken, "dictionaryForm">>) | undefined
): AppearancePerceptionReading | null {
  if (token === undefined) {
    return null;
  }
  return APPEARANCE_PERCEPTION_CARRIERS.perceptionByForm.get(token.dictionaryForm ?? token.surface) ?? null;
}

export function parseAppearancePerceptionCarrierTablesText(text: string): AppearancePerceptionCarrierTables {
  const projectionBySurface = new Map<string, AppearancePerceptionProjection>();
  const perceptionByForm = new Map<string, AppearancePerceptionReading>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`invalid appearance perception carrier row at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const raw = parsed as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!ROW_KEYS.has(key)) {
        throw new Error(`unknown appearance perception carrier key '${key}' at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (raw.type === "projection_marker") {
      const projection = parseProjection(raw.projection, lineNumber);
      for (const surface of parseStringArray(raw.surfaces, "surfaces", ctx, lineNumber)) {
        addUnique(projectionBySurface, surface, projection, "projection surface", lineNumber);
      }
    } else if (raw.type === "carrier") {
      const perception = parsePerception(raw.perception, lineNumber);
      for (const form of parseStringArray(raw.forms, "forms", ctx, lineNumber)) {
        addUnique(perceptionByForm, form, perception, "carrier form", lineNumber);
      }
    } else {
      throw new Error(`invalid appearance perception carrier type at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  return { projectionBySurface, perceptionByForm };
}

function addUnique<T>(
  target: Map<string, T>,
  key: string,
  value: T,
  label: string,
  lineNumber: number
): void {
  if (target.has(key)) {
    throw new Error(`duplicate appearance perception ${label} '${key}' at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  target.set(key, value);
}

function parseProjection(value: unknown, lineNumber: number): AppearancePerceptionProjection {
  if (value === "attributive_like" || value === "sou_appearance") {
    return value;
  }
  throw new Error(`invalid appearance perception projection at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePerception(value: unknown, lineNumber: number): AppearancePerceptionReading {
  if (value === "visual" || value === "inferential" || value === "felt") {
    return value;
  }
  throw new Error(`invalid appearance perception reading at ${APPEARANCE_PERCEPTION_CARRIER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

