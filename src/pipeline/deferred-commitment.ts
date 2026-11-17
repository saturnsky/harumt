import type { MorphemeEntry } from "../types/dictionary.js";
import { derivationForSense, derivationOrder } from "../dictionary/derivation.js";
import type { DekiruReading, HonorificLevel, ParticleAssignment, RareruReading } from "../types/pipeline.js";
import type { RenderPlan, PredicateHeadTailChainRenderPlan } from "../types/render-plan.js";
import type { Warning } from "../types/warning.js";
import { legacySurfaceCompositionPlan, hasClauseRole, isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan, renderPlanStartsWithShortNegation, spanLocalRenderPlanNode } from "../types/render-plan.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { type ClauseLayout } from "./clause-layout/index.js";
import { closesUtteranceAs, type UtteranceClosureKind } from "./clause-layout/utterance-closure.js";
import { POS0, POS5A, isBareNaAdjSet, isNaAdjCapable, isSahenCapableNominal, 形状詞, 形容詞0, 助詞_係助詞, 助詞_副助詞, 名詞, 動詞, 意志推量形_, 命令形_, 동사, 명사, 부사, 형용사, POS01, 動詞_非自立可能, posToString } from "../types/pos.js";
import { conjugate } from "../generator/conjugator.js";
import { candidateBearingAuxLayer } from "./head-tail/tail/predicate-root/inspect.js";
import { selectParticle } from "../generator/particles.js";
import type { LookupTables } from "./lookup-tables.js";
import { extractTeConnectiveBoundaryChoice, isWakePrefixPlan, replaceConnectiveRenderPlan, replaceLemmaRenderPlan } from "./rendering/render-plan.js";
import { realizeNumeral } from "../generator/numeral-realization.js";
import { PredicateArgumentView } from "./semantics/helpers.js";
import { resolveContextWithLayout, type FrameSourceConditionMatch } from "./context.js";
import { isHardTerminalPunctuationToken } from "./head-tail/boundary/punctuation.js";
import { hydrateBenefactivePayloads } from "./head-tail/tail/predicate-root/benefactive-hydration.js";
import {
  candidateRealizationFromDecisionChoices,
  resolveTailEvidenceDecision
} from "./head-tail/tail/predicate-root/tail-evidence-decision.js";
import { headEvidenceDecisionTraceValue } from "./head-tail/tail/predicate-root/trace.js";
import {
  stemCandidateIdentitiesEqual,
  stemCandidateIdentity,
  translationCandidateIdentity
} from "./head-tail/tail/predicate-root/stem-candidate-identity.js";
import { teHostClosesNegativeCopulaBridge } from "./clause-layout/speech-act.js";
import { isTeConnectiveToken } from "./head-tail/tail/postverb-tail-classifier.js";
import { replaceTosuruPassiveWithJudgmentQuote, tailRootWithTosuruPassiveJudgmentQuote, replaceBareTteCarrierWithQuotativeConnective, replaceBareTteQuoteWithTopicExclamativeSfp, replaceTailChainConnectiveSurface, replaceTailChainProjectionConnective, tailChainCopulaHostPredicationForConnectiveKind, tailChainTeConnectiveAttachesToStem, tailChainTeFormRole, tailChainTeFormClosesNegativeCopulaBridge, tailChainTeFormIsNegativeNaide, tailChainPredicationIsStative, tailChainHasConnectiveKind, tailChainHasConnectiveSurface } from "./head-tail/lifecycle/rewrite.js";
import { bareTteTopicExclamativeFollowerAhead } from "./head-tail/tail/predicate-root/classifiers/tokens.js";
import { NIWA_EVALUATION_EXTENT_PREDICATES } from "./head-tail/data/semantic-helper-sets.js";
import { opChainCanHostBareNounStem } from "./head-tail/tail/predicate-root/bare-noun-stem-hosting.js";
import {
  firstAuxLayer,
  tailRootClosesWithAttributiveTerminal,
  tailRootExplicitAdnominalMarkerIndices,
  tailRootFirstLayerOpConsumesToken,
  lemmaPlanIsCopulaNiAdverbial,
  opsDeclareNominalHostConstruction,
  plainNounStemAdverbialLemma,
  stemSupportsProjectionCategory,
  tailRootHasStateChangeResultTail,
  tailRootIsStandaloneCopulaNiAdverbialFragment
} from "./head-tail/tail/predicate-root/inspect.js";
import { tailRootBenefactiveContext } from "./head-tail/tail/predicate-root/span-metadata.js";
import {
  bareStemNominalUseHasSubstituteNounLexeme,
  bareStemNominalUseHostClass,
  bareStemNominalUseYieldsToVerbalPredicateHost,
  candidateProjectionSource,
  candidateProjectionKinds,
  isBareStemNominalUseSlot,
  mixedPosSlot,
  spanGrammar,
  type BareStemNominalUseHostClass
} from "./candidate-runtime.js";
import {
  candidateObservabilityTraceValue,
  fallbackPriorityGroup,
  slotEvidenceObservabilityTraceValue
} from "./candidate-observability.js";
import {
  headOwnerCandidateTraceList,
  headOwnerCandidateSelectionEvidenceTraceList,
  selectHeadOwnerCandidate,
  type HeadOwnerCandidateDescriptor,
  type HeadOwnerCandidateSelectionEvidence
} from "./head-tail/head/profile.js";
import { applyHeadOwnerCandidatePayloadToSpan } from "./head-tail/candidate/owner-payload.js";
import { preserveTailChainRenderPlanEnvelope } from "./head-tail/lifecycle/envelope.js";
import { tailRootCommitmentCandidates } from "./head-tail/tail/predicate-root/commitment-bridge.js";
import {
  candidateSetCandidates,
  candidateSetMembers,
  candidateSetSize,
  commitmentLaneCandidateSet,
  createSourceCandidateSet,
  dropCandidate,
  isResolvedCandidateSet,
  keepCandidate,
  resolveSourceCandidateSet,
  transformCandidateSet,
  withStagedCandidatePayload,
  withStagedCandidateSourceCondition,
  type ResolvedCandidateSet,
  type SourceCandidateSet,
  type StagedCandidate
} from "./source-candidate-set.js";
import { committedStemPrefersShortNegation } from "./head-tail/tail/predicate-root/short-negation-policy.js";
import { senseRequiresSourceEvidence } from "./head-tail/tail/predicate-root/frame-evidence.js";
import { collectAuxTokens } from "./matchers.js";
import { TokenCursor } from "./token-cursor.js";
import { TraceEvent, type TraceCollector, type TraceDetailValue } from "./trace.js";
import {
  adjectiveConnectivePrefersAseo,
  classifyNextPredicateCategory,
  followerInabilityPrefersAseo,
  teConnectivePrefersAseo,
  tePrecedingCategory,
  type TeConnectiveSurfaceRole
} from "./semantics/te-connective.js";
import { findTeEvaluationFollowerIndex } from "./head-tail/tail/postverb-events.js";
import { isSurfaceCarrierReactionReasonAuxiliary } from "./semantics/surface-carrier-auxiliaries.js";
import { commitWinner } from "./translation/access.js";
import { metadataAdverbial } from "./translation/metadata.js";
import type { CarrierHeadContract, HeadProjectionKind, HeadTailEvidenceDecision, StemCandidateRealization, TailNode } from "./head-tail/tail/predicate-root/grammar.js";
import type {
  NominalRoot,
  PredicateNominalProjectionHost
} from "./head-tail/head/adapters/nominal/grammar.js";

import {
  BENEFACTIVE_REACTION_TE_ASPECTS,
  TE_SHIMAU_COMPLETION_ASPECTS,
  type ClauseTraceDetail,
  type CommitmentCandidate,
  type CommitmentContentMap,
  type CommitmentEntry,
  type CommitmentSpan,
  type CommitmentToken,
  type CommitmentTranslation,
  type HeadOwnerCandidateCommitmentPayload,
  type HeadOwnerCandidateCommitmentPayloadSlot
} from "./commitment/types.js";
import { candidateFrameAlternativesMatch, candidatePriorityGroup, candidatePriorityInGroup, candidateSenseIndex, commitmentCandidateView, contentEntries, contentSpanAt, isFallbackCandidate, isFrameJsonMapForCommitment, runtimeTokens, selectedCommitmentCandidate, stagedCommitmentCandidateSet, tailChainHasAnyAspect, tailChainHasExcessivePostverb, translationFrameDataAlternatives, withTraceClauseIdx } from "./commitment/span-evidence.js";
import {
  argumentParticleIndicesForPredicate,
  refineRareruReadingFromClosedHonorificEvidence,
  refineRareruReadingFromIntrinsicHonorificMetadata,
  refineRareruReadingFromCommittedParticleRoles,
  refineRareruReadingFromSelectedFrame,
  argumentParticleIndicesForPredicate as argumentParticleIndicesForPredicateEvidence,
  hasNiYotteAgentMarker,
  isNiYotteAgentMarkerVerbToken,
  resolveDekiruReading,
  resolveRareruReading,
  type DeferredRareruObjectState
} from "./commitment/voice-reading-resolution.js";
import {
  classifyVerbTeConnective,
  classifyEllipticTeConnective,
  classifyTeListingEvidence,
  teClausesSetContrastiveTopics,
  teClosureRepeatsSameHostChain,
  ellipticTeClosureSetsContrastiveTopics,
  unmarkedTeConnectiveRole,
  renyouChuushiClosesStateChange,
  committedTeClassificationState,
  extractConnective,
  extractPredicateKoreanLemma,
  nextPredicateIndex,
  nextPredicateMoodSignals,
  normalizeTeConnectivePreference,
  predicateLookupKey,
  selectedTeConnectivePreference,
  spanTeConnectiveMarkerIsSourceBearing,
  selectedTranslation,
  spanHasFollowingBenefactiveResultTail,
  spanHasDesiderativeTeSource,
  spanHasNakuTeNegativeSource,
  spanHasCopulaNegationTeBridge,
  teConnectiveEndIndexForSpan,
  spanIsAdjectiveLikeTeConnective,
  spanIsTeConnectiveFallback,
  spanHasSourcePredicateEvidence,
  spanMayBePredicateForCommitment,
  surfaceCarrierReactionPrefersAseo,
  teAruEvaluationPrefersAseo,
  teAttendantCoactionEligible,
  teBoundaryFollowingPredicateExists,
  teClassificationSurfaceRole,
  teEvidence,
  teHypothesis,
  teIruProgressiveResultChainSubjectCompatible,
  teMovementAcquisitionPrefersAseo,
  teMovementPathSourcePrefersAseo,
  uniqueConnectiveKeys
} from "./commitment/te-connective-resolution.js";
import { commitNounToSareru, commitPassiveClasses, commitPassiveClassForSpan } from "./commitment/passive-class.js";
import {
  applySlotRealizationEffects,
  candidateHasFrameSourceConditions,
  candidateSkippedSlotHasRawEvidence,
  frameNeedsFinalClauseLayoutForCommitment,
  getSemanticFrameRuntimeMatch,
  materializeSelectedFrameThemeTopic,
  recordSemanticFrameShadow,
  recordSlotRealizationEffects,
  selectCandidateByFrameEvidence,
  selectCandidateByNominalFrameEvidence,
  semanticRoleCaseParticleAssignments,
  semanticFrameRuntimeMatch,
  semanticSlotRealizationEffects,
  slotRealizationParticleAssignments,
  type SemanticFrameRuntimeCache
} from "./commitment/semantic-frame.js";
import { commitParticleRoles, particleIndicesForCommitment } from "./commitment/particle-roles.js";
import { buildSourcePredicateOperatorEvidenceGraph, sourcePredicateOperatorEvidenceAt } from "./structural-relation/source-predicate-operator.js";
import type { StructuralRelationGraph, StructuralSourcePredicateOperatorKind } from "./structural-relation/types.js";

export { DEKIRU_ADVERB_COMPLETION_CUES, NO_EXPERIENCER_KEIJOUJI, PREDICATE_POS } from "./commitment/types.js";
export { withSemanticFrameRuntimeMatchHookForTest, type SemanticFrameRuntimeMatchHook } from "./commitment/semantic-frame.js";
export { casePreferenceToAssignment, resolveCasePreference, spanHasDesireAux } from "./commitment/particle-roles.js";
export {
  allowBDirectionWo,
  argumentParticleIndicesForPredicate,
  pickDekiruSingleton,
  scanDekiruAuxCues
} from "./commitment/voice-reading-resolution.js";
export {
  extractConnective,
  extractPredicateKoreanLemma,
  nextPredicateIndex,
  nextPredicateMoodSignals,
  predicateLookupKey,
  spanIsAdjectiveLikeTeConnective,
  spanIsTeConnectiveFallback,
  spanMayBePredicateForCommitment,
  translationTeConnectivePreference
} from "./commitment/te-connective-resolution.js";
export type {
  CasePreference,
  ClauseTraceDetail,
  SemanticFrameRuntimeMatch,
  CasePreferenceObject,
  CasePreferenceValue,
  CommitmentCandidate,
  CommitmentContentMap,
  CommitmentEntry,
  CommitmentSpan,
  CommitmentToken,
  CommitmentTranslation,
  ExtentPostpositionCommitment,
  HeadOwnerCandidateCommitmentPayload,
  HeadOwnerCandidateCommitmentPayloadSlot
} from "./commitment/types.js";

export type { HonorificLevel, DekiruReading, RareruReading };

export type { ParticleAssignment };
export { isFallbackCandidate } from "./commitment/span-evidence.js";

export function withClauseIdx<T extends ClauseTraceDetail>(detail: T, clauseIdx: number | null | undefined): T | T & { readonly clauseIdx: number } {
  if (clauseIdx === undefined || clauseIdx === null || clauseIdx < 0) {
    return detail;
  }
  return { ...detail, clauseIdx: clauseIdx };
}


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

const NOMINAL_PROJECTIONS = [
  "direct_nominal",
  "nominalized_predicate",
  "adverbial_nominal_fallback"
] as const satisfies readonly HeadProjectionKind[];
const NOMINAL_EXPECTED_REALIZATION_ORDER = [
  ["direct_nominal"],
  ["nominalized_predicate", "projected_nominal_adjectival"],
  ["adverbial_nominal_fallback"]
] as const satisfies readonly (readonly HeadProjectionKind[])[];
const NOMINAL_EXPECTED_PROJECTIONS = [
  "direct_nominal",
  "nominalized_predicate",
  "projected_nominal_adjectival",
  "adverbial_nominal_fallback"
] as const satisfies readonly HeadProjectionKind[];
const STEM_ROOT_NOMINAL_PROJECTIONS = [
  "stem_root_nominal"
] as const satisfies readonly HeadProjectionKind[];
const VERBAL_NOMINAL_M_PROJECTIONS = [
  "verbal_nominal_m"
] as const satisfies readonly HeadProjectionKind[];
const STEM_NOMINAL_REALIZATION_ACCEPTS = [
  ...STEM_ROOT_NOMINAL_PROJECTIONS,
  ...VERBAL_NOMINAL_M_PROJECTIONS
] as const satisfies readonly HeadProjectionKind[];
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
const DIRECT_QUOTE_BODY_PROJECTIONS = [
  ...NOMINAL_PROJECTIONS,
  ...DIRECT_PREDICATE_PROJECTIONS,
  "direct_adverbial"
] as const satisfies readonly HeadProjectionKind[];
const ADVERBIAL_PROJECTIONS = [
  "direct_adverbial",
  "adverbialized_adjectival",
  "adverbialized_verbal"
] as const satisfies readonly HeadProjectionKind[];

interface DeferredRealizationConstraint {
  readonly accepts?: readonly HeadProjectionKind[];
  readonly realizationOrder?: readonly (readonly HeadProjectionKind[])[];
}

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

function narrowCandidatesByFinalFrameEvidence(
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

function commitTranslationCandidates(
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

function selectCandidatesByDeferredSlotContract(
  candidates: readonly CommitmentCandidate[],
  slot: string | null | undefined,
  options: {
    readonly preserveExistingOrder: boolean;
    readonly hostClass?: BareStemNominalUseHostClass | null;
  }
): CommitmentCandidate[] {
  const contract = deferredSlotContract(slot, options.hostClass ?? null);
  if (contract === null || candidates.length < 2) {
    return [...candidates];
  }
  const groups = commitmentCandidatePriorityGroups(candidates);
  for (const [groupIndex, group] of groups.entries()) {
    const finalFallback = groupIndex === groups.length - 1;
    const compatible = group.filter((candidateIndex) =>
      commitmentCandidateMatchesContract(candidates[candidateIndex]!, contract)
    );
    if (compatible.length > 0) {
      const selected = options.preserveExistingOrder
        ? finalFallback ? group : compatible
        : finalFallback
          ? reorderCommitmentCandidateIndicesByContract(group, candidates, contract)
          : reorderCommitmentCandidateIndicesByContract(compatible, candidates, contract);
      return selected.map((index) => candidates[index]!);
    }
    if (finalFallback) {
      const selected = options.preserveExistingOrder
        ? group
        : reorderCommitmentCandidateIndicesByContract(group, candidates, contract);
      return selected.map((index) => candidates[index]!);
    }
  }
  return [...candidates];
}

function reorderCommitmentCandidateIndicesByContract(
  indices: readonly number[],
  candidates: readonly CommitmentCandidate[],
  contract: CarrierHeadContract
): number[] {
  return [...indices].sort((left, right) => {
    const leftCandidate = candidates[left]!;
    const rightCandidate = candidates[right]!;
    return commitmentCandidateProjectionTier(leftCandidate, contract) - commitmentCandidateProjectionTier(rightCandidate, contract) ||
      candidatePriorityInGroup(leftCandidate) - candidatePriorityInGroup(rightCandidate) ||
      left - right;
  });
}

function commitmentCandidateProjectionTier(candidate: CommitmentCandidate, contract: CarrierHeadContract): number {
  const groups = contract.candidatePreference ?? contract.realizationOrder ?? [];
  if (groups.length === 0) {
    return 0;
  }
  const kinds = candidateProjectionKinds(commitmentCandidateView(candidate));
  const tier = groups.findIndex((group) => group.some((kind) => kinds.includes(kind)));
  return tier >= 0 ? tier : groups.length;
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

function predicateRootOwnerRejectsBareNounStem(plan: RenderPlan | null | undefined): boolean {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  return layer !== null && !opChainCanHostBareNounStem(layer.ops);
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

function deferredSlotContract(
  slot: string | null | undefined,
  hostClass: BareStemNominalUseHostClass | null = null
): CarrierHeadContract | null {
  switch (slot) {
    case "noun_particle":
    case "noun_only_compound":
      return {
        relation: "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...STEM_NOMINAL_REALIZATION_ACCEPTS],
        candidatePreference: [...NOMINAL_EXPECTED_REALIZATION_ORDER, STEM_ROOT_NOMINAL_PROJECTIONS, VERBAL_NOMINAL_M_PROJECTIONS],
        realizationOrder: [...NOMINAL_EXPECTED_REALIZATION_ORDER, STEM_ROOT_NOMINAL_PROJECTIONS, VERBAL_NOMINAL_M_PROJECTIONS],
        contextReason: "nominal argument slot requires nominal head realization"
      };
    case "nominalized_suffix":
      return {
        relation: "modification",
        accepts: ["nominalized_predicate", "direct_nominal", ...STEM_ROOT_NOMINAL_PROJECTIONS],
        candidatePreference: [["nominalized_predicate"], ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS],
        realizationOrder: [["nominalized_predicate"], ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS],
        contextReason: "nominalizing suffix prefers an explicit nominalized predicate projection before lexical noun fallback"
      };
    case "nominal_suffix_compound":
    case "quoted_lexical_mention":
    case "stem_coordination":
    case "stem_clause_pause": {
      const verbalNominalM: readonly (readonly HeadProjectionKind[])[] =
        slot === "stem_coordination" ? [VERBAL_NOMINAL_M_PROJECTIONS] : [];
      const stemFirst: readonly (readonly HeadProjectionKind[])[] = [
        STEM_ROOT_NOMINAL_PROJECTIONS, ["direct_nominal"], ["nominalized_predicate", "projected_nominal_adjectival"], ...verbalNominalM, ["adverbial_nominal_fallback"]
      ];
      const nounFirst: readonly (readonly HeadProjectionKind[])[] = [
        ["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ...verbalNominalM, ["adverbial_nominal_fallback"]
      ];
      const order = hostClass === "na_adj_capable_noun" ? nounFirst : stemFirst;
      return {
        relation: slot === "quoted_lexical_mention" ? "quote_body" : "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...STEM_ROOT_NOMINAL_PROJECTIONS,
          ...(slot === "stem_coordination" ? VERBAL_NOMINAL_M_PROJECTIONS : [])],
        candidatePreference: order,
        realizationOrder: order,
        contextReason: hostClass === "na_adj_capable_noun"
          ? "na-adjective-capable noun in a nominal-use slot prefers its lexical noun sense before the predicate stem root"
          : "bare na-adjective stem in a nominal-use slot prefers the predicate stem root (combining form) over a lexical noun sense"
      };
    }
    case "keijouji_suffix":
      return {
        relation: "modification",
        accepts: [...PREDICATE_PROJECTIONS, ...NOMINAL_PROJECTIONS],
        candidatePreference: [
          DIRECT_PREDICATE_PROJECTIONS,
          DERIVED_PREDICATE_PROJECTIONS,
          NOMINAL_PROJECTIONS
        ],
        realizationOrder: [
          DIRECT_PREDICATE_PROJECTIONS,
          DERIVED_PREDICATE_PROJECTIONS,
          NOMINAL_PROJECTIONS
        ],
        contextReason: "na-attributive slot prefers predicate/adjectival projection while preserving nominal-only heads"
      };
    case "keijouji_adverbial":
      return {
        relation: "modification",
        accepts: [...ADVERBIAL_PROJECTIONS, ...DIRECT_PREDICATE_PROJECTIONS, "projected_nominal_adjectival", ...NOMINAL_PROJECTIONS],
        candidatePreference: [
          ["direct_adverbial"],
          ["adverbialized_adjectival", "adverbialized_verbal"],
          DIRECT_PREDICATE_PROJECTIONS,
          ["projected_nominal_adjectival"],
          NOMINAL_PROJECTIONS
        ],
        realizationOrder: [
          ["direct_adverbial"],
          ["adverbialized_adjectival", "adverbialized_verbal"],
          DIRECT_PREDICATE_PROJECTIONS,
          ["projected_nominal_adjectival"],
          NOMINAL_PROJECTIONS
        ],
        contextReason: "copula-ni adverbial slot prefers adverbial or adverbialized predicate realization before nominal fallback"
      };
    case "copula_nominal_idiom":
      return {
        relation: "modification",
        accepts: [...NOMINAL_EXPECTED_PROJECTIONS, ...PREDICATE_PROJECTIONS],
        candidatePreference: [...NOMINAL_EXPECTED_REALIZATION_ORDER, DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        realizationOrder: [...NOMINAL_EXPECTED_REALIZATION_ORDER, DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        contextReason: "lexical copula nominal idiom keeps nominal realization before predicate projection"
      };
    case "copula_predicate":
    case "naru_complement":
      return {
        relation: "modification",
        accepts: [...PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_PROJECTIONS],
        candidatePreference: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER],
        realizationOrder: [DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS, ...NOMINAL_EXPECTED_REALIZATION_ORDER],
        contextReason: "predicate copula/complement slot prefers direct predicate realization before nominal fallback"
      };
    case "quoted_nominal":
      return {
        relation: "quote_body",
        accepts: [...DIRECT_QUOTE_BODY_PROJECTIONS, ...STEM_ROOT_NOMINAL_PROJECTIONS, ...DERIVED_PREDICATE_PROJECTIONS],
        candidatePreference: [["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ["adverbial_nominal_fallback"], DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        realizationOrder: [["direct_nominal"], STEM_ROOT_NOMINAL_PROJECTIONS, ["nominalized_predicate", "projected_nominal_adjectival"], ["adverbial_nominal_fallback"], DIRECT_PREDICATE_PROJECTIONS, DERIVED_PREDICATE_PROJECTIONS],
        contextReason: "explicit metalinguistic quoted nominal slot preserves direct nominal realization before predicate projection"
      };
    default:
      return null;
  }
}

function commitmentCandidatePriorityGroups(candidates: readonly CommitmentCandidate[]): number[][] {
  const groups: number[][] = [];
  const groupKeys: number[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const groupKey = candidatePriorityGroup(candidate);
    const existingIndex = groupKeys.indexOf(groupKey);
    if (existingIndex >= 0) {
      groups[existingIndex]!.push(index);
      continue;
    }
    groupKeys.push(groupKey);
    groups.push([index]);
  }
  return groups
    .map((group, index) => ({ group, key: groupKeys[index] ?? Number.MAX_SAFE_INTEGER }))
    .sort((left, right) => left.key - right.key)
    .map(({ group }) => group);
}

function commitmentCandidateMatchesContract(candidate: CommitmentCandidate, contract: CarrierHeadContract): boolean {
  const kinds = candidateProjectionKinds(commitmentCandidateView(candidate));
  return kinds.some((kind) => contract.accepts.includes(kind));
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

function predicatePlanWithCandidateSetCommitment(
  plan: PredicateHeadTailChainRenderPlan,
  decision: HeadTailEvidenceDecision,
  committedSense: ReturnType<typeof translationCandidateIdentity> | undefined,
  realizationConstraint?: DeferredRealizationConstraint
): PredicateHeadTailChainRenderPlan {
  const committedSenseRealization = committedSense === undefined
    ? undefined
    : candidateRealizationFromDecisionChoices(decision, committedSense, realizationConstraint === undefined
      ? {}
      : {
        ...(realizationConstraint.accepts === undefined ? {} : { accepts: realizationConstraint.accepts }),
        ...(realizationConstraint.realizationOrder === undefined
          ? {}
          : { realizationOrder: realizationConstraint.realizationOrder })
      });
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        headEvidenceDecision: decision,
        tail: tailNodeWithCandidateSetCommitment(
          plan.realization.root.tail,
          committedSenseRealization,
          committedSense,
          realizationConstraint === undefined
        )
      }
    }
  };
}

function tailNodeWithCandidateSetCommitment(
  node: TailNode,
  committedSenseRealization: StemCandidateRealization | null | undefined,
  committedSense: ReturnType<typeof translationCandidateIdentity> | undefined,
  preserveExistingRealization = false
): TailNode {
  if (node.kind === "connective") {
    return {
      ...node,
      inner: tailNodeWithCandidateSetCommitment(
        node.inner,
        committedSenseRealization,
        committedSense,
        preserveExistingRealization
      ) as typeof node.inner,
      outer: tailNodeWithCandidateSetCommitment(
        node.outer,
        committedSenseRealization,
        committedSense,
        preserveExistingRealization
      )
    };
  }
  const derivationalBase = node.stem.derivationalBase;
  const stem = derivationalBase === undefined
    ? node.stem
    : {
      ...node.stem,
      derivationalBase: {
        ...derivationalBase,
        host: {
          ...derivationalBase.host,
          tail: tailNodeWithCandidateSetCommitment(
            derivationalBase.host.tail,
            committedSenseRealization,
            committedSense,
            preserveExistingRealization
          )
        }
      }
    };
  if (stem.kind !== "candidateSet") {
    return stem === node.stem ? node : { ...node, stem };
  }
  if (
    committedSense !== undefined &&
    !stem.candidates.some((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
    )
  ) {
    return stem === node.stem ? node : { ...node, stem };
  }
  const sameCommittedSense = committedSense !== undefined &&
    stem.committedSense !== undefined &&
    stemCandidateIdentitiesEqual(stem.committedSense, committedSense);
  const nextRealization = preserveExistingRealization &&
    sameCommittedSense &&
    stem.committedSenseRealization !== undefined
    ? stem.committedSenseRealization
    : committedSenseRealization;
  return {
    ...node,
    stem: {
      ...stem,
      ...(nextRealization === undefined ? {} : { committedSenseRealization: nextRealization }),
      ...(committedSense === undefined ? {} : { committedSense })
    }
  };
}

function commitCandidateSetWithoutBridge(
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

function commitNestedPredicateNominalHost(
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

function predicateNominalProjectionHosts(root: NominalRoot): readonly PredicateNominalProjectionHost[] {
  if (root.kind === "predicateNominalHost" || root.kind === "renyouNominalHead") {
    return [root.host];
  }
  if (
    root.kind === "hostBearingLikeness" &&
    root.frame.modal.kind === "nominalHostLikenessContinuationProjection" &&
    root.frame.modal.predicateHost !== undefined
  ) {
    return [root.frame.modal.predicateHost];
  }
  return [];
}

function nominalRootWithPredicateHostRoot(
  root: NominalRoot,
  target: PredicateNominalProjectionHost,
  committedRoot: PredicateNominalProjectionHost["root"]
): NominalRoot {
  if ((root.kind === "predicateNominalHost" || root.kind === "renyouNominalHead") && root.host === target) {
    return { ...root, host: { ...root.host, root: committedRoot } };
  }
  if (
    root.kind === "hostBearingLikeness" &&
    root.frame.modal.kind === "nominalHostLikenessContinuationProjection" &&
    root.frame.modal.predicateHost === target
  ) {
    return {
      ...root,
      frame: {
        ...root.frame,
        modal: {
          ...root.frame.modal,
          predicateHost: { ...root.frame.modal.predicateHost, root: committedRoot }
        }
      }
    };
  }
  return root;
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

export function commitDecisions(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  options: {
    readonly layout: ClauseLayout;
    readonly trace?: TraceCollector | null;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly sourcePredicateOperatorGraph?: StructuralRelationGraph | null;
  }
): void {
  const layout = options.layout;
  const trace = options.trace ?? null;
  const lookups = options.lookups;
  const numeric = options.numeric;
  const baseCursor = new TokenCursor(tokens, 0, tokens.length);
  const contentMapEntries = [...contentEntries(contentMap)];
  const sourcePredicateOperatorGraph = options.sourcePredicateOperatorGraph ?? buildSourcePredicateOperatorEvidenceGraph({
    tokens,
    layout,
    contentMap: new Map(contentMapEntries),
    lookups
  });
  for (const [idx, span] of contentMapEntries) {
    commitOwnerCandidateSelection(idx, span, layout, trace, {
      tokens,
      contentMap,
      lookups,
      numeric,
      baseCursor
    });
  }
  const deferredRareruObjectReadings = new Map<number, DeferredRareruObjectState>();
  for (const [predIdx, span] of contentMapEntries) {
    resolveRareruReading(span, predIdx, tokens, layout, contentMap, trace, lookups, numeric, deferredRareruObjectReadings);
    resolveDekiruReading(span, predIdx, tokens, layout, trace, lookups);
  }

  commitTeConnectiveBoundaryScanChoices(tokens, contentMap, layout, trace, lookups);

  commitTeConnectiveResolution(tokens, contentMap, layout, trace, lookups, { allowResultChain: false });
  syncLayoutConnectiveRoles(tokens, contentMap, layout);

  commitTosuruJudgmentPassiveRefine(tokens, contentMap, layout);

  for (const [idx, span] of contentMapEntries) {
    if (candidateSetSize(commitmentLaneCandidateSet(span.sourceCandidates)) > 0) {
      const status = commitTranslationCandidates(
        span,
        tokens,
        idx,
        layout,
        contentMap,
        trace,
        lookups,
        numeric,
        baseCursor,
        sourcePredicateOperatorGraph
      );
      if (status === "committed") {
        syncKeijoujiVerbPredicateFlag(span, tokens, idx);
      } else if (span.sourceCandidates?.state === "unresolved") {
        resolveFinalContext(span, tokens, idx, layout, contentMap, trace, lookups, numeric);
      }
    } else {
      const status = commitCandidateSetWithoutBridge(
        span,
        tokens,
        idx,
        layout,
        contentMap,
        lookups,
        numeric,
        baseCursor,
        sourcePredicateOperatorGraph
      );
      if (status === "committed") {
        syncKeijoujiVerbPredicateFlag(span, tokens, idx);
      } else if (status === "not_applicable") {
        resolveFinalContext(span, tokens, idx, layout, contentMap, trace, lookups, numeric);
      }
    }
    const nestedStatus = commitNestedPredicateNominalHost(
      span,
      tokens,
      idx,
      layout,
      contentMap,
      lookups,
      numeric,
      baseCursor,
      sourcePredicateOperatorGraph
    );
    if (nestedStatus === "fail_closed") {
      continue;
    }
  }

  commitTeConnectiveBoundaryScanChoices(tokens, contentMap, layout, trace, lookups);

  commitTeConnectiveResolution(tokens, contentMap, layout, trace, lookups, {
    allowResultChain: true,
    semanticFrameRuntimeCache: new Map(),
    numeric
  });
  syncLayoutConnectiveRoles(tokens, contentMap, layout);
  for (const [predIdx, [, sourceCandidates]] of deferredRareruObjectReadings) {
    const span = contentSpanAt(contentMap, predIdx)!;
    const provisionalVoice = span.voice;
    resolveRareruReading(span, predIdx, tokens, layout, contentMap, trace, lookups, numeric, deferredRareruObjectReadings);
    if (span.voice === provisionalVoice) continue;
    span.sourceCandidates = sourceCandidates;
    if (candidateSetSize(commitmentLaneCandidateSet(span.sourceCandidates)) === 0) continue;
    commitTranslationCandidates(span, tokens, predIdx, layout, contentMap, trace, lookups, numeric, baseCursor, sourcePredicateOperatorGraph);
    syncKeijoujiVerbPredicateFlag(span, tokens, predIdx);
  }
  commitTteTopicExclamativeRefine(tokens, contentMap, lookups);

  commitBareTteCarrierMidUtteranceRefine(tokens, contentMap, layout);

  commitNiwaEvaluationRefine(tokens, contentMap, layout, lookups);

  commitNoNiCopulaAdversativeRefine(contentMap);

  commitShiReasonRefine(tokens, contentMap, layout, lookups);

  commitCompoundSerialConnectives(contentMap, layout, trace, lookups);

  hydrateBenefactiveCommitmentSpans(tokens, contentMap, layout, trace, lookups);

  const semanticFrameRuntimeCache: SemanticFrameRuntimeCache = new Map();
  commitSuffixLikeAttachments(tokens, contentMap);
  for (const [predIdx, span] of contentEntries(contentMap)) {
    if (refineRareruReadingFromClosedHonorificEvidence(span, predIdx, tokens, layout, trace, lookups)) {
      semanticFrameRuntimeCache.delete(predIdx);
    }
    if (refineRareruReadingFromIntrinsicHonorificMetadata(span, predIdx, layout, trace, lookups)) {
      semanticFrameRuntimeCache.delete(predIdx);
    }
    const refinedFromSelectedFrame = refineRareruReadingFromSelectedFrame(
      span,
      predIdx,
      tokens,
      layout,
      semanticFrameRuntimeMatch(tokens, predIdx, span, layout, contentMap, lookups, numeric, { voiceOverride: "active" }),
      trace,
      lookups
    );
    if (refinedFromSelectedFrame) {
      semanticFrameRuntimeCache.delete(predIdx);
    }
  }
  if (trace !== null) {
    for (const [idx, span] of contentEntries(contentMap)) {
      recordSemanticFrameShadow(semanticFrameRuntimeCache, tokens, idx, span, layout, contentMap, trace, lookups, numeric);
    }
  }
  commitPassiveClasses(tokens, contentMap, layout, trace, lookups);

  for (const [clauseIdx, clause] of layout.clauses.entries()) {
    for (const [predIdx] of clause.particlesByPredicate) {
      const span = contentSpanAt(contentMap, predIdx);
      if (span === undefined) {
        continue;
      }
      const semanticFrameRuntimeMatch = getSemanticFrameRuntimeMatch(semanticFrameRuntimeCache, tokens, predIdx, span, layout, contentMap, lookups, numeric);
      materializeSelectedFrameThemeTopic(semanticFrameRuntimeMatch, predIdx, layout);
      let roleCaseAssignments = semanticRoleCaseParticleAssignments(semanticFrameRuntimeCache, tokens, predIdx, span, layout, contentMap, lookups, numeric);
      const slotRealizationEffects = semanticSlotRealizationEffects(semanticFrameRuntimeCache, tokens, predIdx, span, layout, contentMap, lookups, numeric);
      const particleIndices = particleIndicesForCommitment(
        argumentParticleIndicesForPredicate(predIdx, tokens, layout),
        slotRealizationEffects,
        predIdx,
        layout
      );
      if (slotRealizationEffects.length > 0) {
        applySlotRealizationEffects(contentMap, predIdx, slotRealizationEffects);
        commitPassiveClassForSpan(tokens, predIdx, span, layout, trace, lookups);
        roleCaseAssignments = new Map([
          ...roleCaseAssignments,
          ...slotRealizationParticleAssignments(slotRealizationEffects)
        ]);
        if (trace !== null) {
          recordSlotRealizationEffects(trace, tokens, predIdx, slotRealizationEffects, layout);
        }
      }
      span.committedParticleRoles = commitParticleRoles(baseCursor, tokens, span, [...particleIndices], {
        clause,
        layout,
        roleCaseAssignments,
        semanticFrameRuntimeMatch,
        predicateIdx: predIdx,
        trace: trace ?? null,
        traceClauseIdx: clauseIdx,
        lookups
      });
      if (refineRareruReadingFromCommittedParticleRoles(span, predIdx, tokens, layout, trace, lookups)) {
        semanticFrameRuntimeCache.delete(predIdx);
      }
      if (trace !== null) {
        for (const [particleIdx, committed] of Object.entries(span.committedParticleRoles).sort(([left], [right]) => Number(left) - Number(right))) {
          trace.record(new TraceEvent(
            predIdx,
            "commitment",
            "particle_role",
            true,
            {
              particle_idx: Number(particleIdx),
              surface: tokens[Number(particleIdx)]?.surface ?? "",
              role: committed.role,
              korean: committed.korean ?? null,
              allomorph_key: committed.allomorphKey ?? null,
              commitment_source: committed.commitmentSource ?? null,
              attach_left: committed.attachLeft ?? true,
              clause_idx: clauseIdx
            }
          ));
        }
      }
    }
  }

  commitNounToSareru(tokens, contentMap, layout, trace, lookups);

  for (const span of contentSpans(contentMap)) {
    commitNumeralRendering(span);
  }

  for (const span of contentSpans(contentMap)) {
    commitSpanWinnerEntry(span);
  }

  for (const span of contentSpans(contentMap)) {
    commitExtentPostposition(span);
    clearRelocatedExtentPostpositionSource(span);
  }

  commitAdverbialAdjunctRouting(contentMap, layout);
}

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

function commitOwnerCandidateSelection(
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

function hydrateBenefactiveCommitmentSpans(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  const runtime = runtimeTokens(tokens);
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan ?? null;
    if (!isPredicateHeadTailChainRenderPlan(plan) || !hasClauseRole(plan)) {
      continue;
    }
    const predicateTokenIdx = benefactiveHydrationPredicateIdxForPlan(plan, layout);
    const hydratedRoot = hydrateBenefactivePayloads(plan.realization.root, {
      tokens: plan.realization.sourceTokens ?? runtime,
      predicateTokenIdx,
      lookups,
      layout
    });
    if (hydratedRoot === plan.realization.root) {
      continue;
    }
    span.renderPlan = {
      ...plan,
      clauseRole: { ...plan.clauseRole, layout },
      realization: {
        ...plan.realization,
        root: hydratedRoot,
        sourceTokens: plan.realization.sourceTokens ?? runtime
      }
    };
    span.benefactive = tailRootBenefactiveContext(hydratedRoot) ?? span.benefactive ?? null;
    if (trace !== null) {
      trace.record(new TraceEvent(
        idx,
        "commitment",
        "benefactive_layout_hydration",
        true,
        withTraceClauseIdx({
          agent_particle_idx: span.benefactive?.agentParticleIdx ?? null,
          recipient_particle_idx: span.benefactive?.recipientParticleIdx ?? null,
          honorific_level: span.benefactive?.honorificLevel ?? null
        }, layout.clauseIndexOfPredicate(idx))
      ));
    }
  }
}

function benefactiveHydrationPredicateIdxForPlan(
  plan: PredicateHeadTailChainRenderPlan,
  layout: ClauseLayout
): number {
  if (layout.clauseOfPredicate(plan.clauseRole.predicateTokenIdx) !== undefined) {
    return plan.clauseRole.predicateTokenIdx;
  }
  return layout.clauseOfPredicate(plan.clauseRole.contentSpan.start) !== undefined
    ? plan.clauseRole.contentSpan.start
    : plan.clauseRole.predicateTokenIdx;
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

function commitNumeralRendering(span: CommitmentSpan): void {
  const plan = span.renderPlan ?? null;
  if (plan === null || plan.kind !== "numeral") {
    return;
  }
  const numeralPlan = plan;
  const korean = realizeNumeral(numeralPlan);
  span.korean = korean;
}

function commitExtentPostposition(span: CommitmentSpan): void {
  const postposition = span.extentPostposition ?? null;
  if (postposition === null) {
    return;
  }
  span.extentPostposition = null;
  const modifier = postposition.modifier.trim();
  if (modifier.length === 0) {
    return;
  }
  const base: RenderPlan | string = postposition.targetOverride ?? span.renderPlan ?? span.korean;
  span.renderPlan = legacySurfaceCompositionPlan("deferred_commitment", {
    korean: "",
    koreanPos: span.koreanPos,
    prefix: base,
    suffix: ` ${modifier}`
  });
  span.korean = "";
}

function clearRelocatedExtentPostpositionSource(span: CommitmentSpan): void {
  if (span.extentPostpositionRelocated !== true) {
    return;
  }
  span.korean = "";
  span.renderPlan = null;
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



function tailChainTeFormPrefersReason(plan: PredicateHeadTailChainRenderPlan, nextCategory: string | null): boolean {
  return tailNodeTeFormPrefersReason(plan.realization.root.tail, nextCategory);
}

function tailChainHasTeIruTeFormContinuation(plan: PredicateHeadTailChainRenderPlan): boolean {
  return tailNodeHasTeIruTeFormContinuation(plan.realization.root.tail);
}

function tailChainHasStatefulTeIruAspect(plan: PredicateHeadTailChainRenderPlan): boolean {
  return tailNodeHasStatefulTeIruAspect(plan.realization.root.tail);
}

function teIruResultChainHasProgressiveEvidence(
  mainKeys: readonly string[],
  lookups: LookupTables
): boolean {
  return mainKeys.some((key) => lookups.TE_IRU_PROGRESSIVE_ACTIVITY_VERBS.has(key));
}

function tailNodeHasTeIruTeFormContinuation(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasTeIruTeFormContinuation(node.inner) ||
      tailNodeHasTeIruTeFormContinuation(node.outer);
  }
  return node.ops.some((op) => op.kind === "aspect" && op.aspect === "te_iru") &&
    node.ops.some((op) => op.kind === "connective" && op.connective === "te_form");
}

function tailNodeHasStatefulTeIruAspect(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasStatefulTeIruAspect(node.inner) ||
      tailNodeHasStatefulTeIruAspect(node.outer);
  }
  return node.ops.some((op) =>
    op.kind === "aspect" &&
    op.aspect === "te_iru" &&
    (
      op.semantic?.renderStrategy === "resultative_state" ||
      op.semantic?.renderStrategy === "negative_resultative_state" ||
      op.semantic?.renderStrategy === "drop_aux" ||
      op.semantic?.renderStrategy === "attributive_drop_aux" ||
      op.semantic?.renderStrategy === "negative_completion"
    )
  );
}

function tailNodeTeFormPrefersReason(node: TailNode, nextCategory: string | null): boolean {
  if (node.kind === "connective") {
    return tailNodeTeFormPrefersReason(node.inner, nextCategory) ||
      tailNodeTeFormPrefersReason(node.outer, nextCategory);
  }
  if (
    node.terminal === "renyou_chuushi" &&
    node.terminalPayload?.kind === "renyouChuushi" &&
    node.terminalPayload.teFormRole === "reason"
  ) {
    return true;
  }
  const renyouTeIruContinuation =
    node.terminal === "renyou_chuushi" &&
    node.ops.some((op) => op.kind === "aspect" && op.aspect === "te_iru");
  if (
    renyouTeIruContinuation &&
    nextCategory === "reaction" &&
    !renyouChuushiSourceIsZu(node)
  ) {
    return true;
  }
  const negativeCompletion = node.ops.some((op) =>
    op.kind === "aspect" &&
    op.aspect === "te_iru" &&
    op.semantic?.renderStrategy === "negative_completion"
  );
  if (negativeCompletion) {
    return true;
  }
  return nextCategory === "reaction" && node.ops.some((op) =>
    op.kind === "postverbAuxiliary" &&
    op.source.tokens.some((token) => isSurfaceCarrierReactionReasonAuxiliary(token.dictionaryForm ?? null))
  );
}

function spanHasStatefulTeIruEvidence(
  span: CommitmentSpan,
  options: { readonly committedOnly?: boolean } = {}
): boolean {
  const plan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(plan) && tailChainHasStatefulTeIruAspect(plan)) {
    return true;
  }
  const translation = options.committedOnly === true
    ? selectedCommitmentCandidate(span)?.translation ?? null
    : selectedTranslation(span);
  return translation?.teIruResultative === true || translation?.teIruDropAux === true;
}

function renyouChuushiSourceIsZu(node: TailNode): boolean {
  if (node.kind === "connective") {
    return renyouChuushiSourceIsZu(node.inner) || renyouChuushiSourceIsZu(node.outer);
  }
  if (node.terminal !== "renyou_chuushi") {
    return false;
  }
  const source = node.terminalPayload?.kind === "renyouChuushi"
    ? node.terminalPayload.source
    : undefined;
  return (source?.tokens ?? []).some((token) => token.surface === "ず" || token.dictionaryForm === "ず");
}







function commitSpanWinnerEntry(span: CommitmentSpan): void {
  const oldEntry = span.entry;
  if (oldEntry === null || oldEntry.committed === true || oldEntry.senses === undefined) {
    return;
  }
  const newEntry = commitWinner(oldEntry);
  span.entry = newEntry;
  span.renderPlan = replaceEntryInRenderPlan(span.renderPlan ?? null, oldEntry, newEntry);

  const resolved = commitmentLaneCandidateSet(span.sourceCandidates);
  if (!isResolvedCandidateSet(resolved)) {
    return;
  }
  const selectedMember = resolved.winner;
  const selected = selectedMember.candidate;
  span.sourceCandidates = transformCandidateSet(resolved, {
    map: (member) => keepCandidate(member === selectedMember
      ? withStagedCandidatePayload(member, {
        ...selected,
        entry: selected.entry === oldEntry ? newEntry : selected.entry ?? null,
        renderPlan: replaceEntryInRenderPlan(selected.renderPlan ?? null, oldEntry, newEntry)
      })
      : member),
    failClosedReason: "all_members_dropped"
  });
}

function replaceEntryInRenderPlan(plan: RenderPlan | null, oldEntry: CommitmentEntry, newEntry: CommitmentEntry): RenderPlan | null {
  if (plan === null) {
    return null;
  }
  if (plan.kind === "lemma") {
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "reasonBecause") {
    if ("payload" in plan) {
      const payloadEntry = plan.payload.entry ?? null;
      return entryMatchesCommitSource(payloadEntry, oldEntry)
        ? { ...plan, payload: { ...plan.payload, entry: newEntry } }
        : plan;
    }
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "youdaModality") {
    if ("payload" in plan) {
      const payloadEntry = plan.payload.entry ?? null;
      return entryMatchesCommitSource(payloadEntry, oldEntry)
        ? { ...plan, payload: { ...plan.payload, entry: newEntry } }
        : plan;
    }
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (plan.kind === "nominalConnectiveScope") {
    const currentContent = "payload" in plan ? plan.payload.content : plan.content;
    const content = replaceEntryInRenderPlan(currentContent, oldEntry, newEntry);
    if (content === currentContent || content === null) {
      return plan;
    }
    return "payload" in plan
      ? { ...plan, payload: { ...plan.payload, content } }
      : { ...plan, content };
  }
  if (plan.kind === "nominalDemoAru") {
    const currentContent = "payload" in plan ? plan.payload.content : plan.content;
    const content = replaceEntryInRenderPlan(currentContent, oldEntry, newEntry);
    if (content === currentContent || content === null) {
      return plan;
    }
    return "payload" in plan
      ? { ...plan, payload: { ...plan.payload, content } }
      : { ...plan, content };
  }
  if (plan.kind === "copulaPredicate") {
    return entryMatchesCommitSource(plan.entry, oldEntry) ? { ...plan, entry: newEntry } : plan;
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return entryMatchesCommitSource(plan.realization.entry, oldEntry)
      ? { ...plan, realization: { ...plan.realization, entry: newEntry } }
      : plan;
  }
  if (plan.kind === "predicateScope" || plan.kind === "predicateNominalScope") {
    const base = replaceEntryInRenderPlan(plan.base, oldEntry, newEntry);
    return base === plan.base || base === null ? plan : { ...plan, base };
  }
  if (plan.kind === "attributive") {
    return plan;
  }
  if (plan.kind === "legacySurfaceComposition") {
    const prefix = typeof plan.prefix === "string" ? plan.prefix : replaceEntryInRenderPlan(plan.prefix ?? null, oldEntry, newEntry);
    const suffix = typeof plan.suffix === "string" ? plan.suffix : replaceEntryInRenderPlan(plan.suffix ?? null, oldEntry, newEntry);
    if (prefix === (plan.prefix ?? null) && suffix === (plan.suffix ?? null)) {
      return plan;
    }
    return {
      ...plan,
      ...(prefix === null ? {} : { prefix }),
      ...(suffix === null ? {} : { suffix })
    };
  }
  if (plan.kind === "noda" && typeof plan.prefix !== "string") {
    const prefix = replaceEntryInRenderPlan(plan.prefix ?? null, oldEntry, newEntry);
    return prefix === (plan.prefix ?? null) || prefix === null ? plan : { ...plan, prefix };
  }
  if (isWakePrefixPlan(plan)) {
    const currentPrefix = "prefix" in plan ? plan.prefix : plan.payload.prefix;
    if (typeof currentPrefix === "string") {
      return plan;
    }
    const prefix = replaceEntryInRenderPlan(currentPrefix ?? null, oldEntry, newEntry);
    if (prefix === (currentPrefix ?? null) || prefix === null) {
      return plan;
    }
    return ("prefix" in plan ? { ...plan, prefix } : { ...plan, payload: { ...plan.payload, prefix } }) as RenderPlan;
  }
  if (plan.kind === "giveRequest") {
    const base = replaceEntryInRenderPlan(plan.base, oldEntry, newEntry);
    return base === plan.base || base === null ? plan : { ...plan, base };
  }
  return plan;
}

function entryMatchesCommitSource(entry: MorphemeEntry | null | undefined, committedSource: CommitmentEntry): boolean {
  if (entry === committedSource) {
    return true;
  }
  if (entry === undefined || entry === null) {
    return false;
  }
  if (
    entry.dictionaryForm !== committedSource.dictionaryForm
    || entry.reading !== committedSource.reading
    || entry.conjugationType !== committedSource.conjugationType
    || entry.conjugationForm !== committedSource.conjugationForm
    || entry.pos !== committedSource.pos
  ) {
    return false;
  }
  const entrySenses = entry.senses ?? [];
  const sourceSenses = committedSource.senses ?? [];
  return sourceSenses.length > 0 && sourceSenses.every((sense) => entrySenses.includes(sense));
}

function contentSpans(contentMap: CommitmentContentMap): CommitmentSpan[] {
  return contentMap instanceof Map ? [...contentMap.values()] : Object.values(contentMap);
}

function resolveFinalContext(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null,
  lookups: LookupTables,
  numeric: NumericTables
): void {
  const entry = finalContextResolutionEntry(span);
  if (entry === null) {
    return;
  }
  if ((entry.senses ?? []).length <= 1) {
    syncIntrinsicHonorificFromCommittedSense(span, entry.senses?.[0]);
    return;
  }
  const resolved = resolveContextWithLayout(entry, runtimeTokens(tokens), idx, {
    layout,
    contentMap,
    grammar: spanGrammar(span),
    final: true,
    lookups,
    numeric,
    trace
  });
  span.entry = resolved;
  const winningTranslation = resolved.senses?.[0];
  syncIntrinsicHonorificFromCommittedSense(span, winningTranslation);
  const currentRenderPlan = span.renderPlan ?? null;
  if (currentRenderPlan !== null) {
    span.renderPlan = replaceEntryInRenderPlan(currentRenderPlan, entry, resolved);
  }
  const spanSet = span.sourceCandidates;
  const stagedSpan = spanSet !== null && spanSet !== undefined && spanSet.state === "unresolved";
  if (winningTranslation === undefined) {
    return;
  }
  if (stagedSpan && spanSet !== null && spanSet !== undefined) {
    const verdictMember = candidateSetMembers(spanSet).find(
      (member) => member.candidate.translation === winningTranslation
    );
    if (verdictMember !== undefined) {
      span.sourceCandidates = resolveSourceCandidateSet(spanSet, {
        kind: "final_commitment",
        layout,
        predicateTokenIdx: idx,
        verdict: verdictMember.identity
      });
    }
  }
  const stagedSpanNeedsRealization = stagedSpan && (span.renderPlan ?? null) === null;
  if (!stagedSpanNeedsRealization && !senseSelectionChanged(entry, resolved)) {
    return;
  }
  const renderPlan = span.renderPlan ?? null;
  if (renderPlan !== null) {
    const newPlan = replaceLemmaRenderPlan(renderPlan, {
      koreanLemma: winningTranslation.korean,
      irregular: winningTranslation.irregular ?? null,
      koreanPos: winningTranslation.koreanPos ?? null,
      dropFirstPassiveAux: winningTranslation.dropFirstPassiveAux ?? false,
      absorbedPassiveAux: winningTranslation.dropFirstPassiveAux ?? false,
      dropFirstCausativeAux: winningTranslation.dropFirstCausativeAux ?? false,
      dropFirstNegativeAux: winningTranslation.dropFirstNegativeAux ?? false
    });
    if (newPlan !== undefined) {
      span.renderPlan = newPlan;
    }
  }
  span.korean = winningTranslation.korean;
  span.koreanPos = winningTranslation.koreanPos ?? span.koreanPos;
  syncKeijoujiVerbPredicateFlag(span, tokens, idx);
  if (trace !== null) {
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "resolve_sense_frame",
      true,
      withTraceClauseIdx({
        selected: winningTranslation.korean,
        korean_pos: winningTranslation.koreanPos ?? null
      }, layout.clauseIndexOfToken(idx))
    ));
  }
}

function syncIntrinsicHonorificFromCommittedSense(
  span: CommitmentSpan,
  sense: CommitmentTranslation | undefined
): void {
  if (sense?.intrinsicHonorific === undefined) {
    delete span.intrinsicHonorific;
  } else {
    span.intrinsicHonorific = sense.intrinsicHonorific;
  }
}

function finalContextResolutionEntry(span: CommitmentSpan): CommitmentEntry | null {
  const entry = span.entry ?? null;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan) && tailChainStemHasResolvedSense(span.renderPlan)) {
    return entry;
  }
  if ((entry?.senses ?? []).length > 1) {
    return entry;
  }
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const compoundEntry = span.compoundHeadFrameEntry ?? null;
    return compoundEntry ?? entry;
  }
  return entry;
}

function tailChainStemHasResolvedSense(plan: PredicateHeadTailChainRenderPlan): boolean {
  const tail = plan.realization.root.tail;
  return tail.kind === "auxLayer" && tail.stem.commitment === "resolved_sense";
}

function senseSelectionChanged(oldEntry: CommitmentEntry, newEntry: CommitmentEntry): boolean {
  return (newEntry.senses ?? [])[0] !== (oldEntry.senses ?? [])[0];
}

function syncKeijoujiVerbPredicateFlag(span: CommitmentSpan, tokens: readonly CommitmentToken[], idx: number): void {
  const token = tokens[idx];
  span.isKeijoujiVerbPredicate = span.koreanPos === 동사 &&
    token !== undefined && isBareNaAdjSet(token) &&
    (isKeijoujiPreferenceObjectHead(token) || !keijoujiSuppressedAsStateChangeOrNominalComplement(span));
}

function isKeijoujiPreferenceObjectHead(token: CommitmentToken): boolean {
  const form = token.dictionaryForm ?? token.surface;
  return form === "好き" || form === "嫌い";
}

function keijoujiSuppressedAsStateChangeOrNominalComplement(span: CommitmentSpan): boolean {
  if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    return false;
  }
  const root = span.renderPlan.realization.root;
  return firstAuxLayer(root.tail)?.stem.kind === "noun" || tailRootHasStateChangeResultTail(root);
}

function commitSuffixLikeAttachments(tokens: readonly CommitmentToken[], contentMap: CommitmentContentMap): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    const selectedCandidate = selectedCommitmentCandidate(span);
    const candidateKorean = selectedCandidate?.korean;
    const selectedKorean = candidateKorean !== undefined && candidateKorean.length > 0
      ? candidateKorean
      : selectedCandidate?.entry?.senses?.[0]?.korean ?? span.entry?.senses?.[0]?.korean ?? null;
    const previous = tokens[idx - 1];
    if (
      idx > 0 &&
      tokens[idx]?.dictionaryForm === "通り" &&
      selectedKorean === "대로" &&
      previous !== undefined &&
      (previous.pos & POS0) === 名詞
    ) {
      span.attachLeft = true;
    }
  }
}

function commitAdverbialAdjunctRouting(
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan ?? null;
    const projection = adverbialProjectionForRouting(span, plan);
    if (projection === null) {
      continue;
    }
    const hasModifiedPredicate = layout.predicateOfAdverbialAdjunct(idx) !== undefined;
    const isStandaloneSentenceAdverb = !hasModifiedPredicate && projection.standaloneSentenceAdverb;
    const isAdverbialAdjunct = hasModifiedPredicate && projection.adverbialAdjunct;
    if (!isAdverbialAdjunct && !isStandaloneSentenceAdverb) {
      continue;
    }
    const korean = structuralAdverbialAdjunctKorean(
      projection.koreanLemma,
      projection.koreanPos,
      projection.irregular,
      projection.lexicalAdverbial
    );
    if (korean === null) {
      continue;
    }
    span.renderPlan = {
      kind: "lexicalParticleAdverbial",
      adverbialKind: isStandaloneSentenceAdverb
        ? "standalone_sentence_adverb"
        : "structural_adverbial_adjunct",
      particle: "に",
      korean,
      koreanPos: projection.koreanPos,
      sourceKorean: projection.koreanLemma
    };
    span.korean = korean;
    span.koreanPos = 부사;
  }
}

interface AdverbialProjectionRoutingInput {
  readonly koreanLemma: string;
  readonly koreanPos: number;
  readonly irregular: Parameters<typeof conjugate>[1];
  readonly lexicalAdverbial: string | null;
  readonly adverbialAdjunct: boolean;
  readonly standaloneSentenceAdverb: boolean;
}

function adverbialProjectionForRouting(
  span: CommitmentSpan,
  plan: RenderPlan | null
): AdverbialProjectionRoutingInput | null {
  if (plan === null) {
    return null;
  }
  if (plan.kind === "lemma") {
    if (!lemmaPlanIsCopulaNiAdverbial(plan)) {
      return null;
    }
    const hasTypedTerminalSfp = plan.terminalSfp != null;
    return {
      koreanLemma: plan.koreanLemma,
      koreanPos: plan.koreanPos,
      irregular: plan.irregular,
      lexicalAdverbial: metadataAdverbial(plan.entry, plan.koreanLemma),
      adverbialAdjunct: !hasTypedTerminalSfp,
      standaloneSentenceAdverb: hasTypedTerminalSfp
    };
  }
  if (
    !isPredicateHeadTailChainRenderPlan(plan) ||
    !tailRootIsStandaloneCopulaNiAdverbialFragment(plan.realization.root)
  ) {
    return null;
  }
  const selected = selectedCommitmentCandidate(span);
  const stem = firstAuxLayer(plan.realization.root.tail)?.stem;
  const typedNounLemma = plainNounStemAdverbialLemma(stem);
  const selectedHasDecoration =
    selected?.translation?.koreanPrefix !== undefined ||
    selected?.translation?.koreanSuffix !== undefined;
  if (selectedHasDecoration) {
    return null;
  }
  const typedNounStem = typedNounLemma === null
    ? null
    : {
        koreanLemma: typedNounLemma,
        koreanPos: 명사,
        irregular: null
      };
  const selectedLemma = selected?.koreanLemma ?? selected?.korean ?? null;
  const projection = selectedLemma !== null && selectedLemma.length > 0
    ? {
        koreanLemma: selectedLemma,
        koreanPos: selected?.koreanPos ?? span.koreanPos,
        irregular: selected?.irregular ?? selected?.translation?.irregular ?? null
      }
    : typedNounStem;
  if (projection === null || projection.koreanLemma.length === 0) {
    return null;
  }
  return {
    ...projection,
    lexicalAdverbial: selected?.translation?.adverbial ??
      metadataAdverbial(span.entry, projection.koreanLemma),
    adverbialAdjunct: false,
    standaloneSentenceAdverb: true
  };
}

function structuralAdverbialAdjunctKorean(
  koreanLemma: string,
  koreanPos: number,
  irregular: Parameters<typeof conjugate>[1],
  lexicalAdverbial: string | null
): string | null {
  if (koreanPos === 부사) {
    return koreanLemma;
  }
  if (lexicalAdverbial !== null && lexicalAdverbial.length > 0) {
    return lexicalAdverbial;
  }
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return conjugate(koreanLemma, irregular, "게");
  }
  if (koreanPos === 명사) {
    return koreanLemma + selectParticle(koreanLemma, "으로/로");
  }
  return null;
}


function teMarkerHostClosesNegativeCopulaBridge(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): boolean {
  const teIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  const hostIdx = teIdx > 0 ? teIdx - 1 : -1;
  return hostIdx >= 0 && isTeConnectiveToken(tokens[teIdx]) && teHostClosesNegativeCopulaBridge(tokens, hostIdx);
}

function commitTeConnectiveResolution(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null = null,
  lookups: LookupTables,
  options: {
    readonly allowResultChain?: boolean;
    readonly semanticFrameRuntimeCache?: SemanticFrameRuntimeCache;
    readonly numeric?: NumericTables;
  } = {}
): void {
  const predicateIndices = contentEntries(contentMap)
    .filter(([idx, span]) =>
      (
        spanMayBePredicateForCommitment(span) ||
        (layout.clauseOfPredicateIndex.has(idx) &&
          isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
          tailChainPredicationIsStative(span.renderPlan))
      ) &&
      layout.predicateOfAdverbialAdjunct(idx) === undefined
    )
    .map(([idx]) => idx);
  const nextPredicateCandidates = predicateIndices.filter((idx) => {
    const span = contentSpanAt(contentMap, idx);
    return span !== undefined && spanHasSourcePredicateEvidence(tokens, idx, span, layout);
  });

  for (const predIdx of predicateIndices) {
    if (layout.compoundTailOfPredicate(predIdx) !== undefined) {
      continue;
    }
    const span = contentSpanAt(contentMap, predIdx);
    if (span === undefined || !spanIsTeConnectiveFallback(tokens, predIdx, span)) {
      continue;
    }
    const mainVerb = span.entry?.dictionaryForm ?? tokens[predIdx]?.dictionaryForm ?? null;
    if (mainVerb === null || mainVerb.length === 0) {
      continue;
    }
    const mainPredicateKey = predicateLookupKey(tokens, predIdx, span, layout, lookups);
    const mainKeys = uniqueConnectiveKeys([mainPredicateKey, mainVerb]);
    const closure = layout.chuushiClosureAt(teConnectiveEndIndexForSpan(tokens, predIdx, span) + 1);
    if (closure?.right === "elliptic") {
      const currentConnective = extractConnective(span.renderPlan ?? null);
      span.teConnectiveClassificationState = classifyEllipticTeConnective({
        mainKeys,
        contrastiveParallel: ellipticTeClosureSetsContrastiveTopics(tokens, predIdx, closure.rightTopicIdx, layout, lookups),
        copulaNegationBridge: (isPredicateHeadTailChainRenderPlan(span.renderPlan)
          ? tailChainTeFormClosesNegativeCopulaBridge(span.renderPlan)
          : spanHasCopulaNegationTeBridge(tokens, predIdx, span)) ||
          teMarkerHostClosesNegativeCopulaBridge(tokens, predIdx, span),
        negativeNaide: isPredicateHeadTailChainRenderPlan(span.renderPlan) && tailChainTeFormIsNegativeNaide(span.renderPlan),
        unmarkedRole: unmarkedTeConnectiveRole(tokens, predIdx, span),
        renyouStateChangeCause: unmarkedTeConnectiveRole(tokens, predIdx, span) === "listing" &&
          renyouChuushiClosesStateChange(span, mainKeys, lookups),
        lookups
      });
      const ellipticRole = teClassificationSurfaceRole(span.teConnectiveClassificationState);
      applyConnectiveRoleToSpan(span, ellipticRole, lookups);
      if (trace !== null) {
        trace.record(new TraceEvent(
          predIdx,
          "commitment",
          "te_connective_resolution",
          true,
          withTraceClauseIdx({
            before: currentConnective,
            after: extractConnective(span.renderPlan ?? null),
            main: mainVerb,
            relation: span.teConnectiveClassificationState.committed?.relation ?? null,
            surface_role: ellipticRole,
            chuushi_closure: "elliptic"
          }, layout.clauseIndexOfPredicate(predIdx))
        ));
      }
      continue;
    }
    const nextIdx = nextPredicateIndex(nextPredicateCandidates, predIdx);
    const evaluationFollowerIdx = findTeEvaluationFollowerIndex(tokens, predIdx + span.consumed, tokens.length, lookups);
    if (nextIdx === null && evaluationFollowerIdx === undefined) {
      continue;
    }
    const nextSpan = nextIdx === null ? undefined : contentSpanAt(contentMap, nextIdx);
    if (nextIdx !== null && nextSpan === undefined) {
      continue;
    }
    const currentConnective = extractConnective(span.renderPlan ?? null);
    const nextPredicateDictForm = nextSpan?.entry?.dictionaryForm ??
      (evaluationFollowerIdx === undefined ? null : tokens[evaluationFollowerIdx]?.dictionaryForm ?? null);
    const nextKey = nextIdx === null || nextSpan === undefined
      ? nextPredicateDictForm
      : predicateLookupKey(tokens, nextIdx, nextSpan, layout, lookups);
    const nextCategory = evaluationFollowerIdx !== undefined
      ? "reaction"
      : classifyNextPredicateCategory(tokens, nextIdx ?? evaluationFollowerIdx ?? predIdx, nextPredicateDictForm, nextKey, lookups);
    const nextKeys = uniqueConnectiveKeys([nextKey, nextPredicateDictForm]);
    const nextMood = nextIdx === null || nextSpan === undefined
      ? new Set<string>()
      : nextPredicateMoodSignals(tokens, nextIdx, nextSpan);
    const precedingCategory = mainKeys
      .map((key) => tePrecedingCategory(key, lookups))
      .find((category): category is string => category !== null) ?? null;
    const isAdjectiveLike = spanIsAdjectiveLikeTeConnective(tokens, predIdx, span);
    let prefersAseo: boolean;
    let passiveReactionPrefersAseo = false;
    let benefactiveReactionPrefersAseo = false;
    let benefactiveResultPrefersAseo = false;
    let benefactiveRequestPrefersAseo = false;
    let completionReparationPrefersAseo = false;
    let movementPathPrefersAseo = false;
    let movementAcquisitionPrefersAseo = false;
    let surfaceCarrierReasonPrefersAseo = false;
    const tailChainPlan = isPredicateHeadTailChainRenderPlan(span.renderPlan) ? span.renderPlan : null;
    const teIruTeConnectiveContinuation = tailChainPlan !== null && tailChainHasTeIruTeFormContinuation(tailChainPlan);
    const teIruFollowingReaction =
      teIruTeConnectiveContinuation &&
      (
        nextCategory === "reaction" ||
        nextKeys.some((key) => lookups.TE_IRU_FOLLOWING_REACTION_PREDICATES.has(key))
      );
    const statefulTeIruReason = teIruTeConnectiveContinuation && spanHasStatefulTeIruEvidence(span, {
      committedOnly: options.allowResultChain !== true
    });
    const teIruProgressiveEvidence = teIruTeConnectiveContinuation && teIruResultChainHasProgressiveEvidence(mainKeys, lookups);
    const teIruResultChainSubjectCompatible =
      nextIdx === null ||
      nextSpan === undefined ||
      teIruProgressiveResultChainSubjectCompatible(tokens, predIdx, nextIdx, layout, lookups);
    const tailParserSemanticReason = tailChainPlan !== null &&
      (
        tailChainTeFormPrefersReason(tailChainPlan, nextCategory) ||
        (
          teIruFollowingReaction &&
          (statefulTeIruReason || !teIruProgressiveEvidence || !teIruResultChainSubjectCompatible)
        )
      );
    const teIruProgressiveReactionResultChain =
      tailChainPlan !== null &&
      teIruTeConnectiveContinuation &&
      teIruFollowingReaction &&
      options.allowResultChain === true &&
      !statefulTeIruReason &&
      teIruProgressiveEvidence &&
      teIruResultChainSubjectCompatible &&
      !renyouChuushiSourceIsZu(tailChainPlan.realization.root.tail) &&
      span.voice !== "passive" &&
      span.hasBenefactiveTail !== true &&
      !tailChainHasAnyAspect(tailChainPlan, BENEFACTIVE_REACTION_TE_ASPECTS);
    let committedSurfaceRole: TeConnectiveSurfaceRole;

    if (isAdjectiveLike) {
      prefersAseo = tailParserSemanticReason ||
        (unmarkedTeConnectiveRole(tokens, predIdx, span) === "listing" && renyouChuushiClosesStateChange(span, mainKeys, lookups) &&
          !(nextIdx !== null && teClausesSetContrastiveTopics(tokens, predIdx, nextIdx, layout, lookups))) ||
        (tailChainPlan !== null && tailChainHasExcessivePostverb(tailChainPlan)) ||
        adjectiveConnectivePrefersAseo({
        nextEntry: nextSpan?.entry ?? null,
        nextKoreanLemma: nextSpan === undefined ? null : extractPredicateKoreanLemma(nextSpan),
        nextPredicateDictForm,
        nextIsNegative: nextSpan?.hasNegative ?? false,
        nextIsPotential: nextSpan?.voice === "potential"
      }, lookups);
      const adjectiveListingEvidence = prefersAseo ? [] : classifyTeListingEvidence({
        mainKeys,
        contrastiveParallel: nextIdx !== null && teClausesSetContrastiveTopics(tokens, predIdx, nextIdx, layout, lookups)
          ? "explicit_topics_disjoint"
          : null,
        copulaNegationBridge: (tailChainPlan !== null
          ? tailChainTeFormClosesNegativeCopulaBridge(tailChainPlan)
          : spanHasCopulaNegationTeBridge(tokens, predIdx, span)) ||
          teMarkerHostClosesNegativeCopulaBridge(tokens, predIdx, span),
        repeatedClosureChain: teClosureRepeatsSameHostChain(predIdx, layout),
        negativeNaide: tailChainPlan !== null && tailChainTeFormIsNegativeNaide(tailChainPlan),
        lookups
      });
      span.teConnectiveClassificationState = committedTeClassificationState([
        ...(prefersAseo
          ? [[teHypothesis("adjective_reaction_reason", "cause", "reason", [
            teEvidence("next_predicate_category", nextPredicateDictForm ?? nextKey ?? "reaction")
          ])]]
          : []),
        ...(adjectiveListingEvidence.length > 0 ? [adjectiveListingEvidence] : []),
        [teHypothesis(
          `adjective_${unmarkedTeConnectiveRole(tokens, predIdx, span)}_default`,
          "sequential",
          unmarkedTeConnectiveRole(tokens, predIdx, span),
          []
        )]
      ]);
      const defaultRole: TeConnectiveSurfaceRole = teClassificationSurfaceRole(span.teConnectiveClassificationState);
      committedSurfaceRole = defaultRole;
      const currentSet = commitmentLaneCandidateSet(span.sourceCandidates);
      if (currentSet !== null && currentSet.members.length > 0) {
        const rewritten = transformCandidateSet(currentSet, {
          map: (member) => keepCandidate(withStagedCandidatePayload(member, {
            ...member.candidate,
            connectiveRole: member.candidate.koreanPos === 부사 ? "adverbial" : defaultRole
          })),
          failClosedReason: "all_members_dropped"
        });
        const resolved = rewritten;
        span.sourceCandidates = resolved;
        if (isResolvedCandidateSet(resolved)) {
          realizeCommittedCandidate(span, resolved);
        }
        syncSahenShortNegationAttachment(tokens, predIdx, span, lookups);
        span.connectiveRole = (isResolvedCandidateSet(resolved) ? resolved.winner.candidate.connectiveRole : null) ?? defaultRole;
        rewriteSpanConnectiveRole(span, defaultRole);
        const updatedConnective = extractConnective(span.renderPlan ?? null);
        if (trace !== null && updatedConnective !== currentConnective) {
          trace.record(new TraceEvent(
            predIdx,
            "commitment",
            "te_connective_resolution",
            true,
            withTraceClauseIdx({
              before: currentConnective,
              after: updatedConnective,
              main: mainVerb,
              next_predicate: nextKey
            }, layout.clauseIndexOfPredicate(predIdx))
          ));
        }
        continue;
      }
    } else {
      const structuralPrefersAseo = mainKeys.some((mainKey) =>
        teConnectivePrefersAseo(mainKey, nextKey, {
          nextPredicateCategory: nextCategory,
          nextPredicateDictForm,
          sourceNegated: span.hasNegative === true
        }, lookups)
      );
      const semanticFrameRuntimeMatch = options.semanticFrameRuntimeCache !== undefined && options.numeric !== undefined
        ? getSemanticFrameRuntimeMatch(options.semanticFrameRuntimeCache, tokens, predIdx, span, layout, contentMap, lookups, options.numeric)
        : null;
      const preference = selectedTeConnectivePreference(tokens, predIdx, span, {
        committedOnly: options.allowResultChain !== true,
        semanticFrameRuntimeMatch
      });
      passiveReactionPrefersAseo = span.voice === "passive" && nextCategory === "reaction";
      benefactiveReactionPrefersAseo = nextCategory === "reaction" && (
        span.hasBenefactiveTail === true ||
        (isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
          tailChainHasAnyAspect(span.renderPlan, BENEFACTIVE_REACTION_TE_ASPECTS))
      );
      const nextHasBenefactiveResultTail = spanHasFollowingBenefactiveResultTail(nextSpan);
      benefactiveResultPrefersAseo =
        nextHasBenefactiveResultTail &&
        precedingCategory === "involuntary_state" &&
        nextKeys.some((key) => lookups.TE_FOLLOWING_BENEFACTIVE_RESULT_PREDICATES.has(key));
      benefactiveRequestPrefersAseo =
        nextHasBenefactiveResultTail &&
        mainKeys.some((key) => lookups.TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS.has(key));
      completionReparationPrefersAseo =
        tailChainPlan !== null &&
        tailChainHasAnyAspect(tailChainPlan, TE_SHIMAU_COMPLETION_ASPECTS) &&
        nextKeys.some((key) => lookups.TE_SHIMAU_FOLLOWING_REPARATION_PREDICATES.has(key));
      movementPathPrefersAseo = nextCategory === "movement" && teMovementPathSourcePrefersAseo(tokens, predIdx, mainVerb, nextKey, nextPredicateDictForm, layout, lookups);
      movementAcquisitionPrefersAseo = teMovementAcquisitionPrefersAseo(mainVerb, nextCategory, lookups);
      const aruEvaluationPrefersAseo = mainVerb === "ある" && nextIdx !== null && teAruEvaluationPrefersAseo(tokens, predIdx, nextIdx, layout, lookups);
      surfaceCarrierReasonPrefersAseo = surfaceCarrierReactionPrefersAseo(span.renderPlan ?? null, nextCategory);
      const nakuteNegativeSource = spanHasNakuTeNegativeSource(tokens, predIdx, span);
      const nextTokenPos0 = nextIdx === null ? 0 : ((tokens[nextIdx]?.pos ?? 0) & POS0);
      const nextToken = nextIdx === null ? undefined : tokens[nextIdx];
      const nextIsAdjectiveLikePredicate = nextTokenPos0 === 形容詞0 || nextTokenPos0 === 形状詞 ||
        (nextToken !== undefined && isNaAdjCapable(nextToken));
      const sourcePotentialNegative =
        span.voice === "potential" ||
        (extractPredicateKoreanLemma(span)?.endsWith(" 수 있다") ?? false);
      const nakuteFollowerEvidence =
        nextCategory === "reaction" ||
        evaluationFollowerIdx !== undefined ||
        nextIsAdjectiveLikePredicate ||
        nextSpan?.hasNegative === true;
      const tokenAfterSpan = tokens[predIdx + span.consumed];
      const nakuteHaConditional = nakuteNegativeSource && (
        teConnectiveEndIndexForSpan(tokens, predIdx, span) !== predIdx + span.consumed - 1 ||
        (tokenAfterSpan !== undefined && (tokenAfterSpan.pos & POS01) === 助詞_係助詞 && tokenAfterSpan.surface === "は")
      );
      const negativeSourceCausePrefersAseo = nakuteNegativeSource && (nakuteHaConditional || sourcePotentialNegative || nakuteFollowerEvidence);
      const desiderativeSourceClause = layout.clauseOfPredicate(predIdx);
      const desiderativeFollowerClause = nextIdx === null ? undefined : layout.clauseOfPredicate(nextIdx);
      const desiderativeClauseConnects =
        desiderativeSourceClause?.terminatedBy === "connective" &&
        desiderativeFollowerClause !== undefined &&
        desiderativeFollowerClause.start === desiderativeSourceClause.end &&
        !isHardTerminalPunctuationToken(tokens[desiderativeFollowerClause.start]);
      const desiderativeSourceCausePrefersAseo =
        desiderativeClauseConnects &&
        spanHasDesiderativeTeSource(tokens, predIdx, span) &&
        (nextCategory === "movement" || nextCategory === "reaction");
      const excessiveDegreeCausePrefersAseo = tailChainPlan !== null && tailChainHasExcessivePostverb(tailChainPlan);
      const statefulInabilityPrefersAseo =
        (teIruTeConnectiveContinuation || span.voice === "passive") &&
        followerInabilityPrefersAseo({
          nextEntry: nextSpan?.entry ?? null,
          nextKoreanLemma: nextSpan === undefined ? null : extractPredicateKoreanLemma(nextSpan),
          nextIsNegative: nextSpan?.hasNegative ?? false,
          nextIsPotential: nextSpan?.voice === "potential"
        });
      span.teConnectiveClassificationState = classifyVerbTeConnective({
        mainVerb,
        mainPredicateKey,
        nextCategory,
        structuralPrefersAseo,
        preference,
        passiveReactionPrefersAseo,
        benefactiveReactionPrefersAseo,
        benefactiveResultPrefersAseo,
        benefactiveRequestPrefersAseo,
        completionReparationPrefersAseo,
        movementPathPrefersAseo,
        movementAcquisitionPrefersAseo,
        aruEvaluationPrefersAseo,
        surfaceCarrierReasonPrefersAseo,
        tailParserSemanticReason,
        teIruProgressiveReactionResultChain,
        nextMood,
        attendantCoactionEligible: teAttendantCoactionEligible(tokens, predIdx, nextIdx, nextSpan, nextCategory, layout, lookups),
        negativeSourceCausePrefersAseo,
        excessiveDegreeCausePrefersAseo,
        renyouStateChangeCause: unmarkedTeConnectiveRole(tokens, predIdx, span) === "listing" &&
          renyouChuushiClosesStateChange(span, mainKeys, lookups) &&
          !(nextIdx !== null && teClausesSetContrastiveTopics(tokens, predIdx, nextIdx, layout, lookups)),
        statefulInabilityPrefersAseo,
        desiderativeSourceCausePrefersAseo,
        teMarkerIsSourceBearing: spanTeConnectiveMarkerIsSourceBearing(tokens, predIdx, span),
        teMarkerAttachesToStem: tailChainPlan === null ||
          tailChainTeConnectiveAttachesToStem(tailChainPlan),
        unmarkedRole: unmarkedTeConnectiveRole(tokens, predIdx, span),
        contrastiveParallel: nextIdx !== null && teClausesSetContrastiveTopics(tokens, predIdx, nextIdx, layout, lookups),
        copulaNegationBridge: (tailChainPlan !== null
          ? tailChainTeFormClosesNegativeCopulaBridge(tailChainPlan)
          : spanHasCopulaNegationTeBridge(tokens, predIdx, span)) ||
          teMarkerHostClosesNegativeCopulaBridge(tokens, predIdx, span),
        repeatedClosureChain: teClosureRepeatsSameHostChain(predIdx, layout),
        negativeNaide: tailChainPlan !== null && tailChainTeFormIsNegativeNaide(tailChainPlan),
        lookups,
      });
      committedSurfaceRole = teClassificationSurfaceRole(span.teConnectiveClassificationState);
    }

    if (committedSurfaceRole !== "reason") {
      const semanticConnectiveRoleSource = span.renderPlan?.kind === "legacySurfaceComposition" &&
        span.renderPlan.connectiveRoleSource === "semantic";
      if ((committedSurfaceRole === "listing" || committedSurfaceRole === "linkage") && currentConnective === "아/어서" && (surfaceCarrierReasonPrefersAseo || semanticConnectiveRoleSource)) {
        span.connectiveRole = "reason";
        continue;
      }
      if (isAdjectiveLike) {
        span.connectiveRole = committedSurfaceRole;
      }
      if (currentConnective !== "고" || committedSurfaceRole !== "listing") {
        applyConnectiveRoleToSpan(span, committedSurfaceRole, lookups);
        if (trace !== null) {
          trace.record(new TraceEvent(
            predIdx,
            "commitment",
            "te_connective_resolution",
            true,
            withTraceClauseIdx({
              before: currentConnective,
              after: committedSurfaceRole === "adverbial"
                ? "게"
                : committedSurfaceRole === "manner"
                  ? "manner"
                  : committedSurfaceRole === "result_chain"
                    ? "다가"
                    : committedSurfaceRole === "linkage"
                      ? "아/어서"
                      : "고",
              main: mainVerb,
              next_predicate: nextKey,
              next_category: nextCategory,
              next_mood: [...nextMood].sort(),
              relation: span.teConnectiveClassificationState?.committed?.relation ?? null,
              surface_role: committedSurfaceRole
            }, layout.clauseIndexOfPredicate(predIdx))
          ));
        }
      }
      continue;
    }

    applyConnectiveRoleToSpan(span, "reason", lookups);
    if (trace !== null) {
      trace.record(new TraceEvent(
        predIdx,
        "commitment",
        "te_connective_resolution",
        true,
        withTraceClauseIdx({
          before: currentConnective ?? "",
          after: "아/어서",
          main: mainVerb,
          next_predicate: nextKey,
          next_category: nextCategory,
          next_mood: [...nextMood].sort(),
          passive_reaction: passiveReactionPrefersAseo,
          benefactive_result: benefactiveResultPrefersAseo,
          benefactive_request: benefactiveRequestPrefersAseo,
          completion_reparation: completionReparationPrefersAseo,
          movement_path_source: movementPathPrefersAseo,
          movement_acquisition: movementAcquisitionPrefersAseo,
          benefactive_reaction: benefactiveReactionPrefersAseo,
          relation: span.teConnectiveClassificationState?.committed?.relation ?? null,
          surface_role: committedSurfaceRole
        }, layout.clauseIndexOfPredicate(predIdx))
      ));
    }
  }
}

function syncLayoutConnectiveRoles(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  layout.connectiveRoles.clear();
  for (const [predIdx, span] of contentEntries(contentMap)) {
    let role = span.connectiveRole ?? null;
    if (role === null && spanIsTeConnectiveFallback(tokens, predIdx, span)) {
      role = isPredicateHeadTailChainRenderPlan(span.renderPlan)
        ? tailChainTeFormRole(span.renderPlan)
        : normalizeTeConnectivePreference(
          extractConnective(span.renderPlan ?? null),
          "translation_preference",
          "render plan connective fallback"
        )?.role ?? null;
    }
    if (role !== null) {
      layout.connectiveRoles.set(predIdx, role);
    }
  }
}




export function commitTeConnectiveBoundaryScanChoices(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  const resolveChoicePlan = (
    plan: RenderPlan | null | undefined,
    requestOwned: boolean
  ): RenderPlan | null => {
    const choice = extractTeConnectiveBoundaryChoice(plan);
    if (choice === null) {
      return null;
    }
    const current = extractConnective(plan);
    if (current !== choice.endingIfVerbal && current !== choice.endingIfRequest) {
      return null;
    }
    const target = requestOwned
      ? choice.endingIfRequest
      : teBoundaryFollowingPredicateExists(tokens, layout, choice.anchorIdx, choice.endExclusive)
        ? choice.endingIfVerbal
        : choice.endingIfRequest;
    if (target === current) {
      return null;
    }
    return replaceConnectiveRenderPlan(plan, { connective: target }) ?? null;
  };
  for (const [predIdx, span] of contentEntries(contentMap)) {
    let rewrote = false;
    const requestOwned = span.hasRequestTail === true ||
      candidateSetCandidates(commitmentLaneCandidateSet(span.sourceCandidates)).some((candidate) => candidate.hasRequestTail === true);
    const rewrittenPlan = resolveChoicePlan(span.renderPlan ?? null, requestOwned);
    if (rewrittenPlan !== null) {
      span.renderPlan = rewrittenPlan;
      span.korean = "";
      rewrote = true;
    }
    if (rewrote && trace !== null) {
      trace.record(new TraceEvent(
        predIdx,
        "commitment",
        "te_connective_boundary_scan",
        true,
        { connective: extractConnective(span.renderPlan ?? null) ?? "" }
      ));
    }
  }
}

function commitCompoundSerialConnectives(
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  for (const [, headIdx] of layout.compoundPredicatePairs) {
    const span = contentSpanAt(contentMap, headIdx);
    if (span === undefined) {
      continue;
    }
    const current = extractConnective(span.renderPlan ?? null);
    if (current === null) {
      continue;
    }
    const rewrittenPlan = replaceConnectiveRenderPlan(span.renderPlan ?? null, {
      connective: "아/어",
      teFormRole: "compound_serial"
    });
    if (rewrittenPlan !== undefined) {
      span.renderPlan = rewrittenPlan;
      span.korean = "";
    }
    if (trace !== null) {
      trace.record(new TraceEvent(
        headIdx,
        "commitment",
        "compound_serial_connective",
        rewrittenPlan !== undefined,
        rewrittenPlan !== undefined
          ? { connective: "아/어", previous: current }
          : { reason: "compound_serial_rewrite_failed", previous: current, plan_kind: span.renderPlan?.kind ?? "" }
      ));
    }
  }
}

function rewriteCandidateForConnectiveRole(candidate: CommitmentCandidate, connectiveRole: string): CommitmentCandidate {
  return { ...candidate, connectiveRole };
}

function applyConnectiveRoleToSpan(span: CommitmentSpan, connectiveRole: string, lookups: LookupTables): void {
  const set = commitmentLaneCandidateSet(span.sourceCandidates);
  if (set !== null && set.members.length > 0) {
    const rewritten = transformCandidateSet(set, {
      map: (member) => keepCandidate(withStagedCandidatePayload(
        member,
        rewriteCandidateForConnectiveRole(member.candidate, connectiveRole)
      )),
      failClosedReason: "all_members_dropped"
    });
    span.sourceCandidates = rewritten;
    if (isResolvedCandidateSet(rewritten)) {
      realizeCommittedCandidate(span, rewritten);
    }
  }
  rewriteSpanConnectiveRole(span, connectiveRole);
}

function rewriteSpanConnectiveRole(span: CommitmentSpan, connectiveRole: string): void {
  if (connectiveRole === "manner") {
    span.connectiveRole = connectiveRole;
    return;
  }
  const connective = connectiveRole === "reason" || connectiveRole === "linkage"
    ? "아/어서"
    : connectiveRole === "adverbial"
      ? "게"
      : connectiveRole === "result_chain"
        ? "__te_result_chain"
        : "고";
  const rewrittenPlan = replaceConnectiveRenderPlan(span.renderPlan ?? null, {
    connective,
    ...(connectiveRole === "linkage" ? { teFormRole: "linkage" as const } : {})
  });
  if (rewrittenPlan === undefined) {
    span.connectiveRole = connectiveRole;
    return;
  }
  span.renderPlan = rewrittenPlan;
  span.connectiveRole = connectiveRole;
  span.korean = "";
}

export const NIWA_INTENTIONAL_PURPOSE_CONNECTIVE = "predicate_projection_intentional_purpose";
export const NIWA_EVALUATION_EXTENT_CONNECTIVE = "predicate_projection_evaluation_extent";

function commitTteTopicExclamativeRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
      continue;
    }
    const tteIdx = idx + span.consumed - 1;
    const tte = tokens[tteIdx];
    if (tte === undefined || tte.surface !== "って" || (tte.pos & POS01) !== 助詞_副助詞) {
      continue;
    }
    if (!bareTteTopicExclamativeFollowerAhead(tokens, tteIdx + 1, lookups)) {
      continue;
    }
    applyTteTopicExclamativeToSpan(span, lookups);
  }
}

function predicateIsNounPhraseInternalAttributive(
  contentMap: CommitmentContentMap,
  predicateIdx: number
): boolean {
  const plan = contentSpanAt(contentMap, predicateIdx)?.renderPlan ?? null;
  if (plan === null || plan === undefined) {
    return false;
  }
  if (plan.kind === "attributive") {
    return true;
  }
  return isPredicateHeadTailChainRenderPlan(plan) &&
    plan.realization.root.tail.kind === "auxLayer" &&
    plan.realization.root.tail.terminal === "attributive";
}

function clauseIsPredicatelessAdjunct(
  clause: { readonly predicates: readonly number[] },
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap
): boolean {
  return clause.predicates.every((predicateIdx) =>
    isNiYotteAgentMarkerVerbToken(tokens[predicateIdx]) ||
    predicateIsNounPhraseInternalAttributive(contentMap, predicateIdx)
  );
}

function tosuruAgentPhraseEvidence(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap
): boolean {
  const assigned = argumentParticleIndicesForPredicateEvidence(predIdx, tokens, layout);
  const particleIndices: number[] = [...assigned];
  const clauseIdx = layout.clauseIndexOfToken(predIdx);
  if (clauseIdx < 0) {
    return particleIndices.length > 0 && hasNiYotteAgentMarker(tokens, particleIndices);
  }
  if (assigned.length === 0) {
    particleIndices.push(...(layout.clauses[clauseIdx]?.particleIndices ?? []));
  }
  for (let idx = clauseIdx - 1; idx >= 0; idx -= 1) {
    const preceding = layout.clauses[idx];
    if (preceding === undefined || !clauseIsPredicatelessAdjunct(preceding, tokens, contentMap)) {
      break;
    }
    particleIndices.push(...preceding.particleIndices);
  }
  return particleIndices.length > 0 && hasNiYotteAgentMarker(tokens, particleIndices);
}

function commitTosuruJudgmentPassiveRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan;
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      const rewritten = replaceTosuruPassiveWithJudgmentQuote(
        plan,
        () => tosuruAgentPhraseEvidence(tokens, idx, layout, contentMap)
      );
      if (rewritten === undefined) {
        continue;
      }
      span.renderPlan = rewritten;
      span.korean = "";
      continue;
    }
    if (!isNominalHeadTailChainRenderPlan(plan)) {
      continue;
    }
    let root = plan.realization.root;
    let changed = false;
    for (const host of predicateNominalProjectionHosts(root)) {
      const refined = tailRootWithTosuruPassiveJudgmentQuote(
        host.root,
        () => tosuruAgentPhraseEvidence(tokens, host.predicateTokenIdx, layout, contentMap)
      );
      if (refined === undefined) {
        continue;
      }
      root = nominalRootWithPredicateHostRoot(root, host, refined);
      changed = true;
    }
    if (changed) {
      span.renderPlan = { ...plan, realization: { ...plan.realization, root } };
      span.korean = "";
    }
  }
}

const BARE_TTE_CARRIER_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

function commitBareTteCarrierMidUtteranceRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
      continue;
    }
    const tteIdx = idx + span.consumed - 1;
    const tte = tokens[tteIdx];
    if (tte === undefined || tte.surface !== "って") {
      continue;
    }
    const closure = layout.utteranceClosureAfter(tokens, tteIdx + 1);
    if (closesUtteranceAs(closure, BARE_TTE_CARRIER_CLOSURES) || closure.closure !== "weak_pause") {
      continue;
    }
    const refined = replaceBareTteCarrierWithQuotativeConnective(span.renderPlan);
    if (refined !== undefined) {
      span.renderPlan = refined;
      span.korean = "";
    }
  }
}

function applyTteTopicExclamativeToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rewrittenSpan = replaceBareTteQuoteWithTopicExclamativeSfp(span.renderPlan);
    if (rewrittenSpan !== undefined) {
      span.renderPlan = rewrittenSpan;
      span.korean = "";
      changed = true;
    }
  }
  if (changed) {
  }
}

function commitNiwaEvaluationRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan) || !hasClauseRole(span.renderPlan) ||
      !tailChainHasConnectiveKind(span.renderPlan, NIWA_INTENTIONAL_PURPOSE_CONNECTIVE)) {
      continue;
    }
    const followingIdx = layout.nextPredicateInClauseAfter(idx);
    if (followingIdx === undefined || !followingPredicateIsEvaluationExtent(tokens, contentMap, followingIdx)) {
      continue;
    }
    applyNiwaEvaluationRefineToSpan(span, lookups);
  }
}

function followingPredicateIsEvaluationExtent(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  followingIdx: number
): boolean {
  const span = contentSpanAt(contentMap, followingIdx);
  const end = Math.min(followingIdx + (span?.consumed ?? 1), tokens.length);
  for (let i = followingIdx; i < end; i++) {
    const tok = tokens[i];
    if (tok === undefined) {
      continue;
    }
    const lemma = tok.dictionaryForm ?? tok.surface;
    if (!NIWA_EVALUATION_EXTENT_PREDICATES.has(lemma)) {
      continue;
    }
    const next = tokens[i + 1];
    if ((tok.pos & POS0) === 形容詞0 && next !== undefined && (next.pos & POS0) === 名詞) {
      continue;
    }
    return true;
  }
  return false;
}

function refineNiwaConnectivePlan(plan: RenderPlan | null | undefined): PredicateHeadTailChainRenderPlan | undefined {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return undefined;
  }
  return replaceTailChainProjectionConnective(
    plan,
    NIWA_INTENTIONAL_PURPOSE_CONNECTIVE,
    NIWA_EVALUATION_EXTENT_CONNECTIVE
  );
}

function applyNiwaEvaluationRefineToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  const rewrittenSpan = refineNiwaConnectivePlan(span.renderPlan);
  if (rewrittenSpan !== undefined) {
    span.renderPlan = rewrittenSpan;
    span.korean = "";
    changed = true;
  }
  if (changed) {
  }
}

const NONI_PURPOSE_EVALUATION_CONNECTIVE = "purpose_evaluation_nominalizer";
const NONI_ADVERSATIVE_CONNECTIVE = "adversative";

function commitNoNiCopulaAdversativeRefine(contentMap: CommitmentContentMap): void {
  for (const [, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan) || !hasClauseRole(plan)) {
      continue;
    }
    const boundary = plan.clauseRole.outgoingBoundary;
    if (
      boundary.kind === "terminal" ||
      boundary.connectiveKind !== NONI_PURPOSE_EVALUATION_CONNECTIVE ||
      boundary.adversativeReadingAvailable !== true
    ) {
      continue;
    }
    const hostPredication = tailChainCopulaHostPredicationForConnectiveKind(
      plan,
      NONI_PURPOSE_EVALUATION_CONNECTIVE
    );
    if (hostPredication === null) {
      continue;
    }
    if (hostPredication.copula.polarity !== "negative" && !hostPredication.past) {
      continue;
    }
    const rewritten = replaceTailChainProjectionConnective(
      plan,
      NONI_PURPOSE_EVALUATION_CONNECTIVE,
      NONI_ADVERSATIVE_CONNECTIVE
    );
    if (rewritten === undefined) {
      continue;
    }
    span.renderPlan = rewritten;
    span.korean = "";
  }
}

const SHI_CONNECTIVE_SURFACE = "し";
const SHI_REASON_RENDER_SURFACE = "__shi_reason";

function commitShiReasonRefine(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  lookups: LookupTables
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    if (!isPredicateHeadTailChainRenderPlan(span.renderPlan) ||
      !tailChainHasConnectiveSurface(span.renderPlan, SHI_CONNECTIVE_SURFACE)) {
      continue;
    }
    const clauseIdx = layout.clauseOfTokenIndex[idx];
    if (clauseIdx === undefined) {
      continue;
    }
    const followingClause = layout.clauses[clauseIdx + 1];
    if (followingClause === undefined) {
      continue;
    }
    const finalPredIdx = followingClause.predicates[followingClause.predicates.length - 1];
    if (finalPredIdx === undefined ||
      !predicateSpanCarriesDirectiveSpeechAct(tokens, contentMap, layout, finalPredIdx)) {
      continue;
    }
    applyShiReasonRefineToSpan(span, lookups);
  }
}

function predicateSpanCarriesDirectiveSpeechAct(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  predIdx: number
): boolean {
  if (layout.speechActScopeOfPredicate(predIdx) !== "matrix") {
    return false;
  }
  const span = contentSpanAt(contentMap, predIdx);
  const end = Math.min(predIdx + (span?.consumed ?? 1), tokens.length);
  for (let i = predIdx; i < end; i++) {
    const tok = tokens[i];
    if (tok === undefined) {
      continue;
    }
    const inflection = tok.pos & POS5A;
    let directive = false;
    if (inflection === 意志推量形_) {
      directive = (tok.pos & POS0) === 動詞 || (tok.dictionaryForm ?? tok.surface) === "ます";
    } else if (inflection === 命令形_ && (tok.pos & POS0) === 動詞) {
      directive = true;
    }
    if (directive) {
      return true;
    }
  }
  return false;
}

function refineShiReasonPlan(plan: RenderPlan | null | undefined): PredicateHeadTailChainRenderPlan | undefined {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return undefined;
  }
  return replaceTailChainConnectiveSurface(plan, SHI_CONNECTIVE_SURFACE, SHI_REASON_RENDER_SURFACE);
}

function applyShiReasonRefineToSpan(span: CommitmentSpan, lookups: LookupTables): void {
  let changed = false;
  const rewrittenSpan = refineShiReasonPlan(span.renderPlan);
  if (rewrittenSpan !== undefined) {
    span.renderPlan = rewrittenSpan;
    span.korean = "";
    changed = true;
  }
  if (changed) {
  }
}

function realizeCommittedCandidate(
  span: CommitmentSpan,
  set: ResolvedCandidateSet<CommitmentCandidate>,
  options: {
    readonly deriveRealization?: boolean;
    readonly realizationConstraint?: DeferredRealizationConstraint;
  } = {}
): void {
  const candidate = set.winner.candidate;
  span.entry = candidate.entry ?? span.entry;
  const intrinsicHonorific = candidate.intrinsicHonorific ?? candidate.translation?.intrinsicHonorific;
  if (intrinsicHonorific === undefined) {
    delete span.intrinsicHonorific;
  } else {
    span.intrinsicHonorific = intrinsicHonorific;
  }
  const candidateRenderPlanPolicy = candidate.renderPlanPolicy ?? "normal";
  span.renderPlanPolicy = candidateRenderPlanPolicy;
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rootDecision = span.renderPlan.realization.root.headEvidenceDecision;
    const committedSense = translationCandidateIdentity(commitmentCandidateView(candidate));
    if (rootDecision !== undefined) {
      const realizationConstraint = options.deriveRealization === true
        ? deferredCandidateRealizationConstraint(candidate, options.realizationConstraint)
        : options.realizationConstraint;
      span.renderPlan = predicatePlanWithCandidateSetCommitment(
        span.renderPlan,
        rootDecision,
        committedSense,
        realizationConstraint
      );
    } else {
      span.renderPlan = {
        ...span.renderPlan,
        realization: {
          ...span.renderPlan.realization,
          root: {
            ...span.renderPlan.realization.root,
            tail: tailNodeWithCommittedSenseOnly(span.renderPlan.realization.root.tail, committedSense)
          }
        }
      };
    }
  } else if (candidate.renderPlan !== undefined) {
    span.renderPlan = candidate.renderPlan === null
      ? null
      : spanLocalRenderPlanNode(preserveTailChainRenderPlanEnvelope(candidate.renderPlan, span.renderPlan ?? null));
  }
  if (candidate.entry !== undefined && isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    span.renderPlan = {
      ...span.renderPlan,
      realization: {
        ...span.renderPlan.realization,
        entry: candidate.entry
      }
    };
  }
  if (candidate.lexicalParticleAdverbial !== undefined && candidate.lexicalParticleAdverbial !== null) {
    span.consumed = candidate.lexicalParticleAdverbial.consumed;
    span.particleRole = candidate.lexicalParticleAdverbial.particleRole;
    span.renderPlan = spanLocalRenderPlanNode(candidate.lexicalParticleAdverbial.renderPlan);
  }
  span.korean = candidate.korean ?? "";
  span.koreanPos = candidate.koreanPos ?? span.koreanPos;
  if (candidate.voice !== undefined) {
    span.voice = candidate.voice;
  }
  if (candidate.nareruReadings !== undefined) {
    span.nareruReadings = candidate.nareruReadings;
  }
  if (candidate.rareruReadings !== undefined) {
    span.rareruReadings = candidate.rareruReadings;
  }
  if (candidate.dekiruReadings !== undefined) {
    span.dekiruReadings = candidate.dekiruReadings;
  }
  if (candidate.hasNegative !== undefined) {
    span.hasNegative = candidate.hasNegative;
  }
  if (candidate.hasRequestTail !== undefined) {
    span.hasRequestTail = candidate.hasRequestTail;
  }
  if (candidate.connectiveRole !== undefined) {
    span.connectiveRole = candidate.connectiveRole;
  }
  if (candidate.teConnectiveClassificationState !== undefined) {
    span.teConnectiveClassificationState = candidate.teConnectiveClassificationState;
  }
  span.benefactive = candidate.benefactive ?? span.benefactive ?? null;
  span.warnings = candidate.warnings ?? [];
}

function deferredCandidateRealizationConstraint(
  candidate: CommitmentCandidate,
  inherited: DeferredRealizationConstraint | undefined
): DeferredRealizationConstraint {
  const direct = candidate.koreanPos === 형용사
    ? ["direct_adjectival" as const]
    : candidate.koreanPos === 동사
      ? ["direct_verbal" as const]
      : candidate.koreanPos === 명사
        ? ["direct_nominal" as const]
        : candidate.koreanPos === 부사
          ? ["direct_adverbial" as const]
          : [];
  const inheritedOrder = inherited?.realizationOrder;
  const withDirectPreference = (
    fallback: readonly (readonly HeadProjectionKind[])[]
  ): readonly (readonly HeadProjectionKind[])[] => direct.length === 0
    ? fallback
    : [direct, ...fallback];
  if (candidate.koreanPos === 형용사 || candidate.koreanPos === 동사) {
    return {
      ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
      realizationOrder: withDirectPreference(inheritedOrder ?? [
        DIRECT_PREDICATE_PROJECTIONS,
        DERIVED_PREDICATE_PROJECTIONS,
        NOMINAL_PROJECTIONS,
        ADVERBIAL_PROJECTIONS
      ])
    };
  }
  if (candidate.koreanPos === 명사) {
    return {
      ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
      realizationOrder: withDirectPreference(inheritedOrder ?? [
        ...NOMINAL_EXPECTED_REALIZATION_ORDER,
        DIRECT_PREDICATE_PROJECTIONS,
        DERIVED_PREDICATE_PROJECTIONS,
        ADVERBIAL_PROJECTIONS
      ])
    };
  }
  return {
    ...(inherited?.accepts === undefined ? {} : { accepts: inherited.accepts }),
    realizationOrder: withDirectPreference(inheritedOrder ?? [
      ADVERBIAL_PROJECTIONS,
      NOMINAL_PROJECTIONS,
      DIRECT_PREDICATE_PROJECTIONS,
      DERIVED_PREDICATE_PROJECTIONS
    ])
  };
}

function tailNodeWithCommittedSenseOnly(
  node: TailNode,
  committedSense: ReturnType<typeof translationCandidateIdentity>
): TailNode {
  if (node.kind === "connective") {
    return {
      ...node,
      inner: tailNodeWithCommittedSenseOnly(node.inner, committedSense) as typeof node.inner,
      outer: tailNodeWithCommittedSenseOnly(node.outer, committedSense)
    };
  }
  const derivationalBase = node.stem.derivationalBase;
  const stem = derivationalBase === undefined
    ? node.stem
    : {
      ...node.stem,
      derivationalBase: {
        ...derivationalBase,
        host: {
          ...derivationalBase.host,
          tail: tailNodeWithCommittedSenseOnly(derivationalBase.host.tail, committedSense)
        }
      }
    };
  return stem.kind === "candidateSet" && stem.candidates.some((candidate) =>
    stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
  )
    ? { ...node, stem: { ...stem, committedSense } }
    : stem === node.stem ? node : { ...node, stem };
}

function syncSahenShortNegationAttachment(
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  lookups: LookupTables
): void {
  const candidate = selectedCommitmentCandidate(span);
  const plan = span.renderPlan;
  const layer = isPredicateHeadTailChainRenderPlan(plan) ? firstAuxLayer(plan.realization.root.tail) : null;
  const committedShortNegation = candidate !== undefined && layer !== null &&
    committedStemPrefersShortNegation(
      layer.ops,
      candidate.koreanLemma ?? candidate.korean ?? "",
      candidate.shortNegationPolicy,
      lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS
    );
  if (
    isSahenBoundVerbAfterSahenCommitment(tokens, idx) &&
    (renderPlanStartsWithShortNegation(plan ?? null) || committedShortNegation)
  ) {
    span.attachLeft = false;
  }
}

function isSahenBoundVerbAfterSahenCommitment(tokens: readonly CommitmentToken[], idx: number): boolean {
  if (idx <= 0) {
    return false;
  }
  const token = tokens[idx];
  if (
    token === undefined || (token.pos & POS01) !== 動詞_非自立可能 || token.dictionaryForm !== "する" && token.dictionaryForm !== "できる" && token.dictionaryForm !== "出来る"
  ) {
    return false;
  }
  const previous = tokens[idx - 1];
  return previous !== undefined && isSahenCapableNominal(previous);
}
