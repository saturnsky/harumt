import type { TraceDetailValue } from "../../trace.js";

export type HeadProfileOwnerKind =
  | "assembler"
  | "head_tail"
  | "nominal_head"
  | "predicate_tail";

export type HeadContinuationCapabilityKind =
  | "terminal"
  | "likeness"
  | "attributive"
  | "negation"
  | "past"
  | "polite"
  | "scope_bridge"
  | "connective"
  | "adverbial"
  | "case_frame"
  | "listing"
  | "additive"
  | "reversal"
  | "limit"
  | "degree"
  | "purpose_reason"
  | "example"
  | "dismissive"
  | "indefinite"
  | "focus"
  | "topic"
  | "quote"
  | "attributive_quote"
  | "nominal_frame";

export interface HeadContinuationCapability {
  readonly id: string;
  readonly kind: HeadContinuationCapabilityKind;
  readonly surfaces: readonly string[];
  readonly description?: string;
}

export interface HeadProfileDescriptor {
  readonly id: string;
  readonly arbitrationGroup?: string;
  readonly fallbackOrderKey?: string;
  readonly owner: HeadProfileOwnerKind;
  readonly traceKind?: string;
  readonly continuationCapabilities: readonly HeadContinuationCapability[];
  readonly ownerEvidencePolicies?: readonly HeadOwnerEvidencePolicyDescriptor[];
}

export interface HeadOwnerCandidateDescriptor {
  readonly kind: string;
  readonly profile: HeadProfileDescriptor;
  readonly planKind: string | null;
  readonly sourceSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly payloadSummary?: {
    readonly kind: string;
    readonly consumed: number;
    readonly rootKind: string | null;
  };
  readonly commitmentEvidence?: readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[];
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
  readonly selectedByDispatch: boolean;
  readonly contestedNominalUseSlot?: string;
}

export interface HeadTailCandidateTraceDescriptor {
  readonly tailSourceKind: string;
  readonly headKind: string;
  readonly headAdapterId: string;
  readonly headSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly tailSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly tailRootStart: number;
  readonly sourceSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
  readonly tailSegments: readonly {
    readonly kind: string;
    readonly opKind?: string;
    readonly markerSurface?: string;
    readonly frameKind?: string;
    readonly sourceSpan: {
      readonly start: number;
      readonly endExclusive: number;
    };
  }[];
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly evidenceKinds: readonly string[];
}

export interface HeadOwnerCandidateCommitmentEvidenceDescriptor {
  readonly kind: string;
  readonly reason: string;
}

export interface HeadOwnerEvidencePolicyDescriptor {
  readonly kind: HeadOwnerEvidenceDecisionKind;
  readonly requiredCapabilityIds?: readonly string[];
  readonly description: string;
}

export const OWNER_EVIDENCE_DECISION_ORDER = [
  "bare_stem_nominal_use_slot_verdict",
  "weak_attachment_source_bearing_tail_owner",
  "source_bearing_nominal_frame_owner",
  "quote_boundary_owner",
  "scope_bridge_owner",
  "connective_tail_owner",
  "source_bearing_predicate_tail_owner"
] as const;

export type HeadOwnerEvidenceDecisionKind = typeof OWNER_EVIDENCE_DECISION_ORDER[number];

const OWNER_EVIDENCE_DECISION_KIND_SET: ReadonlySet<string> = new Set(OWNER_EVIDENCE_DECISION_ORDER);

export function isHeadOwnerEvidenceDecisionKind(kind: string): kind is HeadOwnerEvidenceDecisionKind {
  return OWNER_EVIDENCE_DECISION_KIND_SET.has(kind);
}

export type HeadOwnerCandidateSelectionSource =
  | "commitment_owner_evidence"
  | "commitment_payload_evidence"
  | "commitment_default_no_owner_evidence"
  | "dispatch_default_no_commitment_evidence";

export interface HeadOwnerCandidateSelectionEvidence {
  readonly kind: string;
  readonly candidateIndex?: number;
  readonly profileId?: string | null;
  readonly reason: string;
}

export interface HeadOwnerCandidateSelectionContext {
  readonly spanStart: number;
  readonly spanConsumed: number;
  readonly clauseIndex: number | null;
  readonly evidence: readonly HeadOwnerCandidateSelectionEvidence[];
}

export interface HeadOwnerCandidateSelection {
  readonly selectedIndex: number;
  readonly selectedProfileId: string | null;
  readonly source: HeadOwnerCandidateSelectionSource;
  readonly reason: string;
  readonly context?: HeadOwnerCandidateSelectionContext;
}

export interface HeadProfile<Context, Result> {
  readonly id: string;
  readonly arbitrationGroup?: string;
  readonly fallbackOrderKey?: string;
  readonly owner: HeadProfileOwnerKind;
  readonly traceKind?: string;
  readonly continuationCapabilities?: readonly HeadContinuationCapability[];
  readonly ownerEvidencePolicies?: readonly HeadOwnerEvidencePolicyDescriptor[];
  readonly requiredContinuationCapabilityIds?: (result: Result) => readonly string[];
  readonly tryBuild: (context: Context) => Result | null | Promise<Result | null>;
}

export interface HeadProfileMatch<Result> {
  readonly profile: HeadProfileDescriptor;
  readonly result: Result;
  readonly requiredContinuationCapabilityIds: readonly string[];
}

export type HeadProfileArbitrationStrategy =
  | "declaration_order"
  | "arbitration_group_tie_default"
  | "source_span_precedence";

export interface HeadProfileArbitrationDecision<Result> {
  readonly engineId: string;
  readonly strategy: HeadProfileArbitrationStrategy;
  readonly candidates: readonly HeadProfileMatch<Result>[];
  readonly winner: HeadProfileMatch<Result> | null;
  readonly tiedWinners: readonly HeadProfileMatch<Result>[];
  readonly hasArbitrationTie: boolean;
  readonly reason: string;
}

export interface HeadProfileDispatchMetadata<Result> {
  readonly dispatchProfile: HeadProfileDescriptor;
  readonly dispatchCandidates: readonly HeadProfileDescriptor[];
  readonly dispatchDecision: HeadProfileArbitrationDecision<Result>;
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly traceDetail: { readonly [key: string]: TraceDetailValue };
}

export interface HeadProfileDispatchSelection<Result> {
  readonly match: HeadProfileMatch<Result>;
  readonly metadata: HeadProfileDispatchMetadata<Result>;
}

export function headProfileArbitrationTraceDetail<Result>(options: {
  readonly decision: HeadProfileArbitrationDecision<Result>;
  readonly profile?: HeadProfileDescriptor | null;
  readonly candidates?: readonly HeadProfileDescriptor[];
  readonly requiredContinuationCapabilityIds?: readonly string[];
  readonly ownerCandidates?: readonly HeadOwnerCandidateDescriptor[];
}): { readonly [key: string]: TraceDetailValue } {
  return {
    dispatch_engine: options.decision.engineId,
    dispatch_strategy: options.decision.strategy,
    dispatch_reason: options.decision.reason,
    ...(options.profile === undefined || options.profile === null
      ? {}
      : { dispatch_profile: options.profile.id }),
    dispatch_candidates: (options.candidates ?? options.decision.candidates.map((candidate) => candidate.profile))
      .map((profile) => profile.id),
    dispatch_arbitration_tie: options.decision.hasArbitrationTie,
    dispatch_tied_winners: options.decision.tiedWinners.map((candidate) => candidate.profile.id),
    dispatch_candidate_required_continuation_capabilities: options.decision.candidates.map((candidate) => ({
      profile: candidate.profile.id,
      required: candidate.requiredContinuationCapabilityIds
    })),
    ...(options.ownerCandidates === undefined
      ? {}
      : { dispatch_owner_candidates: headOwnerCandidateTraceList(options.ownerCandidates) }),
    required_continuation_capabilities: options.requiredContinuationCapabilityIds ?? []
  };
}

export function headProfileDispatchSelection<Result>(
  decision: HeadProfileArbitrationDecision<Result>,
  options: {
    readonly ownerCandidates?: readonly HeadOwnerCandidateDescriptor[];
  } = {}
): HeadProfileDispatchSelection<Result> | null {
  const match = decision.winner;
  if (match === null) {
    return null;
  }
  const dispatchCandidates = decision.candidates.map((candidate) => candidate.profile);
  return {
    match,
    metadata: {
      dispatchProfile: match.profile,
      dispatchCandidates,
      dispatchDecision: decision,
      requiredContinuationCapabilityIds: match.requiredContinuationCapabilityIds,
      traceDetail: headProfileArbitrationTraceDetail({
        decision,
        profile: match.profile,
        candidates: dispatchCandidates,
        requiredContinuationCapabilityIds: match.requiredContinuationCapabilityIds,
        ...(options.ownerCandidates === undefined ? {} : { ownerCandidates: options.ownerCandidates })
      })
    }
  };
}

export function headOwnerCandidateTraceList(
  candidates: readonly HeadOwnerCandidateDescriptor[]
): readonly TraceDetailValue[] {
  return candidates.map((candidate) => ({
    kind: candidate.kind,
    profile: candidate.profile.id,
    owner: candidate.profile.owner,
    plan_kind: candidate.planKind,
    commitment_fallback_key: candidate.profile.fallbackOrderKey ?? null,
    source_start: candidate.sourceSpan.start,
    source_end_exclusive: candidate.sourceSpan.endExclusive,
    ...(candidate.payloadSummary === undefined
      ? {}
      : {
        payload_kind: candidate.payloadSummary.kind,
        payload_consumed: candidate.payloadSummary.consumed,
        payload_root_kind: candidate.payloadSummary.rootKind
      }),
    ...(candidate.commitmentEvidence === undefined
      ? {}
      : {
        commitment_evidence: candidate.commitmentEvidence.map((evidence) => ({
          kind: evidence.kind,
          reason: evidence.reason
        }))
      }),
    ...(candidate.headTailCandidate === undefined
      ? {}
      : { head_tail_candidate: headTailCandidateTraceValue(candidate.headTailCandidate) }),
    selected_by_dispatch: candidate.selectedByDispatch,
    required_continuation_capabilities: candidate.requiredContinuationCapabilityIds
  }));
}

export function headTailCandidateTraceValue(
  candidate: HeadTailCandidateTraceDescriptor
): TraceDetailValue {
  return {
    tail_source_kind: candidate.tailSourceKind,
    head_kind: candidate.headKind,
    head_adapter: candidate.headAdapterId,
    head_start: candidate.headSpan.start,
    head_end_exclusive: candidate.headSpan.endExclusive,
    tail_start: candidate.tailSpan.start,
    tail_end_exclusive: candidate.tailSpan.endExclusive,
    tail_root_start: candidate.tailRootStart,
    source_start: candidate.sourceSpan.start,
    source_end_exclusive: candidate.sourceSpan.endExclusive,
    tail_segments: candidate.tailSegments.map((segment) => ({
      kind: segment.kind,
      ...(segment.opKind === undefined ? {} : { op_kind: segment.opKind }),
      ...(segment.markerSurface === undefined ? {} : { marker_surface: segment.markerSurface }),
      ...(segment.frameKind === undefined ? {} : { frame_kind: segment.frameKind }),
      source_start: segment.sourceSpan.start,
      source_end_exclusive: segment.sourceSpan.endExclusive
    })),
    required_continuation_capabilities: candidate.requiredContinuationCapabilityIds,
    evidence_kinds: candidate.evidenceKinds
  };
}

export function selectDefaultHeadOwnerCandidate(
  candidates: readonly HeadOwnerCandidateDescriptor[]
): HeadOwnerCandidateSelection | null {
  if (candidates.length === 0) {
    return null;
  }
  const dispatchSelectedIdx = candidates.findIndex((candidate) => candidate.selectedByDispatch);
  const selectedIndex = dispatchSelectedIdx >= 0 ? dispatchSelectedIdx : 0;
  const selectedProfileId = candidates[selectedIndex]?.profile.id ?? null;
  return {
    selectedIndex,
    selectedProfileId,
    source: "dispatch_default_no_commitment_evidence",
    reason: dispatchSelectedIdx >= 0
      ? `selected '${selectedProfileId}' by dispatch default because no commitment evidence selected an owner`
      : `selected '${selectedProfileId}' by first-candidate default because dispatch default was absent`
  };
}

export function selectHeadOwnerCandidate(
  candidates: readonly HeadOwnerCandidateDescriptor[],
  context: HeadOwnerCandidateSelectionContext
): HeadOwnerCandidateSelection | null {
  const selectedByEvidence = selectHeadOwnerCandidateByEvidence(candidates, context);
  if (selectedByEvidence !== null) {
    return selectedByEvidence;
  }
  const fallback = selectCommitmentFallbackHeadOwnerCandidate(candidates);
  return fallback === null ? null : { ...fallback, context };
}

function selectHeadOwnerCandidateByEvidence(
  candidates: readonly HeadOwnerCandidateDescriptor[],
  context: HeadOwnerCandidateSelectionContext
): HeadOwnerCandidateSelection | null {
  const ownerEvidenceSelection = selectHeadOwnerCandidateByOwnerEvidence(candidates, context);
  if (ownerEvidenceSelection !== null) {
    return ownerEvidenceSelection;
  }
  const applicablePayloadEvidence = context.evidence
    .filter((evidence) => evidence.kind === "commitment_payload_applicable" && typeof evidence.candidateIndex === "number");
  const applicableIndices = [...new Set(applicablePayloadEvidence.map((evidence) => evidence.candidateIndex as number))]
    .filter((index) => candidates[index] !== undefined);
  if (applicableIndices.length !== 1) {
    return null;
  }
  const selectedIndex = applicableIndices[0]!;
  const selectedProfileId = candidates[selectedIndex]?.profile.id ?? null;
  return {
    selectedIndex,
    selectedProfileId,
    source: "commitment_payload_evidence",
    reason: `selected '${selectedProfileId}' because it is the only owner candidate with an applicable commitment payload`,
    context
  };
}

function selectHeadOwnerCandidateByOwnerEvidence(
  candidates: readonly HeadOwnerCandidateDescriptor[],
  context: HeadOwnerCandidateSelectionContext
): HeadOwnerCandidateSelection | null {
  const ownerEvidenceSelection = selectCandidateByOwnerEvidenceDecisionOrder(
    candidates.map((_, candidateIndex) =>
      context.evidence
        .filter((evidence): evidence is HeadOwnerCandidateSelectionEvidence & {
          readonly candidateIndex: number;
          readonly kind: HeadOwnerEvidenceDecisionKind;
        } =>
          evidence.candidateIndex === candidateIndex &&
          isHeadOwnerEvidenceDecisionKind(evidence.kind)
        )
        .map((evidence) => ({
          kind: evidence.kind,
          reason: evidence.reason
        }))
    )
  );
  if (ownerEvidenceSelection === null) {
    return null;
  }
  const selectedIndex = ownerEvidenceSelection.candidateIndex;
  const selectedProfileId = candidates[selectedIndex]?.profile.id ?? null;
  const bestEvidence = ownerEvidenceSelection.evidence;
  const decisionStep = ownerEvidenceSelection.orderIndex + 1;
  return {
    selectedIndex,
    selectedProfileId,
    source: "commitment_owner_evidence",
    reason: `selected '${selectedProfileId}' by owner evidence decision step ${decisionStep} (${bestEvidence.kind}): ${bestEvidence.reason}`,
    context
  };
}

export interface HeadOwnerEvidenceDecisionSelection {
  readonly candidateIndex: number;
  readonly orderIndex: number;
  readonly evidence: HeadOwnerCandidateCommitmentEvidenceDescriptor;
}

export function selectCandidateByOwnerEvidenceDecisionOrder(
  candidateEvidence: readonly (readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[])[]
): HeadOwnerEvidenceDecisionSelection | null {
  for (const [orderIndex, kind] of OWNER_EVIDENCE_DECISION_ORDER.entries()) {
    const matches = candidateEvidence.flatMap((evidenceList, candidateIndex) =>
      evidenceList
        .filter((evidence) => evidence.kind === kind)
        .map((evidence) => ({ candidateIndex, evidence }))
    );
    if (matches.length === 0) {
      continue;
    }
    const candidateIndices = [...new Set(matches.map((match) => match.candidateIndex))];
    if (candidateIndices.length !== 1) {
      return null;
    }
    const candidateIndex = candidateIndices[0]!;
    return {
      candidateIndex,
      orderIndex,
      evidence: matches.find((match) => match.candidateIndex === candidateIndex)!.evidence
    };
  }
  return null;
}

export const COMMITMENT_FALLBACK_PROFILE_ORDER = [
  "nominal_head_tail_candidate",
  "predicate_root_tail_candidate"
] as const;

function selectCommitmentFallbackHeadOwnerCandidate(
  candidates: readonly HeadOwnerCandidateDescriptor[]
): HeadOwnerCandidateSelection | null {
  if (candidates.length === 0) {
    return null;
  }
  for (const fallbackKey of COMMITMENT_FALLBACK_PROFILE_ORDER) {
    const matching = candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter((item) => (item.candidate.profile.fallbackOrderKey ?? item.candidate.profile.id) === fallbackKey);
    if (matching.length === 0) {
      continue;
    }
    const selected = matching.find((item) => item.candidate.selectedByDispatch) ?? matching[0]!;
    const selectedProfileId = selected.candidate.profile.id;
    return {
      selectedIndex: selected.index,
      selectedProfileId,
      source: "commitment_default_no_owner_evidence",
      reason: matching.length === 1
        ? `selected '${selectedProfileId}' by commitment fallback order '${fallbackKey}' because no owner evidence selected a candidate`
        : `selected '${selectedProfileId}' by dispatch tiebreaker among commitment fallback order '${fallbackKey}' candidates because no owner evidence selected a candidate`
    };
  }
  return selectDefaultHeadOwnerCandidate(candidates);
}

export function headOwnerCandidateSelectionEvidenceTraceList(
  evidence: readonly HeadOwnerCandidateSelectionEvidence[]
): readonly TraceDetailValue[] {
  return evidence.map((item) => ({
    kind: item.kind,
    ...(item.candidateIndex === undefined ? {} : { candidate_index: item.candidateIndex }),
    ...(item.profileId === undefined ? {} : { profile: item.profileId }),
    reason: item.reason
  }));
}

export interface HeadedParserEngine<Context, Result> {
  readonly id: string;
  tryBuild(context: Context): Promise<Result | null>;
  tryBuildMatch(context: Context): Promise<HeadProfileMatch<Result> | null>;
  tryBuildMatches(context: Context): Promise<readonly HeadProfileMatch<Result>[]>;
  arbitrate(context: Context): Promise<HeadProfileArbitrationDecision<Result>>;
  describe(): readonly HeadProfileDescriptor[];
}

export function defineHeadedParserEngine<Context, Result>(options: {
  readonly id: string;
  readonly profiles: readonly HeadProfile<Context, Result>[];
  readonly allowArbitrationGroupTies?: boolean;
}): HeadedParserEngine<Context, Result> {
  const orderedProfiles = validateProfiles(options.id, options.profiles, options.allowArbitrationGroupTies === true);
  const descriptors = orderedProfiles.map(describeHeadProfile);
  const tryBuildMatches = async (context: Context): Promise<readonly HeadProfileMatch<Result>[]> => {
    const matches: HeadProfileMatch<Result>[] = [];
    for (const profile of orderedProfiles) {
      const result = await profile.tryBuild(context);
      if (result !== null) {
        const requiredContinuationCapabilityIds = requiredContinuationCapabilities(profile, result);
        validateRequiredContinuationCapabilities(options.id, profile, requiredContinuationCapabilityIds);
        matches.push({
          profile: describeHeadProfile(profile),
          result,
          requiredContinuationCapabilityIds
        });
      }
    }
    return matches;
  };
  const tryBuildMatch = async (context: Context): Promise<HeadProfileMatch<Result> | null> => {
    return (await arbitrate(context)).winner;
  };
  const arbitrate = async (context: Context): Promise<HeadProfileArbitrationDecision<Result>> => {
    const candidates = await tryBuildMatches(context);
    const winner = candidates[0] ?? null;
    const winnerArbitrationGroup = winner?.profile.arbitrationGroup;
    const tiedWinners = winner === null
      ? []
      : winnerArbitrationGroup === undefined
        ? [winner]
        : candidates.filter((candidate) => candidate.profile.arbitrationGroup === winnerArbitrationGroup);
    const hasArbitrationTie = tiedWinners.length > 1;
    return {
      engineId: options.id,
      strategy: hasArbitrationTie ? "arbitration_group_tie_default" : "declaration_order",
      candidates,
      winner,
      tiedWinners,
      hasArbitrationTie,
      reason: winner === null
        ? "no head profile matched"
        : hasArbitrationTie
          ? `arbitration group '${winnerArbitrationGroup}' matched ${tiedWinners.map((candidate) => `'${candidate.profile.id}'`).join(", ")}; ` +
          `selected '${winner.profile.id}' by declaration-order default`
          : `selected profile '${winner.profile.id}' by declaration order`
    };
  };
  return {
    id: options.id,
    async tryBuild(context: Context): Promise<Result | null> {
      return (await tryBuildMatch(context))?.result ?? null;
    },
    async tryBuildMatch(context: Context): Promise<HeadProfileMatch<Result> | null> {
      return tryBuildMatch(context);
    },
    async tryBuildMatches(context: Context): Promise<readonly HeadProfileMatch<Result>[]> {
      return tryBuildMatches(context);
    },
    async arbitrate(context: Context): Promise<HeadProfileArbitrationDecision<Result>> {
      return arbitrate(context);
    },
    describe(): readonly HeadProfileDescriptor[] {
      return descriptors;
    }
  };
}

export function collectHeadProfileContinuationCapabilities(
  profiles: readonly HeadProfileDescriptor[]
): readonly HeadContinuationCapability[] {
  return profiles.flatMap((profile) => profile.continuationCapabilities);
}

function describeHeadProfile<Context, Result>(profile: HeadProfile<Context, Result>): HeadProfileDescriptor {
  return {
    id: profile.id,
    ...(profile.arbitrationGroup === undefined ? {} : { arbitrationGroup: profile.arbitrationGroup }),
    ...(profile.fallbackOrderKey === undefined ? {} : { fallbackOrderKey: profile.fallbackOrderKey }),
    owner: profile.owner,
    ...(profile.traceKind === undefined ? {} : { traceKind: profile.traceKind }),
    continuationCapabilities: profile.continuationCapabilities ?? [],
    ...(profile.ownerEvidencePolicies === undefined ? {} : { ownerEvidencePolicies: profile.ownerEvidencePolicies })
  };
}

function validateProfiles<Context, Result>(
  engineId: string,
  profiles: readonly HeadProfile<Context, Result>[],
  allowArbitrationGroupTies: boolean
): readonly HeadProfile<Context, Result>[] {
  const ids = new Set<string>();
  const arbitrationGroups = new Map<string, string>();
  for (const profile of profiles) {
    if (ids.has(profile.id)) {
      throw new Error(`headed parser engine '${engineId}' has duplicate profile id '${profile.id}'`);
    }
    ids.add(profile.id);
    const arbitrationGroup = profile.arbitrationGroup;
    const existingGroupOwner = arbitrationGroup === undefined ? undefined : arbitrationGroups.get(arbitrationGroup);
    if (arbitrationGroup !== undefined && existingGroupOwner !== undefined && !allowArbitrationGroupTies) {
      throw new Error(
        `headed parser engine '${engineId}' has duplicate arbitration group '${arbitrationGroup}' ` +
        `for profiles '${existingGroupOwner}' and '${profile.id}'`
      );
    }
    if (arbitrationGroup !== undefined && existingGroupOwner === undefined) {
      arbitrationGroups.set(arbitrationGroup, profile.id);
    }
    validateContinuationCapabilities(engineId, profile);
  }
  return [...profiles];
}

function validateContinuationCapabilities<Context, Result>(
  engineId: string,
  profile: HeadProfile<Context, Result>
): void {
  const ids = new Set<string>();
  for (const capability of profile.continuationCapabilities ?? []) {
    if (ids.has(capability.id)) {
      throw new Error(
        `headed parser engine '${engineId}' profile '${profile.id}' has duplicate continuation capability id '${capability.id}'`
      );
    }
    ids.add(capability.id);
  }
}

function requiredContinuationCapabilities<Context, Result>(
  profile: HeadProfile<Context, Result>,
  result: Result
): readonly string[] {
  return profile.requiredContinuationCapabilityIds?.(result) ?? [];
}

function validateRequiredContinuationCapabilities<Context, Result>(
  engineId: string,
  profile: HeadProfile<Context, Result>,
  required: readonly string[]
): void {
  if (required.length === 0) {
    return;
  }
  const declared = new Set((profile.continuationCapabilities ?? []).map((capability) => capability.id));
  for (const capabilityId of required) {
    if (!declared.has(capabilityId)) {
      throw new Error(
        `headed parser engine '${engineId}' profile '${profile.id}' produced result requiring ` +
        `undeclared continuation capability '${capabilityId}'`
      );
    }
  }
}
