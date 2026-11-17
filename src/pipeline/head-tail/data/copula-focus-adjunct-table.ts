import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";
import { PARTICLE_PAIRS, type ParticleKey } from "../../../generator/particles.js";

const COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH = "head-tail/copula_focus_adjunct.jsonl";

export interface CopulaFocusAdjunctRealization {
  readonly focus: string;
  readonly nominalParticle: ParticleKey | null;
  readonly predicateEnding: string | null;
}

const COPULA_FOCUS_ADJUNCT_KEYS = new Set(["focus", "nominalParticle", "predicateEnding"]);

let _cache: string | undefined;

export async function initCopulaFocusAdjunctData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

const COPULA_FOCUS_ADJUNCT_REALIZATIONS: ReadonlyMap<string, CopulaFocusAdjunctRealization> =
  lazyValue(() => loadCopulaFocusAdjunctRealizations());

export function copulaFocusAdjunctRealizationFor(focus: string): CopulaFocusAdjunctRealization | null {
  return COPULA_FOCUS_ADJUNCT_REALIZATIONS.get(focus) ?? null;
}

function loadCopulaFocusAdjunctRealizations(): ReadonlyMap<string, CopulaFocusAdjunctRealization> {
  if (_cache === undefined) throw new Error("Data not initialized");
  const table = new Map<string, CopulaFocusAdjunctRealization>();
  for (const [index, rawLine] of _cache.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!COPULA_FOCUS_ADJUNCT_KEYS.has(key)) {
        throw new Error(`unknown copula focus adjunct key '${key}' at ${COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof raw.focus !== "string" || raw.focus.length === 0) {
      throw new Error(`invalid copula focus adjunct focus at ${COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (table.has(raw.focus)) {
      throw new Error(`duplicate copula focus adjunct focus '${raw.focus}' at ${COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const nominalParticle = raw.nominalParticle;
    if (
      nominalParticle !== null &&
      (typeof nominalParticle !== "string" || !(nominalParticle in PARTICLE_PAIRS))
    ) {
      throw new Error(`invalid copula focus adjunct nominalParticle at ${COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const predicateEnding = raw.predicateEnding;
    if (predicateEnding !== null && (typeof predicateEnding !== "string" || predicateEnding.length === 0)) {
      throw new Error(`invalid copula focus adjunct predicateEnding at ${COPULA_FOCUS_ADJUNCT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    table.set(raw.focus, {
      focus: raw.focus,
      nominalParticle: nominalParticle === null ? null : (nominalParticle as ParticleKey),
      predicateEnding: predicateEnding === null ? null : predicateEnding
    });
  }
  return table;
}
