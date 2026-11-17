import { getDataLoader } from "../data-loader.js";
import { resolveDataDir, type DataPathOptions } from "../pipeline/data-paths.js";

export type DataSection = "dict" | "config" | "tests";

export function resolveDataSection(
  section: DataSection,
  options: DataPathOptions = {}
): string {
  return getDataLoader().joinPath(resolveDataDir(options), section);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/gu, (_match, letter: string) => letter.toUpperCase());
}

const OPAQUE_VALUE_KEYS = new Set([
  "caseRealization", "case_realization",
  "slotRealization", "slot_realization",
  "casePreferences", "case_preferences",
  "connectivePreferences", "connective_preferences"
]);

export function camelizeKeys(value: unknown, opaqueValue = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item));
  }
  if (typeof value === "object" && value !== null) {
    if (opaqueValue) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = camelizeKeys(val);
      }
      return result;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = camelizeKeys(val, OPAQUE_VALUE_KEYS.has(key));
    }
    return result;
  }
  return value;
}
