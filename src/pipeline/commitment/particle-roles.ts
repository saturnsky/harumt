
import { entryDerivations } from "../../dictionary/derivation.js";
import { isPassiveTransitive } from "../../generator/aux-map.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { BenefactiveContext, DekiruReading, NareruReading, ParticleAssignment } from "../../types/pipeline.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { Clause, ClauseLayout } from "../clause-layout/final-layout.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { isGaNoConvertedSubjectParticle, noParticleShouldRemainNominalModifier } from "../semantics/gano-conversion.js";
import { TokenCursor } from "../token-cursor.js";
import {
  isNonIndependentVerbToken,
  POS0,
  POS2,
  POS4,
  POS5A,
  サ変可能,
  形状詞,
  助詞,
  助動詞,
  助動詞_タイ,
  動詞,
  副詞,
  名詞,
  命令形_,
  形容詞0,
  代名詞,
  동사,
  형용사,
  isAdverbCapableNominal,
  isProperPersonNameToken,
  isProperPlaceNameToken,
  isSahenCapableNominal,
  NOMINAL_BITS,
  pos0in
} from "../../types/pos.js";
import { pairKey } from "../lookup-tables.js";
import type { LookupTables } from "../lookup-tables.js";
import { getReferentForms, getReferentIndexBeforeParticle, getReferentTokenBeforeParticle, isAnimateReferentBeforeNi, isAnimateReferentToken, isHumanCollectiveToken, isHumanReferentToken, isKaraIttePerspectiveTail, isKaraMitePerspectiveTail, isPersonByContext, isPersonCountBeforeDe, isPlaceNoun, isTemporalArgumentToken, isTemporalConditionHeadNiContext, isTimeExpressionBeforeParticle, precedingIsIdiomNoun, PredicateArgumentView } from "../semantics/helpers.js";
import { isRespectReferentBeforeParticle, isRespectReferentToken } from "../semantics/honorific.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationAt, topicFocusMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { TraceEvent, type TraceCollector } from "../trace.js";
import type { TailNode } from "../head-tail/tail/predicate-root/grammar.js";
import { stemSupportsProjectionCategory } from "../head-tail/tail/predicate-root/inspect.js";
import { COMMITMENT_SOURCE_CASE_REALIZATION, COMMITMENT_SOURCE_CAUSATIVE_NEUTRAL_TRIGGER, COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT, COMMITMENT_SOURCE_SLOT_REALIZATION, NO_EXPERIENCER_KEIJOUJI, PREDICATE_POS, type CasePreference, type CommitmentEntry, type CommitmentSpan, type CommitmentToken, type ParticleCommitmentContext, type SemanticFrameRuntimeMatch } from "./types.js";
import { casePreferenceFromValue, extractKoreanLemma, extractSahenCompound, extractSahenNoun, hasAnimateNiAgentParticle, hasExplicitWoObject, isCommitmentCaseParticle, isCasePreferenceRecord, isCommitmentCaseParticleToken, passiveClassPredicateDictForms, runtimeTokens, selectedCommitmentCandidate, spanPredicateIsVerbalSuffixDerivation, subjectAnimacyForPredicate, tailChainSupportPredicateDictForm, tailParserPredicateEventKey, traceDetail, withTraceClauseIdx, woObjectIsBodyPart } from "./span-evidence.js";
import { argumentParticleIndicesForPredicate } from "./voice-reading-resolution.js";
import { adversativePassiveWeatherBaseOverride, evaluateAdversativeEMode, evaluateIntransitiveAdversativeAgentPromotion, hasAdversativePassiveDeLocationSourceParticle, isAdversativePassiveDeLocationSource, isDeparturePassiveSourceWo, isObjectRetainingAdversativePassive, particlePrecedesSareruQuoteTail, passiveTransitiveOptions, setAdversativePassive, spanConsumesPassiveAux, spanIsPassive, spanPassiveAbsorbedFrameOwnsParticle } from "./passive-class.js";
import { selectedSemanticFrameGaSlotAssignment, semanticFrameSlotForParticle, slotRealizationParticleCanBeCommitted, type SlotRealizationEffect } from "./semantic-frame.js";

function isKaraPerspectiveTail(baseCursor: TokenCursor<CommitmentToken>, particleIdx: number, lookups: LookupTables): boolean {
  const cursor = baseCursor.fork(particleIdx);
  return isKaraMitePerspectiveTail(cursor) || isKaraIttePerspectiveTail(cursor, lookups);
}

function isTemporalConditionHeadBeforeNi(tokens: readonly CommitmentToken[], particleIdx: number, lookups: LookupTables): boolean {
  return isTemporalConditionHeadNiContext(tokens, particleIdx, lookups);
}

export function spanHasDesireAux(tokens: readonly CommitmentToken[], span: Pick<CommitmentSpan, "start" | "consumed">): boolean {
  const end = Math.min(tokens.length, span.start + span.consumed);
  for (let index = span.start + 1; index < end; index += 1) {
    if (((tokens[index]?.pos ?? 0) & POS4) === 助動詞_タイ) {
      return true;
    }
  }
  return false;
}

function shouldPreserveGaAsExperiencerForHeadGap(
  ctx: ParticleCommitmentContext,
  predicateDictForm: string
): boolean {
  const referent = getReferentTokenBeforeParticle(ctx.tokens, ctx.particleIdx, ctx.lookups);
  if (
    referent !== null &&
    isLikelyDesireExperiencerToken(referent, ctx.lookups) &&
    hasPredicateNominalizerTopicAfterPredicate(ctx)
  ) {
    return true;
  }
  const semanticFrameSlot = semanticFrameSlotForParticle(ctx);
  if (semanticFrameSlot !== null) {
    if (semanticFrameSlot.role === "holder" || semanticFrameSlot.role === "experiencer") {
      return true;
    }
    if (semanticFrameSlot.role === "theme") {
      return false;
    }
  }
  if (referent === null || !isLikelyDesireExperiencerToken(referent, ctx.lookups)) {
    return false;
  }
  const head = attributiveHeadForPredicate(ctx);
  if (head === null) {
    return false;
  }
  return !isLikelyDesireHolderHead(head, predicateDictForm, ctx.lookups);
}

function shouldPreserveGaAsDesireAuxExperiencer(ctx: ParticleCommitmentContext, predicateDictForm: string): boolean {
  const referent = getReferentTokenBeforeParticle(ctx.tokens, ctx.particleIdx, ctx.lookups);
  if (referent === null) {
    return false;
  }
  const head = attributiveHeadForPredicate(ctx);
  if (head === null) {
    return isLikelyDesireAgentToken(referent, ctx.lookups) && ctx.lookups.SEMANTIC_DESIRE_AUX_SUBJECT_VERBS.has(predicateDictForm);
  }
  if (isLikelyDesireAuxAgentHead(head, ctx.lookups) && !isLikelyDesireAuxAgentToken(referent, ctx.lookups)) {
    return false;
  }
  return isLikelyDesireAuxAgentToken(referent, ctx.lookups);
}

function shouldPreserveGaAsPreferenceExperiencerForHeadGap(ctx: ParticleCommitmentContext): boolean {
  const referent = getReferentTokenBeforeParticle(ctx.tokens, ctx.particleIdx, ctx.lookups);
  if (referent === null || !isLikelyDesireExperiencerToken(referent, ctx.lookups)) {
    return false;
  }
  const head = attributiveHeadForPredicate(ctx);
  if (head === null) {
    return false;
  }
  return !isLikelyDesireExperiencerToken(head, ctx.lookups);
}

function hasPredicateNominalizerTopicAfterPredicate(ctx: ParticleCommitmentContext): boolean {
  const tokens = ctx.tokens;
  const searchStart = (ctx.predicateIdx ?? ctx.span.start) + 1;
  const searchEnd = Math.min(tokens.length, ctx.span.start + ctx.span.consumed + 4);
  let idx = nextNonSpaceIndex(tokens, searchStart, searchEnd);
  while (idx !== null) {
    const nominalizer = predicateNominalizerRelationForToken(tokens[idx], idx, {
      requirement: "strict_particle",
      acceptedSurfaces: ["の"],
      consumers: ["deferred_commitment"]
    });
    if (nominalizer?.nominalizerKind === "no") {
      const markerIdx = nextNonSpaceIndex(tokens, idx + 1, Math.min(tokens.length, idx + 4));
      const marker = markerIdx === null ? undefined : tokens[markerIdx];
      return marker !== undefined && (marker.pos & POS0) === 助詞 && (marker.surface === "は" || marker.surface === "が");
    }
    idx = nextNonSpaceIndex(tokens, idx + 1, searchEnd);
  }
  return false;
}

function borrowedAttributiveHeadIndexForPredicate(ctx: ParticleCommitmentContext): number | null {
  if (ctx.layout === null || ctx.predicateIdx === null) {
    return null;
  }
  const borrowedHead = new PredicateArgumentView(runtimeTokens(ctx.tokens), ctx.predicateIdx, {
    lookups: ctx.lookups,
    layout: ctx.layout,
    connectiveRoles: ctx.layout.connectiveRoles
  }).arguments({ includeBorrowed: true }).find((argument) =>
    argument.borrowed &&
    argument.particle.surface === "を" &&
    argument.particleIdx >= ctx.span.start + ctx.span.consumed
  );
  if (borrowedHead === undefined) {
    return null;
  }
  const head = ctx.tokens[borrowedHead.particleIdx];
  return head !== undefined && (pos0in(head.pos, NOMINAL_BITS)) ? borrowedHead.particleIdx : null;
}

function borrowedAttributiveHeadForPredicate(ctx: ParticleCommitmentContext): CommitmentToken | null {
  const idx = borrowedAttributiveHeadIndexForPredicate(ctx);
  return idx === null ? null : ctx.tokens[idx] ?? null;
}

function relativeAttributiveHeadIndexForPredicate(ctx: ParticleCommitmentContext): number | null {
  if (ctx.layout === null || ctx.predicateIdx === null) {
    return null;
  }
  const clauseIndex = ctx.layout.clauseIndexOfPredicate(ctx.predicateIdx);
  if (clauseIndex === undefined) {
    return null;
  }
  const clause = ctx.layout.clauses[clauseIndex];
  if (clause === undefined || clause.kind !== "relative" || clause.parentIdx === null) {
    return null;
  }
  const parent = ctx.layout.parentOf(clauseIndex);
  if (parent === undefined || parent.start !== clause.end) {
    return null;
  }
  const head = ctx.tokens[clause.end];
  return head !== undefined && (pos0in(head.pos, NOMINAL_BITS)) ? clause.end : null;
}

function relativeAttributiveHeadForPredicate(ctx: ParticleCommitmentContext): CommitmentToken | null {
  const idx = relativeAttributiveHeadIndexForPredicate(ctx);
  return idx === null ? null : ctx.tokens[idx] ?? null;
}

function attributiveHeadForPredicate(ctx: ParticleCommitmentContext): CommitmentToken | null {
  return borrowedAttributiveHeadForPredicate(ctx) ?? relativeAttributiveHeadForPredicate(ctx);
}

function attributiveHeadIndexForPredicate(ctx: ParticleCommitmentContext): number | null {
  return borrowedAttributiveHeadIndexForPredicate(ctx) ?? relativeAttributiveHeadIndexForPredicate(ctx);
}

function isLikelyDesireExperiencerToken(token: CommitmentToken, lookups: LookupTables): boolean {
  return isHumanReferentToken(token, lookups) || isAnimateReferentToken(token, lookups) || isHumanCollectiveToken(token, lookups);
}

function isLikelyDesireAgentToken(token: CommitmentToken, lookups: LookupTables): boolean {
  return isHumanReferentToken(token, lookups) || isHumanCollectiveToken(token, lookups);
}

function isLikelyDesireAgentHead(token: CommitmentToken, lookups: LookupTables): boolean {
  return isHumanReferentToken(token, lookups) || isHumanCollectiveToken(token, lookups);
}

function isLikelyDesireAuxAgentToken(token: CommitmentToken, lookups: LookupTables): boolean {
  return isLikelyDesireAgentToken(token, lookups) || lookups.SEMANTIC_DESIRE_HOLDER_NOUNS.has(token.dictionaryForm || token.surface);
}

function isLikelyDesireAuxAgentHead(token: CommitmentToken, lookups: LookupTables): boolean {
  return isLikelyDesireAgentHead(token, lookups) || lookups.SEMANTIC_DESIRE_HOLDER_NOUNS.has(token.dictionaryForm || token.surface);
}

function isLikelyDesireHolderHead(token: CommitmentToken, predicateDictForm: string, lookups: LookupTables): boolean {
  if (lookups.SEMANTIC_DESIRE_PERSON_TARGET_VERBS.has(predicateDictForm) && isLikelyDesireExperiencerToken(token, lookups)) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return isLikelyDesireExperiencerToken(token, lookups) || lookups.SEMANTIC_DESIRE_HOLDER_NOUNS.has(form);
}

export function resolveCasePreference(entry: MorphemeEntry | null | undefined, surface: string, options: { readonly selectedKorean?: string | null } = {}): CasePreference | undefined {
  const senses = entry?.senses ?? [];
  if (senses.length === 0) {
    return undefined;
  }
  const selectedKorean = options.selectedKorean ?? null;
  const selected = selectedKorean === null
    ? senses[0]
    : senses.find((translation) => translation.korean === selectedKorean);
  if (selected === undefined) {
    return undefined;
  }
  const preferences = selected?.casePreferences;
  if (!isCasePreferenceRecord(preferences)) {
    return undefined;
  }
  const value = preferences[surface];
  return value === undefined ? undefined : casePreferenceFromValue(value);
}

export function casePreferenceToAssignment(preference: CasePreference): ParticleAssignment {
  return {
    role: preference.role,
    korean: preference.korean ?? null,
    allomorphKey: preference.allomorphKey ?? null,
    attachLeft: true,
    register: "none",
    commitmentSource: "translation_case_preference"
  };
}

export function commitParticleRoles(
  baseCursor: TokenCursor<CommitmentToken>,
  tokens: readonly CommitmentToken[],
  span: CommitmentSpan,
  particleIndices: readonly number[],
  options: {
    readonly clause?: Clause | null;
    readonly layout?: ClauseLayout | null;
    readonly roleCaseAssignments?: ReadonlyMap<number, ParticleAssignment> | null;
    readonly semanticFrameRuntimeMatch?: SemanticFrameRuntimeMatch | null;
    readonly predicateIdx?: number | null;
    readonly trace?: TraceCollector | null;
    readonly traceClauseIdx?: number | null;
    readonly lookups: LookupTables;
  }
): Record<number, ParticleAssignment> {
  const committedRoles: Record<number, ParticleAssignment> = {};
  const lookups = options.lookups;
  const semanticRoleAssignments = options.roleCaseAssignments ?? new Map<number, ParticleAssignment>();
  const predicateDictForm = span.entry?.dictionaryForm ?? "";
  const predicateDictForms = passiveClassPredicateDictForms(
    span,
    options.predicateIdx === undefined || options.predicateIdx === null ? undefined : tokens[options.predicateIdx]
  );
  const supportPredicateDictForm = tailChainSupportPredicateDictForm(span);

  const hasAnimateNiAgent = hasAnimateNiAgentParticle(tokens, particleIndices, lookups);
  const hasWoObject = hasExplicitWoObject(tokens, particleIndices);
  const passiveClass = span.passiveClass ?? null;
  const adversativeEMode = passiveClass === "adversative"
    ? evaluateAdversativeEMode(tokens, span, particleIndices, predicateDictForm, { clause: options.clause ?? null, lookups })
    : false;
  const hasAdversativeDeLocationSource = passiveClass === "adversative"
    ? hasAdversativePassiveDeLocationSourceParticle(tokens, particleIndices, lookups)
    : false;
  const intransitiveAdversativeAgentPromoted = passiveClass === "adversative"
    ? evaluateIntransitiveAdversativeAgentPromotion(tokens, span, particleIndices, predicateDictForm, {
      clause: options.clause ?? null,
      hasWoObject,
      lookups
    })
    : false;
  const adversativeAgentPromoted = adversativeEMode || intransitiveAdversativeAgentPromoted;
  if (passiveClass === "adversative" && !hasWoObject && !spanConsumesPassiveAux(span)) {
    setAdversativePassive(span, {
      agentPromoted: intransitiveAdversativeAgentPromoted || hasAdversativeDeLocationSource,
      baseOverride: intransitiveAdversativeAgentPromoted || hasAdversativeDeLocationSource
        ? null
        : adversativePassiveWeatherBaseOverride(tokens, particleIndices, predicateDictForms, lookups)
    });
  }

  const run: ParticleRoleCommitRun = {
    baseCursor, tokens, span, particleIndices, options, committedRoles, lookups, semanticRoleAssignments,
    predicateDictForm, predicateDictForms, supportPredicateDictForm, hasAnimateNiAgent, hasWoObject, passiveClass,
    adversativeAgentPromoted
  };
  for (const particleIdx of particleIndices) {
    const token = tokens[particleIdx];
    if (token === undefined) {
      continue;
    }
    const surface = token.surface;
    const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
    const ctx: ParticleCommitmentContext = {
      tokens,
      span,
      layout: options.layout ?? null,
      predicateIdx: options.predicateIdx ?? null,
      particleIdx,
      surface,
      clause: options.clause ?? null,
      semanticRoleAssignments,
      semanticFrameRuntimeMatch: options.semanticFrameRuntimeMatch ?? null,
      trace: options.trace ?? null,
      traceClauseIdx: options.traceClauseIdx ?? null,
      lookups
    };
    const p: ParticleRoleStep = { particleIdx, token, surface, referent, ctx };

    if (commitSareruQuoteTailParticle(run, p) === "continue") {
      continue;
    }
    if (commitPassiveWoParticle(run, p) === "continue") {
      continue;
    }
    if (commitGaParticle(run, p) === "continue") {
      continue;
    }
    if (commitGaWoAuthorOrSemanticRole(run, p) === "continue") {
      continue;
    }
    if (commitTopicFocusParticle(run, p) === "continue") {
      continue;
    }
    if (commitNominalLinkNoParticle(run, p) === "continue") {
      continue;
    }
    if (commitKaraParticle(run, p) === "continue") {
      continue;
    }
    if (commitYoriParticle(run, p) === "continue") {
      continue;
    }
    if (commitDeParticle(run, p) === "continue") {
      continue;
    }
    if (commitQuoteToOrHeParticle(run, p) === "continue") {
      continue;
    }
    if (commitMadeParticle(run, p) === "continue") {
      continue;
    }

    if (!isCommitmentCaseParticleToken(token, particleIdx, "に")) {
      continue;
    }

    if (commitNiParticleByFrame(run, p) === "continue") {
      continue;
    }
    commitNiParticleByAnimacy(run, p);
  }
  return committedRoles;
}

interface ParticleRoleCommitRun {
  readonly baseCursor: TokenCursor<CommitmentToken>;
  readonly tokens: readonly CommitmentToken[];
  readonly span: CommitmentSpan;
  readonly particleIndices: readonly number[];
  readonly options: Parameters<typeof commitParticleRoles>[4];
  readonly committedRoles: Record<number, ParticleAssignment>;
  readonly lookups: LookupTables;
  readonly semanticRoleAssignments: ReadonlyMap<number, ParticleAssignment>;
  readonly predicateDictForm: string;
  readonly predicateDictForms: ReturnType<typeof passiveClassPredicateDictForms>;
  readonly supportPredicateDictForm: ReturnType<typeof tailChainSupportPredicateDictForm>;
  readonly hasAnimateNiAgent: boolean;
  readonly hasWoObject: boolean;
  readonly passiveClass: NonNullable<CommitmentSpan["passiveClass"]> | null;
  readonly adversativeAgentPromoted: boolean;
}

interface ParticleRoleStep {
  readonly particleIdx: number;
  readonly token: CommitmentToken;
  readonly surface: string;
  readonly referent: ReturnType<typeof getReferentTokenBeforeParticle>;
  readonly ctx: ParticleCommitmentContext;
}

type ParticleRoleSignal = "continue" | "next";

function commitSareruQuoteTailParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { baseCursor, tokens, span, options, committedRoles, lookups } = run;
  const { particleIdx, token } = p;
  if (particlePrecedesSareruQuoteTail(tokens, span, particleIdx)) {
    if (
      isCommitmentCaseParticleToken(token, particleIdx, "から", ["格助詞", "接続助詞"]) &&
      !isKaraPerspectiveTail(baseCursor, particleIdx, lookups) &&
      isTimeExpressionBeforeParticle(tokens, particleIdx, lookups, { clause: options.clause ?? null })
    ) {
      committedRoles[particleIdx] = { role: "temporal_source", korean: "부터", commitmentSource: COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT };
      return "continue";
    }
    if (
      isCommitmentCaseParticleToken(token, particleIdx, "より") &&
      yoriPrefersTemporalSource(tokens, particleIdx, span, { clause: options.clause ?? null, lookups })
    ) {
      committedRoles[particleIdx] = { role: "temporal_source", korean: "부터", commitmentSource: COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT };
      return "continue";
    }
    return "continue";
  }
  return "next";
}

function commitPassiveWoParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, span, committedRoles, lookups, semanticRoleAssignments, predicateDictForms, hasAnimateNiAgent, passiveClass, adversativeAgentPromoted } = run;
  const { particleIdx, token, surface, referent } = p;
  if (isCommitmentCaseParticleToken(token, particleIdx, "を") && spanIsPassive(span)) {
    if (spanConsumesPassiveAux(span)) {
      const semanticAssignment = semanticRoleAssignments.get(particleIdx);
      if (semanticAssignment !== undefined) {
        committedRoles[particleIdx] = semanticAssignment;
        return "continue";
      }
      if (spanPassiveAbsorbedFrameOwnsParticle(span, surface)) {
        return "continue";
      }
    }
    if (passiveClass === "causative_coercive" || passiveClass === "causative_passive_neutral") {
      return "continue";
    }
    if (isDeparturePassiveSourceWo(referent, predicateDictForms, lookups)) {
      committedRoles[particleIdx] = { role: "departure_source", korean: "에서" };
      return "continue";
    }
    if (passiveClass === "possessor") {
      return "continue";
    }
    if (isObjectRetainingAdversativePassive(span, lookups)) {
      return "continue";
    }
    const koreanLemma = extractKoreanLemma(span);
    const sahenNoun = extractSahenNoun(span);
    const sahenCompound = extractSahenCompound(span);
    if (koreanLemma !== null && isPassiveTransitive(koreanLemma, passiveTransitiveOptions(sahenCompound, sahenNoun, lookups))) {
      if (passiveClass === "adversative" && hasAnimateNiAgent && !woObjectIsBodyPart(tokens, particleIdx, lookups)) {
        setAdversativePassive(span, { agentPromoted: adversativeAgentPromoted });
      }
      return "continue";
    }
    committedRoles[particleIdx] = { role: "theme_promoted", allomorphKey: "이/가" };
    if (passiveClass === "adversative" && hasAnimateNiAgent) {
      setAdversativePassive(span);
    }
    return "continue";
  }
  return "next";
}

function commitGaParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, span, committedRoles, semanticRoleAssignments, predicateDictForm, hasWoObject } = run;
  const { particleIdx, token, ctx } = p;
  if (isCommitmentCaseParticleToken(token, particleIdx, "が")) {
    if ((predicateDictForm === "欲しい" || predicateDictForm === "ほしい") && !spanPredicateIsVerbalSuffixDerivation(span)) {
      const semanticFrameSlot = semanticFrameSlotForParticle(ctx);
      if (semanticFrameSlot?.role === "holder" || semanticFrameSlot?.role === "experiencer") {
        committedRoles[particleIdx] = {
          role: `hoshii_${semanticFrameSlot.role}`,
          allomorphKey: "이/가",
          commitmentSource: "semantic_frame_slot"
        };
        return "continue";
      }
      if (shouldPreserveGaAsExperiencerForHeadGap(ctx, predicateDictForm)) {
        committedRoles[particleIdx] = {
          role: "hoshii_experiencer_head_gap",
          allomorphKey: "이/가",
          commitmentSource: "relative_head_gap"
        };
        return "continue";
      }
      const semanticAssignment = semanticRoleAssignments.get(particleIdx);
      if (semanticAssignment !== undefined) {
        committedRoles[particleIdx] = semanticAssignment;
        return "continue";
      }
      committedRoles[particleIdx] = { role: "hoshii_object", allomorphKey: "을/를" };
      return "continue";
    }
    if (spanHasDesireAux(tokens, span)) {
      if (hasWoObject) {
        committedRoles[particleIdx] = {
          role: "desire_experiencer",
          allomorphKey: "이/가",
          commitmentSource: "desire_aux_experiencer_wo_coexists"
        };
        return "continue";
      }
      if (shouldPreserveGaAsDesireAuxExperiencer(ctx, predicateDictForm)) {
        committedRoles[particleIdx] = {
          role: "desire_experiencer",
          allomorphKey: "이/가",
          commitmentSource: "desire_aux_experiencer"
        };
        return "continue";
      }
      const semanticAssignment = semanticRoleAssignments.get(particleIdx);
      if (semanticAssignment !== undefined) {
        committedRoles[particleIdx] = semanticAssignment;
        return "continue";
      }
      if (shouldPreserveGaAsExperiencerForHeadGap(ctx, predicateDictForm)) {
        committedRoles[particleIdx] = {
          role: "desire_experiencer_head_gap",
          allomorphKey: "이/가",
          commitmentSource: "relative_head_gap"
        };
        return "continue";
      }
      committedRoles[particleIdx] = { role: "desire_object", allomorphKey: "을/를" };
      return "continue";
    }
    const dekiruAssignment = dekiruReadingParticleAssignment(ctx, span, particleIdx, predicateDictForm);
    if (dekiruAssignment !== undefined) {
      committedRoles[particleIdx] = dekiruAssignment;
      return "continue";
    }
    if (spanIsKeijoujiPreferenceBecomePotential(tokens, span, particleIdx)) {
      committedRoles[particleIdx] = { role: "keijouji_preference_become_potential_object", allomorphKey: "을/를" };
      return "continue";
    }
    const potentialAssignment = potentialParticleAssignment(ctx, span, particleIdx);
    if (potentialAssignment !== undefined) {
      committedRoles[particleIdx] = potentialAssignment;
      return "continue";
    }
    if (span.isKeijoujiVerbPredicate === true) {
      if (predicateDirectlyOwnsWoObject(ctx)) {
        committedRoles[particleIdx] = {
          role: "keijouji_experiencer",
          allomorphKey: "이/가",
          commitmentSource: "keijouji_experiencer_wo_coexists"
        };
        return "continue";
      }
      const semanticAssignment = semanticRoleAssignments.get(particleIdx);
      if (semanticAssignment !== undefined) {
        committedRoles[particleIdx] = semanticAssignment;
        return "continue";
      }
      const frameSlotAssignment = selectedSemanticFrameGaSlotAssignment(ctx);
      if (frameSlotAssignment !== undefined) {
        committedRoles[particleIdx] = frameSlotAssignment;
        return "continue";
      }
      if (
        (predicateDictForm === "好き" || predicateDictForm === "嫌い") &&
        shouldPreserveGaAsPreferenceExperiencerForHeadGap(ctx)
      ) {
        committedRoles[particleIdx] = {
          role: "keijouji_preference_experiencer_head_gap",
          allomorphKey: "이/가",
          commitmentSource: "relative_head_gap"
        };
        return "continue";
      }
      committedRoles[particleIdx] = { role: "keijouji_verb_object", allomorphKey: "을/를" };
      return "continue";
    }
  }
  return "next";
}

function commitGaWoAuthorOrSemanticRole(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { committedRoles } = run;
  const { particleIdx, token, ctx } = p;
  if (
    isCommitmentCaseParticleToken(token, particleIdx, "が") ||
    isCommitmentCaseParticleToken(token, particleIdx, "を")
  ) {
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole !== undefined) {
      committedRoles[particleIdx] = semanticRole;
      return "continue";
    }
  }
  return "next";
}

function commitTopicFocusParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { span, committedRoles } = run;
  const { particleIdx, surface, ctx } = p;
  if ((surface === "は" || surface === "も") && particleIdx === (span.benefactive?.recipientParticleIdx ?? null)) {
    committedRoles[particleIdx] = {
      role: "benefactive_recipient",
      korean: surface === "も" ? "에게도" : "에게"
    };
    return "continue";
  }
  if (surface === "は" || surface === "も") {
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole?.commitmentSource === COMMITMENT_SOURCE_SLOT_REALIZATION) {
      committedRoles[particleIdx] = semanticRole;
      return "continue";
    }
  }
  return "next";
}

function commitNominalLinkNoParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, span, options, committedRoles, lookups, predicateDictForm } = run;
  const { particleIdx, ctx } = p;
  if (nominalLinkMarkerRelationAt(tokens, particleIdx, { consumers: ["deferred_commitment"] }) !== null) {
    if (span.dekiruReferentParticleIdx === particleIdx) {
      const dekiruAssignment = dekiruReadingParticleAssignment(ctx, span, particleIdx, predicateDictForm);
      if (dekiruAssignment !== undefined) {
        committedRoles[particleIdx] = dekiruAssignment;
        return "continue";
      }
    }
    if (isGaNoConvertedSubjectParticle(tokens, particleIdx, span.start, { clause: options.clause ?? null, lookups })) {
      const potentialAssignment = potentialParticleAssignment(ctx, span, particleIdx);
      if (potentialAssignment !== undefined) {
        committedRoles[particleIdx] = potentialAssignment;
        return "continue";
      }
    }
    if (selectedFrameSlotClaimsParticleSurface(ctx, "の")) {
      const frameAssignment = explicitAuthorParticleAssignment(ctx) ?? selectedSemanticFrameGaSlotAssignment(ctx);
      if (frameAssignment !== undefined) {
        committedRoles[particleIdx] = frameAssignment;
        return "continue";
      }
    }
    if (isLocalNoSubjectCandidate(tokens, particleIdx, span, { clause: options.clause ?? null, lookups })) {
      committedRoles[particleIdx] = { role: "no_subject", allomorphKey: "이/가" };
      return "continue";
    }
    if (isLocalNoExperiencerCandidate(tokens, particleIdx, predicateDictForm)) {
      committedRoles[particleIdx] = { role: "no_experiencer", korean: "에게" };
      return "continue";
    }
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
  }
  return "next";
}

function commitKaraParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { baseCursor, tokens, span, options, committedRoles, lookups, predicateDictForms } = run;
  const { particleIdx, token, referent, ctx } = p;
  if (isCommitmentCaseParticleToken(token, particleIdx, "から", ["格助詞", "接続助詞"])) {
    if (
      !isKaraPerspectiveTail(baseCursor, particleIdx, lookups) &&
      isTimeExpressionBeforeParticle(tokens, particleIdx, lookups, { clause: options.clause ?? null })
    ) {
      committedRoles[particleIdx] = { role: "temporal_source", korean: "부터", commitmentSource: COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT };
      return "continue";
    }
    const benefactiveAgentSubject = benefactiveAgentSubjectContext(span, particleIdx);
    if (benefactiveAgentSubject !== null) {
      committedRoles[particleIdx] = {
        role: "benefactive_agent_subject",
        allomorphKey: "이/가",
        register: benefactiveAgentSubject.honorificLevel ?? "none"
      };
      return "continue";
    }
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole !== undefined) {
      committedRoles[particleIdx] = semanticRole;
      return "continue";
    }
    const neutralTrigger = causativeNeutralTriggerParticleAssignment(ctx, predicateDictForms);
    if (neutralTrigger !== undefined) {
      committedRoles[particleIdx] = neutralTrigger;
      return "continue";
    }
    if (
      !isKaraPerspectiveTail(baseCursor, particleIdx, lookups) &&
      ((referent !== null && isHumanReferentToken(referent, lookups)) || isPersonByContext(tokens, particleIdx, lookups))
    ) {
      committedRoles[particleIdx] = { role: "human_source", korean: "에게서", commitmentSource: COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT };
      return "continue";
    }
  }
  return "next";
}

function commitYoriParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, span, options, committedRoles, lookups } = run;
  const { particleIdx, token, ctx } = p;
  if (isCommitmentCaseParticleToken(token, particleIdx, "より")) {
    if (yoriPrefersTemporalSource(tokens, particleIdx, span, { clause: options.clause ?? null, lookups })) {
      committedRoles[particleIdx] = { role: "temporal_source", korean: "부터", commitmentSource: COMMITMENT_SOURCE_NOUN_SIDE_DEFAULT };
      return "continue";
    }
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
  }
  return "next";
}

function commitDeParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, committedRoles, lookups, predicateDictForm, predicateDictForms, passiveClass } = run;
  const { particleIdx, referent, ctx } = p;
  if (caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
    acceptedSurfaces: ["で"],
    consumers: ["deferred_commitment"]
  }) !== null) {
    if (referent !== null && isHumanCollectiveToken(referent, lookups)) {
      committedRoles[particleIdx] = { role: "human_collective_companion", korean: "함께", attachLeft: false };
      return "continue";
    }
    if (referent !== null && isHumanReferentToken(referent, lookups)) {
      committedRoles[particleIdx] = { role: "human_companion", allomorphKey: "과/와" };
      return "continue";
    }
    if (isPersonCountBeforeDe(tokens, particleIdx, lookups)) {
      committedRoles[particleIdx] = { role: "person_count_subject", allomorphKey: "이/가" };
      return "continue";
    }
    if (passiveClass === "adversative" && referent !== null && isAdversativePassiveDeLocationSource(referent, lookups)) {
      committedRoles[particleIdx] = { role: "adversative_passive_location", korean: "에서" };
      return "continue";
    }
    if (lookups.DE_MOVEMENT_VERBS.has(predicateDictForm)) {
      committedRoles[particleIdx] = { role: "movement_path", allomorphKey: "으로/로" };
      return "continue";
    }
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
    const neutralTrigger = causativeNeutralTriggerParticleAssignment(ctx, predicateDictForms);
    if (neutralTrigger !== undefined) {
      committedRoles[particleIdx] = neutralTrigger;
      return "continue";
    }
  }
  return "next";
}

function commitQuoteToOrHeParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, committedRoles } = run;
  const { particleIdx, token, ctx } = p;
  const quoteToMarker = quoteMarkerRelationAt(tokens, particleIdx, { consumers: ["deferred_commitment"] });
  if (
    (quoteToMarker?.canonicalSurface === "と" && ((tokens[particleIdx]?.pos ?? 0) & POS0) === 助詞) ||
    isCommitmentCaseParticleToken(token, particleIdx, "へ")
  ) {
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
    }
    return "continue";
  }
  return "next";
}

function commitMadeParticle(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { committedRoles } = run;
  const { particleIdx, surface, ctx } = p;
  if (surface === "まで") {
    const explicitAssignment = explicitAuthorParticleAssignment(ctx);
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole !== undefined) {
      committedRoles[particleIdx] = semanticRole;
      return "continue";
    }
  }
  return "next";
}

function commitNiParticleByFrame(run: ParticleRoleCommitRun, p: ParticleRoleStep): ParticleRoleSignal {
  const { tokens, span, particleIndices, options, committedRoles, lookups, predicateDictForm, predicateDictForms } = run;
  const { particleIdx, ctx } = p;
  if (isTimeExpressionBeforeParticle(tokens, particleIdx, lookups, { clause: options.clause ?? null })) {
    const explicitAssignment = explicitAuthorParticleAssignment(ctx, { directCasePreference: true });
    if (explicitAssignment !== undefined) {
      committedRoles[particleIdx] = explicitAssignment;
      return "continue";
    }
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole !== undefined && semanticRole.role === "duration_span") {
      committedRoles[particleIdx] = semanticRole;
    }
    return "continue";
  }

  if (spanIsNareruBecomePotential(span)) {
    committedRoles[particleIdx] = { role: "nareru_become_subject", allomorphKey: "이/가" };
    return "continue";
  }

  if (predicateDictForm === "向ける" && !particleIndices.some((idx) => isCommitmentCaseParticle(tokens, idx, "を"))) {
    committedRoles[particleIdx] = { role: "ni_muketa_object", allomorphKey: "을/를" };
    return "continue";
  }

  const nextToken = tokens[particleIdx + 1];
  if (nextToken?.dictionaryForm === "する" && nextToken.pos !== 0 && (nextToken.pos & POS5A) === 命令形_) {
    return "continue";
  }

  if (predicateDictForm === "なる") {
    const semanticRole = semanticRoleParticleAssignment(ctx);
    if (semanticRole?.commitmentSource === COMMITMENT_SOURCE_SLOT_REALIZATION) {
      committedRoles[particleIdx] = semanticRole;
    }
    return "continue";
  }

  const benefactiveAgentSubject = benefactiveAgentSubjectContext(span, particleIdx);
  if (benefactiveAgentSubject !== null) {
    committedRoles[particleIdx] = {
      role: "benefactive_agent_subject",
      allomorphKey: "이/가",
      register: benefactiveAgentSubject.honorificLevel ?? "none"
    };
    return "continue";
  }

  const explicitAssignment = explicitAuthorParticleAssignment(ctx);
  if (explicitAssignment !== undefined) {
    committedRoles[particleIdx] = explicitAssignment;
    return "continue";
  }
  const neutralTrigger = causativeNeutralTriggerParticleAssignment(ctx, predicateDictForms);
  if (neutralTrigger !== undefined) {
    committedRoles[particleIdx] = neutralTrigger;
    return "continue";
  }
  const allowedNiRole = semanticRoleParticleAssignment(ctx, {
    allowedRoles: new Set([
      "assignment",
      "attention_object",
      "awareness_target",
      "dispatch_destination",
      "event",
      "office_role",
      "perception_location",
      "perception_stimulus",
      "preference_target",
      "rank_goal",
      "seat_location",
      "standard",
      "state_entry",
      "stimulus",
      "trap_location",
      "vehicle",
      "platform",
      "carrier",
      "work_domain",
      "work_start_object"
    ])
  });
  if (allowedNiRole !== undefined) {
    committedRoles[particleIdx] = allowedNiRole;
    return "continue";
  }

  const stateReturnGoal = stateReturnGoalAssignment(ctx, predicateDictForms);
  if (stateReturnGoal !== undefined) {
    committedRoles[particleIdx] = stateReturnGoal;
    return "continue";
  }

  const niLimitComplement = niLimitComplementParticleAssignment(ctx, predicateDictForms);
  if (niLimitComplement !== undefined) {
    committedRoles[particleIdx] = niLimitComplement;
    return "continue";
  }
  return "next";
}

function commitNiParticleByAnimacy(run: ParticleRoleCommitRun, p: ParticleRoleStep): void {
  const { tokens, committedRoles, lookups, predicateDictForm, supportPredicateDictForm, passiveClass, adversativeAgentPromoted } = run;
  const { particleIdx, ctx } = p;
  if (isAnimateReferentBeforeNi(tokens, particleIdx, lookups)) {
    if (passiveClass === "causative_coercive") {
      committedRoles[particleIdx] = {
        role: "causative_agent_subject",
        allomorphKey: "이/가",
        register: isRespectReferentBeforeParticle(tokens, particleIdx, lookups) ? "respect" : "none"
      };
      return;
    }
    if (adversativeAgentPromoted) {
      committedRoles[particleIdx] = {
        role: "adversative_agent_subject",
        allomorphKey: "이/가",
        register: isRespectReferentBeforeParticle(tokens, particleIdx, lookups) ? "respect" : "none"
      };
      return;
    }
    if (lookups.NI_ACCUSATIVE_PERSON.has(predicateDictForm)) {
      committedRoles[particleIdx] = { role: "animate_object", allomorphKey: "을/를" };
    } else {
      const semanticRole = semanticRoleParticleAssignment(ctx);
      if (semanticRole !== undefined) {
        committedRoles[particleIdx] = {
          ...semanticRole,
          register: isRespectReferentBeforeParticle(tokens, particleIdx, lookups) ? "respect" : "none"
        };
        return;
      }
      committedRoles[particleIdx] = {
        role: "animate_recipient",
        allomorphKey: "에게",
        register: isRespectReferentBeforeParticle(tokens, particleIdx, lookups) ? "respect" : "none"
      };
    }
    return;
  }

  if (
    lookups.NI_ACCUSATIVE_UNIVERSAL.has(predicateDictForm) &&
    !isTemporalConditionHeadBeforeNi(tokens, particleIdx, lookups)
  ) {
    committedRoles[particleIdx] = { role: "ni_object", allomorphKey: "을/를" };
    return;
  }

  if (
    (
      lookups.NI_INSTRUMENTAL_VERBS.has(predicateDictForm) ||
      supportPredicateAllowsNiInstrument(tokens, particleIdx, supportPredicateDictForm, lookups)
    ) &&
    !precedingIsIdiomNoun(tokens, particleIdx, lookups) &&
    !isTemporalConditionHeadBeforeNi(tokens, particleIdx, lookups)
  ) {
    committedRoles[particleIdx] = { role: "ni_instrument", allomorphKey: "으로/로" };
  }
}

function stateReturnGoalAssignment(
  ctx: ParticleCommitmentContext,
  predicateDictForms: readonly string[]
): ParticleAssignment | undefined {
  const { tokens, particleIdx, lookups } = ctx;
  if (!predicateDictForms.some((form) => lookups.NI_STATE_RETURN_VERBS.has(form))) {
    return undefined;
  }
  const referentIdx = getReferentIndexBeforeParticle(tokens, particleIdx, lookups);
  if (referentIdx === null) {
    return undefined;
  }
  const referent = tokens[referentIdx];
  if (referent === undefined) {
    return undefined;
  }
  const head = referent.dictionaryForm ?? referent.surface;
  if (lookups.NI_RETURN_STATE_NOUNS.has(head) || lookups.NI_RETURN_STATE_NOUNS.has(referent.surface)) {
    return { role: "identity_return_goal", allomorphKey: "으로/로" };
  }
  const isIdentityReferent =
    lookups.NI_IDENTITY_FIRST_PERSON.has(head) ||
    lookups.NI_IDENTITY_FIRST_PERSON.has(referent.surface) ||
    lookups.REFLEXIVE_SELF_NOUNS.has(head) ||
    lookups.REFLEXIVE_SELF_NOUNS.has(referent.surface);
  if (isIdentityReferent && precedingHasOriginQualifier(tokens, referentIdx, lookups)) {
    return { role: "identity_return_goal", allomorphKey: "으로/로" };
  }
  const isBareStateReferent =
    lookups.NI_RETURN_STATE_ANIMATE_NOUNS.has(head) ||
    lookups.NI_RETURN_STATE_ANIMATE_NOUNS.has(referent.surface) ||
    lookups.REFLEXIVE_SELF_NOUNS.has(head) ||
    lookups.REFLEXIVE_SELF_NOUNS.has(referent.surface);
  if (isBareStateReferent && ctx.layout !== null && ctx.predicateIdx !== null) {
    const subjectAnimacy = subjectAnimacyForPredicate(tokens, ctx.predicateIdx, ctx.layout, lookups);
    if (subjectAnimacy !== "inanimate") {
      return { role: "identity_return_goal", allomorphKey: "으로/로" };
    }
  }
  return undefined;
}

function niLimitComplementParticleAssignment(
  ctx: ParticleCommitmentContext,
  predicateDictForms: readonly string[]
): ParticleAssignment | undefined {
  if (ctx.tokens[ctx.particleIdx]?.surface !== "に") {
    return undefined;
  }
  if (!predicateDictForms.some((form) => ctx.lookups.NI_LIMIT_COMPLEMENT_VERBS.has(form))) {
    return undefined;
  }
  return { role: "limit_complement", korean: "에" };
}

function precedingHasOriginQualifier(
  tokens: readonly CommitmentToken[],
  referentIdx: number,
  lookups: LookupTables
): boolean {
  const noToken = tokens[referentIdx - 1];
  if (noToken === undefined || noToken.surface !== "の" || (noToken.pos & POS0) !== 助詞) {
    return false;
  }
  const qualifier = tokens[referentIdx - 2];
  if (qualifier === undefined) {
    return false;
  }
  const head = qualifier.dictionaryForm ?? qualifier.surface;
  return lookups.NI_IDENTITY_ORIGIN_QUALIFIERS.has(head) || lookups.NI_IDENTITY_ORIGIN_QUALIFIERS.has(qualifier.surface);
}

function causativeNeutralTriggerParticleAssignment(
  ctx: ParticleCommitmentContext,
  predicateDictForms: readonly string[]
): ParticleAssignment | undefined {
  const canonicalSurface = causativeNeutralTriggerParticleSurface(ctx.tokens, ctx.particleIdx);
  if (canonicalSurface === null) {
    return undefined;
  }
  if (ctx.span.passiveClass !== "causative_passive_neutral") {
    return undefined;
  }
  if (!predicateDictForms.some((form) => ctx.lookups.CAUSATIVE_PASSIVE_NEUTRAL_VERBS.has(form))) {
    return undefined;
  }
  if (ctx.semanticRoleAssignments.has(ctx.particleIdx)) {
    return undefined;
  }
  if (ctx.particleIdx === (ctx.span.benefactive?.agentParticleIdx ?? null) || ctx.particleIdx === (ctx.span.benefactive?.recipientParticleIdx ?? null)) {
    return undefined;
  }
  if (particleIsFollowedByTopicFocus(ctx.tokens, ctx.particleIdx)) {
    return undefined;
  }

  const renderEnabled = predicateDictForms.some((form) => ctx.lookups.CAUSATIVE_PASSIVE_NEUTRAL_TRIGGER_VERBS.has(form));
  const referent = getReferentTokenBeforeParticle(ctx.tokens, ctx.particleIdx, ctx.lookups);
  const animateNi = canonicalSurface === "に" && isAnimateReferentBeforeNi(ctx.tokens, ctx.particleIdx, ctx.lookups);

  if (animateNi && renderEnabled) {
    recordCausativeNeutralTriggerCandidate(ctx, predicateDictForms, {
      triggerKind: "animate_ni",
      renderEnabled: true,
      reason: "animate_trigger_in_enabled_neutral_family",
      output: "덕분에",
      referent
    });
    return {
      role: "causative_neutral_trigger",
      korean: "덕분에",
      attachLeft: false,
      commitmentSource: COMMITMENT_SOURCE_CAUSATIVE_NEUTRAL_TRIGGER
    };
  }

  const triggerKind = canonicalSurface === "に"
    ? animateNi ? "animate_ni_non_enabled_family" : "event_or_inanimate_ni"
    : canonicalSurface === "で"
      ? "event_or_medium_de"
      : "source_kara";
  recordCausativeNeutralTriggerCandidate(ctx, predicateDictForms, {
    triggerKind,
    renderEnabled: false,
    reason: renderEnabled ? "surface_policy_audit_only" : "predicate_family_audit_only",
    output: null,
    referent
  });
  return undefined;
}

function causativeNeutralTriggerParticleSurface(tokens: readonly CommitmentToken[], particleIdx: number): "に" | "で" | "から" | null {
  const token = tokens[particleIdx];
  if (isCommitmentCaseParticleToken(token, particleIdx, "に")) {
    return "に";
  }
  if (caseParticleMarkerRelationForToken(token, particleIdx, {
    acceptedSurfaces: ["で"],
    consumers: ["deferred_commitment"]
  }) !== null) {
    return "で";
  }
  if (isCommitmentCaseParticleToken(token, particleIdx, "から", ["格助詞", "接続助詞"])) {
    return "から";
  }
  return null;
}

function particleIsFollowedByTopicFocus(tokens: readonly CommitmentToken[], particleIdx: number): boolean {
  return topicFocusMarkerRelationForToken(tokens[particleIdx + 1], particleIdx + 1, {
    acceptedSurfaces: ["は", "も"],
    consumers: ["deferred_commitment"]
  }) !== null;
}

function recordCausativeNeutralTriggerCandidate(
  ctx: ParticleCommitmentContext,
  predicateDictForms: readonly string[],
  detail: {
    readonly triggerKind: string;
    readonly renderEnabled: boolean;
    readonly reason: string;
    readonly output: string | null;
    readonly referent: CommitmentToken | null;
  }
): void {
  if (ctx.trace === null || ctx.predicateIdx === null) {
    return;
  }
  ctx.trace.record(new TraceEvent(
    ctx.predicateIdx,
    "commitment",
    "causative_neutral_trigger_candidate",
    true,
    withTraceClauseIdx(traceDetail({
      particle_idx: ctx.particleIdx,
      surface: ctx.surface,
      role: "causative_neutral_trigger",
      trigger_kind: detail.triggerKind,
      render_enabled: detail.renderEnabled,
      reason: detail.reason,
      output: detail.output,
      predicate_dict_forms: predicateDictForms,
      referent_surface: detail.referent?.surface ?? null,
      referent_dict_form: detail.referent?.dictionaryForm ?? null,
      referent_respect: isRespectReferentToken(detail.referent, ctx.lookups)
    }), ctx.traceClauseIdx)
  ));
}

function supportPredicateAllowsNiInstrument(
  tokens: readonly CommitmentToken[],
  particleIdx: number,
  supportPredicateDictForm: string | null,
  lookups: LookupTables
): boolean {
  if (supportPredicateDictForm === null || !lookups.NI_INSTRUMENTAL_VERBS.has(supportPredicateDictForm)) {
    return false;
  }
  const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
  if (referent === null || (referent.pos & POS0) !== 名詞) {
    return false;
  }
  return tokenHasAnySuffix(referent, lookups.NI_INSTRUMENTAL_MANNER_SUFFIXES);
}

function tokenHasAnySuffix(token: CommitmentToken, suffixes: ReadonlySet<string>): boolean {
  return [token.dictionaryForm, token.surface]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .some((value) => [...suffixes].some((suffix) => value.endsWith(suffix)));
}

export function particleIndicesForCommitment(
  baseParticleIndices: readonly number[],
  slotRealizationEffects: readonly SlotRealizationEffect[],
  predIdx: number,
  layout: ClauseLayout
): readonly number[] {
  if (slotRealizationEffects.length === 0) {
    return baseParticleIndices;
  }
  const indices = new Set(baseParticleIndices);
  for (const effect of slotRealizationEffects) {
    if (
      effect.caseOverride !== null &&
      effect.filler.particleIdx >= 0 &&
      slotRealizationParticleCanBeCommitted(effect, predIdx, layout)
    ) {
      indices.add(effect.filler.particleIdx);
    }
  }
  return [...indices].sort((left, right) => left - right);
}

function explicitAuthorParticleAssignment(
  ctx: ParticleCommitmentContext,
  options: { readonly directCasePreference?: boolean } = {}
): ParticleAssignment | undefined {
  const preferred = options.directCasePreference === true
    ? directTranslationCasePreferenceAssignment(ctx.span, ctx.surface)
    : translationCasePreferenceAssignment(ctx.span, ctx.tokens, ctx.particleIdx, { clause: ctx.clause, lookups: ctx.lookups });
  if (preferred !== undefined) {
    return preferred;
  }
  return semanticCaseRealizationAssignment(ctx.semanticRoleAssignments, ctx.particleIdx);
}

function semanticRoleParticleAssignment(
  ctx: ParticleCommitmentContext,
  options: { readonly allowedRoles?: ReadonlySet<string> | null } = {}
): ParticleAssignment | undefined {
  const assignment = ctx.semanticRoleAssignments.get(ctx.particleIdx);
  if (assignment === undefined) {
    return undefined;
  }
  const allowedRoles = options.allowedRoles ?? null;
  if (allowedRoles !== null && !allowedRoles.has(assignment.role)) {
    return undefined;
  }
  return assignment;
}

function semanticCaseRealizationAssignment(assignments: ReadonlyMap<number, ParticleAssignment>, particleIdx: number): ParticleAssignment | undefined {
  const assignment = assignments.get(particleIdx);
  if (assignment === undefined) {
    return undefined;
  }
  return assignment.commitmentSource === COMMITMENT_SOURCE_CASE_REALIZATION || assignment.commitmentSource === COMMITMENT_SOURCE_SLOT_REALIZATION
    ? assignment
    : undefined;
}

function benefactiveAgentSubjectContext(span: CommitmentSpan, particleIdx: number): BenefactiveContext | null {
  const benefactive = span.benefactive ?? null;
  if (benefactive === null) {
    return null;
  }
  if (benefactive.needsBenefactivePivot !== true) {
    return null;
  }
  if (particleIdx !== (benefactive.agentParticleIdx ?? null)) {
    return null;
  }
  return benefactive.causativeAgentPolicy === "lexical_argument_preferred" ? null : benefactive;
}

function translationCasePreferenceAssignment(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  particleIdx: number,
  options: { readonly clause?: Clause | null; readonly lookups: LookupTables }
): ParticleAssignment | undefined {
  const surface = tokens[particleIdx]?.surface;
  if (surface === undefined) {
    return undefined;
  }
  if (
    caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
      acceptedSurfaces: ["に", "で", "から", "より"],
      consumers: ["deferred_commitment"]
    }) !== null &&
    isTimeExpressionBeforeParticle(tokens, particleIdx, options.lookups, { clause: options.clause ?? null })
  ) {
    return undefined;
  }
  const preference = resolveSelectedCasePreference(span, surface);
  return preference === undefined ? undefined : casePreferenceToAssignment(preference);
}

function directTranslationCasePreferenceAssignment(span: CommitmentSpan, surface: string): ParticleAssignment | undefined {
  const preference = resolveSelectedCasePreference(span, surface);
  return preference === undefined ? undefined : casePreferenceToAssignment(preference);
}

function resolveSelectedCasePreference(span: CommitmentSpan, surface: string): CasePreference | undefined {
  const selectedKorean = selectedKoreanForCasePreference(span);
  return selectedKorean === null ? undefined : resolveCasePreference(span.entry, surface, { selectedKorean });
}

function selectedKoreanForCasePreference(span: CommitmentSpan): string | null {
  const candidate = selectedCommitmentCandidate(span);
  return nonEmptyKorean(candidate?.translation?.korean) ??
    nonEmptyKorean(candidate?.koreanLemma) ??
    nonEmptyKorean(candidate?.entry?.senses?.[0]?.korean) ??
    singleSenseKorean(span.entry) ??
    null;
}

function singleSenseKorean(entry: CommitmentEntry | null | undefined): string | null {
  const senses = entry?.senses ?? [];
  return senses.length === 1 ? nonEmptyKorean(senses[0]?.korean) : null;
}

function nonEmptyKorean(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.length === 0 ? null : value;
}

function spanIsPotential(span: CommitmentSpan): boolean {
  return span.voice === "potential";
}

function spanIsNareruBecomePotential(span: CommitmentSpan): boolean {
  return setEquals(span.nareruReadings ?? new Set(), new Set<NareruReading>(["become_potential"]));
}

function spanIsKeijoujiPreferenceBecomePotential(tokens: readonly CommitmentToken[], span: CommitmentSpan, particleIdx: number): boolean {
  if (tokens[span.start]?.dictionaryForm !== "なれる" || span.nareruReadings?.has("become_potential") !== true) {
    return false;
  }
  const copula = tokens[span.start - 1];
  if (copula === undefined || (copula.pos & POS0) !== 助動詞 || copula.dictionaryForm !== "だ") {
    return false;
  }
  const host = tokens[span.start - 2];
  if (host === undefined || (host.dictionaryForm !== "好き" && host.dictionaryForm !== "嫌い")) {
    return false;
  }
  return particleIdx < span.start - 2;
}

function hasDekiruReading(span: CommitmentSpan, reading: DekiruReading): boolean {
  return span.dekiruReadings?.has(reading) === true;
}

function dekiruReadingParticleAssignment(
  ctx: ParticleCommitmentContext,
  span: CommitmentSpan,
  particleIdx: number,
  predicateDictForm: string
): ParticleAssignment | undefined {
  if (predicateDictForm !== "できる" && predicateDictForm !== "出来る") {
    return undefined;
  }
  if (hasDekiruReading(span, "ability")) {
    return span.dekiruReferentParticleIdx === particleIdx && abilityArgumentRole(ctx) === "agent"
      ? { role: "dekiru_ability_experiencer", allomorphKey: "이/가" }
      : { role: "dekiru_ability_object", allomorphKey: "을/를" };
  }
  if (hasDekiruReading(span, "completion") && span.dekiruCompletionDoReferent === true) {
    return { role: "dekiru_completion_do_object", allomorphKey: "을/를" };
  }
  if (hasDekiruReading(span, "availability")) {
    return { role: "dekiru_availability_subject", korean: "" };
  }
  return undefined;
}

function potentialParticleAssignment(
  ctx: ParticleCommitmentContext,
  span: CommitmentSpan,
  particleIdx: number
): ParticleAssignment | undefined {
  if (!spanIsPotential(span)) {
    return undefined;
  }
  if (span.rareruAbilitySubjectParticleIdx === particleIdx) {
    return { role: "potential_subject", allomorphKey: "이/가" };
  }
  if (spanIsNareruBecomePotential(span)) {
    return { role: "nareru_become_potential_subject", allomorphKey: "이/가" };
  }
  if (abilityArgumentRole(ctx) === "agent") {
    return {
      role: "potential_experiencer_head_gap",
      allomorphKey: "이/가",
      commitmentSource: "relative_head_gap"
    };
  }
  return { role: "potential_object", allomorphKey: "을/를" };
}

type AbilityArgumentRole = "object" | "agent";

function abilityArgumentRole(ctx: ParticleCommitmentContext): AbilityArgumentRole {
  const referent = getReferentTokenBeforeParticle(ctx.tokens, ctx.particleIdx, ctx.lookups);
  if (referent === null) {
    return "object";
  }
  if (predicateOwnsExplicitWoObject(ctx)) {
    return "agent";
  }
  if (abilityBaseVerbHasNoAnimateObjectSlot(ctx) && isAnimateAbilityArgumentToken(referent, ctx.lookups)) {
    return "agent";
  }
  if (!isStrongAbilityAgentToken(referent, ctx.lookups)) {
    return "object";
  }
  const head = abilityGapFillingHead(ctx);
  if (head !== null && isAbilityAgentToken(head, ctx.lookups)) {
    return "object";
  }
  return "agent";
}

function predicateDirectlyOwnsWoObject(ctx: ParticleCommitmentContext): boolean {
  if (ctx.layout === null || ctx.predicateIdx === null) {
    return false;
  }
  return hasExplicitWoObject(ctx.tokens, argumentParticleIndicesForPredicate(ctx.predicateIdx, ctx.tokens, ctx.layout));
}

function abilityBaseVerbHasNoAnimateObjectSlot(ctx: ParticleCommitmentContext): boolean {
  const verbs = ctx.lookups.SEMANTIC_ANIMATE_GA_SUBJECT_VERBS;
  return abilityBaseVerbForms(ctx.span, ctx.tokens[ctx.span.start]).some((form) => verbs.has(form));
}

function abilityBaseVerbForms(span: CommitmentSpan, token: CommitmentToken | undefined): readonly string[] {
  const forms: string[] = [];
  const add = (form: string | undefined): void => {
    if (form !== undefined && form.length > 0 && !forms.includes(form)) {
      forms.push(form);
    }
  };
  add(token?.dictionaryForm);
  const derivations = [selectedCommitmentCandidate(span)?.derivation, ...entryDerivations(span.entry)];
  for (const derivation of derivations) {
    if (derivation?.id === "potential") {
      add(derivation.baseForm);
    }
  }
  return forms;
}

function isAnimateAbilityArgumentToken(token: CommitmentToken, lookups: LookupTables): boolean {
  return !isSahenCapableNominal(token) && (isAnimateReferentToken(token, lookups) || isHumanCollectiveToken(token, lookups));
}

function predicateOwnsExplicitWoObject(ctx: ParticleCommitmentContext): boolean {
  if (ctx.clause === null || ctx.predicateIdx === null) {
    return false;
  }
  return hasExplicitWoObject(ctx.tokens, ctx.clause.particlesOf(ctx.predicateIdx));
}

function isStrongAbilityAgentToken(token: CommitmentToken, lookups: LookupTables): boolean {
  if (isSahenCapableNominal(token)) {
    return false;
  }
  const forms = getReferentForms(token.dictionaryForm || token.surface, lookups);
  if (forms.some((form) => lookups.GANO_NO_ABILITY_AGENT_NOUNS.has(form)) || isHumanCollectiveToken(token, lookups)) {
    return true;
  }
  if ((token.pos & POS0) === 代名詞) {
    return forms.some((form) =>
      lookups.HUMAN_PRONOUN_BASES.has(form) ||
      lookups.PERSON_PRONOUNS.has(form) ||
      lookups.SECOND_PERSON_PRONOUNS.has(form)
    );
  }
  if (isProperPersonNameToken(token)) {
    return forms.some((form) => lookups.PERSON_NOUNS.has(form));
  }
  return false;
}

function abilityGapFillingHead(ctx: ParticleCommitmentContext): CommitmentToken | null {
  const headIdx = attributiveHeadIndexForPredicate(ctx);
  const head = headIdx === null ? null : ctx.tokens[headIdx] ?? null;
  if (headIdx === null || head === null || isAbilityAdjunctHead(head, ctx.lookups)) {
    return null;
  }
  if (predicateInterveningBeforeHead(ctx, headIdx)) {
    return null;
  }
  if (isCommitmentCaseParticleToken(ctx.tokens[headIdx + 1], headIdx + 1, "と")) {
    return null;
  }
  return head;
}

function predicateInterveningBeforeHead(ctx: ParticleCommitmentContext, headIdx: number): boolean {
  for (let idx = ctx.span.start + ctx.span.consumed; idx < headIdx; idx += 1) {
    const pos0 = (ctx.tokens[idx]?.pos ?? 0) & POS0;
    if (pos0 === 動詞 || pos0 === 形容詞0) {
      return true;
    }
  }
  return false;
}

function isAbilityAdjunctHead(token: CommitmentToken, lookups: LookupTables): boolean {
  return isAdverbCapableNominal(token) ||
    isTemporalArgumentToken(token, lookups) ||
    isPlaceNoun(token, lookups) ||
    lookups.GANO_NO_ABILITY_ADJUNCT_HEADS.has(token.dictionaryForm || token.surface);
}

function isAbilityAgentToken(token: CommitmentToken, lookups: LookupTables): boolean {
  if (isProperPersonNameToken(token) || isProperPlaceNameToken(token)) {
    return false;
  }
  if (isSahenCapableNominal(token)) {
    return false;
  }
  if ((token.pos & POS0) === 代名詞) {
    const form = token.dictionaryForm || token.surface;
    if (lookups.PERSON_PRONOUNS.has(form) || lookups.SECOND_PERSON_PRONOUNS.has(form)) {
      return true;
    }
  }
  return isHumanReferentToken(token, lookups) || isHumanCollectiveToken(token, lookups);
}

function selectedFrameSlotClaimsParticleSurface(ctx: ParticleCommitmentContext, surface: string): boolean {
  return semanticFrameSlotForParticle(ctx)?.filler.frameParticle === surface;
}

function spanCanHostLocalNoSubject(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "attributive") {
    return true;
  }
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const stemKind = attributiveTailStemKind(plan.realization.root.tail);
  return stemKind === "verb" || stemKind === "adj";
}

function attributiveTailStemKind(node: TailNode): "verb" | "adj" | "noun" | null {
  if (node.kind === "connective") {
    return attributiveTailStemKind(node.outer);
  }
  if (
    node.terminal !== "attributive" &&
    !(node.terminal === null && node.ops.at(-1)?.kind === "connective" && !node.ops.some((op) => op.kind === "copula"))
  ) {
    return null;
  }
  if (node.stem.kind === "adverb") {
    return null;
  }
  if (node.stem.kind !== "candidateSet") {
    return node.stem.kind;
  }
  switch (node.stem.sourcePredicateShape) {
    case "verb":
    case "sahen_verbalization":
      return "verb";
    case "i_adjective":
    case "na_adjective":
      return "adj";
    case "nominal":
    case "particle_phrase":
      return "noun";
  }
  if (stemSupportsProjectionCategory(node.stem, "adjectival_predicate")) {
    return "adj";
  }
  if (stemSupportsProjectionCategory(node.stem, "verbal_predicate")) {
    return "verb";
  }
  if (stemSupportsProjectionCategory(node.stem, "nominal")) {
    return "noun";
  }
  return null;
}

function predicateEventKey(tokens: readonly CommitmentToken[], span: CommitmentSpan): string {
  const tailKey = tailParserPredicateEventKey(span.renderPlan ?? null);
  if (tailKey !== null) {
    return tailKey;
  }
  const predicateDictForm = span.entry?.dictionaryForm ?? "";
  if (predicateDictForm === "する" && span.start > 0) {
    const prev = tokens[span.start - 1];
    if (prev !== undefined && prev.pos !== 0 && (prev.pos & (POS0 | POS2)) === (名詞 | サ変可能)) {
      const noun = prev.dictionaryForm || prev.surface;
      if (noun.length > 0) {
        return `${noun}する`;
      }
    }
  }
  return predicateDictForm;
}

function yoriPrefersTemporalSource(
  tokens: readonly CommitmentToken[],
  particleIdx: number,
  span: CommitmentSpan,
  options: { readonly clause?: Clause | null; readonly lookups: LookupTables }
): boolean {
  if (!isTimeExpressionBeforeParticle(tokens, particleIdx, options.lookups, { clause: options.clause ?? null })) {
    return false;
  }
  return options.lookups.TEMPORAL_YORI_SOURCE_EVENT_PREDICATES.has(predicateEventKey(tokens, span));
}

function isLocalNoSubjectCandidate(
  tokens: readonly CommitmentToken[],
  particleIdx: number,
  span: CommitmentSpan,
  options: { readonly clause?: Clause | null; readonly lookups: LookupTables }
): boolean {
  const lookups = options.lookups;
  const predicateDictForm = span.entry?.dictionaryForm ?? "";
  if (NO_EXPERIENCER_KEIJOUJI.has(predicateDictForm)) {
    return false;
  }
  const clause = options.clause ?? null;
  if (clause !== null && clause.kind === "relative" && clause.start <= particleIdx && particleIdx < clause.end) {
    if (!spanCanHostLocalNoSubject(span)) {
      return false;
    }
    if (!isGaNoConvertedSubjectParticle(tokens, particleIdx, span.start, { clause, lookups })) {
      return false;
    }
    const adjectivalPredicate = span.koreanPos === 형용사;
    const sourceVerbAllowsGaNo = adjectivalPredicate &&
      lookups.named("gano_no_subject_stative_verbs")?.has(predicateDictForm) === true &&
      (
        lookups.named("gano_no_subject_stative_verbs_nonindependent_only")?.has(predicateDictForm) !== true ||
        isNonIndependentVerbToken(tokens[span.start] ?? { pos: 0 })
      );
    if (
      adjectivalPredicate &&
      !sourceVerbAllowsGaNo &&
      !isNoSubjectAdjectiveAllowed(tokens, particleIdx, predicateDictForm, lookups)
    ) {
      return false;
    }
    return PREDICATE_POS.has(span.koreanPos) || span.isKeijoujiVerbPredicate === true;
  }
  if (span.koreanPos !== 동사) {
    return false;
  }
  if (!spanCanHostLocalNoSubject(span)) {
    return false;
  }
  if (noParticleShouldRemainNominalModifier(tokens, particleIdx, { clause, lookups })) {
    return false;
  }
  for (let idx = particleIdx + 1; idx < Math.min(particleIdx + 4, tokens.length); idx += 1) {
    const pos0 = (((tokens[idx]?.pos ?? 0) & POS0));
    if (pos0 === 動詞) {
      return true;
    }
    if (pos0 === 形状詞) {
      return span.isKeijoujiVerbPredicate === true;
    }
    if (pos0 === 副詞) {
      continue;
    }
    break;
  }
  return false;
}

function isLocalNoExperiencerCandidate(tokens: readonly CommitmentToken[], particleIdx: number, predicateDictForm: string): boolean {
  for (let idx = particleIdx + 1; idx < Math.min(particleIdx + 4, tokens.length); idx += 1) {
    const token = tokens[idx];
    const pos0 = (((token?.pos ?? 0) & POS0));
    if ((pos0 === 形状詞) || (pos0 === 名詞)) {
      return token !== undefined && NO_EXPERIENCER_KEIJOUJI.has(token.dictionaryForm) && NO_EXPERIENCER_KEIJOUJI.has(predicateDictForm);
    }
    if ((pos0 === 副詞)) {
      continue;
    }
    break;
  }
  return false;
}

function isNoSubjectAdjectiveAllowed(tokens: readonly CommitmentToken[], particleIdx: number, predicateDictForm: string, lookups: LookupTables): boolean {
  if (lookups.GANO_NO_SUBJECT_ADJECTIVE_ALLOWLIST.has(predicateDictForm)) {
    return true;
  }
  const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
  if (referent === null) {
    return false;
  }
  const referentDictForm = referent.dictionaryForm || referent.surface;
  return lookups.GANO_NO_SUBJECT_ADJECTIVE_PAIRS.has(pairKey(referentDictForm, predicateDictForm));
}

function setEquals<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}
