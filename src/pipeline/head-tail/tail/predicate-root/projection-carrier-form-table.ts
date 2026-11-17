import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { isSecondaryParticle } from "../../../particles/secondary-particle.js";
import { POS1, POS1_OF_NAME, POS4, POS4_OF_NAME, isNuAttachmentHostToken } from "../../../../types/pos.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { makeParseErrorContext, parseString } from "../../data/jsonl-parse-helpers.js";
import {
  PREDICATE_PROJECTION_CARRIER_SOURCE_ALLOMORPH_VALUES,
  PREDICATE_PROJECTION_CARRIER_VALUES,
  type PredicateProjectionCarrierKind,
  type PredicateProjectionCarrierSourceAllomorph
} from "./grammar.js";

const PROJECTION_CARRIER_FORM_TABLE_RELATIVE_PATH = "head-tail/predicate_projection_carrier_forms.jsonl";
const ctx = makeParseErrorContext("predicate projection carrier form", PROJECTION_CARRIER_FORM_TABLE_RELATIVE_PATH);

export type ProjectionCarrierHostAttachment = "nu_attachment";

export interface ProjectionCarrierTokenCondition {
  readonly surface?: string;
  readonly pos1?: number;
  readonly pos4?: number;
  readonly secondaryParticle?: string;
}

export type ProjectionCarrierFollower =
  | { readonly kind: "tokens"; readonly tokens: readonly ProjectionCarrierTokenCondition[] }
  | { readonly kind: "copula" };

export type ProjectionCarrierBranchTerminal = "attributive" | "adverbial_modifier" | "predicate";

export interface ProjectionCarrierBranch {
  readonly allomorph: PredicateProjectionCarrierSourceAllomorph;
  readonly terminal: ProjectionCarrierBranchTerminal;
  readonly follower: ProjectionCarrierFollower;
}

export interface ProjectionCarrierForm {
  readonly carrier: PredicateProjectionCarrierKind;
  readonly sampleSurface: string;
  readonly host: ProjectionCarrierHostAttachment;
  readonly marker: readonly ProjectionCarrierTokenCondition[];
  readonly branches: readonly ProjectionCarrierBranch[];
}

const ROW_KEYS = new Set(["carrier", "sampleSurface", "host", "marker", "branches"]);
const CONDITION_KEYS = new Set(["surface", "pos1", "pos4", "secondaryParticle"]);
const BRANCH_KEYS = new Set(["allomorph", "terminal", "follower"]);

let _cache: string | undefined;

export async function initProjectionCarrierFormData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), PROJECTION_CARRIER_FORM_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const PROJECTION_CARRIER_FORMS: readonly ProjectionCarrierForm[] = lazyValue(() => {
  if (_cache === undefined) throw new Error("Predicate projection carrier form data not initialized");
  return parseProjectionCarrierFormsText(_cache);
});

export function declaredProjectionCarrierBranchTerminal(
  allomorph: PredicateProjectionCarrierSourceAllomorph | null
): ProjectionCarrierBranchTerminal | null {
  if (allomorph === null) {
    return null;
  }
  for (const form of PROJECTION_CARRIER_FORMS) {
    const branch = form.branches.find((candidate) => candidate.allomorph === allomorph);
    if (branch !== undefined) {
      return branch.terminal;
    }
  }
  return null;
}

export function projectionCarrierHostAttaches(
  host: ProjectionCarrierHostAttachment,
  token: RuntimeHaruToken | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  switch (host) {
    case "nu_attachment":
      return isNuAttachmentHostToken(token);
  }
}

export function projectionCarrierTokenMatches(
  condition: ProjectionCarrierTokenCondition,
  token: RuntimeHaruToken | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  return (condition.surface === undefined || token.surface === condition.surface) &&
    (condition.pos1 === undefined || (token.pos & POS1) === condition.pos1) &&
    (condition.pos4 === undefined || (token.pos & POS4) === condition.pos4) &&
    (condition.secondaryParticle === undefined || isSecondaryParticle(token, condition.secondaryParticle));
}

export function declaredProjectionCarrierTokenBranchEndingAt(
  tokens: readonly RuntimeHaruToken[],
  endIdx: number
): { readonly form: ProjectionCarrierForm; readonly branch: ProjectionCarrierBranch; readonly markerStart: number } | null {
  for (const form of PROJECTION_CARRIER_FORMS) {
    for (const branch of form.branches) {
      if (branch.follower.kind !== "tokens") {
        continue;
      }
      const followerStart = endIdx - branch.follower.tokens.length + 1;
      const markerStart = followerStart - form.marker.length;
      if (
        markerStart < 1 ||
        !projectionCarrierHostAttaches(form.host, tokens[markerStart - 1]) ||
        !form.marker.every((condition, offset) => projectionCarrierTokenMatches(condition, tokens[markerStart + offset])) ||
        !branch.follower.tokens.every((condition, offset) => projectionCarrierTokenMatches(condition, tokens[followerStart + offset]))
      ) {
        continue;
      }
      return { form, branch, markerStart };
    }
  }
  return null;
}

export function parseProjectionCarrierFormsText(text: string): readonly ProjectionCarrierForm[] {
  const forms: ProjectionCarrierForm[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(ctx("row", lineNumber));
    }
    const raw = parsed as { readonly [key: string]: unknown };
    rejectUnknownKeys(raw, ROW_KEYS, lineNumber);
    forms.push({
      carrier: parseCarrier(raw.carrier, lineNumber),
      sampleSurface: parseString(raw.sampleSurface, "sampleSurface", ctx, lineNumber),
      host: parseHost(raw.host, lineNumber),
      marker: parseConditions(raw.marker, "marker", lineNumber),
      branches: parseBranches(raw.branches, lineNumber)
    });
  }
  return forms;
}

function rejectUnknownKeys(raw: { readonly [key: string]: unknown }, keys: ReadonlySet<string>, lineNumber: number): void {
  for (const key of Object.keys(raw)) {
    if (!keys.has(key)) {
      throw new Error(`unknown predicate projection carrier form key '${key}' at ${PROJECTION_CARRIER_FORM_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
}

function parseCarrier(value: unknown, lineNumber: number): PredicateProjectionCarrierKind {
  const found = PREDICATE_PROJECTION_CARRIER_VALUES.find((carrier) => carrier === value);
  if (found === undefined) throw new Error(ctx("carrier", lineNumber));
  return found;
}

function parseAllomorph(value: unknown, lineNumber: number): PredicateProjectionCarrierSourceAllomorph {
  const found = PREDICATE_PROJECTION_CARRIER_SOURCE_ALLOMORPH_VALUES.find((allomorph) => allomorph === value);
  if (found === undefined) throw new Error(ctx("allomorph", lineNumber));
  return found;
}

function parseBranchTerminal(value: unknown, lineNumber: number): ProjectionCarrierBranchTerminal {
  if (value === "attributive" || value === "adverbial_modifier" || value === "predicate") {
    return value;
  }
  throw new Error(ctx("branches.terminal", lineNumber));
}

function parseHost(value: unknown, lineNumber: number): ProjectionCarrierHostAttachment {
  if (value === "nu_attachment") {
    return value;
  }
  throw new Error(ctx("host", lineNumber));
}

function parseConditions(value: unknown, field: string, lineNumber: number): readonly ProjectionCarrierTokenCondition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(ctx(field, lineNumber));
  }
  return value.map((item) => parseCondition(item, field, lineNumber));
}

function parseCondition(value: unknown, field: string, lineNumber: number): ProjectionCarrierTokenCondition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx(field, lineNumber));
  }
  const raw = value as { readonly [key: string]: unknown };
  rejectUnknownKeys(raw, CONDITION_KEYS, lineNumber);
  if (Object.keys(raw).length === 0) {
    throw new Error(ctx(field, lineNumber));
  }
  return {
    ...(raw.surface === undefined ? {} : { surface: parseString(raw.surface, `${field}.surface`, ctx, lineNumber) }),
    ...(raw.pos1 === undefined ? {} : { pos1: parsePosName(POS1_OF_NAME, raw.pos1, `${field}.pos1`, lineNumber) }),
    ...(raw.pos4 === undefined ? {} : { pos4: parsePosName(POS4_OF_NAME, raw.pos4, `${field}.pos4`, lineNumber) }),
    ...(raw.secondaryParticle === undefined
      ? {}
      : { secondaryParticle: parseString(raw.secondaryParticle, `${field}.secondaryParticle`, ctx, lineNumber) })
  };
}

function parsePosName(table: { readonly [key: string]: number }, value: unknown, field: string, lineNumber: number): number {
  const name = parseString(value, field, ctx, lineNumber);
  const pos = Object.hasOwn(table, name) ? table[name] : undefined;
  if (pos === undefined) throw new Error(ctx(field, lineNumber));
  return pos;
}

function parseBranches(value: unknown, lineNumber: number): readonly ProjectionCarrierBranch[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(ctx("branches", lineNumber));
  }
  return value.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(ctx("branches", lineNumber));
    }
    const raw = item as { readonly [key: string]: unknown };
    rejectUnknownKeys(raw, BRANCH_KEYS, lineNumber);
    const follower: ProjectionCarrierFollower = raw.follower === "copula"
      ? { kind: "copula" }
      : { kind: "tokens", tokens: parseConditions(raw.follower, "branches.follower", lineNumber) };
    return {
      allomorph: parseAllomorph(raw.allomorph, lineNumber),
      terminal: parseBranchTerminal(raw.terminal, lineNumber),
      follower
    };
  });
}
