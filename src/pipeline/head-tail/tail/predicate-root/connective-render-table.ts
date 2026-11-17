import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { PARTICLE_PAIRS, type ParticleKey } from "../../../../generator/particles.js";
import { makeParseErrorContext, parseString } from "../../data/jsonl-parse-helpers.js";

const CONNECTIVE_RENDER_TABLE_RELATIVE_PATH = "head-tail/connective_render_rules.jsonl";
const ctx = makeParseErrorContext("connective render", CONNECTIVE_RENDER_TABLE_RELATIVE_PATH);

export interface ConnectiveRenderRule {
  readonly korean: string;
  readonly pastBehavior: "carry" | "ignore" | "natural";
  readonly pastEnding?: string;
  readonly adjEnding?: string;
  readonly adjPastEnding?: string;
  readonly suffixText?: string;
  readonly copulaParticleKey?: ParticleKey;
  readonly connectiveClass?: "adversative";
  readonly conditionalQuoteEllipsis?: "prohibitive_concern";
}

const CONNECTIVE_RENDER_ENTRY_KEYS = new Set([
  "surface",
  "korean",
  "pastBehavior",
  "pastEnding",
  "adjEnding",
  "adjPastEnding",
  "suffixText",
  "copulaParticleKey",
  "connectiveClass",
  "conditionalQuoteEllipsis"
]);

let _cache: string | undefined;

export async function initConnectiveRenderData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), CONNECTIVE_RENDER_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const CONNECTIVE_RENDER_MAP: ReadonlyMap<string, ConnectiveRenderRule> = lazyValue(() => loadConnectiveRenderMap());

function loadConnectiveRenderMap(): ReadonlyMap<string, ConnectiveRenderRule> {
  if (_cache === undefined) throw new Error("Data not initialized");
  const text = _cache;
  const map = new Map<string, ConnectiveRenderRule>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!CONNECTIVE_RENDER_ENTRY_KEYS.has(key)) {
        throw new Error(`unknown connective render key '${key}' at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const surface = parseString(raw.surface, "surface", ctx, lineNumber);
    if (map.has(surface)) {
      throw new Error(`duplicate connective render surface '${surface}' at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    map.set(surface, parseConnectiveRenderRule(raw, lineNumber));
  }
  return map;
}

function parseConnectiveRenderRule(
  raw: { readonly [key: string]: unknown },
  lineNumber: number
): ConnectiveRenderRule {
  return {
    korean: parseString(raw.korean, "korean", ctx, lineNumber),
    pastBehavior: parsePastBehavior(raw.pastBehavior, lineNumber),
    ...(raw.pastEnding === undefined ? {} : { pastEnding: parseString(raw.pastEnding, "pastEnding", ctx, lineNumber) }),
    ...(raw.adjEnding === undefined ? {} : { adjEnding: parseString(raw.adjEnding, "adjEnding", ctx, lineNumber) }),
    ...(raw.adjPastEnding === undefined
      ? {}
      : { adjPastEnding: parseString(raw.adjPastEnding, "adjPastEnding", ctx, lineNumber) }),
    ...(raw.suffixText === undefined ? {} : { suffixText: parseString(raw.suffixText, "suffixText", ctx, lineNumber) }),
    ...(raw.copulaParticleKey === undefined
      ? {}
      : { copulaParticleKey: parseParticleKey(raw.copulaParticleKey, lineNumber) }),
    ...(raw.connectiveClass === undefined
      ? {}
      : { connectiveClass: parseConnectiveClass(raw.connectiveClass, lineNumber) }),
    ...(raw.conditionalQuoteEllipsis === undefined
      ? {}
      : { conditionalQuoteEllipsis: parseConditionalQuoteEllipsis(raw.conditionalQuoteEllipsis, lineNumber) })
  };
}

function parseConditionalQuoteEllipsis(
  value: unknown,
  lineNumber: number
): NonNullable<ConnectiveRenderRule["conditionalQuoteEllipsis"]> {
  if (value === "prohibitive_concern") {
    return value;
  }
  throw new Error(`invalid connective render conditionalQuoteEllipsis at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseConnectiveClass(value: unknown, lineNumber: number): NonNullable<ConnectiveRenderRule["connectiveClass"]> {
  if (value === "adversative") {
    return value;
  }
  throw new Error(`invalid connective render connectiveClass at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

export function isAdversativeConnectiveSurface(surface: string): boolean {
  return CONNECTIVE_RENDER_MAP.get(surface)?.connectiveClass === "adversative";
}

export function conditionalQuoteEllipsisClassForSurface(
  surface: string
): ConnectiveRenderRule["conditionalQuoteEllipsis"] {
  return CONNECTIVE_RENDER_MAP.get(surface)?.conditionalQuoteEllipsis;
}

function parsePastBehavior(value: unknown, lineNumber: number): ConnectiveRenderRule["pastBehavior"] {
  if (value === "carry" || value === "ignore" || value === "natural") {
    return value;
  }
  throw new Error(`invalid connective render pastBehavior at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseParticleKey(value: unknown, lineNumber: number): ParticleKey {
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(PARTICLE_PAIRS, value)) {
    return value as ParticleKey;
  }
  throw new Error(`invalid connective render copulaParticleKey at ${CONNECTIVE_RENDER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}
