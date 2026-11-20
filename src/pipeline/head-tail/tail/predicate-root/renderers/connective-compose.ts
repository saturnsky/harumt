import { composeTerminalMoodOnBase } from "./sfp-question.js";
import { quoteProjectionForSfpEffect } from "../../../../semantics/sfp-quote-projection.js";
import { nounCopulaConnective, shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate } from "../../../../../generator/conjugator.js";
import { isNiSeriesConcessiveConditionalSurface } from "../connective-surface-table.js";

import { addCoda, hasBatchim, hasNoCoda } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim, nounPastCopulaStem, selectParticle } from "../../../../../generator/particles.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { CONNECTIVE_RENDER_MAP, isAdversativeConnectiveSurface } from "../connective-render-table.js";
import { quotedMoodForClosingSfpEffect, type ConnectiveOp, type CopulaOp, type NegationOp, type TeFormConnectiveRole, DEFAULT_RENYOU_CHUUSHI_ROLE, DEFAULT_TE_FORM_ROLE, RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE } from "../grammar.js";
import { applyNegationChainToLemmaBase, closeChainTraceAgainstText, closeChainTraceWithConnectivePieces, closeChainTraceWithFinalConnectiveAgainstTerminal, concatPredicatePrefix, rebindChainFinalPlaceholders, rebindChainTraceForProjection, tracedCat, tracedChainFinalPlaceholder, tracedSeg, type BaseResult, type ChainSourceTrace, type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, nounCopulaFinalAllomorphHost, type RenderOutcome, baseResultWithNegationFocus } from "./base-model.js";
import { applyConnectivePrefixContraction, applyExternalNegationDepthToPredicateBase, applyTerminalPrefixContraction, completionPotentialCompletedBase, finalNegationLoweringForcesPast, lowerBaseForPredicateProjection, lowerBaseKeepingFinal, lowerFinalNegationForCommittedBase, negativeNounCopulaChainBase, nounCopulaBaseForCopula, predicateBaseInfinitiveForm } from "./base-support.js";
import { nounToCopulaForm, obligationEmphasis, renderBaseVolitionalTerminal } from "./final-forms.js";
import { loadTailAttachmentRegistry, nominalFrameDataGeneration } from "../../../head/adapters/nominal/frame-table.js";
import { boundNominalReasonQuoteCarrierAt } from "../matchers/bound-nominal-connective.js";
import { createConnectiveOp } from "../op-builders.js";
import { projectBaseFutureAttributive, projectBaseAttributive, projectBaseMNominalized, projectBaseReasonGerund, plainDeclarativeToPointAttributive, projectBaseNominalized } from "./predicate-base-projection.js";
import { composeBaseWithImperativeQuotative, composeBaseWithPredicateProjectionQuoteAttributive, connectiveFocusParticleSuffix, composeBaseWithQuotative, applyQuoteBoundaryFocus, composeBaseWithCognitiveComplement, composeBaseWithRequestComplement, composeRequestProhibitionComplement, composeRequestProhibitionAttributiveQuote, composeBaseWithReformulation, composeBaseWithRetrospectiveQuotative, composeBaseWithQuestionReformulation, composeBaseWithWishComplement } from "./quote-complement-compose.js";
import { composeNominalizedConjectureConnective } from "./conjecture-compose.js";
import { composeBaseWithTerminalChain, attachCommittedChainTrace, composeCommittedTailTerminal } from "./predicate-terminal-compose.js";
import { composeBaseWithYouNiPurpose, composeBaseWithNiwaIntentionalPurpose, composeBaseWithPurposeMotion, composeBaseWithYouNiMannerSimile, composeBaseWithYouNiMannerVolitional, appearanceAdverbialLexicalizationApplies, composeBaseWithYouNiMannerSimileAction } from "./purpose-manner-compose.js";
import { resolveConnectiveEnding, connectiveRenderSurface } from "./connective-ending.js";

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

function copulaFusedHostSurface(nounSurface: string, lookups: LookupTables): string | undefined {
  return lookups.COPULA_FUSED_BOUND_NOUNS.get(nounSurface);
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
  const args: ConnectiveComposeArgs = { base, connective, past, isPolite, preNeg, formal, lookups, options };
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
    return composeTeFormConnective(args);
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
  const shortNegationQuestion = composeShortNegationQuestionContent(args);
  if (shortNegationQuestion !== NOT_COMPOSED) {
    return shortNegationQuestion;
  }
  const ruleTableComposed = composeByConnectiveRuleTable(args);
  if (ruleTableComposed !== NOT_COMPOSED) {
    return ruleTableComposed;
  }
  const dedicatedKindComposed = composeByDedicatedConnectiveKind(args);
  if (dedicatedKindComposed !== NOT_COMPOSED) {
    return dedicatedKindComposed;
  }
  const chainDepth = preNeg?.chainDepth ?? 0;
  const dedicatedProjectionComposed = composeByDedicatedProjectionConnectiveKind(args);
  if (dedicatedProjectionComposed !== NOT_COMPOSED) {
    return dedicatedProjectionComposed;
  }
  const negativeNounCopulaComposed = composeNegativeNounCopulaFinalConnective(args, chainDepth);
  if (negativeNounCopulaComposed !== NOT_COMPOSED) {
    return negativeNounCopulaComposed;
  }
  const nounCopulaComposed = composeNounCopulaFinalConnective(args, chainDepth);
  if (nounCopulaComposed !== NOT_COMPOSED) {
    return nounCopulaComposed;
  }
  const boundNounCopulaComposed = composeBoundNounCopulaFinalConnective(args, chainDepth);
  if (boundNounCopulaComposed !== NOT_COMPOSED) {
    return boundNounCopulaComposed;
  }
  return composeLemmaBaseConnective(args, chainDepth);
}

interface ConnectiveComposeArgs {
  readonly base: KoreanPredicateBase;
  readonly connective: ConnectiveOp;
  readonly past: boolean;
  readonly isPolite: boolean;
  readonly preNeg: NegationOp | null;
  readonly formal: boolean;
  readonly lookups: LookupTables;
  readonly options: NegationLoweringOptions;
}

const NOT_COMPOSED: unique symbol = Symbol("connective compose: not applicable");

function composeTeFormConnective(args: ConnectiveComposeArgs): RenderOutcome {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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

function composeShortNegationQuestionContent(args: ConnectiveComposeArgs): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, lookups } = args;
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
  return NOT_COMPOSED;
}

function composeByConnectiveRuleTable(args: ConnectiveComposeArgs): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, options } = args;
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
  return NOT_COMPOSED;
}

function composeByDedicatedConnectiveKind(args: ConnectiveComposeArgs): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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
  return NOT_COMPOSED;
}

function composeByDedicatedProjectionConnectiveKind(args: ConnectiveComposeArgs): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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
  return NOT_COMPOSED;
}

function composeNegativeNounCopulaFinalConnective(args: ConnectiveComposeArgs, chainDepth: number): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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
  return NOT_COMPOSED;
}

function composeNounCopulaFinalConnective(args: ConnectiveComposeArgs, chainDepth: number): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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
  return NOT_COMPOSED;
}

function composeBoundNounCopulaFinalConnective(args: ConnectiveComposeArgs, chainDepth: number): RenderOutcome | typeof NOT_COMPOSED {
  const { base, connective, past, isPolite, preNeg, formal, lookups, options } = args;
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
  return NOT_COMPOSED;
}

function composeLemmaBaseConnective(args: ConnectiveComposeArgs, chainDepth: number): RenderOutcome {
  const { base, connective, past, isPolite, preNeg, formal, options } = args;
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
