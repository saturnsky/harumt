import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { isKoreanPotentialLemma, potentialPhrasePrefix } from "../../../../../generator/aux-map.js";
import { selectParticle } from "../../../../../generator/particles.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { conjugateNegAttributive, selectPlainVerbAttributiveEnding } from "../../../../attributive.js";
import { committedAttributiveProjectionPolicy, headRequiredAdnominalEnding, attributiveProjectionPolicy, headRequiredPastAttributivePolicy, headRequiresFutureAttributiveProjection, predicateMoodRequestsFutureProjection } from "../attributive-head-policy.js";
import { isAdverbialMannerNounHead } from "../classifiers/tokens.js";
import type { AuxLayerNode, AuxOpNode, ConnectiveOp, ProhibitionAspectOp, RequestAspectOp, NegationOp, PredicateQuoteCarrierOp, StemNode, TenseOp, YoudaModalOp } from "../grammar.js";
import { stemAllowsSahenShortNegationSplit } from "../short-negation-policy.js";
import { closeChainTraceAgainstText, rebindChainTraceForProjection, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, type BaseResult, type KoreanPredicateBase, type OkBaseResult, type OperatorOp, type RenderContext, type RenderFailure, type RenderOutcome, likenessAttributiveLexicalizationBase, isFutureAttributiveProjection, type AttributiveProjectionPolicy } from "./base-model.js";
import { pastNegStemAttributive } from "./final-forms.js";
import { finalNegationLoweringForcesPast, lowerFinalNegationForCommittedBase, passiveStemOptionsForStem, simpleStemBase, simpleStemBaseResult, lowerBaseKeepingFinal } from "./base-support.js";
import { conditionalQuoteEllipsisMood, type ConditionalQuoteEllipsisMood, composeConditionalQuoteEllipsisAttributive } from "./hostless-conditional-quote.js";
import { composeCommittedBaseAttributive, likenessAttributiveLexicalizationApplies, projectBaseAttributive, likenessAttributiveLexicalizedPolicy, projectBaseReasonGerund, plainDeclarativeToPointAttributive } from "./predicate-base-projection.js";
import { composeRequestProhibitionAttributiveQuote } from "./quote-complement-compose.js";
import { reprojectCommandQuoteAttributiveForHeadPolicy, buildRequestQuotedPropositionBase, prohibitionUsesRequestForm, renderRequestAttributiveQuoteFromStem, renderRequestAttributiveQuoteOnPredicateBase } from "./command-render.js";
import { assignOperatorChainWrapSlots, attributiveCommandBaseOperatorChain, attributiveCommandHeadPatternMatches, chainBases, chainStemTraceFields, collectOperatorChain, isChainableHeadOp, isHeadOp, operatorChainSlotForWrapOp, requestTerminalBaseCanCarryStemNegation, requestTerminalBaseOpForRender } from "./op-chain.js";
import { committedCarrierPostChainFrame, composeCommittedCarrierPostChain, composeCommittedCarrierPostChainAttributive } from "./noun-copula.js";
import { withSimpleHostTraced } from "./tail-host-trace.js";
import { composeCommittedTailConnective } from "./connective-compose.js";

export function withoutAttributiveInternalPoliteness(
  ops: readonly AuxOpNode[]
): readonly AuxOpNode[] {
  return ops
    .filter((op) => op.kind !== "polite")
    .map((op) => "polite" in op && op.polite === true ? { ...op, polite: false } : op);
}

export function withMoodSourceBoundToFinalTraceSegment(
  outcome: RenderOutcome,
  layer: AuxLayerNode
): RenderOutcome {
  const consumed = layer.attributiveMood?.source.tokens ?? [];
  if (!outcome.ok || consumed.length === 0 || outcome.traced === undefined) {
    return outcome;
  }
  const segments = outcome.traced;
  const finalIdx = segments.length - 1;
  const finalSegment = segments[finalIdx];
  if (finalSegment === undefined) {
    return outcome;
  }
  const present = new Set(finalSegment.sourceTokens);
  const added = consumed.filter((token) => !present.has(token));
  if (added.length === 0) {
    return outcome;
  }
  return {
    ...outcome,
    traced: [
      ...segments.slice(0, finalIdx),
      { ...finalSegment, sourceTokens: [...finalSegment.sourceTokens, ...added] }
    ]
  };
}

export interface AttributiveWrapOpState {
  preModalNeg: NegationOp | null;
  preModalTense: TenseOp | null;
  readonly postModalNegations: NegationOp[];
  readonly postModalTenses: TenseOp[];
}

export interface AttributiveTerminalChainContext {
  readonly layer: AuxLayerNode & { readonly stem: Extract<StemNode, { readonly kind: "verb" | "adj" }> };
  readonly ctx: RenderContext;
  readonly options: { readonly nominalizedTerminal?: boolean };
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly formal: boolean;
  readonly boundaryRequestsFuture: boolean;
}

interface AttributiveCommandQuoteScope {
  readonly requestAttributiveOp: RequestAspectOp | null;
  readonly prohibitionAttributiveOp: ProhibitionAspectOp | null;
  readonly commandOp: RequestAspectOp | ProhibitionAspectOp | null;
  readonly quotePostChain: ReturnType<typeof requestAttributiveQuotePostChain>;
  readonly likenessModal: YoudaModalOp | null;
}

export function collectAttributiveWrapOps(
  layer: AuxLayerNode,
  state: AttributiveWrapOpState,
  operatorHeadIdx: number,
  requestAttributiveOp: RequestAspectOp | null,
  prohibitionAttributiveOp: ProhibitionAspectOp | null,
  conditionalMannerMode: ReturnType<typeof conditionalCompactQuoteMannerMode>
): RenderFailure | null {
  for (const op of layer.ops) {
    switch (op.kind) {
      case "negation":
        if (operatorHeadIdx === -1 || layer.ops.indexOf(op) < operatorHeadIdx) {
          if (state.preModalNeg !== null) {
            return { ok: false, reason: "multiple pre-reference negation ops in attributive terminal not supported" };
          }
          state.preModalNeg = op;
        } else {
          state.postModalNegations.push(op);
        }
        break;
      case "tense":
        if (op.tense !== "past") {
          return { ok: false, reason: `tense '${op.tense}' in attributive terminal not supported` };
        }
        if (operatorHeadIdx === -1 || layer.ops.indexOf(op) < operatorHeadIdx) {
          if (state.preModalTense !== null) {
            return { ok: false, reason: "multiple pre-reference tense ops in attributive terminal not supported" };
          }
          state.preModalTense = op;
        } else {
          state.postModalTenses.push(op);
        }
        break;
      case "polite":
      case "classicalAuxResidue":
      case "adjCopulaBridge":
        break;
      case "copula":
        if (op.variant === "basic" && op.polarity === "affirmative") {
          break;
        }
        return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
      case "connective":
        if (
          attributiveSequenceAfterQuoteCarrier(layer, op, conditionalMannerMode) !== null
        ) {
          break;
        }
        return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
      default:
        if (op === requestAttributiveOp || op === prohibitionAttributiveOp) {
          break;
        }
        if (!isChainableHeadOp(op)) {
          return { ok: false, reason: `op '${op.kind}' in attributive terminal not supported` };
        }
    }
  }
  return null;
}

export function renderAttributiveSequenceAfterQuote(
  ac: AttributiveTerminalChainContext,
  state: AttributiveWrapOpState,
  sequenceAfterQuote: NonNullable<ReturnType<typeof attributiveSequenceAfterQuoteCarrier>>
): RenderOutcome {
  const { layer, ctx, stemLemma, stemIrregular, isVerb, formal } = ac;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses } = state;
  const carrierIdx = layer.ops.indexOf(sequenceAfterQuote.carrier);
  const hasPostCarrierWrap = layer.ops.slice(carrierIdx + 1).some((op) =>
    op.kind === "negation" || op.kind === "tense"
  );
  if (hasPostCarrierWrap) {
    return { ok: false, reason: "sequence_after compact quote attributive post wrap not supported" };
  }
  const connectiveIdx = layer.ops.indexOf(sequenceAfterQuote.connective);
  const precedingOps = collectOperatorChain(layer.ops.slice(0, connectiveIdx));
  const consumesStemPrefix = precedingOps.length > 0;
  let baseResult: BaseResult;
  let finalPast = preModalTense?.tense === "past";
  let finalNeg = preModalNeg;
  if (consumesStemPrefix) {
    const pastAfterChainIdx = new Map<number, TenseOp>();
    for (const tenseOp of postModalTenses) {
      const slot = operatorChainSlotForWrapOp(tenseOp, layer, precedingOps);
      if (slot === null) {
        return { ok: false, reason: "sequence_after compact quote post tense 위치 식별 실패" };
      }
      pastAfterChainIdx.set(slot, tenseOp);
    }
    const negAfterChainIdx = new Map<number, NegationOp>();
    for (const negOp of postModalNegations) {
      const slot = operatorChainSlotForWrapOp(negOp, layer, precedingOps);
      if (slot === null) {
        return { ok: false, reason: "sequence_after compact quote post negation 위치 식별 실패" };
      }
      negAfterChainIdx.set(slot, negOp);
    }
    const folded = chainBases(precedingOps, stemLemma, stemIrregular, isVerb, {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg,
      stemPast: preModalTense?.tense === "past",
      pastAfterChainIdx,
      negAfterChainIdx,
      formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    });
    if (!folded.ok) return folded;
    baseResult = {
      ok: true,
      base: folded.base,
      chainOnFinalSupported: folded.chainOnFinalSupported,
      ...(folded.finalNegationOptions === undefined ? {} : { finalNegationOptions: folded.finalNegationOptions }),
      ...(folded.finalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: folded.finalNegationLoweringPolicy }),
      ...(folded.connectivePrefixContraction === undefined ? {} : { connectivePrefixContraction: folded.connectivePrefixContraction }),
      ...(folded.connectiveBaseOverride === undefined ? {} : { connectiveBaseOverride: folded.connectiveBaseOverride })
    };
    finalPast = folded.finalPast;
    finalNeg = folded.finalNeg;
  } else {
    baseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
  }
  const rendered = composeCommittedSequenceAfterCompactQuoteAttributive(
    baseResult,
    sequenceAfterQuote.connective,
    finalPast,
    finalNeg,
    formal,
    ctx.lookups,
    {
      ...(sequenceAfterQuote.likenessModal === null
        ? {}
        : { likenessAfterCarrier: sequenceAfterQuote.likenessModal }),
      wishMannerAfterCarrier: sequenceAfterQuote.wishManner,
      directMannerAfterCarrier: sequenceAfterQuote.directManner,
      ...(sequenceAfterQuote.conditionalEllipsisMood === null
        ? {}
        : { conditionalEllipsisMoodAfterCarrier: sequenceAfterQuote.conditionalEllipsisMood }),
      reasonAfterCarrier: sequenceAfterQuote.reasonAfterCarrier,
      attrPolicy: attributiveProjectionPolicy(layer),
    }
  );
  return rendered.ok && consumesStemPrefix
    ? { ...rendered, stemPrefixApplied: true }
    : rendered;
}

export function renderRequestProhibitionQuoteAttributive(
  ac: AttributiveTerminalChainContext,
  state: AttributiveWrapOpState,
  requestAttributiveOp: RequestAspectOp | null,
  prohibitionAttributiveOp: ProhibitionAspectOp | null
): RenderOutcome | null {
  const { layer, ctx, isVerb, formal } = ac;
  if (requestAttributiveOp !== null || prohibitionAttributiveOp !== null) {
    if (requestAttributiveOp !== null && prohibitionAttributiveOp !== null) {
      return { ok: false, reason: "request + prohibition attributive terminal composition not supported" };
    }
    if (!isVerb) {
      return { ok: false, reason: "request/prohibition attributive terminal requires verb stem" };
    }
    const commandOp = requestAttributiveOp ?? prohibitionAttributiveOp;
    const quotePostChain = commandOp === null ? null : requestAttributiveQuotePostChain(layer.ops, commandOp);
    const likenessModal = commandOp === null ? null : commandAttributiveLikenessModal(layer.ops, commandOp);
    const composeLikenessAttributive = (base: KoreanPredicateBase): RenderOutcome => {
      if (likenessModal === null) {
        return { ok: false, reason: "request/prohibition likeness attributive lost its typed modal" };
      }
      const quotedBase = buildRequestQuotedPropositionBase(
        base,
        requestAttributiveOp !== null ? "request" : "prohibition",
        { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
      );
      const frame = committedCarrierPostChainFrame(quotedBase, [likenessModal], false, null, ctx);
      if ("ok" in frame) return frame;
      if (frame.finalNeg !== null) {
        return { ok: false, reason: "request/prohibition likeness attributive final negation not supported" };
      }
      return composeCommittedBaseAttributive(
        frame.baseResult,
        frame.finalPast,
        formal,
        "lexical",
        "default",
        attributiveProjectionPolicy(layer)
      );
    };
    const baseOps = commandOp === null ? [] : attributiveCommandBaseOperatorChain(layer.ops, commandOp);
    const cmd: AttributiveCommandQuoteScope = { requestAttributiveOp, prohibitionAttributiveOp, commandOp, quotePostChain, likenessModal };
    if (baseOps.length > 0) {
      return renderRequestProhibitionBaseChainAttributive(ac, state, cmd, baseOps, composeLikenessAttributive);
    }
    return renderRequestProhibitionStemAttributive(ac, state, cmd, composeLikenessAttributive);
  }
  return null;
}

function renderRequestProhibitionBaseChainAttributive(
  ac: AttributiveTerminalChainContext,
  state: AttributiveWrapOpState,
  cmd: AttributiveCommandQuoteScope,
  baseOps: OperatorOp[],
  composeLikenessAttributive: (base: KoreanPredicateBase) => RenderOutcome
): RenderOutcome {
  const { requestAttributiveOp, prohibitionAttributiveOp, commandOp, quotePostChain, likenessModal } = cmd;
  const { layer, ctx, stemLemma, stemIrregular, isVerb, formal } = ac;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses } = state;
  if (quotePostChain === null && likenessModal === null && (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps))) {
    return { ok: false, reason: "request/prohibition attributive terminal base chain has unsupported companion op" };
  }
  const baseCarriesStemNegation = requestAttributiveOp !== null &&
    requestTerminalBaseCanCarryStemNegation(baseOps);
  if ((preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null) {
    return { ok: false, reason: "request/prohibition attributive terminal base chain stem neg/tense not supported" };
  }
  const baseRes = chainBases(
    baseOps.map(requestTerminalBaseOpForRender),
    stemLemma,
    stemIrregular,
    isVerb,
    {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg: baseCarriesStemNegation ? preModalNeg : null,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }
  if (baseRes.finalNeg !== null) {
    return { ok: false, reason: "request/prohibition attributive terminal base chain final negation not supported" };
  }
  if (likenessModal !== null) {
    const rendered = composeLikenessAttributive(baseRes.base);
    return rendered.ok ? { ...rendered, stemPrefixApplied: true } : rendered;
  }
  if (quotePostChain !== null) {
    const quotedBase = buildRequestQuotedPropositionBase(
      baseRes.base,
      requestAttributiveOp !== null ? "request" : "prohibition",
      { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
    );
    return composeCommittedCarrierPostChainAttributive(
      quotedBase,
      quotePostChain.postOps,
      quotePostChain.postPolite,
      quotePostChain.connective,
      ctx,
      attributiveProjectionPolicy(layer)
    ) ?? composeCommittedCarrierPostChain(
      quotedBase,
      quotePostChain.postOps,
      quotePostChain.postPolite,
      quotePostChain.connective,
      ctx
    );
  }
  if (postModalNegations.length > 0 || postModalTenses.length > 0) {
    return { ok: false, reason: "request/prohibition attributive terminal + post-reference wrap op not supported" };
  }
  const carrierOp = layer.ops.find(
    (op): op is PredicateQuoteCarrierOp => op.kind === "predicateQuoteCarrier"
  );
  const rendered = requestAttributiveOp !== null && carrierOp !== undefined
    ? renderRequestAttributiveQuoteOnPredicateBase(
      baseRes,
      requestAttributiveOp,
      carrierOp,
      {
        past: baseRes.finalPast,
        commandSourceTokens: [
          ...layer.stem.source.tokens,
          ...baseOps.flatMap((op) => op.source.tokens)
        ]
      }
    )
    : composeRequestProhibitionAttributiveQuote(baseRes.base, {
      requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition)
    });
  const reprojected = reprojectCommandQuoteAttributiveForHeadPolicy(
    rendered,
    baseRes.base,
    requestAttributiveOp !== null ? "request" : "prohibition",
    attributiveProjectionPolicy(layer),
    formal,
    { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
  ) ?? rendered;
  return reprojected.ok ? { ...reprojected, stemPrefixApplied: true } : reprojected;
}

function renderRequestProhibitionStemAttributive(
  ac: AttributiveTerminalChainContext,
  state: AttributiveWrapOpState,
  cmd: AttributiveCommandQuoteScope,
  composeLikenessAttributive: (base: KoreanPredicateBase) => RenderOutcome
): RenderOutcome {
  const { requestAttributiveOp, prohibitionAttributiveOp, commandOp, quotePostChain, likenessModal } = cmd;
  const { layer, ctx, stemLemma, stemIrregular, isVerb, formal } = ac;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses } = state;
  if (quotePostChain === null && likenessModal === null && (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, []))) {
    return { ok: false, reason: "request/prohibition attributive terminal has unsupported companion op" };
  }
  if (preModalTense !== null) {
    return { ok: false, reason: "request/prohibition attributive terminal stem tense not supported" };
  }
  if (likenessModal !== null) {
    if (preModalNeg !== null) {
      return { ok: false, reason: "request/prohibition likeness attributive stem negation not supported" };
    }
    const stemPrefix = layer.stem.koreanPrefix ?? "";
    const simpleBase = simpleStemBase(stemLemma, stemIrregular, true);
    const rendered = composeLikenessAttributive(
      stemPrefix.length === 0 ? simpleBase : { ...simpleBase, prefix: stemPrefix }
    );
    return rendered.ok && stemPrefix.length > 0
      ? { ...rendered, stemPrefixApplied: true }
      : rendered;
  }
  if (quotePostChain !== null) {
    const quotedBase = buildRequestQuotedPropositionBase(
      simpleStemBase(stemLemma, stemIrregular, true),
      requestAttributiveOp !== null ? "request" : "prohibition",
      { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
    );
    return composeCommittedCarrierPostChainAttributive(
      quotedBase,
      quotePostChain.postOps,
      quotePostChain.postPolite,
      quotePostChain.connective,
      ctx,
      attributiveProjectionPolicy(layer)
    ) ?? composeCommittedCarrierPostChain(
      quotedBase,
      quotePostChain.postOps,
      quotePostChain.postPolite,
      quotePostChain.connective,
      ctx
    );
  }
  if (postModalNegations.length > 0 || postModalTenses.length > 0) {
    return { ok: false, reason: "request/prohibition attributive terminal + post-reference wrap op not supported" };
  }
  const rendered = requestAttributiveOp !== null
    ? renderRequestAttributiveQuoteFromStem({
      stemLemma,
      stemIrregular,
      isVerb,
      preNeg: preModalNeg,
      past: false,
      stemSourceTokens: layer.stem.source.tokens,
      ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
      ...(requestAttributiveOp === null ? {} : { requestSourceTokens: requestAttributiveOp.source.tokens }),
      carrierSourceTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
    })
    : composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, true), {
      requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition),
      ...(prohibitionAttributiveOp !== null && preModalNeg === null
        ? {
          trace: {
            stemTokens: layer.stem.source.tokens,
            negativeTokens: prohibitionAttributiveOp.source.tokens.slice(0, 1),
            bridgeTokens: prohibitionUsesRequestForm(prohibitionAttributiveOp.prohibition)
              ? prohibitionAttributiveOp.source.tokens.slice(1, 2)
              : prohibitionAttributiveOp.source.tokens.slice(1),
            requestTailTokens: prohibitionUsesRequestForm(prohibitionAttributiveOp.prohibition)
              ? prohibitionAttributiveOp.source.tokens.slice(2)
              : [],
            carrierTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
          }
        }
        : {})
    });
  const stemQuoteBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
    ? simpleStemBase(stemLemma, stemIrregular, true)
    : { ...simpleStemBase(stemLemma, stemIrregular, true), prefix: layer.stem.koreanPrefix };
  const stemReprojected = preModalNeg !== null
    ? null
    : reprojectCommandQuoteAttributiveForHeadPolicy(
      rendered,
      stemQuoteBase,
      requestAttributiveOp !== null ? "request" : "prohibition",
      attributiveProjectionPolicy(layer),
      formal,
      { requestForm: prohibitionUsesRequestForm(prohibitionAttributiveOp?.prohibition) }
    );
  return stemReprojected ?? rendered;
}

export function renderAttributiveOperatorChain(
  ac: AttributiveTerminalChainContext,
  state: AttributiveWrapOpState,
  opChain: OperatorOp[]
): RenderOutcome {
  const { layer, ctx, stemLemma, stemIrregular, isVerb, formal, boundaryRequestsFuture } = ac;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses } = state;
  const wrapSlots = assignOperatorChainWrapSlots(layer, opChain, postModalTenses, postModalNegations);
  if (!wrapSlots.ok) {
    return { ok: false, reason: wrapSlots.reason };
  }
  const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
  const baseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, {
    lookups: ctx.lookups,
    stemPrefix: layer.stem.koreanPrefix,
    ...chainStemTraceFields(layer.stem),
    ...(preModalTense === null ? {} : { stemPastSourceTokens: preModalTense.source.tokens }),
    sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
    sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
    sourceStemIsVolitional: layer.stem.stemMood === "volitional",
    preModalNeg,
    stemPast: preModalTense?.tense === "past",
    pastAfterChainIdx,
    negAfterChainIdx,
    negBeforeChainIdx,
    formal,
    shortNegationPolicy: layer.stem.shortNegationPolicy,
    absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
    ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
    passiveStemOptions: passiveStemOptionsForStem(layer.stem)
  });
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }
  const finalBaseResult = {
    ok: true,
    base: baseRes.base,
    chainOnFinalSupported: baseRes.chainOnFinalSupported,
    ...(baseRes.finalNegationOptions === undefined ? {} : { finalNegationOptions: baseRes.finalNegationOptions }),
    ...(baseRes.finalNegationLoweringPolicy === undefined ? {} : { finalNegationLoweringPolicy: baseRes.finalNegationLoweringPolicy })
  } satisfies OkBaseResult;
  const projectedBase = baseRes.finalNeg === null
    ? baseRes.base
    : lowerFinalNegationForCommittedBase(finalBaseResult, baseRes.finalNeg, formal, ctx.lookups);
  if (projectedBase === null) {
    return { ok: false, reason: "attributive operator chain final negation lowering not supported" };
  }
  const loweredForcesPast = baseRes.finalNeg === null
    ? false
    : finalNegationLoweringForcesPast(finalBaseResult, baseRes.finalNeg.chainDepth);
  const chainAttributivePast = baseRes.finalPast ||
    (baseRes.finalNeg?.chainPast ?? false) ||
    (loweredForcesPast && baseRes.finalNegationLoweringPolicy !== "te_iru_negative_long_negation") ||
    attributiveBoundaryProjectsResultativeState(layer);
  const attr = projectBaseAttributive(
    projectedBase,
    chainAttributivePast,
    formal,
    baseRes.finalPastProjection ?? "lexical",
    "default",
    committedAttributiveProjectionPolicy(
      layer,
      boundaryRequestsFuture || (
        !chainAttributivePast &&
        preModalTense?.tense !== "past" &&
        opChainIsProspectiveTransparentAspect(opChain) &&
        boundaryHeadIsSourceFutureHeadNoun(layer, ctx)
      )
    )
  );
  if (attr === null) {
    return { ok: false, reason: "attributive operator chain projection not supported" };
  }
  const attrTraced = baseRes.chainSourceTrace === undefined
    ? null
    : likenessAttributiveLexicalizationApplies(projectedBase, false)
      ? rebindChainTraceForProjection(baseRes.chainSourceTrace, attr)
      : closeChainTraceAgainstText(baseRes.chainSourceTrace, attr);
  return {
    ok: true,
    text: attr,
    polite: false,
    stemPrefixApplied: true,
    ...(attrTraced === null ? {} : { traced: attrTraced })
  };
}

export function renderAttributiveSimpleStemTail(ac: AttributiveTerminalChainContext, state: AttributiveWrapOpState): RenderOutcome {
  const { layer, ctx, options, stemLemma, stemIrregular, boundaryRequestsFuture } = ac;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses } = state;
  if (postModalNegations.length > 0 || postModalTenses.length > 0) {
    return { ok: false, reason: "post-reference wrap ops without attributive operator chain" };
  }
  const carriesPast = attributiveTerminalCarriesPast(layer, preModalTense, preModalNeg);
  const pastProjection = layer.stem.commitment === "suppletive_negation" ? "committed" : "lexical";
  const forceFutureProjection = boundaryRequestsFuture &&
    (layer.stem.kind === "verb" || predicateMoodRequestsFutureProjection(layer));
  const useShortAttributiveNegation =
    options.nominalizedTerminal === true &&
    !forceFutureProjection &&
    preModalNeg?.preferShortNegation === true &&
    !ctx.formal;
  const ordinaryEnding = carriesPast || forceFutureProjection || useShortAttributiveNegation
    ? null
    : headRequiredAdnominalEnding(layer) ??
      ordinaryNominalAttributiveEnding(layer, ctx) ??
      sourcePlainVerbAttributiveEnding(layer, ctx);
  if (ordinaryEnding !== null) {
    const text = renderStemAttributiveWithEnding({
      stemLemma,
      stemIrregular,
      stemKind: layer.stem.kind,
      ending: ordinaryEnding,
      preModalNeg,
      lookups: ctx.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
    });
    return withSimpleHostTraced({ ok: true, text, polite: false }, layer);
  }
  const text = pastNegStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind: layer.stem.kind,
    past: carriesPast,
    pastProjection,
    preModalNeg,
    attrPolicy: forceFutureProjection ? "future" : headRequiredPastAttributivePolicy(layer),
    useShortHint: useShortAttributiveNegation,
    lookups: ctx.lookups,
    sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
  });
  return withSimpleHostTraced({ ok: true, text, polite: false }, layer);
}


export function renderHazuNegativePropositionAttributiveTerminal(opts: {
  readonly layer: AuxLayerNode;
  readonly opChain: readonly OperatorOp[];
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome | null {
  const finalOp = opts.opChain[opts.opChain.length - 1];
  if (
    finalOp === undefined ||
    finalOp.kind !== "modal" ||
    finalOp.modal !== "hazu" ||
    finalOp.polarity !== "affirmative"
  ) {
    return null;
  }
  const finalOpIdx = opts.layer.ops.indexOf(finalOp);
  const neg = opts.layer.ops[finalOpIdx - 1];
  if (neg?.kind !== "negation" || neg.chainDepth !== 1 || neg.chainPast) {
    return null;
  }

  const outerAttributive = headRequiresFutureAttributiveProjection(opts.layer) ? "리 없을" : "리 없는";
  const positiveOps = opts.opChain.slice(0, -1);
  if (positiveOps.length === 0) {
    const attr = pastNegStemAttributive({
      stemLemma: opts.stemLemma,
      stemIrregular: opts.stemIrregular,
      stemKind: opts.isVerb ? "verb" : "adj",
      past: false,
      preModalNeg: null,
      attrPolicy: "future",
      useShortHint: false,
      lookups: opts.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(opts.layer.stem.koreanPrefix)
    });
    return { ok: true, text: `${attr} ${outerAttributive}`, polite: false };
  }

  const baseRes = chainBases(positiveOps, opts.stemLemma, opts.stemIrregular, opts.isVerb, {
    lookups: opts.lookups,
    stemPrefix: opts.layer.stem.koreanPrefix,
    sourceStemIsVerb: stemHasSourceVerbalPredicate(opts.layer.stem),
    sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(opts.layer.stem),
    preModalNeg: null,
    stemPast: false,
    pastAfterChainIdx: new Map(),
    negAfterChainIdx: new Map(),
    formal: opts.formal,
    shortNegationPolicy: opts.layer.stem.shortNegationPolicy,
    absorbedPassiveAux: opts.layer.stem.absorbedPassiveAux === true,
    ...(opts.layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: opts.layer.stem.absorbedPassiveClass }),
    passiveStemOptions: passiveStemOptionsForStem(opts.layer.stem)
  });
  if (!baseRes.ok || baseRes.finalNeg !== null) {
    return null;
  }
  const attr = projectBaseAttributive(
    baseRes.base,
    baseRes.finalPast,
    opts.formal,
    "lexical",
    "default",
    "future"
  );
  return attr === null ? null : { ok: true, text: `${attr} ${outerAttributive}`, polite: false, stemPrefixApplied: true };
}

export function renderBareNominalLikePredicateQuoteAttributiveTerminal(layer: AuxLayerNode): RenderOutcome | null {
  if (layer.stem.kind !== "noun" && layer.stem.kind !== "adverb") {
    return null;
  }
  if (layer.ops.length !== 1) {
    return null;
  }
  const carrier = layer.ops[0];
  if (carrier?.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu") {
    return null;
  }
  const lemma = layer.stem.lemma;
  if (lemma.length === 0) {
    return { ok: false, reason: "bare quote-body attributive stem lemma is empty" };
  }
  const ending = headRequiresFutureAttributiveProjection(layer)
    ? `${selectParticle(lemma, "이라고/라고")} 할`
    : selectParticle(lemma, "이라는/라는");
  return {
    ok: true,
    text: `${lemma}${ending}`,
    polite: false
  };
}

export function attributiveSequenceAfterQuoteCarrier(
  layer: AuxLayerNode,
  connective: ConnectiveOp,
  conditionalMannerMode: "wish" | "direct" | null,
): {
  readonly connective: ConnectiveOp;
  readonly carrier: Extract<AuxOpNode, { readonly kind: "predicateQuoteCarrier" }>;
  readonly likenessModal: YoudaModalOp | null;
  readonly wishManner: boolean;
  readonly directManner: boolean;
  readonly conditionalEllipsisMood: ConditionalQuoteEllipsisMood | null;
  readonly reasonAfterCarrier: boolean;
} | null {
  const ops = layer.ops;
  if (
    connective.connective !== "sequence_after" &&
    connective.connective !== "exemplification" &&
    connective.connective !== "conditional" &&
    connective.connective !== "reason"
  ) return null;
  const connectiveIdx = ops.indexOf(connective);
  const carrier = ops[connectiveIdx + 1];
  if (
    connectiveIdx < 0 ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu"
  ) {
    return null;
  }
  const remaining = ops.slice(connectiveIdx + 2);
  const likenessModal = remaining[0]?.kind === "modal" && remaining[0].modal === "youda"
    ? remaining[0]
    : null;
  if (connective.connective === "reason") {
    return remaining.length === 0
      ? {
        connective,
        carrier,
        likenessModal: null,
        wishManner: false,
        directManner: false,
        conditionalEllipsisMood: null,
        reasonAfterCarrier: true
      }
      : null;
  }
  if (connective.connective === "conditional") {
    if (likenessModal !== null && remaining.length === 1) {
      return {
        connective,
        carrier,
        likenessModal,
        wishManner: false,
        directManner: false,
        conditionalEllipsisMood: null,
        reasonAfterCarrier: false
      };
    }
    if (remaining.length !== 0) {
      return null;
    }
    if (conditionalMannerMode !== null) {
      return {
        connective,
        carrier,
        likenessModal: null,
        wishManner: conditionalMannerMode === "wish",
        directManner: conditionalMannerMode === "direct",
        conditionalEllipsisMood: null,
        reasonAfterCarrier: false
      };
    }
    return {
      connective,
      carrier,
      likenessModal: null,
      wishManner: false,
      directManner: false,
      conditionalEllipsisMood: conditionalQuoteEllipsisMood(layer, connective),
      reasonAfterCarrier: false
    };
  }
  if (!remaining.every((op) =>
    op.kind === "polite" ||
    op.kind === "classicalAuxResidue" ||
    op.kind === "negation" ||
    op.kind === "tense"
  )) {
    return null;
  }
  return {
    connective,
    carrier,
    likenessModal: null,
    wishManner: false,
    directManner: false,
    conditionalEllipsisMood: null,
    reasonAfterCarrier: false
  };
}

export function conditionalCompactQuoteMannerMode(
  layer: AuxLayerNode,
  ctx: RenderContext,
): "wish" | "direct" | null {
  const payload = layer.terminalPayload;
  if (
    payload?.kind !== "attributiveBoundary" ||
    !isAdverbialMannerNounHead(payload.head, ctx.lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS)
  ) {
    return null;
  }
  return payload.conditionalWishMannerHostKind === "thought" ||
    payload.conditionalWishMannerHostKind === "wish"
    ? "wish"
    : "direct";
}

function requestAttributiveQuotePostChain(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp
): { readonly postOps: readonly AuxOpNode[]; readonly postPolite: boolean; readonly connective: ConnectiveOp | null } | null {
  const commandIdx = ops.indexOf(command);
  if (commandIdx < 0 || commandIdx >= ops.length - 1) {
    return null;
  }
  const carrier = ops[commandIdx + 1];
  if (carrier?.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu") {
    return null;
  }
  if (commandIdx + 2 >= ops.length) {
    return null;
  }
  return predicateQuoteCarrierPostChainFromIndex(ops, commandIdx + 1);
}

export function predicateQuoteCarrierPostChainFromIndex(
  ops: readonly AuxOpNode[],
  carrierIdx: number
): { readonly postOps: readonly AuxOpNode[]; readonly postPolite: boolean; readonly connective: ConnectiveOp | null } | null {
  if (carrierIdx < 0 || carrierIdx >= ops.length) {
    return null;
  }
  let connective: ConnectiveOp | null = null;
  let postPolite = false;
  const postOps: AuxOpNode[] = [];
  for (let i = carrierIdx + 1; i < ops.length; i++) {
    const op = ops[i]!;
    if (op.kind === "connective") {
      if (i !== ops.length - 1 || connective !== null) {
        return null;
      }
      connective = op;
      continue;
    }
    if (op.kind === "polite") {
      postPolite = true;
      continue;
    }
    if (op.kind === "tense" || op.kind === "negation" || isChainableHeadOp(op)) {
      postOps.push(op);
      continue;
    }
    return null;
  }
  return {
    postOps,
    postPolite,
    connective
  };
}

function ordinaryNominalAttributiveEnding(layer: AuxLayerNode, ctx: RenderContext): "ㄴ/는" | "ㄴ/은" | "ㄹ/을" | null {
  if (
    layer.terminalPayload?.kind !== "attributiveBoundary" ||
    layer.terminalPayload.projection !== "ordinary_nominal" ||
    layer.stem.kind !== "verb"
  ) {
    return null;
  }
  const contentToken = layer.stem.source.tokens[layer.stem.conjugationAnchor];
  if (contentToken === undefined) {
    return null;
  }
  const headToken = layer.terminalPayload.projectionContext.tokens[layer.terminalPayload.head.tokenIdx] ??
    layer.terminalPayload.source.tokens[0] ??
    null;
  const ending = selectPlainVerbAttributiveEnding(
    layer.stem.lemma,
    contentToken,
    headToken,
    {
      tokens: layer.terminalPayload.projectionContext.tokens,
      contentIdx: layer.terminalPayload.projectionContext.contentIdx,
      lookups: ctx.lookups,
      ...(ctx.layout === undefined ? {} : { layout: ctx.layout })
    }
  );
  return ending === "ㄴ/는" || ending === "ㄴ/은" || ending === "ㄹ/을"
    ? ending
    : null;
}

function opChainIsProspectiveTransparentAspect(opChain: readonly AuxOpNode[]): boolean {
  return opChain.length > 0 && opChain.every((op) =>
    op.kind === "aspect" && (op.aspect === "te_iku" || op.aspect === "te_kuru")
  );
}

function boundaryHeadIsSourceFutureHeadNoun(layer: AuxLayerNode, ctx: RenderContext): boolean {
  const payload = layer.terminalPayload;
  if (payload?.kind !== "attributiveBoundary") {
    return false;
  }
  const head = payload.projectionContext.tokens[payload.head.tokenIdx];
  return head !== undefined &&
    (ctx.lookups.JP_FUTURE_HEAD_NOUNS.has(head.dictionaryForm) ||
      ctx.lookups.JP_FUTURE_HEAD_NOUNS.has(head.surface));
}

function sourcePlainVerbAttributiveEnding(layer: AuxLayerNode, ctx: RenderContext): "ㄴ/는" | "ㄴ/은" | "ㄹ/을" | null {
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const contentToken = layer.stem.source.tokens[layer.stem.conjugationAnchor];
  if (contentToken === undefined) {
    return null;
  }
  const ending = selectPlainVerbAttributiveEnding(
    layer.stem.lemma,
    contentToken,
    null,
    {
      tokens: layer.stem.source.tokens,
      contentIdx: layer.stem.conjugationAnchor,
      lookups: ctx.lookups,
      ...(ctx.layout === undefined ? {} : { layout: ctx.layout })
    }
  );
  return ending === "ㄴ/는" || ending === "ㄴ/은" || ending === "ㄹ/을"
    ? ending
    : null;
}

function renderStemAttributiveWithEnding(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly ending: "ㄴ/는" | "ㄴ/은" | "ㄹ/을";
  readonly preModalNeg: NegationOp | null;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): string {
  const { stemLemma, stemIrregular, stemKind, ending, preModalNeg, lookups, sahenShortNegationSplit } = opts;
  const chainDepth = preModalNeg?.chainDepth ?? 0;
  if (chainDepth === 0) {
    return conjugate(stemLemma, stemIrregular, ending);
  }
  if (chainDepth === 1) {
    if (isKoreanPotentialLemma(stemLemma)) {
      const focus = preModalNeg?.focusParticle;
      const prefix = focus === undefined
        ? potentialPhrasePrefix(stemLemma)
        : `${potentialPhrasePrefix(stemLemma).trimEnd()}${focus} `;
      if (preModalNeg?.chainPast === true) {
        return `${prefix}없었던`;
      }
      if (ending === "ㄹ/을") {
        return `${prefix}없을`;
      }
      return `${prefix}없는`;
    }
    const focus = preModalNeg?.focusParticle;
    const stemJi = `${conjugate(stemLemma, stemIrregular, "지")}${focus ?? ""}`;
    if (ending === "ㄴ/은") {
      if (preModalNeg?.inability === true) {
        return `${stemJi} ${conjugate("못하다", "여", "ㄴ/은")}`;
      }
      return focus === undefined
        ? conjugateNegAttributive(stemLemma, stemIrregular, "ㄴ/은")
        : `${stemJi} ${conjugate("않다", null, "ㄴ/은")}`;
    }
    const negEnding = ending === "ㄹ/을" ? "ㄹ/을" : "ㄴ/는";
    return preModalNeg?.inability === true
      ? `${stemJi} ${conjugate("못하다", "여", negEnding)}`
      : `${stemJi} ${conjugate("않다", null, negEnding)}`;
  }
  const attrPolicy = ending === "ㄹ/을" ? "future" : "present";
  return pastNegStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind,
    past: preModalNeg?.chainPast === true,
    preModalNeg,
    attrPolicy,
    useShortHint: false,
    lookups,
    sahenShortNegationSplit
  });
}

function attributiveBoundaryProjectsResultativeState(layer: AuxLayerNode): boolean {
  return layer.terminalPayload?.kind === "attributiveBoundary" &&
    layer.terminalPayload.projection === "resultative_state" &&
    layer.stem.kind === "verb";
}

function attributiveTerminalCarriesPast(
  layer: AuxLayerNode,
  preModalTense: TenseOp | null,
  preModalNeg: NegationOp | null
): boolean {
  if (preModalNeg?.chainPast === true) {
    return true;
  }
  if (preModalTense === null) {
    return attributiveBoundaryProjectsResultativeState(layer);
  }
  if (
    layer.terminalPayload?.kind === "attributiveBoundary" &&
    layer.terminalPayload.projection === "lexical_past" &&
    layer.stem.kind === "adj" &&
    layer.stem.commitment !== "suppletive_negation" &&
    stemHasSourceVerbalPredicate(layer.stem)
  ) {
    return false;
  }
  return true;
}


export function commandAttributiveAspectOpWithQuotedPostChain<T extends RequestAspectOp | ProhibitionAspectOp>(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => op is T
): T | null {
  const headOps = ops.filter(isHeadOp);
  for (const command of headOps) {
    if (isCommandAspectOp(command) && requestAttributiveQuotePostChain(ops, command) !== null) {
      return command;
    }
  }
  return null;
}

function commandAttributiveLikenessModal(
  ops: readonly AuxOpNode[],
  command: RequestAspectOp | ProhibitionAspectOp
): YoudaModalOp | null {
  const commandIdx = ops.indexOf(command);
  if (commandIdx < 0 || commandIdx !== ops.length - 2) {
    return null;
  }
  const likeness = ops[ops.length - 1];
  return likeness?.kind === "modal" &&
    likeness.modal === "youda" &&
    likeness.terminal === "attributive_na" &&
    !likeness.past &&
    !likeness.polite
    ? likeness
    : null;
}

export function commandAttributiveAspectOpBeforeLikeness<T extends RequestAspectOp | ProhibitionAspectOp>(
  ops: readonly AuxOpNode[],
  isCommandAspectOp: (op: AuxOpNode | undefined) => op is T
): T | null {
  const headOps = ops.filter(isHeadOp);
  for (const command of headOps) {
    if (isCommandAspectOp(command) && commandAttributiveLikenessModal(ops, command) !== null) {
      return command;
    }
  }
  return null;
}

export function composeCommittedSequenceAfterCompactQuoteAttributive(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  finalNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: {
    readonly likenessAfterCarrier?: YoudaModalOp;
    readonly wishMannerAfterCarrier?: boolean;
    readonly directMannerAfterCarrier?: boolean;
    readonly conditionalEllipsisMoodAfterCarrier?: ConditionalQuoteEllipsisMood;
    readonly reasonAfterCarrier?: boolean;
    readonly attrPolicy?: AttributiveProjectionPolicy;
  } = {}
): RenderOutcome {
  if (
    connective.connective !== "sequence_after" &&
    connective.connective !== "exemplification" &&
    !(
      connective.connective === "conditional" &&
      (options.likenessAfterCarrier !== undefined ||
        options.wishMannerAfterCarrier === true ||
        options.directMannerAfterCarrier === true ||
        options.conditionalEllipsisMoodAfterCarrier !== undefined)
    ) &&
    !(connective.connective === "reason" && options.reasonAfterCarrier === true)
  ) {
    return { ok: false, reason: "committed compact quote attributive requires a projectable connective" };
  }
  if (connective.connective === "reason" && options.reasonAfterCarrier === true) {
    if (!baseResult.ok) return baseResult;
    const loweredBase = lowerBaseKeepingFinal(baseResult.base, finalNeg, formal, {});
    if (loweredBase === null) {
      return { ok: false, reason: "reason quote carrier negation lowering not supported" };
    }
    const gerund = projectBaseReasonGerund(loweredBase, past || (finalNeg?.chainPast ?? false), formal);
    if (gerund === null) {
      return { ok: false, reason: "reason quote carrier gerund projection not supported" };
    }
    const reasonRequiresFuture = options.attrPolicy !== undefined &&
      isFutureAttributiveProjection(options.attrPolicy);
    return {
      ok: true,
      text: `${gerund} ${reasonRequiresFuture ? "때문이라고 할" : "때문이라는"}`,
      polite: false
    };
  }
  const sequence = composeCommittedTailConnective(
    baseResult,
    connective,
    past,
    false,
    finalNeg,
    formal,
    lookups
  );
  if (!sequence.ok) return sequence;
  const requiresFuture = options.attrPolicy !== undefined && isFutureAttributiveProjection(options.attrPolicy);
  if (connective.connective === "conditional") {
    if (options.wishMannerAfterCarrier === true) {
      return {
        ...sequence,
        text: requiresFuture
          ? `${sequence.text} ${conjugate("좋겠다", null, "ㄹ/을")}`
          : `${sequence.text} ${plainDeclarativeToPointAttributive("좋겠다")}`,
        polite: false
      };
    }
    if (options.conditionalEllipsisMoodAfterCarrier !== undefined) {
      return composeConditionalQuoteEllipsisAttributive(
        { ...sequence, polite: false },
        options.conditionalEllipsisMoodAfterCarrier,
        requiresFuture
      );
    }
    if (options.directMannerAfterCarrier === true) {
      return {
        ...sequence,
        text: `${sequence.text}${requiresFuture
          ? `${selectParticle(sequence.text, "이라고/라고")} ${conjugate("하다", "여", "ㄹ/을")}`
          : selectParticle(sequence.text, "이라는/라는")}`,
        polite: false
      };
    }
    const carrierHostAttr = `${sequence.text} ${conjugate("하다", "여", "ㄴ/는")}`;
    const carrierLikeness = options.likenessAfterCarrier === undefined
      ? undefined
      : likenessAttributiveLexicalizationBase(options.likenessAfterCarrier, carrierHostAttr);
    if (carrierLikeness !== undefined) {
      const lexicalized = projectBaseAttributive(
        carrierLikeness,
        false,
        formal,
        "lexical",
        "default",
        likenessAttributiveLexicalizedPolicy(options.attrPolicy ?? "present")
      );
      if (lexicalized === null) {
        return { ok: false, reason: "carrier likeness attributive lexicalization projection failed" };
      }
      return { ...sequence, text: lexicalized, polite: false };
    }
    return {
      ...sequence,
      text: `${carrierHostAttr} 것 ${conjugate("같다", null, requiresFuture ? "ㄹ/을" : "ㄴ/은")}`,
      polite: false
    };
  }
  return connective.connective === "exemplification"
    ? { ...sequence, text: `${sequence.text} ${requiresFuture ? "할" : "하는"}`, polite: false }
    : {
      ...sequence,
      text: `${sequence.text}${requiresFuture
        ? `${selectParticle(sequence.text, "이라고/라고")} 할`
        : selectParticle(sequence.text, "이라는/라는")}`,
      polite: false
    };
}
