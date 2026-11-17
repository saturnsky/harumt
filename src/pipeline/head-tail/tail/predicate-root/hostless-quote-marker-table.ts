import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { makeParseErrorContext, parseString } from "../../data/jsonl-parse-helpers.js";
import { irregularFrom } from "./renderers/final-forms.js";
import type { IrregularType } from "../../../../generator/conjugator.js";

const HOSTLESS_QUOTE_MARKER_RELATIVE_PATH = "head-tail/hostless_quote_markers.jsonl";
const ctx = makeParseErrorContext("hostless quote marker", HOSTLESS_QUOTE_MARKER_RELATIVE_PATH);

export type HostlessQuoteClosureKind = "direct_quote" | "hearsay" | "hedged_hearsay";

export interface HostlessQuoteMarkerRule {
  readonly closure: HostlessQuoteClosureKind;
  readonly restoredHost: {
    readonly lemma: string;
    readonly irregular: IrregularType | null;
    readonly isVerb: boolean;
  };
}

const ENTRY_KEYS = new Set(["marker", "closure", "restoredHost", "note"]);
const HOST_KEYS = new Set(["lemma", "irregular", "isVerb"]);
const CLOSURE_KINDS = new Set<string>(["direct_quote", "hearsay", "hedged_hearsay"]);

let _cache: string | undefined;

export async function initHostlessQuoteMarkerData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), HOSTLESS_QUOTE_MARKER_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const HOSTLESS_QUOTE_MARKER_MAP: ReadonlyMap<string, HostlessQuoteMarkerRule> =
  lazyValue(() => loadHostlessQuoteMarkerMap());

function loadHostlessQuoteMarkerMap(): ReadonlyMap<string, HostlessQuoteMarkerRule> {
  if (_cache === undefined) throw new Error("Data not initialized");
  const map = new Map<string, HostlessQuoteMarkerRule>();
  for (const [index, rawLine] of _cache.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!ENTRY_KEYS.has(key)) {
        throw new Error(`unknown hostless quote marker key '${key}' at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const marker = parseString(raw.marker, "marker", ctx, lineNumber);
    if (map.has(marker)) {
      throw new Error(`duplicate hostless quote marker '${marker}' at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
    }
    const closure = parseString(raw.closure, "closure", ctx, lineNumber);
    if (!CLOSURE_KINDS.has(closure)) {
      throw new Error(`unknown closure '${closure}' at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
    }
    const host = raw.restoredHost;
    if (typeof host !== "object" || host === null) {
      throw new Error(`restoredHost must be an object at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
    }
    const hostRaw = host as { readonly [key: string]: unknown };
    for (const key of Object.keys(hostRaw)) {
      if (!HOST_KEYS.has(key)) {
        throw new Error(`unknown restoredHost key '${key}' at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof hostRaw.isVerb !== "boolean") {
      throw new Error(`restoredHost.isVerb must be boolean at ${HOSTLESS_QUOTE_MARKER_RELATIVE_PATH}:${lineNumber}`);
    }
    map.set(marker, {
      closure: closure as HostlessQuoteClosureKind,
      restoredHost: {
        lemma: parseString(hostRaw.lemma, "restoredHost.lemma", ctx, lineNumber),
        irregular: hostRaw.irregular === null || hostRaw.irregular === undefined
          ? null
          : irregularFrom(parseString(hostRaw.irregular, "restoredHost.irregular", ctx, lineNumber)),
        isVerb: hostRaw.isVerb
      }
    });
  }
  return map;
}
