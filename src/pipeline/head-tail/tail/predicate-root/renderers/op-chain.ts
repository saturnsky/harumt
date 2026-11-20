import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { POS5, 連用形_促音便 } from "../../../../../types/pos.js";
import { type TargetSegment } from "../../../../../types/projection.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { type Warning } from "../../../../../types/warning.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import type { PassiveClass } from "../../../../voice-class.js";
import { type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type NegationOp, type PotentialKotoGaDekiruIdiomOp, type ProhibitionAspectOp, type ProjectedHostSegments, type RequestAspectOp, type ShortNegationPolicy, type SimpleAspectOp, type StemNode, type TenseOp, type VoiceOp } from "../grammar.js";
import { isChainableAspectOpKind, isChainableHeadOp, isHeadOp, isOperatorWrapBoundaryHeadOp, isSimpleAspectOpKind, multiAspectPathCanUseOperatorFold, operatorCreatesPotentialPredicate, operatorCreatesSourceVerbalPredicate, sourceVerbalPredicateAfterAuxOp } from "../operator-head.js";
import { isRequestCommandBaseOp, isBenefactiveAspectKind } from "../inspect.js";
import { applyNegationChainToLemmaBase, hostProjectionSourceTrace, policyWithPrependedHostPrefix, projectedHostTraceSegment, scopeTopicTraceCarrierContraction, stemFusionSourceTrace, tracePrefixContractionForTarget, type AttributivePastProjection, type BaseResult, type BaseSourceTrace, type ChainSourceTrace, type ConnectiveBaseOverride, type FinalNegationLoweringPolicy, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, type OkBaseResult, type OpContext, type OperatorOp, predicateBasePolicyAllomorphHost, type PassiveStemOptions, type PredicateBasePolicy, type TailTraceSegment, type TailTraceSegmentKind, type TerminalRealization } from "./base-model.js";

export { scopeTopicTraceCarrierContraction };
export { isChainableHeadOp, isHeadOp, isOperatorWrapBoundaryHeadOp, isSimpleAspectOpKind, multiAspectPathCanUseOperatorFold };
import { applyNonLastPrefixContractions, finalNegationLoweringForcesPast, lowerFinalNegationForCommittedBase, nounSubjectPart, obligationBase, prohibitionPredicateBase, scopeCarrierCopulaBase, simpleStemBaseResult, copulaCarrierBaseForInterOp, stateChangeBase } from "./base-support.js";
import { conjectureBase } from "./conjecture-compose.js";
import { nounCopulaObligationBase } from "./connective-compose.js";
import { pastNegStemAttributive } from "./final-forms.js";
import { stemAllowsSahenShortNegationSplit } from "../short-negation-policy.js";
import { aspectBaseResult, completionTeIruNegativeAspectForComposedInput, miseruBase, negativeTeAdverbialAspectBaseResult, normalizeSimpleAspectForComposedInput, potentialDirectionalAspectBaseResult, simpleAspectWithDropAuxSemantic, simpleAspectWithoutSemantic, sourceVerbAdjectivalDirectionalAspectBaseResult, sourceVerbAdjectivalEllipticTeIruNegativeBaseResult, sourceVerbAdjectivalTeShimauBaseResult, sourceVerbAdjectivalTsutsuAruBaseResult, teIruAuxiliaryNegationFocusParticle } from "./aspect-bases.js";
import { benefactiveBaseFromInput, benefactiveDesiderativeRequestBase, potentialBase, potentialObjectBaseFromAttributive, voiceBase } from "./voice-benefactive-bases.js";
import { cannotRefrainNegativeDewaIrarenaiBase, decisionKotoNiSuruBase, experienceBase, forbiddenBase, inevitableZaruOEnaiBase, madeMoNaiBase, methodYouGaNaiBase, negativeNecessityKotoWaBase, negativeNecessitySumuBase, onlyOptionBase, outcomeKotoNiNaruBase, permissionBase, sufficiencyConditionalBase, teEvaluationBase } from "./idiom-bases.js";
import { copulaCarrierConjectureBase, limitNegationBaseFromPredicateBase, maiScopeCarrierBase, monoHostPredicateBase, modalBase, modalFinalChainPolicy, nominalHostEvidentialLikenessBase, nodaCarrierAbsorbedByHostBoundNoun, nodaCarrierConjectureBase, nodaCarrierLikenessBase, nodaCarrierKamoBase, quotedPropositionLikenessBase, soudaHearsayBaseFromPredicateBase, tokoroBaseFromPredicateBase, wakeCarrierConjectureBase, wakeExplanatoryCitationBase, wakeImpossibleBase } from "./modal-bases.js";
import { degreeIntensifierBase, postverbAuxiliaryBaseResult } from "./postverb-auxiliary-bases.js";
import { desiderativeBaseFromPredicateBase, desireBaseResult, teHoshiiSourceTrace } from "./desire-bases.js";
import { predicateProjectionCarrierBase, predicateQuoteCarrierBase, predicateSuffixBaseResult } from "./predicate-bases.js";
import { scopeBridgeBase } from "./scope-bridge-bases.js";

export function operatorChainSlotForWrapOp(
  wrapOp: AuxOpNode | null,
  layer: AuxLayerNode,
  opChain: readonly AuxOpNode[]
): number | null {
  if (wrapOp === null) return null;
  const wrapIdx = layer.ops.indexOf(wrapOp);
  if (wrapIdx < 0) return null;
  for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
    const startIdx = layer.ops.indexOf(opChain[chainIdx]!);
    if (startIdx < 0) continue;
    const nextIdx = chainIdx + 1 < opChain.length
      ? layer.ops.indexOf(opChain[chainIdx + 1]!)
      : layer.ops.length;
    if (startIdx < wrapIdx && wrapIdx < (nextIdx < 0 ? layer.ops.length : nextIdx)) {
      return chainIdx;
    }
  }
  return null;
}

export function operatorChainOpConsumesPrecedingNegation(
  op: AuxOpNode | undefined
): boolean {
  if (op?.kind !== "idiom") return false;
  return op.idiom === "negative_necessity_sumu"
    || op.idiom === "cannot_refrain_negative_dewa_irarenai";
}

export function operatorChainOpAdmitsPrecedingTeComplementNegation(
  negOp: NegationOp,
  layer: AuxLayerNode,
  hostOp: AuxOpNode | undefined,
  nextOp: AuxOpNode | undefined
): boolean {
  if (nextOp?.kind !== "aspect") return false;
  if (!isSimpleAspectOpKind(nextOp.aspect) && !isBenefactiveAspectKind(nextOp.aspect)) {
    return false;
  }
  const negIdx = layer.ops.indexOf(negOp);
  if (negIdx < 0 || layer.ops.indexOf(nextOp) !== negIdx + 1) return false;
  if (nextOp.teFocusParticle !== undefined) return false;
  if (negOp.chainDepth !== 1 || negOp.chainPast) return false;
  if (negOp.focusParticle !== undefined) return false;
  return hostOp !== undefined && operatorCreatesSourceVerbalPredicate(hostOp);
}

export type OperatorChainWrapSlots = {
  readonly pastAfterChainIdx: Map<number, TenseOp>;
  readonly negAfterChainIdx: Map<number, NegationOp>;
  readonly negBeforeChainIdx: Map<number, NegationOp>;
};

export function assignOperatorChainWrapSlots(
  layer: AuxLayerNode,
  opChain: readonly AuxOpNode[],
  postTenses: readonly TenseOp[],
  postNegations: readonly NegationOp[]
): { readonly ok: true; readonly slots: OperatorChainWrapSlots }
  | { readonly ok: false; readonly reason: string } {
  const pastAfterChainIdx = new Map<number, TenseOp>();
  for (const tenseOp of postTenses) {
    const slot = operatorChainSlotForWrapOp(tenseOp, layer, opChain);
    if (slot === null) {
      return { ok: false, reason: "chain ≥ 2 + post tense 위치 식별 실패 — silent wrong output 차단" };
    }
    if (pastAfterChainIdx.has(slot)) {
      return { ok: false, reason: "multiple post-reference TenseOps in same chain slot not supported" };
    }
    pastAfterChainIdx.set(slot, tenseOp);
  }
  const negAfterChainIdx = new Map<number, NegationOp>();
  const negBeforeChainIdx = new Map<number, NegationOp>();
  for (const negOp of postNegations) {
    const slot = operatorChainSlotForWrapOp(negOp, layer, opChain);
    if (slot === null) {
      return { ok: false, reason: "chain ≥ 2 + post negation 위치 식별 실패 — silent wrong output 차단" };
    }
    const nextSlot = slot + 1;
    if (
      operatorChainOpConsumesPrecedingNegation(opChain[nextSlot]) ||
      operatorChainOpAdmitsPrecedingTeComplementNegation(negOp, layer, opChain[slot], opChain[nextSlot])
    ) {
      if (negBeforeChainIdx.has(nextSlot)) {
        return { ok: false, reason: "multiple pre-reference NegationOps in same chain slot not supported" };
      }
      negBeforeChainIdx.set(nextSlot, negOp);
      continue;
    }
    if (negAfterChainIdx.has(slot)) {
      return { ok: false, reason: "multiple post-reference NegationOps in same chain slot not supported" };
    }
    negAfterChainIdx.set(slot, negOp);
  }
  return { ok: true, slots: { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } };
}

function splitInitialLongNegationInputProjection(
  inputProjectionText: string,
  base: KoreanLemmaPredicateBase,
  stemSourceTokens: readonly RuntimeHaruToken[],
  negation: NegationOp | null,
  pastSourceTokens: readonly RuntimeHaruToken[] | undefined,
  stemKind: TailTraceSegmentKind
): readonly TailTraceSegment[] | null {
  if (negation === null) {
    return null;
  }
  const jiIndex = inputProjectionText.indexOf("지 ");
  if (jiIndex <= 0) {
    return null;
  }
  const stemText = inputProjectionText.slice(0, jiIndex);
  const afterJi = inputProjectionText.slice(jiIndex + "지 ".length);
  if (!afterJi.startsWith("않")) {
    return null;
  }
  const negTokens = negation.source.tokens;
  const split = negation.sourceSplit?.kind === "predicate_copula_negative"
    ? {
      bridgeTokens: negation.sourceSplit.bridgeTokens,
      finalNegTokens: negation.sourceSplit.finalTokens
    }
    : null;
  const bridgeTokens = split?.bridgeTokens ?? negationBridgeSourceTokens(negation);
  const finalNegTokens = split?.finalNegTokens ?? (
    bridgeTokens.length === 0
      ? negTokens
      : negTokens.slice(bridgeTokens.length)
  );
  const finalTokens = [
    ...finalNegTokens,
    ...(pastSourceTokens ?? [])
  ];
  if (finalTokens.length === 0) {
    return null;
  }
  const segments: TailTraceSegment[] = [{
    text: stemText,
    sourceTokens: stemSourceTokens,
    kind: stemKind,
    projectionConfidence: "semantic"
  }];
  if (bridgeTokens.length > 0) {
    segments.push({
      text: split === null ? "지 " : "지",
      sourceTokens: bridgeTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
    segments.push({
      text: split === null ? afterJi : ` ${afterJi}`,
      sourceTokens: finalTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  } else {
    segments.push({
      text: `지 ${afterJi}`,
      sourceTokens: finalTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return segments;
}

function negationBridgeSourceTokens(negation: NegationOp): readonly RuntimeHaruToken[] {
  const tokens = negation.source.tokens;
  if (tokens.length <= 1) {
    return [];
  }
  const last = tokens[tokens.length - 1]!;
  const lastIsNegativeFinal =
    last.dictionaryForm === "ない" ||
    last.dictionaryForm === "無い" ||
    last.normalizedForm === "無い";
  return lastIsNegativeFinal ? tokens.slice(0, -1) : [];
}

export function operatorChainWarnings(
  ops: readonly OperatorOp[],
  preModalNeg: NegationOp | null
): readonly Warning[] {
  const warnings: Warning[] = [];
  const firstOp = ops[0];
  if (
    preModalNeg !== null &&
    firstOp !== undefined &&
    firstOp.kind === "idiom" &&
    firstOp.idiom === "potential_koto_ga_dekiru"
  ) {
    warnings.push({
      type: "out_of_subset_default",
      severity: "warning",
      opKind: "dekiru_pre_neg",
      message: "V neg + dekiru (식 食べないことができる) — '먹지 않을 수 있다' 단일 default 매핑. 의미 분기 정책 (Phase 5 영역) 미정."
    });
  }
  let hasPotentialBase = false;
  for (const op of ops) {
    if (op.kind === "aspect" && (op.aspect === "te_kuru" || op.aspect === "te_iku") && hasPotentialBase) {
      warnings.push({
        type: "out_of_subset_default",
        severity: "warning",
        opKind: `${op.aspect}_potential_projection`,
        message: "potential predicate + てくる/ていく 는 비동사 base 위 방향 aspect. '수 있게 되어 오다/가다' 보수적 projection 으로 렌더링."
      });
    }
    if (operatorCreatesPotentialPredicate(op)) {
      hasPotentialBase = true;
    }
  }
  return warnings;
}

export function chainStemTraceFields(
  stem: StemNode
): Pick<ChainContext, "stemSourceTokens" | "stemProjectedHost"> {
  return {
    stemSourceTokens: stem.source.tokens,
    ...(stem.projectedHost === undefined ? {} : { stemProjectedHost: stem.projectedHost })
  };
}

export interface ChainContext {
  readonly lookups: LookupTables;
  readonly stemPrefix: string | undefined;
  readonly stemSourceTokens?: readonly RuntimeHaruToken[];
  readonly stemProjectedHost?: ProjectedHostSegments;
  readonly initialPolicy?: PredicateBasePolicy;
  readonly initialBaseResult?: OkBaseResult;
  readonly initialChainSourceTrace?: ChainSourceTrace;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceStemIsSahenPredicate?: boolean;
  readonly sourceStemIsVolitional?: boolean;
  readonly adverbialStemLemma?: string;
  readonly preModalNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly stemPastSourceTokens?: readonly RuntimeHaruToken[];
  readonly pastAfterChainIdx: ReadonlyMap<number, TenseOp>;
  readonly negAfterChainIdx: ReadonlyMap<number, NegationOp>;
  readonly negBeforeChainIdx?: ReadonlyMap<number, NegationOp>;
  readonly formal: boolean;
  readonly shortNegationPolicy: ShortNegationPolicy | undefined;
  readonly preferShortLikenessNegation?: boolean;
  readonly absorbedPassiveAux: boolean;
  readonly absorbedPassiveClass?: PassiveClass;
  readonly passiveStemOptions: PassiveStemOptions;
}

function prependInputPolicy(
  inputBase: KoreanLemmaPredicateBase,
  base: KoreanPredicateBase,
  options: { readonly carryInputPolicy?: boolean } = {}
): PredicateBasePolicy | undefined {
  if (inputBase.policy?.kind === "noun_copula_interop") {
    return base.policy;
  }
  const policy = base.policy ?? (options.carryInputPolicy === false ? undefined : inputBase.policy);
  if (policy?.kind === "te_iru_negative" && inputBase.prefix.length > 0) {
    return {
      ...policy,
      stemPrefix: `${inputBase.prefix}${policy.stemPrefix ?? ""}`
    };
  }
  if (policy?.kind === "te_iru_attributive_contraction") {
    if (inputBase.prefix.length > 0) return undefined;
    if (inputBase.policy !== undefined) return inputBase.policy;
  }
  return policy;
}
function prependInputPrefix(
  inputBase: KoreanLemmaPredicateBase,
  base: KoreanPredicateBase,
  options: { readonly carryInputPolicy?: boolean } = {}
): KoreanPredicateBase {
  const policy = prependInputPolicy(inputBase, base, options);
  if (policy === undefined && base.policy?.kind === "te_iru_attributive_contraction") {
    return {
      prefix: `${inputBase.prefix}${base.prefix}`,
      final: base.final,
      ...(base.capabilities === undefined ? {} : { capabilities: base.capabilities })
    };
  }
  const shiftedPolicy = policy !== undefined && policy === base.policy
    ? policyWithPrependedHostPrefix(policy, inputBase.prefix)
    : policy;
  return {
    ...base,
    prefix: `${inputBase.prefix}${base.prefix}`,
    final: base.final,
    ...(shiftedPolicy === undefined ? {} : { policy: shiftedPolicy })
  };
}
function withInputPrefix(
  inputBase: KoreanLemmaPredicateBase,
  res: BaseResult,
  options: { readonly carryInputPolicy?: boolean } = {}
): BaseResult {
  if (!res.ok) return res;
  return {
    ...res,
    base: prependInputPrefix(inputBase, res.base, options),
    ...(res.connectiveBaseOverride === undefined
      ? {}
      : {
        connectiveBaseOverride: {
          ...res.connectiveBaseOverride,
          base: prependInputPrefix(inputBase, res.connectiveBaseOverride.base, options)
        }
      })
  };
}

export function opToBase(
  op: OperatorOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  switch (op.kind) {
    case "postverbAuxiliary":
      return postverbAuxiliaryBaseResult(op, inputBase, ctx);
    case "predicateProjectionCarrier":
      return predicateProjectionCarrierBase({
        op,
        inputBase,
        preStemNeg: opPreNeg,
        stemPast: opPast,
        formal: ctx.formal,
        pastProjection: ctx.pastProjection
      });
    case "predicateQuoteCarrier":
      return predicateQuoteCarrierBase({
        op,
        inputBase,
        preStemNeg: opPreNeg,
        stemPast: opPast,
        volitionalHost: ctx.sourceStemIsVolitional === true,
        lookups: ctx.lookups
      });
    case "predicateSuffix":
      return predicateSuffixBaseResult(op, inputBase, ctx);
    case "aspect":
      return aspectOpBase(op, inputBase, ctx);
    case "desire":
      return desireOpBase(op, inputBase, ctx);
    case "voice":
      return voiceOpBase(op, inputBase, ctx);
    case "idiom":
      return idiomOpBase(op, inputBase, ctx);
    case "scopeBridge": {
      return scopeBridgeBase(op, inputBase, ctx);
    }
    case "modal":
      return modalOpBase(op, inputBase, ctx);
    case "conjecture":
      return conjectureOpBase(op, inputBase, ctx);
    default:
      return { ok: false, reason: `op kind not in chain dispatcher` };
  }
}

function aspectOpBase(
  op: Extract<OperatorOp, { readonly kind: "aspect" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (!isChainableAspectOpKind(op.aspect)) {
    return { ok: false, reason: `aspect kind '${op.aspect}' not chainable — invariant violation` };
  }
  const simpleAspect = isSimpleAspectOpKind(op.aspect)
    ? op as SimpleAspectOp
    : null;
  const absorbed = aspectAbsorbedIntoHostBase(op, simpleAspect, inputBase, ctx);
  if (absorbed !== null) return absorbed;
  const bridged = aspectHostBridgeBase(op, simpleAspect, inputBase, ctx);
  if (bridged !== null) return bridged;
  const compositeInput = ctx.hasPriorChainOp === true;
  if (!isVerb && !compositeInput) return { ok: false, reason: "te-aspect on adj 영역 외" };
  if (opPreNeg !== null) {
    return negativeHostAspectBase(op, simpleAspect, opPreNeg, inputBase, ctx);
  }
  if (opPast) return { ok: false, reason: "V past + aspect 영역 외" };
  return composedAspectBase(op, inputBase, ctx);
}

function aspectAbsorbedIntoHostBase(
  op: Extract<OperatorOp, { readonly kind: "aspect" }>,
  simpleAspect: SimpleAspectOp | null,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  const simpleAspectForDropAux =
    simpleAspect !== null &&
      simpleAspect.aspect === "te_iru" &&
      inputBase.policy?.kind === "accustomed_aspect_projection"
      ? simpleAspectWithDropAuxSemantic(simpleAspect)
      : simpleAspect;
  if (
    simpleAspect !== null &&
    simpleAspect.aspect === "te_iru" &&
    simpleAspect.auxiliaryHonorific === "respect" &&
    (!isVerb || simpleAspectForDropAux?.semantic?.renderStrategy === "drop_aux") &&
    opPreNeg === null &&
    !opPast &&
    inputBase.final.kind === "lemma"
  ) {
    return {
      ok: true,
      base: {
        ...inputBase,
        final: {
          kind: "lemma",
          lemma: `${conjugate(inputBase.final.lemma, inputBase.final.irregular, "(으)시")}다`,
          irregular: null,
          isVerb: inputBase.final.isVerb
        }
      },
      chainOnFinalSupported: true
    };
  }
  if (
    op.aspect === "te_iru" &&
    inputBase.final.lemma === "있다" &&
    !inputBase.final.isVerb &&
    opPreNeg === null
  ) {
    const focusParticle = simpleAspect === null
      ? undefined
      : teIruAuxiliaryNegationFocusParticle(simpleAspect);
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: inputBase.policy?.kind === "benefactive" && inputBase.policy.potential
        ? false
        : true,
      ...(focusParticle === undefined
        ? {}
        : { finalNegationOptions: { firstNegationFocusParticle: focusParticle } }),
      ...(inputBase.policy?.kind === "benefactive" && inputBase.policy.potential
        ? { finalNegationLoweringPolicy: "potential_idiom" as const }
        : {})
    };
  }
  if (
    op.aspect === "te_iru" &&
    simpleAspectForDropAux?.semantic?.renderStrategy === "drop_aux"
  ) {
    const focusParticle = teIruAuxiliaryNegationFocusParticle(simpleAspectForDropAux);
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: true,
      ...(focusParticle === undefined
        ? {}
        : { finalNegationOptions: { firstNegationFocusParticle: focusParticle } }),
    };
  }
  if (
    inputBase.policy?.kind === "accustomed_aspect_projection" &&
    isSimpleAspectOpKind(op.aspect)
  ) {
    if (opPreNeg !== null) return { ok: false, reason: "stative postverb neg + aspect 영역 외" };
    if (opPast) return { ok: false, reason: "stative postverb past + aspect 영역 외" };
    const changedBase = stateChangeBase(inputBase, "adjectival");
    if (!changedBase.final.isVerb) {
      return { ok: false, reason: "stative postverb aspect change-base 영역 외" };
    }
    const aspectResult = aspectBaseResult(
      simpleAspectWithoutSemantic(op as SimpleAspectOp),
      changedBase.final.lemma,
      changedBase.final.irregular,
      ctx.lookups
    );
    if (!aspectResult.ok) return aspectResult;
    const stativePrefix = `${changedBase.prefix}${aspectResult.base.prefix}`;
    const stativeTrace = hostProjectionSourceTrace({
      hostText: stativePrefix.trimEnd(),
      inputPrefix: inputBase.prefix,
      basePrefix: stativePrefix,
      sourceTokens: op.source.tokens,
      splitFinal: "none"
    });
    const { sourceTrace: _stativeCarried, ...stativeRest } = aspectResult;
    void _stativeCarried;
    return {
      ...stativeRest,
      base: {
        ...aspectResult.base,
        prefix: stativePrefix
      },
      ...(stativeTrace === undefined ? {} : { sourceTrace: stativeTrace })
    };
  }
  return null;
}

function aspectHostBridgeBase(
  op: Extract<OperatorOp, { readonly kind: "aspect" }>,
  simpleAspect: SimpleAspectOp | null,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (opPreNeg === null && !opPast) {
    const potentialDirection = potentialDirectionalAspectBaseResult(op as SimpleAspectOp, inputBase);
    if (potentialDirection !== null) {
      return potentialDirection;
    }
  }
  if (
    op.aspect === "te_shimau" &&
    simpleAspect !== null &&
    ctx.sourceStemIsVerb === true &&
    !ctx.hasPriorChainOp &&
    !isVerb &&
    opPreNeg === null &&
    !opPast
  ) {
    const bridged = sourceVerbAdjectivalTeShimauBaseResult(simpleAspect, inputBase);
    if (bridged !== null) return bridged;
  }
  if (
    op.aspect === "te_iru" &&
    ctx.sourceStemIsSahenPredicate === true &&
    !isVerb &&
    opPreNeg === null &&
    !opPast
  ) {
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: true
    };
  }
  if (
    simpleAspect !== null &&
    (ctx.sourceStemIsVerb === true || simpleAspect.ellipticTeIruSourceHost === "verbal_predicate") &&
    !isVerb &&
    opPreNeg === null &&
    !opPast
  ) {
    const ellipticNegative = sourceVerbAdjectivalEllipticTeIruNegativeBaseResult(
      simpleAspect,
      inputBase,
      ctx.lookups
    );
    if (ellipticNegative !== null) return withInputPrefix(inputBase, ellipticNegative);
    if (!ctx.hasPriorChainOp) {
      const directional = sourceVerbAdjectivalDirectionalAspectBaseResult(simpleAspect, inputBase);
      if (directional !== null) return directional;
    }
  }
  if (
    op.aspect === "te_iru" &&
    op.collapsed === "honorific" &&
    !isVerb &&
    opPreNeg === null &&
    !opPast
  ) {
    return { ok: true, base: inputBase, chainOnFinalSupported: true };
  }
  if (
    simpleAspect !== null &&
    ctx.sourceStemIsVerb === true &&
    !ctx.hasPriorChainOp &&
    !isVerb &&
    opPreNeg === null &&
    !opPast
  ) {
    const inchoative = sourceVerbAdjectivalTsutsuAruBaseResult(simpleAspect, inputBase);
    if (inchoative !== null) return inchoative;
  }
  return null;
}

function negativeHostAspectBase(
  op: Extract<OperatorOp, { readonly kind: "aspect" }>,
  simpleAspect: SimpleAspectOp | null,
  opPreNeg: NegationOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const isVerb = inputBase.final.isVerb;
  const teComplementHostIsVerbal = isVerb || ctx.sourceStemIsVerb === true;
  if (
    opPreNeg.chainDepth !== 1 ||
    opPreNeg.chainPast ||
    !teComplementHostIsVerbal
  ) {
    return { ok: false, reason: "V neg + aspect 영역 외" };
  }
  if (simpleAspect !== null) {
    return negativeTeAdverbialAspectBaseResult(simpleAspect, inputBase, ctx.lookups);
  }
  if (isBenefactiveAspectKind(op.aspect)) {
    const benefactive = op as BenefactiveAspectOp;
    const prohibitionRequest =
      benefactive.terminalMood === "imperative" ||
      benefactive.requestEvidence === "terminal_question";
    if (prohibitionRequest) {
      return benefactiveBaseFromInput(benefactive, prohibitionPredicateBase(inputBase));
    }
    const negativeInput = applyNegationChainToLemmaBase(inputBase, opPreNeg);
    if (negativeInput === null) {
      return { ok: false, reason: "negative benefactive host lowering 영역 외" };
    }
    return benefactiveBaseFromInput(benefactive, negativeInput);
  }
  return { ok: false, reason: "V neg + aspect 영역 외" };
}

function composedAspectBase(
  op: Extract<OperatorOp, { readonly kind: "aspect" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  if (isSimpleAspectOpKind(op.aspect)) {
    if (
      op.aspect === "te_shimau" &&
      op.semantic?.renderStrategy === "passive_completion" &&
      inputBase.policy?.kind === "voice" &&
      inputBase.policy.voice === "passive" &&
      inputBase.policy.adversativePassive === true &&
      inputBase.final.lemma === "버리다"
    ) {
      return {
        ok: true,
        base: inputBase,
        chainOnFinalSupported: true
      };
    }
    const simpleAspect = normalizeSimpleAspectForComposedInput(
      completionTeIruNegativeAspectForComposedInput(op as SimpleAspectOp, inputBase),
      inputBase
    );
    const shouldDropInputCompletionPolicy =
      simpleAspect.aspect === "te_iru" &&
      inputBase.policy?.kind === "completion" &&
      inputBase.policy.teIruNegativeStrategy === "preserve_aspect";
    return withInputPrefix(inputBase,
      aspectBaseResult(simpleAspect, stemLemma, stemIrregular, ctx.lookups),
      { carryInputPolicy: !shouldDropInputCompletionPolicy }
    );
  }
  if (op.aspect === "te_hoshii") {
    const desireBase = desiderativeBaseFromPredicateBase(inputBase, ctx.desiredPredicateNegation);
    if (desireBase === null) {
      return { ok: false, reason: "desired predicate negation + desiderative lowering 영역 외" };
    }
    const sourceTrace = teHoshiiSourceTrace(
      desireBase,
      op.source.tokens,
      ctx.desiredPredicateNegation
    );
    return {
      ok: true,
      base: desireBase,
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  if (op.aspect === "te_miseru") {
    const base = miseruBase(op, stemLemma, stemIrregular);
    const sourceTrace = stemFusionSourceTrace(base.prefix, op.source.tokens, { splitFinal: "last_token" });
    return withInputPrefix(inputBase, {
      ok: true,
      base,
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    });
  }
  if (isBenefactiveAspectKind(op.aspect)) {
    return benefactiveBaseFromInput(op as BenefactiveAspectOp, inputBase);
  }
  return { ok: false, reason: `aspect kind '${op.aspect}' base 변환 미작성` };
}

function desireOpBase(
  op: Extract<OperatorOp, { readonly kind: "desire" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  if (!isVerb && inputBase.prefix.length === 0) {
    return { ok: false, reason: "desire on adj 영역 외 (タイ는 V 만)" };
  }
  if (opPreNeg !== null) return { ok: false, reason: "V neg + desire 비표준" };
  if (inputBase.policy?.kind === "benefactive") {
    if (inputBase.policy.potential || inputBase.policy.desireMode === "unsupported") {
      return { ok: false, reason: "benefactive + desire policy 영역 외" };
    }
    if (inputBase.policy.desireMode === "request") {
      const requested = benefactiveDesiderativeRequestBase(inputBase);
      const requestBase = op.form === "tagaru"
        ? { ...requested, policy: { kind: "desire" as const, nodaConnectiveFlatten: true as const } }
        : requested;
      const sourceTrace = hostProjectionSourceTrace({
        hostText: requestBase.prefix.trimEnd(),
        inputPrefix: inputBase.prefix,
        basePrefix: requestBase.prefix,
        sourceTokens: op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: requestBase,
        chainOnFinalSupported: true,
        interOpPastProjection: "committed",
        ...(sourceTrace === undefined ? {} : { sourceTrace })
      };
    }
  }
  const desireResult = desireBaseResult(stemLemma, stemIrregular);
  if (!desireResult.ok) {
    return desireResult;
  }
  return withInputPrefix(inputBase, {
    ...desireResult,
    ...(op.form === "tagaru" ? {
      base: {
        ...desireResult.base,
        final: { kind: "lemma" as const, lemma: "싶어하다", irregular: "여" as const, isVerb: true }
      }
    } : {}),
    sourceTrace: {
      inputProjectionText: desireResult.base.prefix,
      carrierPrefixSegments: [],
      finalSourceTokens: op.source.tokens,
      finalKind: "modal"
    }
  });
}

function voiceOpBase(
  op: Extract<OperatorOp, { readonly kind: "voice" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  if (opPreNeg !== null) return { ok: false, reason: "V neg + voice 비표준" };
  const reportingStateBase = reportingPassiveStateBase(op, inputBase, ctx.nextOp);
  if (reportingStateBase !== null) {
    return reportingStateBase;
  }
  const reportingLabelBase = reportingPassiveLabelBase(op, inputBase);
  if (reportingLabelBase !== null) {
    return reportingLabelBase;
  }
  if (
    op.voice === "passive" &&
    inputBase.policy?.kind === "quoted_proposition" &&
    inputBase.final.lemma === "하다"
  ) {
    return {
      ok: true,
      base: {
        prefix: inputBase.prefix,
        final: { kind: "lemma", lemma: "여겨지다", irregular: null, isVerb: true },
        policy: { kind: "voice", voice: "passive", reportingPassive: true }
      },
      chainOnFinalSupported: true
    };
  }
  if (op.voice === "passive" && inputBase.policy?.kind === "make_state_change") {
    return {
      ok: true,
      base: {
        prefix: inputBase.prefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: { kind: "voice", voice: "passive", ...(op.passiveClass === undefined ? {} : { passiveClass: op.passiveClass }) }
      },
      chainOnFinalSupported: true
    };
  }
  if (op.voice === "passive" && inputBase.policy?.kind === "causative") {
    const passiveCausative = voiceBase({
      voice: {
        ...op,
        voice: "causative_passive"
      },
      stemLemma: inputBase.policy.sourceLemma,
      stemIrregular: inputBase.policy.sourceIrregular,
      sahenShortNegationSplit: ctx.sahenShortNegationSplit,
      isVerb: true,
      passiveStemOptions: ctx.passiveStemOptions,
      lookups: ctx.lookups
    });
    return passiveCausative.ok
      ? { ...passiveCausative, chainOnFinalSupported: true }
      : passiveCausative;
  }
  if (
    op.voice === "passive" &&
    inputBase.policy?.kind === "completion" &&
    inputBase.policy.followingPassiveStrategy === "completion_causative"
  ) {
    return {
      ok: true,
      base: {
        prefix: `${inputBase.policy.stemPrefix ?? ""}${conjugate(
          inputBase.policy.stemLemma,
          inputBase.policy.stemIrregular,
          op.passiveClass === "causative_coercive" ? "아/어야" : "게"
        )}${op.passiveClass === "causative_coercive" ? "만" : ""} `,
        final: op.passiveClass === "causative_coercive"
          ? { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
          : { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: {
          kind: "voice",
          voice: "causative_passive",
          ...(op.passiveClass === undefined ? {} : { passiveClass: op.passiveClass })
        }
      },
      chainOnFinalSupported: true
    };
  }
  const res = voiceBase({
    voice: op,
    stemLemma,
    stemIrregular,
    isVerb,
    passiveStemOptions: ctx.passiveStemOptions,
    lookups: ctx.lookups,
    sahenShortNegationSplit: ctx.sahenShortNegationSplit,
    sourceTokens: op.source.tokens
  });
  if (!res.ok) return res;
  return withInputPrefix(inputBase, res);
}

function idiomOpBase(
  op: Extract<OperatorOp, { readonly kind: "idiom" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (op.idiom === "wake_impossible") {
    return wakeImpossibleBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection
    });
  }
  if (op.idiom === "obligation") {
    if (
      inputBase.policy?.kind === "noun_copula_interop" ||
      inputBase.policy?.kind === "negative_noun_copula_interop"
    ) {
      return {
        ok: true,
        base: nounCopulaObligationBase(inputBase.policy.nounSurface, predicateBasePolicyAllomorphHost(inputBase)),
        chainOnFinalSupported: true
      };
    }
    const res = obligationBase({ obligation: op, stemLemma, stemIrregular, isVerb });
    if (!res.ok) return res;
    return withInputPrefix(inputBase, { ...res, chainOnFinalSupported: true });
  }
  if (op.idiom === "forbidden") {
    const res = forbiddenBase({ stemLemma, stemIrregular, isVerb, sourceTokens: op.source.tokens });
    if (!res.ok) return res;
    return withInputPrefix(inputBase, { ...res, chainOnFinalSupported: true });
  }
  if (op.idiom === "degree_intensifier") {
    return degreeIntensifierBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
  }
  if (op.idiom === "potential_koto_ga_dekiru") {
    return potentialKotoGaDekiruIdiomBase(op, inputBase, ctx);
  }
  if (op.idiom === "negative_necessity_koto_wa") {
    return negativeNecessityKotoWaBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection
    });
  }
  if (op.idiom === "inevitable_zaru_o_enai") {
    return inevitableZaruOEnaiBase({
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection,
      sourceTokens: op.source.tokens
    });
  }
  if (op.idiom === "cannot_refrain_negative_dewa_irarenai") {
    return cannotRefrainNegativeDewaIrarenaiBase({
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection,
      sourceTokens: op.source.tokens
    });
  }
  if (op.idiom === "method_you_ga_nai") {
    return methodYouGaNaiBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection,
      sourceTokens: op.source.tokens
    });
  }
  if (op.idiom === "negative_necessity_made_mo") {
    return madeMoNaiBase({
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection,
      sourceTokens: op.source.tokens
    });
  }
  if (op.idiom === "permission") {
    return permissionBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
  }
  if (op.idiom === "sufficiency_conditional") {
    return sufficiencyConditionalBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
  }
  if (op.idiom === "te_evaluation") {
    return teEvaluationBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
  }
  if (op.idiom === "negative_necessity_sumu") {
    return negativeNecessitySumuBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
  }
  if (op.idiom === "only_option_shika_nai") {
    return onlyOptionBase({
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection,
      lookups: ctx.lookups,
      sourceTokens: op.source.tokens
    });
  }
  if (op.idiom === "experience_koto_ga_aru") {
    return experienceBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection
    });
  }
  if (op.idiom === "outcome_koto_ni_naru") {
    return outcomeKotoNiNaruBase({
      op,
      inputBase,
      preStemNeg: opPreNeg,
      stemPast: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection
    });
  }
  return decisionKotoNiSuruBase({
    inputBase,
    preStemNeg: opPreNeg,
    stemPast: opPast,
    formal: ctx.formal,
    sourceTokens: op.source.tokens
  });
}

function potentialKotoGaDekiruIdiomBase(
  op: PotentialKotoGaDekiruIdiomOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (inputBase.policy?.kind === "potential") {
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }
  if (
    inputBase.policy?.kind === "likeness" &&
    inputBase.policy.potentialObjectAttributive !== undefined
  ) {
    const host = inputBase.policy.potentialObjectAttributive;
    const stemAttr = `${conjugate(host.stemLemma, host.stemIrregular, "ㄹ/을")} 만한`;
    return potentialObjectBaseFromAttributive({
      stemAttr,
      postIdiomChainDepth: 0,
      particleKind: op.particleKind,
      focusParticle: op.focusParticle,
      stemLemma: host.stemLemma,
      stemIrregular: host.stemIrregular
    });
  }
  const sourceProjectionIsVerbalPredicate =
    (ctx.sourceStemIsVerb ?? isVerb) ||
    ctx.sourceStemIsSahenPredicate === true;
  if (!isVerb && ctx.sourceStemIsSahenPredicate !== true) {
    const stemAttr = pastNegStemAttributive({
      stemLemma,
      stemIrregular,
      stemKind: "adj",
      past: opPast,
      preModalNeg: opPreNeg,
      attrPolicy: "present",
      useShortHint: false,
      lookups: ctx.lookups,
      sahenShortNegationSplit: ctx.sahenShortNegationSplit
    });
    return potentialObjectBaseFromAttributive({
      stemAttr,
      postIdiomChainDepth: 0,
      particleKind: op.particleKind,
      focusParticle: op.focusParticle,
      stemLemma,
      stemIrregular
    });
  }
  const res = potentialBase({
    stemLemma, stemIrregular, isVerb,
    sourceStemIsVerb: sourceProjectionIsVerbalPredicate,
    preStemNeg: opPreNeg,
    stemPast: opPast,
    postIdiomChainDepth: 0,
    particleKind: op.particleKind,
    focusParticle: op.focusParticle,
    sourceTokens: op.source.tokens,
    lookups: ctx.lookups,
    sahenShortNegationSplit: ctx.sahenShortNegationSplit
  });
  if (!res.ok) return res;
  return withInputPrefix(inputBase, {
    ...res,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom"
  });
}

function modalOpBase(
  op: Extract<OperatorOp, { readonly kind: "modal" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  const hostLowered = modalHostLoweringBase(op, inputBase, ctx);
  if (hostLowered !== null) return hostLowered;
  const carrierLikeness = modalCarrierLikenessBase(op, inputBase, ctx);
  if (carrierLikeness !== null) return carrierLikeness;
  const res = modalBase({
    modal: op, stemLemma, stemIrregular,
    stemKind: op.modal === "mai" ? (inputBase.final.isVerb ? "verb" : "adj") : (isVerb ? "verb" : "adj"),
    preModalNeg: opPreNeg,
    past: opPast,
    pastProjection: ctx.pastProjection,
    formal: ctx.formal,
    ...(inputBase.policy === undefined ? {} : { inputPolicy: inputBase.policy }),
    ...(ctx.sourceStemIsVerb === undefined ? {} : { sourceStemIsVerb: ctx.sourceStemIsVerb }),
    sourceHostHasTeIruAspect: ctx.sourceHostHasTeIruAspect === true,
    forbidShortNegation: ctx.forbidShortNegation,
    preferShortLikenessNegation: ctx.preferShortLikenessNegation === true || opPreNeg !== null,
    lookups: ctx.lookups,
    sahenShortNegationSplit: ctx.sahenShortNegationSplit
  });
  if (!res.ok) return res;
  return withInputPrefix(inputBase, {
    ...res,
    ...modalFinalChainPolicy(res.base),
    interOpPastProjection: "committed"
  });
}

function modalHostLoweringBase(
  op: Extract<OperatorOp, { readonly kind: "modal" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (
    op.modal === "mai" &&
    (inputBase.policy?.kind === "noun_copula_interop" ||
      inputBase.policy?.kind === "negative_noun_copula_interop") &&
    opPreNeg === null &&
    !opPast
  ) {
    const noun = inputBase.policy.nounSurface;
    const base = scopeCarrierCopulaBase("mai", "거", `${nounSubjectPart(noun, predicateBasePolicyAllomorphHost(inputBase))} 아닐 `);
    return {
      ok: true,
      base,
      ...modalFinalChainPolicy(base),
      interOpPastProjection: "committed"
    };
  }
  if (
    op.modal === "noda" &&
    inputBase.policy?.kind === "negative_noun_copula_interop" &&
    ctx.nextOp?.kind === "conjecture" &&
    opPreNeg === null &&
    !opPast
  ) {
    return {
      ok: true,
      base: inputBase,
      chainOnFinalSupported: true
    };
  }
  if (op.modal === "tokoro") {
    const tokoroProjectedBase = tokoroBaseFromPredicateBase({
      modal: op,
      base: inputBase,
      preModalNeg: opPreNeg,
      past: opPast,
      formal: ctx.formal,
      pastProjection: ctx.pastProjection
    });
    if (tokoroProjectedBase !== null) {
      if (!tokoroProjectedBase.ok) return tokoroProjectedBase;
      return {
        ...tokoroProjectedBase,
        ...modalFinalChainPolicy(tokoroProjectedBase.base),
        interOpPastProjection: "committed"
      };
    }
  }
  if (op.modal === "limit_negation") {
    const res = limitNegationBaseFromPredicateBase({
      modal: op,
      base: inputBase,
      preNeg: opPreNeg,
      past: opPast,
      formal: ctx.formal,
      lookups: ctx.lookups
    });
    if (!res.ok) return res;
    return { ...res, ...modalFinalChainPolicy(res.base), interOpPastProjection: "committed" };
  }
  if (op.modal === "mono" && (op.reading === "admirative" || op.reading === "habitual")) {
    const res = monoHostPredicateBase(op, inputBase, opPreNeg);
    if (!res.ok) return res;
    return { ...res, ...modalFinalChainPolicy(res.base), interOpPastProjection: "committed" };
  }
  if (op.modal === "souda_hearsay" && op.reading === "hearsay") {
    const res = soudaHearsayBaseFromPredicateBase(inputBase, opPreNeg, opPast, ctx.lookups, op);
    if (!res.ok) return res;
    return { ...res, ...modalFinalChainPolicy(res.base), interOpPastProjection: "committed" };
  }
  if (op.modal === "noda" && opPreNeg === null && !opPast) {
    const absorbed = nodaCarrierAbsorbedByHostBoundNoun(inputBase, op);
    if (absorbed !== null) {
      return { ...absorbed, ...modalFinalChainPolicy(absorbed.base), interOpPastProjection: "committed" };
    }
  }
  if (op.modal === "kamo" && opPreNeg === null) {
    const carrierKamo = nodaCarrierKamoBase(inputBase, ctx.formal, opPast, op.bare);
    if (carrierKamo !== null) {
      return {
        ...carrierKamo,
        ...modalFinalChainPolicy(carrierKamo.base),
        interOpPastProjection: "committed"
      };
    }
  }
  return null;
}

function modalCarrierLikenessBase(
  op: Extract<OperatorOp, { readonly kind: "modal" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult | null {
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  if (op.modal === "wake") {
    const wakeCitation = wakeExplanatoryCitationBase({
      op, inputBase, preStemNeg: opPreNeg, stemPast: opPast, formal: ctx.formal
    });
    if (wakeCitation !== null) {
      if (!wakeCitation.ok) return wakeCitation;
      return {
        ...wakeCitation,
        ...modalFinalChainPolicy(wakeCitation.base),
        interOpPastProjection: "committed"
      };
    }
  }
  if ((op.modal === "rashii" || op.modal === "youda") && opPreNeg === null && !opPast) {
    const carrierLikeness = nodaCarrierLikenessBase(inputBase);
    if (carrierLikeness !== null) {
      return {
        ...carrierLikeness,
        ...modalFinalChainPolicy(carrierLikeness.base),
        interOpPastProjection: "committed"
      };
    }
    const quotedLikeness = quotedPropositionLikenessBase(inputBase, op, ctx.formal, ctx.pastProjection);
    if (quotedLikeness !== null) {
      return {
        ...quotedLikeness,
        ...modalFinalChainPolicy(quotedLikeness.base),
        interOpPastProjection: "committed"
      };
    }
  }
  if (
    op.modal === "rashii" &&
    opPreNeg === null &&
    !opPast &&
    !ctx.hasPriorChainOp &&
    inputBase.policy?.kind === "noun_copula_interop" &&
    inputBase.policy.zeroCopula === true
  ) {
    const res = nominalHostEvidentialLikenessBase(inputBase.policy.nounSurface, op);
    if (!res.ok) return res;
    return { ...res, ...modalFinalChainPolicy(res.base), interOpPastProjection: "committed" };
  }
  if (op.modal === "mai" && opPreNeg === null && !opPast) {
    const scopeMai = maiScopeCarrierBase(op, inputBase);
    if (scopeMai !== null) {
      if (!scopeMai.ok) return scopeMai;
      return { ...scopeMai, ...modalFinalChainPolicy(scopeMai.base) };
    }
  }
  return null;
}

function conjectureOpBase(
  op: Extract<OperatorOp, { readonly kind: "conjecture" }>,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  const stemLemma = inputBase.final.lemma;
  const stemIrregular = inputBase.final.irregular;
  const isVerb = inputBase.final.isVerb;
  const opPreNeg = ctx.preModalNeg;
  const opPast = ctx.past;
  const copulaCarrierConjecture =
    opPreNeg === null
      ? (
        (!opPast ? (nodaCarrierConjectureBase(inputBase, op) ?? wakeCarrierConjectureBase(inputBase, op)) : null) ??
        copulaCarrierConjectureBase(inputBase, op, opPast)
      )
      : null;
  if (copulaCarrierConjecture !== null) {
    if (ctx.hasFollowingOp) {
      if (ctx.nextOp?.kind === "predicateQuoteCarrier") {
        return { ...copulaCarrierConjecture, chainOnFinalSupported: true };
      }
      return { ok: true, base: inputBase, chainOnFinalSupported: false };
    }
    return { ...copulaCarrierConjecture, chainOnFinalSupported: false };
  }
  const res = conjectureBase({
    conjecture: op, stemLemma, stemIrregular, isVerb,
    preModalNeg: opPreNeg, past: opPast,
    shortNegationPolicy: ctx.shortNegationPolicy,
    pastProjection: ctx.pastProjection
  });
  if (!res.ok) return res;
  const prefixed = withInputPrefix(inputBase, { ...res, chainOnFinalSupported: false });
  if (
    prefixed.ok &&
    prefixed.base.policy?.kind === "negative_noun_copula_interop"
  ) {
    return {
      ...prefixed,
      base: {
        ...prefixed.base,
        policy: { ...prefixed.base.policy, conjectureHostPast: opPast }
      }
    };
  }
  return prefixed;
}


function reportingPassiveLabelBase(
  op: VoiceOp,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  if (
    op.voice !== "passive" ||
    op.passiveClass !== "reporting_label" ||
    inputBase.final.lemma !== "말하다" ||
    !inputBase.final.isVerb
  ) {
    return null;
  }
  return {
    ok: true,
    base: {
      prefix: inputBase.prefix,
      final: { kind: "lemma", lemma: "불리다", irregular: null, isVerb: true },
      policy: {
        kind: "voice",
        voice: "passive",
        passiveClass: "reporting_label",
        reportingPassive: true
      }
    },
    chainOnFinalSupported: true
  };
}

function reportingPassiveStateBase(
  op: VoiceOp,
  inputBase: KoreanLemmaPredicateBase,
  nextOp: OperatorOp | undefined
): BaseResult | null {
  if (
    op.voice !== "passive" ||
    op.passiveClass !== "reporting" ||
    inputBase.final.lemma !== "말하다" ||
    !inputBase.final.isVerb ||
    nextOp?.kind !== "aspect" ||
    (nextOp.aspect !== "te_iru" && nextOp.aspect !== "te_kuru")
  ) {
    return null;
  }
  return {
    ok: true,
    base: {
      prefix: inputBase.prefix,
      final: { kind: "lemma", lemma: "알려지다", irregular: null, isVerb: true },
      policy: {
        kind: "voice",
        voice: "passive",
        passiveClass: "reporting",
        reportingPassive: true
      }
    },
    chainOnFinalSupported: true
  };
}

export interface ChainBaseResult {
  readonly ok: true;
  readonly base: KoreanPredicateBase;
  readonly finalPast: boolean;
  readonly finalPastProjection?: AttributivePastProjection;
  readonly finalNeg: NegationOp | null;
  readonly chainOnFinalSupported: boolean;
  readonly finalNegationOptions?: NegationLoweringOptions;
  readonly finalNegationLoweringPolicy?: FinalNegationLoweringPolicy;
  readonly terminalPrefixContraction?: "scope_topic";
  readonly connectivePrefixContraction?: "no_scope_negative" | "scope_topic";
  readonly connectiveBaseOverride?: ConnectiveBaseOverride;
  readonly terminalRealization?: TerminalRealization;
  readonly chainSourceTrace?: ChainSourceTrace;
}

interface ChainBasesTraceState {
  readonly tracePrefixSegments: TailTraceSegment[];
  tracedPrefixText: string;
  activeFinalSourceTokens: readonly RuntimeHaruToken[];
  activeFinalKind: TailTraceSegmentKind;
}

interface ChainBasesFoldState {
  currentBase: KoreanLemmaPredicateBase;
  currentPreNeg: NegationOp | null;
  currentPast: boolean;
  currentPastProjection: AttributivePastProjection;
  pendingDesiredPredicateNegation: NegationOp | null;
  finalBase: KoreanPredicateBase | null;
  lastChainOnFinalSupported: boolean;
  lastFinalNegationOptions: NegationLoweringOptions | undefined;
  lastFinalNegationLoweringPolicy: FinalNegationLoweringPolicy | undefined;
  lastTerminalPrefixContraction: OkBaseResult["terminalPrefixContraction"] | undefined;
  lastTerminalRealization: TerminalRealization | undefined;
  lastConnectivePrefixContraction: OkBaseResult["connectivePrefixContraction"] | undefined;
  pendingConnectivePrefixContraction: OkBaseResult["connectivePrefixContraction"] | undefined;
  lastConnectiveBaseOverride: ConnectiveBaseOverride | undefined;
  lastInterOpPastProjection: AttributivePastProjection | undefined;
  lastProjectsAsStativePerfect: boolean;
  currentSourceProjectionIsVerbalPredicate: boolean;
  readonly preNegLoweredOnHostBase: Set<NegationOp>;
}


export function chainBases(
  ops: readonly OperatorOp[],
  stemLemma: string,
  stemIrregular: IrregularType | null,
  isVerb: boolean,
  ctx: ChainContext
): ChainBaseResult | { readonly ok: false; readonly reason: string } {
  if (ops.length === 0) {
    return { ok: false, reason: "chainBases: empty op chain" };
  }
  const initialBaseRes = ctx.initialBaseResult ?? simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
  const initialLemmaBase = initialBaseRes.base.final.kind === "lemma"
    ? initialBaseRes.base
    : copulaCarrierBaseForInterOp(initialBaseRes.base, ctx.formal);
  if (initialLemmaBase === null || initialLemmaBase.final.kind !== "lemma") {
    return { ok: false, reason: "chainBases: initial predicate base did not lower to lemma base" };
  }
  const initialStemPrefix = ctx.stemPrefix ?? "";
  const sahenShortNegationSplit = stemAllowsSahenShortNegationSplit(ctx.stemPrefix);
  let currentBase: KoreanLemmaPredicateBase = {
    prefix: `${initialStemPrefix}${initialLemmaBase.prefix}`,
    final: initialLemmaBase.final,
    ...(() => {
      const policy = ctx.initialPolicy ?? initialLemmaBase.policy ?? (
        ctx.absorbedPassiveAux ? absorbedPassivePolicy(ctx, stemLemma) : undefined
      );
      const shifted = policyWithPrependedHostPrefix(policy, initialStemPrefix);
      return shifted === undefined ? {} : { policy: shifted };
    })()
  };
  const initialTrace = ctx.initialChainSourceTrace;
  const initialTracePrefixText = initialTrace?.prefixSegments.map((segment) => segment.text).join("");
  const initialTraceMatches = initialTrace !== undefined && initialTracePrefixText === currentBase.prefix;
  const tracePrefixSegments: TailTraceSegment[] = initialTraceMatches
    ? [...initialTrace.prefixSegments]
    : [];
  let tracedPrefixText = currentBase.prefix;
  if (!initialTraceMatches && currentBase.prefix.length > 0 && ctx.stemSourceTokens !== undefined) {
    tracePrefixSegments.push(projectedHostTraceSegment(
      ctx.stemProjectedHost?.segments,
      currentBase.prefix,
      ctx.stemSourceTokens,
      "lexeme",
      "semantic"
    ));
  }
  let activeFinalSourceTokens: readonly RuntimeHaruToken[] = initialTraceMatches
    ? initialTrace.finalSourceTokens
    : ctx.stemSourceTokens ?? [];
  let activeFinalKind: TailTraceSegmentKind = initialTraceMatches
    ? initialTrace.finalKind
    : "lexeme";
  const trace: ChainBasesTraceState = { tracePrefixSegments, tracedPrefixText, activeFinalSourceTokens, activeFinalKind };
  const fold: ChainBasesFoldState = {
    currentBase,
    currentPreNeg: ctx.preModalNeg,
    currentPast: ctx.stemPast,
    currentPastProjection: "lexical",
    pendingDesiredPredicateNegation: null,
    finalBase: null,
    lastChainOnFinalSupported: true,
    lastFinalNegationOptions: undefined,
    lastFinalNegationLoweringPolicy: undefined,
    lastTerminalPrefixContraction: undefined,
    lastTerminalRealization: undefined,
    lastConnectivePrefixContraction: undefined,
    pendingConnectivePrefixContraction: undefined,
    lastConnectiveBaseOverride: undefined,
    lastInterOpPastProjection: undefined,
    lastProjectsAsStativePerfect: false,
    currentSourceProjectionIsVerbalPredicate:
      (ctx.sourceStemIsVerb ?? isVerb) ||
      ctx.sourceStemIsSahenPredicate === true,
    preNegLoweredOnHostBase: new Set<NegationOp>()
  };
  const initialNegationFailure = applyChainInitialPreNegation(fold, ops, ctx, initialBaseRes);
  if (initialNegationFailure !== null) {
    return initialNegationFailure;
  }
  for (let i = 0; i < ops.length; i++) {
    const opFailure = foldChainOp(fold, trace, ops, i, ctx, sahenShortNegationSplit);
    if (opFailure !== null) {
      return opFailure;
    }
  }
  const finalPastOp = ctx.pastAfterChainIdx.get(ops.length - 1) ?? null;
  const finalPast = finalPastOp !== null ||
    opCarriesIntrinsicPast(ops[ops.length - 1]!) ||
    fold.lastProjectsAsStativePerfect;
  const finalNeg = ctx.negAfterChainIdx.get(ops.length - 1) ?? null;
  const finalTraceSourceTokens = [
    ...trace.activeFinalSourceTokens,
    ...(finalPastOp?.source.tokens ?? []),
    ...(finalNeg?.source.tokens ?? [])
  ];
  const result: ChainBaseResult = {
    ok: true,
    base: fold.finalBase!,
    finalPast,
    finalNeg,
    chainOnFinalSupported: fold.lastChainOnFinalSupported,
    chainSourceTrace: {
      prefixSegments: trace.tracePrefixSegments,
      finalSourceTokens: finalTraceSourceTokens,
      finalKind: trace.activeFinalKind
    }
  };
  return {
    ...result,
    ...(fold.lastFinalNegationOptions === undefined ? {} : { finalNegationOptions: fold.lastFinalNegationOptions }),
    ...(fold.lastFinalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: fold.lastFinalNegationLoweringPolicy }),
    ...(fold.lastTerminalPrefixContraction === undefined ? {} : { terminalPrefixContraction: fold.lastTerminalPrefixContraction }),
    ...(fold.lastTerminalRealization === undefined ? {} : { terminalRealization: fold.lastTerminalRealization }),
    ...(fold.lastConnectivePrefixContraction === undefined ? {} : { connectivePrefixContraction: fold.lastConnectivePrefixContraction }),
    ...(fold.lastConnectiveBaseOverride === undefined ? {} : { connectiveBaseOverride: fold.lastConnectiveBaseOverride }),
    ...(fold.lastInterOpPastProjection === undefined ? {} : { finalPastProjection: fold.lastInterOpPastProjection })
  };
}

function appendChainTracePrefix(
  trace: ChainBasesTraceState,
  targetPrefix: string,
  sourceTokens: readonly RuntimeHaruToken[],
  kind: TailTraceSegmentKind,
  projectionConfidence: TargetSegment["projectionConfidence"] = "semantic"
): void {
  if (!targetPrefix.startsWith(trace.tracedPrefixText)) {
    const contracted = tracePrefixContractionForTarget(trace.tracePrefixSegments, targetPrefix);
    if (contracted !== null) {
      trace.tracePrefixSegments.length = 0;
      trace.tracePrefixSegments.push(...contracted);
      trace.tracedPrefixText = trace.tracePrefixSegments.map((segment) => segment.text).join("");
    }
  }
  if (targetPrefix === trace.tracedPrefixText) {
    return;
  }
  if (trace.tracedPrefixText.startsWith(targetPrefix)) {
    return;
  }
  if (!targetPrefix.startsWith(trace.tracedPrefixText)) {
    trace.tracedPrefixText = targetPrefix;
    trace.tracePrefixSegments.length = 0;
    trace.tracePrefixSegments.push({
      text: targetPrefix,
      sourceTokens,
      kind,
      projectionConfidence: "fallback"
    });
    return;
  }
  const text = targetPrefix.slice(trace.tracedPrefixText.length);
  if (text.length > 0) {
    trace.tracePrefixSegments.push({ text, sourceTokens, kind, projectionConfidence });
  }
  trace.tracedPrefixText = targetPrefix;
}

function appendChainTraceSegment(trace: ChainBasesTraceState, segment: TailTraceSegment): void {
  if (segment.text.length === 0) {
    return;
  }
  trace.tracePrefixSegments.push(segment);
  trace.tracedPrefixText += segment.text;
}

function applyChainInitialPreNegation(
  fold: ChainBasesFoldState,
  ops: readonly OperatorOp[],
  ctx: ChainContext,
  initialBaseRes: BaseResult & { readonly ok: true }
): { readonly ok: false; readonly reason: string } | null {
  if (fold.currentPreNeg !== null && negationFeedsNaideHoshii(fold.currentPreNeg, ops[0])) {
    if (fold.currentPreNeg.chainDepth !== 1 || fold.currentPreNeg.chainPast) {
      return { ok: false, reason: "desired predicate negation before te_hoshii supports only single non-past negative" };
    }
    fold.pendingDesiredPredicateNegation = fold.currentPreNeg;
    fold.currentPreNeg = null;
  }
  const firstOpOwnsPreNegation =
    ops[0]?.kind === "scopeBridge" &&
    (ops[0].head === "koto" || ops[0].head === "implicit");
  if (
    fold.currentPreNeg !== null &&
    initialBaseRes.finalNegationLoweringPolicy !== undefined &&
    !firstOpOwnsPreNegation
  ) {
    const lowered = lowerFinalNegationForCommittedBase(initialBaseRes, fold.currentPreNeg, ctx.formal, ctx.lookups);
    if (lowered === null) {
      return { ok: false, reason: "stem final negation lowering before op 영역 외" };
    }
    fold.currentBase = lowered;
    const loweredForcesPast = finalNegationLoweringForcesPast(initialBaseRes, fold.currentPreNeg.chainDepth);
    fold.currentPast = ctx.stemPast || fold.currentPreNeg.chainPast || loweredForcesPast;
    fold.currentPastProjection = fold.currentPast
      ? (ops[0]?.kind === "conjecture" ? "committed" : "lexical")
      : "lexical";
    fold.currentPreNeg = null;
  }
  return null;
}

function foldChainOp(
  fold: ChainBasesFoldState,
  trace: ChainBasesTraceState,
  ops: readonly OperatorOp[],
  i: number,
  ctx: ChainContext,
  sahenShortNegationSplit: boolean
): { readonly ok: false; readonly reason: string } | null {
  const op = ops[i]!;
  const isLast = i === ops.length - 1;
  const ownedPreNeg = ctx.negBeforeChainIdx?.get(i) ?? null;
  if (ownedPreNeg !== null && !fold.preNegLoweredOnHostBase.has(ownedPreNeg)) {
    if (fold.currentPreNeg !== null) {
      return { ok: false, reason: "multiple pre-reference NegationOps in same chain slot not supported" };
    }
    fold.currentPreNeg = ownedPreNeg;
  }
  const negAfterCurrentOp = ctx.negAfterChainIdx.get(i) ?? null;
  const desiredPredicateNegation = fold.pendingDesiredPredicateNegation;
  fold.pendingDesiredPredicateNegation = null;
  const previousOp = i > 0 ? ops[i - 1] : undefined;
  const opCtx: OpContext = {
    lookups: ctx.lookups,
    chainIndex: i,
    hasPriorChainOp: i > 0,
    sourceStemIsVerb: fold.currentSourceProjectionIsVerbalPredicate,
    sourceStemIsVolitional: i === 0 && ctx.sourceStemIsVolitional === true,
    sourceHostHasTeIruAspect:
      previousOp?.kind === "aspect" && previousOp.aspect === "te_iru",
    ...(ctx.sourceStemIsSahenPredicate === undefined
      ? {}
      : { sourceStemIsSahenPredicate: ctx.sourceStemIsSahenPredicate }),
    ...(ctx.adverbialStemLemma === undefined ? {} : { adverbialStemLemma: ctx.adverbialStemLemma }),
    preModalNeg: fold.currentPreNeg,
    past: fold.currentPast,
    pastProjection: fold.currentPastProjection,
    formal: ctx.formal,
    hasFollowingOp: !isLast,
    nextOp: ops[i + 1],
    shortNegationPolicy: i === 0 ? ctx.shortNegationPolicy : undefined,
    sahenShortNegationSplit,
    ...(ctx.preferShortLikenessNegation === undefined
      ? {}
      : { preferShortLikenessNegation: ctx.preferShortLikenessNegation }),
    passiveStemOptions: i === 0 ? ctx.passiveStemOptions : {},
    forbidShortNegation: i > 0 && fold.currentPreNeg !== null,
    desiredPredicateNegation
  };
  const baseRes = opToBase(op, fold.currentBase, opCtx);
  if (!baseRes.ok) return baseRes;
  fold.currentSourceProjectionIsVerbalPredicate = sourceVerbalPredicateAfterAuxOp(
    fold.currentSourceProjectionIsVerbalPredicate,
    op,
  );
  const sourceTrace = sourceTraceWithFinalNegationStem(baseRes, negAfterCurrentOp);
  appendChainOpSourceTrace(fold, trace, op, i, ctx, baseRes, sourceTrace);
  if (isLast) {
    fold.finalBase = baseRes.base;
    fold.lastChainOnFinalSupported = baseRes.chainOnFinalSupported ?? true;
    fold.lastFinalNegationOptions = baseRes.finalNegationOptions;
    fold.lastFinalNegationLoweringPolicy = baseRes.finalNegationLoweringPolicy;
    fold.lastTerminalPrefixContraction = baseRes.terminalPrefixContraction;
    fold.lastTerminalRealization = baseRes.terminalRealization;
    fold.lastConnectivePrefixContraction = baseRes.connectivePrefixContraction ?? fold.pendingConnectivePrefixContraction;
    fold.lastConnectiveBaseOverride = baseRes.connectiveBaseOverride;
    fold.lastInterOpPastProjection = finalAttributivePastProjectionForChainOp(
      op,
      baseRes,
      ctx.pastAfterChainIdx.has(i) || opCarriesIntrinsicPast(op)
    );
    fold.lastProjectsAsStativePerfect = baseRes.interOpProjectionPolicy === "stative_perfect";
  } else {
    const carryFailure = carryChainBaseToNextOp(fold, trace, ops, op, i, ctx, baseRes);
    if (carryFailure !== null) {
      return carryFailure;
    }
  }
  return null;
}

function appendChainOpSourceTrace(
  fold: ChainBasesFoldState,
  trace: ChainBasesTraceState,
  op: OperatorOp,
  i: number,
  ctx: ChainContext,
  baseRes: OkBaseResult,
  sourceTrace: ReturnType<typeof sourceTraceWithFinalNegationStem>
): void {
  if (sourceTrace !== undefined) {
    const inputProjectionTargetPrefix = `${fold.currentBase.prefix}${sourceTrace.inputProjectionText}`;
    const inputProjectionSourceTokens = i === 0
      ? [
        ...trace.activeFinalSourceTokens,
        ...(fold.currentPreNeg?.source.tokens ?? []),
        ...(ctx.stemPastSourceTokens ?? []),
        ...(sourceTrace.inputProjectionExtraSourceTokens ?? [])
      ]
      : [
        ...trace.activeFinalSourceTokens,
        ...(fold.currentPreNeg?.source.tokens ?? []),
        ...(sourceTrace.inputProjectionExtraSourceTokens ?? [])
      ];
    const inputProjectionSegments = i === 0
      ? splitInitialLongNegationInputProjection(
        sourceTrace.inputProjectionText,
        fold.currentBase,
        trace.activeFinalSourceTokens,
        fold.currentPreNeg,
        ctx.stemPastSourceTokens,
        trace.activeFinalKind
      )
      : null;
    const inputProjectionSegmentText = inputProjectionSegments
      ?.map((segment) => segment.text)
      .join("");
    if (
      inputProjectionSegments !== null &&
      inputProjectionTargetPrefix.startsWith(trace.tracedPrefixText) &&
      inputProjectionTargetPrefix.slice(trace.tracedPrefixText.length) === inputProjectionSegmentText
    ) {
      for (const segment of inputProjectionSegments) {
        appendChainTraceSegment(trace, segment);
      }
    } else {
      appendChainTracePrefix(trace, 
        inputProjectionTargetPrefix,
        inputProjectionSourceTokens,
        trace.activeFinalKind
      );
    }
    for (const segment of sourceTrace.carrierPrefixSegments) {
      appendChainTraceSegment(trace, segment);
    }
    appendChainTracePrefix(trace, 
      baseRes.base.prefix,
      sourceTrace.finalSourceTokens,
      sourceTrace.finalKind ?? "modal"
    );
    trace.activeFinalSourceTokens = sourceTrace.finalSourceTokens;
    trace.activeFinalKind = sourceTrace.finalKind ?? "modal";
  } else {
    const genericSourceTokens = [...trace.activeFinalSourceTokens, ...op.source.tokens];
    appendChainTracePrefix(trace, 
      baseRes.base.prefix,
      genericSourceTokens,
      op.kind === "aspect" ? "aux" : "modal"
    );
    trace.activeFinalSourceTokens = genericSourceTokens;
    trace.activeFinalKind = op.kind === "aspect" ? "aux" : "modal";
  }
}

function carryChainBaseToNextOp(
  fold: ChainBasesFoldState,
  trace: ChainBasesTraceState,
  ops: readonly OperatorOp[],
  op: OperatorOp,
  i: number,
  ctx: ChainContext,
  baseRes: OkBaseResult
): { readonly ok: false; readonly reason: string } | null {
  const admittedPreNegOfNextOp =
    baseRes.finalNegationLoweringPolicy !== undefined &&
      !operatorChainOpConsumesPrecedingNegation(ops[i + 1])
      ? ctx.negBeforeChainIdx?.get(i + 1) ?? null
      : null;
  const negCarry = ctx.negAfterChainIdx.get(i) ?? admittedPreNegOfNextOp;
  if (admittedPreNegOfNextOp !== null && negCarry === admittedPreNegOfNextOp) {
    fold.preNegLoweredOnHostBase.add(admittedPreNegOfNextOp);
  }
  fold.pendingConnectivePrefixContraction =
    baseRes.connectivePrefixContraction ?? fold.pendingConnectivePrefixContraction;
  if (negCarry !== null) {
    if (negationFeedsNaideHoshii(negCarry, ops[i + 1])) {
      if (negCarry.chainDepth !== 1 || negCarry.chainPast) {
        return { ok: false, reason: "desired predicate negation before te_hoshii supports only single non-past negative" };
      }
      const interOpBase = copulaCarrierBaseForInterOp(baseRes.base, ctx.formal);
      if (interOpBase === null) {
        return { ok: false, reason: "desired predicate negation base projection 영역 외" };
      }
      fold.currentBase = applyNonLastPrefixContractions(
        interOpBase,
        baseRes,
        ctx.formal
      );
      appendChainTracePrefix(trace, fold.currentBase.prefix, trace.activeFinalSourceTokens, trace.activeFinalKind);
      fold.pendingDesiredPredicateNegation = negCarry;
    } else {
      const lowered = lowerFinalNegationForCommittedBase(baseRes, negCarry, ctx.formal, ctx.lookups);
      if (lowered === null) {
        return { ok: false, reason: "chain mid final negation lowering 영역 외" };
      }
      fold.currentBase = applyNonLastPrefixContractions(lowered, baseRes, ctx.formal);
      trace.activeFinalSourceTokens = [...trace.activeFinalSourceTokens, ...negCarry.source.tokens];
      trace.activeFinalKind = "aux";
      appendChainTracePrefix(trace, fold.currentBase.prefix, trace.activeFinalSourceTokens, trace.activeFinalKind);
    }
    fold.currentPreNeg = null;
  } else {
    const interOpBase = copulaCarrierBaseForInterOp(baseRes.base, ctx.formal);
    if (interOpBase === null) {
      return { ok: false, reason: "chain 중간 predicate base projection 영역 외" };
    }
    fold.currentBase = applyNonLastPrefixContractions(
      interOpBase,
      baseRes,
      ctx.formal
    );
    appendChainTracePrefix(trace, fold.currentBase.prefix, trace.activeFinalSourceTokens, trace.activeFinalKind);
    fold.currentPreNeg = null;
  }
  const projectsAsStativePerfect = baseRes.interOpProjectionPolicy === "stative_perfect";
  const intrinsicPast = opCarriesIntrinsicPast(op);
  const postOpTense = ctx.pastAfterChainIdx.get(i) ?? null;
  const loweredForcesPast = negCarry === null
    ? false
    : finalNegationLoweringForcesPast(baseRes, negCarry.chainDepth);
  fold.currentPast = postOpTense !== null ||
    (negCarry?.chainPast ?? false) ||
    loweredForcesPast ||
    intrinsicPast ||
    projectsAsStativePerfect;
  if (postOpTense !== null) {
    trace.activeFinalSourceTokens = [
      ...trace.activeFinalSourceTokens,
      ...postOpTense.source.tokens
    ];
  }
  fold.currentPastProjection = fold.currentPast
    ? (ops[i + 1]?.kind === "conjecture" ? "committed" : (baseRes.interOpPastProjection ?? "lexical"))
    : "lexical";
  return null;
}

function absorbedPassivePolicy(ctx: ChainContext, stemLemma: string): PredicateBasePolicy {
  const passiveClass = ctx.absorbedPassiveClass ?? absorbedPassiveClassFromMaterializedLemma(stemLemma);
  return {
    kind: "voice",
    voice: "passive",
    ...(passiveClass === undefined ? {} : { passiveClass }),
    ...(passiveClass === "reporting" || passiveClass === "reporting_label"
      ? { reportingPassive: true }
      : {})
  };
}

function absorbedPassiveClassFromMaterializedLemma(stemLemma: string): PassiveClass | undefined {
  return stemLemma === "알려지다" ? "reporting" : undefined;
}

export function sourceTraceWithFinalNegationStem(
  baseRes: OkBaseResult,
  finalNeg: NegationOp | null
): BaseSourceTrace | undefined {
  const trace = baseRes.sourceTrace;
  if (
    trace === undefined ||
    finalNeg === null ||
    baseRes.finalNegationLoweringPolicy !== undefined ||
    baseRes.base.final.kind !== "lemma" ||
    trace.finalSourceTokens.length === 0
  ) {
    return trace;
  }
  const finalJi = conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, "지");
  return {
    ...trace,
    carrierPrefixSegments: [
      ...trace.carrierPrefixSegments,
      {
        text: finalJi,
        sourceTokens: trace.finalSourceTokens,
        kind: trace.finalKind ?? "modal",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: [],
    finalKind: "aux"
  };
}

function negationFeedsNaideHoshii(
  negation: NegationOp,
  nextOp: OperatorOp | undefined
): boolean {
  void negation;
  return nextOp?.kind === "aspect" &&
    nextOp.aspect === "te_hoshii" &&
    (nextOp.source.tokens[0]?.surface ?? "") === "で";
}

export function opCarriesIntrinsicPast(op: OperatorOp): boolean {
  if (op.kind === "modal") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "negative_necessity_koto_wa") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "negative_necessity_sumu") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "forbidden") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "inevitable_zaru_o_enai") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "cannot_refrain_negative_dewa_irarenai") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "method_you_ga_nai") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "negative_necessity_made_mo") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "wake_impossible") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "experience_koto_ga_aru") {
    return op.past;
  }
  if (op.kind === "idiom" && op.idiom === "degree_intensifier") {
    return op.past;
  }
  if (op.kind === "postverbAuxiliary") {
    return false;
  }
  if (op.kind === "predicateProjectionCarrier") {
    return op.past === true;
  }
  if (op.kind === "predicateQuoteCarrier") {
    return false;
  }
  if (op.kind !== "aspect" || op.aspect !== "te_hoshii") {
    return false;
  }
  const last = op.source.tokens[op.source.tokens.length - 1];
  return last !== undefined &&
    (last.dictionaryForm === "ほしい" || last.dictionaryForm === "欲しい") &&
    (last.pos & POS5) === 連用形_促音便;
}

function finalAttributivePastProjectionForChainOp(
  op: OperatorOp,
  baseResult: OkBaseResult,
  carriesPast: boolean
): AttributivePastProjection | undefined {
  if (
    op.kind === "modal" &&
    carriesPast &&
    baseResult.base.final.kind === "lemma" &&
    baseResult.base.final.isVerb
  ) {
    return baseResult.interOpPastProjection ?? "committed";
  }
  return undefined;
}

export function collectOperatorChain(ops: readonly AuxOpNode[]): OperatorOp[] {
  const headOps = ops.filter(isHeadOp);
  if (headOps.length === 0) return [];
  if (!isChainableHeadOp(headOps[0]!)) {
    return [];
  }
  for (const op of headOps) {
    if (!isChainableHeadOp(op)) return [];
  }
  return headOps as OperatorOp[];
}

export function isRequestCommandAspectOp(op: AuxOpNode | undefined): op is RequestAspectOp {
  return op?.kind === "aspect" &&
    (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu");
}

export function isProhibitionCommandAspectOp(op: AuxOpNode | undefined): op is ProhibitionAspectOp {
  return op?.kind === "aspect" && op.aspect === "naide_kudasai";
}

export function commandTerminalBaseOperatorChain(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => boolean
): OperatorOp[] {
  const headOps = ops.filter(isHeadOp);
  if (headOps.length < 2) {
    return [];
  }
  if (!isCommandAspectOp(headOps[headOps.length - 1])) {
    return [];
  }
  const baseOps = headOps.slice(0, -1);
  if (!baseOps.every(isRequestCommandBaseOp)) {
    return [];
  }
  return baseOps;
}

export function commandAttributiveAspectOp<T extends RequestAspectOp | ProhibitionAspectOp>(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => op is T
): T | null {
  const headOps = ops.filter(isHeadOp);
  const commandIdx = attributiveCommandIndex(headOps);
  const command = commandIdx < 0 ? undefined : headOps[commandIdx];
  return isCommandAspectOp(command) ? command : null;
}

function attributiveCommandIndex(headOps: readonly AuxOpNode[]): number {
  if (headOps.length === 0) {
    return -1;
  }
  const last = headOps[headOps.length - 1];
  return last?.kind === "predicateQuoteCarrier" ? headOps.length - 2 : headOps.length - 1;
}

export function attributiveCommandBaseOperatorChain(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp
): OperatorOp[] {
  const headOps = ops.filter(isHeadOp);
  const commandIdx = headOps.indexOf(command);
  if (commandIdx <= 0) {
    return [];
  }
  const baseOps = headOps.slice(0, commandIdx);
  if (!baseOps.every(isRequestCommandBaseOp)) {
    return [];
  }
  return baseOps;
}

export function requestBaseCanUseDirectAuxiliaryImperative(
  ops: readonly OperatorOp[]
): boolean {
  if (ops.length !== 1) {
    return false;
  }
  const op = ops[0];
  if (op?.kind !== "aspect") {
    return false;
  }
  return op.aspect === "te_miru" || op.aspect === "te_oku" || op.aspect === "te_shimau";
}

export function attributiveCommandHeadPatternMatches(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp,
  baseOps: readonly OperatorOp[]
): boolean {
  const headOps = ops.filter(isHeadOp);
  const commandIdx = headOps.indexOf(command);
  if (commandIdx !== baseOps.length) {
    return false;
  }
  if (baseOps.some((op, idx) => headOps[idx] !== op)) {
    return false;
  }
  const afterCommand = headOps.slice(commandIdx + 1);
  return afterCommand.length === 0 ||
    (afterCommand.length === 1 && afterCommand[0]?.kind === "predicateQuoteCarrier");
}

export function requestTerminalBaseCanCarryStemNegation(ops: readonly OperatorOp[]): boolean {
  return (
    ops.length > 0 &&
    ops[0]?.kind === "postverbAuxiliary" &&
    ops[0].auxiliary.kind === "scope_control"
  );
}

export function requestTerminalBaseOpForRender(op: OperatorOp): OperatorOp {
  if (op.kind === "aspect" && op.aspect === "te_miseru") {
    return {
      ...op,
      semantic: {
        reading: "volitional_showing",
        candidates: ["volitional_showing", "generic"],
        renderStrategy: "volitional_showing",
        projection: "default"
      }
    };
  }
  return op;
}
