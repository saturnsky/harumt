import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { POS5A, 意志推量形_, 未然形_ } from "../../../../../types/pos.js";
import type { AuxLayerNode, AuxOpNode, BenefactiveAspectOp, ConjectureOp, ConnectiveOp, DesiderativeAspectOp, DesireOp, MiseruAspectOp, ProhibitionAspectOp, RequestAspectOp, SimpleAspectOp, ModalOp, NegationOp, ObligationIdiomOp, PoliteOp, PotentialKotoGaDekiruIdiomOp, StemNode, TenseOp, VoiceOp } from "../grammar.js";
import { isBenefactiveAspectOp } from "../inspect.js";
import { stemAllowsSahenShortNegationSplit } from "../short-negation-policy.js";
import { type RenderFailure, type RenderOutcome, type RenderSuccess, withStemPrefixApplied, withWarnings } from "./base-model.js";
import { composeFinalForm, irregularFrom } from "./final-forms.js";
import { causativeItadakuCommitmentLemma } from "./base-support.js";
import { applyQuoteBoundaryFocus } from "./quote-complement-compose.js";
import { attachCommittedChainTrace, composeBaseWithPlainImperative } from "./predicate-terminal-compose.js";
import { voiceBase } from "./voice-benefactive-bases.js";
import { renderRequestOnPredicateBase } from "./command-render.js";
import { isSimpleAspectOpKind } from "./op-chain.js";
import { renderBenefactiveVolitional, renderBenefactiveVolitionalPurpose, renderBenefactiveVolitionalQuestionQuotative } from "./aspect-benefactive.js";
import { createVoiceOp } from "../op-builders.js";
import type { AuxLayerOpState, AuxLayerRenderContext } from "./aux-layer-context.js";
import type { OperatorChainFinalContext } from "./operator-chain-tail.js";

export function markBenefactiveRequestEvidence(
  op: BenefactiveAspectOp
): BenefactiveAspectOp {
  return op.requestEvidence === "terminal_question"
    ? op
    : { ...op, requestEvidence: "terminal_question" };
}

export function tryCausativeItadakuHumbleNonTerminal(
  layer: AuxLayerNode,
  lookups: LookupTables
): AuxLayerNode | null {
  if (layer.stem.kind !== "verb") {
    return null;
  }
  const voiceOp = layer.ops.find((op): op is VoiceOp => op.kind === "voice" && op.voice === "causative");
  if (voiceOp === undefined) {
    return null;
  }
  const benefactiveOp = layer.ops.find((op): op is BenefactiveAspectOp =>
    isBenefactiveAspectOp(op) && op.benefactive.kind === "itadaku" && op.benefactive.potential !== true);
  if (benefactiveOp === undefined) {
    return null;
  }
  const isPlainTerminal = layer.terminal === null && layer.ops.every((op) =>
    op === voiceOp || op === benefactiveOp || op.kind === "tense" || op.kind === "polite");
  if (isPlainTerminal) {
    return null;
  }
  const hasIncompatibleOp = layer.ops.some((op) => {
    if (op === voiceOp || op === benefactiveOp) {
      return false;
    }
    if (op.kind === "tense" || op.kind === "polite" || op.kind === "connective") {
      return false;
    }
    if (op.kind === "aspect" && isSimpleAspectOpKind(op.aspect)) {
      return false;
    }
    return true;
  });
  if (hasIncompatibleOp) {
    return null;
  }
  const [lemma, irregular] = causativeItadakuCommitmentLemma(
    layer.stem,
    layer.stem.lemma,
    irregularFrom(layer.stem.irregular),
    lookups
  );
  const stem: StemNode = { ...layer.stem, lemma, irregular, commitment: "resolved_sense" };
  const ops = layer.ops.filter((op) => op !== voiceOp && op !== benefactiveOp);
  return { ...layer, stem, ops };
}

export function classifyAuxLayerVoiceOp(
  state: AuxLayerOpState,
  layer: AuxLayerNode,
  op: VoiceOp,
  i: number
): RenderFailure | null {
  if (state.voice !== null) {
    if (
      state.voiceIdx !== null &&
      layer.ops.slice(state.voiceIdx + 1, i).some((between) => between.kind === "predicateQuoteCarrier")
    ) {
      state.voice = op;
      state.voiceIdx = i;
      return null;
    }
    if (state.voice.voice === "causative" && op.voice === "passive") {
      state.voice = foldCausativePassiveVoiceOps(state.voice, op);
    } else if (state.voice.voice === "passive" && op.voice === "passive") {
    } else if (
      state.voice.voice === "passive" &&
      op.voice === "honorific" &&
      passiveTeIruHonorificCompositionIsCanonical(layer.ops, i)
    ) {
    } else if (isAspectAuxiliaryPotentialVoice(layer.ops, i)) {
    } else {
      return { ok: false, reason: `multi-voice composition '${state.voice.voice}' + '${op.voice}' not supported` };
    }
  } else {
    state.voice = op;
    state.voiceIdx = i;
  }
  return null;
}

export function renderCausativeItadakuHumbleTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, formal, stemLemma, stemIrregular } = rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, desire, voice, potentialKotoGaDekiru, connective, aspect, benefactive, request, prohibition, desiderative, miseru } = state;
  const causativeItadakuCommitment = renderCausativeReceiveHumbleCommitment({
    stem: layer.stem,
    stemLemma,
    stemIrregular,
    voice,
    benefactive,
    connective,
    modal,
    conjecture,
    desire,
    obligation,
    potentialKotoGaDekiru,
    aspect,
    request,
    prohibition,
    desiderative,
    miseru,
    preModalNeg,
    postModalNeg,
    preModalTense,
    postModalTense,
    preModalPolite,
    postModalPolite,
    formal,
    lookups: ctx.lookups
  });
  if (causativeItadakuCommitment !== null) {
    return withWarnings(causativeItadakuCommitment, warnings);
  }
  return null;
}

export function renderChainBenefactiveFinalForm(fc: OperatorChainFinalContext): RenderOutcome | null {
  const { chainWarnings, isPoliteCombined, baseRes, lastBenefactive, volitionalQuestionQuotative } = fc;
  const { ctx, formal, stemLemma, stemIrregular } = fc.rc;
  const { postModalPolite, connective } = fc.state;
  if (lastBenefactive !== null) {
    const benefAuxPos5A =
      (lastBenefactive.source.tokens[lastBenefactive.source.tokens.length - 1]?.pos ?? 0) & POS5A;
    const benefPoliteVolitional = postModalPolite !== null &&
      ((postModalPolite.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_;
    if (
      (benefAuxPos5A === 意志推量形_ || benefPoliteVolitional) &&
      baseRes.finalNeg === null &&
      !baseRes.finalPast
    ) {
      if (
        connective !== null &&
        connective.surface === "と" &&
        connective.connective === "quotative"
      ) {
        const plain = renderBenefactiveVolitional({
          stemLemma, stemIrregular, benefactive: lastBenefactive, formal: false
        });
        return withWarnings(
          plain.ok
            ? attachCommittedChainTrace({ ok: true, text: `${plain.text}고`, polite: plain.polite }, baseRes)
            : plain,
          chainWarnings
        );
      }
      if (connective === null) {
        return withWarnings(attachCommittedChainTrace(renderBenefactiveVolitional({
          stemLemma,
          stemIrregular,
          benefactive: lastBenefactive,
          formal: benefPoliteVolitional ? true : formal
        }), baseRes), chainWarnings);
      }
      if (
        connective !== null &&
        connective.surface === "と" &&
        connective.connective === "volitional_purpose"
      ) {
        return withWarnings(attachCommittedChainTrace(applyQuoteBoundaryFocus(renderBenefactiveVolitionalPurpose({
          stemLemma,
          stemIrregular,
          benefactive: lastBenefactive
        }), connective.attemptFocusParticle), baseRes), chainWarnings);
      }
      if (volitionalQuestionQuotative) {
        const question = renderBenefactiveVolitionalQuestionQuotative({
          stemLemma,
          stemIrregular,
          benefactive: lastBenefactive
        });
        if (question.ok) {
          return withWarnings(attachCommittedChainTrace(question, baseRes), chainWarnings);
        }
      }
    }
    if (lastBenefactive.terminalMood === "imperative" && connective === null) {
      if (baseRes.finalNeg !== null || baseRes.finalPast || isPoliteCombined) {
        return { ok: false, reason: "benefactive imperative + chain/tense/polite composition not yet supported" };
      }
      return withStemPrefixApplied(withWarnings(
        attachCommittedChainTrace(composeBaseWithPlainImperative(baseRes.base, ctx.formal), baseRes),
        chainWarnings
      ));
    }
    if (benefAuxPos5A === 未然形_ && connective === null && baseRes.finalNeg === null) {
      if (lastBenefactive.benefactive.potential) {
        return withStemPrefixApplied(withWarnings(
          { ok: true, text: `${baseRes.base.prefix}있지`, polite: isPoliteCombined },
          chainWarnings
        ));
      }
      if (baseRes.base.final.kind === "lemma") {
        return withStemPrefixApplied(withWarnings(attachCommittedChainTrace({
          ok: true,
          text: `${baseRes.base.prefix}${conjugate(baseRes.base.final.lemma, baseRes.base.final.irregular, "지")}`,
          polite: isPoliteCombined
        }, baseRes), chainWarnings));
      }
    }
  }
  return null;
}

export function renderNonChainVoiceTerminal(rc: AuxLayerRenderContext, state: AuxLayerOpState): RenderOutcome | null {
  const { layer, ctx, warnings, isVerb, stemLemma, stemIrregular, passiveStemOptions, prohibitionTerminalBasePath } = rc;
  const { preModalNeg, postModalNeg, preModalTense, postModalTense, preModalPolite, postModalPolite, obligation, modal, conjecture, voice, potentialKotoGaDekiru, connective, aspect, benefactive, request, prohibition, desiderative, miseru } = state;
  if (voice !== null && !prohibitionTerminalBasePath) {
    if (
      request !== null &&
      modal === null && obligation === null && potentialKotoGaDekiru === null &&
      aspect === null && benefactive === null &&
      prohibition === null && desiderative === null && miseru === null &&
      conjecture === null && connective === null &&
      preModalNeg === null && preModalTense === null && preModalPolite === null &&
      postModalNeg === null && postModalTense === null && postModalPolite === null
    ) {
      const voiceResult = voiceBase({ voice, stemLemma, stemIrregular, isVerb, passiveStemOptions, lookups: ctx.lookups, sahenShortNegationSplit: stemAllowsSahenShortNegationSplit(layer.stem.koreanPrefix) });
      return withWarnings(renderRequestOnPredicateBase(voiceResult, request, ctx.lookups, {
        formal: ctx.formal
      }), warnings);
    }
    return { ok: false, reason: "voice outside operator-chain dispatcher — 비chain 결합 영역 외" };
  }
  return null;
}



export function foldCausativePassiveVoiceOps(
  causative: VoiceOp,
  passive: VoiceOp
): VoiceOp {
  if (causative.voice !== "causative" || passive.voice !== "passive") {
    throw new Error(`causative-passive fold requires causative+passive, got ${causative.voice}+${passive.voice}`);
  }
  const passiveClass = passive.passiveClass ?? causative.passiveClass;
  const adversativeBaseLemma = passive.adversativePassiveBaseLemma ?? causative.adversativePassiveBaseLemma;
  return createVoiceOp({
    source: causative.source,
    voice: "causative_passive",
    forcePassive: causative.forcePassive,
    ...(passiveClass === undefined ? {} : { passiveClass }),
    adversativePassive: causative.adversativePassive,
    adversativePassiveAgentPromoted: causative.adversativePassiveAgentPromoted,
    ...(adversativeBaseLemma === undefined
      ? {}
      : {
        adversativePassiveBaseLemma: adversativeBaseLemma,
        adversativePassiveBaseIrregular:
          passive.adversativePassiveBaseIrregular ?? causative.adversativePassiveBaseIrregular ?? null
      })
  });
}

function isAspectAuxiliaryPotentialVoice(ops: readonly AuxOpNode[], voiceIdx: number): boolean {
  const voice = ops[voiceIdx];
  const aspect = ops[voiceIdx - 1];
  if (voice?.kind !== "voice" || voice.voice !== "potential" || aspect?.kind !== "aspect") return false;
  const auxIdx = aspect.source.tokenIndices.at(-1);
  return auxIdx !== undefined && voice.source.tokenIndices.length === 1 && voice.source.tokenIndices[0] === auxIdx;
}

function passiveTeIruHonorificCompositionIsCanonical(
  ops: readonly AuxOpNode[],
  honorificVoiceIdx: number
): boolean {
  const segmentStart = ops
    .slice(0, honorificVoiceIdx)
    .findLastIndex((op) => op.kind === "predicateQuoteCarrier") + 1;
  const nextCarrierOffset = ops
    .slice(honorificVoiceIdx + 1)
    .findIndex((op) => op.kind === "predicateQuoteCarrier");
  const segmentEnd = nextCarrierOffset < 0
    ? ops.length
    : honorificVoiceIdx + 1 + nextCarrierOffset;
  const voiceIndices = ops
    .slice(segmentStart, segmentEnd)
    .flatMap((op, offset) => op.kind === "voice" ? [segmentStart + offset] : []);
  if (voiceIndices.length !== 2) return false;
  const passiveIdx = voiceIndices[0]!;
  const honorificIdx = voiceIndices[1]!;
  const passive = ops[passiveIdx];
  const honorific = ops[honorificIdx];
  return passive?.kind === "voice" && passive.voice === "passive" &&
    honorific?.kind === "voice" && honorific.voice === "honorific" &&
    ops.slice(passiveIdx + 1, honorificIdx).some((op) => op.kind === "aspect" && op.aspect === "te_iru");
}

function renderCausativeReceiveHumbleCommitment(options: {
  readonly stem: StemNode;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly voice: VoiceOp | null;
  readonly benefactive: BenefactiveAspectOp | null;
  readonly connective: ConnectiveOp | null;
  readonly modal: ModalOp | null;
  readonly conjecture: ConjectureOp | null;
  readonly desire: DesireOp | null;
  readonly obligation: ObligationIdiomOp | null;
  readonly potentialKotoGaDekiru: PotentialKotoGaDekiruIdiomOp | null;
  readonly aspect: SimpleAspectOp | null;
  readonly request: RequestAspectOp | null;
  readonly prohibition: ProhibitionAspectOp | null;
  readonly desiderative: DesiderativeAspectOp | null;
  readonly miseru: MiseruAspectOp | null;
  readonly preModalNeg: NegationOp | null;
  readonly postModalNeg: NegationOp | null;
  readonly preModalTense: TenseOp | null;
  readonly postModalTense: TenseOp | null;
  readonly preModalPolite: PoliteOp | null;
  readonly postModalPolite: PoliteOp | null;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): RenderSuccess | null {
  const { voice, benefactive } = options;
  if (voice === null || benefactive === null || voice.voice !== "causative") {
    return null;
  }
  const payload = benefactive.benefactive;
  if (payload.kind !== "itadaku" || payload.potential) {
    return null;
  }
  const polite = options.preModalPolite !== null || options.postModalPolite !== null;
  const pastTense = options.preModalTense?.tense === "past" || options.postModalTense?.tense === "past";
  if (
    options.connective !== null ||
    options.modal !== null ||
    options.conjecture !== null ||
    options.desire !== null ||
    options.obligation !== null ||
    options.potentialKotoGaDekiru !== null ||
    options.aspect !== null ||
    options.request !== null ||
    options.prohibition !== null ||
    options.desiderative !== null ||
    options.miseru !== null ||
    options.preModalNeg !== null ||
    options.postModalNeg !== null
  ) {
    return null;
  }

  const [lemma, irregular] = causativeItadakuCommitmentLemma(
    options.stem,
    options.stemLemma,
    options.stemIrregular,
    options.lookups
  );
  if (pastTense) {
    return {
      ok: true,
      text: composeFinalForm(lemma, irregular, true, true, options.formal, polite, options.lookups),
      polite
    };
  }
  return {
    ok: true,
    text: composeReceiveHumbleCommitmentTerminal(lemma, irregular, options.formal, polite),
    polite
  };
}

function composeReceiveHumbleCommitmentTerminal(
  lemma: string,
  irregular: IrregularType | null,
  formal: boolean,
  polite: boolean
): string {
  if (formal) {
    return `${conjugate(lemma, irregular, "겠")}${polite ? "습니다" : "다"}`;
  }
  return `${conjugate(lemma, irregular, "ㄹ/을")}게${polite ? "요" : ""}`;
}
