import { derivationForSense, LEXICAL_DERIVATION_ID, type ResolvedDerivation } from "../../../../dictionary/derivation.js";
import type { MorphemeSense } from "../../../../types/dictionary.js";
import type { TranslationCandidate } from "../../../../types/pipeline.js";
import type { IrregularType } from "../../../../generator/conjugator.js";
import type { StemCandidate } from "./grammar.js";

export type StemCandidateProvenance =
  | { readonly kind: "dictionary"; readonly entryId: string; readonly senseIndex: number }
  | { readonly kind: "derivation"; readonly derivationId: string };

export interface StemCandidateIdentity {
  readonly provenance: StemCandidateProvenance;
  readonly projectionOrdinal: number;
}

export function stemCandidateIdentity(candidate: StemCandidate): StemCandidateIdentity {
  return {
    provenance: candidate.provenance,
    projectionOrdinal: candidate.projectionOrdinal
  };
}

export function translationCandidateIdentity(candidate: TranslationCandidate): StemCandidateIdentity {
  const derivation = candidate.derivation ?? derivationForSense(candidate.translation, candidate.entry);
  return {
    provenance: stemCandidateProvenanceForTranslation(candidate.translation, derivation),
    projectionOrdinal: candidate.projectionOrdinal
  };
}

export function stemCandidateProvenanceForTranslation(
  translation: Pick<MorphemeSense, "entryId" | "senseIndex" | "derivation">,
  derivation?: ResolvedDerivation
): StemCandidateProvenance {
  const derivationId = derivation?.id ?? translation.derivation;
  if (derivationId !== undefined && derivationId !== LEXICAL_DERIVATION_ID) {
    return { kind: "derivation", derivationId };
  }
  if (translation.entryId === undefined || translation.senseIndex === undefined) {
    throw new Error("dictionary stem candidate requires entryId and senseIndex provenance");
  }
  return {
    kind: "dictionary",
    entryId: translation.entryId,
    senseIndex: translation.senseIndex
  };
}

export function stemCandidateIdentitiesEqual(
  left: StemCandidateIdentity,
  right: StemCandidateIdentity
): boolean {
  if (left.projectionOrdinal !== right.projectionOrdinal) {
    return false;
  }
  if (left.provenance.kind !== right.provenance.kind) {
    return false;
  }
  if (left.provenance.kind === "dictionary" && right.provenance.kind === "dictionary") {
    return left.provenance.entryId === right.provenance.entryId &&
      left.provenance.senseIndex === right.provenance.senseIndex;
  }
  return left.provenance.kind === "derivation" &&
    right.provenance.kind === "derivation" &&
    left.provenance.derivationId === right.provenance.derivationId;
}

export function stemCandidateProvenanceKey(provenance: StemCandidateProvenance): string {
  return JSON.stringify(provenance);
}

export function createStemCandidateProjectionOrdinalAllocator(
  initial: readonly StemCandidateIdentity[]
): (provenance: StemCandidateProvenance) => number {
  const nextByProvenance = new Map<string, number>();
  for (const identity of initial) {
    const key = stemCandidateProvenanceKey(identity.provenance);
    nextByProvenance.set(
      key,
      Math.max(nextByProvenance.get(key) ?? 0, identity.projectionOrdinal + 1)
    );
  }
  return (provenance) => {
    const key = stemCandidateProvenanceKey(provenance);
    const projectionOrdinal = nextByProvenance.get(key) ?? 0;
    nextByProvenance.set(key, projectionOrdinal + 1);
    return projectionOrdinal;
  };
}

export function findStemCandidateByTranslationIdentity(
  candidates: readonly StemCandidate[],
  candidate: TranslationCandidate
): StemCandidate | null {
  const identity = translationCandidateIdentity(candidate);
  return candidates.find((stemCandidate) =>
    stemCandidateIdentitiesEqual(stemCandidateIdentity(stemCandidate), identity)
  ) ?? null;
}

export function stemCandidateMatchesTranslationIdentity(
  stemCandidate: StemCandidate,
  candidate: TranslationCandidate
): boolean {
  return stemCandidateIdentitiesEqual(
    stemCandidateIdentity(stemCandidate),
    translationCandidateIdentity(candidate)
  );
}

export function assertUniqueStemCandidateIdentities(candidates: readonly StemCandidate[]): void {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const identity = stemCandidateIdentity(candidate);
    const key = JSON.stringify(identity);
    if (seen.has(key)) {
      throw new Error(`duplicate stem candidate identity: ${key}`);
    }
    seen.add(key);
  }
}

export function stemCandidateStructuralPatch(candidate: StemCandidate): Partial<StemCandidate> {
  return {
    ...(candidate.koreanPos === undefined ? {} : { koreanPos: candidate.koreanPos }),
    ...(candidate.conj === undefined ? {} : { conj: candidate.conj }),
    ...(candidate.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: candidate.shortNegationPolicy })
  };
}

export function invariantStemCandidateStructuralPatch(
  candidates: readonly StemCandidate[]
): Partial<StemCandidate> {
  return {
    ...invariantFieldPatch(candidates, "koreanPos"),
    ...invariantFieldPatch(candidates, "conj"),
    ...invariantFieldPatch(candidates, "shortNegationPolicy")
  };
}

export function rewriteStemCandidatesPreservingIdentity(
  candidates: readonly StemCandidate[],
  lemma: string,
  irregular: IrregularType | null,
  options: {
    readonly candidatePatch?: Partial<StemCandidate>;
    readonly structuralCandidate?: StemCandidate | null;
  } = {}
): readonly StemCandidate[] {
  const structuralCandidate = options.structuralCandidate;
  if (structuralCandidate !== undefined && structuralCandidate !== null) {
    return [{
      ...structuralCandidate,
      ...(options.candidatePatch ?? {}),
      lemma,
      irregular,
      provenance: structuralCandidate.provenance,
      projectionOrdinal: structuralCandidate.projectionOrdinal
    }];
  }
  const constructionPatch = constructionWideStemCandidatePatch(options.candidatePatch);
  return candidates.map((candidate) => ({
    ...candidate,
    ...constructionPatch,
    lemma,
    irregular,
    provenance: candidate.provenance,
    projectionOrdinal: candidate.projectionOrdinal
  }));
}

function constructionWideStemCandidatePatch(
  patch: Partial<StemCandidate> | undefined
): Partial<StemCandidate> {
  if (patch === undefined) {
    return {};
  }
  return {
    ...(patch.conj === undefined ? {} : { conj: patch.conj }),
    ...(patch.dropFirstNegativeAux === undefined ? {} : { dropFirstNegativeAux: patch.dropFirstNegativeAux }),
    ...(patch.dropFirstPassiveAux === undefined ? {} : { dropFirstPassiveAux: patch.dropFirstPassiveAux }),
    ...(patch.dropFirstCausativeAux === undefined ? {} : { dropFirstCausativeAux: patch.dropFirstCausativeAux }),
    ...(patch.teIruResultative === undefined ? {} : { teIruResultative: patch.teIruResultative }),
    ...(patch.teIruDropAux === undefined ? {} : { teIruDropAux: patch.teIruDropAux }),
    ...(patch.teIruContractToPast === undefined ? {} : { teIruContractToPast: patch.teIruContractToPast }),
    ...(patch.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: patch.shortNegationPolicy })
  };
}

export function stemCandidatePatchFromTranslationCandidate(
  candidate: TranslationCandidate
): Pick<StemCandidate, "provenance" | "projectionOrdinal"> & Partial<StemCandidate> {
  const translation = candidate.translation;
  return {
    provenance: translationCandidateIdentity(candidate).provenance,
    ...(candidate.koreanPos === undefined && translation.koreanPos === undefined
      ? {}
      : { koreanPos: candidate.koreanPos ?? translation.koreanPos }),
    projectionOrdinal: candidate.projectionOrdinal,
    ...(candidate.derivation === undefined ? {} : { derivation: candidate.derivation }),
    ...(translation.nominalized === undefined ? {} : { nominalized: translation.nominalized }),
    ...(translation.adverbial === undefined ? {} : { adverbial: translation.adverbial }),
    ...(translation.koreanPolite === undefined ? {} : { koreanPolite: translation.koreanPolite }),
    ...(translation.intrinsicHonorific === undefined ? {} : { intrinsicHonorific: translation.intrinsicHonorific }),
    ...(translation.connectiveRole === undefined ? {} : { connectiveRole: translation.connectiveRole }),
    ...(translation.connectivePreferences === undefined ? {} : { connectivePreferences: translation.connectivePreferences }),
    ...(translation.casePreferences === undefined ? {} : { casePreferences: translation.casePreferences }),
    ...(translation.caseRealization === undefined ? {} : { caseRealization: translation.caseRealization }),
    ...(translation.slotRealization === undefined ? {} : { slotRealization: translation.slotRealization }),
    ...(translation.senseFrame === undefined ? {} : { senseFrame: translation.senseFrame }),
    ...(translation.senseFrames === undefined ? {} : { senseFrames: translation.senseFrames }),
    ...(translation.senseCaseRealization === undefined ? {} : { senseCaseRealization: translation.senseCaseRealization }),
    ...(translation.senseSlotRealization === undefined ? {} : { senseSlotRealization: translation.senseSlotRealization }),
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    ...(translation.senseIndex === undefined ? {} : { senseIndex: translation.senseIndex }),
    ...(translation.sourceFormat === undefined ? {} : { sourceFormat: translation.sourceFormat }),
    ...(translation.dropFirstNegativeAux === true ? { dropFirstNegativeAux: true as const } : {}),
    ...(translation.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true as const } : {}),
    ...(translation.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(translation.teIruDropAux === true ? { teIruDropAux: true as const } : {}),
    ...(translation.teIruContractToPast === true ? { teIruContractToPast: true as const } : {}),
    ...(translation.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: translation.shortNegationPolicy }),
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix }),
    ...(candidate.sourceVerbalPredicateVerdict === undefined || candidate.sourceVerbalPredicateVerdict === null
      ? {}
      : { sourceVerbalPredicateVerdict: candidate.sourceVerbalPredicateVerdict })
  };
}

function invariantFieldPatch<K extends keyof StemCandidate>(
  candidates: readonly StemCandidate[],
  key: K
): Partial<Pick<StemCandidate, K>> {
  const first = candidates[0]?.[key];
  if (first === undefined || candidates.some((candidate) => candidate[key] !== first)) {
    return {};
  }
  return { [key]: first } as Partial<Pick<StemCandidate, K>>;
}
