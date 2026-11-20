import type { CollocationDictionary } from "../dictionary/collocation.js";
import type { ReanalysisDictionary } from "../dictionary/reanalysis.js";
import { isReanalysisFlipRequest, type ReanalysisFlipRequest } from "../types/reanalysis.js";
import { resolveDeferredReanalysisProposals, type ReanalysisResolutionRecord } from "./commitment/deferred-reanalysis.js";
import type { MorphemeDictionary } from "../dictionary/morpheme.js";
import type { PatternDictionary } from "../dictionary/pattern.js";
import { extractFeatures as auxExtractFeatures, nounCopula, nounCopulaConnective } from "../generator/aux-map.js";
import { asIrregular, conjugate, type IrregularType } from "../generator/conjugator.js";
import { hasBatchim } from "../generator/hangul.js";
import { isUnitSymbolSurface } from "../generator/korean-reading.js";
import { allomorphReadingForRealizedText, trailingNumeralHostKorean } from "./rendering/allomorph-host.js";
import { applyInitialDueum } from "../generator/hanja.js";
import { mapParticle, NI_ABSORB_ENDINGS } from "../generator/particle-map.js";
import { secondaryParticleCanonical } from "./particles/secondary-particle.js";
import { selectParticle } from "../generator/particles.js";
import { type ReadingRule } from "../generator/readings.js";
import type { MorphemeEntry } from "../types/dictionary.js";
import type { RuleTraceDetailValue, ParticleAssignment } from "../types/pipeline.js";
import type { RenderedTarget, TargetSegment } from "../types/projection.js";
import { legacySurfaceCompositionPlan, isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan, renderPlanStartsWithShortNegation, type AttributiveRealization, type ConjugatedLemmaPlan, type RenderPlan } from "../types/render-plan.js";
import { ANNOTATION_KEY_OOV, ANNOTATION_KEY_USER_DICT, type AnnotatedSegment } from "../types/annotation.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { Warning } from "../types/warning.js";
import { hasRentaikei } from "./attributive.js";
import { buildClauseLayoutFromProto, type ClauseLayout } from "./clause-layout/final-layout.js";
import { buildProtoLayout } from "./clause-layout/index.js";
import { prenominalMarkerHeadReachAfterToken } from "./clause-layout/prenominal-head-reach.js";
import type { ClauseBoundaryDetectionOptions, TokenSpaceSourceContext } from "./clause-layout/layout-types.js";
import type { ProtoClauseLayout } from "./clause-layout/proto-layout.js";
import type { PrenominalMarkerHeadReach } from "./clause-layout/nominal-anchor-evidence.js";
import {
  collectRenyouVerbReadingProposals,
  reverifiedRenyouVerbReadings,
  sameRenyouVerbReadingFacts,
  type RenyouVerbReadingFacts
} from "./clause-layout/renyou-verb-reading.js";
import {
  collectWhitespaceAttributiveReadingProposals,
  reverifiedWhitespaceAttributiveReadings,
  sameWhitespaceAttributiveReadingFacts,
  type WhitespaceAttributiveReadingFacts
} from "./clause-layout/whitespace-attributive-reading.js";
import { ownedSelectedFrameSlotFills } from "./commitment/semantic-frame.js";
import { buildStructuralRelationGraph } from "./structural-relation/collect.js";
import { collectBareKaQuestionContentRelations } from "./structural-relation/quote-question-content.js";
import { quoteStructuralRelationIndex } from "./structural-relation/quote.js";
import { canonicalReformulationMarkerRelationIndex, isWhIndefiniteKaMarker } from "./head-tail/boundary/ka-ownership.js";
import { applyStructuralRelationRender, defaultStructuralRelationRenderConfig, structuralRelationRenderTokenSpans, type StructuralRelationRenderConfig, type StructuralRelationRenderResult } from "./structural-relation/render.js";
import { projectPredicateHeadTailAttributivePlan } from "./structural-relation/render-attributive.js";
import { relationSourceUnitSequenceParts } from "./structural-relation/render-source-sequence.js";
import { isAdnominalCopulaToken } from "./head-tail/tail/predicate-root/classifiers/tokens.js";
import type { StructuralRelationGraph } from "./structural-relation/types.js";
import { tryResolveKonosonoUchi, tryResolveMamaDewa, tryFixRenyouVerbNoun, tryFixSentenceFinalDore, tryMergeAdverbialShite, tryRescueSentenceInitialNandes, tryRescueSentenceInitialToiuWakeda, tryRescueSentenceInitialToiuWakede, tryResolveDemonstrativeTame, tryResolveDonnaniConcessive, tryResolveDoushita, tryResolveDoushitemo, tryResolveDoushiyou, tryResolveNiOujiResponse, tryResolveSentenceInitialTokoroDiscourse } from "./fallback/collocation-rescue.js";
import { PipelineCompoundMixin, type PipelineCompoundResolver } from "./compounds/index.js";
import type { CompoundResult } from "./compounds/compound-translation-candidates.js";
import { contentResultKoreanCache, contentResultKoreanPos, type ContentResult } from "./content-types.js";
import { PipelineContentResolverMixin } from "./content-resolver.js";
import type { ContentResolverRuntimeAccess } from "./content-resolver/types.js";
import { resolveContext, translationFrameAlternativeMatchesWithoutLayout, type ContextContentMap } from "./context.js";
import { honorificClusterLookupsFrom, honorificClusterSuffixDecision } from "./honorific-nominal-cluster.js";
import { PREDICATE_POS, type CasePreference } from "./commitment/types.js";
import { resolveCasePreference } from "./commitment/particle-roles.js";
import { candidateSetSize, createSourceCandidateSet, stagedCandidate } from "./source-candidate-set.js";
import { resolveHostlessInterjectionAt, tryResolveDemoDiscourseConnective } from "./demo-discourse.js";
import { JP_POS_TO_KR, NONPREDICATE_CONTENT_POS_BITS, PASSTHROUGH_POS_BITS, PLACE_ADMIN_SUFFIX, PipelineFallbackMixin, isNonLexicalSymbolTokenAt, isNonLexicalSymbolToken, splitFallbackKorean, tryNumeralCompound } from "./fallback/index.js";
import { buildFunctionalMinimalFallbackUnits as buildFunctionalMinimalFallbackUnitsPorted, buildLeadingFunctionalPrefixUnits as buildLeadingFunctionalPrefixUnitsPorted } from "./fallback/functional.js";
import { applyBenefactiveRecipientOrdering } from "./semantics/benefactive-ordering-runtime.js";
import {
  applyKeijoujiDeAdverbSemantics,
  applyKeijoujiDeIruStateSemantics,
  applyKeijoujiKanouDeSemantics
} from "./semantics/keijouji-de-runtime.js";
import { isTerminalYoSfpSurface } from "./semantics/sfp-surface.js";
import { NOMINAL_BITS, POS0, POS01, POS012, POS0_NAME, POS1, POS4, POS5A, isNaAdjectiveDerivationalSuffix, isNaAdjCapableNoun, pos0in, posToString, 記号, 係助詞, 助詞_係助詞, 形状詞, 形状詞_助動詞語幹, 形容詞0, 終助詞, 助詞, 助詞_格助詞, 助動詞, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 接頭辞, 接尾辞, 代名詞, 動詞, 非自立可能, 副詞, 副助詞, 補助記号, 名詞, 名詞_固有名詞_地名, 連体詞, 連用形_, 감탄사, 관형사, 동사, 명사, 부사, 수사, 접두사, 접미사, 접속사, 조사, 형용사, 기호, 구, isCounterCapableToken, isSymbolCharacterToken, isNumeralToken } from "../types/pos.js";
export { NEG_MARKERS } from "./semantics/keijouji-de-runtime.js";
import { dearuNounRashiiRenderPlan } from "./semantics/grammar-runtime.js";
import { isContentAdmissionToken } from "./lookup-tables.js";
import type { LookupTables } from "./lookup-tables.js";
import { collectLexicalParticleBoundaryClaims } from "./lexical-particle-boundary-claims.js";
import { collectLexicalRenyouHeadClaims } from "./lexical-renyou-head-claims.js";
import { collectLexicalNominalHeadClaims } from "./lexical-nominal-head-claims.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { collectAuxTokens, runtimeTokensFromMatcher, type AuxTokens } from "./matchers.js";
import { matchCopulaNegation } from "./rules/copula.js";
import { focusBodyOverNegativeScopeBridgeAt } from "./head-tail/tail/predicate-root/matchers/scope-bridge.js";
import { quantityApproximationMarker, tryMergeNumericAgeNishite, tryMergeNumericShite, type NumeralResolutionContext } from "./semantics/numeric.js";
import { lookupCarrierIdiom } from "./semantics/carrier-idiom.js";
import { ParticleCtx, ParticleDecision, type ContentMap } from "./particles/index.js";
import { isUchiTemporalHeadToken } from "./particles/common.js";
import { temporalIntervalVariantHeadedAt } from "./head-tail/tail/predicate-root/temporal-interval-head.js";
import type { TemporalIntervalHeadVariant } from "./head-tail/tail/predicate-root/grammar.js";
import { isSahenBoundVerbAfterSahen } from "./predicate-helpers.js";
import {
  collectEllipticRequestFragmentAffiliations,
  collectInterveningClauseAffiliations,
  sameLexicalAdverbialAffiliation,
  type LexicalAdverbialAffiliation
} from "./clause-layout/lexical-adverbial-affiliation.js";
import { activeProtoLayout, useActiveProtoLayout } from "./clause-layout/proto-state.js";
import type { ClauseTerminalPunctuationRunEvidence } from "./clause-layout/punctuation.js";
import { convertPunctuationSegments } from "./rendering/punctuation.js";
import { punctuationSegmentsForTargetSegments, renderTargetSegmentsText } from "./rendering/target-segment-text.js";
import { adverbialToCapableKeijoujiHost, tariKeijoujiAdverbialToEvidence } from "./semantics/tari-adverbial-marker.js";
import { applyQuoteHostFrameRendering } from "./quote/host-runtime.js";
import {
  attachContentHeadOwnerCandidateLifecycle,
  attachContestedNominalUseOwnerCandidateLifecycle,
  attachContentHeadSharedHeadTailCandidateToPlan,
  contentHeadDispatchFailureTraceDetail,
  contentHeadDispatchNominalAppendPayload,
  contentHeadDispatchTraceDetail,
  contentHeadSelectedHeadTailCandidate,
  tryBuildContentHeadDispatch,
  type ContentHeadDispatchResult
} from "./head-tail/integration/content-head-dispatch.js";
import type { ContestedBareStemNominalUseSlot } from "./candidate-runtime.js";
import { contentHeadHydrationMetadataFromResult, contentHeadMetadataFromResult } from "./head-tail/integration/content-head-metadata.js";
import { copulaFocusAdjunctRelationAt } from "./head-tail/integration/copula-focus-adjunct.js";
import { shouldInsertSpaceBetweenSurfaceParts } from "./nominal-phrase-surface.js";
import { tryBuildSemanticCarrierPredicateDispatchCursor } from "./head-tail/integration/semantic-carrier-predicate.js";
import { tryBuildParticleHeadConsumption, type ParticleHeadAppendPayload, type ParticleHeadCasePreference } from "./particle-head-dispatch.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationAt, pronominalNoMarkerRelationForToken } from "./head-tail/boundary/marker.js";
import { applyHeadedPlanTrailingCopula, tryBuildNominalFrameCopulaChain, withParticleStemProjection, type NominalFrameCopulaChain } from "./head-tail/integration/nominal-assembly.js";
import { tryBuildParticlePhraseCopulaChain } from "./head-tail/integration/particle-phrase-copula.js";
import { particlePhraseCopulaHostBinding } from "./clause-layout/particle-phrase-copula.js";
import { punctuatedCopulaHostHeadLexical, tryBuildPunctuatedCopulaChain } from "./head-tail/integration/punctuated-copula.js";
import { punctuatedCopulaHostBinding } from "./clause-layout/punctuated-copula.js";
import type {
  PredicateHeadTailChainHostSequencePart,
  PredicateHeadTailChainHostTextPart
} from "./head-tail/lifecycle/head-tail-render-plan.js";
import {
  nominalPredicateCommitContext
} from "./head-tail/head/adapters/nominal/plan-lifecycle.js";
import { applyKotoWoWishComplement } from "./head-tail/head/adapters/nominal/wish-complement-runtime.js";
import { applyQuotedKotoTopicContraction } from "./head-tail/head/adapters/nominal/quoted-nominal-runtime.js";
import { nominalTailChainAssemblyHint } from "./head-tail/head/adapters/nominal/commit.js";
import {
  tryBuildNominalFrameMarkerAdapterPlan,
  nominalTailChainAttachLeft,
  nominalTailChainKoreanPos
} from "./head-tail/head/adapters/nominal/integration.js";
import { realizeRenderPlan, realizeRenderPlanWithTrace } from "./rendering/render-plan.js";
import { renderPlanContainsAttributiveModifier } from "./rendering/render-plan-inspect.js";
import { realizeNumeral } from "../generator/numeral-realization.js";
import type { NumericBasePayload } from "../types/numeric-base.js";
import { attachParticleRenderPlan } from "./rendering/particle-plan.js";
import {
  canHostTrailingCopula,
  canHostTrailingCopulaConnective,
  isCopulaSupportChainStartAt,
  isPrefaceConnectiveCopulaHostAt,
  matchCopulaTailWithOptionalConditional,
  matchOrphanCopulaConn,
  matchOrphanNanoconn,
  trailingCopulaConnectiveTail,
  trailingCopulaConnectiveTailDetailed,
  trailingCopulaSfpTail
} from "./semantics/copula-tail-runtime.js";
export {
  ORPHAN_CONN_MAP,
  ORPHAN_NANOCONN_MAP,
  matchOrphanCopulaConn,
  matchOrphanNanoconn
} from "./semantics/copula-tail-runtime.js";
import { tryBuildScopeCarrierDispatch } from "./scope-carrier-dispatch.js";
import {
  PRONOUN_POSSESSIVE_CONTRACTIONS,
  PRONOUN_SUBJECT_CONTRACTIONS,
  tryBuildPronominalNoAuxDeDispatch,
  tryBuildPronominalNoDispatch,
  type PronominalNoDispatchResult
} from "./pronominal-no-dispatch.js";
export { PRONOUN_POSSESSIVE_CONTRACTIONS, PRONOUN_SUBJECT_CONTRACTIONS } from "./pronominal-no-dispatch.js";
import {
  buildTailParserFallbackAssemblyDescriptor,
  buildTailParserFailureFallbackProvenance,
  buildContentHeadTailAssemblyBridge,
  buildEllipticPropositionModalTailDescriptor,
  buildEllipticPropositionQuoteTailDescriptor,
  buildFormulaicApologyPredicateDescriptor,
  buildHonorificFormulaicTailDescriptor,
  buildHonorificRequestQuoteTailDescriptor,
  buildTailOwnerCandidatePayloadSource,
  type TailChainAssemblyDescriptor
} from "./head-tail/integration/tail-assembly.js";
import { hydrateTailChainRootWithHeadMetadata, tailChainPreviousSahenNounAbsorptionStart } from "./head-tail/tail/predicate-root/head-hydration.js";
import { isBareNominalQuoteStart, nounPhraseCopulaPredicateStartKind } from "./head-tail/tail/predicate-root/integration/head-admission.js";
import { isContestedZeroTailClaimCoordinate, tailChainHeadProfile } from "./head-tail/tail/predicate-root/integration.js";
import type { TailChunkResult } from "./head-tail/tail/predicate-root/integration/contracts.js";
import { copulaStartsPredicateAt } from "./head-tail/tail/predicate-root/integration/readiness.js";
import { probeProductionDispatch } from "./head-tail/tail/predicate-root/production-registry.js";
import {
  attachRegisteredHeadedAssemblyUnitPlanLifecycle,
  runRegisteredHeadedContentPlanLifecycle
} from "./head-tail/lifecycle/registry.js";
import { recordTailChainContentPassTrace, recordTailParserFailureTrace } from "./head-tail/tail/predicate-root/trace.js";
import { WH_INDEFINITE_DEMO_HOSTS } from "./head-tail/data/semantic-helper-sets.js";
import {
  getReferentTokenBeforeParticle,
  isQuotationContext,
  isQuotedJudgmentPassiveQuotationContext,
  nextVerbDictForm
} from "./semantics/helpers.js";
import { isCopulaAuxToken, terminalQuestionTail } from "./semantics/copula-tail-runtime.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./clause-layout/trivia.js";
import { TokenCursor } from "./token-cursor.js";
import { hasTerminalSentenceMark } from "./semantics/terminal-runtime.js";
import { TraceCollector, TraceEvent } from "./trace.js";
import { hasTranslationAccess, winner, winnerKorean, winnerKoreanPos } from "./translation/access.js";
import { metadataAdverbial } from "./translation/metadata.js";
import { allNonWhitespaceTokensCovered, clearGeneratedSurfaceCache, collectUncoveredTokenIndices, emitsOutput, findBatchimSource, findUnitCoveringIndex, FunctionalKind, TokenUnitIndex, TranslationUnit, UnitType, phase3InvariantHolds, type HonorificLevel, type TranslationUnitProvenance, lastContentUnit, lastOutputUnit, absorbIntoPrecedingUnit } from "./translation/unit.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import { isQuestionParticleKaToken, questionContentPunctuationBridgeRelationAt } from "./head-tail/boundary/marker.js";
import { hasHardTerminalPunctuationClass, isHardTerminalPunctuationToken, isWeakPunctuationToken } from "./head-tail/boundary/punctuation.js";
import {
  type AllomorphIslandHost,
  allomorphSourceFromTargetSegments,
  isParticleKey,
  tracedAllomorphSurface
} from "./rendering/segment-allomorph.js";
import {
  annotatedSegmentsWithSpacerKeys,
  applyTransparentPauseBoundaryAnnotationKeys,
  collectAnnotationKeysForTargetSegment
} from "./rendering/segment-annotation-keys.js";
import { attachSourceInternalBoundaryTargetsToTargetSegments, interUnitSpaceSegment, lastOutputSegmentText, markConsumedWordBoundaryOnLastSegment, preserveOutputTextInTargetSegments, removeTrailingQuestionFromLastSegment, replaceLastUnitSegmentText, targetSegmentForUnit } from "./rendering/target-segment-build.js";
import { type AssemblerToken, sourceSpanForTokenIndexes } from "./source-coordinate.js";
import { applyMoraStutterPrefixToGeneratedText, isSuffixNounUnit, prevIsNominalUnit, type GeneratedSurfacePair, continuesReduplication, hasUserDictOverride } from "./rendering/unit-surface.js";
import { isKeijoujiVerbObjectHost, applyTailParserFallbackDescriptorToSpan, closeUnownedTailFallbackSpanToRaw, type AssemblyContentSpan, contentSpanCoversIndex, applySourceCompoundContinuationToContentMap, makeAssemblyContentSpan, contentMapRepairSeed, selectedIntrinsicHonorificMetadata, contentHeadDispatchLimit, committedLookupEntry } from "./assembly-content-span.js";
import { isClauseConnectiveEmphasisParticle, committedParticleAssignmentAt, isVocativeYo, particleAllomorphKey } from "./assembler/particle-helpers.js";
import { prefixAttachRightForToken, modifiedHeadNounMatchingSelectedSense, kataVerbHostAttributivePlan, suffixNominalizerAlreadyLexicalizedInPreviousUnit, rewriteFunctionalAdjectivalSuffixHostToNominalized, suffixRenderPlanFromCommittedEntry } from "./assembler/affix-helpers.js";
import { numeralAttachedSymbolHead, type PendingExtentPostposition, finalizeExtentPostpositionSpan, tryContentNumeral, type NumericHostYield } from "./assembler/quantity-spans.js";
import { koreanOverrideRenderPlan } from "./assembler/content-override.js";
import { canCarryCopulaHostPlan, decorationSurfaceParts, isQuoteClosingCopulaHostAt, isNominalizedQuestionCopulaComplementAt, politeCopulaSupportTailIsRealizable, nominalDakeCopulaHostUnit, punctuatedCopulaTailHostUnit, isEllipticConfirmationParticle, isNaniDeConfirmationVeto, matchEllipticConfirmationTerminal, trailingCopulaConnectiveSuffix, nominalDakeTameReasonTail } from "./assembler/copula-helpers.js";
import { type RuntimePreprocessToken, runtimeTokenFromPreprocess } from "./preprocess/runtime-token-from-preprocess.js";
import { withMergedSourcePosition, withSourcePositionFromConsumed, collocationEmissionPreservesSourceRuby, shouldSkipCollocation } from "./preprocess/collocation-emission.js";
import { type NominalLightVerbCarrierProjection, nominalLightVerbObjectLinkAt, rewriteCarrierIdiomRenderPlan } from "./assembler/light-verb-projection.js";
import { isAssemblerTerminalQuestionKa, applyBareQuestionRenderPlan, applyBareQuestionToRenderPlan } from "./assembler/question-plan.js";
import { trySplitNandeReasonSpan } from "./assembler/nande-reason.js";
import { applyCopulaFocusAdjunctRenderPlan } from "./assembler/copula-focus-plan.js";
import { isSentencePunctuationUnit, type MoodPunctuationAnchor, moodPunctuationAnchorAt, reconcileTerminalPunctuationUnit, authoredRunClosesWithQuestion, terminalPeriodIsRedundant, isClauseCommaPunctuationUnit } from "./rendering/terminal-unit-punctuation.js";
import { type LexicalParticleLayoutHypothesis, type LexicalLayoutHypothesisRun, type LexicalAdverbialAffiliationFacts, adoptLexicalLayoutHypothesis, sameLexicalAdverbialAffiliationFacts, type LexicalParticleOwnershipMode, type LexicalParticleOwnershipChoice, lexicalParticleOwnershipHypothesisSlots, lexicalParticleInitialOwnershipChoices, cloneAssemblyContentMap, applyLexicalParticleOwnershipChoice, lexicalParticleConsumedIndicesForChoices, lexicalParticleLayoutSemanticSignature, lexicalParticleChoiceRank, compareLexicalParticleSlotRanks, lexicalParticleChoiceIsRealized } from "./assembler/lexical-layout-hypothesis.js";
import { harvestFailClosedSpanWarnings } from "./translation/warnings.js";
import { isQuoteUtteranceClauseEndToken, quoteMarkerFocusRealizationAt, quotedDesireRenderPlan } from "./assembler/quote-helpers.js";
import { absorbOrphanShuujoshi, absorbOrphanHojokigou } from "./fallback/orphan-unit-absorption.js";

const PREFIX_RUN_HOST_POS_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 連体詞);
const PREFIX_RUN_BLOCKED_HOST_POS_BITS = (1 << 補助記号) | (1 << 記号) | (1 << 助詞) | (1 << 助動詞);
const PREFIX_RUN_BRIDGE_PARTICLE_POS1 = new Set([係助詞, 副助詞]);
const REGISTER_NEUTRAL_BUILD_FORMAL = false;
const HOSTLESS_INTERJECTION_LEXEME_POS: readonly string[] = ["感動詞", "一般", "*", "*"];

export type TokenSpaceContext = TokenSpaceSourceContext;

export abstract class PipelineAssemblerMixin extends PipelineCompoundMixin {
  _formal = false;
  _useCommittedKoreanFallback = false;
  protected abstract readonly lookups: LookupTables;
  protected abstract readonly numeric: NumericTables;
  protected abstract readonly readingFallbackRule: ReadingRule | undefined;
  get lookupTables(): LookupTables {
    return this.lookups;
  }
  get numericTables(): NumericTables {
    return this.numeric;
  }
  abstract get dictionary(): MorphemeDictionary;
  abstract get patterns(): PatternDictionary;
  abstract get collocations(): CollocationDictionary;
  abstract get numericSplits(): CollocationDictionary;
  abstract get reanalysis(): ReanalysisDictionary;

  protected shouldObserveStructuralRelationGraph(): boolean {
    return false;
  }

  protected observeStructuralRelationGraph(_graph: StructuralRelationGraph): void { }

  protected structuralRelationRenderConfig(): StructuralRelationRenderConfig | null {
    return defaultStructuralRelationRenderConfig();
  }

  protected observeStructuralRelationRenderResult(_result: StructuralRelationRenderResult): void { }

  protected observeReanalysisResolution(_record: ReanalysisResolutionRecord): void { }

  static keijoujiTariAdverbPlan(unit: TranslationUnit): ConjugatedLemmaPlan | null {
    const head = unit.jpHead;
    if (!adverbialToCapableKeijoujiHost(head)) {
      return null;
    }
    const buildAdverbialPlan = (
      koreanPos: number | null | undefined,
      koreanLemma: string | null | undefined,
      irregular: IrregularType | null | undefined
    ): ConjugatedLemmaPlan | null => {
      if ((koreanPos !== 형용사 && koreanPos !== 동사) || koreanLemma === undefined || koreanLemma === null) {
        return null;
      }
      if (!koreanLemma.endsWith("다")) {
        return null;
      }
      const lexicalAdverbial = metadataAdverbial(unit.entry, koreanLemma);
      return {
        kind: "conjugatedLemma",
        koreanLemma,
        irregular: irregular ?? null,
        koreanPos,
        ending: "게",
        ...(lexicalAdverbial === null ? {} : { adverbial: lexicalAdverbial })
      };
    };
    const fromRenderPlan = (() => {
      if (unit.renderPlan?.kind !== "lemma") {
        return null;
      }
      return buildAdverbialPlan(unit.renderPlan.koreanPos, unit.renderPlan.koreanLemma, unit.renderPlan.irregular);
    })();
    if (fromRenderPlan !== null) {
      return fromRenderPlan;
    }
    if (unit.entry !== null && hasTranslationAccess(unit.entry) && unit.entry.committed === true && unit.entry.senses.length > 0) {
      const selected = winner(unit.entry);
      const fromCommittedWinner = buildAdverbialPlan(selected.koreanPos, selected.korean, selected.irregular);
      if (fromCommittedWinner !== null) {
        return fromCommittedWinner;
      }
    }
    return buildAdverbialPlan(unit.koreanPos, unit.koreanBase, null);
  }

  static predicatePrenominalText(lemma: string, options: { koreanPos: number; irregular?: IrregularType | null; ending?: string }): string | undefined {
    if (options.koreanPos === 형용사) {
      return conjugate(lemma, asIrregular(options.irregular), options.ending ?? "ㄴ/은");
    }
    if (options.koreanPos === 동사) {
      return conjugate(lemma, asIrregular(options.irregular), options.ending ?? "ㄴ/는");
    }
    return undefined;
  }

  static unitPredicateTranslation(
    unit: TranslationUnit,
    tokens: readonly RuntimeHaruToken[],
    pos: number,
    options: { readonly fallbackEntry?: MorphemeEntry | null; readonly lookups: LookupTables; readonly numeric: NumericTables }
  ): { readonly korean: string; readonly koreanPos: number; readonly irregular: IrregularType | null | undefined } | undefined {
    for (const entry of [unit.entry, options.fallbackEntry ?? null]) {
      if (entry === null) {
        continue;
      }
      for (const translation of entry.senses ?? []) {
        const koreanPos = translation.koreanPos;
        if (koreanPos !== 형용사 && koreanPos !== 동사) {
          continue;
        }
        if (!translationFrameAlternativeMatchesWithoutLayout(translation, tokens, pos, null, options.lookups, options.numeric)) {
          continue;
        }
        if (translation.korean.length > 0) {
          return {
            korean: translation.korean,
            koreanPos,
            irregular: translation.irregular
          };
        }
      }
    }
    return undefined;
  }

  static shouldCacheSurface(renderPlan: RenderPlan | null | undefined): boolean {
    return renderPlan === undefined || renderPlan === null;
  }

  static shouldCacheBaseSurface(renderPlan: RenderPlan | null | undefined): boolean {
    if (renderPlan === undefined || renderPlan === null) {
      return true;
    }
    if (renderPlan.kind === "fixedText" || renderPlan.kind === "numeral") {
      return true;
    }
    if (renderPlan.kind !== "lemma") {
      return false;
    }
    return renderPlan.auxTokens.length === 0 &&
      (renderPlan.connective === undefined || renderPlan.connective === null) &&
      (renderPlan.sfp === undefined || renderPlan.sfp === null) &&
      (renderPlan.voice === undefined || renderPlan.voice === "active") &&
      renderPlan.formalOverride !== true;
  }

  static makeUnit(
    tokens: readonly AssemblerToken[],
    start: number,
    consumed: number,
    korean: string,
    options: {
      unitType: UnitType;
      koreanPos?: number;
      entry?: MorphemeEntry | null;
      renderPlan?: RenderPlan | null;
      koreanBase?: string | null;
      attachLeft?: boolean;
      attachRight?: boolean;
      functionalKind?: FunctionalKind | null;
      allomorphKey?: string | null;
      particleRole?: string | null;
      register?: HonorificLevel;
      provenance?: TranslationUnitProvenance;
      provenanceReason?: string | null;
      discourseConnective?: boolean;
      particleMarkerKind?: string | null;
      particleCopulaBase?: string | null;
      warnings?: readonly Warning[];
      renderPlanPolicy?: import("../types/pipeline.js").RenderPlanPolicy;
      terminalPunctuationRun?: ClauseTerminalPunctuationRunEvidence | null;
    }
  ): TranslationUnit {
    const head = tokens[start];
    if (head === undefined) {
      throw new Error("cannot build TranslationUnit without source token");
    }
    const koreanPos = options.koreanPos ?? 명사;
    const renderPlan = options.renderPlan ?? (
      options.unitType === UnitType.FUNCTIONAL && korean.length > 0
        ? { kind: "fixedText" as const, text: korean, koreanPos }
        : null
    );
    const jpIndexSet = new Set<number>();
    if (head.stutterPrefix !== undefined) {
      for (let index = head.stutterPrefix.sourceSpan.start; index < head.stutterPrefix.sourceSpan.endExclusive; index += 1) {
        jpIndexSet.add(index);
      }
    }
    for (let offset = 0; offset < consumed; offset += 1) {
      jpIndexSet.add(start + offset);
    }
    return new TranslationUnit({
      jpIndices: [...jpIndexSet].sort((left, right) => left - right),
      sourceSpan: sourceSpanForTokenIndexes(tokens, jpIndexSet),
      sourceRawSurface: [...jpIndexSet].sort((left, right) => left - right).map((index) => tokens[index]?.surface ?? "").join(""),
      jpHead: {
        surface: head.surface,
        dictionaryForm: head.dictionaryForm,
        reading: head.reading ?? head.surface,
        dictionaryFormReading: head.dictionaryFormReading ?? head.reading ?? head.surface,
        pos: toHaruPos(head.pos),
        dictionaryId: 0,
        ...(head.sourceOrdinal === undefined ? {} : { sourceOrdinal: head.sourceOrdinal }),
        ...(head.sourceSpan === undefined ? {} : { sourceSpan: head.sourceSpan }),
        ...(head.stutterPrefix === undefined ? {} : { stutterPrefix: head.stutterPrefix }),
        ...(head.sourceCompoundProjectionBoundaries === undefined ? {} : {
          sourceCompoundProjectionBoundaries: head.sourceCompoundProjectionBoundaries
        }),
        ...(head.latinNotationTransliteration === undefined ? {} : {
          latinNotationTransliteration: head.latinNotationTransliteration
        })
      },
      jpPos: head.pos & POS0,
      koreanBase: options.koreanBase ?? korean,
      korean,
      koreanPos: koreanPos,
      entry: options.entry ?? null,
      renderPlan,
      renderPlanPolicy: options.renderPlanPolicy ?? "normal",
      unitType: options.unitType,
      attachLeft: (options.attachLeft ?? head.sourceCompoundContinuation === true) ||
        numeralAttachedSymbolHead(tokens, start),
      attachRight: options.attachRight ?? false,
      functionalKind: options.functionalKind ?? null,
      allomorphKey: options.allomorphKey ?? null,
      particleRole: options.particleRole ?? null,
      register: options.register ?? "none",
      provenance: options.provenance ?? "assembler",
      provenanceReason: options.provenanceReason ?? null,
      discourseConnective: options.discourseConnective ?? false,
      particleMarkerKind: options.particleMarkerKind ?? null,
      particleCopulaBase: options.particleCopulaBase ?? null,
      warnings: options.warnings ?? [],
      terminalPunctuationRun: options.terminalPunctuationRun ?? null
    });
  }

  static appendUnit(units: TranslationUnit[], tokens: readonly AssemblerToken[], start: number, consumed: number, korean: string, options: Parameters<typeof PipelineAssemblerMixin.makeUnit>[4]): void {
    if (korean.length === 0 && (options.allomorphKey === undefined || options.allomorphKey === null) && (options.renderPlan === undefined || options.renderPlan === null)) {
      return;
    }
    units.push(PipelineAssemblerMixin.makeUnit(tokens, start, consumed, korean, options));
  }

  static unitCasePreference(unit: TranslationUnit, surface: string): CasePreference | undefined {
    const selectedKorean = PipelineAssemblerMixin.unitSourceKoreanLemma(unit);
    if (selectedKorean === null) {
      return undefined;
    }
    return resolveCasePreference(unit.entry, surface, {
      selectedKorean
    });
  }

  static unitCasePreferenceForParticle(units: readonly TranslationUnit[], surface: string): CasePreference | undefined {
    const source = findBatchimSource(units, units.length);
    return source === undefined ? undefined : PipelineAssemblerMixin.unitCasePreference(source, surface);
  }

  makeParticleCtx(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ContentMap,
    layout: ClauseLayout
  ): ParticleCtx {
    const { tokens, pos: index } = cursor;
    const source = findBatchimSource(units, units.length);
    const ownerIndex = layout.ownerPredicateOfParticle(index);
    const nextPredicate = ownerIndex === undefined ? null : contentMap.get(ownerIndex) ?? null;
    const clause = layout.clauseOfToken(index) ?? null;
    const nextVerb = nextPredicate?.entry?.dictionaryForm ?? nextVerbDictForm(cursor, { clause });
    const committedParticle = committedParticleAssignmentAt(contentMap, index, ownerIndex) ?? null;
    const referent = getReferentTokenBeforeParticle(tokens, index, this.lookups);
    return new ParticleCtx(
      cursor,
      units,
      source === undefined ? "" : this.unitSurfaceForAssembly(source),
      referent === null ? null : runtimeTokensFromMatcher([referent])[0] ?? null,
      nextVerb,
      nextPredicate,
      ownerIndex === undefined ? null : committedParticle,
      ownerIndex !== undefined,
      clause
    );
  }

  static particleEmit(consumed: number): ParticleDecision {
    return new ParticleDecision("emit", consumed);
  }

  static appendCommittedParticle(
    units: TranslationUnit[],
    tokens: readonly RuntimeHaruToken[],
    index: number,
    assignment: ParticleAssignment
  ): void {
    PipelineAssemblerMixin.appendUnit(units, tokens, index, 1, assignment.korean ?? "", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: assignment.attachLeft ?? true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: assignment.allomorphKey ?? null,
      particleRole: assignment.role,
      register: assignment.register ?? "none"
    });
  }

  surfaceFromRenderPlan(korean: string, renderPlan: RenderPlan | null | undefined): string {
    if (renderPlan === undefined || renderPlan === null) {
      return korean;
    }
    try {
      return realizeRenderPlan(renderPlan, { formal: this._formal, lookups: this.lookups, numeric: this.numeric });
    } catch {
      return korean;
    }
  }

  ensureUnitKorean(unit: TranslationUnit): string {
    if (unit.renderPlan !== null) {
      try {
        const text = realizeRenderPlan(unit.renderPlan, { formal: this._formal, lookups: this.lookups, numeric: this.numeric });
        unit.korean = text;
        if (unit.koreanBase.length === 0) {
          unit.koreanBase = text;
        }
        unit.renderFallbackReason = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const committedDictionaryKorean = this._useCommittedKoreanFallback &&
          unit.entry !== null &&
          hasTranslationAccess(unit.entry) &&
          unit.entry.committed === true
          ? winnerKorean(unit.entry) ?? ""
          : "";
        unit.renderFallbackReason = message;
        const indices = unit.jpIndices;
        const span = indices.length === 0
          ? undefined
          : { start: Math.min(...indices), end: Math.max(...indices) };
        unit.warnings = [
          ...unit.warnings.filter((warning) => warning.opKind !== "render_plan_fallback_raw"),
          {
            type: "render_fallback",
            severity: "error",
            opKind: "render_plan_fallback_raw",
            ...(span === undefined ? {} : { span }),
            message: `render plan failed; raw/cached surface used. reason: ${message}`
          }
        ];
        if (unit.renderPlanPolicy !== "awaiting_structural_relation") {
          unit.renderPlan = null;
          unit.renderPlanPolicy = "normal";
        }
        const cached = unit.korean.length > 0
          ? unit.korean
          : unit.koreanBase.length > 0
            ? unit.koreanBase
            : committedDictionaryKorean;
        unit.korean = /\p{Script=Hangul}/u.test(cached)
          ? cached
          : unit.sourceRawSurface ?? (cached.length > 0 ? cached : unit.jpHead.surface);
      }
    }
    return unit.korean;
  }

  static findBatchimSourceText(emitted: readonly (readonly [TranslationUnit, string])[]): string {
    for (let index = emitted.length - 1; index >= 0; index -= 1) {
      const item = emitted[index];
      if (item === undefined) {
        continue;
      }
      const [sourceUnit, sourceText] = item;
      if (sourceText.length === 0) {
        continue;
      }
      if (sourceUnit.unitType === UnitType.SYMBOL && !isUnitSymbolSurface(sourceText)) {
        continue;
      }
      const quantity = isUnitSymbolSurface(sourceText)
        ? PipelineAssemblerMixin.precedingNumeralText(emitted, index)
        : undefined;
      const reading = allomorphReadingForRealizedText(sourceText, sourceUnit.jpHead, {
        readUnitSymbol: quantity !== undefined
      });
      return `${quantity ?? ""}${reading}`;
    }
    return "";
  }

  private static precedingNumeralText(
    emitted: readonly (readonly [TranslationUnit, string])[],
    unitIndex: number
  ): string | undefined {
    for (let index = unitIndex - 1; index >= 0; index -= 1) {
      const item = emitted[index];
      if (item === undefined) {
        continue;
      }
      const [previousUnit, previousText] = item;
      if (previousText.length === 0 || /^\s+$/u.test(previousText)) {
        continue;
      }
      const isNumeral = previousUnit.unitType === UnitType.NUMERAL ||
        (previousUnit.jpHead !== null && isNumeralToken(previousUnit.jpHead));
      return isNumeral ? previousText : undefined;
    }
    return undefined;
  }

  resolveUnitSurfaceForGenerate(
    unit: TranslationUnit,
    emitted: readonly (readonly [TranslationUnit, string])[],
    options: { readonly materializeCaches?: boolean } = {}
  ): string {
    if (unit.allomorphKey !== null) {
      if (!isParticleKey(unit.allomorphKey)) {
        throw new Error(`unknown particle key: ${unit.allomorphKey}`);
      }
      const text = selectParticle(PipelineAssemblerMixin.findBatchimSourceText(emitted), unit.allomorphKey, { register: unit.register });
      if (options.materializeCaches === true) {
        unit.setKorean(text, { rule: "allomorph" });
      }
      return text;
    }
    if (options.materializeCaches === true) {
      return this.ensureUnitKorean(unit);
    }
    if (unit.renderPlan !== null) {
      try {
        return realizeRenderPlan(unit.renderPlan, { formal: this._formal, lookups: this.lookups, numeric: this.numeric });
      }
      catch (_error) {
        return this.ensureUnitKorean(unit);
      }
    }
    return unit.korean;
  }

  static applyGeneratePronounContraction(
    emitted: (readonly [TranslationUnit, string])[],
    unit: TranslationUnit,
    text: string,
    options: { readonly materializeCaches?: boolean } = {}
  ): string | undefined {
    if (unit.unitType !== UnitType.FUNCTIONAL || (text !== "의" && text !== "가" && text !== "에게") || emitted.length === 0) {
      return text;
    }
    if (text === "에게" && (unit.jpHead.surface === "は" || unit.jpHead.surface === "も")) {
      return text;
    }
    const previous = emitted[emitted.length - 1];
    if (previous === undefined) {
      return text;
    }
    const [previousUnit, previousText] = previous;
    if (previousUnit.unitType !== UnitType.CONTENT) {
      return text;
    }
    if (text === "가") {
      const subjectContracted = PRONOUN_SUBJECT_CONTRACTIONS[previousText] ?? PRONOUN_POSSESSIVE_CONTRACTIONS[previousText];
      if (subjectContracted === undefined) {
        return text;
      }
      if (options.materializeCaches === true) {
        previousUnit.setKorean(subjectContracted, { rule: "contraction" });
      }
      emitted[emitted.length - 1] = [previousUnit, subjectContracted];
      return text;
    }
    const contracted = PRONOUN_POSSESSIVE_CONTRACTIONS[previousText];
    if (contracted === undefined) {
      return text;
    }
    if (text === "의") {
      if (options.materializeCaches === true) {
        previousUnit.setKorean(contracted, { rule: "contraction" });
        if (!unit.suppressed) {
          unit.suppress({ rule: "contraction" });
        }
      }
      emitted[emitted.length - 1] = [previousUnit, contracted];
      return undefined;
    }
    if (options.materializeCaches === true) {
      previousUnit.setKorean(`${contracted}게`, { rule: "contraction" });
      if (!unit.suppressed) {
        unit.suppress({ rule: "contraction" });
      }
    }
    emitted[emitted.length - 1] = [previousUnit, `${contracted}게`];
    return undefined;
  }

  materializeSurfaceCache(units: readonly TranslationUnit[]): void {
    for (const unit of units) {
      if (unit.suppressed) {
        continue;
      }
      this.ensureUnitKorean(unit);
    }
  }

  unitSurfaceForAssembly(unit: TranslationUnit): string {
    if (unit.renderPlan !== null) {
      return PipelineAssemblerMixin.renderPlanAssemblyHint(unit.renderPlan, { lookups: this.lookups }) ?? "";
    }
    if (unit.korean.length > 0) {
      return unit.korean;
    }
    if (unit.koreanBase.length > 0) {
      return unit.koreanBase;
    }
    return "";
  }

  static renderPlanAssemblyHint(plan: RenderPlan, context: { readonly lookups: LookupTables }): string | null {
    switch (plan.kind) {
      case "headTailChain":
        if (isNominalHeadTailChainRenderPlan(plan)) {
          return nominalTailChainAssemblyHint(plan, context.lookups);
        }
        return null;
      case "fixedText":
        return plan.text;
      case "lexicalParticleAdverbial":
        return plan.korean;
      case "numeral":
        return realizeNumeral(plan);
      case "registerText":
        return null;
      case "functionalChainResidual":
      case "lemma":
      case "attributive":
      case "conjugatedLemma":
      case "particleizedLemma":
      case "copulaPredicate":
        return "koreanLemma" in plan ? plan.koreanLemma : null;
      case "predicateScope":
        return plan.suffix ?? PipelineAssemblerMixin.renderPlanAssemblyHint(plan.base, context);
      case "predicateNominalScope":
        return plan.suffix ?? PipelineAssemblerMixin.renderPlanAssemblyHint(plan.base, context);
      case "predicateScopeCarrier": {
        if (typeof plan.suffix === "string" && plan.suffix.length > 0) {
          return plan.suffix;
        }
        if (plan.suffix !== undefined && plan.suffix !== null && typeof plan.suffix !== "string") {
          return PipelineAssemblerMixin.renderPlanAssemblyHint(plan.suffix, context);
        }
        return PipelineAssemblerMixin.renderPlanAssemblyHint(plan.projection.base, context);
      }
      case "legacySurfaceComposition": {
        if (typeof plan.suffix === "string" && plan.suffix.length > 0) {
          return plan.suffix;
        }
        if (plan.suffix !== undefined && plan.suffix !== null && typeof plan.suffix !== "string") {
          const suffixHint = PipelineAssemblerMixin.renderPlanAssemblyHint(plan.suffix, context);
          if (suffixHint !== null && suffixHint.length > 0) {
            return suffixHint;
          }
        }
        if (typeof plan.text === "string" && plan.text.length > 0) {
          return plan.text;
        }
        if (typeof plan.korean === "string" && plan.korean.length > 0) {
          return plan.korean;
        }
        if (plan.prefix !== undefined && plan.prefix !== null && typeof plan.prefix !== "string") {
          return PipelineAssemblerMixin.renderPlanAssemblyHint(plan.prefix, context);
        }
        return typeof plan.prefix === "string" && plan.prefix.length > 0 ? plan.prefix : null;
      }
      default:
        return null;
    }
  }

  precedingForAllomorph(units: readonly TranslationUnit[]): string {
    const source = findBatchimSource(units, units.length);
    return source === undefined ? "" : this.unitSurfaceForAssembly(source);
  }

  precedingAllomorphHint(units: readonly TranslationUnit[]): string | null {
    const preview = this.precedingForAllomorph(units);
    return preview.length > 0 ? preview : null;
  }

  async _processContent(
    cursor: TokenCursor<RuntimeHaruToken>,
    options: {
      readonly forcePassive?: boolean;
      readonly trace?: TraceCollector | null;
      readonly entryAuxMode?: "normal" | "head_metadata";
      readonly contentMap?: ContextContentMap | null;
    } = {}
  ): Promise<ContentResult> {
    return await PipelineContentResolverMixin.prototype._processContent.call(this as unknown as ContentResolverRuntimeAccess, cursor, options);
  }

  protected _generateTargetSegments(
    units: readonly TranslationUnit[],
    options: {
      readonly materializeCaches?: boolean;
      readonly tokens?: readonly RuntimeHaruToken[];
      readonly allomorphIslandHosts?: readonly AllomorphIslandHost[];
    } = {}
  ): TargetSegment[] {
    const allomorphIslandHosts = options.allomorphIslandHosts ?? [];
    const segments: TargetSegment[] = [];
    const emitted: GeneratedSurfacePair[] = [];
    let moodPunctuation: MoodPunctuationAnchor | null = null;
    let moodPunctuationRun: ClauseTerminalPunctuationRunEvidence | null | undefined;
    let consumedWordBoundaryPending = false;
    let contentNeighbor: TranslationUnit | undefined;
    for (const unit of units) {
      if (!emitsOutput(unit)) {
        continue;
      }
      const previous = emitted.at(-1)?.[0];
      if (!isSentencePunctuationUnit(unit)) {
        moodPunctuationRun = undefined;
        moodPunctuation = null;
      } else {
        if (moodPunctuationRun === undefined || moodPunctuationRun !== unit.terminalPunctuationRun) {
          moodPunctuationRun = unit.terminalPunctuationRun;
          moodPunctuation = moodPunctuationAnchorAt(segments);
          if (
            moodPunctuation !== null &&
            moodPunctuation.unidentified !== true &&
            moodPunctuation.marks === "?" &&
            authoredRunClosesWithQuestion(unit.terminalPunctuationRun)
          ) {
            removeTrailingQuestionFromLastSegment(segments);
            moodPunctuation = null;
            consumedWordBoundaryPending = true;
          }
        }
        const decision = reconcileTerminalPunctuationUnit(unit, moodPunctuation);
        moodPunctuation = decision.moodPunctuation;
        if (!decision.emit) {
          continue;
        }
        if (terminalPeriodIsRedundant(segments, unit, moodPunctuation)) {
          continue;
        }
      }
      if (isClauseCommaPunctuationUnit(unit) && lastOutputSegmentText(segments).endsWith("?")) {
        removeTrailingQuestionFromLastSegment(segments);
      }
      let insertSpaceBefore = false;
      if (segments.length > 0) {
        const rightPart = { attachLeft: unit.attachLeft, isSuffixNoun1Char: isSuffixNounUnit(unit) };
        insertSpaceBefore = shouldInsertSpaceBetweenSurfaceParts(
          { attachRight: previous?.attachRight, isNominal: prevIsNominalUnit(previous) },
          rightPart
        );
        if (
          consumedWordBoundaryPending &&
          !isSentencePunctuationUnit(unit) &&
          !insertSpaceBefore &&
          shouldInsertSpaceBetweenSurfaceParts(
            { attachRight: contentNeighbor?.attachRight, isNominal: prevIsNominalUnit(contentNeighbor) },
            rightPart
          )
        ) {
          markConsumedWordBoundaryOnLastSegment(segments);
        }
      }
      if (!isSentencePunctuationUnit(unit)) {
        consumedWordBoundaryPending = false;
      }
      const allomorphSource = unit.allomorphKey !== null
        ? allomorphSourceFromTargetSegments(segments, unit, allomorphIslandHosts)
        : null;
      let tracedRender: RenderedTarget | null = null;
      let surface: string;
      if (unit.allomorphKey !== null) {
        surface = tracedAllomorphSurface(unit, allomorphSource ?? { text: "", sourceSpan: null });
      } else if (unit.renderPlan !== null) {
        try {
          const precedingNumeralKorean = trailingNumeralHostKorean(segments);
          const precedingAllomorphKorean = isNominalHeadTailChainRenderPlan(unit.renderPlan)
            ? allomorphSourceFromTargetSegments(segments, unit, allomorphIslandHosts).text
            : "";
          tracedRender = realizeRenderPlanWithTrace(unit.renderPlan, {
            formal: this._formal,
            lookups: this.lookups,
            numeric: this.numeric,
            sourceSpan: unit.sourceSpan,
            unit,
            ...(precedingNumeralKorean === undefined ? {} : { precedingNumeralKorean }),
            ...(precedingAllomorphKorean.length === 0 ? {} : { precedingAllomorphKorean }),
            ...(options.tokens === undefined ? {} : { tokens: options.tokens })
          });
          surface = tracedRender.text;
          if (options.materializeCaches === true) {
            unit.korean = surface;
            if (unit.koreanBase.length === 0) {
              unit.koreanBase = surface;
            }
            unit.renderFallbackReason = null;
          }
        } catch {
          surface = this.resolveUnitSurfaceForGenerate(unit, emitted, options);
        }
      } else {
        surface = this.resolveUnitSurfaceForGenerate(unit, emitted, options);
      }
      const previousEmitted = emitted.at(-1);
      const text = PipelineAssemblerMixin.applyGeneratePronounContraction(emitted, unit, surface, options);
      const updatedPrevious = emitted.at(-1);
      if (
        previousEmitted !== undefined &&
        updatedPrevious !== undefined &&
        previousEmitted[0] === updatedPrevious[0] &&
        previousEmitted[1] !== updatedPrevious[1]
      ) {
        replaceLastUnitSegmentText(segments, updatedPrevious[0], updatedPrevious[1]);
      }
      if (text === undefined || text.length === 0) {
        continue;
      }
      const emittedText = applyMoraStutterPrefixToGeneratedText(unit, text);
      if (insertSpaceBefore && continuesReduplication(unit, emitted.at(-1), emittedText, options.tokens)) {
        insertSpaceBefore = false;
      }
      if (insertSpaceBefore && !/^\s/u.test(emittedText)) {
        segments.push(interUnitSpaceSegment());
      }
      emitted.push([unit, emittedText]);
      if (!isSentencePunctuationUnit(unit)) {
        contentNeighbor = unit;
      }
      if (unit.allomorphKey !== null) {
        if (options.materializeCaches === true) {
          unit.setKorean(emittedText, { rule: "allomorph" });
        }
        segments.push(targetSegmentForUnit(unit, emittedText, {
          allomorphSourceSpan: allomorphSource?.sourceSpan ?? null
        }));
        continue;
      }
      if (unit.renderPlan === null) {
        segments.push(targetSegmentForUnit(unit, emittedText));
        continue;
      }
      if (tracedRender !== null) {
        segments.push(...attachSourceInternalBoundaryTargetsToTargetSegments(
          preserveOutputTextInTargetSegments(tracedRender.segments, emittedText),
          unit
        ).map((segment) => ({ ...segment, renderedByUnit: unit })));
        continue;
      }
      segments.push({
        ...targetSegmentForUnit(unit, emittedText),
        projectionConfidence: "fallback"
      });
    }
    return segments;
  }

  _generate(units: readonly TranslationUnit[], options: { readonly materializeCaches?: boolean; readonly tokens?: readonly RuntimeHaruToken[] } = {}): string {
    return renderTargetSegmentsText(this._generateTargetSegments(units, options));
  }

  protected _targetSegmentsToAnnotatedSegments(
    segments: readonly TargetSegment[],
    tokens: readonly RuntimeHaruToken[],
    options: { readonly annotateOov?: boolean; readonly annotateUserDict?: boolean } = {}
  ): AnnotatedSegment[] {
    const base = punctuationSegmentsForTargetSegments(segments);
    const annotated = base.map((segment, index) => {
      const source = segments[index];
      if (source === undefined) {
        return segment;
      }
      const keys = collectAnnotationKeysForTargetSegment(source, tokens);
      if (source.unit !== null && options.annotateUserDict === true && hasUserDictOverride(source.unit, tokens)) {
        keys.push(ANNOTATION_KEY_USER_DICT);
      } else if (source.unit !== null && options.annotateOov === true && source.unit.entry?.synthetic === true) {
        keys.push(ANNOTATION_KEY_OOV);
      }
      return keys.length > 0 ? { ...segment, keys } : segment;
    });
    applyTransparentPauseBoundaryAnnotationKeys(annotated, segments, tokens);
    return convertPunctuationSegments(annotatedSegmentsWithSpacerKeys(annotated));
  }

  _generateAnnotatedSegments(
    units: readonly TranslationUnit[],
    tokens: readonly RuntimeHaruToken[],
    options: { readonly materializeCaches?: boolean; readonly annotateOov?: boolean; readonly annotateUserDict?: boolean } = {}
  ): AnnotatedSegment[] {
    return this._targetSegmentsToAnnotatedSegments(
      this._generateTargetSegments(units, { ...options, tokens }),
      tokens,
      options
    );
  }

  private quantityApproximationSpanAt(
    cursor: TokenCursor<RuntimeHaruToken>,
    index: number,
    quantity: { readonly endExclusive: number; readonly plan: NumericBasePayload } | null
  ): AssemblyContentSpan | undefined {
    if (quantity === null) {
      return undefined;
    }
    if (index === quantity.endExclusive) {
      if (quantity.plan.kind !== "numeral" || quantity.plan.amountFormatted !== true) {
        return undefined;
      }
    } else if (index === quantity.endExclusive + 1) {
      const counterNoun = cursor.tokens[index - 1];
      if (counterNoun === undefined || !isCounterCapableToken(counterNoun)) {
        return undefined;
      }
    } else {
      return undefined;
    }
    const marker = quantityApproximationMarker(cursor.tokens[index], this.numeric);
    if (marker === undefined) {
      return undefined;
    }
    return makeAssemblyContentSpan(index, 1, marker.korean, 명사, null, UnitType.CONTENT, {
      renderPlan: { kind: "fixedText", text: marker.korean, koreanPos: 명사 }
    });
  }

  private async contentPass(
    tokens: readonly RuntimeHaruToken[],
    options: ContentPassOptions = {}
  ): Promise<Map<number, AssemblyContentSpan>> {
    const contentMap = new Map<number, AssemblyContentSpan>(options.seedContentMap ?? []);
    const pendingExtentPostpositions = new Map<number, PendingExtentPostposition>();
    const state: ContentPassState = { lastNumeralQuantity: null };
    const numeralContext: NumeralResolutionContext = {
      copulaPredicateStartsAt: (idx) => copulaStartsPredicateAt(tokens, idx, this.lookups)
    };
    const cursor = new TokenCursor(tokens, Math.max(0, Math.min(options.startIndex ?? 0, tokens.length)), tokens.length);
    const ctx: ContentPassContext = { tokens, cursor, contentMap, pendingExtentPostpositions, numeralContext, options };
    while (cursor.pos < cursor.end) {
      const index = cursor.pos;
      const token = cursor.current();
      if (token === undefined) {
        cursor.advance();
        continue;
      }
      if (token.stutterPrefixSuppressed === true) {
        cursor.advance();
        continue;
      }
      const step: ContentPassStep = { index, token, yieldedNumeral: undefined };
      if (this.emitKoreanOverrideSpan(ctx, step) === "continue") {
        continue;
      }
      if (this.emitNandeReasonSplitSpan(ctx, step) === "continue") {
        continue;
      }
      if (this.emitNumeralSpan(ctx, state, step) === "continue") {
        continue;
      }
      if (this.emitQuantityApproximationMarkerSpan(ctx, state, step) === "continue") {
        continue;
      }
      if (await this.emitHeadTailAdapterSpans(ctx, step) === "continue") {
        continue;
      }
      if (this.emitDemonstrativeDiscourseConnectiveSpan(ctx, step) === "continue") {
        continue;
      }
      if (await this.emitHonorificFormulaicTailSpan(ctx, step) === "continue") {
        continue;
      }
      if (this.screenContentPassAdmission(ctx, step) === "continue") {
        continue;
      }
      if (this.emitSemanticCarrierPredicateSpan(ctx, step) === "continue") {
        continue;
      }
      const protoLayout = activeProtoLayout();
      if (this.emitQuoteClauseLikenessMarkerSpan(ctx, step, protoLayout) === "continue") {
        continue;
      }
      if (await this.emitNominalHostLikenessAdverbialMarkerSpan(ctx, step, protoLayout) === "continue") {
        continue;
      }
      if (await this.emitCopulaFocusAdjunctSpan(ctx, step) === "continue") {
        continue;
      }
      const dispatch = await this.dispatchContentPassContentHead(ctx, step, protoLayout);
      const { contentHead, buildHeadTailCandidatePayloadSource } = dispatch;
      if (contentHead?.kind === "nominal") {
        await this.emitContentHeadNominalSpan(ctx, step, contentHead, buildHeadTailCandidatePayloadSource);
        continue;
      }
      const verdict = this.contentHeadTailOwnershipVerdict(ctx, step, contentHead);
      if (contentHead?.kind === "tail" && !verdict.numericYieldClaimMissed && verdict.contestedNominalUseSlot === null) {
        await this.emitContentHeadTailChainSpan(ctx, step, contentHead, buildHeadTailCandidatePayloadSource);
        continue;
      }
      const tailParserFailureReason = this.recordContentHeadDispatchFailure(ctx, step, contentHead, verdict);
      if (this.reclaimYieldedNumeralSpan(ctx, step, tailParserFailureReason) === "continue") {
        continue;
      }
      if (await this.emitCompoundDispatchSpan(ctx, step, tailParserFailureReason) === "continue") {
        continue;
      }
      await this.emitGeneralContentSpan(ctx, step, dispatch, verdict, tailParserFailureReason);
    }
    applySourceCompoundContinuationToContentMap(tokens, contentMap);
    return contentMap;
  }

  private emitKoreanOverrideSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index, token } = step;
    const renderPlan = koreanOverrideRenderPlan(token, 부사);
    if (renderPlan !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "korean_override",
          true,
          { surface: token.surface }
        ));
      }
      const span = makeAssemblyContentSpan(index, 1, token.koreanOverride ?? "", 부사, null, UnitType.CONTENT, { renderPlan });
      finalizeExtentPostpositionSpan(cursor, index, span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, span);
      cursor.advance();
      return "continue";
    }
    return "next";
  }

  private emitNandeReasonSplitSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, options } = ctx;
    const { index } = step;
    const splitNandeReason = trySplitNandeReasonSpan(cursor);
    if (splitNandeReason !== undefined) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "split_nande_reason",
          true,
          { consumed: splitNandeReason.consumed }
        ));
      }
      contentMap.set(index, splitNandeReason);
      return "continue";
    }
    return "next";
  }

  private emitNumeralSpan(
    ctx: ContentPassContext,
    state: ContentPassState,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, numeralContext, options } = ctx;
    const { index } = step;
    const numeral = cursor.tryParse(c => {
      const result = tryContentNumeral(c, this.numeric, numeralContext);
      if (result === undefined) {
        return undefined;
      }
      const copulaStartKind = nounPhraseCopulaPredicateStartKind(
        cursor,
        index,
        this.numeric,
        this.lookups,
        { consumed: result.consumed, plan: result.renderPlan }
      );
      if (
        copulaStartKind !== "none" &&
        !pendingExtentPostpositions.has(index)
      ) {
        step.yieldedNumeral = { reason: "copula_host", result, startKind: copulaStartKind };
        return undefined;
      }
      if (isBareNominalQuoteStart(cursor, index, this.numeric, this.lookups)) {
        step.yieldedNumeral = { reason: "bare_quote", result, startKind: "none" };
        return undefined;
      }
      return result;
    });
    if (numeral !== undefined) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "numeral",
          true,
          { consumed: numeral.consumed }
        ));
      }
      const numeralSpan = makeAssemblyContentSpan(index, numeral.consumed, numeral.korean, 수사, null, UnitType.NUMERAL);
      if (numeral.renderPlan !== null) {
        numeralSpan.renderPlan = numeral.renderPlan;
      }
      finalizeExtentPostpositionSpan(cursor, index, numeralSpan, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, numeralSpan);
      state.lastNumeralQuantity = { endExclusive: index + numeral.consumed, plan: numeral.renderPlan };
      return "continue";
    }
    return "next";
  }

  private emitQuantityApproximationMarkerSpan(
    ctx: ContentPassContext,
    state: ContentPassState,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, options } = ctx;
    const { index, token } = step;
    const approximationMarker = this.quantityApproximationSpanAt(cursor, index, state.lastNumeralQuantity);
    if (approximationMarker !== undefined) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "quantity_approximation_marker",
          true,
          { surface: token.surface }
        ));
      }
      contentMap.set(index, approximationMarker);
      cursor.advance();
      return "continue";
    }
    return "next";
  }

  private async emitHeadTailAdapterSpans(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): Promise<AssemblyLoopSignal> {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const ellipticPropositionQuote = await this.tryBuildEllipticPropositionQuoteTailSpan(cursor);
    if (ellipticPropositionQuote !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "elliptic_proposition_quote_tail",
          true,
          ellipticPropositionQuote.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, ellipticPropositionQuote.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, ellipticPropositionQuote.span);
      return "continue";
    }
    const ellipticPropositionModal = await this.tryBuildEllipticPropositionModalTailSpan(cursor);
    if (ellipticPropositionModal !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "elliptic_proposition_modal_tail",
          true,
          ellipticPropositionModal.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, ellipticPropositionModal.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, ellipticPropositionModal.span);
      return "continue";
    }
    const honorificRequestQuote = await this.tryBuildHonorificRequestQuoteSpan(cursor);
    if (honorificRequestQuote !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "honorific_request_quote",
          true,
          honorificRequestQuote.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, honorificRequestQuote.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, honorificRequestQuote.span);
      return "continue";
    }
    const formulaicApologyPredicate = await this.tryBuildFormulaicApologyPredicateSpan(cursor);
    if (formulaicApologyPredicate !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "formulaic_apology_predicate",
          true,
          formulaicApologyPredicate.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, formulaicApologyPredicate.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, formulaicApologyPredicate.span);
      return "continue";
    }
    const hostlessInterjection = await this.tryBuildHostlessInterjectionSpan(cursor);
    if (hostlessInterjection !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "hostless_interjection",
          true,
          hostlessInterjection.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, hostlessInterjection.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, hostlessInterjection.span);
      return "continue";
    }
    return "next";
  }

  private emitDemonstrativeDiscourseConnectiveSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const demoDiscourse = tryResolveDemoDiscourseConnective(cursor, this.lookups);
    if (demoDiscourse !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "demo_discourse_connective",
          true,
          { key: demoDiscourse.key, reading: demoDiscourse.reading, consumed: demoDiscourse.consumed }
        ));
      }
      const demoDiscourseSpan = makeAssemblyContentSpan(index, demoDiscourse.consumed, demoDiscourse.korean, demoDiscourse.koreanPos, null, UnitType.CONTENT, {
        discourseConnective: demoDiscourse.reading === "connective",
        renderPlan: {
          kind: "lemma",
          entry: null,
          koreanLemma: demoDiscourse.korean,
          koreanPos: demoDiscourse.koreanPos,
          irregular: null,
          auxTokens: []
        }
      });
      finalizeExtentPostpositionSpan(cursor, index, demoDiscourseSpan, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, demoDiscourseSpan);
      return "continue";
    }
    return "next";
  }

  private async emitHonorificFormulaicTailSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): Promise<AssemblyLoopSignal> {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const honorificFormulaicTail = await this.tryBuildHonorificFormulaicTailSpan(cursor);
    if (honorificFormulaicTail !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "honorific_formulaic_tail",
          true,
          honorificFormulaicTail.traceDetail
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, honorificFormulaicTail.span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, honorificFormulaicTail.span);
      return "continue";
    }
    return "next";
  }

  private screenContentPassAdmission(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { tokens, cursor, contentMap, options } = ctx;
    const { index, token } = step;
    const pos0 = token.pos & POS0;
    if (isNonLexicalSymbolTokenAt(cursor.tokens, index)) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "non_lexical_symbol",
          true,
          { surface: token.surface }
        ));
      }
      cursor.advance();
      return "continue";
    }
    if (!isContentAdmissionToken(token)) {
      cursor.advance();
      return "continue";
    }
    if (
      index !== options.resolveDeferredCopulaSupportAt &&
      isCopulaSupportChainStartAt(tokens, index - 1) &&
      !contentSpanCoversIndex(contentMap, index - 1)
    ) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "detached_copula_support_deferred",
          true,
          { surface: token.surface }
        ));
      }
      cursor.advance();
      return "continue";
    }
    if (options.trace !== undefined && options.trace !== null) {
      options.trace.record(new TraceEvent(
        index,
        "content_pass",
        "content_pos",
        true,
        { pos0: POS0_NAME[pos0] ?? "*" }
      ));
    }
    return "next";
  }

  private emitSemanticCarrierPredicateSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const semanticCarrierStart = cursor.pos;
    const semanticCarrierPredicate = tryBuildSemanticCarrierPredicateDispatchCursor(cursor, this.lookups);
    if (semanticCarrierPredicate !== null) {
      const semanticCarrierConsumed = cursor.pos - semanticCarrierStart;
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          semanticCarrierPredicate.rule,
          true,
          {
            consumed: semanticCarrierConsumed,
            ...semanticCarrierPredicate.traceDetail
          }
        ));
      }
      const span = makeAssemblyContentSpan(
        index,
        semanticCarrierConsumed,
        "",
        semanticCarrierPredicate.koreanPos,
        null,
        UnitType.CONTENT,
        {
          provenance: "predicate_tail"
        }
      );
      span.renderPlan = semanticCarrierPredicate.renderPlan;
      finalizeExtentPostpositionSpan(cursor, index, span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, span);
      return "continue";
    }
    return "next";
  }

  private emitQuoteClauseLikenessMarkerSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    protoLayout: ProtoClauseLayout | null
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const quoteClauseLikenessMarker = this.tryBuildQuoteClauseLikenessMarkerSpan(cursor, protoLayout);
    if (quoteClauseLikenessMarker !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "quote_clause_likeness_marker",
          true,
          { consumed: quoteClauseLikenessMarker.consumed }
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, quoteClauseLikenessMarker, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, quoteClauseLikenessMarker);
      cursor.advance(quoteClauseLikenessMarker.consumed);
      return "continue";
    }
    return "next";
  }

  private async emitNominalHostLikenessAdverbialMarkerSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    protoLayout: ProtoClauseLayout | null
  ): Promise<AssemblyLoopSignal> {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const nominalHostLikenessAdverbialMarker = await this.tryBuildNominalHostLikenessAdverbialMarkerSpan(cursor, protoLayout);
    if (nominalHostLikenessAdverbialMarker !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "nominal_host_likeness_adverbial_marker",
          true,
          { consumed: nominalHostLikenessAdverbialMarker.consumed }
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, nominalHostLikenessAdverbialMarker, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, nominalHostLikenessAdverbialMarker);
      cursor.advance(nominalHostLikenessAdverbialMarker.consumed);
      return "continue";
    }
    return "next";
  }

  private async emitCopulaFocusAdjunctSpan(
    ctx: ContentPassContext,
    step: ContentPassStep
  ): Promise<AssemblyLoopSignal> {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const copulaFocusAdjunct = await this.tryBuildCopulaFocusAdjunctSpan(cursor);
    if (copulaFocusAdjunct !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "copula_focus_adjunct",
          true,
          { consumed: copulaFocusAdjunct.consumed }
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, copulaFocusAdjunct, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, copulaFocusAdjunct);
      cursor.advance(copulaFocusAdjunct.consumed);
      return "continue";
    }
    return "next";
  }

  private async dispatchContentPassContentHead(
    ctx: ContentPassContext,
    step: ContentPassStep,
    protoLayout: ProtoClauseLayout | null
  ): Promise<ContentHeadDispatchOutcome> {
    const { tokens, cursor } = ctx;
    const { index } = step;
    const contentHeadLimit = contentHeadDispatchLimit(tokens, index, protoLayout);
    const buildHeadTailCandidatePayloadSource = (tailCandidateChunk: Extract<TailChunkResult, { readonly ok: true }>) =>
      buildTailOwnerCandidatePayloadSource({
        tokens,
        cursor,
        index,
        tailChunk: tailCandidateChunk,
        dictionary: this.dictionary,
        lookups: this.lookups,
        numeric: this.numeric,
        resolveHeadMetadata: async (start, end) => contentHeadMetadataFromResult(await this._processContent(cursor.fork(start, end, start), {
          trace: null,
          entryAuxMode: "head_metadata"
        })),
        isKeijoujiVerbObjectHost
      });
    const skipContentHeadForAdverbialNi = await this.shouldUseCandidatePathForLexicalizedAdverbialNi(tokens, index);
    const currentToken = tokens[index];
    const skipContentHeadForLayeredNegativeBridge = currentToken !== undefined &&
      (pos0in(currentToken.pos, NOMINAL_BITS) || isNaAdjCapableNoun(currentToken)) &&
      focusBodyOverNegativeScopeBridgeAt(tokens, index);
    const contentHead = skipContentHeadForAdverbialNi || skipContentHeadForLayeredNegativeBridge
      ? null
      : await tryBuildContentHeadDispatch({
        cursor,
        limit: contentHeadLimit,
        dictionary: this.dictionary,
        previewFormal: REGISTER_NEUTRAL_BUILD_FORMAL,
        lookups: this.lookups,
        numeric: this.numeric,
        ...(step.yieldedNumeral === undefined
          ? {}
          : {
            numericHostReservation: {
              tokenIdx: index,
              consumed: step.yieldedNumeral.result.consumed,
              plan: step.yieldedNumeral.result.renderPlan,
              claimRequired: step.yieldedNumeral.reason === "copula_host" &&
                step.yieldedNumeral.startKind === "numeral_span"
            }
          }),
        ...(protoLayout === null ? {} : { layout: protoLayout }),
        synthesizeEntry: async (headToken, synthOptions) => {
          const headPos0 = headToken.pos & POS0;
          const splitFallback = pos0in(headPos0, NONPREDICATE_CONTENT_POS_BITS)
            ? await this._renderSplitFallback(headToken)
            : undefined;
          if (splitFallback !== undefined) {
            const synthEntry: MorphemeEntry = {
              dictionaryForm: headToken.dictionaryForm,
              senses: [{
                korean: splitFallback,
                koreanPos: JP_POS_TO_KR[headPos0] ?? 명사
              }],
              synthetic: true,
              syntheticReason: "split_fallback"
            };
            return synthEntry;
          }
          return this._synthesizeEntry(headToken, { nextToken: synthOptions?.nextToken ?? null });
        },
        resolveNominalHeadMetadata: (start, end) => this._processContent(cursor.fork(start, end, start), {
          trace: null,
          entryAuxMode: "head_metadata"
        }),
        hydrateTailRoot: (root, headResult, predicateTokenIdx) =>
          hydrateTailChainRootWithHeadMetadata(
            root,
            headResult,
            tokens,
            cursor,
            predicateTokenIdx,
            this.dictionary,
            this.lookups,
            this.numeric
          )
      });
    return { contentHead, buildHeadTailCandidatePayloadSource };
  }

  private async emitContentHeadNominalSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    contentHead: Extract<ContentHeadDispatchResult, { readonly kind: "nominal" }>,
    buildHeadTailCandidatePayloadSource: ContentHeadTailPayloadSourceBuilder
  ): Promise<void> {
    const { tokens, cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const payload = contentHeadDispatchNominalAppendPayload(contentHead);
    attachContentHeadSharedHeadTailCandidateToPlan(contentHead, payload.renderPlan);
    const nominalRoot = isNominalHeadTailChainRenderPlan(payload.renderPlan)
      ? payload.renderPlan.realization.root
      : null;
    const absorptionStart = nominalRoot?.kind === "predicateNominalHost"
      ? tailChainPreviousSahenNounAbsorptionStart(
          nominalRoot.host.root,
          nominalRoot.host.predicateTokenIdx
        )
      : null;
    const spanStart = absorptionStart ?? index;
    const span = makeAssemblyContentSpan(
      spanStart,
      payload.consumed + index - spanStart,
      payload.korean,
      payload.koreanPos,
      payload.entry,
      payload.unitType,
      {
        attachLeft: payload.attachLeft,
        provenance: payload.provenance,
        koreanBase: payload.koreanBase ?? null
      }
    );
    await attachContentHeadOwnerCandidateLifecycle({
      tokens,
      dispatchIndex: index,
      selectedSpanStart: spanStart,
      contentHead,
      span,
      selectedNominalPayload: payload,
      buildTailPayloadSource: buildHeadTailCandidatePayloadSource
    });
    if (options.trace !== undefined && options.trace !== null) {
      options.trace.record(new TraceEvent(
        index,
        "content_pass",
        contentHead.built.profile.traceKind ?? contentHead.built.profile.id,
        true,
        {
          consumed: payload.consumed,
          head_profile: contentHead.built.profile.id,
          ...contentHeadDispatchTraceDetail(contentHead)
        }
      ));
    }
    finalizeExtentPostpositionSpan(cursor, spanStart, span, pendingExtentPostpositions, this.numeric);
    contentMap.set(spanStart, span);
    cursor.advance(payload.consumed);
  }

  private contentHeadTailOwnershipVerdict(
    ctx: ContentPassContext,
    step: ContentPassStep,
    contentHead: ContentHeadDispatchResult | null
  ): ContentHeadTailOwnershipVerdict {
    const { tokens } = ctx;
    const { index } = step;
    const numericYieldClaimMissed = contentHead?.kind === "tail" &&
      step.yieldedNumeral?.reason === "copula_host" &&
      step.yieldedNumeral.startKind === "numeral_span" &&
      probeProductionDispatch(contentHead.tailChunk.root, {
        intake: { site: "committed_render", partial: false }
      }).kind !== "registry";
    const contestedNominalUseSlot = contentHead?.kind === "tail"
      ? contentHead.tailChunk.contestedNominalUseSlot ?? null
      : null;
    const contestedClaimCoordinate = contestedNominalUseSlot !== null ||
      isContestedZeroTailClaimCoordinate(tokens, index, this.numeric, this.lookups);
    return { numericYieldClaimMissed, contestedNominalUseSlot, contestedClaimCoordinate };
  }

  private async emitContentHeadTailChainSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    contentHead: Extract<ContentHeadDispatchResult, { readonly kind: "tail" }>,
    buildHeadTailCandidatePayloadSource: ContentHeadTailPayloadSourceBuilder
  ): Promise<void> {
    const { tokens, cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const selectedHeadTailCandidate = contentHeadSelectedHeadTailCandidate(contentHead);
    const selectedTailRealization = selectedHeadTailCandidate?.tail.realization;
    const selectedTailPlan = selectedHeadTailCandidate != null && selectedTailRealization?.kind === "predicate_root"
      ? { root: selectedTailRealization.root, sourceSpan: selectedHeadTailCandidate.tail.sourceSpan }
      : null;
    const tailChunk = contentHead.tailChunk;
    const headResult = await this._processContent(cursor.fork(index, tokens.length, index), {
      trace: null,
      entryAuxMode: "head_metadata"
    });
    const headMetadata = contentHeadMetadataFromResult(headResult);
    const tailBridge = await buildContentHeadTailAssemblyBridge({
      tokens,
      cursor,
      index,
      tailChunk,
      selectedTailPlan,
      headResult: headMetadata,
      dictionary: this.dictionary,
      lookups: this.lookups,
      numeric: this.numeric,
      isKeijoujiVerbObjectHost
    });
    if (options.trace !== undefined && options.trace !== null) {
      recordTailChainContentPassTrace({
        trace: options.trace,
        tokens,
        cursor,
        root: tailBridge.root,
        start: index,
        consumed: tailChunk.consumed,
        predicateTokenIdx: tailChunk.predicateTokenIdx,
        blocker: tailBridge.kind === "blocked" ? tailBridge.readinessBlocker : null,
        outgoingBoundary: tailChunk.outgoingBoundary,
        headProfileId: tailChainHeadProfile(tailChunk)?.id ?? null,
        dispatchTraceDetail: contentHeadDispatchTraceDetail(contentHead),
        commitmentCandidateCount: tailBridge.kind === "ready" ? candidateSetSize(tailBridge.descriptor.sourceCandidates) : null,
        ...(tailChunk.candidateObservation === undefined ? {} : { candidateObservation: tailChunk.candidateObservation }),
        lookups: this.lookups
      });
    }
    if (tailBridge.kind === "blocked") {
      await this.emitTailReadinessBlockedFallbackSpan(ctx, step, tailBridge);
      return;
    }
    const spanStart = tailBridge.spanStart;
    const tailDescriptor = tailBridge.descriptor;
    attachContentHeadSharedHeadTailCandidateToPlan(contentHead, tailDescriptor.renderPlan);
    const span = this.makeTailChainSpanFromDescriptor(tokens, spanStart, tailDescriptor);
    await attachContentHeadOwnerCandidateLifecycle({
      tokens,
      dispatchIndex: index,
      selectedSpanStart: spanStart,
      contentHead,
      span,
      selectedTailDescriptor: tailDescriptor,
      buildTailPayloadSource: buildHeadTailCandidatePayloadSource
    });
    finalizeExtentPostpositionSpan(cursor, spanStart, span, pendingExtentPostpositions, this.numeric);
    contentMap.set(spanStart, span);
    cursor.advance(tailChunk.consumed);
  }

  private async emitTailReadinessBlockedFallbackSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    tailBridge: Extract<Awaited<ReturnType<typeof buildContentHeadTailAssemblyBridge>>, { readonly kind: "blocked" }>
  ): Promise<void> {
    const { tokens, cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const result = await this._processContent(cursor.fork(index, tokens.length, index), {
      trace: options.trace ?? null
    });
    const cacheKorean = PipelineAssemblerMixin.shouldCacheSurface(result.renderPlan);
    const realizedKorean = cacheKorean ? this.surfaceFromRenderPlan(contentResultKoreanCache(result), result.renderPlan) : "";
    const descriptor = buildTailParserFallbackAssemblyDescriptor({
      cursor: cursor.fork(index, cursor.end, index),
      result,
      reason: tailBridge.readinessBlocker,
      mode: "readiness_blocker",
      realizedKorean,
      cacheKorean,
      isKeijoujiVerbObjectHost,
      lookups: this.lookups
    });
    const span = applyTailParserFallbackDescriptorToSpan(descriptor, index, tokens, this.lookups);
    finalizeExtentPostpositionSpan(cursor, index, span, pendingExtentPostpositions, this.numeric);
    contentMap.set(index, span);
    cursor.advance(descriptor.consumed);
  }

  private recordContentHeadDispatchFailure(
    ctx: ContentPassContext,
    step: ContentPassStep,
    contentHead: ContentHeadDispatchResult | null,
    verdict: ContentHeadTailOwnershipVerdict
  ): string {
    const { tokens, options } = ctx;
    const { index } = step;
    const { numericYieldClaimMissed, contestedNominalUseSlot } = verdict;
    const tailParserFailureReason = numericYieldClaimMissed
      ? "numeric host yield reclaimed: tail chain did not claim a production family"
      : contestedNominalUseSlot !== null
        ? `contested bare-stem nominal-use claim (${contestedNominalUseSlot}): content lane owns the span until the slot verdict decides`
        : contentHead?.kind === "none"
          ? contentHead.reason
          : "content head dispatch skipped for copula negation owner";
    if (options.trace !== undefined && options.trace !== null) {
      recordTailParserFailureTrace({
        trace: options.trace,
        tokens,
        index,
        reason: tailParserFailureReason,
        ...(contentHead?.kind === "none"
          ? { dispatchTraceDetail: contentHeadDispatchFailureTraceDetail(contentHead) }
          : {})
      });
    }
    return tailParserFailureReason;
  }

  private reclaimYieldedNumeralSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    tailParserFailureReason: string
  ): AssemblyLoopSignal {
    const { cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    if (
      step.yieldedNumeral !== undefined &&
      (step.yieldedNumeral.reason === "bare_quote" || step.yieldedNumeral.startKind === "numeral_span")
    ) {
      const reclaimed = step.yieldedNumeral.result;
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "numeral",
          true,
          {
            consumed: reclaimed.consumed,
            yield_reason: step.yieldedNumeral.reason,
            tail_parser_reason: tailParserFailureReason
          }
        ));
      }
      const reclaimedSpan = makeAssemblyContentSpan(index, reclaimed.consumed, reclaimed.korean, 수사, null, UnitType.NUMERAL);
      if (reclaimed.renderPlan !== null) {
        reclaimedSpan.renderPlan = reclaimed.renderPlan;
      }
      finalizeExtentPostpositionSpan(cursor, index, reclaimedSpan, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, reclaimedSpan);
      cursor.advance(reclaimed.consumed);
      return "continue";
    }
    return "next";
  }

  private async emitCompoundDispatchSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    tailParserFailureReason: string
  ): Promise<AssemblyLoopSignal> {
    const { tokens, cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const compound = await this.tryCompoundDispatch(cursor);
    if (compound !== undefined) {
      const [consumed, korean, koreanPos, renderPlan, warnings, candidates] = compound;
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "compound",
          true,
          { consumed, korean_pos: koreanPos, tail_parser_reason: tailParserFailureReason }
        ));
      }
      const shouldCacheKorean = PipelineAssemblerMixin.shouldCacheSurface(renderPlan);
      const cachedKorean = shouldCacheKorean ? this.surfaceFromRenderPlan(korean, renderPlan) : "";
      const provenanceBridge = buildTailParserFailureFallbackProvenance({
        tokens,
        cursor,
        index,
        consumed,
        renderPlan,
        reason: tailParserFailureReason,
        lookups: this.lookups
      });
      const span = makeAssemblyContentSpan(
        index,
        consumed,
        cachedKorean,
        koreanPos,
        null,
        UnitType.CONTENT,
        {
          attachLeft: isSahenBoundVerbAfterSahen(tokens, index) && !renderPlanStartsWithShortNegation(renderPlan),
          provenance: provenanceBridge.provenance,
          provenanceReason: provenanceBridge.provenanceReason,
          warnings: warnings ?? []
        }
      );
      span.renderPlan = renderPlan ?? null;
      if (candidates !== undefined && candidates.length > 0) {
        span.sourceCandidates = createSourceCandidateSet(
          candidates.map((candidate) => stagedCandidate(candidate, "unknown")),
          { sharedConsumed: consumed }
        );
      }
      span.compoundHeadFrameEntry = await this.compoundSemanticHeadEntry(tokens, index, renderPlan ?? null);
      closeUnownedTailFallbackSpanToRaw(span, tokens);
      finalizeExtentPostpositionSpan(cursor, index, span, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, span);
      return "continue";
    }
    return "next";
  }

  private async emitGeneralContentSpan(
    ctx: ContentPassContext,
    step: ContentPassStep,
    dispatch: ContentHeadDispatchOutcome,
    verdict: ContentHeadTailOwnershipVerdict,
    tailParserFailureReason: string
  ): Promise<void> {
    const { tokens, cursor, contentMap, pendingExtentPostpositions, options } = ctx;
    const { index } = step;
    const { contentHead, buildHeadTailCandidatePayloadSource } = dispatch;
    const { numericYieldClaimMissed, contestedNominalUseSlot, contestedClaimCoordinate } = verdict;
    const result = await this._processContent(cursor.fork(index, tokens.length, index), {
      trace: options.trace ?? null,
      contentMap
    });
    const prenominalModifierSpan = this.tryBuildModifiedHeadPrenominalModifierSpan(tokens, index, result);
    if (prenominalModifierSpan !== null) {
      if (options.trace !== undefined && options.trace !== null) {
        options.trace.record(new TraceEvent(
          index,
          "content_pass",
          "modified_head_prenominal_modifier",
          true,
          { consumed: result.consumed, korean_pos: contentResultKoreanPos(result) }
        ));
      }
      finalizeExtentPostpositionSpan(cursor, index, prenominalModifierSpan, pendingExtentPostpositions, this.numeric);
      contentMap.set(index, prenominalModifierSpan);
      cursor.advance(result.consumed);
      return;
    }
    const cacheKorean = PipelineAssemblerMixin.shouldCacheSurface(result.renderPlan);
    const realizedKorean = cacheKorean ? this.surfaceFromRenderPlan(contentResultKoreanCache(result), result.renderPlan) : "";
    const predicateIntake = !numericYieldClaimMissed && contestedNominalUseSlot === null && contentHead?.kind === "none"
      ? contentHead.predicateIntake
      : undefined;
    const descriptor = buildTailParserFallbackAssemblyDescriptor({
      cursor: cursor.fork(index, cursor.end, index),
      result,
      reason: tailParserFailureReason,
      mode: contestedClaimCoordinate ? "contested_claim_yield" : "parse_failure",
      ...(predicateIntake === undefined ? {} : { predicateIntake }),
      realizedKorean,
      cacheKorean,
      isKeijoujiVerbObjectHost,
      lookups: this.lookups
    });
    const span = applyTailParserFallbackDescriptorToSpan(descriptor, index, tokens, this.lookups);
    const intrinsicHonorific = selectedIntrinsicHonorificMetadata(result.sourceCandidates, result.entry);
    if (intrinsicHonorific !== undefined) span.intrinsicHonorific = intrinsicHonorific;
    if (contestedNominalUseSlot !== null && contentHead?.kind === "tail") {
      await attachContestedNominalUseOwnerCandidateLifecycle({
        tokens,
        dispatchIndex: index,
        contentHead,
        contestedNominalUseSlot,
        span,
        buildTailPayloadSource: buildHeadTailCandidatePayloadSource
      });
    }
    finalizeExtentPostpositionSpan(cursor, index, span, pendingExtentPostpositions, this.numeric);
    contentMap.set(index, span);
    cursor.advance(descriptor.consumed);
  }

  private descriptorToSpan(
    tokens: readonly RuntimeHaruToken[],
    index: number,
    result: { readonly descriptor: TailChainAssemblyDescriptor; readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue } } | null
  ): {
    readonly span: AssemblyContentSpan;
    readonly traceDetail: { readonly [key: string]: RuleTraceDetailValue };
  } | null {
    if (result === null) {
      return null;
    }
    return {
      span: this.makeTailChainSpanFromDescriptor(tokens, index, result.descriptor),
      traceDetail: result.traceDetail
    };
  }

  private async tryBuildEllipticPropositionQuoteTailSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ) {
    const { tokens, pos: index } = cursor;
    const result = this.descriptorToSpan(tokens, index, await buildEllipticPropositionQuoteTailDescriptor({
      tokens, cursor, index, dictionary: this.dictionary, previewFormal: REGISTER_NEUTRAL_BUILD_FORMAL,
      lookups: this.lookups, numeric: this.numeric, isKeijoujiVerbObjectHost
    }));
    if (result !== null) cursor.advance(result.span.consumed);
    return result;
  }

  private async tryBuildEllipticPropositionModalTailSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ) {
    const { tokens, pos: index } = cursor;
    if (tryResolveDemoDiscourseConnective(cursor.fork(index, cursor.end, index), this.lookups)?.reading === "connective") {
      return null;
    }
    const result = this.descriptorToSpan(tokens, index, await buildEllipticPropositionModalTailDescriptor({
      tokens, cursor, index, dictionary: this.dictionary, previewFormal: REGISTER_NEUTRAL_BUILD_FORMAL,
      lookups: this.lookups, numeric: this.numeric, isKeijoujiVerbObjectHost
    }));
    if (result !== null) cursor.advance(result.span.consumed);
    return result;
  }

  private async tryBuildHonorificRequestQuoteSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ) {
    const { tokens, pos: index } = cursor;
    const result = this.descriptorToSpan(tokens, index, await buildHonorificRequestQuoteTailDescriptor({
      tokens, cursor, index, dictionary: this.dictionary, lookups: this.lookups, numeric: this.numeric,
      resolveHeadMetadata: async (start, end) => contentHeadHydrationMetadataFromResult(
        await this._processContent(cursor.fork(start, end, start), { trace: null, entryAuxMode: "head_metadata" })
      ),
      isKeijoujiVerbObjectHost
    }));
    if (result !== null) cursor.advance(result.span.consumed);
    return result;
  }

  private async tryBuildHonorificFormulaicTailSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ) {
    const { tokens, pos: index } = cursor;
    const result = this.descriptorToSpan(tokens, index, await buildHonorificFormulaicTailDescriptor({
      tokens, cursor, index, dictionary: this.dictionary, lookups: this.lookups, numeric: this.numeric,
      resolveHeadMetadata: async (start, end) => contentHeadHydrationMetadataFromResult(
        await this._processContent(cursor.fork(start, end, start), { trace: null, entryAuxMode: "head_metadata" })
      ),
      isKeijoujiVerbObjectHost
    }));
    if (result !== null) cursor.advance(result.span.consumed);
    return result;
  }

  private async tryBuildFormulaicApologyPredicateSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ) {
    const { tokens, pos: index } = cursor;
    const result = this.descriptorToSpan(tokens, index, await buildFormulaicApologyPredicateDescriptor({
      tokens, cursor, index, dictionary: this.dictionary, lookups: this.lookups,
      numeric: this.numeric, isKeijoujiVerbObjectHost
    }));
    if (result !== null) cursor.advance(result.span.consumed);
    return result;
  }

  private async tryBuildHostlessInterjectionSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ): Promise<{ readonly span: AssemblyContentSpan; readonly traceDetail: { readonly [key: string]: string | number } } | null> {
    const index = cursor.pos;
    const resolution = resolveHostlessInterjectionAt(activeProtoLayout()?.hostlessInterjectionAt(index));
    if (resolution === null || index + resolution.consumed > cursor.end) {
      return null;
    }
    const entry = committedLookupEntry(await this.dictionary.lookup(
      resolution.lexeme.dictionaryForm,
      resolution.lexeme.reading,
      HOSTLESS_INTERJECTION_LEXEME_POS
    ));
    const korean = entry === null ? undefined : winnerKorean(entry);
    if (entry === null || korean === undefined || korean.length === 0) {
      return null;
    }
    const koreanPos = winnerKoreanPos(entry, 감탄사);
    const span = makeAssemblyContentSpan(index, resolution.consumed, korean, koreanPos, entry, UnitType.CONTENT, {
      provenanceReason: `hostless_interjection:${resolution.key}`,
      renderPlan: {
        kind: "lemma",
        entry,
        koreanLemma: korean,
        koreanPos,
        irregular: null,
        auxTokens: []
      }
    });
    cursor.advance(resolution.consumed);
    return {
      span,
      traceDetail: {
        key: resolution.key,
        consumed: resolution.consumed,
        realization: resolution.realization,
        lexeme: resolution.lexeme.dictionaryForm
      }
    };
  }

  private makeTailChainSpanFromDescriptor(
    tokens: readonly RuntimeHaruToken[],
    index: number,
    descriptor: TailChainAssemblyDescriptor
  ): AssemblyContentSpan {
    const span = makeAssemblyContentSpan(
      index,
      descriptor.consumed,
      descriptor.korean,
      descriptor.koreanPos ?? 명사,
      descriptor.entry,
      descriptor.unitType,
      {
        attachLeft: descriptor.attachLeft,
        provenance: descriptor.provenance,
        warnings: descriptor.warnings
      }
    );
    span.renderPlan = descriptor.renderPlan;
    span.renderPlanPolicy = descriptor.renderPlanPolicy;
    span.voice = descriptor.voice;
    span.rareruReadings = descriptor.rareruReadings;
    span.nareruReadings = descriptor.nareruReadings;
    span.dekiruReadings = descriptor.dekiruReadings;
    span.hasNegative = descriptor.hasNegative;
    span.hasCausative = descriptor.hasCausative;
    span.hasCausativePassive = descriptor.hasCausativePassive;
    span.hasRequestTail = descriptor.hasRequestTail;
    span.hasBenefactiveTail = descriptor.hasBenefactiveTail;
    span.isKeijoujiVerbPredicate = descriptor.isKeijoujiVerbPredicate;
    span.benefactive = descriptor.benefactive;
    span.connectiveRole = descriptor.connectiveRole;
    if (candidateSetSize(descriptor.sourceCandidates) > 0) {
      span.sourceCandidates = descriptor.sourceCandidates;
    }
    const intrinsicHonorific = selectedIntrinsicHonorificMetadata(descriptor.sourceCandidates, descriptor.entry);
    if (intrinsicHonorific !== undefined) span.intrinsicHonorific = intrinsicHonorific;
    return span;
  }

  private async tryCompoundDispatch(
    cursor: TokenCursor<RuntimeHaruToken>
  ): Promise<CompoundResult | undefined> {
    const compound = this as unknown as PipelineCompoundResolver & PipelineCompoundMixin;
    const dispatchCursor = () => cursor.fork(cursor.pos, cursor.end, cursor.pos);
    const processors = [
      () => compound.processVerbAdjSuffix(dispatchCursor()),
      () => compound.processNounCopulaNoNiConcessive(dispatchCursor()),
      () => compound.processGaruCompound(dispatchCursor()),
      () => compound.processAdverbToSuru(dispatchCursor()),
      () => compound.processTari(dispatchCursor()),
      () => compound.processStatePredicateRenyouAuxTokens(dispatchCursor()),
      () => compound.processStandaloneStateChangeNaru(dispatchCursor()),
      () => compound.processVirtualCompoundDictionaryEntry(dispatchCursor()),
      () => compound.processSugiruCompound(dispatchCursor()),
      () => compound.processUruPotentialCompound(dispatchCursor()),
      () => compound.processColloquialIntensiveCompound(dispatchCursor()),
      () => compound.processReciprocalAuCompound(dispatchCursor()),
      () => compound.processTailOnlyProductiveCompound(dispatchCursor()),
      () => compound.processKnownCompoundVerbCandidate(dispatchCursor())
    ] as const;
    for (const processor of processors) {
      const result = await processor();
      if (result !== null) {
        cursor.advance(result[0]);
        return result;
      }
    }
    return undefined;
  }

  private async compoundSemanticHeadEntry(
    tokens: readonly RuntimeHaruToken[],
    index: number,
    renderPlan: RenderPlan | null
  ): Promise<MorphemeEntry | null> {
    if (
      renderPlan === null ||
      !(renderPlan.kind === "legacySurfaceComposition" && renderPlan.prefixCarrierAuxiliaryLemma !== undefined && renderPlan.prefixCarrierAuxiliaryLemma !== null)
    ) {
      return null;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(tokens[index]!);
    if (entry === undefined) {
      return null;
    }
    if (!entry.senses?.some((translation) => {
      const slotRealization = translation.senseSlotRealization;
      return slotRealization !== undefined && slotRealization !== null && typeof slotRealization === "object" && !Array.isArray(slotRealization);
    })) {
      return null;
    }
    return resolveContext(entry, tokens, index, { lookups: this.lookups, numeric: this.numeric });
  }

  private async nominalLightVerbProjectionAt(
    cursor: TokenCursor<RuntimeHaruToken>,
    nounSpan: AssemblyContentSpan,
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout
  ): Promise<NominalLightVerbProjection | null> {
    const link = nominalLightVerbObjectLinkAt(cursor.tokens, cursor.pos, nounSpan.consumed, contentMap, layout);
    if (link === null) {
      return null;
    }
    const carrier = lookupCarrierIdiom(nounSpan, "を", link.predicateDictForm);
    if (carrier !== null) {
      const renderPlan = rewriteCarrierIdiomRenderPlan(link.predicateSpan.renderPlan, carrier);
      if (renderPlan === undefined) {
        return null;
      }
      return {
        kind: "carrier",
        predicateIndex: link.predicateIndex,
        particleIndex: link.particleIndex,
        entry: carrier,
        renderPlan
      };
    }
    return null;
  }

  private async assemblyPass(
    tokens: readonly RuntimeHaruToken[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    options: {
      readonly trace?: TraceCollector | null;
      readonly relationRenderSpans?: readonly { readonly start: number; readonly endExclusive: number }[];
    } = {}
  ): Promise<TranslationUnit[]> {
    const relationRenderSpans = options.relationRenderSpans ?? [];
    const units: TranslationUnit[] = [];
    const repairedContentMap = new Map<number, AssemblyContentSpan>();
    const carrierOverrides = new Map<number, NominalLightVerbCarrierProjection>();
    const cursor = new TokenCursor(tokens, 0, tokens.length);
    const ctx: AssemblyPassContext = {
      cursor,
      units,
      contentMap,
      repairedContentMap,
      carrierOverrides,
      layout,
      relationRenderSpans,
      options
    };
    while (cursor.current() !== undefined) {
      const index = cursor.pos;
      const span = repairedContentMap.get(index) ?? contentMap.get(index);
      if (span !== undefined) {
        await this.appendAssemblyContentSpanUnit(ctx, index, span);
        continue;
      }
      const token = cursor.current()!;
      if (token === undefined) {
        cursor.advance();
        continue;
      }
      if (token.stutterPrefixSuppressed === true) {
        cursor.advance();
        continue;
      }
      const pos0 = token.pos & POS0;
      if (isNonLexicalSymbolTokenAt(cursor.tokens, index)) {
        this.appendNonLexicalSymbolUnit(ctx, index, token);
        continue;
      }
      if (pos0in(pos0, PASSTHROUGH_POS_BITS) && !isSymbolCharacterToken(token)) {
        this.appendPassthroughSymbolUnit(ctx, index, token);
        continue;
      }
      if ((token.pos & POS0) === 助詞) {
        if (await this.applyAssemblyParticlePrelude(ctx, index, token) === "continue") {
          continue;
        }
      }
      const quoteMarker = quoteMarkerRelationAt(cursor.tokens, index, { consumers: ["assembler"] });
      if (quoteMarker?.canonicalSurface === "と" && (token.pos & POS01) === 助詞_格助詞) {
        if (await this.handleToKakuParticle(cursor, units, contentMap, layout, options.trace)) {
          continue;
        }
      }
      if ((token.pos & POS01) === 助詞_格助詞) {
        if (await this.tryDispatchKakuParticle(
          token.surface,
          cursor,
          units,
          contentMap,
          layout,
          options.trace
        )) {
          continue;
        }
      }
      if ((token.pos & POS0) === 助詞) {
        if (await this.handleAssemblyParticleSpecial(cursor, units, contentMap, layout, options.trace)) {
          continue;
        }
      }
      if ((token.pos & POS0) === 助動詞) {
        if (this.applyResidualAuxiliaryCopulaOwners(ctx, index, token) === "continue") {
          continue;
        }
        if (await this.matchPronominalNoAuxDeDispatch(cursor, units, options.trace)) {
          continue;
        }
        this.assembleResidualCopulaTail(ctx, index, token);
        continue;
      }
      if ((token.pos & POS0) === 接頭辞) {
        await this.appendAssemblyPrefixUnit(ctx, index, token);
        continue;
      }
      if ((token.pos & POS0) === 接尾辞) {
        if (this.applyHonorificClusterSuffix(ctx, index) === "continue") {
          continue;
        }
        await this.appendLexicalSuffixUnit(ctx, index, token);
        continue;
      }
      const repairedConsumed = await this.tryAppendRepairedContentSpan(
        cursor,
        units,
        contentMap,
        repairedContentMap,
        layout,
        options
      );
      if (repairedConsumed !== null) {
        cursor.advance(repairedConsumed);
        continue;
      }
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, token.surface, {
        unitType: UnitType.CONTENT
      });
      cursor.advance();
    }
    this.absorbUncoveredAssemblyTokens(cursor.tokens, units, contentMap, layout);
    return units;
  }

  private async appendAssemblyContentSpanUnit(
    ctx: AssemblyPassContext,
    index: number,
    span: AssemblyContentSpan
  ): Promise<void> {
    const { cursor, units, contentMap, layout, carrierOverrides, relationRenderSpans, options } = ctx;
    const nominalLightVerb = await this.nominalLightVerbProjectionAt(cursor, span, contentMap, layout);
    if (nominalLightVerb !== null) {
      carrierOverrides.set(nominalLightVerb.predicateIndex, nominalLightVerb);
    }
    const surface = cursor.current()?.surface;
    const pos1 = (cursor.current()?.pos ?? 0) & POS1;
    if (surface === "だけでなく" || (surface === "だけ" && (pos1 === 副助詞))) {
      if (await this.matchFocusDakeCopulaTail(cursor, units, options.trace)) {
        return;
      }
    }
    if ((cursor.current()!.pos & POS0) === 助動詞 && span.discourseConnective !== true) {
      if (this.tryApplyParticlePhraseCopulaChain(cursor, units, layout, relationRenderSpans)) {
        return;
      }
      if (this.tryApplyPunctuatedCopulaChain(cursor, units, layout, relationRenderSpans)) {
        return;
      }
    }
    const carrierOverride = carrierOverrides.get(index);
    const baseRenderPlan = applyCopulaFocusAdjunctRenderPlan(
      carrierOverride === undefined ? span.renderPlan : carrierOverride.renderPlan,
      span
    );
    const renderPlan = applyBareQuestionRenderPlan(baseRenderPlan, cursor.tokens, index + span.consumed, cursor.end);
    const shouldCacheKorean = PipelineAssemblerMixin.shouldCacheSurface(renderPlan);
    const shouldCacheBaseKorean = PipelineAssemblerMixin.shouldCacheBaseSurface(renderPlan);
    const realizedKorean = shouldCacheKorean || shouldCacheBaseKorean
      ? this.surfaceFromRenderPlan(span.korean, renderPlan)
      : "";
    const cachedKorean = shouldCacheKorean ? realizedKorean : "";
    const cachedBaseKorean = shouldCacheBaseKorean ? realizedKorean : span.koreanBase ?? "";
    PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, span.consumed, cachedKorean, {
      unitType: span.unitType,
      koreanPos: span.koreanPos,
      entry: span.entry,
      renderPlan,
      koreanBase: cachedBaseKorean,
      attachLeft: span.attachLeft,
      particleRole: span.particleRole,
      provenance: span.provenance,
      discourseConnective: span.discourseConnective,
      provenanceReason: carrierOverride === undefined ? span.provenanceReason : "carrier_idiom",
      warnings: span.warnings,
      renderPlanPolicy: span.renderPlanPolicy
    });
    cursor.advance(span.consumed);
  }

  private appendNonLexicalSymbolUnit(ctx: AssemblyPassContext, index: number, token: RuntimeHaruToken): void {
    const { cursor, units, layout } = ctx;
    if (
      isHardTerminalPunctuationToken(token) &&
      questionContentPunctuationBridgeRelationAt(cursor.tokens, index, { consumers: ["assembler"] }) !== null
    ) {
      cursor.advance();
      return;
    }
    PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, token.surface, {
      unitType: UnitType.SYMBOL,
      koreanPos: 기호,
      attachLeft: true,
      attachRight: true,
      terminalPunctuationRun: layout.terminalPunctuationRunContaining(index) ?? null
    });
    cursor.advance();
  }

  private appendPassthroughSymbolUnit(ctx: AssemblyPassContext, index: number, token: RuntimeHaruToken): void {
    const { cursor, units } = ctx;
    if (token.surface.length > 0) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, token.surface, {
        unitType: UnitType.SYMBOL,
        koreanPos: 기호,
        attachLeft: true,
        attachRight: true
      });
    } else {
      absorbIntoPrecedingUnit(units, index);
    }
    cursor.advance();
  }

  private async applyAssemblyParticlePrelude(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken
  ): Promise<AssemblyLoopSignal> {
    const { cursor, units, options } = ctx;
    if (await this.matchPronominalNoDispatch(cursor, units, options.trace)) {
      return "continue";
    }
    if (this.tryApplyTrailingCopulaNegation(cursor, units)) {
      return "continue";
    }
    if (isAssemblerTerminalQuestionKa(cursor.tokens, index)) {
      const nextIndex = nextNonSpaceIndex(cursor.tokens, index + 1) ?? cursor.end;
      if (nextIndex >= cursor.end) {
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, "?", {
          unitType: UnitType.SYMBOL,
          koreanPos: 기호,
          attachLeft: true,
          attachRight: true
        });
        cursor.advance();
        return "continue";
      }
      if (hasHardTerminalPunctuationClass(cursor.tokens[nextIndex], nextIndex, ["japanese_period"], ["assembler"])) {
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, nextIndex - index + 1, "?", {
          unitType: UnitType.SYMBOL,
          koreanPos: 기호,
          attachLeft: true,
          attachRight: true
        });
        cursor.advance(nextIndex + 1 - cursor.pos);
        return "continue";
      }
    }
    if (isTerminalYoSfpSurface(token)) {
      if (isVocativeYo(cursor.tokens, index)) {
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, "", {
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: true,
          functionalKind: FunctionalKind.CONTEXTUAL,
          allomorphKey: "이여/여"
        });
      } else {
        absorbIntoPrecedingUnit(units, index);
      }
      cursor.advance();
      return "continue";
    }
    return "next";
  }

  private applyResidualAuxiliaryCopulaOwners(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken
  ): AssemblyLoopSignal {
    const { cursor, units, layout, relationRenderSpans } = ctx;
    if (this.absorbNaAdjectiveSuffixAdnominalCopula(ctx, index, token) === "continue") {
      return "continue";
    }
    if (this.tryApplyEllipticPoliteConfirmation(cursor, units, layout)) {
      return "continue";
    }
    if (this.tryApplyParticlePhraseCopulaChain(cursor, units, layout, relationRenderSpans)) {
      return "continue";
    }
    if (this.tryApplyPunctuatedCopulaChain(cursor, units, layout, relationRenderSpans)) {
      return "continue";
    }
    if (this.tryApplyTrailingCopulaNegation(cursor, units)) {
      return "continue";
    }
    return "next";
  }

  private assembleResidualCopulaTail(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken
  ): void {
    const { cursor, units } = ctx;
    const previousUnit = lastOutputUnit(units);
    const preceding = this.precedingForAllomorph(units);
    const hasPunctuatedCopulaConnectiveHost = this.hasPunctuatedCopulaConnectiveHost(units);
    if (this.appendOrphanCopulaConnective(ctx, index, token, previousUnit, preceding, hasPunctuatedCopulaConnectiveHost) === "continue") {
      return;
    }
    if (this.matchDearuAux(cursor, units)) {
      return;
    }
    if (this.appendPunctuatedTrailingCopulaTail(ctx, index, token) === "continue") {
      return;
    }
    if (isCopulaAuxToken(token) && canHostTrailingCopula(previousUnit, preceding)) {
      if (this.foldTrailingCopulaTail(ctx, index, previousUnit, preceding) === "continue") {
        return;
      }
    }
    absorbIntoPrecedingUnit(units, index);
    cursor.advance();
  }

  private absorbNaAdjectiveSuffixAdnominalCopula(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken
  ): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const pronominalNoIndex = nextNonSpaceIndex(cursor.tokens, index + 1, cursor.end);
    const previousToken = cursor.tokens[index - 1];
    if (
      isAdnominalCopulaToken(token) &&
      previousToken !== undefined &&
      isNaAdjectiveDerivationalSuffix(previousToken) &&
      pronominalNoIndex !== null &&
      pronominalNoMarkerRelationForToken(cursor.tokens[pronominalNoIndex], pronominalNoIndex, {
        requirement: "copula_tail",
        consumers: ["pronominal_no_dispatch"],
      }) !== null
    ) {
      absorbIntoPrecedingUnit(units, index);
      cursor.advance();
      return "continue";
    }
    return "next";
  }

  private appendOrphanCopulaConnective(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken,
    previousUnit: TranslationUnit | undefined,
    preceding: string,
    hasPunctuatedCopulaConnectiveHost: boolean
  ): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    let orphanConn: readonly [korean: string, consumed: number] | undefined;
    if (!(isCopulaAuxToken(token) && (canHostTrailingCopulaConnective(previousUnit, preceding) || hasPunctuatedCopulaConnectiveHost))) {
      orphanConn = matchOrphanCopulaConn(cursor);
    }
    orphanConn ??= matchOrphanNanoconn(cursor);
    if (orphanConn !== undefined) {
      const [korean, orphanConsumed] = orphanConn;
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, orphanConsumed, korean, {
        unitType: UnitType.CONTENT,
        koreanPos: 접속사
      });
      cursor.advance(orphanConsumed);
      return "continue";
    }
    return "next";
  }

  private appendPunctuatedTrailingCopulaTail(
    ctx: AssemblyPassContext,
    index: number,
    token: RuntimeHaruToken
  ): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    if (isCopulaAuxToken(token)) {
      const auxProbe1 = cursor.lookahead(index - cursor.pos, c => {
        const auxTokens = collectAuxTokens(c);
        return { auxTokens, afterAux: c.pos };
      });
      const auxTokens = auxProbe1.auxTokens;
      if (auxTokens.length > 0) {
        const connectiveMatch1 = cursor.lookahead(auxProbe1.afterAux - cursor.pos, c => {
          const connective = trailingCopulaConnectiveTail(c, this.lookups);
          return connective === null ? null : { connective, consumed: c.pos - index };
        });
        if (connectiveMatch1 !== null) {
          const puncConsumed = this.tryAppendTrailingPunctuationCopulaConnective(
            cursor.tokens,
            index,
            connectiveMatch1.consumed,
            units,
            auxTokens,
            connectiveMatch1.connective
          );
          if (puncConsumed !== null) {
            cursor.advance(puncConsumed);
            return "continue";
          }
        }
        const punctuatedTerminalConsumed = this.tryAppendPunctuatedCopulaTerminalTail(
          cursor,
          index,
          auxProbe1.afterAux,
          units,
          auxTokens
        );
        if (punctuatedTerminalConsumed !== null) {
          cursor.advance(punctuatedTerminalConsumed);
          return "continue";
        }
      }
    }
    return "next";
  }

  private foldTrailingCopulaTail(
    ctx: AssemblyPassContext,
    index: number,
    previousUnit: TranslationUnit | undefined,
    preceding: string
  ): AssemblyLoopSignal {
    const { cursor } = ctx;
    const auxProbe2 = cursor.lookahead(index - cursor.pos, c => {
      const auxTokens = collectAuxTokens(c);
      return { auxTokens, afterAux: c.pos };
    });
    const auxTokens = auxProbe2.auxTokens;
    const fold: TrailingCopulaFoldInput = { index, previousUnit, preceding, auxProbe2, auxTokens };
    if (this.foldTrailingCopulaConnective(ctx, fold) === "continue") {
      return "continue";
    }
    if (this.foldTrailingCopulaTerminal(ctx, fold) === "continue") {
      return "continue";
    }
    if (auxTokens.length > 0) {
      if (this.foldTrailingCopulaQuestion(ctx, fold) === "continue") {
        return "continue";
      }
      if (this.foldTrailingCopulaSfp(ctx, fold) === "continue") {
        return "continue";
      }
    }
    return "next";
  }

  private foldTrailingCopulaConnective(ctx: AssemblyPassContext, fold: TrailingCopulaFoldInput): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const { index, previousUnit, preceding, auxProbe2, auxTokens } = fold;
    if (auxTokens.length > 0 && canHostTrailingCopulaConnective(previousUnit, preceding)) {
      const connectiveMatch2 = cursor.lookahead(auxProbe2.afterAux - cursor.pos, c => {
        const connective = trailingCopulaConnectiveTail(c, this.lookups);
        return connective === null ? null : { connective, consumed: c.pos - index };
      });
      if (connectiveMatch2 !== null) {
        if (previousUnit !== undefined) {
          applyHeadedPlanTrailingCopula(previousUnit, "", {
            auxTokens,
            baseText: preceding,
            connective: connectiveMatch2.connective
          });
          for (let offset = 0; offset < connectiveMatch2.consumed; offset++) {
            if (!previousUnit.jpIndices.includes(index + offset)) {
              previousUnit.jpIndices.push(index + offset);
            }
          }
        } else {
          const features = auxExtractFeatures(auxTokens, { lookups: this.lookups });
          const copula = nounCopulaConnective(preceding, connectiveMatch2.connective, features.past);
          PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, connectiveMatch2.consumed, copula, {
            unitType: UnitType.CONTENT
          });
        }
        cursor.advance(connectiveMatch2.consumed);
        return "continue";
      }
    }
    return "next";
  }

  private foldTrailingCopulaTerminal(ctx: AssemblyPassContext, fold: TrailingCopulaFoldInput): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const { index, previousUnit, preceding, auxProbe2, auxTokens } = fold;
    if (auxTokens.length > 0 && cursor.lookahead(auxProbe2.afterAux - cursor.pos, hasTerminalSentenceMark)) {
      const terminalConsumed = auxProbe2.afterAux - index;
      if (previousUnit !== undefined) {
        applyHeadedPlanTrailingCopula(previousUnit, "", { auxTokens, baseText: preceding });
        for (let offset = 0; offset < terminalConsumed; offset++) {
          if (!previousUnit.jpIndices.includes(index + offset)) {
            previousUnit.jpIndices.push(index + offset);
          }
        }
      } else {
        const features = auxExtractFeatures(auxTokens, { lookups: this.lookups });
        features.copula = true;
        const copula = nounCopula(preceding, features, this._formal, this.lookups).text;
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, terminalConsumed, copula, {
          unitType: UnitType.CONTENT
        });
      }
      cursor.advance(terminalConsumed);
      return "continue";
    }
    return "next";
  }

  private foldTrailingCopulaQuestion(ctx: AssemblyPassContext, fold: TrailingCopulaFoldInput): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const { index, previousUnit, preceding, auxProbe2, auxTokens } = fold;
    const questionMatch = cursor.lookahead(auxProbe2.afterAux - cursor.pos, c => {
      const question = terminalQuestionTail(c);
      return question === null ? null : { question, consumed: c.pos - index };
    });
    if (questionMatch !== null) {
      const question = questionMatch.question;
      if (previousUnit !== undefined) {
        applyHeadedPlanTrailingCopula(previousUnit, "", { auxTokens, baseText: preceding, sfp: "polite_q" });
        for (let offset = 0; offset < questionMatch.consumed; offset++) {
          if (!previousUnit.jpIndices.includes(index + offset)) {
            previousUnit.jpIndices.push(index + offset);
          }
        }
      } else {
        const features = auxExtractFeatures(auxTokens, { lookups: this.lookups });
        features.copula = true;
        const copula = nounCopula(preceding, features, this._formal, this.lookups, "polite_q").text;
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, questionMatch.consumed, copula, {
          unitType: UnitType.CONTENT
        });
      }
      if (question.absorbPeriod) {
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index + auxTokens.length, questionMatch.consumed - auxTokens.length, "?", {
          unitType: UnitType.SYMBOL,
          koreanPos: 기호,
          attachLeft: true,
          attachRight: true
        });
      }
      cursor.advance(questionMatch.consumed);
      return "continue";
    }
    return "next";
  }

  private foldTrailingCopulaSfp(ctx: AssemblyPassContext, fold: TrailingCopulaFoldInput): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const { index, previousUnit, preceding, auxProbe2, auxTokens } = fold;
    const sfpMatch = cursor.lookahead(auxProbe2.afterAux - cursor.pos, c => {
      const sfp = trailingCopulaSfpTail(c);
      return sfp === null ? null : { sfp, consumed: c.pos - index };
    });
    if (sfpMatch !== null) {
      if (previousUnit !== undefined) {
        applyHeadedPlanTrailingCopula(previousUnit, "", { auxTokens, baseText: preceding, sfp: sfpMatch.sfp });
        for (let offset = 0; offset < sfpMatch.consumed; offset++) {
          if (!previousUnit.jpIndices.includes(index + offset)) {
            previousUnit.jpIndices.push(index + offset);
          }
        }
      } else {
        const features = auxExtractFeatures(auxTokens, { lookups: this.lookups });
        features.copula = true;
        const copula = nounCopula(preceding, features, this._formal, this.lookups, sfpMatch.sfp).text;
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, sfpMatch.consumed, copula, {
          unitType: UnitType.CONTENT
        });
      }
      cursor.advance(sfpMatch.consumed);
      return "continue";
    }
    return "next";
  }

  private async appendAssemblyPrefixUnit(ctx: AssemblyPassContext, index: number, token: RuntimeHaruToken): Promise<void> {
    const { cursor, units } = ctx;
    const entry = committedLookupEntry(await this.dictionary.lookupTokenRelaxed(token));
    const korean = entry === null ? token.surface : winnerKorean(entry) ?? "";
    if (korean.length > 0) {
      const defaultAttachRight = entry !== null ? (winner(entry).attachRight ?? true) : true;
      const attachRight = prefixAttachRightForToken(token, cursor.tokens, index, defaultAttachRight);
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, korean, {
        unitType: UnitType.PREFIX,
        koreanPos: 접두사,
        entry,
        renderPlan: { kind: "fixedText", text: korean, koreanPos: 접두사 },
        attachRight
      });
    }
    cursor.advance();
  }

  private applyHonorificClusterSuffix(ctx: AssemblyPassContext, index: number): AssemblyLoopSignal {
    const { cursor, units } = ctx;
    const clusterDecision = honorificClusterSuffixDecision(
      cursor.tokens,
      index,
      honorificClusterLookupsFrom(this.lookups)
    );
    if (clusterDecision?.kind === "absorbed") {
      absorbIntoPrecedingUnit(units, index);
      cursor.advance();
      return "continue";
    }
    if (clusterDecision?.kind === "override") {
      const clusterOverride = clusterDecision.realization;
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, clusterOverride.korean, {
        unitType: UnitType.SUFFIX,
        koreanPos: 접미사,
        attachLeft: clusterOverride.attachLeft,
        renderPlan: {
          kind: "fixedText",
          text: clusterOverride.korean,
          koreanPos: 접미사
        }
      });
      cursor.advance();
      return "continue";
    }
    return "next";
  }

  private async appendLexicalSuffixUnit(ctx: AssemblyPassContext, index: number, token: RuntimeHaruToken): Promise<void> {
    const { cursor, units, layout } = ctx;
    let entry = await this.dictionary.lookupTokenRelaxed(token);
    if (entry !== undefined) {
      entry = resolveContext(entry, cursor.tokens, index, { layout, lookups: this.lookups, numeric: this.numeric });
    }
    const committed = committedLookupEntry(entry);
    let korean = committed === null ? token.surface : winnerKorean(committed) ?? "";
    const previousUnit = lastOutputUnit(units);
    let suffixAttachLeft = committed !== null ? (winner(committed).attachLeft ?? true) : true;
    if (
      token.dictionaryForm === "方"
      && token.reading === "カタ"
      && index > 0
      && previousUnit !== undefined
    ) {
      const hostPlan = kataVerbHostAttributivePlan(previousUnit);
      if (hostPlan !== null) {
        previousUnit.setRenderPlan(hostPlan, { rule: "SUFFIX-KATA-VERB", cacheValue: "" });
        korean = "법";
        suffixAttachLeft = false;
      }
    }
    if (suffixNominalizerAlreadyLexicalizedInPreviousUnit(token, korean, previousUnit)) {
      absorbIntoPrecedingUnit(units, index);
      cursor.advance();
      return;
    }
    rewriteFunctionalAdjectivalSuffixHostToNominalized(token, previousUnit);
    if (korean.length > 0) {
      const renderPlan = suffixRenderPlanFromCommittedEntry(committed, korean);
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, 1, korean, {
        unitType: UnitType.SUFFIX,
        koreanPos: 접미사,
        entry: committed,
        attachLeft: suffixAttachLeft,
        ...(renderPlan === null ? {} : { renderPlan })
      });
    } else {
      absorbIntoPrecedingUnit(units, index);
    }
    cursor.advance();
  }

  private async tryAppendRepairedContentSpan(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    repairedContentMap: Map<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    options: { readonly trace?: TraceCollector | null }
  ): Promise<number | null> {
    const { tokens, pos: index } = cursor;
    const token = tokens[index];
    if (token === undefined || !isContentAdmissionToken(token)) {
      return null;
    }
    const seed = contentMapRepairSeed(contentMap, units, index);
    const regenerated = await this.contentPass(tokens, {
      trace: options.trace ?? null,
      startIndex: index,
      seedContentMap: seed,
      resolveDeferredCopulaSupportAt: index
    });
    const regeneratedNew = new Map<number, AssemblyContentSpan>();
    for (const [start, span] of regenerated) {
      if (start >= index) {
        repairedContentMap.set(start, span);
        if (contentMap.get(start) !== span) {
          regeneratedNew.set(start, span);
        }
      }
    }
    if (regeneratedNew.size > 0) {
      runRegisteredHeadedContentPlanLifecycle({
        tokens,
        contentMap: regeneratedNew,
        layout,
        lookups: this.lookups,
        numeric: this.numeric
      });
    }
    const span = repairedContentMap.get(index);
    if (span === undefined || span.consumed <= 0) {
      return null;
    }
    const renderPlan = applyBareQuestionRenderPlan(span.renderPlan, tokens, index + span.consumed, tokens.length);
    const shouldCacheKorean = PipelineAssemblerMixin.shouldCacheSurface(renderPlan);
    const shouldCacheBaseKorean = PipelineAssemblerMixin.shouldCacheBaseSurface(renderPlan);
    const realizedKorean = shouldCacheKorean || shouldCacheBaseKorean
      ? this.surfaceFromRenderPlan(span.korean, renderPlan)
      : "";
    const cachedKorean = shouldCacheKorean ? realizedKorean : "";
    const cachedBaseKorean = shouldCacheBaseKorean ? realizedKorean : span.koreanBase ?? "";
    PipelineAssemblerMixin.appendUnit(units, tokens, index, span.consumed, cachedKorean, {
      unitType: span.unitType,
      koreanPos: span.koreanPos,
      entry: span.entry,
      renderPlan,
      koreanBase: cachedBaseKorean,
      attachLeft: span.attachLeft,
      particleRole: span.particleRole,
      provenance: span.provenance,
      discourseConnective: span.discourseConnective,
      provenanceReason: span.provenanceReason ?? "content_map_repair",
      warnings: span.warnings,
      renderPlanPolicy: span.renderPlanPolicy
    });
    return span.consumed;
  }

  private absorbUncoveredAssemblyTokens(
    tokens: readonly RuntimeHaruToken[],
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout
  ): void {
    const covered = new Set(units.flatMap(u => u.jpIndices));
    const unitIndex = TokenUnitIndex.build(units);

    const LEADING_FUNCTIONAL_POS_BITS = (1 << 助動詞) | (1 << 助詞) | (1 << 補助記号) | (1 << 記号);
    let firstOutputIndex = Infinity;
    for (const unit of units) {
      if (emitsOutput(unit) && unit.unitType !== UnitType.SYMBOL) {
        const unitStart = Math.min(...unit.jpIndices);
        if (unitStart >= 0 && unitStart < firstOutputIndex) {
          firstOutputIndex = unitStart;
        }
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      if (covered.has(i)) continue;

      const ownerIndex = layout.ownerPredicateOfParticle(i);
      if (ownerIndex !== undefined && (tokens[i]!.pos & POS1) !== 終助詞) {
        const ownerUnit = unitIndex.get(ownerIndex);
        if (ownerUnit !== undefined) {
          this.absorbTokenIntoAssemblyUnit(tokens, i, ownerUnit, covered, unitIndex);
          continue;
        }
      }

      const span = contentMap.get(i);
      if (span !== undefined) {
        const clauseInfo = layout.clauseOfToken(i);
        if (clauseInfo !== undefined) {
          for (const predIdx of clauseInfo.predicates) {
            const predUnit = unitIndex.get(predIdx);
            if (predUnit !== undefined) {
              this.absorbTokenIntoAssemblyUnit(tokens, i, predUnit, covered, unitIndex);
              break;
            }
          }
          if (covered.has(i)) continue;
        }
        this.tryAbsorbIntoAdjacentCoveredUnit(tokens, i, covered, unitIndex);
        if (covered.has(i)) continue;
      }

      if (i < firstOutputIndex && pos0in(tokens[i]!.pos, LEADING_FUNCTIONAL_POS_BITS)) {
        const pos1 = tokens[i]!.pos & POS1;
        if ((pos1 === 終助詞)) {
          continue;
        }
        if ((tokens[i]!.pos & POS0) === 助詞 && i + 1 < tokens.length && covered.has(i + 1)) {
          const nextUnit = unitIndex.get(i + 1);
          if (nextUnit !== undefined && emitsOutput(nextUnit)) {
            this.absorbTokenIntoAssemblyUnit(tokens, i, nextUnit, covered, unitIndex);
            continue;
          }
        }
        const clauseInfo = layout.clauseOfToken(i);
        const clauseHasContent = clauseInfo !== undefined
          && clauseInfo.predicates.some(p => unitIndex.get(p) !== undefined);
        if (!clauseHasContent) {
          continue;
        }
      }

      const pos0 = tokens[i]!.pos & POS0;
      if ((pos0 === 接頭辞)) {
        if (this.absorbPrefixRunIntoFollowingCoveredUnit(tokens, units, covered, i, contentMap, unitIndex)) {
          if (covered.has(i)) continue;
        }
        this.tryAbsorbIntoAdjacentCoveredUnit(tokens, i, covered, unitIndex);
        if (covered.has(i)) continue;
        if (this.appendHostlessPrefixRunPassthrough(tokens, units, covered, i)) continue;
      }

      if ((pos0 === 名詞) || (pos0 === 補助記号)) {
        this.absorbIntoAdjacentUnit(tokens, i, covered, unitIndex);
        if (covered.has(i)) continue;
      }

      if ((pos0 === 助詞) || (i >= firstOutputIndex && (pos0 === 助動詞 || (pos0 === 動詞 && (tokens[i]!.pos & POS1) === 非自立可能)))) {
        this.absorbIntoAdjacentUnit(tokens, i, covered, unitIndex);
        if (covered.has(i)) continue;
      }
    }
    for (let i = firstOutputIndex; i < tokens.length; i++) {
      if (covered.has(i)) continue;
      this.absorbIntoAdjacentUnit(tokens, i, covered, unitIndex);
    }
  }

  private tryAbsorbIntoAdjacentCoveredUnit(
    tokens: readonly RuntimeHaruToken[],
    i: number,
    covered: Set<number>,
    unitIndex: TokenUnitIndex
  ): void {
    for (let j = i + 1; j < tokens.length; j++) {
      if (covered.has(j)) {
        const nextUnit = unitIndex.get(j);
        if (nextUnit !== undefined) {
          this.absorbTokenIntoAssemblyUnit(tokens, i, nextUnit, covered, unitIndex);
        }
        break;
      }
    }
    if (covered.has(i)) return;
    if (i > 0 && covered.has(i - 1)) {
      const prevUnit = unitIndex.get(i - 1);
      if (prevUnit !== undefined) {
        this.absorbTokenIntoAssemblyUnit(tokens, i, prevUnit, covered, unitIndex);
      }
    }
  }

  private absorbIntoAdjacentUnit(
    tokens: readonly RuntimeHaruToken[],
    i: number,
    covered: Set<number>,
    unitIndex: TokenUnitIndex
  ): void {
    if (i > 0 && covered.has(i - 1)) {
      const prevUnit = unitIndex.get(i - 1);
      if (prevUnit !== undefined) {
        this.absorbTokenIntoAssemblyUnit(tokens, i, prevUnit, covered, unitIndex);
        if (covered.has(i)) return;
      }
    }
    if (i + 1 < tokens.length && covered.has(i + 1)) {
      const nextUnit = unitIndex.get(i + 1);
      if (nextUnit !== undefined) {
        this.absorbTokenIntoAssemblyUnit(tokens, i, nextUnit, covered, unitIndex);
      }
    }
  }

  private absorbTokenIntoAssemblyUnit(
    tokens: readonly RuntimeHaruToken[],
    tokenIndex: number,
    unit: TranslationUnit,
    covered: Set<number>,
    unitIndex: TokenUnitIndex
  ): void {
    if (!unit.jpIndices.includes(tokenIndex)) {
      unit.jpIndices.push(tokenIndex);
    }
    unitIndex.set(tokenIndex, unit);
    covered.add(tokenIndex);

    const stutterPrefix = tokens[tokenIndex]?.stutterPrefix;
    if (stutterPrefix !== undefined) {
      if (unit.jpHead.stutterPrefix === undefined) {
        unit.jpHead.stutterPrefix = stutterPrefix;
      }
      for (let sourceIndex = stutterPrefix.sourceSpan.start; sourceIndex < stutterPrefix.sourceSpan.endExclusive; sourceIndex += 1) {
        if (!unit.jpIndices.includes(sourceIndex)) {
          unit.jpIndices.push(sourceIndex);
        }
        unitIndex.set(sourceIndex, unit);
        covered.add(sourceIndex);
      }
    }

    unit.jpIndices.sort((left, right) => left - right);
    unit.sourceSpan = sourceSpanForTokenIndexes(tokens, unit.jpIndices);
  }

  private absorbPrefixRunIntoFollowingCoveredUnit(
    tokens: readonly RuntimeHaruToken[],
    units: TranslationUnit[],
    covered: Set<number>,
    start: number,
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    unitIndex: TokenUnitIndex
  ): boolean {
    const prefixIndices: number[] = [];
    let hostIndex: number | null = null;
    for (let next = start; next < tokens.length; next++) {
      const token = tokens[next];
      if (token === undefined) break;
      const pos0 = token.pos & POS0;
      if ((pos0 === 接頭辞)) {
        if (!covered.has(next)) {
          prefixIndices.push(next);
        }
        continue;
      }
      if (this.isPrefixRunHostToken(token, next, contentMap)) {
        hostIndex = next;
      } else if (this.isPrefixRunFunctionalBridgeToken(token) && covered.has(next)) {
        hostIndex = this.findLexicalHostAfterPrefixFunctionalBridge(tokens, covered, next, contentMap);
      }
      break;
    }
    if (prefixIndices.length === 0 || hostIndex === null) {
      return false;
    }
    if (!covered.has(hostIndex) || !this.isPrefixRunHostToken(tokens[hostIndex], hostIndex, contentMap)) {
      return false;
    }
    const hostUnit = unitIndex.get(hostIndex);
    if (hostUnit === undefined || hostUnit.unitType === UnitType.SYMBOL) {
      return false;
    }
    for (const prefixIndex of prefixIndices) {
      const stutterPrefix = tokens[prefixIndex]?.stutterPrefix;
      if (stutterPrefix !== undefined) {
        if (hostUnit.jpHead.stutterPrefix === undefined) {
          hostUnit.jpHead.stutterPrefix = stutterPrefix;
        }
        for (let sourceIndex = stutterPrefix.sourceSpan.start; sourceIndex < stutterPrefix.sourceSpan.endExclusive; sourceIndex += 1) {
          if (!hostUnit.jpIndices.includes(sourceIndex)) {
            hostUnit.jpIndices.push(sourceIndex);
          }
          unitIndex.set(sourceIndex, hostUnit);
          covered.add(sourceIndex);
        }
      }
      if (unitIndex.get(prefixIndex) !== hostUnit) {
        hostUnit.jpIndices.push(prefixIndex);
        unitIndex.set(prefixIndex, hostUnit);
      }
      covered.add(prefixIndex);
    }
    hostUnit.jpIndices.sort((left, right) => left - right);
    hostUnit.sourceSpan = sourceSpanForTokenIndexes(tokens, hostUnit.jpIndices);
    return covered.has(start);
  }

  private isPrefixRunHostToken(
    token: RuntimeHaruToken | undefined,
    index: number,
    contentMap: ReadonlyMap<number, AssemblyContentSpan>
  ): boolean {
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, PREFIX_RUN_BLOCKED_HOST_POS_BITS)) {
      return false;
    }
    return pos0in(pos0, PREFIX_RUN_HOST_POS_BITS) || contentMap.has(index);
  }

  private isPrefixRunFunctionalBridgeToken(token: RuntimeHaruToken | undefined): boolean {
    if (token === undefined || (token.pos & POS0) !== 助詞) {
      return false;
    }
    return PREFIX_RUN_BRIDGE_PARTICLE_POS1.has(token.pos & POS1);
  }

  private findLexicalHostAfterPrefixFunctionalBridge(
    tokens: readonly RuntimeHaruToken[],
    covered: ReadonlySet<number>,
    bridgeIndex: number,
    contentMap: ReadonlyMap<number, AssemblyContentSpan>
  ): number | null {
    const next = nextNonSpaceIndex(tokens, bridgeIndex + 1);
    if (next === null) {
      return null;
    }
    const token = tokens[next];
    if (token === undefined || !covered.has(next) || !this.isPrefixRunHostToken(token, next, contentMap)) {
      return null;
    }
    return next;
  }

  private appendHostlessPrefixRunPassthrough(
    tokens: readonly RuntimeHaruToken[],
    units: TranslationUnit[],
    covered: Set<number>,
    start: number
  ): boolean {
    const prefixIndices: number[] = [];
    const surfaces: string[] = [];
    for (let next = start; next < tokens.length; next++) {
      const token = tokens[next];
      if (token === undefined) {
        break;
      }
      const pos0 = token.pos & POS0;
      if ((pos0 !== 接頭辞)) {
        break;
      }
      if (!covered.has(next)) {
        prefixIndices.push(next);
        surfaces.push(token.surface);
      }
    }
    const surface = surfaces.join("");
    const headIndex = prefixIndices[0];
    if (headIndex === undefined || surface.length === 0) {
      return false;
    }
    const before = units.length;
    PipelineAssemblerMixin.appendUnit(units, tokens, headIndex, 1, surface, {
      unitType: UnitType.PREFIX,
      koreanPos: 접두사,
      attachRight: true
    });
    const unit = units[before];
    if (unit === undefined) {
      return false;
    }
    unit.jpIndices = [...prefixIndices];
    for (const prefixIndex of prefixIndices) {
      covered.add(prefixIndex);
    }
    return covered.has(start);
  }

  private async tryDispatchKakuParticle(
    surface: string,
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const particleHead = await this.tryConsumeParticleHeadDispatch(cursor, units, contentMap, layout, trace);
    if (particleHead !== null) {
      cursor.advance(particleHead);
      return true;
    }
    const ownerIndex = layout.ownerPredicateOfParticle(cursor.pos);
    const committed = committedParticleAssignmentAt(contentMap, cursor.pos, ownerIndex);
    if (committed !== undefined) {
      const source = findBatchimSource(units, units.length);
      const preceding = source === undefined ? "" : this.unitSurfaceForAssembly(source);
      if (
        caseParticleMarkerRelationForToken(cursor.tokens[cursor.pos], cursor.pos, {
          acceptedSurfaces: ["に", "で"],
          consumers: ["assembler"]
        }) !== null
        && committed.allomorphKey === "으로/로"
        && [...NI_ABSORB_ENDINGS].some((ending) => preceding.endsWith(ending))
      ) {
        absorbIntoPrecedingUnit(units, cursor.pos);
        cursor.advance();
        return true;
      }
      const followingFocus = cursor.tokens[cursor.pos + 1];
      if (
        (committed.allomorphKey === "이/가" || committed.allomorphKey === "을/를") &&
        (committed.register === undefined || committed.register === "none") &&
        followingFocus !== undefined &&
        (followingFocus.pos & POS01) === 助詞_係助詞 &&
        (followingFocus.surface === "は" || followingFocus.surface === "も")
      ) {
        absorbIntoPrecedingUnit(units, cursor.pos);
        cursor.advance();
        return true;
      }
      PipelineAssemblerMixin.appendCommittedParticle(units, cursor.tokens, cursor.pos, committed);
      cursor.advance();
      return true;
    }
    return false;
  }

  private moRuleWhCaseDemoFreeChoice(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): boolean {
    const { tokens, pos: index } = cursor;
    const de = tokens[index - 1];
    if (de === undefined || de.surface !== "で") {
      return false;
    }
    if ((de.pos & POS0) !== 助動詞 && (de.pos & POS01) !== 助詞_格助詞) {
      return false;
    }
    const caseTok = tokens[index - 2];
    if (
      caseTok === undefined ||
      (caseTok.pos & POS01) !== 助詞_格助詞 ||
      (caseTok.surface !== "に" && caseTok.surface !== "へ")
    ) {
      return false;
    }
    const host = tokens[index - 3];
    if (
      host === undefined ||
      (
        !WH_INDEFINITE_DEMO_HOSTS.has(host.dictionaryForm || host.surface) &&
        !WH_INDEFINITE_DEMO_HOSTS.has(host.surface)
      )
    ) {
      return false;
    }
    PipelineAssemblerMixin.appendUnit(units, tokens, index, 1, caseTok.surface === "へ" ? "든" : "나", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.PARTICLE
    });
    cursor.advance();
    return true;
  }

  private async tryConsumeParticleHeadDispatch(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    trace?: TraceCollector | null
  ): Promise<number | null> {
    const { tokens, pos: index, end: n } = cursor;
    const ownerIndex = layout.ownerPredicateOfParticle(index);
    const projectedOwnerIndex = ownerIndex ?? (() => {
      const candidate = layout.followingPredicateEvidenceIndexAfter(tokens, index, {
        includeAuxiliary: false
      });
      if (candidate === null) {
        return undefined;
      }
      const previous = index > 0 ? tokens[index - 1] : undefined;
      return ((previous?.pos ?? 0) & POS0) === 副詞 ||
        tariKeijoujiAdverbialToEvidence(cursor.fork(index, n, index), {
          followingPredicateIdx: candidate,
          followingPredicateIdxIsProjectionEvidence: true,
          lookups: this.lookups
        }) !== null
        ? candidate
        : undefined;
    })();
    const committed = committedParticleAssignmentAt(contentMap, index, ownerIndex);
    const marker = tokens[index];
    const precedingTokenUnit = index > 0 ? findUnitCoveringIndex(units, index - 1) : undefined;
    const precedingCasePreference: ParticleHeadCasePreference | null =
      marker === undefined || precedingTokenUnit === undefined
        ? null
        : PipelineAssemblerMixin.unitCasePreference(precedingTokenUnit, marker.surface) ?? null;
    const precedingPrenominalPredicate = await this.noPrecedingPrenominalPredicate(cursor, layout, marker, precedingTokenUnit);
    const result = await tryBuildParticleHeadConsumption({
      cursor,
      layout,
      lookups: this.lookups,
      numeric: this.numeric,
      allomorphHint: this.precedingAllomorphHint(units),
      precedingTokenKoreanPos: precedingTokenUnit?.koreanPos ?? null,
      precedingCasePreference,
      precedingPrenominalPredicate,
      committedParticleAssignment: committed ?? null,
      ...(() => {
        const owner = projectedOwnerIndex === undefined ? undefined : contentMap.get(projectedOwnerIndex);
        return projectedOwnerIndex === undefined || owner === undefined
          ? {}
          : { followingPredicate: nominalPredicateCommitContext(projectedOwnerIndex, owner) };
      })()
    });
    if (result.kind === "none") {
      if (result.block !== null && trace !== undefined && trace !== null) {
        trace.record(new TraceEvent(
          index,
          "content_pass",
          "nominal_frame_marker_adapter_blocked",
          true,
          result.traceDetail
        ));
      }
      return null;
    }
    if (result.headRewrite?.target === "previous_content") {
      lastContentUnit(units)?.setRenderPlan(result.headRewrite.renderPlan, {
        rule: result.headRewrite.rule,
        cacheValue: ""
      });
    }
    if (result.markerKind === "to_adverbial") {
      const previous = lastContentUnit(units);
      const plan = previous === undefined ? null : PipelineAssemblerMixin.keijoujiTariAdverbPlan(previous);
      if (previous !== undefined && plan !== null) {
        previous.setRenderPlan(plan, {
          rule: "to_adverbial_tari_marker",
          cacheValue: ""
        });
        previous.provenance = "assembler";
      }
    }
    const nominalFrameCopula = this.tryBuildNominalFrameCopulaComposite(
      result,
      contentMap,
      tokens,
      index,
      projectedOwnerIndex
    );
    if (nominalFrameCopula !== null) {
      PipelineAssemblerMixin.appendUnit(
        units,
        tokens,
        index,
        nominalFrameCopula.consumed,
        "",
        {
          ...result.assemblyOptions,
          renderPlan: applyBareQuestionToRenderPlan(
            nominalFrameCopula.plan,
            tokens,
            index + nominalFrameCopula.consumed,
            tokens.length
          ),
          provenance: "predicate_tail"
        }
      );
      if (trace !== undefined && trace !== null) {
        trace.record(new TraceEvent(
          index,
          "content_pass",
          "nominal_frame_copula_chain",
          true,
          { familyId: nominalFrameCopula.familyId, consumed: nominalFrameCopula.consumed }
        ));
      }
      return nominalFrameCopula.consumed;
    }
    if (result.emit) {
      const { copulaBase, ...assemblyOptions } = result.assemblyOptions;
      PipelineAssemblerMixin.appendUnit(
        units,
        tokens,
        index,
        result.consumed,
        result.korean,
        {
          ...assemblyOptions,
          ...(result.markerKind === undefined ? {} : { particleMarkerKind: result.markerKind }),
          ...(copulaBase === undefined ? {} : { particleCopulaBase: copulaBase })
        }
      );
    }
    if (trace !== undefined && trace !== null) {
      trace.record(new TraceEvent(
        index,
        "content_pass",
        "particle_head_dispatch",
        true,
        result.traceDetail
      ));
    }
    return result.consumed;
  }

  private tryBuildNominalFrameCopulaComposite(
    result: ParticleHeadAppendPayload,
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    tokens: readonly RuntimeHaruToken[],
    markerStart: number,
    projectedOwnerIndex: number | undefined
  ): NominalFrameCopulaChain | null {
    const nominalFrame = result.nominalFrame;
    if (nominalFrame === undefined || projectedOwnerIndex === undefined) {
      return null;
    }
    const owner = contentMap.get(projectedOwnerIndex);
    const ownerPlan = owner?.renderPlan;
    if (owner === undefined || !isPredicateHeadTailChainRenderPlan(ownerPlan)) {
      return null;
    }
    return tryBuildNominalFrameCopulaChain({
      tokens,
      markerStart,
      parse: nominalFrame.parse,
      framePlan: nominalFrame.plan,
      followingPredicate: {
        tokenIndex: projectedOwnerIndex,
        consumed: owner.consumed,
        plan: ownerPlan
      }
    });
  }

  private async noPrecedingPrenominalPredicate(
    cursor: TokenCursor<RuntimeHaruToken>,
    layout: ClauseLayout,
    marker: RuntimeHaruToken | undefined,
    precedingTokenUnit: TranslationUnit | undefined
  ): Promise<boolean> {
    const { tokens, pos: index, end: n } = cursor;
    if (marker === undefined || precedingTokenUnit === undefined || index === 0 || index + 1 >= n) {
      return false;
    }
    const admission = PipelineAssemblerMixin.prenominalPromotionHeadAdmission(
      tokens,
      prenominalMarkerHeadReachAfterToken(layout, tokens, index, this.lookups),
      this.lookups
    );
    if (admission === null || admission.genitiveVetoed) {
      return false;
    }
    const previous = tokens[index - 1];
    if (
      previous === undefined ||
      (previous.pos & POS0) !== 名詞 ||
      isNaAdjCapableNoun(previous)
    ) {
      return false;
    }
    return PipelineAssemblerMixin.unitPredicateTranslation(precedingTokenUnit, tokens, index - 1, {
      fallbackEntry: (await this.dictionary.lookupTokenRelaxed(previous)) ?? null,
      lookups: this.lookups,
      numeric: this.numeric
    }) !== undefined;
  }

  private tryBuildModifiedHeadPrenominalModifierSpan(
    tokens: readonly RuntimeHaruToken[],
    index: number,
    result: ContentResult
  ): AssemblyContentSpan | null {
    const koreanPos = contentResultKoreanPos(result);
    if (result.consumed !== 1 || (koreanPos !== 형용사 && koreanPos !== 동사)) {
      return null;
    }
    const sense = result.entry?.senses?.[0];
    if (sense === undefined) {
      return null;
    }
    const head = modifiedHeadNounMatchingSelectedSense(sense, tokens, index, this.lookups);
    if (head === null) {
      return null;
    }
    const plan = predicatePrenominalPlan({
      korean: sense.korean,
      koreanPos: sense.koreanPos ?? koreanPos,
      irregular: sense.irregular ?? null
    }, this.lookups.KO_VERB_ADNOMINAL_ENDING_OVERRIDES);
    if (plan === null) {
      return null;
    }
    const span = makeAssemblyContentSpan(
      index,
      result.consumed,
      "",
      sense.koreanPos ?? koreanPos,
      result.entry,
      UnitType.CONTENT,
      { renderPlan: plan.renderPlan }
    );
    span.voice = result.voice;
    span.rareruReadings = result.rareruReadings;
    span.nareruReadings = result.nareruReadings;
    span.dekiruReadings = result.dekiruReadings;
    span.hasNegative = result.hasNegative;
    span.hasCausative = result.hasCausative;
    span.hasCausativePassive = result.hasCausativePassive;
    span.hasRequestTail = result.hasRequestTail;
    span.hasBenefactiveTail = result.hasBenefactiveTail;
    span.benefactive = result.benefactive;
    span.sourceCandidates = result.sourceCandidates;
    return span;
  }

  private async handleAssemblyParticleSpecial(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const token = cursor.tokens[cursor.pos];
    if (token === undefined) {
      return false;
    }
    const surface = token.surface;
    const pos1 = token.pos & POS1;
    const previous = cursor.tokens[cursor.pos - 1];
    if (surface === "とて" && (token.pos & POS01) === 助詞_格助詞 && previous !== undefined && pos0in(previous.pos, NOMINAL_BITS)) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos, 1, "라도", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      });
      cursor.advance();
      return true;
    }
    if (surface === "は" && (pos1 === 係助詞) && cursor.pos > 0 && this.lookups.TEMPORAL_SUFFIX_NOUNS.has(cursor.tokens[cursor.pos - 1]?.dictionaryForm ?? "")) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos, 1, "에는", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      });
      cursor.advance();
      return true;
    }
    if (surface === "だけ" && pos1 === 副助詞) {
      const nominalDake = this.matchNominalDakeCopulaTail(cursor, units);
      if (nominalDake !== null) {
        cursor.advance(nominalDake);
        return true;
      }
    }
    const particleHead = await this.tryConsumeParticleHeadDispatch(cursor, units, contentMap, layout, trace);
    if (particleHead !== null) {
      cursor.advance(particleHead);
      return true;
    }
    if (surface === "だけでなく") {
      if (await this.matchFocusDakeCopulaTail(cursor, units, trace)) {
        return true;
      }
    }
    if (surface === "だけ" && pos1 === 副助詞) {
      if (await this.matchFocusDakeCopulaTail(cursor, units, trace)) {
        return true;
      }
    }
    if (surface === "は") {
      if (await this.tryDispatchKakuParticle(surface, cursor, units, contentMap, layout, trace)) {
        return true;
      }
      const ctx = this.makeParticleCtx(cursor, units, contentMap, layout);
      if (this.haRuleUchiTopic(ctx) !== null) {
        cursor.advance();
        return true;
      }
    }
    if (surface === "も") {
      if (await this.tryDispatchKakuParticle(surface, cursor, units, contentMap, layout, trace)) {
        return true;
      }
      if (this.moRuleWhCaseDemoFreeChoice(cursor, units)) {
        return true;
      }
    }
    if (isClauseConnectiveEmphasisParticle(cursor)) {
      absorbIntoPrecedingUnit(units, cursor.pos);
      cursor.advance();
      return true;
    }
    const precedingCasePreference = PipelineAssemblerMixin.unitCasePreferenceForParticle(units, surface);
    if (precedingCasePreference !== undefined) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos, 1, precedingCasePreference.korean ?? "", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.PARTICLE,
        allomorphKey: precedingCasePreference.allomorphKey ?? null
      });
      cursor.advance();
      return true;
    }
    const particleKey = particleAllomorphKey(token);
    const preceding = this.precedingForAllomorph(units);
    const korean = particleKey === undefined
      ? mapParticle(token, preceding, secondaryParticleCanonical(token) ?? token.surface)
      : "";
    if ((korean !== null && korean.length > 0) || particleKey !== undefined) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos, 1, korean ?? "", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.PARTICLE,
        allomorphKey: particleKey ?? null
      });
    } else {
      absorbIntoPrecedingUnit(units, cursor.pos);
    }
    cursor.advance();
    return true;
  }

  private async handleToKakuParticle(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    contentMap: ReadonlyMap<number, AssemblyContentSpan>,
    layout: ClauseLayout,
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const token = cursor.tokens[cursor.pos];
    if (token === undefined) {
      return false;
    }
    if (
      cursor.pos > 0 &&
      caseParticleMarkerRelationForToken(cursor.tokens[cursor.pos - 1], cursor.pos - 1, {
        acceptedSurfaces: ["へ"],
        consumers: ["assembler"]
      }) !== null
    ) {
      absorbIntoPrecedingUnit(units, cursor.pos);
      cursor.advance();
      return true;
    }
    if (isQuotedJudgmentPassiveQuotationContext(cursor)) {
      this.appendQuotationMarkerUnits(cursor, units);
      return true;
    }
    if (await this.tryDispatchKakuParticle(token.surface, cursor, units, contentMap, layout, trace)) {
      return true;
    }
    if (isQuotationContext(cursor, this.lookups)) {
      const previousUnit = lastOutputUnit(units);
      if (previousUnit !== undefined) {
        const quotedDesirePlan = quotedDesireRenderPlan(previousUnit.renderPlan, token, cursor.pos);
        if (quotedDesirePlan !== null) {
          previousUnit.setRenderPlan(quotedDesirePlan, {
            rule: "quoted_desire_contraction",
            cacheValue: ""
          });
          absorbIntoPrecedingUnit(units, cursor.pos);
          cursor.advance(1 + this.appendQuoteMarkerFocusUnit(cursor, units));
          return true;
        }
      }
      this.appendQuotationMarkerUnits(cursor, units);
      return true;
    }
    return false;
  }

  private appendQuotationMarkerUnits(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): void {
    PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos, 1, "", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: "이라고/라고"
    });
    cursor.advance(1 + this.appendQuoteMarkerFocusUnit(cursor, units));
  }

  private appendQuoteMarkerFocusUnit(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): number {
    const focus = quoteMarkerFocusRealizationAt(cursor, this.lookups);
    if (focus === null) {
      return 0;
    }
    PipelineAssemblerMixin.appendUnit(units, cursor.tokens, cursor.pos + 1, focus.consumed, "", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: focus.allomorphKey
    });
    return focus.consumed;
  }

  static sahenNounFromNominalizablePlan(plan: RenderPlan | null): string | null {
    if (PipelineAssemblerMixin.isAttributivePlan(plan)) {
      return plan.sahenNoun ?? null;
    }
    if (plan?.kind === "legacySurfaceComposition" && typeof plan.suffix !== "string") {
      return PipelineAssemblerMixin.sahenNounFromNominalizablePlan(plan.suffix ?? null);
    }
    return null;
  }

  static isNegativeAuxToken(token: RuntimeHaruToken): boolean {
    const pos4 = token.pos & POS4;
    return (
      pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ
    ) || token.dictionaryForm === "ない" || token.dictionaryForm === "ぬ" || token.dictionaryForm === "ず";
  }

  static withConjugatedLemmaPrefix(plan: RenderPlan, prefix: RenderPlan | string | null | undefined): RenderPlan | null {
    if (prefix === undefined || prefix === null || prefix === "") {
      return plan;
    }
    if (typeof prefix !== "string" || plan.kind !== "conjugatedLemma") {
      return null;
    }
    return {
      ...plan,
      prefix: `${prefix}${plan.prefix ?? ""}`
    };
  }

  static verbBeforeTemporalPlanFromPlan(plan: RenderPlan | null): RenderPlan | null {
    if (PipelineAssemblerMixin.isAttributivePlan(plan)) {
      if (plan.koreanPos !== 동사) {
        return null;
      }
      const main: RenderPlan = plan.sahenNoun !== undefined && plan.sahenNoun !== null
        ? {
          kind: "conjugatedLemma",
          koreanLemma: `${plan.sahenNoun}하다`,
          irregular: "여",
          koreanPos: 동사,
          ending: "기",
          suffix: " 전"
        }
        : {
          kind: "conjugatedLemma",
          koreanLemma: plan.koreanLemma,
          irregular: plan.irregular,
          koreanPos: 동사,
          ending: "기",
          suffix: " 전"
        };
      return main;
    }
    if (plan?.kind === "legacySurfaceComposition") {
      const suffixPlan = typeof plan.suffix === "string"
        ? null
        : PipelineAssemblerMixin.verbBeforeTemporalPlanFromPlan(plan.suffix ?? null);
      if (suffixPlan === null) {
        return null;
      }
      const prefixed = PipelineAssemblerMixin.withConjugatedLemmaPrefix(suffixPlan, plan.prefix);
      if (prefixed !== null) {
        return prefixed;
      }
      return legacySurfaceCompositionPlan("assembler", {
        korean: plan.text ?? plan.korean ?? "",
        koreanPos: plan.koreanPos,
        suffix: suffixPlan,
        ...(plan.prefix === undefined ? {} : { prefix: plan.prefix }),
        ...(plan.rewritePrefixOnLemmaReplace === undefined ? {} : { rewritePrefixOnLemmaReplace: plan.rewritePrefixOnLemmaReplace }),
        rewriteSuffixOnLemmaReplace: true,
        rewritePrefixOnConnectiveReplace: false,
        rewriteSuffixOnConnectiveReplace: false
      });
    }
    if (plan?.kind === "lemma" && plan.koreanPos === 동사) {
      return {
        kind: "conjugatedLemma",
        koreanLemma: plan.koreanLemma,
        irregular: plan.irregular,
        koreanPos: 동사,
        ending: "기",
        suffix: " 전"
      };
    }
    return null;
  }

  static prevContentIndexBeforeUchiAux(tokens: readonly RuntimeHaruToken[], auxIdx: number): number | null {
    let cursor = auxIdx - 1;
    while (cursor >= 0) {
      const token = tokens[cursor];
      if (token === undefined) {
        return null;
      }
      switch (token.pos & POS0) {
        case 補助記号:
        case 記号:
        case 助動詞:
        case 接尾辞:
          cursor -= 1;
          break;
        case 動詞:
          if ((token.dictionaryForm === "なる" || token.dictionaryForm === "なれる") && (token.pos & POS1) === 非自立可能) {
            cursor -= 1;
            break;
          }
          return cursor;
        case 形容詞0:
        case 形状詞:
        case 名詞:
          return cursor;
        default:
          return null;
      }
    }
    return null;
  }

  static uchiUnawareModifierPlan(contentForm: string | undefined): RenderPlan | null {
    if (contentForm !== "気づく" && contentForm !== "気付く") {
      return null;
    }
    return {
      kind: "conjugatedLemma",
      koreanLemma: "알아차리지 못하다",
      irregular: null,
      koreanPos: 동사,
      ending: "ㄴ/는"
    };
  }

  static isPlainCopulaAuxToken(token: RuntimeHaruToken): boolean {
    return token.dictionaryForm === "だ" && (token.pos & POS4) === 助動詞_ダ;
  }

  static uchiAdjectivalModifierPlan(plan: RenderPlan | null): RenderPlan | null {
    if (!PipelineAssemblerMixin.isAttributivePlan(plan)) {
      return null;
    }
    if (plan.koreanPos !== 형용사) {
      return null;
    }
    if (plan.auxTokens.some((aux) => !PipelineAssemblerMixin.isPlainCopulaAuxToken(aux))) {
      return null;
    }
    const pos0 = plan.contentToken.pos & POS0;
    if ((pos0 !== 形容詞0) && (pos0 !== 形状詞) && (pos0 !== 名詞)) {
      return null;
    }
    return {
      kind: "conjugatedLemma",
      koreanLemma: plan.koreanLemma,
      irregular: plan.irregular,
      koreanPos: plan.koreanPos,
      ending: "ㄹ/을"
    };
  }

  rewriteUchiAdjectivalModifier(ctx: ParticleCtx): boolean {
    if (ctx.i < 2) {
      return false;
    }
    const headUnit = findUnitCoveringIndex(ctx.units, ctx.i - 1);
    if (headUnit === undefined) {
      return false;
    }
    let modifierUnit: TranslationUnit | undefined;
    for (let idx = ctx.i - 2; idx > Math.max(-1, ctx.i - 5); idx -= 1) {
      const unit = findUnitCoveringIndex(ctx.units, idx);
      if (unit === undefined || unit === headUnit) {
        continue;
      }
      const plan = PipelineAssemblerMixin.uchiAdjectivalModifierPlan(unit.renderPlan);
      if (plan === null) {
        continue;
      }
      modifierUnit = unit;
      break;
    }
    if (modifierUnit === undefined) {
      return false;
    }
    const plan = PipelineAssemblerMixin.uchiAdjectivalModifierPlan(modifierUnit.renderPlan);
    if (plan === null) {
      return false;
    }
    modifierUnit.setRenderPlan(plan, { rule: "PART-NI-UCHI-ADJ-TIME", cacheValue: "" });
    headUnit.setRenderPlan({ kind: "fixedText", text: "때", koreanPos: 명사 }, { rule: "PART-NI-UCHI-ADJ-TIME", cacheValue: "" });
    return true;
  }

  static uchiStatusNounIndex(tokens: readonly RuntimeHaruToken[], headIdx: number, lookups: LookupTables): number | null {
    if (headIdx < 2) {
      return null;
    }
    const nounToken = tokens[headIdx - 2];
    if (nominalLinkMarkerRelationAt(tokens, headIdx - 1, { consumers: ["assembler"] }) === null) {
      return null;
    }
    if (nounToken === undefined || !pos0in(nounToken.pos, NOMINAL_BITS)) {
      return null;
    }
    const nounForm = nounToken.dictionaryForm || nounToken.surface;
    return lookups.UCHI_STATUS_NOUNS.has(nounForm) ? headIdx - 2 : null;
  }

  rewriteUchiStatusNounModifier(ctx: ParticleCtx): boolean {
    const headIdx = ctx.i - 1;
    const nounIdx = PipelineAssemblerMixin.uchiStatusNounIndex(ctx.tokens, headIdx, this.lookups);
    if (nounIdx === null) {
      return false;
    }
    const nounUnit = findUnitCoveringIndex(ctx.units, nounIdx);
    const headUnit = findUnitCoveringIndex(ctx.units, headIdx);
    if (nounUnit === undefined || headUnit === undefined) {
      return false;
    }
    const nounLemma = PipelineAssemblerMixin.unitSourceKoreanLemma(nounUnit);
    if (nounLemma === null || nounLemma.length === 0) {
      return false;
    }
    nounUnit.setRenderPlan({
      kind: "conjugatedLemma",
      koreanLemma: `${nounLemma}이다`,
      irregular: null,
      koreanPos: 동사,
      ending: "ㄹ/을",
      suffix: " 때"
    }, { rule: "PART-UCHI-STATUS", cacheValue: "" });
    headUnit.suppress({ rule: "PART-UCHI-STATUS" });
    return true;
  }

  hasUchiAttributiveModifier(ctx: ParticleCtx): boolean {
    if (ctx.i < 2) {
      return false;
    }
    const unit = findUnitCoveringIndex(ctx.units, ctx.i - 2);
    return unit !== undefined &&
      renderPlanContainsAttributiveModifier(unit.renderPlan);
  }

  rewriteUchiPositiveHead(ctx: ParticleCtx, options: { readonly head: string }): boolean {
    const headUnit = findUnitCoveringIndex(ctx.units, ctx.i - 1);
    if (headUnit === undefined || !this.hasUchiAttributiveModifier(ctx)) {
      return false;
    }
    headUnit.setRenderPlan({ kind: "fixedText", text: options.head, koreanPos: 명사 }, { rule: "PART-UCHI-HEAD", cacheValue: "" });
    return true;
  }

  uchiTemporalIntervalVariant(ctx: ParticleCtx): TemporalIntervalHeadVariant | null {
    if (ctx.i === 0) {
      return null;
    }
    return temporalIntervalVariantHeadedAt(ctx.units.map((unit) => unit.renderPlan), ctx.i - 1);
  }

  haRuleUchiTopic(ctx: ParticleCtx): ParticleDecision | null {
    if (ctx.i === 0 || !isUchiTemporalHeadToken(ctx.tokens[ctx.i - 1]!)) {
      return null;
    }
    const variant = this.uchiTemporalIntervalVariant(ctx);
    if (variant !== null) {
      const locativeTopic = variant === "before";
      PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, locativeTopic ? "에는" : "", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL,
        ...(locativeTopic ? {} : { allomorphKey: "은/는" })
      });
      return PipelineAssemblerMixin.particleEmit(1);
    }
    if (ctx.i >= 3 && PipelineAssemblerMixin.isNegativeAuxToken(ctx.tokens[ctx.i - 2]!)) {
      const headUnit = findUnitCoveringIndex(ctx.units, ctx.i - 1);
      if (headUnit === undefined) {
        return null;
      }
      const auxIdx = ctx.i - 2;
      const contentIdx = PipelineAssemblerMixin.prevContentIndexBeforeUchiAux(ctx.tokens, auxIdx);
      if (contentIdx === null) {
        return null;
      }
      let modifierUnit = findUnitCoveringIndex(ctx.units, auxIdx);
      if (modifierUnit === undefined) {
        modifierUnit = findUnitCoveringIndex(ctx.units, contentIdx);
      }
      if (modifierUnit === undefined) {
        return null;
      }
      const contentForm = ctx.tokens[contentIdx]?.dictionaryForm;
      if (contentForm !== undefined && this.lookups.UCHI_UNAWARE_VERBS.has(contentForm)) {
        const unawarePlan = PipelineAssemblerMixin.uchiUnawareModifierPlan(contentForm);
        if (unawarePlan !== null) {
          modifierUnit.setRenderPlan(unawarePlan, { rule: "PART-HA-UCHI-UNAWARE", cacheValue: "" });
        }
        headUnit.setRenderPlan({ kind: "fixedText", text: "사이", koreanPos: 명사 }, { rule: "PART-HA-UCHI-UNAWARE", cacheValue: "" });
        PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, "에는", {
          unitType: UnitType.FUNCTIONAL,
          koreanPos: 조사,
          attachLeft: true,
          functionalKind: FunctionalKind.CONTEXTUAL
        });
        return PipelineAssemblerMixin.particleEmit(1);
      }
      const beforePlan = PipelineAssemblerMixin.verbBeforeTemporalPlanFromPlan(modifierUnit.renderPlan);
      if (beforePlan === null) {
        return null;
      }
      const sahenNoun = PipelineAssemblerMixin.sahenNounFromNominalizablePlan(modifierUnit.renderPlan);
      if (sahenNoun !== null && contentIdx > 0) {
        const nounUnit = findUnitCoveringIndex(ctx.units, contentIdx - 1);
        if (nounUnit !== undefined && PipelineAssemblerMixin.unitSourceKoreanLemma(nounUnit) === sahenNoun) {
          nounUnit.suppress({ rule: "PART-HA-UCHI-BEFORE-SAHEN" });
        }
      }
      modifierUnit.setRenderPlan(beforePlan, { rule: "PART-HA-UCHI-BEFORE", cacheValue: "" });
      headUnit.suppress({ rule: "PART-HA-UCHI-BEFORE" });
      PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, "에는", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      });
      return PipelineAssemblerMixin.particleEmit(1);
    }
    if (this.rewriteUchiAdjectivalModifier(ctx)) {
      PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, "는", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      });
      return PipelineAssemblerMixin.particleEmit(1);
    }
    if (this.rewriteUchiStatusNounModifier(ctx)) {
      PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, "는", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL
      });
      return PipelineAssemblerMixin.particleEmit(1);
    }
    if (this.rewriteUchiPositiveHead(ctx, { head: "동안" })) {
      PipelineAssemblerMixin.appendUnit(ctx.units, ctx.tokens, ctx.i, 1, "", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: 조사,
        attachLeft: true,
        functionalKind: FunctionalKind.CONTEXTUAL,
        allomorphKey: "은/는"
      });
      return PipelineAssemblerMixin.particleEmit(1);
    }
    return null;
  }

  static prenominalPromotionHeadAdmission(
    tokens: readonly RuntimeHaruToken[],
    reach: PrenominalMarkerHeadReach | null,
    lookups: LookupTables
  ): { readonly headToken: RuntimeHaruToken; readonly genitiveVetoed: boolean } | null {
    if (reach === null) {
      return null;
    }
    const headToken = tokens[reach.headIdx];
    if (headToken === undefined) {
      return null;
    }
    return {
      headToken,
      genitiveVetoed: lookups.NO_PREDICATE_PRENOMINAL_GENITIVE_HEADS.has(headToken.dictionaryForm)
    };
  }

  private static isAttributivePlan(plan: RenderPlan | null | undefined): plan is AttributiveRealization {
    return plan !== undefined && plan !== null && plan.kind === "attributive";
  }

  private async matchPronominalNoDispatch(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const previousUnit = PipelineAssemblerMixin.pronominalPreviousUnit(units, cursor.tokens, cursor.pos);
    const result = await tryBuildPronominalNoDispatch({
      cursor,
      previousUnitExists: previousUnit !== undefined,
      previousPossessiveContraction: previousUnit === undefined ? null : PipelineAssemblerMixin.pronominalPossessiveContraction(previousUnit),
      previousIsPronominalNominal: previousUnit === undefined ? false : PipelineAssemblerMixin.isPronominalNoNominalUnit(previousUnit, cursor.tokens, cursor.pos - 1),
      previousPredicateAttributivePlan: previousUnit === undefined
        ? null
        : PipelineAssemblerMixin.pronominalPredicateAttributivePlan(previousUnit, cursor.tokens),
      previousPredicateUnitTokenIndex: previousUnit?.jpIndices.at(-1) ?? null,
      lookups: this.lookups
    });
    if (result === null) return false;
    this.applyPronominalNoDispatchResult(cursor, units, result, trace);
    return true;
  }

  private async matchPronominalNoAuxDeDispatch(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const previousUnit = PipelineAssemblerMixin.pronominalPreviousUnit(units, cursor.tokens, cursor.pos) ?? lastOutputUnit(units);
    const result = await tryBuildPronominalNoAuxDeDispatch({
      cursor,
      previousUnitExists: previousUnit !== undefined,
      previousPossessiveContraction: previousUnit === undefined ? null : PipelineAssemblerMixin.pronominalPossessiveContraction(previousUnit),
      previousIsPronominalNominal: previousUnit === undefined ? false : PipelineAssemblerMixin.isPronominalNoNominalUnit(previousUnit, cursor.tokens, cursor.pos - 1),
      previousPredicateAttributivePlan: previousUnit === undefined
        ? null
        : PipelineAssemblerMixin.pronominalPredicateAttributivePlan(previousUnit, cursor.tokens),
      previousPredicateUnitTokenIndex: previousUnit?.jpIndices.at(-1) ?? null,
      lookups: this.lookups
    });
    if (result === null) return false;
    this.applyPronominalNoDispatchResult(cursor, units, result, trace);
    return true;
  }

  private static pronominalPossessiveContraction(unit: TranslationUnit): string | null {
    const lemma = PipelineAssemblerMixin.unitSourceKoreanLemma(unit);
    return lemma === null ? null : PRONOUN_POSSESSIVE_CONTRACTIONS[lemma] ?? null;
  }

  private static pronominalPreviousUnit(
    units: readonly TranslationUnit[],
    tokens: readonly RuntimeHaruToken[],
    markerIndex: number,
  ): TranslationUnit | undefined {
    const direct = findUnitCoveringIndex(units, markerIndex - 1);
    if (direct !== undefined || !isAdnominalCopulaToken(tokens[markerIndex - 1])) {
      return direct;
    }
    return findUnitCoveringIndex(units, markerIndex - 2);
  }

  private static pronominalPredicateAttributivePlan(
    unit: TranslationUnit,
    tokens: readonly RuntimeHaruToken[],
  ): RenderPlan | null {
    const plan = unit.renderPlan;
    if (plan?.kind === "attributive") {
      if (plan.koreanPos === 접미사) {
        return { kind: "fixedText", text: plan.koreanLemma, koreanPos: plan.koreanPos };
      }
      return plan;
    }
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      return projectPredicateHeadTailAttributivePlan(plan);
    }
    if (plan?.kind !== "lemma") {
      return null;
    }
    if (plan.koreanPos === 접미사) {
      return { kind: "fixedText", text: plan.koreanLemma, koreanPos: plan.koreanPos };
    }
    const contentToken = unit.jpIndices.length === 0
      ? unit.jpHead
      : tokens[Math.max(...unit.jpIndices)] ?? unit.jpHead;
    return {
      kind: "attributive",
      koreanLemma: plan.koreanLemma,
      irregular: plan.irregular,
      koreanPos: plan.koreanPos,
      auxTokens: plan.auxTokens,
      contentToken,
      ...(plan.voice === undefined ? {} : { voice: plan.voice }),
    };
  }

  private static unitSourceKoreanLemma(unit: TranslationUnit): string | null {
    const plan = unit.renderPlan;
    if (plan?.kind === "lemma") {
      return plan.koreanLemma;
    }
    if (unit.entry !== null && hasTranslationAccess(unit.entry) && unit.entry.committed === true) {
      return winnerKorean(unit.entry) ?? null;
    }
    return null;
  }

  private static isPronominalNoNominalUnit(unit: TranslationUnit, tokens: readonly RuntimeHaruToken[], noIndex: number): boolean {
    return unit.unitType === UnitType.CONTENT &&
      unit.jpIndices.includes(noIndex) &&
      pronominalNoMarkerRelationForToken(tokens[noIndex], noIndex, {
        requirement: "case_particle_tail",
        consumers: ["pronominal_no_dispatch"]
      }) !== null;
  }

  private applyPronominalNoDispatchResult(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    result: PronominalNoDispatchResult,
    trace?: TraceCollector | null
  ): void {
    const { tokens, pos: index } = cursor;
    for (const action of result.actions) {
      if (action.kind === "rewrite_previous") {
        findUnitCoveringIndex(units, action.tokenIndex)?.setRenderPlan(action.renderPlan, {
          rule: action.rule,
          cacheValue: ""
        });
      } else {
        const appendOptions: Parameters<typeof PipelineAssemblerMixin.appendUnit>[5] = {
          unitType: action.unitType,
          koreanPos: action.koreanPos,
          attachLeft: action.attachLeft
        };
        if (action.functionalKind !== undefined) {
          appendOptions.functionalKind = action.functionalKind;
        }
        if (action.allomorphKey !== undefined) {
          appendOptions.allomorphKey = action.allomorphKey;
        }
        if (action.renderPlan !== undefined) {
          appendOptions.renderPlan = action.renderPlan;
        }
        PipelineAssemblerMixin.appendUnit(units, tokens, action.start, action.consumed, action.korean, {
          ...appendOptions
        });
      }
    }
    if (trace !== undefined && trace !== null) {
      trace.record(new TraceEvent(
        index,
        "content_pass",
        result.dispatchProfile.traceKind ?? result.dispatchProfile.id,
        true,
        {
          consumed: result.consumed,
          ...result.traceDetail
        }
      ));
    }
    cursor.advance(result.consumed);
  }

  private tryApplyEllipticPoliteConfirmation(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    layout: ClauseLayout
  ): boolean {
    const { tokens, pos: index } = cursor;
    const desu = tokens[index];
    if (desu === undefined || (desu.pos & POS4) !== 助動詞_デス) {
      return false;
    }
    const particleIdx = previousNonSpaceIndex(tokens, index, 0);
    if (particleIdx === null) {
      return false;
    }
    const particle = tokens[particleIdx];
    if (
      particle === undefined ||
      !isEllipticConfirmationParticle(particle, this.lookups.set("elliptic_confirmation", "particles"))
    ) {
      return false;
    }
    const clause = layout.clauseOfToken(particleIdx);
    if (clause === undefined || clause.predicates.length > 0) {
      return false;
    }
    if (isNaniDeConfirmationVeto(tokens, particleIdx)) {
      return false;
    }
    const terminal = matchEllipticConfirmationTerminal(tokens, index, cursor.end);
    if (terminal === null) {
      return false;
    }
    if (lastOutputUnit(units) === undefined) {
      return false;
    }
    const { kaIdx, endExclusive } = terminal;
    PipelineAssemblerMixin.appendUnit(units, tokens, index, kaIdx - index, "요", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      renderPlan: { kind: "registerText", casual: "요", formal: " 말입니까", koreanPos: 조사 }
    });
    PipelineAssemblerMixin.appendUnit(units, tokens, kaIdx, endExclusive - kaIdx, "?", {
      unitType: UnitType.SYMBOL,
      koreanPos: 기호,
      attachLeft: true,
      attachRight: true
    });
    cursor.advance(endExclusive - index);
    return true;
  }

  private tryApplyParticlePhraseCopulaChain(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    layout: ClauseLayout,
    relationRenderSpans: readonly { readonly start: number; readonly endExclusive: number }[]
  ): boolean {
    const index = cursor.pos;
    const binding = particlePhraseCopulaHostBinding(layout, cursor.tokens, index);
    if (binding === null) {
      return false;
    }
    if (
      binding.pauseSpan !== undefined &&
      overlapsStructuralRelationRender(relationRenderSpans, { start: binding.hostHeadIdx, endExclusive: binding.chainEndExclusive })
    ) {
      return false;
    }
    const placement = this.copulaHostUnitPlacement(units, cursor.tokens, {
      hostHeadIdx: binding.hostHeadIdx,
      copulaStart: index,
      ...(binding.pauseSpan === undefined ? {} : { decorationSpan: binding.pauseSpan })
    });
    if (placement === null || placement.anchor.discourseConnective) {
      return false;
    }
    const previousUnit = placement.anchor;
    const chain = tryBuildParticlePhraseCopulaChain({
      tokens: cursor.tokens,
      limit: cursor.end,
      binding,
      hostSpan: placement.hostSpan,
      hostPlan: previousUnit.renderPlan,
      hostSurface: this.unitSurfaceForAssembly(previousUnit),
      hostSourceSpan: previousUnit.sourceSpan,
      hostMarkerKind: previousUnit.particleMarkerKind,
      hostMarkerCopulaBase: previousUnit.particleCopulaBase,
      ...(placement.decorationParts.length === 0 ? {} : { hostPauseParts: placement.decorationParts }),
      lookups: this.lookups
    });
    if (chain === null) {
      return false;
    }
    previousUnit.setRenderPlan(
      applyBareQuestionToRenderPlan(chain.plan, cursor.tokens, index + chain.consumed, cursor.end),
      { rule: "particle_phrase_copula_chain", cacheValue: "" }
    );
    this.foldCopulaHostUnits(placement, cursor.tokens, index, chain.consumed);
    cursor.advance(chain.consumed);
    return true;
  }

  private tryApplyPunctuatedCopulaChain(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    layout: ClauseLayout,
    relationRenderSpans: readonly { readonly start: number; readonly endExclusive: number }[]
  ): boolean {
    const index = cursor.pos;
    const binding = punctuatedCopulaHostBinding(layout, cursor.tokens, index);
    if (binding === null) {
      return false;
    }
    if (
      overlapsStructuralRelationRender(relationRenderSpans, {
        start: binding.hostSpan.start,
        endExclusive: Math.max(binding.hostSpan.endExclusive, binding.chainEndExclusive)
      })
    ) {
      return false;
    }
    const placement = this.copulaHostUnitPlacement(units, cursor.tokens, {
      hostHeadIdx: binding.hostHeadIdx,
      copulaStart: index,
      decorationSpan: binding.decorationSpan,
      ...(binding.contentStart > binding.hostSpan.start ? { hostLowerBound: binding.contentStart } : {})
    });
    if (placement === null || placement.anchor.discourseConnective) {
      return false;
    }
    const hostParts = this.copulaHostSequenceParts(placement, cursor.tokens);
    if (hostParts === null) {
      return false;
    }
    const hostHeadLexical = placement.hostUnits.length === 1
      ? punctuatedCopulaHostHeadLexical(placement.headUnit.renderPlan, placement.headUnit.sourceSpan)
      : null;
    const chain = tryBuildPunctuatedCopulaChain({
      tokens: cursor.tokens,
      limit: cursor.end,
      binding,
      hostSpan: {
        start: Math.min(binding.hostSpan.start, placement.hostSpan.start),
        endExclusive: Math.max(binding.hostSpan.endExclusive, placement.hostSpan.endExclusive)
      },
      hostParts,
      ...(hostHeadLexical === null ? {} : { hostHeadLexical }),
      lookups: this.lookups
    });
    if (chain === null) {
      return false;
    }
    placement.anchor.setRenderPlan(
      applyBareQuestionToRenderPlan(chain.plan, cursor.tokens, index + chain.consumed, cursor.end),
      { rule: "punctuated_copula_chain", cacheValue: "" }
    );
    this.foldCopulaHostUnits(placement, cursor.tokens, index, chain.consumed);
    cursor.advance(chain.consumed);
    return true;
  }

  private copulaHostUnitPlacement(
    units: readonly TranslationUnit[],
    tokens: readonly RuntimeHaruToken[],
    options: {
      readonly hostHeadIdx: number;
      readonly copulaStart: number;
      readonly decorationSpan?: { readonly start: number; readonly endExclusive: number };
      readonly hostLowerBound?: number;
    }
  ): CopulaHostUnitPlacement | null {
    const decorationStart = options.decorationSpan?.start ?? options.copulaStart;
    const hostUnits: TranslationUnit[] = [];
    const decorationUnits: TranslationUnit[] = [];
    let headUnit: TranslationUnit | undefined;
    for (const unit of units) {
      if (unit.suppressed || unit.jpIndices.length === 0) {
        continue;
      }
      if (unit.jpIndices.includes(options.copulaStart)) {
        return null;
      }
      const start = Math.min(...unit.jpIndices);
      const end = Math.max(...unit.jpIndices);
      if (start >= options.copulaStart) {
        continue;
      }
      if (start >= decorationStart) {
        decorationUnits.push(unit);
        continue;
      }
      if (end >= decorationStart) {
        return null;
      }
      if (unit.jpIndices.includes(options.hostHeadIdx)) {
        headUnit = unit;
        hostUnits.push(unit);
        continue;
      }
      if (options.hostLowerBound !== undefined && start >= options.hostLowerBound && end < options.hostHeadIdx) {
        hostUnits.push(unit);
      }
    }
    const anchor = headUnit !== undefined && canCarryCopulaHostPlan(headUnit)
      ? headUnit
      : hostUnits.find((unit) => canCarryCopulaHostPlan(unit));
    if (headUnit === undefined || anchor === undefined) {
      return null;
    }
    const hostIndices = hostUnits.flatMap((unit) => unit.jpIndices);
    return {
      anchor,
      headUnit,
      hostUnits,
      decorationUnits,
      hostSpan: { start: Math.min(...hostIndices), endExclusive: Math.max(...hostIndices) + 1 },
      decorationParts: options.decorationSpan === undefined
        ? []
        : decorationSurfaceParts(tokens, options.decorationSpan, decorationUnits)
    };
  }

  private copulaHostSequenceParts(
    placement: CopulaHostUnitPlacement,
    tokens: readonly RuntimeHaruToken[],
    replacements?: ReadonlyMap<number, RenderPlan>
  ): readonly PredicateHeadTailChainHostSequencePart[] | null {
    const parts = relationSourceUnitSequenceParts(
      tokens,
      placement.hostUnits,
      placement.hostUnits.map((_, offset) => offset),
      replacements
    );
    if (parts === null || parts.length === 0) {
      return null;
    }
    const provenanceUnit = (unit: TranslationUnit | null): TranslationUnit | null =>
      unit === placement.anchor ? null : unit;
    return [
      ...parts.map((entry) => entry.part.kind === "structuralText"
        ? {
          kind: "hostText" as const,
          text: entry.part.text,
          ...(entry.part.sourceSpan === undefined
            ? (entry.sourceSpan === null ? {} : { sourceSpan: entry.sourceSpan })
            : { sourceSpan: entry.part.sourceSpan }),
          unit: provenanceUnit(entry.unit)
        }
        : {
          kind: "hostPlan" as const,
          plan: entry.part,
          sourceSpan: entry.sourceSpan,
          unit: provenanceUnit(entry.unit)
        }),
      ...placement.decorationParts.map((part) => ({
        ...part,
        unit: provenanceUnit(part.unit ?? null)
      }))
    ];
  }

  private foldCopulaHostUnits(
    placement: CopulaHostUnitPlacement,
    tokens: readonly RuntimeHaruToken[],
    copulaStart: number,
    consumed: number
  ): void {
    const folded = [
      ...placement.hostUnits.filter((unit) => unit !== placement.anchor),
      ...placement.decorationUnits
    ];
    for (const unit of folded) {
      for (const tokenIndex of unit.jpIndices) {
        if (!placement.anchor.jpIndices.includes(tokenIndex)) {
          placement.anchor.jpIndices.push(tokenIndex);
        }
      }
      unit.suppress({ rule: "punctuated_copula_host_fold" });
    }
    for (let offset = 0; offset < consumed; offset += 1) {
      const tokenIndex = copulaStart + offset;
      if (!placement.anchor.jpIndices.includes(tokenIndex)) {
        placement.anchor.jpIndices.push(tokenIndex);
      }
    }
    placement.anchor.sourceSpan = sourceSpanForTokenIndexes(tokens, placement.anchor.jpIndices);
  }

  private tryApplyTrailingCopulaNegation(
    outerCursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): boolean {
    const startIndex = outerCursor.pos;
    const previousUnit = lastOutputUnit(units);
    if (previousUnit === undefined) {
      return false;
    }
    const preceding = this.unitSurfaceForAssembly(previousUnit);
    if (!canHostTrailingCopula(previousUnit, preceding)) {
      return false;
    }
    const matched = outerCursor.lookahead(0, cursor => {
      const copula = matchCopulaNegation(cursor);
      return copula === undefined ? undefined : { copula, baseConsumed: cursor.pos - startIndex };
    });
    if (matched === undefined) {
      return false;
    }
    const baseConsumed = matched.baseConsumed;
    const [polite, past, connective, additiveMo, conditionalNara, auxTokens] = matched.copula;
    const features = auxExtractFeatures(auxTokens, { lookups: this.lookups });
    const tail = outerCursor.lookahead(baseConsumed, cursor => {
      const questionTail = features.conjecture === true
        ? terminalQuestionTail(cursor)
        : null;
      const terminal = connective || conditionalNara || hasTerminalSentenceMark(cursor);
      return {
        questionTail,
        terminal,
        consumed: cursor.pos - startIndex
      };
    });
    const questionTail = tail.questionTail;
    const conjectureQuestion = questionTail !== null;
    if (!tail.terminal) {
      return false;
    }
    const basePlan = previousUnit.renderPlan;
    previousUnit.setRenderPlan({
      kind: "copulaPredicate",
      ...(basePlan === null ? { koreanLemma: preceding } : { base: withParticleStemProjection(basePlan) }),
      entry: previousUnit.entry,
      polite,
      past,
      jpPos: previousUnit.jpPos,
      additiveMo,
      conditionalNara,
      ...(connective ? { connective: "아니라" } : {}),
      ...(features.conjecture === true ? { conjecture: true } : {}),
      ...(conjectureQuestion ? { conjectureQuestion: true } : {})
    }, { rule: "trailing_copula_negation", cacheValue: "" });
    for (let offset = 0; offset < tail.consumed; offset += 1) {
      const tokenIndex = startIndex + offset;
      if (!previousUnit.jpIndices.includes(tokenIndex)) {
        previousUnit.jpIndices.push(tokenIndex);
      }
    }
    outerCursor.advance(tail.consumed);
    return true;
  }

  private matchDearuAux(
    outerCursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): boolean {
    const startIndex = outerCursor.pos;
    const token = outerCursor.tokens[startIndex];
    const aruToken = outerCursor.tokens[startIndex + 1];
    if (
      token === undefined
      || startIndex + 1 >= outerCursor.end
      || aruToken === undefined
      || !isCopulaSupportChainStartAt(outerCursor.tokens, startIndex)
    ) {
      return false;
    }
    const aruAuxMatch = outerCursor.lookahead(2, cursor => {
      const aux = collectAuxTokens(cursor);
      return { aux, afterAux: cursor.pos };
    });
    const aruAux = aruAuxMatch.aux;
    const copulaHostKaIdx = previousNonSpaceIndex(outerCursor.tokens, startIndex);
    if (
      copulaHostKaIdx !== null &&
      isQuestionParticleKaToken(outerCursor.tokens[copulaHostKaIdx]) &&
      !isWhIndefiniteKaMarker(outerCursor.tokens, copulaHostKaIdx, this.lookups) &&
      !isNominalizedQuestionCopulaComplementAt(outerCursor, copulaHostKaIdx)
    ) {
      return false;
    }
    if (!politeCopulaSupportTailIsRealizable(outerCursor.tokens, aruAux, aruAuxMatch.afterAux, outerCursor.end, this.lookups)) {
      return false;
    }
    const cursor = outerCursor.fork(aruAuxMatch.afterAux, outerCursor.end, startIndex);
    const preceding = this.precedingForAllomorph(units);
    const aruPos5A = aruToken.pos & POS5A;
    const prefaceHost = isPrefaceConnectiveCopulaHostAt(outerCursor.tokens, startIndex);
    let copula: string;
    if ((aruPos5A === 連用形_) && aruAux.length === 0) {
      if (cursor.currentIs(tok => tok.surface === "ながら" && (tok.pos & POS0) === 助詞)) {
        cursor.advance();
        copula = "이면서도";
      } else {
        copula = "이며";
      }
    } else if (hasRentaikei(aruToken) && aruAux.length === 0) {
      copula = "인";
    } else if (aruAux.length > 0) {
      copula = "";
    } else {
      copula = hasBatchim(preceding) === true ? "이다" : "다";
    }
    if (aruAux.length > 0) {
      const previousUnit = lastOutputUnit(units);
      const connectiveTail = trailingCopulaConnectiveTailDetailed(cursor, this.lookups, { prefaceHost });
      const connective = connectiveTail?.ending ?? null;
      if (connectiveTail !== null) {
        const puncConsumed = this.tryAppendTrailingPunctuationCopulaConnective(
          outerCursor.tokens,
          startIndex,
          cursor.consumed,
          units,
          aruAux,
          connectiveTail.ending
        );
        if (puncConsumed !== null) {
          outerCursor.advance(puncConsumed);
          return true;
        }
      }
      if (connective !== null) {
        const hostTakesConnective = previousUnit !== undefined && (
          canHostTrailingCopulaConnective(previousUnit, preceding) ||
          prefaceHost ||
          (copulaHostKaIdx !== null && isNominalizedQuestionCopulaComplementAt(outerCursor, copulaHostKaIdx))
        );
        if (!hostTakesConnective) {
          return false;
        }
        applyHeadedPlanTrailingCopula(previousUnit!, "", {
          auxTokens: aruAux,
          baseText: preceding,
          connective,
          politeConnective: connectiveTail?.politeEnding ?? null,
          politeFormalConnective: connectiveTail?.politeFormalEnding ?? null
        });
        for (let offset = 0; offset < cursor.consumed; offset++) {
          if (!previousUnit!.jpIndices.includes(startIndex + offset)) {
            previousUnit!.jpIndices.push(startIndex + offset);
          }
        }
        outerCursor.advance(cursor.consumed);
        return true;
      }
      if (
        previousUnit?.renderPlan == null &&
        !canHostTrailingCopula(previousUnit, preceding) &&
        !isQuoteClosingCopulaHostAt(outerCursor.tokens, startIndex)
      ) {
        return false;
      }
      if (previousUnit !== undefined && previousUnit.unitType !== UnitType.SYMBOL) {
        const headToken = cursor.currentIs(tok => pos0in(tok.pos, NOMINAL_BITS))
          ? cursor.current()!
          : null;
        const rashiiPlan = dearuNounRashiiRenderPlan(preceding, aruAux, null, { headNounToken: headToken });
        if (rashiiPlan === null) {
          applyHeadedPlanTrailingCopula(previousUnit, "", { auxTokens: aruAux, baseText: preceding });
        } else {
          previousUnit.setRenderPlan(rashiiPlan, { rule: "dearu_noun_rashii", cacheValue: "" });
        }
        for (let offset = 0; offset < cursor.consumed; offset++) {
          if (!previousUnit.jpIndices.includes(startIndex + offset)) {
            previousUnit.jpIndices.push(startIndex + offset);
          }
        }
      } else {
        const headToken = cursor.currentIs(tok => pos0in(tok.pos, NOMINAL_BITS))
          ? cursor.current()!
          : null;
        const rashiiPlan = dearuNounRashiiRenderPlan(preceding, aruAux, null, { headNounToken: headToken });
        PipelineAssemblerMixin.appendUnit(units, outerCursor.tokens, startIndex, cursor.consumed, "", {
          unitType: UnitType.CONTENT,
          renderPlan: rashiiPlan ?? {
            kind: "copulaPredicate",
            polarity: "affirmative",
            base: { kind: "fixedText", text: preceding },
            auxTokens: aruAux
          }
        });
      }
      outerCursor.advance(cursor.consumed);
      return true;
    }
    const previousUnit = lastOutputUnit(units);
    const connectiveTail = trailingCopulaConnectiveTailDetailed(cursor, this.lookups, { prefaceHost });
    const connective = connectiveTail?.ending ?? null;
    if (connective !== null) {
      const puncConsumed = this.tryAppendTrailingPunctuationCopulaConnective(
        outerCursor.tokens,
        startIndex,
        cursor.consumed,
        units,
        [],
        connective
      );
      if (puncConsumed !== null) {
        outerCursor.advance(puncConsumed);
        return true;
      }
    }
    if (
      connective !== null &&
      previousUnit !== undefined &&
      (canHostTrailingCopulaConnective(previousUnit, preceding) || prefaceHost)
    ) {
      applyHeadedPlanTrailingCopula(previousUnit, "", {
        auxTokens: [],
        baseText: preceding,
        connective,
        politeConnective: connectiveTail?.politeEnding ?? null,
        politeFormalConnective: connectiveTail?.politeFormalEnding ?? null
      });
      for (let offset = 0; offset < cursor.consumed; offset++) {
        if (!previousUnit.jpIndices.includes(startIndex + offset)) {
          previousUnit.jpIndices.push(startIndex + offset);
        }
      }
      outerCursor.advance(cursor.consumed);
      return true;
    }
    PipelineAssemblerMixin.appendUnit(units, outerCursor.tokens, startIndex, cursor.consumed, copula, {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL
    });
    outerCursor.advance(cursor.consumed);
    return true;
  }

  private tryAppendTrailingPunctuationCopulaConnective(
    tokens: readonly RuntimeHaruToken[],
    index: number,
    consumed: number,
    units: TranslationUnit[],
    auxTokens: AuxTokens,
    connective: string
  ): number | null {
    const hostUnit = punctuatedCopulaTailHostUnit(units);
    if (hostUnit === undefined) {
      return null;
    }
    const preceding = this.unitSurfaceForAssembly(hostUnit);
    if (!canHostTrailingCopulaConnective(hostUnit, preceding)) {
      return null;
    }
    const suffix = trailingCopulaConnectiveSuffix(preceding, connective, auxTokens, this.lookups);
    if (suffix.length === 0) {
      return null;
    }
    PipelineAssemblerMixin.appendUnit(units, tokens, index, consumed, "", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      attachLeft: true,
      functionalKind: FunctionalKind.CONTEXTUAL,
      renderPlan: { kind: "fixedText", text: suffix, koreanPos: 조사 }
    });
    return consumed;
  }

  private hasPunctuatedCopulaConnectiveHost(units: readonly TranslationUnit[]): boolean {
    const hostUnit = punctuatedCopulaTailHostUnit(units);
    if (hostUnit === undefined) {
      return false;
    }
    return canHostTrailingCopulaConnective(hostUnit, this.unitSurfaceForAssembly(hostUnit));
  }

  private tryAppendPunctuatedCopulaTerminalTail(
    cursor: TokenCursor<RuntimeHaruToken>,
    index: number,
    tailStart: number,
    units: TranslationUnit[],
    auxTokens: AuxTokens
  ): number | null {
    if (cursor.lookahead(tailStart - cursor.pos, hasTerminalSentenceMark)) {
      const consumed = tailStart - index;
      if (!this.tryAppendPunctuatedTerminalCopula(cursor, index, consumed, units, auxTokens, null)) return null;
      return consumed;
    }
    const questionMatch = cursor.lookahead(tailStart - cursor.pos, c => {
      const question = terminalQuestionTail(c);
      return question === null ? null : { question, consumed: c.pos - index };
    });
    if (questionMatch !== null) {
      if (!this.tryAppendPunctuatedTerminalCopula(cursor, index, questionMatch.consumed, units, auxTokens, "polite_q")) return null;
      const question = questionMatch.question;
      if (question.absorbPeriod) {
        PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index + auxTokens.length, questionMatch.consumed - auxTokens.length, "?", {
          unitType: UnitType.SYMBOL,
          koreanPos: 기호,
          attachLeft: true,
          attachRight: true
        });
      }
      return questionMatch.consumed;
    }
    const sfpMatch = cursor.lookahead(tailStart - cursor.pos, c => {
      const sfp = trailingCopulaSfpTail(c);
      return sfp === null ? null : { sfp, consumed: c.pos - index };
    });
    if (sfpMatch !== null) {
      if (!this.tryAppendPunctuatedTerminalCopula(cursor, index, sfpMatch.consumed, units, auxTokens, sfpMatch.sfp)) return null;
      return sfpMatch.consumed;
    }
    return null;
  }

  private tryAppendPunctuatedTerminalCopula(
    cursor: TokenCursor<RuntimeHaruToken>,
    index: number,
    consumed: number,
    units: TranslationUnit[],
    auxTokens: AuxTokens,
    sfp: string | null
  ): boolean {
    const hostUnit = punctuatedCopulaTailHostUnit(units);
    if (hostUnit === undefined) {
      return false;
    }
    const preceding = this.unitSurfaceForAssembly(hostUnit);
    if (!canHostTrailingCopula(hostUnit, preceding)) {
      return false;
    }
    const casualFeatures = auxExtractFeatures(auxTokens, { lookups: this.lookups });
    casualFeatures.copula = true;
    const formalFeatures = auxExtractFeatures(auxTokens, { lookups: this.lookups });
    formalFeatures.copula = true;
    const casualFull = nounCopula(preceding, casualFeatures, false, this.lookups, sfp ?? undefined).text;
    const formalFull = nounCopula(preceding, formalFeatures, true, this.lookups, sfp ?? undefined).text;
    const casualSuffix = casualFull.startsWith(preceding) ? casualFull.slice(preceding.length) : casualFull;
    const formalSuffix = formalFull.startsWith(preceding) ? formalFull.slice(preceding.length) : formalFull;
    if (casualSuffix.length === 0 || formalSuffix.length === 0) {
      return false;
    }
    PipelineAssemblerMixin.appendUnit(units, cursor.tokens, index, consumed, "", {
      unitType: UnitType.FUNCTIONAL,
      koreanPos: 조사,
      functionalKind: FunctionalKind.CONTEXTUAL,
      renderPlan: { kind: "registerText", casual: casualSuffix, formal: formalSuffix, koreanPos: 조사 }
    });
    return true;
  }

  private async matchFocusDakeCopulaTail(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[],
    trace?: TraceCollector | null
  ): Promise<boolean> {
    const startIndex = cursor.pos;
    const previousUnit = lastOutputUnit(units);
    if (previousUnit === undefined || !PREDICATE_POS.has(previousUnit.koreanPos)) {
      return false;
    }
    const result = await tryBuildScopeCarrierDispatch({
      cursor,
      previousPlan: previousUnit.renderPlan,
      previousKoreanPos: previousUnit.koreanPos,
      lookups: this.lookups
    });
    if (result.kind === "none") {
      return false;
    }
    previousUnit.setRenderPlan(result.renderPlan, {
      rule: result.rule,
      cacheValue: ""
    });
    for (let consumedIndex = startIndex; consumedIndex < startIndex + result.consumed; consumedIndex += 1) {
      if (!previousUnit.jpIndices.includes(consumedIndex)) {
        previousUnit.jpIndices.push(consumedIndex);
      }
    }
    if (result.appendQuestionMark === true) {
      PipelineAssemblerMixin.appendUnit(units, cursor.tokens, startIndex + result.consumed - 1, 1, "?", {
        unitType: UnitType.SYMBOL,
        koreanPos: 기호,
        attachLeft: true,
        attachRight: true
      });
    }
    if (trace !== undefined && trace !== null) {
      trace.record(new TraceEvent(
        startIndex,
        "content_pass",
        "scope_carrier_dispatch",
        true,
        {
          consumed: result.consumed,
          ...result.traceDetail
        }
      ));
    }
    cursor.advance(result.consumed);
    return true;
  }

  private matchNominalDakeCopulaTail(
    cursor: TokenCursor<RuntimeHaruToken>,
    units: TranslationUnit[]
  ): number | null {
    const { tokens, pos: index, end: n } = cursor;
    if (tokens[index]?.surface !== "だけ") {
      return null;
    }
    const host = nominalDakeCopulaHostUnit(units);
    if (host === null) {
      return null;
    }
    const copulaTail = matchCopulaTailWithOptionalConditional(cursor.fork(index + 1, n), { skipLeadingSpace: true });
    if (copulaTail === null) {
      return null;
    }
    const { auxTokens } = copulaTail;
    if (auxTokens.length === 0 && copulaTail.connective === null) {
      return null;
    }

    const tailState = cursor.lookahead(1 + copulaTail.consumed, tailCursor => {
      let connective: string | null = copulaTail.connective;
      let sfp: string | null = null;
      let appendQuestionMark: readonly [start: number, consumed: number] | null = null;

      if (connective === null) {
        const connectiveTail = trailingCopulaConnectiveTail(tailCursor, this.lookups);
        if (connectiveTail !== null) {
          connective = connectiveTail;
        } else if (nominalDakeTameReasonTail(tailCursor, index, this.lookups)) {
          connective = "기 때문에";
        } else {
          const qStartPos = tailCursor.pos;
          const questionResult3 = terminalQuestionTail(tailCursor);
          if (questionResult3 !== null) {
            sfp = "polite_q";
            if (questionResult3.absorbPeriod) {
              appendQuestionMark = [qStartPos, tailCursor.pos - qStartPos];
            }
          } else {
            const trailingSfp3 = trailingCopulaSfpTail(tailCursor);
            if (trailingSfp3 !== null) {
              sfp = trailingSfp3;
            } else if (copulaTail.connectiveBeforeWeakBoundary !== null && isWeakPunctuationToken(tokens[tailCursor.pos])) {
              connective = copulaTail.connectiveBeforeWeakBoundary;
            } else if (!tailCursor.lookahead(0, hasTerminalSentenceMark)) {
              return null;
            }
          }
        }
      }
      return { connective, sfp, appendQuestionMark, consumed: tailCursor.pos - index };
    });
    if (tailState === null) {
      return null;
    }
    const { connective, sfp, appendQuestionMark, consumed } = tailState;

    const focusedBase = host.mode === "inline"
      ? attachParticleRenderPlan(host.renderPlan, "만")
      : attachParticleRenderPlan({ kind: "fixedText", text: "", koreanPos: 구 }, "만");
    if (focusedBase === null) {
      return null;
    }
    const renderPlan: RenderPlan = {
      kind: "copulaPredicate",
      polarity: "affirmative",
      base: focusedBase,
      auxTokens,
      connective,
      sfp
    };
    if (host.mode === "inline") {
      host.unit.setRenderPlan(renderPlan, { rule: "nominal_dake_trailing_copula", cacheValue: "" });
      for (let offset = 0; offset < consumed; offset += 1) {
        const tokenIndex = index + offset;
        if (!host.unit.jpIndices.includes(tokenIndex)) {
          host.unit.jpIndices.push(tokenIndex);
        }
      }
    } else {
      PipelineAssemblerMixin.appendUnit(units, tokens, index, consumed, "", {
        unitType: UnitType.FUNCTIONAL,
        koreanPos: host.unit.koreanPos,
        attachLeft: true,
        renderPlan,
        functionalKind: FunctionalKind.CONTEXTUAL,
        provenanceReason: "nominal_dake_trailing_copula_suffix"
      });
    }
    if (appendQuestionMark !== null) {
      PipelineAssemblerMixin.appendUnit(units, tokens, appendQuestionMark[0], appendQuestionMark[1], "?", {
        unitType: UnitType.SYMBOL,
        koreanPos: 기호,
        attachLeft: true,
        attachRight: true
      });
    }
    return consumed;
  }

  generate(units: readonly TranslationUnit[]): string {
    return this._generate(units);
  }

  protected async buildUnitIrForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode: { readonly reanalysis: "record_only" },
    space?: TokenSpaceContext
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] }>;
  protected async buildUnitIrForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode?: undefined,
    space?: TokenSpaceContext
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] } | ReanalysisFlipRequest>;
  protected async buildUnitIrForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode?: { readonly reanalysis: "record_only" },
    space: TokenSpaceContext = {}
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] } | ReanalysisFlipRequest> {
    const built = await this.buildUnitsForAssembly(tokens, mode, space);
    if (isReanalysisFlipRequest(built)) {
      return built;
    }
    const { units, warnings } = built;
    for (const unit of units) {
      if (unit.renderPlan !== null || unit.allomorphKey !== null) {
        clearGeneratedSurfaceCache(unit, { rule: "shared-unit-ir" });
      }
    }
    return { units, warnings };
  }

  private async buildUnitsForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode: { readonly reanalysis: "record_only" },
    space?: TokenSpaceContext
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] }>;
  private async buildUnitsForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode?: { readonly reanalysis: "record_only" },
    space?: TokenSpaceContext
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] } | ReanalysisFlipRequest>;
  private async buildUnitsForAssembly(
    tokens: readonly RuntimeHaruToken[],
    mode?: { readonly reanalysis: "record_only" },
    space: TokenSpaceContext = {}
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] } | ReanalysisFlipRequest> {
    const transferred = await this.lexicalTransfer(
      tokens,
      {
        ...(mode?.reanalysis === "record_only" ? { reanalysis: "record_only" as const } : {}),
        tokenSpace: space
      }
    );
    if (isReanalysisFlipRequest(transferred)) {
      return transferred;
    }
    let units = transferred.units;
    const failClosedWarnings = transferred.warnings;
    this.semanticTransfer(units);
    applyQuotedKotoTopicContraction(units);
    applyKotoWoWishComplement(units, { lookups: this.lookups, numeric: this.numeric });
    applyQuoteHostFrameRendering(units, tokens, { lookups: this.lookups });
    applyBenefactiveRecipientOrdering(units, tokens, this.lookups);
    const leadingRecovery = buildLeadingFunctionalPrefixUnitsPorted(tokens, units, { lookups: this.lookups });
    if (leadingRecovery !== undefined) {
      const kept = units.filter((unit) =>
        unit.jpIndices.some((idx) => idx >= leadingRecovery.replaceEndExclusive)
      );
      units = [...leadingRecovery.units, ...kept];
    }
    units = buildFunctionalMinimalFallbackUnitsPorted(tokens, units, { lookups: this.lookups }) ?? units;
    absorbOrphanShuujoshi(tokens, units);
    absorbOrphanHojokigou(tokens, units);
    const assemblyWarnings: Warning[] = [...failClosedWarnings];
    if (!phase3InvariantHolds(units)) {
      assemblyWarnings.push({
        type: "assembly_invariant",
        severity: "error",
        opKind: "phase3_renderable",
        message: "Surface pass invariant violation: non-suppressed unit must remain renderable"
      });
    }
    if (!allNonWhitespaceTokensCovered(tokens, units)) {
      const uncov = collectUncoveredTokenIndices(tokens, units);
      const detail = uncov.map(i => `${i}:${tokens[i]?.surface ?? "?"}(${posToString(tokens[i]?.pos ?? 0).split("|")[0] ?? "?"}/${posToString(tokens[i]?.pos ?? 0).split("|")[1] ?? "?"})`).join(", ");
      assemblyWarnings.push({
        type: "assembly_invariant",
        severity: "error",
        opKind: "uncovered_tokens",
        message: `Assembly invariant violation: uncovered tokens [${detail}]`
      });
    }
    return { units, warnings: assemblyWarnings };
  }

  private async lexicalTransfer(
    tokens: readonly RuntimeHaruToken[],
    options: { readonly trace?: TraceCollector | null; readonly reanalysis?: "record_only"; readonly tokenSpace?: TokenSpaceSourceContext } = {}
  ): Promise<{ units: TranslationUnit[]; warnings: readonly Warning[] } | ReanalysisFlipRequest> {
    const { contentMap, layout, protoLayout } = await this.selectLexicalLayoutHypothesis(tokens, options);
    const shouldObserveStructuralRelationGraph = this.shouldObserveStructuralRelationGraph();
    const structuralRelationRenderConfig = this.structuralRelationRenderConfig();
    const structuralRelationGraph = shouldObserveStructuralRelationGraph || structuralRelationRenderConfig !== null
      ? useActiveProtoLayout(protoLayout, () => buildStructuralRelationGraph({
        tokens,
        layout,
        contentMap,
        lookups: this.lookups
      }))
      : null;
    if (shouldObserveStructuralRelationGraph && structuralRelationGraph !== null) {
      this.observeStructuralRelationGraph(structuralRelationGraph);
    }
    const reanalysisRecord = resolveDeferredReanalysisProposals(this.reanalysis, {
      tokens,
      contentMap,
      layout,
      lookups: this.lookups,
      numeric: this.numeric
    });
    if (reanalysisRecord !== null) {
      this.observeReanalysisResolution(reanalysisRecord);
      if (options.reanalysis !== "record_only") {
        const activations = reanalysisRecord.proposals
          .filter((proposal) => proposal.confirmed)
          .map((proposal) => ({
            kind: proposal.flipKind,
            rowId: proposal.rowId,
            anchorSourceOrdinal: proposal.anchorSourceOrdinal
          }));
        if (activations.length > 0) {
          return { kind: "reanalysis_flip", activations, resolution: reanalysisRecord };
        }
      }
    }
    const relationRenderSpans = structuralRelationRenderConfig !== null && structuralRelationGraph !== null
      ? structuralRelationRenderTokenSpans(structuralRelationGraph, structuralRelationRenderConfig)
      : [];
    let units = await useActiveProtoLayout(protoLayout, () => this.assemblyPass(tokens, contentMap, layout, {
      ...options,
      relationRenderSpans
    }));
    attachRegisteredHeadedAssemblyUnitPlanLifecycle({
      units,
      ownerSpans: contentMap,
      layout,
      tokens
    });
    if (structuralRelationRenderConfig !== null && structuralRelationGraph !== null) {
      const structuralRelationRenderResult = applyStructuralRelationRender({
        tokens,
        units,
        graph: structuralRelationGraph,
        config: structuralRelationRenderConfig,
        lookups: this.lookups,
        numeric: this.numeric,
      });
      this.observeStructuralRelationRenderResult(structuralRelationRenderResult);
      units = [...structuralRelationRenderResult.units];
    }
    return { units, warnings: harvestFailClosedSpanWarnings(contentMap) };
  }

  private async selectLexicalLayoutHypothesis(
    tokens: readonly RuntimeHaruToken[],
    options: { readonly trace?: TraceCollector | null; readonly tokenSpace?: TokenSpaceSourceContext } = {}
  ) {
    const lexicalBoundaryOptions = {
      lexicalParticleBoundaryClaims: await collectLexicalParticleBoundaryClaims(this.dictionary, tokens),
      lexicalRenyouHeadClaims: await collectLexicalRenyouHeadClaims(this.dictionary, tokens),
      lexicalNominalHeadClaims: await collectLexicalNominalHeadClaims(this.dictionary, tokens, this.lookups),
      ...(options.tokenSpace === undefined ? {} : { tokenSpace: options.tokenSpace })
    };
    const observeCommitment = options.trace != null;
    const adopt = (variant: LexicalLayoutHypothesisRun) => adoptLexicalLayoutHypothesis(variant, options.trace ?? null);
    const { variant: renyouSelected, renyouVerbReadings } = await this.selectRenyouVerbReadingHypothesis(
      tokens,
      lexicalBoundaryOptions,
      observeCommitment
    );
    const renyouBoundaryOptions = renyouVerbReadings.size === 0
      ? lexicalBoundaryOptions
      : { ...lexicalBoundaryOptions, renyouVerbReadings };
    const { variant: initial, whitespaceAttributiveReadings } = await this.selectWhitespaceAttributiveReadingHypothesis(
      tokens,
      renyouSelected,
      renyouBoundaryOptions,
      observeCommitment
    );
    const boundaryOptions = whitespaceAttributiveReadings.size === 0
      ? renyouBoundaryOptions
      : { ...renyouBoundaryOptions, whitespaceAttributiveReadings };
    const initialProto = initial.protoLayout;
    const initialAffiliations = initialProto.lexicalAdverbialAffiliations;
    const hasPathCandidate = [...initialAffiliations.values()].some((affiliation) =>
      affiliation.relation === "unresolved" &&
      (affiliation.evidence.kind === "first_predicate_chain" || affiliation.evidence.kind === "no_predicate_chain")
    );
    if (!hasPathCandidate) {
      return adopt(initial);
    }

    const questionOwnedHeads = this.questionOwnedLexicalAdverbialHeads(tokens, initialProto, initial);
    const collect = (variant: LexicalLayoutHypothesisRun) => useActiveProtoLayout(variant.protoLayout, () =>
      new Map([
        ...collectInterveningClauseAffiliations(
          tokens,
          initialAffiliations,
          variant.layout,
          variant.contentMap,
          this.lookups,
          questionOwnedHeads
        ),
        ...collectEllipticRequestFragmentAffiliations(tokens, initialAffiliations, variant.layout, questionOwnedHeads)
      ])
    );
    const reverified = (variant: LexicalLayoutHypothesisRun, proposed: LexicalAdverbialAffiliationFacts) => {
      const verified = collect(variant);
      const kept = new Map<number, LexicalAdverbialAffiliation>();
      for (const [particleIdx, affiliation] of proposed) {
        const current = verified.get(particleIdx);
        if (current !== undefined && sameLexicalAdverbialAffiliation(current, affiliation, { includeClauseOrdinals: false })) {
          kept.set(particleIdx, current);
        }
      }
      return kept;
    };
    const rebuildWith = (affiliations: LexicalAdverbialAffiliationFacts) => this.runLexicalLayoutHypothesis(
      tokens,
      buildProtoLayout(tokens, this.lookups, { ...boundaryOptions, lexicalAdverbialAffiliationOverrides: affiliations }),
      observeCommitment
    );

    const proposals = collect(initial);
    if (proposals.size === 0) {
      return adopt(initial);
    }
    const requested = await rebuildWith(proposals);
    const confirmed = reverified(requested, proposals);
    if (sameLexicalAdverbialAffiliationFacts(proposals, confirmed)) {
      return adopt(requested);
    }
    if (confirmed.size > 0) {
      const partial = await rebuildWith(confirmed);
      if (sameLexicalAdverbialAffiliationFacts(confirmed, reverified(partial, confirmed))) {
        return adopt(partial);
      }
    }
    return adopt(initial);
  }

  private async selectRenyouVerbReadingHypothesis(
    tokens: readonly RuntimeHaruToken[],
    boundaryOptions: ClauseBoundaryDetectionOptions,
    observeCommitment: boolean
  ): Promise<{ readonly variant: LexicalLayoutHypothesisRun; readonly renyouVerbReadings: RenyouVerbReadingFacts }> {
    const initial = await this.runLexicalLayoutHypothesis(
      tokens,
      buildProtoLayout(tokens, this.lookups, boundaryOptions),
      observeCommitment
    );
    const frameSlotsOf = (variant: LexicalLayoutHypothesisRun) => (predicateIdx: number) =>
      ownedSelectedFrameSlotFills(tokens, predicateIdx, variant.layout, variant.contentMap, this.lookups, this.numeric);
    const proposals = useActiveProtoLayout(initial.protoLayout, () =>
      collectRenyouVerbReadingProposals(tokens, initial.layout, this.lookups, frameSlotsOf(initial))
    );
    if (proposals.size === 0) {
      return { variant: initial, renyouVerbReadings: proposals };
    }
    const rebuildWith = (readings: RenyouVerbReadingFacts) => this.runLexicalLayoutHypothesis(
      tokens,
      buildProtoLayout(tokens, this.lookups, { ...boundaryOptions, renyouVerbReadings: readings }),
      observeCommitment
    );
    const reverified = (variant: LexicalLayoutHypothesisRun, proposed: RenyouVerbReadingFacts) =>
      useActiveProtoLayout(variant.protoLayout, () =>
        reverifiedRenyouVerbReadings(tokens, proposed, variant.layout, variant.contentMap, this.lookups, frameSlotsOf(variant))
      );
    const verbReading = await rebuildWith(proposals);
    const confirmed = reverified(verbReading, proposals);
    if (sameRenyouVerbReadingFacts(proposals, confirmed)) {
      return { variant: verbReading, renyouVerbReadings: confirmed };
    }
    if (confirmed.size > 0) {
      const partial = await rebuildWith(confirmed);
      if (sameRenyouVerbReadingFacts(confirmed, reverified(partial, confirmed))) {
        return { variant: partial, renyouVerbReadings: confirmed };
      }
    }
    return { variant: initial, renyouVerbReadings: new Map() };
  }

  private async selectWhitespaceAttributiveReadingHypothesis(
    tokens: readonly RuntimeHaruToken[],
    initial: LexicalLayoutHypothesisRun,
    boundaryOptions: ClauseBoundaryDetectionOptions,
    observeCommitment: boolean
  ): Promise<{
    readonly variant: LexicalLayoutHypothesisRun;
    readonly whitespaceAttributiveReadings: WhitespaceAttributiveReadingFacts;
  }> {
    const proposals = useActiveProtoLayout(initial.protoLayout, () =>
      collectWhitespaceAttributiveReadingProposals(tokens, initial.layout, initial.contentMap, this.lookups)
    );
    if (proposals.size === 0) {
      return { variant: initial, whitespaceAttributiveReadings: proposals };
    }
    const rebuildWith = (readings: WhitespaceAttributiveReadingFacts) => this.runLexicalLayoutHypothesis(
      tokens,
      buildProtoLayout(tokens, this.lookups, { ...boundaryOptions, whitespaceAttributiveReadings: readings }),
      observeCommitment
    );
    const reverified = (variant: LexicalLayoutHypothesisRun, proposed: WhitespaceAttributiveReadingFacts) =>
      useActiveProtoLayout(variant.protoLayout, () =>
        reverifiedWhitespaceAttributiveReadings(tokens, proposed, variant.layout, variant.contentMap, this.lookups)
      );
    const attributive = await rebuildWith(proposals);
    const confirmed = reverified(attributive, proposals);
    if (sameWhitespaceAttributiveReadingFacts(proposals, confirmed)) {
      return { variant: attributive, whitespaceAttributiveReadings: confirmed };
    }
    if (confirmed.size > 0) {
      const partial = await rebuildWith(confirmed);
      if (sameWhitespaceAttributiveReadingFacts(confirmed, reverified(partial, confirmed))) {
        return { variant: partial, whitespaceAttributiveReadings: confirmed };
      }
    }
    return { variant: initial, whitespaceAttributiveReadings: new Map() };
  }

  private async runLexicalLayoutHypothesis(
    tokens: readonly RuntimeHaruToken[],
    protoLayout: ReturnType<typeof buildProtoLayout>,
    observeCommitment: boolean
  ): Promise<LexicalLayoutHypothesisRun> {
    const trace = observeCommitment ? new TraceCollector() : null;
    const contentPassMap = await useActiveProtoLayout(protoLayout, () => {
      canonicalReformulationMarkerRelationIndex(tokens, this.lookups);
      quoteStructuralRelationIndex(new TokenCursor(tokens, 0, tokens.length), this.lookups);
      return this.contentPass(tokens, { trace });
    });
    const selected = this.selectLexicalParticleLayoutHypothesis(tokens, protoLayout, contentPassMap, trace !== null);
    for (const event of selected.commitmentTrace?.events ?? []) {
      trace?.record(event);
    }
    return { contentMap: selected.contentMap, layout: selected.layout, protoLayout, contentPassMap, trace };
  }

  private questionOwnedLexicalAdverbialHeads(
    tokens: readonly RuntimeHaruToken[],
    initialProto: ReturnType<typeof buildProtoLayout>,
    initial: LexicalLayoutHypothesisRun
  ): ReadonlySet<number> {
    return useActiveProtoLayout(initialProto, () => {
      const relations = collectBareKaQuestionContentRelations({
        tokens,
        layout: initial.layout,
        contentMap: initial.contentMap,
        lookups: this.lookups
      });
      const heads = new Set<number>();
      for (const affiliation of initialProto.lexicalAdverbialAffiliations.values()) {
        const ownedByQuestion = relations.some(({ quote }) =>
          quote.contentSpan.start <= affiliation.headIdx && affiliation.headIdx < quote.contentSpan.endExclusive &&
          quote.markerSpan.start <= affiliation.particleIdx && affiliation.particleIdx < quote.markerSpan.endExclusive
        );
        if (ownedByQuestion) {
          heads.add(affiliation.headIdx);
        }
      }
      return heads;
    });
  }

  private selectLexicalParticleLayoutHypothesis(
    tokens: readonly RuntimeHaruToken[],
    protoLayout: ReturnType<typeof buildProtoLayout>,
    initialContentMap: ReadonlyMap<number, AssemblyContentSpan>,
    observeCommitment = false
  ): LexicalParticleLayoutHypothesis {
    const slots = lexicalParticleOwnershipHypothesisSlots(initialContentMap, tokens, this.lookups, this.numeric);
    if (slots.length === 0) {
      const contentMap = cloneAssemblyContentMap(initialContentMap);
      const layout = buildClauseLayoutFromProto(protoLayout, tokens, contentMap, this.lookups, {
        requireCachedQuoteRelations: true
      });
      const commitmentTrace = observeCommitment ? new TraceCollector() : null;
      runRegisteredHeadedContentPlanLifecycle({
        tokens,
        contentMap,
        layout,
        lookups: this.lookups,
        numeric: this.numeric,
        trace: commitmentTrace
      });
      return { contentMap, layout, commitmentTrace };
    }
    const initialChoices = lexicalParticleInitialOwnershipChoices(slots);
    if (slots.length > MAX_LEXICAL_PARTICLE_LAYOUT_HYPOTHESIS_SLOTS) {
      return this.buildLexicalParticleLayoutForChoices(tokens, protoLayout, initialContentMap, initialChoices, observeCommitment);
    }

    const initialVariant = this.buildLexicalParticleLayoutForChoices(tokens, protoLayout, initialContentMap, initialChoices, observeCommitment);
    const initialSignature = lexicalParticleLayoutSemanticSignature(initialVariant.contentMap, initialVariant.layout, initialChoices);

    const winnerModes: LexicalParticleOwnershipMode[] = slots.map((slot) => slot.initialMode);
    const singleFlipVariants = new Map<number, LexicalParticleLayoutHypothesis>();
    for (let slotIdx = 0; slotIdx < slots.length; slotIdx += 1) {
      const slot = slots[slotIdx]!;
      const initialChoice = initialChoices[slotIdx]!;
      const initialRealized = lexicalParticleChoiceIsRealized(initialVariant.contentMap, initialVariant.layout, initialChoice);
      for (const mode of slot.modes) {
        if (mode === slot.initialMode) {
          continue;
        }
        const flippedChoices = initialChoices.map((choice, idx) => (idx === slotIdx ? { ...choice, mode } : choice));
        const flippedChoice = flippedChoices[slotIdx]!;
        const flippedVariant = this.buildLexicalParticleLayoutForChoices(tokens, protoLayout, initialContentMap, flippedChoices, observeCommitment);
        if (!lexicalParticleChoiceIsRealized(flippedVariant.contentMap, flippedVariant.layout, flippedChoice)) {
          continue;
        }
        if (initialRealized) {
          const flippedSignature = lexicalParticleLayoutSemanticSignature(flippedVariant.contentMap, flippedVariant.layout, flippedChoices);
          if (flippedSignature === initialSignature) {
            continue;
          }
          const initialRank = lexicalParticleChoiceRank(initialVariant.contentMap, initialChoice, initialContentMap);
          const flippedRank = lexicalParticleChoiceRank(flippedVariant.contentMap, flippedChoice, initialContentMap);
          if (compareLexicalParticleSlotRanks(flippedRank, initialRank) >= 0) {
            continue;
          }
        }
        winnerModes[slotIdx] = mode;
        singleFlipVariants.set(slotIdx, flippedVariant);
      }
    }

    const flippedSlotIndices = winnerModes
      .map((mode, idx) => (mode === slots[idx]!.initialMode ? -1 : idx))
      .filter((idx) => idx >= 0);
    if (flippedSlotIndices.length === 0) {
      return initialVariant;
    }
    const winnerChoices = initialChoices.map((choice, idx) => ({ ...choice, mode: winnerModes[idx]! }));
    const combined = flippedSlotIndices.length === 1
      ? singleFlipVariants.get(flippedSlotIndices[0]!)!
      : this.buildLexicalParticleLayoutForChoices(tokens, protoLayout, initialContentMap, winnerChoices, observeCommitment);
    const failedIndices = winnerChoices
      .map((choice, idx) => (lexicalParticleChoiceIsRealized(combined.contentMap, combined.layout, choice) ? -1 : idx))
      .filter((idx) => idx >= 0);
    if (failedIndices.length === 0) {
      return combined;
    }
    const repairableIndices = failedIndices.filter((idx) => winnerModes[idx] !== slots[idx]!.initialMode);
    if (repairableIndices.length < failedIndices.length || repairableIndices.length === 0) {
      return initialVariant;
    }
    const repairedChoices = winnerChoices.map((choice, idx) =>
      repairableIndices.includes(idx) ? { ...choice, mode: slots[idx]!.initialMode } : choice
    );
    if (repairedChoices.every((choice, idx) => choice.mode === slots[idx]!.initialMode)) {
      return initialVariant;
    }
    const repaired = this.buildLexicalParticleLayoutForChoices(tokens, protoLayout, initialContentMap, repairedChoices, observeCommitment);
    const repairedRealized = repairedChoices.every((choice) =>
      lexicalParticleChoiceIsRealized(repaired.contentMap, repaired.layout, choice)
    );
    return repairedRealized ? repaired : initialVariant;
  }

  private buildLexicalParticleLayoutForChoices(
    tokens: readonly RuntimeHaruToken[],
    protoLayout: ReturnType<typeof buildProtoLayout>,
    initialContentMap: ReadonlyMap<number, AssemblyContentSpan>,
    choices: readonly LexicalParticleOwnershipChoice[],
    observeCommitment = false
  ): LexicalParticleLayoutHypothesis {
    const contentMap = cloneAssemblyContentMap(initialContentMap);
    for (const choice of choices) {
      applyLexicalParticleOwnershipChoice(contentMap, choice);
    }
    const layout = buildClauseLayoutFromProto(protoLayout, tokens, contentMap, this.lookups, {
      consumedLexicalParticleIndices: lexicalParticleConsumedIndicesForChoices(choices),
      requireCachedQuoteRelations: true
    });
    const commitmentTrace = observeCommitment ? new TraceCollector() : null;
    runRegisteredHeadedContentPlanLifecycle({
      tokens,
      contentMap,
      layout,
      lookups: this.lookups,
      numeric: this.numeric,
      trace: commitmentTrace
    });
    return { contentMap, layout, commitmentTrace };
  }

  private async tryBuildCopulaFocusAdjunctSpan(
    cursor: TokenCursor<RuntimeHaruToken>
  ): Promise<AssemblyContentSpan | null> {
    const { tokens, pos: index } = cursor;
    const relation = copulaFocusAdjunctRelationAt(tokens, index, this.lookups);
    if (relation === null) {
      return null;
    }
    const host = await this._processContent(cursor.fork(index, relation.copulaIdx, index), { trace: null });
    const hostPlan = host.renderPlan;
    if (hostPlan === null || host.consumed !== relation.copulaIdx - index) {
      return null;
    }
    const hostToken = tokens[index]!;
    const hostEntry = (await this.dictionary.lookupTokenRelaxed(hostToken)) ?? host.entry ?? null;
    const consumed = relation.copulaIdx - index + 1;
    const span = makeAssemblyContentSpan(
      index,
      consumed,
      "",
      contentResultKoreanPos(host) ?? 명사,
      host.entry ?? null,
      UnitType.CONTENT,
      {
        renderPlan: hostPlan,
        provenance: "nominal_head",
        provenanceReason: `copula_focus_adjunct:${relation.focusSurface}`,
        warnings: host.warnings ?? []
      }
    );
    span.sourceCandidates = host.sourceCandidates;
    span.copulaFocusAdjunct = {
      realization: relation.realization,
      hostEntry,
      hostPos: hostToken.pos
    };
    return span;
  }

  private async tryBuildNominalHostLikenessAdverbialMarkerSpan(
    cursor: TokenCursor<RuntimeHaruToken>,
    layout: ReturnType<typeof activeProtoLayout>
  ): Promise<AssemblyContentSpan | null> {
    const { tokens, pos: index, end: limit } = cursor;
    const token = tokens[index];
    if (
      token === undefined ||
      token.surface !== "みたい" ||
      (token.pos & POS01) !== 形状詞_助動詞語幹
    ) {
      return null;
    }
    const built = await tryBuildNominalFrameMarkerAdapterPlan({
      tokens,
      cursor: cursor.fork(index, limit),
      markerStart: index,
      lookups: this.lookups,
      numeric: this.numeric,
      ...(layout === null ? {} : { layout })
    });
    if (built === null || built.plan.realization.frame.frameKind !== "host_bearing_likeness") {
      return null;
    }
    return makeAssemblyContentSpan(
      index,
      built.consumed,
      "",
      nominalTailChainKoreanPos(built.plan),
      null,
      UnitType.FUNCTIONAL,
      {
        attachLeft: nominalTailChainAttachLeft(built.plan),
        renderPlan: built.plan,
        provenance: "nominal_head"
      }
    );
  }

  private tryBuildQuoteClauseLikenessMarkerSpan(
    cursor: TokenCursor<RuntimeHaruToken>,
    layout: ReturnType<typeof activeProtoLayout>
  ): AssemblyContentSpan | null {
    if (layout === null) {
      return null;
    }
    const { tokens, pos: index } = cursor;
    const mitai = tokens[index];
    if (
      mitai === undefined ||
      mitai.surface !== "みたい" ||
      (mitai.pos & POS01) !== 形状詞_助動詞語幹
    ) {
      return null;
    }
    const innerTailIdx = index - 2;
    const span = layout.enclosingQuoteSpan(innerTailIdx);
    if (span === undefined || span[1] !== index - 1 || innerTailIdx !== span[1] - 1) {
      return null;
    }
    if (!isQuoteUtteranceClauseEndToken(tokens[innerTailIdx])) {
      return null;
    }
    const follower = tokens[index + 1];
    if (follower === undefined || (follower.pos & POS0) !== 助動詞) {
      return null;
    }
    const marker = follower.surface === "に"
      ? "라는 듯이"
      : follower.surface === "な"
        ? "라는 듯한"
        : null;
    if (marker === null) {
      return null;
    }
    return makeAssemblyContentSpan(
      index,
      2,
      marker,
      follower.surface === "に" ? 부사 : 관형사,
      null,
      UnitType.FUNCTIONAL,
      {
        attachLeft: true,
        provenance: "nominal_head"
      }
    );
  }

  private async shouldUseCandidatePathForLexicalizedAdverbialNi(
    tokens: readonly RuntimeHaruToken[],
    index: number
  ): Promise<boolean> {
    const token = tokens[index];
    const particle = tokens[index + 1];
    if (
      token === undefined ||
      particle === undefined ||
      (token.pos & POS0) !== 名詞 ||
      particle.surface !== "に" ||
      (particle.pos & POS0) !== 助詞
    ) {
      return false;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(token);
    return (entry?.senses ?? []).some((sense) =>
      (sense.adverbializations ?? []).some((adverbialization) =>
        adverbialization.particle === "に" &&
        adverbialization.consumeParticle !== false
      )
    );
  }

  private semanticTransfer(units: readonly TranslationUnit[]): void {
    applyKeijoujiDeIruStateSemantics(units, { lookups: this.lookups });
    applyKeijoujiDeAdverbSemantics(units, { lookups: this.lookups });
    applyKeijoujiKanouDeSemantics(units, { lookups: this.lookups });
  }

  protected mergeKatakanaNameChains(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    return this.fallbackMixin().mergeKatakanaNameChains(tokens).map((token) => runtimeTokenFromPreprocess(token));
  }

  private fallbackMixin(): PipelineFallbackMixin {
    return new PipelineFallbackMixin({
      dictionary: {
        formOnlyIndex: this.dictionary.formOnlyEntries,
        lookup: (dictionaryForm, reading, pos) => this.dictionary.lookup(dictionaryForm, reading, pos),
        lookupTokenRelaxed: (token) => this.dictionary.lookupTokenRelaxed(runtimeTokenFromPreprocess(token)),
        findKatakanaTransliteration: (kana, options) => this.dictionary.findKatakanaTransliteration(kana, options),
        findKoreanByReading: (kana, surface) => this.dictionary.findKoreanByReading(kana, surface),
        resolveSubtokenSenses: (entry, subtokens, index) => resolveContext(
          entry,
          subtokens.map((subtoken) => runtimeTokenFromPreprocess(subtoken)),
          index,
          { lookups: this.lookups, numeric: this.numeric }
        )
      },
      numeric: this.numeric,
      numericSplits: this.numericSplits,
      readingFallbackRule: this.readingFallbackRule
    });
  }

  protected expandNumericSplits(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    return this.fallbackMixin().expandNumericSplits(tokens).map((token) => runtimeTokenFromPreprocess(token));
  }

  protected async recoverOovFunctionalSplits(tokens: readonly RuntimeHaruToken[]): Promise<RuntimeHaruToken[]> {
    return (await this.fallbackMixin().recoverOovFunctionalSplits(tokens)).map((token) => runtimeTokenFromPreprocess(token));
  }

  protected preprocessCollocations(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    const result: RuntimeHaruToken[] = [];
    const n = tokens.length;
    const cursor = new TokenCursor(tokens, 0, n);
    const collocations = this.collocations;
    const emitMany = (start: number, consumed: number, emitted: readonly RuntimePreprocessToken[]): void => {
      const candidates = emitted.map((token, position) =>
        runtimeTokenFromPreprocess(
          withSourcePositionFromConsumed(tokens, start, consumed, token, {
            leading: position === 0,
            trailing: position === emitted.length - 1
          })
        )
      );
      if (!collocationEmissionPreservesSourceRuby(tokens, start, consumed, candidates)) {
        result.push(...tokens.slice(start, start + consumed));
        return;
      }
      result.push(...candidates);
    };
    const emitOne = (start: number, consumed: number, emitted: RuntimePreprocessToken): void => {
      emitMany(start, consumed, [emitted]);
    };
    const emitCursorResult = (start: number, emitted: RuntimePreprocessToken): void => {
      emitOne(start, cursor.pos - start, emitted);
    };
    while (cursor.pos < n) {
      const index = cursor.pos;
      const nandes = tryRescueSentenceInitialNandes(cursor);
      if (nandes !== undefined) {
        emitCursorResult(index, nandes);
        continue;
      }

      const toiuWakeda = tryRescueSentenceInitialToiuWakeda(cursor);
      if (toiuWakeda !== undefined) {
        emitCursorResult(index, toiuWakeda);
        continue;
      }

      const toiuWakede = tryRescueSentenceInitialToiuWakede(cursor);
      if (toiuWakede !== undefined) {
        emitCursorResult(index, toiuWakede);
        continue;
      }

      const tokoroDiscourse = tryResolveSentenceInitialTokoroDiscourse(cursor);
      if (tokoroDiscourse !== undefined) {
        emitCursorResult(index, tokoroDiscourse);
        continue;
      }

      const discourseTame = tryResolveDemonstrativeTame(cursor);
      if (discourseTame !== undefined) {
        emitCursorResult(index, discourseTame);
        continue;
      }

      const bareUchi = tryResolveKonosonoUchi(cursor);
      if (bareUchi !== undefined) {
        emitCursorResult(index, bareUchi);
        continue;
      }

      const doushitemo = tryResolveDoushitemo(cursor);
      if (doushitemo !== undefined) {
        emitCursorResult(index, doushitemo);
        continue;
      }

      const donnani = tryResolveDonnaniConcessive(cursor);
      if (donnani !== undefined) {
        emitCursorResult(index, donnani);
        continue;
      }

      const doushita = tryResolveDoushita(cursor);
      if (doushita !== undefined) {
        emitCursorResult(index, doushita);
        continue;
      }

      const doushiyou = tryResolveDoushiyou(cursor);
      if (doushiyou !== undefined) {
        emitCursorResult(index, doushiyou);
        continue;
      }

      const fixedDore = tryFixSentenceFinalDore(cursor);
      if (fixedDore !== undefined) {
        emitCursorResult(index, fixedDore);
        continue;
      }

      const mamaDewa = tryResolveMamaDewa(cursor);
      if (mamaDewa !== undefined) {
        emitCursorResult(index, mamaDewa);
        continue;
      }

      const niOujiResponse = tryResolveNiOujiResponse(cursor);
      if (niOujiResponse !== undefined) {
        emitCursorResult(index, niOujiResponse);
        continue;
      }

      const match = collocations.match(tokens, index);
      if (match !== undefined && !shouldSkipCollocation(tokens, index, match, this.lookups)) {
        const [consumed, emitted] = match;
        const collocationTokens = emitted
          .map((token, position) => withMergedSourcePosition(
            tokens,
            index,
            consumed,
            { ...token, collocDone: true },
            { leading: position === 0, trailing: position === emitted.length - 1 }
          ))
          .map((token) => runtimeTokenFromPreprocess(token));
        if (!collocationEmissionPreservesSourceRuby(tokens, index, consumed, collocationTokens)) {
          result.push(...tokens.slice(index, index + consumed));
        } else {
          result.push(...collocationTokens);
        }
        cursor.advance(consumed);
        continue;
      }

      const numericAgeNishite = tryMergeNumericAgeNishite(cursor);
      if (numericAgeNishite !== undefined) {
        emitCursorResult(index, numericAgeNishite);
        continue;
      }

      const numericShite = tryMergeNumericShite(cursor);
      if (numericShite !== undefined) {
        emitCursorResult(index, numericShite);
        continue;
      }

      const mergedAdverbialShite = tryMergeAdverbialShite(cursor);
      if (mergedAdverbialShite !== undefined) {
        emitMany(index, cursor.pos - index, mergedAdverbialShite);
        continue;
      }

      const fixedRenyouVerbNoun = tryFixRenyouVerbNoun(cursor);
      if (fixedRenyouVerbNoun !== undefined) {
        emitMany(index, cursor.pos - index, fixedRenyouVerbNoun);
        continue;
      }

      const token = tokens[index];
      if (token !== undefined) {
        result.push(token);
      }
      cursor.advance();
    }
    return result;
  }

  protected async expandOovSplits(tokens: readonly RuntimeHaruToken[]): Promise<RuntimeHaruToken[]> {
    return (await this.fallbackMixin().expandOovSplits(tokens)).map((token) => runtimeTokenFromPreprocess(token));
  }

  protected async renderTokenFallback(token: RuntimeHaruToken): Promise<string> {
    const pos0 = token.pos & POS0;
    if (isNonLexicalSymbolToken(token)) {
      return token.surface;
    }
    if (pos0in(pos0, PASSTHROUGH_POS_BITS) && !isSymbolCharacterToken(token)) {
      return token.surface;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(token);
    if (entry !== undefined) {
      return splitFallbackKorean(entry) || token.surface;
    }
    const splitFallback = await this.renderSplitFallback(token);
    if (splitFallback !== undefined) {
      return splitFallback;
    }
    const numeralCompound = tryNumeralCompound(token);
    if (numeralCompound !== undefined) {
      return numeralCompound;
    }
    const readingFallback = await this.getReadingFallback(token);
    if (readingFallback !== undefined) {
      return readingFallback;
    }
    const hanjaFallback = this.getHanjaFallback(token, { allowSuffix: true });
    if (hanjaFallback !== undefined) {
      return applyInitialDueum(hanjaFallback);
    }
    return token.surface;
  }

  private async renderSplitFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    return await this.fallbackMixin().renderSplitFallback(token, honorificClusterLookupsFrom(this.lookups));
  }

  async _renderSplitFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    return await this.renderSplitFallback(token);
  }

  async _synthesizeEntry(token: RuntimeHaruToken, options: { readonly nextToken?: RuntimeHaruToken | null } = {}): Promise<MorphemeEntry> {
    return this.fallbackMixin().synthesizeEntry(token, { nextToken: options.nextToken ?? null });
  }

  async diagnoseRenderPlaceNameFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    return await this.renderPlaceNameFallback(token);
  }

  async diagnoseGetReadingFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    return await this.getReadingFallback(token);
  }

  diagnoseGetHanjaFallback(token: RuntimeHaruToken, options: { readonly allowSuffix?: boolean } = {}): string | undefined {
    return this.getHanjaFallback(token, options);
  }

  private async renderPlaceNameFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    if ((token.pos & POS012) !== 名詞_固有名詞_地名 || token.splitA === undefined) {
      return undefined;
    }
    const bSegments = token.splitB ?? [token];
    const aSlices: RuntimeHaruToken[][] = [];
    let cursor = 0;
    for (const segment of bSegments) {
      const slice: RuntimeHaruToken[] = [];
      let length = 0;
      while (cursor < token.splitA.length && length < segment.surface.length) {
        const item = token.splitA[cursor];
        if (item === undefined) {
          return undefined;
        }
        slice.push(item);
        length += item.surface.length;
        cursor += 1;
      }
      if (length !== segment.surface.length) {
        return undefined;
      }
      aSlices.push(slice);
    }
    if (cursor !== token.splitA.length) {
      return undefined;
    }

    const outputs: string[] = [];
    let anyAdminSplit = false;
    for (const [index, segment] of bSegments.entries()) {
      const aSlice = aSlices[index];
      const last = aSlice?.at(-1);
      const adminKorean = last === undefined ? undefined : PLACE_ADMIN_SUFFIX[`${last.surface}\0${last.reading}`];
      if (adminKorean !== undefined && aSlice !== undefined && aSlice.length >= 2) {
        const placeParts = aSlice.slice(0, -1);
        const synthetic = runtimeTokenFromPreprocess({
          surface: placeParts.map((part) => part.surface).join(""),
          dictionaryForm: placeParts.map((part) => part.surface).join(""),
          reading: placeParts.map((part) => part.reading).join(""),
          dictionaryFormReading: placeParts.map((part) => part.reading).join(""),
          pos: 名詞_固有名詞_地名
        });
        const entry = await this.dictionary.lookupTokenRelaxed(synthetic);
        const placeKorean = entry === undefined ? await this.getReadingFallback(synthetic) : splitFallbackKorean(entry);
        if (placeKorean !== undefined && placeKorean.length > 0) {
          outputs.push(`${placeKorean}${adminKorean}`);
          anyAdminSplit = true;
          continue;
        }
      }
      const segmentFallback = await this.getReadingFallback(segment);
      if (segmentFallback === undefined) {
        return undefined;
      }
      outputs.push(segmentFallback);
    }
    return anyAdminSplit ? outputs.join(" ") : undefined;
  }

  private async getReadingFallback(token: RuntimeHaruToken): Promise<string | undefined> {
    return await this.fallbackMixin().getReadingFallback(token);
  }

  private getHanjaFallback(token: RuntimeHaruToken, options: { readonly allowSuffix?: boolean } = {}): string | undefined {
    return this.fallbackMixin().getHanjaFallback(token, options);
  }

}

function toHaruPos(pos: number): number {
  return pos;
}

interface CopulaHostUnitPlacement {
  readonly anchor: TranslationUnit;
  readonly hostUnits: readonly TranslationUnit[];
  readonly headUnit: TranslationUnit;
  readonly decorationUnits: readonly TranslationUnit[];
  readonly hostSpan: { readonly start: number; readonly endExclusive: number };
  readonly decorationParts: readonly PredicateHeadTailChainHostTextPart[];
}

function overlapsStructuralRelationRender(
  spans: readonly { readonly start: number; readonly endExclusive: number }[],
  range: { readonly start: number; readonly endExclusive: number }
): boolean {
  return spans.some((span) => span.start < range.endExclusive && range.start < span.endExclusive);
}

type NominalLightVerbProjection = NominalLightVerbCarrierProjection;

type AssemblyLoopSignal = "continue" | "next";

interface AssemblyPassContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly units: TranslationUnit[];
  readonly contentMap: ReadonlyMap<number, AssemblyContentSpan>;
  readonly repairedContentMap: Map<number, AssemblyContentSpan>;
  readonly carrierOverrides: Map<number, NominalLightVerbCarrierProjection>;
  readonly layout: ClauseLayout;
  readonly relationRenderSpans: readonly { readonly start: number; readonly endExclusive: number }[];
  readonly options: {
    readonly trace?: TraceCollector | null;
    readonly relationRenderSpans?: readonly { readonly start: number; readonly endExclusive: number }[];
  };
}

interface ContentPassOptions {
  readonly trace?: TraceCollector | null;
  readonly startIndex?: number;
  readonly seedContentMap?: ReadonlyMap<number, AssemblyContentSpan>;
  readonly resolveDeferredCopulaSupportAt?: number;
}

interface ContentPassContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly contentMap: Map<number, AssemblyContentSpan>;
  readonly pendingExtentPostpositions: Map<number, PendingExtentPostposition>;
  readonly numeralContext: NumeralResolutionContext;
  readonly options: ContentPassOptions;
}

interface ContentPassState {
  lastNumeralQuantity: { readonly endExclusive: number; readonly plan: NumericBasePayload } | null;
}

interface ContentPassStep {
  readonly index: number;
  readonly token: RuntimeHaruToken;
  yieldedNumeral: NumericHostYield | undefined;
}

type ContentHeadTailPayloadSourceBuilder = (
  tailCandidateChunk: Extract<TailChunkResult, { readonly ok: true }>
) => ReturnType<typeof buildTailOwnerCandidatePayloadSource>;

interface ContentHeadDispatchOutcome {
  readonly contentHead: ContentHeadDispatchResult | null;
  readonly buildHeadTailCandidatePayloadSource: ContentHeadTailPayloadSourceBuilder;
}

interface ContentHeadTailOwnershipVerdict {
  readonly numericYieldClaimMissed: boolean;
  readonly contestedNominalUseSlot: ContestedBareStemNominalUseSlot | null;
  readonly contestedClaimCoordinate: boolean;
}

interface TrailingCopulaFoldInput {
  readonly index: number;
  readonly previousUnit: TranslationUnit | undefined;
  readonly preceding: string;
  readonly auxProbe2: { readonly auxTokens: AuxTokens; readonly afterAux: number };
  readonly auxTokens: AuxTokens;
}

const MAX_LEXICAL_PARTICLE_LAYOUT_HYPOTHESIS_SLOTS = 8;

function predicatePrenominalPlan(
  translation: { readonly korean: string; readonly koreanPos: number; readonly irregular: IrregularType | null | undefined },
  koreanVerbEndingOverrides: ReadonlyMap<string, string>
): { readonly renderPlan: ConjugatedLemmaPlan } | null {
  const ending = predicatePrenominalEnding(translation, koreanVerbEndingOverrides);
  const cacheValue = PipelineAssemblerMixin.predicatePrenominalText(
    translation.korean,
    {
      koreanPos: translation.koreanPos,
      irregular: translation.irregular ?? null,
      ending
    }
  );
  if (cacheValue === undefined) {
    return null;
  }
  return {
    renderPlan: {
      kind: "conjugatedLemma",
      koreanLemma: translation.korean,
      irregular: translation.irregular ?? null,
      koreanPos: translation.koreanPos,
      auxTokens: [],
      ending
    }
  };
}

function predicatePrenominalEnding(
  translation: { readonly korean: string; readonly koreanPos: number },
  koreanVerbEndingOverrides: ReadonlyMap<string, string>
): string {
  if (translation.koreanPos === 동사) {
    return koreanVerbEndingOverrides.get(translation.korean) ?? "ㄴ/는";
  }
  return "ㄴ/은";
}
