import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { predicateStemRoot, type IrregularType } from "../../../../generator/conjugator.js";
import { PARTICLE_PAIRS, type ParticleKey } from "../../../../generator/particles.js";
import { makeParseErrorContext, parseNullableIrregular, parseString, parseStringArray } from "../../data/jsonl-parse-helpers.js";
import { isAdjectivalDerivationalSuffix, isAuxiliaryStemToken, isNaAdjCapable, isNaAdjCapableNoun, isMizenDistinctRenyouVerbToken, isNaAdjectiveDerivationalSuffix, isNominalDerivationalSuffix, isVerbalDerivationalSuffixToken, pos0in, NOMINAL_BITS, POS0, PREDICATE_BITS, 名詞, 形容詞0 } from "../../../../types/pos.js";
import type { PredicateSuffixKind } from "./grammar.js";
import { isHiragana, toKatakana } from "../../../../utils/char-class.js";

const DERIVATIONAL_SUFFIX_TABLE_RELATIVE_PATH = "head-tail/derivational_suffix_profiles.jsonl";
const ctx = makeParseErrorContext("derivational suffix profile", DERIVATIONAL_SUFFIX_TABLE_RELATIVE_PATH);

export type DerivationalSuffixSourcePos =
  | "接尾辞-形容詞的"
  | "接尾辞-形状詞的"
  | "接尾辞-動詞的"
  | "接尾辞-名詞的";

export type DerivationalSuffixHostCategory =
  | "verbal_predicate"
  | "adjectival_predicate"
  | "noun";

export type DerivationalSuffixHostForm =
  | "nominal_ki"
  | "nominal_m"
  | "attributive_present"
  | "attributive_completed"
  | "stem_root"
  | "noun_compound";

export type DerivationalSuffixResultStemKind = "adj" | "verb" | "noun" | "adverb";

export interface DerivationalSuffixProfile {
  readonly id: string;
  readonly surfaces: readonly string[];
  readonly sourcePos: DerivationalSuffixSourcePos;
  readonly hostCategories: readonly DerivationalSuffixHostCategory[];
  readonly hostForm: DerivationalSuffixHostForm;
  readonly resultStemKind: DerivationalSuffixResultStemKind;
  readonly template?: string;
  readonly formalTemplate?: string;
  readonly finalLemma?: string;
  readonly irregular?: IrregularType | null;
  readonly adverbialTemplate?: string;
  readonly legacySuffixKind?: PredicateSuffixKind;
  readonly sourceNominalUse?: true;
  readonly sourceVerbalValency?: true;
  readonly sourceNoArgumentHead?: true;
  readonly makeStateCarrier?: DerivationalSuffixMakeStateCarrier;
  readonly hostLemmas?: readonly string[];
  readonly mizenAuxiliaryHomophone?: true;
  readonly description?: string;
}

export interface DerivationalSuffixMakeStateCarrier {
  readonly particle: ParticleKey;
  readonly lemma: string;
  readonly irregular: IrregularType | null;
}

const DERIVATIONAL_SUFFIX_ROW_KEYS = new Set([
  "id",
  "surfaces",
  "sourcePos",
  "hostCategories",
  "hostForm",
  "resultStemKind",
  "template",
  "formalTemplate",
  "finalLemma",
  "irregular",
  "adverbialTemplate",
  "legacySuffixKind",
  "sourceNominalUse",
  "sourceVerbalValency",
  "sourceNoArgumentHead",
  "makeStateCarrier",
  "hostLemmas",
  "mizenAuxiliaryHomophone",
  "description"
]);

const SOURCE_POS_VALUES = new Set<DerivationalSuffixSourcePos>([
  "接尾辞-形容詞的",
  "接尾辞-形状詞的",
  "接尾辞-動詞的",
  "接尾辞-名詞的"
]);
const HOST_CATEGORY_VALUES = new Set<DerivationalSuffixHostCategory>([
  "verbal_predicate",
  "adjectival_predicate",
  "noun"
]);
const HOST_FORM_VALUES = new Set<DerivationalSuffixHostForm>([
  "nominal_ki",
  "nominal_m",
  "attributive_present",
  "attributive_completed",
  "stem_root",
  "noun_compound"
]);
const RESULT_STEM_KIND_VALUES = new Set<DerivationalSuffixResultStemKind>(["adj", "verb", "noun", "adverb"]);
const LEGACY_SUFFIX_KIND_VALUES = new Set<PredicateSuffixKind>(["ease", "difficulty"]);

export const HOST_TEMPLATE_PLACEHOLDER = "{host}";

const LANE_SUPPORTED_HOST_FORMS: Readonly<Record<DerivationalSuffixSourcePos, ReadonlySet<DerivationalSuffixHostForm>>> = {
  "接尾辞-形容詞的": new Set(["nominal_ki", "attributive_present", "stem_root"]),
  "接尾辞-動詞的": new Set(["nominal_ki", "attributive_present", "stem_root"]),
  "接尾辞-形状詞的": new Set([
    "nominal_ki",
    "nominal_m",
    "attributive_present",
    "attributive_completed",
    "stem_root",
    "noun_compound"
  ]),
  "接尾辞-名詞的": new Set([
    "nominal_ki",
    "nominal_m",
    "attributive_present",
    "attributive_completed",
    "stem_root",
    "noun_compound"
  ])
};

const LANE_SUPPORTED_RESULT_STEM_KINDS: Readonly<Record<DerivationalSuffixSourcePos, ReadonlySet<DerivationalSuffixResultStemKind>>> = {
  "接尾辞-形容詞的": new Set(["adj", "verb"]),
  "接尾辞-動詞的": new Set(["adj", "verb"]),
  "接尾辞-形状詞的": new Set(["adj", "noun"]),
  "接尾辞-名詞的": new Set(["adj", "noun"])
};

export function derivationalSuffixHostCategories(
  token: { readonly pos: number }
): readonly DerivationalSuffixHostCategory[] {
  if ((token.pos & POS0) === 形容詞0) {
    return ["adjectival_predicate"];
  }
  if (isNaAdjCapable(token)) {
    return isNaAdjCapableNoun(token)
      ? ["adjectival_predicate", "noun"]
      : ["adjectival_predicate"];
  }
  return pos0in(token.pos, NOMINAL_BITS) ? ["noun"] : ["verbal_predicate"];
}

export function resolveDerivationalSuffixProfile(
  host: { readonly pos: number; readonly dictionaryForm?: string },
  dictionaryForm: string | undefined
): DerivationalSuffixProfile | undefined {
  const categories = derivationalSuffixHostCategories(host);
  const hostHasNounAnalysis = categories.includes("noun");
  for (const category of categories) {
    const profile = profileRowFor(dictionaryForm, category);
    if (
      profile === undefined ||
      (profile.hostForm === "stem_root" && hostHasNounAnalysis) ||
      !derivationalSuffixProfileAdmitsHostToken(profile, host)
    ) {
      continue;
    }
    return profile;
  }
  return undefined;
}

function derivationalSuffixProfileAdmitsHostToken(
  profile: DerivationalSuffixProfile,
  host: { readonly pos: number; readonly dictionaryForm?: string }
): boolean {
  if (profile.hostLemmas !== undefined && !profile.hostLemmas.includes(host.dictionaryForm ?? "")) {
    return false;
  }
  return profile.mizenAuxiliaryHomophone !== true || isMizenDistinctRenyouVerbToken(host);
}

function derivationalSuffixProfileHasHostTokenCondition(profile: DerivationalSuffixProfile): boolean {
  return profile.hostLemmas !== undefined || profile.mizenAuxiliaryHomophone === true;
}

export interface DerivationalHostStemShape {
  readonly lemma: string;
  readonly koreanPrefix?: string | undefined;
  readonly koreanSuffix?: string | undefined;
}

export function derivationalHostStemRootOf(stem: DerivationalHostStemShape): string | null {
  if ((stem.koreanPrefix ?? "").length > 0 || (stem.koreanSuffix ?? "").length > 0) {
    return null;
  }
  const root = predicateStemRoot(stem.lemma);
  return root !== null && root.length > 0 && !/\s/u.test(root) ? root : null;
}

export function derivationalHostStemShapeForCandidate(
  parent: { readonly koreanPrefix?: string; readonly koreanSuffix?: string },
  candidate: { readonly lemma: string; readonly koreanPrefix?: string; readonly koreanSuffix?: string }
): DerivationalHostStemShape {
  return {
    lemma: candidate.lemma,
    koreanPrefix: `${parent.koreanPrefix ?? ""}${candidate.koreanPrefix ?? ""}`,
    koreanSuffix: `${candidate.koreanSuffix ?? ""}${parent.koreanSuffix ?? ""}`
  };
}

export interface DerivedNominalPhraseSpan {
  readonly start: number;
  readonly head: number;
  readonly profileId: string;
}

export function derivedNominalPhraseSpanAt(
  tokens: readonly {
    readonly pos: number;
    readonly surface: string;
    readonly dictionaryForm?: string;
  }[],
  idx: number
): DerivedNominalPhraseSpan | null {
  const host = tokens[idx];
  const suffix = tokens[idx + 1];
  if (
    host === undefined ||
    suffix === undefined ||
    !pos0in(host.pos, PREDICATE_BITS | NOMINAL_BITS) ||
    isAuxiliaryStemToken(host)
  ) {
    return null;
  }
  const suffixSourcePos = derivationalSuffixSourcePosOf(suffix);
  if (suffixSourcePos === null) {
    return null;
  }
  const suffixForm = suffix.dictionaryForm !== undefined && suffix.dictionaryForm.length > 0
    ? suffix.dictionaryForm
    : suffix.surface;
  const profile = resolveDerivationalSuffixProfile(host, suffixForm);
  if (
    profile === undefined ||
    profile.sourceNominalUse !== true ||
    profile.sourcePos !== suffixSourcePos
  ) {
    return null;
  }
  return { start: idx, head: idx + 1, profileId: profile.id };
}

function derivationalSuffixSourcePosOf(token: { readonly pos: number }): DerivationalSuffixSourcePos | null {
  if (isNominalDerivationalSuffix(token)) return "接尾辞-名詞的";
  if (isNaAdjectiveDerivationalSuffix(token)) return "接尾辞-形状詞的";
  if (isAdjectivalDerivationalSuffix(token)) return "接尾辞-形容詞的";
  if (isVerbalDerivationalSuffixToken(token)) return "接尾辞-動詞的";
  return null;
}

export function derivedNominalPhraseHeadIndexAt(
  tokens: readonly {
    readonly pos: number;
    readonly surface: string;
    readonly dictionaryForm?: string;
  }[],
  idx: number
): number | null {
  return derivedNominalPhraseSpanAt(tokens, idx)?.head ?? null;
}

export function isDerivedNominalPhraseHead(
  tokens: readonly {
    readonly pos: number;
    readonly surface: string;
    readonly dictionaryForm?: string;
  }[],
  idx: number
): boolean {
  return idx > 0 && derivedNominalPhraseSpanAt(tokens, idx - 1)?.head === idx;
}

export function derivedNominalPhraseStartForHead(
  tokens: readonly {
    readonly pos: number;
    readonly surface: string;
    readonly dictionaryForm?: string;
  }[],
  headIdx: number
): number {
  return isDerivedNominalPhraseHead(tokens, headIdx) ? headIdx - 1 : headIdx;
}

export function isNoArgumentRelationalNominalAt(
  tokens: readonly {
    readonly pos: number;
    readonly surface: string;
    readonly dictionaryForm?: string;
    readonly reading?: string;
  }[],
  idx: number
): boolean {
  const derived = derivedNominalPhraseSpanAt(tokens, idx);
  if (derived !== null) {
    return derivationalSuffixProfileById(derived.profileId)?.sourceNoArgumentHead === true;
  }
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 名詞 || token.reading === undefined) {
    return false;
  }
  const form = token.dictionaryForm !== undefined && token.dictionaryForm.length > 0 ? token.dictionaryForm : token.surface;
  const reading = toKatakana(token.reading);
  return DERIVATIONAL_SUFFIX_PROFILES.some((profile) => {
    if (profile.sourceNoArgumentHead !== true) {
      return false;
    }
    const kanaReadings = profile.surfaces.filter((surface) => [...surface].every(isHiragana)).map(toKatakana);
    return profile.surfaces.some((surface) =>
      form.length > surface.length &&
      form.endsWith(surface) &&
      !kanaReadings.includes(toKatakana(surface)) &&
      kanaReadings.some((kana) => reading.length > kana.length && reading.endsWith(kana))
    );
  });
}

let _cache: string | undefined;

export async function initDerivationalSuffixData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), DERIVATIONAL_SUFFIX_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const DERIVATIONAL_SUFFIX_PROFILES: readonly DerivationalSuffixProfile[] = lazyValue(() => {
  if (_cache === undefined) throw new Error("Data not initialized");
  return parseDerivationalSuffixProfilesText(_cache);
});

let _byFormAndCategory: Map<string, DerivationalSuffixProfile> | undefined;
let _legacyKindByForm: Map<string, PredicateSuffixKind> | undefined;

function profileIndex(): Map<string, DerivationalSuffixProfile> {
  if (_byFormAndCategory === undefined) {
    const map = new Map<string, DerivationalSuffixProfile>();
    for (const profile of DERIVATIONAL_SUFFIX_PROFILES) {
      for (const surface of profile.surfaces) {
        for (const category of profile.hostCategories) {
          map.set(`${surface}\u0000${category}`, profile);
        }
      }
    }
    _byFormAndCategory = map;
  }
  return _byFormAndCategory;
}

export function derivationalSuffixProfileFor(
  dictionaryForm: string | undefined,
  hostCategory: DerivationalSuffixHostCategory
): DerivationalSuffixProfile | undefined {
  const profile = profileRowFor(dictionaryForm, hostCategory);
  return profile === undefined || derivationalSuffixProfileHasHostTokenCondition(profile) ? undefined : profile;
}

function profileRowFor(
  dictionaryForm: string | undefined,
  hostCategory: DerivationalSuffixHostCategory
): DerivationalSuffixProfile | undefined {
  if (dictionaryForm === undefined || dictionaryForm.length === 0) {
    return undefined;
  }
  return profileIndex().get(`${dictionaryForm}\u0000${hostCategory}`);
}

export function isTekiDerivationSuffixToken(token: {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly splitA?: readonly { readonly surface: string; readonly dictionaryForm?: string }[];
}): boolean {
  const form = token.dictionaryForm !== undefined && token.dictionaryForm.length > 0
    ? token.dictionaryForm
    : token.surface;
  if (derivationalSuffixProfileFor(form, "noun")?.id === "teki") {
    return true;
  }
  const lastSubunit = token.splitA?.at(-1);
  if (lastSubunit === undefined) {
    return false;
  }
  const subunitForm = lastSubunit.dictionaryForm !== undefined && lastSubunit.dictionaryForm.length > 0
    ? lastSubunit.dictionaryForm
    : lastSubunit.surface;
  return derivationalSuffixProfileFor(subunitForm, "noun")?.id === "teki";
}

export function derivationalSuffixProfileById(id: string): DerivationalSuffixProfile | undefined {
  for (const profile of DERIVATIONAL_SUFFIX_PROFILES) {
    if (profile.id === id) {
      return profile;
    }
  }
  return undefined;
}

export function derivationalMakeStateCarrierOf(
  stem: { readonly derivationalBase?: { readonly profileId: string } }
): DerivationalSuffixMakeStateCarrier | null {
  const profileId = stem.derivationalBase?.profileId;
  return profileId === undefined
    ? null
    : derivationalSuffixProfileById(profileId)?.makeStateCarrier ?? null;
}

export function predicateSuffixKindForDictionaryForm(dictionaryForm: string): PredicateSuffixKind | null {
  if (_legacyKindByForm === undefined) {
    const map = new Map<string, PredicateSuffixKind>();
    for (const profile of DERIVATIONAL_SUFFIX_PROFILES) {
      if (profile.legacySuffixKind === undefined) {
        continue;
      }
      for (const surface of profile.surfaces) {
        map.set(surface, profile.legacySuffixKind);
      }
    }
    _legacyKindByForm = map;
  }
  return _legacyKindByForm.get(dictionaryForm) ?? null;
}

export function parseDerivationalSuffixProfilesText(text: string): readonly DerivationalSuffixProfile[] {
  const profiles: DerivationalSuffixProfile[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`invalid derivational suffix row at ${DERIVATIONAL_SUFFIX_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const row = raw as { readonly [key: string]: unknown };
    for (const key of Object.keys(row)) {
      if (!DERIVATIONAL_SUFFIX_ROW_KEYS.has(key)) {
        throw new Error(`unknown derivational suffix row key '${key}' at ${DERIVATIONAL_SUFFIX_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const profile = parseDerivationalSuffixProfile(row, lineNumber);
    if (ids.has(profile.id)) {
      throw new Error(ctx(`duplicate id '${profile.id}'`, lineNumber));
    }
    ids.add(profile.id);
    for (const surface of profile.surfaces) {
      for (const category of profile.hostCategories) {
        const key = `${surface}\u0000${category}`;
        if (keys.has(key)) {
          throw new Error(ctx(`duplicate surface '${surface}' for host category '${category}'`, lineNumber));
        }
        keys.add(key);
      }
    }
    profiles.push(profile);
  }
  return profiles;
}

function parseDerivationalSuffixProfile(
  row: { readonly [key: string]: unknown },
  lineNumber: number
): DerivationalSuffixProfile {
  const id = parseString(row.id, "id", ctx, lineNumber);
  const surfaces = parseStringArray(row.surfaces, "surfaces", ctx, lineNumber);
  const sourcePos = parseEnum(row.sourcePos, SOURCE_POS_VALUES, "sourcePos", lineNumber);
  const hostCategories = parseEnumArray(row.hostCategories, HOST_CATEGORY_VALUES, "hostCategories", lineNumber);
  const hostForm = parseEnum(row.hostForm, HOST_FORM_VALUES, "hostForm", lineNumber);
  const resultStemKind = parseEnum(row.resultStemKind, RESULT_STEM_KIND_VALUES, "resultStemKind", lineNumber);
  if (hostForm === "noun_compound") {
    const [category, ...rest] = hostCategories;
    if (
      rest.length !== 0 ||
      !(category === "noun" || (category === "verbal_predicate" && sourcePos === "接尾辞-名詞的"))
    ) {
      throw new Error(ctx("hostForm noun_compound requires exactly the noun host category or a verbal host of a 接尾辞-名詞的 row", lineNumber));
    }
  } else if (hostCategories.every((category) => category === "noun")) {
    throw new Error(ctx("the noun host category requires hostForm noun_compound", lineNumber));
  }
  if (hostForm === "stem_root" && hostCategories.includes("noun")) {
    throw new Error(ctx("hostForm stem_root is not admissible for the noun host category", lineNumber));
  }
  if (!LANE_SUPPORTED_HOST_FORMS[sourcePos].has(hostForm)) {
    throw new Error(ctx(`hostForm ${hostForm} is not realized for sourcePos ${sourcePos}`, lineNumber));
  }
  if (!LANE_SUPPORTED_RESULT_STEM_KINDS[sourcePos].has(resultStemKind)) {
    throw new Error(ctx(`resultStemKind ${resultStemKind} is not realized for sourcePos ${sourcePos}`, lineNumber));
  }
  const template = row.template === undefined
    ? undefined
    : parseString(row.template, "template", ctx, lineNumber);
  if ((template === undefined) !== (hostForm === "noun_compound")) {
    throw new Error(ctx("template is required for every host form except noun_compound", lineNumber));
  }
  if (template !== undefined && !template.includes(HOST_TEMPLATE_PLACEHOLDER)) {
    throw new Error(ctx("template must contain the {host} placeholder", lineNumber));
  }
  const formalTemplate = row.formalTemplate === undefined
    ? undefined
    : parseString(row.formalTemplate, "formalTemplate", ctx, lineNumber);
  if (formalTemplate !== undefined && (template === undefined || !formalTemplate.includes(HOST_TEMPLATE_PLACEHOLDER))) {
    throw new Error(ctx("formalTemplate requires template and must contain the {host} placeholder", lineNumber));
  }
  const finalLemma = row.finalLemma === undefined
    ? undefined
    : parseString(row.finalLemma, "finalLemma", ctx, lineNumber);
  const inflectingResult = resultStemKind === "adj" || resultStemKind === "verb";
  if (inflectingResult !== (finalLemma !== undefined)) {
    throw new Error(ctx("finalLemma is required exactly for inflecting result stem kinds", lineNumber));
  }
  if (finalLemma !== undefined && template !== undefined && !template.endsWith(finalLemma)) {
    throw new Error(ctx("template must end with finalLemma", lineNumber));
  }
  if (finalLemma !== undefined && formalTemplate !== undefined) {
    throw new Error(ctx("inflecting results carry register in the final lemma, not in a formalTemplate", lineNumber));
  }
  const irregular = finalLemma === undefined
    ? undefined
    : parseNullableIrregular(row.irregular, "irregular", ctx, lineNumber);
  const adverbialTemplate = row.adverbialTemplate === undefined
    ? undefined
    : parseString(row.adverbialTemplate, "adverbialTemplate", ctx, lineNumber);
  if (adverbialTemplate !== undefined && !adverbialTemplate.includes(HOST_TEMPLATE_PLACEHOLDER)) {
    throw new Error(ctx("adverbialTemplate must contain the {host} placeholder", lineNumber));
  }
  const legacySuffixKind = row.legacySuffixKind === undefined
    ? undefined
    : parseEnum(row.legacySuffixKind, LEGACY_SUFFIX_KIND_VALUES, "legacySuffixKind", lineNumber);
  if (row.sourceNominalUse !== undefined && row.sourceNominalUse !== true) {
    throw new Error(ctx("sourceNominalUse must be true when present", lineNumber));
  }
  const sourceNominalUse = row.sourceNominalUse === true;
  const verbalNounCompound = hostForm === "noun_compound" && hostCategories.includes("verbal_predicate");
  if (sourceNominalUse && (resultStemKind !== "noun" || (template === undefined && !verbalNounCompound))) {
    throw new Error(ctx("sourceNominalUse requires a noun result with a template (or a verbal-host noun_compound row)", lineNumber));
  }
  if (verbalNounCompound && !sourceNominalUse) {
    throw new Error(ctx("a verbal-host noun_compound row requires sourceNominalUse", lineNumber));
  }
  if (row.sourceVerbalValency !== undefined && row.sourceVerbalValency !== true) {
    throw new Error(ctx("sourceVerbalValency must be true when present", lineNumber));
  }
  const sourceVerbalValency = row.sourceVerbalValency === true;
  if (sourceVerbalValency && (!sourceNominalUse || !hostCategories.includes("verbal_predicate"))) {
    throw new Error(ctx("sourceVerbalValency requires sourceNominalUse on a verbal host", lineNumber));
  }
  if (row.sourceNoArgumentHead !== undefined && row.sourceNoArgumentHead !== true) {
    throw new Error(ctx("sourceNoArgumentHead must be true when present", lineNumber));
  }
  const sourceNoArgumentHead = row.sourceNoArgumentHead === true;
  if (sourceNoArgumentHead && (!sourceNominalUse || !hostCategories.includes("verbal_predicate") || sourceVerbalValency)) {
    throw new Error(ctx("sourceNoArgumentHead requires sourceNominalUse on a verbal host without sourceVerbalValency", lineNumber));
  }
  const hostLemmas = row.hostLemmas === undefined
    ? undefined
    : parseStringArray(row.hostLemmas, "hostLemmas", ctx, lineNumber);
  if (hostLemmas !== undefined && (hostLemmas.length === 0 || hostCategories.includes("noun"))) {
    throw new Error(ctx("hostLemmas must be a non-empty list on a predicate host row", lineNumber));
  }
  if (row.mizenAuxiliaryHomophone !== undefined && row.mizenAuxiliaryHomophone !== true) {
    throw new Error(ctx("mizenAuxiliaryHomophone must be true when present", lineNumber));
  }
  const mizenAuxiliaryHomophone = row.mizenAuxiliaryHomophone === true;
  if (mizenAuxiliaryHomophone && (hostCategories.length !== 1 || hostCategories[0] !== "verbal_predicate")) {
    throw new Error(ctx("mizenAuxiliaryHomophone requires exactly the verbal host category", lineNumber));
  }
  const makeStateCarrier = row.makeStateCarrier === undefined
    ? undefined
    : parseMakeStateCarrier(row.makeStateCarrier, lineNumber);
  if (makeStateCarrier !== undefined && !sourceNominalUse) {
    throw new Error(ctx("makeStateCarrier requires sourceNominalUse", lineNumber));
  }
  return {
    id,
    surfaces,
    sourcePos,
    hostCategories,
    hostForm,
    resultStemKind,
    ...(template === undefined ? {} : { template }),
    ...(formalTemplate === undefined ? {} : { formalTemplate }),
    ...(finalLemma === undefined ? {} : { finalLemma }),
    ...(irregular === undefined ? {} : { irregular }),
    ...(adverbialTemplate === undefined ? {} : { adverbialTemplate }),
    ...(legacySuffixKind === undefined ? {} : { legacySuffixKind }),
    ...(sourceNominalUse ? { sourceNominalUse: true as const } : {}),
    ...(sourceVerbalValency ? { sourceVerbalValency: true as const } : {}),
    ...(sourceNoArgumentHead ? { sourceNoArgumentHead: true as const } : {}),
    ...(makeStateCarrier === undefined ? {} : { makeStateCarrier }),
    ...(hostLemmas === undefined ? {} : { hostLemmas }),
    ...(mizenAuxiliaryHomophone ? { mizenAuxiliaryHomophone: true as const } : {}),
    ...(row.description === undefined ? {} : { description: parseString(row.description, "description", ctx, lineNumber) })
  };
}

function parseMakeStateCarrier(value: unknown, lineNumber: number): DerivationalSuffixMakeStateCarrier {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx("makeStateCarrier must be an object", lineNumber));
  }
  const carrier = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(carrier)) {
    if (key !== "particle" && key !== "lemma" && key !== "irregular") {
      throw new Error(ctx(`unknown makeStateCarrier key '${key}'`, lineNumber));
    }
  }
  return {
    particle: parseParticleKey(carrier.particle, lineNumber),
    lemma: parseString(carrier.lemma, "makeStateCarrier.lemma", ctx, lineNumber),
    irregular: parseNullableIrregular(carrier.irregular, "makeStateCarrier.irregular", ctx, lineNumber)
  };
}

function parseParticleKey(value: unknown, lineNumber: number): ParticleKey {
  if (typeof value === "string" && Object.hasOwn(PARTICLE_PAIRS, value)) {
    return value as ParticleKey;
  }
  throw new Error(ctx("makeStateCarrier.particle", lineNumber));
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  field: string,
  lineNumber: number
): T {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }
  throw new Error(ctx(field, lineNumber));
}

function parseEnumArray<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  field: string,
  lineNumber: number
): readonly T[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item): item is T => typeof item === "string" && allowed.has(item as T))
  ) {
    return value;
  }
  throw new Error(ctx(field, lineNumber));
}
