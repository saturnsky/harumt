import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";
import type { BenefactiveAspectOp } from "./predicate-root/grammar.js";
import { POS4_OF_NAME, is上一段, is下一段 } from "../../../types/pos.js";

const TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH = "head-tail/te_tail_continuations.jsonl";

export type TeTailContinuationLexemeKind = "simple_aspect" | "benefactive";

export type TeTailContinuationDirection = "te_kuru" | "te_iku" | "by_tense";

const TE_TAIL_CONTINUATION_DIRECTIONS = new Set<TeTailContinuationDirection>(["te_kuru", "te_iku", "by_tense"]);

export type CollapsedAspectAuxKind = "te_iru" | "te_shimau" | "te_iku" | "te_oku";

const COLLAPSED_ASPECT_AUX_KINDS = new Set<CollapsedAspectAuxKind>(["te_iru", "te_shimau", "te_iku", "te_oku"]);

export interface CollapsedAspectAuxContraction {
  readonly kind: CollapsedAspectAuxKind;
  readonly voiced: boolean;
  readonly fusedSurface: string;
  readonly fusedReading: string;
  readonly auxOnsetSurface: string;
  readonly auxOnsetReading: string;
  readonly auxLemma: string;
  readonly auxLemmaReading: string;
  readonly auxInflectionClass: number;
  readonly auxHypotheticalSurface: string;
  readonly auxHypotheticalReading: string;
  readonly derivation?: "potential";
  readonly potential?: TeTailPotentialAuxiliary;
}

export interface TeTailPotentialAuxiliary {
  readonly forms: readonly string[];
  readonly auxLemma: string;
  readonly auxLemmaReading: string;
  readonly auxInflectionClass: number;
  readonly auxHypotheticalSurface: string;
  readonly auxHypotheticalReading: string;
}

export interface TeTailContinuationLexemeEntry {
  readonly kind: TeTailContinuationLexemeKind;
  readonly forms: readonly string[];
  readonly imperativeForms?: readonly string[];
  readonly benefactiveAspect?: BenefactiveAspectOp["aspect"];
  readonly followingRareruReading?: "honorific";
  readonly predicateSuffixCompetition?: "lexical_predicate";
  readonly denotation?: "state";
  readonly auxiliaryHonorific?: "respect";
  readonly direction?: TeTailContinuationDirection;
  readonly contractions?: readonly (readonly [string, CollapsedAspectAuxContraction])[];
  readonly potential?: TeTailPotentialAuxiliary;
  readonly potentialContractions?: readonly (readonly [string, CollapsedAspectAuxContraction])[];
  readonly description?: string;
}

const TE_TAIL_CONTINUATION_LEXEME_KINDS = new Set<TeTailContinuationLexemeKind>([
  "simple_aspect",
  "benefactive"
]);

const TE_TAIL_CONTINUATION_ROW_KEYS = new Set([
  "kind",
  "forms",
  "imperative_forms",
  "benefactive_aspect",
  "following_rareru_reading",
  "predicate_suffix_competition",
  "denotation",
  "auxiliary_honorific",
  "direction",
  "contraction",
  "potential",
  "description"
]);
const TE_TAIL_CONTRACTION_KEYS = new Set([
  "aspect", "aux", "aux_reading", "inflection", "onset", "onset_reading", "hypothetical", "hypothetical_reading", "contracted"
]);
const TE_TAIL_CONTRACTED_KEYS = new Set(["lemma", "fused", "fused_reading", "voiced"]);
const TE_TAIL_POTENTIAL_KEYS = new Set([
  "forms", "aux", "aux_reading", "inflection", "hypothetical", "hypothetical_reading", "contracted"
]);
const TE_TAIL_BENEFACTIVE_ASPECTS = new Set<BenefactiveAspectOp["aspect"]>([
  "te_ageru", "te_kureru", "te_kudasaru", "te_morau", "te_moraeru", "te_itadaku", "te_itadakeru"
]);

let _cache: string | undefined;

export async function initTeTailContinuationData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const TE_TAIL_CONTINUATION_LEXEME_ENTRIES: readonly TeTailContinuationLexemeEntry[] = lazyValue(() => loadTeTailContinuationLexemeEntries());

export const TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM: ReadonlyMap<string, TeTailContinuationLexemeKind> =
  lazyValue(() => createKindByFormMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

export const TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM: ReadonlyMap<string, TeTailContinuationLexemeEntry> =
  lazyValue(() => createEntryByFormMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

export const COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA: ReadonlyMap<string, CollapsedAspectAuxContraction> =
  lazyValue(() => createContractionByLemmaMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

export const TE_CONNECTIVE_FUSED_CONTRACTION_BY_MARKER: ReadonlyMap<string, CollapsedAspectAuxContraction> =
  lazyValue(() => createConnectiveFusedContractionByMarkerMap(COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA));

export const COLLAPSED_POTENTIAL_ASPECT_AUX_CONTRACTION_BY_LEMMA: ReadonlyMap<string, CollapsedAspectAuxContraction> =
  lazyValue(() => createPotentialContractionByLemmaMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

export const TE_TAIL_CONTINUATION_POTENTIAL_ENTRY_BY_FORM: ReadonlyMap<string, TeTailContinuationLexemeEntry> =
  lazyValue(() => createPotentialEntryByFormMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

export const TE_TAIL_CONTINUATION_IMPERATIVE_ENTRY_BY_FORM: ReadonlyMap<string, TeTailContinuationLexemeEntry> =
  lazyValue(() => createImperativeEntryByFormMap(TE_TAIL_CONTINUATION_LEXEME_ENTRIES));

function loadTeTailContinuationLexemeEntries(): readonly TeTailContinuationLexemeEntry[] {
  if (_cache === undefined) throw new Error("Data not initialized");
  const text = _cache;
  return parseTeTailContinuationLexemeEntriesText(text);
}

export function parseTeTailContinuationLexemeEntriesText(text: string): readonly TeTailContinuationLexemeEntry[] {
  const entries: TeTailContinuationLexemeEntry[] = [];
  const seenForms = new Map<string, number>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`invalid te-tail continuation row at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const row = raw as { readonly [key: string]: unknown };
    for (const key of Object.keys(row)) {
      if (!TE_TAIL_CONTINUATION_ROW_KEYS.has(key)) {
        throw new Error(`unknown te-tail continuation row key '${key}' at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const kind = parseTeTailContinuationLexemeKind(row.kind, lineNumber);
    const forms = parseTeTailContinuationLexemeForms(row.forms, lineNumber);
    const benefactiveAspect = parseTeTailBenefactiveAspect(row.benefactive_aspect, kind, lineNumber);
    const imperativeForms = row.imperative_forms === undefined
      ? undefined
      : parseTeTailImperativeForms(row.imperative_forms, kind, lineNumber);
    const potential = row.potential === undefined
      ? undefined
      : parseTeTailPotential(row.potential, kind, lineNumber);
    const contractions = row.contraction === undefined
      ? undefined
      : parseTeTailContraction(row.contraction, kind, forms, potential?.auxiliary, lineNumber);
    if (potential !== undefined && potential.contracted.length > 0 && contractions === undefined) {
      throw new Error(
        `invalid te-tail continuation potential.contracted (row contraction required for onset) at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`
      );
    }
    for (const form of [...forms, ...(imperativeForms ?? []), ...(potential?.auxiliary.forms ?? [])]) {
      const firstLine = seenForms.get(form);
      if (firstLine !== undefined) {
        throw new Error(
          `duplicate te-tail continuation form '${form}' at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}; first defined at line ${firstLine}`
        );
      }
      seenForms.set(form, lineNumber);
    }
    entries.push({
      kind,
      forms,
      ...(imperativeForms === undefined ? {} : { imperativeForms }),
      ...(benefactiveAspect === undefined ? {} : { benefactiveAspect }),
      ...(row.following_rareru_reading === undefined
        ? {}
        : { followingRareruReading: parseFollowingRareruReading(row.following_rareru_reading, kind, lineNumber) }),
      ...(row.predicate_suffix_competition === undefined
        ? {}
        : {
            predicateSuffixCompetition: parsePredicateSuffixCompetition(
              row.predicate_suffix_competition,
              kind,
              lineNumber
            )
          }),
      ...(row.denotation === undefined
        ? {}
        : { denotation: parseTeTailDenotation(row.denotation, kind, lineNumber) }),
      ...(row.auxiliary_honorific === undefined
        ? {}
        : { auxiliaryHonorific: parseTeTailAuxiliaryHonorific(row.auxiliary_honorific, kind, lineNumber) }),
      ...(row.direction === undefined
        ? {}
        : { direction: parseTeTailDirection(row.direction, kind, lineNumber) }),
      ...(contractions === undefined ? {} : { contractions }),
      ...(potential === undefined ? {} : { potential: potential.auxiliary }),
      ...(potential === undefined || contractions === undefined || potential.contracted.length === 0
        ? {}
        : { potentialContractions: potentialContractionsFor(potential, contractions[0]![1]) }),
      ...(row.description === undefined ? {} : { description: parseDescription(row.description, lineNumber) })
    });
  }
  return entries;
}

function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, field: string, lineNumber: number): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(`invalid te-tail continuation contraction.${field} at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailContraction(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  forms: readonly string[],
  potential: TeTailPotentialAuxiliary | undefined,
  lineNumber: number
): readonly (readonly [string, CollapsedAspectAuxContraction])[] {
  const fail = (what: string): never => {
    throw new Error(`invalid te-tail continuation contraction ${what} at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
  };
  if (kind !== "simple_aspect" || !isRecord(value)) {
    return fail("(simple_aspect row object required)");
  }
  for (const key of Object.keys(value)) {
    if (!TE_TAIL_CONTRACTION_KEYS.has(key)) fail(`key '${key}'`);
  }
  const aspect = value.aspect;
  if (typeof aspect !== "string" || !COLLAPSED_ASPECT_AUX_KINDS.has(aspect as CollapsedAspectAuxKind)) {
    return fail("aspect");
  }
  const aux = requireNonEmptyString(value.aux, "aux", lineNumber);
  if (!forms.includes(aux)) fail("aux (not a form of this row)");
  const inflection = requireNonEmptyString(value.inflection, "inflection", lineNumber);
  const inflectionClass = POS4_OF_NAME[inflection];
  if (inflectionClass === undefined || inflectionClass === 0) fail("inflection");
  const base = {
    kind: aspect as CollapsedAspectAuxKind,
    auxOnsetSurface: requireNonEmptyString(value.onset, "onset", lineNumber),
    auxOnsetReading: requireNonEmptyString(value.onset_reading, "onset_reading", lineNumber),
    auxLemma: aux,
    auxLemmaReading: requireNonEmptyString(value.aux_reading, "aux_reading", lineNumber),
    auxInflectionClass: inflectionClass!,
    auxHypotheticalSurface: requireNonEmptyString(value.hypothetical, "hypothetical", lineNumber),
    auxHypotheticalReading: requireNonEmptyString(value.hypothetical_reading, "hypothetical_reading", lineNumber),
    ...(potential === undefined ? {} : { potential })
  };
  return parseContractedItems(value.contracted, base, "contracted", lineNumber);
}

type ContractionBase = Omit<CollapsedAspectAuxContraction, "voiced" | "fusedSurface" | "fusedReading">;

function parseContractedItems(
  value: unknown,
  base: ContractionBase,
  field: string,
  lineNumber: number
): readonly (readonly [string, CollapsedAspectAuxContraction])[] {
  const fail = (what: string): never => {
    throw new Error(`invalid te-tail continuation ${field} ${what} at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
  };
  if (!Array.isArray(value) || value.length === 0) {
    return fail("(non-empty array required)");
  }
  return value.map((item: unknown) => {
    if (!isRecord(item)) return fail("item");
    for (const key of Object.keys(item)) {
      if (!TE_TAIL_CONTRACTED_KEYS.has(key)) fail(`key '${key}'`);
    }
    if (item.voiced !== undefined && typeof item.voiced !== "boolean") fail("voiced");
    const lemma = requireNonEmptyString(item.lemma, `${field}.lemma`, lineNumber);
    return [lemma, {
      ...base,
      voiced: item.voiced === true,
      fusedSurface: requireNonEmptyString(item.fused, `${field}.fused`, lineNumber),
      fusedReading: requireNonEmptyString(item.fused_reading, `${field}.fused_reading`, lineNumber)
    }] as const;
  });
}

interface ParsedTeTailPotential {
  readonly auxiliary: TeTailPotentialAuxiliary;
  readonly contracted: readonly unknown[];
  readonly lineNumber: number;
}

function parseTeTailPotential(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): ParsedTeTailPotential {
  const fail = (what: string): never => {
    throw new Error(`invalid te-tail continuation potential ${what} at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
  };
  if (kind !== "simple_aspect" || !isRecord(value)) {
    return fail("(simple_aspect row object required)");
  }
  for (const key of Object.keys(value)) {
    if (!TE_TAIL_POTENTIAL_KEYS.has(key)) fail(`key '${key}'`);
  }
  const forms = parseTeTailContinuationLexemeForms(value.forms, lineNumber);
  const aux = requireNonEmptyString(value.aux, "potential.aux", lineNumber);
  if (!forms.includes(aux)) fail("aux (not a potential form of this row)");
  const inflectionClass = POS4_OF_NAME[requireNonEmptyString(value.inflection, "potential.inflection", lineNumber)];
  if (inflectionClass === undefined || inflectionClass === 0) fail("inflection");
  if (value.contracted !== undefined && (!Array.isArray(value.contracted) || value.contracted.length === 0)) {
    fail("contracted");
  }
  return {
    auxiliary: {
      forms,
      auxLemma: aux,
      auxLemmaReading: requireNonEmptyString(value.aux_reading, "potential.aux_reading", lineNumber),
      auxInflectionClass: inflectionClass!,
      auxHypotheticalSurface: requireNonEmptyString(value.hypothetical, "potential.hypothetical", lineNumber),
      auxHypotheticalReading: requireNonEmptyString(value.hypothetical_reading, "potential.hypothetical_reading", lineNumber)
    },
    contracted: (value.contracted as readonly unknown[] | undefined) ?? [],
    lineNumber
  };
}

function potentialContractionsFor(
  potential: ParsedTeTailPotential,
  rowContraction: CollapsedAspectAuxContraction
): readonly (readonly [string, CollapsedAspectAuxContraction])[] {
  const { auxiliary } = potential;
  return parseContractedItems(potential.contracted, {
    kind: rowContraction.kind,
    auxOnsetSurface: rowContraction.auxOnsetSurface,
    auxOnsetReading: rowContraction.auxOnsetReading,
    auxLemma: auxiliary.auxLemma,
    auxLemmaReading: auxiliary.auxLemmaReading,
    auxInflectionClass: auxiliary.auxInflectionClass,
    auxHypotheticalSurface: auxiliary.auxHypotheticalSurface,
    auxHypotheticalReading: auxiliary.auxHypotheticalReading,
    derivation: "potential"
  }, "potential.contracted", potential.lineNumber);
}

function parseTeTailBenefactiveAspect(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): BenefactiveAspectOp["aspect"] | undefined {
  if (kind === "benefactive" && typeof value === "string" && TE_TAIL_BENEFACTIVE_ASPECTS.has(value as BenefactiveAspectOp["aspect"])) {
    return value as BenefactiveAspectOp["aspect"];
  }
  if (kind === "simple_aspect" && value === undefined) {
    return undefined;
  }
  throw new Error(`invalid te-tail benefactive_aspect at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePredicateSuffixCompetition(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): "lexical_predicate" {
  if (kind === "simple_aspect" && value === "lexical_predicate") {
    return value;
  }
  throw new Error(
    `invalid te-tail continuation predicate_suffix_competition at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`
  );
}

function parseTeTailImperativeForms(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): readonly string[] {
  if (kind === "simple_aspect") {
    return parseTeTailContinuationLexemeForms(value, lineNumber);
  }
  throw new Error(`invalid te-tail continuation imperative_forms at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailAuxiliaryHonorific(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): "respect" {
  if (kind === "simple_aspect" && value === "respect") {
    return value;
  }
  throw new Error(`invalid te-tail continuation auxiliary_honorific at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailDenotation(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): "state" {
  if (kind === "simple_aspect" && value === "state") {
    return value;
  }
  throw new Error(`invalid te-tail continuation denotation at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailDirection(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): TeTailContinuationDirection {
  if (
    kind === "simple_aspect" &&
    typeof value === "string" &&
    TE_TAIL_CONTINUATION_DIRECTIONS.has(value as TeTailContinuationDirection)
  ) {
    return value as TeTailContinuationDirection;
  }
  throw new Error(`invalid te-tail continuation direction at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseFollowingRareruReading(
  value: unknown,
  kind: TeTailContinuationLexemeKind,
  lineNumber: number
): "honorific" {
  if (kind === "simple_aspect" && value === "honorific") {
    return value;
  }
  throw new Error(`invalid te-tail continuation following_rareru_reading at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailContinuationLexemeKind(value: unknown, lineNumber: number): TeTailContinuationLexemeKind {
  if (typeof value === "string" && TE_TAIL_CONTINUATION_LEXEME_KINDS.has(value as TeTailContinuationLexemeKind)) {
    return value as TeTailContinuationLexemeKind;
  }
  throw new Error(`invalid te-tail continuation kind at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTeTailContinuationLexemeForms(value: unknown, lineNumber: number): readonly string[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((form): form is string => typeof form === "string" && form.length > 0)
  ) {
    return value;
  }
  throw new Error(`invalid te-tail continuation forms at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseDescription(value: unknown, lineNumber: number): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(`invalid te-tail continuation description at ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function createKindByFormMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, TeTailContinuationLexemeKind> {
  const map = new Map<string, TeTailContinuationLexemeKind>();
  for (const entry of entries) {
    for (const form of entry.forms) {
      map.set(form, entry.kind);
    }
  }
  return map;
}

function createEntryByFormMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, TeTailContinuationLexemeEntry> {
  const map = new Map<string, TeTailContinuationLexemeEntry>();
  for (const entry of entries) {
    for (const form of entry.forms) {
      map.set(form, entry);
    }
  }
  return map;
}

function createContractionByLemmaMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, CollapsedAspectAuxContraction> {
  const map = new Map<string, CollapsedAspectAuxContraction>();
  for (const entry of entries) {
    for (const [lemma, contraction] of entry.contractions ?? []) {
      if (map.has(lemma)) {
        throw new Error(`duplicate te-tail continuation contracted lemma '${lemma}' in ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}`);
      }
      map.set(lemma, contraction);
    }
  }
  return map;
}

function createPotentialContractionByLemmaMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, CollapsedAspectAuxContraction> {
  const map = new Map<string, CollapsedAspectAuxContraction>();
  const baseLemmas = createContractionByLemmaMap(entries);
  for (const entry of entries) {
    for (const [lemma, contraction] of entry.potentialContractions ?? []) {
      if (map.has(lemma) || baseLemmas.has(lemma)) {
        throw new Error(`duplicate te-tail continuation contracted lemma '${lemma}' in ${TE_TAIL_CONTINUATION_TABLE_RELATIVE_PATH}`);
      }
      map.set(lemma, contraction);
    }
  }
  return map;
}

function createPotentialEntryByFormMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, TeTailContinuationLexemeEntry> {
  const map = new Map<string, TeTailContinuationLexemeEntry>();
  for (const entry of entries) {
    for (const form of entry.potential?.forms ?? []) {
      map.set(form, entry);
    }
  }
  return map;
}

function createConnectiveFusedContractionByMarkerMap(
  byLemma: ReadonlyMap<string, CollapsedAspectAuxContraction>
): ReadonlyMap<string, CollapsedAspectAuxContraction> {
  const map = new Map<string, CollapsedAspectAuxContraction>();
  const ambiguous = new Set<string>();
  for (const contraction of byLemma.values()) {
    const ichidan = is上一段(contraction.auxInflectionClass) || is下一段(contraction.auxInflectionClass);
    if (!ichidan || contraction.auxLemma !== `${contraction.auxOnsetSurface}る`) {
      continue;
    }
    const marker = contraction.fusedSurface;
    const known = map.get(marker);
    if (known !== undefined && known !== contraction) {
      ambiguous.add(marker);
    }
    map.set(marker, contraction);
  }
  for (const marker of ambiguous) {
    map.delete(marker);
  }
  return map;
}

function createImperativeEntryByFormMap(
  entries: readonly TeTailContinuationLexemeEntry[]
): ReadonlyMap<string, TeTailContinuationLexemeEntry> {
  const map = new Map<string, TeTailContinuationLexemeEntry>();
  for (const entry of entries) {
    for (const form of entry.imperativeForms ?? []) {
      map.set(form, entry);
    }
  }
  return map;
}
