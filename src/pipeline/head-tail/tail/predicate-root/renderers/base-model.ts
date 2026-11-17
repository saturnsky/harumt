import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { type RenderedTarget, type SourceInternalBoundaryTarget, type TargetSegment } from "../../../../../types/projection.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { type Warning } from "../../../../../types/warning.js";
import { type ClauseLayout } from "../../../../clause-layout/index.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { type PassiveClass } from "../../../../voice-class.js";
import { type ClauseBoundary } from "../commit.js";
import { isAdversativeConnectiveSurface } from "../connective-render-table.js";
import { type YoudaModalOp, type AspectProjectionPolicy, type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type CannotRefrainIdiomOp, type ConjectureOp, type ConnectiveOp, type DecisionKotoNiSuruIdiomOp, type DegreeIntensifierIdiomOp, type DesiderativeAspectOp, type DesireOp, type ExperienceIdiomOp, type ForbiddenIdiomOp, type InevitableIdiomOp, type MethodYouGaNaiIdiomOp, type MiseruAspectOp, type ModalOp, type NegationFocusParticle, type NegationOp, type NegativeNecessityKotoWaIdiomOp, type NegativeNecessityMadeMoIdiomOp, type NegativeNecessitySumuIdiomOp, type ObligationIdiomOp, type ObligationVariant, type OnlyOptionIdiomOp, type OutcomeKotoNiNaruIdiomOp, type OpSource, type PermissionIdiomOp, type PostverbAuxiliaryOp, type PotentialKotoGaDekiruIdiomOp, type PredicateProjectionCarrierOp, type PredicateQuoteCarrierOp, type PredicateSuffixOp, type ScopeBridgeOp, type ScopeBridgeParticle, type ShortNegationPolicy, type SimpleAspectOp, type StemNode, type SufficiencyConditionalIdiomOp, type TailRoot, type TeEvaluationIdiomOp, type VoiceKind, type VoiceOp, type WakeImpossibleIdiomOp } from "../grammar.js";
import { stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, stemSourcePos0 } from "../inspect.js";

export { stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, stemSourcePos0 };

export interface RenderContext {
  readonly formal: boolean;
  readonly outgoingBoundary?: ClauseBoundary;
  readonly layout?: ClauseLayout;
  readonly lookups: LookupTables;
  readonly precedingNumeralKorean?: string;
}

export interface RenderSuccess {
  readonly ok: true;
  readonly text: string;
  readonly polite: boolean;
  readonly warnings?: readonly Warning[];
  readonly stemPrefixApplied?: boolean;
  readonly rawSourceSurface?: true;
  readonly traced?: readonly TailTraceSegment[];
}

export interface RenderFailure {
  readonly ok: false;
  readonly reason: string;
}

export type RenderOutcome = RenderSuccess | RenderFailure;

export type TailTraceSegmentKind = Extract<TargetSegment["kind"], "lexeme" | "aux" | "modal" | "connective" | "punctuation" | "synthetic">;

export interface TailTraceSegment {
  readonly text: string;
  readonly sourceTokens: readonly RuntimeHaruToken[];
  readonly kind: TailTraceSegmentKind;
  readonly projectionConfidence?: TargetSegment["projectionConfidence"];
  readonly suppressBoundaryAfter?: boolean;
  readonly chainFinalPlaceholder?: true;
  readonly projectedSegments?: readonly TargetSegment[];
}

export interface BaseSourceTrace {
  readonly inputProjectionText: string;
  readonly inputProjectionExtraSourceTokens?: readonly RuntimeHaruToken[];
  readonly carrierPrefixSegments: readonly TailTraceSegment[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
  readonly finalKind?: TailTraceSegmentKind;
}

export interface ChainSourceTrace {
  readonly prefixSegments: readonly TailTraceSegment[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
  readonly finalKind: TailTraceSegmentKind;
}

export function withStemPrefixApplied(result: RenderOutcome): RenderOutcome {
  if (!result.ok) return result;
  return {
    ...result,
    stemPrefixApplied: true
  };
}

export function isTopicOrJaFusionSurfaceToken(token: RuntimeHaruToken): boolean {
  return token.surface === "は" || token.surface === "じゃ";
}

export function splitNegativeNounCopulaSourceTokens(
  tokens: readonly RuntimeHaruToken[]
): {
  readonly carrierTokens: readonly RuntimeHaruToken[];
  readonly finalTokens: readonly RuntimeHaruToken[];
  readonly hasInternalBoundary: boolean;
} {
  const finalStart = tokens.findIndex((token, index) =>
    index > 0 && isNegativeNounCopulaFinalStartToken(token)
  );
  if (finalStart > 0) {
    return {
      carrierTokens: tokens.slice(0, finalStart),
      finalTokens: tokens.slice(finalStart),
      hasInternalBoundary: true
    };
  }
  if (tokens.length <= 1) {
    return {
      carrierTokens: tokens,
      finalTokens: tokens,
      hasInternalBoundary: false
    };
  }
  return {
    carrierTokens: tokens.slice(0, -1),
    finalTokens: tokens.slice(-1),
    hasInternalBoundary: false
  };
}

export type HostProjectionFinalSplit = "negative_nai" | "last_token" | "none";

function splitHostProjectionFinalTokens(
  tokens: readonly RuntimeHaruToken[],
  splitFinal: HostProjectionFinalSplit
): {
  readonly carrierTokens: readonly RuntimeHaruToken[];
  readonly finalTokens: readonly RuntimeHaruToken[];
  readonly hasInternalBoundary: boolean;
} {
  if (splitFinal === "negative_nai") {
    return splitNegativeNounCopulaSourceTokens(tokens);
  }
  if (splitFinal === "last_token" && tokens.length > 1) {
    return {
      carrierTokens: tokens.slice(0, -1),
      finalTokens: tokens.slice(-1),
      hasInternalBoundary: true
    };
  }
  return { carrierTokens: tokens, finalTokens: tokens, hasInternalBoundary: false };
}

export function hostProjectionSourceTrace(opts: {
  readonly hostText: string;
  readonly inputPrefix: string;
  readonly basePrefix: string;
  readonly sourceTokens: readonly RuntimeHaruToken[];
  readonly splitFinal?: HostProjectionFinalSplit;
  readonly finalKind?: TailTraceSegmentKind;
  readonly carrierKind?: TailTraceSegmentKind;
}): BaseSourceTrace | undefined {
  if (
    opts.sourceTokens.length === 0 ||
    !opts.basePrefix.startsWith(opts.hostText) ||
    !opts.hostText.startsWith(opts.inputPrefix)
  ) {
    return undefined;
  }
  const split = splitHostProjectionFinalTokens(opts.sourceTokens, opts.splitFinal ?? "none");
  const carrierText = opts.basePrefix.slice(opts.hostText.length);
  const carrierPrefixSegments: TailTraceSegment[] = carrierText.length === 0
    ? []
    : /^\s+$/u.test(carrierText)
      ? [{
        text: carrierText,
        sourceTokens: [],
        kind: "punctuation",
        projectionConfidence: "exact"
      }]
      : [{
        text: carrierText,
        sourceTokens: split.carrierTokens,
        kind: opts.carrierKind ?? "modal",
        projectionConfidence: "semantic",
        suppressBoundaryAfter: !split.hasInternalBoundary
      }];
  return {
    inputProjectionText: opts.hostText.slice(opts.inputPrefix.length),
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: opts.finalKind ?? "modal"
  };
}

export function stemFusionSourceTrace(
  relativePrefix: string,
  sourceTokens: readonly RuntimeHaruToken[],
  opts: {
    readonly splitFinal?: HostProjectionFinalSplit;
    readonly finalKind?: TailTraceSegmentKind;
    readonly carrierKind?: TailTraceSegmentKind;
  } = {}
): BaseSourceTrace | undefined {
  const trimmed = relativePrefix.trimEnd();
  const spaceIndex = trimmed.indexOf(" ");
  const hostWord = spaceIndex < 0 ? trimmed : trimmed.slice(0, spaceIndex);
  if (hostWord.length === 0) {
    return undefined;
  }
  return hostProjectionSourceTrace({
    hostText: hostWord,
    inputPrefix: "",
    basePrefix: relativePrefix,
    sourceTokens,
    ...opts
  });
}

function isNegativeNounCopulaFinalStartToken(token: RuntimeHaruToken): boolean {
  return token.dictionaryForm === "ない" ||
    token.dictionaryForm === "無い" ||
    token.normalizedForm === "無い" ||
    token.dictionaryForm === "ある" ||
    token.dictionaryForm === "有る" ||
    token.normalizedForm === "有る";
}

export function scopeCarrierCanPreserveSourcePoliteness(
  base: KoreanPredicateBase,
  connective: ConnectiveOp
): boolean {
  if (
    base.policy?.kind !== "scope_carrier" ||
    base.policy.connectiveSourcePoliteness !== "preserve_when_supported"
  ) {
    return false;
  }
  return isAdversativeConnectiveSurface(connective.surface) ||
    connective.surface === "から" ||
    connective.surface === "ので";
}

export function opCarriesTerminalRolePoliteness(op: AuxOpNode): boolean {
  if (op.kind === "modal" || op.kind === "conjecture" || op.kind === "scopeBridge") {
    return op.polite;
  }
  if (op.kind === "predicateProjectionCarrier") {
    return op.polite === true;
  }
  if (op.kind === "postverbAuxiliary") {
    return op.auxiliary.polite === true;
  }
  if (op.kind === "idiom") {
    return ("polite" in op && op.polite === true);
  }
  return false;
}

export function ensureQuestionPunctuation(text: string): string {
  return text.endsWith("?") ? text : `${text}?`;
}

export function lastLayerSource(layer: AuxLayerNode): OpSource | null {
  for (let i = layer.ops.length - 1; i >= 0; i -= 1) {
    const op = layer.ops[i];
    if (op !== undefined) return op.source;
  }
  return layer.stem.source;
}

type FinalIdiom =
  | {
      readonly kind: "conjecture";
      readonly conjecturePolite: boolean;
      readonly projection?: "nominalized";
      readonly sourceLemma?: string;
      readonly sourceIrregular?: IrregularType | null;
      readonly sourceNegation?: "short" | "long";
      readonly sourceNegationInability?: true;
    };

export type KoreanFinalForm =
  | { readonly kind: "lemma"; readonly lemma: string; readonly irregular: IrregularType | null; readonly isVerb: boolean; readonly idiom?: FinalIdiom; readonly copular?: true }
  | { readonly kind: "boundNounCopula"; readonly nounSurface: string }
  | {
    readonly kind: "nounCopula";
    readonly nounSurface: string;
    readonly isBoundNoun: boolean;
    readonly allomorphHost?: string;
    readonly adverbialNominalFallback?: true;
  }
  | { readonly kind: "negativeNounCopula"; readonly nounSurface: string; readonly chainDepth: number; readonly allomorphHost?: string };

type NounCopulaFinalForm =
  | Extract<KoreanFinalForm, { readonly kind: "nounCopula" }>
  | Extract<KoreanFinalForm, { readonly kind: "negativeNounCopula" }>;

export function predicateBasePolicyAllomorphHost(base: KoreanPredicateBase): string {
  const policy = base.policy;
  if (policy?.kind === "noun_copula_interop") {
    return policy.allomorphHost ?? policy.nounSurface;
  }
  if (policy?.kind === "negative_noun_copula_interop") {
    return policy.allomorphHost ?? policy.nounSurface;
  }
  return base.prefix;
}

export function nounCopulaRealizedAllomorphHost(final: KoreanFinalForm, realizedSurface: string): string {
  if (final.kind === "nounCopula" || final.kind === "negativeNounCopula") {
    return final.allomorphHost ?? realizedSurface;
  }
  return realizedSurface;
}

export function nounCopulaFinalAllomorphHost(final: KoreanFinalForm): string {
  if (final.kind === "nounCopula" || final.kind === "negativeNounCopula") {
    return final.allomorphHost ?? final.nounSurface;
  }
  return final.kind === "lemma" ? final.lemma : final.nounSurface;
}

export interface KoreanPredicateBase {
  readonly prefix: string;
  readonly final: KoreanFinalForm;
  readonly policy?: PredicateBasePolicy;
  readonly capabilities?: PredicateBaseCapabilities;
}

export interface PredicateBaseCapabilities {
  readonly prohibitionHost?: "action";
  readonly negativeClosure?: "source_polarity";
}

export interface NounCopulaPredicateBase extends KoreanPredicateBase {
  readonly final: NounCopulaFinalForm;
}

type KoreanLemmaFinalForm = Extract<KoreanFinalForm, { readonly kind: "lemma" }>;

export interface KoreanLemmaPredicateBase extends KoreanPredicateBase {
  readonly final: KoreanLemmaFinalForm;
}

export type PredicateBasePolicy =
  | {
    readonly kind: "causative";
    readonly sourceLemma: string;
    readonly sourceIrregular: IrregularType | null;
  }
  | {
    readonly kind: "benefactive";
    readonly family: BenefactiveAspectOp["benefactive"]["kind"];
    readonly potential: boolean;
    readonly desireMode: "generic" | "request" | "unsupported";
    readonly lexicalTailAbsorptionKind?: BenefactiveAspectOp["benefactive"]["lexicalTailAbsorptionKind"];
    readonly scopeBridgeNegativeAttributive?: "completed";
    readonly requestComplementBase?: KoreanLemmaPredicateBase;
  }
  | {
    readonly kind: "te_iru_negative";
    readonly mode: "completion" | "inability" | "long_negation";
    readonly stemPrefix?: string;
    readonly stemLemma: string;
    readonly stemIrregular: IrregularType | null;
    readonly completionAttributiveProjection?: "short" | "long";
    readonly negativeFocusParticle?: NegationFocusParticle;
  }
  | {
    readonly kind: "completion";
    readonly stemPrefix?: string;
    readonly stemLemma: string;
    readonly stemIrregular: IrregularType | null;
    readonly shortNegationPolicy?: ShortNegationPolicy;
    readonly teIruNegativeStrategy: "negative_completion" | "preserve_aspect";
    readonly followingPassiveStrategy?: "completion_causative";
  }
  | {
    readonly kind: "te_iru_contract_to_past";
  }
  | {
    readonly kind: "te_iru_attributive_contraction";
    readonly stemLemma: string;
    readonly stemIrregular: IrregularType | null;
  }
  | {
    readonly kind: "completion_potential";
    readonly completionAdverb?: string;
    readonly stemPrefix?: string;
    readonly stemLemma: string;
    readonly stemIrregular: IrregularType | null;
    readonly shortNegationPolicy?: ShortNegationPolicy;
  }
  | {
    readonly kind: "accustomed_aspect_projection";
  }
  | {
    readonly kind: "potential";
    readonly stemLemma?: string;
    readonly stemIrregular?: IrregularType | null;
    readonly negativeLowering?: "mothada_preferred" | "su_eopda";
  }
  | { readonly kind: "lexical_potential" }
  | {
    readonly kind: "desire";
    readonly nodaConnectiveFlatten: true;
    readonly requestComplementBase?: KoreanLemmaPredicateBase;
    readonly requestComplementMode?: "prohibition";
  }
  | {
    readonly kind: "likeness";
    readonly nodaConnectiveFlatten?: "ka_no_you";
    readonly potentialObjectAttributive?: {
      readonly stemLemma: string;
      readonly stemIrregular: IrregularType | null;
      readonly stemKind: "verb" | "adj";
    };
    readonly attributiveLexicalization?: KoreanLemmaPredicateBase;
    readonly adverbialLexicalization?: KoreanLemmaPredicateBase;
  }
  | {
    readonly kind: "degree_intensifier";
    readonly nodeReasonPastBehavior: "carry";
  }
  | {
    readonly kind: "obligation";
    readonly variant: ObligationVariant;
    readonly polarity: "affirmative" | "negative";
    readonly stemLemma: string;
    readonly stemIrregular: IrregularType | null;
    readonly isVerb: boolean;
  }
  | {
    readonly kind: "voice";
    readonly voice: VoiceKind;
    readonly passiveClass?: PassiveClass;
    readonly adversativePassive?: boolean;
    readonly adversativePassiveAgentPromoted?: boolean;
    readonly adversativePassiveBaseLemma?: string;
    readonly adversativePassiveBaseIrregular?: IrregularType | null;
    readonly reportingPassive?: boolean;
  }
  | {
    readonly kind: "scope_carrier";
    readonly carrier: "noda" | "hazu" | "wake" | "tokoro" | "tsumori" | "mai" | "mono";
    readonly nounSurface: string;
    readonly hostPrefix?: string;
    readonly style?: "emphasis" | "assertive_jya";
    readonly connectiveSourcePoliteness?: "preserve_when_supported";
  }
  | {
    readonly kind: "reporting";
    readonly family: "souda_hearsay";
  }
  | {
    readonly kind: "quoted_proposition";
    readonly attributive: string;
    readonly attributiveQuote?: {
      readonly prefix: string;
      readonly realizesInterrogativeMood: boolean;
    };
  }
  | {
    readonly kind: "make_state_change";
  }
  | {
    readonly kind: "noun_copula_interop";
    readonly nounSurface: string;
    readonly hostPrefix: string;
    readonly isBoundNoun: boolean;
    readonly conjectureHostPast?: boolean;
    readonly allomorphHost?: string;
    readonly zeroCopula?: boolean;
  }
  | {
    readonly kind: "scope_bridge_potential_host";
    readonly particle: NonNullable<ScopeBridgeParticle>;
  }
  | {
    readonly kind: "negative_noun_copula_interop";
    readonly nounSurface: string;
    readonly conjectureSubject: string;
    readonly conjectureHostPast?: boolean;
    readonly allomorphHost?: string;
  };

export type ScopeCarrierPolicy = Extract<PredicateBasePolicy, { readonly kind: "scope_carrier" }>;

export type ScopeCarrierKind = ScopeCarrierPolicy["carrier"];

export type ScopeCarrierStyle = NonNullable<ScopeCarrierPolicy["style"]>;

export type LemmaPredicateChain =
  | { readonly kind: "base"; readonly base: KoreanLemmaPredicateBase }
  | {
    readonly kind: "negated";
    readonly host: LemmaPredicateChain;
    readonly finalIsVerb: boolean;
    readonly focusParticle?: NegationFocusParticle;
    readonly inability?: true;
  };

export interface NegationLoweringOptions {
  readonly firstNegationFinalIsVerb?: boolean;
  readonly firstNegationFocusParticle?: NegationFocusParticle;
  readonly firstNegationInability?: true;
}

export type FinalNegationLoweringPolicy =
  | "potential_idiom"
  | "completion_potential"
  | "te_iru_negative_completion"
  | "te_iru_negative_inability"
  | "te_iru_negative_long_negation";

export interface PassiveStemOptions {
  readonly sahenCompound?: boolean;
  readonly sahenNoun?: string;
  readonly passiveClass?: PassiveClass;
}

export function likenessAttributiveLexicalizationBase(
  modal: YoudaModalOp,
  hostAttr: string
): KoreanLemmaPredicateBase | undefined {
  return modal.form === "youda" && modal.terminal === "attributive_na"
    ? {
      prefix: `${hostAttr} `,
      final: { kind: "lemma", lemma: "듯하다", irregular: null, isVerb: false }
    }
    : undefined;
}

export function policyWithPrependedHostPrefix(
  policy: PredicateBasePolicy | undefined,
  prepended: string
): PredicateBasePolicy | undefined {
  if (policy === undefined || prepended.length === 0) {
    return policy;
  }
  if (policy.kind === "noun_copula_interop") {
    return { ...policy, hostPrefix: `${prepended}${policy.hostPrefix}` };
  }
  if (policy.kind === "scope_carrier" && policy.hostPrefix !== undefined) {
    return { ...policy, hostPrefix: `${prepended}${policy.hostPrefix}` };
  }
  if (policy.kind === "likeness") {
    const { attributiveLexicalization, adverbialLexicalization } = policy;
    return {
      ...policy,
      ...(attributiveLexicalization === undefined ? {} : {
        attributiveLexicalization: {
          ...attributiveLexicalization,
          prefix: `${prepended}${attributiveLexicalization.prefix}`
        }
      }),
      ...(adverbialLexicalization === undefined ? {} : {
        adverbialLexicalization: {
          ...adverbialLexicalization,
          prefix: `${prepended}${adverbialLexicalization.prefix}`
        }
      })
    };
  }
  return policy;
}

export function lemmaPredicateBase(base: KoreanPredicateBase): KoreanLemmaPredicateBase | null {
  if (base.final.kind !== "lemma") return null;
  return { ...base, final: base.final };
}

function predicateActsAsVerbForNegationHost(node: LemmaPredicateChain): boolean {
  if (node.kind === "negated") {
    return false;
  }
  return node.base.final.isVerb && node.base.final.lemma !== "않다";
}

function negatePredicate(
  node: LemmaPredicateChain,
  finalIsVerbOverride?: boolean,
  focusParticle?: NegationFocusParticle,
  inability?: true,
): LemmaPredicateChain {
  return {
    kind: "negated",
    host: node,
    finalIsVerb: inability === true ? true : finalIsVerbOverride ?? predicateActsAsVerbForNegationHost(node),
    ...(focusParticle === undefined ? {} : { focusParticle }),
    ...(inability === undefined ? {} : { inability }),
  };
}

function lowerLemmaPredicateChain(node: LemmaPredicateChain): KoreanLemmaPredicateBase {
  if (node.kind === "base") {
    return node.base;
  }
  const host = lowerLemmaPredicateChain(node.host);
  return {
    ...host,
    prefix: `${host.prefix}${conjugate(host.final.lemma, host.final.irregular, "지")}${node.focusParticle ?? ""} `,
    final: node.inability === true
      ? { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true }
      : { kind: "lemma", lemma: "않다", irregular: null, isVerb: node.finalIsVerb }
  };
}

export function applyNegationChainToLemmaBase(
  base: KoreanPredicateBase,
  negation: NegationOp | null,
  options: NegationLoweringOptions = {}
): KoreanLemmaPredicateBase | null {
  return applyNegationDepthToLemmaBase(
    base,
    negation?.chainDepth ?? 0,
    negationLoweringOptionsWithOpFocus(negation, options)
  );
}

export function negationLoweringOptionsWithOpFocus(
  negation: NegationOp | null | undefined,
  options: NegationLoweringOptions
): NegationLoweringOptions {
  const withFocus = negation?.focusParticle === undefined || options.firstNegationFocusParticle !== undefined
    ? options
    : { ...options, firstNegationFocusParticle: negation.focusParticle };
  return negation?.inability !== true || withFocus.firstNegationInability === true
    ? withFocus
    : { ...withFocus, firstNegationInability: true };
}

export function baseResultWithNegationFocus(
  baseResult: BaseResult,
  negation: NegationOp | null | undefined
): BaseResult {
  if (!baseResult.ok || (negation?.focusParticle === undefined && negation?.inability !== true)) {
    return baseResult;
  }
  const finalNegationOptions = negationLoweringOptionsWithOpFocus(
    negation,
    baseResult.finalNegationOptions ?? {}
  );
  return finalNegationOptions === baseResult.finalNegationOptions
    ? baseResult
    : { ...baseResult, finalNegationOptions };
}

export function applyNegationDepthToLemmaBase(
  base: KoreanPredicateBase,
  chainDepth: number,
  options: NegationLoweringOptions = {}
): KoreanLemmaPredicateBase | null {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) return null;
  let node: LemmaPredicateChain = { kind: "base", base: lemmaBase };
  for (let i = 0; i < chainDepth; i++) {
    const finalIsVerbOverride = i === 0 ? options.firstNegationFinalIsVerb : undefined;
    const focusParticle = i === 0 ? options.firstNegationFocusParticle : undefined;
    const inability = i === 0 ? options.firstNegationInability : undefined;
    node = negatePredicate(node, finalIsVerbOverride, focusParticle, inability);
  }
  return lowerLemmaPredicateChain(node);
}

export type BaseResult =
  | {
    readonly ok: true;
    readonly base: KoreanPredicateBase;
    readonly chainOnFinalSupported?: boolean;
    readonly interOpProjectionPolicy?: AspectProjectionPolicy;
    readonly finalNegationOptions?: NegationLoweringOptions;
    readonly finalNegationLoweringPolicy?: FinalNegationLoweringPolicy;
    readonly terminalPrefixContraction?: "scope_topic";
    readonly terminalRealization?: TerminalRealization;
    readonly chainCarryPrefixContraction?: "no_emphasis_limited";
    readonly connectivePrefixContraction?: "no_scope_negative" | "scope_topic";
    readonly connectiveBaseOverride?: ConnectiveBaseOverride;
    readonly interOpPastProjection?: AttributivePastProjection;
    readonly sourceTrace?: BaseSourceTrace;
    readonly chainSourceTrace?: ChainSourceTrace;
  }
  | { readonly ok: false; readonly reason: string };

export type OkBaseResult = Extract<BaseResult, { readonly ok: true }>;

export type OkLemmaBaseResult = Omit<OkBaseResult, "base"> & { readonly base: KoreanLemmaPredicateBase };

export type AttributivePastProjection = "lexical" | "committed";

export type NegativeAttributiveProjection = "default" | "scope_bridge" | "completed_negative";

export type AttributiveProjectionPolicy = "present" | "future" | "result_state" | "head_required_future";

export function isFutureAttributiveProjection(policy: AttributiveProjectionPolicy): boolean {
  return policy === "future" || policy === "head_required_future";
}

export interface ConnectiveBaseOverride {
  readonly base: KoreanPredicateBase;
  readonly past: boolean;
  readonly adversativeSurface?: "のに";
}

export type TerminalRealization =
  | {
    readonly kind: "reported_request";
    readonly requestBase: KoreanPredicateBase;
  }
  | { readonly kind: "elided_carrier" }
  | { readonly kind: "exclamative" };

export type OperatorOp = SimpleAspectOp | BenefactiveAspectOp | DesiderativeAspectOp | MiseruAspectOp |
  PostverbAuxiliaryOp |
  PredicateProjectionCarrierOp |
  PredicateQuoteCarrierOp |
  PredicateSuffixOp |
  DesireOp | VoiceOp | ObligationIdiomOp | PermissionIdiomOp | ForbiddenIdiomOp | SufficiencyConditionalIdiomOp | TeEvaluationIdiomOp |
  ExperienceIdiomOp | DecisionKotoNiSuruIdiomOp | OutcomeKotoNiNaruIdiomOp | NegativeNecessitySumuIdiomOp | NegativeNecessityKotoWaIdiomOp |
  InevitableIdiomOp |
  CannotRefrainIdiomOp |
  MethodYouGaNaiIdiomOp |
  WakeImpossibleIdiomOp |
  NegativeNecessityMadeMoIdiomOp |
  OnlyOptionIdiomOp |
  DegreeIntensifierIdiomOp |
  ModalOp | ConjectureOp | PotentialKotoGaDekiruIdiomOp | ScopeBridgeOp;

export interface OpContext {
  readonly lookups: LookupTables;
  readonly chainIndex?: number;
  readonly hasPriorChainOp?: boolean;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceStemIsVolitional?: boolean;
  readonly sourceHostHasTeIruAspect?: boolean;
  readonly sourceStemIsSahenPredicate?: boolean;
  readonly adverbialStemLemma?: string;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly attributiveProjectionBase?: KoreanPredicateBase;
  readonly formal: boolean;
  readonly shortNegationPolicy: ShortNegationPolicy | undefined;
  readonly sahenShortNegationSplit: boolean;
  readonly preferShortLikenessNegation?: boolean;
  readonly hasFollowingOp: boolean;
  readonly nextOp?: OperatorOp | undefined;
  readonly passiveStemOptions: PassiveStemOptions;
  readonly forbidShortNegation: boolean;
  readonly desiredPredicateNegation: NegationOp | null;
}

export function concatPredicatePrefix(prefix: string, body: string): string {
  if (/\s$/u.test(prefix)) {
    const normalizedPrefix = prefix.replace(/\s+$/u, " ");
    return `${normalizedPrefix}${body.trimStart()}`;
  }
  return `${prefix}${body}`;
}


export function tracedSeg(
  text: string,
  sourceTokens: readonly RuntimeHaruToken[],
  kind: TailTraceSegmentKind,
  projectionConfidence?: TargetSegment["projectionConfidence"]
): readonly TailTraceSegment[] {
  if (text.length === 0) {
    return [];
  }
  return [{
    text,
    sourceTokens,
    kind,
    ...(projectionConfidence === undefined ? {} : { projectionConfidence })
  }];
}

export function stemHostTraceSegment(
  stem: StemNode,
  text: string,
  sourceTokens: readonly RuntimeHaruToken[],
  kind: TailTraceSegmentKind,
  projectionConfidence?: TargetSegment["projectionConfidence"]
): TailTraceSegment {
  return projectedHostTraceSegment(stem.projectedHost?.segments, text, sourceTokens, kind, projectionConfidence);
}

export function projectedHostTraceSegment(
  projected: readonly TargetSegment[] | undefined,
  text: string,
  sourceTokens: readonly RuntimeHaruToken[],
  kind: TailTraceSegmentKind,
  projectionConfidence?: TargetSegment["projectionConfidence"]
): TailTraceSegment {
  return {
    text,
    sourceTokens,
    kind,
    ...(projectionConfidence === undefined ? {} : { projectionConfidence }),
    ...(projected !== undefined && projected.map((child) => child.text).join("") === text
      ? { projectedSegments: projected }
      : {})
  };
}

export function tracedStemHostSeg(
  stem: StemNode,
  text: string,
  sourceTokens: readonly RuntimeHaruToken[],
  kind: TailTraceSegmentKind,
  projectionConfidence?: TargetSegment["projectionConfidence"]
): readonly TailTraceSegment[] {
  return text.length === 0
    ? []
    : [stemHostTraceSegment(stem, text, sourceTokens, kind, projectionConfidence)];
}

export function tracedText(segments: readonly TailTraceSegment[]): string {
  let text = "";
  for (const segment of segments) {
    text += segment.text;
  }
  return text;
}

export function tracedCat(
  ...parts: readonly (readonly TailTraceSegment[])[]
): readonly TailTraceSegment[] {
  const segments: TailTraceSegment[] = [];
  for (const part of parts) {
    segments.push(...part);
  }
  return segments;
}

export function tracedFuse(
  left: readonly TailTraceSegment[],
  right: readonly TailTraceSegment[],
  actualText: string
): readonly TailTraceSegment[] {
  const leftText = tracedText(left);
  const rightText = tracedText(right);
  if (actualText === `${leftText}${rightText}`) {
    return tracedCat(left, right);
  }
  if (actualText.startsWith(leftText)) {
    const rest = actualText.slice(leftText.length);
    if (rest.length === 0) {
      return left;
    }
    return tracedCat(left, [collapseTraceSegments(right, rest)]);
  }
  const leftInit = left.slice(0, -1);
  const leftLast = left[left.length - 1];
  const leftInitText = tracedText(leftInit);
  if (leftLast !== undefined && actualText.startsWith(leftInitText)) {
    const mid = actualText.slice(leftInitText.length);
    if (rightText.length > 0 && mid.length > rightText.length && actualText.endsWith(rightText)) {
      const contractedLast: TailTraceSegment = {
        ...leftLast,
        text: mid.slice(0, mid.length - rightText.length)
      };
      return tracedCat(leftInit, [contractedLast], right);
    }
    if (mid.length > 0) {
      return tracedCat(leftInit, [collapseTraceSegments([leftLast, ...right], mid)]);
    }
  }
  return [collapseTraceSegments([...left, ...right], actualText)];
}

function collapseTraceSegments(
  segments: readonly TailTraceSegment[],
  text: string
): TailTraceSegment {
  const sourceTokens: RuntimeHaruToken[] = [];
  let hasPlaceholder = false;
  for (const segment of segments) {
    sourceTokens.push(...segment.sourceTokens);
    if (segment.chainFinalPlaceholder === true) {
      hasPlaceholder = true;
    }
  }
  const last = segments[segments.length - 1];
  return {
    text,
    sourceTokens,
    kind: last?.kind ?? "aux",
    ...(hasPlaceholder ? { chainFinalPlaceholder: true as const } : {})
  };
}

export function scopeTopicTraceCarrierContraction(
  segments: readonly TailTraceSegment[]
): readonly TailTraceSegment[] | null {
  let changed = false;
  const contracted = segments.map((segment) => {
    if (segment.text !== " 것은 " && segment.text !== " 것은") {
      return segment;
    }
    changed = true;
    return {
      ...segment,
      text: segment.text === " 것은 " ? " 건 " : " 건"
    };
  });
   
  return changed ? contracted : null;
}

function scopeEmphasisTraceCarrierContraction(
  segments: readonly TailTraceSegment[]
): readonly TailTraceSegment[] | null {
  let changed = false;
  const contracted = segments.map((segment) => {
    if (segment.text !== " 것이기는 ") {
      return segment;
    }
    changed = true;
    return {
      ...segment,
      text: " 것이긴 "
    };
  });
   
  return changed ? contracted : null;
}

export function tracePrefixContractionForTarget(
  segments: readonly TailTraceSegment[],
  targetPrefix: string
): readonly TailTraceSegment[] | null {
  for (const candidate of [
    scopeTopicTraceCarrierContraction(segments),
    scopeEmphasisTraceCarrierContraction(segments)
  ]) {
    if (candidate === null) {
      continue;
    }
    const text = candidate.map((segment) => segment.text).join("");
    if (targetPrefix.startsWith(text)) {
      return candidate;
    }
  }
  return null;
}

export interface ChainTraceLeadingSplit {
  readonly surface: string;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly kind: TailTraceSegmentKind;
  readonly stem?: StemNode;
}

export class ChainTraceAccumulator {
  private readonly segments: TailTraceSegment[] = [];
  private text = "";
  private finalTokens: readonly RuntimeHaruToken[];
  private finalKind: TailTraceSegmentKind;
  private leadingSplit: ChainTraceLeadingSplit | null;

  constructor(options: {
    readonly initialFinalTokens: readonly RuntimeHaruToken[];
    readonly initialFinalKind: TailTraceSegmentKind;
    readonly leadingSplit?: ChainTraceLeadingSplit;
  }) {
    this.finalTokens = options.initialFinalTokens;
    this.finalKind = options.initialFinalKind;
    this.leadingSplit = options.leadingSplit ?? null;
  }

  appendSegment(segment: TailTraceSegment): void {
    if (segment.text.length === 0) {
      return;
    }
    this.segments.push(segment);
    this.text += segment.text;
  }

  appendPrefix(
    targetPrefix: string,
    sourceTokens: readonly RuntimeHaruToken[],
    kind: TailTraceSegmentKind
  ): void {
    if (!targetPrefix.startsWith(this.text)) {
      const contracted = tracePrefixContractionForTarget(this.segments, targetPrefix);
      if (contracted !== null) {
        this.segments.length = 0;
        this.segments.push(...contracted);
        this.text = this.segments.map((segment) => segment.text).join("");
      }
    }
    if (targetPrefix === this.text || this.text.startsWith(targetPrefix)) {
      return;
    }
    if (!targetPrefix.startsWith(this.text)) {
      this.text = targetPrefix;
      this.segments.length = 0;
      this.segments.push({
        text: targetPrefix,
        sourceTokens,
        kind,
        projectionConfidence: "fallback"
      });
      this.leadingSplit = null;
      return;
    }
    let growth = targetPrefix.slice(this.text.length);
    if (this.leadingSplit !== null && this.segments.length === 0) {
      const split = this.leadingSplit;
      this.leadingSplit = null;
      if (growth.startsWith(split.surface) && split.surface.length > 0) {
        this.appendSegment(split.stem === undefined
          ? {
            text: split.surface,
            sourceTokens: split.tokens,
            kind: split.kind,
            projectionConfidence: "semantic"
          }
          : stemHostTraceSegment(split.stem, split.surface, split.tokens, split.kind, "semantic"));
        growth = targetPrefix.slice(this.text.length);
      }
    }
    if (growth.length > 0) {
      this.appendSegment({ text: growth, sourceTokens, kind, projectionConfidence: "semantic" });
    }
  }

  stepSourceTrace(
    previousBasePrefix: string,
    sourceTrace: BaseSourceTrace,
    newBasePrefix: string,
    extraInputTokens: readonly RuntimeHaruToken[] = []
  ): void {
    this.appendPrefix(
      `${previousBasePrefix}${sourceTrace.inputProjectionText}`,
      [
        ...this.finalTokens,
        ...extraInputTokens,
        ...(sourceTrace.inputProjectionExtraSourceTokens ?? [])
      ],
      this.finalKind
    );
    for (const segment of sourceTrace.carrierPrefixSegments) {
      this.appendSegment(segment);
    }
    this.appendPrefix(newBasePrefix, sourceTrace.finalSourceTokens, sourceTrace.finalKind ?? "modal");
    this.finalTokens = sourceTrace.finalSourceTokens;
    this.finalKind = sourceTrace.finalKind ?? "modal";
  }

  stepGeneric(
    newBasePrefix: string,
    opTokens: readonly RuntimeHaruToken[],
    kind: TailTraceSegmentKind,
    unionWithPrevious = false
  ): void {
    const tokens = unionWithPrevious ? [...this.finalTokens, ...opTokens] : opTokens;
    this.appendPrefix(newBasePrefix, tokens, kind);
    this.finalTokens = tokens;
    this.finalKind = kind;
  }

  syncPrefix(prefix: string): void {
    this.appendPrefix(prefix, this.finalTokens, this.finalKind);
  }

  extendFinalTokens(tokens: readonly RuntimeHaruToken[]): void {
    if (tokens.length === 0) {
      return;
    }
    this.finalTokens = [...this.finalTokens, ...tokens];
  }

  finish(extraFinalTokens: readonly RuntimeHaruToken[] = []): ChainSourceTrace {
    return {
      prefixSegments: [...this.segments],
      finalSourceTokens: extraFinalTokens.length === 0
        ? this.finalTokens
        : [...this.finalTokens, ...extraFinalTokens],
      finalKind: this.finalKind
    };
  }
}

export function tracedChainFinalPlaceholder(text: string): readonly TailTraceSegment[] {
  if (text.length === 0) {
    return [];
  }
  return [{ text, sourceTokens: [], kind: "aux", chainFinalPlaceholder: true }];
}

export function rebindChainFinalPlaceholders(
  pieces: readonly TailTraceSegment[],
  trace: ChainSourceTrace
): readonly TailTraceSegment[] | null {
  const out: TailTraceSegment[] = [];
  let used = false;
  for (const piece of pieces) {
    if (piece.chainFinalPlaceholder !== true) {
      out.push(piece);
      continue;
    }
    if (used) {
      return null;
    }
    const closed = closeChainTraceAgainstText(trace, piece.text);
    if (closed === null) {
      return null;
    }
    out.push(...closed);
    used = true;
  }
  return used ? out : null;
}

export function closeChainTraceAgainstText(
  trace: ChainSourceTrace,
  text: string
): readonly TailTraceSegment[] | null {
  let prefixSegments = trace.prefixSegments;
  let prefixText = tracedText(prefixSegments);
  if (!text.startsWith(prefixText)) {
    const contracted = tracePrefixContractionForTarget(prefixSegments, text);
    if (contracted === null) {
      return null;
    }
    prefixSegments = contracted;
    prefixText = tracedText(prefixSegments);
    if (!text.startsWith(prefixText)) {
      return null;
    }
  }
  const finalText = text.slice(prefixText.length);
  if (finalText.length === 0) {
    return prefixSegments;
  }
  return tracedCat(
    prefixSegments,
    tracedSeg(finalText, trace.finalSourceTokens, trace.finalKind, "semantic")
  );
}

export function rebindChainTraceForProjection(
  trace: ChainSourceTrace,
  text: string
): readonly TailTraceSegment[] {
  const pieces: TailTraceSegment[] = [
    ...trace.prefixSegments,
    {
      text: "",
      sourceTokens: trace.finalSourceTokens,
      kind: trace.finalKind,
      projectionConfidence: "semantic"
    }
  ];
  let preservedCount = 0;
  let preservedText = "";
  for (let index = 0; index < trace.prefixSegments.length; index++) {
    const nextText = `${preservedText}${trace.prefixSegments[index]!.text}`;
    if (!text.startsWith(nextText)) {
      break;
    }
    preservedCount = index + 1;
    preservedText = nextText;
  }
  const rest = text.slice(preservedText.length);
  const remaining = pieces.slice(preservedCount);
  if (remaining.length === 0) {
    return pieces;
  }
  if (rest.length === 0) {
    const lastPreserved = pieces[preservedCount - 1];
    if (lastPreserved === undefined) {
      return [];
    }
    return [
      ...pieces.slice(0, preservedCount - 1),
      collapseTraceSegments([lastPreserved, ...remaining], lastPreserved.text)
    ];
  }
  return [
    ...pieces.slice(0, preservedCount),
    collapseTraceSegments(remaining, rest)
  ];
}


export function tailTraceSegmentsToTargetSegments(
  segments: readonly TailTraceSegment[]
): readonly TargetSegment[] {
  return suppressAdjacentSameSourceBoundaries(segments.flatMap(tailTargetSegments));
}

function tailTargetSegments(segment: TailTraceSegment): readonly TargetSegment[] {
  const projected = segment.projectedSegments;
  if (projected === undefined) {
    return [tailTargetSegment(segment)];
  }
  return projected.map((child) => child.text).join("") === segment.text
    ? projected
    : [{ ...tailTargetSegment(segment), projectionConfidence: "fallback" }];
}

export function tailTargetSegment(segment: TailTraceSegment): TargetSegment {
  const sourceSpan = sourceSpanForTraceTokens(segment.sourceTokens);
  const sourceInternalBoundaryTargets = sourceInternalBoundaryTargetsForTraceTokens(segment.sourceTokens);
  return {
    text: segment.text,
    sourceSpan,
    boundaryBefore: sourceBoundaryBeforeTrace(sourceSpan),
    boundaryAfter: segment.suppressBoundaryAfter === true ? null : sourceBoundaryAfterTrace(sourceSpan),
    unit: null,
    renderPlanKind: "headTailChain",
    kind: segment.kind,
    ...(sourceInternalBoundaryTargets.length === 0 ? {} : { sourceInternalBoundaryTargets }),
    projectionConfidence: segment.projectionConfidence ?? "semantic"
  };
}

function sourceInternalBoundaryTargetsForTraceTokens(tokens: readonly RuntimeHaruToken[]): readonly SourceInternalBoundaryTarget[] {
  const targets: SourceInternalBoundaryTarget[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    for (const boundary of token.sourceCompoundProjectionBoundaries ?? []) {
      const key = [
        boundary.sourceBoundary.beforeOrdinal ?? "null",
        boundary.sourceBoundary.afterOrdinal ?? "null",
        boundary.leftTargetText ?? "",
        boundary.rightTargetText ?? "",
        boundary.leftSplitTargetText ?? "",
        boundary.rightSplitTargetText ?? ""
      ].join(":");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      targets.push({
        sourceBoundary: boundary.sourceBoundary,
        ...(boundary.leftTargetText === undefined ? {} : { leftTargetText: boundary.leftTargetText }),
        ...(boundary.rightTargetText === undefined ? {} : { rightTargetText: boundary.rightTargetText }),
        ...(boundary.leftSplitTargetText === undefined ? {} : { leftSplitTargetText: boundary.leftSplitTargetText }),
        ...(boundary.rightSplitTargetText === undefined ? {} : { rightSplitTargetText: boundary.rightSplitTargetText })
      });
    }
  }
  return targets;
}

export function sourceSpanForTraceTokens(tokens: readonly RuntimeHaruToken[]): TargetSegment["sourceSpan"] {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (const token of tokens) {
    const span = token.sourceSpan ?? (token.sourceOrdinal === undefined ? null : {
      startOrdinal: token.sourceOrdinal,
      endOrdinal: token.sourceOrdinal + 1
    });
    if (span === null) continue;
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null
    ? null
    : { startOrdinal, endOrdinal };
}

export function sourceBoundaryBeforeTrace(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryBefore"] {
  if (sourceSpan === null) return null;
  return {
    beforeOrdinal: sourceSpan.startOrdinal > 0 ? sourceSpan.startOrdinal - 1 : null,
    afterOrdinal: sourceSpan.startOrdinal
  };
}

export function sourceBoundaryAfterTrace(sourceSpan: TargetSegment["sourceSpan"]): TargetSegment["boundaryAfter"] {
  if (sourceSpan === null) return null;
  return {
    beforeOrdinal: sourceSpan.endOrdinal - 1,
    afterOrdinal: sourceSpan.endOrdinal
  };
}

export function suppressAdjacentSameSourceBoundaries(
  segments: readonly TargetSegment[]
): readonly TargetSegment[] {
  return segments.map((segment, index) => {
    const next = segments[index + 1];
    const previous = segments[index - 1];
    const clearAfter = next !== undefined && traceSourceSpanEquals(segment.sourceSpan, next.sourceSpan);
    const clearBefore = previous !== undefined && traceSourceSpanEquals(previous.sourceSpan, segment.sourceSpan);
    if (!clearAfter && !clearBefore) {
      return segment;
    }
    return {
      ...segment,
      ...(clearBefore ? { boundaryBefore: null } : {}),
      ...(clearAfter ? { boundaryAfter: null } : {})
    };
  });
}

export function traceSourceSpanEquals(
  left: TargetSegment["sourceSpan"],
  right: TargetSegment["sourceSpan"]
): boolean {
  return left !== null &&
    right !== null &&
    left.startOrdinal === right.startOrdinal &&
    left.endOrdinal === right.endOrdinal;
}

export function unionTraceSourceSpans(
  left: TargetSegment["sourceSpan"],
  right: TargetSegment["sourceSpan"]
): TargetSegment["sourceSpan"] {
  if (left === null) return right;
  if (right === null) return left;
  return {
    startOrdinal: Math.min(left.startOrdinal, right.startOrdinal),
    endOrdinal: Math.max(left.endOrdinal, right.endOrdinal)
  };
}


export function traceSfpTailFromBaseSegments(
  baseSegments: readonly TargetSegment[],
  baseText: string,
  renderedText: string,
  sfp: Exclude<TailRoot["sfp"], null>
): RenderedTarget | null {
  if (sfp.effect === null) {
    return baseText === renderedText ? { text: renderedText, segments: baseSegments } : null;
  }
  if (baseSegments.length === 0) {
    return null;
  }
  const appended = traceAppendedSfpTailFromBaseSegments(baseSegments, baseText, renderedText, sfp);
  if (appended !== null) {
    return appended;
  }
  const neEnding = traceNeEndingSfpTailFromBaseSegments(baseSegments, renderedText, sfp);
  if (neEnding !== null) {
    return neEnding;
  }
  const replaced = traceReplacingSfpTailFromBaseSegments(baseSegments, baseText, renderedText, sfp);
  if (replaced !== null) {
    return replaced;
  }
  const prefixSegments = baseSegments.slice(0, -1);
  const prefixText = prefixSegments.map((segment) => segment.text).join("");
  if (!baseText.startsWith(prefixText) || !renderedText.startsWith(prefixText)) {
    return null;
  }
  const finalText = renderedText.slice(prefixText.length);
  if (finalText.length === 0) {
    return null;
  }
  const baseFinal = baseSegments[baseSegments.length - 1]!;
  const sourceSpan = unionTraceSourceSpans(
    baseFinal.sourceSpan,
    sourceSpanForTraceTokens(sfp.source.tokens)
  );
  const finalSegment: TargetSegment = {
    ...baseFinal,
    text: finalText,
    sourceSpan,
    boundaryBefore: sourceBoundaryBeforeTrace(sourceSpan),
    boundaryAfter: sourceBoundaryAfterTrace(sourceSpan)
  };
  const segments = suppressAdjacentSameSourceBoundaries([...prefixSegments, finalSegment]);
  const text = segments.map((segment) => segment.text).join("");
  return text === renderedText ? { text, segments } : null;
}

function traceAppendedSfpTailFromBaseSegments(
  baseSegments: readonly TargetSegment[],
  baseText: string,
  renderedText: string,
  sfp: Exclude<TailRoot["sfp"], null>
): RenderedTarget | null {
  if (!renderedText.startsWith(baseText) || renderedText.length <= baseText.length) {
    return null;
  }
  const suffix = renderedText.slice(baseText.length);
  const sfpSourceSpan = sourceSpanForTraceTokens(sfp.source.tokens);
  const segments = suppressAdjacentSameSourceBoundaries([
    ...baseSegments,
    {
      text: suffix,
      sourceSpan: sfpSourceSpan,
      boundaryBefore: sourceBoundaryBeforeTrace(sfpSourceSpan),
      boundaryAfter: sourceBoundaryAfterTrace(sfpSourceSpan),
      unit: null,
      renderPlanKind: "headTailChain",
      kind: "aux" as const,
      projectionConfidence: "semantic" as const
    }
  ]);
  const text = segments.map((segment) => segment.text).join("");
  return text === renderedText ? { text, segments } : null;
}

function traceReplacingSfpTailFromBaseSegments(
  baseSegments: readonly TargetSegment[],
  baseText: string,
  renderedText: string,
  sfp: Exclude<TailRoot["sfp"], null>
): RenderedTarget | null {
  const prefixLength = tracePrefixCommonLength(baseText, renderedText);
  if (prefixLength <= 0 || prefixLength >= baseText.length || prefixLength >= renderedText.length) {
    return null;
  }
  if (baseText.length - prefixLength > 1) {
    return null;
  }
  const prefixSegments = takeTargetSegmentsTextPrefix(baseSegments, prefixLength);
  if (prefixSegments === null || prefixSegments.length === 0) {
    return null;
  }
  const sfpText = renderedText.slice(prefixLength);
  const sfpSourceSpan = sourceSpanForTraceTokens(sfp.source.tokens);
  const segments = suppressAdjacentSameSourceBoundaries([
    ...prefixSegments,
    {
      text: sfpText,
      sourceSpan: sfpSourceSpan,
      boundaryBefore: sourceBoundaryBeforeTrace(sfpSourceSpan),
      boundaryAfter: sourceBoundaryAfterTrace(sfpSourceSpan),
      unit: null,
      renderPlanKind: "headTailChain",
      kind: "aux" as const,
      projectionConfidence: "semantic" as const
    }
  ]);
  const text = segments.map((segment) => segment.text).join("");
  return text === renderedText ? { text, segments } : null;
}

function traceNeEndingSfpTailFromBaseSegments(
  baseSegments: readonly TargetSegment[],
  renderedText: string,
  sfp: Exclude<TailRoot["sfp"], null>
): RenderedTarget | null {
  if (sfp.effect !== "ne") {
    return null;
  }
  const suffix = renderedText.endsWith("네요")
    ? "네요"
    : renderedText.endsWith("네")
      ? "네"
      : null;
  if (suffix === null || renderedText.length <= suffix.length) {
    return null;
  }
  const prefixText = renderedText.slice(0, -suffix.length);
  const prefixSegments = retargetBaseSegmentsToRenderedPrefix(baseSegments, prefixText);
  if (prefixSegments === null || prefixSegments.length === 0) {
    return null;
  }
  const sfpSourceSpan = sourceSpanForTraceTokens(sfp.source.tokens);
  const segments = suppressAdjacentSameSourceBoundaries([
    ...prefixSegments,
    {
      text: suffix,
      sourceSpan: sfpSourceSpan,
      boundaryBefore: sourceBoundaryBeforeTrace(sfpSourceSpan),
      boundaryAfter: sourceBoundaryAfterTrace(sfpSourceSpan),
      unit: null,
      renderPlanKind: "headTailChain",
      kind: "aux" as const,
      projectionConfidence: "semantic" as const
    }
  ]);
  const text = segments.map((segment) => segment.text).join("");
  return text === renderedText ? { text, segments } : null;
}

function retargetBaseSegmentsToRenderedPrefix(
  baseSegments: readonly TargetSegment[],
  prefixText: string
): readonly TargetSegment[] | null {
  if (baseSegments.length === 0 || prefixText.length === 0) {
    return null;
  }
  const result: TargetSegment[] = [];
  let consumedText = "";
  let cursor = 0;
  while (cursor < baseSegments.length) {
    const segment = baseSegments[cursor]!;
    const nextText = `${consumedText}${segment.text}`;
    if (!prefixText.startsWith(nextText)) {
      break;
    }
    result.push(segment);
    consumedText = nextText;
    cursor += 1;
    if (consumedText === prefixText) {
      return result;
    }
  }
  const remainingText = prefixText.slice(consumedText.length);
  if (remainingText.length === 0 || cursor >= baseSegments.length) {
    return null;
  }
  const remainingSpan = baseSegments.slice(cursor)
    .map((segment) => segment.sourceSpan)
    .reduce<TargetSegment["sourceSpan"]>((span, current) => unionTraceSourceSpans(span, current), null);
  const template = baseSegments[cursor]!;
  result.push({
    ...template,
    text: remainingText,
    sourceSpan: remainingSpan,
    boundaryBefore: sourceBoundaryBeforeTrace(remainingSpan),
    boundaryAfter: sourceBoundaryAfterTrace(remainingSpan),
    sourceInternalBoundaryTargets: []
  });
  return result;
}

function takeTargetSegmentsTextPrefix(
  segments: readonly TargetSegment[],
  length: number
): readonly TargetSegment[] | null {
  if (length < 0) {
    return null;
  }
  if (length === 0) {
    return [];
  }
  const result: TargetSegment[] = [];
  let remaining = length;
  for (const segment of segments) {
    if (remaining <= 0) {
      break;
    }
    if (segment.text.length <= remaining) {
      result.push(segment);
      remaining -= segment.text.length;
      continue;
    }
    result.push({
      ...segment,
      text: segment.text.slice(0, remaining)
    });
    remaining = 0;
    break;
  }
  return remaining === 0 ? result : null;
}

function tracePrefixCommonLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) {
    i++;
  }
  return i;
}

export function closeChainTraceWithFinalConnectiveAgainstTerminal(
  trace: ChainSourceTrace,
  renderedText: string,
  terminalText: string,
  connective: ConnectiveOp
): readonly TailTraceSegment[] | null {
  const effectivePrefixSegments = effectiveChainPrefixSegmentsForClose(trace, renderedText);
  if (effectivePrefixSegments === null) {
    return null;
  }
  const effectivePrefixText = effectivePrefixSegments.map((segment) => segment.text).join("");
  if (!terminalText.startsWith(effectivePrefixText)) {
    return null;
  }
  const renderedFinalText = renderedText.slice(effectivePrefixText.length);
  const terminalFinalText = terminalText.slice(effectivePrefixText.length);
  const split = splitFinalConnectiveTargetText(renderedFinalText, terminalFinalText, connective);
  if (split === null) {
    return null;
  }
  return [
    ...effectivePrefixSegments,
    {
      text: split.finalText,
      sourceTokens: trace.finalSourceTokens,
      kind: trace.finalKind,
      projectionConfidence: "semantic"
    },
    {
      text: split.connectiveText,
      sourceTokens: connective.source.tokens,
      kind: "connective",
      projectionConfidence: "semantic"
    }
  ];
}

function effectiveChainPrefixSegmentsForClose(
  trace: ChainSourceTrace,
  renderedText: string
): readonly TailTraceSegment[] | null {
  const prefixText = trace.prefixSegments.map((segment) => segment.text).join("");
  if (renderedText.startsWith(prefixText)) {
    return trace.prefixSegments;
  }
  const contracted = tracePrefixContractionForTarget(trace.prefixSegments, renderedText);
  if (contracted === null) {
    return null;
  }
  const contractedText = contracted.map((segment) => segment.text).join("");
  return renderedText.startsWith(contractedText) ? contracted : null;
}

function splitFinalConnectiveTargetText(
  renderedFinalText: string,
  terminalFinalText: string,
  finalConnective: ConnectiveOp
): { readonly finalText: string; readonly connectiveText: string } | null {
  if (finalConnective.connective === "quotative") {
    const suffixes = [
      finalConnective.quoteBoundary?.koreanClauseForm,
      ...(finalConnective.quoteBoundary?.nominalRoleParticle === undefined ? [] : ["으로", "로"]),
      "이라고",
      "라고",
      "고"
    ].filter((suffix): suffix is string => suffix !== undefined && suffix.length > 0);
    for (const suffix of suffixes) {
      if (!renderedFinalText.endsWith(suffix)) {
        continue;
      }
      const finalText = renderedFinalText.slice(0, -suffix.length);
      if (finalText.length > 0) {
        return { finalText, connectiveText: suffix };
      }
    }
  }
  const commonLength = chainCloseCommonPrefixLength(renderedFinalText, terminalFinalText);
  if (commonLength <= 0 || commonLength >= renderedFinalText.length) {
    return null;
  }
  return {
    finalText: renderedFinalText.slice(0, commonLength),
    connectiveText: renderedFinalText.slice(commonLength)
  };
}

function chainCloseCommonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) {
    i++;
  }
  return i;
}

export function closeChainTraceWithConnectivePieces(
  trace: ChainSourceTrace,
  renderedText: string,
  connective: ConnectiveOp
): readonly TailTraceSegment[] | null {
  const prefixText = trace.prefixSegments.map((segment) => segment.text).join("");
  let effectivePrefixSegments: readonly TailTraceSegment[] | null = renderedText.startsWith(prefixText)
    ? trace.prefixSegments
    : tracePrefixContractionForTarget(trace.prefixSegments, renderedText);
  if (effectivePrefixSegments !== null) {
    const text = effectivePrefixSegments.map((segment) => segment.text).join("");
    if (!renderedText.startsWith(text)) {
      effectivePrefixSegments = null;
    }
  }
  if (effectivePrefixSegments === null) {
    return null;
  }
  const effectivePrefixText = effectivePrefixSegments.map((segment) => segment.text).join("");
  const renderedFinalText = renderedText.slice(effectivePrefixText.length);
  const split = (() => {
    if (connective.connective === "quotative") {
      const suffixes = [
        connective.quoteBoundary?.koreanClauseForm,
        ...(connective.quoteBoundary?.nominalRoleParticle === undefined ? [] : ["으로", "로"]),
        "이라고",
        "라고",
        "고"
      ].filter((suffix): suffix is string => suffix !== undefined && suffix.length > 0);
      for (const suffix of suffixes) {
        if (renderedFinalText.endsWith(suffix) && renderedFinalText.length > suffix.length) {
          return {
            finalText: renderedFinalText.slice(0, -suffix.length),
            connectiveText: suffix
          };
        }
      }
      for (const suffix of suffixes) {
        if (renderedFinalText === suffix) {
          return { finalText: "", connectiveText: suffix };
        }
      }
      return null;
    }
    return splitRenderedFinalConnectiveSuffix(renderedFinalText, connective);
  })();
  if (split === null) {
    return null;
  }
  return [
    ...effectivePrefixSegments,
    {
      text: split.finalText,
      sourceTokens: trace.finalSourceTokens,
      kind: trace.finalKind,
      projectionConfidence: "semantic"
    },
    {
      text: split.connectiveText,
      sourceTokens: connective.source.tokens,
      kind: "connective",
      projectionConfidence: "semantic"
    }
  ];
}

function splitRenderedFinalConnectiveSuffix(
  renderedFinalText: string,
  finalConnective: ConnectiveOp
): { readonly finalText: string; readonly connectiveText: string } | null {
  for (const suffix of renderedFinalConnectiveSuffixes(finalConnective)) {
    if (!renderedFinalText.endsWith(suffix)) {
      continue;
    }
    const finalText = renderedFinalText.slice(0, -suffix.length);
    return { finalText, connectiveText: suffix };
  }
  return null;
}

function renderedFinalConnectiveSuffixes(
  finalConnective: ConnectiveOp
): readonly string[] {
  switch (finalConnective.connective) {
    case "te_form":
      return ["면서", "어서", "아서", "서", "고", "게"];
    case "simultaneous":
      return ["면서"];
    case "predicate_projection_tame_gerund":
      return ["기"];
    case "adversative":
      return ["지만"];
    default:
      return [];
  }
}
