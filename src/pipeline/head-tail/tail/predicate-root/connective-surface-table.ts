import { type DataLoader } from "../../../../data-loader.js";
import { lookupSetMatches, type LookupTables } from "../../../lookup-tables.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import {
  CONNECTIVE_STRUCTURAL_RELATION_KIND_VALUES,
  type ClauseProjectionForm,
  type ConnectiveStructuralRelationKind,
  type StructuralRelationTargetSlot
} from "../../../structural-relation/types.js";
import {
  loadTailAttachmentRegistry,
  type TailAttachmentRegistryEntry
} from "../../head/adapters/nominal/frame-table.js";

const CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH = "head-tail/connective_surfaces.jsonl";

export type ConnectivePartialPolicy = "preserve_prefix";
export type ConnectiveLayoutBoundaryPolicy = "normal" | "shield_span" | "no_split_inside";
export type ConnectiveRelationMarkerPolicy = "single" | "multi_token" | "discontinuous";
export type ConnectiveChainPositionPolicy = "final_only";
export type ConnectiveRetrospectiveQuotativeFlavor = "direct_thought" | "question_retrospective";

export interface ConnectiveSurfaceEntry<Kind extends string = string> {
  readonly kind: Kind;
  readonly surfaces: readonly string[];
  readonly particleSubtypes?: readonly string[];
  readonly tokenPatterns?: readonly ConnectiveTokenPattern[];
  readonly relationPolicy?: ConnectiveStructuralRelationKind;
  readonly projection?: ClauseProjectionForm;
  readonly targetSlot?: StructuralRelationTargetSlot;
  readonly markerPolicy?: ConnectiveRelationMarkerPolicy;
  readonly markerRole?: string;
  readonly closurePatterns?: readonly ConnectiveTokenPattern[];
  readonly closureRole?: string;
  readonly layoutBoundaryPolicy?: ConnectiveLayoutBoundaryPolicy;
  readonly shieldPattern?: ConnectiveTokenPattern;
  readonly renderEnabledByDefault?: boolean;
  readonly partialPolicy?: ConnectivePartialPolicy;
  readonly requiresAttachmentEvidence?: boolean;
  readonly chainPositionPolicy?: ConnectiveChainPositionPolicy;
  readonly retrospectiveQuotativeFlavor?: ConnectiveRetrospectiveQuotativeFlavor;
  readonly copulaSupportFusion?: true;
  readonly hostPatterns?: readonly ConnectiveTokenPatternAtom[];
}

export interface ConnectiveTokenPattern {
  readonly surface: string;
  readonly tokens: readonly ConnectiveTokenPatternAtom[];
  readonly contiguous?: true;
}

export interface ConnectiveTokenPatternAtom {
  readonly surface?: readonly string[];
  readonly dictionaryForm?: readonly string[];
  readonly pos0?: readonly string[];
  readonly pos1?: readonly string[];
  readonly pos5?: readonly string[];
}

const CONNECTIVE_SURFACE_ENTRY_KEYS = new Set([
  "kind",
  "surfaces",
  "particleSubtypes",
  "tokenPatterns",
  "relationPolicy",
  "projection",
  "targetSlot",
  "markerPolicy",
  "markerRole",
  "closurePatterns",
  "closureRole",
  "layoutBoundaryPolicy",
  "shieldPattern",
  "renderEnabledByDefault",
  "partialPolicy",
  "requiresAttachmentEvidence",
  "chainPositionPolicy",
  "retrospectiveQuotativeFlavor",
  "copulaSupportFusion",
  "hostPatterns"
]);
const CONNECTIVE_TOKEN_PATTERN_KEYS = new Set(["surface", "tokens", "contiguous"]);
const CONNECTIVE_TOKEN_PATTERN_ATOM_KEYS = new Set(["surface", "dictionaryForm", "pos0", "pos1", "pos5"]);

let _cache: string | undefined;

export async function initConnectiveSurfaceData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export function loadConnectiveSurfaceEntries<Kind extends string>(
  options: {
    readonly isSupportedKind: (value: string) => value is Kind;
  }
): readonly ConnectiveSurfaceEntry<Kind>[] {
  if (_cache === undefined) throw new Error("Data not initialized");
  return [
    ...parseConnectiveSurfaceEntriesText(_cache, options),
    ...narrowDerivedEntries(deriveExternalNominalizerConnectiveSurfaceEntries(loadTailAttachmentRegistry()), options)
  ];
}

export function deriveExternalNominalizerConnectiveSurfaceEntries(
  registry: readonly TailAttachmentRegistryEntry[]
): readonly ConnectiveSurfaceEntry[] {
  const surfacesByKind = new Map<string, string[]>();
  for (const entry of registry) {
    const predicate = entry.attach.hostRealizations.predicate;
    if (predicate?.kind !== "predicate_projection" || predicate.coercion !== "explicit_no") {
      continue;
    }
    const match = predicate.match;
    if (match?.particle !== "に") {
      continue;
    }
    const verbSurfaces = match.verbSurfaces ?? [];
    if (verbSurfaces.length === 0) {
      continue;
    }
    const bases = (match.matchBy ?? "surface_and_lemma") === "lemma" ? [verbSurfaces[0]] : verbSurfaces;
    const te = match.te ?? "optional";
    const focusAfterTe = match.focusAfterTe ?? [];
    const surfaces = surfacesByKind.get(predicate.connective) ?? [];
    for (const base of bases) {
      if (te !== "required") {
        surfaces.push(`のに${base}`);
      }
      surfaces.push(`のに${base}て`);
      for (const focus of focusAfterTe) {
        surfaces.push(`のに${base}て${focus}`);
      }
    }
    surfacesByKind.set(predicate.connective, surfaces);
  }
  return [...surfacesByKind.entries()].map(([kind, surfaces]) => ({
    kind,
    surfaces: [...new Set(surfaces)],
    partialPolicy: "preserve_prefix",
    requiresAttachmentEvidence: true
  }));
}

function narrowDerivedEntries<Kind extends string>(
  derived: readonly ConnectiveSurfaceEntry[],
  options: {
    readonly isSupportedKind: (value: string) => value is Kind;
  }
): readonly ConnectiveSurfaceEntry<Kind>[] {
  return derived.map((entry) => {
    if (!options.isSupportedKind(entry.kind)) {
      throw new Error(`unsupported derived external nominalizer connective kind '${entry.kind}'`);
    }
    return entry as ConnectiveSurfaceEntry<Kind>;
  });
}

export function parseConnectiveSurfaceEntriesText<Kind extends string>(
  text: string,
  options: {
    readonly isSupportedKind: (value: string) => value is Kind;
  }
): readonly ConnectiveSurfaceEntry<Kind>[] {
  const entries: ConnectiveSurfaceEntry<Kind>[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!CONNECTIVE_SURFACE_ENTRY_KEYS.has(key)) {
        throw new Error("unknown connective surface key " + JSON.stringify(key) + " at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
      }
    }
    if (typeof raw.kind !== "string" || !options.isSupportedKind(raw.kind)) {
      throw new Error("invalid connective surface kind at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
    }
    if (
      !Array.isArray(raw.surfaces) ||
      raw.surfaces.length === 0 ||
      !raw.surfaces.every((surface): surface is string => typeof surface === "string" && surface.length > 0)
    ) {
      throw new Error("invalid connective surfaces at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
    }
    const particleSubtypes = parseEntryStringList(raw.particleSubtypes, "particleSubtypes", lineNumber);
    const tokenPatterns = parseTokenPatterns(raw.tokenPatterns, raw.surfaces, lineNumber, raw.hostPatterns !== undefined ? 1 : 2);
    const relationPolicy = parseRelationPolicy(raw.relationPolicy, lineNumber);
    const projection = parseProjection(raw.projection, lineNumber);
    const targetSlot = parseTargetSlot(raw.targetSlot, lineNumber);
    const markerPolicy = parseMarkerPolicy(raw.markerPolicy, lineNumber);
    const markerRole = parseMarkerRole(raw.markerRole, lineNumber);
    const closurePatterns = parseClosurePatterns(raw.closurePatterns, lineNumber);
    const closureRole = parseMarkerRole(raw.closureRole, lineNumber);
    const layoutBoundaryPolicy = parseLayoutBoundaryPolicy(raw.layoutBoundaryPolicy, lineNumber);
    const shieldPattern = parseShieldPattern(raw.shieldPattern, raw.surfaces, tokenPatterns, lineNumber);
    if (layoutBoundaryPolicy !== undefined && layoutBoundaryPolicy !== "normal" && shieldPattern === undefined && tokenPatterns === undefined) {
      throw new Error("connective layoutBoundaryPolicy requires tokenPatterns or shieldPattern at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
    }
    const renderEnabledByDefault = parseRenderEnabledByDefault(raw.renderEnabledByDefault, lineNumber);
    validateRelationMetadata({
      relationPolicy,
      projection,
      targetSlot,
      markerPolicy,
      markerRole,
      closurePatterns,
      closureRole,
      renderEnabledByDefault,
      lineNumber
    });
    const partialPolicy = parsePartialPolicy(raw.partialPolicy, lineNumber);
    const requiresAttachmentEvidence = parseRequiresAttachmentEvidence(
      raw.requiresAttachmentEvidence,
      partialPolicy,
      lineNumber
    );
    const chainPositionPolicy = parseChainPositionPolicy(raw.chainPositionPolicy, lineNumber);
    const retrospectiveQuotativeFlavor = parseRetrospectiveQuotativeFlavor(
      raw.retrospectiveQuotativeFlavor,
      raw.kind,
      lineNumber
    );
    const copulaSupportFusion = parseCopulaSupportFusion(raw.copulaSupportFusion, raw.kind, particleSubtypes, lineNumber);
    const hostPatterns = parseHostPatterns(raw.hostPatterns, lineNumber);
    entries.push({
      kind: raw.kind,
      surfaces: raw.surfaces,
      ...(particleSubtypes === undefined ? {} : { particleSubtypes }),
      ...(tokenPatterns === undefined ? {} : { tokenPatterns }),
      ...(relationPolicy === undefined ? {} : { relationPolicy }),
      ...(projection === undefined ? {} : { projection }),
      ...(targetSlot === undefined ? {} : { targetSlot }),
      ...(markerPolicy === undefined ? {} : { markerPolicy }),
      ...(markerRole === undefined ? {} : { markerRole }),
      ...(closurePatterns === undefined ? {} : { closurePatterns }),
      ...(closureRole === undefined ? {} : { closureRole }),
      ...(layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy }),
      ...(shieldPattern === undefined ? {} : { shieldPattern }),
      ...(renderEnabledByDefault === undefined ? {} : { renderEnabledByDefault }),
      ...(partialPolicy === undefined ? {} : { partialPolicy }),
      ...(requiresAttachmentEvidence === undefined ? {} : { requiresAttachmentEvidence }),
      ...(chainPositionPolicy === undefined ? {} : { chainPositionPolicy }),
      ...(retrospectiveQuotativeFlavor === undefined ? {} : { retrospectiveQuotativeFlavor }),
      ...(copulaSupportFusion === undefined ? {} : { copulaSupportFusion }),
      ...(hostPatterns === undefined ? {} : { hostPatterns })
    });
  }
  return entries;
}

function parseHostPatterns(
  value: unknown,
  lineNumber: number
): readonly ConnectiveTokenPatternAtom[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid connective hostPatterns at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value.map((atom, atomIndex) => parseTokenPatternAtom(atom, "hostPatterns", atomIndex, lineNumber));
}

function parseRetrospectiveQuotativeFlavor(
  value: unknown,
  kind: string,
  lineNumber: number
): ConnectiveRetrospectiveQuotativeFlavor | undefined {
  if (kind !== "retrospective_quotative") {
    if (value !== undefined) {
      throw new Error("connective retrospectiveQuotativeFlavor requires retrospective_quotative kind at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
    }
    return undefined;
  }
  if (value !== "direct_thought" && value !== "question_retrospective") {
    throw new Error("invalid connective retrospectiveQuotativeFlavor at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseChainPositionPolicy(
  value: unknown,
  lineNumber: number
): ConnectiveChainPositionPolicy | undefined {
  if (value === undefined) return undefined;
  if (value === "final_only") return value;
  throw new Error("invalid connective chainPositionPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
}

function parseRelationPolicy(
  value: unknown,
  lineNumber: number
): ConnectiveStructuralRelationKind | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!CONNECTIVE_STRUCTURAL_RELATION_KIND_VALUES.includes(
    value as ConnectiveStructuralRelationKind
  )) {
    throw new Error("invalid connective relationPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value as ConnectiveStructuralRelationKind;
}

function parseProjection(value: unknown, lineNumber: number): ClauseProjectionForm | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value !== "terminal" &&
    value !== "connective" &&
    value !== "adversative" &&
    value !== "reason" &&
    value !== "attributive" &&
    value !== "nominalized" &&
    value !== "listing" &&
    value !== "purpose_attributive" &&
    value !== "correlative_degree"
  ) {
    throw new Error("invalid connective projection at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseTargetSlot(value: unknown, lineNumber: number): StructuralRelationTargetSlot | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value !== "clause_prefix" &&
    value !== "noun_modifier" &&
    value !== "coordination" &&
    value !== "sentence_suffix"
  ) {
    throw new Error("invalid connective targetSlot at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseMarkerPolicy(value: unknown, lineNumber: number): ConnectiveRelationMarkerPolicy | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "single" && value !== "multi_token" && value !== "discontinuous") {
    throw new Error("invalid connective markerPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseMarkerRole(value: unknown, lineNumber: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("invalid connective markerRole at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseLayoutBoundaryPolicy(value: unknown, lineNumber: number): ConnectiveLayoutBoundaryPolicy | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "normal" && value !== "shield_span" && value !== "no_split_inside") {
    throw new Error("invalid connective layoutBoundaryPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseRenderEnabledByDefault(value: unknown, lineNumber: number): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error("invalid connective renderEnabledByDefault at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function validateRelationMetadata(options: {
  readonly relationPolicy: ConnectiveStructuralRelationKind | undefined;
  readonly projection: ClauseProjectionForm | undefined;
  readonly targetSlot: StructuralRelationTargetSlot | undefined;
  readonly markerPolicy: ConnectiveRelationMarkerPolicy | undefined;
  readonly markerRole: string | undefined;
  readonly closurePatterns: readonly ConnectiveTokenPattern[] | undefined;
  readonly closureRole: string | undefined;
  readonly renderEnabledByDefault: boolean | undefined;
  readonly lineNumber: number;
}): void {
  const hasRelationMetadata =
    options.projection !== undefined ||
    options.targetSlot !== undefined ||
    options.markerPolicy !== undefined ||
    options.markerRole !== undefined ||
    options.closurePatterns !== undefined ||
    options.closureRole !== undefined ||
    options.renderEnabledByDefault !== undefined;
  if (options.relationPolicy === undefined) {
    if (hasRelationMetadata) {
      throw new Error("connective relation metadata requires relationPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + options.lineNumber);
    }
    return;
  }
  if (options.markerPolicy === undefined) {
    throw new Error("connective relationPolicy requires markerPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + options.lineNumber);
  }
  if (options.closureRole !== undefined && options.closurePatterns === undefined) {
    throw new Error("connective closureRole requires closurePatterns at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + options.lineNumber);
  }
  if (options.markerPolicy !== "discontinuous" && options.closurePatterns !== undefined) {
    throw new Error("connective closurePatterns requires discontinuous markerPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + options.lineNumber);
  }
  if (options.renderEnabledByDefault === true && options.projection === undefined) {
    throw new Error("connective renderEnabledByDefault requires projection at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + options.lineNumber);
  }
}

function parsePartialPolicy(value: unknown, lineNumber: number): ConnectivePartialPolicy | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "preserve_prefix") {
    throw new Error("invalid connective partialPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

const COPULA_SUPPORT_FUSION_KINDS: ReadonlySet<string> = new Set(["conditional", "even_if"]);
const COPULA_SUPPORT_FUSION_PARTICLE_SUBTYPES: ReadonlySet<string> = new Set(["格助詞"]);

function parseCopulaSupportFusion(
  value: unknown,
  kind: string,
  particleSubtypes: readonly string[] | undefined,
  lineNumber: number
): true | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== true) {
    throw new Error("invalid connective copulaSupportFusion at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  if (!COPULA_SUPPORT_FUSION_KINDS.has(kind)) {
    throw new Error("connective copulaSupportFusion requires conditional|even_if kind at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  if (
    particleSubtypes === undefined ||
    particleSubtypes.length === 0 ||
    !particleSubtypes.every((subtype) => COPULA_SUPPORT_FUSION_PARTICLE_SUBTYPES.has(subtype))
  ) {
    throw new Error("connective copulaSupportFusion requires 格助詞 particleSubtypes at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseRequiresAttachmentEvidence(
  value: unknown,
  partialPolicy: ConnectivePartialPolicy | undefined,
  lineNumber: number
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error("invalid connective requiresAttachmentEvidence at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  if (partialPolicy === undefined) {
    throw new Error("connective requiresAttachmentEvidence requires partialPolicy at " + CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH + ":" + lineNumber);
  }
  return value;
}

function parseEntryStringList(
  value: unknown,
  field: string,
  lineNumber: number
): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item): item is string => typeof item === "string" && item.length > 0)
  ) {
    throw new Error(`invalid connective ${field} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const seen = new Set<string>();
  for (const item of value) {
    if (seen.has(item)) {
      throw new Error(`duplicate connective ${field} ${JSON.stringify(item)} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    seen.add(item);
  }
  return value;
}

function parseTokenPatterns(
  rawPatterns: unknown,
  surfaces: readonly string[],
  lineNumber: number,
  minTokenCount: number
): readonly ConnectiveTokenPattern[] | undefined {
  if (rawPatterns === undefined) {
    return undefined;
  }
  if (!Array.isArray(rawPatterns)) {
    throw new Error(`invalid connective tokenPatterns at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const patterns: ConnectiveTokenPattern[] = [];
  const seenSurfaces = new Set<string>();
  for (const [patternIndex, rawPattern] of rawPatterns.entries()) {
    if (rawPattern === null || typeof rawPattern !== "object" || Array.isArray(rawPattern)) {
      throw new Error(`invalid connective tokenPattern ${patternIndex} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const pattern = rawPattern as { readonly [key: string]: unknown };
    for (const key of Object.keys(pattern)) {
      if (!CONNECTIVE_TOKEN_PATTERN_KEYS.has(key)) {
        throw new Error(`unknown connective tokenPattern key '${key}' at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof pattern.surface !== "string" || pattern.surface.length === 0) {
      throw new Error(`invalid connective tokenPattern surface at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const surface = pattern.surface;
    if (!surfaces.includes(surface)) {
      throw new Error(`connective tokenPattern surface ${JSON.stringify(surface)} is not listed in surfaces at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (seenSurfaces.has(surface)) {
      throw new Error(`duplicate connective tokenPattern surface ${JSON.stringify(surface)} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    seenSurfaces.add(surface);
    if (!Array.isArray(pattern.tokens) || pattern.tokens.length < minTokenCount) {
      throw new Error(`invalid connective tokenPattern tokens for ${JSON.stringify(surface)} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    patterns.push({
      surface,
      tokens: pattern.tokens.map((atom, atomIndex) => parseTokenPatternAtom(atom, surface, atomIndex, lineNumber)),
      ...(parseContiguous(pattern.contiguous, surface, lineNumber) ? { contiguous: true } as const : {})
    });
  }
  return patterns;
}

function parseShieldPattern(
  rawPattern: unknown,
  surfaces: readonly string[],
  tokenPatterns: readonly ConnectiveTokenPattern[] | undefined,
  lineNumber: number
): ConnectiveTokenPattern | undefined {
  if (rawPattern === undefined) {
    return undefined;
  }
  const allowedSurfaces = [
    ...surfaces,
    ...(tokenPatterns?.map((pattern) => pattern.surface) ?? [])
  ];
  return parseTokenPatternObject(rawPattern, allowedSurfaces, "shieldPattern", 0, lineNumber);
}

function parseClosurePatterns(
  rawPatterns: unknown,
  lineNumber: number
): readonly ConnectiveTokenPattern[] | undefined {
  if (rawPatterns === undefined) {
    return undefined;
  }
  if (!Array.isArray(rawPatterns) || rawPatterns.length === 0) {
    throw new Error(`invalid connective closurePatterns at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return rawPatterns.map((rawPattern, patternIndex) =>
    parseTokenPatternObject(rawPattern, undefined, "closurePatterns", patternIndex, lineNumber, 1));
}

function parseTokenPatternObject(
  rawPattern: unknown,
  allowedSurfaces: readonly string[] | undefined,
  field: string,
  patternIndex: number,
  lineNumber: number,
  minTokenCount = 2
): ConnectiveTokenPattern {
  if (rawPattern === null || typeof rawPattern !== "object" || Array.isArray(rawPattern)) {
    throw new Error(`invalid connective ${field} ${patternIndex} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const pattern = rawPattern as { readonly [key: string]: unknown };
  for (const key of Object.keys(pattern)) {
    if (!CONNECTIVE_TOKEN_PATTERN_KEYS.has(key)) {
      throw new Error(`unknown connective ${field} key '${key}' at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  if (typeof pattern.surface !== "string" || pattern.surface.length === 0) {
    throw new Error(`invalid connective ${field} surface at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const surface = pattern.surface;
  if (allowedSurfaces !== undefined && !allowedSurfaces.includes(surface)) {
    throw new Error(`connective ${field} surface ${JSON.stringify(surface)} is not listed in surfaces/tokenPatterns at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (!Array.isArray(pattern.tokens) || pattern.tokens.length < minTokenCount) {
    throw new Error(`invalid connective ${field} tokens for ${JSON.stringify(surface)} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    surface,
    tokens: pattern.tokens.map((atom, atomIndex) => parseTokenPatternAtom(atom, surface, atomIndex, lineNumber)),
    ...(parseContiguous(pattern.contiguous, surface, lineNumber) ? { contiguous: true } as const : {})
  };
}

function parseContiguous(value: unknown, surface: string, lineNumber: number): boolean {
  if (value === undefined) {
    return false;
  }
  if (value !== true) {
    throw new Error(`invalid connective tokenPattern contiguous for ${JSON.stringify(surface)} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return true;
}

function parseTokenPatternAtom(
  rawAtom: unknown,
  surface: string,
  atomIndex: number,
  lineNumber: number
): ConnectiveTokenPatternAtom {
  if (rawAtom === null || typeof rawAtom !== "object" || Array.isArray(rawAtom)) {
    throw new Error(`invalid connective tokenPattern atom ${surface}.${atomIndex} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const atom = rawAtom as { readonly [key: string]: unknown };
  for (const key of Object.keys(atom)) {
    if (!CONNECTIVE_TOKEN_PATTERN_ATOM_KEYS.has(key)) {
      throw new Error(`unknown connective tokenPattern atom key '${key}' at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  const parsed: ConnectiveTokenPatternAtom = {
    ...parseStringListField(atom.surface, "surface", surface, atomIndex, lineNumber),
    ...parseStringListField(atom.dictionaryForm, "dictionaryForm", surface, atomIndex, lineNumber),
    ...parseStringListField(atom.pos0, "pos0", surface, atomIndex, lineNumber),
    ...parseStringListField(atom.pos1, "pos1", surface, atomIndex, lineNumber),
    ...parseStringListField(atom.pos5, "pos5", surface, atomIndex, lineNumber)
  };
  if (
    parsed.surface === undefined &&
    parsed.dictionaryForm === undefined &&
    parsed.pos0 === undefined &&
    parsed.pos1 === undefined &&
    parsed.pos5 === undefined
  ) {
    throw new Error(`empty connective tokenPattern atom ${surface}.${atomIndex} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parsed;
}

function parseStringListField(
  value: unknown,
  field: keyof ConnectiveTokenPatternAtom,
  surface: string,
  atomIndex: number,
  lineNumber: number
): Partial<ConnectiveTokenPatternAtom> {
  if (value === undefined) {
    return {};
  }
  const values = typeof value === "string" ? [value] : value;
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    !values.every((item): item is string => typeof item === "string" && item.length > 0)
  ) {
    throw new Error(`invalid connective tokenPattern atom ${field} for ${surface}.${atomIndex} at ${CONNECTIVE_SURFACE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { [field]: values };
}

const CONNECTIVE_MEDIAL_PROLONGATION_CHARS = new Set([
  "ー", "〜", "～",
  "ぁ", "ぃ", "ぅ", "ぇ", "ぉ",
  "ァ", "ィ", "ゥ", "ェ", "ォ"
]);

export function canonicalMedialProlongationConnectiveSurface(surface: string): string {
  const chars = [...surface];
  if (chars.length < 3) return surface;
  const canonical = chars
    .filter((char, index) =>
      index === 0 ||
      index === chars.length - 1 ||
      !CONNECTIVE_MEDIAL_PROLONGATION_CHARS.has(char)
    )
    .join("");
  return canonical.length === 0 ? surface : canonical;
}

const NI_SERIES_CONCESSIVE_CONDITIONAL_SURFACE_LOOKUP = "concession.ni_series_concessive_conditional_surfaces";

export function isNiSeriesConcessiveConditionalSurface(
  surface: string | undefined,
  lookups: LookupTables
): boolean {
  const set = lookups.named(NI_SERIES_CONCESSIVE_CONDITIONAL_SURFACE_LOOKUP);
  return set !== undefined && lookupSetMatches(set, surface);
}
