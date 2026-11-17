
import type { MorphemeSense } from "../../types/dictionary.js";
import { adverbializationActivationMatches } from "../lexical-particle-boundary-claims.js";
import { type PatternRuntimeToken } from "../pattern-runtime.js";
import { derivationForSense, derivationOrder } from "../../dictionary/derivation.js";
import type { NominalProjectionKind, RuleTraceDetailValue, TranslationCandidate } from "../../types/pipeline.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TranslationCandidate as ContentTranslationCandidate } from "../content-types.js";
import { hasFrameSourceConditions, type FrameJsonMap } from "../semantics/frame.js";
import { type CandidateGrammar } from "../candidate-runtime.js";
import { matchTeKudasaiChain } from "../semantics/request-evidence.js";
import type { LookupTables } from "../lookup-tables.js";
import { conjugate, predicateStemRoot } from "../../generator/conjugator.js";
import { TokenCursor } from "../token-cursor.js";
import type { ContentResolverEntry, ContentResolverTranslation } from "./types.js";
import { POS0, 助詞, 부사 } from "../../types/pos.js";
import { 명사, 형용사, 동사 } from "../../types/pos.js";
import { teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";


export function translationCandidateDedupeMarker(translation: MorphemeSense): readonly ["sense", number] | readonly ["frame", string] | undefined {
  const senseIndex = translation.senseIndex;
  if (typeof senseIndex === "number") {
    return ["sense", senseIndex];
  }
  const frame = translation.senseFrame;
  const frameId = frame?.id ?? frame?.frameId;
  return typeof frameId === "string" ? ["frame", frameId] : undefined;
}

export function entryHasDeferredFrameConditionCandidates(entry: ContentResolverEntry): boolean {
  return (entry.senses ?? []).some(translationHasDeferredFrameConditions);
}

export function translationHasSourceFrameConditions(translation: ContentResolverTranslation): boolean {
  const frames = Array.isArray(translation.senseFrames)
    ? translation.senseFrames
    : [translation.senseFrame];
  return frames.some((frame): frame is FrameJsonMap =>
    typeof frame === "object" &&
    frame !== null &&
    !Array.isArray(frame) &&
    hasFrameSourceConditions(frame as FrameJsonMap)
  );
}

export function translationHasDeferredFrameConditions(translation: ContentResolverTranslation): boolean {
  const frames = Array.isArray(translation.senseFrames)
    ? translation.senseFrames
    : [translation.senseFrame];
  return frames.some((frame) =>
    typeof frame === "object" &&
    frame !== null &&
    !Array.isArray(frame) &&
    frameNeedsDeferredConditionEvaluation(frame as FrameJsonMap)
  );
}

function frameNeedsDeferredConditionEvaluation(frame: FrameJsonMap): boolean {
  if (["slots", "chainConditions", "clauseConditions", "participantConditions", "connectiveRole"].some((key) => key in frame)) {
    return true;
  }
  const lexical = frame.lexicalConditions;
  return typeof lexical === "object" &&
    lexical !== null &&
    !Array.isArray(lexical) &&
    ("connectiveRole" in lexical || "asSuruVerbClauseScoped" in lexical);
}

export function translationNeedsFinalClauseLayoutForSourceMatch(translation: ContentResolverTranslation): boolean {
  const frames = Array.isArray(translation.senseFrames)
    ? translation.senseFrames
    : [translation.senseFrame];
  return frames.some((frame) =>
    typeof frame === "object" &&
    frame !== null &&
    !Array.isArray(frame) &&
    (
      "clauseConditions" in frame ||
      "participantConditions" in frame ||
      lexicalConditionsNeedFinalClauseLayoutForSourceMatch(frame as FrameJsonMap)
    )
  );
}

function lexicalConditionsNeedFinalClauseLayoutForSourceMatch(frame: FrameJsonMap): boolean {
  const lexical = frame.lexicalConditions;
  return typeof lexical === "object" &&
    lexical !== null &&
    !Array.isArray(lexical) &&
    "asSuruVerbClauseScoped" in lexical;
}

export function hasRequestTail(cursor: TokenCursor<PatternRuntimeToken>, lookups: LookupTables): boolean {
  if (cursor.lookahead(0, c => matchTeKudasaiChain(c)) !== undefined) {
    return true;
  }
  if (cursor.peek(1) === undefined) {
    return false;
  }
  const relation = teDeContinuationRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_resolver"], lookups });
  return relation?.continuationKind === "request";
}

export function hasBenefactiveTail(cursor: TokenCursor<PatternRuntimeToken>, lookups: LookupTables): boolean {
  if (cursor.peek(1) === undefined) {
    return false;
  }
  const relation = teDeContinuationRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_resolver"], lookups });
  return relation?.continuationKind === "benefactive";
}

export function candidateDedupeKey(candidate: TranslationCandidate): string {
  return JSON.stringify([
    candidate.conditions,
    candidate.koreanPos,
    candidate.derivation?.id ?? derivationForSense(candidate.translation, candidate.entry).id,
    candidate.lexicalParticleAdverbial === undefined || candidate.lexicalParticleAdverbial === null
      ? null
      : ["lexical_particle_adverbial", candidate.lexicalParticleAdverbial.particleIdx],
    candidate.projectionOrdinal,
    translationCandidateDedupeMarker(candidate.translation) ?? null
  ]);
}

export function contentCandidateDerivationOrderIndex(
  candidates: readonly TranslationCandidate[],
  matches: readonly string[],
  requiredMatch: string
): number | null {
  let indexes = candidates
    .map((candidate, index) => ({ candidate, index, match: matches[index] ?? "fail" }))
    .filter((item) => item.match === requiredMatch);
  if (indexes.length < 2) {
    return null;
  }
  const firstPriorityGroup = Math.min(...indexes.map((item) => contentCandidatePriorityGroup(item.candidate)));
  indexes = indexes.filter((item) => contentCandidatePriorityGroup(item.candidate) === firstPriorityGroup);
  if (indexes.length < 2) {
    return null;
  }
  const ranked = indexes.map((item) => {
    const derivation = item.candidate.derivation ?? derivationForSense(item.candidate.translation, item.candidate.entry);
    return {
      index: item.index,
      order: derivationOrder(item.candidate.entry, derivation.id)
    };
  });
  const min = Math.min(...ranked.map((item) => item.order));
  const selected = ranked.find((item) => item.order === min)?.index ?? null;
  return selected === indexes[0]?.index ? null : selected;
}

export function firstMatchPriorityGroupIndex(
  candidates: readonly TranslationCandidate[],
  matches: readonly string[],
  requiredMatch: string
): number | null {
  const groups = candidates
    .map((candidate, index) => ({ candidate, match: matches[index] ?? "fail" }))
    .filter((item) => item.match === requiredMatch)
    .map((item) => contentCandidatePriorityGroup(item.candidate));
  return groups.length === 0 ? null : Math.min(...groups);
}

export function contentCandidatePriorityGroup(candidate: TranslationCandidate): number {
  const value = candidate.translation?.priorityGroup;
  return typeof value === "number" && Number.isInteger(value) ? value : candidate.priority ?? 0;
}

export function contentTranslationCandidateFrom(candidate: TranslationCandidate): ContentTranslationCandidate {
  if (candidate instanceof ContentTranslationCandidate) {
    return candidate;
  }
  return new ContentTranslationCandidate(
    candidate.priority,
    candidate.conditions,
    candidate.entry,
    candidate.translation,
    candidate.koreanLemma,
    candidate.koreanPos,
    candidate.irregular,
    candidate.renderPlan ?? null,
    candidate.korean ?? "",
    candidate.voice ?? null,
    candidate.rareruReadings ?? new Set(),
    candidate.nareruReadings ?? new Set(),
    candidate.dekiruReadings ?? new Set(),
    candidate.hasNegative ?? false,
    candidate.hasCausative ?? false,
    candidate.hasCausativePassive ?? false,
    candidate.hasRequestTail ?? false,
    candidate.hasBenefactiveTail ?? false,
    candidate.connectiveRole ?? null,
    candidate.benefactive,
    candidate.warnings ?? [],
    candidate.renderPlanPolicy ?? "normal",
    candidate.lexicalParticleAdverbial ?? null,
    candidate.projectionOrdinal,
    candidate.sourceVerbalPredicateVerdict ?? null,
    candidate.nominalProjection
  );
}

export function lexicalParticleAdverbialVariantFromCandidate(
  candidate: ContentTranslationCandidate,
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  allocateProjectionOrdinal: () => number
): ContentTranslationCandidate | null {
  const { tokens, pos: start } = cursor;
  const particleIdx = start + 1;
  const particle = tokens[particleIdx];
  if (particle === undefined || (particle.pos & POS0) !== 助詞) {
    return null;
  }
  const renderPlan = lexicalParticleAdverbialRenderPlanForSense(candidate.translation, {
    cursor,
    particleIdx,
    lookups
  });
  if (renderPlan === null) {
    return null;
  }
  return new ContentTranslationCandidate(
    candidate.priority,
    candidate.conditions,
    candidate.entry,
    candidate.translation,
    renderPlan.korean,
    renderPlan.koreanPos ?? 부사,
    candidate.irregular,
    renderPlan,
    "",
    candidate.voice,
    candidate.rareruReadings,
    candidate.nareruReadings,
    candidate.dekiruReadings,
    candidate.hasNegative,
    candidate.hasCausative,
    candidate.hasCausativePassive,
    candidate.hasRequestTail,
    candidate.hasBenefactiveTail,
    candidate.connectiveRole,
    candidate.benefactive,
    candidate.warnings,
    candidate.renderPlanPolicy,
    {
      particleIdx,
      consumed: 2,
      particleRole: "adverbializer",
      renderPlan
    },
    allocateProjectionOrdinal()
  );
}

export function nominalizedNounProjectionVariantFromCandidate(
  candidate: ContentTranslationCandidate,
  renderPlan: Extract<RenderPlan, { readonly kind: "lemma" }>,
  allocateProjectionOrdinal: () => number
): ContentTranslationCandidate | null {
  const nominalized = candidate.translation.nominalized;
  if (
    typeof nominalized !== "string" ||
    nominalized.length === 0 ||
    (candidate.koreanPos !== 형용사 && candidate.koreanPos !== 동사)
  ) {
    return null;
  }
  return nominalProjectionCandidate(candidate, nominalized, renderPlan, allocateProjectionOrdinal(), "nominalized");
}

function nominalProjectionCandidate(
  candidate: ContentTranslationCandidate,
  koreanLemma: string,
  renderPlan: Extract<RenderPlan, { readonly kind: "lemma" }>,
  projectionOrdinal: number,
  nominalProjection: NominalProjectionKind
): ContentTranslationCandidate {
  return new ContentTranslationCandidate(
    candidate.priority,
    candidate.conditions,
    candidate.entry,
    candidate.translation,
    koreanLemma,
    명사,
    null,
    renderPlan,
    "",
    null,
    new Set(),
    new Set(),
    new Set(),
    false,
    false,
    false,
    false,
    false,
    null,
    {},
    [],
    "normal",
    null,
    projectionOrdinal,
    null,
    nominalProjection
  );
}

export function stemRootNominalProjectionVariantFromCandidate(
  candidate: ContentTranslationCandidate,
  renderPlanFor: (koreanLemma: string) => Extract<RenderPlan, { readonly kind: "lemma" }>,
  allocateProjectionOrdinal: () => number
): ContentTranslationCandidate | null {
  if (candidate.koreanPos !== 형용사) {
    return null;
  }
  const root = predicateStemRoot(candidate.translation.korean ?? candidate.koreanLemma);
  if (root === null || root.length === 0) {
    return null;
  }
  return nominalProjectionCandidate(candidate, root, renderPlanFor(root), allocateProjectionOrdinal(), "stem_root");
}

export function verbalNominalMProjectionVariantFromCandidate(
  candidate: ContentTranslationCandidate,
  renderPlanFor: (koreanLemma: string) => Extract<RenderPlan, { readonly kind: "lemma" }>,
  allocateProjectionOrdinal: () => number
): ContentTranslationCandidate | null {
  if (candidate.koreanPos !== 동사) {
    return null;
  }
  const lemma = candidate.translation.korean ?? candidate.koreanLemma;
  if (!lemma.endsWith("다") || lemma.length <= 1) {
    return null;
  }
  const nominalM = conjugate(lemma, candidate.irregular, "ㅁ/음");
  if (nominalM.length === 0) {
    return null;
  }
  return nominalProjectionCandidate(
    candidate,
    nominalM,
    renderPlanFor(nominalM),
    allocateProjectionOrdinal(),
    "verbal_nominal_m"
  );
}

function lexicalParticleAdverbialRenderPlanForSense(
  sense: MorphemeSense,
  context: {
    readonly cursor: TokenCursor<RuntimeHaruToken>;
    readonly particleIdx: number;
    readonly lookups: LookupTables;
  }
): Extract<RenderPlan, { readonly kind: "lexicalParticleAdverbial" }> | null {
  const { tokens } = context.cursor;
  const particle = tokens[context.particleIdx];
  if (particle === undefined || (particle.pos & POS0) !== 助詞) {
    return null;
  }
  for (const adverbialization of sense.adverbializations ?? []) {
    if (
      adverbialization.particle !== particle.surface ||
      adverbialization.consumeParticle === false ||
      !adverbializationActivationMatches(adverbialization, context)
    ) {
      continue;
    }
    const korean = adverbialization.rendering?.korean ??
      (adverbialization.projection?.kind === "nominalAdverbial"
        ? `${sense.korean}${adverbialization.projection.suffix}`
        : null);
    if (korean === null || korean.length === 0) {
      continue;
    }
    const koreanPos = adverbialization.rendering?.koreanPos ?? 부사;
    return {
      kind: "lexicalParticleAdverbial",
      adverbialKind: adverbialization.kind,
      particle: adverbialization.particle,
      korean,
      koreanPos,
      sourceKorean: sense.korean,
      projection: adverbialization.projection ?? null
    };
  }
  return null;
}

export function candidateGrammarTraceDetail(grammar: CandidateGrammar): RuleTraceDetailValue {
  return {
    voice: grammar.voice,
    nareru_reading: readingTraceValue(grammar.nareruReading),
    dekiru_reading: readingTraceValue(grammar.dekiruReading),
    negative: grammar.negative,
    past: grammar.past,
    polite: grammar.polite,
    causative: grammar.causative,
    causative_passive: grammar.causativePassive,
    request_tail: grammar.requestTail,
    benefactive_tail: grammar.benefactiveTail
  };
}

function readingTraceValue(value: string | readonly string[] | null): RuleTraceDetailValue {
  return value === null ? null : value;
}
