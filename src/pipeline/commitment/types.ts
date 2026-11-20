import type { IrregularType } from "../../generator/conjugator.js";
import type { MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import type { ResolvedDerivation } from "../../dictionary/derivation.js";
import type { BenefactiveContext, CandidateConditionValue, DekiruReading, NareruReading, ParticleAssignment, RareruReading, RenderPlanPolicy, TranslationCandidate } from "../../types/pipeline.js";
import type { RenderPlan, Voice } from "../../types/render-plan.js";
import type { Warning } from "../../types/warning.js";
import { type LookupTables } from "../lookup-tables.js";
import type { Clause, ClauseLayout } from "../clause-layout/final-layout.js";
import type { SourceCandidateSet } from "../source-candidate-set.js";
import type { TraceCollector } from "../trace.js";
import type { HeadOwnerCandidateDescriptor, HeadOwnerCandidateSelectionSource } from "../head-tail/head/profile.js";
import type { TeConnectiveClassificationState } from "../semantics/te-connective.js";
import type { FrameEvaluation, FrameMatch, FrameSpec } from "../semantics/frame.js";
import type { TranslationUnitProvenance, UnitType } from "../translation/unit.js";
import type { PassiveClass } from "../voice-class.js";
import { 동사, 형용사 } from "../../types/pos.js";

export interface SemanticFrameRuntimeMatch {
  readonly translation: CommitmentTranslation;
  readonly translationIdx: number;
  readonly frame: FrameSpec;
  readonly priorityGroup: number;
  readonly priorityInGroup: number;
  readonly senseIndex: number | null;
  readonly match: FrameMatch | null;
  readonly evaluations?: readonly FrameEvaluation[];
  readonly skipReason?: string | null;
}

export interface ParticleCommitmentContext {
  readonly tokens: readonly CommitmentToken[];
  readonly span: CommitmentSpan;
  readonly layout: ClauseLayout | null;
  readonly predicateIdx: number | null;
  readonly particleIdx: number;
  readonly surface: string;
  readonly clause: Clause | null;
  readonly semanticRoleAssignments: ReadonlyMap<number, ParticleAssignment>;
  readonly semanticFrameRuntimeMatch: SemanticFrameRuntimeMatch | null;
  readonly trace: TraceCollector | null;
  readonly traceClauseIdx: number | null;
  readonly lookups: LookupTables;
}

export type TailParserCommittedVoice = Voice | "honorific";
export type RareruAbilityModalCueKind = "negation" | "question" | "you_ni_naru" | "volitional_manner_adverb" | "default";

export interface RareruAbilityModalCueResolution {
  readonly modalCueKind: RareruAbilityModalCueKind;
}


export interface CommitmentToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export interface ClauseTraceDetail {
  readonly clauseIdx?: number;
  readonly [key: string]: string | number | boolean | null | undefined;
}

export type TraceLikeValue =
  | string
  | number
  | boolean
  | null
  | readonly TraceLikeValue[]
  | { readonly [key: string]: TraceLikeValue };

export const PREDICATE_POS = new Set([동사, 형용사]);
export const BENEFACTIVE_REACTION_TE_ASPECTS = new Set([
  "te_kureru",
  "te_kudasaru",
  "te_morau",
  "te_itadaku",
  "te_moraeru",
  "te_itadakeru",
  "te_kudasai"
]);
export const FOLLOWING_BENEFACTIVE_RESULT_TE_ASPECTS = new Set([
  "te_kureru",
  "te_kudasaru",
  "te_morau",
  "te_itadaku",
  "te_moraeru",
  "te_itadakeru"
]);
export const TE_SHIMAU_COMPLETION_ASPECTS = new Set(["te_shimau"]);
export const NO_EXPERIENCER_KEIJOUJI = new Set(["必要"]);
export const SLOT_REALIZATION_PREFIX_MOVE_AUXILIARIES = new Set(["続ける", "つづける"]);
export const DEKIRU_ADVERB_COMPLETION_CUES = new Set(["もう", "もうすぐ"]);
export const COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT = "noun_side_default_role_inference";
export const COMMITMENT_SOURCE_CASE_REALIZATION = "case_realization";
export const COMMITMENT_SOURCE_SLOT_REALIZATION = "slot_realization";
export const COMMITMENT_SOURCE_CAUSATIVE_NEUTRAL_TRIGGER = "causative_neutral_trigger";

export interface CasePreference {
  readonly role: string;
  readonly korean?: string | null;
  readonly allomorphKey?: string | null;
}


export type CasePreferenceValue = string | CasePreferenceObject;
export type ConnectivePreferenceValue = string | {
  readonly role?: string;
  readonly connective?: string;
  readonly ending?: string;
  readonly relation?: string;
};

export interface CasePreferenceObject {
  readonly role?: string;
  readonly korean?: string;
  readonly allomorphKey?: string;
}

export interface CommitmentTranslation extends MorphemeSense {
  readonly korean: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
  readonly casePreferences?: readonly string[] | Record<string, CasePreferenceValue>;
  readonly connectivePreferences?: Record<string, ConnectivePreferenceValue>;
  readonly connective_preferences?: Record<string, ConnectivePreferenceValue>;
}

export interface SlotRealizationSpec {
  readonly korean?: string;
  readonly case?: string;
}

export interface CommitmentEntry extends MorphemeEntry {
  readonly senses?: readonly CommitmentTranslation[];
  readonly committed?: boolean;
  readonly derivation?: {
    readonly type?: string;
  } | null;
}

export interface HeadOwnerCandidateCommitmentPayload {
  readonly kind: string;
  readonly profileId: string;
  readonly start: number;
  readonly consumed: number;
  readonly korean: string;
  readonly koreanBase?: string | null;
  readonly koreanPos: number;
  readonly entry: CommitmentEntry | null;
  readonly unitType: UnitType;
  readonly attachLeft: boolean;
  readonly provenance: TranslationUnitProvenance;
  readonly provenanceReason?: string | null;
  readonly renderPlan: RenderPlan | null;
  readonly voice?: Voice | null;
  readonly passiveClass?: PassiveClass;
  readonly nareruReadings?: ReadonlySet<NareruReading>;
  readonly rareruReadings?: ReadonlySet<RareruReading>;
  readonly dekiruReadings?: ReadonlySet<DekiruReading>;
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly connectiveRole?: string | null;
  readonly teConnectiveClassificationState?: TeConnectiveClassificationState | null;
  readonly isKeijoujiVerbPredicate?: boolean;
  readonly benefactive?: BenefactiveContext | null;
  readonly sourceCandidates?: SourceCandidateSet<CommitmentCandidate> | null;
}

export interface HeadOwnerCandidateCommitmentPayloadSlot {
  readonly candidateIndex: number;
  readonly profileId: string;
  readonly candidateKind: string;
  readonly payload: HeadOwnerCandidateCommitmentPayload | null;
  readonly unavailableReason?: string | null;
}

export interface ExtentPostpositionCommitment {
  readonly modifier: string;
  readonly targetOverride: string | null;
}

export interface CommitmentSpan<E extends MorphemeEntry = CommitmentEntry> {
  start: number;
  consumed: number;
  korean: string;
  koreanPos: number;
  entry: E | null;
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  voice?: Voice | null;
  passiveClass?: PassiveClass;
  readonly voiceOpen?: boolean;
  nareruReadings?: ReadonlySet<NareruReading>;
  rareruReadings?: ReadonlySet<RareruReading>;
  dekiruReadings?: ReadonlySet<DekiruReading>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
  teConnectiveClassificationState?: TeConnectiveClassificationState | null;
  attachLeft?: boolean;
  particleRole?: string | null;
  rareruAbilitySubjectParticleIdx?: number | null;
  dekiruReferentParticleIdx?: number | null;
  dekiruCompletionDoReferent?: boolean;
  isKeijoujiVerbPredicate?: boolean;
  benefactive?: BenefactiveContext | null;
  committedParticleRoles?: Record<number, ParticleAssignment>;
  compoundHeadFrameEntry?: E | null;
  sourceCandidates?: SourceCandidateSet<CommitmentCandidate> | null;
  intrinsicHonorific?: boolean;
  ownerCandidates?: readonly HeadOwnerCandidateDescriptor[];
  ownerCandidatePayloads?: readonly HeadOwnerCandidateCommitmentPayloadSlot[];
  selectedOwnerCandidateIdx?: number | null;
  ownerCandidateSelectionSource?: HeadOwnerCandidateSelectionSource | null;
  contestedNominalUseOwner?: "content_lane" | "predicate_claim";
  extentPostposition?: ExtentPostpositionCommitment | null;
  extentPostpositionRelocated?: boolean;
  warnings?: readonly Warning[];

}

export interface CommitmentCandidate {
  entry?: CommitmentEntry | null;
  translation?: CommitmentTranslation;
  compoundSamePredicateFrameSources?: readonly CommitmentTranslation[];
  projectionOrdinal: number;
  nominalProjection?: TranslationCandidate["nominalProjection"] | undefined;
  derivation?: ResolvedDerivation;
  priority?: number;
  conditions?: readonly (readonly [string, CandidateConditionValue])[];
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  lexicalParticleAdverbial?: TranslationCandidate["lexicalParticleAdverbial"];
  korean?: string;
  koreanLemma?: string;
  intrinsicHonorific?: boolean;
  koreanPos?: number;
  irregular?: IrregularType | null;
  shortNegationPolicy?: MorphemeSense["shortNegationPolicy"];
  voice?: Voice | null;
  passiveClass?: PassiveClass;
  nareruReadings?: ReadonlySet<NareruReading>;
  rareruReadings?: ReadonlySet<RareruReading>;
  dekiruReadings?: ReadonlySet<DekiruReading>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
  teConnectiveClassificationState?: TeConnectiveClassificationState | null;
  benefactive?: BenefactiveContext;
  warnings?: readonly Warning[];

}

export type CommitmentContentMap = Map<number, CommitmentSpan> | Record<number, CommitmentSpan>;
