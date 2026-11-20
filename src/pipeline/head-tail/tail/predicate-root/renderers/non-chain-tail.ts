import { conjugate } from "../../../../../generator/conjugator.js";
import { POS01, POS5A, 意志推量形_, 助詞_接続助詞, 命令形_, 連用形_ } from "../../../../../types/pos.js";
import { attributiveProjectionPolicy } from "../attributive-head-policy.js";
import { quotedMoodForClosingSfpEffect, type ConnectiveOp, type NegationOp } from "../grammar.js";
import { connectiveForRender, shouldCarryConnectivePoliteness, teConnectiveClosesUtterance, teConnectiveClosesAsIisashi, teConnectiveClosesQuotedUtterance, isVolitionalPurposeToConnective } from "../connective-render.js";
import { stemAllowsSahenShortNegationSplit } from "../short-negation-policy.js";
import { applyNegationChainToLemmaBase, closeChainTraceAgainstText, closeChainTraceWithConnectivePieces, scopeCarrierCanPreserveSourcePoliteness, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, tracedSeg, type BaseResult, type ChainSourceTrace, type RenderOutcome, withStemPrefixApplied, withWarnings } from "./base-model.js";
import { composeFinalForm, renderBaseVolitionalQuotative, renderVolitional, renderVolitionalPurposeConnective, renderVolitionalQuestionAlternative, renderVolitionalQuestionContent, renderVolitionalQuestionQuotative, renderVolitionalQuestionReformulation, renderVolitionalQuotedQuestionContent, renderBaseVolitionalConjectureTerminal, volitionalConcessiveEnding, volitionalMoodBearerBlocksCohortative } from "./final-forms.js";
import { nounCopulaBase, simpleStemBase, simpleStemBaseResult } from "./base-support.js";
import { applyQuoteBoundaryFocus, applyRequestComplementQuoteFocus, composeBaseWithRequestAttributiveQuote, composeBaseWithRequestComplement, composeRequestProhibitionAttributiveQuote, composeRequestProhibitionComplement, isRequestComplementLikeConnective } from "./quote-complement-compose.js";
import { composeBaseWithConnective, composeCommittedTailConnective, composeCommittedTailTerminalTeForm } from "./connective-compose.js";
import { composeBaseWithTerminal, composeCommittedTailTerminal } from "./predicate-terminal-compose.js";
import { composeBaseWithSfpClosedExemplification, exemplificationTakesClosedPropositionComplement } from "./connective-compose.js";
import { voiceBase } from "./voice-benefactive-bases.js";
import { reprojectCommandQuoteAttributiveForHeadPolicy, prohibitionUsesRequestForm, renderProhibition, renderProhibitionOnPredicateBase, renderRequest, renderRequestAttributiveQuoteFromStem, renderRequestComplementFromStem, renderRequestOnPredicateBase } from "./command-render.js";
import { chainBases, requestBaseCanUseDirectAuxiliaryImperative, requestTerminalBaseCanCarryStemNegation, requestTerminalBaseOpForRender } from "./op-chain.js";
import { composeCommittedTailQuestionTerminal } from "./sfp-question.js";
import type { AuxLayerOpState, AuxLayerRenderContext } from "./aux-layer-context.js";
import { renderNonChainVoiceTerminal } from "./voice-benefactive-tail.js";
import { simpleHostChainSourceTrace, longNegationChainTrace, longNegationTraceParts, withSimpleHostTraced } from "./tail-host-trace.js";

function isBareTeRequestComplementConnective(connective: ConnectiveOp): boolean {
  if (connective.connective !== "request_complement") {
    return false;
  }
  const first = connective.source.tokens[0];
  return first !== undefined &&
    (first.pos & POS01) === 助詞_接続助詞 &&
    (first.surface === "て" || first.surface === "で");
}

interface NonChainConnectiveContext {
  readonly rc: AuxLayerRenderContext;
  readonly state: AuxLayerOpState;
  readonly connective: ConnectiveOp;
  readonly stemFormPos5A: number;
  readonly stemMoodIsVolitional: boolean;
  readonly isVolitionalStem: boolean;
  readonly volitionalMoodStem: boolean;
}


export function renderNonChainTail(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome {
  const { postModalNegations, postModalTenses, obligation, modal, conjecture, desire, potentialKotoGaDekiru, connective } = state;

  if (postModalNegations.length > 1 || postModalTenses.length > 1) {
    return { ok: false, reason: "multiple post-reference wrap ops require operator-chain dispatcher" };
  }

  if (connective !== null) {
    return renderNonChainConnective(rc, state, connective);
  }

  if (conjecture !== null) {
    return { ok: false, reason: "conjecture outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }

  if (desire !== null) {
    return { ok: false, reason: "desire outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }
  const voiceTerminal = renderNonChainVoiceTerminal(rc, state);
  if (voiceTerminal !== null) {
    return voiceTerminal;
  }

  if (potentialKotoGaDekiru !== null) {
    return { ok: false, reason: "potential_koto_ga_dekiru outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }

  const volitionalTerminal = renderNonChainVolitionalTerminal(rc, state);
  if (volitionalTerminal !== null) {
    return volitionalTerminal;
  }

  if (obligation !== null) {
    return { ok: false, reason: "obligation outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }

  const requestTerminal = renderRequestTerminalBaseTerminal(rc, state);
  if (requestTerminal !== null) {
    return requestTerminal;
  }
  const prohibitionTerminal = renderProhibitionTerminalBaseTerminal(rc, state);
  if (prohibitionTerminal !== null) {
    return prohibitionTerminal;
  }

  const aspectFamilyTerminal = renderNonChainAspectFamilyTerminal(rc, state);
  if (aspectFamilyTerminal !== null) {
    return aspectFamilyTerminal;
  }

  if (modal !== null) {
    return { ok: false, reason: "modal outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }

  return renderNonChainSimpleTerminal(rc, state);
}

function renderNonChainConnective(
  rc: AuxLayerRenderContext,
  state: AuxLayerOpState,
  connective: ConnectiveOp
): RenderOutcome {
  const { layer, ctx, warnings, past, formal, isVerb, stemLemma, stemIrregular, terminalTeFormConnective } = rc;
  const { preModalNeg, preModalPolite, postModalPolite } = state;
  if (connective.questionContentRole === "terminal") {
    const baseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
    return withStemPrefixApplied(withWarnings(
      composeCommittedTailQuestionTerminal(
        baseResult,
        preModalNeg,
        past,
        formal,
        preModalPolite !== null || postModalPolite !== null,
        "ka",
        false,
        ctx.lookups
      ),
      warnings
    ));
  }
  const stemFormPos5A = (layer.stem.source.tokens[layer.stem.conjugationAnchor]?.pos ?? 0) & POS5A;
  const stemMoodIsVolitional = stemFormPos5A === 意志推量形_ ||
    layer.stem.stemMood === "volitional";
  const isVolitionalStem = stemFormPos5A === 意志推量形_ ||
    (preModalPolite !== null &&
      ((preModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_);
  const volitionalMoodStem = isVolitionalStem || stemMoodIsVolitional;
  const ncc: NonChainConnectiveContext = {
    rc,
    state,
    connective,
    stemFormPos5A,
    stemMoodIsVolitional,
    isVolitionalStem,
    volitionalMoodStem
  };
  if (volitionalMoodStem) {
    const volitional = renderNonChainVolitionalConnective(ncc);
    if (volitional !== null) {
      return volitional;
    }
  }

  const imperativeQuote = renderImperativeStemQuoteConnective(ncc);
  if (imperativeQuote !== null) {
    return imperativeQuote;
  }

  const bareTeRequestQuote = renderBareTeRequestQuoteConnective(ncc);
  if (bareTeRequestQuote !== null) {
    return bareTeRequestQuote;
  }

  let connectiveBaseResult: BaseResult | null = null;
  const basePast = past;
  const baseIsPolite = preModalPolite !== null;
  const basePreNeg: NegationOp | null = preModalNeg;

  const requestTerminalBaseComplement = renderRequestTerminalBaseComplement(ncc);
  if (requestTerminalBaseComplement !== null) {
    return requestTerminalBaseComplement;
  }

  const stemCommandComplement = renderStemCommandRequestComplement(ncc);
  if (stemCommandComplement !== null) {
    return stemCommandComplement;
  }

  const opCascade = renderNonChainConnectiveOpCascade(ncc);
  if (opCascade !== null) {
    return opCascade;
  }
  connectiveBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
  if (connectiveBaseResult === null) {
    return { ok: false, reason: "connective base invariant violation" };
  }
  const connectivePolite =
    baseIsPolite &&
    (shouldCarryConnectivePoliteness(ctx) ||
      (connectiveBaseResult.ok &&
        scopeCarrierCanPreserveSourcePoliteness(connectiveBaseResult.base, connective)));
  const tracedConnectiveBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
    traceNonChainConnectiveBase(ncc, connectiveBaseResult);
  if (terminalTeFormConnective) {
    return withWarnings(
      composeCommittedTailTerminalTeForm(
        tracedConnectiveBaseResult,
        connective,
        basePast,
        basePreNeg,
        formal,
        ctx.lookups,
        teConnectiveClosesUtterance(connective, ctx) || teConnectiveClosesQuotedUtterance(connective, ctx),
        teConnectiveClosesAsIisashi(connective, ctx)
      ),
      warnings
    );
  }
  const renderedConnective = composeCommittedTailConnective(
    tracedConnectiveBaseResult, connective, basePast, connectivePolite, basePreNeg, formal, ctx.lookups
  );
  if (
    renderedConnective.ok &&
    renderedConnective.traced === undefined &&
    connective.connective !== "te_form" &&
    connective.connective !== "simultaneous" &&
    connective.connective !== "predicate_projection_tame_gerund" &&
    connective.connective !== "adversative"
  ) {
    const attached = (tracedConnectiveBaseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace;
    if (attached !== undefined && preModalNeg === null) {
      const closed = closeChainTraceAgainstText(
        {
          ...attached,
          finalSourceTokens: [...attached.finalSourceTokens, ...connective.source.tokens]
        },
        renderedConnective.text
      );
      if (closed !== null) {
        return withWarnings({ ...renderedConnective, traced: closed }, warnings);
      }
    }
    if (attached !== undefined && preModalNeg !== null) {
      const closed = closeChainTraceWithConnectivePieces(attached, renderedConnective.text, connective);
      if (closed !== null) {
        return withWarnings({ ...renderedConnective, traced: closed }, warnings);
      }
    }
  }
  return withWarnings(renderedConnective, warnings);
}

function renderNonChainVolitionalConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const branch1 = renderVolitionalRetrospectiveQuestionConnective(ncc);
  if (branch1 !== null) {
    return branch1;
  }
  const branch2 = renderVolitionalQuestionContentConnective(ncc);
  if (branch2 !== null) {
    return branch2;
  }
  const branch3 = renderVolitionalQuestionAlternativeConnective(ncc);
  if (branch3 !== null) {
    return branch3;
  }
  const branch4 = renderVolitionalCohortativeQuotativeConnective(ncc);
  if (branch4 !== null) {
    return branch4;
  }
  const branch5 = renderPoliteVolitionalQuotativeConnective(ncc);
  if (branch5 !== null) {
    return branch5;
  }
  const branch6 = renderVolitionalPurposeToConnective(ncc);
  if (branch6 !== null) {
    return branch6;
  }
  const branch7 = renderVolitionalGaConcessiveConnective(ncc);
  if (branch7 !== null) {
    return branch7;
  }
  const branch8 = renderPoliteVolitionalFutureClauseConnective(ncc);
  if (branch8 !== null) {
    return branch8;
  }
  const branch9 = renderVolitionalBoundNominalReasonConnective(ncc);
  if (branch9 !== null) {
    return branch9;
  }
  const branch10 = renderVolitionalSfpClosedExemplificationConnective(ncc);
  if (branch10 !== null) {
    return branch10;
  }
  const branch11 = renderVolitionalExemplificationConnective(ncc);
  if (branch11 !== null) {
    return branch11;
  }
  const branch12 = renderVolitionalConcessiveConnective(ncc);
  if (branch12 !== null) {
    return branch12;
  }
  const branch13 = renderVolitionalDegreeExtentConnective(ncc);
  if (branch13 !== null) {
    return branch13;
  }
  const branch14 = renderVolitionalQuotativeMannerSimileConnective(ncc);
  if (branch14 !== null) {
    return branch14;
  }
  const { isVolitionalStem } = ncc;
  if (isVolitionalStem) {
    return { ok: false, reason: `volitional + connective not yet supported` };
  }
  return null;
}

function renderVolitionalRetrospectiveQuestionConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { ctx, warnings, formal, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.connective === "retrospective_quotative" &&
    connective.retrospectiveQuotativeFlavor === "question_retrospective" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(composeCommittedTailConnective(
      simpleStemBaseResult(stemLemma, stemIrregular, true),
      connective,
      false,
      false,
      null,
      formal,
      ctx.lookups
    ), warnings);
  }
  return null;
}

function renderVolitionalQuestionContentConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, volitionalMoodStem } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  const volitionalQuestionContentConnective =
    (
      (
        connective.connective === "question_content" ||
        connective.connective === "question_quotative" ||
        connective.connective === "alternative"
      ) &&
      connective.surface === "か"
    ) ||
    (connective.connective === "question_quotative" && connective.surface === "かと") ||
    connective.connective === "question_reformulation";
  const volitionalQuestionContentHost = isVerb ||
    (layer.stem.kind === "adj" &&
      ((connective.connective === "question_quotative" && connective.surface === "かと") ||
        connective.connective === "question_reformulation"));
  if (
    volitionalMoodStem &&
    volitionalQuestionContentConnective &&
    volitionalQuestionContentHost &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const rendered = connective.connective === "question_quotative" && connective.surface === "かと"
      ? renderVolitionalQuestionQuotative({
        stemLemma,
        stemIrregular
      })
      : connective.connective === "question_reformulation"
        ? renderVolitionalQuestionReformulation({ stemLemma, stemIrregular })
      : connective.quotedQuestionContext === true
        ? renderVolitionalQuotedQuestionContent({
          stemLemma,
          stemIrregular
        })
        : renderVolitionalQuestionContent({
          stemLemma,
          stemIrregular
        });
    return withStemPrefixApplied(withWarnings(rendered, warnings));
  }
  return null;
}

function renderVolitionalQuestionAlternativeConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    !volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
    preModalPolite === null &&
    connective.connective === "question_content_alternative" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withStemPrefixApplied(withWarnings(
      renderVolitionalQuestionAlternative({ stemLemma, stemIrregular }),
      warnings
    ));
  }
  return null;
}

function renderVolitionalCohortativeQuotativeConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    !volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
    preModalPolite === null &&
    connective.connective === "quotative" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(applyQuoteBoundaryFocus(renderBaseVolitionalQuotative({
      prefix: layer.stem.koreanPrefix ?? "",
      final: {
        kind: "lemma",
        lemma: stemLemma,
        irregular: stemIrregular,
        isVerb: true
      }
    }), connective.quoteBoundary?.focusParticle), warnings);
  }
  return null;
}

function renderPoliteVolitionalQuotativeConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    preModalPolite !== null &&
    connective.connective === "quotative" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(applyQuoteBoundaryFocus(renderBaseVolitionalQuotative({
      prefix: layer.stem.koreanPrefix ?? "",
      final: {
        kind: "lemma",
        lemma: stemLemma,
        irregular: stemIrregular,
        isVerb: true
      }
    }), connective.quoteBoundary?.focusParticle), warnings);
  }
  return null;
}

function renderVolitionalPurposeToConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.surface === "と" &&
    isVolitionalPurposeToConnective(connective) &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(applyQuoteBoundaryFocus(renderVolitionalPurposeConnective({
      stemLemma,
      stemIrregular
    }), connective.attemptFocusParticle), warnings);
  }
  return null;
}

function renderVolitionalGaConcessiveConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.surface === "が" &&
    (isVerb || layer.stem.kind === "adj") &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const gaConcessiveEnding = volitionalConcessiveEnding(connective);
    if (gaConcessiveEnding !== null) {
      return withWarnings({
        ok: true,
        text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, gaConcessiveEnding)}`,
        polite: false
      }, warnings);
    }
  }
  return null;
}

function renderPoliteVolitionalFutureClauseConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    preModalPolite !== null &&
    (connective.connective === "listing" ||
      connective.connective === "reason" ||
      connective.connective === "adversative") &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const futureProposition = `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "ㄹ/을")} 것`;
    return withWarnings(composeCommittedTailConnective(
      { ok: true, base: nounCopulaBase(futureProposition, true), chainOnFinalSupported: true },
      connectiveForRender(connective, ctx),
      false,
      false,
      null,
      formal,
      ctx.lookups
    ), warnings);
  }
  return null;
}

function renderVolitionalBoundNominalReasonConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.connective === "bound_nominal_reason" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const proposal = conjugate(stemLemma, stemIrregular, "자");
    return withWarnings({
      ok: true,
      text: `${layer.stem.koreanPrefix ?? ""}${proposal}는 것으로`,
      polite: false
    }, warnings);
  }
  return null;
}

function renderVolitionalSfpClosedExemplificationConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    connective.connective === "exemplification" &&
    connective.closedSfp !== undefined &&
    (quotedMoodForClosingSfpEffect(connective.closedSfp.effect) ?? connective.closedChainMood) === "volitional" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(composeBaseWithConnective(
      {
        prefix: layer.stem.koreanPrefix ?? "",
        final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
      },
      connective,
      false,
      false,
      null,
      formal,
      ctx.lookups
    ), warnings);
  }
  return null;
}

function renderVolitionalExemplificationConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.connective === "exemplification" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    if (connective.closedChainMood !== undefined && exemplificationTakesClosedPropositionComplement(connective)) {
      return withWarnings(composeBaseWithSfpClosedExemplification(
        {
          prefix: layer.stem.koreanPrefix ?? "",
          final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
        },
        connective,
        false,
        false,
        null,
        formal,
        ctx.lookups,
        {}
      ), warnings);
    }
    return withWarnings({
      ok: true,
      text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "(으)려는")} 따위`,
      polite: false
    }, warnings);
  }
  return null;
}

function renderVolitionalConcessiveConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  const stemConcessiveEnding = volitionalConcessiveEnding(connective);
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    stemConcessiveEnding !== null &&
    (isVerb || layer.stem.kind === "adj") &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings({
      ok: true,
      text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, stemConcessiveEnding)}`,
      polite: false
    }, warnings);
  }
  return null;
}

function renderVolitionalDegreeExtentConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemMoodIsVolitional } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemMoodIsVolitional &&
    preModalPolite === null &&
    connective.connective === "predicate_projection_degree_extent" &&
    isVerb &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const degreeSuffix = connective.surface.endsWith("に")
      ? "싶을 정도로"
      : connective.surface.endsWith("の")
        ? "싶을 정도의"
        : "싶을 정도";
    return withWarnings({
      ok: true,
      text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "자")} ${degreeSuffix}`,
      polite: false
    }, warnings);
  }
  return null;
}

function renderVolitionalQuotativeMannerSimileConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemFormPos5A, stemMoodIsVolitional, isVolitionalStem } = ncc;
  const { layer, warnings, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  const quotativeVolitionalCarrier = (stemMoodIsVolitional && preModalPolite === null) ||
    (!stemMoodIsVolitional && isVolitionalStem && stemFormPos5A !== 意志推量形_);
  if (
    quotativeVolitionalCarrier &&
    isVerb &&
    (connective.connective === "predicate_projection_quotative_manner_simile" ||
      connective.connective === "predicate_projection_quotative_manner_simile_attributive") &&
    quotedMoodForClosingSfpEffect(connective.closedSfp?.effect) !== "imperative" &&
    connective.quotativeMood !== "imperative" &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const simileSuffix =
      connective.connective === "predicate_projection_quotative_manner_simile_attributive"
        ? "듯한"
        : "듯이";
    if (
      connective.quotativeMood === "interrogative" ||
      quotedMoodForClosingSfpEffect(connective.closedSfp?.effect) === "interrogative"
    ) {
      const question = renderVolitionalQuotedQuestionContent({ stemLemma, stemIrregular });
      return withWarnings(question.ok
        ? { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${question.text} 하는 ${simileSuffix}`, polite: false }
        : question, warnings);
    }
    return withWarnings({
      ok: true,
      text: `${layer.stem.koreanPrefix ?? ""}${conjugate(stemLemma, stemIrregular, "자")}는 ${simileSuffix}`,
      polite: false
    }, warnings);
  }
  return null;
}

function renderImperativeStemQuoteConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemFormPos5A } = ncc;
  const { layer, warnings, past, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemFormPos5A === 命令形_ &&
    isVerb &&
    !past &&
    (connective.connective === "quotative" || isRequestComplementLikeConnective(connective)) &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const ending = connective.quoteBoundary?.koreanClauseForm === "달라는 말을"
      ? "(으)라는 말을"
      : "(으)라고";
    const body = conjugate(stemLemma, stemIrregular, ending);
    return withWarnings(
      applyRequestComplementQuoteFocus(
        { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false },
        connective
      ),
      warnings
    );
  }
  return null;
}

function renderBareTeRequestQuoteConnective(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective, stemFormPos5A } = ncc;
  const { layer, warnings, past, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    stemFormPos5A === 連用形_ &&
    isVerb &&
    !past &&
    isBareTeRequestComplementConnective(connective) &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    const ending = connective.quoteBoundary?.koreanClauseForm === "달라는 말을"
      ? "(으)라는 말을"
      : "(으)라고";
    const body = conjugate(stemLemma, stemIrregular, ending);
    return withWarnings(
      applyRequestComplementQuoteFocus(
        { ok: true, text: `${layer.stem.koreanPrefix ?? ""}${body}`, polite: false },
        connective
      ),
      warnings
    );
  }
  return null;
}

function renderRequestTerminalBaseComplement(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular, stemShortNegationPolicy, passiveStemOptions, requestTerminalBaseOps, requestTerminalBasePath } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, potentialKotoGaDekiru, benefactive, request, prohibition, desiderative } = ncc.state;
  if (
    request !== null &&
    requestTerminalBasePath &&
    (
      isRequestComplementLikeConnective(connective) ||
      connective.connective === "quotative" ||
      connective.connective === "predicate_projection_quote_attributive"
    )
  ) {
    if (
      modal !== null || conjecture !== null ||
      potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
      benefactive !== null || prohibition !== null || desiderative !== null ||
      preModalNeg !== null || preModalTense !== null ||
      postModalNeg !== null || postModalTense !== null || postModalPolite !== null
    ) {
      return { ok: false, reason: "request terminal base + request complement has unsupported companion op" };
    }
    const baseRes = chainBases(
      requestTerminalBaseOps.map(requestTerminalBaseOpForRender),
      stemLemma,
      stemIrregular,
      isVerb,
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal,
        shortNegationPolicy: stemShortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions
      }
    );
    if (!baseRes.ok) {
      return { ok: false, reason: baseRes.reason };
    }
    const fused = connective.connective === "predicate_projection_quote_attributive"
      ? composeBaseWithRequestAttributiveQuote(baseRes.base, false, null, {})
      : composeBaseWithRequestComplement(baseRes.base, false, null, {}, connective);
    const rendered = (connective.connective === "predicate_projection_quote_attributive"
      ? reprojectCommandQuoteAttributiveForHeadPolicy(
        fused,
        baseRes.base,
        "request",
        attributiveProjectionPolicy(layer),
        formal
      )
      : null) ?? fused;
    return rendered.ok ? withStemPrefixApplied(withWarnings(rendered, warnings)) : rendered;
  }
  return null;
}

function renderStemCommandRequestComplement(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular, passiveStemOptions } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (
    isRequestComplementLikeConnective(connective) ||
    ((request !== null || prohibition !== null) && (connective.connective === "quotative" || connective.connective === "predicate_projection_quote_attributive"))
  ) {
    if (prohibition !== null) {
      if (
        modal !== null || voice !== null || conjecture !== null ||
        potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
        aspect !== null || benefactive !== null || request !== null || desiderative !== null ||
        miseru !== null ||
        preModalNeg !== null || preModalTense !== null ||
        postModalNeg !== null || postModalTense !== null || postModalPolite !== null
      ) {
        return { ok: false, reason: "prohibition + request complement has unsupported companion op" };
      }
      const fused = connective.connective === "predicate_projection_quote_attributive"
        ? composeRequestProhibitionAttributiveQuote(simpleStemBase(stemLemma, stemIrregular, isVerb), {
          requestForm: prohibitionUsesRequestForm(prohibition.prohibition)
        })
        : composeRequestProhibitionComplement(
          simpleStemBase(stemLemma, stemIrregular, isVerb),
          connective,
          { requestForm: prohibitionUsesRequestForm(prohibition.prohibition) }
        );
      const rendered = (connective.connective === "predicate_projection_quote_attributive"
        ? reprojectCommandQuoteAttributiveForHeadPolicy(
          fused,
          simpleStemBase(stemLemma, stemIrregular, isVerb),
          "prohibition",
          attributiveProjectionPolicy(layer),
          formal,
          { requestForm: prohibitionUsesRequestForm(prohibition.prohibition) }
        )
        : null) ?? fused;
      return rendered.ok ? withWarnings(rendered, warnings) : rendered;
    }
    if (request !== null && voice !== null) {
      if (
        modal !== null || conjecture !== null ||
        potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
        aspect !== null || benefactive !== null || prohibition !== null || desiderative !== null ||
        miseru !== null ||
        preModalNeg !== null || preModalTense !== null ||
        postModalNeg !== null || postModalTense !== null || postModalPolite !== null
      ) {
        return { ok: false, reason: "voice + request complement has unsupported companion op" };
      }
      const voiceResult = voiceBase({ voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups: ctx.lookups, sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix) });
      if (!voiceResult.ok) {
        return { ok: false, reason: voiceResult.reason };
      }
      const rendered = connective.connective === "predicate_projection_quote_attributive"
        ? composeBaseWithRequestAttributiveQuote(voiceResult.base, false, null, {})
        : composeBaseWithRequestComplement(voiceResult.base, false, null, {}, connective);
      return rendered.ok ? withWarnings(rendered, warnings) : rendered;
    }
  }
  return null;
}

function renderNonChainConnectiveOpCascade(ncc: NonChainConnectiveContext): RenderOutcome | null {
  const { connective } = ncc;
  const { layer, warnings, past, isVerb, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = ncc.state;
  if (aspect !== null) {
    return { ok: false, reason: "aspect + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (desire !== null) {
    return { ok: false, reason: "desire + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (modal !== null) {
    return { ok: false, reason: "modal + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (voice !== null) {
    return { ok: false, reason: "voice + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (obligation !== null) {
    return { ok: false, reason: "obligation + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (conjecture !== null) {
    return { ok: false, reason: "conjecture + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (potentialKotoGaDekiru !== null) {
    return { ok: false, reason: "potential + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (benefactive !== null) {
    return { ok: false, reason: "benefactive + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (desiderative !== null) {
    return { ok: false, reason: "desiderative + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (
    request !== null &&
    (
      isRequestComplementLikeConnective(connective) ||
      connective.connective === "quotative" ||
      connective.connective === "exemplification" ||
      connective.connective === "predicate_projection_quote_attributive"
    )
  ) {
    if (connective.surface === "かと") {
      return { ok: false, reason: "request aspect + request-question complement stays with request-family carrier" };
    }
    if (
      modal !== null || obligation !== null || desire !== null || voice !== null ||
      potentialKotoGaDekiru !== null || conjecture !== null ||
      aspect !== null || benefactive !== null || prohibition !== null ||
      desiderative !== null || miseru !== null
    ) {
      return { ok: false, reason: "request + other op + request complement composition not yet supported" };
    }
    const rendered = connective.connective === "predicate_projection_quote_attributive"
      ? renderRequestAttributiveQuoteFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preNeg: preModalNeg,
        past,
        stemSourceTokens: layer.stem.source.tokens,
        ...(layer.stem.koreanPrefix === undefined ? {} : { stemKoreanPrefix: layer.stem.koreanPrefix }),
        ...(request === null ? {} : { requestSourceTokens: request.source.tokens }),
        carrierSourceTokens: connective.source.tokens
      })
      : renderRequestComplementFromStem({
        stemLemma,
        stemIrregular,
        isVerb,
        preNeg: preModalNeg,
        past,
        connective
      });
    return rendered.ok ? withWarnings(rendered, warnings) : rendered;
  } else if (miseru !== null) {
    return { ok: false, reason: "miseru + connective outside operator-chain dispatcher — 비chain 결합 영역 외" };
  } else if (
    postModalPolite !== null ||
    request !== null || prohibition !== null ||
    miseru !== null
  ) {
    return { ok: false, reason: `connective + other op composition not yet supported` };
  } else {
    return null;
  }
}

function traceNonChainConnectiveBase(
  ncc: NonChainConnectiveContext,
  connectiveBaseResult: BaseResult
): BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } {
  const { connective } = ncc;
  const { layer, stemLemma, stemIrregular } = ncc.rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, obligation, modal, desire, voice, aspect } = ncc.state;
  if (
    !connectiveBaseResult.ok ||
    (connectiveBaseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace !== undefined
  ) {
    return connectiveBaseResult;
  }
  const hostTrace = simpleHostChainSourceTrace(layer, connective);
  if (hostTrace !== null) {
    return { ...connectiveBaseResult, chainSourceTrace: hostTrace };
  }
  if (
    preModalNeg !== null &&
    aspect === null && voice === null && desire === null && modal === null &&
    obligation === null && postModalNeg === null &&
    layer.ops.every((op) =>
      op === connective || op.kind === "negation" || op.kind === "tense" ||
      op.kind === "polite" || op.kind === "classicalAuxResidue" || op.kind === "adjCopulaBridge"
    )
  ) {
    const traceParts = longNegationTraceParts(preModalNeg, layer.ops, [
      ...(preModalTense?.source.tokens ?? []),
      ...(postModalTense?.source.tokens ?? []),
      ...(preModalPolite?.source.tokens ?? [])
    ]);
    const negTrace = longNegationChainTrace(
      stemLemma,
      stemIrregular,
      layer.stem.source.tokens,
      traceParts.negation,
      traceParts.extraFinalTokens
    );
    return negTrace === null
      ? connectiveBaseResult
      : { ...connectiveBaseResult, chainSourceTrace: negTrace };
  }
  if (preModalNeg !== null || preModalTense !== null) {
    return connectiveBaseResult;
  }
  return connectiveBaseResult;
}

function renderNonChainVolitionalTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, past, formal, isVerb, stemLemma, stemIrregular } = rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, aspect, benefactive, request, prohibition, desiderative, miseru } = state;
  const stemPos5A = (layer.stem.source.tokens[layer.stem.conjugationAnchor]?.pos ?? 0) & POS5A;
  const politeIsVolitional = preModalPolite !== null &&
    ((preModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_;
  if (
    stemPos5A !== 意志推量形_ &&
    !politeIsVolitional &&
    volitionalMoodBearerBlocksCohortative(layer.stem, undefined) &&
    layer.stem.kind === "verb" &&
    !past &&
    modal === null && obligation === null && desire === null && voice === null &&
    potentialKotoGaDekiru === null && conjecture === null && aspect === null &&
    benefactive === null && request === null && prohibition === null &&
    desiderative === null && miseru === null && preModalNeg === null &&
    preModalTense === null && postModalNeg === null && postModalTense === null &&
    postModalPolite === null
  ) {
    return withWarnings(withSimpleHostTraced(renderBaseVolitionalConjectureTerminal(
      {
        prefix: layer.stem.koreanPrefix ?? "",
        final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb: true }
      },
      false
    ), layer), warnings);
  }
  const stemMoodCarriesCohortative = layer.stem.stemMood === "volitional" &&
    !volitionalMoodBearerBlocksCohortative(layer.stem, undefined);
  if (stemPos5A === 意志推量形_ || politeIsVolitional || stemMoodCarriesCohortative) {
    if (
      modal !== null || obligation !== null || desire !== null || voice !== null ||
      potentialKotoGaDekiru !== null || preModalNeg !== null || preModalTense !== null
    ) {
      return { ok: false, reason: "Volitional stem + other op composition not yet supported" };
    }
    return withWarnings(withSimpleHostTraced(renderVolitional({
      lookups: ctx.lookups,
      stemLemma, stemIrregular, isVerb, formal,
      isPolite: preModalPolite !== null
    }), layer), warnings);
  }
  return null;
}

function renderRequestTerminalBaseTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular, stemShortNegationPolicy, passiveStemOptions, requestTerminalBaseOps, requestTerminalBasePath } = rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, connective, request, prohibition, desiderative } = state;
  if (request !== null && requestTerminalBasePath) {
    const baseCarriesStemNegation = requestTerminalBaseCanCarryStemNegation(requestTerminalBaseOps);
    if (
      modal !== null || voice !== null || conjecture !== null || connective !== null ||
      potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
      prohibition !== null || desiderative !== null ||
      (preModalNeg !== null && !baseCarriesStemNegation) || preModalTense !== null ||
      postModalNeg !== null || postModalTense !== null || postModalPolite !== null
    ) {
      return { ok: false, reason: "request terminal base composition has unsupported companion op" };
    }
    const baseRes = chainBases(
      requestTerminalBaseOps.map(requestTerminalBaseOpForRender),
      stemLemma,
      stemIrregular,
      isVerb,
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: baseCarriesStemNegation ? preModalNeg : null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal,
        shortNegationPolicy: stemShortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions
      }
    );
    return withStemPrefixApplied(withWarnings(
      renderRequestOnPredicateBase(baseRes, request, ctx.lookups, {
        directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(requestTerminalBaseOps),
        formal: ctx.formal
      }),
      warnings
    ));
  }
  return null;
}

function renderProhibitionTerminalBaseTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, formal, isVerb, stemLemma, stemIrregular, stemShortNegationPolicy, passiveStemOptions, prohibitionTerminalBaseOps, prohibitionTerminalBasePath } = rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, postModalPolite, obligation, modal, conjecture, desire, potentialKotoGaDekiru, connective, benefactive, request, prohibition, desiderative } = state;
  if (prohibition !== null && prohibitionTerminalBasePath) {
    if (
      modal !== null || conjecture !== null || connective !== null ||
      potentialKotoGaDekiru !== null || desire !== null || obligation !== null ||
      benefactive !== null || request !== null || desiderative !== null ||
      preModalNeg !== null || preModalTense !== null ||
      postModalNeg !== null || postModalTense !== null || postModalPolite !== null
    ) {
      return { ok: false, reason: "prohibition terminal base composition has unsupported companion op" };
    }
    const baseRes = chainBases(
      prohibitionTerminalBaseOps.map(requestTerminalBaseOpForRender),
      stemLemma,
      stemIrregular,
      isVerb,
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: null,
        stemPast: false,
        pastAfterChainIdx: new Map(),
        negAfterChainIdx: new Map(),
        formal,
        shortNegationPolicy: stemShortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        ...(layer.stem.absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass: layer.stem.absorbedPassiveClass }),
        passiveStemOptions
      }
    );
    return withStemPrefixApplied(withWarnings(renderProhibitionOnPredicateBase(baseRes, prohibition, ctx.formal), warnings));
  }
  return null;
}

function renderNonChainAspectFamilyTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, warnings, formal, isVerb, stemLemma, stemIrregular, postPast } = rc;
  const { preModalNeg, postModalNeg, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, connective, aspect, benefactive, request, prohibition, desiderative, miseru } = state;
  if (aspect !== null || benefactive !== null || request !== null || prohibition !== null ||
    desiderative !== null || miseru !== null) {
    if (modal !== null || voice !== null ||
      conjecture !== null || connective !== null || potentialKotoGaDekiru !== null ||
      desire !== null || obligation !== null) {
      return { ok: false, reason: "aspect + other operator head composition not yet supported (Phase 4.E+ 영역)" };
    }
    if ((request !== null || prohibition !== null) &&
      (postModalNeg !== null || postModalTense !== null)) {
      return { ok: false, reason: "request/prohibition + chain/tense composition not yet supported" };
    }
    if (aspect !== null) {
      return { ok: false, reason: "aspect outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }
    if (benefactive !== null) {
      return { ok: false, reason: "benefactive outside operator-chain dispatcher — 비chain 결합 영역 외" };
    }
    if (request !== null) {
      return withWarnings(renderRequest({
        stemLemma, stemIrregular, isVerb, request,
        preModalNeg,
        past: postPast,
        formal, isPolite: preModalPolite !== null || postModalPolite !== null,
        stemSourceTokens: layer.stem.source.tokens
      }), warnings);
    }
    if (prohibition !== null) {
      return withWarnings(renderProhibition({
        stemLemma, stemIrregular, isVerb, prohibition,
        preModalNeg,
        past: postPast,
        formal, isPolite: preModalPolite !== null || postModalPolite !== null,
        stemSourceTokens: layer.stem.source.tokens
      }), warnings);
    }
    return { ok: false, reason: "desiderative/miseru outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }
  return null;
}

function renderNonChainSimpleTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome {
  const { layer, ctx, warnings, past, formal, isVerb, stemLemma, stemIrregular } = rc;
  const { preModalNeg, preModalTense, preModalPolite } = state;
  const isPolite = preModalPolite !== null;

  const negation = preModalNeg;
  const chainDepth = negation?.chainDepth ?? 0;
  const negationPast = negation?.chainPast ?? false;
  const effectiveStemPast = past || negationPast;
  const simpleBaseResult = simpleStemBaseResult(stemLemma, stemIrregular, isVerb);

  if (chainDepth === 0) {
    const hostTrace = simpleHostChainSourceTrace(layer, null);
    const tracedSimpleBaseResult: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } =
      hostTrace !== null
        ? { ...simpleBaseResult, chainSourceTrace: hostTrace }
        : simpleBaseResult;
    return withWarnings(
      composeCommittedTailTerminal(tracedSimpleBaseResult, null, past, formal, isPolite, ctx.lookups),
      warnings
    );
  }

  const negationCarryTokens = [
    ...(preModalTense?.source.tokens ?? []),
    ...(preModalPolite?.source.tokens ?? [])
  ];

  if (simpleBaseResult.finalNegationLoweringPolicy !== undefined && negation !== null) {
    const suppletiveTraced: BaseResult & { readonly chainSourceTrace?: ChainSourceTrace } = {
      ...simpleBaseResult,
      chainSourceTrace: {
        prefixSegments: [],
        finalSourceTokens: [
          ...layer.stem.source.tokens,
          ...negation.source.tokens,
          ...negationCarryTokens
        ],
        finalKind: "lexeme"
      }
    };
    return withWarnings(
      composeCommittedTailTerminal(suppletiveTraced, negation, past, formal, isPolite, ctx.lookups),
      warnings
    );
  }

  if (chainDepth === 1 && negation !== null && negation.preferShortNegation) {
    const finalStem = composeFinalForm(stemLemma, stemIrregular, isVerb, effectiveStemPast, formal, isPolite, ctx.lookups);
    if (
      isVerb &&
      stemLemma.endsWith("하다") &&
      stemLemma.length > 2 &&
      layer.stem.shortNegationPolicy !== "lexical_prefix"
    ) {
      const sahenPrefix = stemLemma.slice(0, -2);
      const hadaForm = composeFinalForm("하다", "여", true, effectiveStemPast, formal, isPolite, ctx.lookups);
      return withWarnings({
        ok: true,
        text: `${sahenPrefix} 안 ${hadaForm}`,
        polite: isPolite,
        traced: tracedSeg(
          `${sahenPrefix} 안 ${hadaForm}`,
          [...layer.stem.source.tokens, ...negation.source.tokens, ...negationCarryTokens],
          "lexeme",
          "semantic"
        )
      }, warnings);
    }
    return withWarnings({
      ok: true,
      text: `안 ${finalStem}`,
      polite: isPolite,
      traced: tracedSeg(
        `안 ${finalStem}`,
        [...layer.stem.source.tokens, ...negation.source.tokens, ...negationCarryTokens],
        "lexeme",
        "semantic"
      )
    }, warnings);
  }

  const negated = applyNegationChainToLemmaBase(simpleStemBase(stemLemma, stemIrregular, isVerb), negation);
  if (negated === null) {
    return { ok: false, reason: "negation chain on non-lemma base invariant violation" };
  }
  const rendered = composeBaseWithTerminal(negated, effectiveStemPast, formal, isPolite, ctx.lookups);
  if (!rendered.ok || negation === null) {
    return withWarnings(rendered, warnings);
  }
  const traceParts = longNegationTraceParts(negation, layer.ops, negationCarryTokens);
  const longNegationTrace = longNegationChainTrace(
    stemLemma,
    stemIrregular,
    layer.stem.source.tokens,
    traceParts.negation,
    traceParts.extraFinalTokens
  );
  const longNegationTraced = longNegationTrace === null
    ? null
    : closeChainTraceAgainstText(longNegationTrace, rendered.text);
  return withWarnings(
    longNegationTraced === null ? rendered : { ...rendered, traced: longNegationTraced },
    warnings
  );
}
