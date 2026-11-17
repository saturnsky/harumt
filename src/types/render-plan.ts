import type { IrregularType } from "../generator/conjugator.js";
import type { RuntimeHaruToken, SourceTokenSpan } from "./token.js";
import type { MorphemeEntry } from "./dictionary.js";
import type { AuxToken } from "../generator/aux-map.js";
import type {
  HeadTailChainRenderPlan,
  HeadTailClauseRole,
  NominalHeadTailChainPlan,
  PredicateHeadTailChainHostProjection,
  PredicateHeadTailChainRenderPlan
} from "../pipeline/head-tail/lifecycle/head-tail-render-plan.js";
import type { SfpNode, TailNode, TailRoot, TeFormConnectiveRole } from "../pipeline/head-tail/tail/predicate-root/grammar.js";
import type { ParticleKey } from "../generator/particles.js";
import type { PassiveClass } from "../pipeline/voice-class.js";
import type { TranslationUnit } from "../pipeline/translation/unit.js";
import type { FixedTextPlan, NumeralPlan } from "./numeric-base.js";
import { 동사, 형용사 } from "./pos.js";

export type {
  HeadTailChainRenderPlan,
  HeadTailChainRealization,
  HeadTailClauseRole,
  NominalHeadTailChainPlan,
  NominalHeadTailChainRealization,
  PredicateHeadTailChainHostProjection,
  PredicateHeadTailChainRealization,
  PredicateHeadTailChainRenderPlan
} from "../pipeline/head-tail/lifecycle/head-tail-render-plan.js";

export type Voice = "active" | "passive" | "potential";

export interface TeConnectiveBoundaryChoice {
  readonly anchorIdx: number;
  readonly endExclusive: number;
  readonly endingIfVerbal: string;
  readonly endingIfRequest: string;
}

export type StemDerivationOp = "state_change" | "long_negative";

export interface StemDerivationHost {
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
}

export interface StemDerivation {
  readonly ops: readonly StemDerivationOp[];
  readonly host: StemDerivationHost;
}

export interface LemmaRealization {
  kind: "lemma";
  entry: MorphemeEntry | null;
  koreanLemma: string;
  koreanPos: number;
  irregular: IrregularType | null;
  auxTokens: readonly RuntimeHaruToken[];
  adverbialCopulaNi?: true;
  prefix?: RenderPlan | string;
  connective?: string | null;
  teConnectiveBoundaryChoice?: TeConnectiveBoundaryChoice | null;
  renyouChuushiRole?: TeFormConnectiveRole;
  suffix?: string;
  sfp?: string | null;
  terminalSfp?: SfpNode | null;
  voice?: Voice;
  passiveClass?: PassiveClass;
  forcePassive?: boolean;
  sahenCompound?: boolean;
  sahenNoun?: string | null;
  formalOverride?: boolean | null;
  negationChainDepth?: number;
  jpDictForm?: string | null;
  verbConjType?: number | null;
  isImperative?: boolean;
  teIruResultative?: boolean;
  teIruContractToPast?: boolean;
  adversativePassive?: boolean;
  stemDerivation?: StemDerivation;
  adversativePassiveAgentPromoted?: boolean;
  adversativePassiveBaseLemma?: string;
  adversativePassiveBaseIrregular?: IrregularType | null;
}

export interface AttributiveRealization {
  kind: "attributive";
  koreanLemma: string;
  irregular: IrregularType | null;
  koreanPos: number;
  auxTokens: readonly RuntimeHaruToken[];
  contentToken: RuntimeHaruToken;
  prefix?: string;
  nominalization?: boolean;
  sahenNoun?: string | null;
  headNounToken?: RuntimeHaruToken | null;
  plainVerbEnding?: string | null;
  voice?: Voice;
  passiveClass?: PassiveClass;
  tailLemmaMode?: boolean;
  tameReasonHead?: boolean;
  tokoroResultHead?: boolean;
  tokoroTemporalDeHead?: boolean;
  koroTemporalNiHead?: boolean;
  tokoroConcessiveDeHead?: boolean;
  teIruContractToPast?: boolean;
  nominalAttributiveEvidence?: "predicate_nominalized" | "teki_derivation";
  stemDerivation?: StemDerivation;
}

export type { FixedTextPlan, NumeralPlan, NumericBasePayload, NumericStemBase } from "./numeric-base.js";

export interface RegisterTextPlan {
  kind: "registerText";
  casual: string;
  formal: string;
  koreanPos?: number | null;
}

export interface LexicalParticleAdverbialPlan {
  kind: "lexicalParticleAdverbial";
  adverbialKind: string;
  particle: "に" | string;
  korean: string;
  koreanPos?: number | null;
  sourceKorean?: string | null;
  projection?: {
    kind: "nominalAdverbial";
    suffix: string;
  } | null;
}

export interface StructuralRelationSequenceTextPart {
  kind: "structuralText";
  text: string;
  koreanPos?: number | null;
  sourceSpan?: SourceTokenSpan | null;
}

export type StructuralRelationSequencePart = RenderPlan | StructuralRelationSequenceTextPart;

export interface StructuralRelationSequencePlan {
  kind: "structuralRelationSequence";
  parts: readonly StructuralRelationSequencePart[];
  koreanPos: number;
}

export interface KaParallelPlan {
  kind: "kaParallel";
  relationKind: "choice" | "question_content";
  itemPlans: readonly RenderPlan[];
  itemSourceSpans?: readonly (SourceTokenSpan | null)[];
  markerSourceSpans?: readonly (SourceTokenSpan | null)[];
  separator: "comma" | "space";
  terminalPunctuation: "question" | "exclamation" | "period" | null;
  terminalPunctuationRun: readonly ("question" | "exclamation" | "period")[];
  suffix?: RenderPlan | string;
  koreanPos?: number | null;
}

export interface KaParallelNegativeAlternativePlan {
  kind: "kaParallelNegativeAlternative";
  koreanPos?: number | null;
}

export interface NariParallelPlan {
  kind: "nariParallel";
  itemKind: "nominal" | "predicate";
  itemKinds?: readonly ("nominal" | "predicate")[];
  itemPlans: readonly RenderPlan[];
  itemSourceSpans?: readonly (SourceTokenSpan | null)[];
  markerSourceSpans?: readonly (SourceTokenSpan | null)[];
  separator: "comma" | "space";
  itemSeparatorTexts?: readonly string[];
  itemSeparatorSourceSpans?: readonly (SourceTokenSpan | null)[];
  trailingParticle?: ParticleKey | null;
  trailingParticleSourceSpan?: SourceTokenSpan | null;
  nominalListingStyle?: "toka";
  nominalListingClosure?: "closed" | "continues";
  koreanPos?: number | null;
}

export interface FunctionalChainResidualPlan {
  kind: "functionalChainResidual";
  koreanLemma: string;
  irregular: IrregularType | null;
  koreanPos: number;
  chunks: readonly (readonly RuntimeHaruToken[])[];
  question: boolean;
  jpDictForm?: string | null;
  verbConjType?: number | null;
  forcePassive?: boolean;
}

export interface HybridPostAuxPayload {
  content: RenderPlan;
  middleText: string;
  tailLemma: string;
  tailKoreanPos: number;
  tailIrregular: IrregularType | null;
  tailAuxTokens: readonly RuntimeHaruToken[];
  modalKind?: "kamo_shirenai" | null;
  modalPolite?: boolean;
  modalPast?: boolean;
  koreanPos?: number | null;
}

export type HybridPostAuxPlan =
  | { kind: "hybridPostAux"; payload: HybridPostAuxPayload }
  | ({ kind: "hybridPostAux" } & HybridPostAuxPayload);

export interface PronominalNoNominalPlan {
  kind: "pronominalNoNominal";
  casualNoun?: "geo" | "geot" | null;
  koreanPos?: number | null;
}

export type DiscourseConnectiveId =
  | "demonstrative_tame_discourse";

export interface DiscourseConnectivePayload {
  id: DiscourseConnectiveId;
  demonstrative?: "sono" | "kono" | null;
  koreanPos?: number | null;
}

export type DiscourseConnectivePlan =
  | { kind: "discourseConnective"; payload: DiscourseConnectivePayload }
  | ({ kind: "discourseConnective" } & DiscourseConnectivePayload);

export interface SimilePredicatePayload {
  entry?: MorphemeEntry | null;
  koreanLemma: string;
  irregular: IrregularType | null;
  koreanPos: number;
  auxTokens: readonly RuntimeHaruToken[];
  contentToken: RuntimeHaruToken;
  voice?: Voice;
  passiveClass?: PassiveClass;
  verbConjType?: number | null;
  jpDictForm?: string | null;
  sahenCompound?: boolean;
  sahenNoun?: string | null;
}

export interface YoudaModalityPayload extends SimilePredicatePayload {
  mode: "predicative" | "attributive";
  modalAux: readonly RuntimeHaruToken[];
  connective?: string | null;
  sfp?: string | null;
}

export type YoudaModalityPlan =
  | { kind: "youdaModality"; payload: YoudaModalityPayload }
  | ({ kind: "youdaModality" } & YoudaModalityPayload);

export interface ReasonBecausePayload {
  entry?: MorphemeEntry | null;
  koreanLemma: string;
  irregular: IrregularType | null;
  auxTokens: readonly RuntimeHaruToken[];
  koreanPos: number;
  projection?: "adverbial" | "nominal";
  voice?: Voice;
  passiveClass?: PassiveClass;
  verbConjType?: number | null;
  jpDictForm?: string | null;
  sahenCompound?: boolean;
  sahenNoun?: string | null;
  negative?: boolean;
  past?: boolean;
  polarityTransition?: "became_negative";
  predicateRoot?: TailRoot;
  predicateHostProjection?: PredicateHeadTailChainHostProjection;
}

export type ReasonBecausePlan =
  | { kind: "reasonBecause"; payload: ReasonBecausePayload }
  | { kind: "reasonBecause"; entry?: MorphemeEntry | null; koreanLemma: string; irregular: IrregularType | null; auxTokens: readonly RuntimeHaruToken[]; koreanPos: number; projection?: "adverbial" | "nominal"; voice?: Voice; passiveClass?: PassiveClass; verbConjType?: number | null; jpDictForm?: string | null; sahenCompound?: boolean; sahenNoun?: string | null; negative?: boolean; past?: boolean; polarityTransition?: "became_negative"; predicateRoot?: TailRoot; predicateHostProjection?: PredicateHeadTailChainHostProjection };

export interface NominalConnectiveScopePayload {
  content: RenderPlan;
  connectiveKind: "not_limited_to" | "contrast_topic" | "parallel_appositive" | "concession";
  koreanPos?: number | null;
}

export type NominalConnectiveScopePlan =
  | { kind: "nominalConnectiveScope"; payload: NominalConnectiveScopePayload }
  | { kind: "nominalConnectiveScope"; content: RenderPlan; connectiveKind: NominalConnectiveScopePayload["connectiveKind"]; koreanPos?: number | null };

export interface NominalDemoAruPayload {
  content: RenderPlan;
  auxTokens: readonly RuntimeHaruToken[];
  mode: "terminal" | "connective" | "renyou" | "attributive";
  connective?: string | null;
  koreanPos?: number | null;
}

export type NominalDemoAruPlan =
  | { kind: "nominalDemoAru"; payload: NominalDemoAruPayload }
  | { kind: "nominalDemoAru"; content: RenderPlan; auxTokens: readonly RuntimeHaruToken[]; mode: NominalDemoAruPayload["mode"]; connective?: string | null; koreanPos?: number | null };

export interface QuoteHostReportingPassivePlan {
  kind: "quoteHostReportingPassive";
  lemma: "알려지다" | "생각되다" | "보이다" | "불리다" | "여겨지다";
  resultativeState: boolean;
  hasTeIru: boolean;
  past: boolean;
  negative: boolean;
  koreanPos?: number | null;
  root?: TailRoot;
  stateStemTokens?: readonly RuntimeHaruToken[];
  stateAuxTokens?: readonly RuntimeHaruToken[];
}

export interface QuoteCognitionHostPlan {
  kind: "quoteCognitionHost";
  host: "wakaru";
  mode: "attributive_potential";
  koreanPos?: number | null;
}

export interface ConjectureThoughtQuotePlan {
  kind: "conjectureThoughtQuote";
  root: TailRoot;
  hostProjection?: PredicateHeadTailChainHostProjection;
  koreanPos?: number | null;
}

export type GiveRequestKind = "chodai" | "kudasai" | "kure";

export interface GiveRequestPlan {
  kind: "giveRequest";
  base: RenderPlan;
  koreanLemma: string;
  requestKind: GiveRequestKind;
}

export interface PredicateScopePlan {
  kind: "predicateScope";
  base: RenderPlan;
  ending: string;
  suffix?: string;
}

export interface PredicateNominalScopePlan {
  kind: "predicateNominalScope";
  base: RenderPlan;
  suffix?: string;
}

export type PredicateScopeCarrierProjection =
  | {
    kind: "predicateScope";
    base: RenderPlan;
    ending: string;
    suffix?: string;
  }
  | {
    kind: "predicateNominalScope";
    base: RenderPlan;
    suffix?: string;
  }
  | {
    kind: "direct";
    base: RenderPlan;
  };

export interface PredicateScopeCarrierPlan {
  kind: "predicateScopeCarrier";
  projection: PredicateScopeCarrierProjection;
  suffix?: RenderPlan | string;
  koreanPos?: number | null;
  connectiveRoleSource?: "semantic" | null;
}

export interface PlanTextSource {
  kind?: string | null;
  text?: string | null;
  note?: string | null;
  jpSurface?: string | null;
  jpDictionaryForm?: string | null;
  korean?: string | null;
  koreanPos?: number | null;
  matchReason?: string | null;
}

export interface NodaPlan {
  kind: "noda";
  content?: RenderPlan;
  prefix?: RenderPlan | string;
  copulaAux?: readonly RuntimeHaruToken[];
  connective?: string | null;
  sfp?: string | null;
}

export interface CopulaPredicatePlan {
  kind: "copulaPredicate";
  polarity?: "affirmative" | "negative";
  auxTokens?: readonly AuxToken[];
  pastConnective?: string | null;
  politeConnective?: string | null;
  politeFormalConnective?: string | null;
  base?: RenderPlan;
  koreanLemma?: string;
  entry?: MorphemeEntry | null;
  irregular?: IrregularType | null;
  past?: boolean;
  formal?: boolean;
  polite?: boolean;
  jpPos?: number;
  additiveMo?: boolean;
  conditionalNara?: boolean;
  modalKind?: "kamo_shirenai" | null;
  modalPolite?: boolean;
  modalPast?: boolean;
  followKind?: "conditional" | "contrastive" | "causal" | null;
  conjecture?: boolean;
  conjectureQuestion?: boolean;
  focusParticle?: "は" | "も" | null;
  focusTailKind?: "negative" | "positive" | null;
  focusPolite?: boolean;
  focusPast?: boolean;
  connective?: string | null;
  sfp?: string | null;
  terminalSfp?: SfpNode | null;
  contentTokens?: readonly RuntimeHaruToken[];
  negationBridgeTokens?: readonly RuntimeHaruToken[];
  negationTailTokens?: readonly RuntimeHaruToken[];
  modalTokens?: readonly RuntimeHaruToken[];
  conjectureTokens?: readonly RuntimeHaruToken[];
  followTokens?: readonly RuntimeHaruToken[];
  focusParticleTokens?: readonly RuntimeHaruToken[];
  focusTailTokens?: readonly RuntimeHaruToken[];
}

export interface ParticleSourceProvenance {
  readonly sourceSpan?: SourceTokenSpan | null;
  readonly unit?: TranslationUnit | null;
}

export interface ParticleizedLemmaPlan {
  kind: "particleizedLemma";
  koreanLemma: string;
  koreanPos: number;
  irregular: IrregularType | null;
  particle: ParticleKey;
  register?: "none" | "respect";
  suffix?: string;
  particleSource?: ParticleSourceProvenance;
}

export interface ParticleizedContentPlan {
  kind: "particleizedContent";
  content: RenderPlan;
  particle: ParticleKey;
  register?: "none" | "respect";
  koreanPos?: number | null;
  subjectParticleStem?: string | null;
  particleSource?: ParticleSourceProvenance;
}

export interface ConjugatedLemmaPlan {
  kind: "conjugatedLemma";
  koreanLemma: string;
  irregular: IrregularType | null;
  koreanPos: number;
  ending: string;
  adverbial?: string;
  prefix?: string;
  auxTokens?: readonly RuntimeHaruToken[];
  particle?: ParticleKey;
  particleSource?: ParticleSourceProvenance;
  suffix?: string;
  jpDictForm?: string | null;
  verbConjType?: number | null;
  voice?: Voice;
}

export type CompoundNominalSuffixPayload =
  | {
    kind: "no_dewa_nai";
    polite: boolean;
    past: boolean;
    connective: boolean;
    additiveMo: boolean;
    conditionalNara: boolean;
    question?: boolean;
    auxTokens?: readonly AuxToken[];
    modalKind?: "kamo_shirenai" | null;
    modalPolite?: boolean;
    modalPast?: boolean;
    followKind?: "conditional" | "contrastive" | "causal" | "reason" | "listing" | "quotative" | null;
    casualNounHead?: "geo" | "ge" | null;
    confirm?: boolean;
    confirmRoleCatNyaCount?: number;
    sfp?: string | null;
    connectiveEnding?: string | null;
    koreanPos?: number | null;
  }
  | {
    kind: "no_copula_chain";
    chainKind: string;
    past: boolean;
    polite: boolean;
    question: boolean;
    koreanPos?: number | null;
  }
  | {
    kind: "kamo_modal";
    modalKind: "conjecture" | "emphasis";
    emphasisKind?: string | null;
    emphasisPast?: boolean;
    modalPolite: boolean;
    modalPast: boolean;
    koreanPos?: number | null;
  }
  | {
    kind: "kamo_shirenai";
    modalPolite: boolean;
    modalPast: boolean;
    koreanPos?: number | null;
  }
  | {
    kind: "noda_sfp";
    casualSfp?: string | null;
    formalSfp?: string | null;
    koreanPos?: number | null;
  };

export interface CompoundNominalSuffixPlan {
  kind: "compoundNominalSuffix";
  payload: CompoundNominalSuffixPayload;
}

export interface KeijoujiAdverbPlan {
  kind: "keijoujiAdverb";
  stem: string;
  mode: "하게" | "으로/로" | "해서";
}

export interface KeijoujiStatePlan {
  kind: "keijoujiState";
  stem: string;
}

type LegacySurfaceCompositionPlanFields = {
  kind: "legacySurfaceComposition";
  koreanPos: number;
  prefix?: RenderPlan | string | null;
  suffix?: RenderPlan | string | null;
  prefixSource?: PlanTextSource | null;
  suffixSource?: PlanTextSource | null;
  prefixCarrierAuxiliaryLemma?: string | null;
  rewritePrefixOnLemmaReplace?: boolean;
  rewriteSuffixOnLemmaReplace?: boolean;
  rewritePrefixOnConnectiveReplace?: boolean;
  rewriteSuffixOnConnectiveReplace?: boolean;
  connectiveRoleSource?: "semantic";
};

export type LegacySurfaceCompositionPlan =
  | (LegacySurfaceCompositionPlanFields & { text: string; korean?: string })
  | (LegacySurfaceCompositionPlanFields & { korean: string; text?: string });

export type LegacySurfaceCompositionProducer =
  | "assembler"
  | "candidate_compound"
  | "content_resolver"
  | "content_resolver_runtime"
  | "deferred_commitment"
  | "pattern_runtime"
  | "postaux_pattern"
  | "rule_pre_entry"
  | "rule_tail_nominalization"
  | "semantic_frame"
  | "special_content_phase"
  | "structural_relation";

type LegacySurfaceCompositionInit =
  | (Omit<LegacySurfaceCompositionPlanFields, "kind"> & { text: string; korean?: string })
  | (Omit<LegacySurfaceCompositionPlanFields, "kind"> & { korean: string; text?: string });

export function legacySurfaceCompositionPlan(
  producer: LegacySurfaceCompositionProducer,
  fields: LegacySurfaceCompositionInit
): LegacySurfaceCompositionPlan {
  return { kind: "legacySurfaceComposition", ...fields };
}

export interface SemanticCarrierPredicatePlan {
  kind: "semanticCarrierPredicate";
  specId: string;
  carrierToken: RuntimeHaruToken;
  polarity: "affirmative" | "negative";
  prefix: string;
  koreanPos: typeof 동사 | typeof 형용사;
  tailKind: "connective" | "tame" | "nominal_ga" | "terminal";
  root: TailRoot;
}

export interface WakeExplanationPayload {
  prefix: RenderPlan;
  headKind: "settlement" | "deictic_reason" | "register_noun";
  tailKind: "wakede" | "wakedakara" | "wakeda";
  auxTokens?: readonly RuntimeHaruToken[];
  connectiveEnding?: string | null;
}

type WakeExplanationPlanPayloadShape = {
  kind: "wakeExplanation";
  payload: WakeExplanationPayload;
};

type WakeExplanationPlanFlatShape = {
  kind: "wakeExplanation";
  prefix: RenderPlan;
  headKind: "settlement" | "deictic_reason" | "register_noun";
  tailKind: "wakede" | "wakedakara" | "wakeda";
  auxTokens?: readonly RuntimeHaruToken[];
  connectiveEnding?: string | null;
};

export type WakeExplanationPlan = WakeExplanationPlanPayloadShape | WakeExplanationPlanFlatShape;

export type RenderPlan =
  | LemmaRealization
  | AttributiveRealization
  | HeadTailChainRenderPlan
  | NumeralPlan
  | FixedTextPlan
  | RegisterTextPlan
  | LexicalParticleAdverbialPlan
  | StructuralRelationSequencePlan
  | KaParallelPlan
  | KaParallelNegativeAlternativePlan
  | NariParallelPlan
  | FunctionalChainResidualPlan
  | HybridPostAuxPlan
  | PronominalNoNominalPlan
  | DiscourseConnectivePlan
  | YoudaModalityPlan
  | ReasonBecausePlan
  | NominalConnectiveScopePlan
  | NominalDemoAruPlan
  | QuoteHostReportingPassivePlan
  | QuoteCognitionHostPlan
  | ConjectureThoughtQuotePlan
  | GiveRequestPlan
  | PredicateScopePlan
  | PredicateNominalScopePlan
  | PredicateScopeCarrierPlan
  | NodaPlan
  | CopulaPredicatePlan
  | ParticleizedLemmaPlan
  | ParticleizedContentPlan
  | ConjugatedLemmaPlan
  | CompoundNominalSuffixPlan
  | KeijoujiAdverbPlan
  | KeijoujiStatePlan
  | LegacySurfaceCompositionPlan
  | SemanticCarrierPredicatePlan
  | WakeExplanationPlan;

export function spanLocalRenderPlanNode<T extends RenderPlan | null | undefined>(plan: T): T {
  if (plan === null || plan === undefined) {
    return plan;
  }
  return { ...plan };
}

export function isHeadTailChainRenderPlan(plan: RenderPlan | null | undefined): plan is HeadTailChainRenderPlan {
  return plan?.kind === "headTailChain";
}

export function isPredicateHeadTailChainRenderPlan(
  plan: RenderPlan | null | undefined
): plan is PredicateHeadTailChainRenderPlan {
  return plan?.kind === "headTailChain" && plan.realization.kind === "predicate";
}

export function hasClauseRole(
  plan: RenderPlan | null | undefined
): plan is HeadTailChainRenderPlan & { clauseRole: HeadTailClauseRole } {
  return plan?.kind === "headTailChain" &&
    (plan as { clauseRole?: HeadTailClauseRole }).clauseRole !== undefined;
}

export function isNominalHeadTailChainRenderPlan(
  plan: RenderPlan | null | undefined
): plan is NominalHeadTailChainPlan {
  return plan?.kind === "headTailChain" && plan.realization.kind === "nominal";
}

export function renderPlanStartsWithShortNegation(plan: RenderPlan | null | undefined): boolean {
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return tailNodeStartsWithShortNegation(plan.realization.root.tail);
  }
  if (plan?.kind === "attributive") {
    return plan.koreanPos === 동사 &&
      plan.tokoroResultHead === true &&
      auxTokensStartWithNegative(plan.auxTokens);
  }
  if (
    (plan?.kind === "lemma" || plan?.kind === "conjugatedLemma") &&
    "auxTokens" in plan &&
    plan.koreanPos === 동사 &&
    "sahenNoun" in plan &&
    plan.sahenNoun !== undefined &&
    plan.sahenNoun !== null &&
    !isPotentialCapabilityLemma(plan.koreanLemma)
  ) {
    return auxTokensStartWithNegative(plan.auxTokens);
  }
  return false;
}

function tailNodeStartsWithShortNegation(tail: TailNode): boolean {
  if (tail.kind === "connective") {
    return tailNodeStartsWithShortNegation(tail.inner);
  }
  return tail.ops.some((op) => (
    op.kind === "negation" &&
    op.chainDepth === 1 &&
    op.preferShortNegation
  ));
}

function auxTokensStartWithNegative(auxTokens: readonly RuntimeHaruToken[]): boolean {
  const first = auxTokens[0];
  return first !== undefined && (first.dictionaryForm === "ない" || first.normalizedForm === "ない");
}

function isPotentialCapabilityLemma(koreanLemma: string): boolean {
  return koreanLemma.endsWith("수 있다") || koreanLemma.endsWith("수 없다");
}

export type NamedRenderPlan =
  | LegacySurfaceCompositionPlan
  | SemanticCarrierPredicatePlan
  | DiscourseConnectivePlan
  | YoudaModalityPlan
  | WakeExplanationPlan;
