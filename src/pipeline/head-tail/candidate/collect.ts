import type { MorphemeDictionary } from "../../../dictionary/morpheme.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { TokenCursor } from "../../token-cursor.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { ProjectionEvidenceLayout } from "../../clause-layout/index.js";
import type { PredicateTailSyntheticEntryResolver } from "../tail/predicate-root/integration.js";
import { collectHeadAnchors } from "../head/anchor.js";
import type { HeadTailCandidateTraceDescriptor } from "../head/profile.js";
import type { NumericHostReservation } from "../tail/predicate-root/integration.js";
import {
  buildHeadTailCandidates,
  type HeadTailCandidate
} from "../tail/chain.js";

export interface SharedHeadedContentRunnerOptions {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly synthesizeEntry?: PredicateTailSyntheticEntryResolver;
  readonly numericHostReservation?: NumericHostReservation;
  readonly layout?: ProjectionEvidenceLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

export interface SharedHeadedContentRunnerResult {
  readonly candidates: readonly HeadTailCandidate[];
  readonly descriptors: readonly HeadTailCandidateTraceDescriptor[];
}

export async function collectSharedHeadedContentCandidates(
  options: SharedHeadedContentRunnerOptions
): Promise<SharedHeadedContentRunnerResult> {
  const { tokens } = options.cursor;
  const heads = collectHeadAnchors({
    cursor: options.cursor
  });
  const candidateArrays = await Promise.all(heads.map((head) => buildHeadTailCandidates({
    head,
    tokens,
    cursor: options.cursor,
    dictionary: options.dictionary,
    previewFormal: options.previewFormal,
    limit: options.cursor.end,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.synthesizeEntry === undefined ? {} : { synthesizeEntry: options.synthesizeEntry }),
    ...(options.numericHostReservation === undefined ? {} : { numericHostReservation: options.numericHostReservation }),
    ...(options.layout === undefined ? {} : { layout: options.layout })
  })));
  const candidates = candidateArrays.flat();
  return {
    candidates,
    descriptors: candidates.map(describeHeadTailCandidate)
  };
}

function describeHeadTailCandidate(candidate: HeadTailCandidate): HeadTailCandidateTraceDescriptor {
  return {
    tailSourceKind: candidate.tail.realization.kind,
    headKind: candidate.head.kind,
    headAdapterId: candidate.head.adapterId,
    headSpan: candidate.head.sourceSpan,
    tailSpan: candidate.segmentation.tailSpan,
    tailRootStart: candidate.tail.tailRootStart,
    sourceSpan: candidate.sourceSpan,
    tailSegments: candidate.tail.segments.map((segment) => ({
      kind: segment.kind,
      ...(segment.opKind === undefined ? {} : { opKind: segment.opKind }),
      ...(segment.markerSurface === undefined ? {} : { markerSurface: segment.markerSurface }),
      ...(segment.frameKind === undefined ? {} : { frameKind: segment.frameKind }),
      sourceSpan: segment.sourceSpan
    })),
    requiredContinuationCapabilityIds: candidate.tail.requiredCapabilities,
    evidenceKinds: candidate.evidence.map((item) => item.kind)
  };
}
