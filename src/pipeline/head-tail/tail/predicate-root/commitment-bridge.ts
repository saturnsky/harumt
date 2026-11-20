import type { MorphemeEntry } from "../../../../types/dictionary.js";
import type { ContextGrammar } from "../../../context.js";
import type { ContentHeadMetadata } from "../../integration/content-head-metadata.js";
import type {
  CommitmentCandidate,
  CommitmentEntry,
  CommitmentSpan,
  CommitmentTranslation
} from "../../../commitment/types.js";
import {
  headEvidenceDecisionAdmitsCommitmentBridgeCandidate,
  resolveTailEvidenceDecision
} from "./tail-evidence-decision.js";
import type {
  AuxLayerNode,
  CandidateSetStem,
  StemCandidate,
  TailNode,
  TailRoot
} from "./grammar.js";
import { candidateBearingAuxLayer, firstAuxLayer, stemSupportsProjectionCategory } from "./inspect.js";
import { 동사, 명사, 부사, 형용사 } from "../../../../types/pos.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "./stem-candidate-identity.js";

export function contextGrammarFromContentHeadMetadata(result: ContentHeadMetadata): ContextGrammar {
  return {
    ...(result.voice === null ? {} : { voice: result.voice }),
    ...(result.rareruReadings.size === 0 ? {} : { voice: serializeReadingSet(result.rareruReadings) }),
    ...(result.nareruReadings.size === 0 ? {} : { nareruReading: serializeReadingSet(result.nareruReadings) }),
    ...(result.dekiruReadings.size === 0 ? {} : { dekiruReading: serializeReadingSet(result.dekiruReadings) }),
    negative: result.hasNegative,
    causative: result.hasCausative,
    causativePassive: result.hasCausativePassive,
    requestTail: result.hasRequestTail,
    benefactiveTail: result.hasBenefactiveTail,
    ...(result.connectiveRole === null ? {} : { connectiveRole: result.connectiveRole })
  };
}

export function contextGrammarFromContentSpan(span: CommitmentSpan): ContextGrammar {
  return {
    ...(span.rareruReadings === undefined || span.rareruReadings.size === 0
      ? (span.voice === null || span.voice === undefined ? {} : { voice: span.voice })
      : { voice: serializeReadingSet(span.rareruReadings) }),
    ...(span.nareruReadings === undefined || span.nareruReadings.size === 0 ? {} : { nareruReading: serializeReadingSet(span.nareruReadings) }),
    ...(span.dekiruReadings === undefined || span.dekiruReadings.size === 0 ? {} : { dekiruReading: serializeReadingSet(span.dekiruReadings) }),
    negative: span.hasNegative ?? false,
    causative: span.hasCausative ?? false,
    causativePassive: span.hasCausativePassive ?? false,
    requestTail: span.hasRequestTail ?? false,
    benefactiveTail: span.hasBenefactiveTail ?? false,
    ...(span.connectiveRole === null || span.connectiveRole === undefined ? {} : { connectiveRole: span.connectiveRole })
  };
}

function serializeReadingSet(readings: ReadonlySet<string>): string | readonly string[] {
  const values = [...readings];
  return values.length === 1 ? values[0]! : values;
}

export function tailRootPredicateKoreanPos(root: TailRoot, fallback: number | null): number | null {
  return tailNodePredicateKoreanPos(root.tail, fallback);
}

function tailNodePredicateKoreanPos(node: TailNode, fallback: number | null): number | null {
  if (node.kind === "connective") {
    return tailNodePredicateKoreanPos(node.inner, fallback);
  }
  return auxLayerPredicateKoreanPos(node, fallback);
}

function auxLayerPredicateKoreanPos(layer: AuxLayerNode, fallback: number | null): number | null {
  switch (layer.stem.kind) {
    case "verb":
      return 동사;
    case "adj":
      return 형용사;
    case "candidateSet":
      if (stemSupportsProjectionCategory(layer.stem, "verbal_predicate")) {
        return 동사;
      }
      if (stemSupportsProjectionCategory(layer.stem, "adjectival_predicate")) {
        return 형용사;
      }
      return fallback;
    case "noun":
      return layer.ops.some((op) => op.kind === "copula") ? 동사 : fallback;
    case "adverb":
      return fallback;
  }
}

export function tailRootHasAdmissibleCommitmentCandidate(root: TailRoot): boolean {
  const parsedLayer = firstAuxLayer(root.tail);
  const layer = parsedLayer === null ? null : candidateBearingAuxLayer(parsedLayer);
  const stem = layer?.stem;
  if (layer === null || stem?.kind !== "candidateSet") {
    return true;
  }
  const admissionDecision = tailRootCommitmentAdmissionDecision(root, layer, stem);
  return stem.candidates.some((candidate) =>
    headEvidenceDecisionAdmitsCommitmentBridgeCandidate(admissionDecision, candidate)
  );
}

function tailRootCommitmentAdmissionDecision(
  root: TailRoot,
  layer: AuxLayerNode,
  stem: CandidateSetStem
): ReturnType<typeof resolveTailEvidenceDecision> {
  return resolveTailEvidenceDecision({
    stem,
    ops: layer.ops,
    terminal: layer.terminal,
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
    ...(stem.headHypothesis === undefined && root.headHypothesis === undefined
      ? {}
      : { headHypothesis: stem.headHypothesis ?? root.headHypothesis })
  });
}

export function tailRootCommitmentCandidates(
  root: TailRoot,
  entry: MorphemeEntry | null,
  options: { readonly includeIneligible?: boolean } = {}
): CommitmentCandidate[] {
  const parsedLayer = firstAuxLayer(root.tail);
  const layer = parsedLayer === null ? null : candidateBearingAuxLayer(parsedLayer);
  const stem = layer?.stem;
  if (layer === null || stem?.kind !== "candidateSet") {
    return [];
  }
  const admissionDecision = tailRootCommitmentAdmissionDecision(root, layer, stem);
  const admitted = stem.candidates
    .map((candidate, candidateIdx) => ({ candidate, candidateIdx }))
    .filter(({ candidate }) =>
      options.includeIneligible === true ||
      headEvidenceDecisionAdmitsCommitmentBridgeCandidate(admissionDecision, candidate)
    );
  if (admissionDecision !== null && options.includeIneligible !== true) {
    admitted.sort((left, right) => {
      const leftIndex = admissionDecision.candidateOpenSet.findIndex((identity) =>
        stemCandidateIdentitiesEqual(identity, stemCandidateIdentity(left.candidate))
      );
      const rightIndex = admissionDecision.candidateOpenSet.findIndex((identity) =>
        stemCandidateIdentitiesEqual(identity, stemCandidateIdentity(right.candidate))
      );
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });
  }
  return admitted.map(({ candidate, candidateIdx }) =>
    tailStemCandidateToCommitmentCandidate(stem, candidate, candidateIdx, entry)
  );
}

function tailStemCandidateToCommitmentCandidate(
  stem: CandidateSetStem,
  candidate: StemCandidate,
  candidateIdx: number,
  entry: MorphemeEntry | null
): CommitmentCandidate {
  const koreanPos = candidate.koreanPos ?? koreanPosFromCandidateHeadProfile(stem, candidateIdx) ?? fallbackPredicateKoreanPos(stem);
  const translation = stemCandidateToCommitmentTranslation(candidate, koreanPos);
  const candidateEntry: CommitmentEntry = {
    ...(entry ?? {}),
    senses: [translation],
    committed: true
  };
  return {
    entry: candidateEntry,
    translation,
    korean: "",
    koreanLemma: candidate.lemma,
    ...(candidate.intrinsicHonorific === undefined
      ? {}
      : { intrinsicHonorific: candidate.intrinsicHonorific }),
    koreanPos,
    irregular: candidate.irregular,
    ...(candidate.shortNegationPolicy === undefined
      ? {}
      : { shortNegationPolicy: candidate.shortNegationPolicy }),
    projectionOrdinal: candidate.projectionOrdinal,
    ...(candidate.derivation === undefined
      ? candidate.provenance.kind === "derivation"
        ? { derivation: { id: candidate.provenance.derivationId } }
        : {}
      : { derivation: candidate.derivation })
  };
}

function koreanPosFromCandidateHeadProfile(stem: CandidateSetStem, candidateIdx: number): number | undefined {
  const choices = stem.headHypothesis?.candidates[candidateIdx]?.headProfile?.capabilities
    .flatMap((capability) => capability.choices) ?? [];
  if (choices.some((choice) => choice.category === "verbal_predicate")) return 동사;
  if (choices.some((choice) => choice.category === "adjectival_predicate")) return 형용사;
  if (choices.some((choice) => choice.category === "adverbial")) return 부사;
  if (choices.some((choice) => choice.category === "nominal")) return 명사;
  return undefined;
}

function fallbackPredicateKoreanPos(stem: CandidateSetStem): number {
  if (stemSupportsProjectionCategory(stem, "verbal_predicate")) return 동사;
  if (stemSupportsProjectionCategory(stem, "adjectival_predicate")) return 형용사;
  if (stemSupportsProjectionCategory(stem, "nominal")) return 명사;
  return 형용사;
}

function stemCandidateToCommitmentTranslation(
  candidate: StemCandidate,
  koreanPos: number
): CommitmentTranslation {
  const translation: CommitmentTranslation & {
    senseFrame?: NonNullable<CommitmentTranslation["senseFrame"]>;
    senseFrames?: NonNullable<CommitmentTranslation["senseFrames"]>;
    senseCaseRealization?: Exclude<CommitmentTranslation["senseCaseRealization"], undefined>;
    senseSlotRealization?: Exclude<CommitmentTranslation["senseSlotRealization"], undefined>;
    priorityGroup?: number;
    priorityInGroup?: number;
    senseIndex?: number;
    sourceFormat?: "senses";
    derivation?: CommitmentTranslation["derivation"];
  } = {
    korean: candidate.lemma,
    ...(candidate.intrinsicHonorific === undefined
      ? {}
      : { intrinsicHonorific: candidate.intrinsicHonorific }),
    ...(candidate.provenance.kind === "dictionary"
      ? {
        entryId: candidate.provenance.entryId,
        senseIndex: candidate.provenance.senseIndex
      }
      : { derivation: candidate.provenance.derivationId }),
    koreanPos,
    irregular: candidate.irregular,
    ...(candidate.adverbial === undefined ? {} : { adverbial: candidate.adverbial }),
    ...(candidate.connectivePreferences === undefined ? {} : { connectivePreferences: candidate.connectivePreferences as NonNullable<CommitmentTranslation["connectivePreferences"]> }),
    ...(candidate.connective_preferences === undefined ? {} : { connective_preferences: candidate.connective_preferences as NonNullable<CommitmentTranslation["connective_preferences"]> }),
    ...(candidate.casePreferences === undefined ? {} : { casePreferences: candidate.casePreferences as NonNullable<CommitmentTranslation["casePreferences"]> }),
    ...(candidate.caseRealization === undefined ? {} : { caseRealization: candidate.caseRealization as NonNullable<CommitmentTranslation["caseRealization"]> }),
    ...(candidate.slotRealization === undefined ? {} : { slotRealization: candidate.slotRealization as NonNullable<CommitmentTranslation["slotRealization"]> }),
    ...(candidate.senseFrame === undefined || candidate.senseFrame === null ? {} : { senseFrame: candidate.senseFrame as NonNullable<CommitmentTranslation["senseFrame"]> }),
    ...(Array.isArray(candidate.senseFrames) ? { senseFrames: candidate.senseFrames as NonNullable<CommitmentTranslation["senseFrames"]> } : {}),
    ...(candidate.senseCaseRealization === undefined ? {} : { senseCaseRealization: candidate.senseCaseRealization as Exclude<CommitmentTranslation["senseCaseRealization"], undefined> }),
    ...(candidate.senseSlotRealization === undefined ? {} : { senseSlotRealization: candidate.senseSlotRealization as Exclude<CommitmentTranslation["senseSlotRealization"], undefined> }),
    ...(candidate.priorityGroup === undefined ? {} : { priorityGroup: candidate.priorityGroup }),
    ...(candidate.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.priorityInGroup }),
    ...(candidate.provenance.kind === "derivation" && candidate.derivation !== undefined
      ? { derivation: candidate.derivation.id }
      : {}),
    ...(candidate.sourceFormat === undefined ? {} : { sourceFormat: candidate.sourceFormat }),
    ...(candidate.dropFirstNegativeAux === true ? { dropFirstNegativeAux: true } : {}),
    ...(candidate.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true } : {}),
    ...(candidate.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true } : {}),
    ...(candidate.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: candidate.shortNegationPolicy }),
    ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
    ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix }),
    ...(candidate.teIruResultative === true ? { teIruResultative: true } : {}),
    ...(candidate.teIruDropAux === true ? { teIruDropAux: true } : {}),
    ...(candidate.teIruContractToPast === true ? { teIruContractToPast: true } : {})
  };
  return translation;
}
