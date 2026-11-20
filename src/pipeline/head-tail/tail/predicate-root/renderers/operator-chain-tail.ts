import { conjugate } from "../../../../../generator/conjugator.js";
import type { Warning } from "../../../../../types/warning.js";
import { POS5A, 意志推量形_, 未然形_ } from "../../../../../types/pos.js";
import type { BenefactiveAspectOp, SimpleAspectOp, NegationOp, PoliteOp, TenseOp } from "../grammar.js";
import { shouldCarryConnectivePoliteness, teConnectiveClosesUtterance, teConnectiveClosesAsIisashi, teConnectiveClosesQuotedUtterance, isVolitionalPurposeToConnective } from "../connective-render.js";
import { policyAllowsShortNegation } from "../short-negation-policy.js";
import { applyNegationChainToLemmaBase, lemmaPredicateBase, scopeCarrierCanPreserveSourcePoliteness, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, type BaseResult, type KoreanLemmaPredicateBase, type OperatorOp, type RenderOutcome, withStemPrefixApplied, withWarnings } from "./base-model.js";
import { composeFinalForm, opSourceIsVolitional, renderBaseVolitionalConcessive, renderBaseVolitionalPurposeConnective, renderBaseVolitionalQuotative, renderBaseVolitionalTerminal, renderPredicateBaseVolitionalPoliteRegisterTerminal, renderPredicateBaseVolitionalPoliteTerminal, renderPredicateBaseVolitionalPurposeConnective, renderPredicateBaseVolitionalQuotative, renderBaseVolitionalConjectureTerminal, volitionalConcessiveEnding, volitionalMoodBearerBlocksCohortative } from "./final-forms.js";
import { simpleStemBaseResult } from "./base-support.js";
import { applyQuoteBoundaryFocus, composeBaseWithImperativeQuotative } from "./quote-complement-compose.js";
import { attachCommittedChainTrace, composeBaseWithPlainImperative, composeCommittedTailTerminal, composeContractedPastAspectTerminal } from "./predicate-terminal-compose.js";
import { composeBaseWithConjectureQuestionConnective, composeCommittedBaseWithConjectureQuestionConnective, isConjectureQuestionContinuationConnective, renderConjectureQuotativeFromStem } from "./conjecture-compose.js";
import { composeCommittedTailConnectiveWithNativeTrace, composeCommittedTailTerminalTeForm } from "./connective-compose.js";
import { composeBaseWithSfpClosedExemplification, exemplificationTakesClosedPropositionComplement } from "./connective-compose.js";
import { aspectContractsToPast } from "./aspect-bases.js";
import { renderMiseru } from "./command-render.js";
import { type ChainBaseResult, assignOperatorChainWrapSlots, chainBases, chainStemTraceFields, isSimpleAspectOpKind, operatorChainWarnings, type ChainContext } from "./op-chain.js";
import { renderChainVolitionalQuestionQuotative } from "./aspect-benefactive.js";
import { composeCommittedTailQuestionTerminal } from "./sfp-question.js";
import type { AuxLayerOpState, AuxLayerRenderContext } from "./aux-layer-context.js";
import { renderChainBenefactiveFinalForm } from "./voice-benefactive-tail.js";
import { isBenefactiveAspectKind } from "../inspect.js";

interface OperatorChainRenderScope {
  readonly rc: AuxLayerRenderContext;
  readonly state: AuxLayerOpState;
  readonly opChain: OperatorOp[];
  readonly chainCtx: ChainContext;
  readonly chainWarnings: Warning[];
  readonly isPoliteCombined: boolean;
  readonly pastAfterChainIdx: Map<number, TenseOp>;
  readonly negAfterChainIdx: Map<number, NegationOp>;
}

export interface OperatorChainFinalContext extends OperatorChainRenderScope {
  readonly baseRes: ChainBaseResult;
  readonly lastChainOp: OperatorOp | undefined;
  readonly lastBenefactive: BenefactiveAspectOp | null;
  readonly volitionalQuestionQuotative: boolean;
}

export function renderViaOperatorChain(
  rc: AuxLayerRenderContext,
  state: AuxLayerOpState,
  opChain: OperatorOp[]
): RenderOutcome {
  const { layer, ctx, warnings, past, formal, isVerb, stemLemma, stemIrregular, stemShortNegationPolicy, passiveStemOptions, stemIsCommittedAdverb } = rc;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses, preModalPolite, postModalPolite, connective } = state;
  const chainWarnings: Warning[] = [...warnings];
  const wrapSlots = assignOperatorChainWrapSlots(layer, opChain, postModalTenses, postModalNegations);
  if (!wrapSlots.ok) {
    return { ok: false, reason: wrapSlots.reason };
  }
  const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
  const chainCtx: ChainContext = {
    lookups: ctx.lookups,
    stemPrefix: layer.stem.koreanPrefix,
    ...chainStemTraceFields(layer.stem),
    ...(preModalTense === null ? {} : { stemPastSourceTokens: preModalTense.source.tokens }),
    sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
    sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
    ...(stemIsCommittedAdverb ? { adverbialStemLemma: stemLemma } : {}),
    preModalNeg, stemPast: past,
    pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx,
    formal,
    shortNegationPolicy: stemShortNegationPolicy,
    absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
    ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
    passiveStemOptions
  };
  chainWarnings.push(...operatorChainWarnings(opChain, preModalNeg));
  const isPoliteCombined = operatorChainIsPoliteCombined(opChain, preModalPolite, postModalPolite);
  const scope: OperatorChainRenderScope = {
    rc,
    state,
    opChain,
    chainCtx,
    chainWarnings,
    isPoliteCombined,
    pastAfterChainIdx,
    negAfterChainIdx
  };
  const questionTerminal = renderChainQuestionTerminal(scope);
  if (questionTerminal !== null) {
    return questionTerminal;
  }
  const conjectureQuotative = renderChainConjectureQuotativeFromStem(scope);
  if (conjectureQuotative !== null) {
    return conjectureQuotative;
  }
  const conjectureQuestion = renderChainConjectureQuestionFromStem(scope);
  if (conjectureQuestion !== null) {
    return conjectureQuestion;
  }
  const baseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, chainCtx);
  if (!baseRes.ok) {
    return { ok: false, reason: baseRes.reason };
  }
  const scopeConjectureQuestion = renderChainScopeConjectureQuestion(scope);
  if (scopeConjectureQuestion !== null) {
    return scopeConjectureQuestion;
  }
  const lastChainOp = opChain[opChain.length - 1];
  const volitionalQuestionQuotative = connective !== null &&
    connective.connective === "question_quotative" &&
    connective.surface === "かと";
  const lastBenefactive =
    opChain.length === 1 && lastChainOp !== undefined && lastChainOp.kind === "aspect" &&
      isBenefactiveAspectKind(lastChainOp.aspect)
      ? lastChainOp as BenefactiveAspectOp
      : null;
  const fc: OperatorChainFinalContext = { ...scope, baseRes, lastChainOp, lastBenefactive, volitionalQuestionQuotative };
  const volitionalFinal = renderChainVolitionalFinal(fc);
  if (volitionalFinal !== null) {
    return volitionalFinal;
  }
  const politeVolitionalQuote = renderChainPoliteVolitionalQuote(fc);
  if (politeVolitionalQuote !== null) {
    return politeVolitionalQuote;
  }
  const simpleAspectFinal = renderChainSimpleAspectFinalForm(fc);
  if (simpleAspectFinal !== null) {
    return simpleAspectFinal;
  }
  const miseruShowing = renderChainMiseruVolitionalShowing(fc);
  if (miseruShowing !== null) {
    return miseruShowing;
  }
  const benefactiveFinal = renderChainBenefactiveFinalForm(fc);
  if (benefactiveFinal !== null) {
    return benefactiveFinal;
  }
  const connectiveFinal = renderChainConnectiveFinal(fc);
  if (connectiveFinal !== null) {
    return connectiveFinal;
  }
  return withStemPrefixApplied(withWarnings(
    composeCommittedTailTerminal(baseRes, baseRes.finalNeg, baseRes.finalPast, formal, isPoliteCombined, ctx.lookups),
    chainWarnings
  ));
}

function operatorChainIsPoliteCombined(
  opChain: OperatorOp[],
  preModalPolite: PoliteOp | null,
  postModalPolite: PoliteOp | null
): boolean {
  let isPoliteCombined = preModalPolite !== null || postModalPolite !== null;
  for (const op of opChain) {
    if (op.kind === "modal" && op.polite) isPoliteCombined = true;
    else if (op.kind === "conjecture" && op.polite) isPoliteCombined = true;
    else if (op.kind === "postverbAuxiliary" && op.auxiliary.polite === true) isPoliteCombined = true;
    else if (op.kind === "idiom" && (op.idiom === "obligation" || op.idiom === "forbidden") && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "permission" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "negative_necessity_sumu" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "negative_necessity_koto_wa" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "inevitable_zaru_o_enai" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "cannot_refrain_negative_dewa_irarenai" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "method_you_ga_nai" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "wake_impossible" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "negative_necessity_made_mo" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "only_option_shika_nai" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "experience_koto_ga_aru" && op.polite) isPoliteCombined = true;
    else if (op.kind === "idiom" && op.idiom === "degree_intensifier" && op.polite) isPoliteCombined = true;
    else if (op.kind === "predicateProjectionCarrier" && op.polite === true) isPoliteCombined = true;
    else if (op.kind === "scopeBridge" && op.polite) isPoliteCombined = true;
  }
  return isPoliteCombined;
}

function renderChainQuestionTerminal(scope: OperatorChainRenderScope): RenderOutcome | null {
  const { opChain, chainCtx, chainWarnings, isPoliteCombined } = scope;
  const { ctx, formal, isVerb, stemLemma, stemIrregular } = scope.rc;
  const { connective } = scope.state;
  if (connective?.questionContentRole === "terminal") {
    const terminalBaseRes = chainBases(opChain, stemLemma, stemIrregular, isVerb, chainCtx);
    if (!terminalBaseRes.ok) {
      return { ok: false, reason: terminalBaseRes.reason };
    }
    return withStemPrefixApplied(withWarnings(
      composeCommittedTailQuestionTerminal(
        terminalBaseRes,
        terminalBaseRes.finalNeg,
        terminalBaseRes.finalPast,
        formal,
        isPoliteCombined,
        "ka",
        true,
        ctx.lookups
      ),
      chainWarnings
    ));
  }
  return null;
}

function renderChainConjectureQuotativeFromStem(scope: OperatorChainRenderScope): RenderOutcome | null {
  const { opChain, chainWarnings } = scope;
  const { ctx, past, isVerb, stemLemma, stemIrregular } = scope.rc;
  const { preModalNeg, postModalNegations, postModalTenses, connective } = scope.state;
  if (
    connective !== null &&
    connective.connective === "quotative" &&
    opChain.length === 1 &&
    opChain[0]?.kind === "conjecture" &&
    postModalNegations.length === 0 &&
    postModalTenses.length === 0 &&
    !past &&
    preModalNeg?.chainPast !== true
  ) {
    const rendered = renderConjectureQuotativeFromStem({
      stemLemma,
      stemIrregular,
      isVerb,
      preModalNeg,
      past,
      lookups: ctx.lookups
    });
    if (rendered.ok) {
      return withWarnings(rendered, chainWarnings);
    }
  }
  return null;
}

function renderChainConjectureQuestionFromStem(scope: OperatorChainRenderScope): RenderOutcome | null {
  const { opChain, chainWarnings } = scope;
  const { past, formal, isVerb, stemLemma, stemIrregular } = scope.rc;
  const { preModalNeg, postModalNegations, postModalTenses, preModalPolite, postModalPolite, connective } = scope.state;
  if (
    connective !== null &&
    isConjectureQuestionContinuationConnective(connective) &&
    opChain.length === 1 &&
    opChain[0]?.kind === "conjecture" &&
    postModalNegations.length === 0 &&
    postModalTenses.length === 0
  ) {
    const stemBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
    const stemBase = applyNegationChainToLemmaBase(
      stemBaseResult.base,
      preModalNeg,
      stemBaseResult.finalNegationOptions
    );
    if (stemBase === null) {
      return { ok: false, reason: "conjecture question connective stem chain lowering not supported" };
    }
    const rendered = composeBaseWithConjectureQuestionConnective(
      stemBase,
      connective,
      past || (preModalNeg?.chainPast ?? false),
      formal,
      opChain[0].polite || preModalPolite !== null || postModalPolite !== null
    );
    return rendered.ok ? withWarnings(rendered, chainWarnings) : rendered;
  }
  return null;
}

function renderChainScopeConjectureQuestion(scope: OperatorChainRenderScope): RenderOutcome | null {
  const { opChain, chainCtx, chainWarnings, pastAfterChainIdx, negAfterChainIdx } = scope;
  const { formal, isVerb, stemLemma, stemIrregular } = scope.rc;
  const { preModalPolite, postModalPolite, connective } = scope.state;
  if (
    connective !== null &&
    isConjectureQuestionContinuationConnective(connective) &&
    opChain.length === 2 &&
    opChain[0]?.kind === "scopeBridge" &&
    opChain[1]?.kind === "conjecture" &&
    pastAfterChainIdx.size === 0 &&
    negAfterChainIdx.size === 0
  ) {
    const scopeOnlyRes = chainBases([opChain[0]], stemLemma, stemIrregular, isVerb, chainCtx);
    if (!scopeOnlyRes.ok) {
      return { ok: false, reason: scopeOnlyRes.reason };
    }
    const scopeOnlyBaseResult: BaseResult = {
      ok: true,
      base: scopeOnlyRes.base,
      chainOnFinalSupported: scopeOnlyRes.chainOnFinalSupported,
      ...(scopeOnlyRes.finalNegationOptions === undefined
        ? {}
        : { finalNegationOptions: scopeOnlyRes.finalNegationOptions }),
      ...(scopeOnlyRes.finalNegationLoweringPolicy === undefined
        ? {}
        : { finalNegationLoweringPolicy: scopeOnlyRes.finalNegationLoweringPolicy }),
      ...(scopeOnlyRes.connectivePrefixContraction === undefined
        ? {}
        : { connectivePrefixContraction: scopeOnlyRes.connectivePrefixContraction }),
      ...(scopeOnlyRes.connectiveBaseOverride === undefined
        ? {}
        : { connectiveBaseOverride: scopeOnlyRes.connectiveBaseOverride })
    };
    const conjectureQuestionPolite =
      preModalPolite !== null ||
      postModalPolite !== null ||
      opChain[0].polite ||
      opChain[1].polite;
    const rendered = composeCommittedBaseWithConjectureQuestionConnective(
      scopeOnlyBaseResult,
      connective,
      scopeOnlyRes.finalPast,
      formal,
      conjectureQuestionPolite
    );
    return withStemPrefixApplied(withWarnings(rendered, chainWarnings));
  }
  return null;
}

function renderChainVolitionalFinal(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { chainWarnings, isPoliteCombined, baseRes, lastChainOp, lastBenefactive, volitionalQuestionQuotative } = fc;
  const { layer, ctx, formal } = fc.rc;
  const { connective } = fc.state;
  if (
    lastChainOp !== undefined &&
    lastBenefactive === null &&
    (opSourceIsVolitional(lastChainOp) ||
      volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) &&
    baseRes.finalNeg === null &&
    baseRes.finalPast === false &&
    baseRes.base.final.kind === "lemma" &&
    (baseRes.base.final.isVerb || lastChainOp.kind === "aspect")
  ) {
    const volitionalBase: KoreanLemmaPredicateBase = {
      prefix: baseRes.base.prefix,
      final: baseRes.base.final,
      ...(baseRes.base.policy === undefined ? {} : { policy: baseRes.base.policy })
    };
    if (
      connective !== null &&
      connective.surface === "と" &&
      isVolitionalPurposeToConnective(connective)
    ) {
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(
          applyQuoteBoundaryFocus(
            renderBaseVolitionalPurposeConnective(volitionalBase),
            connective.attemptFocusParticle
          ),
          baseRes
        ),
        chainWarnings
      ));
    }
    if (
      connective !== null &&
      connective.closedChainMood !== undefined &&
      exemplificationTakesClosedPropositionComplement(connective) &&
      connective.closedSfp === undefined &&
      !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)
    ) {
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(
          composeBaseWithSfpClosedExemplification(
            volitionalBase,
            connective,
            false,
            false,
            null,
            formal,
            ctx.lookups,
            {}
          ),
          baseRes
        ),
        chainWarnings
      ));
    }
    if (
      connective !== null &&
      connective.connective === "quotative" &&
      !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)
    ) {
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(
          applyQuoteBoundaryFocus(
            renderBaseVolitionalQuotative(volitionalBase),
            connective.quoteBoundary?.focusParticle
          ),
          baseRes
        ),
        chainWarnings
      ));
    }
    if (volitionalQuestionQuotative && !volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) {
      const question = renderChainVolitionalQuestionQuotative(volitionalBase);
      if (question.ok) {
        return withStemPrefixApplied(withWarnings(attachCommittedChainTrace(question, baseRes), chainWarnings));
      }
    }
    if (connective === null) {
      if (volitionalMoodBearerBlocksCohortative(layer.stem, lastChainOp)) {
        return withStemPrefixApplied(withWarnings(
          attachCommittedChainTrace(
            renderBaseVolitionalConjectureTerminal(volitionalBase, isPoliteCombined),
            baseRes
          ),
          chainWarnings
        ));
      }
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(renderBaseVolitionalTerminal(volitionalBase), baseRes),
        chainWarnings
      ));
    }
    const chainConcessiveEnding = volitionalConcessiveEnding(connective);
    if (chainConcessiveEnding !== null) {
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(
          renderBaseVolitionalConcessive(volitionalBase, chainConcessiveEnding),
          baseRes
        ),
        chainWarnings
      ));
    }
  }
  return null;
}

function renderChainPoliteVolitionalQuote(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { chainWarnings, baseRes, lastChainOp, lastBenefactive, volitionalQuestionQuotative } = fc;
  const { postModalPolite, connective } = fc.state;
  if (
    lastChainOp !== undefined &&
    lastChainOp.kind === "aspect" &&
    lastBenefactive === null &&
    connective !== null &&
    connective.surface === "と" &&
    (connective.connective === "quotative" || isVolitionalPurposeToConnective(connective)) &&
    postModalPolite !== null &&
    ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
    baseRes.finalNeg === null &&
    !baseRes.finalPast
  ) {
    const rendered = connective.connective === "quotative"
      ? applyQuoteBoundaryFocus(
        renderPredicateBaseVolitionalQuotative(baseRes.base),
        connective.quoteBoundary?.focusParticle
      )
      : renderPredicateBaseVolitionalPurposeConnective(baseRes.base);
    return withStemPrefixApplied(withWarnings(rendered, chainWarnings));
  }
  if (
    lastChainOp !== undefined &&
    lastChainOp.kind === "aspect" &&
    lastBenefactive === null &&
    volitionalQuestionQuotative &&
    postModalPolite !== null &&
    ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
    baseRes.finalNeg === null &&
    !baseRes.finalPast
  ) {
    const lemmaBase = lemmaPredicateBase(baseRes.base);
    const question = lemmaBase === null ? null : renderChainVolitionalQuestionQuotative(lemmaBase);
    if (question?.ok === true) {
      return withStemPrefixApplied(withWarnings(question, chainWarnings));
    }
  }
  return null;
}

function renderChainSimpleAspectFinalForm(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { opChain, chainWarnings, isPoliteCombined, pastAfterChainIdx, baseRes, lastChainOp } = fc;
  const { ctx, formal, stemShortNegationPolicy } = fc.rc;
  const { postModalPolite, connective } = fc.state;
  const lastSimpleAspect =
    lastChainOp !== undefined && lastChainOp.kind === "aspect" &&
      isSimpleAspectOpKind(lastChainOp.aspect)
      ? lastChainOp as SimpleAspectOp
      : null;
  if (lastSimpleAspect !== null && connective === null) {
    const lastAuxToken = lastSimpleAspect.source.tokens[lastSimpleAspect.source.tokens.length - 1];
    const lastAuxPos5A = (lastAuxToken?.pos ?? 0) & POS5A;
    if (
      lastAuxPos5A === 未然形_ &&
      baseRes.finalNeg === null &&
      baseRes.base.final.kind === "lemma"
    ) {
      return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
        ok: true,
        text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, "지")}`,
        polite: isPoliteCombined
      }, baseRes), chainWarnings));
    }
    if (opSourceIsVolitional(lastSimpleAspect)) {
      return { ok: false, reason: "simple aspect volitional + chain/tense composition not yet supported" };
    }
    if (lastSimpleAspect.terminalMood === "imperative") {
      if (baseRes.finalNeg !== null || baseRes.finalPast || isPoliteCombined) {
        return { ok: false, reason: "simple aspect imperative + chain/tense/polite composition not yet supported" };
      }
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(composeBaseWithPlainImperative(baseRes.base, ctx.formal), baseRes),
        chainWarnings
      ));
    }
    if (
      postModalPolite !== null &&
      ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_ &&
      baseRes.finalNeg === null &&
      !baseRes.finalPast
    ) {
      const rendered = lastSimpleAspect.semantic?.renderStrategy === "drop_aux"
        ? renderPredicateBaseVolitionalPoliteRegisterTerminal(baseRes.base, formal)
        : renderPredicateBaseVolitionalPoliteTerminal(baseRes.base);
      return withStemPrefixApplied(withWarnings(attachCommittedChainTrace(rendered, baseRes), chainWarnings));
    }
    if (
      lastSimpleAspect.semantic?.renderStrategy === "drop_aux" &&
      baseRes.finalNeg !== null &&
      baseRes.finalNeg.chainDepth === 1 &&
      (baseRes.finalNeg.preferShortNegation || policyAllowsShortNegation(stemShortNegationPolicy)) &&
      baseRes.base.final.kind === "lemma" &&
      baseRes.base.final.isVerb
    ) {
      const finalStem = composeFinalForm(
        baseRes.base.final.lemma,
        baseRes.base.final.irregular,
        true,
        baseRes.finalPast || baseRes.finalNeg.chainPast,
        formal,
        isPoliteCombined,
        ctx.lookups
      );
      return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
        ok: true,
        text: `${baseRes.base.prefix}안 ${finalStem}`,
        polite: isPoliteCombined
      }, baseRes), chainWarnings));
    }
    if (aspectContractsToPast(lastSimpleAspect) && baseRes.finalNeg === null) {
      const explicitPast = pastAfterChainIdx.get(opChain.length - 1) !== undefined;
      return withStemPrefixApplied(withWarnings(
        composeContractedPastAspectTerminal(baseRes, explicitPast, formal, isPoliteCombined, ctx.lookups),
        chainWarnings
      ));
    }
  }
  return null;
}

function renderChainMiseruVolitionalShowing(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { opChain, chainWarnings, isPoliteCombined, baseRes, lastChainOp } = fc;
  const { ctx, formal, isVerb, stemLemma, stemIrregular } = fc.rc;
  const { connective } = fc.state;
  if (
    opChain.length === 1 &&
    lastChainOp !== undefined &&
    lastChainOp.kind === "aspect" &&
    lastChainOp.aspect === "te_miseru" &&
    connective === null &&
    baseRes.finalNeg === null &&
    lastChainOp.semantic?.reading === "volitional_showing"
  ) {
    return withWarnings(renderMiseru({
      stemLemma,
      stemIrregular,
      isVerb,
      miseru: lastChainOp,
      preModalNeg: null,
      past: baseRes.finalPast,
      formal,
      isPolite: isPoliteCombined,
      lookups: ctx.lookups
    }), chainWarnings);
  }
  return null;
}

function renderChainConnectiveFinal(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { chainWarnings, isPoliteCombined, baseRes } = fc;
  const { ctx, formal, terminalTeFormConnective } = fc.rc;
  const { connective } = fc.state;
  if (connective !== null) {
    if (
      connective.connective === "quotative" &&
      connective.quotativeMood === "imperative" &&
      baseRes.finalNeg === null &&
      !baseRes.finalPast
    ) {
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(composeBaseWithImperativeQuotative(baseRes.base), baseRes),
        chainWarnings
      ));
    }
    const connectivePolite =
      isPoliteCombined &&
      (shouldCarryConnectivePoliteness(ctx) ||
        scopeCarrierCanPreserveSourcePoliteness(baseRes.base, connective));
    if (terminalTeFormConnective) {
      return withStemPrefixApplied(withWarnings(
        composeCommittedTailTerminalTeForm(
          baseRes,
          connective,
          baseRes.finalPast,
          baseRes.finalNeg,
          formal,
          ctx.lookups,
          teConnectiveClosesUtterance(connective, ctx) || teConnectiveClosesQuotedUtterance(connective, ctx),
          teConnectiveClosesAsIisashi(connective, ctx)
        ),
        chainWarnings
      ));
    }
    const renderedConnective = composeCommittedTailConnectiveWithNativeTrace(
      baseRes,
      connective,
      baseRes.finalPast,
      connectivePolite,
      baseRes.finalNeg,
      formal,
      isPoliteCombined,
      ctx.lookups
    );
    return withStemPrefixApplied(withWarnings(renderedConnective, chainWarnings));
  }
  return null;
}
