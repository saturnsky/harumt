import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { LookupTables } from "../lookup-tables.js";
import { bareStemNominalUseYieldsToVerbalPredicateHost, mixedPosSlot } from "../candidate-runtime.js";
import { headOwnerCandidateTraceList, headOwnerCandidateSelectionEvidenceTraceList, selectHeadOwnerCandidate, type HeadOwnerCandidateDescriptor, type HeadOwnerCandidateSelectionEvidence } from "../head-tail/head/profile.js";
import { applyHeadOwnerCandidatePayloadToSpan } from "../head-tail/candidate/owner-payload.js";
import { candidateSetMembers } from "../source-candidate-set.js";
import { collectAuxTokens } from "../matchers.js";
import type { TokenCursor } from "../token-cursor.js";
import { TraceEvent, type TraceCollector, type TraceDetailValue } from "../trace.js";
import type { CommitmentContentMap, CommitmentSpan, CommitmentToken, HeadOwnerCandidateCommitmentPayload, HeadOwnerCandidateCommitmentPayloadSlot } from "./types.js";
import { commitmentCandidateView, runtimeTokens, withTraceClauseIdx } from "./span-evidence.js";
import { narrowCandidatesByFinalFrameEvidence } from "./stem-candidate-selection.js";
import { predicateRootOwnerRejectsBareNounStem } from "./candidate-projection.js";

interface OwnerCandidateSlotVerdictContext {
  readonly tokens: readonly CommitmentToken[];
  readonly contentMap: CommitmentContentMap;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly baseCursor: TokenCursor<CommitmentToken>;
}

function quotedContentPropositionConfirmed(
  observedSlot: string | undefined,
  idx: number,
  layout: ClauseLayout
): boolean {
  return observedSlot !== "quoted_nominal" || layout.quoteHostOfQuotedPredicate(idx) !== undefined;
}

function bareStemNominalUseSlotVerdictEvidence(
  idx: number,
  span: CommitmentSpan,
  ownerCandidates: readonly HeadOwnerCandidateDescriptor[],
  layout: ClauseLayout,
  context: OwnerCandidateSlotVerdictContext | undefined
): readonly HeadOwnerCandidateSelectionEvidence[] {
  if (context === undefined) {
    return [];
  }
  const claimIndex = ownerCandidates.findIndex((candidate) => candidate.contestedNominalUseSlot !== undefined);
  const contentLaneIndex = ownerCandidates.findIndex((candidate) => candidate.selectedByDispatch);
  if (claimIndex < 0 || contentLaneIndex < 0) {
    return [];
  }
  const contestedSlot = ownerCandidates[claimIndex]!.contestedNominalUseSlot;
  const { tokens, contentMap, lookups, numeric, baseCursor } = context;
  const slotCursor = baseCursor.fork(idx);
  const auxCursor = slotCursor.retarget(runtimeTokens(tokens), idx + 1, tokens.length, idx + 1);
  const observedSlot = mixedPosSlot(slotCursor, collectAuxTokens(auxCursor), { lookups, clauseReach: layout });
  const claimPlan = span.ownerCandidatePayloads
    ?.find((slot) => slot.candidateIndex === claimIndex)?.payload?.renderPlan ?? null;
  const openMembers = candidateSetMembers(span.sourceCandidates);
  const narrowing = narrowCandidatesByFinalFrameEvidence(
    span,
    tokens,
    idx,
    layout,
    contentMap,
    lookups,
    numeric,
    span.sourceCandidates ?? null,
    openMembers,
    openMembers.map((member) => member.candidate)
  );
  const workingCandidates = narrowing.kind === "narrowed" ? narrowing.workingCandidates : [];
  const claimOwnsPosition = observedSlot === contestedSlot &&
    quotedContentPropositionConfirmed(observedSlot, idx, layout) &&
    (bareStemNominalUseYieldsToVerbalPredicateHost(workingCandidates.map(commitmentCandidateView)) ||
      predicateRootOwnerRejectsBareNounStem(claimPlan));
  span.contestedNominalUseOwner = claimOwnsPosition ? "predicate_claim" : "content_lane";
  const selectedIndex = claimOwnsPosition ? claimIndex : contentLaneIndex;
  return [{
    kind: "bare_stem_nominal_use_slot_verdict",
    candidateIndex: selectedIndex,
    profileId: ownerCandidates[selectedIndex]?.profile.id ?? null,
    reason: claimOwnsPosition
      ? `bare-stem nominal use yields at contested slot '${String(contestedSlot)}'; the zero-copula predicate claim owns the span`
      : `bare-stem nominal use holds at contested slot '${String(contestedSlot)}' (observed '${String(observedSlot)}'); the content lane owns the span`
  }];
}

export function commitOwnerCandidateSelection(
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  slotVerdictContext?: OwnerCandidateSlotVerdictContext
): void {
  const ownerCandidates = span.ownerCandidates ?? [];
  const evidence = [
    ...ownerCandidatePayloadEvidence(
      ownerCandidates,
      span.ownerCandidatePayloads ?? [],
      idx,
      span.consumed
    ),
    ...bareStemNominalUseSlotVerdictEvidence(idx, span, ownerCandidates, layout, slotVerdictContext)
  ];
  const selection = selectHeadOwnerCandidate(ownerCandidates, {
    spanStart: idx,
    spanConsumed: span.consumed,
    clauseIndex: layout.clauseIndexOfToken(idx),
    evidence
  });
  if (selection === null) {
    return;
  }
  span.selectedOwnerCandidateIdx = selection.selectedIndex;
  span.ownerCandidateSelectionSource = selection.source;
  const selectedCandidate = ownerCandidates[selection.selectedIndex] ?? null;
  const selectedPayload = span.ownerCandidatePayloads?.[selection.selectedIndex]?.payload ?? null;
  const payloadApplied = selectedPayload !== null &&
    selectedCandidate?.selectedByDispatch !== true &&
    applySelectedHeadOwnerCandidatePayload(span, selectedPayload, idx);
  if (span.contestedNominalUseOwner === "predicate_claim" && !payloadApplied) {
    span.contestedNominalUseOwner = "content_lane";
  }
  if (trace === null || ownerCandidates.length <= 1) {
    return;
  }
  trace.record(new TraceEvent(
    idx,
    "commitment",
    "owner_candidate_commitment",
    true,
    withTraceClauseIdx({
      selected_profile: selection.selectedProfileId,
      selection_source: selection.source,
      selection_reason: selection.reason,
      selection_context: {
        span_start: selection.context?.spanStart ?? idx,
        span_consumed: selection.context?.spanConsumed ?? span.consumed,
        clause_idx: selection.context?.clauseIndex ?? null,
        evidence_count: selection.context?.evidence.length ?? 0
      },
      selection_evidence: headOwnerCandidateSelectionEvidenceTraceList(selection.context?.evidence ?? []),
      selected_payload_applied: payloadApplied,
      owner_candidate_payloads: headOwnerCandidatePayloadTraceList(span.ownerCandidatePayloads ?? []),
      owner_candidates: headOwnerCandidateTraceList(ownerCandidates)
    }, layout.clauseIndexOfToken(idx))
  ));
}

function ownerCandidatePayloadEvidence(
  candidates: readonly HeadOwnerCandidateDescriptor[],
  payloadSlots: readonly HeadOwnerCandidateCommitmentPayloadSlot[],
  spanStart: number,
  spanConsumed: number
): readonly HeadOwnerCandidateSelectionEvidence[] {
  const evidence: HeadOwnerCandidateSelectionEvidence[] = [];
  for (const [candidateIndex, candidate] of candidates.entries()) {
    const slot = payloadSlots.find((payloadSlot) => payloadSlot.candidateIndex === candidateIndex);
    const profileId = candidate.profile.id;
    if (slot === undefined || slot.payload === null) {
      evidence.push({
        kind: "commitment_payload_missing",
        candidateIndex,
        profileId,
        reason: slot?.unavailableReason ?? "owner candidate has no commitment payload slot"
      });
      continue;
    }
    if (slot.payload.start !== spanStart || slot.payload.consumed !== spanConsumed) {
      evidence.push({
        kind: "commitment_payload_span_mismatch",
        candidateIndex,
        profileId,
        reason: `payload span ${slot.payload.start}+${slot.payload.consumed} does not match committed span ${spanStart}+${spanConsumed}`
      });
      continue;
    }
    evidence.push({
      kind: "commitment_payload_applicable",
      candidateIndex,
      profileId,
      reason: "owner candidate payload matches committed span"
    });
    if (candidate.commitmentEvidence !== undefined) {
      for (const descriptor of candidate.commitmentEvidence) {
        evidence.push({
          kind: descriptor.kind,
          candidateIndex,
          profileId,
          reason: descriptor.reason
        });
      }
    }
  }
  return evidence;
}

function applySelectedHeadOwnerCandidatePayload(
  span: CommitmentSpan,
  payload: HeadOwnerCandidateCommitmentPayload,
  spanStart: number
): boolean {
  return applyHeadOwnerCandidatePayloadToSpan(span, payload, {
    expectedStart: spanStart,
    expectedConsumed: span.consumed,
    clearAbsent: true,
    preserveExistingCandidateOrder: true
  });
}

function headOwnerCandidatePayloadTraceList(
  payloads: readonly HeadOwnerCandidateCommitmentPayloadSlot[]
): readonly TraceDetailValue[] {
  return payloads.map((slot) => ({
    candidate_index: slot.candidateIndex,
    candidate_kind: slot.candidateKind,
    profile: slot.profileId,
    available: slot.payload !== null,
    ...(slot.payload === null
      ? { unavailable_reason: slot.unavailableReason ?? null }
      : {
        kind: slot.payload.kind,
        start: slot.payload.start,
        consumed: slot.payload.consumed,
        korean_pos: slot.payload.koreanPos,
        plan_kind: slot.payload.renderPlan?.kind ?? null,
        provenance: slot.payload.provenance
      })
  }));
}
