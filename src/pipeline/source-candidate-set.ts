import type { ClauseLayout } from "./clause-layout/index.js";
import type { StemCandidateIdentity } from "./head-tail/tail/predicate-root/stem-candidate-identity.js";
import {
  stemCandidateIdentitiesEqual,
  translationCandidateIdentity
} from "./head-tail/tail/predicate-root/stem-candidate-identity.js";
import type { FrameSourceConditionMatch } from "./context.js";
import type { TranslationCandidate } from "../types/pipeline.js";
import { contentCandidatePriorityGroup } from "./content-resolver/candidate-ordering.js";


declare const SOURCE_CANDIDATE_SET_SEAL: unique symbol;

interface SealedCandidateSetBase<C> {
  readonly [SOURCE_CANDIDATE_SET_SEAL]: true;
  readonly members: readonly StagedCandidate<C>[];
  readonly sharedConsumed: number;
  readonly origin: SourceCandidateSetOrigin;
}

export type SourceCandidateSetOrigin = "candidate_lane" | "entry_reorder_lane";

export function commitmentLaneCandidateSet<C>(
  set: SourceCandidateSet<C> | null | undefined
): SourceCandidateSet<C> | null {
  return set !== null && set !== undefined && set.origin === "candidate_lane" ? set : null;
}



export interface StagedCandidate<C = TranslationCandidate> {
  readonly candidate: C;
  readonly identity: StemCandidateIdentity;
  readonly priorityGroup: number;
  readonly sourceCondition: FrameSourceConditionMatch;
  readonly consumed: number | null;
}


export interface UnresolvedCandidateSet<C = TranslationCandidate> extends SealedCandidateSetBase<C> {
  readonly state: "unresolved";
}

export interface ResolvedCandidateSet<C = TranslationCandidate> extends SealedCandidateSetBase<C> {
  readonly state: "resolved";
  readonly winner: StagedCandidate<C>;
}

export interface FailClosedCandidateSet<C = TranslationCandidate> extends SealedCandidateSetBase<C> {
  readonly state: "fail_closed";
  readonly reason: CandidateFailClosedReason;
}

export type SourceCandidateSet<C = TranslationCandidate> =
  | UnresolvedCandidateSet<C>
  | ResolvedCandidateSet<C>
  | FailClosedCandidateSet<C>;

export type CandidateFailClosedReason =
  | "empty_production"
  | "all_members_dropped"
  | "verdict_identity_absent";

export type CandidateDropReason =
  | "frame_source_condition"
  | "slot_contract"
  | "priority_group"
  | "construction_ineligible"
  | "owner_payload_restriction"
  | "lexical_particle_ownership"
  | "head_tail_open_set"
  | "voice_reading_resolution";


export type SourceResolutionWitness =
  | { readonly kind: "unambiguous_domain" }
  | {
    readonly kind: "unstaged_domain";
    readonly entrySenseCount: number;
    readonly stagedPriorityDomain: false;
    readonly verdict: StemCandidateIdentity;
  }
  | {
    readonly kind: "final_commitment";
    readonly layout: ClauseLayout;
    readonly predicateTokenIdx: number;
    readonly verdict: StemCandidateIdentity;
  };


function seal<T extends { readonly [SOURCE_CANDIDATE_SET_SEAL]: true }>(
  value: Omit<T, typeof SOURCE_CANDIDATE_SET_SEAL>
): T {
  return value as unknown as T;
}

export function frameSourceConditionMatchOf(value: string | undefined): FrameSourceConditionMatch {
  return value === "match" || value === "unknown" ? value : "fail";
}

export function stagedCandidate<C extends TranslationCandidate>(
  candidate: C,
  sourceCondition: FrameSourceConditionMatch,
  options: { readonly consumed?: number | null } = {}
): StagedCandidate<C> {
  return {
    candidate,
    identity: translationCandidateIdentity(candidate),
    priorityGroup: contentCandidatePriorityGroup(candidate),
    sourceCondition,
    consumed: options.consumed ?? null
  };
}

export function withStagedCandidateSourceCondition<C>(
  member: StagedCandidate<C>,
  sourceCondition: FrameSourceConditionMatch
): StagedCandidate<C> {
  return member.sourceCondition === sourceCondition ? member : { ...member, sourceCondition };
}

export function withStagedCandidatePayload<C, D>(
  member: StagedCandidate<C>,
  candidate: D
): StagedCandidate<D> {
  return { ...member, candidate };
}

export function createSourceCandidateSet<C>(
  members: readonly StagedCandidate<C>[],
  options: { readonly sharedConsumed: number; readonly origin?: SourceCandidateSetOrigin }
): SourceCandidateSet<C> {
  const origin = options.origin ?? "candidate_lane";
  if (members.length === 0) {
    return seal<FailClosedCandidateSet<C>>({
      state: "fail_closed",
      reason: "empty_production",
      members,
      sharedConsumed: options.sharedConsumed,
      origin
    });
  }
  return seal<UnresolvedCandidateSet<C>>({
    state: "unresolved",
    members,
    sharedConsumed: options.sharedConsumed,
    origin
  });
}


export function resolveSourceCandidateSet<C>(
  set: SourceCandidateSet<C>,
  witness: SourceResolutionWitness
): SourceCandidateSet<C> {
  if (set.state !== "unresolved") {
    return set;
  }
  if (witness.kind === "unambiguous_domain") {
    const only = set.members[0];
    return set.members.length === 1 && only !== undefined
      ? resolvedSet(set, set.members, only)
      : set;
  }
  if (witness.kind === "unstaged_domain") {
    const chosen = set.members.find((member) => stemCandidateIdentitiesEqual(member.identity, witness.verdict));
    return chosen === undefined ? set : resolvedSet(set, set.members, chosen);
  }
  const winner = set.members.find((member) => stemCandidateIdentitiesEqual(member.identity, witness.verdict));
  if (winner === undefined) {
    return seal<FailClosedCandidateSet<C>>({
      state: "fail_closed",
      reason: "verdict_identity_absent",
      members: set.members,
      sharedConsumed: set.sharedConsumed,
      origin: set.origin
    });
  }
  return resolvedSet(set, [winner, ...set.members.filter((member) => member !== winner)], winner);
}

function resolvedSet<C>(
  set: SourceCandidateSet<C>,
  members: readonly StagedCandidate<C>[],
  winner: StagedCandidate<C>
): ResolvedCandidateSet<C> {
  return seal<ResolvedCandidateSet<C>>({
    state: "resolved",
    members,
    winner,
    sharedConsumed: set.sharedConsumed,
    origin: set.origin
  });
}


export type CandidateMemberVerdict<C> =
  | { readonly kind: "keep"; readonly member: StagedCandidate<C> }
  | { readonly kind: "drop"; readonly reason: CandidateDropReason };

export function keepCandidate<C>(member: StagedCandidate<C>): CandidateMemberVerdict<C> {
  return { kind: "keep", member };
}

export function dropCandidate<C>(reason: CandidateDropReason): CandidateMemberVerdict<C> {
  return { kind: "drop", reason };
}

export function transformCandidateSet<C, D = C>(
  set: SourceCandidateSet<C>,
  transform: {
    readonly map: (member: StagedCandidate<C>) => CandidateMemberVerdict<D>;
    readonly introduce?: readonly StagedCandidate<D>[];
    readonly failClosedReason: CandidateFailClosedReason;
  }
): SourceCandidateSet<D> {
  const kept: StagedCandidate<D>[] = [];
  let winner: StagedCandidate<D> | undefined;
  for (const member of set.members) {
    const verdict = transform.map(member);
    if (verdict.kind !== "keep") {
      continue;
    }
    kept.push(verdict.member);
    if (set.state === "resolved" && member === set.winner) {
      winner = verdict.member;
    }
  }
  const introduced = transform.introduce ?? [];
  const members = [...kept, ...introduced];
  if (members.length === 0) {
    return seal<FailClosedCandidateSet<D>>({
      state: "fail_closed",
      reason: transform.failClosedReason,
      members,
      sharedConsumed: set.sharedConsumed,
      origin: set.origin
    });
  }
  if (introduced.length > 0 || set.state !== "resolved" || winner === undefined) {
    return seal<UnresolvedCandidateSet<D>>({
      state: "unresolved",
      members,
      sharedConsumed: set.sharedConsumed,
      origin: set.origin
    });
  }
  return seal<ResolvedCandidateSet<D>>({
    state: "resolved",
    members,
    winner,
    sharedConsumed: set.sharedConsumed,
    origin: set.origin
  });
}


export function isResolvedCandidateSet<C>(
  set: SourceCandidateSet<C> | null | undefined
): set is ResolvedCandidateSet<C> {
  return set?.state === "resolved";
}

export function resolvedWinner<C>(set: ResolvedCandidateSet<C>): StagedCandidate<C> {
  return set.winner;
}

export function resolvedWinnerConsumed<C>(set: ResolvedCandidateSet<C>): number {
  return set.winner.consumed ?? set.sharedConsumed;
}


export function candidateSetSize<C>(set: SourceCandidateSet<C> | null | undefined): number {
  return set?.members.length ?? 0;
}

export function candidateSetIdentities<C>(
  set: SourceCandidateSet<C> | null | undefined
): readonly StemCandidateIdentity[] {
  return (set?.members ?? []).map((member) => member.identity);
}

export function candidateSetMembers<C>(
  set: SourceCandidateSet<C> | null | undefined
): readonly StagedCandidate<C>[] {
  return set?.members ?? [];
}

export function candidateSetCandidates<C>(
  set: SourceCandidateSet<C> | null | undefined
): readonly C[] {
  return (set?.members ?? []).map((member) => member.candidate);
}

export function candidateSetAgreedKoreanPos<C extends { readonly koreanPos?: number }>(
  set: SourceCandidateSet<C> | null | undefined
): number | null {
  const members = set?.members ?? [];
  const first = members[0]?.candidate.koreanPos;
  if (first === undefined || members.length === 0) {
    return null;
  }
  return members.every((member) => member.candidate.koreanPos === first) ? first : null;
}

export function candidateSetSharedConsumed<C>(
  set: SourceCandidateSet<C> | null | undefined,
  fallback: number
): number {
  return set?.sharedConsumed ?? fallback;
}
