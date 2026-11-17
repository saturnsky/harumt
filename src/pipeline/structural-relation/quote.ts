
import {
  looksNarrowQuestionTakingAfter,
  looksQuestionTakingAfter,
  looksQuoteQuestionTakingAfter,
  clauseContainsInterrogativeBefore,
  tokenIsInterrogativeLexeme,
} from "../quote/embedded-question.js";
import type { LookupTables } from "../lookup-tables.js";
import type { QuoteHostLike } from "../quote/host-registry.js";
import {
  nextNonSpaceIndex,
  nextTransparentEvidenceIndex,
  previousNonSpaceIndex,
  previousTransparentEvidenceIndex,
  separatedAs
} from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { detectQuoteSpans, isConditionalAuxClauseBoundaryToken, isConditionalCopulaClauseBoundaryToken, previousClauseNonPunctuationIndex, type ClauseLayout } from "../clause-layout/index.js";
import { clausePhraseReachStreamForToken, enumerateClausePhrasesAfter, enumerateClausePhrasesBefore, type PhraseEnumerationLayout } from "../clause-layout/phrase-enumeration.js";
import { kaChoiceAlternativeCounterpartAfter } from "./ka-parallel-ownership.js";
import { utteranceClosureRunAfter } from "../clause-layout/utterance-closure.js";
import { kaOpensGenitiveNominalPhrase } from "../clause-layout/nominal-binding.js";
import { isNominalHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { NominalHeadTailChainPlan } from "../head-tail/lifecycle/head-tail-render-plan.js";
import { looksQuoteQuestionTakingAfterViaLayout } from "../quote/question-taking-enumeration.js";
import type { ContentMap } from "../particles/index.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseBoundary } from "../head-tail/tail/predicate-root/commit.js";
import type {
  ConnectiveKind,
  QuoteBoundaryFocusParticle,
  QuoteBoundaryKoreanClauseForm,
  QuoteBoundaryPayload,
  RequestQuoteTailKind
} from "../head-tail/tail/predicate-root/grammar.js";
import type { ParticleKey } from "../../generator/particles.js";
import {
  QuoteHostMatch,
  markerBoundRelationalHeadSpanEndAt,
  nounPhraseCanBridgeToQuoteHost,
  quoteHostMatchAfterMarker,
  quoteHostMatchBlockedByNegativeCondition,
  quoteHostMatchIsAttributiveIu
} from "../quote/host-taxonomy.js";
import { quoteMarkerSpanAbsorbsScopeBridgeFocus } from "../head-tail/data/scope-bridge-focus-table.js";
import {
  caseParticleMarkerRelationForToken,
  conditionalTailConnectiveRelationForToken,
  dewaScopeBridgeRelationAt,
  isNegativeConditionalBoundaryAt,
  kaMarkerRelationAt,
  isJanaiConfirmationKaBaseAt,
  nominalLinkMarkerRelationForToken,
  nominalizerQuestionContentConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  questionContentContinuationAfterKaRelationAt,
  quotativeDerivedIdiomClaimAt,
  quoteHostSearchBridgeArgumentRelationAt,
  topicFocusMarkerRelationForToken,
} from "../head-tail/boundary/marker.js";
import {
  hardTerminalPunctuationRelation,
  hasHardTerminalPunctuationRelation,
  isBoundaryPunctuationCategoryToken,
  isContentInternalConnectorToken,
  isOpeningPunctuationSurface,
  isTrailingPunctuationSurface,
  quoteBridgePunctuationRelationAt,
  weakPunctuationRelation
} from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import {
  canonicalReformulationMarkerRelationIndex,
  copulaClosedTokaKaRelationAt,
  explanatoryCopulaClosedTokaKaRelationAt,
  isTokaListingKaMarker,
  kaOwnershipKindAt,
  singleMarkerNominalChoiceKaAt,
  speakerAcknowledgmentKaHostRelationAt,
  closedPropositionTokaKaRelationAt,
  questionClosedTokaKaRelationAt,
  type QuestionClosedTokaKaRelation,
  terminalQuestionKaRelationAt,
  whIndefiniteKaKindAt,
} from "../head-tail/boundary/ka-ownership.js";
import { classifyDatteMarkerAt } from "../semantics/marker-roles.js";
import { isAnimateReferentBeforeNi, isAnimateReferentToken, isHumanReferentToken } from "../head-tail/candidate/semantic-classifiers.js";
import { previousRequestCommandContentToken, quoteMarkerPrecededByRequestCommandContent } from "../quote/prohibitive-request.js";
import { matchQuotedSareruTailAsClauseQuote } from "../quote/reporting-passive.js";
import { detectNoda, isChainedNaiToken } from "../semantics/grammar-runtime.js";
import { tariKeijoujiAdverbialToEvidence } from "../semantics/tari-adverbial-marker.js";
import { isTeConnectiveToken, teBenefactiveContinuationMetadataForToken, teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import type { RuleTraceDetailValue } from "../../types/pipeline.js";
import { tokensShareLemma } from "../../types/token.js";
import type { RuntimeHaruToken, SeparationKind } from "../../types/token.js";
import type {
  StructuralQuoteBridgeKind,
  StructuralQuoteContentSlotKind,
  StructuralQuoteMarkerPayload,
  StructuralQuotePayload,
  StructuralQuoteRequestPayload,
  StructuralRelation,
  StructuralRelationTokenSpan,
} from "./types.js";
import { tokaNominalListingRunEvidenceAt } from "./toka-nominal-listing-run.js";

import { POS0, POS01, pos0in, POS1, 助詞_係助詞, isProperPersonNameToken, POS4, POS5A, PUNCTUATION_BITS, 記号, 形状詞, 形容詞0, 終止形_, 終助詞, 助詞, 助詞_準体助詞, 助動詞, 助動詞_ダ, 助動詞_デス, 格助詞, 接続助詞, 接頭辞, 接尾辞, 代名詞, 動詞, 動詞_非自立可能, 副詞, 補助記号, 名詞, 連体形_, 連体詞, 連用形_, 已然形_, 意志推量形_, isAuxiliaryToken, isIAdjectivePredicateToken, isLexicalAdverb, isAuxiliaryStemToken, isNaAdjCapableNoun, isNegativeAuxiliaryPos, isNonIndependentVerbToken, isPastAuxConditionalForm, isPastAuxiliaryPos, isTerminalOrAttributiveInflection, isVerbPredicateToken, PREDICATE_AUX_BITS, NOMINAL_BITS, INFLECTABLE_AUX_BITS, 接尾辞_名詞的, 形状詞_助動詞語幹 } from "../../types/pos.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";
import { isCopulaSupportCapableToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";

const TE_SHIMAU_CONTRACTION_FORMS: ReadonlySet<string> = new Set(["ちゃう", "じゃう", "ちまう", "じまう"]);

export type { RequestQuoteTailKind };

export interface ReasonCopulaQuoteContentMatch {
  readonly reasonMarkerIdx: number;
  readonly copulaStart: number;
  readonly copulaEndExclusive: number;
  readonly past: boolean;
  readonly polite: boolean;
  readonly conjunctive: boolean;
  readonly negative: boolean;
  readonly additiveMo: boolean;
  readonly conjecture: { readonly polite: boolean } | null;
}

type QuoteConnectiveKind = Extract<
  ConnectiveKind,
  "quotative" | "question_content_alternative" | "question_quotative" | "cognitive_complement" | "wish_complement" | "request_complement"
>;

export type QuoteRequestSourceEvidence = Pick<StructuralQuoteRequestPayload, "kind" | "politenessEvidence"> & { readonly tailScope?: "passive_iu_only" };

function requestAuxPolitenessEvidence(token: RuntimeHaruToken, polite: boolean) {
  const honorific = teBenefactiveContinuationMetadataForToken(token)?.honorific === true;
  return { polite: polite || honorific, honorific };
}

export type QuoteStructuralRelation = StructuralRelation & {
  readonly quote: NonNullable<StructuralRelation["quote"]>;
};

export function quoteRelationOwnsMarkerRealization(relation: QuoteStructuralRelation): boolean {
  return relation.quote.markerRealization !== "exemplification";
}

export interface QuoteStructuralRelationIndex {
  winnerAtOwnedPosition(position: number): QuoteStructuralRelation | undefined;
  canonicalWinnerAt(position: number): QuoteStructuralRelation | undefined;
  winners(): IterableIterator<QuoteStructuralRelation>;
}

class MutableQuoteStructuralRelationIndex
  implements QuoteStructuralRelationIndex {
  private readonly canonicalWinners = new Map<number, QuoteStructuralRelation>();
  private readonly ownedPositionAliases = new Map<number, number>();

  winnerAtOwnedPosition(position: number): QuoteStructuralRelation | undefined {
    const relation = this.producedWinnerAt(position);
    return relation === undefined || quoteRelationOwnsMarkerRealization(relation) ? relation : undefined;
  }

  producedWinnerAt(position: number): QuoteStructuralRelation | undefined {
    return this.canonicalWinnerAt(this.ownedPositionAliases.get(position) ?? position);
  }

  canonicalWinnerAt(position: number): QuoteStructuralRelation | undefined {
    return this.canonicalWinners.get(position);
  }

  winners(): IterableIterator<QuoteStructuralRelation> {
    return this.canonicalWinners.values();
  }

  canonicalEntries(): IterableIterator<[number, QuoteStructuralRelation]> {
    return this.canonicalWinners.entries();
  }

  setCanonicalWinner(position: number, relation: QuoteStructuralRelation): void {
    this.canonicalWinners.set(position, relation);
  }

  deleteCanonicalWinner(position: number): void {
    this.canonicalWinners.delete(position);
  }

  bindOwnedPosition(position: number, canonicalMarkerIdx: number): void {
    if (position === canonicalMarkerIdx) {
      this.ownedPositionAliases.delete(position);
      return;
    }
    this.ownedPositionAliases.set(position, canonicalMarkerIdx);
  }

  bindOwnedSpan(span: StructuralRelationTokenSpan, canonicalMarkerIdx: number): void {
    for (let position = span.start; position < span.endExclusive; position += 1) this.bindOwnedPosition(position, canonicalMarkerIdx);
  }

  rebindOwnedPositions(previousMarkerIdx: number, canonicalMarkerIdx: number): void {
    for (const [position, target] of this.ownedPositionAliases) {
      if (target === previousMarkerIdx) {
        this.ownedPositionAliases.set(position, canonicalMarkerIdx);
      }
    }
    this.bindOwnedPosition(previousMarkerIdx, canonicalMarkerIdx);
  }
}

interface RelationCacheBucket {
  readonly byProto: WeakMap<object, Map<number, MutableQuoteStructuralRelationIndex>>;
  readonly withoutProto: Map<number, MutableQuoteStructuralRelationIndex>;
}

type QuoteRelationIndexVariant = "canonical" | "boundary_formation";

const relationIndexCaches: { readonly [V in QuoteRelationIndexVariant]: WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket> } = {
  canonical: new WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket>(),
  boundary_formation: new WeakMap<readonly RuntimeHaruToken[], RelationCacheBucket>()
};

function cachedQuoteRelationsFor(
  tokens: readonly RuntimeHaruToken[],
  proto: object | null,
  end: number,
  variant: QuoteRelationIndexVariant = "canonical"
): QuoteStructuralRelationIndex | undefined {
  const bucket = relationIndexCaches[variant].get(tokens);
  return proto === null
    ? bucket?.withoutProto.get(end)
    : bucket?.byProto.get(proto)?.get(end);
}

function cacheQuoteRelationsFor(
  tokens: readonly RuntimeHaruToken[],
  proto: object | null,
  end: number,
  relations: MutableQuoteStructuralRelationIndex,
  variant: QuoteRelationIndexVariant
): void {
  const cache = relationIndexCaches[variant];
  let bucket = cache.get(tokens);
  if (bucket === undefined) {
    bucket = {
      byProto: new WeakMap<object, Map<number, MutableQuoteStructuralRelationIndex>>(),
      withoutProto: new Map<number, MutableQuoteStructuralRelationIndex>()
    };
    cache.set(tokens, bucket);
  }
  if (proto === null) {
    bucket.withoutProto.set(end, relations);
    return;
  }
  let byEnd = bucket.byProto.get(proto);
  if (byEnd === undefined) {
    byEnd = new Map<number, MutableQuoteStructuralRelationIndex>();
    bucket.byProto.set(proto, byEnd);
  }
  byEnd.set(end, relations);
}

export function cachedQuoteStructuralRelationIndex(
  tokens: readonly RuntimeHaruToken[],
  end: number = tokens.length
): QuoteStructuralRelationIndex | undefined {
  const proto = activeProtoLayout();
  return proto === null ? undefined : cachedQuoteRelationsFor(tokens, proto, end);
}

export function cachedQuoteBindingForContentRoot(
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  markerIdx: number,
  end: number = tokens.length
): "unbound" | "quoted_content" {
  const relations = cachedQuoteStructuralRelationIndex(tokens, end);
  if (relations === undefined) {
    throw new Error("quote binding requires the cached quote relation index");
  }
  const relation = relations.winnerAtOwnedPosition(markerIdx);
  return relation?.quote.slotKind === "quoted_content" &&
    relation.quote.contentSpan.start <= predicateTokenIdx &&
    predicateTokenIdx < relation.quote.contentSpan.endExclusive
    ? "quoted_content"
    : "unbound";
}

interface QuoteStructuralRelationIndexOptions {
  readonly allowBuildProtoForTariAdverbialEvidence?: boolean;
  readonly admitWhIndefiniteBareNominalContent?: boolean;
}

function quoteRelationHostHasPassiveAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  end: number = tokens.length
): boolean {
  return quoteHostHasPassiveAuxInRange(tokens, relation.quote.hostMatch.hostIdx + 1, end);
}

export function quoteStructuralRelationKoreanClauseForm(relation: QuoteStructuralRelation): "기를" | "다고" | "는지" | "라고" {
  if (relation.quote.slotKind === "wish_content") {
    return "기를";
  }
  if (relation.quote.slotKind === "request_content") {
    return "라고";
  }
  if (relation.quote.slotKind === "question_content") {
    return "는지";
  }
  return "다고";
}

export function quoteHostAllowsBareNominalContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  if (
    quoteMarkerPreemptedByNearerQuoteMarker(tokens, relation, lookups) ||
    quoteHostUnreachableFromMarkerClause(tokens, relation)
  ) {
    return false;
  }
  if (registry.hostHasCapability(host, "bare_nominal_quote")) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_passive_quote") &&
    quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    relation.quote.markerBaseSurface === "って" &&
    registry.hostHasCapability(host, "bare_nominal_colloquial_quote")
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_hearsay_quote") &&
    quoteHostHasBareNominalHearsayEvidence(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_object_label_quote") &&
    quoteHostHasLabelableObjectArgumentBeforeMarker(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_focus_quote") &&
    quoteHostHasBareNominalFocusEvidence(relation)
  ) {
    return true;
  }
  return false;
}

function quoteHostHasBareNominalFocusEvidence(relation: QuoteStructuralRelation): boolean {
  return relation.quote.focusParticle === "でも";
}

export function quoteStructuralRelationLooksBareNominalContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (relation.quote.markerBaseSurface !== "と" && relation.quote.markerBaseSurface !== "って") {
    return false;
  }
  if (relation.quote.slotKind !== "quoted_content" || relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx) {
    return false;
  }
  const phraseStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (phraseStart === null) {
    return false;
  }
  if (quoteContentTailIsPredicateBoundTame(tokens, relation, phraseStart)) {
    return false;
  }
  let sawNominalHead = false;
  const nominalCursor = new TokenCursor(tokens, phraseStart, relation.quote.contentSpan.endExclusive);
  while (nominalCursor.pos < nominalCursor.end) {
    const index = nominalCursor.pos;
    const token = nominalCursor.current();
    const pos0 = (token?.pos ?? 0) & POS0;
    nominalCursor.advance();
    if (pos0in(pos0, NOMINAL_BITS)) {
      sawNominalHead = true;
      continue;
    }
    if (pos0 === 接頭辞 || pos0 === 連体詞 || isNominalSuffixToken(token)) {
      continue;
    }
    if (nominalLinkMarkerRelationForToken(token, index, { consumers: ["quote_content"] }) !== null) {
      continue;
    }
    return false;
  }
  return sawNominalHead;
}

function quoteBareNominalContentHasAdjectivalDistribution(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (!quoteStructuralRelationLooksBareNominalContent(tokens, relation)) {
    return false;
  }
  const phraseStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (phraseStart === null) {
    return false;
  }
  const adjCursor = new TokenCursor(tokens, phraseStart, relation.quote.contentSpan.endExclusive);
  while (adjCursor.pos < adjCursor.end) {
    const token = adjCursor.current();
    const pos0 = (token?.pos ?? 0) & POS0;
    adjCursor.advance();
    if (token !== undefined && pos0in(pos0, NOMINAL_BITS) && isNaAdjCapableNoun(token)) {
      return true;
    }
  }
  return false;
}

function quoteContentRightEdgeHasAdjectivalDistribution(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    relation.quote.slotKind !== "quoted_content" ||
    relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx
  ) {
    return false;
  }
  const headIdx = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  if (headIdx === null) {
    return false;
  }
  const token = tokens[headIdx];
  return token !== undefined && pos0in(token.pos & POS0, NOMINAL_BITS) && isNaAdjCapableNoun(token);
}

function quoteContentTailIsPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  tailStart: number,
): boolean {
  const tailHead = onlyContentTokenInSpan(tokens, tailStart, relation.quote.contentSpan.endExclusive);
  if (tailHead === null) {
    return false;
  }
  const token = tokens[tailHead];
  const form = token?.dictionaryForm || token?.surface;
  if (form !== "ため" && form !== "為") {
    return false;
  }
  const predCursor = new TokenCursor(tokens, relation.quote.contentSpan.start, tailStart);
  while (predCursor.pos < predCursor.end) {
    if (posLooksPredicateEvidence(predCursor.current()?.pos ?? 0)) {
      return true;
    }
    predCursor.advance();
  }
  return false;
}

function onlyContentTokenInSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
): number | null {
  let only: number | null = null;
  const onlyCursor = new TokenCursor(tokens, start, endExclusive);
  while (onlyCursor.pos < onlyCursor.end) {
    const index = onlyCursor.pos;
    onlyCursor.advance();
    if (only !== null) {
      return null;
    }
    only = index;
  }
  return only;
}

function quoteHostHasBareNominalHearsayEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.hostMatch.kind !== "question" ||
    !quoteStructuralRelationLooksBareNominalContent(tokens, relation) ||
    !quoteMarkerBelongsToHostPredicate(tokens, relation)
  ) {
    return false;
  }
  return !quoteHostHasSamePredicateObjectArgument(tokens, relation) &&
    !quoteHostHasCompanionCueBetweenMarkerAndHost(tokens, relation, lookups) &&
    !quoteBareNominalContentFillsHostCompanionSlot(tokens, relation, lookups);
}

function quoteBareNominalContentFillsHostCompanionSlot(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const headIdx = previousNominalHeadBefore(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined || !isProperPersonNameToken(head) || !isHumanReferentToken(head, lookups)) {
    return false;
  }
  return quoteHostHasAdditiveParticipantBetweenMarkerAndHost(tokens, relation, lookups);
}

function quoteHostHasAdditiveParticipantBetweenMarkerAndHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const clause = activeProtoLayout()?.clauseContaining(relation.quote.hostMatch.hostIdx);
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const end = Math.min(hostStart, clause?.end ?? hostStart);
  for (let index = relation.quote.markerIdx + 1; index < end; index += 1) {
    const headIdx = previousNominalHeadBefore(tokens, index, relation.quote.markerIdx + 1);
    const participant = headIdx === null ? undefined : tokens[headIdx];
    if (headIdx === null || participant === undefined || !isAnimateReferentToken(participant, lookups)) {
      continue;
    }
    const bridge = quoteHostSearchBridgeArgumentRelationAt(tokens, index, {
      consumers: ["quote_content"],
      headIdx
    });
    if (bridge?.argumentKind === "subject_topic" && bridge.surface === "も") {
      return true;
    }
  }
  return false;
}

function quoteHostHasBareNominalPassiveEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (!quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups)) {
    return quoteRelationHostHasPassiveAux(tokens, relation);
  }
  if (!quoteStructuralRelationLooksBareNominalContent(tokens, relation)) {
    return false;
  }
  return quoteReportingPassiveMarkerEvidence(tokens, relation, lookups);
}

function quoteReportingPassiveMarkerEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    !quoteRelationHostHasPassiveAux(tokens, relation) ||
    !quoteMarkerBelongsToHostPredicate(tokens, relation) ||
    !quoteMarkerImmediatelyPrecedesHost(tokens, relation)
  ) {
    return false;
  }
  return !quoteHostHasSamePredicateObjectArgument(tokens, relation) &&
    !quoteHostHasCompanionCueBetweenMarkerAndHost(tokens, relation, lookups);
}

function quoteReportingPassiveHostNeedsCompanionDisambiguation(
  host: QuoteHostLike,
  lookups: LookupTables
): boolean {
  return lookups.QUOTE_HOST_REGISTRY.hostHasCapability(host, "companion_disambiguated_passive_quote");
}

function quoteMarkerImmediatelyPrecedesHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const next = nextTransparentEvidenceIndex(tokens, relation.quote.markerIdx + 1, {
    endExclusive: hostStart + 1,
    isTransparentToken: (token) => {
      const pos0 = token.pos & POS0;
      return pos0 === 補助記号 || pos0 === 記号;
    }
  });
  return next?.index === hostStart;
}

function quoteMarkerPreemptedByNearerQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx <= relation.quote.markerIdx || particleIdx >= hostStart) {
      continue;
    }
    if (quoteMarkerRelationAt(tokens, particleIdx, { consumers: ["quote_content"] }) === null) {
      continue;
    }
    if (companionCueFollowsMarker(tokens, particleIdx, hostStart, lookups)) {
      continue;
    }
    return true;
  }
  return false;
}

function companionCueFollowsMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const evidence = nextTransparentEvidenceIndex(tokens, markerIdx + 1, {
    endExclusive,
    isTransparentToken: (token) => {
      const pos0 = token.pos & POS0;
      return pos0 === 補助記号 || pos0 === 記号;
    }
  });
  if (evidence === null) {
    return false;
  }
  return companionCueSpanEndAt(tokens, evidence.index, endExclusive, lookups) !== null;
}

function quoteHostUnreachableFromMarkerClause(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return false;
  }
  const hostClauseIdx = proto.clauseIndexOfToken(relation.quote.hostMatch.hostIdx);
  const hostClause = hostClauseIdx < 0 ? undefined : proto.protoClauses[hostClauseIdx];
  if (hostClause === undefined || hostClause.kind !== "relative") {
    return false;
  }
  if (relation.quote.markerIdx >= hostClause.start && relation.quote.markerIdx < hostClause.end) {
    return false;
  }
  return !quoteMarkerClauseSuppliesHostArgument(tokens, relation);
}

function quoteMarkerClauseSuppliesHostArgument(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.markerIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx === relation.quote.markerIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        consumers: ["quote_content"]
      }) === null
    ) {
      continue;
    }
    const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
      limit: relation.quote.hostMatch.hostIdx + 1
    });
    if (ownerPredicateIdx === relation.quote.hostMatch.hostIdx) {
      return true;
    }
  }
  return false;
}

function quoteMarkerBelongsToHostPredicate(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return false;
  }
  const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, relation.quote.markerIdx, {
    limit: relation.quote.hostMatch.hostIdx + 1
  });
  return ownerPredicateIdx === relation.quote.hostMatch.hostIdx;
}

function quoteHostHasSamePredicateObjectArgument(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx >= relation.quote.hostMatch.hostIdx || particleIdx === relation.quote.markerIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        acceptedSurfaces: ["を"],
        consumers: ["quote_content"]
      }) === null
    ) {
      continue;
    }
    const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
      limit: relation.quote.hostMatch.hostIdx + 1
    });
    if (ownerPredicateIdx === relation.quote.hostMatch.hostIdx) {
      return true;
    }
  }
  return false;
}

function companionCueSpanEndAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables
): number | null {
  return markerBoundRelationalHeadSpanEndAt(
    tokens, idx, endExclusive, lookups, ["bare_nominal_hearsay_companion_cues"]
  );
}

function quoteHostHasCompanionCueBetweenMarkerAndHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const end = Math.min(hostStart, clause?.end ?? hostStart);
  let index = relation.quote.markerIdx + 1;
  while (index < end) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: end,
      isTransparentToken: (token) => {
        const pos0 = token.pos & POS0;
        return pos0 === 補助記号 || pos0 === 記号;
      }
    });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (companionCueSpanEndAt(tokens, index, end, lookups) !== null) {
      return true;
    }
    index += 1;
  }
  return false;
}

function quoteHostHasLabelableObjectArgumentBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx >= relation.quote.markerIdx || particleIdx >= relation.quote.hostMatch.hostIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        acceptedSurfaces: ["を"],
        consumers: ["quote_content"]
      }) !== null
    ) {
      const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
        limit: relation.quote.hostMatch.hostIdx + 1
      });
      if (ownerPredicateIdx !== relation.quote.hostMatch.hostIdx) {
        continue;
      }
      const objectHeadIdx = previousNominalHeadBefore(tokens, particleIdx, clause.start);
      const objectHead = objectHeadIdx === null ? undefined : tokens[objectHeadIdx];
      const objectForm = objectHead?.dictionaryForm || objectHead?.surface;
      return lookups.QUOTE_HOST_REGISTRY.evidenceSetHas("bare_nominal_object_label_object_nouns", objectForm);
    }
  }
  return false;
}

function quoteContentTailStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): number | null {
  let phraseStart = start;
  const tailCursor = new TokenCursor(tokens, start, end);
  while (tailCursor.pos < tailCursor.end) {
    const index = tailCursor.pos;
    const token = tailCursor.current();
    tailCursor.advance();
    if (token === undefined) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(token, index, {
        acceptedSurfaces: ["が", "を", "に", "で", "から", "より", "へ", "と"],
        consumers: ["quote_content"]
      }) !== null ||
      ((token.surface === "は" || token.surface === "も") && (token.pos & POS0) === 助詞)
    ) {
      phraseStart = index + 1;
      continue;
    }
    if (posLooksPredicateEvidence(token.pos)) {
      phraseStart = index + 1;
    }
  }
  return phraseStart < end ? phraseStart : null;
}

function posLooksPredicateEvidence(pos: number): boolean {
  const pos0 = pos & POS0;
  if (pos0in(pos0, PREDICATE_AUX_BITS)) {
    return true;
  }
  return isNaAdjCapableNoun({ pos });
}

function previousNominalHeadBefore(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number,
  lowerBound: number
): number | null {
  const evidence = previousTransparentEvidenceIndex(tokens, beforeIdx, {
    lowerBoundInclusive: lowerBound,
    isTransparentToken: (token) => isNominalSuffixToken(token)
  });
  if (evidence === null) {
    return null;
  }
  const token = tokens[evidence.index];
  if (token !== undefined && (pos0in(token.pos, NOMINAL_BITS))) {
    return evidence.index;
  }
  return null;
}

function isNominalSuffixToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS01) === 接尾辞_名詞的;
}

function quoteHostHasPassiveAuxInRange(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  end: number
): boolean {
  let index = pos;
  while (index < end) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, { endExclusive: end });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS0) === 助動詞) {
      const form = token.dictionaryForm || token.surface;
      if (form === "れる" || form === "られる") {
        return true;
      }
      index += 1;
      continue;
    }
    if (pos0in(token.pos, (1 << 助詞) | PUNCTUATION_BITS)) {
      return false;
    }
    return false;
  }
  return false;
}

export function quoteStructuralRelationAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): QuoteStructuralRelation | undefined {
  return quoteStructuralRelationIndex(cursor, lookups).winnerAtOwnedPosition(cursor.pos);
}

export function whIndefiniteBareNominalQuoteRelationAt(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): QuoteStructuralRelation | null {
  if (!isQuoteContentMarker(markerCursor, lookups)) {
    return null;
  }
  const relation = buildQuoteStructuralRelationUncached(
    markerCursor,
    lookups,
    quoteStructuralRelationIndex(markerCursor, lookups),
    { admitWhIndefiniteBareNominalContent: true }
  );
  return relation !== null && quoteHostAllowsBareNominalContent(markerCursor.tokens, relation, lookups)
    ? relation
    : null;
}

export function quoteStructuralRelationsForHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): readonly QuoteStructuralRelation[] {
  return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners()).filter((relation) => relation.quote.hostMatch.hostIdx === cursor.pos);
}

export function quoteStructuralRelationContainingContentToken(
  cursor: TokenCursor<RuntimeHaruToken>,
  tokenIdx: number,
  lookups: LookupTables,
): QuoteStructuralRelation | undefined {
  return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners()).find((relation) =>
    relation.quote.contentSpan.start <= tokenIdx && tokenIdx < relation.quote.contentSpan.endExclusive
  );
}

export function quoteStructuralRelationStartingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteStructuralRelation | undefined {
  const startIdx = cursor.pos;
  const n = cursor.end;
  const lowerBound = options.lowerBoundInclusive ?? 0;
  if (startIdx < lowerBound || startIdx >= n) {
    return undefined;
  }
  const direct = quoteStructuralRelationAt(cursor, lookups);
  if (
    direct !== undefined &&
    quoteConsumedMarkerSpanFromRelation(cursor.tokens, direct, lookups, { lowerBoundInclusive: lowerBound })?.start === startIdx
  ) {
    return direct;
  }
  const nextIdx = startIdx + 1;
  if (nextIdx >= n) {
    return undefined;
  }
  const next = quoteStructuralRelationAt(cursor.fork(nextIdx), lookups);
  return next !== undefined &&
    quoteConsumedMarkerSpanFromRelation(cursor.tokens, next, lookups, { lowerBoundInclusive: lowerBound })?.start === startIdx
    ? next
    : undefined;
}

export function quoteConsumedMarkerSpanFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  _lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): StructuralRelationTokenSpan | null {
  if (!quoteRelationOwnsMarkerRealization(relation)) {
    return null;
  }
  const lowerBound = options.lowerBoundInclusive ?? 0;
  const markerIdx = relation.quote.markerIdx;
  if (relation.quote.slotKind === "question_content") {
    const questionBoundarySpan = relation.quote.questionBoundarySpan;
    return questionBoundarySpan !== null && questionBoundarySpan.start >= lowerBound
      ? questionBoundarySpan
      : null;
  }
  if (relation.quote.markerSpan.endExclusive > markerIdx + 1) {
    return markerIdx < lowerBound ? null : relation.quote.markerSpan;
  }
  if (relation.quote.slotKind === "quoted_content") {
    const redundantCopulaStart = redundantPredicateQuoteCopulaStart(tokens, markerIdx, { lowerBoundInclusive: lowerBound });
    return tokenSpan(redundantCopulaStart ?? relation.quote.markerSpan.start, relation.quote.markerSpan.endExclusive);
  }
  if (markerIdx < lowerBound) {
    return null;
  }
  return tokenSpan(markerIdx, markerIdx + 1);
}

export function quoteBoundarySurfaceFromRelation(
  _tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  _lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): string | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  if (relation.quote.slotKind === "question_content") {
    const questionBoundarySpan = relation.quote.questionBoundarySpan;
    if (questionBoundarySpan === null || questionBoundarySpan.start < lowerBound) {
      return null;
    }
    return relation.quote.markerBaseSurface === "かどうか" ? "かどうか" : "かと";
  }
  const baseMarkerSurface = baseQuoteMarkerSurface(_tokens, relation);
  if (baseMarkerSurface === null) {
    return null;
  }
  if (relation.quote.slotKind !== "quoted_content") {
    return baseMarkerSurface;
  }
  const redundantCopulaStart = redundantPredicateQuoteCopulaStart(_tokens, relation.quote.markerIdx, { lowerBoundInclusive: lowerBound });
  return _tokens
    .slice(redundantCopulaStart ?? relation.quote.markerSpan.start, relation.quote.markerSpan.endExclusive)
    .map((token) => token.surface)
    .join("");
}

export function quoteBoundaryTokenIndexFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): number | null {
  const span = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, options);
  if (span === null) {
    return null;
  }
  return relation.quote.focusParticle === undefined
    ? span.endExclusive - 1
    : relation.quote.markerIdx;
}

export function quoteConnectiveKindFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteConnectiveKind | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  const markerIdx = relation.quote.markerIdx;
  if (relation.quote.slotKind === "question_content" && relation.quote.markerBaseSurface === "かどうか") {
    return quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, { lowerBoundInclusive: lowerBound }) === null
      ? null
      : "question_content_alternative";
  }
  const baseMarkerSurface = baseQuoteMarkerSurface(tokens, relation);
  if (baseMarkerSurface === null) {
    return null;
  }
  if (relation.quote.slotKind === "question_content") {
    const questionStart = relation.quote.questionBoundarySpan?.start;
    if (questionStart === undefined || questionStart < lowerBound) {
      return null;
    }
    return relation.quote.request === undefined ? "question_quotative" : "request_complement";
  }
  if (relation.quote.slotKind === "wish_content") {
    return "wish_complement";
  }
  if (relation.quote.slotKind === "request_content") {
    return "request_complement";
  }
  if (lookups.QUOTE_HOST_REGISTRY.hostHasCapability(relation.quote.hostMatch, "cognitive_complement")) {
    return "cognitive_complement";
  }
  if (
    relation.quote.request?.tailKind !== null &&
    relation.quote.request?.tailKind !== undefined
  ) {
    return "request_complement";
  }
  return "quotative";
}

export function quoteKoreanClauseFormFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): QuoteBoundaryKoreanClauseForm | null {
  const connectiveKind = quoteConnectiveKindFromRelation(tokens, relation, lookups, options);
  if (connectiveKind === null) {
    return null;
  }
  if (connectiveKind === "request_complement") {
    return requestKoreanClauseForm(relation.quote.request?.tailKind ?? null);
  }
  if (connectiveKind === "wish_complement") {
    return "기를";
  }
  if (connectiveKind === "question_quotative" || connectiveKind === "question_content_alternative") {
    return "는지";
  }
  if (connectiveKind === "cognitive_complement") {
    return "다는 것을";
  }
  if (quoteReportingPassiveIsBeTold(tokens, relation, lookups)) {
    return "다는 말을";
  }
  return "다고";
}

export function quoteReportingPassiveIsBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  return !quoteRelationHostIsAttributive(tokens, relation) &&
    quoteReportingPassiveHostEventIsBeTold(tokens, relation, lookups);
}

export function quoteReportingPassiveHostRealizesBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  committedContentBeTold: boolean | null
): boolean {
  if (quoteRelationHostIsAttributive(tokens, relation)) {
    return quoteReportingPassiveHostEventIsBeTold(tokens, relation, lookups);
  }
  return committedContentBeTold ?? quoteReportingPassiveIsBeTold(tokens, relation, lookups);
}

export function quoteReportingPassiveHostEventIsBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.slotKind !== "quoted_content" ||
    !quoteRelationHostIsIu(relation) ||
    !quoteRelationHostHasPassiveAux(tokens, relation)
  ) {
    return false;
  }
  if (quoteRelationHasAnimateNiAgent(tokens, relation, lookups)) {
    return true;
  }
  if (quoteRelationHostHasNominalizerTail(tokens, relation)) {
    return true;
  }
  if (quoteRelationHostHasTeIruAux(tokens, relation)) {
    return false;
  }
  if (quoteRelationHostHasTeFormConnectiveTail(tokens, relation)) {
    return true;
  }
  if (quoteRelationLooksBareNominalLabel(tokens, relation)) {
    return false;
  }
  return quoteRelationHostHasPastAux(tokens, relation);
}

function quoteRelationHostHasTeFormConnectiveTail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (isTeConnectiveToken(token)) {
      return !teFollowedByStateAspectAux(tokens, index + 1);
    }
    if (TE_SHIMAU_CONTRACTION_FORMS.has(token.dictionaryForm || token.surface)) {
      return teShimauFollowedByConnectiveContinuation(tokens, index + 1);
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function teFollowedByStateAspectAux(
  tokens: readonly RuntimeHaruToken[],
  from: number
): boolean {
  let index = from;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const form = token.dictionaryForm || token.surface;
    return form === "いる" || form === "てる" || form === "おる" || form === "居る";
  }
  return false;
}

function teShimauFollowedByConnectiveContinuation(
  tokens: readonly RuntimeHaruToken[],
  from: number
): boolean {
  let index = from;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((token.pos & POS01) === (助詞 | 接続助詞) || isTeConnectiveToken(token)) {
      return true;
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostHasNominalizerTail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((token.pos & POS01) === 助詞_準体助詞) {
      return true;
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostHasPastAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || pos0 === 助詞 || (token.pos & POS01) === 動詞_非自立可能) {
      if ((token.dictionaryForm || token.surface) === "た") {
        return true;
      }
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostIsAttributive(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return pos0in(pos0, NOMINAL_BITS);
  }
  return false;
}

function quoteRelationHostIsIu(relation: QuoteStructuralRelation): boolean {
  return IU_LEXEME_FORMS.has(relation.quote.hostMatch.hostForm);
}

function quoteRelationHostHasTeIruAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || pos0 === 助詞 || (token.pos & POS01) === 動詞_非自立可能) {
      const form = token.dictionaryForm || token.surface;
      if (form === "いる" || form === "てる" || form === "おる" || form === "居る") {
        return true;
      }
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHasAnimateNiAgent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const hostIdx = relation.quote.hostMatch.hostIdx;
  const clause = proto?.clauseContaining(hostIdx);
  const contentStart = relation.quote.contentSpan.start;
  const markerIdx = relation.quote.markerIdx;
  if (proto !== null && clause !== undefined) {
    for (const particleIdx of clause.particleIndices) {
      if (particleIdx >= hostIdx || (particleIdx >= contentStart && particleIdx <= markerIdx)) {
        continue;
      }
      if (
        caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
          acceptedSurfaces: ["に"],
          consumers: ["quote_content"]
        }) !== null &&
        isAnimateReferentBeforeNi(tokens, particleIdx, lookups)
      ) {
        return true;
      }
    }
    return false;
  }
  for (let index = markerIdx + 1; index < hostIdx; index += 1) {
    if (
      caseParticleMarkerRelationForToken(tokens[index], index, {
        acceptedSurfaces: ["に"],
        consumers: ["quote_content"]
      }) !== null &&
      isAnimateReferentBeforeNi(tokens, index, lookups)
    ) {
      return true;
    }
  }
  return false;
}

export function quoteRelationLooksBareNominalLabel(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (relation.quote.markerSurface === "とかって") {
    return false;
  }
  if (quoteRelationHasCopulaAux(tokens, relation)) {
    return false;
  }
  if (quoteRelationLooksPredicateBoundTame(tokens, relation)) {
    return false;
  }
  const last = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  if (last === null || last < relation.quote.contentSpan.start) {
    return false;
  }
  const pos0 = (tokens[last]?.pos ?? 0) & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

function quoteRelationLooksPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const last = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  const tail = last === null ? undefined : tokens[last];
  const tailForm = tail?.dictionaryForm || tail?.surface;
  if (last === null || (tailForm !== "ため" && tailForm !== "為")) {
    return false;
  }
  for (let index = relation.quote.contentSpan.start; index < last; index += 1) {
    const pos0 = ((tokens[index]?.pos ?? 0) & POS0);
    if (pos0in(pos0, INFLECTABLE_AUX_BITS)) {
      return true;
    }
  }
  return false;
}

function quoteRelationHasCopulaAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  for (let index = relation.quote.contentSpan.start; index < relation.quote.markerIdx; index += 1) {
    const token = tokens[index];
    if (token === undefined || (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ダ)) {
      continue;
    }
    if ((token.pos & POS5A) === 連用形_) {
      continue;
    }
    return true;
  }
  return false;
}

export function quoteRelationContentLooksLabelIsh(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  return quoteRelationLooksBareNominalLabel(tokens, relation) || quoteRelationHasCopulaAux(tokens, relation);
}

function quoteNominalRoleParticleFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): ParticleKey | null {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    !quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) ||
    !quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups) ||
    quoteBareNominalContentHasAdjectivalDistribution(tokens, relation)
  ) {
    return null;
  }
  return "으로/로";
}

export function quoteClauseBoundaryFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  options: { readonly lowerBoundInclusive?: number } = {}
): ClauseBoundary | null {
  const connectiveKind = quoteConnectiveKindFromRelation(tokens, relation, lookups, options);
  const koreanClauseForm = quoteKoreanClauseFormFromRelation(tokens, relation, lookups, options);
  const surface = quoteBoundarySurfaceFromRelation(tokens, relation, lookups, options);
  const tokenIdx = quoteBoundaryTokenIndexFromRelation(tokens, relation, lookups, options);
  const span = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, options);
  const nominalRoleParticle = quoteNominalRoleParticleFromRelation(tokens, relation, lookups);
  const reportingPassiveRoleLabel =
    relation.quote.markerBaseSurface === "と" &&
    quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) &&
    quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups);
  const adjectivalDistributionContent =
    quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) &&
    quoteReportingPassiveMarkerEvidence(tokens, relation, lookups) &&
    quoteContentRightEdgeHasAdjectivalDistribution(tokens, relation);
  if (connectiveKind === null || koreanClauseForm === null || surface === null || tokenIdx === null || span === null) {
    return null;
  }
  return buildQuoteClauseBoundary({
    connectiveKind,
    koreanClauseForm,
    surface,
    tokenIdx,
    tokenSpan: { start: span.start, end: span.endExclusive - 1 },
    requestTailKind: relation.quote.request?.tailKind ?? null,
    ...(relation.quote.focusParticle === undefined ? {} : { focusParticle: relation.quote.focusParticle }),
    ...(nominalRoleParticle === null ? {} : { nominalRoleParticle }),
    reportingPassiveRoleLabel,
    adjectivalDistributionContent
  });
}

export interface QuoteClauseBoundaryBuildInput {
  readonly connectiveKind: QuoteConnectiveKind;
  readonly koreanClauseForm: QuoteBoundaryKoreanClauseForm;
  readonly surface: string;
  readonly tokenIdx: number;
  readonly tokenSpan: { readonly start: number; readonly end: number };
  readonly requestTailKind: RequestQuoteTailKind | null;
  readonly focusParticle?: QuoteBoundaryPayload["focusParticle"];
  readonly nominalRoleParticle?: QuoteBoundaryPayload["nominalRoleParticle"];
  readonly reportingPassiveRoleLabel?: boolean;
  readonly adjectivalDistributionContent?: boolean;
}

export function buildQuoteClauseBoundary(input: QuoteClauseBoundaryBuildInput): ClauseBoundary {
  const quoteBoundary: QuoteBoundaryPayload = {
    koreanClauseForm: input.koreanClauseForm,
    requestTailKind: input.requestTailKind,
    ...(input.focusParticle === undefined ? {} : { focusParticle: input.focusParticle }),
    ...(input.nominalRoleParticle === undefined ? {} : { nominalRoleParticle: input.nominalRoleParticle }),
    ...(input.reportingPassiveRoleLabel === true ? { reportingPassiveRoleLabel: true } : {}),
    ...(input.adjectivalDistributionContent === true ? { adjectivalDistributionContent: true } : {})
  };
  return {
    kind: "接続助詞",
    connectiveKind: input.connectiveKind,
    surface: input.surface,
    tokenIdx: input.tokenIdx,
    tokenSpan: input.tokenSpan,
    quoteBoundary
  };
}

export function buildQuoteConnectiveOpFromBoundary(
  source: import("../head-tail/tail/predicate-root/grammar.js").OpSource,
  boundary: ClauseBoundary,
  connectiveOverride?: QuoteConnectiveKind
): import("../head-tail/tail/predicate-root/grammar.js").ConnectiveOp {
  if (boundary.kind === "terminal") {
    throw new Error("terminal boundary cannot materialize a quote connective op");
  }
  return createConnectiveOp({
    connective: connectiveOverride ?? boundary.connectiveKind,
    surface: boundary.surface,
    source,
    ...(boundary.quoteBoundary === undefined ? {} : { quoteBoundary: boundary.quoteBoundary })
  });
}

function classifyQuoteRequestTailKind(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  if (relation.quote.explicitQuotation === true) {
    return null;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  const passive = quoteRelationHostHasPassiveAux(tokens, relation);
  if (relation.quote.slotKind === "question_content") {
    return registry.hostHasCapability(host, "question_request")
      ? passive ? "question_passive" : "question"
      : null;
  }
  if (registry.hostHasCapability(host, "strong_request_quote")) {
    return "tanomu";
  }
  if (registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (
    relation.quote.slotKind !== "request_content" &&
    registry.hostHasCapability(host, "request_quote")
  ) {
    return passive ? "iu_passive" : "iu";
  }
  if (registry.hostHasCapability(host, "passive_request")) {
    if (passive) {
      return IU_LEXEME_FORMS.has(hostForm) ? "iu_passive" : "question_passive";
    }
    return IU_LEXEME_FORMS.has(hostForm) ? "iu" : null;
  }
  return null;
}

export function quoteStructuralRelationHostIsAttributiveIu(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const hostMatch = relation.quote.hostMatch;
  if (!IU_LEXEME_FORMS.has(hostMatch.hostForm)) {
    return false;
  }
  const pos = tokens[hostMatch.hostIdx]?.pos ?? 0;
  return (pos & POS5A) === 連体形_;
}

export function quoteHostHandoffKindAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  const relation = quoteStructuralRelationAt(cursor, lookups);
  return relation === undefined ? null : quoteHostHandoffKindFromRelation(cursor.tokens, relation, cursor.end, lookups);
}

export function quoteHostHandoffKindForHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  for (const relation of quoteStructuralRelationsForHost(cursor, lookups)) {
    const kind = quoteHostHandoffKindFromRelation(cursor.tokens, relation, cursor.end, lookups);
    if (kind !== null) {
      return kind;
    }
  }
  return null;
}

export function quoteHostHandoffKindFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  end: number,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  if (relation.quote.request?.tailKind !== undefined && relation.quote.request.tailKind !== null) {
    return relation.quote.request.tailKind;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  const passive = quoteRelationHostHasPassiveAux(tokens, relation, end);
  if (relation.quote.slotKind === "question_content" && registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (relation.quote.slotKind !== "quoted_content") {
    return null;
  }
  if (registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (!registry.hostHasCapability(host, "passive_request")) {
    return null;
  }
  if (passive) {
    return IU_LEXEME_FORMS.has(hostForm) ? "iu_passive" : "question_passive";
  }
  return IU_LEXEME_FORMS.has(hostForm) ? "iu" : null;
}

function baseQuoteMarkerSurface(
  _tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): string | null {
  return relation.quote.markerBaseSurface;
}

export function redundantPredicateQuoteCopulaStart(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  options: { readonly lowerBoundInclusive?: number } = {}
): number | null {
  const lowerBound = options.lowerBoundInclusive ?? 0;
  const marker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (marker?.canonicalSurface !== "と") {
    return null;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, markerIdx, lowerBound);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  if (
    copulaIdx === null || copula === undefined || copula.surface !== "だ" || (copula.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 終止形_)
  ) {
    return null;
  }
  const beforeCopulaIdx = previousNonSpaceIndex(tokens, copulaIdx, lowerBound);
  const beforeCopula = beforeCopulaIdx === null ? undefined : tokens[beforeCopulaIdx];
  return tokenCanStandBeforeRedundantQuoteCopula(beforeCopula) ? copulaIdx : null;
}

function tokenCanStandBeforeRedundantQuoteCopula(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  const pos5A = token.pos & POS5A;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  return pos5A === 終止形_ || pos5A === 連体形_;
}

function requestQuestionSourceEvidence(
  tokens: readonly RuntimeHaruToken[],
  questionMarkerIdx: number,
  lookups: LookupTables
): QuoteRequestSourceEvidence | null {
  if (hasReasonInterrogativeBeforeQuestionMarker(tokens, questionMarkerIdx)) {
    return null;
  }
  const prev = previousNonSpaceIndex(tokens, questionMarkerIdx, 0);
  const prevTok = prev !== null ? tokens[prev] : undefined;
  if (prevTok === undefined) return null;
  const prevForm = prevTok.dictionaryForm || prevTok.surface;
  const polite = prevTok.surface.endsWith("ん") && isNegativeAuxiliaryPos(prevTok.pos);
  const plain = (prevForm === "ない" || prevForm === "無い") && isNegativeAuxiliaryPos(prevTok.pos);
  if (!polite && !plain) {
    return null;
  }
  const hostIdx = requestQuestionAuxHostBeforePoliteNegative(tokens, (prev ?? 0) - 1, lookups);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined || hostIdx === null || !requestQuestionHasBenefactiveBridge(tokens, hostIdx, lookups)) {
    return null;
  }
  return {
    kind: "benefactive_request",
    politenessEvidence: requestAuxPolitenessEvidence(host, polite),
  };
}

function requestQuestionHasBenefactiveBridge(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  lookups: LookupTables,
): boolean {
  const direct = previousNonSpaceIndex(tokens, hostIdx, 0);
  if (direct !== null && teDeBridgeRelationTargets(tokens, direct, hostIdx, ["benefactive", "request"], lookups)) return true;
  const proto = activeProtoLayout();
  const clauseIdx = proto?.clauseIndexOfToken(hostIdx) ?? -1;
  const current = proto?.protoClauses[clauseIdx];
  const previous = proto?.protoClauses[clauseIdx - 1];
  if (current?.start !== hostIdx || previous?.end !== current.start) return false;
  const repeated = previousClauseNonPunctuationIndex(tokens, previous.end - 1, previous.start);
  const repeatedBridge = repeated === null ? null : previousNonSpaceIndex(tokens, repeated, previous.start);
  return repeated !== null && repeatedBridge !== null &&
    tokensShareLemma(tokens[repeated], tokens[hostIdx]) &&
    teDeBridgeRelationTargets(tokens, repeatedBridge, repeated, ["benefactive", "request"], lookups);
}

function requestQuestionAuxHostBeforePoliteNegative(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  for (let idx = previousNonSpaceIndex(tokens, startIdx + 1, 0); idx !== null; idx = previousNonSpaceIndex(tokens, idx, 0)) {
    const tok = tokens[idx];
    if (tok === undefined) return null;
    const form = tok.dictionaryForm || tok.surface;
    if (
      isAuxiliaryToken(tok) ||
      (isNonIndependentVerbToken(tok) && (form === "ます" || form === "ござる"))
    ) {
      continue;
    }
    return isVerbPredicateToken(tok) && lookups.QUOTE_HOST_REGISTRY.auxHostHasCapability(form, "request_question_aux")
      ? idx
      : null;
  }
  return null;
}

function requestKoreanClauseForm(requestTailKind: RequestQuoteTailKind | null): "달라고" | "달라는 말을" {
  return requestTailKind === "iu_passive"
    ? "달라는 말을"
    : "달라고";
}

function hasReasonInterrogativeBeforeQuestionMarker(
  tokens: readonly RuntimeHaruToken[],
  questionMarkerIdx: number
): boolean {
  const clauseStart = activeProtoLayout()?.clauseOfToken(questionMarkerIdx)?.start ?? 0;
  let idx = questionMarkerIdx - 1;
  while (idx >= clauseStart) {
    const tok = tokens[idx];
    if (tok === undefined) return false;
    const surface = tok.surface;
    if (
      weakPunctuationRelation(tok, idx, ["quote_content"]) !== null ||
      hardTerminalPunctuationRelation(tok, idx, ["quote_content"]) !== null
    ) {
      return false;
    }
    const form = tok.dictionaryForm || surface;
    if (surface === "なぜ" || surface === "何故" || surface === "どうして" || surface === "なんで" || form === "なぜ" || form === "何故") {
      return true;
    }
    if (caseParticleMarkerRelationForToken(tok, idx, {
      acceptedSurfaces: ["で"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞", "副助詞"],
      consumers: ["quote_content"]
    }) !== null) {
      const prev = previousNonSpaceIndex(tokens, idx, 0);
      const prevTok = prev !== null ? tokens[prev] : undefined;
      const prevForm = prevTok?.dictionaryForm || prevTok?.surface;
      if (prevForm === "何") {
        return true;
      }
    }
    idx -= 1;
  }
  return false;
}

export function quoteStructuralRelationIndex(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: Pick<QuoteStructuralRelationIndexOptions, "allowBuildProtoForTariAdverbialEvidence"> = {}
): QuoteStructuralRelationIndex {
  const tokens = cursor.tokens;
  const end = cursor.end;
  if (tokens.length === 0) {
    return new MutableQuoteStructuralRelationIndex();
  }
  const variant: QuoteRelationIndexVariant = options.allowBuildProtoForTariAdverbialEvidence === false
    ? "boundary_formation"
    : "canonical";
  const proto = activeProtoLayout();
  const cached = cachedQuoteRelationsFor(tokens, proto, end, variant);
  if (cached !== undefined) {
    return cached;
  }

  const relations = new MutableQuoteStructuralRelationIndex();
  const producerMarkerIndices = new Map<number, number>();
  const outerCursor = cursor.fork(0, Math.min(tokens.length, end));
  while (outerCursor.pos < outerCursor.end) {
    const markerIdx = outerCursor.pos;
    const markerCursor = cursor.fork(markerIdx, end);
    const relation = relations.producedWinnerAt(markerIdx) !== undefined
      ? null
      : isQuoteContentMarker(markerCursor, lookups)
        ? buildQuoteStructuralRelationUncached(markerCursor, lookups, relations, options)
        : buildQuestionAlternativeContentRelationUncached(markerCursor, lookups, relations);
    if (relation !== null) {
      const winner = arbitrateQuoteRelationAtProduction(
        tokens,
        lookups,
        markerIdx,
        relation,
        relations,
        producerMarkerIndices,
      );
      if (winner !== null) {
        const canonicalMarkerIdx = winner.quote.markerIdx;
        relations.setCanonicalWinner(canonicalMarkerIdx, winner);
        producerMarkerIndices.set(canonicalMarkerIdx, markerIdx);
        relations.bindOwnedPosition(markerIdx, canonicalMarkerIdx);
        relations.bindOwnedSpan(winner.quote.markerSpan, canonicalMarkerIdx);
        if (winner.quote.questionBoundarySpan !== null) {
          relations.bindOwnedSpan(winner.quote.questionBoundarySpan, canonicalMarkerIdx);
        }
      }
    }
    outerCursor.advance();
  }
  cacheQuoteRelationsFor(tokens, proto, end, relations, variant);
  return relations;
}

function arbitrateQuoteRelationAtProduction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  producerMarkerIdx: number,
  relation: QuoteStructuralRelation,
  priorRelations: MutableQuoteStructuralRelationIndex,
  producerMarkerIndices: Map<number, number>,
): QuoteStructuralRelation | null {
  let winner = relation;
  const listingRun = producerMarkerIdx === relation.quote.markerIdx
    ? null
    : tokaNominalListingRunEvidenceForMarker(tokens, producerMarkerIdx, lookups);
  if (listingRun !== null) {
    for (const [priorMarkerIdx, prior] of priorRelations.canonicalEntries()) {
      if (
        prior.quote.hostMatch.hostIdx === winner.quote.hostMatch.hostIdx &&
        prior.quote.slotKind === winner.quote.slotKind &&
        listingRun.markerSpans.some((span) => quoteMarkerSpansOverlap(span, prior.quote.markerSpan))
      ) {
        priorRelations.deleteCanonicalWinner(priorMarkerIdx);
        priorRelations.rebindOwnedPositions(priorMarkerIdx, winner.quote.markerIdx);
        producerMarkerIndices.delete(priorMarkerIdx);
      }
    }
  }
  for (const [priorMarkerIdx, prior] of priorRelations.canonicalEntries()) {
    const priorProducerMarkerIdx = producerMarkerIndices.get(priorMarkerIdx) ?? priorMarkerIdx;
    if (prior.quote.hostMatch.hostIdx !== winner.quote.hostMatch.hostIdx) {
      continue;
    }
    if (
      priorProducerMarkerIdx !== prior.quote.markerIdx &&
      prior.quote.markerSpan.start === winner.quote.markerSpan.start &&
      prior.quote.markerSpan.endExclusive === winner.quote.markerSpan.endExclusive
    ) {
      return null;
    }
    if (
      winner.quote.slotKind !== "question_content" ||
      winner.quote.questionBoundarySpan !== null ||
      prior.quote.questionBoundarySpan === null ||
      producerMarkerIdx <= priorProducerMarkerIdx ||
      tokaNominalListingRunEvidenceForMarker(tokens, priorProducerMarkerIdx, lookups) === null
    ) {
      continue;
    }
    priorRelations.deleteCanonicalWinner(priorMarkerIdx);
    priorRelations.rebindOwnedPositions(priorMarkerIdx, winner.quote.markerIdx);
    producerMarkerIndices.delete(priorMarkerIdx);
    winner = {
      ...winner,
      quote: {
        ...winner.quote,
        questionBoundarySpan: prior.quote.questionBoundarySpan,
      },
    };
  }
  return winner;
}

function quoteMarkerSpansOverlap(
  left: StructuralRelationTokenSpan,
  right: StructuralRelationTokenSpan,
): boolean {
  return left.start < right.endExclusive && right.start < left.endExclusive;
}

export function collectQuoteStructuralRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  return Array.from(quoteStructuralRelationIndex(options.cursor, options.lookups).winners());
}

function yieldsToNominalChoiceCoordination(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  hostNominalIdx: number,
  matrixPredicateIdx: number
): boolean {
  if (
    !singleMarkerNominalChoiceKaAt(
      options.tokens,
      markerIdx,
      options.lookups,
      options.contentMap.get(hostNominalIdx)?.koreanPos ?? null
    )
  ) {
    return false;
  }
  const rightIdx = nextNonSpaceIndex(options.tokens, markerIdx + 1);
  if (rightIdx === null) {
    return false;
  }
  const [phrase] = enumerateClausePhrasesAfter(options.layout, options.tokens, markerIdx, {
    scope: "clause"
  });
  if (
    phrase === undefined ||
    phrase.kind !== "nominal" ||
    phrase.span.start !== rightIdx ||
    phrase.span.endExclusive > matrixPredicateIdx
  ) {
    return false;
  }
  const closerIdx = nominalPhraseCaseCloserIdx(options, phrase, rightIdx);
  if (closerIdx === null) {
    return false;
  }
  const roles = options.layout.clauseOfPredicate(matrixPredicateIdx)
    ?.argumentRolesOf(matrixPredicateIdx) ?? [];
  const sharesMatrixArgumentSlot = roles.some(({ particleIdx }) => particleIdx === closerIdx);
  const subjectParticleIndices = new Set(
    roles.filter(({ role }) => role === "subject_topic").map(({ particleIdx }) => particleIdx)
  );
  return !(
    sharesMatrixArgumentSlot &&
    clauseMaterialPrecedesChoiceItem(options, markerIdx, subjectParticleIndices)
  );
}

function nominalPhraseCaseCloserIdx(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
  },
  phrase: { readonly span: { readonly start: number; readonly endExclusive: number } },
  rightIdx: number
): number | null {
  const rightContent = options.contentMap.get(rightIdx);
  const contentEnd = rightContent === undefined
    ? rightIdx + 1
    : rightContent.start + rightContent.consumed;
  for (let idx = Math.max(contentEnd, phrase.span.start); idx < phrase.span.endExclusive; idx += 1) {
    const pos = options.tokens[idx]?.pos ?? 0;
    if ((pos & POS01) === (助詞 | 格助詞) || (pos & POS01) === 助詞_係助詞) {
      return idx;
    }
  }
  return null;
}

function clauseMaterialPrecedesChoiceItem(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  subjectParticleIndices: ReadonlySet<number>
): boolean {
  let isChoiceItem = true;
  for (const item of enumerateClausePhrasesBefore(options.layout, options.tokens, markerIdx, {
    scope: "clause"
  })) {
    if (phraseCarriesInterrogativeForm(options, item)) {
      return true;
    }
    if (
      !isChoiceItem &&
      item.markerParticleIdx !== null &&
      subjectParticleIndices.has(item.markerParticleIdx)
    ) {
      return true;
    }
    isChoiceItem = false;
  }
  return false;
}

function phraseCarriesInterrogativeForm(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly lookups: LookupTables;
  },
  phrase: { readonly span: { readonly start: number; readonly endExclusive: number } }
): boolean {
  for (let idx = phrase.span.start; idx < phrase.span.endExclusive; idx += 1) {
    const token = options.tokens[idx];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface || "";
    if (
      options.lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_PRENOMINAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
      options.lookups.INTERROGATIVE_NOMINAL_FORMS.has(form)
    ) {
      return true;
    }
  }
  return false;
}

export function collectBareKaQuestionContentRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  const relations: QuoteStructuralRelation[] = [];
  for (let markerIdx = 0; markerIdx < options.tokens.length; markerIdx += 1) {
    const ownership = kaOwnershipKindAt(options.tokens, markerIdx, options.lookups);
    const whIndefiniteKind = ownership === "wh_indefinite"
      ? whIndefiniteKaKindAt(options.tokens, markerIdx, options.lookups)
      : null;
    if (
      kaMarkerRelationAt(options.tokens, markerIdx, ["quote_content"]) === null ||
      (ownership !== "question" &&
        !(ownership === "wh_indefinite" &&
          (whIndefiniteKind === "pronominal" || whIndefiniteKind === "counter_quantity"))) ||
      terminalQuestionKaRelationAt(options.tokens, markerIdx, {
        lookups: options.lookups,
        anaphoricConjectureSelfQuestion:
          activeProtoLayout()?.anaphoricConjectureSelfQuestionAt(markerIdx) !== undefined,
      }) !== null ||
      isTokaListingKaMarker(options.tokens, markerIdx) ||
      copulaClosedTokaKaRelationAt(options.tokens, markerIdx) !== null ||
      explanatoryCopulaClosedTokaKaRelationAt(options.tokens, markerIdx) !== null
    ) {
      continue;
    }
    const marker = bareKaQuestionContentMarkerAt(options.tokens, markerIdx);
    if (marker === null) {
      continue;
    }
    const markerClause = options.layout.clauseOfToken(markerIdx);
    const previousNonSpaceIdx = previousNonSpaceIndex(options.tokens, markerIdx);
    const zeroCopulaNominalAnchorIdx = ownership === "question" &&
      previousNonSpaceIdx !== null &&
      pos0in(options.tokens[previousNonSpaceIdx]?.pos ?? 0, NOMINAL_BITS) &&
      !kaChoiceAlternativeCounterpartAfter(options.layout, options.tokens, markerIdx, options.lookups)
      ? previousNonSpaceIdx
      : null;
    const nominalAnchorIdx = ownership === "wh_indefinite"
      ? previousNonSpaceIdx
      : zeroCopulaNominalAnchorIdx;
    const interrogativeHeadIdx = previousNonSpaceIdx !== null &&
      !marker.nominalized &&
      tokenIsInterrogativeLexeme(options.tokens[previousNonSpaceIdx]!, options.lookups) &&
      isPredicateHeadTailChainRenderPlan(options.contentMap.get(previousNonSpaceIdx)?.renderPlan)
      ? previousNonSpaceIdx
      : undefined;
    const clausePredicateAnchorIdx = [...new Set([
      ...(markerClause?.predicates ?? []),
      ...interrogativeCopulaPredicateCandidates(options, markerClause?.start ?? 0, marker.markerSpan.start),
    ])]
      .filter((predicateIdx) => predicateIdx < marker.markerSpan.start && options.contentMap.has(predicateIdx))
      .sort((left, right) => left - right)
      .at(-1);
    const contentPredicateIdx = interrogativeHeadIdx ?? clausePredicateAnchorIdx ??
      (nominalAnchorIdx !== null && options.contentMap.has(nominalAnchorIdx)
        ? nominalAnchorIdx
        : undefined);
    if (contentPredicateIdx === undefined) {
      continue;
    }
    const zeroCopulaNominalAnchored = clausePredicateAnchorIdx === undefined &&
      zeroCopulaNominalAnchorIdx !== null &&
      contentPredicateIdx === zeroCopulaNominalAnchorIdx;
    const hostMatch = bareKaQuestionContentHostAfter(options, markerIdx, marker.markerSpan.endExclusive);
    if (hostMatch === null) {
      continue;
    }
    if (
      zeroCopulaNominalAnchored &&
      zeroCopulaNominalAnchorIdx !== null &&
      yieldsToNominalChoiceCoordination(options, markerIdx, zeroCopulaNominalAnchorIdx, hostMatch.hostIdx)
    ) {
      continue;
    }
    if (
      ownership === "wh_indefinite" &&
      nominalAnchorIdx !== null &&
      whIndefiniteKaIsNominalPhraseInternal(options, markerIdx, nominalAnchorIdx)
    ) {
      continue;
    }
    if (
      ownership === "wh_indefinite" &&
      !whIndefiniteQuestionContentLicensedByLayout(options, markerIdx, hostMatch.hostIdx)
    ) {
      continue;
    }
    const explicitQuoteSpan = options.layout.enclosingQuoteSpan(markerIdx);
    if (
      explicitQuoteSpan !== undefined &&
      !(explicitQuoteSpan[0] <= hostMatch.hostIdx && hostMatch.hostIdx < explicitQuoteSpan[1])
    ) {
      continue;
    }
    const contentClause = options.layout.clauseOfPredicate(contentPredicateIdx);
    const contentClauseIndex = options.layout.clauseIndexOfPredicate(contentPredicateIdx);
    const hostClauseIndex = options.layout.clauseIndexOfPredicate(hostMatch.hostIdx);
    const contentStart = contentClause?.start ?? options.contentMap.get(contentPredicateIdx)?.start ?? contentPredicateIdx;
    if (
      zeroCopulaNominalAnchored &&
      markerClause !== undefined &&
      !(markerClause.start <= hostMatch.hostIdx && hostMatch.hostIdx < markerClause.end) &&
      !zeroCopulaNominalComplementExhaustsClause(options, markerClause, marker.markerSpan.endExclusive, contentStart)
    ) {
      continue;
    }
    const relation = makeQuoteStructuralRelation({
      tokens: options.tokens,
      lookups: options.lookups,
      slotKind: "question_content",
      marker: {
        markerIdx,
        markerSurface: marker.markerSurface,
        markerSpan: marker.markerSpan,
        markerBaseSurface: marker.markerSurface,
      },
      hostMatch,
      contentTokenStart: contentStart,
      contentTokenEnd: marker.markerSpan.start,
      bridgeKind: null,
      requestSource: null,
    });
    relations.push({
      ...relation,
      source: {
        kind: "span",
        span: relation.quote.contentSpan,
        clauseId: contentClauseIndex === undefined ? null : `clause:${contentClauseIndex}`,
      },
      target: {
        kind: "predicate",
        predicateIdx: hostMatch.hostIdx,
        span: {
          start: hostMatch.supportIdx ?? hostMatch.hostIdx,
          endExclusive: hostMatch.hostIdx + 1,
        },
        clauseId: hostClauseIndex === undefined ? null : `clause:${hostClauseIndex}`,
      },
      renderEnabledByDefault: true,
      quote: {
        ...relation.quote,
        contentPredicateIdx,
        ...(interrogativeHeadIdx !== undefined
          ? { contentPredicateAnchorKind: "interrogative_head" as const }
          : zeroCopulaNominalAnchored ? { contentPredicateAnchorKind: "zero_copula_nominal" as const } : {}),
        questionBoundaryKind: marker.nominalized ? "nominalized_no_ka" : "bare_ka",
      },
    });
  }
  return relations;
}

function zeroCopulaNominalComplementExhaustsClause(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  markerClause: { readonly start: number; readonly end: number },
  markerEndExclusive: number,
  contentStart: number,
): boolean {
  const traversal = utteranceClosureRunAfter(options.layout, options.tokens, markerEndExclusive);
  if (traversal.endIdx < markerClause.end) {
    return false;
  }
  return !clauseCarriesClosedUtteranceBefore(options, markerClause.start, contentStart);
}

function clauseCarriesClosedUtteranceBefore(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly lookups: LookupTables;
  },
  start: number,
  endExclusive: number,
): boolean {
  for (let idx = start; idx < endExclusive; idx += 1) {
    const closureRun = options.layout.utteranceClosureRunAt(idx);
    if (closureRun !== undefined && closureRun.run !== "formal_noun_dependent") {
      return true;
    }
    if (speakerAcknowledgmentKaHostRelationAt(options.tokens, idx, options.lookups) !== null) {
      return true;
    }
    if (
      terminalQuestionKaRelationAt(options.tokens, idx, {
        lookups: options.lookups,
        anaphoricConjectureSelfQuestion: activeProtoLayout()?.anaphoricConjectureSelfQuestionAt(idx) !== undefined,
      }) !== null
    ) {
      return true;
    }
  }
  return false;
}

export function copulaClosedContentAnchorIdx(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  contentMap: ContentMap,
  nounIdx: number,
  copulaIdx: number,
): number | null {
  if (contentMap.has(nounIdx)) {
    return nounIdx;
  }
  for (const [key, span] of contentMap) {
    if (span.start <= nounIdx && nounIdx < span.start + span.consumed) {
      return key;
    }
  }
  for (const item of enumerateClausePhrasesBefore(layout, tokens, copulaIdx, { scope: "clause" })) {
    if (item.kind !== "nominal") {
      break;
    }
    if (item.span.start <= nounIdx && nounIdx < item.span.endExclusive) {
      return [...contentMap.keys()]
        .filter((key) => key >= item.span.start && key <= nounIdx)
        .sort((left, right) => left - right)
        .at(-1) ?? null;
    }
    break;
  }
  return null;
}

export function collectCopulaClosedTokaQuoteRelations(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly layout: ClauseLayout;
  readonly contentMap: ContentMap;
  readonly lookups: LookupTables;
}): readonly QuoteStructuralRelation[] {
  const relations: QuoteStructuralRelation[] = [];
  for (let kaIdx = 0; kaIdx < options.tokens.length; kaIdx += 1) {
    const closure = copulaClosedTokaKaRelationAt(options.tokens, kaIdx);
    const contentAnchorIdx = closure === null
      ? null
      : copulaClosedContentAnchorIdx(
        options.layout,
        options.tokens,
        options.contentMap,
        closure.nounIdx,
        closure.copulaIdx,
      );
    if (closure === null || contentAnchorIdx === null) {
      continue;
    }
    if (tokaTteCompositeQuoteCandidateAt(options.tokens, closure.markerIdx, {
      consumers: ["quote_content"],
    }) !== null) {
      continue;
    }
    const searchEnd = copulaClosedTokaHostSearchEnd(options.layout, options.tokens, kaIdx);
    if (searchEnd === null) {
      continue;
    }
    const markerCursor = new TokenCursor(options.tokens, closure.markerIdx, options.tokens.length, closure.markerIdx);
    const hostMatch = quoteHostMatchAfterMarker(markerCursor, options.lookups, {
      searchEnd,
      markerSpanEndExclusive: kaIdx + 1,
    });
    if (
      hostMatch === null ||
      quoteHostMatchBlockedByNegativeCondition(markerCursor, hostMatch, options.lookups) ||
      quoteHostMatchIsAttributiveIu(options.tokens, hostMatch)
    ) {
      continue;
    }
    const explicitQuoteSpan = options.layout.enclosingQuoteSpan(closure.markerIdx);
    if (
      explicitQuoteSpan !== undefined &&
      !(explicitQuoteSpan[0] <= hostMatch.hostIdx && hostMatch.hostIdx < explicitQuoteSpan[1])
    ) {
      continue;
    }
    const contentClause = options.layout.clauseOfToken(contentAnchorIdx);
    const contentClauseIndex = options.layout.clauseIndexOfToken(contentAnchorIdx);
    const hostClauseIndex = options.layout.clauseIndexOfPredicate(hostMatch.hostIdx);
    const relation = makeQuoteStructuralRelation({
      tokens: options.tokens,
      lookups: options.lookups,
      slotKind: "quoted_content",
      marker: {
        markerIdx: closure.markerIdx,
        markerSurface: options.tokens
          .slice(closure.markerIdx, kaIdx + 1)
          .map((token) => token.surface)
          .join(""),
        markerSpan: { start: closure.markerIdx, endExclusive: kaIdx + 1 },
        markerBaseSurface: options.tokens[closure.markerIdx]?.surface ?? "と",
      },
      hostMatch,
      contentTokenStart: contentClause?.start ?? contentAnchorIdx,
      contentTokenEnd: closure.markerIdx,
      bridgeKind: null,
      requestSource: null,
    });
    relations.push({
      ...relation,
      source: {
        kind: "span",
        span: relation.quote.contentSpan,
        clauseId: contentClauseIndex === undefined ? null : `clause:${contentClauseIndex}`,
      },
      target: {
        kind: "predicate",
        predicateIdx: hostMatch.hostIdx,
        span: {
          start: hostMatch.supportIdx ?? hostMatch.hostIdx,
          endExclusive: hostMatch.hostIdx + 1,
        },
        clauseId: hostClauseIndex === undefined ? null : `clause:${hostClauseIndex}`,
      },
      renderEnabledByDefault: true,
      quote: {
        ...relation.quote,
        contentPredicateIdx: contentAnchorIdx,
        markerAbsorbedContentCopulaIdx: closure.copulaIdx,
      },
    });
  }
  return relations;
}

function closedPropositionTokaAtMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables,
): { readonly kaIdx: number; readonly questionEvidence: QuestionClosedTokaKaRelation["evidence"] | null } | null {
  if (tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, { consumers: ["quote_content"] }) !== null) {
    return null;
  }
  const kaIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  if (kaIdx === null) {
    return null;
  }
  const closure = explanatoryCopulaClosedTokaKaRelationAt(tokens, kaIdx) ??
    closedPropositionTokaKaRelationAt(tokens, kaIdx);
  if (closure !== null) {
    return closure.markerIdx === markerIdx ? { kaIdx, questionEvidence: null } : null;
  }
  const questionClosed = questionClosedTokaKaRelationAt(tokens, kaIdx, lookups);
  return questionClosed?.markerIdx === markerIdx ? { kaIdx, questionEvidence: questionClosed.evidence } : null;
}

function questionClosedTokaQuotePayload(
  evidence: QuestionClosedTokaKaRelation["evidence"] | null | undefined,
): Pick<StructuralQuotePayload, "markerRealization" | "contentForce"> {
  if (evidence === "question_ka") {
    return { markerRealization: "exemplification" };
  }
  return evidence === undefined || evidence === null ? {} : { contentForce: "question" };
}

function closedPropositionTokaQuoteHostMatch(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  kaIdx: number,
): QuoteHostMatch | null {
  const proto = activeProtoLayout();
  const searchEnd = proto === null
    ? undefined
    : copulaClosedTokaHostSearchEnd(proto, markerCursor.tokens, kaIdx);
  if (searchEnd === null) {
    return null;
  }
  return quoteHostMatchAfterMarker(markerCursor, lookups, {
    ...(searchEnd === undefined ? {} : { searchEnd }),
    markerSpanEndExclusive: kaIdx + 1,
  });
}

function copulaClosedTokaHostSearchEnd(
  layout: PhraseEnumerationLayout,
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
): number | null {
  for (const item of enumerateClausePhrasesAfter(layout, tokens, kaIdx, { scope: "sentence" })) {
    if (item.kind === "punctuation_weak" || item.kind === "other") {
      continue;
    }
    const hostClause = layout.clauseOfToken(item.span.start);
    return hostClause === undefined ? null : hostClause.end;
  }
  return null;
}

function whIndefiniteKaIsNominalPhraseInternal(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  whHostIdx: number,
): boolean {
  if (kaOpensGenitiveNominalPhrase(options.layout, options.tokens, markerIdx, options.lookups)) {
    return true;
  }
  const plan = options.contentMap.get(whHostIdx)?.renderPlan;
  return isNominalHeadTailChainRenderPlan(plan ?? null) &&
    (plan as NominalHeadTailChainPlan).realization.frame.source.end > markerIdx + 1;
}

function whIndefiniteQuestionContentLicensedByLayout(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
  },
  markerIdx: number,
  hostIdx: number,
): boolean {
  const clause = options.layout.clauseOfPredicate(hostIdx);
  return clause !== undefined && clause.particleIndices.some((particleIdx) => {
    if (
      particleIdx >= markerIdx ||
      options.layout.ownerPredicateOfParticle(particleIdx) !== hostIdx
    ) {
      return false;
    }
    return quoteHostSearchBridgeArgumentRelationAt(options.tokens, particleIdx, {
      consumers: ["quote_content"],
    })?.argumentKind === "subject_topic";
  });
}

function bareKaQuestionContentMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): {
  readonly markerSpan: StructuralRelationTokenSpan;
  readonly markerSurface: string;
  readonly nominalized: boolean;
} | null {
  const continuationIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  if (
    continuationIdx !== null &&
    quoteMarkerRelationAt(tokens, continuationIdx, { consumers: ["quote_content"] }) !== null
  ) {
    return null;
  }
  const previousIdx = previousNonSpaceIndex(tokens, markerIdx);
  const nominalized = previousIdx === null
    ? null
    : nominalizerQuestionContentConnectiveRelationAt(tokens, previousIdx, {
      allowTerminalKa: true,
      consumers: ["quote_content"],
    });
  const markerSpan = nominalized?.span ?? tokenSpan(markerIdx, markerIdx + 1);
  return {
    markerSpan,
    markerSurface: tokens.slice(markerSpan.start, markerSpan.endExclusive).map((token) => token.surface).join(""),
    nominalized: nominalized !== null,
  };
}

function bareKaQuestionContentHostAfter(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  markerIdx: number,
  afterExclusive: number,
): QuoteHostMatch | null {
  const sentenceEnd = bareKaQuestionContentSentenceEnd(options, afterExclusive);
  const predicates = [...new Set([
    ...options.layout.clauses.flatMap((clause) => clause.predicates),
    ...[...options.contentMap.entries()].flatMap(([predicateIdx, span]) =>
      isPredicateHeadTailChainRenderPlan(span.renderPlan) &&
        options.layout.predicateOfAdverbialAdjunct(predicateIdx) === undefined
        ? [predicateIdx]
        : []
    ),
  ])]
    .filter((predicateIdx) => predicateIdx >= afterExclusive && predicateIdx < sentenceEnd)
    .sort((left, right) => left - right);
  for (const predicateIdx of predicates) {
    const hostMatch = bareKaQuestionContentHostMatchAt(options, predicateIdx);
    if (hostMatch !== null) {
      if (
        clauseContainsInterrogativeBefore(
          options.tokens,
          predicateIdx,
          options.lookups,
          options.layout,
          { lowerBoundInclusive: afterExclusive },
        ) ||
        (
          predicatePlanHasOwnedQuestionContent(options.contentMap.get(predicateIdx)?.renderPlan ?? null) &&
          options.layout.clauseIndexOfToken(markerIdx) !== options.layout.clauseIndexOfPredicate(predicateIdx)
        )
      ) {
        return null;
      }
      return hostMatch;
    }
    if (!predicateIsNominalizedMatrixArgument(options, predicateIdx)) {
      return null;
    }
  }
  return null;
}

function bareKaQuestionContentHostMatchAt(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  predicateIdx: number,
): QuoteHostMatch | null {
  const plan = options.contentMap.get(predicateIdx)?.renderPlan ?? null;
  const semanticTokenIndexes = isPredicateHeadTailChainRenderPlan(plan) && plan.realization.root.tail.kind === "auxLayer"
    ? plan.realization.root.tail.stem.semanticAnchors.flatMap((anchor) => {
      const tokenIdx = plan.realization.root.tail.kind === "auxLayer"
        ? plan.realization.root.tail.stem.source.tokenIndices[anchor]
        : undefined;
      return tokenIdx === undefined ? [] : [tokenIdx];
    })
    : [predicateIdx];
  for (const tokenIdx of semanticTokenIndexes) {
    const token = options.tokens[tokenIdx];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface;
    if (
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS.has(form) ||
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS.has(form) ||
      options.lookups.EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA.has(form)
    ) {
      return new QuoteHostMatch("question", form, predicateIdx);
    }
  }
  return null;
}

function interrogativeCopulaPredicateCandidates(
  options: {
    readonly contentMap: ContentMap;
    readonly lookups: LookupTables;
  },
  start: number,
  endExclusive: number,
): readonly number[] {
  return [...options.contentMap.entries()].flatMap(([predicateIdx, span]) => {
    if (
      predicateIdx < start ||
      predicateIdx >= endExclusive ||
      !isPredicateHeadTailChainRenderPlan(span.renderPlan) ||
      span.renderPlan.realization.root.tail.kind !== "auxLayer"
    ) {
      return [];
    }
    const stem = span.renderPlan.realization.root.tail.stem;
    const interrogative = stem.semanticAnchors.some((anchor) => {
      const token = stem.source.tokens[anchor];
      const form = token?.dictionaryForm || token?.surface || "";
      return options.lookups.INTERROGATIVE_ADVERBIAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_PRONOMINAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_NOMINAL_FORMS.has(form) ||
        options.lookups.INTERROGATIVE_QUANTITY_FORMS.has(form);
    });
    const copular = span.renderPlan.realization.root.tail.ops.some((op) => op.kind === "copula");
    return interrogative && copular ? [predicateIdx] : [];
  });
}

function predicateIsNominalizedMatrixArgument(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly contentMap: ContentMap;
  },
  predicateIdx: number,
): boolean {
  const span = options.contentMap.get(predicateIdx);
  if (span === undefined) {
    return false;
  }
  const spanEnd = span.start + span.consumed;
  const trailingIdx = previousNonSpaceIndex(options.tokens, spanEnd, span.start);
  const followingIdx = nextNonSpaceIndex(options.tokens, spanEnd, options.tokens.length);
  const nominalizerIdx = trailingIdx !== null && predicateNominalizerRelationForToken(options.tokens[trailingIdx], trailingIdx, {
    requirement: "head_anchor",
    consumers: ["quote_content"],
  }) !== null
    ? trailingIdx
    : followingIdx !== null && predicateNominalizerRelationForToken(options.tokens[followingIdx], followingIdx, {
      requirement: "head_anchor",
      consumers: ["quote_content"],
    }) !== null
      ? followingIdx
      : null;
  if (nominalizerIdx === null) {
    return false;
  }
  const particleIdx = nextNonSpaceIndex(options.tokens, nominalizerIdx + 1, options.tokens.length);
  return particleIdx !== null && (
    caseParticleMarkerRelationForToken(options.tokens[particleIdx], particleIdx, {
      consumers: ["quote_content"],
    }) !== null ||
    topicFocusMarkerRelationForToken(options.tokens[particleIdx], particleIdx, {
      consumers: ["quote_content"],
    }) !== null
  );
}

function predicatePlanHasOwnedQuestionContent(plan: import("../../types/render-plan.js").RenderPlan | null): boolean {
  return isPredicateHeadTailChainRenderPlan(plan) &&
    plan.realization.root.tail.kind === "auxLayer" &&
    plan.realization.root.tail.ops.some((op) =>
      op.kind === "connective" &&
      (op.connective === "question_content" || op.connective === "question_content_alternative")
    );
}

function bareKaQuestionContentSentenceEnd(
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout: ClauseLayout;
  },
  fromIdx: number,
): number {
  const clauseIndex = options.layout.clauseIndexOfToken(Math.min(fromIdx, options.tokens.length - 1));
  if (clauseIndex < 0) {
    return options.tokens.length;
  }
  for (let index = clauseIndex; index < options.layout.clauses.length; index += 1) {
    const clause = options.layout.clauses[index];
    if (
      clause?.terminatedBy === "punctuation" &&
      hardTerminalPunctuationRelation(options.tokens[clause.end - 1], clause.end - 1, ["quote_content"]) !== null
    ) {
      return clause.end;
    }
  }
  return options.tokens.length;
}

export function makeQuoteStructuralRelation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly slotKind: StructuralQuoteContentSlotKind;
  readonly marker: StructuralQuoteMarkerPayload;
  readonly questionBoundaryMarker?: StructuralQuoteMarkerPayload;
  readonly focusParticle?: QuoteBoundaryFocusParticle;
  readonly hostMatch: QuoteHostMatch;
  readonly contentTokenStart: number;
  readonly contentTokenEnd: number;
  readonly bridgeKind: StructuralQuoteBridgeKind | null;
  readonly requestSource: QuoteRequestSourceEvidence | null;
  readonly explicitQuotation?: boolean;
}): QuoteStructuralRelation {
  const markerSpan = options.marker.markerSpan;
  const contentSpan = tokenSpan(options.contentTokenStart, options.contentTokenEnd);
  const proto = activeProtoLayout();
  const sourceClauseIndex = proto?.clauseIndexOfToken(options.contentTokenStart) ?? -1;
  const targetClauseIndex = proto?.clauseIndexOfToken(options.hostMatch.hostIdx) ?? -1;
  const conditionalContent = quoteConditionalContentPayload(
    options.tokens,
    contentSpan,
    options.marker.markerIdx,
    options.slotKind,
    options.hostMatch,
    options.lookups,
  );
  const relation: QuoteStructuralRelation = {
    kind: options.slotKind,
    source: {
      kind: "span",
      span: contentSpan,
      clauseId: sourceClauseIndex < 0 ? null : `clause:${sourceClauseIndex}`,
    },
    target: {
      kind: "predicate",
      predicateIdx: options.hostMatch.hostIdx,
      clauseId: targetClauseIndex < 0 ? null : `clause:${targetClauseIndex}`,
      span: tokenSpan(options.hostMatch.supportIdx ?? options.hostMatch.hostIdx, options.hostMatch.hostIdx + 1),
    },
    markerSpans: [{
      start: markerSpan.start,
      endExclusive: markerSpan.endExclusive,
      surface: options.tokens.slice(markerSpan.start, markerSpan.endExclusive).map((token) => token.surface).join(""),
      role: `${options.slotKind}_marker`,
    }],
    candidateSuppressibleTokenSpans: [{
      start: markerSpan.start,
      endExclusive: markerSpan.endExclusive,
      reason: "quote_marker",
    }],
    projection: {
      sourceForm: "terminal",
      targetSlot: "clause_prefix",
    },
    confidence: "strict",
    ...quoteRenderEnabledPayload(options.tokens, contentSpan, options.marker.markerIdx, options.hostMatch),
    quote: {
      ...options.marker,
      questionBoundarySpan: quoteQuestionBoundarySpanAtProduction(
        options.tokens,
        options.slotKind,
        options.questionBoundaryMarker ?? options.marker,
        options.hostMatch,
        options.lookups,
      ),
      ...(options.focusParticle === undefined ? {} : { focusParticle: options.focusParticle }),
      contentSpan,
      hostPredicateIdx: options.hostMatch.hostIdx,
      hostTokenIdx: options.hostMatch.hostIdx,
      hostMatch: {
        kind: options.hostMatch.kind,
        hostForm: options.hostMatch.hostForm,
        hostIdx: options.hostMatch.hostIdx,
        supportIdx: options.hostMatch.supportIdx,
        ...(options.hostMatch.requestReportingRole === null ? {} : {
          requestReportingRole: options.hostMatch.requestReportingRole,
        }),
      },
      slotKind: options.slotKind,
      ...(options.explicitQuotation === true ? { explicitQuotation: true } : {}),
      bridgeKind: options.bridgeKind,
      ...(conditionalContent === null ? {} : { conditionalContent }),
    },
    provenance: "structural_relation_owner",
  };
  const request = quoteRequestPayloadAtProduction(options.tokens, relation, options.requestSource, options.lookups);
  return request === null
    ? relation
    : { ...relation, quote: { ...relation.quote, request } };
}

function quoteRequestPayloadAtProduction(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  requestSource: QuoteRequestSourceEvidence | null,
  lookups: LookupTables,
): StructuralQuoteRequestPayload | null {
  const questionStart = relation.quote.explicitQuotation === true
    ? previousClauseNonPunctuationIndex(tokens, relation.quote.contentSpan.endExclusive - 1, relation.quote.contentSpan.start)
    : relation.quote.questionBoundarySpan?.start;
  const questionSource = questionStart == null || relation.quote.markerBaseSurface === "かどうか"
    ? null
    : requestQuestionSourceEvidence(tokens, questionStart, lookups);
  const source = questionSource ?? (
    relation.quote.slotKind === "question_content"
      ? null
      : requestSource
  );
  if (source === null) {
    if (relation.quote.slotKind !== "request_content") return null;
    return {
      kind: "directive_request",
      politenessEvidence: null,
      tailKind: classifyQuoteRequestTailKind(tokens, relation, lookups),
    };
  }
  const { tailScope, ...payload } = source;
  const hostForm = relation.quote.hostMatch.hostForm;
  return {
    ...payload,
    tailKind: tailScope === "passive_iu_only"
      ? IU_LEXEME_FORMS.has(hostForm) && quoteRelationHostHasPassiveAux(tokens, relation)
        ? "iu_passive"
        : null
      : classifyQuoteRequestTailKind(tokens, relation, lookups),
  };
}

export function quoteRelationWithRequestSourceEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  source: QuoteRequestSourceEvidence,
  lookups: LookupTables,
): QuoteStructuralRelation {
  const request = quoteRequestPayloadAtProduction(tokens, relation, source, lookups);
  return request === null ? relation : { ...relation, quote: { ...relation.quote, request } };
}

function quoteQuestionBoundarySpanAtProduction(
  tokens: readonly RuntimeHaruToken[],
  slotKind: StructuralQuoteContentSlotKind,
  marker: StructuralQuoteMarkerPayload,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): StructuralRelationTokenSpan | null {
  if (slotKind !== "question_content") return null;
  if (marker.markerBaseSurface === "かどうか") {
    const alternative = questionContentContinuationAfterKaRelationAt(tokens, marker.markerIdx, {
      consumers: ["quote_content"],
      requireAdjacent: true,
      limit: hostMatch.hostIdx + 1,
    });
    return alternative?.continuationKind === "question_alternative_marker"
      ? alternative.span
      : null;
  }
  const questionStart = previousNonSpaceIndex(tokens, marker.markerIdx, 0);
  if (questionStart === null || kaMarkerRelationAt(tokens, questionStart, ["quote_content"]) === null) {
    return null;
  }
  if (kaOwnershipKindAt(tokens, questionStart, lookups) === "toka_listing") {
    const listingMarkerIdx = previousNonSpaceIndex(tokens, questionStart, 0);
    if (
      listingMarkerIdx !== null &&
      tokaNominalListingRunEvidenceForMarker(tokens, listingMarkerIdx, lookups) !== null
    ) {
      return null;
    }
  }
  return tokenSpan(questionStart, marker.markerIdx + 1);
}

function tokaNominalListingRunEvidenceForMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables,
) {
  const proto = activeProtoLayout();
  return proto === null ? null : tokaNominalListingRunEvidenceAt({
    tokens,
    layout: proto,
    lookups,
    markerIdx,
    phrases: clausePhraseReachStreamForToken(proto, tokens, markerIdx),
  });
}

function quoteConditionalContentPayload(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  slotKind: StructuralQuoteContentSlotKind,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): NonNullable<NonNullable<StructuralRelation["quote"]>["conditionalContent"]> | null {
  const tokenIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (tokenIdx === null || tokenIdx < contentSpan.start || tokenIdx >= contentSpan.endExclusive) {
    return null;
  }
  const supported =
    (slotKind === "quoted_content" && hostMatch.kind === "thought" &&
      quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)) ||
    (slotKind === "quoted_content" && hostMatch.kind === "report" &&
      quoteContentEndsWithConditionalBeforeReportHost(tokens, contentSpan, markerIdx, hostMatch)) ||
    (slotKind === "wish_content" && hostMatch.kind === "wish" &&
      quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx));
  if (!supported) {
    return null;
  }
  const affirmativeWish = hostMatch.kind === "thought"
    ? lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "conditional_wish") &&
      quoteContentEndsWithWishConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)
    : hostMatch.kind === "wish" && quoteContentEndsWithWishConditionalBeforeWishHost(tokens, contentSpan, markerIdx, hostMatch);
  return {
    tokenIdx,
    subtype: affirmativeWish ? "affirmative_wish" : "conditional",
  };
}

function quoteRenderEnabledPayload(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: QuoteHostMatch,
): Pick<StructuralRelation, "renderEnabledByDefault"> {
  return quoteContentEndsWithPredicateBoundTame(tokens, contentSpan, markerIdx) ||
    quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithConditionalBeforeReportHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithWishConditionalBeforeWishHost(tokens, contentSpan, markerIdx, hostMatch) ||
    quoteContentEndsWithReasonCopulaBeforeQuoteMarker(tokens, contentSpan, markerIdx)
    ? { renderEnabledByDefault: true }
    : {};
}

export function reasonCopulaQuoteContentMatchBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): ReasonCopulaQuoteContentMatch | null {
  const lastCopulaIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (lastCopulaIdx === null || lastCopulaIdx < contentSpan.start || lastCopulaIdx >= contentSpan.endExclusive) {
    return null;
  }
  const copulaShell = reasonCopulaShellEndingAt(tokens, lastCopulaIdx, contentSpan.start);
  if (copulaShell === null) {
    return null;
  }
  const reasonMarkerIdx = previousNonSpaceIndex(tokens, copulaShell.start, contentSpan.start);
  const reasonMarker = reasonMarkerIdx === null ? undefined : tokens[reasonMarkerIdx];
  if (reasonMarkerIdx === null || reasonMarkerIdx < contentSpan.start || !isStrictReasonKaraToken(reasonMarker)) {
    return null;
  }
  return {
    reasonMarkerIdx,
    copulaStart: copulaShell.start,
    copulaEndExclusive: copulaShell.endExclusive,
    past: copulaShell.past,
    polite: copulaShell.polite,
    conjunctive: copulaShell.conjunctive,
    negative: false,
    additiveMo: false,
    conjecture: null,
  };
}

export function quoteContentEndsWithReasonCopulaBeforeQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): boolean {
  return reasonCopulaQuoteContentMatchBeforeMarker(tokens, contentSpan, markerIdx) !== null;
}

function reasonCopulaShellEndingAt(
  tokens: readonly RuntimeHaruToken[],
  lastIdx: number,
  lowerBoundInclusive: number,
): { readonly start: number; readonly endExclusive: number; readonly past: boolean; readonly polite: boolean; readonly conjunctive: boolean } | null {
  const last = tokens[lastIdx];
  if (last === undefined) {
    return null;
  }
  if (isPastAuxiliaryPos(last.pos)) {
    if (isPastAuxConditionalForm(last.pos)) {
      return null;
    }
    const copulaIdx = previousNonSpaceIndex(tokens, lastIdx, lowerBoundInclusive);
    const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
    if (copulaIdx !== null && isBasicCopulaAuxToken(copula)) {
      return {
        start: copulaIdx,
        endExclusive: lastIdx + 1,
        past: true,
        polite: (copula!.pos & POS4) === 助動詞_デス || copula!.dictionaryForm === "です",
        conjunctive: false,
      };
    }
    return null;
  }
  if (isBasicCopulaAuxToken(last)) {
    return {
      start: lastIdx,
      endExclusive: lastIdx + 1,
      past: false,
      polite: (last.pos & POS4) === 助動詞_デス || last.dictionaryForm === "です",
      conjunctive: isCopulaDaRenyouToken(last),
    };
  }
  return null;
}

function isCopulaDaRenyouToken(token: RuntimeHaruToken): boolean {
  return token.surface === "で" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

function isBasicCopulaAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === 助動詞_ダ ||
    pos4 === 助動詞_デス ||
    token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です";
}

function isStrictReasonKaraToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.surface === "から" || token.dictionaryForm === "から") &&
    (token.pos & POS0) === 助詞 &&
    (token.pos & POS1) === 接続助詞;
}

export function quoteContentEndsWithConditionalBeforeThoughtHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  return hostMatch.kind === "thought" &&
    quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx);
}

export function quoteContentEndsWithConditionalBeforeReportHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  return hostMatch.kind === "report" &&
    quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx);
}

function quoteContentEndsWithConditionalBeforeSupportedHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number
): boolean {
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (conditionalIdx === null || conditionalIdx < contentSpan.start || conditionalIdx >= contentSpan.endExclusive) {
    return false;
  }
  return conditionalTailConnectiveRelationForToken(tokens[conditionalIdx], conditionalIdx, {
    consumers: ["quote_content"]
  }) !== null ||
    isConditionalAuxClauseBoundaryToken(tokens, conditionalIdx) ||
    isConditionalCopulaClauseBoundaryToken(tokens[conditionalIdx]!);
}

export function quoteContentEndsWithWishConditionalBeforeThoughtHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  if (!quoteContentEndsWithConditionalBeforeThoughtHost(tokens, contentSpan, markerIdx, hostMatch)) {
    return false;
  }
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  return conditionalIdx !== null &&
    !isNegativeConditionalBoundaryAt(tokens, conditionalIdx, contentSpan.start);
}

export function quoteContentEndsWithWishConditionalBeforeWishHost(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
  hostMatch: { readonly kind: string }
): boolean {
  if (
    hostMatch.kind !== "wish" ||
    !quoteContentEndsWithConditionalBeforeSupportedHost(tokens, contentSpan, markerIdx)
  ) {
    return false;
  }
  const conditionalIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  return conditionalIdx !== null &&
    !isNegativeConditionalBoundaryAt(tokens, conditionalIdx, contentSpan.start);
}

function quoteContentEndsWithPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): boolean {
  const tameIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (tameIdx === null || tameIdx < contentSpan.start || tameIdx >= contentSpan.endExclusive) {
    return false;
  }
  const tame = tokens[tameIdx];
  const form = tame?.dictionaryForm || tame?.surface;
  if (form !== "ため" && form !== "為") {
    return false;
  }
  const tamePredCursor = new TokenCursor(tokens, contentSpan.start, tameIdx);
  while (tamePredCursor.pos < tamePredCursor.end) {
    if (posLooksPredicateEvidence(tamePredCursor.current()?.pos ?? 0)) {
      return true;
    }
    tamePredCursor.advance();
  }
  return false;
}

export function tokenSpan(start: number, endExclusive: number): StructuralRelationTokenSpan {
  return { start, endExclusive };
}

function buildQuoteStructuralRelationUncached(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  priorRelations: QuoteStructuralRelationIndex,
  options: QuoteStructuralRelationIndexOptions = {}
): QuoteStructuralRelation | null {
  const { tokens, pos: markerIdx, end: n } = markerCursor;
  const marker = tokens[markerIdx];
  const markerSurface = marker?.surface;
  if (!isQuoteContentMarker(markerCursor, lookups)) {
    return null;
  }
  if (markerSurface === undefined) {
    return null;
  }
  if (markerSurface === "と") {
    const preceding = previousNonSpaceIndex(tokens, markerIdx);
    if (preceding !== null && caseParticleMarkerRelationForToken(tokens[preceding], preceding, { consumers: ["quote_content"] })?.caseSurface === "へ") return null;
  }
  if (
    markerSurface === "か" &&
    kaOwnershipKindAt(tokens, markerIdx, lookups) === "wh_indefinite" &&
    whIndefiniteKaKindAt(tokens, markerIdx, lookups) !== "pronominal" &&
    whIndefiniteKaKindAt(tokens, markerIdx, lookups) !== "counter_quantity"
  ) {
    return null;
  }
  const whIndefinite = isWhIndefiniteToMarker(tokens, markerIdx, lookups);

  const closedToka = closedPropositionTokaAtMarker(tokens, markerIdx, lookups);
  const hostMatch = closedToka !== null
    ? closedPropositionTokaQuoteHostMatch(markerCursor, lookups, closedToka.kaIdx)
    : quoteHostMatchAfterMarker(markerCursor, lookups) ??
      quoteHostMatchForPassiveSareru(markerCursor);
  if (
    hostMatch === null ||
    quoteHostMatchBlockedByNegativeCondition(markerCursor, hostMatch, lookups) ||
    (
      quoteHostMatchIsAttributiveIu(tokens, hostMatch) &&
      !attributiveIuHostHasNodaTail(markerCursor, hostMatch.hostIdx) &&
      !attributiveIuHostProjectsAuxiliaryStemMood(tokens, markerIdx, hostMatch) &&
      !quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
    ) ||
    quoteHostMatchIsTowaIeConcessive(tokens, markerIdx, hostMatch) ||
    quoteHostMatchHasLooseSetsuzokuToBridge(tokens, markerIdx, hostMatch)
  ) {
    return null;
  }
  const reformulation = canonicalReformulationMarkerRelationIndex(tokens, lookups)
    .relationAtQuoteMarker(markerIdx);
  if (
    reformulation?.hostIdx === hostMatch.hostIdx &&
    reformulation.eligibleForQuotePreemption
  ) {
    return null;
  }
  const quotativeIdiom = quotativeDerivedIdiomClaimAt(tokens, markerIdx - 1, { consumers: ["quote_content"] });
  if (
    quotativeIdiom?.quoteMarkerIdx === markerIdx &&
    quotativeIdiom.quoteHostIdx === hostMatch.hostIdx
  ) {
    return null;
  }
  if (tariKeijoujiAdverbialToEvidence(markerCursor.fork(markerIdx, n), {
    allowProtoFollowingPredicateEvidence: true,
    allowBuildProtoFollowingPredicateEvidence: options.allowBuildProtoForTariAdverbialEvidence !== false,
    lookups
  }) !== null) {
    return null;
  }

  const euphemisticJudgmentKato = isEuphemisticJudgmentKato(markerCursor, hostMatch, lookups);
  const compositeCandidate = tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"],
  });
  const requestSource = quoteRequestSourceBeforeMarker(tokens, markerIdx, 0, lookups, {
    includeDesiderative: hostMatch.kind !== "question",
    includeBareDirective: compositeCandidate === null,
  });
  const slotKind = closedToka?.questionEvidence === "question_ka"
    ? "question_content"
    : slotKindForMarker(markerCursor, hostMatch, requestSource, compositeCandidate !== null, lookups);
  if (slotKind === null) {
    return null;
  }
  if (whIndefinite && slotKind !== "question_content" && options.admitWhIndefiniteBareNominalContent !== true) {
    return null;
  }
  const explicitQuoteSpan = explicitQuoteSpanImmediatelyBeforeMarker(tokens, markerIdx);
  const contentTokenEnd = explicitQuoteSpan?.[1] ?? contentTokenEndForMarker(tokens, markerIdx, slotKind);
  const contentTokenStart = explicitQuoteSpan === undefined
    ? quoteContentTokenStart(tokens, defaultContentTokenStartFallback(markerIdx), contentTokenEnd, priorRelations, {
      allowQuotedListPunctuation: quoteCognitiveCopularContentCanBridgePunctuation(tokens, markerIdx, hostMatch, lookups)
    })
    : explicitQuoteSpan[0] + 1;
  if (contentTokenEnd < contentTokenStart) {
    return null;
  }
  const bridgeKind = bridgeKindBetweenMarkerAndHost(tokens, markerIdx, hostMatch, lookups);
  const markerFocus = slotKind === "quoted_content" || slotKind === "request_content"
    ? quoteMarkerFocusParticleAfterMarker(tokens, markerIdx, hostMatch.hostIdx)
    : null;
  const ownedQuoteMarker = tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  }) ?? quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  const listingRun = ownedQuoteMarker?.canonicalSurface === "とかって"
    ? tokaNominalListingRunEvidenceForMarker(tokens, ownedQuoteMarker.span.start, lookups)
    : null;
  const retreatedTteIdx = listingRun === null || ownedQuoteMarker?.canonicalSurface !== "とかって"
    ? null
    : ownedQuoteMarker.span.endExclusive - 1;
  const questionBoundaryMarker: StructuralQuoteMarkerPayload | undefined = retreatedTteIdx === null
    ? undefined
    : {
      markerIdx,
      markerSurface,
      markerSpan: tokenSpan(markerIdx, markerIdx + 1),
      markerBaseSurface: markerSurface,
    };
  const ownedMarker: StructuralQuoteMarkerPayload = markerFocus !== null
    ? {
      markerIdx,
      markerSurface: tokens.slice(markerIdx, markerFocus.index + 1).map((token) => token.surface).join(""),
      markerSpan: tokenSpan(markerIdx, markerFocus.index + 1),
      markerBaseSurface: markerSurface,
    }
    : retreatedTteIdx !== null
      ? {
        markerIdx: retreatedTteIdx,
        markerSurface: tokens[retreatedTteIdx]?.surface ?? "って",
        markerSpan: tokenSpan(retreatedTteIdx, retreatedTteIdx + 1),
        markerBaseSurface: tokens[retreatedTteIdx]?.surface ?? "って",
      }
      : ownedQuoteMarker?.canonicalSurface === "とかって"
      ? {
        markerIdx: ownedQuoteMarker.span.start,
        markerSurface: ownedQuoteMarker.canonicalSurface,
        markerSpan: ownedQuoteMarker.span,
        markerBaseSurface: markerSurface,
      }
      : closedToka !== null
      ? {
        markerIdx,
        markerSurface: tokens.slice(markerIdx, closedToka.kaIdx + 1).map((token) => token.surface).join(""),
        markerSpan: tokenSpan(markerIdx, closedToka.kaIdx + 1),
        markerBaseSurface: markerSurface,
      }
      : {
        markerIdx,
        markerSurface,
        markerSpan: tokenSpan(markerIdx, markerIdx + 1),
        markerBaseSurface: markerSurface,
      };
  const baseRelation = makeQuoteStructuralRelation({
    tokens,
    lookups,
    slotKind,
    marker: ownedMarker,
    ...(questionBoundaryMarker === undefined ? {} : { questionBoundaryMarker }),
    ...(markerFocus === null ? {} : { focusParticle: markerFocus.surface }),
    hostMatch,
    contentTokenStart,
    contentTokenEnd,
    bridgeKind,
    requestSource,
    explicitQuotation: explicitQuoteSpan !== undefined,
  });
  const relation: QuoteStructuralRelation = {
    ...baseRelation,
    quote: {
      ...baseRelation.quote,
      ...(euphemisticJudgmentKato ? { questionBoundaryKind: "euphemistic_judgment_kato" } : {}),
      ...questionClosedTokaQuotePayload(closedToka?.questionEvidence),
    },
    ...(closedToka?.questionEvidence === "question_ka"
      ? { candidateSuppressibleTokenSpans: [], renderEnabledByDefault: false }
      : {}),
  };
  if (quoteStructuralRelationLooksAdverbialToContent(tokens, relation)) {
    return null;
  }
  if (
    quoteStructuralRelationLooksBareNominalContent(tokens, relation) &&
    !quoteHostAllowsBareNominalContent(tokens, relation, lookups)
  ) {
    return null;
  }
  return relation;
}

function explicitQuoteSpanImmediatelyBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): readonly [number, number] | undefined {
  const closingIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (closingIdx === null) {
    return undefined;
  }
  const quoteSpans = activeProtoLayout()?.quoteSpans ?? detectQuoteSpans(tokens);
  return quoteSpans.find((span) => span[1] === closingIdx);
}

function attributiveIuHostHasNodaTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostIdx: number
): boolean {
  const { tokens, end: n } = cursor;
  const nominalizerIdx = nextNonSpaceIndex(tokens, hostIdx + 1, n);
  if (nominalizerIdx === null) {
    return false;
  }
  if (cursor.lookahead(nominalizerIdx - cursor.pos, detectNoda) !== null) return true;
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "terminal_noda_marker",
    consumers: ["quote_content"],
  });
  const clause = activeProtoLayout()?.clauseOfToken(nominalizerIdx);
  return nominalizer?.nominalizerKind === "no" && clause?.terminatedBy === "punctuation";
}

function attributiveIuHostProjectsAuxiliaryStemMood(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  if (quoteMarkerFocusParticleAfterMarker(tokens, markerIdx, hostMatch.hostIdx) === null) {
    return false;
  }
  const moodIdx = nextNonSpaceIndex(tokens, hostMatch.hostIdx + 1);
  const mood = moodIdx === null ? undefined : tokens[moodIdx];
  return mood !== undefined && isAuxiliaryStemToken(mood);
}

function buildQuestionAlternativeContentRelationUncached(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  priorRelations: QuoteStructuralRelationIndex
): QuoteStructuralRelation | null {
  const { tokens, pos: kaIdx, end: n } = cursor;
  const questionAlternative = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: n
  });
  if (questionAlternative?.continuationKind !== "question_alternative_marker") {
    return null;
  }
  const hostSearchMarkerIdx = questionAlternative.span.endExclusive - 1;
  const hostSearch = cursor.lookahead(hostSearchMarkerIdx - cursor.pos, hostSearchCursor => {
    const hostMatch = quoteHostMatchAfterMarker(hostSearchCursor, lookups);
    return { hostMatch, blocked: hostMatch === null ? false : quoteHostMatchBlockedByNegativeCondition(hostSearchCursor, hostMatch, lookups) };
  });
  const hostMatch = hostSearch.hostMatch;
  if (
    hostMatch === null ||
    hostMatch.kind !== "question" ||
    hostSearch.blocked ||
    quoteHostMatchIsAttributiveIu(tokens, hostMatch)
  ) {
    return null;
  }
  const contentTokenEnd = kaIdx;
  const contentTokenStart = quoteContentTokenStart(tokens, defaultContentTokenStartFallback(kaIdx), contentTokenEnd, priorRelations);
  if (contentTokenEnd <= contentTokenStart) {
    return null;
  }
  return makeQuoteStructuralRelation({
    tokens,
    lookups,
    slotKind: "question_content",
    marker: {
      markerIdx: kaIdx,
      markerSurface: questionAlternative.surface,
      markerSpan: questionAlternative.span,
      markerBaseSurface: questionAlternative.surface,
    },
    hostMatch,
    contentTokenStart,
    contentTokenEnd,
    bridgeKind: bridgeKindBetweenMarkerAndHost(tokens, hostSearchMarkerIdx, hostMatch, lookups),
    requestSource: null,
  });
}

function quoteStructuralRelationLooksAdverbialToContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (
    relation.quote.slotKind !== "quoted_content" ||
    relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx ||
    relation.quote.markerBaseSurface !== "と"
  ) {
    return false;
  }
  const tailStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (tailStart === null) {
    return false;
  }
  let adverbIdx: number | null = null;
  let index = tailStart;
  while (index < relation.quote.contentSpan.endExclusive) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: relation.quote.contentSpan.endExclusive
    });
    if (evidence === null) {
      return adverbIdx !== null;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return adverbIdx !== null;
    }
    if (adverbIdx !== null || !isLexicalAdverb(token)) {
      return false;
    }
    adverbIdx = index;
    index += 1;
  }
  const token = adverbIdx === null ? undefined : tokens[adverbIdx];
  return token !== undefined;
}

function quoteHostMatchForPassiveSareru(
  cursor: TokenCursor<RuntimeHaruToken>
): QuoteHostMatch | null {
  const match = matchQuotedSareruTailAsClauseQuote(cursor);
  if (match === null) {
    return null;
  }
  const { tokens } = cursor;
  const [predicateIdx] = match;
  return new QuoteHostMatch("report", tokens[predicateIdx]?.dictionaryForm || "する", predicateIdx);
}

function quoteMarkerFocusParticleAfterMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostIdx: number
): { readonly index: number; readonly surface: QuoteBoundaryFocusParticle } | null {
  const focusIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  if (focusIdx === null || focusIdx !== markerIdx + 1 || focusIdx >= hostIdx) {
    return null;
  }
  const focus = tokens[focusIdx];
  if (focus?.surface === "で") {
    const scopeBridge = dewaScopeBridgeRelationAt(tokens, focusIdx, {
      consumers: ["quote_content"]
    });
    if (
      scopeBridge === null ||
      !quoteMarkerSpanAbsorbsScopeBridgeFocus(scopeBridge.focusParticle) ||
      scopeBridge.span.endExclusive > hostIdx
    ) {
      return null;
    }
    return { index: scopeBridge.span.endExclusive - 1, surface: "でも" };
  }
  if (focus?.surface !== "は" && focus?.surface !== "も") {
    return null;
  }
  const bridge = quoteHostSearchBridgeArgumentRelationAt(tokens, focusIdx, {
    consumers: ["quote_content"]
  });
  return bridge === null ? null : { index: focusIdx, surface: focus.surface };
}

export function quoteStructuralRelationTraceDetail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  options: {
    readonly contentIdx: number;
    readonly koreanClauseForm?: string | null;
    readonly consumedMarker?: boolean;
  }
): { readonly [key: string]: RuleTraceDetailValue } {
  const marker = tokens[relation.quote.markerIdx];
  const hostMatch = relation.quote.hostMatch;
  const detail: { [key: string]: RuleTraceDetailValue } = {
    slotKind: relation.quote.slotKind,
    markerIdx: relation.quote.markerIdx,
    markerSurface: marker?.surface ?? null,
    contentIdx: options.contentIdx,
    contentTokenStart: relation.quote.contentSpan.start,
    contentTokenEnd: relation.quote.contentSpan.endExclusive,
    hostIdx: hostMatch.hostIdx,
    hostForm: hostMatch.hostForm,
    hostKind: hostMatch.kind,
    koreanClauseForm: options.koreanClauseForm ?? quoteStructuralRelationKoreanClauseForm(relation),
    bridgeKind: relation.quote.bridgeKind,
    boundarySource: "proto_clause",
    consumedMarker: options.consumedMarker ?? true
  };
  if (hostMatch.supportIdx !== null) {
    detail.supportIdx = hostMatch.supportIdx;
  }
  return detail;
}

function slotKindForMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostMatch: QuoteHostMatch,
  requestSource: QuoteRequestSourceEvidence | null,
  compositeCandidate: boolean,
  lookups: LookupTables,
): StructuralQuoteContentSlotKind | null {
  const { tokens, pos: markerIdx } = cursor;
  if (isKatoQuestionMarker(cursor, hostMatch, lookups)) {
    return isEuphemisticJudgmentKato(cursor, hostMatch, lookups)
      ? "quoted_content"
      : "question_content";
  }
  const markerSurface = tokens[markerIdx]?.surface;
  if (markerSurface === "だって") {
    if (hostMatch.kind === "thought" || hostMatch.kind === "report" || hostMatch.kind === "question") {
      return "quoted_content";
    }
    return null;
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (compositeCandidate) {
    return hostMatch.kind === "wish" ? "wish_content" : "quoted_content";
  }
  if (
    quoteMarker?.tokenCount === 1 &&
    (quoteMarker.canonicalSurface === "と" || quoteMarker.canonicalSurface === "って")
  ) {
    if (hostMatch.kind === "wish") {
      return "wish_content";
    }
    if (
      hostMatch.kind === "request" ||
      (
        lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "command_request") &&
        quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
      ) ||
      (hostMatch.kind === "question" && requestSource !== null)
    ) {
      return "request_content";
    }
    return "quoted_content";
  }
  return null;
}

function isEuphemisticJudgmentKato(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables,
): boolean {
  if (
    !isKatoQuestionMarker(cursor, hostMatch, lookups) ||
    !lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "euphemistic_judgment_kato")
  ) {
    return false;
  }
  const kaIdx = previousNonSpaceIndex(cursor.tokens, cursor.pos);
  return kaIdx !== null &&
    !clauseContainsInterrogativeBefore(
      cursor.tokens,
      kaIdx,
      lookups,
      activeProtoLayout() ?? undefined,
    );
}

function quoteRequestSourceBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lowerBoundInclusive: number,
  lookups: LookupTables,
  options: {
    readonly includeDesiderative?: boolean;
    readonly includeBareDirective?: boolean;
  } = {}
): QuoteRequestSourceEvidence | null {
  const beforeMarker = previousRequestCommandContentToken(tokens, markerIdx - 1);
  if (beforeMarker === null) {
    return null;
  }
  const beforeMarkerToken = tokens[beforeMarker];
  const beforeMarkerForm = beforeMarkerToken?.dictionaryForm || beforeMarkerToken?.surface;
  const bridge = previousNonSpaceIndex(tokens, beforeMarker, lowerBoundInclusive);
  if (beforeMarkerForm === "たい" && bridge !== null) {
    const benefactive = tokens[bridge];
    const benefactiveForm = benefactive?.dictionaryForm || benefactive?.surface || "";
    const teDeIdx = previousNonSpaceIndex(tokens, bridge, lowerBoundInclusive);
    return teDeIdx !== null &&
      lookups.QUOTE_HOST_REGISTRY.auxHostHasCapability(benefactiveForm, "request_question_aux") &&
      teDeBridgeRelationTargets(tokens, teDeIdx, bridge, ["benefactive"], lookups)
      ? { kind: "benefactive_request", politenessEvidence: null, tailScope: "passive_iu_only" }
      : null;
  }
  const continuation = bridge === null
    ? null
    : teDeBridgeRelationTo(tokens, bridge, beforeMarker, ["benefactive", "desiderative", "request"], lookups);
  if (beforeMarkerForm === "欲しい" || beforeMarkerForm === "ほしい") {
    return options.includeDesiderative !== false && continuation?.continuationKind === "desiderative"
      ? { kind: "benefactive_request", politenessEvidence: null }
      : null;
  }
  const politeness = beforeMarkerToken === undefined
    ? null
    : requestAuxPolitenessEvidence(beforeMarkerToken, false);
  if (continuation !== null && (
    continuation.continuationKind === "request" ||
    quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
  )) {
    return { kind: "benefactive_request", politenessEvidence: politeness };
  }
  return options.includeBareDirective !== false && quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
    ? { kind: "directive_request", politenessEvidence: null }
    : null;
}

function isQuoteContentMarker(cursor: TokenCursor<RuntimeHaruToken>, lookups: LookupTables): boolean {
  const { tokens, pos: markerIdx } = cursor;
  const marker = tokens[markerIdx];
  const surface = marker?.surface;
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (
    quoteMarker !== null &&
    quoteMarker.tokenCount === 1 &&
    (quoteMarker.canonicalSurface === "と" || quoteMarker.canonicalSurface === "って")
  ) {
    return true;
  }
  if (tokaTteCompositeQuoteCandidateAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  }) !== null) {
    return true;
  }
  if (marker === undefined || surface !== "だって" || (marker.pos & POS0) !== 助詞) {
    return false;
  }
  return classifyDatteMarkerAt(cursor, lookups).role === "quote_marker";
}

function quoteHostMatchIsTowaIeConcessive(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (quoteMarker?.canonicalSurface !== "と") {
    return false;
  }
  const waIdx = nextNonSpaceIndex(tokens, quoteMarker.span.endExclusive);
  if (waIdx === null || waIdx >= hostMatch.hostIdx || tokens[waIdx]?.surface !== "は") {
    return false;
  }
  const host = tokens[hostMatch.hostIdx];
  const hostForm = host?.dictionaryForm || host?.surface;
  return host !== undefined &&
    IU_LEXEME_FORMS.has(hostForm ?? "") &&
    (host.pos & POS5A) === 已然形_;
}

function quoteHostMatchHasLooseSetsuzokuToBridge(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch
): boolean {
  const marker = tokens[markerIdx];
  const quoteMarker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (marker === undefined || quoteMarker?.canonicalSurface !== "と" || (marker.pos & POS1) !== 接続助詞) {
    return false;
  }
  const hostStart = hostMatch.supportIdx !== null ? hostMatch.supportIdx : hostMatch.hostIdx;
  let sawSubject = false;
  let sawObject = false;
  let index = quoteMarker.span.endExclusive;
  while (index < hostStart) {
    if (quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null) {
      index += 1;
      continue;
    }
    const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, index, {
      consumers: ["quote_content"]
    });
    if (bridgeArgument?.argumentKind === "subject_topic") {
      sawSubject = true;
    }
    if (bridgeArgument?.argumentKind === "object") {
      sawObject = true;
    }
    index += 1;
  }
  return (sawSubject && sawObject) ||
    (
      hostMatch.kind === "thought" &&
      sawObject &&
      quoteMarkerFollowsFinitePredicateClosure(tokens, markerIdx)
    );
}

function quoteMarkerFollowsFinitePredicateClosure(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): boolean {
  const predicateIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (predicateIdx === null) {
    return false;
  }
  const predicate = tokens[predicateIdx];
  const basicCopula = Boolean(isBasicCopulaAuxToken(predicate));
  return predicate !== undefined &&
    !basicCopula &&
    !isCopulaSupportCapableToken(predicate) &&
    (isVerbPredicateToken(predicate) || isIAdjectivePredicateToken(predicate)) &&
    isTerminalOrAttributiveInflection(predicate.pos);
}

function contentTokenEndForMarker(tokens: readonly RuntimeHaruToken[], markerIdx: number, slotKind: StructuralQuoteContentSlotKind): number {
  if (slotKind === "question_content") {
    const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
    if (
      prevIdx !== null &&
      kaMarkerRelationAt(tokens, prevIdx, ["quote_content"]) !== null
    ) {
      return prevIdx;
    }
  }
  return markerIdx;
}

const QUOTE_CONTENT_STOP_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "word_separator"
]);

function quoteContentTokenStart(
  tokens: readonly RuntimeHaruToken[],
  fallbackStart: number,
  contentTokenEnd: number,
  priorRelations: QuoteStructuralRelationIndex,
  options: { readonly allowQuotedListPunctuation?: boolean } = {}
): number {
  let index = contentTokenEnd - 1;
  let start = contentTokenEnd;
  while (index >= 0) {
    const token = tokens[index];
    const pos0 = (token?.pos ?? 0) & POS0;
    if (separatedAs(tokens, index, QUOTE_CONTENT_STOP_SEPARATIONS)) {
      if (quoteContentSpanTokenCanContinue(token)) {
        start = index;
      }
      break;
    }
    if (quoteBridgePunctuationCanJoinQuoteContent(tokens, index, contentTokenEnd, priorRelations)) {
      start = index;
      index -= 1;
      continue;
    }
    if (quoteContentInternalConnectorCanJoin(tokens, index, contentTokenEnd)) {
      start = index;
      index -= 1;
      continue;
    }
    if (
      options.allowQuotedListPunctuation === true &&
      quoteContentQuotedListPunctuationCanJoin(tokens[index])
    ) {
      start = index;
      index -= 1;
      continue;
    }
    if (pos0 === 補助記号 || pos0 === 記号 || hasHardTerminalPunctuationRelation(token, index, ["quote_content"])) {
      break;
    }
    if (quoteContentSpanTokenCanContinue(token)) {
      start = index;
      index -= 1;
      continue;
    }
    break;
  }
  return start < contentTokenEnd ? start : fallbackStart;
}

function quoteCognitiveCopularContentCanBridgePunctuation(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables
): boolean {
  const marker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (
    marker?.canonicalSurface !== "と" ||
    !lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "cognitive_complement")
  ) {
    return false;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, markerIdx);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  return copula !== undefined && (copula.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ);
}

function quoteContentQuotedListPunctuationCanJoin(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !pos0in(token.pos & POS0, PUNCTUATION_BITS)) {
    return false;
  }
  const surface = token.surface;
  return isOpeningPunctuationSurface(surface) ||
    isTrailingPunctuationSurface(surface) ||
    surface.includes("→") ||
    isContentInternalConnectorToken(token);
}

function quoteBridgePunctuationCanJoinQuoteContent(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  markerIdx: number,
  priorRelations: QuoteStructuralRelationIndex
): boolean {
  if (quoteBridgePunctuationRelationAt(tokens, index, {
    consumers: ["quote_content"]
  }) === null) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, index + 1);
  if (next === markerIdx) {
    return true;
  }
  if (next === null || next >= markerIdx) {
    return false;
  }
  const nested = priorRelations.canonicalWinnerAt(next);
  return nested !== undefined &&
    nested.quote.slotKind === "quoted_content" &&
    nested.quote.markerIdx === next &&
    nested.quote.hostMatch.hostIdx < markerIdx &&
    nested.quote.markerSpan.endExclusive <= markerIdx;
}

export function quoteContentInternalConnectorCanJoin(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  upperBoundExclusive: number
): boolean {
  const token = tokens[index];
  if (!isContentInternalConnectorToken(token)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, index);
  const nextIdx = nextNonSpaceIndex(tokens, index + 1);
  if (prevIdx === null || nextIdx === null || nextIdx >= upperBoundExclusive) {
    return false;
  }
  return quoteContentSpanTokenCanContinue(tokens[prevIdx]) && quoteContentSpanTokenCanContinue(tokens[nextIdx]);
}

function quoteContentSpanTokenCanContinue(token: RuntimeHaruToken | undefined): boolean {
  const pos0 = (token?.pos ?? 0) & POS0;
  return (
    pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 動詞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 助詞 ||
    pos0 === 助動詞 ||
    pos0 === 接頭辞 ||
    pos0 === 接尾辞 ||
    pos0 === 連体詞 ||
    pos0 === 副詞
  );
}

function defaultContentTokenStartFallback(markerIdx: number): number {
  return Math.max(0, markerIdx - 1);
}

export function terminalSfpQuoteMarkerBridgeSpan(
  tokens: readonly RuntimeHaruToken[],
  terminalSfp: import("../head-tail/tail/predicate-root/grammar.js").SfpNode,
  markerIdx: number
): StructuralRelationTokenSpan | null {
  const sfpIndices = terminalSfp.source.tokenIndices;
  const sfpEnd = sfpIndices.length === 0 ? -1 : sfpIndices[sfpIndices.length - 1]!;
  if (sfpEnd < 0 || markerIdx <= sfpEnd + 1) {
    return null;
  }
  let start: number | null = null;
  let endExclusive = sfpEnd + 1;
  for (let index = sfpEnd + 1; index < markerIdx; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const punctuation = quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null ||
      hardTerminalPunctuationRelation(token, index, ["quote_content"]) !== null ||
      isBoundaryPunctuationCategoryToken(token);
    if (!punctuation) {
      continue;
    }
    start ??= index;
    endExclusive = index + 1;
  }
  return start === null ? null : { start, endExclusive };
}

function bridgeKindBetweenMarkerAndHost(tokens: readonly RuntimeHaruToken[], markerIdx: number, hostMatch: QuoteHostMatch, lookups: LookupTables): StructuralQuoteBridgeKind | null {
  const hostStart = hostMatch.supportIdx !== null ? hostMatch.supportIdx : hostMatch.hostIdx;
  if (hostStart <= markerIdx + 1) {
    return null;
  }
  let sawPunctuation = false;
  let sawTimeAdverb = false;
  let index = markerIdx + 1;
  while (index < hostStart) {
    const token = tokens[index];
    const pos0 = (token?.pos ?? 0) & POS0;
    const surface = token?.surface;
    if (quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null) {
      sawPunctuation = true;
      index += 1;
      continue;
    }
    if (pos0 === 名詞 && token !== undefined && lookups.EMBEDDED_QUESTION_TIME_ADVERB_NOUNS.has(token.dictionaryForm || (surface ?? ""))) {
      sawTimeAdverb = true;
      index += 1;
      continue;
    }
    if (pos0 === 助詞 || pos0 === 代名詞 || pos0 === 副詞 || pos0 === 形容詞0 || pos0 === 形状詞) {
      index += 1;
      continue;
    }
    if (pos0 === 名詞 && nounPhraseCanBridgeToQuoteHost(tokens, index, hostStart)) {
      index += 1;
      continue;
    }
    index += 1;
  }
  if (sawPunctuation && sawTimeAdverb) {
    return "time_adverb_punctuation";
  }
  if (sawPunctuation) {
    return "punctuation";
  }
  return null;
}

function isKatoQuestionMarker(cursor: TokenCursor<RuntimeHaruToken>, hostMatch: QuoteHostMatch, lookups: LookupTables): boolean {
  const { tokens, pos: markerIdx } = cursor;
  if (quoteMarkerPrecededByVolitionalConfirmation(tokens, markerIdx)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (prevIdx === null) {
    return false;
  }
  if (isJanaiConfirmationKaBaseAt(tokens, prevIdx)) {
    return false;
  }
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, prevIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: markerIdx + 1
  });
  if (
    questionQuote?.continuationKind !== "question_quote_marker" ||
    questionQuote.span.endExclusive !== markerIdx + 1
  ) {
    return false;
  }
  if (previousContentIsWhIndefinite(tokens, prevIdx, lookups)) {
    return hostMatch.kind === "question" ||
      cursor.lookahead(questionQuote.span.endExclusive - cursor.pos, c => looksNarrowQuestionTakingAfter(c, lookups, { scope: "evidence_window" }));
  }
  const scanStart = questionQuote.span.endExclusive;
  const proto = activeProtoLayout();
  if (proto !== null) {
    return looksQuoteQuestionTakingAfterViaLayout(proto, tokens, scanStart, cursor.end, lookups);
  }
  return cursor.lookahead(scanStart - cursor.pos, c =>
    looksQuoteQuestionTakingAfter(c, lookups, { scope: "evidence_window" }) ||
    looksQuestionTakingAfter(c, lookups, { scope: "evidence_window" }));
}

function quoteMarkerPrecededByVolitionalConfirmation(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  const kaIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (
    kaIdx === null ||
    kaMarkerRelationAt(tokens, kaIdx, ["quote_content"])?.particleSubtype1 !== 終助詞
  ) {
    return false;
  }
  const negIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (negIdx === null) {
    return false;
  }
  const neg = tokens[negIdx];
  if (neg === undefined || !isChainedNaiToken(neg)) {
    return false;
  }
  const bridgeIdx = previousNonSpaceIndex(tokens, negIdx);
  if (bridgeIdx === null) {
    return false;
  }
  const bridge = tokens[bridgeIdx];
  if (bridge === undefined) {
    return false;
  }
  if (bridge.surface === "じゃ" && (bridge.pos & POS0) === 助動詞) {
    const beforeBridgeIdx = previousNonSpaceIndex(tokens, bridgeIdx);
    return beforeBridgeIdx !== null && tokenCanHostVolitionalConfirmation(tokens, beforeBridgeIdx);
  }
  if (bridge.surface !== "は" || (bridge.pos & POS0) !== 助詞) {
    return false;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, bridgeIdx);
  if (copulaIdx === null) {
    return false;
  }
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || copula.surface !== "で" || (copula.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
  ) {
    return false;
  }
  const beforeCopulaIdx = previousNonSpaceIndex(tokens, copulaIdx);
  return beforeCopulaIdx !== null && tokenCanHostVolitionalConfirmation(tokens, beforeCopulaIdx);
}

function tokenCanHostVolitionalConfirmation(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  if (isSplitTeIruVolitionalStemAt(tokens, idx)) {
    return true;
  }
  if (token === undefined || (token.pos & POS5A) !== 意志推量形_) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form !== "だ" && form !== "です";
}

function isSplitTeIruVolitionalStemAt(tokens: readonly RuntimeHaruToken[], youIdx: number): boolean {
  const iru = tokens[youIdx - 1];
  const you = tokens[youIdx];
  if (
    iru === undefined ||
    you === undefined ||
    (iru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return false;
  }
  const form = iru.dictionaryForm || iru.surface;
  return (form === "いる" || form === "居る" || form === "おる") && you.surface === "よう" && (you.pos & POS01) === 形状詞_助動詞語幹;
}

function isWhIndefiniteToMarker(tokens: readonly RuntimeHaruToken[], markerIdx: number, lookups: LookupTables): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (prevIdx === null) {
    return false;
  }
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, prevIdx, {
    consumers: ["quote_content"],
    requireAdjacent: true,
    limit: markerIdx + 1
  });
  if (
    questionQuote?.continuationKind !== "question_quote_marker" ||
    questionQuote.span.endExclusive !== markerIdx + 1
  ) {
    return false;
  }
  return previousContentIsWhIndefinite(tokens, prevIdx, lookups);
}

function previousContentIsWhIndefinite(tokens: readonly RuntimeHaruToken[], kaIdx: number, lookups: LookupTables): boolean {
  const index = previousNonSpaceIndex(tokens, kaIdx);
  if (index === null) {
    return false;
  }
  const token = tokens[index];
  const form = token?.dictionaryForm || token?.surface || "";
  return lookups.EMBEDDED_QUESTION_WH_INDEFINITE_HOSTS.has(form);
}

function teDeBridgeRelationTargets(
  tokens: readonly RuntimeHaruToken[],
  bridgeIdx: number,
  continuationIdx: number,
  continuationKinds: readonly string[],
  lookups: LookupTables
): boolean {
  return teDeBridgeRelationTo(tokens, bridgeIdx, continuationIdx, continuationKinds, lookups) !== null;
}

function teDeBridgeRelationTo(
  tokens: readonly RuntimeHaruToken[],
  bridgeIdx: number,
  continuationIdx: number,
  continuationKinds: readonly string[],
  lookups: LookupTables
): ReturnType<typeof teDeContinuationRelationAt> {
  const relation = teDeContinuationRelationAt(tokens, bridgeIdx, {
    consumers: ["quote_content"],
    requirement: "layout_nonspace_tail",
    lookups
  });
  if (relation === null || relation.continuationIdx !== continuationIdx) {
    return null;
  }
  return continuationKinds.includes(relation.continuationKind) ? relation : null;
}
