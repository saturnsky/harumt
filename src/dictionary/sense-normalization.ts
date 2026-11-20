
import { asIrregular, type IrregularType } from "../generator/conjugator.js";
import {
  FRAME_AUTHORED_LEXICAL_CONDITION_KEYS,
  FRAME_CHAIN_CONDITION_KEYS,
  FRAME_CLAUSE_CONDITION_KEYS,
  FRAME_CLAUSE_SLOT_MARKERS,
  FRAME_CONDITIONAL_LEXICAL_CONDITION_KEYS,
  FRAME_FORBIDDEN_LEXICAL_CONDITION_KEYS,
  FRAME_PARTICIPANT_CONDITION_POSITIONS,
  FRAME_PARTICLE_POSITIONS,
  FRAME_SLOT_BINDINGS,
  PARTICLE_POSITION_PREDICATE_ADJACENT,
  PREDICATE_ADJACENT_PARTICLE_SURFACES,
  SEMANTIC_FRAME_CATEGORIES,
  SLOT_BINDING_ARGUMENT,
  SLOT_BINDING_ADNOMINAL_HEAD,
  SLOT_BINDING_ADNOMINAL_NO,
  SLOT_TYPE_CLAUSE,
  SLOT_TYPE_NOUN
} from "../pipeline/semantics/frame.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { EXTENT_PHRASE_KINDS } from "../pipeline/semantics/extent-phrase.js";
import type { LookupTables } from "../pipeline/lookup-tables.js";
import { camelizeKeys } from "./data-section.js";
import type { KoreanPoliteForms } from "../types/dictionary.js";
import { POS0, POS0_OF_NAME, POS1, POS2, POS3, KOPOS_OF_NAME, posFromStrings, 動詞, 감탄사 } from "../types/pos.js";

export class SenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SenseValidationError";
  }
}

interface Mapping {
  [key: string]: unknown;
}

type SenseCasePreferences = readonly string[] | { readonly [particle: string]: unknown };
type SenseConnectivePreferences = { readonly [connective: string]: unknown };
type SenseRoleRealization = { readonly [role: string]: unknown } | null;
type SensePlacement = { readonly type: "after_next_extent_phrase" };

export interface SenseRendering extends Mapping {
  korean?: string;
  koreanPos?: number;
  irregular?: IrregularType | null;
  koreanHonorific?: string;
  koreanPolite?: KoreanPoliteForms;
  koreanPrefix?: string;
  koreanSuffix?: string;
  nameRole?: string | boolean;
  kaForm?: string;
  connectiveRole?: string;
  teIruResultative?: boolean;
  teIruDropAux?: boolean;
  teIruContractToPast?: boolean;
  dropFirstNegativeAux?: boolean;
  dropFirstPassiveAux?: boolean;
  dropFirstCausativeAux?: boolean;
  shortNegationPolicy?: "sahen_split" | "lexical_prefix" | "long_only";
  casePreferences?: SenseCasePreferences;
  connectivePreferences?: SenseConnectivePreferences;
  caseRealization?: SenseRoleRealization;
  slotRealization?: SenseRoleRealization;
  placement?: SensePlacement;
  transliteration?: boolean;
  adverbial?: string;
  nominalized?: string;
}

export interface SenseSlot extends Mapping {
  role?: string;
  slotType?: "clause" | "noun" | string;
  particles?: readonly string[];
  nounLookup?: readonly string[];
  lookup?: readonly string[];
  markers?: readonly string[];
  bare?: boolean;
}

export interface SenseFrame extends Mapping {
  id?: string;
  frameId?: string;
  slots?: readonly SenseSlot[];
  connectivePreferences?: SenseConnectivePreferences;
}

export interface SenseObject extends Mapping {
  derivation?: string;
  frame?: SenseFrame;
  frames?: readonly SenseFrame[];
  constructions?: readonly SenseConstruction[];
  adverbializations?: readonly SenseAdverbialization[];
  rendering?: SenseRendering;
}

export interface SenseAdverbializationProjection extends Mapping {
  kind?: "nominalAdverbial" | string;
  suffix?: string;
}

export interface SenseAdverbialization extends Mapping {
  particle?: string;
  kind?: string;
  consumeParticle?: boolean;
  following?: {
    adverbialScope?: boolean;
    requestOrImperative?: boolean;
    blockedNextDictionaryForms?: readonly string[];
  };
  rendering?: SenseRendering;
  projection?: SenseAdverbializationProjection;
}

export interface SenseCarrierIdiomConstruction extends Mapping {
  type: "carrier_idiom";
  particle: string;
  verb: string;
  koreanCarrier: string;
  irregular?: IrregularType | null;
}

export type SenseConstruction = SenseCarrierIdiomConstruction;

export interface NormalizedSense extends SenseRendering {
  korean: string;
  entryId: string;
  intrinsicHonorific?: boolean;
  derivation?: string;
  constructions?: readonly SenseConstruction[];
  adverbializations?: readonly NormalizedSenseAdverbialization[];
  senseFrame?: SenseFrame;
  senseFrames?: readonly SenseFrame[];
  senseCaseRealization?: unknown;
  senseSlotRealization?: unknown;
  senseIndex?: number;
  priorityGroup?: number;
  priorityInGroup?: number;
  sourceFormat?: "senses";
}

export interface NormalizedSenseAdverbialization extends Mapping {
  particle: string;
  kind: string;
  consumeParticle?: boolean;
  following?: {
    adverbialScope?: boolean;
    requestOrImperative?: boolean;
    blockedNextDictionaryForms?: readonly string[];
  };
  rendering?: SenseRendering & {
    korean: string;
  };
  projection?: SenseAdverbializationProjection & {
    kind: "nominalAdverbial";
    suffix: string;
  };
}

export type NormalizedSenseFrame = SenseFrame;

export interface SenseDictionaryEntry extends Mapping {
  aliasOf?: string | { readonly dictionaryForm: string; readonly reading: string; readonly pos: readonly string[] };
  baseForm?: string;
  baseReading?: string;
  derivations?: readonly { readonly id?: string; readonly type?: string }[];
  surface?: string;
  senses?: readonly SenseObject[] | readonly (readonly SenseObject[])[];
  sourceFormat?: "senses";
}

const ENTRY_ID_POS_MASK = POS0 | POS1 | POS2 | POS3;

export function mintMorphemeEntryId(entry: SenseDictionaryEntry, source?: string): string {
  const record = entry as Record<string, unknown>;
  const surface = stringField(record, "surface");
  const dictionaryForm = stringField(record, "dictionaryForm", "dictionary_form");
  const reading = stringField(record, "reading");
  const pos = record.pos;
  const entryPosKey = typeof pos === "number"
    ? pos & ENTRY_ID_POS_MASK
    : Array.isArray(pos) && pos.every((value): value is string => typeof value === "string")
      ? posFromStrings(pos) & ENTRY_ID_POS_MASK
      : null;
  if ((surface === null && dictionaryForm === null) || reading === null || entryPosKey === null) {
    throw new SenseValidationError(msg("rendering-bearing entry requires identity coordinates", source));
  }
  const namespace = surface === null ? "dict" : "surface";
  const form = surface ?? dictionaryForm!;
  return [namespace, JSON.stringify([form, reading, entryPosKey, canonicalEntrySource(source)])].join(":");
}

function stringField(record: Record<string, unknown>, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function canonicalEntrySource(source: string | undefined): string {
  const withoutLine = (source ?? "<inline>").replace(/:\d+$/u, "");
  const dictionaryRoot = withoutLine.lastIndexOf("data/dict/");
  return dictionaryRoot < 0 ? withoutLine : withoutLine.slice(dictionaryRoot);
}

function normalizeSenseMapping(value: Mapping): Mapping {
  return camelizeKeys(value) as Mapping;
}

const SOURCE_FRAME_FIELDS = new Set([
  "id", "frameId", "slots", "chainConditions",
  "lexicalConditions", "clauseConditions", "participantConditions",
  "connectiveRole", "connectivePreferences", "minEvidence", "default"
]);

const TOP_LEVEL_SENSE_FORBIDDEN_FIELDS = new Set([
  "adverbial",
  "nominalized",
  "casePreferences", "context", "dropFirstCausativeAux",
  "dropFirstNegativeAux", "dropFirstPassiveAux", "irregular",
  "kaForm", "korean", "koreanHonorific", "koreanPolite", "koreanPos",
  "koreanPrefix", "koreanSuffix", "nameRole",
  "placement",
  "shortNegationPolicy",
  "teIruContractToPast", "teIruDropAux",
  "teIruResultative", "transliteration"
]);

const RENDERING_SOURCE_FIELDS = new Set([
  "chainConditions", "connectiveRole",
  "context", "default", "frame", "frames", "frameId",
  "lexicalConditions", "clauseConditions", "minEvidence",
  "participantConditions", "slots"
]);

const FRAME_TARGET_FIELDS = new Set([
  "adverbial",
  "nominalized",
  "casePreferences", "caseRealization",
  "dropFirstCausativeAux", "dropFirstNegativeAux",
  "dropFirstPassiveAux", "irregular", "kaForm", "korean",
  "koreanHonorific", "koreanPolite", "koreanPos", "koreanPrefix",
  "koreanSuffix", "nameRole", "placement", "slotRealization",
  "shortNegationPolicy",
  "teIruContractToPast", "teIruDropAux",
  "teIruResultative", "transliteration"
]);

const CASE_SPEC_KEYS = new Set(["allomorphKey", "korean", "role"]);
const ADVERBIALIZATION_FOLLOWING_KEYS = new Set(["adverbialScope", "requestOrImperative", "blockedNextDictionaryForms"]);

const RENDERING_SENSE_FIELD_ALIASES = [
  ["korean_pos", "koreanPos"],
  ["korean_honorific", "koreanHonorific"],
  ["korean_polite", "koreanPolite"],
  ["korean_prefix", "koreanPrefix"],
  ["korean_suffix", "koreanSuffix"],
  ["name_role", "nameRole"],
  ["ka_form", "kaForm"],
  ["connective_role", "connectiveRole"],
  ["te_iru_resultative", "teIruResultative"],
  ["te_iru_drop_aux", "teIruDropAux"],
  ["te_iru_contract_to_past", "teIruContractToPast"],
  ["drop_first_negative_aux", "dropFirstNegativeAux"],
  ["drop_first_passive_aux", "dropFirstPassiveAux"],
  ["drop_first_causative_aux", "dropFirstCausativeAux"],
  ["short_negation_policy", "shortNegationPolicy"],
  ["case_preferences", "casePreferences"],
  ["connective_preferences", "connectivePreferences"],
  ["case_realization", "caseRealization"],
  ["slot_realization", "slotRealization"],
  ["attach_left", "attachLeft"],
  ["attach_right", "attachRight"]
] as const;

export function normalizeEntrySenses<T extends SenseDictionaryEntry>(
  entry: T,
  options: { source?: string; lookups: LookupTables; numeric: NumericTables }
): Omit<T, "senses"> & { senses: NormalizedSense[]; sourceFormat: "senses" } | T {
  const hasSenses = hasOwn(entry, "senses");
  if (hasOwn(entry, "translations")) {
    throw new SenseValidationError(msg("legacy translations field is unsupported; use senses[]", options.source));
  }
  if (hasOwn(entry, "aliasOf")) {
    if (hasSenses) {
      throw new SenseValidationError(msg("dictionary alias must not define senses", options.source));
    }
    return entry;
  }
  if (isSurfaceRedirect(entry)) {
    if (hasSenses) {
      throw new SenseValidationError(msg("surface redirect must not define senses", options.source));
    }
    return entry;
  }
  if (!hasSenses) {
    throw new SenseValidationError(msg("rendering-bearing entry requires senses", options.source));
  }

  const entryId = mintMorphemeEntryId(entry, options.source);
  const priorityGroups = normalizeSensePriorityGroups(entry.senses, options);
  const senses = new Array<NormalizedSense>(priorityGroups.reduce((total, group) => total + group.length, 0));
  const frameIds = new Set<string>();
  let flatIndex = 0;
  for (const [priorityGroup, group] of priorityGroups.entries()) {
    for (const [priorityInGroup, sense] of group.entries()) {
      const normalizedSense = normalizeSenseCandidate(sense, flatIndex, options.source, frameIds, entry, options.lookups, options.numeric);
      normalizedSense.entryId = entryId;
      normalizedSense.senseIndex = flatIndex;
      normalizedSense.priorityGroup = priorityGroup;
      normalizedSense.priorityInGroup = priorityInGroup;
      normalizedSense.sourceFormat = "senses";
      senses[flatIndex] = normalizedSense;
      flatIndex += 1;
    }
  }

  const normalized = {
    ...entry,
    senses,
    sourceFormat: "senses" as const
  };
  return normalized;
}

export function normalizeSensePriorityGroups(
  rawSenses: unknown,
  options: { source?: string } = {}
): readonly (readonly Mapping[])[] {
  if (!Array.isArray(rawSenses) || rawSenses.length === 0) {
    throw new SenseValidationError(msg("senses must be a non-empty array", options.source));
  }

  if (rawSenses.every(isMapping)) {
    const senses = rawSenses;
    const fallbackIndices = senses
      .map((sense, index) => isFallbackSense(sense) ? index : -1)
      .filter((index) => index >= 0);
    if (fallbackIndices.length > 1) {
      throw new SenseValidationError(msg("1D senses may contain at most one fallback sense", options.source));
    }
    if (fallbackIndices.length === 0) {
      throw new SenseValidationError(msg("1D senses require a final fallback sense", options.source));
    }
    const fallbackIndex = fallbackIndices[0] ?? -1;
    if (fallbackIndex !== senses.length - 1) {
      throw new SenseValidationError(msg("1D fallback sense must be last", options.source));
    }
    if (senses.length === 1) {
      return [senses];
    }
    return [senses.slice(0, fallbackIndex), [senses[fallbackIndex] as Mapping]];
  }

  if (rawSenses.every(isSenseGroup)) {
    let hasFallbackGroup = false;
    const groups = rawSenses.map((group, groupIndex) => {
      if (group.length === 0) {
        throw new SenseValidationError(msg("senses priority group must be non-empty", options.source));
      }
      if (!group.every(isMapping)) {
        throw new SenseValidationError(msg(`senses[${groupIndex}] must contain sense mappings`, options.source));
      }
      const fallbackFlags = group.map(isFallbackSense);
      if (fallbackFlags.some(Boolean)) {
        if (!fallbackFlags.every(Boolean)) {
          throw new SenseValidationError(msg("fallback priority group must not contain non-fallback senses", options.source));
        }
        if (groupIndex !== rawSenses.length - 1) {
          throw new SenseValidationError(msg("fallback priority group must be last", options.source));
        }
        hasFallbackGroup = true;
      }
      return group;
    });
    if (!hasFallbackGroup) {
      throw new SenseValidationError(msg("2D senses require a final fallback priority group", options.source));
    }
    return groups;
  }

  throw new SenseValidationError(msg("senses must be either 1D sense array or 2D priority groups", options.source));
}

function normalizeSenseCandidate(
  rawSense: Mapping,
  index: number,
  source: string | undefined,
  frameIds: Set<string>,
  entry: Mapping,
  lookups: LookupTables,
  numeric: NumericTables
): NormalizedSense {
  const sense = normalizeSenseMapping(rawSense);
  const forbidden = sortedIntersection(Object.keys(sense), TOP_LEVEL_SENSE_FORBIDDEN_FIELDS);
  if (forbidden.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}] mixes rendering fields at top level: ${JSON.stringify(forbidden)}`, source));
  }
  const rawRendering = sense.rendering;
  if (!isMapping(rawRendering)) {
    throw new SenseValidationError(msg(`sense[${index}] requires rendering mapping`, source));
  }
  const rendering = normalizeSenseMapping(rawRendering);
  validateRendering(rendering, source, index);

  const rawFrame = sense.frame;
  const rawFrames = sense.frames;
  if (rawFrame !== undefined && rawFrame !== null && rawFrames !== undefined && rawFrames !== null) {
    throw new SenseValidationError(msg(`sense[${index}] must not define both frame and frames`, source));
  }

  let frame: Mapping | undefined;
  const frames: Mapping[] = [];
  if (rawFrame !== undefined && rawFrame !== null) {
    if (!isMapping(rawFrame)) {
      throw new SenseValidationError(msg(`sense[${index}].frame must be a mapping`, source));
    }
    frame = normalizeSenseMapping({ ...rawFrame });
    registerFrame(frame, frameIds, source, index);
    validateFrame(frame, source, index, entry, lookups, numeric);
    validateSlotRealization(frame, rendering, source, index);
    validateCaseRealization([frame], rendering, source, index);
    if (
      !isDefaultFrame(frame) &&
      hasOwn(rendering, "casePreferences") &&
      !hasOwn(rendering, "caseRealization") &&
      !frameAllowsDirectCasePreferences(frame)
    ) {
      throw new SenseValidationError(msg(`sense[${index}].rendering with frame must use caseRealization instead of direct casePreferences`, source));
    }
  } else if (rawFrames !== undefined && rawFrames !== null) {
    if (!Array.isArray(rawFrames) || rawFrames.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].frames must be a non-empty array`, source));
    }
    rawFrames.forEach((rawAltFrame, frameIndex) => {
      if (!isMapping(rawAltFrame)) {
        throw new SenseValidationError(msg(`sense[${index}].frames[${frameIndex}] must be a mapping`, source));
      }
      const altFrame = normalizeSenseMapping({ ...rawAltFrame });
      registerFrame(altFrame, frameIds, source, index);
      validateFrame(altFrame, source, index, entry, lookups, numeric);
      frames.push(altFrame);
    });
    validateSlotRealizationForFrames(frames, rendering, source, index);
    validateCaseRealization(frames, rendering, source, index);
    if (
      hasOwn(rendering, "casePreferences") &&
      !hasOwn(rendering, "caseRealization") &&
      !frames.every(frameAllowsDirectCasePreferences)
    ) {
      throw new SenseValidationError(msg(`sense[${index}].rendering with frames must use caseRealization instead of direct casePreferences`, source));
    }
  }

  const normalizedSense = normalizeRenderingToSense(rendering);
  if (sense.intrinsicHonorific !== undefined) {
    if (typeof sense.intrinsicHonorific !== "boolean") {
      throw new SenseValidationError(msg(`sense[${index}].intrinsic_honorific must be boolean`, source));
    }
    normalizedSense.intrinsicHonorific = sense.intrinsicHonorific;
  }
  if (sense.derivation !== undefined && sense.derivation !== null) {
    if (typeof sense.derivation !== "string" || sense.derivation.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].derivation must be a non-empty string`, source));
    }
    validateSenseDerivation(sense.derivation, entry, source, index);
    normalizedSense.derivation = sense.derivation;
  }
  const constructions = normalizeSenseConstructions(sense.constructions, source, index);
  if (constructions.length > 0) {
    normalizedSense.constructions = constructions;
  }
  const adverbializations = normalizeSenseAdverbializations(sense.adverbializations, source, index);
  if (adverbializations.length > 0) {
    normalizedSense.adverbializations = adverbializations;
  }
  const casePreferences = frame === undefined ? {} : roleCasePreferencesFromFrame(frame, rendering, source, index);
  if (Object.keys(casePreferences).length > 0) {
    normalizedSense.casePreferences = casePreferences;
  }
  if (frame !== undefined) {
    normalizedSense.senseFrame = structuredClone(frame);
    if (hasOwn(rendering, "caseRealization")) {
      normalizedSense.senseCaseRealization = structuredClone(rendering.caseRealization);
    }
    if (hasOwn(rendering, "slotRealization")) {
      normalizedSense.senseSlotRealization = structuredClone(rendering.slotRealization);
    }
  }
  if (frames.length > 0) {
    normalizedSense.senseFrames = structuredClone(frames);
    if (hasOwn(rendering, "caseRealization")) {
      normalizedSense.senseCaseRealization = structuredClone(rendering.caseRealization);
    }
    if (hasOwn(rendering, "slotRealization")) {
      normalizedSense.senseSlotRealization = structuredClone(rendering.slotRealization);
    }
  }
  return normalizedSense;
}

function normalizeSenseAdverbializations(
  rawAdverbializations: unknown,
  source: string | undefined,
  senseIndex: number
): NormalizedSenseAdverbialization[] {
  if (rawAdverbializations === undefined || rawAdverbializations === null) {
    return [];
  }
  if (!Array.isArray(rawAdverbializations)) {
    throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations must be an array`, source));
  }
  return rawAdverbializations.map((rawAdverbialization, adverbializationIndex) => {
    if (!isMapping(rawAdverbialization)) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}] must be a mapping`, source));
    }
    const adverbialization = normalizeSenseMapping(rawAdverbialization);
    if (typeof adverbialization.particle !== "string" || adverbialization.particle.length === 0) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].particle must be a non-empty string`, source));
    }
    if (typeof adverbialization.kind !== "string" || adverbialization.kind.length === 0) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].kind must be a non-empty string`, source));
    }
    if (
      adverbialization.consumeParticle !== undefined &&
      typeof adverbialization.consumeParticle !== "boolean"
    ) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].consume_particle must be boolean`, source));
    }
    const hasRendering = adverbialization.rendering !== undefined && adverbialization.rendering !== null;
    const hasProjection = adverbialization.projection !== undefined && adverbialization.projection !== null;
    if (hasRendering === hasProjection) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}] must define exactly one of rendering or projection`, source));
    }
    const normalized: NormalizedSenseAdverbialization = {
      particle: adverbialization.particle,
      kind: adverbialization.kind
    };
    if (adverbialization.consumeParticle !== undefined) {
      normalized.consumeParticle = adverbialization.consumeParticle;
    }
    if (adverbialization.following !== undefined && adverbialization.following !== null) {
      if (!isMapping(adverbialization.following)) {
        throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].following must be a mapping`, source));
      }
      const following = normalizeSenseMapping(adverbialization.following);
      for (const key of Object.keys(following)) {
        if (!ADVERBIALIZATION_FOLLOWING_KEYS.has(key)) {
          throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].following.${snakeCase(key)} is unsupported`, source));
        }
      }
      if (
        following.requestOrImperative !== undefined &&
        typeof following.requestOrImperative !== "boolean"
      ) {
        throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].following.request_or_imperative must be boolean`, source));
      }
      if (
        following.blockedNextDictionaryForms !== undefined &&
        (
          !Array.isArray(following.blockedNextDictionaryForms) ||
          following.blockedNextDictionaryForms.some((value) => typeof value !== "string" || value.length === 0)
        )
      ) {
        throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].following.blocked_next_dictionary_forms must be an array of non-empty strings`, source));
      }
      const normalizedFollowing: NormalizedSenseAdverbialization["following"] = {};
      if (
        following.adverbialScope !== undefined &&
        typeof following.adverbialScope !== "boolean"
      ) {
        throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].following.adverbial_scope must be boolean`, source));
      }
      if (following.adverbialScope === true) {
        normalizedFollowing.adverbialScope = true;
      }
      if (following.requestOrImperative === true) {
        normalizedFollowing.requestOrImperative = true;
      }
      if (Array.isArray(following.blockedNextDictionaryForms) && following.blockedNextDictionaryForms.length > 0) {
        normalizedFollowing.blockedNextDictionaryForms = [...following.blockedNextDictionaryForms];
      }
      if (Object.keys(normalizedFollowing).length > 0) {
        normalized.following = normalizedFollowing;
      }
    }
    if (hasRendering) {
      if (!isMapping(adverbialization.rendering)) {
        throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].rendering must be a mapping`, source));
      }
      const rendering = normalizeSenseMapping(adverbialization.rendering);
      validateRendering(rendering, source, senseIndex);
      const normalizedRendering = normalizeRenderingToSense(rendering);
      const renderingPayload: SenseRendering & { korean: string } = {
        korean: normalizedRendering.korean,
        irregular: normalizedRendering.irregular ?? null
      };
      if (normalizedRendering.koreanPos !== undefined) {
        renderingPayload.koreanPos = normalizedRendering.koreanPos;
      }
      normalized.rendering = renderingPayload;
      return normalized;
    }
    if (!isMapping(adverbialization.projection)) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].projection must be a mapping`, source));
    }
    const projection = normalizeSenseMapping(adverbialization.projection);
    if (projection.kind !== "nominalAdverbial") {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].projection.kind is unsupported: ${String(projection.kind)}`, source));
    }
    if (typeof projection.suffix !== "string" || projection.suffix.length === 0) {
      throw new SenseValidationError(msg(`sense[${senseIndex}].adverbializations[${adverbializationIndex}].projection.suffix must be a non-empty string`, source));
    }
    normalized.projection = {
      kind: "nominalAdverbial",
      suffix: projection.suffix
    };
    return normalized;
  });
}

function validateSenseDerivation(
  derivation: string,
  entry: Mapping,
  source: string | undefined,
  index: number
): void {
  const rawDerivations = entry.derivations;
  if (rawDerivations === undefined) {
    if (derivation !== "lexical") {
      throw new SenseValidationError(msg(`sense[${index}].derivation '${derivation}' requires entry.derivations[]`, source));
    }
    return;
  }
  if (!Array.isArray(rawDerivations) || rawDerivations.length === 0) {
    throw new SenseValidationError(msg("entry.derivations must be a non-empty array", source));
  }
  const ids = new Set(rawDerivations.map((raw) => {
    if (!isMapping(raw)) {
      throw new SenseValidationError(msg("entry.derivations[] must contain mappings", source));
    }
    const normalized = normalizeSenseMapping(raw);
    const id = normalized.id ?? normalized.type;
    if (typeof id !== "string" || id.length === 0) {
      throw new SenseValidationError(msg("entry.derivations[] item requires id", source));
    }
    return id;
  }));
  if (!ids.has(derivation)) {
    throw new SenseValidationError(msg(`sense[${index}].derivation '${derivation}' is not declared in entry.derivations[]`, source));
  }
}

function normalizeSenseConstructions(
  rawConstructions: unknown,
  source: string | undefined,
  index: number
): SenseConstruction[] {
  if (rawConstructions === undefined || rawConstructions === null) {
    return [];
  }
  if (!Array.isArray(rawConstructions) || rawConstructions.length === 0) {
    throw new SenseValidationError(msg(`sense[${index}].constructions must be a non-empty array`, source));
  }
  return rawConstructions.map((rawConstruction, constructionIndex) => {
    if (!isMapping(rawConstruction)) {
      throw new SenseValidationError(msg(`sense[${index}].constructions[${constructionIndex}] must be a mapping`, source));
    }
    const construction = normalizeSenseMapping(rawConstruction);
    const supportedKeys = new Set(["type", "particle", "verb", "koreanCarrier", "irregular"]);
    const unsupported = Object.keys(construction).filter((key) => !supportedKeys.has(key)).sort();
    if (unsupported.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}].constructions[${constructionIndex}] has unsupported keys: ${JSON.stringify(unsupported)}`, source));
    }
    if (construction.type !== "carrier_idiom") {
      throw new SenseValidationError(msg(`sense[${index}].constructions[${constructionIndex}].type is unsupported: ${String(construction.type)}`, source));
    }
    if (
      typeof construction.particle !== "string" ||
      construction.particle.length === 0 ||
      typeof construction.verb !== "string" ||
      construction.verb.length === 0 ||
      typeof construction.koreanCarrier !== "string" ||
      construction.koreanCarrier.length === 0
    ) {
      throw new SenseValidationError(msg(`sense[${index}].constructions[${constructionIndex}] requires particle, verb, and korean_carrier`, source));
    }
    if (
      construction.irregular !== undefined &&
      construction.irregular !== null &&
      typeof construction.irregular !== "string"
    ) {
      throw new SenseValidationError(msg(`sense[${index}].constructions[${constructionIndex}].irregular must be string or null`, source));
    }
    const normalized: SenseCarrierIdiomConstruction = {
      type: "carrier_idiom",
      particle: construction.particle,
      verb: construction.verb,
      koreanCarrier: construction.koreanCarrier
    };
    if (hasOwn(construction, "irregular")) {
      normalized.irregular = asIrregular(construction.irregular);
    }
    return normalized;
  });
}

function normalizeRenderingToSense(rendering: Mapping): NormalizedSense {
  const normalizedSense = structuredClone(rendering) as NormalizedSense & Mapping;
  const target: Mapping = normalizedSense;
  for (const [sourceKey, targetKey] of RENDERING_SENSE_FIELD_ALIASES) {
    if (!hasOwn(target, targetKey) && hasOwn(target, sourceKey)) {
      target[targetKey] = target[sourceKey];
    }
    delete target[sourceKey];
  }
  if (typeof target.koreanPos === "string") {
    target.koreanPos = KOPOS_OF_NAME[target.koreanPos];
  }
  if (hasOwn(target, "koreanPolite")) {
    target.koreanPolite = normalizeKoreanPolite(target.koreanPolite);
  }
  return normalizedSense;
}

function normalizeKoreanPolite(value: unknown): KoreanPoliteForms {
  if (typeof value === "string") {
    return { casual: value, formal: value };
  }
  const forms = value as { readonly casual: string; readonly formal: string };
  return { casual: forms.casual, formal: forms.formal };
}

function validateKoreanPolite(rendering: Mapping, source: string | undefined, index: number): void {
  const value = rendering.koreanPolite;
  if (value === undefined) {
    return;
  }
  const koreanPos = rendering.koreanPos ?? rendering.korean_pos;
  if (koreanPos !== "감탄사" && koreanPos !== 감탄사) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.korean_polite is only allowed with korean_pos 감탄사`, source));
  }
  if (typeof value === "string") {
    if (value.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].rendering.korean_polite must be non-empty`, source));
    }
    return;
  }
  if (!isMapping(value)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.korean_polite must be a string or {casual, formal}`, source));
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "casual" || keys[1] !== "formal") {
    throw new SenseValidationError(msg(`sense[${index}].rendering.korean_polite object requires exactly casual and formal: ${JSON.stringify(keys)}`, source));
  }
  if (
    typeof value.casual !== "string" || value.casual.length === 0 ||
    typeof value.formal !== "string" || value.formal.length === 0
  ) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.korean_polite casual/formal must be non-empty strings`, source));
  }
}

function validateRendering(rendering: Mapping, source: string | undefined, index: number): void {
  const forbidden = sortedIntersection(Object.keys(rendering), RENDERING_SOURCE_FIELDS);
  if (forbidden.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].rendering contains source fields: ${JSON.stringify(forbidden)}`, source));
  }
  if (
    typeof rendering.korean !== "string" ||
    (rendering.korean.length === 0 && (rendering.koreanPos ?? rendering.korean_pos) !== "접두사")
  ) {
    throw new SenseValidationError(msg(`sense[${index}].rendering requires non-empty korean`, source));
  }
  const placement = rendering.placement;
  if (placement !== undefined) {
    validatePlacement(placement, source, index);
  }
  validateKoreanPolite(rendering, source, index);
}

function validatePlacement(value: unknown, source: string | undefined, index: number): void {
  if (!isMapping(value)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.placement must be a mapping`, source));
  }
  const unsupported = Object.keys(value).filter((key) => key !== "type").sort();
  if (unsupported.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.placement has unsupported keys: ${JSON.stringify(unsupported)}`, source));
  }
  if (value.type !== "after_next_extent_phrase") {
    throw new SenseValidationError(msg(`sense[${index}].rendering.placement.type is unsupported: ${String(value.type)}`, source));
  }
}

function validateSlotRealization(frame: Mapping, rendering: Mapping, source: string | undefined, index: number): void {
  const slotRealization = rendering.slotRealization;
  if (slotRealization === undefined || slotRealization === null) {
    return;
  }
  if (isDefaultFrame(frame)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.slotRealization is not allowed on fallback frame`, source));
  }
  if (!isMapping(slotRealization)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.slotRealization must be a mapping`, source));
  }
  const roleCounts = new Map<string, number>();
  for (const slot of iterSlots(frame)) {
    const role = slot.role;
    if (typeof role === "string") {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }
  }
  if (roleCounts.size === 0) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.slotRealization requires frame slots`, source));
  }
  const clauseRoles = frameClauseSlotRoles(frame);
  const caseRealization = rendering.caseRealization;
  if (caseRealization !== undefined && caseRealization !== null && !isMapping(caseRealization)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.caseRealization must be a mapping`, source));
  }
  validateSlotRealizationShape(slotRealization, roleCounts, clauseRoles, caseRealization, source, index);
}

function validateSlotRealizationForFrames(frames: readonly Mapping[], rendering: Mapping, source: string | undefined, index: number): void {
  const slotRealization = rendering.slotRealization;
  if (slotRealization === undefined || slotRealization === null) {
    return;
  }
  if (!isMapping(slotRealization)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.slotRealization must be a mapping`, source));
  }
  const clauseRoles = framesClauseSlotRoles(frames);
  for (const role of Object.keys(slotRealization)) {
    if (role.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role must be a string`, source));
    }
    if (clauseRoles.has(role)) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role cannot target clause slot: ${role}`, source));
    }
    for (const frame of frames) {
      const count = iterSlots(frame).filter((slot) => slot.role === role).length;
      if (count !== 1) {
        throw new SenseValidationError(msg(`sense[${index}] slot_realization role must map to exactly one slot in every frame alternative: ${role}`, source));
      }
    }
  }
  validateSlotRealization(frames[0] as Mapping, rendering, source, index);
}

function validateSlotRealizationShape(
  slotRealization: Mapping,
  roleCounts: ReadonlyMap<string, number>,
  clauseRoles: ReadonlySet<string>,
  caseRealization: unknown,
  source: string | undefined,
  index: number
): void {
  for (const [role, spec] of Object.entries(slotRealization)) {
    if (role.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role must be a string`, source));
    }
    if (clauseRoles.has(role)) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role cannot target clause slot: ${role}`, source));
    }
    if (!roleCounts.has(role)) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role has no slot: ${role}`, source));
    }
    if (roleCounts.get(role) !== 1) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization role must map to exactly one slot: ${role}`, source));
    }
    if (!isMapping(spec)) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization.${role} must be a mapping`, source));
    }
    if (Object.keys(spec).length === 0) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization.${role} requires korean or case`, source));
    }
    const unsupported = Object.keys(spec).filter((key) => key !== "korean" && key !== "case").sort();
    if (unsupported.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization.${role} has unsupported keys: ${JSON.stringify(unsupported)}`, source));
    }
    if (hasOwn(spec, "korean") && typeof spec.korean !== "string") {
      throw new SenseValidationError(msg(`sense[${index}] slot_realization.${role}.korean must be a string`, source));
    }
    if (hasOwn(spec, "case")) {
      if (typeof spec.case !== "string") {
        throw new SenseValidationError(msg(`sense[${index}] slot_realization.${role}.case must be a string`, source));
      }
      if (isMapping(caseRealization) && hasOwn(caseRealization, role)) {
        throw new SenseValidationError(msg(`sense[${index}] role cannot define both slot_realization.case and case_realization: ${role}`, source));
      }
    }
  }
}

function validateCaseRealization(frames: readonly Mapping[], rendering: Mapping, source: string | undefined, index: number): void {
  const caseRealization = rendering.caseRealization;
  if (caseRealization === undefined || caseRealization === null) {
    return;
  }
  if (!isMapping(caseRealization)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.caseRealization must be a mapping`, source));
  }
  const roleParticles = new Map<string, Set<string>>();
  const clauseRoles = framesClauseSlotRoles(frames);
  for (const frame of frames) {
    if (isDefaultFrame(frame)) {
      throw new SenseValidationError(msg(`sense[${index}].rendering.caseRealization is not allowed on fallback frame`, source));
    }
    for (const slot of iterSlots(frame)) {
      if (slotType(slot) === SLOT_TYPE_CLAUSE) {
        continue;
      }
      const role = slot.role;
      if (typeof role !== "string") {
        continue;
      }
      const target = roleParticles.get(role) ?? new Set<string>();
      for (const particle of stringTuple(slot.particles)) {
        target.add(particle);
      }
      roleParticles.set(role, target);
    }
  }
  if (roleParticles.size === 0) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.caseRealization requires frame slots`, source));
  }
  for (const [role, spec] of Object.entries(caseRealization)) {
    if (role.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}] case_realization role must be a string`, source));
    }
    if (clauseRoles.has(role)) {
      throw new SenseValidationError(msg(`sense[${index}] case_realization role cannot target clause slot: ${role}`, source));
    }
    const particles = roleParticles.get(role);
    if (particles === undefined) {
      throw new SenseValidationError(msg(`sense[${index}] case_realization role has no slot: ${role}`, source));
    }
    if (isCaseSpecValue(spec)) {
      continue;
    }
    if (!isMapping(spec) || Object.keys(spec).length === 0) {
      throw new SenseValidationError(msg(`sense[${index}] case_realization.${role} must be a string or non-empty mapping`, source));
    }
    for (const [particle, value] of Object.entries(spec)) {
      if (particle.length === 0) {
        throw new SenseValidationError(msg(`sense[${index}] case_realization.${role} particle must be a string`, source));
      }
      if (!particles.has(particle)) {
        throw new SenseValidationError(msg(`sense[${index}] case_realization.${role} has unknown particle: ${particle}`, source));
      }
      if (!isCaseSpecValue(value)) {
        throw new SenseValidationError(msg(`sense[${index}] case_realization.${role}.${particle} must be a string or case spec mapping`, source));
      }
    }
  }
}

function validateFrame(frame: Mapping, source: string | undefined, index: number, entry: Mapping, lookups: LookupTables, numeric: NumericTables): void {
  const forbidden = sortedIntersection(Object.keys(frame), FRAME_TARGET_FIELDS);
  if (forbidden.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame contains target fields: ${JSON.stringify(forbidden)}`, source));
  }
  const unknown = Object.keys(frame).filter((key) => !SOURCE_FRAME_FIELDS.has(key)).sort();
  if (unknown.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame contains unsupported fields: ${JSON.stringify(unknown)}`, source));
  }
  if (hasOwn(frame, "frameId")) {
    throw new SenseValidationError(msg(`sense[${index}].frame uses frame_id; use id`, source));
  }
  const chain = read(frame, "chainConditions");
  if (chain !== undefined) {
    validateConditionMapping(chain, FRAME_CHAIN_CONDITION_KEYS, "chain_conditions", source, index);
  }
  const lexical = read(frame, "lexicalConditions");
  if (lexical !== undefined) {
    validateLexicalConditions(frame, lexical, source, index, numeric);
  }
  const clause = read(frame, "clauseConditions");
  if (clause !== undefined) {
    validateConditionMapping(clause, FRAME_CLAUSE_CONDITION_KEYS, "clause_conditions", source, index);
  }
  const participantConditions = read(frame, "participantConditions");
  if (participantConditions !== undefined) {
    validateParticipantConditions(participantConditions, source, index);
  }
  const connectiveRole = read(frame, "connectiveRole");
  if (connectiveRole !== undefined) {
    validateStringOrStringSequence(connectiveRole, source, index, "connective_role");
  }
  const connectivePreferences = read(frame, "connectivePreferences");
  if (connectivePreferences !== undefined) {
    validateConnectivePreferences(connectivePreferences, source, index, "frame.connective_preferences");
  }
  const slots = read(frame, "slots") ?? [];
  if (!Array.isArray(slots)) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots must be an array`, source));
  }
  slots.forEach((slot, slotIndex) => validateSlot(slot, source, index, slotIndex, lookups));
  const clauseSlotCount = frameClauseSlotCount(slots);
  if (clauseSlotCount > 0) {
    const pos = entry.pos;
    const pos0 = typeof pos === "number" ? (pos & POS0) : (Array.isArray(pos) && pos.length > 0 ? POS0_OF_NAME[pos[0] as string] ?? 0 : 0);
    if (pos0 !== 動詞) {
      throw new SenseValidationError(msg(`sense[${index}].frame clause slots are allowed only on direct predicate entries`, source));
    }
    if (clauseSlotCount > 1) {
      throw new SenseValidationError(msg(`sense[${index}].frame allows at most one clause slot`, source));
    }
  }
  validateParticlePositionSlots(frame, slots, source, index);
  if (!isDefaultFrame(frame) && !(
    slots.length > 0 ||
    sourceConditionTruthy(chain) ||
    sourceConditionTruthy(lexical) ||
    sourceConditionTruthy(clause) ||
    sourceConditionTruthy(participantConditions) ||
    sourceConditionTruthy(connectiveRole)
  )) {
    throw new SenseValidationError(msg(`sense[${index}].frame requires slots or source-side conditions`, source));
  }
}

function validateConnectivePreferences(value: unknown, source: string | undefined, index: number, name: string): void {
  if (!isMapping(value)) {
    throw new SenseValidationError(msg(`sense[${index}].${name} must be a mapping`, source));
  }
  for (const [connective, rawPreference] of Object.entries(value)) {
    if (connective.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].${name} key must be non-empty`, source));
    }
    if (typeof rawPreference === "string") {
      continue;
    }
    if (!isMapping(rawPreference)) {
      throw new SenseValidationError(msg(`sense[${index}].${name}.${connective} must be a string or mapping`, source));
    }
    for (const key of Object.keys(rawPreference)) {
      if (key !== "role" && key !== "connective" && key !== "ending" && key !== "relation") {
        throw new SenseValidationError(msg(`sense[${index}].${name}.${connective} has unsupported key: ${key}`, source));
      }
    }
    for (const key of ["role", "connective", "ending", "relation"]) {
      const item = rawPreference[key];
      if (item !== undefined && typeof item !== "string") {
        throw new SenseValidationError(msg(`sense[${index}].${name}.${connective}.${key} must be a string`, source));
      }
    }
  }
}

function validateConditionMapping(value: unknown, allowed: ReadonlySet<string>, name: string, source: string | undefined, index: number): asserts value is Mapping {
  if (!isMapping(value)) {
    throw new SenseValidationError(msg(`sense[${index}].frame.${name} must be a mapping`, source));
  }
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (unsupported.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.${name} has unsupported keys: ${JSON.stringify(unsupported)}`, source));
  }
}

function validateLexicalConditions(frame: Mapping, value: unknown, source: string | undefined, index: number, numeric: NumericTables): void {
  validateConditionMapping(value, unionSet(FRAME_AUTHORED_LEXICAL_CONDITION_KEYS, FRAME_FORBIDDEN_LEXICAL_CONDITION_KEYS), "lexical_conditions", source, index);
  const forbidden = sortedIntersection(Object.keys(value), FRAME_FORBIDDEN_LEXICAL_CONDITION_KEYS);
  if (forbidden.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions has argument-like keys: ${JSON.stringify(forbidden)}`, source));
  }
  const slots = read(frame, "slots");
  const hasSlots = Array.isArray(slots) && slots.length > 0;
  const conditional = sortedIntersection(Object.keys(value), FRAME_CONDITIONAL_LEXICAL_CONDITION_KEYS);
  if (hasSlots && conditional.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions keys require slotless frame: ${JSON.stringify(conditional)}`, source));
  }
  const adjacentParticles = stringTuple(value.prevSurface)
    .filter((surface) => PREDICATE_ADJACENT_PARTICLE_SURFACES.has(surface))
    .sort();
  if (adjacentParticles.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.prev_surface has predicate-adjacent particle values: ${JSON.stringify(adjacentParticles)}`, source));
  }
  const nextExtentPhrase = read(value, "nextExtentPhrase");
  if (nextExtentPhrase !== undefined) {
    validateNextExtentPhraseCondition(nextExtentPhrase, source, index, numeric);
  }
}

const NEXT_EXTENT_PHRASE_KEYS = new Set([
  "kinds",
  "counterSurface",
  "counterKey",
  "counterLookup",
  "lexicalLookup",
  "family",
  "number",
  "minNumber",
  "maxNumber"
]);

function validateNextExtentPhraseCondition(value: unknown, source: string | undefined, index: number, numeric: NumericTables): void {
  if (value === true || value === false || value === null || !isMapping(value)) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase must be a mapping`, source));
  }
  const unsupported = Object.keys(value).filter((key) => !NEXT_EXTENT_PHRASE_KEYS.has(key)).sort();
  if (unsupported.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase has unsupported keys: ${JSON.stringify(unsupported)}`, source));
  }
  if (Object.keys(value).length === 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase requires at least one selector`, source));
  }
  if (value.kinds !== undefined) {
    validateStringOrStringSequence(value.kinds, source, index, "lexical_conditions.next_extent_phrase.kinds");
    const unsupportedKinds = stringTuple(value.kinds).filter((kind) => !(EXTENT_PHRASE_KINDS as ReadonlySet<string>).has(kind)).sort();
    if (unsupportedKinds.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase.kinds has unsupported values: ${JSON.stringify(unsupportedKinds)}`, source));
    }
  }
  for (const key of ["counterSurface", "counterKey", "family"] as const) {
    if (value[key] !== undefined) {
      validateStringOrStringSequence(value[key], source, index, `lexical_conditions.next_extent_phrase.${snakeCase(key)}`);
    }
  }
  for (const key of ["counterLookup", "lexicalLookup"] as const) {
    if (value[key] !== undefined) {
      validateExtentLookupNames(value[key], source, index, `lexical_conditions.next_extent_phrase.${snakeCase(key)}`, numeric);
    }
  }
  if (value.number !== undefined) {
    validateNumberSelector(value.number, source, index);
  }
  for (const key of ["minNumber", "maxNumber"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "number") {
      throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase.${snakeCase(key)} must be a number`, source));
    }
  }
}

function validateExtentLookupNames(value: unknown, source: string | undefined, index: number, field: string, numeric: NumericTables): void {
  validateStringOrStringSequence(value, source, index, field);
  const unknown = stringTuple(value).filter((name) => !numeric.hasExtentLookupSet(name)).sort();
  if (unknown.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.${field} has unknown lookup set(s): ${JSON.stringify(unknown)}`, source));
  }
}

function validateNumberSelector(value: unknown, source: string | undefined, index: number): void {
  const valid = (item: unknown) => typeof item === "number" || typeof item === "string";
  if (valid(value)) {
    return;
  }
  if (Array.isArray(value) && value.length > 0 && value.every(valid)) {
    return;
  }
  throw new SenseValidationError(msg(`sense[${index}].frame.lexical_conditions.next_extent_phrase.number must be a number, string, or non-empty array`, source));
}

function snakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function validateParticipantConditions(value: unknown, source: string | undefined, index: number): void {
  if (!Array.isArray(value)) {
    throw new SenseValidationError(msg(`sense[${index}].frame.participant_conditions must be an array`, source));
  }
  value.forEach((condition, conditionIndex) => {
    if (!isMapping(condition)) {
      throw new SenseValidationError(msg(`sense[${index}].frame.participant_conditions[${conditionIndex}] must be a mapping`, source));
    }
    if (typeof condition.position !== "string" || !FRAME_PARTICIPANT_CONDITION_POSITIONS.has(condition.position)) {
      throw new SenseValidationError(msg(`sense[${index}].frame.participant_conditions[${conditionIndex}] has unsupported position`, source));
    }
    if (stringTuple(condition.categories).length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.participant_conditions[${conditionIndex}] requires categories`, source));
    }
    const unsupported = Object.keys(condition).filter((key) => key !== "position" && key !== "categories").sort();
    if (unsupported.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.participant_conditions[${conditionIndex}] has unsupported keys: ${JSON.stringify(unsupported)}`, source));
    }
  });
}

function validateParticlePositionSlots(frame: Mapping, slots: readonly unknown[], source: string | undefined, index: number): void {
  const positionedSlots = slots.filter((slot) =>
    isMapping(slot) && read(slot, "particlePosition") === PARTICLE_POSITION_PREDICATE_ADJACENT
  );
  if (positionedSlots.length > 1) {
    throw new SenseValidationError(msg(`sense[${index}].frame allows at most one predicate_adjacent slot`, source));
  }
  const lexical = readMapping(frame, "lexicalConditions");
  if (positionedSlots.length > 0 && lexical !== undefined && hasOwn(lexical, "prevSurface")) {
    throw new SenseValidationError(msg(`sense[${index}].frame cannot combine predicate_adjacent slot with lexical_conditions.prev_surface`, source));
  }
}

function validateSlot(slot: unknown, source: string | undefined, index: number, slotIndex: number, lookups: LookupTables): void {
  if (!isMapping(slot)) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] must be a mapping`, source));
  }
  if (typeof slot.role !== "string" || slot.role.length === 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] requires role`, source));
  }
  const type = slotType(slot);
  if (type !== SLOT_TYPE_NOUN && type !== SLOT_TYPE_CLAUSE) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported slot_type`, source));
  }
  if (type === SLOT_TYPE_CLAUSE) {
    const markers = stringTuple(slot.markers);
    if (markers.length === 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] requires markers`, source));
    }
    const allowed = FRAME_CLAUSE_SLOT_MARKERS[slot.role];
    if (allowed === undefined) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported clause role`, source));
    }
    const unknownMarkers = markers.filter((marker) => !allowed.has(marker)).sort();
    if (unknownMarkers.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported clause markers: ${JSON.stringify(unknownMarkers)}`, source));
    }
    const forbidden = Object.keys(slot).filter((key) =>
      ["particles", "surfaces", "nounLookup", "lookup", "categories", "excludeCategories", "particlePosition", "bare", "absent"].includes(key)
    ).sort();
    if (forbidden.length > 0) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] clause slot contains noun fields: ${JSON.stringify(forbidden)}`, source));
    }
    return;
  }

  const particles = stringTuple(slot.particles);
  if (particles.length === 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] requires particles`, source));
  }
  if (hasOwn(slot, "bare") && typeof slot.bare !== "boolean") {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] bare must be boolean`, source));
  }
  if (hasOwn(slot, "absent") && typeof slot.absent !== "boolean") {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] absent must be boolean`, source));
  }
  if (hasOwn(slot, "lookup")) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] uses lookup; use noun_lookup`, source));
  }
  validateLookupSpec(read(slot, "nounLookup"), source, index, lookups);
  validateLookupSpec(slot.lookup, source, index, lookups);
  stringTuple(slot.categories);
  stringTuple(slot.surfaces);
  const unknownExcludedCategories = stringTuple(read(slot, "excludeCategories"))
    .filter((category) => !(SEMANTIC_FRAME_CATEGORIES as readonly string[]).includes(category));
  if (unknownExcludedCategories.length > 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported exclude_categories: ${JSON.stringify(unknownExcludedCategories)}`, source));
  }

  const particlePosition = read(slot, "particlePosition");
  const binding = slot.binding;
  if (binding !== undefined && binding !== null) {
    if (typeof binding !== "string" || !FRAME_SLOT_BINDINGS.has(binding)) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported binding`, source));
    }
    if (binding === SLOT_BINDING_ARGUMENT && particlePosition !== undefined && particlePosition !== null) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] binding=argument cannot combine with particle_position`, source));
    }
    if ((binding === SLOT_BINDING_ADNOMINAL_NO || binding === SLOT_BINDING_ADNOMINAL_HEAD) && (
      particles.length !== 1 || particles[0] !== "の" ||
      (particlePosition !== undefined && particlePosition !== null) || slot.allowBorrowed === true
    )) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] binding=${binding} requires particles ["の"] without particle_position or allow_borrowed`, source));
    }
  }
  if (particlePosition !== undefined && particlePosition !== null) {
    if (typeof particlePosition !== "string" || !FRAME_PARTICLE_POSITIONS.has(particlePosition)) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] has unsupported particle_position`, source));
    }
    if (slot.allowBorrowed === true) {
      throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] particle_position cannot allow borrowed fillers`, source));
    }
  }
  if ((binding === SLOT_BINDING_ADNOMINAL_NO || binding === SLOT_BINDING_ADNOMINAL_HEAD) && !(
    stringTuple(slot.surfaces).length > 0 ||
    hasLookupSpec(read(slot, "nounLookup", "lookup")) ||
    stringTuple(slot.categories).length > 0
  )) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] binding=${binding} requires surfaces, noun_lookup, or categories`, source));
  }
  if (binding === SLOT_BINDING_ARGUMENT && !(
    stringTuple(slot.surfaces).length > 0 ||
    hasLookupSpec(read(slot, "nounLookup", "lookup")) ||
    stringTuple(slot.categories).length > 0
  )) {
    throw new SenseValidationError(msg(`sense[${index}].frame.slots[${slotIndex}] binding=argument requires surfaces, noun_lookup, or categories`, source));
  }
}

function roleCasePreferencesFromFrame(frame: Mapping, rendering: Mapping, source: string | undefined, index: number): Mapping {
  const caseRealization = rendering.caseRealization;
  if (caseRealization === undefined || caseRealization === null) {
    return {};
  }
  if (!isMapping(caseRealization)) {
    throw new SenseValidationError(msg(`sense[${index}].rendering.caseRealization must be a mapping`, source));
  }
  const roleParticles = new Map<string, string>();
  const usedParticles = new Map<string, string>();
  for (const slot of iterSlots(frame)) {
    const role = slot.role;
    if (typeof role !== "string" || !hasOwn(caseRealization, role)) {
      continue;
    }
    if (read(slot, "particlePosition", "particle_position") === PARTICLE_POSITION_PREDICATE_ADJACENT) {
      continue;
    }
    const particles = stringTuple(slot.particles);
    if (particles.length !== 1) {
      continue;
    }
    const particle = particles[0] as string;
    const previousRole = usedParticles.get(particle);
    if (previousRole !== undefined && previousRole !== role) {
      throw new SenseValidationError(msg(`sense[${index}] particle maps to multiple roles: ${particle}`, source));
    }
    usedParticles.set(particle, role);
    roleParticles.set(role, particle);
  }
  const preferences: Mapping = {};
  for (const [role, value] of Object.entries(caseRealization)) {
    const particle = roleParticles.get(role);
    if (particle === undefined) {
      continue;
    }
    const particleValue = caseRealizationForParticle(value, particle);
    if (particleValue !== undefined) {
      preferences[particle] = particleValue;
    }
  }
  return preferences;
}

function frameAllowsDirectCasePreferences(frame: Mapping): boolean {
  return !iterSlots(frame).some((slot) => typeof slot.role === "string");
}

function registerFrame(frame: Mapping, frameIds: Set<string>, source: string | undefined, index: number): void {
  const id = frameId(frame, source, index);
  if (frameIds.has(id)) {
    throw new SenseValidationError(msg(`duplicate frame id: ${id}`, source));
  }
  frameIds.add(id);
}

function frameId(frame: Mapping, source: string | undefined, index: number): string {
  const id = read(frame, "id", "frameId");
  if (typeof id !== "string" || id.length === 0) {
    throw new SenseValidationError(msg(`sense[${index}].frame requires non-empty id`, source));
  }
  return id;
}

export function isFallbackSense(sense: Mapping): boolean {
  const frame = sense.frame;
  if (hasOwn(sense, "frames")) {
    return false;
  }
  if (frame === undefined || frame === null) {
    return true;
  }
  return isMapping(frame) && isDefaultFrame(frame);
}

function isSurfaceRedirect(entry: SenseDictionaryEntry): boolean {
  return hasOwn(entry, "surface") && hasOwn(entry, "baseForm");
}

function isCaseSpecValue(value: unknown): boolean {
  if (typeof value === "string") {
    return true;
  }
  if (!isMapping(value)) {
    return false;
  }
  if (!Object.keys(value).some((key) => CASE_SPEC_KEYS.has(key))) {
    return false;
  }
  const korean = value.korean;
  const allomorphKey = read(value, "allomorphKey");
  const role = value.role;
  return (korean === undefined || typeof korean === "string") &&
    (allomorphKey === undefined || typeof allomorphKey === "string") &&
    (role === undefined || typeof role === "string");
}

function caseRealizationForParticle(value: unknown, particle: string): unknown {
  if (isMapping(value) && !isCaseSpecValue(value)) {
    return value[particle];
  }
  return value;
}

function frameClauseSlotCount(slots: readonly unknown[]): number {
  return slots.filter((slot) => isMapping(slot) && slotType(slot) === SLOT_TYPE_CLAUSE).length;
}

function frameClauseSlotRoles(frame: Mapping): Set<string> {
  return new Set(iterSlots(frame)
    .filter((slot) => slotType(slot) === SLOT_TYPE_CLAUSE && typeof slot.role === "string")
    .map((slot) => slot.role as string));
}

function framesClauseSlotRoles(frames: readonly Mapping[]): Set<string> {
  const roles = new Set<string>();
  for (const frame of frames) {
    for (const role of frameClauseSlotRoles(frame)) {
      roles.add(role);
    }
  }
  return roles;
}

function iterSlots(frame: Mapping): Mapping[] {
  const slots = read(frame, "slots");
  if (!Array.isArray(slots)) {
    return [];
  }
  return slots.filter(isMapping);
}

function validateLookupSpec(value: unknown, source: string | undefined, index: number, lookups: LookupTables): void {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value === "string") {
    if (lookups.named(value) === undefined) {
      throw new SenseValidationError(msg(`unknown noun_lookup: ${value}`, source));
    }
    return;
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") {
        throw new SenseValidationError(msg(`sense[${index}] noun_lookup must be string, strings, or lookup spec`, source));
      }
      if (lookups.named(item) === undefined) {
        throw new SenseValidationError(msg(`unknown noun_lookup: ${item}`, source));
      }
    }
    return;
  } else if (isMapping(value)) {
    let sets: string[];
    try {
      const rawSets = value.sets;
      if (hasOwn(value, "sets") && rawSets === null) {
        throw new SenseValidationError("expected string or sequence of strings");
      }
      sets = rawSets === undefined ? [] : stringTuple(rawSets);
    } catch (error) {
      if (error instanceof SenseValidationError) {
        throw new SenseValidationError(msg(`sense[${index}] noun_lookup.sets must be strings`, source));
      }
      throw error;
    }
    for (const lookupName of sets) {
      if (lookups.named(lookupName) === undefined) {
        throw new SenseValidationError(msg(`unknown noun_lookup: ${lookupName}`, source));
      }
    }
    for (const field of ["extras", "exclude"]) {
      try {
        if (hasOwn(value, field) && value[field] === null) {
          throw new SenseValidationError("expected string or sequence of strings");
        }
        stringTuple(value[field]);
      } catch (error) {
        if (error instanceof SenseValidationError) {
          throw new SenseValidationError(msg(`sense[${index}] noun_lookup.${field} must be strings`, source));
        }
        throw error;
      }
    }
    return;
  } else {
    throw new SenseValidationError(msg(`sense[${index}] noun_lookup must be string, strings, or lookup spec`, source));
  }
}

function hasLookupSpec(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function stringTuple(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return [...value];
  }
  throw new SenseValidationError("expected string or sequence of strings");
}

function validateStringOrStringSequence(value: unknown, source: string | undefined, index: number, field: string): void {
  if (typeof value === "string") {
    return;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return;
  }
  throw new SenseValidationError(msg(`sense[${index}].frame.${field} must be a string or string array`, source));
}

function slotType(slot: Mapping): string {
  const value = read(slot, "slotType");
  if (value === undefined) {
    return SLOT_TYPE_NOUN;
  }
  return typeof value === "string" ? value : "";
}

function sourceConditionTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length > 0;
  }
  if (isMapping(value)) {
    return Object.keys(value).length > 0;
  }
  return true;
}

function isDefaultFrame(frame: Mapping): boolean {
  return frame.default === true;
}

function read(value: Mapping, ...keys: string[]): unknown {
  for (const key of keys) {
    if (hasOwn(value, key)) {
      return value[key];
    }
  }
  return undefined;
}

function readMapping(value: Mapping, ...keys: string[]): Mapping | undefined {
  const raw = read(value, ...keys);
  return isMapping(raw) ? raw : undefined;
}

function isSenseGroup(value: unknown): value is Mapping[] {
  return Array.isArray(value) && !isMapping(value);
}

function isMapping(value: unknown): value is Mapping {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function unionSet(left: ReadonlySet<string>, right: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...left, ...right]);
}

function sortedIntersection(keys: readonly string[], set: ReadonlySet<string>): string[] {
  return keys.filter((key) => set.has(key)).sort();
}

function msg(message: string, source: string | undefined): string {
  return source === undefined || source.length === 0 ? message : `${source}: ${message}`;
}
