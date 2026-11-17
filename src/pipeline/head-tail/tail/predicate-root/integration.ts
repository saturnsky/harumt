import type { IrregularType } from "../../../../generator/conjugator.js";
import { senseCarriesSelectionFrame, senseFramePayloadHasSourceEvidence, senseRequiresAuxChainEvidence } from "./frame-evidence.js";
import { wakeFrameOwnsHeadAt } from "../../../semantics/wake.js";
import { explanatoryMonReadingAt } from "../../../semantics/explanatory-mon-reading.js";
import {
  isKoroTemporalNiHeadToken,
  isTokoroAboutToHeadToken,
  isTokoroAlmostHeadToken,
  isTokoroConcessiveDeHeadToken,
  isTokoroResultHeadToken,
  isTokoroTemporalDeHeadToken
} from "../families/tokoro-semantics.js";
import { TokenCursor } from "../../../token-cursor.js";
import { adverbializationActivationMatches } from "../../../lexical-particle-boundary-claims.js";


import type { ContestedBareStemNominalUseSlot } from "../../../candidate-runtime.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { morphSurface, rewriteRuntimeTokenSurface } from "../../../../types/token.js";
import type { MorphemeEntry, MorphemeSense } from "../../../../types/dictionary.js";
import { derivationForSense, derivationOrder } from "../../../../dictionary/derivation.js";
import {
  assertUniqueStemCandidateIdentities,
  createStemCandidateProjectionOrdinalAllocator,
  stemCandidateIdentitiesEqual,
  stemCandidateIdentity,
  stemCandidateProvenanceForTranslation,
  stemCandidateProvenanceKey
} from "./stem-candidate-identity.js";
import type { NumeralPlan, RenderPlan } from "../../../../types/render-plan.js";
import type { NumericBasePayload, NumericStemBase } from "../../../../types/numeric-base.js";
import { withNumericStemBaseResolved } from "./numeric-host-base.js";
import { withDerivationalStemBaseResolved } from "./derivational-host-base.js";
import type { PredicateHeadTailChainHostProjection } from "../../lifecycle/head-tail-render-plan.js";
import { quantityApproximationMarker, tryNumeral, type NumeralResolutionContext } from "../../../semantics/numeric.js";
import { readNumeralToken } from "../../../../generator/numerals.js";
import { isSecondaryParticle } from "../../../particles/secondary-particle.js";
import { isCopulaAuxToken, isCopulaSupportChainStartAt } from "../../../semantics/copula-tail-runtime.js";
import { honorificClusterLookupsFrom, honorificClusterSuffixDecision } from "../../../honorific-nominal-cluster.js";
import { joinNounPhraseSurface, type NounPhraseSurfacePart } from "../../../nominal-phrase-surface.js";
import type { Warning } from "../../../../types/warning.js";
import { methodYouGaNaiIdiomShapeAt } from "./matchers/method-you-idiom.js";
import { buildPredicateQuoteCarrierOp, classifySingleAuxTokenOps, parseTail, perceptionCarrierVerbMatch, predicateQuoteCarrierStartsAt, wakeExplanatoryCopulaConjecture, wakeExplanatoryCopulaPolite } from "./parser.js";
import {
  tailRootHasMidChainConnective,
} from "./mid-chain-connective-license.js";
import {
  probeProductionDispatch,
  type ProductionMatchContext,
  type ProductionNonAdmissionPolicy,
} from "./production-registry.js";
import { lineMemo } from "../../line-memo.js";
import { adnominalCopulaTailFollows, elidedDewaNegativeBodyHostAdmitsAt, matchCopula, terminalNodaCarrierFollowsAdnominalCopula, type ElidedDewaNegativeBodyClosure, type ElidedDewaNegativeBodyClosureKind } from "./matchers/copula.js";
import { matchNegationEnding } from "./matchers/negation-ending.js";
import { copulaConcessiveImperativeEvidenceAt } from "./classifiers/copula-concessive.js";
import type { AdverbialModifierMarker, StemInput } from "./parse-input.js";
import { DEARE_CONCESSIVE_CONNECTIVE_SURFACE, focusedNegationShapeAt, isAdnominalCopulaToken, isLikenessModalAdnominalTailEnd, isProjectingModalAdnominalTailEnd, isAppearanceModalAdnominalTailEnd, isAffirmativeCopulaSupportVerbToken, isIntrinsicHonorificCopulaSupportVerbToken, isMizenVoiceHonorificCopulaSupportVerbToken, copulaHonorificVoiceClusterLength, fusedCopulaSupportConnectiveKindOf, volitionalConcessiveMarkerTokenCountAt, fusedCopulaSupportHostSlotAt, DEAROU_CONCESSIVE_CONNECTIVE_SURFACE, isBareMoConcessivePreviousToken, isEquivalenceCarrierAdnominalToken, isEquivalenceCarrierPredicativeNoun, isGozaruPoliteSupportToken, isNaiOrNuToken, isSayVerbToken, isAdverbialMannerNounHead, isTeSurfaceConnectiveToken, volitionalAttemptMarkerAt, collapsedAspectAuxKind, terminalAssertiveCopulaSpanEndingBefore, SYNTHETIC_DEICTIC_STEM_REASON_PREFIX } from "./classifiers/tokens.js";
import type { FusedCopulaSupportHostSlot } from "./classifiers/tokens.js";
import { isBekiRentaiNominalizedFrameEnd, plainNominalizerFrameEndVerdictAt } from "./matchers/nominalizer.js";
import { matchNiChigaiNaiProjectionCarrierAt, matchNiKimatteIruProjectionCarrierAt } from "./matchers/projection-carrier.js";
import { isPredicateScopeCarrierSuffixStart, matchFocusConnectiveAt } from "./matchers/focus-connective.js";
import { isLikenessCarrierStemToken, likenessEvaluativeConditionHasConsequentAt, likenessEvaluativeConditionMarkerStartEndingAt, matchScopeBridge, matchScopeBridgeBeforeBasicCopula, quoteMarkerClosesUtteranceAfter } from "./matchers/scope-bridge.js";
import {
  matchCompositeConnectiveAt,
  matchQuotedConcessiveConnectiveAt,
  matchReformulationConnectiveAt,
  matchRetrospectiveQuoteConnectiveAt,
  matchQuestionReformulationConnectiveAt,
  type CompositeConnectiveMatch
} from "./matchers/connective.js";
import { matchBoundNominalReasonConnectiveAt } from "./matchers/bound-nominal-connective.js";
import { matchTameConnectiveAt } from "./matchers/tame-connective.js";
import { matchTokoroResultConnectiveAt } from "./matchers/tokoro-result-connective.js";
import {
  isObligationSpanContaining,
  isObligationSpanStartingAtToken,
  obligationSpanEndExclusiveAt,
  type ElidedColloquialObligationContext
} from "./matchers/obligation.js";
import {
  matchLicensesNpModifyingContinuation,
  isLikenessCarrierHeadToken,
  matchPredicateProjectionConnectiveAt,
  matchQuotativeMannerSimileConnectiveAt,
  fusedNoYouNiKeijoujiAttributiveAt,
  keijoujiAttributiveMarkerAt,
  matchGotokuMannerSimileConnectiveAt,
  matchKaNoYouNiMannerSimileConnectiveAt,
  matchYouNiPredicateProjectionConnectiveAt,
  matchZeroNiPurposeProjectionConnectiveAt,
  type YouNiPredicateProjectionConnectiveMatch
} from "./matchers/predicate-projection-connective.js";
import { isKamoShirenaiModalStartAtToken, type BareKamoAdmissionContext } from "./matchers/kamo-modal.js";
import {
  expandFusedDashiCopulaListingParseSlice,
  rangeIndices
} from "./integration/parse-slice.js";
import {
  ellipticTailHasOvertLexicalStem,
  isNonExplicitEllipticTailSequenceStart,
  isZeroHeadPropositionTailSequenceStart,
  isZeroHeadUtteranceInitialStart,
  zeroHeadPropositionTailIslandEndExclusive
} from "./integration/zero-head.js";
import { parseOutgoingBoundaryHint, refineRequestTerminalOutgoingBoundary } from "./integration/boundary-hint.js";
import {
  canParseZeroTailPredicateHead,
  quotedBareKeijoujiHostScanEnd,
  zeroTailPredicateHeadContestedSlot,
  copulaStartsPredicateAt,
  detectSahenPredicateStart,
  hasPredicateProjectionClauseContinuation,
  hasSupportedClauseContinuation,
  isBareKeijoujiZeroTailPredicateStart,
  isKeijoujiCopulaPredicateStart,
  adverbHostCopulaDeMarkerAt,
  isNominalCopulaHostPos,
  isNounCopulaPredicateStart,
  isRentaishiPronominalNoPredicateStart,
  isDemonstrativePropositionWakeHostStart,
  demonstrativePropositionHostAt,
  isSupportedClauseStart,
  isSupportedConditionalContinuation,
  isNominalEvidentialRashiiPredicateStart,
  nounCompoundSuffixRunEnd,
  terminalOnlyPredicateEndpointClosesBefore
} from "./integration/readiness.js";
import { attributiveHeadAnchorAt, skipHostEnclosingQuoteClose } from "./nominal-host-phrase.js";
import { tailRootHasRenyouChuushiTerminal, tailRootHasAdverbialModifierTerminal } from "./fragment-recovery.js";
import {
  isTosuruResultativeMakeForm,
  tosuruResultativeMakeYieldsToAttributiveQuoteHead
} from "./tosuru-construction-mode.js";
import {
  partialTailSuffixUnresolvedWarning,
  tailBoundaryAttachmentWeakPartial,
  tailFunctionalSuffixHandoffPartial,
  tailUnresolvedFunctionalResidualPartial
} from "./suffix-handoff.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  utteranceClosureTokenIdx,
  type UtteranceClosureEvidence,
  type UtteranceClosureKind,
  type UtteranceClosureRunEvidence,
  type UtteranceClosureRunKind
} from "../../../clause-layout/utterance-closure.js";
import { activeProtoLayout, buildProtoLayout, conjecturalCopulaAttributiveEndpointClaimed, detectClauseBoundaryEvents, type WhitespaceAttributiveReadingInput, adjectiveAdverbialModifiedPredicate, adjectiveAdverbialModifierLookupOptions, findAdverbialModifierPredicate, isClauseEvidenceTransparentPunctuation, isClausePunctuationToken, isConditionalCopulaClauseBoundaryToken, isFinitePredicateBoundaryLeft, leadingQuoteAttributiveNominalHeadAnchorAfterToken, nextClauseNonPunctuationIndex, previousClauseNonPunctuationIndex, hasSeparatedFinitePredicateBoundary, sourceContextMayBePredicateAt, skipClausePunctuationForward, utteranceClosedForAttributiveProjection, isAttributiveHeadNounishToken, explicitAdnominalNoAttributiveEvidence, type BareKeijoujiAttributiveEvidence, type ClauseLayout, type ClauseToken, type ExplicitAdnominalNoAttributiveEvidence } from "../../../clause-layout/index.js";
import {
  renyouChuushiClosureGovernedAfter,
  renyouChuushiClosureLeftAt,
  isAuxChainRenyouChuushiBoundaryEnd,
  isCopulaNegativeRenyouBoundaryEnd,
  isImmediatePredicateTailContinuationAfterRenyou,
  renyouHeadBunsetsuContinuesInto,
  type ChuushiClosureEvidence
} from "../../../clause-layout/chuushi-closure.js";
import { isWhitespaceAttributiveReadingLicense, type RenyouJunctureEvidence } from "../../../clause-layout/juncture-verdict.js";
import {
  DETACHED_SEPARATIONS,
  SEPARATION_OPENS_BOUNDARY,
  nextNonSpaceIndex,
  previousNonSpaceIndex,
  separatedAs
} from "../../../clause-layout/trivia.js";
import { bareAdverbialKeijoujiHostAt, isAdverbialKeijoujiMarkerHostPos } from "../../../clause-layout/adverbial-host.js";
import { closesUtteranceForSpeakerDirection } from "../../../clause-layout/speech-act.js";
import { zeroNominalizedParallelMoMarkerIndices } from "../../../clause-layout/predicate-parallel.js";
import { terminalPunctuationRunQuestionTokenIndex } from "../../../clause-layout/punctuation.js";
import {
  activeProtoClosesClauseAtDetachedTerminalNodaAfter,
  activeProtoClosesUtteranceBefore,
  activeProtoClosesUtteranceBeforeGivenFormalNounHead,
  activeProtoClosedPropositionBeforeMarkerAt,
  activeProtoUtteranceClosureRunAt,
  activeProtoScopedScanEnd,
  closesClauseAtDetachedTerminalNodaAfter
} from "../../../clause-layout/proto-state.js";
import {
  isBaSufficiencyConditionalAt,
  isPastGoodEvaluationPredicateAt,
  matchPermissionPredicateAt
} from "../../../semantics/permission-idiom.js";
import { detectSfp, terminalSfpRunConsumedThrough } from "../../../semantics/grammar-runtime.js";
import {
  quoteHostHandoffKindAt,
  quoteHostHandoffKindForHost,
  quoteClauseBoundaryFromRelation,
  quoteConsumedMarkerSpanFromRelation,
  quoteHostAllowsBareNominalContent,
  cachedQuoteBindingForContentRoot,
  quoteStructuralRelationContainingContentToken,
  quoteStructuralRelationAt,
  quoteStructuralRelationIndex,
  quoteStructuralRelationStartingAt
} from "../../../structural-relation/quote.js";
import {
  quoteHostMatchAfterMarker,
  quoteHostMatchBlockedByNegativeCondition
} from "../../../quote/host-taxonomy.js";
import { hasYouZeroDirectiveMatrixPredicateAhead, hasYouZeroPressureTail, isNegativePurposeFragmentHostEnd, isYouNiQuoteDirectivePredicateStart } from "../../../semantics/you-zero-directive.js";
import { youNiQuoteDirectiveProjectionSpanAt } from "./matchers/predicate-projection-connective.js";
import { quoteFocusLimitNegationTailStartingAt, quoteFocusMarkerStartingAt } from "../segments/quote-focus.js";
import { nominalFrameTailSurfaceSpecs } from "../segments/nominal-frame.js";
import type { TailChainPartialArtifact } from "../chain.js";
import {
  relationConnectiveSpansAt,
  relationDiscontinuousClosureSpanAfter,
  tokenMatchesConnectiveKind
} from "../connective-span-scanner.js";
import { matchEpistemicHedgeCarrierShapeAtHead } from "./matchers/epistemic-hedge.js";
import { classifyDatteMarkerAt, toiuAttributiveBoundarySplitAt, toiuAttributiveContinuationHeadIndex, toiuAttributiveHeadIndex, toiuAttributiveTailEnd } from "../../../semantics/marker-roles.js";
import { participatesInStructuralKaParallel } from "../../../structural-relation/ka-parallel-ownership.js";
import {
  matchHokaAdditiveConnectiveStart,
  matchMonoNoConcessiveConnectiveStart,
  matchNoNiConcessiveConnectiveStart
} from "../../boundary/connective-start.js";
import { isAnimateReferentToken, isPersonToken, isSettingAdjunctAttributiveHead } from "../../candidate/semantic-classifiers.js";
import { MONO_FORMAL_NOUN_FORMS, PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS, WH_INDEFINITE_DEMO_HOSTS } from "../../data/semantic-helper-sets.js";
import { isNounToSareruContext } from "../../../predicate-helpers.js";
import { KAMO_SHIRENAI_LEMMAS, isTameHead, lookupSetMatches
} from "../../../lookup-tables.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import { commitTail, ownClauseTailIR, type ClauseBoundary, type ClauseTailIR, type CommitContext } from "./commit.js";
import { copulaContinuativeExplanatoryClosureApplies, copulaContinuativeObliqueRecoveryApplies, renderTail } from "./render.js";
import { appearanceModalPlaceAspectHeadIsNounPhraseHead, boundaryReadinessBlocker, classifyBoundaryReadinessRelation } from "./boundary-semantics.js";
import type { BoundaryReadinessRelation } from "./boundary-semantics.js";
import {
  classifyTeTailContinuation,
  isTeConnectiveToken,
  matchTeTailContinuationAt,
  teDeContinuationRelationAt,
  isTeTailImperativeFormClosureAt
} from "../postverb-tail-classifier.js";
import { appearancePerceptionProjectionForToken, appearancePerceptionReadingForToken, type AppearancePerceptionProjection } from "./appearance-perception-carrier-table.js";
import { declaredProjectionCarrierTokenBranchEndingAt } from "./projection-carrier-form-table.js";
import {
  classifyAttributiveHeadKind,
  isExternalRelationNominalModifierHead,
  isLikenessPlaceAspectAttributiveHead,
  isLikenessTransparentFormalNounHead,
  isQuotedTopicFormalNounHead
} from "./structural-attributive-head-table.js";
import { bareQuoteCarrierBindsUtteranceContentHead, bareQuoteCarrierVolitionalContentFlavor, quoteAttributiveHeadFrameForBoundary } from "./quote-attributive-head-frame.js";
import { isDerivedNominalPhraseHead, predicateSuffixKindForDictionaryForm, resolveDerivationalSuffixProfile } from "./derivational-suffix-table.js";
import { DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX, lowerDerivationalSuffixRoot, rootHasReanchoringDerivationalSuffix } from "./derivational-suffix-lowering.js";
import {
  connectiveSurfaceAllowsPartialPrefix,
  connectiveSurfaceRequiresFinalPosition,
  connectiveSurfaceRequiresAttachmentEvidence,
  lookupConnectiveBySurface,
  type AttributiveBoundaryPayload,
  type AttributiveBoundaryHeadKind,
  type AuxLayerNode,
  type AuxOpNode,
  type CandidateCapability,
  type CandidateHeadProfile,
  type ConnectiveOp,
  type ConnectiveKind,
  type CopulaOp,
  type HeadTailEvidenceDecision,
  type HeadRealization,
  type HeadHypothesisCandidate,
  type HeadHypothesisCarrier,
  type HeadSourceCapabilityVector,
  type OpSource,
  type PostverbAuxiliaryPayload,
  type ParsedTailRoot,
  type QuoteAttributiveFlavor,
  type QuoteBoundaryPayload,
  type SfpNode,
  type StemCandidate,
  type StemCandidateRealization,
  type StemNode,
  type TailNode,
  type TailRoot,
  type TailRootBase,
  type TeFormConnectiveRole,
  type VerbConjType,
  retrospectiveQuotativeFlavorForStemMood
} from "./grammar.js";
import {
  hasHardTerminalPunctuationClass,
  hasRealContentAfterIndex,
  isBoundaryPunctuationToken,
  isHardTerminalPunctuationToken,
  isNonTerminalClauseBreakPunctuationToken,
  isOpeningPunctuationToken,
  isTrailingPunctuationToken
} from "../../boundary/punctuation.js";
import { isKaFamilyQuestionSfpEffect, nounStemInterjectionForCandidate, sourcePredicateShapeForCapabilities, type SourcePredicateShape } from "./grammar.js";
import { convertPunctuation } from "../../../rendering/punctuation.js";
import { loadSuppletiveNegDict, roleCatNyaCount } from "../../../../generator/aux-map.js";
import { conjugate, irregularType } from "../../../../generator/conjugator.js";
import type { MorphemeDictionary } from "../../../../dictionary/morpheme.js";
import type { ContextGrammar, FrameSourceCondition, FrameSourceConditionMatch } from "../../../context.js";
import { evaluateFrameSourceCondition, normalizeFrameSourceCondition, resolveContext } from "../../../context.js";
import type { TranslationCandidate } from "../../../../types/pipeline.js";
import { firstTranslationCandidate, iterTranslationCandidates } from "../../../candidate-runtime.js";
import type { PredicateProjectionHost, PredicateProjectionKind } from "../../grammar.js";
import {
  defineHeadedParserEngine,
  headProfileDispatchSelection,
  type HeadProfile,
  type HeadProfileDescriptor
} from "../../head/profile.js";
import { hydrateAspectSemanticOps, tailRootIntrinsicAspectReadinessBlocker } from "./aspect-semantics.js";
import { hydrateBenefactivePayloads } from "./benefactive-hydration.js";
import { projectionOpContinuationCapabilityIds } from "../../head/capability.js";
import { aspectResultHostCategory, auxLayerConsumedSourceSequence, auxOpsInTailNode, chainFinalOpHostCategory, firstAuxLayer, stemSupportsProjectionCategory, tailRootClosesWithAttributiveTerminal, tailRootClosesWithOvertNominalizerTerminal, tailRootVoiceOps } from "./inspect.js";
import { clauseStartEvidenceRelationAfter, clauseStartEvidenceSatisfiesRequirement, connectiveAdmitsEllipticFollowerClause, hasEllipticFollowerClauseEvidence, hasRenyouChuushiClauseContinuationAfter, isRefusedUtteranceHeadToken } from "../../boundary/clause-start.js";
import { copulaFocusContinuationRelationAt } from "../../boundary/window.js";
import type { ClauseStartEvidenceKind } from "../../boundary/relation.js";
import { activeProtoUtteranceRange } from "../../../clause-layout/proto-state.js";
import { adjectivalConcessiveTomoRelationAt, caseParticleMarkerRelationForToken, conditionalTailConnectiveRelationForToken, conditionalToConnectiveRelationAt, copulaDeMarkerRelationForToken, copulaHonorificSupportRelationAt, copulaNiMarkerRelationForToken, dewaScopeBridgeRelationAt, externalNominalizerContinuationRelationAt, kaMarkerRelationAt, nominalLinkMarkerRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, quotativeDerivedIdiomClaimAt, topicFocusMarkerRelationAt } from "../../boundary/marker.js";
import {
  cachedCanonicalReformulationMarkerRelationIndex,
  canonicalReformulationMarkerRelationIndex,
  closedPropositionTokaKaRelationAt,
  isRhetoricalMonoKaHeadAt,
  closedPropositionTokaListingEvidenceAt,
  kaOwnershipKindAt,
  speakerAcknowledgmentKaClosureIndexAt,
  terminalQuestionKaRelationAt
} from "../../boundary/ka-ownership.js";
import type { KaOwnershipKind } from "../../boundary/ka-ownership.js";
import {
  datteQuoteMarkerRelationAt,
  quoteMarkerContinuationRelationAt,
  quoteMarkerRelationAt,
  tokaQuoteMarkerRelationAt,
  tokaTteCompositeQuoteCandidateAt
} from "../../boundary/quote-marker.js";
import { matchNodaNoKaNegativeConfirmTerminalTail } from "../../../semantics/terminal-negative-confirm.js";
import { canonicalTerminalSfpSurface } from "../../../semantics/sfp-surface.js";
import { isAdjNai, isVerbLemma } from "../../../matchers.js";
import { TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM } from "../te-tail-continuation-table.js";
import { boundaryRelationsForToken } from "../../boundary/scanner.js";
import type { MarkerBoundaryRelation } from "../../boundary/relation.js";
import { isExternalNominalizerConnectiveKind } from "../../boundary/relation.js";
import {
  clauseContainsInterrogativeBeforeKa,
  clauseContainsLexicalizedInterrogativeBefore,
  clauseContainsPredicateChoiceKaBefore,
  looksEmbeddedQuestionKaAdjectivalNounBoundary,
  looksEmbeddedQuestionKaBoundary,
  looksEmbeddedQuestionKaExternalSuffixBoundary,
  looksEmbeddedQuestionKaNominalizedBoundary,
  looksPredicateChoiceKaClauseBoundary,
  looksQuestionContentNominalizedAfterKa,
  looksQuoteQuestionTakingAfter,
  looksQuestionTakingAfter,
  tokenIsInterrogativeLexeme
} from "../../../quote/embedded-question.js";
import {
  looksAttributiveQuoteSiblingQuestionContentAfterViaLayout,
  looksQuestionTakingAfterViaLayout,
} from "../../../quote/question-taking-enumeration.js";
import {
  looksLikePurposeEvaluationNoNi,
  looksPronominalNoDe,
  noNiBindingParticleBlocksAdversative
} from "../../boundary/pronominal-no.js";
import { shortNegationPolicyForTranslation } from "./short-negation-policy.js";
import { matchQuotedJudgmentPassiveTail } from "../../../semantics/modality-specs.js";
import {
  buildVirtualCompoundToken,
  findCompoundVerbCandidatesAt,
  isStreamVvCompoundPairAt,
  lookupNominalRenyouVerbHead,
  lookupVirtualCompoundEntry,
  streamVvCompoundPairLacksRegisteredOwnerAt
} from "../../../compounds/compound-verbs.js";
import {
  isPostverbAuxiliaryActivationAccepted,
  isPostverbAuxiliaryToken,
  isTeAuxActivationAccepted,
  postverbAuxiliaryDeclaresHostAttachForm,
  postverbAuxiliaryPayloadsForForm
} from "./postverb-auxiliary-parser.js";
import {
  candidateRealizationFromDecisionChoices,
  resolveTailEvidenceDecision
} from "./tail-evidence-decision.js";

import { is五段, is上一段, is下一段, INFLECTABLE_BITS, NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS2, POS4, POS4_OF_NAME, POS5, POS5A, POS5A_NAME, POS5A_SHIFT, カ行変格, サ行変格, 意志推量形_, isAssertiveCopulaFamilyPos, 仮定形_, 格助詞, 係助詞, 形状詞, 形状詞可能, 形容詞0, 形容詞的, 五段_ラ行, 語幹_, 終止形_, 終助詞, 助詞, 助詞_接続助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_ジャ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 助動詞語幹, 下一段_サ行, 接続助詞, 接頭辞, 接尾辞, 代名詞, 動詞, 動詞_非自立可能, 非自立可能, 副詞, 副助詞, 補助記号, 記号, 未然形_, 未然形_一般, 名詞, 命令形_, 連体形_, 連体詞, 普通名詞, 連用形_, 連用形_一般, 대명사, 동사, 명사, 부사, 수사, 형용사, inflectionClassName, isAdverbCapable, isAdverbCapableNominal, isBareNaAdjSet, isAuxiliaryStemToken, isDesireAuxiliaryPos, isIAdjectivePredicateToken, isLexicalAdverb, isNaAdjCapable, isNonIndependentVerbToken, isNaAdjCapableNoun, isSubstantiveNounToken, isTerminalParticleToken, isNominalizerParticleToken, isKoreanNounAble, koreanNounLemma, isNominalLike, isCounterCapableToken, isNumeralToken, isPastAuxiliaryPos, isPoliteAuxiliaryPos, isMizenInflection, isPoliteCopulaPos, isSahenCapableNominal, isVerbPredicateToken, isRareruAuxiliaryToken, isRenyouInflectedToken, isVoiceOrCausativeAuxiliaryToken, PREDICATE_BITS, isTerminalOrAttributiveInflection, isAttributiveOrHomophonousTerminalInflection, INFLECTABLE_AUX_BITS, stemFormName, 助詞_終助詞, 助詞_副助詞, 助詞_係助詞, 助詞_格助詞, 助詞_準体助詞, 接尾辞_動詞的, isNaAdjectiveDerivationalSuffix, 名詞_普通名詞, 接続詞, isAuxiliaryToken, isImperativeInflection, isIndependentWordToken, isTerminalInflection, isVolitionalInflection, isRenyouInflection, isPrefixAffixToken, isLexicalPureNaAdjStem, isAttributiveInflection } from "../../../../types/pos.js";
import { demoDiscourseUtteranceInitialMatchLengthAt } from "../../../demo-discourse.js";
import { rentaishiPronominalNoHeadSpanAt } from "../../boundary/pronominal-no.js";
import { pronominalNoHeadStemSurface, type PronominalNoHeadStemBase } from "../../../nominal-phrase-surface.js";
import { nodaAttributive } from "../../../semantics/grammar-runtime.js";
import { createConnectiveOp, createCopulaOp, markConditionalQuoteMarkerContinuationOp } from "./op-builders.js";
import { IU_LEXEME_FORMS } from "../../data/quoted-reporting-sets.js";
export interface DictLookup {
  lookupTokenRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined>;
  lookup?(dictionaryForm: string, reading: string, pos: number | string | readonly string[]): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined>;
}

export type PredicateTailSyntheticEntryResolver = (
  token: RuntimeHaruToken,
  options?: { readonly nextToken?: RuntimeHaruToken | null }
) => MorphemeEntry | Promise<MorphemeEntry>;

export interface IntegrationInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly dictionary: DictLookup;
  readonly formal: boolean;
  readonly synthesizeEntry?: PredicateTailSyntheticEntryResolver;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly numericHostReservation?: NumericHostReservation;
}

export interface NumericHostReservation {
  readonly tokenIdx: number;
  readonly consumed: number;
  readonly plan: NumericBasePayload;
  readonly claimRequired: boolean;
}

export type IntegrationResult =
  | {
    readonly ok: true;
    readonly text: string;
    readonly polite: boolean;
    readonly warnings: readonly Warning[];
  }
  | { readonly ok: false; readonly reason: string };

export type TailChunkResult =
  | {
    readonly ok: true;
    readonly consumed: number;
    readonly root: TailRoot;
    readonly predicateTokenIdx: number;
    readonly outgoingBoundary: ClauseBoundary;
    readonly partial?: TailChainPartialArtifact;
    readonly candidateObservation?: TailChunkCandidateObservation;
    readonly contestedNominalUseSlot?: ContestedBareStemNominalUseSlot;
  }
  | {
    readonly ok: false;
    readonly reason: string;
    readonly observation?: TailChunkCandidateObservation;
    readonly intake?: TailChunkIntakeVerdict;
  };

export type TailChunkIntakeVerdict = "out_of_domain";

type ParsedTailChunk = Extract<TailChunkResult, { readonly ok: true }>;
type NonTerminalClauseBoundary = Exclude<ClauseBoundary, { readonly kind: "terminal" }>;

export interface TailChunkCandidateOptions {
  readonly maxEndExclusive?: number;
}

interface TailChunkCandidateCollection {
  readonly candidates: readonly ParsedTailChunk[];
  readonly lastReason: string;
  readonly observation?: TailChunkCandidateObservation;
  readonly intake?: TailChunkIntakeVerdict;
}

type SourceTailBoundaryStation =
  | {
    readonly id: "general_candidate";
    readonly start: number;
    readonly end: number;
    readonly scanEnd: number;
    readonly boundary: ClauseBoundary;
    readonly unresolvedFunctionalResidual: boolean;
    readonly weakAttachmentBoundary: ReturnType<typeof weakAttachmentSourceBearingBoundaryAtScanEnd>;
  }
  | {
    readonly id: "quote_prefix";
    readonly start: number;
    readonly end: number;
    readonly scanEnd: number;
    readonly boundary: ClauseBoundary;
  }
  | {
    readonly id: "assembler_resumable_prefix";
    readonly start: number;
    readonly end: number;
    readonly scanEnd: number;
    readonly boundary: ClauseBoundary;
    readonly auditReason: string;
    readonly terminalProjection?: "attributive";
    readonly attributivePayload?: AttributiveBoundaryPayload;
    readonly allowConditionalCompactQuoteManner: boolean;
  };

type TailBoundaryStation = SourceTailBoundaryStation |
  {
    readonly id: "external_nominalizer";
    readonly start: number;
    readonly scanEnd: number;
    readonly frame: HostBearingExternalNominalizerPredicateFrame;
    readonly likenessHost: boolean;
    readonly outgoingBoundary: ClauseBoundary;
    readonly attributivePredicateEnd: number | null;
  } |
  {
    readonly id: "elliptic_quote";
    readonly plan: EllipticPropositionQuoteTailPlan;
  } |
  {
    readonly id: "elliptic_modal";
    readonly start: number;
    readonly tailEndExclusive: number;
  };

type TailBoundaryStationMaterialization =
  | { readonly kind: "candidate"; readonly chunk: ParsedTailChunk }
  | {
    readonly kind: "rejection";
    readonly stage: "parse_failure" | "semantic_filter";
    readonly reason: string;
    readonly headHypothesis?: HeadHypothesisCarrier;
  }
  | {
    readonly kind: "non_admission";
    readonly familyId: string;
    readonly policy: Exclude<ProductionNonAdmissionPolicy, "preserve">;
  }
  | {
    readonly kind: "non_admission";
    readonly familyId: string;
    readonly policy: "preserve";
    readonly chunk: ParsedTailChunk & { readonly partial: TailChainPartialArtifact };
  }
  | { readonly kind: "decline" }
  | { readonly kind: "exclusive_failure"; readonly reason: string };

type TailBoundaryStationAdmission =
  | { readonly kind: "admitted" }
  | { readonly kind: "preserve"; readonly familyId: string }
  | Extract<TailBoundaryStationMaterialization, { readonly kind: "rejection" }>
  | Extract<
    TailBoundaryStationMaterialization,
    { readonly kind: "non_admission"; readonly policy: Exclude<ProductionNonAdmissionPolicy, "preserve"> }
  >;

export type TailHeadProfileChunkResult =
  | (ParsedTailChunk & {
    readonly profile: HeadProfileDescriptor;
    readonly requiredContinuationCapabilityIds: readonly string[];
  })
  | Extract<TailChunkResult, { readonly ok: false }>;

export interface TailChunkCandidateAttemptObservation {
  readonly end: number;
  readonly status:
  | "candidate"
  | "parse_failure"
  | "render_failure"
  | "semantic_filter"
  | "no_boundary"
  | "partial_candidate";
  readonly boundaryKind?: string;
  readonly boundaryConnective?: string | null;
  readonly reason?: string;
  readonly consumed?: number;
  readonly headHypothesis?: HeadHypothesisCarrier;
}

export interface TailChunkCandidateObservation {
  readonly start: number;
  readonly requestedMaxEndExclusive: number;
  readonly scanEnd: number;
  readonly candidateCount: number;
  readonly lastReason: string;
  readonly attempts: readonly TailChunkCandidateAttemptObservation[];
  readonly interpretations?: readonly TailInterpretationCandidateObservation[];
}

export interface TailInterpretationCandidateObservation {
  readonly ownerKey: string;
  readonly source: "predicate_root_parser" | "postverb_competition" | "partial_candidate";
  readonly evidenceKind: string;
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly specificity: number;
  readonly spanCompleteness: "complete" | "partial";
  readonly structuralEvidence: "postverb_auxiliary" | "tail_root_parse" | "partial_prefix";
  readonly ownerPrecedence: number;
  readonly declarationOrder: number;
  readonly eligible: boolean;
  readonly arbitrationRule: string;
  readonly arbitrationReason: string;
  readonly selected: boolean;
  readonly rejectionReason?: string;
  readonly headEvidenceDecision?: HeadTailEvidenceDecision;
}

export type TailNominalHostLikenessContinuationResult =
  | {
    readonly ok: true;
    readonly ops: readonly AuxOpNode[];
    readonly predicateHost?: TailPredicateProjectionHost;
    readonly nominalizedAttributive?: true;
    readonly outgoingBoundary: ClauseBoundary;
    readonly predicateTokenIdx: number;
    readonly source: {
      readonly start: number;
      readonly end: number;
      readonly tokens: readonly RuntimeHaruToken[];
    };
    readonly warnings: readonly Warning[];
  }
  | { readonly ok: false; readonly reason: string };

interface TailHeadProfileContext {
  readonly tailChunk: TailChunkResult;
}

type PredicateTailHeadProfile = HeadProfile<TailHeadProfileContext, ParsedTailChunk>;

const PREDICATE_TAIL_HEAD_PROFILES: readonly PredicateTailHeadProfile[] = [
  {
    id: "predicate_copula_tail",
    owner: "predicate_tail",
    traceKind: "tail_chain",
    continuationCapabilities: [
      {
        id: "predicate_tail_terminal",
        kind: "terminal",
        surfaces: ["V/A/N tail terminal"],
        description: ""
      },
      {
        id: "predicate_tail_negation",
        kind: "negation",
        surfaces: ["Vない", "Aくない", "Nではない"],
        description: ""
      },
      {
        id: "predicate_tail_past",
        kind: "past",
        surfaces: ["Vた", "Aかった", "Nだった"],
        description: ""
      },
      {
        id: "predicate_tail_polite",
        kind: "polite",
        surfaces: ["Vます", "Aです", "Nです"],
        description: ""
      },
      {
        id: "predicate_tail_scope_bridge",
        kind: "scope_bridge",
        surfaces: ["Pではない", "Pじゃない", "Pわけではない", "Pのではない"],
        description: ""
      },
      {
        id: "predicate_tail_connective",
        kind: "connective",
        surfaces: ["Pけど", "Pので", "Pなら"],
        description: ""
      },
      {
        id: "predicate_tail_quote",
        kind: "quote",
        surfaces: ["Pだと", "Pだって", "Pだという", "Pかと"],
        description: ""
      },
      {
        id: "predicate_tail_nominal_frame_host",
        kind: "nominal_frame",
        surfaces: ["Pのについて", "Pことについて"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: predicateTailRequiredCapabilityIds,
    tryBuild: (context) => context.tailChunk.ok ? context.tailChunk : null
  }
] as const;

const PREDICATE_TAIL_HEAD_ENGINE = defineHeadedParserEngine({
  id: "predicate_tail_head_chunk",
  profiles: PREDICATE_TAIL_HEAD_PROFILES
});

export function describePredicateTailHeadProfiles(): readonly HeadProfileDescriptor[] {
  return PREDICATE_TAIL_HEAD_ENGINE.describe();
}

function predicateTailRequiredCapabilityIds(tailChunk: ParsedTailChunk): readonly string[] {
  const ids = new Set<string>();
  for (const id of predicateTailBoundaryCapabilityIds(tailChunk.outgoingBoundary)) {
    ids.add(id);
  }
  for (const id of projectionOpContinuationCapabilityIds(auxOpsInTailNode(tailChunk.root.tail), {
    negation: "predicate_tail_negation",
    past: "predicate_tail_past",
    polite: "predicate_tail_polite",
    scopeBridge: "predicate_tail_scope_bridge",
    connective: "predicate_tail_connective",
    quote: "predicate_tail_quote",
    attributiveQuote: "predicate_tail_quote"
  })) {
    ids.add(id);
  }
  return [...ids];
}

function predicateTailBoundaryCapabilityIds(boundary: ClauseBoundary): readonly string[] {
  if (boundary.kind === "terminal") {
    return ["predicate_tail_terminal"];
  }
  if (boundary.connectiveKind === "question_quotative") {
    return ["predicate_tail_connective", "predicate_tail_quote"];
  }
  if (boundary.connectiveKind === "quotative" || boundary.quoteBoundary !== undefined) {
    return ["predicate_tail_quote"];
  }
  return ["predicate_tail_connective"];
}

export type TailPredicateProjectionHost = PredicateProjectionHost<
  TailRoot,
  ClauseBoundary,
  ClauseTailIR,
  RuntimeHaruToken,
  ClauseLayout,
  ContextGrammar,
  Warning
>;

export type TailPredicateProjectionHostResult =
  | {
    readonly ok: true;
    readonly host: TailPredicateProjectionHost;
    readonly predicateTokenIdx: number;
  }
  | { readonly ok: false; readonly reason: string };

export async function tryParseTailPredicateProjectionHost(
  input: IntegrationInput,
  start: number,
  end: number,
  options: { readonly projection?: PredicateProjectionKind } = {}
): Promise<TailPredicateProjectionHostResult> {
  const projection = options.projection ?? "attributive_nominalizer";
  const parsed = await parseTailChunkOnly(
    input,
    start,
    end,
    { kind: "terminal" },
    projection === "nominal_head"
      ? "nominal_head"
      : projection === "quoted_nominalizer" ? "quoted_nominal_host" : "clause_predicate"
  );
  if (!parsed.ok) {
    return parsed;
  }
  const stagedRoot = projection === "attributive_nominalizer" || projection === "quoted_nominalizer"
    ? markTailRootAttributiveTerminal(stripTrailingConnectiveForAttributiveHost(parsed.root))
    : parsed.root;
  const stagedWithQuoteBinding: TailRoot = {
    ...stagedRoot,
    quoteBinding: cachedQuoteBindingForContentRoot(
      input.tokens,
      parsed.predicateTokenIdx,
      end,
    ),
  };
  const numericResolved = withNumericStemBaseResolved(stagedWithQuoteBinding);
  if (numericResolved === null) {
    return { ok: false, reason: "numeric host base realization is empty" };
  }
  const root = projection === "nominal_head"
    ? numericResolved
    : withDerivationalStemBaseResolved(numericResolved, {
      formal: input.formal,
      lookups: input.lookups,
      numeric: input.numeric
    });
  if (root === null) {
    return { ok: false, reason: "derivational host base realization is empty" };
  }
  return {
    ok: true,
    host: {
      kind: "predicateProjectionHost",
      projection,
      root,
      clauseIndex: 0,
      tokenSpan: { start, end },
      contentSpan: { start, end },
      predicateTokenIdx: parsed.predicateTokenIdx,
      outgoingBoundary: { kind: "terminal" },
      sourceTokens: input.tokens,
      source: {
        start,
        end: end + 1,
        tokens: input.tokens.slice(start, end + 1)
      },
      warnings: []
    },
    predicateTokenIdx: parsed.predicateTokenIdx
  };
}

export async function tryParseTailChunk(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailChunkResult> {
  const collected = await collectTailChunkCandidates(input, start, options);
  const candidate = collected.candidates.find((item) =>
    !bareDemoCandidatePreemptsNegativeScopeTail(item.root, input.tokens) &&
    !finalOnlyConnectiveCandidateHasUnsupportedContinuation(item, input.tokens)
  );
  if (candidate !== undefined) {
    return {
      ...candidate,
      ...(collected.observation === undefined ? {} : { candidateObservation: collected.observation })
    };
  }
  return {
    ok: false,
    reason: collected.lastReason,
    ...(collected.observation === undefined ? {} : { observation: collected.observation }),
    ...(collected.intake === undefined ? {} : { intake: collected.intake })
  };
}

export async function tryParseEllipticPropositionQuoteTailChunk(
  input: IntegrationInput,
  start: number
): Promise<TailChunkResult> {
  const plan = ellipticPropositionQuoteTailPlan(input.cursor, start, input.lookups);
  if (plan === null) {
    return { ok: false, reason: "not an elliptic proposition quote tail start" };
  }
  if (
    plan.relation.quote.slotKind !== "quoted_content" ||
    plan.boundary.kind !== "接続助詞" ||
    !ellipticPropositionQuoteBoundaryCanUseSyntheticStem(plan.boundary.connectiveKind)
  ) {
    return { ok: false, reason: "quote relation is not a supported proposition quote content boundary" };
  }
  if (ellipticTailHasOvertLexicalStem(input.tokens, plan.tailStart, plan.tailEndExclusive)) {
    return { ok: false, reason: "elliptic quote tail candidate contains an overt lexical stem" };
  }
  if (plan.tailEndExclusive <= plan.tailStart) {
    return { ok: false, reason: "elliptic quote tail candidate is empty" };
  }
  const materialized = await materializeTailBoundaryStation(input, {
    id: "elliptic_quote",
    plan,
  });
  if (materialized.kind !== "candidate") {
    return {
      ok: false,
      reason: materialized.kind === "non_admission"
        ? `production family '${materialized.familyId}' requested ${materialized.policy}`
        : materialized.kind === "rejection" || materialized.kind === "exclusive_failure"
          ? materialized.reason
          : "elliptic quote station declined"
    };
  }
  return attachSingletonTailInterpretationObservation(
    input,
    plan.sourceStart,
    materialized.chunk,
    "singleton elliptic proposition quote tail interpretation",
  );
}

export async function tryParseEllipticPropositionModalTailChunk(
  input: IntegrationInput,
  start: number
): Promise<TailChunkResult> {
  if (!isZeroHeadPropositionTailSequenceStart(input.tokens, start)) {
    return { ok: false, reason: "not a zero-head proposition tail start" };
  }
  const tailEndExclusive = zeroHeadPropositionTailIslandEndExclusive(input.tokens, start);
  if (tailEndExclusive <= start) {
    return { ok: false, reason: "zero-head proposition tail candidate is empty" };
  }
  const materialized = await materializeTailBoundaryStation(input, {
    id: "elliptic_modal",
    start,
    tailEndExclusive,
  });
  if (materialized.kind !== "candidate") {
    return {
      ok: false,
      reason: materialized.kind === "rejection" || materialized.kind === "exclusive_failure"
        ? materialized.reason
        : "elliptic modal station did not produce a candidate"
    };
  }
  return attachSingletonTailInterpretationObservation(
    input,
    start,
    materialized.chunk,
    "singleton elliptic proposition modal tail interpretation",
  );
}

export async function tryParseTailChunkCandidates(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<readonly ParsedTailChunk[]> {
  return (await collectTailChunkCandidates(input, start, options)).candidates.filter((item) =>
    !bareDemoCandidatePreemptsNegativeScopeTail(item.root, input.tokens) &&
    !finalOnlyConnectiveCandidateHasUnsupportedContinuation(item, input.tokens)
  );
}

function finalOnlyConnectiveCandidateHasUnsupportedContinuation(
  candidate: ParsedTailChunk,
  tokens: readonly RuntimeHaruToken[]
): boolean {
  const boundary = candidate.outgoingBoundary;
  if (
    (boundary.kind !== "接続助詞" && boundary.kind !== "合成接続") ||
    !connectiveSurfaceRequiresFinalPosition(boundary.connectiveKind, boundary.surface)
  ) {
    return false;
  }
  let next = nextNonSpaceIndex(tokens, boundary.tokenSpan.end + 1, tokens.length);
  if (next === null) return false;
  const immediate = tokens[next];
  if (isOpeningPunctuationToken(immediate)) return true;
  const immediatePos0 = (immediate?.pos ?? 0) & POS0;
  if (immediatePos0 === 補助記号 || immediatePos0 === 記号) {
    if (immediate?.surface !== "、" && immediate?.surface !== ",") return true;
    next = nextNonSpaceIndex(tokens, next + 1, tokens.length);
    if (next === null) return false;
  }
  const marker = tokens[boundary.tokenSpan.end];
  const follower = tokens[next];
  if (
    marker?.sourceOrdinal !== undefined &&
    follower?.sourceOrdinal !== undefined &&
    follower.sourceOrdinal - marker.sourceOrdinal > 2
  ) {
    return true;
  }
  return ((tokens[next]?.pos ?? 0) & POS0) === 助詞;
}

function bareDemoCandidatePreemptsNegativeScopeTail(
  root: TailRoot,
  tokens: readonly RuntimeHaruToken[]
): boolean {
  const layer = firstAuxLayer(root.tail);
  const first = layer?.ops[0];
  if (
    layer === null ||
    !stemSupportsProjectionCategory(layer.stem, "nominal") ||
    first?.kind !== "connective" ||
    first.connective !== "even_if"
  ) {
    return false;
  }
  const markerOrdinal = first.source.tokens[0]?.sourceOrdinal;
  const markerIdx = markerOrdinal === undefined
    ? first.source.tokenIndices[0]
    : tokens.findIndex((token) => token.sourceOrdinal === markerOrdinal);
  if (markerIdx === undefined || markerIdx < 0) return false;
  const relation = dewaScopeBridgeRelationAt(tokens, markerIdx, {
    anchorIdx: markerIdx,
    consumers: ["tail_multi_clause"]
  });
  const negativeTail = relation === null ? undefined : tokens[relation.span.endExclusive];
  return negativeTail !== undefined && isNaiOrNuToken(negativeTail);
}

interface EllipticPropositionQuoteTailPlan {
  readonly mode: "explicit_quote" | "non_explicit_quote";
  readonly relation: NonNullable<ReturnType<typeof quoteStructuralRelationAt>>;
  readonly boundary: ClauseBoundary;
  readonly markerSpan: { readonly start: number; readonly endExclusive: number };
  readonly sourceStart: number;
  readonly sourceEndInclusive: number;
  readonly tailStart: number;
  readonly tailEndExclusive: number;
}

function ellipticPropositionQuoteTailPlan(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups: LookupTables
): EllipticPropositionQuoteTailPlan | null {
  return explicitEllipticPropositionQuoteTailPlan(cursor, start, lookups) ??
    nonExplicitEllipticPropositionQuoteTailPlan(cursor, start, lookups);
}

function explicitEllipticPropositionQuoteTailPlan(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups: LookupTables
): EllipticPropositionQuoteTailPlan | null {
  const tokens = cursor.tokens;
  const proto = activeProtoLayout();
  const span = proto?.quoteSpans.find(([open]) => open === start);
  if (span === undefined) {
    return null;
  }
  const [open, close] = span;
  const boundaryStart = nextNonSpaceIndex(tokens, close + 1, tokens.length);
  if (boundaryStart === null) {
    return null;
  }
  const relation = quoteStructuralRelationStartingAt(cursor.fork(boundaryStart, tokens.length, boundaryStart), lookups);
  const boundary = relation === undefined
    ? null
    : quoteClauseBoundaryFromRelation(tokens, relation, lookups, { lowerBoundInclusive: close + 1 });
  const markerSpan = relation === undefined
    ? null
    : quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, { lowerBoundInclusive: close + 1 });
  if (
    relation === undefined ||
    boundary === null ||
    markerSpan === null ||
    markerSpan.start < close + 1 ||
    markerSpan.endExclusive - 1 < boundaryStart
  ) {
    return null;
  }
  return {
    mode: "explicit_quote",
    relation,
    boundary,
    markerSpan,
    sourceStart: open,
    sourceEndInclusive: markerSpan.endExclusive - 1,
    tailStart: open + 1,
    tailEndExclusive: close
  };
}

function nonExplicitEllipticPropositionQuoteTailPlan(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups: LookupTables
): EllipticPropositionQuoteTailPlan | null {
  const tokens = cursor.tokens;
  const proto = activeProtoLayout();
  if (proto?.enclosingQuoteSpan(start) !== undefined) {
    return null;
  }
  if (!isNonExplicitEllipticTailSequenceStart(tokens, start)) {
    return null;
  }
  const relation = nonExplicitQuoteStructuralRelationStartingAt(cursor, start, proto, lookups);
  if (relation === undefined) {
    return null;
  }
  const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups, { lowerBoundInclusive: start });
  const markerSpan = quoteConsumedMarkerSpanFromRelation(tokens, relation, lookups, { lowerBoundInclusive: start });
  if (
    boundary === null ||
    markerSpan === null ||
    markerSpan.start <= start ||
    markerSpan.endExclusive - 1 < relation.quote.markerIdx
  ) {
    return null;
  }
  return {
    mode: "non_explicit_quote",
    relation,
    boundary,
    markerSpan,
    sourceStart: start,
    sourceEndInclusive: markerSpan.endExclusive - 1,
    tailStart: start,
    tailEndExclusive: markerSpan.start
  };
}

function nonExplicitQuoteStructuralRelationStartingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  proto: ReturnType<typeof activeProtoLayout>,
  lookups: LookupTables
): NonNullable<ReturnType<typeof quoteStructuralRelationAt>> | undefined {
  const tokens = cursor.tokens;
  const startClause = proto?.clauseContaining(start);
  for (const relation of quoteStructuralRelationIndex(cursor.fork(0, tokens.length, 0), lookups).winners()) {
    const startsAtRequestedToken = relation.quote.contentSpan.start === start;
    const coversRequestedQuoteTailStart =
      relation.quote.contentSpan.start < start &&
      start < relation.quote.markerIdx &&
      isNonExplicitEllipticTailSequenceStart(tokens, start);
    if ((!startsAtRequestedToken && !coversRequestedQuoteTailStart) || relation.quote.markerIdx <= start) {
      continue;
    }
    if (
      startClause !== undefined &&
      (relation.quote.markerIdx < startClause.start || relation.quote.markerIdx >= startClause.end)
    ) {
      continue;
    }
    return relation;
  }
  return undefined;
}

function ellipticPropositionQuoteBoundaryCanUseSyntheticStem(connectiveKind: string): boolean {
  return connectiveKind === "quotative" || connectiveKind === "cognitive_complement";
}

function ellipticPropositionQuoteTailRootInPhaseOneScope(
  root: TailRoot,
  boundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>
): boolean {
  const ops = auxOpsInTailNode(root.tail);
  const hasQuotativeBoundary = ops.some((op) =>
    op.kind === "connective" &&
    (op.connective === "quotative" || op.connective === "cognitive_complement") &&
    op.source.tokenIndices.includes(boundary.tokenIdx)
  );
  if (!hasQuotativeBoundary) {
    return false;
  }
  let primaryCount = 0;
  for (const op of ops) {
    if (op.kind === "connective" || op.kind === "negation" || op.kind === "tense" || op.kind === "polite") {
      continue;
    }
    if (op.kind === "conjecture") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "modal" && op.modal === "kamo") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "idiom" && op.idiom === "obligation" && op.variant === "beki") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "copula" && op.variant === "conjecture") {
      primaryCount += 1;
      continue;
    }
    if (
      op.kind === "copula" &&
      op.variant === "basic" &&
      op.polarity === "affirmative"
    ) {
      primaryCount += 1;
      continue;
    }
    return false;
  }
  return primaryCount === 1;
}

type ZeroHeadElidedHostClass = "proposition" | "predicate" | "event";

function zeroHeadOperatorKeys(op: AuxOpNode): readonly string[] {
  switch (op.kind) {
    case "modal":
      return [op.kind, `${op.kind}.${op.modal}`];
    case "connective":
      return [op.kind, `${op.kind}.${op.connective}`, `${op.kind}.${op.connective}.${op.allomorph}`];
    case "aspect":
      return [op.kind, `${op.kind}.${op.aspect}`];
    case "copula":
      return op.polarity === "affirmative"
        ? [`${op.kind}.${op.variant}`]
        : [`${op.kind}.${op.variant}.${op.polarity}`];
    default:
      return [op.kind];
  }
}

function zeroHeadOperatorInSet(op: AuxOpNode, set: ReadonlySet<string>): boolean {
  return zeroHeadOperatorKeys(op).some((key) => set.has(key));
}

function zeroHeadElidedPredicateOperatorChain(
  ops: readonly AuxOpNode[],
  lookups: LookupTables,
): ZeroHeadElidedHostClass | null {
  const [head, ...operators] = ops;
  if (head === undefined) {
    return null;
  }
  const hostClass: ZeroHeadElidedHostClass | null =
    zeroHeadOperatorInSet(head, lookups.ZERO_HEAD_EVENT_HEAD_OPERATORS)
      ? "event"
      : zeroHeadOperatorInSet(head, lookups.ZERO_HEAD_PREDICATE_HEAD_OPERATORS)
        ? "predicate"
        : zeroHeadOperatorInSet(head, lookups.ZERO_HEAD_PROPOSITION_HEAD_OPERATORS)
          ? "proposition"
          : null;
  if (hostClass === null || (head.kind === "connective" && operators.length > 0)) {
    return null;
  }
  const chainAdmitted = operators.every((op, index) =>
    zeroHeadOperatorInSet(op, lookups.ZERO_HEAD_CHAIN_OPERATORS) &&
    (op.kind !== "connective" || index === operators.length - 1)
  );
  return chainAdmitted ? hostClass : null;
}

function zeroHeadPropositionTailRootInScope(root: TailRootBase, lookups: LookupTables): boolean {
  const ops = auxOpsInTailNode(root.tail);
  if (zeroHeadElidedPredicateOperatorChain(ops, lookups) === "proposition") {
    return true;
  }
  let primaryCount = 0;
  for (const op of ops) {
    if (op.kind === "negation" || op.kind === "tense" || op.kind === "polite") {
      continue;
    }
    if (op.kind === "conjecture") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "modal" && (op.modal === "rashii" || op.modal === "kamo")) {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "modal" && (op.modal === "hazu" || op.modal === "wake")) {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "scopeBridge" && op.head === "wake") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "copula" && op.variant === "conjecture") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "copula" && op.variant === "basic") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "adjCopulaBridge") {
      primaryCount += 1;
      continue;
    }
    if (op.kind === "connective" && op.connective === "conditional" && (op.surface === "なら" || op.surface === "ならば")) {
      primaryCount += 1;
      continue;
    }
    return false;
  }
  if (primaryCount === 1) {
    return true;
  }
  if (primaryCount !== 0 || root.sfp == null) {
    return false;
  }
  if (root.sfp.effect !== null && lookups.ZERO_HEAD_STANDALONE_SFP_EFFECTS.has(root.sfp.effect)) {
    return true;
  }
  return ops.some((op) => op.kind === "polite" && isDesuPoliteOp(op));
}

const ZERO_HEAD_STEM_BOUND_FRAGMENT_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close"
]);

function zeroHeadStemBoundFragmentIsClosed(
  input: IntegrationInput,
  station: { readonly start: number; readonly tailEndExclusive: number },
  ops: readonly AuxOpNode[],
): boolean {
  if (ops.at(-1)?.kind === "connective") {
    return true;
  }
  const contentEndIdx = previousNonSpaceIndex(input.tokens, station.tailEndExclusive, station.start) ??
    station.tailEndExclusive - 1;
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), input.tokens, contentEndIdx + 1),
    ZERO_HEAD_STEM_BOUND_FRAGMENT_CLOSURES,
  );
}

function parseZeroHeadPropositionTailStation(
  input: IntegrationInput,
  station: { readonly start: number; readonly tailEndExclusive: number },
  hostClass: ZeroHeadElidedHostClass,
): { readonly kind: "parsed"; readonly root: ParsedTailRoot } | Extract<TailBoundaryStationMaterialization, { readonly kind: "rejection" }> {
  const tailTokens = input.tokens.slice(station.start, station.tailEndExclusive);
  const parseSlice = [syntheticEllipticDeicticStemToken(station.start), ...tailTokens];
  const parsed = parseTail({
    tokens: parseSlice,
    start: 0,
    stem: hostClass === "event"
      ? {
          kind: "verb",
          lemma: "그렇게 하다",
          irregular: "여",
          sourcePredicateShape: "verb"
        }
      : {
          kind: "adj",
          lemma: "그렇다",
          irregular: "ㅎ",
          sourcePredicateShape: hostClass === "predicate" ? "verb" : "lexical_adverb"
        },
    lookups: input.lookups,
    sourceIndexMap: [station.start, ...rangeIndices(station.start, station.tailEndExclusive)]
  });
  if (!parsed.ok) return { kind: "rejection", stage: "parse_failure", reason: `parser: ${parsed.reason}` };
  if (parsed.consumed !== parseSlice.length) {
    return {
      kind: "rejection",
      stage: "parse_failure",
      reason: `parser consumed ${parsed.consumed}/${parseSlice.length} zero-head proposition tail tokens — partial parse not in subset`
    };
  }
  return { kind: "parsed", root: parsed.root };
}

function markZeroHeadPropositionTailProjection<Root extends TailRootBase>(
  root: Root,
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number,
  lookups: LookupTables
): Root {
  if (!zeroHeadPropositionTailAllowsAttributiveProjection(root, lookups, tokens[contentEndIdx])) {
    return root;
  }
  const attribution = classifyAttributiveChunkBoundary(tokens, start, contentEndIdx, lookups);
  const zeroHeadAttribution = attribution ?? classifyZeroHeadAttributiveChunkBoundary(
    tokens,
    start,
    contentEndIdx,
    lookups
  );
  if (zeroHeadAttribution === null) {
    return root;
  }
  return markTailRootAttributiveTerminal(root, zeroHeadAttribution.payload);
}

function zeroHeadPropositionTailAllowsAttributiveProjection(
  root: TailRootBase,
  lookups: LookupTables,
  lastTailToken: RuntimeHaruToken | undefined,
): boolean {
  const ops = auxOpsInTailNode(root.tail);
  if (root.sfp !== null) {
    return false;
  }
  let projectable = ops.at(-1)?.kind !== "connective" &&
    lastTailToken !== undefined &&
    isAttributiveInflection(lastTailToken.pos) &&
    zeroHeadElidedPredicateOperatorChain(ops, lookups) !== null;
  for (const op of ops) {
    if (op.kind === "polite") {
      return false;
    }
    if (op.kind === "modal" && (op.modal === "rashii" || op.modal === "kamo" || op.modal === "hazu" || op.modal === "wake")) {
      if (op.polite) {
        return false;
      }
      projectable = true;
    }
    if (op.kind === "scopeBridge" && op.head === "wake") {
      if (op.polite) {
        return false;
      }
      projectable = true;
    }
  }
  return projectable;
}

function classifyZeroHeadAttributiveChunkBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): { readonly payload: AttributiveBoundaryPayload } | null {
  const splitAt = zeroHeadAttributiveBoundarySplitAt(tokens, startIdx, contentEndIdx, lookups);
  if (splitAt === null) {
    return null;
  }
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const head = tokens[headIdx];
  if (!isNominalLikeAttributiveHead(head)) {
    return null;
  }
  const headKind = classifyAttributiveHeadKind(head);
  if (!canExternalContentOwnAttributiveHead(tokens, startIdx, contentEndIdx, headIdx, headKind, lookups)) {
    return null;
  }
  return {
    payload: {
      kind: "attributiveBoundary",
      source: { tokens: [head], tokenIndices: [headIdx] },
      head: {
        surface: head.surface,
        dictionaryForm: head.dictionaryForm,
        pos: head.pos,
        tokenIdx: headIdx
      },
      headKind,
      projectionContext: {
        tokens,
        contentIdx: contentEndIdx
      },
      projection: "ordinary_nominal"
    }
  };
}

function zeroHeadAttributiveBoundarySplitAt(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): number | null {
  const directSplitAt = contentEndIdx + 1;
  if (isNominalLikeAttributiveHead(tokens[directSplitAt])) {
    return directSplitAt;
  }
  const nonSpaceSplitAt = nextNonSpaceIndex(tokens, directSplitAt, tokens.length);
  if (
    nonSpaceSplitAt !== null &&
    nonSpaceSplitAt !== directSplitAt &&
    isNominalLikeAttributiveHead(tokens[nonSpaceSplitAt])
  ) {
    return nonSpaceSplitAt;
  }
  return attributiveBoundarySplitAt(tokens, startIdx, contentEndIdx, lookups);
}

function isDesuPoliteOp(op: AuxOpNode): boolean {
  return op.kind === "polite" &&
    op.source.tokens.some((token) => token.dictionaryForm === "です" || token.surface === "です");
}

function syntheticEllipticDeicticStemToken(anchorIndex: number): RuntimeHaruToken {
  return {
    surface: "そう",
    dictionaryForm: "そう",
    reading: "ソウ",
    dictionaryFormReading: "ソウ",
    pos: 副詞,
    dictionaryId: 0,
    syntheticReason: `${SYNTHETIC_DEICTIC_STEM_REASON_PREFIX}${anchorIndex}`
  };
}

function numericHostChainMissesRequiredClaim(
  input: IntegrationInput,
  root: TailRoot,
): boolean {
  const reservation = input.numericHostReservation;
  if (reservation === undefined || !reservation.claimRequired) {
    return false;
  }
  const stem = firstAuxLayer(root.tail)?.stem;
  if (
    stem === undefined ||
    stem.kind !== "noun" ||
    stem.numericBase === undefined ||
    stem.source.tokenIndices[0] !== reservation.tokenIdx
  ) {
    return false;
  }
  return probeProductionDispatch(root, {
    intake: { site: "committed_render", partial: false }
  }).kind !== "registry";
}

function resolveTailBoundaryStationAdmission(
  root: TailRoot,
  context: ProductionMatchContext,
  legacyMidChainReason: string,
): TailBoundaryStationAdmission {
  const dispatch = probeProductionDispatch(root, context);
  if (dispatch.kind === "non_admission") {
    return dispatch.policy === "preserve"
      ? { kind: "preserve", familyId: dispatch.familyId }
      : {
        kind: "non_admission",
        familyId: dispatch.familyId,
        policy: dispatch.policy,
      };
  }
  if (dispatch.kind === "legacy_dispatch" && tailRootHasMidChainConnective(root)) {
    return {
      kind: "rejection",
      stage: "semantic_filter",
      reason: legacyMidChainReason,
    };
  }
  return { kind: "admitted" };
}

async function materializeSourceTailBoundaryStation(
  input: IntegrationInput,
  station: SourceTailBoundaryStation,
): Promise<TailBoundaryStationMaterialization> {
  const parsed = await parseTailChunkOnly(
    input,
    station.start,
    station.end,
    station.boundary,
  );
  if (!parsed.ok) {
    return {
      kind: "rejection",
      stage: "parse_failure",
      reason: parsed.reason,
      ...(parsed.headHypothesis === undefined ? {} : { headHypothesis: parsed.headHypothesis })
    };
  }

  const parsedRoot = station.id === "assembler_resumable_prefix" &&
    station.terminalProjection === "attributive" &&
    !attributiveRewriteRestsOnClosedUtterance(parsed.root, station.end, input.lookups)
    ? markTailRootAttributiveTerminal(parsed.root, station.attributivePayload)
    : parsed.root;
  const terminalPunctuationRun = activeProtoLayout()?.terminalPunctuationRunAfter(station.end);
  const utteranceClosure = utteranceClosureAfter(activeProtoLayout(), input.tokens, station.end + 1).closure;
  const root: TailRoot = {
    ...parsedRoot,
    quoteBinding: cachedQuoteBindingForContentRoot(
      input.tokens,
      parsed.predicateTokenIdx,
      station.end,
    ),
    ...(terminalPunctuationRun === undefined ? {} : { terminalPunctuationRun }),
    utteranceClosure
  };
  const intake = station.id === "general_candidate"
    ? { site: "candidate_scan" as const, partial: station.end < station.scanEnd }
    : station.id === "quote_prefix"
      ? { site: "quote_prefix" as const, partial: true as const }
      : {
        site: "assembler_resumable_prefix" as const,
        partial: true as const,
        ...(station.allowConditionalCompactQuoteManner
          ? { conditionalCompactQuoteManner: true as const }
          : {})
      };
  if (numericHostChainMissesRequiredClaim(input, root)) {
    return {
      kind: "rejection",
      stage: "semantic_filter",
      reason: "numeric host chain did not claim a production family",
    };
  }
  const chainFinalPreAdmission = station.id === "assembler_resumable_prefix" &&
    !tailRootHasMidChainConnective(root);
  const admission = chainFinalPreAdmission
    ? { kind: "admitted" as const }
    : resolveTailBoundaryStationAdmission(
      root,
      { intake },
      "single TailRoot cannot own a following predicate after a source-bearing connective",
    );
  if (admission.kind === "rejection" || admission.kind === "non_admission") {
    return admission;
  }

  let partial: TailChainPartialArtifact | undefined;
  if (station.id === "general_candidate") {
    const weakAttachmentCandidate = station.weakAttachmentBoundary !== null &&
      station.end === station.scanEnd &&
      station.boundary === station.weakAttachmentBoundary.boundary;
    partial = weakAttachmentCandidate
      ? tailBoundaryAttachmentWeakPartial(
        input.tokens,
        station.start,
        station.scanEnd,
        station.weakAttachmentBoundary.boundary,
      )
      : station.end < station.scanEnd &&
          station.boundary.kind !== "terminal" &&
          tailPartialSuffixCanStayInAssembler(
            input.cursor,
            station.end + 1,
            station.scanEnd,
            station.boundary,
            input.lookups,
          )
        ? tailFunctionalSuffixHandoffPartial(station.start, station.end, station.scanEnd)
        : station.end < station.scanEnd && station.unresolvedFunctionalResidual
          ? tailUnresolvedFunctionalResidualPartial(station.start, station.end, station.scanEnd)
          : undefined;
    if (
      station.unresolvedFunctionalResidual &&
      !tailRootHasSourceBearingPartialPrefix(root)
    ) {
      return {
        kind: "rejection",
        stage: "semantic_filter",
        reason: "functional residual suffix requires a source-bearing tail prefix"
      };
    }
  } else {
    const suffixStart = station.end + 1;
    const suffixCanStayInAssembler = station.id === "assembler_resumable_prefix" ||
      tailPartialSuffixCanStayInAssembler(
        input.cursor,
        suffixStart,
        station.scanEnd,
        station.boundary,
        input.lookups,
      );
    partial = station.id === "quote_prefix"
      ? {
        kind: "source_bearing_connective_prefix",
        decision: suffixCanStayInAssembler
          ? "functional_suffix_handoff"
          : "unresolved_suffix_warning",
        parsedPrefixSpan: { start: station.start, end: station.end + 1 },
        unresolvedSuffixSpan: { start: suffixStart, end: station.scanEnd + 1 },
        suffixCanStayInAssembler,
        auditReason: suffixCanStayInAssembler
          ? "source-bearing connective prefix preserved; functional suffix left for assembler"
          : "source-bearing connective prefix preserved; unresolved suffix attachment warning"
      }
      : {
        kind: "assembler_resumable_prefix",
        decision: "functional_suffix_handoff",
        parsedPrefixSpan: { start: station.start, end: station.end + 1 },
        unresolvedSuffixSpan: { start: suffixStart, end: station.scanEnd + 1 },
        suffixCanStayInAssembler: true,
        auditReason: station.auditReason
      };
  }

  const consumed = station.id === "general_candidate"
    ? parsed.info.sourceConsumed
    : station.end - station.start + 1;
  const chunk: ParsedTailChunk = {
    ok: true,
    consumed,
    root,
    predicateTokenIdx: parsed.predicateTokenIdx,
    outgoingBoundary: station.id === "general_candidate"
      ? normalizeTokaListingBoundary(input.cursor, parsed.outgoingBoundary, input.lookups)
      : parsed.outgoingBoundary,
    ...(partial === undefined ? {} : { partial })
  };
  if (admission.kind === "preserve") {
    if (partial === undefined) {
      throw new Error(
        `production family '${admission.familyId}' requested preserve for a complete tail boundary station`
      );
    }
    return {
      kind: "non_admission",
      familyId: admission.familyId,
      policy: "preserve",
      chunk: { ...chunk, partial }
    };
  }
  return { kind: "candidate", chunk };
}

async function materializeTailBoundaryStation(
  input: IntegrationInput,
  station: TailBoundaryStation,
): Promise<TailBoundaryStationMaterialization> {
  if (
    station.id === "general_candidate" ||
    station.id === "quote_prefix" ||
    station.id === "assembler_resumable_prefix"
  ) {
    return materializeSourceTailBoundaryStation(input, station);
  }
  if (station.id === "external_nominalizer") {
    const hostProjection = await renderExternalNominalizerHostProjection(
      input,
      station.start,
      station.frame.hostEnd,
    );
    if (!hostProjection.ok) {
      return {
        kind: "exclusive_failure",
        reason: `external nominalizer host projection failed: ${hostProjection.reason}`
      };
    }
    if (
      station.attributivePredicateEnd !== null &&
      !station.likenessHost &&
      !hasHostBearingExternalNominalizerAttributivePostverbTail(
        input.tokens,
        station.frame,
        station.attributivePredicateEnd,
        input.lookups,
      )
    ) {
      return { kind: "decline" };
    }
    const predicateEnd = station.attributivePredicateEnd ?? station.scanEnd;
    const boundary: ClauseBoundary = station.attributivePredicateEnd === null
      ? station.outgoingBoundary
      : { kind: "terminal" };
    const parsed = await parseTailChunkOnly(
      input,
      station.frame.predicateStart,
      predicateEnd,
      boundary,
    );
    if (!parsed.ok) {
      return {
        kind: "exclusive_failure",
        reason: `external nominalizer predicate parse failed: ${parsed.reason}`
      };
    }
    const stagedRoot = station.attributivePredicateEnd === null
      ? parsed.root
      : markTailRootAttributiveTerminal(parsed.root);
    const root: TailRoot = {
      ...stagedRoot,
      quoteBinding: cachedQuoteBindingForContentRoot(
        input.tokens,
        parsed.predicateTokenIdx,
        predicateEnd,
      ),
    };
    const built = buildHostBearingPrefixResult(
      input,
      station.start,
      predicateEnd,
      parsed,
      hostProjection,
      station.frame,
      parsed.outgoingBoundary,
      root,
    );
    return built.ok
      ? { kind: "candidate", chunk: built }
      : { kind: "exclusive_failure", reason: built.reason };
  }
  if (station.id === "elliptic_quote") {
    const { plan } = station;
    if (plan.boundary.kind === "terminal") {
      return {
        kind: "rejection",
        stage: "semantic_filter",
        reason: "elliptic quote station requires a source-bearing boundary"
      };
    }
    const tailTokens = input.tokens.slice(plan.tailStart, plan.tailEndExclusive);
    const boundaryTokens = input.tokens.slice(plan.markerSpan.start, plan.markerSpan.endExclusive);
    const parseSlice = [
      syntheticEllipticDeicticStemToken(plan.tailStart),
      ...tailTokens,
      ...boundaryTokens
    ];
    const sourceIndexMap = [
      plan.tailStart,
      ...rangeIndices(plan.tailStart, plan.tailEndExclusive),
      ...rangeIndices(plan.markerSpan.start, plan.markerSpan.endExclusive)
    ];
    const outgoingBoundaryHint = parseOutgoingBoundaryHint(plan.boundary);
    const parsed = parseTail({
      tokens: parseSlice,
      start: 0,
      stem: {
        kind: "adj",
        lemma: "그렇다",
        irregular: "ㅎ",
        sourcePredicateShape: "lexical_adverb"
      },
      lookups: input.lookups,
      ...(outgoingBoundaryHint === undefined ? {} : { outgoingBoundaryHint }),
      sourceIndexMap
    });
    if (!parsed.ok) return { kind: "rejection", stage: "parse_failure", reason: `parser: ${parsed.reason}` };
    if (parsed.consumed !== parseSlice.length) {
      return {
        kind: "rejection",
        stage: "parse_failure",
        reason: `parser consumed ${parsed.consumed}/${parseSlice.length} elliptic quote tokens — partial parse not in subset`
      };
    }
    const root: TailRoot = {
      ...rewriteRootOutgoingBoundaryConnective(parsed.root, plan.boundary),
      quoteBinding: plan.relation.quote.slotKind === "quoted_content"
        ? "quoted_content"
        : "unbound"
    };
    if (!ellipticPropositionQuoteTailRootInPhaseOneScope(root, plan.boundary)) {
      return { kind: "rejection", stage: "semantic_filter", reason: "elliptic quote tail semantic op is outside Phase 1 scope" };
    }
    const admission = resolveTailBoundaryStationAdmission(
      root,
      { intake: { site: "quote_prefix", partial: true } },
      "elliptic quote tail has an unsupported mid-chain connective",
    );
    if (admission.kind === "preserve") {
      throw new Error(
        `production family '${admission.familyId}' requested preserve for complete elliptic quote station`
      );
    }
    if (admission.kind !== "admitted") {
      return admission;
    }
    return {
      kind: "candidate",
      chunk: {
        ok: true,
        consumed: plan.sourceEndInclusive - plan.sourceStart + 1,
        root,
        predicateTokenIdx: plan.tailStart,
        outgoingBoundary: plan.boundary
      }
    };
  }

  const propositionParse = parseZeroHeadPropositionTailStation(input, station, "proposition");
  if (propositionParse.kind === "rejection") {
    return propositionParse;
  }
  const hostClass = zeroHeadElidedPredicateOperatorChain(auxOpsInTailNode(propositionParse.root.tail), input.lookups);
  let root = propositionParse.root;
  if (hostClass === "event" || hostClass === "predicate") {
    if (!isZeroHeadUtteranceInitialStart(input.tokens, station.start)) {
      return { kind: "rejection", stage: "semantic_filter", reason: `zero-head ${hostClass} tail fragment is not utterance-initial` };
    }
    if (!zeroHeadStemBoundFragmentIsClosed(input, station, auxOpsInTailNode(propositionParse.root.tail))) {
      return { kind: "rejection", stage: "semantic_filter", reason: `zero-head ${hostClass} tail fragment does not close as an independent utterance` };
    }
    const hostParse = parseZeroHeadPropositionTailStation(input, station, hostClass);
    if (hostParse.kind === "rejection") {
      return hostParse;
    }
    if (zeroHeadElidedPredicateOperatorChain(auxOpsInTailNode(hostParse.root.tail), input.lookups) !== hostClass) {
      return { kind: "rejection", stage: "semantic_filter", reason: `zero-head ${hostClass} tail operator chain did not survive the ${hostClass} host parse` };
    }
    root = hostParse.root;
  } else if (!zeroHeadPropositionTailRootInScope(root, input.lookups)) {
    return { kind: "rejection", stage: "semantic_filter", reason: "zero-head proposition tail semantic op is outside scope" };
  }
  const contentEndIdx = previousNonSpaceIndex(
    input.tokens,
    station.tailEndExclusive,
    station.start,
  ) ?? station.tailEndExclusive - 1;
  return {
    kind: "candidate",
    chunk: {
      ok: true,
      consumed: station.tailEndExclusive - station.start,
      root: {
        ...markZeroHeadPropositionTailProjection(
          root,
          input.tokens,
          station.start,
          contentEndIdx,
          input.lookups,
        ),
        quoteBinding: "unbound",
      },
      predicateTokenIdx: station.start,
      outgoingBoundary: { kind: "terminal" }
    }
  };
}

export function isContestedZeroTailClaimCoordinate(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  return findTailChunkScanEnd(tokens, start, numeric, lookups) === start &&
    zeroTailPredicateHeadContestedSlot(tokens, start) !== null;
}

function markContestedNominalUseClaim(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  collection: TailChunkCandidateCollection
): TailChunkCandidateCollection {
  if (collection.candidates.length === 0) {
    return collection;
  }
  const contestedBy = zeroTailPredicateHeadContestedSlot(tokens, start);
  if (contestedBy === null) {
    return collection;
  }
  return {
    ...collection,
    candidates: collection.candidates.map((chunk) =>
      chunk.consumed === 1 ? { ...chunk, contestedNominalUseSlot: contestedBy } : chunk
    )
  };
}

async function collectTailChunkCandidates(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailChunkCandidateCollection> {
  const collected = await collectTailChunkCandidatesFromParser(input, start, options);
  return markContestedNominalUseClaim(
    input.tokens,
    start,
    collected.candidates.length > 0
      ? collected
      : await collectQuotedBareKeijoujiHostTailChunkCandidates(input, start, options, collected)
  );
}

async function collectQuotedBareKeijoujiHostTailChunkCandidates(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions,
  fallback: TailChunkCandidateCollection
): Promise<TailChunkCandidateCollection> {
  const quotedHostScanEnd = quotedBareKeijoujiHostScanEnd(input.tokens, start);
  if (quotedHostScanEnd === null) {
    return fallback;
  }
  const maxEndExclusive = Math.min(options.maxEndExclusive ?? input.tokens.length, quotedHostScanEnd + 1);
  const clamped = await collectTailChunkCandidatesFromParser(input, start, { ...options, maxEndExclusive });
  return clamped.candidates.length > 0 ? clamped : fallback;
}

function collectTailChunkCandidatesFromParser(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailChunkCandidateCollection> {
  const { cursor } = input;
  const key = [
    "collectTailChunkCandidatesFromParser",
    start,
    options.maxEndExclusive ?? input.tokens.length,
    cursor.pos,
    cursor.end,
    cursor.origin,
    memoIdentity(cursor.tokens),
    input.formal ? 1 : 0,
    memoIdentity(input.dictionary),
    memoIdentity(input.lookups),
    memoIdentity(input.numeric),
    memoIdentity(input.synthesizeEntry),
    memoIdentity(input.numericHostReservation),
    memoIdentity(activeProtoLayout())
  ].join("|");
  return lineMemo(input.tokens, key, async () =>
    freezeTailChunkCandidateCollection(await collectTailChunkCandidatesFromParserUncached(input, start, options))
  );
}

const MEMO_IDENTITIES = new WeakMap<object, number>();
let nextMemoIdentity = 0;

function memoIdentity(value: object | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  let id = MEMO_IDENTITIES.get(value);
  if (id === undefined) {
    nextMemoIdentity += 1;
    id = nextMemoIdentity;
    MEMO_IDENTITIES.set(value, id);
  }
  return String(id);
}

function freezeTailChunkCandidateCollection(collection: TailChunkCandidateCollection): TailChunkCandidateCollection {
  for (const candidate of collection.candidates) {
    Object.freeze(candidate);
  }
  Object.freeze(collection.candidates);
  if (collection.observation !== undefined) {
    Object.freeze(collection.observation.attempts);
    Object.freeze(collection.observation);
  }
  return Object.freeze(collection);
}

async function collectTailChunkCandidatesFromParserUncached(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailChunkCandidateCollection> {
  if (!isPotentialTailChunkStart(input.cursor, start, input.numeric, input.lookups)) {
    return {
      candidates: [],
      lastReason: `token ${start} is not a tail-parser chunk start`,
      intake: "out_of_domain"
    };
  }
  if (
    isBareInterrogativeQuestionComplementStart(input.cursor, start, input.lookups) &&
    await lexicalParticleAdverbialOwnsHead(input, start)
  ) {
    return {
      candidates: [],
      lastReason: "source lexical particle adverbialization owns the marker"
    };
  }
  if (await bareTteAttributiveStartLacksPredicateSense(input, start)) {
    return {
      candidates: [],
      lastReason: `token ${start} 形状詞可能 bare って attributive 는 술어 sense 가 없어 content-pass noun 에 양보`
    };
  }
  const requestedMaxEnd = options.maxEndExclusive ?? input.tokens.length;
  const scanEnd = Math.min(
    findTailChunkScanEnd(input.tokens, start, input.numeric, input.lookups),
    requestedMaxEnd - 1
  );
  if (scanEnd < start) {
    return {
      candidates: [],
      lastReason: "tail chunk requires a tail-parser head token"
    };
  }
  if (
    scanEnd === start &&
    !canParseZeroTailPredicateHead(input.tokens, start) &&
    !(adverbialModifierChunkEnd(input.tokens, start, input.lookups)?.end === start) &&
    !isExplicitQuoteSpanContentZeroTailHead(input.cursor, start, input.lookups) &&
    !(await zeroTailRenyouChuushiPredicateHeadAdmitted(input, start))
  ) {
    return {
      candidates: [],
      lastReason: "zero-tail predicate head requires terminal/attributive form"
    };
  }

  const weakAttachmentBoundary = weakAttachmentSourceBearingBoundaryAtScanEnd(input.cursor, start, scanEnd, input.lookups);
  const legalPartialBoundaries = legalTailChunkPartialBoundaries(input.cursor, start, scanEnd, input.numeric, input.lookups);
  const bareRenyouChuushiHeadBoundary: ClauseBoundary | undefined =
    scanEnd > start && !legalPartialBoundaries.has(start) &&
      (await zeroTailRenyouChuushiPredicateHeadAdmitted(input, start))
      ? { kind: "terminal" }
      : undefined;
  let lastReason = "no candidate tried";
  const attempts: TailChunkCandidateAttemptObservation[] = [];
  const observe = (candidateCount: number, reason: string): TailChunkCandidateObservation => ({
    start,
    requestedMaxEndExclusive: requestedMaxEnd,
    scanEnd,
    candidateCount,
    lastReason: reason,
    attempts: [...attempts]
  });
  const hostBearingExternalPredicate = weakAttachmentBoundary === null
    ? await tryParseHostBearingExternalNominalizerPredicateChunk(
      input,
      start,
      scanEnd
    )
    : null;
  if (hostBearingExternalPredicate !== null) {
    if (hostBearingExternalPredicate.ok) {
      attempts.push({
        end: start + hostBearingExternalPredicate.consumed - 1,
        status: "candidate",
        boundaryKind: hostBearingExternalPredicate.outgoingBoundary.kind,
        boundaryConnective: hostBearingExternalPredicate.outgoingBoundary.kind === "terminal"
          ? null
          : hostBearingExternalPredicate.outgoingBoundary.connectiveKind,
        consumed: hostBearingExternalPredicate.consumed
      });
    }
    return hostBearingExternalPredicate.ok
      ? withTailInterpretationEnvelope(input, start, {
        candidates: [hostBearingExternalPredicate],
        lastReason,
        observation: observe(1, lastReason)
      })
      : {
        candidates: [],
        lastReason: hostBearingExternalPredicate.reason,
        observation: observe(0, hostBearingExternalPredicate.reason)
      };
  }
  const candidates: ParsedTailChunk[] = [];
  const adverbialModifierChunk = adverbialModifierChunkEnd(input.tokens, start, input.lookups);
  for (let end = scanEnd; end >= start; end -= 1) {
    const unresolvedFunctionalResidual =
      end < scanEnd &&
      tailFunctionalResidualSuffixCanStayUnresolved(input.tokens, end + 1, scanEnd);
    const outgoingBoundary = legalPartialBoundaries.get(end) ??
      (end === start ? bareRenyouChuushiHeadBoundary : undefined) ??
      (end < scanEnd
        ? unresolvedFunctionalResidual ? { kind: "terminal" }
          : adverbialModifierChunk?.end === end ? { kind: "terminal" } : undefined
        : weakAttachmentBoundary?.boundary ??
          inferTailChunkEndBoundary(input.cursor, start, scanEnd, input.numeric, input.lookups));
    if (outgoingBoundary === undefined) {
      attempts.push({ end, status: "no_boundary", reason: "no legal tail boundary at candidate end" });
      continue;
    }
    const materialized = await materializeTailBoundaryStation(input, {
      id: "general_candidate",
      start,
      end,
      scanEnd,
      boundary: outgoingBoundary,
      unresolvedFunctionalResidual,
      weakAttachmentBoundary,
    });
    const materializedCandidate = materialized.kind === "candidate"
      ? materialized.chunk
      : materialized.kind === "non_admission" && materialized.policy === "preserve"
        ? materialized.chunk
        : null;
    if (materializedCandidate === null) {
      const reason = materialized.kind === "non_admission"
        ? `production family '${materialized.familyId}' requested ${materialized.policy}`
        : materialized.kind === "rejection"
          ? materialized.reason
          : "tail boundary station produced no candidate";
      lastReason = reason;
      attempts.push({
        end,
        status: materialized.kind === "rejection"
          ? materialized.stage
          : "semantic_filter",
        boundaryKind: outgoingBoundary.kind,
        boundaryConnective: outgoingBoundary.kind === "terminal" ? null : outgoingBoundary.connectiveKind,
        reason,
        ...(materialized.kind !== "rejection" || materialized.headHypothesis === undefined
          ? {}
          : { headHypothesis: materialized.headHypothesis })
      });
      if (materialized.kind === "non_admission" && materialized.policy === "reject") {
        return { candidates: [], lastReason, observation: observe(0, lastReason) };
      }
      continue;
    }
    const candidate = materializedCandidate;
    const candidateConsumed = candidate.consumed;
    const candidateEnd = start + candidateConsumed - 1;
    attempts.push({
      end: candidateEnd,
      status: "candidate",
      boundaryKind: outgoingBoundary.kind,
      boundaryConnective: outgoingBoundary.kind === "terminal" ? null : outgoingBoundary.connectiveKind,
      consumed: candidateConsumed
    });
    candidates.push(candidate);
    if (materialized.kind === "non_admission" && materialized.policy === "preserve") {
      return withTailInterpretationEnvelope(input, start, {
        candidates: [candidate],
        lastReason,
        observation: observe(1, lastReason)
      });
    }
  }
  const assemblerResumable = await tryBuildAssemblerResumableTailPrefixCandidate(input, start, scanEnd);
  if (assemblerResumable !== null) {
    if (assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "reject") {
      lastReason = `production family '${assemblerResumable.familyId}' requested reject`;
      return { candidates: [], lastReason, observation: observe(0, lastReason) };
    }
    const assemblerResumableChunk = assemblerResumable.kind === "candidate"
      ? assemblerResumable.chunk
      : assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "preserve"
        ? assemblerResumable.chunk
        : undefined;
    if (assemblerResumableChunk !== undefined) {
      if (assemblerResumable.kind === "non_admission" && assemblerResumable.policy === "preserve") {
        attempts.unshift({
          end: start + assemblerResumableChunk.consumed - 1,
          status: "partial_candidate",
          boundaryKind: assemblerResumableChunk.outgoingBoundary.kind,
          boundaryConnective: assemblerResumableChunk.outgoingBoundary.kind === "terminal"
            ? null
            : assemblerResumableChunk.outgoingBoundary.connectiveKind,
          reason: assemblerResumable.chunk.partial.decision,
          consumed: assemblerResumableChunk.consumed
        });
        return withTailInterpretationEnvelope(input, start, {
          candidates: [assemblerResumableChunk],
          lastReason,
          observation: observe(1, lastReason)
        });
      }
      const bestConsumed = candidates[0]?.consumed ?? 0;
      if (assemblerResumableChunk.consumed > bestConsumed) {
        attempts.unshift({
          end: start + assemblerResumableChunk.consumed - 1,
          status: "partial_candidate",
          boundaryKind: assemblerResumableChunk.outgoingBoundary.kind,
          boundaryConnective: assemblerResumableChunk.outgoingBoundary.kind === "terminal"
            ? null
            : assemblerResumableChunk.outgoingBoundary.connectiveKind,
          reason: assemblerResumableChunk.partial?.decision ?? "assembler_resumable_tail_prefix",
          consumed: assemblerResumableChunk.consumed
        });
        candidates.unshift(assemblerResumableChunk);
      }
    }
  }
  if (candidates.length > 0) {
    const partial = await tryBuildTailChunkPartialCandidate(input, start, scanEnd);
    if (partial?.kind === "non_admission" && partial.policy === "reject") {
      lastReason = `production family '${partial.familyId}' requested reject`;
      return { candidates: [], lastReason, observation: observe(0, lastReason) };
    }
    const partialChunk = partial?.kind === "candidate"
      ? partial.chunk
      : partial?.kind === "non_admission" && partial.policy === "preserve"
        ? partial.chunk
        : undefined;
    if (partial?.kind === "non_admission" && partial.policy === "preserve") {
      attempts.unshift({
        end: start + partial.chunk.consumed - 1,
        status: "partial_candidate",
        boundaryKind: partial.chunk.outgoingBoundary.kind,
        boundaryConnective: partial.chunk.outgoingBoundary.kind === "terminal"
          ? null
          : partial.chunk.outgoingBoundary.connectiveKind,
        reason: partial.chunk.partial.decision,
        consumed: partial.chunk.consumed
      });
      return withTailInterpretationEnvelope(input, start, {
        candidates: [partial.chunk],
        lastReason,
        observation: observe(1, lastReason)
      });
    }
    const bestConsumed = candidates[0]?.consumed ?? 0;
    if (partialChunk !== undefined && partialChunk.consumed > bestConsumed) {
      attempts.unshift({
        end: start + partialChunk.consumed - 1,
        status: "partial_candidate",
        boundaryKind: partialChunk.outgoingBoundary.kind,
        boundaryConnective: partialChunk.outgoingBoundary.kind === "terminal" ? null : partialChunk.outgoingBoundary.connectiveKind,
        reason: partialChunk.partial?.decision ?? "tail_chunk_partial_candidate",
        consumed: partialChunk.consumed
      });
      candidates.unshift(partialChunk);
    }
    const observation = observe(candidates.length, lastReason);
    return withTailInterpretationEnvelope(input, start, {
      candidates,
      lastReason,
      observation
    });
  }
  const partial = await tryBuildTailChunkPartialCandidate(input, start, scanEnd);
  if (partial?.kind === "non_admission" && partial.policy === "reject") {
    lastReason = `production family '${partial.familyId}' requested reject`;
    return { candidates: [], lastReason, observation: observe(0, lastReason) };
  }
  const partialChunk = partial?.kind === "candidate"
    ? partial.chunk
    : partial?.kind === "non_admission" && partial.policy === "preserve"
      ? partial.chunk
      : undefined;
  if (partial?.kind === "non_admission" && partial.policy === "preserve") {
    attempts.unshift({
      end: start + partial.chunk.consumed - 1,
      status: "partial_candidate",
      boundaryKind: partial.chunk.outgoingBoundary.kind,
      boundaryConnective: partial.chunk.outgoingBoundary.kind === "terminal"
        ? null
        : partial.chunk.outgoingBoundary.connectiveKind,
      reason: partial.chunk.partial.decision,
      consumed: partial.chunk.consumed
    });
    return withTailInterpretationEnvelope(input, start, {
      candidates: [partial.chunk],
      lastReason,
      observation: observe(1, lastReason)
    });
  }
  if (partialChunk !== undefined) {
    attempts.unshift({
      end: start + partialChunk.consumed - 1,
      status: "partial_candidate",
      boundaryKind: partialChunk.outgoingBoundary.kind,
      boundaryConnective: partialChunk.outgoingBoundary.kind === "terminal" ? null : partialChunk.outgoingBoundary.connectiveKind,
      reason: partialChunk.partial?.decision ?? "tail_chunk_partial_candidate",
      consumed: partialChunk.consumed
    });
    const observation = observe(1, lastReason);
    return withTailInterpretationEnvelope(input, start, {
      candidates: [partialChunk],
      lastReason,
      observation
    });
  }
  return { candidates, lastReason, observation: observe(0, lastReason) };
}

async function lexicalParticleAdverbialOwnsHead(input: IntegrationInput, start: number): Promise<boolean> {
  const token = input.tokens[start];
  const particleIdx = start + 1;
  const particle = input.tokens[particleIdx];
  if (token === undefined || particle === undefined) return false;
  const entry = await input.dictionary.lookupTokenRelaxed(token);
  return (entry?.senses ?? []).some(sense =>
    tailParserSenseFrameLocallyPossible(sense, input.tokens, start, input) &&
    (sense.adverbializations ?? []).some(adverbialization =>
      adverbialization.particle === particle.surface &&
      adverbialization.consumeParticle !== false &&
      adverbializationActivationMatches(adverbialization, {
        cursor: input.cursor,
        particleIdx,
        lookups: input.lookups
      })
    )
  );
}

export interface TailInterpretationWorkCandidate {
  readonly chunk: ParsedTailChunk;
  readonly observation: Omit<
    TailInterpretationCandidateObservation,
    "selected" | "rejectionReason" | "arbitrationRule" | "arbitrationReason"
  >;
}

export interface TailInterpretationArbitrationResult {
  readonly selectedIndex: number;
  readonly rule: string;
  readonly reason: string;
}

function withTailInterpretationEnvelope(
  input: IntegrationInput,
  start: number,
  collection: TailChunkCandidateCollection
): TailChunkCandidateCollection {
  if (collection.candidates.length === 0) {
    return collection;
  }
  const workCandidates = collection.candidates.map((chunk, index) =>
    buildTailInterpretationWorkCandidate(input, start, chunk, index)
  );
  const arbitration = arbitrateTailInterpretations(workCandidates);
  const selectedWorkIndex = arbitration.selectedIndex;
  const interpretations = workCandidates.map((candidate, index): TailInterpretationCandidateObservation => {
    const selected = index === selectedWorkIndex;
    const rejectionReason = tailInterpretationRejectionReason(candidate, arbitration, selected);
    return {
      ...candidate.observation,
      arbitrationRule: selected
        ? arbitration.rule
        : tailInterpretationNonSelectedRule(candidate, arbitration),
      arbitrationReason: selected
        ? arbitration.reason
        : rejectionReason,
      selected,
      ...(selected ? {} : { rejectionReason })
    };
  });
  const fallbackObservation = collection.observation ?? {
    start,
    requestedMaxEndExclusive: start,
    scanEnd: start - 1,
    candidateCount: collection.candidates.length,
    lastReason: collection.lastReason,
    attempts: []
  };
  if (selectedWorkIndex < 0) {
    return {
      candidates: [],
      lastReason: collection.lastReason,
      observation: {
        ...fallbackObservation,
        candidateCount: collection.candidates.length,
        interpretations
      }
    };
  }
  const orderedWorkCandidates = [
    workCandidates[selectedWorkIndex]!,
    ...workCandidates.filter((candidate, index) =>
      index !== selectedWorkIndex && candidate.observation.eligible
    )
  ];
  return {
    candidates: orderedWorkCandidates.map(candidate => candidate.chunk),
    lastReason: collection.lastReason,
    observation: {
      ...fallbackObservation,
      candidateCount: collection.candidates.length,
      interpretations
    }
  };
}

export function arbitrateTailInterpretations(
  candidates: readonly TailInterpretationWorkCandidate[]
): TailInterpretationArbitrationResult {
  const eligible = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.observation.eligible);
  if (eligible.length === 0) {
    return {
      selectedIndex: -1,
      rule: "contract_all_candidates_ineligible",
      reason: "no materialized tail interpretation survived shared head evaluation"
    };
  }
  if (candidates.length === 1) {
    return {
      selectedIndex: 0,
      rule: "singleton",
      reason: "single materialized tail interpretation candidate"
    };
  }
  const sorted = [...eligible].sort(compareTailInterpretationWorkCandidates);
  const selected = sorted[0]!;
  const rule = tailInterpretationSelectionRule(sorted, candidates);
  return {
    selectedIndex: selected.index,
    rule,
    reason: tailInterpretationSelectionReason(rule)
  };
}

function compareTailInterpretationWorkCandidates(
  left: { readonly candidate: TailInterpretationWorkCandidate; readonly index: number },
  right: { readonly candidate: TailInterpretationWorkCandidate; readonly index: number }
): number {
  return compareDesc(left.candidate.observation.specificity, right.candidate.observation.specificity) ||
    compareAsc(
      spanCompletenessRank(left.candidate.observation.spanCompleteness),
      spanCompletenessRank(right.candidate.observation.spanCompleteness)
    ) ||
    compareAsc(left.candidate.observation.ownerPrecedence, right.candidate.observation.ownerPrecedence) ||
    compareAsc(
      structuralEvidenceRank(left.candidate.observation.structuralEvidence),
      structuralEvidenceRank(right.candidate.observation.structuralEvidence)
    ) ||
    compareAsc(left.candidate.observation.declarationOrder, right.candidate.observation.declarationOrder) ||
    compareAsc(left.index, right.index);
}

function tailInterpretationSelectionRule(
  sorted: readonly { readonly candidate: TailInterpretationWorkCandidate; readonly index: number }[],
  all: readonly TailInterpretationWorkCandidate[]
): string {
  if (all.some(candidate => !candidate.observation.eligible)) {
    return "contract_eligibility";
  }
  const selected = sorted[0]!.candidate.observation;
  if (all.some(candidate => candidate.observation.specificity !== selected.specificity)) {
    return "span_specificity";
  }
  if (all.some(candidate => candidate.observation.spanCompleteness !== selected.spanCompleteness)) {
    return "span_completeness";
  }
  if (all.some(candidate => candidate.observation.ownerPrecedence !== selected.ownerPrecedence)) {
    return "owner_precedence";
  }
  if (all.some(candidate => candidate.observation.structuralEvidence !== selected.structuralEvidence)) {
    return "hard_structural_evidence";
  }
  return "deterministic_declaration_order";
}

function tailInterpretationSelectionReason(rule: string): string {
  switch (rule) {
    case "contract_eligibility":
      return "selected first tail interpretation with a surviving shared-head evaluation";
    case "span_specificity":
      return "selected the tail interpretation with the most specific consumed span";
    case "span_completeness":
      return "selected complete tail interpretation over partial handoff";
    case "owner_precedence":
      return "selected higher-precedence predicate-root owner for the same span";
    case "hard_structural_evidence":
      return "selected tail interpretation with stronger structural evidence";
    case "singleton":
      return "single materialized tail interpretation candidate";
    default:
      return "selected by deterministic declaration order";
  }
}

function tailInterpretationRejectionReason(
  candidate: TailInterpretationWorkCandidate,
  arbitration: TailInterpretationArbitrationResult,
  selected: boolean
): string {
  if (selected) {
    return arbitration.reason;
  }
  if (!candidate.observation.eligible) {
    return "shared head evaluator found no surviving candidate";
  }
  return `lower priority than selected tail interpretation by ${arbitration.rule}`;
}

function tailInterpretationNonSelectedRule(
  candidate: TailInterpretationWorkCandidate,
  arbitration: TailInterpretationArbitrationResult
): string {
  if (!candidate.observation.eligible) {
    return "contract_eligibility";
  }
  return arbitration.rule;
}

function compareAsc(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareDesc(left: number, right: number): number {
  return left > right ? -1 : left < right ? 1 : 0;
}

function spanCompletenessRank(value: TailInterpretationCandidateObservation["spanCompleteness"]): number {
  return value === "complete" ? 0 : 1;
}

function structuralEvidenceRank(value: TailInterpretationCandidateObservation["structuralEvidence"]): number {
  switch (value) {
    case "postverb_auxiliary":
      return 0;
    case "tail_root_parse":
      return 1;
    case "partial_prefix":
      return 2;
  }
}

function attachSingletonTailInterpretationObservation(
  input: IntegrationInput,
  start: number,
  chunk: ParsedTailChunk,
  lastReason: string
): ParsedTailChunk {
  const collection = withTailInterpretationEnvelope(input, start, {
    candidates: [chunk],
    lastReason,
    observation: {
      start,
      requestedMaxEndExclusive: start + chunk.consumed,
      scanEnd: start + chunk.consumed - 1,
      candidateCount: 1,
      lastReason,
      attempts: [{
        end: start + chunk.consumed - 1,
        status: "candidate",
        boundaryKind: chunk.outgoingBoundary.kind,
        boundaryConnective: chunk.outgoingBoundary.kind === "terminal" ? null : chunk.outgoingBoundary.connectiveKind,
        consumed: chunk.consumed
      }]
    }
  });
  const observed = collection.candidates[0] ?? chunk;
  return {
    ...observed,
    ...(collection.observation === undefined ? {} : { candidateObservation: collection.observation })
  };
}

function buildTailInterpretationWorkCandidate(
  input: IntegrationInput,
  start: number,
  chunk: ParsedTailChunk,
  declarationOrder: number
): TailInterpretationWorkCandidate {
  const layer = firstAuxLayer(chunk.root.tail);
  const postverb = layer?.ops.find((op) => op.kind === "postverbAuxiliary");
  const headHypothesis = chunk.root.headHypothesis ??
    (layer?.stem.kind === "candidateSet" ? layer.stem.headHypothesis : undefined);
  const source = chunk.partial !== undefined
    ? "partial_candidate" as const
    : isPostverbCompetitionOp(postverb)
      ? "postverb_competition" as const
      : "predicate_root_parser" as const;
  const evidenceKind = postverb?.kind === "postverbAuxiliary"
    ? postverb.auxiliary.kind
    : chunk.outgoingBoundary.kind === "terminal"
      ? "terminal"
      : chunk.outgoingBoundary.connectiveKind ?? chunk.outgoingBoundary.kind;
  const headEvidenceDecision = layer === null
    ? chunk.root.headEvidenceDecision
    : chunk.root.headEvidenceDecision ?? resolveTailEvidenceDecision({
      stem: layer.stem,
      ops: layer.ops,
      outgoingBoundary: chunk.outgoingBoundary,
      terminal: layer.terminal,
      ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
      ...(headHypothesis === undefined ? {} : { headHypothesis }),
      tokens: input.tokens,
      predicateTokenIdx: chunk.predicateTokenIdx
    }) ?? undefined;
  const ownerKey = tailInterpretationOwnerKey(source, evidenceKind);
  return {
    chunk,
    observation: {
      ownerKey,
      source,
      evidenceKind,
      span: { start, endExclusive: start + chunk.consumed },
      specificity: chunk.consumed,
      spanCompleteness: chunk.partial === undefined ? "complete" : "partial",
      structuralEvidence: tailInterpretationStructuralEvidence(source),
      ownerPrecedence: tailInterpretationOwnerPrecedence(ownerKey, source),
      declarationOrder,
      eligible: headEvidenceDecision === undefined || headEvidenceDecision.candidateOpenSet.length > 0,
      ...(headEvidenceDecision === undefined ? {} : { headEvidenceDecision })
    }
  };
}

function tailInterpretationStructuralEvidence(
  source: TailInterpretationCandidateObservation["source"]
): TailInterpretationCandidateObservation["structuralEvidence"] {
  switch (source) {
    case "postverb_competition":
      return "postverb_auxiliary";
    case "partial_candidate":
      return "partial_prefix";
    case "predicate_root_parser":
      return "tail_root_parse";
  }
}

function tailInterpretationOwnerPrecedence(
  ownerKey: string,
  source: TailInterpretationCandidateObservation["source"]
): number {
  switch (source) {
    case "postverb_competition":
      return 10;
    case "predicate_root_parser":
      return 30;
    case "partial_candidate":
      return 70;
  }
  return ownerKey.length;
}

function isPostverbCompetitionOp(op: AuxOpNode | undefined): boolean {
  if (op?.kind !== "postverbAuxiliary") {
    return false;
  }
  switch (op.auxiliary.kind) {
    case "adverbial_change":
    case "adverbial_change_potential":
    case "adverbial_control":
    case "state_change":
    case "state_change_potential":
    case "appearance_state_change":
    case "appearance_state_change_potential":
    case "appearance_behavior":
    case "scope_control":
      return true;
    default:
      return false;
  }
}

function tailInterpretationOwnerKey(
  source: TailInterpretationCandidateObservation["source"],
  evidenceKind: string
): string {
  switch (source) {
    case "postverb_competition":
      return `postverb:${evidenceKind}`;
    case "partial_candidate":
      return `partial:${evidenceKind}`;
    case "predicate_root_parser":
      return `predicate_root:${evidenceKind}`;
  }
}

async function tryBuildTailChunkPartialCandidate(
  input: IntegrationInput,
  start: number,
  scanEnd: number
): Promise<TailBoundaryStationMaterialization | null> {
  for (const prefixBoundary of sourceBearingConnectivePrefixBoundaries(input.cursor.fork(start + 1, scanEnd + 1, start + 1), start, scanEnd, input.lookups)) {
    const materialized = await materializeTailBoundaryStation(input, {
      id: "quote_prefix",
      start,
      end: prefixBoundary.end,
      scanEnd,
      boundary: prefixBoundary.boundary,
    });
    if (
      materialized.kind === "candidate" ||
      (materialized.kind === "non_admission" && materialized.policy !== "split")
    ) {
      return materialized;
    }
  }
  return null;
}

async function tryBuildAssemblerResumableTailPrefixCandidate(
  input: IntegrationInput,
  start: number,
  scanEnd: number
): Promise<TailBoundaryStationMaterialization | null> {
  for (const prefixBoundary of assemblerResumableTailPrefixBoundaries(input.tokens, start, scanEnd, input.lookups)) {
    const mannerHead = prefixBoundary.attributivePayload?.head;
    const allowConditionalCompactQuoteManner =
      isAdverbialMannerNounHead(mannerHead, input.lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS);
    const materialized = await materializeTailBoundaryStation(input, {
      id: "assembler_resumable_prefix",
      start,
      end: prefixBoundary.end,
      scanEnd,
      boundary: prefixBoundary.boundary,
      auditReason: prefixBoundary.auditReason,
      ...(prefixBoundary.terminalProjection === undefined
        ? {}
        : { terminalProjection: prefixBoundary.terminalProjection }),
      ...(prefixBoundary.attributivePayload === undefined
        ? {}
        : { attributivePayload: prefixBoundary.attributivePayload }),
      allowConditionalCompactQuoteManner,
    });
    if (
      materialized.kind === "candidate" ||
      (materialized.kind === "non_admission" && materialized.policy !== "split")
    ) {
      return materialized;
    }
  }
  return null;
}

interface AssemblerResumableTailPrefixBoundary {
  readonly end: number;
  readonly boundary: ClauseBoundary;
  readonly auditReason: string;
  readonly terminalProjection?: "attributive";
  readonly attributivePayload?: AttributiveBoundaryPayload;
}

function assemblerResumableTailPrefixBoundaries(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  scanEnd: number,
  lookups: LookupTables
): readonly AssemblerResumableTailPrefixBoundary[] {
  const boundaries: AssemblerResumableTailPrefixBoundary[] = [];
  for (let suffixStart = start + 1; suffixStart <= scanEnd; suffixStart += 1) {
    const suffix = assemblerResumablePostPredicateSuffixStart(tokens, start, suffixStart, lookups);
    if (suffix === null) {
      continue;
    }
    boundaries.push({
      end: suffixStart - 1,
      boundary: { kind: "terminal" },
      auditReason: assemblerResumableSuffixAuditReason(tokens, start, suffixStart, lookups),
      ...(suffix.terminalProjection === undefined ? {} : { terminalProjection: suffix.terminalProjection }),
      ...(suffix.attributivePayload === undefined ? {} : { attributivePayload: suffix.attributivePayload })
    });
  }
  return boundaries.sort((left, right) => right.end - left.end);
}

function assemblerResumablePostPredicateSuffixStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  suffixStart: number,
  lookups: LookupTables
): { readonly terminalProjection?: "attributive"; readonly attributivePayload?: AttributiveBoundaryPayload } | null {
  const suffix = tokens[suffixStart];
  if (suffix === undefined || isClausePunctuationToken(suffix)) {
    return null;
  }
  if (isPostPredicateExampleParticle(suffix)) {
    return {};
  }
  if (isPredicateScopeCarrierSuffixStart(tokens, suffixStart)) {
    return { terminalProjection: "attributive" };
  }
  if (isPlainNominalizerParticleFrameEnd(tokens, suffixStart, lookups)) {
    return { terminalProjection: "attributive" };
  }
  const attributivePayload = structuralAttributiveAssemblerSuffixPayload(tokens, start, suffixStart, lookups);
  if (attributivePayload !== null) {
    return {
      terminalProjection: "attributive",
      attributivePayload
    };
  }
  return null;
}

function isPostPredicateExampleParticle(token: RuntimeHaruToken): boolean {
  return tokenMatchesConnectiveKind(token, "exemplification");
}

function assemblerResumableSuffixAuditReason(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  suffixStart: number,
  lookups: LookupTables
): string {
  return isPredicateScopeCarrierSuffixStart(tokens, suffixStart)
    ? "tail prefix preserved; assembler-resumable scope carrier suffix left for scope carrier dispatch"
    : isStructuralAttributiveAssemblerSuffixStart(tokens, start, suffixStart, lookups)
      ? "tail prefix preserved; structural attributive head suffix left for assembler"
      : "tail prefix preserved; assembler-resumable functional suffix left for assembler";
}

function isStructuralAttributiveAssemblerSuffixStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  suffixStart: number,
  lookups: LookupTables
): boolean {
  return structuralAttributiveAssemblerSuffixPayload(tokens, start, suffixStart, lookups) !== null;
}

function structuralAttributiveAssemblerSuffixPayload(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  suffixStart: number,
  lookups: LookupTables
): AttributiveBoundaryPayload | null {
  if (suffixStart <= start) {
    return null;
  }
  if (
    !isStructuralAttributivePrefixEnd(tokens[suffixStart - 1]) &&
    !isBareQuoteAttributiveCarrierBoundary(tokens, suffixStart - 1, suffixStart, lookups) &&
    !isRecentPastBakariAdnominalAttributivePrefixEnd(tokens, start, suffixStart - 1) &&
    !isEquivalenceDouzenAdnominalAttributivePrefixEnd(tokens, start, suffixStart - 1) &&
    !isDeclaredProjectionCarrierAdnominalPrefixEnd(tokens, start, suffixStart - 1)
  ) {
    return null;
  }
  return classifyStructuralAttributiveBoundaryPayload(tokens, start, suffixStart - 1, suffixStart, lookups);
}

function isRecentPastBakariAdnominalAttributivePrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  if (contentEndIdx < start + 2) {
    return false;
  }
  const no = tokens[contentEndIdx];
  if (
    no === undefined ||
    no.surface !== "の" ||
    (no.pos & POS0) !== 助詞 ||
    !isSecondaryParticle(tokens[contentEndIdx - 1], "ばかり")
  ) {
    return false;
  }
  return isPastAttributiveTailEnd(tokens[contentEndIdx - 2]);
}

function isDeclaredProjectionCarrierAdnominalPrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  const declared = declaredProjectionCarrierTokenBranchEndingAt(tokens, contentEndIdx);
  return declared !== null &&
    declared.branch.terminal === "attributive" &&
    declared.markerStart > start;
}

function isEquivalenceDouzenAdnominalAttributivePrefixEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  contentEndIdx: number
): boolean {
  const minimumLength = isEquivalenceCarrierAdnominalToken(tokens[contentEndIdx]) ? 2 : 3;
  return contentEndIdx >= start + minimumLength &&
    isEquivalenceDouzenAdnominalTailEnd(tokens, contentEndIdx);
}

function isEquivalenceDouzenAdnominalTailEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  if (isEquivalenceCarrierAdnominalToken(tokens[contentEndIdx])) {
    return contentEndIdx >= 2 &&
      isEquivalenceCarrierMoMarker(tokens[contentEndIdx - 1]) &&
      isEquivalenceCarrierHostTailEnd(tokens[contentEndIdx - 2]);
  }
  const no = tokens[contentEndIdx];
  const carrier = tokens[contentEndIdx - 1];
  if (
    no === undefined ||
    carrier === undefined ||
    contentEndIdx < 3 ||
    no.surface !== "の" ||
    (no.pos & POS0) !== 助詞 ||
    !isEquivalenceCarrierPredicativeNoun(carrier) ||
    !isEquivalenceCarrierMoMarker(tokens[contentEndIdx - 2])
  ) {
    return false;
  }
  return isEquivalenceCarrierHostTailEnd(tokens[contentEndIdx - 3]);
}

function isEquivalenceCarrierMoMarker(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && token.surface === "も" && (token.pos & POS01) === 助詞_係助詞;
}

function isEquivalenceCarrierHostTailEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (isPastAttributiveTailEnd(token)) {
    return true;
  }
  const pos0 = token.pos & POS0;
  return (pos0 === 助動詞0 || pos0in(pos0, PREDICATE_BITS)) &&
    isTerminalOrAttributiveInflection(token.pos);
}

function isStructuralAttributivePrefixEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  const form5A = token.pos & POS5A;
  if (pos0in(pos0, INFLECTABLE_BITS)) {
    return form5A === 連体形_ || form5A === 終止形_;
  }
  if (pos0 === 助動詞0) {
    return form5A === 連体形_ || form5A === 終止形_;
  }
  return false;
}

interface SourceBearingConnectivePrefixBoundary {
  readonly end: number;
  readonly boundary: ClauseBoundary;
}

function isPartialSourceBearingConnective(match: CompositeConnectiveMatch): boolean {
  return connectiveSurfaceAllowsPartialPrefix(match.connective, match.surface);
}

function partialSingleTokenConnectiveAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number
): ConnectiveKind | null {
  const { tokens } = cursor;
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  const connective = lookupConnectiveBySurface(token.surface);
  if (
    connective === undefined ||
    tokenIsInsideLongerTailConnective(cursor, index) ||
    !connectiveSurfaceAllowsPartialPrefix(connective, token.surface) ||
    !tokenMatchesConnectiveKind(token, connective)
  ) {
    return null;
  }
  return connective;
}

function tameConnectivePrefixBoundaryAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerStart: number,
  scanEnd: number,
  lookups: LookupTables
): SourceBearingConnectivePrefixBoundary | null {
  const { tokens } = cursor;
  const match = matchTameConnectiveAt(tokens, markerStart, { requireEnd: false, lookups });
  if (
    match === null ||
    tokenIsInsideLongerTailConnective(cursor, markerStart) ||
    !connectiveSurfaceAllowsPartialPrefix(match.connective, match.surface) ||
    !sourceBearingConnectiveCanAttachToPrefix(tokens, markerStart, match.connective, lookups)
  ) {
    return null;
  }
  const end = markerStart + match.consumed - 1;
  if (end >= scanEnd) {
    return null;
  }
  return {
    end,
    boundary: {
      kind: "合成接続",
      connectiveKind: match.connective,
      surface: match.surface,
      tokenIdx: end,
      tokenSpan: { start: markerStart, end }
    }
  };
}

function tokenIsInsideLongerTailConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number
): boolean {
  const { tokens } = cursor;
  const previousStart = Math.max(0, index - 4);
  for (let start = previousStart; start < index; start += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false });
    if (match !== null && start + match.consumed > index) {
      return true;
    }
  }
  const token = tokens[index];
  const previous = tokens[index - 1];
  if (token?.surface === "から" && previous !== undefined && isTeConnectiveToken(previous)) {
    return true;
  }
  if (isKamoShirenaiModalStartAtToken(tokens, index)) {
    return true;
  }
  if (isKaNoLikenessCompositeStartAt(tokens, index)) {
    return true;
  }
  return false;
}

function isKaNoLikenessCompositeStartAt(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const ka = tokens[index];
  const no = tokens[index + 1];
  const likeness = tokens[index + 2];
  const fusedNoLikeness = no?.surface;
  return ka?.surface === "か" &&
    (
      (
        no?.surface === "の" &&
        (likeness?.surface === "よう" || likeness?.surface === "みたい")
      ) ||
      fusedNoLikeness === "のように" ||
      fusedNoLikeness === "のような" ||
      fusedNoLikeness === "のみたいに" ||
      fusedNoLikeness === "のみたいな"
    );
}

interface CompositeConnectiveBoundaryClassification {
  readonly connectiveKind: ConnectiveKind;
  readonly adversativeReadingAvailable?: true;
}

function compositeConnectiveBoundaryKind(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerStart: number,
  match: CompositeConnectiveMatch,
  lookups: LookupTables,
  reachEnd: number | null = null
): CompositeConnectiveBoundaryClassification | null {
  if (match.surface !== "のに") {
    return { connectiveKind: match.connective };
  }
  const scoped = cursor.fork(markerStart, cursor.tokens.length, markerStart);
  if (looksLikePurposeEvaluationNoNi(scoped, lookups, { clause: reachEnd === null ? null : { start: markerStart, end: reachEnd } })) {
    return {
      connectiveKind: "purpose_evaluation_nominalizer",
      ...(noNiBindingParticleBlocksAdversative(cursor.tokens, markerStart)
        ? {}
        : { adversativeReadingAvailable: true })
    };
  }
  if (
    match.connective === "adversative" &&
    matchNoNiConcessiveConnectiveStart(scoped, lookups) === null
  ) {
    return null;
  }
  return { connectiveKind: match.connective };
}

function pushSourceBearingConnectivePrefixBoundary(
  boundaries: SourceBearingConnectivePrefixBoundary[],
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  end: number,
  boundary: ClauseBoundary
): void {
  boundaries.push({ end, boundary });
  const sfpEnd = connectiveFinalSfpPrefixEnd(cursor, end + 1, scanEnd);
  if (sfpEnd !== null) {
    boundaries.push({
      end: sfpEnd,
      boundary: { kind: "terminal" }
    });
  }
}

function connectiveFinalSfpPrefixEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  sfpStart: number,
  scanEnd: number
): number | null {
  if (sfpStart > scanEnd) {
    return null;
  }
  const sfpCursor = cursor.fork(sfpStart, scanEnd + 1, sfpStart);
  detectSfp(sfpCursor, 動詞, true);
  const consumed = sfpCursor.consumed;
  if (consumed <= 0) {
    return null;
  }
  const sfpEnd = sfpStart + consumed - 1;
  return sfpEnd < scanEnd ? sfpEnd : null;
}

function sourceBearingConnectivePrefixBoundaries(
  scanCursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  lookups: LookupTables
): readonly SourceBearingConnectivePrefixBoundary[] {
  const { tokens } = scanCursor;
  const boundaries: SourceBearingConnectivePrefixBoundary[] = [];
  for (let markerStart = start + 1; markerStart < scanEnd; markerStart += 1) {
    const quoteRelation = quoteStructuralRelationAt(scanCursor.fork(markerStart, tokens.length, markerStart), lookups);
    if (quoteRelation !== undefined) {
      const quoteBoundary = quoteClauseBoundaryFromRelation(tokens, quoteRelation, lookups, {
        lowerBoundInclusive: start
      });
      const quoteMarkerSpan = quoteConsumedMarkerSpanFromRelation(tokens, quoteRelation, lookups, {
        lowerBoundInclusive: start
      });
      if (
        quoteBoundary !== null &&
        quoteMarkerSpan !== null &&
        quoteMarkerSpan.start >= start + 1 &&
        quoteMarkerSpan.start <= markerStart &&
        quoteMarkerSpan.endExclusive - 1 < scanEnd
      ) {
        pushSourceBearingConnectivePrefixBoundary(
          boundaries,
          scanCursor,
          scanEnd,
          quoteMarkerSpan.endExclusive - 1,
          quoteBoundary
        );
      }
    }
    const markerClause = activeProtoLayout()?.clauseContaining(markerStart) ?? null;
    const markerReachEnd = activeProtoScopedScanEnd(tokens, markerStart, "evidence_window");
    const match = matchCompositeConnectiveAt(
      scanCursor.fork(markerStart, tokens.length, markerStart),
      { requireEnd: false, clause: markerClause }
    );
    if (match === null || !isPartialSourceBearingConnective(match)) {
      const tamePrefix = isTameHead(tokens[markerStart])
        ? tameConnectivePrefixBoundaryAt(scanCursor, markerStart, scanEnd, lookups)
        : null;
      if (tamePrefix !== null) {
        pushSourceBearingConnectivePrefixBoundary(boundaries, scanCursor, scanEnd, tamePrefix.end, tamePrefix.boundary);
      }
      const singleTokenConnective = tamePrefix !== null
        ? null
        : partialSingleTokenConnectiveAt(scanCursor, markerStart);
      if (
        singleTokenConnective !== null &&
        sourceBearingConnectiveCanAttachToPrefix(tokens, markerStart, singleTokenConnective, lookups)
      ) {
        pushSourceBearingConnectivePrefixBoundary(
          boundaries,
          scanCursor,
          scanEnd,
          markerStart,
          {
            kind: "接続助詞",
            connectiveKind: singleTokenConnective,
            surface: tokens[markerStart]?.surface ?? "",
            tokenIdx: markerStart,
            tokenSpan: { start: markerStart, end: markerStart }
          }
        );
      }
      for (const relationMatch of relationConnectiveSpansAt(scanCursor.fork(markerStart, tokens.length, markerStart))) {
        const connective = relationMatch.connectiveKind as ConnectiveKind;
        if (
          relationMatch.markerPolicy !== "discontinuous" ||
          !connectiveSurfaceAllowsPartialPrefix(connective, relationMatch.surface) ||
          !sourceBearingConnectiveCanAttachToPrefix(tokens, markerStart, connective, lookups)
        ) {
          continue;
        }
        const end = relationMatch.endExclusive - 1;
        if (end <= start || end >= scanEnd) {
          continue;
        }
        const closure = relationDiscontinuousClosureSpanAfter(scanCursor.fork(end + 1, scanEnd + 1, end + 1), relationMatch);
        if (closure === null || closure.start !== end + 1 || closure.endExclusive !== scanEnd + 1) {
          continue;
        }
        pushSourceBearingConnectivePrefixBoundary(
          boundaries,
          scanCursor,
          scanEnd,
          end,
          {
            kind: "合成接続",
            connectiveKind: connective,
            surface: relationMatch.surface,
            tokenIdx: end,
            tokenSpan: { start: markerStart, end }
          }
        );
      }
      continue;
    }
    const end = markerStart + match.consumed - 1;
    if (end <= start || end >= scanEnd) {
      continue;
    }
    if (isSuppressedCompositeBoundary(scanCursor, match, end + 1)) {
      continue;
    }
    const classification = compositeConnectiveBoundaryKind(scanCursor, markerStart, match, lookups, markerReachEnd);
    if (classification === null) {
      continue;
    }
    const boundaryConnective = classification.connectiveKind;
    if (!sourceBearingConnectiveCanAttachToPrefix(tokens, markerStart, boundaryConnective, lookups)) {
      continue;
    }
    pushSourceBearingConnectivePrefixBoundary(
      boundaries,
      scanCursor,
      scanEnd,
      end,
      {
        kind: "合成接続",
        connectiveKind: boundaryConnective,
        surface: match.surface,
        tokenIdx: end,
        tokenSpan: { start: markerStart, end },
        ...(classification.adversativeReadingAvailable === undefined
          ? {}
          : { adversativeReadingAvailable: classification.adversativeReadingAvailable })
      }
    );
  }
  return boundaries.sort((left, right) =>
    right.end - left.end ||
    (
      left.boundary.kind === "terminal" || right.boundary.kind === "terminal"
        ? 0
        : left.boundary.tokenSpan.start - right.boundary.tokenSpan.start
    )
  );
}

function sourceBearingConnectiveCanAttachToPrefix(
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  connective: ConnectiveKind,
  _lookups: LookupTables
): boolean {
  if (connective !== "tame_reason" && connective !== "tame_purpose") {
    return true;
  }
  const prevIdx = previousNonSpaceIndex(tokens, markerStart);
  return prevIdx === null ||
    nominalLinkMarkerRelationAt(tokens, prevIdx, { consumers: ["tail_multi_clause"] }) === null;
}

function weakAttachmentSourceBearingBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  lookups: LookupTables
): SourceBearingConnectivePrefixBoundary | null {
  const { tokens } = cursor;
  if (inferExternalNominalizerBoundaryAtScanEnd(cursor, scanEnd, lookups) !== null) {
    return null;
  }
  const nextContent = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
  if (hasSupportedClauseContinuation(tokens, nextContent, tokens.length, lookups)) {
    return null;
  }
  for (let markerStart = start + 1; markerStart <= scanEnd; markerStart += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(markerStart, tokens.length, markerStart), { requireEnd: false });
    if (match === null || !connectiveSurfaceRequiresAttachmentEvidence(match.connective, match.surface)) {
      continue;
    }
    const end = markerStart + match.consumed - 1;
    if (end !== scanEnd) {
      continue;
    }
    return {
      end,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: end,
        tokenSpan: { start: markerStart, end }
      }
    };
  }
  return null;
}

function tailPartialSuffixCanStayInAssembler(
  cursor: TokenCursor<RuntimeHaruToken>,
  suffixStart: number,
  scanEnd: number,
  boundary: ClauseBoundary,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  if (suffixStart > scanEnd) {
    return false;
  }
  if (hasSupportedClauseContinuation(tokens, suffixStart, scanEnd + 1, lookups)) {
    return true;
  }
  if (boundary.kind === "terminal") {
    return false;
  }
  if (questionContentSuffixHasBoundaryRelation(tokens, suffixStart, scanEnd, boundary)) {
    return true;
  }
  if (suffixMatchesDiscontinuousStructuralRelationClosure(cursor, suffixStart, scanEnd, boundary)) {
    return true;
  }
  if (suffixMatchesNominalFrameTailSurface(tokens, suffixStart, scanEnd)) {
    return true;
  }
  return false;
}

function suffixMatchesDiscontinuousStructuralRelationClosure(
  cursor: TokenCursor<RuntimeHaruToken>,
  suffixStart: number,
  scanEnd: number,
  boundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>
): boolean {
  const tokenSpan = boundary.tokenSpan;
  const suffixCursor = cursor.fork(tokenSpan.start, scanEnd + 1, tokenSpan.start);
  const matches = relationConnectiveSpansAt(suffixCursor);
  for (const match of matches) {
    if (
      match.markerPolicy !== "discontinuous" ||
      match.connectiveKind !== boundary.connectiveKind ||
      match.endExclusive !== tokenSpan.end + 1
    ) {
      continue;
    }
    const closure = relationDiscontinuousClosureSpanAfter(suffixCursor.fork(suffixStart, scanEnd + 1, suffixStart), match);
    if (closure !== null && closure.start === suffixStart && closure.endExclusive === scanEnd + 1) {
      return true;
    }
  }
  return false;
}

function questionContentSuffixHasBoundaryRelation(
  tokens: readonly RuntimeHaruToken[],
  suffixStart: number,
  scanEnd: number,
  boundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>
): boolean {
  if (
    boundary.connectiveKind !== "question_content" &&
    boundary.connectiveKind !== "question_content_alternative" &&
    boundary.connectiveKind !== "question_quotative"
  ) {
    return false;
  }
  const relation = questionContentContinuationAfterKaRelationAt(tokens, boundary.tokenIdx, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: scanEnd + 1
  });
  return relation !== null &&
    relation.span.start === boundary.tokenIdx &&
    relation.span.endExclusive === scanEnd + 1 &&
    relation.continuationIdx === suffixStart;
}

function conditionalBaNominalMainClauseBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  scanEnd: number
): ClauseBoundary | null {
  const marker = tokens[end];
  if (marker?.surface !== "ば") {
    return null;
  }
  const relation = conditionalTailConnectiveRelationForToken(marker, end, {
    consumers: ["tail_multi_clause"]
  });
  if (relation === null) {
    return null;
  }
  const suffixStart = nextNonSpaceIndex(tokens, relation.span.endExclusive, scanEnd + 1);
  if (suffixStart === null || suffixStart > scanEnd || !isNominalLikeAttributiveHead(tokens[suffixStart])) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: "conditional",
    surface: relation.surface,
    tokenIdx: end,
    tokenSpan: { start: relation.span.start, end: relation.span.endExclusive - 1 }
  };
}

function suffixMatchesNominalFrameTailSurface(
  tokens: readonly RuntimeHaruToken[],
  suffixStart: number,
  scanEnd: number
): boolean {
  const suffixSurface = tokens
    .slice(suffixStart, scanEnd + 1)
    .map((token) => token.surface)
    .join("");
  if (suffixSurface.length === 0) {
    return false;
  }
  return nominalFrameTailSurfaceSpecs().some((spec) => spec.surface === suffixSurface);
}

export async function tryParseTailHeadProfileChunk(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailHeadProfileChunkResult> {
  const tailChunk = await tryParseTailChunk(input, start, options);
  if (!tailChunk.ok) {
    if (tailParserShouldYieldToAssemblerQuoteHost(input.cursor, start, input.numeric, input.lookups, null)) {
      return { ok: false, reason: "assembler-owned request quote host" };
    }
    return tailChunk;
  }
  return await profileParsedTailHeadChunk(input, start, tailChunk);
}

export async function profileParsedTailHeadChunk(
  input: IntegrationInput,
  start: number,
  tailChunk: Extract<TailChunkResult, { readonly ok: true }>
): Promise<TailHeadProfileChunkResult> {
  if (bareDemoCandidatePreemptsNegativeScopeTail(tailChunk.root, input.cursor.tokens)) {
    return {
      ok: false,
      reason: "bare demo concession cannot preempt a negative scope bridge tail"
    };
  }
  if (tailParserShouldYieldToAssemblerQuoteHost(input.cursor, start, input.numeric, input.lookups, tailChunk)) {
    return {
      ok: false,
      reason: "assembler-owned request quote host",
      ...(tailChunk.candidateObservation === undefined ? {} : { observation: tailChunk.candidateObservation })
    };
  }
  const selection = headProfileDispatchSelection(await PREDICATE_TAIL_HEAD_ENGINE.arbitrate({ tailChunk }));
  if (selection === null) {
    return {
      ok: false,
      reason: "tail-parser head profile not matched",
      ...(tailChunk.candidateObservation === undefined ? {} : { observation: tailChunk.candidateObservation })
    };
  }
  return {
    ...selection.match.result,
    profile: selection.metadata.dispatchProfile,
    requiredContinuationCapabilityIds: selection.metadata.requiredContinuationCapabilityIds
  };
}

export async function tryParseNominalHostLikenessContinuation(
  input: IntegrationInput,
  start: number
): Promise<TailNominalHostLikenessContinuationResult> {
  const tailChunk = await tryParseTailChunk(input, start);
  if (!tailChunk.ok) {
    return tailChunk;
  }
  if (tailChunk.root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "nominal-host likeness continuation requires auxLayer tail" };
  }
  const stem = tailChunk.root.tail.stem;
  const firstOp = tailChunk.root.tail.ops[0];
  const markerStart = firstOp?.source.tokenIndices[0];
  if (
    !isNominalHostLikenessStemAt(stem, start) ||
    keijoujiAttributiveMarkerAt(input.tokens, start + 1) === "no" ||
    fusedNoYouNiKeijoujiAttributiveAt(input.tokens, start + 1) ||
    firstOp?.kind !== "modal" ||
    firstOp.modal !== "youda" ||
    markerStart === undefined ||
    markerStart <= start
  ) {
    return { ok: false, reason: "tail chunk is not nominal-host likeness continuation" };
  }
  const sourceEnd = start + tailChunk.consumed;
  const finalSourceIdx = sourceEnd - 1;
  const nominalizedAttributive =
    firstOp.terminal === "attributive_na" &&
    predicateNominalizerRelationForToken(input.tokens[finalSourceIdx], finalSourceIdx, {
      requirement: "strict_particle",
      consumers: ["nominal_head_parser"]
    }) !== null;
  const predicateHost = markerStart > start
    ? await tryParseTailPredicateProjectionHost(input, start, markerStart - 1, {
      projection: "attributive_nominalizer"
    })
    : null;
  return {
    ok: true,
    ops: tailChunk.root.tail.ops,
    ...(predicateHost?.ok === true && predicateProjectionHostHasPredicateRealization(predicateHost.host)
      ? { predicateHost: predicateHost.host }
      : {}),
    ...(nominalizedAttributive ? { nominalizedAttributive: true as const } : {}),
    outgoingBoundary: tailChunk.outgoingBoundary,
    predicateTokenIdx: tailChunk.predicateTokenIdx,
    source: {
      start: markerStart,
      end: sourceEnd,
      tokens: input.tokens.slice(markerStart, sourceEnd)
    },
    warnings: []
  };
}

function predicateProjectionHostHasPredicateRealization(host: TailPredicateProjectionHost): boolean {
  const layer = firstAuxLayer(host.root.tail);
  return layer !== null && (
    stemSupportsProjectionCategory(layer.stem, "verbal_predicate") ||
    stemSupportsProjectionCategory(layer.stem, "adjectival_predicate")
  );
}

function isNominalHostLikenessStemAt(stem: StemNode, start: number): boolean {
  return (
    stemSupportsProjectionCategory(stem, "nominal") &&
    stem.source.tokenIndices[0] === start
  );
}

export function buildTailChainRenderPlan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly index: number;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly root: TailRoot;
  readonly lookups: LookupTables;
  readonly consumed?: number;
  readonly commitmentGrammar?: ContextGrammar;
  readonly entry?: MorphemeEntry | null;
}): RenderPlan {
  const consumed = options.consumed ?? options.tailChunk.consumed;
  const headProfile = tailChainHeadProfile(options.tailChunk);
  const hostProjection = numericHostProjectionForRoot(options.root);
  return {
    kind: "headTailChain",
    clauseRole: {
      clauseIndex: 0,
      tokenSpan: { start: options.index, end: options.index + consumed - 1 },
      contentSpan: { start: options.index, end: options.index + consumed - 1 },
      predicateTokenIdx: options.tailChunk.predicateTokenIdx,
      outgoingBoundary: options.tailChunk.outgoingBoundary
    },
    ...(headProfile === undefined ? {} : { headProfile }),
    realization: {
      kind: "predicate",
      ...(options.entry === undefined ? {} : { entry: options.entry }),
      root: options.root,
      ...(hostProjection === null ? {} : { hostProjection }),
      sourceTokens: options.tokens,
      ...(options.commitmentGrammar === undefined ? {} : { commitmentGrammar: options.commitmentGrammar }),
      ...(options.tailChunk.partial === undefined ? {} : { partial: options.tailChunk.partial }),
      warnings: tailChunkWarningsForRenderPlan({
        tokens: options.tokens,
        start: options.index,
        consumed,
        root: options.root,
        tailChunk: options.tailChunk,
        lookups: options.lookups
      })
    }
  };
}

function numericHostProjectionForRoot(root: TailRoot): PredicateHeadTailChainHostProjection | null {
  const stem = firstAuxLayer(root.tail)?.stem;
  if (stem === undefined) {
    return null;
  }
  if (stem.derivationalBase !== undefined) {
    return { kind: "derivational_suffix", base: stem.derivationalBase };
  }
  return stem.kind === "noun" && stem.numericBase !== undefined
    ? { kind: "numeral", base: stem.numericBase }
    : null;
}

function tailChunkWarningsForRenderPlan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly root: TailRoot;
  readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly lookups: LookupTables;
}): readonly Warning[] {
  const warnings: Warning[] = [];
  const end = options.start + options.consumed - 1;
  warnings.push(
    ...standaloneRenyouFragmentWarningsForParsedChunk(
      options.tokens,
      options.start,
      end,
      options.root,
      options.tailChunk.outgoingBoundary,
      options.lookups
    ),
    ...missingConditionalMarkerWarningsForRoot(options.root)
  );
  const partial = options.tailChunk.partial;
  if (partial === undefined) {
    return warnings;
  }
  if (partial.decision === "unresolved_suffix_warning") {
    const suffixStart = partial.unresolvedSuffixSpan.start;
    const suffixEnd = partial.unresolvedSuffixSpan.end - 1;
    warnings.push(partialTailSuffixUnresolvedWarning(options.tokens, suffixStart, suffixEnd));
  }
  if (partial.decision === "weak_attachment_warning") {
    const span = partial.attachmentSpan;
    warnings.push({
      type: "tail_boundary_attachment_weak",
      severity: "warning",
      opKind: "tail_boundary_attachment",
      ...(span === undefined ? {} : { span: { start: span.start, end: span.end } }),
      message: `source-bearing tail boundary preserved without following attachment evidence: ${span?.surface ?? "terminal"}`
    });
  }
  return warnings;
}

export function tailChainHeadProfile(
  tailChunk: Extract<TailChunkResult, { readonly ok: true }>
): HeadProfileDescriptor | undefined {
  return "profile" in tailChunk
    ? (tailChunk as Extract<TailChunkResult, { readonly ok: true }> & { readonly profile: HeadProfileDescriptor }).profile
    : undefined;
}

export function tailParserSemanticReadinessBlocker(options: {
  readonly tailChunk: ParsedTailChunk;
  readonly root: TailRoot;
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
  readonly headConsumed?: number;
  readonly representedBoundaryRelations?: readonly BoundaryReadinessRelation["kind"][];
  readonly lookups: LookupTables;
}): string | null {
  const contextBlocker = tailChainContextReadinessBlocker(
    options.cursor,
    options.start,
    options.tailChunk,
    options.root,
    options.representedBoundaryRelations ?? [],
    options.lookups
  );
  if (contextBlocker !== null) {
    return contextBlocker;
  }
  const externalRewriteBlocker = tailParserExternalRewriteReadinessBlocker(
    options.cursor,
    options.start,
    options.root,
    options.lookups
  );
  if (externalRewriteBlocker !== null) {
    return externalRewriteBlocker;
  }
  const rootBlocker = tailRootIntrinsicAspectReadinessBlocker(options.root);
  if (rootBlocker !== null) {
    return rootBlocker;
  }
  if (options.headConsumed !== undefined && options.headConsumed < options.tailChunk.consumed) {
    return null;
  }
  return null;
}

function tailParserExternalRewriteReadinessBlocker(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  root: TailRoot,
  lookups: LookupTables
): string | null {
  const { tokens } = cursor;
  const stemToken = tokens[start];
  if (
    stemToken !== undefined &&
    stemToken.dictionaryForm === "する" &&
    quoteMarkerRelationAt(tokens, start - 1, {
      consumers: ["tail_multi_clause"]
    })?.canonicalSurface === "と" &&
    tailRootHasVoice(root, "passive")
  ) {
    const relation = quoteStructuralRelationAt(cursor.fork(start - 1, tokens.length, start - 1), lookups);
    if (relation?.quote.hostMatch.hostIdx === start && relation.quote.hostMatch.hostForm === "する") {
      return null;
    }
    return isNounToSareruContext(tokens, start)
      ? "Nとされる rewrite not yet represented in TailRoot"
      : "reporting passive quote host not yet represented in TailRoot";
  }
  return null;
}

function tailRootHasVoice(root: TailRoot, voice: "passive" | "potential" | "causative" | "causative_passive" | "honorific"): boolean {
  return tailRootVoiceOps(root).some((op) => op.voice === voice);
}

function tailChainContextReadinessBlocker(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  tailChunk: ParsedTailChunk,
  root: TailRoot,
  representedRelations: readonly BoundaryReadinessRelation["kind"][],
  lookups: LookupTables
): string | null {
  const relation = classifyBoundaryReadinessRelation({
    cursor,
    start,
    consumed: tailChunk.consumed,
    outgoingBoundary: tailChunk.outgoingBoundary,
    lookups
  });
  if (relation !== null && representedRelations.includes(relation.kind)) {
    return null;
  }
  return relation === null ? null : boundaryReadinessBlocker(root, relation);
}

function tailParserShouldYieldToAssemblerQuoteHost(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables,
  parsedChunk: Extract<TailChunkResult, { readonly ok: true }> | null
): boolean {
  const { tokens } = cursor;
  const markerIdx = start - 1;
  if (markerIdx < 0) {
    return false;
  }
  const handoffKind = quoteHostHandoffKindAt(cursor.fork(markerIdx, tokens.length, markerIdx), lookups) ??
    quoteHostHandoffKindForHost(cursor.fork(start, tokens.length, start), lookups);
  if (handoffKind === null) {
    return false;
  }
  if (handoffKind === "question_passive") {
    return false;
  }
  if (parsedChunk !== null && quoteHostOwnsParsedSourceBearingTail(parsedChunk)) {
    return false;
  }
  if (quoteHostCanOwnRepresentableOutgoingBoundary(cursor, start, numeric, lookups)) {
    return false;
  }
  return true;
}

function quoteHostOwnsParsedSourceBearingTail(
  parsedChunk: Extract<TailChunkResult, { readonly ok: true }>
): boolean {
  const boundary = parsedChunk.outgoingBoundary;
  if (boundary.kind !== "terminal") {
    return !quoteHostNonTerminalBoundaryDeferredToOtherOwner(boundary.connectiveKind);
  }
  return quoteHostTailClosesWithNonFiniteTerminal(parsedChunk.root) ||
    tailRootClosesWithOvertNominalizerTerminal(parsedChunk.root) ||
    tailRootClosesWithTeFormConnective(parsedChunk.root) ||
    tailRootCarriesQuoteHostOwnedTerminalStructure(parsedChunk.root);
}

function tailRootClosesWithTeFormConnective(root: TailRoot): boolean {
  const layer = firstAuxLayer(root.tail);
  const finalOp = layer?.ops[layer.ops.length - 1];
  return finalOp?.kind === "connective" &&
    finalOp.connective === "te_form" &&
    finalOp.recovery === undefined;
}

function quoteHostTailClosesWithNonFiniteTerminal(root: TailRoot): boolean {
  return tailRootClosesWithAttributiveTerminal(root) || tailRootHasRenyouChuushiTerminal(root);
}

function quoteHostNonTerminalBoundaryDeferredToOtherOwner(kind: ConnectiveKind): boolean {
  return (
    kind === "question_content" ||
    kind === "question_content_alternative" ||
    kind === "question_quotative"
  );
}

function tailRootTerminatesWithConfirmationMarker(root: TailRoot): boolean {
  const dispatch = probeProductionDispatch(root, {
    intake: { site: "committed_render", partial: false }
  });
  return dispatch.kind === "registry" &&
    dispatch.match.familyId === "predicate_copula_negative_confirm";
}

function tailRootCarriesQuoteHostOwnedTerminalStructure(root: TailRoot): boolean {
  const tail = root.tail;
  if (tail.kind !== "auxLayer") {
    return false;
  }
  if (tailRootTerminatesWithConfirmationMarker(root)) {
    return true;
  }
  return tail.ops.some(quoteHostTerminalOpRequiresTailOwner);
}

function quoteHostTerminalOpRequiresTailOwner(op: AuxOpNode): boolean {
  switch (op.kind) {
    case "connective":
      return op.connective !== "te_form";
    case "modal":
    case "scopeBridge":
    case "aspect":
    case "postverbAuxiliary":
    case "predicateProjectionCarrier":
    case "predicateQuoteCarrier":
    case "predicateSuffix":
    case "idiom":
    case "conjecture":
    case "desire":
      return true;
    case "negation":
    case "tense":
    case "polite":
    case "classicalAuxResidue":
    case "voice":
    case "copula":
    case "adjCopulaBridge":
      return false;
  }
}

function quoteHostCanOwnRepresentableOutgoingBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  const host = tokens[start];
  if (host === undefined) {
    return false;
  }
  const hostForm = host.dictionaryForm;
  const hostIsIu = IU_LEXEME_FORMS.has(hostForm);
  const scanEnd = findTailChunkScanEnd(tokens, start, numeric, lookups);
  if (scanEnd < start) {
    return false;
  }
  for (const boundary of legalTailChunkPartialBoundaries(cursor, start, scanEnd, numeric, lookups).values()) {
    if (boundary.kind !== "terminal" && (hostIsIu || boundaryStartsAtOrBefore(boundary, start + 1))) {
      return true;
    }
  }
  const inferred = inferTailChunkEndBoundary(cursor, start, scanEnd, numeric, lookups);
  return inferred.kind !== "terminal" && (hostIsIu || boundaryStartsAtOrBefore(inferred, start + 1));
}

function boundaryStartsAtOrBefore(boundary: ClauseBoundary, tokenIdx: number): boolean {
  return boundary.kind !== "terminal" &&
    "tokenSpan" in boundary &&
    boundary.tokenSpan.start <= tokenIdx;
}

interface HostBearingExternalNominalizerPredicateFrame {
  readonly hostEnd: number;
  readonly predicateStart: number;
}

async function tryParseHostBearingExternalNominalizerPredicateChunk(
  input: IntegrationInput,
  start: number,
  scanEnd: number
): Promise<TailChunkResult | { readonly ok: false; readonly reason: string } | null> {
  const likenessHost = isNominalLikenessPredicateStart(input.tokens, start);
  const frame = findHostBearingExternalNominalizerPredicateFrame(input.tokens, start, scanEnd);
  if (frame === null) {
    return null;
  }
  if (inferExternalNominalizerBoundaryAtScanEnd(input.cursor, scanEnd, input.lookups) !== null) {
    return null;
  }
  const outgoingBoundary = inferTailChunkEndBoundary(input.cursor, start, scanEnd, input.numeric, input.lookups);
  const attributivePredicateEnd = findHostBearingExternalNominalizerAttributivePredicateEnd(
    input.tokens,
    frame,
    scanEnd,
    input.lookups
  );
  const materialized = await materializeTailBoundaryStation(input, {
    id: "external_nominalizer",
    start,
    scanEnd,
    frame,
    likenessHost,
    outgoingBoundary,
    attributivePredicateEnd,
  });
  if (materialized.kind === "decline") return null;
  if (materialized.kind === "candidate") return materialized.chunk;
  return {
    ok: false,
    reason: materialized.kind === "exclusive_failure" || materialized.kind === "rejection"
      ? materialized.reason
      : `production family '${materialized.familyId}' requested ${materialized.policy}`
  };
}

function buildHostBearingPrefixResult(
  input: IntegrationInput,
  start: number,
  end: number,
  parsed: { readonly ok: true; readonly root: ParsedTailRoot; readonly info: ClauseParseInfo<ParsedTailRoot> },
  hostProjection: { readonly nominalizedHost: string; readonly warnings: readonly Warning[] },
  frame: HostBearingExternalNominalizerPredicateFrame,
  boundary: ClauseBoundary,
  root: TailRoot
): TailChunkResult | { readonly ok: false; readonly reason: string } {
  const prefixedRoot = attachHostBearingPrefixToTailRoot(
    root,
    `${hostProjection.nominalizedHost}에 `,
    {
      tokens: input.tokens.slice(start, frame.predicateStart),
      tokenIndices: Array.from(
        { length: frame.predicateStart - start },
        (_, idx) => start + idx
      )
    },
    frame.hostEnd - start + 1
  );
  if (prefixedRoot === null) {
    return { ok: false, reason: "external nominalizer predicate root is not an aux layer" };
  }
  if (tailRootHasMidChainConnective(prefixedRoot)) {
    return { ok: false, reason: "external nominalizer predicate requires a chain-final connective" };
  }
  return {
    ok: true,
    consumed: end - start + 1,
    root: prefixedRoot,
    predicateTokenIdx: frame.predicateStart + parsed.info.localPredicateIdx,
    outgoingBoundary: boundary
  };
}

function hasHostBearingExternalNominalizerAttributivePostverbTail(
  tokens: readonly RuntimeHaruToken[],
  frame: HostBearingExternalNominalizerPredicateFrame,
  predicateEnd: number,
  lookups: LookupTables
): boolean {
  for (let markerIdx = frame.predicateStart + 1; markerIdx < predicateEnd; markerIdx += 1) {
    const relation = teDeContinuationRelationAt(tokens, markerIdx, {
      requirement: "layout_nonspace_tail",
      consumers: ["tail_multi_clause"],
      lookups
    });
    if (relation !== null && relation.span.endExclusive <= predicateEnd + 1) {
      return true;
    }
  }
  return false;
}

function findHostBearingExternalNominalizerAttributivePredicateEnd(
  tokens: readonly RuntimeHaruToken[],
  frame: HostBearingExternalNominalizerPredicateFrame,
  scanEnd: number,
  lookups: LookupTables
): number | null {
  for (let splitAt = frame.predicateStart + 1; splitAt <= scanEnd; splitAt += 1) {
    if (!isStructuralAttributivePrefixEnd(tokens[splitAt - 1])) {
      continue;
    }
    const head = tokens[splitAt];
    if (!isNominalLikeAttributiveHead(head)) {
      continue;
    }
    if (!canExternalContentOwnAttributiveHead(tokens, frame.predicateStart, splitAt - 1, splitAt, classifyAttributiveHeadKind(head), lookups)) {
      continue;
    }
    return splitAt - 1;
  }
  return null;
}

function findHostBearingExternalNominalizerPredicateFrame(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  scanEnd: number
): HostBearingExternalNominalizerPredicateFrame | null {
  for (let idx = start + 1; idx + 2 <= scanEnd; idx += 1) {
    const relation = externalNominalizerContinuationRelationAt(tokens, idx, {
      requireEnd: false,
      consumers: ["tail_multi_clause"]
    });
    const hasPredicateBridge = relation === null &&
      hasExternalNominalizerPredicateBridge(tokens, idx, scanEnd);
    if (relation?.connectiveKind !== "external_nominalizer_comparison" && !hasPredicateBridge) {
      continue;
    }
    if (!isExternalNominalizerPredicateHead(tokens, idx + 2, scanEnd)) {
      continue;
    }
    return {
      hostEnd: idx - 1,
      predicateStart: idx + 2
    };
  }
  return null;
}

function hasExternalNominalizerPredicateBridge(
  tokens: readonly RuntimeHaruToken[],
  nominalizerIdx: number,
  scanEnd: number
): boolean {
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  });
  const niIdx = nominalizerIdx + 1;
  const ni = tokens[niIdx];
  return nominalizer?.nominalizerKind === "no" &&
    niIdx < scanEnd &&
    caseParticleMarkerRelationForToken(ni, niIdx, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    isExternalNominalizerPredicateHead(tokens, nominalizerIdx + 2, scanEnd);
}

function isExternalNominalizerPredicateHead(
  tokens: readonly RuntimeHaruToken[],
  predicateStart: number,
  scanEnd: number
): boolean {
  const predicate = tokens[predicateStart];
  if (
    predicate === undefined ||
    (predicate.pos & POS0) !== 動詞 ||
    (predicate.dictionaryForm || predicate.surface) !== "対する"
  ) {
    return false;
  }
  const next = tokens[predicateStart + 1];
  if (predicate.surface === "対し") {
    const hasTe =
      next !== undefined &&
      ((isTeConnectiveToken(next) && next.surface.charAt(0) === "て") || isTeFocusAspectBoundary(next));
    const continuationStart = hasTe ? predicateStart + 2 : predicateStart + 1;
    return continuationStart <= scanEnd && isExternalNominalizerPredicateContinuation(tokens, continuationStart);
  }
  return true;
}

async function renderExternalNominalizerHostProjection(
  input: IntegrationInput,
  start: number,
  hostEnd: number
): Promise<
  | {
    readonly ok: true;
    readonly nominalizedHost: string;
    readonly warnings: readonly Warning[];
  }
  | { readonly ok: false; readonly reason: string }
> {
  const parsed = await parseTailChunkOnly(input, start, hostEnd, { kind: "terminal" });
  if (!parsed.ok) {
    return parsed;
  }
  const root: TailRoot = {
    ...parsed.root,
    quoteBinding: cachedQuoteBindingForContentRoot(
      input.tokens,
      parsed.predicateTokenIdx,
      hostEnd,
    ),
  };
  const committedHost = commitEagerExternalNominalizerHostDefault(root);
  if (!committedHost.ok) {
    return committedHost;
  }
  const attrInfo: ClauseParseInfo = {
    ...parsed.info,
    root: markTailRootAttributiveTerminal(committedHost.root),
    leadingSurface: "",
    trailingSurface: ""
  };
  const rendered = renderParsedChunk(input, start, hostEnd, attrInfo, { kind: "terminal" });
  if (!rendered.ok) {
    return rendered;
  }
  return {
    ok: true,
    nominalizedHost: `${rendered.text} 것`,
    warnings: [...committedHost.warnings, ...rendered.warnings]
  };
}

export function commitEagerExternalNominalizerHostDefault(root: TailRoot): {
  readonly ok: true;
  readonly root: TailRoot;
  readonly warnings: readonly Warning[];
} | {
  readonly ok: false;
  readonly reason: string;
} {
  const layer = firstAuxLayer(root.tail);
  if (layer?.stem.kind !== "candidateSet" || layer.stem.candidates.length === 0) {
    return { ok: true, root, warnings: [] };
  }
  const headHypothesis = root.headHypothesis ?? layer.stem.headHypothesis;
  const decision = resolveTailEvidenceDecision({
    stem: layer.stem,
    ops: layer.ops,
    terminal: layer.terminal,
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
    ...(headHypothesis === undefined ? {} : { headHypothesis })
  });
  if (decision === null) {
    return { ok: true, root, warnings: [] };
  }
  if (decision.candidateOpenSet.length === 0) {
    return { ok: false, reason: "external nominalizer host has no candidate admitted by its Japanese head contract" };
  }
  const committedSense = decision.candidateOpenSet[0]!;
  const committedSenseRealization = candidateRealizationFromDecisionChoices(decision, committedSense);
  const committedRoot: TailRoot = {
    ...root,
    headEvidenceDecision: decision,
    tail: commitCandidateSetStemInTailNode(root.tail, committedSenseRealization, committedSense)
  };
  if (decision.candidateOpenSet.length <= 1) {
    return { ok: true, root: committedRoot, warnings: [] };
  }
  const winner = layer.stem.candidates.find((candidate) => {
    return stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense);
  }) ?? layer.stem.candidates[0]!;
  return {
    ok: true,
    root: committedRoot,
    warnings: [{
      type: "ambiguity_default",
      severity: "warning",
      opKind: "eager_host_render_default",
      candidates: decision.candidateOpenSet.map((identity) => JSON.stringify(identity)),
      winner: winner.lemma,
      message: "external nominalizer host is rendered before deferred commitment; explicitly selected candidateOpenSet[0]."
    }]
  };
}

function commitCandidateSetStemInTailNode(
  node: TailNode,
  committedSenseRealization: StemCandidateRealization | null,
  committedSense: ReturnType<typeof stemCandidateIdentity>
): TailNode {
  if (node.kind === "connective") {
    return {
      ...node,
      inner: commitCandidateSetStemInTailNode(node.inner, committedSenseRealization, committedSense) as typeof node.inner,
      outer: commitCandidateSetStemInTailNode(node.outer, committedSenseRealization, committedSense)
    };
  }
  if (node.stem.kind !== "candidateSet") {
    return node;
  }
  return {
    ...node,
    stem: {
      ...node.stem,
      committedSense,
      committedSenseRealization
    }
  };
}

function attachHostBearingPrefixToTailRoot(
  root: TailRoot,
  koreanPrefix: string,
  hostSource: OpSource,
  hostSemanticAnchorCount: number
): TailRoot | null {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  return {
    ...root,
    tail: {
      ...root.tail,
      stem: attachHostBearingPrefixToStem(
        root.tail.stem,
        koreanPrefix,
        hostSource,
        hostSemanticAnchorCount
      )
    }
  };
}

function attachHostBearingPrefixToStem(
  stem: StemNode,
  koreanPrefix: string,
  hostSource: OpSource,
  hostSemanticAnchorCount: number
): StemNode {
  const hostLen = hostSource.tokens.length;
  const source: OpSource = {
    tokens: [...hostSource.tokens, ...stem.source.tokens],
    tokenIndices: [...hostSource.tokenIndices, ...stem.source.tokenIndices]
  };
  const base = {
    ...stem,
    source,
    conjugationAnchor: stem.conjugationAnchor + hostLen,
    semanticAnchors: [
      ...Array.from({ length: hostSemanticAnchorCount }, (_, idx) => idx),
      ...stem.semanticAnchors.map((idx) => idx + hostLen)
    ],
    koreanPrefix: `${koreanPrefix}${stem.koreanPrefix ?? ""}`,
    commitment: stem.commitment ?? "resolved_sense"
  };
  switch (stem.kind) {
    case "verb":
      return base;
    case "adj":
      return base;
    case "noun":
      return base;
    case "adverb":
      return base;
    case "candidateSet":
      return base;
  }
}

function tailChunkRenderFailureReason(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  reason: string
): string {
  if (
    reason.includes("on noun copula") &&
    tokens.slice(start, end + 1).some((token) => token.dictionaryForm === "ところ" || token.dictionaryForm === "所")
  ) {
    return `external ところ scope not yet represented in TailRoot — ${reason}`;
  }
  return reason;
}

function explicitQuoteSpanContentTailRelation(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): { readonly relation: NonNullable<ReturnType<typeof quoteStructuralRelationAt>>; readonly closeIdx: number } | null {
  const tokens = cursor.tokens;
  const proto = activeProtoLayout();
  if (proto === null) {
    return null;
  }
  const closeIdx = nextNonSpaceIndex(tokens, scanEnd + 1, tokens.length);
  if (closeIdx === null) {
    return null;
  }
  const span = proto.quoteSpans.find(([, close]) => close === closeIdx);
  if (span === undefined) {
    return null;
  }
  const [open] = span;
  if (previousNonSpaceIndex(tokens, closeIdx, open + 1) !== scanEnd) {
    return null;
  }
  if (kaMarkerRelationAt(tokens, scanEnd, ["tail_multi_clause"]) !== null) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, closeIdx + 1, tokens.length);
  if (markerIdx === null) {
    return null;
  }
  const relation = quoteStructuralRelationAt(cursor.fork(markerIdx, tokens.length, markerIdx), lookups);
  if (relation === undefined || relation.quote.slotKind !== "quoted_content") {
    return null;
  }
  return { relation, closeIdx };
}

function explicitQuoteSpanContentTailBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const tokens = cursor.tokens;
  const info = explicitQuoteSpanContentTailRelation(cursor, scanEnd, lookups);
  return info === null
    ? null
    : quoteClauseBoundaryFromRelation(tokens, info.relation, lookups, { lowerBoundInclusive: info.closeIdx + 1 });
}

function isExplicitQuoteSpanContentZeroTailHead(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups: LookupTables
): boolean {
  const tokens = cursor.tokens;
  if (explicitQuoteSpanContentTailRelation(cursor, start, lookups) === null) {
    return false;
  }
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return false;
  }
  return (token.pos & POS5A) === 終止形_;
}

function isZeroTailRenyouChuushiPredicateHead(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables,
  unownedCompoundPair: boolean
): boolean {
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return false;
  }
  if ((token.pos & POS5) !== 連用形_一般) {
    return false;
  }
  const next = tokens[start + 1];
  if (next === undefined || isHardTerminalPunctuationToken(next)) {
    return false;
  }
  if (!unownedCompoundPair && renyouHeadBunsetsuContinuesInto(next)) {
    return false;
  }
  if (pos0 === 形容詞0 && !isClausePunctuationToken(next)) {
    return false;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, start);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  if (prefix !== undefined && isPrefixAffixToken(prefix)) {
    return false;
  }
  if (
    (!unownedCompoundPair && isStreamVvCompoundPairAt(tokens, start)) ||
    renyouCompoundPrenominalAttributiveTerminalAllowed(start)
  ) {
    return false;
  }
  return unownedCompoundPair ||
    hasRenyouChuushiContinuation(tokens, start, lookups) ||
    renyouChuushiDetachedClosureAt(tokens, start, lookups) ||
    isNonTerminalClauseBreakPunctuationToken(next, lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES);
}

async function renyouPredicateHeadLacksPredicateSense(
  input: IntegrationInput,
  start: number
): Promise<boolean> {
  const token = input.tokens[start];
  return token !== undefined && renyouTokenLacksPredicateSense(input.dictionary, token);
}

export async function renyouTokenLacksPredicateSense(
  dictionary: { lookupTokenRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined> },
  token: RuntimeHaruToken
): Promise<boolean> {
  const entry = await dictionary.lookupTokenRelaxed(token);
  if (entry === undefined) {
    return false;
  }
  const stemKind: TailParserSourceStemKind = (token.pos & POS0) === 形容詞0 ? "adj" : "verb";
  return !entryHasPredicateStemTranslation(entry, stemKind);
}

async function zeroTailRenyouChuushiPredicateHeadAdmitted(
  input: IntegrationInput,
  start: number
): Promise<boolean> {
  const unownedCompoundPair = await streamVvCompoundPairLacksRegisteredOwnerAt(
    input.tokens,
    start,
    input.dictionary as unknown as MorphemeDictionary
  );
  return isZeroTailRenyouChuushiPredicateHead(input.tokens, start, input.lookups, unownedCompoundPair) &&
    !(await renyouPredicateHeadLacksPredicateSense(input, start));
}

function inferTailChunkEndBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): ClauseBoundary {
  const { tokens } = cursor;
  if (spaceSeparatesTailChunkFromFollowingPostverbClause(tokens, 0, scanEnd + 1, lookups)) {
    return { kind: "terminal" };
  }
  if (terminalCopulaSeparatedFromFollowingClause(tokens, 0, scanEnd + 1, lookups)) {
    return { kind: "terminal" };
  }
  if (pauseJunctureEndsTailChunkAt(tokens, 0, scanEnd + 1)) {
    return { kind: "terminal" };
  }
  if (terminalOnlyPredicateEndpointClosesBefore(tokens, start, scanEnd + 1)) {
    return { kind: "terminal" };
  }
  if (nominalTerminalQuestionClosureEndsChunkAt(cursor, start, scanEnd, numeric, lookups)) {
    return { kind: "terminal" };
  }
  const quoteSpanContentBoundary = explicitQuoteSpanContentTailBoundary(cursor, scanEnd, lookups);
  if (quoteSpanContentBoundary !== null) {
    return quoteSpanContentBoundary;
  }
  const externalNominalizerBoundary = inferExternalNominalizerBoundaryAtScanEnd(cursor, scanEnd, lookups);
  if (externalNominalizerBoundary !== null) {
    return externalNominalizerBoundary;
  }
  const questionContentBoundary = inferQuestionContentCompositeBoundaryAtScanEnd(cursor, scanEnd, lookups);
  if (questionContentBoundary !== null) {
    return questionContentBoundary;
  }
  const questionQuotativeBoundary = inferQuestionQuotativeBoundaryAtScanEnd(cursor, start, scanEnd, lookups);
  if (questionQuotativeBoundary !== null) {
    return questionQuotativeBoundary;
  }
  if (chuushiClosureEvidenceAt(tokens, scanEnd + 1, lookups)?.right === "detached") {
    return { kind: "terminal" };
  }
  const boundary = classifySingleTokenBoundary(cursor, scanEnd, lookups);
  if (boundary.kind === "terminal") {
    return { kind: "terminal" };
  }
  if (
    boundary.kind === "合成接続" &&
    boundary.connectiveKind === "question_content" &&
    !questionContentBoundaryHasHostAfterScanEnd(cursor, scanEnd, lookups) &&
    !questionContentBoundaryHasSourceBearingKaAtScanEnd(tokens, scanEnd)
  ) {
    return { kind: "terminal" };
  }
  if (questionKaQuoteMarkerEndsAt(tokens, scanEnd, lookups)) {
    return { kind: "terminal" };
  }
  const nextContent = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
  if (nextContent < tokens.length) {
    return boundary;
  }
  return { kind: "terminal" };
}

function questionKaQuoteMarkerEndsAt(
  tokens: readonly RuntimeHaruToken[],
  scanEnd: number,
  lookups: LookupTables
): boolean {
  const kaIdx = scanEnd - 1;
  if (kaIdx < 0) {
    return false;
  }
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "kadouka") {
    return false;
  }
  const continuation = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  });
  return continuation?.continuationKind === "question_quote_marker" && continuation.span.endExclusive === scanEnd + 1;
}

function inferQuestionQuotativeBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const kaIdx = scanEnd - 1;
  if (!isQuestionComplementPredicateStart(cursor, start, lookups) || !questionKaQuoteMarkerEndsAt(tokens, scanEnd, lookups)) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: "question_quotative",
    surface: `${tokens[kaIdx]?.surface ?? ""}${tokens[scanEnd]?.surface ?? ""}`,
    tokenIdx: scanEnd,
    tokenSpan: { start: kaIdx, end: scanEnd }
  };
}

function inferQuestionContentCompositeBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const lower = Math.max(0, scanEnd - 4);
  for (let start = lower; start <= scanEnd; start += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false });
    if (
      match === null ||
      match.connective !== "question_content" ||
      start + match.consumed - 1 !== scanEnd
    ) {
      continue;
    }
    if (
      !questionContentBoundaryHasHostAfterScanEnd(cursor, scanEnd, lookups) &&
      !questionContentBoundaryHasSourceBearingKaAtScanEnd(tokens, scanEnd)
    ) {
      continue;
    }
    return {
      kind: "合成接続",
      connectiveKind: match.connective,
      surface: match.surface,
      tokenIdx: scanEnd,
      tokenSpan: { start, end: scanEnd }
    };
  }
  return null;
}

function questionContentBoundaryHasSourceBearingKaAtScanEnd(
  tokens: readonly RuntimeHaruToken[],
  scanEnd: number
): boolean {
  return kaMarkerRelationAt(tokens, scanEnd, ["tail_multi_clause"])?.particleSubtype1 === 副助詞;
}

function questionContentBoundaryHasHostAfterScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables,
): boolean {
  const { tokens } = cursor;
  const nextIdx = nextNonSpaceIndex(tokens, scanEnd + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || nextIdx === null) {
    return false;
  }
  if (!isClausePunctuationToken(next) && !separatedAs(tokens, nextIdx, DETACHED_SEPARATIONS)) {
    return true;
  }
  const nextContent = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
  const scanCursor = cursor.fork(scanEnd, tokens.length, scanEnd);
  const prevIdx = previousNonSpaceIndex(tokens, scanEnd);
  const nominalizer = prevIdx === null
    ? null
    : predicateNominalizerRelationForToken(tokens[prevIdx], prevIdx, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    });
  const permitsNominalArgumentTraversal =
    nominalizer?.nominalizerKind === "no" ||
    clauseContainsInterrogativeBeforeKa(tokens, scanEnd, lookups, activeProtoLayout() ?? undefined);
  const skipNominalArguments = permitsNominalArgumentTraversal &&
    next !== undefined && isClauseEvidenceTransparentPunctuation(next);
  const layout = activeProtoLayout();
  const layoutQuestionHost = skipNominalArguments && layout !== null &&
    looksQuestionTakingAfterViaLayout(
      layout,
      tokens,
      nextContent,
      tokens.length,
      lookups,
      { scope: "sentence", traverseMatrixArguments: true, hostCapability: "content" }
    );
  return layoutQuestionHost || scanCursor.lookahead(nextContent - scanEnd, c =>
    looksQuestionTakingAfter(c, lookups, {
      ...(skipNominalArguments ? { skipNominalArguments: true as const } : {}),
      scope: "clause",
      hostCapability: "content",
    })
  ) ||
    looksQuestionContentNominalizedAfterKa(scanCursor);
}

function inferExternalNominalizerBoundaryAtScanEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const lower = Math.max(0, scanEnd - 5);
  for (let start = lower; start <= scanEnd; start += 1) {
    const match = matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false });
    if (
      match === null ||
      (
        match.connective !== "external_nominalizer_comparison" &&
        match.connective !== "external_nominalizer_concessive" &&
        match.connective !== "external_nominalizer_additive"
      ) ||
      start + match.consumed - 1 !== scanEnd
    ) {
      continue;
    }
    const nextStart = skipClausePunctuationForward(tokens, scanEnd + 1, tokens.length);
    if (!hasSupportedClauseContinuation(tokens, nextStart, tokens.length, lookups)) {
      continue;
    }
    if (isSuppressedCompositeBoundary(cursor, match, scanEnd + 1)) {
      continue;
    }
    return {
      kind: "合成接続",
      connectiveKind: match.connective,
      surface: match.surface,
      tokenIdx: scanEnd,
      tokenSpan: { start, end: scanEnd }
    };
  }
  return null;
}

export async function _buildClauseTailIRsForTest(
  input: IntegrationInput
): Promise<readonly ClauseTailIR[] | null> {
  const range = findContentRange(input.tokens);
  if (range === null) return null;
  const boundaries = findClauseBoundaries(input.cursor.fork(range.start, range.end, range.start), input.lookups);
  const seg = await segmentAndParseClauses(input, boundaries);
  return seg.ok ? seg.irs : null;
}

interface DetectedClauseBoundary {
  readonly splitAt: number;
  readonly boundary: ClauseBoundary;
}

const clauseBoundaryCache = new WeakMap<readonly RuntimeHaruToken[], Map<string, readonly DetectedClauseBoundary[]>>();
const partialBoundaryCache = new WeakMap<readonly RuntimeHaruToken[], Map<string, ReadonlyMap<number, ClauseBoundary>>>();

const KUSE_NI_DATIVE_PREDICATE_LOOKUP = "concession.kuse_ni_dative_predicates";

function kuseNiGovernedByDativePredicate(
  tokens: readonly RuntimeHaruToken[],
  kuseNiStart: number,
  predicateStart: number,
  lookups: LookupTables
): boolean {
  const predicate = tokens[predicateStart];
  if (predicate === undefined) return false;
  const set = lookups.named(KUSE_NI_DATIVE_PREDICATE_LOOKUP);
  if (set === undefined) return false;
  if (!lookupSetMatches(set, predicate.dictionaryForm) && !lookupSetMatches(set, predicate.surface)) {
    return false;
  }
  const beforeIdx = previousNonSpaceIndex(tokens, kuseNiStart);
  const before = beforeIdx === null ? undefined : tokens[beforeIdx];
  if (before !== undefined) {
    const p0 = before.pos & POS0;
    if (p0 === 動詞 || p0 === 助動詞0) {
      return false;
    }
  }
  return true;
}

function concessionFollowedByTerminalTrailer(
  tokens: readonly RuntimeHaruToken[],
  nextStart: number,
  rangeEnd: number,
  lookups: LookupTables
): boolean {
  if (nextStart >= rangeEnd) return false;
  for (let idx = nextStart; idx < rangeEnd; idx += 1) {
    if (isSupportedClauseStart(tokens, idx, lookups)) return false;
  }
  return true;
}

export function clauseBoundaryAtSplit(
  cursor: TokenCursor<RuntimeHaruToken>,
  splitAt: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const reachEnd = Math.min(cursor.end, clauseBoundaryDetectionReachEnd(cursor.tokens, splitAt - 1, lookups));
  return findClauseBoundaries(cursor.fork(cursor.pos, reachEnd, cursor.pos), lookups)
    .find((detected) => detected.splitAt === splitAt)?.boundary ?? null;
}

function clauseBoundaryDetectionReachEnd(
  tokens: readonly RuntimeHaruToken[],
  lastBoundaryTokenIdx: number,
  lookups: LookupTables
): number {
  const layout = activeProtoLayout() ?? buildProtoLayout(tokens, lookups);
  const utterance = layout.utteranceRangeOfToken(Math.max(lastBoundaryTokenIdx, 0));
  const closingRun = layout.terminalPunctuationRuns.find((run) => run.span.start === utterance.endExclusive);
  return Math.min(tokens.length, closingRun?.span.endExclusive ?? utterance.endExclusive);
}

function findClauseBoundaries(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): readonly DetectedClauseBoundary[] {
  const { tokens } = cursor;
  const range = { start: cursor.pos, end: cursor.end };
  const cacheKey = `${range.start}:${range.end}`;
  let perTokenCache = clauseBoundaryCache.get(tokens);
  if (perTokenCache === undefined) {
    perTokenCache = new Map();
    clauseBoundaryCache.set(tokens, perTokenCache);
  } else {
    const cached = perTokenCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }
  const boundaries = new Map<number, DetectedClauseBoundary>();
  const upsert = (boundary: DetectedClauseBoundary): void => {
    const normalizedBoundary = normalizeTokaListingBoundary(cursor, boundary.boundary, lookups);
    const quoteAttributivePayload =
      normalizedBoundary.kind !== "terminal" &&
      normalizedBoundary.connectiveKind === "predicate_projection_quote_attributive"
        ? classifyStructuralAttributiveBoundaryPayload(
          tokens,
          range.start,
          normalizedBoundary.tokenSpan.end,
          normalizedBoundary.tokenSpan.end + 1,
          lookups
        )
        : null;
    const ownedBoundary = quoteAttributivePayload === null || normalizedBoundary.kind === "terminal"
      ? normalizedBoundary
      : { ...normalizedBoundary, attributiveBoundary: quoteAttributivePayload };
    const continuationIdx = nextNonSpaceIndex(tokens, ownedBoundary.kind === "terminal" ? boundary.splitAt : ownedBoundary.tokenSpan.end + 1, range.end);
    if (
      ownedBoundary.kind !== "terminal" &&
      ownedBoundary.connectiveKind === "exemplification" &&
      continuationIdx !== null &&
      predicateQuoteCarrierStartsAt(cursor.fork(continuationIdx, range.end, continuationIdx), lookups)
    ) return;
    const normalized = {
      ...boundary,
      boundary: normalizeClauseBoundarySourceSpan(cursor, ownedBoundary)
    };
    const existing = boundaries.get(normalized.splitAt);
    if (existing === undefined || boundarySpanLength(normalized.boundary) > boundarySpanLength(existing.boundary)) {
      boundaries.set(normalized.splitAt, normalized);
    }
  };

  const events = clauseBoundaryEventsForRuntimeTokens(tokens, lookups);
  for (const ev of events) {
    if (ev.kind !== "connective") continue;
    if (ev.splitAt <= range.start || ev.splitAt > range.end) continue;
    const boundaryTokenIdx = ev.splitAt - 1;
    if (isSuppressedSingleTokenBoundary(cursor, boundaryTokenIdx, ev.splitAt)) continue;
    if (isObligationSpanContaining(tokens, ev.splitAt - 1)) continue;
    const closure = chuushiClosureEvidenceAt(tokens, ev.splitAt, lookups);
    if (closure?.right === "detached") continue;
    if (renyouJunctureEvidenceAt(tokens, ev.splitAt, lookups)?.verdict === "cohesion") continue;
    if (closure?.hostKind === "renyou") {
      if (closure.boundaryOwner === undefined) {
        upsert({ splitAt: ev.splitAt, boundary: { kind: "terminal" } });
      }
      continue;
    }
    const boundary: ClauseBoundary = ev.pairedConcessive === undefined
      ? classifyClauseLayoutConnectiveBoundary(cursor, ev.splitAt, lookups)
      : {
        kind: "合成接続",
        connectiveKind: "even_if",
        surface: "__paired_volitional_to",
        tokenIdx: boundaryTokenIdx,
        tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx },
        pairedConcessive: ev.pairedConcessive,
      };
    if (boundary.kind === "terminal") continue;
    if (
      boundary.connectiveKind === "conditional" &&
      isConditionalToOwnedByQuoteOrCarrierFrame(cursor, boundaryTokenIdx, lookups)
    ) continue;
    if (
      boundary.kind === "合成接続" &&
      boundary.connectiveKind === "adversative" &&
      boundary.surface === "のに" &&
      matchNoNiConcessiveConnectiveStart(cursor.fork(boundary.tokenSpan.start, tokens.length), lookups) === null
    ) continue;
    upsert({ splitAt: ev.splitAt, boundary });
  }

  for (let markerIdx = range.start + 1; markerIdx < range.end; markerIdx += 1) {
    const relation = conditionalToConnectiveRelationAt(tokens, markerIdx, {
      consumers: ["tail_multi_clause"]
    });
    if (relation === null) {
      continue;
    }
    if (
      tokens[markerIdx] !== undefined && (tokens[markerIdx]!.pos & POS1) === 格助詞 &&
      !hasStrongKakuToConditionalEvidence(tokens, markerIdx, range.start)
    ) {
      continue;
    }
    if (isConditionalToOwnedByQuoteOrCarrierFrame(cursor, markerIdx, lookups)) {
      continue;
    }
    const splitAt = markerIdx + 1;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "conditional",
        surface: "と",
        tokenIdx: markerIdx,
        tokenSpan: { start: markerIdx, end: markerIdx }
      }
    });
  }

  for (let markerIdx = range.start + 1; markerIdx < range.end; markerIdx += 1) {
    if (!isFiniteOrCopulaAdversativeGaBoundary(tokens, markerIdx, range.start)) {
      continue;
    }
    const splitAt = markerIdx + 1;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "adversative",
        surface: "が",
        tokenIdx: markerIdx,
        tokenSpan: { start: markerIdx, end: markerIdx }
      }
    });
  }

  for (let markerIdx = range.start + 1; markerIdx < range.end; markerIdx += 1) {
    const marker = tokens[markerIdx];
    if (
      marker?.surface !== "も" || (marker.pos & POS01) !== 助詞_係助詞 || !isBareMoConcessivePreviousToken(tokens[markerIdx - 1]) ||
      focusedNegationShapeAt(tokens, markerIdx) !== null ||
      isZeroNominalizedParallelMoMarker(tokens, markerIdx)
    ) {
      continue;
    }
    const splitAt = markerIdx + 1;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (
      !hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups) &&
      !(connectiveAdmitsEllipticFollowerClause("concession", lookups) &&
        hasEllipticFollowerClauseEvidence(tokens, splitAt, range.end, (t, i) => isSupportedClauseStart(t, i, lookups)))
    ) {
      continue;
    }
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "concession",
        surface: "も",
        tokenIdx: markerIdx,
        tokenSpan: { start: markerIdx, end: markerIdx }
      }
    });
  }

  for (let markerIdx = range.start + 1; markerIdx < range.end; markerIdx += 1) {
    const marker = tokens[markerIdx];
    if (
      marker?.surface !== "も" || (marker.pos & POS01) !== 助詞_係助詞 || !isCopulaMoFocusPreviousToken(tokens, markerIdx - 1)
    ) {
      continue;
    }
    const splitAt = markerIdx + 1;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasCopulaMoFocusContinuation(tokens, nextStart, range.end)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "even_if",
        surface: "でも",
        tokenIdx: markerIdx,
        tokenSpan: { start: markerIdx - 1, end: markerIdx }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const quotedDirectiveBoundary = youNiQuoteDirectiveProjectionBoundaryAt(cursor, i, lookups);
    if (quotedDirectiveBoundary !== null) {
      upsert({
        splitAt: quotedDirectiveBoundary.tokenSpan.end + 1,
        boundary: quotedDirectiveBoundary
      });
      continue;
    }
    const quotativeMatch = matchQuotativeMannerSimileConnectiveAt(tokens, i, lookups);
    if (quotativeMatch !== null && (quotativeMatch.closure !== "noda_formal_noun" || !attributiveSpanCarriesObligationIdiom(tokens, range.start, i - 1))) {
      const splitAt = i + quotativeMatch.consumed;
      if (splitAt > range.start && splitAt <= range.end) {
        const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
        if (hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) {
          upsert({
            splitAt,
            boundary: {
              kind: "合成接続",
              connectiveKind: quotativeMatch.connective,
              surface: quotativeMatch.surface,
              tokenIdx: splitAt - 1,
              tokenSpan: { start: i - quotativeMatch.leadingSfpCount, end: splitAt - 1 },
              quotativeMood: quotativeMatch.mood
            }
          });
        }
      }
      continue;
    }
    const match = matchYouNiPredicateProjectionConnectiveAt(tokens, i, { requireEnd: false, lookups });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (nextStart >= range.end) continue;
    if (hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) {
      upsert({
        splitAt,
        boundary: {
          kind: "合成接続",
          connectiveKind: match.connective,
          surface: match.surface,
          tokenIdx: splitAt - 1,
          tokenSpan: { start: i, end: splitAt - 1 }
        }
      });
      continue;
    }
    if (!youNiFragmentBoundaryUtteranceContinues(tokens, splitAt, range.end)) continue;
    if (!youNiFragmentBoundaryHostAdmitsConnective(tokens, i, match.connective)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const gotoku = matchGotokuMannerSimileConnectiveAt(tokens, i);
    if (gotoku === null) continue;
    const splitAt = i + gotoku.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (nextStart >= range.end) continue;
    if (!hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: gotoku.connective,
        surface: gotoku.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const kaNoYouNi = matchKaNoYouNiMannerSimileConnectiveAt(tokens, i, lookups);
    if (kaNoYouNi === null) continue;
    const splitAt = i + kaNoYouNi.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (nextStart >= range.end) continue;
    if (!hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: kaNoYouNi.connective,
        surface: kaNoYouNi.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const boundary = zeroNiPurposeProjectionBoundaryAt(cursor, i, lookups);
    if (boundary === null) continue;
    upsert({
      splitAt: i + 1,
      boundary
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchPredicateProjectionConnectiveAt(tokens, i, {
      requireEnd: false,
      allowNoQuoteReportingProjection: noQuoteReportingProjectionAllowedAt(tokens, i - 1, lookups),
      ...purposeMotionReachEndOption(tokens, i, range.end),
      quantityExtentLayout: activeProtoLayout(),
      lookups
    });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    const hasContinuation = matchLicensesNpModifyingContinuation(match)
      ? nextStart < range.end
      : hasPredicateProjectionClauseContinuation(tokens, nextStart, range.end, lookups) ||
        (connectiveAdmitsEllipticFollowerClause(match.connective, lookups) &&
          hasEllipticFollowerClauseEvidence(tokens, splitAt, range.end, (t, i) => isSupportedClauseStart(t, i, lookups)));
    if (!hasContinuation) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchFocusConnectiveAt(tokens, i);
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const consumed = matchHokaAdditiveConnectiveStart(cursor.fork(i, range.end));
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "additive_besides",
        surface: tokens.slice(i, splitAt).map((token) => token.surface).join(""),
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const consumed = matchMonoNoConcessiveConnectiveStart(cursor.fork(i, range.end));
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "concession",
        surface: "ものの",
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const consumed = matchNoNiConcessiveConnectiveStart(cursor.fork(i, range.end), lookups);
    if (consumed === null) continue;
    const splitAt = i + consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "adversative",
        surface: "のに",
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  const canonicalReformulationRelations =
    canonicalReformulationMarkerRelationIndex(tokens, lookups);
  for (let i = range.start; i < range.end; i++) {
    const match = matchReformulationConnectiveAt(tokens, i, {
      requireEnd: false,
      canonicalRelation:
        canonicalReformulationRelations.relationAtQuoteMarker(i) ?? null
    });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const reformulationNextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    const hasReformulationContinuation =
      hasSupportedClauseContinuation(tokens, reformulationNextStart, range.end, lookups) ||
      (connectiveAdmitsEllipticFollowerClause("reformulation", lookups) &&
        hasEllipticFollowerClauseEvidence(tokens, splitAt, range.end, (t, idx) => isSupportedClauseStart(t, idx, lookups)));
    if (!hasReformulationContinuation) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "reformulation",
        surface: match.surface,
        ...(match.surfaceAllomorph === undefined
          ? {}
          : { surfaceAllomorph: match.surfaceAllomorph }),
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchQuotedConcessiveConnectiveAt(tokens, i, { requireEnd: false });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    if (!hasSupportedClauseContinuation(tokens, skipClausePunctuationForward(tokens, splitAt, range.end), range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "quoted_concessive",
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchRetrospectiveQuoteConnectiveAt(tokens, i, { requireEnd: false });
    if (match === null) continue;
    if (match.retrospectiveQuotativeFlavor === undefined) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    const claimOwned = quotativeDerivedIdiomClaimAt(tokens, i, { consumers: ["tail_multi_clause"] })
      ?.span.endExclusive === splitAt;
    if (
      !claimOwned &&
      !hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups) &&
      !isSupportedConditionalContinuation(tokens, nextStart, lookups)
    ) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "retrospective_quotative",
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 },
        retrospectiveQuotativeFlavor: match.retrospectiveQuotativeFlavor
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchQuestionReformulationConnectiveAt(tokens, i, { requireEnd: false });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (
      !boundaries.has(splitAt) &&
      !hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups) &&
      !isSupportedConditionalContinuation(tokens, nextStart, lookups)
    ) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: "question_reformulation",
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let kaIdx = range.start + 1; kaIdx < range.end; kaIdx += 1) {
    const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
      consumers: ["tail_multi_clause"],
      requireAdjacent: true,
      limit: range.end + 1
    });
    if (questionQuote?.continuationKind !== "question_quote_marker") {
      continue;
    }
    if (quotativeDerivedIdiomClaimAt(tokens, kaIdx, { consumers: ["tail_multi_clause"] }) !== null) {
      continue;
    }
    const splitAt = questionQuote.span.endExclusive;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    const nextCursor = cursor.fork(nextStart, range.end);
    if (
      !looksQuestionTakingAfter(nextCursor, lookups) &&
      !looksQuoteQuestionTakingAfter(nextCursor, lookups)
    ) continue;
    const quoteRelation = quoteStructuralRelationAt(cursor.fork(splitAt - 1, tokens.length, splitAt - 1), lookups);
    const quoteBoundary = quoteRelation === undefined
      ? null
      : quoteClauseBoundaryFromRelation(tokens, quoteRelation, lookups, { lowerBoundInclusive: range.start });
    if (quoteRelation?.quote.questionBoundaryKind === "euphemistic_judgment_kato") {
      continue;
    }
    if (quoteBoundary?.kind === "接続助詞" && quoteBoundary.connectiveKind === "request_complement") {
      continue;
    }
    upsert({
      splitAt,
      boundary: {
        kind: "接続助詞",
        connectiveKind: "question_quotative",
        surface: "かと",
        tokenIdx: splitAt - 1,
        tokenSpan: { start: kaIdx, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const relation = quoteStructuralRelationAt(cursor.fork(i, tokens.length, i), lookups);
    if (
      relation?.quote.slotKind !== "quoted_content" &&
      relation?.quote.slotKind !== "question_content" &&
      relation?.quote.slotKind !== "wish_content" &&
      relation?.quote.slotKind !== "request_content"
    ) continue;
    const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups, { lowerBoundInclusive: range.start });
    if (boundary === null) continue;
    if (boundary.kind === "terminal") continue;
    const splitAt = boundary.tokenSpan.end + 1;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextContent = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (relation.quote.hostMatch.hostIdx < nextContent) continue;
    upsert({ splitAt, boundary });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchBoundNominalReasonConnectiveAt(tokens, i);
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const utterance = activeProtoUtteranceRange(splitAt - 1);
    if (utterance === null) continue;
    const reach = Math.min(range.end, utterance.endExclusive);
    const nextStart = skipClausePunctuationForward(tokens, splitAt, reach);
    if (!hasSupportedClauseContinuation(tokens, nextStart, reach, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 },
        ...(match.formalNoun === "mono" ? { boundNominalReasonMonoNoun: true } as const : {})
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchTameConnectiveAt(tokens, i, { requireEnd: false, lookups });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (!hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 }
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchTokoroResultConnectiveAt(tokens, i, { lookups });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 },
        retrospectiveDiscoveryStyle: match.retrospectiveDiscoveryStyle
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const match = matchCompositeConnectiveAt(cursor.fork(i, tokens.length, i), { requireEnd: false });
    if (match === null) continue;
    const splitAt = i + match.consumed;
    if (splitAt <= range.start || splitAt > range.end) continue;
    if (isSuppressedCompositeBoundary(cursor, match, splitAt)) continue;
    const classification = compositeConnectiveBoundaryKind(
      cursor,
      i,
      match,
      lookups,
      activeProtoScopedScanEnd(tokens, i, "evidence_window")
    );
    if (classification === null) continue;
    const boundaryConnective = classification.connectiveKind;
    const nextStart = skipClausePunctuationForward(tokens, splitAt, range.end);
    if (
      boundaryConnective === "concession" &&
      (match.surface === "くせに" || match.surface === "のくせに") &&
      kuseNiGovernedByDativePredicate(tokens, i, nextStart, lookups)
    ) continue;
    const nextCursor = cursor.fork(nextStart, range.end);
    const kaCursor = cursor.fork(splitAt - 1, range.end);
    const continuationSupported =
      boundaryConnective === "question_content"
        ? (
          looksQuestionTakingAfter(nextCursor, lookups) ||
          looksQuestionContentNominalizedAfterKa(kaCursor) ||
          (
            !isClausePunctuationToken(tokens[splitAt]) &&
            hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)
          )
        )
        : boundaryConnective === "question_content_alternative"
          ? (
            looksQuestionTakingAfter(nextCursor, lookups) ||
            looksQuestionContentNominalizedAfterKa(kaCursor)
          )
          : isExternalNominalizerConnectiveKind(boundaryConnective)
            ? hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)
            : boundaryConnective === "reason_quoted_judgment_passive"
              ? hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups)
              : boundaryConnective === "purpose_evaluation_nominalizer"
                ? true
                : boundaryConnective === "even_if"
                  ? isSupportedClauseStart(tokens, nextStart, lookups) || isBareKeijoujiZeroTailPredicateStart(tokens, nextStart)
                  : boundaryConnective === "concession"
                    ? hasSupportedClauseContinuation(tokens, nextStart, range.end, lookups) ||
                      isBareKeijoujiZeroTailPredicateStart(tokens, nextStart) ||
                      concessionFollowedByTerminalTrailer(tokens, nextStart, range.end, lookups)
                    : isSupportedClauseStart(tokens, nextStart, lookups);
    if (!continuationSupported) continue;
    if (isObligationSpanContaining(tokens, splitAt - 1)) continue;
    upsert({
      splitAt,
      boundary: {
        kind: "合成接続",
        connectiveKind: boundaryConnective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start: i, end: splitAt - 1 },
        ...(classification.adversativeReadingAvailable === undefined
          ? {}
          : { adversativeReadingAvailable: classification.adversativeReadingAvailable })
      }
    });
  }

  for (let i = range.start; i < range.end; i++) {
    const tok = tokens[i];
    if (tok === undefined) continue;
    if (!isJodoshiKateikeiBoundary(tok)) continue;
    const nextStart = skipClausePunctuationForward(tokens, i + 1, range.end);
    if (!isSupportedConditionalContinuation(tokens, nextStart, lookups)) continue;
    if (isObligationSpanContaining(tokens, i)) continue;
    const boundary = classifySingleTokenBoundary(cursor, i, lookups);
    if (boundary.kind === "terminal") continue;
    upsert({ splitAt: i + 1, boundary });
  }

  const result = [...boundaries.values()].sort((a, b) => a.splitAt - b.splitAt);
  perTokenCache.set(cacheKey, result);
  return result;
}

function hasStrongKakuToConditionalEvidence(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lowerBoundInclusive: number
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx, lowerBoundInclusive);
  if (prevIdx === null) {
    return false;
  }
  const previous = tokens[prevIdx];
  return previous !== undefined &&
    (previous.pos & POS0) === 助動詞0 &&
    ((previous.pos & POS4) === 助動詞_ナイ || (previous.pos & POS4) === 助動詞_ヌ);
}

function isConditionalToOwnedByQuoteOrCarrierFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerIdx: number,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  const marker = quoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "と") {
    return false;
  }
  if (quoteStructuralRelationAt(cursor.fork(markerIdx, tokens.length, markerIdx), lookups) !== undefined) {
    return true;
  }
  if (quoteMarkerContinuationRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  if (isToWaMoKagiranaiCarrierStart(tokens, marker.span.endExclusive)) {
    return true;
  }
  const markerCursor = cursor.fork(markerIdx, tokens.length, markerIdx);
  if (isQuotedJudgmentPassiveCarrierStart(markerCursor.fork(marker.span.endExclusive - 1, tokens.length, marker.span.endExclusive - 1))) {
    return true;
  }
  const projection = matchPredicateProjectionConnectiveAt(tokens, markerIdx, { requireEnd: false, lookups });
  if (
    projection?.connective === "predicate_projection_quote_attributive" ||
    projection?.connective === "predicate_projection_simultaneous_time"
  ) {
    return true;
  }
  if (tokens[markerIdx] !== undefined && (tokens[markerIdx].pos & POS1) === 接続助詞) {
    return false;
  }
  const hostMatch = quoteHostMatchAfterMarker(markerCursor, lookups);
  if (
    hostMatch !== null &&
    !quoteHostMatchBlockedByNegativeCondition(markerCursor, hostMatch, lookups)
  ) {
    return true;
  }
  const carrierIdx = nextNonSpaceIndex(tokens, marker.span.endExclusive, tokens.length);
  if (carrierIdx === null) {
    return false;
  }
  const carrier = tokens[carrierIdx];
  if ((carrier === undefined || (carrier.pos & POS0) !== 動詞) || (carrier.dictionaryForm || carrier.surface) !== "する") {
    return false;
  }
  const form5A = carrier.pos & POS5A;
  return form5A === 連用形_ ||
    form5A === 連体形_ ||
    form5A === 終止形_ ||
    isPassiveSuruFollower(tokens[carrierIdx + 1]);
}

function isQuotedJudgmentPassiveCarrierStart(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  return matchQuotedJudgmentPassiveTail(cursor, {
    hasCopulaBeforeMarker: true,
    nominalHead: true
  }) !== null;
}

function isToWaMoKagiranaiCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const focusIdx = nextNonSpaceIndex(tokens, start, tokens.length);
  const focus = focusIdx === null ? undefined : tokens[focusIdx];
  if (focusIdx === null || focus === undefined || (focus.surface !== "は" && focus.surface !== "も")) {
    return false;
  }
  const limitIdx = nextNonSpaceIndex(tokens, focusIdx + 1, tokens.length);
  const limit = limitIdx === null ? undefined : tokens[limitIdx];
  const limitForm = limit?.dictionaryForm || limit?.surface;
  return limit !== undefined && (limit.pos & POS0) === 動詞 && (limitForm === "限る" || limitForm === "かぎる");
}

function isPassiveSuruFollower(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_レル);
}

export const YOUNI_FRAGMENT_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    "eos",
    "hard_terminal",
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "clause_boundary"
  ]);

function youNiFragmentBoundaryUtteranceContinues(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  endExclusive: number
): boolean {
  const scope = activeProtoLayout();
  let probe = splitAt;
  while (probe < endExclusive) {
    const closure = utteranceClosureAfter(scope, tokens, probe);
    if (closure.closure === "weak_pause") {
      probe = closure.tokenIdx + 1;
      continue;
    }
    const closureIdx = utteranceClosureTokenIdx(closure);
    return closureIdx !== null &&
      !closesUtteranceAs(closure, YOUNI_FRAGMENT_UTTERANCE_CLOSURES) &&
      closureIdx < endExclusive;
  }
  return false;
}

function youNiFragmentBoundaryHostAdmitsConnective(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  connective: YouNiPredicateProjectionConnectiveMatch["connective"]
): boolean {
  if (connective !== "predicate_projection_purpose") {
    return true;
  }
  return isNegativePurposeFragmentHostEnd(tokens[markerIdx - 1]);
}

function purposeMotionReachEndOption(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  rangeEnd: number
): { readonly purposeMotionReachEnd?: number } {
  const reachEnd = activeProtoLayout()?.connectiveConsequentReachEnd(tokens, markerIdx);
  return reachEnd === undefined ? {} : { purposeMotionReachEnd: Math.min(rangeEnd, reachEnd) };
}

function zeroNiPurposeProjectionBoundaryAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerIdx: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const match = matchZeroNiPurposeProjectionConnectiveAt(tokens, markerIdx, {
    requireEnd: false,
    allow: true
  });
  if (match === null) {
    return null;
  }
  const splitAt = markerIdx + match.consumed;
  if (!hasYouZeroDirectiveMatrixPredicateAhead(cursor.fork(splitAt, cursor.end, splitAt), lookups)) {
    return null;
  }
  return {
    kind: "合成接続",
    connectiveKind: match.connective,
    surface: match.surface,
    tokenIdx: markerIdx,
    tokenSpan: { start: markerIdx, end: markerIdx }
  };
}

function youNiQuoteDirectiveProjectionBoundaryAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerIdx: number,
  lookups: LookupTables
): NonTerminalClauseBoundary | null {
  const { tokens, end: endExclusive } = cursor;
  const span = youNiQuoteDirectiveProjectionSpanAt(tokens, markerIdx, lookups);
  if (span === null) {
    return null;
  }
  const nextStart = skipClausePunctuationForward(tokens, span.markerEndExclusive, endExclusive);
  const nextCursor = cursor.fork(nextStart, endExclusive, nextStart);
  if (
    !isYouNiQuoteDirectivePredicateStart(nextCursor, lookups) &&
    !hasYouZeroPressureTail(nextCursor, lookups)
  ) {
    return null;
  }
  return {
    kind: "合成接続",
    connectiveKind: "predicate_projection_purpose",
    surface: `ように${tokens[span.markerEndExclusive - 1]?.surface ?? ""}`,
    tokenIdx: span.markerEndExclusive - 1,
    tokenSpan: { start: markerIdx, end: span.markerEndExclusive - 1 }
  };
}

export function isZeroNiPurposeProjectionBoundaryEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  end: number,
  lookups: LookupTables
): boolean {
  return zeroNiPurposeProjectionBoundaryAt(cursor.fork(end, cursor.tokens.length, end), end, lookups) !== null;
}

function classifyClauseLayoutConnectiveBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  splitAt: number,
  lookups: LookupTables
): ClauseBoundary {
  const { tokens, pos: rangeStart } = cursor;
  const multiToken = matchClauseLayoutMultiTokenConnectiveEndingAt(cursor, splitAt);
  const boundary = multiToken ?? classifySingleTokenBoundary(cursor, splitAt - 1, lookups, rangeStart);
  return normalizeKotodashiReasonScopeBoundary(tokens, boundary, rangeStart);
}

function normalizeKotodashiReasonScopeBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundary: ClauseBoundary,
  rangeStart: number
): ClauseBoundary {
  if (
    boundary.kind === "terminal" ||
    boundary.connectiveKind !== "listing" ||
    boundary.surface !== "し"
  ) {
    return boundary;
  }
  const copulaIdx = boundary.tokenIdx - 1;
  if (
    !isKotodashiReasonScopeTail(tokens, copulaIdx) ||
    !hasKotoReasonScopeStemBeforeCopula(tokens, copulaIdx, rangeStart)
  ) {
    return boundary;
  }
  return {
    ...boundary,
    connectiveKind: "reason",
    surface: "し"
  };
}

function hasKotoReasonScopeStemBeforeCopula(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  rangeStart: number
): boolean {
  const previousIdx = copulaIdx - 1;
  const previous = tokens[previousIdx];
  if (previous === undefined || previousIdx < rangeStart) {
    return false;
  }
  if (stemTokenEndsWithNoKoto(previous)) {
    return true;
  }
  if (previous.surface !== "こと" || (previous.pos & POS0) !== 名詞) {
    return false;
  }
  const linkIdx = previousIdx - 1;
  return linkIdx >= rangeStart &&
    nominalLinkMarkerRelationAt(tokens, linkIdx, { consumers: ["tail_multi_clause"] }) !== null;
}

function matchClauseLayoutMultiTokenConnectiveEndingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  splitAt: number
): ClauseBoundary | null {
  const { tokens, pos: rangeStart } = cursor;
  const lower = Math.max(rangeStart, splitAt - 5);
  for (let start = lower; start < splitAt; start += 1) {
    const match =
      matchCompositeConnectiveAt(cursor.fork(start, tokens.length, start), { requireEnd: false }) ??
      matchQuotedConcessiveConnectiveAt(tokens, start, { requireEnd: false });
    if (match !== null && start + match.consumed === splitAt) {
      return {
        kind: "合成接続",
        connectiveKind: match.connective,
        surface: match.surface,
        tokenIdx: splitAt - 1,
        tokenSpan: { start, end: splitAt - 1 }
      };
    }
    const monoNoConsumed = matchMonoNoConcessiveConnectiveStart(cursor.fork(start, tokens.length, start));
    if (monoNoConsumed !== null && start + monoNoConsumed === splitAt) {
      return {
        kind: "合成接続",
        connectiveKind: "concession",
        surface: "ものの",
        tokenIdx: splitAt - 1,
        tokenSpan: { start, end: splitAt - 1 }
      };
    }
  }
  return null;
}

let _cbEventsLastTokens: readonly RuntimeHaruToken[] | null = null;
let _cbEventsLastReadingsKey = "";
let _cbEventsLastResult: ReturnType<typeof detectClauseBoundaryEvents> = [];

function activeProtoWhitespaceAttributiveReadings(): ReadonlyMap<number, WhitespaceAttributiveReadingInput> {
  const readings = new Map<number, WhitespaceAttributiveReadingInput>();
  for (const juncture of activeProtoLayout()?.whitespaceJunctures.values() ?? []) {
    const license = juncture.adnominalLicense;
    if (isWhitespaceAttributiveReadingLicense(license)) {
      readings.set(juncture.gapIdx, { leftIdx: license.leftIdx, headIdx: license.headIdx, witness: { kind: license.kind } });
    }
  }
  return readings;
}

function clauseBoundaryEventsForRuntimeTokens(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): ReturnType<typeof detectClauseBoundaryEvents> {
  const whitespaceAttributiveReadings = activeProtoWhitespaceAttributiveReadings();
  const readingsKey = [...whitespaceAttributiveReadings]
    .map(([gapIdx, reading]) => `${gapIdx}:${reading.leftIdx}:${reading.headIdx}:${reading.witness.kind}`)
    .join(",");
  if (tokens === _cbEventsLastTokens && readingsKey === _cbEventsLastReadingsKey) {
    return _cbEventsLastResult;
  }
  const cloneForBoundary: ClauseToken[] = tokens.map((t) => ({
    surface: t.surface,
    dictionaryForm: t.dictionaryForm,
    pos: t.pos,
    ...(t.whitespaceBefore === undefined ? {} : { whitespaceBefore: t.whitespaceBefore }),
    ...(t.transparentPauseAfter === undefined ? {} : { transparentPauseAfter: t.transparentPauseAfter }),
    ...(t.sourceOrdinal === undefined ? {} : { sourceOrdinal: t.sourceOrdinal }),
    ...(t.sourceSpan === undefined ? {} : { sourceSpan: t.sourceSpan })
  }));
  _cbEventsLastTokens = tokens;
  _cbEventsLastReadingsKey = readingsKey;
  _cbEventsLastResult = detectClauseBoundaryEvents(
    cloneForBoundary,
    lookups,
    whitespaceAttributiveReadings.size === 0 ? {} : { whitespaceAttributiveReadings }
  );
  return _cbEventsLastResult;
}

function chuushiClosureEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): ChuushiClosureEvidence | undefined {
  return (activeProtoLayout() ?? buildProtoLayout(tokens, lookups)).chuushiClosureAt(splitAt);
}

function renyouJunctureEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): RenyouJunctureEvidence | undefined {
  return (activeProtoLayout() ?? buildProtoLayout(tokens, lookups)).renyouJunctureAt(splitAt);
}

function isSuppressedSingleTokenBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundaryTokenIdx: number,
  splitAt: number
): boolean {
  const { tokens } = cursor;
  const boundary = tokens[boundaryTokenIdx];
  const next = tokens[splitAt];
  if (isForbiddenTeWaContinuation(tokens, boundaryTokenIdx, splitAt)) {
    return true;
  }
  if (
    boundary !== undefined &&
    (boundary.surface === "ては" || boundary.surface === "ても") &&
    isExternalNominalizerSingleFocusPredicateContinuation(tokens, boundaryTokenIdx)
  ) {
    return true;
  }
  if (
    boundary !== undefined &&
    isTeFocusAspectBoundary(boundary) &&
    isSimpleAspectAuxiliaryToken(tokens[splitAt])
  ) {
    return true;
  }
  if (isSplitTeFocusAspectBoundary(tokens, boundaryTokenIdx, splitAt)) {
    return true;
  }
  const composite = matchCompositeConnectiveAt(cursor.fork(boundaryTokenIdx, tokens.length, boundaryTokenIdx), { requireEnd: false });
  if (composite?.connective === "reason_quoted_judgment_passive") {
    return true;
  }
  if (boundary?.surface !== "つつ" || next === undefined) {
    return false;
  }
  const nextLemma = next.dictionaryForm || next.surface;
  return nextLemma === "ある" || nextLemma === "有る";
}

function isForbiddenTeWaContinuation(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  splitAt: number
): boolean {
  const boundary = tokens[boundaryTokenIdx];
  if (boundary === undefined || (boundary.pos & POS0) !== 助詞) {
    return false;
  }
  let bodyIdx: number | null = null;
  if (boundary.surface === "ては" || boundary.surface === "では") {
    bodyIdx = boundaryTokenIdx + 1;
  } else if (isTeConnectiveToken(boundary)) {
    const focus = tokens[splitAt];
    if (focus?.surface === "は" && (focus.pos & POS0) === 助詞) {
      bodyIdx = splitAt + 1;
    }
  }
  if (bodyIdx === null) {
    return false;
  }
  const body = tokens[bodyIdx];
  if ((body === undefined || (body.pos & POS0) !== 動詞)) {
    return false;
  }
  const bodyForm = body.dictionaryForm || body.surface;
  if (bodyForm !== "いける" && bodyForm !== "なる") {
    return false;
  }
  const bodyPos5A = body.pos & POS5A;
  if (bodyPos5A !== 未然形_) {
    return false;
  }
  const neg = tokens[bodyIdx + 1];
  if (neg === undefined) {
    return false;
  }
  return (neg.pos & POS4) === 助動詞_ナイ ||
    (neg.pos & POS4) === 助動詞_ヌ ||
    (neg.pos & POS4) === 助動詞_マス;
}

function isTeFocusAspectBoundary(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 助詞_接続助詞 && (token.surface === "ては" || token.surface === "では" ||
    token.surface === "ても" || token.surface === "でも");
}

function isSplitTeFocusAspectBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  splitAt: number
): boolean {
  const boundary = tokens[boundaryTokenIdx];
  const focus = tokens[splitAt];
  return boundary !== undefined && (boundary.pos & POS01) === 助詞_接続助詞 && isTeConnectiveToken(boundary) && focus !== undefined && (focus.pos & POS0) === 助詞 && (focus.surface === "は" || focus.surface === "も") && isSimpleAspectAuxiliaryToken(tokens[splitAt + 1]);
}

function isSimpleAspectAuxiliaryToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS01) !== 動詞_非自立可能) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  return lemma === "いる" || lemma === "居る" || lemma === "おる" ||
    lemma === "ある" || lemma === "有る" ||
    lemma === "おく" || lemma === "置く" ||
    lemma === "しまう" ||
    lemma === "みる" || lemma === "見る" ||
    lemma === "くる" || lemma === "来る" ||
    lemma === "いく" || lemma === "行く";
}

function boundarySpanLength(boundary: ClauseBoundary): number {
  if (boundary.kind === "terminal") return 0;
  return boundary.tokenSpan.end - boundary.tokenSpan.start + 1;
}

function normalizeClauseBoundarySourceSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: ClauseBoundary
): ClauseBoundary {
  if (boundary.kind === "terminal") {
    return boundary;
  }
  return expandNominalizedQuestionAlternativeBoundary(cursor, boundary) ?? boundary;
}

function expandNominalizedQuestionAlternativeBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>
): ClauseBoundary | null {
  const { tokens } = cursor;
  if (boundary.connectiveKind !== "question_content_alternative") {
    return null;
  }
  const nominalizerStart = boundary.tokenSpan.start - 1;
  if (nominalizerStart < 0) {
    return null;
  }
  const match = matchCompositeConnectiveAt(cursor.fork(nominalizerStart, tokens.length, nominalizerStart), { requireEnd: false });
  if (
    match === null ||
    match.connective !== "question_content_alternative" ||
    nominalizerStart + match.consumed - 1 !== boundary.tokenSpan.end
  ) {
    return null;
  }
  return {
    ...boundary,
    surface: match.surface,
    tokenSpan: { start: nominalizerStart, end: boundary.tokenSpan.end }
  };
}

function isSuppressedCompositeBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  match: CompositeConnectiveMatch,
  splitAt: number
): boolean {
  const { tokens } = cursor;
  const next = tokens[splitAt];
  if (next === undefined) return true;
  const nextLemma = next.dictionaryForm || next.surface;

  if (
    match.connective === "external_nominalizer_comparison" ||
    match.connective === "external_nominalizer_additive"
  ) {
    return isExternalNominalizerPredicateContinuation(tokens, splitAt);
  }
  if (match.connective === "external_nominalizer_concessive") {
    return false;
  }

  if ((match.surface === "のか" || match.surface === "んか") && startsKamoShirenaiModalAfterBoundary(tokens, splitAt)) {
    return true;
  }

  if (match.surface === "ので") {
    return (
      (next.pos & POS0) === 動詞 && nextLemma === "ある" ||
      ((next.pos & POS0) === 形容詞0 && (nextLemma === "ない" || nextLemma === "無い"))
    );
  }

  if (match.surface === "のに") {
    return (
      nextLemma === "対する" ||
      next.surface === "対し" ||
      next.surface === "対して" ||
      isPronominalNoNiResultVerb(tokens, splitAt)
    );
  }

  if (match.surface === "ても" || match.surface === "でも") {
    if (isSimpleAspectAuxiliaryToken(next)) {
      return true;
    }
    if (isExternalNominalizerFocusPredicateContinuation(tokens, splitAt - match.consumed)) {
      return true;
    }
    return (
      ((next.pos & POS0) === 形容詞0 && ["いい", "良い", "よい", "好い"].includes(nextLemma)) ||
      matchPermissionPredicateAt(tokens, splitAt) !== null
    );
  }

  return false;
}

function startsKamoShirenaiModalAfterBoundary(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): boolean {
  const focus = tokens[splitAt];
  if (focus?.surface !== "も") {
    return false;
  }
  const predicate = tokens[splitAt + 1];
  if (predicate === undefined) {
    return false;
  }
  const form = predicate.dictionaryForm || predicate.surface;
  return KAMO_SHIRENAI_LEMMAS.has(form) || predicate.surface === "しれ" || predicate.surface === "知れ";
}

function isExternalNominalizerFocusPredicateContinuation(
  tokens: readonly RuntimeHaruToken[],
  teIdx: number
): boolean {
  const relation = externalNominalizerContinuationRelationAt(tokens, teIdx - 3, {
    requireEnd: false,
    consumers: ["tail_multi_clause"]
  });
  return relation?.connectiveKind === "external_nominalizer_comparison" &&
    relation.span.endExclusive > teIdx;
}

function isExternalNominalizerSingleFocusPredicateContinuation(
  tokens: readonly RuntimeHaruToken[],
  focusIdx: number
): boolean {
  const relation = externalNominalizerContinuationRelationAt(tokens, focusIdx - 3, {
    requireEnd: false,
    consumers: ["tail_multi_clause"]
  });
  const next = tokens[focusIdx + 1];
  return relation?.connectiveKind === "external_nominalizer_comparison" &&
    relation.span.endExclusive > focusIdx &&
    next !== undefined &&
    isExternalNominalizerPredicateContinuation(tokens, focusIdx + 1);
}

function noQuoteReportingProjectionAllowedAt(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  lookups: LookupTables
): boolean {
  const predicate = tokens[predicateIdx];
  if (predicate === undefined || (predicate.pos & POS0) !== 動詞) {
    return false;
  }
  const predicateForm = predicate.dictionaryForm || predicate.surface;
  if (!lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", predicateForm, "no_quote_reporting")) {
    return false;
  }
  if (noQuoteReportingHostHasExplicitQuoteMarker(tokens, predicateIdx)) {
    return false;
  }

  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(predicateIdx);
  if (proto !== null && clause !== undefined) {
    const hasClauseSubject = clause.particleIndices.some((particleIdx) =>
      particleIdx < predicateIdx &&
      isNoQuoteReportingSubjectEvidence(tokens, particleIdx, predicateIdx, proto, lookups)
    );
    if (hasClauseSubject) {
      return true;
    }
    return scanNoQuoteReportingSubjectParticle(tokens, predicateIdx, proto, clause.start, lookups);
  }

  return scanNoQuoteReportingSubjectParticle(tokens, predicateIdx, proto, 0, lookups);
}

function scanNoQuoteReportingSubjectParticle(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  proto: ReturnType<typeof activeProtoLayout>,
  lowerBoundInclusive: number,
  lookups: LookupTables
): boolean {
  let seenContent = 0;
  for (let idx = predicateIdx - 1; idx >= lowerBoundInclusive && seenContent < 8; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      return false;
    }
    if (quoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) !== null) {
      return false;
    }
    seenContent += 1;
    if (
      isNoQuoteReportingSubjectEvidence(tokens, idx, predicateIdx, proto, lookups)
    ) {
      return true;
    }
  }
  return false;
}

function noQuoteReportingHostHasExplicitQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number
): boolean {
  const previousIdx = previousNonSpaceIndex(tokens, predicateIdx, 0);
  if (previousIdx === null) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, previousIdx, { consumers: ["tail_multi_clause"] });
  return marker !== null && marker.span.endExclusive <= predicateIdx;
}

function isNoQuoteReportingSubjectParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    (token.surface === "が" || token.surface === "は" || token.surface === "も");
}

function isNoQuoteReportingSubjectEvidence(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number,
  predicateIdx: number,
  proto: ReturnType<typeof activeProtoLayout>,
  lookups: LookupTables
): boolean {
  const particle = tokens[particleIdx];
  if (!isNoQuoteReportingSubjectParticle(particle)) {
    return false;
  }
  if (proto !== null && proto.isQuoteTrapped(particleIdx, predicateIdx)) {
    return false;
  }
  const headIdx = previousNonSpaceIndex(tokens, particleIdx, 0);
  if (headIdx === null) {
    return false;
  }
  const head = tokens[headIdx];
  if (head === undefined || (head.pos & POS0) === 助詞 || (head.pos & POS0) === 助動詞0) {
    return false;
  }
  const headForm = head.dictionaryForm || head.surface;
  if (lookups.TEMPORAL_NOUNS.has(headForm)) {
    return false;
  }
  return isPersonToken(head, lookups) || isAnimateReferentToken(head, lookups);
}

function isExternalNominalizerPredicateContinuation(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): boolean {
  const next = tokens[splitAt];
  if (next === undefined) return true;
  if (isClausePunctuationToken(next)) return false;
  if (next.surface === "は" || next.surface === "も") {
    return isExternalNominalizerPredicateContinuation(tokens, splitAt + 1);
  }
  if (predicateNominalizerRelationForToken(next, splitAt, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  })?.nominalizerKind === "no") return true;
  if ((next.pos & POS0) === 助動詞0) return true;
  if (isAdjNai(next)) {
    return true;
  }
  if ((next.pos & POS0) !== 動詞) {
    return false;
  }
  const lemma = next.dictionaryForm || next.surface;
  return (next.pos & POS1) === 非自立可能 ||
    ["いる", "居る", "ある", "有る", "しまう", "おく", "置く", "いく", "行く", "くる", "来る"].includes(lemma);
}

const PRONOMINAL_NONI_RESULT_VERBS = new Set(["する", "変える", "替える", "交換する"]);

function isPronominalNoNiResultVerb(tokens: readonly RuntimeHaruToken[], splitAt: number): boolean {
  const next = tokens[splitAt];
  if (next === undefined) return false;
  if (PRONOMINAL_NONI_RESULT_VERBS.has(next.dictionaryForm || next.surface)) {
    return true;
  }
  const sahen = detectSahenPredicateStart(tokens, splitAt);
  if (sahen !== null && sahen.hostKind === "nominal") {
    const lemma = `${sahen.nounToken.dictionaryForm || sahen.nounToken.surface}する`;
    return PRONOMINAL_NONI_RESULT_VERBS.has(lemma);
  }
  return false;
}

function isJodoshiKateikeiBoundary(tok: RuntimeHaruToken): boolean {
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)) return true;
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_)) return true;
  return false;
}

interface SegmentParseSuccess {
  readonly ok: true;
  readonly irs: readonly ClauseTailIR[];
  readonly parseInfos: readonly ClauseParseInfo[];
}

type SegmentParseResult =
  | SegmentParseSuccess
  | { readonly ok: false; readonly reason: string };

async function segmentAndParseClauses(
  input: IntegrationInput,
  boundaries: readonly DetectedClauseBoundary[]
): Promise<SegmentParseResult> {
  const clauseSlices: {
    sliceStart: number;
    sliceEnd: number;
    outgoingBoundary: ClauseBoundary;
  }[] = [];
  let prev = 0;
  for (const detected of boundaries) {
    clauseSlices.push({
      sliceStart: prev,
      sliceEnd: detected.splitAt,
      outgoingBoundary: detected.boundary
    });
    prev = detected.splitAt;
  }
  clauseSlices.push({
    sliceStart: prev,
    sliceEnd: input.tokens.length,
    outgoingBoundary: { kind: "terminal" }
  });

  const parseInfos: ClauseParseInfo[] = [];
  const ownedOutgoingBoundaries: ClauseBoundary[] = [];
  const sliceStarts: number[] = [];
  const contentRanges: { start: number; end: number }[] = [];
  for (let i = 0; i < clauseSlices.length; i++) {
    const cs = clauseSlices[i]!;
    const clauseTokens = input.tokens.slice(cs.sliceStart, cs.sliceEnd);
    const clauseInput: IntegrationInput = {
      tokens: clauseTokens,
      cursor: input.cursor.retarget(clauseTokens, 0, clauseTokens.length, cs.sliceStart),
      dictionary: input.dictionary,
      formal: input.formal,
      lookups: input.lookups,
      numeric: input.numeric,
      ...(input.numericHostReservation === undefined
        ? {}
        : { numericHostReservation: input.numericHostReservation })
    };
    const subRange = findContentRange(clauseTokens);
    if (subRange === null) {
      return { ok: false, reason: `clause ${i} has no content tokens` };
    }
    const renyouTerminalRole = renyouChuushiTerminalRoleAt(
      input.tokens,
      cs.sliceStart + subRange.start,
      cs.sliceStart + subRange.end
    );
    const parseResult = await parseSingleClause(
      clauseInput,
      subRange,
      cs.sliceStart,
      {
        allowElidedColloquialObligation: elidedColloquialObligationContextAtBoundary(cs.outgoingBoundary),
        allowRenyouChuushiTerminal: await renyouChuushiTerminalAllowedForEnd(input, cs.sliceStart + subRange.end),
        ...(renyouTerminalRole === null ? {} : { renyouChuushiTerminalRole: renyouTerminalRole }),
        allowMalformedConditionalFragmentTerminal: malformedConditionalFragmentTerminalAllowed(
          input.tokens,
          cs.sliceStart + subRange.start,
          cs.sliceStart + subRange.end,
          cs.outgoingBoundary
        ),
        outgoingBoundary: cs.outgoingBoundary,
        contextTokens: input.tokens,
        contextPos: cs.sliceStart + subRange.start,
        allowZeroNiPurposeTerminal: isZeroNiPurposeProjectionBoundaryEnd(input.cursor, cs.sliceStart + subRange.end, input.lookups)
      }
    );
    if (!parseResult.ok) {
      return { ok: false, reason: `clause ${i}: ${parseResult.reason}` };
    }
    const parsedLayer = firstAuxLayer(parseResult.info.root.tail);
    const firstParsedOp = parsedLayer?.ops[0];
    if (
      parsedLayer?.stem.kind === "noun" &&
      firstParsedOp?.kind === "connective" &&
      firstParsedOp.connective === "even_if"
    ) {
      const markerIdx = firstParsedOp.source.tokenIndices[0];
      const relation = markerIdx === undefined
        ? null
        : dewaScopeBridgeRelationAt(input.tokens, markerIdx, {
          anchorIdx: markerIdx,
          consumers: ["tail_multi_clause"]
        });
      const negativeTail = relation === null
        ? undefined
        : input.tokens[relation.span.endExclusive];
      if (negativeTail !== undefined && isNaiOrNuToken(negativeTail)) {
        return { ok: false, reason: `clause ${i}: bare demo concession cannot preempt a negative scope bridge tail` };
      }
    }
    const semanticallyHydrated = hydrateClauseParseInfoBenefactive(
      parseResult.info,
      input.tokens,
      cs.sliceStart + parseResult.info.localPredicateIdx,
      input.lookups,
      input.numeric
    );
    const hydrated: ClauseParseInfo = {
      ...semanticallyHydrated,
      root: {
        ...semanticallyHydrated.root,
        quoteBinding: cachedQuoteBindingForContentRoot(
          input.tokens,
          cs.sliceStart + parseResult.info.localPredicateIdx,
          cs.sliceStart + subRange.end,
        ),
      },
    };
    const ownedOutgoingBoundary = refineRequestTerminalOutgoingBoundary(
      hydrated.root,
      cs.outgoingBoundary
    );
    const boundaryReady = quoteBoundaryReadinessBlocker(
      input.cursor,
      ownedOutgoingBoundary,
      hydrated.root,
      input.lookups
    );
    if (boundaryReady !== null) {
      return { ok: false, reason: `clause ${i}: ${boundaryReady}` };
    }
    const rewritten = rewriteClauseParseInfoOutgoingBoundary(
      hydrated,
      ownedOutgoingBoundary,
      outgoingBoundaryRewriteOptions(input.tokens, ownedOutgoingBoundary)
    );
    parseInfos.push(normalizeClauseParseInfoTokaOwnership(projectClauseParseInfoQuotedSfp(hydrateClauseParseInfoTerminalRoleSfp(
      rewritten,
      input.tokens,
      cs.sliceStart + subRange.end
    ), ownedOutgoingBoundary), input.tokens, input.lookups,
    normalizeTokaListingBoundary(input.cursor, ownedOutgoingBoundary, input.lookups)));
    ownedOutgoingBoundaries.push(ownedOutgoingBoundary);
    sliceStarts.push(cs.sliceStart);
    contentRanges.push({ start: subRange.start, end: subRange.end });
  }

  const irs: ClauseTailIR[] = parseInfos.map((info, i) => {
    const cs = clauseSlices[i]!;
    const cr = contentRanges[i]!;
    const outgoingBoundary = normalizeTokaListingBoundary(
      input.cursor,
      ownedOutgoingBoundaries[i]!,
      input.lookups
    );
    return {
      root: info.root,
      clauseIndex: i,
      tokenSpan: { start: cs.sliceStart, end: cs.sliceEnd - 1 },
      contentSpan: { start: cs.sliceStart + cr.start, end: cs.sliceStart + cr.end },
      predicateTokenIdx: sliceStarts[i]! + info.localPredicateIdx,
      outgoingBoundary
    };
  });

  return { ok: true, irs, parseInfos };
}

function derivationalPredicateHeadEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number | null {
  if (tokens[start] === undefined) {
    return null;
  }
  let idx = start + 1;
  while (idx < tokens.length && isDerivationalHostChainToken(tokens[idx]!)) {
    idx += 1;
  }
  const suffix = tokens[idx];
  if (suffix === undefined || !isNaAdjectiveDerivationalSuffix(suffix)) {
    return null;
  }
  const chainFinal = tokens[idx - 1] ?? tokens[start];
  const profile = resolveDerivationalSuffixProfile(chainFinal, suffix.dictionaryForm);
  return profile === undefined || profile.hostForm === "noun_compound" ? null : idx + 1;
}

function isDerivationalHostChainToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助動詞0 || pos0 === 動詞;
}

function adverbialModifierChunkEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): { readonly end: number; readonly marker: AdverbialModifierMarker } | null {
  const head = tokens[start];
  if (head === undefined) {
    return null;
  }
  if (adjectiveAdverbialModifierPredicateReachable(tokens, start, lookups)) {
    return { end: start, marker: "none" };
  }
  const derivationalHeadEnd = derivationalPredicateHeadEnd(tokens, start);
  if (derivationalHeadEnd === null && !isAdverbialKeijoujiMarkerHostPos(head)) {
    return null;
  }
  if (bareAdverbialKeijoujiHostAt(tokens, start, lookups.ADVERBIAL_MODIFIER_BARE_KEIJOUJI_HOSTS)) {
    return adverbialModifierPredicateReachable(tokens, start, head, lookups)
      ? { end: start, marker: "none" }
      : null;
  }
  const niIdx = nextNonSpaceIndex(
    tokens,
    derivationalHeadEnd ?? nounCompoundSuffixRunEnd(tokens, start + 1),
    tokens.length
  );
  if (niIdx === null) {
    return null;
  }
  const ni = tokens[niIdx];
  if (
    ni === undefined ||
    (ni.pos & (POS0 | POS5A)) !== (助動詞0 | 連用形_) ||
    ni.dictionaryForm !== "だ" ||
    ni.surface !== "に"
  ) {
    return null;
  }
  if (!adverbialModifierPredicateReachable(tokens, niIdx, head, lookups)) {
    return null;
  }
  return { end: niIdx, marker: "copula_ni" };
}

function adverbialModifierPredicateReachable(
  tokens: readonly RuntimeHaruToken[],
  fromIdx: number,
  head: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  return findAdverbialModifierPredicate(tokens, fromIdx, {
    allowLightVerbPredicate: isAdverbialMannerNounHead(head, lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS),
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS
  }) !== null;
}

function adjectiveAdverbialModifierPredicateReachable(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables | undefined
): boolean {
  return adjectiveAdverbialModifiedPredicate(
    tokens,
    start,
    lookups === undefined ? undefined : adjectiveAdverbialModifierLookupOptions(lookups)
  ) !== null;
}

function adverbialModifierTerminalAllowedAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): AdverbialModifierMarker | null {
  return adverbialModifierChunkEnd(tokens, start, lookups)?.marker ?? null;
}

const ELIDED_ADVERBIAL_TARGET_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

function isSoudaYotaiAdverbialModifierBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  if (appearancePerceptionProjectionForToken(tokens[end - 1]) !== "sou_appearance") {
    return false;
  }
  if (
    copulaNiMarkerRelationForToken(tokens[end], end, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  if (perceptionCarrierVerbMatch(tokens[end + 1], tokens[end + 2]) !== null) {
    return false;
  }
  if (findAdverbialModifierPredicate(tokens, end, {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS
  }) !== null) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, end + 1),
    ELIDED_ADVERBIAL_TARGET_CLOSURES
  );
}

function isDeclaredProjectionCarrierAdverbialBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  lookups: LookupTables
): boolean {
  const declared = declaredProjectionCarrierTokenBranchEndingAt(tokens, end);
  if (declared === null || declared.branch.terminal !== "adverbial_modifier" || declared.markerStart <= start) {
    return false;
  }
  if (findAdverbialModifierPredicate(tokens, end, {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS
  }) !== null) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, end + 1),
    ELIDED_ADVERBIAL_TARGET_CLOSURES
  );
}

type ParseTailChunkResult =
  | {
    readonly ok: true;
    readonly root: ParsedTailRoot;
    readonly info: ClauseParseInfo<ParsedTailRoot>;
    readonly predicateTokenIdx: number;
    readonly outgoingBoundary: ClauseBoundary;
  }
  | { readonly ok: false; readonly reason: string; readonly headHypothesis?: HeadHypothesisCarrier };

function parseTailChunkOnly(
  input: IntegrationInput,
  start: number,
  end: number,
  outgoingBoundary: ClauseBoundary,
  hostRole: TailChunkHostRole = "clause_predicate"
): Promise<ParseTailChunkResult> {
  const key = `parseTailChunkOnly|${start}|${end}|${JSON.stringify(outgoingBoundary)}|${hostRole}`;
  return lineMemo(input, key, () => parseTailChunkOnlyImpl(input, start, end, outgoingBoundary, hostRole));
}

type TailChunkHostRole = "clause_predicate" | "nominal_head" | "quoted_nominal_host";

async function parseTailChunkOnlyImpl(
  input: IntegrationInput,
  start: number,
  rawEnd: number,
  outgoingBoundary: ClauseBoundary,
  hostRole: TailChunkHostRole
): Promise<ParseTailChunkResult> {
  const end = previousNonSpaceIndex(input.tokens, rawEnd + 1, start) ?? rawEnd;
  const ownedOutgoingBoundary = normalizeTokaListingBoundary(input.cursor, outgoingBoundary, input.lookups);
  const chunkTokens = input.tokens.slice(start, end + 1);
  const chunkInput: IntegrationInput = {
    tokens: chunkTokens,
    cursor: input.cursor.retarget(chunkTokens, 0, chunkTokens.length, start),
    dictionary: input.dictionary,
    formal: input.formal,
    lookups: input.lookups,
    numeric: input.numeric,
    ...(input.synthesizeEntry === undefined ? {} : { synthesizeEntry: input.synthesizeEntry }),
    ...(input.numericHostReservation === undefined
      ? {}
      : { numericHostReservation: input.numericHostReservation })
  };
  const renyouTerminalRole = renyouChuushiTerminalRoleAt(input.tokens, start, end);
  const allowAdverbialModifierTerminal: AdverbialModifierMarker | undefined =
    adverbialModifierTerminalAllowedAt(input.tokens, start, input.lookups) ??
    (isSoudaYotaiAdverbialModifierBoundaryEnd(input.tokens, end, input.lookups) ? "copula_ni" : undefined);
  const structuralAttributiveBoundaryPayload = (
    ownedOutgoingBoundary.kind !== "terminal" &&
    ownedOutgoingBoundary.connectiveKind === "predicate_projection_quote_attributive"
      ? undefined
      : classifyStructuralAttributiveBoundaryPayload(
        input.tokens,
        start,
        end,
        end + 1,
        input.lookups
      ) ?? structuralAttributiveAssemblerSuffixPayload(input.tokens, start, end + 1, input.lookups)
  ) ?? undefined;
  const attributiveBoundaryPayload = ownedOutgoingBoundary.kind === "terminal"
    ? structuralAttributiveBoundaryPayload
    : ownedOutgoingBoundary.connectiveKind === "predicate_projection_quote_attributive"
      ? ownedOutgoingBoundary.attributiveBoundary
      : ownedOutgoingBoundary.attributiveBoundary ?? structuralAttributiveBoundaryPayload;
  const parseResult = await parseSingleClause(
    chunkInput,
    { start: 0, end: end - start },
    start,
    {
      allowElidedColloquialObligation: hostRole === "quoted_nominal_host"
        ? "none"
        : elidedColloquialObligationContextAtBoundary(ownedOutgoingBoundary),
      allowRenyouChuushiTerminal: hostRole === "nominal_head" ||
        (await renyouChuushiTerminalAllowedForEnd(input, end)) ||
        canLocalizeStandaloneRenyouFragment(input.tokens, start, end, outgoingBoundary) ||
        renyouChuushiClosesDetachedUtteranceAt(input.tokens, end, outgoingBoundary, input.lookups) ||
        youNiCarrierRenyouChuushiSpaceTerminalAllowed(input.tokens, end),
      ...(renyouTerminalRole === null ? {} : { renyouChuushiTerminalRole: renyouTerminalRole }),
      allowMalformedConditionalFragmentTerminal: malformedConditionalFragmentTerminalAllowed(
        input.tokens,
        start,
        end,
        outgoingBoundary
      ),
      allowPlainNominalizerTerminal: isPlainNominalizerParticleFrameEnd(input.tokens, end, input.lookups) ||
        isPlainNominalizerZeroFollowerFrameEnd(input.tokens, end, input.lookups),
      ...(() => {
        const elidedDewaNegativeBody = elidedDewaNegativeBodyAllowedAt(input.tokens, end, ownedOutgoingBoundary);
        return elidedDewaNegativeBody === null ? {} : { allowElidedDewaNegativeBody: elidedDewaNegativeBody };
      })(),
      allowElidedNominalizerTerminal: isZeroNominalizedParallelMoFrameEnd(input.tokens, end) ||
        isBekiRentaiNominalizedFrameEnd(input.tokens, end, input.lookups),
      allowZeroNiPurposeTerminal: isZeroNiPurposeProjectionBoundaryEnd(input.cursor, end, input.lookups),
      allowAdnominalCopulaTerminal: chunkEndsWithAdnominalCopulaAttributiveHead(input.tokens, start, end, input.lookups),
      allowRenyouCompoundPrenominalTerminal:
        renyouCompoundPrenominalAttributiveTerminalAllowed(end) &&
        !(await renyouPredicateHeadLacksPredicateSense(input, start)),
      allowExplicitAdnominalNoTerminal: attributiveBoundaryPayload?.explicitAdnominalMarker !== undefined,
      ...(allowAdverbialModifierTerminal === undefined ? {} : { allowAdverbialModifierTerminal }),
      allowNoQuoteReportingProjection: noQuoteReportingProjectionAllowedAt(input.tokens, start, input.lookups),
      outgoingBoundary: ownedOutgoingBoundary,
      ...(attributiveBoundaryPayload === undefined ? {} : { attributiveBoundaryPayload }),
      contextTokens: input.tokens,
      contextPos: start,
      suppressFormalToSuruControl: shouldSuppressFormalToSuruControlForAttributiveHead(input.tokens, start, end, input.lookups),
      ...(hostRole === "quoted_nominal_host" ? { quotedNominalHost: true } : {})
    }
  );
  if (!parseResult.ok) return parseResult;
  const predicateTokenIdx = start + parseResult.info.localPredicateIdx;
  const hydratedInfo = hydrateClauseParseInfoBenefactive(
    parseResult.info,
    input.tokens,
    predicateTokenIdx,
    input.lookups,
    input.numeric
  );
  const refinedOutgoingBoundary = refineRequestTerminalOutgoingBoundary(
    hydratedInfo.root,
    ownedOutgoingBoundary
  );
  const rewrittenInfo = normalizeClauseParseInfoTokaOwnership(projectClauseParseInfoQuotedSfp(hydrateClauseParseInfoTerminalRoleSfp(
    rewriteClauseParseInfoPunctuatedAttributive(
      rewriteClauseParseInfoOutgoingBoundary(
        hydratedInfo,
        refinedOutgoingBoundary,
        outgoingBoundaryRewriteOptions(input.tokens, refinedOutgoingBoundary)
      ),
      input.tokens,
      start,
      end,
      input.lookups
    ),
    input.tokens,
    end
  ), refinedOutgoingBoundary), input.tokens, input.lookups, refinedOutgoingBoundary);
  const info = hydrateConditionalQuoteMarkerContinuation(
    materializeQuestionQuoteAttributiveCarrier(rewrittenInfo, attributiveBoundaryPayload),
    input.cursor,
    input.lookups
  );
  const boundaryReady = quoteBoundaryReadinessBlocker(input.cursor, refinedOutgoingBoundary, info.root, input.lookups);
  if (boundaryReady !== null) {
    return {
      ok: false,
      reason: boundaryReady,
      ...(info.root.headHypothesis === undefined ? {} : { headHypothesis: info.root.headHypothesis })
    };
  }
  return {
    ok: true,
    root: info.root,
    info,
    predicateTokenIdx,
    outgoingBoundary: refinedOutgoingBoundary
  };
}

function materializeQuestionQuoteAttributiveCarrier<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  attributiveBoundary: AttributiveBoundaryPayload | undefined
): ClauseParseInfo<Root> {
  if (
    attributiveBoundary === undefined ||
    attributiveBoundary.head.dictionaryForm !== "こと" ||
    info.root.tail.kind !== "auxLayer" ||
    info.root.tail.stem.stemMood !== "volitional"
  ) {
    return info;
  }
  const ops = info.root.tail.ops;
  const connective = ops.at(-1);
  if (
    connective?.kind !== "connective" ||
    connective.connective !== "question_quotative" ||
    connective.allomorph !== "tte"
  ) {
    return info;
  }
  const carrier = buildPredicateQuoteCarrierOp(
    connective.source,
    "question_toiu",
    connective.surface
  );
  return {
    ...info,
    root: {
      ...info.root,
      tail: {
        ...info.root.tail,
        ops: [...ops.slice(0, -1), carrier],
        terminal: "attributive",
        terminalPayload: attributiveBoundary
      }
    }
  };
}

function hydrateConditionalQuoteMarkerContinuation<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ClauseParseInfo<Root> {
  if (info.root.tail.kind !== "auxLayer") {
    return info;
  }
  let changed = false;
  const ops = info.root.tail.ops.map((op) => {
    if (op.kind !== "connective" || op.connective !== "conditional") {
      return op;
    }
    const sourceEnd = op.source.tokenIndices.length === 0
      ? null
      : Math.max(...op.source.tokenIndices);
    if (sourceEnd === null) {
      return op;
    }
    const relation = quoteStructuralRelationContainingContentToken(cursor, sourceEnd, lookups);
    if (relation === undefined || relation.quote.markerIdx <= sourceEnd) {
      return op;
    }
    changed = true;
    return markConditionalQuoteMarkerContinuationOp(op);
  });
  return changed
    ? { ...info, root: { ...info.root, tail: { ...info.root.tail, ops } } }
    : info;
}

function normalizeClauseParseInfoTokaOwnership<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  outgoingBoundary: ClauseBoundary,
): ClauseParseInfo<Root> {
  const tokaListingBoundaryMarkerIdx = outgoingBoundary.kind !== "terminal" &&
    (outgoingBoundary.connectiveKind === "conditional" ||
      (outgoingBoundary.connectiveKind === "exemplification" && outgoingBoundary.surface === "とか"))
    ? outgoingBoundary.tokenSpan.start
    : null;
  const normalizeLayer = (layer: AuxLayerNode): AuxLayerNode => {
    const ops: AuxOpNode[] = [];
    let changed = false;
    for (let index = 0; index < layer.ops.length; index += 1) {
      const op = layer.ops[index]!;
      const next = layer.ops[index + 1];
      if (
        op.kind === "connective" && op.connective === "listing" &&
        next?.kind === "connective" &&
        (next.connective === "exemplification"
          ? next.source.tokenIndices[0] !== undefined &&
            op.source.tokenIndices.at(-1) !== undefined &&
            next.source.tokenIndices[0] === op.source.tokenIndices.at(-1)! + 1
          : next.connective === "conditional" && next.surface === "と" &&
            listingDeclaredClosureCoversOp(tokens, op, next))
      ) {
        ops.push({
          ...op,
          source: {
            tokens: [...op.source.tokens, ...next.source.tokens],
            tokenIndices: [...op.source.tokenIndices, ...next.source.tokenIndices],
          },
        });
        index += 1;
        changed = true;
        continue;
      }
      if (
        op.kind === "connective" && op.connective === "conditional" &&
        op.surface === "と" && next === undefined && tokaListingBoundaryMarkerIdx !== null
      ) {
        const toIdx = op.source.tokenIndices.at(-1);
        const kaIdx = toIdx === undefined
          ? null
          : nextNonSpaceIndex(tokens, toIdx + 1, tokens.length);
        if (
          toIdx === tokaListingBoundaryMarkerIdx && kaIdx !== null &&
          kaOwnershipKindAt(tokens, kaIdx, lookups) === "toka_listing"
        ) {
          ops.push({ ...op, connective: "exemplification", surface: "とか" });
          changed = true;
          continue;
        }
      }
      if (op.kind === "connective" && op.connective === "quotative" && next?.kind === "connective" && next.connective === "question_content") {
        const kaIdx = next.source.tokenIndices.at(-1);
        if (kaIdx !== undefined && kaOwnershipKindAt(tokens, kaIdx, lookups) === "toka_listing") {
          ops.push(tokaExemplificationOp(op, next));
          index += 1;
          changed = true;
          continue;
        }
      }
      if (op.kind === "connective" && op.connective === "quotative" && next?.kind === "predicateQuoteCarrier" && next.style === "question_toiu") {
        const kaOffset = next.source.tokens.findIndex((token) => morphSurface(token) === "か");
        const kaIdx = kaOffset < 0 ? undefined : next.source.tokenIndices[kaOffset];
        if (kaIdx !== undefined && kaOwnershipKindAt(tokens, kaIdx, lookups) === "toka_listing") {
          const kaSource: OpSource = { tokens: [next.source.tokens[kaOffset]!], tokenIndices: [kaIdx] };
          ops.push(tokaExemplificationOp(op, createConnectiveOp({  connective: "question_content", surface: "か", source: kaSource })));
          ops.push({
            ...next,
            style: "compact_toiu",
            surface: "という",
            source: {
              tokens: next.source.tokens.filter((_, sourceIndex) => sourceIndex !== kaOffset),
              tokenIndices: next.source.tokenIndices.filter((_, sourceIndex) => sourceIndex !== kaOffset),
            },
          });
          index += 1;
          changed = true;
          continue;
        }
      }
      ops.push(op);
    }
    return changed ? { ...layer, ops } : layer;
  };
  const normalizeTail = (tail: TailNode): TailNode => {
    if (tail.kind === "auxLayer") return normalizeLayer(tail);
    const inner = normalizeLayer(tail.inner);
    const outer = normalizeTail(tail.outer);
    return inner === tail.inner && outer === tail.outer ? tail : { ...tail, inner, outer };
  };
  const tail = normalizeTail(info.root.tail);
  return tail === info.root.tail ? info : { ...info, root: { ...info.root, tail } };
}

function listingDeclaredClosureCoversOp(
  tokens: readonly RuntimeHaruToken[],
  listing: ConnectiveOp,
  closureOp: ConnectiveOp,
): boolean {
  const markerStart = listing.source.tokenIndices[0];
  const markerEnd = listing.source.tokenIndices.at(-1);
  const closureStart = closureOp.source.tokenIndices[0];
  const closureEnd = closureOp.source.tokenIndices.at(-1);
  if (
    markerStart === undefined || markerEnd === undefined ||
    closureStart === undefined || closureEnd === undefined ||
    closureEnd < markerEnd
  ) {
    return false;
  }
  const scopeEnd = closureEnd + 1;
  const cursor = new TokenCursor(tokens, markerStart, scopeEnd, markerStart);
  for (const match of relationConnectiveSpansAt(cursor)) {
    if (match.endExclusive !== markerEnd + 1) {
      continue;
    }
    const closure = relationDiscontinuousClosureSpanAfter(
      cursor.fork(match.endExclusive, scopeEnd, match.endExclusive),
      match,
    );
    if (closure !== null && closure.start === closureStart && closure.endExclusive === scopeEnd) {
      return true;
    }
  }
  return false;
}

function tokaExemplificationOp(quotative: ConnectiveOp, ka: ConnectiveOp): ConnectiveOp {
  return createConnectiveOp({

    connective: "exemplification",
    surface: `${quotative.surface}${ka.surface}`,
    source: {
      tokens: [...quotative.source.tokens, ...ka.source.tokens],
      tokenIndices: [...quotative.source.tokenIndices, ...ka.source.tokenIndices],
    },
  });
}

function canLocalizeStandaloneRenyouFragment(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  outgoingBoundary: ClauseBoundary
): boolean {
  return canLocalizeStandaloneTailFragment(tokens, start, end, outgoingBoundary);
}

function malformedConditionalFragmentTerminalAllowed(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  outgoingBoundary: ClauseBoundary
): boolean {
  const conditional = conditionalTailConnectiveRelationForToken(tokens[end], end, {
    consumers: ["tail_multi_clause"]
  });
  return conditional !== null ||
    canLocalizeStandaloneTailFragment(tokens, start, end, outgoingBoundary);
}

export function elidedColloquialObligationContextAtBoundary(boundary: ClauseBoundary): ElidedColloquialObligationContext {
  if (boundary.kind === "terminal") {
    return "terminal";
  }
  return (boundary.quoteBoundary !== undefined && boundary.connectiveKind === "quotative") ||
      boundary.connectiveKind === "exemplification"
    ? "quote_content_terminal"
    : "none";
}

function canLocalizeStandaloneTailFragment(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  outgoingBoundary: ClauseBoundary
): boolean {
  if (outgoingBoundary.kind !== "terminal" || end < start) {
    return false;
  }
  const next = tokens[end + 1];
  return next === undefined || isClausePunctuationToken(next);
}

function standaloneRenyouFragmentWarningsForParsedChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  root: TailRoot,
  outgoingBoundary: ClauseBoundary,
  lookups: LookupTables
): readonly Warning[] {
  if (
    !tailRootHasRenyouChuushiTerminal(root) ||
    !canLocalizeStandaloneRenyouFragment(tokens, start, end, outgoingBoundary) ||
    hasRenyouChuushiContinuationForEnd(tokens, end, lookups) ||
    renyouChuushiClosesDetachedUtteranceAt(tokens, end, outgoingBoundary, lookups)
  ) {
    return [];
  }
  if (
    root.tail.kind === "auxLayer" &&
    root.sfp !== null &&
    (
      root.sfp.effect !== null ||
      copulaContinuativeExplanatoryClosureApplies(root.tail, root.sfp, lookups) ||
      copulaContinuativeObliqueRecoveryApplies(root.tail, root.sfp, lookups)
    )
  ) {
    return [];
  }
  return [{
    type: "out_of_subset_default",
    severity: "warning",
    opKind: "terminal_renyou_fragment",
    span: { start, end },
    message: "Terminal 連用 fragment rendered as a connective fragment instead of falling back to legacy tail."
  }];
}

function missingConditionalMarkerWarningsForRoot(root: TailRoot): readonly Warning[] {
  if (root.tail.kind !== "auxLayer") {
    return [];
  }
  return root.tail.ops
    .filter((op) => op.kind === "connective" && op.recovery === "missing_conditional_marker")
    .map((op) => {
      const start = op.source.tokenIndices[0] ?? 0;
      const end = op.source.tokenIndices[op.source.tokenIndices.length - 1] ?? start;
      return {
        type: "out_of_subset_default",
        severity: "warning",
        opKind: "malformed_conditional_fragment",
        span: { start, end },
        message: "Malformed 仮定形 fragment recovered as a conditional connective with an omitted ば marker."
      } satisfies Warning;
    });
}

function renderParsedChunk(
  input: IntegrationInput,
  start: number,
  end: number,
  info: ClauseParseInfo,
  outgoingBoundary: ClauseBoundary
): IntegrationResult {
  const predicateTokenIdx = start + info.localPredicateIdx;
  const peer: ClauseTailIR = {
    root: info.root,
    clauseIndex: 0,
    tokenSpan: { start, end },
    contentSpan: { start, end },
    predicateTokenIdx,
    outgoingBoundary
  };
  const result = commitAndRenderSingleClause(info, {
    clauseIndex: 0,
    predicateTokenIdx: peer.predicateTokenIdx,
    peerClauses: [peer],
    ownClause: peer,
    tokens: input.tokens,
    lookups: input.lookups,
    numeric: input.numeric
  });
  return result;
}

function hydrateClauseParseInfoBenefactive<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): ClauseParseInfo<Root> {
  const benefactiveRoot = hydrateBenefactivePayloads(info.root, { tokens, predicateTokenIdx, lookups, layout: undefined });
  const root = hydrateAspectSemanticPayloads(benefactiveRoot, tokens, predicateTokenIdx, lookups, numeric);
  return root === info.root ? info : { ...info, root };
}

function rewriteClauseParseInfoOutgoingBoundary<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  outgoingBoundary: ClauseBoundary,
  options: OutgoingBoundaryRewriteOptions = {}
): ClauseParseInfo<Root> {
  const root = rewriteRootOutgoingBoundaryConnective(info.root, outgoingBoundary, options);
  return root === info.root ? info : { ...info, root };
}

function projectClauseParseInfoQuotedSfp<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  outgoingBoundary: ClauseBoundary,
): ClauseParseInfo<Root> {
  const sfp = info.root.sfp;
  if (
    sfp === null ||
    outgoingBoundary.kind === "terminal" ||
    outgoingBoundary.connectiveKind !== "quotative" ||
    sfp.quoteProjection !== undefined
  ) return info;
  const quoteProjection = sfp.effect === "na_prohib"
    ? "prohibitive" as const
    : sfp.effect === "na_excl" ||
        sfp.effect === "na_soft_imperative" ||
        sfp.effect === "kana" ||
        sfp.effect === "kke" ||
        isKaFamilyQuestionSfpEffect(sfp.effect) ||
        sfp.effect === "quotative_command"
      ? "terminal_mood" as const
      : null;
  if (quoteProjection === null) return info;
  const focusParticle = quoteProjection === "terminal_mood"
    ? outgoingBoundary.quoteBoundary?.focusParticle
    : undefined;
  return {
    ...info,
    root: {
      ...info.root,
      sfp: {
        ...sfp,
        quoteProjection,
        ...(focusParticle === undefined ? {} : { quoteFocusParticle: focusParticle }),
      },
    },
  };
}

interface OutgoingBoundaryRewriteOptions {
  readonly teFormRole?: TeFormConnectiveRole;
}

function outgoingBoundaryRewriteOptions(
  tokens: readonly RuntimeHaruToken[],
  outgoingBoundary: ClauseBoundary
): OutgoingBoundaryRewriteOptions {
  if (
    outgoingBoundary.kind !== "terminal" &&
    outgoingBoundary.connectiveKind === "te_form" &&
    teOkuEvaluationReasonBoundaryAt(tokens, outgoingBoundary.tokenIdx)
  ) {
    return { teFormRole: "reason" };
  }
  return {};
}

function rewriteClauseParseInfoPunctuatedAttributive<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): ClauseParseInfo<Root> {
  const boundary = classifyAttributiveChunkBoundary(tokens, startIdx, contentEndIdx, lookups);
  if (boundary === null) {
    return info;
  }
  if (tailRootHasClauseBoundaryOp(info.root)) {
    return info;
  }
  if (tailRootHasRenyouChuushiTerminal(info.root)) {
    return info;
  }
  if (tailRootHasAdverbialModifierTerminal(info.root)) {
    return info;
  }
  if (attributiveRewriteRestsOnClosedUtterance(info.root, contentEndIdx, lookups)) {
    return info;
  }
  const root = markTailRootAttributiveTerminal(info.root, boundary.payload);
  return root === info.root ? info : { ...info, root };
}

function attributiveRewriteRestsOnClosedUtterance(
  root: TailRootBase,
  fallbackCloseIdx: number,
  lookups: LookupTables
): boolean {
  return utteranceClosedForAttributiveProjection(
    activeProtoUtteranceClosureRunAt(tailRootUtteranceCloseIndex(root, fallbackCloseIdx)),
    root.sfp?.effect,
    lookups.SFP_UTTERANCE_CLOSING_EFFECTS
  );
}

function tailRootUtteranceCloseIndex(root: TailRootBase, fallbackCloseIdx: number): number {
  const layer = firstAuxLayer(root.tail);
  if (layer === null) {
    return fallbackCloseIdx;
  }
  const consumed = auxLayerConsumedSourceSequence(layer, root.sfp ?? null);
  const last = consumed[consumed.length - 1];
  return last === undefined ? fallbackCloseIdx : Math.max(fallbackCloseIdx, last[0] + 1);
}

function classifyAttributiveChunkBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): { readonly payload?: AttributiveBoundaryPayload } | null {
  if (spaceSeparatesTailChunkFromFollowingPostverbClause(tokens, startIdx, contentEndIdx + 1, lookups)) {
    return null;
  }
  if (terminalCopulaSeparatedFromFollowingClause(tokens, startIdx, contentEndIdx + 1, lookups)) {
    return null;
  }
  if (whitespaceJunctureEndsTailChunkAt(tokens, startIdx, contentEndIdx + 1)) {
    return null;
  }
  if (pauseJunctureEndsTailChunkAt(tokens, startIdx, contentEndIdx + 1)) {
    return null;
  }
  if (terminalOnlyPredicateEndpointClosesBefore(tokens, startIdx, contentEndIdx + 1)) {
    return null;
  }
  if (sliceAdmittedHostClosesClauseAtTerminalForm(tokens, startIdx, contentEndIdx, lookups)) {
    return null;
  }
  if (isPredicateScopeCarrierSuffixStart(tokens, contentEndIdx + 1)) {
    return {};
  }
  if (isPlainNominalizerParticleFrameEnd(tokens, contentEndIdx + 1, lookups)) {
    return {};
  }
  const directPayload = classifyStructuralAttributiveBoundaryPayload(
    tokens,
    startIdx,
    contentEndIdx,
    contentEndIdx + 1,
    lookups
  );
  if (directPayload !== null) {
    return { payload: directPayload };
  }
  const splitAt = attributiveBoundarySplitAt(tokens, startIdx, contentEndIdx, lookups);
  if (splitAt === null) {
    return null;
  }
  const payload = classifyStructuralAttributiveBoundaryPayload(tokens, startIdx, contentEndIdx, splitAt, lookups);
  return payload === null ? null : { payload };
}

function isSliceAdmittedPredicateHostStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  return isDeicticCopulaPredicateStart(tokens, idx, lookups) ||
    isNominalEvidentialRashiiPredicateStart(tokens, idx, lookups) ||
    isClassicalJaCopulaNominalHostStart(tokens, idx, lookups);
}

function isClassicalJaCopulaNominalHostStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const host = tokens[idx];
  if (host === undefined || !isNominalCopulaHostPos(host.pos)) return false;
  const copulaIdx = nounCompoundSuffixRunEnd(tokens, idx + 1, host, lookups);
  const copula = tokens[copulaIdx];
  if (copula === undefined || (copula.pos & POS4) !== 助動詞_ジャ) return false;
  return matchCopula(tokens, copulaIdx, lookups) !== null;
}

function sliceAdmittedHostClosesClauseAtTerminalForm(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  if (!isSliceAdmittedPredicateHostStart(tokens, startIdx, lookups)) {
    return false;
  }
  return closesAtTerminalPredicateForm(tokens, startIdx, contentEndIdx);
}

function closesAtTerminalPredicateForm(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  let idx = contentEndIdx;
  while (idx > startIdx && ((tokens[idx]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    idx -= 1;
  }
  const closing = tokens[idx];
  if (closing === undefined || (closing.pos & POS5A) !== 終止形_) {
    return false;
  }
  const pos0 = closing.pos & POS0;
  return pos0 === 助動詞0 || pos0 === 形容詞0;
}

function shouldSuppressFormalToSuruControlForAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  _startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  const splitAt = nextNonSpaceIndex(tokens, contentEndIdx + 1, tokens.length) ?? contentEndIdx + 1;
  if (!clauseBoundaryEventsForRuntimeTokens(tokens, lookups).some((event) => event.kind === "attributive" && event.splitAt === splitAt)) {
    return false;
  }
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const head = tokens[headIdx];
  if (!isNominalLikeAttributiveHead(head)) {
    return false;
  }
  return classifyAttributiveHeadKind(head) === "ordinary_nominal";
}

function renyouCompoundPrenominalAttributiveTerminalAllowed(contentEndIdx: number): boolean {
  return activeProtoLayout()?.isRenyouCompoundPrenominalHead(contentEndIdx + 1) === true;
}

function isRenyouCompoundPrenominalResultativeState(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  splitAt: number,
  head: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  if (
    splitAt !== contentEndIdx + 1 ||
    !renyouCompoundPrenominalAttributiveTerminalAllowed(contentEndIdx) ||
    isSettingAdjunctAttributiveHead(head, lookups)
  ) {
    return false;
  }
  const end = tokens[contentEndIdx];
  if (end === undefined) {
    return false;
  }
  if (isRareruAuxiliaryToken(end)) {
    return true;
  }
  return isVerbPredicateToken(end) && lookups.isTeIruResultativeVerb(end.dictionaryForm);
}

function attributiveBoundarySplitAt(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): number | null {
  const directSplitAt = contentEndIdx + 1;
  const events = clauseBoundaryEventsForRuntimeTokens(tokens, lookups);
  if (events.some((event) => event.kind === "attributive" && event.splitAt === directSplitAt)) {
    return directSplitAt;
  }
  const nonSpaceSplitAt = nextNonSpaceIndex(tokens, directSplitAt, tokens.length);
  if (
    nonSpaceSplitAt !== null &&
    nonSpaceSplitAt !== directSplitAt &&
    events.some((event) => event.kind === "attributive" && event.splitAt === nonSpaceSplitAt)
  ) {
    return nonSpaceSplitAt;
  }
  for (let markerIdx = startIdx + 1; markerIdx < contentEndIdx; markerIdx += 1) {
    if (toiuAttributiveTailEnd(tokens, markerIdx, tokens.length) !== contentEndIdx + 1) {
      continue;
    }
    const boundarySplitAt = toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups);
    if (
      boundarySplitAt !== null &&
      events.some((event) => event.kind === "attributive" && event.splitAt === boundarySplitAt)
    ) {
      return boundarySplitAt;
    }
  }
  return null;
}

function tailRootHasClauseBoundaryOp(root: TailRootBase): boolean {
  return root.tail.kind === "auxLayer" && root.tail.ops.some((op) =>
    op.kind === "connective" ||
    (op.kind === "copula" && op.variant === "conditional_nara")
  );
}

function stripTrailingConnectiveForAttributiveHost<Root extends TailRootBase>(root: Root): Root {
  if (root.tail.kind !== "auxLayer") return root;
  const ops = root.tail.ops;
  if (ops.length === 0 || ops[ops.length - 1]?.kind !== "connective") return root;
  return {
    ...root,
    tail: { ...root.tail, ops: ops.slice(0, -1) }
  };
}

function markTailRootAttributiveTerminal<Root extends TailRootBase>(
  root: Root,
  payload?: AttributiveBoundaryPayload
): Root {
  if (root.tail.kind !== "auxLayer") {
    return root;
  }
  const ops = normalizeTosuruModeForAttributivePayload(root.tail.ops, payload);
  if (root.tail.terminal === "attributive") {
    if (payload === undefined && ops === root.tail.ops) {
      return root;
    }
    return {
      ...root,
      tail: {
        ...root.tail,
        ops,
        ...(payload === undefined ? {} : { terminalPayload: payload })
      }
    };
  }
  return {
    ...root,
    tail: {
      ...root.tail,
      ops,
      terminal: "attributive",
      ...(payload === undefined ? {} : { terminalPayload: payload })
    }
  };
}

function normalizeTosuruModeForAttributivePayload(
  ops: readonly AuxOpNode[],
  payload: AttributiveBoundaryPayload | undefined
): readonly AuxOpNode[] {
  const follower = payload?.source.tokens[0];
  if (follower === undefined) {
    return ops;
  }
  let changed = false;
  const normalized = ops.map((op): AuxOpNode => {
    if (
      op.kind !== "predicateQuoteCarrier" ||
      op.style !== "suru_attributive" ||
      op.tosuruMode !== "resultative_make"
    ) {
      return op;
    }
    const carrier = op.source.tokens.at(-1);
    if (carrier === undefined || !tosuruResultativeMakeYieldsToAttributiveQuoteHead(carrier, follower)) {
      return op;
    }
    changed = true;
    return { ...op, tosuruMode: "quote" };
  });
  return changed ? normalized : ops;
}

function hydrateClauseParseInfoTerminalRoleSfp<Root extends TailRootBase>(
  info: ClauseParseInfo<Root>,
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): ClauseParseInfo<Root> {
  const root = hydrateTerminalRoleSfp(info.root, tokens, contentEndIdx);
  return root === info.root ? info : { ...info, root };
}

function hydrateTerminalRoleSfp<Root extends TailRootBase>(
  root: Root,
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): Root {
  if (root.sfp !== null) {
    const markerIdx = root.sfp.source.tokenIndices.at(-1);
    const punctuationIdx = markerIdx === undefined
      ? null
      : nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
    let runIdx = punctuationIdx;
    let emphaticQuestion = false;
    while (
      isKaFamilyQuestionSfpEffect(root.sfp.effect) &&
      root.sfp.emphaticQuestion !== true &&
      runIdx !== null
    ) {
      if (hasHardTerminalPunctuationClass(tokens[runIdx], runIdx, ["exclamation"], ["tail_render"])) {
        emphaticQuestion = true;
      }
      if (!hasHardTerminalPunctuationClass(
        tokens[runIdx],
        runIdx,
        ["question", "exclamation", "japanese_period", "ascii_period", "ellipsis"],
        ["tail_render"],
      )) {
        break;
      }
      runIdx = nextNonSpaceIndex(tokens, runIdx + 1, tokens.length);
    }
    return emphaticQuestion
      ? { ...root, sfp: { ...root.sfp, emphaticQuestion: true } }
      : root;
  }
  const question = terminalQuestionPunctuationSfpNodeAt(root, tokens, contentEndIdx);
  if (question !== null) {
    return { ...root, sfp: question };
  }
  const sfp = terminalRoleSfpNodeAt(tokens, contentEndIdx);
  if (sfp === null) {
    return root;
  }
  return { ...root, sfp };
}

function terminalQuestionPunctuationSfpNodeAt(
  root: TailRootBase,
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): SfpNode | null {
  if (!tailRootHasNoHeadNegativeScopeBridge(root)) {
    return null;
  }
  const tokenIdx = nextNonSpaceIndex(tokens, contentEndIdx + 1) ?? contentEndIdx + 1;
  const terminal = matchNodaNoKaNegativeConfirmTerminalTail(tokens, tokenIdx, tokens.length, {
    consumers: ["tail_multi_clause"]
  });
  if (terminal === null || terminal.contentEndExclusive !== tokenIdx) {
    return null;
  }
  const token = tokens[terminal.questionIdx];
  if (token === undefined) {
    return null;
  }
  return {
    effect: "neg_confirm_q",
    surface: token.surface,
    consumed: 0,
    repeatCount: 1,
    source: { tokens: [token], tokenIndices: [terminal.questionIdx] }
  };
}

function tailRootHasNoHeadNegativeScopeBridge(root: TailRootBase): boolean {
  if (root.tail.kind !== "auxLayer") {
    return false;
  }
  const last = root.tail.ops.at(-1);
  const bridge = last?.kind === "modal" && last.modal === "noda"
    ? root.tail.ops.at(-2)
    : last;
  return bridge?.kind === "scopeBridge" &&
    bridge.head === "no" &&
    bridge.polarity === "negative" &&
    bridge.chainDepth === 1;
}

function terminalRoleSfpNodeAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): SfpNode | null {
  const trailing = tokens[contentEndIdx];
  const after = terminalRoleSfpFromToken(trailing, contentEndIdx, "after");
  if (after !== null) {
    return after;
  }
  const next = tokens[contentEndIdx + 1];
  return terminalRoleSfpFromToken(next, contentEndIdx + 1, "before");
}

function terminalRoleSfpFromToken(
  token: RuntimeHaruToken | undefined,
  tokenIdx: number,
  side: "before" | "after"
): SfpNode | null {
  if (token === undefined || tokenIdx < 0) {
    return null;
  }
  const marker = side === "before" ? token.terminalRoleSfpBefore : token.terminalRoleSfpAfter;
  if (marker === undefined) {
    return null;
  }
  const countFromMarker = roleCatNyaCount(marker);
  if (countFromMarker <= 0) {
    return null;
  }
  const explicitCount = side === "before" ? token.terminalRoleSfpBeforeCount : token.terminalRoleSfpAfterCount;
  return {
    effect: "role_cat_nya",
    surface: marker,
    consumed: 0,
    repeatCount: explicitCount ?? countFromMarker,
    source: { tokens: [token], tokenIndices: [tokenIdx] }
  };
}

function quoteBoundaryReadinessBlocker(
  cursor: TokenCursor<RuntimeHaruToken>,
  outgoingBoundary: ClauseBoundary,
  root: TailRootBase,
  lookups: LookupTables
): string | null {
  const tokens = cursor.tokens;
  if (outgoingBoundary.kind === "terminal" || outgoingBoundary.connectiveKind !== "quotative") {
    return null;
  }
  const relation = quoteStructuralRelationAt(cursor.fork(outgoingBoundary.tokenIdx, tokens.length, outgoingBoundary.tokenIdx), lookups);
  if (
    relation === undefined ||
    !IU_LEXEME_FORMS.has(relation.quote.hostMatch.hostForm) ||
    !isPassiveQuoteHost(tokens, relation.quote.hostMatch.hostIdx) ||
    !tailRootHasBareReceiveDesireQuoteContent(root, outgoingBoundary.tokenIdx)
  ) {
    return null;
  }
  return "passive 言われる + receive-desire quote request is not yet represented in TailRoot";
}

function isPassiveQuoteHost(tokens: readonly RuntimeHaruToken[], hostIdx: number): boolean {
  const next = tokens[hostIdx + 1];
  return next !== undefined &&
    (next.pos & POS4) === 助動詞_レル;
}

function tailRootHasBareReceiveDesireQuoteContent(root: TailRootBase, boundaryTokenIdx: number): boolean {
  if (root.tail.kind !== "auxLayer") {
    return false;
  }
  const connectiveIdx = root.tail.ops.findIndex(
    (op) => op.kind === "connective" && op.source.tokenIndices.includes(boundaryTokenIdx)
  );
  const ops = connectiveIdx >= 0 ? root.tail.ops.slice(0, connectiveIdx) : root.tail.ops;
  const desireIdx = ops.findIndex((op) => op.kind === "desire");
  if (desireIdx < 0) {
    return false;
  }
  const hasReceiveBenefactive = ops.some(
    (op) => op.kind === "aspect" &&
      (op.aspect === "te_morau" ||
        op.aspect === "te_itadaku" ||
        op.aspect === "te_moraeru" ||
        op.aspect === "te_itadakeru")
  );
  if (!hasReceiveBenefactive) {
    return false;
  }
  return !ops.slice(desireIdx + 1).some((op) =>
    op.kind === "negation" ||
    op.kind === "tense" ||
    op.kind === "conjecture" ||
    op.kind === "modal" ||
    chainFinalOpHostCategory(op) !== undefined
  );
}

function rewriteRootOutgoingBoundaryConnective<Root extends TailRootBase>(
  root: Root,
  outgoingBoundary: ClauseBoundary,
  options: OutgoingBoundaryRewriteOptions = {}
): Root {
  if (outgoingBoundary.kind === "terminal") {
    return root;
  }
  const layer = firstAuxLayer(root.tail);
  const refinedOutgoingBoundary = outgoingBoundary.retrospectiveQuotativeFlavor === undefined
    ? outgoingBoundary
    : {
      ...outgoingBoundary,
      retrospectiveQuotativeFlavor: retrospectiveQuotativeFlavorForStemMood(
        outgoingBoundary.retrospectiveQuotativeFlavor,
        layer?.stem.stemMood
      )
    };
  const tail = rewriteTailNodeOutgoingBoundaryConnective(root.tail, refinedOutgoingBoundary, options);
  return tail === root.tail ? root : { ...root, tail };
}

function rewriteTailNodeOutgoingBoundaryConnective(
  tail: TailNode,
  outgoingBoundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>,
  options: OutgoingBoundaryRewriteOptions
): TailNode {
  if (tail.kind === "connective") {
    const inner = rewriteAuxLayerOutgoingBoundaryConnective(tail.inner, outgoingBoundary, options);
    const outer = rewriteTailNodeOutgoingBoundaryConnective(tail.outer, outgoingBoundary, options);
    const selfNeedsRewrite =
      tail.source.tokenIndices.includes(outgoingBoundary.tokenIdx) &&
      !connectiveSurfaceSpecializesOutgoingBoundary(tail.surface, outgoingBoundary.surface) &&
      (
        tail.connective !== outgoingBoundary.connectiveKind ||
        tail.surface !== outgoingBoundary.surface ||
        !quoteBoundaryPayloadEquals(tail.quoteBoundary, outgoingBoundary.quoteBoundary)
      );
    if (inner === tail.inner && outer === tail.outer && !selfNeedsRewrite) {
      return tail;
    }
    return {
      ...tail,
      inner,
      outer,
      ...(selfNeedsRewrite
        ? {
          connective: outgoingBoundary.connectiveKind,
          surface: outgoingBoundary.surface,
          ...(outgoingBoundary.quoteBoundary === undefined
            ? {}
            : { quoteBoundary: outgoingBoundary.quoteBoundary })
        }
        : {})
    };
  }
  return rewriteAuxLayerOutgoingBoundaryConnective(tail, outgoingBoundary, options);
}

function rewriteAuxLayerOutgoingBoundaryConnective(
  layer: AuxLayerNode,
  outgoingBoundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>,
  options: OutgoingBoundaryRewriteOptions
): AuxLayerNode {
  const ops = layer.ops.map((op): AuxOpNode => {
    const teFormRole = outgoingBoundaryTeFormRole(outgoingBoundary, options);
    if (
      op.kind !== "connective" ||
      !op.source.tokenIndices.includes(outgoingBoundary.tokenIdx) ||
      connectiveSurfaceSpecializesOutgoingBoundary(op.surface, outgoingBoundary.surface) ||
      (
        op.connective === outgoingBoundary.connectiveKind &&
        op.surface === outgoingBoundary.surface &&
        (
          outgoingBoundary.quotativeMood === undefined ||
          op.quotativeMood === outgoingBoundary.quotativeMood
        ) &&
        op.retrospectiveQuotativeFlavor === outgoingBoundary.retrospectiveQuotativeFlavor &&
        quoteBoundaryPayloadEquals(op.quoteBoundary, outgoingBoundary.quoteBoundary) &&
        (teFormRole === undefined || op.teFormRole === teFormRole)
      )
    ) {
      return op;
    }
    return {
      ...op,
      connective: outgoingBoundary.connectiveKind,
      surface: outgoingBoundary.surface,
      ...(outgoingBoundary.boundNominalReasonMonoNoun === undefined
        ? {}
        : { boundNominalReasonMonoNoun: outgoingBoundary.boundNominalReasonMonoNoun }),
      ...(outgoingBoundary.quotativeMood === undefined
        ? {}
        : { quotativeMood: outgoingBoundary.quotativeMood }),
      ...(outgoingBoundary.retrospectiveQuotativeFlavor === undefined
        ? {}
        : { retrospectiveQuotativeFlavor: outgoingBoundary.retrospectiveQuotativeFlavor }),
      ...(teFormRole === undefined ? {} : { teFormRole }),
      ...(outgoingBoundary.quoteBoundary === undefined
        ? {}
        : { quoteBoundary: outgoingBoundary.quoteBoundary })
    };
  });
  return { ...layer, ops };
}

function outgoingBoundaryTeFormRole(
  outgoingBoundary: Exclude<ClauseBoundary, { readonly kind: "terminal" }>,
  options: OutgoingBoundaryRewriteOptions
): TeFormConnectiveRole | undefined {
  return outgoingBoundary.connectiveKind === "te_form" ? options.teFormRole : undefined;
}

function connectiveSurfaceSpecializesOutgoingBoundary(surface: string, boundarySurface: string): boolean {
  return (
    (surface === "でありながら" && boundarySurface === "ながら") ||
    (surface === "ことから" && boundarySurface === "から") ||
    (surface.startsWith("ということから") && boundarySurface === "から") ||
    (surface.startsWith("ってことから") && boundarySurface === "から") ||
    (surface.includes("こともあって") && boundarySurface === "て") ||
    (surface.includes("ことも手伝って") && boundarySurface === "て") ||
    ((surface === "ために" || surface === "為に") && boundarySurface === "に") ||
    (surface === "__renyou_mo" && boundarySurface === "も")
  );
}

function quoteBoundaryPayloadEquals(
  left: QuoteBoundaryPayload | undefined,
  right: Exclude<ClauseBoundary, { readonly kind: "terminal" }>["quoteBoundary"]
): boolean {
  if (left === undefined && right === undefined) return true;
  if (left === undefined || right === undefined) return false;
  return left.koreanClauseForm === right.koreanClauseForm &&
    left.requestTailKind === right.requestTailKind &&
    left.focusParticle === right.focusParticle &&
    left.nominalRoleParticle === right.nominalRoleParticle &&
    left.reportingPassiveRoleLabel === right.reportingPassiveRoleLabel &&
    left.adjectivalDistributionContent === right.adjectivalDistributionContent;
}

function hydrateAspectSemanticPayloads<Root extends TailRootBase>(
  root: Root,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): Root {
  const tail = hydrateAspectSemanticTailNode(root.tail, tokens, predicateTokenIdx, lookups, numeric);
  return tail === root.tail ? root : { ...root, tail };
}

function hydrateAspectSemanticTailNode(
  node: TailNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): TailNode {
  if (node.kind === "connective") {
    const inner = hydrateAspectSemanticAuxLayer(node.inner, tokens, predicateTokenIdx, lookups, numeric);
    const outer = hydrateAspectSemanticTailNode(node.outer, tokens, predicateTokenIdx, lookups, numeric);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return hydrateAspectSemanticAuxLayer(node, tokens, predicateTokenIdx, lookups, numeric);
}

function hydrateAspectSemanticAuxLayer(
  layer: AuxLayerNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): AuxLayerNode {
  const hydrated = hydrateAspectSemanticOps({
    ops: layer.ops,
    stem: layer.stem,
    headEntry: null,
    tokens,
    predicateTokenIdx,
    lookups,
    numeric
  });
  return hydrated === null ? layer : { ...layer, stem: hydrated.stem, ops: hydrated.ops };
}

function isPotentialTailChunkStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined || isClausePunctuationToken(token)) return false;
  const pos0 = token.pos & POS0;
  if (isDetachedCopulaSupportVerbStart(tokens, start)) return false;
  if (pos0 === 形容詞0) {
    return sourceAdjectiveCanStartTailChunk(tokens, start, cursor.end) ||
      adjectiveAdverbialModifierPredicateReachable(tokens, start, lookups);
  }
  if (pos0in(pos0, PREDICATE_BITS)) return true;
  if (pos0 === 副詞) {
    return adverbHostStartsTailChunk(tokens, start, numeric, lookups, { cursor, start });
  }
  if (isSplitSuppletiveNegativeSurfaceStart(tokens, start)) return true;
  if (pos0 === 連体詞) {
    return isRentaishiPronominalNoPredicateStart(tokens, start, lookups) ||
      isDemonstrativePropositionWakeHostStart(tokens, start, lookups);
  }
  if (pos0 === 代名詞) {
    return isNounCopulaPredicateStart(tokens, start, { lookups }) ||
      mentionedHostCarriesCanonicalReformulationMarker(cursor, start, numeric, lookups) ||
      isNounKamoModalPredicateStart(tokens, start, lookups) ||
      isNominalEvidentialRashiiPredicateStart(tokens, start, lookups) ||
      isBareNominalQuoteStart(cursor, start, numeric, lookups) ||
      isNominalLimitNegationPredicateStart(cursor, start, numeric, lookups) ||
      isNominalTerminalDatteHearsayStart(cursor, start, numeric, lookups) ||
      isQuestionComplementPredicateStart(cursor, start, lookups) ||
      isQuotativeDerivedIdiomHostStart(cursor, start) ||
      isNominalQuestionTerminalStart(cursor, start, numeric, lookups) ||
      isBareNominalToiuAttributiveStart(tokens, start, lookups) ||
      isBareNominalToiuScopeHeadStart(tokens, start) ||
      matchNiChigaiNaiProjectionCarrierAt(tokens, start + 1) !== null ||
      matchNiKimatteIruProjectionCarrierAt(tokens, start + 1) !== null;
  }
  if (pos0 === 名詞) {
    if (isNominalRenyouPostverbAuxiliaryStart(tokens, start) || isNominalRenyouMethodYouIdiomStart(tokens, start)) {
      return true;
    }
    return detectSahenPredicateStart(tokens, start) !== null ||
      isNounPhraseCopulaPredicateStart(cursor, start, numeric, lookups) ||
      isNounKamoModalPredicateStart(tokens, start, lookups) ||
      isNominalEvidentialRashiiPredicateStart(tokens, start, lookups) ||
      isNominalDirectConnectivePredicateStart(cursor, start, numeric, lookups) ||
      isBareNominalQuoteStart(cursor, start, numeric, lookups) ||
      isNominalLimitNegationPredicateStart(cursor, start, numeric, lookups) ||
      isNominalTerminalDatteHearsayStart(cursor, start, numeric, lookups) ||
      isAdjectivalNounQuestionAlternativeStart(cursor, start) ||
      isAdjectivalNounQuestionContentStart(tokens, start) ||
      isQuestionComplementPredicateStart(cursor, start, lookups) ||
      isQuotativeDerivedIdiomHostStart(cursor, start) ||
      isNominalQuestionTerminalStart(cursor, start, numeric, lookups) ||
      isAdjectivalNounFormalToStateResultStart(tokens, start) ||
      isAdjectivalNounTosuruCarrierStart(tokens, start) ||
      sourceHasAdverbialSurfacePostverbCarrier(tokens, start) ||
      isKeijoujiKanouBareQuoteCarrierStart(tokens, start) ||
      isKeijoujiKanouHostQuotePredicateStart(cursor, start, lookups) ||
      isKeijoujiKanouBareTteAttributiveStart(tokens, start, lookups) ||
      isBareNominalToiuAttributiveStart(tokens, start, lookups) ||
      isBareNominalToiuScopeHeadStart(tokens, start) ||
      isKeijoujiKanouAdnominalAttributiveStart(tokens, start, lookups) ||
      isBareKeijoujiAttributiveHostStart(start) ||
      isExplicitAdnominalNoAttributiveHostStart(tokens, start, lookups) ||
      isNaAdjCapableNounAdnominalCopulaTailStart(tokens, start, lookups) ||
      isNominalLikenessPredicateStart(tokens, start) ||
      isKeijoujiKanouYouNiProjectionStart(tokens, start, lookups) ||
      isNaAdjCapableNounSouAppearanceStart(tokens, start) ||
      isNaAdjCapableNounKuseNiConcessiveStart(cursor, start) ||
      matchNiChigaiNaiProjectionCarrierAt(tokens, start + 1) !== null ||
      matchNiKimatteIruProjectionCarrierAt(tokens, start + 1) !== null ||
      isBareKeijoujiZeroTailPredicateStart(tokens, start);
  }
  return false;
}

function adverbHostStartsTailChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): boolean {
  return isAdverbialKamoModalPredicateStart(tokens, start, lookups) ||
    adverbHostCarriesCanonicalReformulationMarker(tokens, start, numeric, lookups, sourceHost) ||
    isAdverbialConjecturePredicateStart(tokens, start, lookups) ||
    isAdverbCopulaPredicateStart(tokens, start, lookups) ||
    isDeicticCopulaPredicateStart(tokens, start, lookups) ||
    isDeicticLimitNegationPredicateStart(tokens, start, lookups) ||
    isDeicticCopulaQuoteCarrierStart(tokens, start, lookups) ||
    sourceHasAdverbialSurfacePostverbCarrier(tokens, start) ||
    isAdverbSpeakerAcknowledgmentKaStart(tokens, start, lookups) ||
    isQuestionComplementPredicateStart(
      sourceHost?.cursor ?? new TokenCursor(tokens, start, tokens.length, start),
      sourceHost?.start ?? start,
      lookups
    ) ||
    isQuotativeDerivedIdiomHostStart(
      sourceHost?.cursor ?? new TokenCursor(tokens, start, tokens.length, start),
      sourceHost?.start ?? start
    );
}

function adverbHostCarriesCanonicalReformulationMarker(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): boolean {
  return mentionedHostCarriesCanonicalReformulationMarker(
    sourceHost?.cursor ?? new TokenCursor(tokens, start, tokens.length, start),
    sourceHost?.start ?? start,
    numeric,
    lookups
  );
}

export function isAdverbSpeakerAcknowledgmentKaStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups?: LookupTables
): boolean {
  return lookups !== undefined &&
    speakerAcknowledgmentKaClosureIndexAt(tokens, start, lookups) !== null;
}

function sourceAdjectiveCanStartTailChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  limit: number
): boolean {
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  if (
    (token.pos & POS01) === (形容詞0 | 非自立可能) &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い")
  ) {
    return true;
  }
  return sourceContextMayBePredicateAt(tokens, start, {}, { limit });
}

function isNaAdjCapableNounAdnominalCopulaTailStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[start];
  if (token === undefined || !isNaAdjCapableNoun(token)) return false;
  const na = tokens[start + 1];
  if (
    na === undefined || na.surface !== "な" || (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return false;
  }
  return adnominalCopulaTailFollows(tokens, start + 2, lookups);
}

function isNaAdjCapableNounKuseNiConcessiveStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number
): boolean {
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined || !isNaAdjCapableNoun(token)) return false;
  const na = tokens[start + 1];
  if (
    na === undefined || na.surface !== "な" || (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return false;
  }
  return matchCompositeConnectiveAt(cursor.fork(start + 2, tokens.length, start + 2), { requireEnd: false })?.connective === "concession";
}

function isNaAdjCapableNounSouAppearanceStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const host = tokens[start];
  if (host === undefined || !isNaAdjCapableNoun(host)) return false;
  return appearancePerceptionProjectionForToken(tokens[start + 1]) === "sou_appearance";
}

function isKeijoujiKanouYouNiProjectionStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[start];
  if (token === undefined || (token.pos & POS2) !== 形状詞可能) return false;
  const na = tokens[start + 1];
  if (
    na === undefined || na.surface !== "な" || (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return false;
  }
  if (matchYouNiPredicateProjectionConnectiveAt(tokens, start + 2, { requireEnd: false, lookups }) !== null) {
    return true;
  }
  const you = tokens[start + 2];
  const ni = tokens[start + 3];
  return you !== undefined && you.surface === "よう" && (you.pos & POS1) === 助動詞語幹 &&
    copulaNiMarkerRelationForToken(ni, start + 3, { consumers: ["tail_boundary_readiness"] }) !== null &&
    appearancePerceptionReadingForToken(tokens[start + 4]) !== null;
}

function directNounAttachingPostverbAuxiliaries(dictionaryForm: string | undefined): readonly PostverbAuxiliaryPayload[] {
  return postverbAuxiliaryPayloadsForForm(dictionaryForm).filter(
    (auxiliary) => auxiliary.kind !== "make_state_change" &&
      postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "verb_renyou")
  );
}

function isNominalRenyouPostverbAuxiliaryStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  const auxiliaryToken = tokens[idx + 1];
  if (
    noun === undefined ||
    auxiliaryToken === undefined ||
    (noun.pos & POS0) !== 名詞 ||
    !isPostverbAuxiliaryToken(auxiliaryToken)
  ) {
    return false;
  }
  const auxiliaries = directNounAttachingPostverbAuxiliaries(auxiliaryToken.dictionaryForm);
  return auxiliaries.length > 0 &&
    isPostverbAuxiliaryActivationAccepted(auxiliaryToken, tokens[idx + 2]);
}

function isNominalRenyouMethodYouIdiomStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  return noun !== undefined &&
    (noun.pos & POS0) === 名詞 &&
    methodYouGaNaiIdiomShapeAt(tokens, idx + 1) !== null;
}

const BARE_KAMO_EVIDENCE_SCOPE = { scope: "sentence" } as const;

function bareKamoAdmissionContextAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables | undefined
): BareKamoAdmissionContext | undefined {
  if (lookups === undefined) {
    return undefined;
  }
  const layout = activeProtoLayout() ?? undefined;
  return {
    tokens,
    kaIndex: kaIdx,
    clauseContainsInterrogative: clauseContainsInterrogativeBeforeKa(tokens, kaIdx, lookups, layout, BARE_KAMO_EVIDENCE_SCOPE) ||
      clauseContainsLexicalizedInterrogativeBefore(tokens, kaIdx, lookups, layout, BARE_KAMO_EVIDENCE_SCOPE),
    clauseContainsPredicateChoiceKa: clauseContainsPredicateChoiceKaBefore(tokens, kaIdx, layout)
  };
}

function isAdverbialKamoModalPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    (token.pos & POS0) === 副詞 &&
    isKamoShirenaiModalStartAtToken(tokens, idx + 1, bareKamoAdmissionContextAt(tokens, idx + 1, lookups));
}

function isAdverbialConjecturePredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const token = tokens[idx];
  if (
    token === undefined ||
    lookups === undefined ||
    (token.pos & POS0) !== 副詞 ||
    !lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)
  ) {
    return false;
  }
  return matchCopula(tokens, idx + 1, lookups)?.op.variant === "conjecture";
}

function isDeicticCopulaQuoteCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 副詞) return false;
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  if (matchCopula(tokens, idx + 1, lookups)?.op.variant !== "basic") return false;
  const marker = quoteMarkerRelationAt(tokens, idx + 2, { consumers: ["tail_multi_clause"] });
  return marker?.canonicalSurface === "と" || marker?.canonicalSurface === "って";
}

function isDeicticLimitNegationPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || !isLexicalAdverb(token)) return false;
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  return quoteFocusLimitNegationTailStartingAt(new TokenCursor(tokens, idx + 1, tokens.length, idx + 1)) !== null;
}

export function isDeicticCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 副詞) return false;
  if (!lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  const copula = tokens[idx + 1];
  if (copula === undefined) return false;
  const form = copula.pos & POS5A;
  const conjugatedBridge = form === 終止形_ || form === 連用形_ || form === 仮定形_;
  if (form === 連体形_) {
    if (!deicticAdnominalCopulaBoundTailFollows(tokens, idx, lookups)) return false;
  }
  const matched = matchCopula(tokens, idx + 1, lookups);
  if (matched?.op.variant === "basic" || matched?.op.variant === "conditional_nara") {
    if (form !== 連体形_ && !conjugatedBridge && matched.op.polarity !== "negative") return false;
    const afterCopula = idx + 1 + matched.consumed;
    if (
      matched.op.polarity !== "negative" &&
      !isDeicticSupportCopulaRealization(tokens, matched) &&
      kaMarkerRelationAt(tokens, afterCopula, ["tail_multi_clause"]) !== null
    ) {
      return false;
    }
    if (
      matched.op.variant === "conditional_nara" &&
      ((tokens[afterCopula]?.pos ?? 0) & POS01) === 助詞_終助詞
    ) {
      return false;
    }
    if (
      !terminalSfpRunClosesUtteranceAt(tokens, afterCopula) &&
      !confirmationKaRunIsQuotedAt(tokens, afterCopula, lookups)
    ) return false;
    return !deicticNegativeConjectureQuoteShapeAt(tokens, idx + 1, matched, lookups);
  }
  if (form === 連体形_ || conjugatedBridge) return false;
  const bridgeEnd = negativeScopeBridgeEndAt(tokens, idx + 1);
  if (bridgeEnd === null) return false;
  return terminalSfpRunClosesUtteranceAt(tokens, bridgeEnd) ||
    confirmationKaRunIsQuotedAt(tokens, bridgeEnd, lookups);
}

function isDeicticSupportCopulaRealization(
  tokens: readonly RuntimeHaruToken[],
  matched: { readonly op: CopulaOp; readonly consumed: number }
): boolean {
  if (matched.consumed < 2) return false;
  const deIdx = matched.op.source.tokenIndices[0];
  return deIdx !== undefined && isCopulaSupportChainStartAt(tokens, deIdx);
}

function negativeScopeBridgeEndAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  return new TokenCursor(tokens, pos).lookahead(0, (c) => {
    const bridge = matchScopeBridgeBeforeBasicCopula(c);
    if (bridge === null || bridge.polarity !== "negative") return null;
    return c.pos;
  });
}

function deicticAdnominalCopulaBoundTailFollows(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const previousIdx = previousNonSpaceIndex(tokens, idx, 0);
  if (previousIdx !== null && quoteSpanClosesAt(tokens, previousIdx)) return false;
  if (deicticTerminalNokaClosesUtterance(tokens, idx, lookups)) return false;
  if (deicticTerminalNodaCopulaYieldsFollowingOwner(tokens, idx, lookups)) return false;
  return adnominalCopulaTailFollows(tokens, idx + 2, lookups);
}

function deicticTerminalNodaCopulaYieldsFollowingOwner(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  if (!terminalNodaCarrierFollowsAdnominalCopula(tokens, idx + 2)) return false;
  const copula = matchCopula(tokens, idx + 3, lookups);
  if (copula === null) return false;
  const afterIdx = idx + 3 + copula.consumed;
  const marker = kaMarkerRelationAt(tokens, afterIdx, ["tail_multi_clause"]);
  if (marker !== null && marker.particleSubtype1 !== 終助詞) return true;
  return isLikenessCarrierHeadToken(tokens[afterIdx]);
}

function quoteSpanClosesAt(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return isTrailingPunctuationToken(tokens[idx]);
  }
  return proto.quoteSpans.some(([, close]) => close === idx);
}

function deicticTerminalNokaClosesUtterance(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const followerIdx = idx + 2;
  const match = matchCompositeConnectiveAt(new TokenCursor(tokens, followerIdx, tokens.length), {
    requireEnd: false
  });
  if (match?.connective !== "question_content") return false;
  const closeIdx = followerIdx + match.consumed;
  if (tokens[closeIdx] === undefined) return false;
  if (
    closesUtteranceForSpeakerDirection(tokens, closeIdx, {
      utteranceBreakDashSurfaces: lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES
    })
  ) {
    return true;
  }
  if (quoteMarkerRelationAt(tokens, closeIdx, { consumers: ["tail_multi_clause"] }) === null) return false;
  return !interrogativeAnchorQuotedQuestionContinues(tokens, idx, closeIdx, lookups);
}

function interrogativeAnchorQuotedQuestionContinues(
  tokens: readonly RuntimeHaruToken[],
  anchorIdx: number,
  markerIdx: number,
  lookups: LookupTables
): boolean {
  const anchor = tokens[anchorIdx];
  if (anchor === undefined || !tokenIsInterrogativeLexeme(anchor, lookups)) return false;
  const relation = questionContentContinuationAfterKaRelationAt(tokens, markerIdx - 1, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  });
  if (relation?.continuationKind !== "question_quote_marker") return false;
  return quoteHostMatchAfterMarker(new TokenCursor(tokens, markerIdx, tokens.length, markerIdx), lookups) !== null;
}

function terminalSfpRunClosesUtteranceAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const idx = terminalSfpRunEndAt(tokens, pos);
  if (idx === pos) return true;
  const after = tokens[idx];
  return after === undefined ||
    (after.pos & POS0) === 補助記号 ||
    activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, idx);
}

export function terminalSfpRunEndAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): number {
  let idx = pos;
  if (
    lookups !== undefined &&
    ((tokens[idx]?.pos ?? 0) & POS01) !== 助詞_終助詞 &&
    isTerminalQuestionKaOwnership(kaOwnershipKindAt(tokens, idx, lookups))
  ) {
    idx += 1;
  }
  while (((tokens[idx]?.pos ?? 0) & POS01) === 助詞_終助詞) {
    idx += 1;
  }
  return idx;
}

function isTerminalQuestionKaOwnership(kind: KaOwnershipKind | null): boolean {
  return kind === "question" || kind === "self_question_kana";
}

function confirmationKaRunIsQuotedAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): boolean {
  if (kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) === null) return false;
  const runEnd = terminalSfpRunEndAt(tokens, pos, lookups);
  if (runEnd === pos) return false;
  if (runEnd > pos + 1 && kaOwnershipKindAt(tokens, pos, lookups) !== "self_question_kana") {
    return false;
  }
  const continuationView = runEnd === pos + 1
    ? tokens
    : [...tokens.slice(0, pos + 1), ...tokens.slice(runEnd)];
  if (questionContentContinuationAfterKaRelationAt(continuationView, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true
  })?.continuationKind !== "question_quote_marker") {
    return false;
  }
  return kaOwnershipKindAt(tokens, runEnd + 1, lookups) !== "toka_listing";
}

function deicticNegativeConjectureQuoteShapeAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  matched: { readonly op: CopulaOp; readonly consumed: number },
  lookups: LookupTables
): boolean {
  if (matched.op.polarity !== "negative") return false;
  const conjectureIdx = copulaIdx + matched.consumed;
  const conjecture = matchCopula(tokens, conjectureIdx, lookups);
  if (conjecture?.op.variant !== "conjecture") return false;
  const marker = quoteMarkerRelationAt(tokens, conjectureIdx + conjecture.consumed, {
    consumers: ["tail_multi_clause"]
  });
  return marker?.canonicalSurface === "と" || marker?.canonicalSurface === "って";
}

function isAdverbCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) return false;
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 副詞) return false;
  if (lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(token.dictionaryForm || token.surface)) return false;
  const copula = tokens[idx + 1];
  if (copula === undefined) return false;
  if (
    copula.surface === "で" &&
    adverbHostCopulaDeMarkerAt(tokens, idx, lookups) === null &&
    !copulaDeNegationBridgeFollows(tokens, idx + 2) &&
    !isDetachedCopulaSupportVerbStart(tokens, idx + 2) &&
    negativeScopeBridgeEndAt(tokens, idx + 1) === null
  ) {
    return false;
  }
  if (matchCopula(tokens, idx + 1, lookups)?.op.variant === "basic") return true;
  return negativeScopeBridgeEndAt(tokens, idx + 1) !== null;
}

function copulaDeNegationBridgeFollows(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const next = tokens[pos];
  if (next === undefined) return false;
  if (
    next.surface === "は" &&
    (next.pos & POS0) === 助詞 &&
    matchNegationEnding(tokens, pos + 1, { allowAttributive: true }) !== null
  ) {
    return true;
  }
  return matchNegationEnding(tokens, pos, { allowAttributive: true }) !== null;
}

function isNounKamoModalPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const noun = tokens[idx];
  return noun !== undefined &&
    (noun.pos & POS0) === 名詞 &&
    isKamoShirenaiModalStartAtToken(tokens, idx + 1, bareKamoAdmissionContextAt(tokens, idx + 1, lookups));
}

function isAdjectivalNounFormalToStateResultStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  return noun !== undefined &&
    (noun.pos & (POS0 | POS2)) === (名詞 | 形状詞可能) &&
    sourceHasFormalToStateResultCarrier(tokens, idx);
}

function isAdjectivalNounTosuruCarrierStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  if (
    noun === undefined ||
    (noun.pos & POS0) !== 名詞 ||
    (!isBareNaAdjSet(noun) && !isTosuruResultativeMakeForm(noun.dictionaryForm, noun.surface))
  ) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "と") {
    return false;
  }
  const carrier = tokens[marker.span.endExclusive];
  if (
    carrier === undefined ||
    (carrier.pos & POS0) !== 動詞 ||
    carrier.dictionaryForm !== "する"
  ) {
    return false;
  }
  const follower = tokens[marker.span.endExclusive + 1];
  if (follower === undefined) {
    return true;
  }
  return !((follower.pos & POS0) === 助動詞0 && ["せる", "させる"].includes(follower.dictionaryForm));
}

function isKeijoujiKanouBareQuoteCarrierStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  if (noun === undefined || (noun.pos & (POS0 | POS2)) !== (名詞 | 形状詞可能)) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "って") {
    return false;
  }
  for (let i = marker.span.endExclusive; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token) || (token.pos & POS01) === 助詞_終助詞) {
      continue;
    }
    return false;
  }
  return true;
}

function isKeijoujiKanouHostQuotePredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens } = cursor;
  const noun = tokens[idx];
  if (noun === undefined || (noun.pos & (POS0 | POS2)) !== (名詞 | 形状詞可能)) {
    return false;
  }
  const relation = quoteStructuralRelationAt(cursor.fork(idx + 1, tokens.length, idx + 1), lookups);
  if (relation === undefined) {
    return false;
  }
  const quote = relation.quote;
  if (
    quote.slotKind !== "quoted_content" ||
    quote.markerIdx !== idx + 1 ||
    quote.contentSpan.endExclusive !== idx + 1 ||
    (quote.hostMatch.kind !== "report" &&
      quote.hostMatch.kind !== "thought" &&
      quote.hostMatch.kind !== "question")
  ) {
    return false;
  }
  const host = tokens[quote.hostMatch.hostIdx];
  if (host !== undefined && IU_LEXEME_FORMS.has(host.dictionaryForm)) {
    const afterHost = tokens[quote.hostMatch.hostIdx + 1];
    if (
      afterHost !== undefined &&
      afterHost.surface === "か" &&
      (afterHost.pos & POS01) === 助詞_終助詞
    ) {
      return false;
    }
  }
  return true;
}

function isKeijoujiKanouBareTteAttributiveStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  const noun = tokens[idx];
  if (noun === undefined || (noun.pos & (POS0 | POS2)) !== (名詞 | 形状詞可能)) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "って") {
    return false;
  }
  return isBareQuoteAttributiveCarrierBoundary(tokens, idx + 1, marker.span.endExclusive, lookups);
}

async function bareTteAttributiveStartLacksPredicateSense(
  input: IntegrationInput,
  start: number
): Promise<boolean> {
  if (!isKeijoujiKanouBareTteAttributiveStart(input.tokens, start, input.lookups) || input.dictionary.lookup === undefined) {
    return false;
  }
  const token = input.tokens[start];
  if (token === undefined) {
    return false;
  }
  const entry = await input.dictionary.lookup(token.dictionaryForm, token.dictionaryFormReading, token.pos);
  return entry !== undefined && !entryHasPredicateStemTranslation(entry, "adj");
}

function isBareNominalToiuAttributiveStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  const noun = tokens[idx];
  const nounPos0 = noun === undefined ? 0 : (noun.pos & POS0);
  if (noun === undefined || (nounPos0 !== 名詞 && nounPos0 !== 代名詞)) {
    return false;
  }
  const markerIdx = idx + 1;
  if (quoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] }) === null) {
    return false;
  }
  const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
  const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
  if (tailEnd === null || headIdx === null) {
    return false;
  }
  const head = tokens[headIdx];
  if (head === undefined || !(isNominalLikeAttributiveHead(head) || isDerivedNominalPhraseHead(tokens, headIdx))) {
    return false;
  }
  if (lookups !== undefined && toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups) !== tailEnd) {
    return true;
  }
  const headKind = classifyAttributiveHeadKind(head);
  if (headKind === "ordinary_nominal") {
    return true;
  }
  return isQuotedTopicFormalNounHead(head) &&
    topicFocusMarkerRelationAt(tokens, headIdx + 1, { consumers: ["tail_multi_clause"] })?.focusKind === "topic";
}

function isBareNominalToiuScopeHeadStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const noun = tokens[idx];
  const nounPos0 = noun === undefined ? 0 : (noun.pos & POS0);
  if (noun === undefined || (nounPos0 !== 名詞 && nounPos0 !== 代名詞)) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "と") {
    return false;
  }
  const carrier = tokens[marker.span.endExclusive];
  if (
    carrier === undefined ||
    !isSayVerbToken(carrier) ||
    (carrier.pos & POS5A) !== 連体形_
  ) {
    return false;
  }
  const wakeIdx = marker.span.endExclusive + 1;
  if (isFocusNegativeScopeBridgeHeadAt(tokens, wakeIdx)) {
    return true;
  }
  const copula = tokens[wakeIdx + 1];
  if (
    wakeExplanatoryCopulaPolite(tokens[wakeIdx], copula) === null &&
    wakeExplanatoryCopulaConjecture(tokens[wakeIdx], copula) === null
  ) {
    return false;
  }
  if (
    copula !== undefined &&
    (copula.pos & POS5A) === 連用形_ &&
    matchNegationEnding(tokens, wakeIdx + 2, { allowAttributive: true }) !== null
  ) {
    return false;
  }
  return true;
}

function isFocusNegativeScopeBridgeHeadAt(tokens: readonly RuntimeHaruToken[], headIdx: number): boolean {
  if (tokens[headIdx] === undefined) {
    return false;
  }
  const bridge = matchScopeBridge(new TokenCursor(tokens, headIdx, tokens.length));
  return bridge !== null &&
    (bridge.head === "wake" || bridge.head === "koto") &&
    bridge.form !== "topic" &&
    bridge.polarity === "negative";
}

function isBareKeijoujiAttributiveHostStart(start: number): boolean {
  return activeProtoLayout()?.isBareKeijoujiAttributiveHead(start + 1) === true;
}

function isExplicitAdnominalNoAttributiveHostStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables | undefined
): boolean {
  return lookups !== undefined && explicitAdnominalNoAttributiveEvidenceAt(tokens, start + 1, lookups) !== null;
}

function bareKeijoujiAttributiveHostEvidence(start: number): BareKeijoujiAttributiveEvidence | undefined {
  return activeProtoLayout()?.bareKeijoujiAttributiveEvidenceAt(start + 1);
}

function isKeijoujiKanouAdnominalAttributiveStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (
    !attributiveSpanEndsWithAdnominalCopula(tokens, idx + 1) ||
    !isNominalAdnominalCopulaHostSpan(tokens, idx, idx + 1)
  ) {
    return false;
  }
  return adnominalCopulaAttributiveHeadCanBeExternallyOwned(tokens, idx, idx + 1, idx + 2, lookups) ||
    adnominalCopulaAttributiveFormPausesAtWeakPunctuation(tokens, idx + 1);
}

function adnominalCopulaAttributiveHeadCanBeExternallyOwned(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number,
  headSearchStart: number,
  lookups?: LookupTables
): boolean {
  const headIdx = lookups === undefined
    ? headSearchStart
    : attributiveEventModifierChainHeadIndexAt(tokens, headSearchStart, lookups) ?? headSearchStart;
  const head = tokens[headIdx];
  if (
    head === undefined ||
    !(isNominalLikeAttributiveHead(head) || isDerivedNominalPhraseHead(tokens, headIdx))
  ) {
    return false;
  }
  const headKind = classifyAttributiveHeadKind(head);
  if (headKind === "ordinary_nominal") {
    return true;
  }
  if (isAppearanceModalAdnominalTailEnd(tokens, contentEndIdx)) {
    return false;
  }
  return lookups !== undefined &&
    canExternalContentOwnAttributiveHead(tokens, spanStartIdx, contentEndIdx, headIdx, headKind, lookups);
}

function isDetachedCopulaSupportVerbStart(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const token = tokens[start];
  if (
    token === undefined ||
    (token.pos & POS01) !== 動詞_非自立可能 ||
    !isAffirmativeCopulaSupportVerbToken(token) ||
    isGozaruPoliteSupportToken(token)
  ) {
    return false;
  }
  return copulaDeMarkerRelationForToken(tokens[start - 1], start - 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
}

function isNominalDirectConnectivePredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  const { tokens } = cursor;
  const noun = tokens[idx];
  const next = tokens[idx + 1];
  if (noun !== undefined && (noun.pos & POS0) === 名詞 && mentionedHostCarriesCanonicalReformulationMarker(cursor, idx, numeric, lookups)) {
    return true;
  }
  if (noun === undefined || (noun.pos & POS0) !== 名詞 || next === undefined || (next.pos & POS0) !== 助詞) {
    return false;
  }
  if (isBareNominalQuoteStart(cursor, idx, numeric, lookups)) {
    return true;
  }
  const composite =
    matchCompositeConnectiveAt(cursor.fork(idx + 1, tokens.length, idx + 1), { requireEnd: false }) ??
    matchQuotedConcessiveConnectiveAt(tokens, idx + 1, { requireEnd: false });
  const kind = composite?.connective ?? lookupConnectiveBySurface(next.surface);
  const surface = composite?.surface ?? next.surface;
  if (kind === undefined || surface === "も") {
    return false;
  }
  return kind === "simultaneous" ||
    kind === "concession" ||
    kind === "quoted_concessive" ||
    (kind === "quotative" && isBareNominalQuoteStart(cursor, idx, numeric, lookups));
}

function mentionedHostCarriesCanonicalReformulationMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  const { tokens } = cursor;
  const head = tokens[idx];
  if (head === undefined) {
    return false;
  }
  const pos0 = head.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 代名詞 && pos0 !== 副詞) {
    return false;
  }
  const markerIdx = pos0 === 名詞
    ? nounPhraseHeadSpan(cursor, idx, numeric, null, lookups).endExclusive
    : idx + 1;
  const relation = cachedCanonicalReformulationMarkerRelationIndex(tokens)?.relationAtQuoteMarker(markerIdx);
  return relation !== undefined && relation.politeAuxSpan === null;
}

export function isBareNominalQuoteStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  return bareNominalQuoteBoundary(cursor, idx, numeric, lookups) !== null;
}

function isNominalLimitNegationPredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  const markerIdx = nounPhraseHeadSpan(cursor, idx, numeric, null, lookups).endExclusive;
  return quoteFocusLimitNegationTailStartingAt(cursor.fork(markerIdx, cursor.tokens.length, markerIdx)) !== null;
}

export interface NounPhraseHeadSpan {
  readonly numeral: NumericBasePayload | null;
  readonly suffixStart: number;
  readonly endExclusive: number;
}

export function nounPhraseHeadSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  reserved?: NumericHostSpanReservation | null,
  lookups?: LookupTables
): NounPhraseHeadSpan {
  const { tokens } = cursor;
  if (reserved !== undefined && reserved !== null) {
    const suffixStart = idx + reserved.consumed;
    return {
      numeral: reserved.plan,
      suffixStart,
      endExclusive: nounCompoundSuffixRunEnd(tokens, suffixStart)
    };
  }
  const head = tokens[idx];
  if (head !== undefined && isNumeralToken(head)) {
    const numeralCursor = cursor.fork(idx, tokens.length, idx);
    const numeral = tryNumeral(numeralCursor, numeric, numeralResolutionContext(tokens, lookups));
    if (numeral !== undefined) {
      return {
        numeral: numericBasePlanFrom(numeral),
        suffixStart: numeralCursor.pos,
        endExclusive: nounCompoundSuffixRunEnd(tokens, numeralCursor.pos)
      };
    }
  }
  return {
    numeral: null,
    suffixStart: idx + 1,
    endExclusive: nounCompoundSuffixRunEnd(tokens, idx + 1)
  };
}

function numeralResolutionContext(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables | undefined
): NumeralResolutionContext {
  return { copulaPredicateStartsAt: (idx) => copulaStartsPredicateAt(tokens, idx, lookups) };
}

export interface NumericHostSpanReservation {
  readonly consumed: number;
  readonly plan: NumericBasePayload;
}

function isStandaloneNumeralHeadSpan(span: NounPhraseHeadSpan, idx: number): boolean {
  return span.numeral !== null && span.suffixStart === idx + 1 && span.endExclusive === idx + 1;
}

function contextResolvedNounPhraseNumeral(
  input: IntegrationInput,
  localStart: number,
  baseOffset: number,
  span: NounPhraseHeadSpan & { readonly numeral: NumericBasePayload },
  contextTokens: readonly RuntimeHaruToken[] | undefined
): NumericBasePayload {
  const numeral = span.numeral;
  if (contextTokens === undefined || contextTokens === input.tokens) {
    return numeral;
  }
  const absoluteStart = baseOffset + localStart;
  if (contextTokens[absoluteStart] !== input.tokens[localStart]) {
    return numeral;
  }
  const contextCursor = new TokenCursor(contextTokens, absoluteStart, contextTokens.length, absoluteStart);
  const resolved = tryNumeral(contextCursor, input.numeric, numeralResolutionContext(contextTokens, input.lookups));
  if (resolved === undefined) {
    return numeral;
  }
  return contextCursor.pos - absoluteStart === span.suffixStart - localStart
    ? numericBasePlanFrom(resolved)
    : numeral;
}

export function isNounPhraseCopulaPredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  reserved?: NumericHostSpanReservation | null
): boolean {
  return nounPhraseCopulaPredicateStartKind(cursor, idx, numeric, lookups, reserved) !== "none";
}

export type NounPhraseCopulaStartKind =
  | "none"
  | "suffix_run"
  | "numeral_span_support"
  | "numeral_span";

export function nounPhraseCopulaPredicateStartKind(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  reserved?: NumericHostSpanReservation | null
): NounPhraseCopulaStartKind {
  if (isNounCopulaPredicateStart(cursor.tokens, idx, { lookups })) {
    return "suffix_run";
  }
  const head = cursor.tokens[idx];
  if (head === undefined || !isNominalCopulaHostPos(head.pos)) {
    return "none";
  }
  const span = nounPhraseHeadSpan(cursor, idx, numeric, reserved, lookups);
  if (span.endExclusive <= nounCompoundSuffixRunEnd(cursor.tokens, idx + 1)) {
    return "none";
  }
  if (!isNounCopulaPredicateStart(cursor.tokens, idx, {
    nounPhraseEndExclusive: span.endExclusive,
    lookups
  })) {
    return "none";
  }
  return isCopulaSupportChainStartAt(cursor.tokens, span.endExclusive)
    ? "numeral_span_support"
    : "numeral_span";
}

function isBareNominalQuoteContentNounPhrase(
  boundary: ClauseBoundary | undefined,
  nounPhraseEndIdx: number
): boolean {
  return boundary !== undefined &&
    boundary.kind !== "terminal" &&
    boundary.connectiveKind === "quotative" &&
    "tokenSpan" in boundary &&
    boundary.tokenSpan.start === nounPhraseEndIdx;
}

function bareNominalQuoteBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  idx: number,
  numeric: NumericTables,
  lookups?: LookupTables
): (ClauseBoundary & { readonly kind: "接続助詞" }) | null {
  const { tokens } = cursor;
  const noun = tokens[idx];
  const nounPos0 = noun === undefined ? 0 : (noun.pos & POS0);
  if (noun === undefined || (nounPos0 !== 名詞 && nounPos0 !== 代名詞)) {
    return null;
  }
  const markerIdx = nounPhraseHeadSpan(cursor, idx, numeric, null, lookups).endExclusive;
  const marker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["tail_multi_clause"]
  });
  if (marker?.canonicalSurface !== "と" && marker?.canonicalSurface !== "って") {
    return null;
  }
  if (lookups !== undefined) {
    const relation = quoteStructuralRelationAt(cursor.fork(markerIdx, tokens.length, markerIdx), lookups);
    if (
      relation !== undefined &&
      relation.quote.slotKind === "quoted_content" &&
      relation.quote.markerIdx === markerIdx &&
      relation.quote.contentSpan.endExclusive === markerIdx &&
      quoteHostAllowsBareNominalContent(tokens, relation, lookups)
    ) {
      const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups);
      if (boundary === null || boundary.kind !== "接続助詞") {
        return null;
      }
      return {
        kind: "接続助詞",
        connectiveKind: boundary.connectiveKind,
        surface: boundary.surface,
        tokenIdx: boundary.tokenIdx,
        tokenSpan: boundary.tokenSpan,
        ...(boundary.quoteBoundary === undefined ? {} : { quoteBoundary: boundary.quoteBoundary })
      };
    }
  }
  const host = tokens[marker.span.endExclusive];
  const passive = tokens[marker.span.endExclusive + 1];
  if (
    host === undefined ||
    (host.pos & POS0) !== 動詞 ||
    (host.dictionaryForm !== "思う" && host.dictionaryForm !== "考える") ||
    passive === undefined ||
    (passive.pos & POS4) !== 助動詞_レル
  ) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: "quotative",
    surface: marker.surface,
    tokenIdx: marker.span.endExclusive - 1,
    tokenSpan: { start: marker.span.start, end: marker.span.endExclusive - 1 },
    quoteBoundary: { koreanClauseForm: "다고", requestTailKind: null }
  };
}

function isNominalTerminalDatteHearsayStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens } = cursor;
  const startToken = tokens[start];
  if (
    startToken !== undefined &&
    (startToken.pos & POS0) === 代名詞 &&
    !lookups.WH_INDEFINITE_CORE_HEADS.has(startToken.dictionaryForm || startToken.surface)
  ) {
    return false;
  }
  const markerIdx = nounPhraseHeadSpan(cursor, start, numeric, null, lookups).endExclusive;
  const marker = datteQuoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] });
  if (marker === null || hasRealContentAfterIndex(tokens, marker.span.endExclusive, { stopAtHardTerminal: true })) {
    return false;
  }
  return classifyDatteMarkerAt(
    new TokenCursor(tokens, markerIdx, tokens.length, markerIdx),
    lookups,
    { terminalBoundary: true }
  ).role === "hearsay_terminal";
}

function isAdjectivalNounQuestionAlternativeStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number
): boolean {
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  if (!sourceAllowsPredicateCopulaHostCandidates(token)) {
    return false;
  }
  return matchCompositeConnectiveAt(cursor.fork(start + 1, tokens.length, start + 1), { requireEnd: false })?.connective === "question_content_alternative";
}

function isQuestionComplementHostPos(pos0: number): boolean {
  return pos0 === 名詞 || pos0 === 代名詞 || pos0 === 副詞;
}

export interface QuestionComplementProjection {
  readonly compositeConnective: string | null;
  readonly questionQuoteMarker: boolean;
}

export function questionComplementProjectionAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): QuestionComplementProjection | null {
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined || lookups === undefined) {
    return null;
  }
  if (!isQuestionComplementHostPos(token.pos & POS0)) {
    return null;
  }
  const kaIdx = start + 1;
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "kadouka") {
    return null;
  }
  if (participatesInStructuralKaParallel(new TokenCursor(tokens, kaIdx, tokens.length), lookups)) {
    return null;
  }
  if (quotativeDerivedIdiomClaimAt(tokens, kaIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return null;
  }
  if (
    nominalTerminalQuestionClosesUtteranceAt(
      cursor,
      kaIdx,
      terminalSfpRunEndAt(tokens, kaIdx, lookups),
      lookups
    )
  ) {
    return null;
  }
  const compositeConnective = matchCompositeConnectiveAt(
    cursor.fork(kaIdx, tokens.length, kaIdx),
    { requireEnd: false }
  )?.connective ?? null;
  return {
    compositeConnective: compositeConnective === "question_content_alternative" && kaOwnership !== "kadouka"
      ? null
      : compositeConnective,
    questionQuoteMarker: questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
      consumers: ["tail_multi_clause"],
      requireAdjacent: true
    })?.continuationKind === "question_quote_marker"
  };
}

function isQuotativeDerivedIdiomHostStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number
): boolean {
  const token = cursor.tokens[start];
  return token !== undefined &&
    isQuestionComplementHostPos(token.pos & POS0) &&
    quotativeDerivedIdiomClaimAt(cursor.tokens, start + 1, { consumers: ["tail_multi_clause"] }) !== null;
}

export function isQuestionComplementPredicateStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): boolean {
  if (isBareInterrogativeQuestionComplementStart(cursor, start, lookups)) {
    return true;
  }
  const projection = questionComplementProjectionAt(cursor, start, lookups);
  if (projection === null) {
    return false;
  }
  return projection.questionQuoteMarker ||
    projection.compositeConnective === "question_content" ||
    projection.compositeConnective === "question_content_alternative";
}

function isBareInterrogativeQuestionComplementStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  lookups?: LookupTables
): boolean {
  const token = cursor.tokens[start];
  if (lookups === undefined || token === undefined || !tokenIsInterrogativeLexeme(token, lookups)) {
    return false;
  }
  const kaIdx = start + 1;
  const ownership = kaOwnershipKindAt(cursor.tokens, kaIdx, lookups);
  if (ownership !== "question" && ownership !== "wh_indefinite") return false;
  if (participatesInStructuralKaParallel(new TokenCursor(cursor.tokens, kaIdx, cursor.tokens.length), lookups)) {
    return false;
  }
  if (
    questionContentContinuationAfterKaRelationAt(cursor.tokens, kaIdx, {
      consumers: ["tail_multi_clause"], requireAdjacent: true
    })?.continuationKind === "question_quote_marker" ||
    activeProtoLayout()?.lexicalAdverbialAffiliationAt(kaIdx)?.relation === "request_adjunct"
  ) return false;
  return looksQuestionTakingAfter(cursor.fork(kaIdx + 1, cursor.tokens.length, kaIdx + 1), lookups, {
    hostCapability: "content"
  });
}

function nominalTerminalQuestionDetachedClosureIndexAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): number | null {
  if (!isNominalQuestionTerminalStart(cursor, start, numeric, lookups)) {
    return null;
  }
  const { tokens } = cursor;
  const kaIdx = nounPhraseHeadSpan(cursor, start, numeric, null, lookups).endExclusive;
  const runEnd = terminalSfpRunEndAt(tokens, kaIdx, lookups);
  return NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES.has(
    utteranceClosureAfter(activeProtoLayout(), tokens, runEnd, { closureMarkerIdx: kaIdx }).closure
  )
    ? runEnd
    : null;
}

export function nominalTerminalQuestionClaimsHeadAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  return isNominalQuestionTerminalStart(cursor, start, numeric, lookups);
}

function isNominalQuestionTerminalStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens } = cursor;
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 代名詞) {
    return false;
  }
  const kaIdx = nounPhraseHeadSpan(cursor, start, numeric, null, lookups).endExclusive;
  const kaOwnership = kaOwnershipKindAt(tokens, kaIdx, lookups);
  if (kaOwnership !== "question" && kaOwnership !== "self_question_kana") {
    return false;
  }
  if (participatesInStructuralKaParallel(new TokenCursor(tokens, kaIdx, tokens.length), lookups)) {
    return false;
  }
  const runEnd = terminalSfpRunEndAt(tokens, kaIdx, lookups);
  if (
    confirmationKaRunIsQuotedAt(tokens, kaIdx, lookups) &&
    hostlessTerminalQuoteMarkerClosesSourceAt(tokens, runEnd)
  ) {
    return true;
  }
  return nominalTerminalQuestionClosesUtteranceAt(cursor, kaIdx, runEnd, lookups);
}

const NOMINAL_TERMINAL_QUESTION_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal",
  "detached_separation"
]);

const NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>(["detached_separation"]);

function nominalTerminalQuestionClosesUtteranceAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number,
  runEnd: number,
  lookups: LookupTables
): boolean {
  const evidence = utteranceClosureAfter(
    activeProtoLayout(),
    cursor.tokens,
    runEnd,
    { closureMarkerIdx: kaIdx }
  );
  if (!closesUtteranceAs(evidence, NOMINAL_TERMINAL_QUESTION_CLOSURES)) {
    return false;
  }
  if (!NOMINAL_TERMINAL_QUESTION_RECEIVER_TESTED_CLOSURES.has(evidence.closure)) {
    return true;
  }
  return !questionContentBoundaryHasHostAfterScanEnd(cursor, runEnd - 1, lookups);
}

function nominalTerminalQuestionClosureEndsChunkAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): boolean {
  return nominalTerminalQuestionDetachedClosureIndexAt(cursor, start, numeric, lookups) === scanEnd + 1;
}

function isAdjectivalNounQuestionContentStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const token = tokens[start];
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  if (!sourceAllowsPredicateCopulaHostCandidates(token)) {
    return false;
  }
  if (isKamoShirenaiModalStartAtToken(tokens, start + 1)) {
    return false;
  }
  return kaMarkerRelationAt(tokens, start + 1, ["tail_multi_clause"]) !== null;
}

function isSplitSuppletiveNegativeSurfaceStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const first = tokens[start];
  const second = tokens[start + 1];
  const firstNeg = tokens[start + 2];
  const outerNeg = tokens[start + 3];
  return first !== undefined &&
    second !== undefined &&
    firstNeg !== undefined &&
    outerNeg !== undefined &&
    (first.pos & POS0) === 名詞 &&
    caseParticleMarkerRelationForToken(second, start + 1, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    isNegationLikeToken(firstNeg) &&
    isNegationLikeToken(outerNeg);
}

function isNominalLikenessPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const next = tokens[start + 1];
  if (next?.surface === "のように" && (next.pos & POS0) === 助詞) {
    return true;
  }
  const nominalLinked = nominalLinkMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likeness = nominalLinked ? tokens[start + 2] : next;
  if (likeness === undefined) {
    return false;
  }
  if (
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return false;
  }
  const host = tokens[start];
  const hostIsPredicateLikenessStem =
    pos0in(host?.pos ?? 0, INFLECTABLE_BITS) ||
    (host !== undefined && (host.pos & POS0) === 形状詞);
  if (likeness.surface === "みたい" && hostIsPredicateLikenessStem) {
    return false;
  }
  if (likeness.surface === "よう" && !nominalLinked && hostIsPredicateLikenessStem) {
    return false;
  }
  return true;
}

function youNiCarrierVerbIndex(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number | null {
  if (fusedNoYouNiKeijoujiAttributiveAt(tokens, start + 1)) {
    const fusedCarrier = tokens[start + 2];
    return fusedCarrier !== undefined && (fusedCarrier.pos & POS0) === 動詞 ? start + 2 : null;
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessIdx = hasNoMarker ? start + 2 : start + 1;
  const likeness = tokens[likenessIdx];
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return null;
  }
  const niIdx = likenessIdx + 1;
  if (
    copulaNiMarkerRelationForToken(tokens[niIdx], niIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return null;
  }
  const carrierIdx = niIdx + 1;
  const carrier = tokens[carrierIdx];
  if (carrier === undefined || (carrier.pos & POS0) !== 動詞) {
    return null;
  }
  return carrierIdx;
}

function isYouNiChangeControlCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const carrierIdx = youNiCarrierVerbIndex(tokens, start);
  if (carrierIdx === null) {
    return false;
  }
  const carrier = tokens[carrierIdx]!;
  const form = carrier.dictionaryForm || carrier.surface;
  return form === "なる" || form === "なれる" || form === "する";
}

function isYouNiPerceptionCarrierStart(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const carrierIdx = youNiCarrierVerbIndex(tokens, start);
  if (carrierIdx === null) {
    return false;
  }
  return perceptionCarrierVerbMatch(tokens[carrierIdx], tokens[carrierIdx + 1]) !== null;
}

function findTailChunkScanEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  numeric: NumericTables,
  lookups: LookupTables
): number {
  const acknowledgmentClosure = speakerAcknowledgmentKaClosureIndexAt(tokens, start, lookups);
  const nominalQuestionClosure = nominalTerminalQuestionDetachedClosureIndexAt(
    new TokenCursor(tokens, start, tokens.length, start),
    start,
    numeric,
    lookups
  );
  let end = start;
  while (end < tokens.length) {
    if (acknowledgmentClosure !== null && end === acknowledgmentClosure) {
      return end - 1;
    }
    if (nominalQuestionClosure !== null && end === nominalQuestionClosure) {
      return end - 1;
    }
    if (terminalOnlyPredicateEndpointClosesBefore(tokens, start, end)) {
      return end - 1;
    }
    if (isClausePunctuationToken(tokens[end])) {
      const afterHostQuoteClose = skipHostEnclosingQuoteClose(tokens, start, end);
      if (end !== start + 1 || afterHostQuoteClose === end) {
        break;
      }
      end = afterHostQuoteClose;
      continue;
    }
    if (whitespaceJunctureEndsTailChunkAt(tokens, start, end)) {
      return end - 1;
    }
    if (pauseJunctureEndsTailChunkAt(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkFromConjunctionClause(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkAfterYouNiCarrier(tokens, start, end)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkFromFollowingPostverbClause(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (spaceSeparatesTailChunkAfterFiniteObligationClause(tokens, start, end)) {
      return end - 1;
    }
    if (terminalCopulaSeparatedFromFollowingClause(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (utteranceClosureRunEndsTailChunkAt(tokens, start, end, lookups)) {
      return end - 1;
    }
    if (
      end > start &&
      fusedCopulaSupportConnectiveKindOf(tokens[end]) !== null &&
      TAIL_CHUNK_SCAN_END_FUSED_HOST_SLOTS.has(fusedCopulaSupportHostSlotAt(tokens, end))
    ) {
      return end;
    }
    const nominalizedConditionalEnd = nominalizedCopulaConditionalTailChunkEndAt(tokens, start, end);
    if (nominalizedConditionalEnd !== null) {
      return nominalizedConditionalEnd;
    }
    end += 1;
  }
  return end - 1;
}

function whitespaceJunctureEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (idx <= start) {
    return false;
  }
  const runOrdinal = tokens[idx]?.whitespaceBefore?.runOrdinal;
  const juncture = activeProtoLayout()?.whitespaceJunctureAt(idx);
  return juncture !== undefined && runOrdinal !== undefined &&
    juncture.runOrdinal === runOrdinal && juncture.verdict === "boundary";
}

function pauseJunctureEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (idx <= start) {
    return false;
  }
  const runOrdinal = tokens[idx - 1]?.transparentPauseRunAfter?.ellipsisRunOrdinal;
  const juncture = activeProtoLayout()?.pauseJunctureAt(idx);
  return juncture !== undefined && runOrdinal !== undefined &&
    juncture.runOrdinal === runOrdinal && juncture.verdict === "boundary";
}

function nominalizedCopulaConditionalTailChunkEndAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): number | null {
  const token = tokens[idx];
  if (idx <= start || token === undefined || !isConditionalCopulaClauseBoundaryToken(token)) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx, start);
  if (hostIdx === null) {
    return null;
  }
  const nominalizer = predicateNominalizerRelationForToken(tokens[hostIdx], hostIdx, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const composite = matchCompositeConnectiveAt(
    new TokenCursor(tokens, idx, tokens.length, idx),
    { requireEnd: false }
  );
  return composite === null ? idx : idx + composite.consumed - 1;
}

const TAIL_CHUNK_SCAN_END_FUSED_HOST_SLOTS: ReadonlySet<FusedCopulaSupportHostSlot> =
  new Set<FusedCopulaSupportHostSlot>(["copula_host", "nominalized_host", "none"]);

const TAIL_CHUNK_SCAN_END_CLOSURE_RUNS: ReadonlySet<UtteranceClosureRunKind> = new Set<UtteranceClosureRunKind>([
  "terminal_particle_run"
]);

const TAIL_CHUNK_SCAN_END_CLOSURE_RUNS_REQUIRING_UTTERANCE_HEAD: ReadonlySet<UtteranceClosureRunKind> =
  new Set<UtteranceClosureRunKind>(["terminal_copula_run", "polite_terminal_chain"]);

function tailChunkScanEndAdmitsClosureRun(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  run: UtteranceClosureRunKind
): boolean {
  if (TAIL_CHUNK_SCAN_END_CLOSURE_RUNS.has(run)) {
    return true;
  }
  if (!TAIL_CHUNK_SCAN_END_CLOSURE_RUNS_REQUIRING_UTTERANCE_HEAD.has(run)) {
    return false;
  }
  const head = tokens[idx];
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (head === undefined || prev === null) {
    return false;
  }
  return followingChunkHeadAdmitted(tokens, idx, head, tailChunkLeftClauseLayer(tokens, start, prev));
}


function utteranceClosureRunEndsTailChunkAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (idx <= start || idx >= tokens.length) {
    return false;
  }
  const closure = activeProtoUtteranceClosureRunAt(idx);
  if (closure === null || !tailChunkScanEndAdmitsClosureRun(tokens, start, idx, closure.run)) {
    return false;
  }
  if (utteranceClosureRunConsumedByFollowingOwner(tokens, closure, idx, lookups)) {
    return false;
  }
  return closure.hostIdx >= start;
}

function utteranceClosureRunConsumedByFollowingOwner(
  tokens: readonly RuntimeHaruToken[],
  closure: UtteranceClosureRunEvidence,
  idx: number,
  lookups: LookupTables
): boolean {
  if (isLikenessCarrierHeadToken(tokens[idx])) {
    return true;
  }
  const cursor = new TokenCursor(tokens, idx, tokens.length, idx);
  const relation = quoteStructuralRelationAt(cursor, lookups);
  if (
    relation !== undefined &&
    relation.quote.contentSpan.start <= closure.hostIdx &&
    closure.hostIdx < relation.quote.contentSpan.endExclusive
  ) {
    return true;
  }
  const kaIdx = nextNonSpaceIndex(tokens, idx + 1, tokens.length);
  if (kaIdx !== null && kaOwnershipKindAt(tokens, kaIdx, lookups) === "toka_listing") {
    return true;
  }
  if (hostlessTerminalQuoteMarkerClosesSourceAt(tokens, idx)) {
    return true;
  }
  return false;
}

function hostlessTerminalQuoteMarkerClosesSourceAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const marker = tokaTteCompositeQuoteCandidateAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    tokaQuoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    quoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] }) ??
    datteQuoteMarkerRelationAt(tokens, idx, { consumers: ["tail_multi_clause"] });
  if (marker === null) {
    return false;
  }
  return !hasRealContentAfterIndex(tokens, marker.span.endExclusive, { stopAtHardTerminal: true });
}

function spaceSeparatesTailChunkAfterYouNiCarrier(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  let prev = previousNonSpaceIndex(tokens, idx, start);
  while (prev !== null && ((tokens[prev]!.pos & POS0) === 助動詞0)) {
    prev = previousNonSpaceIndex(tokens, prev, start);
  }
  if (prev === null) {
    return false;
  }
  const carrier = tokens[prev]!;
  if ((carrier.pos & POS0) !== 動詞 || (carrier.pos & POS5A) === 連体形_) {
    return false;
  }
  const carrierForm = carrier.dictionaryForm ?? carrier.surface;
  const isCarrierVerb =
    carrierForm === "する" || carrierForm === "なる" || carrierForm === "なれる" || carrierForm === "成る" ||
    appearancePerceptionReadingForToken(carrier) !== null;
  if (!isCarrierVerb) {
    return false;
  }
  const niIdx = previousNonSpaceIndex(tokens, prev, 0);
  if (niIdx === null) {
    return false;
  }
  const mergedNoYouni = tokens[niIdx]!;
  if (mergedNoYouni.surface === "のように" && (mergedNoYouni.pos & POS01) === 助詞_格助詞) {
    return true;
  }
  if (
    copulaNiMarkerRelationForToken(tokens[niIdx], niIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  const youIdx = previousNonSpaceIndex(tokens, niIdx, 0);
  const you = youIdx !== null ? tokens[youIdx] : undefined;
  return (
    you !== undefined &&
    (you.surface === "よう" || you.surface === "様" || you.surface === "みたい" || you.surface === "そう") &&
    (you.pos & POS1) === 助動詞語幹
  );
}

function youNiCarrierRenyouChuushiSpaceTerminalAllowed(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  const carrier = tokens[end];
  if (
    carrier === undefined || (carrier.pos & (POS0 | POS5A)) !== (動詞 | 連用形_)
  ) {
    return false;
  }
  const carrierForm = carrier.dictionaryForm ?? carrier.surface;
  if (
    carrierForm !== "なる" && carrierForm !== "なれる" &&
    carrierForm !== "成る" && carrierForm !== "する"
  ) {
    return false;
  }
  const niIdx = end - 1;
  const ni = tokens[niIdx];
  if (
    ni === undefined ||
    copulaNiMarkerRelationForToken(ni, niIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  const you = tokens[niIdx - 1];
  if (
    you === undefined ||
    (you.surface !== "よう" && you.surface !== "様" && you.surface !== "みたい" && you.surface !== "そう") ||
    (you.pos & POS1) !== 助動詞語幹
  ) {
    return false;
  }
  return tokens[end + 1] !== undefined &&
    separatedAs(tokens, end + 1, SEPARATION_OPENS_BOUNDARY);
}

function spaceSeparatesTailChunkFromConjunctionClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  if ((token.pos & POS0) !== 接続詞) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  const prevForm = tokens[prev]!.pos & POS5A;
  return prevForm === 終止形_ || prevForm === 命令形_ || isTeTailImperativeFormClosureAt(tokens, prev);
}

function spaceSeparatesTailChunkFromFollowingPostverbClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  const prevForm = tokens[prev]!.pos & POS5A;
  if (prevForm !== 終止形_ && prevForm !== 命令形_ && !isTeTailImperativeFormClosureAt(tokens, prev)) {
    return false;
  }
  let prevIsPostverbOperatorTail = false;
  for (let teIdx = prev - 1; teIdx >= start; teIdx -= 1) {
    const relation = teDeContinuationRelationAt(tokens, teIdx, {
      requirement: "layout_nonspace_tail",
      consumers: ["tail_multi_clause"],
      lookups
    });
    if (relation !== null && relation.span.endExclusive === prev + 1) {
      prevIsPostverbOperatorTail = true;
      break;
    }
  }
  if (!prevIsPostverbOperatorTail) {
    return false;
  }
  for (let i = idx; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    if (isClausePunctuationToken(token)) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0in(pos0, INFLECTABLE_AUX_BITS)) {
      return true;
    }
  }
  return false;
}

function spaceSeparatesTailChunkAfterFiniteObligationClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  if (!hasSeparatedFinitePredicateBoundary(tokens, idx)) {
    return false;
  }
  for (let spanStart = idx - 1; spanStart >= start; spanStart -= 1) {
    if (obligationSpanEndExclusiveAt(tokens, spanStart) === idx) {
      return true;
    }
  }
  return false;
}

function tailFunctionalResidualSuffixCanStayUnresolved(
  tokens: readonly RuntimeHaruToken[],
  suffixStart: number,
  scanEnd: number
): boolean {
  if (suffixStart > scanEnd) {
    return false;
  }
  for (let idx = suffixStart; idx <= scanEnd; idx += 1) {
    const token = tokens[idx];
    if (token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  return !terminalSfpRunConsumedThrough(tokens, suffixStart, scanEnd);
}

function tailRootHasSourceBearingPartialPrefix(root: TailRoot): boolean {
  if (root.sfp !== null) {
    return true;
  }
  const layer = firstAuxLayer(root.tail);
  return (layer?.ops.length ?? 0) > 0;
}

function terminalCopulaSeparatedFromFollowingClause(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  if (!separatedAs(tokens, idx, SEPARATION_OPENS_BOUNDARY) || idx <= start) {
    return false;
  }
  const head = tokens[idx];
  if (head === undefined) {
    return false;
  }
  const prev = previousNonSpaceIndex(tokens, idx, start);
  if (prev === null) {
    return false;
  }
  if (!copulaPredicateChainEndsAt(tokens, start, idx, prev, lookups)) {
    return false;
  }
  return followingChunkHeadAdmitted(tokens, idx, head, tailChunkLeftClauseLayer(tokens, start, prev));
}

function copulaPredicateChainEndsAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  prev: number,
  lookups: LookupTables
): boolean {
  if (isClauseClosingCopulaTailEndToken(tokens[prev])) {
    return true;
  }
  if (copulaSupportChainClosesUnattributivelyAt(tokens, start, prev)) {
    return true;
  }
  if (homophonousTerminalCopulaChainLayerAt(tokens, start, prev) !== null) {
    return true;
  }
  if (negativeCopulaPredicateEndsAt(tokens, start, idx, lookups)) {
    return true;
  }
  return spaceSeparatesTailChunkAfterYouNiCarrier(tokens, start, idx);
}

function copulaSupportChainClosesUnattributivelyAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): boolean {
  const bodyIdx = copulaSupportChainBodyIndex(tokens, prev, isVolitionalInflection);
  if (bodyIdx === null || bodyIdx - 1 < start || !copulaSupportMarkerOwnsDeAt(tokens, bodyIdx - 1)) {
    return false;
  }
  return !conjecturalCopulaAttributiveEndpointClaimed(tokens, prev);
}

type HomophonousTerminalCopulaLayer = "support" | "simple_tensed";

function homophonousTerminalCopulaChainLayerAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): HomophonousTerminalCopulaLayer | null {
  const supportBodyIdx = copulaSupportChainBodyIndex(tokens, prev, isTerminalInflection);
  if (
    supportBodyIdx !== null &&
    supportBodyIdx - 1 >= start &&
    copulaSupportMarkerOwnsDeAt(tokens, supportBodyIdx - 1)
  ) {
    return "support";
  }
  return simpleTensedCopulaChainClosesAt(tokens, start, prev) ? "simple_tensed" : null;
}

function simpleTensedCopulaChainClosesAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): boolean {
  const chainEnd = tokens[prev];
  if (chainEnd === undefined || !isTerminalInflection(chainEnd.pos)) {
    return false;
  }
  const bodyIdx = copulaChainIndexBelowTenseAndPoliteLayers(tokens, prev);
  if (bodyIdx === prev || bodyIdx < start) {
    return false;
  }
  const body = tokens[bodyIdx];
  if (body === undefined || !isAuxiliaryToken(body)) {
    return false;
  }
  if (!isAssertiveCopulaFamilyPos(body.pos) && !isPoliteCopulaPos(body.pos)) {
    return false;
  }
  return isRenyouInflection(body.pos);
}

type TailChunkLeftClauseLayer = "clause_closing" | "clause_closing_adnominal_capable" | "non_closing";

function tailChunkLeftClauseLayer(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  prev: number
): TailChunkLeftClauseLayer {
  const token = tokens[prev];
  if (token === undefined) {
    return "non_closing";
  }
  if (homophonousTerminalCopulaChainLayerAt(tokens, start, prev) === "support") {
    return "clause_closing_adnominal_capable";
  }
  return isTerminalInflection(token.pos) || isVolitionalInflection(token.pos) ? "clause_closing" : "non_closing";
}

function followingChunkHeadAdmitted(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  head: RuntimeHaruToken,
  layer: TailChunkLeftClauseLayer
): boolean {
  if (isRefusedUtteranceHeadToken(head)) {
    return false;
  }
  if (layer === "non_closing") {
    return pos0in(head.pos, NOMINAL_BITS);
  }
  if (demoDiscourseUtteranceInitialMatchLengthAt(tokens, idx) !== null) {
    return true;
  }
  if (!isIndependentWordToken(head)) {
    return false;
  }
  return layer === "clause_closing" || !pos0in(head.pos, NOMINAL_BITS);
}

function negativeCopulaPredicateEndsAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number,
  lookups: LookupTables
): boolean {
  for (let hostIdx = idx - 1; hostIdx >= start; hostIdx -= 1) {
    if (negativeCopulaPredicateSpanEndExclusive(tokens, hostIdx, lookups) === idx) {
      return true;
    }
  }
  return false;
}

function isClauseClosingCopulaTailEndToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !isAuxiliaryToken(token)) {
    return false;
  }
  if (!isAssertiveCopulaFamilyPos(token.pos) && !isPoliteCopulaPos(token.pos)) {
    return false;
  }
  return isTerminalInflection(token.pos) || isVolitionalInflection(token.pos);
}

function renyouChuushiContinuationReach(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number {
  const scopedEnd = activeProtoScopedScanEnd(tokens, contentEndIdx, "evidence_window");
  return scopedEnd === null ? contentEndIdx + 1 : Math.min(scopedEnd, tokens.length);
}

function hasRenyouChuushiContinuation(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  if (teOkuEvaluationReasonBoundaryAfter(tokens, contentEndIdx)) {
    const reach = renyouChuushiContinuationReach(tokens, contentEndIdx);
    return skipClausePunctuationForward(tokens, contentEndIdx + 1, tokens.length) < reach;
  }
  if (renyouChuushiClosureLeftAt(tokens, contentEndIdx, lookups) === null) {
    if (renyouJunctureEvidenceAt(tokens, contentEndIdx + 1, lookups)?.verdict === "cohesion") {
      return false;
    }
    return renyouChuushiClosureGovernedAfter(
      tokens,
      contentEndIdx,
      renyouChuushiContinuationReach(tokens, contentEndIdx),
      (t, i) => isSupportedClauseStart(t, i, lookups),
      lookups
    );
  }
  return renyouChuushiClosureAdmittedAt(tokens, contentEndIdx, lookups);
}

function renyouChuushiClosureAdmittedAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  const closure = chuushiClosureEvidenceAt(tokens, contentEndIdx + 1, lookups);
  return closure?.hostKind === "renyou" && (closure.right === "governed" || closure.right === "elliptic");
}

function renyouChuushiClosesDetachedUtteranceAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  outgoingBoundary: ClauseBoundary,
  lookups: LookupTables
): boolean {
  return outgoingBoundary.kind === "terminal" && renyouChuushiDetachedClosureAt(tokens, contentEndIdx, lookups);
}

function renyouChuushiDetachedClosureAt(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  const closure = chuushiClosureEvidenceAt(tokens, contentEndIdx + 1, lookups);
  return closure?.hostKind === "renyou" && closure.right === "detached";
}

async function renyouChuushiTerminalAllowedForEnd(input: IntegrationInput, end: number): Promise<boolean> {
  return hasRenyouChuushiContinuationForEnd(input.tokens, end, input.lookups) ||
    await streamVvCompoundPairLacksRegisteredOwnerAt(
      input.tokens,
      end,
      input.dictionary as unknown as MorphemeDictionary
    );
}

function hasRenyouChuushiContinuationForEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  if (hasRenyouChuushiContinuation(tokens, contentEndIdx, lookups)) {
    return true;
  }
  if (
    isBareCopulaDeRenyouEnd(tokens, contentEndIdx) &&
    hasCopulaDeRenyouChuushiContinuation(tokens, contentEndIdx, lookups)
  ) {
    return true;
  }
  return isCopulaNegativeRenyouBoundaryEnd(tokens, contentEndIdx, lookups) &&
    hasCopulaClauseContinuationEvidenceAfter(tokens, contentEndIdx, lookups, "adversative");
}

function isBareTteQuotativeBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  scanEnd: number
): boolean {
  if (end <= start || end >= scanEnd) return false;
  const marker = quoteMarkerRelationAt(tokens, end, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "って") return false;
  const prevIdx = previousNonSpaceIndex(tokens, end, start);
  if (prevIdx === null) return false;
  const prevToken = tokens[prevIdx]!;
  const prevPos0 = prevToken.pos & POS0;
  if (prevPos0 !== 動詞 && prevPos0 !== 形容詞0 && prevPos0 !== 助動詞0 && prevPos0 !== 形状詞) return false;
  if (
    (prevToken.pos & POS5A) === 意志推量形_ &&
    activeProtoClosedPropositionBeforeMarkerAt(tokens, end)?.evidence !== "bare_volitional"
  ) return false;
  const next = tokens[end + 1]!;
  if (IU_LEXEME_FORMS.has(next.dictionaryForm)) return false;
  if ((next.pos & POS01) === 助詞_準体助詞) {
    return !bareTteNoNominalizerConcessionApplies(tokens, end + 1, prevToken);
  }
  const headKind = classifyAttributiveHeadKind(next);
  if (headKind !== "ordinary_nominal") return false;
  if (isBareTteAttributiveNounHead(next) && !isMonoAttributiveHead(next)) return false;
  return true;
}

function withQuotedQuestionContext(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: ClauseBoundary,
  _lookups: LookupTables
): ClauseBoundary {
  if (
    boundary.kind === "terminal" ||
    boundary.connectiveKind !== "question_content" ||
    boundary.quotedQuestionContext === true
  ) {
    return boundary;
  }
  const { tokens } = cursor;
  const toIdx = nextNonSpaceIndex(tokens, boundary.tokenIdx + 1, tokens.length);
  const to = toIdx === null ? undefined : tokens[toIdx];
  if (to === undefined || (to.pos & POS01) !== 助詞_格助詞 || to.surface !== "と") {
    return boundary;
  }
  const kaIdx = toIdx === null ? null : nextNonSpaceIndex(tokens, toIdx + 1, tokens.length);
  const ka = kaIdx === null ? undefined : tokens[kaIdx];
  return ka !== undefined && (ka.pos & POS01) === 助詞_副助詞 && (ka.surface === "か")
    ? { ...boundary, quotedQuestionContext: true }
    : boundary;
}

function legalTailChunkPartialBoundaries(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  scanEnd: number,
  numeric: NumericTables,
  lookups: LookupTables
): ReadonlyMap<number, ClauseBoundary> {
  const { tokens } = cursor;
  const cacheKey = `${start}:${scanEnd}`;
  let perTokenCache = partialBoundaryCache.get(tokens);
  if (perTokenCache === undefined) {
    perTokenCache = new Map();
    partialBoundaryCache.set(tokens, perTokenCache);
  } else {
    const cached = perTokenCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }
  const partialBoundaries = new Map<number, ClauseBoundary>();
  const partialCursor = cursor.fork(start, scanEnd + 1, start);
  const putPartialBoundary = (end: number, normalized: ClauseBoundary): void => {
    const existing = partialBoundaries.get(end);
    if (existing === undefined || boundarySpanLength(normalized) > boundarySpanLength(existing)) {
      partialBoundaries.set(end, normalized);
    }
  };
  const openUtteranceClosingSfpFallbackEnd = (markerIdx: number): void => {
    const sfpIdx = previousNonSpaceIndex(tokens, markerIdx, start);
    if (sfpIdx === null || sfpIdx <= start || sfpIdx > scanEnd) {
      return;
    }
    const sfp = tokens[sfpIdx];
    if (sfp === undefined || (sfp.pos & POS01) !== 助詞_終助詞) {
      return;
    }
    if (!utteranceClosingSfpFallbackChainAdmitted(tokens, sfpIdx, start)) {
      return;
    }
    putPartialBoundary(sfpIdx, { kind: "terminal" });
  };
  const setPartialBoundary = (end: number, boundary: ClauseBoundary): void => {
    const ownedBoundary = normalizeTokaListingBoundary(cursor, boundary, lookups);
    const augmented = withQuotedQuestionContext(cursor, ownedBoundary, lookups);
    const normalized = normalizeClauseBoundarySourceSpan(partialCursor, augmented);
    putPartialBoundary(end, normalized);
    if (normalized.kind !== "terminal") {
      openUtteranceClosingSfpFallbackEnd(normalized.tokenSpan.start);
    }
  };
  const evidenceLayout = activeProtoLayout() ?? buildProtoLayout(tokens, lookups);
  const bareNominalQuoteBound = bareNominalQuoteBoundary(cursor, start, numeric, lookups);
  if (bareNominalQuoteBound !== null && bareNominalQuoteBound.tokenSpan.end <= scanEnd) {
    setPartialBoundary(bareNominalQuoteBound.tokenSpan.end, bareNominalQuoteBound);
  }
  if (isZeroNominalizedParallelMoFrameEnd(tokens, start)) {
    setPartialBoundary(start, { kind: "terminal" });
  }
  for (let end = start + 1; end <= scanEnd; end += 1) {
    const volitionalPurposeBoundary = volitionalPurposeToBoundaryEndingAt(tokens, start, end, scanEnd, lookups);
    if (volitionalPurposeBoundary !== null) {
      setPartialBoundary(end, volitionalPurposeBoundary);
    }
    const conditionalNominalBoundary = conditionalBaNominalMainClauseBoundaryEnd(tokens, end, scanEnd);
    if (conditionalNominalBoundary !== null) {
      setPartialBoundary(end, conditionalNominalBoundary);
    }
    if (isBareTteQuotativeBoundaryEnd(tokens, start, end, scanEnd)) {
      setPartialBoundary(end, {
        kind: "合成接続",
        connectiveKind: "quotative",
        surface: tokens[end]!.surface,
        tokenIdx: end,
        tokenSpan: { start: end, end }
      });
    }
    if (isCopulaConcessiveImperativeBoundaryEnd(tokens, start, end, scanEnd, lookups)) {
      setPartialBoundary(end, {
        kind: "合成接続",
        connectiveKind: "even_if",
        surface: DEARE_CONCESSIVE_CONNECTIVE_SURFACE,
        tokenIdx: end,
        tokenSpan: { start: end - 1, end }
      });
    }
    const likenessConditionMarkerStart = end < scanEnd &&
      likenessEvaluativeConditionHasConsequentAt(cursor, end + 1)
      ? likenessEvaluativeConditionMarkerStartEndingAt(partialCursor, end)
      : null;
    if (likenessConditionMarkerStart !== null) {
      setPartialBoundary(end, {
        kind: "合成接続",
        connectiveKind: "conditional",
        surface: "では",
        tokenIdx: end,
        tokenSpan: { start: likenessConditionMarkerStart, end }
      });
    }
    if (isBareQuoteAttributiveCarrierBoundary(tokens, end, end + 1, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isFunctionalTailBoundaryEnd(partialCursor, start, end, scanEnd, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isPlainNominalizerParticleBoundaryEnd(tokens, end, scanEnd, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isPlainNominalizerZeroFollowerFrameEnd(tokens, end, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (end > start && closesClauseAtDetachedTerminalNodaAfter(evidenceLayout, tokens, end + 1)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isPlainNominalizerParticleFrameEnd(tokens, end + 1, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isZeroNominalizedParallelMoFrameEnd(tokens, end)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isBekiRentaiNominalizedFrameEnd(tokens, end, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isAdverbialLikenessBoundaryEnd(tokens, start, end, scanEnd, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isExemplificationGenitiveBoundaryEnd(tokens, end, scanEnd)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isBareExemplificationBoundaryEnd(tokens, end, scanEnd)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isPredicateScopeCarrierSuffixStart(tokens, end + 1)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (structuralAttributiveAssemblerSuffixPayload(tokens, start, end + 1, lookups) !== null) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (chunkEndsWithAdnominalCopulaAttributiveHead(tokens, start, end, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isSoudaYotaiAdverbialModifierBoundaryEnd(tokens, end, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isDeclaredProjectionCarrierAdverbialBoundaryEnd(tokens, start, end, lookups)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    if (isHazuNominalAttributiveBoundaryEnd(tokens, end)) {
      setPartialBoundary(end, { kind: "terminal" });
    }
    const unlicensedPermissionBoundary = unlicensedPlainTePermissionAttributiveBoundaryEnd(tokens, start, end);
    if (unlicensedPermissionBoundary !== null) {
      setPartialBoundary(end, unlicensedPermissionBoundary);
    }
    const quoteFocusBoundary = quoteFocusTailBoundaryAt(partialCursor, end, scanEnd, lookups);
    if (quoteFocusBoundary !== null) {
      setPartialBoundary(end, quoteFocusBoundary);
    }
  }
  if (isPredicateScopeCarrierSuffixStart(tokens, start + 1)) {
    setPartialBoundary(start, { kind: "terminal" });
  }
  if (structuralAttributiveAssemblerSuffixPayload(tokens, start, start + 1, lookups) !== null) {
    setPartialBoundary(start, { kind: "terminal" });
  }
  for (let markerIdx = start + 1; markerIdx <= scanEnd; markerIdx += 1) {
    if (quoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
      openUtteranceClosingSfpFallbackEnd(markerIdx);
    }
    const projection = matchPredicateProjectionConnectiveAt(tokens, markerIdx, { requireEnd: false, lookups });
    if (projection?.connective === "predicate_projection_quote_attributive") {
      const end = markerIdx + projection.consumed - 1;
      if (end >= start && end <= scanEnd && isNominalLikeAttributiveHead(tokens[end + 1])) {
        setPartialBoundary(end, { kind: "terminal" });
      }
    }

    const endExclusive = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
    if (endExclusive === null) {
      continue;
    }
    const end = endExclusive - 1;
    const boundarySplitAt = toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups);
    if (
      end >= start &&
      end <= scanEnd &&
      boundarySplitAt !== null &&
      classifyStructuralAttributiveBoundaryPayload(tokens, start, end, boundarySplitAt, lookups) !== null
    ) {
      setPartialBoundary(end, { kind: "terminal" });
    }
  }
  const boundaryEvents = clauseBoundaryEventsForRuntimeTokens(tokens, lookups);
  for (const event of boundaryEvents) {
    if (event.kind !== "attributive") continue;
    const end = event.splitAt - 1;
    if (boundaryEvents.some((other) => other.splitAt > start && other.splitAt < event.splitAt)) {
      continue;
    }
    if (end >= start && end <= scanEnd && classifyStructuralAttributiveBoundaryPayload(tokens, start, end, event.splitAt, lookups) !== null) {
      setPartialBoundary(end, { kind: "terminal" });
    }
  }
  for (const headIdx of evidenceLayout.bareKeijoujiAttributiveHeads.keys()) {
    const end = headIdx - 1;
    if (end >= start && end <= scanEnd && classifyStructuralAttributiveBoundaryPayload(tokens, start, end, headIdx, lookups) !== null) {
      setPartialBoundary(end, { kind: "terminal" });
    }
  }
  const explicitAdnominalNoEnd = start + 1;
  if (
    explicitAdnominalNoEnd <= scanEnd &&
    classifyStructuralAttributiveBoundaryPayload(tokens, start, explicitAdnominalNoEnd, explicitAdnominalNoEnd + 1, lookups)
      ?.explicitAdnominalMarker !== undefined
  ) {
    setPartialBoundary(explicitAdnominalNoEnd, { kind: "terminal" });
  }
  const boundaryReachEnd = clauseBoundaryDetectionReachEnd(tokens, scanEnd, lookups);
  const boundaries = findClauseBoundaries(partialCursor.fork(start, boundaryReachEnd, start), lookups);
  for (const boundary of boundaries) {
    const end = boundary.splitAt - 1;
    if (end >= start && end <= scanEnd) {
      setPartialBoundary(end, boundary.boundary);
    }
  }

  for (const prefixBoundary of sourceBearingConnectivePrefixBoundaries(partialCursor.fork(start + 1, scanEnd + 1, start + 1), start, scanEnd, lookups)) {
    const suffixStart = prefixBoundary.end + 1;
    if (tailPartialSuffixCanStayInAssembler(partialCursor, suffixStart, scanEnd, prefixBoundary.boundary, lookups)) {
      setPartialBoundary(prefixBoundary.end, prefixBoundary.boundary);
    }
  }
  for (const closure of evidenceLayout.chuushiClosures.values()) {
    const end = closure.splitAt - 1;
    if (closure.right === "detached" && end > start && end <= scanEnd) {
      partialBoundaries.set(end, { kind: "terminal" });
    }
  }
  perTokenCache.set(cacheKey, partialBoundaries);
  return partialBoundaries;
}

function utteranceClosingSfpFallbackChainAdmitted(
  tokens: readonly RuntimeHaruToken[],
  sfpIdx: number,
  lowerBoundInclusive: number
): boolean {
  let runStartIdx = sfpIdx;
  for (;;) {
    const previousIdx = previousNonSpaceIndex(tokens, runStartIdx, lowerBoundInclusive);
    if (previousIdx === null || previousIdx < lowerBoundInclusive) {
      break;
    }
    const previous = tokens[previousIdx];
    if (previous === undefined || (previous.pos & POS01) !== 助詞_終助詞) {
      break;
    }
    runStartIdx = previousIdx;
  }
  let chainEndIdx = previousNonSpaceIndex(tokens, runStartIdx, lowerBoundInclusive);
  const runHead = chainEndIdx === null ? undefined : tokens[chainEndIdx];
  if (chainEndIdx === null || runHead === undefined) {
    return false;
  }
  if (isCopulaOfKind(runHead, 意志推量形_)) {
    return true;
  }
  if (isCopulaOfKind(runHead, 終止形_)) {
    chainEndIdx = previousNonSpaceIndex(tokens, chainEndIdx, lowerBoundInclusive);
  }
  if (chainEndIdx !== null && isTerminalNodaMarkerAt(tokens, chainEndIdx)) {
    chainEndIdx = previousNonSpaceIndex(tokens, chainEndIdx, lowerBoundInclusive);
  }
  if (chainEndIdx === null || tokens[chainEndIdx] === undefined) {
    return false;
  }
  for (let back = chainEndIdx, steps = 0; back >= lowerBoundInclusive && steps < 3; back -= 1, steps += 1) {
    const token = tokens[back];
    if (token === undefined) {
      break;
    }
    if (
      (token.pos & POS01) === 助詞_接続助詞 &&
      token.surface === "ば" &&
      isBaSufficiencyConditionalAt(tokens, back)
    ) {
      return true;
    }
  }
  return isObligationSpanContaining(tokens, chainEndIdx);
}

function isCopulaOfKind(token: RuntimeHaruToken, form5A: number): boolean {
  if ((token.pos & (POS0 | POS5A)) !== (助動詞0 | form5A)) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === 助動詞_ダ || pos4 === 助動詞_デス;
}

function isTerminalNodaMarkerAt(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  return predicateNominalizerRelationForToken(tokens[idx], idx, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  })?.nominalizerKind === "no";
}

function normalizeTokaListingBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundary: ClauseBoundary,
  lookups: LookupTables,
): ClauseBoundary {
  if (boundary.kind === "terminal") {
    return boundary;
  }
  const toIdx = boundary.connectiveKind === "question_content"
    ? previousNonSpaceIndex(cursor.tokens, boundary.tokenIdx, 0)
    : boundary.connectiveKind === "conditional" && boundary.surface === "と"
      ? boundary.tokenIdx
      : null;
  if (toIdx === null) {
    return boundary;
  }
  const kaIdx = boundary.connectiveKind === "question_content"
    ? boundary.tokenIdx
    : nextNonSpaceIndex(cursor.tokens, toIdx + 1, cursor.tokens.length);
  if (kaIdx === null || kaOwnershipKindAt(cursor.tokens, kaIdx, lookups) !== "toka_listing") {
    return boundary;
  }
  const precedingIdx = previousNonSpaceIndex(cursor.tokens, toIdx, 0);
  if (
    boundary.connectiveKind === "conditional" &&
    !isFinitePredicateBoundaryLeft(precedingIdx === null ? undefined : cursor.tokens[precedingIdx])
  ) {
    return boundary;
  }
  if (precedingIdx !== null && kaMarkerRelationAt(cursor.tokens, precedingIdx, ["tail_multi_clause"]) !== null) {
    return boundary;
  }
  if (precedingIdx !== null && ((cursor.tokens[precedingIdx]?.pos ?? 0) & POS5A) === 意志推量形_) {
    const closure = closedPropositionTokaKaRelationAt(cursor.tokens, kaIdx);
    if (
      closure?.evidence !== "bare_volitional" ||
      tokaTteCompositeQuoteCandidateAt(cursor.tokens, toIdx, { consumers: ["tail_multi_clause"] }) !== null ||
      quoteStructuralRelationAt(new TokenCursor(cursor.tokens, toIdx, cursor.tokens.length, toIdx), lookups)
        ?.quote.markerSpan.start === toIdx ||
      !closedPropositionTokaListingEvidenceAt(cursor.tokens, closure, lookups)
    ) {
      return boundary;
    }
  }
  return {
    ...boundary,
    connectiveKind: "exemplification",
    surface: "とか",
    tokenIdx: kaIdx,
    tokenSpan: { start: toIdx, end: Math.max(boundary.tokenSpan.end, kaIdx) },
  };
}

function isHazuNominalAttributiveBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  const hazu = tokens[end - 1];
  const no = tokens[end];
  const head = tokens[end + 1];
  if (
    hazu === undefined ||
    no === undefined ||
    head === undefined ||
    (hazu.pos & POS0) !== 名詞 ||
    ((hazu.dictionaryForm || hazu.surface) !== "はず" && (hazu.dictionaryForm || hazu.surface) !== "筈") ||
    nominalLinkMarkerRelationAt(tokens, end, { consumers: ["tail_multi_clause"] }) === null
  ) {
    return false;
  }
  return isNominalLikeAttributiveHead(head);
}

function chainEndTokenClosesAsVerbalRenyou(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  next: RuntimeHaruToken | undefined
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isRenyouInflectedToken(token)) {
    return false;
  }
  const collapsedAspect = collapsedAspectAuxKind(token);
  if (collapsedAspect !== null) {
    return aspectResultHostCategory(collapsedAspect) === "verbal_predicate";
  }
  const declared = chainFinalOpHostCategory(classifySingleAuxTokenOps(token, next, idx).at(-1));
  return declared === undefined ? isVerbPredicateToken(token) : declared === "verbal_predicate";
}

function unlicensedPlainTePermissionAttributiveBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): ClauseBoundary | null {
  const marker = tokens[end];
  const connective = marker === undefined ? undefined : lookupConnectiveBySurface(marker.surface);
  if (
    marker === undefined || (marker.pos & POS01) !== 助詞_接続助詞 || marker.surface !== "て" && marker.surface !== "で" || connective === undefined
  ) {
    return null;
  }
  const previous = previousClauseNonPunctuationIndex(tokens, end - 1, start);
  if (previous === null || !chainEndTokenClosesAsVerbalRenyou(tokens, previous, marker)) {
    return null;
  }
  const predicate = matchPermissionPredicateAt(tokens, end + 1);
  if (predicate === null) {
    return null;
  }
  const afterPredicate = end + 1 + predicate.consumed;
  if (isClausePunctuationToken(tokens[afterPredicate])) {
    return null;
  }
  const headIdx = nextClauseNonPunctuationIndex(tokens, afterPredicate, tokens.length);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined || !pos0in(head.pos, NOMINAL_BITS)) {
    return null;
  }
  const headForm = head.dictionaryForm || head.surface;
  if (
    PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(headForm) ||
    PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(head.surface)
  ) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: connective,
    surface: marker.surface,
    tokenIdx: end,
    tokenSpan: { start: end, end }
  };
}

export function volitionalPurposeToBoundaryEndingAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const markerStart = tokens[end]?.surface === "と" ? end : end - 1;
  if (markerStart <= start) {
    return null;
  }
  const attempt = volitionalAttemptMarkerAt(tokens, markerStart);
  const lexical = attempt === null ? activeProtoLayout()?.volitionalIntentBindingAt(markerStart) : undefined;
  if (lexical !== undefined && lexical.predicateIdx > scanEnd) {
    return null;
  }
  const marker = attempt ?? lexical ?? null;
  if (marker === null || markerStart + marker.tokenCount - 1 !== end) {
    return null;
  }
  const left = previousClauseNonPunctuationIndex(tokens, markerStart - 1, start);
  const leftToken = left === null ? undefined : tokens[left];
  if (leftToken === undefined || (leftToken.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  const nextStart = skipClausePunctuationForward(tokens, end + 1, scanEnd + 1);
  if (!hasSupportedClauseContinuation(tokens, nextStart, scanEnd + 1, lookups)) {
    return null;
  }
  return {
    kind: "合成接続",
    connectiveKind: lexical === undefined ? "conditional" : "volitional_purpose",
    surface: "と",
    tokenIdx: end,
    tokenSpan: { start: markerStart, end },
    ...(marker.focusParticle === undefined ? {} : { attemptFocusParticle: marker.focusParticle })
  };
}

function isExemplificationGenitiveBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  scanEnd: number
): boolean {
  if (end >= scanEnd) {
    return false;
  }
  const genitive = tokens[end];
  const exemplification = tokens[end - 1];
  if (
    genitive?.surface !== "の" || (genitive.pos & POS01) !== 助詞_格助詞 || exemplification === undefined || !tokenMatchesConnectiveKind(exemplification, "exemplification")
  ) {
    return false;
  }
  return isNominalLikeAttributiveHead(tokens[end + 1]);
}

function isBareExemplificationBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  scanEnd: number
): boolean {
  if (end >= scanEnd) {
    return false;
  }
  const token = tokens[end];
  if (
    token === undefined ||
    !tokenMatchesConnectiveKind(token, "exemplification")
  ) {
    return false;
  }
  const next = tokens[end + 1];
  if (next === undefined || isClausePunctuationToken(next)) {
    return false;
  }
  if ((next.pos & POS0) === 助詞 || (next.pos & POS0) === 助動詞0) {
    return isExemplificationPostpositionalContinuationStart(next);
  }
  return isBareExemplificationContinuationStart(next);
}

function isExemplificationPostpositionalContinuationStart(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助詞) {
    return false;
  }
  if (token.surface === "の") {
    return false;
  }
  const subtype1 = token.pos & POS1;
  return subtype1 === 格助詞 ||
    subtype1 === 係助詞 ||
    subtype1 === 副助詞 ||
    token.surface === "は" ||
    token.surface === "も";
}

function isBareExemplificationContinuationStart(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 動詞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 副詞 ||
    pos0 === 連体詞 ||
    pos0 === 接頭辞;
}

function isAdverbialLikenessBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  scanEnd: number,
  lookups: LookupTables
): boolean {
  if (end >= scanEnd) {
    return false;
  }
  if ((tokens[start] === undefined || (tokens[start].pos & POS0) !== 名詞)) {
    return false;
  }
  const marker = tokens[end];
  if (marker?.surface === "のように" && (marker.pos & POS0) === 助詞) {
    const next = tokens[end + 1];
    return next !== undefined && !isClausePunctuationToken(next) && isSupportedClauseStart(tokens, end + 1, lookups);
  }
  if (
    copulaNiMarkerRelationForToken(marker, end, {
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return false;
  }
  const likeness = tokens[end - 1];
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return false;
  }
  const next = tokens[end + 1];
  if (next === undefined || isClausePunctuationToken(next)) {
    return false;
  }
  return isSupportedClauseStart(tokens, end + 1, lookups);
}

function quoteFocusTailBoundaryAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  quoteIdx: number,
  scanEnd: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const { tokens } = cursor;
  const previous = tokens[quoteIdx - 1];
  if (
    (previous === undefined || !isAssertiveCopulaFamilyPos(previous.pos)) &&
    terminalAssertiveCopulaSpanEndingBefore(tokens, quoteIdx) === null
  ) {
    return null;
  }
  const frame = quoteFocusMarkerStartingAt(cursor.fork(quoteIdx, tokens.length, quoteIdx));
  if (frame === null) {
    return null;
  }
  if (!hasSupportedClauseContinuation(tokens, frame.focusIdx + 1, scanEnd + 1, lookups)) {
    return null;
  }
  return {
    kind: "接続助詞",
    connectiveKind: "quotative",
    surface: "と",
    tokenIdx: quoteIdx,
    tokenSpan: { start: quoteIdx, end: quoteIdx }
  };
}

function isFunctionalTailBoundaryEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  end: number,
  scanEnd: number,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  if (isZuniContentOnsetBoundaryEnd(tokens, end, scanEnd)) {
    return true;
  }
  if (
    !isBareCopulaDeRenyouEnd(tokens, end) &&
    !isCopulaNegativeRenyouBoundaryEnd(tokens, end, lookups) &&
    !isCopulaSupportListingRenyouChuushiEnd(tokens, end, lookups) &&
    !renyouChuushiClosureAdmittedAt(tokens, end, lookups) &&
    !hasSupportedClauseContinuation(tokens, end + 1, scanEnd + 1, lookups)
  ) {
    return false;
  }
  return isZuniFunctionalBoundaryEnd(tokens, end) ||
    isTariFunctionalBoundaryEnd(tokens, end) ||
    isTeKaraFunctionalBoundaryEnd(tokens, start, end) ||
    isInlineRenyouChuushiBoundaryEnd(cursor, start, end, lookups);
}

function isInlineRenyouChuushiBoundaryEnd(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  end: number,
  lookups: LookupTables
): boolean {
  const { tokens } = cursor;
  if (end <= start) {
    return false;
  }
  const token = tokens[end];
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS5A) !== 連用形_) {
    return false;
  }
  if (copulaDeMarkerRelationForToken(token, end, { consumers: ["tail_multi_clause"] })?.isAssertiveCopulaFamily === true) {
    if (looksPronominalNoDe(cursor.fork(end - 1, tokens.length, end - 1))) {
      return false;
    }
    return hasCopulaDeRenyouChuushiContinuation(tokens, end, lookups);
  }
  if (isCopulaNegativeRenyouBoundaryEnd(tokens, end, lookups)) {
    return hasCopulaClauseContinuationEvidenceAfter(tokens, end, lookups, "adversative");
  }
  if (
    !isCopulaSupportListingRenyouChuushiEnd(tokens, end, lookups) &&
    !(isTeConnectiveToken(token) || renyouChuushiClosureLeftAt(tokens, end, lookups) === null
      ? hasRenyouChuushiClauseContinuationAfter(tokens, end, (t, i) => isSupportedClauseStart(t, i, lookups), tokens.length, lookups)
      : renyouChuushiClosureAdmittedAt(tokens, end, lookups))
  ) {
    return false;
  }
  if (isTeConnectiveToken(token)) {
    return true;
  }
  if ((token.pos & POS0) === 助動詞0 && token.surface === "ず") {
    return true;
  }
  if (isAuxChainRenyouChuushiBoundaryEnd(tokens, end)) {
    return true;
  }
  if (isPostverbOperatorRenyouBoundaryEnd(tokens, end, lookups)) {
    return true;
  }
  if (isProductivePredicateSuffixRenyouBoundaryEnd(tokens, start, end)) {
    return true;
  }
  const sahenStart = detectSahenPredicateStart(tokens, start);
  if (
    sahenStart !== null &&
    end === start + 1 &&
    sahenStart.suruToken === token &&
    (token.pos & POS5A) === 連用形_ &&
    !isImmediatePredicateTailContinuationAfterRenyou(tokens[end + 1])
  ) {
    return true;
  }
  if (isAffirmativeCopulaSupportVerbToken(token)) {
    const prev = tokens[end - 1];
    if (
      prev !== undefined &&
      copulaDeMarkerRelationForToken(prev, end - 1, { consumers: ["tail_multi_clause"] })?.isAssertiveCopulaFamily === true
    ) {
      return true;
    }
    return affirmativeScopeBridgeRenyouEndsAt(tokens, end);
  }
  return false;
}

function affirmativeScopeBridgeRenyouEndsAt(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  if (isImmediatePredicateTailContinuationAfterRenyou(tokens[end + 1])) {
    return false;
  }
  const follower = tokens[end + 1];
  if (
    follower !== undefined &&
    postverbAuxiliaryPayloadsForForm(follower.dictionaryForm)
      .some((payload) => (payload.requiredHostForms ?? []).includes("verb_renyou"))
  ) {
    return false;
  }
  for (const markerStart of [end - 1, end - 2]) {
    if (markerStart < 0) {
      continue;
    }
    const bridge = matchScopeBridgeBeforeBasicCopula(new TokenCursor(tokens, markerStart, end + 1));
    if (bridge === null || bridge.head !== null || bridge.polarity !== "affirmative") {
      continue;
    }
    const indices = bridge.source.tokenIndices;
    if (indices[indices.length - 1] === end) {
      return true;
    }
  }
  return false;
}

function isCopulaConcessiveImperativeBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  scanEnd: number,
  lookups: LookupTables
): boolean {
  const dePos = end - 1;
  if (dePos <= start - 1 || !isBareCopulaDeRenyouEnd(tokens, dePos)) {
    return false;
  }
  const support = tokens[end];
  if (!isAffirmativeCopulaSupportVerbToken(support) || !isImperativeInflection(support.pos)) {
    return false;
  }
  if (copulaConcessiveImperativeEvidenceAt(tokens, dePos, lookups) === null) {
    return false;
  }
  return hasSupportedClauseContinuation(tokens, end + 1, scanEnd + 1, lookups);
}

function isBareCopulaDeRenyouEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  const token = tokens[end];
  return token !== undefined &&
    isRenyouInflection(token.pos) &&
    copulaDeMarkerRelationForToken(token, end, { consumers: ["tail_multi_clause"] })?.isAssertiveCopulaFamily === true;
}

function isCopulaSupportListingRenyouEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  const token = tokens[end];
  if (token === undefined || !isAffirmativeCopulaSupportVerbToken(token)) {
    return false;
  }
  const de = tokens[end - 1];
  if (
    de === undefined ||
    copulaDeMarkerRelationForToken(de, end - 1, { consumers: ["tail_multi_clause"] })?.isAssertiveCopulaFamily !== true
  ) {
    return false;
  }
  const matched = matchCopula(tokens, end - 1, lookups);
  if (matched === null || matched.consumed !== 2) {
    return false;
  }
  const last = matched.ops?.[matched.ops.length - 1];
  return last !== undefined && last.kind === "connective" && last.connective === "listing";
}

function isCopulaSupportListingRenyouChuushiEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  return isCopulaSupportListingRenyouEnd(tokens, end, lookups) &&
    hasCopulaClauseContinuationEvidenceAfter(tokens, end, lookups);
}

function hasCopulaDeRenyouChuushiContinuation(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  if (copulaFocusContinuationRelationAt(tokens, end + 1, {
    consumers: ["tail_multi_clause"],
    lookups
  }) !== null) {
    return false;
  }
  if ((matchCopula(tokens, end, lookups)?.consumed ?? 1) !== 1) {
    return false;
  }
  if (isAffirmativeCopulaSupportVerbToken(tokens[end + 1])) {
    return false;
  }
  return hasCopulaClauseContinuationEvidenceAfter(tokens, end, lookups);
}

export function hasCopulaClauseContinuationEvidenceAfter(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables,
  ellipticFollowerKind: string = "listing"
): boolean {
  return copulaClauseContinuationEvidenceAfter(tokens, end, lookups, ellipticFollowerKind) !== null;
}

export interface CopulaClauseContinuationEvidence {
  readonly predicateIdx: number | null;
  readonly evidence: ClauseStartEvidenceKind | null;
  readonly punctuationCrossed: boolean;
  readonly branch: "argument_frame" | "content_prelude" | "elliptic_follower";
}

export function copulaClauseContinuationEvidenceAfter(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables,
  ellipticFollowerKind: string = "listing"
): CopulaClauseContinuationEvidence | null {
  const isPredicateStart = (
    frameTokens: readonly RuntimeHaruToken[],
    frameIdx: number
  ): boolean => isSupportedClauseStart(frameTokens, frameIdx, lookups);
  const utterance = activeProtoUtteranceRange(end);
  if (utterance === null) {
    return null;
  }
  const utteranceReach = Math.min(utterance.endExclusive, tokens.length);
  const reach = Math.min(renyouChuushiContinuationReach(tokens, end), utteranceReach);
  const nextStart = skipClausePunctuationForward(tokens, end + 1, reach);
  const relation = nextStart >= reach
    ? null
    : clauseStartEvidenceRelationAfter(tokens, nextStart, reach, isPredicateStart, {
      mode: "content_prelude",
      consumers: ["tail_multi_clause"],
      lookups
    });
  const found = (branch: CopulaClauseContinuationEvidence["branch"]): CopulaClauseContinuationEvidence => ({
    predicateIdx: relation?.predicateIdx ?? null,
    evidence: relation?.evidence ?? null,
    punctuationCrossed: nextStart !== end + 1,
    branch
  });
  if (hasRenyouChuushiClauseContinuationAfter(tokens, end, isPredicateStart, utteranceReach, lookups)) {
    return found("argument_frame");
  }
  if (nextStart >= reach) {
    return null;
  }
  if (clauseStartEvidenceSatisfiesRequirement(relation, "tail_content_prelude_continuation")) {
    return found("content_prelude");
  }
  return connectiveAdmitsEllipticFollowerClause(ellipticFollowerKind, lookups) &&
    hasEllipticFollowerClauseEvidence(tokens, nextStart, reach, isPredicateStart, "independent_word")
    ? found("elliptic_follower")
    : null;
}

function renyouChuushiTerminalRoleAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): TeFormConnectiveRole | null {
  if (teOkuEvaluationReasonBoundaryAfter(tokens, end)) {
    return "reason";
  }
  if (!isProductivePredicateSuffixRenyouBoundaryEnd(tokens, start, end)) {
    return null;
  }
  const next = nextNonSpaceIndex(tokens, end + 1, tokens.length);
  if (next === null || next !== end + 1 || !isPredicateSuffixAdverbialTargetStart(tokens, next)) {
    return null;
  }
  return "adverbial";
}

function teOkuEvaluationReasonBoundaryAfter(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const markerIdx = isTeConnectiveToken(tokens[contentEndIdx])
    ? contentEndIdx
    : nextNonSpaceIndex(tokens, contentEndIdx + 1, tokens.length);
  return markerIdx !== null &&
    markerIdx === (isTeConnectiveToken(tokens[contentEndIdx]) ? contentEndIdx : contentEndIdx + 1) &&
    teOkuEvaluationReasonBoundaryAt(tokens, markerIdx);
}

function teOkuEvaluationReasonBoundaryAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  if (!isTeConnectiveToken(marker)) {
    return false;
  }
  const auxIdx = previousNonSpaceIndex(tokens, markerIdx, 0);
  const aux = auxIdx === null ? undefined : tokens[auxIdx];
  if (!isTeOkuAuxiliaryBoundaryEnd(aux)) {
    return false;
  }
  const evaluationIdx = nextNonSpaceIndex(tokens, markerIdx + 1, tokens.length);
  return evaluationIdx !== null &&
    evaluationIdx === markerIdx + 1 &&
    isPastGoodEvaluationPredicateAt(tokens, evaluationIdx);
}

function isTeOkuAuxiliaryBoundaryEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return (
    form === "おく" ||
    form === "置く" ||
    form === "とく" ||
    form === "どく"
  ) && (
      (token.pos & POS0) === 動詞 ||
      (token.pos & POS0) === 助動詞0
    );
}

function isPredicateSuffixAdverbialTargetStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const next = tokens[idx];
  if (next === undefined) {
    return false;
  }
  if ((next.pos & POS0) === 動詞) {
    return true;
  }
  return detectSahenPredicateStart(tokens, idx) !== null;
}

function isProductivePredicateSuffixRenyouBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): boolean {
  if (end <= start) {
    return false;
  }
  const token = tokens[end];
  if (
    token === undefined || (token.pos & (POS0 | POS1 | POS5A)) !== (接尾辞 | 形容詞的 | 連用形_)
  ) {
    return false;
  }
  return predicateSuffixKindForDictionaryForm(token.dictionaryForm) !== null;
}

function isPostverbOperatorRenyouBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  const token = tokens[end];
  if (
    token === undefined ||
    (token.pos & (POS0 | POS5A)) !== (動詞 | 連用形_) ||
    classifyTeTailContinuation(token, lookups) === null
  ) {
    return false;
  }
  return isTeConnectiveToken(tokens[end - 1]);
}

const ELIDED_DEWA_DELIMITER_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "matched_delimiter_close",
  "unmatched_trailing"
]);

function elidedDewaNegativeBodyAllowedAt(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  boundary: ClauseBoundary
): ElidedDewaNegativeBodyClosure | null {
  const closure = utteranceClosureAfter(activeProtoLayout(), tokens, end + 1);
  const admitted = closesUtteranceAs(closure, ELIDED_DEWA_DELIMITER_CLOSURES) ||
    (boundary.kind === "terminal" &&
      (closure.closure === "eos" || closure.closure === "hard_terminal"));
  if (admitted) {
    return { kind: elidedDewaNegativeBodyClosureKindAt(end), quoteMarker: false };
  }
  return (
    quoteMarkerClosesUtteranceAfter(activeProtoLayout(), tokens, end) ||
    quoteMarkerClosesUtteranceAfter(activeProtoLayout(), tokens, end + 1)
  )
    ? { kind: elidedDewaNegativeBodyClosureKindAt(end), quoteMarker: true }
    : null;
}

function elidedDewaNegativeBodyClosureKindAt(contentEndIdx: number): ElidedDewaNegativeBodyClosureKind {
  const run = activeProtoLayout()?.terminalPunctuationRunAfter(contentEndIdx);
  return run !== undefined && terminalPunctuationRunQuestionTokenIndex(run) !== null
    ? "question"
    : "statement";
}

export function elidedDewaNegativeBodyAdmissionStandsAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  contentEndIdx: number,
  closure: UtteranceClosureEvidence
): boolean {
  if (!closesUtteranceAs(closure, ELIDED_DEWA_DELIMITER_CLOSURES)) {
    return false;
  }
  return elidedDewaNegativeBodyHostAdmitsAt(
    tokens,
    copulaIdx,
    elidedDewaNegativeBodyClosureKindAt(contentEndIdx)
  );
}

function isPlainNominalizerParticleBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  _scanEnd: number,
  lookups: LookupTables
): boolean {
  return isPlainNominalizerParticleFrameEnd(tokens, end, lookups);
}

function isPlainNominalizerParticleFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  return plainNominalizerFrameEndVerdictAt(tokens, end, lookups) === "particle_follower";
}

function isPlainNominalizerZeroFollowerFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  if (plainNominalizerFrameEndVerdictAt(tokens, end, lookups) !== "zero_follower") {
    return false;
  }
  if (activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, end + 1)) {
    return false;
  }
  return true;
}

function isZeroNominalizedParallelMoFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  return isZeroNominalizedParallelMoMarker(tokens, end + 1);
}

function isZeroNominalizedParallelMoMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  return zeroNominalizedParallelMoMarkerIndices(tokens).has(markerIdx);
}

function isZuniFunctionalBoundaryEnd(tokens: readonly RuntimeHaruToken[], end: number): boolean {
  const ni = tokens[end];
  const neg = tokens[end - 1];
  return caseParticleMarkerRelationForToken(ni, end, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) !== null && neg !== undefined && (neg.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_ヌ) && (neg.surface === "ず" || neg.surface === "ぬ");
}

function isZuniContentOnsetBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  scanEnd: number
): boolean {
  const neg = tokens[end - 1];
  if (neg === undefined || !isRenyouInflection(neg.pos) || !isZuniFunctionalBoundaryEnd(tokens, end)) {
    return false;
  }
  const followerIdx = nextNonSpaceIndex(tokens, end + 1, scanEnd + 1);
  const follower = followerIdx === null ? undefined : tokens[followerIdx];
  return follower !== undefined && isIndependentWordToken(follower) && !isRefusedUtteranceHeadToken(follower);
}

function isTariFunctionalBoundaryEnd(tokens: readonly RuntimeHaruToken[], end: number): boolean {
  const token = tokens[end];
  return (
    (token?.surface === "たり" || token?.surface === "だり") && (token.pos & POS01) === 助詞_副助詞
  );
}

function isTeKaraFunctionalBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): boolean {
  const kara = tokens[end];
  const te = tokens[end - 1];
  return end > start + 1 &&
    caseParticleMarkerRelationForToken(kara, end, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    isTeConnectiveToken(te);
}

function bareKeijoujiDirectAttributiveBoundaryEvidence(
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): BareKeijoujiAttributiveEvidence | undefined {
  if (startIdx !== contentEndIdx || splitAt !== startIdx + 1) {
    return undefined;
  }
  return bareKeijoujiAttributiveHostEvidence(startIdx);
}

function explicitAdnominalNoAttributiveBoundaryEvidence(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  if (startIdx + 1 !== contentEndIdx || splitAt !== contentEndIdx + 1) {
    return null;
  }
  return explicitAdnominalNoAttributiveEvidenceAt(tokens, contentEndIdx, lookups);
}

function explicitAdnominalNoAttributiveEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  const layout = activeProtoLayout();
  return layout === null ? null : explicitAdnominalNoAttributiveEvidence(layout, tokens, markerIdx, lookups);
}

function isCopulaSupportAuxiliaryVerbToken(
  token: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    (token.dictionaryForm === "御座る" || token.dictionaryForm === "ござる");
}

function isPoliteChainClosedByUtteranceSeparation(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number
): boolean {
  const politeIdx = isPastAuxiliaryPos(tokens[contentEndIdx]?.pos ?? 0) ? contentEndIdx - 1 : contentEndIdx;
  if (!isPoliteAuxiliaryPos(tokens[politeIdx]?.pos ?? 0)) {
    return false;
  }
  if (isCopulaSupportAuxiliaryVerbToken(tokens[politeIdx - 1])) {
    return false;
  }
  return separatedAs(tokens, headIdx, DETACHED_SEPARATIONS);
}

function isLikenessModalOwnedAttributiveBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  return isLikenessModalAdnominalTailEnd(tokens, contentEndIdx);
}

export function classifyStructuralAttributiveBoundaryPayload(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): AttributiveBoundaryPayload | null {
  if (
    isTerminalParticleToken(tokens[contentEndIdx] ?? { pos: 0 }) ||
    isNominalizerParticleToken(tokens[contentEndIdx] ?? { pos: 0 }) ||
    activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, contentEndIdx + 1)
  ) {
    return null;
  }
  if (modalAttributiveSpanRestsOnClosedUtterance(tokens, startIdx, contentEndIdx, splitAt, lookups)) {
    return null;
  }
  const toNoAttributiveCarrierBoundary = isToNoAttributiveCarrierBoundary(
    tokens,
    startIdx,
    contentEndIdx,
    lookups
  );
  const bareQuoteCarrierBoundary = isBareQuoteAttributiveCarrierBoundary(tokens, contentEndIdx, splitAt, lookups);
  const toiuCarrierBoundary = isToiuAttributiveCarrierBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const predicateQuoteCarrierBoundary =
    toiuCarrierBoundary ||
    isTosuruAttributiveCarrierBoundary(tokens, startIdx, contentEndIdx, splitAt) ||
    toNoAttributiveCarrierBoundary ||
    bareQuoteCarrierBoundary;
  const bareQuoteVolitionalContentFlavor = bareQuoteCarrierBoundary
    ? bareQuoteVolitionalContentAttributiveFlavor(tokens, contentEndIdx, splitAt, lookups)
    : null;
  const quotedContentHeadBinding = toiuCarrierBoundary ||
    (bareQuoteCarrierBoundary && bareQuoteCarrierBindsContentHead(tokens, splitAt, lookups));
  const explicitAdnominalNo = explicitAdnominalNoAttributiveBoundaryEvidence(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const attributiveReachedHeadIdx = explicitAdnominalNo?.headIdx ??
    attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  const nounCopulaAttributiveBoundary =
    isNounCopulaDearuAttributiveBoundary(tokens, startIdx, contentEndIdx, attributiveReachedHeadIdx) ||
    isNounScopeBridgeAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt) ||
    isNegativeCopulaAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
  const bareKeijoujiAttributiveEvidence =
    bareKeijoujiDirectAttributiveBoundaryEvidence(startIdx, contentEndIdx, splitAt);
  const bareKeijoujiAttributiveBoundary = bareKeijoujiAttributiveEvidence !== undefined;
  const likenessModalBoundaryEnd =
    isLikenessModalOwnedAttributiveBoundaryEnd(tokens, contentEndIdx);
  if (
    isNominalLikenessPredicateStart(tokens, startIdx) &&
    !isYouNiChangeControlCarrierStart(tokens, startIdx) &&
    !isYouNiPerceptionCarrierStart(tokens, startIdx)
  ) {
    const nominalHostBoundary =
      isNominalHostLikenessAttributiveBoundary(tokens, startIdx, contentEndIdx, splitAt, lookups);
    if (!nominalHostBoundary && !predicateQuoteCarrierBoundary) {
      return null;
    }
  }
  if (
    !likenessModalBoundaryEnd &&
    findHostBearingExternalNominalizerPredicateFrame(tokens, startIdx, contentEndIdx) !== null
  ) {
    return null;
  }
  const headAnchor = toNoAttributiveCarrierBoundary
    ? structuredToNoAttributiveHeadAnchor(tokens, contentEndIdx, lookups)
    : (() => {
      const anchor = attributiveHeadAnchorAt(tokens, attributiveReachedHeadIdx);
      return anchor === undefined ? undefined : { ...anchor, sourceToken: anchor.token };
    })();
  if (
    headAnchor === undefined ||
    !(
      isNominalLikeAttributiveHead(headAnchor.token) ||
      isDerivedNominalPhraseHead(tokens, headAnchor.tokenIdx)
    )
  ) {
    return null;
  }
  if (isPoliteChainClosedByUtteranceSeparation(tokens, contentEndIdx, headAnchor.tokenIdx)) {
    return null;
  }
  const head = headAnchor.token;
  const headIdx = headAnchor.tokenIdx;
  const headKind = classifyAttributiveHeadKind(head);
  const youNiCarrierSpan = attributiveSpanCarriesYouNiCarrierChain(tokens, startIdx, contentEndIdx);
  if (
    headKind === "ordinary_nominal" &&
    attributiveSpanEndsWithAdnominalCopula(tokens, contentEndIdx) &&
    !predicateModalAttributiveSpan(tokens, startIdx, contentEndIdx, "any") &&
    !isSimpleKeijoujiAdnominalAttributiveSpan(tokens, startIdx, contentEndIdx) &&
    !isStandaloneLikenessMarkerAttributiveSpan(tokens, startIdx, contentEndIdx)
  ) {
    return null;
  }
  if (
    !canExternalContentOwnAttributiveHead(tokens, startIdx, contentEndIdx, headIdx, headKind, lookups) &&
    !predicateQuoteCarrierBoundaryCanBypassExternalHeadGuard(predicateQuoteCarrierBoundary, head, headKind) &&
    !nounCopulaAttributiveBoundary
  ) {
    return null;
  }
  const projection = (
    isPastAttributiveTailEnd(tokens[contentEndIdx]) ||
    isExperienceKotoGaAruAttributiveTail(tokens, startIdx, contentEndIdx)
  )
    ? "lexical_past"
    : isRenyouCompoundPrenominalResultativeState(tokens, contentEndIdx, splitAt, head, lookups)
      ? "resultative_state"
      : "ordinary_nominal";
  return {
    kind: "attributiveBoundary",
    source: { tokens: [headAnchor.sourceToken], tokenIndices: [headIdx] },
    head: {
      surface: head.surface,
      dictionaryForm: head.dictionaryForm,
      pos: head.pos,
      tokenIdx: headIdx
    },
    headKind,
    projectionContext: {
      tokens,
      contentIdx: contentEndIdx
    },
    projection,
    ...(youNiCarrierSpan && headKind === "scope_or_bound" && isFutureCommitmentHeadNoun(head, lookups)
      ? { headRequestsFutureProjection: true } as const
      : {}),
    ...(bareKeijoujiAttributiveBoundary ? { bareKeijoujiDirectAttributive: true } as const : {}),
    ...(bareKeijoujiAttributiveEvidence?.katakanaRun === true
      ? { bareKeijoujiKatakanaRun: true } as const
      : {}),
    ...(explicitAdnominalNo === null
      ? {}
      : { explicitAdnominalMarker: { tokens: [tokens[contentEndIdx]!], tokenIndices: [contentEndIdx] } }),
    ...(bareQuoteVolitionalContentFlavor === null ? {} : { bareQuoteVolitionalContentFlavor }),
    ...(quotedContentHeadBinding ? { quotedContentHeadBinding: true } as const : {})
  };
}

function isFutureCommitmentHeadNoun(
  head: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  return lookups.JP_FUTURE_HEAD_NOUNS.has(head.dictionaryForm) ||
    lookups.JP_FUTURE_HEAD_NOUNS.has(head.surface);
}

function attributiveEventModifierChainHeadIndexAt(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): number | null {
  const event = clauseBoundaryEventsForRuntimeTokens(tokens, lookups)
    .find((candidate) => candidate.kind === "attributive" && candidate.splitAt === splitAt);
  return event?.attributiveModifierChainHeadIdx ?? null;
}

function structuredToNoAttributiveHeadAnchor(
  tokens: readonly RuntimeHaruToken[],
  markerEndIdx: number,
  lookups: LookupTables,
): {
  readonly token: RuntimeHaruToken;
  readonly sourceToken: RuntimeHaruToken;
  readonly tokenIdx: number;
} | undefined {
  const layout = activeProtoLayout() ?? buildProtoLayout(tokens, lookups);
  const headAnchor = leadingQuoteAttributiveNominalHeadAnchorAfterToken(layout, tokens, markerEndIdx);
  if (headAnchor === null) {
    return undefined;
  }
  return {
    token: headAnchor.headToken,
    sourceToken: headAnchor.sourceToken,
    tokenIdx: headAnchor.tokenIdx
  };
}

function isToNoAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  lookups: LookupTables
): boolean {
  for (let markerIdx = startIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const projection = matchPredicateProjectionConnectiveAt(tokens, markerIdx, {
      requireEnd: false,
      lookups
    });
    if (
      projection?.connective === "predicate_projection_quote_attributive" &&
      markerIdx + projection.consumed - 1 === contentEndIdx
    ) {
      return true;
    }
  }
  return false;
}

function isNounScopeBridgeAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): boolean {
  const host = tokens[startIdx];
  if (
    host === undefined ||
    !isNominalCopulaHostPos(host.pos) ||
    contentEndIdx + 1 !== splitAt ||
    !isNominalLikeAttributiveHead(tokens[splitAt])
  ) {
    return false;
  }
  const cursor = new TokenCursor(tokens, startIdx + 1, contentEndIdx + 1);
  const bridge = cursor.tx(matchScopeBridge);
  return bridge !== null && cursor.pos === contentEndIdx + 1;
}

function isNegativeCopulaAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const host = tokens[startIdx];
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
  if (
    host === undefined ||
    contentEndIdx + 1 !== splitAt ||
    !isAttributiveHeadNounishToken(tokens[headIdx]) ||
    separatedAs(tokens, splitAt, DETACHED_SEPARATIONS)
  ) {
    return false;
  }
  return negativeCopulaPredicateSpanEndExclusive(tokens, startIdx, lookups) === contentEndIdx + 1;
}

function negativeCopulaPredicateSpanEndExclusive(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  const bridgeIdx = negativeCopulaAttributiveHostEnd(tokens, startIdx, lookups);
  if (bridgeIdx === null) {
    return null;
  }
  const copula = matchCopula(tokens, bridgeIdx, lookups);
  const coreEnd = copula !== null && copula.op.polarity === "negative"
    ? bridgeIdx + copula.consumed
    : negativeScopeBridgeEndAt(tokens, bridgeIdx);
  if (coreEnd === null) {
    return null;
  }
  const tenseTail = tokens[coreEnd];
  if (tenseTail === undefined || (tenseTail.pos & POS4) !== 助動詞_タ) {
    return coreEnd;
  }
  const tenseForm = tenseTail.pos & POS5A;
  return tenseForm === 連体形_ || tenseForm === 終止形_ ? coreEnd + 1 : coreEnd;
}

function negativeCopulaAttributiveHostEnd(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  const host = tokens[startIdx];
  if (host === undefined) {
    return null;
  }
  if (isNominalCopulaHostPos(host.pos)) {
    return nounCompoundSuffixRunEnd(tokens, startIdx + 1, host, lookups);
  }
  if (isKeijoujiCopulaPredicateStart(tokens, startIdx)) {
    return startIdx + 1;
  }
  return isAdverbCopulaPredicateStart(tokens, startIdx, lookups) ||
    isDeicticCopulaPredicateStart(tokens, startIdx, lookups)
    ? startIdx + 1
    : null;
}

function predicateQuoteCarrierBoundaryCanBypassExternalHeadGuard(
  predicateQuoteCarrierBoundary: boolean,
  head: RuntimeHaruToken,
  headKind: AttributiveBoundaryHeadKind
): boolean {
  if (!predicateQuoteCarrierBoundary) {
    return false;
  }
  return headKind === "ordinary_nominal" ||
    isKotoAttributiveHead(head) ||
    isMonoAttributiveHead(head) ||
    headKind === "scope_or_bound";
}

function isNominalHostLikenessAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  const host = tokens[startIdx];
  if (
    !isNounishAttributiveHost(host) &&
    keijoujiAttributiveMarkerAt(tokens, startIdx + 1) !== "no"
  ) {
    return false;
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, startIdx + 1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessIdx = hasNoMarker ? startIdx + 2 : startIdx + 1;
  const likeness = tokens[likenessIdx];
  if (likeness === undefined || (likeness.surface !== "よう" && likeness.surface !== "みたい")) {
    return false;
  }
  if ((likeness.pos & POS1) !== 助動詞語幹) {
    return false;
  }
  if (!hasNoMarker && likeness.surface !== "みたい") {
    return false;
  }
  const copulaIdx = likenessIdx + 1;
  const copula = tokens[copulaIdx];
  if (
    contentEndIdx === copulaIdx && splitAt === copulaIdx + 1 && copula !== undefined && (copula.pos & (POS4 | POS5A)) === (助動詞_ダ | 連体形_)
  ) {
    const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, splitAt, lookups) ?? splitAt;
    return isNominalLikeAttributiveHead(tokens[headIdx]) || isDerivedNominalPhraseHead(tokens, headIdx);
  }

  for (let markerIdx = likenessIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
    const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
    if (
      headIdx !== null &&
      tailEnd !== null &&
      contentEndIdx === tailEnd - 1 &&
      splitAt === toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups)
    ) {
      return isNominalLikeAttributiveHead(tokens[headIdx]) || isDerivedNominalPhraseHead(tokens, headIdx);
    }
  }
  return false;
}

function isBareQuoteAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables | undefined
): boolean {
  const quote = quoteMarkerRelationAt(tokens, contentEndIdx, {
    consumers: ["tail_multi_clause"]
  });
  const head = tokens[splitAt];
  if (
    quote?.canonicalSurface !== "って" ||
    quote.span.endExclusive !== splitAt ||
    !isBareTteAttributiveNounHead(head) ||
    isMonoAttributiveHead(head)
  ) {
    return false;
  }
  let predIdx = previousNonSpaceIndex(tokens, contentEndIdx, 0);
  while (predIdx !== null) {
    const pred = tokens[predIdx];
    if (pred !== undefined && (pred.pos & POS01) === 助詞_終助詞) {
      predIdx = previousNonSpaceIndex(tokens, predIdx, 0);
      continue;
    }
    break;
  }
  const predicate = predIdx === null ? undefined : tokens[predIdx];
  if (predicate !== undefined && (predicate.pos & POS5A) === 意志推量形_) {
    if (
      lookups !== undefined &&
      bareQuoteVolitionalContentAttributiveFlavor(tokens, contentEndIdx, splitAt, lookups) !== null
    ) {
      return true;
    }
    if (classifyAttributiveHeadKind(head) === "ordinary_nominal") {
      return false;
    }
  }
  return true;
}

function bareQuoteVolitionalContentAttributiveFlavor(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  splitAt: number,
  lookups: LookupTables
): QuoteAttributiveFlavor | null {
  const closed = activeProtoClosedPropositionBeforeMarkerAt(tokens, markerIdx);
  if (closed?.evidence !== "bare_volitional") {
    return null;
  }
  const layout = activeProtoLayout();
  if (layout === null || layout.clauseCarriesInterrogativeFormAt(tokens, closed.hostIdx, lookups)) {
    return null;
  }
  const head = bareQuoteCarrierReachedContentHead(tokens, splitAt);
  return head === undefined ? null : bareQuoteCarrierVolitionalContentFlavor(head, lookups);
}

function bareQuoteCarrierReachedContentHead(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number
): RuntimeHaruToken | undefined {
  const headIdx = toiuAttributiveContinuationHeadIndex(tokens, splitAt, tokens.length);
  const head = headIdx === null ? undefined : tokens[headIdx];
  return head !== undefined && isNominalLikeAttributiveHead(head) ? head : undefined;
}

function bareQuoteCarrierBindsContentHead(
  tokens: readonly RuntimeHaruToken[],
  splitAt: number,
  lookups: LookupTables
): boolean {
  const head = bareQuoteCarrierReachedContentHead(tokens, splitAt);
  return head !== undefined && bareQuoteCarrierBindsUtteranceContentHead(head, lookups);
}

function isToiuAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number,
  lookups: LookupTables
): boolean {
  for (let markerIdx = startIdx + 1; markerIdx <= contentEndIdx; markerIdx += 1) {
    const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, tokens.length);
    const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, tokens.length);
    if (
      headIdx !== null &&
      tailEnd !== null &&
      contentEndIdx === tailEnd - 1 &&
      splitAt === toiuAttributiveBoundarySplitAt(tokens, markerIdx, tokens.length, lookups)
    ) {
      return true;
    }
  }
  return false;
}

function isTosuruAttributiveCarrierBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  splitAt: number
): boolean {
  if (!isNominalLikeAttributiveHead(tokens[splitAt])) {
    return false;
  }
  for (let markerIdx = startIdx + 1; markerIdx < contentEndIdx; markerIdx += 1) {
    const marker = quoteMarkerRelationAt(tokens, markerIdx, {
      consumers: ["tail_multi_clause"]
    });
    if (marker?.canonicalSurface !== "と" && marker?.canonicalSurface !== "って") {
      continue;
    }
    const carrierIdx = marker.span.endExclusive;
    if (carrierIdx !== contentEndIdx) {
      continue;
    }
    const carrier = tokens[carrierIdx];
    if (
      carrier !== undefined && carrier.dictionaryForm === "する" && (carrier.pos & (POS0 | POS5A)) === (動詞 | 連体形_)
    ) {
      return true;
    }
  }
  return false;
}

function isNounCopulaDearuAttributiveBoundary(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  headIdx: number
): boolean {
  if (!isNominalLikeAttributiveHead(tokens[headIdx])) {
    return false;
  }
  const stem = tokens[startIdx];
  if (
    stem === undefined ||
    !(
      pos0in(stem.pos, NOMINAL_BITS) ||
      (isNaAdjCapable(stem) && !isAuxiliaryStemToken(stem))
    )
  ) {
    return false;
  }
  const supportIdx = copulaSupportAttributiveChainBodyIndex(tokens, contentEndIdx);
  return supportIdx !== null &&
    supportIdx - 1 > startIdx &&
    copulaSupportMarkerOwnsDeAt(tokens, supportIdx - 1);
}

function copulaSupportMarkerOwnsDeAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  return copulaDeMarkerRelationForToken(tokens[idx], idx, { consumers: ["copula_rules"] }) !== null ||
    copulaHonorificSupportRelationAt(tokens, idx, { consumers: ["copula_rules"] }) !== null;
}

function copulaSupportAttributiveChainBodyIndex(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number | null {
  return copulaSupportChainBodyIndex(tokens, contentEndIdx, isTerminalOrAttributiveInflection);
}

function copulaChainIndexBelowTenseAndPoliteLayers(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): number {
  let cursor = contentEndIdx;
  if (isPastAuxiliaryPos(tokens[cursor]?.pos ?? 0)) {
    cursor -= 1;
  }
  if (isPoliteAuxiliaryPos(tokens[cursor]?.pos ?? 0)) {
    cursor -= 1;
  }
  return cursor;
}

function copulaSupportChainBodyIndex(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  admitsChainEndInflection: (pos: number) => boolean
): number | null {
  const chainEnd = tokens[contentEndIdx];
  if (chainEnd === undefined || !admitsChainEndInflection(chainEnd.pos)) {
    return null;
  }
  let cursor = copulaChainIndexBelowTenseAndPoliteLayers(tokens, contentEndIdx);
  let honorificVoice = false;
  for (const length of [2, 1]) {
    const clusterStart = cursor - length + 1;
    if (clusterStart > 0 && copulaHonorificVoiceClusterLength(tokens, clusterStart) === length) {
      cursor = clusterStart - 1;
      honorificVoice = true;
      break;
    }
  }
  const support = tokens[cursor];
  if (support === undefined) {
    return null;
  }
  if (honorificVoice) {
    return isMizenVoiceHonorificCopulaSupportVerbToken(support) && isMizenInflection(support.pos)
      ? cursor
      : null;
  }
  if (
    !isAffirmativeCopulaSupportVerbToken(support) &&
    !isIntrinsicHonorificCopulaSupportVerbToken(support)
  ) {
    return null;
  }
  return cursor === contentEndIdx || isRenyouInflection(support.pos) ? cursor : null;
}

function isNounishAttributiveHost(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

function canExternalContentOwnAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number,
  headIdx: number,
  kind: AttributiveBoundaryHeadKind,
  lookups: LookupTables
): boolean {
  if (isProjectingModalFormalNounAttributiveHead(tokens, contentEndIdx, headIdx)) {
    return true;
  }
  if (hedgeFrameClaimsAttributiveHead(tokens, headIdx)) {
    return false;
  }
  switch (kind) {
    case "ordinary_nominal":
      return !monHeadFollowerReservesModalReading(tokens, contentEndIdx, headIdx, lookups);
    case "future_commitment":
    case "stative_point":
      return true;
    case "scope_or_bound":
      return !isAssemblyFrameOwnedAttributiveHead(tokens, headIdx, lookups);
    case "external_relation": {
      const head = tokens[headIdx];
      return head !== undefined && isExternalRelationNominalModifierHead(head) &&
        nominalLinkMarkerRelationAt(tokens, headIdx + 1, { consumers: ["semantic_helpers"] }) !== null;
    }
    case "reason_or_purpose":
    case "likeness":
      return false;
  }
}

function isAssemblyFrameOwnedAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  if (
    isRhetoricalMonoKaHeadAt(tokens, headIdx) ||
    wakeFrameOwnsHeadAt(tokens, headIdx, lookups)
  ) {
    return true;
  }
  return isLegacyTokoroResultHead(tokens, headIdx, lookups) ||
    isTokoroTemporalDeHeadToken(tokens, headIdx, lookups) ||
    isTokoroConcessiveDeHeadToken(tokens, headIdx, lookups) ||
    isKoroTemporalNiHeadToken(tokens, headIdx) ||
    isTokoroAlmostHeadToken(tokens, headIdx, lookups) ||
    isTokoroAboutToHeadToken(tokens, headIdx, lookups);
}

function isLegacyTokoroResultHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  return isTokoroResultHeadToken(tokens, headIdx, lookups) &&
    matchTokoroResultConnectiveAt(tokens, headIdx, { lookups }) === null;
}

function isSimpleKeijoujiAdnominalAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  const stem = tokens[startIdx];
  if (stem === undefined) {
    return false;
  }
  if (
    contentEndIdx === derivationalPredicateHeadEnd(tokens, startIdx) ||
    (
      contentEndIdx > startIdx + 1 &&
      isNominalCopulaHostPos(stem.pos) &&
      contentEndIdx === nounCompoundSuffixRunEnd(tokens, startIdx + 1)
    )
  ) {
    return true;
  }
  if (contentEndIdx !== startIdx + 1) {
    return false;
  }
  if ((stem.pos & POS0) === 形状詞) {
    return appearancePerceptionProjectionForToken(stem) === null;
  }
  return isNominalAdnominalCopulaHostSpan(tokens, startIdx, contentEndIdx);
}

function isNominalAdnominalCopulaHostSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  const stem = tokens[startIdx];
  if (stem === undefined || contentEndIdx !== startIdx + 1) {
    return false;
  }
  if (isNaAdjCapableNoun(stem)) {
    return true;
  }
  return isSubstantiveNounToken(stem) &&
    isAdnominalCopulaToken(tokens[contentEndIdx]) &&
    adnominalCopulaHasAttributiveHeadEvidence(tokens, contentEndIdx);
}

function adnominalCopulaHasAttributiveHeadEvidence(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const splitAt = nextNonSpaceIndex(tokens, copulaIdx + 1);
  const clause = activeProtoLayout()?.clauseOfToken(copulaIdx);
  return splitAt !== null &&
    clause !== undefined &&
    clause.terminatedBy === "attributive" &&
    clause.end === splitAt;
}

function isStandaloneLikenessMarkerAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  return contentEndIdx === startIdx + 1 &&
    isLikenessModalAdnominalTailEnd(tokens, contentEndIdx) &&
    nominalLinkMarkerRelationAt(tokens, startIdx - 1, { consumers: ["tail_multi_clause"] }) === null &&
    adnominalCopulaHasAttributiveHeadEvidence(tokens, contentEndIdx);
}

function chunkEndsWithAdnominalCopulaAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  lookups: LookupTables
): boolean {
  if (
    !attributiveSpanEndsWithAdnominalCopula(tokens, end) ||
    (
      !isSimpleKeijoujiAdnominalAttributiveSpan(tokens, start, end) &&
      !predicateModalAttributiveSpan(tokens, start, end, "sou_appearance") &&
      !isStandaloneLikenessMarkerAttributiveSpan(tokens, start, end)
    )
  ) {
    return false;
  }
  if (adnominalCopulaAttributiveHeadCanBeExternallyOwned(tokens, start, end, end + 1, lookups)) {
    return true;
  }
  if (adnominalCopulaAttributiveFormPausesAtWeakPunctuation(tokens, end)) {
    return true;
  }
  return adnominalCopulaAttributiveHeadIsAppearanceOwnedBoundHead(tokens, end, end + 1, lookups);
}

const ADNOMINAL_COPULA_PAUSE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "weak_pause"
]);

function adnominalCopulaAttributiveFormPausesAtWeakPunctuation(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const host = tokens[contentEndIdx - 1];
  return host !== undefined &&
    (isLexicalPureNaAdjStem(host) || isNaAdjCapableNoun(host)) &&
    closesUtteranceAs(
      utteranceClosureAfter(activeProtoLayout(), tokens, contentEndIdx + 1),
      ADNOMINAL_COPULA_PAUSE_CLOSURES
    );
}

function adnominalCopulaAttributiveHeadIsAppearanceOwnedBoundHead(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headSearchStart: number,
  lookups: LookupTables
): boolean {
  if (!isAppearanceModalAdnominalTailEnd(tokens, contentEndIdx)) {
    return false;
  }
  const headIdx = attributiveEventModifierChainHeadIndexAt(tokens, headSearchStart, lookups) ?? headSearchStart;
  return isProjectingModalFormalNounAttributiveHead(tokens, contentEndIdx, headIdx) ||
    isProjectingModalPlaceAspectAttributiveHead(tokens, contentEndIdx, headIdx);
}

function attributiveSpanEndsWithAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const token = tokens[contentEndIdx];
  return token !== undefined && (token.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_ダ | 連体形_);
}

function predicateModalAttributiveSpan(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  projection: AppearancePerceptionProjection | "any"
): boolean {
  for (let idx = startIdx + 1; idx < contentEndIdx; idx += 1) {
    const stemProjection = appearancePerceptionProjectionForToken(tokens[idx]);
    if (stemProjection === null) {
      continue;
    }
    if (projection === "any" || stemProjection === projection) {
      return true;
    }
  }
  return false;
}

function modalAttributiveSpanRestsOnClosedUtterance(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number,
  headIdx: number,
  lookups: LookupTables
): boolean {
  const stemIdx = contentEndIdx - 1;
  if (
    stemIdx <= startIdx ||
    !isAdnominalCopulaToken(tokens[contentEndIdx]) ||
    appearancePerceptionProjectionForToken(tokens[stemIdx]) === null
  ) {
    return false;
  }
  const closes = activeProtoClosesUtteranceBefore(stemIdx) ||
    (
      activeProtoClosesUtteranceBeforeGivenFormalNounHead(stemIdx) &&
      isLikenessTransparentFormalNounAttributiveHead(tokens[headIdx])
    );
  if (!closes) {
    return false;
  }
  if (attributiveSpanCarriesObligationIdiom(tokens, startIdx, contentEndIdx)) {
    return false;
  }
  return matchQuotativeMannerSimileConnectiveAt(tokens, stemIdx, lookups) === null;
}

function isLikenessTransparentFormalNounAttributiveHead(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    isLikenessTransparentFormalNounHead(token);
}

function isKotoNiNominalFrameMarker(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number
): boolean {
  const nextIdx = nextClauseNonPunctuationIndex(tokens, particleIdx + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  return next !== undefined &&
    (next.pos & POS0) === 動詞 &&
    (next.dictionaryForm === "つく" || next.dictionaryForm === "就く");
}

const MON_DATTE_TERMINAL_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal",
  "clause_boundary"
]);

function monHeadFollowerReservesModalReading(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number,
  lookups: LookupTables
): boolean {
  const head = tokens[headIdx];
  if (head === undefined || !isSurfaceOrDictionaryForm(head, [...MONO_FORMAL_NOUN_FORMS])) {
    return false;
  }
  const reading = explanatoryMonReadingAt(activeProtoLayout(), tokens, headIdx);
  if (reading.kind === "explanatory_sfp") {
    return true;
  }
  if (reading.kind === "pause_pending") {
    return false;
  }
  const closure = utteranceClosureAfter(activeProtoLayout(), tokens, headIdx + 1);
  const followerIdx = utteranceClosureTokenIdx(closure);
  if (followerIdx === null) {
    return true;
  }
  const follower = tokens[followerIdx];
  const copula = matchCopula(tokens, followerIdx, lookups);
  if (copula?.op.polarity === "negative") {
    return false;
  }
  const predicate = tokens[contentEndIdx];
  if (
    (follower !== undefined && isCopulaAuxToken(follower)) ||
    copula !== null ||
    kaMarkerRelationAt(tokens, followerIdx, ["tail_multi_clause"]) !== null
  ) {
    return predicate === undefined || !isAttributiveOrHomophonousTerminalInflection(predicate.pos);
  }
  if (quoteMarkerRelationAt(tokens, followerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  if (datteQuoteMarkerRelationAt(tokens, followerIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    const role = classifyDatteMarkerAt(
      new TokenCursor(tokens, followerIdx, tokens.length, followerIdx),
      lookups,
      closesUtteranceAs(utteranceClosureAfter(activeProtoLayout(), tokens, followerIdx + 1), MON_DATTE_TERMINAL_CLOSURES)
        ? { terminalBoundary: true }
        : {}
    );
    if (role.isQuote || role.role === "hearsay_terminal") {
      return true;
    }
  }
  const predicatePos0 = predicate === undefined ? 名詞 : predicate.pos & POS0;
  const sfpCursor = new TokenCursor(tokens, followerIdx, tokens.length, followerIdx);
  detectSfp(sfpCursor, predicatePos0, predicatePos0 === 助動詞0, true);
  return sfpCursor.consumed > 0;
}

function bareTteNoNominalizerConcessionApplies(
  tokens: readonly RuntimeHaruToken[],
  noIdx: number,
  stemToken: RuntimeHaruToken
): boolean {
  const noToken = tokens[noIdx];
  if (noToken === undefined || noToken.surface !== "の") return false;
  if ((stemToken.pos & POS5A) === 命令形_) return false;
  const particleIdx = nextNonSpaceIndex(tokens, noIdx + 1, tokens.length);
  if (particleIdx === null) return false;
  const particle = tokens[particleIdx];
  if (particle === undefined || !["は", "が", "を", "も"].includes(particle.surface)) return false;
  const afterIdx = nextNonSpaceIndex(tokens, particleIdx + 1, tokens.length);
  return afterIdx === null || ((tokens[afterIdx]?.pos ?? 0) & POS01) !== 助詞_終助詞;
}

function isBareTteMarkerBeforeHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, headIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  return prev !== undefined && prev.surface === "って" && (prev.pos & POS01) === 助詞_副助詞;
}

function hedgeFrameClaimsAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): boolean {
  const shape = matchEpistemicHedgeCarrierShapeAtHead(tokens, headIdx);
  if (shape === null) {
    return false;
  }
  return !isBareTteMarkerBeforeHead(tokens, headIdx) || shape.spec.acceptsQuotative === true;
}

function isMonoAttributiveHeadToken(token: RuntimeHaruToken | undefined): boolean {
  return isSurfaceOrDictionaryForm(token, [...MONO_FORMAL_NOUN_FORMS]);
}

function isEquivalenceDouzenLikenessAdnominalTailEnd(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  return isLikenessModalAdnominalTailEnd(tokens, contentEndIdx) &&
    isEquivalenceDouzenAdnominalTailEnd(tokens, contentEndIdx - 2);
}

function isProjectingModalFormalNounAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number
): boolean {
  return isLikenessTransparentFormalNounAttributiveHead(tokens[headIdx]) &&
    isProjectingModalAdnominalTailEnd(tokens, contentEndIdx);
}

function isProjectingModalPlaceAspectAttributiveHead(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  headIdx: number
): boolean {
  const head = tokens[headIdx];
  if (head === undefined || (head.pos & POS0) !== 名詞 || !isLikenessPlaceAspectAttributiveHead(head)) {
    return false;
  }
  if (isLikenessModalAdnominalTailEnd(tokens, contentEndIdx)) {
    return true;
  }
  return isAppearanceModalAdnominalTailEnd(tokens, contentEndIdx) &&
    appearanceModalPlaceAspectHeadIsNounPhraseHead(tokens, headIdx);
}

function attributiveSpanCarriesObligationIdiom(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number
): boolean {
  for (let idx = Math.max(0, spanStartIdx); idx <= contentEndIdx; idx += 1) {
    if (isObligationSpanStartingAtToken(tokens, idx)) {
      return true;
    }
  }
  return false;
}

function attributiveSpanCarriesYouNiCarrierChain(
  tokens: readonly RuntimeHaruToken[],
  spanStartIdx: number,
  contentEndIdx: number
): boolean {
  for (let idx = Math.max(0, spanStartIdx); idx <= contentEndIdx; idx += 1) {
    if (!isYouNiChangeControlCarrierStart(tokens, idx)) {
      continue;
    }
    const carrierIdx = youNiCarrierVerbIndex(tokens, idx);
    if (carrierIdx !== null && youNiCarrierChainClosesSpan(tokens, carrierIdx, contentEndIdx)) {
      return true;
    }
  }
  return false;
}

function youNiCarrierChainClosesSpan(
  tokens: readonly RuntimeHaruToken[],
  carrierIdx: number,
  contentEndIdx: number
): boolean {
  if (carrierIdx > contentEndIdx) {
    return false;
  }
  let idx = carrierIdx;
  while (idx < contentEndIdx) {
    const next = tokens[idx + 1];
    if (next === undefined) {
      return false;
    }
    if ((next.pos & POS0) === 助動詞0) {
      idx += 1;
      continue;
    }
    const teAuxiliary = tokens[idx + 2];
    if (
      isTeSurfaceConnectiveToken(next) &&
      teAuxiliary !== undefined &&
      isNonIndependentVerbToken(teAuxiliary)
    ) {
      idx += 2;
      continue;
    }
    return false;
  }
  return idx === contentEndIdx;
}

function isSurfaceOrDictionaryForm(
  token: RuntimeHaruToken | undefined,
  values: readonly string[]
): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return values.includes(token.surface) || values.includes(token.dictionaryForm);
}

function isKotoAttributiveHead(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 && (token.surface === "こと" || token.surface === "事");
}

function isMonoAttributiveHead(token: RuntimeHaruToken): boolean {
  return isMonoAttributiveHeadToken(token) && (token.pos & POS0) === 名詞;
}

function isKotoGaBoundPredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) === 動詞 && (
    token.dictionaryForm === "できる" ||
    token.dictionaryForm === "出来る" ||
    isExistentialPredicateToken(token)
  )) {
    return true;
  }
  if (isNegationLikePredicateToken(token)) {
    return true;
  }
  return false;
}

function isKotoMoBoundPredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return isKotoGaBoundPredicate(token) || isNegationLikePredicateToken(token);
}

function isKotoWaBoundPredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return isExistentialPredicateToken(token) || isNegationLikePredicateToken(token);
}

function isExistentialPredicateToken(token: RuntimeHaruToken): boolean {
  return (
    (token.pos & POS0) === 動詞 &&
    (
      token.dictionaryForm === "ある" ||
      token.dictionaryForm === "有る"
    )
  );
}

function isNegationLikePredicateToken(token: RuntimeHaruToken): boolean {
  return (
    token.dictionaryForm === "ない" ||
    token.dictionaryForm === "無い" ||
    token.dictionaryForm === "ぬ" ||
    token.surface === "ありません" ||
    token.surface === "無い"
  );
}

function isNominalLikeAttributiveHead(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  return pos0in(token.pos, NOMINAL_BITS);
}

function isBareTteAttributiveNounHead(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  if (isAdverbCapableNominal(token) && classifyAttributiveHeadKind(token) === "ordinary_nominal") {
    return false;
  }
  return true;
}

function isExperienceKotoGaAruAttributiveTail(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  contentEndIdx: number
): boolean {
  for (let kotoPos = startIdx + 1; kotoPos <= contentEndIdx - 2; kotoPos++) {
    const koto = tokens[kotoPos];
    if (koto === undefined || (koto.pos & POS0) !== 名詞 || koto.surface !== "こと") {
      continue;
    }
    const beforeKoto = tokens[kotoPos - 1];
    if (beforeKoto === undefined || (beforeKoto.pos & POS4) !== 助動詞_タ) {
      continue;
    }
    const particle = tokens[kotoPos + 1];
    if (
      particle === undefined ||
      (particle.pos & POS0) !== 助詞 ||
      !(particle.surface === "が" || particle.surface === "も")
    ) {
      continue;
    }
    if (experiencePredicateEndsAt(tokens, kotoPos + 2, contentEndIdx)) {
      return true;
    }
  }
  return false;
}

function experiencePredicateEndsAt(
  tokens: readonly RuntimeHaruToken[],
  predicatePos: number,
  contentEndIdx: number
): boolean {
  const predicate = tokens[predicatePos];
  if (predicate === undefined) {
    return false;
  }
  if (isVerbLemma(predicate, "ある")) {
    if (predicatePos === contentEndIdx) {
      return true;
    }
    const masu = tokens[predicatePos + 1];
    const nu = tokens[predicatePos + 2];
    if (
      masu?.dictionaryForm === "ます" &&
      (masu.pos & POS4) === 助動詞_マス &&
      nu?.dictionaryForm === "ぬ" &&
      (nu.pos & POS4) === 助動詞_ヌ
    ) {
      if (predicatePos + 2 === contentEndIdx) {
        return true;
      }
      const desu = tokens[predicatePos + 3];
      const ta = tokens[predicatePos + 4];
      return predicatePos + 4 === contentEndIdx &&
        desu?.dictionaryForm === "です" &&
        (desu.pos & POS4) === 助動詞_デス &&
        ta !== undefined &&
        (ta.pos & POS4) === 助動詞_タ;
    }
    const masuPast = tokens[predicatePos + 1];
    const ta = tokens[predicatePos + 2];
    return predicatePos + 2 === contentEndIdx &&
      masuPast?.dictionaryForm === "ます" &&
      (masuPast.pos & POS4) === 助動詞_マス &&
      ta !== undefined &&
      (ta.pos & POS4) === 助動詞_タ;
  }
  if (isAdjNai(predicate)) {
    if (predicatePos === contentEndIdx) {
      return true;
    }
    const next = tokens[predicatePos + 1];
    return predicatePos + 1 === contentEndIdx &&
      next !== undefined &&
      ((next.pos & POS4) === 助動詞_タ || (next.pos & POS4) === 助動詞_デス);
  }
  return false;
}

function isPastAttributiveTailEnd(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) !== 助動詞0) {
    return false;
  }
  return token.dictionaryForm === "た" || token.surface === "た" || token.surface === "だ";
}

function volitionalConcessiveToBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lowerBoundInclusive: number
): ClauseBoundary | null {
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined || (tok.pos & POS0) !== 助詞) {
    return null;
  }
  let markerStartIdx: number;
  let concessiveSurface: "と" | "とも" | "が" | typeof DEAROU_CONCESSIVE_CONNECTIVE_SURFACE;
  if (tok.surface === "とも") {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "とも";
  } else if (tok.surface === "と") {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "と";
  } else if (tok.surface === "が" && (tok.pos & POS01) === 助詞_格助詞) {
    markerStartIdx = boundaryTokenIdx;
    concessiveSurface = "が";
  } else if (tok.surface === "も" && (tok.pos & POS1) === 係助詞) {
    const prevTo = tokens[boundaryTokenIdx - 1];
    if (prevTo === undefined || prevTo.surface !== "と" || (prevTo.pos & POS0) !== 助詞) {
      return null;
    }
    markerStartIdx = boundaryTokenIdx - 1;
    concessiveSurface = "とも";
  } else {
    return null;
  }
  const leftIdx = previousClauseNonPunctuationIndex(tokens, markerStartIdx - 1, lowerBoundInclusive);
  if (leftIdx === null) {
    return null;
  }
  const left = tokens[leftIdx];
  if (left === undefined || (left.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  const leftPos4 = left.pos & POS4;
  if (leftPos4 === 助動詞_マス || leftPos4 === 助動詞_デス) {
    return null;
  }
  if (concessiveSurface === "が") {
    const leftPos0 = left.pos & POS0;
    if (leftPos0 !== 動詞 && leftPos0 !== 形容詞0) {
      return null;
    }
  }
  const beforeLeft = tokens[leftIdx - 1];
  if (beforeLeft !== undefined) {
    const beforeIsTeAux = (beforeLeft.pos & POS01) === 助詞_接続助詞 &&
      (beforeLeft.surface === "て" || beforeLeft.surface === "で");
    if (beforeIsTeAux) {
      return null;
    }
  }
  if (
    concessiveSurface !== "が" &&
    volitionalConcessiveMarkerTokenCountAt(tokens, markerStartIdx) === null
  ) {
    return null;
  }
  const leftIsCopulaConjecture = isAssertiveCopulaFamilyPos(left.pos) ||
    (isAffirmativeCopulaSupportVerbToken(left) &&
      copulaDeMarkerRelationForToken(beforeLeft, leftIdx - 1, { consumers: ["tail_multi_clause"] })
        ?.isAssertiveCopulaFamily === true);
  return {
    kind: "合成接続",
    connectiveKind: "even_if",
    surface: leftIsCopulaConjecture && concessiveSurface !== "が"
      ? DEAROU_CONCESSIVE_CONNECTIVE_SURFACE
      : concessiveSurface,
    tokenIdx: boundaryTokenIdx,
    tokenSpan: { start: markerStartIdx, end: boundaryTokenIdx }
  };
}

function politeVolitionalHostlessQuotativeBoundary(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lowerBoundInclusive: number
): ClauseBoundary | null {
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined || tok.surface !== "と" || (tok.pos & POS0) !== 助詞) {
    return null;
  }
  const leftIdx = previousClauseNonPunctuationIndex(tokens, boundaryTokenIdx - 1, lowerBoundInclusive);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  if (left === undefined || (left.pos & (POS4 | POS5A)) !== (助動詞_マス | 意志推量形_)) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, boundaryTokenIdx + 1, tokens.length);
  if (nextIdx !== null && !isBoundaryPunctuationToken(tokens[nextIdx])) {
    return null;
  }
  return {
    kind: "合成接続",
    connectiveKind: "quotative",
    surface: "と",
    tokenIdx: boundaryTokenIdx,
    tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
  };
}

function classifySingleTokenBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  boundaryTokenIdx: number,
  lookups: LookupTables,
  lowerBoundInclusive = 0
): ClauseBoundary {
  const { tokens } = cursor;
  const tok = tokens[boundaryTokenIdx];
  if (tok === undefined) return { kind: "terminal" };
  const surface = tok.surface;
  const volitionalConcessive = volitionalConcessiveToBoundary(tokens, boundaryTokenIdx, lowerBoundInclusive);
  if (volitionalConcessive !== null) {
    return volitionalConcessive;
  }
  const adjectivalConcessiveTomo = adjectivalConcessiveTomoRelationAt(tokens, boundaryTokenIdx, {
    lowerBoundInclusive,
    consumers: ["tail_multi_clause"]
  });
  if (adjectivalConcessiveTomo !== null) {
    return {
      kind: "合成接続",
      connectiveKind: adjectivalConcessiveTomo.connectiveKind,
      surface: adjectivalConcessiveTomo.surface,
      tokenIdx: adjectivalConcessiveTomo.span.endExclusive - 1,
      tokenSpan: { start: adjectivalConcessiveTomo.span.start, end: adjectivalConcessiveTomo.span.endExclusive - 1 }
    };
  }
  const politeVolitionalQuotative = politeVolitionalHostlessQuotativeBoundary(
    tokens,
    boundaryTokenIdx,
    lowerBoundInclusive
  );
  if (politeVolitionalQuotative !== null) {
    return politeVolitionalQuotative;
  }
  if (quoteMarkerRelationAt(tokens, boundaryTokenIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    const relation = quoteStructuralRelationAt(cursor.fork(boundaryTokenIdx, tokens.length, boundaryTokenIdx), lookups);
    if (relation !== undefined) {
      const boundary = quoteClauseBoundaryFromRelation(tokens, relation, lookups);
      if (boundary !== null) {
        return boundary;
      }
    }
  }
  const fusedSupportConnectiveKind = fusedCopulaSupportConnectiveKindOf(tok);
  if (fusedSupportConnectiveKind !== null) {
    const hostIdx = previousNonSpaceIndex(tokens, boundaryTokenIdx, lowerBoundInclusive);
    if (hostIdx !== null && isLikenessCarrierStemToken(tokens[hostIdx])) {
      return {
        kind: "合成接続",
        connectiveKind: fusedSupportConnectiveKind === "conditional" ? "conditional" : "even_if",
        surface: fusedSupportConnectiveKind === "conditional" ? "ば" : "ても",
        tokenIdx: boundaryTokenIdx,
        tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
      };
    }
  }
  const relationBoundary = clauseBoundaryFromMarkerBoundaryRelation(tokens, boundaryTokenIdx, lookups);
  if (relationBoundary !== null) {
    return normalizeTokaListingBoundary(cursor, relationBoundary, lookups);
  }
  if (isFiniteOrCopulaAdversativeGaBoundary(tokens, boundaryTokenIdx, lowerBoundInclusive)) {
    return {
      kind: "合成接続",
      connectiveKind: "adversative",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if (
    surface === "も" && (tok.pos & POS01) === 助詞_係助詞 &&
    isBareMoConcessivePreviousToken(tokens[boundaryTokenIdx - 1]) &&
    focusedNegationShapeAt(tokens, boundaryTokenIdx) === null &&
    !isZeroNominalizedParallelMoMarker(tokens, boundaryTokenIdx)
  ) {
    return {
      kind: "合成接続",
      connectiveKind: "concession",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)) {
    return {
      kind: "助動詞-タ仮定",
      connectiveKind: "conditional",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  if ((tok.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_)) {
    return {
      kind: "助動詞-ダ仮定",
      connectiveKind: "conditional",
      surface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    };
  }
  const boundaryCursor = cursor.fork(boundaryTokenIdx, tokens.length, boundaryTokenIdx);
  const protoLayout = activeProtoLayout();
  const attributiveQuoteSiblingQuestionContent = protoLayout !== null &&
    looksAttributiveQuoteSiblingQuestionContentAfterViaLayout(
      protoLayout,
      tokens,
      boundaryTokenIdx,
      tokens.length,
      lookups,
    );
  const anaphoricConjectureSelfQuestion =
    protoLayout?.anaphoricConjectureSelfQuestionAt(boundaryTokenIdx) !== undefined;
  const structuralKaParallelOwner = participatesInStructuralKaParallel(boundaryCursor, lookups);
  const ownedByExistingKaStructure =
    looksEmbeddedQuestionKaBoundary(boundaryCursor, lookups, { scope: "sentence" }) ||
    looksEmbeddedQuestionKaNominalizedBoundary(boundaryCursor) ||
    looksEmbeddedQuestionKaExternalSuffixBoundary(boundaryCursor, lookups) ||
    looksEmbeddedQuestionKaAdjectivalNounBoundary(boundaryCursor, lookups, { scope: "sentence" }) ||
    attributiveQuoteSiblingQuestionContent ||
    structuralKaParallelOwner;
  const terminalQuestionKa = terminalQuestionKaRelationAt(tokens, boundaryTokenIdx, {
    ownedByExistingStructure: ownedByExistingKaStructure,
    lookups,
    anaphoricConjectureSelfQuestion,
  });
  if (terminalQuestionKa !== null) {
    return { kind: "terminal" };
  }
  const kaOwnership = kaOwnershipKindAt(tokens, boundaryTokenIdx, lookups);
  if (kaOwnership === "question") {
    const questionSurface = canonicalTerminalSfpSurface(surface) === "か" ? "か" : surface;
    return withQuotedQuestionContext(cursor, {
      kind: "合成接続",
      connectiveKind: attributiveQuoteSiblingQuestionContent
        ? "question_content"
        : looksPredicateChoiceKaClauseBoundary(boundaryCursor, lookups)
        ? "alternative"
        : "question_content",
      surface: questionSurface,
      tokenIdx: boundaryTokenIdx,
      tokenSpan: { start: boundaryTokenIdx, end: boundaryTokenIdx }
    }, lookups);
  }
  const hokaConsumed = boundaryCursor.lookahead(0, matchHokaAdditiveConnectiveStart);
  if (hokaConsumed !== null) {
    const end = boundaryTokenIdx + hokaConsumed - 1;
    return {
      kind: "合成接続",
      connectiveKind: "additive_besides",
      surface: tokens.slice(boundaryTokenIdx, boundaryTokenIdx + hokaConsumed).map((token) => token.surface).join(""),
      tokenIdx: end,
      tokenSpan: { start: boundaryTokenIdx, end }
    };
  }
  const monoNoConsumed = boundaryCursor.lookahead(0, matchMonoNoConcessiveConnectiveStart);
  if (monoNoConsumed !== null) {
    const end = boundaryTokenIdx + monoNoConsumed - 1;
    return {
      kind: "合成接続",
      connectiveKind: "concession",
      surface: "ものの",
      tokenIdx: end,
      tokenSpan: { start: boundaryTokenIdx, end }
    };
  }
  return { kind: "terminal" };
}

function clauseBoundaryFromMarkerBoundaryRelation(
  tokens: readonly RuntimeHaruToken[],
  boundaryTokenIdx: number,
  lookups: LookupTables
): ClauseBoundary | null {
  const token = tokens[boundaryTokenIdx];
  if (token === undefined) {
    return null;
  }
  const relation = boundaryRelationsForToken(tokens, boundaryTokenIdx, {
    consumers: ["tail_multi_clause", "clause_layout"],
    lookups
  }).find((candidate): candidate is MarkerBoundaryRelation =>
    candidate.kind === "clause_connective" &&
    candidate.span.endExclusive === boundaryTokenIdx + 1 &&
    candidate.connectiveKind !== undefined &&
    (
      (candidate.connectiveKind !== "tame_reason" && candidate.connectiveKind !== "tame_purpose") ||
      matchTameConnectiveAt(tokens, candidate.span.start, { requireEnd: false, lookups }) !== null
    )
  );
  if (relation === undefined) {
    return null;
  }
  const end = relation.span.endExclusive - 1;
  return {
    kind: relation.span.endExclusive === boundaryTokenIdx + 1 && (token.pos & POS01) === 助詞_接続助詞
      ? "接続助詞"
      : "合成接続",
    connectiveKind: relation.connectiveKind as ConnectiveKind,
    surface: relation.surface,
    tokenIdx: end,
    tokenSpan: { start: relation.span.start, end }
  };
}

function isCopulaMoFocusPreviousToken(
  tokens: readonly RuntimeHaruToken[],
  previousIdx: number
): boolean {
  const previous = tokens[previousIdx];
  return previous !== undefined &&
    copulaDeMarkerRelationForToken(previous, previousIdx, { consumers: ["tail_multi_clause"] }) !== null;
}

function hasCopulaMoFocusContinuation(
  tokens: readonly RuntimeHaruToken[],
  nextStart: number,
  rangeEnd: number
): boolean {
  if (nextStart >= rangeEnd) {
    return false;
  }
  const token = tokens[nextStart];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 動詞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 副詞;
}

function isFiniteOrCopulaAdversativeGaBoundary(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lowerBoundInclusive: number
): boolean {
  const marker = tokens[markerIdx];
  if (
    marker === undefined || marker.surface !== "が" || (marker.pos & POS01) !== 助詞_格助詞 || lookupConnectiveBySurface(marker.surface) !== "adversative"
  ) {
    return false;
  }
  const leftEnd = previousClauseNonPunctuationIndex(tokens, markerIdx - 1, lowerBoundInclusive);
  if (leftEnd === null) {
    return false;
  }
  if (isFinitePredicateAdversativeGaLeft(tokens[leftEnd])) {
    return true;
  }
  return isExplicitDearuCopulaEnd(tokens, leftEnd, lowerBoundInclusive) ||
    isExplicitNounCopulaNegativeEnd(tokens, leftEnd, lowerBoundInclusive);
}

function isFinitePredicateAdversativeGaLeft(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞0) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function isExplicitDearuCopulaEnd(
  tokens: readonly RuntimeHaruToken[],
  leftEnd: number,
  lowerBoundInclusive: number
): boolean {
  const end = tokens[leftEnd];
  if (end === undefined) {
    return false;
  }
  if ((end.pos & POS4) === 助動詞_タ) {
    const prev = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
    return prev !== null && isExplicitDearuCopulaEnd(tokens, prev, lowerBoundInclusive);
  }
  if (!isVerbLemma(end, "ある")) {
    return false;
  }
  const prev = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
  const de = prev === null ? undefined : tokens[prev];
  return de !== undefined &&
    (de.surface === "で" || de.dictionaryForm === "だ") &&
    ((de.pos & POS0) === 助動詞0 || (de.pos & POS0) === 助詞);
}

function isExplicitNounCopulaNegativeEnd(
  tokens: readonly RuntimeHaruToken[],
  leftEnd: number,
  lowerBoundInclusive: number
): boolean {
  const end = tokens[leftEnd];
  if (end === undefined || end.dictionaryForm !== "ない") {
    return false;
  }
  const maybeFocus = previousClauseNonPunctuationIndex(tokens, leftEnd - 1, lowerBoundInclusive);
  if (maybeFocus === null) {
    return false;
  }
  const focus = tokens[maybeFocus];
  const copulaIdx = focus?.surface === "は"
    ? previousClauseNonPunctuationIndex(tokens, maybeFocus - 1, lowerBoundInclusive)
    : maybeFocus;
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  return copula !== undefined &&
    (copula.surface === "で" || copula.surface === "じゃ") &&
    (copula.pos & POS0) === 助詞;
}

interface ClauseParseInfo<Root extends TailRootBase = TailRoot> {
  readonly root: Root;
  readonly leadingSurface: string;
  readonly trailingSurface: string;
  readonly formal: boolean;
  readonly localPredicateIdx: number;
  readonly sourceConsumed: number;
}

type ClauseParseResult =
  | { readonly ok: true; readonly info: ClauseParseInfo<ParsedTailRoot> }
  | { readonly ok: false; readonly reason: string; readonly headHypothesis?: HeadHypothesisCarrier };

type TailParserStemSense = MorphemeSense & {
  readonly korean: string;
  readonly projectionOrdinal: number;
};

type TailParserSourceStemKind = "verb" | "adj" | "noun";
type TailParserProjectedStemKind = TailParserSourceStemKind | "adverb";

interface SplitSuppletiveNegativeStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly firstNegIdx: number;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
}

interface ContractedNegativeNStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly negativeToken: RuntimeHaruToken;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
}

interface VirtualCompoundStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly entry: MorphemeEntry;
  readonly consumed: number;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
  readonly sahenHydration?: true;
  readonly numericBase?: NumericStemBase;
  readonly pronominalNoHeadBase?: PronominalNoHeadStemBase;
  readonly propositionHost?: true;
}

interface ContractedCausativePassiveStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly entry: MorphemeEntry;
  readonly causativeToken: RuntimeHaruToken;
}

interface SuppletiveNegationMaterialization {
  readonly stem: StemInput;
  readonly sliceOffset: number;
  readonly politeNegative?: {
    readonly politeIdx: number;
    readonly negIdx: number;
  };
}

interface NormalizedTailParserStemKorean {
  readonly korean: string;
  readonly koreanPrefix?: string;
}

function projectKotodakaraReasonScopeStemTranslation(
  translation: TailParserStemSense,
  stemToken: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  start: number,
  stemKind: TailParserSourceStemKind
): TailParserStemSense {
  if (
    stemKind !== "noun" ||
    !stemTokenEndsWithNoKoto(stemToken) ||
    !isKotodakaraReasonScopeTail(tokens, start + 1) ||
    !translation.korean.endsWith(" 일")
  ) {
    return translation;
  }
  return {
    ...translation,
    korean: translation.korean.slice(0, -" 일".length)
  };
}

function stemTokenEndsWithNoKoto(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form.endsWith("のこと");
}

function isKotodakaraReasonScopeTail(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || (copula.pos & (POS0 | POS4)) !== (助動詞0 | 助動詞_ダ)
  ) {
    return false;
  }
  const connective = tokens[copulaIdx + 1];
  return connective !== undefined &&
    (connective.pos & POS0) === 助詞 &&
    (connective.surface === "から" || connective.surface === "し");
}

function normalizeTailParserStemKorean(
  korean: string,
  stemKind: TailParserProjectedStemKind,
  options: {
    readonly allowInternalObjectMarkerPrefix?: boolean;
    readonly allowLexicalNegativePrefix?: boolean;
  } = {}
): NormalizedTailParserStemKorean | null {
  if (!/\s/u.test(korean)) {
    return { korean };
  }
  if (stemKind === "noun" || stemKind === "adverb") {
    return { korean: korean.trim().replace(/\s+/gu, " ") };
  }
  const parts = korean.trim().split(/\s+/u);
  if (parts.length < 2) {
    return null;
  }
  const final = parts.at(-1)!;
  if (!final.endsWith("다")) {
    return null;
  }
  const prefix = `${parts.slice(0, -1).join(" ")} `;
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix.endsWith("수") && (final === "있다" || final === "없다")) {
    return { korean };
  }
  if (trimmedPrefix === "못" && (final === "하다" || options.allowLexicalNegativePrefix === true)) {
    return {
      korean: final,
      koreanPrefix: prefix
    };
  }
  if (trimmedPrefix === "안" || trimmedPrefix === "못") {
    return null;
  }
  return {
    korean: final,
    koreanPrefix: prefix
  };
}

function rangeHasMonoNoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  range: { readonly start: number; readonly end: number }
): boolean {
  for (let idx = range.start + 1; idx <= range.end; idx += 1) {
    const consumed = matchMonoNoConcessiveConnectiveStart(cursor.fork(idx, range.end + 1, idx));
    if (consumed !== null && idx + consumed - 1 <= range.end) {
      return true;
    }
  }
  return false;
}

function selectTailParserStemSenses(
  entry: MorphemeEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemKind: "verb" | "adj" | "noun",
  input: Pick<IntegrationInput, "lookups" | "numeric">,
  context: { readonly adverbialModifierContext: boolean } = { adverbialModifierContext: false }
): readonly TailParserStemSense[] | null {
  const senses = entry.senses;
  if (senses === undefined || senses.length === 0) {
    return null;
  }
  const quotePolish = quoteContentLexicalPolishTranslation(entry, tokens, pos, stemKind);
  const baseSenses: TailParserStemSense[] = (quotePolish !== null ? [quotePolish, ...senses] : senses)
    .map((sense) => ({ ...sense, projectionOrdinal: 0 }));
  const expandedSenses = expandLexicalAdverbialSenses(
    assignTailParserProjectionOrdinals(baseSenses, entry),
    stemKind,
    tokens[pos],
    entry,
    context.adverbialModifierContext
  );
  return expandedSenses.filter((sense) =>
    tailParserSenseFrameLocallyPossible(sense, tokens, pos, input)
  );
}

function assignTailParserProjectionOrdinals(
  senses: readonly TailParserStemSense[],
  entry: MorphemeEntry
): readonly TailParserStemSense[] {
  const counts = new Map<string, number>();
  return senses.map((sense) => {
    const derivation = derivationForSense(sense, entry);
    const provenance = stemCandidateProvenanceForTranslation(sense, derivation);
    const key = stemCandidateProvenanceKey(provenance);
    const projectionOrdinal = counts.get(key) ?? 0;
    counts.set(key, projectionOrdinal + 1);
    return { ...sense, projectionOrdinal };
  });
}

function tailParserProjectionOrdinalAllocator(
  senses: readonly TailParserStemSense[],
  entry: MorphemeEntry
): ReturnType<typeof createStemCandidateProjectionOrdinalAllocator> {
  return createStemCandidateProjectionOrdinalAllocator(senses.map((sense) => ({
    provenance: stemCandidateProvenanceForTranslation(
      sense,
      derivationForSense(sense, entry)
    ),
    projectionOrdinal: sense.projectionOrdinal
  })));
}

const TAIL_PARSER_EARLY_LEXICAL_CONDITION_KEYS: ReadonlySet<string> = new Set([
  "asSuruVerbAdjacent",
  "bareNoun",
  "nextContentLookup",
  "nextPos",
  "nextSurface",
  "prevParticleSurface",
  "prevPos",
  "prevSurface",
  "reduplicated"
]);

function tailParserSenseFrameLocallyPossible(
  sense: MorphemeSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): boolean {
  const frames = tailParserSenseFrames(sense);
  if (frames.length === 0) {
    return true;
  }
  return frames.some((frame) => tailParserFrameLocallyPossible(frame, tokens, pos, input));
}

function tailParserSenseFrames(sense: MorphemeSense): readonly Record<string, unknown>[] {
  if (Array.isArray(sense.senseFrames)) {
    return sense.senseFrames.filter(isTailParserRecord);
  }
  return isTailParserRecord(sense.senseFrame) ? [sense.senseFrame] : [];
}

function tailParserFrameLocallyPossible(
  frame: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): boolean {
  if (tailParserTruthyFrameDefault(frame.default)) {
    return true;
  }
  const lexicalConditions = frame.lexicalConditions ?? frame.lexical_conditions;
  if (!isTailParserRecord(lexicalConditions)) {
    return true;
  }
  const state = tailParserEarlyLexicalConditionState(lexicalConditions, tokens, pos, input);
  return state !== "fail";
}

function tailParserEarlyLexicalConditionState(
  value: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): FrameSourceConditionMatch {
  const condition = normalizeFrameSourceCondition(value);
  if (!tailParserCanEvaluateEarlyLexicalCondition(condition)) {
    return "unknown";
  }
  return evaluateFrameSourceCondition(condition, tokens, pos, {
    layout: null,
    grammar: null,
    final: false,
    lookups: input.lookups,
    numeric: input.numeric
  });
}

function tailParserCanEvaluateEarlyLexicalCondition(condition: FrameSourceCondition): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined) {
      continue;
    }
    if (key === "anyOf") {
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
      if (!value.every((branch) => isTailParserRecord(branch) && tailParserCanEvaluateEarlyLexicalCondition(normalizeFrameSourceCondition(branch as FrameSourceCondition)))) {
        return false;
      }
      continue;
    }
    if (!TAIL_PARSER_EARLY_LEXICAL_CONDITION_KEYS.has(key)) {
      return false;
    }
  }
  return true;
}

function isTailParserRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value);
}

function tailParserTruthyFrameDefault(value: unknown): boolean {
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return isTailParserRecord(value) ? Object.keys(value).length > 0 : true;
}

function expandLexicalAdverbialSenses(
  senses: readonly TailParserStemSense[],
  stemKind: TailParserSourceStemKind,
  stemToken: RuntimeHaruToken | undefined,
  entry: MorphemeEntry,
  adverbialModifierContext: boolean
): readonly TailParserStemSense[] {
  if (!adverbialModifierContext) {
    return senses;
  }
  const adjStemLane = stemKind === "adj" && stemToken !== undefined &&
    (isBareNaAdjSet(stemToken) || isIAdjectivePredicateToken(stemToken));
  if (stemKind !== "noun" && !adjStemLane) {
    return senses;
  }
  let synthesized = false;
  const expanded: TailParserStemSense[] = [];
  const nextOrdinalByProvenance = new Map<string, number>();
  for (const sense of senses) {
    const provenance = stemCandidateProvenanceForTranslation(sense, derivationForSense(sense, entry));
    const key = stemCandidateProvenanceKey(provenance);
    nextOrdinalByProvenance.set(
      key,
      Math.max(nextOrdinalByProvenance.get(key) ?? 0, sense.projectionOrdinal + 1)
    );
  }
  let pending: TailParserStemSense[] = [];
  senses.forEach((sense, index) => {
    expanded.push(sense);
    const adverbial = sense.adverbial;
    if (typeof adverbial === "string" && adverbial.length > 0) {
      synthesized = true;
      const provenance = stemCandidateProvenanceForTranslation(sense, derivationForSense(sense, entry));
      const key = stemCandidateProvenanceKey(provenance);
      const projectionOrdinal = nextOrdinalByProvenance.get(key) ?? 0;
      nextOrdinalByProvenance.set(key, projectionOrdinal + 1);
      pending.push(syntheticLexicalAdverbialSense(sense, adverbial, projectionOrdinal));
    }
    const next = senses[index + 1];
    if (next === undefined || next.priorityGroup !== sense.priorityGroup) {
      expanded.push(...pending);
      pending = [];
    }
  });
  return synthesized ? expanded : senses;
}

function syntheticLexicalAdverbialSense(
  source: TailParserStemSense,
  adverbial: string,
  projectionOrdinal: number
): TailParserStemSense {
  return {
    korean: adverbial,
    ...(source.entryId === undefined ? {} : { entryId: source.entryId }),
    ...(source.derivation === undefined ? {} : { derivation: source.derivation }),
    koreanPos: 부사,
    irregular: null,
    ...(source.priorityGroup === undefined ? {} : { priorityGroup: source.priorityGroup }),
    ...(source.priorityInGroup === undefined ? {} : { priorityInGroup: source.priorityInGroup }),
    ...(source.senseIndex === undefined ? {} : { senseIndex: source.senseIndex }),
    ...(source.senseFrame === undefined ? {} : { senseFrame: source.senseFrame }),
    ...(source.senseFrames === undefined ? {} : { senseFrames: source.senseFrames }),
    projectionOrdinal,
    sourceFormat: "senses"
  };
}

function headHypothesisCandidateFromTranslation(
  translation: TailParserStemSense,
  index: number,
  options: {
    readonly sourceStemKind: TailParserSourceStemKind;
    readonly sourceCapabilities?: HeadSourceCapabilityVector;
    readonly status: HeadHypothesisCandidate["status"];
    readonly stage: HeadHypothesisCandidate["stage"];
    readonly lemma?: string;
    readonly projectedStemKind?: TailParserProjectedStemKind;
    readonly preservedCandidate?: StemCandidate;
    readonly reason?: string;
    readonly adverbialModifierContext?: boolean;
    readonly adverbialSurfaceBridgeContext?: boolean;
    readonly adverbialSurfaceBridgeAllowed?: boolean;
  }
): HeadHypothesisCandidate {
  const lemma = options.lemma ?? translation.korean;
  return {
    index,
    lemma,
    provenance: options.preservedCandidate?.provenance ??
      stemCandidateProvenanceForTranslation(translation, derivationForSense(translation, null)),
    ...(lemma === translation.korean ? {} : { dictionaryLemma: translation.korean }),
    ...(translation.koreanPos === undefined ? {} : { koreanPos: translation.koreanPos }),
    projectedStemKind: options.projectedStemKind ?? tailParserStemKindForTranslation(translation, options.sourceStemKind),
    ...(translation.irregular === undefined ? {} : { irregular: translation.irregular }),
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    ...(translation.senseIndex === undefined ? {} : { senseIndex: translation.senseIndex }),
    projectionOrdinal: options.preservedCandidate?.projectionOrdinal ?? translation.projectionOrdinal,
    ...(translation.sourceFormat === undefined ? {} : { sourceFormat: translation.sourceFormat }),
    status: options.status,
    stage: options.stage,
    ...(options.preservedCandidate === undefined ? {} : { preservedCandidate: options.preservedCandidate }),
    ...(options.sourceCapabilities === undefined
      ? {}
      : {
        headProfile: candidateHeadProfileForTranslation(
          translation,
          options.sourceStemKind,
          options.sourceCapabilities,
          options.projectedStemKind ?? tailParserStemKindForTranslation(translation, options.sourceStemKind),
          translation.projectionOrdinal,
          {
            adverbialModifierContext: options.adverbialModifierContext ?? false,
            adverbialSurfaceBridgeContext: options.adverbialSurfaceBridgeContext ?? false,
            adverbialSurfaceBridgeAllowed: options.adverbialSurfaceBridgeAllowed ?? false
          }
        )
      }),
    ...(options.reason === undefined ? {} : { reason: options.reason })
  };
}

function candidateHasAdmittedHeadCapability(candidate: HeadHypothesisCandidate): boolean {
  return candidate.status === "admitted" &&
    (candidate.headProfile?.capabilities.length ?? 0) > 0;
}

function candidateHeadProfileForTranslation(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind,
  sourceCapabilities: HeadSourceCapabilityVector,
  projectedStemKind: TailParserProjectedStemKind,
  projectionOrder: number,
  context: {
    readonly adverbialModifierContext: boolean;
    readonly adverbialSurfaceBridgeContext: boolean;
    readonly adverbialSurfaceBridgeAllowed: boolean;
  }
): CandidateHeadProfile {
  const orderKey = {
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    projectionOrder
  };
  const capabilities: CandidateCapability[] = [];
  const pushCapability = (
    id: CandidateHeadProfile["capabilities"][number]["id"],
    source: CandidateHeadProfile["capabilities"][number]["source"],
    choices: readonly HeadRealization[]
  ): void => {
    if (choices.length === 0) return;
    capabilities.push({ id, source, choices, orderKey });
  };
  const nominalChoice: HeadRealization = {
    category: "nominal",
    projectionKind: translation.koreanPos === 명사 ? "direct_nominal" : "nominalized_predicate"
  };
  const adverbialNominalFallbackChoice: HeadRealization = {
    category: "nominal",
    projectionKind: "adverbial_nominal_fallback"
  };
  const adjectivalChoice: HeadRealization = {
    category: "adjectival_predicate",
    projectionKind: translation.koreanPos === 형용사 ? "direct_adjectival" : "projected_nominal_adjectival"
  };
  const adverbializedAdjectivalChoice: HeadRealization = {
    category: "adjectival_predicate",
    projectionKind: "adverbialized_adjectival"
  };
  const verbalChoice: HeadRealization = {
    category: "verbal_predicate",
    projectionKind: translation.koreanPos === 동사 ? "direct_verbal" : "sahen_verbalized_nominal"
  };
  const adverbializedVerbalChoice: HeadRealization = {
    category: "verbal_predicate",
    projectionKind: "adverbialized_verbal"
  };
  const adverbialChoice: HeadRealization = {
    category: "adverbial",
    projectionKind: "direct_adverbial"
  };
  const adverbialConnectiveRole = translationConnectiveRoles(translation).includes("adverbial");
  const sourceAdverbialCapabilityApplies =
    context.adverbialSurfaceBridgeContext
      ? context.adverbialSurfaceBridgeAllowed
      : sourceCapabilities.adverbialCapable ||
        sourceCapabilities.adverbCapableNominal ||
        sourceCapabilities.naAdjectiveCapable ||
        sourceCapabilities.lexicalAdverb;

  if (
    isKoreanNounAble(translation.koreanPos, translation.nominalized) ||
    (projectedStemKind === "noun" && translation.koreanPos !== 부사) ||
    translation.koreanPos === 부사
  ) {
    pushCapability("lexical_nominal", "lexical_pos", [
      translation.koreanPos === 부사 ? adverbialNominalFallbackChoice : nominalChoice
    ]);
  }
  if (translation.koreanPos === 형용사) {
    pushCapability(
      sourceCapabilities.naAdjectiveCapable ? "na_adjectival" : "i_adjectival",
      sourceCapabilities.naAdjectiveCapable ? "na_adjective_capability" : "i_adjective_inflection",
      context.adverbialModifierContext
        ? [adverbializedAdjectivalChoice, adjectivalChoice]
        : [adjectivalChoice]
    );
  } else if (
    sourceCapabilities.naAdjectiveCapable &&
    (translation.koreanPos === 명사 || projectedStemKind === "noun")
  ) {
    pushCapability("na_adjectival", "na_adjective_capability", [adjectivalChoice]);
  }
  if (translation.koreanPos === 동사) {
    pushCapability(
      "lexical_verbal",
      "lexical_pos",
      context.adverbialModifierContext
        ? [adverbializedVerbalChoice, verbalChoice]
        : [verbalChoice]
    );
  }
  if (sourceCapabilities.sahenVerbalizationCapable && (
    translation.koreanPos === 동사 ||
    translation.koreanPos === 명사 ||
    projectedStemKind === "noun"
  )) {
    pushCapability("sahen_verbal", "sahen_capability", [verbalChoice]);
  }
  if (
    (sourceAdverbialCapabilityApplies ||
      adverbialConnectiveRole ||
      context.adverbialModifierContext) &&
    translation.koreanPos === 부사
  ) {
    pushCapability("adverbial", "adverbial_capability", [adverbialChoice]);
  }
  if (capabilities.length === 0 && translation.koreanPos === undefined) {
    const fallbackChoice = projectedStemKind === "verb"
      ? verbalChoice
      : projectedStemKind === "adj"
        ? adjectivalChoice
        : projectedStemKind === "adverb"
          ? adverbialChoice
          : nominalChoice;
    pushCapability("sense_rendering", "sense_rendering", [fallbackChoice]);
  }
  return { capabilities };
}

function buildHeadHypothesisCarrier(options: {
  readonly sourceStemKind: TailParserSourceStemKind;
  readonly admittedStemKind: TailParserProjectedStemKind;
  readonly source: OpSource;
  readonly sourceCapabilities: HeadSourceCapabilityVector;
  readonly originalCandidateCount: number;
  readonly candidates: readonly HeadHypothesisCandidate[];
  readonly currentWinnerIndex?: number;
}): HeadHypothesisCarrier {
  assertUniqueStemCandidateIdentities(options.candidates.flatMap((candidate) =>
    candidate.preservedCandidate === undefined ? [] : [candidate.preservedCandidate]
  ));
  const admittedCandidateCount = options.candidates.filter((candidate) => candidate.status === "admitted").length;
  const droppedCandidateCount = options.candidates.filter((candidate) => candidate.status === "dropped").length;
  const preservedCandidateCount = options.candidates.filter((candidate) => candidate.preservedCandidate !== undefined).length;
  return {
    sourceStemKind: options.sourceStemKind,
    admittedStemKind: options.admittedStemKind,
    source: options.source,
    sourceCapabilities: options.sourceCapabilities,
    originalCandidateCount: options.originalCandidateCount,
    preservedCandidateCount,
    admittedCandidateCount,
    droppedCandidateCount,
    candidates: options.candidates,
    ...(options.currentWinnerIndex === undefined ? {} : { currentWinnerIndex: options.currentWinnerIndex })
  };
}

function headSourceCapabilityVector(token: RuntimeHaruToken): HeadSourceCapabilityVector {
  const naAdjectiveCapable = isNaAdjCapable(token);
  return {
    nominalLike: isNominalLike(token),
    iAdjectivePredicate: isIAdjectivePredicateToken(token),
    verbPredicate: isVerbPredicateToken(token),
    naAdjectiveCapable,
    keijouCapable: naAdjectiveCapable,
    naAdjectiveCapableNoun: isNaAdjCapableNoun(token),
    bareNaAdjectiveSet: isBareNaAdjSet(token),
    sahenVerbalizationCapable: isSahenCapableNominal(token),
    adverbialCapable: isAdverbCapable(token),
    adverbCapableNominal: isAdverbCapableNominal(token),
    lexicalAdverb: isLexicalAdverb(token),
    inflectionClass: inflectionClassName(token.pos),
    stemForm: stemFormName(token.pos)
  };
}

async function tailParserStemEntry(
  dictionary: DictLookup,
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean,
  nominalTargetPredicateContext: boolean
): Promise<MorphemeEntry> {
  const baseEntry = await inflectedBasePredicateEntry(
    dictionary,
    token,
    entry,
    stemKind,
    inflectingAuxHost,
    nominalTargetPredicateContext
  );
  return baseEntry ?? entry;
}

async function inflectedBasePredicateEntry(
  dictionary: DictLookup,
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean,
  nominalTargetPredicateContext: boolean
): Promise<MorphemeEntry | null> {
  if (!canUseInflectedBasePredicateEntry(token, entry, stemKind, inflectingAuxHost)) {
    return null;
  }
  if (dictionary.lookup === undefined) {
    return null;
  }
  const baseForm = entry.dictionaryForm ?? token.dictionaryForm;
  const baseReading = entry.dictionaryFormReading ?? token.dictionaryFormReading;
  const base = await dictionary.lookup(baseForm, baseReading, token.pos);
  if (base === undefined || !entryHasPredicateStemTranslation(base, stemKind, nominalTargetPredicateContext)) {
    return null;
  }
  return mergeBaseAndSurfacePredicateEntries(base, entry, stemKind, nominalTargetPredicateContext);
}

function canUseInflectedBasePredicateEntry(
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean
): boolean {
  if (
    token.dictionaryForm.length === 0 ||
    token.dictionaryForm === morphSurface(token)
  ) {
    return false;
  }
  const form5A = token.pos & POS5A;
  const nonPredicateOverrideBridge = inflectingAuxHost &&
    surfaceEntryLacksPredicateStemSense(entry, stemKind);
  if (stemKind === "verb") {
    return isVerbPredicateToken(token) && (form5A === 連用形_ || nonPredicateOverrideBridge);
  }
  if (stemKind === "adj") {
    return isIAdjectivePredicateToken(token) &&
      (form5A === 連用形_ || form5A === 語幹_ || nonPredicateOverrideBridge);
  }
  return false;
}

function surfaceEntryLacksPredicateStemSense(
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind
): boolean {
  return (entry.senses ?? []).length > 0 && !entryHasPredicateStemTranslation(entry, stemKind);
}

function tokenHostsInflectingPredicateAuxiliary(
  token: RuntimeHaruToken | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  return isNaiOrNuToken(token) ||
    isPastAuxiliaryPos(token.pos) ||
    isDesireAuxiliaryPos(token.pos) ||
    isPoliteCopulaPos(token.pos) ||
    isVoiceOrCausativeAuxiliaryToken(token);
}

function tokenOpensPredicateConnectiveHost(
  token: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined && isTeSurfaceConnectiveToken(token);
}

function mergeBaseAndSurfacePredicateEntries(
  baseEntry: MorphemeEntry,
  surfaceEntry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget: boolean
): MorphemeEntry {
  const baseSenses = baseEntry.senses ?? [];
  const surfaceSenses = surfaceEntry.senses ?? [];
  if (surfaceSenses.length === 0) {
    return baseEntry;
  }
  const surfaceHasPredicateStem = surfaceSenses.some((translation) =>
    translationIsPredicateStemCompatible(translation, stemKind, copularNominalTarget)
  );
  const primarySenses = surfaceHasPredicateStem ? surfaceSenses : baseSenses;
  const secondarySenses = surfaceHasPredicateStem
    ? baseSenses
    : copularNominalTarget
      ? surfaceSenses.filter((translation) =>
        translationIsPredicateStemCompatible(translation, stemKind, copularNominalTarget))
      : surfaceSenses;
  const merged: MorphemeSense[] = [];
  const seen = new Set<string>();
  const primaryLemmas = new Set(primarySenses.map((translation) =>
    `${translation.korean}\u0000${translation.koreanPos ?? ""}`
  ));
  const ordered = mergedPredicateSensePriority(
    primarySenses,
    secondarySenses.filter((translation) =>
      !primaryLemmas.has(`${translation.korean}\u0000${translation.koreanPos ?? ""}`)
    )
  );
  for (const translation of ordered) {
    const key = [
      translation.korean,
      translation.koreanPos ?? "",
      translation.irregular ?? "",
      JSON.stringify(translation.senseFrames ?? translation.senseFrame ?? null)
    ].join("\u0000");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(translation);
  }
  return {
    ...baseEntry,
    senses: merged
  };
}

function mergedPredicateSensePriority(
  primarySenses: readonly MorphemeSense[],
  secondarySenses: readonly MorphemeSense[]
): MorphemeSense[] {
  const isDefault = (translation: MorphemeSense): boolean => !mergedSenseHasSourceFrame(translation);
  const conditioned: MorphemeSense[] = [];
  let nextGroup = 0;
  for (const senses of [primarySenses, secondarySenses]) {
    const groups = [...new Set(senses.filter((t) => !isDefault(t)).map((t) => t.priorityGroup ?? 0))].sort((a, b) => a - b);
    for (const group of groups) {
      senses
        .filter((translation) => !isDefault(translation) && (translation.priorityGroup ?? 0) === group)
        .forEach((translation, order) => {
          conditioned.push({ ...translation, priorityGroup: nextGroup, priorityInGroup: order });
        });
      nextGroup += 1;
    }
  }
  const defaults = [...primarySenses, ...secondarySenses]
    .filter(isDefault)
    .map((translation) => ({ ...translation, priorityGroup: nextGroup }));
  return [...conditioned, ...defaults];
}

function mergedSenseHasSourceFrame(translation: MorphemeSense): boolean {
  const frames: readonly unknown[] = Array.isArray(translation.senseFrames) ? translation.senseFrames : [translation.senseFrame];
  return frames.some(senseFramePayloadHasSourceEvidence);
}

function entryHasPredicateStemTranslation(
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget = false
): boolean {
  return (entry.senses ?? []).some(t =>
    translationIsPredicateStemCompatible(t, stemKind, copularNominalTarget));
}

function translationIsPredicateStemCompatible(
  translation: MorphemeSense,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget = false
): boolean {
  if (translation.koreanPos === undefined) {
    return true;
  }
  if (stemKind === "verb") {
    return translation.koreanPos === 동사 || translation.koreanPos === 형용사;
  }
  if (stemKind === "adj") {
    return translation.koreanPos === 형용사 || translation.koreanPos === 동사 ||
      (copularNominalTarget && translation.koreanPos === 명사);
  }
  return translation.koreanPos === 명사;
}

function quoteContentLexicalPolishTranslation(
  entry: MorphemeEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemKind: TailParserSourceStemKind
): MorphemeSense | null {
  void tokens; void pos;
  if (stemKind !== "noun" || entry.dictionaryForm !== "本当") {
    return null;
  }
  return {
    korean: "사실",
    derivation: "quote_content_polish",
    koreanPos: 명사,
    senseFrame: {
      id: "quote_content_polish",
      lexicalConditions: {
        quoteContentSlotKind: "quoted_content",
        quoteContentHostKind: ["thought", "report", "question"],
        quoteContentPlainDaOnly: true
      }
    }
  };
}

function sourceAllowsPredicateCopulaHostCandidates(token: RuntimeHaruToken): boolean {
  return isNaAdjCapable(token);
}

function stemKindForTailParserSource(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  pos0: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): TailParserSourceStemKind {
  if (pos0 === 動詞) {
    return "verb";
  }
  if (pos0 === 形容詞0) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbialKamoModalPredicateStart(tokens, start, lookups)) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbialConjecturePredicateStart(tokens, start, lookups)) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbCopulaPredicateStart(tokens, start, lookups)) {
    return "noun";
  }
  if (pos0 === 副詞 && sourceHasAdverbialSurfacePostverbCarrier(tokens, start)) {
    return "noun";
  }
  if (pos0 === 副詞 && adverbHostCarriesCanonicalReformulationMarker(tokens, start, numeric, lookups, sourceHost)) {
    return "noun";
  }
  if (pos0 === 形状詞) {
    return matchCopula(tokens, start + 1, lookups) === null &&
      !sourceHasTosuruCarrier(tokens, start) &&
      detectSahenPredicateStart(tokens, start) === null
      ? "adj"
      : "noun";
  }
  if (
    pos0 === 名詞 &&
    ((tokens[start]?.pos ?? 0) & POS2) === 形状詞可能 &&
    sourceHasFormalToStateResultCarrier(tokens, start)
  ) {
    return "adj";
  }
  if (
    pos0 === 名詞 &&
    ((tokens[start]?.pos ?? 0) & POS2) === 形状詞可能 &&
    isKeijoujiKanouYouNiProjectionStart(tokens, start, lookups)
  ) {
    return "adj";
  }
  return "noun";
}

function sourceHasTosuruCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const carrier = tokens[start + 2];
  const carrierForm5A = (carrier?.pos ?? 0) & POS5A;
  return quoteMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  })?.canonicalSurface === "と" &&
    carrier !== undefined &&
    carrier.dictionaryForm === "する" &&
    (carrierForm5A === 連体形_ || carrierForm5A === 終止形_);
}

function sourceHasFormalToStateResultCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const marker = quoteMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  });
  const carrier = tokens[start + 2];
  return marker?.canonicalSurface === "と" &&
    carrier !== undefined &&
    (carrier.pos & POS0) === 動詞 &&
    (carrier.dictionaryForm === "なる" || carrier.dictionaryForm === "なれる");
}

type AdverbialSurfacePostverbKind = "change" | "potential" | "control";

function sourceHasAdverbialSurfacePostverbCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  return sourceAdverbialSurfacePostverbKind(tokens, start) !== null;
}

function sourceAdverbialSurfacePostverbKind(
  tokens: readonly RuntimeHaruToken[],
  start: number
): AdverbialSurfacePostverbKind | null {
  const token = tokens[start];
  if (token === undefined || !isAdverbCapable(token)) {
    return null;
  }
  if (sourceIsWhIndefiniteAmountHost(token)) {
    return null;
  }
  const marker = caseParticleMarkerRelationForToken(tokens[start + 1], start + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_boundary_readiness"]
  });
  const carrier = tokens[start + 2];
  if (
    marker === null ||
    carrier === undefined ||
    (carrier.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(carrier, tokens[start + 3])
  ) {
    return null;
  }
  if (carrier.dictionaryForm === "なる") {
    return "change";
  }
  if (carrier.dictionaryForm === "なれる") {
    return "potential";
  }
  if (carrier.dictionaryForm === "する" && sourceHasBoundedAdverbialControlSuruCarrier(carrier, tokens[start + 3])) {
    return "control";
  }
  return null;
}

function sourceIsWhIndefiniteAmountHost(token: RuntimeHaruToken): boolean {
  const dictForm = token.dictionaryForm || token.surface;
  return WH_INDEFINITE_DEMO_HOSTS.has(dictForm) || WH_INDEFINITE_DEMO_HOSTS.has(token.surface);
}

function isFrameFreeKoreanAdverbTailSense(translation: TailParserStemSense): boolean {
  return translation.koreanPos === 부사 && !stemTranslationHasFrameEvidence(translation);
}

function adverbialSurfaceCandidateSetCanBridge(
  senses: readonly TailParserStemSense[],
  kind: AdverbialSurfacePostverbKind | null
): boolean {
  if (kind === null) {
    return false;
  }
  const frameFreeAdverbs = senses.filter(isFrameFreeKoreanAdverbTailSense);
  if (frameFreeAdverbs.length === 0) {
    return false;
  }
  if (kind === "control") {
    return true;
  }
  const hasNominalResultCandidate = senses.some((sense) => sense.koreanPos === 명사 || sense.koreanPos === 대명사);
  return !(hasNominalResultCandidate && frameFreeAdverbs.length > 1);
}

function sourceHasBoundedAdverbialControlSuruCarrier(
  carrier: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): boolean {
  const form = carrier.pos & POS5A;
  if (form === 終止形_) {
    return next === undefined || (next.pos & POS0) === 補助記号;
  }
  return form === 連用形_ &&
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_);
}

interface StemCandidateProjection {
  readonly entry?: MorphemeEntry | null;
  readonly stemKind?: TailParserProjectedStemKind;
  readonly lemma?: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
  readonly conj?: VerbConjType;
  readonly shortNegationPolicy?: StemCandidate["shortNegationPolicy"];
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
  readonly projectionOrdinal?: number;
  readonly senseFrame?: unknown;
  readonly senseFrames?: readonly unknown[];
  readonly teIruResultative?: true;
}

function confineNominalTargetMarkToAdjectivalSource(
  stem: StemInput,
  sourcePredicateShape: SourcePredicateShape
): StemInput {
  if (sourcePredicateShape === "i_adjective") {
    return stem;
  }
  if (stem.kind === "noun" && stem.nominalTargetForVerbalSource === true) {
    const { nominalTargetForVerbalSource: _unmarked, ...rest } = stem;
    void _unmarked;
    return rest;
  }
  if (stem.kind === "candidateSet") {
    return {
      ...stem,
      candidates: stem.candidates.map((candidate) => {
        if (candidate.nominalTargetForVerbalSource !== true) {
          return candidate;
        }
        const { nominalTargetForVerbalSource: _unmarked, ...rest } = candidate;
        void _unmarked;
        return rest;
      })
    };
  }
  return stem;
}

function stemCandidateFromTranslation(
  translation: TailParserStemSense,
  stemKind: TailParserSourceStemKind,
  conjForVerb: VerbConjType | undefined,
  projection: StemCandidateProjection = {}
): StemCandidate {
  const candidateStemKind = projection.stemKind ?? tailParserStemKindForTranslation(translation, stemKind);
  const lemma = projection.lemma ?? translation.korean;
  const koreanPos = projection.koreanPos ?? translation.koreanPos ?? koreanPosForProjectedStemKind(candidateStemKind);
  const irregular = projection.irregular !== undefined ? projection.irregular : translation.irregular ?? null;
  const conj = projection.conj ?? (candidateStemKind === "verb" ? conjForVerb : undefined);
  const shortNegationPolicy = projection.shortNegationPolicy ??
    shortNegationPolicyForStemTranslation(translation, candidateStemKind);
  const koreanPrefix = projection.koreanPrefix ?? translation.koreanPrefix;
  const koreanSuffix = projection.koreanSuffix ?? translation.koreanSuffix;
  const derivation = derivationForSense(translation, projection.entry ?? null);
  const derivationOrderIndex = projection.entry === undefined
    ? undefined
    : derivationOrder(projection.entry, derivation.id);
  const translationWithSense = translation;
  return {
    provenance: stemCandidateProvenanceForTranslation(translation, derivation),
    lemma,
    ...(translationWithSense.intrinsicHonorific === undefined
      ? {}
      : { intrinsicHonorific: translationWithSense.intrinsicHonorific }),
    irregular,
    ...(koreanPos === undefined ? {} : { koreanPos }),
    ...(translation.nominalized === undefined ? {} : { nominalized: translation.nominalized }),
    ...(translation.adverbial === undefined ? {} : { adverbial: translation.adverbial }),
    ...(translation.koreanPolite === undefined ? {} : { koreanPolite: translation.koreanPolite }),
    ...(conj === undefined ? {} : { conj }),
    ...(translation.connectiveRole === undefined
      ? {}
      : { connectiveRole: translation.connectiveRole }),
    ...(translationWithSense.connectivePreferences === undefined ? {} : { connectivePreferences: translationWithSense.connectivePreferences }),
    ...(translationWithSense.casePreferences === undefined ? {} : { casePreferences: translationWithSense.casePreferences }),
    ...(translationWithSense.caseRealization === undefined ? {} : { caseRealization: translationWithSense.caseRealization }),
    ...(translationWithSense.slotRealization === undefined ? {} : { slotRealization: translationWithSense.slotRealization }),
    ...(projection.senseFrame !== undefined
      ? { senseFrame: projection.senseFrame }
      : translationWithSense.senseFrame === undefined
        ? {}
        : { senseFrame: translationWithSense.senseFrame }),
    ...(projection.senseFrames !== undefined
      ? { senseFrames: projection.senseFrames }
      : translationWithSense.senseFrames === undefined ? {} : { senseFrames: translationWithSense.senseFrames }),
    ...(translationWithSense.senseCaseRealization === undefined ? {} : { senseCaseRealization: translationWithSense.senseCaseRealization }),
    ...(translationWithSense.senseSlotRealization === undefined ? {} : { senseSlotRealization: translationWithSense.senseSlotRealization }),
    ...(translationWithSense.priorityGroup === undefined ? {} : { priorityGroup: translationWithSense.priorityGroup }),
    ...(translationWithSense.priorityInGroup === undefined ? {} : { priorityInGroup: translationWithSense.priorityInGroup }),
    ...(translationWithSense.senseIndex === undefined ? {} : { senseIndex: translationWithSense.senseIndex }),
    projectionOrdinal: projection.projectionOrdinal ?? translationWithSense.projectionOrdinal,
    derivation,
    ...(derivationOrderIndex === undefined ? {} : { derivationOrder: derivationOrderIndex }),
    ...(translationWithSense.sourceFormat === undefined ? {} : { sourceFormat: translationWithSense.sourceFormat }),
    ...(translation.dropFirstNegativeAux === true ? { dropFirstNegativeAux: true as const } : {}),
    ...(translation.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true as const } : {}),
    ...(translation.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(projection.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(stemTranslationHasTeIruDropAux(translation, stemKind) ? { teIruDropAux: true as const } : {}),
    ...(translation.teIruContractToPast === true ? { teIruContractToPast: true as const } : {}),
    ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy }),
    ...(stemKind !== "noun" && candidateStemKind === "noun"
      ? { nominalTargetForVerbalSource: true as const }
      : {}),
    ...(koreanPrefix === undefined ? {} : { koreanPrefix }),
    ...(koreanSuffix === undefined ? {} : { koreanSuffix })
  };
}

function koreanPosForProjectedStemKind(stemKind: TailParserProjectedStemKind): number {
  if (stemKind === "verb") {
    return 동사;
  }
  if (stemKind === "adj") {
    return 형용사;
  }
  if (stemKind === "adverb") {
    return 부사;
  }
  return 명사;
}

function sahenStemProjection(translation: TailParserStemSense): StemCandidateProjection {
  if (translation.koreanPos === 동사 && translation.korean.endsWith("다")) {
    return {
      stemKind: "verb",
      lemma: translation.korean,
      irregular: translation.irregular ?? null,
      koreanPos: 동사,
      conj: translation.korean.endsWith("하다") ? "sahen" : "godan",
      ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
      ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
    };
  }
  if (translation.koreanPos === 형용사 && translation.korean.endsWith("다")) {
    return {
      stemKind: "adj",
      lemma: translation.korean,
      irregular: translation.irregular ?? null,
      koreanPos: 형용사,
      ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
      ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
    };
  }
  return {
    stemKind: "verb",
    lemma: `${translation.korean}하다`,
    irregular: "여",
    koreanPos: 동사,
    conj: "sahen",
    shortNegationPolicy: "sahen_split",
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
}

function sahenStemProjectionCandidates(
  translation: TailParserStemSense,
  sahenNounSurface: string,
  lookups: LookupTables,
  allocateProjectionOrdinal: () => number,
  options: { readonly followingAgentiveAux?: boolean } = {}
): readonly StemCandidateProjection[] {
  const base = sahenStemProjection(translation);
  if (
    translation.koreanPos === 동사 ||
    !lookups.SEMANTIC_PATIENT_RESULT_SAHEN_NOUNS.has(sahenNounSurface) ||
    options.followingAgentiveAux === true
  ) {
    return [base];
  }
  const prefixSuffix = {
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
  return [
    {
      ...base,
      senseFrame: {
        id: "patient_result_sahen_transitive",
        lexicalConditions: { prevCaseExists: ["を"] }
      }
    },
    {
      stemKind: "verb",
      lemma: `${translation.korean}되다`,
      irregular: null,
      koreanPos: 동사,
      shortNegationPolicy: "long_only",
      teIruResultative: true,
      projectionOrdinal: allocateProjectionOrdinal(),
      ...prefixSuffix
    }
  ];
}

function sahenPredicateHasFollowingAgentiveAux(
  tokens: readonly RuntimeHaruToken[],
  sahenVerbIdx: number,
  lookups: LookupTables
): boolean {
  const next = tokens[sahenVerbIdx + 1];
  if (
    next !== undefined && (next.pos & POS0) === 助動詞0 &&
    (next.dictionaryForm === "せる" || next.dictionaryForm === "させる")
  ) {
    return true;
  }
  const connective = tokens[sahenVerbIdx + 1];
  const postverb = tokens[sahenVerbIdx + 2];
  const postverbLemma = postverb?.dictionaryForm || postverb?.surface;
  return connective?.surface === "て" &&
    (connective.pos & POS0) === 助詞 &&
    postverb !== undefined && (postverb.pos & POS0) === 動詞 &&
    postverbLemma !== undefined && (
      lookups.PATIENT_RESULT_AGENTIVE_AUXILIARIES.has(postverbLemma) ||
      TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM.get(postverbLemma) === "benefactive"
    );
}

function stemInputFromCandidate(
  candidate: StemCandidate,
  sourceStemKind: TailParserSourceStemKind
): StemInput {
  const candidateStemKind = tailParserStemKindForCandidate(candidate, sourceStemKind);
  if (stemCandidateNeedsDeferredCommit(candidate)) {
    if (candidateStemKind === "noun") {
      return {
        kind: "noun",
        lemma: candidate.lemma,
        ...(candidate.nominalTargetForVerbalSource === true
          ? { nominalTargetForVerbalSource: true as const }
          : {}),
        ...nounStemInterjectionForCandidate(candidate),
        ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
        ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
      };
    }
    return {
      kind: "candidateSet",
      candidates: [candidate]
    };
  }
  if (candidateStemKind === "noun") {
    return {
      kind: "noun",
      lemma: candidate.lemma,
      ...(candidate.nominalTargetForVerbalSource === true
        ? { nominalTargetForVerbalSource: true as const }
        : {}),
      ...nounStemInterjectionForCandidate(candidate),
      ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
      ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
    };
  }
  return {
    kind: candidateStemKind,
    lemma: candidate.lemma,
    irregular: candidate.irregular,
    ...(candidateStemKind === "verb" && candidate.conj !== undefined ? { conj: candidate.conj } : {}),
    ...(candidate.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: candidate.shortNegationPolicy }),
    ...(candidate.dropFirstPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
    ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
    ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
  };
}

function tailParserStemKindForCandidate(
  candidate: StemCandidate,
  sourceStemKind: TailParserSourceStemKind
): TailParserProjectedStemKind {
  if (candidate.koreanPos === 형용사) {
    return "adj";
  }
  if (candidate.koreanPos === 동사) {
    return "verb";
  }
  if (candidate.koreanPos === 명사) {
    return "noun";
  }
  if (candidate.koreanPos === 부사) {
    return "adverb";
  }
  return sourceStemKind;
}

function tailParserStemKindForTranslation(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): TailParserProjectedStemKind {
  if (translation.koreanPos === 형용사) {
    return "adj";
  }
  if (translation.koreanPos === 동사) {
    return "verb";
  }
  if (translation.koreanPos === 명사) {
    return "noun";
  }
  if (translation.koreanPos === 부사) {
    return "adverb";
  }
  return sourceStemKind;
}

function translationConnectiveRoles(translation: TailParserStemSense): readonly string[] {
  const role = translation.connectiveRole;
  const roles = [
    ...(role === undefined ? [] : Array.isArray(role) ? role : [role]),
    ...connectiveRolesFromFramePayload(translation.senseFrame),
    ...(Array.isArray(translation.senseFrames) ? translation.senseFrames.flatMap(connectiveRolesFromFramePayload) : [])
  ];
  if (roles.length === 0) {
    return [];
  }
  return [...new Set(roles)];
}

function connectiveRolesFromFramePayload(frame: unknown): readonly string[] {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return [];
  }
  const role = (frame as Record<string, unknown>).connectiveRole;
  if (typeof role === "string") {
    return [role];
  }
  if (Array.isArray(role) && role.every((item): item is string => typeof item === "string")) {
    return role;
  }
  return [];
}

function stemTranslationNeedsCommitSelection(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): boolean {
  return stemTranslationHasFrameEvidence(translation) ||
    translation.dropFirstNegativeAux === true ||
    translation.dropFirstPassiveAux === true ||
    translation.dropFirstCausativeAux === true ||
    translation.teIruResultative === true ||
    stemTranslationHasTeIruDropAux(translation, sourceStemKind) ||
    translation.teIruContractToPast === true;
}

function stemCandidateNeedsDeferredCommit(candidate: StemCandidate): boolean {
  return candidate.intrinsicHonorific === true ||
    stemCandidateNeedsDerivedVoiceCommit(candidate) ||
    senseCarriesSelectionFrame(candidate) ||
    candidate.casePreferences !== undefined ||
    candidate.caseRealization !== undefined ||
    candidate.slotRealization !== undefined ||
    candidate.senseCaseRealization !== undefined ||
    candidate.senseSlotRealization !== undefined ||
    candidate.dropFirstNegativeAux === true ||
    candidate.dropFirstPassiveAux === true ||
    candidate.dropFirstCausativeAux === true ||
    candidate.teIruResultative === true ||
    candidate.teIruDropAux === true ||
    candidate.teIruContractToPast === true;
}

function stemCandidateNeedsDerivedVoiceCommit(candidate: StemCandidate): boolean {
  const id = candidate.derivation?.id;
  if (id !== "passive" && id !== "potential" && id !== "honorific") {
    return false;
  }
  return !(id === "passive" && candidate.dropFirstPassiveAux === true);
}

function stemTranslationHasFrameEvidence(translation: TailParserStemSense): boolean {
  return senseFramePayloadHasSourceEvidence(translation.senseFrame) ||
    (Array.isArray(translation.senseFrames) && translation.senseFrames.some(senseFramePayloadHasSourceEvidence)) ||
    translation.casePreferences !== undefined ||
    translation.caseRealization !== undefined ||
    translation.slotRealization !== undefined ||
    translation.senseCaseRealization !== undefined ||
    translation.senseSlotRealization !== undefined;
}

function stemTranslationHasTeIruDropAux(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): boolean {
  return translation.teIruDropAux === true ||
    (sourceStemKind === "verb" && translation.koreanPos === 형용사);
}

function shortNegationPolicyForStemTranslation(
  translation: TailParserStemSense,
  stemKind: TailParserProjectedStemKind
): StemCandidate["shortNegationPolicy"] | undefined {
  if (stemKind === "adverb") {
    return undefined;
  }
  return shortNegationPolicyForTranslation(translation.korean, {
    stemKind,
    ...(translation.shortNegationPolicy === undefined ? {} : { explicitPolicy: translation.shortNegationPolicy }),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true } : {})
  });
}

function suppletiveBaseStemForMaterialization(
  stem: StemInput,
  senses: readonly TailParserStemSense[],
  stemKind: TailParserSourceStemKind,
  conjForVerb: VerbConjType | undefined
): { readonly stem: StemInput; readonly korean: string } | null {
  if (stemKind === "noun") {
    return null;
  }
  if (stem.kind !== "candidateSet") {
    return { stem, korean: stem.lemma };
  }
  const candidate = senses.find((translation) =>
    !stemTranslationHasFrameEvidence(translation) &&
    !stemTranslationHasDerivedVoice(translation) &&
    loadSuppletiveNegDict().has(translation.korean)
  );
  if (candidate === undefined) {
    return null;
  }
  return {
    korean: candidate.korean,
    stem: {
      kind: stemKind,
      lemma: candidate.korean,
      irregular: candidate.irregular ?? null,
      ...(conjForVerb === undefined ? {} : { conj: conjForVerb })
    }
  };
}

function stemTranslationHasDerivedVoice(translation: TailParserStemSense): boolean {
  const derivation = (translation as { readonly derivation?: unknown }).derivation;
  return derivation === "passive" || derivation === "potential" || derivation === "honorific";
}

function detectSplitSuppletiveNegativeStem(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  baseOffset: number
): SplitSuppletiveNegativeStem | null {
  if (!isSplitSuppletiveNegativeSurfaceStart(tokens, start)) {
    return null;
  }
  const first = tokens[start]!;
  const second = tokens[start + 1]!;
  const dictionaryForm = `${first.surface}かる`;
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(first, { kind: "merge", sources: [first, second] }),
    dictionaryForm,
    reading: "ワカラ",
    dictionaryFormReading: "ワカル",
    pos: 動詞 | 五段_ラ行 | 未然形_一般,
    syntheticReason: "tail_parser_split_suppletive_negative_stem",
    splitB: [first, second]
  };
  return {
    virtualToken,
    firstNegIdx: start + 2,
    stemSourceTokens: [first, second],
    stemSourceTokenIndices: [baseOffset + start, baseOffset + start + 1]
  };
}

function detectContractedNegativeNStem(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  baseOffset: number
): ContractedNegativeNStem | null {
  const token = tokens[start];
  const connector = tokens[start + 1];
  if (
    token === undefined || connector === undefined || (token.pos & POS0) !== 動詞 || !is五段(token.pos) || connector.surface !== "で" || (connector.pos & POS01) !== 助詞_接続助詞
  ) {
    return null;
  }
  const surfaceStem = godanDictionaryFormToMizenStem(token.dictionaryForm);
  const readingStem = godanDictionaryFormToMizenStem(token.dictionaryFormReading);
  if (surfaceStem === null || readingStem === null) {
    return null;
  }
  const expectedSurface = `${surfaceStem}ん`;
  if (token.surface !== expectedSurface) {
    return null;
  }

  const virtualToken: RuntimeHaruToken = {
    ...token,
    surface: surfaceStem,
    reading: readingStem,
    pos: (token.pos & ~POS5) | 未然形_一般,
    syntheticReason: "tail_parser_contracted_negative_n_stem",
    splitB: [token]
  };
  const negativeToken: RuntimeHaruToken = {
    ...token,
    surface: "ん",
    normalizedForm: "ぬ",
    dictionaryForm: "ぬ",
    reading: "ン",
    dictionaryFormReading: "ヌ",
    pos: 助動詞0 | 助動詞_ヌ | 終止形_,
    syntheticReason: "tail_parser_contracted_negative_n_aux",
    splitB: [token]
  };
  return {
    virtualToken,
    negativeToken,
    stemSourceTokens: [token],
    stemSourceTokenIndices: [baseOffset + start]
  };
}

function garuDerivedSenses(
  entry: MorphemeEntry | undefined,
  accepts: (koreanPos: number) => boolean,
  deriveKorean: (candidate: TranslationCandidate) => string
): readonly MorphemeSense[] {
  if (entry === undefined) {
    return [];
  }
  return iterTranslationCandidates(entry)
    .filter((candidate) => accepts(candidate.koreanPos) && !senseRequiresAuxChainEvidence(candidate.translation))
    .map((candidate) => {
      const source = candidate.translation;
      return {
        korean: deriveKorean(candidate),
        koreanPos: 동사,
        irregular: "여" as IrregularType,
        ...(source.senseFrame === undefined ? {} : { senseFrame: source.senseFrame }),
        ...(source.senseFrames === undefined ? {} : { senseFrames: source.senseFrames }),
        ...(source.casePreferences === undefined ? {} : { casePreferences: source.casePreferences }),
        ...(source.caseRealization === undefined ? {} : { caseRealization: source.caseRealization }),
        ...(source.slotRealization === undefined ? {} : { slotRealization: source.slotRealization }),
        ...(source.senseCaseRealization === undefined ? {} : { senseCaseRealization: source.senseCaseRealization }),
        ...(source.senseSlotRealization === undefined ? {} : { senseSlotRealization: source.senseSlotRealization }),
        ...(source.priorityGroup === undefined ? {} : { priorityGroup: source.priorityGroup }),
        ...(source.priorityInGroup === undefined ? {} : { priorityInGroup: source.priorityInGroup })
      } satisfies MorphemeSense;
    });
}

async function detectGaruSyntheticStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  const garu = input.tokens[range.start + 1];
  if (head === undefined || garu === undefined) {
    return null;
  }

  const isSuffixGaru = isGaruSuffixToken(garu);
  const isAuxTagaru = isTagaruAuxToken(head, garu);
  if (!isSuffixGaru && !isAuxTagaru) {
    return null;
  }

  const virtualToken = buildGaruVirtualToken(head, garu, isAuxTagaru ? "たがる" : "がる");
  let entry: MorphemeEntry;

  if (isAuxTagaru) {
    const headEntry = await input.dictionary.lookupTokenRelaxed(head);
    const senses = garuDerivedSenses(
      headEntry,
      (pos) => pos === 동사,
      (candidate) => `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "고")} 싶어하다`
    );
    if (senses.length === 0) {
      return null;
    }
    entry = buildSyntheticGaruEntry(virtualToken, senses);
  } else {
    const lexicalEntry = await lookupLexicalizedGaruEntry(input.dictionary, head, garu, virtualToken);
    if (lexicalEntry !== null) {
      entry = lexicalEntry;
    } else if (head.dictionaryForm === "欲する") {
      entry = buildSyntheticGaruEntry(virtualToken, [{ korean: "갖고 싶어하다", koreanPos: 동사, irregular: "여" }]);
    } else if ((head.pos & POS0) === 形容詞0 || (head.pos & POS0) === 形状詞) {
      const headEntry = await input.dictionary.lookupTokenRelaxed(head);
      const senses = garuDerivedSenses(
        headEntry,
        (pos) => pos === 동사 || pos === 형용사,
        (candidate) => `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "아/어")}하다`
      );
      if (senses.length === 0) {
        return null;
      }
      entry = buildSyntheticGaruEntry(virtualToken, senses);
    } else {
      return null;
    }
  }

  return {
    virtualToken,
    entry,
    consumed: 2,
    stemSourceTokens: [head, garu],
    stemSourceTokenIndices: [baseOffset + range.start, baseOffset + range.start + 1]
  };
}

function resolveLemmaEntryInContext(
  entry: MorphemeEntry | undefined,
  input: IntegrationInput,
  pos: number
): MorphemeEntry | undefined {
  if (entry === undefined) {
    return undefined;
  }
  return resolveContext(entry, input.tokens, pos, { lookups: input.lookups, numeric: input.numeric });
}

async function withStandaloneNumeralLexicalOwner(
  plan: NumeralPlan,
  input: IntegrationInput,
  pos: number
): Promise<NumeralPlan> {
  const head = input.tokens[pos];
  if (head === undefined) {
    return plan;
  }
  const lookup = await input.dictionary.lookupTokenRelaxed(head)
    ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[pos + 1] ?? null });
  const entry = resolveLemmaEntryInContext(lookup, input, pos);
  if (entry === undefined || isSurfaceEchoFallbackEntry(entry)) {
    return plan;
  }
  const candidate = firstTranslationCandidate(entry);
  return candidate === undefined ? plan : { ...plan, lexicalOwnerSurface: candidate.koreanLemma };
}

function isSurfaceEchoFallbackEntry(entry: MorphemeEntry): boolean {
  return entry.synthetic === true && entry.syntheticReason === "surface_fallback";
}

function nounCompoundHeadKorean(entry: MorphemeEntry): string | null {
  for (const candidate of iterTranslationCandidates(entry)) {
    if (isKoreanNounAble(candidate.koreanPos, candidate.translation.nominalized)) {
      return koreanNounLemma(candidate.koreanLemma, candidate.koreanPos, candidate.translation.nominalized);
    }
  }
  return null;
}

function boundQuantityBeforeCounterNoun(
  input: IntegrationInput,
  localStart: number,
  baseOffset: number,
  contextTokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  const previous = tokenBeforeNounPhraseHead(input, localStart, baseOffset, contextTokens);
  if (previous === undefined) {
    return false;
  }
  return readNumeralToken(previous, {
    zeroQuantitySurfaces: input.numeric.ZERO_QUANTITY_NUMERALS,
    counterCombined: true
  }) !== undefined;
}

function tokenBeforeNounPhraseHead(
  input: IntegrationInput,
  localStart: number,
  baseOffset: number,
  contextTokens: readonly RuntimeHaruToken[] | undefined
): RuntimeHaruToken | undefined {
  if (localStart >= 1) {
    return input.tokens[localStart - 1];
  }
  if (contextTokens === undefined || contextTokens === input.tokens) {
    return undefined;
  }
  const absoluteStart = baseOffset + localStart;
  if (absoluteStart < 1 || contextTokens[absoluteStart] !== input.tokens[localStart]) {
    return undefined;
  }
  return contextTokens[absoluteStart - 1];
}

async function detectNounPhraseHeadStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number,
  outgoingBoundary?: ClauseBoundary,
  contextTokens?: readonly RuntimeHaruToken[]
): Promise<VirtualCompoundStem | null> {
  const head = input.tokens[range.start];
  if (head === undefined || !isNominalCopulaHostPos(head.pos)) {
    return null;
  }
  const reserved = matchedNumericHostReservation(input, baseOffset + range.start);
  const span = nounPhraseHeadSpan(input.cursor, range.start, input.numeric, reserved, input.lookups);
  const suffixEnd = span.endExclusive;
  const standaloneNumeralHead = isStandaloneNumeralHeadSpan(span, range.start);
  if (isNumeralToken(head) && span.numeral === null) {
    return null;
  }
  if (suffixEnd === range.start + 1 && span.numeral === null) {
    return null;
  }
  if (
    !isNounPhraseCopulaPredicateStart(input.cursor, range.start, input.numeric, input.lookups, reserved) &&
    !isNominalEvidentialRashiiPredicateStart(input.tokens, range.start, input.lookups) &&
    !isNominalQuestionTerminalStart(input.cursor, range.start, input.numeric, input.lookups) &&
    !isBareNominalQuoteContentNounPhrase(outgoingBoundary, baseOffset + span.endExclusive)
  ) {
    return null;
  }
  const parts: NounPhraseSurfacePart[] = [];
  const lastSpanToken = input.tokens[suffixEnd - 1];
  const endsWithDerivationalSuffix =
    lastSpanToken !== undefined && isNaAdjectiveDerivationalSuffix(lastSpanToken);
  let numericBase: NumericStemBase | null = null;
  let suffixLoopStart: number;
  if (span.numeral !== null) {
    const numeral = reserved !== null
      ? reserved.plan
      : contextResolvedNounPhraseNumeral(
        input,
        range.start,
        baseOffset,
        { ...span, numeral: span.numeral },
        contextTokens
      );
    const numeralPlan = numeral.kind !== "numeral" || !standaloneNumeralHead
      ? numeral
      : await withStandaloneNumeralLexicalOwner(numeral, input, range.start);
    numericBase = { plan: numeralPlan };
    suffixLoopStart = span.suffixStart;
  } else {
    const headLookup = await input.dictionary.lookupTokenRelaxed(head)
      ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[range.start + 1] ?? null });
    const headEntry = resolveLemmaEntryInContext(headLookup, input, range.start);
    const headCandidate = headEntry === undefined ? undefined : firstTranslationCandidate(headEntry);
    if (headCandidate === undefined || headEntry === undefined) {
      return null;
    }
    const headKorean = endsWithDerivationalSuffix
      ? nounCompoundHeadKorean(headEntry)
      : headCandidate.koreanLemma;
    if (headKorean === null) {
      return null;
    }
    parts.push({ korean: headKorean, isSuffixNoun1Char: false, isNominal: true });
    suffixLoopStart = span.suffixStart;
  }
  const honorificLookups = honorificClusterLookupsFrom(input.lookups);
  for (let k = suffixLoopStart; k < suffixEnd; k++) {
    const suffixToken = input.tokens[k]!;
    const clusterDecision = honorificClusterSuffixDecision(input.tokens, k, honorificLookups);
    if (clusterDecision?.kind === "absorbed") {
      continue;
    }
    if (clusterDecision?.kind === "override") {
      parts.push({
        korean: clusterDecision.realization.korean,
        attachLeft: clusterDecision.realization.attachLeft,
        isSuffixNoun1Char: false,
        isNominal: false
      });
      continue;
    }
    const numeralCounterHead = numericBase !== null &&
      numericBase.plan.kind === "numeral" &&
      (numericBase.plan.counterKey.length > 0 || numericBase.plan.amountFormatted === true);
    const numeralBoundCounterNoun = isCounterCapableToken(head) &&
      boundQuantityBeforeCounterNoun(input, range.start, baseOffset, contextTokens);
    const approximationMarker = numeralCounterHead || numeralBoundCounterNoun
      ? quantityApproximationMarker(suffixToken, input.numeric)
      : undefined;
    if (approximationMarker !== undefined) {
      parts.push({
        korean: approximationMarker.korean,
        attachLeft: false,
        isSuffixNoun1Char: false,
        isNominal: false
      });
      continue;
    }
    const suffixEntry = resolveLemmaEntryInContext(await input.dictionary.lookupTokenRelaxed(suffixToken), input, k);
    const suffixCandidate = suffixEntry === undefined ? undefined : firstTranslationCandidate(suffixEntry);
    if (suffixCandidate === undefined) {
      return null;
    }
    parts.push({
      korean: suffixCandidate.koreanLemma,
      attachLeft: suffixCandidate.translation.attachLeft ?? true,
      attachRight: suffixCandidate.translation.attachRight,
      isSuffixNoun1Char: false,
      isNominal: false
    });
  }
  const consumed = span.endExclusive - range.start;
  const sourceTokens = input.tokens.slice(range.start, range.start + consumed);
  const surface = sourceTokens.map((token) => token.surface).join("");
  const lemma = numericBase === null ? joinNounPhraseSurface(parts) : surface;
  if (lemma.length === 0 || range.start + consumed - 1 > range.end) {
    return null;
  }
  const reading = sourceTokens.map((token) => token.reading).join("");
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(head, { kind: "merge", sources: sourceTokens }),
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    syntheticReason: "tail_parser_noun_phrase_head"
  };
  const entry: MorphemeEntry = {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: virtualToken.pos,
    conjugationType: virtualToken.pos & POS4,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [{ korean: lemma, koreanPos: 명사, irregular: null }],
    synthetic: true,
    syntheticReason: "tail_parser_noun_phrase_head"
  };
  return {
    virtualToken,
    entry,
    consumed,
    stemSourceTokens: sourceTokens,
    stemSourceTokenIndices: sourceTokens.map((_, offset) => baseOffset + range.start + offset),
    ...(numericBase === null
      ? {}
      : { numericBase: parts.length === 0 ? numericBase : { ...numericBase, suffixParts: parts } })
  };
}

async function detectRentaishiPronominalNoHeadStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const span = rentaishiPronominalNoHeadSpanAt(input.tokens, range.start);
  if (span === null || span.endExclusive - 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start]!;
  const headLookup = await input.dictionary.lookupTokenRelaxed(head)
    ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[range.start + 1] ?? null });
  const headEntry = resolveLemmaEntryInContext(headLookup, input, range.start);
  const headCandidate = headEntry === undefined ? undefined : firstTranslationCandidate(headEntry);
  if (headCandidate === undefined) {
    return null;
  }
  const pronominalNoHeadBase: PronominalNoHeadStemBase = {
    prefix: nodaAttributive(
      headCandidate.koreanLemma,
      headCandidate.irregular,
      headCandidate.koreanPos,
      [],
      null,
      { lookups: input.lookups }
    )
  };
  const lemma = pronominalNoHeadStemSurface(pronominalNoHeadBase, { formal: true, fullForm: true });
  if (lemma.length === 0) {
    return null;
  }
  const consumed = span.endExclusive - range.start;
  const sourceTokens = input.tokens.slice(range.start, span.endExclusive);
  const surface = sourceTokens.map((token) => token.surface).join("");
  const reading = sourceTokens.map((token) => token.reading).join("");
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(head, { kind: "merge", sources: sourceTokens }),
    pos: 名詞 | 普通名詞,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    syntheticReason: "tail_parser_rentaishi_pronominal_no_head"
  };
  const entry: MorphemeEntry = {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: virtualToken.pos,
    conjugationType: virtualToken.pos & POS4,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [{ korean: lemma, koreanPos: 명사, irregular: null }],
    synthetic: true,
    syntheticReason: "tail_parser_rentaishi_pronominal_no_head"
  };
  return {
    virtualToken,
    entry,
    consumed,
    stemSourceTokens: sourceTokens,
    stemSourceTokenIndices: sourceTokens.map((_, offset) => baseOffset + range.start + offset),
    pronominalNoHeadBase
  };
}

function detectDemonstrativePropositionHostStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): VirtualCompoundStem | null {
  if (range.end <= range.start || !isDemonstrativePropositionWakeHostStart(input.tokens, range.start, input.lookups)) {
    return null;
  }
  const host = demonstrativePropositionHostAt(input.tokens, range.start, input.lookups);
  if (host === null) {
    return null;
  }
  const [korean, irregular] = host;
  const head = input.tokens[range.start]!;
  const virtualToken: RuntimeHaruToken = {
    ...head,
    pos: 副詞,
    syntheticReason: "tail_parser_demonstrative_proposition_host"
  };
  const entry: MorphemeEntry = {
    surface: head.surface,
    dictionaryForm: head.dictionaryForm,
    reading: head.reading,
    dictionaryFormReading: head.dictionaryFormReading,
    pos: 副詞,
    conjugationType: 0,
    conjugationForm: "*",
    senses: [{ korean, koreanPos: 형용사, irregular }],
    synthetic: true,
    syntheticReason: "tail_parser_demonstrative_proposition_host"
  };
  return {
    virtualToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start],
    propositionHost: true
  };
}

function propositionHostChainBindsWake(root: { readonly tail: TailNode }): boolean {
  const op = firstAuxLayer(root.tail)?.ops[0];
  if (op === undefined) {
    return false;
  }
  return (op.kind === "modal" && op.modal === "wake" && op.variant !== "explanatory") ||
    (op.kind === "idiom" && op.idiom === "wake_impossible") ||
    (op.kind === "scopeBridge" && op.head === "wake");
}
function numericBasePlanFrom(numeral: NumeralPlan | string): NumericBasePayload {
  return typeof numeral === "string"
    ? { kind: "fixedText", text: numeral, koreanPos: 수사 }
    : numeral;
}

function matchedNumericHostReservation(
  input: IntegrationInput,
  absoluteStart: number
): NumericHostSpanReservation | null {
  const reservation = input.numericHostReservation;
  return reservation !== undefined && reservation.tokenIdx === absoluteStart
    ? { consumed: reservation.consumed, plan: reservation.plan }
    : null;
}

function isGaruSuffixToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 接尾辞_動詞的 && token.dictionaryForm === "がる";
}

function isTagaruAuxToken(head: RuntimeHaruToken, token: RuntimeHaruToken): boolean {
  return (head.pos & POS0) === 動詞 &&
    (token.pos & POS0) === 助動詞0 &&
    token.dictionaryForm === "たがる";
}

function buildGaruVirtualToken(
  head: RuntimeHaruToken,
  garu: RuntimeHaruToken,
  dictionarySuffix: "がる" | "たがる"
): RuntimeHaruToken {
  const headReading = head.reading;
  const suffixReading = dictionarySuffix === "たがる" ? "タガル" : "ガル";
  return {
    ...rewriteRuntimeTokenSurface(garu, { kind: "merge", sources: [head, garu] }),
    dictionaryForm: `${head.surface}${dictionarySuffix}`,
    reading: `${headReading}${garu.reading}`,
    dictionaryFormReading: `${headReading}${suffixReading}`,
    pos: 動詞 | ((garu.pos & POS4) !== 0 ? (garu.pos & POS4) : 五段_ラ行) | (garu.pos & POS5),
    syntheticReason: dictionarySuffix === "たがる"
      ? "tail_parser_tagaru_compound_stem"
      : "tail_parser_garu_compound_stem"
  };
}

async function lookupLexicalizedGaruEntry(
  dictionary: DictLookup,
  head: RuntimeHaruToken,
  garu: RuntimeHaruToken,
  virtualToken: RuntimeHaruToken
): Promise<MorphemeEntry | null> {
  if (head.surface.length === 0 || head.reading.length === 0) {
    return null;
  }
  const lookupToken: RuntimeHaruToken = {
    ...virtualToken,
    dictionaryForm: `${head.surface}がる`,
    dictionaryFormReading: `${head.reading}ガル`,
    syntheticReason: "tail_parser_lexicalized_garu_lookup"
  };
  const entry = await dictionary.lookupTokenRelaxed(lookupToken);
  return entry ?? null;
}

function buildSyntheticGaruEntry(
  virtualToken: RuntimeHaruToken,
  senses: readonly MorphemeSense[]
): MorphemeEntry {
  return {
    surface: virtualToken.surface,
    dictionaryForm: virtualToken.dictionaryForm,
    reading: virtualToken.reading,
    dictionaryFormReading: virtualToken.dictionaryFormReading,
    pos: virtualToken.pos,
    conjugationType: (virtualToken.pos & POS4) !== 0 ? (virtualToken.pos & POS4) : 五段_ラ行,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [...senses],
    synthetic: true,
    ...(virtualToken.syntheticReason === undefined ? {} : { syntheticReason: virtualToken.syntheticReason })
  };
}

async function detectVirtualCompoundDictionaryStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  for (const candidate of findCompoundVerbCandidatesAt(input.tokens, range.start, {
    includeSingleSplitA: false,
    includeStreamVv: true,
    includeSahenShiV: true,
    includeNounIntensiveTail: false
  })) {
    if (candidate.consumed <= 1 || range.start + candidate.consumed - 1 > range.end) {
      continue;
    }
    const virtualToken = buildVirtualCompoundToken(candidate) as RuntimeHaruToken;
    const entry = await lookupVirtualCompoundEntry(
      input.dictionary as unknown as MorphemeDictionary,
      virtualToken
    );
    if (entry === null) {
      continue;
    }
    const sourceTokens = input.tokens.slice(range.start, range.start + candidate.consumed);
    return {
      virtualToken,
      entry,
      consumed: candidate.consumed,
      stemSourceTokens: sourceTokens,
      stemSourceTokenIndices: sourceTokens.map((_, idx) => baseOffset + range.start + idx)
    };
  }
  return null;
}

async function detectNominalRenyouPostverbAuxiliaryStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (input.dictionary.lookup === undefined || range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  const tail = input.tokens[range.start + 1];
  if (
    head === undefined ||
    tail === undefined ||
    (head.pos & POS0) !== 名詞 ||
    !isPostverbAuxiliaryToken(tail)
  ) {
    return null;
  }
  const auxiliaries = directNounAttachingPostverbAuxiliaries(tail.dictionaryForm);
  if (
    auxiliaries.length === 0 ||
    !isPostverbAuxiliaryActivationAccepted(tail, input.tokens[range.start + 2])
  ) {
    return null;
  }
  const recovered = await lookupNominalRenyouVerbHead({
    lookupTokenRelaxed: async (token) =>
      await input.dictionary.lookupTokenRelaxed(token as RuntimeHaruToken) ?? null,
    lookup: async (dictionaryForm, reading, pos) =>
      await input.dictionary.lookup!(dictionaryForm, reading, pos)
  }, head);
  if (recovered === null) {
    return null;
  }
  const [entry, verbToken] = recovered;
  if (!auxiliaries.some((auxiliary) => postverbAuxiliaryCanHostRecoveredStem(auxiliary, verbToken, input.lookups))) {
    return null;
  }
  return {
    virtualToken: verbToken as RuntimeHaruToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start]
  };
}

async function detectNominalRenyouMethodYouIdiomStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (input.dictionary.lookup === undefined || range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  if (head === undefined || !isNominalRenyouMethodYouIdiomStart(input.tokens, range.start)) {
    return null;
  }
  const recovered = await lookupNominalRenyouVerbHead({
    lookupTokenRelaxed: async (token) =>
      await input.dictionary.lookupTokenRelaxed(token as RuntimeHaruToken) ?? null,
    lookup: async (dictionaryForm, reading, pos) =>
      await input.dictionary.lookup!(dictionaryForm, reading, pos)
  }, head);
  if (recovered === null) {
    return null;
  }
  const [entry, verbToken] = recovered;
  return {
    virtualToken: verbToken as RuntimeHaruToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start]
  };
}

async function detectSahenPotentialDifficultyStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const head = input.tokens[range.start];
  const potential = input.tokens[range.start + 1];
  const difficulty = input.tokens[range.start + 2];
  if (
    head === undefined ||
    potential === undefined ||
    difficulty === undefined ||
    !isSahenCapableNominal(head) ||
    !postverbAuxiliaryPayloadsForForm(potential.dictionaryForm)
      .some((payload) => payload.kind === "potential" &&
        payload.followingAuxiliaryKind === "difficulty" &&
        postverbAuxiliaryDeclaresHostAttachForm(payload, "sahen_stem")) ||
    !postverbAuxiliaryPayloadsForForm(difficulty.dictionaryForm)
      .some((payload) => payload.kind === "difficulty")
  ) {
    return null;
  }
  const entry = await input.dictionary.lookupTokenRelaxed(head);
  if (entry === undefined) {
    return null;
  }
  return {
    virtualToken: {
      ...head,
      pos: 動詞 | サ行変格 | 連用形_,
      syntheticReason: "sahen_potential_difficulty_hydration"
    },
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start],
    sahenHydration: true
  };
}

function postverbAuxiliaryCanHostRecoveredStem(
  auxiliary: PostverbAuxiliaryPayload,
  token: Pick<RuntimeHaruToken, "dictionaryForm" | "surface">,
  lookups: LookupTables
): boolean {
  const lookupName = auxiliary.hostLookup;
  return lookupName === undefined ||
    postverbAuxiliaryHostLookupMatches(lookupName, token, lookups);
}

function postverbAuxiliaryHostLookupMatches(
  lookupName: string,
  token: Pick<RuntimeHaruToken, "dictionaryForm" | "surface">,
  lookups: LookupTables
): boolean {
  const lookup = lookups.named(lookupName);
  if (lookup === undefined) {
    return false;
  }
  return lookupSetMatches(lookup, token.dictionaryForm) ||
    lookupSetMatches(lookup, token.surface);
}

async function detectDictionaryBackedLexicalSplitStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const maxEnd = Math.min(range.end, range.start + 3);
  for (let end = maxEnd; end > range.start; end -= 1) {
    const sourceTokens = input.tokens.slice(range.start, end + 1);
    if (!isDictionaryBackedLexicalSplitCandidate(sourceTokens)) {
      continue;
    }
    for (const virtualToken of lexicalSplitVirtualTokens(sourceTokens)) {
      const entry = await lookupDictionaryBackedLexicalSplitEntry(input.dictionary, virtualToken);
      if (entry === null) {
        continue;
      }
      return {
        virtualToken,
        entry,
        consumed: sourceTokens.length,
        stemSourceTokens: sourceTokens,
        stemSourceTokenIndices: sourceTokens.map((_, idx) => baseOffset + range.start + idx)
      };
    }
  }
  return null;
}

function isDictionaryBackedLexicalSplitCandidate(tokens: readonly RuntimeHaruToken[]): boolean {
  if (tokens.length < 2) {
    return false;
  }
  const last = tokens[tokens.length - 1];
  if (last === undefined || !pos0in(last.pos, INFLECTABLE_BITS)) {
    return false;
  }
  if (!tokens.slice(1, -1).some((token) => (token.pos & POS0) === 助動詞0)) {
    return false;
  }
  return tokens.every((token) =>
    token.surface.length > 0 &&
    /^[\u3040-\u309f]+$/u.test(token.surface) &&
    (token.pos & POS0) !== 助詞 &&
    (token.pos & POS0) !== 補助記号
  );
}

function lexicalSplitVirtualTokens(tokens: readonly RuntimeHaruToken[]): readonly RuntimeHaruToken[] {
  const last = tokens[tokens.length - 1]!;
  const surface = tokens.map((token) => token.surface).join("");
  const reading = tokens.map((token) => token.reading).join("");
  const candidates = lexicalSplitDictionaryFormCandidates(surface, reading);
  const merged = rewriteRuntimeTokenSurface(last, { kind: "merge", sources: tokens });
  return candidates.map(({ dictionaryForm, dictionaryFormReading }) => ({
    ...merged,
    dictionaryForm,
    dictionaryFormReading,
    reading,
    pos: 動詞 | (last.pos & POS4) | (last.pos & POS5),
    syntheticReason: "tail_parser_dictionary_backed_lexical_split",
    splitB: tokens
  }));
}

function lexicalSplitDictionaryFormCandidates(
  surface: string,
  reading: string
): readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[] {
  const candidates: { dictionaryForm: string; dictionaryFormReading: string }[] = [{
    dictionaryForm: surface,
    dictionaryFormReading: reading
  }];
  if (surface.endsWith("へ") && reading.endsWith("ヘ")) {
    candidates.push({
      dictionaryForm: `${surface.slice(0, -"へ".length)}ふ`,
      dictionaryFormReading: `${reading.slice(0, -"ヘ".length)}フ`
    });
  }
  return dedupeLexicalSplitCandidates(candidates);
}

function dedupeLexicalSplitCandidates(
  candidates: readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[]
): readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.dictionaryForm}\u0000${candidate.dictionaryFormReading}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function lookupDictionaryBackedLexicalSplitEntry(
  dictionary: DictLookup,
  virtualToken: RuntimeHaruToken
): Promise<MorphemeEntry | null> {
  const entry = await dictionary.lookup?.(
    virtualToken.dictionaryForm,
    virtualToken.dictionaryFormReading,
    virtualToken.pos
  );
  return entry === undefined ? null : entry;
}

async function detectContractedGodanCausativePassiveStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number }
): Promise<ContractedCausativePassiveStem | null> {
  if (range.start + 1 > range.end) {
    return null;
  }
  const token = input.tokens[range.start];
  const passive = input.tokens[range.start + 1];
  if (token === undefined || passive === undefined) {
    return null;
  }
  if (!isContractedGodanCausativeStemToken(token) || !isRareruAuxToken(passive)) {
    return null;
  }

  const originalEntry = await input.dictionary.lookupTokenRelaxed(token);
  if (originalEntry !== undefined) {
    return null;
  }

  const base = contractedGodanCausativeBase(token);
  if (base === null) {
    return null;
  }
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "remove_suffix", suffix: "さ" }),
    dictionaryForm: base.dictionaryForm,
    reading: base.reading,
    dictionaryFormReading: base.dictionaryFormReading,
    pos: 動詞 | (token.pos & POS1) | (POS4_OF_NAME[base.conjugationType] ?? 0) | 未然形_一般,
    syntheticReason: "tail_parser_contracted_godan_causative_passive_stem",
    splitB: [token]
  };
  const entry = await input.dictionary.lookupTokenRelaxed(virtualToken);
  if (entry === undefined) {
    return null;
  }

  const causativeToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: "させ" }),
    dictionaryForm: "させる",
    reading: "サセ",
    dictionaryFormReading: "サセル",
    pos: 助動詞0 | 下一段_サ行 | 未然形_一般,
    syntheticReason: "tail_parser_contracted_godan_causative_passive_aux",
    splitB: [token]
  };
  return {
    virtualToken,
    entry,
    causativeToken
  };
}

function isContractedGodanCausativeStemToken(token: RuntimeHaruToken): boolean {
  const form5A = token.pos & POS5A;
  return (token.pos & POS0) === 動詞 &&
    form5A === 未然形_ &&
    token.surface.endsWith("さ") &&
    token.reading.endsWith("サ") &&
    token.dictionaryForm.endsWith("す");
}

function isRareruAuxToken(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_レル);
}

function contractedGodanCausativeBase(token: RuntimeHaruToken): {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading: string;
  readonly dictionaryFormReading: string;
  readonly conjugationType: string;
} | null {
  const surfaceStem = token.surface.slice(0, -"さ".length);
  const readingStem = token.reading.slice(0, -"サ".length);
  const surfaceEnding = godanMizenEndingToDictionaryEnding(surfaceStem.at(-1));
  const readingEnding = godanMizenEndingToDictionaryEnding(readingStem.at(-1));
  if (surfaceEnding === null || readingEnding === null) {
    return null;
  }
  return {
    surface: surfaceStem,
    dictionaryForm: `${surfaceStem.slice(0, -surfaceEnding.source.length)}${surfaceEnding.target}`,
    reading: readingStem,
    dictionaryFormReading: `${readingStem.slice(0, -readingEnding.source.length)}${readingEnding.target}`,
    conjugationType: surfaceEnding.conjugationType
  };
}

function godanMizenEndingToDictionaryEnding(char: string | undefined): {
  readonly source: string;
  readonly target: string;
  readonly conjugationType: string;
} | null {
  switch (char) {
    case "わ": return { source: "わ", target: "う", conjugationType: "五段-ワア行" };
    case "ワ": return { source: "ワ", target: "ウ", conjugationType: "五段-ワア行" };
    case "か": return { source: "か", target: "く", conjugationType: "五段-カ行" };
    case "カ": return { source: "カ", target: "ク", conjugationType: "五段-カ行" };
    case "が": return { source: "が", target: "ぐ", conjugationType: "五段-ガ行" };
    case "ガ": return { source: "ガ", target: "グ", conjugationType: "五段-ガ行" };
    case "さ": return { source: "さ", target: "す", conjugationType: "五段-サ行" };
    case "サ": return { source: "サ", target: "ス", conjugationType: "五段-サ行" };
    case "た": return { source: "た", target: "つ", conjugationType: "五段-タ行" };
    case "タ": return { source: "タ", target: "ツ", conjugationType: "五段-タ行" };
    case "な": return { source: "な", target: "ぬ", conjugationType: "五段-ナ行" };
    case "ナ": return { source: "ナ", target: "ヌ", conjugationType: "五段-ナ行" };
    case "ば": return { source: "ば", target: "ぶ", conjugationType: "五段-バ行" };
    case "バ": return { source: "バ", target: "ブ", conjugationType: "五段-バ行" };
    case "ま": return { source: "ま", target: "む", conjugationType: "五段-マ行" };
    case "マ": return { source: "マ", target: "ム", conjugationType: "五段-マ行" };
    case "ら": return { source: "ら", target: "る", conjugationType: "五段-ラ行" };
    case "ラ": return { source: "ラ", target: "ル", conjugationType: "五段-ラ行" };
    default: return null;
  }
}

function godanDictionaryFormToMizenStem(form: string | undefined): string | null {
  if (form === undefined || form.length === 0) {
    return null;
  }
  const ending = form.at(-1);
  let mizen: string;
  switch (ending) {
    case "う": mizen = "わ"; break;
    case "ウ": mizen = "ワ"; break;
    case "く": mizen = "か"; break;
    case "ク": mizen = "カ"; break;
    case "ぐ": mizen = "が"; break;
    case "グ": mizen = "ガ"; break;
    case "す": mizen = "さ"; break;
    case "ス": mizen = "サ"; break;
    case "つ": mizen = "た"; break;
    case "ツ": mizen = "タ"; break;
    case "ぬ": mizen = "な"; break;
    case "ヌ": mizen = "ナ"; break;
    case "ぶ": mizen = "ば"; break;
    case "ブ": mizen = "バ"; break;
    case "む": mizen = "ま"; break;
    case "ム": mizen = "マ"; break;
    case "る": mizen = "ら"; break;
    case "ル": mizen = "ラ"; break;
    default: return null;
  }
  return `${form.slice(0, -1)}${mizen}`;
}

async function parseSingleClause(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number,
  options: {
    readonly allowElidedColloquialObligation?: boolean | ElidedColloquialObligationContext;
    readonly allowRenyouChuushiTerminal?: boolean;
    readonly renyouChuushiTerminalRole?: TeFormConnectiveRole;
    readonly allowMalformedConditionalFragmentTerminal?: boolean;
    readonly allowPlainNominalizerTerminal?: boolean;
    readonly allowElidedDewaNegativeBody?: ElidedDewaNegativeBodyClosure;
    readonly allowElidedNominalizerTerminal?: boolean;
    readonly allowZeroNiPurposeTerminal?: boolean;
    readonly allowAdnominalCopulaTerminal?: boolean;
    readonly allowExplicitAdnominalNoTerminal?: boolean;
    readonly allowRenyouCompoundPrenominalTerminal?: boolean;
    readonly allowAdverbialModifierTerminal?: AdverbialModifierMarker;
    readonly allowNoQuoteReportingProjection?: boolean;
    readonly outgoingBoundary?: ClauseBoundary;
    readonly attributiveBoundaryPayload?: AttributiveBoundaryPayload;
    readonly contextTokens?: readonly RuntimeHaruToken[];
    readonly contextPos?: number;
    readonly suppressFormalToSuruControl?: boolean;
    readonly quotedNominalHost?: boolean;
  } = {}
): Promise<ClauseParseResult> {
  const originalStemToken = input.tokens[range.start];
  if (originalStemToken === undefined) {
    return { ok: false, reason: "stem token undefined" };
  }
  const garuCompoundStem = await detectGaruSyntheticStem(input, range, baseOffset);
  const virtualCompoundStem = garuCompoundStem ??
    detectDemonstrativePropositionHostStem(input, range, baseOffset) ??
    await detectRentaishiPronominalNoHeadStem(input, range, baseOffset) ??
    await detectNounPhraseHeadStem(input, range, baseOffset, options.outgoingBoundary, options.contextTokens) ??
    await detectVirtualCompoundDictionaryStem(input, range, baseOffset) ??
    await detectSahenPotentialDifficultyStem(input, range, baseOffset) ??
    await detectNominalRenyouPostverbAuxiliaryStem(input, range, baseOffset) ??
    await detectNominalRenyouMethodYouIdiomStem(input, range, baseOffset) ??
    await detectDictionaryBackedLexicalSplitStem(input, range, baseOffset);
  const contractedCausativePassiveStem = virtualCompoundStem === null
    ? await detectContractedGodanCausativePassiveStem(input, range)
    : null;
  const contractedNegativeNStem = virtualCompoundStem === null && contractedCausativePassiveStem === null
    ? detectContractedNegativeNStem(input.tokens, range.start, baseOffset)
    : null;
  const splitSuppletiveStem = virtualCompoundStem === null && contractedCausativePassiveStem === null && contractedNegativeNStem === null
    ? detectSplitSuppletiveNegativeStem(input.tokens, range.start, baseOffset)
    : null;
  const stemToken =
    virtualCompoundStem?.virtualToken ??
    contractedCausativePassiveStem?.virtualToken ??
    contractedNegativeNStem?.virtualToken ??
    splitSuppletiveStem?.virtualToken ??
    originalStemToken;
  const stemPos0 = stemToken.pos & POS0;
  const stemSourceHost: ParseSliceSourceHost = {
    cursor: new TokenCursor(
      options.contextTokens ?? input.tokens,
      0,
      (options.contextTokens ?? input.tokens).length,
      options.contextPos ?? range.start
    ),
    start: options.contextPos ?? range.start
  };
  if (
    stemPos0 !== 動詞 &&
    stemPos0 !== 形容詞0 &&
    stemPos0 !== 形状詞 &&
    stemPos0 !== 名詞 &&
    stemPos0 !== 代名詞 &&
    virtualCompoundStem?.propositionHost !== true &&
    !(stemPos0 === 副詞 && adverbHostStartsTailChunk(input.tokens, range.start, input.numeric, input.lookups, stemSourceHost))
  ) {
    return { ok: false, reason: "stem pos[0] not in subset (動詞/形容詞/形状詞/名詞/代名詞/조건부 副詞 — adverbHostStartsTailChunk)" };
  }

  const rawEntry = virtualCompoundStem?.entry ??
    contractedCausativePassiveStem?.entry ??
    await input.dictionary.lookupTokenRelaxed(stemToken) ??
    await input.synthesizeEntry?.(stemToken, { nextToken: input.tokens[range.start + 1] ?? null });
  if (rawEntry === undefined) {
    return { ok: false, reason: "no dictionary entry for stem" };
  }
  const stemKind: "verb" | "adj" | "noun" =
    virtualCompoundStem?.propositionHost === true
      ? "adj"
      : stemKindForTailParserSource(input.tokens, range.start, stemPos0, input.numeric, input.lookups, stemSourceHost);
  const sahenStartCandidate = stemKind === "noun" || stemKind === "verb"
    ? detectSahenPredicateStart(input.tokens, range.start, {
      tokens: options.contextTokens ?? input.tokens,
      idx: options.contextPos ?? range.start
    })
    : null;
  const sahenStart = sahenStartCandidate !== null &&
    (sahenStartCandidate.hostKind === "nominal") === (stemKind === "noun")
    ? sahenStartCandidate
    : null;
  const sahenSliceOffset = sahenStart !== null ? 1 : 0;
  const stemConsumedTokens = virtualCompoundStem?.consumed ?? 1;
  const followingAuxIndex = range.start + stemConsumedTokens;
  const inflectingAuxHost =
    contractedCausativePassiveStem !== null ||
    contractedNegativeNStem !== null ||
    splitSuppletiveStem !== null ||
    (followingAuxIndex <= range.end &&
      tokenHostsInflectingPredicateAuxiliary(input.tokens[followingAuxIndex]));
  const nominalTargetPredicateContext = inflectingAuxHost ||
    (followingAuxIndex <= range.end &&
      tokenOpensPredicateConnectiveHost(input.tokens[followingAuxIndex]));
  const entry = await tailParserStemEntry(
    input.dictionary,
    stemToken,
    rawEntry,
    stemKind,
    inflectingAuxHost,
    nominalTargetPredicateContext
  );
  const baseContextTokens = options.contextTokens ?? input.tokens;
  const baseContextPos = options.contextPos ?? range.start;
  const contextTokens = virtualCompoundStem !== null
    ? [
      ...baseContextTokens.slice(0, baseContextPos),
      virtualCompoundStem.virtualToken,
      ...baseContextTokens.slice(baseContextPos + virtualCompoundStem.consumed)
    ]
    : contractedCausativePassiveStem !== null
      ? [
        ...baseContextTokens.slice(0, baseContextPos),
        contractedCausativePassiveStem.virtualToken,
        contractedCausativePassiveStem.causativeToken,
        ...baseContextTokens.slice(baseContextPos + 1)
      ]
      : contractedNegativeNStem !== null
        ? [
          ...baseContextTokens.slice(0, baseContextPos),
          contractedNegativeNStem.virtualToken,
          contractedNegativeNStem.negativeToken,
          ...baseContextTokens.slice(baseContextPos + 1)
        ]
        : splitSuppletiveStem === null
          ? baseContextTokens
          : input.tokens;
  const contextPos = virtualCompoundStem !== null
    ? baseContextPos
    : contractedCausativePassiveStem !== null
      ? baseContextPos
      : contractedNegativeNStem !== null
        ? baseContextPos
        : splitSuppletiveStem === null
          ? baseContextPos
          : range.start;
  const initialHeadHypothesisSource: OpSource = {
    tokens: [stemToken],
    tokenIndices: [baseOffset + range.start]
  };
  const initialHeadHypothesisCapabilities = headSourceCapabilityVector(stemToken);
  const sourceUsesSahenProjection = sahenSliceOffset === 1 || virtualCompoundStem?.sahenHydration === true;
  const headHypothesisCapabilities =
    !sourceUsesSahenProjection || initialHeadHypothesisCapabilities.sahenVerbalizationCapable
      ? initialHeadHypothesisCapabilities
      : { ...initialHeadHypothesisCapabilities, sahenVerbalizationCapable: true };
  const sourcePredicateShape = sourcePredicateShapeForCapabilities(
    headHypothesisCapabilities,
    sourceUsesSahenProjection
  );
  const senses = selectTailParserStemSenses(entry, contextTokens, contextPos, stemKind, input, {
    adverbialModifierContext: options.allowAdverbialModifierTerminal !== undefined
  });
  if (senses === null || senses.length === 0) {
    return {
      ok: false,
      reason: "dictionary entry has no senses",
      headHypothesis: buildHeadHypothesisCarrier({
        sourceStemKind: stemKind,
        admittedStemKind: stemKind,
        source: initialHeadHypothesisSource,
        sourceCapabilities: headHypothesisCapabilities,
        originalCandidateCount: 0,
        candidates: []
      })
    };
  }
  const adverbialSurfacePostverbKind =
    sourceAdverbialSurfacePostverbKind(input.tokens, range.start);
  const adverbialSurfaceBridgeActive =
    adverbialSurfacePostverbKind !== null &&
    adverbialSurfaceCandidateSetCanBridge(senses, adverbialSurfacePostverbKind);
  const tailSenses: TailParserStemSense[] = [];
  const allowInternalObjectMarkerPrefix =
    virtualCompoundStem !== null ||
    rangeHasMonoNoConcessiveConnective(input.cursor, range) ||
    (options.outgoingBoundary?.kind !== "terminal" &&
      options.outgoingBoundary?.connectiveKind === "concession" &&
      options.outgoingBoundary.surface === "ものの");

  const incompatibleTranslationReasons: string[] = [];
  const headHypothesisCandidates: HeadHypothesisCandidate[] = [];
  const conjForVerb = stemKind === "verb"
    ? mapConjType(entry.conjugationType ?? 0)
    : undefined;
  const usesSahenProjection = sourceUsesSahenProjection;
  const sahenProjectionSourceSurface = usesSahenProjection
    ? input.tokens[range.start]?.dictionaryForm ?? input.tokens[range.start]?.surface ?? ""
    : "";
  const sahenProjectionOptions = usesSahenProjection
    ? {
      followingAgentiveAux: sahenPredicateHasFollowingAgentiveAux(
        input.tokens,
        range.start + sahenSliceOffset,
        input.lookups
      )
    }
    : {};
  const allocateHeadProjectionOrdinal = tailParserProjectionOrdinalAllocator(senses, entry);
  const adverbialModifierActive =
    stemKind === "noun" && options.allowAdverbialModifierTerminal !== undefined;
  for (const [candidateIndex, t] of senses.entries()) {
    const candidateStemKind = tailParserStemKindForTranslation(t, stemKind);
    const preservedCandidate = stemCandidateFromTranslation(t, stemKind, conjForVerb, { entry });
    const projectedTranslationBase = t;
    const projectedTranslation = projectKotodakaraReasonScopeStemTranslation(
      projectedTranslationBase,
      stemToken,
      input.tokens,
      range.start,
      stemKind
    );
    const normalizedStem = normalizeTailParserStemKorean(projectedTranslation.korean, candidateStemKind, {
      allowInternalObjectMarkerPrefix,
      allowLexicalNegativePrefix: projectedTranslation.dropFirstNegativeAux === true
    });
    const projectedPreservedCandidate = stemCandidateFromTranslation(projectedTranslation, stemKind, conjForVerb, { entry });
    if (normalizedStem === null) {
      const reason = `multi-word lemma '${projectedTranslation.korean}' — out of subset`;
      incompatibleTranslationReasons.push(reason);
      headHypothesisCandidates.push(headHypothesisCandidateFromTranslation(projectedTranslation, candidateIndex, {
        sourceStemKind: stemKind,
        sourceCapabilities: headHypothesisCapabilities,
        status: "dropped",
        stage: "lemma_normalization",
        projectedStemKind: candidateStemKind,
        preservedCandidate: projectedPreservedCandidate,
        reason
      }));
      continue;
    }
    const admittedTranslation = {
      ...projectedTranslation,
      korean: normalizedStem.korean,
      ...(normalizedStem.koreanPrefix === undefined
        ? {}
        : { koreanPrefix: `${projectedTranslation.koreanPrefix ?? ""}${normalizedStem.koreanPrefix}` })
    };
    tailSenses.push(admittedTranslation);
    if (usesSahenProjection) {
      for (const projection of sahenStemProjectionCandidates(
        admittedTranslation,
        sahenProjectionSourceSurface,
        input.lookups,
        () => allocateHeadProjectionOrdinal(
          stemCandidateProvenanceForTranslation(
            admittedTranslation,
            derivationForSense(admittedTranslation, entry)
          )
        ),
        sahenProjectionOptions
      )) {
        const preservedCandidate = stemCandidateFromTranslation(admittedTranslation, "noun", undefined, { ...projection, entry });
        headHypothesisCandidates.push(headHypothesisCandidateFromTranslation(admittedTranslation, headHypothesisCandidates.length, {
          sourceStemKind: stemKind,
          sourceCapabilities: headHypothesisCapabilities,
          status: "admitted",
          stage: "lemma_normalization",
          lemma: preservedCandidate.lemma,
          projectedStemKind: projection.stemKind ?? tailParserStemKindForTranslation(admittedTranslation, stemKind),
          preservedCandidate,
          adverbialModifierContext: options.allowAdverbialModifierTerminal !== undefined,
          adverbialSurfaceBridgeContext: adverbialSurfacePostverbKind !== null,
          adverbialSurfaceBridgeAllowed: adverbialSurfaceBridgeActive
        }));
      }
    } else {
      headHypothesisCandidates.push(headHypothesisCandidateFromTranslation(projectedTranslation, candidateIndex, {
        sourceStemKind: stemKind,
        sourceCapabilities: headHypothesisCapabilities,
        status: "admitted",
        stage: "lemma_normalization",
        lemma: normalizedStem.korean,
        projectedStemKind: candidateStemKind,
        preservedCandidate: stemCandidateFromTranslation(admittedTranslation, stemKind, conjForVerb, { entry }),
        adverbialModifierContext: options.allowAdverbialModifierTerminal !== undefined,
        adverbialSurfaceBridgeContext: adverbialSurfacePostverbKind !== null,
        adverbialSurfaceBridgeAllowed: adverbialSurfaceBridgeActive
      }));
    }
  }
  if (tailSenses.length === 0) {
    return {
      ok: false,
      reason: incompatibleTranslationReasons[0] ?? "no compatible tail-parser stem senses",
      headHypothesis: buildHeadHypothesisCarrier({
        sourceStemKind: stemKind,
        admittedStemKind: stemKind,
        source: initialHeadHypothesisSource,
        sourceCapabilities: headHypothesisCapabilities,
        originalCandidateCount: senses.length,
        candidates: headHypothesisCandidates
      })
    };
  }
  const currentWinnerIndex = headHypothesisCandidates.find((candidate) => candidate.status === "admitted")?.index;
  const intakeHeadHypothesis = buildHeadHypothesisCarrier({
    sourceStemKind: stemKind,
    admittedStemKind: stemKind,
    source: initialHeadHypothesisSource,
    sourceCapabilities: headHypothesisCapabilities,
    originalCandidateCount: senses.length,
    candidates: headHypothesisCandidates,
    ...(currentWinnerIndex === undefined ? {} : { currentWinnerIndex })
  });
  if (!headHypothesisCandidates.some(candidateHasAdmittedHeadCapability)) {
    return {
      ok: false,
      reason: "admitted dictionary candidates expose no carrier head capability",
      headHypothesis: intakeHeadHypothesis
    };
  }
  const trans = tailSenses[0]!;

  if (
    stemKind !== "noun" &&
    stemPos0 !== 形状詞 &&
    stemPos0 !== 副詞 &&
    !sourceHasFormalToStateResultCarrier(input.tokens, range.start)
  ) {
    const stemPos5A = stemToken.pos & POS5A;
    if (stemPos5A !== 0 && !isStemFormInSubset(stemPos5A, input.tokens, range.start)) {
      return {
        ok: false,
        reason: `stem form '${stemPos5A}' — out of subset`,
        headHypothesis: intakeHeadHypothesis
      };
    }
  }

  let stem: StemInput;
  if (usesSahenProjection) {
    const sahenNounToken = input.tokens[range.start];
    const sahenNounSurface = sahenNounToken?.dictionaryForm ?? sahenNounToken?.surface ?? "";
    const allocateStemProjectionOrdinal = tailParserProjectionOrdinalAllocator(senses, entry);
    const candidates = tailSenses.flatMap(t =>
      sahenStemProjectionCandidates(
        t,
        sahenNounSurface,
        input.lookups,
        () => allocateStemProjectionOrdinal(
          stemCandidateProvenanceForTranslation(t, derivationForSense(t, entry))
        ),
        {
          followingAgentiveAux: sahenPredicateHasFollowingAgentiveAux(
            input.tokens,
            range.start + Math.max(1, sahenSliceOffset),
            input.lookups
          )
        }
      )
        .map(projection => stemCandidateFromTranslation(t, "noun", undefined, { ...projection, entry }))
    );
    stem = candidates.length === 1 && !stemCandidateNeedsDeferredCommit(candidates[0]!)
      ? stemInputFromCandidate(candidates[0]!, "verb")
      : { kind: "candidateSet", candidates };
  } else if (stemKind === "noun") {
    const containsPredicateCandidate = tailSenses.some(t =>
      tailParserStemKindForTranslation(t, stemKind) !== "noun"
    );
    const adverbialCandidateSetContext =
      adverbialSurfaceBridgeActive || options.allowAdverbialModifierTerminal !== undefined;
    const requiresAdverbialCommitSelection =
      adverbialCandidateSetContext &&
      tailSenses.some(t => t.koreanPos === 부사);
    const singleCandidate = tailSenses.length === 1
      ? stemCandidateFromTranslation(trans, "noun", undefined, { entry })
      : null;
    stem = singleCandidate !== null &&
      !requiresAdverbialCommitSelection &&
      !stemTranslationNeedsCommitSelection(trans, stemKind) &&
      !containsPredicateCandidate &&
      !stemCandidateNeedsDeferredCommit(singleCandidate)
      ? {
        kind: "noun",
        lemma: trans.korean,
        ...nounStemInterjectionForCandidate(singleCandidate),
        ...(trans.koreanPrefix === undefined ? {} : { koreanPrefix: trans.koreanPrefix }),
        ...(trans.koreanSuffix === undefined ? {} : { koreanSuffix: trans.koreanSuffix })
      }
      : {
        kind: "candidateSet",
        candidates: tailSenses.map(t => stemCandidateFromTranslation(t, "noun", undefined, { entry }))
      };
  } else if (tailSenses.length === 1 && !stemTranslationNeedsCommitSelection(trans, stemKind)) {
    const singleCandidate = stemCandidateFromTranslation(trans, stemKind, conjForVerb, { entry });
    stem = !stemCandidateNeedsDeferredCommit(singleCandidate)
      ? stemInputFromCandidate(singleCandidate, stemKind)
      : { kind: "candidateSet", candidates: [singleCandidate] };
  } else {
    stem = {
      kind: "candidateSet",
      candidates: tailSenses.map(t => stemCandidateFromTranslation(t, stemKind, conjForVerb, { entry }))
    };
  }

  const suppletiveFirstNegIdx = splitSuppletiveStem?.firstNegIdx ?? (range.start + 1);
  const suppletiveBase = suppletiveBaseStemForMaterialization(stem, tailSenses, stemKind, conjForVerb);
  const suppletiveMaterialization = sahenSliceOffset === 0 && suppletiveBase !== null
    ? materializeSuppletiveNegationStem(
      input.tokens,
      suppletiveFirstNegIdx,
      suppletiveBase.stem,
      suppletiveBase.korean,
      input.lookups
    )
    : null;
  if (suppletiveMaterialization !== null) {
    stem = suppletiveMaterialization.stem;
  }
  stem = confineNominalTargetMarkToAdjectivalSource(
    { ...stem, sourcePredicateShape },
    sourcePredicateShape
  );
  if (virtualCompoundStem?.numericBase !== undefined && stem.kind === "noun") {
    stem = { ...stem, numericBase: virtualCompoundStem.numericBase };
  }
  if (virtualCompoundStem?.pronominalNoHeadBase !== undefined && stem.kind === "noun") {
    stem = { ...stem, pronominalNoHeadBase: virtualCompoundStem.pronominalNoHeadBase };
  }
  const effectiveSliceOffset = suppletiveMaterialization?.sliceOffset ?? sahenSliceOffset;
  const suppletivePoliteNegative = suppletiveMaterialization?.politeNegative;
  const virtualTailStart = virtualCompoundStem === null
    ? null
    : range.start + virtualCompoundStem.consumed;
  const splitTailStart = splitSuppletiveStem === null
    ? null
    : splitSuppletiveStem.firstNegIdx + effectiveSliceOffset;
  const parseSlice = virtualCompoundStem !== null
    ? [virtualCompoundStem.virtualToken, ...input.tokens.slice(virtualTailStart!, range.end + 1)]
    : contractedCausativePassiveStem !== null
      ? [
        contractedCausativePassiveStem.virtualToken,
        contractedCausativePassiveStem.causativeToken,
        ...input.tokens.slice(range.start + 1, range.end + 1)
      ]
      : contractedNegativeNStem !== null
        ? [
          contractedNegativeNStem.virtualToken,
          contractedNegativeNStem.negativeToken,
          ...input.tokens.slice(range.start + 1, range.end + 1)
        ]
        : splitSuppletiveStem === null
          ? suppletivePoliteNegative !== undefined
            ? [
              originalStemToken,
              input.tokens[suppletivePoliteNegative.politeIdx]!,
              ...input.tokens.slice(suppletivePoliteNegative.negIdx + 1, range.end + 1)
            ]
            : input.tokens.slice(range.start + effectiveSliceOffset, range.end + 1)
          : [splitSuppletiveStem.virtualToken, ...input.tokens.slice(splitTailStart!, range.end + 1)];

  for (const t of senses) {
    if (t.koreanHonorific !== undefined) {
      return {
        ok: false,
        reason: "translation has honorific lemma frame — out of subset",
        headHypothesis: intakeHeadHypothesis
      };
    }
  }
  const isSahen = sahenSliceOffset === 1;
  const suppletiveUsesOriginalStemToken =
    suppletiveMaterialization !== null && effectiveSliceOffset === 0 && splitSuppletiveStem === null;
  const splitStemSource: OpSource | undefined = splitSuppletiveStem === null
    ? undefined
    : {
      tokens: [
        ...splitSuppletiveStem.stemSourceTokens,
        ...(effectiveSliceOffset > 0 ? [input.tokens[splitSuppletiveStem.firstNegIdx]!] : [])
      ],
      tokenIndices: [
        ...splitSuppletiveStem.stemSourceTokenIndices,
        ...(effectiveSliceOffset > 0 ? [baseOffset + splitSuppletiveStem.firstNegIdx] : [])
      ]
    };
  const contractedNegativeStemSource: OpSource | undefined = contractedNegativeNStem === null
    ? undefined
    : {
      tokens: contractedNegativeNStem.stemSourceTokens,
      tokenIndices: contractedNegativeNStem.stemSourceTokenIndices
    };
  const virtualCompoundStemSource: OpSource | undefined = virtualCompoundStem === null
    ? undefined
    : {
      tokens: virtualCompoundStem.stemSourceTokens,
      tokenIndices: virtualCompoundStem.stemSourceTokenIndices
    };
  const suppletivePoliteNegativeStemSource: OpSource | undefined =
    suppletivePoliteNegative === undefined
      ? undefined
      : {
        tokens: [originalStemToken, input.tokens[suppletivePoliteNegative.negIdx]!],
        tokenIndices: [baseOffset + range.start, baseOffset + suppletivePoliteNegative.negIdx]
      };
  const virtualCompoundSourceIndexMap = virtualCompoundStem === null
    ? undefined
    : [
      baseOffset + range.start,
      ...input.tokens
        .slice(virtualTailStart!, range.end + 1)
        .map((_, idx) => baseOffset + virtualTailStart! + idx)
    ];
  const contractedCausativePassiveSourceIndexMap = contractedCausativePassiveStem === null
    ? undefined
    : [
      baseOffset + range.start,
      baseOffset + range.start,
      ...input.tokens
        .slice(range.start + 1, range.end + 1)
        .map((_, idx) => baseOffset + range.start + 1 + idx)
    ];
  const contractedNegativeNSourceIndexMap = contractedNegativeNStem === null
    ? undefined
    : [
      baseOffset + range.start,
      baseOffset + range.start,
      ...input.tokens
        .slice(range.start + 1, range.end + 1)
        .map((_, idx) => baseOffset + range.start + 1 + idx)
    ];
  const splitSourceIndexMap = splitSuppletiveStem === null
    ? undefined
    : [
      baseOffset + range.start,
      ...input.tokens
        .slice(splitTailStart!, range.end + 1)
        .map((_, idx) => baseOffset + splitTailStart! + idx)
    ];
  const suppletivePoliteNegativeSourceIndexMap =
    suppletivePoliteNegative === undefined
      ? undefined
      : [
        baseOffset + range.start,
        baseOffset + suppletivePoliteNegative.politeIdx,
        ...input.tokens
          .slice(suppletivePoliteNegative.negIdx + 1, range.end + 1)
          .map((_, idx) => baseOffset + suppletivePoliteNegative.negIdx + 1 + idx)
      ];
  const sourceIndexMap =
    virtualCompoundSourceIndexMap ??
    contractedCausativePassiveSourceIndexMap ??
    contractedNegativeNSourceIndexMap ??
    splitSourceIndexMap ??
    suppletivePoliteNegativeSourceIndexMap;
  const parseSliceInput = expandFusedDashiCopulaListingParseSlice(
    parseSlice,
    sourceIndexMap,
    parseSlice.map((_, idx) => baseOffset + range.start + effectiveSliceOffset + idx)
  );
  const stemSourceOverride =
    virtualCompoundStemSource ??
    contractedNegativeStemSource ??
    splitStemSource ??
    suppletivePoliteNegativeStemSource;
  const prependSource = virtualCompoundStem !== null
    ? undefined
    : suppletiveMaterialization !== null && !suppletiveUsesOriginalStemToken && splitSuppletiveStem === null
      ? {
        tokens: [originalStemToken],
        tokenIndices: [baseOffset + range.start]
      }
      : isSahen
        ? {
          tokens: [originalStemToken],
          tokenIndices: [baseOffset + range.start]
        }
        : undefined;
  const conjugationAnchor = virtualCompoundStemSource !== undefined
    ? virtualCompoundStemSource.tokens.length - 1
    : contractedNegativeStemSource !== undefined
      ? 0
      : splitStemSource !== undefined
        ? splitStemSource.tokens.length - 1
        : suppletivePoliteNegativeStemSource !== undefined
          ? 0
          : suppletiveMaterialization !== null && !suppletiveUsesOriginalStemToken
            ? 1
            : isSahen ? 1 : undefined;
  const semanticAnchors = virtualCompoundStemSource !== undefined
    ? Array.from({ length: virtualCompoundStemSource.tokens.length }, (_, idx) => idx)
    : contractedNegativeStemSource !== undefined
      ? [0] as const
      : splitStemSource !== undefined
        ? Array.from({ length: splitSuppletiveStem!.stemSourceTokens.length }, (_, idx) => idx)
        : suppletivePoliteNegativeStemSource !== undefined
          ? [0, 1] as const
          : suppletiveMaterialization !== null && !suppletiveUsesOriginalStemToken
            ? [0] as const
            : isSahen ? [0] as const : undefined;
  const headHypothesis = buildHeadHypothesisCarrier({
    sourceStemKind: stemKind,
    admittedStemKind: usesSahenProjection
      ? "verb"
      : stem.kind === "candidateSet"
        ? stemKind
        : stem.kind,
    source: stemSourceOverride ?? prependSource ?? initialHeadHypothesisSource,
    sourceCapabilities: headHypothesisCapabilities,
    originalCandidateCount: senses.length,
    candidates: headHypothesisCandidates,
    ...(currentWinnerIndex === undefined ? {} : { currentWinnerIndex })
  });
  const outgoingBoundaryHint = parseOutgoingBoundaryHint(options.outgoingBoundary);
  const quoteAttributiveHeadFrame = quoteAttributiveHeadFrameForBoundary(
    options.attributiveBoundaryPayload ?? outgoingBoundaryHint?.attributiveBoundary,
    input.lookups
  );
  const parsed = parseTail({
    tokens: parseSliceInput.tokens,
    start: 0,
    stem,
    headHypothesis,
    lookups: input.lookups,
    allowElidedColloquialObligation: options.allowElidedColloquialObligation ?? true,
    allowRenyouChuushiTerminal: options.allowRenyouChuushiTerminal === true,
    ...(options.renyouChuushiTerminalRole === undefined ? {} : { renyouChuushiTerminalRole: options.renyouChuushiTerminalRole }),
    allowMalformedConditionalFragmentTerminal: options.allowMalformedConditionalFragmentTerminal === true,
    allowPlainNominalizerTerminal: options.allowPlainNominalizerTerminal === true,
    ...(options.allowElidedDewaNegativeBody === undefined ? {} : { allowElidedDewaNegativeBody: options.allowElidedDewaNegativeBody }),
    allowElidedNominalizerTerminal: options.allowElidedNominalizerTerminal === true,
    allowZeroNiPurposeTerminal: options.allowZeroNiPurposeTerminal === true,
    allowAdnominalCopulaTerminal: options.allowAdnominalCopulaTerminal === true,
    allowRenyouCompoundPrenominalTerminal: options.allowRenyouCompoundPrenominalTerminal === true,
    allowExplicitAdnominalNoTerminal: options.allowExplicitAdnominalNoTerminal === true,
    ...(options.allowAdverbialModifierTerminal === undefined ? {} : { allowAdverbialModifierTerminal: options.allowAdverbialModifierTerminal }),
    allowNoQuoteReportingProjection: options.allowNoQuoteReportingProjection === true,
    ...(outgoingBoundaryHint === undefined ? {} : { outgoingBoundaryHint }),
    ...(quoteAttributiveHeadFrame === undefined ? {} : { quoteAttributiveHeadFrame }),
    ...(options.suppressFormalToSuruControl === true ? { suppressFormalToSuruControl: true } : {}),
    ...(options.quotedNominalHost === true ? { quotedNominalHost: true } : {}),
    streamStart: baseOffset + range.start + effectiveSliceOffset,
    ...(parseSliceInput.sourceIndexMap !== undefined ? { sourceIndexMap: parseSliceInput.sourceIndexMap } : {}),
    ...(options.contextTokens !== undefined ? { contextTokens: options.contextTokens } : {}),
    ...(() => {
      const relationIndex = cachedCanonicalReformulationMarkerRelationIndex(baseContextTokens);
      return relationIndex === null
        ? {}
        : { canonicalReformulationMarkerRelations: relationIndex };
    })(),
    ...(stemSourceOverride !== undefined ? { stemSourceOverride } : {}),
    ...(prependSource !== undefined ? { prependSource } : {}),
    ...(conjugationAnchor !== undefined ? { conjugationAnchor } : {}),
    ...(semanticAnchors !== undefined ? { semanticAnchors } : {})
  });
  if (!parsed.ok) {
    return {
      ok: false,
      reason: `parser: ${parsed.reason}`,
      headHypothesis
    };
  }
  if (virtualCompoundStem?.propositionHost === true && !propositionHostChainBindsWake(parsed.root)) {
    return {
      ok: false,
      reason: "demonstrative proposition host requires a wake operator binding わけ",
      headHypothesis
    };
  }
  const fullContextTokens = options.contextTokens ?? input.tokens;
  const parsedLayer = firstAuxLayer(parsed.root.tail);
  const firstParsedOp = parsedLayer?.ops[0];
  if (
    parsedLayer?.stem.kind === "noun" &&
    firstParsedOp?.kind === "connective" &&
    firstParsedOp.connective === "even_if"
  ) {
    const markerIdx = firstParsedOp.source.tokenIndices[0];
    const relation = markerIdx === undefined
      ? null
      : dewaScopeBridgeRelationAt(fullContextTokens, markerIdx, {
        anchorIdx: markerIdx,
        consumers: ["tail_multi_clause"]
      });
    const negativeTail = relation === null
      ? undefined
      : fullContextTokens[relation.span.endExclusive];
    if (negativeTail !== undefined && isNaiOrNuToken(negativeTail)) {
      return {
        ok: false,
        reason: "bare demo concession cannot preempt a following negative scope bridge tail",
        headHypothesis
      };
    }
  }
  if (plainTePermissionAttributiveBlocked(parsed.root, fullContextTokens, baseOffset + range.end)) {
    return {
      ok: false,
      reason: "plain te-permission attributive head not licensed",
      headHypothesis
    };
  }
  const partialAttributiveBoundary =
    parsed.consumed !== parseSliceInput.tokens.length &&
    partialParseEndsAtAttributiveBoundaryHead(parsed.root, parsed.consumed);
  const partialQuoteBoundary = parsed.consumed !== parseSliceInput.tokens.length &&
    parsed.root.sfp !== null &&
    partialParseRemainderIsOwnedQuoteMarker({
      parsedConsumed: parsed.consumed,
      parseLength: parseSliceInput.tokens.length,
      ...(parseSliceInput.sourceIndexMap === undefined ? {} : { sourceIndexMap: parseSliceInput.sourceIndexMap }),
      baseOffset,
      rangeStart: range.start,
      effectiveSliceOffset,
      contextTokens: fullContextTokens,
      lookups: input.lookups,
    });
  const parsedRoot = rewriteKotodashiReasonScopeRoot(
    materializeNominalZeroCopulaPredicate(
      parsed.root,
      input.cursor,
      range.start,
      input.numeric,
      input.lookups,
      { cursor: new TokenCursor(baseContextTokens, 0, baseContextTokens.length, baseContextPos), start: baseContextPos }
    ),
    input.tokens,
    range.start
  );
  const derivationalLowering = lowerDerivationalSuffixRoot(parsedRoot, {
    quoteBinding: cachedQuoteBindingForContentRoot(
      fullContextTokens,
      baseOffset + range.start + effectiveSliceOffset,
      baseOffset + range.end,
    )
  });
  if (derivationalLowering.kind === "rejected") {
    return {
      ok: false,
      reason: `${DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX}${derivationalLowering.reason}`,
      headHypothesis
    };
  }
  if (parsed.consumed !== parseSliceInput.tokens.length && !partialAttributiveBoundary && !partialQuoteBoundary) {
    const derivationalPrefix = rootHasReanchoringDerivationalSuffix(parsedRoot)
      ? DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX
      : "";
    return {
      ok: false,
      reason: `${derivationalPrefix}parser consumed ${parsed.consumed}/${parseSliceInput.tokens.length} content tokens — partial parse not in subset`,
      headHypothesis
    };
  }
  const rootWithHeadHypothesis: ParsedTailRoot = {
    ...(derivationalLowering.kind === "lowered" ? derivationalLowering.root : parsedRoot),
    headHypothesis
  };
  const leadingSurface = input.tokens.slice(0, range.start).map((t) => t.surface).join("");
  const trailingSurface = input.tokens.slice(range.end + 1).map((t) => t.surface).join("");
  const sourceConsumed = partialAttributiveBoundary || partialQuoteBoundary
    ? sourceConsumedForParsedSlice(
      range.start,
      baseOffset,
      effectiveSliceOffset,
      parsed.consumed,
      parseSliceInput.sourceIndexMap
    )
    : range.end - range.start + 1;
  return {
    ok: true,
    info: {
      root: rootWithHeadHypothesis,
      leadingSurface,
      trailingSurface,
      formal: input.formal,
      sourceConsumed,
      localPredicateIdx: virtualCompoundStem !== null
        ? range.start
        : splitSuppletiveStem === null
          ? range.start + effectiveSliceOffset
          : range.start + splitSuppletiveStem.stemSourceTokens.length - 1
    }
  };
}

function partialParseRemainderIsOwnedQuoteMarker(options: {
  readonly parsedConsumed: number;
  readonly parseLength: number;
  readonly sourceIndexMap?: readonly number[];
  readonly baseOffset: number;
  readonly rangeStart: number;
  readonly effectiveSliceOffset: number;
  readonly contextTokens: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
}): boolean {
  const firstRemainderSourceIdx = options.sourceIndexMap?.[options.parsedConsumed] ??
    options.baseOffset + options.rangeStart + options.effectiveSliceOffset + options.parsedConsumed;
  const relation = quoteStructuralRelationAt(
    new TokenCursor(options.contextTokens, firstRemainderSourceIdx, options.contextTokens.length, firstRemainderSourceIdx),
    options.lookups,
  );
  if (relation === undefined || relation.quote.markerSpan.start !== firstRemainderSourceIdx) return false;
  const lastParsedSourceIdx = options.sourceIndexMap?.[options.parseLength - 1] ??
    options.baseOffset + options.rangeStart + options.effectiveSliceOffset + options.parseLength - 1;
  return relation.quote.markerSpan.endExclusive - 1 >= lastParsedSourceIdx;
}

function sourceConsumedForParsedSlice(
  rangeStart: number,
  baseOffset: number,
  effectiveSliceOffset: number,
  parsedConsumed: number,
  sourceIndexMap?: readonly number[]
): number {
  if (parsedConsumed <= 0) {
    return Math.max(1, effectiveSliceOffset);
  }
  const sourceIndex = sourceIndexMap?.[parsedConsumed - 1];
  if (sourceIndex === undefined) {
    return effectiveSliceOffset + parsedConsumed;
  }
  return Math.max(1, sourceIndex - baseOffset - rangeStart + 1);
}

function partialParseEndsAtAttributiveBoundaryHead(root: TailRootBase, consumed: number): boolean {
  if (
    root.tail.kind !== "auxLayer" ||
    root.tail.terminal !== "attributive" ||
    root.tail.terminalPayload?.kind !== "attributiveBoundary"
  ) {
    return false;
  }
  return consumed <= root.tail.terminalPayload.head.tokenIdx;
}

function plainTePermissionAttributiveBlocked(
  root: TailRootBase,
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const ops = auxOpsInTailNode(root.tail);
  const permissionIndex = ops.findIndex((op) => op.kind === "idiom" && op.idiom === "permission");
  if (permissionIndex < 0) {
    return false;
  }
  const permission = ops[permissionIndex];
  if (permission?.kind !== "idiom" || permission.idiom !== "permission") {
    return false;
  }
  if (ops.slice(0, permissionIndex).some((op) => op.kind === "negation")) {
    return false;
  }
  const sourceTokens = permission.source.tokens;
  const first = sourceTokens[0];
  if (first === undefined || (first.surface !== "て" && first.surface !== "で")) {
    return false;
  }
  if (sourceTokens.some((token) => token.surface === "も" || token.surface === "ても" || token.surface === "でも")) {
    return false;
  }
  const afterContent = contentEndIdx + 1;
  if (isClausePunctuationToken(tokens[afterContent])) {
    return false;
  }
  const headIdx = nextClauseNonPunctuationIndex(tokens, afterContent, tokens.length);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined || ((head.pos & POS0) !== 名詞 && (head.pos & POS0) !== 代名詞)) {
    return false;
  }
  const headForm = head.dictionaryForm || head.surface;
  return !PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(headForm) &&
    !PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(head.surface);
}

function materializeNominalZeroCopulaPredicate<Root extends TailRootBase>(
  root: Root,
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): Root {
  if (
    root.tail.kind !== "auxLayer" ||
    !stemCanHostNominalZeroCopula(root.tail.stem) ||
    !nominalZeroCopulaPredicateNeedsMaterialization(root.tail.ops[0], cursor, start, numeric, lookups, sourceHost)
  ) {
    return root;
  }
  if (quotedConcessiveCanSelectAdjectivalCandidate(root.tail.stem, root.tail.ops[0])) {
    return root;
  }
  const zeroCopula: CopulaOp = createCopulaOp({

    source: root.tail.stem.source,
    variant: "basic",
    polarity: "affirmative",
    polite: false
  });
  return {
    ...root,
    tail: {
      ...root.tail,
      ops: [zeroCopula, ...root.tail.ops]
    }
  };
}

function quotedConcessiveCanSelectAdjectivalCandidate(
  stem: AuxLayerNode["stem"],
  firstOp: AuxOpNode | undefined
): boolean {
  return stem.kind === "candidateSet" &&
    firstOp?.kind === "connective" &&
    firstOp.connective === "quoted_concessive" &&
    (firstOp.surface.includes("ないまでも") || firstOp.surface.includes("ぬまでも")) &&
    stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

interface ParseSliceSourceHost {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
}

function stemCanHostNominalZeroCopula(stem: AuxLayerNode["stem"]): boolean {
  if (stem.kind === "noun") {
    return true;
  }
  return stemSupportsProjectionCategory(stem, "nominal");
}

function nominalZeroCopulaPredicateNeedsMaterialization(
  firstOp: AuxOpNode | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): boolean {
  const { tokens } = cursor;
  if (firstOp?.kind === "predicateQuoteCarrier" && firstOp.style !== "suru_attributive") {
    return true;
  }
  if (firstOp?.kind === "connective") {
    return firstOp.connective === "quotative" ||
      isNominalDirectConnectivePredicateStart(cursor, start, numeric) ||
      (firstOp.connective === "reformulation" &&
        mentionedHostCarriesCanonicalReformulationMarker(sourceHost?.cursor ?? cursor, sourceHost?.start ?? start, numeric, lookups));
  }
  if (firstOp?.kind === "modal" && firstOp.modal === "kamo") {
    return isNounKamoModalPredicateStart(tokens, start, lookups);
  }
  return false;
}

function rewriteKotodashiReasonScopeRoot<Root extends TailRootBase>(
  root: Root,
  tokens: readonly RuntimeHaruToken[],
  start: number
): Root {
  const stemToken = tokens[start];
  if (
    stemToken === undefined ||
    !stemTokenEndsWithNoKoto(stemToken) ||
    !isKotodashiReasonScopeTail(tokens, start + 1)
  ) {
    return root;
  }
  const tail = rewriteKotodashiReasonScopeTailNode(root.tail);
  return tail === root.tail
    ? root
    : { ...root, tail };
}

function rewriteKotodashiReasonScopeTailNode(tail: TailNode): TailNode {
  if (tail.kind === "connective") {
    const inner = rewriteKotodashiReasonScopeAuxLayer(tail.inner);
    const outer = rewriteKotodashiReasonScopeTailNode(tail.outer);
    const connective = tail.connective === "listing" && tail.surface === "し"
      ? "reason" as const
      : tail.connective;
    const surface = tail.surface;
    if (inner === tail.inner && outer === tail.outer && connective === tail.connective && surface === tail.surface) {
      return tail;
    }
    return {
      ...tail,
      inner,
      outer,
      connective,
      surface
    };
  }
  return rewriteKotodashiReasonScopeAuxLayer(tail);
}

function rewriteKotodashiReasonScopeAuxLayer(tail: AuxLayerNode): AuxLayerNode {
  const ops: AuxOpNode[] = tail.ops.map((op): AuxOpNode => {
    if (op.kind === "connective" && op.connective === "listing" && op.surface === "し") {
      return {
        ...op,
        connective: "reason",
        surface: "し"
      };
    }
    return op;
  });
  return {
    ...tail,
    ops
  };
}

function isKotodashiReasonScopeTail(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || (copula.pos & (POS0 | POS4)) !== (助動詞0 | 助動詞_ダ)
  ) {
    return false;
  }
  const connective = tokens[copulaIdx + 1];
  return connective !== undefined && (connective.pos & POS0) === 助詞 && connective.surface === "し";
}

function materializeSuppletiveNegationStem(
  tokens: readonly RuntimeHaruToken[],
  firstNegIdx: number,
  currentStem: StemInput,
  koreanLemma: string,
  lookups: LookupTables
): SuppletiveNegationMaterialization | null {
  if (currentStem.kind === "noun" || currentStem.kind === "candidateSet" || currentStem.kind === "adverb") {
    return null;
  }
  const politeNeg = detectPoliteNegativeSequence(tokens, firstNegIdx);
  const effectiveNegIdx = politeNeg?.negIdx ?? firstNegIdx;
  const effectiveNegToken = tokens[effectiveNegIdx];
  if (effectiveNegToken === undefined || !isNegationLikeToken(effectiveNegToken)) {
    return null;
  }
  const suppletive = loadSuppletiveNegDict().get(koreanLemma);
  if (suppletive === undefined) {
    return null;
  }
  if (matchTeTailContinuationAt(tokens, firstNegIdx, lookups)?.kind === "prohibition") {
    return null;
  }
  if (isObligationSpanStartingAtToken(tokens, firstNegIdx, false, { excludeLexicalBodyForms: true })) {
    return null;
  }
  const [lemma, irregular] = suppletive;
  const stemKind: "verb" | "adj" = lemma === "없다" ? "adj" : currentStem.kind;
  const stem: StemInput = stemKind === "verb"
    ? {
      kind: "verb",
      lemma,
      irregular,
      ...(currentStem.kind === "verb" && currentStem.conj !== undefined ? { conj: currentStem.conj } : {}),
      commitment: "suppletive_negation"
    }
    : {
      kind: "adj",
      lemma,
      irregular,
      commitment: "suppletive_negation"
    };
  if (politeNeg !== null) {
    return { stem, sliceOffset: 0, politeNegative: politeNeg };
  }
  return { stem, sliceOffset: isContinuedSuppletiveNegationChain(tokens, firstNegIdx) ? 0 : 1 };
}

function detectPoliteNegativeSequence(
  tokens: readonly RuntimeHaruToken[],
  politeIdx: number
): { readonly politeIdx: number; readonly negIdx: number } | null {
  const polite = tokens[politeIdx];
  const neg = tokens[politeIdx + 1];
  if (polite === undefined || neg === undefined) {
    return null;
  }
  if ((polite.pos & POS4) !== 助動詞_マス) {
    return null;
  }
  if ((polite.pos & POS5A) !== 未然形_) {
    return null;
  }
  if (!isNegationLikeToken(neg)) {
    return null;
  }
  return { politeIdx, negIdx: politeIdx + 1 };
}

function isContinuedSuppletiveNegationChain(
  tokens: readonly RuntimeHaruToken[],
  firstNegIdx: number
): boolean {
  const firstNeg = tokens[firstNegIdx];
  if (firstNeg === undefined || !isNegationLikeToken(firstNeg)) {
    return false;
  }
  const pos5A = firstNeg.pos & POS5A;
  if (pos5A !== 連用形_) {
    return false;
  }
  const next = tokens[firstNegIdx + 1];
  return next !== undefined && isNegationLikeToken(next);
}

function commitAndRenderSingleClause(
  info: ClauseParseInfo,
  ctx: CommitContext
): IntegrationResult {
  const committed = commitTail(info.root, ctx);

  let rendered;
  try {
    const outgoingBoundary = ownClauseTailIR(ctx)?.outgoingBoundary;
    rendered = renderTail(
      committed.root,
      outgoingBoundary === undefined
        ? { formal: info.formal, lookups: ctx.lookups }
        : { formal: info.formal, outgoingBoundary, lookups: ctx.lookups }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `renderer threw: ${message}` };
  }
  if (!rendered.ok) {
    return { ok: false, reason: `renderer: ${rendered.reason}` };
  }

  const composed = `${info.leadingSurface}${rendered.text}${info.trailingSurface}`;
  const allWarnings = [
    ...committed.warnings,
    ...(rendered.warnings ?? []),
    ...missingConditionalMarkerWarningsForRoot(committed.root)
  ];
  return {
    ok: true,
    text: convertPunctuation(composed),
    polite: rendered.polite,
    warnings: allWarnings
  };
}

function findContentRange(tokens: readonly RuntimeHaruToken[]): { readonly start: number; readonly end: number } | null {
  let start = 0;
  while (start < tokens.length && isClausePunctuationToken(tokens[start])) {
    start += 1;
  }
  let end = tokens.length - 1;
  while (end >= start && isClausePunctuationToken(tokens[end])) {
    end -= 1;
  }
  if (end < start) {
    return null;
  }
  return { start, end };
}

function isNegationLikeToken(token: RuntimeHaruToken): boolean {
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ) {
    return true;
  }
  return (
    (token.pos & POS01) === (形容詞0 | 非自立可能) && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い")
  );
}

function isStemFormInSubset(
  pos5: number,
  _tokens: readonly RuntimeHaruToken[],
  _stemIdx: number
): boolean {
  return (
    pos5 === 終止形_ ||
    pos5 === 連体形_ ||
    pos5 === 連用形_ ||
    pos5 === 未然形_ ||
    pos5 === 意志推量形_ ||
    pos5 === 仮定形_ ||
    pos5 === 命令形_ ||
    pos5 === 語幹_
  );
}

function mapConjType(jpConj: number): VerbConjType {
  if (jpConj === 0) {
    return "irregular";
  }
  if (is五段(jpConj)) {
    return "godan";
  }
  if (is上一段(jpConj) || is下一段(jpConj)) {
    return "ichidan";
  }
  if (jpConj === サ行変格) {
    return "sahen";
  }
  if (jpConj === カ行変格) {
    return "kahen";
  }
  return "irregular";
}

function isAdverbialPossibleNounConditionalCopulaHost(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const token = tokens[start];
  if (
    token === undefined || (token.pos & POS01) !== 名詞_普通名詞 || !isAdverbCapableNominal(token)
  ) {
    return false;
  }
  return matchCopula(tokens, start + 1)?.op.variant === "conditional_nara";
}
