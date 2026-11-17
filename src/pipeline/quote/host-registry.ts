import type { LookupData, QuoteHostKind } from "../lookup-tables.js";

export type QuoteHostPattern = "direct" | "noun_suru";

export type QuoteHostCapability =
  | "no_quote_reporting"
  | "negative_condition_preferred"
  | "bare_nominal_quote"
  | "bare_nominal_focus_quote"
  | "bare_nominal_passive_quote"
  | "bare_nominal_colloquial_quote"
  | "bare_nominal_hearsay_quote"
  | "bare_nominal_object_label_quote"
  | "companion_disambiguated_passive_quote"
  | "plain_verb_to_blocked"
  | "bare_nominal_companion_to"
  | "plain_verb_to_strictly_blocked"
  | "cognitive_complement"
  | "command_request"
  | "request_quote"
  | "strong_request_quote"
  | "question_request"
  | "passive_request"
  | "attributive_quote_carrier"
  | "conditional_wish"
  | "volitional_content_complement"
  | "euphemistic_judgment_kato"
  | "surface_quotative_cue";

export type QuoteAuxHostCapability =
  | "request_question_aux";

export type QuoteHostEvidenceSetId =
  | "bare_nominal_hearsay_companion_cues"
  | "marker_bound_relational_heads"
  | "bare_nominal_object_label_object_nouns"
  | "plain_verb_to_quote_cue_sahen_nouns";

export type QuoteHostKindTable = { readonly [key: string]: QuoteHostKind };

export interface QuoteHostRegistryEntry {
  readonly form: string;
  readonly pattern: QuoteHostPattern;
  readonly kind: QuoteHostKind;
  readonly capabilities: ReadonlySet<QuoteHostCapability>;
}

export interface QuoteHostLike {
  readonly hostForm: string;
  readonly supportIdx: number | null;
}

const QUOTE_HOST_KINDS = new Set<QuoteHostKind>(["wish", "thought", "report", "question", "request"]);
const QUOTE_HOST_CAPABILITIES = new Set<QuoteHostCapability>([
  "no_quote_reporting",
  "negative_condition_preferred",
  "bare_nominal_quote",
  "bare_nominal_focus_quote",
  "bare_nominal_passive_quote",
  "bare_nominal_colloquial_quote",
  "bare_nominal_hearsay_quote",
  "bare_nominal_object_label_quote",
  "companion_disambiguated_passive_quote",
  "plain_verb_to_blocked",
  "bare_nominal_companion_to",
  "plain_verb_to_strictly_blocked",
  "cognitive_complement",
  "command_request",
  "request_quote",
  "strong_request_quote",
  "question_request",
  "passive_request",
  "attributive_quote_carrier",
  "conditional_wish",
  "volitional_content_complement",
  "euphemistic_judgment_kato",
  "surface_quotative_cue"
]);
const QUOTE_AUX_HOST_CAPABILITIES = new Set<QuoteAuxHostCapability>(["request_question_aux"]);
const QUOTE_HOST_EVIDENCE_SET_IDS = new Set<QuoteHostEvidenceSetId>([
  "bare_nominal_hearsay_companion_cues",
  "marker_bound_relational_heads",
  "bare_nominal_object_label_object_nouns",
  "plain_verb_to_quote_cue_sahen_nouns"
]);

export class QuoteHostRegistry {
  constructor(
    private readonly directEntries: ReadonlyMap<string, QuoteHostRegistryEntry>,
    private readonly nounSuruEntries: ReadonlyMap<string, QuoteHostRegistryEntry>,
    private readonly auxCapabilities: ReadonlyMap<string, ReadonlySet<QuoteAuxHostCapability>>,
    private readonly evidenceSets: ReadonlyMap<QuoteHostEvidenceSetId, ReadonlySet<string>>,
  ) {}

  entry(pattern: QuoteHostPattern, form: string | null | undefined): QuoteHostRegistryEntry | undefined {
    if (form === undefined || form === null || form.length === 0) {
      return undefined;
    }
    return this.entriesForPattern(pattern).get(normalizeHostForm(pattern, form));
  }

  kind(pattern: QuoteHostPattern, form: string | null | undefined): QuoteHostKind | undefined {
    return this.entry(pattern, form)?.kind;
  }

  hasCapability(pattern: QuoteHostPattern, form: string | null | undefined, capability: QuoteHostCapability): boolean {
    return this.entry(pattern, form)?.capabilities.has(capability) === true;
  }

  hostHasCapability(host: QuoteHostLike, capability: QuoteHostCapability): boolean {
    const pattern = host.supportIdx === null ? "direct" : "noun_suru";
    return this.hasCapability(pattern, host.hostForm, capability);
  }

  auxHostHasCapability(form: string | null | undefined, capability: QuoteAuxHostCapability): boolean {
    if (form === undefined || form === null || form.length === 0) {
      return false;
    }
    return this.auxCapabilities.get(form)?.has(capability) === true;
  }

  evidenceSet(id: QuoteHostEvidenceSetId): ReadonlySet<string> {
    return this.evidenceSets.get(id) ?? EMPTY_SET;
  }

  evidenceSetHas(id: QuoteHostEvidenceSetId, form: string | null | undefined): boolean {
    return form !== undefined && form !== null && this.evidenceSet(id).has(form);
  }

  kindTable(pattern: QuoteHostPattern): QuoteHostKindTable {
    const result: Record<string, QuoteHostKind> = {};
    for (const [form, entry] of this.entriesForPattern(pattern)) {
      result[form] = entry.kind;
    }
    return result;
  }

  private entriesForPattern(pattern: QuoteHostPattern): ReadonlyMap<string, QuoteHostRegistryEntry> {
    return pattern === "direct" ? this.directEntries : this.nounSuruEntries;
  }
}

const EMPTY_SET: ReadonlySet<string> = new Set();

export function buildQuoteHostRegistry(data: LookupData): QuoteHostRegistry {
  const quoteHost = section(data["quote_host"], "quote_host");
  return new QuoteHostRegistry(
    parseHostEntries(quoteHost["direct"], "quote_host.direct", "direct"),
    parseHostEntries(quoteHost["noun_suru"], "quote_host.noun_suru", "noun_suru"),
    parseAuxHostCapabilities(quoteHost["aux_host"]),
    parseEvidenceSets(quoteHost["evidence_sets"])
  );
}

function parseHostEntries(value: unknown, name: string, pattern: QuoteHostPattern): ReadonlyMap<string, QuoteHostRegistryEntry> {
  const table = section(value, name);
  const entries = new Map<string, QuoteHostRegistryEntry>();
  for (const [rawForm, rawEntry] of Object.entries(table)) {
    const form = normalizeHostForm(pattern, rawForm);
    if (entries.has(form)) {
      throw new Error(`duplicate quote host entry: ${name}.${form}`);
    }
    const entryTable = section(rawEntry, `${name}.${rawForm}`);
    const kind = quoteHostKind(entryTable["kind"], `${name}.${rawForm}.kind`);
    const capabilities = quoteHostCapabilitySet(entryTable["capabilities"], `${name}.${rawForm}.capabilities`);
    validateHostCapabilities(pattern, rawForm, capabilities);
    entries.set(form, { form, pattern, kind, capabilities });
  }
  return entries;
}

function parseAuxHostCapabilities(value: unknown): ReadonlyMap<string, ReadonlySet<QuoteAuxHostCapability>> {
  const table = section(value, "quote_host.aux_host");
  const result = new Map<string, ReadonlySet<QuoteAuxHostCapability>>();
  for (const [form, rawCapabilities] of Object.entries(table)) {
    if (result.has(form)) {
      throw new Error(`duplicate quote aux host entry: ${form}`);
    }
    result.set(form, quoteAuxHostCapabilitySet(rawCapabilities, `quote_host.aux_host.${form}`));
  }
  return result;
}

function parseEvidenceSets(value: unknown): ReadonlyMap<QuoteHostEvidenceSetId, ReadonlySet<string>> {
  const table = section(value, "quote_host.evidence_sets");
  const result = new Map<QuoteHostEvidenceSetId, ReadonlySet<string>>();
  for (const [id, rawValues] of Object.entries(table)) {
    if (!QUOTE_HOST_EVIDENCE_SET_IDS.has(id as QuoteHostEvidenceSetId)) {
      throw new Error(`unknown quote host evidence set: ${id}`);
    }
    result.set(id as QuoteHostEvidenceSetId, stringSet(rawValues, `quote_host.evidence_sets.${id}`));
  }
  for (const id of QUOTE_HOST_EVIDENCE_SET_IDS) {
    if (!result.has(id)) {
      throw new Error(`missing quote host evidence set: ${id}`);
    }
  }
  return result;
}

function normalizeHostForm(pattern: QuoteHostPattern, form: string): string {
  return pattern === "noun_suru" && form.endsWith("する")
    ? form.slice(0, -"する".length)
    : form;
}

function validateHostCapabilities(pattern: QuoteHostPattern, form: string, capabilities: ReadonlySet<QuoteHostCapability>): void {
  if (pattern === "noun_suru") {
    if (capabilities.has("plain_verb_to_blocked") || capabilities.has("plain_verb_to_strictly_blocked")) {
      throw new Error(`noun_suru quote host cannot use direct plain-verb capability: ${form}`);
    }
    if (capabilities.has("no_quote_reporting")) {
      throw new Error(`noun_suru quote host cannot use direct no-quote reporting capability: ${form}`);
    }
  }
  if (capabilities.has("plain_verb_to_strictly_blocked") && !capabilities.has("plain_verb_to_blocked")) {
    throw new Error(`strict plain-verb block requires plain_verb_to_blocked: ${form}`);
  }
}

function quoteHostKind(value: unknown, name: string): QuoteHostKind {
  if (typeof value !== "string" || !QUOTE_HOST_KINDS.has(value as QuoteHostKind)) {
    throw new Error(`invalid quote host kind: ${name}`);
  }
  return value as QuoteHostKind;
}

function quoteHostCapabilitySet(value: unknown, name: string): ReadonlySet<QuoteHostCapability> {
  const capabilities = new Set<QuoteHostCapability>();
  if (value === undefined) {
    return capabilities;
  }
  for (const item of stringArray(value, name)) {
    if (!QUOTE_HOST_CAPABILITIES.has(item as QuoteHostCapability)) {
      throw new Error(`unknown quote host capability: ${name}.${item}`);
    }
    capabilities.add(item as QuoteHostCapability);
  }
  return capabilities;
}

function quoteAuxHostCapabilitySet(value: unknown, name: string): ReadonlySet<QuoteAuxHostCapability> {
  const capabilities = new Set<QuoteAuxHostCapability>();
  for (const item of stringArray(value, name)) {
    if (!QUOTE_AUX_HOST_CAPABILITIES.has(item as QuoteAuxHostCapability)) {
      throw new Error(`unknown quote aux host capability: ${name}.${item}`);
    }
    capabilities.add(item as QuoteAuxHostCapability);
  }
  return capabilities;
}

function stringSet(value: unknown, name: string): ReadonlySet<string> {
  return new Set(stringArray(value, name));
}

function stringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`invalid string array: ${name}`);
  }
  return value;
}

function section(value: unknown, name: string): Record<string, unknown> {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`missing lookup table section: ${name}`);
  }
  return value as Record<string, unknown>;
}
