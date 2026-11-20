import { conjugate } from "../../../../../generator/conjugator.js";
import { attributiveProjectionPolicy } from "../attributive-head-policy.js";
import type { AuxLayerNode, BenefactiveAspectOp, ProhibitionAspectOp, NegationOp, OpSource, PredicateQuoteCarrierOp, VoiceOp } from "../grammar.js";
import { stemAllowsSahenShortNegationSplit } from "../short-negation-policy.js";
import { lemmaPredicateBase, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, type KoreanPredicateBase, type OkBaseResult, type OperatorOp, type RenderContext, type RenderFailure, type RenderOutcome, withStemPrefixApplied, withWarnings } from "./base-model.js";
import { irregularFrom } from "./final-forms.js";
import { passiveStemOptionsForStem, prohibitionPredicateBase, simpleStemBase, simpleStemBaseResult } from "./base-support.js";
import { composeBaseWithRequestAttributiveQuote, composeBaseWithRequestComplement, composeRequestProhibitionAttributiveQuote, composeRequestProhibitionComplement } from "./quote-complement-compose.js";
import { predicateQuoteCarrierRestoredHost } from "./predicate-bases.js";
import { voiceBase } from "./voice-benefactive-bases.js";
import { reprojectCommandQuoteAttributiveForHeadPolicy, prohibitionUsesRequestForm, renderPoliteRequestOnPredicateBase, renderProhibition, renderRequestAttributiveQuoteFromStem } from "./command-render.js";
import { type ChainBaseResult, attributiveCommandBaseOperatorChain, attributiveCommandHeadPatternMatches, chainBases, chainStemTraceFields, collectOperatorChain, commandAttributiveAspectOp, isHeadOp, isProhibitionCommandAspectOp, isRequestCommandAspectOp, requestTerminalBaseCanCarryStemNegation, requestTerminalBaseOpForRender } from "./op-chain.js";
import { createAspectOp } from "../op-builders.js";
import type { AuxLayerOpState, AuxLayerRenderContext } from "./aux-layer-context.js";
import { renderNounCopulaImperativeTerminal } from "./noun-copula-tail-forms.js";

export function commandQuoteCarrierCommandBase(
  layer: AuxLayerNode,
  ctx: RenderContext,
  baseOps: readonly OperatorOp[],
  preNeg: NegationOp | null
): ChainBaseResult | RenderFailure {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "command quote carrier base requires verb/adj stem" };
  }
  return chainBases(
    baseOps.map(requestTerminalBaseOpForRender),
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.kind === "verb",
    {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg: preNeg,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal: ctx.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
}

export function commandQuoteCarrierTerminalBase(options: {
  readonly base: KoreanPredicateBase;
  readonly carrier: PredicateQuoteCarrierOp;
  readonly request: boolean;
  readonly preNeg: NegationOp | null;
  readonly requestForm: boolean;
}): OkBaseResult | RenderFailure {
  const complement = options.request
    ? composeBaseWithRequestComplement(options.base, false, options.preNeg, {}, options.carrier.surface)
    : composeRequestProhibitionComplement(options.base, options.carrier.surface, {
      requestForm: options.requestForm
    });
  if (!complement.ok) {
    return complement;
  }
  return {
    ok: true,
    base: {
      prefix: `${complement.text} `,
      final: predicateQuoteCarrierRestoredHost(options.carrier)
    }
  };
}

export function layerWithQuotedProhibitionBeforeCarrier(layer: AuxLayerNode, source: OpSource): AuxLayerNode {
  const carrierIndex = layer.ops.findIndex(
    (op) => op.kind === "predicateQuoteCarrier" && op.style === "compact_toiu"
  );
  const prohibition: ProhibitionAspectOp = createAspectOp({
    aspect: "naide_kudasai",
    source,
    prohibition: { kind: "naide_kudasai", polite: false, requestTail: "bare" },
  });
  return {
    ...layer,
    ops: [...layer.ops.slice(0, carrierIndex), prohibition, ...layer.ops.slice(carrierIndex)],
  };
}

export function layerWithQuotedCarrierProhibition(layer: AuxLayerNode): AuxLayerNode | null {
  const carrier = layer.ops.find(
    (op): op is PredicateQuoteCarrierOp =>
      op.kind === "predicateQuoteCarrier" &&
      op.style === "compact_toiu" &&
      op.quotedSfp?.effect === "na_prohib"
  );
  if (
    carrier?.quotedSfp === undefined ||
    layer.ops.some((op) => op.kind === "aspect" && op.aspect === "naide_kudasai")
  ) {
    return null;
  }
  const { quotedSfp: _consumedSfp, ...carrierWithoutSfp } = carrier;
  const stripped: AuxLayerNode = {
    ...layer,
    ops: layer.ops.map((op) => (op === carrier ? carrierWithoutSfp : op)),
  };
  return layerWithQuotedProhibitionBeforeCarrier(stripped, carrier.quotedSfp.source);
}

export function renderImperativeQuotativeCommand(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  void ctx;
  if (layer.stem.kind !== "verb" || layer.ops.length > 0) {
    return null;
  }
  const body = conjugate(layer.stem.lemma, irregularFrom(layer.stem.irregular), "(으)라고");
  return { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false };
}

export function renderRequestProhibitionQuoteTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular } = rc;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses, postModalPolite, connective } = state;
  const commandQuoteHeadOps = layer.ops.filter(isHeadOp);
  const commandPredicateQuoteCarrier = commandQuoteHeadOps[commandQuoteHeadOps.length - 1];
  const hasCommandPredicateQuoteCarrier =
    commandPredicateQuoteCarrier?.kind === "predicateQuoteCarrier" &&
    commandPredicateQuoteCarrier.style === "compact_toiu";
  const requestQuoteAttributiveOp = hasCommandPredicateQuoteCarrier
    ? commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp)
    : null;
  const prohibitionQuoteAttributiveOp = hasCommandPredicateQuoteCarrier
    ? commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp)
    : null;
  if (requestQuoteAttributiveOp !== null || prohibitionQuoteAttributiveOp !== null) {
    if (requestQuoteAttributiveOp !== null && prohibitionQuoteAttributiveOp !== null) {
      return { ok: false, reason: "request + prohibition predicate quote carrier composition not supported" };
    }
    if (!isVerb) {
      return { ok: false, reason: "request/prohibition predicate quote carrier requires verb stem" };
    }
    if (connective !== null || postModalNegations.length > 0 || postModalTenses.length > 0 || postModalPolite !== null) {
      return { ok: false, reason: "request/prohibition predicate quote carrier has unsupported outgoing companion op" };
    }
    const commandOp = requestQuoteAttributiveOp ?? prohibitionQuoteAttributiveOp;
    const baseOps = commandOp === null ? [] : attributiveCommandBaseOperatorChain(layer.ops, commandOp);
    if (baseOps.length > 0) {
      if (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps)) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain has unsupported companion op" };
      }
      const baseCarriesStemNegation = requestQuoteAttributiveOp !== null &&
        requestTerminalBaseCanCarryStemNegation(baseOps);
      if ((preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain stem neg/tense not supported" };
      }
      const baseRes = commandQuoteCarrierCommandBase(
        layer,
        ctx,
        baseOps,
        baseCarriesStemNegation ? preModalNeg : null
      );
      if (!baseRes.ok) {
        return { ok: false, reason: baseRes.reason };
      }
      if (baseRes.finalNeg !== null) {
        return { ok: false, reason: "request/prohibition predicate quote carrier base chain final negation not supported" };
      }
      const fused = requestQuoteAttributiveOp !== null
        ? composeBaseWithRequestAttributiveQuote(baseRes.base, baseRes.finalPast, null, {})
        : composeRequestProhibitionAttributiveQuote(baseRes.base, {
          requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition)
        });
      const rendered = (baseRes.finalPast
        ? null
        : reprojectCommandQuoteAttributiveForHeadPolicy(
          fused,
          baseRes.base,
          requestQuoteAttributiveOp !== null ? "request" : "prohibition",
          attributiveProjectionPolicy(layer),
          formal,
          { requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition) }
        )) ?? fused;
      return rendered.ok ? withStemPrefixApplied(withWarnings(rendered, warnings)) : rendered;
    }
    if (commandOp === null || !attributiveCommandHeadPatternMatches(layer.ops, commandOp, [])) {
      return { ok: false, reason: "request/prohibition predicate quote carrier has unsupported companion op" };
    }
    if (preModalTense !== null) {
      return { ok: false, reason: "request/prohibition predicate quote carrier stem tense not supported" };
    }
    const stemQuoteBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
      ? simpleStemBase(stemLemma, stemIrregular, true)
      : { ...simpleStemBase(stemLemma, stemIrregular, true), prefix: layer.stem.koreanPrefix };
    const fusedStemQuote = requestQuoteAttributiveOp !== null
      ? renderRequestAttributiveQuoteFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preNeg: preModalNeg,
        past: false,
        stemSourceTokens: layer.stem.source.tokens,
        ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
        ...(requestQuoteAttributiveOp === null ? {} : { requestSourceTokens: requestQuoteAttributiveOp.source.tokens }),
        carrierSourceTokens: layer.ops.find((op) => op.kind === "predicateQuoteCarrier")?.source.tokens ?? []
      })
      : composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, true), {
        requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition),
        ...(prohibitionQuoteAttributiveOp !== null && preModalNeg === null
          ? {
            trace: {
              stemTokens: layer.stem.source.tokens,
              negativeTokens: prohibitionQuoteAttributiveOp.source.tokens.slice(0, 1),
              bridgeTokens: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp.prohibition)
                ? prohibitionQuoteAttributiveOp.source.tokens.slice(1, 2)
                : prohibitionQuoteAttributiveOp.source.tokens.slice(1),
              requestTailTokens: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp.prohibition)
                ? prohibitionQuoteAttributiveOp.source.tokens.slice(2)
                : [],
              carrierTokens: commandPredicateQuoteCarrier?.source.tokens ?? []
            }
          }
          : {})
      });
    const rendered = (preModalNeg !== null
      ? null
      : reprojectCommandQuoteAttributiveForHeadPolicy(
        fusedStemQuote,
        stemQuoteBase,
        requestQuoteAttributiveOp !== null ? "request" : "prohibition",
        attributiveProjectionPolicy(layer),
        formal,
        { requestForm: prohibitionUsesRequestForm(prohibitionQuoteAttributiveOp?.prohibition) }
      )) ?? fusedStemQuote;
    return rendered.ok ? withWarnings(rendered, warnings) : rendered;
  }
  return null;
}

function renderPredicateCopulaImperativeProjection(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return null;
  }
  if (copula.variant !== "basic" || copula.polarity !== "affirmative" || copula.polite) {
    return null;
  }
  const projectedOps = layer.ops.slice(1).filter((op) => op.kind !== "polite");
  return renderAuxLayerImperativeTerminal({ ...layer, ops: projectedOps }, ctx);
}

function renderMakeStateChangeImperativeTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const opChain = collectOperatorChain(layer.ops);
  if (opChain.length === 0) {
    return null;
  }
  const op = opChain[opChain.length - 1]!;
  const auxKind = op.kind === "postverbAuxiliary" ? op.auxiliary.kind : null;
  let preModalNeg: NegationOp | null = null;
  if (auxKind === "scope_control" || auxKind === "adverbial_change" || auxKind === "manner_action_control") {
    preModalNeg = layer.ops.find((o): o is NegationOp => o.kind === "negation") ?? null;
  } else if (
    opChain.length === 1 &&
    layer.ops.length === opChain.length &&
    (auxKind === "make_state_change" ||
      auxKind === "make_state_change_causative" ||
      auxKind === "state_change")
  ) {
  } else {
    return null;
  }
  const baseRes = chainBases(
    opChain,
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.kind === "verb",
    {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
      preModalNeg,
      stemPast: false,
      pastAfterChainIdx: new Map(),
      negAfterChainIdx: new Map(),
      formal: ctx.formal,
      shortNegationPolicy: layer.stem.shortNegationPolicy,
      absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
      ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
      passiveStemOptions: passiveStemOptionsForStem(layer.stem)
    }
  );
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }
  if (baseRes.base.final.kind !== "lemma") {
    return { ok: false, reason: "make-state-change imperative terminal requires lemma final" };
  }
  const lastSrc = op.source.tokens[op.source.tokens.length - 1];
  const honorificNasai =
    (auxKind === "scope_control" || auxKind === "adverbial_change") &&
    lastSrc !== undefined &&
    (lastSrc.dictionaryForm === "なさる" || lastSrc.dictionaryForm === "為さる" || lastSrc.surface === "なさい");
  const ending = honorificNasai ? (ctx.formal ? "(으)십시오" : "(으)세요") : "아/어라";
  const text = `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, ending)}`;
  return { ok: true, text, polite: honorificNasai };
}

export function renderAuxLayerImperativeTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome {
  if (layer.ops[0]?.kind === "copula") {
    const copulaImperative = renderPredicateCopulaImperativeProjection(layer, ctx);
    if (copulaImperative !== null) {
      return copulaImperative;
    }
  }
  const makeStateChangeImperative = renderMakeStateChangeImperativeTerminal(layer, ctx);
  if (makeStateChangeImperative !== null) {
    return makeStateChangeImperative;
  }
  const nounCopulaImperative = renderNounCopulaImperativeTerminal(layer, ctx);
  if (nounCopulaImperative !== null) {
    return nounCopulaImperative;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "imperative terminal supports verb/adj stem only" };
  }
  const stemLemma = layer.stem.lemma;
  const stemIrr = irregularFrom(layer.stem.irregular);
  const politeProhibition = layer.ops.find((op): op is ProhibitionAspectOp =>
    op.kind === "aspect" && op.aspect === "naide_kudasai"
  );
  if (
    politeProhibition !== undefined &&
    layer.ops.some((op) => op.kind === "polite") &&
    layer.ops.every((op) => op === politeProhibition || op.kind === "polite")
  ) {
    return renderProhibition({
      stemLemma,
      stemIrregular: stemIrr,
      isVerb: layer.stem.kind === "verb",
      prohibition: politeProhibition,
      preModalNeg: null,
      past: false,
      formal: ctx.formal,
      isPolite: true,
      stemSourceTokens: layer.stem.source.tokens
    });
  }
  const imperativeNegation = layer.ops.find((op): op is NegationOp => op.kind === "negation");
  const imperativeKudasaru = layer.ops.find((op): op is BenefactiveAspectOp =>
    op.kind === "aspect" && op.aspect === "te_kudasaru"
  );
  const imperativeNegationIdx = imperativeNegation === undefined
    ? -1
    : layer.ops.indexOf(imperativeNegation);
  const imperativeVoiceOps = layer.ops.filter((op, index): op is VoiceOp =>
    op.kind === "voice" && index < imperativeNegationIdx
  );
  if (
    imperativeNegation?.chainDepth === 1 &&
    !imperativeNegation.chainPast &&
    imperativeKudasaru !== undefined &&
    layer.ops.some((op) => op.kind === "polite") &&
    layer.ops.every((op, index) =>
      op === imperativeNegation ||
      op === imperativeKudasaru ||
      op.kind === "polite" ||
      (op.kind === "voice" && index < imperativeNegationIdx)
    )
  ) {
    const hostBase = imperativeVoiceOps.length === 0
      ? { ok: true as const, base: simpleStemBase(stemLemma, stemIrr, layer.stem.kind === "verb") }
      : chainBases(
        imperativeVoiceOps,
        stemLemma,
        stemIrr,
        layer.stem.kind === "verb",
        {
          lookups: ctx.lookups,
          stemPrefix: layer.stem.koreanPrefix,
          sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
          sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
          preModalNeg: null,
          stemPast: false,
          pastAfterChainIdx: new Map(),
          negAfterChainIdx: new Map(),
          formal: ctx.formal,
          shortNegationPolicy: layer.stem.shortNegationPolicy,
          absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
          ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
          passiveStemOptions: passiveStemOptionsForStem(layer.stem)
        }
      );
    if (!hostBase.ok) return hostBase;
    const hostLemmaBase = lemmaPredicateBase(hostBase.base);
    if (hostLemmaBase === null) {
      return { ok: false, reason: "voice prohibition polite request requires lemma final" };
    }
    const base = prohibitionPredicateBase(hostLemmaBase);
    return {
      ok: true,
      text: `${base.prefix}${conjugate(
        base.final.lemma,
        base.final.irregular,
        ctx.formal ? "(으)십시오" : "(으)세요"
      )}`,
      polite: true,
      ...(imperativeVoiceOps.length === 0 ? {} : { stemPrefixApplied: true })
    };
  }
  const imperativeOpChain = collectOperatorChain(layer.ops);
  const imperativeCarryOps = layer.ops.filter((op) =>
    op.kind !== "polite" &&
    op.kind !== "classicalAuxResidue" &&
    op.kind !== "adjCopulaBridge"
  );
  if (
    imperativeOpChain.length > 0 &&
    imperativeCarryOps.length === imperativeOpChain.length &&
    imperativeCarryOps.every((op, index) => op === imperativeOpChain[index])
  ) {
    const finalImperativeOp = imperativeOpChain[imperativeOpChain.length - 1];
    const politeBenefactiveRequest =
      layer.ops.some((op) => op.kind === "polite") &&
      finalImperativeOp?.kind === "aspect" &&
      finalImperativeOp.aspect === "te_kudasaru";
    if (politeBenefactiveRequest) {
      const requestBase = imperativeOpChain.length === 1
        ? simpleStemBaseResult(stemLemma, stemIrr, layer.stem.kind === "verb")
        : chainBases(
          imperativeOpChain.slice(0, -1),
          stemLemma,
          stemIrr,
          layer.stem.kind === "verb",
          {
            lookups: ctx.lookups,
            stemPrefix: layer.stem.koreanPrefix,
            sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
            sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
            preModalNeg: null,
            stemPast: false,
            pastAfterChainIdx: new Map(),
            negAfterChainIdx: new Map(),
            formal: ctx.formal,
            shortNegationPolicy: layer.stem.shortNegationPolicy,
            absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
            passiveStemOptions: passiveStemOptionsForStem(layer.stem)
          }
        );
      const renderedRequest = renderPoliteRequestOnPredicateBase(requestBase, ctx.formal);
      return renderedRequest.ok && imperativeOpChain.length > 1
        ? { ...renderedRequest, stemPrefixApplied: true }
        : renderedRequest;
    }
    const baseRes = chainBases(
      imperativeOpChain,
      stemLemma,
      stemIrr,
      layer.stem.kind === "verb",
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        ...chainStemTraceFields(layer.stem),
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal: ctx.formal,
        shortNegationPolicy: layer.stem.shortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions: passiveStemOptionsForStem(layer.stem)
      }
    );
    if (!baseRes.ok) return baseRes;
    if (baseRes.base.final.kind !== "lemma") {
      return { ok: false, reason: "imperative operator chain requires lemma final" };
    }
    const politeImperative = layer.ops.some((op) => op.kind === "polite");
    const ending = politeImperative ? (ctx.formal ? "(으)십시오" : "(으)세요") : "아/어라";
    return {
      ok: true,
      text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, ending)}`,
      polite: politeImperative,
      stemPrefixApplied: true
    };
  }
  if (
    layer.ops.length === 1 &&
    layer.ops[0]!.kind === "voice" &&
    layer.ops[0].voice === "causative"
  ) {
    const vBase = voiceBase({
      voice: layer.ops[0],
      stemLemma,
      stemIrregular: stemIrr,
      isVerb: layer.stem.kind === "verb",
      lookups: ctx.lookups,
      sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix)
    });
    if (!vBase.ok) return vBase;
    if (vBase.base.final.kind !== "lemma") {
      return { ok: false, reason: "causative imperative on non-lemma base not supported" };
    }
    return {
      ok: true,
      text: `${vBase.base.prefix}${conjugate(vBase.base.final.lemma, vBase.base.final.irregular, "아/어라")}`,
      polite: false
    };
  }
  if (layer.ops.length === 1 && layer.ops[0]!.kind === "polite") {
    const ending = ctx.formal ? "(으)십시오" : "(으)세요";
    return {
      ok: true,
      text: conjugate(stemLemma, stemIrr, ending),
      polite: true
    };
  }
  if (layer.ops.length !== 0) {
    return { ok: false, reason: "imperative terminal with auxiliary ops not supported" };
  }
  if (layer.terminalPayload?.kind === "imperative" && layer.terminalPayload.sourceForm === "nasai") {
    return {
      ok: true,
      text: conjugate(stemLemma, stemIrr, ctx.formal ? "(으)십시오" : "(으)세요"),
      polite: true
    };
  }
  return {
    ok: true,
    text: conjugate(stemLemma, stemIrr, "아/어라"),
    polite: false
  };
}
