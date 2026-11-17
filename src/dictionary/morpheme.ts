import { collectJsonlFiles, type DataLoader } from "../data-loader.js";
import type { HaruPos } from "../analyzer/index.js";
import { estimateTransliterationSimilarity, TRANSLITERATION_SIMILARITY_THRESHOLD } from "../generator/readings.js";
import type { MorphemeDerivation, MorphemeEntry, MorphemeSense } from "../types/dictionary.js";
import type { RuntimeHaruToken } from "../types/token.js";

import { normalizeEntrySenses, type SenseDictionaryEntry } from "./sense-normalization.js";
import type { LookupTables } from "../pipeline/lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { camelizeKeys } from "./data-section.js";

import {
  POS0,
  POS0_OF_NAME,
  POS1,
  POS2,
  POS3,
  isSahenCapableNominal,
  isSymbolCharacterToken,
  POS4,
  POS4_OF_NAME,
  POS5,
  POS5_OF_NAME,
  pos0in,
  PREDICATE_BITS,
  posFromStrings,
  posToString,
  形状詞,
  形容詞0,
  固有名詞,
  動詞,
  名詞,
  副詞,
  感動詞,
  接続詞,
  連体詞,
  普通名詞,
  非自立可能,
  サ変可能,
  サ変形状詞可能,
  副詞可能,
  助数詞可能,
  形状詞可能,
  補助記号,
  記号,
  ＡＡ,
  接尾辞,
  接尾辞_形容詞的,
  is下一段,
  五段_MIN,
  五段_MAX,
  上一段_MIN,
  上一段_MAX,
  下一段_MIN,
  下一段_MAX,
  is文語形容詞,
  文語形容詞_ク,
  文語形容詞_シク,
  동사,
  INFLECTABLE_BITS,
  POS01,
  名詞_普通名詞, POS012, 名詞_固有名詞, 接尾辞_名詞的, 名詞_固有名詞_人名, 名詞_固有名詞_地名,
} from "../types/pos.js";
export type FuzzyLevel = "perfect" | "basic" | "aggressive";
export type PosInput = string | readonly string[] | HaruPos;
export type TranslationTuple = readonly [korean: string, entry: MorphemeEntry | undefined];

type PosKey = number;
const POS_KEY_MASK = POS0 | POS1 | POS2 | POS3;
const POS_KEY_FIELDS: readonly number[] = [POS0, POS1, POS2, POS3];
const POS_DEPTH_REDUCTION_MASKS: readonly number[] = [POS012, POS01, POS0];

interface PosQuery {
  readonly value: number;
  readonly mask: number;
}

function posQuery(pos: PosInput): PosQuery {
  if (typeof pos === "string") {
    return { value: POS0_OF_NAME[pos] ?? 0, mask: POS0 };
  }
  if (typeof pos === "number") {
    return { value: pos & POS_KEY_MASK, mask: POS_KEY_MASK };
  }
  let mask = 0;
  for (let i = 0; i < 4 && i < pos.length; i++) {
    if (pos[i] === "*") break;
    mask |= POS_KEY_FIELDS[i]!;
  }
  return { value: posFromStrings(pos) & mask, mask };
}

const KATAKANA_ONLY_CHARS = new Set(["ー", "・", "･"]);

const NOUN_COMPATIBLE_POS2 = new Set<number>([0, サ変可能, サ変形状詞可能, 副詞可能, 助数詞可能, 形状詞可能]);

const INFLECTABLE_COMPATIBLE_POS1 = new Set<number>([0, 非自立可能]);

const CJK_NUMERIC_CHARS = new Set([
  "一", "七", "万", "三", "两", "九", "二", "五", "亖", "京", "亿",
  "什", "仟", "仨", "伍", "佰", "俩", "倆", "億", "兆", "兩", "八",
  "六", "十", "千", "卄", "卅", "卌", "叁", "参", "參", "叄", "四",
  "壱", "壹", "幺", "廾", "廿", "弌", "弍", "弎", "弐", "拐", "拾",
  "捌", "柒", "洞", "漆", "玖", "百", "皕", "秭", "肆", "萬", "貮",
  "貳", "贰", "鈎", "钩", "阡", "陆", "陌", "陸", "零"
]);

interface SurfaceLookupOptions {
  dictionaryForm?: string;
  dictionaryFormReading?: string;
  conjugationType?: number;
  conjugationForm?: string;
}

interface IndexedEntry {
  posKey: PosKey;
  entry: MorphemeEntry;
}

interface IndexedSurfaceEntries {
  posKey: PosKey;
  entries: MorphemeEntry[];
}

export function resolveLemmaForRegister(
  entry: MorphemeEntry,
  register: "none" | "respect" = "none"
): string {
  const translation = entry.senses?.[0];
  if (translation === undefined) {
    return "";
  }
  if (register === "respect" && translation.koreanHonorific !== undefined) {
    return translation.koreanHonorific;
  }
  return translation.korean;
}

export function posCompatible(tokenPos: PosInput, entryPos: PosInput): boolean {
  const tp = posKey(tokenPos);
  const ep = posKey(entryPos);
  const tpos0 = tp & POS0;
  const epos0 = ep & POS0;
  if (tpos0 === 0 || epos0 === 0 || tpos0 !== epos0) return false;
  if (tp === ep) return true;
  if (tpos0 === 名詞) {
    const tpos1 = tp & POS1;
    const epos1 = ep & POS1;
    if (tpos1 !== epos1) return false;
    if (tpos1 === 普通名詞) {
      return NOUN_COMPATIBLE_POS2.has(tp & POS2) && NOUN_COMPATIBLE_POS2.has(ep & POS2);
    }
    return false;
  }
  if (pos0in(tpos0, INFLECTABLE_BITS)) {
    return INFLECTABLE_COMPATIBLE_POS1.has(tp & POS1) && INFLECTABLE_COMPATIBLE_POS1.has(ep & POS1);
  }
  return tpos0 === 副詞 || tpos0 === 感動詞 || tpos0 === 接続詞 || tpos0 === 連体詞 || tpos0 === 形状詞;
}

export class MorphemeDictionary {
  private dictIndex = new Map<string, MorphemeEntry>();
  private surfaceIndex = new Map<string, MorphemeEntry[]>();
  private readingIndex = new Map<string, MorphemeEntry[]>();
  private formOnlyIndex = new Map<string, MorphemeEntry[]>();
  private readingConjIndex = new Map<string, MorphemeEntry[]>();
  private dictFormReadingIndex = new Map<string, IndexedEntry[]>();
  private surfaceFormReadingIndex = new Map<string, IndexedSurfaceEntries[]>();
  private relaxedCache = new WeakMap<RuntimeHaruToken, MorphemeEntry | null>();
  private delta: MorphemeDictionary | undefined = undefined;

  constructor(readonly fuzzyLevel: FuzzyLevel = "basic") { }

  get size(): number {
    return this.dictIndex.size + this.surfaceIndex.size;
  }

  get formOnlyEntries(): ReadonlyMap<string, readonly MorphemeEntry[]> {
    return this.formOnlyIndex;
  }

  get entriesByDictionaryKey(): ReadonlyMap<string, MorphemeEntry> {
    return this.dictIndex;
  }

  get surfaceEntriesByKey(): ReadonlyMap<string, readonly MorphemeEntry[]> {
    return this.surfaceIndex;
  }

  cloneShallow(): MorphemeDictionary {
    const clone = new MorphemeDictionary(this.fuzzyLevel);
    clone.dictIndex = this.dictIndex;
    clone.surfaceIndex = this.surfaceIndex;
    clone.readingIndex = this.readingIndex;
    clone.formOnlyIndex = this.formOnlyIndex;
    clone.readingConjIndex = this.readingConjIndex;
    clone.dictFormReadingIndex = this.dictFormReadingIndex;
    clone.surfaceFormReadingIndex = this.surfaceFormReadingIndex;
    clone.relaxedCache = this.relaxedCache;
    clone.delta = this.delta;
    return clone;
  }

  withMorphemeOverrides(delta: MorphemeDictionary): MorphemeDictionary {
    const clone = this.cloneShallow();
    clone.delta = delta;
    clone.relaxedCache = new WeakMap();
    return clone;
  }

  static async fromPatch(
    text: string,
    source: string,
    lookups: LookupTables,
    numeric: NumericTables,
    fuzzyLevel: FuzzyLevel = "basic"
  ): Promise<MorphemeDictionary> {
    const dictionary = new MorphemeDictionary(fuzzyLevel);
    await dictionary.loadJsonl(text, source, lookups, numeric);
    return dictionary;
  }

  async load(loader: DataLoader, dirPath: string, lookups: LookupTables, numeric: NumericTables): Promise<void> {
    const aliases = new Map<string, MorphemeEntry>();
    for (const path of await collectJsonlFiles(loader, dirPath)) {
      const content = await loader.readTextFile(path);
      for (const line of content.split(/\r?\n/u)) {
        this.ingestLine(line, path, lookups, numeric, aliases);
      }
    }
    this.finalizeLoad(aliases);
  }

  async loadJsonl(text: string, source: string, lookups: LookupTables, numeric: NumericTables): Promise<void> {
    const aliases = new Map<string, MorphemeEntry>();
    for (const line of text.split(/\r?\n/u)) {
      this.ingestLine(line, source, lookups, numeric, aliases);
    }
    this.finalizeLoad(aliases);
  }

  private ingestLine(
    line: string,
    source: string,
    lookups: LookupTables,
    numeric: NumericTables,
    aliases: Map<string, MorphemeEntry>
  ): void {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      return;
    }
    const entry = normalizeEntrySenses(normalizeRawMorphemeEntry(camelizeKeys(JSON.parse(trimmed)) as RawMorphemeEntry), {
      source,
      lookups,
      numeric
    }) as MorphemeEntry;
    const slot = entryIndexSlot(entry);
    if (slot.index === "surface") {
      pushMap(this.surfaceIndex, slot.key, entry);
    } else if (slot.index === "alias") {
      aliases.set(slot.key, entry);
    } else {
      this.addDictEntry(requiredDictionaryForm(entry), requiredReading(entry), posKey(requiredPos(entry)), entry);
    }
  }

  private finalizeLoad(aliases: Map<string, MorphemeEntry>): void {
    for (const key of aliases.keys()) {
      this.materializeDictAliasKey(key, aliases, new Set());
    }
    this.canonicalizeIndexOrder();
    this.rebuildFuzzyIndexes();
  }

  private canonicalizeIndexOrder(): void {
    for (const index of [this.surfaceIndex, this.readingIndex, this.formOnlyIndex, this.readingConjIndex]) {
      for (const entries of index.values()) {
        entries.sort(compareEntryOrder);
      }
    }
    this.dictIndex = new Map([...this.dictIndex.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)));
  }

  async lookup(dictionaryForm: string, reading: string, pos: PosInput): Promise<MorphemeEntry | undefined> {
    if (this.delta !== undefined) {
      const hit = await this.delta.lookup(dictionaryForm, reading, pos);
      if (hit !== undefined) {
        return hit;
      }
    }
    return this.prefixLookup(this.dictIndex, this.dictFormReadingIndex, dictionaryForm, reading, pos);
  }

  async lookupSurface(
    surface: string,
    reading: string,
    pos: PosInput,
    options: SurfaceLookupOptions = {}
  ): Promise<MorphemeEntry | undefined> {
    if (this.delta !== undefined) {
      const hit = await this.delta.lookupSurface(surface, reading, pos, options);
      if (hit !== undefined) {
        return hit;
      }
    }
    const entries = this.prefixLookupSurface(surface, reading, pos);
    for (const entry of entries) {
      if (entry.dictionaryForm !== undefined && options.dictionaryForm !== undefined && entry.dictionaryForm !== options.dictionaryForm) {
        continue;
      }
      if (entry.dictionaryFormReading !== undefined && options.dictionaryFormReading !== undefined && entry.dictionaryFormReading !== options.dictionaryFormReading) {
        continue;
      }
      if (entry.conjugationType !== undefined && entry.conjugationType !== null && options.conjugationType !== undefined && entry.conjugationType !== options.conjugationType) {
        continue;
      }
      if (entry.conjugationForm !== undefined && entry.conjugationForm !== null && options.conjugationForm !== undefined && entry.conjugationForm !== options.conjugationForm) {
        continue;
      }
      if (entry.baseForm === undefined) {
        return entry;
      }
      const checkForm = entry.dictionaryForm ?? entry.baseForm;
      const checkReading = entry.dictionaryFormReading ?? entry.baseReading;
      if (options.dictionaryForm !== undefined && checkForm !== options.dictionaryForm) {
        continue;
      }
      if (options.dictionaryFormReading !== undefined && checkReading !== options.dictionaryFormReading) {
        continue;
      }
      return await this.lookup(entry.baseForm, requiredBaseReading(entry), requiredPos(entry));
    }
    return undefined;
  }

  async lookupByReading(reading: string, pos: PosInput): Promise<MorphemeEntry | undefined> {
    if (reading.length === 0) {
      return undefined;
    }
    if (this.delta !== undefined) {
      const hit = await this.delta.lookupByReading(reading, pos);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = this.readingIndex.get(reading);
    if (candidates === undefined) {
      return undefined;
    }
    const q = posQuery(pos);
    for (const mask of [POS_KEY_MASK, ...POS_DEPTH_REDUCTION_MASKS]) {
      const maskedValue = q.value & mask;
      if (maskedValue === 0) continue;
      let best: MorphemeEntry | undefined;
      let bestSpecificity = -1;
      for (const entry of candidates) {
        const epk = posKey(requiredPos(entry));
        if ((epk & mask) !== maskedValue) continue;
        const s = posKeyNonZeroCount(epk);
        if (s > bestSpecificity) {
          best = entry;
          bestSpecificity = s;
        }
      }
      if (best !== undefined) return best;
    }
    return undefined;
  }

  countByPos(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const key of this.dictIndex.keys()) {
      const [, , pk] = parseIndexKey(key);
      const pos0Name = posToString(pk).split("|")[0] ?? "기타";
      counts[pos0Name] = (counts[pos0Name] ?? 0) + 1;
    }
    return counts;
  }

  async hasEntry(form: string, reading: string, pos: PosInput): Promise<boolean> {
    if (this.delta !== undefined && await this.delta.hasEntry(form, reading, pos)) {
      return true;
    }
    return await this.lookup(form, reading, pos) !== undefined || this.prefixLookupSurface(form, reading, pos).length > 0;
  }

  async lookupToken(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    return await this.lookupTokenExact(token) ?? this.readingFallback(token);
  }


  async lookupTokenExact(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    const surfaceEntry = await this.lookupSurface(token.surface, token.reading, token.pos, {
      dictionaryForm: token.dictionaryForm,
      dictionaryFormReading: token.dictionaryFormReading,
      conjugationType: tokenConjugationType(token),
      conjugationForm: tokenConjugationForm(token)
    });
    if (surfaceEntry !== undefined) {
      return surfaceEntry;
    }
    const dictionaryEntry = await this.lookup(token.dictionaryForm, token.dictionaryFormReading, token.pos);
    if (dictionaryEntry !== undefined) {
      return dictionaryEntry;
    }
    const normalizedEntry = await this.lookupTokenNormalizedForm(token);
    if (normalizedEntry !== undefined) {
      return normalizedEntry;
    }
    if ((token.pos & POS1) === 固有名詞) {
      return this.lookupCommonNounFallback(token.dictionaryForm, token.dictionaryFormReading);
    }
    return undefined;
  }

  private lookupCommonNounFallback(form: string, reading: string): MorphemeEntry | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupCommonNounFallback(form, reading);
      if (hit !== undefined) return hit;
    }
    let best: MorphemeEntry | undefined;
    let bestSpecificity = -1;
    for (const { posKey: epk, entry } of this.dictFormReadingIndex.get(indexKey(form, reading, 0)) ?? []) {
      if ((epk & POS01) !== 名詞_普通名詞) continue;
      const s = posKeyNonZeroCount(epk);
      if (s > bestSpecificity) {
        best = entry;
        bestSpecificity = s;
      }
    }
    return best;
  }

  private async lookupTokenNormalizedForm(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    const normalized = token.normalizedForm;
    if (normalized === undefined || normalized.length === 0) {
      return undefined;
    }
    if (normalized === token.surface && normalized === token.dictionaryForm) {
      return undefined;
    }
    if (containsAsciiAlpha(token.surface) || containsAsciiAlpha(token.dictionaryForm)) {
      return undefined;
    }
    const reading = token.dictionaryFormReading || token.reading;
    if (reading.length === 0) {
      return undefined;
    }
    return await this.lookup(normalized, reading, token.pos);
  }

  async lookupTokenRelaxed(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    const cached = this.relaxedCache.get(token);
    if (cached !== undefined) {
      return cached === null ? undefined : cached;
    }
    const result = await this.lookupTokenRelaxedUncached(token);
    this.relaxedCache.set(token, result ?? null);
    return result;
  }

  private async lookupTokenRelaxedUncached(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    const exact = await this.lookupTokenExact(token);
    if (exact !== undefined) {
      return exact;
    }
    if ((token.pos & POS1) === 固有名詞) {
      return undefined;
    }
    const formRelaxed = this.lookupFormRelaxed(token);
    if (formRelaxed !== undefined) {
      return formRelaxed;
    }
    const potentialBase = await this.lookupGodanPotentialBase(token);
    if (potentialBase !== undefined) {
      return potentialBase;
    }
    const derivedVoiceBase = await this.lookupDerivedVoiceBase(token);
    if (derivedVoiceBase !== undefined) {
      return derivedVoiceBase;
    }
    const lemmaFamily = this.lookupLemmaFamily(token);
    if (lemmaFamily !== undefined) {
      return lemmaFamily;
    }
    const colloquialIAdjectiveBase = await this.lookupColloquialIAdjectiveBase(token);
    if (colloquialIAdjectiveBase !== undefined) {
      return colloquialIAdjectiveBase;
    }
    const bungoAdjectiveBase = await this.lookupBungoAdjectiveBase(token);
    if (bungoAdjectiveBase !== undefined) {
      return bungoAdjectiveBase;
    }
    return this.readingFallbackRelaxed(token);
  }

  async findKatakanaTransliteration(kana: string, options: { readonly preferNameRole?: boolean } = {}): Promise<string | undefined> {
    if (kana.length === 0 || !isPureKatakana(kana)) {
      return undefined;
    }
    if (this.delta !== undefined) {
      const hit = await this.delta.findKatakanaTransliteration(kana, options);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = this.formOnlyIndex.get(kana);
    if (candidates === undefined || candidates.length === 0) {
      return undefined;
    }

    const preferNameRole = options.preferNameRole === true;
    let primary: string | undefined;
    let secondary: string | undefined;
    let similarityFallback: string | undefined;
    for (const entry of candidates) {
      const pos = entry.pos ?? 0;
      if (typeof pos === "number" ? (pos & POS0) !== 名詞 : pos[0] !== "名詞") {
        continue;
      }
      for (const translation of entry.senses ?? []) {
        const korean = translation.korean.trim();
        if (korean.length === 0 || /[ ,/]/u.test(korean)) {
          continue;
        }
        const flag = translation.transliteration;
        if (flag === false) {
          continue;
        }
        const nameRole = translation.nameRole === true;
        const preferred = (preferNameRole && nameRole) || (!preferNameRole && !nameRole);
        if (flag === true) {
          if (preferred && primary === undefined) {
            primary = korean;
          } else if (!preferred && secondary === undefined) {
            secondary = korean;
          }
          continue;
        }
        if (similarityFallback === undefined && estimateTransliterationSimilarity(kana, korean) >= TRANSLITERATION_SIMILARITY_THRESHOLD) {
          similarityFallback = korean;
        }
      }
    }
    return primary ?? secondary ?? similarityFallback;
  }

  findKoreanByReading(kana: string, surface?: string): string | undefined {
    if (kana.length === 0 || !isPureKatakana(kana)) {
      return undefined;
    }
    if (this.delta !== undefined) {
      const hit = this.delta.findKoreanByReading(kana, surface);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = this.readingIndex.get(kana);
    if (candidates === undefined || candidates.length === 0) {
      return undefined;
    }
    const usable = candidates.flatMap((entry) => {
      const pos = entry.pos ?? 0;
      if (typeof pos === "number" ? (pos & POS0) !== 名詞 : pos[0] !== "名詞") {
        return [];
      }
      const form = typeof entry.dictionaryForm === "string" ? entry.dictionaryForm : "";
      if (form.length === 0 || isPureKatakana(form)) {
        return [];
      }
      const korean = entry.senses?.[0]?.korean.trim();
      return korean !== undefined && korean.length > 0 && !/[ ,/]/u.test(korean) ? [{ form, korean }] : [];
    });
    const attested = surface === undefined ? undefined : usable.find((candidate) => surface.includes(candidate.form));
    return (attested ?? usable[0])?.korean;
  }

  async translateToken(token: RuntimeHaruToken): Promise<TranslationTuple[]> {
    const entry = await this.lookupTokenRelaxed(token);
    const korean = entry?.senses?.[0]?.korean;
    if (entry !== undefined && korean !== undefined) {
      return [[korean, entry]];
    }
    if (token.splitB !== undefined) {
      const results = await this.translateSubtokens(token.splitB);
      if (results !== undefined) {
        return results;
      }
    }
    if (token.splitA !== undefined) {
      const results = await this.translateSubtokens(token.splitA);
      if (results !== undefined) {
        return results;
      }
    }
    return [[token.surface, undefined]];
  }

  private addDictEntry(form: string, reading: string, pk: PosKey, entry: MorphemeEntry): void {
    this.dictIndex.set(indexKey(form, reading, pk), entry);
    pushMap(this.readingIndex, reading, entry);
    pushMap(this.formOnlyIndex, form, entry);
    const conjType = entry.conjugationType ?? 0;
    const entryPos = requiredPos(entry);
    const pos0 = entryPos & POS0;
    if (pos0in(pos0, PREDICATE_BITS) && conjType !== 0) {
      pushMap(this.readingConjIndex, `${reading}\0${pos0}\0${conjType}`, entry);
    }
  }

  private materializeDictAliasKey(
    key: string,
    aliases: Map<string, MorphemeEntry>,
    seen: Set<string>
  ): MorphemeEntry {
    const existing = this.dictIndex.get(key);
    if (existing !== undefined) {
      return existing;
    }
    if (seen.has(key)) {
      throw new Error(`dictionary alias cycle detected: ${key}`);
    }
    seen.add(key);
    const alias = aliases.get(key);
    if (alias === undefined || typeof alias.aliasOf !== "object") {
      throw new Error(`dictionary alias target not found: ${key}`);
    }
    const target = alias.aliasOf;
    const targetKey = indexKey(requiredDictionaryForm(target), requiredReading(target), posKey(requiredPos(target)));
    const targetEntry = this.dictIndex.get(targetKey)
      ?? (aliases.has(targetKey) ? this.materializeDictAliasKey(targetKey, aliases, seen) : undefined);
    if (targetEntry === undefined) {
      throw new Error(`dictionary alias target not found: ${targetKey}`);
    }
    for (const field of ["conjugationType", "conjugationForm"] as const) {
      const aliasValue = alias[field];
      const targetValue = targetEntry[field];
      if (aliasValue !== undefined && aliasValue !== null && targetValue !== undefined && targetValue !== null && aliasValue !== targetValue) {
        throw new Error(`dictionary alias ${field} mismatch: ${key} -> ${targetKey} (${JSON.stringify(aliasValue)} != ${JSON.stringify(targetValue)})`);
      }
    }
    const materialized: MorphemeEntry = {
      ...targetEntry,
      dictionaryForm: requiredDictionaryForm(alias),
      reading: requiredReading(alias),
      pos: requiredPos(alias),
      aliasOf: alias.aliasOf
    };
    if ("conjugationType" in alias) {
      const aliasConjugationType = alias.conjugationType;
      materialized.conjugationType = aliasConjugationType;
    }
    if ("conjugationForm" in alias) {
      const aliasConjugationForm = alias.conjugationForm;
      materialized.conjugationForm = aliasConjugationForm;
    }
    this.addDictEntry(requiredDictionaryForm(materialized), requiredReading(materialized), posKey(requiredPos(materialized)), materialized);
    return materialized;
  }

  private prefixLookup(
    index: Map<string, MorphemeEntry>,
    formReadingIndex: Map<string, IndexedEntry[]>,
    form: string,
    reading: string,
    pos: PosInput
  ): MorphemeEntry | undefined {
    const q = posQuery(pos);
    const exact = index.get(indexKey(form, reading, q.value));
    if (exact !== undefined) return exact;
    let best: MorphemeEntry | undefined;
    let bestSpecificity = -1;
    for (const { posKey: epk, entry } of formReadingIndex.get(indexKey(form, reading, 0)) ?? []) {
      if ((epk & q.mask) !== q.value) continue;
      const s = posKeyNonZeroCount(epk);
      if (s > bestSpecificity) {
        best = entry;
        bestSpecificity = s;
      }
    }
    return best;
  }

  private prefixLookupSurface(surface: string, reading: string, pos: PosInput): MorphemeEntry[] {
    const q = posQuery(pos);
    const exact = this.surfaceIndex.get(indexKey(surface, reading, q.value));
    if (exact !== undefined) return exact;
    let best: MorphemeEntry[] = [];
    let bestSpecificity = -1;
    for (const { posKey: epk, entries } of this.surfaceFormReadingIndex.get(indexKey(surface, reading, 0)) ?? []) {
      if ((epk & q.mask) !== q.value) continue;
      const s = posKeyNonZeroCount(epk);
      if (s > bestSpecificity) {
        best = entries;
        bestSpecificity = s;
      }
    }
    return best;
  }

  private lookupFormRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined {
    const candidates = this.formOnlyIndex.get(token.dictionaryForm);
    const compatible = candidates?.filter((entry) => posCompatible(token.pos, requiredPos(entry))) ?? [];
    return this.selectBest(compatible, token, "form_relaxed");
  }

  private async lookupGodanPotentialBase(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    if ((token.pos & POS0) !== 動詞) {
      return undefined;
    }
    if (!is下一段(token.pos)) {
      return undefined;
    }
    const conjType = tokenConjugationType(token);
    const reading = token.dictionaryFormReading || token.reading;
    const surfaceRestored = restoreGodanPotentialBase(token.dictionaryForm, reading);
    if (surfaceRestored === undefined) {
      return undefined;
    }
    const normalized = token.normalizedForm;
    const restorations = normalized === undefined || normalized.length === 0 || normalized === token.dictionaryForm
      ? [surfaceRestored]
      : [
        surfaceRestored,
        { form: normalized, reading: surfaceRestored.reading },
        ...[restoreGodanPotentialBase(normalized, reading)].filter((value) => value !== undefined)
      ];
    let restored = surfaceRestored;
    let base: MorphemeEntry | undefined;
    for (const candidate of restorations) {
      base = this.lookupGodanPotentialBaseEntry(candidate, token);
      if (base !== undefined) {
        restored = candidate;
        break;
      }
    }
    if (base === undefined) {
      return undefined;
    }
    return {
      ...base,
      dictionaryForm: token.dictionaryForm,
      reading: token.dictionaryFormReading || token.reading,
      pos: token.pos & POS_KEY_MASK,
      conjugationType: conjType,
      conjugationForm: null,
      derivations: [{
        id: "potential",
        baseForm: restored.form,
        baseReading: restored.reading
      }],
      ...(base.senses === undefined ? {} : {
        senses: derivedSensesFromBase(base.senses, [{ id: "potential" }])
      }),
      synthetic: true,
      syntheticReason: "godan_potential_base_restored",
      matchReason: "potential_base_restored",
      ambiguousCount: base.ambiguousCount ?? 0
    };
  }

  private lookupGodanPotentialBaseEntry(
    restored: { readonly form: string; readonly reading: string },
    token: RuntimeHaruToken
  ): MorphemeEntry | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupGodanPotentialBaseEntry(restored, token);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = (this.dictFormReadingIndex.get(indexKey(restored.form, restored.reading, 0)) ?? [])
      .map(({ entry }) => entry)
      .filter((entry) => isGodanVerbEntry(entry) && posCompatible(token.pos, requiredPos(entry)));
    return this.selectBest(candidates, {
      ...token,
      dictionaryForm: restored.form,
      dictionaryFormReading: restored.reading,
      reading: restored.reading
    }, "potential_base_restored_base");
  }

  private async lookupDerivedVoiceBase(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    if ((token.pos & POS0) !== 動詞) {
      return undefined;
    }
    if (!is下一段(token.pos)) {
      return undefined;
    }
    const conjType = tokenConjugationType(token);
    const form = token.dictionaryForm;
    const reading = token.dictionaryFormReading || token.reading;
    const ichidan = restoreIchidanRareruBase(form, reading);
    if (ichidan !== undefined) {
      const base = this.lookupDerivedVoiceBaseEntry(ichidan, token, isIchidanVerbEntry, "ichidan_rareru_base");
      if (base !== undefined) {
        return this.syntheticDerivedEntry(token, base, conjType, [
          { id: "passive", baseForm: ichidan.form, baseReading: ichidan.reading },
          { id: "potential", baseForm: ichidan.form, baseReading: ichidan.reading },
          { id: "honorific", baseForm: ichidan.form, baseReading: ichidan.reading }
        ], "ichidan_rareru_base_restored");
      }
    }
    const sahen = restoreSahenSareruBase(form, reading);
    if (sahen !== undefined) {
      const base = this.lookupSahenVoiceBaseEntry(sahen, token);
      if (base !== undefined) {
        return this.syntheticDerivedEntry(token, base, conjType, [
          { id: "passive", baseForm: sahen.form, baseReading: sahen.reading },
          { id: "honorific", baseForm: sahen.form, baseReading: sahen.reading }
        ], "sahen_rareru_base_restored", { sahenVerbProjection: true });
      }
    }
    const godan = restoreGodanReruBase(form, reading);
    if (godan !== undefined) {
      const base = this.lookupDerivedVoiceBaseEntry(godan, token, isGodanVerbEntry, "godan_reru_base");
      if (base !== undefined) {
        return this.syntheticDerivedEntry(token, base, conjType, [
          { id: "passive", baseForm: godan.form, baseReading: godan.reading },
          { id: "honorific", baseForm: godan.form, baseReading: godan.reading }
        ], "godan_reru_base_restored");
      }
    }
    return undefined;
  }

  private syntheticDerivedEntry(
    token: RuntimeHaruToken,
    base: MorphemeEntry,
    conjugationType: number,
    derivations: readonly MorphemeDerivation[],
    reason: string,
    options: { readonly sahenVerbProjection?: boolean } = {}
  ): MorphemeEntry {
    const senses = base.senses === undefined
      ? undefined
      : derivedSensesFromBase(base.senses, derivations, options);
    return {
      ...base,
      dictionaryForm: token.dictionaryForm,
      reading: token.dictionaryFormReading || token.reading,
      pos: token.pos & POS_KEY_MASK,
      conjugationType,
      conjugationForm: null,
      derivations,
      ...(senses === undefined ? {} : { senses }),
      synthetic: true,
      syntheticReason: reason,
      matchReason: reason,
      ambiguousCount: base.ambiguousCount ?? 0
    };
  }

  private lookupDerivedVoiceBaseEntry(
    restored: { readonly form: string; readonly reading: string },
    token: RuntimeHaruToken,
    predicate: (entry: MorphemeEntry) => boolean,
    reason: string
  ): MorphemeEntry | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupDerivedVoiceBaseEntry(restored, token, predicate, reason);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = (this.dictFormReadingIndex.get(indexKey(restored.form, restored.reading, 0)) ?? [])
      .map(({ entry }) => entry)
      .filter((entry) => predicate(entry) && posCompatible(token.pos, requiredPos(entry)));
    return this.selectBest(candidates, {
      ...token,
      dictionaryForm: restored.form,
      dictionaryFormReading: restored.reading,
      reading: restored.reading
    }, reason);
  }

  private lookupSahenVoiceBaseEntry(
    restored: { readonly form: string; readonly reading: string },
    token: RuntimeHaruToken
  ): MorphemeEntry | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupSahenVoiceBaseEntry(restored, token);
      if (hit !== undefined) {
        return hit;
      }
    }
    const nounForm = restored.form.endsWith("する") ? restored.form.slice(0, -"する".length) : restored.form;
    const nounReading = restored.reading.endsWith("スル") ? restored.reading.slice(0, -"スル".length) : restored.reading;
    const candidates = (this.dictFormReadingIndex.get(indexKey(nounForm, nounReading, 0)) ?? [])
      .map(({ entry }) => entry)
      .filter(isSahenNounEntry);
    return this.selectBest(candidates, {
      ...token,
      dictionaryForm: nounForm,
      dictionaryFormReading: nounReading,
      reading: nounReading
    }, "sahen_rareru_base");
  }

  private lookupLemmaFamily(token: RuntimeHaruToken): MorphemeEntry | undefined {
    const pos0 = token.pos & POS0;
    const conjType = tokenConjugationType(token);
    if (!pos0in(pos0, PREDICATE_BITS) || conjType === 0) {
      return undefined;
    }
    const reading = token.dictionaryFormReading || token.reading;
    const candidates = this.readingConjIndex.get(`${reading}\0${pos0}\0${conjType}`);
    return this.selectBest(candidates ?? [], token, "lemma_family");
  }

  private async lookupColloquialIAdjectiveBase(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    if (!isColloquialIAdjectiveToken(token)) {
      return undefined;
    }
    const contractedReading = normalizeColloquialIAdjectiveReading(token.dictionaryFormReading || token.reading);
    const restorations = restoreColloquialIAdjectiveReadings(contractedReading);
    if (restorations.length === 0) {
      return undefined;
    }
    const selected = this.lookupColloquialIAdjectiveBaseEntry(restorations, token, contractedReading);
    if (selected === undefined) {
      return undefined;
    }
    const base = selected.entry;
    const conjType = tokenConjugationType(token);
    const conjForm = tokenConjugationForm(token);
    return {
      ...base,
      dictionaryForm: token.dictionaryForm,
      reading: token.dictionaryFormReading || token.reading,
      pos: token.pos & POS_KEY_MASK,
      conjugationType: conjType,
      conjugationForm: conjForm.length === 0 ? null : conjForm,
      derivations: [{
        id: "colloquial_i_adjective",
        baseForm: requiredDictionaryForm(base),
        baseReading: requiredReading(base)
      }],
      synthetic: true,
      syntheticReason: "colloquial_i_adjective_base_restored",
      matchReason: "colloquial_i_adjective_base_restored",
      ambiguousCount: selected.ambiguousCount
    };
  }

  private lookupColloquialIAdjectiveBaseEntry(
    restorations: readonly ColloquialIAdjectiveRestoration[],
    token: RuntimeHaruToken,
    contractedReading: string
  ): { readonly entry: MorphemeEntry; readonly ambiguousCount: number } | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupColloquialIAdjectiveBaseEntry(restorations, token, contractedReading);
      if (hit !== undefined) {
        return hit;
      }
    }

    const tokenForm = token.dictionaryForm || token.surface;
    const tokenHasKanji = containsKanji(tokenForm);
    const candidates: { readonly entry: MorphemeEntry; readonly restoration: ColloquialIAdjectiveRestoration }[] = [];
    const seen = new Set<string>();
    for (const restoration of restorations) {
      for (const entry of this.readingIndex.get(restoration.reading) ?? []) {
        if (!isRestorableIAdjectiveEntry(entry, token)) {
          continue;
        }
        const entryForm = requiredDictionaryForm(entry);
        const entryReading = requiredReading(entry);
        if (forwardContractReading(entryReading, restoration.rule) !== contractedReading) {
          continue;
        }
        if (tokenHasKanji) {
          if (!containsKanji(entryForm) || !kanjiPrefixCompatibleForReadingFallback(tokenForm, entryForm)) {
            continue;
          }
        } else if (!containsKanji(entryForm)) {
          const entryFormReading = kanaLikeToKatakana(entryForm);
          if (forwardContractReading(entryFormReading, restoration.rule) !== contractedReading) {
            continue;
          }
        }
        const key = `${entryForm}\0${entryReading}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        candidates.push({ entry, restoration });
      }
    }
    if (candidates.length === 0) {
      return undefined;
    }

    let filtered = candidates;
    if (!tokenHasKanji) {
      const kanaFormCandidates = candidates.filter(({ entry }) => !containsKanji(requiredDictionaryForm(entry)));
      if (kanaFormCandidates.length > 0) {
        filtered = kanaFormCandidates;
      } else if (new Set(candidates.map(({ entry }) => requiredDictionaryForm(entry))).size > 1) {
        return undefined;
      }
    }

    const tokenConj = tokenConjugationType(token);
    const sorted = [...filtered].sort((left, right) => {
      const tier = left.restoration.rule.tier - right.restoration.rule.tier;
      if (tier !== 0) {
        return tier;
      }
      return compareCandidateRanks(
        candidateRank(left.entry, left.restoration.reading, tokenConj),
        candidateRank(right.entry, right.restoration.reading, tokenConj)
      );
    });
    const winner = sorted[0];
    return winner === undefined
      ? undefined
      : { entry: winner.entry, ambiguousCount: filtered.length - 1 };
  }

  private async lookupBungoAdjectiveBase(token: RuntimeHaruToken): Promise<MorphemeEntry | undefined> {
    if (!isBungoAdjectiveToken(token)) {
      return undefined;
    }
    const conjType = tokenConjugationType(token);
    const conjForm = tokenConjugationForm(token);
    const restored = restoreBungoAdjectiveModernForm(
      token.dictionaryForm,
      token.dictionaryFormReading || token.reading,
      conjType
    );
    if (restored === undefined) {
      return undefined;
    }
    const base = this.lookupBungoAdjectiveBaseEntry(restored, token);
    if (base === undefined) {
      return undefined;
    }
    return {
      ...base,
      dictionaryForm: token.dictionaryForm,
      reading: token.dictionaryFormReading || token.reading,
      pos: token.pos & POS_KEY_MASK,
      conjugationType: conjType,
      conjugationForm: conjForm.length === 0 ? null : conjForm,
      derivations: [{
        id: "bungo_adjective",
        baseForm: restored.form,
        baseReading: restored.reading
      }],
      synthetic: true,
      syntheticReason: "bungo_adjective_modern_restored",
      matchReason: "bungo_adjective_modern_restored",
      ambiguousCount: base.ambiguousCount ?? 0
    };
  }

  private lookupBungoAdjectiveBaseEntry(
    restored: { readonly form: string; readonly reading: string },
    token: RuntimeHaruToken
  ): MorphemeEntry | undefined {
    if (this.delta !== undefined) {
      const hit = this.delta.lookupBungoAdjectiveBaseEntry(restored, token);
      if (hit !== undefined) {
        return hit;
      }
    }
    const candidates = (this.dictFormReadingIndex.get(indexKey(restored.form, restored.reading, 0)) ?? [])
      .map(({ entry }) => entry)
      .filter((entry) => isRestorableIAdjectiveEntry(entry, token));
    return this.selectBest(candidates, {
      ...token,
      dictionaryForm: restored.form,
      dictionaryFormReading: restored.reading,
      reading: restored.reading
    }, "bungo_adjective_modern_base");
  }

  private readingFallback(token: RuntimeHaruToken): MorphemeEntry | undefined {
    if (this.fuzzyLevel === "perfect" || (token.pos & POS1) === 固有名詞) {
      return undefined;
    }
    if (containsAsciiAlpha(token.dictionaryForm) || containsSymbolicNumeric(token.surface)) {
      return undefined;
    }
    return this.readingFallbackTiered(token)?.entry;
  }

  private readingFallbackRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined {
    if (this.fuzzyLevel === "perfect") {
      return undefined;
    }
    if (containsAsciiAlpha(token.dictionaryForm) || containsSymbolicNumeric(token.surface)) {
      return undefined;
    }
    const result = this.readingFallbackTiered(token);
    if (result === undefined) {
      return undefined;
    }
    const allCandidates = this.readingIndex.get(token.dictionaryFormReading) ?? [];
    return annotate(result.entry, result.label || "reading_fallback", allCandidates.length - 1);
  }

  private readingFallbackTiered(token: RuntimeHaruToken): { readonly entry: MorphemeEntry; readonly label: string } | undefined {
    if (isSymbolCharacterToken(token)) {
      return undefined;
    }
    const reading = token.dictionaryFormReading;
    if (reading.length === 0) {
      return undefined;
    }
    const candidates = this.readingIndex.get(reading);
    if (candidates === undefined || candidates.length === 0) {
      return undefined;
    }
    const q = posQuery(token.pos);
    if (q.value === 0) {
      return undefined;
    }
    let compatible: MorphemeEntry[] = [];
    for (const mask of [POS_KEY_MASK, ...POS_DEPTH_REDUCTION_MASKS]) {
      const maskedValue = q.value & mask;
      if (maskedValue === 0) continue;
      compatible = candidates.filter((entry) => (posKey(requiredPos(entry)) & mask) === maskedValue);
      if (compatible.length > 0) break;
    }
    if (compatible.length === 0) {
      return undefined;
    }
    const oovForm = token.dictionaryForm;
    if (!containsKanji(oovForm)) {
      const entry = compatible[0];
      return entry === undefined ? undefined : { entry, label: "reading_kana_oov" };
    }
    const prefixShare = compatible.find((entry) => {
      const candidateForm = requiredDictionaryForm(entry);
      return containsKanji(candidateForm) && kanjiPrefixCompatibleForReadingFallback(oovForm, candidateForm);
    });
    return prefixShare === undefined ? undefined : { entry: prefixShare, label: "reading_prefix" };
  }

  private selectBest(
    candidates: readonly MorphemeEntry[],
    token: RuntimeHaruToken,
    reason: string
  ): MorphemeEntry | undefined {
    if (candidates.length === 0) {
      return undefined;
    }
    const tokenReading = token.dictionaryFormReading || token.reading;
    const tokenConj = tokenConjugationType(token);
    const sorted = [...candidates].sort((left, right) =>
      compareCandidateRanks(candidateRank(left, tokenReading, tokenConj), candidateRank(right, tokenReading, tokenConj))
    );
    return annotate(sorted[0], reason, candidates.length - 1);
  }

  private async translateSubtokens(subtokens: readonly RuntimeHaruToken[]): Promise<TranslationTuple[] | undefined> {
    const results: TranslationTuple[] = [];
    let anyFound = false;
    for (const sub of subtokens) {
      const entry = await this.lookupTokenRelaxed(sub);
      const korean = entry?.senses?.[0]?.korean;
      if (entry !== undefined && korean !== undefined) {
        results.push([korean, entry]);
        anyFound = true;
      } else {
        results.push([sub.surface, undefined]);
      }
    }
    return anyFound ? results : undefined;
  }

  private rebuildFuzzyIndexes(): void {
    this.dictFormReadingIndex = new Map();
    for (const [key, entry] of this.dictIndex.entries()) {
      const [form, reading, pk] = parseIndexKey(key);
      pushMap(this.dictFormReadingIndex, indexKey(form, reading, 0), { posKey: pk, entry });
    }
    this.surfaceFormReadingIndex = new Map();
    for (const [key, entries] of this.surfaceIndex.entries()) {
      const [surface, reading, pk] = parseIndexKey(key);
      pushMap(this.surfaceFormReadingIndex, indexKey(surface, reading, 0), { posKey: pk, entries });
    }
  }
}

export interface MorphemeIndexSlot {
  readonly index: "dict" | "alias" | "surface";
  readonly key: string;
  readonly orderKey: string;
  readonly lookupKey: string;
}

function entryIndexSlot(entry: MorphemeEntry): MorphemeIndexSlot {
  const pk = posKey(requiredPos(entry));
  const orderKey = entryOrderTuple(entry).join("\0");
  if (entry.surface !== undefined) {
    const lookupKey = [
      entry.dictionaryForm ?? entry.baseForm ?? "",
      entry.dictionaryFormReading ?? entry.baseReading ?? "",
      entry.conjugationType ?? 0,
      entry.conjugationForm ?? ""
    ].join("\0");
    return { index: "surface", key: indexKey(entry.surface, requiredReading(entry), pk), orderKey, lookupKey };
  }
  return {
    index: entry.aliasOf === undefined ? "dict" : "alias",
    key: indexKey(requiredDictionaryForm(entry), requiredReading(entry), pk),
    orderKey,
    lookupKey: ""
  };
}

export function morphemeRowIndexSlot(raw: unknown): MorphemeIndexSlot {
  const entry = normalizeRawMorphemeEntry(camelizeKeys(raw) as RawMorphemeEntry) as unknown as MorphemeEntry;
  return entryIndexSlot(entry);
}

function normalizeRawMorphemeEntry(raw: RawMorphemeEntry): SenseDictionaryEntry {
  const entry = {
    ...(raw.surface === undefined ? {} : { surface: raw.surface }),
    ...(raw.dictionaryForm === undefined ? {} : { dictionaryForm: raw.dictionaryForm }),
    ...(raw.reading === undefined ? {} : { reading: raw.reading }),
    ...(raw.dictionaryFormReading === undefined ? {} : { dictionaryFormReading: raw.dictionaryFormReading }),
    ...(raw.pos === undefined ? {} : { pos: normalizePos(raw.pos) }),
    ...(raw.baseForm === undefined ? {} : { baseForm: raw.baseForm }),
    ...(raw.baseReading === undefined ? {} : { baseReading: raw.baseReading }),
    ...(raw.aliasOf === undefined ? {} : { aliasOf: normalizeAliasTarget(raw.aliasOf) }),
    ...(raw.conjugationType === undefined ? {} : { conjugationType: normalizeConjugationType(raw.conjugationType) }),
    ...(raw.conjugationForm === undefined ? {} : { conjugationForm: raw.conjugationForm }),
    ...(raw.derivations === undefined
      ? raw.derivation === undefined || raw.derivation === null
        ? {}
        : { derivations: [normalizeDerivation(raw.derivation)] }
      : { derivations: raw.derivations.map(normalizeDerivation) }),
    ...(raw.derivation === undefined ? {} : { derivation: raw.derivation === null ? null : normalizeDerivation(raw.derivation) }),
    ...(raw.senses === undefined ? {} : { senses: raw.senses })
  };
  return entry as unknown as SenseDictionaryEntry;
}

function normalizePos(value: readonly string[] | HaruPos): HaruPos {
  return typeof value === "number" ? value : posFromStrings(value);
}

function normalizeConjugationType(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  return POS4_OF_NAME[value] ?? 0;
}

function normalizeAliasTarget(value: string | RawMorphemeAliasTarget | undefined): string | { dictionaryForm: string; reading: string; pos: HaruPos } | undefined {
  if (value === undefined || typeof value === "string") {
    return value;
  }
  if (value.dictionaryForm === undefined) {
    throw new Error("morpheme alias target requires dictionaryForm");
  }
  return {
    dictionaryForm: value.dictionaryForm,
    reading: value.reading,
    pos: normalizePos(value.pos)
  };
}

function normalizeDerivation(value: RawMorphemeDerivation): MorphemeDerivation {
  return {
    ...((value.id ?? value.type) === undefined ? {} : { id: value.id ?? value.type }),
    ...(value.type === undefined ? {} : { type: value.type }),
    ...(value.baseForm === undefined ? {} : { baseForm: value.baseForm }),
    ...(value.baseReading === undefined ? {} : { baseReading: value.baseReading })
  };
}

interface RawMorphemeEntry {
  surface?: string;
  dictionaryForm?: string;
  reading?: string;
  dictionaryFormReading?: string;
  pos?: readonly string[] | HaruPos;
  baseForm?: string;
  baseReading?: string;
  aliasOf?: string | RawMorphemeAliasTarget;
  conjugationType?: string | null;
  conjugationForm?: string | null;
  derivations?: readonly RawMorphemeDerivation[];
  derivation?: RawMorphemeDerivation | null;
  senses?: SenseDictionaryEntry["senses"];
}

interface RawMorphemeAliasTarget {
  dictionaryForm?: string;
  reading: string;
  pos: readonly string[];
}

interface RawMorphemeDerivation {
  id?: string;
  type?: string;
  baseForm?: string;
  baseReading?: string;
}

function isPureKatakana(text: string): boolean {
  if (text.length === 0) {
    return false;
  }
  for (const ch of text) {
    if (!(("\u30A0" <= ch && ch <= "\u30FF") || KATAKANA_ONLY_CHARS.has(ch))) {
      return false;
    }
  }
  return true;
}


function posKey(pos: PosInput): PosKey {
  if (typeof pos === "string") {
    return POS0_OF_NAME[pos] ?? 0;
  }
  if (typeof pos === "number") {
    return pos & POS_KEY_MASK;
  }
  return posFromStrings(pos) & POS_KEY_MASK;
}

function entryOrderTuple(entry: MorphemeEntry): readonly [string, string, number, number, string] {
  return [
    entry.dictionaryForm ?? entry.surface ?? "",
    entry.reading ?? "",
    posKey(requiredPos(entry)),
    entry.conjugationType ?? 0,
    entry.baseForm ?? ""
  ];
}

function compareEntryOrder(left: MorphemeEntry, right: MorphemeEntry): number {
  const a = entryOrderTuple(left);
  const b = entryOrderTuple(right);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i]! < b[i]! ? -1 : 1;
    }
  }
  return 0;
}

function requiredDictionaryForm(entry: MorphemeEntry): string {
  if (entry.dictionaryForm === undefined) {
    throw new Error("morpheme entry requires dictionaryForm");
  }
  return entry.dictionaryForm;
}

function requiredReading(entry: MorphemeEntry): string {
  if (entry.reading === undefined) {
    throw new Error("morpheme entry requires reading");
  }
  return entry.reading;
}

function requiredBaseReading(entry: MorphemeEntry): string {
  if (entry.baseReading === undefined) {
    throw new Error("morpheme entry requires baseReading");
  }
  return entry.baseReading;
}

function requiredPos(entry: MorphemeEntry): HaruPos {
  if (entry.pos === undefined) {
    throw new Error("morpheme entry requires pos");
  }
  return entry.pos;
}

function tokenConjugationType(token: RuntimeHaruToken): number {
  return token.pos & POS4;
}

function tokenConjugationForm(token: RuntimeHaruToken): string {
  const pos5 = token.pos & POS5;
  if (pos5 === 0) return "";
  for (const [name, value] of Object.entries(POS5_OF_NAME)) {
    if (value === pos5) return name;
  }
  return "";
}

function indexKey(form: string, reading: string, pk: PosKey): string {
  return `${form}\0${reading}\0${pk}`;
}

function parseIndexKey(key: string): readonly [string, string, PosKey] {
  const i1 = key.indexOf("\0");
  const i2 = key.indexOf("\0", i1 + 1);
  return [key.slice(0, i1), key.slice(i1 + 1, i2), Number(key.slice(i2 + 1))];
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values === undefined) {
    map.set(key, [value]);
  } else {
    values.push(value);
  }
}


const POS_KEY_DEPTH_OVERRIDES: Record<number, number> = {
  [動詞]: 2, [形容詞0]: 2, [形状詞]: 2, [感動詞]: 2, [補助記号]: 2, [記号]: 2,
  [補助記号 | ＡＡ]: 3, [名詞_固有名詞]: 3, [名詞_普通名詞]: 3, [接尾辞_名詞的]: 3,
  [名詞_固有名詞_人名]: 4, [名詞_固有名詞_地名]: 4,
};

function posKeyNonZeroCount(pk: PosKey): number {
  return POS_KEY_DEPTH_OVERRIDES[pk] ??
    ((pk & POS3) ? 4 : (pk & POS2) ? 3 : (pk & POS1) ? 2 : (pk & POS0) ? 1 : 0);
}

function candidateRank(entry: MorphemeEntry, tokenReading: string, tokenConj: number): string {
  const readingRank = entry.reading === tokenReading ? "0" : "1";
  const posRank = String(99 - posKeyNonZeroCount(posKey(requiredPos(entry)))).padStart(2, "0");
  const entryConjugationType = entry.conjugationType ?? 0;
  const conjRank = entryConjugationType === tokenConj ? "0" : "1";
  return `${readingRank}:${posRank}:${conjRank}:${entry.dictionaryForm ?? ""}`;
}

function compareCandidateRanks(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left > right ? 1 : -1;
}

interface ColloquialIAdjectiveRestorationRule {
  readonly id: string;
  readonly contractedEnding: string;
  readonly baseEnding: string;
  readonly tier: number;
}

interface ColloquialIAdjectiveRestoration {
  readonly reading: string;
  readonly rule: ColloquialIAdjectiveRestorationRule;
}

const COLLOQUIAL_I_ADJECTIVE_RESTORATION_RULES: readonly ColloquialIAdjectiveRestorationRule[] = [
  { id: "long_e_k_ai", contractedEnding: "ケエ", baseEnding: "カイ", tier: 1 },
  { id: "long_e_k_oi", contractedEnding: "ケエ", baseEnding: "コイ", tier: 1 },
  { id: "long_e_g_ai", contractedEnding: "ゲエ", baseEnding: "ガイ", tier: 1 },
  { id: "long_e_g_oi", contractedEnding: "ゲエ", baseEnding: "ゴイ", tier: 1 },
  { id: "long_e_s_ai", contractedEnding: "セエ", baseEnding: "サイ", tier: 1 },
  { id: "long_e_s_oi", contractedEnding: "セエ", baseEnding: "ソイ", tier: 1 },
  { id: "long_e_z_ai", contractedEnding: "ゼエ", baseEnding: "ザイ", tier: 1 },
  { id: "long_e_z_oi", contractedEnding: "ゼエ", baseEnding: "ゾイ", tier: 1 },
  { id: "long_e_t_ai", contractedEnding: "テエ", baseEnding: "タイ", tier: 1 },
  { id: "long_e_t_oi", contractedEnding: "テエ", baseEnding: "トイ", tier: 1 },
  { id: "long_e_d_ai", contractedEnding: "デエ", baseEnding: "ダイ", tier: 1 },
  { id: "long_e_d_oi", contractedEnding: "デエ", baseEnding: "ドイ", tier: 1 },
  { id: "long_e_n_ai", contractedEnding: "ネエ", baseEnding: "ナイ", tier: 1 },
  { id: "long_e_n_oi", contractedEnding: "ネエ", baseEnding: "ノイ", tier: 1 },
  { id: "long_e_h_ai", contractedEnding: "ヘエ", baseEnding: "ハイ", tier: 1 },
  { id: "long_e_h_oi", contractedEnding: "ヘエ", baseEnding: "ホイ", tier: 1 },
  { id: "long_e_b_ai", contractedEnding: "ベエ", baseEnding: "バイ", tier: 1 },
  { id: "long_e_b_oi", contractedEnding: "ベエ", baseEnding: "ボイ", tier: 1 },
  { id: "long_e_m_ai", contractedEnding: "メエ", baseEnding: "マイ", tier: 1 },
  { id: "long_e_m_oi", contractedEnding: "メエ", baseEnding: "モイ", tier: 1 },
  { id: "long_e_r_ai", contractedEnding: "レエ", baseEnding: "ライ", tier: 1 },
  { id: "long_e_r_oi", contractedEnding: "レエ", baseEnding: "ロイ", tier: 1 },

  { id: "long_i_r_ui", contractedEnding: "リイ", baseEnding: "ルイ", tier: 1 },
  { id: "long_i_m_ui", contractedEnding: "ミイ", baseEnding: "ムイ", tier: 1 },
  { id: "long_i_ch_ui", contractedEnding: "チイ", baseEnding: "ツイ", tier: 1 },
  { id: "long_i_b_ui", contractedEnding: "ビイ", baseEnding: "ブイ", tier: 1 },
  { id: "long_i_n_ui", contractedEnding: "ニイ", baseEnding: "ヌイ", tier: 1 },
  { id: "long_i_g_ui", contractedEnding: "ギイ", baseEnding: "グイ", tier: 1 },

  { id: "glide_wai_koee", contractedEnding: "コエエ", baseEnding: "コワイ", tier: 2 },
  { id: "glide_yoi_tsuee", contractedEnding: "ツエエ", baseEnding: "ツヨイ", tier: 2 },
  { id: "loss_urusai_ussee", contractedEnding: "ッセエ", baseEnding: "ルサイ", tier: 2 },
  { id: "loss_kusai_kusee", contractedEnding: "クセエ", baseEnding: "クサイ", tier: 2 },
  { id: "loss_chiisai_chiisee", contractedEnding: "チイセエ", baseEnding: "チイサイ", tier: 2 },
  { id: "loss_chiisai_chissee", contractedEnding: "チッセエ", baseEnding: "チイサイ", tier: 2 }
] as const;

function isBungoAdjectiveToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 !== 形容詞0 && (token.pos & POS01) !== 接尾辞_形容詞的) {
    return false;
  }
  if (pos0 === 形容詞0 && (token.pos & POS1) === 非自立可能) {
    return false;
  }
  if (!is文語形容詞(token.pos)) {
    return false;
  }
  const conjugationForm = tokenConjugationForm(token);
  if (conjugationForm.length > 0 && !conjugationForm.startsWith("終止形") && !conjugationForm.startsWith("連体形")) {
    return false;
  }
  if (containsAsciiAlpha(token.dictionaryForm) || containsSymbolicNumeric(token.surface)) {
    return false;
  }
  return true;
}

function restoreBungoAdjectiveModernForm(
  form: string,
  reading: string,
  conjType: number
): { readonly form: string; readonly reading: string } | undefined {
  if (!form.endsWith("し") || !reading.endsWith("シ")) {
    return undefined;
  }
  if (conjType === 文語形容詞_シク) {
    return { form: `${form}い`, reading: `${reading}イ` };
  }
  if (conjType === 文語形容詞_ク) {
    return { form: `${form.slice(0, -1)}い`, reading: `${reading.slice(0, -1)}イ` };
  }
  return undefined;
}

function isColloquialIAdjectiveToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 形容詞0) {
    return false;
  }
  if ((token.pos & POS1) === 非自立可能) {
    return false;
  }
  const adjectiveConjugation = POS4_OF_NAME["形容詞"] ?? 0;
  if (adjectiveConjugation !== 0 && tokenConjugationType(token) !== adjectiveConjugation) {
    return false;
  }
  const conjugationForm = tokenConjugationForm(token);
  if (conjugationForm.length > 0 && !conjugationForm.startsWith("終止形") && !conjugationForm.startsWith("連体形")) {
    return false;
  }
  if (containsAsciiAlpha(token.dictionaryForm) || containsSymbolicNumeric(token.surface)) {
    return false;
  }
  return true;
}

function isRestorableIAdjectiveEntry(entry: MorphemeEntry, token: RuntimeHaruToken): boolean {
  const entryPos = requiredPos(entry);
  const entryPos0 = entryPos & POS0;
  const tokenPos0 = token.pos & POS0;
  if (tokenPos0 === 接尾辞) {
    if ((entryPos & POS01) !== 接尾辞_形容詞的) {
      return false;
    }
  } else {
    if (entryPos0 !== 形容詞0 || (entryPos & POS1) === 非自立可能) {
      return false;
    }
  }
  const adjectiveConjugation = POS4_OF_NAME["形容詞"] ?? 0;
  const entryConj = entry.conjugationType ?? 0;
  if (entryConj !== 0 && adjectiveConjugation !== 0 && entryConj !== adjectiveConjugation) {
    return false;
  }
  return posCompatible(token.pos, entryPos);
}

function restoreColloquialIAdjectiveReadings(contractedReading: string): readonly ColloquialIAdjectiveRestoration[] {
  if (contractedReading.length === 0) {
    return [];
  }
  const restorations: ColloquialIAdjectiveRestoration[] = [];
  const seen = new Set<string>();
  for (const rule of COLLOQUIAL_I_ADJECTIVE_RESTORATION_RULES) {
    if (!contractedReading.endsWith(rule.contractedEnding)) {
      continue;
    }
    const reading = `${contractedReading.slice(0, -rule.contractedEnding.length)}${rule.baseEnding}`;
    const key = `${reading}\0${rule.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    restorations.push({ reading, rule });
  }
  return restorations;
}

function forwardContractReading(reading: string, rule: ColloquialIAdjectiveRestorationRule): string | undefined {
  const normalized = normalizeColloquialIAdjectiveReading(reading);
  if (!normalized.endsWith(rule.baseEnding)) {
    return undefined;
  }
  return `${normalized.slice(0, -rule.baseEnding.length)}${rule.contractedEnding}`;
}

function normalizeColloquialIAdjectiveReading(reading: string): string {
  let normalized = "";
  for (const raw of reading) {
    const ch = SMALL_KANA_NORMALIZATION[raw] ?? raw;
    if (ch === "ー") {
      const prev = normalized.at(-1);
      if (prev !== undefined && KATAKANA_LONG_VOWELS.has(prev)) {
        normalized += prev;
      }
      continue;
    }
    normalized += ch;
  }
  return normalized;
}

const SMALL_KANA_NORMALIZATION: Record<string, string> = {
  "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ",
  "ぁ": "ア", "ぃ": "イ", "ぅ": "ウ", "ぇ": "エ", "ぉ": "オ"
};

const KATAKANA_LONG_VOWELS = new Set(["ア", "イ", "ウ", "エ", "オ"]);

function kanaLikeToKatakana(text: string): string {
  let result = "";
  for (const ch of text) {
    const normalized = SMALL_KANA_NORMALIZATION[ch] ?? ch;
    const code = normalized.codePointAt(0);
    if (code !== undefined && 0x3041 <= code && code <= 0x3096) {
      result += String.fromCodePoint(code + 0x60);
    } else {
      result += normalized;
    }
  }
  return normalizeColloquialIAdjectiveReading(result);
}

const GODAN_POTENTIAL_BASE_ENDINGS = [
  ["える", "う", "エル", "ウ"],
  ["ける", "く", "ケル", "ク"],
  ["げる", "ぐ", "ゲル", "グ"],
  ["せる", "す", "セル", "ス"],
  ["てる", "つ", "テル", "ツ"],
  ["ねる", "ぬ", "ネル", "ヌ"],
  ["べる", "ぶ", "ベル", "ブ"],
  ["める", "む", "メル", "ム"],
  ["れる", "る", "レル", "ル"]
] as const;

function restoreGodanPotentialBase(form: string, reading: string): { readonly form: string; readonly reading: string } | undefined {
  if (form.length === 0 || reading.length === 0) {
    return undefined;
  }
  for (const [potentialEnding, baseEnding, potentialReadingEnding, baseReadingEnding] of GODAN_POTENTIAL_BASE_ENDINGS) {
    if (!form.endsWith(potentialEnding) || !reading.endsWith(potentialReadingEnding)) {
      continue;
    }
    return {
      form: `${form.slice(0, -potentialEnding.length)}${baseEnding}`,
      reading: `${reading.slice(0, -potentialReadingEnding.length)}${baseReadingEnding}`
    };
  }
  return undefined;
}

function restoreIchidanRareruBase(form: string, reading: string): { readonly form: string; readonly reading: string } | undefined {
  if (!form.endsWith("られる") || !reading.endsWith("ラレル")) {
    return undefined;
  }
  return {
    form: `${form.slice(0, -"られる".length)}る`,
    reading: `${reading.slice(0, -"ラレル".length)}ル`
  };
}

function restoreSahenSareruBase(form: string, reading: string): { readonly form: string; readonly reading: string } | undefined {
  if (!form.endsWith("される") || !reading.endsWith("サレル")) {
    return undefined;
  }
  return {
    form: `${form.slice(0, -"される".length)}する`,
    reading: `${reading.slice(0, -"サレル".length)}スル`
  };
}

const GODAN_RERU_BASE_ENDINGS = [
  ["われる", "う", "ワレル", "ウ"],
  ["かれる", "く", "カレル", "ク"],
  ["がれる", "ぐ", "ガレル", "グ"],
  ["される", "す", "サレル", "ス"],
  ["たれる", "つ", "タレル", "ツ"],
  ["なれる", "ぬ", "ナレル", "ヌ"],
  ["ばれる", "ぶ", "バレル", "ブ"],
  ["まれる", "む", "マレル", "ム"],
  ["られる", "る", "ラレル", "ル"]
] as const;

function restoreGodanReruBase(form: string, reading: string): { readonly form: string; readonly reading: string } | undefined {
  if (form.length === 0 || reading.length === 0) {
    return undefined;
  }
  for (const [reruEnding, baseEnding, reruReadingEnding, baseReadingEnding] of GODAN_RERU_BASE_ENDINGS) {
    if (!form.endsWith(reruEnding) || !reading.endsWith(reruReadingEnding)) {
      continue;
    }
    return {
      form: `${form.slice(0, -reruEnding.length)}${baseEnding}`,
      reading: `${reading.slice(0, -reruReadingEnding.length)}${baseReadingEnding}`
    };
  }
  return undefined;
}

function isGodanVerbEntry(entry: MorphemeEntry): boolean {
  const pos = requiredPos(entry);
  const conjType = entry.conjugationType ?? 0;
  return (pos & POS0) === 動詞 && conjType >= 五段_MIN && conjType <= 五段_MAX;
}

function isIchidanVerbEntry(entry: MorphemeEntry): boolean {
  const pos = requiredPos(entry);
  const conjType = entry.conjugationType ?? 0;
  return (pos & POS0) === 動詞 && ((conjType >= 上一段_MIN && conjType <= 上一段_MAX) || (conjType >= 下一段_MIN && conjType <= 下一段_MAX));
}

function isSahenNounEntry(entry: MorphemeEntry): boolean {
  return isSahenCapableNominal({ pos: requiredPos(entry) });
}

function derivedSensesFromBase(
  senses: readonly MorphemeSense[],
  derivations: readonly MorphemeDerivation[],
  options: { readonly sahenVerbProjection?: boolean } = {}
): MorphemeSense[] {
  const groups = groupedSensesByPriority(senses);
  const generated: MorphemeSense[] = [];
  for (const group of groups) {
    let priorityInGroup = 0;
    for (const derivation of derivations) {
      const id = derivation.id ?? derivation.type ?? "lexical";
      for (const sense of group.senses) {
        const projected = options.sahenVerbProjection === true ? sahenVerbSenseFromNounSense(sense) : sense;
        generated.push({
          ...projected,
          derivation: id,
          priorityGroup: group.priorityGroup,
          priorityInGroup,
          sourceFormat: "senses"
        });
        priorityInGroup += 1;
      }
    }
  }
  return generated;
}

function groupedSensesByPriority(senses: readonly MorphemeSense[]): readonly {
  readonly priorityGroup: number;
  readonly senses: readonly MorphemeSense[];
}[] {
  const groups = new Map<number, MorphemeSense[]>();
  senses.forEach((sense, index) => {
    const group = sense.priorityGroup ?? index;
    const values = groups.get(group);
    if (values === undefined) {
      groups.set(group, [sense]);
    } else {
      values.push(sense);
    }
  });
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([priorityGroup, groupSenses]) => ({
      priorityGroup,
      senses: groupSenses
        .map((sense, index) => ({ sense, index }))
        .sort((left, right) => (left.sense.priorityInGroup ?? left.index) - (right.sense.priorityInGroup ?? right.index))
        .map(({ sense }) => sense)
    }));
}

function sahenVerbSenseFromNounSense(sense: MorphemeSense): MorphemeSense {
  const korean = sense.korean.endsWith("하다") ? sense.korean : `${sense.korean}하다`;
  return {
    ...sense,
    korean,
    koreanPos: 동사,
    irregular: sense.irregular ?? "여"
  };
}

function annotate(entry: MorphemeEntry | undefined, reason: string, ambiguousCount: number): MorphemeEntry | undefined {
  if (entry === undefined) {
    return undefined;
  }
  return {
    ...entry,
    matchReason: reason,
    ambiguousCount: ambiguousCount
  };
}

function containsAsciiAlpha(text: string): boolean {
  return /[A-Za-z]/u.test(text);
}

function containsSymbolicNumeric(text: string): boolean {
  return Array.from(text).some((char) => isPythonNumeric(char) && !isDecimalDigit(char));
}

function containsKanji(text: string): boolean {
  return Array.from(text).some(isKanji);
}

import { isKanji, isHiragana } from "../utils/char-class.js";
export { isKanji, isHiragana };

function isDecimalDigit(ch: string): boolean {
  return /^\p{Decimal_Number}$/u.test(ch);
}

function isPythonNumeric(ch: string): boolean {
  return /^\p{Number}$/u.test(ch) || CJK_NUMERIC_CHARS.has(ch);
}

export function isAllKanji(text: string): boolean {
  return text.length > 0 && Array.from(text).every(isKanji);
}

export function kanjiPrefixBeforeHiragana(text: string): string {
  const chars: string[] = [];
  for (const ch of text) {
    if (isHiragana(ch) || !isKanji(ch)) {
      break;
    }
    chars.push(ch);
  }
  return chars.join("");
}

export function kanjiPrefixCompatibleForReadingFallback(left: string, right: string): boolean {
  if (isAllKanji(left) && isAllKanji(right)) {
    return false;
  }
  const leftPrefix = kanjiPrefixBeforeHiragana(left);
  const rightPrefix = kanjiPrefixBeforeHiragana(right);
  if (leftPrefix.length === 0 || rightPrefix.length === 0) {
    return false;
  }
  const length = Math.min(leftPrefix.length, rightPrefix.length);
  return leftPrefix.slice(0, length) === rightPrefix.slice(0, length);
}
