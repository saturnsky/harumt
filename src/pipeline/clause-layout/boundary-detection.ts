import { isPredicateQuestionContentKaCandidate, looksEmbeddedQuestionKaAdjectivalNounBoundary, looksEmbeddedQuestionKaBoundary, looksEmbeddedQuestionKaExternalSuffixBoundary, looksEmbeddedQuestionKaNominalizedBoundary, looksPredicateChoiceKaClauseBoundary } from "../quote/embedded-question.js";
import { requestOrImperativeExpressionAfter } from "../semantics/request-evidence.js";
import { collectLexicalAdverbialAffiliations, type LexicalAdverbialAffiliation } from "./lexical-adverbial-affiliation.js";
import { TokenCursor } from "../token-cursor.js";
import { copulaNiMarkerRelationForToken, predicateNominalizerRelationForToken, registeredClauseConnectiveRelationForToken } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { NegativeCopulaCorrectionEvidence } from "./negative-copula-correction.js";
import type { ChuushiClosureEvidence } from "./chuushi-closure.js";
import type { PauseJunctureBoundaryEvidence, PauseJunctureEvidence, RenyouJunctureEvidence, WhitespaceAdnominalLicense, WhitespaceJunctureBoundaryEvidence, WhitespaceJunctureEvidence } from "./juncture-verdict.js";
import { directDiscourseChoiceQuestionKaRelationAt, kaNoYouNiSimileRelationAt, kaOwnershipIsLexicalUnitInternal, kaOwnershipKindAt, terminalQuestionKaRelationAt } from "../head-tail/boundary/ka-ownership.js";
import { isWeakPunctuationToken, subtitleTerminalTrailingPunctuationRunRelationAt } from "../head-tail/boundary/punctuation.js";
import { closesUtteranceForSpeakerDirection, type TeUtteranceActEvidence, type TeUtteranceActLookupSets } from "./speech-act.js";
import { hasEllipticFollowerClauseEvidence } from "../head-tail/boundary/clause-start.js";
import { compositeConnectivePatternRelationAt } from "../head-tail/tail/connective-span-scanner.js";
import { lookupConnectiveBySurface } from "../head-tail/tail/predicate-root/connective-surface-lookup.js";
import { isAffirmativeCopulaSupportVerbToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import type { VolitionalIntentBindingEvidence } from "./volitional-intent-binding.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClauseEvidenceTransparentPunctuation, isClauseHardTerminalPunctuationToken, type ClauseTerminalPunctuationRunEvidence, type CopulaPauseBridgeEvidence } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, previousTransparentEvidenceIndex, SEPARATION_OPENS_BOUNDARY, separatedAs } from "./trivia.js";
import { collectBalancedDelimiterSpans, type BalancedDelimiterSpan } from "./balanced-delimiter.js";
import type { UtteranceClosureRunEvidence } from "./utterance-closure.js";
import { isWavePauseSurface } from "../../utils/char-class.js";
import { tryResolveDemoDiscourseConnective } from "../demo-discourse.js";
import { classifyAttributiveHeadKind } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { POS0, POS1, POS4, POS5A, isCaseParticleToken, isVolitionalInflection, isPoliteAuxiliaryPos, pos0in, 意志推量形_, 形状詞, 形容詞0, 助詞, 助動詞, 助動詞_ダ, 助動詞_デス, 助動詞_ヤ, 代名詞, 動詞, 副詞, 補助記号, 名詞, 連用形_, NOMINAL_BITS } from "../../types/pos.js";
import { collectZeroNominalizedParallelMoEvidence } from "./predicate-parallel.js";
import type { BoundaryKind, ClauseToken, LexicalParticleBoundaryClaim, ClauseBoundaryDetectionOptions, ClauseBoundaryEvent, PairedVolitionalConcessiveEvidence, DemoDiscourseLeftBoundaryEvidenceKind, DemoDiscourseLeftBoundaryEvidence, HardTerminalEllipsisRunEvidence, AnaphoricConjectureSelfQuestionEvidence } from "./layout-types.js";
import { nextClauseNonPunctuationIndex } from "./navigation.js";
import { upsertBoundaryEvent, hasFollowingClausePredicateEvidence } from "./boundary-event-common.js";
import { isFinitePredicateBoundaryLeft, clauseTokensAsRuntime, isClausePredicateEvidenceToken } from "./token-evidence.js";
import type { BareKeijoujiAttributiveEvidence } from "./nominal-anchor-evidence.js";
import { isBareKeijoujiDirectAttributiveHost, bareKeijoujiAttributiveHeadIndices } from "./prenominal-head-reach.js";
import { chuushiClosureFollowerOpensUtterance, detectPairedVolitionalConcessiveBoundary, detectDiscourseResumptionCopulaBoundary, detectConditionalAuxBoundary, detectShieldedCompositeConnectiveBoundary, detectHostedCompositeConnectiveBoundary, detectDiscontinuousListingBoundary, detectConnectiveParticleBoundary, detectCaseParticleToConditionalBoundary, detectSuffixTaggedConcessiveTomoBoundary, detectAdversativeGaBoundary, detectMonoNoConcessiveBoundary, detectNoNiConcessiveBoundary, detectNodeReasonBoundary, detectLikenessEvaluativeConditionBoundary, detectPostpositionalConnectiveBoundary, isConditionalAuxClauseBoundaryToken, isConditionalCopulaClauseBoundaryToken, collectPairedVolitionalConcessiveEvidence, finitePredicateClosesBeforeFollowingClause, hasPrecedingContentSinceLastBoundary } from "./connective-boundaries.js";
import { type DetachedUtteranceOnsetEvidence, detectDetachedTerminalNodaClosureBoundaries, collectUtteranceEdgeEvidence, isUtteranceClosingPunct, isCopulaTailContinuationStart } from "./utterance-boundaries.js";
import { CLAUSE_PUNCT_POS0_NUM, isOpeningPunct, isBoundaryPunct, isAbsorbablePunct, nextAfterAbsorbableRun } from "./punctuation.js";
import { detectQuoteSpans } from "./quote-delimiters.js";
import { settleProvisionalBoundaryEvents, addRenyouChuushiClosureEvents, assembleClauseBoundaryDetectionResult } from "./boundary-settlement.js";
import { detectAttributiveBoundary, collectWhitespaceAdnominalLicenses } from "./attributive-boundaries.js";
import { reduplicatedPredicatePairClass } from "./predicate-parallel.js";

export interface ClauseBoundaryDetectionResult {
  readonly events: readonly ClauseBoundaryEvent[];
  readonly demoDiscourseLeftBoundaries: readonly DemoDiscourseLeftBoundaryEvidence[];
  readonly hardTerminalEllipsisRuns: readonly HardTerminalEllipsisRunEvidence[];
  readonly pauseJunctureBoundaryEvidence: ReadonlyMap<number, readonly PauseJunctureBoundaryEvidence[]>;
  readonly anaphoricConjectureSelfQuestions: readonly AnaphoricConjectureSelfQuestionEvidence[];
  readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[];
  readonly copulaPauseBridges: readonly CopulaPauseBridgeEvidence[];
  readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[];
  readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
  readonly renyouCompoundPrenominalHeads: ReadonlySet<number>;
  readonly quoteAttributiveCarrierHeads: ReadonlyMap<number, number>;
  readonly decorativeTerminalClosures: ReadonlySet<number>;
  readonly detachedTerminalNodaClosures: ReadonlySet<number>;
  readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence>;
  readonly punctuationBreakIndices: ReadonlySet<number>;
  readonly negativeCopulaCorrections: ReadonlyMap<number, NegativeCopulaCorrectionEvidence>;
  readonly chuushiClosures: ReadonlyMap<number, ChuushiClosureEvidence>;
  readonly renyouJunctures: ReadonlyMap<number, RenyouJunctureEvidence>;
  readonly teUtteranceActs: ReadonlyMap<number, TeUtteranceActEvidence>;
  readonly volitionalIntentBindings: ReadonlyMap<number, VolitionalIntentBindingEvidence>;
  readonly whitespaceChunkBreakWitnesses: ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]>;
  readonly whitespaceJunctures: ReadonlyMap<number, WhitespaceJunctureEvidence>;
  readonly pauseJunctures: ReadonlyMap<number, PauseJunctureEvidence>;
  readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
  readonly lexicalAdverbialAffiliations: ReadonlyMap<number, LexicalAdverbialAffiliation>;
}

interface QuestionContentPunctuationBridgeCandidate {
  readonly kaIdx: number;
  readonly span: { readonly start: number; readonly endExclusive: number };
}

export type ClauseBoundaryScanSignal = "continue" | "next";

export interface ClauseBoundaryDetectionContext {
  readonly tokens: readonly ClauseToken[];
  readonly n: number;
  readonly lookups: LookupTables;
  readonly options: ClauseBoundaryDetectionOptions;
  readonly runtimeTokens: readonly RuntimeHaruToken[];
  readonly lexicalAdverbialAffiliations: Map<number, LexicalAdverbialAffiliation>;
  readonly quoteSpans: readonly (readonly [number, number])[];
  readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[];
  readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
  readonly whitespaceAdnominalLicenses: ReadonlyMap<number, WhitespaceAdnominalLicense>;
  readonly teRequestSets: TeUtteranceActLookupSets;
  readonly pairedConcessiveByMarker: Map<number, PairedVolitionalConcessiveEvidence>;
  readonly pairedConcessiveBySplitAt: Map<number, PairedVolitionalConcessiveEvidence>;
  readonly baseCursor: TokenCursor<ClauseToken>;
  readonly clauseCursorAt: (pos: number) => TokenCursor<ClauseToken>;
  readonly runtimeCursorAt: (pos: number) => TokenCursor<RuntimeHaruToken>;
  readonly zeroNominalizedParallelMoInteriorSplits: Set<number>;
}

export interface ClauseBoundaryDetectionState {
  readonly raw: Map<number, BoundaryKind>;
  readonly demoDiscourseLeftBoundaries: DemoDiscourseLeftBoundaryEvidence[];
  readonly hardTerminalEllipsisRuns: HardTerminalEllipsisRunEvidence[];
  readonly pauseJunctureBoundaryEvidence: Map<number, readonly PauseJunctureBoundaryEvidence[]>;
  readonly anaphoricConjectureSelfQuestions: AnaphoricConjectureSelfQuestionEvidence[];
  readonly questionContentPunctuationBridgeCandidates: QuestionContentPunctuationBridgeCandidate[];
  readonly punctuationBreakIndices: Set<number>;
  readonly negativeCopulaCorrections: Map<number, NegativeCopulaCorrectionEvidence>;
  readonly chuushiClosureCandidates: Map<number, ChuushiClosureEvidence>;
  readonly teUtteranceActs: Map<number, TeUtteranceActEvidence>;
  readonly volitionalIntentBindings: Map<number, VolitionalIntentBindingEvidence>;
  readonly handledSubtitlePunctuationIndices: Set<number>;
  readonly attributiveModifierChainHeadBySplitAt: Map<number, number>;
  readonly renyouCompoundPrenominalSplits: Set<number>;
  readonly quoteAttributiveCarrierBySplitAt: Map<number, readonly [number, number]>;
  ellipsisRunOrdinal: number;
  readonly nonWhitespaceWitnessSplits: Set<number>;
  readonly whitespaceWitnessSplits: Set<number>;
}

export function detectClauseBoundaryEventsWithEvidence(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {}
): ClauseBoundaryDetectionResult {
  const n = tokens.length;
  if (n === 0) {
    return emptyClauseBoundaryDetectionResult();
  }
  const { ctx, state } = prepareClauseBoundaryDetection(tokens, lookups, options, n);
  const { runtimeCursorAt } = ctx;

  for (const [index, token] of tokens.entries()) {
    const pos0 = token.pos & POS0;
    const pos1 = token.pos & POS1;

    if (detectPairedVolitionalConcessiveBoundary(ctx, state, index) === "continue") continue;
    detectDiscourseResumptionCopulaBoundary(ctx, state, index);
    detectSeparatedDeicticAdverbBoundary(ctx, state, index, token, pos0);
    if (detectPunctuationBoundary(ctx, state, index, token, pos0) === "continue") continue;
    if (detectConditionalAuxBoundary(ctx, state, index) === "continue") continue;
    if (detectShieldedCompositeConnectiveBoundary(ctx, state, index) === "continue") continue;
    if (detectHostedCompositeConnectiveBoundary(ctx, state, index) === "continue") continue;
    if (detectDiscontinuousListingBoundary(ctx, state, index) === "continue") continue;
    if (detectConnectiveParticleBoundary(ctx, state, index, token, pos0, pos1) === "continue") continue;
    if (detectCaseParticleToConditionalBoundary(ctx, state, index, token, pos0, pos1) === "continue") continue;
    if (detectSuffixTaggedConcessiveTomoBoundary(ctx, state, index) === "continue") continue;
    if (detectAdversativeGaBoundary(ctx, state, index) === "continue") continue;
    const kaCursor = runtimeCursorAt(index);
    if (detectAnaphoricConjectureSelfQuestionBoundary(ctx, state, index) === "continue") continue;
    if (detectKaStructureBoundary(ctx, state, index, kaCursor) === "continue") continue;
    if (detectMonoNoConcessiveBoundary(ctx, state, index) === "continue") continue;
    if (detectNoNiConcessiveBoundary(ctx, state, index) === "continue") continue;
    if (detectNodeReasonBoundary(ctx, state, index) === "continue") continue;
    if (detectLikenessEvaluativeConditionBoundary(ctx, state, index) === "continue") continue;
    if (detectPostpositionalConnectiveBoundary(ctx, state, index, token) === "continue") continue;
    detectAttributiveBoundary(ctx, state, index, token);
  }
  detectUnmarkedOnsetBoundaries(ctx, state);
  const detachedTerminalNodaClosures = detectDetachedTerminalNodaClosureBoundaries(ctx, state);
  const provisional = settleProvisionalBoundaryEvents(ctx, state);
  const renyou = addRenyouChuushiClosureEvents(ctx, state, provisional);
  const utteranceEdges = collectUtteranceEdgeEvidence(ctx, state, renyou);
  return assembleClauseBoundaryDetectionResult(ctx, state, detachedTerminalNodaClosures, provisional, renyou, utteranceEdges);
}

function emptyClauseBoundaryDetectionResult(): ClauseBoundaryDetectionResult {
  return {
    events: [],
    demoDiscourseLeftBoundaries: [],
    hardTerminalEllipsisRuns: [],
    anaphoricConjectureSelfQuestions: [],
    terminalPunctuationRuns: [],
    copulaPauseBridges: [],
    balancedDelimiterSpans: [],
    bareKeijoujiAttributiveHeads: new Map<number, BareKeijoujiAttributiveEvidence>(),
    renyouCompoundPrenominalHeads: new Set<number>(),
    quoteAttributiveCarrierHeads: new Map<number, number>(),
    decorativeTerminalClosures: new Set<number>(),
    detachedTerminalNodaClosures: new Set<number>(),
    utteranceClosureRuns: new Map<number, UtteranceClosureRunEvidence>(),
    punctuationBreakIndices: new Set<number>(),
    negativeCopulaCorrections: new Map<number, NegativeCopulaCorrectionEvidence>(),
    chuushiClosures: new Map<number, ChuushiClosureEvidence>(),
    renyouJunctures: new Map<number, RenyouJunctureEvidence>(),
    teUtteranceActs: new Map<number, TeUtteranceActEvidence>(),
    whitespaceChunkBreakWitnesses: new Map<number, readonly WhitespaceJunctureBoundaryEvidence[]>(),
    whitespaceJunctures: new Map<number, WhitespaceJunctureEvidence>(),
    pauseJunctureBoundaryEvidence: new Map<number, readonly PauseJunctureBoundaryEvidence[]>(),
    pauseJunctures: new Map<number, PauseJunctureEvidence>(),
    detachedUtteranceOnsetBoundaries: new Map<number, DetachedUtteranceOnsetEvidence>(),
    lexicalAdverbialAffiliations: new Map<number, LexicalAdverbialAffiliation>(),
    volitionalIntentBindings: new Map<number, VolitionalIntentBindingEvidence>()
  };
}

function prepareClauseBoundaryDetection(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions,
  n: number
): { readonly ctx: ClauseBoundaryDetectionContext; readonly state: ClauseBoundaryDetectionState } {
  const runtimeTokens = clauseTokensAsRuntime(tokens);
  const lexicalAdverbialAffiliations = new Map(collectLexicalAdverbialAffiliations(
    runtimeTokens,
    options.lexicalParticleBoundaryClaims ?? [],
    lookups
  ));
  for (const [particleIdx, affiliation] of options.lexicalAdverbialAffiliationOverrides ?? []) {
    if (lexicalAdverbialAffiliations.has(particleIdx)) lexicalAdverbialAffiliations.set(particleIdx, affiliation);
  }
  const quoteSpans = detectQuoteSpans(tokens);
  const balancedDelimiterSpans = collectBalancedDelimiterSpans(runtimeTokens);
  const bareKeijoujiAttributiveHeads = bareKeijoujiAttributiveHeadIndices(tokens, lookups, options.lexicalNominalHeadClaims);
  const whitespaceAdnominalLicenses = collectWhitespaceAdnominalLicenses(
    tokens,
    runtimeTokens,
    lookups,
    { balancedDelimiterSpans, bareKeijoujiAttributiveHeads },
    options.whitespaceAttributiveReadings
  );
  const raw = new Map<number, BoundaryKind>();
  const demoDiscourseLeftBoundaries: DemoDiscourseLeftBoundaryEvidence[] = [];
  const hardTerminalEllipsisRuns: HardTerminalEllipsisRunEvidence[] = [];
  const pauseJunctureBoundaryEvidence = new Map<number, readonly PauseJunctureBoundaryEvidence[]>();
  const anaphoricConjectureSelfQuestions: AnaphoricConjectureSelfQuestionEvidence[] = [];
  const questionContentPunctuationBridgeCandidates: QuestionContentPunctuationBridgeCandidate[] = [];
  const punctuationBreakIndices = new Set<number>();
  const negativeCopulaCorrections = new Map<number, NegativeCopulaCorrectionEvidence>();
  const chuushiClosureCandidates = new Map<number, ChuushiClosureEvidence>();
  const teUtteranceActs = new Map<number, TeUtteranceActEvidence>();
  const volitionalIntentBindings = new Map<number, VolitionalIntentBindingEvidence>();
  const teRequestSets: TeUtteranceActLookupSets = {
    reportHostVerbs: lookups.SPEECH_ACT_TE_IISASHI_REPORT_HOST_VERBS,
    nonvolitionalVerbs: lookups.SPEECH_ACT_TE_IISASHI_NONVOLITIONAL_VERBS,
    stativeOperatorForms: lookups.SPEECH_ACT_TE_IISASHI_STATIVE_OPERATOR_FORMS
  };
  const pairedVolitionalConcessives = collectPairedVolitionalConcessiveEvidence(tokens);
  const pairedConcessiveByMarker = new Map<number, PairedVolitionalConcessiveEvidence>(
    pairedVolitionalConcessives.flatMap((evidence) => [
      [evidence.firstMarkerIdx, evidence] as const,
      [evidence.secondMarkerIdx, evidence] as const,
    ])
  );
  const pairedConcessiveBySplitAt = new Map<number, PairedVolitionalConcessiveEvidence>(
    [...pairedConcessiveByMarker].map(([markerIdx, evidence]) => [markerIdx + 1, evidence])
  );
  const handledSubtitlePunctuationIndices = new Set<number>();
  const attributiveModifierChainHeadBySplitAt = new Map<number, number>();
  const renyouCompoundPrenominalSplits = new Set<number>();
  const quoteAttributiveCarrierBySplitAt = new Map<number, readonly [number, number]>();
  let ellipsisRunOrdinal = 0;
  const baseCursor = new TokenCursor(tokens, 0, n);
  const clauseCursorAt = (pos: number): TokenCursor<ClauseToken> => baseCursor.fork(pos, n, pos);
  const runtimeCursorAt = (pos: number): TokenCursor<RuntimeHaruToken> => baseCursor.retarget(runtimeTokens, pos, n, pos);
  const zeroNominalizedParallelMoInteriorSplits = new Set<number>();
  for (const parallel of collectZeroNominalizedParallelMoEvidence(tokens)) {
    for (let splitAt = parallel.firstMarkerIdx + 1; splitAt <= parallel.secondMarkerIdx; splitAt += 1) {
      zeroNominalizedParallelMoInteriorSplits.add(splitAt);
    }
  }
  const nonWhitespaceWitnessSplits = new Set<number>();
  const whitespaceWitnessSplits = new Set<number>();
  return {
    ctx: {
      tokens,
      n,
      lookups,
      options,
      runtimeTokens,
      lexicalAdverbialAffiliations,
      quoteSpans,
      balancedDelimiterSpans,
      bareKeijoujiAttributiveHeads,
      whitespaceAdnominalLicenses,
      teRequestSets,
      pairedConcessiveByMarker,
      pairedConcessiveBySplitAt,
      baseCursor,
      clauseCursorAt,
      runtimeCursorAt,
      zeroNominalizedParallelMoInteriorSplits
    },
    state: {
      raw,
      demoDiscourseLeftBoundaries,
      hardTerminalEllipsisRuns,
      pauseJunctureBoundaryEvidence,
      anaphoricConjectureSelfQuestions,
      questionContentPunctuationBridgeCandidates,
      punctuationBreakIndices,
      negativeCopulaCorrections,
      chuushiClosureCandidates,
      teUtteranceActs,
      volitionalIntentBindings,
      handledSubtitlePunctuationIndices,
      attributiveModifierChainHeadBySplitAt,
      renyouCompoundPrenominalSplits,
      quoteAttributiveCarrierBySplitAt,
      ellipsisRunOrdinal,
      nonWhitespaceWitnessSplits,
      whitespaceWitnessSplits
    }
  };
}

function detectSeparatedDeicticAdverbBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, token: ClauseToken, pos0: number): void {
  const { tokens, lookups } = ctx;
  if (
    separatedAs(tokens, index, SEPARATION_OPENS_BOUNDARY) &&
    pos0 === 副詞 &&
    lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)
  ) {
    const previous = previousNonSpaceIndex(tokens, index);
    if (previous !== null && isFinitePredicateBoundaryLeft(tokens[previous])) {
      upsertBoundaryEvent(ctx, state, index, "punctuation");
    }
  }
}

function detectPunctuationBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, token: ClauseToken, pos0: number): ClauseBoundaryScanSignal {
  const { tokens, lookups, options, lexicalAdverbialAffiliations, clauseCursorAt, runtimeCursorAt } = ctx;
  const { raw, hardTerminalEllipsisRuns, pauseJunctureBoundaryEvidence, questionContentPunctuationBridgeCandidates, punctuationBreakIndices, handledSubtitlePunctuationIndices } = state;
  if (CLAUSE_PUNCT_POS0_NUM.has(pos0)) {
    if (handledSubtitlePunctuationIndices.has(index)) {
      return "continue";
    }
    if (isOpeningPunct(token)) {
      return "continue";
    }
    if (!isBoundaryPunct(token)) {
      return "continue";
    }
    if (raw.has(index)) {
      return "continue";
    }
    const subtitleTrailingRun = subtitleTerminalTrailingPunctuationRunRelationAt(
      tokens,
      index,
      lookups.GRAMMAR_BOUNDARY_SUBTITLE_TERMINAL_TRAILING_SURFACES,
      ["clause_layout"],
    );
    if (subtitleTrailingRun !== null) {
      for (let punctuationIdx = index; punctuationIdx < subtitleTrailingRun.span.endExclusive; punctuationIdx += 1) {
        handledSubtitlePunctuationIndices.add(punctuationIdx);
      }
      const previous = previousNonSpaceIndex(tokens, index);
      const currentEllipsisRunOrdinal = /[…‥⋯]/u.test(subtitleTrailingRun.surface)
        ? state.ellipsisRunOrdinal++
        : null;
      if (currentEllipsisRunOrdinal !== null) {
        const pauseLeftIdx = previousEllipsisRunEvidenceIndex(tokens, index);
        if (
          pauseLeftIdx !== null &&
          finitePredicateClosesBeforeFollowingClause(tokens, pauseLeftIdx, subtitleTrailingRun.span.endExclusive)
        ) {
          pauseJunctureBoundaryEvidence.set(currentEllipsisRunOrdinal, [{ kind: "separated_finite" }]);
        }
      }
      if (previous !== null) {
        if (looksEmbeddedQuestionKaBoundary(runtimeCursorAt(previous), lookups, { scope: "sentence" })) {
          return "continue";
        }
        if (isPredicateQuestionContentKaCandidate(runtimeCursorAt(previous), lookups)) {
          questionContentPunctuationBridgeCandidates.push({
            kaIdx: previous,
            span: subtitleTrailingRun.span,
          });
        }
      }
      if (
        currentEllipsisRunOrdinal !== null &&
        isInterclausalOrUtteranceClosingEllipsisRun(tokens, index, subtitleTrailingRun.span.endExclusive, lookups)
      ) {
        hardTerminalEllipsisRuns.push({
          kind: "hard_terminal_ellipsis_run",
          span: subtitleTrailingRun.span,
          runOrdinal: currentEllipsisRunOrdinal,
        });
      }
      punctuationBreakIndices.add(index);
      upsertBoundaryEvent(ctx, state, subtitleTrailingRun.span.endExclusive, "punctuation");
      return "continue";
    }
    const previous = previousNonSpaceIndex(tokens, index);
    if (previous !== null && isAbsorbablePunct(tokens[previous]!)) {
      return "continue";
    }
    if (
      isClauseEvidenceTransparentPunctuation(token) &&
      isCopulaTeAfterNounBeforePunctuation(tokens, index) &&
      hasFollowingClausePredicateEvidence(clauseCursorAt(nextAfterAbsorbableRun(tokens, index)))
    ) {
      punctuationBreakIndices.add(index);
      upsertBoundaryEvent(ctx, state, nextAfterAbsorbableRun(tokens, index), "connective");
      return "continue";
    }
    if (isWeakTailContinuationPunctuation(tokens, index)) {
      return "continue";
    }
    if (isWeakLexicalParticleAdverbialContinuationPunctuation(clauseCursorAt(index), lookups, options, lexicalAdverbialAffiliations)) {
      return "continue";
    }
    punctuationBreakIndices.add(index);
    upsertBoundaryEvent(ctx, state, nextAfterAbsorbableRun(tokens, index), "punctuation");
    return "continue";
  }
  return "next";
}

function detectAnaphoricConjectureSelfQuestionBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number): ClauseBoundaryScanSignal {
  const { tokens, lookups } = ctx;
  const { anaphoricConjectureSelfQuestions } = state;
  if (anaphoricConjectureSelfQuestionBoundaryAt(tokens, index, lookups)) {
    const punctuationIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
    if (punctuationIdx !== null) {
      anaphoricConjectureSelfQuestions.push({
        kind: "anaphoric_conjecture_self_question",
        markerIdx: index,
        punctuationIdx,
      });
    }
    upsertBoundaryEvent(ctx, state, punctuationIdx === null ? index + 1 : punctuationIdx + 1, "punctuation");
    return "continue";
  }
  return "next";
}

function detectKaStructureBoundary(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState, index: number, kaCursor: TokenCursor<RuntimeHaruToken>): ClauseBoundaryScanSignal {
  const { tokens, n, lookups, options, lexicalAdverbialAffiliations, baseCursor, clauseCursorAt } = ctx;
  const { raw, demoDiscourseLeftBoundaries } = state;
  const choiceContinuationIdx = nextClauseNonPunctuationIndex(tokens, index + 1, n);
  const terminalDiscourseKa = terminalQuestionKaRelationAt(tokens, index, { lookups });
  const discourseLeftBoundaryKind: DemoDiscourseLeftBoundaryEvidenceKind | null = terminalDiscourseKa !== null
    ? "terminal_question_ka"
    : kaOwnershipKindAt(tokens, index, lookups) === "question"
      ? "question_ka_choice"
      : null;
  const hasDiscourseChoiceSeparator = choiceContinuationIdx !== null &&
    discourseLeftBoundaryKind !== null &&
    tryResolveDemoDiscourseConnective(
      baseCursor.fork(choiceContinuationIdx, n, choiceContinuationIdx),
      lookups,
      { leftBoundaryEvidence: discourseLeftBoundaryKind },
    ) !== null;
  if (hasDiscourseChoiceSeparator && choiceContinuationIdx !== null && discourseLeftBoundaryKind !== null) {
    demoDiscourseLeftBoundaries.push({
      kind: "demo_discourse_left_boundary",
      boundaryKind: discourseLeftBoundaryKind,
      markerIdx: index,
      connectiveIdx: choiceContinuationIdx,
    });
  }
  const directDiscourseChoiceQuestion = hasDiscourseChoiceSeparator &&
    directDiscourseChoiceQuestionKaRelationAt(tokens, index, lookups) !== null;
  const predicateChoiceOwner = looksPredicateChoiceKaClauseBoundary(kaCursor, lookups, { scope: "sentence" }) &&
    !directDiscourseChoiceQuestion;
  const punctuatedTokaListingOwner =
    isPunctuatedPredicateTokaListingMarker(tokens, index, lookups) &&
    (hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1)) ||
      hasEllipticFollowerClauseEvidence(
        tokens,
        index + 1,
        n,
        (clauseTokens, idx) => {
          const candidate = clauseTokens[idx];
          return candidate !== undefined && isClausePredicateEvidenceToken(candidate);
        }
      ));
  const ownedByConfirmedKaStructure =
    hasQuestionContentContinuationEvidence(kaCursor, lookups) ||
    punctuatedTokaListingOwner;
  const ownedByExistingKaStructure = ownedByConfirmedKaStructure || predicateChoiceOwner;
  const terminalQuestionKa = terminalQuestionKaRelationAt(tokens, index, {
    ownedByExistingStructure: ownedByConfirmedKaStructure,
    lookups,
  });
  if (
    terminalQuestionKa?.evidence === "volitional_host" &&
    hasFollowingClausePredicateEvidence(clauseCursorAt(index + 1)) &&
    hasPrecedingContentSinceLastBoundary(tokens, index, raw, lookups)
  ) {
    upsertBoundaryEvent(ctx, state, index + 1, "punctuation");
    return "continue";
  }
  if (
    ownedByExistingKaStructure &&
    !kaOwnershipIsLexicalUnitInternal(kaOwnershipKindAt(tokens, index, lookups))
  ) {
    if (isLexicalParticleAdverbialBoundaryShield(clauseCursorAt(index), lookups, options, lexicalAdverbialAffiliations)) {
      return "continue";
    }
    if (kaNoYouNiSimileRelationAt(tokens, index, lookups) !== null) {
      return "continue";
    }
    upsertBoundaryEvent(ctx, state, index + 1, "connective");
    return "continue";
  }
  return "next";
}

function detectUnmarkedOnsetBoundaries(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState): void {
  const { tokens, n, lookups, clauseCursorAt } = ctx;
  const { raw } = state;
  for (let index = 1; index < n; index += 1) {
    if (isReduplicatedPredicateOnsetAt(tokens, index, lookups, (splitAt) => raw.get(splitAt) === "attributive")) {
      upsertBoundaryEvent(ctx, state, index, "punctuation", { witnessesWhitespaceSplit: false });
    }
    if (isTerminalOnlyPredicateUnmarkedOnsetAt(tokens, index, clauseCursorAt(index))) {
      upsertBoundaryEvent(ctx, state, index, "punctuation", { witnessesWhitespaceSplit: false });
    }
  }
}

function anaphoricConjectureSelfQuestionBoundaryAt(
  tokens: readonly ClauseToken[],
  kaIdx: number,
  lookups: LookupTables,
): boolean {
  const conjectureIdx = previousNonSpaceIndex(tokens, kaIdx);
  const conjecture = conjectureIdx === null ? undefined : tokens[conjectureIdx];
  const conjectureFamily = (conjecture?.pos ?? 0) & POS4;
  if (
    conjectureIdx === null ||
    ((conjecture?.pos ?? 0) & POS5A) !== 意志推量形_ ||
    (conjectureFamily !== 助動詞_ダ && conjectureFamily !== 助動詞_デス && conjectureFamily !== 助動詞_ヤ)
  ) {
    return false;
  }
  const nominalizerIdx = previousNonSpaceIndex(tokens, conjectureIdx);
  if (
    nominalizerIdx === null ||
    predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["clause_layout"],
    }) === null
  ) {
    return false;
  }
  const punctuationIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  const punctuation = punctuationIdx === null ? undefined : tokens[punctuationIdx];
  if (punctuationIdx === null || punctuation === undefined || !isClauseEvidenceTransparentPunctuation(punctuation)) {
    return false;
  }
  let anaphorSeen = false;
  for (let index = punctuationIdx + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) break;
    if (isClauseEvidenceTransparentPunctuation(token)) {
      continue;
    }
    if (isClauseHardTerminalPunctuationToken(token)) break;
    const form = token.dictionaryForm || token.surface || "";
    if (lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS.has(form)) {
      anaphorSeen = true;
      continue;
    }
    if ((token.pos & POS0) === 動詞) {
      return anaphorSeen && lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS.has(form);
    }
  }
  return false;
}

export function detectClauseBoundaryEvents(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {}
): readonly ClauseBoundaryEvent[] {
  return detectClauseBoundaryEventsWithEvidence(tokens, lookups, options).events;
}

export function detectWhitespaceChunkBreaks(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {},
): ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]> {
  return detectClauseBoundaryEventsWithEvidence(tokens, lookups, options).whitespaceChunkBreakWitnesses;
}

export function detectEllipsisRunPreflightEvidence(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions = {},
): {
  readonly hardTerminalEllipsisRuns: readonly HardTerminalEllipsisRunEvidence[];
  readonly pauseJunctureBoundaryEvidence: ReadonlyMap<number, readonly PauseJunctureBoundaryEvidence[]>;
} {
  const detection = detectClauseBoundaryEventsWithEvidence(tokens, lookups, options);
  return {
    hardTerminalEllipsisRuns: detection.hardTerminalEllipsisRuns,
    pauseJunctureBoundaryEvidence: detection.pauseJunctureBoundaryEvidence
  };
}

function isEllipsisRunLeftTransparentToken(token: ClauseToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 補助記号 && isWavePauseSurface(token.surface);
}

function previousEllipsisRunEvidenceIndex(
  tokens: readonly ClauseToken[],
  start: number,
): number | null {
  const found = previousTransparentEvidenceIndex(tokens, start, {
    isTransparentToken: isEllipsisRunLeftTransparentToken,
  });
  return found === null ? null : found.index;
}

export function isReduplicatedPredicateOnsetAt(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  attributiveBoundaryAt: (splitAt: number) => boolean
): boolean {
  const token = tokens[index];
  const previous = tokens[index - 1];
  if (index <= 0 || token === undefined || previous === undefined) {
    return false;
  }
  const pairClass = reduplicatedPredicatePairClass(previous, token);
  return pairClass !== null &&
    !reduplicatedPairHeadsLargerConstituent(
      tokens,
      index,
      pairClass,
      lookups,
      attributiveBoundaryAt
    );
}

function reduplicatedPairHeadsLargerConstituent(
  tokens: readonly ClauseToken[],
  index: number,
  pairClass: "pure_na_adj" | "inflected_predicate",
  lookups: LookupTables,
  attributiveBoundaryAt: (splitAt: number) => boolean
): boolean {
  if (pairClass === "pure_na_adj" && isBareKeijoujiDirectAttributiveHost(tokens, index, lookups)) {
    return true;
  }
  if (pairClass === "inflected_predicate") {
    const headStart = nextNonSpaceIndex(tokens, index + 1);
    if (headStart !== null && attributiveBoundaryAt(headStart)) {
      return true;
    }
  }
  const follower = tokens[index + 1];
  if (follower === undefined) {
    return false;
  }
  if (copulaNiMarkerRelationForToken(follower, index + 1, { consumers: ["clause_layout"] }) !== null) {
    return true;
  }
  return isCaseParticleToken(follower);
}

export function isTerminalOnlyInflectionPredicateAt(tokens: readonly ClauseToken[], index: number): boolean {
  const token = tokens[index];
  if (token === undefined || !isVolitionalInflection(token.pos)) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    return !isAffirmativeCopulaSupportVerbToken(token);
  }
  if (pos0 !== 助動詞 || !isPoliteAuxiliaryPos(token.pos)) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, index);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  return host !== undefined && (host.pos & POS0) === 動詞 && !isAffirmativeCopulaSupportVerbToken(host);
}

export function isTerminalOnlyPredicateUnmarkedOnsetAt(
  tokens: readonly ClauseToken[],
  index: number,
  cursor: TokenCursor<ClauseToken> = new TokenCursor(tokens, index, tokens.length, index)
): boolean {
  if (index <= 0 || !isTerminalOnlyInflectionPredicateAt(tokens, index - 1)) {
    return false;
  }
  if (!chuushiClosureFollowerOpensUtterance(tokens, index)) {
    return false;
  }
  return compositeConnectivePatternRelationAt(cursor, {
    consumers: ["clause_layout"],
    lookupConnectiveKind: lookupConnectiveBySurface
  })?.hostIndex === undefined;
}

function isPunctuatedPredicateTokaListingMarker(
  tokens: readonly ClauseToken[],
  kaIdx: number,
  lookups: LookupTables,
): boolean {
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) !== "toka_listing") {
    return false;
  }
  const toIdx = previousNonSpaceIndex(tokens, kaIdx);
  const leftIdx = toIdx === null ? null : previousNonSpaceIndex(tokens, toIdx);
  if (leftIdx === null || !isFinitePredicateBoundaryLeft(tokens[leftIdx])) {
    return false;
  }
  const followerIdx = nextNonSpaceIndex(tokens, kaIdx + 1);
  return followerIdx !== null && isWeakPunctuationToken(tokens[followerIdx]);
}

function hasQuestionContentContinuationEvidence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
): boolean {
  return looksEmbeddedQuestionKaBoundary(cursor, lookups, { scope: "sentence" }) ||
    looksEmbeddedQuestionKaNominalizedBoundary(cursor) ||
    looksEmbeddedQuestionKaExternalSuffixBoundary(cursor, lookups) ||
    looksEmbeddedQuestionKaAdjectivalNounBoundary(cursor, lookups, { scope: "sentence" });
}

function hasEllipsisContinuationRelationAt(
  tokens: readonly ClauseToken[],
  index: number,
): boolean {
  return predicateNominalizerRelationForToken(tokens[index], index, {
    requirement: "head_anchor",
    consumers: ["clause_layout"],
  }) !== null ||
    quoteMarkerRelationAt(tokens, index, { consumers: ["clause_layout"] }) !== null ||
    registeredClauseConnectiveRelationForToken(tokens[index], index, {
      consumers: ["clause_layout"],
    }) !== null ||
    isConditionalAuxClauseBoundaryToken(tokens, index) ||
    isConditionalCopulaClauseBoundaryToken(tokens[index]!);
}

function isInterclausalOrUtteranceClosingEllipsisRun(
  tokens: readonly ClauseToken[],
  startIdx: number,
  endExclusive: number,
  lookups: LookupTables,
): boolean {
  const immediateLeftIdx = previousEllipsisRunEvidenceIndex(tokens, startIdx);
  const questionKaIdx = immediateLeftIdx !== null &&
    kaOwnershipKindAt(tokens, immediateLeftIdx, lookups) === "question"
    ? immediateLeftIdx
    : null;
  const beforeKaIdx = questionKaIdx === null
    ? immediateLeftIdx
    : previousEllipsisRunEvidenceIndex(tokens, questionKaIdx);
  const terminalNodaIdx = questionKaIdx !== null &&
    beforeKaIdx !== null &&
    predicateNominalizerRelationForToken(tokens[beforeKaIdx], beforeKaIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["clause_layout"],
    }) !== null
    ? beforeKaIdx
    : null;
  const leftIdx = terminalNodaIdx === null
    ? beforeKaIdx
    : previousEllipsisRunEvidenceIndex(tokens, terminalNodaIdx);
  if (leftIdx === null || !isFinitePredicateBoundaryLeft(tokens[leftIdx])) {
    return false;
  }
  const closesUtterance = questionKaIdx !== null &&
    closesUtteranceForSpeakerDirection(tokens, questionKaIdx + 1);
  const admitsInterclausalContinuation = terminalNodaIdx === null;
  let sawArgumentHead = false;
  let sawArgumentParticle = false;
  for (let index = endExclusive; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isAbsorbablePunct(token)) {
      if (!admitsInterclausalContinuation && isUtteranceClosingPunct(token)) {
        return isUtteranceClosingNominalFragment(closesUtterance, sawArgumentHead, sawArgumentParticle);
      }
      continue;
    }
    if (isBoundaryPunct(token)) {
      return false;
    }
    if (!sawArgumentHead && hasEllipsisContinuationRelationAt(tokens, index)) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 動詞 || pos0 === 形容詞0) {
      return admitsInterclausalContinuation && sawArgumentParticle;
    }
    if (pos0 === 名詞 || pos0 === 代名詞 || pos0 === 形状詞) {
      if (
        !sawArgumentHead &&
        pos0 !== 代名詞 &&
        classifyAttributiveHeadKind({
          surface: token.surface,
          dictionaryForm: token.dictionaryForm,
          reading: "",
          dictionaryFormReading: "",
          pos: token.pos,
          dictionaryId: 0,
        }) !== "ordinary_nominal"
      ) {
        return false;
      }
      sawArgumentHead = true;
      continue;
    }
    if (sawArgumentHead && pos0 === 助詞) {
      sawArgumentParticle = true;
      continue;
    }
    if (
      admitsInterclausalContinuation &&
      sawArgumentParticle &&
      pos0 === 助動詞 &&
      ((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス)
    ) {
      return true;
    }
  }
  return isUtteranceClosingNominalFragment(closesUtterance, sawArgumentHead, sawArgumentParticle);
}

function isUtteranceClosingNominalFragment(
  closesUtterance: boolean,
  sawArgumentHead: boolean,
  sawArgumentParticle: boolean
): boolean {
  return closesUtterance && sawArgumentHead && !sawArgumentParticle;
}

function isCopulaTeAfterNounBeforePunctuation(
  tokens: readonly ClauseToken[],
  punctIdx: number
): boolean {
  const prev = previousNonSpaceIndex(tokens, punctIdx);
  if (prev === null) return false;
  const prevToken = tokens[prev];
  if (prevToken === undefined) return false;
  if (
    (prevToken.pos & (POS0 | POS5A)) !== (助動詞 | 連用形_) || prevToken.dictionaryForm !== "だ" || prevToken.surface !== "で"
  ) {
    return false;
  }
  const beforeDe = previousNonSpaceIndex(tokens, prev);
  if (beforeDe === null) return false;
  const pos0 = (tokens[beforeDe]?.pos ?? 0) & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

function isWeakTailContinuationPunctuation(
  tokens: readonly ClauseToken[],
  punctIdx: number
): boolean {
  const punct = tokens[punctIdx];
  if (punct === undefined) {
    return false;
  }
  if (!isClauseEvidenceTransparentPunctuation(punct)) {
    return false;
  }
  const previous = previousNonSpaceIndex(tokens, punctIdx);
  if (previous === null) {
    return false;
  }
  const previousToken = tokens[previous];
  if (previousToken === undefined || isBoundaryPunct(previousToken)) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, punctIdx + 1);
  if (next === null) {
    return false;
  }
  return isCopulaTailContinuationStart(tokens[next]);
}

function isLexicalParticleAdverbialBoundaryShield(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions,
  affiliations: ReadonlyMap<number, LexicalAdverbialAffiliation>
): boolean {
  const { tokens, pos: particleIdx } = cursor;
  if (affiliations.get(particleIdx)?.relation === "request_adjunct") {
    return true;
  }
  const claim = lexicalParticleBoundaryClaimAt(options, particleIdx, tokens[particleIdx]?.surface);
  if (claim === null || claim.followingRequestOrImperative !== true) {
    return false;
  }
  if (!lexicalParticleAdverbialContextAllowsBoundaryShield(tokens, claim)) {
    return false;
  }
  return cursor.lookahead(1, c => requestOrImperativeExpressionAfter(c, lookups, {
    allowLeadingWeakPunctuation: true
  }));
}

function isWeakLexicalParticleAdverbialContinuationPunctuation(
  cursor: TokenCursor<ClauseToken>,
  lookups: LookupTables,
  options: ClauseBoundaryDetectionOptions,
  affiliations: ReadonlyMap<number, LexicalAdverbialAffiliation>
): boolean {
  const { tokens, pos: punctIdx } = cursor;
  const punct = tokens[punctIdx];
  if (punct === undefined || !isClauseEvidenceTransparentPunctuation(punct)) {
    return false;
  }
  const previous = previousNonSpaceIndex(tokens, punctIdx);
  if (previous === null) {
    return false;
  }
  if (affiliations.get(previous)?.relation === "request_adjunct") {
    return true;
  }
  const claim = lexicalParticleBoundaryClaimAt(options, previous, tokens[previous]?.surface);
  if (claim === null || claim.followingRequestOrImperative !== true) {
    return false;
  }
  if (claim.particleIdx !== previous) {
    return false;
  }
  if (!lexicalParticleAdverbialContextAllowsBoundaryShield(tokens, claim)) {
    return false;
  }
  return cursor.lookahead(1, c => requestOrImperativeExpressionAfter(c, lookups));
}

function lexicalParticleBoundaryClaimAt(
  options: ClauseBoundaryDetectionOptions,
  particleIdx: number,
  particleSurface: string | undefined
): LexicalParticleBoundaryClaim | null {
  if (particleSurface === undefined) {
    return null;
  }
  for (const claim of options.lexicalParticleBoundaryClaims ?? []) {
    if (claim.particleIdx === particleIdx && claim.particle === particleSurface) {
      return claim;
    }
  }
  return null;
}

function lexicalParticleAdverbialContextAllowsBoundaryShield(
  tokens: readonly ClauseToken[],
  claim: LexicalParticleBoundaryClaim
): boolean {
  if (claim.headIdx < 0 || claim.particleIdx !== claim.headIdx + 1) {
    return false;
  }
  const head = tokens[claim.headIdx];
  const particle = tokens[claim.particleIdx];
  if (head === undefined || particle === undefined || particle.surface !== claim.particle) {
    return false;
  }
  const previous = previousNonSpaceIndex(tokens, claim.headIdx);
  if (previous === null) {
    return true;
  }
  const previousToken = tokens[previous];
  if (previousToken === undefined) {
    return true;
  }
  if ((previousToken.pos & POS0) !== 助詞) {
    return true;
  }
  return previousToken.surface !== "は" && previousToken.surface !== "が" && previousToken.surface !== "も";
}
