import type { IrregularType } from "../generator/conjugator.js";
import type { SourceCandidateSet } from "../pipeline/source-candidate-set.js";
import type { MorphemeEntry, MorphemeSense } from "./dictionary.js";
import type { ResolvedDerivation } from "../dictionary/derivation.js";
import type { RenderPlan, Voice } from "./render-plan.js";
import type { RuntimeHaruToken, SourceTokenSpan } from "./token.js";
import type { Warning } from "./warning.js";

export type RenderPlanPolicy = "normal" | "awaiting_structural_relation";
export type UnitType = "content" | "functional" | "symbol" | "numeral" | "prefix" | "suffix";
export type FunctionalKind = "particle" | "contextual" | "multi_token";
export type RareruReading = "passive" | "potential" | "honorific";
export type NareruReading = "become_potential" | "familiarize";
export type DekiruReading = "ability" | "availability" | "completion" | "emergence";
export type HonorificLevel = "none" | "respect";
export type SourceVerbalPredicateVerdict = "purpose_motion";
export type BenefactiveCausativeAgentPolicy =
  | "benefactive_agent_subject"
  | "lexical_argument_preferred";
export const BENEFACTIVE_CAUSATIVE_AGENT_POLICY_VALUES = [
  "benefactive_agent_subject",
  "lexical_argument_preferred"
] as const satisfies readonly BenefactiveCausativeAgentPolicy[];
type _BenefactiveCausativeAgentPolicyExhaustive =
  [BenefactiveCausativeAgentPolicy] extends [
    (typeof BENEFACTIVE_CAUSATIVE_AGENT_POLICY_VALUES)[number]
  ] ? true : never;
const _benefactiveCausativeAgentPolicyCoverage: _BenefactiveCausativeAgentPolicyExhaustive = true;
void _benefactiveCausativeAgentPolicyCoverage;
export type CandidateConditionValue =
  | string
  | number
  | boolean
  | null
  | readonly CandidateConditionValue[]
  | readonly (readonly [string, CandidateConditionValue])[];

export interface BenefactiveContext {
  readonly patternId?: string | null;
  readonly needsBenefactivePivot?: boolean;
  readonly agentParticleIdx?: number | null;
  readonly recipientParticleIdx?: number | null;
  readonly honorificLevel?: HonorificLevel;
  readonly recipientSideHumble?: boolean;
  readonly causativeAgentPolicy?: BenefactiveCausativeAgentPolicy | null;
}

export interface ParticleAssignment {
  readonly role: string;
  readonly korean?: string | null;
  readonly allomorphKey?: string | null;
  readonly attachLeft?: boolean;
  readonly register?: HonorificLevel;
  readonly commitmentSource?: string | null;
}

export interface LexicalParticleAdverbialCandidateCommitment {
  readonly particleIdx: number;
  readonly consumed: number;
  readonly particleRole: "adverbializer";
  readonly renderPlan: Extract<RenderPlan, { readonly kind: "lexicalParticleAdverbial" }>;
}

export type NominalProjectionKind = "nominalized" | "stem_root" | "verbal_nominal_m";

export interface TranslationCandidate {
  priority: number;
  conditions: readonly (readonly [string, CandidateConditionValue])[];
  entry: MorphemeEntry;
  translation: MorphemeSense;
  compoundSamePredicateFrameSources?: readonly MorphemeSense[];
  projectionOrdinal: number;
  nominalProjection?: NominalProjectionKind | undefined;
  derivation?: ResolvedDerivation;
  koreanLemma: string;
  koreanPos: number;
  irregular: IrregularType | null;
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  lexicalParticleAdverbial?: LexicalParticleAdverbialCandidateCommitment | null;
  korean?: string;
  voice?: Voice | null;
  rareruReadings?: ReadonlySet<RareruReading>;
  nareruReadings?: ReadonlySet<NareruReading>;
  dekiruReadings?: ReadonlySet<DekiruReading>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
  sourceVerbalPredicateVerdict?: SourceVerbalPredicateVerdict | null;
  benefactive: BenefactiveContext;
  warnings?: readonly Warning[];

}

export type RuleTraceDetailValue =
  | string
  | number
  | boolean
  | null
  | readonly RuleTraceDetailValue[]
  | { readonly [key: string]: RuleTraceDetailValue };

export interface RuleTraceEvent {
  readonly ruleName: string;
  readonly detail: { readonly [key: string]: RuleTraceDetailValue };
  readonly phase?: string;
  readonly matched?: boolean;
  readonly tokenIdx?: number | null;
}

export interface RuleResult {
  consumed: number;
  korean: string;
  spaceAfter: boolean;
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  traceTag?: string | null;
  traceEvents?: readonly RuleTraceEvent[];
  sourceVerbalPredicateVerdict?: SourceVerbalPredicateVerdict | null;
  benefactive?: BenefactiveContext;
  warnings?: readonly Warning[];
  rawSourceSurface?: true | undefined;
}

export interface ContentResult {
  consumed: number;
  korean: string;
  koreanPos: number;
  entry: MorphemeEntry | null;
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  voice?: Voice | null;
  rareruReadings?: ReadonlySet<RareruReading>;
  nareruReadings?: ReadonlySet<NareruReading>;
  dekiruReadings?: ReadonlySet<DekiruReading>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
  benefactive?: BenefactiveContext;
  sourceCandidates?: SourceCandidateSet | null;
  warnings?: readonly Warning[];
}

export interface ContentSpan extends ContentResult {
  start: number;
  unitType: UnitType;
  attachLeft: boolean;
  particleRole?: string | null;
  isKeijoujiVerbPredicate?: boolean;
  committedParticleRoles?: Record<number, ParticleAssignment>;
  compoundHeadFrameEntry?: MorphemeEntry | null;
}

export interface KoreanChange {
  rule: string;
  old: string;
  new: string;
}

export interface TranslationUnit<E extends MorphemeEntry = MorphemeEntry> {
  jpIndices: readonly number[];
  sourceSpan?: SourceTokenSpan | null;
  jpHead: RuntimeHaruToken;
  jpPos: string;
  koreanBase: string;
  korean: string;
  koreanPos: number;
  entry: E | null;
  renderPlan: RenderPlan | null;
  renderPlanPolicy?: RenderPlanPolicy;
  unitType: UnitType;
  attachLeft?: boolean;
  attachRight?: boolean;
  functionalKind?: FunctionalKind | null;
  allomorphKey?: string | null;
  suppressed?: boolean;
  provenance?: string;
  provenanceReason?: string | null;
  history?: readonly KoreanChange[];
}

export interface ClauseLayout {
  clauses: readonly unknown[];
  tokenToClause?: ReadonlyMap<number, number>;
  predicateOwners?: ReadonlyMap<number, number>;
  quoteSpans?: readonly unknown[];
}
