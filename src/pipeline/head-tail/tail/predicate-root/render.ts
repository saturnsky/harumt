
import { conjugate } from "../../../../generator/conjugator.js";
import { declaredProjectionCarrierBranchTerminal } from "./projection-carrier-form-table.js";
import { selectParticle } from "../../../../generator/particles.js";
import { hasSeparatedFinitePredicateBoundary } from "../../../clause-layout/connective-boundaries.js";
import type { Warning } from "../../../../types/warning.js";
import { checkOpInSubset } from "./render-support.js";
import { POS4, 助動詞_デス, 助動詞_マス } from "../../../../types/pos.js";
export {
  RENDER_SUPPORTED_ASPECT_KINDS,
  RENDER_SUPPORTED_CONNECTIVE_KINDS,
  RENDER_SUPPORTED_IDIOM_KINDS,
  RENDER_SUPPORTED_MODAL_KINDS
} from "./render-support.js";
import { attributiveProjectionPolicy, headRequiresFutureAttributiveProjection } from "./attributive-head-policy.js";
import { RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE, type AdjCopulaBridgeOp, type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type ConnectiveOp, type NegationOp, type NounStem, type ObligationIdiomOp, type OpSource, type PoliteOp, type StemNode } from "./grammar.js";
import {
  connectiveForRender,
  isTerminalTeFormConnective,
  shouldCarryConnectivePoliteness
} from "./connective-render.js";
import { chainFinalOpHostCategory, stemIsAdjectivalSourceWithNominalTarget, isBenefactiveAspectKind } from "./inspect.js";
import { lastLayerSource, splitNegativeNounCopulaSourceTokens, tracedCat, tracedSeg, type ChainSourceTrace, type OkBaseResult, type OperatorOp, type RenderContext, type RenderFailure, type RenderOutcome, applyStemAffixToOutcome } from "./renderers/base-model.js";
import { composeFinalForm, irregularFrom, obligationEmphasis } from "./renderers/final-forms.js";
import { nounCopulaStemAllomorphHost, negativeNounCopulaBase, negativeNounCopulaChainBase, nounCopulaBase, nounCopulaPolarityBaseForCopula, nounSubjectPart, passiveStemOptionsForStem } from "./renderers/base-support.js";
import { attributiveBoundaryRequestsFutureProjection } from "./renderers/predicate-base-projection.js";
import { composeCommittedTailConnective } from "./renderers/connective-compose.js";
import { isConjectureQuestionContinuationConnective } from "./renderers/conjecture-compose.js";
import { predicateQuoteCarrierRestoredHost } from "./renderers/predicate-bases.js";
import { collectOperatorChain, commandAttributiveAspectOp, commandTerminalBaseOperatorChain, isChainableHeadOp, isHeadOp, isOperatorWrapBoundaryHeadOp, isProhibitionCommandAspectOp, isRequestCommandAspectOp, multiAspectPathCanUseOperatorFold } from "./renderers/op-chain.js";
import { canonicalizeConjectureCopulaOps, copulaVariantConnective, isTosuruPredicateCarrier, nominalPredicateStemFromNounLemma, predicateCopulaNegationOp, projectPredicateCopulaLayer, renderAdjTosuruResultativePredicateCarrier, renderNominalHostLikeness, renderNounCopulaAttributiveOperatorChain, renderNounPredicateProjectionCarrier, renderNounScopeBridge, renderNounScopeBridgeAttributiveTerminal, renderNounTosuruAttributiveTerminal, renderNounTosuruPredicateCarrier, tryRenderInterjectionAbsorbedCopula, tryRenderNounCopulaInitialBaseOperatorChain } from "./renderers/noun-copula.js";
import { composeCommittedTailQuestionTerminal } from "./renderers/sfp-question.js";
import { copulaNiMarkerRelationForToken } from "../../boundary/marker.js";
import { isBareNounStemImplicitCopulaConnective, isQuestionContentConnective } from "./bare-noun-stem-hosting.js";
import { normalizeCarrierInternalConnectives } from "./production-families/normalization.js";
import { createConnectiveOp, createCopulaOp, createPoliteOp } from "./op-builders.js";
import { renderNonChainTail } from "./renderers/non-chain-tail.js";
import { renyouChuushiClosesUtterance, teConnectiveClosesQuotedUtterance, utteranceFinalTeConnectiveForRender } from "./connective-render.js";
import { layerWithQuotedCarrierProhibition, renderRequestProhibitionQuoteTerminal, renderAuxLayerImperativeTerminal } from "./renderers/command-tail.js";
import { tryCausativeItadakuHumbleNonTerminal, classifyAuxLayerVoiceOp, renderCausativeItadakuHumbleTerminal } from "./renderers/voice-benefactive-tail.js";
import { tryRenderNounCopulaStutter, renderBareNounQuoteConnective, renderNominalFocusConnective, nominalTargetCopulaBridgeOps, newNounCopulaOpState, type NounCopulaRenderContext, renderNounConsecutiveConjecture, collectNounCopulaOps, renderNounCopulaProjectionCarrier, renderNounCopulaPredicateQuoteCarrier, renderNounCopulaPostverbAuxiliary, renderNounCopulaSoudaHearsay, renderNounCopulaExperience, renderNounCopulaObligation, renderNounCopulaModalChain, renderNounCopulaConditionalNara, renderNounCopulaScopeBridge, renderNounCopulaSimpleTail, tryRenderNounCopulaPostverbCarrierAsVerb } from "./renderers/noun-copula-tail-forms.js";
import { renderViaOperatorChain } from "./renderers/operator-chain-tail.js";
import { withoutAttributiveInternalPoliteness, withMoodSourceBoundToFinalTraceSegment, type AttributiveWrapOpState, type AttributiveTerminalChainContext, collectAttributiveWrapOps, renderAttributiveSequenceAfterQuote, renderRequestProhibitionQuoteAttributive, renderAttributiveOperatorChain, renderAttributiveSimpleStemTail, renderHazuNegativePropositionAttributiveTerminal, renderBareNominalLikePredicateQuoteAttributiveTerminal, attributiveSequenceAfterQuoteCarrier, conditionalCompactQuoteMannerMode, commandAttributiveAspectOpWithQuotedPostChain, commandAttributiveAspectOpBeforeLikeness } from "./renderers/attributive-tail-forms.js";
import { renderNounProjectionCarrierAttributiveTerminal, type NounCopulaAttributiveOpState, renderNounCopulaConjectureAttributiveChain, collectNounCopulaAttributiveOps, renderNounCopulaPredicateQuoteAttributive, renderNounCopulaModalChainAttributive, renderNounCopulaSimpleAttributiveTail, legacyNounCopulaReasonQuoteAttributive } from "./renderers/noun-copula-attributive-forms.js";
import type { AuxLayerOpState, AuxLayerRenderContext } from "./renderers/aux-layer-context.js";

function renderPredicateCopulaProjection(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  const projection = projectPredicateCopulaLayer(layer, ctx);
  if (projection === null) {
    return { ok: false, reason: "predicate copula projection requires CopulaOp as first op" };
  }
  if ("ok" in projection) {
    return projection;
  }
  return renderAuxLayer(projection.layer, projection.ctx);
}

function renderNounCopula(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "renderNounCopula: stem must be noun" };
  }
  const stutter = tryRenderNounCopulaStutter(layer, false, ctx);
  if (stutter !== null) {
    return stutter;
  }
  const noun = layer.stem.lemma;
  if (noun.length === 0) {
    return { ok: false, reason: "noun lemma is empty" };
  }
  const interjection = tryRenderInterjectionAbsorbedCopula(layer, ctx);
  if (interjection !== null) {
    return interjection;
  }
  if (
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    return renderNounCopula(
      { ...layer, ops: nominalTargetCopulaBridgeOps(layer.ops) },
      ctx
    );
  }
  const ops = layer.ops;
  if (ops[0]?.kind === "modal" && ops[0].modal === "youda") {
    return renderNominalHostLikeness(noun, ops, ctx);
  }
  if (isTosuruPredicateCarrier(ops[0])) {
    return renderNounTosuruPredicateCarrier(layer.stem, ops, ctx);
  }
  if (ops[0]?.kind === "predicateProjectionCarrier") {
    return renderNounPredicateProjectionCarrier(noun, ops, ctx, layer.stem.source.tokens);
  }
  if (ops[0]?.kind === "scopeBridge") {
    return renderNounScopeBridge(layer, ctx);
  }
  const nominalFocusConnective = renderNominalFocusConnective(layer, ctx);
  if (nominalFocusConnective !== null) {
    return nominalFocusConnective;
  }
  const bareQuoteConnective = renderBareNounQuoteConnective(layer, ctx);
  if (bareQuoteConnective !== null) {
    return bareQuoteConnective;
  }
  if (ops.length === 0) {
    return { ok: true, text: noun, polite: false };
  }
  const nounLayer = layer as AuxLayerNode & { readonly stem: NounStem };
  const questionContent = renderNounQuestionContentConnective(nounLayer, ctx, ops, noun);
  if (questionContent !== null) {
    return questionContent;
  }
  if (
    ops.length === 1 &&
    ops[0]?.kind === "connective" &&
    isBareNounStemImplicitCopulaConnective(ops[0])
  ) {
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    return renderNounCopula({ ...layer, ops: [implicitCopula, ...ops] }, ctx);
  }
  const chainableHead = renderNounChainableHeadImplicitCopula(nounLayer, ctx, ops, noun);
  if (chainableHead !== null) {
    return chainableHead;
  }
  if (ops[0]!.kind !== "copula") {
    return { ok: false, reason: "noun stem requires CopulaOp as first op" };
  }
  const copula = ops[0];
  const adverbialNiCopula = renderNounAdverbialNiCopula(nounLayer, ctx, ops, copula);
  if (adverbialNiCopula !== null) {
    return adverbialNiCopula;
  }
  const nominalPredicate = nominalPredicateStemFromNounLemma(layer.stem);
  if (
    nominalPredicate !== null &&
    copula.variant === "basic" &&
    copula.polarity === "affirmative"
  ) {
    const projectedLayer: AuxLayerNode = {
      ...layer,
      stem: nominalPredicate,
      ops: ops.slice(1)
    };
    return applyStemAffixToOutcome(renderAuxLayer(projectedLayer, ctx), nominalPredicate);
  }

  const centralizedOperatorChain = tryRenderNounCopulaInitialBaseOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    ctx
  );
  if (centralizedOperatorChain !== null) {
    return centralizedOperatorChain;
  }

  const state = newNounCopulaOpState(copula);
  const collectFailure = collectNounCopulaOps(ops, copula, state);
  if (collectFailure !== null) {
    return collectFailure;
  }

  const formal = ctx.formal;
  const terminalFormal = ctx.formal;
  const base = nounCopulaPolarityBaseForCopula(copula, noun, state.chainDepth, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
  const baseResult = {
    ok: true,
    base,
    chainOnFinalSupported: true
  } satisfies OkBaseResult;

  if (state.connective !== null) {
    state.connective = connectiveForRender(state.connective, ctx);
  }
  const connectivePolite = state.polite && shouldCarryConnectivePoliteness(ctx);

  const nc: NounCopulaRenderContext = {
    layer: nounLayer,
    ctx,
    noun,
    ops,
    copula,
    formal,
    terminalFormal,
    base,
    baseResult,
    connectivePolite
  };
  const projection = renderNounCopulaProjectionCarrier(nc, state);
  if (projection !== null) {
    return projection;
  }
  const quote = renderNounCopulaPredicateQuoteCarrier(nc, state);
  if (quote !== null) {
    return quote;
  }
  const postverb = renderNounCopulaPostverbAuxiliary(nc, state);
  if (postverb !== null) {
    return postverb;
  }
  const hearsay = renderNounCopulaSoudaHearsay(nc, state);
  if (hearsay !== null) {
    return hearsay;
  }
  const experienceOutcome = renderNounCopulaExperience(nc, state);
  if (experienceOutcome !== null) {
    return experienceOutcome;
  }
  const obligationOutcome = renderNounCopulaObligation(nc, state);
  if (obligationOutcome !== null) {
    return obligationOutcome;
  }
  const modalOutcome = renderNounCopulaModalChain(nc, state);
  if (modalOutcome !== null) {
    return modalOutcome;
  }
  const nara = renderNounCopulaConditionalNara(nc, state);
  if (nara !== null) {
    return nara;
  }
  const scope = renderNounCopulaScopeBridge(nc, state);
  if (scope !== null) {
    return scope;
  }
  return renderNounCopulaSimpleTail(nc, state);
}

function renderNounQuestionContentConnective(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  ops: readonly AuxOpNode[],
  noun: string
): RenderOutcome | null {
  if (
    ops.length === 1 &&
    ops[0]?.kind === "connective" &&
    isQuestionContentConnective(ops[0])
  ) {
    if (ops[0].questionContentRole === "terminal") {
      const base = nounCopulaBase(noun, false, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
      return composeCommittedTailQuestionTerminal(
        {
          ok: true,
          base: {
            ...base,
            prefix: `${layer.stem.koreanPrefix ?? ""}${base.prefix}`
          },
          chainOnFinalSupported: true
        },
        null,
        false,
        ctx.formal,
        false,
        "ka",
        false,
        ctx.lookups
      );
    }
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    return renderNounCopula({ ...layer, ops: [implicitCopula, ...ops] }, ctx);
  }
  return null;
}

function renderNounChainableHeadImplicitCopula(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  ops: readonly AuxOpNode[],
  noun: string
): RenderOutcome | null {
  if (isChainableHeadOp(ops[0]!)) {
    const consecutiveConjecture = renderNounConsecutiveConjecture(layer, ctx, ops, noun);
    if (consecutiveConjecture !== null) {
      return consecutiveConjecture;
    }
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    const implicitLayer: AuxLayerNode & { readonly stem: NounStem } = {
      ...layer,
      stem: layer.stem,
      ops: [implicitCopula, ...ops]
    };
    const implicitLastOp = ops.at(-1);
    if (
      ops[0]?.kind === "conjecture" &&
      implicitLastOp?.kind === "connective" &&
      (
        implicitLastOp.connective === "quotative" ||
        isConjectureQuestionContinuationConnective(implicitLastOp)
      )
    ) {
      return renderNounCopula(implicitLayer, ctx);
    }
    const centralized = tryRenderNounCopulaInitialBaseOperatorChain(
      implicitLayer,
      implicitCopula,
      ctx,
      { admitSingleHead: true }
    );
    if (centralized !== null) {
      return centralized;
    }
  }
  return null;
}

function renderNounAdverbialNiCopula(
  layer: AuxLayerNode & { readonly stem: NounStem },
  ctx: RenderContext,
  ops: readonly AuxOpNode[],
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>
): RenderOutcome | null {
  if (
    copula.basicForm === "adverbial_ni" &&
    ops.length === 2 &&
    ops[1]?.kind === "copula" &&
    ops[1].variant === "basic" &&
    ops[1].polarity === "affirmative"
  ) {
    const adverbial = renderAuxLayerAdverbialModifierTerminal({
      ...layer,
      ops: [copula],
      terminal: null
    }, ctx);
    if (!adverbial.ok) return adverbial;
    return {
      ok: true,
      text: `${adverbial.text} ${ctx.formal ? "말이다" : "말이야"}`,
      polite: false
    };
  }
  return null;
}

function tryRenderPredicateCopulaCorrection(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const copulaIdx = layer.ops.findIndex((op) =>
    op.kind === "copula" &&
    op.polarity === "negative" &&
    op.negativeBridgeForm === "ja"
  );
  if (copulaIdx <= 0 || copulaIdx + 1 !== layer.ops.length - 1) {
    return null;
  }
  const copula = layer.ops[copulaIdx];
  const connective = layer.ops[copulaIdx + 1];
  if (
    copula?.kind !== "copula" ||
    connective?.kind !== "connective" ||
    connective.connective !== "te_form"
  ) {
    return null;
  }
  const host = renderAuxLayerAttributiveTerminal({
    ...layer,
    ops: layer.ops.slice(0, copulaIdx),
    terminal: null
  }, ctx, { nominalizedTerminal: true });
  if (!host.ok) {
    return host;
  }
  const boundNounNegativeBase = negativeNounCopulaBase("것", 0);
  if (boundNounNegativeBase.final.kind !== "negativeNounCopula") {
    return { ok: false, reason: "bound noun correction base invariant violation" };
  }
  const loweredBoundNounNegative = negativeNounCopulaChainBase(
    boundNounNegativeBase.final,
    ctx.formal
  );
  const hostTrace = host.traced ?? tracedSeg(
    host.text,
    [
      ...layer.stem.source.tokens,
      ...layer.ops.slice(0, copulaIdx).flatMap((op) => op.source.tokens)
    ],
    "lexeme"
  );
  const correctionBase = {
    ok: true,
    base: {
      prefix: `${host.text} ${boundNounNegativeBase.prefix}${loweredBoundNounNegative.prefix}`,
      final: loweredBoundNounNegative.final
    },
    chainOnFinalSupported: true,
    chainSourceTrace: {
      prefixSegments: hostTrace,
      finalSourceTokens: copula.source.tokens,
      finalKind: "aux"
    }
  } satisfies OkBaseResult & { readonly chainSourceTrace: ChainSourceTrace };
  return composeCommittedTailConnective(
    correctionBase,
    connectiveForRender({ ...connective, teFormRole: "listing" }, ctx),
    false,
    false,
    null,
    ctx.formal,
    ctx.lookups
  );
}

type AuxLayerPreludeResult =
  | { readonly kind: "outcome"; readonly outcome: RenderOutcome }
  | { readonly kind: "resume"; readonly layer: AuxLayerNode; readonly ctx: RenderContext }
  | { readonly kind: "pass"; readonly layer: AuxLayerNode; readonly ctx: RenderContext };

function mergedConsumedSource(
  existing: AuxLayerNode["consumedSource"],
  added: OpSource
): OpSource {
  const byIndex = new Map<number, OpSource["tokens"][number]>();
  for (const source of [existing, added]) {
    if (source === undefined) continue;
    source.tokenIndices.forEach((tokenIndex, position) => {
      const token = source.tokens[position];
      if (token !== undefined) byIndex.set(tokenIndex, token);
    });
  }
  const entries = [...byIndex.entries()].sort(([left], [right]) => left - right);
  return {
    tokens: entries.map(([, token]) => token),
    tokenIndices: entries.map(([tokenIndex]) => tokenIndex)
  };
}

function conjectureAttributiveMoodLayer(layer: AuxLayerNode): AuxLayerNode | null {
  if (layer.terminal !== "attributive" && layer.terminal !== "nominalized") {
    return null;
  }
  const moodIdx = layer.ops.length - 1;
  const last = layer.ops[moodIdx];
  if (last === undefined) {
    return null;
  }
  const conjectureCopula = last.kind === "copula" && last.variant === "conjecture" && last.polarity === "affirmative"
    ? last
    : null;
  const typedConjecture = last.kind === "conjecture" ? last : null;
  if (conjectureCopula === null && typedConjecture === null) {
    return null;
  }
  const remaining = [...layer.ops.slice(0, moodIdx), ...layer.ops.slice(moodIdx + 1)];
  const propositionOps = layer.ops.slice(0, moodIdx);
  const hostNeedsPredicateCopula = layer.stem.kind !== "verb" &&
    layer.stem.kind !== "adj" &&
    !propositionOps.some((op) => op.kind === "copula" || isHeadOp(op));
  const honorific = conjectureCopula?.honorific === true;
  const preserved: readonly AuxOpNode[] = honorific || hostNeedsPredicateCopula
    ? [
      ...layer.ops.slice(0, moodIdx),
      createCopulaOp({
        source: last.source,
        variant: "basic",
        polarity: conjectureCopula?.polarity ?? "affirmative",
        ...(honorific ? { honorific: true as const } : {}),
        polite: (conjectureCopula ?? typedConjecture)!.polite
      }),
      ...layer.ops.slice(moodIdx + 1)
    ]
    : remaining;
  return {
    ...layer,
    ops: preserved,
    attributiveMood: { kind: "conjecture", source: last.source },
    ...(preserved.length === layer.ops.length
      ? {}
      : { consumedSource: mergedConsumedSource(layer.consumedSource, last.source) })
  };
}

function renderAuxLayerPrelude(
  layer: AuxLayerNode,
  ctx: RenderContext,
  teFormRendering: "auto" | "connective" = "auto"
): AuxLayerPreludeResult {
  const conjectureAttributive = conjectureAttributiveMoodLayer(layer);
  if (conjectureAttributive !== null) {
    layer = conjectureAttributive;
  }
  const canonicalized = canonicalizeConjectureCopulaOps(layer, ctx);
  if ("ok" in canonicalized) {
    return { kind: "outcome", outcome: canonicalized };
  }
  layer = canonicalized.layer;
  ctx = canonicalized.ctx;
  const carrierInternalNormalized = normalizeCarrierInternalConnectives(layer);
  if (carrierInternalNormalized !== null) {
    return { kind: "resume", layer: carrierInternalNormalized, ctx };
  }
  const nounPostverbCarrier = tryRenderNounCopulaPostverbCarrierAsVerb(layer, ctx, (vl) => renderAuxLayer(vl, ctx, teFormRendering));
  if (nounPostverbCarrier !== null) {
    return { kind: "outcome", outcome: nounPostverbCarrier };
  }
  const humbleNonTerminal = tryCausativeItadakuHumbleNonTerminal(layer, ctx.lookups);
  if (humbleNonTerminal !== null) {
    return { kind: "resume", layer: humbleNonTerminal, ctx };
  }
  const predicateCopulaCorrection = tryRenderPredicateCopulaCorrection(layer, ctx);
  if (predicateCopulaCorrection !== null) {
    return { kind: "outcome", outcome: predicateCopulaCorrection };
  }
  const leadingCopula = layer.ops[0]?.kind === "copula" ? layer.ops[0] : null;
  const predicateCopulaProjection =
    leadingCopula !== null &&
      (leadingCopula.variant !== "basic" ||
        leadingCopula.polarity === "negative" ||
        leadingCopula.honorific === true)
      ? projectPredicateCopulaLayer(layer, ctx)
      : null;
  if (predicateCopulaProjection !== null) {
    if ("ok" in predicateCopulaProjection) {
      return { kind: "outcome", outcome: predicateCopulaProjection };
    }
    return {
      kind: "resume",
      layer: predicateCopulaProjection.layer,
      ctx: predicateCopulaProjection.ctx
    };
  }
  const projectedMidCopula = projectMidPredicateCopulaLayer(layer);
  if (projectedMidCopula !== null) {
    if ("ok" in projectedMidCopula) {
      return { kind: "outcome", outcome: projectedMidCopula };
    }
    return { kind: "resume", layer: projectedMidCopula, ctx };
  }
  if (layer.terminal === "attributive" && punctuatedFiniteObligationClause(layer, ctx)) {
    const { terminalPayload: _terminalPayload, ...finiteLayer } = layer;
    void _terminalPayload;
    return { kind: "resume", layer: { ...finiteLayer, terminal: null }, ctx };
  }
  return { kind: "pass", layer, ctx };
}

function foldStackedObligationOps(
  outer: ObligationIdiomOp,
  inner: ObligationIdiomOp
): ObligationIdiomOp {
  const carrier = obligationEmphasis(inner.variant) === "" ? outer : inner;
  return {
    ...carrier,
    polarity: outer.polarity === "negative" || inner.polarity === "negative"
      ? "negative"
      : carrier.polarity,
    polite: outer.polite || inner.polite,
    past: outer.past || inner.past,
    source: {
      tokens: [...outer.source.tokens, ...inner.source.tokens],
      tokenIndices: [...outer.source.tokenIndices, ...inner.source.tokenIndices]
    }
  };
}

function foldStackedObligationLayer(layer: AuxLayerNode): AuxLayerNode {
  const obligations = layer.ops.filter(
    (op): op is ObligationIdiomOp => op.kind === "idiom" && op.idiom === "obligation"
  );
  if (obligations.length < 2) {
    return layer;
  }
  const folded = obligations.reduce(foldStackedObligationOps);
  let placed = false;
  const ops: AuxOpNode[] = [];
  for (const op of layer.ops) {
    if (!(op.kind === "idiom" && op.idiom === "obligation")) {
      ops.push(op);
      continue;
    }
    if (placed) {
      continue;
    }
    placed = true;
    ops.push(folded);
  }
  return { ...layer, ops };
}

function newAuxLayerOpState(): AuxLayerOpState {
  return {
    preModalNeg: null,
    postModalNeg: null,
    preModalTense: null,
    postModalTense: null,
    postModalNegations: [],
    postModalTenses: [],
    preModalPolite: null,
    postModalPolite: null,
    obligation: null,
    modal: null,
    conjecture: null,
    desire: null,
    desireIdx: null,
    voice: null,
    voiceIdx: null,
    potentialKotoGaDekiru: null,
    connective: null,
    aspect: null,
    benefactive: null,
    request: null,
    prohibition: null,
    desiderative: null,
    miseru: null,
  };
}

export function renderAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext,
  teFormRendering: "auto" | "connective" = "auto"
): RenderOutcome {
  layer = foldStackedObligationLayer(layer);
  const adversativeQuoteTerminal = renderAdversativeQuoteCarrierTerminal(layer, ctx);
  if (adversativeQuoteTerminal !== null) {
    return adversativeQuoteTerminal;
  }
  const prelude = renderAuxLayerPrelude(layer, ctx, teFormRendering);
  if (prelude.kind === "outcome") {
    return prelude.outcome;
  }
  if (prelude.kind === "resume") {
    return renderAuxLayer(prelude.layer, prelude.ctx, teFormRendering);
  }
  layer = prelude.layer;
  ctx = prelude.ctx;
  if (layer.terminal === "attributive") {
    return renderAuxLayerAttributiveTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "renyou_chuushi") {
    return renderAuxLayerRenyouChuushiTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "adverbial_modifier") {
    return renderAuxLayerAdverbialModifierTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "nominalized") {
    return renderAuxLayerNominalizedTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal === "imperative") {
    return renderAuxLayerImperativeTerminal({ ...layer, terminal: null }, ctx);
  }
  if (layer.terminal !== null) {
    return { ok: false, reason: `terminal kind '${layer.terminal}' not supported in Phase 2.A` };
  }
  layer = layerWithAdjCopulaBridgeNegationSourceSplits(layer);
  if (layer.stem.kind === "noun") {
    return renderNounCopula(layer, ctx);
  }
  const stemIsCommittedAdverb = layer.stem.kind === "adverb";
  if (stemIsCommittedAdverb && !layer.ops.some(isExplicitAdverbialTailEvidenceOp)) {
    return { ok: false, reason: "adverb stem requires explicit adverbial tail evidence" };
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj" && layer.stem.kind !== "adverb") {
    return { ok: false, reason: `stem kind '${layer.stem.kind}' not supported in Phase 2.A` };
  }
  const adjTosuruResultative = renderAdjTosuruResultativePredicateCarrier(layer, ctx);
  if (adjTosuruResultative !== null) {
    return adjTosuruResultative;
  }
  if (layer.ops[0]?.kind === "copula") {
    return renderPredicateCopulaProjection(layer, ctx);
  }

  const state = newAuxLayerOpState();
  const chainableOperatorPath = collectOperatorChain(layer.ops);
  const chainableAspectOps = chainableOperatorPath.filter((op): op is Extract<OperatorOp, { readonly kind: "aspect" }> => op.kind === "aspect");
  const multiAspectFoldPath = multiAspectPathCanUseOperatorFold(chainableAspectOps);
  const requestTerminalBaseOps = commandTerminalBaseOperatorChain(layer.ops, isRequestCommandAspectOp);
  const requestTerminalBasePath = requestTerminalBaseOps.length > 0;
  const prohibitionTerminalBaseOps = commandTerminalBaseOperatorChain(layer.ops, isProhibitionCommandAspectOp);
  const prohibitionTerminalBasePath = prohibitionTerminalBaseOps.length > 0;
  const commandTerminalBasePath = requestTerminalBasePath || prohibitionTerminalBasePath;
  const operatorHeadIdx = layer.ops.findIndex(isOperatorWrapBoundaryHeadOp);

  const collectFailure = collectAuxLayerOps(layer, state, operatorHeadIdx, multiAspectFoldPath, commandTerminalBasePath);
  if (collectFailure !== null) {
    return collectFailure;
  }

  const past = state.preModalTense?.tense === "past";
  const formal = ctx.formal;
  const isVerb = layer.stem.kind === "verb";
  const stemLemma = layer.stem.lemma;
  const stemIrregular = layer.stem.kind === "adverb" ? null : irregularFrom(layer.stem.irregular);
  const stemShortNegationPolicy = layer.stem.shortNegationPolicy;
  const passiveStemOptions = passiveStemOptionsForStem(layer.stem);

  const warnings: Warning[] = [];

  pushStandaloneDesuPoliteWarning(layer, state.preModalPolite, warnings);


  if (state.postModalTense !== null && operatorHeadIdx === -1) {
    return { ok: false, reason: "post-operator TenseOp without operator head — invariant violation" };
  }
  if (state.postModalPolite !== null && operatorHeadIdx === -1) {
    return { ok: false, reason: "post-operator PoliteOp without operator head — invariant violation" };
  }

  const headOpKind = operatorHeadIdx !== -1 ? layer.ops[operatorHeadIdx]?.kind ?? null : null;
  const headIsModalOrConnective = headOpKind === "modal" || headOpKind === "connective";
  if (state.preModalPolite !== null && operatorHeadIdx !== -1 && !headIsModalOrConnective) {
    warnings.push({
      type: "non_standard_normalize",
      severity: "warning",
      opKind: "pre_operator_polite_normalize",
      message: "V ます + non-modal/non-connective operator 는 비표준 결합. polite 만 propagation 처리."
    });
  }
  const postPast = state.postModalTense?.tense === "past";
  let terminalTeFormConnective = false;
  if (state.connective !== null) {
    state.connective = utteranceFinalTeConnectiveForRender(connectiveForRender(state.connective, ctx), ctx);
    terminalTeFormConnective = teFormRendering === "auto" && (isTerminalTeFormConnective(state.connective, ctx) ||
      teConnectiveClosesQuotedUtterance(state.connective, ctx) ||
      renyouChuushiClosesUtterance(state.connective, ctx));
  }
  const rc: AuxLayerRenderContext = {
    layer,
    ctx,
    warnings,
    past,
    formal,
    isVerb,
    stemLemma,
    stemIrregular,
    stemShortNegationPolicy,
    passiveStemOptions,
    stemIsCommittedAdverb,
    postPast,
    terminalTeFormConnective,
    requestTerminalBaseOps,
    requestTerminalBasePath,
    prohibitionTerminalBaseOps,
    prohibitionTerminalBasePath
  };
  const committedAdverbConnective = renderCommittedAdverbStemConnective(rc, state);
  if (committedAdverbConnective !== null) {
    return committedAdverbConnective;
  }
  if (state.voice?.voice === "potential" && state.potentialKotoGaDekiru !== null) {
    state.voice = null;
  }

  const requestProhibitionQuote = renderRequestProhibitionQuoteTerminal(rc, state);
  if (requestProhibitionQuote !== null) {
    return requestProhibitionQuote;
  }

  const causativeItadakuCommitment = renderCausativeItadakuHumbleTerminal(rc, state);
  if (causativeItadakuCommitment !== null) {
    return causativeItadakuCommitment;
  }

  const opChain = collectOperatorChain(layer.ops);

  if (!commandTerminalBasePath && opChain.length >= 1) {
    return renderViaOperatorChain(rc, state, opChain);
  }

  return renderNonChainTail(rc, state);
}

function collectAuxLayerOps(
  layer: AuxLayerNode,
  state: AuxLayerOpState,
  operatorHeadIdx: number,
  multiAspectFoldPath: boolean,
  commandTerminalBasePath: boolean
): RenderFailure | null {
  for (let i = 0; i < layer.ops.length; i++) {
    const op = layer.ops[i]!;
    const subsetCheck = checkOpInSubset(op);
    if (!subsetCheck.ok) {
      return subsetCheck;
    }
    if (op.kind === "negation" || op.kind === "tense" || op.kind === "polite") {
      const wrapFailure = classifyAuxLayerWrapOp(state, op, i, operatorHeadIdx);
      if (wrapFailure !== null) {
        return wrapFailure;
      }
    } else if (op.kind === "classicalAuxResidue") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "obligation") {
      if (state.obligation !== null) {
        return { ok: false, reason: "multiple obligation ops not supported" };
      }
      state.obligation = op;
    } else if (op.kind === "idiom" && op.idiom === "forbidden") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_koto_wa") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_sumu") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "permission") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "inevitable_zaru_o_enai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "cannot_refrain_negative_dewa_irarenai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "method_you_ga_nai") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "negative_necessity_made_mo") {
      continue;
    } else if (op.kind === "idiom" && op.idiom === "only_option_shika_nai") {
      continue;
    } else if (op.kind === "modal") {
      if (state.modal === null) {
        state.modal = op;
      }
    } else if (op.kind === "scopeBridge") {
      continue;
    } else if (op.kind === "postverbAuxiliary") {
      continue;
    } else if (op.kind === "predicateProjectionCarrier") {
      continue;
    } else if (op.kind === "predicateQuoteCarrier") {
      continue;
    } else if (op.kind === "adjCopulaBridge") {
      continue;
    } else if (op.kind === "copula") {
      const copula = classifyAuxLayerCopulaOp(state, layer, op, i, operatorHeadIdx);
      if (!("nextIndex" in copula)) {
        return copula;
      }
      i = copula.nextIndex;
      continue;
    } else if (op.kind === "conjecture") {
      if (state.conjecture !== null) {
        return { ok: false, reason: "multiple ConjectureOps in single layer not supported" };
      }
      state.conjecture = op;
    } else if (op.kind === "desire") {
      if (state.desire !== null) {
        if (
          state.desireIdx !== null &&
          layer.ops.slice(state.desireIdx + 1, i).some((between) => chainFinalOpHostCategory(between) === "verbal_predicate")
        ) {
          state.desire = op;
          state.desireIdx = i;
          continue;
        }
        return { ok: false, reason: "multiple DesireOps in single layer not supported" };
      }
      state.desire = op;
      state.desireIdx = i;
    } else if (op.kind === "voice") {
      const voiceFailure = classifyAuxLayerVoiceOp(state, layer, op, i);
      if (voiceFailure !== null) {
        return voiceFailure;
      }
    } else if (op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru") {
      if (state.potentialKotoGaDekiru !== null) {
        return { ok: false, reason: "multiple PotentialKotoGaDekiru ops not supported" };
      }
      state.potentialKotoGaDekiru = op;
    } else if (op.kind === "connective") {
      if (state.connective !== null) {
        return { ok: false, reason: "multiple connective ops in single layer not supported" };
      }
      if (i !== layer.ops.length - 1) {
        return { ok: false, reason: "ConnectiveOp not at last position — multi-clause chain not yet supported" };
      }
      state.connective = op;
    } else if (op.kind === "aspect") {
      const aspectFailure = classifyAuxLayerAspectOp(state, op, multiAspectFoldPath, commandTerminalBasePath);
      if (aspectFailure !== null) {
        return aspectFailure;
      }
    }
  }
  return null;
}

function classifyAuxLayerWrapOp(
  state: AuxLayerOpState,
  op: Extract<AuxOpNode, { readonly kind: "negation" | "tense" | "polite" }>,
  i: number,
  operatorHeadIdx: number
): RenderFailure | null {
  if (op.kind === "negation") {
    if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
      if (state.preModalNeg !== null) {
        return { ok: false, reason: "multiple pre-reference NegationOps in single layer not supported" };
      }
      state.preModalNeg = op;
    } else {
      if (state.postModalNeg === null) {
        state.postModalNeg = op;
      }
      state.postModalNegations.push(op);
    }
  } else if (op.kind === "tense") {
    if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
      if (state.preModalTense !== null) {
        return { ok: false, reason: "multiple pre-reference TenseOps in single layer not supported" };
      }
      state.preModalTense = op;
    } else {
      if (state.postModalTense === null) {
        state.postModalTense = op;
      }
      state.postModalTenses.push(op);
    }
  } else if (op.kind === "polite") {
    if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
      if (state.preModalPolite !== null) {
        if (isRedundantPoliteCarry(state.preModalPolite, op)) {
          return null;
        }
        return { ok: false, reason: "multiple pre-reference PoliteOps in single layer not supported" };
      }
      state.preModalPolite = op;
    } else {
      if (state.postModalPolite !== null) {
        if (isRedundantPoliteCarry(state.postModalPolite, op)) {
          return null;
        }
        return { ok: false, reason: "multiple post-reference PoliteOps in single layer not supported" };
      }
      state.postModalPolite = op;
    }
  }
  return null;
}

function classifyAuxLayerCopulaOp(
  state: AuxLayerOpState,
  layer: AuxLayerNode,
  op: Extract<AuxOpNode, { readonly kind: "copula" }>,
  i: number,
  operatorHeadIdx: number
): RenderFailure | { readonly nextIndex: number } {
  if (op.variant === "conditional_nara") {
    if (state.connective !== null) {
      return { ok: false, reason: "multiple ConnectiveOps (via copula projection) not supported" };
    }
    state.connective = createConnectiveOp({  connective: "conditional", surface: "なら", source: op.source });
  } else if (op.polarity === "negative") {
    const nextOp = layer.ops[i + 1];
    const followingNeg = nextOp?.kind === "negation" ? nextOp : null;
    const negOp = predicateCopulaNegationOp(op, followingNeg);
    if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
      if (state.preModalNeg !== null) {
        return { ok: false, reason: "multiple pre-reference NegationOps (via copula projection) not supported" };
      }
      state.preModalNeg = negOp;
    } else {
      if (state.postModalNeg === null) {
        state.postModalNeg = negOp;
      }
      state.postModalNegations.push(negOp);
    }
    if (followingNeg !== null) {
      i++;
    }
  }
  if (op.polite) {
    const politeOp: PoliteOp = createPoliteOp({  source: op.source });
    if (operatorHeadIdx === -1 || i < operatorHeadIdx) {
      if (state.preModalPolite === null) {
        state.preModalPolite = politeOp;
      }
    } else {
      if (state.postModalPolite === null) {
        state.postModalPolite = politeOp;
      }
    }
  }
  return { nextIndex: i };
}

function classifyAuxLayerAspectOp(
  state: AuxLayerOpState,
  op: Extract<AuxOpNode, { readonly kind: "aspect" }>,
  multiAspectFoldPath: boolean,
  commandTerminalBasePath: boolean
): RenderFailure | null {
  if (state.aspect !== null || state.benefactive !== null || state.request !== null || state.prohibition !== null ||
    state.desiderative !== null || state.miseru !== null) {
    if (!multiAspectFoldPath && !commandTerminalBasePath) {
      return { ok: false, reason: "multiple aspect ops in single layer not supported" };
    }
  }
  if (op.aspect === "te_iru" || op.aspect === "te_aru" || op.aspect === "te_oku" ||
    op.aspect === "te_shimau" || op.aspect === "te_miru" || op.aspect === "te_kuru" ||
    op.aspect === "te_iku" || op.aspect === "te_mawaru" || op.aspect === "tsutsu_aru") {
    state.aspect ??= op;
  } else if (isBenefactiveAspectKind(op.aspect)) {
    state.benefactive ??= op as BenefactiveAspectOp;
  } else if (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu") {
    state.request ??= op;
  } else if (op.aspect === "naide_kudasai") {
    state.prohibition ??= op;
  } else if (op.aspect === "te_hoshii") {
    state.desiderative ??= op;
  } else if (op.aspect === "te_miseru") {
    state.miseru ??= op;
  } else {
    return { ok: false, reason: `aspect kind '${op.aspect}' not yet supported` };
  }
  return null;
}

function pushStandaloneDesuPoliteWarning(
  layer: AuxLayerNode,
  preModalPolite: PoliteOp | null,
  warnings: Warning[]
): void {
  if (preModalPolite !== null) {
    const pSrc = preModalPolite.source.tokens[0];
    const isStandaloneDesu = pSrc !== undefined && (pSrc.pos & POS4) === 助動詞_デス;
    if (isStandaloneDesu && layer.stem.kind === "verb") {
      const desireIdx = layer.ops.findIndex((op) => op.kind === "desire");
      const desireKeepsAdjectival = desireIdx >= 0 &&
        !layer.ops.slice(desireIdx + 1).some((op) => chainFinalOpHostCategory(op) === "verbal_predicate");
      if (!desireKeepsAdjectival) {
        warnings.push({
          type: "non_standard_normalize",
          severity: "warning",
          opKind: "desu_polite_normalize",
          message: "V + です 는 비표준 결합 (식 食べるです 등 colloquial polite-negative 포함). polite 만 정규화 처리."
        });
      }
    }
  }
}

function renderCommittedAdverbStemConnective(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, stemLemma, stemIsCommittedAdverb } = rc;
  const { preModalNeg, preModalTense, postModalNegations, postModalTenses, preModalPolite, postModalPolite, connective } = state;
  if (
    stemIsCommittedAdverb &&
    connective !== null &&
    layer.ops.every((op) => op.kind === "connective") &&
    preModalNeg === null &&
    preModalTense === null &&
    preModalPolite === null &&
    postModalNegations.length === 0 &&
    postModalTenses.length === 0 &&
    postModalPolite === null
  ) {
    return {
      ok: true,
      text: stemLemma,
      polite: false,
      traced: [{
        text: stemLemma,
        sourceTokens: layer.stem.source.tokens,
        kind: "lexeme",
        projectionConfidence: "semantic"
      }]
    };
  }
  return null;
}

function punctuatedFiniteObligationClause(layer: AuxLayerNode, ctx: RenderContext): boolean {
  const obligation = layer.ops.find((op) => op.kind === "idiom" && op.idiom === "obligation");
  const lastSourceIdx = obligation?.source.tokenIndices.at(-1);
  if (lastSourceIdx === undefined) {
    return false;
  }
  if (layer.terminalPayload?.kind === "attributiveBoundary") {
    return hasSeparatedFinitePredicateBoundary(
      layer.terminalPayload.projectionContext.tokens,
      layer.terminalPayload.head.tokenIdx,
    );
  }
  if (ctx.layout === undefined) {
    return false;
  }
  const clause = ctx.layout.clauseOfToken(lastSourceIdx);
  return clause?.terminatedBy === "punctuation" && clause.end <= lastSourceIdx + 2;
}

export function projectMidPredicateCopulaLayer(
  layer: AuxLayerNode,
  options: {
    readonly projectAffirmativeBasic?: boolean;
    readonly projectNegativeBasic?: boolean;
  } = {}
): AuxLayerNode | RenderOutcome | null {
  for (let i = 1; i < layer.ops.length; i++) {
    const op = layer.ops[i];
    if (op?.kind !== "copula") {
      continue;
    }
    if (op.variant === "conditional_nara") {
      if (op.polarity !== "affirmative") {
        return { ok: false, reason: "negative mid-chain predicate copula conditional projection not supported" };
      }
      return {
        ...layer,
        ops: [
          ...layer.ops.slice(0, i),
          copulaVariantConnective(op, "なら", "conditional"),
          ...layer.ops.slice(i + 1)
        ]
      };
    }
    if (op.polarity === "affirmative") {
      if (options.projectAffirmativeBasic === true) {
        return {
          ...layer,
          ops: [
            ...layer.ops.slice(0, i),
            ...(op.polite ? [createPoliteOp({  source: op.source })] : []),
            ...layer.ops.slice(i + 1)
          ]
        };
      }
      continue;
    }
    if (options.projectNegativeBasic === false) {
      continue;
    }
    const nextOp = layer.ops[i + 1];
    const followingNegation = nextOp?.kind === "negation"
      ? nextOp
      : null;
    return {
      ...layer,
      ops: [
        ...layer.ops.slice(0, i),
        predicateCopulaNegationOp(op, followingNegation),
        ...(op.polite ? [createPoliteOp({  source: op.source })] : []),
        ...layer.ops.slice(i + (followingNegation === null ? 1 : 2))
      ]
    };
  }
  return null;
}

function layerWithAdjCopulaBridgeNegationSourceSplits<T extends AuxLayerNode>(layer: T): T {
  let pendingBridge: AdjCopulaBridgeOp | null = null;
  let changed = false;
  const ops = layer.ops.map((op): AuxOpNode => {
    if (op.kind === "adjCopulaBridge") {
      pendingBridge = op;
      return op;
    }
    if (op.kind === "negation") {
      const negation = negationWithAdjCopulaBridgeSourceSplit(op, pendingBridge);
      changed = changed || negation !== op;
      pendingBridge = null;
      return negation;
    }
    if (op.kind !== "polite" && op.kind !== "tense" && op.kind !== "classicalAuxResidue") {
      pendingBridge = null;
    }
    return op;
  });
  return changed ? { ...layer, ops } : layer;
}

function negationWithAdjCopulaBridgeSourceSplit(
  negation: NegationOp,
  bridge: AdjCopulaBridgeOp | null
): NegationOp {
  if (bridge === null || negation.sourceSplit !== undefined) {
    return negation;
  }
  return {
    ...negation,
    sourceSplit: {
      kind: "predicate_copula_negative",
      bridgeTokens: bridge.source.tokens,
      finalTokens: negation.source.tokens
    }
  };
}

export function renderCommittedAttributiveTerminalLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome {
  const normalizedLayer = layerWithQuotedCarrierProhibition(layer) ?? layer;
  const prelude = renderAuxLayerPrelude(normalizedLayer, ctx);
  if (prelude.kind === "outcome") {
    return prelude.outcome;
  }
  if (prelude.kind === "resume") {
    return renderAuxLayer(prelude.layer, prelude.ctx);
  }
  return renderAuxLayerAttributiveTerminal({ ...prelude.layer, terminal: null }, prelude.ctx);
}

function renderAdversativeQuoteCarrierAttributive(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    connective?.kind !== "connective" ||
    connective.connective !== "adversative"
  ) {
    return null;
  }
  const clause = renderAuxLayer(
    { ...layer, ops: withoutAttributiveInternalPoliteness(ops.slice(0, -1)), terminal: null },
    ctx
  );
  if (!clause.ok) return clause;
  return {
    ok: true,
    text: `${clause.text}${headRequiresFutureAttributiveProjection(layer)
      ? `${selectParticle(clause.text, "이라고/라고")} 할`
      : selectParticle(clause.text, "이라는/라는")}`,
    polite: false,
    ...(clause.stemPrefixApplied === true ? { stemPrefixApplied: true } : {})
  };
}

function renderAdversativeQuoteCarrierTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    layer.terminal !== null ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    carrier.sourceTerminal !== true ||
    connective?.kind !== "connective" ||
    connective.connective !== "adversative"
  ) {
    return null;
  }
  const clause = renderAuxLayer({ ...layer, ops: ops.slice(0, -1), terminal: null }, ctx);
  if (!clause.ok) return clause;
  const restoredHost = predicateQuoteCarrierRestoredHost(carrier);
  const host = restoredHost.kind === "lemma"
    ? composeFinalForm(
      restoredHost.lemma, restoredHost.irregular, restoredHost.isVerb,
      false, ctx.formal, clause.polite, ctx.lookups
    )
    : null;
  if (host === null) {
    return null;
  }
  const text = `${clause.text}${selectParticle(clause.text, "이라고/라고")} ${host}`;
  return {
    ok: true,
    text,
    polite: clause.polite,
    ...(clause.stemPrefixApplied === true ? { stemPrefixApplied: true } : {})
  };
}

export function renderAuxLayerAttributiveTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext,
  options: { readonly nominalizedTerminal?: boolean } = {}
): RenderOutcome {
  return withMoodSourceBoundToFinalTraceSegment(
    renderAuxLayerAttributiveTerminalChain(layer, ctx, options),
    layer
  );
}

function renderAuxLayerAttributiveTerminalChain(
  layer: AuxLayerNode,
  ctx: RenderContext,
  options: { readonly nominalizedTerminal?: boolean } = {}
): RenderOutcome {
  const carrierInternalNormalized = normalizeCarrierInternalConnectives(layer);
  if (carrierInternalNormalized !== null) {
    return renderAuxLayerAttributiveTerminalChain(carrierInternalNormalized, ctx, options);
  }
  const adversativeQuoteCarrier = renderAdversativeQuoteCarrierAttributive(layer, ctx);
  if (adversativeQuoteCarrier !== null) {
    return adversativeQuoteCarrier;
  }
  if (layer.stem.kind === "noun" && layer.ops.length === 0 && layer.attributiveMood === undefined) {
    return {
      ok: true,
      text: layer.stem.lemma,
      polite: false,
      traced: tracedSeg(layer.stem.lemma, layer.stem.source.tokens, "lexeme", "semantic")
    };
  }
  if (
    layer.ops.length > 0 &&
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    const bridged = renderNounCopulaAttributiveTerminal(
      { ...layer, stem: layer.stem, ops: nominalTargetCopulaBridgeOps(layer.ops) },
      ctx
    );
    if (bridged.ok) {
      return bridged;
    }
  }
  const implicitNounHeadChain = renderAttributiveImplicitNounHeadChain(layer, ctx);
  if (implicitNounHeadChain !== null) {
    return implicitNounHeadChain;
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "modal" && layer.ops[0].modal === "youda") {
    return renderNominalHostLikeness(layer.stem.lemma, layer.ops, ctx, attributiveProjectionPolicy(layer));
  }
  if (layer.stem.kind === "noun" && isTosuruPredicateCarrier(layer.ops[0])) {
    return renderNounTosuruAttributiveTerminal(layer, ctx);
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "scopeBridge") {
    return renderNounScopeBridgeAttributiveTerminal(layer, ctx);
  }
  const nounProjectionCarrier = renderNounProjectionCarrierAttributiveTerminal(layer, ctx);
  if (nounProjectionCarrier !== null) {
    return nounProjectionCarrier;
  }
  if (layer.stem.kind === "noun" && layer.ops[0]?.kind === "copula") {
    return renderNounCopulaAttributiveTerminal(layer, ctx);
  }
  if ((layer.stem.kind === "verb" || layer.stem.kind === "adj") && layer.ops[0]?.kind === "copula") {
    return renderPredicateCopulaAttributiveProjection(layer, ctx);
  }
  const bareQuoteBody = renderBareNominalLikePredicateQuoteAttributiveTerminal(layer);
  if (bareQuoteBody !== null) {
    return bareQuoteBody;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "attributive terminal currently supports verb/adj stem only" };
  }
  const operatorHeadIdx = layer.ops.findIndex(isHeadOp);
  const requestAttributiveOp = commandAttributiveAspectOp(layer.ops, isRequestCommandAspectOp) ??
    commandAttributiveAspectOpWithQuotedPostChain(layer.ops, isRequestCommandAspectOp) ??
    commandAttributiveAspectOpBeforeLikeness(layer.ops, isRequestCommandAspectOp);
  const prohibitionAttributiveOp = commandAttributiveAspectOp(layer.ops, isProhibitionCommandAspectOp) ??
    commandAttributiveAspectOpWithQuotedPostChain(layer.ops, isProhibitionCommandAspectOp) ??
    commandAttributiveAspectOpBeforeLikeness(layer.ops, isProhibitionCommandAspectOp);
  const conditionalMannerMode = conditionalCompactQuoteMannerMode(layer, ctx);
  const state: AttributiveWrapOpState = {
    preModalNeg: null,
    preModalTense: null,
    postModalNegations: [],
    postModalTenses: []
  };
  const wrapFailure = collectAttributiveWrapOps(layer, state, operatorHeadIdx, requestAttributiveOp, prohibitionAttributiveOp, conditionalMannerMode);
  if (wrapFailure !== null) {
    return wrapFailure;
  }
  const stemLemma = layer.stem.lemma;
  const stemIrregular = irregularFrom(layer.stem.irregular);
  const isVerb = layer.stem.kind === "verb";
  const formal = ctx.formal;
  const boundaryRequestsFuture = attributiveBoundaryRequestsFutureProjection(layer);
  const sequenceAfterQuote = layer.ops
    .filter((op): op is ConnectiveOp => op.kind === "connective")
    .map((op) => attributiveSequenceAfterQuoteCarrier(layer, op, conditionalMannerMode))
    .find((match) => match !== null);
  const ac: AttributiveTerminalChainContext = {
    layer: layer as AuxLayerNode & { readonly stem: Extract<StemNode, { readonly kind: "verb" | "adj" }> },
    ctx,
    options,
    stemLemma,
    stemIrregular,
    isVerb,
    formal,
    boundaryRequestsFuture
  };
  if (sequenceAfterQuote !== undefined && sequenceAfterQuote !== null) {
    return renderAttributiveSequenceAfterQuote(ac, state, sequenceAfterQuote);
  }
  const requestProhibitionQuote = renderRequestProhibitionQuoteAttributive(ac, state, requestAttributiveOp, prohibitionAttributiveOp);
  if (requestProhibitionQuote !== null) {
    return requestProhibitionQuote;
  }
  const fullOpChain = collectOperatorChain(layer.ops);
  const opChain = fullOpChain.filter((op) =>
    !(op.kind === "aspect" && op.aspect === "te_iru" && op.semantic?.renderStrategy === "attributive_drop_aux")
  );
  if (opChain.length === 0 && fullOpChain.length > 0) {
    if (state.preModalTense === null && state.postModalTenses.length === 1) {
      state.preModalTense = state.postModalTenses[0]!;
      state.postModalTenses.length = 0;
    }
    if (state.preModalNeg === null && state.postModalNegations.length === 1) {
      state.preModalNeg = state.postModalNegations[0]!;
      state.postModalNegations.length = 0;
    }
  }
  const hazuNegativePropositionAttributive = renderHazuNegativePropositionAttributiveTerminal({
    layer,
    opChain,
    stemLemma,
    stemIrregular,
    isVerb,
    formal,
    lookups: ctx.lookups
  });
  if (hazuNegativePropositionAttributive !== null) {
    return hazuNegativePropositionAttributive;
  }
  if (opChain.length > 0) {
    return renderAttributiveOperatorChain(ac, state, opChain);
  }
  return renderAttributiveSimpleStemTail(ac, state);
}

function renderAttributiveImplicitNounHeadChain(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  const implicitNounHead = layer.ops[0];
  if (
    layer.stem.kind === "noun" &&
    implicitNounHead !== undefined &&
    (
      implicitNounHead.kind === "conjecture" ||
      implicitNounHead.kind === "aspect" ||
      implicitNounHead.kind === "idiom" ||
      implicitNounHead.kind === "postverbAuxiliary" ||
      (implicitNounHead.kind === "modal" && implicitNounHead.modal !== "youda") ||
      (implicitNounHead.kind === "connective" && implicitNounHead.connective === "reformulation")
    )
  ) {
    const implicitCopula: Extract<AuxOpNode, { readonly kind: "copula" }> = createCopulaOp({

      source: { tokens: [], tokenIndices: [] },
      variant: "basic",
      polarity: "affirmative",
      polite: false
    });
    const implicitLayer = { ...layer, stem: layer.stem, ops: [implicitCopula, ...layer.ops] };
    const modalFirstBridgeAdmitted = implicitNounHead.kind === "modal" &&
      (isYotaiAppearanceModalOp(implicitNounHead) || layer.stem.sourcePredicateShape === "nominal");
    const centralized = implicitNounHead.kind === "conjecture"
      ? renderNounCopulaAttributiveTerminal(implicitLayer, ctx)
      : renderNounCopulaAttributiveOperatorChain(implicitLayer, implicitCopula, ctx, {
        admitModalFirstHead: modalFirstBridgeAdmitted
      });
    if (centralized !== null) {
      return centralized;
    }
  }
  return null;
}

function renderPredicateCopulaAttributiveProjection(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return { ok: false, reason: "predicate copula attributive projection requires committed V/A stem" };
  }
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "predicate copula attributive projection requires CopulaOp as first op" };
  }
  if (copula.variant !== "basic") {
    return { ok: false, reason: `predicate copula attributive variant '${copula.variant}' not supported` };
  }
  const tailOps = layer.ops.slice(1);
  const projectedOps: AuxOpNode[] = [];
  let restOps: readonly AuxOpNode[] = tailOps;
  if (copula.polarity === "negative") {
    const followingNegation = tailOps[0]?.kind === "negation"
      ? tailOps[0]
      : null;
    projectedOps.push(predicateCopulaNegationOp(copula, followingNegation));
    restOps = followingNegation === null ? tailOps : tailOps.slice(1);
  }
  projectedOps.push(...restOps.filter((op) => op.kind !== "polite"));
  return renderAuxLayerAttributiveTerminal({ ...layer, ops: projectedOps, terminal: null }, ctx);
}

function renderAuxLayerRenyouChuushiTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.ops.some((op) => op.kind === "connective")) {
    return { ok: false, reason: "renyou_chuushi terminal cannot contain existing connective op" };
  }
  const causeHead = renderCauseHeadRenyouChuushi(layer);
  if (causeHead !== null) {
    return causeHead;
  }
  const negativeNounCopula = renderNegativeNounCopulaRenyouChuushi(layer, ctx);
  if (negativeNounCopula !== null) {
    return negativeNounCopula;
  }
  const payload = layer.terminalPayload?.kind === "renyouChuushi"
    ? layer.terminalPayload
    : undefined;
  const source = payload?.source ?? lastLayerSource(layer);
  if (source === null) {
    return { ok: false, reason: "renyou_chuushi terminal has no source anchor" };
  }
  const connective: ConnectiveOp = createConnectiveOp({

    connective: "te_form",
    surface: RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE,
    ...(payload?.teFormRole === undefined ? {} : { teFormRole: payload.teFormRole }),
    source: renyouChuushiConnectiveSource(layer, source)
  });
  return renderAuxLayer({ ...layer, terminal: null, ops: [...layer.ops, connective] }, ctx);
}

function renyouChuushiConnectiveSource(layer: AuxLayerNode, source: OpSource): OpSource {
  const lastOp = layer.ops.at(-1);
  if (
    lastOp?.kind !== "aspect" ||
    source.tokens.length <= 1 ||
    !opSourceTokensEqual(source, lastOp.source)
  ) {
    return source;
  }
  const first = source.tokens[0];
  if (first?.surface !== "て" && first?.surface !== "で") {
    return source;
  }
  return {
    tokens: source.tokens.slice(1),
    tokenIndices: source.tokenIndices.slice(1)
  };
}

function opSourceTokensEqual(left: OpSource, right: OpSource): boolean {
  if (left.tokens.length !== right.tokens.length) {
    return false;
  }
  return left.tokens.every((token, index) => token === right.tokens[index]);
}

function renderAuxLayerAdverbialModifierTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  const soudaYotaiSource = soudaYotaiAdverbialModifierSource(layer.ops) ??
    declaredProjectionCarrierAdverbialSource(layer.ops);
  if (soudaYotaiSource !== null) {
    const connective: ConnectiveOp = createConnectiveOp({
      connective: "predicate_projection_manner_simile_action",
      surface: "に",
      source: soudaYotaiSource
    });
    return renderAuxLayer({ ...layer, terminal: null, ops: [...layer.ops, connective] }, ctx);
  }
  const stem = layer.stem;
  if (stem.kind === "adj" || stem.kind === "verb") {
    return {
      ok: true,
      text: conjugate(stem.lemma, irregularFrom(stem.irregular), "게"),
      polite: false
    };
  }
  if (stem.kind === "noun") {
    return {
      ok: true,
      text: `${stem.lemma}${selectParticle(stem.lemma, "으로/로")}`,
      polite: false
    };
  }
  if (stem.kind === "adverb") {
    return { ok: true, text: stem.lemma, polite: false };
  }
  return { ok: false, reason: `adverbial_modifier terminal unsupported stem kind '${stem.kind}'` };
}

function isYotaiAppearanceModalOp(op: AuxOpNode): boolean {
  return op.kind === "modal" && op.modal === "souda_hearsay" && op.reading === "yotai";
}

function soudaYotaiAdverbialModifierSource(ops: readonly AuxOpNode[]): OpSource | null {
  const last = ops.at(-1);
  if (last === undefined || !isYotaiAppearanceModalOp(last)) {
    return null;
  }
  const niIdx = last.source.tokens.findIndex((token, index) =>
    copulaNiMarkerRelationForToken(token, index, {
      consumers: ["tail_render"]
    }) !== null
  );
  if (niIdx === -1) {
    return null;
  }
  return {
    tokens: [last.source.tokens[niIdx]!],
    tokenIndices: [last.source.tokenIndices[niIdx]!]
  };
}

function declaredProjectionCarrierAdverbialSource(ops: readonly AuxOpNode[]): OpSource | null {
  const last = ops.at(-1);
  if (
    last?.kind !== "predicateProjectionCarrier" ||
    declaredProjectionCarrierBranchTerminal(last.sourceAllomorph) !== "adverbial_modifier"
  ) {
    return null;
  }
  const followerIdx = last.source.tokens.length - 1;
  if (followerIdx < 0) {
    return null;
  }
  return {
    tokens: [last.source.tokens[followerIdx]!],
    tokenIndices: [last.source.tokenIndices[followerIdx]!]
  };
}

function renderCauseHeadRenyouChuushi(layer: AuxLayerNode): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const copula = layer.ops[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return null;
  }
  const sourceForm = layer.stem.source.tokens[layer.stem.semanticAnchors[0] ?? 0]?.dictionaryForm;
  if (sourceForm !== "せい" && sourceForm !== "おかげ") {
    return null;
  }
  return { ok: true, text: `${layer.stem.lemma}에`, polite: false };
}

function renderNegativeNounCopulaRenyouChuushi(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.stem.kind !== "noun" || layer.ops.length !== 1) {
    return null;
  }
  const copula = layer.ops[0];
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "negative" ||
    copula.polite
  ) {
    return null;
  }
  const noun = layer.stem.lemma;
  const host = nounCopulaStemAllomorphHost(layer.stem, ctx, noun);
  const split = splitNegativeNounCopulaSourceTokens(copula.source.tokens);
  const traced = noun.length > 0 && split.carrierTokens.length > 0 && split.finalTokens.length > 0
    ? tracedCat(
      tracedSeg(noun, layer.stem.source.tokens, "lexeme", "semantic"),
      tracedSeg(`${nounSubjectPart(noun, host).slice(noun.length)} `, split.carrierTokens, "aux", "semantic"),
      tracedSeg("아니라", split.finalTokens, "aux", "semantic")
    )
    : undefined;
  return {
    ok: true,
    text: `${nounSubjectPart(noun, host)} 아니라`,
    polite: false,
    ...(traced === undefined ? {} : { traced })
  };
}

function quotativeMannerSimileAttributiveFinalConnective(
  layer: AuxLayerNode
): ConnectiveOp | null {
  const last = layer.ops[layer.ops.length - 1];
  return last?.kind === "connective" &&
    last.connective === "predicate_projection_quotative_manner_simile_attributive"
    ? last
    : null;
}

function renderAuxLayerNominalizedTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (
    layer.ops[0]?.kind !== "copula" &&
    stemIsAdjectivalSourceWithNominalTarget(layer.stem)
  ) {
    layer = { ...layer, ops: nominalTargetCopulaBridgeOps(layer.ops) };
  }
  const attr = quotativeMannerSimileAttributiveFinalConnective(layer) !== null
    ? renderAuxLayer(layer, ctx)
    : renderAuxLayerAttributiveTerminal(layer, ctx, { nominalizedTerminal: true });
  if (!attr.ok) {
    return attr;
  }
  const nominalizerSourceTokens = layer.terminalPayload?.kind === "nominalized"
    ? layer.terminalPayload.source.tokens
    : [];
  return {
    ok: true,
    text: `${attr.text} 것`,
    polite: false,
    ...(attr.stemPrefixApplied === undefined ? {} : { stemPrefixApplied: attr.stemPrefixApplied }),
    ...(attr.traced === undefined
      ? {}
      : {
        traced: tracedCat(
          attr.traced,
          tracedSeg(" 것", nominalizerSourceTokens, "aux", "semantic")
        )
      })
  };
}

function renderNounCopulaExemplificationQuoteCarrierAttributive(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  const ops = layer.ops;
  const carrier = ops[ops.length - 1];
  const connective = ops[ops.length - 2];
  if (
    ops.length < 3 ||
    ops[0]?.kind !== "copula" ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    connective?.kind !== "connective" ||
    connective.connective !== "exemplification"
  ) {
    return null;
  }
  const clause = renderNounCopula(
    { ...layer, ops: withoutAttributiveInternalPoliteness(ops.slice(0, -1)), terminal: null },
    ctx
  );
  if (!clause.ok) return clause;
  return {
    ok: true,
    text: `${clause.text} ${headRequiresFutureAttributiveProjection(layer) ? "할" : "하는"}`,
    polite: false
  };
}

function renderNounCopulaAttributiveTerminal(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome {
  if (layer.stem.kind !== "noun") {
    return { ok: false, reason: "noun copula attributive terminal requires noun stem" };
  }
  const reasonQuote = legacyNounCopulaReasonQuoteAttributive(layer, ctx);
  if (reasonQuote !== null) {
    return reasonQuote;
  }
  const noun = layer.stem.lemma;
  const copula = layer.ops[0];
  if (copula?.kind !== "copula") {
    return { ok: false, reason: "noun copula attributive terminal requires CopulaOp as first op" };
  }
  if (copula.variant === "conditional_nara") {
    if (copula.polarity !== "affirmative" || copula.polite || layer.ops.length !== 1) {
      return { ok: false, reason: "noun copula conditional_nara attributive composition not supported" };
    }
    const naraEnding = selectParticle(nounCopulaStemAllomorphHost(layer.stem, ctx, noun) ?? noun, "이라면/라면");
    return {
      ok: true,
      text: `${noun}${naraEnding}`,
      polite: false,
      ...(noun.length > 0
        ? {
          traced: tracedCat(
            tracedSeg(noun, layer.stem.source.tokens, "lexeme", "semantic"),
            tracedSeg(naraEnding, copula.source.tokens, "aux", "semantic")
          )
        }
        : {})
    };
  }
  const centralizedAttributive = renderNounCopulaAttributiveOperatorChain(
    { ...layer, stem: layer.stem },
    copula,
    ctx
  );
  if (centralizedAttributive !== null) {
    return centralizedAttributive;
  }
  const exemplificationQuoteCarrier =
    renderNounCopulaExemplificationQuoteCarrierAttributive(layer, ctx);
  if (exemplificationQuoteCarrier !== null) {
    return exemplificationQuoteCarrier;
  }
  if (copula.variant !== "basic") {
    return { ok: false, reason: `noun copula attributive variant '${copula.variant}' not supported` };
  }
  const nounLayer = layer as AuxLayerNode & { readonly stem: NounStem };
  const conjectureAttributive = renderNounCopulaConjectureAttributiveChain(nounLayer, ctx, noun, copula);
  if (conjectureAttributive !== null) {
    return conjectureAttributive;
  }
  const postverbAttributive = renderNounCopulaPostverbAttributiveTerminal(layer, ctx, noun, copula);
  if (postverbAttributive !== null) {
    return postverbAttributive;
  }
  const state: NounCopulaAttributiveOpState = {
    past: false,
    externalNegation: null,
    modalChain: [],
    postModalNeg: null,
    postModalPast: false,
    predicateQuoteCarrier: null
  };
  const collectFailure = collectNounCopulaAttributiveOps(layer, state);
  if (collectFailure !== null) {
    return collectFailure;
  }
  const quoteAttributive = renderNounCopulaPredicateQuoteAttributive(nounLayer, ctx, noun, copula, state);
  if (quoteAttributive !== null) {
    return quoteAttributive;
  }
  const modalAttributive = renderNounCopulaModalChainAttributive(nounLayer, ctx, noun, copula, state);
  if (modalAttributive !== null) {
    return modalAttributive;
  }
  return renderNounCopulaSimpleAttributiveTail(nounLayer, ctx, noun, copula, state);
}

function renderNounCopulaPostverbAttributiveTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext,
  noun: string,
  copula: AuxOpNode
): RenderOutcome | null {
  if (
    copula.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    copula.polite
  ) {
    return null;
  }
  const postverb = layer.ops[1];
  const postverbCarrier = postverb?.source.tokens.at(-1);
  if (
    postverb?.kind !== "postverbAuxiliary" ||
    postverbCarrier?.dictionaryForm !== "なる"
  ) {
    return null;
  }
  const postOps = layer.ops.slice(2);
  if (!postOps.every((op) =>
    isChainableHeadOp(op) ||
    op.kind === "aspect" ||
    op.kind === "tense" ||
    op.kind === "polite" ||
    op.kind === "connective"
  )) {
    return null;
  }
  const source = {
    tokens: [
      ...layer.stem.source.tokens,
      ...copula.source.tokens,
      ...postverb.source.tokens
    ],
    tokenIndices: [
      ...layer.stem.source.tokenIndices,
      ...copula.source.tokenIndices,
      ...postverb.source.tokenIndices
    ]
  };
  const syntheticLayer: AuxLayerNode = {
    ...layer,
    stem: {
      kind: "verb",
      lemma: "되다",
      conj: "godan",
      irregular: null,
      source,
      conjugationAnchor: source.tokens.length - 1,
      semanticAnchors: [0],
      koreanPrefix: `${nounSubjectPart(noun, nounCopulaStemAllomorphHost(layer.stem, ctx, noun))} `
    },
    ops: postOps
  };
  return renderAuxLayerAttributiveTerminal(syntheticLayer, ctx);
}

function isRedundantPoliteCarry(existing: PoliteOp, next: PoliteOp): boolean {
  return opSourceHasPos4(existing.source, 助動詞_マス) && opSourceHasPos4(next.source, 助動詞_デス);
}

function opSourceHasPos4(source: OpSource, pos4: number): boolean {
  return source.tokens.some((token) => (token.pos & POS4) === pos4);
}

function isExplicitAdverbialTailEvidenceOp(op: AuxOpNode): boolean {
  if (op.kind === "connective") {
    return true;
  }
  return op.kind === "postverbAuxiliary" &&
    (
      op.auxiliary.kind === "adverbial_change" ||
      op.auxiliary.kind === "adverbial_change_potential" ||
      op.auxiliary.kind === "adverbial_control"
    );
}
