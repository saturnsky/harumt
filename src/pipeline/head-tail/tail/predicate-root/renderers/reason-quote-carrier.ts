import { respectKoreanPredicateLemma } from "../../../../../generator/honorific.js";
import { selectParticle } from "../../../../../generator/particles.js";
import type { AuxLayerNode, TailRoot } from "../grammar.js";
import type { IrregularType } from "../../../../../generator/conjugator.js";
import { headRequiresFutureAttributiveProjection } from "../attributive-head-policy.js";
import { nounCopulaPolarityBaseForCopula, nounCopulaStemAllomorphHost, simpleStemBase } from "./base-support.js";
import type { RenderContext, RenderOutcome } from "./base-model.js";
import { projectBaseReasonGerund } from "./predicate-base-projection.js";

function reasonQuoteAttributiveTail(layer: AuxLayerNode): string {
  return headRequiresFutureAttributiveProjection(layer) ? "때문이라고 할" : "때문이라는";
}
export function composeNounCopulaReasonQuoteCarrier(
  root: TailRoot,
  ctx: RenderContext,
): RenderOutcome {
  if (root.tail.kind !== "auxLayer" || root.tail.stem.kind !== "noun") {
    return { ok: false, reason: "noun copula reason quote carrier requires committed noun stem" };
  }
  const [copula, reason, carrier, ...rest] = root.tail.ops;
  if (
    copula?.kind !== "copula" ||
    copula.variant !== "basic" ||
    copula.polarity !== "affirmative" ||
    reason?.kind !== "connective" ||
    reason.connective !== "reason" ||
    carrier?.kind !== "predicateQuoteCarrier" ||
    carrier.style !== "compact_toiu" ||
    (carrier.surface !== "という" && carrier.surface !== "っていう") ||
    rest.length > 0
  ) {
    return { ok: false, reason: "noun copula reason quote carrier lost canonical registry shape" };
  }
  const noun = root.tail.stem.lemma;
  const nominalizer = root.tail.terminal === "nominalized" ? " 것" : "";
  const honorificGerund = copula.honorific === true
    ? projectBaseReasonGerund(
      nounCopulaPolarityBaseForCopula(copula, noun, 0, nounCopulaStemAllomorphHost(root.tail.stem, ctx, noun)),
      false,
      ctx.formal
    )
    : null;
  if (copula.honorific === true && honorificGerund === null) {
    return { ok: false, reason: "honorific noun copula reason quote gerund projection failed" };
  }
  return {
    ok: true,
    text: `${root.tail.stem.koreanPrefix ?? ""}${honorificGerund ?? `${noun}${selectParticle(nounCopulaStemAllomorphHost(root.tail.stem, ctx, noun) ?? noun, "이기/기")}`} ${reasonQuoteAttributiveTail(root.tail)}${nominalizer}`,
    polite: false,
    stemPrefixApplied: true,
  };
}

export function composeWrappedCopulaReasonQuoteCarrier(
  root: TailRoot,
  ctx: RenderContext,
): RenderOutcome {
  const formal = ctx.formal;
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "wrapped copula reason quote carrier requires aux layer" };
  }
  const layer = root.tail;
  const copula = layer.ops[0];
  const reasonIndex = layer.ops.length - 2;
  const reason = layer.ops[reasonIndex];
  const carrier = layer.ops[reasonIndex + 1];
  if (copula?.kind !== "copula" || reason?.kind !== "connective" ||
    reason.connective !== "reason" || reason.surface !== "から" ||
    carrier?.kind !== "predicateQuoteCarrier" || carrier.style !== "compact_toiu" ||
    (carrier.surface !== "という" && carrier.surface !== "っていう")) {
    return { ok: false, reason: "wrapped copula reason quote carrier lost registry shape" };
  }
  const wrappers = layer.ops.slice(1, reasonIndex);
  const past = wrappers.some((op) => op.kind === "tense" && op.tense === "past");
  const respectedStemLemma = (lemma: string, irregular: IrregularType | null): string =>
    copula.honorific === true
      ? respectKoreanPredicateLemma(
        lemma,
        irregular,
        ctx.lookups.KOREAN_HONORIFIC_PREDICATE_LEMMAS,
        ctx.lookups.KOREAN_REALIZED_HONORIFIC_PREDICATE_LEMMAS
      ) ?? lemma
      : lemma;
  const base = layer.stem.kind === "noun"
    ? nounCopulaPolarityBaseForCopula(copula, layer.stem.lemma, 0)
    : layer.stem.kind === "adj" && copula.polarity === "affirmative"
      ? simpleStemBase(respectedStemLemma(layer.stem.lemma, layer.stem.irregular), layer.stem.irregular, false)
      : layer.stem.kind === "verb" && copula.polarity === "affirmative" &&
          layer.stem.sourcePredicateShape === "na_adjective"
        ? simpleStemBase(respectedStemLemma(layer.stem.lemma, layer.stem.irregular), layer.stem.irregular, true)
      : null;
  if (base === null) {
    return { ok: false, reason: "wrapped copula reason quote carrier requires committed noun/adj stem" };
  }
  const gerund = projectBaseReasonGerund(base, past, formal);
  if (gerund === null) {
    return { ok: false, reason: "wrapped copula reason quote carrier gerund projection failed" };
  }
  return {
    ok: true,
    text: `${layer.stem.koreanPrefix ?? ""}${gerund} ${reasonQuoteAttributiveTail(layer)}${layer.terminal === "nominalized" ? " 것" : ""}`,
    polite: false,
    stemPrefixApplied: true,
  };
}
