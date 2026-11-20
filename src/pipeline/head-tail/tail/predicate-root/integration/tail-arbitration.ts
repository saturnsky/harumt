import type { AuxOpNode } from "../grammar.js";
import { firstAuxLayer } from "../inspect.js";
import { resolveTailEvidenceDecision } from "../tail-evidence-decision.js";
import type { IntegrationInput, ParsedTailChunk, TailChunkCandidateCollection, TailInterpretationCandidateObservation } from "./contracts.js";

export interface TailInterpretationWorkCandidate {
  readonly chunk: ParsedTailChunk;
  readonly observation: Omit<
    TailInterpretationCandidateObservation,
    "selected" | "rejectionReason" | "arbitrationRule" | "arbitrationReason"
  >;
}

export interface TailInterpretationArbitrationResult {
  readonly selectedIndex: number;
  readonly rule: string;
  readonly reason: string;
}

export function withTailInterpretationEnvelope(
  input: IntegrationInput,
  start: number,
  collection: TailChunkCandidateCollection
): TailChunkCandidateCollection {
  if (collection.candidates.length === 0) {
    return collection;
  }
  const workCandidates = collection.candidates.map((chunk, index) =>
    buildTailInterpretationWorkCandidate(input, start, chunk, index)
  );
  const arbitration = arbitrateTailInterpretations(workCandidates);
  const selectedWorkIndex = arbitration.selectedIndex;
  const interpretations = workCandidates.map((candidate, index): TailInterpretationCandidateObservation => {
    const selected = index === selectedWorkIndex;
    const rejectionReason = tailInterpretationRejectionReason(candidate, arbitration, selected);
    return {
      ...candidate.observation,
      arbitrationRule: selected
        ? arbitration.rule
        : tailInterpretationNonSelectedRule(candidate, arbitration),
      arbitrationReason: selected
        ? arbitration.reason
        : rejectionReason,
      selected,
      ...(selected ? {} : { rejectionReason })
    };
  });
  const fallbackObservation = collection.observation ?? {
    start,
    requestedMaxEndExclusive: start,
    scanEnd: start - 1,
    candidateCount: collection.candidates.length,
    lastReason: collection.lastReason,
    attempts: []
  };
  if (selectedWorkIndex < 0) {
    return {
      candidates: [],
      lastReason: collection.lastReason,
      observation: {
        ...fallbackObservation,
        candidateCount: collection.candidates.length,
        interpretations
      }
    };
  }
  const orderedWorkCandidates = [
    workCandidates[selectedWorkIndex]!,
    ...workCandidates.filter((candidate, index) =>
      index !== selectedWorkIndex && candidate.observation.eligible
    )
  ];
  return {
    candidates: orderedWorkCandidates.map(candidate => candidate.chunk),
    lastReason: collection.lastReason,
    observation: {
      ...fallbackObservation,
      candidateCount: collection.candidates.length,
      interpretations
    }
  };
}

export function arbitrateTailInterpretations(
  candidates: readonly TailInterpretationWorkCandidate[]
): TailInterpretationArbitrationResult {
  const eligible = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.observation.eligible);
  if (eligible.length === 0) {
    return {
      selectedIndex: -1,
      rule: "contract_all_candidates_ineligible",
      reason: "no materialized tail interpretation survived shared head evaluation"
    };
  }
  if (candidates.length === 1) {
    return {
      selectedIndex: 0,
      rule: "singleton",
      reason: "single materialized tail interpretation candidate"
    };
  }
  const sorted = [...eligible].sort(compareTailInterpretationWorkCandidates);
  const selected = sorted[0]!;
  const rule = tailInterpretationSelectionRule(sorted, candidates);
  return {
    selectedIndex: selected.index,
    rule,
    reason: tailInterpretationSelectionReason(rule)
  };
}

function compareTailInterpretationWorkCandidates(
  left: { readonly candidate: TailInterpretationWorkCandidate; readonly index: number },
  right: { readonly candidate: TailInterpretationWorkCandidate; readonly index: number }
): number {
  return compareDesc(left.candidate.observation.specificity, right.candidate.observation.specificity) ||
    compareAsc(
      spanCompletenessRank(left.candidate.observation.spanCompleteness),
      spanCompletenessRank(right.candidate.observation.spanCompleteness)
    ) ||
    compareAsc(left.candidate.observation.ownerPrecedence, right.candidate.observation.ownerPrecedence) ||
    compareAsc(
      structuralEvidenceRank(left.candidate.observation.structuralEvidence),
      structuralEvidenceRank(right.candidate.observation.structuralEvidence)
    ) ||
    compareAsc(left.candidate.observation.declarationOrder, right.candidate.observation.declarationOrder) ||
    compareAsc(left.index, right.index);
}

function tailInterpretationSelectionRule(
  sorted: readonly { readonly candidate: TailInterpretationWorkCandidate; readonly index: number }[],
  all: readonly TailInterpretationWorkCandidate[]
): string {
  if (all.some(candidate => !candidate.observation.eligible)) {
    return "contract_eligibility";
  }
  const selected = sorted[0]!.candidate.observation;
  if (all.some(candidate => candidate.observation.specificity !== selected.specificity)) {
    return "span_specificity";
  }
  if (all.some(candidate => candidate.observation.spanCompleteness !== selected.spanCompleteness)) {
    return "span_completeness";
  }
  if (all.some(candidate => candidate.observation.ownerPrecedence !== selected.ownerPrecedence)) {
    return "owner_precedence";
  }
  if (all.some(candidate => candidate.observation.structuralEvidence !== selected.structuralEvidence)) {
    return "hard_structural_evidence";
  }
  return "deterministic_declaration_order";
}

function tailInterpretationSelectionReason(rule: string): string {
  switch (rule) {
    case "contract_eligibility":
      return "selected first tail interpretation with a surviving shared-head evaluation";
    case "span_specificity":
      return "selected the tail interpretation with the most specific consumed span";
    case "span_completeness":
      return "selected complete tail interpretation over partial handoff";
    case "owner_precedence":
      return "selected higher-precedence predicate-root owner for the same span";
    case "hard_structural_evidence":
      return "selected tail interpretation with stronger structural evidence";
    case "singleton":
      return "single materialized tail interpretation candidate";
    default:
      return "selected by deterministic declaration order";
  }
}

function tailInterpretationRejectionReason(
  candidate: TailInterpretationWorkCandidate,
  arbitration: TailInterpretationArbitrationResult,
  selected: boolean
): string {
  if (selected) {
    return arbitration.reason;
  }
  if (!candidate.observation.eligible) {
    return "shared head evaluator found no surviving candidate";
  }
  return `lower priority than selected tail interpretation by ${arbitration.rule}`;
}

function tailInterpretationNonSelectedRule(
  candidate: TailInterpretationWorkCandidate,
  arbitration: TailInterpretationArbitrationResult
): string {
  if (!candidate.observation.eligible) {
    return "contract_eligibility";
  }
  return arbitration.rule;
}

function compareAsc(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareDesc(left: number, right: number): number {
  return left > right ? -1 : left < right ? 1 : 0;
}

function spanCompletenessRank(value: TailInterpretationCandidateObservation["spanCompleteness"]): number {
  return value === "complete" ? 0 : 1;
}

function structuralEvidenceRank(value: TailInterpretationCandidateObservation["structuralEvidence"]): number {
  switch (value) {
    case "postverb_auxiliary":
      return 0;
    case "tail_root_parse":
      return 1;
    case "partial_prefix":
      return 2;
  }
}

export function attachSingletonTailInterpretationObservation(
  input: IntegrationInput,
  start: number,
  chunk: ParsedTailChunk,
  lastReason: string
): ParsedTailChunk {
  const collection = withTailInterpretationEnvelope(input, start, {
    candidates: [chunk],
    lastReason,
    observation: {
      start,
      requestedMaxEndExclusive: start + chunk.consumed,
      scanEnd: start + chunk.consumed - 1,
      candidateCount: 1,
      lastReason,
      attempts: [{
        end: start + chunk.consumed - 1,
        status: "candidate",
        boundaryKind: chunk.outgoingBoundary.kind,
        boundaryConnective: chunk.outgoingBoundary.kind === "terminal" ? null : chunk.outgoingBoundary.connectiveKind,
        consumed: chunk.consumed
      }]
    }
  });
  const observed = collection.candidates[0] ?? chunk;
  return {
    ...observed,
    ...(collection.observation === undefined ? {} : { candidateObservation: collection.observation })
  };
}

function buildTailInterpretationWorkCandidate(
  input: IntegrationInput,
  start: number,
  chunk: ParsedTailChunk,
  declarationOrder: number
): TailInterpretationWorkCandidate {
  const layer = firstAuxLayer(chunk.root.tail);
  const postverb = layer?.ops.find((op) => op.kind === "postverbAuxiliary");
  const headHypothesis = chunk.root.headHypothesis ??
    (layer?.stem.kind === "candidateSet" ? layer.stem.headHypothesis : undefined);
  const source = chunk.partial !== undefined
    ? "partial_candidate" as const
    : isPostverbCompetitionOp(postverb)
      ? "postverb_competition" as const
      : "predicate_root_parser" as const;
  const evidenceKind = postverb?.kind === "postverbAuxiliary"
    ? postverb.auxiliary.kind
    : chunk.outgoingBoundary.kind === "terminal"
      ? "terminal"
      : chunk.outgoingBoundary.connectiveKind ?? chunk.outgoingBoundary.kind;
  const headEvidenceDecision = layer === null
    ? chunk.root.headEvidenceDecision
    : chunk.root.headEvidenceDecision ?? resolveTailEvidenceDecision({
      stem: layer.stem,
      ops: layer.ops,
      outgoingBoundary: chunk.outgoingBoundary,
      terminal: layer.terminal,
      ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
      ...(headHypothesis === undefined ? {} : { headHypothesis }),
      tokens: input.tokens,
      predicateTokenIdx: chunk.predicateTokenIdx
    }) ?? undefined;
  const ownerKey = tailInterpretationOwnerKey(source, evidenceKind);
  return {
    chunk,
    observation: {
      ownerKey,
      source,
      evidenceKind,
      span: { start, endExclusive: start + chunk.consumed },
      specificity: chunk.consumed,
      spanCompleteness: chunk.partial === undefined ? "complete" : "partial",
      structuralEvidence: tailInterpretationStructuralEvidence(source),
      ownerPrecedence: tailInterpretationOwnerPrecedence(ownerKey, source),
      declarationOrder,
      eligible: headEvidenceDecision === undefined || headEvidenceDecision.candidateOpenSet.length > 0,
      ...(headEvidenceDecision === undefined ? {} : { headEvidenceDecision })
    }
  };
}

function tailInterpretationStructuralEvidence(
  source: TailInterpretationCandidateObservation["source"]
): TailInterpretationCandidateObservation["structuralEvidence"] {
  switch (source) {
    case "postverb_competition":
      return "postverb_auxiliary";
    case "partial_candidate":
      return "partial_prefix";
    case "predicate_root_parser":
      return "tail_root_parse";
  }
}

function tailInterpretationOwnerPrecedence(
  ownerKey: string,
  source: TailInterpretationCandidateObservation["source"]
): number {
  switch (source) {
    case "postverb_competition":
      return 10;
    case "predicate_root_parser":
      return 30;
    case "partial_candidate":
      return 70;
  }
  return ownerKey.length;
}

function isPostverbCompetitionOp(op: AuxOpNode | undefined): boolean {
  if (op?.kind !== "postverbAuxiliary") {
    return false;
  }
  switch (op.auxiliary.kind) {
    case "adverbial_change":
    case "adverbial_change_potential":
    case "adverbial_control":
    case "state_change":
    case "state_change_potential":
    case "appearance_state_change":
    case "appearance_state_change_potential":
    case "appearance_behavior":
    case "scope_control":
      return true;
    default:
      return false;
  }
}

function tailInterpretationOwnerKey(
  source: TailInterpretationCandidateObservation["source"],
  evidenceKind: string
): string {
  switch (source) {
    case "postverb_competition":
      return `postverb:${evidenceKind}`;
    case "partial_candidate":
      return `partial:${evidenceKind}`;
    case "predicate_root_parser":
      return `predicate_root:${evidenceKind}`;
  }
}
