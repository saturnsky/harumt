import { spanLocalRenderPlanNode, type RenderPlan } from "../../../types/render-plan.js";
import type { BenefactiveContext, DekiruReading, NareruReading, RareruReading } from "../../../types/pipeline.js";
import type { Voice } from "../../../types/render-plan.js";
import type { UnitType, TranslationUnitProvenance } from "../../translation/unit.js";
import type {
  CommitmentCandidate,
  HeadOwnerCandidateCommitmentPayload,
  HeadOwnerCandidateCommitmentPayloadSlot
} from "../../deferred-commitment.js";
import type { HeadOwnerCandidateDescriptor } from "../head/profile.js";
import {
  candidateSetMembers,
  dropCandidate,
  keepCandidate,
  transformCandidateSet,
  type StagedCandidate
} from "../../source-candidate-set.js";

export interface HeadOwnerCandidatePayloadWritableSpan {
  consumed: number;
  korean: string;
  koreanBase?: string | null;
  koreanPos: number;
  entry: HeadOwnerCandidateCommitmentPayload["entry"];
  renderPlan?: RenderPlan | null;
  voice?: Voice | null;
  nareruReadings?: ReadonlySet<NareruReading>;
  rareruReadings?: ReadonlySet<RareruReading>;
  dekiruReadings?: ReadonlySet<DekiruReading>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
  isKeijoujiVerbPredicate?: boolean;
  benefactive?: BenefactiveContext | null;
  sourceCandidates?: HeadOwnerCandidateCommitmentPayload["sourceCandidates"];
  unitType?: UnitType;
  attachLeft?: boolean;
  provenance?: TranslationUnitProvenance;
  provenanceReason?: string | null;
}

export interface HeadOwnerCandidateSetWritableSpan extends HeadOwnerCandidatePayloadWritableSpan {
  ownerCandidates?: readonly HeadOwnerCandidateDescriptor[];
  ownerCandidatePayloads?: readonly HeadOwnerCandidateCommitmentPayloadSlot[];
}

type PayloadCandidateSet = NonNullable<HeadOwnerCandidateCommitmentPayload["sourceCandidates"]>;
type PayloadCandidateMember = StagedCandidate<CommitmentCandidate>;

export function attachHeadOwnerCandidateSetToSpan(options: {
  readonly span: HeadOwnerCandidateSetWritableSpan;
  readonly ownerCandidates: readonly HeadOwnerCandidateDescriptor[];
  readonly payloadSlots: readonly HeadOwnerCandidateCommitmentPayloadSlot[];
  readonly selectedSpanStart: number;
  readonly applyDispatchDefault?: boolean;
}): readonly HeadOwnerCandidateCommitmentPayloadSlot[] {
  options.span.ownerCandidates = options.ownerCandidates;
  options.span.ownerCandidatePayloads = options.payloadSlots;
  if (options.applyDispatchDefault === false) {
    return options.payloadSlots;
  }
  const selectedPayload = options.payloadSlots
    .find((slot) => options.ownerCandidates[slot.candidateIndex]?.selectedByDispatch === true)
    ?.payload ?? null;
  if (selectedPayload !== null) {
    applyHeadOwnerCandidatePayloadToSpan(options.span, selectedPayload, {
      expectedStart: options.selectedSpanStart,
      expectedConsumed: options.span.consumed,
      clearAbsent: true,
      preserveExistingCandidateOrder: true
    });
  }
  return options.payloadSlots;
}

export function applyHeadOwnerCandidatePayloadToSpan(
  span: HeadOwnerCandidatePayloadWritableSpan,
  payload: HeadOwnerCandidateCommitmentPayload,
  options: {
    readonly expectedStart?: number;
    readonly expectedConsumed?: number;
    readonly clearAbsent?: boolean;
    readonly preserveExistingCandidateOrder?: boolean;
  } = {}
): boolean {
  if (options.expectedStart !== undefined && payload.start !== options.expectedStart) {
    return false;
  }
  if (options.expectedConsumed !== undefined && payload.consumed !== options.expectedConsumed) {
    return false;
  }
  if (payload.consumed !== span.consumed) {
    return false;
  }
  const clearAbsent = options.clearAbsent ?? true;
  span.korean = payload.korean;
  span.koreanBase = payload.koreanBase ?? null;
  span.koreanPos = payload.koreanPos;
  span.entry = payload.entry;
  span.renderPlan = spanLocalRenderPlanNode(payload.renderPlan);
  assignOptional(span, "voice", payload.voice, clearAbsent);
  assignOptional(span, "nareruReadings", payload.nareruReadings, clearAbsent);
  assignOptional(span, "rareruReadings", payload.rareruReadings, clearAbsent);
  assignOptional(span, "dekiruReadings", payload.dekiruReadings, clearAbsent);
  assignOptional(span, "hasNegative", payload.hasNegative, clearAbsent);
  assignOptional(span, "hasCausative", payload.hasCausative, clearAbsent);
  assignOptional(span, "hasCausativePassive", payload.hasCausativePassive, clearAbsent);
  assignOptional(span, "hasRequestTail", payload.hasRequestTail, clearAbsent);
  assignOptional(span, "hasBenefactiveTail", payload.hasBenefactiveTail, clearAbsent);
  assignOptional(span, "connectiveRole", payload.connectiveRole, clearAbsent);
  assignOptional(span, "isKeijoujiVerbPredicate", payload.isKeijoujiVerbPredicate, clearAbsent);
  if (payload.benefactive !== undefined || clearAbsent) {
    span.benefactive = payload.benefactive ?? null;
  }
  const payloadCandidates = payload.sourceCandidates;
  if (payloadCandidates !== undefined) {
    const existingCandidates = span.sourceCandidates;
    const reordered = options.preserveExistingCandidateOrder === true &&
      existingCandidates !== undefined &&
      existingCandidates !== null &&
      payloadCandidates !== null
      ? payloadCandidatesInExistingOrder(existingCandidates, payloadCandidates)
      : null;
    span.sourceCandidates = reordered ?? payloadCandidates;
  } else if (clearAbsent) {
    delete span.sourceCandidates;
  }
  span.unitType = payload.unitType;
  span.attachLeft = payload.attachLeft;
  span.provenance = payload.provenance;
  span.provenanceReason = payload.provenanceReason ?? null;
  return true;
}

function payloadCandidatesInExistingOrder(
  existingCandidates: PayloadCandidateSet,
  payloadCandidates: PayloadCandidateSet
): PayloadCandidateSet | null {
  const payloadMembers = candidateSetMembers(payloadCandidates);
  if (existingCandidates.members.length !== payloadMembers.length) {
    return null;
  }
  const used = new Set<number>();
  let matched = true;
  const reordered = transformCandidateSet<CommitmentCandidate, CommitmentCandidate>(existingCandidates, {
    map: (existingMember) => {
      const payloadIndex = payloadMembers.findIndex((payloadMember, candidateIdx) =>
        !used.has(candidateIdx) && payloadCandidateIdentityMatches(existingMember, payloadMember)
      );
      if (payloadIndex < 0) {
        matched = false;
        return dropCandidate("owner_payload_restriction");
      }
      used.add(payloadIndex);
      return keepCandidate(payloadMembers[payloadIndex]!);
    },
    failClosedReason: "all_members_dropped"
  });
  return matched ? reordered : null;
}

function payloadCandidateIdentityMatches(left: PayloadCandidateMember, right: PayloadCandidateMember): boolean {
  return payloadCandidateIdentityKey(left.candidate) === payloadCandidateIdentityKey(right.candidate);
}

function payloadCandidateIdentityKey(candidate: CommitmentCandidate): string {
  const translation = candidate.translation;
  return [
    translation?.senseIndex ?? "sense:?",
    candidate.projectionOrdinal ?? "projection:?",
    translation?.priorityGroup ?? "group:?",
    translation?.priorityInGroup ?? candidate.priority ?? "order:?",
    candidate.koreanLemma ?? candidate.korean ?? translation?.korean ?? "lemma:?",
    candidate.koreanPos ?? translation?.koreanPos ?? "pos:?"
  ].join("\u0000");
}

function assignOptional<Key extends keyof HeadOwnerCandidatePayloadWritableSpan>(
  span: HeadOwnerCandidatePayloadWritableSpan,
  key: Key,
  value: HeadOwnerCandidatePayloadWritableSpan[Key] | undefined,
  clearAbsent: boolean
): void {
  if (value === undefined) {
    if (clearAbsent) {
      delete span[key];
    }
    return;
  }
  span[key] = value;
}
