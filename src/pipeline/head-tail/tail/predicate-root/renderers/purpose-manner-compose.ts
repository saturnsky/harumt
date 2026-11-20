import { conjugate } from "../../../../../generator/conjugator.js";
import type { NegationOp } from "../grammar.js";
import type { KoreanPredicateBase, NegationLoweringOptions, RenderOutcome } from "./base-model.js";
import { lowerBaseForPredicateProjection } from "./base-support.js";
import { projectBaseAttributive } from "./predicate-base-projection.js";

export function composeBaseWithYouNiPurpose(
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

export function composeBaseWithNiwaIntentionalPurpose(
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

export function composeBaseWithPurposeMotion(
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

export function composeBaseWithYouNiMannerSimile(
  base: KoreanPredicateBase, past: boolean, isPolite: boolean,
  preNeg: NegationOp | null, formal: boolean, options: NegationLoweringOptions
): RenderOutcome {
  return composeBaseWithYouNiAttributiveSuffix(base, past, isPolite, preNeg, formal, options, "것처럼", "manner/simile");
}

export function composeBaseWithYouNiMannerVolitional(
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

export function composeBaseWithYouNiMannerSimileAction(
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
