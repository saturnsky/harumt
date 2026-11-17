import type { IrregularType } from "../generator/conjugator.js";
import type { HaruPos } from "../analyzer/index.js";
import type { NormalizedSenseFrame, SenseConstruction } from "../dictionary/sense-normalization.js";
import type { RegisterKoreanOverride } from "./token.js";

export interface TranslationPlacement {
  type: "after_next_extent_phrase";
}

export interface KoreanPoliteForms {
  readonly casual: string;
  readonly formal: string;
}

export interface MorphemeSense {
  korean: string;
  koreanPolite?: KoreanPoliteForms;
  intrinsicHonorific?: boolean;
  entryId?: string;
  derivation?: string;
  koreanPos?: number;
  irregular?: IrregularType | null;
  priority?: number;
  adverbial?: string;
  nominalized?: string;
  koreanHonorific?: string;
  koreanPrefix?: string;
  koreanSuffix?: string;
  transliteration?: boolean;
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
  casePreferences?: readonly string[] | Record<string, string | MorphemeCasePreference>;
  connectivePreferences?: Record<string, string | MorphemeConnectivePreference>;
  caseRealization?: { [role: string]: string };
  slotRealization?: { [role: string]: unknown };
  placement?: TranslationPlacement;
  constructions?: readonly SenseConstruction[];
  adverbializations?: readonly MorphemeAdverbialization[];
  senseFrame?: NormalizedSenseFrame;
  senseFrames?: readonly NormalizedSenseFrame[];
  senseCaseRealization?: { readonly [role: string]: unknown } | null;
  senseSlotRealization?: { readonly [role: string]: unknown } | null;
  senseIndex?: number;
  priorityGroup?: number;
  priorityInGroup?: number;
  sourceFormat?: "senses";
  attachLeft?: boolean;
  attachRight?: boolean;
}

export interface MorphemeAdverbializationRendering {
  korean: string;
  koreanPos?: number;
  irregular?: IrregularType | null;
}

export interface MorphemeAdverbializationProjection {
  kind: "nominalAdverbial";
  suffix: string;
}

export interface MorphemeAdverbializationFollowing {
  adverbialScope?: boolean;
  requestOrImperative?: boolean;
  blockedNextDictionaryForms?: readonly string[];
}

export interface MorphemeAdverbialization {
  particle: string;
  kind: string;
  consumeParticle?: boolean;
  following?: MorphemeAdverbializationFollowing;
  rendering?: MorphemeAdverbializationRendering;
  projection?: MorphemeAdverbializationProjection;
}

export interface MorphemeCasePreference {
  role?: string;
  korean?: string;
  allomorphKey?: string;
}

export interface MorphemeConnectivePreference {
  role?: string;
  connective?: string;
  ending?: string;
  relation?: string;
}

export interface MorphemeDerivation {
  id?: string;
  type?: string;
  baseForm?: string;
  baseReading?: string;
}

export interface MorphemeEntry {
  surface?: string;
  dictionaryForm?: string;
  reading?: string;
  dictionaryFormReading?: string;
  pos?: HaruPos;
  baseForm?: string;
  baseReading?: string;
  aliasOf?: string | MorphemeAliasTarget;
  conjugationType?: number | null;
  conjugationForm?: string | null;
  derivations?: readonly MorphemeDerivation[];
  derivation?: MorphemeDerivation | null;
  senses?: readonly MorphemeSense[];
  sourceFormat?: "senses";
  matchReason?: string;
  ambiguousCount?: number;
  synthetic?: boolean;
  syntheticReason?: string;
}

export interface MorphemeAliasTarget {
  dictionaryForm: string;
  reading: string;
  pos: HaruPos;
}

export interface PatternTriggerElement {
  pos0?: string | null;
  pos1?: string | null;
  surface?: string | null;
  reading?: string | null;
  dictionaryForm?: string | readonly string[] | null;
  conjugationForm?: string | null;
  lookup?: string | null;
}

export interface PatternEntry {
  id: string;
  trigger: readonly PatternTriggerElement[];
  mainVerbEnding: string;
  tailLemma?: string | null;
  tailIrregular?: IrregularType | null;
  tailText?: string | null;
  phase?: "postVerb" | "postAux" | string;
  outputMode?: "standard" | "connective" | "compound" | "hybrid" | string;
  connectiveEnding?: string | null;
  middleText?: string | null;
  auxPrecondition?: PatternAuxPrecondition | null;
  tailKoreanPos?: string;
  rejectFollowedBy?: readonly string[];
  rejectFollowedByDictForm?: readonly string[];
  rejectFollowedByPos0?: readonly string[];
  rejectPrevDictForm?: readonly string[];
  transparentTail?: boolean;
  description?: string;
}

export interface PatternAuxPrecondition {
  lastPos4: string;
  lastPos5Contains?: string | null;
  lastSurfaceIn?: readonly string[] | null;
}

export interface CollocationMatchElement {
  surface: string;
  dictionaryForm?: string | readonly string[] | null;
  pos: readonly string[];
}

export type CollocationEmitInstruction =
  | {
    type: "ref";
    index: number;
  }
  | CollocationOverrideInstruction
  | CollocationSyntheticInstruction;

export interface CollocationOverrideInstruction {
  type: "override";
  index: number;
  surface?: string;
  reading?: string;
  dictionaryForm?: string;
  dictionaryFormReading?: string;
  normalizedForm?: string;
  pos?: readonly string[];
  surfacePrefix?: string;
  readingPrefix?: string;
  posPrefix?: readonly string[];
}

export interface CollocationSyntheticInstruction {
  type: "synthetic";
  surface?: string;
  reading: string;
  dictionaryForm: string;
  dictionaryFormReading?: string;
  normalizedForm?: string;
  pos: readonly string[];
  dictionaryId?: number;
  syntheticReason?: string;
  koreanOverride?: string;
  koreanOverrideByRegister?: RegisterKoreanOverride;
}

export interface CollocationEntry {
  match: readonly CollocationMatchElement[];
  emit: readonly CollocationEmitInstruction[];
  forbidPrevDictionaryForms?: readonly string[];
  requirePrevPosPrefixAny?: readonly (readonly string[])[];
  requirePrevSurfaceAny?: readonly string[];
  requirePrevLookupAny?: readonly string[];
  requirePrevExists?: boolean;
  forbidNextDictionaryForms?: readonly string[];
  forbidNextPosPrefixAny?: readonly (readonly string[])[];
  requireNextPosPrefixAny?: readonly (readonly string[])[];
  forbidAtTokensEnd?: boolean;
}
