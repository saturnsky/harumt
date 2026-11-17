import type { ClauseLayout } from "../../../clause-layout/index.js";
import { nextNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";
import { toiuAttributiveHeadIndex, toiuAttributiveTailEnd } from "../../../semantics/marker-roles.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import {
  POS0,
  POS5A,
  代名詞,
  isKoreanNounAble,
  isNominalLike,
  koreanNounLemma,
  意志推量形_,
  부사,
  동사,
  명사,
  형용사
} from "../../../../types/pos.js";
import type {
  AuxOpKind,
  AuxOpNode,
  CandidateCapability,
  CarrierHeadContract,
  CandidateSetStem,
  HeadHypothesisCandidate,
  HeadHypothesisCarrier,
  HeadTailEvidenceCandidateContractMaterializability,
  HeadTailEvidenceCandidateDecision,
  HeadTailEvidenceDecision,
  HeadTailEvidenceRealizationChoiceDecision,
  HeadTailEvidenceRuleDecision,
  HeadTailEvidenceSelectedRealizationChoice,
  HeadProjectionKind,
  HeadLicensing,
  HeadRealization,
  QuoteBoundaryPayload,
  QuoteBoundaryKoreanClauseForm,
  StemCandidate,
  StemCandidateRealization,
  StemNode,
  TerminalKind,
  TerminalPayload
} from "./grammar.js";
import {
  headContractForConnective,
  headContractForPostverbAuxiliary,
  headContractForPredicateQuoteCarrier,
  headContractForQuoteBoundary
} from "./head-contract-table.js";
import {
  derivationalHostStemRootOf,
  derivationalHostStemShapeForCandidate,
  derivationalSuffixProfileById,
  derivedNominalPhraseSpanAt,
  isDerivedNominalPhraseHead
} from "./derivational-suffix-table.js";
import {
  stemCandidateIdentitiesEqual,
  stemCandidateIdentity,
  type StemCandidateIdentity
} from "./stem-candidate-identity.js";

export interface TailEvidenceDecisionInput {
  readonly headHypothesis?: HeadHypothesisCarrier;
  readonly stem: StemNode;
  readonly ops: readonly AuxOpNode[];
  readonly outgoingBoundary?: TailEvidenceOutgoingBoundary;
  readonly terminal?: TerminalKind | null;
  readonly terminalPayload?: TerminalPayload;
  readonly tokens?: readonly RuntimeHaruToken[];
  readonly layout?: ClauseLayout;
  readonly predicateTokenIdx?: number;
  readonly contextRejectedStemCandidateIdentities?: readonly StemCandidateIdentity[];
}

interface TailEvidenceOutgoingBoundary {
  readonly kind: "terminal" | string;
  readonly connectiveKind?: string;
  readonly surface?: string;
  readonly quoteBoundary?: QuoteBoundaryPayload;
}

export interface TailEvidenceQuoteCitation {
  readonly source: "connective_quote_boundary" | "connective_kind" | "predicate_quote_carrier";
  readonly clauseForm?: QuoteBoundaryKoreanClauseForm;
  readonly connective?: string;
  readonly surface?: string;
  readonly carrierStyle?: string;
  readonly reportingPassiveRoleLabel?: boolean;
  readonly adjectivalDistributionContent?: boolean;
}

export interface TailEvidenceNominalFrame {
  readonly source: "attributive_boundary";
  readonly headKind: string;
  readonly headSurface: string;
}

export interface TailEvidenceQuoteAttributive {
  readonly source: "bare_tte_attributive" | "toiu_attributive";
  readonly headSurface: string;
}

export interface TailEvidencePredicateContext {
  readonly source: "clause_layout";
  readonly particleSurfaces: readonly string[];
  readonly quoteHostPrefixParticleSurfaces: readonly string[];
}

export interface TailEvidenceContext {
  readonly quoteCitation?: TailEvidenceQuoteCitation;
  readonly nominalFrame?: TailEvidenceNominalFrame;
  readonly quoteAttributive?: TailEvidenceQuoteAttributive;
  readonly predicateContext?: TailEvidencePredicateContext;
}

interface CandidateWorkState {
  readonly hypothesis: HeadHypothesisCandidate;
  readonly stemCandidateIndex: number | undefined;
  readonly stemCandidateIndexSource: "strict_identity" | "unique_loose" | undefined;
  readonly stemCandidate: StemCandidate | undefined;
  readonly preserved: StemCandidate | undefined;
  readonly projectedKind: "verb" | "adj" | "noun" | "adverb" | undefined;
  pruned: boolean;
  pruneReason?: string | undefined;
  preferred: boolean;
  contextReason?: string | undefined;
}

interface PreferenceResult {
  readonly rule: string;
  readonly reason: string;
  readonly candidateIndices: readonly number[];
  readonly projectionKinds: readonly HeadProjectionKind[];
}

interface StemCommitDecision {
  readonly status: "committed" | "deferred" | "not_applicable";
  readonly reason: string;
  readonly stemCandidateIndex?: number;
}

interface RealizationChoiceWork {
  readonly capability: CandidateCapability;
  readonly choice: HeadRealization;
}

interface CandidatePriorityGroup {
  readonly priorityGroup: number | undefined;
  readonly finalFallback: boolean;
  readonly candidates: readonly CandidateWorkState[];
}

interface ContractCandidatePool {
  readonly candidates: readonly CandidateWorkState[];
  readonly narrowed: boolean;
  readonly finalFallbackGroup: boolean;
}

interface StemCandidateHypothesisMatch {
  readonly index: number;
  readonly source: "strict_identity" | "unique_loose";
}

type ContractOwnerPrecedence =
  | "code:adverbial_modifier_terminal"
  | "code:connective_role_adverbial"
  | "code:sahen_verbalization"
  | "data:postverb_auxiliary_adverbial"
  | "data:postverb_auxiliary_projection"
  | "code:predicate_suffix_projection"
  | "data:tosuru_make_carrier"
  | "data:connective_quoted_concessive"
  | "data:quote_boundary_adjectival_distribution"
  | "data:quote_citation"
  | "data:connective_projection"
  | "code:quote_attributive_terminal"
  | "code:volitional_polite_terminal"
  | "code:predicate_negation"
  | "code:bare_keijouji_attributive"
  | "code:predicate_modifier_context"
  | "code:default";

interface TailChoiceContract {
  readonly owner: ContractOwnerPrecedence;
  readonly contract: CarrierHeadContract;
}

const HEAD_CONTRACT_OWNER_PRECEDENCE: readonly ContractOwnerPrecedence[] = [
  "code:adverbial_modifier_terminal",
  "code:connective_role_adverbial",
  "code:sahen_verbalization",
  "data:postverb_auxiliary_adverbial",
  "data:postverb_auxiliary_projection",
  "code:predicate_suffix_projection",
  "data:tosuru_make_carrier",
  "data:connective_quoted_concessive",
  "data:quote_boundary_adjectival_distribution",
  "code:quote_attributive_terminal",
  "data:quote_citation",
  "data:connective_projection",
  "code:volitional_polite_terminal",
  "code:predicate_negation",
  "code:bare_keijouji_attributive",
  "code:predicate_modifier_context",
  "code:default"
];

const DIRECT_NOMINAL_PROJECTIONS = ["direct_nominal"] as const satisfies readonly HeadProjectionKind[];
const NOMINALIZED_OR_ADJECTIVAL_NOMINAL_PROJECTIONS = [
  "nominalized_predicate",
  "projected_nominal_adjectival"
] as const satisfies readonly HeadProjectionKind[];
const ADVERBIAL_NOMINAL_FALLBACK_PROJECTIONS = ["adverbial_nominal_fallback"] as const satisfies readonly HeadProjectionKind[];
const NOMINAL_EXPECTED_REALIZATION_ORDER = [
  DIRECT_NOMINAL_PROJECTIONS,
  NOMINALIZED_OR_ADJECTIVAL_NOMINAL_PROJECTIONS,
  ADVERBIAL_NOMINAL_FALLBACK_PROJECTIONS
] as const satisfies readonly (readonly HeadProjectionKind[])[];
const NOMINAL_EXPECTED_PROJECTIONS = [
  ...DIRECT_NOMINAL_PROJECTIONS,
  ...NOMINALIZED_OR_ADJECTIVAL_NOMINAL_PROJECTIONS,
  ...ADVERBIAL_NOMINAL_FALLBACK_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const NOMINAL_PROJECTIONS = [
  ...DIRECT_NOMINAL_PROJECTIONS,
  "nominalized_predicate",
  ...ADVERBIAL_NOMINAL_FALLBACK_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const DIRECT_ADJECTIVAL_PROJECTIONS = ["direct_adjectival"] as const satisfies readonly HeadProjectionKind[];
const DERIVED_ADJECTIVAL_PROJECTIONS = ["projected_nominal_adjectival"] as const satisfies readonly HeadProjectionKind[];
const DIRECT_VERBAL_PROJECTIONS = ["direct_verbal"] as const satisfies readonly HeadProjectionKind[];
const DERIVED_VERBAL_PROJECTIONS = ["sahen_verbalized_nominal"] as const satisfies readonly HeadProjectionKind[];
const ADVERBIALIZED_PREDICATE_PROJECTIONS = [
  "adverbialized_adjectival",
  "adverbialized_verbal"
] as const satisfies readonly HeadProjectionKind[];
const ADVERBIAL_PROJECTIONS = ["direct_adverbial"] as const satisfies readonly HeadProjectionKind[];
const DIRECT_PREDICATE_PROJECTIONS = [
  "direct_adjectival",
  "direct_verbal"
] as const satisfies readonly HeadProjectionKind[];
const DERIVED_PREDICATE_PROJECTIONS = [
  "projected_nominal_adjectival",
  "sahen_verbalized_nominal"
] as const satisfies readonly HeadProjectionKind[];
const PREDICATE_PROJECTIONS = [
  ...DIRECT_PREDICATE_PROJECTIONS,
  ...DERIVED_PREDICATE_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const ALL_PROJECTIONS = [
  ...NOMINAL_EXPECTED_PROJECTIONS,
  ...DIRECT_PREDICATE_PROJECTIONS,
  ...ADVERBIALIZED_PREDICATE_PROJECTIONS,
  ...ADVERBIAL_PROJECTIONS,
  ...DERIVED_PREDICATE_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
const DIRECT_QUOTE_BODY_PROJECTIONS = [
  ...NOMINAL_EXPECTED_PROJECTIONS,
  ...DIRECT_PREDICATE_PROJECTIONS,
  ...ADVERBIALIZED_PREDICATE_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];

export function resolveTailEvidenceDecision(input: TailEvidenceDecisionInput): HeadTailEvidenceDecision | null {
  const carrier = input.headHypothesis;
  if (carrier === undefined || carrier.candidates.length === 0) {
    return null;
  }
  const evidence = collectTailEvidence(input);
  const candidateStates = carrier.candidates.map((candidate): CandidateWorkState => {
    const stemCandidateMatch = stemCandidateMatchForHypothesis(input.stem, candidate);
    const stemCandidate = input.stem.kind === "candidateSet" && stemCandidateMatch !== undefined
      ? input.stem.candidates[stemCandidateMatch.index]
      : undefined;
    return {
      hypothesis: candidate,
      stemCandidateIndex: stemCandidateMatch?.index,
      stemCandidateIndexSource: stemCandidateMatch?.source,
      stemCandidate,
      preserved: candidate.preservedCandidate,
      projectedKind: candidate.projectedStemKind,
      pruned: false,
      preferred: false
    };
  });
  return evaluateHeadCandidatesForContract(input, carrier, evidence, candidateStates);
}

export function headEvidenceDecisionAdmitsCommitmentBridgeCandidate(
  decision: HeadTailEvidenceDecision | null,
  candidate: StemCandidate
): boolean {
  if (decision === null) {
    return true;
  }
  const identity = stemCandidateIdentity(candidate);
  const represented = decision.candidates.some((item) =>
    stemCandidateIdentitiesEqual(identity, {
      provenance: item.provenance,
      projectionOrdinal: item.projectionOrdinal
    })
  );
  if (!represented) {
    return true;
  }
  return decision.candidateOpenSet.some((openIdentity) =>
    stemCandidateIdentitiesEqual(identity, openIdentity)
  );
}

export function candidateRealizationFromDecisionChoices(
  decision: HeadTailEvidenceDecision,
  committedSense: StemCandidateIdentity,
  constraint: {
    readonly accepts?: readonly HeadProjectionKind[];
    readonly realizationOrder?: readonly (readonly HeadProjectionKind[])[];
  } = {}
): StemCandidateRealization | null {
  const candidate = decision.candidates.find((item) =>
    stemCandidateIdentitiesEqual(committedSense, {
      provenance: item.provenance,
      projectionOrdinal: item.projectionOrdinal
    })
  );
  const eligibleChoices = candidate?.realizationChoices?.filter((choice) =>
    choice.state !== "rejected" &&
    (constraint.accepts === undefined || constraint.accepts.includes(choice.projectionKind))
  ) ?? [];
  if (eligibleChoices.length === 0) {
    return null;
  }
  const realizationOrder = (constraint.realizationOrder ?? decision.contractRealizationOrder)?.flat() ?? [];
  const orderedChoices = [...eligibleChoices].sort((left, right) => {
    const leftIndex = realizationOrder.indexOf(left.projectionKind);
    const rightIndex = realizationOrder.indexOf(right.projectionKind);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  const category = orderedChoices[0]!.category;
  return {
    category,
    projectionKinds: uniqueProjectionKinds(
      orderedChoices
        .filter((choice) => choice.category === category)
        .map((choice) => choice.projectionKind)
    )
  };
}

function evaluateHeadCandidatesForContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier,
  evidence: TailEvidenceContext,
  candidateStates: CandidateWorkState[]
): HeadTailEvidenceDecision {
  const rules: HeadTailEvidenceRuleDecision[] = [];
  applyPreContractPruneRules(input, candidateStates, rules);
  const choiceContractDecision = nominalNarrowedChoiceContract(
    input,
    carrier,
    candidateStates,
    adverbialNarrowedChoiceContract(
      input,
      carrier,
      candidateStates,
      tailChoiceContract(input, evidence, carrier),
      rules
    ),
    rules
  );
  const choiceContract = choiceContractDecision.contract;
  const contractPool = contractCandidatePoolByPriorityGroup(
    candidateStates,
    carrier,
    input,
    evidence,
    choiceContract,
    rules
  );
  if (contractPool.candidates.length === 0) {
    return allCandidatesPrunedDecision(input, carrier, choiceContractDecision, candidateStates, rules);
  }

  const openCandidatePool = candidateOpenSetPool(candidateStates, input.stem, carrier, choiceContract);
  const preference = firstContractCandidatePreference(openCandidatePool, carrier, input, evidence, choiceContractDecision, rules) ??
    contractEligibilityPreference(openCandidatePool, input, evidence, carrier, choiceContractDecision, contractPool, rules);
  if (preference === null) {
    rules.push({
      rule: "context_decision_no_candidate_preference",
      result: "no_decision",
      classification: "preference",
      effect: "observe",
      reason: "tail head contract has no candidate-level preference or did not narrow the eligible pool"
    });
  }
  const preferredPool = preference === null
    ? openCandidatePool
    : openCandidatePool.filter((candidate) => preference.candidateIndices.includes(candidate.hypothesis.index));
  if (preference !== null) {
    for (const candidate of preferredPool) {
      candidate.preferred = true;
      candidate.contextReason = preference.reason;
    }
  }
  const rankedCandidates = rankedCandidateOpenSet(
    candidateStates,
    preference,
    input.stem,
    carrier,
    choiceContract
  );
  const openSetIdentities = rankedCandidates.map(candidateWorkStateIdentity);

  return {
    contractOwner: choiceContractDecision.owner,
    contractAccepts: choiceContract.accepts,
    ...(choiceContract.realizationOrder === undefined
      ? {}
      : { contractRealizationOrder: choiceContract.realizationOrder }),
    candidateOpenSet: openSetIdentities,
    rules,
    candidates: candidateStates.map((candidate) =>
      candidateDecisionTrace(input.stem, candidate, preference, choiceContract, carrier, openSetIdentities)
    )
  };
}

function allCandidatesPrunedDecision(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier,
  choiceContractDecision: TailChoiceContract,
  candidateStates: readonly CandidateWorkState[],
  rules: HeadTailEvidenceRuleDecision[]
): HeadTailEvidenceDecision {
  const choiceContract = choiceContractDecision.contract;
  rules.push({
    rule: "required_all_candidates_pruned",
    result: "no_decision",
    classification: "required",
    effect: "prune",
    reason: "every head candidate was pruned by contract hard eligibility; tail interpretation is head-ineligible",
    candidateIndices: candidateStates.map((candidate) => candidate.hypothesis.index)
  });
  return {
    contractOwner: choiceContractDecision.owner,
    contractAccepts: choiceContract.accepts,
    ...(choiceContract.realizationOrder === undefined
      ? {}
      : { contractRealizationOrder: choiceContract.realizationOrder }),
    candidateOpenSet: [],
    rules,
    candidates: candidateStates.map((candidate) =>
      candidateDecisionTrace(input.stem, candidate, null, choiceContract, carrier, [])
    )
  };
}

function applyPreContractPruneRules(
  input: TailEvidenceDecisionInput,
  candidates: CandidateWorkState[],
  rules: HeadTailEvidenceRuleDecision[]
): void {
  const rejectedStemCandidateIdentities = input.contextRejectedStemCandidateIdentities;
  if (rejectedStemCandidateIdentities !== undefined && rejectedStemCandidateIdentities.length > 0) {
    const rejected = candidates
      .filter((candidate) => candidateWasContextRejected(candidate, rejectedStemCandidateIdentities))
      .map((candidate) => candidate.hypothesis.index);
    if (rejected.length > 0) {
      pruneCandidates(candidates, rejected, "candidate failed source frame/context resolution before tail evidence");
      rules.push({
        rule: "required_context_frame_failed_candidate",
        result: "pruned",
        classification: "required",
        effect: "prune",
        reason: "candidate failed source frame/context resolution before tail evidence and cannot be revived by tail head selection",
        candidateIndices: rejected
      });
    }
  }
  const missingPreserved = candidates
    .filter((candidate) => candidate.preserved === undefined)
    .map((candidate) => candidate.hypothesis.index);
  if (missingPreserved.length > 0) {
    pruneCandidates(candidates, missingPreserved, "missing preserved candidate payload");
    rules.push({
      rule: "required_missing_preserved_candidate",
      result: "pruned",
      classification: "required",
      effect: "prune",
      reason: "candidate cannot enter Tail evidence commitment without preserved payload",
      candidateIndices: missingPreserved
    });
  }
  applyVoiceMarkerHostPotentialDerivationPrune(input, candidates, rules);
}

function applyVoiceMarkerHostPotentialDerivationPrune(
  input: TailEvidenceDecisionInput,
  candidates: CandidateWorkState[],
  rules: HeadTailEvidenceRuleDecision[]
): void {
  if (!stemHostsDerivationBlockingVoiceOp(input.ops)) {
    return;
  }
  const active = candidates.filter((candidate) => !candidate.pruned);
  const potentialDerived = active.filter(candidateDerivesPotential);
  if (potentialDerived.length === 0 || potentialDerived.length === active.length) {
    return;
  }
  const pruned = potentialDerived.map((candidate) => candidate.hypothesis.index);
  pruneCandidates(candidates, pruned, "potential-derived stem cannot host a voice marker");
  rules.push({
    rule: "required_potential_derivation_cannot_host_voice_marker",
    result: "pruned",
    classification: "required",
    effect: "prune",
    reason: "potential-derived stem candidate cannot host the following レル/セル voice marker; lexical identity sense is the only reading",
    candidateIndices: pruned
  });
}

function stemHostsDerivationBlockingVoiceOp(ops: readonly AuxOpNode[]): boolean {
  const first = ops[0];
  if (first?.kind !== "voice") {
    return false;
  }
  return (first.candidates !== undefined && first.candidates.length > 0) ||
    first.voice === "causative" ||
    first.voice === "causative_passive";
}

function candidateDerivesPotential(candidate: CandidateWorkState): boolean {
  const derivation = candidate.stemCandidate?.derivation ?? candidate.preserved?.derivation;
  return derivation?.id === "potential";
}

function candidateWasContextRejected(
  candidate: CandidateWorkState,
  rejectedStemCandidateIdentities: readonly StemCandidateIdentity[]
): boolean {
  const identity = candidateWorkStateIdentity(candidate);
  return rejectedStemCandidateIdentities.some((rejected) =>
    stemCandidateIdentitiesEqual(identity, rejected)
  );
}

function applyContractEligibility(
  candidates: CandidateWorkState[],
  carrier: HeadHypothesisCarrier,
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  contract: CarrierHeadContract,
  rules: HeadTailEvidenceRuleDecision[]
): { readonly narrowed: boolean } {
  const ineligible: number[] = [];
  const reasons = new Map<number, string>();
  for (const candidate of candidates) {
    if (candidate.pruned) continue;
    if (eligibleRealizationChoices(input.stem, candidate, carrier, contract).length > 0) continue;
    ineligible.push(candidate.hypothesis.index);
    reasons.set(candidate.hypothesis.index, contractEligibilityRejectReason(candidate, carrier, contract));
  }
  if (ineligible.length === 0) {
    return { narrowed: false };
  }
  const ruleName = contractEligibilityRuleName(input, evidence, carrier, contract);
  const ruleReason = contractEligibilityRuleReason(input, evidence, carrier, contract);
  for (const candidate of candidates) {
    if (!ineligible.includes(candidate.hypothesis.index)) continue;
    const reason = reasons.get(candidate.hypothesis.index) ?? "candidate has no realization choice accepted by tail head contract";
    candidate.pruned = true;
    candidate.pruneReason = ruleName === "required_incompatible_contract" ? reason : ruleReason;
  }
  rules.push({
    rule: ruleName,
    result: "pruned",
    classification: "required",
    effect: "prune",
    reason: ruleReason,
    candidateIndices: ineligible
  });
  return { narrowed: ineligible.length < candidates.length };
}

function contractCandidatePoolByPriorityGroup(
  candidates: CandidateWorkState[],
  carrier: HeadHypothesisCarrier,
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  contract: CarrierHeadContract,
  rules: HeadTailEvidenceRuleDecision[]
): ContractCandidatePool {
  const groups = candidatePriorityGroups(candidates);
  let narrowed = false;
  for (const group of groups) {
    const active = group.candidates.filter((candidate) => !candidate.pruned);
    if (active.length === 0) {
      continue;
    }
    const selectable = active.filter((candidate) =>
      candidateCanEnterContractPool(input.stem, candidate, carrier, contract)
    );
    if (selectable.length > 0) {
      if (!group.finalFallback) {
        narrowed = pruneContractIncompatibleCandidates(
          active,
          selectable,
          carrier,
          input,
          evidence,
          contract,
          rules
        ) || narrowed;
      }
      return {
        candidates: selectable,
        narrowed: narrowed || selectable.length < active.length,
        finalFallbackGroup: group.finalFallback
      };
    }
    if (group.finalFallback) {
      const surviving = active.filter((candidate) =>
        candidateContractMaterializability(input.stem, candidate, carrier, contract) !==
          "accepted_but_non_materializable"
      );
      narrowed = pruneContractIncompatibleCandidates(
        active,
        surviving,
        carrier,
        input,
        evidence,
        contract,
        rules
      ) || narrowed;
      return {
        candidates: surviving,
        narrowed,
        finalFallbackGroup: true
      };
    }
    narrowed = pruneContractIncompatibleCandidates(
      active,
      [],
      carrier,
      input,
      evidence,
      contract,
      rules
    ) || narrowed;
  }
  return { candidates: [], narrowed, finalFallbackGroup: false };
}

function candidatePriorityGroups(candidates: readonly CandidateWorkState[]): CandidatePriorityGroup[] {
  const active = candidates.filter((candidate) => !candidate.pruned);
  const priorityGroups = uniquePriorityGroups(active)
    .sort(priorityGroupCompare);
  return priorityGroups.map((priorityGroup, index): CandidatePriorityGroup => ({
    priorityGroup,
    finalFallback: index === priorityGroups.length - 1,
    candidates: active.filter((candidate) => candidatePriorityGroup(candidate) === priorityGroup)
  }));
}

function uniquePriorityGroups(candidates: readonly CandidateWorkState[]): (number | undefined)[] {
  const groups: (number | undefined)[] = [];
  for (const candidate of candidates) {
    const group = candidatePriorityGroup(candidate);
    if (!groups.some((existing) => priorityGroupEquals(existing, group))) {
      groups.push(group);
    }
  }
  return groups;
}

function candidatePriorityGroup(candidate: CandidateWorkState): number | undefined {
  return candidate.hypothesis.priorityGroup ?? candidate.preserved?.priorityGroup ?? candidate.stemCandidate?.priorityGroup;
}

function priorityGroupCompare(left: number | undefined, right: number | undefined): number {
  return orderKeyValue(left) - orderKeyValue(right);
}

function priorityGroupEquals(left: number | undefined, right: number | undefined): boolean {
  return orderKeyValue(left) === orderKeyValue(right);
}

function pruneContractIncompatibleCandidates(
  active: readonly CandidateWorkState[],
  surviving: readonly CandidateWorkState[],
  carrier: HeadHypothesisCarrier,
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  contract: CarrierHeadContract,
  rules: HeadTailEvidenceRuleDecision[]
): boolean {
  const rejected = active.filter((candidate) => !surviving.includes(candidate));
  if (rejected.length === 0) {
    return false;
  }
  const ruleName = contractEligibilityRuleName(input, evidence, carrier, contract);
  const ruleReason = contractEligibilityRuleReason(input, evidence, carrier, contract);
  for (const candidate of rejected) {
    const reason = contractIncompatibilityReason(candidate, carrier, input, contract);
    candidate.pruned = true;
    candidate.pruneReason = ruleName === "required_incompatible_contract" ? reason : ruleReason;
  }
  rules.push({
    rule: ruleName,
    result: "pruned",
    classification: "required",
    effect: "prune",
    reason: ruleReason,
    candidateIndices: rejected.map((candidate) => candidate.hypothesis.index)
  });
  return true;
}

function contractIncompatibilityReason(
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  input: TailEvidenceDecisionInput,
  contract: CarrierHeadContract
): string {
  const eligibilityReason = contractEligibilityRejectReason(candidate, carrier, contract);
  if (eligibleRealizationChoices(input.stem, candidate, carrier, contract).length === 0) {
    return eligibilityReason;
  }
  const choice = selectRealizationChoice(input.stem, candidate, carrier, contract);
  return selectedStemCandidateCommitDecision(input.stem, candidate, choice, contract, null).reason;
}

function contractEligibilityRejectReason(
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): string {
  const choices = candidateCapabilities(candidate).flatMap((capability) => capability.choices);
  if (choices.length === 0) {
    return "candidate has no head realization choices";
  }
  const acceptedProjectionKind = choices.some((choice) => contract.accepts.includes(choice.projectionKind));
  if (!acceptedProjectionKind) {
    const projectionKinds = uniqueProjectionKinds(choices.map((choice) => choice.projectionKind)).join("/");
    return `${contract.relation} relation does not accept ${projectionKinds} projection kind`;
  }
  const acceptedChoices = choices.filter((choice) => contract.accepts.includes(choice.projectionKind));
  const headLicensedChoices = acceptedChoices.filter((choice) => headLicensingMatches(carrier, contract.requires, choice));
  if (headLicensedChoices.length === 0) {
    return headLicensingRejectReason(contract.requires);
  }
  return "candidate has no realization choice accepted by tail head contract";
}

function firstContractCandidatePreference(
  eligible: readonly CandidateWorkState[],
  carrier: HeadHypothesisCarrier,
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  choiceContract: TailChoiceContract,
  rules: HeadTailEvidenceRuleDecision[]
): PreferenceResult | null {
  const contract = choiceContract.contract;
  for (const tier of contract.candidatePreference ?? []) {
    const projectionKinds = uniqueProjectionKinds(tier);
    const subset = eligible.filter((candidate) =>
      (!isExplicitAdverbialContract(contract) || stemCandidateHasConnectiveRole(candidate.stemCandidate, "adverbial")) &&
      eligibleRealizationChoices(input.stem, candidate, carrier, contract)
        .some(({ choice }) => projectionKinds.includes(choice.projectionKind))
    );
    if (subset.length === 0) {
      continue;
    }
    if (subset.length === eligible.length) {
      return null;
    }
    const result = {
      rule: contractPreferenceRuleName(input, evidence, carrier, contract, choiceContract.owner),
      reason: contract.contextReason ?? `tail head contract prefers ${projectionKinds.join("/")} projection kind before dictionary order`,
      candidateIndices: subset.map((candidate) => candidate.hypothesis.index),
      projectionKinds
    };
    rules.push({
      rule: result.rule,
      result: "preferred",
      classification: "preference",
      effect: "reorder",
      reason: result.reason,
      candidateIndices: result.candidateIndices
    });
    return result;
  }
  return null;
}

function contractEligibilityPreference(
  eligible: readonly CandidateWorkState[],
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier,
  choiceContract: TailChoiceContract,
  contractEligibility: { readonly narrowed: boolean },
  rules: HeadTailEvidenceRuleDecision[]
): PreferenceResult | null {
  const contract = choiceContract.contract;
  if (!contractEligibility.narrowed || eligible.length === 0) {
    return null;
  }
  const projectionKinds = uniqueProjectionKinds(contract.accepts);
  const result = {
    rule: contractPreferenceRuleName(input, evidence, carrier, contract, choiceContract.owner),
    reason: contract.contextReason ?? contractEligibilityRuleReason(input, evidence, carrier, contract),
    candidateIndices: eligible.map((candidate) => candidate.hypothesis.index),
    projectionKinds
  };
  rules.push({
    rule: result.rule,
    result: "preferred",
    classification: "preference",
    effect: "reorder",
    reason: result.reason,
    candidateIndices: result.candidateIndices
  });
  return result;
}

function tailChoiceContract(
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier
): TailChoiceContract {
  for (const owner of HEAD_CONTRACT_OWNER_PRECEDENCE) {
    const contract = contractForOwnerPrecedence(owner, input, evidence, carrier);
    if (contract !== undefined) {
      return { owner, contract };
    }
  }
  return { owner: "code:default", contract: defaultHeadContract() };
}

function adverbialNarrowedChoiceContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier,
  candidates: readonly CandidateWorkState[],
  choiceContract: TailChoiceContract,
  rules: HeadTailEvidenceRuleDecision[]
): TailChoiceContract {
  const contract = choiceContract.contract;
  if (!contract.accepts.includes("direct_adverbial")) {
    return choiceContract;
  }
  if (!opChainRequiresInflectingPredicateHost(input.ops)) {
    return choiceContract;
  }
  if (adverbialRealizationIsLicensed(input, contract)) {
    return choiceContract;
  }
  const narrowed: CarrierHeadContract = {
    ...contract,
    accepts: contract.accepts.filter((kind) => kind !== "direct_adverbial"),
    ...(contract.candidatePreference === undefined
      ? {}
      : { candidatePreference: projectionGroupsWithoutAdverbial(contract.candidatePreference) }),
    ...(contract.realizationOrder === undefined
      ? {}
      : { realizationOrder: projectionGroupsWithoutAdverbial(contract.realizationOrder) }),
    contextReason: "inflecting op chain requires an inflecting head realization; adverbial realization is unlicensed here"
  };
  const survives = candidates.some((candidate) =>
    !candidate.pruned &&
    eligibleRealizationChoices(input.stem, candidate, carrier, narrowed).length > 0
  );
  if (!survives) {
    return choiceContract;
  }
  rules.push({
    rule: "required_inflecting_chain_excludes_adverbial_realization",
    result: "no_decision",
    classification: "required",
    effect: "observe",
    reason: "negation/tense/polite/voice/aspect evidence requires an inflecting predicate host; the head contract drops direct adverbial realization"
  });
  return { owner: choiceContract.owner, contract: narrowed };
}

function nominalNarrowedChoiceContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier,
  candidates: readonly CandidateWorkState[],
  choiceContract: TailChoiceContract,
  rules: HeadTailEvidenceRuleDecision[]
): TailChoiceContract {
  const contract = choiceContract.contract;
  if (!contract.accepts.includes("direct_nominal")) {
    return choiceContract;
  }
  if (!opChainHeadRequiresInflectingPredicateHost(input.ops)) {
    return choiceContract;
  }
  const narrowed: CarrierHeadContract = {
    ...contract,
    accepts: contract.accepts.filter((kind) => kind !== "direct_nominal"),
    ...(contract.candidatePreference === undefined
      ? {}
      : { candidatePreference: projectionGroupsWithout(contract.candidatePreference, "direct_nominal") }),
    ...(contract.realizationOrder === undefined
      ? {}
      : { realizationOrder: projectionGroupsWithout(contract.realizationOrder, "direct_nominal") }),
    contextReason: "chain-initial inflecting op requires an inflecting head realization; bare nominal realization is unrenderable here"
  };
  const survives = candidates.some((candidate) =>
    !candidate.pruned &&
    eligibleRealizationChoices(input.stem, candidate, carrier, narrowed).length > 0
  );
  if (!survives) {
    return choiceContract;
  }
  rules.push({
    rule: "chain_initial_inflecting_op_excludes_nominal_realization",
    result: "no_decision",
    classification: "required",
    effect: "observe",
    reason: "a chain-initial negation/tense/polite/voice/aspect op requires an inflecting predicate host; the head contract drops bare nominal realization"
  });
  return { owner: choiceContract.owner, contract: narrowed };
}

const INFLECTING_HOST_EVIDENCE_OP_KINDS: readonly AuxOpKind[] = [
  "negation",
  "tense",
  "polite",
  "voice",
  "aspect",
  "desire"
];

function opChainRequiresInflectingPredicateHost(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => INFLECTING_HOST_EVIDENCE_OP_KINDS.includes(op.kind));
}

function opChainHeadRequiresInflectingPredicateHost(ops: readonly AuxOpNode[]): boolean {
  const first = ops[0];
  return first !== undefined && INFLECTING_HOST_EVIDENCE_OP_KINDS.includes(first.kind);
}

function adverbialRealizationIsLicensed(
  input: TailEvidenceDecisionInput,
  contract: CarrierHeadContract
): boolean {
  return input.terminal === "adverbial_modifier" ||
    contract.commitPolicy?.adverbial === "explicit_evidence_required" ||
    tailEvidenceHasNonTerminalConnective(input);
}

function projectionGroupsWithoutAdverbial(
  groups: readonly (readonly HeadProjectionKind[])[]
): readonly (readonly HeadProjectionKind[])[] {
  return projectionGroupsWithout(groups, "direct_adverbial");
}

function projectionGroupsWithout(
  groups: readonly (readonly HeadProjectionKind[])[],
  excluded: HeadProjectionKind
): readonly (readonly HeadProjectionKind[])[] {
  return groups
    .map((group) => group.filter((kind) => kind !== excluded))
    .filter((group) => group.length > 0);
}

function contractForOwnerPrecedence(
  owner: ContractOwnerPrecedence,
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  switch (owner) {
    case "code:adverbial_modifier_terminal":
      return adverbialModifierTerminalContract(input);
    case "code:connective_role_adverbial":
      return connectiveRoleAdverbialContract(input, carrier);
    case "code:sahen_verbalization":
      return hasSahenVerbalizationEvidence(input, carrier)
        ? {
          relation: "modification",
          accepts: PREDICATE_PROJECTIONS,
          realizationOrder: [
            DIRECT_VERBAL_PROJECTIONS,
            DERIVED_VERBAL_PROJECTIONS,
            DIRECT_ADJECTIVAL_PROJECTIONS,
            DERIVED_ADJECTIVAL_PROJECTIONS
          ],
          ...(hasPotentialKotoGaDekiruTail(input.ops)
            ? {
              candidatePreference: [
                DIRECT_VERBAL_PROJECTIONS,
                DERIVED_VERBAL_PROJECTIONS,
                DIRECT_ADJECTIVAL_PROJECTIONS,
                DERIVED_ADJECTIVAL_PROJECTIONS
              ]
            }
            : {}),
          contextReason: hasPotentialKotoGaDekiruTail(input.ops)
            ? "`する + ことができる` evidence prefers an embedded verbalized predicate before adjectival predicate realization"
            : "`する` evidence requires predicate realization; Korean may realize this as a direct adjective predicate or a verbalized nominal"
        }
        : undefined;
    case "data:postverb_auxiliary_adverbial":
      return carrierHeadIsAdverbCapable(carrier)
        ? firstAdverbialTailContract(input.ops)
        : undefined;
    case "data:postverb_auxiliary_projection":
      return formalStateResultContract(input.ops) ?? firstProjectionTailContract(input.ops);
    case "code:predicate_suffix_projection":
      return predicateSuffixProjectionContract(input.ops, carrier);
    case "data:tosuru_make_carrier":
      return tosuruMakeCarrierContract(input.ops);
    case "data:connective_quoted_concessive":
      return isQuotedConcessiveLimitEvidence(evidence.quoteCitation)
        ? headContractForConnective("quoted_concessive_limit")
        : undefined;
    case "data:quote_boundary_adjectival_distribution":
      return evidence.quoteCitation?.adjectivalDistributionContent === true &&
        carrier.sourceCapabilities.naAdjectiveCapable
        ? headContractForQuoteBoundary("adjectival_distribution_content")
        : undefined;
    case "data:quote_citation":
      return contractForQuoteCitationEvidence(evidence.quoteCitation, input.ops, carrier) ??
        contractForPredicateQuoteCarrierOp(input.ops, carrier);
    case "data:connective_projection":
      return firstConnectiveContract(input.ops, carrier, input.outgoingBoundary);
    case "code:quote_attributive_terminal":
      return quoteAttributiveTerminalContract(input, carrier, evidence.quoteAttributive);
    case "code:volitional_polite_terminal":
      return volitionalPoliteTerminalContract(input.ops);
    case "code:predicate_negation":
      return predicateNegationContract(input, carrier);
    case "code:bare_keijouji_attributive":
      return bareKeijoujiAttributiveContract(input, carrier);
    case "code:predicate_modifier_context":
      return structuralPredicateModifierContract(input, evidence, carrier);
    case "code:default":
      return defaultHeadContract();
  }
}

function volitionalPoliteTerminalContract(ops: readonly AuxOpNode[]): CarrierHeadContract | undefined {
  if (!ops.some((op) =>
    op.kind === "polite" &&
    ((op.source.tokens[0]?.pos ?? 0) & POS5A) === 意志推量形_
  )) {
    return undefined;
  }
  return {
    relation: "modification",
    accepts: [...DIRECT_VERBAL_PROJECTIONS, ...DERIVED_VERBAL_PROJECTIONS],
    candidatePreference: [DIRECT_VERBAL_PROJECTIONS, DERIVED_VERBAL_PROJECTIONS],
    realizationOrder: [DIRECT_VERBAL_PROJECTIONS, DERIVED_VERBAL_PROJECTIONS],
    contextReason: "volitional polite terminal requires verbal head realization"
  };
}

function predicateSuffixProjectionContract(
  ops: readonly AuxOpNode[],
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  const suffix = ops.find((op) => op.kind === "predicateSuffix");
  if (suffix === undefined) {
    return undefined;
  }
  const suffixProfile = derivationalSuffixProfileById(suffix.profileId);
  if (suffixProfile?.hostForm === "nominal_m") {
    const nominalTiers = carrier.sourceCapabilities.naAdjectiveCapable
      ? [["nominalized_predicate"] as readonly HeadProjectionKind[]]
      : [DIRECT_NOMINAL_PROJECTIONS, ["nominalized_predicate"] as readonly HeadProjectionKind[]];
    const tiers = [
      ...nominalTiers,
      DIRECT_ADJECTIVAL_PROJECTIONS,
      DERIVED_ADJECTIVAL_PROJECTIONS,
      DIRECT_VERBAL_PROJECTIONS,
      DERIVED_VERBAL_PROJECTIONS
    ];
    return {
      relation: "modification",
      accepts: tiers.flat(),
      candidatePreference: tiers,
      realizationOrder: tiers,
      contextReason: "nominalizing predicate suffix prefers an explicit nominal head realization"
    };
  }
  const lexicalStemRootPolicy = suffixProfile?.hostForm === "stem_root"
    ? { hostBase: "lexical_stem_root" as const }
    : {};
  return {
    relation: "modification",
    accepts: PREDICATE_PROJECTIONS,
    realizationOrder: [
      DIRECT_ADJECTIVAL_PROJECTIONS,
      DERIVED_ADJECTIVAL_PROJECTIONS,
      DIRECT_VERBAL_PROJECTIONS,
      DERIVED_VERBAL_PROJECTIONS
    ],
    commitPolicy: { opChainHost: "inflecting_predicate_lemma", ...lexicalStemRootPolicy },
    contextReason: "productive predicate suffix requires predicate head realization"
  };
}

function firstConnectiveContract(
  ops: readonly AuxOpNode[],
  carrier: HeadHypothesisCarrier,
  outgoingBoundary: TailEvidenceOutgoingBoundary | undefined
): CarrierHeadContract | undefined {
  for (const op of ops) {
    if (op.kind !== "connective") {
      continue;
    }
    if (isQuoteCitationConnective(op.connective) && quoteBodyShouldPreferPredicateProjection(ops, carrier, op.connective)) {
      return predicateQuoteBodyContractForOvertPredicateOperator();
    }
    if (op.connective === "te_form" && carrier.sourceCapabilities.inflectionClass !== null) {
      return inflectingPredicateTeFormContract();
    }
    const contract = headContractForConnective(op.connective);
    if (contract !== undefined) {
      return contract;
    }
  }
  if (
    outgoingBoundary !== undefined &&
    outgoingBoundary.kind !== "terminal" &&
    outgoingBoundary.connectiveKind !== undefined
  ) {
    return headContractForConnective(outgoingBoundary.connectiveKind);
  }
  return undefined;
}

function inflectingPredicateTeFormContract(): CarrierHeadContract {
  return {
    relation: "modification",
    accepts: PREDICATE_PROJECTIONS,
    candidatePreference: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    realizationOrder: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    contextReason: "inflecting predicate te-form connective requires direct predicate realization"
  };
}

function tosuruMakeCarrierContract(ops: readonly AuxOpNode[]): CarrierHeadContract | undefined {
  const first = ops[0];
  if (
    first?.kind !== "predicateQuoteCarrier" ||
    first.style !== "suru_attributive" ||
    (first.tosuruMode !== "treat_as" && first.tosuruMode !== "resultative_make")
  ) {
    return undefined;
  }
  if (first.tosuruMode === "resultative_make") {
    return {
      relation: "modification",
      accepts: [...PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS],
      realizationOrder: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER],
      contextReason: "`N/Aとする` resultative make construction realizes predicate-capable state heads before nominal fallback"
    };
  }
  return {
    relation: "modification",
    accepts: NOMINAL_EXPECTED_PROJECTIONS,
    realizationOrder: NOMINAL_EXPECTED_REALIZATION_ORDER,
    contextReason: "`Nとする` treat-as construction requires nominal host realization"
  };
}

function carrierHeadIsAdverbCapable(carrier: HeadHypothesisCarrier): boolean {
  const capabilities = carrier.sourceCapabilities;
  return capabilities.adverbialCapable ||
    capabilities.adverbCapableNominal ||
    capabilities.lexicalAdverb;
}

function firstAdverbialTailContract(ops: readonly AuxOpNode[]): CarrierHeadContract | undefined {
  for (const op of ops) {
    if (
      op.kind === "postverbAuxiliary" &&
      (
        op.auxiliary.kind === "adverbial_change" ||
        op.auxiliary.kind === "adverbial_change_potential" ||
        op.auxiliary.kind === "adverbial_control"
      )
    ) {
      return headContractForPostverbAuxiliary(op.auxiliary.kind);
    }
  }
  return undefined;
}

function firstProjectionTailContract(ops: readonly AuxOpNode[]): CarrierHeadContract | undefined {
  for (const op of ops) {
    if (
      op.kind === "postverbAuxiliary" &&
      op.hostAttach !== "copula_support" &&
      op.auxiliary.kind !== "adverbial_change" &&
      op.auxiliary.kind !== "adverbial_change_potential" &&
      op.auxiliary.kind !== "adverbial_control"
    ) {
      const contract = headContractForPostverbAuxiliary(op.auxiliary.kind);
      if (op.auxiliary.opChainHost === "inflecting_predicate_lemma") {
        const base = contract ?? defaultHeadContract();
        return {
          ...base,
          commitPolicy: {
            ...base.commitPolicy,
            opChainHost: "inflecting_predicate_lemma"
          },
          contextReason: base.contextReason ??
            "verbal postverb row requires an inflecting predicate lemma host"
        };
      }
      if (contract !== undefined) {
        return contract;
      }
    }
  }
  return undefined;
}

function formalStateResultContract(ops: readonly AuxOpNode[]): CarrierHeadContract | undefined {
  const hasFormalStateResult = ops.some((op) =>
    op.kind === "postverbAuxiliary" && op.auxiliary.headProjection === "formal_state_result"
  );
  return hasFormalStateResult
    ? {
      relation: "modification",
      accepts: DIRECT_PREDICATE_PROJECTIONS,
      realizationOrder: [DIRECT_PREDICATE_PROJECTIONS],
      contextReason: "formal と+なる state-result carrier requires a predicate-capable state head"
    }
    : undefined;
}

function contractForQuoteCitationEvidence(
  evidence: TailEvidenceQuoteCitation | undefined,
  ops: readonly AuxOpNode[],
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  if (evidence === undefined) {
    return undefined;
  }
  if (isRequestQuoteEvidence(evidence)) {
    return {
      relation: "quote_body",
      accepts: [...DIRECT_VERBAL_PROJECTIONS, ...DERIVED_VERBAL_PROJECTIONS],
      realizationOrder: [DIRECT_VERBAL_PROJECTIONS, DERIVED_VERBAL_PROJECTIONS],
      contextReason: "request quote/citation evidence requires a verbal request head"
    };
  }
  if (evidence.source === "predicate_quote_carrier" && evidence.carrierStyle !== undefined) {
    if (quoteBodyShouldPreferPredicateProjection(ops, carrier, evidence.connective)) {
      return predicateQuoteBodyContractForOvertPredicateOperator();
    }
    return headContractForPredicateQuoteCarrier(evidence.carrierStyle);
  }
  if (evidence.connective !== undefined) {
    if (quoteBodyShouldPreferPredicateProjection(ops, carrier, evidence.connective)) {
      return predicateQuoteBodyContractForOvertPredicateOperator();
    }
    return headContractForConnective(evidence.connective) ?? generalQuoteCitationContract();
  }
  return undefined;
}

function contractForPredicateQuoteCarrierOp(
  ops: readonly AuxOpNode[],
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  const op = ops.find((item): item is Extract<AuxOpNode, { readonly kind: "predicateQuoteCarrier" }> =>
    item.kind === "predicateQuoteCarrier"
  );
  if (op === undefined) {
    return undefined;
  }
  if (!quoteBodyHasNominalCandidate(carrier) && quoteBodySourceCanProjectPredicate(carrier)) {
    return predicateQuoteBodyContractForOvertPredicateOperator();
  }
  return headContractForPredicateQuoteCarrier(op.style);
}

function quoteBodyShouldPreferPredicateProjection(
  ops: readonly AuxOpNode[],
  _carrier: HeadHypothesisCarrier,
  _connective: string | undefined
): boolean {
  return quoteBodyHasPredicateOperatorBeforeCitation(ops);
}

function predicateQuoteBodyContractForOvertPredicateOperator(): CarrierHeadContract {
  return {
    relation: "quote_body",
    accepts: ALL_PROJECTIONS,
    realizationOrder: [DIRECT_QUOTE_BODY_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    contextReason: "quote-body with overt predicate operators preserves the content-selected direct realization before derived projections"
  };
}

function quoteBodyHasPredicateOperatorBeforeCitation(ops: readonly AuxOpNode[]): boolean {
  for (const op of ops) {
    if (op.kind === "connective" || op.kind === "predicateQuoteCarrier") {
      return false;
    }
    if (
      op.kind === "negation" ||
      op.kind === "copula" ||
      op.kind === "tense" ||
      op.kind === "voice" ||
      op.kind === "aspect" ||
      op.kind === "desire" ||
      op.kind === "conjecture" ||
      op.kind === "modal" ||
      op.kind === "postverbAuxiliary" ||
      op.kind === "predicateSuffix" ||
      op.kind === "scopeBridge" ||
      op.kind === "predicateProjectionCarrier" ||
      op.kind === "idiom"
    ) {
      return true;
    }
  }
  return false;
}

function quoteBodySourceCanProjectPredicate(carrier: HeadHypothesisCarrier): boolean {
  const capabilities = carrier.sourceCapabilities;
  return capabilities.inflectionClass !== null ||
    capabilities.naAdjectiveCapable;
}

function quoteBodyHasNominalCandidate(carrier: HeadHypothesisCarrier): boolean {
  return carrier.candidates.some((candidate) =>
    candidate.status === "admitted" &&
    (
      candidate.koreanPos === 명사 ||
      candidate.preservedCandidate?.koreanPos === 명사 ||
      (candidate.projectedStemKind === "noun" && candidate.preservedCandidate?.nominalized === undefined)
    )
  );
}

function generalQuoteCitationContract(): CarrierHeadContract {
  return {
    relation: "quote_body",
    accepts: ALL_PROJECTIONS,
    realizationOrder: [DIRECT_QUOTE_BODY_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    contextReason: "generic quote-body fallback keeps direct noun and direct predicate realizations in the same realizationOrder tier"
  };
}

function quoteAttributiveTerminalContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier,
  evidence: TailEvidenceQuoteAttributive | undefined
): CarrierHeadContract | undefined {
  if (evidence === undefined) {
    return undefined;
  }
  if (
    hasSahenVerbalizationEvidence(input, carrier) ||
    (carrier.sourceCapabilities.sahenVerbalizationCapable &&
      input.ops.some((op) => op.kind === "predicateQuoteCarrier"))
  ) {
    return {
      relation: "quote_body",
      accepts: ALL_PROJECTIONS,
      realizationOrder: [
        [...DIRECT_PREDICATE_PROJECTIONS, ...DERIVED_VERBAL_PROJECTIONS],
        DIRECT_QUOTE_BODY_PROJECTIONS,
        DERIVED_ADJECTIVAL_PROJECTIONS
      ],
      contextReason: `${evidence.source} quote-attributive carrier keeps explicit する verbalization before direct nominal realization`
    };
  }
  return {
    relation: "quote_body",
    accepts: ALL_PROJECTIONS,
    realizationOrder: [DIRECT_QUOTE_BODY_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    contextReason: `${evidence.source} quote-attributive carrier keeps the dictionary winner and lets its direct realization beat derived projections`
  };
}

function bareKeijoujiAttributiveContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  const payload = input.terminalPayload;
  if (
    input.terminal !== "attributive" ||
    input.ops.length > 0 ||
    payload === undefined ||
    payload.kind !== "attributiveBoundary"
  ) {
    return undefined;
  }
  if (payload.explicitAdnominalMarker !== undefined) {
    return {
      relation: "modification",
      accepts: DIRECT_PREDICATE_PROJECTIONS,
      candidatePreference: [DIRECT_PREDICATE_PROJECTIONS],
      realizationOrder: [DIRECT_PREDICATE_PROJECTIONS],
      contextReason: "explicit adnominal の reads the na-adjective host as a predicate, so only attributive inflection realizes it"
    };
  }
  if (payload.bareKeijoujiDirectAttributive !== true) {
    return undefined;
  }
  const accepts = [
    ...DIRECT_PREDICATE_PROJECTIONS,
    ...DERIVED_ADJECTIVAL_PROJECTIONS,
    ...NOMINAL_EXPECTED_PROJECTIONS
  ] as const;
  if (payload.bareKeijoujiKatakanaRun === true) {
    return {
      relation: "modification",
      accepts,
      candidatePreference: [DIRECT_NOMINAL_PROJECTIONS],
      realizationOrder: [DIRECT_NOMINAL_PROJECTIONS],
      contextReason: "katakana run reads as one borrowed lexical unit, so the host realizes as a transliterated nominal juxtaposition"
    };
  }
  if (!carrier.sourceCapabilities.naAdjectiveCapableNoun) {
    return {
      relation: "modification",
      accepts,
      contextReason: "bare 形状詞 attributive has no nominal analysis, so no structural reorder overrides the lexical sense order"
    };
  }
  return {
    relation: "modification",
    accepts,
    candidatePreference: [
      DIRECT_NOMINAL_PROJECTIONS,
      DIRECT_PREDICATE_PROJECTIONS,
      DERIVED_ADJECTIVAL_PROJECTIONS,
      NOMINALIZED_OR_ADJECTIVAL_NOMINAL_PROJECTIONS
    ],
    realizationOrder: [
      DIRECT_NOMINAL_PROJECTIONS,
      DIRECT_PREDICATE_PROJECTIONS,
      DERIVED_ADJECTIVAL_PROJECTIONS,
      NOMINALIZED_OR_ADJECTIVAL_NOMINAL_PROJECTIONS,
      ADVERBIAL_NOMINAL_FALLBACK_PROJECTIONS
    ],
    contextReason: "bare 形状詞可能 noun attributive prefers nominal juxtaposition; predicate realization stands only when no nominal choice exists"
  };
}

function structuralPredicateModifierContract(
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  const naAttributiveNominalContext = isNaAttributiveNominalContext(carrier, input.tokens);
  const nominalFramePredicateContext =
    evidence.nominalFrame !== undefined && carrier.sourceCapabilities.naAdjectiveCapable;
  const clauseLayoutPredicateContext =
    evidence.predicateContext !== undefined &&
    carrier.sourceCapabilities.naAdjectiveCapable &&
    evidence.predicateContext.particleSurfaces.length + evidence.predicateContext.quoteHostPrefixParticleSurfaces.length > 0;
  const stateResultPredicateContext =
    hasStateResultTail(input.ops) && carrier.sourceCapabilities.naAdjectiveCapable;
  const copulaPredicateContext =
    !naAttributiveNominalContext &&
    hasCopulaPredicateContext(input.ops) &&
    (
      carrier.sourceCapabilities.naAdjectiveCapable ||
      carrierHasDirectPredicateRealization(carrier)
    );
  const copulaTargetOnlyPredicateContext =
    copulaPredicateContext &&
    carrier.sourceCapabilities.inflectionClass === null &&
    !carrier.sourceCapabilities.naAdjectiveCapable;
  const copulaNominalIdiomContext =
    copulaPredicateContext &&
    carrier.source.tokens.some((token) => token.dictionaryForm === "無理");
  if (
    !naAttributiveNominalContext &&
    !nominalFramePredicateContext &&
    !clauseLayoutPredicateContext &&
    !stateResultPredicateContext &&
    !copulaPredicateContext
  ) {
    return undefined;
  }
  const copulaAccepts = carrier.sourceCapabilities.sahenVerbalizationCapable
    ? [...DIRECT_ADJECTIVAL_PROJECTIONS, ...DERIVED_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS] as const
    : [...DIRECT_PREDICATE_PROJECTIONS, ...DERIVED_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS] as const;
  const copulaRealizationOrder = copulaTargetOnlyPredicateContext
    ? [
      carrier.sourceCapabilities.sahenVerbalizationCapable
        ? [...DIRECT_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS]
        : [...DIRECT_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS],
      DERIVED_ADJECTIVAL_PROJECTIONS
    ] as const
    : copulaNominalIdiomContext
    ? [...NOMINAL_EXPECTED_REALIZATION_ORDER, DIRECT_PREDICATE_PROJECTIONS, DERIVED_ADJECTIVAL_PROJECTIONS] as const
    : carrier.sourceCapabilities.sahenVerbalizationCapable
    ? [DIRECT_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER, DERIVED_ADJECTIVAL_PROJECTIONS] as const
    : [DIRECT_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER, DERIVED_ADJECTIVAL_PROJECTIONS] as const;
  const accepts = copulaPredicateContext
    ? copulaAccepts
    : [...DIRECT_PREDICATE_PROJECTIONS, ...DERIVED_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS] as const;
  const realizationOrder = copulaPredicateContext
    ? copulaRealizationOrder
    : [DIRECT_PREDICATE_PROJECTIONS, DERIVED_ADJECTIVAL_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER] as const;
  const structuralDirectPredicatePreference =
    !copulaPredicateContext &&
    (clauseLayoutPredicateContext || stateResultPredicateContext) &&
    carrierHasDirectPredicateRealization(carrier);
  const requires = structuralPredicateModifierRequirements(naAttributiveNominalContext);
  return {
    relation: "modification",
    accepts,
    realizationOrder,
    ...(structuralDirectPredicatePreference
      ? {
        candidatePreference: [
          DIRECT_ADJECTIVAL_PROJECTIONS,
          DIRECT_VERBAL_PROJECTIONS,
          DERIVED_ADJECTIVAL_PROJECTIONS,
          DERIVED_VERBAL_PROJECTIONS,
          ...NOMINAL_EXPECTED_REALIZATION_ORDER
        ]
      }
      : copulaTargetOnlyPredicateContext
        ? {}
      : copulaPredicateContext
        ? { candidatePreference: copulaRealizationOrder }
        : { candidatePreference: [DIRECT_PREDICATE_PROJECTIONS] }),
    ...(requires === undefined ? {} : { requires }),
    contextReason: structuralPredicateModifierReason(naAttributiveNominalContext, {
      nominalFramePredicateContext,
      clauseLayoutPredicateContext,
      stateResultPredicateContext,
      copulaPredicateContext
    })
  };
}

function structuralPredicateModifierRequirements(naAttributiveNominalContext: boolean): HeadLicensing | undefined {
  const requires: HeadLicensing = {
    ...(naAttributiveNominalContext ? { adjectivalInflection: "na" as const } : {})
  };
  return Object.keys(requires).length === 0 ? undefined : requires;
}

function carrierHasDirectPredicateRealization(carrier: HeadHypothesisCarrier): boolean {
  return carrier.candidates.some((candidate) =>
    candidate.status === "admitted" &&
    headHypothesisCandidateDirectPredicateCategory(candidate)
  );
}

function headHypothesisCandidateDirectPredicateCategory(candidate: HeadHypothesisCandidate): boolean {
  const koreanPos = candidate.koreanPos ?? candidate.preservedCandidate?.koreanPos;
  return koreanPos === 형용사 || koreanPos === 동사;
}

function predicateNegationContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  if (!input.ops.some((op) => op.kind === "negation")) {
    return undefined;
  }
  if (carrier.sourceCapabilities.inflectionClass === null && !carrier.sourceCapabilities.sahenVerbalizationCapable) {
    return undefined;
  }
  return {
    relation: "modification",
    accepts: PREDICATE_PROJECTIONS,
    candidatePreference: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    realizationOrder: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
    contextReason: "predicate negation requires a predicate head realization"
  };
}

function structuralPredicateModifierReason(
  naAttributiveNominalContext: boolean,
  contexts: {
    readonly nominalFramePredicateContext: boolean;
    readonly clauseLayoutPredicateContext: boolean;
    readonly stateResultPredicateContext: boolean;
    readonly copulaPredicateContext: boolean;
  }
): string {
  if (naAttributiveNominalContext) {
    return "`な + N` context requires adjectival/keijou distribution head";
  }
  if (contexts.nominalFramePredicateContext) {
    return "attributive nominal-frame evidence requires predicate modifier head";
  }
  if (contexts.clauseLayoutPredicateContext) {
    return "ClauseLayout predicate argument evidence requires predicate head realization";
  }
  if (contexts.stateResultPredicateContext) {
    return "`に + なる` state/result evidence requires state predicate head realization";
  }
  if (contexts.copulaPredicateContext) {
    return "copula predicate context accepts nominal copula and adjectival/keijou predicate realization";
  }
  return "predicate/modifier context requires adjectival head realization";
}

function defaultHeadContract(): CarrierHeadContract {
  return {
    relation: "modification",
    accepts: ALL_PROJECTIONS
  };
}

function adverbialModifierTerminalContract(
  input: TailEvidenceDecisionInput
): CarrierHeadContract | undefined {
  if (input.terminal !== "adverbial_modifier") {
    return undefined;
  }
  return {
    relation: "modification",
    accepts: ALL_PROJECTIONS,
    realizationOrder: [
      ADVERBIAL_PROJECTIONS,
      ADVERBIALIZED_PREDICATE_PROJECTIONS,
      DIRECT_ADJECTIVAL_PROJECTIONS,
      NOMINAL_PROJECTIONS,
      DERIVED_ADJECTIVAL_PROJECTIONS,
      DIRECT_VERBAL_PROJECTIONS,
      DERIVED_VERBAL_PROJECTIONS
    ],
    commitPolicy: { adverbial: "explicit_evidence_required" },
    contextReason: "adverbial_modifier terminal realizes the highest-priority sense adverbially"
  };
}

function connectiveRoleAdverbialContract(
  input: TailEvidenceDecisionInput,
  carrier: HeadHypothesisCarrier
): CarrierHeadContract | undefined {
  if (!tailEvidenceHasNonTerminalConnective(input)) {
    return undefined;
  }
  if (tailEvidenceContextConnectiveRole(input) !== "adverbial") {
    return undefined;
  }
  if (!carrier.candidates.some((candidate) => stemCandidateHasConnectiveRole(candidate.preservedCandidate, "adverbial"))) {
    return undefined;
  }
  return {
    relation: "modification",
    accepts: ALL_PROJECTIONS,
    candidatePreference: [
      ADVERBIAL_PROJECTIONS
    ],
    realizationOrder: [
      ADVERBIAL_PROJECTIONS,
      [
        ...DIRECT_ADJECTIVAL_PROJECTIONS,
        ...DERIVED_ADJECTIVAL_PROJECTIONS,
        ...NOMINAL_PROJECTIONS,
        ...DIRECT_VERBAL_PROJECTIONS,
        ...DERIVED_VERBAL_PROJECTIONS
      ]
    ],
    commitPolicy: { adverbial: "explicit_evidence_required" },
    contextReason: "dictionary connectiveRole=adverbial evidence accepts adverbial head realization for this connective boundary"
  };
}

function tailEvidenceContextConnectiveRole(input: TailEvidenceDecisionInput): string | null {
  if (input.layout === undefined || input.predicateTokenIdx === undefined) {
    return null;
  }
  return input.layout.connectiveRoles.get(input.predicateTokenIdx) ?? null;
}

function tailEvidenceHasNonTerminalConnective(input: TailEvidenceDecisionInput): boolean {
  if (input.outgoingBoundary !== undefined && input.outgoingBoundary.kind !== "terminal") {
    return true;
  }
  return input.ops.some((op) => op.kind === "connective");
}

function stemCandidateHasConnectiveRole(candidate: StemCandidate | undefined, role: string): boolean {
  if (candidate === undefined) {
    return false;
  }
  return stemCandidateConnectiveRoles(candidate).includes(role);
}

function stemCandidateConnectiveRoles(candidate: StemCandidate): readonly string[] {
  const direct = candidate.connectiveRole === undefined || candidate.connectiveRole === null
    ? []
    : Array.isArray(candidate.connectiveRole)
      ? candidate.connectiveRole
      : [candidate.connectiveRole];
  return [
    ...direct,
    ...connectiveRolesFromFramePayload(candidate.senseFrame),
    ...(Array.isArray(candidate.senseFrames) ? candidate.senseFrames.flatMap(connectiveRolesFromFramePayload) : [])
  ];
}

function connectiveRolesFromFramePayload(frame: unknown): readonly string[] {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return [];
  }
  const role = (frame as Record<string, unknown>).connectiveRole;
  if (role === undefined || role === null) {
    return [];
  }
  return Array.isArray(role)
    ? role.filter((item): item is string => typeof item === "string")
    : typeof role === "string" ? [role] : [];
}

function isExplicitAdverbialContract(contract: CarrierHeadContract): boolean {
  return contract.commitPolicy?.adverbial === "explicit_evidence_required" &&
    contract.accepts.length === 1 &&
    contract.accepts[0] === "direct_adverbial";
}

function contractEligibilityRuleName(
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): string {
  if (isRequestQuoteEvidence(evidence.quoteCitation)) return "required_incompatible_request_quote_nonverbal";
  if (hasSahenVerbalizationEvidence(input, carrier)) return "required_incompatible_sahen_verbalization_nonverbal";
  if (isNaAttributiveNominalContext(carrier, input.tokens)) return "required_incompatible_na_attributive_nominal";
  if (evidence.nominalFrame !== undefined) return "required_incompatible_attributive_nominal_frame_nominal";
  if (hasStateResultTail(input.ops)) return "required_incompatible_state_change_non_state";
  if (hasCopulaPredicateContext(input.ops)) return "required_incompatible_copula_non_predicate";
  if (isExplicitAdverbialContract(contract)) return "required_incompatible_adverbial_contract_non_adverbial";
  return "required_incompatible_contract";
}

function contractEligibilityRuleReason(
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): string {
  if (isRequestQuoteEvidence(evidence.quoteCitation)) return "request quote/citation evidence requires a verbal request head";
  if (hasSahenVerbalizationEvidence(input, carrier)) return "`する` verbalization evidence requires a verbalized sahen candidate";
  if (isNaAttributiveNominalContext(carrier, input.tokens)) return "`な + N` requires an adjectival/keijou distribution head";
  if (evidence.nominalFrame !== undefined) return "attributive nominal-frame evidence requires a predicate/adjectival modifier head";
  if (hasStateResultTail(input.ops)) return "`に + なる` state/result evidence requires a state predicate candidate";
  if (hasCopulaPredicateContext(input.ops)) return "copula predicate context requires a predicate candidate";
  if (isExplicitAdverbialContract(contract)) return "explicit adverbial tail evidence requires an adverbial realization candidate";
  return "tail head contract rejects candidate realization choices";
}

function contractPreferenceRuleName(
  input: TailEvidenceDecisionInput,
  evidence: TailEvidenceContext,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract,
  contractOwner?: ContractOwnerPrecedence
): string {
  if (isQuotedConcessiveLimitEvidence(evidence.quoteCitation)) return "context_prefer_quote_body_projection";
  if (evidence.quoteCitation !== undefined && contract.relation === "quote_body") return "context_prefer_quote_body_projection";
  if (hasSahenVerbalizationEvidence(input, carrier)) return "context_prefer_sahen_verbalization";
  if (isExplicitAdverbialContract(contract)) return "context_prefer_adverbial_candidate";
  if (contractOwnerUsesProjectionRule(contractOwner)) return "context_prefer_contract_candidate_projection";
  if (isNaAttributiveNominalContext(carrier, input.tokens)) return "context_prefer_na_attributive_predicate";
  if (evidence.nominalFrame !== undefined) return "context_prefer_attributive_nominal_frame_predicate";
  if (evidence.predicateContext !== undefined) return "context_prefer_clause_layout_predicate_arguments";
  if (hasStateResultTail(input.ops)) return "context_prefer_state_change_predicate";
  if (hasCopulaPredicateContext(input.ops)) return "context_prefer_copula_keijou_predicate";
  return "context_prefer_contract_candidate_projection";
}

function contractOwnerUsesProjectionRule(owner: ContractOwnerPrecedence | undefined): boolean {
  return owner === "data:connective_projection" ||
    owner === "code:predicate_suffix_projection";
}

function selectedChoiceReason(
  contract: CarrierHeadContract,
  candidate: CandidateWorkState,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice
): string {
  const matchedOrder = realizationOrderGroups(contract)
    .some((group) => group.includes(selectedChoice.projectionKind));
  if (matchedOrder && realizationChoiceIsDirect(candidate, selectedChoice)) {
    return "selected by realizationOrder group and direct candidate realization";
  }
  return matchedOrder
    ? "selected by realizationOrder group within the chosen candidate"
    : "selected by candidate capability order within the chosen candidate";
}

function preferenceProjectionKinds(preference: PreferenceResult | null): readonly HeadProjectionKind[] {
  return preference?.projectionKinds ?? [];
}

function choiceIsSelected(
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice | undefined,
  candidate: CandidateWorkState,
  capability: CandidateCapability,
  choice: HeadRealization
): selectedChoice is HeadTailEvidenceSelectedRealizationChoice {
  return selectedChoice !== undefined &&
    selectedChoice.candidateIndex === candidate.hypothesis.index &&
    selectedChoice.capabilityId === capability.id &&
    selectedChoice.category === choice.category &&
    selectedChoice.projectionKind === choice.projectionKind;
}

function choiceIsPreferred(
  preference: PreferenceResult | null,
  choice: HeadRealization
): boolean {
  return preferenceProjectionKinds(preference).includes(choice.projectionKind);
}

function acceptedChoiceWithFailedLicensing(
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract,
  choice: HeadRealization
): boolean {
  return contract.accepts.includes(choice.projectionKind) &&
    !headLicensingMatches(carrier, contract.requires, choice);
}

function choiceRejectedByAccepts(
  contract: CarrierHeadContract,
  choice: HeadRealization
): boolean {
  return !contract.accepts.includes(choice.projectionKind);
}

function choiceRejectReason(
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract,
  choice: HeadRealization
): string {
  if (choiceRejectedByAccepts(contract, choice)) {
    return `${contract.relation} relation does not accept ${choice.projectionKind} projection kind`;
  }
  if (contract.accepts.includes(choice.projectionKind) && !headLicensingMatches(carrier, contract.requires, choice)) {
    return headLicensingRejectReason(contract.requires);
  }
  return "choice is rejected by tail head contract";
}

function selectRealizationChoice(
  stem: StemNode,
  selected: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): HeadTailEvidenceSelectedRealizationChoice | undefined {
  const choices = eligibleRealizationChoices(stem, selected, carrier, contract);
  if (choices.length === 0) {
    return undefined;
  }
  for (const projectionKinds of realizationOrderGroups(contract)) {
    const matching = choices.filter(({ choice }) => projectionKinds.includes(choice.projectionKind));
    const selectedChoice = bestRealizationChoice(selected, matching);
    if (selectedChoice !== null) {
      return {
        candidateIndex: selected.hypothesis.index,
        capabilityId: selectedChoice.capability.id,
        ...selectedChoice.choice
      };
    }
  }
  const fallback = bestRealizationChoice(selected, choices);
  if (fallback === null) {
    return undefined;
  }
  return {
    candidateIndex: selected.hypothesis.index,
    capabilityId: fallback.capability.id,
    ...fallback.choice
  };
}

function candidateRealizationChoiceDecisions(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice | undefined,
  preference: PreferenceResult | null
): HeadTailEvidenceRealizationChoiceDecision[] {
  return candidateCapabilities(candidate)
    .flatMap((capability) =>
      capability.choices.map((choice): HeadTailEvidenceRealizationChoiceDecision => {
        const base = {
          capabilityId: capability.id,
          category: choice.category,
          projectionKind: choice.projectionKind
        };
        if (choiceRejectedByAccepts(contract, choice)) {
          return {
            ...base,
            state: "rejected",
            reason: choiceRejectReason(candidate, carrier, contract, choice)
          };
        }
        if (acceptedChoiceWithFailedLicensing(candidate, carrier, contract, choice)) {
          return {
            ...base,
            state: "rejected",
            reason: choiceRejectReason(candidate, carrier, contract, choice)
          };
        }
        if (!candidateChoiceCanMaterialize(stem, candidate, choice, contract)) {
          return {
            ...base,
            state: "rejected",
            reason: candidateChoiceMaterializationRejectReason(stem, candidate, choice, contract)
          };
        }
        if (choiceIsSelected(selectedChoice, candidate, capability, choice)) {
          return {
            ...base,
            state: "selected",
            reason: selectedChoiceReason(contract, candidate, selectedChoice)
          };
        }
        if (choiceIsPreferred(preference, choice)) {
          return {
          ...base,
          state: "preferred",
          reason: `candidatePreference keeps ${choice.projectionKind} projection kind candidates before dictionary fallback`
        };
        }
        return {
          ...base,
          state: "eligible",
          reason: "choice satisfies tail head contract"
        };
      })
    );
}

function eligibleRealizationChoices(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): RealizationChoiceWork[] {
  return contractAcceptedRealizationChoices(candidate, carrier, contract)
    .filter(({ choice }) => candidateChoiceCanMaterialize(stem, candidate, choice, contract));
}

function candidateContractMaterializability(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): HeadTailEvidenceCandidateContractMaterializability {
  const accepted = contractAcceptedRealizationChoices(candidate, carrier, contract);
  if (accepted.length === 0) {
    return "no_accepted_choice";
  }
  return accepted.some(({ choice }) => candidateChoiceCanMaterialize(stem, candidate, choice, contract))
    ? "materializable"
    : "accepted_but_non_materializable";
}

function contractAcceptedRealizationChoices(
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): RealizationChoiceWork[] {
  return candidateCapabilities(candidate)
    .flatMap((capability) =>
      capability.choices.map((choice): RealizationChoiceWork => ({ capability, choice }))
    )
    .filter(({ choice }) =>
      contract.accepts.includes(choice.projectionKind) &&
      headLicensingMatches(carrier, contract.requires, choice)
    );
}

function candidateChoiceCanMaterialize(
  stem: StemNode,
  candidate: CandidateWorkState,
  choice: HeadRealization,
  contract: CarrierHeadContract
): boolean {
  if (
    contract.commitPolicy?.opChainHost === "inflecting_predicate_lemma" &&
    !candidateChoiceProvidesInflectingPredicateLemma(stem, candidate, choice)
  ) {
    return false;
  }
  if (
    contract.commitPolicy?.hostBase === "lexical_stem_root" &&
    !candidateProvidesLexicalStemRoot(stem, candidate)
  ) {
    return false;
  }
  if (stem.kind !== "candidateSet") {
    return true;
  }
  const kind = candidateKind(candidate);
  if (kind === "unknown") {
    return true;
  }
  if (kind === "adverb") {
    return selectedChoiceIsAdverbialNominalFallback(choice) ||
      (
        choice.category === "adverbial" &&
        choice.projectionKind === "direct_adverbial" &&
        contract.commitPolicy?.adverbial === "explicit_evidence_required"
      );
  }
  return candidateKindCanMaterializeChoice(candidate, kind, choice);
}

function candidateChoiceMaterializationRejectReason(
  stem: StemNode,
  candidate: CandidateWorkState,
  choice: HeadRealization,
  contract: CarrierHeadContract
): string {
  if (
    contract.commitPolicy?.opChainHost === "inflecting_predicate_lemma" &&
    !candidateChoiceProvidesInflectingPredicateLemma(stem, candidate, choice)
  ) {
    return "op-chain host requires an inflecting predicate lemma realization";
  }
  if (
    contract.commitPolicy?.hostBase === "lexical_stem_root" &&
    !candidateProvidesLexicalStemRoot(stem, candidate)
  ) {
    return "derivational host base requires a lexical stem root realization";
  }
  return "candidate cannot materialize this realization choice";
}

function candidateProvidesLexicalStemRoot(stem: StemNode, candidate: CandidateWorkState): boolean {
  const winner = candidate.stemCandidate ?? candidate.preserved ?? { lemma: candidate.hypothesis.lemma };
  return derivationalHostStemRootOf(derivationalHostStemShapeForCandidate(stem, winner)) !== null;
}

function candidateChoiceProvidesInflectingPredicateLemma(
  stem: StemNode,
  candidate: CandidateWorkState,
  choice: HeadRealization
): boolean {
  const kind = stem.kind === "candidateSet" ? candidateKind(candidate) : stem.kind;
  switch (choice.projectionKind) {
    case "direct_adjectival":
      return kind === "adj";
    case "direct_verbal":
      return kind === "verb";
    case "projected_nominal_adjectival":
      return kind === "adj";
    case "sahen_verbalized_nominal":
      return true;
    default:
      return false;
  }
}

function uniqueProjectionKinds(kinds: readonly HeadProjectionKind[]): HeadProjectionKind[] {
  return kinds.filter((kind, index, all) => all.indexOf(kind) === index);
}

function realizationOrderGroups(contract: CarrierHeadContract): HeadProjectionKind[][] {
  return (contract.realizationOrder ?? [])
    .map(uniqueProjectionKinds)
    .filter((group) => group.length > 0);
}

function headLicensingMatches(
  carrier: HeadHypothesisCarrier,
  requires: HeadLicensing | undefined,
  choice: HeadRealization
): boolean {
  if (requires?.adjectivalInflection === undefined || choice.category !== "adjectival_predicate") {
    return true;
  }
  return (carrier.sourceCapabilities.naAdjectiveCapable ? "na" : "i") === requires.adjectivalInflection;
}

function headLicensingRejectReason(requires: HeadLicensing | undefined): string {
  if (requires?.adjectivalInflection !== undefined) {
    return `head licensing requires ${requires.adjectivalInflection}-adjectival inflection`;
  }
  return "head licensing requirements are not satisfied";
}

function candidateCapabilities(candidate: CandidateWorkState): readonly CandidateCapability[] {
  const profileCapabilities = candidate.hypothesis.headProfile?.capabilities;
  if (profileCapabilities !== undefined) {
    if (stemCandidateIsSahenProjection(candidate.stemCandidate)) {
      const sahenCapabilities = profileCapabilities
        .map((capability): CandidateCapability => ({
          ...capability,
          choices: capability.choices.filter((choice) =>
            choice.projectionKind === "direct_verbal" ||
            choice.projectionKind === "sahen_verbalized_nominal"
          )
        }))
        .filter((capability) => capability.choices.length > 0);
      return sahenCapabilities.length === 0
        ? [sahenProjectionCapability(candidate)]
        : sahenCapabilities;
    }
    if (profileCapabilities.length === 0) {
      return profileCapabilities;
    }
    return profileCapabilities;
  }
  const orderKey = {
    ...(candidate.hypothesis.priorityGroup === undefined ? {} : { priorityGroup: candidate.hypothesis.priorityGroup }),
    ...(candidate.hypothesis.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.hypothesis.priorityInGroup }),
    projectionOrder: headHypothesisProjectionOrdinal(candidate.hypothesis)
  };
  const kind = candidateKind(candidate);
  if (kind === "verb") {
    return [{
      id: "sense_rendering",
      source: "sense_rendering",
      orderKey,
      choices: [{
        category: "verbal_predicate",
        projectionKind: "direct_verbal"
      }]
    }];
  }
  if (kind === "adj") {
    return [{
      id: "sense_rendering",
      source: "sense_rendering",
      orderKey,
      choices: [{
        category: "adjectival_predicate",
        projectionKind: "direct_adjectival"
      }]
    }];
  }
  if (kind === "adverb") {
    return [{
      id: "sense_rendering",
      source: "sense_rendering",
      orderKey,
      choices: [{
        category: "adverbial",
        projectionKind: "direct_adverbial"
      }]
    }];
  }
  return [{
    id: "sense_rendering",
    source: "sense_rendering",
    orderKey,
    choices: [{
      category: "nominal",
      projectionKind: "direct_nominal"
    }]
  }];
}

function stemCandidateIsSahenProjection(candidate: StemCandidate | undefined): boolean {
  return candidate?.shortNegationPolicy === "sahen_split";
}

function sahenProjectionCapability(candidate: CandidateWorkState): CandidateCapability {
  return {
    id: "sahen_verbal",
    source: "sahen_capability",
    orderKey: {
      ...(candidate.hypothesis.priorityGroup === undefined ? {} : { priorityGroup: candidate.hypothesis.priorityGroup }),
      ...(candidate.hypothesis.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.hypothesis.priorityInGroup }),
      projectionOrder: headHypothesisProjectionOrdinal(candidate.hypothesis)
    },
    choices: [{
      category: "verbal_predicate",
      projectionKind: "sahen_verbalized_nominal"
    }]
  };
}

function bestRealizationChoice(
  candidate: CandidateWorkState,
  choices: readonly RealizationChoiceWork[]
): RealizationChoiceWork | null {
  if (choices.length === 0) {
    return null;
  }
  let best = choices[0]!;
  for (const choice of choices.slice(1)) {
    if (realizationChoiceCompare(candidate, choice, best) < 0) {
      best = choice;
    }
  }
  return best;
}

function realizationChoiceCompare(
  candidate: CandidateWorkState,
  left: RealizationChoiceWork,
  right: RealizationChoiceWork
): number {
  return realizationChoiceDirectnessOrder(candidate, left.choice) -
    realizationChoiceDirectnessOrder(candidate, right.choice) ||
    capabilityOrderCompare(left.capability, right.capability);
}

function realizationChoiceDirectnessOrder(
  candidate: CandidateWorkState,
  choice: HeadRealization
): number {
  return realizationChoiceIsDirect(candidate, choice) ? 0 : 1;
}

function realizationChoiceIsDirect(
  candidate: CandidateWorkState,
  choice: HeadRealization
): boolean {
  if (
    choice.projectionKind === "adverbialized_adjectival" ||
    choice.projectionKind === "adverbialized_verbal"
  ) {
    return false;
  }
  const category = directKoreanRealizationCategory(candidate);
  return category !== undefined && choice.category === category;
}

function directKoreanRealizationCategory(
  candidate: CandidateWorkState
): HeadRealization["category"] | undefined {
  const koreanPos = candidate.hypothesis.koreanPos ??
    candidate.preserved?.koreanPos ??
    candidate.stemCandidate?.koreanPos;
  if (koreanPos === 명사) return "nominal";
  if (koreanPos === 형용사) return "adjectival_predicate";
  if (koreanPos === 동사) return "verbal_predicate";
  if (koreanPos === 부사) return "adverbial";
  return undefined;
}

function capabilityOrderCompare(left: CandidateCapability, right: CandidateCapability): number {
  return orderKeyValue(left.orderKey.priorityGroup) - orderKeyValue(right.orderKey.priorityGroup) ||
    orderKeyValue(left.orderKey.priorityInGroup) - orderKeyValue(right.orderKey.priorityInGroup) ||
    orderKeyValue(left.orderKey.projectionOrder) - orderKeyValue(right.orderKey.projectionOrder);
}

function orderKeyValue(value: number | undefined): number {
  return value ?? Number.MAX_SAFE_INTEGER;
}

function collectTailEvidence(input: TailEvidenceDecisionInput): TailEvidenceContext {
  return {
    ...quoteCitationEvidence(input.ops, input.outgoingBoundary),
    ...nominalFrameEvidence(input),
    ...quoteAttributiveEvidence(input),
    ...predicateContextEvidence(input)
  };
}

function quoteCitationEvidence(
  ops: readonly AuxOpNode[],
  outgoingBoundary: TailEvidenceOutgoingBoundary | undefined
): Pick<TailEvidenceContext, "quoteCitation"> {
  for (const op of ops) {
    if (op.kind === "connective") {
      if (op.quoteBoundary !== undefined) {
        return {
          quoteCitation: {
            source: "connective_quote_boundary",
            clauseForm: op.quoteBoundary.koreanClauseForm,
            connective: op.connective,
            surface: op.surface,
            ...(op.quoteBoundary.reportingPassiveRoleLabel === undefined
              ? {}
              : { reportingPassiveRoleLabel: op.quoteBoundary.reportingPassiveRoleLabel }),
            ...(op.quoteBoundary.adjectivalDistributionContent === undefined
              ? {}
              : { adjectivalDistributionContent: op.quoteBoundary.adjectivalDistributionContent })
          }
        };
      }
      if (isQuoteCitationConnective(op.connective)) {
        return {
          quoteCitation: {
            source: "connective_kind",
            connective: op.connective,
            surface: op.surface
          }
        };
      }
    }
    if (op.kind === "predicateQuoteCarrier") {
      if (op.style === "suru_attributive" && (op.tosuruMode === "treat_as" || op.tosuruMode === "resultative_make")) {
        continue;
      }
      return {
        quoteCitation: {
          source: "predicate_quote_carrier",
          carrierStyle: op.style
        }
      };
    }
  }
  const boundaryEvidence = quoteCitationEvidenceFromOutgoingBoundary(outgoingBoundary);
  if (boundaryEvidence !== undefined) {
    return { quoteCitation: boundaryEvidence };
  }
  return {};
}

function quoteCitationEvidenceFromOutgoingBoundary(
  boundary: TailEvidenceOutgoingBoundary | undefined
): TailEvidenceQuoteCitation | undefined {
  if (boundary === undefined || boundary.kind === "terminal" || boundary.connectiveKind === undefined) {
    return undefined;
  }
  if (boundary.quoteBoundary !== undefined) {
    return {
      source: "connective_quote_boundary",
      clauseForm: boundary.quoteBoundary.koreanClauseForm,
      connective: boundary.connectiveKind,
      ...(boundary.surface === undefined ? {} : { surface: boundary.surface }),
      ...(boundary.quoteBoundary.reportingPassiveRoleLabel === undefined
        ? {}
        : { reportingPassiveRoleLabel: boundary.quoteBoundary.reportingPassiveRoleLabel }),
      ...(boundary.quoteBoundary.adjectivalDistributionContent === undefined
        ? {}
        : { adjectivalDistributionContent: boundary.quoteBoundary.adjectivalDistributionContent })
    };
  }
  if (!isQuoteCitationConnective(boundary.connectiveKind)) {
    return undefined;
  }
  return {
    source: "connective_kind",
    connective: boundary.connectiveKind,
    ...(boundary.surface === undefined ? {} : { surface: boundary.surface })
  };
}

function nominalFrameEvidence(input: TailEvidenceDecisionInput): Pick<TailEvidenceContext, "nominalFrame"> {
  const payload = input.terminalPayload;
  if (input.terminal !== "attributive" || payload?.kind !== "attributiveBoundary") {
    return {};
  }
  return {
    nominalFrame: {
      source: "attributive_boundary",
      headKind: payload.headKind,
      headSurface: payload.head.surface
    }
  };
}

function quoteAttributiveEvidence(input: TailEvidenceDecisionInput): Pick<TailEvidenceContext, "quoteAttributive"> {
  if (input.terminal !== "attributive" || input.tokens === undefined) {
    return {};
  }
  const sourceEnd = tailEvidenceSourceEnd(input.stem);
  if (sourceEnd === null) {
    return {};
  }
  for (const markerIdx of quoteAttributiveMarkerCandidates(input.tokens, sourceEnd)) {
    const toiuHeadIdx = toiuAttributiveHeadIndex(input.tokens, markerIdx, input.tokens.length);
    const toiuTailEnd = toiuAttributiveTailEnd(input.tokens, markerIdx, input.tokens.length);
    if (toiuHeadIdx !== null && toiuTailEnd !== null && quoteAttributiveHeadIsAdmissible(input.tokens, toiuHeadIdx)) {
      return {
        quoteAttributive: {
          source: "toiu_attributive",
          headSurface: input.tokens[toiuHeadIdx]!.surface
        }
      };
    }
    const quote = quoteMarkerRelationAt(input.tokens, markerIdx, { consumers: ["tail_multi_clause"] });
    const bareHeadIdx = quote?.canonicalSurface === "って"
      ? nextNonSpaceIndex(input.tokens, quote.span.endExclusive, input.tokens.length)
      : null;
    if (bareHeadIdx !== null && quoteAttributiveHeadIsAdmissible(input.tokens, bareHeadIdx)) {
      return {
        quoteAttributive: {
          source: "bare_tte_attributive",
          headSurface: input.tokens[bareHeadIdx]!.surface
        }
      };
    }
  }
  return {};
}

function tailEvidenceSourceEnd(stem: StemNode): number | null {
  const tokenIndices = stem.source.tokenIndices;
  return tokenIndices.length === 0 ? null : Math.max(...tokenIndices);
}

function quoteAttributiveMarkerCandidates(
  tokens: readonly RuntimeHaruToken[],
  sourceEnd: number
): number[] {
  const first = nextNonSpaceIndex(tokens, sourceEnd + 1, tokens.length);
  if (first === null) {
    return [];
  }
  const second = nextNonSpaceIndex(tokens, first + 1, tokens.length);
  return second === null ? [first] : [first, second];
}

function quoteAttributiveHeadIsAdmissible(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  if (isDerivedNominalPhraseHead(tokens, idx) || derivedNominalPhraseSpanAt(tokens, idx) !== null) {
    return true;
  }
  const token = tokens[idx];
  if (token === undefined || !isNominalLike(token)) {
    return false;
  }
  if ((token.pos & POS0) === 代名詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form !== "もの" && form !== "物" && form !== "もん";
}

function predicateContextEvidence(input: TailEvidenceDecisionInput): Pick<TailEvidenceContext, "predicateContext"> {
  const predicateIdx = input.predicateTokenIdx;
  const layout = input.layout;
  if (predicateIdx === undefined || layout === undefined) {
    return {};
  }
  const clause = layout.clauseOfPredicate(predicateIdx);
  if (clause === undefined) {
    return {};
  }
  const inPredicateQuoteScope = (idx: number): boolean => layout.sameQuoteScope(idx, predicateIdx);
  const particleSurfaces = clause.particlesOf(predicateIdx)
    .filter(inPredicateQuoteScope)
    .map((idx) => input.tokens?.[idx]?.surface)
    .filter((surface): surface is string => surface !== undefined);
  const quoteHostPrefixParticleSurfaces = layout.quoteHostPrefixParticlesOf(predicateIdx)
    .filter(inPredicateQuoteScope)
    .map((idx) => input.tokens?.[idx]?.surface)
    .filter((surface): surface is string => surface !== undefined);
  if (particleSurfaces.length === 0 && quoteHostPrefixParticleSurfaces.length === 0) {
    return {};
  }
  return {
    predicateContext: {
      source: "clause_layout",
      particleSurfaces,
      quoteHostPrefixParticleSurfaces
    }
  };
}

function isQuoteCitationConnective(connective: string): boolean {
  return connective === "quotative" ||
    connective === "question_quotative" ||
    connective === "question_content" ||
    connective === "question_content_alternative" ||
    connective === "request_complement" ||
    connective === "wish_complement" ||
    connective === "cognitive_complement" ||
    connective === "quoted_concessive" ||
    connective === "retrospective_quotative" ||
    connective === "predicate_projection_quote_attributive";
}

function isRequestQuoteEvidence(evidence: TailEvidenceQuoteCitation | undefined): boolean {
  return evidence?.clauseForm === "달라고" || evidence?.clauseForm === "달라는 말을";
}

function isQuotedConcessiveLimitEvidence(evidence: TailEvidenceQuoteCitation | undefined): boolean {
  return evidence?.connective === "quoted_concessive" &&
    (evidence.surface?.includes("ないまでも") === true ||
      evidence.surface?.includes("ぬまでも") === true);
}

function hasSahenVerbalizationEvidence(input: TailEvidenceDecisionInput, carrier: HeadHypothesisCarrier): boolean {
  if (input.stem.kind !== "candidateSet") {
    return false;
  }
  return input.stem.sourcePredicateShape === "sahen_verbalization" ||
    (carrier.admittedStemKind === "verb" && carrier.sourceCapabilities.sahenVerbalizationCapable) ||
    input.stem.candidates.some(stemCandidateIsSahenProjection);
}

function hasPotentialKotoGaDekiruTail(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru");
}

function rankedCandidateOpenSet(
  candidates: readonly CandidateWorkState[],
  preference: PreferenceResult | null,
  stem: StemNode,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): CandidateWorkState[] {
  const open = candidateOpenSetPool(candidates, stem, carrier, contract);
  const materializabilityRanks = new Map(open.map((candidate) => [
    candidate,
    candidateMaterializabilityRank(stem, candidate, carrier, contract)
  ]));
  const realizationTierRanks = new Map(open.map((candidate) => [
    candidate,
    candidateRealizationTierRank(stem, candidate, carrier, contract)
  ]));
  return [...open].sort((left, right) =>
    candidatePreferenceRank(left, preference) - candidatePreferenceRank(right, preference) ||
    orderKeyValue(candidatePriorityGroup(left)) - orderKeyValue(candidatePriorityGroup(right)) ||
    materializabilityRanks.get(left)! - materializabilityRanks.get(right)! ||
    realizationTierRanks.get(left)! - realizationTierRanks.get(right)! ||
    orderKeyValue(left.hypothesis.priorityInGroup ?? left.preserved?.priorityInGroup) -
      orderKeyValue(right.hypothesis.priorityInGroup ?? right.preserved?.priorityInGroup) ||
    left.hypothesis.index - right.hypothesis.index
  );
}

function candidateOpenSetPool(
  candidates: readonly CandidateWorkState[],
  stem: StemNode,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): CandidateWorkState[] {
  const active = candidates.filter((candidate) => !candidate.pruned);
  const finalPriorityGroup = candidatePriorityGroups(active).at(-1);
  return active.filter((candidate) => {
    const materializability = candidateContractMaterializability(stem, candidate, carrier, contract);
    if (materializability === "materializable") {
      return true;
    }
    return materializability === "no_accepted_choice" &&
      finalPriorityGroup?.candidates.includes(candidate) === true;
  });
}

function candidatePreferenceRank(candidate: CandidateWorkState, preference: PreferenceResult | null): number {
  return preference === null || preference.candidateIndices.includes(candidate.hypothesis.index) ? 0 : 1;
}

function candidateMaterializabilityRank(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): number {
  return candidateContractMaterializability(stem, candidate, carrier, contract) === "materializable" ? 0 : 1;
}

function candidateRealizationTierRank(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): number {
  const choices = eligibleRealizationChoices(stem, candidate, carrier, contract);
  const tier = realizationOrderGroups(contract).findIndex((projectionKinds) =>
    choices.some(({ choice }) => projectionKinds.includes(choice.projectionKind))
  );
  return tier < 0 ? Number.MAX_SAFE_INTEGER : tier;
}

function candidateWorkStateIdentity(candidate: CandidateWorkState): StemCandidateIdentity {
  return {
    provenance: candidate.hypothesis.provenance,
    projectionOrdinal: headHypothesisProjectionOrdinal(candidate.hypothesis)
  };
}

function candidateCanSurviveUnderContract(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): boolean {
  const choice = selectRealizationChoice(stem, candidate, carrier, contract);
  return selectedStemCandidateCommitDecision(
    stem,
    candidate,
    choice,
    contract,
    null
  ).status !== "not_applicable";
}

function candidateCanEnterContractPool(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): boolean {
  if (stem.kind !== "candidateSet") {
    return eligibleRealizationChoices(stem, candidate, carrier, contract).length > 0;
  }
  return candidateCanCommitUnderContract(stem, candidate, carrier, contract);
}

function candidateCanCommitUnderContract(
  stem: StemNode,
  candidate: CandidateWorkState,
  carrier: HeadHypothesisCarrier,
  contract: CarrierHeadContract
): boolean {
  const choice = selectRealizationChoice(stem, candidate, carrier, contract);
  return selectedStemCandidateCommitDecision(
    stem,
    candidate,
    choice,
    contract,
    null
  ).status === "committed";
}

function candidateDecisionTrace(
  stem: StemNode,
  candidate: CandidateWorkState,
  preference: PreferenceResult | null,
  choiceContract: CarrierHeadContract,
  carrier: HeadHypothesisCarrier,
  openSet: readonly StemCandidateIdentity[]
): HeadTailEvidenceCandidateDecision {
  const candidateRealizationChoice = selectRealizationChoice(stem, candidate, carrier, choiceContract);
  const stemCommit = selectedStemCandidateCommitDecision(
    stem,
    candidate,
    candidateRealizationChoice,
    choiceContract,
    preference?.candidateIndices.includes(candidate.hypothesis.index) === true ? preference.rule : null
  );
  const inPreferredSubset = preference === null || preference.candidateIndices.includes(candidate.hypothesis.index);
  const inOpenSet = openSet.some((identity) =>
    stemCandidateIdentitiesEqual(identity, candidateWorkStateIdentity(candidate))
  );
  const state = candidate.pruned
    ? "pruned"
    : candidate.preferred
      ? "preferred"
      : "eligible";
  const exclusionReason = candidate.pruned
    ? candidate.pruneReason
    : !inOpenSet
      ? "candidate is outside the materializable open set"
      : !inPreferredSubset
        ? `ranked after context preference: ${preference?.reason ?? "no context preference"}`
        : undefined;
  return {
    index: candidate.hypothesis.index,
    lemma: candidate.hypothesis.lemma,
    provenance: candidate.hypothesis.provenance,
    state,
    contractMaterializability: candidateContractMaterializability(
      stem,
      candidate,
      carrier,
      choiceContract
    ),
    statusBeforeDecision: candidate.hypothesis.status,
    ...(candidate.stemCandidateIndex === undefined ? {} : { stemCandidateIndex: candidate.stemCandidateIndex }),
    ...(candidate.stemCandidateIndexSource === undefined ? {} : { stemCandidateIndexSource: candidate.stemCandidateIndexSource }),
    stemCommitStatus: stemCommit.status,
    stemCommitReason: stemCommit.reason,
    ...(candidate.projectedKind === undefined ? {} : { projectedStemKind: candidate.projectedKind }),
    ...(candidate.hypothesis.koreanPos === undefined ? {} : { koreanPos: candidate.hypothesis.koreanPos }),
    ...(candidate.hypothesis.priorityGroup === undefined ? {} : { priorityGroup: candidate.hypothesis.priorityGroup }),
    ...(candidate.hypothesis.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.hypothesis.priorityInGroup }),
    ...(candidate.hypothesis.senseIndex === undefined ? {} : { senseIndex: candidate.hypothesis.senseIndex }),
    projectionOrdinal: headHypothesisProjectionOrdinal(candidate.hypothesis),
    ...(candidate.pruneReason === undefined ? {} : { pruneReason: candidate.pruneReason }),
    ...(candidate.contextReason === undefined ? {} : { contextReason: candidate.contextReason }),
    ...(exclusionReason === undefined ? {} : { exclusionReason }),
    realizationChoices: candidateRealizationChoiceDecisions(
      stem,
      candidate,
      carrier,
      choiceContract,
      undefined,
      preference
    )
  };
}

function pruneCandidates(candidates: readonly CandidateWorkState[], indices: readonly number[], reason: string): void {
  for (const candidate of candidates) {
    if (indices.includes(candidate.hypothesis.index)) {
      candidate.pruned = true;
      candidate.pruneReason = reason;
    }
  }
}

function isNaAttributiveNominalContext(
  carrier: HeadHypothesisCarrier,
  tokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  if (tokens === undefined || !carrier.sourceCapabilities.naAdjectiveCapable) {
    return false;
  }
  const sourceIdx = carrier.source.tokenIndices.at(-1);
  if (sourceIdx === undefined) {
    return false;
  }
  const naIdx = nextNonBlankIndex(tokens, sourceIdx + 1);
  const na = naIdx === null ? undefined : tokens[naIdx];
  if (naIdx === null || na === undefined || na.surface !== "な" || na.dictionaryForm !== "だ") {
    return false;
  }
  const headIdx = nextNonBlankIndex(tokens, naIdx + 1);
  const head = headIdx === null ? undefined : tokens[headIdx];
  return head !== undefined && isNominalLike(head);
}

function nextNonBlankIndex(tokens: readonly RuntimeHaruToken[], start: number): number | null {
  for (let idx = start; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && token.surface.trim().length > 0) {
      return idx;
    }
  }
  return null;
}

function hasStateResultTail(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) =>
    op.kind === "postverbAuxiliary" &&
    (
      op.auxiliary.kind === "state_change" ||
      op.auxiliary.kind === "state_change_potential" ||
      op.auxiliary.kind === "appearance_state_change" ||
      op.auxiliary.kind === "appearance_state_change_potential"
    )
  );
}

function hasCopulaPredicateContext(ops: readonly AuxOpNode[]): boolean {
  const first = ops[0];
  return first?.kind === "copula" ||
    first?.kind === "scopeBridge" ||
    first?.kind === "adjCopulaBridge";
}

function candidateKind(candidate: CandidateWorkState): "verb" | "adj" | "noun" | "adverb" | "unknown" {
  const koreanPos = candidate.stemCandidate?.koreanPos ?? candidate.preserved?.koreanPos ?? candidate.hypothesis.koreanPos;
  if (koreanPos === 동사) return "verb";
  if (koreanPos === 형용사) return "adj";
  if (koreanPos === 명사) return "noun";
  if (koreanPos === 부사) return "adverb";
  return candidate.projectedKind ?? "unknown";
}

function stemCandidateMatchForHypothesis(
  stem: StemNode,
  hypothesis: HeadHypothesisCandidate
): StemCandidateHypothesisMatch | undefined {
  if (stem.kind !== "candidateSet" || hypothesis.preservedCandidate === undefined) {
    return undefined;
  }
  const index = stem.candidates.findIndex((candidate) =>
    stemCandidateMatches(candidate, hypothesis.preservedCandidate!)
  );
  if (index >= 0) {
    return { index, source: "strict_identity" };
  }
  const identityMatches = stem.candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => stemCandidateIdentityMatchesHypothesis(candidate, hypothesis));
  if (identityMatches.length === 1) {
    return { index: identityMatches[0]!.candidateIndex, source: "strict_identity" };
  }
  return undefined;
}

function selectedStemCandidateCommitDecision(
  stem: StemNode,
  candidate: CandidateWorkState,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice | undefined,
  contract: CarrierHeadContract,
  contextRule: string | null
): StemCommitDecision {
  if (stem.kind !== "candidateSet") {
    if (selectedChoice !== undefined && concreteStemMatchesSelectedCandidate(stem, candidate, selectedChoice)) {
      return {
        status: "committed",
        reason: "selected preserved candidate is already materialized by the pre-narrowed stem"
      };
    }
    if (
      preNarrowedStemIsProjectionOfCandidate(stem, candidate) &&
      preNarrowedCandidateCanPromoteToSelectedChoice(candidate, selectedChoice)
    ) {
      return {
        status: "committed",
        reason: "selected preserved candidate can promote the pre-narrowed stem render path"
      };
    }
    if (
      contextRule !== null &&
      preNarrowedCandidateCanPromoteByContextRule(candidate, selectedChoice, contract, contextRule)
    ) {
      return {
        status: "committed",
        reason: "context-selected preserved candidate can promote the pre-narrowed stem render path"
      };
    }
    if (
      preNarrowedStemRejectedByContract(stem, contract) &&
      preNarrowedCandidateCanPromoteToSelectedChoice(candidate, selectedChoice)
    ) {
      return {
        status: "committed",
        reason: "selected preserved candidate can replace a pre-narrowed stem rejected by the tail head contract"
      };
    }
    return {
      status: "not_applicable",
      reason: "selected candidate is not mapped to a commit-capable stem candidate"
    };
  }
  if (candidate.stemCandidateIndex === undefined) {
    return {
      status: "not_applicable",
      reason: "selected candidate is not mapped to a commit-capable stem candidate"
    };
  }
  const kind = candidateKind(candidate);
  if (kind === "unknown") {
    return {
      status: "deferred",
      reason: "selected candidate kind is unknown, so stem commit is not safe"
    };
  }
  if (selectedChoice === undefined) {
    return {
      status: "deferred",
      reason: "selected candidate has no realization choice accepted by tail head contract"
    };
  }
  if (kind === "adverb") {
    if (selectedChoiceIsAdverbialNominalFallback(selectedChoice)) {
      return {
        status: "committed",
        reason: "selected adverbial Korean candidate is licensed as nominal head fallback",
        stemCandidateIndex: candidate.stemCandidateIndex
      };
    }
    if (
      selectedChoice.category === "adverbial" &&
      selectedChoice.projectionKind === "direct_adverbial" &&
      contract.commitPolicy?.adverbial === "explicit_evidence_required"
    ) {
      return {
        status: "committed",
        reason: "explicit adverbial tail evidence maps selected adverbial candidate to adverb stem render path",
        stemCandidateIndex: candidate.stemCandidateIndex
      };
    }
    if (selectedChoice.category === "adverbial" && selectedChoice.projectionKind === "direct_adverbial") {
      return {
        status: "deferred",
        reason: "tail evidence is not explicit adverbial"
      };
    }
    return {
      status: "deferred",
      reason: "candidate cannot map to a renderable adverbial or nominal fallback path"
    };
  }
  return {
    status: "committed",
    reason: "selected candidate maps to a predicate-root commit-capable stem kind",
    stemCandidateIndex: candidate.stemCandidateIndex
  };
}

function candidateKindCanMaterializeChoice(
  candidate: CandidateWorkState,
  kind: "verb" | "adj" | "noun",
  selectedChoice: HeadRealization
): boolean {
  if (selectedChoice.category === "verbal_predicate") {
    return kind === "verb" ||
      selectedChoice.projectionKind === "sahen_verbalized_nominal";
  }
  if (selectedChoice.category === "adjectival_predicate") {
    return kind === "adj" ||
      (
        selectedChoice.projectionKind === "projected_nominal_adjectival" &&
        isKoreanNounAble(candidate.stemCandidate?.koreanPos ?? candidate.hypothesis.koreanPos, candidate.stemCandidate?.nominalized)
      );
  }
  if (selectedChoice.category === "nominal") {
    return kind === "noun" ||
      isKoreanNounAble(
        candidate.stemCandidate?.koreanPos ?? candidate.hypothesis.koreanPos,
        candidate.stemCandidate?.nominalized
      );
  }
  return false;
}

function concreteStemMatchesSelectedCandidate(
  stem: Exclude<StemNode, { readonly kind: "candidateSet" }>,
  candidate: CandidateWorkState,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice
): boolean {
  const preserved = candidate.preserved;
  const lemma = preserved?.lemma ?? candidate.hypothesis.lemma;
  if (stem.lemma !== lemma) {
    return false;
  }
  if (stem.kind === "verb") {
    return selectedChoice.category === "verbal_predicate" && candidateKind(candidate) === "verb";
  }
  if (stem.kind === "adj") {
    return selectedChoice.category === "adjectival_predicate" && candidateKind(candidate) === "adj";
  }
  if (stem.kind === "noun") {
    return (
      (selectedChoice.category === "nominal" && candidateKind(candidate) === "noun") ||
      (candidateKind(candidate) === "adverb" && selectedChoiceIsAdverbialNominalFallback(selectedChoice))
    );
  }
  return selectedChoice.category === "adverbial" &&
    candidateKind(candidate) === "adverb" &&
    selectedChoice.projectionKind === "direct_adverbial";
}

function preNarrowedStemIsProjectionOfCandidate(
  stem: Exclude<StemNode, { readonly kind: "candidateSet" }>,
  candidate: CandidateWorkState
): boolean {
  const preserved = candidate.preserved;
  if (preserved === undefined) {
    return false;
  }
  if (stem.kind === "noun") {
    if (preserved.koreanPos === 명사 && stem.lemma === preserved.lemma) {
      return true;
    }
    return isKoreanNounAble(preserved.koreanPos, preserved.nominalized) &&
      stem.lemma === koreanNounLemma(preserved.lemma, preserved.koreanPos, preserved.nominalized);
  }
  if (stem.kind === "adj") {
    return preserved.koreanPos === 형용사 && stem.lemma === preserved.lemma;
  }
  if (stem.kind === "verb") {
    return preserved.koreanPos === 동사 && stem.lemma === preserved.lemma;
  }
  return preserved.koreanPos === 부사 && stem.lemma === preserved.lemma;
}

function preNarrowedCandidateCanPromoteToSelectedChoice(
  candidate: CandidateWorkState,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice | undefined
): boolean {
  if (selectedChoice === undefined || candidate.preserved === undefined) {
    return false;
  }
  const kind = candidateKind(candidate);
  if (selectedChoice.category === "adjectival_predicate") {
    return kind === "adj";
  }
  if (selectedChoice.category === "verbal_predicate") {
    return kind === "verb";
  }
  if (selectedChoiceIsAdverbialNominalFallback(selectedChoice)) {
    return kind === "adverb";
  }
  if (selectedChoice.category === "nominal") {
    return kind === "noun";
  }
  if (selectedChoice.category === "adverbial" && selectedChoice.projectionKind === "direct_adverbial") {
    return kind === "adverb";
  }
  return false;
}

function preNarrowedStemRejectedByContract(
  stem: Exclude<StemNode, { readonly kind: "candidateSet" }>,
  contract: CarrierHeadContract
): boolean {
  if (stem.kind === "noun") {
    return !contract.accepts.includes("direct_nominal") &&
      !contract.accepts.includes("adverbial_nominal_fallback");
  }
  if (stem.kind === "adj") {
    return !contract.accepts.includes("direct_adjectival") &&
      !contract.accepts.includes("adverbialized_adjectival");
  }
  if (stem.kind === "verb") {
    return !contract.accepts.includes("direct_verbal") &&
      !contract.accepts.includes("adverbialized_verbal");
  }
  return !contract.accepts.includes("direct_adverbial");
}

function preNarrowedCandidateCanPromoteByContextRule(
  candidate: CandidateWorkState,
  selectedChoice: HeadTailEvidenceSelectedRealizationChoice | undefined,
  contract: CarrierHeadContract,
  contextRule: string
): boolean {
  if (selectedChoice === undefined || candidate.preserved === undefined) {
    return false;
  }
  const kind = candidateKind(candidate);
  if (contract.relation === "quote_body") {
    if (contextRule !== "context_prefer_quote_body_projection") {
      return false;
    }
    if (selectedChoice.category === "adjectival_predicate") {
      return kind === "adj";
    }
    if (selectedChoice.category === "verbal_predicate") {
      return kind === "verb";
    }
    if (selectedChoiceIsAdverbialNominalFallback(selectedChoice)) {
      return kind === "adverb";
    }
    if (selectedChoice.category === "nominal") {
      return kind === "noun";
    }
    return false;
  }
  if (
    selectedChoice.category === "adverbial" &&
    contract.commitPolicy?.adverbial === "explicit_evidence_required" &&
    selectedChoice.projectionKind === "direct_adverbial"
  ) {
    return kind === "adverb";
  }
  if (
    selectedChoice.category === "nominal" &&
    selectedChoice.projectionKind === "direct_nominal"
  ) {
    return kind === "noun";
  }
  if (selectedChoiceIsAdverbialNominalFallback(selectedChoice)) {
    return kind === "adverb";
  }
  return false;
}

function selectedChoiceIsAdverbialNominalFallback(
  selectedChoice: HeadRealization | undefined
): boolean {
  return selectedChoice?.category === "nominal" &&
    selectedChoice.projectionKind === "adverbial_nominal_fallback";
}
function stemCandidateMatches(left: StemCandidate, right: StemCandidate): boolean {
  return stemCandidateIdentitiesEqual(stemCandidateIdentity(left), stemCandidateIdentity(right));
}

function stemCandidateMatchesHypothesis(candidate: StemCandidate, hypothesis: HeadHypothesisCandidate): boolean {
  return stemCandidateIdentityMatchesHypothesis(candidate, hypothesis);
}

function headHypothesisProjectionOrdinal(hypothesis: HeadHypothesisCandidate): number {
  return hypothesis.projectionOrdinal;
}

function stemCandidateIdentityMatchesHypothesis(candidate: StemCandidate, hypothesis: HeadHypothesisCandidate): boolean {
  return stemCandidateIdentitiesEqual(
    stemCandidateIdentity(candidate),
    {
      provenance: hypothesis.provenance,
      projectionOrdinal: hypothesis.projectionOrdinal
    }
  );
}
