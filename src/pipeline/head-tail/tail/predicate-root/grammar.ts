
import type { IrregularType } from "../../../../generator/conjugator.js";
import type { ParticleKey } from "../../../../generator/particles.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { NumericStemBase } from "../../../../types/numeric-base.js";
import type { KoreanPoliteForms } from "../../../../types/dictionary.js";
import type { PronominalNoHeadStemBase } from "../../../nominal-phrase-surface.js";
import type { TargetSegment } from "../../../../types/projection.js";
import type { BenefactiveCausativeAgentPolicy } from "../../../../types/pipeline.js";
import type { ResolvedDerivation } from "../../../../dictionary/derivation.js";
import type { StemCandidateIdentity, StemCandidateProvenance } from "./stem-candidate-identity.js";
import type { PassiveClass } from "../../../voice-class.js";
import type { EvidenceClassification, EvidenceEffect } from "../../../candidate-observability.js";
import { SCOPE_BRIDGE_FOCUS_KIND_VALUES, type ScopeBridgeFocusKind } from "../../data/scope-bridge-focus-table.js";
import type { AffirmativeSupportFocus, NegationFocusParticle } from "../../data/predicate-focus-support-table.js";
import type { ClauseTerminalPunctuationRunEvidence } from "../../../clause-layout/punctuation.js";
import type { UtteranceClosureKind } from "../../../clause-layout/utterance-closure.js";
import type { ConnectiveRetrospectiveQuotativeFlavor } from "./connective-surface-table.js";
import { POS01, POS5A, 意志推量形_, 動詞_非自立可能, 形状詞_助動詞語幹, 連用形_, 감탄사, 동사, 형용사, is五段, is上一段, is下一段, サ行変格, カ行変格 } from "../../../../types/pos.js";


export interface OpSource {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tokenIndices: readonly number[];
}


export type VerbConjType =
  | "godan"
  | "ichidan"
  | "sahen"
  | "kahen"
  | "irregular";

export type StemCommitment = "suppletive_negation" | "resolved_sense";
export type StemMood = "volitional" | "conjectural";

export const STEM_MOOD_VALUES = [
  "volitional",
  "conjectural"
] as const satisfies readonly StemMood[];
export type ShortNegationPolicy = "sahen_split" | "lexical_prefix" | "long_only";
export type SourcePredicateShape =
  | "i_adjective"
  | "verb"
  | "sahen_verbalization"
  | "na_adjective"
  | "nominal"
  | "particle_phrase"
  | "lexical_adverb";
export const SOURCE_PREDICATE_SHAPE_VALUES = [
  "i_adjective",
  "verb",
  "sahen_verbalization",
  "na_adjective",
  "nominal",
  "particle_phrase",
  "lexical_adverb"
] as const satisfies readonly SourcePredicateShape[];

interface StemAnchorFields {
  readonly conjugationAnchor: number;
  readonly semanticAnchors: readonly number[];
  readonly stemMood?: StemMood;
  readonly commitment?: StemCommitment;
  readonly shortNegationPolicy?: ShortNegationPolicy;
  readonly absorbedPassiveAux?: boolean;
  readonly absorbedPassiveClass?: PassiveClass;
  readonly sourcePredicateShape?: SourcePredicateShape;
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
  readonly derivationalBase?: DerivationalStemBase;
  readonly projectedHost?: ProjectedHostSegments;
}

export interface ProjectedHostSegments {
  readonly segments: readonly TargetSegment[];
}

export interface DerivationalStemBase {
  readonly profileId: string;
  readonly host: TailRoot;
  readonly suffix: PredicateSuffixOp;
}

export interface VerbStem extends StemAnchorFields {
  readonly kind: "verb";
  readonly lemma: string;
  readonly conj: VerbConjType;
  readonly irregular: IrregularType | null;
  readonly source: OpSource;
}

export interface AdjStem extends StemAnchorFields {
  readonly kind: "adj";
  readonly lemma: string;
  readonly irregular: IrregularType | null;
  readonly source: OpSource;
}

export interface NounStem extends StemAnchorFields {
  readonly kind: "noun";
  readonly lemma: string;
  readonly nominalizedFrom?: "predicate";
  readonly nominalTargetForVerbalSource?: boolean;
  readonly adverbialNominalFallback?: true;
  readonly interjection?: { readonly polite?: KoreanPoliteForms };
  readonly sahen: boolean;
  readonly source: OpSource;
  readonly numericBase?: NumericStemBase;
  readonly pronominalNoHeadBase?: PronominalNoHeadStemBase;
}

export interface AdverbStem extends StemAnchorFields {
  readonly kind: "adverb";
  readonly lemma: string;
  readonly source: OpSource;
}

export interface StemCandidate {
  readonly provenance: StemCandidateProvenance;
  readonly lemma: string;
  readonly intrinsicHonorific?: boolean;
  readonly irregular: IrregularType | null;
  readonly conj?: VerbConjType;
  readonly koreanPos?: number;
  readonly nominalized?: string;
  readonly adverbial?: string;
  readonly koreanPolite?: KoreanPoliteForms;
  readonly connectiveRole?: string | readonly string[] | null;
  readonly connectivePreferences?: unknown;
  readonly connective_preferences?: unknown;
  readonly casePreferences?: unknown;
  readonly caseRealization?: unknown;
  readonly slotRealization?: unknown;
  readonly senseFrame?: unknown;
  readonly senseFrames?: unknown;
  readonly senseCaseRealization?: unknown;
  readonly senseSlotRealization?: unknown;
  readonly priorityGroup?: number;
  readonly priorityInGroup?: number;
  readonly senseIndex?: number;
  readonly projectionOrdinal: number;
  readonly derivation?: ResolvedDerivation;
  readonly derivationOrder?: number;
  readonly sourceFormat?: "senses";
  readonly dropFirstNegativeAux?: boolean;
  readonly dropFirstPassiveAux?: boolean;
  readonly dropFirstCausativeAux?: boolean;
  readonly teIruResultative?: boolean;
  readonly teIruDropAux?: boolean;
  readonly teIruContractToPast?: boolean;
  readonly shortNegationPolicy?: ShortNegationPolicy;
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
  readonly nominalTargetForVerbalSource?: boolean;
  readonly sourceVerbalPredicateVerdict?: import("../../../../types/pipeline.js").SourceVerbalPredicateVerdict;
}

export function nounStemInterjectionForCandidate(
  candidate: Pick<StemCandidate, "koreanPos" | "koreanPolite">
): { readonly interjection: NonNullable<NounStem["interjection"]> } | Record<string, never> {
  if (candidate.koreanPos !== 감탄사) {
    return {};
  }
  return { interjection: candidate.koreanPolite === undefined ? {} : { polite: candidate.koreanPolite } };
}

export type HeadHypothesisCandidateStatus = "admitted" | "dropped";

export interface HeadSourceCapabilityVector {
  readonly nominalLike: boolean;
  readonly iAdjectivePredicate: boolean;
  readonly verbPredicate: boolean;
  readonly naAdjectiveCapable: boolean;
  readonly keijouCapable: boolean;
  readonly naAdjectiveCapableNoun: boolean;
  readonly bareNaAdjectiveSet: boolean;
  readonly sahenVerbalizationCapable: boolean;
  readonly adverbialCapable: boolean;
  readonly adverbCapableNominal: boolean;
  readonly lexicalAdverb: boolean;
  readonly inflectionClass: string | null;
  readonly stemForm: string | null;
}

export function sourcePredicateShapeForCapabilities(
  sourceCapabilities: HeadSourceCapabilityVector,
  sahenVerbalization: boolean
): SourcePredicateShape {
  if (sahenVerbalization && sourceCapabilities.sahenVerbalizationCapable) {
    return "sahen_verbalization";
  }
  if (sourceCapabilities.iAdjectivePredicate) {
    return "i_adjective";
  }
  if (sourceCapabilities.lexicalAdverb) {
    return "lexical_adverb";
  }
  if (sourceCapabilities.naAdjectiveCapable) {
    return "na_adjective";
  }
  if (sourceCapabilities.verbPredicate) {
    return "verb";
  }
  return "nominal";
}

export type TailRelation =
  | "modification"
  | "quote_body";

export type HeadProjectionKind =
  | "direct_nominal"
  | "nominalized_predicate"
  | "stem_root_nominal"
  | "verbal_nominal_m"
  | "direct_adjectival"
  | "projected_nominal_adjectival"
  | "direct_verbal"
  | "sahen_verbalized_nominal"
  | "adverbialized_adjectival"
  | "adverbialized_verbal"
  | "direct_adverbial"
  | "adverbial_nominal_fallback";
export const HEAD_PROJECTION_KIND_VALUES = [
  "direct_nominal",
  "nominalized_predicate",
  "stem_root_nominal",
  "verbal_nominal_m",
  "direct_adjectival",
  "projected_nominal_adjectival",
  "direct_verbal",
  "sahen_verbalized_nominal",
  "adverbialized_adjectival",
  "adverbialized_verbal",
  "direct_adverbial",
  "adverbial_nominal_fallback"
] as const satisfies readonly HeadProjectionKind[];

export type KoreanRealizationCategory =
  | "nominal"
  | "adjectival_predicate"
  | "verbal_predicate"
  | "adverbial";
export const KOREAN_REALIZATION_CATEGORY_VALUES = [
  "nominal",
  "adjectival_predicate",
  "verbal_predicate",
  "adverbial"
] as const satisfies readonly KoreanRealizationCategory[];

export function koreanRealizationCategoryForProjectionKind(
  projectionKind: HeadProjectionKind
): KoreanRealizationCategory {
  switch (projectionKind) {
    case "direct_nominal":
    case "nominalized_predicate":
    case "stem_root_nominal":
    case "verbal_nominal_m":
    case "adverbial_nominal_fallback":
      return "nominal";
    case "direct_adjectival":
    case "projected_nominal_adjectival":
    case "adverbialized_adjectival":
      return "adjectival_predicate";
    case "direct_verbal":
    case "sahen_verbalized_nominal":
    case "adverbialized_verbal":
      return "verbal_predicate";
    case "direct_adverbial":
      return "adverbial";
  }
}

export type CapabilityId =
  | "lexical_nominal"
  | "lexical_verbal"
  | "i_adjectival"
  | "na_adjectival"
  | "sahen_verbal"
  | "adverbial"
  | "sense_rendering";

export type AdjectivalInflection = "i" | "na";

export interface HeadLicensing {
  readonly adjectivalInflection?: AdjectivalInflection;
}

export interface HeadRealization {
  readonly category: KoreanRealizationCategory;
  readonly projectionKind: HeadProjectionKind;
}

export interface CandidateCapability {
  readonly id: CapabilityId;
  readonly choices: readonly HeadRealization[];
  readonly orderKey: {
    readonly priorityGroup?: number;
    readonly priorityInGroup?: number;
    readonly projectionOrder?: number;
  };
  readonly source:
  | "lexical_pos"
  | "i_adjective_inflection"
  | "na_adjective_capability"
  | "sahen_capability"
  | "adverbial_capability"
  | "sense_rendering";
}

export interface CandidateHeadProfile {
  readonly capabilities: readonly CandidateCapability[];
}

export interface HeadCommitPolicy {
  readonly default?: "ordinary";
  readonly adverbial?: "explicit_evidence_required" | "ordinary";
  readonly opChainHost?: "inflecting_predicate_lemma";
  readonly hostBase?: "lexical_stem_root";
}

export interface CarrierHeadContract {
  readonly relation: TailRelation;
  readonly accepts: readonly HeadProjectionKind[];
  readonly candidatePreference?: readonly (readonly HeadProjectionKind[])[];
  readonly realizationOrder?: readonly (readonly HeadProjectionKind[])[];
  readonly requires?: HeadLicensing;
  readonly commitPolicy?: HeadCommitPolicy;
  readonly contextReason?: string;
}

export interface HeadHypothesisCandidate {
  readonly index: number;
  readonly lemma: string;
  readonly dictionaryLemma?: string;
  readonly koreanPos?: number;
  readonly projectedStemKind?: "verb" | "adj" | "noun" | "adverb";
  readonly irregular?: IrregularType | null;
  readonly priorityGroup?: number;
  readonly priorityInGroup?: number;
  readonly senseIndex?: number;
  readonly provenance: StemCandidateProvenance;
  readonly projectionOrdinal: number;
  readonly sourceFormat?: "senses";
  readonly status: HeadHypothesisCandidateStatus;
  readonly stage: "dictionary" | "stem_compatibility" | "lemma_normalization";
  readonly reason?: string;
  readonly preservedCandidate?: StemCandidate;
  readonly headProfile?: CandidateHeadProfile;
}

export interface HeadHypothesisCarrier {
  readonly sourceStemKind: "verb" | "adj" | "noun";
  readonly admittedStemKind: "verb" | "adj" | "noun" | "adverb";
  readonly source: OpSource;
  readonly sourceCapabilities: HeadSourceCapabilityVector;
  readonly originalCandidateCount: number;
  readonly preservedCandidateCount: number;
  readonly admittedCandidateCount: number;
  readonly droppedCandidateCount: number;
  readonly candidates: readonly HeadHypothesisCandidate[];
  readonly currentWinnerIndex?: number;
}

export type HeadTailEvidenceCandidateDecisionState =
  | "pruned"
  | "eligible"
  | "preferred"
  | "selected";

export type HeadTailEvidenceCandidateContractMaterializability =
  | "no_accepted_choice"
  | "materializable"
  | "accepted_but_non_materializable";

export interface HeadTailEvidenceCandidateDecision {
  readonly index: number;
  readonly lemma: string;
  readonly state: HeadTailEvidenceCandidateDecisionState;
  readonly contractMaterializability: HeadTailEvidenceCandidateContractMaterializability;
  readonly statusBeforeDecision: HeadHypothesisCandidateStatus;
  readonly stemCandidateIndex?: number;
  readonly stemCandidateIndexSource?: "strict_identity" | "unique_loose";
  readonly stemCommitStatus?: "committed" | "deferred" | "not_applicable";
  readonly stemCommitReason?: string;
  readonly projectedStemKind?: "verb" | "adj" | "noun" | "adverb";
  readonly koreanPos?: number;
  readonly priorityGroup?: number;
  readonly priorityInGroup?: number;
  readonly senseIndex?: number;
  readonly provenance: StemCandidateProvenance;
  readonly projectionOrdinal: number;
  readonly pruneReason?: string;
  readonly contextReason?: string;
  readonly exclusionReason?: string;
  readonly realizationChoices?: readonly HeadTailEvidenceRealizationChoiceDecision[];
}

export interface HeadTailEvidenceRealizationChoiceDecision extends HeadRealization {
  readonly capabilityId: CapabilityId;
  readonly state: "rejected" | "eligible" | "preferred" | "selected";
  readonly reason?: string;
}

export interface HeadTailEvidenceSelectedRealizationChoice extends HeadRealization {
  readonly candidateIndex: number;
  readonly capabilityId: CapabilityId;
}

export interface HeadTailEvidenceRuleDecision {
  readonly rule: string;
  readonly result: "pruned" | "preferred" | "selected" | "no_decision";
  readonly classification: Exclude<EvidenceClassification, "unclassified">;
  readonly effect: EvidenceEffect;
  readonly reason?: string;
  readonly candidateIndices?: readonly number[];
}

export interface StemCandidateRealization {
  readonly category: KoreanRealizationCategory;
  readonly projectionKinds: readonly HeadProjectionKind[];
}

export interface HeadTailEvidenceDecision {
  readonly contractOwner?: string;
  readonly contractAccepts?: readonly HeadProjectionKind[];
  readonly contractRealizationOrder?: readonly (readonly HeadProjectionKind[])[];
  readonly candidateOpenSet: readonly StemCandidateIdentity[];
  readonly rules: readonly HeadTailEvidenceRuleDecision[];
  readonly candidates: readonly HeadTailEvidenceCandidateDecision[];
}

export interface CandidateSetStem extends StemAnchorFields {
  readonly kind: "candidateSet";
  readonly candidates: readonly StemCandidate[];
  readonly committedSenseRealization?: StemCandidateRealization | null;
  readonly committedSense?: StemCandidateIdentity;
  readonly headHypothesis?: HeadHypothesisCarrier;
  readonly source: OpSource;
}

export type StemNode = VerbStem | AdjStem | NounStem | AdverbStem | CandidateSetStem;
export const STEM_KIND_VALUES = [
  "verb",
  "adj",
  "noun",
  "adverb",
  "candidateSet"
] as const satisfies readonly StemNode["kind"][];


export type Polarity = "affirmative" | "negative";

export const POLARITY_VALUES = [
  "affirmative",
  "negative"
] as const satisfies readonly Polarity[];

export type NegationSourceSplitKind = "predicate_copula_negative";
export const NEGATION_SOURCE_SPLIT_KIND_VALUES = [
  "predicate_copula_negative"
] as const satisfies readonly NegationSourceSplitKind[];

export {
  AFFIRMATIVE_SUPPORT_FOCUS_VALUES,
  NEGATION_FOCUS_PARTICLE_VALUES,
  affirmativeSupportFocusForMarker,
  negationFocusParticleForMarker,
  type AffirmativeSupportFocus,
  type FocusSupportForm,
  type NegationFocusParticle
} from "../../data/predicate-focus-support-table.js";


export interface NegationOp {
  readonly kind: "negation";
  readonly source: OpSource;
  readonly chainDepth: number;
  readonly chainPast: boolean;
  readonly stemAux: readonly RuntimeHaruToken[];
  readonly sourceSplit?: {
    readonly kind: NegationSourceSplitKind;
    readonly bridgeTokens: readonly RuntimeHaruToken[];
    readonly finalTokens: readonly RuntimeHaruToken[];
  };
  readonly preferShortNegation: boolean;
  readonly focusParticle?: NegationFocusParticle;
  readonly inability?: true;
  readonly inner?: TailNode;
}

export interface TenseOp {
  readonly kind: "tense";
  readonly source: OpSource;
  readonly tense: TenseKind;
}

export type TenseKind = "past";

export const TENSE_VALUES = [
  "past"
] as const satisfies readonly TenseKind[];

export interface PoliteOp {
  readonly kind: "polite";
  readonly source: OpSource;
}

export type ClassicalAuxResidueKind = "assertive_nari" | "resultative_ri" | "perfective_nu";

export const CLASSICAL_AUX_RESIDUE_VALUES = [
  "assertive_nari",
  "resultative_ri",
  "perfective_nu"
] as const satisfies readonly ClassicalAuxResidueKind[];

export interface ClassicalAuxResidueOp {
  readonly kind: "classicalAuxResidue";
  readonly residue: ClassicalAuxResidueKind;
  readonly source: OpSource;
}

export interface DesireOp {
  readonly kind: "desire";
  readonly source: OpSource;
  readonly form?: "tagaru";
}

export type VoiceKind = "passive" | "potential" | "causative" | "causative_passive" | "honorific";

export const VOICE_VALUES = [
  "passive",
  "potential",
  "causative",
  "causative_passive",
  "honorific"
] as const satisfies readonly VoiceKind[];

export function voiceBlocksVolitionalSpeechAct(voice: VoiceKind): boolean {
  switch (voice) {
    case "passive":
    case "causative_passive":
    case "honorific":
    case "potential":
      return true;
    case "causative":
      return false;
    default: {
      const exhaustive: never = voice;
      return exhaustive;
    }
  }
}

export type VoiceReadingCandidate = "passive" | "potential" | "honorific";
export const VOICE_READING_VALUES = [
  "passive",
  "potential",
  "honorific"
] as const satisfies readonly VoiceReadingCandidate[];

export interface VoiceOp {
  readonly kind: "voice";
  readonly source: OpSource;
  readonly voice: VoiceKind;
  readonly candidates?: readonly VoiceReadingCandidate[];
  readonly forcePassive: boolean;
  readonly passiveClass?: PassiveClass;
  readonly adversativePassive: boolean;
  readonly adversativePassiveAgentPromoted: boolean;
  readonly adversativePassiveBaseLemma?: string;
  readonly adversativePassiveBaseIrregular?: IrregularType | null;
  readonly honorificFormulaicConstruction?: true;
}

export interface ConjectureOp {
  readonly kind: "conjecture";
  readonly source: OpSource;
  readonly polite: boolean;
}

export type CopulaVariantKind = "basic" | "conditional_nara" | "conjecture";
export type CopulaBasicForm = "adverbial_ni";
export type CopulaNegativeBridgeForm = "ja" | "dewa";

export const COPULA_VARIANT_VALUES = [
  "basic",
  "conditional_nara",
  "conjecture"
] as const satisfies readonly CopulaVariantKind[];
export const COPULA_BASIC_FORM_VALUES = [
  "adverbial_ni"
] as const satisfies readonly CopulaBasicForm[];
export const COPULA_NEGATIVE_BRIDGE_FORM_VALUES = [
  "ja",
  "dewa"
] as const satisfies readonly CopulaNegativeBridgeForm[];
export const COPULA_HONORIFIC_VALUES = [true] as const satisfies readonly true[];

export interface CopulaOp {
  readonly kind: "copula";
  readonly source: OpSource;
  readonly variant: CopulaVariantKind;
  readonly basicForm?: CopulaBasicForm;
  readonly polarity: Polarity;
  readonly negativeBridgeForm?: CopulaNegativeBridgeForm;
  readonly honorific?: true;
  readonly polite: boolean;
}


export type WakeVariant =
  | "explanatory"
  | "rhetorical_no_way"
  | "rhetorical_possibility"
  | "partial_negation"
  | "weakened_partial_negation";

export const WAKE_VARIANT_VALUES = [
  "explanatory",
  "rhetorical_no_way",
  "rhetorical_possibility",
  "partial_negation",
  "weakened_partial_negation"
] as const satisfies readonly WakeVariant[];

export interface WakeModalOp {
  readonly kind: "modal";
  readonly modal: "wake";
  readonly source: OpSource;
  readonly variant: WakeVariant;
  readonly polarity: Polarity;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export interface HazuModalOp {
  readonly kind: "modal";
  readonly modal: "hazu";
  readonly source: OpSource;
  readonly polarity: Polarity;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export interface KamoModalOp {
  readonly kind: "modal";
  readonly modal: "kamo";
  readonly source: OpSource;
  readonly polite: boolean;
  readonly past: boolean;
  readonly outerLayers: number;
  readonly bare: boolean;
  readonly inner?: TailNode;
}

export interface NodaModalOp {
  readonly kind: "modal";
  readonly modal: "noda";
  readonly source: OpSource;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export type YoudaForm = "youda" | "mitai";
export const YOUDA_FORM_VALUES = ["youda", "mitai"] as const satisfies readonly YoudaForm[];
export type YoudaTerminal = "predicative" | "adverbial_ni" | "attributive_na";
export type YoudaReadingCandidate = "likeness";
export const YOUDA_TERMINAL_VALUES = [
  "predicative",
  "adverbial_ni",
  "attributive_na"
] as const satisfies readonly YoudaTerminal[];
export const YOUDA_READING_VALUES = ["likeness"] as const satisfies readonly YoudaReadingCandidate[];

export interface YoudaModalOp {
  readonly kind: "modal";
  readonly modal: "youda";
  readonly source: OpSource;
  readonly form: YoudaForm;
  readonly terminal: YoudaTerminal;
  readonly reading: YoudaReadingCandidate;
  readonly candidates?: readonly YoudaReadingCandidate[];
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export type SoudaReadingCandidate = "hearsay" | "yotai";
export const SOUDA_READING_VALUES = [
  "hearsay",
  "yotai"
] as const satisfies readonly SoudaReadingCandidate[];

export interface SoudaHearsayModalOp {
  readonly kind: "modal";
  readonly modal: "souda_hearsay";
  readonly source: OpSource;
  readonly reading: SoudaReadingCandidate;
  readonly candidates?: readonly SoudaReadingCandidate[];
  readonly polite: boolean;
  readonly past: boolean;
  readonly negationFocusParticle?: NegationFocusParticle;
  readonly inner?: TailNode;
}

export interface RashiiModalOp {
  readonly kind: "modal";
  readonly modal: "rashii";
  readonly source: OpSource;
  readonly reading: YoudaReadingCandidate;
  readonly candidates?: readonly YoudaReadingCandidate[];
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export type TsumoriVariant = "affirmative" | "topic_negative" | "copula_negative";
export type TsumoriReadingCandidate = "intention" | "counterfactual_assumption";
export const TSUMORI_VARIANT_VALUES = [
  "affirmative",
  "topic_negative",
  "copula_negative"
] as const satisfies readonly TsumoriVariant[];
export const TSUMORI_READING_VALUES = [
  "intention",
  "counterfactual_assumption"
] as const satisfies readonly TsumoriReadingCandidate[];

export interface TsumoriModalOp {
  readonly kind: "modal";
  readonly modal: "tsumori";
  readonly source: OpSource;
  readonly variant: TsumoriVariant;
  readonly reading: TsumoriReadingCandidate;
  readonly candidates?: readonly TsumoriReadingCandidate[];
  readonly polarity: Polarity;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export type TokoroVariant =
  | "temporal"
  | "almost"
  | "about_to"
  | "progress_observation";
export const TOKORO_VARIANT_VALUES = [
  "temporal",
  "almost",
  "about_to",
  "progress_observation"
] as const satisfies readonly TokoroVariant[];

export type TokoroReadingCandidate = "temporal" | "place" | "intention";
export type TokoroNominalNoun = "곳" | "부분" | "바";
export const TOKORO_READING_VALUES = [
  "temporal",
  "place",
  "intention"
] as const satisfies readonly TokoroReadingCandidate[];
export const TOKORO_NOMINAL_NOUN_VALUES = [
  "곳",
  "부분",
  "바"
] as const satisfies readonly TokoroNominalNoun[];

export interface TokoroModalOp {
  readonly kind: "modal";
  readonly modal: "tokoro";
  readonly source: OpSource;
  readonly variant: TokoroVariant;
  readonly candidates?: readonly TokoroReadingCandidate[];
  readonly reading?: TokoroReadingCandidate;
  readonly nominalNoun?: TokoroNominalNoun;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export interface MaiModalOp {
  readonly kind: "modal";
  readonly modal: "mai";
  readonly source: OpSource;
  readonly polite: false;
  readonly past: false;
  readonly inner?: TailNode;
}

export type LimitNegationFocus = "wa" | "mo";
export const LIMIT_NEGATION_FOCUS_VALUES = ["wa", "mo"] as const satisfies readonly LimitNegationFocus[];

export interface LimitNegationModalOp {
  readonly kind: "modal";
  readonly modal: "limit_negation";
  readonly source: OpSource;
  readonly focus: LimitNegationFocus;
  readonly polite: boolean;
  readonly past: false;
  readonly inner?: TailNode;
}

export type MonoModalForm = "mono" | "mon";
export type MonoModalReading = "nominal" | "admirative" | "habitual";
export const MONO_MODAL_READING_VALUES = [
  "nominal",
  "admirative",
  "habitual"
] as const satisfies readonly MonoModalReading[];

export interface MonoModalEvidence {
  readonly frequencyAdverb: boolean;
  readonly evaluativeFrequencyAdverb: boolean;
  readonly admirativeAdverb: boolean;
}

export const MONO_MODAL_NO_EVIDENCE: MonoModalEvidence = {
  frequencyAdverb: false,
  evaluativeFrequencyAdverb: false,
  admirativeAdverb: false
};

export function hostCarriesPreModalPast(ops: readonly AuxOpNode[], index: number): boolean {
  const previous = ops[index - 1];
  return (previous?.kind === "tense" && previous.tense === "past") ||
    (previous?.kind === "negation" && previous.chainPast);
}

export interface MonoModalOp {
  readonly kind: "modal";
  readonly modal: "mono";
  readonly source: OpSource;
  readonly form: MonoModalForm;
  readonly reading: MonoModalReading;
  readonly candidates?: readonly MonoModalReading[];
  readonly evidence: MonoModalEvidence;
  readonly polite: boolean;
  readonly past: boolean;
  readonly inner?: TailNode;
}

export type ModalOp =
  | MonoModalOp
  | WakeModalOp
  | HazuModalOp
  | KamoModalOp
  | NodaModalOp
  | YoudaModalOp
  | SoudaHearsayModalOp
  | RashiiModalOp
  | TsumoriModalOp
  | TokoroModalOp
  | MaiModalOp
  | LimitNegationModalOp;

export type ModalKind = ModalOp["modal"];


export type ScopeBridgeHead = "wake" | "no" | "koto" | "implicit" | null;
export type ScopeBridgeForm = "dewa" | "ja" | "demo" | "topic";
export type ScopeBridgeParticle = ScopeBridgeFocusKind | null;

export const SCOPE_BRIDGE_HEAD_VALUES = [
  "wake",
  "no",
  "koto",
  "implicit",
  null
] as const satisfies readonly ScopeBridgeHead[];
export const SCOPE_BRIDGE_FORM_VALUES = [
  "dewa",
  "ja",
  "demo",
  "topic"
] as const satisfies readonly ScopeBridgeForm[];
export const SCOPE_BRIDGE_PARTICLE_VALUES = [
  ...SCOPE_BRIDGE_FOCUS_KIND_VALUES,
  null
] as const satisfies readonly ScopeBridgeParticle[];

export type ScopeBridgeMarkerTagging = "particle" | "copula";
export const SCOPE_BRIDGE_MARKER_TAGGING_VALUES = [
  "particle",
  "copula"
] as const satisfies readonly ScopeBridgeMarkerTagging[];

export interface ScopeBridgeOp {
  readonly kind: "scopeBridge";
  readonly source: OpSource;
  readonly head: ScopeBridgeHead;
  readonly form: ScopeBridgeForm;
  readonly particle: ScopeBridgeParticle;
  readonly markerTagging?: ScopeBridgeMarkerTagging | undefined;
  readonly polarity: Polarity;
  readonly chainDepth: number;
  readonly polite: boolean;
  readonly conjecture?: boolean;
}

export interface AdjCopulaBridgeOp {
  readonly kind: "adjCopulaBridge";
  readonly source: OpSource;
  readonly form: AdjCopulaBridgeForm;
  readonly supportAru: boolean;
}

export type AdjCopulaBridgeForm = "ja" | "dewa";
export const ADJ_COPULA_BRIDGE_FORM_VALUES = [
  "ja",
  "dewa"
] as const satisfies readonly AdjCopulaBridgeForm[];


export type BenefactiveKind =
  | "kureru"
  | "kudasaru"
  | "ageru"
  | "morau"
  | "itadaku";
export const BENEFACTIVE_KIND_VALUES = [
  "kureru",
  "kudasaru",
  "ageru",
  "morau",
  "itadaku"
] as const satisfies readonly BenefactiveKind[];

export type BenefactivePivot =
  | "unresolved"
  | "subject_side"
  | "speaker_side"
  | "agent_side";
export const BENEFACTIVE_PIVOT_VALUES = [
  "unresolved",
  "subject_side",
  "speaker_side",
  "agent_side"
] as const satisfies readonly BenefactivePivot[];

export type BenefactiveLexicalTailAbsorptionKind =
  | "embedded_juda"
  | "honorific_jusida";
export const BENEFACTIVE_LEXICAL_TAIL_ABSORPTION_VALUES = [
  "embedded_juda",
  "honorific_jusida"
] as const satisfies readonly BenefactiveLexicalTailAbsorptionKind[];

export type { BenefactiveCausativeAgentPolicy } from "../../../../types/pipeline.js";

export type BenefactiveCausativeRenderPolicy =
  | "lexical_recipient_humble_action"
  | "implicit_permission_sahen_lexical_causative"
  | "implicit_permission_sahen_periphrastic";
export const BENEFACTIVE_CAUSATIVE_RENDER_POLICY_VALUES = [
  "lexical_recipient_humble_action",
  "implicit_permission_sahen_lexical_causative",
  "implicit_permission_sahen_periphrastic"
] as const satisfies readonly BenefactiveCausativeRenderPolicy[];

export interface BenefactivePayload {
  readonly kind: BenefactiveKind;
  readonly pivot: BenefactivePivot;
  readonly honorific: boolean;
  readonly potential: boolean;
  readonly tailLemma: string | null;
  readonly tailIrregular: IrregularType | null;
  readonly tailKoreanPos: number | null;
  readonly lexicalTailAbsorptionKind: BenefactiveLexicalTailAbsorptionKind | null;
  readonly agentParticleIdx: number | null;
  readonly recipientParticleIdx: number | null;
  readonly needsBenefactivePivot: boolean;
  readonly recipientSideHumble: boolean;
  readonly causativeAgentPolicy: BenefactiveCausativeAgentPolicy | null;
  readonly causativeRenderPolicy: BenefactiveCausativeRenderPolicy | null;
}

export interface RequestPayload {
  readonly kind: string;
  readonly register: string;
  readonly polite: boolean;
  readonly honorific: boolean;
}

export interface DesiderativePayload {
  readonly kind: string;
  readonly desiredPredicateNegative: boolean;
  readonly desireNegative: boolean;
  readonly desirePast: boolean;
  readonly polite: boolean;
  readonly desiredClauseForm: string;
}

export interface ProhibitionPayload {
  readonly kind: "naide_kudasai";
  readonly polite: boolean;
  readonly requestTail: ProhibitionRequestTail;
}

export type ProhibitionRequestTail = "bare" | "kure" | "kudasai";
export const PROHIBITION_REQUEST_TAIL_VALUES = [
  "bare",
  "kure",
  "kudasai"
] as const satisfies readonly ProhibitionRequestTail[];

interface AspectOpBase {
  readonly kind: "aspect";
  readonly source: OpSource;
  readonly teFocusParticle?: AspectTeFocusParticle;
  readonly teFocusTarget?: AspectTeFocusTarget;
  readonly ellipticTeIruSourceHost?: EllipticTeIruSourceHost;
  readonly terminalMood?: AspectTerminalMood;
}

export type AspectTeFocusParticle = "は" | "も";
export type AspectSemanticParticle = "が" | "を";
export type AspectTeFocusTarget = "aspect_auxiliary_negation";
export type EllipticTeIruSourceHost = "verbal_predicate";
export type AspectTerminalMood = "imperative";
export const ASPECT_TE_FOCUS_TARGET_VALUES = [
  "aspect_auxiliary_negation"
] as const satisfies readonly AspectTeFocusTarget[];
export const ELLIPTIC_TE_IRU_SOURCE_HOST_VALUES = [
  "verbal_predicate"
] as const satisfies readonly EllipticTeIruSourceHost[];
export const ASPECT_TERMINAL_MOOD_VALUES = [
  "imperative"
] as const satisfies readonly AspectTerminalMood[];

export type AspectSemanticReading =
  | "generic"
  | "sequential_motion"
  | "movement_acquisition"
  | "lexicalized_motion"
  | "volitional_showing"
  | "progressive"
  | "resultative_state"
  | "drop_aux"
  | "contracted_past"
  | "negative_completion"
  | "negative_inability"
  | "negative_long_negation"
  | "passive_completion"
  | "prepared_state";
export const ASPECT_SEMANTIC_READING_VALUES = [
  "generic",
  "sequential_motion",
  "movement_acquisition",
  "lexicalized_motion",
  "volitional_showing",
  "progressive",
  "resultative_state",
  "drop_aux",
  "contracted_past",
  "negative_completion",
  "negative_inability",
  "negative_long_negation",
  "passive_completion",
  "prepared_state"
] as const satisfies readonly AspectSemanticReading[];

export type AspectRenderStrategy =
  | "resultative_state"
  | "negative_resultative_state"
  | "drop_aux"
  | "contract_to_past"
  | "negative_completion"
  | "negative_inability"
  | "negative_long_negation"
  | "passive_completion"
  | "attributive_drop_aux"
  | "prepared_te_oku"
  | "sequential_motion"
  | "movement_reason"
  | "volitional_showing";
export const ASPECT_RENDER_STRATEGY_VALUES = [
  "resultative_state",
  "negative_resultative_state",
  "drop_aux",
  "contract_to_past",
  "negative_completion",
  "negative_inability",
  "negative_long_negation",
  "passive_completion",
  "attributive_drop_aux",
  "prepared_te_oku",
  "sequential_motion",
  "movement_reason",
  "volitional_showing"
] as const satisfies readonly AspectRenderStrategy[];

export type AspectProjectionPolicy =
  | "default"
  | "stative_perfect";
export const ASPECT_PROJECTION_POLICY_VALUES = [
  "default",
  "stative_perfect"
] as const satisfies readonly AspectProjectionPolicy[];

export type SimpleAspectCollapsed = "honorific";
export type SimpleAspectFollowingRareruReading = "honorific";
export type BenefactiveRequestEvidence = "terminal_question";
export const SIMPLE_ASPECT_COLLAPSED_VALUES = [
  "honorific"
] as const satisfies readonly SimpleAspectCollapsed[];
export const SIMPLE_ASPECT_FOLLOWING_RARERU_READING_VALUES = [
  "honorific"
] as const satisfies readonly SimpleAspectFollowingRareruReading[];
export const BENEFACTIVE_REQUEST_EVIDENCE_VALUES = [
  "terminal_question"
] as const satisfies readonly BenefactiveRequestEvidence[];

export interface AspectSemanticPayload {
  readonly reading: AspectSemanticReading;
  readonly candidates?: readonly AspectSemanticReading[];
  readonly particle?: AspectSemanticParticle | null;
  readonly role?: string | null;
  readonly renderStrategy?: AspectRenderStrategy | null;
  readonly projection?: AspectProjectionPolicy;
}

export interface SimpleAspectOp extends AspectOpBase {
  readonly aspect:
  | "te_iru"
  | "te_aru"
  | "te_iku"
  | "te_kuru"
  | "te_oku"
  | "te_shimau"
  | "te_miru"
  | "te_mawaru"
  | "tsutsu_aru";
  readonly semantic?: AspectSemanticPayload;
  readonly collapsed?: SimpleAspectCollapsed;
  readonly followingRareruReading?: SimpleAspectFollowingRareruReading;
  readonly auxiliaryHonorific?: "respect";
}

export type BenefactiveAspectKind =
  | "te_ageru"
  | "te_kureru"
  | "te_kudasaru"
  | "te_morau"
  | "te_itadaku"
  | "te_moraeru"
  | "te_itadakeru";

export const BENEFACTIVE_ASPECT_VALUES = [
  "te_ageru",
  "te_kureru",
  "te_kudasaru",
  "te_morau",
  "te_itadaku",
  "te_moraeru",
  "te_itadakeru"
] as const satisfies readonly BenefactiveAspectKind[];

export interface BenefactiveAspectOp extends AspectOpBase {
  readonly aspect: BenefactiveAspectKind;
  readonly benefactive: BenefactivePayload;
  readonly requestEvidence?: BenefactiveRequestEvidence;
}

export interface RequestAspectOp extends AspectOpBase {
  readonly aspect: "te_kudasai" | "te_kure_tanomu";
  readonly request: RequestPayload;
}

export const REQUEST_ASPECT_VALUES = [
  "te_kudasai",
  "te_kure_tanomu"
] as const satisfies readonly RequestAspectOp["aspect"][];

export interface DesiderativeAspectOp extends AspectOpBase {
  readonly aspect: "te_hoshii";
  readonly desiderative: DesiderativePayload;
}

export interface ProhibitionAspectOp extends AspectOpBase {
  readonly aspect: "naide_kudasai";
  readonly prohibition: ProhibitionPayload;
}

export interface MiseruAspectOp extends AspectOpBase {
  readonly aspect: "te_miseru";
  readonly semantic?: AspectSemanticPayload;
}

export type AspectOp =
  | SimpleAspectOp
  | BenefactiveAspectOp
  | RequestAspectOp
  | DesiderativeAspectOp
  | ProhibitionAspectOp
  | MiseruAspectOp;

export type AspectKind = AspectOp["aspect"];


export type PostverbAuxiliaryKind =
  | "completion"
  | "completion_potential"
  | "continuation"
  | "inchoative"
  | "accustomed"
  | "forget"
  | "failure_miss"
  | "near_miss"
  | "incomplete_attempt"
  | "difficulty"
  | "risk_potential"
  | "redo"
  | "prolonged"
  | "perseverance"
  | "exhaustive"
  | "potential"
  | "adverbial_potential"
  | "intensive"
  | "reciprocal"
  | "excessive"
  | "accomplishment"
  | "determined_completion"
  | "state_change"
  | "state_change_potential"
  | "make_state_change"
  | "make_state_change_causative"
  | "adverbial_change"
  | "adverbial_change_potential"
  | "adverbial_control"
  | "appearance_control"
  | "appearance_state_change"
  | "appearance_state_change_potential"
  | "appearance_behavior"
  | "scope_control"
  | "manner_action_control"
  | "manner_simile_become"
  | "manner_simile_become_potential"
  | "appearance_perception"
  | "epistemic_hedge"
  | "focus_support"
  | "contempt";

export type PostverbSourceTokenClass = "auxiliary_verb";
export const POSTVERB_SOURCE_TOKEN_CLASS_VALUES = [
  "auxiliary_verb"
] as const satisfies readonly PostverbSourceTokenClass[];

export type CompletionTeIruNegativeStrategy =
  | "negative_completion"
  | "preserve_aspect";
export const COMPLETION_TE_IRU_NEGATIVE_STRATEGY_VALUES = [
  "negative_completion",
  "preserve_aspect"
] as const satisfies readonly CompletionTeIruNegativeStrategy[];

export type CompletionFollowingPassiveStrategy =
  | "completion_causative";
export const COMPLETION_FOLLOWING_PASSIVE_STRATEGY_VALUES = [
  "completion_causative"
] as const satisfies readonly CompletionFollowingPassiveStrategy[];

export type PostverbHostAttachForm =
  | "verb_renyou"
  | "te_form"
  | "adjectival_renyou"
  | "negative_renyou"
  | "copula_ni"
  | "adjective_stem"
  | "na_stem"
  | "sahen_stem";

export type CompoundDispatchHint =
  | "renyou_aux"
  | "owaru_completive"
  | "oeru_completive"
  | "dasu_inchoative"
  | "kiru_completion"
  | "kireru_completion"
  | "tail_only_productive"
  | "potential_tail"
  | "colloquial_intensive"
  | "reciprocal_tail"
  | "sahen_productive"
  | "sahen_oeru";

export interface PostverbCompoundDispatch {
  readonly stream?: CompoundDispatchHint;
  readonly sahen?: CompoundDispatchHint;
}
export type PostverbHeadProjection = "formal_state_result";
export type PostverbSahenHostProjection = "object_adverb" | "object_action_lemma";
export type PostverbFollowingRareruDefault = Extract<VoiceReadingCandidate, "potential">;
export type PostverbPerception = "visual" | "inferential" | "inferential_passive" | "felt";
export type PostverbPerceptionProjection = "attributive_like" | "sou_appearance";
export type PostverbHedgePrefixKind = "proposition" | "feeling" | "mood";
export type PostverbHedgeProjection =
  | "attributive_like"
  | "sou_appearance"
  | "quotative_attributive";
export type PostverbHedgeFocus = "topic" | "additive";
export type PotentialComposition = "reinforce_existing";

export const POSTVERB_HOST_ATTACH_FORM_VALUES = [
  "verb_renyou",
  "te_form",
  "adjectival_renyou",
  "negative_renyou",
  "copula_ni",
  "adjective_stem",
  "na_stem",
  "sahen_stem"
] as const satisfies readonly PostverbHostAttachForm[];
export const COMPOUND_DISPATCH_HINT_VALUES = [
  "renyou_aux",
  "owaru_completive",
  "oeru_completive",
  "dasu_inchoative",
  "kiru_completion",
  "kireru_completion",
  "tail_only_productive",
  "potential_tail",
  "colloquial_intensive",
  "reciprocal_tail",
  "sahen_productive",
  "sahen_oeru"
] as const satisfies readonly CompoundDispatchHint[];
export const POSTVERB_HEAD_PROJECTION_VALUES = [
  "formal_state_result"
] as const satisfies readonly PostverbHeadProjection[];
export const POSTVERB_SAHEN_HOST_PROJECTION_VALUES = [
  "object_adverb",
  "object_action_lemma"
] as const satisfies readonly PostverbSahenHostProjection[];
export const POSTVERB_FOLLOWING_RARERU_DEFAULT_VALUES = [
  "potential"
] as const satisfies readonly PostverbFollowingRareruDefault[];
export const POSTVERB_PERCEPTION_VALUES = [
  "visual",
  "inferential",
  "inferential_passive",
  "felt"
] as const satisfies readonly PostverbPerception[];
export const POSTVERB_PERCEPTION_PROJECTION_VALUES = [
  "attributive_like",
  "sou_appearance"
] as const satisfies readonly PostverbPerceptionProjection[];
export const POSTVERB_HEDGE_PREFIX_KIND_VALUES = [
  "proposition",
  "feeling",
  "mood"
] as const satisfies readonly PostverbHedgePrefixKind[];
export const POSTVERB_HEDGE_PROJECTION_VALUES = [
  "attributive_like",
  "sou_appearance",
  "quotative_attributive"
] as const satisfies readonly PostverbHedgeProjection[];
export const POSTVERB_HEDGE_FOCUS_VALUES = [
  "topic",
  "additive"
] as const satisfies readonly PostverbHedgeFocus[];
export const POTENTIAL_COMPOSITION_VALUES = [
  "reinforce_existing"
] as const satisfies readonly PotentialComposition[];

export interface PostverbAuxiliaryPayload {
  readonly kind: PostverbAuxiliaryKind;
  readonly opChainHost?: NonNullable<HeadCommitPolicy["opChainHost"]> | "unrestricted";
  readonly polite?: boolean;
  readonly followingAuxiliaryKind?: PostverbAuxiliaryKind;
  readonly requiredPrefixForms?: readonly string[];
  readonly requiredHostForms?: readonly PostverbHostAttachForm[];
  readonly compoundDispatch?: PostverbCompoundDispatch;
  readonly admitsPrecedingNegation?: boolean;
  readonly sourceTokenClass?: PostverbSourceTokenClass;
  readonly admitsImperativeTerminal?: boolean;
  readonly headProjection?: PostverbHeadProjection;
  readonly completionTeIruNegativeStrategy?: CompletionTeIruNegativeStrategy;
  readonly completionFollowingPassiveStrategy?: CompletionFollowingPassiveStrategy;
  readonly completionAdverb?: string;
  readonly hostAdverb?: string;
  readonly hostLookup?: string;
  readonly sahenHostProjection?: PostverbSahenHostProjection;
  readonly koreanActionLemma?: string;
  readonly koreanActionIrregular?: IrregularType | null;
  readonly followingRareruDefault?: PostverbFollowingRareruDefault;
  readonly perception?: PostverbPerception;
  readonly perceptionProjection?: PostverbPerceptionProjection;
  readonly hedgePrefixKind?: PostverbHedgePrefixKind;
  readonly hedgeProjection?: PostverbHedgeProjection;
  readonly hedgeFocus?: PostverbHedgeFocus;
  readonly hedgePotential?: boolean;
  readonly hedgeTailLemma?: string;
  readonly hedgeTailKoreanPos?: typeof 동사 | typeof 형용사;
  readonly hedgeTailIrregular?: IrregularType | null;
  readonly supportFocus?: AffirmativeSupportFocus;
}

export type PostverbHostAttach = "copula_support";
export const POSTVERB_HOST_ATTACH_VALUES = [
  "copula_support"
] as const satisfies readonly PostverbHostAttach[];

export interface PostverbAuxiliaryOp {
  readonly kind: "postverbAuxiliary";
  readonly auxiliary: PostverbAuxiliaryPayload;
  readonly hostAttach?: PostverbHostAttach | undefined;
  readonly potentialComposition?: PotentialComposition | undefined;
  readonly source: OpSource;
}

export type PredicateProjectionCarrierKind =
  | "degree_extent"
  | "degree_extent_amount"
  | "until_extent"
  | "limit_dake"
  | "limit_dake_negative"
  | "limit_dokoro_negative"
  | "recent_past_bakari"
  | "certainty_ni_chigai_nai"
  | "certainty_ni_kimatte_iru"
  | "equivalence_douzen"
  | "imminent_nbakari";
export const PREDICATE_PROJECTION_CARRIER_VALUES = [
  "degree_extent",
  "degree_extent_amount",
  "until_extent",
  "limit_dake",
  "limit_dake_negative",
  "limit_dokoro_negative",
  "recent_past_bakari",
  "certainty_ni_chigai_nai",
  "certainty_ni_kimatte_iru",
  "equivalence_douzen",
  "imminent_nbakari"
] as const satisfies readonly PredicateProjectionCarrierKind[];

export type PredicateProjectionCarrierSourceAllomorph =
  | "limit_bare"
  | "limit_copular"
  | "limit_verb_support"
  | "recent_past_adnominal"
  | "recent_past_copular"
  | "recent_past_verb_support"
  | "certainty_adjectival"
  | "certainty_verb_support"
  | "equivalence_bare"
  | "equivalence_copular"
  | "equivalence_adnominal"
  | "dokoro_situation_deictic"
  | "dokoro_situation_sahen"
  | "dokoro_situation_verb"
  | "dokoro_scalar"
  | "imminent_adnominal"
  | "imminent_adverbial"
  | "imminent_copular";
export const PREDICATE_PROJECTION_CARRIER_SOURCE_ALLOMORPH_VALUES = [
  "limit_bare",
  "limit_copular",
  "limit_verb_support",
  "recent_past_adnominal",
  "recent_past_copular",
  "recent_past_verb_support",
  "certainty_adjectival",
  "certainty_verb_support",
  "equivalence_bare",
  "equivalence_copular",
  "equivalence_adnominal",
  "dokoro_situation_deictic",
  "dokoro_situation_sahen",
  "dokoro_situation_verb",
  "dokoro_scalar",
  "imminent_adnominal",
  "imminent_adverbial",
  "imminent_copular"
] as const satisfies readonly PredicateProjectionCarrierSourceAllomorph[];

export interface PredicateProjectionCarrierOp {
  readonly kind: "predicateProjectionCarrier";
  readonly carrier: PredicateProjectionCarrierKind;
  readonly sourceAllomorph: PredicateProjectionCarrierSourceAllomorph | null;
  readonly surface: string;
  readonly source: OpSource;
  readonly polite?: boolean;
  readonly past?: boolean;
  readonly hostSituationBase?: string;
}

export type PredicateQuoteCarrierStyle =
  | "compact_toiu"
  | "question_toiu"
  | "suru_attributive"
  | "naru_result";
export const PREDICATE_QUOTE_CARRIER_STYLE_VALUES = [
  "compact_toiu",
  "question_toiu",
  "suru_attributive",
  "naru_result"
] as const satisfies readonly PredicateQuoteCarrierStyle[];

export type PredicateQuoteCarrierAllomorph = "toiu" | "tteiu" | "other";
export const PREDICATE_QUOTE_CARRIER_ALLOMORPH_VALUES = [
  "toiu",
  "tteiu",
  "other"
] as const satisfies readonly PredicateQuoteCarrierAllomorph[];

export type TosuruConstructionMode = "resultative_make" | "treat_as" | "quote";
export const TOSURU_CONSTRUCTION_MODE_VALUES = [
  "resultative_make",
  "treat_as",
  "quote"
] as const satisfies readonly TosuruConstructionMode[];

export type QuotedPropositionMood = "declarative" | "interrogative" | "volitional" | "imperative";

export interface PredicateQuoteCarrierOp {
  readonly kind: "predicateQuoteCarrier";
  readonly style: PredicateQuoteCarrierStyle;
  readonly allomorph: PredicateQuoteCarrierAllomorph;
  readonly surface: string;
  readonly source: OpSource;
  readonly quotedMood?: QuotedPropositionMood;
  readonly tosuruMode?: TosuruConstructionMode;
  readonly sourceTerminal?: true;
  readonly volitionalContentAttributive?: QuoteAttributiveFlavor;
  readonly quotedSfp?: SfpNode;
  readonly quotedChainMood?: QuotedPropositionMood;
}


export type PredicateSuffixKind = "ease" | "difficulty";
export const PREDICATE_SUFFIX_VALUES = [
  "ease",
  "difficulty"
] as const satisfies readonly PredicateSuffixKind[];

export interface PredicateSuffixOp {
  readonly kind: "predicateSuffix";
  readonly suffix: PredicateSuffixKind | null;
  readonly profileId: string;
  readonly surface: string;
  readonly source: OpSource;
}


interface IdiomOpBase {
  readonly kind: "idiom";
  readonly source: OpSource;
  readonly polarity: Polarity;
  readonly polite: boolean;
  readonly past: boolean;
}

export type ObligationVariant =
  | "standard_nakute_wa"
  | "standard_nakereba"
  | "colloquial_nakya"
  | "colloquial_nakucha"
  | "colloquial_naito"
  | "colloquial_naito_elided"
  | "beki";
export const OBLIGATION_VARIANT_VALUES = [
  "standard_nakute_wa",
  "standard_nakereba",
  "colloquial_nakya",
  "colloquial_nakucha",
  "colloquial_naito",
  "colloquial_naito_elided",
  "beki"
] as const satisfies readonly ObligationVariant[];

export interface ObligationIdiomOp extends IdiomOpBase {
  readonly idiom: "obligation";
  readonly variant: ObligationVariant;
  readonly inner?: TailNode;
}

export type PermissionVariant = "ii" | "kamawanai";
export type PermissionConnectiveSurface = "ても" | "でも";
export const PERMISSION_VARIANT_VALUES = [
  "ii",
  "kamawanai"
] as const satisfies readonly PermissionVariant[];
export const PERMISSION_CONNECTIVE_SURFACE_VALUES = [
  "ても",
  "でも"
] as const satisfies readonly PermissionConnectiveSurface[];

export interface PermissionIdiomOp extends IdiomOpBase {
  readonly idiom: "permission";
  readonly variant: PermissionVariant;
  readonly connectiveSurface: PermissionConnectiveSurface;
  readonly inner?: TailNode;
}

export interface ForbiddenIdiomOp extends IdiomOpBase {
  readonly idiom: "forbidden";
  readonly sourceAllomorph: ForbiddenSourceAllomorph;
  readonly inner?: TailNode;
}

export type ForbiddenSourceAllomorph =
  | "copular_dame"
  | "verb_ikeru"
  | "verb_naru"
  | "verb_iku"
  | "verb_dialect_aku";
export const FORBIDDEN_SOURCE_ALLOMORPH_VALUES = [
  "copular_dame",
  "verb_ikeru",
  "verb_naru",
  "verb_iku",
  "verb_dialect_aku"
] as const satisfies readonly ForbiddenSourceAllomorph[];

export interface SufficiencyConditionalIdiomOp extends IdiomOpBase {
  readonly idiom: "sufficiency_conditional";
}

export interface TeEvaluationIdiomOp extends IdiomOpBase {
  readonly idiom: "te_evaluation";
  readonly evaluation: TeEvaluationKind;
  readonly connectiveSurface: TeEvaluationConnectiveSurface;
}

export type TeEvaluationKind = "good";
export type TeEvaluationConnectiveSurface = "て" | "で";
export const TE_EVALUATION_KIND_VALUES = [
  "good"
] as const satisfies readonly TeEvaluationKind[];

export type PotentialKotoDekiruParticleKind = "ga" | "mo" | "wa" | "focus";
export type PotentialKotoDekiruFocusParticle = "だけ" | "しか" | "さえ" | "すら" | "のみ" | "ばかり";
export const POTENTIAL_KOTO_DEKIRU_PARTICLE_VALUES = [
  "ga",
  "mo",
  "wa",
  "focus"
] as const satisfies readonly PotentialKotoDekiruParticleKind[];

export interface PotentialKotoGaDekiruIdiomOp extends IdiomOpBase {
  readonly idiom: "potential_koto_ga_dekiru";
  readonly particleKind: PotentialKotoDekiruParticleKind;
  readonly focusParticle: PotentialKotoDekiruFocusParticle | null;
}

export type NegativeNecessitySumuVariant =
  | "nakute_sumu"
  | "nakutemo_sumu"
  | "naide_sumu"
  | "naidemo_sumu"
  | "zuni_sumu";
export const NEGATIVE_NECESSITY_SUMU_VARIANT_VALUES = [
  "nakute_sumu",
  "nakutemo_sumu",
  "naide_sumu",
  "naidemo_sumu",
  "zuni_sumu"
] as const satisfies readonly NegativeNecessitySumuVariant[];

export interface NegativeNecessitySumuIdiomOp extends IdiomOpBase {
  readonly idiom: "negative_necessity_sumu";
  readonly variant: NegativeNecessitySumuVariant;
}

export interface NegativeNecessityKotoWaIdiomOp extends IdiomOpBase {
  readonly idiom: "negative_necessity_koto_wa";
}

export interface InevitableIdiomOp extends IdiomOpBase {
  readonly idiom: "inevitable_zaru_o_enai";
}

export interface CannotRefrainIdiomOp extends IdiomOpBase {
  readonly idiom: "cannot_refrain_negative_dewa_irarenai";
}

export interface MethodYouGaNaiIdiomOp extends IdiomOpBase {
  readonly idiom: "method_you_ga_nai";
  readonly surface: MethodYouGaNaiSurface;
  readonly particleKind: MethodYouGaNaiParticleKind;
}

export type MethodYouGaNaiSurface = "you" | "sama";
export const METHOD_YOU_GA_NAI_SURFACE_VALUES = [
  "you",
  "sama"
] as const satisfies readonly MethodYouGaNaiSurface[];

export type MethodYouGaNaiParticleKind = "ga" | "mo";
export const METHOD_YOU_GA_NAI_PARTICLE_VALUES = [
  "ga",
  "mo"
] as const satisfies readonly MethodYouGaNaiParticleKind[];

export interface WakeImpossibleIdiomOp extends IdiomOpBase {
  readonly idiom: "wake_impossible";
  readonly focus: WakeImpossibleFocus;
}

export type WakeImpossibleFocus = "wa" | "mo";
export const WAKE_IMPOSSIBLE_FOCUS_VALUES = [
  "wa",
  "mo"
] as const satisfies readonly WakeImpossibleFocus[];

export interface NegativeNecessityMadeMoIdiomOp extends IdiomOpBase {
  readonly idiom: "negative_necessity_made_mo";
}

export type OnlyOptionMarker = "shika" | "hoka";
export const ONLY_OPTION_MARKER_VALUES = [
  "shika",
  "hoka"
] as const satisfies readonly OnlyOptionMarker[];

export interface OnlyOptionIdiomOp extends IdiomOpBase {
  readonly idiom: "only_option_shika_nai";
  readonly marker: OnlyOptionMarker;
}

export interface ExperienceIdiomOp extends IdiomOpBase {
  readonly idiom: "experience_koto_ga_aru";
  readonly particleKind: ExperienceParticleKind;
}

export type ExperienceParticleKind = "ga" | "mo";
export const EXPERIENCE_PARTICLE_VALUES = [
  "ga",
  "mo"
] as const satisfies readonly ExperienceParticleKind[];

export interface DecisionKotoNiSuruIdiomOp extends IdiomOpBase {
  readonly idiom: "decision_koto_ni_suru";
  readonly volitionalClose?: boolean;
}

export interface OutcomeKotoNiNaruIdiomOp extends IdiomOpBase {
  readonly idiom: "outcome_koto_ni_naru";
  readonly stative?: boolean;
}

export type DegreeIntensifierMode = "terminal" | "become";
export type DegreeIntensifierVariant = "bear" | "helpless";
export const DEGREE_INTENSIFIER_MODE_VALUES = [
  "terminal",
  "become"
] as const satisfies readonly DegreeIntensifierMode[];
export const DEGREE_INTENSIFIER_VARIANT_VALUES = [
  "bear",
  "helpless"
] as const satisfies readonly DegreeIntensifierVariant[];

export interface DegreeIntensifierIdiomOp extends IdiomOpBase {
  readonly idiom: "degree_intensifier";
  readonly mode: DegreeIntensifierMode;
  readonly variant: DegreeIntensifierVariant;
}

export type IdiomOp =
  | ObligationIdiomOp
  | PermissionIdiomOp
  | ForbiddenIdiomOp
  | SufficiencyConditionalIdiomOp
  | TeEvaluationIdiomOp
  | PotentialKotoGaDekiruIdiomOp
  | NegativeNecessitySumuIdiomOp
  | NegativeNecessityKotoWaIdiomOp
  | InevitableIdiomOp
  | CannotRefrainIdiomOp
  | MethodYouGaNaiIdiomOp
  | WakeImpossibleIdiomOp
  | NegativeNecessityMadeMoIdiomOp
  | OnlyOptionIdiomOp
  | ExperienceIdiomOp
  | DecisionKotoNiSuruIdiomOp
  | OutcomeKotoNiNaruIdiomOp
  | DegreeIntensifierIdiomOp;

export type IdiomKind = IdiomOp["idiom"];


export type QuotativeMood = "declarative" | "imperative" | "interrogative";
export const QUOTATIVE_MOOD_VALUES = [
  "declarative",
  "imperative",
  "interrogative"
] as const satisfies readonly QuotativeMood[];

export type BoundNominalReasonClosure = "conditional";
export type StructuralContinuation = "quote_marker";
export type ConditionalQuoteEllipsis = "prohibitive_concern";
export type QuotativeClosure = "hostless_source_terminal" | "reported_request";

export const BOUND_NOMINAL_REASON_CLOSURE_VALUES = [
  "conditional"
] as const satisfies readonly BoundNominalReasonClosure[];
export const STRUCTURAL_CONTINUATION_VALUES = [
  "quote_marker"
] as const satisfies readonly StructuralContinuation[];
export const CONDITIONAL_QUOTE_ELLIPSIS_VALUES = [
  "prohibitive_concern"
] as const satisfies readonly ConditionalQuoteEllipsis[];
export const QUOTATIVE_CLOSURE_VALUES = [
  "hostless_source_terminal",
  "reported_request"
] as const satisfies readonly QuotativeClosure[];

export type ConnectiveSurfaceAllomorph =
  | "to"
  | "tte"
  | "kara"
  | "ba"
  | "tara"
  | "te_demo"
  | "reformulation_ka"
  | "other";
export const CONNECTIVE_SURFACE_ALLOMORPH_VALUES = [
  "to",
  "tte",
  "kara",
  "ba",
  "tara",
  "te_demo",
  "reformulation_ka",
  "other"
] as const satisfies readonly ConnectiveSurfaceAllomorph[];

export interface ConnectiveOp {
  readonly kind: "connective";
  readonly connective: ConnectiveKind;
  readonly allomorph: ConnectiveSurfaceAllomorph;
  readonly surface: string;
  readonly recovery?: ConnectiveRecovery;
  readonly teFormRole?: TeFormConnectiveRole;
  readonly conditionalFlavor?: ConditionalFlavor;
  readonly retrospectiveQuotativeFlavor?: RetrospectiveQuotativeFlavor;
  readonly quoteAttributiveFlavor?: QuoteAttributiveFlavor;
  readonly boundNominalReasonClosure?: BoundNominalReasonClosure;
  readonly boundNominalReasonQuoteCarrierHost?: true;
  readonly boundNominalReasonMonoNoun?: true;
  readonly structuralContinuation?: StructuralContinuation;
  readonly conditionalQuoteEllipsis?: ConditionalQuoteEllipsis;
  readonly quotativeClosure?: QuotativeClosure;
  readonly quotativeMood?: QuotativeMood;
  readonly cognitiveComplementParticle?: CognitiveComplementParticle;
  readonly quotedQuestionContext?: true;
  readonly questionContentRole?: QuestionContentRole;
  readonly ownedByStructuralKaParallel?: true;
  readonly terminalDiscourseHost?: true;
  readonly retrospectiveTara?: boolean;
  readonly retrospectiveDiscoveryStyle?: RetrospectiveDiscoveryStyle;
  readonly quoteBoundary?: QuoteBoundaryPayload;
  readonly attemptFocusParticle?: VolitionalAttemptFocusParticle;
  readonly closedSfp?: SfpNode;
  readonly closedChainMood?: QuotedPropositionMood;
  readonly source: OpSource;
}

export type VolitionalAttemptFocusParticle = "は" | "も" | "さえ";

export type ConnectiveRecovery = "missing_conditional_marker";
export type CognitiveComplementParticle = "topic";
export type QuestionContentRole = "embedded" | "terminal";
export type RetrospectiveDiscoveryStyle = "ja" | "deoni";
export const CONNECTIVE_RECOVERY_VALUES = [
  "missing_conditional_marker"
] as const satisfies readonly ConnectiveRecovery[];
export const COGNITIVE_COMPLEMENT_PARTICLE_VALUES = [
  "topic"
] as const satisfies readonly CognitiveComplementParticle[];
export const QUESTION_CONTENT_ROLE_VALUES = [
  "embedded",
  "terminal"
] as const satisfies readonly QuestionContentRole[];
export const RETROSPECTIVE_DISCOVERY_STYLE_VALUES = [
  "ja",
  "deoni"
] as const satisfies readonly RetrospectiveDiscoveryStyle[];

export type AuxOpNode =
  | NegationOp
  | TenseOp
  | PoliteOp
  | ClassicalAuxResidueOp
  | DesireOp
  | VoiceOp
  | ConjectureOp
  | CopulaOp
  | ModalOp
  | ScopeBridgeOp
  | AdjCopulaBridgeOp
  | AspectOp
  | PostverbAuxiliaryOp
  | PredicateProjectionCarrierOp
  | PredicateQuoteCarrierOp
  | PredicateSuffixOp
  | IdiomOp
  | ConnectiveOp;

export type AuxOpKind = AuxOpNode["kind"];

export function hasFollowingNegationAfter(ops: readonly AuxOpNode[], index: number): boolean {
  return ops.slice(index + 1).some((op) => op.kind === "negation");
}


export type TerminalKind =
  | "predicative"
  | "attributive"
  | "nominalized"
  | "volitional"
  | "imperative"
  | "renyou_chuushi"
  | "adverbial_modifier"
  | "ka_question";

export const TERMINAL_KIND_VALUES = [
  "predicative",
  "attributive",
  "nominalized",
  "volitional",
  "imperative",
  "renyou_chuushi",
  "adverbial_modifier",
  "ka_question"
] as const satisfies readonly TerminalKind[];

export type AdnominalEnding = "ㄴ/는" | "ㄴ/은" | "ㄹ/을";

export type HeadRequiredComplement =
  | { readonly kind: "adnominal"; readonly ending: AdnominalEnding }
  | { readonly kind: "nominal_ki" };

export type AttributiveBoundaryHeadKind =
  | "ordinary_nominal"
  | "future_commitment"
  | "scope_or_bound"
  | "reason_or_purpose"
  | "likeness"
  | "stative_point"
  | "external_relation";

export interface AttributiveBoundaryPayload {
  readonly kind: "attributiveBoundary";
  readonly source: OpSource;
  readonly head: {
    readonly surface: string;
    readonly dictionaryForm: string;
    readonly pos: number;
    readonly tokenIdx: number;
  };
  readonly headKind: AttributiveBoundaryHeadKind;
  readonly projectionContext: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentIdx: number;
  };
  readonly projection: "lexical_past" | "ordinary_nominal" | "resultative_state";
  readonly bareKeijoujiDirectAttributive?: true;
  readonly bareKeijoujiKatakanaRun?: true;
  readonly explicitAdnominalMarker?: OpSource;
  readonly bareQuoteVolitionalContentFlavor?: QuoteAttributiveFlavor;
  readonly quotedContentHeadBinding?: true;
  readonly conditionalWishMannerHostKind?: "thought" | "wish";
  readonly headRequiredComplement?: HeadRequiredComplement;
  readonly headRequestsFutureProjection?: true;
  readonly temporalIntervalVariant?: TemporalIntervalHeadVariant;
}

export type TemporalIntervalHeadVariant =
  | "before"
  | "unaware_interval"
  | "interval"
  | "duration"
  | "adjectival_time";

export interface RenyouChuushiPayload {
  readonly kind: "renyouChuushi";
  readonly teFormRole?: TeFormConnectiveRole;
  readonly source: OpSource;
}

export interface NominalizedTerminalPayload {
  readonly kind: "nominalized";
  readonly nominalizerSource?: "overt_no" | "elided";
  readonly source: OpSource;
}

export interface ImperativeTerminalPayload {
  readonly kind: "imperative";
  readonly source: OpSource;
  readonly sourceForm: "nasai";
  readonly sourceNuance: "directive_polite";
}

export type TerminalPayload =
  | AttributiveBoundaryPayload
  | ImperativeTerminalPayload
  | RenyouChuushiPayload
  | NominalizedTerminalPayload;

export interface AuxLayerNode {
  readonly kind: "auxLayer";
  readonly stem: StemNode;
  readonly ops: readonly AuxOpNode[];
  readonly terminal: TerminalKind | null;
  readonly terminalPayload?: TerminalPayload;
  readonly consumedSource?: OpSource;
  readonly attributiveMood?: {
    readonly kind: "conjecture";
    readonly source: OpSource;
  };
}

export type ConnectiveKind =
  | "te_form"
  | "adversative"
  | "reason"
  | "reason_quoted_judgment_passive"
  | "inevitable_reason"
  | "conditional"
  | "listing"
  | "simultaneous"
  | "sequence_after"
  | "sequence_immediate"
  | "stative_hold"
  | "temporal_since"
  | "concession"
  | "origin"
  | "quotative"
  | "alternative"
  | "additive_besides"
  | "question_content"
  | "question_content_alternative"
  | "question_quotative"
  | "cognitive_complement"
  | "wish_complement"
  | "request_complement"
  | "purpose_evaluation_nominalizer"
  | "external_nominalizer_comparison"
  | "external_nominalizer_concessive"
  | "external_nominalizer_additive"
  | "external_nominalizer_conformity"
  | "bound_nominal_reason"
  | "bound_nominal_listing"
  | "tame_reason"
  | "tame_purpose"
  | "predicate_projection_tame_gerund"
  | "predicate_projection_derivational_nominal_m"
  | "predicate_projection_purpose"
  | "predicate_projection_wish_terminal"
  | "predicate_projection_manner_simile"
  | "predicate_projection_manner_volitional"
  | "predicate_projection_manner_simile_action"
  | "predicate_projection_quotative_manner_simile"
  | "predicate_projection_quotative_manner_simile_attributive"
  | "reformulation"
  | "quoted_concessive"
  | "retrospective_quotative"
  | "question_reformulation"
  | "even_if"
  | "predicate_projection_degree_extent"
  | "predicate_projection_quantity_extent"
  | "predicate_projection_proportional_reason"
  | "predicate_projection_correlative_degree"
  | "predicate_projection_comparison"
  | "predicate_projection_parallel_change"
  | "predicate_projection_repeated_occasion"
  | "predicate_projection_occasion"
  | "predicate_projection_intentional_purpose"
  | "predicate_projection_evaluation_extent"
  | "predicate_projection_concession_echo"
  | "predicate_projection_until"
  | "predicate_projection_until_attributive"
  | "predicate_projection_as_far_as"
  | "established_premise"
  | "predicate_projection_ni_complement"
  | "predicate_projection_ni_complement_m"
  | "predicate_projection_ni_complement_outcome"
  | "predicate_projection_ni_complement_worth"
  | "predicate_projection_ni_complement_cannot_bear"
  | "predicate_projection_no_quote_reporting"
  | "predicate_projection_additive_ue_ni"
  | "predicate_projection_ue_de"
  | "predicate_projection_ue_de_attributive"
  | "predicate_projection_gatera"
  | "purpose_motion"
  | "volitional_purpose"
  | "predicate_projection_purpose_beku"
  | "predicate_projection_quote_attributive"
  | "predicate_projection_simultaneous_time"
  | "focus_additive_denaku"
  | "focus_additive_negative"
  | "focus_limit_de"
  | "focus_limit_nara"
  | "recent_past_bakari_ni_reason"
  | "focus_reversal_dokoro_ka"
  | "exemplification";

export type TeFormConnectiveRole = "linkage" | "listing" | "reason" | "adverbial" | "manner" | "result_chain" | "compound_serial";

export const TE_FORM_CONNECTIVE_ROLE_VALUES = [
  "linkage",
  "listing",
  "reason",
  "adverbial",
  "manner",
  "result_chain",
  "compound_serial"
] as const satisfies readonly TeFormConnectiveRole[];

export const DEFAULT_TE_FORM_ROLE: TeFormConnectiveRole = "linkage";

export function auxOpClosesNegativeCopulaBridge(op: AuxOpNode | undefined): boolean {
  if (op === undefined) {
    return false;
  }
  if (op.kind === "copula" || op.kind === "scopeBridge") {
    return op.polarity === "negative";
  }
  return op.kind === "negation" && op.sourceSplit?.kind === "predicate_copula_negative";
}

export const DEFAULT_RENYOU_CHUUSHI_ROLE: TeFormConnectiveRole = "listing";

export const RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE = "し";

export type ConditionalFlavor = "plain" | "counterfactual";
export const CONDITIONAL_FLAVOR_VALUES = [
  "plain",
  "counterfactual"
] as const satisfies readonly ConditionalFlavor[];

export type RetrospectiveQuotativeFlavor =
  | ConnectiveRetrospectiveQuotativeFlavor
  | "volitional_deliberative";
export const RETROSPECTIVE_QUOTATIVE_FLAVOR_VALUES = [
  "direct_thought",
  "question_retrospective",
  "volitional_deliberative"
] as const satisfies readonly RetrospectiveQuotativeFlavor[];

export function stemInflectionCarriesVolitionalMood(stem: StemNode): boolean {
  if (stem.stemMood !== undefined) {
    return stem.stemMood === "volitional";
  }
  return ((stem.source.tokens[stem.conjugationAnchor]?.pos ?? 0) & POS5A) === 意志推量形_;
}

export function moodBearingOpBlocksVolitionalSpeechAct(op: AuxOpNode | undefined): boolean {
  if (op === undefined || op.kind !== "voice" || !voiceBlocksVolitionalSpeechAct(op.voice)) {
    return false;
  }
  const moodToken = op.source.tokens[op.source.tokens.length - 1];
  return ((moodToken?.pos ?? 0) & POS5A) === 意志推量形_;
}

export function opSourceIsVolitional(op: AuxOpNode): boolean {
  if (op.kind === "conjecture") {
    return false;
  }
  if (op.kind === "idiom" && op.idiom === "decision_koto_ni_suru" && op.volitionalClose === true) {
    return true;
  }
  const token = op.source.tokens[op.source.tokens.length - 1];
  if (((token?.pos ?? 0) & POS5A) === 意志推量形_) {
    return true;
  }
  if (op.kind === "aspect" && op.aspect === "te_iru") {
    const iru = op.source.tokens[op.source.tokens.length - 2];
    return token !== undefined && iru !== undefined &&
      (iru.pos & (POS01 | POS5A)) === (動詞_非自立可能 | 連用形_) &&
      (token.pos & POS01) === 形状詞_助動詞語幹 &&
      token.surface === "よう";
  }
  return false;
}

export function opSourceIsVolitionalInChain(op: AuxOpNode, ops: readonly AuxOpNode[]): boolean {
  return opSourceIsVolitional(op) && !opVolitionalMoodConsumedByCompanionConjecture(op, ops);
}

export function opVolitionalMoodConsumedByCompanionConjecture(
  op: AuxOpNode,
  ops: readonly AuxOpNode[]
): boolean {
  const indices = op.source.tokenIndices;
  const lastIndex = indices[indices.length - 1];
  if (lastIndex === undefined) {
    return false;
  }
  return ops.some((other) => {
    if (other === op || other.kind !== "conjecture") {
      return false;
    }
    const otherIndices = other.source.tokenIndices;
    return otherIndices[otherIndices.length - 1] === lastIndex;
  });
}

export function retrospectiveQuotativeFlavorForStemMood(
  flavor: RetrospectiveQuotativeFlavor,
  stemMood: StemMood | undefined
): RetrospectiveQuotativeFlavor {
  return flavor === "question_retrospective" && stemMood === "volitional"
    ? "volitional_deliberative"
    : flavor;
}

export type QuoteAttributiveFlavor = "intentional_modifier" | "cohortative_quote";
export const QUOTE_ATTRIBUTIVE_FLAVOR_VALUES = [
  "intentional_modifier",
  "cohortative_quote"
] as const satisfies readonly QuoteAttributiveFlavor[];

export type RequestQuoteTailKind =
  | "tanomu"
  | "iu"
  | "iu_passive"
  | "question"
  | "question_passive";

export type QuoteBoundaryKoreanClauseForm =
  | "다고"
  | "다는 것을"
  | "다는 말을"
  | "는지"
  | "기를"
  | "달라고"
  | "달라는 말을";

export const REQUEST_QUOTE_TAIL_KIND_VALUES = [
  "tanomu",
  "iu",
  "iu_passive",
  "question",
  "question_passive"
] as const satisfies readonly RequestQuoteTailKind[];
export const QUOTE_BOUNDARY_KOREAN_CLAUSE_FORM_VALUES = [
  "다고",
  "다는 것을",
  "다는 말을",
  "는지",
  "기를",
  "달라고",
  "달라는 말을"
] as const satisfies readonly QuoteBoundaryKoreanClauseForm[];

export interface QuoteBoundaryPayload {
  readonly koreanClauseForm: QuoteBoundaryKoreanClauseForm;
  readonly requestTailKind: RequestQuoteTailKind | null;
  readonly focusParticle?: QuoteBoundaryFocusParticle;
  readonly nominalRoleParticle?: ParticleKey;
  readonly reportingPassiveRoleLabel?: boolean;
  readonly adjectivalDistributionContent?: boolean;
}

export type QuoteBoundaryFocusParticle = "は" | "も" | "でも";

export interface ConnectiveNode {
  readonly kind: "connective";
  readonly inner: AuxLayerNode;
  readonly connective: ConnectiveKind;
  readonly surface: string;
  readonly quoteBoundary?: QuoteBoundaryPayload;
  readonly source: OpSource;
  readonly outer: TailNode;
}

export type TailNode = AuxLayerNode | ConnectiveNode;


export type SfpEffect =
  | "ne"
  | "na_excl"
  | "na_prohib"
  | "na_soft_imperative"
  | "kana"
  | "jan"
  | "yone_confirm"
  | "kke"
  | "explanatory"
  | "volitional_resolve"
  | "speaker_assertion"
  | "ka"
  | "ka_ne"
  | "kai"
  | "kayo"
  | "realization"
  | "plain_q"
  | "polite_q"
  | "neg_confirm_q"
  | "neg_invite_q"
  | "neg_plain_q"
  | "role_cat_nya"
  | "nante_excl"
  | "quotative_insistent"
  | "quotative_topic_excl"
  | "quotative_command";

export interface SfpNode {
  readonly effect: SfpEffect | null;
  readonly questionRealizationEffect?: SfpEffect;
  readonly speakerAcknowledgment?: true;
  readonly quoteProjection?: "terminal_mood" | "prohibitive" | "reported_request" | "attributive_request";
  readonly quoteFocusParticle?: QuoteBoundaryFocusParticle;
  readonly unambiguousProhibitive?: true;
  readonly polite?: boolean;
  readonly questionRole?: "request" | "permission";
  readonly conjectureQuestionRole?: "self_directed";
  readonly emphaticQuestion?: true;
  readonly realizationAxis?: "noda" | "deictic_acknowledgment";
  readonly surface: string;
  readonly consumed: number;
  readonly repeatCount: number;
  readonly source: OpSource;
}

export interface TailRootBase {
  readonly tail: TailNode;
  readonly sfp: SfpNode | null;
  readonly headHypothesis?: HeadHypothesisCarrier;
  readonly headEvidenceDecision?: HeadTailEvidenceDecision;
}

export interface ParsedTailRoot extends TailRootBase { }

export interface HydratedTailRoot extends TailRootBase {
  readonly quoteBinding: QuoteBinding;
  readonly terminalPunctuationRun?: ClauseTerminalPunctuationRunEvidence;
  readonly utteranceClosure?: UtteranceClosureKind;
}

export type TailRoot = HydratedTailRoot;

export type QuoteBinding = "unbound" | "quoted_content";

export const QUOTE_BINDING_VALUES = [
  "unbound",
  "quoted_content"
] as const satisfies readonly QuoteBinding[];



export interface ModalInventoryEntry {
  readonly modal: ModalKind;
  readonly description: string;
}

export const MODAL_INVENTORY = [
  { modal: "wake", description: "" },
  { modal: "hazu", description: "" },
  { modal: "kamo", description: "" },
  { modal: "noda", description: "" },
  { modal: "youda", description: "" },
  { modal: "souda_hearsay", description: "" },
  { modal: "rashii", description: "" },
  { modal: "tsumori", description: "" },
  { modal: "tokoro", description: "" },
  { modal: "mai", description: "" },
  { modal: "limit_negation", description: "" },
  { modal: "mono", description: "" }
] as const satisfies readonly ModalInventoryEntry[];

export interface AspectInventoryEntry {
  readonly aspect: AspectKind;
  readonly description: string;
}

export const ASPECT_INVENTORY = [
  { aspect: "te_iru", description: "" },
  { aspect: "te_aru", description: "" },
  { aspect: "te_iku", description: "" },
  { aspect: "te_kuru", description: "" },
  { aspect: "te_oku", description: "" },
  { aspect: "te_shimau", description: "" },
  { aspect: "te_miru", description: "" },
  { aspect: "te_mawaru", description: "" },
  { aspect: "tsutsu_aru", description: "" },
  { aspect: "te_ageru", description: "" },
  { aspect: "te_kureru", description: "" },
  { aspect: "te_kudasaru", description: "" },
  { aspect: "te_morau", description: "" },
  { aspect: "te_itadaku", description: "" },
  { aspect: "te_moraeru", description: "" },
  { aspect: "te_itadakeru", description: "" },
  { aspect: "te_hoshii", description: "" },
  { aspect: "te_kudasai", description: "" },
  { aspect: "te_kure_tanomu", description: "" },
  { aspect: "naide_kudasai", description: "" },
  { aspect: "te_miseru", description: "" }
] as const satisfies readonly AspectInventoryEntry[];

export interface PostverbAuxiliaryInventoryEntry {
  readonly auxiliary: PostverbAuxiliaryKind;
  readonly description: string;
}

export const POSTVERB_AUXILIARY_INVENTORY = [
  { auxiliary: "completion", description: "" },
  { auxiliary: "completion_potential", description: "" },
  { auxiliary: "continuation", description: "" },
  { auxiliary: "inchoative", description: "" },
  { auxiliary: "accustomed", description: "" },
  { auxiliary: "forget", description: "" },
  { auxiliary: "failure_miss", description: "" },
  { auxiliary: "near_miss", description: "" },
  { auxiliary: "incomplete_attempt", description: "" },
  { auxiliary: "difficulty", description: "" },
  { auxiliary: "risk_potential", description: "" },
  { auxiliary: "redo", description: "" },
  { auxiliary: "prolonged", description: "" },
  { auxiliary: "perseverance", description: "" },
  { auxiliary: "exhaustive", description: "" },
  { auxiliary: "potential", description: "" },
  { auxiliary: "adverbial_potential", description: "" },
  { auxiliary: "intensive", description: "" },
  { auxiliary: "reciprocal", description: "" },
  { auxiliary: "excessive", description: "" },
  { auxiliary: "accomplishment", description: "" },
  { auxiliary: "determined_completion", description: "" },
  { auxiliary: "state_change", description: "" },
  { auxiliary: "state_change_potential", description: "" },
  { auxiliary: "make_state_change", description: "" },
  { auxiliary: "make_state_change_causative", description: "" },
  { auxiliary: "adverbial_change", description: "" },
  { auxiliary: "adverbial_change_potential", description: "" },
  { auxiliary: "adverbial_control", description: "" },
  { auxiliary: "appearance_control", description: "" },
  { auxiliary: "contempt", description: "" },
  { auxiliary: "appearance_state_change", description: "" },
  { auxiliary: "appearance_state_change_potential", description: "" },
  { auxiliary: "appearance_behavior", description: "" },
  { auxiliary: "scope_control", description: "" },
  { auxiliary: "manner_action_control", description: "" },
  { auxiliary: "manner_simile_become", description: "" },
  { auxiliary: "manner_simile_become_potential", description: "" },
  { auxiliary: "appearance_perception", description: "" },
  { auxiliary: "epistemic_hedge", description: "" },
  { auxiliary: "focus_support", description: "" }
] as const satisfies readonly PostverbAuxiliaryInventoryEntry[];

export interface IdiomInventoryEntry {
  readonly idiom: IdiomKind;
  readonly description: string;
}

export const IDIOM_INVENTORY = [
  { idiom: "obligation", description: "" },
  { idiom: "permission", description: "" },
  { idiom: "forbidden", description: "" },
  { idiom: "sufficiency_conditional", description: "" },
  { idiom: "te_evaluation", description: "" },
  { idiom: "potential_koto_ga_dekiru", description: "" },
  { idiom: "negative_necessity_sumu", description: "" },
  { idiom: "negative_necessity_koto_wa", description: "" },
  { idiom: "inevitable_zaru_o_enai", description: "" },
  { idiom: "cannot_refrain_negative_dewa_irarenai", description: "" },
  { idiom: "method_you_ga_nai", description: "" },
  { idiom: "wake_impossible", description: "" },
  { idiom: "negative_necessity_made_mo", description: "" },
  { idiom: "only_option_shika_nai", description: "" },
  { idiom: "experience_koto_ga_aru", description: "" },
  { idiom: "decision_koto_ni_suru", description: "" },
  { idiom: "outcome_koto_ni_naru", description: "" },
  { idiom: "degree_intensifier", description: "" }
] as const satisfies readonly IdiomInventoryEntry[];

export interface AuxOpInventoryEntry {
  readonly opKind: AuxOpKind;
  readonly description: string;
}

export const AUX_OP_INVENTORY = [
  { opKind: "negation", description: "" },
  { opKind: "tense", description: "" },
  { opKind: "polite", description: "" },
  { opKind: "classicalAuxResidue", description: "" },
  { opKind: "desire", description: "" },
  { opKind: "voice", description: "" },
  { opKind: "conjecture", description: "" },
  { opKind: "copula", description: "" },
  { opKind: "modal", description: "" },
  { opKind: "scopeBridge", description: "" },
  { opKind: "adjCopulaBridge", description: "" },
  { opKind: "aspect", description: "" },
  { opKind: "postverbAuxiliary", description: "" },
  { opKind: "predicateProjectionCarrier", description: "" },
  { opKind: "predicateQuoteCarrier", description: "" },
  { opKind: "predicateSuffix", description: "" },
  { opKind: "idiom", description: "" },
  { opKind: "connective", description: "" }
] as const satisfies readonly AuxOpInventoryEntry[];


export interface ConnectiveEntry {
  readonly kind: ConnectiveKind;
  readonly description: string;
}

export const CONNECTIVE_INVENTORY = [
  { kind: "te_form", description: "" },
  { kind: "adversative", description: "" },
  { kind: "reason", description: "" },
  { kind: "reason_quoted_judgment_passive", description: "" },
  { kind: "inevitable_reason", description: "" },
  { kind: "conditional", description: "" },
  { kind: "listing", description: "" },
  { kind: "simultaneous", description: "" },
  { kind: "sequence_after", description: "" },
  { kind: "sequence_immediate", description: "" },
  { kind: "stative_hold", description: "" },
  { kind: "temporal_since", description: "" },
  { kind: "concession", description: "" },
  { kind: "origin", description: "" },
  { kind: "quotative", description: "" },
  { kind: "alternative", description: "" },
  { kind: "additive_besides", description: "" },
  { kind: "question_content", description: "" },
  { kind: "question_content_alternative", description: "" },
  { kind: "question_quotative", description: "" },
  { kind: "cognitive_complement", description: "" },
  { kind: "wish_complement", description: "" },
  { kind: "request_complement", description: "" },
  { kind: "purpose_evaluation_nominalizer", description: "" },
  { kind: "external_nominalizer_comparison", description: "" },
  { kind: "external_nominalizer_concessive", description: "" },
  { kind: "external_nominalizer_additive", description: "" },
  { kind: "external_nominalizer_conformity", description: "" },
  { kind: "bound_nominal_reason", description: "" },
  { kind: "bound_nominal_listing", description: "" },
  { kind: "tame_reason", description: "" },
  { kind: "tame_purpose", description: "" },
  { kind: "predicate_projection_tame_gerund", description: "" },
  { kind: "predicate_projection_derivational_nominal_m", description: "" },
  { kind: "predicate_projection_purpose", description: "" },
  { kind: "predicate_projection_wish_terminal", description: "" },
  { kind: "predicate_projection_manner_simile", description: "" },
  { kind: "predicate_projection_manner_volitional", description: "" },
  { kind: "predicate_projection_manner_simile_action", description: "" },
  { kind: "predicate_projection_quotative_manner_simile", description: "" },
  { kind: "predicate_projection_quotative_manner_simile_attributive", description: "" },
  { kind: "reformulation", description: "" },
  { kind: "quoted_concessive", description: "" },
  { kind: "retrospective_quotative", description: "" },
  { kind: "question_reformulation", description: "" },
  { kind: "even_if", description: "" },
  { kind: "predicate_projection_degree_extent", description: "" },
  { kind: "predicate_projection_quantity_extent", description: "" },
  { kind: "predicate_projection_correlative_degree", description: "" },
  { kind: "predicate_projection_comparison", description: "" },
  { kind: "predicate_projection_parallel_change", description: "" },
  { kind: "predicate_projection_repeated_occasion", description: "" },
  { kind: "predicate_projection_occasion", description: "" },
  { kind: "predicate_projection_intentional_purpose", description: "" },
  { kind: "predicate_projection_evaluation_extent", description: "" },
  { kind: "predicate_projection_concession_echo", description: "" },
  { kind: "predicate_projection_until", description: "" },
  { kind: "predicate_projection_until_attributive", description: "" },
  { kind: "predicate_projection_as_far_as", description: "" },
  { kind: "established_premise", description: "" },
  { kind: "predicate_projection_ni_complement", description: "" },
  { kind: "predicate_projection_ni_complement_m", description: "" },
  { kind: "predicate_projection_ni_complement_outcome", description: "" },
  { kind: "predicate_projection_ni_complement_worth", description: "" },
  { kind: "predicate_projection_ni_complement_cannot_bear", description: "" },
  { kind: "predicate_projection_no_quote_reporting", description: "" },
  { kind: "predicate_projection_additive_ue_ni", description: "" },
  { kind: "predicate_projection_ue_de", description: "" },
  { kind: "predicate_projection_ue_de_attributive", description: "" },
  { kind: "predicate_projection_gatera", description: "" },
  { kind: "purpose_motion", description: "" },
  { kind: "volitional_purpose", description: "" },
  { kind: "predicate_projection_purpose_beku", description: "" },
  { kind: "predicate_projection_quote_attributive", description: "" },
  { kind: "predicate_projection_simultaneous_time", description: "" },
  { kind: "focus_additive_denaku", description: "" },
  { kind: "focus_additive_negative", description: "" },
  { kind: "focus_limit_de", description: "" },
  { kind: "focus_limit_nara", description: "" },
  { kind: "recent_past_bakari_ni_reason", description: "" },
  { kind: "predicate_projection_proportional_reason", description: "" },
  { kind: "focus_reversal_dokoro_ka", description: "" },
  { kind: "exemplification", description: "" }
] as const satisfies readonly ConnectiveEntry[];

const CONNECTIVE_KINDS = new Set<ConnectiveKind>(CONNECTIVE_INVENTORY.map((entry) => entry.kind));

export function isConnectiveKind(value: string): value is ConnectiveKind {
  return CONNECTIVE_KINDS.has(value as ConnectiveKind);
}


export interface SfpInventoryEntry {
  readonly effect: SfpEffect;
  readonly description: string;
}

export const SFP_INVENTORY = [
  { effect: "ne", description: "" },
  { effect: "na_excl", description: "" },
  { effect: "na_prohib", description: "" },
  { effect: "na_soft_imperative", description: "" },
  { effect: "kana", description: "" },
  { effect: "jan", description: "" },
  { effect: "yone_confirm", description: "" },
  { effect: "kke", description: "" },
  { effect: "explanatory", description: "" },
  { effect: "volitional_resolve", description: "" },
  { effect: "speaker_assertion", description: "" },
  { effect: "ka", description: "" },
  { effect: "ka_ne", description: "" },
  { effect: "kai", description: "" },
  { effect: "kayo", description: "" },
  {
    effect: "realization",
    description: ""
  },
  { effect: "plain_q", description: "" },
  { effect: "polite_q", description: "" },
  { effect: "neg_confirm_q", description: "" },
  { effect: "neg_invite_q", description: "" },
  { effect: "neg_plain_q", description: "" },
  { effect: "role_cat_nya", description: "" },
  { effect: "nante_excl", description: "" },
  { effect: "quotative_insistent", description: "" },
  { effect: "quotative_topic_excl", description: "" },
  { effect: "quotative_command", description: "" }
] as const satisfies readonly SfpInventoryEntry[];

export function quotedMoodForClosingSfpEffect(
  effect: SfpEffect | null | undefined
): "imperative" | "interrogative" | null {
  if (effect === "na_soft_imperative" || effect === "na_prohib") {
    return "imperative";
  }
  if (isKaFamilyQuestionSfpEffect(effect) || effect === "kana" || effect === "kke") {
    return "interrogative";
  }
  return null;
}

export function isKaFamilyQuestionSfpEffect(effect: SfpEffect | null | undefined): boolean {
  return effect === "ka" || effect === "ka_ne" || effect === "kai" || effect === "kayo";
}

export function isCommittedKaQuestionSfpEffect(effect: SfpEffect | null | undefined): boolean {
  return effect === "ka" ||
    effect === "polite_q" ||
    effect === "neg_invite_q" ||
    effect === "neg_plain_q" ||
    effect === "neg_confirm_q";
}


export function assertNever(value: never): never {
  throw new Error(`unexpected value: ${JSON.stringify(value)}`);
}

type _Exhaustive<Universe, Members extends Universe> =
  [Universe] extends [Members] ? true : never;

const _modalCoverage: _Exhaustive<ModalKind, (typeof MODAL_INVENTORY)[number]["modal"]> = true;
const _aspectCoverage: _Exhaustive<AspectKind, (typeof ASPECT_INVENTORY)[number]["aspect"]> = true;
const _benefactiveAspectCoverage: _Exhaustive<
  BenefactiveAspectKind,
  (typeof BENEFACTIVE_ASPECT_VALUES)[number]
> = true;
const _postverbAuxiliaryCoverage: _Exhaustive<
  PostverbAuxiliaryKind,
  (typeof POSTVERB_AUXILIARY_INVENTORY)[number]["auxiliary"]
> = true;
const _potentialCompositionCoverage: _Exhaustive<
  PotentialComposition,
  (typeof POTENTIAL_COMPOSITION_VALUES)[number]
> = true;
const _idiomCoverage: _Exhaustive<IdiomKind, (typeof IDIOM_INVENTORY)[number]["idiom"]> = true;
const _auxOpCoverage: _Exhaustive<AuxOpKind, (typeof AUX_OP_INVENTORY)[number]["opKind"]> = true;
const _connectiveCoverage: _Exhaustive<ConnectiveKind, (typeof CONNECTIVE_INVENTORY)[number]["kind"]> = true;
const _terminalKindCoverage: _Exhaustive<TerminalKind, (typeof TERMINAL_KIND_VALUES)[number]> = true;
const _quoteBindingCoverage: _Exhaustive<QuoteBinding, (typeof QUOTE_BINDING_VALUES)[number]> = true;
const _stemMoodCoverage: _Exhaustive<StemMood, (typeof STEM_MOOD_VALUES)[number]> = true;
const _stemKindCoverage: _Exhaustive<StemNode["kind"], (typeof STEM_KIND_VALUES)[number]> = true;
const _sourcePredicateShapeCoverage: _Exhaustive<
  SourcePredicateShape,
  (typeof SOURCE_PREDICATE_SHAPE_VALUES)[number]
> = true;
const _headProjectionKindCoverage: _Exhaustive<
  HeadProjectionKind,
  (typeof HEAD_PROJECTION_KIND_VALUES)[number]
> = true;
const _koreanRealizationCategoryCoverage: _Exhaustive<
  KoreanRealizationCategory,
  (typeof KOREAN_REALIZATION_CATEGORY_VALUES)[number]
> = true;
const _sfpCoverage: _Exhaustive<SfpEffect, (typeof SFP_INVENTORY)[number]["effect"]> = true;
const _predicateQuoteCarrierAllomorphCoverage: _Exhaustive<
  PredicateQuoteCarrierAllomorph,
  (typeof PREDICATE_QUOTE_CARRIER_ALLOMORPH_VALUES)[number]
> = true;
const _predicateProjectionCarrierSourceAllomorphCoverage: _Exhaustive<
  PredicateProjectionCarrierSourceAllomorph,
  (typeof PREDICATE_PROJECTION_CARRIER_SOURCE_ALLOMORPH_VALUES)[number]
> = true;
const _forbiddenSourceAllomorphCoverage: _Exhaustive<
  ForbiddenSourceAllomorph,
  (typeof FORBIDDEN_SOURCE_ALLOMORPH_VALUES)[number]
> = true;
const _connectiveSurfaceAllomorphCoverage: _Exhaustive<
  ConnectiveSurfaceAllomorph,
  (typeof CONNECTIVE_SURFACE_ALLOMORPH_VALUES)[number]
> = true;

const _polarityCoverage: _Exhaustive<Polarity, (typeof POLARITY_VALUES)[number]> = true;
const _negationSourceSplitKindCoverage: _Exhaustive<
  NegationSourceSplitKind,
  (typeof NEGATION_SOURCE_SPLIT_KIND_VALUES)[number]
> = true;
const _tenseCoverage: _Exhaustive<TenseKind, (typeof TENSE_VALUES)[number]> = true;
const _classicalAuxResidueCoverage: _Exhaustive<
  ClassicalAuxResidueKind,
  (typeof CLASSICAL_AUX_RESIDUE_VALUES)[number]
> = true;
const _voiceCoverage: _Exhaustive<VoiceKind, (typeof VOICE_VALUES)[number]> = true;
const _voiceReadingCoverage: _Exhaustive<
  VoiceReadingCandidate,
  (typeof VOICE_READING_VALUES)[number]
> = true;
const _copulaVariantCoverage: _Exhaustive<
  CopulaVariantKind,
  (typeof COPULA_VARIANT_VALUES)[number]
> = true;
const _copulaBasicFormCoverage: _Exhaustive<
  CopulaBasicForm,
  (typeof COPULA_BASIC_FORM_VALUES)[number]
> = true;
const _copulaNegativeBridgeFormCoverage: _Exhaustive<
  CopulaNegativeBridgeForm,
  (typeof COPULA_NEGATIVE_BRIDGE_FORM_VALUES)[number]
> = true;
const _wakeVariantCoverage: _Exhaustive<WakeVariant, (typeof WAKE_VARIANT_VALUES)[number]> = true;
const _limitNegationFocusCoverage: _Exhaustive<LimitNegationFocus, (typeof LIMIT_NEGATION_FOCUS_VALUES)[number]> = true;
const _youdaFormCoverage: _Exhaustive<YoudaForm, (typeof YOUDA_FORM_VALUES)[number]> = true;
const _youdaTerminalCoverage: _Exhaustive<
  YoudaTerminal,
  (typeof YOUDA_TERMINAL_VALUES)[number]
> = true;
const _youdaReadingCoverage: _Exhaustive<
  YoudaReadingCandidate,
  (typeof YOUDA_READING_VALUES)[number]
> = true;
const _soudaReadingCoverage: _Exhaustive<
  SoudaReadingCandidate,
  (typeof SOUDA_READING_VALUES)[number]
> = true;
const _tsumoriVariantCoverage: _Exhaustive<
  TsumoriVariant,
  (typeof TSUMORI_VARIANT_VALUES)[number]
> = true;
const _tsumoriReadingCoverage: _Exhaustive<
  TsumoriReadingCandidate,
  (typeof TSUMORI_READING_VALUES)[number]
> = true;
const _tokoroVariantCoverage: _Exhaustive<
  TokoroVariant,
  (typeof TOKORO_VARIANT_VALUES)[number]
> = true;
const _tokoroReadingCoverage: _Exhaustive<
  TokoroReadingCandidate,
  (typeof TOKORO_READING_VALUES)[number]
> = true;
const _tokoroNominalNounCoverage: _Exhaustive<
  TokoroNominalNoun,
  (typeof TOKORO_NOMINAL_NOUN_VALUES)[number]
> = true;
const _scopeBridgeHeadCoverage: _Exhaustive<
  ScopeBridgeHead,
  (typeof SCOPE_BRIDGE_HEAD_VALUES)[number]
> = true;
const _scopeBridgeFormCoverage: _Exhaustive<
  ScopeBridgeForm,
  (typeof SCOPE_BRIDGE_FORM_VALUES)[number]
> = true;
const _scopeBridgeParticleCoverage: _Exhaustive<
  ScopeBridgeParticle,
  (typeof SCOPE_BRIDGE_PARTICLE_VALUES)[number]
> = true;
const _adjCopulaBridgeFormCoverage: _Exhaustive<
  AdjCopulaBridgeForm,
  (typeof ADJ_COPULA_BRIDGE_FORM_VALUES)[number]
> = true;
const _benefactiveKindCoverage: _Exhaustive<
  BenefactiveKind,
  (typeof BENEFACTIVE_KIND_VALUES)[number]
> = true;
const _benefactivePivotCoverage: _Exhaustive<
  BenefactivePivot,
  (typeof BENEFACTIVE_PIVOT_VALUES)[number]
> = true;
const _benefactiveLexicalTailAbsorptionCoverage: _Exhaustive<
  BenefactiveLexicalTailAbsorptionKind,
  (typeof BENEFACTIVE_LEXICAL_TAIL_ABSORPTION_VALUES)[number]
> = true;
const _benefactiveCausativeRenderPolicyCoverage: _Exhaustive<
  BenefactiveCausativeRenderPolicy,
  (typeof BENEFACTIVE_CAUSATIVE_RENDER_POLICY_VALUES)[number]
> = true;
const _prohibitionRequestTailCoverage: _Exhaustive<
  ProhibitionRequestTail,
  (typeof PROHIBITION_REQUEST_TAIL_VALUES)[number]
> = true;
const _aspectTeFocusTargetCoverage: _Exhaustive<
  AspectTeFocusTarget,
  (typeof ASPECT_TE_FOCUS_TARGET_VALUES)[number]
> = true;
const _ellipticTeIruSourceHostCoverage: _Exhaustive<
  EllipticTeIruSourceHost,
  (typeof ELLIPTIC_TE_IRU_SOURCE_HOST_VALUES)[number]
> = true;
const _aspectTerminalMoodCoverage: _Exhaustive<
  AspectTerminalMood,
  (typeof ASPECT_TERMINAL_MOOD_VALUES)[number]
> = true;
const _aspectSemanticReadingCoverage: _Exhaustive<
  AspectSemanticReading,
  (typeof ASPECT_SEMANTIC_READING_VALUES)[number]
> = true;
const _aspectRenderStrategyCoverage: _Exhaustive<
  AspectRenderStrategy,
  (typeof ASPECT_RENDER_STRATEGY_VALUES)[number]
> = true;
const _aspectProjectionPolicyCoverage: _Exhaustive<
  AspectProjectionPolicy,
  (typeof ASPECT_PROJECTION_POLICY_VALUES)[number]
> = true;
const _simpleAspectCollapsedCoverage: _Exhaustive<
  SimpleAspectCollapsed,
  (typeof SIMPLE_ASPECT_COLLAPSED_VALUES)[number]
> = true;
const _simpleAspectFollowingRareruReadingCoverage: _Exhaustive<
  SimpleAspectFollowingRareruReading,
  (typeof SIMPLE_ASPECT_FOLLOWING_RARERU_READING_VALUES)[number]
> = true;
const _benefactiveRequestEvidenceCoverage: _Exhaustive<
  BenefactiveRequestEvidence,
  (typeof BENEFACTIVE_REQUEST_EVIDENCE_VALUES)[number]
> = true;
const _completionTeIruNegativeStrategyCoverage: _Exhaustive<
  CompletionTeIruNegativeStrategy,
  (typeof COMPLETION_TE_IRU_NEGATIVE_STRATEGY_VALUES)[number]
> = true;
const _completionFollowingPassiveStrategyCoverage: _Exhaustive<
  CompletionFollowingPassiveStrategy,
  (typeof COMPLETION_FOLLOWING_PASSIVE_STRATEGY_VALUES)[number]
> = true;
const _postverbHostAttachFormCoverage: _Exhaustive<
  PostverbHostAttachForm,
  (typeof POSTVERB_HOST_ATTACH_FORM_VALUES)[number]
> = true;
const _compoundDispatchHintCoverage: _Exhaustive<
  CompoundDispatchHint,
  (typeof COMPOUND_DISPATCH_HINT_VALUES)[number]
> = true;
const _postverbHeadProjectionCoverage: _Exhaustive<
  PostverbHeadProjection,
  (typeof POSTVERB_HEAD_PROJECTION_VALUES)[number]
> = true;
const _postverbSahenHostProjectionCoverage: _Exhaustive<
  PostverbSahenHostProjection,
  (typeof POSTVERB_SAHEN_HOST_PROJECTION_VALUES)[number]
> = true;
const _postverbFollowingRareruDefaultCoverage: _Exhaustive<
  PostverbFollowingRareruDefault,
  (typeof POSTVERB_FOLLOWING_RARERU_DEFAULT_VALUES)[number]
> = true;
const _postverbPerceptionCoverage: _Exhaustive<
  PostverbPerception,
  (typeof POSTVERB_PERCEPTION_VALUES)[number]
> = true;
const _postverbPerceptionProjectionCoverage: _Exhaustive<
  PostverbPerceptionProjection,
  (typeof POSTVERB_PERCEPTION_PROJECTION_VALUES)[number]
> = true;
const _postverbHedgePrefixKindCoverage: _Exhaustive<
  PostverbHedgePrefixKind,
  (typeof POSTVERB_HEDGE_PREFIX_KIND_VALUES)[number]
> = true;
const _postverbHedgeProjectionCoverage: _Exhaustive<
  PostverbHedgeProjection,
  (typeof POSTVERB_HEDGE_PROJECTION_VALUES)[number]
> = true;
const _postverbHedgeFocusCoverage: _Exhaustive<
  PostverbHedgeFocus,
  (typeof POSTVERB_HEDGE_FOCUS_VALUES)[number]
> = true;
const _predicateProjectionCarrierCoverage: _Exhaustive<
  PredicateProjectionCarrierKind,
  (typeof PREDICATE_PROJECTION_CARRIER_VALUES)[number]
> = true;
const _predicateQuoteCarrierStyleCoverage: _Exhaustive<
  PredicateQuoteCarrierStyle,
  (typeof PREDICATE_QUOTE_CARRIER_STYLE_VALUES)[number]
> = true;
const _tosuruConstructionModeCoverage: _Exhaustive<
  TosuruConstructionMode,
  (typeof TOSURU_CONSTRUCTION_MODE_VALUES)[number]
> = true;
const _predicateSuffixCoverage: _Exhaustive<
  PredicateSuffixKind,
  (typeof PREDICATE_SUFFIX_VALUES)[number]
> = true;
const _obligationVariantCoverage: _Exhaustive<
  ObligationVariant,
  (typeof OBLIGATION_VARIANT_VALUES)[number]
> = true;
const _permissionVariantCoverage: _Exhaustive<
  PermissionVariant,
  (typeof PERMISSION_VARIANT_VALUES)[number]
> = true;
const _permissionConnectiveSurfaceCoverage: _Exhaustive<
  PermissionConnectiveSurface,
  (typeof PERMISSION_CONNECTIVE_SURFACE_VALUES)[number]
> = true;
const _teEvaluationKindCoverage: _Exhaustive<
  TeEvaluationKind,
  (typeof TE_EVALUATION_KIND_VALUES)[number]
> = true;
const _potentialKotoDekiruParticleCoverage: _Exhaustive<
  PotentialKotoDekiruParticleKind,
  (typeof POTENTIAL_KOTO_DEKIRU_PARTICLE_VALUES)[number]
> = true;
const _negativeNecessitySumuVariantCoverage: _Exhaustive<
  NegativeNecessitySumuVariant,
  (typeof NEGATIVE_NECESSITY_SUMU_VARIANT_VALUES)[number]
> = true;
const _methodYouGaNaiSurfaceCoverage: _Exhaustive<
  MethodYouGaNaiSurface,
  (typeof METHOD_YOU_GA_NAI_SURFACE_VALUES)[number]
> = true;
const _methodYouGaNaiParticleCoverage: _Exhaustive<
  MethodYouGaNaiParticleKind,
  (typeof METHOD_YOU_GA_NAI_PARTICLE_VALUES)[number]
> = true;
const _wakeImpossibleFocusCoverage: _Exhaustive<
  WakeImpossibleFocus,
  (typeof WAKE_IMPOSSIBLE_FOCUS_VALUES)[number]
> = true;
const _onlyOptionMarkerCoverage: _Exhaustive<
  OnlyOptionMarker,
  (typeof ONLY_OPTION_MARKER_VALUES)[number]
> = true;
const _experienceParticleCoverage: _Exhaustive<
  ExperienceParticleKind,
  (typeof EXPERIENCE_PARTICLE_VALUES)[number]
> = true;
const _degreeIntensifierModeCoverage: _Exhaustive<
  DegreeIntensifierMode,
  (typeof DEGREE_INTENSIFIER_MODE_VALUES)[number]
> = true;
const _degreeIntensifierVariantCoverage: _Exhaustive<
  DegreeIntensifierVariant,
  (typeof DEGREE_INTENSIFIER_VARIANT_VALUES)[number]
> = true;
const _quotativeMoodCoverage: _Exhaustive<
  QuotativeMood,
  (typeof QUOTATIVE_MOOD_VALUES)[number]
> = true;
const _boundNominalReasonClosureCoverage: _Exhaustive<
  BoundNominalReasonClosure,
  (typeof BOUND_NOMINAL_REASON_CLOSURE_VALUES)[number]
> = true;
const _structuralContinuationCoverage: _Exhaustive<
  StructuralContinuation,
  (typeof STRUCTURAL_CONTINUATION_VALUES)[number]
> = true;
const _conditionalQuoteEllipsisCoverage: _Exhaustive<
  ConditionalQuoteEllipsis,
  (typeof CONDITIONAL_QUOTE_ELLIPSIS_VALUES)[number]
> = true;
const _quotativeClosureCoverage: _Exhaustive<
  QuotativeClosure,
  (typeof QUOTATIVE_CLOSURE_VALUES)[number]
> = true;
const _teFormConnectiveRoleCoverage: _Exhaustive<
  TeFormConnectiveRole,
  (typeof TE_FORM_CONNECTIVE_ROLE_VALUES)[number]
> = true;
const _conditionalFlavorCoverage: _Exhaustive<
  ConditionalFlavor,
  (typeof CONDITIONAL_FLAVOR_VALUES)[number]
> = true;
const _quoteAttributiveFlavorCoverage: _Exhaustive<
  QuoteAttributiveFlavor,
  (typeof QUOTE_ATTRIBUTIVE_FLAVOR_VALUES)[number]
> = true;
const _connectiveRecoveryCoverage: _Exhaustive<
  ConnectiveRecovery,
  (typeof CONNECTIVE_RECOVERY_VALUES)[number]
> = true;
const _cognitiveComplementParticleCoverage: _Exhaustive<
  CognitiveComplementParticle,
  (typeof COGNITIVE_COMPLEMENT_PARTICLE_VALUES)[number]
> = true;
const _questionContentRoleCoverage: _Exhaustive<
  QuestionContentRole,
  (typeof QUESTION_CONTENT_ROLE_VALUES)[number]
> = true;
const _retrospectiveDiscoveryStyleCoverage: _Exhaustive<
  RetrospectiveDiscoveryStyle,
  (typeof RETROSPECTIVE_DISCOVERY_STYLE_VALUES)[number]
> = true;
const _requestQuoteTailKindCoverage: _Exhaustive<
  RequestQuoteTailKind,
  (typeof REQUEST_QUOTE_TAIL_KIND_VALUES)[number]
> = true;
const _quoteBoundaryKoreanClauseFormCoverage: _Exhaustive<
  QuoteBoundaryKoreanClauseForm,
  (typeof QUOTE_BOUNDARY_KOREAN_CLAUSE_FORM_VALUES)[number]
> = true;

void _modalCoverage;
void _aspectCoverage;
void _postverbAuxiliaryCoverage;
void _potentialCompositionCoverage;
void _idiomCoverage;
void _auxOpCoverage;
void _connectiveCoverage;
void _stemMoodCoverage;
void _sfpCoverage;
void _polarityCoverage;
void _negationSourceSplitKindCoverage;
void _tenseCoverage;
void _classicalAuxResidueCoverage;
void _voiceCoverage;
void _voiceReadingCoverage;
void _copulaVariantCoverage;
void _copulaBasicFormCoverage;
void _copulaNegativeBridgeFormCoverage;
void _wakeVariantCoverage;
void _limitNegationFocusCoverage;
void _youdaFormCoverage;
void _youdaTerminalCoverage;
void _youdaReadingCoverage;
void _soudaReadingCoverage;
void _tsumoriVariantCoverage;
void _tsumoriReadingCoverage;
void _tokoroVariantCoverage;
void _tokoroReadingCoverage;
void _tokoroNominalNounCoverage;
void _scopeBridgeHeadCoverage;
void _scopeBridgeFormCoverage;
void _scopeBridgeParticleCoverage;
void _adjCopulaBridgeFormCoverage;
void _benefactiveKindCoverage;
void _benefactivePivotCoverage;
void _benefactiveLexicalTailAbsorptionCoverage;
void _benefactiveCausativeRenderPolicyCoverage;
void _prohibitionRequestTailCoverage;
void _aspectTeFocusTargetCoverage;
void _ellipticTeIruSourceHostCoverage;
void _aspectTerminalMoodCoverage;
void _aspectSemanticReadingCoverage;
void _aspectRenderStrategyCoverage;
void _aspectProjectionPolicyCoverage;
void _simpleAspectCollapsedCoverage;
void _simpleAspectFollowingRareruReadingCoverage;
void _benefactiveRequestEvidenceCoverage;
void _completionTeIruNegativeStrategyCoverage;
void _completionFollowingPassiveStrategyCoverage;
void _postverbHostAttachFormCoverage;
void _postverbHeadProjectionCoverage;
void _postverbSahenHostProjectionCoverage;
void _postverbFollowingRareruDefaultCoverage;
void _postverbPerceptionCoverage;
void _postverbPerceptionProjectionCoverage;
void _postverbHedgePrefixKindCoverage;
void _postverbHedgeProjectionCoverage;
void _predicateProjectionCarrierCoverage;
void _predicateQuoteCarrierStyleCoverage;
void _tosuruConstructionModeCoverage;
void _predicateSuffixCoverage;
void _obligationVariantCoverage;
void _permissionVariantCoverage;
void _permissionConnectiveSurfaceCoverage;
void _teEvaluationKindCoverage;
void _potentialKotoDekiruParticleCoverage;
void _negativeNecessitySumuVariantCoverage;
void _methodYouGaNaiSurfaceCoverage;
void _wakeImpossibleFocusCoverage;
void _onlyOptionMarkerCoverage;
void _experienceParticleCoverage;
void _degreeIntensifierModeCoverage;
void _degreeIntensifierVariantCoverage;
void _quotativeMoodCoverage;
void _boundNominalReasonClosureCoverage;
void _structuralContinuationCoverage;
void _conditionalQuoteEllipsisCoverage;
void _quotativeClosureCoverage;
void _teFormConnectiveRoleCoverage;
void _conditionalFlavorCoverage;
void _quoteAttributiveFlavorCoverage;
void _connectiveRecoveryCoverage;
void _cognitiveComplementParticleCoverage;
void _questionContentRoleCoverage;
void _retrospectiveDiscoveryStyleCoverage;
void _requestQuoteTailKindCoverage;
void _quoteBoundaryKoreanClauseFormCoverage;

export function mapConjType(jpConj: number): VerbConjType {
  if (jpConj === 0) {
    return "irregular";
  }
  if (is五段(jpConj)) {
    return "godan";
  }
  if (is上一段(jpConj) || is下一段(jpConj)) {
    return "ichidan";
  }
  if (jpConj === サ行変格) {
    return "sahen";
  }
  if (jpConj === カ行変格) {
    return "kahen";
  }
  return "irregular";
}
