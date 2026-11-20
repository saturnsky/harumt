import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { lookupSetMatches, type LookupTables } from "../../../../lookup-tables.js";
import { assertNever, negationFocusParticleForMarker, type AspectProjectionPolicy, type MiseruAspectOp, type NegationFocusParticle, type SimpleAspectOp } from "../grammar.js";
import { hostProjectionSourceTrace, type BaseResult, type BaseSourceTrace, type FinalNegationLoweringPolicy, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type PredicateBasePolicy, type TailTraceSegment } from "./base-model.js";
import { stateChangeBase } from "./base-support.js";
import { splitTeBridgeSourceTokens } from "./tail-host-trace.js";

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
