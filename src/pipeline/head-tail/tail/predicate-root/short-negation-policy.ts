import type { AuxOpNode, ShortNegationPolicy } from "./grammar.js";

export function shortNegationPolicyForTranslation(
  lemma: string,
  options: {
    readonly stemKind: "verb" | "adj" | "noun";
    readonly explicitPolicy?: ShortNegationPolicy;
    readonly dropFirstCausativeAux?: boolean;
  }
): ShortNegationPolicy | undefined {
  if (options.stemKind !== "verb") {
    return undefined;
  }
  if (options.explicitPolicy !== undefined) {
    return options.explicitPolicy;
  }
  if (options.dropFirstCausativeAux === true) {
    return "lexical_prefix";
  }
  if (!/\s/u.test(lemma) && !lemma.endsWith("하다")) {
    return "lexical_prefix";
  }
  return undefined;
}

export function shortNegationPolicyForCommittedStem(
  lemma: string,
  currentPolicy: ShortNegationPolicy | undefined
): ShortNegationPolicy | undefined {
  return shortNegationPolicyForTranslation(lemma, {
    stemKind: "verb",
    ...(currentPolicy === undefined ? {} : { explicitPolicy: currentPolicy })
  });
}

export function stemAllowsSahenShortNegationSplit(stemKoreanPrefix: string | undefined): boolean {
  return (stemKoreanPrefix ?? "").length === 0;
}

export function stemPrefixAllowsShortNegationSplit(stemPrefix: string | undefined): boolean {
  return stemPrefix === undefined || stemPrefix.length === 0 || /\s$/u.test(stemPrefix);
}

export const NO_VERBAL_STEM_SAHEN_SHORT_NEGATION_SPLIT = false;

export function policyAllowsShortNegation(policy: ShortNegationPolicy | undefined): boolean {
  return policy !== undefined && policy !== "long_only";
}

export function committedStemPrefersShortNegation(
  ops: readonly AuxOpNode[],
  lemma: string,
  currentPolicy: ShortNegationPolicy | undefined,
  longNegationPreferredLemmas: ReadonlySet<string>
): boolean {
  const negation = ops.find((op) => op.kind === "negation");
  if (negation === undefined || negation.kind !== "negation" || negation.chainDepth !== 1) {
    return false;
  }
  const allShortTail = ops.every((op) =>
    op.kind === "negation" ||
    op.kind === "tense" ||
    op.kind === "polite" ||
    op.kind === "conjecture" ||
    (op.kind === "aspect" && op.aspect === "te_iru" && op.semantic?.renderStrategy === "drop_aux") ||
    op.kind === "predicateProjectionCarrier" ||
    op.kind === "predicateQuoteCarrier" ||
    op.kind === "scopeBridge" ||
    (op.kind === "connective" && (
      op.connective === "question_content" ||
      op.connective === "question_content_alternative" ||
      op.connective === "question_quotative"
    ))
  );
  return allShortTail &&
    policyAllowsShortNegation(shortNegationPolicyForCommittedStem(lemma, currentPolicy)) &&
    !longNegationPreferredLemmas.has(lemma);
}
