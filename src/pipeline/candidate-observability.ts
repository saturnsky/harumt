import type { TraceDetailValue } from "./trace.js";

export type CandidateProjectionSource =
  | "dictionary_sense"
  | "nominalized_noun_slot"
  | "stem_root_nominal_slot"
  | "verbal_nominal_m_slot"
  | "lexical_particle_adverbial";

export type EvidenceClassification =
  | "unclassified"
  | "required"
  | "preference"
  | "fallback";

export type EvidenceEffect =
  | "observe"
  | "prune"
  | "reorder"
  | "select";

export interface CandidateObservabilityInput {
  readonly lemma: string;
  readonly koreanPos: number | null;
  readonly koreanPosName: string | null;
  readonly priorityGroup: number | null;
  readonly priorityInGroup: number | null;
  readonly fallbackGroup: boolean;
  readonly senseIndex: number | null;
  readonly projectionOrdinal: number;
  readonly projectionOrdinalSource: string;
  readonly match?: string | null;
  readonly derivation?: string | null;
  readonly projectionSource?: CandidateProjectionSource | string | null;
  readonly renderPlanKind?: string | null;
  readonly nominalized?: string | null;
  readonly joinSource?: string | null;
}

export interface SlotEvidenceObservabilityInput {
  readonly owner: string;
  readonly evidence: string;
  readonly slot: string | null;
  readonly effect: EvidenceEffect;
  readonly final: boolean;
  readonly classification?: EvidenceClassification | null;
  readonly fallbackLoweredToReorder?: boolean;
  readonly droppedCount?: number | null;
  readonly droppedCandidates?: readonly string[] | null;
}

export function candidateObservabilityTraceValue(input: CandidateObservabilityInput): { readonly [key: string]: TraceDetailValue } {
  const nominalized = input.nominalized ?? null;
  return {
    lemma: input.lemma,
    korean_pos: input.koreanPos,
    korean_pos_name: input.koreanPosName,
    priority_group: input.priorityGroup,
    priority_in_group: input.priorityInGroup,
    fallback_group: input.fallbackGroup,
    sense_index: input.senseIndex,
    projection_ordinal: input.projectionOrdinal,
    projection_ordinal_source: input.projectionOrdinalSource,
    ...(input.match === undefined ? {} : { match: input.match }),
    derivation: input.derivation ?? null,
    projection_source: input.projectionSource ?? "dictionary_sense",
    render_plan_kind: input.renderPlanKind ?? null,
    nominalized_capable: typeof nominalized === "string" && nominalized.length > 0,
    nominalized: typeof nominalized === "string" && nominalized.length > 0 ? nominalized : null,
    ...(input.joinSource === undefined || input.joinSource === null ? {} : { join_source: input.joinSource })
  };
}

export function slotEvidenceObservabilityTraceValue(input: SlotEvidenceObservabilityInput): TraceDetailValue {
  return {
    owner: input.owner,
    evidence: input.evidence,
    slot: input.slot,
    effect: input.effect,
    final: input.final,
    classification: input.classification ?? "unclassified",
    fallback_lowered_to_reorder: input.fallbackLoweredToReorder === true,
    ...(input.droppedCount === undefined || input.droppedCount === null ? {} : { dropped_count: input.droppedCount }),
    ...(input.droppedCandidates === undefined || input.droppedCandidates === null ? {} : { dropped_candidates: input.droppedCandidates })
  };
}

export function fallbackPriorityGroup<T>(
  candidates: readonly T[],
  priorityGroup: (candidate: T) => number
): number | null {
  if (candidates.length === 0) {
    return null;
  }
  return Math.max(...candidates.map(priorityGroup));
}
