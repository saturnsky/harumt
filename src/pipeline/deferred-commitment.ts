
import type { RenderPlan, PredicateHeadTailChainRenderPlan } from "../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../types/render-plan.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import type { ClauseLayout } from "./clause-layout/final-layout.js";
import { POS0, isNaAdjCapable, 形状詞, 形容詞0, 助詞_係助詞, 名詞, 부사, POS01 } from "../types/pos.js";
import type { LookupTables } from "./lookup-tables.js";
import { extractTeConnectiveBoundaryChoice, replaceConnectiveRenderPlan } from "./rendering/render-plan-rewrite.js";
import { isHardTerminalPunctuationToken } from "./head-tail/boundary/punctuation.js";
import { teHostClosesNegativeCopulaBridge } from "./clause-layout/speech-act.js";
import { isTeConnectiveToken } from "./head-tail/tail/postverb-tail-classifier.js";
import { tailChainTeConnectiveAttachesToStem, tailChainTeFormRole, tailChainTeFormClosesNegativeCopulaBridge, tailChainTeFormIsNegativeNaide, tailChainPredicationIsStative } from "./head-tail/lifecycle/rewrite.js";
import { candidateSetCandidates, candidateSetSize, commitmentLaneCandidateSet, isResolvedCandidateSet, keepCandidate, transformCandidateSet, withStagedCandidatePayload } from "./source-candidate-set.js";
import { TokenCursor } from "./token-cursor.js";
import { TraceEvent, type TraceCollector } from "./trace.js";
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
import type { TailNode } from "./head-tail/tail/predicate-root/grammar.js";

import { BENEFACTIVE_REACTION_TE_ASPECTS, TE_SHIMAU_COMPLETION_ASPECTS, type CommitmentCandidate, type CommitmentContentMap, type CommitmentSpan, type CommitmentToken } from "./commitment/types.js";
import { contentEntries, contentSpanAt, selectedCommitmentCandidate, tailChainHasAnyAspect, tailChainHasExcessivePostverb, withTraceClauseIdx } from "./commitment/span-evidence.js";
import { argumentParticleIndicesForPredicate, refineRareruReadingFromClosedHonorificEvidence, refineRareruReadingFromIntrinsicHonorificMetadata, refineRareruReadingFromCommittedParticleRoles, refineRareruReadingFromSelectedFrame, resolveDekiruReading, resolveRareruReading, type DeferredRareruObjectState } from "./commitment/voice-reading-resolution.js";
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
import { applySlotRealizationEffects, getSemanticFrameRuntimeMatch, materializeSelectedFrameThemeTopic, recordSemanticFrameShadow, recordSlotRealizationEffects, semanticRoleCaseParticleAssignments, semanticFrameRuntimeMatch, semanticSlotRealizationEffects, slotRealizationParticleAssignments, type SemanticFrameRuntimeCache } from "./commitment/semantic-frame.js";
import { commitParticleRoles, particleIndicesForCommitment } from "./commitment/particle-roles.js";
import { buildSourcePredicateOperatorEvidenceGraph } from "./structural-relation/source-predicate-operator.js";
import type { StructuralRelationGraph } from "./structural-relation/types.js";
import { commitTranslationCandidates, commitCandidateSetWithoutBridge, commitNestedPredicateNominalHost } from "./commitment/stem-candidate-selection.js";
import { realizeCommittedCandidate, syncSahenShortNegationAttachment } from "./commitment/candidate-projection.js";
import { commitOwnerCandidateSelection } from "./commitment/head-owner-candidate-selection.js";
import { hydrateBenefactiveCommitmentSpans } from "./commitment/benefactive-span-hydration.js";
import { commitNumeralRendering, commitExtentPostposition, clearRelocatedExtentPostpositionSource } from "./commitment/quantity-span-commitment.js";
import { commitSpanWinnerEntry, resolveFinalContext, syncKeijoujiVerbPredicateFlag } from "./commitment/final-sense-sync.js";
import { commitAdverbialAdjunctRouting } from "./commitment/adverbial-adjunct-routing.js";
import { commitNiwaEvaluationRefine, commitNoNiCopulaAdversativeRefine, commitShiReasonRefine } from "./commitment/connective-refinement.js";
import { commitTteTopicExclamativeRefine, commitTosuruJudgmentPassiveRefine, commitBareTteCarrierMidUtteranceRefine } from "./commitment/quote-refinement.js";

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

function contentSpans(contentMap: CommitmentContentMap): CommitmentSpan[] {
  return contentMap instanceof Map ? [...contentMap.values()] : Object.values(contentMap);
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

  const run: TeConnectiveResolutionRun = { tokens, contentMap, layout, trace, lookups, options, nextPredicateCandidates };
  for (const predIdx of predicateIndices) {
    const host = teConnectiveHostAt(run, predIdx);
    if (host === null) {
      continue;
    }
    if (commitEllipticTeConnectiveClosure(run, host)) {
      continue;
    }
    const step = teConnectiveFollowerStep(run, host);
    if (step === null) {
      continue;
    }
    const state: TeConnectiveAseoEvidenceState = {
      passiveReactionPrefersAseo: false,
      benefactiveReactionPrefersAseo: false,
      benefactiveResultPrefersAseo: false,
      benefactiveRequestPrefersAseo: false,
      completionReparationPrefersAseo: false,
      movementPathPrefersAseo: false,
      movementAcquisitionPrefersAseo: false,
      surfaceCarrierReasonPrefersAseo: false
    };
    let committedSurfaceRole: TeConnectiveSurfaceRole;

    if (step.isAdjectiveLike) {
      const adjectiveRole = classifyAdjectiveTeConnectiveRole(run, host, step);
      if (adjectiveRole === TE_CONNECTIVE_SETTLED) {
        continue;
      }
      committedSurfaceRole = adjectiveRole;
    } else {
      committedSurfaceRole = classifyVerbTeConnectiveRole(run, host, step, state);
    }

    if (committedSurfaceRole !== "reason") {
      applyNonReasonTeConnectiveRole(run, host, step, state, committedSurfaceRole);
      continue;
    }

    applyReasonTeConnectiveRole(run, host, step, state, committedSurfaceRole);
  }
}

interface TeConnectiveResolutionRun {
  readonly tokens: readonly CommitmentToken[];
  readonly contentMap: CommitmentContentMap;
  readonly layout: ClauseLayout;
  readonly trace: TraceCollector | null;
  readonly lookups: LookupTables;
  readonly options: NonNullable<Parameters<typeof commitTeConnectiveResolution>[5]>;
  readonly nextPredicateCandidates: readonly number[];
}

type TeConnectiveHost = NonNullable<ReturnType<typeof teConnectiveHostAt>>;
type TeConnectiveFollowerStep = NonNullable<ReturnType<typeof teConnectiveFollowerStep>>;

interface TeConnectiveAseoEvidenceState {
  passiveReactionPrefersAseo: boolean;
  benefactiveReactionPrefersAseo: boolean;
  benefactiveResultPrefersAseo: boolean;
  benefactiveRequestPrefersAseo: boolean;
  completionReparationPrefersAseo: boolean;
  movementPathPrefersAseo: boolean;
  movementAcquisitionPrefersAseo: boolean;
  surfaceCarrierReasonPrefersAseo: boolean;
}

const TE_CONNECTIVE_SETTLED: unique symbol = Symbol("te connective: settled by candidate rewrite");

function teConnectiveHostAt(run: TeConnectiveResolutionRun, predIdx: number) {
  const { tokens, contentMap, layout, lookups } = run;
  if (layout.compoundTailOfPredicate(predIdx) !== undefined) {
    return null;
  }
  const span = contentSpanAt(contentMap, predIdx);
  if (span === undefined || !spanIsTeConnectiveFallback(tokens, predIdx, span)) {
    return null;
  }
  const mainVerb = span.entry?.dictionaryForm ?? tokens[predIdx]?.dictionaryForm ?? null;
  if (mainVerb === null || mainVerb.length === 0) {
    return null;
  }
  const mainPredicateKey = predicateLookupKey(tokens, predIdx, span, layout, lookups);
  const mainKeys = uniqueConnectiveKeys([mainPredicateKey, mainVerb]);
  return { predIdx, span, mainVerb, mainPredicateKey, mainKeys };
}

function commitEllipticTeConnectiveClosure(run: TeConnectiveResolutionRun, host: TeConnectiveHost): boolean {
  const { tokens, layout, trace, lookups } = run;
  const { predIdx, span, mainVerb, mainKeys } = host;
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
    return true;
  }
  return false;
}

function teConnectiveFollowerStep(run: TeConnectiveResolutionRun, host: TeConnectiveHost) {
  const { tokens, contentMap, layout, lookups, options, nextPredicateCandidates } = run;
  const { predIdx, span, mainKeys } = host;
  const nextIdx = nextPredicateIndex(nextPredicateCandidates, predIdx);
  const evaluationFollowerIdx = findTeEvaluationFollowerIndex(tokens, predIdx + span.consumed, tokens.length, lookups);
  if (nextIdx === null && evaluationFollowerIdx === undefined) {
    return null;
  }
  const nextSpan = nextIdx === null ? undefined : contentSpanAt(contentMap, nextIdx);
  if (nextIdx !== null && nextSpan === undefined) {
    return null;
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
  return {
    nextIdx,
    evaluationFollowerIdx,
    nextSpan,
    currentConnective,
    nextPredicateDictForm,
    nextKey,
    nextCategory,
    nextKeys,
    nextMood,
    precedingCategory,
    isAdjectiveLike,
    tailChainPlan,
    teIruTeConnectiveContinuation,
    teIruFollowingReaction,
    statefulTeIruReason,
    teIruProgressiveEvidence,
    teIruResultChainSubjectCompatible,
    tailParserSemanticReason,
    teIruProgressiveReactionResultChain
  };
}

function classifyAdjectiveTeConnectiveRole(
  run: TeConnectiveResolutionRun,
  host: TeConnectiveHost,
  step: TeConnectiveFollowerStep
): TeConnectiveSurfaceRole | typeof TE_CONNECTIVE_SETTLED {
  const { tokens, layout, trace, lookups } = run;
  const { predIdx, span, mainVerb, mainKeys } = host;
  const { nextIdx, nextSpan, currentConnective, nextPredicateDictForm, nextKey, tailChainPlan, tailParserSemanticReason } = step;
  let prefersAseo: boolean;
  let committedSurfaceRole: TeConnectiveSurfaceRole;
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
    return TE_CONNECTIVE_SETTLED;
  }
  return committedSurfaceRole;
}

function classifyVerbTeConnectiveRole(
  run: TeConnectiveResolutionRun,
  host: TeConnectiveHost,
  step: TeConnectiveFollowerStep,
  state: TeConnectiveAseoEvidenceState
): TeConnectiveSurfaceRole {
  const { tokens, contentMap, layout, lookups, options } = run;
  const { predIdx, span, mainVerb, mainPredicateKey, mainKeys } = host;
  const { nextIdx, evaluationFollowerIdx, nextSpan, nextPredicateDictForm, nextKey, nextCategory, nextKeys, nextMood, precedingCategory, tailChainPlan, teIruTeConnectiveContinuation, tailParserSemanticReason, teIruProgressiveReactionResultChain } = step;
  let committedSurfaceRole: TeConnectiveSurfaceRole;
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
  state.passiveReactionPrefersAseo = span.voice === "passive" && nextCategory === "reaction";
  state.benefactiveReactionPrefersAseo = nextCategory === "reaction" && (
    span.hasBenefactiveTail === true ||
    (isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
      tailChainHasAnyAspect(span.renderPlan, BENEFACTIVE_REACTION_TE_ASPECTS))
  );
  const nextHasBenefactiveResultTail = spanHasFollowingBenefactiveResultTail(nextSpan);
  state.benefactiveResultPrefersAseo =
    nextHasBenefactiveResultTail &&
    precedingCategory === "involuntary_state" &&
    nextKeys.some((key) => lookups.TE_FOLLOWING_BENEFACTIVE_RESULT_PREDICATES.has(key));
  state.benefactiveRequestPrefersAseo =
    nextHasBenefactiveResultTail &&
    mainKeys.some((key) => lookups.TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS.has(key));
  state.completionReparationPrefersAseo =
    tailChainPlan !== null &&
    tailChainHasAnyAspect(tailChainPlan, TE_SHIMAU_COMPLETION_ASPECTS) &&
    nextKeys.some((key) => lookups.TE_SHIMAU_FOLLOWING_REPARATION_PREDICATES.has(key));
  state.movementPathPrefersAseo = nextCategory === "movement" && teMovementPathSourcePrefersAseo(tokens, predIdx, mainVerb, nextKey, nextPredicateDictForm, layout, lookups);
  state.movementAcquisitionPrefersAseo = teMovementAcquisitionPrefersAseo(mainVerb, nextCategory, lookups);
  const aruEvaluationPrefersAseo = mainVerb === "ある" && nextIdx !== null && teAruEvaluationPrefersAseo(tokens, predIdx, nextIdx, layout, lookups);
  state.surfaceCarrierReasonPrefersAseo = surfaceCarrierReactionPrefersAseo(span.renderPlan ?? null, nextCategory);
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
    passiveReactionPrefersAseo: state.passiveReactionPrefersAseo,
    benefactiveReactionPrefersAseo: state.benefactiveReactionPrefersAseo,
    benefactiveResultPrefersAseo: state.benefactiveResultPrefersAseo,
    benefactiveRequestPrefersAseo: state.benefactiveRequestPrefersAseo,
    completionReparationPrefersAseo: state.completionReparationPrefersAseo,
    movementPathPrefersAseo: state.movementPathPrefersAseo,
    movementAcquisitionPrefersAseo: state.movementAcquisitionPrefersAseo,
    aruEvaluationPrefersAseo,
    surfaceCarrierReasonPrefersAseo: state.surfaceCarrierReasonPrefersAseo,
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
  return committedSurfaceRole;
}

function applyNonReasonTeConnectiveRole(
  run: TeConnectiveResolutionRun,
  host: TeConnectiveHost,
  step: TeConnectiveFollowerStep,
  state: TeConnectiveAseoEvidenceState,
  committedSurfaceRole: TeConnectiveSurfaceRole
): void {
  const { layout, trace, lookups } = run;
  const { predIdx, span, mainVerb } = host;
  const { currentConnective, nextKey, nextCategory, nextMood, isAdjectiveLike } = step;
  const semanticConnectiveRoleSource = span.renderPlan?.kind === "legacySurfaceComposition" &&
    span.renderPlan.connectiveRoleSource === "semantic";
  if ((committedSurfaceRole === "listing" || committedSurfaceRole === "linkage") && currentConnective === "아/어서" && (state.surfaceCarrierReasonPrefersAseo || semanticConnectiveRoleSource)) {
    span.connectiveRole = "reason";
    return;
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
}

function applyReasonTeConnectiveRole(
  run: TeConnectiveResolutionRun,
  host: TeConnectiveHost,
  step: TeConnectiveFollowerStep,
  state: TeConnectiveAseoEvidenceState,
  committedSurfaceRole: TeConnectiveSurfaceRole
): void {
  const { layout, trace, lookups } = run;
  const { predIdx, span, mainVerb } = host;
  const { currentConnective, nextKey, nextCategory, nextMood } = step;
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
        passive_reaction: state.passiveReactionPrefersAseo,
        benefactive_result: state.benefactiveResultPrefersAseo,
        benefactive_request: state.benefactiveRequestPrefersAseo,
        completion_reparation: state.completionReparationPrefersAseo,
        movement_path_source: state.movementPathPrefersAseo,
        movement_acquisition: state.movementAcquisitionPrefersAseo,
        benefactive_reaction: state.benefactiveReactionPrefersAseo,
        relation: span.teConnectiveClassificationState?.committed?.relation ?? null,
        surface_role: committedSurfaceRole
      }, layout.clauseIndexOfPredicate(predIdx))
    ));
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
