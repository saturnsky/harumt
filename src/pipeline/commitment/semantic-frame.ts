
import type { MorphemeSense } from "../../types/dictionary.js";
import type { ParticleAssignment } from "../../types/pipeline.js";
import type { PlanTextSource, RenderPlan, PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { legacySurfaceCompositionPlan, isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { type ClauseLayout } from "../clause-layout/index.js";
import type { LookupTables } from "../lookup-tables.js";
import { evaluateFrameSourceConditionWithLayout } from "../context.js";
import { spanGrammar } from "../candidate-runtime.js";
import { buildFrameArgumentView, evaluateClauseConditions, SLOT_TYPE_NOUN, FrameEvidenceInput, frameEvidenceSelectionTraceDetail, frameMatchTraceDetail, frameSkipTraceDetail, frameSpecFromDict, namedLookupResolver, selectFrameEvidenceCandidate, selectFrameMatch, UnknownLookupSet, type ArgumentFiller, type ConditionEvidenceEvaluator, type FrameJsonMap, type FrameSpec } from "../semantics/frame.js";
import { projectionTokenMatches } from "../head-tail/candidate/selector.js";
import { roleCaseShadowTraceDetail } from "./role-case-shadow.js";
import { semanticRoleCaseAssignments, type RoleCaseTranslation } from "./role-case.js";
import { TraceEvent, type TraceCollector } from "../trace.js";
import type { AuxLayerNode, TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import { COMMITMENT_SOURCE_SLOT_REALIZATION, SLOT_REALIZATION_PREFIX_MOVE_AUXILIARIES, type CommitmentCandidate, type CommitmentContentMap, type CommitmentSpan, type CommitmentToken, type CommitmentTranslation, type ParticleCommitmentContext, type SemanticFrameRuntimeMatch, type SlotRealizationSpec } from "./types.js";
import { candidateFrameConditionEvaluator, candidateFrameSourceGroups, candidateFrameSourceTranslations, candidatePriorityGroup, candidatePriorityInGroup, candidateSenseIndex, candidateSpanGrammar, casePreferenceFromValue, contentEntries, contentSpanAt, evaluateParticipantCondition, frameGroupsUseSourceArgumentViewForVoice, grammarVoiceForFrame, isCasePreferenceRecord, isFrameJsonMapForCommitment, predicateGrammarForClause, runtimeTokens, selectedCommitmentCandidate, semanticFrameIntMetadata, semanticFrameOptionalIntMetadata, traceDetail, roleCaseRolesTraceLike, translationFrameDataAlternatives, withTraceClauseIdx } from "./span-evidence.js";
import { candidateSetMembers, commitmentLaneCandidateSet } from "../source-candidate-set.js";

export function semanticFrameSlotForParticle(ctx: ParticleCommitmentContext): { readonly role: string; readonly filler: ArgumentFiller } | null {
  const match = ctx.semanticFrameRuntimeMatch?.match ?? null;
  if (match === null) {
    return null;
  }
  for (const [role, filler] of Object.entries(match.slots)) {
    if (filler.borrowed) {
      continue;
    }
    if (filler.particleIdx === ctx.particleIdx) {
      return { role, filler };
    }
  }
  return null;
}

export interface OwnedSelectedFrameSlotFill {
  readonly particleIdx: number;
  readonly role: string;
  readonly frameId: string;
  readonly translationIdx: number;
  readonly senseIndex: number | null;
  readonly priorityGroup: number;
  readonly priorityInGroup: number;
}

export function ownedSelectedFrameSlotFills(
  tokens: readonly CommitmentToken[],
  predicateIdx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): readonly OwnedSelectedFrameSlotFill[] {
  const span = contentSpanAt(contentMap, predicateIdx);
  if (span === undefined) {
    return [];
  }
  const runtimeMatch = semanticFrameRuntimeMatch(tokens, predicateIdx, span, layout, contentMap, lookups, numeric);
  const match = runtimeMatch?.match ?? null;
  if (
    runtimeMatch === null ||
    runtimeMatch.skipReason !== undefined && runtimeMatch.skipReason !== null ||
    runtimeMatch.frame.defaultFrame ||
    match === null ||
    match.predicateIdx !== predicateIdx
  ) {
    return [];
  }
  const fills: OwnedSelectedFrameSlotFill[] = [];
  for (const [role, filler] of Object.entries(match.slots)) {
    if (
      filler.borrowed ||
      filler.slotType !== SLOT_TYPE_NOUN ||
      filler.nominalHead !== true ||
      filler.coordination !== null ||
      layout.ownerPredicateOfParticle(filler.particleIdx) !== predicateIdx
    ) {
      continue;
    }
    fills.push({
      particleIdx: filler.particleIdx,
      role,
      frameId: match.frameId,
      translationIdx: match.translationIdx,
      senseIndex: match.senseIndex,
      priorityGroup: match.priorityGroup,
      priorityInGroup: match.priorityInGroup
    });
  }
  return fills;
}

export function materializeSelectedFrameThemeTopic(
  runtimeMatch: SemanticFrameRuntimeMatch | null,
  predicateIdx: number,
  layout: ClauseLayout
): boolean {
  if (
    runtimeMatch === null ||
    runtimeMatch.skipReason !== undefined && runtimeMatch.skipReason !== null ||
    runtimeMatch.frame.defaultFrame ||
    runtimeMatch.match === null ||
    runtimeMatch.match.predicateIdx !== predicateIdx
  ) {
    return false;
  }
  const objectSlot = runtimeMatch.frame.slots.find((slot) =>
    slot.role === "object" && slot.particles.includes("は")
  );
  const filler = runtimeMatch.match.slots.object;
  if (
    objectSlot === undefined ||
    filler === undefined ||
    filler.borrowed ||
    filler.surfaceParticle !== "は" ||
    filler.frameParticle !== "は"
  ) {
    return false;
  }
  return layout.materializeSelectedFrameThemeTopic(predicateIdx, filler.particleIdx);
}

export function selectedSemanticFrameGaSlotAssignment(ctx: ParticleCommitmentContext): ParticleAssignment | undefined {
  const slot = semanticFrameSlotForParticle(ctx);
  if (slot === null) {
    return undefined;
  }
  if (slot.role === "experiencer" || slot.role === "holder" || slot.role === "subject") {
    return {
      role: slot.role,
      allomorphKey: "이/가",
      commitmentSource: "semantic_frame_slot"
    };
  }
  if (slot.role === "target" || slot.role === "theme") {
    return {
      role: slot.role,
      allomorphKey: "을/를",
      commitmentSource: "semantic_frame_slot"
    };
  }
  return undefined;
}

export type SemanticFrameRuntimeCache = Map<number, SemanticFrameRuntimeMatch | null>;

type SemanticFrameRuntimeResolver = (
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout
) => SemanticFrameRuntimeMatch | null;

export type SemanticFrameRuntimeMatchHook = (
  next: SemanticFrameRuntimeResolver,
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout
) => SemanticFrameRuntimeMatch | null;

let semanticFrameRuntimeMatchHook: SemanticFrameRuntimeMatchHook | null = null;

export function withSemanticFrameRuntimeMatchHookForTest<T>(hook: SemanticFrameRuntimeMatchHook, callback: () => T): T {
  const previous = semanticFrameRuntimeMatchHook;
  semanticFrameRuntimeMatchHook = hook;
  try {
    return callback();
  } finally {
    semanticFrameRuntimeMatchHook = previous;
  }
}

export interface SlotRealizationEffect {
  readonly frameId: string;
  readonly role: string;
  readonly filler: ArgumentFiller;
  readonly koreanOverride: string | null;
  readonly caseOverride: string | null;
}

export function semanticRoleCaseParticleAssignments(
  cache: SemanticFrameRuntimeCache,
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): ReadonlyMap<number, ParticleAssignment> {
  const runtimeMatch = getSemanticFrameRuntimeMatch(cache, tokens, idx, span, layout, contentMap, lookups, numeric);
  if (
    runtimeMatch === null ||
    runtimeMatch.skipReason !== undefined && runtimeMatch.skipReason !== null ||
    runtimeMatch.match === null ||
    runtimeMatch.frame.defaultFrame
  ) {
    return new Map();
  }
  const roleAssignments = semanticRoleCaseAssignments({
    frame: frameSpecForRoleCase(runtimeMatch.frame),
    match: runtimeMatch.match,
    translation: translationForRoleCase(runtimeMatch.translation)
  });
  return new Map(
    [...roleAssignments.entries()].map(([particleIdx, assignment]) => [
      particleIdx,
      {
        role: assignment.role,
        korean: assignment.korean,
        allomorphKey: assignment.allomorphKey,
        commitmentSource: assignment.commitmentSource
      } satisfies ParticleAssignment
    ])
  );
}

export function semanticSlotRealizationEffects(
  cache: SemanticFrameRuntimeCache,
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): readonly SlotRealizationEffect[] {
  const runtimeMatch = getSemanticFrameRuntimeMatch(cache, tokens, idx, span, layout, contentMap, lookups, numeric);
  if (
    runtimeMatch === null ||
    runtimeMatch.skipReason !== undefined && runtimeMatch.skipReason !== null ||
    runtimeMatch.match === null ||
    runtimeMatch.frame.defaultFrame
  ) {
    return [];
  }
  const slotRealization = slotRealizationForTranslation(runtimeMatch.translation);
  if (slotRealization === null) {
    return [];
  }
  const effects: SlotRealizationEffect[] = [];
  for (const [role, spec] of Object.entries(slotRealization)) {
    if (!isSlotRealizationSpec(spec)) {
      continue;
    }
    const filler = runtimeMatch.match.slots[role];
    if (filler === undefined) {
      continue;
    }
    if (filler.surfaceParticle !== filler.frameParticle) {
      continue;
    }
    effects.push({
      frameId: runtimeMatch.frame.frameId,
      role,
      filler,
      koreanOverride: typeof spec.korean === "string" ? spec.korean : null,
      caseOverride: typeof spec.case === "string" ? spec.case : null
    });
  }
  return effects;
}

function isSlotRealizationSpec(value: SlotRealizationSpec | null | undefined): value is SlotRealizationSpec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function applySlotRealizationEffects(
  contentMap: CommitmentContentMap,
  predIdx: number,
  effects: readonly SlotRealizationEffect[]
): void {
  const predicateSpan = contentSpanAt(contentMap, predIdx);
  for (const effect of effects) {
    if (effect.koreanOverride === null) {
      continue;
    }
    const span = contentSpanAt(contentMap, effect.filler.headIdx);
    if (span === undefined) {
      continue;
    }
    if (
      effect.koreanOverride.length > 0 &&
      effect.caseOverride === "" &&
      isPredicateHeadTailChainRenderPlan(predicateSpan?.renderPlan)
    ) {
      const rewritten = rewriteTailChainStemPrefix(
        predicateSpan.renderPlan,
        predicatePrefixFromSlotRealization(effect.koreanOverride)
      );
      if (rewritten !== undefined) {
        predicateSpan.renderPlan = rewritten;
        predicateSpan.korean = "";
        span.korean = "";
        span.renderPlan = null;
        continue;
      }
    }
    let prefix: string | null = null;
    let prefixSource: PlanTextSource | null = null;
    const movablePrefix = predicateSpan === undefined
      ? null
      : movableSlotRealizationPrefix(predicateSpan.renderPlan ?? null);
    if (
      effect.koreanOverride.length > 0 &&
      effect.caseOverride === "" &&
      predicateSpan !== undefined &&
      movablePrefix !== null
    ) {
      prefix = movablePrefix.prefix;
      prefixSource = movablePrefix.prefixSource;
      predicateSpan.renderPlan = clearPlanPrefix(predicateSpan.renderPlan ?? null);
      predicateSpan.korean = "";
    }
    span.korean = `${prefix ?? ""}${effect.koreanOverride}`;
    span.renderPlan = effect.koreanOverride.length > 0
      ? legacySurfaceCompositionPlan("semantic_frame", {
        korean: effect.koreanOverride,
        koreanPos: span.koreanPos,
        ...(prefix === null ? {} : { prefix }),
        ...(prefixSource === null ? {} : { prefixSource })
      })
      : null;
  }
}

function predicatePrefixFromSlotRealization(korean: string): string {
  return /\s$/u.test(korean) ? korean : `${korean} `;
}

function rewriteTailChainStemPrefix(plan: PredicateHeadTailChainRenderPlan, prefix: string): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodeStemPrefix(plan.realization.root.tail, prefix);
  if (!rewritten.changed) {
    return undefined;
  }
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: rewritten.node
      }
    }
  };
}

function rewriteTailNodeStemPrefix(node: TailNode, prefix: string): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteTailNodeStemPrefix(node.inner, prefix);
    if (!inner.changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        inner: inner.node as AuxLayerNode
      },
      changed: true
    };
  }
  const stem = node.stem;
  return {
    node: {
      ...node,
      stem: {
        ...stem,
        koreanPrefix: `${prefix}${stem.koreanPrefix ?? ""}`
      }
    },
    changed: true
  };
}

function movableSlotRealizationPrefix(plan: RenderPlan | null): { readonly prefix: string; readonly prefixSource: PlanTextSource | null } | null {
  if (plan === null) {
    return null;
  }
  if (
    plan.kind === "legacySurfaceComposition" &&
    plan.prefixCarrierAuxiliaryLemma !== undefined &&
    plan.prefixCarrierAuxiliaryLemma !== null &&
    SLOT_REALIZATION_PREFIX_MOVE_AUXILIARIES.has(plan.prefixCarrierAuxiliaryLemma) &&
    typeof plan.prefix === "string" &&
    plan.prefix.length > 0
  ) {
    return { prefix: plan.prefix, prefixSource: plan.prefixSource ?? null };
  }
  return null;
}

function clearPlanPrefix(plan: RenderPlan | null): RenderPlan | null {
  if (plan?.kind === "legacySurfaceComposition") {
    return {
      ...plan,
      prefix: null,
      prefixSource: null
    };
  }
  return plan;
}

export function slotRealizationParticleAssignments(effects: readonly SlotRealizationEffect[]): ReadonlyMap<number, ParticleAssignment> {
  const assignments = new Map<number, ParticleAssignment>();
  for (const effect of effects) {
    if (effect.caseOverride === null) {
      continue;
    }
    const preference = casePreferenceFromValue(effect.caseOverride);
    if (preference === undefined) {
      continue;
    }
    assignments.set(effect.filler.particleIdx, {
      role: effect.role,
      korean: preference.korean ?? null,
      allomorphKey: preference.allomorphKey ?? null,
      commitmentSource: COMMITMENT_SOURCE_SLOT_REALIZATION
    });
  }
  return assignments;
}

export function slotRealizationParticleCanBeCommitted(
  effect: SlotRealizationEffect,
  predIdx: number,
  layout: ClauseLayout
): boolean {
  const particleIdx = effect.filler.particleIdx;
  if (layout.ownerPredicateOfParticle(particleIdx) === predIdx) {
    return true;
  }
  if (particleIdx >= predIdx || !layout.sameClause(particleIdx, predIdx)) {
    return false;
  }
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return false;
  }
  return !clause.predicates.some((predicateIdx) =>
    predicateIdx !== predIdx &&
    particleIdx < predicateIdx &&
    predicateIdx < predIdx
  );
}

export function recordSlotRealizationEffects(
  trace: TraceCollector,
  tokens: readonly CommitmentToken[],
  predIdx: number,
  effects: readonly SlotRealizationEffect[],
  layout: ClauseLayout
): void {
  const clauseIdx = layout.clauseIndexOfToken(predIdx);
  for (const effect of effects) {
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "slot_realization_applied",
      true,
      withTraceClauseIdx({
        frame_id: effect.frameId,
        role: effect.role,
        source_token_index: effect.filler.headIdx,
        source_surface: tokens[effect.filler.headIdx]?.surface ?? "",
        source_particle_index: effect.filler.particleIdx,
        source_particle: tokens[effect.filler.particleIdx]?.surface ?? "",
        korean_override: effect.koreanOverride,
        case_override: effect.caseOverride
      }, clauseIdx)
    ));
  }
}

export function getSemanticFrameRuntimeMatch(
  cache: SemanticFrameRuntimeCache,
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): SemanticFrameRuntimeMatch | null {
  if (!cache.has(idx)) {
    cache.set(idx, semanticFrameRuntimeMatchHook === null
      ? semanticFrameRuntimeMatch(tokens, idx, span, layout, contentMap, lookups, numeric)
      : semanticFrameRuntimeMatchHook(
        (hookTokens, hookIdx, hookSpan, hookLayout) =>
          semanticFrameRuntimeMatch(hookTokens, hookIdx, hookSpan, hookLayout, contentMap, lookups, numeric),
        tokens,
        idx,
        span,
        layout
      ));
  }
  return cache.get(idx) ?? null;
}

export function recordSemanticFrameShadow(
  cache: SemanticFrameRuntimeCache,
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector,
  lookups: LookupTables,
  numeric: NumericTables
): void {
  const runtimeMatch = getSemanticFrameRuntimeMatch(cache, tokens, idx, span, layout, contentMap, lookups, numeric);
  if (runtimeMatch === null) {
    return;
  }
  if (runtimeMatch.skipReason !== undefined && runtimeMatch.skipReason !== null) {
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "semantic_frame_shadow",
      false,
      withTraceClauseIdx(traceDetail(frameSkipTraceDetail({
        frameId: runtimeMatch.frame.frameId,
        reason: runtimeMatch.skipReason,
        priorityGroup: runtimeMatch.priorityGroup,
        priorityInGroup: runtimeMatch.priorityInGroup,
        senseIndex: runtimeMatch.senseIndex,
        translationIdx: runtimeMatch.translationIdx
      })), layout.clauseIndexOfToken(idx))
    ));
    return;
  }

  const match = runtimeMatch.match;
  if (match !== null) {
    const clauseIdx = layout.clauseIndexOfToken(idx);
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "semantic_frame_shadow",
      true,
      withTraceClauseIdx(traceDetail(frameMatchTraceDetail(match)), clauseIdx)
    ));
    if (!runtimeMatch.frame.defaultFrame) {
      const detail = roleCaseShadowTraceDetail({
        lemma: tokens[idx]?.dictionaryForm ?? "",
        frame: frameSpecForRoleCase(runtimeMatch.frame),
        match,
        translation: translationForRoleCase(runtimeMatch.translation),
        clauseIdx
      });
      if (detail !== null) {
        trace.record(new TraceEvent(idx, "commitment", "role_case_shadow", true, traceDetail({
          frame_id: detail.frameId,
          translation_idx: detail.translationIdx,
          priority_group: detail.priorityGroup,
          priority_in_group: detail.priorityInGroup,
          roles: roleCaseRolesTraceLike(detail.roles),
          ...(detail.senseIndex === undefined ? {} : { sense_index: detail.senseIndex }),
          ...(detail.clauseIdx === undefined ? {} : { clause_idx: detail.clauseIdx })
        })));
      }
    }
    return;
  }

  const reason = runtimeMatch.evaluations?.[0]?.rejectedReason ?? "no_match";
  trace.record(new TraceEvent(
    idx,
    "commitment",
    "semantic_frame_shadow",
    false,
    withTraceClauseIdx(traceDetail(frameSkipTraceDetail({
      frameId: runtimeMatch.frame.frameId,
      reason,
      priorityGroup: runtimeMatch.priorityGroup,
      priorityInGroup: runtimeMatch.priorityInGroup,
      senseIndex: runtimeMatch.senseIndex,
      translationIdx: runtimeMatch.translationIdx
    })), layout.clauseIndexOfToken(idx))
  ));
}

export function semanticFrameRuntimeMatch(
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly voiceOverride?: "active" | "passive" | "potential" | null } = {}
): SemanticFrameRuntimeMatch | null {
  const selected = selectedTranslationForSemanticFrame(span);
  if (selected === null) {
    return null;
  }
  const [translation, translationIdx] = selected;
  const frameDatas = translationFrameDataAlternatives(translation).filter((frameData): frameData is FrameJsonMap => frameData !== null);
  if (frameDatas.length === 0) {
    return null;
  }
  const priorityGroup = semanticFrameIntMetadata(translation, "priorityGroup", 0);
  const priorityInGroup = semanticFrameIntMetadata(translation, "priorityInGroup", 0);
  const senseIndex = semanticFrameOptionalIntMetadata(translation, "senseIndex");
  const frames = frameDatas.map(frameSpecFromDict);
  const argumentVoice = options.voiceOverride !== undefined
    ? options.voiceOverride
    : frameGroupsUseSourceArgumentViewForVoice([frameDatas], span.voice ?? null)
      ? "active"
      : span.voice ?? null;
  const argumentView = buildFrameArgumentView(tokens as readonly RuntimeHaruToken[], idx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: argumentVoice
  });
  const hasPositionSlot = frames.some((frame) => frame.slots.some((slot) => slot.particlePosition !== null));
  const hasNonSlotConditions = frames.some((frame) =>
    (frame.chainConditions !== null && Object.keys(frame.chainConditions).length > 0) ||
    (frame.lexicalConditions !== null && Object.keys(frame.lexicalConditions).length > 0) ||
    (frame.clauseConditions !== null && Object.keys(frame.clauseConditions).length > 0) ||
    frame.connectiveRole.length > 0
  );
  if (!argumentView.voiceSupported && !hasPositionSlot && !hasNonSlotConditions) {
    return {
      translation,
      translationIdx,
      frame: frames[0]!,
      priorityGroup,
      priorityInGroup,
      senseIndex,
      match: null,
      skipReason: argumentView.unsupportedReason ?? "voice_unsupported"
    };
  }
  try {
    const [match, evaluations] = selectFrameMatch(frames, argumentView, {
      candidate: {
        index: 0,
        translationIdx,
        korean: semanticFrameCandidateKoreanLabel(translation, span),
        priorityGroup,
        priorityInGroup,
        senseIndex,
        frameData: frameDatas[0]!
      },
      predicateIdx: idx,
      translationIdx,
      priorityGroup,
      priorityInGroup,
      senseIndex,
      lookupResolver: (name) => namedLookupResolver(name, lookups),
      conditionEvaluator: semanticFrameConditionEvaluator(tokens, idx, span, layout, contentMap, lookups, numeric)
    });
    const selectedFrameData = frameDatas.find((frameData) => match !== null && (frameData.id ?? frameData.frameId) === match.frameId) ?? frameDatas[0]!;
    return {
      translation,
      translationIdx,
      frame: frameSpecFromDict(selectedFrameData),
      priorityGroup,
      priorityInGroup,
      senseIndex,
      match,
      evaluations
    };
  } catch (error) {
    if (!(error instanceof UnknownLookupSet)) {
      throw error;
    }
    return {
      translation,
      translationIdx,
      frame: frames[0]!,
      priorityGroup,
      priorityInGroup,
      senseIndex,
      match: null,
      evaluations: [],
      skipReason: error instanceof Error ? `unknown_lookup:${error.message}` : "unknown_lookup"
    };
  }
}

function selectedTranslationForSemanticFrame(span: CommitmentSpan): readonly [CommitmentTranslation, number] | null {
  const members = candidateSetMembers(commitmentLaneCandidateSet(span.sourceCandidates));
  if (members.length > 0) {
    const selected = selectedCommitmentCandidate(span);
    const translation = selected?.translation;
    if (translation !== undefined) {
      const selectedIdx = Math.max(0, members.findIndex((member) => member.candidate === selected));
      return [translation, selectedIdx];
    }
  }
  const entry = span.entry ?? span.compoundHeadFrameEntry ?? null;
  const translation = entry?.senses?.[0];
  return translation === undefined ? null : [translation, 0];
}

export function candidateHasFrameSourceConditions(candidate: CommitmentCandidate): boolean {
  return candidateFrameSourceGroups(candidate).length > 0;
}

export function frameNeedsFinalClauseLayoutForCommitment(frameData: FrameJsonMap): boolean {
  return "clauseConditions" in frameData || "participantConditions" in frameData;
}

function candidateHasNonSlotFrameSourceConditions(candidate: CommitmentCandidate): boolean {
  return candidateFrameSourceTranslations(candidate).some((translation) =>
    translationFrameDataAlternatives(translation).some((frameData) => {
      if (!isFrameJsonMapForCommitment(frameData)) {
        return false;
      }
      return ["chainConditions", "lexicalConditions", "clauseConditions", "participantConditions", "connectiveRole"]
        .some((key) => key in frameData);
    })
  );
}

export function candidateSkippedSlotHasRawEvidence(
  candidate: CommitmentCandidate,
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const frameGroups = candidateFrameSourceGroups(candidate);
  if (frameGroups.length === 0) {
    return false;
  }
  const allFrames = frameGroups.flatMap((frameDatas) => frameDatas.map(frameSpecFromDict));
  if (!allFrames.some((frame) => frame.slots.length > 0)) {
    return candidateHasNonSlotFrameSourceConditions(candidate);
  }
  const rawArgumentView = buildFrameArgumentView(runtimeTokens(tokens), idx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: "active"
  });
  try {
    for (const frameDatas of frameGroups) {
      const frames = frameDatas.map(frameSpecFromDict);
      const [match] = selectFrameMatch(frames, rawArgumentView, {
        candidate: new FrameEvidenceInput(
          0,
          candidate.priority ?? 0,
          candidate.koreanLemma ?? "",
          candidatePriorityGroup(candidate),
          candidatePriorityInGroup(candidate),
          candidateSenseIndex(candidate),
          frameDatas[0]
        ),
        predicateIdx: idx,
        translationIdx: candidate.priority ?? 0,
        priorityGroup: candidatePriorityGroup(candidate),
        priorityInGroup: candidatePriorityInGroup(candidate),
        senseIndex: candidateSenseIndex(candidate),
        lookupResolver: (name) => namedLookupResolver(name, lookups),
        conditionEvaluator: candidateFrameConditionEvaluator([candidate], span, tokens, idx, layout, contentMap, lookups, numeric)
      });
      if (match === null) {
        return false;
      }
    }
    return true;
  } catch (error) {
    if (error instanceof UnknownLookupSet) {
      return false;
    }
    throw error;
  }
}

export function selectCandidateByFrameEvidence(
  candidates: readonly CommitmentCandidate[],
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null = null,
  lookups: LookupTables,
  numeric: NumericTables
): number | null {
  const frameInputs = candidates.flatMap((candidate, candidateIdx) => frameEvidenceInputsFromCandidate(candidateIdx, candidate));
  if (frameInputs.length <= 1) {
    return null;
  }
  const firstCandidate = candidates[0];
  const grammar = firstCandidate === undefined ? spanGrammar(span) : candidateSpanGrammar(firstCandidate, span);
  const argumentView = buildFrameArgumentView(runtimeTokens(tokens), idx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: grammarVoiceForFrame(grammar)
  });
  const selection = selectFrameEvidenceCandidate(frameInputs, argumentView, {
    predicateIdx: idx,
    lookupResolver: (name) => namedLookupResolver(name, lookups),
    conditionEvaluator: candidateFrameConditionEvaluator(candidates, span, tokens, idx, layout, contentMap, lookups, numeric)
  });
  if (selection === null) {
    return null;
  }
  if (trace !== null) {
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "frame_evidence_selection",
      true,
      frameEvidenceSelectionTraceDetail(selection, { clauseIdx: layout.clauseIndexOfToken(idx) })
    ));
  }
  return selection.selected.candidate.index;
}

export function selectCandidateByNominalFrameEvidence(
  candidates: readonly CommitmentCandidate[],
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null = null,
  lookups: LookupTables
): number | null {
  if (candidates.length <= 1) {
    return null;
  }
  const predicateToken = runtimeTokens(tokens)[idx];
  if (predicateToken === undefined) {
    return null;
  }
  const candidateIndexes = new Set<number>();
  const reasons = new Set<string>();
  const clauseIdx = layout.clauseIndexOfToken(idx);
  for (const [sourceIdx, sourceSpan] of contentEntries(contentMap)) {
    if (sourceIdx >= idx || layout.clauseIndexOfToken(sourceIdx) !== clauseIdx) {
      continue;
    }
    const plan = sourceSpan.renderPlan;
    if (!isNominalHeadTailChainRenderPlan(plan) || plan.realization.owner.kind !== "phrase_owner") {
      continue;
    }
    const preference = plan.realization.frame.predicatePreference;
    if (preference?.kind !== "stem_candidate") {
      continue;
    }
    if (preference.predicate !== undefined && !projectionTokenMatches(predicateToken, preference.predicate, lookups)) {
      continue;
    }
    for (const [candidateIdx, candidate] of candidates.entries()) {
      const lemma = candidate.koreanLemma ?? candidate.korean ?? "";
      if (preference.candidateKorean.includes(lemma)) {
        candidateIndexes.add(candidateIdx);
        if (preference.reason !== undefined) {
          reasons.add(preference.reason);
        }
      }
    }
  }
  if (candidateIndexes.size !== 1) {
    return null;
  }
  const selectedIdx = [...candidateIndexes][0]!;
  if (trace !== null) {
    trace.record(new TraceEvent(
      idx,
      "commitment",
      "nominal_frame_evidence_selection",
      true,
      withTraceClauseIdx({
        selected: candidates[selectedIdx]?.koreanLemma ?? candidates[selectedIdx]?.korean ?? "",
        reasons: [...reasons].join(",")
      }, clauseIdx)
    ));
  }
  return selectedIdx;
}

function frameEvidenceInputsFromCandidate(index: number, candidate: CommitmentCandidate): readonly FrameEvidenceInput[] {
  const frameDatas = primaryCandidateFrameSourceGroup(candidate);
  const effectiveFrameDatas = frameDatas.length === 0 ? [null] : frameDatas;
  return effectiveFrameDatas.map((frameData) => new FrameEvidenceInput(
    index,
    candidate.priority ?? 0,
    candidate.koreanLemma ?? "",
    candidatePriorityGroup(candidate),
    candidatePriorityInGroup(candidate),
    candidateSenseIndex(candidate),
    isFrameJsonMapForCommitment(frameData) ? frameData : null
  ));
}

function primaryCandidateFrameSourceGroup(candidate: CommitmentCandidate): readonly FrameJsonMap[] {
  const translation = candidate.translation;
  if (translation === undefined) {
    return [];
  }
  return translationFrameDataAlternatives(translation)
    .filter((frameData): frameData is FrameJsonMap => frameData !== null);
}

function semanticFrameCandidateKoreanLabel(translation: CommitmentTranslation, span: CommitmentSpan): string {
  return translation.korean || span.korean || "";
}

function semanticFrameConditionEvaluator(
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): ConditionEvidenceEvaluator {
  return (_candidateInput, kind, conditions) => {
    if (kind === "clause") {
      const result = evaluateClauseConditions(
        tokens as readonly RuntimeHaruToken[],
        idx,
        layout,
        (predicateIdx) => predicateGrammarForClause(contentMap, predicateIdx, idx, span),
        conditions
      );
      return result.matched
        ? { matched: true, rejectedReason: null }
        : { matched: false, rejectedReason: `${kind}_${result.rejectedReason ?? "mismatch"}` };
    }
    if (kind === "participant") {
      const participant = evaluateParticipantCondition(
        conditions,
        tokens,
        idx,
        layout,
        lookups
      );
      if (participant !== null) {
        return participant;
      }
    }
    const state = evaluateFrameSourceConditionWithLayout(conditions, tokens as readonly RuntimeHaruToken[], idx, {
      layout,
      contentMap,
      grammar: spanGrammar(span),
      final: true,
      lookups,
      numeric
    });
    return state === "match"
      ? { matched: true, rejectedReason: null }
      : { matched: false, rejectedReason: `${kind}_${state}` };
  };
}

function frameSpecForRoleCase(frame: FrameSpec): Parameters<typeof semanticRoleCaseAssignments>[0]["frame"] {
  return {
    frameId: frame.frameId,
    slots: frame.slots.map((slot) => ({
      role: slot.role,
      particles: slot.particles,
      required: slot.required,
      nounLookup: slot.nounLookup.map((lookup) => typeof lookup === "string" ? lookup : {}),
      categories: slot.categories,
      surfaces: slot.surfaces,
      particlePosition: slot.particlePosition,
      allowBorrowed: slot.allowBorrowed,
      binding: slot.binding,
      slotType: slot.slotType,
      markers: slot.markers
    })),
    default: frame.defaultFrame
  };
}

function translationForRoleCase(translation: CommitmentTranslation): RoleCaseTranslation {
  const casePreferences = isCasePreferenceRecord(translation.casePreferences) ? translation.casePreferences : undefined;
  const senseCaseRealization = translation.senseCaseRealization as RoleCaseTranslation["caseRealization"];
  const caseRealization = senseCaseRealization ?? translation.caseRealization;
  return {
    korean: translation.korean,
    ...(caseRealization === undefined ? {} : { caseRealization }),
    ...(casePreferences === undefined ? {} : { casePreferences })
  };
}

function slotRealizationForTranslation(translation: CommitmentTranslation): Readonly<Record<string, SlotRealizationSpec>> | null {
  const value = translation.senseSlotRealization;
  return isSlotRealizationMap(value) ? value : null;
}

function isSlotRealizationMap(value: MorphemeSense["slotRealization"] | MorphemeSense["senseSlotRealization"] | Readonly<Record<string, SlotRealizationSpec>> | undefined): value is Readonly<Record<string, SlotRealizationSpec>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
