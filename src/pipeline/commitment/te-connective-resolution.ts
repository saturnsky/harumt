
import type { RenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { POS0, POS01, POS4, POS5, POS5A, inflectionClassName, isAdjectivalRenyouTeFormHostToken, isDesireAuxiliaryPos, isNaAdjCapable, 意志推量形_, 形状詞, 形容詞0, 助詞_係助詞, 助詞_接続助詞, 助詞_終助詞, 助動詞_ダ, 助動詞_ナイ, 命令形_, 連用形_ } from "../../types/pos.js";
import { pairKey } from "../lookup-tables.js";
import type { LookupTables } from "../lookup-tables.js";
import { getReferentTokenBeforeParticle, PredicateArgumentView } from "../semantics/helpers.js";
import { copulaDeMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { lemmaEffectiveConnective, tailChainClosesStateChange, tailChainTeFormConnective } from "../head-tail/lifecycle/rewrite.js";
import { buildPredicateLookupKey, type TeConnectiveClassification, type TeConnectiveClassificationState, type TeConnectiveDecisionStep, type TeConnectiveEvidence, type TeConnectiveHypothesis, type TeConnectiveHypothesisGroup, type TeConnectiveRelation, type TeConnectiveSurfaceRole } from "../semantics/te-connective.js";
import { isSurfaceCarrierReactionReasonAuxiliary } from "../semantics/surface-carrier-auxiliaries.js";
import { FOLLOWING_BENEFACTIVE_RESULT_TE_ASPECTS, PREDICATE_POS, type CommitmentSpan, type CommitmentToken, type CommitmentTranslation, type ConnectivePreferenceValue, type SemanticFrameRuntimeMatch } from "./types.js";
import { selectedCommitmentCandidate, tailChainHasAnyAspect, tailParserPredicateEventKey } from "./span-evidence.js";
import { argumentParticleIndicesForPredicate } from "./voice-reading-resolution.js";

export function teBoundaryFollowingPredicateExists(
  tokens: readonly CommitmentToken[],
  layout: ClauseLayout,
  anchorIdx: number,
  endExclusive: number
): boolean {
  const bound = Math.min(endExclusive, tokens.length);
  let utteranceEnd = bound;
  for (let index = anchorIdx; index < bound; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token) || (token.pos & POS01) === 助詞_終助詞) {
      utteranceEnd = index;
      break;
    }
  }
  for (const predIdx of layout.clauseOfPredicateIndex.keys()) {
    if (predIdx >= anchorIdx && predIdx < utteranceEnd) {
      return true;
    }
  }
  return false;
}

export function extractConnective(plan: RenderPlan | null | undefined): string | null {
  if (plan?.kind === "lemma") {
    return lemmaEffectiveConnective(plan);
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return tailChainTeFormConnective(plan);
  }
  if (plan?.kind === "legacySurfaceComposition") {
    const suffix = typeof plan.suffix === "string" ? null : plan.suffix ?? null;
    const suffixConnective = extractConnective(suffix);
    if (suffixConnective !== null) {
      return suffixConnective;
    }
    const prefix = typeof plan.prefix === "string" ? null : plan.prefix ?? null;
    return extractConnective(prefix);
  }
  return null;
}

export function spanIsTeConnectiveFallback(tokens: readonly CommitmentToken[], predIdx: number, span: CommitmentSpan): boolean {
  if (span.hasRequestTail === true) {
    return false;
  }
  const connective = extractConnective(span.renderPlan ?? null);
  if (connective === null) {
    return false;
  }
  if (!["고", "아/어서", "__te_result_chain"].includes(connective)) {
    return false;
  }
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan)) {
    return true;
  }
  const endIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  if (endIdx < 0 || endIdx >= tokens.length) {
    return false;
  }
  const token = tokens[endIdx];
  if (token === undefined || !isTeConnectiveToken(token)) {
    return false;
  }
  if ((token.pos & POS01) === 助詞_接続助詞) {
    return true;
  }
  if (copulaDeMarkerRelationForToken(token, endIdx, { consumers: ["deferred_commitment"] }) !== null && token.dictionaryForm === "だ") {
    const head = tokens[predIdx];
    return head !== undefined && isNaAdjCapable(head);
  }
  return false;
}

export function spanTeConnectiveMarkerIsSourceBearing(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): boolean {
  const endIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  if (endIdx < 0 || endIdx >= tokens.length) {
    return false;
  }
  const token = tokens[endIdx];
  return token !== undefined && isTeConnectiveToken(token);
}

export function unmarkedTeConnectiveRole(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): "linkage" | "listing" {
  const endIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  const end = tokens[endIdx];
  if (end === undefined) {
    return "listing";
  }
  if (isTeConnectiveToken(end)) {
    return "linkage";
  }
  return copulaDeMarkerRelationForToken(end, endIdx, { consumers: ["deferred_commitment"] }) !== null && end.dictionaryForm === "だ"
    ? "linkage"
    : "listing";
}

export function renyouChuushiClosesStateChange(
  span: CommitmentSpan,
  mainKeys: readonly string[],
  lookups: LookupTables
): boolean {
  if (isPredicateHeadTailChainRenderPlan(span.renderPlan) && tailChainClosesStateChange(span.renderPlan)) {
    return true;
  }
  return mainKeys.some((key) => lookups.TE_RENYOU_STATE_CHANGE_CAUSE_PREDICATES.has(key));
}

export function teConnectiveEndIndexForSpan(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): number {
  const endIdx = predIdx + span.consumed - 1;
  const end = tokens[endIdx];
  if (end !== undefined && (end.pos & POS01) === 助詞_係助詞 && end.surface === "は") {
    const prevIdx = previousNonSpaceIndex(tokens, endIdx);
    if (prevIdx !== null && prevIdx > predIdx && isTeConnectiveToken(tokens[prevIdx])) {
      return prevIdx;
    }
  }
  return endIdx;
}

export function spanHasDesiderativeTeSource(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): boolean {
  const teIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  const te = tokens[teIdx];
  if (te === undefined || te.surface !== "て" || (te.pos & POS01) !== 助詞_接続助詞) {
    return false;
  }
  const takuIdx = previousNonSpaceIndex(tokens, teIdx);
  if (takuIdx === null || takuIdx <= predIdx) {
    return false;
  }
  const taku = tokens[takuIdx];
  return taku !== undefined &&
    isDesireAuxiliaryPos(taku.pos) &&
    isAdjectivalRenyouTeFormHostToken(taku);
}

export function spanHasNakuTeNegativeSource(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): boolean {
  return spanNakuTeNegativeSourceKind(tokens, predIdx, span) === "plain";
}

export function spanHasCopulaNegationTeBridge(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): boolean {
  return spanNakuTeNegativeSourceKind(tokens, predIdx, span) === "copula_bridge";
}

function spanNakuTeNegativeSourceKind(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan
): "plain" | "copula_bridge" | null {
  if (span.hasNegative !== true) {
    return null;
  }
  const teIdx = teConnectiveEndIndexForSpan(tokens, predIdx, span);
  const te = tokens[teIdx];
  if (te === undefined || te.surface !== "て" || (te.pos & POS01) !== 助詞_接続助詞) {
    return null;
  }
  const nakuIdx = previousNonSpaceIndex(tokens, teIdx);
  if (nakuIdx === null || nakuIdx <= predIdx) {
    return null;
  }
  const naku = tokens[nakuIdx];
  if (naku === undefined || (naku.pos & POS5A) !== 連用形_) {
    return null;
  }
  const isNaiAux = (naku.pos & POS4) === 助動詞_ナイ;
  const isNaiAdj = (naku.pos & POS0) === 形容詞0 && (naku.dictionaryForm === "ない" || naku.dictionaryForm === "無い");
  if (!isNaiAux && !isNaiAdj) {
    return null;
  }
  const prevIdx = previousNonSpaceIndex(tokens, nakuIdx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev === undefined) {
    return "plain";
  }
  if ((prev.pos & POS4) === 助動詞_ダ || prev.surface === "じゃ") {
    return "copula_bridge";
  }
  if ((prev.pos & POS01) === 助詞_係助詞 && (prev.surface === "は" || prev.surface === "も")) {
    const prevPrevIdx = previousNonSpaceIndex(tokens, prevIdx!);
    const prevPrev = prevPrevIdx === null ? undefined : tokens[prevPrevIdx];
    if (prevPrev !== undefined && (prevPrev.pos & POS4) === 助動詞_ダ) {
      return "copula_bridge";
    }
  }
  return "plain";
}

export function surfaceCarrierReactionPrefersAseo(plan: RenderPlan | null | undefined, nextCategory: string | null): boolean {
  return nextCategory === "reaction" &&
    plan?.kind === "legacySurfaceComposition" &&
    isSurfaceCarrierReactionReasonAuxiliary(plan.prefixCarrierAuxiliaryLemma);
}

interface TeConnectivePreferenceDecision {
  readonly role: TeConnectiveSurfaceRole;
  readonly relation: TeConnectiveRelation | null;
  readonly source: "semantic_frame" | "translation_preference";
  readonly detail: string;
}

export function normalizeTeConnectivePreference(
  value: ConnectivePreferenceValue | null | undefined,
  source: TeConnectivePreferenceDecision["source"],
  detail: string
): TeConnectivePreferenceDecision | null {
  const normalized = typeof value === "object" && value !== null ? value.role ?? value.connective ?? value.ending : value;
  if (typeof normalized !== "string") {
    return null;
  }
  const relation = typeof value === "object" && value !== null
    ? normalizeTeConnectiveRelation(value.relation)
    : null;
  if (["reason", "아/어서", "아서", "어서"].includes(normalized)) {
    return { role: "reason", relation, source, detail };
  }
  if (normalized === "linkage") {
    return { role: "linkage", relation, source, detail };
  }
  if (["listing", "고"].includes(normalized)) {
    return { role: "listing", relation, source, detail };
  }
  if (["adverbial", "게"].includes(normalized)) {
    return { role: "adverbial", relation, source, detail };
  }
  if (["manner"].includes(normalized)) {
    return { role: "manner", relation, source, detail };
  }
  if (["result_chain", "다가"].includes(normalized)) {
    return { role: "result_chain", relation, source, detail };
  }
  return null;
}

function normalizeTeConnectiveRelation(value: string | undefined): TeConnectiveRelation | null {
  if (
    value === "sequential" ||
    value === "coordinate" ||
    value === "cause" ||
    value === "means" ||
    value === "attendant" ||
    value === "result_chain"
  ) {
    return value;
  }
  return null;
}

function defaultRelationForTeSurfaceRole(role: TeConnectiveSurfaceRole): TeConnectiveRelation {
  if (role === "reason") {
    return "cause";
  }
  if (role === "adverbial" || role === "manner") {
    return "attendant";
  }
  if (role === "result_chain") {
    return "result_chain";
  }
  return "sequential";
}

export function selectedTranslation(span: CommitmentSpan): CommitmentTranslation | null {
  const candidateTranslation = selectedCommitmentCandidate(span)?.translation;
  if (candidateTranslation !== undefined) {
    return candidateTranslation;
  }
  const senses = span.entry?.senses ?? [];
  return senses[0] ?? null;
}

export function translationTeConnectivePreference(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan,
  options: { readonly committedOnly?: boolean } = {}
): string | null {
  return selectedTeConnectivePreference(tokens, predIdx, span, options)?.role ?? null;
}

export function selectedTeConnectivePreference(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan,
  options: {
    readonly committedOnly?: boolean;
    readonly semanticFrameRuntimeMatch?: SemanticFrameRuntimeMatch | null;
  } = {}
): TeConnectivePreferenceDecision | null {
  const framePreference = frameTeConnectivePreference(tokens, predIdx, span, options.semanticFrameRuntimeMatch ?? null);
  if (framePreference !== null) {
    return framePreference;
  }
  const translation = options.committedOnly === true
    ? selectedCommitmentCandidate(span)?.translation ?? null
    : selectedTranslation(span);
  const preferences = translation?.connectivePreferences ?? translation?.connective_preferences;
  if (preferences === undefined) {
    return null;
  }
  const endIdx = predIdx + span.consumed - 1;
  if (endIdx < 0 || endIdx >= tokens.length) {
    return null;
  }
  const surface = tokens[endIdx]?.surface ?? "";
  let value = preferences[surface];
  if (value === undefined && isTeConnectiveToken(tokens[endIdx])) {
    value = preferences["て"];
  }
  return normalizeTeConnectivePreference(value, "translation_preference", "selected sense connective preference");
}

function frameTeConnectivePreference(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  span: CommitmentSpan,
  semanticFrameRuntimeMatch: SemanticFrameRuntimeMatch | null
): TeConnectivePreferenceDecision | null {
  if (
    semanticFrameRuntimeMatch === null ||
    semanticFrameRuntimeMatch.skipReason !== undefined && semanticFrameRuntimeMatch.skipReason !== null ||
    semanticFrameRuntimeMatch.match === null
  ) {
    return null;
  }
  const preferences = semanticFrameRuntimeMatch.frame.connectivePreferences;
  if (preferences === null) {
    return null;
  }
  const endIdx = predIdx + span.consumed - 1;
  if (endIdx < 0 || endIdx >= tokens.length) {
    return null;
  }
  const surface = tokens[endIdx]?.surface ?? "";
  let value = preferences[surface] as ConnectivePreferenceValue | undefined;
  if (value === undefined && isTeConnectiveToken(tokens[endIdx])) {
    value = preferences["て"] as ConnectivePreferenceValue | undefined;
  }
  return normalizeTeConnectivePreference(value, "semantic_frame", `selected frame ${semanticFrameRuntimeMatch.frame.frameId} connective preference`);
}

interface TeVerbClassificationInput {
  readonly mainVerb: string;
  readonly mainPredicateKey: string | null;
  readonly nextCategory: string | null;
  readonly structuralPrefersAseo: boolean;
  readonly preference: TeConnectivePreferenceDecision | null;
  readonly passiveReactionPrefersAseo: boolean;
  readonly benefactiveReactionPrefersAseo: boolean;
  readonly benefactiveResultPrefersAseo: boolean;
  readonly benefactiveRequestPrefersAseo: boolean;
  readonly completionReparationPrefersAseo: boolean;
  readonly movementPathPrefersAseo: boolean;
  readonly movementAcquisitionPrefersAseo: boolean;
  readonly aruEvaluationPrefersAseo: boolean;
  readonly surfaceCarrierReasonPrefersAseo: boolean;
  readonly tailParserSemanticReason: boolean;
  readonly teIruProgressiveReactionResultChain: boolean;
  readonly nextMood: ReadonlySet<string>;
  readonly attendantCoactionEligible: boolean;
  readonly negativeSourceCausePrefersAseo: boolean;
  readonly excessiveDegreeCausePrefersAseo: boolean;
  readonly statefulInabilityPrefersAseo: boolean;
  readonly desiderativeSourceCausePrefersAseo: boolean;
  readonly renyouStateChangeCause: boolean;
  readonly teMarkerIsSourceBearing: boolean;
  readonly teMarkerAttachesToStem: boolean;
  readonly contrastiveParallel: boolean;
  readonly copulaNegationBridge: boolean;
  readonly repeatedClosureChain: boolean;
  readonly negativeNaide: boolean;
  readonly unmarkedRole: "linkage" | "listing";
  readonly lookups: LookupTables;
}

export function teEvidence(source: TeConnectiveEvidence["source"], detail: string): TeConnectiveEvidence {
  return { source, detail };
}

export function teHypothesis(
  id: string,
  relation: TeConnectiveClassification["relation"],
  surfaceRole: TeConnectiveSurfaceRole,
  evidence: readonly TeConnectiveEvidence[]
): TeConnectiveHypothesis {
  return { id, relation, surfaceRole, evidence };
}

export function committedTeClassificationState(
  groups: readonly TeConnectiveHypothesisGroup[],
  fallbackSurfaceRole: TeConnectiveSurfaceRole = "linkage"
): TeConnectiveClassificationState {
  const decisionPath: TeConnectiveDecisionStep[] = [];
  for (const group of groups) {
    for (const hypothesis of group) {
      decisionPath.push({
        action: "keep",
        hypothesisId: hypothesis.id,
        reason: "required evidence satisfied"
      });
    }
    const winner = group[0];
    if (winner !== undefined) {
      const commitStep: TeConnectiveDecisionStep = {
        action: "commit",
        hypothesisId: winner.id,
        reason: "first surviving priority group"
      };
      decisionPath.push(commitStep);
      return {
        groups,
        committed: {
          relation: winner.relation,
          surfaceRole: winner.surfaceRole,
          evidence: winner.evidence,
          committedBy: winner.id,
          decisionPath,
        },
        decisionPath,
      };
    }
  }
  const fallbackStep: TeConnectiveDecisionStep = {
    action: "fallback",
    reason: "no te connective hypothesis survived"
  };
  decisionPath.push(fallbackStep);
  return {
    groups,
    committed: {
      relation: "sequential",
      surfaceRole: fallbackSurfaceRole,
      evidence: [],
      committedBy: "sequential_linkage_default",
      decisionPath,
    },
    decisionPath,
  };
}

export function classifyVerbTeConnective(input: TeVerbClassificationInput): TeConnectiveClassificationState {
  const groups: TeConnectiveHypothesisGroup[] = [];
  const explicit: TeConnectiveHypothesis[] = [];
  const mainKeys = uniqueConnectiveKeys([input.mainPredicateKey, input.mainVerb]);
  const mainKeyMatches = (set: ReadonlySet<string>) => mainKeys.some((key) => set.has(key));
  if (input.preference !== null) {
    explicit.push(teHypothesis(
      `${input.preference.source}_${input.preference.role}`,
      input.preference.relation ?? defaultRelationForTeSurfaceRole(input.preference.role),
      input.preference.role,
      [teEvidence(input.preference.source, input.preference.detail)]
    ));
  }

  if (input.tailParserSemanticReason) {
    groups.push([teHypothesis("tail_parser_semantic_reason", "cause", "reason", [
      teEvidence("tail_parser", "tail parser carried semantic reason")
    ])]);
  }

  const means: TeConnectiveHypothesis[] = [];
  if (input.nextCategory === "movement" && mainKeyMatches(input.lookups.TE_MEANS_SELF_LOCOMOTION_VERBS)) {
    means.push(teHypothesis("means_self_locomotion", "means", "reason", [
      teEvidence("lexical_prior", "self-locomotion means before movement predicate"),
      teEvidence("next_predicate_category", "movement")
    ]));
  }
  if (input.nextCategory === "movement" && mainKeyMatches(input.lookups.TE_MEANS_VEHICLE_VERBS)) {
    means.push(teHypothesis("means_vehicle", "means", "listing", [
      teEvidence("lexical_prior", "vehicle means before movement predicate"),
      teEvidence("next_predicate_category", "movement")
    ]));
  }
  if (input.nextCategory === "movement" && mainKeyMatches(input.lookups.TE_MEANS_CARRY_STATE_VERBS)) {
    means.push(teHypothesis("means_carry_state", "means", "listing", [
      teEvidence("lexical_prior", "carry or wearing state before movement predicate"),
      teEvidence("next_predicate_category", "movement")
    ]));
  }
  if (input.movementPathPrefersAseo) {
    means.push(teHypothesis("path_source_event", "means", "reason", [
      teEvidence("argument_particles", "path/source particle owned by source predicate"),
      teEvidence("next_predicate_category", "movement")
    ]));
  }
  if (input.movementAcquisitionPrefersAseo) {
    means.push(teHypothesis("acquisition_before_motion", "means", "reason", [
      teEvidence("lexical_prior", "acquisition event before movement predicate"),
      teEvidence("next_predicate_category", "movement")
    ]));
  }
  if (means.length > 0) {
    groups.push(means);
  }

  const meansListingBlocked = mainKeyMatches(input.lookups.TE_MEANS_VEHICLE_VERBS) ||
    mainKeyMatches(input.lookups.TE_MEANS_CARRY_STATE_VERBS);
  const strongCause: TeConnectiveHypothesis[] = [];
  if (input.passiveReactionPrefersAseo) {
    strongCause.push(teHypothesis("passive_reaction_cause", "cause", "reason", [
      teEvidence("voice", "passive source followed by reaction/result predicate")
    ]));
  }
  if (input.benefactiveReactionPrefersAseo) {
    strongCause.push(teHypothesis("benefactive_reaction_cause", "cause", "reason", [
      teEvidence("benefactive", "benefactive source followed by reaction/result predicate")
    ]));
  }
  if (input.benefactiveResultPrefersAseo) {
    strongCause.push(teHypothesis("following_benefactive_result_cause", "cause", "reason", [
      teEvidence("benefactive", "following benefactive result predicate responds to source event")
    ]));
  }
  if (input.benefactiveRequestPrefersAseo) {
    strongCause.push(teHypothesis("request_source_benefactive_cause", "cause", "reason", [
      teEvidence("benefactive", "request source licenses following benefactive fulfillment")
    ]));
  }
  if (input.completionReparationPrefersAseo) {
    strongCause.push(teHypothesis("completion_reparation_cause", "cause", "reason", [
      teEvidence("tail_parser", "te_shimau completion/remorse source"),
      teEvidence("next_predicate_category", "following reparation or apology predicate")
    ]));
  }
  if (input.aruEvaluationPrefersAseo) {
    strongCause.push(teHypothesis("aru_evaluation_cause", "cause", "reason", [
      teEvidence("predicate_pair", "existence source supports following evaluation predicate")
    ]));
  }
  if (input.surfaceCarrierReasonPrefersAseo) {
    strongCause.push(teHypothesis("surface_carrier_reason", "cause", "reason", [
      teEvidence("surface_carrier", "semantic carrier requested reason connective")
    ]));
  }
  if (input.nextCategory === "reaction" && mainKeyMatches(input.lookups.TE_ATTENDANT_COACTION_VERBS)) {
    strongCause.push(teHypothesis("coaction_reaction_cause", "cause", "reason", [
      teEvidence("lexical_prior", "productive co-action source predicate"),
      teEvidence("next_predicate_category", "reaction")
    ]));
  }
  if (strongCause.length > 0) {
    groups.push(strongCause);
  }

  if (input.teIruProgressiveReactionResultChain) {
    groups.push([teHypothesis("te_iru_progressive_reaction_background", "result_chain", "result_chain", [
      teEvidence("tail_parser", "progressive te_iru source carried through te_form"),
      teEvidence("next_predicate_category", "reaction")
    ])]);
  }

  const listingEvidence = classifyTeListingEvidence({
    mainKeys,
    contrastiveParallel: input.contrastiveParallel ? "explicit_topics_disjoint" : null,
    copulaNegationBridge: input.copulaNegationBridge,
    repeatedClosureChain: input.repeatedClosureChain,
    negativeNaide: input.negativeNaide,
    lookups: input.lookups
  });
  const moodSuppressesWeakReason = input.nextMood.size > 0;
  if (moodSuppressesWeakReason) {
    if (listingEvidence.length > 0) {
      groups.push(listingEvidence);
    }
    groups.push([teHypothesis(`mood_suppressed_${input.unmarkedRole}`, "sequential", input.unmarkedRole, [
      teEvidence("clause_layout", `following mood blocks weak reason: ${[...input.nextMood].sort().join(",")}`)
    ])]);
  }

  const featureCause: TeConnectiveHypothesis[] = [];
  if (input.negativeSourceCausePrefersAseo) {
    featureCause.push(teHypothesis("negative_source_cause", "cause", "reason", [
      teEvidence("tail_parser", "negative te (naku-te) source prefers causal reading")
    ]));
  }
  if (input.excessiveDegreeCausePrefersAseo) {
    featureCause.push(teHypothesis("excessive_degree_cause", "cause", "reason", [
      teEvidence("tail_parser", "excessive degree (sugiru) source grounds following clause")
    ]));
  }
  if (input.statefulInabilityPrefersAseo) {
    featureCause.push(teHypothesis("stateful_inability_cause", "cause", "reason", [
      teEvidence("tail_parser", "stateful/non-volitional source"),
      teEvidence("next_predicate_category", "inability or negative-potential follower")
    ]));
  }
  if (input.desiderativeSourceCausePrefersAseo) {
    featureCause.push(teHypothesis("desiderative_source_cause", "cause", "reason", [
      teEvidence("tail_parser", "desiderative te (taku-te) source states the motive"),
      teEvidence("next_predicate_category", "volitional follower predicate")
    ]));
  }
  if (input.renyouStateChangeCause) {
    featureCause.push(teHypothesis("renyou_state_change_cause", "cause", "reason", [
      teEvidence("tail_parser", "renyou chuushi closes a state-change predicate (naru)")
    ]));
  }
  if (featureCause.length > 0) {
    groups.push(featureCause);
  }

  const weakCause: TeConnectiveHypothesis[] = [];
  if (
    input.structuralPrefersAseo &&
    !meansListingBlocked &&
    !input.movementPathPrefersAseo &&
    !input.movementAcquisitionPrefersAseo &&
    !mainKeyMatches(input.lookups.TE_MEANS_SELF_LOCOMOTION_VERBS)
  ) {
    weakCause.push(teHypothesis("predicate_pair_cause", "cause", "reason", [
      teEvidence("predicate_pair", "lookup-backed te predicate pair prefers reason")
    ]));
  }
  if (weakCause.length > 0) {
    groups.push(weakCause);
  }

  const attendant: TeConnectiveHypothesis[] = [];
  if (input.attendantCoactionEligible) {
    attendant.push(teHypothesis("attendant_coaction", "attendant", "manner", [
      teEvidence("lexical_prior", "productive co-action source predicate"),
      teEvidence("clause_layout", "adjacent clause without subject conflict")
    ]));
  }
  if (
    input.teMarkerIsSourceBearing &&
    input.teMarkerAttachesToStem &&
    mainKeyMatches(input.lookups.TE_ADVERBIAL_LEXICALIZED_VERBS)
  ) {
    attendant.push(teHypothesis("lexicalized_adverbial", "attendant", "adverbial", [
      teEvidence("lexical_prior", "lexicalized te adverbial source predicate"),
      teEvidence("tail_parser", "explicit te/de marker present in the source")
    ]));
  }
  if (attendant.length > 0) {
    groups.push(attendant);
  }

  if (explicit.length > 0) {
    groups.push(explicit);
  }
  if (listingEvidence.length > 0) {
    groups.push(listingEvidence);
  }

  groups.push([teHypothesis(`sequential_${input.unmarkedRole}_default`, "sequential", input.unmarkedRole, [])]);
  return committedTeClassificationState(groups);
}

export function classifyTeListingEvidence(input: {
  readonly mainKeys: readonly string[];
  readonly contrastiveParallel: "elliptic_right_topic" | "explicit_topics_disjoint" | null;
  readonly copulaNegationBridge?: boolean;
  readonly repeatedClosureChain?: boolean;
  readonly negativeNaide?: boolean;
  readonly lookups: LookupTables;
}): readonly TeConnectiveHypothesis[] {
  const matches = (set: ReadonlySet<string>) => input.mainKeys.some((key) => set.has(key));
  const listing: TeConnectiveHypothesis[] = [];
  if (input.contrastiveParallel !== null) {
    listing.push(teHypothesis("contrastive_parallel_topic", "coordinate", "listing", [
      teEvidence("clause_layout", input.contrastiveParallel === "elliptic_right_topic"
        ? "elliptic follower sets its own topic different from the left clause topic"
        : "left and right clauses set different explicit topics")
    ]));
  }
  if (input.negativeNaide === true) {
    listing.push(teHypothesis("negative_naide_accompaniment", "sequential", "listing", [
      teEvidence("tail_parser", "negative naide marks accompaniment/sequence without the event")
    ]));
  }
  if (input.repeatedClosureChain === true) {
    listing.push(teHypothesis("repeated_closure_enumeration", "coordinate", "listing", [
      teEvidence("clause_layout", "same-host chuushi closures chain three or more items")
    ]));
  }
  if (input.copulaNegationBridge === true) {
    listing.push(teHypothesis("copula_negation_correction", "coordinate", "listing", [
      teEvidence("tail_parser", "copula negation bridge (dewa/ja naku-te) corrects or lists")
    ]));
  }
  if (matches(input.lookups.TE_MEANS_VEHICLE_VERBS) || matches(input.lookups.TE_MEANS_CARRY_STATE_VERBS)) {
    listing.push(teHypothesis("resultant_state_listing", "means", "listing", [
      teEvidence("lexical_prior", "wearing/boarding/holding source keeps its resultant state")
    ]));
  }
  return listing;
}

export function classifyEllipticTeConnective(input: {
  readonly mainKeys: readonly string[];
  readonly contrastiveParallel: boolean;
  readonly copulaNegationBridge: boolean;
  readonly negativeNaide: boolean;
  readonly unmarkedRole: "linkage" | "listing";
  readonly renyouStateChangeCause?: boolean;
  readonly lookups: LookupTables;
}): TeConnectiveClassificationState {
  const listing = classifyTeListingEvidence({
    mainKeys: input.mainKeys,
    contrastiveParallel: input.contrastiveParallel ? "elliptic_right_topic" : null,
    copulaNegationBridge: input.copulaNegationBridge,
    negativeNaide: input.negativeNaide,
    lookups: input.lookups
  });
  const groups: TeConnectiveHypothesisGroup[] = [];
  if (listing.length > 0) {
    groups.push(listing);
  }
  if (input.renyouStateChangeCause === true) {
    groups.push([teHypothesis("renyou_state_change_cause", "cause", "reason", [
      teEvidence("tail_parser", "renyou chuushi closes a state-change predicate (naru)")
    ])]);
  }
  groups.push([teHypothesis(`elliptic_${input.unmarkedRole}_default`, "sequential", input.unmarkedRole, [
    teEvidence("clause_layout", "chuushi clause closes before a predicate-less follower")
  ])]);
  return committedTeClassificationState(groups);
}

export function uniqueConnectiveKeys(keys: readonly (string | null | undefined)[]): readonly string[] {
  const out: string[] = [];
  for (const key of keys) {
    if (key === undefined || key === null || key.length === 0 || out.includes(key)) {
      continue;
    }
    out.push(key);
  }
  return out;
}

export function teClassificationSurfaceRole(state: TeConnectiveClassificationState | null | undefined): TeConnectiveSurfaceRole {
  return state?.committed?.surfaceRole ?? "linkage";
}

export function spanHasFollowingBenefactiveResultTail(span: CommitmentSpan | undefined): boolean {
  if (span === undefined) {
    return false;
  }
  if (span.hasBenefactiveTail === true) {
    return true;
  }
  return isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
    tailChainHasAnyAspect(span.renderPlan, FOLLOWING_BENEFACTIVE_RESULT_TE_ASPECTS);
}

export function spanMayBePredicateForCommitment(span: CommitmentSpan): boolean {
  if (PREDICATE_POS.has(span.koreanPos)) {
    return true;
  }
  return (span.entry?.senses ?? []).some((translation) => translation.koreanPos !== undefined && PREDICATE_POS.has(translation.koreanPos));
}

export function spanHasSourcePredicateEvidence(
  tokens: readonly CommitmentToken[],
  idx: number,
  span: CommitmentSpan,
  layout: ClauseLayout
): boolean {
  if (layout.clauseOfPredicateIndex.has(idx)) {
    return true;
  }
  const head = tokens[idx];
  if (head !== undefined && isNaAdjCapable(head)) {
    return true;
  }
  const end = Math.min(tokens.length, idx + Math.max(1, span.consumed));
  for (let tokenIdx = idx; tokenIdx < end; tokenIdx += 1) {
    const token = tokens[tokenIdx];
    if (token !== undefined && inflectionClassName(token.pos) !== null) {
      return true;
    }
  }
  return false;
}

export function nextPredicateIndex(predicateIndices: readonly number[], currentIdx: number): number | null {
  return predicateIndices.find((predicateIdx) => predicateIdx > currentIdx) ?? null;
}

export function predicateLookupKey(tokens: readonly CommitmentToken[], predIdx: number, span: CommitmentSpan, layout: ClauseLayout, lookups: LookupTables): string | null {
  const tailKey = tailParserPredicateEventKey(span.renderPlan ?? null);
  return buildPredicateLookupKey(tokens, tailKey ?? span.entry?.dictionaryForm ?? null, new Set(argumentParticleIndicesForPredicate(predIdx, tokens, layout)), { predIdx }, lookups);
}

export function extractPredicateKoreanLemma(span: CommitmentSpan): string | null {
  const plan = span.renderPlan ?? null;
  if (plan?.kind === "lemma") {
    return plan.koreanLemma;
  }
  return selectedTranslation(span)?.korean ?? null;
}

export function spanIsAdjectiveLikeTeConnective(tokens: readonly CommitmentToken[], predIdx: number, span: CommitmentSpan): boolean {
  if (!spanIsTeConnectiveFallback(tokens, predIdx, span)) {
    return false;
  }
  const pos0 = (((tokens[predIdx]?.pos ?? 0) & POS0));
  return pos0 === 形容詞0 || pos0 === 形状詞;
}

export function nextPredicateMoodSignals(tokens: readonly CommitmentToken[], predIdx: number, span: CommitmentSpan): ReadonlySet<string> {
  const signals = new Set<string>();
  if (span.hasRequestTail === true) {
    signals.add("request_like");
  }
  const endIdx = predIdx + span.consumed;
  const limit = Math.min(endIdx + 1, tokens.length);
  for (let idx = predIdx; idx < limit; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (token.surface === "な" && (token.pos & POS01) === 助詞_終助詞) {
      signals.add("prohibit_like");
    }
    const pos5 = token.pos & POS5;
    if ((pos5 & POS5A) === 意志推量形_) {
      signals.add("volitional_like");
    }
    if ((pos5 & POS5A) === 命令形_) {
      signals.add("request_like");
    }
  }
  if (endIdx < tokens.length) {
    const tail = tokens[endIdx];
    if (tail?.surface === "な" && (tail.pos & POS01) === 助詞_終助詞) {
      signals.add("prohibit_like");
    }
  }
  return signals;
}

export function teMovementPathSourcePrefersAseo(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  mainVerb: string,
  nextPredicateKey: string | null,
  nextPredicateDictForm: string | null,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  if (!lookups.TE_MOVEMENT_PATH_SOURCE_VERBS.has(mainVerb)) {
    return false;
  }
  const particles = new Set(
    new PredicateArgumentView(tokens, predIdx, { lookups, layout }).arguments()
      .map((argument) => argument.particle.surface)
      .filter((surface) => surface.length > 0)
  );
  if ([...particles].some((particle) => lookups.TE_MOVEMENT_PATH_SOURCE_PARTICLES.has(particle))) {
    return true;
  }
  const nextKeys = [nextPredicateKey, nextPredicateDictForm].filter((key): key is string => key !== null && key.length > 0);
  return particles.size === 0 && nextKeys.some((nextKey) => lookups.TE_MOVEMENT_STRONG_BARE_PAIRS.has(pairKey(mainVerb, nextKey)));
}

export function teMovementAcquisitionPrefersAseo(mainVerb: string, nextCategory: string | null, lookups: LookupTables): boolean {
  return nextCategory === "movement" && lookups.TE_MOVEMENT_ACQUISITION_VERBS.has(mainVerb);
}

export function teAruEvaluationPrefersAseo(tokens: readonly CommitmentToken[], predIdx: number, nextIdx: number, layout: ClauseLayout, lookups: LookupTables): boolean {
  const particles = new Set(
    new PredicateArgumentView(tokens, predIdx, { lookups, layout }).arguments()
      .map((argument) => argument.particle.surface)
      .filter((surface) => surface.length > 0)
  );
  if (!particles.has("が") && !particles.has("も")) {
    const prevIdx = previousNonSpaceIndex(tokens, predIdx + 1);
    if (prevIdx === null || tokens[prevIdx]?.surface !== "も") {
      return false;
    }
  }
  for (let idx = nextIdx; idx < Math.min(tokens.length, nextIdx + 3); idx += 1) {
    const form = tokens[idx]?.dictionaryForm || tokens[idx]?.surface;
    if (form !== undefined && lookups.TE_ARU_EVALUATION_HEADS.has(form)) {
      return true;
    }
  }
  return false;
}

export function teAttendantCoactionEligible(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  nextIdx: number | null,
  nextSpan: CommitmentSpan | undefined,
  nextCategory: string | null,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const mainVerb = tokens[predIdx]?.dictionaryForm ?? "";
  if (!lookups.TE_ATTENDANT_COACTION_VERBS.has(mainVerb) || nextIdx === null || nextSpan === undefined) {
    return false;
  }
  if (!spanMayBePredicateForCommitment(nextSpan)) {
    return false;
  }
  if (nextCategory === "reaction") {
    return false;
  }
  const currentClause = layout.clauseIndexOfPredicate(predIdx);
  const nextClause = layout.clauseIndexOfPredicate(nextIdx);
  if (
    currentClause === undefined ||
    nextClause === undefined ||
    currentClause < 0 ||
    nextClause < 0 ||
    nextClause !== currentClause + 1
  ) {
    return false;
  }
  if (explicitSubjectConflict(tokens, predIdx, nextIdx, layout, lookups)) {
    return false;
  }
  return true;
}

function explicitSubjectConflict(
  tokens: readonly CommitmentToken[],
  leftPredIdx: number,
  rightPredIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const left = explicitSubjectReferents(tokens, leftPredIdx, layout, lookups);
  const right = explicitSubjectReferents(tokens, rightPredIdx, layout, lookups);
  if (left.size === 0 || right.size === 0) {
    return false;
  }
  for (const value of left) {
    if (right.has(value)) {
      return false;
    }
  }
  return true;
}

export function teIruProgressiveResultChainSubjectCompatible(
  tokens: readonly CommitmentToken[],
  leftPredIdx: number,
  rightPredIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const right = explicitSubjectReferents(tokens, rightPredIdx, layout, lookups);
  if (right.size === 0) {
    return true;
  }
  const left = explicitSubjectReferents(tokens, leftPredIdx, layout, lookups);
  if (left.size === 0) {
    return false;
  }
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

export function teClosureRepeatsSameHostChain(predIdx: number, layout: ClauseLayout): boolean {
  const clauseIdx = layout.clauseIndexOfPredicate(predIdx);
  if (clauseIdx === undefined || clauseIdx < 0) {
    return false;
  }
  const closureAtClauseEnd = (index: number) => {
    const clause = layout.clauses[index];
    return clause === undefined || clause.terminatedBy !== "connective" ? undefined : layout.chuushiClosureAt(clause.end);
  };
  const own = closureAtClauseEnd(clauseIdx);
  if (own === undefined || own.right !== "governed") {
    return false;
  }
  const utterance = layout.utteranceRangeOfToken(own.connectiveIdx);
  return [clauseIdx - 1, clauseIdx + 1].some((index) => {
    const neighbor = closureAtClauseEnd(index);
    return neighbor !== undefined && neighbor.right === "governed" && neighbor.hostKind === own.hostKind &&
      neighbor.connectiveIdx >= utterance.start && neighbor.connectiveIdx < utterance.endExclusive;
  });
}

export function ellipticTeClosureSetsContrastiveTopics(
  tokens: readonly CommitmentToken[],
  leftPredIdx: number,
  rightTopicIdx: number | undefined,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  if (rightTopicIdx === undefined) {
    return false;
  }
  const left = ownTopicReferents(tokens, leftPredIdx, layout, lookups);
  const rightReferent = getReferentTokenBeforeParticle(tokens, rightTopicIdx, lookups);
  const right = rightReferent?.dictionaryForm || rightReferent?.surface || "";
  return left.size > 0 && right.length > 0 && !left.has(right);
}

function ownTopicReferents(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): ReadonlySet<string> {
  return new Set(
    new PredicateArgumentView(tokens, predIdx, { lookups, layout }).arguments()
      .filter((argument) =>
        argument.origin === "topic_focus" &&
        lookups.TE_CONTRASTIVE_PARALLEL_TOPIC_PARTICLES.has(argument.particle.surface))
      .map((argument) => argument.referent?.dictionaryForm || argument.referent?.surface || "")
      .filter((key) => key.length > 0)
  );
}

export function teClausesSetContrastiveTopics(
  tokens: readonly CommitmentToken[],
  leftPredIdx: number,
  rightPredIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  const leftClauseIdx = layout.clauseIndexOfPredicate(leftPredIdx);
  const rightClauseIdx = layout.clauseIndexOfPredicate(rightPredIdx);
  const utterance = layout.utteranceRangeOfToken(leftPredIdx);
  if (
    leftClauseIdx === undefined || rightClauseIdx === undefined || leftClauseIdx < 0 ||
    (rightClauseIdx !== leftClauseIdx && rightClauseIdx !== leftClauseIdx + 1) ||
    rightPredIdx < utterance.start || rightPredIdx >= utterance.endExclusive
  ) {
    return false;
  }
  const left = ownTopicReferents(tokens, leftPredIdx, layout, lookups);
  const right = ownTopicReferents(tokens, rightPredIdx, layout, lookups);
  if (left.size === 0 || right.size === 0) {
    return false;
  }
  for (const value of left) {
    if (right.has(value)) {
      return false;
    }
  }
  return true;
}

function explicitSubjectReferents(
  tokens: readonly CommitmentToken[],
  predIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): ReadonlySet<string> {
  const result = new Set<string>();
  const clauseIdx = layout.clauseIndexOfPredicate(predIdx);
  const clause = clauseIdx === undefined || clauseIdx < 0 ? undefined : layout.clauses[clauseIdx];
  if (clause === undefined) {
    return result;
  }
  for (const particleIdx of clause.particlesOf(predIdx)) {
    const particle = tokens[particleIdx];
    if (particle === undefined || !["が", "は", "も"].includes(particle.surface)) {
      continue;
    }
    const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
    const key = referent?.dictionaryForm || referent?.surface;
    if (key !== undefined && key.length > 0) {
      result.add(key);
    }
  }
  return result;
}
