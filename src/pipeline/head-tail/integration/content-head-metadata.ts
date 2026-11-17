import type { MorphemeEntry } from "../../../types/dictionary.js";
import type {
  BenefactiveContext,
  DekiruReading,
  NareruReading,
  RareruReading
} from "../../../types/pipeline.js";
import type { Voice } from "../../../types/render-plan.js";
import type { Warning } from "../../../types/warning.js";
import { contentResultKoreanPos, type ContentResult } from "../../content-types.js";
import type { TranslationCandidate } from "../../../types/pipeline.js";
import {
  commitmentLaneCandidateSet,
  isResolvedCandidateSet,
  type SourceCandidateSet
} from "../../source-candidate-set.js";

export interface ContentHeadHydrationMetadata {
  readonly entry: MorphemeEntry | null;
  readonly sourceCandidates: SourceCandidateSet<TranslationCandidate> | null;
}

export interface ContentHeadMetadata extends ContentHeadHydrationMetadata {
  readonly consumed: number;
  readonly koreanPos: number | null;
  readonly voice: Voice | null;
  readonly rareruReadings: ReadonlySet<RareruReading>;
  readonly nareruReadings: ReadonlySet<NareruReading>;
  readonly dekiruReadings: ReadonlySet<DekiruReading>;
  readonly hasNegative: boolean;
  readonly hasCausative: boolean;
  readonly hasCausativePassive: boolean;
  readonly hasRequestTail: boolean;
  readonly hasBenefactiveTail: boolean;
  readonly connectiveRole: string | null;
  readonly benefactive: BenefactiveContext;
  readonly warnings: readonly Warning[];
}

export function contentHeadHydrationMetadataFromResult(result: ContentResult): ContentHeadHydrationMetadata {
  return {
    entry: result.entry,
    sourceCandidates: result.sourceCandidates
  };
}

export function contentHeadMetadataFromResult(result: ContentResult): ContentHeadMetadata {
  return {
    ...contentHeadHydrationMetadataFromResult(result),
    consumed: result.consumed,
    koreanPos: contentResultKoreanPos(result),
    voice: result.voice,
    rareruReadings: result.rareruReadings,
    nareruReadings: result.nareruReadings,
    dekiruReadings: result.dekiruReadings,
    hasNegative: result.hasNegative,
    hasCausative: result.hasCausative,
    hasCausativePassive: result.hasCausativePassive,
    hasRequestTail: result.hasRequestTail,
    hasBenefactiveTail: result.hasBenefactiveTail,
    connectiveRole: result.connectiveRole,
    benefactive: result.benefactive,
    warnings: result.warnings
  };
}

export function selectedContentHeadCandidate(metadata: ContentHeadHydrationMetadata): TranslationCandidate | null {
  const set = commitmentLaneCandidateSet(metadata.sourceCandidates);
  return isResolvedCandidateSet(set) ? set.winner.candidate : null;
}

export function contentHeadDictionaryContainsLemma(metadata: ContentHeadHydrationMetadata, lemma: string): boolean {
  return (metadata.entry?.senses ?? []).some((translation) => translation.korean === lemma);
}
