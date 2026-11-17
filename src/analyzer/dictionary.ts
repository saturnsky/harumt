/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/dictionary.rs, plugin/oov/
 *
 * Copyright (c) 2021-2024 Works Applications Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file has been modified: ported from Rust to TypeScript and adapted
 * for HaruMT.
 */
import { StatelessTokenizer } from "./stateless-tokenizer.js";
import { Config, type InlineCharCategories, type InlineUnknownConfig } from "./config.js";
import { SudachiError } from "./error.js";
import { CharacterCategory, characterCategoryRanges } from "./character-category.js";
import { CategoryType } from "./category-type.js";
import {
  type DictionaryProvider,
} from "./dictionary-provider.js";
import { Grammar, POS_DEPTH } from "./grammar.js";
import { InMemoryLexicon, LexiconSet, type InMemoryLexiconEntry, type LexiconEntry } from "./lexicon-set.js";
import { WordId } from "./word-id.js";
import {
  type InputTextPlugin,
  type PathRewritePlugin,
  DefaultInputTextPlugin,
  ProlongedSoundMarkPlugin,
  JoinNumericPlugin,
  JoinKatakanaOovPlugin
} from "./plugin.js";

const utf8Encoder = new TextEncoder();

export interface DictionaryPlugins {
  inputText?: InputTextPlugin[];
  pathRewrite?: PathRewritePlugin[];
}

export class Dictionary {
  simpleOov: SimpleOovSpec | undefined;
  oovProviders: OovProviderSpec[] = [];
  inputTextPlugins: InputTextPlugin[] = [];
  pathRewritePlugins: PathRewritePlugin[] = [];
  private supplementalLexiconAdded = false;
  private constructor(
    readonly grammar: Grammar,
    readonly lexicons: LexiconSet
  ) {}

  static async fromConfig(
    config: Config,
    provider: DictionaryProvider,
    plugins?: DictionaryPlugins
  ): Promise<Dictionary> {
    const grammar = await provider.readGrammar(config);
    const lexicon = await provider.readLexicon(config);
    const dictionary = new Dictionary(grammar, new LexiconSet([lexicon]));
    const characterCategorySource: string | InlineCharCategories =
      config.inlineRuntimeConfig?.charCategories ??
      await provider.readText(config.characterDefinitionFile);
    dictionary.grammar.characterCategory = typeof characterCategorySource === "string"
      ? CharacterCategory.fromString(characterCategorySource)
      : CharacterCategory.fromConfig(characterCategorySource);

    dictionary.inputTextPlugins = plugins?.inputText ??
      await dictionary.createDefaultInputTextPlugins(config, provider);
    dictionary.pathRewritePlugins = plugins?.pathRewrite ??
      dictionary.createDefaultPathRewritePlugins();
    await dictionary.configureOovProviders(config, provider);
    assertWhitespaceTokenContract(
      characterCategorySource,
      (posId) => dictionary.grammar.posComponents(posId),
      dictionary.oovProviders,
      dictionary.inputTextPlugins
    );

    for (const userLexicon of await provider.readUserLexicons(config, dictionary.grammar)) {
      dictionary.lexicons.add(userLexicon);
    }

    dictionary.lexicons.freezeSystemLexicons();
    return dictionary;
  }

  addUserDictionaryBytes(bytes: Uint8Array): void {
    const entries = parsePersonNameUserDictionary(bytes, this.grammar);
    if (entries !== undefined) {
      this.lexicons.add(new InMemoryLexicon(entries));
    }
  }

  addUserLexicon(entries: readonly UserLexiconEntry[]): void {
    const lexiconEntries = entriesToInMemoryLexicon(entries, this.grammar);
    if (lexiconEntries.length > 0) {
      this.lexicons.add(new InMemoryLexicon(lexiconEntries));
    }
  }

  addSupplementalLexicon(entries: readonly UserLexiconEntry[]): void {
    const resolved = this.resolveSupplementalLexicon(entries);
    if (resolved !== undefined) {
      this.addResolvedSupplementalLexicon(resolved);
    }
  }

  resolveSupplementalLexicon(
    entries: readonly UserLexiconEntry[]
  ): ResolvedSupplementalLexicon | undefined {
    if (entries.length === 0) {
      return undefined;
    }
    const supplementalDicId = this.requireSupplementalLexiconSlot();
    const resolvedSplits = this.resolveSupplementalSplits(entries, supplementalDicId);
    const lexiconEntries = entriesToInMemoryLexicon(entries, this.grammar, resolvedSplits);
    return {
      dictionaryId: supplementalDicId,
      entries: lexiconEntries,
      posRegistrations: collectPosRegistrations(entries, lexiconEntries)
    };
  }

  addResolvedSupplementalLexicon(resolved: ResolvedSupplementalLexicon): void {
    const supplementalDicId = this.requireSupplementalLexiconSlot();
    if (resolved.dictionaryId !== supplementalDicId) {
      throw new SudachiError({
        code: "LexiconSetError",
        message:
          `Resolved supplemental lexicon targets dictionary slot ${resolved.dictionaryId}, ` +
          `but the current slot is ${supplementalDicId}.`
      });
    }
    for (const registration of resolved.posRegistrations) {
      const actualPosId = this.grammar.registerPos(registration.pos);
      if (actualPosId !== registration.posId) {
        throw new SudachiError({
          code: "LexiconSetError",
          message:
            `Resolved supplemental POS id ${registration.posId} does not match ` +
            `the current grammar id ${actualPosId}.`
        });
      }
    }
    this.lexicons.add(new InMemoryLexicon(resolved.entries));
    this.lexicons.freezeSystemLexicons();
    this.supplementalLexiconAdded = true;
  }

  private requireSupplementalLexiconSlot(): number {
    if (this.supplementalLexiconAdded) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: "Only one supplemental lexicon may be added."
      });
    }
    if (this.lexicons.lexiconCount > this.lexicons.frozenLexiconCount) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: "Supplemental lexicons must be added before any user dictionary."
      });
    }
    const supplementalDicId = this.lexicons.lexiconCount;
    if (supplementalDicId > 14) {
      throw new SudachiError({
        code: "LexiconSetError",
        message: `Cannot add supplemental lexicon: dictionary slot ${supplementalDicId} exceeds the maximum of 14.`
      });
    }
    return supplementalDicId;
  }

  private resolveSupplementalSplits(
    entries: readonly UserLexiconEntry[],
    supplementalDicId: number
  ): ResolvedSplit[] {
    const batchIndexMap = new Map<string, number>();
    entries.forEach((entry, index) => {
      const key = splitComponentKey(entry.surface, entry.reading, entry.pos);
      if (!batchIndexMap.has(key)) {
        batchIndexMap.set(key, index);
      }
    });
    const systemComponentMemo = new Map<string, ResolvedSystemSplitComponent | null>();
    const resolved = entries.map((entry) => {
      const parentByteLength = utf8Encoder.encode(entry.surface).byteLength;
      return {
        aUnitSplit: this.resolveSplitUnit(
          entry.aUnitSplit, parentByteLength, supplementalDicId, batchIndexMap, entries, systemComponentMemo
        ),
        bUnitSplit: this.resolveSplitUnit(
          entry.bUnitSplit, parentByteLength, supplementalDicId, batchIndexMap, entries, systemComponentMemo
        )
      };
    });
    return resolved;
  }

  private resolveSplitUnit(
    refs: readonly SplitComponentRef[] | undefined,
    parentByteLength: number,
    supplementalDicId: number,
    batchIndexMap: Map<string, number>,
    entries: readonly UserLexiconEntry[],
    systemComponentMemo: Map<string, ResolvedSystemSplitComponent | null>
  ): WordId[] {
    if (refs === undefined || refs.length === 0) {
      return [];
    }
    const resolved: { wordId: WordId; byteLength: number }[] = [];
    for (const ref of refs) {
      const batchIndex = batchIndexMap.get(splitComponentKey(ref.surface, ref.reading, ref.pos));
      const batchEntry = batchIndex === undefined ? undefined : entries[batchIndex];
      if (batchIndex !== undefined && batchEntry !== undefined) {
        resolved.push({
          wordId: WordId.new(supplementalDicId, batchIndex),
          byteLength: utf8Encoder.encode(batchEntry.surface).byteLength
        });
        continue;
      }
      const componentKey = splitComponentKey(ref.surface, ref.reading, ref.pos);
      let systemComponent = systemComponentMemo.get(componentKey);
      if (systemComponent === undefined) {
        const wordId = this.resolveSystemSplitComponent(ref);
        systemComponent = wordId === undefined
          ? null
          : {
              wordId,
              byteLength: this.lexicons.getWordInfo(wordId).headWordLength()
            };
        systemComponentMemo.set(componentKey, systemComponent);
      }
      if (systemComponent === null) {
        return [];
      }
      resolved.push(systemComponent);
    }
    const totalByteLength = resolved.reduce((sum, component) => sum + component.byteLength, 0);
    if (totalByteLength !== parentByteLength) {
      return [];
    }
    return resolved.map((component) => component.wordId);
  }

  private resolveSystemSplitComponent(ref: SplitComponentRef): WordId | undefined {
    const surfaceByteLength = utf8Encoder.encode(ref.surface).byteLength;
    let best: WordId | undefined;
    for (const candidate of this.lexicons.lookup(ref.surface, 0)) {
      if (candidate.wordId.dic() !== 0 || candidate.end !== surfaceByteLength) {
        continue;
      }
      const info = this.lexicons.getWordInfo(candidate.wordId);
      if (info.surface() !== ref.surface) {
        continue;
      }
      if (info.readingForm() !== ref.reading) {
        continue;
      }
      if (!posTupleMatches(this.grammar, info.posId(), ref.pos)) {
        continue;
      }
      if (best === undefined || candidate.wordId.word() < best.word()) {
        best = candidate.wordId;
      }
    }
    return best;
  }

  replaceUserLexicon(entries: readonly UserLexiconEntry[]): void {
    const lexiconEntries = entriesToInMemoryLexicon(entries, this.grammar);
    const lexicons: InMemoryLexicon[] = [];
    if (lexiconEntries.length > 0) {
      lexicons.push(new InMemoryLexicon(lexiconEntries));
    }
    this.lexicons.replaceUserLexicons(lexicons);
  }

  lookup(text: string, byteOffset = 0): LexiconEntry[] {
    return this.lexicons.lookup(text, byteOffset);
  }

  createTokenizer(): StatelessTokenizer {
    return new StatelessTokenizer(this);
  }
 
  private async createDefaultInputTextPlugins(
    config: Config,
    provider: DictionaryProvider
  ): Promise<InputTextPlugin[]> {
    const plugins: InputTextPlugin[] = [];
    const inline = config.inlineRuntimeConfig;
    if (inline?.ignoreNormalize !== undefined || inline?.replaceChars !== undefined) {
      plugins.push(DefaultInputTextPlugin.fromConfig({
        ...(inline.ignoreNormalize !== undefined && { ignoreNormalize: inline.ignoreNormalize }),
        ...(inline.replaceChars !== undefined && { replaceChars: inline.replaceChars })
      }));
    } else {
      try {
        const rewriteText = await provider.readText("rewrite.def");
        plugins.push(DefaultInputTextPlugin.fromRewriteText(rewriteText));
      } catch {
      }
    }
    plugins.push(new ProlongedSoundMarkPlugin());
    return plugins;
  }

  private createDefaultPathRewritePlugins(): PathRewritePlugin[] {
    const numericPosId = this.grammar.registerPos(["名詞", "数詞", "*", "*", "*", "*"]);
    const oovPosId = this.grammar.registerPos(["名詞", "普通名詞", "一般", "*", "*", "*"]);
    return [
      new JoinNumericPlugin(numericPosId),
      new JoinKatakanaOovPlugin(oovPosId)
    ];
  }

  private async configureOovProviders(config: Config, provider: DictionaryProvider): Promise<void> {
    const inline = config.inlineRuntimeConfig;
    const oovConfig = inline?.oovProvider;
    if (oovConfig?.mecab !== undefined) {
      this.oovProviders.push(await this.createMeCabOovAsync(config, provider));
    }
    if (oovConfig?.regex !== undefined) {
      for (const regexConfig of oovConfig.regex) {
        this.oovProviders.push(this.createRegexOov(regexConfig));
      }
    }
    if (oovConfig?.simple !== undefined) {
      const simple = this.createSimpleOov(oovConfig.simple);
      this.simpleOov = simple;
      this.oovProviders.push(simple);
    }
  }

  private createRegexOov(regexConfig: {
    pos?: string[];
    leftId?: number;
    rightId?: number;
    cost?: number;
    regex?: string;
    maxLength?: number;
    boundaries?: "strict" | "relaxed";
  }): RegexOovProviderSpec {
    const pattern = typeof regexConfig.regex === "string"
      ? regexConfig.regex.startsWith("^") ? regexConfig.regex : `^${regexConfig.regex}`
      : "^$";
    return {
      kind: "regex",
      regex: new RegExp(pattern, "u"),
      leftId: numberSetting(regexConfig.leftId, 0),
      rightId: numberSetting(regexConfig.rightId, 0),
      cost: numberSetting(regexConfig.cost, 0),
      posId: this.grammar.registerPos(posArray(regexConfig.pos)),
      maxLength: numberSetting(regexConfig.maxLength, 32),
      boundaries: regexConfig.boundaries === "relaxed" ? "relaxed" : "strict"
    };
  }

  private createSimpleOov(simple: {
    pos?: string[];
    posId?: string[] | number;
    leftId?: number;
    rightId?: number;
    cost?: number;
  }): SimpleOovSpec {
    const posId = typeof simple.posId === "number"
      ? simple.posId
      : this.grammar.registerPos(posArray(simple.pos ?? simple.posId));
    return {
      kind: "simple",
      leftId: numberSetting(simple.leftId, 0),
      rightId: numberSetting(simple.rightId, 0),
      cost: numberSetting(simple.cost, 30000),
      posId
    };
  }

  private async createMeCabOovAsync(
    config: Config,
    provider: DictionaryProvider
  ): Promise<MeCabOovProviderSpec> {
    const categories = config.inlineRuntimeConfig?.charCategories === undefined
      ? parseCategoryInfo(await provider.readText("char.def"))
      : parseCategoryInfoConfig(config.inlineRuntimeConfig.charCategories);
    const oovList = config.inlineRuntimeConfig?.unknowns === undefined
      ? parseUnkDef(await provider.readText("unk.def"), categories, this.grammar)
      : parseUnknownConfig(config.inlineRuntimeConfig.unknowns, categories, this.grammar);
    return { kind: "mecab", categories, oovList };
  }
}


export interface SplitComponentRef {
  readonly surface: string;
  readonly reading: string;
  readonly pos: readonly string[];
}

export interface UserLexiconEntry {
  readonly surface: string;
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly pos: readonly string[];
  readonly reading: string;
  readonly synonymGroupIds?: readonly number[];
  readonly dictionaryForm?: string;
  readonly normalizedForm?: string;
  readonly dictionaryFormIndex?: number;
  readonly aUnitSplit?: readonly SplitComponentRef[];
  readonly bUnitSplit?: readonly SplitComponentRef[];
}

export interface ResolvedSupplementalLexicon {
  readonly dictionaryId: number;
  readonly entries: readonly InMemoryLexiconEntry[];
  readonly posRegistrations: readonly SupplementalPosRegistration[];
}

export interface SupplementalLexiconMemoryCache {
  resolved?: ResolvedSupplementalLexicon;
}

interface SupplementalPosRegistration {
  readonly pos: readonly string[];
  readonly posId: number;
}

interface ResolvedSplit {
  readonly aUnitSplit: WordId[];
  readonly bUnitSplit: WordId[];
}

interface ResolvedSystemSplitComponent {
  readonly wordId: WordId;
  readonly byteLength: number;
}

interface PersonNameUserDictionaryData {
  readonly format: "sudachi-js-person-user-dict-v1";
  readonly entries: readonly UserLexiconEntry[];
}

export interface SimpleOovSpec {
  readonly kind: "simple";
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly posId: number;
}

export interface MeCabOovProviderSpec {
  readonly kind: "mecab";
  readonly categories: Map<number, CategoryInfo>;
  readonly oovList: Map<number, OovSpec[]>;
}

export interface RegexOovProviderSpec {
  readonly kind: "regex";
  readonly regex: RegExp;
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly posId: number;
  readonly maxLength: number;
  readonly boundaries: "strict" | "relaxed";
}

export type OovProviderSpec =
  | SimpleOovSpec
  | MeCabOovProviderSpec
  | RegexOovProviderSpec;

export interface CategoryInfo {
  readonly categoryType: CategoryType;
  readonly isInvoke: boolean;
  readonly isGroup: boolean;
  readonly length: number;
}

export interface OovSpec {
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly posId: number;
}

const WHITE_SPACE = /\p{White_Space}/u;

const WHITESPACE_POS0 = "空白";

const CONTRACT_VIOLATION_SAMPLE_LIMIT = 8;

export function assertWhitespaceTokenContract(
  characterCategorySource: string | InlineCharCategories,
  posComponentsOf: (posId: number) => readonly string[],
  oovProviders: readonly OovProviderSpec[],
  inputTextPlugins: readonly InputTextPlugin[] = []
): void {
  const offending: string[] = [];
  for (const range of characterCategoryRanges(characterCategorySource)) {
    if (!range.names.includes("SPACE")) {
      continue;
    }
    for (let codePoint = range.begin; codePoint < range.end; codePoint += 1) {
      if (WHITE_SPACE.test(String.fromCodePoint(codePoint))) {
        continue;
      }
      offending.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
      if (offending.length >= CONTRACT_VIOLATION_SAMPLE_LIMIT) {
        break;
      }
    }
    if (offending.length >= CONTRACT_VIOLATION_SAMPLE_LIMIT) {
      break;
    }
  }
  if (offending.length > 0) {
    throw new SudachiError({
      code: "ConfigError",
      message:
        "charCategories SPACE maps non-White_Space code points " +
        `(${offending.join(", ")}); whitespace runs are defined by the Unicode White_Space property`
    });
  }

  for (const spec of oovProviders) {
    for (const [categoryBits, posId] of oovEmittedPosIds(spec)) {
      if (posComponentsOf(posId)[0] !== WHITESPACE_POS0) {
        continue;
      }
      if (spec.kind === "mecab" && categoryBits === CategoryType.SPACE.bits) {
        continue;
      }
      const category = categoryBits === null
        ? "(category-independent)"
        : new CategoryType(categoryBits).toString();
      throw new SudachiError({
        code: "ConfigError",
        message:
          `oov provider "${spec.kind}" emits ${WHITESPACE_POS0} POS for category ${category}; ` +
          "whitespace is not a token in the translation pipeline"
      });
    }
  }

  for (const plugin of inputTextPlugins) {
    if (!(plugin instanceof DefaultInputTextPlugin)) {
      continue;
    }
    const violations = plugin.whitespaceCreatingReplacements();
    if (violations.length > 0) {
      throw new SudachiError({
        code: "ConfigError",
        message:
          "replaceChars rewrites non-whitespace into whitespace " +
          `(${violations.map(([from, to]) => `${JSON.stringify(from)}->${JSON.stringify(to)}`).join(", ")}); ` +
          "input rewriting must not create whitespace"
      });
    }
  }
}

function oovEmittedPosIds(spec: OovProviderSpec): readonly (readonly [number | null, number])[] {
  if (spec.kind === "mecab") {
    return [...spec.oovList].flatMap(([categoryBits, specs]) =>
      specs.map((entry) => [categoryBits, entry.posId] as const));
  }
  return [[null, spec.posId] as const];
}

function numberSetting(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function parsePersonNameUserDictionary(
  bytes: Uint8Array,
  grammar: Grammar
): InMemoryLexiconEntry[] | undefined {
  const text = new TextDecoder().decode(bytes).trim();
  if (!text.startsWith("{")) {
    return undefined;
  }
  let data: PersonNameUserDictionaryData;
  try {
    data = JSON.parse(text) as PersonNameUserDictionaryData;
  } catch {
    return undefined;
  }
  if (data.format !== "sudachi-js-person-user-dict-v1" || !Array.isArray(data.entries)) {
    return undefined;
  }

  return entriesToInMemoryLexicon(
    [...data.entries].sort(personNameRuntimeOrder),
    grammar
  );
}

function personNameRuntimeOrder(
  left: PersonNameUserDictionaryData["entries"][number],
  right: PersonNameUserDictionaryData["entries"][number]
): number {
  return personNameRank(left.pos[3]) - personNameRank(right.pos[3]);
}

function personNameRank(subcategory: unknown): number {
  switch (subcategory) {
    case "名":
      return 0;
    case "姓":
      return 1;
    default:
      return 2;
  }
}

function safeLeftId(id: number, grammar: Grammar): number {
  return id >= 0 && id < grammar.connection.numLeft ? id : 0;
}

function safeRightId(id: number, grammar: Grammar): number {
  return id >= 0 && id < grammar.connection.numRight ? id : 0;
}

function entriesToInMemoryLexicon(
  entries: readonly UserLexiconEntry[],
  grammar: Grammar,
  resolvedSplits?: readonly ResolvedSplit[]
): InMemoryLexiconEntry[] {
  return entries.map((entry, index) => {
    const pos = entry.pos.filter((value: unknown): value is string => typeof value === "string");
    const splits = resolvedSplits?.[index];
    return {
      surface: entry.surface,
      leftId: safeLeftId(entry.leftId, grammar),
      rightId: safeRightId(entry.rightId, grammar),
      cost: entry.cost,
      wordInfo: {
        surface: entry.surface,
        headWordLength: utf8Encoder.encode(entry.surface).byteLength,
        posId: grammar.registerPos(pos),
        normalizedForm: entry.normalizedForm ?? entry.surface,
        dictionaryFormWordId: entry.dictionaryFormIndex ?? -1,
        dictionaryForm: entry.dictionaryForm ?? entry.surface,
        readingForm: entry.reading,
        aUnitSplit: splits?.aUnitSplit ?? [],
        bUnitSplit: splits?.bUnitSplit ?? [],
        wordStructure: [],
        synonymGroupIds: [...(entry.synonymGroupIds ?? [])]
      }
    };
  });
}

function collectPosRegistrations(
  entries: readonly UserLexiconEntry[],
  lexiconEntries: readonly InMemoryLexiconEntry[]
): SupplementalPosRegistration[] {
  const registrations = new Map<string, SupplementalPosRegistration>();
  entries.forEach((entry, index) => {
    const pos = entry.pos.filter((value: unknown): value is string => typeof value === "string");
    const posId = lexiconEntries[index]!.wordInfo.posId;
    registrations.set(pos.join("\u001f"), { pos, posId });
  });
  return [...registrations.values()];
}

function splitComponentKey(surface: string, reading: string, pos: readonly string[]): string {
  return `${surface}\t${reading}\t${pos.join("|")}`;
}

function posTupleMatches(grammar: Grammar, posId: number, refPos: readonly string[]): boolean {
  if (refPos.length !== POS_DEPTH) {
    return false;
  }
  const components = grammar.posComponents(posId);
  return components.every((component, index) => component === refPos[index]);
}

function parseCategoryInfo(data: string): Map<number, CategoryInfo> {
  const categories = new Map<number, CategoryInfo>();
  for (const rawLine of data.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (
      line.length === 0 ||
      line.startsWith("#") ||
      line.startsWith("0x")
    ) {
      continue;
    }

    const [categoryName, invoke, group, length] = line.split(/\s+/u);
    if (
      categoryName === undefined ||
      invoke === undefined ||
      group === undefined ||
      length === undefined
    ) {
      continue;
    }
    const categoryType = CategoryType.parse(categoryName);
    categories.set(categoryType.bits, {
      categoryType,
      isInvoke: invoke === "1",
      isGroup: group === "1",
      length: Number.parseInt(length, 10)
    });
  }
  return categories;
}

function parseCategoryInfoConfig(data: InlineCharCategories): Map<number, CategoryInfo> {
  const categories = new Map<number, CategoryInfo>();
  for (const [categoryName, config] of Object.entries(data)) {
    const categoryType = CategoryType.parse(categoryName);
    categories.set(categoryType.bits, {
      categoryType,
      isInvoke: config.invoke === true,
      isGroup: config.group !== false,
      length: numberSetting(config.length, 0)
    });
  }
  return categories;
}

function parseUnkDef(
  data: string,
  categories: Map<number, CategoryInfo>,
  grammar: Grammar
): Map<number, OovSpec[]> {
  const oovList = new Map<number, OovSpec[]>();
  for (const [lineIndex, rawLine] of data.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const cols = line.split(",");
    if (cols.length < 10) {
      throw SudachiError.invalidDataFormat(lineIndex, `Invalid number of columns (${line})`);
    }
    const categoryType = CategoryType.parse(cols[0] ?? "");
    if (!categories.has(categoryType.bits)) {
      throw SudachiError.invalidDataFormat(
        lineIndex,
        `${cols[0]} is undefined in char definition`
      );
    }
    const oov: OovSpec = {
      leftId: Number.parseInt(cols[1] ?? "0", 10),
      rightId: Number.parseInt(cols[2] ?? "0", 10),
      cost: Number.parseInt(cols[3] ?? "0", 10),
      posId: grammar.registerPos(cols.slice(4, 10))
    };
    const current = oovList.get(categoryType.bits) ?? [];
    current.push(oov);
    oovList.set(categoryType.bits, current);
  }
  return oovList;
}

function parseUnknownConfig(
  data: readonly InlineUnknownConfig[],
  categories: Map<number, CategoryInfo>,
  grammar: Grammar
): Map<number, OovSpec[]> {
  const oovList = new Map<number, OovSpec[]>();
  for (const [index, unknown] of data.entries()) {
    const categoryName = unknown.category ?? "";
    const categoryType = CategoryType.parse(categoryName);
    if (!categories.has(categoryType.bits)) {
      throw SudachiError.invalidDataFormat(
        index,
        `${categoryName} is undefined in character categories`
      );
    }
    const posIdValue = unknown.posId;
    const pos = posArray(unknown.pos ?? posIdValue);
    if (typeof posIdValue !== "number" && pos.length !== 6) {
      throw SudachiError.invalidDataFormat(
        index,
        `unknowns[${index}].pos must contain 6 strings`
      );
    }
    const oov: OovSpec = {
      leftId: numberSetting(unknown.leftId, 0),
      rightId: numberSetting(unknown.rightId, 0),
      cost: numberSetting(unknown.cost, 0),
      posId: typeof posIdValue === "number" ? posIdValue : grammar.registerPos(pos)
    };
    const current = oovList.get(categoryType.bits) ?? [];
    current.push(oov);
    oovList.set(categoryType.bits, current);
  }
  return oovList;
}

function posArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
