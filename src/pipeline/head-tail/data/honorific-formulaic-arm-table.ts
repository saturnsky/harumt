import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";

const HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH = "head-tail/honorific_formulaic_arms.jsonl";

export type HonorificFormulaicArmId =
  | "honorific_nasaru"
  | "benefactive_kudasaru"
  | "benefactive_itadaku"
  | "benefactive_itadakeru"
  | "request_negau"
  | "request_negaeru"
  | "honorific_naru"
  | "humble_suru"
  | "humble_itasu"
  | "humble_moushiageru";

export const HONORIFIC_FORMULAIC_ARM_IDS = [
  "honorific_nasaru",
  "benefactive_kudasaru",
  "benefactive_itadaku",
  "benefactive_itadakeru",
  "request_negau",
  "request_negaeru",
  "honorific_naru",
  "humble_suru",
  "humble_itasu",
  "humble_moushiageru"
] as const satisfies readonly HonorificFormulaicArmId[];

export const HONORIFIC_FORMULAIC_HUMBLE_ARM_IDS = [
  "humble_suru",
  "humble_itasu",
  "humble_moushiageru"
] as const satisfies readonly HonorificFormulaicArmId[];

export type HonorificFormulaicArmStemTransform = "none" | "humble_light_verb";

const ARM_IDS: ReadonlySet<string> = new Set<string>(HONORIFIC_FORMULAIC_ARM_IDS);
const STEM_TRANSFORMS: ReadonlySet<string> = new Set<string>(["none", "humble_light_verb"]);
const ARM_ROW_KEYS = new Set(["arm", "forms", "stemTransform"]);

export interface HonorificFormulaicArmRow {
  readonly arm: HonorificFormulaicArmId;
  readonly forms: ReadonlySet<string>;
  readonly stemTransform: HonorificFormulaicArmStemTransform | null;
}

let _cache: string | undefined;

export async function initHonorificFormulaicArmData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

const HONORIFIC_FORMULAIC_ARM_ROWS: ReadonlyMap<HonorificFormulaicArmId, HonorificFormulaicArmRow> =
  lazyValue(() => loadHonorificFormulaicArmRows());

export function honorificFormulaicArmRow(arm: HonorificFormulaicArmId): HonorificFormulaicArmRow {
  const row = HONORIFIC_FORMULAIC_ARM_ROWS.get(arm);
  if (row === undefined) {
    throw new Error(`missing honorific formulaic arm row '${arm}'`);
  }
  return row;
}

export function honorificFormulaicArmForms(arm: HonorificFormulaicArmId): ReadonlySet<string> {
  return honorificFormulaicArmRow(arm).forms;
}

export function honorificFormulaicArmRows(): ReadonlyMap<HonorificFormulaicArmId, HonorificFormulaicArmRow> {
  return HONORIFIC_FORMULAIC_ARM_ROWS;
}

function loadHonorificFormulaicArmRows(): ReadonlyMap<HonorificFormulaicArmId, HonorificFormulaicArmRow> {
  if (_cache === undefined) throw new Error("Data not initialized");
  const table = new Map<HonorificFormulaicArmId, HonorificFormulaicArmRow>();
  for (const [index, rawLine] of _cache.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!ARM_ROW_KEYS.has(key)) {
        throw new Error(`unknown honorific formulaic arm key '${key}' at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof raw.arm !== "string" || !ARM_IDS.has(raw.arm)) {
      throw new Error(`invalid honorific formulaic arm id at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const arm = raw.arm as HonorificFormulaicArmId;
    if (table.has(arm)) {
      throw new Error(`duplicate honorific formulaic arm '${arm}' at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (
      !Array.isArray(raw.forms) ||
      raw.forms.length === 0 ||
      !raw.forms.every((value): value is string => typeof value === "string" && value.length > 0)
    ) {
      throw new Error(`invalid honorific formulaic arm forms at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (raw.stemTransform !== undefined && (typeof raw.stemTransform !== "string" || !STEM_TRANSFORMS.has(raw.stemTransform))) {
      throw new Error(`invalid honorific formulaic arm stemTransform at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    table.set(arm, {
      arm,
      forms: new Set(raw.forms),
      stemTransform: raw.stemTransform === undefined ? null : raw.stemTransform as HonorificFormulaicArmStemTransform
    });
  }
  for (const arm of HONORIFIC_FORMULAIC_ARM_IDS) {
    if (!table.has(arm)) {
      throw new Error(`missing honorific formulaic arm '${arm}' at ${HONORIFIC_FORMULAIC_ARM_TABLE_RELATIVE_PATH}`);
    }
  }
  return table;
}
