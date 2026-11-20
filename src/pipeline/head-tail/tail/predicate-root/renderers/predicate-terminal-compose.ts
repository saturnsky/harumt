import { composeCommittedTailDiscursiveSfp } from "./sfp-question.js";
import { nounCopulaConnective } from "../../../../../generator/aux-map.js";
import { conjugate } from "../../../../../generator/conjugator.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { normalizeGiveRequest } from "../../../../rendering/request-normalization.js";
import type { NegationOp } from "../grammar.js";
import { closeChainTraceAgainstText, concatPredicatePrefix, rebindChainFinalPlaceholders, type BaseResult, type ChainSourceTrace, type KoreanFinalForm, type KoreanPredicateBase, type NegationLoweringOptions, type RenderOutcome, baseResultWithNegationFocus, negationLoweringOptionsWithOpFocus } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, applyTerminalPrefixContraction, completionPotentialCompletedBase, finalNegationLoweringForcesPast, lowerFinalNegationDepthForCommittedBase, negativeNounCopulaChainBase } from "./base-support.js";
import { composeAniForm, composeDoublePastFinalForm, composeFinalForm, conjectureFinalForm, nounToCopulaForm } from "./final-forms.js";
import { composeNominalizedConjectureTerminal } from "./conjecture-compose.js";

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
