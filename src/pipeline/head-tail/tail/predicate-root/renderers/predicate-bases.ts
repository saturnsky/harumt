import { potentialParticleInfix, resolvePassiveLemma, shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { respectKoreanPredicateLemma } from "../../../../../generator/honorific.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim, selectParticle } from "../../../../../generator/particles.js";
import { CONNECTIVE_RENDER_MAP } from "../connective-render-table.js";
import { POS0, POS4, POS5A, 助動詞_ジャ, 助動詞_ダ, 助動詞_マス, 動詞, 意志推量形_, 동사, 형용사 } from "../../../../../types/pos.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { lookupSetMatches, type LookupTables } from "../../../../lookup-tables.js";
import { copulaDeMarkerRelationForToken, kaMarkerRelationForToken } from "../../../boundary/marker.js";
import { derivationalHostStemRootOf, derivationalSuffixProfileById, HOST_TEMPLATE_PLACEHOLDER, type DerivationalSuffixProfile } from "../derivational-suffix-table.js";
import { assertNever, negationFocusParticleForMarker, type AffirmativeSupportFocus, type AspectProjectionPolicy, type AuxOpNode, type BenefactiveAspectOp, type ConjectureOp, type ConnectiveOp, type DegreeIntensifierIdiomOp, type ExperienceIdiomOp, type HazuModalOp, type LimitNegationModalOp, type MethodYouGaNaiIdiomOp, type MiseruAspectOp, type ModalOp, type NegationFocusParticle, type NegationOp, type NegativeNecessityKotoWaIdiomOp, type NodaModalOp, type OutcomeKotoNiNaruIdiomOp, type PermissionIdiomOp, type PostverbAuxiliaryOp, type PostverbHedgeFocus, type RashiiModalOp, type YoudaModalOp, type PredicateProjectionCarrierOp, type PredicateQuoteCarrierOp, type PredicateSuffixOp, type QuotedPropositionMood, type ScopeBridgeOp, type ShortNegationPolicy, type SimpleAspectOp, type SoudaHearsayModalOp, type SufficiencyConditionalIdiomOp, type TeEvaluationIdiomOp, type TokoroModalOp, type TsumoriModalOp, type VoiceOp, type WakeImpossibleIdiomOp, type WakeModalOp } from "../grammar.js";
import { isAffirmativeCopulaSupportVerbToken, isCopulaJaNegativeBridgeToken } from "../classifiers/tokens.js";
import { HOSTLESS_QUOTE_MARKER_MAP } from "../hostless-quote-marker-table.js";
import { likenessAttributiveLexicalizationBase, applyNegationChainToLemmaBase, applyNegationDepthToLemmaBase, hostProjectionSourceTrace, isTopicOrJaFusionSurfaceToken, lemmaPredicateBase, stemFusionSourceTrace, type AttributivePastProjection, type BaseResult, type BaseSourceTrace, type ConnectiveBaseOverride, type FinalNegationLoweringPolicy, type HostProjectionFinalSplit, type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, nounCopulaFinalAllomorphHost, type OkBaseResult, type OkLemmaBaseResult, type OpContext, predicateBasePolicyAllomorphHost, type PassiveStemOptions, type PredicateBasePolicy, type RenderFailure, type ScopeCarrierPolicy, type ScopeCarrierStyle, type TailTraceSegment, type TailTraceSegmentKind, baseResultWithNegationFocus, negationLoweringOptionsWithOpFocus } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, applyTerminalPrefixContraction, copularLemmaOfBase, isCopulaSupportPotentialOp, potentialFocusInfixForBase, finalNegationLoweringForcesPast, isBenefactiveNegativeCarrierPolicy, lowerFinalNegationDepthForCommittedBase, lowerFinalNegationForCommittedBase, lowerPotentialFinalNegationBase, negativeNounCopulaChainBase, NODA_CARRIER_BOUND_NOUN, NODA_CARRIER_BOUND_NOUN_CASUAL, nodaCarrierNoun, nounCopulaPlainStem, passiveStemOptionsWithClass, predicateBaseInfinitiveForm, quotePlainDeclarative, quotePlainDeclarativeNominal, quotePlainDeclarativeTraceParts, scopeCarrierCopulaBase, simpleStemBase, simpleStemBaseResult } from "./base-support.js";
import { composeBaseWithConjectureQuestionConnective, composeBaseWithConnective, composeBaseWithImperativeQuotative, composeBaseWithPredicateProjectionQuoteAttributive, composeBaseWithTerminal, composeBaseWithTerminalChain, plainDeclarativeToPointAttributive, plainDeclarativeToPointAttributiveNominal, projectBaseAttributive, quotedPropositionAttributiveIsReused, projectBaseFutureAttributive, projectBaseNominalized } from "./connective-compose.js";
import { irregularFrom, pastNegStemAttributive, renderBaseVolitionalPurposeConnective, renderBaseVolitionalQuotative, renderBaseVolitionalTerminal } from "./final-forms.js";
import { composeCommittedTailQuestionTerminal, composeTerminalMoodOnBase, loweredTerminalSfpEffect } from "./sfp-question.js";
import { sfpHasSelfDirectedConjectureRole } from "../inspect.js";
import { quoteProjectionForSfpEffect } from "../../../../semantics/sfp-quote-projection.js";
import { isStateChangePostverbAuxiliaryKind } from "../postverb-auxiliary-parser.js";
import { createConnectiveOp } from "../op-builders.js";

export function committedTerminalRoleBase(
  inputBaseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  lookups: LookupTables
): { readonly ok: true; readonly base: KoreanPredicateBase; readonly past: boolean } | RenderFailure {
  const baseResult = baseResultWithNegationFocus(inputBaseResult, finalNeg);
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  const chainDepth = finalNeg?.chainDepth ?? 0;
  const effectivePast = past || (finalNeg?.chainPast ?? false);
  if (chainDepth > 0 && baseResult.chainOnFinalSupported === false) {
    const lowered = lowerFinalNegationDepthForCommittedBase(baseResult, chainDepth, formal, lookups);
    if (lowered === null) {
      return { ok: false, reason: "terminal role frame cannot lower committed final negation" };
    }
    return {
      ok: true,
      base: applyTerminalPrefixContraction(lowered, baseResult.terminalPrefixContraction, formal),
      past: effectivePast || finalNegationLoweringForcesPast(baseResult, chainDepth)
    };
  }
  const terminalBase = applyTerminalPrefixContraction(baseResult.base, baseResult.terminalPrefixContraction, formal);
  if (chainDepth === 0) {
    return { ok: true, base: terminalBase, past: effectivePast };
  }
  if (
    chainDepth === 1 &&
    finalNeg?.preferShortNegation === true &&
    terminalBase.final.kind === "lemma"
  ) {
    const [prefix, lemma, irregular] = shortNegationPrefix(terminalBase.final.lemma, terminalBase.final.irregular, lookups);
    return {
      ok: true,
      base: {
        prefix: `${terminalBase.prefix}${prefix}`,
        final: {
          kind: "lemma",
          lemma,
          irregular,
          isVerb: terminalBase.final.isVerb
        }
      },
      past: effectivePast
    };
  }
  const lowered = applyExternalNegationDepthToPredicateBase(
    terminalBase,
    chainDepth,
    formal,
    baseResult.finalNegationOptions
  );
  if (lowered === null) {
    return { ok: false, reason: "terminal role frame cannot lower external negation depth" };
  }
  return { ok: true, base: lowered, past: effectivePast };
}

const DEGREE_INTENSIFIER_BASE_POLICY: Extract<PredicateBasePolicy, { readonly kind: "degree_intensifier" }> = {
  kind: "degree_intensifier",
  nodeReasonPastBehavior: "carry"
};

const KAMO_FINAL_NEGATION_OPTIONS: NegationLoweringOptions = {
  firstNegationFinalIsVerb: false
};

function aspectBase(
  aspect: SimpleAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null
): KoreanPredicateBase {
  if (aspect.collapsed === "honorific") {
    const honorificLemma = `${conjugate(stemLemma, stemIrregular, "(으)시")}다`;
    return {
      prefix: "",
      final: { kind: "lemma", lemma: honorificLemma, irregular: null, isVerb: true }
    };
  }
  if (
    aspect.semantic?.reading === "lexicalized_motion" ||
    aspect.semantic?.renderStrategy === "drop_aux" ||
    aspect.semantic?.renderStrategy === "contract_to_past"
  ) {
    if (aspect.auxiliaryHonorific === "respect") {
      return {
        prefix: "",
        final: { kind: "lemma", lemma: `${conjugate(stemLemma, stemIrregular, "(으)시")}다`, irregular: null, isVerb: true },
        ...(aspectContractsToPast(aspect)
          ? { policy: { kind: "te_iru_contract_to_past" } as const }
          : {})
      };
    }
    return {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: stemLemma,
        irregular: stemIrregular,
        isVerb: true
      },
      ...(aspectContractsToPast(aspect)
        ? { policy: { kind: "te_iru_contract_to_past" } as const }
        : {})
    };
  }
  const { stemPart, auxLemma, auxIsVerb } = getSimpleAspectBase(aspect, stemLemma, stemIrregular);
  return {
    prefix: `${stemPart} `,
    final: { kind: "lemma", lemma: auxLemma, irregular: null, isVerb: auxIsVerb }
  };
}

export function aspectBaseResult(
  aspect: SimpleAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  lookups?: LookupTables
): BaseResult {
  const effectiveAspect = aspect.aspect === "te_iru" && stemLemma === "있다"
    ? simpleAspectWithDropAuxSemantic(aspect)
    : aspect;
  const focusedAuxiliaryNegation = effectiveAspect.teFocusTarget === "aspect_auxiliary_negation";
  const auxiliaryNegationFocusParticle = teIruAuxiliaryNegationFocusParticle(effectiveAspect);
  const projection = aspectProjectionPolicy(effectiveAspect);
  const finalNegationPolicy = aspectFinalNegationLoweringPolicy(effectiveAspect);
  const teIruPolicy = teIruNegativePredicatePolicy(effectiveAspect, stemLemma, stemIrregular);
  const base = aspectBase(effectiveAspect, stemLemma, stemIrregular);
  const sourceTrace = simpleAspectSourceTrace(base, effectiveAspect.source.tokens);
  const policy = teIruPolicy ?? (focusedAuxiliaryNegation
    ? undefined
    : teIruAttributiveContractionPolicy(effectiveAspect, stemLemma, stemIrregular, lookups));
  const actionBase: KoreanPredicateBase = {
    ...base,
    capabilities: {
      ...base.capabilities,
      prohibitionHost: "action"
    }
  };
  return {
    ok: true,
    base: policy === undefined ? actionBase : { ...actionBase, policy },
    chainOnFinalSupported: finalNegationPolicy === undefined,
    ...(finalNegationPolicy === undefined && auxiliaryNegationFocusParticle !== undefined
      ? { finalNegationOptions: { firstNegationFocusParticle: auxiliaryNegationFocusParticle } }
      : {}),
    ...(finalNegationPolicy === undefined ? {} : { finalNegationLoweringPolicy: finalNegationPolicy }),
    ...(projection === "default" ? {} : { interOpProjectionPolicy: projection }),
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function simpleAspectSourceTrace(
  base: KoreanPredicateBase,
  sourceTokens: readonly RuntimeHaruToken[]
): BaseSourceTrace | undefined {
  if (base.prefix.length === 0 || sourceTokens.length === 0) {
    return undefined;
  }
  const split = splitTeBridgeSourceTokens(sourceTokens);
  const inputProjectionText = base.prefix.trimEnd();
  if (inputProjectionText.length === 0) {
    return undefined;
  }
  const spacing = base.prefix.slice(inputProjectionText.length);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (spacing.length > 0) {
    carrierPrefixSegments.push({
      text: spacing,
      sourceTokens: [],
      kind: "punctuation",
      projectionConfidence: "exact"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: split.bridgeTokens,
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

export function potentialDirectionalAspectBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (
    inputBase.policy?.kind !== "potential" ||
    (aspect.aspect !== "te_kuru" && aspect.aspect !== "te_iku") ||
    inputBase.final.isVerb
  ) {
    return null;
  }
  const directionLemma = aspect.aspect === "te_kuru" ? "오다" : "가다";
  const hostText = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "게")}`;
  const basePrefix = `${hostText} 되어 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: aspect.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: directionLemma, irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function sourceVerbAdjectivalDirectionalAspectBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (
    (aspect.aspect !== "te_kuru" && aspect.aspect !== "te_iku") ||
    inputBase.final.isVerb
  ) {
    return null;
  }
  const directionLemma = aspect.aspect === "te_kuru" ? "오다" : "가다";
  const basePrefix = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "아/어")}져 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: basePrefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: aspect.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: directionLemma, irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function sourceVerbAdjectivalEllipticTeIruNegativeBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase,
  lookups: LookupTables
): BaseResult | null {
  if (
    aspect.aspect !== "te_iru" ||
    aspect.ellipticTeIruSourceHost !== "verbal_predicate" ||
    inputBase.final.isVerb
  ) {
    return null;
  }
  return aspectBaseResult(aspect, inputBase.final.lemma, inputBase.final.irregular, lookups);
}

export function negativeTeAdverbialAspectBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase,
  lookups: LookupTables
): BaseResult {
  const aspectResult = aspectBaseResult(aspect, inputBase.final.lemma, inputBase.final.irregular, lookups);
  if (!aspectResult.ok || aspectResult.base.final.kind !== "lemma") {
    return aspectResult;
  }
  const basePrefix = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "지")} 않고 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: basePrefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: aspect.source.tokens,
    splitFinal: "none"
  });
  const { sourceTrace: _carried, ...aspectRest } = aspectResult;
  void _carried;
  return {
    ...aspectRest,
    base: {
      prefix: basePrefix,
      final: aspectResult.base.final,
      ...(aspectResult.base.policy === undefined ? {} : { policy: aspectResult.base.policy }),
      ...(aspectResult.base.capabilities === undefined ? {} : { capabilities: aspectResult.base.capabilities })
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function sourceVerbAdjectivalTsutsuAruBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (aspect.aspect !== "tsutsu_aru" || !isDirectCommittedAdjectiveBase(inputBase)) {
    return null;
  }
  return stateChangeBridgedAspectBaseResult(aspect, inputBase);
}

function isDirectCommittedAdjectiveBase(inputBase: KoreanLemmaPredicateBase): boolean {
  return !inputBase.final.isVerb && inputBase.policy === undefined;
}

function stateChangeBridgedAspectBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  const changedBase = stateChangeBase(inputBase, "adjectival");
  const aspectResult = aspectBaseResult(
    simpleAspectWithoutSemantic(aspect),
    changedBase.final.lemma,
    changedBase.final.irregular
  );
  if (!aspectResult.ok) {
    return aspectResult;
  }
  const basePrefix = `${changedBase.prefix}${aspectResult.base.prefix}`;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: basePrefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: aspect.source.tokens,
    splitFinal: "none"
  });
  const { sourceTrace: _carried, ...aspectRest } = aspectResult;
  void _carried;
  return {
    ...aspectRest,
    base: {
      ...aspectResult.base,
      prefix: basePrefix
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function sourceVerbAdjectivalTeShimauBaseResult(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (aspect.aspect !== "te_shimau") {
    return null;
  }
  const changedBase = stateChangeBase(inputBase, "adjectival");
  const aspectResult = aspectBaseResult(simpleAspectWithoutSemantic(aspect), changedBase.final.lemma, changedBase.final.irregular);
  if (!aspectResult.ok) {
    return aspectResult;
  }
  const basePrefix = `${changedBase.prefix}${aspectResult.base.prefix}`;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: basePrefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: aspect.source.tokens,
    splitFinal: "none"
  });
  const { sourceTrace: _carried, ...aspectRest } = aspectResult;
  void _carried;
  return {
    ...aspectRest,
    base: {
      ...aspectResult.base,
      prefix: basePrefix
    },
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function simpleAspectWithDropAuxSemantic(aspect: SimpleAspectOp): SimpleAspectOp {
  return {
    ...aspect,
    semantic: {
      reading: aspect.semantic?.reading ?? "generic",
      ...(aspect.semantic === undefined ? {} : aspect.semantic),
      renderStrategy: "drop_aux"
    }
  };
}

export function simpleAspectWithoutSemantic(aspect: SimpleAspectOp): SimpleAspectOp {
  if (aspect.semantic === undefined) {
    return aspect;
  }
  const { semantic: _semantic, ...withoutSemantic } = aspect;
  void _semantic;
  return withoutSemantic;
}

export function normalizeSimpleAspectForComposedInput(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): SimpleAspectOp {
  if (
    aspect.aspect !== "te_iru" ||
    inputBase.policy === undefined
  ) {
    return aspect;
  }
  if (inputBase.policy.kind === "voice" && inputBase.policy.voice === "passive") {
    if (inputBase.policy.reportingPassive === true) {
      if (inputBase.final.lemma === "알려지다") {
        return withPassiveResultativeTeIruSemantic(aspect);
      }
      if (composedInputTeIruSemanticShouldBeCleared(aspect)) {
        const { semantic: _semantic, ...withoutSemantic } = aspect;
        void _semantic;
        return withoutSemantic;
      }
      return aspect;
    }
    if (inputBase.policy.passiveClass === "resultative_state") {
      return withPassiveResultativeTeIruSemantic(aspect);
    }
    return aspect;
  }
  if (
    inputBase.policy.kind === "completion" &&
    aspect.semantic?.renderStrategy === "negative_completion"
  ) {
    return aspect;
  }
  if (aspect.semantic === undefined) {
    return aspect;
  }
  if (
    aspect.semantic.renderStrategy === "negative_completion" ||
    aspect.semantic.renderStrategy === "negative_inability" ||
    aspect.semantic.renderStrategy === "negative_long_negation" ||
    aspect.semantic.renderStrategy === "negative_resultative_state" ||
    aspect.semantic.renderStrategy === "resultative_state"
  ) {
    if (aspect.semantic.role === "state_change_carrier_result") {
      return aspect;
    }
    const { semantic: _semantic, ...withoutSemantic } = aspect;
    void _semantic;
    return withoutSemantic;
  }
  return aspect;
}

function composedInputTeIruSemanticShouldBeCleared(aspect: SimpleAspectOp): boolean {
  return aspect.semantic?.renderStrategy === "negative_completion" ||
    aspect.semantic?.renderStrategy === "negative_inability" ||
    aspect.semantic?.renderStrategy === "negative_long_negation" ||
    aspect.semantic?.renderStrategy === "negative_resultative_state" ||
    aspect.semantic?.renderStrategy === "resultative_state";
}

function withPassiveResultativeTeIruSemantic(aspect: SimpleAspectOp): SimpleAspectOp {
  if (aspect.aspect !== "te_iru") {
    return aspect;
  }
  const renderStrategy = aspect.semantic?.renderStrategy ?? null;
  if (renderStrategy !== null && renderStrategy !== "resultative_state" && renderStrategy !== "negative_resultative_state") {
    return aspect;
  }
  return {
    ...aspect,
    semantic: {
      reading: "resultative_state",
      ...(aspect.semantic?.particle === undefined ? {} : { particle: aspect.semantic.particle }),
      role: aspect.semantic?.role ?? "passive_te_iru_resultative",
      renderStrategy: renderStrategy ?? "resultative_state",
      projection: aspect.semantic?.projection ?? "default"
    }
  };
}

export function completionTeIruNegativeAspectForComposedInput(
  aspect: SimpleAspectOp,
  inputBase: KoreanLemmaPredicateBase
): SimpleAspectOp {
  if (
    aspect.aspect !== "te_iru" ||
    inputBase.policy?.kind !== "completion" ||
    inputBase.policy.teIruNegativeStrategy !== "negative_completion"
  ) {
    return aspect;
  }
  return {
    ...aspect,
    semantic: {
      reading: "negative_completion",
      role: "completion_te_iru_negative",
      renderStrategy: "negative_completion",
      projection: "default"
    }
  };
}

function aspectFinalNegationLoweringPolicy(aspect: SimpleAspectOp): FinalNegationLoweringPolicy | undefined {
  switch (aspect.semantic?.renderStrategy) {
    case "negative_completion":
      return "te_iru_negative_completion";
    case "negative_inability":
      return "te_iru_negative_inability";
    case "negative_long_negation":
      return "te_iru_negative_long_negation";
    default:
      return undefined;
  }
}

function teIruNegativePredicatePolicy(
  aspect: SimpleAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null
): PredicateBasePolicy | undefined {
  switch (aspect.semantic?.renderStrategy) {
    case "negative_completion":
      const completionFocusParticle = teIruAuxiliaryNegationFocusParticle(aspect);
      return {
        kind: "te_iru_negative",
        mode: "completion",
        stemLemma,
        stemIrregular,
        completionAttributiveProjection:
          aspect.semantic.role === "completion_te_iru_negative" || completionFocusParticle !== undefined
            ? "long"
            : "short",
        ...(completionFocusParticle === undefined
          ? {}
          : { negativeFocusParticle: completionFocusParticle }),
      };
    case "negative_inability": {
      const negativeFocusParticle = teIruAuxiliaryNegationFocusParticle(aspect);
      return {
        kind: "te_iru_negative",
        mode: "inability",
        stemLemma,
        stemIrregular,
        ...(negativeFocusParticle === undefined ? {} : { negativeFocusParticle }),
      };
    }
    case "negative_long_negation": {
      const negativeFocusParticle = teIruAuxiliaryNegationFocusParticle(aspect);
      return {
        kind: "te_iru_negative",
        mode: "long_negation",
        stemLemma,
        stemIrregular,
        ...(negativeFocusParticle === undefined ? {} : { negativeFocusParticle }),
      };
    }
    default:
      return undefined;
  }
}

export function teIruAuxiliaryNegationFocusParticle(aspect: SimpleAspectOp): NegationFocusParticle | undefined {
  if (aspect.teFocusTarget !== "aspect_auxiliary_negation") {
    return undefined;
  }
  return negationFocusParticleForMarker(aspect.teFocusParticle) ?? undefined;
}

function teIruAttributiveContractionPolicy(
  aspect: SimpleAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  lookups?: LookupTables
): PredicateBasePolicy | undefined {
  if (aspect.aspect !== "te_iru" && aspect.aspect !== "tsutsu_aru") return undefined;
  const reading = aspect.semantic?.reading ?? "generic";
  if (reading !== "generic" && reading !== "progressive") return undefined;
  const strategy = aspect.semantic?.renderStrategy;
  if (strategy === "drop_aux" || strategy === "contract_to_past" || strategy === "attributive_drop_aux") return undefined;
  if (lookups !== undefined) {
    const blocked = lookups.named("verb.te_iru_attributive_contraction_blocked");
    if (blocked !== undefined && lookupSetMatches(blocked, stemLemma)) return undefined;
  }
  return { kind: "te_iru_attributive_contraction", stemLemma, stemIrregular };
}

function aspectProjectionPolicy(aspect: SimpleAspectOp): AspectProjectionPolicy {
  return aspect.semantic?.projection ?? "default";
}

export function aspectContractsToPast(aspect: SimpleAspectOp): boolean {
  return aspect.semantic?.renderStrategy === "contract_to_past";
}

function passiveVoicePolicy(voice: VoiceOp): PredicateBasePolicy {
  return {
    kind: "voice",
    voice: voice.voice,
    ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass }),
    adversativePassive: voice.adversativePassive,
    adversativePassiveAgentPromoted: voice.adversativePassiveAgentPromoted,
    ...(voice.adversativePassiveBaseLemma === undefined
      ? {}
      : {
        adversativePassiveBaseLemma: voice.adversativePassiveBaseLemma,
        adversativePassiveBaseIrregular: irregularFrom(voice.adversativePassiveBaseIrregular ?? null)
      })
  };
}

export function desireBase(
  stemLemma: string,
  stemIrregular: IrregularType | null
): KoreanPredicateBase {
  return {
    prefix: `${conjugate(stemLemma, stemIrregular, "고")} `,
    final: { kind: "lemma", lemma: "싶다", irregular: null, isVerb: false },
    policy: { kind: "desire", nodaConnectiveFlatten: true }
  };
}

export function desireBaseResult(
  stemLemma: string,
  stemIrregular: IrregularType | null
): BaseResult {
  return {
    ok: true,
    base: desireBase(stemLemma, stemIrregular),
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
}

function composeDesiderativeStem(
  stemLemma: string,
  stemIrregular: IrregularType | null
): string {
  const stemKi = conjugate(stemLemma, stemIrregular, "기");
  return stemKi.replace(/기$/, "길");
}

function desiderativeBaseForStem(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  preModalNeg: NegationOp | null
): KoreanPredicateBase | null {
  if (preModalNeg !== null) {
    if (preModalNeg.chainPast) {
      return null;
    }
    const negBase = applyNegationDepthToLemmaBase({
      prefix: "",
      final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
    }, preModalNeg.chainDepth);
    if (negBase === null) {
      return null;
    }
    return {
      prefix: `${negBase.prefix}${composeDesiderativeStem(negBase.final.lemma, negBase.final.irregular)} `,
      final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
      policy: { kind: "desire", nodaConnectiveFlatten: true }
    };
  }
  return {
    prefix: `${composeDesiderativeStem(stemLemma, stemIrregular)} `,
    final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
    policy: { kind: "desire", nodaConnectiveFlatten: true }
  };
}

export function desiderativeBaseResultForStem(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  preModalNeg: NegationOp | null
): BaseResult {
  const base = desiderativeBaseForStem(stemLemma, stemIrregular, preModalNeg);
  if (base === null) {
    return { ok: false, reason: "V past-neg + desiderative 합성 영역 외" };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
}

export function desiderativeBaseFromPredicateBase(
  predicate: KoreanLemmaPredicateBase,
  desiredPredicateNegation: NegationOp | null = null
): KoreanLemmaPredicateBase | null {
  const desiredPredicate = desiredPredicateNegation === null
    ? predicate
    : applyNegationDepthToLemmaBase(predicate, desiredPredicateNegation.chainDepth);
  if (desiredPredicate === null) {
    return null;
  }
  return {
    prefix: `${desiredPredicate.prefix}${composeDesiderativeStem(desiredPredicate.final.lemma, desiredPredicate.final.irregular)} `,
    final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
    policy: {
      kind: "desire",
      nodaConnectiveFlatten: true,
      requestComplementBase: predicate,
      ...(desiredPredicateNegation === null
        ? {}
        : { requestComplementMode: "prohibition" as const })
    }
  };
}

export function benefactiveDesiderativeRequestBase(
  benefactivePredicate: KoreanLemmaPredicateBase
): KoreanLemmaPredicateBase {
  const requestStem = composeDesiderativeStem(
    benefactivePredicate.final.lemma,
    benefactivePredicate.final.irregular
  );
  const requestPhrase = compactEmbeddedGiveDesiderativePhrase(
    `${benefactivePredicate.prefix}${requestStem}`,
    benefactivePredicate.policy?.kind === "benefactive" &&
    benefactivePredicate.policy.lexicalTailAbsorptionKind === "embedded_juda"
  );
  return {
    prefix: `${requestPhrase} `,
    final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
    policy: {
      kind: "desire",
      nodaConnectiveFlatten: true,
      requestComplementBase: benefactivePredicate
    }
  };
}

function compactEmbeddedGiveDesiderativePhrase(phrase: string, enabled: boolean): string {
  return enabled ? phrase.replace(/ 주길$/u, "주길") : phrase;
}

export function miseruBase(
  miseru: MiseruAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null
): KoreanPredicateBase {
  if (miseru.semantic?.reading === "volitional_showing") {
    return {
      prefix: `${conjugate(stemLemma, stemIrregular, "아/어")} `,
      final: { kind: "lemma", lemma: "보이다", irregular: null, isVerb: true },
      capabilities: { prohibitionHost: "action" }
    };
  }
  return {
    prefix: `${conjugate(stemLemma, stemIrregular, "고")} `,
    final: { kind: "lemma", lemma: "보여주다", irregular: null, isVerb: true },
    capabilities: { prohibitionHost: "action" }
  };
}

function shouldFlattenNodaConnectiveToHost(
  policy: PredicateBasePolicy | undefined,
  lemma: string
): boolean {
  if (policy?.kind === "desire") {
    return true;
  }
  if (policy?.kind === "likeness" && policy.nodaConnectiveFlatten !== undefined) {
    return true;
  }
  return isBenefactiveNegativeCarrierPolicy(policy, lemma);
}

function hazuNegativeScopeNoun(modal: HazuModalOp): "리" | "리는" {
  return modal.source.tokens.some(isTopicOrJaFusionSurfaceToken)
    ? "리는"
    : "리";
}

function modalSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  carrierPrefix: string,
  options: {
    readonly carrierSourceTokens?: readonly RuntimeHaruToken[];
    readonly finalSourceTokens?: readonly RuntimeHaruToken[];
    readonly finalKind?: TailTraceSegmentKind;
    readonly suppressCarrierBoundaryAfter?: boolean;
  } = {}
): BaseSourceTrace {
  const carrierSourceTokens = options.carrierSourceTokens ?? modal.source.tokens;
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (carrierPrefix.length > 0) {
    carrierPrefixSegments.push({
      text: carrierPrefix,
      sourceTokens: carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic",
      suppressBoundaryAfter: options.suppressCarrierBoundaryAfter ?? true
    });
  }
  return {
    inputProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: options.finalSourceTokens ?? modal.source.tokens,
    finalKind: options.finalKind ?? "modal"
  };
}

function carrierCopulaSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  carrierPrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  return modalSourceTrace(modal, inputProjectionText, carrierPrefix, {
    carrierSourceTokens: split.carrierSourceTokens,
    finalSourceTokens: split.finalSourceTokens,
    suppressCarrierBoundaryAfter: !split.hasInternalBoundary
  });
}

function scopeNounCopulaNegativeSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  nounPrefix: string,
  copulaBridgePrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (nounPrefix.length > 0) {
    carrierPrefixSegments.push({
      text: nounPrefix,
      sourceTokens: split.carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic",
      suppressBoundaryAfter: !split.hasInternalBoundary
    });
  }
  if (copulaBridgePrefix.length > 0) {
    carrierPrefixSegments.push({
      text: copulaBridgePrefix,
      sourceTokens: split.finalSourceTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

export function splitCarrierCopulaModalSource(tokens: readonly RuntimeHaruToken[]): {
  readonly carrierSourceTokens: readonly RuntimeHaruToken[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
  readonly hasInternalBoundary: boolean;
} {
  const copulaIndex = tokens.findIndex((token, index) => index > 0 && isCopulaCarrierTailToken(token));
  if (copulaIndex <= 0) {
    return {
      carrierSourceTokens: tokens,
      finalSourceTokens: tokens,
      hasInternalBoundary: false
    };
  }
  return {
    carrierSourceTokens: tokens.slice(0, copulaIndex),
    finalSourceTokens: tokens.slice(copulaIndex),
    hasInternalBoundary: true
  };
}

function isCopulaCarrierTailToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.normalizedForm || token.surface;
  return form === "だ" || form === "です" || isCopulaJaNegativeBridgeToken(token);
}

export { copulaCarrierBaseForInterOp } from "./base-support.js";

export function copulaCarrierConjectureBase(
  inputBase: KoreanLemmaPredicateBase,
  conjecture: ConjectureOp,
  past = false
): OkBaseResult | null {
  if (
    inputBase.final.lemma !== "이다" ||
    inputBase.final.irregular !== null
  ) {
    return null;
  }
  if (inputBase.prefix.length === 0) {
    return null;
  }
  const batchim = hasAllomorphBatchim(predicateBasePolicyAllomorphHost(inputBase));
  const stem = past
    ? `${inputBase.prefix}${batchim ? "이었겠" : "였겠"}`
    : `${inputBase.prefix}${batchim ? "이겠" : "겠"}`;
  return {
    ok: true,
    base: {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: `${stem}다`,
        irregular: null,
        isVerb: false,
        idiom: { kind: "conjecture", conjecturePolite: conjecture.polite }
      },
      ...(inputBase.policy === undefined
        ? {}
        : inputBase.policy.kind === "noun_copula_interop" || inputBase.policy.kind === "negative_noun_copula_interop"
          ? { policy: { ...inputBase.policy, conjectureHostPast: past } }
          : { policy: inputBase.policy })
    }
  };
}


function nodaCarrierBoundNounHost(base: KoreanLemmaPredicateBase): {
  readonly policy: ScopeCarrierPolicy;
  readonly hostPrefix: string;
} | null {
  const policy = base.policy;
  if (
    policy?.kind !== "scope_carrier" ||
    policy.carrier !== "noda" ||
    (policy.nounSurface !== NODA_CARRIER_BOUND_NOUN && policy.nounSurface !== NODA_CARRIER_BOUND_NOUN_CASUAL) ||
    base.final.lemma !== "이다" ||
    base.final.irregular !== null ||
    policy.hostPrefix === undefined
  ) {
    return null;
  }
  return { policy, hostPrefix: policy.hostPrefix };
}

export function nodaCarrierConjectureBase(
  inputBase: KoreanLemmaPredicateBase,
  conjecture: ConjectureOp
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  const nominal = `${host.hostPrefix}${NODA_CARRIER_BOUND_NOUN}`;
  return {
    ok: true,
    base: {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: `${nominal}이겠다`,
        irregular: null,
        isVerb: false,
        idiom: {
          kind: "conjecture",
          conjecturePolite: conjecture.polite,
          projection: "nominalized"
        }
      },
      policy: host.policy
    },
    chainOnFinalSupported: false
  };
}

export function nodaCarrierLikenessBase(
  inputBase: KoreanLemmaPredicateBase
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  return {
    ok: true,
    base: {
      prefix: `${host.hostPrefix}${NODA_CARRIER_BOUND_NOUN} `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: { kind: "likeness" }
    }
  };
}

export function quotedPropositionLikenessBase(
  inputBase: KoreanPredicateBase,
  modal: YoudaModalOp | RashiiModalOp,
  formal: boolean,
  pastProjection: AttributivePastProjection
): OkBaseResult | null {
  if (
    inputBase.policy?.kind !== "quoted_proposition" ||
    inputBase.policy.attributiveQuote?.realizesInterrogativeMood !== true ||
    !quotedPropositionAttributiveIsReused(inputBase, false, "present")
  ) {
    return null;
  }
  const hostAttr = projectBaseAttributive(inputBase, false, formal, pastProjection, "default", "present");
  if (hostAttr === null) {
    return null;
  }
  const attributiveLexicalization = modal.modal === "youda"
    ? likenessAttributiveLexicalizationBase(modal, hostAttr)
    : undefined;
  return {
    ok: true,
    base: {
      prefix: `${hostAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: {
        kind: "likeness",
        ...(attributiveLexicalization === undefined ? {} : { attributiveLexicalization })
      }
    }
  };
}

export function wakeCarrierConjectureBase(
  inputBase: KoreanPredicateBase,
  conjecture: ConjectureOp
): OkBaseResult | null {
  if (
    inputBase.policy?.kind !== "scope_carrier" ||
    inputBase.policy.carrier !== "wake" ||
    inputBase.final.kind !== "boundNounCopula"
  ) {
    return null;
  }
  const noun = inputBase.final.nounSurface;
  const stem = hasBatchim(noun) ? `${noun}이겠` : `${noun}겠`;
  return {
    ok: true,
    base: {
      prefix: inputBase.prefix,
      final: {
        kind: "lemma",
        lemma: `${stem}다`,
        irregular: null,
        isVerb: false,
        idiom: { kind: "conjecture", conjecturePolite: conjecture.polite }
      },
      policy: inputBase.policy
    },
    chainOnFinalSupported: false
  };
}

export function nodaCarrierAbsorbedByHostBoundNoun(
  inputBase: KoreanLemmaPredicateBase,
  modal: NodaModalOp
): OkBaseResult | null {
  const policy = inputBase.policy;
  if (
    policy?.kind !== "noun_copula_interop" ||
    policy.nounSurface !== NODA_CARRIER_BOUND_NOUN ||
    inputBase.final.lemma !== "이다" ||
    inputBase.final.irregular !== null
  ) {
    return null;
  }
  const hostPrefix = policy.hostPrefix;
  if (nodaCarrierHasSupportConjecture(modal)) {
    return {
      ok: true,
      base: {
        prefix: "",
        final: {
          kind: "lemma",
          lemma: `${inputBase.prefix}이겠다`,
          irregular: null,
          isVerb: false,
          idiom: {
            kind: "conjecture",
            conjecturePolite: modal.polite,
            projection: "nominalized"
          }
        },
        policy: {
          kind: "scope_carrier",
          carrier: "noda",
          nounSurface: policy.nounSurface,
          hostPrefix,
          style: "emphasis"
        }
      },
      chainOnFinalSupported: false
    };
  }
  const carrierStyle = nodaCarrierStyle(modal);
  return {
    ok: true,
    base: scopeCarrierCopulaBase(
      "noda",
      policy.nounSurface,
      hostPrefix,
      carrierStyle === undefined
        ? {}
        : { style: carrierStyle, connectiveSourcePoliteness: "preserve_when_supported" }
    )
  };
}

export function nodaCarrierKamoBase(
  inputBase: KoreanLemmaPredicateBase,
  formal: boolean,
  hostPast: boolean,
  bare: boolean
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  const hostPrefix = host.hostPrefix;
  const emphasis = host.policy.style === "emphasis";
  const contracted =
    !emphasis && !formal && host.policy.nounSurface === NODA_CARRIER_BOUND_NOUN_CASUAL;
  let nominal: string;
  if (hostPast) {
    nominal = contracted
      ? `${hostPrefix}거였을`
      : `${hostPrefix}것이었을`;
  } else if (contracted) {
    nominal = `${hostPrefix}걸`;
  } else {
    nominal = `${hostPrefix}것일`;
  }
  return {
    ok: true,
    ...(bare ? { terminalRealization: { kind: "elided_carrier" as const } } : {}),
    base: {
      prefix: `${nominal}지도 `,
      final: { kind: "lemma", lemma: "모르다", irregular: "르", isVerb: true }
    }
  };
}

function isScopeLikeNoHost(base: KoreanPredicateBase): boolean {
  return base.final.kind === "lemma" &&
    (base.final.lemma === "없다" || base.final.lemma === "아니다" || base.final.lemma === "않다");
}

function scopeCarrierSupportsExternalChain(base: KoreanPredicateBase): boolean {
  return base.policy?.kind === "scope_carrier" &&
    (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula");
}

export function modalFinalChainPolicy(base: KoreanPredicateBase): {
  readonly chainOnFinalSupported: boolean;
  readonly finalNegationOptions?: NegationLoweringOptions;
} {
  if (scopeCarrierSupportsExternalChain(base)) {
    return { chainOnFinalSupported: true };
  }
  if (
    base.policy?.kind === "reporting" &&
    base.final.kind === "lemma" &&
    base.final.lemma === "하다"
  ) {
    return { chainOnFinalSupported: true };
  }
  if (base.final.kind !== "lemma") {
    return { chainOnFinalSupported: false };
  }
  switch (base.final.lemma) {
    case "모르다":
      return {
        chainOnFinalSupported: true,
        finalNegationOptions: KAMO_FINAL_NEGATION_OPTIONS
      };
    case "없다":
    case "아니다":
    case "같다":
    case "보이다":
      return { chainOnFinalSupported: true };
    default:
      return { chainOnFinalSupported: false };
  }
}

function soudaHearsaySourceTrace(
  modal: SoudaHearsayModalOp,
  inputProjectionText: string,
  carrierPrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  return {
    inputProjectionText,
    carrierPrefixSegments: [
      {
        text: carrierPrefix,
        sourceTokens: split.carrierSourceTokens,
        kind: "modal",
        projectionConfidence: "semantic",
        suppressBoundaryAfter: !split.hasInternalBoundary
      },
      {
        text: " ",
        sourceTokens: [],
        kind: "punctuation",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

export function soudaHearsayBaseFromPredicateBase(
  base: KoreanPredicateBase,
  finalNeg: NegationOp | null,
  past: boolean,
  lookups: LookupTables,
  modal?: SoudaHearsayModalOp
): BaseResult {
  if (finalNeg === null && !past && base.final.kind === "nounCopula") {
    const noun = `${base.prefix}${base.final.nounSurface}`;
    const carrierPrefix = hasBatchim(`${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`) ? "이라고" : "라고";
    return {
      ok: true,
      base: {
        prefix: `${noun}${carrierPrefix} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
        policy: { kind: "reporting", family: "souda_hearsay" }
      },
      ...(modal === undefined ? {} : {
        sourceTrace: soudaHearsaySourceTrace(modal, noun, carrierPrefix)
      })
    };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    finalNeg,
    past,
    true,
    false,
    lookups
  );
  if (!rendered.ok) {
    return { ok: false, reason: `souda hearsay quote base render failed: ${rendered.reason}` };
  }
  const trace = quotePlainDeclarativeTraceParts(rendered.text, { ...copularQuoteOption(base) });
  return {
    ok: true,
    base: {
      prefix: `${trace.inputProjectionText}${trace.carrierPrefix} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: { kind: "reporting", family: "souda_hearsay" }
    },
    ...(modal === undefined ? {} : {
      sourceTrace: soudaHearsaySourceTrace(modal, trace.inputProjectionText, trace.carrierPrefix)
    })
  };
}

function limitNegationPropositionParts(
  text: string,
  formal: boolean,
  options: { readonly copularLemma?: string } = {}
): { readonly inputProjectionText: string; readonly carrierPrefix: string } {
  const quotedCopula = formal ? "라는" : "란";
  if (options.copularLemma !== undefined && text.endsWith(options.copularLemma)) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("아니다")) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return { inputProjectionText: stem, carrierPrefix: `${hasBatchim(stem) ? "이" : ""}${quotedCopula}` };
  }
  if (text.endsWith("거다")) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("다")) {
    return formal
      ? { inputProjectionText: text, carrierPrefix: "는" }
      : { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: "단" };
  }
  return { inputProjectionText: text, carrierPrefix: quotedCopula };
}

function limitNegationSourceTrace(
  modal: LimitNegationModalOp,
  proposition: { readonly inputProjectionText: string; readonly separableCarrier: string | null },
  scopeNoun: string
): BaseSourceTrace {
  const [quoteToken, focusToken, ...finalTokens] = modal.source.tokens;
  const scopeTokens = proposition.separableCarrier === null
    ? [quoteToken, focusToken].filter((token) => token !== undefined)
    : [focusToken].filter((token) => token !== undefined);
  return {
    inputProjectionText: proposition.inputProjectionText,
    carrierPrefixSegments: [
      ...(proposition.separableCarrier === null
        ? []
        : [{
          text: proposition.separableCarrier,
          sourceTokens: quoteToken === undefined ? [] : [quoteToken],
          kind: "modal" as const,
          projectionConfidence: "semantic" as const
        }]),
      {
        text: ` ${scopeNoun}`,
        sourceTokens: scopeTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      },
      {
        text: " ",
        sourceTokens: [],
        kind: "punctuation",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: finalTokens.length > 0 ? finalTokens : modal.source.tokens,
    finalKind: "modal"
  };
}

export function limitNegationBaseFromPredicateBase(opts: {
  readonly modal: LimitNegationModalOp;
  readonly base: KoreanPredicateBase;
  readonly preNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const scopeNoun = opts.modal.focus === "mo" ? "법도" : "법은";
  const base: KoreanPredicateBase = opts.past && opts.base.policy?.kind === "noun_copula_interop"
    ? {
      prefix: "",
      final: {
        kind: "nounCopula",
        nounSurface: opts.base.policy.nounSurface,
        isBoundNoun: opts.base.policy.isBoundNoun
      },
      policy: opts.base.policy
    }
    : opts.base;
  const parts = (() => {
    if (opts.preNeg === null && !opts.past && base.final.kind === "nounCopula") {
      const allomorphHost = `${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`;
      const quotedCopula = opts.formal ? "라는" : "란";
      return {
        ok: true as const,
        inputProjectionText: `${base.prefix}${base.final.nounSurface}`,
        carrierPrefix: `${hasBatchim(allomorphHost) ? "이" : ""}${quotedCopula}`,
        separable: true
      };
    }
    const rendered = composeBaseWithTerminalChain(base, opts.preNeg, opts.past, true, false, opts.lookups);
    if (!rendered.ok) {
      return { ok: false as const, reason: `limit negation proposition render failed: ${rendered.reason}` };
    }
    return { ok: true as const, ...limitNegationPropositionParts(rendered.text, opts.formal, { ...copularQuoteOption(base) }), separable: false };
  })();
  if (!parts.ok) {
    return parts;
  }
  const inputPrefix = opts.base.prefix;
  const projectionText = parts.inputProjectionText.startsWith(inputPrefix)
    ? parts.inputProjectionText.slice(inputPrefix.length)
    : parts.inputProjectionText;
  return {
    ok: true,
    base: {
      prefix: `${parts.inputProjectionText}${parts.carrierPrefix} ${scopeNoun} `,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    sourceTrace: limitNegationSourceTrace(
      opts.modal,
      parts.separable
        ? { inputProjectionText: projectionText, separableCarrier: parts.carrierPrefix }
        : { inputProjectionText: `${projectionText}${parts.carrierPrefix}`, separableCarrier: null },
      scopeNoun
    )
  };
}

function soudaYotaiBaseFromStem(opts: {
  readonly modal: SoudaHearsayModalOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly sourceStemIsVerb?: boolean;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const sourceHostIsVerbal = opts.sourceStemIsVerb ?? (opts.stemKind === "verb");
  const nounCopulaHost = opts.inputPolicy?.kind === "noun_copula_interop" && opts.preModalNeg === null;
  const hostAttributive = (attrPolicy: "future" | "present"): string => modalInputStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: opts.stemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy,
    useShortHint: false,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit,
    ...(opts.inputPolicy === undefined ? {} : { inputPolicy: opts.inputPolicy })
  });
  const adverbialLexicalization: KoreanLemmaPredicateBase = {
    prefix: `${hostAttributive(sourceHostIsVerbal ? "future" : "present")} `,
    final: { kind: "lemma", lemma: "듯하다", irregular: null, isVerb: false }
  };
  const yotaiPolicy = { kind: "likeness", adverbialLexicalization } as const;
  const focusNegationOptions = opts.modal.negationFocusParticle === undefined
    ? {}
    : { finalNegationOptions: { firstNegationFocusParticle: opts.modal.negationFocusParticle } };
  if (!sourceHostIsVerbal && !nounCopulaHost && opts.preModalNeg === null && !opts.past) {
    const stemForm = conjugate(opts.stemLemma, opts.stemIrregular, "아/어");
    return {
      ok: true,
      base: {
        prefix: `${stemForm} `,
        final: { kind: "lemma", lemma: "보이다", irregular: null, isVerb: true },
        policy: yotaiPolicy
      },
      sourceTrace: modalSourceTrace(opts.modal, stemForm, " "),
      ...focusNegationOptions
    };
  }
  const stemAttr = hostAttributive(nounCopulaHost ? "present" : "future");
  return {
    ok: true,
    base: {
      prefix: `${stemAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: yotaiPolicy
    },
    sourceTrace: modalSourceTrace(opts.modal, stemAttr, " 것 "),
    ...focusNegationOptions
  };
}

function tsumoriBaseFromStem(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly modal: TsumoriModalOp;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceHostHasTeIruAspect?: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  if (opts.stemKind !== "verb" && opts.sourceStemIsVerb !== true) {
    return { ok: false, reason: "tsumori on adjective stem not supported (의도/가정 표현은 V 만)" };
  }

  const assumptionReading = opts.modal.reading === "counterfactual_assumption" ||
    opts.sourceHostHasTeIruAspect === true;
  const noun = opts.modal.reading === "counterfactual_assumption" ? "셈" : "생각";
  const sourceStemKind = opts.sourceStemIsVerb === true ? "verb" : opts.stemKind;
  const stemAttr = pastNegStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: sourceStemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy: assumptionReading ? "present" : "future",
    useShortHint: assumptionReading,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit
  });

  switch (opts.modal.variant) {
    case "affirmative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} `,
          final: { kind: "nounCopula", nounSurface: noun, isBoundNoun: false }
        },
        sourceTrace: carrierCopulaSourceTrace(opts.modal, stemAttr, ` ${noun}`)
      };
    case "topic_negative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} ${noun}은 `,
          final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
        },
        sourceTrace: modalSourceTrace(opts.modal, stemAttr, ` ${noun}은 `)
      };
    case "copula_negative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} ${noun}이 `,
          final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
        },
        sourceTrace: scopeNounCopulaNegativeSourceTrace(opts.modal, stemAttr, ` ${noun}`, "이 ")
      };
    default:
      return assertNever(opts.modal.variant);
  }
}

function potentialTailBase(
  stemAttr: string,
  postIdiomChainDepth: number,
  particleKind: string = "ga",
  focusParticle: string | null = null,
  stemLemma?: string,
  stemIrregular?: IrregularType | null,
  negativeLowering?: Extract<PredicateBasePolicy, { readonly kind: "potential" }>["negativeLowering"]
): KoreanLemmaPredicateBase | null {
  const committedBase: KoreanLemmaPredicateBase = {
    prefix: `${stemAttr} 수${potentialParticleInfix(particleKind, focusParticle)}`,
    final: {
      kind: "lemma",
      lemma: "있다",
      irregular: null,
      isVerb: false
    },
    policy: {
      kind: "potential",
      ...(stemLemma !== undefined ? { stemLemma } : {}),
      ...(stemIrregular !== undefined ? { stemIrregular } : {}),
      ...(negativeLowering === undefined ? {} : { negativeLowering })
    }
  };
  if (postIdiomChainDepth === 0) {
    return committedBase;
  }
  return lowerPotentialFinalNegationBase(committedBase, postIdiomChainDepth);
}

export function potentialBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly sourceStemIsVerb?: boolean;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly postIdiomChainDepth: number;
  readonly particleKind?: string;
  readonly focusParticle?: string | null;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const {
    stemLemma, stemIrregular, isVerb, sourceStemIsVerb = isVerb, preStemNeg, stemPast, postIdiomChainDepth,
    particleKind = "ga", focusParticle = null, sourceTokens, lookups, sahenShortNegationSplit
  } = opts;
  if (!sourceStemIsVerb) {
    return { ok: false, reason: "potential_koto_ga_dekiru requires source verbal predicate" };
  }
  let stemAttr: string;
  if (preStemNeg !== null) {
    stemAttr = pastNegStemAttributive({
      stemLemma, stemIrregular, stemKind: isVerb ? "verb" : "adj", past: stemPast, preModalNeg: preStemNeg,
      attrPolicy: "future", useShortHint: false, lookups, sahenShortNegationSplit
    });
  } else {
    stemAttr = stemPast
      ? `${conjugate(stemLemma, stemIrregular, "았/었")}을`
      : conjugate(stemLemma, stemIrregular, "ㄹ/을");
  }
  const tailBase = potentialTailBase(stemAttr, postIdiomChainDepth, particleKind, focusParticle, stemLemma, stemIrregular);
  if (tailBase === null) {
    return { ok: false, reason: "chain ≥ 2 on potential lowering invariant violation" };
  }
  const sourceTrace = sourceTokens === undefined
    ? undefined
    : potentialKotoGaDekiruSourceTrace(sourceTokens, stemAttr, particleKind, focusParticle);
  return {
    ok: true,
    base: tailBase,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function potentialObjectBaseFromAttributive(opts: {
  readonly stemAttr: string;
  readonly postIdiomChainDepth: number;
  readonly particleKind?: string;
  readonly focusParticle?: string | null;
  readonly stemLemma?: string;
  readonly stemIrregular?: IrregularType | null;
}): BaseResult {
  const objectHost = `${opts.stemAttr} 것${potentialObjectParticleSuffix(
    opts.particleKind ?? "ga",
    opts.focusParticle ?? null
  )}할`;
  const tailBase = potentialTailBase(
    objectHost,
    opts.postIdiomChainDepth,
    "ga",
    null,
    opts.stemLemma,
    opts.stemIrregular,
    "su_eopda"
  );
  if (tailBase === null) {
    return { ok: false, reason: "chain ≥ 2 on attributive object potential lowering invariant violation" };
  }
  return {
    ok: true,
    base: tailBase,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom"
  };
}

function potentialObjectParticleSuffix(
  particleKind: string,
  focusParticle: string | null
): string {
  if (focusParticle !== null) {
    return potentialParticleInfix(particleKind, focusParticle);
  }
  if (particleKind === "wa") {
    return `${selectParticle("것", "은/는")} `;
  }
  if (particleKind === "mo") {
    return "도 ";
  }
  return `${selectParticle("것", "을/를")} `;
}

function potentialKotoGaDekiruSourceTrace(
  sourceTokens: readonly RuntimeHaruToken[],
  stemProjectionText: string,
  particleKind: string,
  focusParticle: string | null
): BaseSourceTrace | undefined {
  const split = splitPotentialKotoGaDekiruSourceTokens(sourceTokens);
  if (split === null) {
    return undefined;
  }
  const infix = potentialParticleInfix(particleKind, focusParticle);
  const particleTokens = split.carrierTokens.slice(1);
  const carrierPrefixSegments: TailTraceSegment[] = [{
    text: " 수",
    sourceTokens: split.carrierTokens.slice(0, 1),
    kind: "modal",
    projectionConfidence: "semantic"
  }];
  if (infix.length > 0) {
    carrierPrefixSegments.push({
      text: infix,
      sourceTokens: particleTokens.length > 0 ? particleTokens : split.carrierTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText: stemProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function splitPotentialKotoGaDekiruSourceTokens(
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly carrierTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] } | null {
  const dekiruIdx = sourceTokens.findIndex((token, index) =>
    index > 0 &&
    (token.dictionaryForm === "できる" ||
      token.dictionaryForm === "出来る" ||
      token.surface === "でき" ||
      token.surface === "出来")
  );
  if (dekiruIdx <= 0) {
    return null;
  }
  return {
    carrierTokens: sourceTokens.slice(0, dekiruIdx),
    finalTokens: sourceTokens.slice(dekiruIdx)
  };
}

export function negativeNecessityKotoWaBase(opts: {
  readonly op: NegativeNecessityKotoWaIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  if (opts.preStemNeg !== null) {
    return { ok: false, reason: "V neg + ことはない needlessness is ambiguous; scope double negation path owns it" };
  }
  const stemAttr = projectBaseAttributive(
    opts.inputBase,
    opts.stemPast,
    opts.formal,
    opts.pastProjection
  );
  if (stemAttr === null) {
    return { ok: false, reason: "ことはない attributive projection 영역 외" };
  }
  const base: KoreanLemmaPredicateBase = {
    prefix: `${stemAttr} 일은 `,
    final: {
      kind: "lemma",
      lemma: opts.op.polarity === "negative" ? "없다" : "있다",
      irregular: null,
      isVerb: false
    }
  };
  const sourceTrace = hostProjectionSourceTrace({
    hostText: stemAttr,
    inputPrefix: opts.inputBase.prefix,
    basePrefix: base.prefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  if (opts.op.polarity === "negative") {
    return {
      ok: true,
      base,
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function wakeImpossibleBase(opts: {
  readonly op: WakeImpossibleIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const hostBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (hostBase === null) {
    return { ok: false, reason: "wake impossible host negation lowering 영역 외" };
  }
  const hostPast = opts.stemPast || (opts.preStemNeg?.chainPast ?? false);
  if (hostBase.policy?.kind === "quoted_proposition" && !hostPast) {
    const label = opts.op.focus === "mo" ? "것도" : (opts.formal ? "것은" : "건");
    const quotedPrefix = `${hostBase.policy.attributive} ${label} 안 `;
    const quotedTrace = hostProjectionSourceTrace({
      hostText: hostBase.policy.attributive,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: quotedPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "negative_nai"
    });
    return {
      ok: true,
      base: {
        prefix: quotedPrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(quotedTrace === undefined ? {} : { sourceTrace: quotedTrace })
    };
  }
  const projected = projectBaseFutureAttributive(
    hostBase,
    hostPast,
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: "wake impossible future attributive projection 영역 외" };
  }
  const basePrefix = `${projected} 수 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function wakeExplanatoryCitationBase(opts: {
  readonly op: WakeModalOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
}): BaseResult | null {
  if (
    opts.op.variant !== "explanatory" ||
    opts.op.polarity !== "affirmative" ||
    opts.preStemNeg !== null ||
    opts.stemPast ||
    opts.inputBase.policy?.kind !== "quoted_proposition"
  ) {
    return null;
  }
  const attributive = opts.inputBase.policy.attributive;
  const noun = opts.formal ? "것" : "거";
  return {
    ok: true,
    base: scopeCarrierCopulaBase("wake", noun, `${attributive} `),
    sourceTrace: carrierCopulaSourceTrace(opts.op, attributive, ` ${noun}`)
  };
}

export function onlyOptionBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly lookups: LookupTables;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  let projectionBase: KoreanLemmaPredicateBase = opts.inputBase;
  let projectionPast = opts.stemPast;
  if (opts.preStemNeg !== null) {
    const lowered = lowerFinalNegationForCommittedBase(
      { ok: true, base: opts.inputBase, chainOnFinalSupported: true },
      opts.preStemNeg,
      opts.formal,
      opts.lookups
    );
    if (lowered === null) {
      return { ok: false, reason: "only-option host negation lowering 영역 외" };
    }
    projectionBase = lowered;
    projectionPast = projectionPast || opts.preStemNeg.chainPast;
  }
  const projected = projectBaseFutureAttributive(
    projectionBase,
    projectionPast,
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: "only-option future attributive projection 영역 외" };
  }
  const basePrefix = `${projected} 수밖에 `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: projected,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "negative_nai"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function futureAttributiveNaiIdiomBase(
  idiomName: string,
  infix: string,
  requiresNeg: boolean,
  opts: {
    readonly inputBase: KoreanLemmaPredicateBase;
    readonly preStemNeg: NegationOp | null;
    readonly stemPast: boolean;
    readonly formal: boolean;
    readonly pastProjection: AttributivePastProjection;
    readonly sourceTokens?: readonly RuntimeHaruToken[];
  }
): BaseResult {
  if (requiresNeg && opts.preStemNeg === null) {
    return { ok: false, reason: `${idiomName} idiom requires negative host` };
  }
  const hostBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (hostBase === null) {
    return { ok: false, reason: `${idiomName} host negation lowering 영역 외` };
  }
  const projected = projectBaseFutureAttributive(
    hostBase,
    opts.stemPast || (requiresNeg ? opts.preStemNeg!.chainPast : (opts.preStemNeg?.chainPast ?? false)),
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: `${idiomName} future attributive projection 영역 외` };
  }
  const basePrefix = `${projected} ${infix}`;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: projected,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "negative_nai"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function inevitableZaruOEnaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("zaru-o-enai", "수밖에 ", false, opts);
}

export function cannotRefrainNegativeDewaIrarenaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("cannot-refrain", "수 ", true, opts);
}

export function methodYouGaNaiBase(opts: {
  readonly op: MethodYouGaNaiIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  const infix = opts.op.particleKind === "mo" ? "방법도 " : "방법이 ";
  return futureAttributiveNaiIdiomBase("you-ga-nai", infix, false, opts);
}

export function madeMoNaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("made-mo-nai", "필요도 ", false, opts);
}

export function permissionBase(opts: {
  readonly op: PermissionIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  return concessiveDoedaBase(opts.op.connectiveSurface, opts);
}

export function sufficiencyConditionalBase(opts: {
  readonly op: SufficiencyConditionalIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const conditional: ConnectiveOp = createConnectiveOp({

    connective: "conditional",
    surface: "ば",
    conditionalFlavor: "plain",
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    conditional,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function teEvaluationBase(opts: {
  readonly op: TeEvaluationIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const connective: ConnectiveOp = createConnectiveOp({

    connective: "te_form",
    surface: opts.op.connectiveSurface,
    teFormRole: "reason",
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    connective,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "좋다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function negativeNecessitySumuBase(opts: {
  readonly op: Extract<AuxOpNode, { readonly kind: "idiom"; readonly idiom: "negative_necessity_sumu" }>;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  if (opts.preStemNeg === null) {
    return { ok: false, reason: "negative-necessity sumu requires negative host" };
  }
  return concessiveDoedaBase("ても", opts);
}

function concessiveDoedaBase(
  surface: string,
  opts: {
    readonly op: { readonly source: ConnectiveOp["source"] };
    readonly inputBase: KoreanLemmaPredicateBase;
    readonly preStemNeg: NegationOp | null;
    readonly stemPast: boolean;
    readonly formal: boolean;
    readonly lookups: LookupTables;
  }
): BaseResult {
  const concessive: ConnectiveOp = createConnectiveOp({

    connective: "even_if",
    surface,
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    concessive,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function forbiddenBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  const { stemLemma, stemIrregular } = opts;
  const basePrefix = `${conjugate(stemLemma, stemIrregular, "면")} 안 `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : stemFusionSourceTrace(basePrefix, opts.sourceTokens, { splitFinal: "none" });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function degreeIntensifierBase(opts: {
  readonly op: DegreeIntensifierIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const reason = composeBaseWithConnective(
    opts.inputBase,
    createConnectiveOp({

      connective: "reason",
      surface: "ので",
      source: opts.op.source
    }),
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal, opts.lookups
  );
  if (!reason.ok) {
    return { ok: false, reason: `degree intensifier host reason projection failed: ${reason.reason}` };
  }
  const trace = (basePrefix: string, splitFinal: HostProjectionFinalSplit): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText: reason.text,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (opts.op.variant === "bear") {
    if (opts.op.mode === "become") {
      const basePrefix = `${reason.text} ${conjugate("못 참다", null, "게")} `;
      return {
        ok: true,
        base: {
          prefix: basePrefix,
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: DEGREE_INTENSIFIER_BASE_POLICY
        },
        chainOnFinalSupported: true,
        ...trace(basePrefix, "none")
      };
    }
    const basePrefix = `${reason.text} `;
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: opts.op.past
          ? { kind: "lemma", lemma: "못 참다", irregular: null, isVerb: true }
          : { kind: "lemma", lemma: "못 참겠다", irregular: null, isVerb: false },
        policy: DEGREE_INTENSIFIER_BASE_POLICY
      },
      chainOnFinalSupported: true,
      ...trace(basePrefix, "none")
    };
  }
  if (opts.op.mode === "become") {
    const basePrefix = `${reason.text} 어쩔 수 없게 `;
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: DEGREE_INTENSIFIER_BASE_POLICY
      },
      chainOnFinalSupported: true,
      ...trace(basePrefix, "none")
    };
  }
  const basePrefix = `${reason.text} 어쩔 수 `;
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false },
      policy: DEGREE_INTENSIFIER_BASE_POLICY
    },
    chainOnFinalSupported: true,
    ...trace(basePrefix, "negative_nai")
  };
}

export function predicateProjectionCarrierBase(opts: {
  readonly op: PredicateProjectionCarrierOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const loweredBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (loweredBase === null) {
    return { ok: false, reason: "predicate projection carrier host chain lowering not supported" };
  }
  const effectivePast = opts.stemPast || (opts.preStemNeg?.chainPast ?? false);
  const futureAttr = projectBaseFutureAttributive(
    loweredBase,
    effectivePast,
    opts.formal,
    opts.pastProjection
  );
  if (futureAttr === null) {
    return { ok: false, reason: "predicate projection carrier future attributive projection not supported" };
  }
  const trace = (
    hostText: string,
    basePrefix: string,
    splitFinal: HostProjectionFinalSplit
  ): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (
    opts.op.carrier === "degree_extent" ||
    opts.op.carrier === "degree_extent_amount" ||
    opts.op.carrier === "until_extent"
  ) {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} `,
        final: {
          kind: "nounCopula",
          nounSurface: opts.op.carrier === "degree_extent_amount"
            ? "만큼"
            : opts.op.carrier === "until_extent" ? "때까지" : "정도",
          isBoundNoun: false
        }
      },
      chainOnFinalSupported: false,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "limit_dake") {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} `,
        final: { kind: "boundNounCopula", nounSurface: "뿐" }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "limit_dake_negative") {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} 뿐이 `,
        final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} 뿐이 `, "negative_nai")
    };
  }
  if (opts.op.carrier === "limit_dokoro_negative") {
    const hostNoun = loweredBase.policy?.kind === "noun_copula_interop" ? loweredBase.prefix : null;
    const attributive = projectBaseAttributive(
      loweredBase,
      effectivePast,
      opts.formal,
      opts.pastProjection
    );
    const situationHost = opts.op.sourceAllomorph === "dokoro_situation_deictic"
      ? opts.op.hostSituationBase ?? null
      : opts.op.sourceAllomorph === "dokoro_situation_sahen" && hostNoun !== null
        ? `${hostNoun}할`
        : opts.op.sourceAllomorph === "dokoro_situation_sahen" ||
          opts.op.sourceAllomorph === "dokoro_situation_verb"
          ? futureAttr
          : null;
    const scalarHost = opts.op.sourceAllomorph === "dokoro_scalar"
      ? hostNoun ?? attributive
      : null;
    const hostText = situationHost ?? scalarHost;
    if (hostText === null) {
      return { ok: false, reason: "dokoro negative carrier host projection not supported" };
    }
    const prefix = situationHost !== null ? `${hostText} 상황이 ` : `${hostText} 정도가 `;
    return {
      ok: true,
      base: {
        prefix,
        final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(hostText, prefix, "negative_nai")
    };
  }
  if (opts.op.carrier === "recent_past_bakari") {
    const hostAttr = projectBaseAttributive(
      loweredBase,
      true,
      opts.formal,
      opts.pastProjection
    );
    if (hostAttr === null) {
      return { ok: false, reason: "recent past bakari attributive projection not supported" };
    }
    return {
      ok: true,
      base: {
        prefix: `${hostAttr} 지 얼마 안 `,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      ...trace(hostAttr, `${hostAttr} 지 얼마 안 `, "none")
    };
  }
  if (opts.op.carrier === "imminent_nbakari") {
    const imminentBase = {
      prefix: `${futureAttr} `,
      final: { kind: "lemma", lemma: "듯하다", irregular: "여", isVerb: false }
    } as const;
    return {
      ok: true,
      base: {
        ...imminentBase,
        policy: { kind: "likeness", adverbialLexicalization: imminentBase }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "equivalence_douzen") {
    const hostAttr = projectBaseAttributive(
      loweredBase,
      effectivePast,
      opts.formal,
      opts.pastProjection
    );
    if (hostAttr === null) {
      return { ok: false, reason: "equivalence douzen attributive projection not supported" };
    }
    return {
      ok: true,
      base: {
        prefix: `${hostAttr} 것이나 `,
        final: { kind: "lemma", lemma: "다름없다", irregular: null, isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(hostAttr, `${hostAttr} 것이나 `, "none")
    };
  }
  const certaintyFinalLemma = opts.op.carrier === "certainty_ni_kimatte_iru" ? "뻔하다" : "틀림없다";
  return {
    ok: true,
    base: {
      prefix: `${futureAttr} 게 `,
      final: { kind: "lemma", lemma: certaintyFinalLemma, irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...trace(futureAttr, `${futureAttr} 게 `, "negative_nai")
  };
}

export function predicateQuoteCarrierRestoredHost(op: PredicateQuoteCarrierOp): KoreanFinalForm {
  const hostlessRule = op.sourceTerminal === true
    ? HOSTLESS_QUOTE_MARKER_MAP.get(op.surface)
    : undefined;
  return hostlessRule === undefined
    ? { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
    : {
      kind: "lemma",
      lemma: hostlessRule.restoredHost.lemma,
      irregular: hostlessRule.restoredHost.irregular,
      isVerb: hostlessRule.restoredHost.isVerb
    };
}

export function predicateQuoteCarrierBase(opts: {
  readonly op: PredicateQuoteCarrierOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly volitionalHost?: boolean;
  readonly nominalQuoteStem?: string;
  readonly lookups: LookupTables;
}): BaseResult {
  const quoteInputBase: KoreanPredicateBase = opts.stemPast && opts.inputBase.policy?.kind === "noun_copula_interop"
    ? {
      prefix: "",
      final: {
        kind: "nounCopula",
        nounSurface: opts.inputBase.policy.nounSurface,
        isBoundNoun: opts.inputBase.policy.isBoundNoun
      },
      policy: opts.inputBase.policy
    }
    : opts.inputBase;
  const host = committedTerminalRoleBase(
    { ok: true, base: quoteInputBase },
    opts.preStemNeg,
    opts.stemPast,
    true,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: `predicate quote carrier host lowering failed: ${host.reason}` };
  }
  if (opts.op.style === "suru_attributive" && opts.op.tosuruMode === "resultative_make") {
    if (opts.preStemNeg !== null) {
      return { ok: false, reason: "resultative to-suru carrier host negation lowering not supported" };
    }
    if (opts.stemPast) {
      return { ok: false, reason: "resultative to-suru carrier host past lowering not supported" };
    }
    if (host.base.final.kind !== "lemma") {
      return { ok: false, reason: "resultative to-suru carrier requires lemma host base" };
    }
    const hostBase: KoreanLemmaPredicateBase = { ...host.base, final: host.base.final };
    const projected = stateChangeBase(hostBase, "adverbial");
    const sourceTrace = hostProjectionSourceTrace({
      hostText: projected.prefix.trimEnd(),
      inputPrefix: opts.inputBase.prefix,
      basePrefix: projected.prefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        ...projected,
        final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  const rendered = composeBaseWithTerminal(host.base, host.past, true, false, opts.lookups);
  if (!rendered.ok) {
    return { ok: false, reason: `predicate quote carrier host render failed: ${rendered.reason}` };
  }
  const restoredHost: KoreanFinalForm = predicateQuoteCarrierRestoredHost(opts.op);
  const quotedSfp = opts.op.quotedSfp;
  const quotedSfpProjection = quotedSfp === undefined
    ? "assertive"
    : quoteProjectionForSfpEffect(quotedSfp.effect, false);
  const volitionalContentAttributive = opts.op.volitionalContentAttributive;
  const quotedMoodConsumedHere: QuotedPropositionMood | null =
    opts.op.quotedMood === "imperative" && quotedSfpProjection !== "prohibitive"
      ? "imperative"
      : opts.op.quotedMood === "volitional" &&
          (opts.op.sourceTerminal === true || volitionalContentAttributive !== undefined)
        ? "volitional"
        : null;
  if (
    quotedMoodConsumedHere !== null &&
    opts.op.style !== "naru_result" &&
    opts.nominalQuoteStem === undefined &&
    opts.preStemNeg === null &&
    !host.past &&
    host.base.final.kind === "lemma" &&
    host.base.final.isVerb
  ) {
    const moodBase: KoreanLemmaPredicateBase = { ...host.base, final: host.base.final };
    const moodForms = quotedMoodConsumedHere === "imperative"
      ? {
        terminal: composeBaseWithImperativeQuotative(moodBase),
        attributive: `${moodBase.prefix}${conjugate(moodBase.final.lemma, moodBase.final.irregular, "(으)라는")}`
      }
      : volitionalContentAttributive === "intentional_modifier"
        ? {
          terminal: renderBaseVolitionalPurposeConnective(moodBase),
          attributive: `${moodBase.prefix}${conjugate(moodBase.final.lemma, moodBase.final.irregular, "(으)려는")}`
        }
        : {
          terminal: renderBaseVolitionalQuotative(moodBase),
          attributive: (() => {
            const volitional = renderBaseVolitionalTerminal(moodBase);
            return volitional.ok ? `${volitional.text}는` : null;
          })()
        };
    if (moodForms.terminal.ok && moodForms.attributive !== null) {
      const moodQuoted = moodForms.terminal.text;
      const moodQuotedPrefix = `${moodQuoted} `;
      const moodTrace = hostProjectionSourceTrace({
        hostText: moodQuoted,
        inputPrefix: opts.inputBase.prefix,
        basePrefix: moodQuotedPrefix,
        sourceTokens: opts.op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: moodQuotedPrefix,
          final: restoredHost,
          policy: { kind: "quoted_proposition", attributive: moodForms.attributive }
        },
        chainOnFinalSupported: true,
        interOpPastProjection: "committed",
        ...(moodTrace === undefined ? {} : { sourceTrace: moodTrace })
      };
    }
  }
  if (opts.op.style === "naru_result") {
    const proposition = opts.nominalQuoteStem === undefined
      ? plainDeclarativeToPointAttributive(rendered.text, { ...copularQuoteOption(host.base) })
      : plainDeclarativeToPointAttributiveNominal(rendered.text, opts.nominalQuoteStem, undefined, { ...copularQuoteOption(host.base) });
    const propositionPrefix = `${proposition} 것이 `;
    const propositionTrace = hostProjectionSourceTrace({
      hostText: proposition,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: propositionPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: propositionPrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(propositionTrace === undefined ? {} : { sourceTrace: propositionTrace })
    };
  }
  if (quotedSfp !== undefined && quotedSfpProjection === "terminal_mood") {
    const moodInputBase: KoreanPredicateBase =
      quoteInputBase.policy?.kind === "scope_carrier" &&
        quoteInputBase.policy.carrier === "noda" &&
        quoteInputBase.policy.hostPrefix !== undefined &&
        quoteInputBase.final.kind === "lemma" &&
        quoteInputBase.final.lemma === "이다"
        ? scopeCarrierCopulaBase("noda", quoteInputBase.policy.nounSurface, quoteInputBase.policy.hostPrefix)
        : quoteInputBase;
    const moodBaseResult: BaseResult = { ok: true, base: moodInputBase };
    const realizedQuotedSfp = loweredTerminalSfpEffect(quotedSfp);
    const selfDirectedConjecture = sfpHasSelfDirectedConjectureRole(realizedQuotedSfp);
    const selfDirectedConjectureKana = realizedQuotedSfp.effect === "kana" &&
      selfDirectedConjecture &&
      moodInputBase.final.kind === "lemma" &&
      moodInputBase.final.idiom?.kind === "conjecture";
    const composeQuotedMood = (quotationForm: "terminal" | "attributive") =>
      selfDirectedConjectureKana
        ? composeCommittedTailQuestionTerminal(
          moodBaseResult, opts.preStemNeg, opts.stemPast, true, false, "ka", true, opts.lookups, quotationForm
        )
        : composeTerminalMoodOnBase(
          moodBaseResult, opts.preStemNeg, opts.stemPast, true, false, realizedQuotedSfp, opts.lookups,
          { quotationForm, selfDirectedConjecture }
        );
    const moodTerminal = composeQuotedMood("terminal");
    const moodAttributive = composeQuotedMood("attributive");
    if (moodTerminal === null || !moodTerminal.ok || moodAttributive === null || !moodAttributive.ok) {
      return {
        ok: false,
        reason: `quoted terminal mood realization not supported for SFP ${quotedSfp.effect ?? "null"}`
      };
    }
    const moodPrefix = `${moodTerminal.text} `;
    const moodTrace = hostProjectionSourceTrace({
      hostText: moodTerminal.text,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: moodPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: moodPrefix,
        final: restoredHost,
        policy: { kind: "quoted_proposition", attributive: moodAttributive.text }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(moodTrace === undefined ? {} : { sourceTrace: moodTrace })
    };
  }
  const interrogativeNounQuote = opts.op.style === "question_toiu"
    ? nounCopulaInterrogativeQuote(host.base, host.past, quoteCarrierMarkerSurface(opts.op), opts.nominalQuoteStem)
    : null;
  const quoted = interrogativeNounQuote ?? (opts.nominalQuoteStem === undefined
    ? quotePlainDeclarative(rendered.text, { ...copularQuoteOption(host.base) })
    : quotePlainDeclarativeNominal(rendered.text, opts.nominalQuoteStem, undefined, { ...copularQuoteOption(host.base) }));
  const attributive = predicateQuoteCarrierAttributive(
    opts.op.style,
    host.base,
    host.past,
    rendered.text,
    opts.lookups,
    opts.volitionalHost === true,
    opts.nominalQuoteStem,
    interrogativeNounQuote
  );
  if (attributive === null) {
    return { ok: false, reason: "predicate quote carrier attributive projection failed" };
  }
  const quotedPrefix = `${quoted} `;
  const quotedTrace = hostProjectionSourceTrace({
    hostText: quoted,
    inputPrefix: opts.inputBase.prefix,
    basePrefix: quotedPrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: quotedPrefix,
      final: restoredHost,
      policy: {
        kind: "quoted_proposition",
        attributive: attributive.text,
        ...(attributive.quote === null ? {} : { attributiveQuote: attributive.quote })
      }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(quotedTrace === undefined ? {} : { sourceTrace: quotedTrace })
  };
}

function quoteCarrierMarkerSurface(op: PredicateQuoteCarrierOp): string {
  const tokens = op.source.tokens;
  return tokens.slice(0, Math.max(0, tokens.length - 1)).map((token) => token.surface).join("");
}

function nounCopulaInterrogativeQuote(
  hostBase: KoreanPredicateBase,
  hostPast: boolean,
  markerSurface: string,
  nominalQuoteStem?: string
): string | null {
  if (hostPast) {
    return null;
  }
  const particleKey = CONNECTIVE_RENDER_MAP.get(markerSurface)?.copulaParticleKey;
  if (particleKey === undefined) {
    return null;
  }
  if (nominalQuoteStem !== undefined) {
    return `${hostBase.prefix}${nominalQuoteStem}${selectParticle(nominalQuoteStem, particleKey)}`;
  }
  if (hostBase.final.kind !== "nounCopula" && hostBase.final.kind !== "boundNounCopula") {
    return null;
  }
  const noun = hostBase.final.nounSurface;
  return `${hostBase.prefix}${noun}${selectParticle(nounCopulaFinalAllomorphHost(hostBase.final), particleKey)}`;
}

function predicateQuoteCarrierAttributive(
  style: PredicateQuoteCarrierOp["style"],
  hostBase: KoreanPredicateBase,
  hostPast: boolean,
  renderedText: string,
  lookups: LookupTables,
  volitionalHost: boolean,
  nominalQuoteStem?: string,
  interrogativeNounQuote?: string | null
) : {
  readonly text: string;
  readonly quote: { readonly prefix: string; readonly realizesInterrogativeMood: boolean } | null;
} | null {
  if (style === "question_toiu" && interrogativeNounQuote !== null && interrogativeNounQuote !== undefined) {
    const quotePrefix = `${interrogativeNounQuote} `;
    return { text: `${quotePrefix}하는`, quote: { prefix: quotePrefix, realizesInterrogativeMood: true } };
  }
  if (
    style === "question_toiu" &&
    volitionalHost &&
    !hostPast &&
    nominalQuoteStem === undefined &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.isVerb
  ) {
    const quotePrefix = `${hostBase.prefix}${conjugate(
      hostBase.final.lemma,
      hostBase.final.irregular,
      "ㄹ/을까"
    )} `;
    return { text: `${quotePrefix}하는`, quote: { prefix: quotePrefix, realizesInterrogativeMood: true } };
  }
  if (
    style === "compact_toiu" &&
    hostBase.policy?.kind === "noun_copula_interop" &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.idiom?.kind === "conjecture"
  ) {
    const noun = hostBase.policy.nounSurface;
    return {
      text: hostPast || hostBase.policy.conjectureHostPast === true
        ? `${noun}${hasBatchim(predicateBasePolicyAllomorphHost(hostBase)) ? "이었" : "였"}을 거라는`
        : `${noun}일 거라는`,
      quote: null
    };
  }
  if (
    style === "compact_toiu" &&
    hostBase.policy?.kind === "negative_noun_copula_interop" &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.idiom?.kind === "conjecture"
  ) {
    const conjecturePast = hostPast || hostBase.policy.conjectureHostPast === true;
    return {
      text: `${hostBase.policy.conjectureSubject}${conjecturePast ? "아니었을" : "아닐"} 거라는`,
      quote: null
    };
  }
  if (style === "compact_toiu") {
    return {
      text: nominalQuoteStem === undefined
        ? plainDeclarativeToPointAttributive(renderedText, { ...copularQuoteOption(hostBase) })
        : plainDeclarativeToPointAttributiveNominal(renderedText, nominalQuoteStem, undefined, { ...copularQuoteOption(hostBase) }),
      quote: null
    };
  }
  if (style === "suru_attributive") {
    const quoted = nominalQuoteStem === undefined
      ? quotePlainDeclarative(renderedText, { ...copularQuoteOption(hostBase) })
      : quotePlainDeclarativeNominal(renderedText, nominalQuoteStem, undefined, { ...copularQuoteOption(hostBase) });
    return { text: `${quoted} 하는`, quote: { prefix: `${quoted} `, realizesInterrogativeMood: false } };
  }
  const questionConnective: ConnectiveOp = createConnectiveOp({

    connective: "question_content",
    surface: "か",
    source: { tokens: [], tokenIndices: [] }
  });
  const question = hostBase.final.kind === "lemma" && hostBase.final.idiom?.kind === "conjecture"
    ? composeBaseWithConjectureQuestionConnective(hostBase, questionConnective, hostPast, true, false)
    : composeBaseWithConnective(hostBase, questionConnective, hostPast, false, null, true, lookups);
  if (!question.ok) {
    return null;
  }
  return { text: `${question.text} 하는`, quote: { prefix: `${question.text} `, realizesInterrogativeMood: true } };
}

export function experienceBase(opts: {
  readonly op: ExperienceIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  let projection = opts.pastProjection;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "experience idiom pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
    if (opts.preStemNeg.chainPast) {
      projection = "committed";
    }
  }
  const attr = projectBaseAttributive(hostBase, hostPast, opts.formal, projection);
  if (attr === null) {
    return { ok: false, reason: "experience idiom attributive projection not supported" };
  }
  const particle = opts.op.particleKind === "mo" ? "적도 " : "적이 ";
  const basePrefix = `${attr} ${particle}`;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: attr,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: opts.op.polarity === "negative" ? "없다" : "있다",
        irregular: null,
        isVerb: false
      }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function decisionKotoNiSuruBase(opts: {
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "decision koto-ni-suru pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
  }
  const nominalized = projectBaseNominalized(hostBase, hostPast, opts.formal);
  if (nominalized === null) {
    return { ok: false, reason: "decision koto-ni-suru nominalization not supported" };
  }
  const hostWord = `${nominalized}${selectParticle(nominalized, "으로/로")}`;
  const basePrefix = `${hostWord} `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: hostWord,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "last_token"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function outcomeKotoNiNaruBase(opts: {
  readonly op: OutcomeKotoNiNaruIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  let projection = opts.pastProjection;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "outcome koto-ni-naru pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
    if (opts.preStemNeg.chainPast) {
      projection = "committed";
    }
  }
  if (opts.op.stative !== true) {
    if (hostBase.final.kind !== "lemma") {
      return { ok: false, reason: "outcome koto-ni-naru adverbial projection not supported" };
    }
    const hostGe = `${hostBase.prefix}${conjugate(hostBase.final.lemma, hostBase.final.irregular, "게")}`;
    const basePrefix = `${hostGe} `;
    const sourceTrace = hostProjectionSourceTrace({
      hostText: hostGe,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "last_token"
    });
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  let hostWord: string;
  if (hostPast) {
    const attr = projectBaseAttributive(hostBase, hostPast, opts.formal, projection);
    if (attr === null) {
      return { ok: false, reason: "outcome koto-ni-naru attributive projection not supported" };
    }
    hostWord = `${attr} 것으로`;
  } else {
    const nominalized = projectBaseNominalized(hostBase, false, opts.formal);
    if (nominalized === null) {
      return { ok: false, reason: "outcome koto-ni-naru nominalization not supported" };
    }
    hostWord = `${nominalized}${selectParticle(nominalized, "으로/로")}`;
  }
  const doeAeo = conjugate("되다", null, "아/어");
  const basePrefix = `${hostWord} ${doeAeo} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostWord,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function voiceBase(opts: {
  readonly voice: VoiceOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly passiveStemOptions?: PassiveStemOptions;
  readonly lookups: LookupTables;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const { voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups, sahenShortNegationSplit } = opts;
  const stemFusionTrace = (relativePrefix: string): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = opts.sourceTokens === undefined
      ? undefined
      : stemFusionSourceTrace(relativePrefix, opts.sourceTokens, { splitFinal: "none" });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (voice.voice === "honorific") {
    const honorificLemma = respectKoreanPredicateLemma(
      stemLemma,
      stemIrregular,
      lookups.KOREAN_HONORIFIC_PREDICATE_LEMMAS,
      lookups.KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS
    );
    if (honorificLemma === null) {
      return { ok: false, reason: "honorific voice requires a Korean predicate lemma" };
    }
    return {
      ok: true,
      base: {
        prefix: "",
        final: { kind: "lemma", lemma: honorificLemma, irregular: null, isVerb },
        policy: { kind: "voice", voice: voice.voice }
      }
    };
  }
  if (!isVerb) {
    if (voice.voice === "potential" && isExistentialPotentialHost(stemLemma, stemIrregular)) {
      const base = potentialTailBase(conjugate(stemLemma, stemIrregular, "ㄹ/을"), 0);
      return base === null
        ? { ok: false, reason: "existential potential lowering invariant violation" }
        : {
          ok: true,
          base,
          chainOnFinalSupported: false,
          finalNegationLoweringPolicy: "potential_idiom"
        };
    }
    if (voice.voice === "causative" || voice.voice === "causative_passive") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: voice.voice === "causative"
            ? { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
            : { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: voice.voice === "causative"
            ? { kind: "causative", sourceLemma: stemLemma, sourceIrregular: stemIrregular }
            : {
              kind: "voice",
              voice: "causative_passive",
              ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass })
            }
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    return {
      ok: true,
      base: simpleStemBaseResult(stemLemma, stemIrregular, false).base,
      chainOnFinalSupported: true,
      interOpPastProjection: "committed"
    };
  }
  if (voice.voice === "potential") {
    const res = potentialBase({
      stemLemma,
      stemIrregular,
      isVerb,
      preStemNeg: null,
      stemPast: false,
      postIdiomChainDepth: 0,
      lookups,
      sahenShortNegationSplit
    });
    if (!res.ok) return res;
    return {
      ...res,
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }
  if (voice.voice === "passive") {
    const effectivePassiveOptions = passiveStemOptionsWithClass(passiveStemOptions, voice.passiveClass);
    if (voice.passiveClass === "causative_coercive") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    if (voice.passiveClass === "causative_passive_neutral" && stemLemma === "하다") {
      return {
        ok: true,
        base: {
          prefix: "",
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        }
      };
    }
    if (voice.passiveClass === "causative_passive_neutral") {
      const stemGe = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGe} `,
          final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(`${stemGe} `)
      };
    }
    if (effectivePassiveOptions.sahenCompound === true && effectivePassiveOptions.sahenNoun !== undefined) {
      const [supportLemma, supportIrregular] = resolvePassiveLemma("하다", "여", { ...effectivePassiveOptions, lookups });
      if (voice.adversativePassive) {
        const sahenAeo = `${effectivePassiveOptions.sahenNoun}${conjugate(
          voice.adversativePassiveAgentPromoted ? "하다" : supportLemma,
          voice.adversativePassiveAgentPromoted ? "여" : supportIrregular,
          "아/어"
        )} `;
        return {
          ok: true,
          base: {
            prefix: sahenAeo,
            final: { kind: "lemma", lemma: "버리다", irregular: null, isVerb: true },
            policy: passiveVoicePolicy(voice)
          },
          ...stemFusionTrace(sahenAeo)
        };
      }
      return {
        ok: true,
        base: {
          prefix: effectivePassiveOptions.sahenNoun,
          final: { kind: "lemma", lemma: supportLemma, irregular: supportIrregular, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(effectivePassiveOptions.sahenNoun)
      };
    }
    if (voice.adversativePassive) {
      const [baseLemma, baseIrregular] = voice.adversativePassiveBaseLemma !== undefined
        ? [voice.adversativePassiveBaseLemma, irregularFrom(voice.adversativePassiveBaseIrregular ?? null)] as const
        : voice.adversativePassiveAgentPromoted
          ? [stemLemma, stemIrregular] as const
          : resolvePassiveLemma(stemLemma, stemIrregular, { ...effectivePassiveOptions, lookups });
      const adversativeAeo = `${conjugate(baseLemma, baseIrregular, "아/어")} `;
      return {
        ok: true,
        base: {
          prefix: adversativeAeo,
          final: { kind: "lemma", lemma: "버리다", irregular: null, isVerb: true },
          policy: passiveVoicePolicy(voice)
        },
        ...stemFusionTrace(adversativeAeo)
      };
    }
    const [passiveLemma, passiveIrregular] = resolvePassiveLemma(stemLemma, stemIrregular, { ...effectivePassiveOptions, lookups });
    return {
      ok: true,
      base: {
        prefix: "",
        final: { kind: "lemma", lemma: passiveLemma, irregular: passiveIrregular, isVerb: true },
        capabilities: { prohibitionHost: "action" },
        policy: passiveVoicePolicy(voice)
      }
    };
  }
  if (voice.voice === "causative_passive") {
    if (voice.passiveClass === "causative_coercive") {
      const stemGeCoercive = conjugate(stemLemma, stemIrregular, "게");
      return {
        ok: true,
        base: {
          prefix: `${stemGeCoercive} `,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
          policy: {
            kind: "voice",
            voice: "causative_passive",
            passiveClass: voice.passiveClass
          }
        },
        ...stemFusionTrace(`${stemGeCoercive} `)
      };
    }
    const stemGe = conjugate(stemLemma, stemIrregular, "게");
    return {
      ok: true,
      base: {
        prefix: `${stemGe} `,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: {
          kind: "voice",
          voice: "causative_passive",
          ...(voice.passiveClass === undefined ? {} : { passiveClass: voice.passiveClass })
        }
      },
      ...stemFusionTrace(`${stemGe} `)
    };
  }
  const stemGe = conjugate(stemLemma, stemIrregular, "게");
  return {
    ok: true,
    base: {
      prefix: `${stemGe} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" },
      policy: { kind: "causative", sourceLemma: stemLemma, sourceIrregular: stemIrregular }
    },
    ...stemFusionTrace(`${stemGe} `)
  };
}

function isExistentialPotentialHost(
  stemLemma: string,
  stemIrregular: IrregularType | null
): boolean {
  return stemIrregular === null && (stemLemma === "있다" || stemLemma === "없다");
}

function modalInputStemAttributive(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly preModalNeg: NegationOp | null;
  readonly attrPolicy: "future" | "present";
  readonly useShortHint: boolean;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): string {
  if (
    opts.inputPolicy?.kind === "noun_copula_interop" &&
    opts.preModalNeg === null
  ) {
    const noun = opts.inputPolicy.nounSurface;
    if (opts.past) {
      const pastStem = selectParticle(opts.inputPolicy.allomorphHost ?? noun, "이었/였");
      return `${pastStem}${opts.attrPolicy === "future" ? "을" : "던"}`;
    }
    return opts.attrPolicy === "future" ? "일" : "인";
  }
  return pastNegStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: opts.stemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy: opts.attrPolicy,
    useShortHint: opts.useShortHint,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit
  });
}

export function nominalHostEvidentialLikenessBase(nounSurface: string, modal: ModalOp): BaseResult {
  return {
    ok: true,
    base: {
      prefix: `${nounSurface} `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: { kind: "likeness" }
    },
    sourceTrace: modalSourceTrace(modal, "", " ")
  };
}

export function modalBase(opts: {
  readonly modal: ModalOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceHostHasTeIruAspect?: boolean;
  readonly forbidShortNegation?: boolean;
  readonly preferShortLikenessNegation?: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const {
    modal,
    stemLemma,
    stemIrregular,
    stemKind,
    preModalNeg,
    past,
    formal,
    pastProjection = "lexical",
    inputPolicy,
    sourceStemIsVerb,
    sourceHostHasTeIruAspect = false,
    forbidShortNegation,
    preferShortLikenessNegation = false,
    lookups,
    sahenShortNegationSplit
  } = opts;
  const useShortFor = (defaultShort: boolean): boolean => !forbidShortNegation && defaultShort;
  const stemAttributive = (
    attrPolicy: "future" | "present",
    useShortHint: boolean
  ): string => modalInputStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind,
    past,
    preModalNeg,
    attrPolicy,
    useShortHint,
    pastProjection,
    lookups,
    sahenShortNegationSplit,
    ...(inputPolicy === undefined ? {} : { inputPolicy })
  });
  switch (modal.modal) {
    case "kamo": {
      const stemAttr = stemAttributive("future", useShortFor(true));
      return {
        ok: true,
        ...(modal.bare ? { terminalRealization: { kind: "elided_carrier" as const } } : {}),
        base: {
          prefix: `${stemAttr}지도 `,
          final: { kind: "lemma", lemma: "모르다", irregular: "르", isVerb: true }
        },
        sourceTrace: {
          inputProjectionText: stemAttr,
          carrierPrefixSegments: [
            {
              text: "지도",
              sourceTokens: modal.source.tokens.slice(0, 2),
              kind: "modal",
              projectionConfidence: "semantic"
            },
            {
              text: " ",
              sourceTokens: [],
              kind: "punctuation",
              projectionConfidence: "semantic"
            }
          ],
          finalSourceTokens: modal.source.tokens.length > 2 ? modal.source.tokens.slice(2) : modal.source.tokens,
          finalKind: "modal"
        }
      };
    }
    case "hazu": {
      if (modal.polarity === "negative") {
        const stemAttr = stemAttributive("future", false);
        const scopeNoun = hazuNegativeScopeNoun(modal);
        const hasTopic = scopeNoun === "리는";
        return {
          ok: true,
          base: {
            prefix: `${stemAttr} ${scopeNoun} `,
            final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
          },
          sourceTrace: {
            inputProjectionText: stemAttr,
            carrierPrefixSegments: [
              {
                text: " 리",
                sourceTokens: modal.source.tokens.slice(0, 1),
                kind: "modal",
                projectionConfidence: "semantic",
                suppressBoundaryAfter: false
              },
              ...(hasTopic
                ? [{
                  text: "는",
                  sourceTokens: modal.source.tokens.slice(1, -1),
                  kind: "modal" as const,
                  projectionConfidence: "semantic" as const
                }]
                : []),
              {
                text: " ",
                sourceTokens: [],
                kind: "punctuation",
                projectionConfidence: "semantic"
              }
            ],
            finalSourceTokens: hasTopic
              ? modal.source.tokens.slice(-1)
              : modal.source.tokens.slice(1),
            finalKind: "modal"
          }
        };
      }
      const stemAttr = stemAttributive("future", false);
      return {
        ok: true,
        base: scopeCarrierCopulaBase("hazu", "터", `${stemAttr} `),
        sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 터")
      };
    }
    case "noda": {
      const stemAttr = stemAttributive("present", useShortFor(true));
      const noun = nodaCarrierNoun(formal);
      const nodaModal = modal;
      const carrierStyle = nodaCarrierStyle(nodaModal);
      if (nodaCarrierHasSupportConjecture(nodaModal)) {
        return {
          ok: true,
          base: {
            prefix: "",
            final: {
              kind: "lemma",
              lemma: `${stemAttr} 것이겠다`,
              irregular: null,
              isVerb: false,
              idiom: {
                kind: "conjecture",
                conjecturePolite: modal.polite,
                projection: "nominalized",
                sourceLemma: stemLemma,
                sourceIrregular: stemIrregular
              }
            },
            policy: { kind: "scope_carrier", carrier: "noda", nounSurface: "것", style: "emphasis" }
          },
          chainOnFinalSupported: false,
          sourceTrace: modalSourceTrace(modal, stemAttr, "")
        };
      }
      const connectiveBaseOverride: { readonly connectiveBaseOverride: ConnectiveBaseOverride } | {} =
        preModalNeg === null && shouldFlattenNodaConnectiveToHost(inputPolicy, stemLemma)
          ? {
            connectiveBaseOverride: {
              base: {
                prefix: "",
                final: { kind: "lemma" as const, lemma: stemLemma, irregular: stemIrregular, isVerb: stemKind === "verb" },
                policy: inputPolicy
              },
              past,
              adversativeSurface: "のに"
            }
          }
          : {};
      const carrierOptions =
        carrierStyle === undefined
          ? {}
          : {
            style: carrierStyle,
            connectiveSourcePoliteness: "preserve_when_supported" as const
          };
      return {
        ok: true,
        base: scopeCarrierCopulaBase(
          "noda",
          noun,
          `${stemAttr} `,
          carrierOptions
        ),
        sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${noun}`),
        ...connectiveBaseOverride
      };
    }
    case "youda": {
      const stemAttr = stemAttributive("present", useShortFor(preferShortLikenessNegation));
      const kaNoYouFlattenPolicy =
        modal.form === "youda" && modal.source.tokens.some((token, index) =>
          kaMarkerRelationForToken(token, index, ["tail_render"], {
            acceptedParticleSubtypes: ["副助詞", "終助詞", "係助詞"]
          }) !== null
        )
          ? { nodaConnectiveFlatten: "ka_no_you" as const }
          : {};
      const attributiveLexicalization = likenessAttributiveLexicalizationBase(modal, stemAttr);
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} 것 `,
          final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
          policy: {
            kind: "likeness",
            ...kaNoYouFlattenPolicy,
            ...(attributiveLexicalization === undefined ? {} : { attributiveLexicalization }),
            ...(modal.form === "youda" && preModalNeg === null && !past && stemKind === "verb"
              ? {
                potentialObjectAttributive: {
                  stemLemma,
                  stemIrregular,
                  stemKind
                }
              }
              : {})
          }
        },
        sourceTrace: modalSourceTrace(modal, stemAttr, " 것 ")
      };
    }
    case "rashii": {
      const stemAttr = stemAttributive("present", useShortFor(preferShortLikenessNegation));
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} 것 `,
          final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
          policy: { kind: "likeness" }
        },
        sourceTrace: modalSourceTrace(modal, stemAttr, " 것 ")
      };
    }
    case "tsumori": {
      return tsumoriBaseFromStem({
        stemLemma,
        stemIrregular,
        stemKind,
        modal,
        preModalNeg,
        past,
        pastProjection,
        ...(sourceStemIsVerb === undefined ? {} : { sourceStemIsVerb }),
        sourceHostHasTeIruAspect,
        lookups,
        sahenShortNegationSplit
      });
    }
    case "tokoro": {
      const tokoroCarrierOptions = carrierConnectiveSourcePolitenessOptions(modal.source);
      if (modal.reading === "place") {
        const stemAttr = stemAttributive("present", false);
        return {
          ok: true,
          base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "곳", `${stemAttr} `, tokoroCarrierOptions),
          sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${modal.nominalNoun ?? "곳"}`)
        };
      }
      if (modal.reading === "intention") {
        const stemAttr = stemAttributive("present", false);
        return {
          ok: true,
          base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "바", `${stemAttr} `, tokoroCarrierOptions),
          sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${modal.nominalNoun ?? "바"}`)
        };
      }
      if (modal.reading !== "temporal") {
        return { ok: false, reason: `tokoro reading '${modal.reading}' 영역 외` };
      }
      if (modal.variant === "almost") {
        const stemAttr = stemAttributive("future", false);
        return {
          ok: true,
          base: {
            prefix: `${stemAttr} `,
            final: { kind: "lemma", lemma: "뻔하다", irregular: "여", isVerb: false }
          }
        };
      }
      if (modal.variant === "progress_observation") {
        const stemAttr = stemAttributive("present", false);
        return {
          ok: true,
          base: scopeCarrierCopulaBase("tokoro", "중", `${stemAttr} `, tokoroCarrierOptions),
          sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 중")
        };
      }
      if (modal.variant === "about_to") {
        const stemRyeogo = conjugate(stemLemma, stemIrregular, "(으)려는");
        return {
          ok: true,
          base: scopeCarrierCopulaBase("tokoro", "참", `${stemRyeogo} `, tokoroCarrierOptions),
          sourceTrace: carrierCopulaSourceTrace(modal, stemRyeogo, " 참")
        };
      }
      if (past && preModalNeg === null) {
        const stemJustNow = conjugate(stemLemma, stemIrregular, "ㄴ/은");
        return {
          ok: true,
          base: scopeCarrierCopulaBase("tokoro", "참", `막 ${stemJustNow} `, tokoroCarrierOptions),
          sourceTrace: carrierCopulaSourceTrace(modal, `막 ${stemJustNow}`, " 참")
        };
      }
      const stemAttr = stemAttributive("future", false);
      return {
        ok: true,
        base: scopeCarrierCopulaBase("tokoro", "참", `${stemAttr} `, tokoroCarrierOptions),
        sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 참")
      };
    }
    case "mai": {
      const sourceVerbalHost = stemKind === "verb" || sourceStemIsVerb === true;
      const alreadyNegativeScopeHost = inputPolicy?.kind === "scope_carrier" &&
        (stemLemma === "아니다" || stemLemma === "없다" || stemLemma === "않다");
      if (!sourceVerbalHost && !alreadyNegativeScopeHost) {
        return { ok: false, reason: "mai on non-verb 영역 외" };
      }
      if (past || preModalNeg !== null) {
        return { ok: false, reason: "mai with pre-modal tense/negation 영역 외" };
      }
      const [negativePrefix, negativeLemma, negativeIrregular] = alreadyNegativeScopeHost
        ? ["", stemLemma, stemIrregular] as const
        : stemKind === "adj" && sourceStemIsVerb === true
          ? ["", `${conjugate(stemLemma, stemIrregular, "지")} 않다`, null] as const
          : shortNegationPrefix(stemLemma, stemIrregular, opts.lookups, { sahenSplit: sahenShortNegationSplit });
      const stemAttr = modalInputStemAttributive({
        stemLemma: negativeLemma,
        stemIrregular: negativeIrregular,
        stemKind: sourceVerbalHost && stemKind === "verb" ? "verb" : "adj",
        past: false,
        preModalNeg: null,
        attrPolicy: "future",
        useShortHint: false,
        pastProjection,
        lookups,
        sahenShortNegationSplit,
        ...(inputPolicy === undefined ? {} : { inputPolicy })
      });
      return {
        ok: true,
        base: scopeCarrierCopulaBase("mai", "거", `${negativePrefix}${stemAttr} `),
        sourceTrace: carrierCopulaSourceTrace(modal, `${negativePrefix}${stemAttr}`, " 거")
      };
    }
    case "wake": {
      const stemAttr = stemAttributive("present", false);
      switch (modal.variant) {
        case "explanatory":
          return {
            ok: true,
            base: scopeCarrierCopulaBase("wake", "셈", `${stemAttr} `),
            sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 셈")
          };
        case "rhetorical_no_way": {
          const stemAttrFuture = stemAttributive("future", false);
          return {
            ok: true,
            base: {
              prefix: `${stemAttrFuture} 리 `,
              final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttrFuture, " 리 ")
          };
        }
        case "rhetorical_possibility": {
          const stemAttrFuture = stemAttributive("future", false);
          return {
            ok: true,
            base: {
              prefix: `${stemAttrFuture} 리 `,
              final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttrFuture, " 리 ")
          };
        }
        case "partial_negation":
          return {
            ok: true,
            base: {
              prefix: `${stemAttr} 것은 `,
              final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
            },
            terminalPrefixContraction: "scope_topic",
            connectivePrefixContraction: "scope_topic",
            sourceTrace: modalSourceTrace(modal, stemAttr, " 것은 ")
          };
        case "weakened_partial_negation":
          return {
            ok: true,
            base: {
              prefix: `${stemAttr} 것도 `,
              final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttr, " 것도 ")
          };
      }
    }
    case "souda_hearsay": {
      if (modal.reading === "yotai") {
        return soudaYotaiBaseFromStem({
          modal,
          stemLemma,
          stemIrregular,
          stemKind,
          preModalNeg,
          past,
          pastProjection,
          lookups,
          sahenShortNegationSplit,
          ...(sourceStemIsVerb === undefined ? {} : { sourceStemIsVerb }),
          ...(inputPolicy === undefined ? {} : { inputPolicy })
        });
      }
      return soudaHearsayBaseFromPredicateBase(
        simpleStemBase(stemLemma, stemIrregular, stemKind === "verb"),
        preModalNeg,
        past,
        opts.lookups,
        modal
      );
    }
    case "limit_negation":
      return { ok: false, reason: "limit negation requires the composed predicate base" };
    case "mono": {
      if (modal.reading === "admirative" || modal.reading === "habitual") {
        return { ok: false, reason: "mono admirative/habitual requires the composed predicate base" };
      }
      const stemAttr = stemAttributive("present", false);
      const noun = nodaCarrierNoun(formal);
      return {
        ok: true,
        base: scopeCarrierCopulaBase("mono", noun, `${stemAttr} `),
        sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${noun}`)
      };
    }
    default:
      assertNever(modal);
  }
}

export function maiScopeCarrierBase(
  modal: Extract<ModalOp, { readonly modal: "mai" }>,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  const policy = inputBase.policy;
  if (
    policy?.kind !== "scope_carrier" ||
    policy.carrier !== "wake" ||
    policy.style !== "emphasis" ||
    policy.hostPrefix === undefined
  ) {
    return null;
  }
  const negativeAttr = conjugate("아니다", "아니", "ㄹ/을");
  return {
    ok: true,
    base: scopeCarrierCopulaBase("mai", "거", `${policy.hostPrefix}것은 ${negativeAttr} `)
  };
}

function carrierCopulaHasExplicitSupport(source: ModalOp["source"]): boolean {
  const de = source.tokens[1];
  return copulaDeMarkerRelationForToken(de, 1, { consumers: ["tail_render"] }) !== null &&
    ((de!.pos & POS4) === 助動詞_ダ) &&
    isAffirmativeCopulaSupportVerbToken(source.tokens[2]);
}

function carrierConnectiveSourcePolitenessOptions(
  source: ModalOp["source"]
): { readonly connectiveSourcePoliteness: "preserve_when_supported" } | Record<string, never> {
  return carrierCopulaHasExplicitSupport(source)
    ? { connectiveSourcePoliteness: "preserve_when_supported" as const }
    : {};
}

function nodaCarrierStyle(modal: NodaModalOp): ScopeCarrierStyle | undefined {
  const de = modal.source.tokens[1];
  if (((de?.pos ?? 0) & POS4) === 助動詞_ジャ) {
    return "assertive_jya";
  }
  return carrierCopulaHasExplicitSupport(modal.source) ? "emphasis" : undefined;
}

function nodaCarrierHasSupportConjecture(modal: NodaModalOp): boolean {
  if (!carrierCopulaHasExplicitSupport(modal.source)) {
    return false;
  }
  const support = modal.source.tokens[2]!;
  const politeConjecture = modal.source.tokens[3];
  return (support.pos & POS5A) === 意志推量形_ ||
    (politeConjecture !== undefined &&
      (politeConjecture.pos & (POS4 | POS5A)) === (助動詞_マス | 意志推量形_));
}

export function tokoroBaseFromPredicateBase(opts: {
  readonly modal: TokoroModalOp;
  readonly base: KoreanPredicateBase;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult | null {
  const { modal, base, preModalNeg, past, formal, pastProjection } = opts;
  if (preModalNeg !== null) {
    return null;
  }
  const tokoroCarrierOptions = carrierConnectiveSourcePolitenessOptions(modal.source);
  const inputProjection = (attr: string): string =>
    attr.startsWith(base.prefix) ? attr.slice(base.prefix.length) : attr;
  if (modal.reading === "place") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro place host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "곳", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), ` ${modal.nominalNoun ?? "곳"}`)
    };
  }
  if (modal.reading === "intention") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro intention host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "바", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), ` ${modal.nominalNoun ?? "바"}`)
    };
  }
  if (modal.reading === "temporal" && modal.variant === "progress_observation") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro progress host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", "중", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), " 중")
    };
  }
  return null;
}

function projectBaseAffirmativeGiFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  particle: "는" | "도" | "까지" | "만"
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseAffirmativeGiFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal, particle);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const stem = nounCopulaPlainStem(
      base.final.nounSurface,
      past,
      base.final.kind === "boundNounCopula" || base.final.isBoundNoun,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return `${base.prefix}${stem}기${particle}`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}기${particle}`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "기")}${particle}`;
}

function projectBaseFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  mode: "affirmative" | "negative"
): string | null {
  if (mode === "affirmative") {
    return projectBaseAffirmativeGiFocus(base, past, formal, "는");
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal, mode);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const stem = nounCopulaPlainStem(
      base.final.nounSurface,
      past,
      base.final.kind === "boundNounCopula" || base.final.isBoundNoun,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return `${base.prefix}${stem}지는`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지는`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}는`;
}

function projectBaseAdditiveFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  return projectBaseAffirmativeGiFocus(base, past, formal, "도");
}

function projectBaseNegativeAdditiveFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseNegativeAdditiveFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return `${base.prefix}${base.final.nounSurface}도`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지도`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}도`;
}

function projectBaseExtremeFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  mode: "affirmative" | "negative"
): string | null {
  if (mode === "affirmative") {
    return projectBaseAffirmativeGiFocus(base, past, formal, "까지");
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseExtremeFocus(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      mode
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return `${base.prefix}${base.final.nounSurface}조차`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}지조차`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "지")}조차`;
}

function scopeBridgeNegativeConnectiveOverride(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase,
  hostPast: boolean,
  formal: boolean
): ConnectiveBaseOverride | undefined {
  if (op.head !== "wake" || op.polarity !== "negative" || op.particle === "mo") {
    return undefined;
  }
  if (
    hostBase.final.lemma !== "있다" ||
    !hostBase.prefix.endsWith("고 ")
  ) {
    return undefined;
  }
  const focus = projectBaseFocus(hostBase, hostPast, formal, "negative");
  if (focus === null) {
    return undefined;
  }
  return {
    base: {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
      ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
    },
    past: false
  };
}

function shouldFlattenWakeScopeNegationToHost(hostBase: KoreanLemmaPredicateBase): boolean {
  return hostBase.policy?.kind === "voice" &&
    hostBase.policy.voice === "passive" &&
    hostBase.final.lemma === "있다" &&
    hostBase.prefix.endsWith("고 ");
}

function kotoScopePotentialDoubleNegationBase(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  preStemNeg: NegationOp | null
): BaseResult | null {
  if (
    (op.head !== "koto" && op.head !== "implicit") ||
    op.form !== "topic" ||
    op.polarity !== "negative" ||
    preStemNeg === null ||
    preStemNeg.chainDepth !== 1 ||
    preStemNeg.chainPast ||
    inputBase.final.lemma !== "있다" ||
    inputBase.final.irregular !== null ||
    inputBase.final.isVerb ||
    !inputBase.prefix.trimEnd().endsWith("수")
  ) {
    return null;
  }
  const focusParticle = op.particle === "mo" ? "mo" : "wa";
  const positivePotentialBase: KoreanLemmaPredicateBase = {
    prefix: `${inputBase.prefix.trimEnd()}${potentialParticleInfix(focusParticle, null)}`,
    final: inputBase.final,
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
  const base = op.chainDepth <= 1
    ? positivePotentialBase
    : applyNegationDepthToLemmaBase(positivePotentialBase, op.chainDepth - 1);
  if (base === null) {
    return { ok: false, reason: "koto scope potential double negation chain lowering 영역 외" };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    interOpPastProjection: "committed"
  };
}

function kotoScopeLoweredPotentialDoubleNegationBase(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (
    (op.head !== "koto" && op.head !== "implicit") ||
    op.form !== "topic" ||
    op.polarity !== "negative" ||
    hostBase.final.lemma !== "없다" ||
    hostBase.final.irregular !== null ||
    hostBase.final.isVerb ||
    !hostBase.prefix.trimEnd().endsWith("수")
  ) {
    return null;
  }
  const focusParticle = op.particle === "mo" ? "mo" : "wa";
  const positivePotentialBase: KoreanLemmaPredicateBase = {
    prefix: `${hostBase.prefix.trimEnd()}${potentialParticleInfix(focusParticle, null)}`,
    final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
    ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
  };
  const base = op.chainDepth <= 1
    ? positivePotentialBase
    : applyNegationDepthToLemmaBase(positivePotentialBase, op.chainDepth - 1);
  if (base === null) {
    return { ok: false, reason: "koto scope lowered potential double negation chain lowering 영역 외" };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    interOpPastProjection: "committed"
  };
}

function isKotoTopicExistentialNegation(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  preModalNeg: NegationOp | null
): boolean {
  const hostNegationLemma =
    inputBase.final.lemma === "아니다" ||
    inputBase.final.lemma === "없다" ||
    inputBase.final.lemma === "않다";
  return op.head === "koto" && op.form === "topic" && preModalNeg === null && !hostNegationLemma;
}

export function scopeBridgeHeadAbsorbedHostPrefix(
  op: ScopeBridgeOp,
  hostBase: KoreanLemmaPredicateBase,
  hostPast: boolean
): string | null {
  const policy = hostBase.policy;
  if (
    op.head === null ||
    policy?.kind !== "noun_copula_interop" ||
    policy.nounSurface !== NODA_CARRIER_BOUND_NOUN ||
    hostBase.final.lemma !== "이다" ||
    hostBase.final.irregular !== null ||
    hostPast
  ) {
    return null;
  }
  return policy.hostPrefix;
}

function copularQuoteOption(base: KoreanPredicateBase): { readonly copularLemma?: string } {
  const lemma = copularLemmaOfBase(base);
  return lemma === undefined ? {} : { copularLemma: lemma };
}

export function scopeBridgeBase(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const result = scopeBridgeBaseWithoutPolarityStamp(op, inputBase, ctx);
  if (!result.ok || op.polarity !== "negative") {
    return result;
  }
  return {
    ...result,
    base: withNegativeClosureCapability(result.base)
  };
}

export function withNegativeClosureCapability<T extends KoreanPredicateBase>(base: T): T {
  return {
    ...base,
    capabilities: { ...base.capabilities, negativeClosure: "source_polarity" as const }
  };
}

function scopeBridgeBaseWithoutPolarityStamp(
  op: ScopeBridgeOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if ((op.particle === "shika" || op.particle === "sae") && op.head !== null) {
    return { ok: false, reason: "限定·極限 초점 bridge 는 무-head 형상만 갖는다" };
  }
  if (op.polarity === "affirmative" && op.head === null && op.particle !== null &&
    isCopulaSupportPotentialOp(ctx.nextOp)) {
    return {
      ok: true,
      base: { ...inputBase, policy: { kind: "scope_bridge_potential_host", particle: op.particle } },
      chainOnFinalSupported: true
    };
  }
  const potentialDoubleNegation = kotoScopePotentialDoubleNegationBase(op, inputBase, ctx.preModalNeg);
  if (potentialDoubleNegation !== null) {
    return potentialDoubleNegation;
  }
  const hostBase = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (hostBase === null) {
    return { ok: false, reason: "scope bridge host negation lowering 영역 외" };
  }
  const loweredPotentialDoubleNegation = kotoScopeLoweredPotentialDoubleNegationBase(op, hostBase);
  if (loweredPotentialDoubleNegation !== null) {
    return loweredPotentialDoubleNegation;
  }
  const hostPast = ctx.past || (ctx.preModalNeg?.chainPast ?? false);
  const formal = ctx.formal;
  const kotoTopicExistential = isKotoTopicExistentialNegation(op, inputBase, ctx.preModalNeg);
  const absorbedHostPrefix = op.polarity === "negative" && kotoTopicExistential
    ? null
    : scopeBridgeHeadAbsorbedHostPrefix(op, hostBase, hostPast);

  if (absorbedHostPrefix !== null && op.polarity === "negative") {
    const label = op.particle === "mo"
      ? `${NODA_CARRIER_BOUND_NOUN}도`
      : formal ? `${NODA_CARRIER_BOUND_NOUN}은` : "건";
    const absorbedPrefix = `${absorbedHostPrefix}${label} `;
    const negativeBase: KoreanLemmaPredicateBase = {
      prefix: absorbedPrefix,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
    };
    const lowered = op.chainDepth <= 1
      ? negativeBase
      : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge absorbed negative chain lowering 영역 외" };
    const absorbedTrace = hostProjectionSourceTrace({
      hostText: hostBase.prefix,
      inputPrefix: inputBase.prefix,
      basePrefix: lowered.prefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: lowered,
      ...modalFinalChainPolicy(lowered),
      ...(absorbedTrace === undefined ? {} : { sourceTrace: absorbedTrace })
    };
  }

  if (op.head === null || absorbedHostPrefix !== null) {
    if (op.particle === "shika") {
      if (op.polarity !== "negative") {
        return { ok: false, reason: "限定 초점 bridge 는 부정 본체로만 닫힌다" };
      }
      if (op.chainDepth > 1) {
        return { ok: false, reason: "限定 초점 bridge negative chain lowering 영역 외" };
      }
      const futureAttr = projectBaseFutureAttributive(hostBase, hostPast, formal, ctx.pastProjection);
      if (futureAttr === null) return { ok: false, reason: "限定 초점 bridge future attributive projection 영역 외" };
      const limitTrace = hostProjectionSourceTrace({
        hostText: futureAttr,
        inputPrefix: inputBase.prefix,
        basePrefix: `${futureAttr} `,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: `${futureAttr} `,
          final: { kind: "boundNounCopula", nounSurface: "뿐" }
        },
        chainOnFinalSupported: true,
        ...(limitTrace === undefined ? {} : { sourceTrace: limitTrace })
      };
    }
    if (op.polarity === "affirmative") {
      const focus = op.particle === "mo"
        ? projectBaseAdditiveFocus(hostBase, hostPast, formal)
        : op.particle === "sae"
          ? projectBaseExtremeFocus(hostBase, hostPast, formal, "affirmative")
          : projectBaseFocus(hostBase, hostPast, formal, "affirmative");
      if (focus === null) return { ok: false, reason: "scope bridge affirmative focus projection 영역 외" };
      const focusPrefix = `${focus} `;
      const focusTrace = hostProjectionSourceTrace({
        hostText: focus,
        inputPrefix: inputBase.prefix,
        basePrefix: focusPrefix,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: focusPrefix,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: false }
        },
        chainOnFinalSupported: true,
        ...(focusTrace === undefined ? {} : { sourceTrace: focusTrace })
      };
    }
    const focus = op.particle === "mo"
      ? projectBaseNegativeAdditiveFocus(hostBase, hostPast, formal)
      : op.particle === "sae"
        ? projectBaseExtremeFocus(hostBase, hostPast, formal, "negative")
        : projectBaseFocus(hostBase, hostPast, formal, "negative");
    if (focus === null) return { ok: false, reason: "scope bridge negative focus projection 영역 외" };
    const negativeBase: KoreanLemmaPredicateBase = {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false }
    };
    const lowered = op.chainDepth <= 1
      ? negativeBase
      : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge negative chain lowering 영역 외" };
    const negativeFocusTrace =
      scopeBridgeHeadlessNegativeFocusSourceTrace(op, inputBase, focus, lowered.prefix) ??
      hostProjectionSourceTrace({
        hostText: focus,
        inputPrefix: inputBase.prefix,
        basePrefix: lowered.prefix,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
    return {
      ok: true,
      base: lowered,
      chainOnFinalSupported: true,
      ...(negativeFocusTrace === undefined ? {} : { sourceTrace: negativeFocusTrace })
    };
  }

  const negativeProjection = op.head === "implicit" ? "completed_negative" : "scope_bridge";
  const attr = projectBaseAttributive(
    ctx.attributiveProjectionBase ?? hostBase,
    hostPast,
    formal,
    ctx.pastProjection,
    negativeProjection
  );
  if (attr === null) return { ok: false, reason: "scope bridge attributive projection 영역 외" };

  if (op.polarity === "affirmative") {
    const focus = op.particle === "mo" ? "것이기도" : "것이기는";
    const sourceTrace = scopeBridgeAttributiveSourceTrace(op, inputBase, attr, ` ${focus} `);
    return {
      ok: true,
      base: {
        prefix: `${attr} ${focus} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: false },
        policy: {
          kind: "scope_carrier",
          carrier: op.head === "wake" ? "wake" : "noda",
          nounSurface: "것",
          hostPrefix: `${attr} `,
          style: "emphasis",
          ...(op.particle === null
            ? { connectiveSourcePoliteness: "preserve_when_supported" as const }
            : {})
        }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace }),
      ...(op.head === "no" && op.particle !== "mo"
        ? { chainCarryPrefixContraction: "no_emphasis_limited" as const }
        : {})
    };
  }

  if (op.head === "wake" && op.particle !== "mo" && shouldFlattenWakeScopeNegationToHost(hostBase)) {
    const focus = projectBaseFocus(hostBase, hostPast, formal, "negative");
    if (focus === null) return { ok: false, reason: "scope bridge passive-progressive focus projection 영역 외" };
    const focusNegativeBase: KoreanLemmaPredicateBase = {
      prefix: `${focus} `,
      final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
      ...(hostBase.policy === undefined ? {} : { policy: hostBase.policy })
    };
    const lowered = op.chainDepth <= 1
      ? focusNegativeBase
      : applyNegationDepthToLemmaBase(focusNegativeBase, op.chainDepth - 1);
    if (lowered === null) return { ok: false, reason: "scope bridge passive-progressive chain lowering 영역 외" };
    const flattenTrace = hostProjectionSourceTrace({
      hostText: focus,
      inputPrefix: inputBase.prefix,
      basePrefix: lowered.prefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: lowered,
      ...modalFinalChainPolicy(lowered),
      ...(flattenTrace === undefined ? {} : { sourceTrace: flattenTrace })
    };
  }

  let label: string;
  let terminalPrefixContraction: OkBaseResult["terminalPrefixContraction"] | undefined;
  if (op.head === "no") {
    if (op.particle === "mo") {
      label = "것도";
    } else if (
      isBenefactiveNegativeCarrierPolicy(hostBase.policy, hostBase.final.lemma)
    ) {
      label = formal ? "것이" : "게";
    } else if (isScopeLikeNoHost(hostBase)) {
      label = "것은";
      terminalPrefixContraction = "scope_topic";
    } else if (formal) {
      label = hostBase.final.lemma === "바라다"
        ? "게"
        : "것이";
    } else {
      label = "게";
    }
  } else if (op.head === "implicit" && op.particle === "mo") {
    label = "것도";
  } else if (op.head === "implicit" && inputBase.final.isVerb) {
    label = "건";
  } else if (op.head === "implicit") {
    label = "것은";
    terminalPrefixContraction = "scope_topic";
  } else if (op.particle === "mo") {
    label = "것도";
  } else if (op.head === "koto" && inputBase.final.isVerb) {
    label = formal ? "것은" : "건";
  } else {
    label = "것은";
    const isProgressiveIruHost =
      hostBase.final.lemma === "있다" &&
      hostBase.prefix.endsWith("고 ");
    if (!isProgressiveIruHost) {
      terminalPrefixContraction = "scope_topic";
    }
  }
  const negativeBase: KoreanLemmaPredicateBase = {
    prefix: `${attr} ${label} `,
    final: kotoTopicExistential
      ? { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
      : { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
  };
  const lowered = op.chainDepth <= 1
    ? negativeBase
    : applyNegationDepthToLemmaBase(negativeBase, op.chainDepth - 1);
  if (lowered === null) return { ok: false, reason: "scope bridge scope negation lowering 영역 외" };
  const connectiveBaseOverride = scopeBridgeNegativeConnectiveOverride(op, hostBase, hostPast, formal);
  const connectivePrefixContraction: OkBaseResult["connectivePrefixContraction"] | undefined =
    op.head === "no" && op.particle !== "mo"
      ? "no_scope_negative"
      : terminalPrefixContraction === "scope_topic"
        ? "scope_topic"
        : undefined;
  return {
    ok: true,
    base: lowered,
    ...modalFinalChainPolicy(lowered),
    ...(() => {
      const sourceTrace = scopeBridgeAttributiveSourceTrace(op, inputBase, attr, ` ${label} `);
      return sourceTrace === undefined ? {} : { sourceTrace };
    })(),
    ...(terminalPrefixContraction === undefined ? {} : { terminalPrefixContraction }),
    ...(connectivePrefixContraction === undefined ? {} : { connectivePrefixContraction }),
    ...(connectiveBaseOverride === undefined ? {} : { connectiveBaseOverride })
  };
}

function scopeBridgeAttributiveSourceTrace(
  op: ScopeBridgeOp,
  currentBase: KoreanLemmaPredicateBase,
  attributiveText: string,
  carrierText: string
): BaseSourceTrace | undefined {
  if (!attributiveText.startsWith(currentBase.prefix)) {
    return undefined;
  }
  const split = splitScopeBridgeCarrierAndFinalSource(op);
  return {
    inputProjectionText: attributiveText.slice(currentBase.prefix.length),
    carrierPrefixSegments: [{
      text: carrierText,
      sourceTokens: split.carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    }],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

function scopeBridgeHeadlessNegativeFocusSourceTrace(
  op: ScopeBridgeOp,
  currentBase: KoreanLemmaPredicateBase,
  focusText: string,
  basePrefix: string
): BaseSourceTrace | undefined {
  if (
    op.head !== null ||
    op.polarity !== "negative" ||
    !focusText.startsWith(currentBase.prefix) ||
    !basePrefix.startsWith(focusText)
  ) {
    return undefined;
  }
  const projectedHostText = focusText.slice(currentBase.prefix.length);
  const carrierText = op.particle === "mo" ? "도" : "는";
  if (!projectedHostText.endsWith(carrierText)) {
    return undefined;
  }
  const inputProjectionText = projectedHostText.slice(0, -carrierText.length);
  const split = splitScopeBridgeCarrierAndFinalSource(op);
  const spacerText = basePrefix.slice(focusText.length);
  return {
    inputProjectionText,
    carrierPrefixSegments: [
      {
        text: carrierText,
        sourceTokens: split.carrierSourceTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      },
      ...(spacerText.length === 0
        ? []
        : [{
          text: spacerText,
          sourceTokens: [],
          kind: "punctuation" as const,
          projectionConfidence: "exact" as const
        }])
    ],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

function splitScopeBridgeCarrierAndFinalSource(op: ScopeBridgeOp): {
  readonly carrierSourceTokens: readonly RuntimeHaruToken[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
} {
  const tokens = op.source.tokens;
  if (op.polarity !== "negative" || tokens.length < 2) {
    return {
      carrierSourceTokens: tokens,
      finalSourceTokens: tokens
    };
  }
  const focusIndex = lastScopeBridgeFocusParticleIndex(tokens);
  if (focusIndex >= 0 && focusIndex + 1 < tokens.length) {
    return {
      carrierSourceTokens: tokens.slice(0, focusIndex + 1),
      finalSourceTokens: tokens.slice(focusIndex + 1)
    };
  }
  const negativeIndex = firstScopeBridgeNegativeTailIndex(tokens);
  if (negativeIndex > 0) {
    return {
      carrierSourceTokens: tokens.slice(0, negativeIndex),
      finalSourceTokens: tokens.slice(negativeIndex)
    };
  }
  return {
    carrierSourceTokens: tokens,
    finalSourceTokens: tokens
  };
}

function lastScopeBridgeFocusParticleIndex(tokens: readonly RuntimeHaruToken[]): number {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const form = tokens[index]?.dictionaryForm || tokens[index]?.surface;
    if (form === "は" || form === "も") {
      return index;
    }
  }
  return -1;
}

function firstScopeBridgeNegativeTailIndex(tokens: readonly RuntimeHaruToken[]): number {
  for (let index = 1; index < tokens.length; index += 1) {
    const form = tokens[index]?.dictionaryForm || tokens[index]?.normalizedForm || tokens[index]?.surface;
    if (form === "ない" || form === "無い" || form === "ぬ" || form === "ん") {
      return index;
    }
  }
  return -1;
}

export function predicateSuffixBaseResult(
  op: PredicateSuffixOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (!predicateSuffixHasInflectingHost(inputBase, ctx)) {
    return { ok: false, reason: "predicate suffix requires a verb-final or stem-adjacent inflecting host" };
  }
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "V neg + predicate suffix 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "V past + predicate suffix 영역 외" };
  }
  const profile = derivationalSuffixProfileById(op.profileId);
  if (
    profile === undefined ||
    profile.template === undefined ||
    profile.finalLemma === undefined
  ) {
    return { ok: false, reason: `predicate suffix profile '${op.profileId}' does not declare an in-chain derivation` };
  }
  const hostText = inChainDerivationalHostProjection(profile, inputBase, ctx);
  if (hostText === null) {
    return { ok: false, reason: `predicate suffix profile '${op.profileId}' host form '${profile.hostForm}' is not projectable in chain` };
  }
  const basePrefix = profile.template
    .slice(0, profile.template.length - profile.finalLemma.length)
    .replace(HOST_TEMPLATE_PLACEHOLDER, hostText);
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: profile.finalLemma,
        irregular: profile.irregular ?? null,
        isVerb: profile.resultStemKind === "verb"
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function inChainDerivationalHostProjection(
  profile: DerivationalSuffixProfile,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): string | null {
  switch (profile.hostForm) {
    case "nominal_ki":
      return `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "기")}`;
    case "attributive_present":
      return projectBaseAttributive(inputBase, false, ctx.formal);
    case "stem_root":
      return derivationalHostStemRootOf({
        lemma: inputBase.final.lemma,
        koreanPrefix: inputBase.prefix
      });
    case "nominal_m":
    case "attributive_completed":
    case "noun_compound":
      return null;
  }
}

function predicateSuffixHasInflectingHost(
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): boolean {
  return inputBase.final.isVerb ||
    inputBase.policy?.kind === "potential" ||
    (ctx.chainIndex ?? 0) === 0;
}

export function postverbAuxiliaryBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const adverbialStemBase = adverbialStemPostverbAuxiliaryBaseResult(op, inputBase, ctx);
  if (adverbialStemBase !== null) {
    return adverbialStemBase;
  }
  if (op.auxiliary.kind === "scope_control") {
    return scopeControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_action_control") {
    return mannerActionControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "epistemic_hedge") {
    return epistemicHedgeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_perception") {
    return appearancePerceptionBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_simile_become") {
    return mannerSimileBecomeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "manner_simile_become_potential") {
    const baseResult = mannerSimileBecomeBaseResult(op, inputBase, ctx);
    if (!baseResult.ok) {
      return baseResult;
    }
    const lemmaBase = lemmaPredicateBase(baseResult.base);
    if (lemmaBase === null) {
      return { ok: false, reason: "ようになれる simile-become potential requires lemma final" };
    }
    return stateChangePotentialBaseResult(lemmaBase, {
      inputPrefix: inputBase.prefix,
      sourceTokens: op.source.tokens
    });
  }
  if (op.auxiliary.kind === "appearance_state_change") {
    return appearanceStateChangeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_state_change_potential") {
    const baseResult = appearanceStateChangeBaseResult(op, inputBase, ctx);
    if (!baseResult.ok) {
      return baseResult;
    }
    const lemmaBase = lemmaPredicateBase(baseResult.base);
    if (lemmaBase === null) {
      return { ok: false, reason: "そうに+なれる state-change potential requires lemma final" };
    }
    return stateChangePotentialBaseResult(lemmaBase, {
      inputPrefix: inputBase.prefix,
      sourceTokens: op.source.tokens
    });
  }
  if (op.auxiliary.kind === "appearance_behavior") {
    return appearanceBehaviorBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "adverbial_control") {
    return adverbialControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "make_state_change") {
    return makeStateChangeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "make_state_change_causative") {
    return makeStateChangeCausativeBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "appearance_control") {
    return appearanceControlBaseResult(op, inputBase, ctx);
  }
  if (op.auxiliary.kind === "focus_support") {
    return focusSupportBaseResult(op, inputBase, ctx);
  }
  if (
    ctx.preModalNeg !== null &&
    !isStateChangePostverbAuxiliaryKind(op.auxiliary.kind) &&
    op.auxiliary.kind !== "adverbial_change" &&
    op.auxiliary.kind !== "adverbial_change_potential"
  ) {
    return { ok: false, reason: "V neg + postverb auxiliary 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "V past + postverb auxiliary 영역 외" };
  }
  if (op.auxiliary.kind === "contempt") {
    return { ok: true, base: inputBase, chainOnFinalSupported: true };
  }
  const final = inputBase.final;
  const carryInputPolicy = (
    base: KoreanLemmaPredicateBase,
    defaultPolicy?: PredicateBasePolicy
  ): KoreanLemmaPredicateBase => ({
    ...base,
    ...(inputBase.policy !== undefined
      ? { policy: inputBase.policy }
      : defaultPolicy === undefined
        ? {}
        : { policy: defaultPolicy })
  });
  const hostPrefixBase = (adverb: string, defaultPolicy?: PredicateBasePolicy): BaseResult => ({
    ok: true,
    base: carryInputPolicy({
      prefix: `${adverb} ${inputBase.prefix}`,
      final
    }, defaultPolicy),
    chainOnFinalSupported: true
  });
  const hostAdverbialBase = (defaultPolicy?: PredicateBasePolicy): BaseResult => {
    const adverb = op.auxiliary.hostAdverb;
    if (adverb === undefined) {
      return { ok: false, reason: `postverb ${op.auxiliary.kind} auxiliary missing host adverb` };
    }
    if (op.auxiliary.sahenHostProjection === "object_adverb") {
      const sahenObject = sahenObjectPhraseFromBase(inputBase, ctx.shortNegationPolicy);
      if (sahenObject !== null) {
        return {
          ok: true,
          base: carryInputPolicy({
            prefix: `${sahenObject}${adverb} `,
            final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
          }, defaultPolicy),
          chainOnFinalSupported: true
        };
      }
    }
    return hostPrefixBase(adverb, defaultPolicy);
  };
  const hostKi = final.isVerb
    ? `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "기")}`
    : `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}지기`;
  const hostJi = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "지")}`;
  const hostFuture = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "ㄹ/을")}`;
  const hostAeo = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}`;
  const hostTrace = (hostText: string, basePrefix: string): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: inputBase.prefix,
      basePrefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };

  switch (op.auxiliary.kind) {
    case "completion": {
      const completionPolicy = inputBase.policy === undefined
        ? {
          policy: {
            kind: "completion",
            stemPrefix: `다 ${inputBase.prefix}`,
            stemLemma: final.lemma,
            stemIrregular: final.irregular,
            teIruNegativeStrategy: op.auxiliary.completionTeIruNegativeStrategy ?? "preserve_aspect",
            ...(op.auxiliary.completionFollowingPassiveStrategy === undefined
              ? {}
              : { followingPassiveStrategy: op.auxiliary.completionFollowingPassiveStrategy }),
            ...(ctx.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: ctx.shortNegationPolicy })
          } satisfies PredicateBasePolicy
        }
        : {};
      return {
        ok: true,
        base: {
          prefix: `다 ${inputBase.prefix}`,
          final,
          ...completionPolicy
        },
        chainOnFinalSupported: true
      };
    }
    case "exhaustive":
      return hostAdverbialBase();
    case "continuation":
      return hostAdverbialBase();
    case "redo":
      return hostAdverbialBase();
    case "prolonged":
      return hostAdverbialBase();
    case "perseverance":
      return hostAdverbialBase();
    case "intensive":
      return hostAdverbialBase();
    case "reciprocal":
      return hostAdverbialBase();
    case "excessive":
      return hostAdverbialBase(DEGREE_INTENSIFIER_BASE_POLICY);
    case "accomplishment":
      if (!final.isVerb) {
        return { ok: false, reason: "postverb accomplishment auxiliary requires verb-like host" };
      }
      if (op.auxiliary.sahenHostProjection === "object_action_lemma") {
        const sahenObject = sahenObjectPhraseFromBase(inputBase, ctx.shortNegationPolicy);
        if (sahenObject !== null) {
          return {
            ok: true,
            base: {
              prefix: sahenObject,
              final: {
                kind: "lemma",
                lemma: op.auxiliary.koreanActionLemma ?? "해내다",
                irregular: irregularFrom(op.auxiliary.koreanActionIrregular ?? null),
                isVerb: true
              }
            },
            chainOnFinalSupported: true,
            ...hostTrace(sahenObject.trimEnd(), sahenObject)
          };
        }
      }
      return {
        ok: true,
        base: {
          prefix: hostAeo,
          final: { kind: "lemma", lemma: "내다", irregular: null, isVerb: true }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostAeo, hostAeo)
      };
    case "determined_completion": {
      if (!final.isVerb) {
        return { ok: false, reason: "postverb determined completion auxiliary requires verb-like host" };
      }
      const auxToken = op.source.tokens[op.source.tokens.length - 1];
      const auxIsVolitional = ((auxToken?.pos ?? 0) & POS5A) === 意志推量形_;
      return {
        ok: true,
        base: {
          prefix: hostAeo,
          final: {
            kind: "lemma",
            lemma: auxIsVolitional ? "내다" : "내겠다",
            irregular: null,
            isVerb: auxIsVolitional
          }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostAeo, hostAeo)
      };
    }
    case "state_change":
      return stateChangeBaseResult(inputBase, ctx, "adjectival", op.source.tokens);
    case "state_change_potential": {
      const baseResult = stateChangeBaseResult(inputBase, ctx, "adjectival");
      if (!baseResult.ok) {
        return baseResult;
      }
      return stateChangePotentialBaseResult(baseResult.base, {
        inputPrefix: inputBase.prefix,
        sourceTokens: op.source.tokens
      });
    }
    case "adverbial_change": {
      const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
      if (loweredHost === null) {
        return { ok: false, reason: "postverb adverbial-change host negation lowering 영역 외" };
      }
      const base = carryInputPolicy(stateChangeBase(loweredHost, "adverbial"));
      const sourceTrace = hostProjectionSourceTrace({
        hostText: base.prefix.trimEnd(),
        inputPrefix: inputBase.prefix,
        basePrefix: base.prefix,
        sourceTokens: op.source.tokens,
        splitFinal: "last_token"
      });
      return {
        ok: true,
        base,
        ...(sourceTrace === undefined ? {} : { sourceTrace })
      };
    }
    case "adverbial_change_potential": {
      const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
      if (loweredHost === null) {
        return { ok: false, reason: "postverb adverbial-change host negation lowering 영역 외" };
      }
      return stateChangePotentialBaseResult(
        carryInputPolicy(stateChangeBase(loweredHost, "adverbial")),
        { inputPrefix: inputBase.prefix, sourceTokens: op.source.tokens }
      );
    }
    case "inchoative":
      return {
        ok: true,
        base: {
          prefix: `${hostKi} `,
          final: { kind: "lemma", lemma: "시작하다", irregular: "여", isVerb: true }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostKi, `${hostKi} `)
      };
    case "accustomed": {
      if (!final.isVerb) {
        return { ok: false, reason: "postverb accustomed auxiliary requires verb-like host" };
      }
      const hostNeun = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "ㄴ/는")}`;
      return {
        ok: true,
        base: {
          prefix: `${hostNeun} 데 `,
          final: { kind: "lemma", lemma: "익숙하다", irregular: "여", isVerb: false },
          policy: { kind: "accustomed_aspect_projection" }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostNeun, `${hostNeun} 데 `)
      };
    }
    case "forget": {
      const attr = projectBaseAttributive(inputBase, false, ctx.formal);
      if (attr === null) {
        return { ok: false, reason: "postverb forget host attributive projection 영역 외" };
      }
      return {
        ok: true,
        base: {
          prefix: `${attr} 걸 `,
          final: { kind: "lemma", lemma: "잊다", irregular: null, isVerb: true }
        },
        chainOnFinalSupported: true,
        ...hostTrace(attr, `${attr} 걸 `)
      };
    }
    case "failure_miss":
      if (!final.isVerb) {
        return { ok: false, reason: "postverb failure auxiliary requires verb-like host" };
      }
      return {
        ok: true,
        base: {
          prefix: `${hostJi} `,
          final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostJi, `${hostJi} `)
      };
    case "near_miss":
      if (!final.isVerb) {
        return { ok: false, reason: "postverb near-miss auxiliary requires verb-like host" };
      }
      return {
        ok: true,
        base: {
          prefix: `${hostFuture} `,
          final: { kind: "lemma", lemma: "뻔하다", irregular: "여", isVerb: false }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostFuture, `${hostFuture} `)
      };
    case "incomplete_attempt": {
      if (!final.isVerb) {
        return { ok: false, reason: "postverb incomplete-attempt auxiliary requires verb-like host" };
      }
      const hostRyeogo = `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "(으)려고")}`;
      return {
        ok: true,
        base: {
          prefix: `${hostRyeogo} `,
          final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostRyeogo, `${hostRyeogo} `)
      };
    }
    case "difficulty":
      if (!final.isVerb && inputBase.policy?.kind !== "potential") {
        return { ok: false, reason: "postverb difficulty auxiliary requires verb-like host" };
      }
      if (inputBase.policy?.kind === "potential" && inputBase.policy.stemLemma !== undefined) {
        const potentialHostKi = conjugate(
          inputBase.policy.stemLemma,
          inputBase.policy.stemIrregular ?? null,
          "기"
        );
        return {
          ok: true,
          base: {
            prefix: `${potentialHostKi} `,
            final: { kind: "lemma", lemma: "어렵다", irregular: "ㅂ", isVerb: false }
          },
          chainOnFinalSupported: true,
          ...hostTrace(potentialHostKi, `${potentialHostKi} `)
        };
      }
      return {
        ok: true,
        base: {
          prefix: `${hostKi} `,
          final: { kind: "lemma", lemma: "어렵다", irregular: "ㅂ", isVerb: false }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostKi, `${hostKi} `)
      };
    case "risk_potential":
      if (!final.isVerb) {
        return { ok: false, reason: "postverb risk-potential auxiliary requires verb-like host" };
      }
      return {
        ok: true,
        base: {
          prefix: `${hostFuture} 수도 `,
          final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
        },
        chainOnFinalSupported: true,
        ...hostTrace(hostFuture, `${hostFuture} 수도 `)
      };
    case "potential":
    case "completion_potential": {
      if (
        op.auxiliary.kind === "potential" &&
        op.potentialComposition === "reinforce_existing"
      ) {
        return {
          ok: true,
          base: inputBase,
          chainOnFinalSupported: false,
          finalNegationLoweringPolicy: "potential_idiom"
        };
      }
      if (!final.isVerb && !isCopulaSupportPotentialOp(op)) {
        return { ok: false, reason: "postverb potential auxiliary requires verb-like host" };
      }
      const potentialAdverb = op.auxiliary.kind === "completion_potential"
        ? op.auxiliary.completionAdverb ?? "다"
        : null;
      return {
        ok: true,
        base: {
          prefix: op.auxiliary.kind === "completion_potential"
            ? postverbAdverbialPotentialPrefix(inputBase, potentialAdverb ?? "다", ctx.shortNegationPolicy)
            : `${hostFuture} 수${potentialFocusInfixForBase(inputBase)}`,
          final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
          ...(op.auxiliary.kind === "completion_potential"
            ? {
              policy: {
                kind: "completion_potential",
                completionAdverb: potentialAdverb ?? "다",
                ...(inputBase.prefix.length === 0 ? {} : { stemPrefix: inputBase.prefix }),
                stemLemma: final.lemma,
                stemIrregular: final.irregular,
                ...(ctx.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: ctx.shortNegationPolicy })
              } as const
            }
            : ctx.nextOp?.kind === "postverbAuxiliary" && ctx.nextOp.auxiliary.kind === "difficulty"
              ? {
              policy: {
                kind: "potential",
                stemLemma: final.lemma,
                stemIrregular: final.irregular
              } as const
              }
              : {})
        },
        chainOnFinalSupported: false,
        finalNegationLoweringPolicy: op.auxiliary.kind === "completion_potential"
          ? "completion_potential"
          : "potential_idiom",
        ...(op.auxiliary.kind === "completion_potential"
          ? {}
          : hostTrace(hostFuture, `${hostFuture} 수${potentialFocusInfixForBase(inputBase)}`))
      };
    }
    case "adverbial_potential": {
      if (!final.isVerb) {
        return { ok: false, reason: "postverb adverbial potential auxiliary requires verb-like host" };
      }
      const adverb = op.auxiliary.hostAdverb;
      if (adverb === undefined) {
        return { ok: false, reason: "postverb adverbial potential auxiliary missing host adverb" };
      }
      return {
        ok: true,
        base: {
          prefix: postverbAdverbialPotentialPrefix(inputBase, adverb, ctx.shortNegationPolicy),
          final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
        },
        chainOnFinalSupported: false,
        finalNegationLoweringPolicy: "potential_idiom"
      };
    }
    default:
      return assertNever(op.auxiliary.kind);
  }
}

const AFFIRMATIVE_SUPPORT_FOCUS_PARTICLE = {
  contrastive: "는",
  extreme: "까지",
  sufficiency: "만"
} as const satisfies Record<AffirmativeSupportFocus, "는" | "까지" | "만">;

function focusSupportBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const focus = op.auxiliary.supportFocus;
  if (focus === undefined) {
    return { ok: false, reason: "focus_support auxiliary missing supportFocus" };
  }
  if (ctx.preModalNeg !== null || ctx.past) {
    return { ok: false, reason: "focus_support host 는 連用形 술어 host 만 받는다" };
  }
  const hostText = projectBaseAffirmativeGiFocus(inputBase, false, ctx.formal, AFFIRMATIVE_SUPPORT_FOCUS_PARTICLE[focus]);
  if (hostText === null) {
    return { ok: false, reason: "focus_support host projection 영역 외" };
  }
  const basePrefix = `${hostText} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: inputBase.final.isVerb }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearancePerceptionBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "ように見える/思える host negation lowering 영역 외" };
  }
  const attrPolicy =
    op.auxiliary.perceptionProjection === "sou_appearance" &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "ように見える/思える host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 것처럼 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma:
          op.auxiliary.perception === "felt"
            ? "느끼다"
            : op.auxiliary.perception === "inferential"
            ? "느껴지다"
            : op.auxiliary.perception === "inferential_passive"
              ? "여겨지다"
              : "보이다",
        irregular: null,
        isVerb: true
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function mannerSimileBecomeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "ようになる likeness-become host negation lowering 영역 외" };
  }
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    "present"
  );
  if (hostAttr === null) {
    return { ok: false, reason: "ようになる likeness-become host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 것처럼 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: "되다",
        irregular: null,
        isVerb: true
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceStateChangeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "そうに+なる host negation lowering 영역 외" };
  }
  const attrPolicy =
    op.auxiliary.perceptionProjection === "sou_appearance" &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "そうに+なる host attributive projection 영역 외" };
  }
  const base = stateChangeBase({
    prefix: `${hostAttr} 것 `,
    final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false }
  }, "adjectival");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix: base.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceBehaviorBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "そうに+する host negation lowering 영역 외" };
  }
  const attrPolicy = loweredHost.final.isVerb && !ctx.past && ctx.preModalNeg === null
    ? "future"
    : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "そうに+する host attributive projection 영역 외" };
  }
  const basePrefix = `${hostAttr} 듯이 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function appearanceControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + 見せる appearance-control 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + 見せる appearance-control 영역 외" };
  }
  const hostText = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "아/어")}`;
  const basePrefix = `${hostText} 보이게 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function epistemicHedgeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const prefixKind = op.auxiliary.hedgePrefixKind;
  const tailLemma = op.auxiliary.hedgeTailLemma;
  const tailKoreanPos = op.auxiliary.hedgeTailKoreanPos;
  if (prefixKind === undefined || tailLemma === undefined || tailKoreanPos === undefined) {
    return { ok: false, reason: "epistemic hedge payload missing spec fields" };
  }

  if (op.auxiliary.hedgeProjection === "quotative_attributive") {
    return epistemicHedgeQuotativeBaseResult(op, inputBase, ctx, prefixKind, tailLemma, tailKoreanPos);
  }

  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "epistemic hedge host negation lowering 영역 외" };
  }
  const souLike = op.auxiliary.hedgeProjection === "sou_appearance";
  const attrPolicy =
    souLike &&
      loweredHost.final.isVerb &&
      !ctx.past &&
      ctx.preModalNeg === null
      ? "future"
      : "present";
  const hostAttr = projectBaseAttributive(
    loweredHost,
    ctx.past || (ctx.preModalNeg?.chainPast ?? false),
    ctx.formal,
    ctx.pastProjection,
    "default",
    attrPolicy
  );
  if (hostAttr === null) {
    return { ok: false, reason: "epistemic hedge host attributive projection 영역 외" };
  }

  const proposition = `${hostAttr} 것`;
  const focus = op.auxiliary.hedgeFocus;
  const carrierNoun = hedgeCarrierNoun(prefixKind);
  let prefix: string;
  if (carrierNoun === null) {
    prefix = `${proposition} `;
  } else if (souLike) {
    prefix = `${proposition} 같은 ${hedgeCarrierNounPhrase(carrierNoun, focus)} `;
  } else {
    prefix = `${hostAttr} ${hedgeCarrierNounPhrase(carrierNoun, focus)} `;
  }

  const final: KoreanLemmaPredicateBase["final"] = {
    kind: "lemma",
    lemma: tailLemma,
    irregular: irregularFrom(op.auxiliary.hedgeTailIrregular ?? null),
    isVerb: tailKoreanPos === 동사
  };
  const focused: { readonly base: KoreanLemmaPredicateBase } = carrierNoun === null && focus !== undefined
    ? { base: nominalizedFocusPredicate(prefix, final, focus) }
    : { base: { prefix, final } };

  if (op.auxiliary.hedgePotential === true) {
    return stateChangePotentialBaseResult(
      { ...focused.base, ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy }) },
      { inputPrefix: inputBase.prefix, sourceTokens: op.source.tokens }
    );
  }
  const hedgeTrace = hostProjectionSourceTrace({
    hostText: hostAttr,
    inputPrefix: inputBase.prefix,
    basePrefix: focused.base.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: focused.base,
    chainOnFinalSupported: true,
    ...(hedgeTrace === undefined ? {} : { sourceTrace: hedgeTrace })
  };
}

function hedgeCarrierNoun(prefixKind: "proposition" | "feeling" | "mood"): string | null {
  switch (prefixKind) {
    case "proposition":
      return null;
    case "feeling":
      return "느낌";
    case "mood":
      return "기분";
  }
}

function hedgeCarrierNounPhrase(carrierNoun: string, focus: PostverbHedgeFocus | undefined): string {
  const particleKey = focus === "additive" ? "도" : focus === "topic" ? "은/는" : "이/가";
  return `${carrierNoun}${selectParticle(carrierNoun, particleKey)}`;
}

function nominalizedFocusPredicate(
  prefix: string,
  final: KoreanLemmaPredicateBase["final"],
  focus: PostverbHedgeFocus
): KoreanLemmaPredicateBase {
  if (final.kind !== "lemma") {
    return { prefix, final };
  }
  const nominalized = conjugate(final.lemma, final.irregular, "기");
  const particleKey = focus === "additive" ? "도" : "은/는";
  return {
    prefix: `${prefix}${nominalized}${selectParticle(nominalized, particleKey)} `,
    final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: final.isVerb }
  };
}

function epistemicHedgeQuotativeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext,
  prefixKind: "proposition" | "feeling" | "mood",
  tailLemma: string,
  tailKoreanPos: typeof 동사 | typeof 형용사
): BaseResult {
  const quoted = composeBaseWithPredicateProjectionQuoteAttributive(
    inputBase,
    ctx.past,
    false,
    ctx.preModalNeg,
    ctx.formal,
    ctx.lookups,
    {}
  );
  if (!quoted.ok) {
    return { ok: false, reason: quoted.reason };
  }
  const carrierNoun = hedgeCarrierNoun(prefixKind) ?? "느낌";
  const prefix = `${quoted.text} ${hedgeCarrierNounPhrase(carrierNoun, op.auxiliary.hedgeFocus)} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: quoted.text,
    inputPrefix: inputBase.prefix,
    basePrefix: prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix,
      final: {
        kind: "lemma",
        lemma: tailLemma,
        irregular: irregularFrom(op.auxiliary.hedgeTailIrregular ?? null),
        isVerb: tailKoreanPos === 동사
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function adverbialControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + とする adverbial-control 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + とする adverbial-control 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      ...projected,
      final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function makeStateChangeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + にする make-state-change 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + にする make-state-change 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      ...projected,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: { kind: "make_state_change" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function makeStateChangeCausativeBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "A neg + にさせる make-state-change-causative 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "A past + にさせる make-state-change-causative 영역 외" };
  }
  const projected = stateChangeBase(inputBase, "adverbial");
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected.prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: projected.prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      ...projected,
      final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function adverbialStemPostverbAuxiliaryBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const lemma = ctx.adverbialStemLemma;
  if (lemma === undefined) {
    return null;
  }
  if (
    op.auxiliary.kind !== "adverbial_change" &&
    op.auxiliary.kind !== "adverbial_change_potential" &&
    op.auxiliary.kind !== "adverbial_control"
  ) {
    return { ok: false, reason: "adverb stem requires explicit adverbial postverb auxiliary" };
  }
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "adverb stem postverb auxiliary host negation 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "adverb stem postverb auxiliary host past 영역 외" };
  }
  const prefix = `${inputBase.prefix}${lemma} `;
  const stateBase: KoreanLemmaPredicateBase = {
    prefix,
    final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
  const sourceTrace = hostProjectionSourceTrace({
    hostText: prefix.trimEnd(),
    inputPrefix: inputBase.prefix,
    basePrefix: prefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  if (op.auxiliary.kind === "adverbial_change_potential") {
    return stateChangePotentialBaseResult(stateBase, {
      inputPrefix: inputBase.prefix,
      sourceTokens: op.source.tokens
    });
  }
  if (op.auxiliary.kind === "adverbial_control") {
    return {
      ok: true,
      base: {
        ...stateBase,
        final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  return {
    ok: true,
    base: stateBase,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function postverbAdverbialPotentialPrefix(
  inputBase: KoreanLemmaPredicateBase,
  adverb: string,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string {
  const final = inputBase.final;
  const sahenObject = sahenObjectPhraseFromBase(inputBase, shortNegationPolicy);
  if (sahenObject !== null) {
    return `${sahenObject}${adverb} 할 수 `;
  }
  return `${inputBase.prefix}${adverb} ${conjugate(final.lemma, final.irregular, "ㄹ/을")} 수 `;
}

function sahenObjectPhraseFromBase(
  inputBase: KoreanLemmaPredicateBase,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string | null {
  const final = inputBase.final;
  if (
    shortNegationPolicy !== "sahen_split" ||
    inputBase.prefix.length !== 0 ||
    !final.lemma.endsWith("하다") ||
    final.lemma.length <= "하다".length
  ) {
    return null;
  }
  const sahen = final.lemma.slice(0, -"하다".length);
  return `${sahen}${selectParticle(sahen, "을/를")} `;
}

function scopeControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (ctx.past || (ctx.preModalNeg?.chainPast ?? false)) {
    return { ok: false, reason: "past host + ようにする scope-control 영역 외" };
  }
  const hostDorok = projectBaseScopeControlDorok(inputBase, ctx.preModalNeg, ctx);
  if (hostDorok === null) {
    return { ok: false, reason: "ようにする scope-control host projection 영역 외" };
  }
  const basePrefix = `${hostDorok} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostDorok,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function mannerActionControlBaseResult(
  op: PostverbAuxiliaryOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const attr = projectBaseAttributive(inputBase, true, ctx.formal);
  if (attr === null) {
    return { ok: false, reason: "ようにする manner-action attributive projection 영역 외" };
  }
  const basePrefix = `${attr} 대로 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: `${attr} 대로`,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function projectBaseScopeControlDorok(
  inputBase: KoreanLemmaPredicateBase,
  negation: NegationOp | null,
  ctx: OpContext
): string | null {
  const final = inputBase.final;
  if (negation === null || negation.chainDepth === 0) {
    return `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "도록")}`;
  }
  if (
    negation.chainDepth === 1 &&
    negation.preferShortNegation &&
    final.isVerb &&
    !ctx.forbidShortNegation
  ) {
    return projectShortNegativeScopeControlDorok(inputBase, ctx.shortNegationPolicy);
  }
  const lowered = applyNegationChainToLemmaBase(inputBase, negation);
  if (lowered === null) {
    return null;
  }
  return `${lowered.prefix}${conjugate(lowered.final.lemma, lowered.final.irregular, "도록")}`;
}

function projectShortNegativeScopeControlDorok(
  inputBase: KoreanLemmaPredicateBase,
  shortNegationPolicy: ShortNegationPolicy | undefined
): string {
  const final = inputBase.final;
  if (
    final.lemma.endsWith("하다") &&
    final.lemma.length > 2 &&
    shortNegationPolicy !== "lexical_prefix"
  ) {
    const sahenPrefix = final.lemma.slice(0, -2);
    return `${inputBase.prefix}${sahenPrefix} 안 ${conjugate("하다", "여", "도록")}`;
  }
  return `${inputBase.prefix}안 ${conjugate(final.lemma, final.irregular, "도록")}`;
}

export function stateChangeBase(
  inputBase: KoreanLemmaPredicateBase,
  projection: "adjectival" | "adverbial"
): KoreanLemmaPredicateBase {
  const final = inputBase.final;
  if (projection === "adjectival" && final.lemma === "이다" && !final.isVerb && inputBase.prefix.length > 0) {
    const lastChar = inputBase.prefix.slice(-1);
    return {
      prefix: `${inputBase.prefix}${hasBatchim(lastChar) ? "이" : "가"} `,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
      capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    };
  }
  if (projection === "adverbial" || final.isVerb) {
    return {
      prefix: `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "게")} `,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
      capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    };
  }
  return {
    prefix: `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}`,
    final: { kind: "lemma", lemma: "지다", irregular: null, isVerb: true },
    capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
}

export { isStateChangePostverbAuxiliaryKind } from "../postverb-auxiliary-parser.js";

function stateChangeBaseResult(
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext,
  projection: "adjectival" | "adverbial",
  sourceTokens?: readonly RuntimeHaruToken[]
): OkLemmaBaseResult | RenderFailure {
  const loweredHost = applyNegationChainToLemmaBase(inputBase, ctx.preModalNeg);
  if (loweredHost === null) {
    return { ok: false, reason: "postverb state-change host negation lowering 영역 외" };
  }
  const effectiveProjection = projection === "adjectival" &&
    (ctx.preModalNeg !== null || stateChangeHostClosesNegative(loweredHost))
    ? "adverbial"
    : projection;
  const base = stateChangeBase(loweredHost, effectiveProjection);
  const sourceTrace = sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: base.prefix.trimEnd(),
      inputPrefix: inputBase.prefix,
      basePrefix: base.prefix,
      sourceTokens,
      splitFinal: "last_token"
    });
  return {
    ok: true,
    base,
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function stateChangeHostClosesNegative(base: KoreanLemmaPredicateBase): boolean {
  return base.policy?.kind === "negative_noun_copula_interop" ||
    base.capabilities?.negativeClosure !== undefined;
}

function stateChangePotentialBaseResult(
  base: KoreanLemmaPredicateBase,
  trace?: {
    readonly inputPrefix: string;
    readonly sourceTokens: readonly RuntimeHaruToken[];
  }
): BaseResult {
  const basePrefix = `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을")} 수 `;
  const sourceTrace = trace === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: base.prefix.trimEnd(),
      inputPrefix: trace.inputPrefix,
      basePrefix,
      sourceTokens: trace.sourceTokens,
      splitFinal: "none"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
      ...(base.policy === undefined ? {} : { policy: base.policy })
    },
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function getSimpleAspectBase(
  aspect: SimpleAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null
): { readonly stemPart: string; readonly auxLemma: string; readonly auxIsVerb: boolean } {
  const reading = aspect.semantic?.reading ?? "generic";
  const baseStemPart = (aspect.aspect === "te_iru" || aspect.aspect === "tsutsu_aru" || aspect.aspect === "te_mawaru") && reading !== "resultative_state"
    ? conjugate(stemLemma, stemIrregular, "고")
    : aspect.semantic?.renderStrategy === "movement_reason"
      ? conjugate(stemLemma, stemIrregular, "아/어서")
      : reading === "sequential_motion"
        ? conjugate(stemLemma, stemIrregular, "고")
        : conjugate(stemLemma, stemIrregular, "아/어");
  const stemPart = applyTeFocusParticle(
    baseStemPart,
    aspect.teFocusTarget === "aspect_auxiliary_negation" ? undefined : aspect.teFocusParticle,
    stemLemma,
    stemIrregular
  );
  let auxLemma: string;
  let auxIsVerb: boolean;
  switch (aspect.aspect) {
    case "te_iru":
      auxLemma = aspect.auxiliaryHonorific === "respect" ? "계시다" : "있다";
      auxIsVerb = aspect.auxiliaryHonorific === "respect";
      break;
    case "tsutsu_aru": auxLemma = "있다"; auxIsVerb = false; break;
    case "te_aru":
      if (reading === "prepared_state") {
        auxLemma = "두다";
        auxIsVerb = true;
      } else if (reading === "resultative_state") {
        auxLemma = "있다";
        auxIsVerb = false;
      } else {
        auxLemma = "놓다";
        auxIsVerb = true;
      }
      break;
    case "te_oku": auxLemma = "두다"; auxIsVerb = true; break;
    case "te_shimau": auxLemma = "버리다"; auxIsVerb = true; break;
    case "te_miru": auxLemma = "보다"; auxIsVerb = true; break;
    case "te_mawaru": auxLemma = "다니다"; auxIsVerb = true; break;
    case "te_kuru": auxLemma = "오다"; auxIsVerb = true; break;
    case "te_iku": auxLemma = "가다"; auxIsVerb = true; break;
    default: return assertNever(aspect.aspect);
  }
  return { stemPart, auxLemma, auxIsVerb };
}

function applyTeFocusParticle(
  stemPart: string,
  focusParticle: SimpleAspectOp["teFocusParticle"],
  stemLemma: string,
  stemIrregular: IrregularType | null
): string {
  if (focusParticle === undefined) {
    return stemPart;
  }
  if (focusParticle === "は") {
    return `${stemPart}는`;
  }
  return conjugate(stemLemma, stemIrregular, "아/어도");
}

export { isBenefactiveAspectKind } from "../inspect.js";

export function benefactiveBase(
  benefactive: BenefactiveAspectOp,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  stemInfinitive?: string
): BaseResult {
  const payload = benefactive.benefactive;
  const tailLemma = payload.tailLemma ?? (payload.honorific ? "주시다" : "주다");
  const tailIrregular = payload.tailIrregular;
  const lexicalTailAbsorptionKind = payload.lexicalTailAbsorptionKind ??
    (stemLemma.endsWith("주다") ? (payload.honorific || tailLemma === "주시다" ? "honorific_jusida" : "embedded_juda") : null);
  const absorbedLemma = absorbedBenefactiveLemma(stemLemma, { ...payload, lexicalTailAbsorptionKind }, tailLemma);
  const stemPart = absorbedLemma === null
    ? (stemInfinitive ?? conjugate(stemLemma, stemIrregular, "아/어"))
    : "";
  const effectiveTailLemma = absorbedLemma ?? tailLemma;
  const requestComplementBase: KoreanLemmaPredicateBase = {
    prefix: "",
    final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
  };
  const policy: PredicateBasePolicy = {
    kind: "benefactive",
    family: payload.kind,
    potential: payload.potential,
    lexicalTailAbsorptionKind,
    scopeBridgeNegativeAttributive: "completed",
    requestComplementBase,
    desireMode: payload.potential
      ? "unsupported"
      : (payload.kind === "ageru" ? "generic" : "request")
  };

  if (payload.potential) {
    const tailAttr = conjugate(effectiveTailLemma, absorbedLemma === null ? tailIrregular : null, "ㄹ/을");
    return {
      ok: true,
      base: {
        prefix: absorbedLemma === null ? `${stemPart} ${tailAttr} 수 ` : `${tailAttr} 수 `,
        final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
        policy
      },
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }

  return {
    ok: true,
    base: {
      prefix: absorbedLemma === null ? `${stemPart} ` : "",
      final: {
        kind: "lemma",
        lemma: effectiveTailLemma,
        irregular: absorbedLemma === null ? tailIrregular : null,
        isVerb: true
      },
      capabilities: { prohibitionHost: "action" },
      policy
    },
    chainOnFinalSupported: true
  };
}

export function benefactiveBaseFromInput(
  benefactive: BenefactiveAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult {
  const causativeFlatten = causativeReceivePivotBenefactiveBase(benefactive, inputBase);
  if (causativeFlatten !== null) {
    return causativeFlatten;
  }
  const res = benefactiveBase(
    benefactive,
    inputBase.final.lemma,
    inputBase.final.irregular,
    predicateBaseInfinitiveForm(inputBase)
  );
  if (!res.ok) {
    return res;
  }
  const sourceTrace = simpleBenefactiveSourceTrace(res, benefactive.source.tokens);
  return {
    ...res,
    base: {
      ...res.base,
      prefix: `${inputBase.prefix}${res.base.prefix}`,
      ...(res.base.policy?.kind === "benefactive"
        ? {
          policy: {
            ...res.base.policy,
            requestComplementBase: inputBase
          }
        }
        : {})
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function teHoshiiSourceTrace(
  resultBase: KoreanLemmaPredicateBase,
  sourceTokens: readonly RuntimeHaruToken[],
  desiredPredicateNegation: NegationOp | null
): BaseSourceTrace | undefined {
  if (resultBase.prefix.length === 0 || sourceTokens.length === 0) {
    return undefined;
  }
  const split = splitTeBridgeSourceTokens(sourceTokens);
  const inputProjectionText = resultBase.prefix.trimEnd();
  const spacing = resultBase.prefix.slice(inputProjectionText.length);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (spacing.length > 0) {
    carrierPrefixSegments.push({
      text: spacing,
      sourceTokens: split.bridgeTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: [
      ...(desiredPredicateNegation?.source.tokens ?? []),
      ...split.bridgeTokens
    ],
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "modal"
  };
}

function simpleBenefactiveSourceTrace(
  result: OkBaseResult,
  sourceTokens: readonly RuntimeHaruToken[]
): BaseSourceTrace | undefined {
  if (
    result.base.policy?.kind !== "benefactive" ||
    result.base.prefix.length === 0 ||
    sourceTokens.length === 0
  ) {
    return undefined;
  }
  const split = splitTeBridgeSourceTokens(sourceTokens);
  if (result.base.policy.potential) {
    return potentialBenefactiveSourceTrace(result, split);
  }
  const inputProjectionText = result.base.prefix.trimEnd();
  const spacing = result.base.prefix.slice(inputProjectionText.length);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (spacing.length > 0) {
    carrierPrefixSegments.push({
      text: spacing,
      sourceTokens: split.bridgeTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: split.bridgeTokens,
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function potentialBenefactiveSourceTrace(
  result: OkBaseResult,
  split: { readonly bridgeTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] }
): BaseSourceTrace | undefined {
  const matched = /^(.*?)(\s+\S+ 수\s*)$/.exec(result.base.prefix);
  const inputProjectionText = matched?.[1] ?? "";
  const tailCarrierText = matched?.[2] ?? result.base.prefix;
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (inputProjectionText.length > 0) {
    const spacing = tailCarrierText.match(/^\s*/)?.[0] ?? "";
    const tailText = tailCarrierText.slice(spacing.length);
    if (spacing.length > 0) {
      carrierPrefixSegments.push({
        text: spacing,
        sourceTokens: split.bridgeTokens,
        kind: "aux",
        projectionConfidence: "semantic"
      });
    }
    if (tailText.length > 0) {
      carrierPrefixSegments.push({
        text: tailText,
        sourceTokens: split.finalTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      });
    }
  } else {
    carrierPrefixSegments.push({
      text: tailCarrierText,
      sourceTokens: split.finalTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: inputProjectionText.length > 0 ? split.bridgeTokens : [],
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "aux"
  };
}

function splitTeBridgeSourceTokens(
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly bridgeTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] } {
  const first = sourceTokens[0];
  if (
    first !== undefined &&
    (first.surface === "て" || first.surface === "で")
  ) {
    return {
      bridgeTokens: sourceTokens.slice(0, 1),
      finalTokens: sourceTokens.slice(1)
    };
  }
  return {
    bridgeTokens: [],
    finalTokens: sourceTokens
  };
}

function causativeReceivePivotBenefactiveBase(
  benefactive: BenefactiveAspectOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  const payload = benefactive.benefactive;
  if (inputBase.policy?.kind !== "causative") {
    return null;
  }
  if (payload.potential) {
    return null;
  }
  if (payload.causativeRenderPolicy === "lexical_recipient_humble_action") {
    const actionStem = conjugate(inputBase.policy.sourceLemma, inputBase.policy.sourceIrregular, "아/어");
    const tailLemma = payload.honorific || payload.kind === "itadaku" ? "드리다" : "주다";
    return {
      ok: true,
      base: {
        prefix: `${actionStem} `,
        final: { kind: "lemma", lemma: tailLemma, irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true
    };
  }
  if (payload.causativeRenderPolicy === "implicit_permission_sahen_periphrastic") {
    const hostText = `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "아/어")}`;
    const basePrefix = `${hostText} `;
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: inputBase.prefix,
      basePrefix,
      sourceTokens: benefactive.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "주시다", irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  if (payload.causativeRenderPolicy === "implicit_permission_sahen_lexical_causative") {
    const causativeLemma = sahenCausativeLemma(inputBase.policy.sourceLemma);
    if (causativeLemma === null) {
      return null;
    }
    return {
      ok: true,
      base: {
        prefix: `${conjugate(causativeLemma, null, "아/어")} `,
        final: { kind: "lemma", lemma: "주시다", irregular: null, isVerb: true },
        policy: {
          kind: "benefactive",
          family: payload.kind,
          potential: false,
          scopeBridgeNegativeAttributive: "completed",
          desireMode: payload.kind === "morau" || payload.kind === "itadaku" ? "request" : "unsupported"
        }
      },
      chainOnFinalSupported: true
    };
  }
  return null;
}

function sahenCausativeLemma(sourceLemma: string): string | null {
  if (!sourceLemma.endsWith("하다") || sourceLemma.length <= "하다".length) {
    return null;
  }
  return `${sourceLemma.slice(0, -"하다".length)}시키다`;
}

function absorbedBenefactiveLemma(
  stemLemma: string,
  payload: BenefactiveAspectOp["benefactive"],
  tailLemma: string
): string | null {
  if (!stemLemma.endsWith("주다")) {
    return null;
  }
  const absorptionKind = payload.lexicalTailAbsorptionKind ?? null;
  const base = stemLemma.slice(0, -"주다".length);
  if (payload.recipientSideHumble && payload.kind === "itadaku") {
    return `${base}드리다`;
  }
  if (absorptionKind === "honorific_jusida" || payload.honorific || tailLemma === "주시다") {
    return `${base}주시다`;
  }
  return stemLemma;
}

export function monoHostPredicateBase(
  modal: Extract<ModalOp, { readonly modal: "mono" }>,
  inputBase: KoreanLemmaPredicateBase,
  preNeg: NegationOp | null
): BaseResult {
  const host = preNeg === null ? inputBase : applyNegationChainToLemmaBase(inputBase, preNeg);
  if (host === null || host.final.kind !== "lemma") {
    return { ok: false, reason: "mono host predicate base lowering 영역 외" };
  }
  if (modal.reading === "admirative") {
    return { ok: true, base: host, terminalRealization: { kind: "exclamative" } };
  }
  if (modal.reading === "habitual") {
    return {
      ok: true,
      base: {
        prefix: `${host.prefix}${conjugate(host.final.lemma, host.final.irregular, "곤")} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
      }
    };
  }
  return { ok: false, reason: "mono nominal reading uses the bound-noun carrier base" };
}
