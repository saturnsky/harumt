import { conjugate, type IrregularType } from "./conjugator.js";

export function isRealizedHonorificPredicateLemma(
  lemma: string,
  realizedHonorificLemmas: ReadonlySet<string>
): boolean {
  return realizedHonorificLemmas.has(lemma);
}

export function respectKoreanPredicateLemma(
  lemma: string,
  irregular: IrregularType | null,
  suppletiveLemmas: ReadonlyMap<string, string>,
  realizedHonorificLemmas: ReadonlySet<string>
): string | null {
  if (isRealizedHonorificPredicateLemma(lemma, realizedHonorificLemmas)) {
    return lemma;
  }
  const suppletive = suppletiveLemmas.get(lemma);
  if (suppletive !== undefined) {
    return suppletive;
  }
  if (!lemma.endsWith("다")) {
    return null;
  }
  return `${conjugate(lemma, irregular, "(으)시")}다`;
}
