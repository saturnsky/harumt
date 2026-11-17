export function usesVerbLikeFormalPlainEnding(
  lemma: string,
  isVerb: boolean,
  adjectiveLikeLemmas: ReadonlySet<string>,
  verbLikeOverrides: ReadonlySet<string>
): boolean {
  return verbLikeOverrides.has(lemma) || (isVerb && !adjectiveLikeLemmas.has(lemma));
}
