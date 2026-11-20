import type { IrregularType } from "../../generator/conjugator.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { TranslationCandidate } from "../../types/pipeline.js";
import type { Warning } from "../../types/warning.js";
import { normalizeCandidateConditions, pruneCandidatesBySlotOrder, translationCandidateFromDict, translationCandidateProjectionOrdinals } from "../candidate-runtime.js";
import { stemCandidateProvenanceKey, translationCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import type { MatcherToken } from "../matchers.js";
import type { CompoundStatePredicateHeadCandidate } from "./index.js";

export type CompoundResult =
  readonly [
    consumed: number,
    korean: string,
    koreanPos: number,
    renderPlan?: RenderPlan | null,
    warnings?: readonly Warning[],
    candidates?: readonly TranslationCandidate[]
  ];

export interface CompoundCandidateDerivation {
  readonly result: CompoundResult;
  readonly koreanLemma?: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
}

export interface CompoundHeadCandidate {
  readonly source: TranslationCandidate;
  readonly entry: MorphemeEntry;
  readonly token: MatcherToken;
  readonly koreanLemma: string;
  readonly koreanPos: number;
  readonly irregular: IrregularType | null;
}

interface CompoundVerbAdjSuffixPair {
  readonly verb: CompoundHeadCandidate;
  readonly suffix: TranslationCandidate;
}

export function entryWithOnlyCandidate(candidate: TranslationCandidate): MorphemeEntry {
  return { ...candidate.entry, senses: [candidate.translation] };
}

export function compoundSourceCandidates(
  entry: MorphemeEntry,
  options: {
    readonly slot?: string | null;
    readonly filter?: (candidate: TranslationCandidate) => boolean;
  } = {}
): readonly TranslationCandidate[] {
  const senses = entry.senses ?? [];
  const projectionOrdinals = translationCandidateProjectionOrdinals(entry, senses);
  const all = senses.map((translation, index) =>
    translationCandidateFromDict(entry, translation, {
      priority: index,
      conditions: normalizeCandidateConditions(null),
      projectionOrdinal: projectionOrdinals[index]!
    })
  );
  const filtered = options.filter === undefined ? all : all.filter(options.filter);
  const candidates = options.filter === undefined ? all : filtered;
  if (candidates.length === 0) {
    return [];
  }
  if (options.slot === undefined || options.slot === null) {
    return candidates;
  }
  const [pruned] = pruneCandidatesBySlotOrder(
    candidates,
    candidates.map(() => "match"),
    options.slot,
    { final: false }
  );
  return pruned.length > 0 ? pruned : candidates;
}

function compoundResultFromSources<T>(
  sources: readonly T[],
  derive: (item: T) => CompoundCandidateDerivation | null,
  toSourceCandidate: (item: T) => TranslationCandidate
): CompoundResult | null {
  const derived = sources
    .map((item) => ({ item, derivation: derive(item) }))
    .filter((entry): entry is { readonly item: T; readonly derivation: CompoundCandidateDerivation } =>
      entry.derivation !== null
    );
  const selected = derived[0];
  if (selected === undefined) {
    return null;
  }
  const selectedConsumed = selected.derivation.result[0];
  const projectionCounts = new Map<string, number>();
  const candidates = derived
    .filter((entry) => entry.derivation.result[0] === selectedConsumed)
    .map((entry) => {
      const source = toSourceCandidate(entry.item);
      const key = compoundProjectionOrdinalBaseKey(source);
      const projectionOrdinal = projectionCounts.get(key) ?? 0;
      projectionCounts.set(key, projectionOrdinal + 1);
      return compoundCandidateFromDerivation(source, entry.derivation, projectionOrdinal);
    });
  return compoundResultWithCandidates(selected.derivation.result, candidates);
}

export function compoundResultFromCandidates(
  sourceCandidates: readonly TranslationCandidate[],
  derive: (candidate: TranslationCandidate) => CompoundCandidateDerivation | null
): CompoundResult | null {
  return compoundResultFromSources(sourceCandidates, derive, (candidate) => candidate);
}

export function compoundResultFromHeadCandidates(
  headCandidates: readonly CompoundHeadCandidate[],
  derive: (candidate: CompoundHeadCandidate) => CompoundCandidateDerivation | null
): CompoundResult | null {
  return compoundResultFromSources(headCandidates, derive, (candidate) => candidate.source);
}

export function compoundResultFromStateHeadCandidates(
  headCandidates: readonly CompoundStatePredicateHeadCandidate[],
  derive: (candidate: CompoundStatePredicateHeadCandidate) => CompoundCandidateDerivation | null
): CompoundResult | null {
  return compoundResultFromSources(headCandidates, derive, (candidate) => candidate.source);
}

export function compoundResultFromVerbAdjSuffixPairs(
  pairs: readonly CompoundVerbAdjSuffixPair[],
  derive: (pair: CompoundVerbAdjSuffixPair) => CompoundCandidateDerivation | null
): CompoundResult | null {
  return compoundResultFromSources(pairs, derive, (pair) =>
    compoundCommitmentSourceCandidate(pair.verb.source, pair.suffix)
  );
}

function compoundCommitmentSourceCandidate(
  primary: TranslationCandidate,
  secondary: TranslationCandidate
): TranslationCandidate {
  return {
    ...primary,
    compoundSamePredicateFrameSources: [primary.translation, secondary.translation]
  };
}

function compoundProjectionOrdinalBaseKey(candidate: TranslationCandidate): string {
  return stemCandidateProvenanceKey(translationCandidateIdentity(candidate).provenance);
}

function compoundCandidateFromDerivation(
  source: TranslationCandidate,
  derivation: CompoundCandidateDerivation,
  projectionOrdinal = source.projectionOrdinal
): TranslationCandidate {
  const [, korean, koreanPos, renderPlan, warnings] = derivation.result;
  const plan = renderPlan ?? null;
  return {
    ...source,
    entry: entryWithOnlyCandidate(source),
    translation: source.translation,
    koreanLemma: derivation.koreanLemma ?? source.koreanLemma,
    koreanPos: derivation.koreanPos ?? koreanPos,
    irregular: derivation.irregular === undefined ? source.irregular : derivation.irregular,
    projectionOrdinal,
    renderPlan: plan,
    korean: plan === null ? korean : "",
    warnings: warnings ?? [],
    renderPlanPolicy: "normal"
  };
}

function compoundResultWithCandidates(
  result: CompoundResult,
  candidates: readonly TranslationCandidate[]
): CompoundResult {
  const [consumed, korean, koreanPos, renderPlan, warnings] = result;
  return [consumed, korean, koreanPos, renderPlan ?? null, warnings ?? [], candidates];
}

export function compoundDerivationFromResult(
  result: CompoundResult | null,
  koreanLemma: string,
  koreanPos: number,
  irregular: IrregularType | null
): CompoundCandidateDerivation | null {
  return result === null
    ? null
    : { result, koreanLemma, koreanPos, irregular };
}

export function compoundHeadCandidatesFromEntry(
  entry: MorphemeEntry,
  token: MatcherToken,
  derive: (candidate: TranslationCandidate) => Pick<CompoundHeadCandidate, "koreanLemma" | "koreanPos" | "irregular"> | null
): readonly CompoundHeadCandidate[] {
  return compoundSourceCandidates(entry)
    .map((candidate) => {
      const terms = derive(candidate);
      return terms === null
        ? null
        : {
          source: candidate,
          entry,
          token,
          koreanLemma: terms.koreanLemma,
          koreanPos: terms.koreanPos,
          irregular: terms.irregular
        };
    })
    .filter((candidate): candidate is CompoundHeadCandidate => candidate !== null);
}

export function compoundStateHeadCandidatesFromEntry(
  entry: MorphemeEntry,
  token: MatcherToken,
  derive: (candidate: TranslationCandidate) => Omit<CompoundStatePredicateHeadCandidate, "source" | "entry" | "token"> | null
): readonly CompoundStatePredicateHeadCandidate[] {
  return compoundSourceCandidates(entry)
    .map((candidate) => {
      const terms = derive(candidate);
      return terms === null
        ? null
        : {
          source: candidate,
          entry,
          token,
          ...terms
        };
    })
    .filter((candidate): candidate is CompoundStatePredicateHeadCandidate => candidate !== null);
}

function prioritizeCandidatesBy<T>(
  candidates: readonly T[],
  selected: TranslationCandidate | undefined,
  toComparable: (candidate: T) => TranslationCandidate
): readonly T[] {
  if (selected === undefined || candidates.length <= 1) {
    return candidates;
  }
  const selectedIdx = candidates.findIndex((candidate) => {
    const source = toComparable(candidate);
    return (
      source.translation === selected.translation ||
      (
        source.koreanLemma === selected.koreanLemma &&
        source.koreanPos === selected.koreanPos &&
        source.irregular === selected.irregular
      )
    );
  });
  if (selectedIdx <= 0) {
    return candidates;
  }
  const selectedCandidate = candidates[selectedIdx]!;
  return [
    selectedCandidate,
    ...candidates.slice(0, selectedIdx),
    ...candidates.slice(selectedIdx + 1)
  ];
}

export function prioritizeHeadCandidates(
  candidates: readonly CompoundHeadCandidate[],
  selected: TranslationCandidate | undefined
): readonly CompoundHeadCandidate[] {
  return prioritizeCandidatesBy(candidates, selected, (candidate) => candidate.source);
}

export function prioritizeStateHeadCandidates(
  candidates: readonly CompoundStatePredicateHeadCandidate[],
  selected: TranslationCandidate | undefined
): readonly CompoundStatePredicateHeadCandidate[] {
  return prioritizeCandidatesBy(candidates, selected, (candidate) => candidate.source);
}

export function prioritizeSourceCandidates(
  candidates: readonly TranslationCandidate[],
  selected: TranslationCandidate | undefined
): readonly TranslationCandidate[] {
  return prioritizeCandidatesBy(candidates, selected, (candidate) => candidate);
}
