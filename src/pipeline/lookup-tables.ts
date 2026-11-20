
import { parse } from "smol-toml";

import { asIrregular, type IrregularType } from "../generator/conjugator.js";
import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import { stableFingerprint, stableSerialize } from "../stable-fingerprint.js";
import { POS0, isDependentWordPos0Name, isInflectClassName, isSymbolCharacterToken, pos0in, 感動詞, 形状詞, 形容詞0, 接続詞, 代名詞, 動詞, 副詞, 名詞, 連体詞 } from "../types/pos.js";
import { buildQuoteHostRegistry, type QuoteHostRegistry } from "./quote/host-registry.js";
import type { ProlongedReductionContract } from "../analyzer/reduction-variant.js";
import {
  parseWhitespaceRunMapping,
  type WhitespaceBarrierContract,
  type WhitespaceCharMapping,
  type WhitespaceKind
} from "../analyzer/whitespace-policy.js";

export type FunctionalChainKind = "desu" | "deshita" | "deshou" | "da" | "datta" | "masu" | "mashita" | "mashou";
export type QuoteHostKind = "wish" | "thought" | "report" | "question" | "request";

type LookupValue = string | readonly unknown[] | LookupSection;
type LookupSection = { readonly [key: string]: LookupValue };
export type LookupData = { readonly [section: string]: LookupSection };
type MutableLookupData = { [section: string]: LookupSection };
type FunctionalChainTable = { readonly [key: string]: string };
type LemmaIrregularTable = ReadonlyMap<string, readonly [korean: string, irregular: IrregularType | null]>;
type RoundTripLemmaTable = ReadonlyMap<string, {
  readonly sourceKorean: string;
  readonly targetKorean: string;
  readonly targetIrregular: IrregularType | null;
}>;
type ObjectAdnominalEndingEntry = {
  readonly verb?: unknown;
  readonly objects?: unknown;
  readonly ending?: unknown;
};
type HeadNounRequiredComplementEntry = {
  readonly korean?: unknown;
  readonly ending?: unknown;
  readonly complement?: unknown;
  readonly tense?: unknown;
  readonly expletive_negation?: unknown;
  readonly source_heads?: unknown;
  readonly bare_entity_modifier_sources?: unknown;
  readonly entity_duration_matrix_predicates?: unknown;
  readonly demonstrative_co_modifier_block?: unknown;
};

export type HeadNounRequiredComplementForm =
  | { readonly kind: "adnominal"; readonly ending: string }
  | { readonly kind: "nominal_ki"; readonly nonPastOnly: boolean; readonly expletiveNegation: boolean };

export interface HeadNounRequiredComplement {
  readonly form: HeadNounRequiredComplementForm;
  readonly sourceHeads: ReadonlySet<string>;
  readonly bareEntityModifierSources: ReadonlySet<string>;
  readonly entityDurationMatrixPredicates: ReadonlySet<string>;
  readonly demonstrativeCoModifierBlock: boolean;
}

export type LookupOverride = { readonly [section: string]: { readonly [key: string]: readonly string[] } };

type LookupSuffixBuckets = ReadonlyMap<number, ReadonlySet<string>>;

const lookupSuffixBucketCache = new WeakMap<ReadonlySet<string>, LookupSuffixBuckets>();

class LookupStringSet extends Set<string> {
  readonly #exclude?: ReadonlySet<string>;
  #suffixBuckets?: LookupSuffixBuckets;

  constructor(values: Iterable<string>, exclude?: Iterable<string>) {
    super(values);
    if (exclude !== undefined) {
      this.#exclude = new Set(exclude);
    }
  }

  override has(value: string): boolean {
    if (this.#exclude !== undefined && lookupSetMatches(this.#exclude, value)) {
      return false;
    }
    if (super.has(value)) {
      return true;
    }
    if (value.length === 0) {
      return false;
    }
    return lookupSuffixBucketsMatch(this.suffixBuckets(), value);
  }

  private suffixBuckets(): LookupSuffixBuckets {
    this.#suffixBuckets ??= buildLookupSuffixBuckets(this);
    return this.#suffixBuckets;
  }
}

function buildLookupSuffixBuckets(items: Iterable<string>): LookupSuffixBuckets {
  const buckets = new Map<number, Set<string>>();
  for (const item of items) {
    const star = item.indexOf("*");
    if (star < 0) {
      continue;
    }
    if (star !== 0 || item.length === 1 || item.indexOf("*", 1) >= 0) {
      throw new Error(`invalid lookup wildcard item ${JSON.stringify(item)}: only leading suffix wildcard patterns like "*類" are supported`);
    }
    const suffix = item.slice(1);
    let bucket = buckets.get(suffix.length);
    if (bucket === undefined) {
      bucket = new Set<string>();
      buckets.set(suffix.length, bucket);
    }
    bucket.add(suffix);
  }
  return buckets;
}

function lookupSuffixBuckets(set: ReadonlySet<string>): LookupSuffixBuckets {
  const cached = lookupSuffixBucketCache.get(set);
  if (cached !== undefined) {
    return cached;
  }
  const buckets = buildLookupSuffixBuckets(set);
  lookupSuffixBucketCache.set(set, buckets);
  return buckets;
}

function lookupSuffixBucketsMatch(buckets: LookupSuffixBuckets, value: string): boolean {
  for (const [suffixLength, suffixes] of buckets) {
    if (value.length >= suffixLength && suffixes.has(value.slice(-suffixLength))) {
      return true;
    }
  }
  return false;
}

export function lookupSetFromValues(values: Iterable<string>, exclude?: Iterable<string>): ReadonlySet<string> {
  return new LookupStringSet(values, exclude);
}

export function lookupSetMatches(set: ReadonlySet<string>, value: string | null | undefined): boolean {
  if (value === null || value === undefined || value.length === 0) {
    return false;
  }
  if (set instanceof LookupStringSet) {
    return set.has(value);
  }
  if (set.has(value)) {
    return true;
  }
  return lookupSuffixBucketsMatch(lookupSuffixBuckets(set), value);
}

function mergeStringValues(existing: string, incoming: string): string {
  let result = existing;
  for (const ch of incoming) {
    if (!result.includes(ch)) {
      result += ch;
    }
  }
  return result;
}

function mergeArrayValues(existing: readonly unknown[], incoming: readonly unknown[]): readonly unknown[] {
  const seen = new Set(existing.map((item) => stableSerialize(item)));
  const result = [...existing];
  for (const item of incoming) {
    const key = stableSerialize(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function mergeLookupValue(existing: LookupValue | undefined, incoming: LookupValue, name: string): LookupValue {
  if (existing === undefined) {
    return incoming;
  }
  if (typeof existing === "string" && typeof incoming === "string") {
    return mergeStringValues(existing, incoming);
  }
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return mergeArrayValues(existing, incoming);
  }
  if (isLookupSection(existing) && isLookupSection(incoming)) {
    return mergeLookupSection(existing, incoming, name);
  }
  throw new Error(`lookup table type conflict at ${name}`);
}

function mergeLookupSection(existing: LookupSection, incoming: LookupSection, sectionName: string): LookupSection {
  const target: { [key: string]: LookupValue } = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    target[key] = mergeLookupValue(target[key], value, `${sectionName}.${key}`);
  }
  return target;
}

export function loadMergedConfig(rootText: string, fragments?: ReadonlyMap<string, string>): LookupData {
  const merged: MutableLookupData = parse(rootText) as MutableLookupData;

  if (fragments !== undefined) {
    for (const [filename, text] of [...fragments.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const fragment = parse(text) as MutableLookupData;
      for (const [section, table] of Object.entries(fragment)) {
        merged[section] = mergeLookupSection(merged[section] ?? {}, table, `[${section}] from ${filename}`);
      }
    }
  }
  return merged;
}

function resolveLookupSet(
  data: LookupData,
  section: string,
  key: string,
  cache: Map<string, ReadonlySet<string>>,
  stack: readonly (readonly [section: string, key: string])[] = []
): ReadonlySet<string> {
  const ident = [section, key] as const;
  const cacheKey = `${section}\0${key}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  if (stack.some(([stackSection, stackKey]) => stackSection === section && stackKey === key)) {
    const chain = [...stack, ident].map(([itemSection, itemKey]) => `${itemSection}.${itemKey}`).join(" -> ");
    throw new Error(`cyclic lookup table include: ${chain}`);
  }

  const values = new Set(sectionStringArray(data, section, key));
  const includeKey = `${key}_includes`;
  const includes = sectionStringArrayOptional(data, section, includeKey);
  for (const ref of includes) {
    const [includeSection, includeLookupKey] = splitIncludeRef(ref, section);
    for (const value of resolveLookupSet(data, includeSection, includeLookupKey, cache, [...stack, ident])) {
      values.add(value);
    }
  }
  const resolved = lookupSetFromValues(values);
  cache.set(cacheKey, resolved);
  return resolved;
}

function splitIncludeRef(ref: string, currentSection: string): readonly [section: string, key: string] {
  const dot = ref.indexOf(".");
  if (dot < 0) {
    return [currentSection, ref];
  }
  const section = ref.slice(0, dot);
  const key = ref.slice(dot + 1);
  if (section.length === 0 || key.length === 0) {
    throw new Error(`invalid lookup include reference: ${JSON.stringify(ref)}`);
  }
  return [section, key];
}

function functionalChainRealizations(data: LookupData, kind: FunctionalChainKind): FunctionalChainTable {
  const functionalChain = data["functional_chain"];
  const table = valueAsSection(functionalChain?.[kind], `functional_chain.${kind}`);
  const result: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(table)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

function objectAdnominalEndingOverrides(data: LookupData): ReadonlyMap<string, string> {
  const value = data["attributive"]?.["object_ending_overrides"];
  const result = new Map<string, string>();
  if (value === undefined) {
    return result;
  }
  if (!Array.isArray(value)) {
    throw new Error("missing lookup table object array: attributive.object_ending_overrides");
  }
  for (const entry of value as readonly ObjectAdnominalEndingEntry[]) {
    if (typeof entry !== "object" || typeof entry.verb !== "string" || !Array.isArray(entry.objects) || typeof entry.ending !== "string") {
      throw new Error("invalid object adnominal ending override");
    }
    for (const object of entry.objects) {
      if (typeof object !== "string") {
        throw new Error("invalid object adnominal ending override object");
      }
      result.set(pairKey(entry.verb, object), entry.ending);
    }
  }
  return result;
}

function headNounRequiredComplements(data: LookupData): ReadonlyMap<string, HeadNounRequiredComplement> {
  const value = data["attributive"]?.["head_noun_required_complements"];
  const result = new Map<string, HeadNounRequiredComplement>();
  if (value === undefined) {
    return result;
  }
  if (!Array.isArray(value)) {
    throw new Error("missing lookup table object array: attributive.head_noun_required_complements");
  }
  for (const entry of value as readonly HeadNounRequiredComplementEntry[]) {
    if (
      typeof entry !== "object" ||
      typeof entry.korean !== "string" ||
      !Array.isArray(entry.source_heads) ||
      entry.source_heads.length === 0
    ) {
      throw new Error("invalid head noun required complement");
    }
    const form = headNounRequiredComplementForm(entry);
    const sourceHeads = new Set<string>();
    for (const head of entry.source_heads) {
      if (typeof head !== "string") {
        throw new Error("invalid head noun required complement source head");
      }
      sourceHeads.add(head);
    }
    const readOptionalStringSet = (value: unknown, label: string): ReadonlySet<string> => {
      const collected = new Set<string>();
      if (value === undefined) {
        return collected;
      }
      if (!Array.isArray(value)) {
        throw new Error(`invalid head noun required complement ${label}`);
      }
      for (const item of value) {
        if (typeof item !== "string") {
          throw new Error(`invalid head noun required complement ${label} item`);
        }
        collected.add(item);
      }
      return collected;
    };
    if (
      entry.demonstrative_co_modifier_block !== undefined &&
      typeof entry.demonstrative_co_modifier_block !== "boolean"
    ) {
      throw new Error("invalid head noun required complement demonstrative co-modifier block");
    }
    result.set(entry.korean, {
      form,
      sourceHeads,
      bareEntityModifierSources: readOptionalStringSet(entry.bare_entity_modifier_sources, "bare entity modifier sources"),
      entityDurationMatrixPredicates: readOptionalStringSet(entry.entity_duration_matrix_predicates, "entity duration matrix predicates"),
      demonstrativeCoModifierBlock: entry.demonstrative_co_modifier_block === true
    });
  }
  return result;
}

function headNounRequiredComplementForm(entry: HeadNounRequiredComplementEntry): HeadNounRequiredComplementForm {
  if (typeof entry.ending === "string" && entry.complement === undefined) {
    if (entry.tense !== undefined || entry.expletive_negation !== undefined) {
      throw new Error("invalid head noun required complement: complement features on an ending row");
    }
    return { kind: "adnominal", ending: entry.ending };
  }
  if (entry.complement === "nominal_ki" && entry.ending === undefined) {
    if (entry.tense !== undefined && entry.tense !== "nonpast") {
      throw new Error("invalid head noun required complement tense");
    }
    if (entry.expletive_negation !== undefined && typeof entry.expletive_negation !== "boolean") {
      throw new Error("invalid head noun required complement expletive negation");
    }
    return {
      kind: "nominal_ki",
      nonPastOnly: entry.tense === "nonpast",
      expletiveNegation: entry.expletive_negation === true
    };
  }
  throw new Error("invalid head noun required complement form: exactly one of ending/complement required");
}

function pairLookupSet(data: LookupData, section: string, key: string): ReadonlySet<string> {
  const value = data[section]?.[key];
  if (!Array.isArray(value)) {
    throw new Error(`missing lookup table pair array: ${section}.${key}`);
  }
  const result = new Set<string>();
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string") {
      throw new Error(`invalid lookup table pair in ${section}.${key}`);
    }
    result.add(pairKey(pair[0], pair[1]));
  }
  return result;
}

function stringMap(data: LookupData, section: string, key: string): ReadonlyMap<string, string> {
  const values = valueAsSection(data[section]?.[key], `${section}.${key}`);
  const result = new Map<string, string>();
  for (const [itemKey, value] of Object.entries(values)) {
    if (typeof value === "string") {
      result.set(itemKey, value);
    }
  }
  return result;
}

function lemmaIrregularMap(data: LookupData, section: string, key: string, cache: Map<string, ReadonlySet<string>>): LemmaIrregularTable {
  const result = new Map<string, readonly [string, IrregularType | null]>();
  for (const item of resolveLookupSet(data, section, key, cache)) {
    const parts = item.split("|");
    if (parts.length !== 2 && parts.length !== 3) {
      throw new Error(`invalid lemma map item: ${JSON.stringify(item)}`);
    }
    const jp = parts[0];
    const korean = parts[1];
    if (jp === undefined || korean === undefined) {
      throw new Error(`invalid lemma map item: ${JSON.stringify(item)}`);
    }
    const irregular = parts.length === 3 && parts[2] !== undefined && parts[2].length > 0 ? parts[2] : null;
    if (result.has(jp)) {
      throw new Error(`duplicate lemma map item: ${JSON.stringify(jp)}`);
    }
    result.set(jp, [korean, asIrregular(irregular)]);
  }
  return result;
}

function roundTripLemmaMap(data: LookupData, section: string, key: string, cache: Map<string, ReadonlySet<string>>): RoundTripLemmaTable {
  const result = new Map<string, { readonly sourceKorean: string; readonly targetKorean: string; readonly targetIrregular: IrregularType | null }>();
  for (const item of resolveLookupSet(data, section, key, cache)) {
    const parts = item.split("|");
    if (parts.length !== 3 && parts.length !== 4) {
      throw new Error(`invalid round-trip lemma map item: ${JSON.stringify(item)}`);
    }
    const jp = parts[0];
    const sourceKorean = parts[1];
    const targetKorean = parts[2];
    if (jp === undefined || sourceKorean === undefined || targetKorean === undefined) {
      throw new Error(`invalid round-trip lemma map item: ${JSON.stringify(item)}`);
    }
    const targetIrregular = parts.length === 4 && parts[3] !== undefined && parts[3].length > 0 ? parts[3] : null;
    if (result.has(jp)) {
      throw new Error(`duplicate round-trip lemma map item: ${JSON.stringify(jp)}`);
    }
    result.set(jp, { sourceKorean, targetKorean, targetIrregular: asIrregular(targetIrregular) });
  }
  return result;
}

export function pairKey(left: string, right: string): string {
  return `${left}\0${right}`;
}

function functionalChainKey(options: { readonly formal: boolean; readonly question?: boolean; readonly suffix?: boolean }): string {
  let key = options.formal ? "formal" : "casual";
  if (options.question === true) {
    key += "_question";
  }
  if (options.suffix === true) {
    key += "_suffix";
  }
  return key;
}

function sectionStringArray(data: LookupData, section: string, key: string): readonly string[] {
  const value = data[section]?.[key];
  if (typeof value === "string") {
    return Array.from(value);
  }
  if (!Array.isArray(value)) {
    throw new Error(`missing lookup table array: ${section}.${key}`);
  }
  return value;
}

function sectionStringArrayOptional(data: LookupData, section: string, key: string): readonly string[] {
  const value = data[section]?.[key];
  return Array.isArray(value) ? value : [];
}

function valueAsSection(value: LookupValue | undefined, name: string): LookupSection {
  if (!isLookupSection(value)) {
    throw new Error(`missing lookup table section: ${name}`);
  }
  return value;
}

function isLookupSection(value: LookupValue | undefined): value is LookupSection {
  return value !== undefined && typeof value !== "string" && !Array.isArray(value);
}

export const TAME_FORMS = new Set(["ため", "為"]);

export function isTameHead(
  token: { readonly pos: number; readonly surface: string; readonly dictionaryForm: string } | undefined
): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    TAME_FORMS.has(token.dictionaryForm || token.surface);
}
export const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "形状詞", "副詞", "連体詞", "代名詞", "接続詞", "感動詞"]);
export const CONTENT_POS_BITS = (1 << 名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 副詞) | (1 << 連体詞) | (1 << 代名詞) | (1 << 接続詞) | (1 << 感動詞);
export function isContentAdmissionToken(token: { readonly pos: number }): boolean {
  return pos0in(token.pos & POS0, CONTENT_POS_BITS) || isSymbolCharacterToken(token);
}
export const KAMO_SHIRENAI_LEMMAS = new Set(["しれる", "知れる", "知る"]);

export class LookupTables {
  private readonly data: LookupData;
  private readonly cache = new Map<string, ReadonlySet<string>>();
  private readonly derivedCache = new Map<string, unknown>();
  private cacheFingerprint: string | undefined;
  #named?: Map<string, ReadonlySet<string>>;

  private constructor(data: LookupData) {
    this.data = data;
  }

  static async load(loader: DataLoader): Promise<LookupTables> {
    const configDir = resolveDataSection("config");
    const rootText = await loader.readTextFile(loader.joinPath(configDir, "lookup_tables.toml"));
    const fragments = new Map<string, string>();
    const dDir = loader.joinPath(configDir, "lookup_tables.d");
    if (await loader.exists(dDir)) {
      const entries = await loader.readDir(dDir);
      for (const entry of entries.filter(e => e.isFile && e.name.endsWith(".toml")).sort((a, b) => a.name.localeCompare(b.name))) {
        const text = await loader.readTextFile(loader.joinPath(dDir, entry.name));
        fragments.set(entry.name, text);
      }
    }
    return new LookupTables(loadMergedConfig(rootText, fragments));
  }

  static fromData(data: LookupData): LookupTables {
    return new LookupTables(data);
  }

  providerCacheKey(): string {
    this.cacheFingerprint ??= stableFingerprint(this.data);
    return this.cacheFingerprint;
  }

  private cached<T>(key: string, build: () => T): T {
    const cached = this.derivedCache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }
    const value = build();
    this.derivedCache.set(key, value);
    return value;
  }

  withOverrides(patch: LookupOverride): LookupTables {
    const merged: MutableLookupData = { ...this.data };
    for (const [section, keys] of Object.entries(patch)) {
      merged[section] = mergeLookupSection(merged[section] ?? {}, keys, `[${section}] override`);
    }
    return LookupTables.fromData(merged);
  }

  set(section: string, key: string): ReadonlySet<string> {
    return resolveLookupSet(this.data, section, key, this.cache);
  }

  optionalSet(section: string, key: string): ReadonlySet<string> | undefined {
    return this.data[section]?.[key] === undefined ? undefined : this.set(section, key);
  }

  private cachedSet(propertyKey: string, section: string, key: string): ReadonlySet<string> {
    const value = this.set(section, key);
    Object.defineProperty(this, propertyKey, {
      value,
      configurable: true
    });
    return value;
  }

  named(name: string): ReadonlySet<string> | undefined {
    if (this.#named === undefined) {
      this.#named = this.buildNamedRegistry();
    }
    const registered = this.#named.get(name);
    if (registered !== undefined) {
      return registered;
    }
    const dot = name.indexOf(".");
    if (dot <= 0 || dot >= name.length - 1) {
      return undefined;
    }
    const section = name.slice(0, dot);
    const key = name.slice(dot + 1);
    if (this.data[section]?.[key] === undefined) {
      return undefined;
    }
    const resolved = this.set(section, key);
    this.#named.set(name, resolved);
    return resolved;
  }

  functionalChainRealization(
    kind: FunctionalChainKind,
    options: { readonly formal: boolean; readonly question?: boolean; readonly suffix?: boolean }
  ): string {
    const table = this.cached(`functional_chain.${kind}`, () => functionalChainRealizations(this.data, kind));
    const key = functionalChainKey(options);
    const value = table[key];
    if (value === undefined) {
      throw new Error(`missing functional chain realization: ${kind}.${key}`);
    }
    return value;
  }

  isTeIruResultativeVerb(dictForm: string | null | undefined, options: { readonly passive?: boolean } = {}): boolean {
    if (dictForm === undefined || dictForm === null || dictForm.length === 0) {
      return false;
    }
    return this.TE_IRU_RESULTATIVE_VERBS.has(dictForm) ||
      (options.passive === true && this.TE_IRU_PASSIVE_RESULTATIVE_VERBS.has(dictForm));
  }

  isTeIruNegativeResultativeVerb(dictForm: string | null | undefined, options: { readonly passive?: boolean } = {}): boolean {
    if (dictForm === undefined || dictForm === null || dictForm.length === 0) {
      return false;
    }
    return this.TE_IRU_NEGATIVE_RESULTATIVE_VERBS.has(dictForm) ||
      (options.passive === true && this.TE_IRU_PASSIVE_RESULTATIVE_VERBS.has(dictForm));
  }

  get KAKERU_DURATION_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("KAKERU_DURATION_OBJECT_NOUNS", "temporal", "kakeru_duration_object_nouns"); }
  get EMBEDDED_QUESTION_NARROW_VERBS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_NARROW_VERBS", "embedded_question", "narrow_verbs"); }
  get EMBEDDED_QUESTION_NARROW_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_NARROW_SAHEN_NOUNS", "embedded_question", "narrow_sahen_nouns"); }
  get EMBEDDED_QUESTION_NARROW_ADJ_DA(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_NARROW_ADJ_DA", "embedded_question", "narrow_adj_da"); }
  get EMBEDDED_QUESTION_BROAD_VERBS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_BROAD_VERBS", "embedded_question", "broad_verbs"); }
  get EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS", "embedded_question", "broad_sahen_nouns"); }
  get EMBEDDED_QUESTION_BROAD_ADJ_DA(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_BROAD_ADJ_DA", "embedded_question", "broad_adj_da"); }
  get EMBEDDED_QUESTION_CONTENT_HOST_VERBS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_CONTENT_HOST_VERBS", "embedded_question", "content_host_verbs"); }
  get EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS", "embedded_question", "content_host_sahen_nouns"); }
  get EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA", "embedded_question", "content_host_adj_da"); }
  get EMBEDDED_QUESTION_NI_SURU_NOUNS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_NI_SURU_NOUNS", "embedded_question", "ni_suru_nouns"); }
  get EMBEDDED_QUESTION_WH_INDEFINITE_HOSTS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_WH_INDEFINITE_HOSTS", "embedded_question", "wh_indefinite_hosts"); }
  get EMBEDDED_QUESTION_TIME_ADVERB_NOUNS(): ReadonlySet<string> { return this.cachedSet("EMBEDDED_QUESTION_TIME_ADVERB_NOUNS", "embedded_question", "time_adverb_nouns"); }
  get INTERROGATIVE_ADVERBIAL_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_ADVERBIAL_FORMS", "interrogative", "adverbial_forms"); }
  get INTERROGATIVE_PRONOMINAL_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_PRONOMINAL_FORMS", "interrogative", "pronominal_forms"); }
  get INTERROGATIVE_PRENOMINAL_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_PRENOMINAL_FORMS", "interrogative", "prenominal_forms"); }
  get INTERROGATIVE_NOMINAL_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_NOMINAL_FORMS", "interrogative", "nominal_forms"); }
  get INTERROGATIVE_QUANTITY_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_QUANTITY_FORMS", "interrogative", "quantity_forms"); }
  get INTERROGATIVE_AMOUNT_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_AMOUNT_FORMS", "interrogative", "amount_forms"); }
  get INTERROGATIVE_INDEFINITE_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_INDEFINITE_FORMS", "interrogative", "indefinite_forms"); }
  get INTERROGATIVE_COUNTER_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_COUNTER_FORMS", "interrogative", "counter_forms"); }
  get INTERROGATIVE_CONCESSIVE_ADVERBIAL_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_CONCESSIVE_ADVERBIAL_FORMS", "interrogative", "concessive_adverbial_forms"); }
  get INTERROGATIVE_NOMINAL_PREFIXES(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_NOMINAL_PREFIXES", "interrogative", "nominal_prefixes"); }
  get INTERROGATIVE_LEXICALIZED_COMPOUND_FORMS(): ReadonlySet<string> { return this.cachedSet("INTERROGATIVE_LEXICALIZED_COMPOUND_FORMS", "interrogative", "lexicalized_compound_forms"); }
  get WH_INDEFINITE_CORE_HEADS(): ReadonlySet<string> { return this.cachedSet("WH_INDEFINITE_CORE_HEADS", "indeterminate", "wh_indefinite_core_heads"); }
  get QUOTE_HOST_REGISTRY(): QuoteHostRegistry { return this.cached("quote_host.registry", () => buildQuoteHostRegistry(this.data)); }
  get SPEECH_VERBS(): ReadonlySet<string> {
    return this.cached("speech.verbs.projection", () => {
      const registry = this.QUOTE_HOST_REGISTRY;
      const forms = new Set<string>();
      for (const form of Object.keys(registry.kindTable("direct"))) {
        if (registry.hasCapability("direct", form, "surface_quotative_cue")) {
          forms.add(form);
        }
      }
      for (const noun of Object.keys(registry.kindTable("noun_suru"))) {
        if (registry.hasCapability("noun_suru", noun, "surface_quotative_cue")) {
          forms.add(`${noun}する`);
        }
      }
      return forms;
    });
  }
  get QUOTATIVE_NOUNS(): ReadonlySet<string> { return this.cachedSet("QUOTATIVE_NOUNS", "speech", "quotative_nouns"); }
  get DATTE_QUOTATIVE_CONTENT_HEADS(): ReadonlySet<string> { return this.cachedSet("DATTE_QUOTATIVE_CONTENT_HEADS", "speech", "datte_quotative_content_heads"); }
  get TTE_TOPIC_EXCLAMATIVE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TTE_TOPIC_EXCLAMATIVE_PREDICATES", "speech", "tte_topic_exclamative_predicates"); }
  get QUOTE_ATTRIBUTIVE_COHORTATIVE_HEADS(): ReadonlySet<string> { return this.cachedSet("QUOTE_ATTRIBUTIVE_COHORTATIVE_HEADS", "quote_attributive", "cohortative_heads"); }
  get KUDASARU_FORMS(): ReadonlySet<string> { return this.cachedSet("KUDASARU_FORMS", "kudasaru", "forms"); }
  get FUNCTIONAL_CHAIN_REALIZATIONS(): LookupSection { return valueAsSection(this.data["functional_chain"], "functional_chain"); }
  get CONDITIONAL_COUNTERFACTUAL_RESULT_FORMS(): ReadonlySet<string> { return this.cachedSet("CONDITIONAL_COUNTERFACTUAL_RESULT_FORMS", "conditional", "counterfactual_result_forms"); }
  get CONDITIONAL_COUNTERFACTUAL_MODAL_CLOSER_SURFACES(): ReadonlySet<string> { return this.cachedSet("CONDITIONAL_COUNTERFACTUAL_MODAL_CLOSER_SURFACES", "conditional", "counterfactual_modal_closer_surfaces"); }
  get CONDITIONAL_DISCOVERY_RESULT_FORMS(): ReadonlySet<string> { return this.cachedSet("CONDITIONAL_DISCOVERY_RESULT_FORMS", "conditional", "discovery_result_forms"); }
  get DEARU_CONN_ENDINGS(): ReadonlyMap<string, string> { return this.cached("copula_de.conn_endings", () => stringMap(this.data, "copula_de", "conn_endings")); }
  get PREFACE_DEARU_CONN_ENDINGS(): ReadonlyMap<string, string> { return this.cached("copula_de.preface_conn_endings", () => stringMap(this.data, "copula_de", "preface_conn_endings")); }
  get PREFACE_DEARU_CONN_ENDINGS_POLITE(): ReadonlyMap<string, string> { return this.cached("copula_de.preface_conn_endings_polite", () => stringMap(this.data, "copula_de", "preface_conn_endings_polite")); }
  get PREFACE_DEARU_CONN_ENDINGS_POLITE_FORMAL(): ReadonlyMap<string, string> { return this.cached("copula_de.preface_conn_endings_polite_formal", () => stringMap(this.data, "copula_de", "preface_conn_endings_polite_formal")); }
  get DEKIRU_ABILITY_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_ABILITY_NOUNS", "verb", "dekiru_ability_nouns"); }
  get DEKIRU_POSSIBILITY_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_POSSIBILITY_NOUNS", "verb", "dekiru_possibility_nouns"); }
  get DEKIRU_COMPLETION_STRONG_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_COMPLETION_STRONG_NOUNS", "verb", "dekiru_completion_strong_nouns"); }
  get DEKIRU_COMPLETION_DO_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_COMPLETION_DO_NOUNS", "verb", "dekiru_completion_do_nouns"); }
  get DEKIRU_COMPLETION_AMBIGUOUS_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_COMPLETION_AMBIGUOUS_NOUNS", "verb", "dekiru_completion_ambiguous_nouns"); }
  get DEKIRU_EMERGENCE_NOUNS(): ReadonlySet<string> { return this.cachedSet("DEKIRU_EMERGENCE_NOUNS", "verb", "dekiru_emergence_nouns"); }
  get TE_SEQUENTIAL_FOLLOWING_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_SEQUENTIAL_FOLLOWING_VERBS", "verb", "te_sequential_following"); }
  get PURPOSE_MOTION_VERBS(): ReadonlySet<string> { return this.cachedSet("PURPOSE_MOTION_VERBS", "verb", "purpose_motion_verbs"); }
  get TE_MOVEMENT_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("TE_MOVEMENT_SAHEN_NOUNS", "verb", "te_movement_sahen_nouns"); }
  get TE_SEQUENTIAL_VERB_PAIRS(): ReadonlySet<string> { return this.cached("verb.te_sequential_pairs", () => pairLookupSet(this.data, "verb", "te_sequential_pairs")); }
  get TE_CAUSAL_VERB_PAIRS(): ReadonlySet<string> { return this.cached("verb.te_causal_pairs", () => pairLookupSet(this.data, "verb", "te_causal_pairs")); }
  get TE_PRECEDING_CAUSAL_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_PRECEDING_CAUSAL_VERBS", "verb", "te_preceding_causal"); }
  get TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS", "verb", "te_preceding_benefactive_request"); }
  get TE_PRECEDING_INVOLUNTARY_STATE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_PRECEDING_INVOLUNTARY_STATE_VERBS", "verb", "te_preceding_involuntary_state"); }
  get TE_PRECEDING_EMOTIVE_SOURCE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_PRECEDING_EMOTIVE_SOURCE_VERBS", "verb", "te_preceding_emotive_source"); }
  get TE_PRECEDING_MANNER_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_PRECEDING_MANNER_VERBS", "verb", "te_preceding_manner"); }
  get TE_FOLLOWING_REACTION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TE_FOLLOWING_REACTION_PREDICATES", "verb", "te_following_reaction"); }
  get TE_IRU_FOLLOWING_REACTION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TE_IRU_FOLLOWING_REACTION_PREDICATES", "verb", "te_iru_following_reaction"); }
  get TE_FOLLOWING_BENEFACTIVE_RESULT_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TE_FOLLOWING_BENEFACTIVE_RESULT_PREDICATES", "verb", "te_following_benefactive_result"); }
  get TE_SHIMAU_FOLLOWING_REPARATION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TE_SHIMAU_FOLLOWING_REPARATION_PREDICATES", "verb", "te_shimau_following_reparation"); }
  get TE_EVALUATION_FOLLOWERS(): ReadonlySet<string> { return this.cachedSet("TE_EVALUATION_FOLLOWERS", "verb", "te_evaluation_followers"); }
  get INVOLUNTARY_RESULT_VERBS(): ReadonlySet<string> { return this.cachedSet("INVOLUNTARY_RESULT_VERBS", "verb", "involuntary_result"); }
  get ADJECTIVE_CONNECTIVE_REACTION_VERBS(): ReadonlySet<string> { return this.cachedSet("ADJECTIVE_CONNECTIVE_REACTION_VERBS", "verb", "adjective_connective_reaction"); }
  get DEGREE_INTENSIFIER_TAIL_VERBS(): ReadonlySet<string> { return this.cachedSet("DEGREE_INTENSIFIER_TAIL_VERBS", "verb", "degree_intensifier_tail"); }
  get DOUMO_EMPHASIS_HEADS(): ReadonlySet<string> { return this.cachedSet("DOUMO_EMPHASIS_HEADS", "formula", "doumo_emphasis_heads"); }
  get PAUSE_RANGE_CONSUMING_PARTICLES(): ReadonlySet<string> { return this.cachedSet("PAUSE_RANGE_CONSUMING_PARTICLES", "pause_range", "consuming_particles"); }
  get PAUSE_RANGE_GOJUON_SECTION_NOUNS(): ReadonlySet<string> { return this.cachedSet("PAUSE_RANGE_GOJUON_SECTION_NOUNS", "pause_range", "gojuon_section_nouns"); }
  get GRAMMAR_BOUNDARY_CLAUSE_PAUSE_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_CLAUSE_PAUSE_SURFACES", "grammar_boundary", "clause_pause_surfaces"); }
  get GRAMMAR_BOUNDARY_CLAUSE_RESULT_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_CLAUSE_RESULT_SURFACES", "grammar_boundary", "clause_result_surfaces"); }
  get GRAMMAR_BOUNDARY_SUBTITLE_TERMINAL_TRAILING_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_SUBTITLE_TERMINAL_TRAILING_SURFACES", "grammar_boundary", "subtitle_terminal_trailing_surfaces"); }
  get GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES", "grammar_boundary", "clause_break_dash_surfaces"); }
  get GRAMMAR_BOUNDARY_DISCOURSE_RESUMPTION_CONNECTIVE_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_DISCOURSE_RESUMPTION_CONNECTIVE_SURFACES", "grammar_boundary", "discourse_resumption_connective_surfaces"); }
  get GRAMMAR_BOUNDARY_POLITE_FORMULAIC_TERMINAL_HOST_LEMMAS(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_POLITE_FORMULAIC_TERMINAL_HOST_LEMMAS", "grammar_boundary", "polite_formulaic_terminal_host_lemmas"); }
  get SFP_UTTERANCE_CLOSING_EFFECTS(): ReadonlySet<string> { return this.cachedSet("SFP_UTTERANCE_CLOSING_EFFECTS", "sfp", "utterance_closing_effects"); }
  get RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLES(): ReadonlySet<string> { return this.cachedSet("RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLES", "renyou_nominal_head", "verbal_host_case_particles"); }
  get RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLE_RESULT_PREDICATES(): ReadonlySet<string> { return this.cachedSet("RENYOU_NOMINAL_HEAD_VERBAL_HOST_CASE_PARTICLE_RESULT_PREDICATES", "renyou_nominal_head", "verbal_host_case_particle_result_predicates"); }
  get WHITESPACE_RUN_MAPPING(): WhitespaceCharMapping {
    return this.cached("WHITESPACE_RUN_MAPPING", () => {
      const section = this.data["whitespace"]?.["run_mapping"];
      const entries: [WhitespaceKind, string][] = [];
      if (isLookupSection(section)) {
        for (const kind of ["ascii", "ideographic", "tab", "line", "unicode_space", "mixed"] as const) {
          const value = section[kind];
          if (typeof value === "string") {
            entries.push([kind, value]);
          }
        }
      }
      if (entries.length === 0) {
        throw new Error("missing lookup table: whitespace.run_mapping");
      }
      return parseWhitespaceRunMapping(entries);
    });
  }

  get WHITESPACE_LETTER_SPACING_MIN_RUNS(): number {
    return this.cached("WHITESPACE_LETTER_SPACING_MIN_RUNS", () => {
      const section = this.data["whitespace"]?.["letter_spacing"];
      const raw = isLookupSection(section) ? section["min_runs"] : undefined;
      const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("missing or invalid lookup table value: whitespace.letter_spacing.min_runs");
      }
      return value;
    });
  }

  get SOKUON_MIMETIC_ADVERBIAL_FOLLOWERS(): ReadonlySet<string> { return this.cachedSet("SOKUON_MIMETIC_ADVERBIAL_FOLLOWERS", "sokuon", "mimetic_adverbial_followers"); }

  get WHITESPACE_LETTER_SPACING_SEGMENT_CHAR(): (char: string) => boolean {
    return this.cached("WHITESPACE_LETTER_SPACING_SEGMENT_CHAR", () => {
      const scripts = this.whitespaceStringArray("letter_spacing", "segment_scripts");
      const pattern = new RegExp(
        `^[${scripts.map((script) => `\\p{Script_Extensions=${script}}`).join("")}]$`,
        "u"
      );
      return (char: string): boolean => pattern.test(char);
    });
  }

  get WHITESPACE_BARRIER_CONTRACT(): WhitespaceBarrierContract {
    return this.cached("WHITESPACE_BARRIER_CONTRACT", () => ({
      boundLeftPos0: new Set(this.whitespaceStringArray("barrier", "bound_left_pos0")),
      boundRightSuffixPos0: new Set(this.whitespaceStringArray("barrier", "bound_right_suffix_pos0")),
      boundRightInflectionPos0: new Set(this.whitespaceStringArrayAllowingEmpty("barrier", "bound_right_inflection_pos0")),
      inflectionHostForms: new Set(this.whitespaceStringArray("barrier", "inflection_host_forms")),
      bondExemptLeftCharClasses: this.whitespaceStringArrayAllowingEmpty("barrier", "bond_exempt_left_char_classes")
    }));
  }

  private whitespaceStringArrayAllowingEmpty(table: string, key: string): readonly string[] {
    const section = this.data["whitespace"]?.[table];
    const value = isLookupSection(section) ? section[key] : undefined;
    if (!Array.isArray(value)) {
      throw new Error(`missing lookup table array: whitespace.${table}.${key}`);
    }
    return value;
  }

  private whitespaceStringArray(table: string, key: string): readonly string[] {
    const section = this.data["whitespace"]?.[table];
    const value = isLookupSection(section) ? section[key] : undefined;
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`missing lookup table array: whitespace.${table}.${key}`);
    }
    return value;
  }

  get TRANSCRIPTION_SPEAKER_LABEL_MARKER_SURFACES(): ReadonlySet<string> { return this.cachedSet("TRANSCRIPTION_SPEAKER_LABEL_MARKER_SURFACES", "transcription", "speaker_label_marker_surfaces"); }
  get TRANSCRIPTION_SPEAKER_LABEL_TITLE_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("TRANSCRIPTION_SPEAKER_LABEL_TITLE_SUFFIXES", "transcription", "speaker_label_title_suffixes"); }
  get PERSON_NOUNS(): ReadonlySet<string> { return this.cachedSet("PERSON_NOUNS", "person", "nouns"); }
  get PERSON_NOUN_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("PERSON_NOUN_SUFFIXES", "person", "noun_suffixes"); }
  get PERSON_NOUN_SUFFIX_EXACT_EXCLUSIONS(): ReadonlySet<string> { return this.cachedSet("PERSON_NOUN_SUFFIX_EXACT_EXCLUSIONS", "person", "noun_suffix_exact_exclusions"); }
  get PERSON_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("PERSON_SUFFIXES", "person", "suffixes"); }
  get HUMAN_COLLECTIVE_NOUNS(): ReadonlySet<string> { return this.cachedSet("HUMAN_COLLECTIVE_NOUNS", "person", "collective_nouns"); }
  get HUMAN_PRONOUN_BASES(): ReadonlySet<string> { return this.cachedSet("HUMAN_PRONOUN_BASES", "person", "pronoun_bases"); }
  get ANIMATE_NOUNS(): ReadonlySet<string> { return this.cachedSet("ANIMATE_NOUNS", "person", "animate_nouns"); }
  get ANIMATE_NOUN_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("ANIMATE_NOUN_SUFFIXES", "person", "animate_noun_suffixes"); }
  get ANIMATE_NOUN_SUFFIX_EXACT_EXCLUSIONS(): ReadonlySet<string> { return this.cachedSet("ANIMATE_NOUN_SUFFIX_EXACT_EXCLUSIONS", "person", "animate_noun_suffix_exact_exclusions"); }
  get PLURAL_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("PLURAL_SUFFIXES", "person", "plural_suffixes"); }
  get DE_MOVEMENT_VERBS(): ReadonlySet<string> { return this.cachedSet("DE_MOVEMENT_VERBS", "particle_de", "movement_verbs"); }
  get NI_NARU_VERBS(): ReadonlySet<string> { return this.cachedSet("NI_NARU_VERBS", "particle_ni", "naru_verbs"); }
  get NI_INSTRUMENTAL_VERBS(): ReadonlySet<string> { return this.cachedSet("NI_INSTRUMENTAL_VERBS", "particle_ni", "instrumental_verbs"); }
  get NI_INSTRUMENTAL_MANNER_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("NI_INSTRUMENTAL_MANNER_SUFFIXES", "particle_ni", "instrumental_manner_suffixes"); }
  get NI_RESULT_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("NI_RESULT_SAHEN_NOUNS", "particle_ni", "result_sahen_nouns"); }
  get NI_ACCUSATIVE_UNIVERSAL(): ReadonlySet<string> { return this.cachedSet("NI_ACCUSATIVE_UNIVERSAL", "particle_ni", "accusative_universal"); }
  get NI_ACCUSATIVE_PERSON(): ReadonlySet<string> { return this.cachedSet("NI_ACCUSATIVE_PERSON", "particle_ni", "accusative_person"); }
  get NI_DIRECTION_NOUNS(): ReadonlySet<string> { return this.cachedSet("NI_DIRECTION_NOUNS", "particle_ni", "direction_nouns"); }
  get NI_DIRECTION_LOCATIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("NI_DIRECTION_LOCATIVE_VERBS", "particle_ni", "direction_locative_verbs"); }
  get NI_STATE_RETURN_VERBS(): ReadonlySet<string> { return this.cachedSet("NI_STATE_RETURN_VERBS", "particle_ni", "state_return_verbs"); }
  get NI_LIMIT_COMPLEMENT_VERBS(): ReadonlySet<string> { return this.cachedSet("NI_LIMIT_COMPLEMENT_VERBS", "particle_ni", "limit_complement_verbs"); }
  get NI_RETURN_STATE_NOUNS(): ReadonlySet<string> { return this.cachedSet("NI_RETURN_STATE_NOUNS", "particle_ni", "return_state_nouns"); }
  get NI_RETURN_STATE_ANIMATE_NOUNS(): ReadonlySet<string> { return this.cachedSet("NI_RETURN_STATE_ANIMATE_NOUNS", "particle_ni", "return_state_animate_nouns"); }
  get NI_IDENTITY_ORIGIN_QUALIFIERS(): ReadonlySet<string> { return this.cachedSet("NI_IDENTITY_ORIGIN_QUALIFIERS", "particle_ni", "identity_origin_qualifiers"); }
  get NI_IDENTITY_FIRST_PERSON(): ReadonlySet<string> { return this.cachedSet("NI_IDENTITY_FIRST_PERSON", "particle_ni", "identity_first_person"); }
  get REFLEXIVE_SELF_NOUNS(): ReadonlySet<string> { return this.cachedSet("REFLEXIVE_SELF_NOUNS", "semantic", "reflexive_self_nouns"); }
  get KEIJOUJI_NA_IDENTITY_TYPE_NOUNS(): ReadonlySet<string> { return this.cachedSet("KEIJOUJI_NA_IDENTITY_TYPE_NOUNS", "keijouji_na", "identity_type_nouns"); }
  get TAME_NON_REASON_TAIL_PARTICLES(): ReadonlySet<string> { return this.cachedSet("TAME_NON_REASON_TAIL_PARTICLES", "tame", "non_reason_tail_particles"); }
  get NO_PREDICATE_PRENOMINAL_GENITIVE_HEADS(): ReadonlySet<string> { return this.cachedSet("NO_PREDICATE_PRENOMINAL_GENITIVE_HEADS", "no_particle", "predicate_prenominal_genitive_heads"); }
  get NO_ATTRIBUTIVE_CAPABLE_HOSTS(): ReadonlySet<string> { return this.cachedSet("NO_ATTRIBUTIVE_CAPABLE_HOSTS", "no_particle", "adnominal_no_attributive_capable_hosts"); }
  get NO_GENITIVE_MODIFIERS(): ReadonlySet<string> { return this.cachedSet("NO_GENITIVE_MODIFIERS", "no_particle", "no_genitive_modifiers"); }
  get NO_IDENTITY_GENITIVE_HEADS(): ReadonlySet<string> { return this.cachedSet("NO_IDENTITY_GENITIVE_HEADS", "no_particle", "identity_genitive_heads"); }
  get NO_PRONOMINAL_NI_RESULT_VERBS(): ReadonlySet<string> { return this.cachedSet("NO_PRONOMINAL_NI_RESULT_VERBS", "no_particle", "pronominal_ni_result_verbs"); }
  get NO_PRONOMINAL_NI_RESULT_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("NO_PRONOMINAL_NI_RESULT_SAHEN_NOUNS", "no_particle", "pronominal_ni_result_sahen_nouns"); }
  get NO_PRONOMINAL_NI_TARGET_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("NO_PRONOMINAL_NI_TARGET_SAHEN_NOUNS", "no_particle", "pronominal_ni_target_sahen_nouns"); }
  get NO_KOTO_DIRECT_OBJECT_VERBS(): ReadonlySet<string> { return this.cachedSet("NO_KOTO_DIRECT_OBJECT_VERBS", "no_particle", "koto_direct_object_verbs"); }
  get SECONDARY_PARTICLE_KOSOADO_DAKE_DEGREE(): ReadonlyMap<string, string> { return this.cached("secondary_particle.kosoado_dake_degree", () => stringMap(this.data, "secondary_particle", "kosoado_dake_degree")); }
  get SECONDARY_PARTICLE_KOSOADO_DAKE_DEGREE_ATTR(): ReadonlyMap<string, string> { return this.cached("secondary_particle.kosoado_dake_degree_attr", () => stringMap(this.data, "secondary_particle", "kosoado_dake_degree_attr")); }
  get SECONDARY_PARTICLE_KOSOADO_DOKORO_SITUATION(): ReadonlyMap<string, string> { return this.cached("secondary_particle.kosoado_dokoro_situation", () => stringMap(this.data, "secondary_particle", "kosoado_dokoro_situation")); }
  get PARALLEL_ACTIVITY_NOUNS(): ReadonlySet<string> { return this.cachedSet("PARALLEL_ACTIVITY_NOUNS", "activity", "parallel_nouns"); }
  get GATERA_ACTIVITY_NOUNS(): ReadonlySet<string> { return this.cachedSet("GATERA_ACTIVITY_NOUNS", "activity", "gatera_nouns"); }
  get TAME_PURPOSE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TAME_PURPOSE_NOUNS", "tame", "purpose_nouns"); }
  get TAME_REASON_NOUNS(): ReadonlySet<string> { return this.cachedSet("TAME_REASON_NOUNS", "tame", "reason_nouns"); }
  get TE_IRU_RESULTATIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_RESULTATIVE_VERBS", "verb", "te_iru_resultative"); }
  get TE_IRU_NEGATIVE_RESULTATIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_NEGATIVE_RESULTATIVE_VERBS", "verb", "te_iru_negative_resultative"); }
  get TE_IRU_MADA_ACTIVE_COMPLETION_TOPIC_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_MADA_ACTIVE_COMPLETION_TOPIC_VERBS", "verb", "te_iru_mada_active_completion_topic_verbs"); }
  get TE_IRU_PASSIVE_RESULTATIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_PASSIVE_RESULTATIVE_VERBS", "verb", "te_iru_passive_resultative"); }
  get TE_IRU_PROGRESSIVE_ACTIVITY_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_PROGRESSIVE_ACTIVITY_VERBS", "verb", "te_iru_progressive_activity"); }
  get TE_IRU_GRADUAL_CHANGE_ADVERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_GRADUAL_CHANGE_ADVERBS", "verb", "te_iru_gradual_change_adverbs"); }
  get TE_IRU_RESULT_COMPLEMENT_HOSTS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_RESULT_COMPLEMENT_HOSTS", "verb", "te_iru_result_complement_hosts"); }
  get TE_IRU_PROGRESSIVE_RESULT_COMPLEMENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_PROGRESSIVE_RESULT_COMPLEMENT_NOUNS", "verb", "te_iru_progressive_result_complement_nouns"); }
  get POSSESSOR_PASSIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("POSSESSOR_PASSIVE_VERBS", "verb", "possessor_passive_verbs"); }
  get CAUSATIVE_PASSIVE_LEXICAL_CAUSATIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("CAUSATIVE_PASSIVE_LEXICAL_CAUSATIVE_VERBS", "verb", "causative_passive_lexical_causative"); }
  get CAUSATIVE_PASSIVE_COERCIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("CAUSATIVE_PASSIVE_COERCIVE_VERBS", "verb", "causative_passive_coercive"); }
  get CAUSATIVE_PASSIVE_NEUTRAL_VERBS(): ReadonlySet<string> { return this.cachedSet("CAUSATIVE_PASSIVE_NEUTRAL_VERBS", "verb", "causative_passive_neutral"); }
  get CAUSATIVE_PASSIVE_NEUTRAL_TRIGGER_VERBS(): ReadonlySet<string> { return this.cachedSet("CAUSATIVE_PASSIVE_NEUTRAL_TRIGGER_VERBS", "verb", "causative_passive_neutral_trigger"); }
  get RARERU_PASSIVE_PREFERRED(): ReadonlySet<string> { return this.cachedSet("RARERU_PASSIVE_PREFERRED", "verb", "rareru_passive_preferred"); }
  get RARERU_NEGATIVE_POTENTIAL_PREFERRED(): ReadonlySet<string> { return this.cachedSet("RARERU_NEGATIVE_POTENTIAL_PREFERRED", "verb", "rareru_negative_potential_preferred"); }
  get POTENTIAL_NEGATIVE_PREFERS_SU_EOPDA(): ReadonlySet<string> { return this.cachedSet("POTENTIAL_NEGATIVE_PREFERS_SU_EOPDA", "verb", "potential_negative_prefers_su_eopda"); }
  get PASSIVE_BADDA_NOUNS(): ReadonlySet<string> { return this.cachedSet("PASSIVE_BADDA_NOUNS", "verb", "passive_badda_nouns"); }
  get ATTRIBUTIVE_FUTURE_CUE_TERMS(): ReadonlySet<string> { return this.cachedSet("ATTRIBUTIVE_FUTURE_CUE_TERMS", "attributive", "future_cue_terms"); }
  get ATTRIBUTIVE_PROSPECTIVE_EVENT_VERBS(): ReadonlySet<string> { return this.cachedSet("ATTRIBUTIVE_PROSPECTIVE_EVENT_VERBS", "attributive", "prospective_event_verbs"); }
  get JP_PRESENT_HEAD_NOUNS(): ReadonlySet<string> { return this.cachedSet("JP_PRESENT_HEAD_NOUNS", "attributive", "jp_present_head_nouns"); }
  get JP_FUTURE_HEAD_NOUNS(): ReadonlySet<string> { return this.cachedSet("JP_FUTURE_HEAD_NOUNS", "attributive", "jp_future_head_nouns"); }
  get JP_VERB_ADNOMINAL_ENDING_OVERRIDES(): ReadonlyMap<string, string> { return this.cached("attributive.jp_verb_ending_overrides", () => stringMap(this.data, "attributive", "jp_verb_ending_overrides")); }
  get KO_VERB_ADNOMINAL_ENDING_OVERRIDES(): ReadonlyMap<string, string> { return this.cached("attributive.ko_verb_ending_overrides", () => stringMap(this.data, "attributive", "ko_verb_ending_overrides")); }
  get JP_OBJECT_ADNOMINAL_ENDING_OVERRIDES(): ReadonlyMap<string, string> { return this.cached("attributive.object_ending_overrides", () => objectAdnominalEndingOverrides(this.data)); }
  get HEAD_NOUN_REQUIRED_COMPLEMENTS(): ReadonlyMap<string, HeadNounRequiredComplement> { return this.cached("attributive.head_noun_required_complements", () => headNounRequiredComplements(this.data)); }
  get TOKA_LISTING_RESUMPTIVE_KIND_DEMONSTRATIVES(): ReadonlySet<string> { return this.cachedSet("TOKA_LISTING_RESUMPTIVE_KIND_DEMONSTRATIVES", "toka_listing", "resumptive_kind_demonstratives"); }
  get DEMONSTRATIVE_ADNOMINAL_PROPOSITION_HOSTS(): LemmaIrregularTable { return this.cached("demonstrative_proposition.adnominal_proposition_hosts", () => lemmaIrregularMap(this.data, "demonstrative_proposition", "adnominal_proposition_hosts", this.cache)); }
  get TOKA_LISTING_ALTERNATIVE_INTRODUCERS(): ReadonlySet<string> { return this.cachedSet("TOKA_LISTING_ALTERNATIVE_INTRODUCERS", "toka_listing", "alternative_introducers"); }
  get DEMONSTRATIVE_ADNOMINALS(): ReadonlySet<string> { return this.cachedSet("DEMONSTRATIVE_ADNOMINALS", "attributive", "demonstrative_adnominals"); }
  get UE_DE_PROCEDURE_NOUNS(): ReadonlySet<string> { return this.cachedSet("UE_DE_PROCEDURE_NOUNS", "formal_written", "ue_de_procedure_nouns"); }
  get UE_DE_DOMAIN_NOUNS(): ReadonlySet<string> { return this.cachedSet("UE_DE_DOMAIN_NOUNS", "formal_written", "ue_de_domain_nouns"); }
  get YOU_ZERO_DIRECTIVE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("YOU_ZERO_DIRECTIVE_PREDICATES", "directive", "you_zero_predicates"); }
  get YOU_NI_QUOTE_DIRECTIVE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("YOU_NI_QUOTE_DIRECTIVE_PREDICATES", "directive", "you_ni_quote_projection_predicates"); }
  get YOU_NI_MANNER_YIELD_PREDICATES(): ReadonlySet<string> { return this.cachedSet("YOU_NI_MANNER_YIELD_PREDICATES", "directive", "you_ni_manner_yield_predicates"); }
  get YOU_NI_SPEECH_MANNER_WIN_FOLLOWERS(): ReadonlySet<string> { return this.cachedSet("YOU_NI_SPEECH_MANNER_WIN_FOLLOWERS", "directive", "you_ni_speech_manner_win_followers"); }
  get YOU_ZERO_PRESSURE_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("YOU_ZERO_PRESSURE_OBJECT_NOUNS", "directive", "you_zero_pressure_object_nouns"); }
  get YOU_ZERO_PRESSURE_VERBS(): ReadonlySet<string> { return this.cachedSet("YOU_ZERO_PRESSURE_VERBS", "directive", "you_zero_pressure_verbs"); }
  get MISERU_APPEARANCE_COMPLEMENTS(): ReadonlySet<string> { return this.cachedSet("MISERU_APPEARANCE_COMPLEMENTS", "miseru", "appearance_complements"); }
  get HONORIFIC_FIRST_PERSON_PRONOUNS(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_FIRST_PERSON_PRONOUNS", "honorific", "first_person_pronouns"); }
  get HONORIFIC_RESPECT_TITLES(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_RESPECT_TITLES", "honorific", "respect_titles"); }
  get HONORIFIC_RESPECT_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_RESPECT_SUFFIXES", "honorific", "respect_suffixes"); }
  get HONORIFIC_NON_HONORIFIC_YOU_SUFFIX_LEXEMES(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_NON_HONORIFIC_YOU_SUFFIX_LEXEMES", "honorific", "non_honorific_you_suffix_lexemes"); }
  get HONORIFIC_NON_HONORIFIC_YOU_READING_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_NON_HONORIFIC_YOU_READING_SUFFIXES", "honorific", "non_honorific_you_reading_suffixes"); }
  get HONORIFIC_SAHEN_LIGHT_VERBS(): ReadonlySet<string> { return this.cachedSet("HONORIFIC_SAHEN_LIGHT_VERBS", "honorific", "sahen_light_verbs"); }
  get HUMBLE_DRIDA_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("HUMBLE_DRIDA_SAHEN_NOUNS", "honorific", "humble_drida_sahen_nouns"); }
  get KOREAN_HONORIFIC_PREDICATE_LEMMAS(): ReadonlyMap<string, string> { return this.cached("honorific.respect_predicate_lemmas", () => stringMap(this.data, "honorific", "respect_predicate_lemmas")); }
  get KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS(): ReadonlySet<string> { return this.cachedSet("KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS", "honorific", "realized_respect_predicate_lemmas"); }
  get DERU_EMERGENCE_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("DERU_EMERGENCE_SUBJECTS", "deru", "emergence_subjects"); }
  get DERU_REVEALED_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("DERU_REVEALED_SUBJECTS", "deru", "revealed_subjects"); }
  get DERU_SURFACE_REVEAL_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("DERU_SURFACE_REVEAL_SUBJECTS", "deru", "surface_reveal_subjects"); }
  get DERU_FRONTING_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("DERU_FRONTING_SUBJECTS", "deru", "fronting_subjects"); }
  get DERU_FOREGROUND_REVEAL_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("DERU_FOREGROUND_REVEAL_SUBJECTS", "deru", "foreground_reveal_subjects"); }
  get DERU_SURFACE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("DERU_SURFACE_PREDICATES", "deru", "surface_predicates"); }
  get SEMANTIC_EMOTION_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_EMOTION_NOUNS", "semantic", "emotion_nouns"); }
  get SEMANTIC_ATTITUDE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_ATTITUDE_NOUNS", "semantic", "attitude_nouns"); }
  get SEMANTIC_EMOTION_ATTITUDE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_EMOTION_ATTITUDE_NOUNS", "semantic", "emotion_attitude_nouns"); }
  get SEMANTIC_PATIENT_RESULT_SAHEN_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_PATIENT_RESULT_SAHEN_NOUNS", "semantic", "patient_result_sahen_nouns"); }
  get SEMANTIC_SENSORY_NOUN_AUDIBLE(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_AUDIBLE", "semantic", "sensory_noun_audible"); }
  get SEMANTIC_SENSORY_NOUN_AUDIBLE_VOICE(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_AUDIBLE_VOICE", "semantic", "sensory_noun_audible_voice"); }
  get SEMANTIC_SENSORY_NOUN_OLFACTORY(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_OLFACTORY", "semantic", "sensory_noun_olfactory"); }
  get SEMANTIC_SENSORY_NOUN_GUSTATORY(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_GUSTATORY", "semantic", "sensory_noun_gustatory"); }
  get SEMANTIC_SENSORY_NOUN_CHILL(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_CHILL", "semantic", "sensory_noun_chill"); }
  get SEMANTIC_SENSORY_NOUN_PRESENCE_SIGN(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_PRESENCE_SIGN", "semantic", "sensory_noun_presence_sign"); }
  get SEMANTIC_SENSORY_NOUN_PREMONITION(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SENSORY_NOUN_PREMONITION", "semantic", "sensory_noun_premonition"); }
  get SEMANTIC_DESIRE_AUX_SUBJECT_VERBS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_DESIRE_AUX_SUBJECT_VERBS", "semantic", "desire_aux_subject_verbs"); }
  get SEMANTIC_ANIMATE_GA_SUBJECT_VERBS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_ANIMATE_GA_SUBJECT_VERBS", "semantic", "animate_ga_subject_verbs"); }
  get SEMANTIC_DESIRE_HOLDER_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_DESIRE_HOLDER_NOUNS", "semantic", "desire_holder_nouns"); }
  get SEMANTIC_DESIRE_PERSON_TARGET_VERBS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_DESIRE_PERSON_TARGET_VERBS", "semantic", "desire_person_target_verbs"); }
  get SEMANTIC_MEDICINE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_MEDICINE_NOUNS", "semantic", "medicine_nouns"); }
  get SEMANTIC_MUSICAL_INSTRUMENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_MUSICAL_INSTRUMENT_NOUNS", "semantic", "musical_instrument_nouns"); }
  get SEMANTIC_MUSIC_PIECE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_MUSIC_PIECE_NOUNS", "semantic", "music_piece_nouns"); }
  get SEMANTIC_PRICEABLE_ITEM_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_PRICEABLE_ITEM_NOUNS", "semantic", "priceable_item_nouns"); }
  get SEMANTIC_BODY_PARTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_BODY_PARTS", "semantic", "body_parts"); }
  get SEMANTIC_POSSESSOR_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_POSSESSOR_OBJECT_NOUNS", "semantic", "possessor_object_nouns"); }
  get SEMANTIC_SECRETION_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SECRETION_NOUNS", "semantic", "secretion_nouns"); }
  get SEMANTIC_PRICE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_PRICE_NOUNS", "semantic", "price_nouns"); }
  get AWASERU_AGGREGATE_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("AWASERU_AGGREGATE_OBJECT_NOUNS", "semantic", "awaseru_aggregate_object_nouns"); }
  get SEMANTIC_PRICE_RELATED_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_PRICE_RELATED_NOUNS", "semantic", "price_related_nouns"); }
  get SEMANTIC_MANIFESTATION_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_MANIFESTATION_NOUNS", "semantic", "manifestation_nouns"); }
  get SEMANTIC_VISUAL_ART_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_VISUAL_ART_OBJECTS", "semantic", "visual_art_objects"); }
  get SEMANTIC_FRAME_ART_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_FRAME_ART_OBJECTS", "semantic", "frame_art_objects"); }
  get SEMANTIC_EMISSION_SIGNAL_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_EMISSION_SIGNAL_OBJECTS", "semantic", "emission_signal_objects"); }
  get SEMANTIC_WEAPON_PROJECTILE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_WEAPON_PROJECTILE_OBJECTS", "semantic", "weapon_projectile_objects"); }
  get SEMANTIC_SKILL_ACTION_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SKILL_ACTION_OBJECTS", "semantic", "skill_action_objects"); }
  get SEMANTIC_SUPPORT_AID_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SUPPORT_AID_OBJECTS", "semantic", "support_aid_objects"); }
  get SEMANTIC_ORDER_DIRECTIVE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_ORDER_DIRECTIVE_OBJECTS", "semantic", "order_directive_objects"); }
  get SEMANTIC_RESERVE_POSITION_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_RESERVE_POSITION_OBJECTS", "semantic", "reserve_position_objects"); }
  get SEMANTIC_POST_ROLE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_POST_ROLE_OBJECTS", "semantic", "post_role_objects"); }
  get SEMANTIC_PUBLIC_EVENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_PUBLIC_EVENT_NOUNS", "semantic", "public_event_nouns"); }
  get SEMANTIC_ARENA_FIELD_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_ARENA_FIELD_NOUNS", "semantic", "arena_field_nouns"); }
  get SEMANTIC_SHAME_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SHAME_NOUNS", "semantic", "shame_nouns"); }
  get SEMANTIC_EXISTENCE_PRESENCE_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_EXISTENCE_PRESENCE_NOUNS", "semantic", "existence_presence_nouns"); }
  get SEMANTIC_DIRECTIONAL_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_DIRECTIONAL_NOUNS", "semantic", "directional_nouns"); }
  get SEMANTIC_NOMINAL_LOCATION_HEADS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_NOMINAL_LOCATION_HEADS", "semantic", "nominal_location_heads"); }
  get SEMANTIC_INVOLUNTARY_REACTION_VERBS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_INVOLUNTARY_REACTION_VERBS", "semantic", "involuntary_reaction_verbs"); }
  get SEMANTIC_SYMPTOM_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_SYMPTOM_NOUNS", "semantic", "symptom_nouns"); }
  get SEMANTIC_DIFFERENTIAL_NOUNS(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_DIFFERENTIAL_NOUNS", "semantic", "differential_nouns"); }
  get SEMANTIC_MEDIA_SOURCES(): ReadonlySet<string> { return this.cachedSet("SEMANTIC_MEDIA_SOURCES", "semantic", "media_sources"); }
  get NIRU_SIMILARITY_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("NIRU_SIMILARITY_SUBJECTS", "niru", "similarity_subjects"); }
  get NIRU_SIMILARITY_COMPARISON_NOUNS(): ReadonlySet<string> { return this.cachedSet("NIRU_SIMILARITY_COMPARISON_NOUNS", "niru", "similarity_comparison_nouns"); }
  get NI_SURU_IDIOM_NOUNS(): ReadonlySet<string> { return this.cachedSet("NI_SURU_IDIOM_NOUNS", "particle_ni", "suru_idiom_nouns"); }
  get PERSON_PRONOUNS(): ReadonlySet<string> { return this.cachedSet("PERSON_PRONOUNS", "person", "pronouns"); }
  get SECOND_PERSON_PRONOUNS(): ReadonlySet<string> { return this.cachedSet("SECOND_PERSON_PRONOUNS", "person", "second_person_pronouns"); }
  get PERSON_COUNT_COUNTERS(): ReadonlySet<string> { return this.cachedSet("PERSON_COUNT_COUNTERS", "person", "count_counters"); }
  get COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS(): ReadonlySet<string> { return this.cachedSet("COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS", "copula_de_predicate", "extra_host_nouns"); }
  get ROLE_NOUNS(): ReadonlySet<string> { return this.cachedSet("ROLE_NOUNS", "role", "nouns"); }
  get FOOD_NOUNS(): ReadonlySet<string> { return this.cachedSet("FOOD_NOUNS", "food", "nouns"); }
  get DRINK_NOUNS(): ReadonlySet<string> { return this.cachedSet("DRINK_NOUNS", "food", "drink_nouns"); }
  get DE_CAUSAL_STATE(): ReadonlySet<string> { return this.cachedSet("DE_CAUSAL_STATE", "particle_de", "causal_state"); }
  get PLACE_NOUNS(): ReadonlySet<string> { return this.cachedSet("PLACE_NOUNS", "place", "nouns"); }
  get PLACE_NOUN_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("PLACE_NOUN_SUFFIXES", "place", "noun_suffixes"); }
  get PLACE_SCOPE_SUFFIX_HEADS(): ReadonlySet<string> { return this.cachedSet("PLACE_SCOPE_SUFFIX_HEADS", "place", "scope_suffix_heads"); }
  get PLACE_NOUN_SUFFIX_EXACT_EXCLUSIONS(): ReadonlySet<string> { return this.cachedSet("PLACE_NOUN_SUFFIX_EXACT_EXCLUSIONS", "place", "noun_suffix_exact_exclusions"); }
  get INSTRUMENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("INSTRUMENT_NOUNS", "instrument", "nouns"); }
  get APPOSITION_REFERENT_FIXED_PRONOUNS(): ReadonlySet<string> { return this.cachedSet("APPOSITION_REFERENT_FIXED_PRONOUNS", "nominal_frame", "apposition_referent_fixed_pronouns"); }
  get AFTER_DE_TEMPORAL_HEADS(): ReadonlySet<string> { return this.cachedSet("AFTER_DE_TEMPORAL_HEADS", "nominal_frame", "single_particle_after_de_heads"); }
  get TEMPORAL_NOUNS(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_NOUNS", "temporal", "nouns"); }
  get TEMPORAL_RANGE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_RANGE_NOUNS", "temporal", "range_nouns"); }
  get TEMPORAL_COUNTER_NOUNS(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_COUNTER_NOUNS", "temporal", "counter_nouns"); }
  get TEMPORAL_SUFFIX_NOUNS(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_SUFFIX_NOUNS", "temporal", "suffix_nouns"); }
  get TEMPORAL_CONDITION_NI_HEADS(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_CONDITION_NI_HEADS", "temporal", "condition_ni_heads"); }
  get TEMPORAL_YORI_SOURCE_EVENT_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TEMPORAL_YORI_SOURCE_EVENT_PREDICATES", "temporal", "yori_source_event_predicates"); }
  get UCHI_TEMPORAL_HEADS(): ReadonlySet<string> { return this.cachedSet("UCHI_TEMPORAL_HEADS", "uchi", "temporal_heads"); }
  get UCHI_UNAWARE_VERBS(): ReadonlySet<string> { return this.cachedSet("UCHI_UNAWARE_VERBS", "uchi", "unaware_verbs"); }
  get UCHI_STATUS_NOUNS(): ReadonlySet<string> { return this.cachedSet("UCHI_STATUS_NOUNS", "uchi", "status_nouns"); }
  get NO_KEEP_QUANTITY_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("NO_KEEP_QUANTITY_SUFFIXES", "quantity", "no_keep_suffixes"); }
  get QUANTITY_INDEFINITE_HEADS(): ReadonlySet<string> { return this.cachedSet("QUANTITY_INDEFINITE_HEADS", "quantity", "indefinite_heads"); }
  get NO_NONI_PURPOSE_EVALUATION_HEADS(): ReadonlySet<string> { return this.cachedSet("NO_NONI_PURPOSE_EVALUATION_HEADS", "no_particle", "noni_purpose_evaluation_heads"); }
  get NO_NONI_QUANTITY_APPROXIMATION_MARKERS(): ReadonlySet<string> { return this.cachedSet("NO_NONI_QUANTITY_APPROXIMATION_MARKERS", "no_particle", "noni_quantity_approximation_markers"); }
  get NO_NONI_PURPOSE_EVALUATION_PREDICATE_HEADS(): ReadonlySet<string> { return this.cachedSet("NO_NONI_PURPOSE_EVALUATION_PREDICATE_HEADS", "no_particle", "noni_purpose_evaluation_predicate_heads"); }
  get NO_NONI_PURPOSE_RESOURCE_NOUNS(): ReadonlySet<string> { return this.cachedSet("NO_NONI_PURPOSE_RESOURCE_NOUNS", "no_particle", "noni_purpose_resource_nouns"); }
  get NO_NONI_RESOURCE_EXISTENCE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("NO_NONI_RESOURCE_EXISTENCE_PREDICATES", "no_particle", "noni_resource_existence_predicates"); }
  get NO_SAHEN_POTENTIAL_LIGHT_VERBS(): ReadonlySet<string> { return this.cachedSet("NO_SAHEN_POTENTIAL_LIGHT_VERBS", "no_particle", "sahen_potential_light_verbs"); }
  get NO_RELATIVE_SUBJECT_BLOCKING_SPATIAL_HEADS(): ReadonlySet<string> { return this.cachedSet("NO_RELATIVE_SUBJECT_BLOCKING_SPATIAL_HEADS", "no_particle", "relative_subject_blocking_spatial_heads"); }
  get TOORI_PLACE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TOORI_PLACE_NOUNS", "reference", "toori_place_nouns"); }
  get HITO_OTHER_OBJECT_PREDICATES(): ReadonlySet<string> { return this.cachedSet("HITO_OTHER_OBJECT_PREDICATES", "hito_context", "other_object_predicates"); }
  get HITO_OTHER_COMPARISON_PREDICATES(): ReadonlySet<string> { return this.cachedSet("HITO_OTHER_COMPARISON_PREDICATES", "hito_context", "other_comparison_predicates"); }
  get SPEECH_KAKERU_PREDICATES(): ReadonlySet<string> { return this.cachedSet("SPEECH_KAKERU_PREDICATES", "formula", "speech_kakeru_predicates"); }
  get KI_CARE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_CARE_PREDICATES", "formula", "ki_care_predicates"); }
  get KI_ATTENTION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_ATTENTION_PREDICATES", "formula", "ki_attention_predicates"); }
  get KI_AWARENESS_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_AWARENESS_PREDICATES", "formula", "ki_awareness_predicates"); }
  get KI_PREFERENCE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_PREFERENCE_PREDICATES", "formula", "ki_preference_predicates"); }
  get KI_TENSION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_TENSION_PREDICATES", "formula", "ki_tension_predicates"); }
  get KI_SENSE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_SENSE_PREDICATES", "formula", "ki_sense_predicates"); }
  get KI_DRAIN_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_DRAIN_PREDICATES", "formula", "ki_drain_predicates"); }
  get KI_RELIEF_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_RELIEF_PREDICATES", "formula", "ki_relief_predicates"); }
  get KI_MOOD_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_MOOD_PREDICATES", "formula", "ki_mood_predicates"); }
  get KI_SATISFACTION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_SATISFACTION_PREDICATES", "formula", "ki_satisfaction_predicates"); }
  get KI_WORRY_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_WORRY_PREDICATES", "formula", "ki_worry_predicates"); }
  get KI_ATTENTION_KEEP_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_ATTENTION_KEEP_PREDICATES", "formula", "ki_attention_keep_predicates"); }
  get KI_DISLIKE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KI_DISLIKE_PREDICATES", "formula", "ki_dislike_predicates"); }
  get KAKERU_PRESSURE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KAKERU_PRESSURE_OBJECTS", "formula", "kakeru_pressure_objects"); }
  get KAKERU_SAUCE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KAKERU_SAUCE_OBJECTS", "formula", "kakeru_sauce_objects"); }
  get KAKERU_COVER_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KAKERU_COVER_OBJECTS", "formula", "kakeru_cover_objects"); }
  get KAKERU_WEAR_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KAKERU_WEAR_OBJECTS", "formula", "kakeru_wear_objects"); }
  get KAKERU_WEIGHT_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KAKERU_WEIGHT_OBJECTS", "formula", "kakeru_weight_objects"); }
  get NIKU_BODY_PREDICATES(): ReadonlySet<string> { return this.cachedSet("NIKU_BODY_PREDICATES", "formula", "niku_body_predicates"); }
  get KIRU_DISCONNECT_OBJECTS(): ReadonlySet<string> { return this.cachedSet("KIRU_DISCONNECT_OBJECTS", "formula", "kiru_disconnect_objects"); }
  get SURU_SAMDA_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SURU_SAMDA_OBJECTS", "formula", "suru_samda_objects"); }
  get SURU_MANDEULDA_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SURU_MANDEULDA_OBJECTS", "formula", "suru_mandeulda_objects"); }
  get SURU_SAMDA_TITLE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("SURU_SAMDA_TITLE_OBJECTS", "formula", "suru_samda_title_objects"); }
  get LIGHT_VERB_SPEECH_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("LIGHT_VERB_SPEECH_OBJECT_NOUNS", "formula", "light_verb_speech_object_nouns"); }
  get HEIGHT_ADJECTIVES(): ReadonlySet<string> { return this.cachedSet("HEIGHT_ADJECTIVES", "formula", "height_adjectives"); }
  get KOKOROZUMORI_PREPARE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("KOKOROZUMORI_PREPARE_PREDICATES", "formula", "kokorozumori_prepare_predicates"); }
  get FOREHEAD_CONTEXT_HEADS(): ReadonlySet<string> { return this.cachedSet("FOREHEAD_CONTEXT_HEADS", "formula", "forehead_context_heads"); }
  get FRAME_CONTEXT_HEADS(): ReadonlySet<string> { return this.cachedSet("FRAME_CONTEXT_HEADS", "formula", "frame_context_heads"); }
  get TRANSPORT_SERVICE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TRANSPORT_SERVICE_NOUNS", "formula", "transport_service_nouns"); }
  get TRANSPORT_OPERATION_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TRANSPORT_OPERATION_PREDICATES", "formula", "transport_operation_predicates"); }
  get MATOMARU_GROUP_NOUNS(): ReadonlySet<string> { return this.cachedSet("MATOMARU_GROUP_NOUNS", "matomaru", "group_nouns"); }
  get MATOMARU_CONCLUDED_NOUNS(): ReadonlySet<string> { return this.cachedSet("MATOMARU_CONCLUDED_NOUNS", "matomaru", "concluded_nouns"); }
  get MATOMARU_AGREED_TERMS_NOUNS(): ReadonlySet<string> { return this.cachedSet("MATOMARU_AGREED_TERMS_NOUNS", "matomaru", "agreed_terms_nouns"); }
  get MATOMARU_SELECTION_SUBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("MATOMARU_SELECTION_SUBJECT_NOUNS", "matomaru", "selection_subject_nouns"); }
  get TALK_COMPANION_NOUNS(): ReadonlySet<string> { return this.cachedSet("TALK_COMPANION_NOUNS", "talk", "companion_nouns"); }
  get TALK_TOPIC_NOUNS(): ReadonlySet<string> { return this.cachedSet("TALK_TOPIC_NOUNS", "talk", "topic_nouns"); }
  get TALK_PLACE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TALK_PLACE_NOUNS", "talk", "place_nouns"); }
  get KIKU_QUESTION_OBJECT_NOUNS(): ReadonlySet<string> { return this.cachedSet("KIKU_QUESTION_OBJECT_NOUNS", "kiku", "question_object_nouns"); }
  get KIKU_QUESTION_DETAIL_NOUNS(): ReadonlySet<string> { return this.cachedSet("KIKU_QUESTION_DETAIL_NOUNS", "kiku", "question_detail_nouns"); }
  get NAOSU_REPAIR_OBJECTS(): ReadonlySet<string> { return this.cachedSet("NAOSU_REPAIR_OBJECTS", "naosu", "repair_objects"); }
  get NAOSU_EDIT_OBJECTS(): ReadonlySet<string> { return this.cachedSet("NAOSU_EDIT_OBJECTS", "naosu", "edit_objects"); }
  get AU_SUFFER_NOUNS(): ReadonlySet<string> { return this.cachedSet("AU_SUFFER_NOUNS", "au", "suffer_nouns"); }
  get AU_EXPERIENCE_NOUNS(): ReadonlySet<string> { return this.cachedSet("AU_EXPERIENCE_NOUNS", "au", "experience_nouns"); }
  get AU_WEATHER_HIT_NOUNS(): ReadonlySet<string> { return this.cachedSet("AU_WEATHER_HIT_NOUNS", "au", "weather_hit_nouns"); }
  get PREMIUM_VALUE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("PREMIUM_VALUE_PREDICATES", "premium", "value_predicates"); }
  get TAME_REASON_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TAME_REASON_PREDICATES", "tame", "reason_predicates"); }
  get TAME_REASON_SURU_NOUNS(): ReadonlySet<string> { return this.cachedSet("TAME_REASON_SURU_NOUNS", "tame", "reason_suru_nouns"); }
  get MONO_MODAL_CARRIER_FORMS(): ReadonlySet<string> { return this.cachedSet("MONO_MODAL_CARRIER_FORMS", "mono_modal", "carrier_forms"); }
  get MONO_MODAL_DEFAULT_READING_CARRIER_FORMS(): ReadonlySet<string> { return this.cachedSet("MONO_MODAL_DEFAULT_READING_CARRIER_FORMS", "mono_modal", "default_reading_carrier_forms"); }
  get MONO_MODAL_FREQUENCY_ADVERBS(): ReadonlySet<string> { return this.cachedSet("MONO_MODAL_FREQUENCY_ADVERBS", "mono_modal", "frequency_adverbs"); }
  get MONO_MODAL_ADMIRATIVE_ADVERBS(): ReadonlySet<string> { return this.cachedSet("MONO_MODAL_ADMIRATIVE_ADVERBS", "mono_modal", "admirative_adverbs"); }
  get MONO_MODAL_EVALUATIVE_FREQUENCY_ADVERBS(): ReadonlySet<string> { return this.cachedSet("MONO_MODAL_EVALUATIVE_FREQUENCY_ADVERBS", "mono_modal", "evaluative_frequency_adverbs"); }
  get TOKORO_REPORT_SOURCE_SUFFIXES(): ReadonlySet<string> { return this.cachedSet("TOKORO_REPORT_SOURCE_SUFFIXES", "tokoro", "report_source_suffixes"); }
  get TOKORO_RESULT_EVIDENCE_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_RESULT_EVIDENCE_AFTER_FORMS", "tokoro", "result_evidence_after_forms"); }
  get TOKORO_SITUATION_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_SITUATION_AFTER_FORMS", "tokoro", "situation_after_forms"); }
  get TOKORO_TEMPORAL_DE_PREV_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_TEMPORAL_DE_PREV_FORMS", "tokoro", "temporal_de_prev_forms"); }
  get TOKORO_CONCESSIVE_BEFORE_SURFACES(): ReadonlySet<string> { return this.cachedSet("TOKORO_CONCESSIVE_BEFORE_SURFACES", "tokoro", "concessive_before_surfaces"); }
  get TOKORO_CONCESSIVE_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_CONCESSIVE_AFTER_FORMS", "tokoro", "concessive_after_forms"); }
  get TOKORO_PROGRESS_NI_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_PROGRESS_NI_AFTER_FORMS", "tokoro", "progress_ni_after_forms"); }
  get TOKORO_PROGRESS_WO_OBSERVATION_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_PROGRESS_WO_OBSERVATION_FORMS", "tokoro", "progress_wo_observation_forms"); }
  get TOKORO_PROGRESS_WO_INTERRUPTION_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_PROGRESS_WO_INTERRUPTION_FORMS", "tokoro", "progress_wo_interruption_forms"); }
  get TOKORO_TRAIT_GA_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_TRAIT_GA_AFTER_FORMS", "tokoro", "trait_ga_after_forms"); }
  get TOKORO_ARGUMENT_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_ARGUMENT_FORMS", "tokoro", "argument_forms"); }
  get TOKORO_ALMOST_BEFORE_SURFACES(): ReadonlySet<string> { return this.cachedSet("TOKORO_ALMOST_BEFORE_SURFACES", "tokoro", "almost_before_surfaces"); }
  get TOKORO_ABOUT_TO_BEFORE_SURFACES(): ReadonlySet<string> { return this.cachedSet("TOKORO_ABOUT_TO_BEFORE_SURFACES", "tokoro", "about_to_before_surfaces"); }
  get TOKORO_TEIRU_COPULA_TIME_CUES(): ReadonlySet<string> { return this.cachedSet("TOKORO_TEIRU_COPULA_TIME_CUES", "tokoro", "teiru_copula_time_cues"); }
  get TOKORO_TEIRU_COPULA_PLACE_LIKE_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_TEIRU_COPULA_PLACE_LIKE_FORMS", "tokoro", "teiru_copula_place_like_forms"); }
  get TOKORO_TEIRU_COPULA_PROGRESS_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_TEIRU_COPULA_PROGRESS_FORMS", "tokoro", "teiru_copula_progress_forms"); }
  get TOKORO_ORIGIN_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_ORIGIN_AFTER_FORMS", "tokoro", "origin_after_forms"); }
  get TOKORO_LIMIT_AFTER_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_LIMIT_AFTER_FORMS", "tokoro", "limit_after_forms"); }
  get TOKORO_STAGE_LEVEL_ADJECTIVE_FORMS(): ReadonlySet<string> { return this.cachedSet("TOKORO_STAGE_LEVEL_ADJECTIVE_FORMS", "tokoro", "stage_level_adjective_forms"); }
  get KOTO_DEKIRU_FOCUS_PARTICLES(): ReadonlySet<string> { return this.cachedSet("KOTO_DEKIRU_FOCUS_PARTICLES", "koto_dekiru", "focus_particles"); }
  get ZERO_HEAD_PROPOSITION_HEAD_OPERATORS(): ReadonlySet<string> { return this.cachedSet("ZERO_HEAD_PROPOSITION_HEAD_OPERATORS", "zero_head_elided_host", "proposition_head_operators"); }
  get ZERO_HEAD_PREDICATE_HEAD_OPERATORS(): ReadonlySet<string> { return this.cachedSet("ZERO_HEAD_PREDICATE_HEAD_OPERATORS", "zero_head_elided_host", "predicate_head_operators"); }
  get ZERO_HEAD_EVENT_HEAD_OPERATORS(): ReadonlySet<string> { return this.cachedSet("ZERO_HEAD_EVENT_HEAD_OPERATORS", "zero_head_elided_host", "event_head_operators"); }
  get ZERO_HEAD_CHAIN_OPERATORS(): ReadonlySet<string> { return this.cachedSet("ZERO_HEAD_CHAIN_OPERATORS", "zero_head_elided_host", "chain_operators"); }
  get ZERO_HEAD_STANDALONE_SFP_EFFECTS(): ReadonlySet<string> { return this.cachedSet("ZERO_HEAD_STANDALONE_SFP_EFFECTS", "zero_head_elided_host", "standalone_sfp_effects"); }
  get SPEECH_ACT_DEMO_ANAPHOR_ANCHORS(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_DEMO_ANAPHOR_ANCHORS", "speech_act", "demo_anaphor_anchors"); }
  get SPEECH_ACT_RECEIPT_INTERJECTIONS(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_RECEIPT_INTERJECTIONS", "speech_act", "receipt_interjections"); }
  get SPEECH_ACT_TE_IISASHI_REPORT_HOST_VERBS(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_TE_IISASHI_REPORT_HOST_VERBS", "speech_act", "te_iisashi_report_host_verbs"); }
  get SPEECH_ACT_TE_IISASHI_NONVOLITIONAL_VERBS(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_TE_IISASHI_NONVOLITIONAL_VERBS", "speech_act", "te_iisashi_nonvolitional_verbs"); }
  get SPEECH_ACT_TE_IISASHI_STATIVE_OPERATOR_FORMS(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_TE_IISASHI_STATIVE_OPERATOR_FORMS", "speech_act", "te_iisashi_stative_operator_forms"); }
  get SPEECH_ACT_REQUEST_PERFORMATIVE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("SPEECH_ACT_REQUEST_PERFORMATIVE_PREDICATES", "speech_act", "request_performative_predicates"); }
  get JANAI_CONFIRMATION_ABSORBABLE_FOLLOWER_SFP(): ReadonlySet<string> { return this.cachedSet("JANAI_CONFIRMATION_ABSORBABLE_FOLLOWER_SFP", "janai_confirmation", "absorbable_follower_sfp"); }
  get KANSAI_POLITE_MASSE_SE_SURFACES(): ReadonlySet<string> { return this.cachedSet("KANSAI_POLITE_MASSE_SE_SURFACES", "kansai_polite_masse", "se_surfaces"); }
  get KANSAI_POLITE_MASSE_MASU_MISTAG_LEMMAS(): ReadonlySet<string> { return this.cachedSet("KANSAI_POLITE_MASSE_MASU_MISTAG_LEMMAS", "kansai_polite_masse", "masu_mistag_lemmas"); }
  get YASU_POLITE_MASU_SURFACES(): ReadonlyMap<string, string> { return this.cached("yasu_polite.masu_surfaces", () => stringMap(this.data, "yasu_polite", "masu_surfaces")); }
  get BENEFACTIVE_TEE_TE_RETAG_HOST_LEMMAS(): ReadonlySet<string> { return this.cachedSet("BENEFACTIVE_TEE_TE_RETAG_HOST_LEMMAS", "benefactive_tee_te_retag", "host_lemmas"); }
  get BENEFACTIVE_TEE_TE_RETAG_DESIRE_LEMMAS(): ReadonlySet<string> { return this.cachedSet("BENEFACTIVE_TEE_TE_RETAG_DESIRE_LEMMAS", "benefactive_tee_te_retag", "desire_lemmas"); }
  get DESIRE_TEE_RETAG_MISTAGGED_SURFACES(): ReadonlySet<string> { return this.cachedSet("DESIRE_TEE_RETAG_MISTAGGED_SURFACES", "desire_tee_retag", "mistagged_surfaces"); }
  get PROLONGED_PARTICLE_CANONICAL_SUBTYPES(): ReadonlySet<string> {
    return this.cached(
      "prolonged_particle_canonicalization.particle_subtypes",
      () => this.optionalSet("prolonged_particle_canonicalization", "particle_subtypes") ?? new Set<string>()
    );
  }

  get PROLONGED_REDUCTION_CONTRACT(): ProlongedReductionContract {
    return this.cached("PROLONGED_REDUCTION_CONTRACT", () => {
      const names = this.optionalSet("prolonged_reduction_relaxation", "dependent_headword_pos0")
        ?? new Set<string>();
      for (const name of names) {
        if (!isDependentWordPos0Name(name)) {
          throw new Error(
            `non-dependent pos0 '${name}' in lookup_tables ` +
            `prolonged_reduction_relaxation.dependent_headword_pos0: 부속어(助詞·助動詞)만 열 수 있다`
          );
        }
      }
      const inflectClasses =
        this.optionalSet("prolonged_reduction_relaxation", "candidate_inflect_classes")
        ?? new Set<string>();
      for (const name of inflectClasses) {
        if (!isInflectClassName(name)) {
          throw new Error(
            `invalid inflect class '${name}' in lookup_tables ` +
            `prolonged_reduction_relaxation.candidate_inflect_classes`
          );
        }
      }
      return {
        dependentHeadwordPos0: new Set(names),
        candidateInflectClasses: new Set(inflectClasses)
      };
    });
  }
  get BUNGO_VOLITIONAL_N_LICENSOR_SURFACES(): ReadonlySet<string> { return this.cachedSet("BUNGO_VOLITIONAL_N_LICENSOR_SURFACES", "bungo_volitional_n", "licensor_surfaces"); }
  get TERMINAL_ROLE_SFP_BY_SURFACE(): ReadonlyMap<string, string> { return this.cached("terminal_role.sfp_by_surface", () => stringMap(this.data, "terminal_role", "sfp_by_surface")); }
  get TERMINAL_ROLE_FOLLOWERS(): ReadonlySet<string> { return this.cachedSet("TERMINAL_ROLE_FOLLOWERS", "terminal_role", "followers"); }
  get TERMINAL_ROLE_HOST_SKIP(): ReadonlySet<string> { return this.cachedSet("TERMINAL_ROLE_HOST_SKIP", "terminal_role", "host_skip"); }
  get TERMINAL_ROLE_PREV_DISALLOWED(): ReadonlySet<string> { return this.cachedSet("TERMINAL_ROLE_PREV_DISALLOWED", "terminal_role", "prev_disallowed"); }
  get TERMINAL_ROLE_LENGTHENERS(): ReadonlySet<string> { return this.cachedSet("TERMINAL_ROLE_LENGTHENERS", "terminal_role", "lengtheners"); }
  get TERMINAL_ROLE_WEAK_HOST_ENDINGS(): ReadonlySet<string> { return this.cachedSet("TERMINAL_ROLE_WEAK_HOST_ENDINGS", "terminal_role", "weak_host_endings"); }
  get COLLOQUIAL_NONI_TERMINAL_FOLLOWERS(): ReadonlySet<string> { return this.cachedSet("COLLOQUIAL_NONI_TERMINAL_FOLLOWERS", "colloquial_noni", "terminal_followers"); }
  get PROLONGED_ORTHOGRAPHY_RESTORATION_SURFACES(): ReadonlySet<string> { return this.cachedSet("PROLONGED_ORTHOGRAPHY_RESTORATION_SURFACES", "prolonged_orthography_restoration", "surfaces"); }
  get ADVERB_COPULA_DEICTIC_EXCLUSIONS(): ReadonlySet<string> { return this.cachedSet("ADVERB_COPULA_DEICTIC_EXCLUSIONS", "adverb_copula", "deictic_exclusions"); }
  get ADVERBIAL_MODIFIER_MANNER_NOUNS(): ReadonlySet<string> { return this.cachedSet("ADVERBIAL_MODIFIER_MANNER_NOUNS", "adverbial_modifier", "manner_nouns"); }
  get ADVERBIAL_MODIFIER_BARE_KEIJOUJI_HOSTS(): ReadonlySet<string> { return this.cachedSet("ADVERBIAL_MODIFIER_BARE_KEIJOUJI_HOSTS", "adverbial_modifier", "bare_keijouji_hosts"); }
  get ADVERBIAL_MODIFIER_RENTAI_DEGREE_ADJECTIVE_HOSTS(): ReadonlySet<string> { return this.cachedSet("ADVERBIAL_MODIFIER_RENTAI_DEGREE_ADJECTIVE_HOSTS", "adverbial_modifier", "rentai_degree_adjective_hosts"); }
  get NOMINAL_COORDINATION_CASE_PARTICLES(): ReadonlySet<string> { return this.cachedSet("NOMINAL_COORDINATION_CASE_PARTICLES", "grammar_boundary", "nominal_coordination_case_particles"); }
  get NOMINAL_COORDINATION_CONNECTIVE_LEMMAS(): ReadonlySet<string> { return this.cachedSet("NOMINAL_COORDINATION_CONNECTIVE_LEMMAS", "grammar_boundary", "nominal_coordination_connective_lemmas"); }
  get NOMINAL_COORDINATION_SYMBOL_SURFACES(): ReadonlySet<string> { return this.cachedSet("NOMINAL_COORDINATION_SYMBOL_SURFACES", "grammar_boundary", "nominal_coordination_symbol_surfaces"); }
  get GRAMMAR_BOUNDARY_DECORATIVE_TERMINAL_SYMBOL_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_DECORATIVE_TERMINAL_SYMBOL_SURFACES", "grammar_boundary", "decorative_terminal_symbol_surfaces"); }
  get GRAMMAR_BOUNDARY_SYMMETRIC_QUOTE_TOGGLE_SURFACES(): ReadonlySet<string> { return this.cachedSet("GRAMMAR_BOUNDARY_SYMMETRIC_QUOTE_TOGGLE_SURFACES", "grammar_boundary", "symmetric_quote_toggle_surfaces"); }
  get NEGATION_INABILITY_VERBS(): ReadonlySet<string> { return this.cachedSet("NEGATION_INABILITY_VERBS", "verb", "negation_inability_verbs"); }
  get COGNITIVE_ATTAINMENT_VERBS(): ReadonlySet<string> { return this.cachedSet("COGNITIVE_ATTAINMENT_VERBS", "verb", "cognitive_attainment_verbs"); }
  get TE_IRU_NEGATIVE_INABILITY_EXTRA_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_NEGATIVE_INABILITY_EXTRA_VERBS", "verb", "te_iru_negative_inability_extra"); }
  get TE_IRU_NEGATIVE_INABILITY_VERBS(): ReadonlySet<string> { return new Set([...this.COGNITIVE_ATTAINMENT_VERBS, ...this.TE_IRU_NEGATIVE_INABILITY_EXTRA_VERBS]); }
  get TE_IRU_NEGATIVE_LONG_NEGATION_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IRU_NEGATIVE_LONG_NEGATION_VERBS", "verb", "te_iru_negative_long_negation"); }
  get LONG_NEGATION_PREFERRED_KOREAN_LEMMAS(): ReadonlySet<string> { return this.cachedSet("LONG_NEGATION_PREFERRED_KOREAN_LEMMAS", "verb", "long_negation_preferred_korean_lemmas"); }
  get FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS(): ReadonlySet<string> { return this.cachedSet("FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS", "korean_predicate", "formal_plain_adjective_like_lemmas"); }
  get FORMAL_PLAIN_VERB_LIKE_KOREAN_LEMMAS(): ReadonlySet<string> { return this.cachedSet("FORMAL_PLAIN_VERB_LIKE_KOREAN_LEMMAS", "korean_predicate", "formal_plain_verb_like_lemmas"); }
  get SUPPLETIVE_AFFIRMATIVE_KOREAN_LEMMAS(): ReadonlyMap<string, string> { return this.cached("korean_predicate.suppletive_affirmative_lemmas", () => stringMap(this.data, "korean_predicate", "suppletive_affirmative_lemmas")); }
  get COPULA_FUSED_BOUND_NOUNS(): ReadonlyMap<string, string> { return this.cached("korean_predicate.copula_fused_bound_nouns", () => stringMap(this.data, "korean_predicate", "copula_fused_bound_nouns")); }
  get TE_ARU_SUBJECT_RESULTATIVE_LEMMAS(): LemmaIrregularTable { return this.cached("verb.te_aru_subject_resultative_lemmas", () => lemmaIrregularMap(this.data, "verb", "te_aru_subject_resultative_lemmas", this.cache)); }
  get TE_ARU_OBJECT_PREPARED_LEMMAS(): LemmaIrregularTable { return this.cached("verb.te_aru_object_prepared_lemmas", () => lemmaIrregularMap(this.data, "verb", "te_aru_object_prepared_lemmas", this.cache)); }
  get TE_HOSHII_LEXICALIZED_CAUSATIVE_LEMMAS(): LemmaIrregularTable { return this.cached("verb.te_hoshii_lexicalized_causative_lemmas", () => lemmaIrregularMap(this.data, "verb", "te_hoshii_lexicalized_causative_lemmas", this.cache)); }
  get TE_HOSHII_MAIN_LEMMA_OVERRIDES(): LemmaIrregularTable { return this.cached("verb.te_hoshii_main_lemma_overrides", () => lemmaIrregularMap(this.data, "verb", "te_hoshii_main_lemma_overrides", this.cache)); }
  get DEKIRU_POSSIBILITY_STATE_BARE_COMPLETION(): ReadonlySet<string> { return this.cachedSet("DEKIRU_POSSIBILITY_STATE_BARE_COMPLETION", "verb", "dekiru_possibility_state_bare_completion"); }
  get TE_MOVEMENT_PATH_SOURCE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MOVEMENT_PATH_SOURCE_VERBS", "verb", "te_movement_path_source"); }
  get TE_MOVEMENT_PATH_SOURCE_PARTICLES(): ReadonlySet<string> { return this.cachedSet("TE_MOVEMENT_PATH_SOURCE_PARTICLES", "verb", "te_movement_path_source_particles"); }
  get TE_MOVEMENT_STRONG_BARE_PAIRS(): ReadonlySet<string> { return this.cached("verb.te_movement_strong_bare_pairs", () => pairLookupSet(this.data, "verb", "te_movement_strong_bare_pairs")); }
  get TE_MOVEMENT_STRONG_BARE_DROP_KOREAN_LEMMAS(): ReadonlySet<string> { return this.cachedSet("TE_MOVEMENT_STRONG_BARE_DROP_KOREAN_LEMMAS", "verb", "te_movement_strong_bare_drop_korean_lemmas"); }
  get TE_KURU_EMBEDDED_DIRECTIONAL_LEMMAS(): LemmaIrregularTable { return this.cached("verb.te_kuru_embedded_directional_lemmas", () => lemmaIrregularMap(this.data, "verb", "te_kuru_embedded_directional_lemmas", this.cache)); }
  get TE_IKU_EMBEDDED_DIRECTIONAL_LEMMAS(): LemmaIrregularTable { return this.cached("verb.te_iku_embedded_directional_lemmas", () => lemmaIrregularMap(this.data, "verb", "te_iku_embedded_directional_lemmas", this.cache)); }
  get TE_KURU_ROUND_TRIP_LEMMAS(): RoundTripLemmaTable { return this.cached("verb.te_kuru_round_trip_lemmas", () => roundTripLemmaMap(this.data, "verb", "te_kuru_round_trip_lemmas", this.cache)); }
  get TE_KURU_YARU_SOURCE_LEMMAS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_SOURCE_LEMMAS", "verb", "te_kuru_yaru_source_lemmas"); }
  get TE_KURU_YARU_ARRIVAL_PARTICLES(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_ARRIVAL_PARTICLES", "verb", "te_kuru_yaru_arrival_particles"); }
  get TE_KURU_YARU_CONTINUATION_CUES(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_CONTINUATION_CUES", "verb", "te_kuru_yaru_continuation_cues"); }
  get TE_KURU_YARU_COMPOSITIONAL_ATTRIBUTIVE_HEADS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_COMPOSITIONAL_ATTRIBUTIVE_HEADS", "verb", "te_kuru_yaru_compositional_attributive_heads"); }
  get TE_KURU_YARU_COMPOSITIONAL_SUBJECT_REFERENTS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_COMPOSITIONAL_SUBJECT_REFERENTS", "verb", "te_kuru_yaru_compositional_subject_referents"); }
  get TE_KURU_YARU_COMPOSITIONAL_DE_REFERENTS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_COMPOSITIONAL_DE_REFERENTS", "verb", "te_kuru_yaru_compositional_de_referents"); }
  get TE_KURU_YARU_NONARRIVAL_NI_REFERENTS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_NONARRIVAL_NI_REFERENTS", "verb", "te_kuru_yaru_nonarrival_ni_referents"); }
  get TE_KURU_YARU_NONARRIVAL_KARA_REFERENTS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_NONARRIVAL_KARA_REFERENTS", "verb", "te_kuru_yaru_nonarrival_kara_referents"); }
  get TE_KURU_YARU_NONARRIVAL_MADE_REFERENTS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_YARU_NONARRIVAL_MADE_REFERENTS", "verb", "te_kuru_yaru_nonarrival_made_referents"); }
  get TE_MOVEMENT_ACQUISITION_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MOVEMENT_ACQUISITION_VERBS", "verb", "te_movement_acquisition"); }
  get TE_MEANS_SELF_LOCOMOTION_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MEANS_SELF_LOCOMOTION_VERBS", "verb", "te_means_self_locomotion"); }
  get TE_MEANS_VEHICLE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MEANS_VEHICLE_VERBS", "verb", "te_means_vehicle"); }
  get TE_MEANS_CARRY_STATE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MEANS_CARRY_STATE_VERBS", "verb", "te_means_carry_state"); }
  get TE_RENYOU_STATE_CHANGE_CAUSE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("TE_RENYOU_STATE_CHANGE_CAUSE_PREDICATES", "te_connective", "renyou_state_change_cause_predicates"); }
  get TE_CONTRASTIVE_PARALLEL_TOPIC_PARTICLES(): ReadonlySet<string> { return this.cachedSet("TE_CONTRASTIVE_PARALLEL_TOPIC_PARTICLES", "te_connective", "contrastive_parallel_topic_particles"); }
  get TE_ATTENDANT_COACTION_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_ATTENDANT_COACTION_VERBS", "verb", "te_attendant_coaction_verbs"); }
  get TE_ADVERBIAL_LEXICALIZED_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_ADVERBIAL_LEXICALIZED_VERBS", "verb", "te_adverbial_lexicalized_verbs"); }
  get TE_KURU_CARRIED_STATE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_KURU_CARRIED_STATE_VERBS", "verb", "te_kuru_carried_state"); }
  get TE_IKU_GRADUAL_CHANGE_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_IKU_GRADUAL_CHANGE_VERBS", "verb", "te_iku_gradual_change"); }
  get TE_MAWARU_ROTATION_MANNER_VETO_VERBS(): ReadonlySet<string> { return this.cachedSet("TE_MAWARU_ROTATION_MANNER_VETO_VERBS", "verb", "te_mawaru_rotation_manner_veto"); }
  get PATIENT_RESULT_AGENTIVE_AUXILIARIES(): ReadonlySet<string> { return this.cachedSet("PATIENT_RESULT_AGENTIVE_AUXILIARIES", "verb", "patient_result_agentive_auxiliaries"); }
  get TE_ARU_EVALUATION_HEADS(): ReadonlySet<string> { return this.cachedSet("TE_ARU_EVALUATION_HEADS", "verb", "te_aru_evaluation_heads"); }
  get RENYOU_AUX_VERBS(): ReadonlySet<string> { return this.cachedSet("RENYOU_AUX_VERBS", "verb", "renyou_aux"); }
  get RARERU_WEAK_PASSIVE_CANDIDATES(): ReadonlySet<string> { return this.cachedSet("RARERU_WEAK_PASSIVE_CANDIDATES", "verb", "rareru_weak_passive_candidates"); }
  get RARERU_TE_IRU_POTENTIAL_PREFERRED(): ReadonlySet<string> { return this.cachedSet("RARERU_TE_IRU_POTENTIAL_PREFERRED", "verb", "rareru_meta_te_iru_potential"); }
  get RARERU_META_ABILITY_CUE(): ReadonlySet<string> { return this.cachedSet("RARERU_META_ABILITY_CUE", "verb", "rareru_meta_ability_cue"); }
  get RARERU_META_TRANSITIVE(): ReadonlySet<string> { return this.cachedSet("RARERU_META_TRANSITIVE", "verb", "rareru_meta_transitive"); }
  get RARERU_HONORIFIC_SUBJECT_INTRANSITIVE(): ReadonlySet<string> { return this.cachedSet("RARERU_HONORIFIC_SUBJECT_INTRANSITIVE", "verb", "rareru_honorific_subject_intransitive"); }
  get RARERU_META_ABILITY_MODAL_CUES(): ReadonlySet<string> { return this.cachedSet("RARERU_META_ABILITY_MODAL_CUES", "verb", "rareru_meta_ability_modal_cues"); }
  get RARERU_META_VOLITIONAL_MANNER_MODAL_CUES(): ReadonlySet<string> { return this.cachedSet("RARERU_META_VOLITIONAL_MANNER_MODAL_CUES", "verb", "rareru_meta_volitional_manner_modal_cues"); }
  get RARERU_META_CLASSIFICATION_TARGET_PASSIVE(): ReadonlySet<string> { return this.cachedSet("RARERU_META_CLASSIFICATION_TARGET_PASSIVE", "verb", "rareru_meta_classification_target_passive"); }
  get RARERU_KARA_SOURCE_VERBS(): ReadonlySet<string> { return this.cachedSet("RARERU_KARA_SOURCE_VERBS", "verb", "rareru_kara_source_verbs"); }
  get ADVERSATIVE_PASSIVE_TRANSITIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("ADVERSATIVE_PASSIVE_TRANSITIVE_VERBS", "verb", "adversative_passive_transitive_verbs"); }
  get ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS", "verb", "adversative_passive_intransitive_verbs"); }
  get ADVERSATIVE_PASSIVE_LOCATION_SOURCE_NOUNS(): ReadonlySet<string> { return this.cachedSet("ADVERSATIVE_PASSIVE_LOCATION_SOURCE_NOUNS", "verb", "adversative_passive_location_source_nouns"); }
  get DEPARTURE_PASSIVE_VERBS(): ReadonlySet<string> { return this.cachedSet("DEPARTURE_PASSIVE_VERBS", "verb", "departure_passive_verbs"); }
  get ADVERSATIVE_PASSIVE_WEATHER_BASE_LEMMAS(): LemmaIrregularTable { return this.cached("verb.adversative_passive_weather_base_lemmas", () => lemmaIrregularMap(this.data, "verb", "adversative_passive_weather_base_lemmas", this.cache)); }
  get NARERU_FAMILIARIZE_NOUNS(): ReadonlySet<string> { return this.cachedSet("NARERU_FAMILIARIZE_NOUNS", "verb", "nareru_familiarize_nouns"); }
  get WATASU_TRANSFER_OBJECTS(): ReadonlySet<string> { return this.cachedSet("WATASU_TRANSFER_OBJECTS", "watasu", "transfer_objects"); }
  get WATASU_BRIDGE_OBJECTS(): ReadonlySet<string> { return this.cachedSet("WATASU_BRIDGE_OBJECTS", "watasu", "bridge_objects"); }
  get DASU_SPEECH_TOPIC_OBJECTS(): ReadonlySet<string> { return this.cachedSet("DASU_SPEECH_TOPIC_OBJECTS", "dasu", "speech_topic_objects"); }
  get DASU_CARVING_MATERIAL_OBJECTS(): ReadonlySet<string> { return this.cachedSet("DASU_CARVING_MATERIAL_OBJECTS", "dasu", "carving_material_objects"); }
  get DASU_MONEY_WITHDRAW_OBJECTS(): ReadonlySet<string> { return this.cachedSet("DASU_MONEY_WITHDRAW_OBJECTS", "dasu", "money_withdraw_objects"); }
  get DASU_FAREWELL_PERSON_OBJECTS(): ReadonlySet<string> { return this.cachedSet("DASU_FAREWELL_PERSON_OBJECTS", "dasu", "farewell_person_objects"); }
  get DASU_DISPATCH_DESTINATIONS(): ReadonlySet<string> { return this.cachedSet("DASU_DISPATCH_DESTINATIONS", "dasu", "dispatch_destinations"); }
  get TANOMU_CALL_OBJECTS(): ReadonlySet<string> { return this.cachedSet("TANOMU_CALL_OBJECTS", "tanomu", "call_objects"); }
  get TSUKU_SEAT_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_SEAT_NOUNS", "tsuku", "seat_nouns"); }
  get TSUKU_SLEEP_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_SLEEP_NOUNS", "tsuku", "sleep_nouns"); }
  get TSUKU_ASSIGNMENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_ASSIGNMENT_NOUNS", "tsuku", "assignment_nouns"); }
  get TSUKU_ASCENT_PATH_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_ASCENT_PATH_NOUNS", "tsuku", "ascent_path_nouns"); }
  get TSUKU_OFFICE_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_OFFICE_NOUNS", "tsuku", "office_nouns"); }
  get TSUKU_WORK_START_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_WORK_START_NOUNS", "tsuku", "work_start_nouns"); }
  get TSUKU_WORK_ENGAGEMENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("TSUKU_WORK_ENGAGEMENT_NOUNS", "tsuku", "work_engagement_nouns"); }
  get KAYOU_ROUTE_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("KAYOU_ROUTE_SUBJECTS", "kayou", "route_subjects"); }
  get KAYOU_FLOW_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("KAYOU_FLOW_SUBJECTS", "kayou", "flow_subjects"); }
  get KAYOU_COMMUNICATION_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("KAYOU_COMMUNICATION_SUBJECTS", "kayou", "communication_subjects"); }
  get KAYOU_ATTENDANCE_DESTINATIONS(): ReadonlySet<string> { return this.cachedSet("KAYOU_ATTENDANCE_DESTINATIONS", "kayou", "attendance_destinations"); }
  get KANAU_FITNESS_TARGETS(): ReadonlySet<string> { return this.cachedSet("KANAU_FITNESS_TARGETS", "kanau", "fitness_targets"); }
  get KANAU_RIVAL_TARGETS(): ReadonlySet<string> { return this.cachedSet("KANAU_RIVAL_TARGETS", "kanau", "rival_targets"); }
  get TODOKU_REACH_SUBJECTS(): ReadonlySet<string> { return this.cachedSet("TODOKU_REACH_SUBJECTS", "todoku", "reach_subjects"); }
  get INTEREST_PREDICATES(): ReadonlySet<string> { return this.cachedSet("INTEREST_PREDICATES", "interest", "predicates"); }
  get UNDERWEAR_VIEW_PREDICATES(): ReadonlySet<string> { return this.cachedSet("UNDERWEAR_VIEW_PREDICATES", "underwear", "view_predicates"); }
  get UNDERWEAR_EXPOSURE_PREDICATES(): ReadonlySet<string> { return this.cachedSet("UNDERWEAR_EXPOSURE_PREDICATES", "underwear", "exposure_predicates"); }
  get UNDERWEAR_SPECIFIC_MODIFIERS(): ReadonlySet<string> { return this.cachedSet("UNDERWEAR_SPECIFIC_MODIFIERS", "underwear", "specific_modifiers"); }
  get PANTS_STRICT_MODIFIERS(): ReadonlySet<string> { return this.cachedSet("PANTS_STRICT_MODIFIERS", "pants", "strict_modifiers"); }
  get MISERU_EXHIBIT_OBJECTS(): ReadonlySet<string> { return this.cachedSet("MISERU_EXHIBIT_OBJECTS", "miseru", "exhibit_objects"); }
  get GANO_NO_NP_CLOSING_SECONDARY_PARTICLES(): ReadonlySet<string> { return this.cachedSet("GANO_NO_NP_CLOSING_SECONDARY_PARTICLES", "gano_no", "np_closing_secondary_particles"); }
  get GANO_NO_ABILITY_ADJUNCT_HEADS(): ReadonlySet<string> { return this.cachedSet("GANO_NO_ABILITY_ADJUNCT_HEADS", "gano_no", "ability_adjunct_heads"); }
  get GANO_NO_ABILITY_AGENT_NOUNS(): ReadonlySet<string> { return this.cachedSet("GANO_NO_ABILITY_AGENT_NOUNS", "gano_no", "ability_agent_nouns"); }
  get GANO_NO_HEAD_SUBJECT_PROPERTY_VERBS(): ReadonlySet<string> { return this.cachedSet("GANO_NO_HEAD_SUBJECT_PROPERTY_VERBS", "gano_no", "head_subject_property_verbs"); }
  get GANO_NO_SUBJECT_ADJECTIVE_ALLOWLIST(): ReadonlySet<string> { return this.cachedSet("GANO_NO_SUBJECT_ADJECTIVE_ALLOWLIST", "gano_no", "subject_adjective_allowlist"); }
  get GANO_NO_SUBJECT_ADJECTIVE_PAIRS(): ReadonlySet<string> { return this.cached("gano_no.subject_adjective_pairs", () => pairLookupSet(this.data, "gano_no", "subject_adjective_pairs")); }

  private buildNamedRegistry(): Map<string, ReadonlySet<string>> {
    return new Map<string, ReadonlySet<string>>([
      ["interrogative_adverbial_forms", this.INTERROGATIVE_ADVERBIAL_FORMS],
      ["interrogative_pronominal_forms", this.INTERROGATIVE_PRONOMINAL_FORMS],
      ["interrogative_prenominal_forms", this.INTERROGATIVE_PRENOMINAL_FORMS],
      ["interrogative_nominal_forms", this.INTERROGATIVE_NOMINAL_FORMS],
      ["interrogative_quantity_forms", this.INTERROGATIVE_QUANTITY_FORMS],
      ["interrogative_amount_forms", this.INTERROGATIVE_AMOUNT_FORMS],
      ["interrogative_indefinite_forms", this.INTERROGATIVE_INDEFINITE_FORMS],
      ["interrogative_counter_forms", this.INTERROGATIVE_COUNTER_FORMS],
      ["interrogative_concessive_adverbial_forms", this.INTERROGATIVE_CONCESSIVE_ADVERBIAL_FORMS],
      ["gano_no_subject_stative_verbs", this.set("gano_no", "subject_stative_verbs")],
      ["gano_no_subject_stative_verbs_nonindependent_only", this.set("gano_no", "subject_stative_verbs_nonindependent_only")],
      ["gano_no_np_closing_secondary_particles", this.GANO_NO_NP_CLOSING_SECONDARY_PARTICLES],
      ["gano_no_subject_adjective_allowlist", this.GANO_NO_SUBJECT_ADJECTIVE_ALLOWLIST],
      ["janai_confirmation_absorbable_follower_sfp", this.JANAI_CONFIRMATION_ABSORBABLE_FOLLOWER_SFP],
      ["kansai_polite_masse_se_surfaces", this.KANSAI_POLITE_MASSE_SE_SURFACES],
      ["kansai_polite_masse_masu_mistag_lemmas", this.KANSAI_POLITE_MASSE_MASU_MISTAG_LEMMAS],
      ["benefactive_tee_te_retag_host_lemmas", this.BENEFACTIVE_TEE_TE_RETAG_HOST_LEMMAS],
      ["benefactive_tee_te_retag_desire_lemmas", this.BENEFACTIVE_TEE_TE_RETAG_DESIRE_LEMMAS],
      ["desire_tee_retag_mistagged_surfaces", this.DESIRE_TEE_RETAG_MISTAGGED_SURFACES],
      ["interrogative_nominal_prefixes", this.INTERROGATIVE_NOMINAL_PREFIXES],
      ["person_nouns", this.PERSON_NOUNS],
      ["person_pronouns", this.PERSON_PRONOUNS],
      ["person_pronoun_bases", this.HUMAN_PRONOUN_BASES],
      ["person_count_counters", this.PERSON_COUNT_COUNTERS],
      ["person_animate_nouns", this.ANIMATE_NOUNS],
      ["copula_de_predicate_extra_host_nouns", this.COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS],
      ["place_nouns", this.PLACE_NOUNS],
      ["place_scope_suffix_heads", this.PLACE_SCOPE_SUFFIX_HEADS],
      ["temporal_nouns", this.TEMPORAL_NOUNS],
      ["temporal_counter_nouns", this.TEMPORAL_COUNTER_NOUNS],
      ["au_experience_nouns", this.AU_EXPERIENCE_NOUNS],
      ["au_suffer_nouns", this.AU_SUFFER_NOUNS],
      ["au_weather_hit_nouns", this.AU_WEATHER_HIT_NOUNS],
      ["dekiru_ability_nouns", this.DEKIRU_ABILITY_NOUNS],
      ["dekiru_possibility_nouns", this.DEKIRU_POSSIBILITY_NOUNS],
      ["dekiru_completion_strong_nouns", this.DEKIRU_COMPLETION_STRONG_NOUNS],
      ["deru_emergence_subjects", this.DERU_EMERGENCE_SUBJECTS],
      ["deru_foreground_reveal_subjects", this.DERU_FOREGROUND_REVEAL_SUBJECTS],
      ["deru_fronting_subjects", this.DERU_FRONTING_SUBJECTS],
      ["deru_revealed_subjects", this.DERU_REVEALED_SUBJECTS],
      ["deru_surface_predicates", this.DERU_SURFACE_PREDICATES],
      ["deru_surface_reveal_subjects", this.DERU_SURFACE_REVEAL_SUBJECTS],
      ["dekiru_completion_do_nouns", this.DEKIRU_COMPLETION_DO_NOUNS],
      ["dekiru_completion_ambiguous_nouns", this.DEKIRU_COMPLETION_AMBIGUOUS_NOUNS],
      ["dekiru_emergence_nouns", this.DEKIRU_EMERGENCE_NOUNS],
      ["doumo_emphasis_heads", this.DOUMO_EMPHASIS_HEADS],
      ["food_nouns", this.FOOD_NOUNS],
      ["drink_nouns", this.DRINK_NOUNS],
      ["forehead_context_heads", this.FOREHEAD_CONTEXT_HEADS],
      ["frame_context_heads", this.FRAME_CONTEXT_HEADS],
      ["height_adjectives", this.HEIGHT_ADJECTIVES],
      ["ki_attention_predicates", this.KI_ATTENTION_PREDICATES],
      ["ki_attention_keep_predicates", this.KI_ATTENTION_KEEP_PREDICATES],
      ["kamo_shirenai_lemmas", KAMO_SHIRENAI_LEMMAS],
      ["kudasaru_forms", this.KUDASARU_FORMS],
      ["ki_awareness_predicates", this.KI_AWARENESS_PREDICATES],
      ["ki_care_predicates", this.KI_CARE_PREDICATES],
      ["ki_dislike_predicates", this.KI_DISLIKE_PREDICATES],
      ["ki_drain_predicates", this.KI_DRAIN_PREDICATES],
      ["ki_mood_predicates", this.KI_MOOD_PREDICATES],
      ["ki_preference_predicates", this.KI_PREFERENCE_PREDICATES],
      ["ki_relief_predicates", this.KI_RELIEF_PREDICATES],
      ["ki_sense_predicates", this.KI_SENSE_PREDICATES],
      ["ki_satisfaction_predicates", this.KI_SATISFACTION_PREDICATES],
      ["ki_tension_predicates", this.KI_TENSION_PREDICATES],
      ["ki_worry_predicates", this.KI_WORRY_PREDICATES],
      ["kakeru_cover_objects", this.KAKERU_COVER_OBJECTS],
      ["kakeru_duration_object_nouns", this.KAKERU_DURATION_OBJECT_NOUNS],
      ["kakeru_pressure_objects", this.KAKERU_PRESSURE_OBJECTS],
      ["kakeru_sauce_objects", this.KAKERU_SAUCE_OBJECTS],
      ["kakeru_wear_objects", this.KAKERU_WEAR_OBJECTS],
      ["kakeru_weight_objects", this.KAKERU_WEIGHT_OBJECTS],
      ["niku_body_predicates", this.NIKU_BODY_PREDICATES],
      ["kiru_disconnect_objects", this.KIRU_DISCONNECT_OBJECTS],
      ["suru_samda_objects", this.SURU_SAMDA_OBJECTS],
      ["suru_mandeulda_objects", this.SURU_MANDEULDA_OBJECTS],
      ["suru_samda_title_objects", this.SURU_SAMDA_TITLE_OBJECTS],
      ["kanau_fitness_targets", this.KANAU_FITNESS_TARGETS],
      ["kanau_rival_targets", this.KANAU_RIVAL_TARGETS],
      ["kayou_communication_subjects", this.KAYOU_COMMUNICATION_SUBJECTS],
      ["kayou_attendance_destinations", this.KAYOU_ATTENDANCE_DESTINATIONS],
      ["kayou_flow_subjects", this.KAYOU_FLOW_SUBJECTS],
      ["kayou_route_subjects", this.KAYOU_ROUTE_SUBJECTS],
      ["kiku_question_detail_nouns", this.KIKU_QUESTION_DETAIL_NOUNS],
      ["kiku_question_object_nouns", this.KIKU_QUESTION_OBJECT_NOUNS],
      ["naosu_edit_objects", this.NAOSU_EDIT_OBJECTS],
      ["naosu_repair_objects", this.NAOSU_REPAIR_OBJECTS],
      ["kokorozumori_prepare_predicates", this.KOKOROZUMORI_PREPARE_PREDICATES],
      ["matomaru_agreed_terms_nouns", this.MATOMARU_AGREED_TERMS_NOUNS],
      ["matomaru_concluded_nouns", this.MATOMARU_CONCLUDED_NOUNS],
      ["matomaru_group_nouns", this.MATOMARU_GROUP_NOUNS],
      ["matomaru_selection_subject_nouns", this.MATOMARU_SELECTION_SUBJECT_NOUNS],
      ["miseru_exhibit_objects", this.MISERU_EXHIBIT_OBJECTS],
      ["niru_similarity_comparison_nouns", this.NIRU_SIMILARITY_COMPARISON_NOUNS],
      ["niru_similarity_subjects", this.NIRU_SIMILARITY_SUBJECTS],
      ["premium_value_predicates", this.PREMIUM_VALUE_PREDICATES],
      ["semantic_arena_field_nouns", this.SEMANTIC_ARENA_FIELD_NOUNS],
      ["semantic_attitude_nouns", this.SEMANTIC_ATTITUDE_NOUNS],
      ["semantic_body_parts", this.SEMANTIC_BODY_PARTS],
      ["semantic_desire_aux_subject_verbs", this.SEMANTIC_DESIRE_AUX_SUBJECT_VERBS],
      ["semantic_desire_holder_nouns", this.SEMANTIC_DESIRE_HOLDER_NOUNS],
      ["semantic_desire_person_target_verbs", this.SEMANTIC_DESIRE_PERSON_TARGET_VERBS],
      ["semantic_differential_nouns", this.SEMANTIC_DIFFERENTIAL_NOUNS],
      ["semantic_directional_nouns", this.SEMANTIC_DIRECTIONAL_NOUNS],
      ["semantic_emission_signal_objects", this.SEMANTIC_EMISSION_SIGNAL_OBJECTS],
      ["semantic_emotion_attitude_nouns", this.SEMANTIC_EMOTION_ATTITUDE_NOUNS],
      ["semantic_emotion_nouns", this.SEMANTIC_EMOTION_NOUNS],
      ["semantic_existence_presence_nouns", this.SEMANTIC_EXISTENCE_PRESENCE_NOUNS],
      ["semantic_frame_art_objects", this.SEMANTIC_FRAME_ART_OBJECTS],
      ["semantic_involuntary_reaction_verbs", this.SEMANTIC_INVOLUNTARY_REACTION_VERBS],
      ["semantic_manifestation_nouns", this.SEMANTIC_MANIFESTATION_NOUNS],
      ["semantic_media_sources", this.SEMANTIC_MEDIA_SOURCES],
      ["semantic_medicine_nouns", this.SEMANTIC_MEDICINE_NOUNS],
      ["semantic_music_piece_nouns", this.SEMANTIC_MUSIC_PIECE_NOUNS],
      ["semantic_musical_instrument_nouns", this.SEMANTIC_MUSICAL_INSTRUMENT_NOUNS],
      ["semantic_order_directive_objects", this.SEMANTIC_ORDER_DIRECTIVE_OBJECTS],
      ["semantic_post_role_objects", this.SEMANTIC_POST_ROLE_OBJECTS],
      ["semantic_price_nouns", this.SEMANTIC_PRICE_NOUNS],
      ["awaseru_aggregate_object_nouns", this.AWASERU_AGGREGATE_OBJECT_NOUNS],
      ["semantic_priceable_item_nouns", this.SEMANTIC_PRICEABLE_ITEM_NOUNS],
      ["semantic_price_related_nouns", this.SEMANTIC_PRICE_RELATED_NOUNS],
      ["semantic_public_event_nouns", this.SEMANTIC_PUBLIC_EVENT_NOUNS],
      ["semantic_reserve_position_objects", this.SEMANTIC_RESERVE_POSITION_OBJECTS],
      ["semantic_secretion_nouns", this.SEMANTIC_SECRETION_NOUNS],
      ["sensory_noun_audible", this.SEMANTIC_SENSORY_NOUN_AUDIBLE],
      ["sensory_noun_audible_voice", this.SEMANTIC_SENSORY_NOUN_AUDIBLE_VOICE],
      ["sensory_noun_chill", this.SEMANTIC_SENSORY_NOUN_CHILL],
      ["sensory_noun_gustatory", this.SEMANTIC_SENSORY_NOUN_GUSTATORY],
      ["sensory_noun_olfactory", this.SEMANTIC_SENSORY_NOUN_OLFACTORY],
      ["sensory_noun_presence_sign", this.SEMANTIC_SENSORY_NOUN_PRESENCE_SIGN],
      ["sensory_noun_premonition", this.SEMANTIC_SENSORY_NOUN_PREMONITION],
      ["semantic_shame_nouns", this.SEMANTIC_SHAME_NOUNS],
      ["semantic_skill_action_objects", this.SEMANTIC_SKILL_ACTION_OBJECTS],
      ["semantic_support_aid_objects", this.SEMANTIC_SUPPORT_AID_OBJECTS],
      ["semantic_symptom_nouns", this.SEMANTIC_SYMPTOM_NOUNS],
      ["semantic_visual_art_objects", this.SEMANTIC_VISUAL_ART_OBJECTS],
      ["semantic_weapon_projectile_objects", this.SEMANTIC_WEAPON_PROJECTILE_OBJECTS],
      ["speech_kakeru_predicates", this.SPEECH_KAKERU_PREDICATES],
      ["tanomu_call_objects", this.TANOMU_CALL_OBJECTS],
      ["hito_other_object_predicates", this.HITO_OTHER_OBJECT_PREDICATES],
      ["hito_other_comparison_predicates", this.HITO_OTHER_COMPARISON_PREDICATES],
      ["interest_predicates", this.INTEREST_PREDICATES],
      ["toori_place_nouns", this.TOORI_PLACE_NOUNS],
      ["transport_operation_predicates", this.TRANSPORT_OPERATION_PREDICATES],
      ["transport_service_nouns", this.TRANSPORT_SERVICE_NOUNS],
      ["underwear_view_predicates", this.UNDERWEAR_VIEW_PREDICATES],
      ["underwear_exposure_predicates", this.UNDERWEAR_EXPOSURE_PREDICATES],
      ["underwear_specific_modifiers", this.UNDERWEAR_SPECIFIC_MODIFIERS],
      ["pants_strict_modifiers", this.PANTS_STRICT_MODIFIERS],
      ["talk_companion_nouns", this.TALK_COMPANION_NOUNS],
      ["talk_topic_nouns", this.TALK_TOPIC_NOUNS],
      ["talk_place_nouns", this.TALK_PLACE_NOUNS],
      ["todoku_reach_subjects", this.TODOKU_REACH_SUBJECTS],
      ["tsuku_ascent_path_nouns", this.TSUKU_ASCENT_PATH_NOUNS],
      ["tsuku_assignment_nouns", this.TSUKU_ASSIGNMENT_NOUNS],
      ["tsuku_office_nouns", this.TSUKU_OFFICE_NOUNS],
      ["tsuku_seat_nouns", this.TSUKU_SEAT_NOUNS],
      ["tsuku_sleep_nouns", this.TSUKU_SLEEP_NOUNS],
      ["tsuku_work_engagement_nouns", this.TSUKU_WORK_ENGAGEMENT_NOUNS],
      ["tsuku_work_start_nouns", this.TSUKU_WORK_START_NOUNS],
      ["watasu_bridge_objects", this.WATASU_BRIDGE_OBJECTS],
      ["watasu_transfer_objects", this.WATASU_TRANSFER_OBJECTS],
      ["dasu_speech_topic_objects", this.DASU_SPEECH_TOPIC_OBJECTS],
      ["dasu_carving_material_objects", this.DASU_CARVING_MATERIAL_OBJECTS],
      ["dasu_money_withdraw_objects", this.DASU_MONEY_WITHDRAW_OBJECTS],
      ["dasu_farewell_person_objects", this.DASU_FAREWELL_PERSON_OBJECTS],
      ["dasu_dispatch_destinations", this.DASU_DISPATCH_DESTINATIONS],
      ["body_ashi_leg_predicates", this.set("body", "ashi_leg_predicates")],
      ["locale_jimoto_hometown_predicates", this.set("locale", "jimoto_hometown_predicates")],
      ["nominal_frame_niyotte_variation_predicates", this.set("nominal_frame", "niyotte_variation_predicates")],
      ["nominal_frame_niyotte_depending_condition_heads", this.set("nominal_frame", "niyotte_depending_condition_heads")],
      ["nominal_frame_standpoint_conclusion_heads", this.set("nominal_frame", "standpoint_conclusion_heads")],
      ["nominal_frame_niooji_response_nouns", this.set("nominal_frame", "niooji_response_nouns")],
      ["nominal_frame_ue_de_procedure_heads", this.UE_DE_PROCEDURE_NOUNS],
      ["nominal_frame_ue_de_domain_heads", this.UE_DE_DOMAIN_NOUNS],
      ["nominal_frame_parallel_activity_heads", this.PARALLEL_ACTIVITY_NOUNS],
      ["nominal_frame_gatera_activity_heads", this.GATERA_ACTIVITY_NOUNS],
      ["nominal_frame_single_particle_de_superlative_scope_heads", this.set("nominal_frame", "single_particle_de_superlative_scope_heads")],
      ["nominal_frame_towa_difference_predicates", this.set("nominal_frame", "towa_difference_predicates")],
      ["nominal_frame_towa_relational_nouns", this.set("nominal_frame", "towa_relational_nouns")],
      ["nominal_frame_towa_definition_predicates", this.set("nominal_frame", "towa_definition_predicates")],
      ["nominal_frame_towa_reciprocal_predicates", this.set("nominal_frame", "towa_reciprocal_predicates")],
      ["nominal_frame_towa_quote_focus_predicates", lookupSetFromValues(new Set([
        ...this.set("nominal_frame", "towa_quote_focus_predicates"),
        ...this.SPEECH_VERBS
      ]))],
      ["nominal_frame_no_mono_hou_heads", this.set("nominal_frame", "no_mono_hou_heads")],
      ["nominal_frame_no_hou_following_heads", this.set("nominal_frame", "no_hou_following_heads")],
      ["quote_attributive_cohortative_heads", this.QUOTE_ATTRIBUTIVE_COHORTATIVE_HEADS],
      ["quote_attributive_bare_carrier_utterance_content_heads", this.set("quote_attributive", "bare_carrier_utterance_content_heads")],
      ["quote_attributive_bare_carrier_volitional_quote_content_heads", this.set("quote_attributive", "bare_carrier_volitional_quote_content_heads")],
      ["quote_attributive_bare_carrier_volitional_intent_content_heads", this.set("quote_attributive", "bare_carrier_volitional_intent_content_heads")],
      ["particle_ni_naru_verbs", this.NI_NARU_VERBS],
      ["nominal_frame_single_particle_cause_heads", this.set("nominal_frame", "single_particle_cause_heads")],
      ["nominal_frame_single_particle_after_de_heads", this.set("nominal_frame", "single_particle_after_de_heads")],
      ["nominal_frame_single_particle_de_case_adverbial_heads", this.set("nominal_frame", "single_particle_de_case_adverbial_heads")],
      ["nominal_frame_single_particle_toki_heads", this.set("nominal_frame", "single_particle_toki_heads")],
      ["nominal_frame_single_particle_temporal_condition_ni_heads", this.set("nominal_frame", "single_particle_temporal_condition_ni_heads")],
      ["nominal_frame_single_particle_front_direction_ni_heads", this.set("nominal_frame", "single_particle_front_direction_ni_heads")],
      ["nominal_frame_single_particle_front_direction_ni_predicates", this.set("nominal_frame", "single_particle_front_direction_ni_predicates")],
      ["nominal_frame_single_particle_adverbial_ni_ro_heads", this.set("nominal_frame", "single_particle_adverbial_ni_ro_heads")],
      ["nominal_frame_single_particle_ni_result_block_heads", this.set("nominal_frame", "single_particle_ni_result_block_heads")],
      ["nominal_frame_single_particle_ordinal_ni_heads", this.set("nominal_frame", "single_particle_ordinal_ni_heads")],
      ["nominal_frame_nitsuki_topic_heads", this.set("nominal_frame", "nitsuki_topic_heads")],
      ["nominal_frame_nitsuki_verb_idiom_hosts", this.set("nominal_frame", "nitsuki_verb_idiom_hosts")],
      ["nominal_frame_exemplar_enumeration_inclusive_markers", this.set("nominal_frame", "exemplar_enumeration_inclusive_markers")],
      ["nominal_frame_single_particle_demo_indefinite_heads", this.set("nominal_frame", "single_particle_demo_indefinite_heads")],
      ["nominal_frame_single_particle_demo_indefinite_modifiers", this.set("nominal_frame", "single_particle_demo_indefinite_modifiers")],
      ["nominal_frame_single_particle_demo_minimum_adverb_heads", this.set("nominal_frame", "single_particle_demo_minimum_adverb_heads")],
      ["nominal_frame_single_particle_ka_partitive_pair_heads", this.set("nominal_frame", "single_particle_ka_partitive_pair_heads")],
      ["nominal_frame_single_particle_ka_partitive_one_heads", this.set("nominal_frame", "single_particle_ka_partitive_one_heads")],
      ["nominal_frame_wo_mochimashite_closing_heads", this.set("nominal_frame", "wo_mochimashite_closing_heads")],
      ["nominal_frame_wo_mochimashite_closure_predicates", this.set("nominal_frame", "wo_mochimashite_closure_predicates")],
      ["nominal_frame_phrase_owner_self_adverbial_de_heads", this.set("nominal_frame", "phrase_owner_self_adverbial_de_heads")],
      ["nominal_frame_phrase_owner_self_adverbial_repair_predicates", this.set("nominal_frame", "phrase_owner_self_adverbial_repair_predicates")],
      ["nominal_frame_external_auxiliary_predicate_tail_forms", this.set("nominal_frame", "external_auxiliary_predicate_tail_forms")],
      ["nominal_frame_predicate_nominal_taishi_content_predicates", this.set("nominal_frame", "predicate_nominal_taishi_content_predicates")],
      ["particle_de_movement_verbs", this.DE_MOVEMENT_VERBS],
      ["particle_ni_direction_nouns", this.NI_DIRECTION_NOUNS],
      ["particle_ni_direction_locative_verbs", this.NI_DIRECTION_LOCATIVE_VERBS],
      ["particle_ni_instrumental_verbs", this.NI_INSTRUMENTAL_VERBS],
      ["particle_ni_result_sahen_nouns", this.NI_RESULT_SAHEN_NOUNS],
      ["particle_ni_accusative_universal", this.NI_ACCUSATIVE_UNIVERSAL],
      ["particle_ni_accusative_person", this.NI_ACCUSATIVE_PERSON],
      ["particle_ni_suru_idiom_nouns", this.NI_SURU_IDIOM_NOUNS],
      ["particle_ni_state_return_verbs", this.NI_STATE_RETURN_VERBS],
      ["particle_ni_limit_complement_verbs", this.NI_LIMIT_COMPLEMENT_VERBS],
      ["particle_ni_return_state_nouns", this.NI_RETURN_STATE_NOUNS],
      ["particle_ni_return_state_animate_nouns", this.NI_RETURN_STATE_ANIMATE_NOUNS],
      ["particle_ni_identity_origin_qualifiers", this.NI_IDENTITY_ORIGIN_QUALIFIERS],
      ["particle_ni_identity_first_person", this.NI_IDENTITY_FIRST_PERSON],
      ["semantic_reflexive_self_nouns", this.REFLEXIVE_SELF_NOUNS],
    ]);
  }
}
