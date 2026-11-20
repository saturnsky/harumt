
import type { MorphemeSense } from "../../types/dictionary.js";
import type { NormalizedSenseFrame } from "../../dictionary/sense-normalization.js";
import { PARTICLE_PAIRS, type ParticleKey } from "../../generator/particles.js";
import type { RoleCaseTraceRoles } from "./role-case-shadow.js";
import { derivationForSense } from "../../dictionary/derivation.js";
import type { TranslationCandidate } from "../../types/pipeline.js";
import type { PredicateHeadTailChainRenderPlan, RenderPlan, Voice } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { isNominalLike, POS2, サ変可能, 명사 } from "../../types/pos.js";
import { auxHasNegation, auxHasPast } from "../matchers.js";
import type { LookupTables } from "../lookup-tables.js";
import { getReferentTokenBeforeParticle, isAnimateReferentBeforeNi, isAnimateReferentToken, type PredicateArgument, PredicateArgumentView, tokenInSemanticCategories } from "../semantics/helpers.js";
import { evaluateFrameSourceConditionWithLayout, type ContextGrammar, grammarVoiceForFrame } from "../context.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { CaseParticleMarkerSurface } from "../head-tail/boundary/relation.js";
import { candidateGrammar, spanGrammar } from "../candidate-runtime.js";
import { buildFrameArgumentView, ConditionEvidenceResult, evaluateClauseConditions, FrameEvidenceInput, frameSpecFromDict, isAdnominalDeclarationOnlyFrameJson, namedLookupResolver, selectFrameMatch, UnknownLookupSet, type ConditionEvidenceEvaluator, type FrameJsonMap } from "../semantics/frame.js";
import { type TraceDetailValue } from "../trace.js";
import type { AuxLayerNode, TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "../head-tail/tail/predicate-root/stem-candidate-identity.js";
import { tailRootStemIsVerbalSuffixDerivation } from "../head-tail/tail/predicate-root/inspect.js";
import { type SubjectAnimacyEvidence } from "../voice-class.js";
import { type CasePreference, type CasePreferenceValue, type TraceLikeValue, type CommitmentCandidate, type CommitmentContentMap, type CommitmentSpan, type CommitmentToken, type CommitmentTranslation } from "./types.js";
import {
  createSourceCandidateSet,
  isResolvedCandidateSet,
  stagedCandidate,
  withStagedCandidatePayload,
  type SourceCandidateSet,
  type StagedCandidate
} from "../source-candidate-set.js";

export function withTraceClauseIdx<T extends { readonly [key: string]: TraceDetailValue }>(detail: T, clauseIdx: number | null | undefined): T | T & { readonly clause_idx: number } {
  if (clauseIdx === undefined || clauseIdx === null || clauseIdx < 0) {
    return detail;
  }
  return { ...detail, clause_idx: clauseIdx };
}

export function isCommitmentCaseParticle(
  tokens: readonly CommitmentToken[],
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return isCommitmentCaseParticleToken(tokens[index], index, surface, acceptedParticleSubtypes);
}

export function isCommitmentCaseParticleToken(
  token: CommitmentToken | undefined,
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: [surface],
    ...(acceptedParticleSubtypes === undefined ? {} : { acceptedParticleSubtypes }),
    consumers: ["deferred_commitment"]
  }) !== null;
}

export function tailChainSupportPredicateDictForm(span: CommitmentSpan): string | null {
  const plan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const layer = firstTailAuxLayer(plan.realization.root.tail);
    if (layer?.stem.kind === "verb") {
      const support = layer.stem.source.tokens[layer.stem.conjugationAnchor];
      const supportDictForm = support?.dictionaryForm || support?.surface || "";
      if (supportDictForm.length > 0) {
        return supportDictForm;
      }
    }
  }
  return null;
}

export function commitmentCandidateView(candidate: CommitmentCandidate): TranslationCandidate {
  const entry = candidate.entry ?? { senses: candidate.translation === undefined ? [] : [candidate.translation] };
  const translation = candidate.translation ?? candidate.entry?.senses?.[0] ?? { korean: candidate.koreanLemma ?? candidate.korean ?? "" };
  const view: TranslationCandidate = {
    priority: candidate.priority ?? 0,
    conditions: [],
    entry,
    translation,
    projectionOrdinal: candidate.projectionOrdinal,
    ...(candidate.nominalProjection === undefined ? {} : { nominalProjection: candidate.nominalProjection }),
    derivation: candidate.derivation ?? derivationForSense(translation, entry),
    koreanLemma: candidate.koreanLemma ?? candidate.korean ?? "",
    koreanPos: candidate.koreanPos ?? 명사,
    irregular: candidate.irregular ?? null,
    renderPlan: candidate.renderPlan ?? null,
    renderPlanPolicy: candidate.renderPlanPolicy ?? "normal",
    korean: candidate.korean ?? "",
    voice: candidate.voice ?? null,
    connectiveRole: candidate.connectiveRole ?? null,
    benefactive: candidate.benefactive ?? {}
  };
  return {
    ...view,
    ...(candidate.compoundSamePredicateFrameSources === undefined ? {} : { compoundSamePredicateFrameSources: candidate.compoundSamePredicateFrameSources }),
    ...(candidate.nareruReadings === undefined ? {} : { nareruReadings: candidate.nareruReadings }),
    ...(candidate.rareruReadings === undefined ? {} : { rareruReadings: candidate.rareruReadings }),
    ...(candidate.dekiruReadings === undefined ? {} : { dekiruReadings: candidate.dekiruReadings }),
    ...(candidate.hasNegative === undefined ? {} : { hasNegative: candidate.hasNegative }),
    ...(candidate.hasCausative === undefined ? {} : { hasCausative: candidate.hasCausative }),
    ...(candidate.hasCausativePassive === undefined ? {} : { hasCausativePassive: candidate.hasCausativePassive }),
    ...(candidate.hasRequestTail === undefined ? {} : { hasRequestTail: candidate.hasRequestTail }),
    ...(candidate.hasBenefactiveTail === undefined ? {} : { hasBenefactiveTail: candidate.hasBenefactiveTail })
  };
}

export function stagedCommitmentCandidate(candidate: CommitmentCandidate): StagedCandidate<CommitmentCandidate> {
  return withStagedCandidatePayload(
    stagedCandidate(commitmentCandidateView(candidate), "unknown"),
    candidate
  );
}

export function stagedCommitmentCandidateSet(
  candidates: readonly CommitmentCandidate[],
  options: { readonly sharedConsumed: number }
): SourceCandidateSet<CommitmentCandidate> {
  return createSourceCandidateSet(candidates.map(stagedCommitmentCandidate), options);
}

export function translationFrameDataAlternatives(translation: CommitmentTranslation): readonly (FrameJsonMap | null)[] {
  const frames = translation.senseFrames;
  if (Array.isArray(frames)) {
    return frames.filter((frame) =>
      isFrameJsonMapForCommitment(frame) && hasFrameSourceConditionsForCommitment(frame)
    );
  }
  const frameData = translation.senseFrame;
  return isFrameJsonMapForCommitment(frameData) && hasFrameSourceConditionsForCommitment(frameData) ? [frameData] : [];
}

type CandidateFrameMatchState = "match" | "fail" | "slot_evidence_skipped";

export function candidateFrameAlternativesMatch(
  candidate: CommitmentCandidate,
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly voiceOverride?: Voice; readonly argumentVoiceOverride?: Voice } = {}
): CandidateFrameMatchState {
  const frameGroups = candidateFrameSourceGroups(candidate);
  if (frameGroups.length === 0) {
    return "match";
  }
  const grammar = candidateSpanGrammar(candidate, span, options);
  const argumentVoice = options.argumentVoiceOverride ?? (
    frameGroupsUseSourceArgumentViewForVoice(frameGroups, grammarVoiceForFrame(grammar))
      ? "active"
      : grammarVoiceForFrame(grammar)
  );
  const argumentView = buildFrameArgumentView(runtimeTokens(tokens), idx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: argumentVoice
  });
  try {
    let skipped = false;
    for (const frameDatas of frameGroups) {
      const frames = frameDatas.map(frameSpecFromDict);
      const [match, evaluations] = selectFrameMatch(frames, argumentView, {
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
        conditionEvaluator: candidateFrameConditionEvaluator([candidate], span, tokens, idx, layout, contentMap, lookups, numeric, options)
      });
      if (match === null) {
        if (evaluations.some((evaluation) =>

          evaluation.slotEvidenceSkippedReason !== null && evaluation.slotEvidenceSkippedReason !== undefined
        )) {
          return "slot_evidence_skipped";
        }
        return "fail";
      }
      const selectedEvaluation = evaluations.find((evaluation) =>
        evaluation.matched && evaluation.frame.frameId === match.frameId
      );
      if (
        selectedEvaluation?.slotEvidenceSkippedReason !== null &&
        selectedEvaluation?.slotEvidenceSkippedReason !== undefined
      ) {
        skipped = true;
      }
    }
    return skipped ? "slot_evidence_skipped" : "match";
  } catch (error) {
    if (error instanceof UnknownLookupSet) {
      return "fail";
    }
    throw error;
  }
}

export function candidateFrameSourceTranslations(candidate: CommitmentCandidate): readonly CommitmentTranslation[] {
  const translations: CommitmentTranslation[] = [];
  const seen = new Set<CommitmentTranslation>();
  const add = (translation: CommitmentTranslation | undefined): void => {
    if (translation === undefined || seen.has(translation)) {
      return;
    }
    seen.add(translation);
    translations.push(translation);
  };
  add(candidate.translation);
  for (const translation of candidate.compoundSamePredicateFrameSources ?? []) {
    add(translation);
  }
  return translations;
}

export function candidateFrameSourceGroups(candidate: CommitmentCandidate): readonly (readonly FrameJsonMap[])[] {
  return candidateFrameSourceTranslations(candidate)
    .map((translation) => translationFrameDataAlternatives(translation).filter((frameData): frameData is FrameJsonMap => frameData !== null))
    .filter((frameDatas) => frameDatas.length > 0);
}

export function frameGroupsUseSourceArgumentViewForVoice(
  frameGroups: readonly (readonly FrameJsonMap[])[],
  voice: Voice | string | null
): boolean {
  if (voice !== "passive" && voice !== "potential") {
    return false;
  }
  return frameGroups.some((frameDatas) =>
    frameDatas.some((frameData) =>
      frameDataVoiceConditionIncludes(frameData, voice) &&
      frameDataHasVoiceSourceEvidence(frameData)
    )
  );
}

export function candidateFrameConditionEvaluator(
  candidates: readonly CommitmentCandidate[],
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly voiceOverride?: Voice } = {}
): ConditionEvidenceEvaluator {
  return (candidateInput, kind, conditions) => {
    const candidate = candidates[candidateInput.index];
    if (candidate === undefined) {
      return new ConditionEvidenceResult(false, `${kind}_candidate_missing`);
    }
    if (kind === "clause") {
      const result = evaluateClauseConditions(
        runtimeTokens(tokens),
        idx,
        layout,
        (predicateIdx) => predicateGrammarForClause(contentMap, predicateIdx, idx, span, candidate),
        conditions
      );
      return result.matched
        ? result
        : new ConditionEvidenceResult(false, `${kind}_${result.rejectedReason ?? "mismatch"}`);
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
    const state = evaluateFrameSourceConditionWithLayout(conditions, runtimeTokens(tokens), idx, {
      layout,
      contentMap,
      grammar: candidateSpanGrammar(candidate, span, options),
      final: true,
      lookups,
      numeric
    });
    return state === "match"
      ? new ConditionEvidenceResult(true)
      : new ConditionEvidenceResult(false, `${kind}_${state}`);
  };
}

export function candidateSpanGrammar(
  candidate: CommitmentCandidate,
  span: CommitmentSpan,
  options: { readonly voiceOverride?: Voice } = {}
): ContextGrammar {
  const grammar = {
    ...candidateGrammar(commitmentCandidateView(candidate)),
    ...spanGrammar(span)
  };
  return options.voiceOverride === undefined ? grammar : { ...grammar, voice: options.voiceOverride };
}

export function predicateGrammarForClause(
  contentMap: CommitmentContentMap,
  predicateIdx: number,
  currentIdx: number,
  currentSpan: CommitmentSpan,
  currentCandidate: CommitmentCandidate | null = null
): ContextGrammar | null {
  const predicateSpan = predicateIdx === currentIdx ? currentSpan : contentSpanAt(contentMap, predicateIdx);
  if (predicateSpan === undefined) {
    return null;
  }
  if (predicateIdx === currentIdx && currentCandidate !== null) {
    return candidateSpanGrammar(currentCandidate, predicateSpan);
  }
  const selected = selectedCommitmentCandidate(predicateSpan);
  return selected === undefined ? spanGrammar(predicateSpan) : candidateSpanGrammar(selected, predicateSpan);
}

export function candidatePriorityGroup(candidate: CommitmentCandidate): number {
  return semanticFrameIntMetadata(candidate.translation ?? null, "priorityGroup", candidate.priority ?? 0);
}

export function candidatePriorityInGroup(candidate: CommitmentCandidate): number {
  return semanticFrameIntMetadata(candidate.translation ?? null, "priorityInGroup", candidate.priority ?? 0);
}

export function candidateSenseIndex(candidate: CommitmentCandidate): number | null {
  return semanticFrameOptionalIntMetadata(candidate.translation ?? null, "senseIndex");
}

export function semanticFrameIntMetadata(
  translation: CommitmentTranslation | null | undefined,
  key: "priorityGroup" | "priorityInGroup",
  defaultValue: number
): number {
  const value = translation?.[key];
  return typeof value === "number" && Number.isInteger(value) ? value : defaultValue;
}

export function semanticFrameOptionalIntMetadata(
  translation: CommitmentTranslation | null | undefined,
  key: "senseIndex"
): number | null {
  const value = translation?.[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function evaluateParticipantCondition(
  conditions: FrameJsonMap,
  tokens: readonly CommitmentToken[],
  idx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): ConditionEvidenceResult | null {
  const previousCategories = stringConditionValues(conditions.prevCategory);
  const subjectCategories = stringConditionValues(conditions.subjectCategory);
  const nextCategories = conditions.nextCategory;
  if ((previousCategories === null && subjectCategories === null) || nextCategories !== undefined) {
    return null;
  }
  const argumentView = new PredicateArgumentView(runtimeTokens(tokens), idx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles
  });
  const argumentsForPredicate = argumentView.arguments({ includeBorrowed: true })
    .filter((candidate) => candidate.particleIdx < idx && candidate.noun !== null);
  if (previousCategories !== null) {
    const previous = [...argumentsForPredicate].sort((left, right) => right.particleIdx - left.particleIdx)[0];
    if (previous?.noun === null || previous?.noun === undefined) {
      return new ConditionEvidenceResult(false, "participant_prev_category_missing");
    }
    if (!tokenInSemanticCategories(previous.noun, previousCategories, lookups)) {
      return new ConditionEvidenceResult(false, "participant_prev_category_mismatch");
    }
  }
  if (subjectCategories !== null) {
    const subject = [...argumentView.subjectArguments({ includeBorrowed: true })]
      .filter((argument) => argument.particleIdx < idx && argument.noun !== null)
      .sort((left, right) => right.particleIdx - left.particleIdx)[0];
    if (subject?.noun === null || subject?.noun === undefined) {
      return new ConditionEvidenceResult(false, "participant_subject_category_missing");
    }
    if (!tokenInSemanticCategories(subject.noun, subjectCategories, lookups)) {
      return new ConditionEvidenceResult(false, "participant_subject_category_mismatch");
    }
  }
  return new ConditionEvidenceResult(true);
}

function stringConditionValues(value: unknown): readonly string[] | null {
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    return null;
  }
  return value;
}

export function isFrameJsonMapForCommitment(value: NormalizedSenseFrame | FrameJsonMap | null | undefined): value is FrameJsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFallbackCandidate(candidate: CommitmentCandidate): boolean {
  const translation = candidate.translation;
  if (translation === undefined) {
    return true;
  }
  const frames = translation.senseFrames;
  if (Array.isArray(frames)) {
    return false;
  }
  const frameData = translation.senseFrame;
  if (frameData === undefined || frameData === null) {
    return true;
  }
  return isFrameJsonMapForCommitment(frameData) && frameData.default === true;
}

export function hasFrameSourceConditionsForCommitment(value: NormalizedSenseFrame | FrameJsonMap | null | undefined): boolean {
  return isFrameJsonMapForCommitment(value) && !isAdnominalDeclarationOnlyFrameJson(value as FrameJsonMap) && [
    "slots", "chainConditions", "lexicalConditions", "clauseConditions", "participantConditions", "connectiveRole"
  ].some((key) => key in value);
}

export function hasPossessorWoObject(tokens: readonly CommitmentToken[], particleIndices: readonly number[], lookups: LookupTables): boolean {
  return particleIndices.some((idx) => {
    if (!isCommitmentCaseParticle(tokens, idx, "を")) {
      return false;
    }
    const referent = getReferentTokenBeforeParticle(tokens, idx, lookups);
    if (referent === null) {
      return false;
    }
    return tokenFormsForLookup(referent).some((value) => lookups.SEMANTIC_POSSESSOR_OBJECT_NOUNS.has(value));
  });
}

export function tokenFormsForLookup(token: CommitmentToken & { readonly reading?: string }): readonly string[] {
  return [token.dictionaryForm, token.surface, token.reading]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function tailChainHasAspect(plan: PredicateHeadTailChainRenderPlan, aspect: string): boolean {
  return tailNodeHasAspect(plan.realization.root.tail, aspect);
}

function tailNodeHasAspect(node: TailNode, aspect: string): boolean {
  if (node.kind === "connective") {
    return tailNodeHasAspect(node.inner, aspect) || tailNodeHasAspect(node.outer, aspect);
  }
  return node.ops.some((op) => op.kind === "aspect" && op.aspect === aspect);
}

function tailNodeHasTensePast(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasTensePast(node.inner) || tailNodeHasTensePast(node.outer);
  }
  return node.ops.some((op) => op.kind === "tense" && op.tense === "past");
}

function tailNodeHasNegation(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasNegation(node.inner) || tailNodeHasNegation(node.outer);
  }
  return node.ops.some((op) => op.kind === "negation");
}

function tailNodeIsAttributive(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeIsAttributive(node.outer);
  }
  return node.terminal === "attributive";
}

export function spanHasPastAux(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma" || plan?.kind === "attributive") {
    return auxHasPast(plan.auxTokens);
  }
  return isPredicateHeadTailChainRenderPlan(plan) && tailNodeHasTensePast(plan.realization.root.tail);
}

export function spanTailStemIsSahenVerbalization(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const layer = firstTailAuxLayerNode(plan.realization.root.tail);
  if (layer === null) {
    return false;
  }
  const stem = layer.stem;
  if (stem.sourcePredicateShape === "sahen_verbalization") {
    return true;
  }
  if (stem.kind === "candidateSet") {
    return stem.candidates.some((candidate) => candidate.conj === "sahen");
  }
  return stem.kind === "verb" && stem.conj === "sahen";
}

function firstTailAuxLayerNode(node: TailNode): Extract<TailNode, { readonly kind: "auxLayer" }> | null {
  if (node.kind === "connective") {
    return firstTailAuxLayerNode(node.inner);
  }
  return node.kind === "auxLayer" ? node : null;
}

export function spanIsAttributivePredicate(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  return plan?.kind === "attributive" ||
    (isPredicateHeadTailChainRenderPlan(plan) && tailNodeIsAttributive(plan.realization.root.tail));
}

export function passiveClassPredicateDictForms(span: CommitmentSpan, token: CommitmentToken | undefined): readonly string[] {
  const forms: string[] = [];
  const add = (value: string | null | undefined): void => {
    if (value !== undefined && value !== null && value.length > 0 && !forms.includes(value)) {
      forms.push(value);
    }
  };
  const entryForm = span.entry?.dictionaryForm;
  const tokenForm = token?.dictionaryForm;
  add(tailChainSupportPredicateDictForm(span));
  add(entryForm);
  add(tokenForm);
  if (((span.entry?.pos ?? 0) & POS2) === サ変可能 && entryForm !== undefined && entryForm.length > 0) {
    add(`${entryForm}する`);
  }
  if (((token?.pos ?? 0) & POS2) === サ変可能 && tokenForm !== undefined && tokenForm.length > 0) {
    add(`${tokenForm}する`);
  }
  return forms;
}

export function subjectAnimacyForPredicate(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): SubjectAnimacyEvidence {
  let sawSubject = false;
  let sawInanimate = false;
  let sawUnknown = false;
  for (const subject of predicateSubjectArguments(tokens, predIdx, layout, lookups)) {
    sawSubject = true;
    const referent = subject.referent;
    if (referent === null) {
      sawUnknown = true;
      continue;
    }
    if (isAnimateReferentToken(referent, lookups)) {
      return "animate";
    }
    if (subject.borrowed && subject.particle.surface === "も") {
      sawUnknown = true;
      continue;
    }
    if (isNominalLike(referent)) {
      sawInanimate = true;
    } else {
      sawUnknown = true;
    }
  }
  if (sawInanimate) {
    return "inanimate";
  }
  if (sawUnknown || sawSubject) {
    return "unknown";
  }
  return "absent";
}

export function spanHasNegativeAux(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  const target = plan?.kind === "lemma" || plan?.kind === "attributive" ? plan : null;
  if (target !== null) {
    return auxHasNegation(target.auxTokens);
  }
  return isPredicateHeadTailChainRenderPlan(plan) && tailNodeHasNegation(plan.realization.root.tail);
}

export function predicateSubjectArguments(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables,
  resolveOwnUnknownTopicAsSubject: NonNullable<Parameters<PredicateArgumentView["subjectArguments"]>[0]>["resolveOwnUnknownTopicAsSubject"] = () => false
): readonly PredicateArgument[] {
  return new PredicateArgumentView(tokens, predIdx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles
  }).subjectArguments({ includeBorrowed: true, resolveOwnUnknownTopicAsSubject });
}

export function runtimeTokens(tokens: readonly CommitmentToken[]): readonly RuntimeHaruToken[] {
  return tokens.map((token) => ({
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    reading: "",
    dictionaryFormReading: "",
    pos: token.pos,
    dictionaryId: -1
  }));
}

export function frameDataVoiceConditionIncludes(frameData: FrameJsonMap | null, voice: Voice): boolean {
  if (!isFrameJsonMapForCommitment(frameData)) {
    return false;
  }
  const chainConditions = frameData.chainConditions ?? frameData.chain_conditions;
  if (!isFrameJsonMapForCommitment(chainConditions as FrameJsonMap | null | undefined)) {
    return false;
  }
  const value = (chainConditions as FrameJsonMap).voice;
  if (typeof value === "string") {
    return value === voice;
  }
  return Array.isArray(value) && value.some((item) => item === voice);
}

export function frameDataHasVoiceSourceEvidence(frameData: FrameJsonMap | null): boolean {
  if (!isFrameJsonMapForCommitment(frameData)) {
    return false;
  }
  return (Array.isArray(frameData.slots) && frameData.slots.length > 0) ||
    Boolean(
      sourceConditionTruthy(frameData.lexicalConditions ?? frameData.lexical_conditions) ||
      sourceConditionTruthy(frameData.clauseConditions ?? frameData.clause_conditions) ||
      sourceConditionTruthy(frameData.participantConditions ?? frameData.participant_conditions) ||
      sourceConditionTruthy(frameData.connectiveRole ?? frameData.connective_role)
    );
}

function sourceConditionTruthy(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === "object" && value !== null
    ? Object.keys(value).length > 0
    : value !== undefined && value !== null;
}

export function firstTailAuxLayer(node: TailNode): AuxLayerNode | null {
  return node.kind === "auxLayer" ? node : firstTailAuxLayer(node.inner);
}

export function contentSpanAt(contentMap: CommitmentContentMap, index: number): CommitmentSpan | undefined {
  return contentMap instanceof Map ? contentMap.get(index) : contentMap[index];
}

export function tailChainHasAnyAspect(plan: PredicateHeadTailChainRenderPlan, aspects: ReadonlySet<string>): boolean {
  return tailNodeHasAnyAspect(plan.realization.root.tail, aspects);
}

function tailNodeHasAnyAspect(node: TailNode, aspects: ReadonlySet<string>): boolean {
  if (node.kind === "connective") {
    return tailNodeHasAnyAspect(node.inner, aspects) || tailNodeHasAnyAspect(node.outer, aspects);
  }
  return node.ops.some((op) => op.kind === "aspect" && aspects.has(op.aspect));
}

export function tailChainHasExcessivePostverb(plan: PredicateHeadTailChainRenderPlan): boolean {
  return tailNodeHasExcessivePostverb(plan.realization.root.tail);
}

function tailNodeHasExcessivePostverb(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasExcessivePostverb(node.inner) || tailNodeHasExcessivePostverb(node.outer);
  }
  return node.ops.some((op) => op.kind === "postverbAuxiliary" && op.auxiliary.kind === "excessive");
}

export function tailParserPredicateEventKey(plan: RenderPlan | null): string | null {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  const layer = firstTailAuxLayer(plan.realization.root.tail);
  if (layer === null) {
    return null;
  }
  if (layer.stem.kind === "verb") {
    const semantic = layer.stem.source.tokens[layer.stem.semanticAnchors[0] ?? layer.stem.conjugationAnchor];
    const surface = semantic?.dictionaryForm || semantic?.surface || "";
    if (surface.length === 0) {
      return null;
    }
    if (layer.stem.conj === "sahen") {
      if (surface === "する") {
        return "する";
      }
      return `${surface}する`;
    }
    return surface;
  }
  if (
    layer.stem.kind === "candidateSet" &&
    (
      layer.stem.sourcePredicateShape === "sahen_verbalization" ||
      layer.stem.candidates.some((candidate) => candidate.conj === "sahen")
    )
  ) {
    const stem = layer.stem;
    const semantic = stem.source.tokens[stem.semanticAnchors[0] ?? stem.conjugationAnchor];
    const surface = semantic?.dictionaryForm || semantic?.surface || "";
    if (surface.length === 0) {
      return null;
    }
    const selected = stem.committedSense === undefined
      ? undefined
      : stem.candidates.find((candidate) =>
        stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), stem.committedSense!)
      );
    const sahenVerbalization = selected === undefined
      ? stem.sourcePredicateShape === "sahen_verbalization"
      : selected.conj === "sahen";
    if (sahenVerbalization) {
      if (surface === "する") {
        return "する";
      }
      return `${surface}する`;
    }
    return surface;
  }
  if (layer.stem.kind === "noun" && layer.stem.sahen && layer.ops.some((op) => op.kind === "copula")) {
    const semantic = layer.stem.source.tokens[layer.stem.semanticAnchors[0] ?? layer.stem.conjugationAnchor];
    const surface = semantic?.dictionaryForm || semantic?.surface || "";
    return surface.length > 0 ? `${surface}する` : null;
  }
  return null;
}

export function selectedCommitmentCandidate(span: CommitmentSpan): CommitmentCandidate | undefined {
  const set = span.sourceCandidates;
  return isResolvedCandidateSet(set) ? set.winner.candidate : undefined;
}

export function selectedSpanTranslation(span: CommitmentSpan): MorphemeSense | null {
  const selected = selectedCommitmentCandidate(span)?.translation;
  return selected ?? span.entry?.senses?.[0] ?? null;
}

export function hasAnimateNiAgentParticle(tokens: readonly CommitmentToken[], particleIndices: readonly number[], lookups: LookupTables): boolean {
  return particleIndices.some((idx) => isCommitmentCaseParticle(tokens, idx, "に") && isAnimateReferentBeforeNi(tokens, idx, lookups));
}

export function spanPredicateIsVerbalSuffixDerivation(span: CommitmentSpan): boolean {
  return isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
    tailRootStemIsVerbalSuffixDerivation(span.renderPlan.realization.root);
}

export function hasExplicitWoObject(tokens: readonly CommitmentToken[], particleIndices: readonly number[]): boolean {
  return particleIndices.some((idx) => isCommitmentCaseParticle(tokens, idx, "を"));
}

export function woObjectIsBodyPart(tokens: readonly CommitmentToken[], woParticleIdx: number, lookups: LookupTables): boolean {
  const referent = getReferentTokenBeforeParticle(tokens, woParticleIdx, lookups);
  if (referent === null) {
    return false;
  }
  return tokenFormsForLookup(referent).some((value) => lookups.SEMANTIC_BODY_PARTS.has(value));
}

export function extractKoreanLemma(span: CommitmentSpan): string | null {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.koreanLemma;
  }
  if (isPredicateHeadTailChainRenderPlan(plan) && tailChainHasAspect(plan, "te_shimau")) {
    return "버리다";
  }
  return span.entry?.senses?.[0]?.korean ?? null;
}

export function extractSahenNoun(span: CommitmentSpan): string | null {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.sahenNoun ?? null;
  }
  return null;
}

export function extractSahenCompound(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.sahenCompound === true;
  }
  return false;
}

export function contentEntries(contentMap: CommitmentContentMap): readonly (readonly [number, CommitmentSpan])[] {
  if (contentMap instanceof Map) {
    return [...contentMap.entries()].sort(([left], [right]) => left - right);
  }
  return Object.entries(contentMap)
    .map(([key, span]) => [Number(key), span] as const)
    .sort(([left], [right]) => left - right);
}

export function traceDetail(value: { readonly [key: string]: TraceLikeValue }): { readonly [key: string]: TraceDetailValue } {
  return traceValue(value) as { readonly [key: string]: TraceDetailValue };
}

function traceValue(value: TraceLikeValue): TraceDetailValue {
  if (Array.isArray(value)) {
    return value.map(traceValue);
  }
  if (typeof value === "object" && value !== null) {
    const mapped: { [key: string]: TraceDetailValue } = {};
    for (const [key, item] of Object.entries(value)) {
      mapped[key] = traceValue(item);
    }
    return mapped;
  }
  return value;
}

export function roleCaseRolesTraceLike(roles: RoleCaseTraceRoles): TraceLikeValue {
  const mapped: { [role: string]: TraceLikeValue } = {};
  for (const [role, detail] of Object.entries(roles)) {
    mapped[role] = {
      particle: detail.particle,
      surface_particle: detail.surfaceParticle,
      surface: detail.surface,
      dictionary_form: detail.dictionaryForm,
      slot_categories: detail.slotCategories,
      filler_categories: detail.fillerCategories,
      predicted: detail.predicted,
      prediction_source: detail.predictionSource,
      default: detail.default,
      confidence: detail.confidence,
      current: detail.current === null ? null : caseSpecTraceLike(detail.current),
      current_source: detail.currentSource,
      bucket: detail.bucket
    };
  }
  return mapped;
}

function caseSpecTraceLike(value: string | { readonly allomorphKey?: string; readonly korean?: string; readonly role?: string }): TraceLikeValue {
  if (typeof value === "string") {
    return value;
  }
  return {
    ...(value.allomorphKey === undefined ? {} : { allomorphKey: value.allomorphKey }),
    ...(value.korean === undefined ? {} : { korean: value.korean }),
    ...(value.role === undefined ? {} : { role: value.role })
  };
}

export function normalizeCasePreferenceAllomorph(value: string): ParticleKey | undefined {
  if (value in PARTICLE_PAIRS) {
    return value as ParticleKey;
  }
  switch (value) {
    case "이":
    case "가":
      return "이/가";
    case "은":
    case "는":
      return "은/는";
    case "을":
    case "를":
      return "을/를";
    case "과":
    case "와":
      return "과/와";
    case "으로":
    case "로":
      return "으로/로";
    default:
      return undefined;
  }
}

export function casePreferenceFromValue(value: CasePreferenceValue): CasePreference | undefined {
  const role = typeof value === "string" ? "translation_case_preference" : value.role ?? "translation_case_preference";
  const allomorphValue = typeof value === "string" ? value : value.allomorphKey;
  const koreanValue = typeof value === "string" ? value : value.korean;

  if (allomorphValue !== undefined) {
    const allomorphKey = normalizeCasePreferenceAllomorph(allomorphValue);
    if (allomorphKey !== undefined) {
      return { role, allomorphKey };
    }
  }
  if (koreanValue !== undefined) {
    return { role, korean: koreanValue };
  }
  return undefined;
}

export function isCasePreferenceRecord(value: readonly string[] | Record<string, CasePreferenceValue> | undefined): value is Record<string, CasePreferenceValue> {
  return value !== undefined && !Array.isArray(value);
}
