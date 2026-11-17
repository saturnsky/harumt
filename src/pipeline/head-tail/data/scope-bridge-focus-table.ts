import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";

const SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH = "head-tail/scope_bridge_focus.jsonl";

export type ScopeBridgeFocusKind = "wa" | "mo" | "shika" | "sae";

export const SCOPE_BRIDGE_FOCUS_KIND_VALUES = [
  "wa",
  "mo",
  "shika",
  "sae"
] as const satisfies readonly ScopeBridgeFocusKind[];

const SCOPE_BRIDGE_FOCUS_KINDS: ReadonlySet<string> = new Set<string>(SCOPE_BRIDGE_FOCUS_KIND_VALUES);
const SCOPE_BRIDGE_FOCUS_KEYS = new Set(["focus", "kind"]);

let _cache: string | undefined;

export async function initScopeBridgeFocusData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

const SCOPE_BRIDGE_FOCUS_KINDS_BY_SURFACE: ReadonlyMap<string, ScopeBridgeFocusKind> =
  lazyValue(() => loadScopeBridgeFocusKinds());

export function scopeBridgeFocusKindForSurface(surface: string): ScopeBridgeFocusKind | null {
  return SCOPE_BRIDGE_FOCUS_KINDS_BY_SURFACE.get(surface) ?? null;
}

export function quoteMarkerSpanAbsorbsScopeBridgeFocus(kind: ScopeBridgeFocusKind | undefined): boolean {
  return kind === "mo";
}

export function scopeBridgeFocusSurfaces(): ReadonlyMap<string, ScopeBridgeFocusKind> {
  return SCOPE_BRIDGE_FOCUS_KINDS_BY_SURFACE;
}

function loadScopeBridgeFocusKinds(): ReadonlyMap<string, ScopeBridgeFocusKind> {
  if (_cache === undefined) throw new Error("Data not initialized");
  const table = new Map<string, ScopeBridgeFocusKind>();
  for (const [index, rawLine] of _cache.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!SCOPE_BRIDGE_FOCUS_KEYS.has(key)) {
        throw new Error(`unknown scope bridge focus key '${key}' at ${SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof raw.focus !== "string" || raw.focus.length === 0) {
      throw new Error(`invalid scope bridge focus surface at ${SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (typeof raw.kind !== "string" || !SCOPE_BRIDGE_FOCUS_KINDS.has(raw.kind)) {
      throw new Error(`invalid scope bridge focus kind at ${SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (table.has(raw.focus)) {
      throw new Error(`duplicate scope bridge focus '${raw.focus}' at ${SCOPE_BRIDGE_FOCUS_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    table.set(raw.focus, raw.kind as ScopeBridgeFocusKind);
  }
  return table;
}
