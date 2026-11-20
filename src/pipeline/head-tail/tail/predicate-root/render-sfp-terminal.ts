import { roleCatNyaSuffix } from "../../../../generator/aux-map.js";
import { selectParticle } from "../../../../generator/particles.js";
import { POS5A, 意志推量形_ } from "../../../../types/pos.js";
import { isCommittedKaQuestionSfpEffect, stemInflectionCarriesVolitionalMood, type AuxLayerNode, type AuxOpNode, type ScopeBridgeOp, type StemNode, type TailRoot } from "./grammar.js";
import { isBenefactiveAspectOp, sfpHasSelfDirectedConjectureRole } from "./inspect.js";
import { ensureQuestionPunctuation, tracedCat, tracedSeg, type KoreanPredicateBase, type OkBaseResult, type RenderContext, type RenderFailure, type RenderOutcome, withStemPrefixApplied } from "./renderers/base-model.js";
import { irregularFrom } from "./renderers/final-forms.js";
import { simpleStemBase, copulaCarrierBaseForInterOp } from "./renderers/base-support.js";
import { composeCommittedTailTerminal } from "./renderers/predicate-terminal-compose.js";
import { quoteProjectionForSfpEffect } from "../../../semantics/sfp-quote-projection.js";
import { predicateQuoteCarrierRestoredHost } from "./renderers/predicate-bases.js";
import { scopeBridgeHeadAbsorbedHostPrefix } from "./renderers/scope-bridge-bases.js";
import { prohibitionUsesRequestForm } from "./renderers/command-render.js";
import { attributiveCommandBaseOperatorChain, attributiveCommandHeadPatternMatches, commandAttributiveAspectOp, isChainableHeadOp, isHeadOp, isProhibitionCommandAspectOp, isRequestCommandAspectOp } from "./renderers/op-chain.js";
import { buildNounPredicateProjectionCarrier, canonicalizeConjectureCopulaOps, predicateCopulaNegationOp, projectPredicateCopulaLayer, tryRenderInterjectionAbsorbedCopula } from "./renderers/noun-copula.js";
import { composeConnectiveQuestionTerminal, composeTerminalMoodOnBase, composeCommittedTailDiscursiveSfp, composeCommittedTailQuestionTerminal, composeRenderedNominalizedConjectureQuestion, composeTerminalDiscourseTailSegment, renderBenefactiveTerminalRequestQuestion, renderDirectNegativeConfirmQuestionSfp, renderHeadlessNegativeConfirmHost, renderNegativeInviteQuestionSfp, renderNounCopulaConjectureQuestionSfp, renderNounCopulaQuoteQuestionSfp, renderPlainNegativeQuestionSfp, renderProgressiveNegativeConfirmQuestionSfp, renderRequestDiscursiveSfp, renderSimpleStemTerminalSfp, renderStemConjecturalSkipSfpTerminal, loweredTerminalSfpEffect, renderTerminalRoleSfpFrame, renderVolitionalQuestionSfp, stripTerminalNodaAfterNegativeNoBridge, terminalRoleFrameFromAuxLayer, isSourceVolitionalChainableHead } from "./renderers/sfp-question.js";
import { resolveCandidateSetStem } from "./commit.js";
import { renderAuxLayer, projectMidPredicateCopulaLayer, renderAuxLayerAttributiveTerminal } from "./render.js";
import { commandQuoteCarrierCommandBase, commandQuoteCarrierTerminalBase, layerWithQuotedProhibitionBeforeCarrier, layerWithQuotedCarrierProhibition, renderImperativeQuotativeCommand } from "./renderers/command-tail.js";
import { markBenefactiveRequestEvidence } from "./renderers/voice-benefactive-tail.js";
import { copulaContinuativeExplanatoryClosureApplies, copulaContinuativeObliqueRecoveryApplies, copulaContinuativeObliqueHostKind } from "./renderers/continuative-copula.js";
import { tryRenderNounCopulaStutter, tryRenderNounCopulaPostverbCarrierAsVerb } from "./renderers/noun-copula-tail-forms.js";

export function renderCommittedTailTerminalLayer(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  ctx: RenderContext
): RenderOutcome {
  const layerWithProhibition = layerWithQuotedCarrierProhibition(layer) ?? layer;
  const hostlessQuoteCarrier = renderHostlessQuoteCarrierTerminalLayer(layerWithProhibition, sfp, ctx);
  if (hostlessQuoteCarrier !== null) {
    return hostlessQuoteCarrier;
  }
  return sfp !== null
    ? renderAuxLayerWithSfp(layerWithProhibition, sfp, ctx)
    : renderAuxLayer(layerWithProhibition, ctx);
}

function renderHostlessQuoteCarrierTerminalLayer(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  ctx: RenderContext
): RenderOutcome | null {
  const inner = hostlessQuoteCarrierInnerBase(layer, ctx);
  if (inner === null) {
    return null;
  }
  if (!inner.ok) {
    return inner;
  }
  const rootSfp = sfp === null ? null : loweredTerminalSfpEffect(sfp);
  const closed = rootSfp === null
    ? null
    : composeTerminalMoodOnBase(inner, null, false, ctx.formal, rootSfp.polite === true, rootSfp, ctx.lookups);
  return closed ?? composeCommittedTailTerminal(inner, null, false, ctx.formal, false, ctx.lookups);
}

function hostlessQuoteCarrierInnerBase(
  layer: AuxLayerNode,
  ctx: RenderContext
): OkBaseResult | RenderFailure | null {
  const carrier = layer.ops.at(-1);
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    layer.terminal !== null
  ) {
    return null;
  }
  if (
    carrier.quotedSfp !== undefined &&
    carrier.quotedSfp.effect !== "na_soft_imperative" &&
    quoteProjectionForSfpEffect(carrier.quotedSfp.effect, false) === "terminal_mood"
  ) {
    const quoted = renderAuxLayerWithSfp(
      { ...layer, ops: layer.ops.slice(0, -1) },
      { ...carrier.quotedSfp, quoteProjection: "terminal_mood" },
      ctx
    );
    return quoted.ok
      ? {
        ok: true,
        base: { prefix: `${quoted.text} `, final: predicateQuoteCarrierRestoredHost(carrier) }
      }
      : null;
  }
  if (carrier.sourceTerminal !== true || !layer.ops.every(isHeadOp)) {
    return null;
  }
  const requestOp = commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp);
  const prohibitionOp = requestOp === null
    ? commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp)
    : null;
  const commandOp = requestOp ?? prohibitionOp;
  if (commandOp === null) {
    return null;
  }
  const baseOps = attributiveCommandBaseOperatorChain(layer.ops, commandOp);
  if (!attributiveCommandHeadPatternMatches(layer.ops, commandOp, baseOps)) {
    return null;
  }
  let commandBase: KoreanPredicateBase;
  if (baseOps.length === 0) {
    if (layer.stem.kind !== "verb") {
      return null;
    }
    const stemBase = simpleStemBase(layer.stem.lemma, irregularFrom(layer.stem.irregular), true);
    commandBase = layer.stem.koreanPrefix === undefined || layer.stem.koreanPrefix.length === 0
      ? stemBase
      : { ...stemBase, prefix: layer.stem.koreanPrefix };
  } else {
    const chained = commandQuoteCarrierCommandBase(layer, ctx, baseOps, null);
    if (!chained.ok || chained.finalNeg !== null || chained.finalPast) {
      return null;
    }
    commandBase = chained.base;
  }
  return commandQuoteCarrierTerminalBase({
    base: commandBase,
    carrier,
    request: requestOp !== null,
    preNeg: null,
    requestForm: prohibitionOp === null ? false : prohibitionUsesRequestForm(prohibitionOp.prohibition)
  });
}

function renderAuxLayerWithSfp(layer: AuxLayerNode, sfp: TailRoot["sfp"], ctx: RenderContext): RenderOutcome {
  const canonicalized = canonicalizeConjectureCopulaOps(layer, ctx);
  if ("ok" in canonicalized) {
    return canonicalized;
  }
  layer = canonicalized.layer;
  ctx = canonicalized.ctx;
  const nounPostverbCarrier = tryRenderNounCopulaPostverbCarrierAsVerb(layer, ctx, (vl) => renderAuxLayerWithSfp(vl, sfp, ctx));
  if (nounPostverbCarrier !== null) {
    return nounPostverbCarrier;
  }
  if (sfp === null) {
    return renderAuxLayer(layer, ctx);
  }
  const interjection = tryRenderInterjectionAbsorbedCopula(layer, ctx, sfp);
  if (interjection !== null) {
    return interjection;
  }
  const finalConnective = layer.ops.at(-1);
  if (finalConnective?.kind === "connective" && finalConnective.connective === "te_form" && isCommittedKaQuestionSfpEffect(sfp.effect)) {
    const { outgoingBoundary: _outgoingBoundary, ...bodyContext } = ctx;
    const base = renderAuxLayer(layer, bodyContext, "connective");
    if (!base.ok) {
      return base;
    }
    const question = composeConnectiveQuestionTerminal(base, sfp);
    return sfp.emphaticQuestion === true ? appendEmphaticQuestionPunctuation(question) : question;
  }
  sfp = loweredTerminalSfpEffect(sfp);
  if (
    sfp.effect === "na_prohib" &&
    layer.ops.some((op) => op.kind === "predicateQuoteCarrier" && op.style === "compact_toiu") &&
    !layer.ops.some((op) => op.kind === "aspect" && op.aspect === "naide_kudasai")
  ) {
    return renderAuxLayer(layerWithQuotedProhibitionBeforeCarrier(layer, sfp.source), ctx);
  }
  if (sfp.quoteProjection === "terminal_mood") {
    const candidateStem = layer.stem.kind === "candidateSet" ? layer.stem : null;
    const committedStem = candidateStem === null
      ? layer.stem
      : resolveCandidateSetStem(candidateStem);
    const quotedLayer = {
      ...layer,
      stem: committedStem,
      ops: normalizeQuotedTerminalMoodOps(layer.ops, committedStem),
    };
    if (sfp.effect === "quotative_command") {
      return renderImperativeQuotativeCommand(quotedLayer, ctx) ??
        { ok: false, reason: "quotative_command SFP requires verb imperative stem" };
    }
    return renderTerminalRoleSfpFrame(quotedLayer, sfp, ctx) ??
      { ok: false, reason: "quoted terminal mood requires terminal role frame" };
  }
  const projectedMidCopula = projectMidPredicateCopulaLayer(layer, {
    projectAffirmativeBasic: true,
    projectNegativeBasic: false
  });
  if (projectedMidCopula !== null) {
    if ("ok" in projectedMidCopula) {
      return projectedMidCopula;
    }
    return renderAuxLayerWithSfp(projectedMidCopula, sfp, ctx);
  }
  const potentialBenefactiveIdx = layer.ops.findIndex(
    (op) => isBenefactiveAspectOp(op) && op.benefactive.potential
  );
  const potentialBenefactiveQuestion =
    (sfp.surface === "か" || sfp.questionRole === "request" || sfp.questionRole === "permission") &&
    potentialBenefactiveIdx >= 0 &&
    layer.ops.some((op, index) => index < potentialBenefactiveIdx && op.kind === "negation") &&
    !layer.ops.some((op) => op.kind === "tense" && op.tense === "past");
  if (sfp.questionRole === "request" || potentialBenefactiveQuestion) {
    layer = {
      ...layer,
      ops: layer.ops.map((op) =>
        isBenefactiveAspectOp(op) ? markBenefactiveRequestEvidence(op) : op
      )
    };
  }
  const terminalDiscourseConnective = renderTerminalDiscourseConnectiveSfp(layer, sfp, ctx);
  if (terminalDiscourseConnective !== null) {
    return terminalDiscourseConnective;
  }
  if (sfp.effect === null) {
    return renderContinuativeExplanatoryDiscursiveSfp(layer, sfp, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(layer, sfp, ctx) ??
      renderNeutralZeroCopulaSfpFrame(layer, ctx) ??
      renderStemConjecturalSkipSfpTerminal(layer, ctx) ??
      renderAuxLayer(layer, ctx);
  }
  if (sfp.effect === "realization") {
    const realized = renderTerminalRoleSfpFrame(layer, sfp, ctx);
    if (realized !== null) {
      return realized;
    }
    if (sfp.source.tokenIndices.length === 0) {
      return renderAuxLayer(layer, ctx);
    }
    sfp = { ...sfp, effect: "ka" };
  }
  if (sfp.effect === "ka" || sfp.effect === "plain_q" || sfp.effect === "polite_q") {
    const stutterQuestion = tryRenderNounCopulaStutter(layer, true, ctx);
    if (stutterQuestion !== null) {
      return stutterQuestion;
    }
  }
  const volitionalQuestion = renderVolitionalQuestionSfp(layer, sfp, ctx);
  if (volitionalQuestion !== null) {
    return volitionalQuestion;
  }
  const requestQuestion = renderBenefactiveTerminalRequestQuestion(layer, sfp, ctx);
  if (requestQuestion !== null) {
    return requestQuestion;
  }
  const simpleStem = renderSimpleStemTerminalSfp(layer, sfp, ctx);
  if (simpleStem !== null) {
    return simpleStem;
  }
  const nounProjectionCarrierQuestion = renderNounPredicateProjectionCarrierQuestionSfp(layer, sfp, ctx);
  if (nounProjectionCarrierQuestion !== null) {
    return nounProjectionCarrierQuestion;
  }
  const predicateCopula = renderPredicateCopulaProjectionSfp(layer, sfp, ctx);
  if (predicateCopula !== null) {
    return predicateCopula;
  }
  const nounCopulaConjectureQuestion = renderNounCopulaConjectureQuestionSfp(layer, sfp, ctx);
  if (nounCopulaConjectureQuestion !== null) {
    return nounCopulaConjectureQuestion;
  }
  const scopeConjectureQuestion = renderScopeBridgeConjectureQuestionSfp(layer, sfp, ctx);
  if (scopeConjectureQuestion !== null) {
    return scopeConjectureQuestion;
  }
  if (sfp.effect === "role_cat_nya") {
    const framed = renderTerminalRoleSfpFrame(layer, sfp, ctx);
    if (framed !== null) {
      return framed;
    }
    const rendered = renderAuxLayer(layer, { ...ctx, formal: true });
    if (!rendered.ok) {
      return rendered;
    }
    return {
      ok: true,
      text: rendered.text + roleCatNyaSuffix(sfp.repeatCount),
      polite: rendered.polite,
      ...(rendered.warnings === undefined ? {} : { warnings: rendered.warnings })
    };
  }
  if (sfp.effect === "ka") {
    const questionLayer = sfp.emphaticQuestion === true
      ? layerWithoutTerminalExplanatoryNoda(layer)
      : layer;
    const negativeConfirm = hasLiteralNegativeCopulaBeforeTerminalNoda(layer)
      ? null
      : renderNegativeConfirmQuestionSfp(questionLayer, ctx);
    const question = negativeConfirm ??
      renderTerminalRoleSfpFrame(questionLayer, sfp, ctx) ??
      { ok: false as const, reason: "ka SFP requires terminal role frame" };
    return sfp.emphaticQuestion === true
      ? appendEmphaticQuestionPunctuation(question)
      : question;
  }
  if (sfp.effect === "kayo") {
    const emphatic = sfp.emphaticQuestion === true;
    const questionLayer = emphatic ? layerWithoutTerminalExplanatoryNoda(layer) : layer;
    const question = renderTerminalRoleSfpFrame(questionLayer, sfp, ctx) ??
      { ok: false as const, reason: "kayo SFP requires terminal role frame" };
    return emphatic ? appendEmphaticQuestionPunctuation(question) : question;
  }
  if (sfp.effect === "plain_q") {
    return renderNounCopulaQuoteQuestionSfp(layer, sfp, ctx) ??
      renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "plain question SFP requires terminal role frame" };
  }
  if (sfp.effect === "polite_q") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "polite question SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_invite_q") {
    const invite = renderNegativeInviteQuestionSfp(layer, ctx);
    if (invite !== null) {
      return invite;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "negative invite SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_plain_q") {
    const plain = renderPlainNegativeQuestionSfp(layer, ctx);
    if (plain !== null) {
      return plain;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "plain negative question SFP requires terminal role frame" };
  }
  if (sfp.effect === "neg_confirm_q") {
    const progressiveConfirm = renderProgressiveNegativeConfirmQuestionSfp(layer, ctx);
    if (progressiveConfirm !== null) {
      return progressiveConfirm;
    }
    const negativeConfirm = renderNegativeConfirmQuestionSfp(layer, ctx);
    if (negativeConfirm !== null) {
      return negativeConfirm;
    }
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "negative confirm SFP requires terminal role frame" };
  }
  if (sfp.effect === "kana") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "kana SFP requires terminal role frame" };
  }
  if (sfp.effect === "speaker_assertion") {
    const gradeless = { ...sfp, effect: null };
    return renderContinuativeExplanatoryDiscursiveSfp(layer, gradeless, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(layer, gradeless, ctx) ??
      renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      renderAuxLayerWithSfp(layer, gradeless, ctx);
  }
  if (sfp.effect === "na_soft_imperative") {
    return renderTerminalRoleSfpFrame(layer, sfp, ctx) ??
      { ok: false, reason: "na_soft_imperative SFP requires terminal role frame" };
  }
  if (sfp.effect === "ne" || sfp.effect === "na_excl" || sfp.effect === "jan" || sfp.effect === "yone_confirm" || sfp.effect === "na_prohib" || sfp.effect === "kke" || sfp.effect === "explanatory" || sfp.effect === "nante_excl" || sfp.effect === "quotative_insistent" || sfp.effect === "quotative_topic_excl") {
    const discursiveLayer = layerWithoutRedundantModalCopulaBeforeTerminalSfp(layer);
    return renderVolitionalDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderRequestDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderContinuativeExplanatoryDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderObliqueCopulaDeMistagDiscursiveSfp(discursiveLayer, sfp, ctx) ??
      renderTerminalRoleSfpFrame(discursiveLayer, sfp, ctx) ??
      { ok: false, reason: `${sfp.effect} SFP requires terminal role frame` };
  }
  if (sfp.effect === "quotative_command") {
    return renderImperativeQuotativeCommand(layer, ctx) ??
      { ok: false, reason: "quotative_command SFP requires verb imperative stem" };
  }
  return { ok: false, reason: `SFP rendering for ${sfp.effect ?? "skip"} not supported` };
}

function hasLiteralNegativeCopulaBeforeTerminalNoda(layer: AuxLayerNode): boolean {
  const last = layer.ops.at(-1);
  const beforeLast = layer.ops.at(-2);
  return last?.kind === "modal" &&
    last.modal === "noda" &&
    beforeLast?.kind === "copula" &&
    beforeLast.polarity === "negative";
}

function layerWithoutTerminalExplanatoryNoda(layer: AuxLayerNode): AuxLayerNode {
  const last = layer.ops.at(-1);
  return last?.kind === "modal" && last.modal === "noda"
    ? { ...layer, ops: layer.ops.slice(0, -1) }
    : layer;
}

function appendEmphaticQuestionPunctuation(outcome: RenderOutcome): RenderOutcome {
  if (!outcome.ok || outcome.text.endsWith("?!")) {
    return outcome;
  }
  const text = outcome.text.endsWith("?") ? `${outcome.text}!` : `${outcome.text}?!`;
  return {
    ...outcome,
    text,
    ...(outcome.traced === undefined
      ? {}
      : { traced: tracedCat(outcome.traced, tracedSeg("!", [], "punctuation")) }),
  };
}

function normalizeQuotedTerminalMoodOps(
  ops: readonly AuxOpNode[],
  stem: StemNode,
): readonly AuxOpNode[] {
  const hasNoda = ops.some((op) => op.kind === "modal" && op.modal === "noda");
  const copulaBelongsToSourcePredicate = stem.kind === "adj" ||
    stem.sourcePredicateShape === "na_adjective" ||
    (stem.kind === "verb" && hasNoda);
  let normalized = copulaBelongsToSourcePredicate
    ? ops.flatMap((op, index) => {
      if (op.kind !== "copula" || op.variant !== "basic" || (index !== 0 && !hasNoda)) {
        return [op];
      }
      return op.polarity === "negative"
        ? [predicateCopulaNegationOp(op, null)]
        : [];
    })
    : [...ops];
  normalized = normalized.filter((op, index) => !(
    stem.kind !== "noun" &&
    op.kind === "copula" &&
    op.variant === "basic" &&
    op.polarity === "affirmative" &&
    normalized[index + 1]?.kind === "scopeBridge"
  ));
  if (stem.kind === "verb") {
    const nodaIndexes = normalized.flatMap((op, index) => op.kind === "modal" && op.modal === "noda" ? [index] : []);
    const lastNoda = nodaIndexes.at(-1);
    if (lastNoda !== undefined && nodaIndexes.length > 1) {
      normalized = normalized.filter((op, index) =>
        !(op.kind === "modal" && op.modal === "noda" && index !== lastNoda)
      );
    }
  }
  return normalized;
}

function layerWithoutRedundantModalCopulaBeforeTerminalSfp(layer: AuxLayerNode): AuxLayerNode {
  const last = layer.ops.at(-1);
  const previous = layer.ops.at(-2);
  if (
    last?.kind !== "copula" ||
    last.variant !== "basic" ||
    last.polarity !== "affirmative" ||
    last.polite ||
    previous?.kind !== "modal" ||
    (previous.modal !== "rashii" && previous.modal !== "youda")
  ) {
    return layer;
  }
  return {
    ...layer,
    ops: layer.ops.slice(0, -1)
  };
}

function renderNounPredicateProjectionCarrierQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (
    layer.stem.kind !== "noun" ||
    layer.ops[0]?.kind !== "predicateProjectionCarrier" ||
    (sfp.effect !== "ka" && sfp.effect !== "plain_q" && sfp.effect !== "polite_q")
  ) {
    return null;
  }
  const built = buildNounPredicateProjectionCarrier(layer.stem.lemma, layer.ops, ctx);
  if (!built.ok) {
    return built;
  }
  if (built.connective !== null || built.postOps.length > 0) return null;
  return composeCommittedTailQuestionTerminal(
    built.baseResult,
    null,
    built.carrier.past === true,
    ctx.formal,
    built.postPolite || built.carrier.polite === true,
    sfp.effect,
    false,
    ctx.lookups
  );
}

function renderVolitionalDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (sfp.effect !== "ne" && sfp.effect !== "na_excl" && sfp.effect !== "jan" && sfp.effect !== "kke") {
    return null;
  }
  if (!layerHasVolitionalTerminalSource(layer)) {
    return null;
  }
  return renderAuxLayer(layer, ctx);
}

function renderContinuativeExplanatoryDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (!copulaContinuativeExplanatoryClosureApplies(layer, sfp, ctx.lookups)) {
    return null;
  }
  const base = renderAuxLayer(layer, ctx);
  if (!base.ok) {
    return null;
  }
  const tail = ctx.formal ? "말이죠" : "말이야";
  return {
    ok: true,
    text: `${base.text} ${tail}`,
    polite: ctx.formal,
    ...(base.warnings === undefined ? {} : { warnings: base.warnings })
  };
}

function renderTerminalDiscourseConnectiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const last = layer.ops.at(-1);
  if (last?.kind !== "connective" || last.terminalDiscourseHost !== true || sfp.effect === null) {
    return null;
  }
  const base = renderAuxLayer(layer, ctx);
  if (!base.ok) {
    return null;
  }
  const tail = composeTerminalDiscourseTailSegment(
    TERMINAL_DISCOURSE_TAIL_NOUN,
    sfp.effect,
    ctx.formal,
    base.polite
  );
  if (tail === null) {
    return null;
  }
  return {
    ok: true,
    text: `${base.text} ${tail}`,
    polite: base.polite,
    ...(base.warnings === undefined ? {} : { warnings: base.warnings })
  };
}

const TERMINAL_DISCOURSE_TAIL_NOUN = "말";

function renderObliqueCopulaDeMistagDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (!copulaContinuativeObliqueRecoveryApplies(layer, sfp, ctx.lookups)) {
    return null;
  }
  const obliqueKind = copulaContinuativeObliqueHostKind(layer, ctx.lookups)!;
  const stem = layer.stem as Extract<StemNode, { kind: "noun" }>;
  const suffix =
    obliqueKind === "place" ? "에서" :
    obliqueKind === "instrument" ? selectParticle(stem.lemma, "으로/로") :
    "에";
  return {
    ok: true,
    text: `${stem.lemma}${suffix}`,
    polite: false
  };
}

function layerHasVolitionalTerminalSource(layer: AuxLayerNode): boolean {
  if (layer.stem.kind !== "verb") {
    return false;
  }
  const terminalOps = layer.ops.filter((op) => !isHeadOp(op));
  const headOps = layer.ops.filter(isHeadOp);
  const volitionalPolite = terminalOps.find((op) =>
    op.kind === "polite" && ((op.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_
  );
  const stemIsVolitional = stemInflectionCarriesVolitionalMood(layer.stem);
  const sourceVolitionalHead = headOps.some((op) => isSourceVolitionalChainableHead(op, layer.ops));
  if (volitionalPolite === undefined && !stemIsVolitional && !sourceVolitionalHead) {
    return false;
  }
  if (volitionalPolite !== undefined) {
    return terminalOps.length === 1 && headOps.every(isChainableHeadOp);
  }
  return terminalOps.length === 0 && headOps.every(isChainableHeadOp);
}

function negativeConfirmHostAbsorbedBoundNounPrefix(
  hostLayer: AuxLayerNode,
  bridge: ScopeBridgeOp,
  ctx: RenderContext
): string | null {
  const frame = terminalRoleFrameFromAuxLayer(hostLayer, ctx);
  if (frame === null || "ok" in frame || !frame.baseResult.ok) {
    return null;
  }
  if (frame.finalNeg !== null || frame.polite) {
    return null;
  }
  const lowered = copulaCarrierBaseForInterOp(frame.baseResult.base, ctx.formal);
  if (lowered === null) {
    return null;
  }
  return scopeBridgeHeadAbsorbedHostPrefix(bridge, lowered, frame.past);
}

function renderNegativeConfirmQuestionSfp(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  const directProjection = renderDirectNegativeConfirmQuestionSfp(layer);
  if (directProjection !== null) {
    return {
      ok: true,
      text: directProjection,
      polite: false
    };
  }

  const confirmLayer = stripTerminalNodaAfterNegativeNoBridge(layer);
  const bridge = confirmLayer.ops.at(-1);
  if (
    bridge?.kind !== "scopeBridge" ||
    bridge.polarity !== "negative" ||
    bridge.chainDepth !== 1
  ) {
    return null;
  }

  const hostLayer: AuxLayerNode = { ...confirmLayer, ops: confirmLayer.ops.slice(0, -1) };
  const confirmSuffix = ctx.formal ? "게 아닙니까" : bridge.polite ? "거잖아요" : "거잖아";
  const confirmPolite = ctx.formal || bridge.polite;
  if (bridge.head !== null) {
    const absorbedHostPrefix = negativeConfirmHostAbsorbedBoundNounPrefix(hostLayer, bridge, ctx);
    if (absorbedHostPrefix !== null) {
      return {
        ok: true,
        text: ensureQuestionPunctuation(`${absorbedHostPrefix}${confirmSuffix}`),
        polite: confirmPolite
      };
    }
    const attr = renderAuxLayerAttributiveTerminal(hostLayer, ctx);
    if (!attr.ok) {
      return attr;
    }
    return {
      ok: true,
      text: ensureQuestionPunctuation(`${attr.text} ${confirmSuffix}`),
      polite: confirmPolite,
      ...(attr.warnings === undefined ? {} : { warnings: attr.warnings })
    };
  }

  const direct = renderHeadlessNegativeConfirmHost(hostLayer);
  if (direct !== null) {
    return {
      ok: true,
      text: ensureQuestionPunctuation(direct),
      polite: false
    };
  }

  const frame = terminalRoleFrameFromAuxLayer(hostLayer, ctx);
  if (frame === null) {
    return { ok: false, reason: "negative-confirm SFP requires host terminal role frame" };
  }
  if ("ok" in frame) {
    return frame;
  }
  const confirmed = composeCommittedTailDiscursiveSfp(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    ctx.formal,
    false,
    "jan",
    ctx.lookups
  );
  if (!confirmed.ok) {
    return confirmed;
  }
  return withStemPrefixApplied({
    ...confirmed,
    text: ensureQuestionPunctuation(confirmed.text),
    polite: false
  });
}

function renderPredicateCopulaProjectionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const projection = projectPredicateCopulaLayer(layer, ctx);
  if (projection === null) {
    return null;
  }
  if ("ok" in projection) {
    return projection;
  }
  return renderAuxLayerWithSfp(projection.layer, sfp, projection.ctx);
}

function renderNeutralZeroCopulaSfpFrame(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 0 || layer.terminal !== null) {
    return null;
  }
  const frame = terminalRoleFrameFromAuxLayer(layer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return withStemPrefixApplied(frame);
  }
  return withStemPrefixApplied(composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    ctx.formal,
    frame.polite,
    ctx.lookups
  ));
}

function renderScopeBridgeConjectureQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (sfp.effect !== "ka" && sfp.effect !== "plain_q" && sfp.effect !== "polite_q") {
    return null;
  }
  if (
    !layer.ops.some((op) => op.kind === "conjecture") ||
    !layer.ops.some((op) => op.kind === "scopeBridge" || (op.kind === "modal" && op.modal !== "souda_hearsay"))
  ) {
    return null;
  }
  const conjectureIndex = layer.ops.findIndex((op) => op.kind === "conjecture");
  const conjecture = conjectureIndex < 0 ? null : layer.ops[conjectureIndex];
  const negativeNoScope = layer.ops.some((op, index) =>
    index < conjectureIndex &&
    op.kind === "scopeBridge" &&
    op.head === "no" &&
    op.polarity === "negative"
  );
  if (
    negativeNoScope &&
    conjecture?.kind === "conjecture" &&
    sfpHasSelfDirectedConjectureRole(sfp)
  ) {
    const frame = terminalRoleFrameFromAuxLayer(layer, ctx);
    if (frame !== null && !("ok" in frame)) {
      return withStemPrefixApplied(composeCommittedTailQuestionTerminal(
        frame.baseResult,
        frame.finalNeg,
        frame.past,
        ctx.formal,
        frame.polite || conjecture.polite,
        sfp.effect,
        true,
        ctx.lookups,
      ));
    }
  }
  const rendered = renderAuxLayer(layer, ctx);
  if (!rendered.ok) {
    return rendered;
  }
  const questionPolite = sfp.effect === "polite_q" ||
    layer.ops.some((op) => op.kind === "conjecture" && op.polite);
  const polite = rendered.polite || questionPolite;
  const selfDirectedConjecture = sfpHasSelfDirectedConjectureRole(sfp);
  let compactedQuestion = selfDirectedConjecture
    ? composeRenderedNominalizedConjectureQuestion(rendered.text, questionPolite)
    : null;
  if (selfDirectedConjecture && compactedQuestion === null && ctx.formal) {
    const casualRendered = renderAuxLayer(layer, { ...ctx, formal: false });
    if (casualRendered.ok) {
      compactedQuestion = composeRenderedNominalizedConjectureQuestion(casualRendered.text, questionPolite);
    }
  }
  return {
    ok: true,
    text: ensureQuestionPunctuation(compactedQuestion ?? rendered.text),
    polite,
    ...(rendered.stemPrefixApplied === true ? { stemPrefixApplied: true } : {}),
    ...(rendered.warnings === undefined ? {} : { warnings: rendered.warnings })
  };
}
