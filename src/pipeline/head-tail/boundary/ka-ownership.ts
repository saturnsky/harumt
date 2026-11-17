import type { BoundaryToken } from "./punctuation.js";
import { hardTerminalPunctuationSurfaceClassForToken, isBoundaryPunctuationCategoryToken, isWeakPunctuationToken, isTerminalishPunctuationToken, isTrailingPunctuationToken, subtitleTerminalTrailingPunctuationRunRelationAt } from "./punctuation.js";
import { copulaNiMarkerRelationForToken, focusReversalDokoroKaRelationAt, isQuestionParticleKaToken, kaMarkerRelationAt, nominalLinkMarkerRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, registeredClauseConnectiveRelationForToken } from "./marker.js";
import { isKamoShirenaiModalStartAtToken } from "../tail/predicate-root/matchers/kamo-modal.js";
import {
  DETACHED_SEPARATIONS,
  nextNonSpaceIndex,
  previousNonSpaceIndex
} from "../../clause-layout/trivia.js";
import { findAdverbialModifierPredicate } from "../../clause-layout/index.js";
import { prenominalModifierChainHeadIndex } from "../../clause-layout/attributive-head.js";
import {
  closesUtteranceForSpeakerDirection,
  collectUtteranceDirectionEvidence
} from "../../clause-layout/speech-act.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { ClauseLayout } from "../../clause-layout/index.js";
import { activeProtoClosedPropositionBeforeMarkerAt, activeProtoLayout } from "../../clause-layout/proto-state.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore } from "../../clause-layout/phrase-enumeration.js";
import { runClosesUtteranceAs, utteranceClosureRunAfter, type UtteranceClosureKind } from "../../clause-layout/utterance-closure.js";
import type { LookupTables } from "../../lookup-tables.js";
import { quoteMarkerRelationAt } from "./quote-marker.js";
import { parentheticalSpanEndingAt, parentheticalSpanStartingAt } from "./parenthetical.js";
import { belongsToStructuralKaChoiceGroupAt } from "../../structural-relation/ka-parallel-ownership.js";
import { isSayVerbToken, isSyntheticDeicticStemToken } from "../tail/predicate-root/classifiers/tokens.js";
import { looksQuestionTakingAfterViaLayout } from "../../quote/question-taking-enumeration.js";
import { postKaTerminalSfpType } from "../../semantics/grammar-runtime.js";
import {
  isFusedSelfQuestionSfpSurface,
  isKanaQuestionNaParticleSurface,
  isTerminalNeSfpSurface
} from "../../semantics/sfp-surface.js";
import {
  isCounterCapableToken,
  isKoreanCoordinableNominalPos,
  isNaAdjCapable,
  isNaAdjCapableNoun,
  isNumeralToken,
  pos0in,
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  代名詞,
  名詞,
  形状詞,
  助詞_格助詞,
  助詞_係助詞,
  助詞_接続助詞,
  助詞_副助詞,
  助詞_終助詞,
  終助詞,
  助動詞,
  助動詞語幹,
  助動詞_ダ,
  助動詞_タ,
  助動詞_デス,
  助動詞_ヌ,
  助動詞_マス,
  名詞_数詞,
  動詞,
  未然形_,
  意志推量形_,
  終止形_,
  連体形_,
  連用形_,
  conjectureCopulaPoliteness,
  isNominalLike,
  isRenyouInflection,
  isTerminalAssertiveCopulaToken,
  isTerminalOrAttributiveInflection,
  isVerbPredicateToken,
  isVolitionalInflection
} from "../../../types/pos.js";

export type KaOwnershipKind =
  | "question"
  | "postposed_nominal"
  | "kadouka"
  | "kamo_modal"
  | "wh_indefinite"
  | "toka_listing"
  | "focus_connective"
  | "reformulation"
  | "self_question_kana"
  | "simile"
  | "speaker_acknowledgment";

export type WhIndefiniteKaKind = "standalone_quantity" | "counter_quantity" | "lexicalized" | "pronominal";

export function janaiConfirmationKaOwnershipKindAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): Extract<KaOwnershipKind, "question" | "kadouka" | "postposed_nominal"> | null {
  if (kaMarkerRelationAt(tokens, kaIdx, ["tail_multi_clause"]) === null) {
    return null;
  }
  if (isKaDouKaMarker(tokens, kaIdx)) return "kadouka";
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  const nextPos0 = nextIdx === null ? null : ((tokens[nextIdx]?.pos ?? 0) & POS0);
  if (nextPos0 === 名詞 || nextPos0 === 代名詞 || nextPos0 === 形状詞) {
    return "postposed_nominal";
  }
  return "question";
}

export interface PostposedNominalQuestionKaRelation {
  readonly kind: "postposed_nominal_question_ka";
  readonly kaIdx: number;
  readonly nominalIdx: number;
}

export function postposedNominalQuestionKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  layout: ClauseLayout
): PostposedNominalQuestionKaRelation | null {
  if (janaiConfirmationKaOwnershipKindAt(tokens, kaIdx) !== "postposed_nominal") {
    return null;
  }
  const clause = layout.clauseOfToken(kaIdx);
  if (
    clause?.terminatedBy !== "punctuation" ||
    clause.predicates.some((predicateIdx) => predicateIdx > kaIdx)
  ) {
    return null;
  }
  const nominalIdx = nextNonSpaceIndex(tokens, kaIdx + 1, clause.end);
  return nominalIdx === null
    ? null
    : { kind: "postposed_nominal_question_ka", kaIdx, nominalIdx };
}

export function kaOwnershipKindAt(
  tokens: readonly BoundaryToken[],
  index: number,
  lookups: LookupTables
): KaOwnershipKind | null {
  const beforeAcknowledgment = kaOwnershipKindBeforeAcknowledgmentAt(tokens, index, lookups);
  if (beforeAcknowledgment !== null) {
    return beforeAcknowledgment === "undetermined" ? null : beforeAcknowledgment;
  }
  if (isSpeakerAcknowledgmentKaMarker(tokens, index, lookups)) {
    return "speaker_acknowledgment";
  }
  return "question";
}

export function kaOwnershipKindBeforeAcknowledgmentAt(
  tokens: readonly BoundaryToken[],
  index: number,
  lookups: LookupTables
): Exclude<KaOwnershipKind, "speaker_acknowledgment"> | "undetermined" | null {
  const marker = kaMarkerRelationAt(tokens, index);
  if (marker === null) {
    return selfQuestionDiscourseSfpKaRelationAt(tokens, index)?.subtype === "kana_like"
      ? "self_question_kana"
      : "undetermined";
  }
  if (isKaDouKaMarker(tokens, index)) {
    return "kadouka";
  }
  if (isKamoShirenaiModalKaMarker(tokens, index, lookups)) {
    return "kamo_modal";
  }
  if (isTokaListingKaMarker(tokens, index)) {
    return "toka_listing";
  }
  if (focusReversalDokoroKaRelationAt(tokens, index, ["clause_layout", "tail_multi_clause"]) !== null) {
    return "focus_connective";
  }
  if (isReformulationKaMarker(tokens, index, lookups)) {
    return "reformulation";
  }
  const selfQuestionSfp = selfQuestionDiscourseSfpKaRelationAt(tokens, index);
  if (selfQuestionSfp?.subtype === "kana_like") {
    return "self_question_kana";
  }
  if (approximateAmountTailKaRelationAt(tokens, index, lookups) !== null) {
    return "wh_indefinite";
  }
  if (
    selfQuestionSfp === null &&
    marker.particleSubtype1 === 終助詞 &&
    isInterrogativeAmountBeforeKa(tokens, index, lookups)
  ) {
    return "question";
  }
  if (isWhIndefiniteKaMarker(tokens, index, lookups)) {
    return "wh_indefinite";
  }
  if (kaNoYouNiSimileRelationAt(tokens, index, lookups) !== null) {
    return "simile";
  }
  return null;
}

export function singleMarkerNominalChoiceKaAt(
  tokens: readonly BoundaryToken[],
  index: number,
  lookups: LookupTables,
  hostKoreanPos: number | null
): boolean {
  const marker = kaMarkerRelationAt(tokens, index, ["content_resolver", "particle_head_dispatch"]);
  if (marker === null || marker.particleSubtype1 !== 助詞_副助詞_SUBTYPE) {
    return false;
  }
  if (kaOwnershipKindAt(tokens, index, lookups) !== "question") {
    return false;
  }
  if (!isKoreanCoordinableNominalPos(hostKoreanPos)) {
    return false;
  }
  const leftIdx = previousNonSpaceIndex(tokens, index);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined || !isBareNominalChoiceItemToken(left)) {
    return false;
  }
  const rightIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  const right = rightIdx === null ? undefined : tokens[rightIdx];
  if (right === undefined || !isBareNominalChoiceItemToken(right)) {
    return false;
  }
  if (rightIdx !== null && naAdjectivePredicateHeadAt(tokens, rightIdx)) {
    return false;
  }
  if (isEmbeddedQuestionContentHostNominal(right, lookups)) {
    return false;
  }
  return !closesUtteranceForSpeakerDirection(tokens, index + 1, {
    utteranceBreakDashSurfaces: lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES,
    demoAnaphorAnchors: lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS,
    acknowledgmentCapableKaAt: (idx) => acknowledgmentCapableKaAt(tokens, idx),
    closureMarkerIdx: index
  });
}

const 助詞_副助詞_SUBTYPE = 助詞_副助詞 & POS1;

function isEmbeddedQuestionContentHostNominal(
  token: BoundaryToken | undefined,
  lookups: LookupTables
): boolean {
  if (token === undefined) {
    return false;
  }
  const forms = [token.dictionaryForm ?? token.surface, token.surface];
  return forms.some((form) =>
    lookups.EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS.has(form) ||
    lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS.has(form) ||
    lookups.EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA.has(form)
  );
}

function naAdjectivePredicateHeadAt(tokens: readonly BoundaryToken[], index: number): boolean {
  const token = tokens[index];
  if (token === undefined || !isNaAdjCapableNoun(token)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  return next !== undefined && (next.pos & POS4) === 助動詞_ダ;
}

function isBareNominalChoiceItemToken(token: BoundaryToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 || pos0 === 代名詞;
}

export type KaNoYouNiSimileForm = "adverbial" | "adnominal" | "predicative";

export interface KaNoYouNiSimileRelation {
  readonly kind: "ka_no_you_ni_simile";
  readonly kaIdx: number;
  readonly form: KaNoYouNiSimileForm;
  readonly consumed: 2 | 3 | 4;
}

export function kaNoYouNiSimileRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): KaNoYouNiSimileRelation | null {
  if (kaMarkerRelationAt(tokens, kaIdx, ["tail_boundary_readiness"]) === null) {
    return null;
  }
  if (isWhIndefiniteKaMarker(tokens, kaIdx, lookups)) {
    return null;
  }
  const fused = tokens[kaIdx + 1];
  if (
    fused !== undefined &&
    fused.surface === "のように" &&
    (fused.pos & POS01) === 助詞_格助詞
  ) {
    return { kind: "ka_no_you_ni_simile", kaIdx, form: "adverbial", consumed: 2 };
  }
  const you = tokens[kaIdx + 2];
  if (
    nominalLinkMarkerRelationAt(tokens, kaIdx + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    you === undefined ||
    (you.surface !== "よう" && you.surface !== "様") ||
    (you.pos & POS1) !== 助動詞語幹
  ) {
    return null;
  }
  if (
    copulaNiMarkerRelationForToken(tokens[kaIdx + 3], kaIdx + 3, {
      consumers: ["tail_boundary_readiness"]
    }) !== null
  ) {
    return { kind: "ka_no_you_ni_simile", kaIdx, form: "adverbial", consumed: 4 };
  }
  const after = tokens[kaIdx + 3];
  if (after === undefined || after.surface === "だって") {
    return { kind: "ka_no_you_ni_simile", kaIdx, form: "predicative", consumed: 3 };
  }
  const afterPos4 = after.pos & POS4;
  const afterPos5A = after.pos & POS5A;
  if (afterPos4 !== 助動詞_ダ && afterPos4 !== 助動詞_デス) {
    return null;
  }
  if (afterPos5A !== 終止形_ && afterPos5A !== 連用形_ && afterPos5A !== 連体形_) {
    return null;
  }
  return {
    kind: "ka_no_you_ni_simile",
    kaIdx,
    form: afterPos5A === 連体形_ ? "adnominal" : "predicative",
    consumed: 4
  };
}

export interface SpeakerAcknowledgmentKaHostRelation {
  readonly kind: "speaker_acknowledgment_ka_host";
  readonly kaIdx: number;
  readonly hostIdx: number;
}

function acknowledgmentCapableKaAt(tokens: readonly BoundaryToken[], kaIdx: number): boolean {
  const subtype = selfQuestionDiscourseSfpKaRelationAt(tokens, kaIdx)?.subtype;
  return subtype === undefined || subtype === "toned_question";
}

export function speakerAcknowledgmentKaHostRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): SpeakerAcknowledgmentKaHostRelation | null {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, kaIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (
    hostIdx === null ||
    host === undefined ||
    isSyntheticDeicticStemToken(host as RuntimeHaruToken) ||
    !lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS.has(normalizedTokenForm(host))
  ) {
    return null;
  }
  return collectUtteranceDirectionEvidence(tokens, hostIdx, {
    utteranceBreakDashSurfaces: lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES,
    demoAnaphorAnchors: lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS,
    acknowledgmentCapableKaAt: (idx) => acknowledgmentCapableKaAt(tokens, idx)
  }).standalonePredicate
    ? { kind: "speaker_acknowledgment_ka_host", kaIdx, hostIdx }
    : null;
}

function isSpeakerAcknowledgmentKaMarker(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  if (speakerAcknowledgmentKaHostRelationAt(tokens, kaIdx, lookups) === null) {
    return false;
  }
  if (
    questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
      consumers: ["embedded_question"],
      limit: tokens.length
    }) !== null
  ) {
    return false;
  }
  if (
    belongsToStructuralKaChoiceGroupAt(
      tokens as unknown as readonly RuntimeHaruToken[],
      kaIdx,
      lookups
    )
  ) {
    return false;
  }
  return closesUtteranceForSpeakerDirection(tokens, speakerAcknowledgmentClosureProbeIndex(tokens, kaIdx), {
    utteranceBreakDashSurfaces: lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES,
    demoAnaphorAnchors: lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS,
    acknowledgmentCapableKaAt: (idx) => acknowledgmentCapableKaAt(tokens, idx),
    closureMarkerIdx: kaIdx
  });
}

function speakerAcknowledgmentClosureProbeIndex(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): number {
  const toned = selfQuestionDiscourseSfpKaRelationAt(tokens, kaIdx);
  if (toned?.subtype !== "toned_question") {
    return kaIdx + 1;
  }
  let idx = toned.sfpIdx + 1;
  while (((tokens[idx]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    idx += 1;
  }
  return idx;
}

export function speakerAcknowledgmentKaClosureIndexAt(
  tokens: readonly BoundaryToken[],
  hostIdx: number,
  lookups: LookupTables
): number | null {
  const kaIdx = nextNonSpaceIndex(tokens, hostIdx + 1);
  if (kaIdx === null) {
    return null;
  }
  const host = speakerAcknowledgmentKaHostRelationAt(tokens, kaIdx, lookups);
  if (host === null || host.hostIdx !== hostIdx) {
    return null;
  }
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) !== "speaker_acknowledgment") {
    return null;
  }
  return speakerAcknowledgmentClosureProbeIndex(tokens, kaIdx);
}

export interface UncertainCauseKaRelation {
  readonly kind: "uncertain_cause_ka";
  readonly connectiveIdx: number;
  readonly kaIdx: number;
  readonly evidence: "connective_clause" | "paired_counterpart";
}

export function uncertainCauseKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  layout: ClauseLayout | undefined
): UncertainCauseKaRelation | null {
  if (layout === undefined || kaMarkerRelationAt(tokens, kaIdx) === null) {
    return null;
  }
  if (kaFollowedByPostposedNominalMarkerAt(tokens, kaIdx)) {
    return null;
  }
  const direct = directUncertainCauseKaRelation(tokens, kaIdx, layout);
  if (direct !== null) return direct;

  const clauseIdx = layout.clauseIndexOfToken(kaIdx);
  const clause = clauseIdx < 0 ? undefined : layout.clauses[clauseIdx];
  const precedingClause = clauseIdx <= 0 ? undefined : layout.clauses[clauseIdx - 1];
  if (
    clause === undefined ||
    precedingClause === undefined ||
    !clause.predicates.some((predicateIdx) => predicateIdx < kaIdx)
  ) {
    return null;
  }
  const pairedKaIdx = precedingClause.start;
  if (kaMarkerRelationAt(tokens, pairedKaIdx) === null) return null;
  const paired = directUncertainCauseKaRelation(tokens, pairedKaIdx, layout);
  return paired === null
    ? null
    : { kind: "uncertain_cause_ka", connectiveIdx: paired.connectiveIdx, kaIdx, evidence: "paired_counterpart" };
}

export function uncertainCauseKaOwnedByExistingStructureAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  if (kaFollowedByPostposedNominalMarkerAt(tokens, kaIdx)) {
    return true;
  }
  if (uncertainCauseKaParallelQuestionOwnerAt(tokens, kaIdx, layout, lookups)) {
    return true;
  }
  const connectiveIdx = previousNonSpaceIndex(tokens, kaIdx);
  const connective = connectiveIdx === null
    ? null
    : registeredClauseConnectiveRelationForToken(tokens[connectiveIdx], connectiveIdx, {
      consumers: ["clause_layout"]
    });
  if (connective?.connectiveKind !== "reason") {
    return false;
  }
  const clauseTokens = tokens.map((token) => ({
    ...token,
    dictionaryForm: token.dictionaryForm ?? token.surface
  }));
  return looksQuestionTakingAfterViaLayout(
    layout,
    clauseTokens,
    kaIdx + 1,
    clauseTokens.length,
    lookups,
    { scope: "sentence", traverseMatrixArguments: true }
  );
}

function uncertainCauseKaParallelQuestionOwnerAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  if (directUncertainCauseKaRelation(tokens, kaIdx, layout) === null) return false;
  const parallelMarkers = layout.clauses
    .map((clause) => clause.start)
    .filter((candidateIdx) => directUncertainCauseKaRelation(tokens, candidateIdx, layout) !== null);
  if (parallelMarkers.length < 2 || !parallelMarkers.includes(kaIdx)) return false;
  const lastMarkerIdx = parallelMarkers[parallelMarkers.length - 1]!;
  const clauseTokens = tokens.map((token) => ({
    ...token,
    dictionaryForm: token.dictionaryForm ?? token.surface
  }));
  return looksQuestionTakingAfterViaLayout(
    layout,
    clauseTokens,
    lastMarkerIdx + 1,
    clauseTokens.length,
    lookups,
    { scope: "sentence", traverseMatrixArguments: true }
  );
}

export function kaFollowedByPostposedNominalMarkerAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): boolean {
  return questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["clause_layout", "embedded_question"]
  })?.continuationKind === "question_nominalizer_particle";
}

function directUncertainCauseKaRelation(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  layout: ClauseLayout
): UncertainCauseKaRelation | null {
  const connectiveIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (connectiveIdx === null) {
    return null;
  }
  const connective = registeredClauseConnectiveRelationForToken(tokens[connectiveIdx], connectiveIdx, {
    consumers: ["clause_layout"]
  });
  if (
    connective === null ||
    (connective.connectiveKind !== "te_form" && connective.connectiveKind !== "reason")
  ) {
    return null;
  }
  const connectiveClause = layout.clauseOfToken(connectiveIdx);
  if (connectiveClause?.terminatedBy !== "connective") {
    return null;
  }
  const hasFollowingPredicate = layout.clauses.some((clause) =>
    clause.predicates.some((predicateIdx) => predicateIdx > kaIdx)
  );
  if (!hasFollowingPredicate) return null;
  return { kind: "uncertain_cause_ka", connectiveIdx, kaIdx, evidence: "connective_clause" };
}

export interface TerminalQuestionKaRelation {
  readonly kind: "terminal_question_ka";
  readonly kaIdx: number;
  readonly hostIdx: number;
  readonly evidence:
    | "volitional_host"
    | "polite_host"
    | "terminal_boundary"
    | "anaphoric_conjecture_self_question";
}

export interface TerminalQuestionKaOwnershipOptions {
  readonly ownedByExistingStructure?: boolean;
  readonly lookups?: LookupTables;
  readonly anaphoricConjectureSelfQuestion?: boolean;
}

export interface ExplicitTerminalQuestionKaFollowerRelation {
  readonly kind: "explicit_terminal_question_ka_follower";
  readonly kaIdx: number;
  readonly followerIdx: number;
}

export function explicitTerminalQuestionKaFollowerRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): ExplicitTerminalQuestionKaFollowerRelation | null {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return null;
  }
  const discourse = selfQuestionDiscourseSfpKaRelationAt(tokens, kaIdx);
  if (discourse !== null) {
    return { kind: "explicit_terminal_question_ka_follower", kaIdx, followerIdx: discourse.sfpIdx };
  }
  const followerIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  return followerIdx !== null && isBoundaryPunctuationCategoryToken(tokens[followerIdx])
    ? { kind: "explicit_terminal_question_ka_follower", kaIdx, followerIdx }
    : null;
}

export function terminalQuestionKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  options: TerminalQuestionKaOwnershipOptions = {}
): TerminalQuestionKaRelation | null {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (hostIdx === null) {
    return null;
  }
  if (options.anaphoricConjectureSelfQuestion === true) {
    return { kind: "terminal_question_ka", kaIdx, hostIdx, evidence: "anaphoric_conjecture_self_question" };
  }
  if (options.ownedByExistingStructure === true) {
    return null;
  }
  if (questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["embedded_question"],
    limit: tokens.length
  }) !== null) {
    return null;
  }
  const host = tokens[hostIdx];
  if (
    host !== undefined &&
    (host.pos & (POS4 | POS5A)) === (助動詞_マス | 意志推量形_)
  ) {
    return { kind: "terminal_question_ka", kaIdx, hostIdx, evidence: "volitional_host" };
  }
  if (isPoliteTerminalQuestionKaAt(tokens, kaIdx, options.lookups)) {
    return { kind: "terminal_question_ka", kaIdx, hostIdx, evidence: "polite_host" };
  }
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  const subtitleTrailingRun = nextIdx === null || options.lookups === undefined
    ? null
    : subtitleTerminalTrailingPunctuationRunRelationAt(
      tokens,
      nextIdx,
      options.lookups.GRAMMAR_BOUNDARY_SUBTITLE_TERMINAL_TRAILING_SURFACES,
      ["tail_multi_clause"],
    );
  if (subtitleTrailingRun !== null) {
    return subtitleTerminalTrailingRunClosesSentence(tokens, subtitleTrailingRun.span.endExclusive)
      ? { kind: "terminal_question_ka", kaIdx, hostIdx, evidence: "terminal_boundary" }
      : null;
  }
  if (
    nextIdx === null ||
    isTerminalishPunctuationToken(tokens[nextIdx])
  ) {
    return { kind: "terminal_question_ka", kaIdx, hostIdx, evidence: "terminal_boundary" };
  }
  return null;
}

export function conjectureCopulaQuestionKaHostPoliteness(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): "plain" | "polite" | null {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, kaIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  return host === undefined ? null : conjectureCopulaPoliteness(host.pos);
}

export function conjectureCopulaQuestionKaClosesUtteranceAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups?: LookupTables
): boolean {
  const politeness = conjectureCopulaQuestionKaHostPoliteness(tokens, kaIdx);
  if (politeness === null) {
    return false;
  }
  if (
    lookups !== undefined &&
    belongsToStructuralKaChoiceGroupAt(
      tokens as unknown as readonly RuntimeHaruToken[],
      kaIdx,
      lookups
    )
  ) {
    return false;
  }
  if (explicitTerminalQuestionKaFollowerRelationAt(tokens, kaIdx) !== null) {
    return true;
  }
  if (questionContentContinuationAfterKaRelationAt(tokens, kaIdx) !== null) {
    return false;
  }
  return politeness === "polite";
}

export function isPoliteTerminalQuestionKaAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups?: LookupTables
): boolean {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return false;
  }
  if (
    lookups !== undefined &&
    belongsToStructuralKaChoiceGroupAt(
      tokens as unknown as readonly RuntimeHaruToken[],
      kaIdx,
      lookups
    )
  ) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, kaIdx);
  return hostIdx !== null && isPoliteQuestionHostAt(tokens, hostIdx);
}

function isPoliteQuestionHostAt(tokens: readonly BoundaryToken[], hostIdx: number): boolean {
  const host = tokens[hostIdx];
  if (host === undefined) {
    return false;
  }
  const hostPos4 = host.pos & POS4;
  if (hostPos4 === 助動詞_デス || hostPos4 === 助動詞_マス) {
    return (host.pos & POS5A) === 終止形_;
  }
  if (hostPos4 === 助動詞_ヌ) {
    return politeAuxiliaryPrecedes(tokens, hostIdx, 未然形_, [助動詞_マス]);
  }
  if (hostPos4 !== 助動詞_タ) {
    return false;
  }
  return politeAuxiliaryPrecedes(tokens, hostIdx, 連用形_, [助動詞_デス, 助動詞_マス]);
}

function politeAuxiliaryPrecedes(
  tokens: readonly BoundaryToken[],
  hostIdx: number,
  form: number,
  politeClasses: readonly number[]
): boolean {
  const politeIdx = previousNonSpaceIndex(tokens, hostIdx);
  const polite = politeIdx === null ? undefined : tokens[politeIdx];
  if (polite === undefined) {
    return false;
  }
  return politeClasses.includes(polite.pos & POS4) && (polite.pos & POS5A) === form;
}

function subtitleTerminalTrailingRunClosesSentence(
  tokens: readonly BoundaryToken[],
  afterRunIdx: number,
): boolean {
  let index: number | null = nextNonSpaceIndex(tokens, afterRunIdx, tokens.length);
  while (index !== null) {
    const token = tokens[index];
    if (!isTrailingPunctuationToken(token)) {
      return false;
    }
    index = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  }
  return true;
}

export function directDiscourseChoiceQuestionKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups?: LookupTables,
): TerminalQuestionKaRelation | null {
  const relation = terminalQuestionKaRelationAt(tokens, kaIdx, lookups === undefined ? {} : { lookups });
  if (relation === null) {
    return null;
  }
  if (relation.evidence === "volitional_host") {
    return relation;
  }
  const host = tokens[relation.hostIdx];
  return host !== undefined && (host.pos & POS4) === 助動詞_マス ? relation : null;
}

export function isInterrogativeAmountBeforeKa(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const previous = previousNonSpaceIndex(tokens, kaIdx);
  if (previous === null) {
    return false;
  }
  const token = tokens[previous];
  return token !== undefined && lookupContainsNormalizedForm(lookups.INTERROGATIVE_AMOUNT_FORMS, token);
}

export interface ApproximateAmountTailKaRelation {
  readonly kind: "approximate_amount_tail";
  readonly numeralIdx: number;
  readonly amountIdx: number;
  readonly kaIdx: number;
}

export function approximateAmountTailKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): ApproximateAmountTailKaRelation | null {
  const amountIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (amountIdx === null || !isInterrogativeAmountBeforeKa(tokens, kaIdx, lookups)) {
    return null;
  }
  const numeralIdx = previousNonSpaceIndex(tokens, amountIdx);
  const numeral = numeralIdx === null ? undefined : tokens[numeralIdx];
  if (numeral === undefined || numeralIdx === null || !isNumeralToken(numeral)) {
    return null;
  }
  return { kind: "approximate_amount_tail", numeralIdx, amountIdx, kaIdx };
}

export function isReformulationKaMarker(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  if (kaNoYouNiSimileRelationAt(tokens, kaIdx, lookups) !== null) {
    return false;
  }
  let index = previousNonSpaceIndex(tokens, kaIdx);
  if (index === null) {
    return false;
  }
  if (((tokens[index]?.pos ?? 0) & POS0) === 助動詞) {
    index = previousNonSpaceIndex(tokens, index);
    if (index === null) {
      return false;
    }
  }
  const verb = tokens[index];
  if (verb === undefined || (verb.pos & POS0) !== 動詞) {
    return false;
  }
  if (!isSayVerbToken(verb)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, index);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev === undefined) {
    return false;
  }
  return ((prev.pos & POS01) === 助詞_格助詞 && prev.surface === "と") ||
    ((prev.pos & POS01) === 助詞_副助詞 && (prev.surface === "って" || prev.surface === "て"));
}

export interface CanonicalReformulationMarkerRelation {
  readonly kind: "canonical_reformulation_marker";
  readonly quoteMarkerIdx: number;
  readonly hostIdx: number;
  readonly politeAuxSpan: {
    readonly start: number;
    readonly endExclusive: number;
  } | null;
  readonly kaIdx: number;
  readonly eligibleForQuotePreemption: boolean;
  readonly span: {
    readonly start: number;
    readonly endExclusive: number;
  };
}

export interface CanonicalReformulationMarkerRelationIndex {
  relationAtQuoteMarker(quoteMarkerIdx: number): CanonicalReformulationMarkerRelation | undefined;
  relationAtKa(kaIdx: number): CanonicalReformulationMarkerRelation | undefined;
  relations(): IterableIterator<CanonicalReformulationMarkerRelation>;
}

class MaterializedCanonicalReformulationMarkerRelationIndex
  implements CanonicalReformulationMarkerRelationIndex {
  private readonly byQuoteMarker = new Map<number, CanonicalReformulationMarkerRelation>();
  private readonly byKa = new Map<number, CanonicalReformulationMarkerRelation>();

  add(relation: CanonicalReformulationMarkerRelation): void {
    this.byQuoteMarker.set(relation.quoteMarkerIdx, relation);
    this.byKa.set(relation.kaIdx, relation);
  }

  relationAtQuoteMarker(quoteMarkerIdx: number): CanonicalReformulationMarkerRelation | undefined {
    return this.byQuoteMarker.get(quoteMarkerIdx);
  }

  relationAtKa(kaIdx: number): CanonicalReformulationMarkerRelation | undefined {
    return this.byKa.get(kaIdx);
  }

  relations(): IterableIterator<CanonicalReformulationMarkerRelation> {
    return this.byQuoteMarker.values();
  }
}

interface CanonicalReformulationRelationCacheBucket {
  readonly byProto: WeakMap<object, MaterializedCanonicalReformulationMarkerRelationIndex>;
  withoutProto?: MaterializedCanonicalReformulationMarkerRelationIndex;
}

const canonicalReformulationRelationCache =
  new WeakMap<readonly BoundaryToken[], CanonicalReformulationRelationCacheBucket>();

function buildCanonicalReformulationMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): CanonicalReformulationMarkerRelation | null {
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) !== "reformulation") {
    return null;
  }
  const beforeKaIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (beforeKaIdx === null) {
    return null;
  }
  const beforeKa = tokens[beforeKaIdx];
  const politeAuxIdx = ((beforeKa?.pos ?? 0) & POS0) === 助動詞
    ? beforeKaIdx
    : null;
  if (
    politeAuxIdx !== null &&
    (
      ((beforeKa?.pos ?? 0) & (POS0 | POS4)) !== (助動詞 | 助動詞_マス) ||
      !isTerminalOrAttributiveInflection(beforeKa?.pos ?? 0)
    )
  ) {
    return null;
  }
  const hostIdx = politeAuxIdx === null
    ? beforeKaIdx
    : previousNonSpaceIndex(tokens, politeAuxIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (hostIdx === null || host === undefined || !isSayVerbToken(host)) {
    return null;
  }
  if (
    politeAuxIdx === null
      ? !isTerminalOrAttributiveInflection(host.pos)
      : !isRenyouInflection(host.pos)
  ) {
    return null;
  }
  const quoteMarkerIdx = previousNonSpaceIndex(tokens, hostIdx);
  if (quoteMarkerIdx === null) {
    return null;
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, quoteMarkerIdx, {
    consumers: ["tail_multi_clause"]
  });
  if (
    quoteMarker === null ||
    quoteMarker.span.endExclusive > hostIdx ||
    (quoteMarker.canonicalSurface !== "と" && quoteMarker.canonicalSurface !== "って")
  ) {
    return null;
  }
  const contentHeadIdx = previousNonSpaceIndex(tokens, quoteMarkerIdx);
  const contentHead = contentHeadIdx === null ? undefined : tokens[contentHeadIdx];
  const proto = activeProtoLayout();
  const followsExplicitQuote = proto?.quoteSpans.some((span) => span[1] === contentHeadIdx) ?? false;
  const eligibleForQuotePreemption =
    proto !== null &&
    quoteMarker.canonicalSurface === "と" &&
    !followsExplicitQuote &&
    contentHead !== undefined &&
    isVerbPredicateToken(contentHead) &&
    isVolitionalInflection(contentHead.pos);
  return {
    kind: "canonical_reformulation_marker",
    quoteMarkerIdx,
    hostIdx,
    politeAuxSpan: politeAuxIdx === null
      ? null
      : { start: politeAuxIdx, endExclusive: politeAuxIdx + 1 },
    kaIdx,
    eligibleForQuotePreemption,
    span: { start: quoteMarkerIdx, endExclusive: kaIdx + 1 }
  };
}

export function canonicalReformulationMarkerRelationIndex(
  tokens: readonly BoundaryToken[],
  lookups: LookupTables
): CanonicalReformulationMarkerRelationIndex {
  const proto = activeProtoLayout();
  let bucket = canonicalReformulationRelationCache.get(tokens);
  if (bucket === undefined) {
    bucket = { byProto: new WeakMap() };
    canonicalReformulationRelationCache.set(tokens, bucket);
  }
  const cached = proto === null
    ? bucket.withoutProto
    : bucket.byProto.get(proto);
  if (cached !== undefined) {
    return cached;
  }
  const index = new MaterializedCanonicalReformulationMarkerRelationIndex();
  for (let kaIdx = 0; kaIdx < tokens.length; kaIdx += 1) {
    const relation = buildCanonicalReformulationMarkerRelationAt(tokens, kaIdx, lookups);
    if (relation !== null) {
      index.add(relation);
    }
  }
  if (proto === null) {
    bucket.withoutProto = index;
  } else {
    bucket.byProto.set(proto, index);
  }
  return index;
}

export function cachedCanonicalReformulationMarkerRelationIndex(
  tokens: readonly BoundaryToken[]
): CanonicalReformulationMarkerRelationIndex | null {
  const bucket = canonicalReformulationRelationCache.get(tokens);
  if (bucket === undefined) {
    return null;
  }
  const proto = activeProtoLayout();
  return (proto === null ? bucket.withoutProto : bucket.byProto.get(proto)) ?? null;
}

export interface SelfQuestionDiscourseSfpKaRelation {
  readonly kind: "self_question_discourse_sfp";
  readonly subtype: "kana_like" | "ne" | "toned_question";
  readonly kaIdx: number;
  readonly sfpIdx: number;
}

export function selfQuestionDiscourseSfpKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): SelfQuestionDiscourseSfpKaRelation | null {
  const self = tokens[kaIdx];
  if (!isQuestionParticleKaToken(self)) {
    return self !== undefined &&
      (self.pos & POS01) === 助詞_終助詞 &&
      isFusedSelfQuestionSfpSurface(self)
      ? { kind: "self_question_discourse_sfp", subtype: "kana_like", kaIdx, sfpIdx: kaIdx }
      : null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || nextIdx === null || (next.pos & POS01) !== 助詞_終助詞) {
    return null;
  }
  switch (postKaTerminalSfpType(next)) {
    case "kana":
      return { kind: "self_question_discourse_sfp", subtype: "kana_like", kaIdx, sfpIdx: nextIdx };
    case "ka_ne":
      return { kind: "self_question_discourse_sfp", subtype: "ne", kaIdx, sfpIdx: nextIdx };
    case "kai":
    case "kayo":
      return { kind: "self_question_discourse_sfp", subtype: "toned_question", kaIdx, sfpIdx: nextIdx };
    default:
      return null;
  }
}

export function isTokaListingKaMarker(tokens: readonly BoundaryToken[], kaIdx: number): boolean {
  const previous = previousNonSpaceIndex(tokens, kaIdx);
  if (previous === null) {
    return false;
  }
  const token = tokens[previous];
  if (token === undefined || (token.pos & POS01) !== 助詞_格助詞 || token.surface !== "と") {
    return false;
  }
  return !previousTokenIsBasicCopula(tokens, previous);
}

export interface CopulaClosedNominalPredicate {
  readonly kind: "copula_closed_nominal_predicate";
  readonly nounIdx: number;
  readonly copulaIdx: number;
  readonly sfpSpan: { readonly start: number; readonly endExclusive: number };
}

export function copulaClosedNominalPredicateBeforeMarkerAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number,
): CopulaClosedNominalPredicate | null {
  const closure = terminalAssertiveCopulaClosureBeforeMarker(tokens, markerIdx);
  if (closure === null) {
    return null;
  }
  const nounIdx = previousNonSpaceIndex(tokens, closure.copulaIdx);
  const noun = nounIdx === null ? undefined : tokens[nounIdx];
  if (nounIdx === null || noun === undefined || !isNominalPredicateHeadToken(noun)) {
    return null;
  }
  return {
    kind: "copula_closed_nominal_predicate",
    nounIdx,
    copulaIdx: closure.copulaIdx,
    sfpSpan: closure.sfpSpan,
  };
}

export interface ExplanatoryCopulaClosedProposition {
  readonly kind: "explanatory_copula_closed_proposition";
  readonly nominalizerIdx: number;
  readonly copulaIdx: number;
  readonly sfpSpan: { readonly start: number; readonly endExclusive: number };
}

export function explanatoryCopulaClosedPropositionBeforeMarkerAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number,
): ExplanatoryCopulaClosedProposition | null {
  const closure = terminalAssertiveCopulaClosureBeforeMarker(tokens, markerIdx);
  if (closure === null) {
    return null;
  }
  const nominalizerIdx = previousNonSpaceIndex(tokens, closure.copulaIdx);
  if (
    nominalizerIdx === null ||
    predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["quote_content"],
    })?.nominalizerKind !== "no"
  ) {
    return null;
  }
  return {
    kind: "explanatory_copula_closed_proposition",
    nominalizerIdx,
    copulaIdx: closure.copulaIdx,
    sfpSpan: closure.sfpSpan,
  };
}

function terminalAssertiveCopulaClosureBeforeMarker(
  tokens: readonly BoundaryToken[],
  markerIdx: number,
): { readonly copulaIdx: number; readonly sfpSpan: { readonly start: number; readonly endExclusive: number } } | null {
  let sfpStart = markerIdx;
  let scanIdx = previousNonSpaceIndex(tokens, markerIdx);
  while (scanIdx !== null && ((tokens[scanIdx]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    sfpStart = scanIdx;
    scanIdx = previousNonSpaceIndex(tokens, scanIdx);
  }
  const copula = scanIdx === null ? undefined : tokens[scanIdx];
  if (
    scanIdx === null ||
    copula === undefined ||
    copula.surface !== "だ" ||
    !isTerminalAssertiveCopulaToken(copula)
  ) {
    return null;
  }
  return { copulaIdx: scanIdx, sfpSpan: { start: sfpStart, endExclusive: markerIdx } };
}

function isNominalPredicateHeadToken(token: BoundaryToken): boolean {
  return isNominalLike(token);
}

export interface CopulaClosedTokaKaRelation extends CopulaClosedNominalPredicate {
  readonly kaIdx: number;
  readonly markerIdx: number;
}

export function copulaClosedTokaKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
): CopulaClosedTokaKaRelation | null {
  const markerIdx = tokaCaseMarkerBeforeKa(tokens, kaIdx);
  const closure = markerIdx === null ? null : copulaClosedNominalPredicateBeforeMarkerAt(tokens, markerIdx);
  return closure === null || markerIdx === null ? null : { ...closure, kaIdx, markerIdx };
}

export interface ExplanatoryCopulaClosedTokaKaRelation extends ExplanatoryCopulaClosedProposition {
  readonly kaIdx: number;
  readonly markerIdx: number;
}

export function explanatoryCopulaClosedTokaKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
): ExplanatoryCopulaClosedTokaKaRelation | null {
  const markerIdx = tokaCaseMarkerBeforeKa(tokens, kaIdx);
  const closure = markerIdx === null ? null : explanatoryCopulaClosedPropositionBeforeMarkerAt(tokens, markerIdx);
  return closure === null || markerIdx === null ? null : { ...closure, kaIdx, markerIdx };
}

export interface ClosedPropositionTokaKaRelation {
  readonly kind: "closed_proposition_toka_ka";
  readonly evidence: "terminal_particle_run" | "bare_volitional";
  readonly kaIdx: number;
  readonly markerIdx: number;
  readonly hostIdx: number;
}

export function closedPropositionTokaKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
): ClosedPropositionTokaKaRelation | null {
  const markerIdx = tokaCaseMarkerBeforeKa(tokens, kaIdx);
  if (markerIdx === null) {
    return null;
  }
  const closure = activeProtoClosedPropositionBeforeMarkerAt(tokens, markerIdx);
  if (closure === null) {
    return null;
  }
  const evidence = closure.evidence === "bare_volitional"
    ? "bare_volitional"
    : closure.run === "terminal_particle_run"
      ? "terminal_particle_run"
      : null;
  return evidence === null
    ? null
    : { kind: "closed_proposition_toka_ka", evidence, kaIdx, markerIdx, hostIdx: closure.hostIdx };
}

export interface QuestionClosedTokaKaRelation {
  readonly evidence: "question_ka" | "interrogative_noda" | "question_mark";
  readonly kaIdx: number;
  readonly markerIdx: number;
}

export function questionClosedTokaKaRelationAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables,
): QuestionClosedTokaKaRelation | null {
  const markerIdx = tokaCaseMarkerBeforeKa(tokens, kaIdx);
  const layout = activeProtoLayout();
  if (markerIdx === null || layout === null) {
    return null;
  }
  const adjacentIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (adjacentIdx === null) {
    return null;
  }
  const closureEdgeIdx = isWeakPunctuationToken(tokens[adjacentIdx]) ? previousNonSpaceIndex(tokens, adjacentIdx) : adjacentIdx;
  if (closureEdgeIdx === null) {
    return null;
  }
  if (isQuestionParticleKaToken(tokens[closureEdgeIdx]) && kaOwnershipKindAt(tokens, closureEdgeIdx, lookups) === "question") {
    return { evidence: "question_ka", kaIdx, markerIdx };
  }
  if (layout.utteranceClosureRunAt(closureEdgeIdx + 1)?.run === "interrogative_noda_run") {
    return { evidence: "interrogative_noda", kaIdx, markerIdx };
  }
  return hardTerminalPunctuationSurfaceClassForToken(tokens[closureEdgeIdx], closureEdgeIdx) === "question"
    ? { evidence: "question_mark", kaIdx, markerIdx }
    : null;
}


export function closedPropositionTokaListingEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  closure: {
    readonly evidence: ClosedPropositionTokaKaRelation["evidence"];
    readonly kaIdx: number;
    readonly hostIdx: number;
  },
  lookups: LookupTables,
): boolean {
  const layout = activeProtoLayout();
  if (layout === null) {
    return false;
  }
  const markerScope = layout.enclosingQuoteSpan(closure.kaIdx);
  const sameScope = (idx: number): boolean => {
    const scope = layout.enclosingQuoteSpan(idx);
    return scope?.[0] === markerScope?.[0] && scope?.[1] === markerScope?.[1];
  };
  return previousTokaListingItemBefore(layout, tokens, closure.hostIdx, sameScope) ||
    tokaListingContinuesAfter(layout, tokens, closure.kaIdx, sameScope, lookups) ||
    (closure.evidence === "bare_volitional" && singleTokaExampleClosesUtterance(layout, tokens, closure, lookups));
}

const SINGLE_TOKA_EXAMPLE_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
]);

function singleTokaExampleClosesUtterance(
  layout: ProtoClauseLayoutForListing,
  tokens: readonly RuntimeHaruToken[],
  closure: { readonly kaIdx: number; readonly hostIdx: number },
  lookups: LookupTables,
): boolean {
  return runClosesUtteranceAs(utteranceClosureRunAfter(layout, tokens, closure.kaIdx + 1), SINGLE_TOKA_EXAMPLE_UTTERANCE_CLOSURES) &&
    !layout.clauseCarriesInterrogativeFormAt(tokens, closure.hostIdx, lookups);
}

function previousTokaListingItemBefore(
  layout: ProtoClauseLayoutForListing,
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  sameScope: (idx: number) => boolean,
): boolean {
  let inPredicateRun = true;
  let runStart = hostIdx;
  let asideStart: number | null = null;
  for (const item of enumerateClausePhrasesBefore(layout, tokens, hostIdx, { scope: "sentence" })) {
    if (asideStart !== null && item.span.start >= asideStart) {
      continue;
    }
    const aside = parentheticalSpanEndingAt(tokens, item.headIdx);
    if (aside?.role === "parenthetical_span") {
      asideStart = aside.span.start;
      continue;
    }
    if (inPredicateRun) {
      if (item.span.endExclusive === runStart && isPredicateRunPiece(tokens, item)) {
        runStart = item.span.start;
        continue;
      }
      inPredicateRun = false;
    }
    if (item.kind === "nominal" || item.kind === "adverbial" || item.kind === "punctuation_weak") {
      continue;
    }
    return item.kind === "marker_particle" &&
      isQuestionParticleKaToken(tokens[item.headIdx]) &&
      isTokaListingKaMarker(tokens, item.headIdx) &&
      sameScope(item.headIdx);
  }
  return false;
}

function tokaListingContinuesAfter(
  layout: ProtoClauseLayoutForListing,
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  sameScope: (idx: number) => boolean,
  lookups: LookupTables,
): boolean {
  let first = true;
  let asideEnd: number | null = null;
  let predicateRunEnd: number | null = null;
  let introducerEnd: number | null = null;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, kaIdx, { scope: "sentence" })) {
    if (asideEnd !== null && item.span.start < asideEnd) {
      continue;
    }
    const aside = parentheticalSpanStartingAt(tokens, item.headIdx);
    if (aside?.role === "parenthetical_span") {
      asideEnd = aside.span.endExclusive;
      continue;
    }
    if (item.kind === "punctuation_weak") {
      continue;
    }
    if (!sameScope(item.headIdx)) {
      return false;
    }
    if (
      first &&
      item.kind === "adverbial" &&
      lookups.TOKA_LISTING_RESUMPTIVE_KIND_DEMONSTRATIVES.has(tokens[item.headIdx]?.surface ?? "")
    ) {
      return true;
    }
    if (introducerEnd !== null) {
      if (item.span.start < introducerEnd) {
        if (item.span.endExclusive > introducerEnd) {
          return false;
        }
        continue;
      }
      return isListingItemPhrase(item) || naAdjectivalListingItemBinds(tokens, item, sameScope, lookups);
    }
    if (first && item.kind === "adverbial") {
      introducerEnd = alternativeIntroducerEndAt(tokens, item.span.start, lookups);
      if (introducerEnd !== null) {
        continue;
      }
    }
    first = false;
    if (predicateRunEnd !== null) {
      if (item.span.start === predicateRunEnd && isPredicateRunPiece(tokens, item)) {
        predicateRunEnd = item.span.endExclusive;
        continue;
      }
      return isTokaListingToAt(tokens, predicateRunEnd);
    }
    if (item.kind === "predicate" || item.kind === "predicate_evidence") {
      predicateRunEnd = item.span.endExclusive;
      continue;
    }
    if (item.kind === "nominal") {
      if (item.markerParticleIdx !== null && isTokaListingToAt(tokens, item.markerParticleIdx)) {
        return true;
      }
      continue;
    }
    if (item.kind === "adverbial") {
      continue;
    }
    return false;
  }
  return predicateRunEnd !== null && isTokaListingToAt(tokens, predicateRunEnd);
}

function isPredicateRunPiece(tokens: readonly RuntimeHaruToken[], item: { readonly kind: string; readonly headIdx: number }): boolean {
  return item.kind === "predicate" || item.kind === "predicate_evidence" ||
    (item.kind === "marker_particle" && ((tokens[item.headIdx]?.pos ?? 0) & POS01) === 助詞_接続助詞);
}

function alternativeIntroducerEndAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables,
): number | null {
  const introducers = lookups.TOKA_LISTING_ALTERNATIVE_INTRODUCERS;
  let surface = "";
  for (let idx = start; idx < tokens.length; idx += 1) {
    const piece = tokens[idx]?.surface ?? "";
    if (piece.trim() === "") {
      return null;
    }
    surface += piece;
    if (introducers.has(surface)) {
      return idx + 1;
    }
    if (![...introducers].some((introducer) => introducer.startsWith(surface))) {
      return null;
    }
  }
  return null;
}

function naAdjectivalListingItemBinds(
  tokens: readonly RuntimeHaruToken[],
  item: { readonly kind: string; readonly headIdx: number; readonly span: { readonly start: number; readonly endExclusive: number } },
  sameScope: (idx: number) => boolean,
  lookups: LookupTables,
): boolean {
  const head = tokens[item.headIdx];
  if (item.kind !== "other" || head === undefined || !isNaAdjCapable(head)) {
    return false;
  }
  const markerIdx = nextNonSpaceIndex(tokens, item.headIdx + 1);
  if (markerIdx !== null && copulaNiMarkerRelationForToken(tokens[markerIdx], markerIdx) !== null) {
    const predicateIdx = findAdverbialModifierPredicate(tokens, markerIdx, {
      deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS,
    });
    return predicateIdx !== null && sameScope(predicateIdx);
  }
  const nominalHeadIdx = prenominalModifierChainHeadIndex(tokens, item.span.start, tokens.length, {
    auxiliaryStem: "opaque",
    separationRefused: DETACHED_SEPARATIONS,
    reach: "adnominal_stack",
  });
  return nominalHeadIdx !== null && nominalHeadIdx > item.headIdx && sameScope(nominalHeadIdx);
}

function isListingItemPhrase(item: { readonly kind: string }): boolean {
  return item.kind === "nominal" || item.kind === "adverbial" || item.kind === "predicate" ||
    item.kind === "predicate_evidence" || item.kind === "opaque_span";
}

function isTokaListingToAt(tokens: readonly RuntimeHaruToken[], toIdx: number): boolean {
  const kaIdx = nextNonSpaceIndex(tokens, toIdx + 1);
  return kaIdx !== null && tokaCaseMarkerBeforeKa(tokens, kaIdx) === toIdx && isTokaListingKaMarker(tokens, kaIdx);
}

type ProtoClauseLayoutForListing = NonNullable<ReturnType<typeof activeProtoLayout>>;

function tokaCaseMarkerBeforeKa(tokens: readonly BoundaryToken[], kaIdx: number): number | null {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return null;
  }
  const markerIdx = previousNonSpaceIndex(tokens, kaIdx);
  const marker = markerIdx === null ? undefined : tokens[markerIdx];
  if (
    markerIdx === null ||
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS01) !== 助詞_格助詞
  ) {
    return null;
  }
  return markerIdx;
}

export function isCopularTokaKaMarker(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
): boolean {
  if (!isQuestionParticleKaToken(tokens[kaIdx])) {
    return false;
  }
  const toIdx = previousNonSpaceIndex(tokens, kaIdx);
  return toIdx !== null &&
    tokens[toIdx]?.surface === "と" &&
    (tokens[toIdx]!.pos & POS01) === 助詞_格助詞 &&
    previousTokenIsBasicCopula(tokens, toIdx);
}


export function isWhIndefiniteKaMarker(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return whIndefiniteKaKindAt(tokens, kaIdx, lookups) !== null;
}

export function whIndefiniteKaKindAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): WhIndefiniteKaKind | null {
  const previous = previousNonSpaceIndex(tokens, kaIdx);
  const previousToken = previous === null ? undefined : tokens[previous];
  if (
    previousToken !== undefined &&
    lookupContainsNormalizedForm(lookups.INTERROGATIVE_QUANTITY_FORMS, previousToken)
  ) {
    return "standalone_quantity";
  }
  if (isInterrogativeQuantityBeforeKa(tokens, kaIdx, lookups)) {
    return "counter_quantity";
  }
  if (isLexicalizedWhIndefiniteBeforeKa(tokens, kaIdx, lookups)) {
    return "lexicalized";
  }
  if (previous === null) {
    return null;
  }
  const token = tokens[previous];
  if (token === undefined || !pos0in(token.pos, (1 << 代名詞) | (1 << 名詞))) {
    return null;
  }
  if (lookupContainsNormalizedForm(lookups.INTERROGATIVE_PRONOMINAL_FORMS, token)) {
    return "pronominal";
  }
  return null;
}

export function isInterrogativeQuantitySourceToken(
  token: BoundaryToken,
  lookups: LookupTables
): boolean {
  if (lookupContainsNormalizedForm(lookups.INTERROGATIVE_QUANTITY_FORMS, token)) {
    return true;
  }
  if (tokenIsSourceQuantityPrefix(token, lookups)) {
    return true;
  }
  const split = token.splitA ?? [];
  const first = split[0];
  const last = split[split.length - 1];
  return first !== undefined &&
    last !== undefined &&
    tokenIsSourceQuantityPrefix(first, lookups) &&
    tokenHasSourceCounterCapability(last, lookups);
}

function isInterrogativeQuantityBeforeKa(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const previous = previousNonSpaceIndex(tokens, kaIdx);
  if (previous === null) {
    return false;
  }
  const token = tokens[previous];
  if (token === undefined) {
    return false;
  }
  if (isInterrogativeQuantitySourceToken(token, lookups)) {
    return true;
  }
  if (!tokenHasSourceCounterCapability(token, lookups)) {
    return false;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, previous);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix !== undefined && tokenIsSourceQuantityPrefix(prefix, lookups);
}

function tokenIsSourceQuantityPrefix(token: BoundaryToken, lookups: LookupTables): boolean {
  return (token.pos & POS01) === 名詞_数詞 &&
    lookupContainsNormalizedForm(lookups.INTERROGATIVE_NOMINAL_PREFIXES, token);
}

function tokenHasSourceCounterCapability(token: BoundaryToken, lookups: LookupTables): boolean {
  return isCounterCapableToken(token) ||
    lookupContainsNormalizedForm(lookups.INTERROGATIVE_COUNTER_FORMS, token);
}

export function isFusedWhIndefiniteParticleToken(
  token: Pick<BoundaryToken, "pos" | "surface" | "dictionaryForm"> | undefined,
  lookups: LookupTables
): boolean {
  if (token === undefined || (token.pos & POS01) !== 助詞_副助詞) {
    return false;
  }
  const form = normalizedTokenForm(token);
  if (!form.endsWith("か") || form.length < 2) {
    return false;
  }
  return lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form.slice(0, -1));
}

function isLexicalizedWhIndefiniteBeforeKa(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const previous = previousNonSpaceIndex(tokens, kaIdx);
  if (previous === null) {
    return false;
  }
  const token = tokens[previous];
  if (token === undefined) {
    return false;
  }
  const form = normalizedTokenForm(token);
  if (lookups.INTERROGATIVE_INDEFINITE_FORMS.has(form)) {
    return true;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, previous);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix !== undefined &&
    lookups.INTERROGATIVE_INDEFINITE_FORMS.has(`${normalizedTokenForm(prefix)}${form}`);
}

function normalizedTokenForm(token: Pick<BoundaryToken, "dictionaryForm" | "surface">): string {
  return token.dictionaryForm !== undefined && token.dictionaryForm.length > 0
    ? token.dictionaryForm
    : token.surface;
}

function lookupContainsNormalizedForm(
  set: ReadonlySet<string>,
  token: Pick<BoundaryToken, "dictionaryForm" | "surface">
): boolean {
  const dictionaryForm = token.dictionaryForm ?? "";
  return dictionaryForm.length > 0
    ? set.has(dictionaryForm)
    : set.has(token.surface);
}

function kaDouKaPolesOppose(
  tokens: readonly BoundaryToken[],
  firstKaIdx: number,
  douIdx: number
): boolean {
  const hostIdx = previousNonSpaceIndex(tokens, firstKaIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  const dou = tokens[douIdx];
  if (host === undefined || dou === undefined) {
    return true;
  }
  return normalizedTokenForm(host) !== normalizedTokenForm(dou);
}

export function isKaDouKaMarker(tokens: readonly BoundaryToken[], kaIdx: number): boolean {
  const token = tokens[kaIdx];
  if (!isQuestionParticleKaToken(token)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  if (nextIdx !== null && tokens[nextIdx]?.surface === "どう") {
    const afterDou = nextNonSpaceIndex(tokens, nextIdx + 1, tokens.length);
    return isQuestionParticleKaToken(tokens[afterDou ?? -1]) &&
      kaDouKaPolesOppose(tokens, kaIdx, nextIdx);
  }
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null || tokens[prevIdx]?.surface !== "どう") {
    return false;
  }
  const beforeDou = previousNonSpaceIndex(tokens, prevIdx);
  return beforeDou !== null &&
    isQuestionParticleKaToken(tokens[beforeDou]) &&
    kaDouKaPolesOppose(tokens, beforeDou, prevIdx);
}

export function isKamoShirenaiModalKaMarker(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups?: LookupTables
): boolean {
  const runtimeTokens = tokens as unknown as readonly RuntimeHaruToken[];
  if (lookups === undefined) {
    return isKamoShirenaiModalStartAtToken(runtimeTokens, kaIdx);
  }
  return isKamoShirenaiModalStartAtToken(runtimeTokens, kaIdx, {
    tokens: runtimeTokens,
    kaIndex: kaIdx,
    clauseContainsInterrogative: isWhIndefiniteKaMarker(tokens, kaIdx, lookups),
    clauseContainsPredicateChoiceKa: false
  });
}

export function previousTokenIsBasicCopula(tokens: readonly BoundaryToken[], index: number): boolean {
  const previous = previousNonSpaceIndex(tokens, index);
  const token = previous === null ? undefined : tokens[previous];
  return token !== undefined &&
    (token.pos & POS0) === 助動詞 &&
    token.dictionaryForm === "だ";
}

export function previousTokenIsCopulaQuestionHost(tokens: readonly BoundaryToken[], index: number): boolean {
  const previous = previousNonSpaceIndex(tokens, index);
  const token = previous === null ? undefined : tokens[previous];
  return token !== undefined &&
    (token.pos & POS0) === 助動詞 &&
    (token.pos & POS5A) !== 意志推量形_ &&
    (
      token.dictionaryForm === "だ" ||
      token.dictionaryForm === "です" ||
      (token.pos & POS4) === 助動詞_ダ ||
      (token.pos & POS4) === 助動詞_デス
    );
}

export function isRhetoricalMonoKaHeadAt(
  tokens: readonly BoundaryToken[],
  headIdx: number
): boolean {
  const head = tokens[headIdx];
  if (head === undefined || (head.pos & POS0) !== 名詞 || head.surface !== "もの") {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, headIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host !== undefined && (host.pos & POS4) === 助動詞_タ) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, headIdx + 1, tokens.length);
  if (kaIdx === null) {
    return false;
  }
  return kaMarkerRelationAt(tokens, kaIdx, ["tail_nominalization_rules"])?.particleSubtype1 === 終助詞;
}
