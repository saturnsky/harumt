import { roleCatNyaSuffix, yoneConfirmSuffix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim } from "../../../../../generator/particles.js";
import { POS5A, 意志推量形_ } from "../../../../../types/pos.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { quotedTerminalMoodComplementizer } from "../../../../semantics/sfp-quote-projection.js";
import { assertNever, stemInflectionCarriesVolitionalMood, type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type ConjectureOp, type NegationOp, type OpSource, type ProhibitionAspectOp, type QuoteBoundaryFocusParticle, type RequestAspectOp, type SfpEffect, type SfpNode, type TailRoot, type TenseOp } from "../grammar.js";
import { ensureQuestionPunctuation, lemmaPredicateBase, nounCopulaFinalAllomorphHost, opCarriesTerminalRolePoliteness, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicate, type BaseResult, type KoreanPredicateBase, type OkBaseResult, type OperatorOp, type RenderContext, type RenderFailure, type RenderOutcome, type RenderSuccess, tracedSeg, withStemPrefixApplied } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, causativeItadakuCommitmentLemma, negativeNounCopulaChainBase, nounCopulaStemAllomorphHost, nounCopulaBase, nounCopulaBaseForCopula, nounCopulaPolarityBaseForCopula, passiveStemOptionsForStem, simpleStemBaseResult, copulaCarrierBaseForInterOp, committedTerminalRoleBase } from "./base-support.js";
import { applyNominalQuoteObjectFocus, applyQuoteBoundaryFocus } from "./quote-complement-compose.js";
import { composeBaseWithPlainImperative, composeBaseWithTerminalChain, composeCommittedTailTerminal } from "./predicate-terminal-compose.js";
import { composeNounCopulaBaseWithConjecture } from "./noun-copula-conjecture-compose.js";
import { composeNounCopulaConjectureQuestion, plainConjectureBase } from "./conjecture-compose.js";
import { renderBenefactiveVolitionalQuestion, renderBenefactiveVolitionalResolution } from "./aspect-benefactive.js";
import { composeFinalForm, composePastStemFinalForm, conjectureFinalForm, irregularFrom, nounToCopulaForm,
  nounToCopulaRebukeQuestionForm, opSourceIsVolitionalInChain } from "./final-forms.js";
import { assignOperatorChainWrapSlots, chainBases, chainStemTraceFields, collectOperatorChain, commandTerminalBaseOperatorChain, isChainableHeadOp, isHeadOp, isRequestCommandAspectOp, requestBaseCanUseDirectAuxiliaryImperative } from "./op-chain.js";
import { operatorCreatesSourceVerbalPredicate, sourceVerbalPredicateAfterAuxOp } from "../operator-head.js";
import { scopeBridgeBase } from "./scope-bridge-bases.js";
import { baseResultForNounScopeBridge, projectPredicateCopulaLayer } from "./noun-copula.js";
import { auxChainCarriesConjecture, negationOpAdmitsShortForm, sfpHasSelfDirectedConjectureRole, isBenefactiveAspectKind } from "../inspect.js";
import { resolveCandidateSetStem } from "../commit.js";
import { buildRequestPredicateBase, reprojectCommandQuoteAttributiveForHeadPolicy } from "./command-render.js";
import { attributiveProjectionPolicy } from "../attributive-head-policy.js";
import { NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT } from "../short-negation-policy.js";

function isBenefactiveAspectOp(op: AuxOpNode | undefined): op is BenefactiveAspectOp {
  return op?.kind === "aspect" && isBenefactiveAspectKind(op.aspect);
}

export function renderNounCopulaQuoteQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext,
): RenderOutcome | null {
  if (layer.stem.kind !== "noun") {
    return null;
  }
  const copulaOp = layer.ops[0];
  if (copulaOp?.kind !== "copula") {
    return null;
  }
  const quoteOp = layer.ops.find((op) => op.kind === "predicateQuoteCarrier");
  if (quoteOp === undefined) {
    return null;
  }
  if (quoteOp.quotedSfp !== undefined) {
    return null;
  }
  const consumesOp = (op: AuxOpNode): boolean =>
    op === quoteOp ||
    op.kind === "copula" ||
    op.kind === "polite" ||
    (op.kind === "tense" && op.tense === "past");
  if (!layer.ops.every(consumesOp)) {
    return null;
  }
  const noun = layer.stem.lemma;
  const polite = copulaOp.polite || layer.ops.some((op) => op.kind === "polite");
  const past = layer.ops.some((op) => op.kind === "tense" && op.tense === "past");
  const batchim = hasBatchim(nounCopulaStemAllomorphHost(layer.stem, ctx, noun) ?? noun);
  const copulaLink = past
    ? (batchim ? "이었다고" : "였다고")
    : (batchim ? "이라고" : "라고");
  const politeSuffix = polite && ctx.formal ? "요" : polite ? "요" : "";
  const text = `${noun}${copulaLink}${politeSuffix}?`;
  return { ok: true, text, polite };
}

export function renderSimpleStemTerminalSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.ops.length !== 0 || layer.terminal !== null) {
    return null;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  if (sfp.effect === "na_prohib" || sfp.effect === "na_excl") {
    return null;
  }
  if (layer.stem.stemMood === "conjectural") {
    return null;
  }
  if (stemInflectionCarriesVolitionalMood(layer.stem)) {
    return null;
  }
  if (sfp.effect === "ne" && sfp.surface === "わ" && ctx.formal) {
    return {
      ok: true,
      text: composeFinalForm(
        layer.stem.lemma,
        irregularFrom(layer.stem.irregular),
        layer.stem.kind === "verb",
        false,
        true,
        false,
        ctx.lookups
      ),
      polite: false
    };
  }
  const rendered = composeSimpleLemmaSfp(
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    layer.stem.kind === "verb",
    sfp.effect,
    false,
    false,
    ctx.formal
  );
  if (rendered === null) {
    return null;
  }
  return rendered;
}

export interface TerminalRoleFrame {
  readonly baseResult: BaseResult;
  readonly finalNeg: NegationOp | null;
  readonly past: boolean;
  readonly polite: boolean;
}

export type TerminalRoleSfpEffect = Exclude<
  SfpEffect,
  "ka_ne" | "kai" | "quotative_command" | "volitional_resolve"
>;

export type TerminalRoleSfpNode = Exclude<TailRoot["sfp"], null> & {
  readonly effect: TerminalRoleSfpEffect;
};

export function loweredTerminalSfpEffect(
  sfp: Exclude<TailRoot["sfp"], null>
): Exclude<TailRoot["sfp"], null> {
  return sfp.effect === "ka_ne" || sfp.effect === "kai"
    ? { ...sfp, effect: sfp.questionRealizationEffect ?? "ka" }
    : sfp;
}

export function isTerminalRoleSfpNode(
  sfp: Exclude<TailRoot["sfp"], null>
): sfp is TerminalRoleSfpNode {
  switch (sfp.effect) {
    case "ka":
    case "polite_q":
    case "neg_invite_q":
    case "neg_plain_q":
    case "neg_confirm_q":
    case "ne":
    case "na_excl":
    case "na_prohib":
    case "na_soft_imperative":
    case "jan":
    case "yone_confirm":
    case "kana":
    case "kke":
    case "explanatory":
    case "nante_excl":
    case "quotative_insistent":
    case "quotative_topic_excl":
    case "plain_q":
    case "role_cat_nya":
    case "realization":
    case "speaker_assertion":
      return true;
    case "kayo":
      return true;
    case "ka_ne":
    case "kai":
    case "quotative_command":
    case "volitional_resolve":
    case null:
      return false;
  }
  return assertNever(sfp.effect);
}

export function renderStemConjecturalSkipSfpTerminal(
  layer: AuxLayerNode,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.stemMood !== "conjectural") {
    return null;
  }
  const frame = terminalRoleFrameFromAuxLayer(layer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return frame;
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

export function renderTerminalRoleSfpFrame(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (!isTerminalRoleSfpNode(sfp)) {
    return null;
  }
  const roleLayer = sfp.effect === "na_excl"
    ? layerWithPotentialVoiceForNaExcl(layer)
    : layer;
  const frame = terminalRoleFrameFromAuxLayer(roleLayer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return frame;
  }
  return renderTerminalRoleSfpWithFrame(roleLayer, sfp, ctx, frame);
}

function layerCarriesConjecture(layer: AuxLayerNode): boolean {
  return auxChainCarriesConjecture(layer.ops, layer.stem);
}

export function renderTerminalRoleSfpWithFrame(
  roleLayer: AuxLayerNode,
  sfp: TerminalRoleSfpNode,
  ctx: RenderContext,
  frame: TerminalRoleFrame
): RenderOutcome | null {
  const rendered = renderTerminalRoleSfpMoodWithFrame(roleLayer, sfp, ctx, frame);
  return rendered === null || sfp.quoteProjection !== "terminal_mood"
    ? rendered
    : applyQuoteBoundaryFocus(rendered, sfp.quoteFocusParticle);
}

function renderTerminalRoleSfpMoodWithFrame(
  roleLayer: AuxLayerNode,
  sfp: TerminalRoleSfpNode,
  ctx: RenderContext,
  frame: TerminalRoleFrame
): RenderOutcome | null {
  const quotationMode = sfp.quoteProjection === "terminal_mood";
  if (
    sfp.effect === "kana" &&
    sfpHasSelfDirectedConjectureRole(sfp) &&
    layerCarriesConjecture(roleLayer)
  ) {
    return withStemPrefixApplied(composeCommittedTailQuestionTerminal(
      frame.baseResult,
      frame.finalNeg,
      frame.past,
      ctx.formal,
      frame.polite,
      "ka",
      true,
      ctx.lookups,
      quotationMode ? "terminal" : undefined,
    ));
  }
  switch (sfp.effect) {
    case "realization": {
      const realization = composeCommittedTailSpeakerRealizationTerminal(
        frame.baseResult,
        frame.finalNeg,
        frame.past,
        ctx.formal,
        sfp.realizationAxis,
        ctx.lookups
      );
      return realization === null ? null : withStemPrefixApplied(realization);
    }
    case "ka":
    case "kayo":
    case "plain_q":
    case "polite_q":
    case "neg_invite_q":
    case "neg_plain_q":
    case "neg_confirm_q":
    case "ne":
    case "jan":
    case "yone_confirm":
    case "kana":
    case "kke":
    case "explanatory":
    case "nante_excl":
    case "quotative_insistent":
    case "quotative_topic_excl":
    case "speaker_assertion":
    case "na_excl": {
      const composed = composeTerminalMoodOnBase(
        frame.baseResult,
        frame.finalNeg,
        frame.past,
        ctx.formal,
        frame.polite,
        sfp,
        ctx.lookups,
        {
          selfDirectedConjecture: sfpHasSelfDirectedConjectureRole(sfp),
          imperative: roleLayer.terminal === "imperative",
          ...(quotationMode ? { quotationForm: "terminal" as const } : {})
        }
      );
      return composed === null ? null : withStemPrefixApplied(composed);
    }
    case "na_prohib": {
      const prohibitive = renderNaProhibitiveTerminalRole(
        roleLayer,
        frame,
        ctx,
        sfp.quoteProjection === "prohibitive" || sfp.quoteProjection === "reported_request" || sfp.quoteProjection === "attributive_request",
        sfp.quoteProjection === "reported_request",
        sfp.quoteProjection === "attributive_request",
        sfp.quoteFocusParticle,
      );
      return prohibitive === null ? null : withStemPrefixApplied(prohibitive);
    }
    case "na_soft_imperative": {
      const soft = renderNaSoftImperativeTerminalRole(roleLayer, frame, ctx);
      return soft === null ? null : withStemPrefixApplied(soft);
    }
    case "role_cat_nya": {
      const role = composeCommittedTailRoleCatNyaCarrier(
        frame.baseResult,
        frame.finalNeg,
        frame.past,
        ctx.formal,
        frame.polite,
        sfp.repeatCount,
        ctx.lookups
      );
      return role === null ? null : withStemPrefixApplied(role);
    }
    default:
      return assertNever(sfp.effect);
  }
}

function layerWithPotentialVoiceForNaExcl(layer: AuxLayerNode): AuxLayerNode {
  const lastHeadIdx = layer.ops.reduce(
    (acc, op, index) => (isHeadOp(op) ? index : acc),
    -1
  );
  const ops = layer.ops.map((op, index) =>
    op.kind === "voice" &&
    op.candidates?.includes("potential") === true &&
    index === lastHeadIdx
      ? { ...op, voice: "potential" as const }
      : op
  );
  return ops.every((op, index) => op === layer.ops[index]) ? layer : { ...layer, ops };
}

function stemConjecturalMoodBaseResult(
  layer: AuxLayerNode,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  isVerb: boolean,
  preNeg: NegationOp | null,
  preTense: TenseOp | null
): OkBaseResult | null {
  if (layer.stem.stemMood !== "conjectural" || preNeg !== null || preTense !== null) {
    return null;
  }
  return {
    ok: true,
    base: plainConjectureBase({ stemLemma, stemIrregular, isVerb, conjecturePolite: false }),
    chainOnFinalSupported: false
  };
}

export function terminalRoleFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): TerminalRoleFrame | RenderFailure | null {
  if (layer.ops[0]?.kind === "copula" && layer.stem.kind !== "noun" && layer.stem.kind !== "adverb") {
    const projection = projectPredicateCopulaLayer(layer, ctx);
    if (projection === null || "ok" in projection) return projection;
    return terminalRoleFrameFromAuxLayer(projection.layer, projection.ctx);
  }
  if (layer.stem.kind === "adverb") {
    return adverbCopulaTerminalRoleFrameFromAuxLayer(layer, ctx);
  }
  if (layer.stem.kind === "noun") {
    return nounCopulaTerminalRoleFrameFromAuxLayer(layer, ctx);
  }
  if (
    layer.terminal !== null &&
    layer.terminal !== "imperative" &&
    layer.terminal !== "renyou_chuushi"
  ) {
    return null;
  }
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  const isVerb = layer.stem.kind === "verb";
  const stemLemma = layer.stem.lemma;
  const stemIrregular = irregularFrom(layer.stem.irregular);
  const operatorHeadIdx = layer.ops.findIndex(isHeadOp);
  const opChain = collectOperatorChain(layer.ops);
  if (opChain.length === 0 && operatorHeadIdx !== -1) {
    return null;
  }

  let preNeg: NegationOp | null = null;
  let preTense: TenseOp | null = null;
  const postNegations: NegationOp[] = [];
  const postTenses: TenseOp[] = [];
  let polite = false;

  for (const op of layer.ops) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "adjCopulaBridge") {
      continue;
    }
    if (opCarriesTerminalRolePoliteness(op)) {
      polite = true;
    }
    if (op.kind === "tense") {
      if (op.tense !== "past") {
        return { ok: false, reason: `terminal role frame does not support tense '${op.tense}'` };
      }
      const opIdx = layer.ops.indexOf(op);
      if (operatorHeadIdx === -1 || opIdx < operatorHeadIdx) {
        if (preTense !== null) {
          return { ok: false, reason: "terminal role frame does not support multiple stem tense ops" };
        }
        preTense = op;
      } else {
        postTenses.push(op);
      }
      continue;
    }
    if (op.kind === "negation") {
      const opIdx = layer.ops.indexOf(op);
      if (operatorHeadIdx === -1 || opIdx < operatorHeadIdx) {
        if (preNeg !== null) {
          return { ok: false, reason: "terminal role frame does not support multiple stem negation ops" };
        }
        preNeg = op;
      } else {
        postNegations.push(op);
      }
      continue;
    }
    if (isHeadOp(op)) {
      continue;
    }
    return null;
  }

  if (opChain.length === 0) {
    const initial = stemConjecturalMoodBaseResult(layer, stemLemma, stemIrregular, isVerb, preNeg, preTense) ??
      simpleStemBaseResult(stemLemma, stemIrregular, isVerb);
    return {
      baseResult: {
        ...initial,
        base: {
          ...initial.base,
          prefix: `${layer.stem.koreanPrefix ?? ""}${initial.base.prefix}`
        }
      },
      finalNeg: preNeg,
      past: preTense !== null,
      polite
    };
  }

  const wrapSlots = assignOperatorChainWrapSlots(layer, opChain, postTenses, postNegations);
  if (!wrapSlots.ok) {
    return { ok: false, reason: wrapSlots.reason };
  }
  const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
  const chainResult = chainBases(opChain, stemLemma, stemIrregular, isVerb, {
    lookups: ctx.lookups,
    stemPrefix: layer.stem.koreanPrefix,
    sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
    sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
    preModalNeg: preNeg,
    stemPast: preTense !== null,
    pastAfterChainIdx,
    negAfterChainIdx,
    negBeforeChainIdx,
    formal: ctx.formal,
    shortNegationPolicy: layer.stem.shortNegationPolicy,
    absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
    passiveStemOptions: passiveStemOptionsForStem(layer.stem)
  });
  if (!chainResult.ok) {
    return { ok: false, reason: chainResult.reason };
  }
  const { finalNeg, finalPast, ...baseResult } = chainResult;
  return {
    baseResult,
    finalNeg,
    past: finalPast,
    polite
  };
}

function adverbCopulaTerminalRoleFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): TerminalRoleFrame | RenderFailure | null {
  if (layer.terminal !== null || layer.stem.kind !== "adverb") {
    return null;
  }
  const first = layer.ops[0];
  const opChain = collectOperatorChain(layer.ops);
  if (opChain.length > 0) {
    const operatorHeadIdx = layer.ops.indexOf(opChain[0]!);
    let preNeg: NegationOp | null = null;
    let stemPast = false;
    let polite = false;
    const postNegations: NegationOp[] = [];
    const postTenses: TenseOp[] = [];
    for (const op of layer.ops) {
      if (op.kind === "polite") {
        polite = true;
        continue;
      }
      if (opCarriesTerminalRolePoliteness(op)) polite = true;
      if (op.kind === "negation") {
        if (layer.ops.indexOf(op) < operatorHeadIdx) {
          if (preNeg !== null) {
            return { ok: false, reason: "multiple adverb SFP pre-chain negations not supported" };
          }
          preNeg = op;
        } else {
          postNegations.push(op);
        }
        continue;
      }
      if (op.kind === "tense") {
        if (layer.ops.indexOf(op) < operatorHeadIdx) stemPast = true;
        else postTenses.push(op);
        continue;
      }
      if (!isHeadOp(op)) return null;
    }
    const findSlot = (wrapper: AuxOpNode): number | null => {
      const wrapperIdx = layer.ops.indexOf(wrapper);
      let slot = -1;
      for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
        if (layer.ops.indexOf(opChain[chainIdx]!) < wrapperIdx) slot = chainIdx;
      }
      return slot < 0 ? null : slot;
    };
    const pastAfterChainIdx = new Map<number, TenseOp>();
    for (const op of postTenses) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "adverb SFP post-chain tense slot invariant violation" };
      pastAfterChainIdx.set(slot, op);
    }
    const negAfterChainIdx = new Map<number, NegationOp>();
    for (const op of postNegations) {
      const slot = findSlot(op);
      if (slot === null) return { ok: false, reason: "adverb SFP post-chain negation slot invariant violation" };
      negAfterChainIdx.set(slot, op);
    }
    const result = chainBases(opChain, layer.stem.lemma, null, false, {
      lookups: ctx.lookups,
      stemPrefix: layer.stem.koreanPrefix,
      ...chainStemTraceFields(layer.stem),
      sourceStemIsVerb: false,
      sourceStemIsSahenPredicate: false,
      adverbialStemLemma: layer.stem.lemma,
      preModalNeg: preNeg,
      stemPast,
      pastAfterChainIdx,
      negAfterChainIdx,
      formal: ctx.formal,
      shortNegationPolicy: undefined,
      absorbedPassiveAux: false,
      passiveStemOptions: {}
    });
    if (!result.ok) return result;
    const { finalNeg, finalPast, ...baseResult } = result;
    return { baseResult, finalNeg, past: finalPast, polite };
  }
  if (first?.kind !== "copula") {
    return implicitPoliteCopulaTerminalRoleFrameFromAuxLayer(
      layer.ops,
      layer.stem.lemma,
      layer.stem.koreanPrefix
    );
  }
  if (first.variant !== "basic") {
    return null;
  }
  const initialBase = nounCopulaPolarityBaseForCopula(first, layer.stem.lemma, 0, nounCopulaStemAllomorphHost(layer.stem, ctx));
  let polite = first.polite;
  let past = false;
  let finalNeg: NegationOp | null = null;
  for (const op of layer.ops.slice(1)) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation" && finalNeg === null) {
      finalNeg = op;
      continue;
    }
    return null;
  }
  return {
    baseResult: {
      ok: true,
      base: {
        ...initialBase,
        prefix: `${layer.stem.koreanPrefix ?? ""}${initialBase.prefix}`
      }
    },
    finalNeg,
    past,
    polite
  };
}

function implicitPoliteCopulaTerminalRoleFrameFromAuxLayer(
  ops: readonly AuxOpNode[],
  lemma: string,
  koreanPrefix: string | undefined
): TerminalRoleFrame | null {
  let polite = false;
  let past = false;
  for (const op of ops) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    return null;
  }
  if (!polite) {
    return null;
  }
  const initialBase = nounCopulaBase(lemma, false);
  return {
    baseResult: {
      ok: true,
      base: {
        ...initialBase,
        prefix: `${koreanPrefix ?? ""}${initialBase.prefix}`
      }
    },
    finalNeg: null,
    past,
    polite
  };
}

function nounCopulaTerminalRoleFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): TerminalRoleFrame | RenderFailure | null {
  if (layer.terminal !== null || layer.stem.kind !== "noun") {
    return null;
  }
  const centralized = nounOperatorChainTerminalRoleFrame(
    layer as AuxLayerNode & { readonly stem: Extract<AuxLayerNode["stem"], { readonly kind: "noun" }> },
    ctx
  );
  if (centralized !== null) {
    return centralized;
  }
  const first = layer.ops[0];
  if (first?.kind === "scopeBridge") {
    return nounDirectScopeBridgeTerminalRoleFrameFromAuxLayer(layer, ctx, first);
  }
  if (first?.kind !== "copula") {
    const implicitPoliteCopula = implicitPoliteCopulaTerminalRoleFrameFromAuxLayer(
      layer.ops,
      layer.stem.lemma,
      layer.stem.koreanPrefix
    );
    if (implicitPoliteCopula !== null) {
      return implicitPoliteCopula;
    }
    if (layer.ops.length === 0) {
      const zeroCopulaBase = nounCopulaBase(layer.stem.lemma, false, nounCopulaStemAllomorphHost(layer.stem, ctx));
      return {
        baseResult: {
          ok: true,
          base: {
            ...zeroCopulaBase,
            prefix: `${layer.stem.koreanPrefix ?? ""}${zeroCopulaBase.prefix}`
          }
        },
        finalNeg: null,
        past: false,
        polite: false
      };
    }
    return null;
  }
  const noun = layer.stem.lemma;
  const initialBase = nounCopulaPolarityBaseForCopula(first, noun, 0, nounCopulaStemAllomorphHost(layer.stem, ctx, noun));
  const scopeBridgeFrame = nounCopulaScopeBridgeTerminalRoleFrameFromAuxLayer(layer, ctx, first, initialBase);
  if (scopeBridgeFrame !== null) {
    return scopeBridgeFrame;
  }
  let polite = first.polite;
  let past = false;
  let finalNeg: NegationOp | null = null;
  for (const op of layer.ops.slice(1)) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation" && finalNeg === null) {
      finalNeg = op;
      continue;
    }
    return null;
  }
  return {
    baseResult: {
      ok: true,
      base: {
        ...initialBase,
        prefix: `${layer.stem.koreanPrefix ?? ""}${initialBase.prefix}`
      }
    },
    finalNeg,
    past,
    polite
  };
}

function nounOperatorChainTerminalRoleFrame(
  layer: AuxLayerNode & { readonly stem: Extract<AuxLayerNode["stem"], { readonly kind: "noun" }> },
  ctx: RenderContext
): TerminalRoleFrame | RenderFailure | null {
  const first = layer.ops[0];
  const startsWithCopula = first?.kind === "copula";
  const startsWithDirectScopeBridge = first?.kind === "scopeBridge" && first.head === null;
  const chainInputOps = startsWithCopula || startsWithDirectScopeBridge
    ? layer.ops.slice(1)
    : layer.ops;
  const opChain = collectOperatorChain(chainInputOps);
  const firstChainHead = opChain[0];
  const copulaChainOpensRadius = startsWithCopula && (
    opChain.length >= 2 ||
    firstChainHead?.kind === "modal" ||
    firstChainHead?.kind === "conjecture" ||
    firstChainHead?.kind === "aspect" ||
    firstChainHead?.kind === "desire" ||
    firstChainHead?.kind === "idiom" ||
    firstChainHead?.kind === "postverbAuxiliary" ||
    firstChainHead?.kind === "predicateProjectionCarrier" ||
    (firstChainHead?.kind === "predicateQuoteCarrier" && firstChainHead.quotedSfp !== undefined)
  );
  const hostlessQuoteTerminalOpensRadius =
    firstChainHead?.kind === "predicateQuoteCarrier" && firstChainHead.sourceTerminal === true;
  const implicitConjectureOpensRadius =
    !startsWithCopula && !startsWithDirectScopeBridge && first?.kind === "conjecture";
  const implicitModalOpensRadius =
    !startsWithCopula && !startsWithDirectScopeBridge && first?.kind === "modal";
  const opensRadiusGap =
    (startsWithDirectScopeBridge && chainInputOps.some(isHeadOp)) ||
    copulaChainOpensRadius ||
    hostlessQuoteTerminalOpensRadius ||
    implicitConjectureOpensRadius ||
    implicitModalOpensRadius ||
    opChain.some((op) => op.kind === "idiom" && op.idiom === "obligation") ||
    (!startsWithCopula && !startsWithDirectScopeBridge && first?.kind === "predicateProjectionCarrier");
  if (!opensRadiusGap) return null;
  const operatorHeadIdx = opChain.length === 0 ? layer.ops.length : layer.ops.indexOf(opChain[0]!);
  let preNeg: NegationOp | null = null;
  let stemPast = false;
  let polite = startsWithCopula && first.kind === "copula" ? first.polite : false;
  const postNegations: NegationOp[] = [];
  const postTenses: TenseOp[] = [];
  for (const op of chainInputOps) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (opCarriesTerminalRolePoliteness(op)) polite = true;
    if (op.kind === "negation") {
      if (layer.ops.indexOf(op) < operatorHeadIdx) {
        if (preNeg !== null) return { ok: false, reason: "multiple noun SFP pre-chain negations not supported" };
        preNeg = op;
      } else postNegations.push(op);
      continue;
    }
    if (op.kind === "tense") {
      if (layer.ops.indexOf(op) < operatorHeadIdx) stemPast = true;
      else postTenses.push(op);
      continue;
    }
    if (!isHeadOp(op)) return null;
  }
  const findSlot = (wrap: AuxOpNode): number | null => {
    const idx = layer.ops.indexOf(wrap);
    let slot = -1;
    for (let chainIdx = 0; chainIdx < opChain.length; chainIdx++) {
      if (layer.ops.indexOf(opChain[chainIdx]!) < idx) slot = chainIdx;
    }
    return slot < 0 ? null : slot;
  };
  const pastAfterChainIdx = new Map<number, TenseOp>();
  for (const op of postTenses) {
    const slot = findSlot(op);
    if (slot === null) return { ok: false, reason: "noun SFP post-chain tense slot invariant violation" };
    pastAfterChainIdx.set(slot, op);
  }
  const negAfterChainIdx = new Map<number, NegationOp>();
  for (const op of postNegations) {
    const slot = findSlot(op);
    if (slot === null) return { ok: false, reason: "noun SFP post-chain negation slot invariant violation" };
    negAfterChainIdx.set(slot, op);
  }
  const directScopeBase = startsWithDirectScopeBridge && first.kind === "scopeBridge"
    ? baseResultForNounScopeBridge(first, layer.stem.lemma, ctx.formal)
    : null;
  if (directScopeBase !== null && !directScopeBase.ok) return directScopeBase;
  const initialBase = startsWithCopula && first.kind === "copula"
    ? nounCopulaPolarityBaseForCopula(first, layer.stem.lemma, 0, nounCopulaStemAllomorphHost(layer.stem, ctx))
    : nounCopulaBaseForCopula(null, layer.stem.lemma, nounCopulaStemAllomorphHost(layer.stem, ctx));
  if (opChain.length === 0 && directScopeBase !== null && directScopeBase.ok) {
    return {
      baseResult: directScopeBase,
      finalNeg: preNeg,
      past: stemPast,
      polite: polite || (first?.kind === "scopeBridge" && first.polite)
    };
  }
  const result = chainBases(opChain, layer.stem.lemma, null, false, {
    lookups: ctx.lookups,
    stemPrefix: layer.stem.koreanPrefix,
    ...chainStemTraceFields(layer.stem),
    initialBaseResult: directScopeBase !== null && directScopeBase.ok
      ? directScopeBase
      : { ok: true, base: initialBase, chainOnFinalSupported: true },
    sourceStemIsVerb: false,
    sourceStemIsSahenPredicate: false,
    preModalNeg: preNeg,
    stemPast,
    pastAfterChainIdx,
    negAfterChainIdx,
    formal: ctx.formal,
    shortNegationPolicy: undefined,
    absorbedPassiveAux: false,
    passiveStemOptions: {}
  });
  if (!result.ok) return result;
  const { finalNeg, finalPast, ...baseResult } = result;
  return { baseResult, finalNeg, past: finalPast, polite };
}

function nounDirectScopeBridgeTerminalRoleFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext,
  first: Extract<AuxOpNode, { readonly kind: "scopeBridge" }>
): TerminalRoleFrame | RenderFailure | null {
  if (layer.stem.kind !== "noun") {
    return null;
  }
  let polite = first.polite;
  let past = false;
  let finalNeg: NegationOp | null = null;
  for (const op of layer.ops.slice(1)) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation" && finalNeg === null) {
      finalNeg = op;
      continue;
    }
    return null;
  }
  const baseResult = baseResultForNounScopeBridge(first, layer.stem.lemma, ctx.formal);
  if (!baseResult.ok) {
    return baseResult;
  }
  return {
    baseResult: {
      ...baseResult,
      base: {
        ...baseResult.base,
        prefix: `${layer.stem.koreanPrefix ?? ""}${baseResult.base.prefix}`
      }
    },
    finalNeg,
    past,
    polite
  };
}

function nounCopulaScopeBridgeTerminalRoleFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext,
  copula: Extract<AuxOpNode, { readonly kind: "copula" }>,
  initialBase: ReturnType<typeof nounCopulaBaseForCopula>
): TerminalRoleFrame | RenderFailure | null {
  if (layer.stem.kind !== "noun") {
    return null;
  }
  let polite = copula.polite;
  let hostPast = false;
  let externalNegation: NegationOp | null = null;
  let scopeBridge: Extract<AuxOpNode, { readonly kind: "scopeBridge" }> | null = null;
  let postScopePolite = false;
  let postScopePast = false;

  for (const op of layer.ops.slice(1)) {
    if (scopeBridge === null) {
      if (op.kind === "polite") {
        polite = true;
        continue;
      }
      if (op.kind === "tense" && op.tense === "past") {
        hostPast = true;
        continue;
      }
      if (op.kind === "negation" && externalNegation === null) {
        externalNegation = op;
        continue;
      }
      if (op.kind === "scopeBridge") {
        scopeBridge = op;
        continue;
      }
      return null;
    }
    if (op.kind === "polite") {
      postScopePolite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      postScopePast = true;
      continue;
    }
    return null;
  }

  if (scopeBridge === null) {
    return null;
  }
  const formal = ctx.formal;
  const hostBase = externalNegation !== null
    ? applyExternalNegationDepthToPredicateBase(initialBase, externalNegation.chainDepth, formal)
    : copulaCarrierBaseForInterOp(initialBase, formal);
  if (hostBase === null) {
    return null;
  }
  const bridgeBase = scopeBridgeBase(scopeBridge, hostBase, {
    lookups: ctx.lookups,
    preModalNeg: null,
    past: hostPast || (externalNegation?.chainPast ?? false),
    pastProjection: "lexical",
    ...(copula.polarity === "affirmative" && externalNegation === null
      ? { attributiveProjectionBase: initialBase }
      : {}),
    formal,
    hasFollowingOp: false,
    shortNegationPolicy: undefined,
    sahenShortNegationSplit: NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT,
    passiveStemOptions: {},
    forbidShortNegation: false,
    desiredPredicateNegation: null
  });
  if (!bridgeBase.ok) {
    return bridgeBase;
  }
  return {
    baseResult: {
      ...bridgeBase,
      base: {
        ...bridgeBase.base,
        prefix: `${layer.stem.koreanPrefix ?? ""}${bridgeBase.base.prefix}`
      }
    },
    finalNeg: null,
    past: postScopePast,
    polite: polite || postScopePolite || scopeBridge.polite
  };
}

export function composeTerminalMoodOnBase(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  sfp: SfpNode,
  lookups: LookupTables,
  options: {
    readonly selfDirectedConjecture?: boolean;
    readonly imperative?: boolean;
    readonly quotationForm?: "terminal" | "attributive";
  } = {}
): RenderOutcome | null {
  const effect = sfp.effect;
  if (effect === null) {
    return null;
  }
  switch (effect) {
    case "ka":
    case "kayo":
    case "plain_q":
    case "polite_q":
    case "neg_invite_q":
    case "neg_plain_q":
    case "neg_confirm_q":
      return composeCommittedTailQuestionTerminal(
        baseResult,
        finalNeg,
        past,
        formal,
        questionEffectCarriesPoliteness(effect) || polite,
        effect,
        options.selfDirectedConjecture === true,
        lookups,
        options.quotationForm,
      );
    case "ne":
    case "jan":
    case "yone_confirm":
    case "kana":
    case "kke":
    case "explanatory":
    case "nante_excl":
    case "quotative_insistent":
    case "quotative_topic_excl":
    case "na_excl":
      return composeCommittedTailDiscursiveSfp(
        baseResult,
        finalNeg,
        past,
        formal,
        polite || sfp.polite === true,
        effect,
        lookups,
        options.imperative === true,
        options.quotationForm,
      );
    case "speaker_assertion": {
      if (options.quotationForm !== undefined) {
        return null;
      }
      const politeTerminal = polite || sfp.polite === true;
      if (baseResult.ok && baseResult.terminalRealization !== undefined) {
        return composeCommittedTailTerminal(baseResult, finalNeg, past, formal, politeTerminal, lookups);
      }
      const declarativeFormal = formal || !politeTerminal;
      const resolved = committedTerminalRoleBase(baseResult, finalNeg, past, declarativeFormal, lookups);
      if (!resolved.ok) {
        return resolved;
      }
      return composeBaseWithTerminalChain(resolved.base, null, resolved.past, declarativeFormal, politeTerminal, lookups);
    }
    default:
      return null;
  }
}

export function composeCommittedTailQuestionTerminal(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  effect: SfpEffect,
  selfDirectedConjecture: boolean,
  lookups: LookupTables,
  quotationForm?: "terminal" | "attributive",
): RenderOutcome {
  if (
    baseResult.ok &&
    baseResult.terminalRealization?.kind === "elided_carrier" &&
    finalNeg === null &&
    !past
  ) {
    const elided = baseResult.base.prefix.trimEnd();
    return {
      ok: true,
      text: quotationForm === undefined
        ? ensureQuestionPunctuation(elided)
        : quotedTerminalMoodComplementizer(elided, quotationForm),
      polite: false
    };
  }
  const resolved = committedTerminalRoleBase(baseResult, finalNeg, past, formal, lookups);
  if (!resolved.ok) {
    return resolved;
  }
  const conjecturePolite = conjectureQuestionPoliteOverride(resolved.base);
  const questionPolite = questionEffectCarriesPoliteness(effect) || (conjecturePolite ?? polite);
  const text = composeBaseWithQuestionTerminal(
    resolved.base,
    resolved.past,
    formal,
    questionPolite,
    effect,
    selfDirectedConjecture,
    lookups
  );
  return {
    ok: true,
    text: quotationForm === undefined
      ? ensureQuestionPunctuation(text)
      : quotedTerminalMoodComplementizer(text, quotationForm),
    polite: questionPolite,
  };
}

function questionEffectCarriesPoliteness(effect: SfpEffect): boolean {
  return effect === "polite_q" || effect === "neg_invite_q";
}

export function composeConnectiveQuestionTerminal(
  connective: RenderSuccess,
  sfp: SfpNode
): RenderSuccess {
  const polite = sfp.effect !== null && questionEffectCarriesPoliteness(sfp.effect);
  const suffix = ensureQuestionPunctuation(polite ? "요" : "");
  return {
    ok: true,
    text: connective.text + suffix,
    polite,
    ...(connective.warnings === undefined ? {} : { warnings: connective.warnings }),
    ...(connective.traced === undefined
      ? {}
      : { traced: [...connective.traced, ...tracedSeg(suffix, sfp.source.tokens, "aux")] })
  };
}

function composeCommittedTailSpeakerRealizationTerminal(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  axis: SfpNode["realizationAxis"],
  lookups: LookupTables
): RenderOutcome | null {
  const resolved = committedTerminalRoleBase(baseResult, finalNeg, past, formal, lookups);
  if (!resolved.ok) {
    return null;
  }
  const base = resolved.base;
  if (axis === "deictic_acknowledgment") {
    return base.final.kind === "lemma"
      ? composeLemmaSpeakerRealizationTerminal(base, base.final, resolved.past, formal)
      : null;
  }
  if (
    base.final.kind !== "boundNounCopula" ||
    base.policy?.kind !== "scope_carrier" ||
    base.policy.carrier !== "noda"
  ) {
    return null;
  }
  const noun = base.final.nounSurface;
  const noBatchim = !hasAllomorphBatchim(noun);
  const pastStem = `${noun}${noBatchim ? "였" : "이었"}`;
  const text = formal
    ? `${base.prefix}${resolved.past ? `${pastStem}나` : `${noun}인가`}`
    : `${base.prefix}${resolved.past ? pastStem : (noBatchim ? noun : `${noun}이`)}구나`;
  return { ok: true, text, polite: false };
}

function composeLemmaSpeakerRealizationTerminal(
  base: KoreanPredicateBase,
  final: Extract<KoreanPredicateBase["final"], { kind: "lemma" }>,
  past: boolean,
  formal: boolean
): RenderOutcome | null {
  if (past) {
    return null;
  }
  const ending = formal ? (final.isVerb ? "는가" : "(으)ㄴ가") : "구나";
  return {
    ok: true,
    text: `${base.prefix}${conjugate(final.lemma, final.irregular, ending)}`,
    polite: false
  };
}

function conjectureQuestionPoliteOverride(base: KoreanPredicateBase): boolean | null {
  return base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture"
    ? base.final.idiom.conjecturePolite
    : null;
}

export function composeCommittedTailDiscursiveSfp(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  effect: Extract<SfpEffect, "ne" | "na_excl" | "jan" | "yone_confirm" | "kana" | "kke" | "explanatory" | "nante_excl" | "quotative_insistent" | "quotative_topic_excl">,
  lookups: LookupTables,
  imperative = false,
  quotationForm?: "terminal" | "attributive",
): RenderOutcome {
  const resolved = committedTerminalRoleBase(baseResult, finalNeg, past, formal, lookups);
  if (!resolved.ok) {
    return resolved;
  }
  const rendered = composeBaseWithDiscursiveSfp(resolved.base, resolved.past, formal, polite, effect, imperative);
  if (rendered === null) {
    return { ok: false, reason: `${effect} SFP on non-composable terminal base not supported` };
  }
  if (!rendered.ok) return rendered;
  return quotationForm === undefined
    ? rendered
    : { ...rendered, text: quotedTerminalMoodComplementizer(rendered.text, quotationForm) };
}

export function nounCopulaDiscursiveSfpEnding(
  noun: string,
  past: boolean,
  formal: boolean,
  polite: boolean,
  effect: Extract<SfpEffect, "ne" | "na_excl" | "jan" | "yone_confirm" | "explanatory">,
  conjecture = false,
): string | null {
  const composed = composeBaseWithDiscursiveSfp(
    nounCopulaBase(noun, true),
    past,
    formal,
    polite,
    effect,
    false,
    conjecture,
  );
  if (composed === null || !composed.ok || !composed.text.startsWith(noun)) {
    return null;
  }
  return composed.text.slice(noun.length);
}

export function composeTerminalDiscourseTailSegment(
  noun: string,
  effect: SfpEffect,
  formal: boolean,
  polite: boolean
): string | null {
  if (effect === "na_excl") {
    return nounToCopulaForm(noun, formal, polite);
  }
  if (effect !== "ne" && effect !== "jan" && effect !== "yone_confirm") {
    return null;
  }
  const composed = composeBaseWithDiscursiveSfp(
    nounCopulaBase(noun, false),
    false,
    formal,
    polite,
    effect
  );
  return composed !== null && composed.ok ? composed.text : null;
}

function composeCommittedTailRoleCatNyaCarrier(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  repeatCount: number,
  lookups: LookupTables
): RenderOutcome | null {
  if (!baseResult.ok) {
    return baseResult;
  }
  if (
    finalNeg !== null ||
    (baseResult.base.final.kind !== "nounCopula" && baseResult.base.final.kind !== "boundNounCopula")
  ) {
    return null;
  }
  const resolved = committedTerminalRoleBase(baseResult, finalNeg, past, formal, lookups);
  if (!resolved.ok) {
    return resolved;
  }
  const final = resolved.base.final;
  if (final.kind !== "nounCopula" && final.kind !== "boundNounCopula") {
    return null;
  }
  const isBoundNoun = final.kind === "boundNounCopula" ? true : final.isBoundNoun;
  const text = nounToCopulaForm(
    final.nounSurface,
    true,
    polite,
    resolved.past,
    isBoundNoun,
    nounCopulaFinalAllomorphHost(final)
  );
  return {
    ok: true,
    text: `${resolved.base.prefix}${text}${roleCatNyaSuffix(repeatCount)}`,
    polite: false
  };
}

export function composePlainSelfQuestionTerminal(
  base: KoreanPredicateBase,
  past: boolean,
  lookups: LookupTables
): string {
  return composeBaseWithQuestionTerminal(base, past, true, false, "ka", true, lookups);
}

function composeBaseWithQuestionTerminal(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  polite: boolean,
  effect: SfpEffect,
  selfDirectedConjecture: boolean,
  lookups: LookupTables
): string {
  const conjecture = composeConjectureQuestionTerminal(base, past, polite, selfDirectedConjecture);
  if (conjecture !== null) {
    return conjecture;
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return composeBaseWithQuestionTerminal(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      polite,
      effect,
      selfDirectedConjecture,
      lookups
    );
  }
  if (
    effect === "ka" &&
    base.policy?.kind === "scope_carrier" &&
    base.final.kind === "lemma" &&
    base.final.lemma === "하다" &&
    !formal &&
    !polite
  ) {
    return `${base.prefix}${composeFinalForm(base.final.lemma, base.final.irregular, base.final.isVerb, past, false, false, lookups)}`;
  }
  if (
    effect === "ka" &&
    (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") &&
    (base.final.kind === "boundNounCopula" || base.final.isBoundNoun) &&
    (base.final.nounSurface === "거" || base.final.nounSurface === "것") &&
    /[을ㄹ] $/u.test(base.prefix)
  ) {
    return `${base.prefix.trimEnd()}까${polite ? "요" : ""}`;
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return `${base.prefix}${nounToCopulaQuestionForm(base.final.nounSurface, formal, polite, past, base.final.kind === "boundNounCopula" || base.final.isBoundNoun, effect, nounCopulaFinalAllomorphHost(base.final))}`;
  }
  if (base.final.lemma === "아니다") {
    const ani = past
      ? (formal && polite ? "아니었습니까" : formal ? "아니었는가" : polite ? "아니었어요" : "아니었어")
      : (formal && polite ? "아닙니까" : formal ? "아닌가" : polite ? "아니에요" : "아니야");
    return `${base.prefix}${ani}`;
  }
  if (past) {
    const pastStem = conjugate(base.final.lemma, base.final.irregular, "았/었");
    if (formal && polite) return `${base.prefix}${pastStem}습니까`;
    if (formal && !polite) return `${base.prefix}${pastStem}는가`;
    const pastMood = polite ? null : casualQuestionMoodEnding(effect, true);
    return pastMood === null
      ? `${base.prefix}${composePastStemFinalForm(pastStem, false, polite)}`
      : `${base.prefix}${pastStem}${pastMood}`;
  }
  if (formal && polite) {
    return `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "ㅂ니까/습니까")}`;
  }
  if (formal && !polite) {
    return `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, base.final.isVerb ? "는가" : "(으)ㄴ가")}`;
  }
  if (polite) {
    return `${base.prefix}${composeFinalForm(base.final.lemma, base.final.irregular, base.final.isVerb, false, false, true, lookups)}`;
  }
  return `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, casualQuestionMoodEnding(effect, false) ?? "아/어")}`;
}

function casualQuestionMoodEnding(effect: SfpEffect, past: boolean): "니" | "냐" | null {
  if (effect === "kayo") {
    return "냐";
  }
  return !past && effect === "ka" ? "니" : null;
}

function composeConjectureQuestionTerminal(
  base: KoreanPredicateBase,
  past: boolean,
  polite: boolean,
  selfDirected: boolean
): string | null {
  if (base.final.kind !== "lemma" || base.final.idiom?.kind !== "conjecture") {
    return null;
  }
  const questionPolite = base.final.idiom.conjecturePolite;
  if (selfDirected) {
    const doubt = composeConjectureDoubtQuestion(base, polite || questionPolite);
    if (doubt !== null) {
      return doubt;
    }
  }
  if (base.final.idiom.projection === "nominalized") {
    const nominalized = composeNominalizedConjectureQuestion(base.final.lemma, polite || questionPolite);
    return nominalized === null ? null : `${base.prefix}${nominalized}`;
  }
  if (past) {
    return null;
  }
  const stem = base.final.lemma.replace(/다$/u, "");
  return `${base.prefix}${stem}${(polite || questionPolite) ? "죠" : "지"}`;
}

function composeConjectureDoubtQuestion(
  base: KoreanPredicateBase,
  polite: boolean
): string | null {
  if (base.final.kind !== "lemma") {
    return null;
  }
  const lemma = base.final.lemma;
  const nominalized = lemma.match(/^(.*[을ㄹ]) (?:거겠다|것이겠다|거다|것이다)$/u);
  if (nominalized !== null) {
    return `${base.prefix}${nominalized[1]}까${polite ? "요" : ""}`;
  }
  if (lemma.endsWith("겠다")) {
    const conjectureIdiom = base.final.idiom?.kind === "conjecture"
      ? base.final.idiom
      : null;
    if (conjectureIdiom?.sourceNegation === "long") {
      const aux = conjectureIdiom.sourceNegationInability === true ? "못할까" : "않을까";
      return `${base.prefix}${aux}${polite ? "요" : ""}`;
    }
    const nounCopulaHost = base.policy?.kind === "noun_copula_interop" &&
      !base.policy.isBoundNoun &&
      base.policy.conjectureHostPast !== true
      ? base.policy.nounSurface
      : null;
    const plain = nounCopulaHost !== null
      ? `${nounCopulaHost}이다`
      : conjectureIdiom?.sourceLemma !== undefined
        ? conjectureIdiom.sourceLemma
        : `${lemma.slice(0, -"겠다".length)}다`;
    const irregular = nounCopulaHost !== null
      ? null
      : conjectureIdiom?.sourceIrregular !== undefined
        ? conjectureIdiom.sourceIrregular
        : base.final.irregular;
    return `${base.prefix}${conjugate(plain, irregular, "ㄹ/을까")}${polite ? "요" : ""}`;
  }
  return null;
}

function composeNominalizedConjectureQuestion(lemma: string, polite: boolean): string | null {
  const attr = lemma.endsWith(" 것이겠다")
    ? lemma.slice(0, -" 것이겠다".length)
    : lemma.endsWith(" 거겠다")
      ? lemma.slice(0, -" 거겠다".length)
      : null;
  if (attr === null) {
    return null;
  }
  const compacted = compactNominalizedConjectureQuestionAttribute(attr);
  if (compacted !== attr) {
    return `${compacted}까${polite ? "요" : ""}`;
  }
  return `${compacted} 것일까${polite ? "요" : ""}`;
}

function compactNominalizedConjectureQuestionAttribute(attr: string): string {
  if (attr.endsWith("지 않았던")) {
    return `${attr.slice(0, -"지 않았던".length)}지 않았을`;
  }
  if (attr.endsWith("지 않은")) {
    return `${attr.slice(0, -"지 않은".length)}지 않을`;
  }
  if (attr.endsWith("아니었던")) {
    return `${attr.slice(0, -"아니었던".length)}아니었을`;
  }
  if (attr.endsWith("아닌")) {
    return `${attr.slice(0, -"아닌".length)}아닐`;
  }
  return attr;
}

function nounToCopulaQuestionForm(
  noun: string,
  formal: boolean,
  polite: boolean,
  past: boolean,
  isBoundNoun: boolean,
  effect: SfpEffect,
  allomorphHost?: string
): string {
  const rebuke = casualQuestionMoodEnding(effect, past);
  if (!formal && !polite && rebuke === "냐") {
    return nounToCopulaRebukeQuestionForm(noun, past, isBoundNoun, allomorphHost);
  }
  if (formal && polite) {
    if (past) {
      const plainPast = nounToCopulaForm(noun, true, false, true, isBoundNoun, allomorphHost);
      return `${plainPast.slice(0, -1)}습니까`;
    }
    return `${noun}입니까`;
  }
  if (formal && !polite) {
    if (past) {
      const plainPast = nounToCopulaForm(noun, true, false, true, isBoundNoun, allomorphHost);
      return `${plainPast.slice(0, -1)}는가`;
    }
    return `${noun}인가`;
  }
  return nounToCopulaForm(noun, false, polite, past, isBoundNoun, allomorphHost);
}

function nounCopulaDiscursiveSfpStem(
  noun: string,
  noBatchim: boolean,
  past: boolean,
  conjecture: boolean,
  copulaElidable: boolean
): string {
  const tensed = past
    ? `${noun}${noBatchim ? "였" : "이었"}`
    : noBatchim && copulaElidable ? noun : `${noun}이`;
  return conjecture ? `${tensed}겠` : tensed;
}

function discursiveSfpElidesNounCopula(effect: SfpEffect): boolean {
  return effect !== "kana";
}

function isConjectureCompatibleDiscursiveSfp(effect: SfpEffect): boolean {
  return effect === "ne" || effect === "na_excl" || effect === "jan" || effect === "yone_confirm";
}

function conjectureConfirmSfpText(
  base: KoreanPredicateBase,
  formal: boolean,
  polite: boolean,
  conjecture: boolean,
  nounCopulaStem: string | null
): RenderOutcome | null {
  if (nounCopulaStem !== null) {
    return conjecture
      ? { ok: true, text: `${base.prefix}${nounCopulaStem}${conjectureFinalForm(formal, polite)}`, polite }
      : null;
  }
  if (base.final.kind !== "lemma" || base.final.idiom?.kind !== "conjecture") {
    return null;
  }
  const stem = base.final.lemma.replace(/다$/u, "");
  const confirmPolite = polite || base.final.idiom.conjecturePolite;
  return {
    ok: true,
    text: `${base.prefix}${stem}${conjectureFinalForm(formal, confirmPolite)}`,
    polite: confirmPolite
  };
}

function composeBaseWithDiscursiveSfp(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  polite: boolean,
  effect: Extract<SfpEffect, "ne" | "na_excl" | "jan" | "yone_confirm" | "kana" | "kke" | "explanatory" | "nante_excl" | "quotative_insistent" | "quotative_topic_excl">,
  imperative = false,
  conjecture = false
): RenderOutcome | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return composeBaseWithDiscursiveSfp(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      polite,
      effect,
      imperative,
      conjecture
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = !hasAllomorphBatchim(nounCopulaFinalAllomorphHost(base.final));
    const copulaStem = noBatchim ? noun : `${noun}이`;
    if (conjecture && !isConjectureCompatibleDiscursiveSfp(effect)) {
      return null;
    }
    const stem = nounCopulaDiscursiveSfpStem(
      noun,
      noBatchim,
      past,
      conjecture,
      discursiveSfpElidesNounCopula(effect)
    );
    switch (effect) {
      case "ne": {
        const confirm = conjectureConfirmSfpText(base, formal, polite, conjecture, stem);
        if (confirm !== null) {
          return confirm;
        }
        if (formal) {
          return { ok: true, text: `${base.prefix}${stem}${polite ? "군요" : "군"}`, polite };
        }
        return { ok: true, text: `${base.prefix}${stem}네${polite ? "요" : ""}`, polite };
      }
      case "na_excl":
        return { ok: true, text: `${base.prefix}${stem}${polite ? "군요" : "구나"}`, polite };
      case "jan":
        return { ok: true, text: `${base.prefix}${stem}잖아${polite ? "요" : ""}`, polite };
      case "yone_confirm":
        return { ok: true, text: `${base.prefix}${stem}${yoneConfirmSuffix(polite, formal)}`, polite };
      case "kana":
        return { ok: true, text: `${base.prefix}${nounCopulaStemToKanaQuestionForm(stem, noun, polite)}`, polite };
      case "kke":
        return { ok: true, text: `${base.prefix}${noun}${noBatchim ? "였" : "이었"}던가`, polite: false };
      case "explanatory":
        return { ok: true, text: `${base.prefix}${stem}거든${polite ? "요" : ""}`, polite };
      case "nante_excl":
        return past
          ? { ok: true, text: `${base.prefix}${noun}${noBatchim ? "였" : "이었"}다니${polite ? "요" : ""}`, polite }
          : { ok: true, text: `${base.prefix}${copulaStem}라니${polite ? "요" : ""}`, polite };
      case "quotative_insistent":
        return past
          ? { ok: true, text: `${base.prefix}${noun}${noBatchim ? "였" : "이었"}다니까`, polite: false }
          : { ok: true, text: `${base.prefix}${copulaStem}라니까`, polite: false };
      case "quotative_topic_excl":
        return past
          ? { ok: true, text: `${base.prefix}${noun}${noBatchim ? "였" : "이었"}다니`, polite: false }
          : { ok: true, text: `${base.prefix}${copulaStem}라니`, polite: false };
    }
  }
  if (base.final.kind !== "lemma" || conjecture) {
    return null;
  }
  const lemmaForSfp = past
    ? `${conjugate(base.final.lemma, base.final.irregular, "았/었")}다`
    : base.final.lemma;
  const irregular = past ? null : base.final.irregular;
  switch (effect) {
    case "ne":
      if (imperative && !polite) {
        return composeBaseWithPlainImperative(base, formal);
      }
      {
        const confirm = conjectureConfirmSfpText(base, formal, polite, false, null);
        if (confirm !== null) {
          return confirm;
        }
      }
      if (formal) {
        return {
          ok: true,
          text: `${base.prefix}${composeFormalNeLemmaSfp(base.final.lemma, base.final.irregular, base.final.isVerb, past, polite)}`,
          polite
        };
      }
      return { ok: true, text: `${base.prefix}${conjugate(lemmaForSfp, irregular, "네")}${polite ? "요" : ""}`, polite };
    case "na_excl":
      return { ok: true, text: `${base.prefix}${composeNaExclLemmaSfp(base.final.lemma, base.final.irregular, base.final.isVerb, past, polite)}`, polite };
    case "jan":
      return { ok: true, text: `${base.prefix}${conjugate(lemmaForSfp, irregular, "잖아")}${polite ? "요" : ""}`, polite };
    case "yone_confirm": {
      const ji = conjugate(lemmaForSfp, irregular, "지");
      return { ok: true, text: `${base.prefix}${applyYoneConfirmSuffixToJiForm(ji, polite, formal)}`, polite };
    }
    case "kana":
      return { ok: true, text: `${base.prefix}${conjugate(lemmaForSfp, irregular, "ㄹ/을까")}${polite ? "요" : ""}`, polite };
    case "kke":
      return { ok: true, text: `${base.prefix}${conjugate(lemmaForSfp, irregular, "던가")}`, polite: false };
    case "explanatory":
      return { ok: true, text: `${base.prefix}${conjugate(lemmaForSfp, irregular, "거든")}${polite ? "요" : ""}`, polite };
    case "nante_excl":
      return { ok: true, text: `${base.prefix}${lemmaForSfp}니${polite ? "요" : ""}`, polite };
    case "quotative_insistent":
      if (imperative) {
        return {
          ok: true,
          text: `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "(으)라니까")}`,
          polite: false
        };
      }
      return past
        ? { ok: true, text: `${base.prefix}${lemmaForSfp}니까`, polite: false }
        : {
            ok: true,
            text: `${base.prefix}${conjugate(base.final.lemma, irregular, base.final.isVerb && !isExistentialLemmaForNaExcl(base.final.lemma) ? "ㄴ/는다니까" : "다니까")}`,
            polite: false
          };
    case "quotative_topic_excl":
      return past
        ? { ok: true, text: `${base.prefix}${lemmaForSfp}니`, polite: false }
        : {
            ok: true,
            text: `${base.prefix}${conjugate(base.final.lemma, irregular, base.final.isVerb && !isExistentialLemmaForNaExcl(base.final.lemma) ? "ㄴ/는다니" : "다니")}`,
            polite: false
          };
  }
  return assertNever(effect);
}

function applyYoneConfirmSuffixToJiForm(jiForm: string, polite: boolean, formal: boolean): string {
  if (!polite) {
    return jiForm;
  }
  return formal ? `${jiForm}요` : `${jiForm.slice(0, -1)}죠`;
}

function composeNaExclLemmaSfp(
  lemma: string,
  irregular: IrregularType | null,
  isVerb: boolean,
  past: boolean,
  polite: boolean
): string {
  if (!past && isVerb && !lemma.endsWith("겠다") && !isExistentialLemmaForNaExcl(lemma)) {
    return `${conjugate(lemma, irregular, "ㄴ/는")}${polite ? "군요" : "구나"}`;
  }
  const base = past ? `${conjugate(lemma, irregular, "았/었")}다` : lemma;
  return conjugate(base, past ? null : irregular, polite ? "군" : "구나") + (polite ? "요" : "");
}

function composeFormalNeLemmaSfp(
  lemma: string,
  irregular: IrregularType | null,
  isVerb: boolean,
  past: boolean,
  polite: boolean
): string {
  const politeText = composeNaExclLemmaSfp(lemma, irregular, isVerb, past, true);
  return polite ? politeText : politeText.replace(/요$/u, "");
}

function isExistentialLemmaForNaExcl(lemma: string): boolean {
  return lemma === "있다" ||
    lemma === "없다" ||
    lemma.endsWith(" 있다") ||
    lemma.endsWith(" 없다");
}

function nounCopulaStemToKanaQuestionForm(stem: string, noun: string, polite: boolean): string {
  const body = noun === "거" && stem === `${noun}이`
    ? "걸까"
    : conjugate(`${stem}다`, null, "ㄹ/을까");
  return `${body}${polite ? "요" : ""}`;
}

function renderNaProhibitiveTerminalRole(
  layer: AuxLayerNode,
  frame: TerminalRoleFrame,
  ctx: RenderContext,
  quoted: boolean,
  reportedRequest = false,
  attributiveRequest = false,
  quoteFocusParticle?: QuoteBoundaryFocusParticle,
): RenderOutcome | null {
  const resolved = committedTerminalRoleBase(frame.baseResult, frame.finalNeg, frame.past, ctx.formal, ctx.lookups);
  if (!resolved.ok) {
    return resolved;
  }
  if (
    resolved.base.final.kind !== "lemma" || resolved.past
  ) {
    return { ok: false, reason: "prohibitive SFP requires non-past verbal terminal role base" };
  }
  const stemJi = conjugate(resolved.base.final.lemma, resolved.base.final.irregular, "지");
  const fused: RenderOutcome = {
    ok: true,
    text: `${resolved.base.prefix}${stemJi} ${reportedRequest ? "말라는 말을" : attributiveRequest ? "말라는" : quoted ? "말라고" : ctx.formal ? "마라" : "마"}`,
    polite: false
  };
  if (reportedRequest) {
    return applyNominalQuoteObjectFocus(fused, quoteFocusParticle);
  }
  return (attributiveRequest
    ? reprojectCommandQuoteAttributiveForHeadPolicy(
      fused,
      resolved.base,
      "prohibition",
      attributiveProjectionPolicy(layer),
      ctx.formal,
      { requestForm: false }
    )
    : null) ?? fused;
}

function renderNaSoftImperativeTerminalRole(
  layer: AuxLayerNode,
  frame: TerminalRoleFrame,
  ctx: RenderContext
): RenderOutcome | null {
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const resolved = committedTerminalRoleBase(frame.baseResult, frame.finalNeg, frame.past, ctx.formal, ctx.lookups);
  if (!resolved.ok) {
    return resolved;
  }
  if (resolved.base.final.kind !== "lemma" || !resolved.base.final.isVerb || resolved.past) {
    return { ok: false, reason: "na soft imperative SFP requires non-past verbal terminal role base" };
  }
  return composeBaseWithPlainImperative(resolved.base, ctx.formal);
}

export function renderProgressiveNegativeConfirmQuestionSfp(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  if (layer.terminal !== null || (layer.stem.kind !== "verb" && layer.stem.kind !== "adj")) {
    return null;
  }
  let sawProgressive = false;
  let sawPolite = false;
  let sawNegation = false;
  for (const op of layer.ops) {
    if (op.kind === "aspect" && op.aspect === "te_iru" && !sawProgressive) {
      sawProgressive = true;
      continue;
    }
    if (op.kind === "polite") {
      sawPolite = true;
      continue;
    }
    if (op.kind === "negation" && !sawNegation && op.chainDepth === 1 && !op.chainPast) {
      sawNegation = true;
      continue;
    }
    return null;
  }
  if (!sawProgressive || !sawNegation) {
    return null;
  }
  const stemJi = conjugate(layer.stem.lemma, irregularFrom(layer.stem.irregular), "지");
  const ending = sawPolite
    ? (ctx.formal ? "않았습니까" : "않았어요")
    : (ctx.formal ? "않았는가" : "않았어");
  return {
    ok: true,
    text: ensureQuestionPunctuation(`${stemJi} ${ending}`),
    polite: sawPolite
  };
}

export function renderRequestDiscursiveSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const effect = sfp.effect;
  if (
    effect !== "ne" && effect !== "na_excl" && effect !== "jan" && effect !== "kke" &&
    effect !== "quotative_insistent"
  ) {
    return null;
  }
  if (layer.stem.kind !== "verb") return null;

  const requestOp = layer.ops.find(
    (op): op is RequestAspectOp => op.kind === "aspect" && (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu")
  );
  const prohibitionOp = requestOp === undefined
    ? layer.ops.find((op): op is ProhibitionAspectOp => op.kind === "aspect" && op.aspect === "naide_kudasai")
    : undefined;
  if (requestOp === undefined && prohibitionOp === undefined) return null;

  const isPolite = requestOp !== undefined ? requestOp.aspect === "te_kudasai" : (prohibitionOp?.prohibition?.polite ?? false);

  const insistentQuote = effect === "quotative_insistent";

  if (prohibitionOp !== undefined) {
    if (insistentQuote && layer.ops.some((op) => op !== prohibitionOp)) {
      return null;
    }
    const stemLemma = layer.stem.lemma;
    const stemIrregular = irregularFrom(layer.stem.irregular);
    const stemJi = conjugate(stemLemma, stemIrregular, "지");
    return composeCommandSfpText(stemJi, "말다", null, isPolite, effect);
  }
  if (requestOp === undefined) return null;
  const baseOps = commandTerminalBaseOperatorChain(layer.ops, isRequestCommandAspectOp);
  if (baseOps.length === 0) {
    const stemLemma = layer.stem.lemma;
    const stemIrregular = irregularFrom(layer.stem.irregular);
    if (stemLemma.endsWith("주다")) {
      const effectiveLemma = isPolite
        ? `${stemLemma.slice(0, -2)}주시다`
        : stemLemma;
      return insistentQuote
        ? benefactiveRequestInsistentQuoteOutcome(lexicalHostPrefix(stemLemma.slice(0, -2)))
        : composeCommandSfpText("", effectiveLemma, stemIrregular, isPolite, effect);
    }
    const requestPrefix = conjugate(stemLemma, stemIrregular, "아/어");
    return insistentQuote
      ? benefactiveRequestInsistentQuoteOutcome(`${requestPrefix} `)
      : composeCommandSfpText(requestPrefix, isPolite ? "주시다" : "주다", null, isPolite, effect);
  }
  const baseLayer = { ...layer, ops: layer.ops.filter((op) => op !== requestOp) };
  const frame = terminalRoleFrameFromAuxLayer(baseLayer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return null;
  }
  if (!frame.baseResult.ok || frame.finalNeg !== null || frame.past) {
    return null;
  }
  const request = buildRequestPredicateBase(frame.baseResult, requestOp, {
    directAuxiliaryImperative: requestBaseCanUseDirectAuxiliaryImperative(baseOps),
    lookups: ctx.lookups
  });
  const requestBase = request.result;
  if (insistentQuote && request.finalRole === "request_auxiliary") {
    const resolved = committedTerminalRoleBase(requestBase, null, false, ctx.formal, ctx.lookups);
    if (!resolved.ok) {
      return resolved;
    }
    return benefactiveRequestInsistentQuoteOutcome(resolved.base.prefix);
  }
  return composeCommittedTailDiscursiveSfp(
    requestBase,
    null,
    false,
    ctx.formal,
    frame.polite || isPolite,
    effect,
    ctx.lookups,
    true
  );
}

function benefactiveRequestInsistentQuoteOutcome(prefix: string): RenderOutcome {
  return { ok: true, text: `${prefix}달라니까`, polite: false };
}

function lexicalHostPrefix(hostForm: string): string {
  return hostForm.length === 0 ? "" : `${hostForm} `;
}

function composeCommandSfpText(
  prefix: string,
  auxLemma: string,
  auxIrregular: IrregularType | null,
  polite: boolean,
  effect: Extract<SfpEffect, "ne" | "na_excl" | "jan" | "kke" | "quotative_insistent">
): RenderOutcome {
  switch (effect) {
    case "ne":
      return { ok: true, text: `${prefix} ${conjugate(auxLemma, auxIrregular, "네")}${polite ? "요" : ""}`, polite };
    case "na_excl":
      return {
        ok: true,
        text: `${prefix} ${conjugate(auxLemma, auxIrregular, "는데").slice(0, -1)}${polite ? "군요" : "구나"}`,
        polite
      };
    case "jan":
      return { ok: true, text: `${prefix} ${conjugate(auxLemma, auxIrregular, "잖아")}`, polite: false };
    case "kke":
      return { ok: true, text: `${prefix} ${conjugate(auxLemma, auxIrregular, "던가")}`, polite: false };
    case "quotative_insistent":
      return {
        ok: true,
        text: `${prefix} ${conjugate(auxLemma, auxIrregular, "(으)라니까")}`,
        polite: false
      };
  }
  return assertNever(effect);
}

export function renderBenefactiveTerminalRequestQuestion(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  const headOps = layer.ops.filter(isHeadOp);
  const lastHead = headOps[headOps.length - 1];
  if (!isBenefactiveAspectOp(lastHead)) {
    return null;
  }
  const benefactiveHead = lastHead;
  const firstHeadIdx = layer.ops.findIndex(isHeadOp);
  const explicitRequestRole = sfp.questionRole === "request" || sfp.questionRole === "permission";
  if (!explicitRequestRole) {
    return null;
  }
  const requestStem = layer.stem.kind === "candidateSet"
    ? resolveCandidateSetStem(layer.stem)
    : layer.stem;
  const requestLayer = requestStem === layer.stem ? layer : { ...layer, stem: requestStem };
  if (requestStem.kind !== "verb" && requestStem.kind !== "adj") {
    return { ok: false, reason: "request question requires verb stem" };
  }
  const compatibleStem = layer.ops
    .slice(0, layer.ops.indexOf(benefactiveHead))
    .reduce(
      sourceVerbalPredicateAfterAuxOp,
      requestStem.kind === "verb" || stemHasSourceVerbalPredicate(requestStem),
    );
  if (!compatibleStem) {
    return { ok: false, reason: "request question requires verb stem" };
  }
  if (!headOps.every(isChainableHeadOp)) {
    return { ok: false, reason: "request question base contains non-chainable operator" };
  }
  const sourceVerbalizerIdx = layer.ops.findIndex((op) =>
    isHeadOp(op) && operatorCreatesSourceVerbalPredicate(op as OperatorOp)
  );
  const terminalOps = layer.ops.filter((op, index) =>
    !isHeadOp(op) &&
    !(
      op.kind === "copula" &&
      op.basicForm === "adverbial_ni" &&
      op.polarity === "affirmative" &&
      sourceVerbalizerIdx > index
    )
  );
  if (!terminalOps.every((op) => op.kind === "polite" || op.kind === "negation")) {
    return { ok: false, reason: "request question terminal accepts only polite/negative source markers" };
  }
  if (sfp.questionRole === "permission") {
    const permission = renderCausativeReceivePotentialPermissionQuestion(requestLayer, benefactiveHead, ctx);
    if (permission !== null) {
      return permission;
    }
    return { ok: false, reason: "permission question role requires causative receive-potential base" };
  }
  const requestPreNeg = layer.ops.find((op, index): op is NegationOp =>
    index < firstHeadIdx && op.kind === "negation"
  ) ?? null;
  const postNegations = layer.ops.filter((op, index): op is NegationOp =>
    op.kind === "negation" && index > firstHeadIdx
  );
  const wrapSlots = assignOperatorChainWrapSlots(layer, headOps, [], postNegations);
  if (!wrapSlots.ok) {
    return { ok: false, reason: wrapSlots.reason };
  }
  const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
  const baseResult = chainBases(
    headOps as OperatorOp[],
    requestStem.lemma,
    irregularFrom(requestStem.irregular),
    true,
    {
      lookups: ctx.lookups,
      stemPrefix: requestStem.koreanPrefix,
      sourceStemIsVerb: stemHasSourceVerbalPredicate(requestStem),
      sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(requestStem),
      preModalNeg: requestPreNeg,
      stemPast: false,
      pastAfterChainIdx,
      negAfterChainIdx,
      negBeforeChainIdx,
      formal: ctx.formal,
      shortNegationPolicy: requestStem.shortNegationPolicy,
      absorbedPassiveAux: requestStem.absorbedPassiveAux === true,
      passiveStemOptions: passiveStemOptionsForStem(requestStem)
    }
  );
  if (!baseResult.ok) {
    return baseResult;
  }
  const sourceNegativeRequest = baseResult.finalNeg !== null;
  const sourcePoliteRequest = terminalOps.some((op) => op.kind === "polite");
  return withStemPrefixApplied(renderBenefactiveRequestQuestionBase(
    baseResult.base,
    ctx.formal,
    sourceNegativeRequest,
    sfp.surface === "か" &&
      !sourcePoliteRequest &&
      benefactiveHead.benefactive.kind === "kureru",
    sourcePoliteRequest,
    benefactiveHead.benefactive.honorific,
  ));
}

function renderCausativeReceivePotentialPermissionQuestion(
  layer: AuxLayerNode,
  benefactive: BenefactiveAspectOp,
  ctx: RenderContext
): RenderOutcome | null {
  if (!benefactive.benefactive.potential) {
    return null;
  }
  if (benefactive.aspect !== "te_moraeru" && benefactive.aspect !== "te_itadakeru") {
    return null;
  }
  if (!layer.ops.some((op) => op.kind === "voice" && op.voice === "causative")) {
    return null;
  }
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const [lemma, irregular] = causativeItadakuCommitmentLemma(
    layer.stem,
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    ctx.lookups
  );
  const text = `${conjugate(lemma, irregular, "아/어도")} ${ctx.formal ? "되겠습니까" : "될까요"}`;
  return {
    ok: true,
    text: ensureQuestionPunctuation(text),
    polite: true,
    stemPrefixApplied: true
  };
}

function renderBenefactiveRequestQuestionBase(
  base: KoreanPredicateBase,
  formal: boolean,
  sourceNegativeRequest: boolean,
  preservePlainKaLiteral: boolean,
  sourcePoliteRequest: boolean,
  carrierIsIntrinsicallyHonorific: boolean,
): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "request question on non-lemma benefactive base not supported" };
  }
  if (base.policy?.kind === "benefactive" && base.policy.potential) {
    const suffix = formal ? "있겠습니까" : "있을까요";
    return {
      ok: true,
      text: ensureQuestionPunctuation(`${lemmaBase.prefix}${suffix}`),
      polite: true
    };
  }
  if (sourceNegativeRequest) {
    const stemJi = conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "지");
    const addPoliteRequestHonorific = sourcePoliteRequest &&
      !carrierIsIntrinsicallyHonorific;
    return {
      ok: true,
      text: ensureQuestionPunctuation(
        `${lemmaBase.prefix}${stemJi}${formal
          ? addPoliteRequestHonorific ? " 않으시겠습니까" : " 않겠습니까"
          : preservePlainKaLiteral
            ? " 않아"
            : sourcePoliteRequest
              ? addPoliteRequestHonorific ? " 않으실래요" : " 않을래요"
              : " 않을래"}`
      ),
      polite: formal || sourcePoliteRequest
    };
  }
  const family = base.policy?.kind === "benefactive" ? base.policy.family : null;
  if (family === "kudasaru" || family === "itadaku") {
    const stem = conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "겠");
    return {
      ok: true,
      text: ensureQuestionPunctuation(`${lemmaBase.prefix}${stem}${formal ? "습니까" : "어요"}`),
      polite: true
    };
  }
  const attr = conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "ㄹ/을");
  return {
    ok: true,
    text: ensureQuestionPunctuation(
      formal
        ? `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "겠")}습니까`
        : `${lemmaBase.prefix}${attr}래${sourcePoliteRequest ? "요" : ""}`
    ),
    polite: formal || sourcePoliteRequest
  };
}

export function renderVolitionalQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (
    sfp.effect !== "polite_q" && sfp.effect !== "ka" && sfp.effect !== "plain_q" && sfp.effect !== "kana" &&
    sfp.effect !== "volitional_resolve"
  ) {
    return null;
  }
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const firstHeadIdx = layer.ops.findIndex(isHeadOp);
  const hostPreNeg = layer.ops.find((op, index): op is NegationOp =>
    index < firstHeadIdx && op.kind === "negation"
  ) ?? null;
  const preSlotTerminalOps = layer.ops.filter((op) => !isHeadOp(op) && op !== hostPreNeg);
  const headOps = layer.ops.filter(isHeadOp);
  const volitionalPolite = preSlotTerminalOps.find((op) =>
    op.kind === "polite" && ((op.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_
  );
  const stemIsVolitional = stemInflectionCarriesVolitionalMood(layer.stem);
  const sourceVolitionalHead = headOps.some((op) => isSourceVolitionalChainableHead(op, layer.ops));
  if (volitionalPolite === undefined && !stemIsVolitional && !sourceVolitionalHead) {
    return null;
  }
  const wrapSlots = headOps.length === 0
    ? {
      ok: true as const,
      slots: {
        pastAfterChainIdx: new Map<number, TenseOp>(),
        negAfterChainIdx: new Map<number, NegationOp>(),
        negBeforeChainIdx: new Map<number, NegationOp>()
      }
    }
    : assignOperatorChainWrapSlots(
      layer,
      headOps,
      layer.ops.filter((op, index): op is TenseOp => op.kind === "tense" && index > firstHeadIdx),
      layer.ops.filter((op, index): op is NegationOp => op.kind === "negation" && index > firstHeadIdx)
    );
  if (!wrapSlots.ok) {
    return { ok: false, reason: wrapSlots.reason };
  }
  const { pastAfterChainIdx, negAfterChainIdx, negBeforeChainIdx } = wrapSlots.slots;
  const lastSlot = headOps.length - 1;
  const baseConsumedOps = new Set<AuxOpNode>(negBeforeChainIdx.values());
  for (const [slot, op] of negAfterChainIdx) {
    if (slot !== lastSlot) baseConsumedOps.add(op);
  }
  for (const [slot, op] of pastAfterChainIdx) {
    if (slot !== lastSlot) baseConsumedOps.add(op);
  }
  const terminalOps = preSlotTerminalOps.filter((op) => !baseConsumedOps.has(op));
  if (volitionalPolite !== undefined && terminalOps.length !== 1) {
    return { ok: false, reason: "volitional question accepts only volitional polite source marker" };
  }
  if (volitionalPolite === undefined && terminalOps.length !== 0) {
    return { ok: false, reason: "volitional stem question accepts no extra terminal operators" };
  }
  if (!headOps.every(isChainableHeadOp)) {
    return { ok: false, reason: "volitional question base contains non-chainable operator" };
  }
  if (
    volitionalPolite === undefined && !stemIsVolitional && headOps.length === 1 &&
    hostPreNeg === null && baseConsumedOps.size === 0
  ) {
    const head = headOps[0];
    if (isBenefactiveAspectOp(head) && opSourceIsVolitionalInChain(head, layer.ops)) {
      const benefactiveHost = {
        stemLemma: layer.stem.lemma,
        stemIrregular: irregularFrom(layer.stem.irregular),
        stemPrefix: layer.stem.koreanPrefix ?? null,
        benefactive: head
      };
      return withStemPrefixApplied(sfp.effect === "volitional_resolve"
        ? renderBenefactiveVolitionalResolution(benefactiveHost)
        : ensureQuestionOutcome(renderBenefactiveVolitionalQuestion({ ...benefactiveHost, polite: false })));
    }
  }
  const baseResult = headOps.length === 0
    ? {
      ok: true as const,
      base: {
        ...simpleStemBaseResult(layer.stem.lemma, irregularFrom(layer.stem.irregular), true).base,
        prefix: `${layer.stem.koreanPrefix ?? ""}${simpleStemBaseResult(layer.stem.lemma, irregularFrom(layer.stem.irregular), true).base.prefix}`
      }
    }
    : chainBases(
      headOps as OperatorOp[],
      layer.stem.lemma,
      irregularFrom(layer.stem.irregular),
      true,
      {
        lookups: ctx.lookups,
        stemPrefix: layer.stem.koreanPrefix,
        sourceStemIsVerb: stemHasSourceVerbalPredicate(layer.stem),
        sourceStemIsSahenPredicate: stemHasSahenSourcePredicate(layer.stem),
        preModalNeg: hostPreNeg,
        stemPast: false,
        pastAfterChainIdx,
        negAfterChainIdx,
        negBeforeChainIdx,
        formal: ctx.formal,
        shortNegationPolicy: layer.stem.shortNegationPolicy,
        absorbedPassiveAux: layer.stem.absorbedPassiveAux === true,
        passiveStemOptions: passiveStemOptionsForStem(layer.stem)
      }
    );
  if (!baseResult.ok) {
    return baseResult;
  }
  if (sfp.effect === "volitional_resolve") {
    return volitionalPolite === undefined ? withStemPrefixApplied(renderBaseVolitionalResolution(baseResult.base)) : null;
  }
  if (sfp.effect === "kana") {
    if (volitionalPolite !== undefined) {
      return null;
    }
    if (headOps.length !== 0) {
      const chained = renderBaseVolitionalQuestion(
        baseResult.base,
        false,
        kanaSelfQuestionClosesUtterance(sfp, ctx)
      );
      return chained.ok ? withStemPrefixApplied(chained) : null;
    }
    return withStemPrefixApplied(renderBaseVolitionalKanaQuestion(baseResult.base));
  }
  return withStemPrefixApplied(renderBaseVolitionalQuestion(baseResult.base, volitionalPolite !== undefined));
}

export function isSourceVolitionalChainableHead(op: AuxOpNode, ops: readonly AuxOpNode[]): boolean {
  return isChainableHeadOp(op) && opSourceIsVolitionalInChain(op, ops);
}

function ensureQuestionOutcome(outcome: RenderOutcome): RenderOutcome {
  return outcome.ok
    ? { ...outcome, text: ensureQuestionPunctuation(outcome.text) }
    : outcome;
}

function kanaSelfQuestionClosesUtterance(
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): boolean {
  const layout = ctx.layout;
  const sfpEnd = sfp.source.tokenIndices.at(-1);
  if (layout === undefined || sfpEnd === undefined) {
    return false;
  }
  return sfpEnd + 1 >= layout.utteranceRangeOfToken(sfpEnd).endExclusive;
}

function renderBaseVolitionalQuestion(
  base: KoreanPredicateBase,
  polite: boolean,
  punctuate: boolean = true
): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional question on non-lemma base not supported" };
  }
  const attr = conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "ㄹ/을");
  const text = `${lemmaBase.prefix}${attr}${polite ? "까요" : "까"}`;
  return {
    ok: true,
    text: punctuate ? ensureQuestionPunctuation(text) : text,
    polite
  };
}

function renderBaseVolitionalResolution(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional resolution on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "아/어야지")}`,
    polite: false
  };
}

function renderBaseVolitionalKanaQuestion(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional kana question on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: ensureQuestionPunctuation(`${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "아/어")} 볼까`),
    polite: false
  };
}

export function renderNegativeInviteQuestionSfp(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  const negation = simpleNegativeSfpLayerNegation(layer, { requirePolite: true });
  if (layer.stem.kind !== "verb" || negation === null) {
    return null;
  }
  const stemJi = conjugate(layer.stem.lemma, irregularFrom(layer.stem.irregular), "지");
  return {
    ok: true,
    text: ensureQuestionPunctuation(`${stemJi}${negation.focusParticle ?? ""} ${ctx.formal ? "않겠습니까" : "않을래요"}`),
    polite: true
  };
}

export function renderPlainNegativeQuestionSfp(layer: AuxLayerNode, ctx: RenderContext): RenderOutcome | null {
  const negation = simpleNegativeSfpLayerNegation(layer, { requirePolite: false });
  if ((layer.stem.kind !== "verb" && layer.stem.kind !== "adj") || negation === null) {
    return null;
  }
  const irregular = irregularFrom(layer.stem.irregular);
  if (
    layer.stem.kind === "verb" &&
    layer.stem.shortNegationPolicy === "lexical_prefix" &&
    negationOpAdmitsShortForm(negation)
  ) {
    return {
      ok: true,
      text: ensureQuestionPunctuation(`안 ${conjugate(layer.stem.lemma, irregular, ctx.formal ? "는가" : "아/어")}`),
      polite: false
    };
  }
  const stemJi = conjugate(layer.stem.lemma, irregular, "지");
  return {
    ok: true,
    text: ensureQuestionPunctuation(`${stemJi}${negation.focusParticle ?? ""} ${ctx.formal ? "않은가" : "않아"}`),
    polite: false
  };
}

function simpleNegativeSfpLayerNegation(
  layer: AuxLayerNode,
  options: { readonly requirePolite: boolean }
): NegationOp | null {
  if (layer.terminal !== null) {
    return null;
  }
  let negation: NegationOp | null = null;
  let polite = false;
  for (const op of layer.ops) {
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "negation" && negation === null) {
      negation = op;
      continue;
    }
    return null;
  }
  return negation !== null &&
    negation.chainDepth === 1 &&
    !negation.chainPast &&
    polite === options.requirePolite
    ? negation
    : null;
}

function composeSimpleLemmaSfp(
  lemma: string,
  irregular: IrregularType | null,
  isVerb: boolean,
  effect: Exclude<TailRoot["sfp"], null>["effect"],
  past: boolean,
  polite: boolean,
  formal: boolean
): RenderOutcome | null {
  if (effect === null) {
    return null;
  }
  if (effect === "na_prohib") {
    if (!isVerb) return null;
    return { ok: true, text: `${conjugate(lemma, irregular, "지")} ${formal ? "마라" : "마"}`, polite: false };
  }
  if (effect === "ka" || effect === "plain_q") {
    const ending = formal ? (isVerb ? "는가" : "(으)ㄴ가") : "니";
    return {
      ok: true,
      text: ensureQuestionPunctuation(conjugate(lemma, irregular, effect === "plain_q" && !formal ? "아/어" : ending)),
      polite: false
    };
  }
  if (effect === "ne") {
    if (formal) {
      return {
        ok: true,
        text: composeFormalNeLemmaSfp(lemma, irregular, isVerb, past, polite),
        polite
      };
    }
    const base = past ? `${conjugate(lemma, irregular, "았/었")}다` : lemma;
    return {
      ok: true,
      text: conjugate(base, past ? null : irregular, "네") + (polite ? "요" : ""),
      polite
    };
  }
  if (effect === "na_excl") {
    return {
      ok: true,
      text: composeNaExclLemmaSfp(lemma, irregular, isVerb, past, polite),
      polite
    };
  }
  if (effect === "kana") {
    const base = past ? `${conjugate(lemma, irregular, "았/었")}다` : lemma;
    return { ok: true, text: conjugate(base, past ? null : irregular, "ㄹ/을까"), polite: false };
  }
  if (effect === "jan") {
    const base = past ? `${conjugate(lemma, irregular, "았/었")}다` : lemma;
    return { ok: true, text: `${conjugate(base, past ? null : irregular, "잖아")}${polite ? "요" : ""}`, polite };
  }
  if (effect === "yone_confirm") {
    const base = past ? `${conjugate(lemma, irregular, "았/었")}다` : lemma;
    const ji = conjugate(base, past ? null : irregular, "지");
    return { ok: true, text: applyYoneConfirmSuffixToJiForm(ji, polite, formal), polite };
  }
  void formal;
  return null;
}

export function stripTerminalNodaAfterNegativeNoBridge(layer: AuxLayerNode): AuxLayerNode {
  const last = layer.ops.at(-1);
  const bridge = layer.ops.at(-2);
  if (
    last?.kind === "modal" &&
    last.modal === "noda" &&
    bridge?.kind === "scopeBridge" &&
    bridge.head === "no" &&
    bridge.polarity === "negative" &&
    bridge.chainDepth === 1
  ) {
    return { ...layer, ops: layer.ops.slice(0, -1) };
  }
  return layer;
}

export function renderDirectNegativeConfirmQuestionSfp(layer: AuxLayerNode): string | null {
  const last = layer.ops.at(-1);
  if (
    layer.stem.kind === "noun" &&
    layer.ops.length === 1 &&
    last?.kind === "copula" &&
    last.polarity === "negative" &&
    !last.polite &&
    sourceLooksLikeConfirmatoryCopulaBridge(last.source)
  ) {
    return `${layer.stem.lemma}${hasBatchim(layer.stem.lemma) ? "이" : ""}잖아`;
  }

  if (last?.kind !== "negation" || last.chainPast) {
    return null;
  }
  const bridge = layer.ops.at(-2);
  if (
    bridge?.kind !== "adjCopulaBridge" ||
    !sourceLooksLikeConfirmatoryCopulaBridge(bridge.source)
  ) {
    return null;
  }
  const hostLayer: AuxLayerNode = { ...layer, ops: layer.ops.slice(0, -2) };
  return renderHeadlessNegativeConfirmHost(hostLayer);
}

function sourceLooksLikeConfirmatoryCopulaBridge(source: OpSource): boolean {
  const surfaces = source.tokens.map((token) => token.surface);
  return surfaces.some((surface) => surface === "じゃ" || surface === "では") ||
    surfaces.some((surface) => surface === "は");
}

export function renderHeadlessNegativeConfirmHost(layer: AuxLayerNode): string | null {
  if (layer.stem.kind !== "verb" && layer.stem.kind !== "adj") {
    return null;
  }
  let past = false;
  for (const op of layer.ops) {
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "polite") {
      continue;
    }
    return null;
  }
  const irregular = irregularFrom(layer.stem.irregular);
  if (past) {
    return `${conjugate(layer.stem.lemma, irregular, "았/었")}잖아`;
  }
  return conjugate(layer.stem.lemma, irregular, "잖아");
}

export function renderNounCopulaConjectureQuestionSfp(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  ctx: RenderContext
): RenderOutcome | null {
  if (sfp.effect !== "ka" && sfp.effect !== "kana" && sfp.effect !== "plain_q" && sfp.effect !== "polite_q") {
    return null;
  }
  if (
    (sfp.effect === "ka" || sfp.effect === "kana") &&
    layer.terminal === null &&
    layer.stem.kind === "noun" &&
    layer.ops.length === 1 &&
    layer.ops[0]?.kind === "conjecture"
  ) {
    const conjecturePolite = layer.ops[0].polite;
    const bare = nounCopulaBase(layer.stem.lemma, false, nounCopulaStemAllomorphHost(layer.stem, ctx));
    return {
      ok: true,
      text: ensureQuestionPunctuation(composeNounCopulaConjectureQuestion(
        { ...bare, prefix: `${layer.stem.koreanPrefix ?? ""}${bare.prefix}` },
        false,
        ctx.formal,
        conjecturePolite
      )),
      polite: conjecturePolite
    };
  }
  const frame = nounCopulaConjectureQuestionFrameFromAuxLayer(layer, ctx);
  if (frame === null) {
    return null;
  }
  if ("ok" in frame) {
    return frame;
  }
  const polite = sfp.effect === "polite_q" || frame.polite || frame.conjecture.polite;
  if (!sfpHasSelfDirectedConjectureRole(sfp)) {
    const confirmation = composeNounCopulaBaseWithConjecture(
      frame.base,
      frame.past,
      ctx.formal,
      polite,
      frame.conjecture.polite,
      ctx.lookups
    );
    return confirmation.ok
      ? { ...confirmation, text: ensureQuestionPunctuation(confirmation.text) }
      : confirmation;
  }
  return {
    ok: true,
    text: ensureQuestionPunctuation(composeNounCopulaConjectureQuestion(
      frame.base,
      frame.past,
      ctx.formal,
      polite
    )),
    polite
  };
}

export function composeRenderedNominalizedConjectureQuestion(text: string, polite: boolean): string | null {
  const patterns = [
    { suffix: " 것이겠지요", carrier: " 것이겠다" },
    { suffix: " 것이겠죠", carrier: " 것이겠다" },
    { suffix: " 것이겠지", carrier: " 것이겠다" },
    { suffix: " 거겠지요", carrier: " 거겠다" },
    { suffix: " 거겠죠", carrier: " 거겠다" },
    { suffix: " 거겠지", carrier: " 거겠다" }
  ] as const;
  for (const pattern of patterns) {
    if (!text.endsWith(pattern.suffix)) {
      continue;
    }
    const attr = text.slice(0, -pattern.suffix.length);
    return composeNominalizedConjectureQuestion(`${attr}${pattern.carrier}`, polite);
  }
  return null;
}

interface NounCopulaConjectureQuestionFrame {
  readonly base: ReturnType<typeof nounCopulaBaseForCopula>;
  readonly conjecture: ConjectureOp;
  readonly past: boolean;
  readonly polite: boolean;
}

function nounCopulaConjectureQuestionFrameFromAuxLayer(
  layer: AuxLayerNode,
  ctx: RenderContext
): NounCopulaConjectureQuestionFrame | RenderFailure | null {
  if (layer.terminal !== null || layer.stem.kind !== "noun") {
    return null;
  }
  const first = layer.ops[0];
  if (first?.kind !== "copula" || first.variant !== "basic") {
    return null;
  }
  let polite = first.polite;
  let past = false;
  let chainDepth = 0;
  let conjecture: ConjectureOp | null = null;
  for (let index = 1; index < layer.ops.length; index += 1) {
    const op = layer.ops[index]!;
    if (op.kind === "polite") {
      polite = true;
      continue;
    }
    if (op.kind === "tense" && op.tense === "past") {
      past = true;
      continue;
    }
    if (op.kind === "negation" && first.polarity === "negative") {
      chainDepth = op.chainDepth;
      past = past || op.chainPast;
      continue;
    }
    if (op.kind === "modal" && op.modal === "noda" && conjecture === null) {
      polite = polite || op.polite;
      past = past || op.past;
      continue;
    }
    if (op.kind === "conjecture") {
      if (conjecture !== null || index !== layer.ops.length - 1) {
        return { ok: false, reason: "noun copula conjecture question requires final single conjecture op" };
      }
      conjecture = op;
      continue;
    }
    return null;
  }
  if (conjecture === null) {
    return null;
  }
  const base = nounCopulaPolarityBaseForCopula(first, layer.stem.lemma, chainDepth, nounCopulaStemAllomorphHost(layer.stem, ctx));
  return {
    base: {
      ...base,
      prefix: `${layer.stem.koreanPrefix ?? ""}${base.prefix}`
    },
    conjecture,
    past,
    polite
  };
}
