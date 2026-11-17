import type {
  HeadOwnerCandidateCommitmentEvidenceDescriptor,
  HeadOwnerEvidencePolicyDescriptor
} from "../head/profile.js";
import type { HeadTailGuardrailDescriptor } from "../audit/types.js";

const SOURCE_BEARING_NOMINAL_FRAME_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "source_bearing_nominal_frame_owner",
  description: ""
};

const SOURCE_BEARING_PREDICATE_TAIL_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "source_bearing_predicate_tail_owner",
  description: ""
};

const PREDICATE_TAIL_QUOTE_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "quote_boundary_owner",
  requiredCapabilityIds: ["predicate_tail_quote"],
  description: ""
};

const PREDICATE_TAIL_SCOPE_BRIDGE_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "scope_bridge_owner",
  requiredCapabilityIds: ["predicate_tail_scope_bridge"],
  description: ""
};

const PREDICATE_TAIL_CONNECTIVE_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "connective_tail_owner",
  requiredCapabilityIds: ["predicate_tail_connective"],
  description: ""
};

const BARE_STEM_NOMINAL_USE_SLOT_VERDICT_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "bare_stem_nominal_use_slot_verdict",
  description: ""
};

export function bareStemNominalUseSlotVerdictPolicies(): readonly HeadOwnerEvidencePolicyDescriptor[] {
  return [BARE_STEM_NOMINAL_USE_SLOT_VERDICT_POLICY];
}

const PREDICATE_TAIL_WEAK_ATTACHMENT_POLICY: HeadOwnerEvidencePolicyDescriptor = {
  kind: "weak_attachment_source_bearing_tail_owner",
  description: ""
};

export function describeOwnerEvidenceGuardrails(): readonly HeadTailGuardrailDescriptor[] {
  return [
    {
      id: "nominal_source_bearing_owner_evidence",
      kind: "owner_evidence_contract",
      required: true,
      description: ""
    },
    {
      id: "tail_source_bearing_owner_evidence",
      kind: "owner_evidence_contract",
      required: true,
      description: ""
    },
    {
      id: "tail_continuation_owner_evidence",
      kind: "owner_evidence_contract",
      required: true,
      description: ""
    }
  ];
}

export function sourceBearingNominalFrameOwnerEvidencePolicies(): readonly HeadOwnerEvidencePolicyDescriptor[] {
  return [SOURCE_BEARING_NOMINAL_FRAME_POLICY];
}

export function predicateTailOwnerEvidencePolicies(): readonly HeadOwnerEvidencePolicyDescriptor[] {
  return [
    SOURCE_BEARING_PREDICATE_TAIL_POLICY,
    PREDICATE_TAIL_QUOTE_POLICY,
    PREDICATE_TAIL_SCOPE_BRIDGE_POLICY,
    PREDICATE_TAIL_CONNECTIVE_POLICY,
    PREDICATE_TAIL_WEAK_ATTACHMENT_POLICY
  ];
}

export function sourceBearingNominalFrameOwnerEvidence(
  rootKind: string
): readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[] {
  return [instantiateOwnerEvidence(SOURCE_BEARING_NOMINAL_FRAME_POLICY, {
    reason: `candidate owns source-bearing nominal frame root '${rootKind}'`
  })];
}

export function predicateTailOwnerEvidence(options: {
  readonly rootKind: string;
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly weakAttachment?: boolean;
}): readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[] {
  const evidence: HeadOwnerCandidateCommitmentEvidenceDescriptor[] = [instantiateOwnerEvidence(
    SOURCE_BEARING_PREDICATE_TAIL_POLICY,
    {
      reason: `candidate owns source-bearing predicate tail root '${options.rootKind}'`
    }
  )];
  const continuationPolicies = [
    {
      policy: PREDICATE_TAIL_QUOTE_POLICY,
      reason: "candidate owns predicate quote boundary continuation"
    },
    {
      policy: PREDICATE_TAIL_SCOPE_BRIDGE_POLICY,
      reason: "candidate owns predicate scope bridge continuation"
    },
    {
      policy: PREDICATE_TAIL_CONNECTIVE_POLICY,
      reason: "candidate owns predicate connective continuation"
    }
  ] as const;
  for (const item of continuationPolicies) {
    const requiredCapabilityIds = item.policy.requiredCapabilityIds ?? [];
    if (requiredCapabilityIds.some((capabilityId) => options.requiredContinuationCapabilityIds.includes(capabilityId))) {
      evidence.push(instantiateOwnerEvidence(item.policy, { reason: item.reason }));
    }
  }
  if (options.weakAttachment === true) {
    evidence.push(instantiateOwnerEvidence(PREDICATE_TAIL_WEAK_ATTACHMENT_POLICY, {
      reason: "candidate preserves a source-bearing tail boundary with weak external attachment evidence"
    }));
  }
  return evidence;
}

function instantiateOwnerEvidence(
  policy: HeadOwnerEvidencePolicyDescriptor,
  options: { readonly reason: string }
): HeadOwnerCandidateCommitmentEvidenceDescriptor {
  return {
    kind: policy.kind,
    reason: options.reason
  };
}
