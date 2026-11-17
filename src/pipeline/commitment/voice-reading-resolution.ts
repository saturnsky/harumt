
import type { DekiruReading, RareruReading } from "../../types/pipeline.js";
import type { RenderPlan, PredicateHeadTailChainRenderPlan, Voice } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { isClausePunctuationToken, type Clause, type ClauseLayout } from "../clause-layout/index.js";
import {
  NOMINAL_KEIJOU_BITS,
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  PUNCTUATION_BITS,
  形容詞0,
  isSahenCapableNominal,
  isKaHenPredicateToken,
  is上一段,
  is下一段,
  記号,
  終助詞,
  助詞,
  助詞_終助詞,
  助動詞,
  接続助詞,
  動詞,
  副詞,
  補助記号,
  連用形_,
  명사,
  NOMINAL_BITS, pos0in
} from "../../types/pos.js";
import { findDekiruReferent } from "../semantics/dekiru.js";
import { isGaNoConvertedSubjectParticle } from "../semantics/gano-conversion.js";
import type { LookupTables } from "../lookup-tables.js";
import { replaceLemmaRenderPlan, setForcePassiveRenderPlan } from "../rendering/render-plan.js";
import { getReferentTokenBeforeParticle, isAnimateReferentToken, isPersonCountBeforeDe, PredicateArgumentView } from "../semantics/helpers.js";
import { hasRespectSubjectSignal } from "../semantics/honorific.js";
import { caseParticleMarkerRelationForToken, copulaNiMarkerRelationForToken, kaMarkerRelationAt, predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { WH_INDEFINITE_DEMO_HOSTS } from "../head-tail/data/semantic-helper-sets.js";
import { firstAuxLayer, tailRootHasQuestionSfp, tailRootVoiceOps } from "../head-tail/tail/predicate-root/inspect.js";
import { admittedNominalFrameMarkerEndsAt } from "../head-tail/tail/segments/nominal-frame.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TokenCursor } from "../token-cursor.js";
import { isAdjSuffixToken } from "../attributive.js";
import { teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { TraceEvent, type TraceCollector } from "../trace.js";
import { hasFollowingNegationAfter, type AuxLayerNode, type AuxOpNode, type TailNode, type VoiceOp } from "../head-tail/tail/predicate-root/grammar.js";
import { predicateSuffixKindForDictionaryForm } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { reclassifyTeIruSemanticWithoutPassive } from "../head-tail/tail/predicate-root/aspect-semantics.js";
import { COMMITMENT_SOURCE_CASE_REALIZATION, COMMITMENT_SOURCE_SLOT_REALIZATION, DEKIRU_ADVERB_COMPLETION_CUES, type CommitmentCandidate, type CommitmentContentMap, type CommitmentSpan, type CommitmentToken, type RareruAbilityModalCueKind, type RareruAbilityModalCueResolution, type SemanticFrameRuntimeMatch, type TailParserCommittedVoice } from "./types.js";
import { candidateFrameAlternativesMatch, frameDataHasVoiceSourceEvidence, spanTailStemIsSahenVerbalization, frameDataVoiceConditionIncludes, hasAnimateNiAgentParticle, hasPossessorWoObject, isCommitmentCaseParticleToken, passiveClassPredicateDictForms, predicateSubjectArguments, spanHasNegativeAux, spanHasPastAux, spanIsAttributivePredicate, subjectAnimacyForPredicate, tailChainHasAspect, translationFrameDataAlternatives, withTraceClauseIdx } from "./span-evidence.js";
import {
  candidateSetCandidates,
  candidateSetSize,
  commitmentLaneCandidateSet,
  isResolvedCandidateSet,
  keepCandidate,
  transformCandidateSet,
  withStagedCandidatePayload
} from "../source-candidate-set.js";

export type DeferredRareruObjectState = readonly [ReadonlySet<RareruReading>, NonNullable<CommitmentSpan["sourceCandidates"]> | null];

function remapSpanCandidatePayloads(
  span: CommitmentSpan,
  map: (candidate: CommitmentCandidate) => CommitmentCandidate
): void {
  const set = commitmentLaneCandidateSet(span.sourceCandidates);
  if (set === null || set.state === "fail_closed" || set.members.length === 0) {
    return;
  }
  span.sourceCandidates = transformCandidateSet(set, {
    map: (member) => keepCandidate(withStagedCandidatePayload(member, map(member.candidate))),
    failClosedReason: "all_members_dropped"
  });
}

export function scanDekiruAuxCues(tokens: readonly CommitmentToken[], predIdx: number, lookups: LookupTables): readonly [past: boolean, tara: boolean, teiru: boolean] {
  let past = false;
  let tara = false;
  let teiru = false;
  let index = predIdx + 1;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    const pos0 = token.pos & POS0;
    const pos1 = token.pos & POS1;
    if (pos0 === 助動詞) {
      if (token.dictionaryForm === "た") {
        past = true;
        if (token.surface === "たら" || token.surface === "だら") {
          tara = true;
        }
        const next = tokens[index + 1];
        if (next !== undefined && (next.pos & POS0) === 助詞 && next.surface === "ら") {
          tara = true;
        }
      }
      index += 1;
      continue;
    }
    if (pos0 === 助詞 && pos1 === 接続助詞) {
      if (token.surface === "たら" || token.surface === "だら") {
        tara = true;
      }
      const next = tokens[index + 1];
      const teiruRelation = teDeContinuationRelationAt(tokens, index, {
        consumers: ["deferred_commitment"],
        lookups
      });
      if (teiruRelation?.continuationKind === "simple_aspect" && ((next?.pos ?? 0) & POS0) === 動詞) {
        teiru = true;
      }
      break;
    }
    break;
  }

  return [past, tara, teiru];
}

export function pickDekiruSingleton(memberships: ReadonlySet<DekiruReading>, order: readonly DekiruReading[]): ReadonlySet<DekiruReading> {
  for (const reading of order) {
    if (memberships.has(reading)) {
      return new Set([reading]);
    }
  }
  return new Set(["ability"]);
}

export function resolveDekiruReading(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  trace: TraceCollector | null = null,
  lookups: LookupTables
): void {
  const token = tokens[predIdx];
  if (token === undefined || !["できる", "出来る"].includes(token.dictionaryForm)) {
    return;
  }
  const current = span.dekiruReadings ?? new Set<DekiruReading>();
  if (current.size === 0) {
    return;
  }

  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return;
  }

  const match = findDekiruReferent(tokens, predIdx, {
    scanStart: clause.start,
    lookups,
    gaNoConverted: (particleIdx) => isGaNoConvertedSubjectParticle(tokens, particleIdx, predIdx, { clause, lookups })
  });
  const referent = match.referent;
  const bareCompoundReferent = match.bareCompound;
  span.dekiruReferentParticleIdx = match.markerIdx;
  const [past, conditionalTara, teiruTail] = scanDekiruAuxCues(tokens, predIdx, lookups);
  const adverbCue = hasAdverbCompletionCueInClause(tokens, predIdx, clause);
  const predicateSuffixCue = hasDekiruPredicateSuffixCue(tokens, predIdx);
  const completionLike = past || conditionalTara || teiruTail || adverbCue || predicateSuffixCue;

  const memberships = new Set<DekiruReading>();
  let referentForm: string | null = null;
  if (referent !== null) {
    referentForm = referent.dictionaryForm || referent.surface;
    if (lookups.DEKIRU_ABILITY_NOUNS.has(referentForm)) {
      memberships.add("ability");
    }
    if (lookups.DEKIRU_POSSIBILITY_NOUNS.has(referentForm)) {
      memberships.add("availability");
      memberships.add("completion");
    }
    if (lookups.DEKIRU_COMPLETION_STRONG_NOUNS.has(referentForm)) {
      memberships.add("completion");
    }
    if (lookups.DEKIRU_COMPLETION_DO_NOUNS.has(referentForm)) {
      span.dekiruCompletionDoReferent = true;
      if (completionLike) {
        memberships.add("completion");
      }
    }
    if (lookups.DEKIRU_COMPLETION_AMBIGUOUS_NOUNS.has(referentForm) && completionLike) {
      memberships.add("completion");
    }
    if (lookups.DEKIRU_EMERGENCE_NOUNS.has(referentForm)) {
      memberships.add("emergence");
    }
  }

  if (predicateSuffixCue) {
    memberships.delete("ability");
    memberships.delete("availability");
  }

  let fallbackApplied: string | false = false;
  if (memberships.size === 0 && completionLike && referent !== null) {
    if (isAnimateReferentToken(referent, lookups)) {
      memberships.add("emergence");
      fallbackApplied = "emergence";
    } else {
      memberships.add("completion");
      fallbackApplied = "completion";
    }
  }

  if (memberships.size === 0 && predicateSuffixCue && referent === null) {
    memberships.add("completion");
    fallbackApplied = "completion";
  }

  if (bareCompoundReferent && !completionLike) {
    memberships.add("ability");
  }

  const bareActionPossibility =
    bareCompoundReferent &&
    referentForm !== null &&
    lookups.DEKIRU_POSSIBILITY_NOUNS.has(referentForm) &&
    !lookups.DEKIRU_POSSIBILITY_STATE_BARE_COMPLETION.has(referentForm);
  if (bareActionPossibility && !predicateSuffixCue) {
    memberships.delete("completion");
    memberships.delete("availability");
    memberships.add("ability");
  }

  let newReadings: ReadonlySet<DekiruReading>;
  if (memberships.size === 0) {
    newReadings = new Set<DekiruReading>(["ability"]);
  } else if (completionLike) {
    newReadings = pickDekiruSingleton(memberships, ["completion", "emergence", "availability", "ability"]);
  } else if (bareCompoundReferent) {
    newReadings = pickDekiruSingleton(memberships, ["ability", "availability", "completion", "emergence"]);
  } else {
    newReadings = pickDekiruSingleton(memberships, ["availability", "ability", "completion", "emergence"]);
  }

  if (sameSet(current, newReadings)) {
    return;
  }

  const before = [...current].sort();
  span.dekiruReadings = new Set(newReadings);
  remapSpanCandidatePayloads(span, (candidate) => applyResolvedDekiruReadingsToCandidate(candidate, newReadings));

  if (bareCompoundReferent && span.attachLeft === false && sameSet(newReadings, new Set<DekiruReading>(["ability"]))) {
    const prev = predIdx > 0 ? tokens[predIdx - 1] : undefined;
    const prevIsSahen = prev !== undefined && isSahenCapableNominal(prev);
    if (prevIsSahen) {
      span.attachLeft = true;
    }
  }
  if (trace !== null) {
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "dekiru_reading_resolution",
      true,
      withTraceClauseIdx({
        before,
        after: [...newReadings].sort(),
        referent: referentForm,
        cue_past: past,
        cue_tara: conditionalTara,
        cue_teiru: teiruTail,
        cue_adverb: adverbCue,
        cue_predicate_suffix: predicateSuffixCue,
        fallback: fallbackApplied
      }, layout.clauseIndexOfPredicate(predIdx))
    ));
  }
}

function hasDekiruPredicateSuffixCue(tokens: readonly CommitmentToken[], predIdx: number): boolean {
  const next = tokens[predIdx + 1];
  return next !== undefined &&
    isAdjSuffixToken(next) &&
    predicateSuffixKindForDictionaryForm(next.dictionaryForm) !== null;
}

function hasAdverbCompletionCueInClause(tokens: readonly CommitmentToken[], predIdx: number, clause: { readonly start: number }): boolean {
  const cursor = new TokenCursor(tokens, clause.start, predIdx);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    const token = cursor.current();
    if (token !== undefined && (token.pos & POS0) === 副詞 && DEKIRU_ADVERB_COMPLETION_CUES.has(token.surface)) {
      return true;
    }
  }
  return false;
}

function applyResolvedDekiruReadingsToCandidate(candidate: CommitmentCandidate, readings: ReadonlySet<DekiruReading>): CommitmentCandidate {
  if (sameSet(candidate.dekiruReadings, readings)) {
    return candidate;
  }
  return {
    ...candidate,
    dekiruReadings: new Set(readings)
  };
}

function commitVoiceResolution(
  span: CommitmentSpan,
  voice: "passive" | "potential",
  reason: string,
  predIdx: number,
  trace: TraceCollector | null,
  layout: ClauseLayout,
  extraTraceData?: Record<string, unknown>
): void {
  applyResolvedVoiceToSpan(
    span,
    voice,
    tailChainHasVoiceAcrossPredicateQuoteCarrier(span) ? "lexical_segment" : "whole_chain"
  );
  assignChainGlobalRareruReadings(span, [voice]);
  if (trace !== null) {
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "voice_resolution",
      true,
      withTraceClauseIdx({
        before: "open",
        after: voice,
        reason,
        ...extraTraceData
      }, layout.clauseIndexOfPredicate(predIdx))
    ));
  }
}

function sameSet<T>(left: ReadonlySet<T> | undefined, right: ReadonlySet<T>): boolean {
  if (left === undefined) {
    return right.size === 0;
  }
  if (left.size !== right.size) {
    return false;
  }
  for (const value of right) {
    if (!left.has(value)) {
      return false;
    }
  }
  return true;
}

export function resolveRareruReading(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  trace: TraceCollector | null = null,
  lookups: LookupTables,
  numeric: NumericTables,
  deferredObjectReadings: Map<number, DeferredRareruObjectState>
): void {
  const readings = deferredObjectReadings.get(predIdx)?.[0] ?? span.rareruReadings;
  if (readings === undefined || readings.size === 0) return;
  const resumesDeferredObject = deferredObjectReadings.has(predIdx);
  const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
  const subjectArguments = honorificSubjectArgumentsForPredicate(
    predIdx,
    tokens,
    layout,
    lookups
  );
  const hasRespectSubject = hasRespectSubjectSignal(subjectArguments, tokens, lookups);
  const hasHonorificSubject = addHonorificRareruReadingByLayout(
    span,
    predIdx,
    tokens,
    layout,
    lookups,
    hasRespectSubject
  );
  const updatedReadings = span.rareruReadings ?? readings;
  const before = [...updatedReadings].sort();
  const particleIndices = argumentParticleIndicesForPredicate(predIdx, tokens, layout);
  const argumentView = new PredicateArgumentView(tokens, predIdx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles
  });
  const argumentsForPredicate = argumentView.arguments({ includeBorrowed: true });
  const hasOwnSubject = argumentsForPredicate.some((argument) => !argument.borrowed && argument.role === "subject");
  const hasGaNoConvertedSubject = !hasRespectSubject &&
    !spanHasPastAux(span) &&
    !spanTailStemIsSahenVerbalization(span) &&
    updatedReadings.has("potential") &&
    argumentsForPredicate.some((argument) =>
      !argument.borrowed && argument.role === "subject" && argument.particle.surface === "の"
    );
  const subjectAnimacy = subjectAnimacyForPredicate(tokens, predIdx, layout, lookups);
  const hasAmbiguousDefaultWinner = rareruVoiceHasAmbiguousDefaultWinner(span, updatedReadings, tokens[predIdx], predicateDictForms, lookups);
  const abilityModalCueKind = rareruAbilityModalCueKind(span, predIdx, tokens, layout, lookups) ?? (argumentsForPredicate.some((argument) => !argument.borrowed && argument.particle.surface === "で" && isPersonCountBeforeDe(tokens, argument.particleIdx, lookups)) ? "volitional_manner_adverb" : null);
  const hasRelativeHeadObject = !spanHasPastAux(span) && (span.voice == null || hasAmbiguousDefaultWinner) && updatedReadings.has("potential") && !hasOwnSubject && predicateDictForms.some((form) => lookups.RARERU_META_CLASSIFICATION_TARGET_PASSIVE.has(form) || (abilityModalCueKind !== null && lookups.RARERU_META_TRANSITIVE.has(form))) && argumentsForPredicate.some((argument) => argument.origin === "relative_head");
  const hasDirectObjectArgument = argumentsForPredicate.some((argument) => argument.role === "object" && argument.origin !== "relative_head");
  const hasOwnedDirectObject = argumentsForPredicate.some((argument) => !argument.borrowed && argument.role === "object");
  const objectBorrowUnresolved = !resumesDeferredObject && (span.voice == null || hasAmbiguousDefaultWinner) && !hasDirectObjectArgument && !hasRelativeHeadObject && argumentView.hasUnresolvedConnectiveObjectBorrow(argumentsForPredicate);
  const blocksPassiveState = (hasDirectObjectArgument || objectBorrowUnresolved) && (!hasOwnSubject || subjectAnimacy !== "inanimate" || (resumesDeferredObject && abilityModalCueKind !== null) || hasOwnedDirectObject);
  if (objectBorrowUnresolved) deferredObjectReadings.set(predIdx, [new Set(updatedReadings), span.sourceCandidates ?? null]);
  if (objectBorrowUnresolved && tailDefaultVoiceWithRetractedOpenEvidence(span, predIdx, tokens, particleIndices, layout, lookups) !== null) return;
  const hasAnimateNi = hasAnimateNiAgentParticle(tokens, particleIndices, lookups);
  const hasAnimateNiAgent = hasAnimateNi;
  const hasNiYotteMarker = hasNiYotteAgentMarker(tokens, particleIndices);
  const hasAnimateKaraSource = hasAnimateKaraSourceInClause(tokens, particleIndices, lookups);
  const predicateInKaraSourceSet = predicateDictForms.some((form) => lookups.RARERU_KARA_SOURCE_VERBS.has(form));
  const hasAnimateKaraMarker = hasAnimateKaraSource && predicateInKaraSourceSet;
  const honorificSubjectGaIdx = hasRespectSubject
    ? subjectArguments.find((subject) =>
      subject.particle.surface === "が" &&
      hasRespectSubjectSignal([subject], tokens, lookups)
    )?.particleIdx ?? null
    : null;
  const hasRespectSubjectAbilityCue = hasRespectSubject &&
    !hasAnimateNi &&
    !hasNiYotteMarker &&
    !hasAnimateKaraMarker &&
    shouldDeferHonorificRareruForAbilityCue(span, predIdx, tokens, layout, predicateDictForms, {
      hasAnimateKaraSource,
      predicateInKaraSourceSet
    }, lookups);
  const shouldDeferHonorificForAbility = updatedReadings.has("honorific") &&
    hasHonorificSubject &&
    hasRespectSubjectAbilityCue;
  if (hasRespectSubjectAbilityCue && honorificSubjectGaIdx !== null) {
    span.rareruAbilitySubjectParticleIdx = honorificSubjectGaIdx;
  }

  const hasHonorificChainEvidence = tailChainHasHonorificRareruEvidence(span);
  if (hasHonorificChainEvidence) {
    if (rareruHonorificRewriteBlockedByCausativePassive(span)) {
      commitVoiceResolution(span, "passive", "causative_passive_preserved", predIdx, trace, layout);
      return;
    }
    const hasHonorificActiveStructure = hasRespectSubject && (
      honorificActiveArgumentEvidence(span, predIdx, tokens, layout, lookups) !== null ||
      predicateDictForms.some((form) => lookups.RARERU_HONORIFIC_SUBJECT_INTRANSITIVE.has(form))
    );
    const hasPrecedingPassiveVoice = tailChainHasPassiveVoiceBeforeHonorificEvidence(span);
    const preservesInnerPassive = hasPrecedingPassiveVoice && (
      !hasHonorificActiveStructure ||
      hasAnimateNiAgent ||
      hasNiYotteMarker ||
      hasAnimateKaraMarker
    );
    if (preservesInnerPassive) {
      applyOuterHonorificRareruToPassiveSpan(span, lookups);
      assignChainGlobalRareruReadings(span, ["passive", "honorific"]);
    } else {
      applyHonorificRareruFallbackToSpan(span, lookups, "evidence_segment");
      assignChainGlobalRareruReadings(span, ["honorific"]);
    }
    if (trace !== null) {
      trace.record(new TraceEvent(
        predIdx,
        "commitment",
        "rareru_reading_resolution",
        true,
        withTraceClauseIdx({
          before,
          after: preservesInnerPassive ? "passive+honorific" : "honorific",
          reason: preservesInnerPassive
            ? "te_oru_chain_passive_agent_then_honorific"
            : "te_oru_chain_honorific"
        }, layout.clauseIndexOfPredicate(predIdx))
      ));
    }
    return;
  }

  if (hasNiYotteMarker && (span.voice == null || hasAmbiguousDefaultWinner)) {
    commitVoiceResolution(span, "passive", "ni_yotte_agent", predIdx, trace, layout);
    return;
  }

  if (hasAnimateKaraMarker && (span.voice == null || hasAmbiguousDefaultWinner)) {
    commitVoiceResolution(span, "passive", "animate_kara_source", predIdx, trace, layout);
    return;
  }

  if (
    updatedReadings.has("honorific") &&
    hasHonorificSubject &&
    !hasAnimateNi &&
    !hasNiYotteMarker &&
    !hasAnimateKaraMarker &&
    !rareruHonorificRewriteBlockedByCausativePassive(span) &&
    !shouldDeferHonorificForAbility
  ) {
    const rewriteScope = quotedPredicateCarrierVoicePrefersPassive(span)
      ? "lexical_segment"
      : "whole_chain";
    if (applyHonorificRareruFallbackToSpan(span, lookups, rewriteScope)) {
      assignChainGlobalRareruReadings(span, ["honorific"]);
      if (trace !== null) {
        trace.record(new TraceEvent(
          predIdx,
          "commitment",
          "rareru_reading_resolution",
          true,
          withTraceClauseIdx({
            before,
            after: "honorific",
            reason: "honorific_subject"
          }, layout.clauseIndexOfPredicate(predIdx))
        ));
      }
      return;
    }
  }

  if (
    updatedReadings.has("honorific") &&
    !hasAnimateNi &&
    !hasNiYotteMarker &&
    !hasAnimateKaraMarker &&
    tailChainHasHonorificFormulaicVoice(span) &&
    applyHonorificRareruFallbackToSpan(span, lookups, "whole_chain")
  ) {
    assignChainGlobalRareruReadings(span, ["honorific"]);
    if (trace !== null) {
      trace.record(new TraceEvent(
        predIdx,
        "commitment",
        "rareru_reading_resolution",
        true,
        withTraceClauseIdx({
          before,
          after: "honorific",
          reason: "honorific_formulaic_construction"
        }, layout.clauseIndexOfPredicate(predIdx))
      ));
    }
    return;
  }

  if (
    span.voice != null && !hasAmbiguousDefaultWinner && !resumesDeferredObject &&
    !hasRelativeHeadObject && !hasGaNoConvertedSubject
  ) {
    return;
  }

  if (hasAnimateNi) {
    commitVoiceResolution(span, "passive", "animate_ni", predIdx, trace, layout);
    return;
  }

  if (
    !tailChainHasVoiceAcrossPredicateQuoteCarrier(span) &&
    quotedPredicateCarrierVoicePrefersPassive(span)
  ) {
    commitVoiceResolution(span, "passive", "quoted_predicate_carrier", predIdx, trace, layout);
    return;
  }

  if (semanticFrameVoicePrefersPassive(span, predIdx, tokens, layout, contentMap, lookups, numeric)) {
    commitVoiceResolution(span, "passive", "semantic_frame_voice", predIdx, trace, layout);
    return;
  }

  if (lexicalCausativeRareruPrefersPassive(predicateDictForms, lookups)) {
    commitVoiceResolution(span, "passive", "lexical_causative_passive", predIdx, trace, layout);
    return;
  }

  if (predicateSuffixRareruPrefersPassive(span)) {
    commitVoiceResolution(span, "passive", "predicate_suffix_rareru", predIdx, trace, layout);
    return;
  }

  if (makeStateChangeRareruPrefersPassive(span)) {
    commitVoiceResolution(span, "passive", "make_state_change_passive", predIdx, trace, layout);
    return;
  }

  if (postverbAuxiliaryVoicePrefersPotential(span)) {
    commitVoiceResolution(span, "potential", "postverb_auxiliary_potential", predIdx, trace, layout);
    return;
  }

  if (teIruAuxiliaryVoicePrefersPotential(span)) {
    commitVoiceResolution(span, "potential", "te_iru_auxiliary_voice", predIdx, trace, layout);
    return;
  }

  if (possessorRareruPrefersPassive(span, predIdx, tokens, particleIndices, layout, lookups)) {
    commitVoiceResolution(span, "passive", "possessor_passive_evidence", predIdx, trace, layout);
    return;
  }

  if (classificationTargetRareruPrefersPassive(predicateDictForms, hasRelativeHeadObject || blocksPassiveState, tokens, particleIndices, lookups)) {
    commitVoiceResolution(span, "passive", "classification_target_ni", predIdx, trace, layout);
    return;
  }

  if (inanimateSubjectPastRareruPrefersPassive(span, blocksPassiveState, subjectAnimacy)) {
    commitVoiceResolution(span, "passive", "inanimate_subject_past_passive", predIdx, trace, layout);
    return;
  }

  if (inanimateSubjectRenyouRareruPrefersPassive(span, predIdx, tokens, blocksPassiveState, layout, predicateDictForms, subjectAnimacy, lookups)) {
    commitVoiceResolution(span, "passive", "inanimate_subject_renyou_passive", predIdx, trace, layout);
    return;
  }

  const abilityCueResolution = tryResolveRareruAbilityModalCue(span, predicateDictForms, {
    hasAnimateNi,
    hasAnimateKaraSource,
    hasTeIruPassiveStateEvidence: teiruRareruPrefersPassive(span, hasOwnedDirectObject || objectBorrowUnresolved, lookups),
    predicateInKaraSourceSet,
    abilityModalCueKind
  }, lookups);
  if (abilityCueResolution !== null) {
    commitVoiceResolution(span, "potential", "ability_modal_cue", predIdx, trace, layout, {
      modal_cue_kind: abilityCueResolution.modalCueKind
    });
    return;
  }

  if (whFreeChoiceObjectPrefersPotential(predIdx, tokens, layout)) {
    commitVoiceResolution(span, "potential", "wh_free_choice_object", predIdx, trace, layout);
    return;
  }

  if (
    hasRespectSubject &&
    !hasHonorificSubject &&
    !hasAnimateNiAgent &&
    !hasNiYotteMarker &&
    !hasAnimateKaraMarker
  ) {
    commitVoiceResolution(span, "passive", "honorific_subject_transitivity_counterevidence", predIdx, trace, layout);
    return;
  }

  if (span.voice != null && !hasRelativeHeadObject && !resumesDeferredObject && !hasGaNoConvertedSubject) {
    return;
  }

  if (teiruRareruPrefersPassive(span, hasOwnedDirectObject || objectBorrowUnresolved, lookups)) {
    commitVoiceResolution(span, "passive", "weak_passive_state", predIdx, trace, layout);
    return;
  }

  if (teShimauRareruPrefersPassive(span)) {
    commitVoiceResolution(span, "passive", "te_shimau_completion", predIdx, trace, layout);
    return;
  }

  if (hasRelativeHeadObject) {
    commitVoiceResolution(span, "potential", "relative_head_object", predIdx, trace, layout);
    return;
  }

  const retractedTailDefault = tailDefaultVoiceWithRetractedOpenEvidence(span, predIdx, tokens, particleIndices, layout, lookups);
  if (retractedTailDefault !== null) {
    commitVoiceResolution(span, retractedTailDefault, "open_evidence_retracted_tail_default", predIdx, trace, layout);
    return;
  }

  commitVoiceResolution(span, "potential", "default_open_voice", predIdx, trace, layout);
}

export function refineRareruReadingFromSelectedFrame(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  runtimeMatch: SemanticFrameRuntimeMatch | null,
  trace: TraceCollector | null,
  lookups: LookupTables
): boolean {
  if (
    span.voice !== "passive" ||
    rareruHonorificRewriteBlockedByCausativePassive(span) ||
    runtimeMatch?.match === null ||
    runtimeMatch?.match === undefined ||
    runtimeMatch.translation.dropFirstPassiveAux === true
  ) {
    return false;
  }
  const argumentsForPredicate = new PredicateArgumentView(tokens, predIdx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles
  }).arguments({ includeBorrowed: true });
  const argumentByParticle = new Map(argumentsForPredicate.map((argument) => [argument.particleIdx, argument]));
  const filledSlots = Object.values(runtimeMatch.match.slots);
  const selectedFrameHasNonAgentNi = filledSlots.some((filler) =>
    !filler.borrowed && filler.frameParticle === "に"
  );
  const selectedFrameOwnsStructuralObject = filledSlots.some((filler) => {
    if (filler.frameParticle !== "を") return false;
    const argument = argumentByParticle.get(filler.particleIdx);
    return argument?.origin === "relative_head";
  });
  if (!selectedFrameHasNonAgentNi && !selectedFrameOwnsStructuralObject) {
    return false;
  }
  if (
    selectedFrameHasNonAgentNi &&
    !tailChainHasHonorificRareruEvidence(span) &&
    !honorificSubjectTransitivitySupportsActiveReading(span, predIdx, tokens, layout, lookups)
  ) {
    return false;
  }
  return applyLateHonorificRareruEvidence(
    span,
    predIdx,
    tokens,
    layout,
    trace,
    lookups,
    selectedFrameHasNonAgentNi ? "selected_frame_non_agent_ni" : "selected_frame_structural_object"
  );
}

export function refineRareruReadingFromIntrinsicHonorificMetadata(
  span: CommitmentSpan,
  predIdx: number,
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): boolean {
  if (span.voice !== "passive" || rareruHonorificRewriteBlockedByCausativePassive(span)) return false;
  const laneSet = commitmentLaneCandidateSet(span.sourceCandidates);
  const selectedCandidate = isResolvedCandidateSet(laneSet) ? laneSet.winner.candidate : undefined;
  if (span.intrinsicHonorific !== true && selectedCandidate?.intrinsicHonorific !== true) return false;
  const before = [...(span.rareruReadings ?? [])].sort();
  if (!applyHonorificRareruFallbackToSpan(span, lookups, "lexical_segment")) return false;
  const hasMixedVoiceSegments = tailChainHasVoiceAcrossPredicateQuoteCarrier(span);
  assignChainGlobalRareruReadings(span, ["honorific"]);
  delete span.passiveClass;
  remapSpanCandidatePayloads(span, (candidate) => {
    if (hasMixedVoiceSegments) {
      const { passiveClass: _passiveClass, rareruReadings: _rareruReadings, ...segmentScoped } = candidate;
      return segmentScoped;
    }
    const { passiveClass: _passiveClass, ...withoutPassiveClass } = candidate;
    return withoutPassiveClass;
  });
  if (trace !== null) {
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "rareru_reading_refinement",
      true,
      withTraceClauseIdx({
        before,
        after: hasMixedVoiceSegments ? "segment_scoped" : "honorific",
        reason: "intrinsic_honorific_metadata"
      }, layout.clauseIndexOfPredicate(predIdx))
    ));
  }
  return true;
}

export function refineRareruReadingFromClosedHonorificEvidence(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): boolean {
  if (
    span.voice !== "passive" ||
    rareruHonorificRewriteBlockedByCausativePassive(span) ||
    !hasRespectSubjectSignal(
      honorificSubjectArgumentsForPredicate(predIdx, tokens, layout, lookups),
      tokens,
      lookups
    ) ||
    !honorificSubjectTransitivitySupportsActiveReading(span, predIdx, tokens, layout, lookups)
  ) {
    return false;
  }
  return applyLateHonorificRareruEvidence(
    span,
    predIdx,
    tokens,
    layout,
    trace,
    lookups,
    "closed_honorific_evidence_after_candidate_commitment"
  );
}

export function refineRareruReadingFromCommittedParticleRoles(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables
): boolean {
  if (
    span.voice !== "passive" ||
    rareruHonorificRewriteBlockedByCausativePassive(span)
  ) return false;
  const roles = span.committedParticleRoles ?? {};
  const hasCommittedNonAgentNi = Object.entries(roles).some(([rawIdx, assignment]) => {
    const particleIdx = Number(rawIdx);
    if (tokens[particleIdx]?.surface !== "に") return false;
    if (assignment.role === "ni_object" || assignment.role === "animate_object") return true;
    return assignment.commitmentSource === "semantic_frame_slot" ||
      assignment.commitmentSource === COMMITMENT_SOURCE_CASE_REALIZATION ||
      assignment.commitmentSource === COMMITMENT_SOURCE_SLOT_REALIZATION;
  });
  if (!hasCommittedNonAgentNi) return false;
  if (
    !tailChainHasHonorificRareruEvidence(span) &&
    !honorificSubjectTransitivitySupportsActiveReading(span, predIdx, tokens, layout, lookups)
  ) {
    return false;
  }
  return applyLateHonorificRareruEvidence(
    span,
    predIdx,
    tokens,
    layout,
    trace,
    lookups,
    "committed_non_agent_ni"
  );
}

function applyLateHonorificRareruEvidence(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  trace: TraceCollector | null,
  lookups: LookupTables,
  reason: string
): boolean {
  if (rareruHonorificRewriteBlockedByCausativePassive(span)) return false;
  const hasChainEvidence = tailChainHasHonorificRareruEvidence(span);
  const hasRespectSubject = hasRespectSubjectSignal(
    honorificSubjectArgumentsForPredicate(predIdx, tokens, layout, lookups),
    tokens,
    lookups
  );
  if (!hasChainEvidence && !hasRespectSubject) return false;
  const before = [...(span.rareruReadings ?? [])].sort();
  if (!applyHonorificRareruFallbackToSpan(
    span,
    lookups,
    hasChainEvidence ? "evidence_segment" : "lexical_segment"
  )) {
    return false;
  }
  assignChainGlobalRareruReadings(span, ["honorific"]);
  delete span.passiveClass;
  remapSpanCandidatePayloads(span, (candidate) => {
    const { passiveClass: _passiveClass, ...withoutPassiveClass } = candidate;
    return withoutPassiveClass;
  });
  if (trace !== null) {
    trace.record(new TraceEvent(
      predIdx,
      "commitment",
      "rareru_reading_refinement",
      true,
      withTraceClauseIdx({ before, after: "honorific", reason }, layout.clauseIndexOfPredicate(predIdx))
    ));
  }
  return true;
}

function tailDefaultVoiceWithRetractedOpenEvidence(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  layout: ClauseLayout,
  lookups: LookupTables
): "passive" | "potential" | null {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  if (spanHasNegativeAux(span)) {
    return null;
  }
  if (tailRootHasQuestionSfp(plan.realization.root)) {
    return null;
  }
  if (hasClauseLocalPrecedingAdverbialModifier(tokens, predIdx, layout)) {
    return null;
  }
  const hasOwnedVoiceDisambiguationParticle = particleIndices.some((particleIdx) =>
    caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
      acceptedSurfaces: ["を", "が", "に"],
      consumers: ["deferred_commitment"]
    }) !== null
  );
  if (hasOwnedVoiceDisambiguationParticle) {
    return null;
  }
  const openerIndices = voiceOpenerParticleIndices(tokens, predIdx);
  if (openerIndices.length === 0 || !openerIndices.every((openerIdx) => isNiFrameProjectionOpener(tokens, openerIdx, lookups))) {
    return null;
  }
  const voiceOp = tailRootVoiceOps(plan.realization.root).find((op) =>
    op.candidates !== undefined &&
    op.candidates.includes("passive") &&
    op.candidates.includes("potential")
  );
  const restored = voiceOp?.candidates?.find(
    (candidate): candidate is "passive" | "potential" => candidate === "passive" || candidate === "potential"
  );
  return restored ?? null;
}

function voiceOpenerParticleIndices(tokens: readonly CommitmentToken[], predIdx: number): readonly number[] {
  const openers: number[] = [];
  for (let cursor = predIdx - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      continue;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS)) {
      break;
    }
    if (caseParticleMarkerRelationForToken(token, cursor, {
      acceptedSurfaces: ["を", "が", "に"],
      consumers: ["deferred_commitment"]
    }) !== null) {
      openers.push(cursor);
    }
  }
  return openers;
}

function isNiFrameProjectionOpener(
  tokens: readonly CommitmentToken[],
  openerIdx: number,
  lookups: LookupTables
): boolean {
  const opener = tokens[openerIdx];
  if (opener === undefined || opener.surface !== "に") {
    return false;
  }
  return admittedNominalFrameMarkerEndsAt({
    tokens: tokens as readonly RuntimeHaruToken[],
    markerStart: openerIdx,
    lookups,
    registry: "tail",
    accept: (spec) => spec.surface.startsWith("に")
  }).some((end) => end > openerIdx + 1);
}

function hasClauseLocalPrecedingAdverbialModifier(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout
): boolean {
  const clause = layout.clauseOfPredicate(predIdx);
  const prevIdx = predIdx - 1;
  if (clause === undefined || prevIdx - 1 < clause.start) {
    return false;
  }
  const prev = tokens[prevIdx];
  const before = tokens[prevIdx - 1];
  return prev !== undefined &&
    before !== undefined &&
    copulaNiMarkerRelationForToken(prev, prevIdx, { consumers: ["deferred_commitment"] }) !== null &&
    pos0in(before.pos, NOMINAL_KEIJOU_BITS | (1 << 形容詞0));
}

function rareruVoiceHasAmbiguousDefaultWinner(
  span: CommitmentSpan,
  readings: ReadonlySet<RareruReading>,
  predicate: CommitmentToken | undefined,
  predicateDictForms: readonly string[],
  lookups: LookupTables
): boolean {
  if (span.voice === null || span.voice === undefined) {
    return false;
  }
  if (span.hasCausativePassive === true) {
    return false;
  }
  if (!readings.has("passive") || !readings.has("potential")) {
    return false;
  }
  if (predicateDictForms.some((form) => lookups.RARERU_PASSIVE_PREFERRED.has(form))) {
    return false;
  }
  if (teIruAuxiliaryVoicePrefersPotential(span)) {
    return true;
  }
  return predicateCanHostIchidanRareruAmbiguity(predicate, predicateDictForms);
}

const WH_FREE_CHOICE_POTENTIAL_EXCLUDED_HOSTS: ReadonlySet<string> = new Set(["誰", "だれ"]);

function whFreeChoiceObjectPrefersPotential(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout
): boolean {
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return false;
  }
  const end = Math.min(predIdx, clause.end);
  const cursor = new TokenCursor(tokens, clause.start, end);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    const host = cursor.current();
    if (host === undefined) {
      continue;
    }
    const hostForm = host.dictionaryForm || host.surface;
    if (
      (!WH_INDEFINITE_DEMO_HOSTS.has(hostForm) && !WH_INDEFINITE_DEMO_HOSTS.has(host.surface)) ||
      WH_FREE_CHOICE_POTENTIAL_EXCLUDED_HOSTS.has(hostForm)
    ) {
      continue;
    }
    const de = cursor.peek(1);
    if (de === undefined) {
      continue;
    }
    if (de.surface === "でも" && (de.pos & POS0) === 助詞) {
      return true;
    }
    const mo = cursor.peek(2);
    if (
      de.surface === "で" &&
      mo !== undefined &&
      mo.surface === "も" &&
      (mo.pos & POS0) === 助詞
    ) {
      return true;
    }
  }
  return false;
}

function predicateCanHostIchidanRareruAmbiguity(
  predicate: CommitmentToken | undefined,
  predicateDictForms: readonly string[]
): boolean {
  const conjugation4 = (predicate?.pos ?? 0) & POS4;
  if (is上一段(conjugation4) || is下一段(conjugation4)) {
    return true;
  }
  return predicate !== undefined && isKaHenPredicateToken(predicate);
}

function lexicalCausativeRareruPrefersPassive(
  predicateDictForms: readonly string[],
  lookups: LookupTables
): boolean {
  return predicateDictForms.some((form) =>
    lookups.CAUSATIVE_PASSIVE_LEXICAL_CAUSATIVE_VERBS.has(form) &&
    (
      lookups.CAUSATIVE_PASSIVE_COERCIVE_VERBS.has(form) ||
      lookups.CAUSATIVE_PASSIVE_NEUTRAL_VERBS.has(form)
    )
  );
}

export function isNiYotteAgentMarkerVerbToken(token: { readonly pos: number; readonly dictionaryForm: string } | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    (token.dictionaryForm === "よる" || token.dictionaryForm === "因る");
}

export function hasNiYotteAgentMarker(tokens: readonly CommitmentToken[], particleIndices: readonly number[]): boolean {
  for (const particleIdx of particleIndices) {
    const token = tokens[particleIdx];
    if (token === undefined) {
      continue;
    }
    if (token.surface === "によって" || token.dictionaryForm === "によって") {
      return true;
    }
    if (caseParticleMarkerRelationForToken(token, particleIdx, {
      acceptedSurfaces: ["に"],
      consumers: ["deferred_commitment"]
    }) === null) {
      continue;
    }
    const next = tokens[particleIdx + 1];
    const afterNext = tokens[particleIdx + 2];
    if (next?.surface === "よって" || next?.surface === "因って") {
      return true;
    }
    if (
      (next?.surface === "よっ" || next?.dictionaryForm === "因る" || next?.dictionaryForm === "よる") &&
      afterNext?.surface === "て"
    ) {
      return true;
    }
    const niHostIsBoundNominalKoto = predicateNominalizerRelationForToken(
      tokens[particleIdx - 1],
      particleIdx - 1,
      { acceptedSurfaces: ["こと"], consumers: ["deferred_commitment"] }
    ) !== null;
    if (
      !niHostIsBoundNominalKoto &&
      next !== undefined &&
      (next.pos & POS0) === 動詞 &&
      (next.pos & POS5A) === 連用形_ &&
      (next.dictionaryForm === "よる" || next.dictionaryForm === "因る")
    ) {
      return true;
    }
  }
  return false;
}

function hasAnimateKaraSourceInClause(
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  lookups: LookupTables
): boolean {
  return particleIndices.some((particleIdx) => {
    const token = tokens[particleIdx];
    if (caseParticleMarkerRelationForToken(token, particleIdx, {
      acceptedSurfaces: ["から"],
      consumers: ["deferred_commitment"]
    }) === null) {
      return false;
    }
    const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
    return referent !== null && isAnimateReferentToken(referent, lookups);
  });
}

function shouldDeferHonorificRareruForAbilityCue(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  predicateDictForms: readonly string[],
  markerEvidence: {
    readonly hasAnimateKaraSource: boolean;
    readonly predicateInKaraSourceSet: boolean;
  },
  lookups: LookupTables
): boolean {
  if (!predicateDictForms.some((form) => lookups.RARERU_META_ABILITY_CUE.has(form) && lookups.RARERU_META_TRANSITIVE.has(form))) {
    return false;
  }
  if (rareruPredicateHasPassiveLexicalEvidence(predicateDictForms, lookups)) {
    return false;
  }
  if (markerEvidence.hasAnimateKaraSource && !markerEvidence.predicateInKaraSourceSet) {
    return false;
  }
  return rareruAbilityModalCueKind(span, predIdx, tokens, layout, lookups) !== null;
}

function tryResolveRareruAbilityModalCue(
  span: CommitmentSpan,
  predicateDictForms: readonly string[],
  markerEvidence: {
    readonly hasAnimateNi: boolean;
    readonly hasAnimateKaraSource: boolean;
    readonly hasTeIruPassiveStateEvidence: boolean;
    readonly predicateInKaraSourceSet: boolean;
    readonly abilityModalCueKind: RareruAbilityModalCueKind | null;
  },
  lookups: LookupTables
): RareruAbilityModalCueResolution | null {
  if (!predicateDictForms.some((form) => lookups.RARERU_META_ABILITY_CUE.has(form))) {
    return null;
  }
  if (markerEvidence.hasAnimateNi) {
    return null;
  }
  if (markerEvidence.hasAnimateKaraSource && !markerEvidence.predicateInKaraSourceSet) {
    return null;
  }
  if (markerEvidence.hasTeIruPassiveStateEvidence) {
    return null;
  }
  if (rareruPredicateHasPassiveLexicalEvidence(predicateDictForms, lookups)) {
    return null;
  }
  const modalCueKind = markerEvidence.abilityModalCueKind;
  return modalCueKind === null ? null : { modalCueKind };
}

function rareruPredicateHasPassiveLexicalEvidence(predicateDictForms: readonly string[], lookups: LookupTables): boolean {
  return predicateDictForms.some((form) =>
    lookups.ADVERSATIVE_PASSIVE_TRANSITIVE_VERBS.has(form) ||
    lookups.ADVERSATIVE_PASSIVE_INTRANSITIVE_VERBS.has(form) ||
    lookups.POSSESSOR_PASSIVE_VERBS.has(form)
  );
}

function classificationTargetRareruPrefersPassive(
  predicateDictForms: readonly string[],
  hasObjectArgument: boolean,
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  lookups: LookupTables
): boolean {
  if (!predicateDictForms.some((form) => lookups.RARERU_META_CLASSIFICATION_TARGET_PASSIVE.has(form))) {
    return false;
  }
  if (hasObjectArgument) {
    return false;
  }
  return particleIndices.some((particleIdx) => {
    if (!isCommitmentCaseParticleToken(tokens[particleIdx], particleIdx, "に")) {
      return false;
    }
    const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
    if (referent === null || isAnimateReferentToken(referent, lookups)) {
      return false;
    }
    return pos0in(referent.pos, NOMINAL_BITS);
  });
}

function inanimateSubjectPastRareruPrefersPassive(
  span: CommitmentSpan,
  hasObjectArgument: boolean,
  subjectAnimacy: ReturnType<typeof subjectAnimacyForPredicate>
): boolean {
  if (!spanHasPastAux(span)) {
    return false;
  }
  return !hasObjectArgument && subjectAnimacy === "inanimate";
}

function inanimateSubjectRenyouRareruPrefersPassive(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  hasObjectArgument: boolean,
  layout: ClauseLayout,
  predicateDictForms: readonly string[],
  subjectAnimacy: ReturnType<typeof subjectAnimacyForPredicate>,
  lookups: LookupTables
): boolean {
  if (spanHasPastAux(span) || spanIsAttributivePredicate(span)) {
    return false;
  }
  if (predicateDictForms.some((form) => lookups.RARERU_META_ABILITY_CUE.has(form))) {
    return false;
  }
  const clause = layout.clauseOfPredicate(predIdx) ?? null;
  return clause !== null &&
    !hasObjectArgument &&
    subjectAnimacy === "inanimate" &&
    hasRareruRenyouAuxBeforeClauseBoundary(tokens, predIdx, clause);
}

function hasRareruRenyouAuxBeforeClauseBoundary(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  clause: Clause
): boolean {
  const cursor = new TokenCursor(tokens, predIdx + 1, clause.end);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    const token = cursor.current();
    if (token === undefined) {
      continue;
    }
    if (!isRareruRenyouAuxToken(token)) {
      continue;
    }
    const next = tokens[cursor.pos + 1];
    return next !== undefined && isClausePunctuationToken(next);
  }
  return false;
}

function isRareruRenyouAuxToken(token: CommitmentToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (助動詞 | 連用形_) && (token.dictionaryForm === "られる" || token.dictionaryForm === "れる");
}

function rareruAbilityModalCueKind(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables
): RareruAbilityModalCueKind | null {
  if (spanHasNegativeAux(span)) {
    return "negation";
  }
  if (hasRareruTerminalQuestionCue(predIdx, tokens, layout)) {
    return "question";
  }
  if (hasRareruYouNiNaruCue(predIdx, tokens, layout)) {
    return "you_ni_naru";
  }
  const adverbCueKind = rareruAbilityAdverbCueKind(predIdx, tokens, layout, lookups);
  return adverbCueKind;
}

function hasRareruTerminalQuestionCue(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout
): boolean {
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return false;
  }
  const cursor = new TokenCursor(tokens, predIdx + 1, clause.end);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    if (kaMarkerRelationAt(cursor.tokens, cursor.pos, ["deferred_commitment"])?.particleSubtype1 !== 終助詞) {
      continue;
    }
    if (cursor.tokens.slice(cursor.pos + 1, cursor.end).every(isIgnorableRareruTerminalTailToken)) {
      return true;
    }
  }
  return false;
}

function isIgnorableRareruTerminalTailToken(token: CommitmentToken): boolean {
  return (token.pos & POS0) === 補助記号 ||
    (token.pos & POS0) === 記号 ||
    (token.pos & POS01) === 助詞_終助詞;
}

function hasRareruYouNiNaruCue(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout
): boolean {
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return false;
  }
  const cursor = new TokenCursor(tokens, predIdx + 1, clause.end);
  for (; cursor.pos < clause.end - 2; cursor.advance()) {
    const you = cursor.current();
    const ni = cursor.peek(1);
    const naru = cursor.peek(2);
    if ((you?.surface !== "よう" && you?.dictionaryForm !== "様") || ni?.surface !== "に") {
      continue;
    }
    if (naru?.dictionaryForm === "成る" || naru?.dictionaryForm === "なる") {
      return true;
    }
  }
  return false;
}

function rareruAbilityAdverbCueKind(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables
): "volitional_manner_adverb" | "default" | null {
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return null;
  }
  let hasDefaultCue = false;
  const cursor = new TokenCursor(tokens, clause.start, predIdx);
  for (; cursor.pos < cursor.end; cursor.advance()) {
    const token = cursor.current();
    if (token === undefined || !tokenMatchesRareruAbilityModalCue(token, lookups)) {
      continue;
    }
    if (
      lookups.RARERU_META_VOLITIONAL_MANNER_MODAL_CUES.has(token.surface) ||
      lookups.RARERU_META_VOLITIONAL_MANNER_MODAL_CUES.has(token.dictionaryForm)
    ) {
      return "volitional_manner_adverb";
    }
    hasDefaultCue = true;
  }
  return hasDefaultCue ? "default" : null;
}

function tokenMatchesRareruAbilityModalCue(token: CommitmentToken, lookups: LookupTables): boolean {
  return lookups.RARERU_META_ABILITY_MODAL_CUES.has(token.surface) ||
    lookups.RARERU_META_ABILITY_MODAL_CUES.has(token.dictionaryForm);
}

function addHonorificRareruReadingByLayout(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  hasHonorificSubject: boolean
): boolean {
  const readings = span.rareruReadings ?? new Set<RareruReading>();
  if (readings.size === 0) {
    return false;
  }
  const supportsHonorificActiveReading = hasHonorificSubject &&
    honorificSubjectTransitivitySupportsActiveReading(span, predIdx, tokens, layout, lookups);
  if (supportsHonorificActiveReading && !readings.has("honorific")) {
    span.rareruReadings = new Set<RareruReading>([...readings, "honorific"]);
  }
  return supportsHonorificActiveReading;
}

function honorificSubjectTransitivitySupportsActiveReading(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
  const argumentEvidence = honorificActiveArgumentEvidence(span, predIdx, tokens, layout, lookups);
  if (
    argumentEvidence === "explicit_object" ||
    (
      argumentEvidence === "structural_object" &&
      !predicateCanHostIchidanRareruAmbiguity(tokens[predIdx], predicateDictForms)
    )
  ) {
    return true;
  }
  if (predicateDictForms.some((form) => lookups.RARERU_META_TRANSITIVE.has(form))) {
    return false;
  }
  if (teIruAuxiliaryVoicePrefersPotential(span)) {
    return false;
  }
  return predicateDictForms.some((form) => lookups.RARERU_HONORIFIC_SUBJECT_INTRANSITIVE.has(form));
}

function rareruHonorificRewriteBlockedByCausativePassive(span: CommitmentSpan): boolean {
  return span.hasCausativePassive === true || span.passiveClass === "causative_passive_neutral";
}

function honorificActiveArgumentEvidence(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables
): "explicit_object" | "structural_object" | null {
  const clause = layout.clauseOfPredicate(predIdx) ?? null;
  const argumentsForPredicate = new PredicateArgumentView(tokens, predIdx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles
  }).arguments({ includeBorrowed: true });
  const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
  const hasLemmaGlobalTransitiveValency = predicateDictForms.some((form) =>
    lookups.RARERU_META_TRANSITIVE.has(form)
  );
  if (argumentsForPredicate.some((argument) =>
    argument.role === "object" && argument.origin === "owned_particle"
  )) {
    return "explicit_object";
  }
  if (
    hasLemmaGlobalTransitiveValency &&
    argumentsForPredicate.some((argument) =>
      argument.origin === "relative_head" && argument.role === "object"
    )
  ) {
    return "structural_object";
  }
  const hasExplicitSubject = argumentsForPredicate.some((argument) =>
    argument.origin === "owned_particle" && argument.role === "subject"
  );
  const pureTopics = argumentsForPredicate.filter((argument) =>
    argument.origin === "topic_focus" && argument.role !== "oblique"
  );
  const themeTopic = pureTopics.length === 1 ? pureTopics[0] : undefined;
  if (
    clause?.predicates.length === 1 &&
    hasExplicitSubject &&
    (themeTopic?.role === "unknown" || themeTopic?.role === "topic_theme") &&
    hasLemmaGlobalTransitiveValency
  ) {
    return "structural_object";
  }
  return null;
}

function honorificSubjectArgumentsForPredicate(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  lookups: LookupTables
): ReturnType<typeof predicateSubjectArguments> {
  return predicateSubjectArguments(tokens, predIdx, layout, lookups, (argument, args) =>
    !args.some((candidate) => candidate.role === "subject") &&
    hasRespectSubjectSignal([argument], tokens, lookups)
  );
}

export function argumentParticleIndicesForPredicate(
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout
): readonly number[] {
  const clause = layout.clauseOfPredicate(predIdx);
  if (clause === undefined) {
    return [];
  }
  const particleIndices: number[] = [];
  const quoteInfo = layout.quoteSpanInfoContaining(predIdx);
  for (const particleIdx of clause.particlesOf(predIdx)) {
    const token = tokens[particleIdx];
    if (token === undefined) {
      continue;
    }
    if (layout.isQuoteTrappedArgument(particleIdx, predIdx)) {
      continue;
    }
    if (
      isCommitmentCaseParticleToken(token, particleIdx, "を") &&
      layout.isQuoteSealedPredicate(particleIdx, predIdx) &&
      !allowBDirectionWo(quoteInfo)
    ) {
      continue;
    }
    particleIndices.push(particleIdx);
  }
  return particleIndices;
}

export function allowBDirectionWo(info: ReturnType<ClauseLayout["quoteSpanInfoContaining"]>): boolean {
  return info !== undefined && info.label === "marked_predicate" && info.signals.markedPredicateKind === "verb_or_stem";
}

function teiruRareruPrefersPassive(
  span: CommitmentSpan,
  hasObjectArgument: boolean,
  lookups: LookupTables
): boolean {
  if (!spanHasTeIruAux(span)) {
    return false;
  }
  const jpDict = spanJpDictForm(span);
  if (jpDict !== null && lookups.RARERU_TE_IRU_POTENTIAL_PREFERRED.has(jpDict)) {
    return false;
  }
  if (hasObjectArgument) {
    return false;
  }
  return true;
}

function possessorRareruPrefersPassive(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  particleIndices: readonly number[],
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const predicateDictForms = passiveClassPredicateDictForms(span, tokens[predIdx]);
  if (!predicateDictForms.some((form) => lookups.POSSESSOR_PASSIVE_VERBS.has(form))) {
    return false;
  }
  if (!hasPossessorWoObject(tokens, particleIndices, lookups)) {
    return false;
  }
  return subjectAnimacyForPredicate(tokens, predIdx, layout, lookups) !== "inanimate";
}

export function quotedPredicateCarrierVoicePrefersPassive(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  return tailNodeHasPredicateQuoteCarrierBeforeVoice(plan.realization.root.tail);
}

function semanticFrameVoicePrefersPassive(
  span: CommitmentSpan,
  predIdx: number,
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  contentMap: CommitmentContentMap,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const readings = span.rareruReadings ?? new Set<RareruReading>();
  if (!readings.has("passive")) {
    return false;
  }
  return candidateSetCandidates(commitmentLaneCandidateSet(span.sourceCandidates)).some((candidate) => {
    const translation = candidate.translation;
    if (translation === undefined || translation.sourceFormat !== "senses") {
      return false;
    }
    if (translation.dropFirstPassiveAux !== true) {
      return false;
    }
    const frameDatas = translationFrameDataAlternatives(translation);
    if (!frameDatas.some((frameData) =>
      frameDataVoiceConditionIncludes(frameData, "passive") &&
      frameDataHasVoiceSourceEvidence(frameData)
    )) {
      return false;
    }
    return candidateFrameAlternativesMatch(
      candidate,
      span,
      tokens,
      predIdx,
      layout,
      contentMap,
      lookups,
      numeric,
      { voiceOverride: "passive" }
    ) === "match";
  });
}

function predicateSuffixRareruPrefersPassive(span: CommitmentSpan): boolean {
  const readings = span.rareruReadings ?? new Set<RareruReading>();
  if (!readings.has("passive") || !readings.has("potential")) {
    return false;
  }
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  const layer = firstAuxLayer(plan.realization.root.tail);
  if (layer === null) {
    return false;
  }
  const voiceIdx = layer.ops.findIndex((op) =>
    op.kind === "voice" &&
    op.candidates?.includes("passive") === true &&
    op.candidates.includes("potential")
  );
  return voiceIdx >= 0 && layer.ops.slice(voiceIdx + 1).some((op) => op.kind === "predicateSuffix");
}

function tailNodeHasPredicateQuoteCarrierBeforeVoice(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasPredicateQuoteCarrierBeforeVoice(node.inner) ||
      tailNodeHasPredicateQuoteCarrierBeforeVoice(node.outer);
  }
  return node.ops.some((op, index) =>
    op.kind === "voice" &&
    op.candidates !== undefined &&
    op.candidates.includes("passive") &&
    node.ops.slice(0, index).some((previous) => previous.kind === "predicateQuoteCarrier")
  );
}

function postverbAuxiliaryVoicePrefersPotential(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  return tailNodeHasPostverbAuxiliaryBeforeVoice(plan.realization.root.tail);
}

function teIruAuxiliaryVoicePrefersPotential(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  return tailNodeHasTeIruAspectBeforePotentialVoice(plan.realization.root.tail);
}

function tailNodeHasTeIruAspectBeforePotentialVoice(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasTeIruAspectBeforePotentialVoice(node.inner) ||
      tailNodeHasTeIruAspectBeforePotentialVoice(node.outer);
  }
  const voiceIdx = node.ops.findIndex((op) =>
    op.kind === "voice" &&
    op.candidates !== undefined &&
    op.candidates.includes("potential") &&
    op.candidates.includes("passive")
  );
  if (voiceIdx <= 0) {
    return false;
  }
  const previous = node.ops[voiceIdx - 1];
  return previous?.kind === "aspect" &&
    previous.aspect === "te_iru" &&
    previous.followingRareruReading !== "honorific";
}

function tailChainHasHonorificRareruEvidence(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  return tailNodeHasHonorificRareruEvidence(plan.realization.root.tail);
}

function tailChainHasPassiveVoiceBeforeHonorificEvidence(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) return false;
  return tailNodeHasPassiveVoiceBeforeHonorificEvidence(plan.realization.root.tail);
}

function tailChainHasHonorificFormulaicVoice(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) return false;
  return tailNodeHasHonorificFormulaicVoice(plan.realization.root.tail);
}

function tailNodeHasHonorificFormulaicVoice(node: TailNode): boolean {
  if (node.kind === "connective") {
    return auxLayerHasHonorificFormulaicVoice(node.inner) ||
      tailNodeHasHonorificFormulaicVoice(node.outer);
  }
  return auxLayerHasHonorificFormulaicVoice(node);
}

function auxLayerHasHonorificFormulaicVoice(layer: AuxLayerNode): boolean {
  return layer.ops.some((op) =>
    op.kind === "voice" && op.honorificFormulaicConstruction === true
  );
}

function tailChainHasVoiceAcrossPredicateQuoteCarrier(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) return false;
  return tailNodeHasVoiceAcrossPredicateQuoteCarrier(plan.realization.root.tail);
}

function assignChainGlobalRareruReadings(
  span: CommitmentSpan,
  readings: readonly RareruReading[]
): void {
  if (!tailChainHasVoiceAcrossPredicateQuoteCarrier(span)) {
    span.rareruReadings = new Set(readings);
    return;
  }
  delete span.rareruReadings;
  delete span.passiveClass;
  span.voice = null;
  remapSpanCandidatePayloads(span, (candidate) => {
    const {
      passiveClass: _passiveClass,
      rareruReadings: _rareruReadings,
      voice: _voice,
      ...segmentScoped
    } = candidate;
    return segmentScoped;
  });
}

function tailNodeHasVoiceAcrossPredicateQuoteCarrier(node: TailNode): boolean {
  if (node.kind === "connective") {
    return auxLayerHasVoiceAcrossPredicateQuoteCarrier(node.inner) ||
      tailNodeHasVoiceAcrossPredicateQuoteCarrier(node.outer);
  }
  return auxLayerHasVoiceAcrossPredicateQuoteCarrier(node);
}

function auxLayerHasVoiceAcrossPredicateQuoteCarrier(layer: AuxLayerNode): boolean {
  return layer.ops.some((op, carrierIdx) =>
    op.kind === "predicateQuoteCarrier" &&
    layer.ops.slice(0, carrierIdx).some((candidate) => candidate.kind === "voice") &&
    layer.ops.slice(carrierIdx + 1).some((candidate) => candidate.kind === "voice")
  );
}

function tailNodeHasHonorificRareruEvidence(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasHonorificRareruEvidence(node.inner) ||
      tailNodeHasHonorificRareruEvidence(node.outer);
  }
  return honorificEvidenceSegmentRanges(node.ops).length > 0;
}

function tailNodeHasPassiveVoiceBeforeHonorificEvidence(node: TailNode): boolean {
  if (node.kind === "connective") {
    return auxLayerHasPassiveVoiceBeforeHonorificEvidence(node.inner) ||
      tailNodeHasPassiveVoiceBeforeHonorificEvidence(node.outer);
  }
  return auxLayerHasPassiveVoiceBeforeHonorificEvidence(node);
}

function auxLayerHasPassiveVoiceBeforeHonorificEvidence(layer: AuxLayerNode): boolean {
  return layer.ops.some((op, evidenceVoiceIdx) => {
    const aspect = layer.ops[evidenceVoiceIdx - 1];
    if (
      op.kind !== "voice" ||
      aspect?.kind !== "aspect" ||
      aspect.aspect !== "te_iru" ||
      aspect.followingRareruReading !== "honorific"
    ) {
      return false;
    }
    const segmentStart = layer.ops
      .slice(0, evidenceVoiceIdx)
      .findLastIndex((candidate) => candidate.kind === "predicateQuoteCarrier") + 1;
    return layer.ops.slice(segmentStart, evidenceVoiceIdx - 1).some((candidate) =>
      candidate.kind === "voice" && candidate.voice === "passive"
    );
  });
}

function makeStateChangeRareruPrefersPassive(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return false;
  }
  return tailNodeHasMakeStateChangeBeforeVoice(plan.realization.root.tail);
}

function tailNodeHasMakeStateChangeBeforeVoice(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasMakeStateChangeBeforeVoice(node.inner) ||
      tailNodeHasMakeStateChangeBeforeVoice(node.outer);
  }
  const voiceIdx = node.ops.findIndex((op) =>
    op.kind === "voice" &&
    op.candidates !== undefined &&
    op.candidates.includes("potential") &&
    op.candidates.includes("passive")
  );
  if (voiceIdx <= 0) {
    return false;
  }
  const previous = node.ops[voiceIdx - 1];
  return previous?.kind === "postverbAuxiliary" &&
    previous.auxiliary.kind === "make_state_change";
}

function tailNodeHasPostverbAuxiliaryBeforeVoice(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasPostverbAuxiliaryBeforeVoice(node.inner) ||
      tailNodeHasPostverbAuxiliaryBeforeVoice(node.outer);
  }
  const voiceIdx = node.ops.findIndex((op) =>
    op.kind === "voice" &&
    op.candidates !== undefined &&
    op.candidates.includes("potential") &&
    op.candidates.includes("passive")
  );
  if (voiceIdx <= 0) {
    return false;
  }
  const previous = node.ops[voiceIdx - 1];
  return previous?.kind === "postverbAuxiliary" &&
    previous.auxiliary.followingRareruDefault === "potential";
}

function teShimauRareruPrefersPassive(span: CommitmentSpan): boolean {
  const plan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return tailChainHasAspect(plan, "te_shimau");
  }
  return false;
}

function spanJpDictForm(span: CommitmentSpan): string | null {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.jpDictForm ?? null;
  }
  return span.entry?.dictionaryForm ?? null;
}

function spanHasTeIruAux(span: CommitmentSpan): boolean {
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    return tailChainHasAspect(span.renderPlan, "te_iru");
  }
  return spanAuxTokens(span).some((aux) => aux.dictionaryForm === "てる");
}

function spanAuxTokens(span: CommitmentSpan): readonly CommitmentToken[] {
  return auxTokensFromRenderPlan(span.renderPlan ?? null);
}

function auxTokensFromRenderPlan(plan: RenderPlan | null): readonly CommitmentToken[] {
  if (plan?.kind === "lemma" || plan?.kind === "attributive") {
    return plan.auxTokens;
  }
  if (plan?.kind === "legacySurfaceComposition") {
    const suffix = typeof plan.suffix === "string" ? null : plan.suffix ?? null;
    const suffixAux = auxTokensFromRenderPlan(suffix);
    if (suffixAux.length > 0) {
      return suffixAux;
    }
    const prefix = typeof plan.prefix === "string" ? null : plan.prefix ?? null;
    return auxTokensFromRenderPlan(prefix);
  }
  return [];
}

function applyResolvedVoiceToSpan(
  span: CommitmentSpan,
  voice: Voice,
  scope: "whole_chain" | "lexical_segment" = "whole_chain"
): void {
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    const rewritten = scope === "lexical_segment" && voice !== "active"
      ? rewriteLexicalStemSegmentVoice(span.renderPlan, voice)
      : rewriteTailChainVoice(span.renderPlan, voice);
    if (rewritten !== undefined) {
      span.renderPlan = rewritten;
      span.korean = "";
    }
  }
  if (
    scope === "whole_chain" &&
    voice === "passive" &&
    span.renderPlan !== undefined &&
    span.renderPlan !== null
  ) {
    const passivePlan = setForcePassiveRenderPlan(span.renderPlan, true);
    if (passivePlan !== undefined) {
      span.renderPlan = passivePlan;
      span.korean = "";
    }
  }
  span.voice = voice;
  remapSpanCandidatePayloads(span, (candidate) => applyResolvedVoiceToCandidate(candidate, voice, scope));
}

function applyResolvedVoiceToCandidate(
  candidate: CommitmentCandidate,
  voice: Voice,
  scope: "whole_chain" | "lexical_segment" = "whole_chain"
): CommitmentCandidate {
  let renderPlan = candidate.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(renderPlan)) {
    renderPlan = scope === "lexical_segment" && voice !== "active"
      ? rewriteLexicalStemSegmentVoice(renderPlan, voice) ?? renderPlan
      : rewriteTailChainVoice(renderPlan, voice) ?? renderPlan;
  }
  if (scope === "whole_chain" && renderPlan !== null && voice === "passive") {
    renderPlan = setForcePassiveRenderPlan(renderPlan, true) ?? renderPlan;
  }
  const resolved: CommitmentCandidate = {
    ...candidate,
    renderPlan,
    voice,
    rareruReadings: resolveRareruReadingsForVoice(candidate.rareruReadings, voice)
  };
  if (candidate.korean !== undefined) {
    resolved.korean = renderPlan !== null ? "" : candidate.korean;
  }
  return resolved;
}

function resolveRareruReadingsForVoice(readings: ReadonlySet<RareruReading> | undefined, voice: Voice): ReadonlySet<RareruReading> {
  if (readings === undefined || readings.size === 0) {
    return readings ?? new Set();
  }
  if (voice === "passive") {
    return new Set<RareruReading>(["passive"]);
  }
  if (voice === "potential") {
    return new Set<RareruReading>(["potential"]);
  }
  return new Set();
}

function applyHonorificRareruFallbackToSpan(
  span: CommitmentSpan,
  lookups: LookupTables,
  scope: "whole_chain" | "evidence_segment" | "lexical_segment" = "whole_chain"
): boolean {
  const renderPlan = span.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(renderPlan)) {
    const rewrittenPlan = scope === "evidence_segment"
      ? rewriteHonorificEvidenceSegments(renderPlan)
      : scope === "lexical_segment"
        ? rewriteLexicalStemSegmentVoice(renderPlan, "honorific")
        : rewriteTailChainVoice(renderPlan, "honorific");
    if (scope === "lexical_segment" && rewrittenPlan === undefined) {
      return false;
    }
    if (rewrittenPlan !== undefined) {
      span.renderPlan = reclassifyHonorificChainAspectSemantics(rewrittenPlan, lookups);
      span.korean = "";
    }
  }
  if (candidateSetSize(commitmentLaneCandidateSet(span.sourceCandidates)) === 0) {
    const entry = span.entry ?? null;
    if (renderPlan !== null && !isPredicateHeadTailChainRenderPlan(renderPlan) && entry !== null) {
      const translation = entry.senses?.[0];
      if (translation !== undefined) {
        const rewrittenPlan = replaceLemmaRenderPlan(renderPlan, {
          koreanLemma: translation.korean,
          irregular: translation.irregular ?? null,
          koreanPos: translation.koreanPos ?? span.koreanPos,
          dropFirstPassiveAux: true
        });
        if (rewrittenPlan !== undefined) {
          span.renderPlan = rewrittenPlan;
          span.korean = "";
        }
      }
    }
  }
  span.voice = "active";
  remapSpanCandidatePayloads(span, (candidate) => applyHonorificRareruFallbackToCandidate(candidate, scope));
  return true;
}

function applyOuterHonorificRareruToPassiveSpan(span: CommitmentSpan, lookups: LookupTables): void {
  const rewritePlan = (plan: RenderPlan | null): RenderPlan | null => {
    if (!isPredicateHeadTailChainRenderPlan(plan)) return plan;
    const rewritten = rewriteHonorificEvidenceVoices(plan);
    return rewritten === undefined ? plan : reclassifyHonorificChainAspectSemantics(rewritten, lookups);
  };
  const spanPlan = rewritePlan(span.renderPlan ?? null);
  if (spanPlan !== null && spanPlan !== span.renderPlan) {
    span.renderPlan = spanPlan;
    span.korean = "";
  }
  span.voice = "passive";
  remapSpanCandidatePayloads(span, (candidate) => {
    const renderPlan = rewritePlan(candidate.renderPlan ?? null);
    return {
      ...candidate,
      voice: "passive",
      rareruReadings: new Set<RareruReading>(["passive", "honorific"]),
      ...(renderPlan === null ? {} : { renderPlan }),
      ...(candidate.korean === undefined ? {} : { korean: renderPlan !== null ? "" : candidate.korean })
    };
  });
}

function rewriteHonorificEvidenceVoices(
  plan: PredicateHeadTailChainRenderPlan
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodeHonorificEvidenceVoices(plan.realization.root.tail);
  if (!rewritten.changed) return undefined;
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...plan.realization.root, tail: rewritten.node },
      warnings: withoutResolvedVoiceReadingWarnings(plan.realization.warnings)
    }
  };
}

function rewriteTailNodeHonorificEvidenceVoices(
  node: TailNode
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteAuxLayerHonorificEvidenceVoices(node.inner);
    const outer = rewriteTailNodeHonorificEvidenceVoices(node.outer);
    if (!inner.changed && !outer.changed) return { node, changed: false };
    return { node: { ...node, inner: inner.node, outer: outer.node }, changed: true };
  }
  return rewriteAuxLayerHonorificEvidenceVoices(node);
}

function rewriteAuxLayerHonorificEvidenceVoices(
  layer: AuxLayerNode
): { readonly node: AuxLayerNode; readonly changed: boolean } {
  let changed = false;
  const ops = layer.ops.map((op, index) => {
    const previous = layer.ops[index - 1];
    if (
      op.kind !== "voice" ||
      previous?.kind !== "aspect" ||
      previous.aspect !== "te_iru" ||
      previous.followingRareruReading !== "honorific" ||
      op.voice === "honorific"
    ) {
      return op;
    }
    changed = true;
    return { ...op, voice: "honorific", candidates: ["honorific"] } satisfies VoiceOp;
  });
  return changed ? { node: { ...layer, ops }, changed: true } : { node: layer, changed: false };
}

function rewriteHonorificEvidenceSegments(
  plan: PredicateHeadTailChainRenderPlan
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodeHonorificEvidenceSegments(plan.realization.root.tail);
  if (!rewritten.changed) {
    return undefined;
  }
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...plan.realization.root, tail: rewritten.node },
      warnings: withoutResolvedVoiceReadingWarnings(plan.realization.warnings)
    }
  };
}

function rewriteTailNodeHonorificEvidenceSegments(
  node: TailNode
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteAuxLayerHonorificEvidenceSegments(node.inner);
    const outer = rewriteTailNodeHonorificEvidenceSegments(node.outer);
    if (!inner.changed && !outer.changed) {
      return { node, changed: false };
    }
    return {
      node: { ...node, inner: inner.node, outer: outer.node },
      changed: true
    };
  }
  return rewriteAuxLayerHonorificEvidenceSegments(node);
}

function rewriteAuxLayerHonorificEvidenceSegments(
  layer: AuxLayerNode
): { readonly node: AuxLayerNode; readonly changed: boolean } {
  const ranges = honorificEvidenceSegmentRanges(layer.ops);
  if (ranges.length === 0) {
    return { node: layer, changed: false };
  }
  const ops = layer.ops.map((op, index) => {
    if (
      op.kind !== "voice" ||
      !ranges.some(([start, end]) => index >= start && index < end)
    ) {
      return op;
    }
    return {
      ...op,
      voice: "honorific",
      candidates: ["honorific"]
    } satisfies VoiceOp;
  });
  return { node: { ...layer, ops }, changed: true };
}

function honorificEvidenceSegmentRanges(
  ops: readonly AuxOpNode[]
): readonly (readonly [start: number, end: number])[] {
  const boundaries = [-1, ...ops.flatMap((op, index) => op.kind === "predicateQuoteCarrier" ? [index] : []), ops.length];
  const ranges: (readonly [number, number])[] = [];
  for (let index = 0; index + 1 < boundaries.length; index += 1) {
    const start = (boundaries[index] ?? -1) + 1;
    const end = boundaries[index + 1] ?? ops.length;
    const segment = ops.slice(start, end);
    const hasEvidence = segment.some((op, segmentIndex) => {
      const previous = segment[segmentIndex - 1];
      return op.kind === "voice" &&
        op.candidates?.includes("honorific") === true &&
        previous?.kind === "aspect" &&
        previous.aspect === "te_iru" &&
        previous.followingRareruReading === "honorific";
    });
    const voicesSupportHonorific = segment.every((op) =>
      op.kind !== "voice" || op.candidates?.includes("honorific") === true
    );
    if (hasEvidence && voicesSupportHonorific) {
      ranges.push([start, end]);
    }
  }
  return ranges;
}

function reclassifyHonorificChainAspectSemantics(
  plan: PredicateHeadTailChainRenderPlan,
  lookups: LookupTables
): PredicateHeadTailChainRenderPlan {
  const tail = reclassifyHonorificTailNodeAspectSemantics(plan.realization.root.tail, lookups);
  if (tail === plan.realization.root.tail) {
    return plan;
  }
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...plan.realization.root, tail }
    }
  };
}

function reclassifyHonorificTailNodeAspectSemantics(node: TailNode, lookups: LookupTables): TailNode {
  if (node.kind === "connective") {
    const inner = reclassifyHonorificAuxLayerAspectSemantics(node.inner, lookups);
    const outer = reclassifyHonorificTailNodeAspectSemantics(node.outer, lookups);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return reclassifyHonorificAuxLayerAspectSemantics(node, lookups);
}

function reclassifyHonorificAuxLayerAspectSemantics(
  layer: AuxLayerNode,
  lookups: LookupTables
): AuxLayerNode {
  let changed = false;
  const ops = layer.ops.map((op, index) => {
    const previous = layer.ops[index - 1];
    if (
      op.kind !== "aspect" ||
      op.aspect !== "te_iru" ||
      previous?.kind !== "voice" ||
      previous.voice !== "honorific"
    ) {
      return op;
    }
    const reclassified = reclassifyTeIruSemanticWithoutPassive(
      op,
      layer.stem,
      hasFollowingNegationAfter(layer.ops, index),
      lookups
    );
    changed ||= reclassified !== op;
    return reclassified;
  });
  return changed ? { ...layer, ops } : layer;
}

function rewriteTailChainVoice(plan: PredicateHeadTailChainRenderPlan, voice: TailParserCommittedVoice): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteTailNodeVoice(plan.realization.root.tail, voice);
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
      },
      warnings: withoutResolvedVoiceReadingWarnings(plan.realization.warnings)
    }
  };
}

function rewriteLexicalStemSegmentVoice(
  plan: PredicateHeadTailChainRenderPlan,
  voice: RareruReading
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = rewriteLexicalStemTailNodeVoice(plan.realization.root.tail, voice);
  if (!rewritten.changed) return undefined;
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...plan.realization.root, tail: rewritten.node },
      warnings: withoutResolvedVoiceReadingWarnings(plan.realization.warnings)
    }
  };
}

function rewriteLexicalStemTailNodeVoice(
  node: TailNode,
  voice: RareruReading
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteLexicalStemAuxLayerVoice(node.inner, voice);
    return inner.changed
      ? { node: { ...node, inner: inner.node }, changed: true }
      : { node, changed: false };
  }
  return rewriteLexicalStemAuxLayerVoice(node, voice);
}

function rewriteLexicalStemAuxLayerVoice(
  layer: AuxLayerNode,
  voice: RareruReading
): { readonly node: AuxLayerNode; readonly changed: boolean } {
  const boundary = layer.ops.findIndex((op) => op.kind === "predicateQuoteCarrier");
  const end = boundary < 0 ? layer.ops.length : boundary;
  let changed = false;
  const ops = layer.ops.map((op, index) => {
    if (
      index >= end ||
      op.kind !== "voice" ||
      op.candidates?.includes(voice) !== true
    ) {
      return op;
    }
    changed = true;
    return { ...op, voice, candidates: [voice] } satisfies VoiceOp;
  });
  return changed ? { node: { ...layer, ops }, changed: true } : { node: layer, changed: false };
}

function withoutResolvedVoiceReadingWarnings(
  warnings: PredicateHeadTailChainRenderPlan["realization"]["warnings"]
): PredicateHeadTailChainRenderPlan["realization"]["warnings"] {
  return warnings.filter((warning) =>
    !(warning.type === "ambiguity_default" && warning.opKind === "voice_reading")
  );
}

function rewriteTailNodeVoice(node: TailNode, voice: TailParserCommittedVoice): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = rewriteTailNodeVoice(node.inner, voice);
    const outer = rewriteTailNodeVoice(node.outer, voice);
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
  const ops: AuxOpNode[] = [];
  for (const op of node.ops) {
    if (op.kind !== "voice" || op.candidates === undefined || op.candidates.length === 0) {
      ops.push(op);
      continue;
    }
    changed = true;
    const resolved = resolveVoiceOpReading(op, voice);
    if (resolved !== null) {
      ops.push(resolved);
    }
  }
  if (!changed) {
    return { node, changed: false };
  }
  return {
    node: {
      ...node,
      ops
    },
    changed: true
  };
}

export function resolveVoiceOpReading(
  op: VoiceOp,
  voice: TailParserCommittedVoice
): VoiceOp | null {
  if (voice === "active") {
    return null;
  }
  return {
    ...op,
    voice,
    candidates: [voice],
    forcePassive: voice === "passive" ? true : op.forcePassive
  };
}

function applyHonorificRareruFallbackToCandidate(
  candidate: CommitmentCandidate,
  scope: "whole_chain" | "evidence_segment" | "lexical_segment" = "whole_chain"
): CommitmentCandidate {
  let renderPlan = candidate.renderPlan ?? null;
  if (isPredicateHeadTailChainRenderPlan(renderPlan) && scope === "lexical_segment") {
    renderPlan = rewriteLexicalStemSegmentVoice(renderPlan, "honorific") ?? renderPlan;
  } else if (renderPlan !== null) {
    renderPlan = replaceLemmaRenderPlan(renderPlan, {
      koreanLemma: candidate.koreanLemma ?? candidate.korean ?? "",
      irregular: candidate.irregular ?? null,
      koreanPos: candidate.koreanPos ?? 명사,
      dropFirstPassiveAux: true
    }) ?? renderPlan;
  }
  return {
    ...candidate,
    renderPlan,
    voice: "active",
    rareruReadings: new Set<RareruReading>(["honorific"]),
    ...(candidate.korean === undefined ? {} : { korean: renderPlan !== null ? "" : candidate.korean })
  };
}
