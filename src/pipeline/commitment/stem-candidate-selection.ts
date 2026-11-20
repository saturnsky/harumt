import { derivationForSense, derivationOrder } from "../../dictionary/derivation.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { Warning } from "../../types/warning.js";
import { hasClauseRole, isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { POS0, 形状詞, 동사, 명사, 형용사, posToString } from "../../types/pos.js";
import { candidateBearingAuxLayer, firstAuxLayer, tailRootClosesWithAttributiveTerminal, tailRootExplicitAdnominalMarkerIndices, tailRootFirstLayerOpConsumesToken, opsDeclareNominalHostConstruction, stemSupportsProjectionCategory } from "../head-tail/tail/predicate-root/inspect.js";
import type { LookupTables } from "../lookup-tables.js";
import { PredicateArgumentView } from "../semantics/helpers.js";
import type { FrameSourceConditionMatch } from "../context.js";
import { candidateRealizationFromDecisionChoices, resolveTailEvidenceDecision } from "../head-tail/tail/predicate-root/tail-evidence-decision.js";
import { headEvidenceDecisionTraceValue } from "../head-tail/tail/predicate-root/trace.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity, translationCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import { opChainCanHostBareNounStem } from "../head-tail/tail/predicate-root/bare-noun-stem-hosting.js";
import { bareStemNominalUseHasSubstituteNounLexeme, bareStemNominalUseHostClass, bareStemNominalUseYieldsToVerbalPredicateHost, candidateProjectionSource, candidateProjectionKinds, isBareStemNominalUseSlot, mixedPosSlot } from "../candidate-runtime.js";
import { candidateObservabilityTraceValue, fallbackPriorityGroup, slotEvidenceObservabilityTraceValue } from "../candidate-observability.js";
import { tailRootCommitmentCandidates } from "../head-tail/tail/predicate-root/commitment-bridge.js";
import { candidateSetCandidates, candidateSetMembers, commitmentLaneCandidateSet, createSourceCandidateSet, dropCandidate, isResolvedCandidateSet, resolveSourceCandidateSet, transformCandidateSet, withStagedCandidateSourceCondition, type SourceCandidateSet, type StagedCandidate } from "../source-candidate-set.js";
import { senseRequiresSourceEvidence } from "../head-tail/tail/predicate-root/frame-evidence.js";
import { collectAuxTokens } from "../matchers.js";
import type { TokenCursor } from "../token-cursor.js";
import { TraceEvent, type TraceCollector, type TraceDetailValue } from "../trace.js";
import type { HeadTailEvidenceDecision } from "../head-tail/tail/predicate-root/grammar.js";
import type { CommitmentCandidate, CommitmentContentMap, CommitmentSpan, CommitmentToken } from "./types.js";
import { candidateFrameAlternativesMatch, candidatePriorityGroup, candidatePriorityInGroup, candidateSenseIndex, commitmentCandidateView, isFallbackCandidate, isFrameJsonMapForCommitment, runtimeTokens, stagedCommitmentCandidateSet, translationFrameDataAlternatives, withTraceClauseIdx } from "./span-evidence.js";
import { candidateHasFrameSourceConditions, candidateSkippedSlotHasRawEvidence, frameNeedsFinalClauseLayoutForCommitment, selectCandidateByFrameEvidence, selectCandidateByNominalFrameEvidence } from "./semantic-frame.js";
import { sourcePredicateOperatorEvidenceAt } from "../structural-relation/source-predicate-operator.js";
import type { StructuralRelationGraph, StructuralSourcePredicateOperatorKind } from "../structural-relation/types.js";
import { selectCandidatesByDeferredSlotContract, predicateRootOwnerRejectsBareNounStem, deferredSlotContract, predicatePlanWithCandidateSetCommitment, tailNodeWithCandidateSetCommitment, predicateNominalProjectionHosts, nominalRootWithPredicateHostRoot, realizeCommittedCandidate, deferredCandidateRealizationConstraint, syncSahenShortNegationAttachment } from "./candidate-projection.js";


function pruneConstructionIneligibleHostCandidates(span: CommitmentSpan): void {
  const set = span.sourceCandidates;
  if (set === null || set === undefined || set.members.length < 2) {
    return;
  }
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (
    layer === null ||
    layer.stem.kind !== "candidateSet" ||
    layer.stem.candidates.length !== set.members.length ||
    !opsDeclareNominalHostConstruction(layer.ops)
  ) {
    return;
  }
  const filtered = set.members.filter((member) => member.candidate.koreanPos === 명사);
  if (filtered.length === 0 || filtered.length === set.members.length) {
    return;
  }
  span.sourceCandidates = transformCandidateSet(set, {
    map: () => dropCandidate("construction_ineligible"),
    introduce: filtered,
    failClosedReason: "all_members_dropped"
  });
}

const POTENTIAL_KOTO_DEKIRU_OPERATOR_KINDS: ReadonlySet<StructuralSourcePredicateOperatorKind> = new Set([
  "potential_koto_ga_dekiru"
]);

const SAHEN_SOURCE_OPERATOR_KINDS: ReadonlySet<StructuralSourcePredicateOperatorKind> = new Set([
  "sahen_causative",
  "sahen_te_connective"
]);

type DeferredCandidateCommitStatus = "committed" | "not_applicable" | "fail_closed";
type HeadTailDecisionObservation = HeadTailEvidenceDecision | "fail_closed" | null;

type FinalFrameNarrowing =
  | { readonly kind: "no_fallback_member" }
  | {
    readonly kind: "narrowed";
    readonly workingCandidates: readonly CommitmentCandidate[];
    readonly evaluatedMembers: readonly StagedCandidate<CommitmentCandidate>[];
    readonly frameNarrowed: boolean;
    readonly producedWinner: CommitmentCandidate | undefined;
  };

export function narrowCandidatesByFinalFrameEvidence(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  entrySet: CommitmentSpan["sourceCandidates"] | null,
  openMembers: readonly StagedCandidate<CommitmentCandidate>[],
  openCandidates: readonly CommitmentCandidate[]
): FinalFrameNarrowing {
  const noArgumentKeijoujiAdjectiveIdx = selectNoArgumentKeijoujiAdjectiveCandidateIndex(
    span,
    openCandidates,
    tokens,
    idx,
    layout,
    lookups
  );
  const spanIsLayoutPredicate = layout.clauseOfPredicate(idx) !== undefined;
  const finalSourceCondition = (candidate: CommitmentCandidate, staged: FrameSourceConditionMatch): FrameSourceConditionMatch => {
    if (!candidateHasFrameSourceConditions(candidate)) {
      return "match";
    }
    const frameMatch = candidateFrameAlternativesMatch(candidate, span, tokens, idx, layout, contentMap, lookups, numeric);
    if (frameMatch === "match") {
      return "match";
    }
    if (
      frameMatch === "slot_evidence_skipped" &&
      candidateSkippedSlotHasRawEvidence(candidate, span, tokens, idx, layout, contentMap, lookups, numeric)
    ) {
      return "match";
    }
    if (staged === "match" && !spanIsLayoutPredicate && candidateSlotEvidenceNeedsProductionAnchor(candidate)) {
      return staged;
    }
    return "fail";
  };
  const evaluatedMembers = openMembers.map((member) =>
    withStagedCandidateSourceCondition(member, finalSourceCondition(member.candidate, member.sourceCondition))
  );
  const conditionOf = new Map<CommitmentCandidate, FrameSourceConditionMatch>(
    evaluatedMembers.map((member) => [member.candidate, member.sourceCondition])
  );
  const survivors: CommitmentCandidate[] = [];
  for (const [candidateIdx, candidate] of openCandidates.entries()) {
    if (conditionOf.get(candidate) === "match" || candidateIdx === noArgumentKeijoujiAdjectiveIdx) {
      survivors.push(candidate);
    }
  }
  const explicitFallbackCandidates = openCandidates.filter(isFallbackCandidate);
  const frameNarrowed = survivors.length < openCandidates.length;
  const producedWinner = isResolvedCandidateSet<CommitmentCandidate>(entrySet)
    ? entrySet.winner.candidate
    : undefined;
  if (survivors.length === 0 && explicitFallbackCandidates.length === 0 && openCandidates.length > 0) {
    return { kind: "no_fallback_member" };
  }
  const workingCandidates: readonly CommitmentCandidate[] = survivors.length > 0
      ? survivors
      : firstCandidatePriorityGroup(explicitFallbackCandidates);
  return { kind: "narrowed", workingCandidates, evaluatedMembers, frameNarrowed, producedWinner };
}

export function commitTranslationCandidates(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null = null,
  lookups: LookupTables,
  numeric: NumericTables,
  baseCursor: TokenCursor<CommitmentToken>,
  sourcePredicateOperatorGraph: StructuralRelationGraph | null,
  preobservedHeadTailDecision?: HeadTailEvidenceDecision
): DeferredCandidateCommitStatus {
  pruneConstructionIneligibleHostCandidates(span);
  const initialMembers = candidateSetMembers(span.sourceCandidates);
  const initialCandidates = initialMembers.map((member) => member.candidate);
  const observation = preobservedHeadTailDecision ?? observeHeadTailDecision(span, tokens, idx, layout);
  if (observation === "fail_closed") {
    return "fail_closed";
  }
  const headTailDecision = observation;
  const entrySet = span.sourceCandidates ?? null;
  const openMembers = candidateSetMembers(entrySet);
  const openCandidates = openMembers.map((member) => member.candidate);
  const memberByCandidate = new Map<CommitmentCandidate, StagedCandidate<CommitmentCandidate>>();
  const membersOf = (candidates: readonly CommitmentCandidate[]): readonly StagedCandidate<CommitmentCandidate>[] =>
    candidates.flatMap((candidate) => {
      const member = memberByCandidate.get(candidate);
      return member === undefined ? [] : [member];
    });
  if (headTailDecision !== null && headTailDecision.candidateOpenSet.length === 0 && openCandidates.length === 0) {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_open_set_empty",
      initialCandidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
      "head-tail decision admitted no candidate; deferred dropped the candidateSet span without materializing a fallback"
    );
  }
  const narrowing = narrowCandidatesByFinalFrameEvidence(
    span,
    tokens,
    idx,
    layout,
    contentMap,
    lookups,
    numeric,
    entrySet,
    openMembers,
    openCandidates
  );
  if (narrowing.kind === "no_fallback_member") {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_no_fallback_member",
      openCandidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
      "candidate set narrowed to all-fail members without a fallback member; deferred fail-closed instead of reviving the leading candidate"
    );
  }
  const { evaluatedMembers, frameNarrowed, producedWinner } = narrowing;
  for (const member of evaluatedMembers) {
    memberByCandidate.set(member.candidate, member);
  }
  let workingCandidates: readonly CommitmentCandidate[] = narrowing.workingCandidates;
  const slotCursor = baseCursor.fork(idx);
  const auxCursor = slotCursor.retarget(runtimeTokens(tokens), idx + 1, tokens.length, idx + 1);
  const auxTokens = collectAuxTokens(auxCursor);
  const observedSlot = mixedPosSlot(slotCursor, auxTokens, { lookups, clauseReach: layout });
  const slot = bareStemNominalUseSlotYieldsToContestedClaimVerdict(observedSlot, span) ||
    nominalArgumentSlotYieldsToAttributiveOwner(observedSlot, span) ||
    nominalArgumentSlotYieldsToPredicateRootOwner(observedSlot, span.renderPlan) ||
    bareStemNominalUseSlotYieldsToPredicateRootOwner(observedSlot, span.renderPlan) ||
    stemCoordinationSlotYieldsToMarkerConsumingPredicateRoot(observedSlot, idx, span.renderPlan) ||
    bareStemNominalUseSlotYieldsToVerbalPredicateHost(observedSlot, workingCandidates)
    ? undefined
    : observedSlot;
  const slotHostClass = bareStemNominalUseHostClass(slotCursor.current(), slot);
  const slotContract = deferredSlotContract(slot, slotHostClass);
  const headTailPreferenceApplied = headTailDecision?.rules.some((rule) =>
    rule.classification === "preference" &&
    rule.result === "preferred" &&
    rule.effect === "reorder"
  ) === true;
  const candidatesBeforeSlotPruning = workingCandidates;
  const slotPrunedCandidates = selectCandidatesByDeferredSlotContract(
    candidatesBeforeSlotPruning,
    slot,
    {
      preserveExistingOrder: headTailPreferenceApplied,
      hostClass: slotHostClass
    }
  );
  const slotChanged = slotPrunedCandidates.length !== candidatesBeforeSlotPruning.length ||
    slotPrunedCandidates.some((candidate, candidateIdx) => candidate !== candidatesBeforeSlotPruning[candidateIdx]);
  const survivingCandidates = new Set(slotPrunedCandidates);
  const slotDroppedCandidates = trace === null ? [] : candidatesBeforeSlotPruning.filter((_, candidateIdx) => {
    const candidate = candidatesBeforeSlotPruning[candidateIdx];
    return candidate === undefined || !survivingCandidates.has(candidate);
  });
  const slotReordered =
    slotDroppedCandidates.length === 0 &&
    slotPrunedCandidates.some((candidate, candidateIdx) => candidate !== candidatesBeforeSlotPruning[candidateIdx]);
  workingCandidates = slotPrunedCandidates;
  if (
    slot === undefined &&
    hasCandidatePriorityMetadata(workingCandidates) &&
    (headTailDecision === null || headTailOrderStartsInDictionaryFirstGroup(workingCandidates))
  ) {
    workingCandidates = firstCandidatePriorityGroup(workingCandidates);
  }
  const committedCandidates = workingCandidates;

  const potentialKotoSelectedIdx = selectCandidateByPotentialKotoGaDekiruEvidence(
    committedCandidates,
    sourcePredicateOperatorGraph,
    idx
  );
  const sahenSourceOperatorSelectedIdx = potentialKotoSelectedIdx ??
    selectCandidateBySahenSourceOperatorEvidence(committedCandidates, sourcePredicateOperatorGraph, idx);
  const nominalFrameSelectedIdx = sahenSourceOperatorSelectedIdx ?? selectCandidateByNominalFrameEvidence(committedCandidates, tokens, idx, layout, contentMap, trace, lookups);
  const frameSelectedIdx = nominalFrameSelectedIdx ?? selectCandidateByFrameEvidence(committedCandidates, span, tokens, idx, layout, contentMap, trace, lookups, numeric);
  const derivationSelectedIdx = frameSelectedIdx === null || frameSelectedIdx === undefined
    ? selectCandidateByDerivationOrder(committedCandidates)
    : null;
  const producedWinnerIdx = producedWinner === undefined
    ? -1
    : committedCandidates.indexOf(producedWinner);
  const selectedIdx = frameSelectedIdx ?? derivationSelectedIdx ?? (slotChanged || producedWinnerIdx < 0 ? 0 : producedWinnerIdx);
  const committedMembers = membersOf(committedCandidates);
  const winnerMember = membersOf([committedCandidates[selectedIdx] ?? committedCandidates[0]].filter(
    (candidate): candidate is CommitmentCandidate => candidate !== undefined
  ))[0];
  const narrowedSet: SourceCandidateSet<CommitmentCandidate> = entrySet === null
    ? createSourceCandidateSet<CommitmentCandidate>(committedMembers, { sharedConsumed: span.consumed })
    : transformCandidateSet(entrySet, {
      map: () => dropCandidate("frame_source_condition"),
      introduce: committedMembers,
      failClosedReason: "all_members_dropped"
    });
  const committedSet = winnerMember === undefined
    ? narrowedSet
    : resolveSourceCandidateSet(narrowedSet, {
      kind: "final_commitment",
      layout,
      predicateTokenIdx: idx,
      verdict: winnerMember.identity
    });
  span.sourceCandidates = committedSet;
  if (isResolvedCandidateSet(committedSet)) {
    realizeCommittedCandidate(span, committedSet, {
      deriveRealization: true,
      ...(slotContract === null ? {} : { realizationConstraint: slotContract })
    });
  }
  syncSahenShortNegationAttachment(tokens, idx, span, lookups);

  const committedWinner = isResolvedCandidateSet(committedSet) ? committedSet.winner.candidate : undefined;
  if (
    headTailDecision !== null &&
    headTailDecision.candidateOpenSet.length > 1 &&
    potentialKotoSelectedIdx === null &&
    sahenSourceOperatorSelectedIdx === null &&
    nominalFrameSelectedIdx === null &&
    frameSelectedIdx === null &&
    derivationSelectedIdx === null &&
    !frameNarrowed &&
    !slotChanged &&
    commitmentCandidateNeedsDefaultWarning(openCandidates, committedWinner)
  ) {
    const winner = committedWinner;
    span.warnings = [
      ...(span.warnings ?? []),
      {
        type: "ambiguity_default",
        severity: "info",
        opKind: "stem_polysemy",
        candidates: openCandidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
        winner: winner?.koreanLemma ?? winner?.korean ?? "",
        message: "deferred commitment found no sentence-level sense evidence and explicitly selected candidateOpenSet[0]."
      }
    ];
  }

  if (trace !== null) {
    const initialFallbackGroup = commitmentCandidateFallbackGroup(initialCandidates);
    const finalCandidates = candidateSetCandidates(committedSet);
    const droppedCandidates = initialCandidates.filter((candidate) => !finalCandidates.includes(candidate));
    const fallbackCompatibleCandidateCount = initialFallbackGroup === null
      ? 0
      : finalCandidates.filter((candidate) => candidatePriorityGroup(candidate) === initialFallbackGroup).length;
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "candidate_commitment",
      true,
      withTraceClauseIdx({
        selected: finalCandidates[0]?.koreanLemma ?? "",
        initial_candidate_count: initialCandidates.length,
        survivor_count: finalCandidates.length,
        survivors: finalCandidates.map((candidate) => candidate.koreanLemma ?? ""),
        dropped: droppedCandidates.map((candidate) => candidate.koreanLemma ?? ""),
        candidates: finalCandidates.map((candidate) =>
          commitmentCandidateTraceValue(candidate, initialFallbackGroup)
        ),
        initial_candidates: initialCandidates.map((candidate) =>
          commitmentCandidateTraceValue(candidate, initialFallbackGroup)
        ),
        dropped_candidates: droppedCandidates.map((candidate) =>
          commitmentCandidateTraceValue(candidate, initialFallbackGroup)
        ),
        fallback_compatible_candidate_count: fallbackCompatibleCandidateCount,
        projection_invariant_violation: initialFallbackGroup !== null && fallbackCompatibleCandidateCount === 0,
        pre_render_fallback_warning_count: preRenderFallbackWarningCount(span, initialCandidates),
        ...(headTailDecision === null
          ? {}
          : {
            head_tail_evidence_selection: false,
            deferred_head_evidence_decision: headEvidenceDecisionTraceValue(headTailDecision),
            committed_sense_consumed: true
          }),
        slot_pruning: slotEvidenceObservabilityTraceValue({
          owner: "deferred_commitment",
          evidence: "mixed_pos_slot",
          slot: slot ?? null,
          classification: "preference",
          effect: slotDroppedCandidates.length === 0 ? (slotReordered ? "reorder" : "observe") : "prune",
          final: true,
          fallbackLoweredToReorder: slotReordered,
          droppedCount: slotDroppedCandidates.length,
          droppedCandidates: slotDroppedCandidates.map((candidate) => candidate.koreanLemma ?? "")
        })
      }, layout.clauseIndexOfToken(idx))
    ));
  }
  return "committed";
}

function failClosedCandidateSetSpan(
  span: CommitmentSpan,
  opKind: string,
  candidates: readonly string[],
  message: string
): "fail_closed" {
  span.sourceCandidates = createSourceCandidateSet<CommitmentCandidate>([], { sharedConsumed: span.consumed });
  span.renderPlan = null;
  span.korean = "";
  const warning: Warning = {
    type: "assembly_invariant",
    severity: "error",
    opKind,
    candidates,
    winner: "",
    message
  };
  span.warnings = [...(span.warnings ?? []), warning];
  return "fail_closed";
}

function commitmentCandidateNeedsDefaultWarning(
  candidates: readonly CommitmentCandidate[],
  winner: CommitmentCandidate | undefined
): boolean {
  if (winner === undefined || commitmentCandidateHasCommitEvidence(winner)) {
    return false;
  }
  const contextFreeCount = candidates.filter((candidate) =>
    !commitmentCandidateHasCommitEvidence(candidate)
  ).length;
  return contextFreeCount > 1;
}

function commitmentCandidateHasCommitEvidence(candidate: CommitmentCandidate): boolean {
  const translation = candidate.translation ?? candidate.entry?.senses?.[0];
  if (translation === undefined) {
    return false;
  }
  return senseRequiresSourceEvidence(translation);
}

function nominalArgumentSlotYieldsToAttributiveOwner(
  slot: string | undefined,
  span: CommitmentSpan
): boolean {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  if (slot === "noun_only_compound") {
    return tailRootClosesWithAttributiveTerminal(plan.realization.root);
  }
  return slot === "noun_particle" &&
    tailRootExplicitAdnominalMarkerIndices(plan.realization.root).length > 0;
}

function nominalArgumentSlotYieldsToPredicateRootOwner(
  slot: string | undefined,
  plan: RenderPlan | null | undefined
): boolean {
  return slot === "noun_particle" && predicateRootOwnerRejectsBareNounStem(plan);
}

function bareStemNominalUseSlotYieldsToPredicateRootOwner(
  slot: string | undefined,
  plan: RenderPlan | null | undefined
): boolean {
  return isBareStemNominalUseSlot(slot) && predicateRootOwnerRejectsBareNounStem(plan);
}

function stemCoordinationSlotYieldsToMarkerConsumingPredicateRoot(
  slot: string | undefined,
  hostIdx: number,
  plan: RenderPlan | null | undefined
): boolean {
  if (slot !== "stem_coordination" || !isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const root = plan.realization.root;
  const layer = firstAuxLayer(root.tail);
  return layer !== null &&
    tailRootFirstLayerOpConsumesToken(root, hostIdx + 1) &&
    opChainCanHostBareNounStem(layer.ops);
}

function bareStemNominalUseSlotYieldsToContestedClaimVerdict(
  slot: string | undefined,
  span: CommitmentSpan
): boolean {
  return (isBareStemNominalUseSlot(slot) || slot === "quoted_nominal") &&
    span.contestedNominalUseOwner === "predicate_claim";
}

function bareStemNominalUseSlotYieldsToVerbalPredicateHost(
  slot: string | undefined,
  candidates: readonly CommitmentCandidate[]
): boolean {
  if (!isBareStemNominalUseSlot(slot)) {
    return false;
  }
  const views = candidates.map(commitmentCandidateView);
  if (!bareStemNominalUseYieldsToVerbalPredicateHost(views)) {
    return false;
  }
  return slot !== "stem_coordination" || bareStemNominalUseHasSubstituteNounLexeme(views);
}

function observeHeadTailDecision(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout
): HeadTailDecisionObservation {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (layer === null) {
    return null;
  }
  const candidateLayer = candidateBearingAuxLayer(layer);
  const headHypothesis = plan.realization.root.headHypothesis ??
    (candidateLayer.stem.kind === "candidateSet" ? candidateLayer.stem.headHypothesis : undefined);
  if (headHypothesis === undefined) {
    return null;
  }
  const decision = resolveTailEvidenceDecision({
    stem: candidateLayer.stem,
    ops: candidateLayer.ops,
    ...(hasClauseRole(plan) ? { outgoingBoundary: plan.clauseRole.outgoingBoundary } : {}),
    terminal: candidateLayer.terminal,
    ...(candidateLayer.terminalPayload === undefined ? {} : { terminalPayload: candidateLayer.terminalPayload }),
    headHypothesis,
    tokens: runtimeTokens(tokens),
    layout,
    predicateTokenIdx: hasClauseRole(plan) ? plan.clauseRole.predicateTokenIdx : idx
  });
  if (decision === null) {
    return null;
  }
  const currentSet = commitmentLaneCandidateSet(span.sourceCandidates);
  const currentCandidates = candidateSetMembers(currentSet);
  const orderedOpenCandidates = decision.candidateOpenSet.flatMap((identity) => {
    const matched = currentCandidates.find((member) =>
      stemCandidateIdentitiesEqual(member.identity, identity)
    );
    return matched === undefined ? [] : [matched];
  });
  const unrepresentedCoverageCandidates = currentCandidates.filter((member) => {
    const identity = member.identity;
    return !decision.candidates.some((item) =>
      stemCandidateIdentitiesEqual(identity, {
        provenance: item.provenance,
        projectionOrdinal: item.projectionOrdinal
      })
    );
  });
  if (unrepresentedCoverageCandidates.length > 0) {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_unrepresented_bridge_candidate",
      unrepresentedCoverageCandidates.map((member) => member.candidate.koreanLemma ?? member.candidate.korean ?? ""),
      "deferred candidate bridge contained an identity absent from the head-tail decision hypothesis"
    );
  }
  if (currentSet !== null) {
    span.sourceCandidates = transformCandidateSet(currentSet, {
      map: () => dropCandidate("head_tail_open_set"),
      introduce: decision.candidateOpenSet.length === 0 ? [] : orderedOpenCandidates,
      failClosedReason: "all_members_dropped"
    });
  }
  span.renderPlan = predicatePlanWithCandidateSetCommitment(plan, decision, undefined);
  return decision;
}

export function commitCandidateSetWithoutBridge(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  baseCursor: TokenCursor<CommitmentToken>,
  sourcePredicateOperatorGraph: StructuralRelationGraph | null
): DeferredCandidateCommitStatus {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return "not_applicable";
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (layer?.stem.kind !== "candidateSet" || layer.stem.candidates.length === 0) {
    return "not_applicable";
  }
  const candidateSet = layer.stem;
  const decision = observeHeadTailDecision(span, tokens, idx, layout);
  if (decision === "fail_closed") {
    return "fail_closed";
  }
  if (decision === null) {
    return "not_applicable";
  }
  if (decision.candidateOpenSet.length === 0) {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_bridge_open_set_empty",
      candidateSet.candidates.map((candidate) => candidate.lemma),
      "candidateSet reached deferred commitment without bridge candidates and its head contract admitted no fallback"
    );
  }
  const committedStemIdentity = decision.candidateOpenSet.find((identity) =>
    candidateSet.candidates.some((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), identity)
    )
  );
  if (committedStemIdentity === undefined) {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_bridge_open_set_mismatch",
      candidateSet.candidates.map((candidate) => candidate.lemma),
      "candidateSet bridge recovery found no stem identity in the final head-tail open set"
    );
  }
  const recoveryPool = tailRootCommitmentCandidates(
    plan.realization.root,
    span.entry,
    { includeIneligible: true }
  );
  const recoveredCandidates = decision.candidateOpenSet.flatMap((openIdentity) => {
    const candidate = recoveryPool.find((item) =>
      stemCandidateIdentitiesEqual(
        translationCandidateIdentity(commitmentCandidateView(item)),
        openIdentity
      )
    );
    return candidate === undefined ? [] : [candidate];
  });
  if (recoveredCandidates.length === 0) {
    return failClosedCandidateSetSpan(
      span,
      "candidate_set_bridge_recovery_empty",
      candidateSet.candidates.map((candidate) => candidate.lemma),
      "candidateSet bridge recovery had no candidate in the final head-tail open set"
    );
  }
  let committedSense = committedStemIdentity;
  let selectedRecoveryCandidate: CommitmentCandidate | undefined;
  {
    const recoverySpan: CommitmentSpan = {
      ...span,
      sourceCandidates: stagedCommitmentCandidateSet(recoveredCandidates, { sharedConsumed: span.consumed }),
      renderPlan: null,
      warnings: []
    };
    const committed = commitTranslationCandidates(
      recoverySpan,
      tokens,
      idx,
      layout,
      contentMap,
      null,
      lookups,
      numeric,
      baseCursor,
      sourcePredicateOperatorGraph,
      decision
    );
    if (committed !== "committed") {
      return failClosedCandidateSetSpan(
        span,
        "candidate_set_bridge_recovery_pruned",
        recoveredCandidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
        "candidateSet bridge recovery was emptied by deferred sentence evidence"
      );
    }
    const recoveredSet: SourceCandidateSet<CommitmentCandidate> | null = recoverySpan.sourceCandidates ?? null;
    const selected = isResolvedCandidateSet(recoveredSet) ? recoveredSet.winner.candidate : undefined;
    if (selected === undefined) {
      return failClosedCandidateSetSpan(
        span,
        "candidate_set_bridge_recovery_unselected",
        recoveredCandidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
        "candidateSet bridge recovery completed without a deferred winner"
      );
    }
    selectedRecoveryCandidate = selected;
    committedSense = translationCandidateIdentity(commitmentCandidateView(selected));
    span.sourceCandidates = recoveredSet;
    if (isResolvedCandidateSet(recoveredSet)) {
      realizeCommittedCandidate(span, recoveredSet);
    }
  }
  span.renderPlan = predicatePlanWithCandidateSetCommitment(
    plan,
    decision,
    committedSense,
    selectedRecoveryCandidate === undefined
      ? undefined
      : deferredCandidateRealizationConstraint(selectedRecoveryCandidate, undefined)
  );
  span.warnings = [
    ...(span.warnings ?? []),
    {
      type: "assembly_invariant",
      severity: "error",
      opKind: "candidate_set_bridge_empty",
      candidates: candidateSet.candidates.map((candidate) => candidate.lemma),
      winner: candidateSet.candidates.find((candidate) =>
        stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
      )?.lemma ?? "",
      message: "candidateSet reached deferred commitment without bridge candidates; recovery was restricted to the final head-tail open set."
    }
  ];
  return "committed";
}

export function commitNestedPredicateNominalHost(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  spanIdx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  baseCursor: TokenCursor<CommitmentToken>,
  sourcePredicateOperatorGraph: StructuralRelationGraph | null
): DeferredCandidateCommitStatus {
  const plan = span.renderPlan;
  if (!isNominalHeadTailChainRenderPlan(plan)) {
    return "not_applicable";
  }
  let root = plan.realization.root;
  let changed = false;
  for (const host of predicateNominalProjectionHosts(root)) {
    const parsedLayer = firstAuxLayer(host.root.tail);
    const layer = parsedLayer === null ? null : candidateBearingAuxLayer(parsedLayer);
    if (layer?.stem.kind !== "candidateSet") {
      continue;
    }
    const candidateSet = layer.stem;
    const headHypothesis = layer.stem.headHypothesis ?? host.root.headHypothesis;
    const decision = resolveTailEvidenceDecision({
      stem: layer.stem,
      ops: layer.ops,
      outgoingBoundary: host.outgoingBoundary,
      terminal: layer.terminal,
      ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
      ...(headHypothesis === undefined ? {} : { headHypothesis }),
      tokens: runtimeTokens(tokens),
      layout,
      predicateTokenIdx: host.predicateTokenIdx
    });
    if (decision === null) {
      continue;
    }
    if (decision.candidateOpenSet.length === 0) {
      return failClosedCandidateSetSpan(
        span,
        "nested_candidate_set_open_set_empty",
        candidateSet.candidates.map((candidate) => candidate.lemma),
        "nested predicate nominal host admitted no candidate; deferred dropped the host without materializing a fallback"
      );
    }
    const bridgeCandidates = tailRootCommitmentCandidates(host.root, span.entry, { includeIneligible: true });
    const candidates = decision.candidateOpenSet.flatMap((identity) => {
      const candidate = bridgeCandidates.find((item) =>
        stemCandidateIdentitiesEqual(
          translationCandidateIdentity(commitmentCandidateView(item)),
          identity
        )
      );
      return candidate === undefined ? [] : [candidate];
    });
    if (candidates.length === 0) {
      return failClosedCandidateSetSpan(
        span,
        "nested_candidate_set_bridge_empty",
        candidateSet.candidates.map((candidate) => candidate.lemma),
        "nested predicate nominal host had no bridge candidate in the final head-tail open set"
      );
    }
    const nestedSpan: CommitmentSpan = {
      ...span,
      start: host.contentSpan.start,
      consumed: host.contentSpan.end - host.contentSpan.start,
      sourceCandidates: stagedCommitmentCandidateSet(candidates, {
        sharedConsumed: host.contentSpan.end - host.contentSpan.start
      }),
      renderPlan: null,
      warnings: []
    };
    const committed = commitTranslationCandidates(
      nestedSpan,
      tokens,
      host.predicateTokenIdx,
      layout,
      contentMap,
      null,
      lookups,
      numeric,
      baseCursor,
      sourcePredicateOperatorGraph,
      decision
    );
    const nestedSet: SourceCandidateSet<CommitmentCandidate> | null = nestedSpan.sourceCandidates ?? null;
    const selected = isResolvedCandidateSet(nestedSet) ? nestedSet.winner.candidate : undefined;
    if (committed !== "committed" || selected === undefined) {
      return failClosedCandidateSetSpan(
        span,
        "nested_candidate_set_unselected",
        candidates.map((candidate) => candidate.koreanLemma ?? candidate.korean ?? ""),
        "nested predicate nominal host completed deferred commitment without a winner"
      );
    }
    const committedSense = translationCandidateIdentity(commitmentCandidateView(selected));
    const committedSenseRealization = candidateRealizationFromDecisionChoices(
      decision,
      committedSense,
      deferredCandidateRealizationConstraint(selected, undefined)
    );
    const committedRoot = {
      ...host.root,
      headEvidenceDecision: decision,
      tail: tailNodeWithCandidateSetCommitment(
        host.root.tail,
        committedSenseRealization,
        committedSense
      )
    };
    root = nominalRootWithPredicateHostRoot(root, host, committedRoot);
    span.warnings = [...(span.warnings ?? []), ...(nestedSpan.warnings ?? [])];
    changed = true;
  }
  if (changed) {
    span.renderPlan = {
      ...plan,
      realization: {
        ...plan.realization,
        root
      }
    };
  }
  return "committed";
}

function selectCandidateByPotentialKotoGaDekiruEvidence(
  candidates: readonly CommitmentCandidate[],
  sourcePredicateOperatorGraph: StructuralRelationGraph | null,
  idx: number
): number | null {
  if (!sourcePredicateOperatorEvidenceAt(sourcePredicateOperatorGraph, idx, POTENTIAL_KOTO_DEKIRU_OPERATOR_KINDS)) {
    return null;
  }
  const selectedIdx = candidates.findIndex(candidateHasVerbalSourcePredicateProjection);
  return selectedIdx >= 0 ? selectedIdx : null;
}

function selectCandidateBySahenSourceOperatorEvidence(
  candidates: readonly CommitmentCandidate[],
  sourcePredicateOperatorGraph: StructuralRelationGraph | null,
  idx: number
): number | null {
  if (!sourcePredicateOperatorEvidenceAt(sourcePredicateOperatorGraph, idx, SAHEN_SOURCE_OPERATOR_KINDS)) {
    return null;
  }
  const selectedIdx = candidates.findIndex(candidateHasVerbalSourcePredicateProjection);
  return selectedIdx >= 0 ? selectedIdx : null;
}

function candidateHasVerbalSourcePredicateProjection(candidate: CommitmentCandidate): boolean {
  if (candidate.koreanPos !== 동사) {
    return false;
  }
  const projections = candidateProjectionKinds(commitmentCandidateView(candidate));
  return projections.some((projection) =>
    projection === "direct_verbal" ||
    projection === "sahen_verbalized_nominal" ||
    projection === "adverbialized_verbal"
  );
}

function selectNoArgumentKeijoujiAdjectiveCandidateIndex(
  span: CommitmentSpan,
  candidates: readonly CommitmentCandidate[],
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): number | null {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan) || !hasClauseRole(plan) || plan.clauseRole.outgoingBoundary.kind !== "terminal") {
    return null;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (
    layer === null ||
    layer.terminal !== null ||
    layer.ops.length > 0 ||
    layer.stem.kind !== "candidateSet" ||
    !stemSupportsProjectionCategory(layer.stem, "adjectival_predicate")
  ) {
    return null;
  }
  const sourceToken = layer.stem.source.tokens[layer.stem.conjugationAnchor] ?? layer.stem.source.tokens[0];
  if (((sourceToken?.pos ?? 0) & POS0) !== 形状詞) {
    return null;
  }
  if (new PredicateArgumentView(runtimeTokens(tokens), idx, { lookups, layout }).arguments().length > 0) {
    return null;
  }
  const adjectiveIdx = candidates.findIndex((candidate) => candidate.koreanPos === 형용사);
  const verbIdx = candidates.findIndex((candidate) => candidate.koreanPos === 동사);
  return adjectiveIdx >= 0 && verbIdx >= 0 ? adjectiveIdx : null;
}

function hasCandidatePriorityMetadata(candidates: readonly CommitmentCandidate[]): boolean {
  return candidates.some((candidate) => {
    const translation = candidate.translation;
    return translation !== undefined &&
      translation.priorityGroup !== undefined && translation.priorityInGroup !== undefined;
  });
}

function firstCandidatePriorityGroup(candidates: readonly CommitmentCandidate[]): CommitmentCandidate[] {
  if (candidates.length === 0) {
    return [];
  }
  const firstGroup = Math.min(...candidates.map(candidatePriorityGroup));
  return candidates.filter((candidate) => candidatePriorityGroup(candidate) === firstGroup);
}

function headTailOrderStartsInDictionaryFirstGroup(candidates: readonly CommitmentCandidate[]): boolean {
  const first = candidates[0];
  if (first === undefined) {
    return true;
  }
  const firstGroup = Math.min(...candidates.map(candidatePriorityGroup));
  return candidatePriorityGroup(first) === firstGroup;
}

function selectCandidateByDerivationOrder(candidates: readonly CommitmentCandidate[] | undefined): number | null {
  if (candidates === undefined || candidates.length < 2) {
    return null;
  }
  const orders = candidates.map(candidateDerivationOrder);
  const min = Math.min(...orders);
  const selected = orders.findIndex((order) => order === min);
  if (selected <= 0) {
    return null;
  }
  return selected;
}

function candidateDerivationOrder(candidate: CommitmentCandidate): number {
  const entry = candidate.entry ?? null;
  const translation = candidate.translation ?? entry?.senses?.[0] ?? null;
  const derivation = candidate.derivation ?? derivationForSense(translation, entry);
  return derivationOrder(entry, derivation.id);
}

function commitmentCandidateFallbackGroup(candidates: readonly CommitmentCandidate[]): number | null {
  return fallbackPriorityGroup(candidates, candidatePriorityGroup);
}

function commitmentCandidateTraceValue(
  candidate: CommitmentCandidate,
  fallbackGroup: number | null
): TraceDetailValue {
  const priorityGroup = candidatePriorityGroup(candidate);
  const nominalized = candidate.translation?.nominalized;
  return candidateObservabilityTraceValue({
    lemma: candidate.koreanLemma ?? candidate.korean ?? "",
    koreanPos: candidate.koreanPos ?? null,
    koreanPosName: candidate.koreanPos === undefined ? null : posToString(candidate.koreanPos),
    priorityGroup,
    priorityInGroup: candidatePriorityInGroup(candidate),
    fallbackGroup: fallbackGroup !== null && priorityGroup === fallbackGroup,
    senseIndex: candidateSenseIndex(candidate),
    projectionOrdinal: candidate.projectionOrdinal,
    projectionOrdinalSource: "runtime_candidate",
    derivation: candidate.derivation?.id ?? null,
    projectionSource: candidateProjectionSource(commitmentCandidateView(candidate)),
    renderPlanKind: candidate.renderPlan?.kind ?? null,
    nominalized: candidate.nominalProjection === "stem_root" ? null : nominalized ?? null
  });
}

function preRenderFallbackWarningCount(
  span: CommitmentSpan,
  candidates: readonly CommitmentCandidate[]
): number {
  const spanWarnings = span.warnings ?? [];
  const candidateWarnings = candidates.flatMap((candidate) => candidate.warnings ?? []);
  return [...spanWarnings, ...candidateWarnings].filter((warning) => warning.type === "render_fallback").length;
}


function candidateSlotEvidenceNeedsProductionAnchor(candidate: CommitmentCandidate): boolean {
  const translation = candidate.translation;
  if (translation === undefined) {
    return false;
  }
  const frames = translationFrameDataAlternatives(translation).filter(isFrameJsonMapForCommitment);
  return frames.length > 0 &&
    frames.some((frameData) => "slots" in frameData) &&
    frames.every((frameData) => !frameNeedsFinalClauseLayoutForCommitment(frameData));
}
