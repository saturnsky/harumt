import { conjugate } from "../../../../../generator/conjugator.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { nounPastCopulaStem, selectParticle } from "../../../../../generator/particles.js";
import type { AuxLayerNode } from "../grammar.js";
import { isFutureAttributiveProjection, closeChainTraceAgainstText, rebindChainTraceForProjection, type AttributivePastProjection, type AttributiveProjectionPolicy, type BaseResult, type KoreanPredicateBase, type NegativeAttributiveProjection, nounCopulaFinalAllomorphHost, nounCopulaRealizedAllomorphHost, predicateBasePolicyAllomorphHost, type RenderOutcome } from "./base-model.js";
import { completionPotentialCompletedBase, isBenefactiveNegativeCarrierPolicy, negativeNounCopulaChainBase } from "./base-support.js";
import { predicateMoodRequestsFutureProjection } from "../attributive-head-policy.js";
import { isHeadOp } from "../operator-head.js";

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
