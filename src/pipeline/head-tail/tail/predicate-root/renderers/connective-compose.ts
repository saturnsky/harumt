import { composeCommittedTailDiscursiveSfp, composePlainSelfQuestionTerminal, composeTerminalMoodOnBase } from "./sfp-question.js";
import { quoteProjectionForSfpEffect } from "../../../../semantics/sfp-quote-projection.js";
import { nounCopulaConnective, shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { POS4, POS5A, 仮定形_, 助動詞_ダ, isPastAuxConditionalForm } from "../../../../../types/pos.js";
import { canonicalMedialProlongationConnectiveSurface, isNiSeriesConcessiveConditionalSurface } from "../connective-surface-table.js";
import { isQuestionContentConnective } from "../bare-noun-stem-hosting.js";
export { isQuestionContentConnective };
import { addCoda, hasBatchim, hasNoCoda } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim, nounPastCopulaStem, selectParticle, type ParticleKey } from "../../../../../generator/particles.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { normalizeGiveRequest, normalizeRequestQuotative, normalizeRequestQuoteNominal, requestQuoteAttributiveRecipe } from "../../../../rendering/request-normalization.js";
import { CONNECTIVE_RENDER_MAP, isAdversativeConnectiveSurface } from "../connective-render-table.js";
import { quotedMoodForClosingSfpEffect, type YoudaModalOp, type AuxLayerNode, type ConjectureOp, type ConnectiveOp, type CopulaOp, type NegationOp, type QuoteBoundaryFocusParticle, type ShortNegationPolicy, type VolitionalAttemptFocusParticle, type TeFormConnectiveRole, DEFAULT_RENYOU_CHUUSHI_ROLE, DEFAULT_TE_FORM_ROLE, RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE } from "../grammar.js";
import { likenessAttributiveLexicalizationBase, isFutureAttributiveProjection, applyNegationChainToLemmaBase, closeChainTraceAgainstText, closeChainTraceWithConnectivePieces, closeChainTraceWithFinalConnectiveAgainstTerminal, concatPredicatePrefix, rebindChainFinalPlaceholders, rebindChainTraceForProjection, tracedCat, tracedChainFinalPlaceholder, tracedSeg, type AttributivePastProjection, type AttributiveProjectionPolicy, type BaseResult, type ChainSourceTrace, type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, type NegativeAttributiveProjection, type NounCopulaPredicateBase, nounCopulaFinalAllomorphHost, nounCopulaRealizedAllomorphHost, type OkBaseResult, predicateBasePolicyAllomorphHost, type RenderOutcome, type TailTraceSegment, baseResultWithNegationFocus, negationLoweringOptionsWithOpFocus } from "./base-model.js";
import { applyConnectivePrefixContraction, applyExternalNegationDepthToPredicateBase, applyTerminalPrefixContraction, completionPotentialCompletedBase, conjectureBaseSourceTrace, finalNegationLoweringForcesPast, isBenefactiveNegativeCarrierPolicy, lexicalPotentialStemBase, lowerBaseForPredicateProjection, lowerBaseKeepingFinal, lowerFinalNegationDepthForCommittedBase, lowerFinalNegationForCommittedBase, lowerPotentialFinalNegationBase, copularLemmaOfBase, negativeNounCopulaChainBase, nounCopulaBaseForCopula, predicateBaseInfinitiveForm, quotePlainDeclarative } from "./base-support.js";
import { composeAniForm, composeDoublePastFinalForm, composeFinalForm, conjectureFinalForm, nounToCopulaForm, obligationEmphasis, renderBaseVolitionalTerminal } from "./final-forms.js";
import {
  renderPredicateBaseVolitionalCohortativeAttributive,
  renderPredicateBaseVolitionalDeliberativeRetrospective,
  renderPredicateBaseVolitionalIntentAttributive,
  renderPredicateBaseVolitionalPurposeConnective,
  renderPredicateBaseVolitionalQuotative
} from "./final-forms.js";
import { loadTailAttachmentRegistry, nominalFrameDataGeneration } from "../../../head/adapters/nominal/frame-table.js";
import { boundNominalReasonQuoteCarrierAt } from "../matchers/bound-nominal-connective.js";
import { predicateMoodRequestsFutureProjection } from "../attributive-head-policy.js";
import { isHeadOp } from "../operator-head.js";
import { createConnectiveOp } from "../op-builders.js";


export function attributiveBoundaryRequestsFutureProjection(layer: AuxLayerNode): boolean {
  if (predicateMoodRequestsFutureProjection(layer)) {
    return true;
  }
  const obligationIdx = layer.ops.findIndex((op) =>
    op.kind === "idiom" &&
    op.idiom === "obligation" &&
    op.variant === "beki" &&
    op.polarity === "affirmative"
  );
  if (obligationIdx >= 0 && !layer.ops.slice(obligationIdx + 1).some(isHeadOp)) {
    return true;
  }
  return layer.terminalPayload?.kind === "attributiveBoundary" &&
    (layer.terminalPayload.headKind === "future_commitment" ||
      layer.terminalPayload.headRequestsFutureProjection === true) &&
    layer.terminalPayload.projection === "ordinary_nominal";
}

function copularQuoteOption(base: KoreanPredicateBase): { readonly copularLemma?: string } {
  const lemma = copularLemmaOfBase(base);
  return lemma === undefined ? {} : { copularLemma: lemma };
}

export function composeBaseWithConjectureQuestionConnective(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  if (!isConjectureQuestionContinuationConnective(connective)) {
    return { ok: false, reason: "conjecture question connective requires question-content connective" };
  }
  const questionPolite = polite ||
    (connective.questionContentRole === "terminal" &&
      base.final.kind === "lemma" &&
      base.final.idiom?.kind === "conjecture" &&
      base.final.idiom.conjecturePolite === true);
  let question: string | null = null;
  if (base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture") {
    const nominalized = base.final.idiom.projection === "nominalized"
      ? nominalizedConjectureStem(base.final.lemma)
      : null;
    if (nominalized !== null) {
      question = `${base.prefix}${nominalized}일까${questionPolite ? "요" : ""}`;
    } else if (base.policy?.kind === "noun_copula_interop") {
      question = composeNounCopulaConjectureQuestion(
        {
          prefix: "",
          final: {
            kind: "nounCopula",
            nounSurface: base.policy.nounSurface,
            isBoundNoun: base.policy.isBoundNoun
          }
        },
        past || base.policy.conjectureHostPast === true,
        formal,
        questionPolite
      );
    } else if (base.policy?.kind === "negative_noun_copula_interop") {
      const attr = past || base.policy.conjectureHostPast === true ? "아니었을" : "아닐";
      question = `${base.policy.conjectureSubject}${attr}까${questionPolite ? "요" : ""}`;
    } else if (base.final.idiom.sourceLemma !== undefined) {
      const sourceLemma = base.final.idiom.sourceLemma;
      const sourceIrregular = base.final.idiom.sourceIrregular ?? null;
      const lemmaQuestion = base.final.idiom.sourceNegation === "long"
        ? `${base.final.idiom.sourceNegationInability === true ? "못할까" : "않을까"}${questionPolite ? "요" : ""}`
        : past
          ? `${conjugate(sourceLemma, sourceIrregular, "았/었")}을까${questionPolite ? "요" : ""}`
          : `${conjugate(sourceLemma, sourceIrregular, "ㄹ/을까")}${questionPolite ? "요" : ""}`;
      question = `${base.prefix}${lemmaQuestion}`;
    }
  } else if (base.final.kind === "nounCopula" || base.final.kind === "negativeNounCopula") {
    question = composeNounCopulaConjectureQuestion(
      base as NounCopulaPredicateBase,
      past,
      formal,
      questionPolite
    );
  } else if (base.final.kind === "lemma") {
    const lemmaQuestion = past
      ? `${conjugate(base.final.lemma, base.final.irregular, "았/었")}을까${questionPolite ? "요" : ""}`
      : `${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을까")}${questionPolite ? "요" : ""}`;
    question = `${base.prefix}${lemmaQuestion}`;
  }
  if (question === null) {
    return { ok: false, reason: "conjecture question connective on non-projectable base not supported" };
  }
  const suffix = connective.connective === "question_quotative" ? " 하고" : "";
  return { ok: true, text: `${question}${suffix}`, polite: questionPolite };
}

function composeNounCopulaNegativeToObligation(
  noun: string,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables,
  allomorphHost?: string
): RenderOutcome {
  const obligationBase = nounCopulaObligationBase(noun, allomorphHost);
  const terminal = composeBaseWithTerminalChain(obligationBase, null, false, formal, polite, lookups);
  return terminal;
}

export function nounCopulaObligationBaseForCopula(
  copula: CopulaOp,
  noun: string,
  allomorphHost?: string
): KoreanLemmaPredicateBase {
  if (copula.honorific !== true) {
    return nounCopulaObligationBase(noun, allomorphHost);
  }
  const honorificBase = nounCopulaBaseForCopula(copula, noun, allomorphHost);
  if (honorificBase.final.kind !== "lemma") {
    return nounCopulaObligationBase(noun, allomorphHost);
  }
  return {
    prefix: `${noun}${conjugate(honorificBase.final.lemma, honorificBase.final.irregular, "아/어")}야 `,
    final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
  };
}

export function nounCopulaObligationBase(noun: string, allomorphHost?: string): KoreanLemmaPredicateBase {
  const copulaStem = hasBatchim(allomorphHost ?? noun) ? `${noun}이어` : `${noun}여`;
  return {
    prefix: `${copulaStem}야 `,
    final: {
      kind: "lemma",
      lemma: "하다",
      irregular: "여",
      isVerb: true
    }
  };
}

export function composeBaseWithBareProhibition(base: KoreanPredicateBase): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition on non-lemma predicate base not supported" };
  }
  return {
    ok: true,
    text: concatPredicatePrefix(
      base.prefix,
      `${conjugate(base.final.lemma, base.final.irregular, "지")} 마`
    ),
    polite: false
  };
}

export function composeBaseWithSequenceAfterCompactQuoteAttributive(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (connective.connective !== "sequence_after") {
    return { ok: false, reason: "compact quote attributive requires sequence_after connective" };
  }
  const sequence = composeBaseWithConnective(
    base,
    connective,
    past,
    false,
    preNeg,
    formal,
    lookups
  );
  if (!sequence.ok) return sequence;
  return {
    ok: true,
    text: `${sequence.text}${selectParticle(sequence.text, "이라는/라는")}`,
    polite: false
  };
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

function composeNegativeNounCopulaTerminal(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "negativeNounCopula" }>,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): RenderOutcome {
  const base = negativeNounCopulaChainBase(final, formal);
  return composeBaseWithTerminal({ prefix: `${prefix}${base.prefix}`, final: base.final }, past, formal, polite, lookups);
}

function composeNegativeNounCopulaConnective(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "negativeNounCopula" }>,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (connective.surface === "と" && final.chainDepth === 0 && !past) {
    return composeNounCopulaNegativeToObligation(final.nounSurface, formal, polite, lookups, final.allomorphHost);
  }
  const base = negativeNounCopulaChainBase(final, formal);
  return composeCommittedTailConnective(
    { ok: true, base: { prefix: `${prefix}${base.prefix}`, final: base.final }, chainOnFinalSupported: true },
    connective,
    past,
    polite,
    null,
    formal, lookups
  );
}

function composeLemmaBaseWithNegationTerminal(
  base: KoreanPredicateBase,
  chainDepth: number,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions = {}
): RenderOutcome {
  const lowered = applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options);
  if (lowered === null) {
    return { ok: false, reason: "chain on non-lemma base + terminal not supported" };
  }
  return composeBaseWithTerminal(lowered, past, formal, polite, lookups);
}

function composeBaseWithTerminalChainDepth(
  base: KoreanPredicateBase,
  chainDepth: number,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions = {}
): RenderOutcome {
  if (chainDepth < 0) {
    return { ok: false, reason: "negative terminal chain depth invariant violation" };
  }
  if (chainDepth === 0) {
    return composeBaseWithTerminal(base, past, formal, polite, lookups);
  }
  return composeLemmaBaseWithNegationTerminal(
    base,
    chainDepth,
    past,
    formal,
    polite,
    lookups,
    options
  );
}

export function composeBaseWithTerminalChain(
  base: KoreanPredicateBase,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions = {}
): RenderOutcome {
  const effectivePast = past || (finalNeg?.chainPast ?? false);
  return composeBaseWithTerminalChainDepth(
    base,
    finalNeg?.chainDepth ?? 0,
    effectivePast,
    formal,
    polite,
    lookups,
    negationLoweringOptionsWithOpFocus(finalNeg, options)
  );
}

function composeBaseWithQuestionContentAlternative(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (
    preNeg === null &&
    base.policy?.kind === "obligation" &&
    base.policy.polarity === "affirmative"
  ) {
    if (effectivePast && base.policy.variant === "beki") {
      const hostBase: KoreanLemmaPredicateBase = {
        prefix: "",
        final: {
          kind: "lemma",
          lemma: base.policy.stemLemma,
          irregular: base.policy.stemIrregular,
          isVerb: base.policy.isVerb
        }
      };
      const attr = projectBaseAttributive(hostBase, false, formal);
      if (attr === null) {
        return { ok: false, reason: "beki かどうか past host attributive not supported" };
      }
      return { ok: true, text: `${attr} 게 맞았는지 안 맞았는지`, polite: false };
    }
    if (!effectivePast) {
      const stemAe = conjugate(base.policy.stemLemma, base.policy.stemIrregular, "아/어");
      const obligationCore = `${stemAe}야${obligationEmphasis(base.policy.variant)}`;
      return { ok: true, text: `${obligationCore} 할지 말지`, polite: false };
    }
  }

  const question = composeBaseWithConnective(
    base,
    { ...connective, connective: "question_content", surface: "か" },
    past,
    isPolite,
    preNeg,
    formal,
    lookups,
    options
  );
  if (!question.ok) {
    return question;
  }
  return { ok: true, text: `${question.text} 아닌지`, polite: question.polite };
}

export function attachCommittedChainTrace(result: RenderOutcome, baseResult: BaseResult): RenderOutcome {
  if (!result.ok || !baseResult.ok) {
    return result;
  }
  const chainTrace = (baseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace;
  if (chainTrace === undefined) {
    return result;
  }
  if (result.traced !== undefined) {
    const rebound = rebindChainFinalPlaceholders(result.traced, chainTrace);
    if (rebound !== null) {
      return { ...result, traced: rebound };
    }
    const { traced: _dropped, ...rest } = result;
    return rest;
  }
  const traced = closeChainTraceAgainstText(chainTrace, result.text);
  if (traced === null) {
    return result;
  }
  return { ...result, traced };
}

function attachCommittedChainTraceFromPieces(result: RenderOutcome, baseResult: BaseResult): RenderOutcome {
  if (!result.ok || !baseResult.ok || result.traced === undefined) {
    return result;
  }
  const chainTrace = (baseResult as { readonly chainSourceTrace?: ChainSourceTrace }).chainSourceTrace;
  if (chainTrace === undefined) {
    const { traced: _dropped, ...rest } = result;
    return rest;
  }
  const rebound = rebindChainFinalPlaceholders(result.traced, chainTrace);
  if (rebound !== null) {
    return { ...result, traced: rebound };
  }
  const { traced: _dropped, ...rest } = result;
  return rest;
}

export function composeCommittedTailTerminal(
  baseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): RenderOutcome {
  return composeCommittedTailTerminalDepth(
    baseResultWithNegationFocus(baseResult, finalNeg),
    finalNeg?.chainDepth ?? 0,
    past || (finalNeg?.chainPast ?? false),
    formal,
    polite,
    lookups
  );
}

export function composeCommittedTailTerminalDepth(
  baseResult: BaseResult,
  chainDepth: number,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (baseResult.terminalRealization?.kind === "exclamative" && chainDepth === 0) {
    const { terminalRealization: _exclamative, ...plainBaseResult } = baseResult;
    return attachCommittedChainTrace(
      composeCommittedTailDiscursiveSfp(plainBaseResult, null, past, formal, polite, "ne", lookups),
      baseResult
    );
  }
  if (
    baseResult.terminalRealization?.kind === "reported_request" &&
    chainDepth === 0 &&
    !past &&
    !polite &&
    !formal
  ) {
    const requestBase = baseResult.terminalRealization.requestBase;
    if (requestBase.final.kind !== "lemma") {
      return { ok: false, reason: "reported request terminal requires a lemma request base" };
    }
    const requestHead = conjugate(
      requestBase.final.lemma,
      requestBase.final.irregular,
      "아/어"
    );
    const terminal = normalizeGiveRequest(
      requestHead,
      requestBase.final.lemma,
      "달래"
    );
    return attachCommittedChainTrace({
      ok: true,
      text: concatPredicatePrefix(requestBase.prefix, terminal),
      polite: false
    }, baseResult);
  }
  if (
    baseResult.terminalRealization?.kind === "elided_carrier" &&
    chainDepth === 0 &&
    !past
  ) {
    return attachCommittedChainTrace({
      ok: true,
      text: baseResult.base.prefix.trimEnd(),
      polite: false
    }, baseResult);
  }
  if (chainDepth > 0 && baseResult.chainOnFinalSupported === false) {
    const lowered = lowerFinalNegationDepthForCommittedBase(baseResult, chainDepth, formal, lookups);
    if (lowered === null) {
      return { ok: false, reason: "chain on committed terminal final 영역 외 (자연도 / idiom 변환 영역)" };
    }
    const loweredForcesPast = finalNegationLoweringForcesPast(baseResult, chainDepth);
    const terminalBase = applyTerminalPrefixContraction(
      lowered,
      baseResult.terminalPrefixContraction,
      formal
    );
    return attachCommittedChainTrace(composeBaseWithTerminalChain(
      terminalBase,
      null,
      past || loweredForcesPast,
      formal,
      polite,
      lookups
    ), baseResult);
  }
  const terminalBase = applyTerminalPrefixContraction(
    baseResult.base,
    baseResult.terminalPrefixContraction,
    formal
  );
  return attachCommittedChainTrace(composeBaseWithTerminalChainDepth(
    terminalBase,
    chainDepth,
    past,
    formal,
    polite,
    lookups,
    baseResult.finalNegationOptions
  ), baseResult);
}

export function composeCommittedTailConnective(
  inputBaseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables
): RenderOutcome {
  const baseResult = baseResultWithNegationFocus(inputBaseResult, finalNeg);
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (finalNeg === null && baseResult.connectiveBaseOverride !== undefined) {
    const override = baseResult.connectiveBaseOverride;
    if (override.adversativeSurface !== undefined && connective.connective !== "adversative") {
      const connectiveBase = applyConnectivePrefixContraction(
        baseResult.base,
        baseResult.connectivePrefixContraction,
        formal
      );
      return attachCommittedChainTraceFromPieces(composeBaseWithConnective(
        connectiveBase,
        connective,
        past,
        isPolite,
        null,
        formal,
        lookups,
        baseResult.finalNegationOptions
      ), baseResult);
    }
    const overrideConnective =
      override.adversativeSurface !== undefined && connective.connective === "adversative"
        ? { ...connective, surface: override.adversativeSurface }
        : connective;
    const connectiveBase = applyConnectivePrefixContraction(
      override.base,
      baseResult.connectivePrefixContraction,
      formal
    );
    return attachCommittedChainTraceFromPieces(composeBaseWithConnective(
      connectiveBase,
      overrideConnective,
      past || override.past,
      isPolite,
      null,
      formal,
      lookups,
      baseResult.finalNegationOptions
    ), baseResult);
  }
  const projectionForcesQuotativePast =
    finalNeg === null &&
    connective.connective === "quotative" &&
    baseResult.interOpProjectionPolicy === "stative_perfect";
  if (finalNeg !== null && baseResult.chainOnFinalSupported === false) {
    const lowered = lowerFinalNegationForCommittedBase(baseResult, finalNeg, formal, lookups);
    if (lowered === null) {
      return { ok: false, reason: "chain on committed connective final 영역 외 (자연도 / idiom 변환 영역)" };
    }
    const loweredForcesPast = finalNegationLoweringForcesPast(baseResult, finalNeg.chainDepth);
    const connectiveBase = applyConnectivePrefixContraction(
      lowered,
      baseResult.connectivePrefixContraction,
      formal
    );
    return attachCommittedChainTraceFromPieces(composeBaseWithConnective(
      connectiveBase,
      connective,
      past || finalNeg.chainPast || loweredForcesPast,
      isPolite,
      null,
      formal,
      lookups
    ), baseResult);
  }
  const connectiveBase = applyConnectivePrefixContraction(
    baseResult.base,
    baseResult.connectivePrefixContraction,
    formal
  );
  const rendered = attachCommittedChainTraceFromPieces(composeBaseWithConnective(
    connectiveBase,
    connective,
    past || projectionForcesQuotativePast,
    isPolite,
    finalNeg,
    formal,
    lookups,
    baseResult.finalNegationOptions
  ), baseResult);
  return withAppearanceAdverbialProjectionTrace(
    rendered,
    baseResult,
    connectiveBase,
    connective,
    past || projectionForcesQuotativePast,
    finalNeg
  );
}

function withAppearanceAdverbialProjectionTrace(
  rendered: RenderOutcome,
  baseResult: BaseResult,
  connectiveBase: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null
): RenderOutcome {
  if (
    !rendered.ok ||
    rendered.traced !== undefined ||
    !baseResult.ok ||
    connective.connective !== "predicate_projection_manner_simile_action" ||
    !appearanceAdverbialLexicalizationApplies(connectiveBase, past, preNeg)
  ) {
    return rendered;
  }
  const trace = baseResult.chainSourceTrace;
  if (trace === undefined) {
    return rendered;
  }
  const rebound = rebindChainTraceForProjection(trace, rendered.text);
  return rebound === null ? rendered : { ...rendered, traced: rebound };
}

export function composeCommittedTailConnectiveWithNativeTrace(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  connectivePolite: boolean,
  finalNeg: NegationOp | null,
  formal: boolean,
  terminalPolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  const rendered = composeCommittedTailConnective(
    baseResult,
    connective,
    past,
    connectivePolite,
    finalNeg,
    formal,
    lookups
  );
  const trace = baseResult.ok && rendered.ok && rendered.traced === undefined
    ? baseResult.chainSourceTrace
    : undefined;
  if (!rendered.ok || trace === undefined) {
    return rendered;
  }
  const terminal = composeCommittedTailTerminal(
    baseResult,
    finalNeg,
    past,
    formal,
    terminalPolite,
    lookups
  );
  if (terminal.ok) {
    const closed = closeChainTraceWithFinalConnectiveAgainstTerminal(
      trace,
      rendered.text,
      terminal.text,
      connective
    );
    if (closed !== null) {
      return { ...rendered, traced: closed };
    }
  }
  const pieces = closeChainTraceWithConnectivePieces(trace, rendered.text, connective);
  if (pieces !== null) {
    return { ...rendered, traced: pieces };
  }
  if (
    finalNeg === null &&
    connective.connective !== "te_form" &&
    connective.connective !== "simultaneous" &&
    connective.connective !== "predicate_projection_tame_gerund" &&
    connective.connective !== "adversative"
  ) {
    const closed = closeChainTraceAgainstText(
      {
        ...trace,
        finalSourceTokens: [...trace.finalSourceTokens, ...connective.source.tokens]
      },
      rendered.text
    );
    if (closed !== null) {
      return { ...rendered, traced: closed };
    }
  }
  return rendered;
}

export function composeCommittedVolitionalRetrospectiveQuotative(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "retrospective_quotative") {
    return { ok: false, reason: "volitional retrospective lowering requires retrospective quotative" };
  }
  if (connective.retrospectiveQuotativeFlavor !== "direct_thought") {
    return { ok: false, reason: "volitional retrospective lowering requires direct-thought flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional retrospective lowering requires an unwrapped stem" };
  }
  const purpose = renderPredicateBaseVolitionalPurposeConnective(baseResult.base);
  return purpose.ok
    ? { ...purpose, text: `${purpose.text} 생각했더니` }
    : purpose;
}

export function composeCommittedVolitionalDeliberativeRetrospectiveQuotative(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "retrospective_quotative") {
    return { ok: false, reason: "volitional deliberative lowering requires retrospective quotative" };
  }
  if (connective.retrospectiveQuotativeFlavor !== "volitional_deliberative") {
    return { ok: false, reason: "volitional deliberative lowering requires deliberative flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional deliberative lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalDeliberativeRetrospective(baseResult.base);
}

export function composeCommittedVolitionalWishComplement(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "wish_complement") {
    return { ok: false, reason: "volitional wish lowering requires wish complement" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional wish lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalPurposeConnective(baseResult.base);
}

export function composeCommittedVolitionalIntentQuoteAttributive(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "predicate_projection_quote_attributive") {
    return { ok: false, reason: "volitional quote-attributive lowering requires quote-attributive projection" };
  }
  if (connective.quoteAttributiveFlavor !== "intentional_modifier") {
    return { ok: false, reason: "volitional intent lowering requires intentional quote-attributive flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional quote-attributive lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalIntentAttributive(baseResult.base);
}

export function composeCommittedVolitionalCohortativeQuoteAttributive(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "predicate_projection_quote_attributive") {
    return { ok: false, reason: "volitional cohortative lowering requires quote-attributive projection" };
  }
  if (connective.quoteAttributiveFlavor !== "cohortative_quote") {
    return { ok: false, reason: "volitional cohortative lowering requires cohortative quote-attributive flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional cohortative lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalCohortativeAttributive(baseResult.base);
}

export function composeCommittedVolitionalRequestComplement(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "request_complement") {
    return { ok: false, reason: "volitional request lowering requires request complement" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional request lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalQuotative(baseResult.base);
}

export function composeCommittedVolitionalReformulationQuestion(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (
    connective.connective !== "reformulation" ||
    connective.allomorph !== "reformulation_ka"
  ) {
    return {
      ok: false,
      reason: "volitional reformulation question requires reformulation-ka"
    };
  }
  if (past || isPolite || finalNeg !== null) {
    return {
      ok: false,
      reason: "volitional reformulation question requires an unwrapped stem"
    };
  }
  const quoted = renderPredicateBaseVolitionalQuotative(baseResult.base);
  return quoted.ok
    ? { ...quoted, text: `${quoted.text} 할까` }
    : quoted;
}


export function isConjectureQuestionContinuationConnective(connective: ConnectiveOp): boolean {
  return isQuestionContentConnective(connective) || connective.connective === "alternative";
}

export function composeCommittedBaseWithConjectureQuestionConnective(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  const connectiveBase = applyConnectivePrefixContraction(
    baseResult.base,
    baseResult.connectivePrefixContraction,
    formal
  );
  return composeBaseWithConjectureQuestionConnective(
    connectiveBase,
    connective,
    past,
    formal,
    isPolite
  );
}

export function composeCommittedTailTerminalTeForm(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  finalNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  utteranceClosing = false,
  iisashiClosing = false
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (finalNeg !== null && baseResult.chainOnFinalSupported === false) {
    const lowered = lowerFinalNegationForCommittedBase(baseResult, finalNeg, formal, lookups);
    if (lowered === null) {
      return { ok: false, reason: "terminal te_form on committed final chain not supported" };
    }
    const terminalBase = applyTerminalPrefixContraction(
      lowered,
      baseResult.terminalPrefixContraction,
      formal
    );
    const completionTerminalTe =
      baseResult.base.policy?.kind === "te_iru_negative" &&
      baseResult.base.policy.mode === "completion";
    const loweredConnective =
      completionTerminalTe && connective.teFormRole === undefined && connective.surface === "て"
      ? { ...connective, teFormRole: "reason" as const }
      : connective;
    return attachCommittedChainTrace(composeBaseWithTerminalTeForm(
      terminalBase,
      loweredConnective,
      past || finalNeg.chainPast,
      null,
      formal,
      lookups,
      baseResult.finalNegationOptions,
      utteranceClosing,
      iisashiClosing
    ), baseResult);
  }
  const terminalBase = applyTerminalPrefixContraction(
    baseResult.base,
    baseResult.terminalPrefixContraction,
    formal
  );
  return attachCommittedChainTrace(composeBaseWithTerminalTeForm(
    terminalBase,
    connective,
    past,
    finalNeg,
    formal,
    lookups,
    baseResult.finalNegationOptions,
    utteranceClosing,
    iisashiClosing
  ), baseResult);
}

function composeBaseWithTerminalTeForm(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  finalNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions = {},
  utteranceClosing = false,
  iisashiClosing = false
): RenderOutcome {
  if (
    connective.connective !== "te_form" ||
    (connective.surface !== "て" && connective.surface !== "で" &&
      !(connective.surface === RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE && utteranceClosing))
  ) {
    return { ok: false, reason: "terminal te_form connective invariant violation" };
  }
  const rawRole = connective.teFormRole ?? defaultTeFormRoleForBase(base, finalNeg, connective);
  const role: TeFormConnectiveRole = rawRole === "linkage" && !iisashiClosing ? "listing" : rawRole;
  if (role === "listing" && connective.teFormRole !== "listing") {
    connective = { ...connective, teFormRole: "listing" };
  }
  if (role === "reason" || role === "result_chain") {
    return composeBaseWithConnective(
      base,
      teFormRoleToConnective(connective, role),
      past,
      false,
      finalNeg,
      formal,
      lookups,
      options
    );
  }
  if (role === "adverbial") {
    return composeBaseWithAdverbialTeForm(base, past, finalNeg, formal, lookups, options);
  }
  if (role === "manner") {
    return { ok: false, reason: "terminal te_form manner requires StructuralRelation simultaneous projection" };
  }
  if (role === "linkage" && finalNeg === null) {
    return composeBaseWithConnective(base, teFormRoleToConnective(connective, role), false, false, null, formal, lookups, options);
  }
  if (past) {
    if (role !== "listing" && role !== "linkage") {
      return { ok: false, reason: "past + terminal te_form fragment not supported" };
    }
    return composeBaseWithConnective(
      base,
      { ...connective, connective: "listing", surface: "し" },
      past,
      false,
      finalNeg,
      formal,
      lookups,
      options
    );
  }
  if (finalNeg !== null) {
    if (connective.surface === RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE) {
      const lowered = lowerBaseForPredicateProjection(base, finalNeg, formal, options);
      return lowered === null
        ? { ok: false, reason: "renyou_chuushi detached negative base cannot lower to predicate projection" }
        : { ok: true, text: `${lowered.prefix}${predicateBaseInfinitiveForm(lowered)}`, polite: false };
    }
    if (connective.surface === "で" && finalNeg.chainDepth === 1 && !finalNeg.chainPast) {
      if (
        base.final.kind !== "lemma" ||
        (!base.final.isVerb && base.capabilities?.prohibitionHost !== "action")
      ) {
        return { ok: false, reason: "terminal negative de-form prohibition on non-verbal base not supported" };
      }
      return composeBaseWithBareProhibition(base);
    }
    if (connective.surface === "て" && finalNeg.chainDepth === 1 && !finalNeg.chainPast) {
      const isCopulaNegationBridge = finalNeg.sourceSplit?.kind === "predicate_copula_negative";
      return composeBaseWithConnective(
        base,
        isCopulaNegationBridge
          ? { ...connective, connective: "listing", surface: "し" }
          : { ...connective, connective: "reason", surface: "ので" },
        past,
        false,
        finalNeg,
        formal,
        lookups,
        options
      );
    }
    return { ok: false, reason: "terminal negative te_form fragment requires deferred boundary evidence" };
  }
  if (base.final.kind !== "lemma" || !base.final.isVerb) {
    const lowered = utteranceClosing ? lowerBaseForPredicateProjection(base, null, formal, options) : null;
    if (lowered !== null) {
      return { ok: true, text: `${lowered.prefix}${predicateBaseInfinitiveForm(lowered)}`, polite: false };
    }
    return composeBaseWithConnective(
      base,
      connective,
      past,
      false,
      null,
      formal,
      lookups,
      options
    );
  }
  const request = conjugate(base.final.lemma, base.final.irregular, "아/어");
  return { ok: true, text: concatPredicatePrefix(base.prefix, request), polite: false };
}

export function conjectureBase(opts: {
  readonly conjecture: ConjectureOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly shortNegationPolicy: ShortNegationPolicy | undefined;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const { conjecture, stemLemma, stemIrregular, isVerb, preModalNeg, past, shortNegationPolicy, pastProjection } = opts;
  const conjecturePolite = conjecture.polite;
  const ok = (base: KoreanPredicateBase): OkBaseResult => ({
    ok: true,
    base,
    ...(() => {
      const sourceTrace = conjectureBaseSourceTrace(base, conjecture);
      return sourceTrace === undefined ? {} : { sourceTrace };
    })()
  });
  if (preModalNeg !== null) {
    if (preModalNeg.chainDepth >= 2) {
      return { ok: false, reason: "chain depth ≥ 2 + conjecture 영역 외" };
    }
    const negationFocus = preModalNeg.focusParticle ?? "";
    const negationAux = preModalNeg.inability === true ? "못하" : "않";
    if (past || preModalNeg.chainPast) {
      if (isVerb && preModalNeg.preferShortNegation) {
        if (stemLemma.endsWith("하다") && stemLemma.length > 2 && shortNegationPolicy !== "lexical_prefix") {
          const sahenPrefix = stemLemma.slice(0, -2);
          return ok({
            prefix: `${sahenPrefix} 안 했을 `,
            final: { kind: "boundNounCopula", nounSurface: "거" }
          });
        }
        return ok({
          prefix: `안 ${conjugate(stemLemma, stemIrregular, "았/었")}을 `,
          final: { kind: "boundNounCopula", nounSurface: "거" }
        });
      }
      return ok({
        prefix: `${conjugate(stemLemma, stemIrregular, "지")}${negationFocus} ${negationAux === "않" ? "않았을" : "못했을"} `,
        final: { kind: "boundNounCopula", nounSurface: "거" }
      });
    }
    const lexicalPotential = lexicalPotentialStemBase(stemLemma, stemIrregular, isVerb);
    if (lexicalPotential !== null) {
      const lowered = lowerPotentialFinalNegationBase(lexicalPotential, preModalNeg.chainDepth);
      if (lowered === null) {
        return { ok: false, reason: "lexical potential neg + conjecture invariant violation" };
      }
      const stemGet = conjugate(lowered.final.lemma, lowered.final.irregular, "겠");
      return ok({
        prefix: lowered.prefix,
        final: {
          kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: lowered.final.isVerb,
          idiom: {
            kind: "conjecture",
            conjecturePolite,
            sourceLemma: lowered.final.lemma,
            sourceIrregular: lowered.final.irregular
          }
        }
      });
    }
    if (isVerb && preModalNeg.preferShortNegation) {
      const stemGet = conjugate(stemLemma, stemIrregular, "겠");
      if (stemLemma.endsWith("하다") && stemLemma.length > 2 && shortNegationPolicy !== "lexical_prefix") {
        const sahenPrefix = stemLemma.slice(0, -2);
        return ok({
          prefix: `${sahenPrefix} 안 `,
          final: {
            kind: "lemma", lemma: "하겠다", irregular: null, isVerb: true,
            idiom: {
              kind: "conjecture",
              conjecturePolite,
              sourceLemma: "하다",
              sourceIrregular: "여",
              sourceNegation: "short"
            }
          }
        });
      }
      return ok({
        prefix: "안 ",
        final: {
          kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: true,
          idiom: {
            kind: "conjecture",
            conjecturePolite,
            sourceLemma: stemLemma,
            sourceIrregular: stemIrregular,
            sourceNegation: "short"
          }
        }
      });
    }
    const stemJi = conjugate(stemLemma, stemIrregular, "지");
    return ok({
      prefix: `${stemJi}${negationFocus} `,
      final: {
        kind: "lemma", lemma: `${negationAux}겠다`, irregular: null, isVerb: true,
        idiom: {
          kind: "conjecture",
          conjecturePolite,
          sourceLemma: stemLemma,
          sourceIrregular: stemIrregular,
          sourceNegation: "long",
          ...(preModalNeg.inability === true ? { sourceNegationInability: true } : {})
        }
      }
    });
  }
  if (past) {
    if (pastProjection === "committed") {
      const committedPast = stemLemma === "아니다"
        ? "아니었"
        : conjugate(stemLemma, stemIrregular, "았/었");
      return ok({
        prefix: "",
        final: {
          kind: "lemma", lemma: `${committedPast}겠다`, irregular: null, isVerb,
          idiom: { kind: "conjecture", conjecturePolite }
        }
      });
    }
    if (!isVerb) {
      const committedPast = conjugate(stemLemma, stemIrregular, "았/었");
      return ok({
        prefix: "",
        final: {
          kind: "lemma", lemma: `${committedPast}겠다`, irregular: null, isVerb: false,
          idiom: { kind: "conjecture", conjecturePolite }
        }
      });
    }
    const stemAttr = `${conjugate(stemLemma, stemIrregular, "았/었")}을`;
    return ok({
      prefix: `${stemAttr} `,
      final: { kind: "boundNounCopula", nounSurface: "거" }
    });
  }
  return ok(plainConjectureBase({ stemLemma, stemIrregular, isVerb, conjecturePolite }));
}

export function plainConjectureBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly conjecturePolite: boolean;
}): KoreanPredicateBase {
  const stemGet = conjugate(opts.stemLemma, opts.stemIrregular, "겠");
  return {
    prefix: "",
    final: {
      kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: opts.isVerb,
      idiom: {
        kind: "conjecture",
        conjecturePolite: opts.conjecturePolite,
        sourceLemma: opts.stemLemma,
        sourceIrregular: opts.stemIrregular
      }
    }
  };
}

export function projectBaseFutureAttributive(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  pastProjection: AttributivePastProjection = "lexical"
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseFutureAttributive(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      pastProjection
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = `${base.prefix}${base.final.nounSurface}`;
    if (past) {
      return `${noun}${hasBatchim(`${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`) ? "이었을" : "였을"}`;
    }
    return `${noun}일`;
  }
  const final = base.final;
  if (past) {
    if (
      base.policy?.kind === "noun_copula_interop" &&
      final.lemma === "이다" &&
      final.irregular === null
    ) {
      return `${base.prefix}${selectParticle(predicateBasePolicyAllomorphHost(base), "이었/였")}을`;
    }
    if (pastProjection === "committed") {
      const pastStem = final.lemma === "아니다"
        ? "아니었"
        : conjugate(final.lemma, final.irregular, "았/었");
      return `${base.prefix}${pastStem}을`;
    }
    const pastStem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${pastStem}을`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "ㄹ/을")}`;
}

export function quotedPropositionAttributiveIsReused(
  base: KoreanPredicateBase,
  past: boolean,
  policy: AttributiveProjectionPolicy
): boolean {
  const quoted = base.policy?.kind === "quoted_proposition" ? base.policy : null;
  if (past || quoted === null) {
    return false;
  }
  if (policy === "head_required_future" && quoted.attributiveQuote !== undefined && base.final.kind === "lemma") {
    return false;
  }
  return !isFutureAttributiveProjection(policy) ||
    quoted.attributiveQuote?.realizesInterrogativeMood === true;
}

export function likenessAttributiveLexicalizedPolicy(
  requestedPolicy: AttributiveProjectionPolicy
): AttributiveProjectionPolicy {
  return requestedPolicy === "future" ? "present" : requestedPolicy;
}

export function likenessAttributiveLexicalizationApplies(
  base: KoreanPredicateBase,
  past: boolean
): boolean {
  return !past &&
    base.policy?.kind === "likeness" &&
    base.policy.attributiveLexicalization !== undefined;
}

export function projectBaseAttributive(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  pastProjection: AttributivePastProjection = "lexical",
  negativeProjection: NegativeAttributiveProjection = "default",
  requestedPolicy: AttributiveProjectionPolicy = "present"
): string | null {
  const headRequiredFuture = requestedPolicy === "head_required_future";
  const attrPolicy: AttributiveProjectionPolicy = headRequiredFuture ? "future" : requestedPolicy;
  const likenessAttributive = base.policy?.kind === "likeness"
    ? base.policy.attributiveLexicalization
    : undefined;
  if (!past && likenessAttributive !== undefined) {
    return projectBaseAttributive(
      likenessAttributive,
      false,
      formal,
      pastProjection,
      negativeProjection,
      likenessAttributiveLexicalizedPolicy(requestedPolicy)
    );
  }
  const quotedProposition = base.policy?.kind === "quoted_proposition" ? base.policy : null;
  if (!past && quotedProposition !== null) {
    if (quotedPropositionAttributiveIsReused(base, past, requestedPolicy)) {
      return quotedProposition.attributive;
    }
    if (headRequiredFuture && quotedProposition.attributiveQuote !== undefined && base.final.kind === "lemma") {
      return `${quotedProposition.attributiveQuote.prefix}${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을")}`;
    }
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseAttributive(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal,
      pastProjection,
      negativeProjection,
      requestedPolicy
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = base.final.nounSurface;
    if (past) {
      const stem = nounPastCopulaStem(noun, nounCopulaFinalAllomorphHost(base.final));
      return `${base.prefix}${stem}${attrPolicy === "future" ? "을" : "던"}`;
    }
    if (attrPolicy === "future") {
      return `${base.prefix}${noun}${hasBatchim(noun) ? "일" : "일"}`;
    }
    return `${base.prefix}${noun}인`;
  }
  if (past && base.policy?.kind === "completion_potential") {
    return projectBaseAttributive(
      completionPotentialCompletedBase(base.policy),
      true,
      formal,
      pastProjection,
      negativeProjection,
      requestedPolicy
    );
  }
  if (
    past &&
    base.policy?.kind === "te_iru_negative" &&
    base.policy.mode === "completion" &&
    base.policy.completionAttributiveProjection === "long"
  ) {
    return `${base.policy.stemPrefix ?? ""}${conjugate(base.policy.stemLemma, base.policy.stemIrregular, "지")}${base.policy.negativeFocusParticle ?? ""} 않은`;
  }
  if (
    past && attrPolicy !== "future" && base.policy?.kind === "te_iru_attributive_contraction" &&
    base.final.kind === "lemma" && base.final.lemma === "있다" && !base.final.isVerb
  ) {
    return conjugate(base.policy.stemLemma, base.policy.stemIrregular, "던");
  }
  if (
    past && attrPolicy !== "future" &&
    base.final.kind === "lemma" && base.final.lemma === "있다" && !base.final.isVerb &&
    base.policy?.kind === "voice" && base.policy.voice === "passive" &&
    base.prefix.endsWith("고 ")
  ) {
    const passivePrefix = base.prefix.slice(0, -"고 ".length);
    if (passivePrefix.length > 0) {
      return `${passivePrefix}던`;
    }
  }
  const final = base.final;
  if (past) {
    if (
      base.policy?.kind === "noun_copula_interop" &&
      final.lemma === "이다" &&
      final.irregular === null
    ) {
      const stem = selectParticle(predicateBasePolicyAllomorphHost(base), "이었/였");
      return `${base.prefix}${stem}${attrPolicy === "future" ? "을" : "던"}`;
    }
    if (attrPolicy === "future") {
      const pastStem = final.lemma === "아니다"
        ? "아니었"
        : conjugate(final.lemma, final.irregular, "았/었");
      return `${base.prefix}${pastStem}을`;
    }
    if (final.isVerb) {
      const pastAttributive = conjugate(final.lemma, final.irregular, "ㄴ/은");
      const pastNeutralized = pastAttributive === conjugate(final.lemma, final.irregular, "ㄴ/는");
      if (pastProjection === "committed" || pastNeutralized) {
        const pastStem = conjugate(final.lemma, final.irregular, "았/었");
        return `${base.prefix}${pastStem}던`;
      }
      return `${base.prefix}${pastAttributive}`;
    }
    const pastStem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${pastStem}던`;
  }
  const forceCompletedNegative =
    (negativeProjection === "scope_bridge" &&
      isBenefactiveNegativeCarrierPolicy(base.policy, final.lemma)) ||
    (negativeProjection === "completed_negative" && final.lemma === "않다");
  if (attrPolicy === "future") {
    return `${base.prefix}${conjugate(final.lemma, final.irregular, "ㄹ/을")}`;
  }
  const ending = final.isVerb && !forceCompletedNegative && attrPolicy !== "result_state" ? "ㄴ/는" : "ㄴ/은";
  return `${base.prefix}${conjugate(final.lemma, final.irregular, ending)}`;
}

export function composeCommittedBaseAttributive(
  baseResult: BaseResult,
  past: boolean,
  formal: boolean,
  pastProjection: AttributivePastProjection = "lexical",
  negativeProjection: NegativeAttributiveProjection = "default",
  attrPolicy: AttributiveProjectionPolicy = "present"
): RenderOutcome {
  if (!baseResult.ok) {
    return baseResult;
  }
  const text = projectBaseAttributive(
    baseResult.base,
    past,
    formal,
    pastProjection,
    negativeProjection,
    attrPolicy
  );
  if (text === null) {
    return { ok: false, reason: "committed base attributive projection failed" };
  }
  const trace = baseResult.chainSourceTrace;
  if (trace === undefined) {
    return { ok: true, text, polite: false };
  }
  const traced = quotedPropositionAttributiveIsReused(baseResult.base, past, attrPolicy) ||
    likenessAttributiveLexicalizationApplies(baseResult.base, past)
    ? rebindChainTraceForProjection(trace, text)
    : closeChainTraceAgainstText(trace, text);
  return {
    ok: true,
    text,
    polite: false,
    ...(traced === null ? {} : { traced })
  };
}

export function composeBaseWithTerminal(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  isPolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (past && base.policy?.kind === "completion_potential") {
    return composeBaseWithTerminal(
      completionPotentialCompletedBase(base.policy),
      true,
      formal,
      isPolite,
      lookups
    );
  }
  const prefix = base.prefix;
  if (base.final.kind === "negativeNounCopula") {
    return composeNegativeNounCopulaTerminal(prefix, base.final, past, formal, isPolite, lookups);
  }
  if (base.final.kind === "nounCopula") {
    const text = nounToCopulaForm(base.final.nounSurface, formal, isPolite, past, base.final.isBoundNoun, base.final.allomorphHost);
    return { ok: true, text: `${prefix}${text}`, polite: isPolite };
  }
  if (base.final.kind === "boundNounCopula") {
    if (
      base.policy?.kind === "scope_carrier" &&
      base.policy.carrier === "noda" &&
      base.policy.style === "assertive_jya" &&
      !past
    ) {
      const text = nounCopulaConnective(base.final.nounSurface, "지");
      return { ok: true, text: `${prefix}${text}${isPolite ? "요" : ""}`, polite: isPolite };
    }
    const text = nounToCopulaForm(base.final.nounSurface, formal, isPolite, past, true);
    return { ok: true, text: `${prefix}${text}`, polite: isPolite };
  }
  if (base.final.lemma === "아니다") {
    const text = composeAniForm(formal, isPolite, past);
    return { ok: true, text: `${prefix}${text}`, polite: isPolite };
  }
  if (base.final.idiom?.kind === "conjecture" && !past) {
    if (base.final.kind === "lemma" && base.final.idiom.projection === "nominalized") {
      return composeNominalizedConjectureTerminal(base, formal, isPolite);
    }
    const stem = base.final.lemma.replace(/다$/, "");
    const polite = isPolite || base.final.idiom.conjecturePolite;
    const ending = conjectureFinalForm(formal, polite);
    return { ok: true, text: `${prefix}${stem}${ending}`, polite };
  }
  const text = composeFinalForm(
    base.final.lemma, base.final.irregular, base.final.isVerb, past, formal, isPolite, lookups
  );
  return { ok: true, text: `${prefix}${text}`, polite: isPolite };
}

export function composeBaseWithPlainImperative(
  base: KoreanPredicateBase,
  formal = false
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "imperative terminal on non-lemma base not supported" };
  }
  const body = conjugate(base.final.lemma, base.final.irregular, formal ? "아/어라" : "아/어");
  return {
    ok: true,
    text: concatPredicatePrefix(base.prefix, body),
    polite: false
  };
}

export function composeBaseWithImperativeQuotative(base: KoreanPredicateBase, complementizer = "고"): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "imperative quotative requires lemma final" };
  }
  return {
    ok: true,
    text: concatPredicatePrefix(
      base.prefix,
      conjugate(base.final.lemma, base.final.irregular, `(으)라${complementizer}`)
    ),
    polite: false
  };
}

export function composeContractedPastAspectTerminal(
  baseResult: BaseResult,
  explicitPast: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  const terminalBase = applyTerminalPrefixContraction(
    baseResult.base,
    baseResult.terminalPrefixContraction,
    formal
  );
  if (terminalBase.final.kind !== "lemma") {
    return { ok: false, reason: "te_iru contracted-past terminal on non-lemma base not supported" };
  }
  if (!explicitPast) {
    return attachCommittedChainTrace(
      composeBaseWithTerminal(terminalBase, true, formal, polite, lookups),
      baseResult
    );
  }
  const text = composeDoublePastFinalForm(
    terminalBase.final.lemma,
    terminalBase.final.irregular,
    formal,
    polite
  );
  return attachCommittedChainTrace({ ok: true, text: `${terminalBase.prefix}${text}`, polite }, baseResult);
}

function nominalizedConjectureStem(lemma: string): string | null {
  return lemma.endsWith("이겠다")
    ? lemma.slice(0, -"이겠다".length)
    : null;
}

function composeNominalizedConjectureTerminal(
  base: KoreanPredicateBase,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "nominalized conjecture terminal invariant violation" };
  }
  const nominal = nominalizedConjectureStem(base.final.lemma);
  if (nominal === null) {
    return { ok: false, reason: "nominalized conjecture base invariant violation" };
  }
  const polite = isPolite || base.final.idiom?.conjecturePolite === true;
  if (
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    base.policy.style === "emphasis"
  ) {
    return {
      ok: true,
      text: `${base.prefix}${nominal}이겠${polite ? "죠" : "지"}`,
      polite
    };
  }
  const casualNominal = !formal && nominal.endsWith("것")
    ? `${nominal.slice(0, -"것".length)}거`
    : nominal;
  const stem = casualNominal.endsWith("거")
    ? `${casualNominal}겠`
    : `${casualNominal}이겠`;
  return {
    ok: true,
    text: `${base.prefix}${stem}${polite ? "죠" : "지"}`,
    polite
  };
}

function lemmaCopulaConjectureBase(
  prefix: string,
  final: Extract<KoreanFinalForm, { readonly kind: "lemma" }>,
  conjecturePolite: boolean
): KoreanPredicateBase {
  return {
    ...plainConjectureBase({
      stemLemma: final.lemma,
      stemIrregular: final.irregular,
      isVerb: final.isVerb,
      conjecturePolite
    }),
    prefix
  };
}

export function composeNounCopulaBaseWithConjecture(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  past: boolean,
  formal: boolean,
  isPolite: boolean,
  conjecturePolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  const polite = isPolite || conjecturePolite;
  if (base.final.kind === "lemma") {
    return composeBaseWithTerminal(lemmaCopulaConjectureBase(base.prefix, base.final, conjecturePolite), past, formal, polite, lookups);
  }
  if (base.final.kind === "nounCopula") {
    return composeNounCopulaConjecture(base.prefix, base.final, past, formal, polite);
  }
  return composeNegativeNounCopulaConjecture(base.prefix, base.final, past, formal, polite);
}

export function composeNounCopulaConjectureQuestion(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  past: boolean,
  formal: boolean,
  polite: boolean
): string {
  if (base.final.kind === "lemma") {
    const lemmaQuestion = past
      ? `${conjugate(base.final.lemma, base.final.irregular, "았/었")}을까`
      : conjugate(base.final.lemma, base.final.irregular, "ㄹ/을까");
    return `${base.prefix}${lemmaQuestion}${polite ? "요" : ""}`;
  }
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const attr = past
      ? `${noun}${noBatchim ? "였" : "이었"}을`
      : `${noun}일`;
    return `${base.prefix}${attr}까${polite ? "요" : ""}`;
  }

  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const attr = chainBase.final.kind === "lemma" && chainBase.final.lemma === "않다"
    ? (past ? "않았을" : "않을")
    : (past ? "아니었을" : "아닐");
  return `${base.prefix}${chainBase.prefix}${attr}까${polite ? "요" : ""}`;
}

export function composeNounCopulaBaseWithConjectureConnective(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  isPolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (isConjectureQuestionContinuationConnective(connective)) {
    return composeBaseWithConjectureQuestionConnective(
      base,
      connective,
      past,
      formal,
      isPolite
    );
  }
  if (base.final.kind === "lemma") {
    if (connective.connective === "quotative") {
      const attributive = projectBaseFutureAttributive(base, past, formal);
      if (attributive !== null) {
        return { ok: true, text: `${attributive} 거라고`, polite: false };
      }
    }
    return composeBaseWithConnective(
      lemmaCopulaConjectureBase(base.prefix, base.final, false),
      connective,
      past,
      isPolite,
      null,
      formal,
      lookups
    );
  }
  const nounCopulaBase: NounCopulaPredicateBase = { ...base, final: base.final };
  if (connective.connective === "quotative") {
    return composeNounCopulaConjectureQuotative(nounCopulaBase, past, formal, isPolite);
  }
  const lowered = nounCopulaConjectureConnectiveBase(nounCopulaBase, past, formal);
  return composeBaseWithConnective(lowered, connective, false, isPolite, null, formal, lookups);
}

function composeNounCopulaConjectureQuotative(
  base: NounCopulaPredicateBase,
  past: boolean,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  void isPolite;
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const attr = past
      ? (noBatchim ? `${noun}였을` : `${noun}이었을`)
      : `${noun}일`;
    return { ok: true, text: `${base.prefix}${attr} 거라고`, polite: false };
  }
  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const chainFinalLemma = chainBase.final.kind === "lemma" ? chainBase.final.lemma : "아니다";
  const attr = chainFinalLemma === "않다"
    ? (past ? "않았을" : "않을")
    : (past ? "아니었을" : "아닐");
  return { ok: true, text: `${base.prefix}${chainBase.prefix}${attr} 거라고`, polite: false };
}

function nounCopulaConjectureConnectiveBase(
  base: NounCopulaPredicateBase,
  past: boolean,
  formal: boolean
): KoreanPredicateBase {
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const stem = past
      ? (noBatchim ? `${noun}였겠` : `${noun}이었겠`)
      : (noBatchim ? `${noun}겠` : `${noun}이겠`);
    return {
      prefix: base.prefix,
      final: { kind: "lemma", lemma: `${stem}다`, irregular: null, isVerb: false }
    };
  }

  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const chainFinalLemma =
    chainBase.final.kind === "lemma" ? chainBase.final.lemma : "아니다";
  const stem = chainFinalLemma === "않다"
    ? (past ? "않았겠" : "않겠")
    : (past ? "아니었겠" : "아니겠");
  return {
    prefix: `${base.prefix}${chainBase.prefix}`,
    final: { kind: "lemma", lemma: `${stem}다`, irregular: null, isVerb: false }
  };
}

function composeNounCopulaConjecture(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "nounCopula" }>,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  const noun = final.nounSurface;
  const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(final)) === false;
  const stem = past
    ? `${noun}${noBatchim ? "였겠" : "이었겠"}`
    : `${noun}${noBatchim ? "겠" : "이겠"}`;
  const ending = polite ? "죠" : "지";
  return { ok: true, text: `${prefix}${stem}${ending}`, polite };
}

function composeNegativeNounCopulaConjecture(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "negativeNounCopula" }>,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  const base = negativeNounCopulaChainBase(final, formal);
  if (base.final.kind === "lemma" && base.final.lemma === "아니다") {
    const stem = past ? "아니었겠" : "아니겠";
    return { ok: true, text: `${prefix}${base.prefix}${stem}${polite ? "죠" : "지"}`, polite };
  }
  if (base.final.kind === "lemma" && base.final.lemma === "않다") {
    const stem = past ? "않았겠" : "않겠";
    return { ok: true, text: `${prefix}${base.prefix}${stem}${polite ? "죠" : "지"}`, polite };
  }
  return { ok: false, reason: "negative noun copula conjecture base invariant violation" };
}

function composeBaseWithBoundNominalReason(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "bound nominal reason chain lowering not supported" };
  }
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (
    connective.surface.endsWith("ことで") &&
    (connective.boundNominalReasonQuoteCarrierHost === true ||
      boundNominalReasonQuoteCarrierAt(connective.source.tokens, 0))
  ) {
    return composeBaseWithConnective(
      loweredBase,
      { ...connective, connective: "reason", surface: "ので" },
      effectivePast,
      false,
      null,
      formal,
      lookups,
      options
    );
  }
  if (
    connective.surface.endsWith("ことで") ||
    connective.surface.includes("により") ||
    connective.surface.includes("によって")
  ) {
    const nominal = projectBaseMNominalized(loweredBase, effectivePast, formal);
    if (nominal === null) {
      return { ok: false, reason: "bound nominal method nominalization not supported" };
    }
    return {
      ok: true,
      text: `${nominal}${selectParticle(nominal, "으로써/로써")}`,
      polite: false
    };
  }
  if (isMonoBoundReasonConnective(connective)) {
    return composeBaseWithConnective(
      loweredBase,
      { ...connective, connective: "reason", surface: "ので" },
      effectivePast,
      false,
      null,
      formal,
      lookups,
      options
    );
  }
  if (connective.surface.includes("から")) {
    const reason = projectBaseReasonGerund(loweredBase, effectivePast, formal);
    if (reason === null) {
      return { ok: false, reason: "bound nominal reason gerund projection not supported" };
    }
    const suffix = connective.boundNominalReasonClosure === "conditional"
      ? " 때문이라면"
      : " 때문에";
    return { ok: true, text: `${reason}${suffix}`, polite: false };
  }

  const rendered = composeBaseWithTerminalChain(
    loweredBase,
    null,
    effectivePast,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  const point = plainDeclarativeToPointAttributive(rendered.text);
  const suffix =
    connective.surface.includes("あり") && !connective.surface.includes("あって")
      ? "점도 있고"
      : "점도 있어서";
  return { ok: true, text: `${point} ${suffix}`, polite: false };
}

export function isMonoBoundReasonConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "bound_nominal_reason" &&
    connective.boundNominalReasonMonoNoun === true;
}

export function projectBaseMNominalized(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseMNominalized(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = `${base.prefix}${base.final.nounSurface}`;
    if (past) {
      return `${noun}${hasBatchim(`${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`) ? "이었음" : "였음"}`;
    }
    return noun.endsWith("이") ? `${noun}기` : `${noun}임`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}음`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "ㅁ/음")}`;
}

export function projectBaseReasonGerund(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseReasonGerund(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const realizedSurface = uncontractedBoundNounSurface(base.final);
    const noun = `${base.prefix}${realizedSurface}`;
    if (past) {
      const host = `${base.prefix}${nounCopulaRealizedAllomorphHost(base.final, realizedSurface)}`;
      return `${noun}${hasBatchim(host) ? "이었기" : "였기"}`;
    }
    return noun.endsWith("이") ? `${noun}기` : `${noun}이기`;
  }
  const final = base.final;
  if (past) {
    return `${base.prefix}${conjugate(final.lemma, final.irregular, "았/었")}기`;
  }
  const quotedProposition = base.policy?.kind === "quoted_proposition" ? base.policy : null;
  if (quotedProposition?.attributiveQuote !== undefined) {
    return `${quotedProposition.attributiveQuote.prefix}${conjugate(final.lemma, final.irregular, "기")}`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "기")}`;
}

function uncontractedBoundNounSurface(
  final: { readonly kind: "nounCopula" | "boundNounCopula"; readonly nounSurface: string }
): string {
  return final.kind === "boundNounCopula" && final.nounSurface === "거" ? "것" : final.nounSurface;
}

function copulaFusedHostSurface(nounSurface: string, lookups: LookupTables): string | undefined {
  return lookups.COPULA_FUSED_BOUND_NOUNS.get(nounSurface);
}

export function plainDeclarativeToPointAttributive(
  text: string,
  options: { readonly copularLemma?: string } = {}
): string {
  if (options.copularLemma !== undefined && text.endsWith(options.copularLemma)) {
    return `${text.slice(0, -"다".length)}라는`;
  }
  if (text.endsWith("아니다")) {
    return `${text.slice(0, -"아니다".length)}아니라는`;
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return `${stem}${hasBatchim(stem) ? "이라는" : "라는"}`;
  }
  if (text.endsWith("거다")) {
    return `${text.slice(0, -"거다".length)}거라는`;
  }
  if (text.endsWith("다")) {
    return `${text}는`;
  }
  return `${text}라는`;
}

export function plainDeclarativeToPointAttributiveNominal(
  text: string,
  noun: string,
  allomorphHost?: string,
  options: { readonly copularLemma?: string } = {}
): string {
  if (text === `${noun}다`) {
    return `${noun}${hasBatchim(allomorphHost ?? noun) ? "이라는" : "라는"}`;
  }
  return plainDeclarativeToPointAttributive(text, options);
}

export function composeBaseWithPredicateProjectionQuoteAttributive(
  base: KoreanPredicateBase,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "predicate quote attributive projection chain lowering not supported" };
  }
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (
    !effectivePast &&
    (loweredBase.final.kind === "nounCopula" || loweredBase.final.kind === "boundNounCopula")
  ) {
    const nounPhrase = `${loweredBase.prefix}${loweredBase.final.nounSurface}`;
    const quoteAttr = hasBatchim(`${loweredBase.prefix}${nounCopulaFinalAllomorphHost(loweredBase.final)}`) ? "이라는" : "라는";
    return { ok: true, text: `${nounPhrase}${quoteAttr}`, polite: isPolite };
  }
  const rendered = composeBaseWithTerminalChain(
    loweredBase,
    null,
    effectivePast,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  return { ok: true, text: plainDeclarativeToPointAttributive(rendered.text), polite: isPolite };
}

function composeBaseWithQuotativeMannerSimile(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions,
  suffix: "듯이" | "듯한",
  connective: ConnectiveOp
): RenderOutcome {
  const mood = connective.quotativeMood ?? "declarative";
  if (mood === "imperative") {
    return composeBaseWithQuotativeImperativeMannerSimile(base, suffix);
  }
  const closedSfp = connective.closedSfp;
  if (closedSfp !== undefined && mood !== "interrogative") {
    const projection = quoteProjectionForSfpEffect(closedSfp.effect, false);
    if (projection === "prohibitive") {
      if (past || preNeg !== null) {
        return { ok: false, reason: "quotative manner simile: prohibitive closed SFP with negation/past not supported" };
      }
      const prohibition = composeRequestProhibitionAttributiveQuote(base, { requestForm: false });
      return prohibition.ok ? { ok: true, text: `${prohibition.text} ${suffix}`, polite: false } : prohibition;
    }
    if (projection === "terminal_mood") {
      const terminal = composeTerminalMoodOnBase({ ok: true, base }, preNeg, past, true, false, closedSfp, lookups, {
        quotationForm: "attributive"
      });
      if (terminal === null || !terminal.ok) {
        return { ok: false, reason: `quotative manner simile: terminal mood not supported for SFP ${closedSfp.effect ?? "null"}` };
      }
      return { ok: true, text: `${terminal.text} ${suffix}`, polite: false };
    }
  }
  if (mood === "interrogative") {
    const quoted = composeBaseWithConnective(base, createConnectiveOp({
      connective: "question_quotative",
      surface: "かって",
      source: connective.source
    }), past, false, preNeg, formal, lookups, options);
    return quoted.ok ? { ...quoted, text: `${quoted.text} 하는 ${suffix}` } : quoted;
  }
  const quoted = composeBaseWithPredicateProjectionQuoteAttributive(base, past, false, preNeg, formal, lookups, options);
  if (!quoted.ok) {
    return quoted;
  }
  return { ok: true, text: `${quoted.text} ${suffix}`, polite: false };
}

function composeBaseWithQuotativeImperativeMannerSimile(
  base: KoreanPredicateBase,
  suffix: "듯이" | "듯한"
): RenderOutcome {
  const final = base.final;
  if (final.kind !== "lemma" || !final.isVerb) {
    return { ok: false, reason: "imperative quotative manner simile requires bare verb lemma host" };
  }
  return {
    ok: true,
    text: `${base.prefix}${conjugate(final.lemma, final.irregular, "(으)라는")} ${suffix}`,
    polite: false
  };
}

function composeBaseWithBakariNiReason(
  base: KoreanPredicateBase,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const quoted = composeBaseWithPredicateProjectionQuoteAttributive(base, true, false, preNeg, formal, lookups, options);
  if (!quoted.ok) {
    return quoted;
  }
  return { ok: true, text: `${quoted.text} 이유로`, polite: false };
}

function isTariEnumerativeSurface(surface: string): boolean {
  return surface === "たり" || surface === "だり";
}

function isKuseNiSurface(surface: string): boolean {
  return surface === "くせに" || surface === "のくせに";
}

function composeBaseWithKuseNiConnective(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "くせに derogatory connective chain lowering not supported" };
  }
  const suffixText = CONNECTIVE_RENDER_MAP.get(connective.surface)?.suffixText ?? " 주제에";
  const politeSuffix = isPolite ? "요" : "";
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (
    !effectivePast &&
    (loweredBase.final.kind === "nounCopula" || loweredBase.final.kind === "boundNounCopula")
  ) {
    return {
      ok: true,
      text: `${loweredBase.prefix}${loweredBase.final.nounSurface}${suffixText}${politeSuffix}`,
      polite: isPolite
    };
  }

  const attr = projectBaseAttributive(loweredBase, effectivePast, formal);
  if (attr === null) {
    return { ok: false, reason: `くせに host projection not supported for '${connective.surface}'` };
  }
  return { ok: true, text: `${attr}${suffixText}${politeSuffix}`, polite: isPolite };
}

type ProjectionComposeProjection =
  | "attributive"
  | "future_attributive"
  | "m_nominalized"
  | "nominalized"
  | "reason_gerund";

interface ProjectionComposeRule {
  readonly projection: ProjectionComposeProjection;
  readonly alwaysPast?: boolean;
  readonly politeFromCaller?: boolean;
  readonly connectiveOwnedSuffix?: string;
  readonly failLowering: string;
  readonly failProjection: string;
  readonly render: (proj: string, ctx: {
    readonly connective: ConnectiveOp;
    readonly formal: boolean;
    readonly politeSuffix: string;
    readonly past: boolean;
  }) => string;
}

function projectForComposeRule(
  kind: ProjectionComposeProjection,
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  switch (kind) {
    case "attributive":
      return projectBaseAttributive(base, past, formal);
    case "future_attributive":
      return projectBaseFutureAttributive(base, past, formal);
    case "m_nominalized":
      return projectBaseMNominalized(base, past, formal);
    case "nominalized":
      return projectBaseNominalized(base, past, formal);
    case "reason_gerund":
      return projectBaseReasonGerund(base, past, formal);
  }
}

function composeByProjectionRule(
  rule: ProjectionComposeRule,
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: rule.failLowering };
  }
  const effectivePast = rule.alwaysPast === true || past || (preNeg?.chainPast ?? false);
  const proj = projectForComposeRule(rule.projection, loweredBase, effectivePast, formal);
  if (proj === null) {
    return { ok: false, reason: rule.failProjection };
  }
  const polite = rule.politeFromCaller === true && isPolite;
  const text = rule.render(proj, { connective, formal, politeSuffix: polite ? "요" : "", past: effectivePast });
  if (text.startsWith(proj) && text.length > proj.length) {
    return {
      ok: true,
      text,
      polite,
      traced: tracedCat(
        tracedChainFinalPlaceholder(proj),
        tracedSeg(text.slice(proj.length), connective.source.tokens, "connective", "semantic")
      )
    };
  }
  if (
    text === proj &&
    rule.connectiveOwnedSuffix !== undefined &&
    text.endsWith(rule.connectiveOwnedSuffix) &&
    text.length > rule.connectiveOwnedSuffix.length
  ) {
    return {
      ok: true,
      text,
      polite,
      traced: tracedCat(
        tracedChainFinalPlaceholder(text.slice(0, -rule.connectiveOwnedSuffix.length)),
        tracedSeg(rule.connectiveOwnedSuffix, connective.source.tokens, "connective", "semantic")
      )
    };
  }
  return { ok: true, text, polite };
}

const TARI_ENUMERATIVE_COMPOSE_RULE: ProjectionComposeRule = {
  projection: "nominalized",
  politeFromCaller: true,
  failLowering: "たり enumerative chain lowering not supported",
  failProjection: "たり enumerative nominalization not supported",
  render: (proj, ctx) => `${proj}도${ctx.politeSuffix}`
};

function connectiveFocusParticleSuffix(surface: string, precedingKorean: string): string {
  if (surface.endsWith("は")) return selectParticle(precedingKorean, "은/는");
  if (surface.endsWith("も")) return selectParticle(precedingKorean, "도");
  return "";
}

const PROJECTION_COMPOSE_RULES: ReadonlyMap<ConnectiveOp["connective"], ProjectionComposeRule> = new Map<ConnectiveOp["connective"], ProjectionComposeRule>([
  ["additive_besides", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "hoka additive chain lowering not supported",
    failProjection: "hoka additive attributive projection not supported",
    render: (proj) => `${proj} 것 외에`
  }],
  ["purpose_evaluation_nominalizer", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "purpose/evaluation のに chain lowering not supported",
    failProjection: "purpose/evaluation のに attributive projection not supported",
    render: (proj) => `${proj} 데`
  }],
  ["exemplification", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "exemplification chain lowering not supported",
    failProjection: "exemplification attributive projection not supported",
    render: (proj, ctx) => `${proj}${ctx.connective.surface.endsWith("の") ? " 등의" : " 등"}`
  }],
  ["focus_additive_denaku", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "focus dake projection chain lowering not supported",
    failProjection: "focus dake additive attributive projection not supported",
    render: (proj) => `${proj} 뿐만 아니라`
  }],
  ["focus_additive_negative", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "focus dake projection chain lowering not supported",
    failProjection: "focus dake additive attributive projection not supported",
    render: (proj) => `${proj} 뿐이 아니라`
  }],
  ["focus_limit_nara", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "focus dake projection chain lowering not supported",
    failProjection: "focus dake scope attributive projection not supported",
    render: (proj) => `${proj} 것만이라면`
  }],
  ["focus_reversal_dokoro_ka", {
    projection: "nominalized",
    failLowering: "predicate dokoro-ka projection chain lowering not supported",
    failProjection: "predicate dokoro-ka nominalized projection not supported",
    render: (proj) => `${proj}는커녕`
  }],
  ["focus_limit_de", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "focus dake projection chain lowering not supported",
    failProjection: "focus dake scope attributive projection not supported",
    render: (proj, ctx) => {
      const focus = ctx.connective.surface.endsWith("でも")
        ? "도"
        : ctx.connective.surface.endsWith("では")
          ? "는"
          : "";
      return `${proj} 것만으로${focus}`;
    }
  }],
  ["predicate_projection_proportional_reason", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "proportional reason projection attributive not supported",
    render: (proj) => `${proj} 만큼`
  }],
  ["predicate_projection_degree_extent", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "degree projection attributive not supported",
    render: (proj, ctx) => `${proj} 만큼${ctx.connective.surface.endsWith("の") ? "의" : ""}`
  }],
  ["predicate_projection_quantity_extent", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "quantity projection attributive not supported",
    render: (proj, ctx) => {
      const base = `${proj} 만큼`;
      return ctx.connective.surface.endsWith("の")
        ? `${base}의`
        : `${base}${connectiveFocusParticleSuffix(ctx.connective.surface, base)}`;
    }
  }],
  ["predicate_projection_correlative_degree", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "correlative degree projection attributive not supported",
    render: (proj) => `${proj}수록`
  }],
  ["predicate_projection_comparison", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "comparison projection attributive not supported",
    render: (proj, ctx) => {
      const base = `${proj} 것보다`;
      return `${base}${connectiveFocusParticleSuffix(ctx.connective.surface, base)}`;
    }
  }],
  ["predicate_projection_evaluation_extent", {
    projection: "reason_gerund",
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "evaluation-extent gerund projection not supported",
    render: (proj) => `${proj}엔`
  }],
  ["predicate_projection_concession_echo", {
    projection: "reason_gerund",
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "concession-echo gerund projection not supported",
    render: (proj) => `${proj}는`
  }],
  ["predicate_projection_until", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "until projection attributive not supported",
    render: (proj, ctx) => {
      const base = `${proj} 때까지`;
      return `${base}${connectiveFocusParticleSuffix(ctx.connective.surface, base)}`;
    }
  }],
  ["predicate_projection_until_attributive", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "until attributive projection not supported",
    render: (proj) => `${proj} 때까지의`
  }],
  ["predicate_projection_as_far_as", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "as-far-as projection attributive not supported",
    render: (proj) => `${proj} 한`
  }],
  ["established_premise", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "established-premise connective chain lowering not supported",
    failProjection: "established-premise projection attributive not supported",
    render: (proj) => `${proj} 이상`
  }],
  ["predicate_projection_ni_complement", {
    projection: "reason_gerund",
    failLowering: "ni-complement connective chain lowering not supported",
    failProjection: "ni-complement gerund projection not supported",
    render: (proj) => `${proj}에`
  }],
  ["predicate_projection_ni_complement_m", {
    projection: "m_nominalized",
    failLowering: "ni-complement m-nominalized connective chain lowering not supported",
    failProjection: "ni-complement m-nominalized projection not supported",
    render: (proj) => `${proj}에`
  }],
  ["predicate_projection_ni_complement_outcome", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "ni-complement outcome connective chain lowering not supported",
    failProjection: "ni-complement outcome future-attributive projection not supported",
    render: (proj) => `${proj} 게`
  }],
  ["predicate_projection_ni_complement_worth", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "ni-complement worth connective chain lowering not supported",
    failProjection: "ni-complement worth future-attributive projection not supported",
    render: (proj) => proj
  }],
  ["predicate_projection_ni_complement_cannot_bear", {
    projection: "future_attributive", politeFromCaller: true,
    failLowering: "ni-complement cannot-bear connective chain lowering not supported",
    failProjection: "ni-complement cannot-bear future-attributive projection not supported",
    render: (proj) => `차마 ${proj}`
  }],
  ["predicate_projection_no_quote_reporting", {
    projection: "nominalized", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "no-quote reporting projection nominalization not supported",
    render: (proj) => `${proj}로는`
  }],
  ["predicate_projection_additive_ue_ni", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "ue-ni additive projection attributive not supported",
    render: (proj) => `${proj} 데다가`
  }],
  ["predicate_projection_ue_de", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "ue-de projection attributive not supported",
    render: (proj, ctx) => {
      const head = ctx.past ? "뒤" : "데";
      const locative = ctx.past ? "에" : "서";
      const focus = connectiveFocusParticleSuffix(ctx.connective.surface, locative);
      return focus === "" ? `${proj} ${head}` : `${proj} ${head}${locative}${focus}`;
    }
  }],
  ["predicate_projection_ue_de_attributive", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "ue-de attributive projection not supported",
    render: (proj, ctx) => ctx.past ? `${proj} 뒤의` : `${proj} 데 있어서의`
  }],
  ["predicate_projection_gatera", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate projection connective chain lowering not supported",
    failProjection: "gatera projection attributive not supported",
    render: (proj) => `${proj} 김에`
  }],
  ["bound_nominal_listing", {
    projection: "attributive",
    failLowering: "bound nominal listing chain lowering not supported",
    failProjection: "bound nominal listing attributive projection not supported",
    render: (proj, ctx) => `${proj}${ctx.connective.surface.endsWith("や") ? " 것이나" : " 것"}`
  }],
  ["tame_reason", {
    projection: "reason_gerund",
    failLowering: "tame connective chain lowering not supported",
    failProjection: "tame connective gerund projection not supported",
    render: (proj) => `${proj} 때문에`
  }],
  ["tame_purpose", {
    projection: "reason_gerund",
    failLowering: "tame connective chain lowering not supported",
    failProjection: "tame connective gerund projection not supported",
    render: (proj) => `${proj} 위해`
  }],
  ["predicate_projection_purpose_beku", {
    projection: "reason_gerund",
    failLowering: "beku purpose projection chain lowering not supported",
    failProjection: "beku purpose gerund projection not supported",
    render: (proj) => `${proj} 위해`
  }],
  ["predicate_projection_tame_gerund", {
    projection: "reason_gerund",
    connectiveOwnedSuffix: "기",
    failLowering: "tame gerund projection chain lowering not supported",
    failProjection: "tame gerund projection not supported",
    render: (proj) => proj
  }],
  ["predicate_projection_derivational_nominal_m", {
    projection: "m_nominalized",
    connectiveOwnedSuffix: "ㅁ",
    failLowering: "derivational nominal-m projection chain lowering not supported",
    failProjection: "derivational nominal-m projection not supported",
    render: (proj) => proj
  }],
  ["predicate_projection_simultaneous_time", {
    projection: "attributive", politeFromCaller: true,
    failLowering: "predicate simultaneous projection chain lowering not supported",
    failProjection: "predicate simultaneous projection attributive not supported",
    render: (proj) => `${proj} 동시에`
  }],
  ["temporal_since", {
    projection: "attributive", alwaysPast: true,
    failLowering: "temporal since connective chain lowering not supported",
    failProjection: "temporal since attributive projection not supported",
    render: (proj) => `${proj} 이래`
  }],
  ["reason_quoted_judgment_passive", {
    projection: "reason_gerund",
    failLowering: "reason quoted judgment passive chain lowering not supported",
    failProjection: "reason quoted judgment passive gerund projection not supported",
    render: (proj, ctx) => `${proj} 때문이라고 ${ctx.connective.surface.endsWith("が")
      ? "여겨지지만"
      : ctx.formal
        ? "여겨진다"
        : "여겨져"}`
  }]
]);

export function composeBaseWithSfpClosedExemplification(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions,
): RenderOutcome {
  const { closedSfp, closedChainMood, ...plainConnective } = connective;
  const closedMood = quotedMoodForClosingSfpEffect(closedSfp?.effect) ?? closedChainMood;
  const rule = CONNECTIVE_RENDER_MAP.get(connectiveRenderSurface(plainConnective));
  const complementizer = rule?.suffixText;
  const projection = quoteProjectionForSfpEffect(closedSfp?.effect ?? null, closedMood === "imperative");
  if (closedMood === "imperative" || closedMood === "volitional") {
    if (complementizer === undefined) {
      return { ok: false, reason: `sfp-closed exemplification: '${connective.surface}' has no suffix row` };
    }
    if (preNeg !== null || past) {
      return { ok: false, reason: `sfp-closed exemplification: ${closedMood} complement with negation/past not supported` };
    }
    if (projection === "prohibitive") {
      return composeRequestProhibitionComplement(base, connective.surface, { requestForm: false, complementizer });
    }
    if (closedMood === "imperative") {
      return composeBaseWithImperativeQuotative(base, complementizer);
    }
    if (base.final.kind !== "lemma") {
      return { ok: false, reason: "sfp-closed exemplification: volitional complement requires lemma final" };
    }
    const volitional = renderBaseVolitionalTerminal({ ...base, final: base.final });
    return volitional.ok ? { ok: true, text: `${volitional.text}${complementizer}`, polite: false } : volitional;
  }
  if (closedSfp === undefined || projection === "assertive") {
    return composeBaseWithConnective(base, plainConnective, past, isPolite, preNeg, formal, lookups, options);
  }
  const particleKey = rule?.copulaParticleKey;
  if (particleKey === undefined) {
    return { ok: false, reason: `sfp-closed exemplification: '${connective.surface}' has no copula particle row` };
  }
  const mood = composeTerminalMoodOnBase({ ok: true, base }, preNeg, past, true, false, closedSfp, lookups);
  if (mood === null || !mood.ok) {
    return { ok: false, reason: `sfp-closed exemplification: terminal mood not supported for SFP ${closedSfp.effect ?? "null"}` };
  }
  return {
    ok: true,
    text: `${mood.text}${selectParticle(mood.text, particleKey)}${rule?.suffixText ?? ""}`,
    polite: false,
  };
}

export function exemplificationTakesClosedPropositionComplement(connective: ConnectiveOp): boolean {
  return connective.connective === "exemplification" &&
    CONNECTIVE_RENDER_MAP.get(connectiveRenderSurface(connective))?.suffixText !== undefined;
}

export function composeBaseWithConnective(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions = {}
): RenderOutcome {
  if (connective.connective === "exemplification" && connective.closedSfp !== undefined) {
    return composeBaseWithSfpClosedExemplification(base, connective, past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "listing" && isTariEnumerativeSurface(connective.surface)) {
    return composeByProjectionRule(TARI_ENUMERATIVE_COMPOSE_RULE, base, connective, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "concession" && isKuseNiSurface(connective.surface)) {
    return composeBaseWithKuseNiConnective(base, connective, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "te_form") {
    const role = connective.teFormRole ?? defaultTeFormRoleForBase(base, preNeg, connective);
    if (role === "adverbial") {
      return composeBaseWithAdverbialTeForm(base, past, preNeg, formal, lookups, options);
    }
    if (role === "manner") {
      return { ok: false, reason: "te_form manner requires StructuralRelation simultaneous projection" };
    }
    if (role === "compound_serial") {
      return composeBaseWithCompoundSerialTeForm(base, past, preNeg, formal, options);
    }
    const lowered = teFormRoleToConnective(connective, role);
    return composeBaseWithConnective(base, lowered, role === "linkage" ? false : past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "alternative") {
    return composeBaseWithConnective(
      base,
      { ...connective, connective: "listing", surface: "__alternative_ka" },
      past,
      isPolite,
      preNeg,
      formal,
      lookups,
      options
    );
  }
  if (connective.connective === "additive_besides") {
    return composeByProjectionRule(PROJECTION_COMPOSE_RULES.get("additive_besides")!, base, connective, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "reason" && connective.surface === "し") {
    return composeBaseWithConnective(
      base,
      { ...connective, surface: "から" },
      past,
      isPolite,
      preNeg,
      formal,
      lookups,
      options
    );
  }
  if (preNeg === null && past && base.policy?.kind === "completion_potential") {
    return composeBaseWithConnective(
      completionPotentialCompletedBase(base.policy),
      connective,
      true,
      isPolite,
      null,
      formal,
      lookups,
      options
    );
  }
  if (
    preNeg === null &&
    !past &&
    connective.connective === "question_content" &&
    base.policy?.kind === "obligation" &&
    base.policy.polarity === "affirmative"
  ) {
    const stemAe = conjugate(base.policy.stemLemma, base.policy.stemIrregular, "아/어");
    const obligationCore = `${stemAe}야${obligationEmphasis(base.policy.variant)}`;
    return { ok: true, text: `${obligationCore} 할지`, polite: false };
  }
  if (
    preNeg?.chainDepth === 1 &&
    preNeg.preferShortNegation &&
    (connective.connective === "question_content" || connective.connective === "question_quotative") &&
    base.final.kind === "lemma"
  ) {
    const effectivePast = past || preNeg.chainPast;
    const [prefix, shortLemma, shortIrregular] = shortNegationPrefix(base.final.lemma, base.final.irregular, lookups);
    const connectiveSurface = connectiveRenderSurface(connective);
    const ending = resolveConnectiveEnding(connectiveSurface, base.final.isVerb, effectivePast);
    if (ending === null) {
      return { ok: false, reason: `question-content connective surface '${connective.surface}' not yet mapped` };
    }
    if (ending.pastViaEnding) {
      const finalText = conjugate(shortLemma, shortIrregular, ending.ending);
      return {
        ok: true,
        text: `${base.prefix}${prefix}${finalText}${ending.suffixText ?? ""}${isPolite ? "요" : ""}`,
        polite: isPolite
      };
    }
    const pastStem = shortLemma === "아니다"
      ? "아니었"
      : conjugate(shortLemma, shortIrregular, "았/었");
    const tail = conjugate("있다", null, ending.ending);
    const tailEnding = tail.startsWith("있") ? tail.slice(1) : tail;
    return {
      ok: true,
      text: `${base.prefix}${prefix}${pastStem}${tailEnding}${ending.suffixText ?? ""}${isPolite ? "요" : ""}`,
      polite: isPolite
    };
  }
  const projectionRule = PROJECTION_COMPOSE_RULES.get(connective.connective);
  const hasSurfaceRenderRule = resolveConnectiveEnding(connectiveRenderSurface(connective), true, false)?.suffixText !== undefined;
  if (projectionRule !== undefined && !(connective.connective === "exemplification" && hasSurfaceRenderRule)) {
    return composeByProjectionRule(projectionRule, base, connective, past, isPolite, preNeg, formal, options);
  }
  const declaredCompose = declaredProjectionComposeByKind().get(connective.connective);
  if (declaredCompose !== undefined) {
    const declaredSuffix = declaredSuffixForConnectiveSurface(declaredCompose, connective.surface);
    if (declaredSuffix !== null) {
      return composeByProjectionRule({
        projection: declaredCompose.projection, politeFromCaller: true,
        failLowering: `declared realization ${connective.connective} chain lowering not supported`,
        failProjection: `declared realization ${connective.connective} projection not supported`,
        render: (proj) => `${proj}${declaredSuffix}`
      }, base, connective, past, isPolite, preNeg, formal, options);
    }
  }
  if (connective.connective === "sequence_after") {
    return composeBaseWithSequenceAfter(base, connective, past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "sequence_immediate") {
    return composeBaseWithSequenceImmediate(base, connective, past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "stative_hold") {
    return composeBaseWithStativeHold(base, past, preNeg, formal, options);
  }
  if (connective.connective === "question_content_alternative") {
    return composeBaseWithQuestionContentAlternative(base, connective, past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "quotative") {
    return applyQuoteBoundaryFocus(
      composeBaseWithQuotative(base, past, preNeg, formal, lookups, options, connective),
      connective.quoteBoundary?.focusParticle
    );
  }
  if (connective.connective === "cognitive_complement") {
    return composeBaseWithCognitiveComplement(base, connective, past, preNeg, formal, lookups, options);
  }
  if (connective.connective === "reformulation") {
    return composeBaseWithReformulation(base, connective, past, preNeg, lookups, options);
  }
  if (connective.connective === "quoted_concessive") {
    return composeBaseWithQuotedConcessive(base, connective, past, preNeg, formal, lookups, options);
  }
  if (connective.connective === "even_if" && isNiSeriesConcessiveConditionalSurface(connective.surface, lookups)) {
    return composeBaseWithNiShiteMoEvenIf(base, past, preNeg, formal, lookups, options);
  }
  if (
    connective.connective === "retrospective_quotative" ||
    connective.retrospectiveQuotativeFlavor === "question_retrospective"
  ) {
    return composeBaseWithRetrospectiveQuotative(base, connective, past, preNeg, formal, lookups, options);
  }
  if (connective.connective === "question_reformulation") {
    return composeBaseWithQuestionReformulation(base, past, preNeg, lookups, options);
  }
  if (connective.connective === "wish_complement") {
    return composeBaseWithWishComplement(base, past, preNeg, formal, options);
  }
  if (connective.connective === "request_complement") {
    return composeBaseWithRequestComplement(base, past, preNeg, options, connective);
  }
  const chainDepth = preNeg?.chainDepth ?? 0;
  if (connective.connective === "external_nominalizer_concessive") {
    const adversative = composeBaseWithConnective(
      base,
      { ...connective, connective: "adversative", surface: "のに" },
      past,
      false,
      preNeg,
      formal,
      lookups,
      options
    );
    if (!adversative.ok) {
      return adversative;
    }
    return { ok: true, text: `${adversative.text}도`, polite: false };
  }
  if (connective.connective === "predicate_projection_quote_attributive") {
    return composeBaseWithPredicateProjectionQuoteAttributive(base, past, isPolite, preNeg, formal, lookups, options);
  }
  if (connective.connective === "recent_past_bakari_ni_reason") {
    return composeBaseWithBakariNiReason(base, preNeg, formal, lookups, options);
  }
  if (connective.connective === "bound_nominal_reason") {
    return composeBaseWithBoundNominalReason(base, connective, past, preNeg, formal, lookups, options);
  }
  if (connective.connective === "predicate_projection_purpose") {
    return composeBaseWithYouNiPurpose(base, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_intentional_purpose") {
    return composeBaseWithNiwaIntentionalPurpose(base, preNeg, formal, options);
  }
  if (connective.connective === "purpose_motion") {
    return composeBaseWithPurposeMotion(base, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_wish_terminal") {
    return composeBaseWithWishComplement(base, past, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_manner_simile") {
    return composeBaseWithYouNiMannerSimile(base, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_manner_volitional") {
    return composeBaseWithYouNiMannerVolitional(base, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_manner_simile_action") {
    return composeBaseWithYouNiMannerSimileAction(base, past, isPolite, preNeg, formal, options);
  }
  if (connective.connective === "predicate_projection_quotative_manner_simile") {
    return composeBaseWithQuotativeMannerSimile(base, past, preNeg, formal, lookups, options, "듯이", connective);
  }
  if (connective.connective === "predicate_projection_quotative_manner_simile_attributive") {
    return composeBaseWithQuotativeMannerSimile(base, past, preNeg, formal, lookups, options, "듯한", connective);
  }
  if (base.final.kind === "negativeNounCopula") {
    if (chainDepth >= 1) {
      const lowered = applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options);
      if (lowered === null) {
        return { ok: false, reason: "external chain on negativeNounCopula + connective not supported" };
      }
      return composeBaseWithConnective(
        lowered,
        connective,
        past || (preNeg?.chainPast ?? false),
        isPolite,
        null,
        formal,
        lookups,
        options
      );
    }
    return composeNegativeNounCopulaConnective(base.prefix, base.final, connective, past, formal, isPolite, lookups);
  }
  if (base.final.kind === "nounCopula") {
    if (preNeg !== null && connective.surface === "と" && chainDepth === 1 && !past && !preNeg.chainPast) {
      return composeNounCopulaNegativeToObligation(base.final.nounSurface, formal, isPolite, lookups, nounCopulaFinalAllomorphHost(base.final));
    }
    if (chainDepth >= 1) {
      const lowered = applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options);
      if (lowered === null) {
        return { ok: false, reason: "chain on nounCopula + connective not yet supported" };
      }
      return composeBaseWithConnective(
        lowered,
        connective,
        past || (preNeg?.chainPast ?? false),
        isPolite,
        null,
        formal,
        lookups,
        options
      );
    }
    if (
      connective.connective === "even_if" &&
      CONNECTIVE_RENDER_MAP.get(connective.surface)?.copulaParticleKey === undefined
    ) {
      return {
        ok: true,
        text: `${base.prefix}${base.final.nounSurface}${selectParticle(nounCopulaFinalAllomorphHost(base.final), "이라도/라도")}`,
        polite: false
      };
    }
    const copulaHostSurface = nounSurfaceForConnective(base, connective, past);
    return composeNounCopulaConnective(
      base.prefix,
      copulaHostSurface,
      connective,
      past,
      isPolite,
      formal,
      base.policy?.kind === "scope_carrier" &&
        base.policy.connectiveSourcePoliteness === "preserve_when_supported",
      nounCopulaFinalAllomorphHost(base.final),
      copulaFusedHostSurface(copulaHostSurface, lookups)
    );
  }
  if (base.final.kind === "boundNounCopula") {
    if (chainDepth >= 1) {
      const lowered = applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options);
      if (lowered === null) {
        return { ok: false, reason: "chain on boundNounCopula + connective not yet supported" };
      }
      return composeBaseWithConnective(
        lowered,
        connective,
        past || (preNeg?.chainPast ?? false),
        isPolite,
        null,
        formal,
        lookups,
        options
      );
    }
    const boundNounSurface = nounSurfaceForConnective(base, connective, past);
    return composeNounCopulaConnective(
      base.prefix,
      boundNounSurface,
      connective,
      past,
      isPolite,
      formal,
      base.policy?.kind === "scope_carrier" &&
        base.policy.connectiveSourcePoliteness === "preserve_when_supported",
      undefined,
      copulaFusedHostSurface(boundNounSurface, lookups)
    );
  }
  const loweredBase = applyNegationChainToLemmaBase(base, preNeg, options);
  if (loweredBase === null) {
    return { ok: false, reason: "chain on non-lemma base + connective not supported" };
  }
  const finalLemma = loweredBase.final.lemma;
  const finalIrregular = loweredBase.final.irregular;
  const finalIsVerb = loweredBase.final.isVerb;
  const benefactivePlainConditional =
    base.policy?.kind === "benefactive" &&
    connective.connective === "conditional" &&
    connective.conditionalFlavor === "plain";
  const benefactivePotentialPlainConditional =
    benefactivePlainConditional &&
    base.policy?.kind === "benefactive" &&
    base.policy.potential === true;
  const counterfactualConditional = connective.conditionalFlavor === "counterfactual";
  const effectivePast = benefactivePlainConditional
    ? false
    : (past || (preNeg?.chainPast ?? false) || counterfactualConditional);
  const politeSuffix = isPolite ? "요" : "";
  if (
    connective.connective === "conditional" &&
    (connective.retrospectiveTara === true || connective.retrospectiveDiscoveryStyle === "deoni")
  ) {
    const finalText = `${conjugate(finalLemma, finalIrregular, "았/었")}더니`;
    return {
      ok: true,
      text: `${loweredBase.prefix}${finalText}${politeSuffix}`,
      polite: isPolite
    };
  }
  if (
    connective.connective === "conditional" &&
    connective.retrospectiveDiscoveryStyle === "ja"
  ) {
    const finalText = conjugate(finalLemma, finalIrregular, "자");
    return {
      ok: true,
      text: `${loweredBase.prefix}${finalText}${politeSuffix}`,
      polite: isPolite
    };
  }
  const connectiveSurface =
    benefactivePotentialPlainConditional
      ? "なら"
      : benefactivePlainConditional
        ? "たら"
        : counterfactualConditional && connective.connective === "conditional"
          ? "たら"
          : connective.surface === "ので" &&
            effectivePast &&
            shouldCarryPastForNodeReason(base)
            ? "から"
            : connectiveRenderSurface(connective);
  if (
    chainDepth === 0 &&
    !effectivePast &&
    base.final.kind === "lemma" &&
    base.final.idiom?.kind === "conjecture" &&
    base.final.idiom.projection === "nominalized"
  ) {
    return composeNominalizedConjectureConnective(base, connectiveSurface, isPolite, formal, connective.connective);
  }
  if (chainDepth === 0 && finalLemma === "아니다" && connectiveSurface === "なら") {
    const aniConditional = effectivePast ? "아니었다면" : "아니라면";
    return { ok: true, text: `${loweredBase.prefix}${aniConditional}`, polite: isPolite };
  }
  const forceNaturalPastCarry =
    effectivePast &&
    connectiveSurface === "ので" &&
    base.policy?.kind === "te_iru_contract_to_past";
  const exemplificationUsesStativeQuotation = connective.connective === "exemplification" &&
    (finalLemma === "있다" || finalLemma === "없다");
  const ending = forceNaturalPastCarry
    ? { ending: "아/어서", pastViaEnding: false }
    : resolveConnectiveEnding(connectiveSurface, exemplificationUsesStativeQuotation ? false : finalIsVerb, effectivePast);
  if (ending === null) {
    return { ok: false, reason: `connective surface '${connective.surface}' not yet mapped` };
  }
  if (ending.pastViaEnding) {
    const finalText = conjugate(finalLemma, finalIrregular, ending.ending);
    const text = `${loweredBase.prefix}${finalText}${ending.suffixText ?? ""}${politeSuffix}`;
    const endingSplit = splitConjugatedConnectiveEnding(finalText, ending.ending);
    if (endingSplit !== null) {
      return {
        ok: true,
        text,
        polite: isPolite,
        traced: tracedCat(
          tracedChainFinalPlaceholder(`${loweredBase.prefix}${endingSplit.stem}`),
          tracedSeg(`${endingSplit.ending}${ending.suffixText ?? ""}${politeSuffix}`, connective.source.tokens, "connective", "semantic")
        )
      };
    }
    return { ok: true, text, polite: isPolite };
  }
  const pastStem = finalLemma === "아니다"
    ? "아니었"
    : conjugate(finalLemma, finalIrregular, "았/었");
  const tail = conjugate("있다", null, ending.ending);
  const tailEnding = tail.startsWith("있") ? tail.slice(1) : tail;
  return {
    ok: true,
    text: `${loweredBase.prefix}${pastStem}${tailEnding}${ending.suffixText ?? ""}${politeSuffix}`,
    polite: isPolite,
    traced: tracedCat(
      tracedChainFinalPlaceholder(`${loweredBase.prefix}${pastStem}`),
      tracedSeg(`${tailEnding}${ending.suffixText ?? ""}${politeSuffix}`, connective.source.tokens, "connective", "semantic")
    )
  };
}

function splitConjugatedConnectiveEnding(
  finalText: string,
  endingTemplate: string
): { readonly stem: string; readonly ending: string } | null {
  const candidates = new Set<string>();
  const optional = endingTemplate.match(/^（?\(([^)]+)\)(.+)$/u);
  const alternation = endingTemplate.match(/^(.)\/(.)(.*)$/u);
  if (optional !== null) {
    candidates.add(`${optional[1]}${optional[2]}`);
    candidates.add(optional[2]!);
  } else if (alternation !== null) {
    candidates.add(`${alternation[1]}${alternation[3]}`);
    candidates.add(`${alternation[2]}${alternation[3]}`);
    if (alternation[3]!.length > 0) {
      candidates.add(alternation[3]!);
    }
  } else {
    candidates.add(endingTemplate);
  }
  for (const candidate of [...candidates].sort((left, right) => right.length - left.length)) {
    if (candidate.length === 0 || !finalText.endsWith(candidate)) {
      continue;
    }
    const stem = finalText.slice(0, finalText.length - candidate.length);
    if (stem.length === 0) {
      continue;
    }
    return { stem, ending: candidate };
  }
  return null;
}

function composeBaseWithYouNiPurpose(
  base: KoreanPredicateBase,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  if (base.final.kind === "nounCopula" && preNeg === null && !past) {
    return {
      ok: true,
      text: `${base.prefix}${base.final.nounSurface}이도록`,
      polite: false
    };
  }
  const loweredBase = lowerBaseForPredicateProjection(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "ように purpose projection chain lowering not supported" };
  }
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (effectivePast) {
    return composeBaseWithYouNiMannerSimile(base, past, isPolite, preNeg, formal, options);
  }
  const finalText = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "도록");
  return {
    ok: true,
    text: `${loweredBase.prefix}${finalText}${isPolite ? "요" : ""}`,
    polite: isPolite
  };
}

function composeBaseWithNiwaIntentionalPurpose(
  base: KoreanPredicateBase,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseForPredicateProjection(base, preNeg, formal, options);
  if (loweredBase === null || loweredBase.final.kind !== "lemma") {
    return { ok: false, reason: "には intentional-purpose projection lowering not supported" };
  }
  const finalText = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "(으)려면");
  return {
    ok: true,
    text: `${loweredBase.prefix}${finalText}`,
    polite: false
  };
}

function composeBaseWithPurposeMotion(
  base: KoreanPredicateBase,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseForPredicateProjection(base, preNeg, formal, options);
  if (loweredBase === null || loweredBase.final.kind !== "lemma") {
    return { ok: false, reason: "purpose-motion connective lowering not supported" };
  }
  const finalText = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "(으)러");
  return {
    ok: true,
    text: `${loweredBase.prefix}${finalText}`,
    polite: false
  };
}

function composeBaseWithYouNiAttributiveSuffix(
  base: KoreanPredicateBase,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions,
  suffix: string,
  label: string
): RenderOutcome {
  const loweredBase = lowerBaseForPredicateProjection(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: `ように ${label} projection chain lowering not supported` };
  }
  const attr = projectBaseAttributive(
    loweredBase,
    past || (preNeg?.chainPast ?? false),
    formal
  );
  if (attr === null) {
    return { ok: false, reason: `ように ${label} attributive projection not supported` };
  }
  return {
    ok: true,
    text: `${attr} ${suffix}${isPolite ? "요" : ""}`,
    polite: isPolite
  };
}

function composeBaseWithYouNiMannerSimile(
  base: KoreanPredicateBase, past: boolean, isPolite: boolean,
  preNeg: NegationOp | null, formal: boolean, options: NegationLoweringOptions
): RenderOutcome {
  return composeBaseWithYouNiAttributiveSuffix(base, past, isPolite, preNeg, formal, options, "것처럼", "manner/simile");
}

function composeBaseWithYouNiMannerVolitional(
  base: KoreanPredicateBase, past: boolean, isPolite: boolean,
  preNeg: NegationOp | null, formal: boolean, options: NegationLoweringOptions
): RenderOutcome {
  return composeBaseWithYouNiAttributiveSuffix(base, past, isPolite, preNeg, formal, options, "대로", "volitional manner");
}

export function appearanceAdverbialLexicalizationApplies(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null
): boolean {
  return !past &&
    preNeg === null &&
    base.policy?.kind === "likeness" &&
    base.policy.adverbialLexicalization !== undefined;
}

function composeBaseWithYouNiMannerSimileAction(
  base: KoreanPredicateBase, past: boolean, isPolite: boolean,
  preNeg: NegationOp | null, formal: boolean, options: NegationLoweringOptions
): RenderOutcome {
  if (appearanceAdverbialLexicalizationApplies(base, past, preNeg)) {
    const lexicalization = base.policy?.kind === "likeness"
      ? base.policy.adverbialLexicalization
      : undefined;
    if (lexicalization !== undefined) {
      return {
        ok: true,
        text: `${lexicalization.prefix}듯이${isPolite ? "요" : ""}`,
        polite: isPolite
      };
    }
  }
  return composeBaseWithYouNiAttributiveSuffix(base, past, isPolite, preNeg, formal, options, "듯이", "action simile");
}

function composeBaseWithSequenceAfter(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const listing = composeBaseWithConnective(
    base,
    { ...connective, connective: "listing", surface: "し" },
    past,
    false,
    preNeg,
    formal,
    lookups,
    options
  );
  if (!listing.ok) {
    return listing;
  }
  const politeSuffix = isPolite ? "요" : "";
  return { ok: true, text: `${listing.text} 나서${politeSuffix}`, polite: isPolite };
}

function composeBaseWithSequenceImmediate(
  base: KoreanPredicateBase,
  _connective: ConnectiveOp,
  _past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  _lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "immediate sequence host negation lowering not supported" };
  }
  if (loweredBase.final.kind !== "lemma" || !loweredBase.final.isVerb) {
    return { ok: false, reason: "immediate sequence requires verb-like host" };
  }
  const stem = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "자");
  const politeSuffix = isPolite ? "요" : "";
  return { ok: true, text: `${loweredBase.prefix}${stem}마자${politeSuffix}`, polite: isPolite };
}

function composeBaseWithStativeHold(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  if (!past) {
    return { ok: false, reason: "stative hold requires past host" };
  }
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "stative hold host negation lowering not supported" };
  }
  if (loweredBase.final.kind !== "lemma" || !loweredBase.final.isVerb) {
    return { ok: false, reason: "stative hold requires verb-like host" };
  }
  const stem = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "ㄴ/은");
  return { ok: true, text: `${loweredBase.prefix}${stem} 채`, polite: false };
}

function teFormRoleToConnective(
  connective: ConnectiveOp,
  role: Exclude<TeFormConnectiveRole, "adverbial" | "manner" | "compound_serial">
): ConnectiveOp {
  if (role === "reason" || role === "linkage") {
    return { ...connective, connective: "reason", surface: "ので" };
  }
  if (role === "result_chain") {
    return { ...connective, connective: "listing", surface: "__te_result_chain" };
  }
  return { ...connective, connective: "listing", surface: "し" };
}

function defaultTeFormRoleForBase(
  base: KoreanPredicateBase,
  neg: NegationOp | null = null,
  connective?: ConnectiveOp
): TeFormConnectiveRole {
  if (base.policy?.kind === "degree_intensifier") {
    return "reason";
  }
  if (base.final.kind === "negativeNounCopula" || neg?.sourceSplit?.kind === "predicate_copula_negative") {
    return "listing";
  }
  return connective?.surface === RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE ? DEFAULT_RENYOU_CHUUSHI_ROLE : DEFAULT_TE_FORM_ROLE;
}

function composeBaseWithAdverbialTeForm(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  if (past) {
    return { ok: false, reason: "past + te_form adverbial not supported" };
  }
  const loweredBase = base.final.kind === "lemma"
    ? applyNegationChainToLemmaBase(base, preNeg, options)
    : null;
  if (loweredBase === null || loweredBase.final.kind !== "lemma") {
    return { ok: false, reason: "te_form adverbial on non-lemma base not supported" };
  }
  const finalText = conjugate(loweredBase.final.lemma, loweredBase.final.irregular, "게");
  return { ok: true, text: `${loweredBase.prefix}${finalText}`, polite: false };
}

function composeBaseWithCompoundSerialTeForm(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  if (past) {
    return { ok: false, reason: "past + te_form compound_serial not supported" };
  }
  const loweredBase = lowerBaseForPredicateProjection(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "te_form compound_serial requires a lemma-lowerable base" };
  }
  return { ok: true, text: `${loweredBase.prefix}${predicateBaseInfinitiveForm(loweredBase)}`, polite: false };
}

function shouldCarryPastForNodeReason(base: KoreanPredicateBase): boolean {
  if (
    base.policy?.kind === "degree_intensifier" &&
    base.policy.nodeReasonPastBehavior === "carry"
  ) {
    return true;
  }
  if (base.final.kind !== "lemma") {
    return false;
  }
  if (base.final.lemma !== "있다" && base.final.lemma !== "없다") {
    return false;
  }
  return base.prefix.endsWith("수 ");
}

const DECLARED_COMPOSE_PROJECTIONS: ReadonlySet<string> = new Set([
  "attributive",
  "future_attributive",
  "m_nominalized",
  "nominalized",
  "reason_gerund"
] as const satisfies readonly ProjectionComposeProjection[]);

interface DeclaredProjectionCompose {
  readonly projection: ProjectionComposeProjection;
  readonly uniformSuffix: string | null;
  readonly suffixByVerbSurface: ReadonlyMap<string, string>;
}

let cachedDeclaredComposeGeneration = -1;
let cachedDeclaredComposeByKind: ReadonlyMap<string, DeclaredProjectionCompose> | null = null;

function declaredProjectionComposeByKind(): ReadonlyMap<string, DeclaredProjectionCompose> {
  const generation = nominalFrameDataGeneration();
  if (cachedDeclaredComposeByKind !== null && cachedDeclaredComposeGeneration === generation) {
    return cachedDeclaredComposeByKind;
  }
  const collected = new Map<string, {
    projection: ProjectionComposeProjection;
    suffixes: Set<string>;
    suffixByVerbSurface: Map<string, string>;
  }>();
  for (const entry of loadTailAttachmentRegistry()) {
    const predicate = entry.attach.hostRealizations.predicate;
    if (predicate?.kind !== "predicate_projection" || predicate.suffix === undefined) {
      continue;
    }
    const projection = predicate.projection;
    if (projection === undefined || !DECLARED_COMPOSE_PROJECTIONS.has(projection)) {
      throw new Error(`invalid declared realization projection '${projection ?? "(none)"}' for '${entry.id}'`);
    }
    const existing = collected.get(predicate.connective);
    if (existing === undefined) {
      collected.set(predicate.connective, {
        projection: projection as ProjectionComposeProjection,
        suffixes: new Set([predicate.suffix]),
        suffixByVerbSurface: new Map((predicate.match?.verbSurfaces ?? []).map((verbSurface) => [verbSurface, predicate.suffix!]))
      });
      continue;
    }
    if (existing.projection !== projection) {
      throw new Error(`conflicting declared projection for connective '${predicate.connective}' ('${entry.id}')`);
    }
    existing.suffixes.add(predicate.suffix);
    for (const verbSurface of predicate.match?.verbSurfaces ?? []) {
      existing.suffixByVerbSurface.set(verbSurface, predicate.suffix);
    }
  }
  const byKind = new Map<string, DeclaredProjectionCompose>();
  for (const [kind, { projection, suffixes, suffixByVerbSurface }] of collected) {
    byKind.set(kind, {
      projection,
      uniformSuffix: suffixes.size === 1 ? [...suffixes][0]! : null,
      suffixByVerbSurface
    });
  }
  cachedDeclaredComposeByKind = byKind;
  cachedDeclaredComposeGeneration = generation;
  return byKind;
}

function declaredSuffixForConnectiveSurface(rule: DeclaredProjectionCompose, surface: string): string | null {
  let declared = rule.uniformSuffix;
  if (declared === null) {
    for (const [verbSurface, suffix] of rule.suffixByVerbSurface) {
      if (surface.includes(verbSurface)) {
        declared = suffix;
        break;
      }
    }
  }
  if (declared === null) {
    return null;
  }
  if (surface.endsWith("は")) return `${declared}서는`;
  if (surface.endsWith("も")) return `${declared}서도`;
  return declared;
}

function nounSurfaceForConnective(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean
): string {
  if (
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    base.policy.style === "emphasis" &&
    (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") &&
    (isAdversativeConnectiveSurface(connective.surface) || connective.surface === "から")
  ) {
    return base.final.nounSurface === "거" ? "것" : base.final.nounSurface;
  }
  if (
    past &&
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") &&
    (connective.surface === "から" || connective.surface === "ので")
  ) {
    return base.final.nounSurface === "거" ? "것" : base.final.nounSurface;
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    return base.final.nounSurface;
  }
  return "";
}

function composeNominalizedConjectureConnective(
  base: KoreanPredicateBase,
  connectiveSurface: string,
  isPolite: boolean,
  formal: boolean,
  connectiveType?: string
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "nominalized conjecture connective invariant violation" };
  }
  const nominal = nominalizedConjectureStem(base.final.lemma);
  if (nominal === null) {
    return { ok: false, reason: "nominalized conjecture connective invariant violation" };
  }
  if (
    connectiveType === "question_content" ||
    connectiveType === "question_quotative" ||
    connectiveType === "alternative"
  ) {
    return { ok: true, text: `${base.prefix}${nominal}일지`, polite: false };
  }
  const connectivePolite = isPolite || (
    !formal &&
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    base.final.idiom?.kind === "conjecture" &&
    base.final.idiom.conjecturePolite === true
  );
  const politeSuffix = connectivePolite ? "요" : "";
  if (connectiveSurface === "から" || connectiveSurface === "ので") {
    return { ok: true, text: `${base.prefix}${nominal}일 테니까${politeSuffix}`, polite: connectivePolite };
  }
  if (isAdversativeConnectiveSurface(connectiveSurface)) {
    return { ok: true, text: `${base.prefix}${nominal}이겠지만${politeSuffix}`, polite: connectivePolite };
  }
  if (
    connectiveSurface === "し" &&
    base.final.idiom?.kind === "conjecture" &&
    base.final.idiom.sourceLemma !== undefined
  ) {
    const hostAttr = conjugate(
      base.final.idiom.sourceLemma,
      base.final.idiom.sourceIrregular ?? null,
      "ㄹ/을"
    );
    const listingPoliteSuffix = isPolite ? "요" : "";
    return {
      ok: true,
      text: `${base.prefix}${hostAttr} 테고${listingPoliteSuffix}`,
      polite: isPolite
    };
  }
  const ending = resolveConnectiveEnding(connectiveSurface, false, false);
  if (ending === null || !ending.pastViaEnding) {
    return { ok: false, reason: `nominalized conjecture + connective '${connectiveSurface}' 영역 외` };
  }
  const finalText = conjugate(`${nominal}이겠다`, null, ending.ending);
  return {
    ok: true,
    text: `${base.prefix}${finalText}${ending.suffixText ?? ""}${politeSuffix}`,
    polite: connectivePolite
  };
}

export function renderConjectureQuotativeFromStem(options: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome {
  const { stemLemma, stemIrregular, preModalNeg, past, lookups } = options;
  if (preModalNeg !== null && preModalNeg.chainDepth >= 2) {
    return { ok: false, reason: "chain depth ≥ 2 + conjecture quotative 영역 외" };
  }
  if (preModalNeg?.chainPast === true) {
    return { ok: false, reason: "past negative conjecture quotative 영역 외" };
  }
  let future: string;
  if (preModalNeg !== null) {
    if (preModalNeg.preferShortNegation && options.isVerb) {
      const [prefix, negLemma, negIrregular] = shortNegationPrefix(stemLemma, stemIrregular, lookups);
      future = prefix + conjugate(negLemma, negIrregular, "ㄹ/을");
    } else {
      future = `${conjugate(stemLemma, stemIrregular, "지")} ${conjugate("않다", null, "ㄹ/을")}`;
    }
  } else if (past) {
    future = conjugate(`${conjugate(stemLemma, stemIrregular, "았/었")}다`, null, "ㄹ/을");
  } else {
    future = conjugate(stemLemma, stemIrregular, "ㄹ/을");
  }
  return {
    ok: true,
    text: `${future} 거라고`,
    polite: false
  };
}

function nounCopulaPlainQuoteText(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  particle: ParticleKey = "이라고/라고"
): string | null {
  if (
    preNeg !== null ||
    past ||
    (base.final.kind !== "nounCopula" && base.final.kind !== "boundNounCopula")
  ) {
    return null;
  }
  return `${base.prefix}${base.final.nounSurface}${selectParticle(nounCopulaFinalAllomorphHost(base.final), particle)}`;
}

function composeBaseWithQuotative(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions,
  connective?: ConnectiveOp
): RenderOutcome {
  if (connective?.quoteBoundary?.koreanClauseForm === "다는 말을") {
    const clause = projectBaseCognitiveComplementClause(base, past, false, lookups);
    if (clause !== null) {
      return { ok: true, text: `${clause} 말을`, polite: false };
    }
  }
  const nominalQuote = nounCopulaPlainQuoteText(
    base,
    past,
    preNeg,
    connective?.quoteBoundary?.nominalRoleParticle
  );
  if (nominalQuote !== null) {
    return { ok: true, text: nominalQuote, polite: false };
  }
  const quoteFormal =
    base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture"
      ? formal
      : true;
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    quoteFormal,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  return { ok: true, text: quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) }), polite: false };
}

export function applyQuoteBoundaryFocus(
  rendered: RenderOutcome,
  focusParticle: QuoteBoundaryFocusParticle | VolitionalAttemptFocusParticle | undefined
): RenderOutcome {
  if (!rendered.ok || focusParticle === undefined) {
    return rendered;
  }
  const focus = focusParticle === "でも"
    ? selectParticle(rendered.text, "이라도/라도")
    : focusParticle === "さえ" ? "조차" : focusParticle === "も" ? "도" : "는";
  return {
    ...rendered,
    text: `${rendered.text}${focus}`
  };
}

export function applyRequestComplementQuoteFocus(
  rendered: RenderOutcome,
  connectiveOrSurface: ConnectiveOp | string
): RenderOutcome {
  if (typeof connectiveOrSurface === "string") {
    return rendered;
  }
  const boundary = connectiveOrSurface.quoteBoundary;
  if (boundary === undefined) {
    return rendered;
  }
  return boundary.koreanClauseForm === "달라는 말을"
    ? applyNominalQuoteObjectFocus(rendered, boundary.focusParticle)
    : applyQuoteBoundaryFocus(rendered, boundary.focusParticle);
}

export function applyNominalQuoteObjectFocus(
  rendered: RenderOutcome,
  focusParticle: QuoteBoundaryFocusParticle | undefined
): RenderOutcome {
  if (!rendered.ok || focusParticle === undefined || !rendered.text.endsWith("을")) {
    return rendered;
  }
  const head = rendered.text.slice(0, -"을".length);
  const focus = focusParticle === "でも"
    ? selectParticle(head, "이라도/라도")
    : focusParticle === "も" ? "도" : selectParticle(head, "은/는");
  return {
    ...rendered,
    text: `${head}${focus}`
  };
}

function composeBaseWithCognitiveComplement(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const chainDepth = preNeg?.chainDepth ?? 0;
  const effectivePast = past || (preNeg?.chainPast ?? false);
  const loweredBase = chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : base;
  if (loweredBase === null) {
    return { ok: false, reason: "cognitive complement chain lowering not supported" };
  }
  const clause = projectBaseCognitiveComplementClause(loweredBase, effectivePast, formal, lookups);
  if (clause === null) {
    return { ok: false, reason: "cognitive complement projection not supported" };
  }
  return { ok: true, text: `${clause} ${connective.cognitiveComplementParticle === "topic" ? "것은" : "것을"}`, polite: false };
}

function projectBaseCognitiveComplementClause(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  lookups: LookupTables
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseCognitiveComplementClause(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal, lookups
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = base.final.nounSurface;
    const host = nounCopulaFinalAllomorphHost(base.final);
    if (past) {
      const pastStem = hasBatchim(host) ? `${noun}이었다` : `${noun}였다`;
      return `${base.prefix}${pastStem}는`;
    }
    return `${base.prefix}${noun}${selectParticle(host, "이라는/라는")}`;
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    null,
    past,
    true,
    false,
    lookups
  );
  if (!rendered.ok) {
    return null;
  }
  const text = rendered.text;
  if (text.endsWith("아니다")) {
    return `${text.slice(0, -"아니다".length)}아니라는`;
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return `${stem}${selectParticle(stem, "이라는/라는")}`;
  }
  return `${text}는`;
}

export function composeBaseWithRequestComplement(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions,
  connectiveOrSurface: ConnectiveOp | string = "と"
): RenderOutcome {
  return applyRequestComplementQuoteFocus(
    composeBaseWithRequestComplementBody(base, past, preNeg, options, connectiveOrSurface),
    connectiveOrSurface
  );
}

function composeBaseWithRequestComplementBody(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions,
  connectiveOrSurface: ConnectiveOp | string = "と"
): RenderOutcome {
  const surface = typeof connectiveOrSurface === "string"
    ? connectiveOrSurface
    : connectiveOrSurface.surface;
  const nominalRequest = typeof connectiveOrSurface === "string"
    ? false
    : connectiveOrSurface.quoteBoundary?.koreanClauseForm === "달라는 말을";
  if (surface === "かと" && base.policy?.kind === "benefactive" && base.policy.requestComplementBase !== undefined) {
    return composeBaseWithRequestComplementBody(base.policy.requestComplementBase, false, null, options, connectiveOrSurface);
  }
  if (base.policy?.kind === "desire" && base.policy.requestComplementBase !== undefined) {
    if (base.policy.requestComplementMode === "prohibition") {
      return composeRequestProhibitionComplementBody(base.policy.requestComplementBase, connectiveOrSurface);
    }
    if (preNeg !== null) {
      if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
        return { ok: false, reason: "request complement supports only single non-past negative desire request" };
      }
      return composeRequestProhibitionComplementBody(base.policy.requestComplementBase, connectiveOrSurface);
    }
    return composeBaseWithRequestComplementBody(base.policy.requestComplementBase, false, null, options, connectiveOrSurface);
  }
  if (base.final.kind === "nounCopula") {
    if (past || preNeg !== null) {
      return { ok: false, reason: "noun copula request complement supports only plain non-past" };
    }
    const quoted = nounCopulaConnective(
      base.final.nounSurface,
      "다고",
      false,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return {
      ok: true,
      text: concatPredicatePrefix(
        base.prefix,
        nominalRequest ? `${quoted.slice(0, -"고".length)}는 말을` : quoted
      ),
      polite: false
    };
  }
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "request complement on non-lemma base not supported" };
  }
  if (past) {
    return { ok: false, reason: "past + request complement not supported" };
  }
  const effectivePreNeg = surface === "かと" && preNeg?.chainDepth === 1 && !preNeg.chainPast
    ? null
    : preNeg;
  if (effectivePreNeg !== null) {
    if (effectivePreNeg.chainDepth !== 1 || effectivePreNeg.chainPast) {
      return { ok: false, reason: "request complement supports only single non-past negative request" };
    }
    const head = conjugate(base.final.lemma, base.final.irregular, "지");
    return {
      ok: true,
      text: `${base.prefix}${head} 말아 ${nominalRequest ? "달라는 말을" : "달라고"}`,
      polite: false
    };
  }
  const lowered = applyNegationChainToLemmaBase(base, effectivePreNeg, options);
  if (lowered === null || lowered.final.kind !== "lemma") {
    return { ok: false, reason: "request complement lowering not supported" };
  }
  const head = conjugate(lowered.final.lemma, lowered.final.irregular, "아/어");
  const requestBody = nominalRequest
    ? normalizeRequestQuoteNominal(head, lowered.final.lemma)
    : normalizeRequestQuotative(head, lowered.final.lemma);
  return {
    ok: true,
    text: concatPredicatePrefix(lowered.prefix, requestBody),
    polite: false
  };
}

export interface RequestAttributiveQuoteTraceContext {
  readonly chainSourceTrace?: ChainSourceTrace;
  readonly stemTokens?: readonly RuntimeHaruToken[];
  readonly commandTokens?: readonly RuntimeHaruToken[];
  readonly requestTokens: readonly RuntimeHaruToken[];
  readonly carrierTokens: readonly RuntimeHaruToken[];
}

export function composeBaseWithRequestAttributiveQuote(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions & {
    readonly trace?: RequestAttributiveQuoteTraceContext;
  }
): RenderOutcome {
  if (base.policy?.kind === "desire" && base.policy.requestComplementBase !== undefined) {
    if (base.policy.requestComplementMode === "prohibition") {
      return composeRequestProhibitionAttributiveQuote(base.policy.requestComplementBase);
    }
    if (preNeg !== null) {
      if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
        return { ok: false, reason: "request attributive quote supports only single non-past negative desire request" };
      }
      return composeRequestProhibitionAttributiveQuote(base.policy.requestComplementBase);
    }
    return composeBaseWithRequestAttributiveQuote(base.policy.requestComplementBase, false, null, options);
  }
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "request attributive quote on non-lemma base not supported" };
  }
  if (past) {
    return { ok: false, reason: "past + request attributive quote not supported" };
  }
  if (preNeg !== null) {
    if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
      return { ok: false, reason: "request attributive quote supports only single non-past negative request" };
    }
    const head = conjugate(base.final.lemma, base.final.irregular, "지");
    return {
      ok: true,
      text: `${base.prefix}${head} 말아 달라는`,
      polite: false
    };
  }
  const lowered = applyNegationChainToLemmaBase(base, null, options);
  if (lowered === null || lowered.final.kind !== "lemma") {
    return { ok: false, reason: "request attributive quote lowering not supported" };
  }
  const head = conjugate(lowered.final.lemma, lowered.final.irregular, "아/어");
  const mainText = concatPredicatePrefix(lowered.prefix, head);
  const trace = options.trace;
  if (trace === undefined) {
    const recipe = requestQuoteAttributiveRecipe(mainText, lowered.final.lemma);
    return { ok: true, text: recipe.text, polite: false };
  }
  type TraceMetadata = Omit<TailTraceSegment, "text" | "sourceTokens">;
  const commandPrefix = (trace.chainSourceTrace?.prefixSegments ?? []).map((segment) => {
    const { text, sourceTokens, ...metadata } = segment;
    return { text, sources: sourceTokens, metadata };
  });
  const commandFinalSources = trace.chainSourceTrace?.finalSourceTokens ?? trace.stemTokens ?? [];
  const commandFinalMetadata: TraceMetadata = trace.chainSourceTrace === undefined
    ? { kind: "lexeme", projectionConfidence: "semantic" }
    : { kind: trace.chainSourceTrace.finalKind, projectionConfidence: "semantic" };
  const commandTokens = trace.commandTokens ?? [
    ...commandPrefix.flatMap(({ sources }) => sources),
    ...commandFinalSources
  ];
  const recipe = requestQuoteAttributiveRecipe<RuntimeHaruToken, TraceMetadata>(
    mainText,
    lowered.final.lemma,
    {
      commandSources: commandTokens,
      commandPrefix,
      commandFinalSources,
      commandFinalMetadata,
      requestSources: trace.requestTokens,
      carrierSources: trace.carrierTokens
    }
  );
  const predicateTrace: readonly TailTraceSegment[] = recipe.predicate.segments.map((segment) => ({
    ...segment.metadata,
    text: segment.text,
    sourceTokens: segment.sources
  }));
  return {
    ok: true,
    text: recipe.text,
    polite: false,
    traced: tracedCat(
      predicateTrace,
      tracedSeg(recipe.request.text, recipe.request.sources, "aux", "semantic"),
      tracedSeg(recipe.carrier.text, recipe.carrier.sources, "connective", "semantic")
    )
  };
}

export function isRequestComplementLikeConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "request_complement" ||
    connective.quoteBoundary?.koreanClauseForm === "달라고" ||
    connective.quoteBoundary?.koreanClauseForm === "달라는 말을";
}

export function composeRequestProhibitionComplement(
  base: KoreanPredicateBase,
  connectiveOrSurface: ConnectiveOp | string,
  options: { readonly requestForm?: boolean; readonly complementizer?: string } = {}
): RenderOutcome {
  return applyRequestComplementQuoteFocus(
    composeRequestProhibitionComplementBody(base, connectiveOrSurface, options),
    connectiveOrSurface
  );
}

function composeRequestProhibitionComplementBody(
  base: KoreanPredicateBase,
  connectiveOrSurface: ConnectiveOp | string,
  options: { readonly requestForm?: boolean; readonly complementizer?: string } = {}
): RenderOutcome {
  const nominalRequest = typeof connectiveOrSurface === "string"
    ? false
    : connectiveOrSurface.quoteBoundary?.koreanClauseForm === "달라는 말을";
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition request complement on non-lemma base not supported" };
  }
  const head = conjugate(base.final.lemma, base.final.irregular, "지");
  const requestForm = options.requestForm !== false;
  const body = requestForm
    ? `${head} 말아 ${nominalRequest ? "달라는 말을" : "달라고"}`
    : `${head} ${nominalRequest ? "말라는 말을" : `말라${options.complementizer ?? "고"}`}`;
  return {
    ok: true,
    text: concatPredicatePrefix(base.prefix, body),
    polite: false
  };
}

export interface ProhibitionQuoteTraceContext {
  readonly stemTokens: readonly RuntimeHaruToken[];
  readonly negativeTokens: readonly RuntimeHaruToken[];
  readonly bridgeTokens: readonly RuntimeHaruToken[];
  readonly requestTailTokens: readonly RuntimeHaruToken[];
  readonly carrierTokens: readonly RuntimeHaruToken[];
}

export function composeRequestProhibitionAttributiveQuote(
  base: KoreanPredicateBase,
  options: { readonly requestForm?: boolean; readonly trace?: ProhibitionQuoteTraceContext } = {}
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition request attributive quote on non-lemma base not supported" };
  }
  const head = conjugate(base.final.lemma, base.final.irregular, "지");
  const requestForm = options.requestForm !== false;
  const text = concatPredicatePrefix(base.prefix, requestForm ? `${head} 말아 달라는` : `${head} 말라는`);
  if (options.trace !== undefined && base.prefix.length === 0) {
    const trace = options.trace;
    return {
      ok: true,
      text,
      polite: false,
      traced: tracedCat(
        tracedSeg(head, [...trace.stemTokens, ...trace.negativeTokens], "lexeme", "semantic"),
        tracedSeg(requestForm ? " 말아" : " 말", trace.bridgeTokens, "aux", "semantic"),
        requestForm ? tracedSeg(" 달", trace.requestTailTokens, "aux", "semantic") : [],
        tracedSeg("라는", trace.carrierTokens, "connective", "semantic")
      )
    };
  }
  return { ok: true, text, polite: false };
}

function composeBaseWithReformulation(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const nominalQuote = nounCopulaPlainQuoteText(base, past, preNeg);
  if (nominalQuote !== null) {
    const nominalText = quotedDeclarativeToReformulation(nominalQuote);
    return { ok: true, text: `${nominalText}${connectiveFocusParticleSuffix(connective.surface, nominalText)}`, polite: false };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  const text = quotedDeclarativeToReformulation(
    quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) })
  );
  return { ok: true, text: `${text}${connectiveFocusParticleSuffix(connective.surface, text)}`, polite: false };
}

function composeBaseWithQuotedConcessive(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const suffix = quotedConcessiveSuffix(connective.surface);
  if (suffix === null) {
    return { ok: false, reason: `quoted concessive surface '${connective.surface}' not mapped` };
  }
  if (!past && preNeg === null && base.policy?.kind === "quoted_proposition") {
    return { ok: true, text: `${base.prefix.trimEnd()}${suffix}`, polite: false };
  }
  const quoted = composeBaseWithQuotative(base, past, preNeg, formal, lookups, options);
  if (!quoted.ok) {
    return quoted;
  }
  return { ok: true, text: `${quoted.text}${suffix}`, polite: false };
}

function composeBaseWithNiShiteMoEvenIf(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const quoted = composeBaseWithQuotative(base, past, preNeg, formal, lookups, options);
  if (!quoted.ok) {
    return quoted;
  }
  return { ok: true, text: `${quoted.text} 해도`, polite: false };
}

function quotedConcessiveSuffix(surface: string): string | null {
  if (surface.startsWith("から")) {
    return " 해서";
  }
  if (surface.includes("ないまでも") || surface.includes("ぬまでも") || surface.includes("んまでも")) {
    return "까지는 말하지 않더라도";
  }
  if (surface.includes("ものの")) {
    return "는 하지만";
  }
  if (surface.includes("は")) {
    return "는 해도";
  }
  if (surface.includes("ても")) {
    return " 해도";
  }
  return null;
}

function composeBaseWithRetrospectiveQuotative(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  if (
    connective.retrospectiveQuotativeFlavor === "question_retrospective" &&
    preNeg === null &&
    isNounCopulaProjectableBase(base)
  ) {
    return {
      ok: true,
      text: `${composeNounCopulaConjectureQuestion(base, past, formal, false)} 싶더니`,
      polite: false
    };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  const quote = quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) });
  if (connective.retrospectiveQuotativeFlavor === "question_retrospective") {
    return { ok: true, text: quotedDeclarativeToChangeOfState(quote), polite: false };
  }
  if (connective.retrospectiveQuotativeFlavor === "direct_thought") {
    return { ok: true, text: `${quote} 생각했더니`, polite: false };
  }
  return { ok: false, reason: "retrospective quotative flavor is missing" };
}

function composeBaseWithQuestionReformulation(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  if (!past && preNeg === null && base.final.kind === "nounCopula" && base.final.adverbialNominalFallback === true) {
    const adverbial = `${base.final.nounSurface}${selectParticle(nounCopulaFinalAllomorphHost(base.final), "이라/라")}`;
    return { ok: true, text: `${base.prefix}${adverbial} 하면`, polite: false };
  }
  const chainDepth = preNeg?.chainDepth ?? 0;
  const questionBase = chainDepth === 0
    ? base
    : applyExternalNegationDepthToPredicateBase(base, chainDepth, true, negationLoweringOptionsWithOpFocus(preNeg, options));
  if (questionBase === null) {
    return { ok: false, reason: "question reformulation chain lowering not supported" };
  }
  const question = composePlainSelfQuestionTerminal(questionBase, past || (preNeg?.chainPast ?? false), lookups);
  return { ok: true, text: `${question} 하면`, polite: false };
}

function composeBaseWithWishComplement(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const chainDepth = preNeg?.chainDepth ?? 0;
  const effectivePast = past || (preNeg?.chainPast ?? false);
  const loweredBase = chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : base;
  if (loweredBase === null) {
    return { ok: false, reason: "wish complement chain lowering not supported" };
  }
  const nominalized = projectBaseNominalized(loweredBase, effectivePast, formal);
  if (nominalized === null) {
    return { ok: false, reason: "wish complement nominalization not supported" };
  }
  return {
    ok: true,
    text: `${nominalized}${selectParticle(nominalized, "을/를")}`,
    polite: false
  };
}

export function projectBaseNominalized(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseNominalized(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = base.final.nounSurface;
    if (past) {
      const stem = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) ? `${noun}이었` : `${noun}였`;
      return `${base.prefix}${stem}기`;
    }
    return `${base.prefix}${noun}이기`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}기`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "기")}`;
}

function quotedDeclarativeToReformulation(text: string): string {
  return text.endsWith("고") ? `${text.slice(0, -1)}기보다` : `${text}기보다`;
}

function isNounCopulaProjectableBase(
  base: KoreanPredicateBase
): base is NounCopulaPredicateBase {
  return base.final.kind === "nounCopula" || base.final.kind === "negativeNounCopula";
}

function quotedDeclarativeToChangeOfState(text: string): string {
  return text.endsWith("고") ? `${text.slice(0, -1)} 싶더니` : `${text} 싶더니`;
}

export function composeNounCopulaConnective(
  prefix: string,
  nounSurface: string,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  formal: boolean,
  preservesSourcePoliteness = false,
  allomorphHost: string | undefined,
  copulaFusedSurface: string | undefined
): RenderOutcome {
  const host = allomorphHost ?? nounSurface;
  const politeSuffix = isPolite && !(formal && connective.connective === "adversative") ? "요" : "";
  const connectiveSurface = connectiveRenderSurface(connective);
  if (connective.connective === "quoted_concessive") {
    const quote = past
      ? `${nounPastCopulaStem(nounSurface, allomorphHost)}다고`
      : `${nounSurface}${selectParticle(host, "이라고/라고")}`;
    const suffix = quotedConcessiveSuffix(connective.surface);
    if (suffix === null) {
      return { ok: false, reason: `quoted concessive surface '${connective.surface}' not mapped` };
    }
    return { ok: true, text: `${prefix}${quote}${suffix}${politeSuffix}`, polite: isPolite };
  }
  if (!past && connective.surface === "であり") {
    return { ok: true, text: `${prefix}${nounSurface}이며${politeSuffix}`, polite: isPolite };
  }
  if (!past && (connective.surface === "でありながら" || connective.surface === "ながら" || connective.surface === "ながらも")) {
    return { ok: true, text: `${prefix}${nounSurface}이면서도${politeSuffix}`, polite: isPolite };
  }
  if (connective.surface === "のか" || connective.surface === "んか") {
    if (past) {
      return { ok: true, text: `${prefix}${nounPastCopulaStem(nounSurface, allomorphHost)}는지${politeSuffix}`, polite: isPolite };
    }
    return { ok: true, text: `${prefix}${nounSurface}인지${politeSuffix}`, polite: isPolite };
  }
  if (connective.surface === "のに") {
    if (past) {
      return { ok: true, text: `${prefix}${nounPastCopulaStem(nounSurface, allomorphHost)}는데${politeSuffix}`, polite: isPolite };
    }
    const contractionSurface = copulaFusedSurface ?? nounSurface;
    const lastChar = contractionSurface.slice(-1);
    const contractible = !formal && !hasAllomorphBatchim(host) && hasNoCoda(lastChar);
    if (contractible) {
      const newLast = addCoda(lastChar, "ㄴ");
      return { ok: true, text: `${prefix}${contractionSurface.slice(0, -1)}${newLast}데${politeSuffix}`, polite: isPolite };
    }
    return { ok: true, text: `${prefix}${nounSurface}인데${politeSuffix}`, polite: isPolite };
  }
  if (connective.surface === "にもかかわらず") {
    if (past) {
      return { ok: true, text: `${prefix}${nounPastCopulaStem(nounSurface, allomorphHost)}는데도${politeSuffix}`, polite: isPolite };
    }
    return { ok: true, text: `${prefix}${nounCopulaConnective(nounSurface, "는데", false, allomorphHost)}도${politeSuffix}`, polite: isPolite };
  }
  if (past) {
    if (
      preservesSourcePoliteness &&
      isPolite &&
      formal &&
      isAdversativeConnectiveSurface(connective.surface)
    ) {
      return { ok: true, text: `${prefix}${nounToCopulaForm(nounSurface, true, true, true, false, allomorphHost)}만`, polite: true };
    }
    if (
      preservesSourcePoliteness &&
      isPolite &&
      formal &&
      (connective.surface === "から" || connective.surface === "ので")
    ) {
      return { ok: true, text: `${prefix}${nounPastCopulaStem(nounSurface, allomorphHost)}으니까`, polite: true };
    }
    const pastStem = nounPastCopulaStem(nounSurface, allomorphHost);
    if (connectiveSurface === "なら" || connectiveSurface === "たら" || connectiveSurface === "だら") {
      return { ok: true, text: `${prefix}${pastStem}다면${politeSuffix}`, polite: isPolite };
    }
    if (connective.surface === "から" || connective.surface === "ので") {
      return { ok: true, text: `${prefix}${pastStem}으니까${politeSuffix}`, polite: isPolite };
    }
    const ending = resolveConnectiveEnding(connectiveSurface, true                          , false);
    if (ending === null) {
      return { ok: false, reason: `connective surface '${connective.surface}' not yet mapped (past)` };
    }
    if (ending.pastViaEnding) {
      return {
        ok: true,
        text: `${prefix}${nounCopulaConnective(nounSurface, ending.ending, true, allomorphHost)}${ending.suffixText ?? ""}${politeSuffix}`,
        polite: isPolite
      };
    }
    const tailFull = conjugate("있다", null, ending.ending);
    const tailEnding = tailFull.startsWith("있") ? tailFull.slice(1) : tailFull;
    return {
      ok: true,
      text: `${prefix}${pastStem}${tailEnding}${ending.suffixText ?? ""}${politeSuffix}`,
      polite: isPolite
    };
  }
  if (
    preservesSourcePoliteness &&
    isPolite &&
    formal &&
    isAdversativeConnectiveSurface(connective.surface)
  ) {
    return { ok: true, text: `${prefix}${nounToCopulaForm(nounSurface, true, true, false, false, allomorphHost)}만`, polite: true };
  }
  if (
    preservesSourcePoliteness &&
    isPolite &&
    formal &&
    (connective.surface === "から" || connective.surface === "ので")
  ) {
    return { ok: true, text: `${prefix}${nounSurface}${selectParticle(host, "이니까/니까")}`, polite: true };
  }
  const connectiveRule = CONNECTIVE_RENDER_MAP.get(connectiveSurface);
  const particleKey = connectiveRule?.copulaParticleKey;
  if (particleKey === undefined) {
    const ending = resolveConnectiveEnding(connectiveSurface, false, false);
    if (ending !== null && ending.pastViaEnding) {
      const nounText = nounCopulaConnective(nounSurface, ending.ending, false, allomorphHost);
      if (nounText !== nounSurface) {
        return { ok: true, text: `${prefix}${nounText}${ending.suffixText ?? ""}${politeSuffix}`, polite: isPolite };
      }
    }
    return { ok: false, reason: `noun copula + connective '${connective.surface}' 영역 외 (PARTICLE_PAIRS 미등록)` };
  }
  const particle = selectParticle(host, particleKey);
  return {
    ok: true,
    text: `${prefix}${nounSurface}${particle}${connectiveRule?.suffixText ?? ""}${politeSuffix}`,
    polite: isPolite
  };
}

function resolveConnectiveEnding(
  surface: string,
  isVerb: boolean,
  past: boolean
): { ending: string; pastViaEnding: boolean; suffixText?: string } | null {
  const rule = CONNECTIVE_RENDER_MAP.get(surface);
  if (rule === undefined) return null;
  if (rule.pastBehavior === "ignore" || rule.pastBehavior === "natural") {
    const ending = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
    return { ending, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
  }
  if (past) {
    const adjPast = !isVerb ? (rule.adjPastEnding ?? rule.pastEnding) : rule.pastEnding;
    if (adjPast !== undefined) {
      return { ending: adjPast, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
    }
    const baseAdj = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
    return { ending: baseAdj, pastViaEnding: false, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
  }
  const ending = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
  return { ending, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
}

function connectiveRenderSurface(connective: ConnectiveOp): string {
  if (connective.source.tokens.some(isConditionalNaraAuxToken)) {
    return "なら";
  }
  if (connective.source.tokens.some((token) => isPastAuxConditionalForm(token.pos))) {
    return canonicalMedialProlongationConnectiveSurface(connective.surface);
  }
  return connective.surface;
}

function isConditionalNaraAuxToken(token: RuntimeHaruToken): boolean {
  return token.dictionaryForm === "だ" &&
    token.reading === "ナラ" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_);
}

export type ConditionalQuoteEllipsisMood = "wish" | "sufficiency";

export const CONDITIONAL_QUOTE_ELLIPSIS_PREDICATE = {
  wish: { lemma: "좋겠다", declarative: "좋겠다" },
  sufficiency: { lemma: "되다", declarative: "된다" }
} as const;

export function composeConditionalQuoteEllipsisAttributive(
  renderedConditional: RenderOutcome,
  mood: ConditionalQuoteEllipsisMood,
  requiresFutureAttributive: boolean
): RenderOutcome {
  if (!renderedConditional.ok) {
    return renderedConditional;
  }
  const predicate = CONDITIONAL_QUOTE_ELLIPSIS_PREDICATE[mood];
  return {
    ...renderedConditional,
    text: `${renderedConditional.text} ${requiresFutureAttributive
      ? conjugate(predicate.lemma, null, "ㄹ/을")
      : plainDeclarativeToPointAttributive(predicate.declarative)}`,
    polite: false
  };
}
