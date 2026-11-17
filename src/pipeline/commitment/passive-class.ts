
import { isPassiveTransitive } from "../../generator/aux-map.js";
import { asIrregular, type IrregularType } from "../../generator/conjugator.js";
import type { PredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import { type Clause, type ClauseLayout } from "../clause-layout/index.js";
import { POS0, POS01, POS4, POS5A, pos0in, 助詞, 助詞_格助詞, 助動詞, 助動詞_レル, 動詞, 未然形_, 接尾辞_名詞的, 대명사, 동사, 명사, NOMINAL_BITS } from "../../types/pos.js";
import { previousTransparentEvidenceIndex } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import { renderPlanHasKoreanLemma, replaceLemmaRenderPlan, setAdversativePassiveRenderPlan, setPassiveClassRenderPlan } from "../rendering/render-plan.js";
import { getReferentTokenBeforeParticle, isAnimateReferentBeforeNi, isAnimateReferentToken, isPlaceNoun } from "../semantics/helpers.js";
import { isRespectReferentToken } from "../semantics/honorific.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { quoteMarkerPrecededByRequestCommandContent } from "../quote/prohibitive-request.js";
import { TokenCursor } from "../token-cursor.js";
import { type FrameJsonMap } from "../semantics/frame.js";
import { TraceEvent, type TraceCollector, type TraceDetailValue } from "../trace.js";
import type { AuxLayerNode, AuxOpNode, TailNode, VoiceOp } from "../head-tail/tail/predicate-root/grammar.js";
import { tailNodeHasCausativePassiveSequence } from "../head-tail/tail/predicate-root/inspect.js";
import { classifyPassiveSurfacePolicy, type PassiveClass, type PassiveSurfacePolicyEvidence } from "../voice-class.js";
import { type CommitmentCandidate, type CommitmentContentMap, type CommitmentEntry, type CommitmentSpan, type CommitmentToken, type CommitmentTranslation } from "./types.js";
import { contentEntries, contentSpanAt, extractKoreanLemma, extractSahenCompound, extractSahenNoun, frameDataVoiceConditionIncludes, hasAnimateNiAgentParticle, hasExplicitWoObject, hasPossessorWoObject, isCommitmentCaseParticle, isCommitmentCaseParticleToken, isFrameJsonMapForCommitment, passiveClassPredicateDictForms, selectedCommitmentCandidate, spanHasNegativeAux, spanHasPastAux, spanIsAttributivePredicate, subjectAnimacyForPredicate, tailChainHasAnyAspect, tokenFormsForLookup, translationFrameDataAlternatives, withTraceClauseIdx, woObjectIsBodyPart } from "./span-evidence.js";
import { argumentParticleIndicesForPredicate, quotedPredicateCarrierVoicePrefersPassive } from "./voice-reading-resolution.js";
import {
  commitmentLaneCandidateSet,
  keepCandidate,
  transformCandidateSet,
  withStagedCandidatePayload
} from "../source-candidate-set.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";

interface PassiveClassTraceEvidence extends PassiveSurfacePolicyEvidence {
  readonly passiveClass: PassiveClass;
  readonly predicateDictForm: string;
  readonly predicateDictForms: readonly string[];
  readonly causativePolicy: "coercive" | "neutral" | "-";
  readonly coerciveCandidate: boolean;
  readonly coerciveCandidateReasons: readonly TraceDetailValue[];
}

type AdversativePassiveRenderOverride = {
  readonly baseLemma: string;
  readonly baseIrregular: IrregularType | null;
};

export function particlePrecedesSareruQuoteTail(tokens: readonly CommitmentToken[], span: CommitmentSpan, particleIdx: number): boolean {
  const end = span.start + span.consumed;
  const cursor = new TokenCursor(tokens, particleIdx + 1, end);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    if (quoteMarkerRelationAt(cursor.tokens, cursor.pos, { consumers: ["deferred_commitment"] })?.canonicalSurface !== "と") {
      continue;
    }
    let predicateOffset = 1;
    const maybeParticle = cursor.peek(predicateOffset);
    if ((maybeParticle?.surface === "も" || maybeParticle?.surface === "は") && ((maybeParticle?.pos ?? 0) & POS0) === 助詞) {
      predicateOffset += 1;
    }
    const predicate = cursor.peek(predicateOffset);
    const passive = cursor.peek(predicateOffset + 1);
    if (
      predicate !== undefined &&
      predicate.dictionaryForm === "する" &&
      (predicate.pos & (POS0 | POS5A)) === (動詞 | 未然形_) &&
      passive !== undefined &&
      (passive.pos & (POS0 | POS4)) === (助動詞 | 助動詞_レル)
    ) {
      return true;
    }
  }
  return false;
}

export function commitPassiveClasses(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  for (const [predIdx, span] of contentEntries(contentMap)) {
    commitPassiveClassForSpan(tokens, predIdx, span, layout, trace, lookups);
  }
}

export function commitPassiveClassForSpan(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): void {
  if (!spanNeedsPassiveClass(span)) {
    return;
  }
  const particleIndices = argumentParticleIndicesForPredicate(predIdx, tokens, layout);
  const clause = layout.clauseOfPredicate(predIdx) ?? null;
  const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
  const predicateDictForm = predicateDictForms[0] ?? "";
  const predicateInCausativeCoerciveSet = predicateDictForms.some((form) => lookups.CAUSATIVE_PASSIVE_COERCIVE_VERBS.has(form));
  const predicateInCausativeNeutralSet = predicateDictForms.some((form) => lookups.CAUSATIVE_PASSIVE_NEUTRAL_VERBS.has(form));
  const predicateIsLexicalCausative = predicateDictForms.some((form) => lookups.CAUSATIVE_PASSIVE_LEXICAL_CAUSATIVE_VERBS.has(form));
  const hasCausativePassiveVoice = spanHasCausativePassiveVoice(span);
  const hasLexicalCausativePassiveEvidence = spanIsPassive(span) &&
    predicateIsLexicalCausative &&
    (predicateInCausativeCoerciveSet || predicateInCausativeNeutralSet);
  const isReportingPassive = spanLooksLikeReportingPassive(span, tokens, particleIndices, predicateDictForms, lookups);
  const isReportingLabel = isReportingPassive && spanLooksLikeReportingLabel(span, tokens, particleIndices, predicateDictForms, clause);
  const isPassive = spanIsPassive(span);
  const isCausativePassive = hasCausativePassiveVoice || hasLexicalCausativePassiveEvidence;
  const predicateInPassiveResultativeSet = predicateDictForms.some((form) => lookups.TE_IRU_PASSIVE_RESULTATIVE_VERBS.has(form));
  const predicateInPossessorSet = predicateDictForms.some((form) => lookups.POSSESSOR_PASSIVE_VERBS.has(form));
  const predicateInIntransitiveAdversativeSet = predicateDictForms.some((form) => lookups.ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS.has(form));
  const hasProgressiveTeIru = spanHasProgressiveTeIru(span);
  const hasPast = spanHasPastAux(span);
  const hasNegative = spanHasNegativeAux(span);
  const isAttributive = spanIsAttributivePredicate(span);
  const hasWoObject = hasExplicitWoObject(tokens, particleIndices);
  const hasPossessorObject = hasPossessorWoObject(tokens, particleIndices, lookups);
  const hasAdversativeSource = hasAdversativePassiveSource(tokens, particleIndices, lookups);
  const hasAnimateAgent = hasAnimateNiAgentParticle(tokens, particleIndices, lookups);
  const consumesPassiveAux = spanConsumesPassiveAux(span);
  const subjectAnimacy = subjectAnimacyForPredicate(tokens, predIdx, layout, lookups);
  const passiveClass = classifyPassiveSurfacePolicy({
    isReportingPassive,
    isReportingLabel,
    isPassive,
    isCausativePassive,
    predicateInPassiveResultativeSet,
    predicateInPossessorSet,
    predicateInIntransitiveAdversativeSet,
    predicateInCausativeCoerciveSet,
    predicateInCausativeNeutralSet,
    hasProgressiveTeIru,
    hasPast,
    hasNegative,
    isAttributive,
    hasExplicitWoObject: hasWoObject,
    hasPossessorWoObject: hasPossessorObject,
    hasAdversativeSource,
    hasAnimateNiAgent: hasAnimateAgent,
    consumesPassiveAux,
    subjectAnimacy
  });
  applyPassiveClassToSpan(span, passiveClass);
  if (trace !== null) {
    const coerciveCandidateReasons = causativePassiveCoerciveCandidateReasons({
      isCausativePassive,
      predicateInCausativeCoerciveSet,
      predicateInCausativeNeutralSet,
      hasAnimateNiAgent: hasAnimateAgent,
      hasPast,
      hasNegative,
      isAttributive,
      hasExplicitWoObject: hasWoObject
    });
    const causativePolicy = passiveClass === "causative_coercive"
      ? "coercive"
      : passiveClass === "causative_passive_neutral"
        ? "neutral"
        : "-";
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "passive_class",
      true,
      withTraceClauseIdx(passiveClassTraceDetail({
        passiveClass,
        predicateDictForm,
        predicateDictForms,
        subjectAnimacy,
        causativePolicy,
        coerciveCandidate: isCausativePassive && predicateInCausativeCoerciveSet && passiveClass !== "causative_coercive",
        coerciveCandidateReasons,
        isReportingPassive,
        isReportingLabel,
        isPassive,
        isCausativePassive,
        predicateInPassiveResultativeSet,
        predicateInPossessorSet,
        predicateInIntransitiveAdversativeSet,
        predicateInCausativeCoerciveSet,
        predicateInCausativeNeutralSet,
        hasProgressiveTeIru,
        hasPast,
        hasNegative,
        isAttributive,
        hasExplicitWoObject: hasWoObject,
        hasPossessorWoObject: hasPossessorObject,
        hasAdversativeSource,
        hasAnimateNiAgent: hasAnimateAgent,
        consumesPassiveAux
      }), layout.clauseIndexOfPredicate(predIdx))
    ));
  }
}

function passiveClassTraceDetail(evidence: PassiveClassTraceEvidence): { readonly [key: string]: TraceDetailValue } {
  return {
    passive_class: evidence.passiveClass,
    predicate: evidence.predicateDictForm,
    predicate_forms: evidence.predicateDictForms,
    subject_animacy: evidence.subjectAnimacy,
    causative_policy: evidence.causativePolicy,
    coercive_candidate: evidence.coerciveCandidate,
    coercive_candidate_reasons: evidence.coerciveCandidateReasons,
    is_reporting_passive: evidence.isReportingPassive,
    is_reporting_label: evidence.isReportingLabel,
    is_passive: evidence.isPassive,
    is_causative_passive: evidence.isCausativePassive,
    predicate_in_passive_resultative_set: evidence.predicateInPassiveResultativeSet,
    predicate_in_possessor_set: evidence.predicateInPossessorSet,
    predicate_in_intransitive_adversative_set: evidence.predicateInIntransitiveAdversativeSet,
    predicate_in_causative_coercive_set: evidence.predicateInCausativeCoerciveSet,
    predicate_in_causative_neutral_set: evidence.predicateInCausativeNeutralSet,
    has_progressive_te_iru: evidence.hasProgressiveTeIru,
    has_past: evidence.hasPast,
    has_negative: evidence.hasNegative,
    is_attributive: evidence.isAttributive,
    has_explicit_wo_object: evidence.hasExplicitWoObject,
    has_possessor_wo_object: evidence.hasPossessorWoObject,
    has_adversative_source: evidence.hasAdversativeSource,
    has_animate_ni_agent: evidence.hasAnimateNiAgent,
    consumes_passive_aux: evidence.consumesPassiveAux
  };
}

function causativePassiveCoerciveCandidateReasons(evidence: {
  readonly isCausativePassive: boolean;
  readonly predicateInCausativeCoerciveSet: boolean;
  readonly predicateInCausativeNeutralSet: boolean;
  readonly hasAnimateNiAgent: boolean;
  readonly hasPast: boolean;
  readonly hasNegative: boolean;
  readonly isAttributive: boolean;
  readonly hasExplicitWoObject: boolean;
}): readonly TraceDetailValue[] {
  if (!evidence.isCausativePassive || !evidence.predicateInCausativeCoerciveSet) {
    return [];
  }
  const reasons: string[] = [];
  if (evidence.predicateInCausativeNeutralSet) reasons.push("neutral_lookup");
  if (!evidence.hasAnimateNiAgent) reasons.push("missing_animate_agent");
  if (!evidence.hasExplicitWoObject) reasons.push("missing_wo_object");
  if (!evidence.hasPast) reasons.push("not_past");
  if (evidence.hasNegative) reasons.push("negative");
  if (evidence.isAttributive) reasons.push("attributive");
  return reasons.length > 0 ? reasons : ["eligible"];
}

export function spanIsPassive(span: CommitmentSpan): boolean {
  return span.voice === "passive";
}

function spanNeedsPassiveClass(span: CommitmentSpan): boolean {
  return spanIsPassive(span) || spanHasCausativePassiveVoice(span);
}

function spanHasCausativePassiveVoice(span: CommitmentSpan): boolean {
  if (span.hasCausativePassive === true) {
    return true;
  }
  const plan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return tailNodeHasVoice(plan.realization.root.tail, "causative_passive") ||
      tailNodeHasCausativePassiveSequence(plan.realization.root.tail);
  }
  return false;
}

function hasAdversativePassiveSource(tokens: readonly CommitmentToken[], particleIndices: readonly number[], lookups: LookupTables): boolean {
  return particleIndices.some((idx) => {
    const referent = getReferentTokenBeforeParticle(tokens, idx, lookups);
    if (isCommitmentCaseParticle(tokens, idx, "に")) {
      if (isAnimateReferentBeforeNi(tokens, idx, lookups)) {
        return true;
      }
      if (referent === null) {
        return false;
      }
      return tokenFormsForLookup(referent).some((value) => lookups.AU_WEATHER_HIT_NOUNS.has(value));
    }
    return isCommitmentCaseParticle(tokens, idx, "で") &&
      referent !== null &&
      isAdversativePassiveDeLocationSource(referent, lookups);
  });
}

export function isAdversativePassiveDeLocationSource(token: CommitmentToken, lookups: LookupTables): boolean {
  return isPlaceNoun(token, lookups) || tokenFormsForLookup(token).some((value) => lookups.ADVERSATIVE_PASSIVE_LOCATION_SOURCE_NOUNS.has(value));
}

export function isDeparturePassiveSourceWo(
  referent: CommitmentToken | null,
  predicateDictForms: readonly string[],
  lookups: LookupTables
): boolean {
  if (referent === null || !pos0in(referent.pos, NOMINAL_BITS) || isAnimateReferentToken(referent, lookups)) {
    return false;
  }
  return predicateDictForms.some((form) => lookups.DEPARTURE_PASSIVE_VERBS.has(form));
}

export function hasAdversativePassiveDeLocationSourceParticle(tokens: readonly CommitmentToken[], particleIndices: readonly number[], lookups: LookupTables): boolean {
  return particleIndices.some((idx) => {
    if (!isCommitmentCaseParticle(tokens, idx, "で")) {
      return false;
    }
    const referent = getReferentTokenBeforeParticle(tokens, idx, lookups);
    return referent !== null && isAdversativePassiveDeLocationSource(referent, lookups);
  });
}

export function adversativePassiveWeatherBaseOverride(
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  predicateDictForms: readonly string[],
  lookups: LookupTables
): AdversativePassiveRenderOverride | null {
  const hasWeatherSource = particleIndices.some((idx) => {
    if (!isCommitmentCaseParticle(tokens, idx, "に")) {
      return false;
    }
    const referent = getReferentTokenBeforeParticle(tokens, idx, lookups);
    return referent !== null && tokenFormsForLookup(referent).some((value) => lookups.AU_WEATHER_HIT_NOUNS.has(value));
  });
  if (!hasWeatherSource) {
    return null;
  }
  for (const predicate of predicateDictForms) {
    const override = lookups.ADVERSATIVE_PASSIVE_WEATHER_BASE_LEMMAS.get(predicate);
    if (override !== undefined) {
      return { baseLemma: override[0], baseIrregular: asIrregular(override[1]) };
    }
  }
  return null;
}

export function isObjectRetainingAdversativePassive(span: CommitmentSpan, lookups: LookupTables): boolean {
  const dictionaryForm = span.entry?.dictionaryForm ?? "";
  return dictionaryForm.length > 0 && lookups.ADVERSATIVE_PASSIVE_TRANSITIVE_VERBS.has(dictionaryForm);
}

export function isIntransitiveAdversativePassive(span: CommitmentSpan, lookups: LookupTables): boolean {
  const dictionaryForm = span.entry?.dictionaryForm ?? "";
  return dictionaryForm.length > 0 && lookups.ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS.has(dictionaryForm);
}

function tailNodeHasVoice(node: TailNode, voice: VoiceOp["voice"]): boolean {
  if (node.kind === "connective") {
    return tailNodeHasVoice(node.inner, voice) || tailNodeHasVoice(node.outer, voice);
  }
  return node.ops.some((op) => op.kind === "voice" && op.voice === voice);
}

function spanHasProgressiveTeIru(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma" || plan?.kind === "attributive") {
    return plan.auxTokens.some((token) => token.dictionaryForm === "いる" || token.dictionaryForm === "てる");
  }
  return isPredicateHeadTailChainRenderPlan(plan) && tailChainHasAnyAspect(plan, new Set(["te_iru"]));
}

export function setAdversativePassive(
  span: CommitmentSpan,
  options: {
    readonly agentPromoted?: boolean;
    readonly baseOverride?: AdversativePassiveRenderOverride | null;
  } = {}
): void {
  span.passiveClass = "adversative";
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rewritten = rewriteTailChainAdversativePassive(span.renderPlan, {
      agentPromoted: options.agentPromoted === true,
      baseOverride: options.baseOverride ?? null
    });
    if (rewritten !== undefined) {
      span.renderPlan = rewritten;
      span.korean = "";
      return;
    }
  }
  const updated = setAdversativePassiveRenderPlan(span.renderPlan ?? null, {
    agentPromoted: options.agentPromoted === true,
    ...(options.baseOverride === undefined || options.baseOverride === null
      ? {}
      : {
        baseLemma: options.baseOverride.baseLemma,
        baseIrregular: options.baseOverride.baseIrregular
      })
  });
  if (updated === undefined) {
    return;
  }
  span.renderPlan = updated;
  span.korean = "";
}

function rewriteTailChainAdversativePassive(
  plan: PredicateHeadTailChainRenderPlan,
  options: {
    readonly agentPromoted: boolean;
    readonly baseOverride: AdversativePassiveRenderOverride | null;
  }
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodeAdversativePassive(plan.realization.root.tail, options);
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

function rewriteTailNodeAdversativePassive(
  node: TailNode,
  options: {
    readonly agentPromoted: boolean;
    readonly baseOverride: AdversativePassiveRenderOverride | null;
  }
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteTailNodeAdversativePassive(node.inner, options);
    const outer = rewriteTailNodeAdversativePassive(node.outer, options);
    if (!inner.changed && !outer.changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        inner: inner.node as AuxLayerNode,
        outer: outer.node
      },
      changed: true
    };
  }
  let changed = false;
  const ops = node.ops.map((op): AuxOpNode => {
    if (op.kind !== "voice" || op.voice !== "passive") {
      return op;
    }
    changed = true;
    return applyAdversativePassiveToVoiceOp(op, options);
  });

  return changed ? { node: { ...node, ops }, changed: true } : { node, changed: false };
}

function rewriteTailChainPassiveClass(plan: PredicateHeadTailChainRenderPlan, passiveClass: PassiveClass): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodePassiveClass(plan.realization.root.tail, passiveClass);
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

function rewriteTailNodePassiveClass(node: TailNode, passiveClass: PassiveClass): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteTailNodePassiveClass(node.inner, passiveClass);
    const outer = rewriteTailNodePassiveClass(node.outer, passiveClass);
    if (!inner.changed && !outer.changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        inner: inner.node as AuxLayerNode,
        outer: outer.node
      },
      changed: true
    };
  }
  const stem = node.stem.absorbedPassiveAux === true && node.stem.absorbedPassiveClass !== passiveClass
    ? { ...node.stem, absorbedPassiveClass: passiveClass }
    : node.stem;
  let changed = stem !== node.stem;
  const ops = node.ops.map((op): AuxOpNode => {
    if (op.kind !== "voice" || (op.voice !== "passive" && op.voice !== "causative_passive")) {
      return op;
    }
    if (op.passiveClass === passiveClass) {
      return op;
    }
    changed = true;
    return applyPassiveClassToVoiceOp(op, passiveClass);
  });

  return changed ? { node: { ...node, stem, ops }, changed: true } : { node, changed: false };
}

export function applyPassiveClassToVoiceOp(op: VoiceOp, passiveClass: PassiveClass): VoiceOp {
  return { ...op, passiveClass };
}

export function applyAdversativePassiveToVoiceOp(
  op: VoiceOp,
  options: {
    readonly agentPromoted: boolean;
    readonly baseOverride: AdversativePassiveRenderOverride | null;
  }
): VoiceOp {
  return {
    ...op,
    adversativePassive: true,
    adversativePassiveAgentPromoted: options.agentPromoted,
    ...(options.baseOverride === null
      ? {}
      : {
        adversativePassiveBaseLemma: options.baseOverride.baseLemma,
        adversativePassiveBaseIrregular: options.baseOverride.baseIrregular
      })
  };
}

const ADVERSATIVE_E_GA_NON_SUBJECT_PREDICATES = new Set([
  "欲しい", "ほしい", "好き", "嫌い", "できる", "出来る",
  "わかる", "分かる", "見える", "聞こえる"
]);

function clauseHasExplicitSentientSubject(
  tokens: readonly CommitmentToken[],
  predicateDictForm: string,
  clause: Clause
): boolean {
  const cursor = new TokenCursor(tokens, clause.start, clause.end);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    const token = cursor.current();
    if (token === undefined || (token.pos & POS0) !== 助詞) {
      continue;
    }
    if (token.surface === "は" || token.surface === "も") {
      const prev = cursor.peek(-1);
      if (prev !== undefined && (prev.pos & POS01) === 助詞_格助詞) {
        continue;
      }
      return true;
    }
    if (
      isCommitmentCaseParticleToken(token, cursor.pos, "が") &&
      !ADVERSATIVE_E_GA_NON_SUBJECT_PREDICATES.has(predicateDictForm)
    ) {
      return true;
    }
  }
  return false;
}

function spanLooksLikeReportingPassive(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  predicateDictForms: readonly string[],
  lookups: LookupTables
): boolean {
  if (quotedPredicateCarrierVoicePrefersPassive(span)) {
    return true;
  }
  if (!spanIsPassive(span)) {
    return false;
  }
  const hostKind = predicateDictForms
    .map((form) => lookups.QUOTE_HOST_REGISTRY.kind("direct", form))
    .find((kind) => kind !== undefined);
  if (hostKind !== "report" && hostKind !== "thought") {
    return false;
  }
  for (const idx of particleIndices) {
    if (quoteMarkerRelationAt(tokens, idx, { consumers: ["deferred_commitment"] })?.canonicalSurface !== "と") {
      continue;
    }
    if (quoteMarkerPrecededByRequestCommandContent(tokens, idx)) {
      return false;
    }
    return true;
  }
  return false;
}

function spanLooksLikeReportingLabel(
  span: CommitmentSpan,
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  predicateDictForms: readonly string[],
  clause: Clause | null
): boolean {
  if (!spanIsPassive(span)) {
    return false;
  }
  if (!predicateDictForms.some((form) => IU_LEXEME_FORMS.has(form))) {
    return false;
  }
  const lowerBound = clause?.start ?? 0;
  for (const idx of particleIndices) {
    if (
      quoteMarkerRelationAt(tokens, idx, { consumers: ["deferred_commitment"] })?.canonicalSurface !== "と" ||
      tokaTteCompositeQuoteCandidateAt(tokens, idx, { consumers: ["deferred_commitment"] }) !== null
    ) {
      continue;
    }
    if (quoteMarkerPrecededByRequestCommandContent(tokens, idx)) {
      return false;
    }
    if (markerContentLooksBareNominalLabel(tokens, idx, lowerBound)) {
      return true;
    }
  }
  return false;
}

function markerContentLooksBareNominalLabel(
  tokens: readonly CommitmentToken[],
  markerIdx: number,
  lowerBound: number
): boolean {
  const head = previousTransparentEvidenceIndex(tokens, markerIdx, {
    lowerBoundInclusive: lowerBound,
    isTransparentToken: (token) => (token.pos & POS01) === 接尾辞_名詞的
  });
  if (head === null) {
    return false;
  }
  const token = tokens[head.index];
  return token !== undefined && pos0in(token.pos, NOMINAL_BITS);
}

function applyPassiveClassToSpan(span: CommitmentSpan, passiveClass: PassiveClass): void {
  span.passiveClass = passiveClass;
  const plan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const rewritten = rewriteTailChainPassiveClass(plan, passiveClass);
    if (rewritten !== undefined) {
      span.renderPlan = rewritten;
      span.korean = "";
    }
  } else {
    const updated = setPassiveClassRenderPlan(plan, passiveClass);
    if (updated !== undefined) {
      span.renderPlan = updated;
      span.korean = "";
    }
  }
  const sourceCandidates = commitmentLaneCandidateSet(span.sourceCandidates);
  if (sourceCandidates !== null && sourceCandidates.members.length > 0) {
    span.sourceCandidates = transformCandidateSet(sourceCandidates, {
      map: (member) => keepCandidate(withStagedCandidatePayload(
        member,
        applyPassiveClassToCandidate(member.candidate, passiveClass)
      )),
      failClosedReason: "all_members_dropped"
    });
  }
}

function applyPassiveClassToCandidate(candidate: CommitmentCandidate, passiveClass: PassiveClass): CommitmentCandidate {
  let renderPlan = candidate.renderPlan ?? null;
  let changed = false;
  if (isPredicateHeadTailChainRenderPlan(renderPlan)) {
    const rewritten = rewriteTailChainPassiveClass(renderPlan, passiveClass);
    if (rewritten !== undefined) {
      renderPlan = rewritten;
      changed = true;
    }
  } else {
    const updated = setPassiveClassRenderPlan(renderPlan, passiveClass);
    if (updated !== undefined) {
      renderPlan = updated;
      changed = true;
    }
  }
  return {
    ...candidate,
    passiveClass,
    renderPlan,
    ...(changed && candidate.korean !== undefined ? { korean: "" } : {})
  };
}

export function evaluateAdversativeEMode(
  tokens: readonly CommitmentToken[],
  span: CommitmentSpan,
  particleIndices: readonly number[],
  predicateDictForm: string,
  options: { readonly clause: Clause | null; readonly lookups: LookupTables }
): boolean {
  const lookups = options.lookups;
  if (!spanIsPassive(span) || isObjectRetainingAdversativePassive(span, lookups) || spanConsumesPassiveAux(span)) {
    return false;
  }
  let woFound = false;
  for (const idx of particleIndices) {
    if (!isCommitmentCaseParticle(tokens, idx, "を")) {
      continue;
    }
    woFound = true;
    if (woObjectIsBodyPart(tokens, idx, lookups)) {
      return false;
    }
  }
  if (!woFound) {
    return false;
  }
  const koreanLemma = extractKoreanLemma(span);
  if (koreanLemma === null || !isPassiveTransitive(koreanLemma, passiveTransitiveOptions(extractSahenCompound(span), extractSahenNoun(span), lookups))) {
    return false;
  }
  let hasAnimateNi = false;
  for (const idx of particleIndices) {
    if (!isCommitmentCaseParticle(tokens, idx, "に") || !isAnimateReferentBeforeNi(tokens, idx, lookups)) {
      continue;
    }
    const referent = getReferentTokenBeforeParticle(tokens, idx, lookups);
    if (isRespectReferentToken(referent, lookups)) {
      return false;
    }
    if (tokens[idx + 1]?.surface === "も" || tokens[idx + 1]?.surface === "は") {
      return false;
    }
    hasAnimateNi = true;
  }
  if (!hasAnimateNi) {
    return false;
  }
  if (options.clause !== null && clauseHasExplicitSentientSubject(tokens, predicateDictForm, options.clause)) {
    return false;
  }
  return !spanHasNegativeAux(span);
}

export function evaluateIntransitiveAdversativeAgentPromotion(
  tokens: readonly CommitmentToken[],
  span: CommitmentSpan,
  particleIndices: readonly number[],
  predicateDictForm: string,
  options: {
    readonly clause: Clause | null;
    readonly hasWoObject: boolean;
    readonly lookups: LookupTables;
  }
): boolean {
  if (!spanIsPassive(span) || !isIntransitiveAdversativePassive(span, options.lookups) || spanConsumesPassiveAux(span)) {
    return false;
  }
  if (options.hasWoObject || spanHasNegativeAux(span)) {
    return false;
  }
  let hasPromotableAnimateNi = false;
  for (const idx of particleIndices) {
    if (!isCommitmentCaseParticle(tokens, idx, "に") || !isAnimateReferentBeforeNi(tokens, idx, options.lookups)) {
      continue;
    }
    const referent = getReferentTokenBeforeParticle(tokens, idx, options.lookups);
    if (isRespectReferentToken(referent, options.lookups)) {
      return false;
    }
    if (tokens[idx + 1]?.surface === "も" || tokens[idx + 1]?.surface === "は") {
      return false;
    }
    hasPromotableAnimateNi = true;
  }
  if (!hasPromotableAnimateNi) {
    return false;
  }
  if (options.clause !== null && clauseHasExplicitSentientSubject(tokens, predicateDictForm, options.clause)) {
    return false;
  }
  return true;
}

export function spanConsumesPassiveAux(span: CommitmentSpan): boolean {
  const selected = selectedCommitmentCandidate(span);
  if (selected?.translation !== undefined) {
    return selected.translation.dropFirstPassiveAux === true;
  }
  return entryHasDropFirstPassiveAux(span.entry) || entryHasDropFirstPassiveAux(span.compoundHeadFrameEntry ?? null);
}

export function spanPassiveAbsorbedFrameOwnsParticle(span: CommitmentSpan, particleSurface: string): boolean {
  const selected = selectedCommitmentCandidate(span);
  const translations = selected?.translation === undefined
    ? passiveAuxTranslationsFromEntry(span.entry)
    : [selected.translation];
  return translations.some((translation) =>
    translation.dropFirstPassiveAux === true &&
    translationFrameDataAlternatives(translation).some((frameData) =>
      frameDataVoiceConditionIncludes(frameData, "passive") &&
      frameDataHasParticleSlot(frameData, particleSurface)
    )
  );
}

function entryHasDropFirstPassiveAux(entry: CommitmentEntry | null): boolean {
  return passiveAuxTranslationsFromEntry(entry).some((translation) => translation.dropFirstPassiveAux === true);
}

function passiveAuxTranslationsFromEntry(entry: CommitmentEntry | null): readonly CommitmentTranslation[] {
  if (entry === null || !Array.isArray(entry.senses)) {
    return [];
  }
  return flattenedCommitmentTranslations(entry.senses);
}

function flattenedCommitmentTranslations(values: readonly unknown[]): CommitmentTranslation[] {
  const translations: CommitmentTranslation[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      translations.push(...flattenedCommitmentTranslations(value));
    } else if (isCommitmentTranslationObject(value)) {
      translations.push(value);
    }
  }
  return translations;
}

function isCommitmentTranslationObject(value: unknown): value is CommitmentTranslation {
  return typeof value === "object" && value !== null && "korean" in value;
}

function frameDataHasParticleSlot(frameData: FrameJsonMap | null, particleSurface: string): boolean {
  if (!isFrameJsonMapForCommitment(frameData) || !Array.isArray(frameData.slots)) {
    return false;
  }
  return frameData.slots.some((slot) => {
    if (!isFrameJsonMapForCommitment(slot as FrameJsonMap | null | undefined)) {
      return false;
    }
    const particles = (slot as FrameJsonMap).particles;
    return Array.isArray(particles) && particles.some((particle) => particle === particleSurface);
  });
}

export function passiveTransitiveOptions(sahenCompound: boolean, sahenNoun: string | null, lookups: LookupTables): { readonly lookups: LookupTables; readonly sahenCompound: boolean; readonly sahenNoun?: string } {
  return sahenNoun === null ? { lookups, sahenCompound } : { lookups, sahenCompound, sahenNoun };
}

export function commitNounToSareru(
  tokens: readonly CommitmentToken[],
  contentMap: CommitmentContentMap,
  layout: ClauseLayout,
  trace: TraceCollector | null = null,
  lookups: LookupTables
): void {
  for (const [idx, _token] of tokens.entries()) {
    if (quoteMarkerRelationAt(tokens, idx, { consumers: ["deferred_commitment"] })?.canonicalSurface !== "と") {
      continue;
    }
    const leftSpan = findCoveringSpan(contentMap, idx - 1);
    if (leftSpan === undefined) {
      continue;
    }
    if (leftSpan.start + leftSpan.consumed !== idx) {
      continue;
    }
    if (leftSpan.koreanPos !== 명사 && leftSpan.koreanPos !== 대명사) {
      continue;
    }

    const span = contentSpanAt(contentMap, idx + 1);
    if (span === undefined) {
      continue;
    }
    if (span.entry === null) {
      continue;
    }
    if (span.entry.dictionaryForm !== "する") {
      continue;
    }
    if (!spanIsPassive(span)) {
      continue;
    }
    applyPassiveClassToSpan(span, "reporting");
    if (trace !== null) {
      const predIdx = idx + 1;
      const particleIndices = argumentParticleIndicesForPredicate(predIdx, tokens, layout);
      const clause = layout.clauseOfPredicate(predIdx) ?? null;
      const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
      const predicateDictForm = predicateDictForms[0] ?? "する";
      const predicateInCausativeCoerciveSet = predicateDictForms.some((form) => lookups.CAUSATIVE_PASSIVE_COERCIVE_VERBS.has(form));
      const predicateInCausativeNeutralSet = predicateDictForms.some((form) => lookups.CAUSATIVE_PASSIVE_NEUTRAL_VERBS.has(form));
      const isCausativePassive = spanHasCausativePassiveVoice(span);
      const hasWoObject = hasExplicitWoObject(tokens, particleIndices);
      const hasAdversativeSource = hasAdversativePassiveSource(tokens, particleIndices, lookups);
      const hasPast = spanHasPastAux(span);
      const hasNegative = spanHasNegativeAux(span);
      const isAttributive = spanIsAttributivePredicate(span);
      const hasAnimateAgent = hasAnimateNiAgentParticle(tokens, particleIndices, lookups);
      const predicateInPassiveResultativeSet = predicateDictForms.some((form) => lookups.TE_IRU_PASSIVE_RESULTATIVE_VERBS.has(form));
      const predicateInPossessorSet = predicateDictForms.some((form) => lookups.POSSESSOR_PASSIVE_VERBS.has(form));
      const predicateInIntransitiveAdversativeSet = predicateDictForms.some((form) => lookups.ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS.has(form));
      const hasProgressiveTeIru = spanHasProgressiveTeIru(span);
      const hasPossessorObject = hasPossessorWoObject(tokens, particleIndices, lookups);
      const consumesPassiveAux = spanConsumesPassiveAux(span);
      const coerciveCandidateReasons = causativePassiveCoerciveCandidateReasons({
        isCausativePassive,
        predicateInCausativeCoerciveSet,
        predicateInCausativeNeutralSet,
        hasAnimateNiAgent: hasAnimateAgent,
        hasPast,
        hasNegative,
        isAttributive,
        hasExplicitWoObject: hasWoObject
      });
      trace.record(new TraceEvent(
        predIdx,
        "commitment",
        "passive_class",
        true,
        withTraceClauseIdx(passiveClassTraceDetail({
          passiveClass: "reporting",
          predicateDictForm,
          predicateDictForms,
          subjectAnimacy: subjectAnimacyForPredicate(tokens, predIdx, layout, lookups),
          causativePolicy: "-",
          coerciveCandidate: isCausativePassive && predicateInCausativeCoerciveSet,
          coerciveCandidateReasons,
          isReportingPassive: true,
          isReportingLabel: false,
          isPassive: spanIsPassive(span),
          isCausativePassive,
          predicateInPassiveResultativeSet,
          predicateInPossessorSet,
          predicateInIntransitiveAdversativeSet,
          predicateInCausativeCoerciveSet,
          predicateInCausativeNeutralSet,
          hasProgressiveTeIru,
          hasPast,
          hasNegative,
          isAttributive,
          hasExplicitWoObject: hasWoObject,
          hasPossessorWoObject: hasPossessorObject,
          hasAdversativeSource,
          hasAnimateNiAgent: hasAnimateAgent,
          consumesPassiveAux
        }), layout.clauseIndexOfPredicate(predIdx))
      ));
    }

    const renderPlan = span.renderPlan ?? null;
    let rewrittenPlan = renderPlan === null
      ? undefined
      : replaceLemmaRenderPlan(renderPlan, {
        koreanLemma: "여겨지다",
        irregular: null,
        koreanPos: 동사,
        dropFirstPassiveAux: true,
        absorbedPassiveAux: true
      });
    if (rewrittenPlan?.kind === "attributive") {
      rewrittenPlan = { ...rewrittenPlan, tailLemmaMode: true };
    }

    if (renderPlanHasKoreanLemma(renderPlan, "여겨지다")) {
      if (trace !== null) {
        trace.record(new TraceEvent(
          idx + 1,
          "commitment",
          "noun_to_sareru",
          true,
          { mode: "predicate_root_hydrated" }
        ));
      }
      continue;
    }

    if (rewrittenPlan !== undefined) {
      span.renderPlan = rewrittenPlan;
      span.korean = "";
      if (trace !== null) {
        trace.record(new TraceEvent(
          idx + 1,
          "commitment",
          "noun_to_sareru",
          true,
          { mode: "render_plan_rewrite" }
        ));
      }
      continue;
    }
  }
}

function findCoveringSpan(contentMap: CommitmentContentMap, tokenIdx: number): CommitmentSpan | undefined {
  for (const [start, span] of contentEntries(contentMap)) {
    if (start <= tokenIdx && tokenIdx < start + span.consumed) {
      return span;
    }
  }
  return undefined;
}
