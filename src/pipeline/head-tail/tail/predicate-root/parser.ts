

import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { ParseOutgoingBoundaryHint } from "./parse-boundary-hint.js";
import { morphSurface } from "../../../../types/token.js";
import { isExternalNominalizerConnectiveKind } from "../../boundary/relation.js";
import type { ClauseBoundary } from "./commit.js";
import {
  consumeAdjacentYoThenTrailingSfpRun,
  detectSfp,
  postKaCombinedTerminalSfpAt
} from "../../../semantics/grammar-runtime.js";
import { isColloquialNaiNeeSurface, isFusedSelfQuestionSfpSurface, isNeutralTerminalSfpToken, isPlainNaParticleSurface, isTerminalNeSfpSurface, isTerminalWaSfpSurface, isTerminalYoSfpSurface, terminalSfpLexeme } from "../../../semantics/sfp-surface.js";
import { classifyDatteMarkerAt, toiuAttributiveContinuationHeadIndex, toiuAttributiveTailEnd, toiuIuStandsAsAttributiveCarrier } from "../../../semantics/marker-roles.js";
import { auxHasNegativePolite, auxHasNegation, auxHasPast, auxHasPolite, collectAuxTokens, isAdjNai, isVerbLemma } from "../../../matchers.js";
import {
  matchHokaAdditiveConnectiveStart,
  matchMonoNoConcessiveConnectiveStart
} from "../../boundary/connective-start.js";
import { TokenCursor } from "../../../token-cursor.js";
import { PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS, YOU_NI_VOLITIONAL_MANNER_HOSTS } from "../../data/semantic-helper-sets.js";
import { isBaSufficiencyConditionalAt, matchPermissionPredicateAt } from "../../../semantics/permission-idiom.js";
import { matchProhibitionPredicateAt, type ProhibitionPredicateMatch } from "../../../semantics/prohibition-idiom.js";
import { lookupSetMatches } from "../../../lookup-tables.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { boundNominalReasonClauseContinuationEvidenceAt, copulaStartsPredicateAt, isNominalCopulaHostPos } from "./integration/readiness.js";
import {
  quoteClauseBoundaryFromRelation,
  quoteBoundarySurfaceFromRelation,
  buildQuoteConnectiveOpFromBoundary,
  quoteConsumedMarkerSpanFromRelation,
  quoteStructuralRelationAt,
  quoteStructuralRelationStartingAt
} from "../../../structural-relation/quote.js";
import { adverbialToCapableKeijoujiHost, tariKeijoujiAdverbialToEvidence } from "../../../semantics/tari-adverbial-marker.js";
import { quoteFocusLimitNegationTailStartingAt, quoteFocusMarkerStartingAt } from "../segments/quote-focus.js";
import {
  tosuruConstructionModeForToken,
  tosuruResultativeMakeYieldsToAttributiveQuoteHead
} from "./tosuru-construction-mode.js";
import {
  adjectivalConcessiveTomoRelationAt,
  caseParticleMarkerRelationForToken,
  copulaDeMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  conditionalToConnectiveRelationAt,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationAt,
  kaMarkerRelationForToken,
  nominalLinkMarkerRelationAt,
  nominalizerCopulaSupportRelationAt,
  predicateNominalizerRelationForToken,
  questionContentContinuationAfterKaRelationAt,
  registeredClauseConnectiveRelationForToken,
  topicFocusMarkerRelationForToken
} from "../../boundary/marker.js";
import { parentheticalSpanEndingAt } from "../../boundary/parenthetical.js";
import { getArgumentNounBeforeParticle } from "../../candidate/semantic-classifiers.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import {
  parallelPredicateMoOwnershipYieldMarkers,
  renyouFocusParallelSeriesFinalMarkerByItem,
  zeroNominalizedParallelMoMarkerIndices
} from "../../../clause-layout/predicate-parallel.js";
import { activeProtoLayout } from "../../../clause-layout/proto-state.js";
import { monoModalClauseEvidence } from "../../../semantics/mono-modal.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  utteranceClosureTokenIdx,
  type UtteranceClosureKind
} from "../../../clause-layout/utterance-closure.js";
import { isUtteranceClosingPunct } from "../../../clause-layout/index.js";
import {
  clauseContainsInterrogativeBeforeKa,
  clauseContainsLexicalizedInterrogativeBefore,
  clauseContainsPredicateChoiceKaBefore
} from "../../../quote/embedded-question.js";
import { isTeFormPredicateHeadToken } from "../../../quote/prohibitive-request.js";
import { quoteMarkerRelationAt, tokaQuoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../../boundary/quote-marker.js";
import { closedPropositionTokaKaRelationAt, janaiConfirmationKaOwnershipKindAt, closedPropositionTokaListingEvidenceAt, kaOwnershipKindAt, selfQuestionDiscourseSfpKaRelationAt, terminalQuestionKaRelationAt, type ClosedPropositionTokaKaRelation } from "../../boundary/ka-ownership.js";
import { participatesInStructuralKaParallel } from "../../../structural-relation/ka-parallel-ownership.js";
import { tokenMatchesConnectiveKind } from "../connective-span-scanner.js";
import { hasRealContentAfterIndex, isBoundaryPunctuationToken, isHardTerminalPunctuationToken, isOpeningPunctuationToken, isTerminalishPunctuationToken, isWeakPunctuationToken } from "../../boundary/punctuation.js";
import { conditionalQuoteEllipsisClassForSurface } from "./connective-render-table.js";
import { sourceVerbalPredicateAfterAuxOp } from "./operator-head.js";
import {
  classifyTeTailContinuation,
  isChoudaiRequestContinuationToken,
  isSimpleAspectAuxActivationAccepted,
  isTeConnectiveToken,
  matchTeConnectiveHeadAt,
  matchTeTailContinuationAt,
  teBenefactiveContinuationMetadataForToken,
  teTailContinuationLexemeEntryForToken,
  teTailContinuationDerivationForToken,
  isHonorificNasaruImperativeToken,
  teTailImperativeFormEntryForToken,
  teDeContinuationRelationAt,
  teTailContinuationDirectionForToken,
  teMawaruItinerantVetoed,
  teYaruContinuationOpensTeKuruChainAt
} from "../postverb-tail-classifier.js";
import { assertNever, negationFocusParticleForMarker, type AdjCopulaBridgeOp, type AuxLayerNode, type AuxOpNode, type BenefactiveAspectOp, type BenefactivePayload, type ClassicalAuxResidueOp, type ConditionalFlavor, type ConjectureOp, type CannotRefrainIdiomOp, type DesiderativeAspectOp, type DesiderativePayload, type DesireOp, type DecisionKotoNiSuruIdiomOp, type OutcomeKotoNiNaruIdiomOp, type DegreeIntensifierIdiomOp, type DegreeIntensifierMode, type DegreeIntensifierVariant, type ExperienceIdiomOp, type ForbiddenIdiomOp, type InevitableIdiomOp, type MaiModalOp, type LimitNegationFocus, type LimitNegationModalOp, type MethodYouGaNaiIdiomOp, type MiseruAspectOp, type ProhibitionAspectOp, type ProhibitionPayload, type RequestAspectOp, type SimpleAspectOp, type HazuModalOp, type KamoModalOp, type ModalOp, type NegationOp, type NegativeNecessityKotoWaIdiomOp, type NegativeNecessitySumuIdiomOp, type NodaModalOp, type ObligationIdiomOp, type OnlyOptionIdiomOp, type PermissionIdiomOp, type SufficiencyConditionalIdiomOp, type TeEvaluationIdiomOp, type NegationFocusParticle, type OpSource, type PoliteOp, type PotentialKotoGaDekiruIdiomOp, type PotentialKotoDekiruFocusParticle, type PotentialKotoDekiruParticleKind, type PredicateProjectionCarrierOp, type PredicateProjectionCarrierSourceAllomorph, type PredicateQuoteCarrierOp, type PredicateSuffixOp, type PostverbAuxiliaryKind, type PostverbAuxiliaryPayload, type PostverbAuxiliaryOp, type PostverbHostAttachForm, type HeadProjectionKind, type RashiiModalOp, type SfpEffect, type SfpNode, type QuotedPropositionMood, moodBearingOpBlocksVolitionalSpeechAct, opSourceIsVolitionalInChain, type VoiceOp, type ConnectiveKind, type ConnectiveOp, type ScopeBridgeForm, type ScopeBridgeOp, type CopulaOp, lookupConnectiveBySurface, retrospectiveQuotativeFlavorForStemMood, connectiveSurfaceRequiresFinalPosition, type SoudaHearsayModalOp, type StemMood, type StemNode, type TailNode, type ParsedTailRoot, type TenseOp, type TokoroModalOp, type TsumoriModalOp, type MonoModalEvidence, type MonoModalForm, type MonoModalOp, MONO_MODAL_READING_VALUES, MONO_MODAL_NO_EVIDENCE, hostCarriesPreModalPast, type WakeModalOp, type WakeImpossibleIdiomOp, type NegativeNecessityMadeMoIdiomOp, type YoudaModalOp, type YoudaTerminal, opVolitionalMoodConsumedByCompanionConjecture, type VolitionalAttemptFocusParticle } from "./grammar.js";
import { isCommittedKaQuestionSfpEffect, isKaFamilyQuestionSfpEffect, quotedMoodForClosingSfpEffect } from "./grammar.js";
import type { ParseInput, StemInput } from "./parse-input.js";
import {
  type ObligationPattern
} from "./obligation-pattern-table.js";
import {
  canOpenMalformedConditionalFragmentTerminal,
  canOpenRenyouChuushiTerminal,
  canOpenStemMalformedConditionalFragmentTerminal,
  canOpenStemRenyouChuushiTerminal,
  canOpenOpsRenyouCompoundPrenominalTerminal,
  canOpenStemRenyouCompoundPrenominalTerminal,
  missingConditionalMarkerConnective,
  renyouChuushiPayloadForOp,
  renyouChuushiPayloadForSource
} from "./fragment-recovery.js";
import {
  isPostverbAuxiliaryActivationAccepted,
  isPostverbAuxiliaryToken,
  postverbAuxiliarySourceTokenClassMatches,
  isStateChangePostverbAuxiliaryKind,
  isTeAuxActivationAccepted,
  isTeBenefactiveActivationAccepted,
  postverbAuxiliaryDeclaresHostAttachForm,
  postverbAuxiliaryPayloadForForm,
  postverbAuxiliaryPayloadsForForm
} from "./postverb-auxiliary-parser.js";
import { appearancePerceptionProjectionForToken } from "./appearance-perception-carrier-table.js";
import {
  PROJECTION_CARRIER_FORMS,
  declaredProjectionCarrierBranchTerminal,
  projectionCarrierHostAttaches,
  projectionCarrierTokenMatches
} from "./projection-carrier-form-table.js";
import { policyAllowsShortNegation, shortNegationPolicyForCommittedStem } from "./short-negation-policy.js";
import { srcList, srcSingle, srcSlice } from "./source.js";
import { collapsedAspectAuxKind, isBareMoConcessivePreviousToken, isClauseClosingPredicateTailToken, affirmativeFocusSupportShapeAt, focusedNegationShapeAt, isAruVerbToken, DEARI_LISTING_CONNECTIVE_SURFACE, DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE, isAffirmativeCopulaSupportVerbToken, isClassicalZuIzenkeiToken, isFusedCopulaDewaFocusToken, isFusedCopulaSupportConditionalToken, isCopulaJaNegativeBridgeToken, copulaSupportSimultaneousConnectiveTokenCountAt, isEquivalenceCarrierAdnominalToken, isEquivalenceCarrierPredicativeNoun, isKotoNounToken, isNaiOrNuToken, isBungoProhibitiveNakareToken, isKansaiHonorificHaruAfterVerbHost, isTagaruTailAuxToken, isPredicativeCopulaSupportVerbAt, isSayVerbToken, isSuruVerbToken, isSyntheticDeicticStemToken, isTariListingParticleToken, isWakeNounToken, volitionalAttemptMarkerAt } from "./classifiers/tokens.js";
import { isPlainNominalizerParticleFollowerAt } from "./matchers/nominalizer.js";
import { matchOutcomeKotoNiNaruSurfaceAt } from "./matchers/outcome-koto-ni-naru.js";
import {
  matchBoundNominalListingConnectiveAt,
  matchBoundNominalReasonConnectiveAt,
  boundNominalReasonQuoteCarrierStemAt
} from "./matchers/bound-nominal-connective.js";
import {
  matchTameConnectiveAt,
  matchTameQuotedJudgmentPassiveConnectiveAt
} from "./matchers/tame-connective.js";
import {
  matchTokoroResultConnectiveAt,
  tailOpsEndInPastTense,
  type TokoroResultConnectiveMatch
} from "./matchers/tokoro-result-connective.js";
import {
  buildObligationIdiomOp,
  canCloseBareBekiBeforeBoundary,
  type ElidedColloquialObligationContext,
  isDameObligationBodyToken,
  isObligationSpanStartingAtToken,
  isTerminalSfpBeforeClauseEnd,
  matchDameObligationCopula,
  matchObligationBody,
  normalizeElidedColloquialObligationContext,
  tryMatchObligation
} from "./matchers/obligation.js";
import { matchNiChigaiNaiProjectionCarrierAt, matchNiKimatteIruProjectionCarrierAt } from "./matchers/projection-carrier.js";
import {
  matchNegationEnding,
  type NegationEndingMatch
} from "./matchers/negation-ending.js";
import { fusedVolitionalMethodYouIdiomShapeAt, matchNegativeExistentialEndingWithPast, methodYouGaNaiIdiomShapeAt, methodYouIdiomHostIsVerbalRenyouAt } from "./matchers/method-you-idiom.js";
import {
  isKamoShirenaiLemma,
  matchKamoShirenaiSequence,
  type BareKamoAdmissionContext
} from "./matchers/kamo-modal.js";
import { matchFocusConnectiveAt, matchDokoroNegativeCarrierSpanAt, dokoroNegativeHostClass, dokoroSituationDeicticBase } from "./matchers/focus-connective.js";
import { matchFocusLimitCarrier } from "./matchers/focus-limit-carrier.js";
import { isSecondaryParticle, secondaryParticleCanonical } from "../../../particles/secondary-particle.js";
import {
  buildQuotativeMannerSimileConnectiveOp,
  type PredicateProjectionConnectiveMatch,
  matchPredicateProjectionConnectiveAt,
  matchQuotativeMannerSimileConnectiveAt,
  type QuotativeMannerSimileConnectiveMatch,
  fusedNoYouNiKeijoujiAttributiveAt,
  fusedNoYouNiPerceptionCarrierAt,
  keijoujiAttributiveMarkerAt,
  kaNoYouNiPerceptionCarrierAt,
  matchGotokuMannerSimileConnectiveAt,
  matchKaNoYouNiMannerSimileConnectiveAt,
  perceptionCarrierVerbMatch,
  matchYouNiPredicateProjectionConnectiveAt,
  youNiQuoteDirectiveFollowerAt,
  youNiQuoteDirectiveProjectionSpanAt,
  isPastAuxiliaryToken
} from "./matchers/predicate-projection-connective.js";
import {
  type CompositeConnectiveMatch,
  matchCompositeConnectiveAt,
  matchQuotedConcessiveConnectiveAt,
  matchReformulationConnectiveAt,
  matchRetrospectiveQuoteConnectiveAt,
  matchQuestionReformulationConnectiveAt,
} from "./matchers/connective.js";
import {
  matchElidedNominalizerScopeBridge,
  matchImplicitNegativeFocusBridge,
  matchScopeBridge,
  matchScopeBridgeBeforeBasicCopula,
  likenessEvaluativeConditionHasConsequentAt,
  likenessNegativeScopeBodyFollowsAt,
  matchScopeBridgeTail,
  scopeBridgeBodyClosesAt
} from "./matchers/scope-bridge.js";
import { matchEpistemicHedgePostverbAuxiliary as matchEpistemicHedgePostverbAuxiliaryAt } from "./matchers/epistemic-hedge.js";
import { applyNominalHostQuoteDecoration, hostEnclosingQuoteCloseToken, skipHostEnclosingQuoteClose } from "./nominal-host-phrase.js";
import {
  attributiveCopulaTailFollows,
  isAdnominalCopulaMatch,
  isAssertiveCopulaMarkerToken,
  isFusedJaCopulaToken,
  likenessCarrierCopulaSlotAt,
  matchCopula,
  negativeCopulaBridgeOpensAt,
  terminalNodaCarrierFollowsAdnominalCopula
} from "./matchers/copula.js";
import { headContractForPostverbAuxiliary } from "./head-contract-table.js";
import { auxOpCarriesTypedNegation, chainFinalOpHostCategory, firstAuxLayer, negationOpAdmitsShortForm, stemHasSahenSourcePredicate, stemHasSourceVerbalPredicateEvidence, stemHasVoicedTeFormHostEvidence, stemSupportsAnyProjectionCategory, stemSupportsProjectionCategory } from "./inspect.js";

import { NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS2, POS4, POS5, POS5A, is上一段, is下一段, posToString, PUNCTUATION_BITS, カ行変格, サ変可能, サ行変格, 意志推量形_, 下一段_サ行, 下一段_マ行, 仮定形_, 仮定形_一般, 仮定形_融合, 已然形_, 格助詞, 記号, 係助詞, isConjunctiveParticleToken, isNaAdjCapable, isNegativeAuxiliaryPos, isNonIndependentVerbToken, isPastAuxConditionalForm, isPastAuxiliaryPos, isRenyouInflection, isTerminalOrAttributiveInflection, isIAdjectivePredicateToken, isVerbPredicateToken, isVolitionalInflection, isImperativeInflection, 形状詞可能, 形容詞0, 語幹_, 語幹_サ, 終止形_, 終止形_撥音便, 終助詞, 準体助詞, 助詞, 助詞_終助詞, 助動詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_タイ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マイ, 助動詞_マス, 助動詞_ヤ, 助動詞_ラシイ, 助動詞_レル, 助動詞語幹, 接続助詞, 接頭辞, isAdjectivalDerivationalSuffix, isNaAdjectiveDerivationalSuffix, isNominalDerivationalSuffix, isRenyouInflectedToken, isVerbalDerivationalSuffixToken, 動詞, 動詞_非自立可能, 非自立可能, 副詞, 副助詞, 文語助動詞_キ, 文語助動詞_ケリ, 文語助動詞_ズ, 文語助動詞_タリ_断定, 文語助動詞_ナリ_断定, 文語助動詞_ヌ, 文語助動詞_ベシ, 文語助動詞_マジ, 文語助動詞_リ, 補助記号, 未然形_, 代名詞, 名詞, 命令形_, 連体形_, 連体形_撥音便, 連用形_, 連用形_ニ, 連用形_促音便, 助詞_接続助詞, 助詞_副助詞, 助詞_係助詞, 助詞_格助詞, 形状詞_助動詞語幹, 동사, conjectureCopulaPoliteness, isAdverbCapable, isNominalLike, isTerminalCopulaFamilyToken, isPureNaAdjStem, isAdnominalGenitiveMarkerToken, isTerminalParticleToken } from "../../../../types/pos.js";
import { reanchoringDerivationalProfile } from "./derivational-suffix-lowering.js";
import { derivationalSuffixProfileById, derivationalSuffixProfileFor, resolveDerivationalSuffixProfile, type DerivationalSuffixHostCategory, type DerivationalSuffixProfile } from "./derivational-suffix-table.js";
import { buildBoundaryConnectiveOp, buildMatchedConnectiveOp, buildPostverbAuxiliaryOp, buildPredicateProjectionCarrierOp, buildRequestAspectOp, createAdjCopulaBridgeOp, createPredicateProjectionCarrierOp, createAspectOp, createClassicalAuxResidueOp, createConjectureOp, createConnectiveOp, createDesireOp, createIdiomOp, createModalOp, createNegationOp, createPoliteOp, createPredicateQuoteCarrierOp, createPredicateSuffixOp, createTenseOp, createVoiceOp, markQuotedQuestionContextOp, markTerminalDiscourseHostConnectiveOp, type RequestAspectKind } from "./op-builders.js";
export interface ParseSuccess {
  readonly ok: true;
  readonly root: ParsedTailRoot;
  readonly consumed: number;
}

export interface ParseFailure {
  readonly ok: false;
  readonly reason: string;
  readonly position: number;
}

export type ParseOutcome = ParseSuccess | ParseFailure;

function connectiveOpFromMatch(
  match: CompositeConnectiveMatch | TokoroResultConnectiveMatch,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp {
  const pos = cursor.pos;
  cursor.advance(match.consumed);
  return buildMatchedConnectiveOp(
    srcSlice(cursor.tokens, pos, match.consumed),
    match
  );
}


type AuxClass =
  | "negation"
  | "tense_past"
  | "polite"
  | "classical_aux_residue"
  | "conjecture"
  | "conjecture_polite"
  | "rashii"
  | "desire"
  | "voice_passive"
  | "voice_causative"
  | "voice_honorific"
  | "connective";

interface AuxClassResult {
  readonly classifications: readonly AuxClass[];
  readonly reason?: string;
}

const OUT_OF_SUBSET = (reason: string): AuxClassResult => ({ classifications: [], reason });
const POLITE_OK: AuxClassResult = { classifications: ["polite"] };
const CLASSICAL_AUX_RESIDUE_OK: AuxClassResult = { classifications: ["classical_aux_residue"] };
const NEGATION_OK: AuxClassResult = { classifications: ["negation"] };
const TENSE_PAST_OK: AuxClassResult = { classifications: ["tense_past"] };
const FUSED_POLITE_NEGATION: AuxClassResult = { classifications: ["polite", "negation"] };
const FUSED_NEGATION_CONJECTURE: AuxClassResult = { classifications: ["negation", "conjecture"] };
const FUSED_PAST_CONJECTURE: AuxClassResult = { classifications: ["tense_past", "conjecture"] };
const CONJECTURE_OK: AuxClassResult = { classifications: ["conjecture"] };
const CONJECTURE_POLITE_OK: AuxClassResult = { classifications: ["conjecture_polite"] };
const RASHII_OK: AuxClassResult = { classifications: ["rashii"] };
const DESIRE_OK: AuxClassResult = { classifications: ["desire"] };
const VOICE_PASSIVE_OK: AuxClassResult = { classifications: ["voice_passive"] };
const FUSED_VOICE_NEGATION: AuxClassResult = { classifications: ["voice_passive", "negation"] };
const VOICE_CAUSATIVE_OK: AuxClassResult = { classifications: ["voice_causative"] };
const VOICE_HONORIFIC_OK: AuxClassResult = { classifications: ["voice_honorific"] };
const CONNECTIVE_OK: AuxClassResult = { classifications: ["connective"] };

interface VariantSpec {
  readonly when: (token: RuntimeHaruToken, next: RuntimeHaruToken | undefined) => boolean;
  readonly result: AuxClassResult;
}

interface AuxKindEntry {
  readonly when: (token: RuntimeHaruToken) => boolean;
  readonly variants: readonly VariantSpec[];
  readonly default: AuxClassResult;
}

const pos5Includes = (form: number) => (t: RuntimeHaruToken) => (t.pos & POS5A) === form;

export function isSeruCausativeAuxToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 助動詞 &&
    (token.pos & POS4) === 下一段_サ行 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

export function isShimeruCausativeAuxToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 助動詞 &&
    (token.pos & POS4) === 下一段_マ行 &&
    (token.dictionaryForm === "しめる" || token.surface === "しめ" || token.surface === "しめる");
}

const AUX_DISPATCH: readonly AuxKindEntry[] = [
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 助動詞_ナイ || p4 === 助動詞_ヌ;
    },
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_一般, result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_融合, result: NEGATION_OK },
      {
        when: (t, next) =>
          (t.pos & POS5A) === 語幹_ && next !== undefined && isSoudaAuxiliaryStemToken(next),
        result: NEGATION_OK
      },
      { when: pos5Includes(意志推量形_), result: FUSED_NEGATION_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("助動詞-ナイ/ヌ 仮定形-促音便 / 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 文語助動詞_ズ,
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      {
        when: (t, next) =>
          isClassicalZuIzenkeiToken(t) &&
          next !== undefined &&
          (next.pos & POS01) === 助詞_接続助詞 &&
          next.surface === "ば",
        result: NEGATION_OK
      }
    ],
    default: OUT_OF_SUBSET("文語助動詞-ズ 未然形/仮定形/고립 命令形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 文語助動詞_キ || p4 === 文語助動詞_ケリ || p4 === 文語助動詞_ヌ;
    },
    variants: [
      {
        when: (t, next) =>
          (t.pos & POS4) === 文語助動詞_ヌ &&
          (t.pos & POS5A) === 連用形_ &&
          next !== undefined &&
          ((next.pos & POS4) === 文語助動詞_ケリ || (next.pos & POS4) === 文語助動詞_キ),
        result: CLASSICAL_AUX_RESIDUE_OK
      },
      { when: pos5Includes(終止形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連体形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連用形_), result: TENSE_PAST_OK },
      { when: pos5Includes(已然形_), result: TENSE_PAST_OK }
    ],
    default: OUT_OF_SUBSET("文語助動詞-キ/ケリ/ヌ 未然形/命令形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 文語助動詞_ナリ_断定 || p4 === 文語助動詞_リ || p4 === 文語助動詞_タリ_断定;
    },
    variants: [
      { when: pos5Includes(終止形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(連体形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(連用形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(已然形_), result: CLASSICAL_AUX_RESIDUE_OK }
    ],
    default: OUT_OF_SUBSET("文語助動詞-ナリ/リ 未然形/命令形 등 — 미구현")
  },
  {
    when: (t) =>
      (t.pos & POS01) === (形容詞0 | 非自立可能) &&
      (t.dictionaryForm === "ない" || t.dictionaryForm === "無い" || isColloquialNaiNeeSurface(t.surface)),
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_一般, result: NEGATION_OK },
      {
        when: (t, next) =>
          (t.pos & POS5) === 語幹_サ && next !== undefined && isSoudaAuxiliaryStemToken(next),
        result: NEGATION_OK
      },
      { when: pos5Includes(意志推量形_), result: FUSED_NEGATION_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("adjectival ない/無い 仮定形 등 — Phase 3+")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_タ,
    variants: [
      { when: pos5Includes(終止形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連体形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連用形_), result: TENSE_PAST_OK },
      { when: pos5Includes(仮定形_), result: CONNECTIVE_OK },
      { when: pos5Includes(意志推量形_), result: FUSED_PAST_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("助動詞-タ 意志推量形·仮定形 외 — Phase 3+")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_マス,
    variants: [
      { when: pos5Includes(終止形_), result: POLITE_OK },
      { when: pos5Includes(連体形_), result: POLITE_OK },
      { when: pos5Includes(連用形_), result: POLITE_OK },
      { when: pos5Includes(意志推量形_), result: POLITE_OK },
      {
        when: (t) => pos5Includes(未然形_)(t) && t.surface.endsWith("ん"),
        result: FUSED_POLITE_NEGATION
      },
      {
        when: (t, next) =>
          pos5Includes(未然形_)(t) &&
          next !== undefined &&
          (next.pos & POS4) === 助動詞_ヌ,
        result: POLITE_OK
      },
      { when: pos5Includes(命令形_), result: POLITE_OK },
      { when: pos5Includes(未然形_), result: POLITE_OK },
      {
        when: (t, next) =>
          pos5Includes(仮定形_)(t) &&
          next !== undefined &&
          (next.pos & POS01) === 助詞_接続助詞 &&
          next.surface === "ば",
        result: POLITE_OK
      }
    ],
    default: OUT_OF_SUBSET("助動詞-マス 고립 仮定形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 助動詞_デス || p4 === 助動詞_ダ || p4 === 助動詞_ジャ || p4 === 助動詞_ヤ;
    },
    variants: [
      {
        when: (t) =>
          ((t.pos & POS4) === 助動詞_ダ || (t.pos & POS4) === 助動詞_ヤ) &&
          (t.pos & POS5A) === 意志推量形_,
        result: CONJECTURE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 意志推量形_),
        result: CONJECTURE_POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 終止形_),
        result: POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_),
        result: POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_),
        result: CONNECTIVE_OK
      }
    ],
    default: OUT_OF_SUBSET("copula 계열 (助動詞-デス/-ダ/-ジャ/-ヤ) 의 미구현 활용형")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_ラシイ,
    variants: [
      { when: pos5Includes(終止形_), result: RASHII_OK },
      { when: pos5Includes(連体形_), result: RASHII_OK },
      { when: pos5Includes(連用形_), result: RASHII_OK },
      { when: pos5Includes(仮定形_), result: RASHII_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-ラシイ 命令形 등 — 미구현")
  },
  {
    when: (t) =>
      isAdjectivalDerivationalSuffix(t) &&
      t.dictionaryForm === "らしい",
    variants: [
      { when: pos5Includes(終止形_), result: RASHII_OK },
      { when: pos5Includes(連体形_), result: RASHII_OK },
      { when: pos5Includes(連用形_), result: RASHII_OK },
      { when: pos5Includes(仮定形_), result: RASHII_OK }
    ],
    default: OUT_OF_SUBSET("接尾辞-形容詞的 らしい 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_タイ,
    variants: [
      { when: pos5Includes(終止形_), result: DESIRE_OK },
      { when: pos5Includes(連体形_), result: DESIRE_OK },
      { when: pos5Includes(連用形_), result: DESIRE_OK },
      { when: pos5Includes(仮定形_), result: DESIRE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-タイ 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_レル,
    variants: [
      { when: (t) => (t.pos & POS5) === 終止形_撥音便, result: FUSED_VOICE_NEGATION },
      { when: pos5Includes(終止形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(連体形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(連用形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(意志推量形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(未然形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(仮定形_), result: VOICE_PASSIVE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-レル 命令形 등 — 미구현")
  },
  {
    when: (t) => isSeruCausativeAuxToken(t) || isShimeruCausativeAuxToken(t),
    variants: [
      { when: pos5Includes(終止形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(連体形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(連用形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(意志推量形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(未然形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(仮定形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(命令形_), result: VOICE_CAUSATIVE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞 下一段-サ行 (せる/させる) 미구현 활용형")
  },
  {
    when: (t) =>
      (t.pos & POS01) === 助詞_接続助詞 &&
      lookupConnectiveBySurface(t.surface) !== undefined,
    variants: [],
    default: CONNECTIVE_OK
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_ダ && pos5Includes(仮定形_)(t),
    variants: [],
    default: CONNECTIVE_OK
  }
];

function classifyAux(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): AuxClassResult {
  for (const entry of AUX_DISPATCH) {
    if (entry.when(token)) {
      for (const variant of entry.variants) {
        if (variant.when(token, next)) {
          return variant.result;
        }
      }
      return entry.default;
    }
  }
  return OUT_OF_SUBSET(`unrecognized aux: pos=${JSON.stringify(token.pos)}`);
}

export function classifySingleAuxTokenOps(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined,
  pos: number
): readonly AuxOpNode[] {
  const classified = classifyAux(token, next).classifications.map((cls) => buildOpFromClassification(cls, token, pos));
  if (classified.length > 0) {
    return classified;
  }
  const auxiliary = postverbAuxiliaryPayloadsForForm(token.dictionaryForm).find((payload) =>
    payload.sourceTokenClass === "auxiliary_verb" && postverbAuxiliarySourceTokenClassMatches(payload, token)
  );
  return auxiliary === undefined ? [] : [buildPostverbAuxiliaryOp(srcSingle(token, pos), auxiliary)];
}

function isUnclaimedCausativePassiveVolitionalTail(
  token: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  return (token.pos & POS4) === 助動詞_レル &&
    (token.pos & POS5A) === 意志推量形_ &&
    ops.some((op) => op.kind === "voice" && op.voice === "causative");
}

function isHonorificNasaiAfterImperativeFormAspect(
  token: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  const last = ops.at(-1);
  if (last?.kind !== "aspect" || last.terminalMood !== "imperative") {
    return false;
  }
  const carrier = last.source.tokens.at(-1);
  return carrier !== undefined &&
    teTailImperativeFormEntryForToken(carrier) !== undefined &&
    isHonorificNasaruImperativeToken(token);
}

function classifyTailAux(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined,
  stemNode: StemNode,
  precedingToken: RuntimeHaruToken | undefined,
  ops: readonly AuxOpNode[]
): AuxClassResult {
  if (
    isTagaruTailAuxToken(token) &&
    precedingToken !== undefined &&
    isRenyouInflection(precedingToken.pos) &&
    ops.reduce(sourceVerbalPredicateAfterAuxOp, stemHasSourceVerbalPredicateEvidence(stemNode))
  ) {
    return DESIRE_OK;
  }
  if (!adjacentNegationClosesBeforeColloquialNe(ops) && isColloquialNaiTailAux(token, precedingToken, stemNode)) {
    return NEGATION_OK;
  }
  if (isUnclaimedCausativePassiveVolitionalTail(token, ops)) {
    return OUT_OF_SUBSET("사역수동 意志推量形 — 미claim (사전 흡수 방향 역전 회피)");
  }
  if (isHonorificNasaiAfterImperativeFormAspect(token, ops)) {
    return POLITE_OK;
  }
  if (isKansaiHonorificHaruAfterVerbHost(token, precedingToken)) {
    return VOICE_HONORIFIC_OK;
  }
  const result = classifyAux(token, next);
  if (result.classifications.length > 0 || stemNode.commitment !== "suppletive_negation") {
    return result;
  }
  if (isSuppletivePoliteNegativePoliteCarrier(token)) {
    return POLITE_OK;
  }
  return result;
}

function adjacentNegationClosesBeforeColloquialNe(ops: readonly AuxOpNode[]): boolean {
  const adjacent = ops.at(-1);
  if (adjacent === undefined) return false;
  if (adjacent.kind !== "negation") return false;
  const form = (adjacent.source.tokens.at(-1)?.pos ?? 0) & POS5A;
  return form === 終止形_;
}

function isColloquialNaiTailAux(
  token: RuntimeHaruToken,
  precedingToken: RuntimeHaruToken | undefined,
  stemNode: StemNode
): boolean {
  if (
    !isColloquialNaiNeeSurface(token.surface) ||
    (token.pos & POS01) !== 助詞_終助詞 ||
    precedingToken === undefined ||
    !isColloquialNaiConnectionForm(precedingToken)
  ) {
    return false;
  }
  return stemSupportsProjectionCategory(stemNode, "verbal_predicate");
}

function isColloquialNaiConnectionForm(host: RuntimeHaruToken): boolean {
  const form = host.pos & POS5A;
  if (form === 未然形_) {
    return true;
  }
  if ((host.pos & (POS0 | POS1 | POS5)) === (動詞 | 非自立可能 | 連体形_撥音便)) {
    return true;
  }
  if (form !== 連用形_) {
    return false;
  }
  if ((host.pos & POS4) === 助動詞_タイ || (host.pos & POS4) === 助動詞_ナイ) {
    return true;
  }
  const conj = host.pos & POS4;
  return is上一段(host.pos) || is下一段(host.pos) ||
    ((host.pos & POS0) === 動詞 && (conj === サ行変格 || conj === カ行変格));
}

function isSuppletivePoliteNegativePoliteCarrier(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_);
}

const ARU_POLITE_EXISTENTIAL_VERB_FORMS = new Set(["ござる"]);
const IRU_VERB_FORMS = new Set(["いる", "居る"]);
type AruOrGozaruVerbToken = RuntimeHaruToken & { readonly dictionaryForm: "ある" | "有る" | "ござる" };
type IruVerbToken = RuntimeHaruToken & { readonly dictionaryForm: "いる" | "居る" };

function isAruOrGozaruVerbToken(token: RuntimeHaruToken | undefined): token is AruOrGozaruVerbToken {
  if (isAruVerbToken(token)) {
    return true;
  }
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return ARU_POLITE_EXISTENTIAL_VERB_FORMS.has(form);
}

function isIruVerbToken(token: RuntimeHaruToken | undefined): token is IruVerbToken {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return IRU_VERB_FORMS.has(token.dictionaryForm || token.surface);
}

function isNegationToken(
  token: RuntimeHaruToken,
  next?: RuntimeHaruToken | undefined
): boolean {
  if (!isNaiOrNuToken(token)) {
    return false;
  }
  const result = classifyAux(token, next);
  return result.classifications.length === 1 && result.classifications[0] === "negation";
}


function matchDegreeIntensifierIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): DegreeIntensifierIdiomOp | null {
  const { tokens, pos } = cursor;
  const connector = tokens[pos];
  if (connector === undefined || !isDegreeHostConnector(connector)) {
    return null;
  }
  const tailPos = pos + 1;
  const core = cursor.lookahead(tailPos - pos, c => matchDegreeIntensifierCore(c, lookups));
  if (core === null) {
    return null;
  }
  const consumed = 1 + core.consumed;
  cursor.advance(consumed);
  return buildDegreeIntensifierIdiomOp(
    srcSlice(tokens, pos, consumed),
    core.mode,
    core.variant,
    core.polite,
    core.past
  );
}

export function buildDegreeIntensifierIdiomOp(
  source: OpSource,
  mode: DegreeIntensifierMode,
  variant: DegreeIntensifierVariant,
  polite = false,
  past = false
): DegreeIntensifierIdiomOp {
  return createIdiomOp({

    idiom: "degree_intensifier",
    source,
    polarity: "affirmative",
    polite,
    past,
    mode,
    variant
  });
}

function isDegreeHostConnector(token: RuntimeHaruToken): boolean {
  if (isTeConnectiveToken(token) && token.surface.charAt(0) === "て") {
    return true;
  }
  return (isTeConnectiveToken(token) && token.surface.charAt(0) === "で") ||
    (copulaDeMarkerRelationForToken(token, -1, { consumers: ["tail_multi_clause"] }) !== null && (token.pos & POS4) === 助動詞_ダ);
}

function collectAuxAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): readonly RuntimeHaruToken[] {
  const aux = cursor.lookahead(pos - cursor.pos, c => collectAuxTokens(c)) as readonly RuntimeHaruToken[];
  const bridgeOffset = aux.findIndex(
    (_, offset) => negativeCopulaBridgeOpensAt(cursor.tokens, pos + offset)
  );
  return bridgeOffset < 0 ? aux : aux.slice(0, bridgeOffset);
}

function matchDegreeIntensifierCore(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): {
  readonly consumed: number;
  readonly mode: DegreeIntensifierMode;
  readonly variant: DegreeIntensifierVariant;
  readonly polite: boolean;
  readonly past: boolean;
} | null {
  const { tokens, pos, end: n } = cursor;
  const tail = tokens[pos];
  if (tail === undefined || pos >= n) {
    return null;
  }

  if ((tail.pos & POS0) === 動詞 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    const aux = collectAuxAt(cursor, pos + 1);
    if (!auxHasNegation(aux) && !auxHasNegativePolite(aux)) {
      return null;
    }
    const afterAux = pos + 1 + aux.length;
    const become = cursor.lookahead(afterAux - pos, matchDegreeBecomeCarrier);
    if (become !== null) {
      return {
        consumed: 1 + aux.length + become.consumed,
        mode: "become",
        variant: "bear",
        polite: become.polite,
        past: become.past
      };
    }
    return {
      consumed: 1 + aux.length,
      mode: "terminal",
      variant: "bear",
      polite: auxHasPolite(aux),
      past: auxHasPast(aux)
    };
  }

  if ((tail.pos & POS0) === 形容詞0 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    const aux = collectAuxAt(cursor, pos + 1);
    const tailPos5A = tail.pos & POS5A;
    if ((tailPos5A & POS5A) === 連用形_) {
      const become = cursor.lookahead(1, matchDegreeBecomeCarrier);
      if (become !== null) {
        return {
          consumed: 1 + become.consumed,
          mode: "become",
          variant: "helpless",
          polite: become.polite,
          past: become.past
        };
      }
    }
    return {
      consumed: 1 + aux.length,
      mode: "terminal",
      variant: "helpless",
      polite: auxHasPolite(aux),
      past: auxHasPast(aux) || tailPos5A === 連用形_促音便
    };
  }

  if ((tail.pos & POS0) === 名詞 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    let scan = pos + 1;
    const marker = tokens[scan];
    if (marker !== undefined && marker.surface === "が" && (marker.pos & POS0) === 助詞) {
      scan += 1;
    }
    const head = tokens[scan];
    if (head === undefined) {
      return null;
    }
    const headPos5A = head.pos & POS5A;
    if (isAdjNai(head)) {
      if ((headPos5A & POS5A) === 連用形_) {
        const become = cursor.lookahead(scan + 1 - pos, matchDegreeBecomeCarrier);
        if (become !== null) {
          return {
            consumed: (scan - pos) + 1 + become.consumed,
            mode: "become",
            variant: "helpless",
            polite: become.polite,
            past: become.past
          };
        }
      }
      const aux = collectAuxAt(cursor, scan + 1);
      return {
        consumed: (scan - pos) + 1 + aux.length,
        mode: "terminal",
        variant: "helpless",
        polite: auxHasPolite(aux),
        past: auxHasPast(aux) || headPos5A === 連用形_促音便
      };
    }
    if (isVerbLemma(head, "なくなる")) {
      const aux = collectAuxAt(cursor, scan + 1);
      return {
        consumed: (scan - pos) + 1 + aux.length,
        mode: "become",
        variant: "helpless",
        polite: auxHasPolite(aux),
        past: auxHasPast(aux) || headPos5A === 連用形_促音便
      };
    }
    if (isAruOrGozaruVerbToken(head)) {
      const masu = tokens[scan + 1];
      const nu = tokens[scan + 2];
      if (masu === undefined || nu === undefined || (masu.pos & POS4) !== 助動詞_マス || (nu.pos & POS4) !== 助動詞_ヌ) {
        return null;
      }
      const aux = collectAuxAt(cursor, scan + 3);
      return {
        consumed: (scan - pos) + 3 + aux.length,
        mode: "terminal",
        variant: "helpless",
        polite: true,
        past: auxHasPast(aux)
      };
    }
  }

  return null;
}

function matchDegreeBecomeCarrier(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean } | null {
  const { tokens, pos, end: n } = cursor;
  const naru = tokens[pos];
  if (naru === undefined || pos >= n || !isVerbLemma(naru, "なる")) {
    return null;
  }
  const aux = collectAuxAt(cursor, pos + 1);
  return {
    consumed: 1 + aux.length,
    polite: auxHasPolite(aux),
    past: auxHasPast(aux)
  };
}


type ModalMatcher = (
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
) => ModalMatch | null;

interface ModalMatch {
  readonly op: ModalOp;
  readonly consumed: number;
  readonly terminal?: AuxLayerNode["terminal"];
  readonly ops?: readonly AuxOpNode[];
}

function modalMatchWithFusedConjecture(
  match: ModalMatch,
  negEnd: NegationEndingMatch,
  tokens: readonly RuntimeHaruToken[],
  start: number
): ModalMatch {
  if (negEnd.conjecture !== true) {
    return match;
  }
  const conjectureIdx = start + match.consumed - 1;
  const conjectureToken = tokens[conjectureIdx];
  if (conjectureToken === undefined) {
    return match;
  }
  return {
    ...match,
    ops: [match.op, buildConjectureOp(srcSingle(conjectureToken, conjectureIdx), false)]
  };
}

interface ModalMatchContext {
  readonly previousOps: readonly AuxOpNode[];
  readonly lookups?: LookupTables;
  readonly input?: ParseInput;
  readonly elidedColloquialObligationContext?: ElidedColloquialObligationContext;
}

function matchHazu(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isHazuNounToken(t0)) return null;

  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return canBareBoundModalCarrierTerminate(pos + 1, n)
      ? { op: buildHazuOp(srcSlice(tokens, pos, 1), "affirmative", false), consumed: 1 }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  const hazuNominalLink = nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] });
  if (hazuNominalLink !== null) {
    const negEnd = matchNegationEnding(tokens, hazuNominalLink.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = hazuNominalLink.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, consumed), "negative", negEnd.polite),
        consumed,
        terminal: "attributive"
      }, negEnd, tokens, pos);
    }
    return {
      op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", false),
      consumed: 2,
      terminal: "attributive"
    };
  }

  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  const hazuDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (hazuDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, hazuDewa.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = hazuDewa.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, consumed), "negative", negEnd.polite),
        consumed
      }, negEnd, tokens, pos);
    }
  }

  if (t1pos5A === 終止形_ || t1pos5A === 連用形_) {
    if (t1pos4 === 助動詞_ダ) {
      return { op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", false), consumed: 2 };
    }
    if (t1pos4 === 助動詞_デス) {
      return { op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", true), consumed: 2 };
    }
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
  ) {
    return { op: buildHazuOp(srcSlice(tokens, pos, 1), "affirmative", false), consumed: 1 };
  }
  return null;
}

function isHazuNounToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 &&
    ((token.dictionaryForm || token.surface) === "はず" || (token.dictionaryForm || token.surface) === "筈");
}

export function buildHazuOp(
  source: OpSource,
  polarity: "affirmative" | "negative",
  polite: boolean
): HazuModalOp {
  return createModalOp({

    modal: "hazu",
    source,
    polarity,
    polite,
    past: false
  });
}

function matchMono(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const lookups = ctx.lookups;
  const t0 = tokens[pos];
  if (
    lookups === undefined ||
    t0 === undefined ||
    (t0.pos & POS0) !== 名詞 ||
    !lookups.MONO_MODAL_CARRIER_FORMS.has(t0.surface)
  ) {
    return null;
  }
  const host = monoModalHostFacts(stemToken, ctx.previousOps);
  if (host === null || !isAttributiveHostEnding(tokens[pos - 1])) {
    return null;
  }
  const copula = monoModalAffirmativeCopulaAt(tokens, pos + 1, n);
  if (copula === null) {
    return null;
  }
  const evidence = monoModalEvidenceAt(ctx, pos, lookups);
  const form: MonoModalForm = lookups.MONO_MODAL_DEFAULT_READING_CARRIER_FORMS.has(t0.surface) ? "mon" : "mono";
  if (!monoModalAdmits(form, host, evidence, copula.past)) {
    return null;
  }
  return {
    op: buildMonoOp(srcSlice(tokens, pos, 1 + copula.consumed), form, evidence, copula.polite),
    consumed: 1 + copula.consumed
  };
}

function isAttributiveHostEnding(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return true;
  }
  const pos5A = token.pos & POS5A;
  return pos5A === 連体形_ || pos5A === 終止形_;
}

interface MonoModalHostFacts {
  readonly past: boolean;
  readonly desire: boolean;
}

function monoModalHostFacts(
  stemToken: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): MonoModalHostFacts | null {
  const last = previousOps[previousOps.length - 1];
  if (last === undefined) {
    const stemPos0 = stemToken.pos & POS0;
    return stemPos0 === 動詞 || stemPos0 === 形容詞0 ? { past: false, desire: false } : null;
  }
  if (last.kind === "copula" || last.kind === "modal" || last.kind === "connective") {
    return null;
  }
  return {
    past: hostCarriesPreModalPast(previousOps, previousOps.length),
    desire: (last.kind === "desire" && last.form === undefined) ||
      (last.kind === "aspect" && last.aspect === "te_hoshii")
  };
}

function monoModalAffirmativeCopulaAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  end: number
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean } | null {
  const copula = idx < end ? tokens[idx] : undefined;
  if (copula === undefined || (copula.pos & POS0) !== 助動詞) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const isPlain = pos4 === 助動詞_ダ || pos4 === 助動詞_ジャ || pos4 === 助動詞_ヤ;
  const isPolite = pos4 === 助動詞_デス;
  if (!isPlain && !isPolite) {
    return null;
  }
  const pos5A = copula.pos & POS5A;
  const next = idx + 1 < end ? tokens[idx + 1] : undefined;
  if (pos5A === 意志推量形_) {
    return { consumed: 0, polite: false, past: false };
  }
  if (pos5A === 連用形_) {
    return next !== undefined && (next.pos & POS4) === 助動詞_タ && (next.pos & POS5A) !== 仮定形_
      ? { consumed: 1, polite: isPolite, past: true }
      : null;
  }
  if (pos5A !== 終止形_) {
    return null;
  }
  if (next !== undefined && (next.pos & POS0) === 助詞) {
    const pos1 = next.pos & POS1;
    if (
      pos1 === 接続助詞 ||
      (pos1 === 副助詞 && quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] }) === null)
    ) {
      return null;
    }
    if (pos1 === 終助詞 && kaMarkerRelationAt(tokens, idx + 1, ["tail_multi_clause"]) !== null) {
      return null;
    }
  }
  return { consumed: 1, polite: isPolite, past: false };
}

function monoModalEvidenceAt(ctx: ModalMatchContext, pos: number, lookups: LookupTables): MonoModalEvidence {
  const input = ctx.input;
  if (input === undefined) {
    return MONO_MODAL_NO_EVIDENCE;
  }
  const tokens = input.contextTokens ?? input.tokens;
  return monoModalClauseEvidence(tokens, sourceIndexForInputPosition(input, pos), lookups, activeProtoLayout());
}

function monoModalAdmits(
  form: MonoModalForm,
  host: MonoModalHostFacts,
  evidence: MonoModalEvidence,
  copulaPast: boolean
): boolean {
  if (form === "mon") {
    return true;
  }
  return host.desire ||
    evidence.admirativeAdverb ||
    (evidence.frequencyAdverb && (host.past || copulaPast));
}

export function buildMonoOp(
  source: OpSource,
  form: MonoModalForm,
  evidence: MonoModalEvidence,
  polite: boolean
): MonoModalOp {
  return createModalOp({
    modal: "mono",
    source,
    form,
    reading: "nominal",
    candidates: MONO_MODAL_READING_VALUES,
    evidence,
    polite,
    past: false
  });
}

const BARE_KAMO_EVIDENCE_SCOPE = { scope: "sentence" } as const;

function bareKamoAdmissionContext(
  ctx: ModalMatchContext,
  pos: number
): BareKamoAdmissionContext | undefined {
  const input = ctx.input;
  if (input === undefined || ctx.lookups === undefined) {
    return undefined;
  }
  const tokens = input.contextTokens ?? input.tokens;
  const kaIndex = sourceIndexForInputPosition(input, pos);
  const layout = activeProtoLayout() ?? undefined;

  return {
    tokens,
    kaIndex,
    clauseContainsInterrogative: clauseContainsInterrogativeBeforeKa(tokens, kaIndex, ctx.lookups, layout, BARE_KAMO_EVIDENCE_SCOPE) ||
      clauseContainsLexicalizedInterrogativeBefore(tokens, kaIndex, ctx.lookups, layout, BARE_KAMO_EVIDENCE_SCOPE),
    clauseContainsPredicateChoiceKa: clauseContainsPredicateChoiceKaBefore(tokens, kaIndex, layout)
  };
}

function matchKamo(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  return cursor.lookahead(0, c => {
    const match = matchKamoShirenaiSequence(c, bareKamoAdmissionContext(ctx, pos));
    if (match === null) {
      return null;
    }
    const consumed = c.pos - pos;
    return {
      op: buildKamoOp(srcSlice(tokens, pos, consumed), match.polite, match.bare),
      consumed
    };
  });
}

export function buildKamoOp(source: OpSource, polite: boolean, bare = false): KamoModalOp {
  return createModalOp({

    modal: "kamo",
    source,
    polite,
    past: false,
    outerLayers: 0,
    bare
  });
}

const TERMINAL_SFP_RUN_BRIDGE_LIMIT = 4;

function matchTerminalSfpArbitration(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return matchPredicateConfirmationJanaiSfp(input, cursor, stemTok, ops) ??
    matchTerminalSfp(input, cursor, stemTok, ops) ??
    matchConnectiveFinalSfp(input, cursor, stemTok, ops) ??
    matchTailFinalQuestionSfp(cursor, ops, input.lookups);
}

export function matchPredicateQuoteCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  hostStem?: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[] = [],
  input?: ParseInput,
  options: {
    readonly allowTerminalBareTo?: boolean;
    readonly allowTerminalToka?: boolean;
    readonly quotedPropositionClosedBySfp?: boolean;
  } = {}
): PredicateQuoteCarrierOp | null {
  const { tokens, pos, end: n } = cursor;
  const carrierMood = quotedPropositionMood(hostStem, previousOps);
  const moodPayload = quotedMoodPayload(carrierMood);
  const withTosuruMode = (
    op: PredicateQuoteCarrierOp,
    carrier: RuntimeHaruToken,
    after: number
  ): PredicateQuoteCarrierOp => {
    if (op.style !== "suru_attributive" || hostStem === undefined) {
      return op;
    }
    const mode = tosuruConstructionModeForToken(hostStem);
    const effectiveMode = mode === "resultative_make" &&
      tosuruResultativeMakeYieldsToAttributiveQuoteHead(carrier, tokens[after])
      ? "quote"
      : mode;
    return { ...op, tosuruMode: effectiveMode };
  };
  const atSourceTerminal = (endExclusive: number): boolean => {
    const contextTokens = input?.contextTokens ?? input?.tokens;
    return contextTokens !== undefined &&
      !hasRealContentAfterIndex(
        contextTokens,
        sourceIndexForInputPosition(input!, endExclusive),
        { stopAtHardTerminal: true }
      );
  };
  const quote = tokens[pos];
  if (isRedundantPredicateQuoteCopula(quote)) {
    const carrier = tokens[pos + 2];
    const actualQuoteMarker = quoteMarkerRelationAt(tokens, pos + 1, {
      consumers: ["tail_multi_clause"]
    });
    if (
      actualQuoteMarker?.canonicalSurface === "と" &&
      carrier !== undefined
    ) {
      const after = pos + 3;
      const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
      if (style !== null && cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
        cursor.advance(3);
        return withTosuruMode(buildPredicateQuoteCarrierOp(
          srcSlice(tokens, pos, 3),
          style,
          `${quote.surface}${actualQuoteMarker.surface}${carrier.surface}`,
          moodPayload
        ), carrier, after);
      }
    }
  }
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: n
  });
  const lastPreviousOp = previousOps.at(-1);
  const followsNodaQuestionContent = lastPreviousOp?.kind === "modal" && lastPreviousOp.modal === "noda";
  if (questionQuote?.continuationKind === "question_quote_marker" && !followsNodaQuestionContent) {
    const carrier = tokens[questionQuote.span.endExclusive];
    if (
      carrier !== undefined &&
      predicateQuoteCarrierStyle(cursor, carrier, questionQuote.span.endExclusive + 1, lookups, input) === "compact_toiu"
    ) {
      const after = questionQuote.span.endExclusive + 1;
      if (cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
        cursor.advance(after - pos);
        return buildPredicateQuoteCarrierOp(
          srcSlice(tokens, pos, after - pos),
          "question_toiu",
          `${questionQuote.surface}${carrier.surface}`,
          quotedMoodPayload(quotedPropositionMood(hostStem, previousOps, null, true))
        );
      }
    }
  }
  if (
    quote !== undefined &&
    quote.surface === "だって" &&
    (quote.pos & POS0) === 助詞
  ) {
    const carrier = tokens[pos + 1];
    const datteTerminalSfpRunCloses = carrier !== undefined &&
      input !== undefined &&
      terminalDiscourseSfpRunClosesUtterance(cursor, input, 1);
    if (
      (carrier === undefined || datteTerminalSfpRunCloses) &&
      atSourceTerminal(pos + 1) &&
      classifyDatteMarkerAt(cursor, lookups, {
        terminalBoundary: true,
        ...(previousOps.at(-1)?.kind === "aspect" &&
          (previousOps.at(-1) as { aspect?: string }).aspect !== undefined &&
          ((previousOps.at(-1) as { aspect?: string }).aspect === "te_kudasai" ||
            (previousOps.at(-1) as { aspect?: string }).aspect === "te_kure_tanomu")
          ? { precedingRequestAspect: (previousOps.at(-1) as { aspect: "te_kudasai" | "te_kure_tanomu" }).aspect }
          : {})
      }).role === "hearsay_terminal"
    ) {
      cursor.advance(1);
      return buildPredicateQuoteCarrierOp(srcSlice(tokens, pos, 1), "compact_toiu", "だって", {
        sourceTerminal: true,
        ...moodPayload
      });
    }
    if (carrier === undefined) {
      return null;
    }
    const after = pos + 2;
    const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
    if (style === null) {
      return null;
    }
    if (!cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
      return null;
    }
    cursor.advance(2);
    return withTosuruMode(buildPredicateQuoteCarrierOp(
      srcSlice(tokens, pos, 2),
      style,
      `${quote.surface}${carrier.surface}`,
      moodPayload
    ), carrier, after);
  }
  if (options.allowTerminalToka === true) {
    const tokaMarker = tokaTteCompositeQuoteCandidateAt(tokens, pos, {
      consumers: ["tail_multi_clause"]
    }) ?? tokaQuoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
    const closingOpForToka = previousOps.at(-1);
    const tokaQuoteEvidence = tokaMarker?.canonicalSurface === "とかって" ||
      options.quotedPropositionClosedBySfp === true ||
      (closingOpForToka?.kind === "modal" && closingOpForToka.modal === "noda") ||
      (closingOpForToka?.kind === "connective" && closingOpForToka.connective === "adversative");
    if (
      tokaMarker !== null &&
      tokaQuoteEvidence &&
      tokaMarker.span.endExclusive >= n &&
      atSourceTerminal(tokaMarker.span.endExclusive)
    ) {
      cursor.advance(tokaMarker.span.endExclusive - pos);
      return buildPredicateQuoteCarrierOp(
        srcSlice(tokens, pos, tokaMarker.span.endExclusive - pos),
        "compact_toiu",
        tokaMarker.surface,
        { sourceTerminal: true, ...moodPayload }
      );
    }
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return null;
  }
  const carrier = tokens[quoteMarker.span.endExclusive];
  const contextTokens = input?.contextTokens ?? input?.tokens;
  const sourceTerminal = contextTokens !== undefined &&
    !hasRealContentAfterIndex(
      contextTokens,
      sourceIndexForInputPosition(input!, quoteMarker.span.endExclusive),
      { stopAtHardTerminal: true }
    );
  const markerClosesSlice = carrier === undefined || sourceTerminal;
  if (markerClosesSlice) {
    const bareTerminalTo = options.allowTerminalBareTo === true &&
      quoteMarker.canonicalSurface === "と";
    const quotedNominalTo = input?.quotedNominalHost === true &&
      quoteMarker.canonicalSurface === "と" &&
      carrier === undefined;
    if (quoteMarker.canonicalSurface === "って" || bareTerminalTo || quotedNominalTo) {
      const imperativeHost = hostStem !== undefined && isImperativeInflection(hostStem.pos);
      if (imperativeHost && input?.quoteAttributiveHeadFrame === undefined && !quotedNominalTo) {
        return null;
      }
      if (bareTerminalTo && !quotedNominalTo && !sourceTerminal) {
        return null;
      }
      if (
        bareTerminalTo &&
        !quotedNominalTo &&
        !quotedPropositionMoodExcludesConditional(
          tokens,
          pos,
          previousOps,
          options.quotedPropositionClosedBySfp === true
        )
      ) {
        return null;
      }
      cursor.advance(quoteMarker.span.endExclusive - pos);
      return buildPredicateQuoteCarrierOp(
        srcSlice(tokens, pos, quoteMarker.span.endExclusive - pos),
        "compact_toiu",
        quoteMarker.surface,
        {
          ...(sourceTerminal ? { sourceTerminal: true } : {}),
          ...quotedMoodPayload(carrierMood),
          ...(carrierMood === "volitional" &&
            !sourceTerminal &&
            quoteMarker.canonicalSurface === "って" &&
            input?.quoteAttributiveHeadFrame?.bareQuoteVolitionalContentFlavor !== undefined
            ? { volitionalContentAttributive: input.quoteAttributiveHeadFrame.bareQuoteVolitionalContentFlavor }
            : {})
        }
      );
    }
    return null;
  }
  if (isNonQuoteToSuruContext(tokens, pos, carrier)) {
    return null;
  }
  if (
    quoteMarker.canonicalSurface === "って" &&
    isWakeNounToken(carrier) &&
    cursor.lookahead(quoteMarker.span.endExclusive - pos, c => predicateQuoteCarrierCanContinue(c, lookups))
  ) {
    cursor.advance(quoteMarker.span.endExclusive - pos);
    return buildPredicateQuoteCarrierOp(
      srcSlice(tokens, pos, quoteMarker.span.endExclusive - pos),
      "compact_toiu",
      quoteMarker.surface,
      moodPayload
    );
  }
  const after = quoteMarker.span.endExclusive + 1;
  const style = predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input);
  if (style === null) {
    return null;
  }
  if (!cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups))) {
    return null;
  }
  cursor.advance(after - pos);
  return withTosuruMode(buildPredicateQuoteCarrierOp(
    srcSlice(tokens, pos, after - pos),
    style,
    `${quoteMarker.surface}${carrier.surface}`,
    moodPayload
  ), carrier, after);
}

function matchTerminalPastQuoteAllomorphCarrier(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): PredicateQuoteCarrierOp | null {
  const { tokens, pos, end: n } = cursor;
  const te = tokens[pos];
  if (te === undefined || te.surface !== "て" || (te.pos & POS01) !== 助詞_接続助詞) {
    return null;
  }
  const lastOp = ops[ops.length - 1];
  if (lastOp?.kind !== "tense" || lastOp.tense !== "past") {
    return null;
  }
  const pastToken = lastOp.source.tokens[lastOp.source.tokens.length - 1];
  if (
    pastToken === undefined ||
    !isPastAuxiliaryPos(pastToken.pos) ||
    !isTerminalOrAttributiveInflection(pastToken.pos)
  ) {
    return null;
  }
  if (pos + 1 < n && !terminalDiscourseSfpRunClosesUtterance(cursor, input, 1)) {
    return null;
  }
  cursor.advance(1);
  return buildPredicateQuoteCarrierOp(srcSlice(tokens, pos, 1), "compact_toiu", "って", {
    sourceTerminal: true,
    ...quotedMoodPayload(quotedPropositionMood(undefined, ops))
  });
}

export function buildPredicateQuoteCarrierOp(
  source: OpSource,
  style: PredicateQuoteCarrierOp["style"],
  surface: string,
  options: Pick<PredicateQuoteCarrierOp, "quotedMood" | "tosuruMode" | "sourceTerminal" | "volitionalContentAttributive"> = {}
): PredicateQuoteCarrierOp {
  return createPredicateQuoteCarrierOp({ style, surface, source, ...options });
}

function predicateQuoteCarrierStyle(
  cursor: TokenCursor<RuntimeHaruToken>,
  carrier: RuntimeHaruToken,
  after: number,
  lookups: LookupTables,
  input?: ParseInput
): PredicateQuoteCarrierOp["style"] | null {
  const { tokens, end: n } = cursor;
  const form5A = carrier.pos & POS5A;
  if (form5A === 連体形_) {
    if (isSayVerbToken(carrier)) {
      return "compact_toiu";
    }
    if (isSuruVerbToken(carrier)) {
      return "suru_attributive";
    }
  }
  if (isSayVerbToken(carrier) && after - 1 >= cursor.pos) {
    const context = input === undefined
      ? { tokens, index: after - 1 }
      : contextAlignedPosition(input, cursor, after - 1);
    if (context.tokens[context.index] === carrier && toiuIuStandsAsAttributiveCarrier(context.tokens, context.index)) {
      return "compact_toiu";
    }
  }
  if (isSuruVerbToken(carrier) && form5A === 連用形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 未然形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 仮定形_) {
    return "suru_attributive";
  }
  if (isSuruVerbToken(carrier) && form5A === 意志推量形_) {
    return "suru_attributive";
  }
  if (
    (carrier.pos & POS0) === 動詞 &&
    carrier.dictionaryForm === "なる" &&
    isTeAuxActivationAccepted(carrier, tokens[after])
  ) {
    return "naru_result";
  }
  if (
    isSuruVerbToken(carrier) &&
    form5A === 終止形_ &&
    (after >= n ||
      cursor.lookahead(after - cursor.pos, c => predicateQuoteCarrierStartsAt(c, lookups)) ||
      suruHostClauseContinuationFollows(tokens, after))
  ) {
    return "suru_attributive";
  }
  return null;
}

function suruHostClauseContinuationFollows(
  tokens: readonly RuntimeHaruToken[],
  after: number
): boolean {
  const next = tokens[after];
  if (next === undefined) {
    return false;
  }
  if ((next.pos & POS0) === 助詞) {
    const pos1 = next.pos & POS1;
    return pos1 === 接続助詞 || pos1 === 格助詞 || pos1 === 係助詞;
  }
  return classifyAux(next, tokens[after + 1]).classifications.includes("connective");
}

export function predicateQuoteCarrierStartsAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  input?: ParseInput
): boolean {
  const { tokens, pos } = cursor;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return false;
  }
  const carrier = tokens[quoteMarker.span.endExclusive];
  if (carrier === undefined || isNonQuoteToSuruContext(tokens, pos, carrier)) {
    return false;
  }
  const after = quoteMarker.span.endExclusive + 1;
  return predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input) !== null &&
    cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups));
}

function isNonQuoteToSuruContext(
  tokens: readonly RuntimeHaruToken[],
  quoteIdx: number,
  carrier: RuntimeHaruToken
): boolean {
  if (!isSuruVerbToken(carrier)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, quoteIdx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev !== undefined && (prev.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return adverbialToCapableKeijoujiHost(prev);
}

function predicateQuoteCarrierCanContinue(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos, end: n } = cursor;
  if (pos >= n) {
    return true;
  }
  const teMo = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (teMo !== null && (teMo.surface === "ても" || teMo.surface === "でも")) {
    return true;
  }
  if (matchTeConnectiveHeadAt(tokens, pos) !== null) {
    return true;
  }
  if (matchTameConnectiveAt(tokens, pos, { requireEnd: true, lookups }) !== null) {
    return true;
  }
  if (matchToConditionalConnective(cursor) !== null) {
    return true;
  }
  if (predicateQuoteCarrierStartsAt(cursor, lookups)) {
    return true;
  }
  const modalStemIdx = previousNonSpaceIndex(tokens, pos);
  const modalStem = (modalStemIdx === null ? undefined : tokens[modalStemIdx]) ?? tokens[pos]!;
  if (cursor.lookahead(0, c => matchYouda(c, modalStem)) !== null) {
    return true;
  }
  if (classifyAux(tokens[pos]!, tokens[pos + 1]).classifications.length > 0) {
    return true;
  }
  if (cursor.lookahead(0, matchScopeBridge) !== null) {
    return true;
  }
  if (toiuAttributiveContinuationHeadIndex(tokens, pos, n) !== null) {
    return true;
  }
  if (cursor.lookahead(0, matchWakeImpossibleIdiom) !== null) {
    return true;
  }
  if (wakeExplanatoryCopulaPolite(tokens[pos], tokens[pos + 1]) !== null) {
    return true;
  }
  if (wakeExplanatoryCopulaConjecture(tokens[pos], tokens[pos + 1]) !== null) {
    return true;
  }
  return matchPredicateProjectionConnectiveAt(tokens, pos, { requireEnd: true, lookups }) !== null;
}

function isRedundantPredicateQuoteCopula(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    token.surface === "だ" &&
    (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 終止形_);
}

function installsPredicateHeadOverStem(op: AuxOpNode): boolean {
  return op.kind === "predicateQuoteCarrier" ||
    op.kind === "predicateProjectionCarrier" ||
    op.kind === "postverbAuxiliary" ||
    op.kind === "idiom" ||
    op.kind === "modal" ||
    op.kind === "scopeBridge";
}

function boundNominalReasonQuoteCarrierHostAt(
  input: ParseInput,
  ops: readonly AuxOpNode[],
  stemPos: number
): boolean {
  const dominatingHead = ops.filter(installsPredicateHeadOverStem).at(-1);
  if (dominatingHead !== undefined) {
    return dominatingHead.kind === "predicateQuoteCarrier" &&
      (dominatingHead.style === "compact_toiu" || dominatingHead.style === "question_toiu");
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  return boundNominalReasonQuoteCarrierStemAt(
    contextTokens,
    sourceIndexForInputPosition(input, stemPos)
  );
}

function matchBoundNominalReasonConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchBoundNominalReasonConnectiveAt(cursor.tokens, cursor.pos);
  if (match === null) return null;
  if (match.requiresClauseContinuation === true) {
    const context = contextAlignedPosition(input, cursor, cursor.pos);
    if (
      context.tokens !== cursor.tokens &&
      matchBoundNominalReasonConnectiveAt(context.tokens, context.index) === null
    ) {
      return null;
    }
    if (!boundNominalReasonClauseContinuationFollows(input, cursor.pos + match.consumed)) {
      return null;
    }
  }
  const op = connectiveOpFromMatch(match, cursor);
  return match.formalNoun === "mono" ? { ...op, boundNominalReasonMonoNoun: true } : op;
}

function boundNominalReasonClauseContinuationFollows(
  input: ParseInput,
  connectiveEndPos: number
): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  return boundNominalReasonClauseContinuationEvidenceAt(
    contextTokens,
    sourceIndexForInputPosition(input, Math.max(connectiveEndPos - 1, 0)),
    sourceIndexForInputPosition(input, connectiveEndPos),
    input.lookups
  );
}

function matchBoundNominalListingConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchBoundNominalListingConnectiveAt(cursor.tokens, cursor.pos);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchTameQuotedJudgmentPassiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchTameQuotedJudgmentPassiveConnectiveAt(cursor);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchTokoroResultConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const contextTokens = input.contextTokens ?? input.tokens;
  const index = sourceIndexForInputPosition(input, cursor.pos);
  if (contextTokens[index] !== cursor.tokens[cursor.pos]) {
    return null;
  }
  const match = matchTokoroResultConnectiveAt(contextTokens, index, { previousOps, lookups: input.lookups });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchTameConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemToken: RuntimeHaruToken,
  lookups: LookupTables
): ConnectiveOp | null {
  const match = matchTameConnectiveAt(cursor.tokens, cursor.pos, { previousOps, stemToken, lookups });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchPlainNominalizerTerminal(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  allowSliceFinalNominalizer: boolean,
  lookups: LookupTables
): AuxLayerNode["terminalPayload"] | null {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(token, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (
    nominalizer?.nominalizerKind !== "no" ||
    (token === undefined || (token.pos & POS1) !== 準体助詞)
  ) {
    return null;
  }
  const next = tokens[pos + 1];
  if (next === undefined) {
    if (pos !== n - 1 || !allowSliceFinalNominalizer) {
      return null;
    }
  } else {
    const context = contextAlignedPosition(input, cursor, pos);
    if (!isPlainNominalizerParticleFollowerAt(
      context.tokens,
      context.index + 1,
      lookups,
      ["tail_boundary_readiness"]
    )) {
      return null;
    }
  }
  cursor.advance();
  return { kind: "nominalized", nominalizerSource: "overt_no", source: srcSingle(token, pos) };
}

function matchArimasenPoliteNegativeSupport(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  ops: readonly AuxOpNode[]
): { readonly polite: PoliteOp; readonly negation: NegationOp } | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const aru = cursor.current();
  const mase = cursor.peek(1);
  const n = cursor.peek(2);
  if (
    aru === undefined ||
    (aru.dictionaryForm || aru.surface) !== "ある" ||
    (aru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return null;
  }
  if (
    mase === undefined ||
    (mase.pos & (POS4 | POS5A)) !== (助動詞_マス | 未然形_)
  ) {
    return null;
  }
  if (
    n === undefined ||
    (n.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ヌ)
  ) {
    return null;
  }
  if (!canAttachArimasenPoliteNegativeSupport(stem, ops)) {
    return null;
  }
  cursor.advance(3);
  return {
    polite: createPoliteOp({  source: srcSingle(mase, pos + 1) }),
    negation: createNegationOp({

      source: srcSlice(tokens, pos, 3),
      chainDepth: 1,
      chainPast: false,
      stemAux: [],
      preferShortNegation: false
    })
  };
}

function matchCopulaAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly allowAdnominalTerminal?: boolean } = {},
  input?: ParseInput
): { readonly op: CopulaOp; readonly ops?: readonly AuxOpNode[]; readonly adnominal: boolean } | null {
  const pos = cursor.pos;
  const sourceContext = input === undefined
    ? undefined
    : {
      tokens: input.contextTokens ?? input.tokens,
      index: sourceIndexForInputPosition(input, pos)
    };
  const match = matchCopula(cursor.tokens, pos, lookups, {
    ...options,
    ...(input?.allowElidedDewaNegativeBody === undefined
      ? {}
      : { elidedDewaNegativeBody: input.allowElidedDewaNegativeBody }),
    ...(sourceContext === undefined ? {} : { sourceContext })
  });
  if (match === null) {
    return null;
  }
  const adnominal = isAdnominalCopulaMatch(cursor.tokens, pos, match, lookups, sourceContext);
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    adnominal
  };
}

function canAttachArimasenPoliteNegativeSupport(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): boolean {
  const lastOp = ops[ops.length - 1];
  if (lastOp === undefined) {
    return isAdjLikeStemNode(stem);
  }
  const last = opLastSourceToken(lastOp);
  if (last === undefined || (last.pos & POS5A) !== 連用形_) {
    return false;
  }
  if (lastOp.kind === "desire") {
    return lastOp.form !== "tagaru";
  }
  if (lastOp.kind === "aspect" && lastOp.aspect === "te_hoshii") {
    return true;
  }
  if (lastOp.kind === "negation") {
    return true;
  }
  if (lastOp.kind === "copula" && lastOp.polarity === "negative") {
    return true;
  }
  return false;
}

function mergeNegationOps(
  previous: NegationOp,
  support: NegationOp
): NegationOp {
  return {
    ...previous,
    source: srcList(
      [...previous.source.tokens, ...support.source.tokens],
      [...previous.source.tokenIndices, ...support.source.tokenIndices]
    ),
    chainDepth: previous.chainDepth + support.chainDepth,
    chainPast: previous.chainPast || support.chainPast,
    stemAux: [...previous.stemAux, ...support.stemAux],
    preferShortNegation: false
  };
}

function matchNoda(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(t0, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") return null;
  const previousOp = ctx.previousOps[ctx.previousOps.length - 1];
  const previousOpIsNoda = previousOp?.kind === "modal" && previousOp.modal === "noda";

  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    if (previousOpIsNoda) return null;
    return canBareNodaCarrierTerminate(pos + 1, n)
      ? { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }
  if (isBareNodaCarrierTerminalSfpFollower(t1)) {
    if (previousOpIsNoda) return null;
    return { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  const fusedSupport = nominalizerCopulaSupportRelationAt(tokens, pos);
  if (fusedSupport?.form === "fused_connective" && fusedSupport.fusedIdx === pos + 1) {
    const noda = buildNodaOp(srcSlice(tokens, pos, 1), false);
    const connective: ConnectiveOp = createConnectiveOp({
      connective: fusedSupport.connectiveKind === "conditional" ? "conditional" : "even_if",
      surface: fusedSupport.connectiveSurface,
      source: srcSlice(tokens, pos + 1, 1)
    });
    return { op: noda, ops: [noda, connective], consumed: 2 };
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      bareNodaCarrierPrecedesToiuCarrier(ctx.input, cursor, pos + 1)
      ? { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }

  if (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_ジャ || t1pos4 === 助動詞_ヤ) {
    const support = matchNodaCopulaSupport(tokens, pos + 1);
    if (support !== null) {
      return {
        op: buildNodaOp(
          srcSlice(tokens, pos, 1 + support.consumed),
          support.polite,
          support.pastConditional
        ),
        consumed: 1 + support.consumed
      };
    }
    const t2 = tokens[pos + 2];
    const isCopulaPastConditional =
      t1pos5A === 連用形_ &&
      t2?.surface === "たら" &&
      (t2.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
    return { op: buildNodaOp(srcSlice(tokens, pos, 2), false, isCopulaPastConditional), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildNodaOp(srcSlice(tokens, pos, 2), true), consumed: 2 };
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    bareNodaCarrierPrecedesToiuCarrier(ctx.input, cursor, pos + 1)
  ) {
    return { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  return null;
}

function matchNodaDatteHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  _ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(t0, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") return null;

  const copula = tokens[pos + 1];
  const datte = tokens[pos + 2];
  const copulaPos4 = (copula?.pos ?? 0) & POS4;
  const copulaPos5A = (copula?.pos ?? 0) & POS5A;
  if (
    copula === undefined ||
    copulaPos5A !== 終止形_ ||
    datte === undefined ||
    (datte.pos & POS0) !== 助詞
  ) {
    return null;
  }
  const hearsayMarker =
    copulaPos4 === 助動詞_ダ || copulaPos4 === 助動詞_デス ? "って"
      : copulaPos4 === 助動詞_ヤ ? "て"
        : null;
  if (hearsayMarker === null || datte.surface !== hearsayMarker) {
    return null;
  }
  if (tokens[pos + 3] !== undefined) {
    return null;
  }
  return {
    op: buildSoudaHearsayOp(srcSlice(tokens, pos, 3), copulaPos4 === 助動詞_デス, "hearsay"),
    consumed: 3
  };
}

function canBareNodaCarrierTerminate(pos: number, end: number): boolean {
  return pos >= end;
}

function isBareNodaCarrierTerminalSfpFollower(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 助詞_終助詞;
}

function matchNodaCopulaSupport(
  tokens: readonly RuntimeHaruToken[],
  dePos: number
): { readonly consumed: number; readonly polite: boolean; readonly pastConditional: boolean } | null {
  const relation = nominalizerCopulaSupportRelationAt(tokens, dePos - 1);
  if (relation === null || relation.form !== "separate" || relation.copulaIdx !== dePos) {
    return null;
  }
  const support = tokens[relation.supportIdx]!;
  const next = tokens[dePos + 2];
  const politeConjecture =
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_マス | 意志推量形_);
  const pastConditional =
    (support.pos & POS5) === 連用形_促音便 &&
    next?.surface === "たら" &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
  return {
    consumed: politeConjecture ? 3 : 2,
    polite: relation.polite,
    pastConditional
  };
}

function bareNodaCarrierPrecedesToiuCarrier(
  input: ParseInput | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): boolean {
  const context = input === undefined
    ? { tokens: cursor.tokens as readonly RuntimeHaruToken[], index: pos }
    : contextAlignedPosition(input, cursor, pos);
  return toiuAttributiveTailEnd(context.tokens, context.index, context.tokens.length) !== null;
}

function canBareCarrierFeedFollowingTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  offset: number,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): boolean {
  const { tokens, pos: basePos } = cursor;
  const pos = basePos + offset;
  const next = tokens[pos];
  if (next === undefined) return false;
  if (cursor.lookahead(offset, c => tryMatchModal(c, stemToken, ctx)) !== null) {
    return true;
  }
  if (cursor.lookahead(offset, isTailFinalQuestionSfpStart)) {
    return true;
  }
  if (isOutgoingQuoteMarkerPosition(ctx.input, cursor, pos)) {
    return true;
  }
  const cls = classifyAux(next, tokens[pos + 1]).classifications;
  if (cls.includes("negation")) {
    return false;
  }
  return cls.includes("conjecture") ||
    cls.includes("conjecture_polite") ||
    cls.includes("rashii") ||
    cls.includes("connective");
}

function isOutgoingQuoteMarkerPosition(
  input: ParseInput | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): boolean {
  const hint = input?.outgoingBoundaryHint;
  if (input === undefined || hint === undefined || hint.quoteBoundary === undefined) {
    return false;
  }
  const context = contextAlignedPosition(input, cursor, pos);
  if (hint.tokenSpan.start !== sourceIndexForInputPosition(input, pos)) {
    return false;
  }
  return toiuAttributiveTailEnd(context.tokens, context.index, context.tokens.length) === null;
}

function canBareBoundModalCarrierTerminate(pos: number, end: number): boolean {
  return pos >= end;
}

function matchTailFinalQuestionSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const speakerAcknowledgment = isSpeakerAcknowledgmentTerminalKa(c, lookups);
    if (!isTailFinalQuestionSfpStart(c, lookups)) return null;
    const marker = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]);
    if (
      !speakerAcknowledgment &&
      marker !== null &&
      terminalQuestionKaRelationAt(tokens, pos, { lookups }) === null &&
      selfQuestionDiscourseSfpKaRelationAt(tokens, pos) === null
    ) {
      return null;
    }
    const token = tokens[pos]!;

    let effect: SfpNode["effect"];
    let surface = token.surface;
    const kaMarker = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]);
    if (
      kaMarker?.particleSubtype1 === 終助詞 ||
      (kaMarker?.particleSubtype1 === 副助詞 && (
        speakerAcknowledgment ||
        isMistaggedTerminalQuestionKa(c) ||
        isZeroCopulaNominalTerminalQuestionKa(c, lookups)
      ))
    ) {
      const combined = postKaCombinedTerminalSfpAt(tokens, pos);
      if (combined !== null) {
        effect = combined.effect;
        c.advance(1 + combined.consumed);
        surface = tokens.slice(pos, pos + 1 + combined.consumed).map((sourceToken) => sourceToken.surface).join("");
      } else {
        effect = "ka";
        c.advance(1);
      }
    } else if (isFusedSelfQuestionSfpSurface(token)) {
      effect = "kana";
      const kanaNe = tokens[pos + 1];
      if (
        kanaNe !== undefined &&
        (kanaNe.pos & POS01) === 助詞_終助詞 &&
        isTerminalNeSfpSurface(kanaNe)
      ) {
        c.advance(2);
        surface = `${token.surface}${kanaNe.surface}`;
      } else {
        c.advance(1);
      }
    } else {
      return null;
    }

    if (!opsCanAcceptTerminalSfp(ops)) {
      return null;
    }

    return {
      effect,
      surface,
      consumed: c.pos - pos,
      repeatCount: 1,
      ...(speakerAcknowledgment ? { speakerAcknowledgment: true as const } : {}),
      source: srcSlice(tokens, pos, c.pos - pos)
    };
  });
}

function isSpeakerAcknowledgmentTerminalKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  return lookups !== undefined &&
    kaOwnershipKindAt(cursor.tokens, cursor.pos, lookups) === "speaker_acknowledgment" &&
    kaFollowerIsTerminalOnly(cursor);
}

function isTailFinalQuestionSfpStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  if (token === undefined || pos >= n) return false;
  const kaSubtype = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"])?.particleSubtype1;
  if (isSpeakerAcknowledgmentTerminalKa(cursor, lookups)) return true;
  if (kaSubtype === 副助詞) {
    return isMistaggedTerminalQuestionKa(cursor) ||
      isZeroCopulaNominalTerminalQuestionKa(cursor, lookups);
  }
  if ((token.pos & POS01) !== 助詞_終助詞) return false;
  return kaSubtype === 終助詞 || isFusedSelfQuestionSfpSurface(token);
}

function isMistaggedTerminalQuestionKa(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos } = cursor;
  const prev = previousNonSpaceIndex(tokens, pos);
  if (prev === null) {
    return false;
  }
  const prevTok = tokens[prev];
  if (prevTok === undefined) {
    return false;
  }
  if (isDegreeExtentParticle(prevTok)) {
    return kaFollowerIsTerminalOnly(cursor);
  }
  const prevPos0 = prevTok.pos & POS0;
  if (prevPos0 !== 動詞 && prevPos0 !== 形容詞0 && prevPos0 !== 助動詞) {
    return false;
  }
  const prevForm = prevTok.pos & POS5A;
  if (prevForm !== 終止形_ && prevForm !== 意志推量形_) {
    return false;
  }
  return kaFollowerIsTerminalOnly(cursor);
}

function isZeroCopulaNominalTerminalQuestionKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens, pos } = cursor;
  const prev = previousNonSpaceIndex(tokens, pos);
  if (prev === null) {
    return false;
  }
  const prevPos0 = (tokens[prev]?.pos ?? 0) & POS0;
  if (prevPos0 !== 名詞 && prevPos0 !== 代名詞) {
    return false;
  }
  const kind = kaOwnershipKindAt(tokens, pos, lookups);
  if (kind !== "question" && kind !== "self_question_kana") {
    return false;
  }
  if (participatesInStructuralKaParallel(cursor.fork(pos, tokens.length, pos), lookups)) {
    return false;
  }
  return kaFollowerIsTerminalOnly(cursor);
}

function kaFollowerIsTerminalOnly(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function isTerminalNanteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function nanteContextFollowerCloses(input: ParseInput, pos: number): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  let idx = nextNonSpaceIndex(
    contextTokens,
    sourceIndexForInputPosition(input, pos) + 1,
    contextTokens.length
  );
  while (idx !== null) {
    const token = contextTokens[idx];
    if (token === undefined) {
      return true;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS)) {
      return true;
    }
    if ((token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
    idx = nextNonSpaceIndex(contextTokens, idx + 1, contextTokens.length);
  }
  return true;
}

function isTerminalBareTteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function isTerminalInsistentTteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const ba = cursor.tokens[cursor.pos + 1];
  if (ba === undefined || (ba.pos & POS01) !== 助詞_接続助詞 || ba.dictionaryForm !== "ば") {
    return false;
  }
  const scan = cursor.fork(cursor.pos + 2);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function matchTerminalSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    if (!opsCanAcceptTerminalSfp(ops)) return null;
    const token = tokens[pos];
    const precedingIdx = previousNonSpaceIndex(tokens, pos);
    const precedingToken = precedingIdx === null ? undefined : tokens[precedingIdx];
    if (
      token !== undefined &&
      isColloquialNaiNeeSurface(token.surface) &&
      (token.pos & POS01) === 助詞_終助詞 &&
      precedingToken !== undefined &&
      isColloquialNaiConnectionForm(precedingToken) &&
      !adjacentNegationClosesBeforeColloquialNe(ops)
    ) {
      return null;
    }
    if (
      token !== undefined &&
      token.surface === "なんて" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      isTerminalNanteFollower(c) &&
      nanteContextFollowerCloses(input, pos)
    ) {
      c.advance();
      consumeAdjacentYoThenTrailingSfpRun(c, stemToken.pos & POS0, ops.length > 0);
      const consumed = c.pos - pos;
      return {
        effect: "nante_excl",
        surface: tokens.slice(pos, pos + consumed).map((sourceToken) => sourceToken.surface).join(""),
        consumed,
        repeatCount: 1,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      token !== undefined &&
      token.surface === "って" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      isTerminalInsistentTteFollower(c)
    ) {
      c.advance(2);
      return {
        effect: "quotative_insistent",
        surface: "ってば",
        consumed: 2,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 2)
      };
    }
    if (
      token !== undefined &&
      token.surface === "って" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      (stemToken.pos & POS5A) === 命令形_ &&
      isTerminalBareTteFollower(c)
    ) {
      c.advance();
      return {
        effect: "quotative_command",
        surface: "って",
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1)
      };
    }
    const followingSfp = tokens[pos + 1];
    if (
      token !== undefined &&
      followingSfp !== undefined &&
      isTerminalWaSfpSurface(token) &&
      isTerminalNeSfpSurface(followingSfp) &&
      (token.pos & POS01) === 助詞_終助詞 &&
      (followingSfp.pos & POS01) === 助詞_終助詞
    ) {
      c.advance(2);
      const discursiveNeHost =
        (stemToken.pos & POS0) === 名詞 ||
        (stemToken.pos & POS0) === 形容詞0 ||
        isNaAdjCapable(stemToken);
      return {
        effect: discursiveNeHost ? "ne" : null,
        surface: `${token.surface}${followingSfp.surface}`,
        consumed: 2,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 2)
      };
    }
    if (
      token !== undefined &&
      isBungoProhibitiveNakareToken(token) &&
      ops.length === 0 &&
      (stemToken.pos & POS0) === 動詞 &&
      canAttachNaProhibitiveTerminalSfp(stemToken, ops)
    ) {
      c.advance();
      return {
        effect: "na_prohib",
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1),
        unambiguousProhibitive: true
      };
    }
    const detected = detectSfp(c, stemToken.pos & POS0, ops.length > 0);
    let consumed = c.pos - pos;
    if (consumed <= 0) {
      return matchNeutralTerminalSfp(c);
    }
    let parsed = sfpEffectFromDetected(detected);
    if (parsed === null) return null;
    const finalOp = ops.at(-1);
    if (
      parsed.effect === "na_excl" &&
      isPlainNaParticleSurface(token?.surface) &&
      finalOp?.kind === "aspect" &&
      (finalOp.aspect === "te_kuru" || finalOp.aspect === "te_iku")
    ) {
      parsed = { ...parsed, effect: "na_prohib" };
    }
    if (
      (parsed.effect === "jan" || parsed.effect === "yone_confirm") &&
      (isVolitionalTerminalContext(stemToken, ops) ||
        (isTerminalYoSfpSurface(token) && isImperativeTerminalContext(stemToken, ops)))
    ) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      parsed.effect === "speaker_assertion" &&
      (isVolitionalTerminalContext(stemToken, ops) || isImperativeTerminalContext(stemToken, ops))
    ) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (parsed.effect === "na_prohib" && !canAttachNaProhibitiveTerminalSfp(stemToken, ops)) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      isKaFamilyQuestionSfpEffect(parsed.effect) ||
      parsed.effect === "kana" ||
      parsed.effect === "polite_q" ||
      parsed.effect === "neg_confirm_q" ||
      parsed.effect === "neg_invite_q" ||
      parsed.effect === "neg_plain_q"
    ) {
      return null;
    }
    if (parsed.effect === "na_prohib") {
      consumeAdjacentYoThenTrailingSfpRun(c, stemToken.pos & POS0, ops.length > 0);
      consumed = c.pos - pos;
    }
    return {
      effect: parsed.effect,
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed,
      repeatCount: parsed.repeatCount,
      source: srcSlice(tokens, pos, consumed)
    };
  });
}

function matchNeutralTerminalSfp(
  cursor: TokenCursor<RuntimeHaruToken>
): SfpNode | null {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  if (
    token === undefined ||
    pos >= n ||
    !isNeutralTerminalSfpToken(token)
  ) {
    return null;
  }
  cursor.advance();
  return {
    effect: null,
    surface: token.surface,
    consumed: 1,
    repeatCount: 1,
    source: srcSlice(tokens, pos, 1)
  };
}

function canAttachNaProhibitiveTerminalSfp(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if (ops.length > 0) {
    return true;
  }
  const conjugationForm5A = stemToken.pos & POS5A;
  return conjugationForm5A === 終止形_ ||
    conjugationForm5A === 連体形_ ||
    (
      conjugationForm5A === 0 &&
      stemToken.dictionaryForm.length > 0 &&
      morphSurface(stemToken) === stemToken.dictionaryForm
    );
}

function matchPredicateConfirmationJanaiSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  const { pos, end: n } = cursor;
  if (!opsCanAcceptTerminalSfp(ops) || pos >= n) {
    return null;
  }
  const volitional = isVolitionalTerminalContext(stemToken, ops);
  if (ops.length === 0 && !volitional) {
    return null;
  }
  const ownershipTokens = input.contextTokens ?? input.tokens;
  const kaOwnershipAt = (pos: number) => janaiConfirmationKaOwnershipKindAt(
    ownershipTokens,
    sourceIndexForInputPosition(input, pos)
  );
  const jaMatch = cursor.tx(c => matchJaNaiConfirmationSequence(c, input.lookups, kaOwnershipAt));
  if (jaMatch !== null) {
    return volitional ? neutralizeSfpNodeEffect(jaMatch) : jaMatch;
  }
  const dewaMatch = cursor.tx(c => matchDewaNaiKaConfirmationSequence(c, input.lookups));
  if (dewaMatch !== null) {
    return volitional ? neutralizeSfpNodeEffect(dewaMatch) : dewaMatch;
  }
  const directDewaMatch = volitional
    ? cursor.tx(c => matchDirectDewaNaiKaConfirmationSequence(c, input.lookups))
    : null;
  if (directDewaMatch === null) return null;
  return neutralizeSfpNodeEffect(directDewaMatch);
}

function matchVolitionalConfirmationQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  return cursor.tx(cursor => {
    const pos = cursor.pos;
    if (!opsCanAcceptTerminalSfp(ops) || !isVolitionalTerminalContext(stemToken, ops)) {
      return null;
    }
    if (matchVolitionalConfirmationJanaiKa(cursor) === null) {
      return null;
    }
    const quotePos = cursor.pos;
    const contextTokens = input.contextTokens ?? input.tokens;
    const absoluteQuotePos = sourceIndexForInputPosition(input, quotePos);
    const relation = quoteStructuralRelationAt(contextCursorForInputPosition(input, quotePos), input.lookups);
    if (relation === undefined || relation.quote.slotKind !== "quoted_content") {
      return null;
    }
    const markerSpan = quoteConsumedMarkerSpanFromRelation(contextTokens, relation, input.lookups, {
      lowerBoundInclusive: absoluteQuotePos
    });
    const surface = quoteBoundarySurfaceFromRelation(contextTokens, relation, input.lookups, {
      lowerBoundInclusive: absoluteQuotePos
    });
    if (markerSpan === null || surface === null || markerSpan.start !== absoluteQuotePos) {
      return null;
    }
    const sourceStart = sourceIndexForInputPosition(input, pos);
    const markerConsumed = consumedForSourceTokenSpan(input, pos, {
      start: sourceStart,
      endExclusive: markerSpan.endExclusive
    });
    if (markerConsumed === null) {
      return null;
    }
    cursor.advance(markerConsumed - (cursor.pos - pos));
    return createConnectiveOp({

      connective: "quotative",
      surface,
      source: srcSlice(input.tokens, pos, markerConsumed)
    });
  });
}

function consumedForSourceTokenSpan(
  input: ParseInput,
  pos: number,
  span: { readonly start: number; readonly endExclusive: number }
): number | null {
  if (span.endExclusive <= span.start || sourceIndexForInputPosition(input, pos) !== span.start) {
    return null;
  }
  for (let index = pos; index < input.tokens.length; index += 1) {
    const current = sourceIndexForInputPosition(input, index);
    if (current === span.endExclusive - 1) {
      return index + 1 - pos;
    }
    if (current >= span.endExclusive) {
      return null;
    }
  }
  return null;
}

function matchConfirmationJanaiKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => matchJaNaiConfirmationKa(c) ?? matchDewaNaiKaConfirmationKa(c));
}

function matchVolitionalConfirmationJanaiKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => matchConfirmationJanaiKa(c) ?? matchDirectDewaNaiKaConfirmationKa(c));
}

function matchJaNaiConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const ja = tokens[pos];
    if (
      ja === undefined ||
      ja.surface !== "じゃ" ||
      (ja.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
    ) {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(1 + negEnd.consumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function matchDewaNaiKaConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const relation = dewaScopeBridgeRelationAt(tokens, pos, {
      anchorIdx: pos,
      consumers: ["tail_multi_clause"]
    });
    if (relation?.focusParticle !== "wa") {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, relation.span.endExclusive, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(relation.span.endExclusive - pos + negEnd.consumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function matchDirectDewaNaiKaConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const baseConsumed = directDewaNaiKaConfirmationBaseConsumed(c.tokens, c.pos);
    if (baseConsumed === null) {
      return null;
    }
    c.advance(baseConsumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function directDewaNaiKaConfirmationBaseConsumed(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  const de = tokens[pos];
  const wa = tokens[pos + 1];
  if (
    de === undefined ||
    wa === undefined ||
    de.surface !== "で" ||
    (de.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_) ||
    wa.surface !== "は" ||
    (wa.pos & POS0) !== 助詞
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
  if (negEnd === null || negEnd.polite) {
    return null;
  }
  return 2 + negEnd.consumed;
}

function consumeConfirmationKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  consumers: readonly ("quote_content" | "tail_multi_clause")[]
): boolean {
  const kaPos = cursor.pos;
  const ka = cursor.current();
  if (
    ka !== undefined &&
    kaPos < cursor.end &&
    kaMarkerRelationAt(cursor.tokens, kaPos, consumers)?.particleSubtype1 === 終助詞
  ) {
    cursor.advance();
    return true;
  }
  return false;
}

function isVolitionalTerminalContext(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if ((stemToken.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return ops.some((op) => {
    if (op.kind === "conjecture") {
      return false;
    }
    if (opVolitionalMoodConsumedByCompanionConjecture(op, ops)) {
      return false;
    }
    const sourceToken = op.source.tokens[op.source.tokens.length - 1];
    return ((sourceToken?.pos ?? 0) & POS5A) === 意志推量形_ ||
      isSplitTeIruVolitionalSource(op.source.tokens);
  });
}

function isSplitTeIruVolitionalSource(tokens: readonly RuntimeHaruToken[]): boolean {
  return tokens.length >= 2 && isSplitTeIruVolitionalStemAt(tokens, tokens.length - 1);
}

function isImperativeTerminalContext(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if ((stemToken.pos & POS5A) === 命令形_) {
    return true;
  }
  return ops.some((op) => {
    const sourceToken = op.source.tokens[op.source.tokens.length - 1];
    return ((sourceToken?.pos ?? 0) & POS5A) === 命令形_;
  });
}

function neutralizeSfpNodeEffect(
  node: SfpNode
): SfpNode {
  return {
    ...node,
    effect: null
  };
}

function matchJaNaiConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  kaOwnershipAt?: (pos: number) => ReturnType<typeof janaiConfirmationKaOwnershipKindAt>
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const ja = c.current();
    if (
      ja === undefined ||
      ja.surface !== "じゃ" ||
      (ja.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
    ) {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
    if (negEnd === null) {
      return null;
    }
    c.advance(1 + negEnd.consumed);
    if (!finishConfirmationJanai(c, false, lookups, negEnd.polite, kaOwnershipAt)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos, negEnd.polite);
  });
}

function matchDewaNaiKaConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const relation = dewaScopeBridgeRelationAt(tokens, pos, {
      anchorIdx: pos,
      consumers: ["tail_multi_clause"]
    });
    if (relation?.focusParticle !== "wa") {
      return null;
    }
    const dewaConsumed = relation.span.endExclusive - pos;
    const negEnd = matchNegationEnding(tokens, relation.span.endExclusive, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(dewaConsumed + negEnd.consumed);
    if (!finishConfirmationJanai(c, true, lookups)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos);
  });
}

function matchDirectDewaNaiKaConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const baseConsumed = directDewaNaiKaConfirmationBaseConsumed(tokens, pos);
    if (baseConsumed === null) {
      return null;
    }
    c.advance(baseConsumed);
    if (!finishConfirmationJanai(c, false, lookups)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos);
  });
}

const CONFIRMATION_JANAI_ABSORBABLE_SFP_LOOKUP = "janai_confirmation_absorbable_follower_sfp";

function confirmationJanaiDiscourseFollowerRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): number | null {
  const absorbable = lookups.named(CONFIRMATION_JANAI_ABSORBABLE_SFP_LOOKUP);
  if (absorbable === undefined) {
    return null;
  }
  let offset = 0;
  if (cursor.tokens[cursor.pos]?.surface === "の") {
    offset += 1;
  }
  for (let index = cursor.pos + offset; index < cursor.end; index += 1) {
    const token = cursor.tokens[index]!;
    const canonical = terminalSfpLexeme(token);
    if (
      canonical === null ||
      !absorbable.has(canonical)
    ) {
      return null;
    }
    offset += 1;
  }
  return offset === 0 ? null : offset;
}

function finishConfirmationJanai(
  cursor: TokenCursor<RuntimeHaruToken>,
  requireKa: boolean,
  lookups: LookupTables,
  requireReactionMarker = false,
  kaOwnershipAt?: (pos: number) => ReturnType<typeof janaiConfirmationKaOwnershipKindAt>
): boolean {
  if (!requireKa && !requireReactionMarker && cursor.pos === cursor.end) {
    return true;
  }
  if (!requireKa && !requireReactionMarker) {
    const followers = confirmationJanaiDiscourseFollowerRun(cursor, lookups);
    if (followers !== null) {
      cursor.advance(followers);
      return true;
    }
  }
  const kaOwner = kaOwnershipAt?.(cursor.pos) ??
    janaiConfirmationKaOwnershipKindAt(cursor.tokens, cursor.pos);
  if (kaOwner === "question") {
    cursor.advance();
    return true;
  }
  return false;
}

function buildConfirmationJanaiSfp(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  consumed: number,
  polite = false
): SfpNode {
  return {
    effect: "jan",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed,
    repeatCount: 1,
    ...(polite ? { polite: true } : {}),
    source: srcSlice(tokens, pos, consumed)
  };
}

const TE_QUESTION_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "clause_boundary",
  "decorative_terminal"
]);

function matchConnectiveFinalSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const lastOp = ops.at(-1);
    if (lastOp?.kind !== "connective") return null;
    const context = contextAlignedPosition(input, c, pos);
    if (
      lastOp.connective === "te_form" &&
      lookupConnectiveBySurface(lastOp.surface) === "te_form" &&
      terminalQuestionKaRelationAt(context.tokens, context.index, { lookups: input.lookups }) !== null &&
      TE_QUESTION_CLOSURES.has(utteranceClosureAfterParsePosition(input, pos))
    ) {
      c.advance();
      return {
        effect: "ka",
        surface: tokens[pos]!.surface,
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1)
      };
    }
    const detected = detectSfp(c, stemToken.pos & POS0, true);
    const consumed = c.pos - pos;
    if (consumed <= 0) return null;
    const parsed = sfpEffectFromDetected(detected);
    if (parsed === null) return null;
    return {
      effect: lastOp.terminalDiscourseHost === true ? parsed.effect : null,
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed,
      repeatCount: parsed.repeatCount,
      source: srcSlice(tokens, pos, consumed)
    };
  });
}

function sfpEffectFromDetected(
  detected: string | null
): { readonly effect: SfpEffect | null; readonly repeatCount: number } | null {
  if (detected === null) {
    return { effect: null, repeatCount: 1 };
  }
  if (detected === "role_cat_nya") {
    return { effect: "role_cat_nya", repeatCount: 1 };
  }
  const rolePrefix = "role_cat_nya:";
  if (detected.startsWith(rolePrefix)) {
    const repeatCount = Number.parseInt(detected.slice(rolePrefix.length), 10);
    return Number.isFinite(repeatCount) && repeatCount > 0
      ? { effect: "role_cat_nya", repeatCount }
      : null;
  }
  switch (detected) {
    case "ne":
    case "na_excl":
    case "na_prohib":
    case "na_soft_imperative":
    case "kana":
    case "jan":
    case "yone_confirm":
    case "kke":
    case "explanatory":
    case "volitional_resolve":
    case "speaker_assertion":
    case "ka":
    case "polite_q":
    case "neg_confirm_q":
    case "neg_invite_q":
    case "neg_plain_q":
      return { effect: detected, repeatCount: 1 };
    default:
      return null;
  }
}

function opsCanAcceptTerminalSfp(ops: readonly AuxOpNode[]): boolean {
  return ops.at(-1)?.kind !== "connective";
}

function matchNodeReasonConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && match.surface === "ので") {
    return connectiveOpFromMatch(match, cursor);
  }
  const openMatch = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (openMatch === null || openMatch.surface !== "ので") return null;
  const carrierProbe = cursor.fork(cursor.pos + openMatch.consumed);
  if (matchPredicateQuoteCarrier(carrierProbe, lookups)?.style !== "compact_toiu") return null;
  if (carrierProbe.current() !== undefined) return null;
  return connectiveOpFromMatch(openMatch, cursor);
}

function matchNoNiAdversativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken,
  input?: ParseInput
): ConnectiveOp | null {
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  let terminalDiscourseHost = false;
  if ((match === null || match.surface !== "のに") && stemToken !== undefined) {
    match = matchCompositeConnectiveBeforeTrailingSfp(cursor, stemToken, (m) => m.surface === "のに");
    terminalDiscourseHost = match !== null &&
      terminalDiscourseSfpRunClosesUtterance(cursor, input, match.consumed);
  }
  if (match === null || match.surface !== "のに") {
    match = matchCompositeConnectiveBeforeTerminalQuoteClosure(
      cursor,
      input,
      (m) => m.surface === "のに",
      stemToken
    );
  }
  if (match === null || match.surface !== "のに") return null;
  const op = connectiveOpFromMatch(match, cursor);
  return terminalDiscourseHost ? markTerminalDiscourseHostConnectiveOp(op) : op;
}

function terminalQuoteClosureFollows(
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number,
  input: ParseInput | undefined
): boolean {
  const marker = tokaTteCompositeQuoteCandidateAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] }) ??
    tokaQuoteMarkerRelationAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] }) ??
    quoteMarkerRelationAt(cursor.tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker === null) {
    return false;
  }
  if (
    marker.canonicalSurface !== "と" &&
    marker.canonicalSurface !== "って" &&
    marker.canonicalSurface !== "とか" &&
    marker.canonicalSurface !== "とかって"
  ) {
    return false;
  }
  if (marker.span.endExclusive < cursor.end) {
    return false;
  }
  const contextTokens = input?.contextTokens ?? input?.tokens;
  if (input === undefined || contextTokens === undefined) {
    return false;
  }
  return !hasRealContentAfterIndex(
    contextTokens,
    sourceIndexForInputPosition(input, marker.span.endExclusive),
    { stopAtHardTerminal: true }
  );
}

function matchCompositeConnectiveBeforeTerminalQuoteClosure(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined,
  accepts: (match: CompositeConnectiveMatch) => boolean,
  stemToken?: RuntimeHaruToken
): CompositeConnectiveMatch | null {
  const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (loose === null || !accepts(loose)) {
    return null;
  }
  const markerPos = cursor.pos + loose.consumed;
  if (terminalQuoteClosureFollows(cursor, markerPos, input)) {
    return loose;
  }
  if (stemToken === undefined) {
    return null;
  }
  const sfpCursor = cursor.fork(markerPos, cursor.tokens.length, markerPos);
  const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
  const sfpConsumed = sfpCursor.consumed;
  if (sfpConsumed <= 0 || sfpEffectFromDetected(detected) === null) {
    return null;
  }
  return terminalQuoteClosureFollows(cursor, markerPos + sfpConsumed, input) ? loose : null;
}

function matchCompositeConnectiveBeforeTrailingSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  accepts: (match: CompositeConnectiveMatch) => boolean
): CompositeConnectiveMatch | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  if (loose === null || !accepts(loose)) return null;
  const sfpStart = pos + loose.consumed;
  const sfpCursor = cursor.fork(sfpStart, tokens.length, sfpStart);
  const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
  const sfpConsumed = sfpCursor.consumed;
  if (
    sfpConsumed > 0 &&
    sfpStart + sfpConsumed >= tokens.length &&
    sfpEffectFromDetected(detected) !== null
  ) {
    return loose;
  }
  return null;
}

function matchExternalNominalizerConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || !isExternalNominalizerConnectiveKind(match.connective)) {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

function matchNominalizedEvenIfConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const nominalizer = predicateNominalizerRelationForToken(cursor.current(), cursor.pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || match.connective !== "even_if") {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

function matchAdjectivalConcessiveTomoConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const relation = adjectivalConcessiveTomoRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["tail_multi_clause"]
  });
  if (relation === null || relation.span.start !== cursor.pos) {
    return null;
  }
  if (relation.span.endExclusive < cursor.end) {
    return null;
  }
  return connectiveOpFromMatch(
    {
      connective: relation.connectiveKind,
      surface: relation.surface,
      consumed: relation.span.endExclusive - relation.span.start
    },
    cursor
  );
}

function isTeMoConcessiveSurface(surface: string): boolean {
  return surface === "ても" || surface === "でも" || surface === "てでも" || surface === "ででも";
}

function matchTeMoConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken,
  input?: ParseInput
): ConnectiveOp | null {
  const ownershipTokens = input?.contextTokens ?? cursor.tokens;
  const ownershipPos = input === undefined
    ? cursor.pos
    : sourceIndexForInputPosition(input, cursor.pos);
  const scopeRelation = dewaScopeBridgeRelationAt(ownershipTokens, ownershipPos, {
    anchorIdx: ownershipPos,
    consumers: ["tail_multi_clause"]
  });
  const scopeTail = scopeRelation === null
    ? undefined
    : ownershipTokens[scopeRelation.span.endExclusive];
  if (
    scopeRelation?.focusParticle === "mo" &&
    scopeTail !== undefined &&
    isNaiOrNuToken(scopeTail)
  ) {
    return null;
  }
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if ((match === null || !isTeMoConcessiveSurface(match.surface)) && stemToken !== undefined) {
    match = matchCompositeConnectiveBeforeTrailingSfp(cursor, stemToken, (m) => isTeMoConcessiveSurface(m.surface));
  }
  if (match === null || !isTeMoConcessiveSurface(match.surface)) return null;
  return connectiveOpFromMatch(match, cursor);
}

function isZeroNominalizedParallelMoMarkerAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  return zeroNominalizedParallelMoMarkerIndices(tokens).has(anchor);
}

function isParallelPredicateMoOwnershipYieldAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  return parallelPredicateMoOwnershipYieldMarkers(tokens).has(anchor);
}

function matchRenyouFocusSupportEllipsisConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    tokens[pos + 1] !== undefined ||
    !isRenyouFocusSupportEllipsisMarkerAtCursor(cursor, input)
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({
    connective: "listing",
    surface: "__renyou_mo_focus_ellipsis",
    source: srcSlice(tokens, pos, 1)
  });
}

function isRenyouFocusSupportEllipsisMarkerAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): boolean {
  const tokens = input?.contextTokens ?? cursor.tokens;
  const anchor = input === undefined ? cursor.pos : sourceIndexForInputPosition(input, cursor.pos);
  const finalMarkerIdx = renyouFocusParallelSeriesFinalMarkerByItem(tokens).get(anchor);
  return finalMarkerIdx !== undefined && focusedNegationShapeAt(tokens, finalMarkerIdx) !== null;
}

function matchBareMoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    tokens[pos + 1] !== undefined ||
    !isBareMoConcessivePreviousToken(tokens[pos - 1]) ||
    isZeroNominalizedParallelMoMarkerAtCursor(cursor, input)
  ) {
    return null;
  }
  const previous = tokens[pos - 1];
  const previousForm5A = (previous?.pos ?? 0) & POS5A;
  cursor.advance(1);
  return createConnectiveOp({

    connective: "concession",
    surface: previousForm5A === 連用形_ ? "__renyou_mo" : "も",
    source: srcSlice(tokens, pos, 1)
  });
}

function matchFocusedNegation(
  cursor: TokenCursor<RuntimeHaruToken>
): readonly AuxOpNode[] | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = focusedNegationShapeAt(tokens, pos);
  if (shape === null) {
    return null;
  }
  const markerSpan = 1 + shape.supportConsumed;
  const politeOps: AuxOpNode[] = [];
  for (let i = 0; i < shape.politeConsumed; i += 1) {
    const politeIdx = pos + markerSpan + i;
    const politeToken = tokens[politeIdx];
    if (politeToken === undefined) {
      return null;
    }
    politeOps.push(buildOpFromClassification("polite", politeToken, politeIdx));
  }
  const negationStart = pos + markerSpan + shape.politeConsumed;
  const negationToken = tokens[negationStart];
  if (negationToken === undefined || !isNegationToken(negationToken, tokens[negationStart + 1])) {
    return null;
  }
  cursor.advance(markerSpan + shape.politeConsumed);
  const negation = collectNegationChain(cursor);
  if (negation.chainDepth === 0) {
    return null;
  }
  return [
    ...politeOps,
    buildFocusedNegationOp(negation, srcSlice(tokens, pos, markerSpan), shape.focusParticle)
  ];
}

export function matchAffirmativeFocusSupport(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = affirmativeFocusSupportShapeAt(tokens, pos);
  const support = tokens[pos + 1];
  if (shape === null || support === undefined || !isPostverbAuxiliaryActivationAccepted(support, tokens[pos + 2])) {
    return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 2), {
    kind: "focus_support",
    opChainHost: "inflecting_predicate_lemma",
    supportFocus: shape.focus
  });
}

export function buildFocusedNegationOp(
  negation: NegationOp,
  markerSource: OpSource,
  focusParticle: NegationFocusParticle
): NegationOp {
  return {
    ...negation,
    source: srcList(
      [...markerSource.tokens, ...negation.source.tokens],
      [...markerSource.tokenIndices, ...negation.source.tokenIndices]
    ),
    focusParticle
  };
}

function matchCopulaMoFocusConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  const previous = tokens[pos - 1];
  const ownershipTokens = input?.contextTokens ?? tokens;
  const ownershipPos = input === undefined
    ? pos - 1
    : sourceIndexForInputPosition(input, pos - 1);
  const scopeRelation = dewaScopeBridgeRelationAt(ownershipTokens, ownershipPos, {
    anchorIdx: ownershipPos,
    consumers: ["tail_multi_clause"]
  });
  const scopeTail = scopeRelation === null
    ? undefined
    : ownershipTokens[scopeRelation.span.endExclusive];
  if (
    token === undefined ||
    token.surface !== "も" ||
    (token.pos & POS01) !== 助詞_係助詞 ||
    previous === undefined ||
    copulaDeMarkerRelationForToken(previous, pos - 1, { consumers: ["tail_multi_clause"] }) === null ||
    tokens[pos + 1] !== undefined ||
    (scopeTail !== undefined && isNaiOrNuToken(scopeTail))
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "even_if",
    surface: "でも",
    source: srcSlice(tokens, pos, 1)
  });
}

function matchVolitionalPurposeToConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (
    token === undefined ||
    token.surface !== "と" ||
    (token.pos & POS0) !== 助詞 ||
    ((token.pos & POS1) !== 格助詞 && (token.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  const suruAttempt = volitionalAttemptMarkerAt(tokens, pos);
  const sourcePos = sourceIndexForInputPosition(input, pos);
  const lexicalBinding = suruAttempt === null ? activeProtoLayout()?.volitionalIntentBindingAt(sourcePos) : undefined;
  const atSliceEnd = cursor.peek(1) === undefined;
  const lexicalInSlice = lexicalBinding !== undefined &&
    (atSliceEnd || pos + (lexicalBinding.predicateIdx - sourcePos) < cursor.end);
  const attempt = suruAttempt ?? (lexicalInSlice && !atSliceEnd ? lexicalBinding : null);
  if (attempt === null && !atSliceEnd) {
    return null;
  }
  const binding = suruAttempt === null && lexicalInSlice ? "lexical" : "suru_attempt";
  const lastOp = ops[ops.length - 1];
  const sourceToken = lastOp === undefined ? stemTok : opLastSourceToken(lastOp);
  if (sourceToken === undefined || (sourceToken.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  if ((sourceToken.pos & POS0) === 形容詞0) {
    if (attempt?.focusParticle !== undefined) {
      return null;
    }
    cursor.advance(1);
    return createConnectiveOp({
      connective: "even_if",
      surface: "と",
      source: srcSlice(tokens, pos, 1)
    });
  }
  const consumed = attempt?.tokenCount ?? 1;
  cursor.advance(consumed);
  return buildVolitionalPurposeToConnectiveOp(srcSlice(tokens, pos, consumed), binding, attempt?.focusParticle);
}

export function buildVolitionalPurposeToConnectiveOp(
  source: OpSource,
  binding: "suru_attempt" | "lexical",
  focusParticle: VolitionalAttemptFocusParticle | undefined
): ConnectiveOp {
  return createConnectiveOp({

    connective: binding === "lexical" ? "volitional_purpose" : "conditional",
    surface: "と",
    source,
    ...(focusParticle === undefined ? {} : { attemptFocusParticle: focusParticle })
  });
}

function matchDatteFocusParticleConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || token.surface !== "だって" || (token.pos & POS0) !== 助詞) {
    return null;
  }
  if (tokens[pos + 1] !== undefined) {
    return null;
  }
  const previous = previousOps.at(-1);
  const sourceMarkerIndex = sourceIndexForInputPosition(input, pos);
  const contextTokens = input.contextTokens ?? tokens;
  const followingContextIndex = nextNonSpaceIndex(
    contextTokens,
    sourceMarkerIndex + 1,
    contextTokens.length
  );
  const terminalBoundary = followingContextIndex === null ||
    isHardTerminalPunctuationToken(contextTokens[followingContextIndex]);
  const typedContext =
    previous?.kind === "aspect" &&
    (previous.aspect === "te_kudasai" || previous.aspect === "te_kure_tanomu")
      ? {
        precedingRequestAspect: previous.aspect,
        ...(terminalBoundary ? { terminalBoundary: true as const } : {})
      }
      : {};
  const role = classifyDatteMarkerAt(cursor, input.lookups, typedContext).role;
  if (role === "terminal_reported_request") {
    cursor.advance(1);
    return buildReportedRequestQuotativeOp(srcSlice(tokens, pos, 1));
  }
  if (role !== "focus_particle") {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "even_if",
    surface: "だって",
    source: srcSlice(tokens, pos, 1)
  });
}

export function buildReportedRequestQuotativeOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "だって",
    quotativeMood: "imperative",
    quotativeClosure: "reported_request",
    source
  });
}


function plainTePermissionContextAllowed(
  tokens: readonly RuntimeHaruToken[],
  predicatePos: number,
  predicateConsumed: number
): boolean {
  const predicate = tokens[predicatePos];
  if (predicate === undefined) {
    return true;
  }
  const nextIdx = nextNonSpaceIndex(tokens, predicatePos + predicateConsumed);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || pos0in(next.pos, PUNCTUATION_BITS)) {
    return true;
  }
  if (!pos0in(next.pos, NOMINAL_BITS)) {
    return true;
  }
  const predicateForm5A = predicate.pos & POS5A;
  if (predicateForm5A !== 連体形_ && predicateForm5A !== 終止形_) {
    return true;
  }
  const nextForm = next.dictionaryForm || next.surface;
  return PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(nextForm) ||
    PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(next.surface);
}

function matchPermissionIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemNode: StemNode,
  previousOps: readonly AuxOpNode[],
  lookups: LookupTables
): PermissionIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const connective = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  const teDe = tokens[pos];
  const plainVerbTePermission =
    connective === null &&
    teDe !== undefined &&
    (teDe.pos & POS01) === 助詞_接続助詞 &&
    (teDe.surface === "て" || teDe.surface === "で") &&
    hostChainAttachesAsVerbalRenyou(stemNode, previousOps) &&
    !isAruOrGozaruVerbToken(tokens[pos - 1]);
  const previousOp = previousOps.at(-1);
  const negativeTePermission =
    connective === null &&
    teDe?.surface === "て" &&
    (teDe.pos & POS01) === 助詞_接続助詞 &&
    previousOp !== undefined &&
    auxOpCarriesTypedNegation(previousOp);
  if (
    (connective === null || (connective.surface !== "ても" && connective.surface !== "でも")) &&
    !negativeTePermission &&
    !plainVerbTePermission
  ) {
    return null;
  }
  const connectiveConsumed = (negativeTePermission || plainVerbTePermission) ? 1 : connective!.consumed;
  const predicatePos = pos + connectiveConsumed;
  const predicate = matchPermissionPredicateAt(tokens, predicatePos);
  if (predicate === null) {
    return null;
  }
  const continuation = teDeContinuationRelationAt(tokens, pos, {
    requirement: "parser_adjacent_tail",
    consumers: ["tail_boundary_readiness"],
    lookups
  });
  if (
    continuation !== null &&
    continuation.continuationIdx === predicatePos &&
    continuation.continuationKind !== "permission"
  ) {
    return null;
  }
  if (plainVerbTePermission && !plainTePermissionContextAllowed(tokens, predicatePos, predicate.consumed)) {
    return null;
  }
  const consumed = connectiveConsumed + predicate.consumed;
  cursor.advance(consumed);
  return buildPermissionIdiomOp(
    srcSlice(tokens, pos, consumed),
    predicate.variant,
    (negativeTePermission || plainVerbTePermission) ? "ても" : connective!.surface === "でも" ? "でも" : "ても"
  );
}

export function buildPermissionIdiomOp(
  source: OpSource,
  variant: PermissionIdiomOp["variant"],
  connectiveSurface: PermissionIdiomOp["connectiveSurface"]
): PermissionIdiomOp {
  return createIdiomOp({

    idiom: "permission",
    variant,
    connectiveSurface,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

export function matchTeEvaluationIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): AuxOpNode | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const relation = teDeContinuationRelationAt(tokens, pos, {
    requirement: "parser_adjacent_tail",
    consumers: ["tail_boundary_readiness"],
    lookups
  });
  if (
    relation === null ||
    relation.continuationKind !== "evaluation" ||
    relation.span.endExclusive > cursor.end
  ) {
    return null;
  }
  if (relation.markerSurface !== "て" && relation.markerSurface !== "で") {
    return null;
  }
  const consumed = relation.span.endExclusive - pos;
  cursor.advance(consumed);
  return buildTeEvaluationIdiomOp(
    srcSlice(tokens, pos, consumed),
    relation.markerSurface
  );
}

export function buildTeEvaluationIdiomOp(
  source: OpSource,
  connectiveSurface: TeEvaluationIdiomOp["connectiveSurface"]
): TeEvaluationIdiomOp {
  return createIdiomOp({

    idiom: "te_evaluation",
    evaluation: "good",
    connectiveSurface,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

function matchBaSufficiencyConditionalIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): SufficiencyConditionalIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (!isBaSufficiencyConditionalAt(tokens, pos)) {
    return null;
  }
  cursor.advance(2);
  return buildSufficiencyConditionalIdiomOp(srcSlice(tokens, pos, 2));
}

export function buildSufficiencyConditionalIdiomOp(
  source: OpSource
): SufficiencyConditionalIdiomOp {
  return createIdiomOp({

    idiom: "sufficiency_conditional",
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

export function matchNegativeNecessitySumuIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode
): NegativeNecessitySumuIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const previous = previousOps.at(-1);
  const previousTok = previous === undefined ? undefined : opLastSourceToken(previous);
  const followsNegativeOp = previous?.kind === "negation";
  const followsSuppletiveZuStem =
    previous === undefined &&
    stemNode.commitment === "suppletive_negation" &&
    tokens[pos - 1]?.surface === "ず";
  const marker = tokens[pos];
  let connectiveConsumed = 0;
  let variant: NegativeNecessitySumuIdiomOp["variant"] | null = null;
  if (
    followsNegativeOp &&
    marker !== undefined &&
    (marker.surface === "て" || marker.surface === "で") &&
    (marker.pos & POS01) === 助詞_接続助詞
  ) {
    const focus = tokens[pos + 1];
    const baseVariant = marker.surface === "で" ? "naide_sumu" : "nakute_sumu";
    const focusVariant = marker.surface === "で" ? "naidemo_sumu" : "nakutemo_sumu";
    if (focus !== undefined && focus.surface === "も" && (focus.pos & POS0) === 助詞) {
      connectiveConsumed = 2;
      variant = focusVariant;
    } else {
      connectiveConsumed = 1;
      variant = baseVariant;
    }
  } else if (
    (
      followsSuppletiveZuStem ||
      (followsNegativeOp && (previousTok?.surface === "ず" || previousTok?.surface === "ぬ"))
    ) &&
    marker !== undefined &&
    caseParticleMarkerRelationForToken(marker, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null
  ) {
    connectiveConsumed = 1;
    variant = "zuni_sumu";
  }
  if (variant === null || !isSumuNeedAvoidancePredicate(tokens[pos + connectiveConsumed])) {
    return null;
  }
  const consumed = connectiveConsumed + 1;
  cursor.advance(consumed);
  return buildNegativeNecessitySumuIdiomOp(srcSlice(tokens, pos, consumed), variant);
}

export function buildNegativeNecessitySumuIdiomOp(
  source: OpSource,
  variant: NegativeNecessitySumuIdiomOp["variant"]
): NegativeNecessitySumuIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_sumu",
    variant,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

function isSumuNeedAvoidancePredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  return lemma === "済む";
}

function matchSfpClosedExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
): ConnectiveOp | null {
  return matchClosedPropositionExemplificationConnective(input, cursor, "terminal_particle_run");
}

function matchBareVolitionalClosedExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
): ConnectiveOp | null {
  return matchClosedPropositionExemplificationConnective(input, cursor, "bare_volitional");
}

function bareVolitionalExemplificationBoundaryMood(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  markerPos: number,
  connectiveKind: ConnectiveOp["connective"],
  previousOps: readonly AuxOpNode[],
): { readonly closedChainMood?: QuotedPropositionMood } {
  if (connectiveKind !== "exemplification" || cursor.tokens[markerPos]?.surface !== "と") {
    return {};
  }
  const context = contextAlignedPosition(input, cursor, markerPos);
  const kaContextIdx = nextNonSpaceIndex(context.tokens, context.index + 1);
  const closure = kaContextIdx === null ? null : closedPropositionTokaKaRelationAt(context.tokens, kaContextIdx);
  if (closure?.evidence !== "bare_volitional" || closure.markerIdx !== context.index) {
    return {};
  }
  return { closedChainMood: quotedPropositionMood(input.tokens[input.start], previousOps, null) };
}

function matchClosedPropositionExemplificationConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  evidence: ClosedPropositionTokaKaRelation["evidence"],
): ConnectiveOp | null {
  const pos = cursor.pos;
  if (cursor.tokens[pos]?.surface !== "と" || pos + 1 >= cursor.end) {
    return null;
  }
  const context = contextAlignedPosition(input, cursor, pos);
  const kaContextIdx = nextNonSpaceIndex(context.tokens, context.index + 1);
  const closure = kaContextIdx === null
    ? null
    : closedPropositionTokaKaRelationAt(context.tokens, kaContextIdx);
  if (closure === null || closure.evidence !== evidence || closure.markerIdx !== context.index) {
    return null;
  }
  const composite = tokaTteCompositeQuoteCandidateAt(context.tokens, context.index, { consumers: ["tail_multi_clause"] });
  if (evidence === "bare_volitional" && composite !== null) {
    return null;
  }
  const markerEndExclusive = composite?.span.endExclusive ?? closure.kaIdx + 1;
  if (
    evidence !== "bare_volitional" &&
    !hasRealContentAfterIndex(context.tokens, markerEndExclusive, { stopAtHardTerminal: true })
  ) {
    return null;
  }
  const quoteRelation = quoteStructuralRelationAt(
    new TokenCursor(context.tokens, context.index, context.tokens.length, context.index),
    input.lookups,
  );
  if (quoteRelation?.quote.markerSpan.start === context.index) {
    return null;
  }
  if (evidence === "bare_volitional" && !closedPropositionTokaListingEvidenceAt(context.tokens, closure, input.lookups)) {
    return null;
  }
  return cursor.tx((c) => matchExemplificationConnective(c, input.lookups, {
    closedVolitionalLeft: evidence === "bare_volitional",
  }));
}

function matchExemplificationConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: {
    readonly closedVolitionalLeft?: boolean;
  } = {},
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  const tokaKa = tokens[pos + 1];
  if (
    token?.surface === "と" &&
    tokaKa !== undefined &&
    kaMarkerRelationAt(tokens, pos - 1, ["tail_multi_clause"]) === null &&
    (options.closedVolitionalLeft === true || ((tokens[pos - 1]?.pos ?? 0) & POS5A) !== 意志推量形_) &&
    kaOwnershipKindAt(tokens, pos + 1, lookups) === "toka_listing"
  ) {
    cursor.advance(2);
    return createConnectiveOp({

      connective: "exemplification",
      surface: "とか",
      source: srcSlice(tokens, pos, 2),
    });
  }
  if (
    token === undefined ||
    !tokenMatchesConnectiveKind(token, "exemplification")
  ) {
    return null;
  }
  const genitive = tokens[pos + 1];
  const hasGenitiveProjection =
    genitive !== undefined &&
    tokens[pos + 2] === undefined &&
    genitive.surface === "の" &&
    (genitive.pos & POS01) === 助詞_格助詞;
  if (tokens[pos + 1] !== undefined && !hasGenitiveProjection) {
    return null;
  }
  const consumed = hasGenitiveProjection ? 2 : 1;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: "exemplification",
    surface: hasGenitiveProjection ? `${token.surface}${genitive.surface}` : token.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

function remainderIsChainFinalSfpRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  stemToken: RuntimeHaruToken
): boolean {
  if (start >= cursor.end) {
    return false;
  }
  const probe = cursor.fork(start);
  detectSfp(probe, stemToken.pos & POS0, true);
  return probe.pos > start && probe.pos === cursor.end;
}

interface PredicateProjectionConnectiveOptions {
  readonly allowNoQuoteReportingProjection?: boolean;
  readonly lookups: LookupTables;
  readonly quoteAttributiveHeadFrame?: ParseInput["quoteAttributiveHeadFrame"];
  readonly purposeMotionClosureAfterMarker?: (markerPos: number) => UtteranceClosureKind;
}

function matchPredicateProjectionConnectiveWith(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions,
  requireEnd: boolean
): PredicateProjectionConnectiveMatch | null {
  return matchPredicateProjectionConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd,
    allowNoQuoteReportingProjection: options.allowNoQuoteReportingProjection === true,
    lookups: options.lookups,
    ...(options.quoteAttributiveHeadFrame === undefined
      ? {}
      : { quoteAttributiveHeadFrame: options.quoteAttributiveHeadFrame }),
    ...(options.purposeMotionClosureAfterMarker === undefined
      ? {}
      : { purposeMotionClosureAfterMarker: options.purposeMotionClosureAfterMarker })
  });
}

function matchPredicateProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions
): ConnectiveOp | null {
  const match = matchPredicateProjectionConnectiveWith(cursor, options, true);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchPredicateProjectionConnectiveBeforeTerminalSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions & { readonly stemToken: RuntimeHaruToken }
): ConnectiveOp | null {
  const openMatch = matchPredicateProjectionConnectiveWith(cursor, options, false);
  if (
    openMatch === null ||
    !remainderIsChainFinalSfpRun(cursor, cursor.pos + openMatch.consumed, options.stemToken)
  ) {
    return null;
  }
  return connectiveOpFromMatch(openMatch, cursor);
}

function matchFocusConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const match = matchFocusConnectiveAt(tokens, pos);
  if (match === null) return null;
  cursor.advance(match.consumed);
  return buildMatchedConnectiveOp(srcSlice(tokens, pos, match.consumed), match);
}

function matchYouNiPredicateProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly allowZeroNiPurpose?: boolean; readonly lookups: LookupTables }
): ConnectiveOp | null {
  const match = matchYouNiPredicateProjectionConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd: true,
    allowZeroNiPurpose: options.allowZeroNiPurpose === true,
    lookups: options.lookups
  });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchSfpBridgedQuotativeMannerSimileConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const sfp = cursor.current();
  const directMatch = quotativeMannerSimileMatchInParseSlice(input, cursor, pos);
  if (directMatch?.closure === "noda_formal_noun") {
    if (ops.some(op => op.kind === "idiom" && op.idiom === "obligation")) return null;
    cursor.advance(directMatch.consumed);
    return buildQuotativeMannerSimileConnectiveOp(srcSlice(tokens, pos, directMatch.consumed), "", directMatch);
  }
  const match = quotativeMannerSimileMatchInParseSlice(input, cursor, pos + 1);
  if (sfp !== undefined && match?.closure === "neutral_terminal_sfp") {
    const consumed = 1 + match.consumed;
    cursor.advance(consumed);
    return buildQuotativeMannerSimileConnectiveOp(
      srcSlice(tokens, pos, consumed),
      sfp.surface,
      match
    );
  }
  return matchClosedSfpRunQuotativeMannerSimileConnective(input, cursor, ops, stemTok);
}

function matchClosedSfpRunQuotativeMannerSimileConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const sfpStart = cursor.pos;
  if (cursor.current() === undefined) {
    return null;
  }
  return cursor.tx((c) => {
    for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
      if (matchTerminalSfpArbitration(input, c, stemTok, ops) === null) {
        return null;
      }
      const match = quotativeMannerSimileMatchInParseSlice(input, c, c.pos);
      if (match === null) {
        continue;
      }
      if (
        match.closure !== "terminal_particle_run" ||
        contextAlignedPosition(input, c, c.pos).index - match.leadingSfpCount !==
          contextAlignedPosition(input, c, sfpStart).index
      ) {
        return null;
      }
      const closedSfp = closedSfpOfQuotativeMannerSimileRun(input, c.fork(sfpStart, c.pos), stemTok, ops);
      if (closedSfp === null) {
        return null;
      }
      const sfpSurface = tokens.slice(sfpStart, c.pos).map((token) => token.surface).join("");
      c.advance(match.consumed);
      return closedSfpQuotativeMannerSimileOp(srcSlice(tokens, sfpStart, c.pos - sfpStart), sfpSurface, match, closedSfp);
    }
    return null;
  });
}

function closedSfpOfQuotativeMannerSimileRun(
  input: ParseInput,
  bounded: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  let first: SfpNode | null = null;
  for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT && bounded.pos < bounded.end; attempt += 1) {
    const next = matchTerminalSfpArbitration(input, bounded, stemTok, ops);
    if (next === null) {
      return null;
    }
    first ??= next;
  }
  return bounded.pos === bounded.end ? first : null;
}

function closedSfpClosesInterrogative(closedSfp: SfpNode): boolean {
  return quotedMoodForClosingSfpEffect(closedSfp.effect) === "interrogative" ||
    isCommittedKaQuestionSfpEffect(closedSfp.effect);
}

function closedSfpQuotativeMannerSimileOp(
  source: OpSource,
  sfpSurface: string,
  match: QuotativeMannerSimileConnectiveMatch,
  closedSfp: SfpNode
): ConnectiveOp {
  const mood = closedSfpClosesInterrogative(closedSfp) ? "interrogative" : match.mood;
  return {
    ...buildQuotativeMannerSimileConnectiveOp(source, sfpSurface, { ...match, mood }),
    closedSfp
  };
}

function matchAttributiveBridgedYouNiProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (keijoujiAttributiveMarkerAt(tokens, pos) === null) {
    return null;
  }
  const match = matchYouNiPredicateProjectionConnectiveAt(tokens, pos + 1, {
    requireEnd: true,
    lookups
  }) ?? matchGotokuMannerSimileConnectiveAt(tokens, pos + 1);
  if (match === null || (match.surface !== "ように" && match.surface !== "ごとく" && match.surface !== "如く")) {
    return null;
  }
  const consumed = 1 + match.consumed;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: match.connective,
    surface: match.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

function matchNoBridgedLikenessModal(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): { readonly op: ModalOp; readonly ops?: readonly AuxOpNode[]; readonly terminal?: AuxLayerNode["terminal"] } | null {
  if (keijoujiAttributiveMarkerAt(cursor.tokens, cursor.pos) !== "no") {
    return null;
  }
  const inner = cursor.fork(cursor.pos + 1, cursor.end, cursor.pos + 1);
  const match = matchYouda(inner, stemToken, ctx);
  if (match === null) {
    return null;
  }
  cursor.advance(1 + match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    ...(match.terminal === undefined ? {} : { terminal: match.terminal })
  };
}

function matchAttributiveBridgedYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  if (fusedNoYouNiKeijoujiAttributiveAt(cursor.tokens, cursor.pos)) {
    const fused = fusedNoYouNiPerceptionCarrierAt(cursor.tokens, cursor.pos);
    if (fused === null) {
      return null;
    }
    const start = cursor.pos;
    cursor.advance(fused.consumed);
    return buildAppearancePerceptionPostverbOp(cursor.tokens, start, fused.consumed, fused.reading);
  }
  if (keijoujiAttributiveMarkerAt(cursor.tokens, cursor.pos) === null) {
    return null;
  }
  const inner = cursor.fork(cursor.pos + 1, cursor.end, cursor.pos + 1);
  const match =
    matchYouNiPerceptionPostverbAuxiliary(inner) ??
    matchKaNoYouNiPerceptionPostverbAuxiliary(inner);
  if (match === null) {
    return null;
  }
  cursor.advance(1 + inner.consumed);
  return match;
}

function isDegreeExtentParticle(token: RuntimeHaruToken | undefined): boolean {
  const canonical = secondaryParticleCanonical(token);
  return canonical === "ほど" || canonical === "くらい";
}

function startsKamoModal(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos } = cursor;
  return kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) !== null &&
    tokens[pos + 1]?.surface === "も" &&
    tokens[pos + 2] !== undefined &&
    isKamoShirenaiLemma(tokens[pos + 2]!);
}

function matchPredicateProjectionCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[] = [],
  lookups?: LookupTables,
  input?: ParseInput,
  stemToken?: RuntimeHaruToken
): PredicateProjectionCarrierOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const dokoroNegative = matchFocusDokoroNegativeCarrier(tokens, pos, stemToken, lookups);
  if (dokoroNegative !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, dokoroNegative);
  }
  const recentPastBakari = matchRecentPastBakariCarrier(tokens, pos, previousOps, lookups);
  if (recentPastBakari !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, recentPastBakari);
  }
  const declaredForm = matchDeclaredProjectionCarrierForm(tokens, pos, lookups);
  if (declaredForm !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, declaredForm);
  }
  const equivalenceDouzen = matchEquivalenceDouzenCarrier(cursor, input);
  if (equivalenceDouzen !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, equivalenceDouzen);
  }
  const dake = matchFocusLimitCarrier(cursor);
  if (dake !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, dake);
  }
  const untilCopula = matchUntilCopularCarrier(tokens, pos, previousOps);
  if (untilCopula !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, untilCopula);
  }
  const untilBareSfp = matchUntilBareTerminalSfpCarrier(cursor, input);
  if (untilBareSfp !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, untilBareSfp);
  }
  const degree = tokens[pos];
  const degreeCopula = matchDegreeExtentAmountCarrier(tokens, pos);
  if (degreeCopula !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, degreeCopula);
  }
  if (
    degree !== undefined &&
    isDegreeExtentParticle(degree) &&
    (tokens[pos + 1] === undefined ||
      cursor.lookahead(1, startsKamoModal) ||
      cursor.lookahead(1, isTailFinalQuestionSfpStart) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, input, 1))
  ) {
    cursor.advance(1);
    return buildPredicateProjectionCarrierOp(
      srcSingle(degree, pos),
      "degree_extent",
      degree.surface,
      null,
      false,
      false
    );
  }
  const niChigaiNai = matchNiChigaiNaiProjectionCarrierAt(tokens, pos);
  if (niChigaiNai !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, niChigaiNai);
  }
  const niKimatteIru = matchNiKimatteIruProjectionCarrierAt(tokens, pos);
  if (niKimatteIru === null) {
    return null;
  }
  return consumePredicateProjectionCarrierMatch(cursor, niKimatteIru);
}

function consumePredicateProjectionCarrierMatch(
  cursor: TokenCursor<RuntimeHaruToken>,
  match: { readonly op: PredicateProjectionCarrierOp; readonly consumed: number }
): PredicateProjectionCarrierOp {
  cursor.advance(match.consumed);
  return match.op;
}

export function matchFocusDokoroNegativeCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemToken: RuntimeHaruToken | undefined,
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const span = matchDokoroNegativeCarrierSpanAt(tokens, pos);
  const hostClass = dokoroNegativeHostClass(stemToken, lookups);
  if (span === null || hostClass === null) {
    return null;
  }
  const surface = tokens.slice(pos, pos + span.consumed).map((token) => token.surface).join("");
  const situationBase = hostClass === "situation_deictic"
    ? dokoroSituationDeicticBase(stemToken, lookups)
    : undefined;
  const allomorph: PredicateProjectionCarrierSourceAllomorph =
    hostClass === "situation_deictic" ? "dokoro_situation_deictic" :
      hostClass === "situation_sahen" ? "dokoro_situation_sahen" :
        hostClass === "situation_verb" ? "dokoro_situation_verb" : "dokoro_scalar";
  const op = createPredicateProjectionCarrierOp({
    carrier: "limit_dokoro_negative",
    sourceAllomorph: allomorph,
    surface,
    source: srcSlice(tokens, pos, span.consumed),
    polite: span.polite,
    past: false,
    ...(situationBase === undefined ? {} : { hostSituationBase: situationBase })
  });
  return { op, consumed: span.consumed };
}

function isEquivalenceCarrierHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !isClauseClosingPredicateTailToken(token)) {
    return false;
  }
  return (token.pos & POS0) === 助動詞 ||
    (token.pos & POS01) === 動詞_非自立可能 ||
    isNaiOrNuToken(token);
}

export function matchEquivalenceDouzenCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const marker = tokens[pos];
  if (
    marker === undefined ||
    marker.surface !== "も" ||
    (marker.pos & POS01) !== 助詞_係助詞 ||
    !isEquivalenceCarrierHostToken(tokens[pos - 1]) ||
    isParallelPredicateMoOwnershipYieldAtCursor(cursor, input)
  ) {
    return null;
  }
  const build = (
    consumed: number,
    allomorph: "equivalence_bare" | "equivalence_copular" | "equivalence_adnominal",
    polite: boolean,
    past: boolean
  ): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } => ({
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "equivalence_douzen",
      tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      allomorph,
      polite,
      past
    ),
    consumed
  });
  if (isEquivalenceCarrierAdnominalToken(tokens[pos + 1])) {
    return build(2, "equivalence_adnominal", false, false);
  }
  if (!isEquivalenceCarrierPredicativeNoun(tokens[pos + 1])) {
    return null;
  }
  const follower = tokens[pos + 2];
  if (follower === undefined) {
    return build(2, "equivalence_bare", false, false);
  }
  if (follower.surface === "の" && (follower.pos & POS0) === 助詞) {
    return build(3, "equivalence_adnominal", false, false);
  }
  if (
    input !== undefined &&
    isQuoteMarkerFollowerAt(input, pos + 2)
  ) {
    return build(2, "equivalence_bare", false, false);
  }
  const followerPos4 = follower.pos & POS4;
  const followerPos5A = follower.pos & POS5A;
  const dearu = matchEquivalenceDouzenDearuFollower(tokens, pos);
  if (dearu !== null) {
    return build(dearu.consumed, "equivalence_copular", false, dearu.past);
  }
  if (followerPos4 === 助動詞_ダ || followerPos4 === 助動詞_デス) {
    if (
      followerPos5A === 意志推量形_ ||
      (followerPos5A === 連体形_ && predicateNominalizerRelationForToken(tokens[pos + 3], pos + 3, {
        requirement: "terminal_noda_marker",
        consumers: ["tail_multi_clause"]
      })?.nominalizerKind === "no")
    ) {
      return build(2, "equivalence_bare", false, false);
    }
    const pastAux = tokens[pos + 3];
    const copulaPast = followerPos5A === 連用形_ &&
      pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
    if (followerPos5A !== 終止形_ && !copulaPast) {
      return null;
    }
    return build(
      copulaPast ? 4 : 3,
      "equivalence_copular",
      followerPos4 === 助動詞_デス,
      copulaPast
    );
  }
  if (
    terminalDiscourseSfpRunClosesUtterance(cursor, input, 2) ||
    cursor.lookahead(2, isTailFinalQuestionSfpStart)
  ) {
    return build(2, "equivalence_bare", false, false);
  }
  return null;
}

function matchEquivalenceDouzenDearuFollower(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number; readonly past: boolean } | null {
  const copula = tokens[pos + 2];
  if (
    copula === undefined ||
    (copula.surface !== "で" && (copula.pos & POS4) !== 助動詞_ダ) ||
    (copula.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const aru = tokens[pos + 3];
  if (!isAruVerbToken(aru)) {
    return null;
  }
  const aruPos5A = aru.pos & POS5A;
  if (aruPos5A !== 終止形_ && aruPos5A !== 連用形_ && aruPos5A !== 連体形_) {
    return null;
  }
  const pastAux = tokens[pos + 4];
  return aruPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ
    ? { consumed: 5, past: true }
    : { consumed: 4, past: false };
}

function isQuoteMarkerFollowerAt(input: ParseInput, markerPos: number): boolean {
  const relation = quoteStructuralRelationStartingAt(
    contextCursorForInputPosition(input, markerPos),
    input.lookups
  );
  return relation !== undefined && relation.quote.slotKind === "quoted_content";
}

export function matchRecentPastBakariCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  previousOps: readonly AuxOpNode[],
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  if (!previousOpsHaveExperiencePastAttributive(previousOps)) {
    return null;
  }
  if (!isSecondaryParticle(tokens[pos], "ばかり")) {
    return null;
  }

  const adnominalCarrier = matchRecentPastBakariAdnominalCarrier(tokens, pos);
  if (adnominalCarrier !== null) {
    return adnominalCarrier;
  }
  const follower = matchBakariCopulaFollower(tokens, pos + 1, lookups);
  if (follower === null) {
    return null;
  }
  const consumed = 1 + follower.consumed;
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "recent_past_bakari",
      tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
      follower.verbSupport ? "recent_past_verb_support" : "recent_past_copular",
      follower.polite,
      true
    ),
    consumed
  };
}

function matchRecentPastBakariAdnominalCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const no = tokens[pos + 1];
  if (no === undefined || no.surface !== "の") {
    return null;
  }
  const consumed = 2;
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "recent_past_bakari",
      tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
      "recent_past_adnominal",
      false,
      true
    ),
    consumed
  };
}

function matchBakariCopulaFollower(
  tokens: readonly RuntimeHaruToken[],
  followerStart: number,
  lookups?: LookupTables
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean; readonly verbSupport: boolean } | null {
  const copula = tokens[followerStart];
  if (copula === undefined) {
    return null;
  }
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;
  if ((copula.surface === "で" || copulaPos4 === 助動詞_ダ) && copulaPos5A === 連用形_) {
    const aru = tokens[followerStart + 1];
    if (isAruVerbToken(aru)) {
      const aruPos5A = aru.pos & POS5A;
      if (aruPos5A === 終止形_ || aruPos5A === 連用形_ || aruPos5A === 連体形_) {
        const pastAux = tokens[followerStart + 2];
        const aruPast = aruPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
        return { consumed: aruPast ? 3 : 2, polite: false, past: aruPast, verbSupport: true };
      }
    }
  }
  const adnominalNa =
    copula.surface === "な" &&
    copulaPos4 === 助動詞_ダ &&
    copulaPos5A === 連体形_;
  const adnominalFeedsTail =
    adnominalNa &&
    lookups !== undefined &&
    attributiveCopulaTailFollows(tokens, followerStart + 1, lookups);
  const adnominalFeedsNoda =
    adnominalNa &&
    predicateNominalizerRelationForToken(tokens[followerStart + 1], followerStart + 1, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  if (
    !adnominalFeedsTail &&
    !adnominalFeedsNoda &&
    !((copulaPos4 === 助動詞_ダ || copulaPos4 === 助動詞_デス) &&
      (copulaPos5A === 終止形_ || copulaPos5A === 連用形_))
  ) {
    return null;
  }
  const pastAux = tokens[followerStart + 1];
  const copulaPast = copulaPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
  return {
    consumed: copulaPast ? 2 : 1,
    polite: copulaPos4 === 助動詞_デス,
    past: copulaPast,
    verbSupport: false
  };
}

export function matchDeclaredProjectionCarrierForm(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  for (const form of PROJECTION_CARRIER_FORMS) {
    if (!projectionCarrierHostAttaches(form.host, tokens[pos - 1])) {
      continue;
    }
    if (!form.marker.every((condition, offset) => projectionCarrierTokenMatches(condition, tokens[pos + offset]))) {
      continue;
    }
    const followerStart = pos + form.marker.length;
    if (matchFocusConnectiveAt(tokens, followerStart - 1) !== null) {
      continue;
    }
    for (const branch of form.branches) {
      let followerConsumed: number | null = null;
      let polite = false;
      let past = false;
      if (branch.follower.kind === "copula") {
        const copula = matchBakariCopulaFollower(tokens, followerStart, lookups);
        if (copula !== null) {
          followerConsumed = copula.consumed;
          polite = copula.polite;
          past = copula.past;
        }
      } else if (branch.follower.tokens.every((condition, offset) =>
        projectionCarrierTokenMatches(condition, tokens[followerStart + offset]))) {
        followerConsumed = branch.follower.tokens.length;
      }
      if (followerConsumed === null) {
        continue;
      }
      const consumed = form.marker.length + followerConsumed;
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, consumed),
          form.carrier,
          tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
          branch.allomorph,
          polite,
          past
        ),
        consumed
      };
    }
  }
  return null;
}

function matchUntilCopularCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  previousOps: readonly AuxOpNode[]
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const made = tokens[pos];
  if (made === undefined || made.surface !== "まで" || (made.pos & POS01) !== 助詞_副助詞) {
    return null;
  }
  const copula = tokens[pos + 1];
  if (copula === undefined) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const pos5A = copula.pos & POS5A;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return null;
  }
  const polite = pos4 === 助動詞_デス;
  let consumed: number;
  let past: boolean;
  if (pos5A === 終止形_) {
    consumed = 2;
    past = false;
  } else if (
    pos5A === 連用形_ &&
    tokens[pos + 2] !== undefined &&
    (tokens[pos + 2]!.pos & POS4) === 助動詞_タ
  ) {
    consumed = 3;
    past = true;
  } else {
    return null;
  }
  const limitAssertion = previousOpsHaveExperiencePastAttributive(previousOps);
  const surface = tokens.slice(pos, pos + consumed).map((t) => t.surface).join("");
  return {
    op: limitAssertion
      ? buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, consumed),
        "limit_dake",
        surface,
        "limit_copular",
        polite,
        past
      )
      : buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, consumed),
        "until_extent",
        surface,
        null,
        polite,
        past
      ),
    consumed
  };
}

function terminalDiscourseSfpRunClosesUtterance(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput | undefined,
  offset = 1
): boolean {
  if (cursor.tokens[cursor.pos + offset] === undefined) {
    return false;
  }
  let sfpEndPos: number | null = null;
  cursor.lookahead(offset, c => {
    const start = c.pos;
    detectSfp(c, 動詞, true);
    if (c.pos > start) {
      sfpEndPos = c.pos;
    }
    return true;
  });
  return sfpEndPos !== null && utteranceClosesAtChunkPosition(cursor, sfpEndPos, input);
}

function utteranceClosesAtChunkPosition(
  cursor: TokenCursor<RuntimeHaruToken>,
  endPos: number,
  input: ParseInput | undefined
): boolean {
  return cursor.lookahead(
    endPos - cursor.pos,
    (c) => chunkRemainderIsUtteranceClosingPunctRun(c)
  ) && utteranceClosesAfterInputPosition(input, endPos);
}

function matchUntilBareTerminalSfpCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const made = tokens[pos];
  if (
    made === undefined ||
    made.surface !== "まで" ||
    (made.pos & POS01) !== 助詞_副助詞
  ) {
    return null;
  }
  const ni = tokens[pos + 1];
  const markerConsumed = ni !== undefined && ni.surface === "に" && (ni.pos & POS01) === 助詞_格助詞
    ? 2
    : 1;
  if (
    !terminalDiscourseSfpRunClosesUtterance(cursor, input, markerConsumed) &&
    !cursor.lookahead(markerConsumed, isTailFinalQuestionSfpStart)
  ) {
    return null;
  }
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, markerConsumed),
      "until_extent",
      tokens.slice(pos, pos + markerConsumed).map((token) => token.surface).join(""),
      null,
      false,
      false
    ),
    consumed: markerConsumed
  };
}

function isUtteranceClosingTransparentPunct(token: RuntimeHaruToken): boolean {
  if (isUtteranceClosingPunct(token)) {
    return true;
  }
  return (token.pos & POS0) === 補助記号 &&
    !isWeakPunctuationToken(token) &&
    !isOpeningPunctuationToken(token);
}

function chunkRemainderIsUtteranceClosingPunctRun(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      return false;
    }
    if (!isUtteranceClosingTransparentPunct(token)) {
      return false;
    }
  }
  return true;
}

function utteranceClosesAfterInputPosition(input: ParseInput | undefined, pos: number): boolean {
  if (input === undefined) {
    return true;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  let idx = nextNonSpaceIndex(
    contextTokens,
    sourceIndexForInputPosition(input, pos - 1) + 1,
    contextTokens.length
  );
  while (idx !== null) {
    const token = contextTokens[idx];
    if (token === undefined || isHardTerminalPunctuationToken(token)) {
      return true;
    }
    if (!isUtteranceClosingTransparentPunct(token)) {
      return false;
    }
    idx = nextNonSpaceIndex(contextTokens, idx + 1, contextTokens.length);
  }
  return true;
}

function remainingChunkIsTerminalSfpRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  offset: number
): boolean {
  const start = cursor.pos + offset;
  if (start >= cursor.end) {
    return false;
  }
  for (let index = start; index < cursor.end; index++) {
    const token = cursor.tokens[index];
    if (token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  return true;
}

function matchDialectalRedundantTerminalParticle(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): boolean {
  const token = cursor.current();
  if (token === undefined) {
    return false;
  }
  const isAdversativeGa = token.surface === "が" && (token.pos & POS01) === 助詞_接続助詞;
  const previousOp = ops[ops.length - 1];
  const isRedundantKa = token.surface === "か" &&
    (token.pos & POS01) === 助詞_終助詞 &&
    previousOp?.kind === "connective" &&
    previousOp.connective === "te_form" &&
    terminalSfpLexeme(cursor.peek(1)) === "さ";
  if (!isAdversativeGa && !isRedundantKa) {
    return false;
  }
  if (isAdversativeGa) {
    const ka = cursor.peek(1);
    if (ka === undefined || ka.surface !== "か" || (ka.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  if (
    !remainingChunkIsTerminalSfpRun(cursor, 1) &&
    !terminalDiscourseSfpRunClosesUtterance(cursor, input, 1)
  ) {
    return false;
  }
  cursor.advance(1);
  return true;
}

function matchDegreeExtentAmountCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const degree = tokens[pos];
  if (degree === undefined || !isDegreeExtentParticle(degree)) {
    return null;
  }
  const degreeSurface = degree.surface;
  const copula = tokens[pos + 1];
  if (copula === undefined) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const pos5A = copula.pos & POS5A;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return null;
  }
  const polite = pos4 === 助動詞_デス;
  if (
    pos4 === 助動詞_ダ &&
    pos5A === 連体形_ &&
    copula.surface === "な" &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no"
  ) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "degree_extent_amount",
        `${degreeSurface}${copula.surface}`,
        null,
        false
      ),
      consumed: 2
    };
  }
  if (pos5A === 終止形_) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "degree_extent_amount",
        `${degreeSurface}${copula.surface}`,
        null,
        polite
      ),
      consumed: 2
    };
  }
  if (pos5A === 連用形_) {
    const past = tokens[pos + 2];
    if (past !== undefined && (past.pos & POS4) === 助動詞_タ) {
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, 3),
          "degree_extent_amount",
          tokens.slice(pos, pos + 3).map((t) => t.surface).join(""),
          null,
          polite,
          true
        ),
        consumed: 3
      };
    }
  }
  return null;
}

function matchTeKaraSequenceConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const te = cursor.current();
  const kara = cursor.peek(1);
  if (
    te === undefined ||
    kara === undefined ||
    !isTeConnectiveToken(te) ||
    caseParticleMarkerRelationForToken(kara, pos + 1, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return null;
  }
  cursor.advance(2);
  return createConnectiveOp({

    connective: "sequence_after",
    surface: `${te.surface}から`,
    source: srcSlice(tokens, pos, 2)
  });
}

function matchTeIraiTemporalSinceConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const te = cursor.current();
  const irai = cursor.peek(1);
  if (
    te === undefined ||
    irai === undefined ||
    !isTeConnectiveToken(te) ||
    (irai.dictionaryForm || irai.surface) !== "以来"
  ) {
    return null;
  }
  cursor.advance(2);
  return createConnectiveOp({

    connective: "temporal_since",
    surface: `${te.surface}以来`,
    source: srcSlice(tokens, pos, 2)
  });
}

function matchZuniConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemNode: StemNode
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const ni = cursor.current();
  const previous = ops[ops.length - 1];
  const previousTok = previous === undefined ? undefined : opLastSourceToken(previous);
  const previousNegativeSurface = previousTok?.surface;
  const followsSuppletiveZuStem =
    previous === undefined &&
    stemNode.commitment === "suppletive_negation" &&
    tokens[pos - 1]?.surface === "ず";
  if (
    ni === undefined ||
    caseParticleMarkerRelationForToken(ni, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    !(
      (
        previous?.kind === "negation" &&
        (previousNegativeSurface === "ず" || previousNegativeSurface === "ぬ")
      ) ||
      followsSuppletiveZuStem
    )
  ) {
    return null;
  }
  const surface = previousNegativeSurface === "ぬ" ? "ぬに" : "ずに";
  cursor.advance(1);
  return createConnectiveOp({

    connective: "listing",
    surface,
    source: srcSlice(tokens, pos, 1)
  });
}

function matchTariEnumerativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || !isTariListingParticleToken(token)) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: "listing",
    surface: token.surface,
    source: srcSlice(tokens, pos, 1)
  });
}

function matchNaraBaConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match === null || match.surface !== "ならば") return null;
  return connectiveOpFromMatch(match, cursor);
}

function matchClassicalConditionalBaConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const conditional = cursor.current();
  const ba = cursor.peek(1);
  if (
    conditional === undefined ||
    !isPastAuxConditionalForm(conditional.pos) ||
    ba === undefined ||
    ba.surface !== "ば" ||
    !isConjunctiveParticleToken(ba)
  ) {
    return null;
  }
  cursor.advance(2);
  return buildClassifiedConnectiveOp(conditional, pos, previousOps, srcSlice(tokens, pos, 2));
}

function isInventoryCompositeConnectiveMatch(match: CompositeConnectiveMatch): boolean {
  return match.hostBound === true ||
    match.surface === "けども" ||
    match.surface === "けれども" ||
    match.surface === "ながらも" ||
    match.surface === "つつも" ||
    match.surface === "からこそ" ||
    match.connective === "question_content_alternative";
}

function matchInventoryCompositeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken?: RuntimeHaruToken
): ConnectiveOp | null {
  const match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && isInventoryCompositeConnectiveMatch(match)) {
    return connectiveOpFromMatch(match, cursor);
  }
  if (stemToken === undefined) {
    return null;
  }
  const beforeSfp = matchCompositeConnectiveBeforeTrailingSfp(
    cursor,
    stemToken,
    isInventoryCompositeConnectiveMatch
  );
  return beforeSfp === null ? null : connectiveOpFromMatch(beforeSfp, cursor);
}

function matchReformulationConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput
): ConnectiveOp | null {
  const sourcePos = sourceIndexForInputPosition(input, cursor.pos);
  const match = matchReformulationConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd: true,
    canonicalRelation:
      input.canonicalReformulationMarkerRelations?.relationAtQuoteMarker(sourcePos) ?? null
  });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchQuotedConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchQuotedConcessiveConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchRetrospectiveQuoteConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemNode: StemNode
): ConnectiveOp | null {
  const match = matchRetrospectiveQuoteConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  if (match === null) return null;
  const retrospectiveQuotativeFlavor = match.retrospectiveQuotativeFlavor === undefined
    ? undefined
    : retrospectiveQuotativeFlavorForStemMood(
      match.retrospectiveQuotativeFlavor,
      stemNode.stemMood
    );
  return connectiveOpFromMatch({
    ...match,
    ...(retrospectiveQuotativeFlavor === undefined ? {} : { retrospectiveQuotativeFlavor })
  }, cursor);
}

function matchQuestionReformulationConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const match = matchQuestionReformulationConnectiveAt(cursor.tokens, cursor.pos, { requireEnd: true });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

function matchHokaAdditiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const consumed = cursor.lookahead(0, matchHokaAdditiveConnectiveStart);
  if (consumed === null || pos + consumed !== tokens.length) {
    return null;
  }
  const surface = tokens.slice(pos, pos + consumed).map((token) => token.surface).join("");
  cursor.advance(consumed);
  return buildHokaAdditiveConnectiveOp(srcSlice(tokens, pos, consumed), surface);
}

export function buildHokaAdditiveConnectiveOp(
  source: OpSource,
  surface: string
): ConnectiveOp {
  return createConnectiveOp({ connective: "additive_besides", surface, source });
}

function matchMonoNoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const consumed = cursor.lookahead(0, c => matchMonoNoConcessiveConnectiveStart(c, { allowChunkEos: true }));
  if (consumed === null || pos + consumed !== tokens.length) {
    return null;
  }
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: "concession",
    surface: "ものの",
    source: srcSlice(tokens, pos, consumed)
  });
}

function matchKuseNiConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  let match = matchCompositeConnectiveAt(cursor, { requireEnd: true });
  if (match !== null && match.connective !== "concession") {
    match = null;
  }
  if (match === null) {
    const loose = matchCompositeConnectiveAt(cursor, { requireEnd: false });
    if (loose !== null && loose.connective === "concession") {
      const sfpStart = pos + loose.consumed;
      const sfpCursor = cursor.fork(sfpStart, tokens.length, sfpStart);
      const detected = detectSfp(sfpCursor, stemToken.pos & POS0, true);
      const sfpConsumed = sfpCursor.consumed;
      if (
        sfpConsumed > 0 &&
        sfpStart + sfpConsumed >= tokens.length &&
        sfpEffectFromDetected(detected) !== null
      ) {
        match = loose;
      }
    }
  }
  if (match === null) {
    return null;
  }
  return connectiveOpFromMatch(match, cursor);
}

function matchNaBridgedKuseNiConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const na = cursor.current();
  if (
    na === undefined ||
    na.surface !== "な" ||
    (na.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連体形_)
  ) {
    return null;
  }
  const match = matchCompositeConnectiveAt(cursor.fork(pos + 1, cursor.end, pos + 1), { requireEnd: true });
  if (match === null || match.connective !== "concession") {
    return null;
  }
  const consumed = 1 + match.consumed;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: match.connective,
    surface: match.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

function matchOutgoingBoundaryHint(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode,
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  return cursor.tx(c => {
    const pos = c.pos;
    const hint = input.outgoingBoundaryHint;
    if (hint === undefined) return null;
    const startIndex = sourceIndexForInputPosition(input, pos);
    if (startIndex !== hint.tokenSpan.start) return null;
    while (c.pos < c.end) {
      const current = sourceIndexForInputPosition(input, c.pos);
      if (current > hint.tokenSpan.end) break;
      c.advance();
      if (current === hint.tokenSpan.end) break;
    }
    const consumed = c.pos - pos;
    if (consumed <= 0) return null;
    const endIndex = sourceIndexForInputPosition(input, c.pos - 1);
    if (endIndex !== hint.tokenSpan.end) return null;
    const previousForm5A = ((input.tokens[pos - 1])?.pos ?? 0) & POS5A;
    const surface = hint.surface === "も" && previousForm5A === 連用形_
      ? "__renyou_mo"
      : hint.surface;
    if (surface === "にもかかわらず" && !canOwnNimoKakawarazuConnective(previousOps, stemNode)) {
      return null;
    }
    if (hint.retrospectiveDiscoveryStyle === "deoni" && !tailOpsEndInPastTense(previousOps)) {
      return null;
    }
    const directQuotative = quotativeMannerSimileMatchInParseSlice(input, c, pos);
    const quotativeReDerive = directQuotative?.closure === "noda_formal_noun"
      ? directQuotative
      : quotativeMannerSimileMatchInParseSlice(input, c, pos + 1);
    const closedRunQuotative = closedSfpRunQuotativeMannerSimileAtBoundary(input, c, pos, hint, stemTok, previousOps);
    if (closedRunQuotative === null) {
      return null;
    }
    const quotativeMood = closedRunQuotative !== undefined && closedSfpClosesInterrogative(closedRunQuotative)
      ? "interrogative"
      : hint.quotativeMood ?? (
        quotativeReDerive?.connective === hint.connectiveKind
          ? quotativeReDerive.mood
          : undefined
      );
    const conditionalQuoteEllipsis = conditionalQuoteEllipsisClassForSurface(surface);
    const boundNominalQuoteCarrierHost = hint.connectiveKind === "bound_nominal_reason" &&
      boundNominalReasonQuoteCarrierHostAt(input, previousOps, input.start);
    const boundaryOp = buildBoundaryConnectiveOp(
      srcSlice(input.tokens, pos, consumed),
      hint.connectiveKind,
      surface,
      hint.surfaceAllomorph
    );
    const hydratedBoundaryOp: ConnectiveOp = {
      ...boundaryOp,
      ...connectiveFlavorFields(input.tokens[pos]!, previousOps),
      ...bareVolitionalExemplificationBoundaryMood(input, c, pos, hint.connectiveKind, previousOps),
      ...(conditionalQuoteEllipsis === undefined
        ? {}
        : { conditionalQuoteEllipsis }),
      ...(quotativeMood === undefined ? {} : { quotativeMood }),
      ...(closedRunQuotative === undefined ? {} : { closedSfp: closedRunQuotative }),
      ...(boundNominalQuoteCarrierHost ? { boundNominalReasonQuoteCarrierHost: true } as const : {}),
      ...(hint.boundNominalReasonMonoNoun === undefined
        ? {}
        : { boundNominalReasonMonoNoun: hint.boundNominalReasonMonoNoun }),
      ...(hint.retrospectiveDiscoveryStyle === undefined
        ? {}
        : { retrospectiveDiscoveryStyle: hint.retrospectiveDiscoveryStyle }),
      ...(hint.attemptFocusParticle === undefined
        ? {}
        : { attemptFocusParticle: hint.attemptFocusParticle }),
      ...(hint.connectiveKind !== "predicate_projection_quote_attributive"
        ? {}
        : input.quoteAttributiveHeadFrame === undefined
          ? {}
          : { quoteAttributiveFlavor: input.quoteAttributiveHeadFrame.flavor }),
      ...(hint.retrospectiveQuotativeFlavor === undefined
        ? {}
        : {
          retrospectiveQuotativeFlavor: retrospectiveQuotativeFlavorForStemMood(
            hint.retrospectiveQuotativeFlavor,
            stemNode.stemMood
          )
        }),
      ...(hint.quoteBoundary === undefined ? {} : { quoteBoundary: hint.quoteBoundary })
    };
    return hint.quotedQuestionContext === true
      ? markQuotedQuestionContextOp(hydratedBoundaryOp)
      : hydratedBoundaryOp;
  });
}

function closedSfpRunQuotativeMannerSimileAtBoundary(
  input: ParseInput,
  c: TokenCursor<RuntimeHaruToken>,
  sfpStart: number,
  hint: NonNullable<ParseInput["outgoingBoundaryHint"]>,
  stemTok: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): SfpNode | null | undefined {
  if (
    hint.connectiveKind !== "predicate_projection_quotative_manner_simile" &&
    hint.connectiveKind !== "predicate_projection_quotative_manner_simile_attributive"
  ) {
    return undefined;
  }
  const mitaiPos = c.pos - 2;
  if (mitaiPos <= sfpStart) {
    return undefined;
  }
  const match = quotativeMannerSimileMatchInParseSlice(input, c.fork(mitaiPos), mitaiPos);
  if (
    match?.closure !== "terminal_particle_run" ||
    contextAlignedPosition(input, c, mitaiPos).index - match.leadingSfpCount !==
      contextAlignedPosition(input, c, sfpStart).index
  ) {
    return undefined;
  }
  return closedSfpOfQuotativeMannerSimileRun(input, c.fork(sfpStart, mitaiPos), stemTok, previousOps);
}

function sourceIndexForInputPosition(input: ParseInput, pos: number): number {
  return input.sourceIndexMap?.[pos] ?? ((input.streamStart ?? 0) + pos);
}

function quotativeMannerSimileMatchInParseSlice(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): QuotativeMannerSimileConnectiveMatch | null {
  const context = contextAlignedPosition(input, cursor, pos);
  const match = matchQuotativeMannerSimileConnectiveAt(context.tokens, context.index, input.lookups);
  return match !== null && pos + match.consumed <= cursor.end ? match : null;
}

function contextAlignedPosition(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): { readonly tokens: readonly RuntimeHaruToken[]; readonly index: number } {
  const sliceTokens = cursor.tokens;
  const contextTokens = input.contextTokens;
  if (contextTokens === undefined || contextTokens === sliceTokens) {
    return { tokens: sliceTokens, index: pos };
  }
  const index = sourceIndexForInputPosition(input, pos);
  if (contextTokens[index] !== sliceTokens[pos]) {
    return { tokens: sliceTokens, index: pos };
  }
  return { tokens: contextTokens, index };
}

function hostEnclosingQuoteCloseInParseSlice(
  input: ParseInput,
  start: number
): RuntimeHaruToken | null {
  const sourceHostStart = sourceIndexForInputPosition(input, start);
  if (
    start + 1 >= input.tokens.length ||
    sourceIndexForInputPosition(input, start + 1) !== sourceHostStart + 1
  ) {
    return null;
  }
  return hostEnclosingQuoteCloseToken(
    input.contextTokens ?? input.tokens,
    sourceHostStart,
    sourceHostStart + 1
  );
}

function contextCursorForInputPosition(
  input: ParseInput,
  pos: number
): TokenCursor<RuntimeHaruToken> {
  const tokens = input.contextTokens ?? input.tokens;
  return new TokenCursor(tokens, sourceIndexForInputPosition(input, pos));
}

function precedingPrefixFormForStem(input: ParseInput): string | null {
  const tokens = input.contextTokens ?? input.tokens;
  const stemIdx = sourceIndexForInputPosition(input, input.start);
  const prefixIdx = previousNonSpaceIndex(tokens, stemIdx, 0);
  const prefix = prefixIdx === null ? undefined : tokens[prefixIdx];
  return prefix !== undefined && (prefix.pos & POS0) === 接頭辞
    ? (prefix.dictionaryForm || prefix.surface)
    : null;
}

function matchToConditionalConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (
    t0 === undefined ||
    (t0.pos & POS0) !== 助詞 ||
    ((t0.pos & POS1) !== 格助詞 && (t0.pos & POS1) !== 接続助詞)
  ) return null;
  if (conditionalToConnectiveRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) === null) return null;
  const t1 = cursor.peek(1);
  if (t1 !== undefined) return null;
  cursor.advance(1);
  return createConnectiveOp({

    connective: "conditional",
    surface: "と",
    source: srcSlice(tokens, pos, 1)
  });
}

function matchElidedHostCommandQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const { tokens, pos } = cursor;
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined
  ) {
    return null;
  }
  if (!quotedPropositionMoodIsDirective(tokens, pos, previousOps)) {
    return null;
  }
  cursor.advance(1);
  return buildElidedHostCommandQuotativeOp(srcSlice(tokens, pos, 1));
}

function quotedPropositionMoodExcludesConditional(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousOps: readonly AuxOpNode[],
  closedByTerminalSfp = false
): boolean {
  if (closedByTerminalSfp) {
    return true;
  }
  const closing = previousOps.at(-1);
  if (closing?.kind === "modal" && closing.modal === "noda") {
    return true;
  }
  if (closing?.kind === "idiom" && closing.idiom === "obligation" && closing.variant === "beki") {
    return true;
  }
  if (closing?.kind === "connective" && closing.connective === "adversative") {
    return true;
  }
  if (closing?.kind === "connective" && closing.connective === "te_form") {
    return true;
  }
  const prev = tokens[markerPos - 1];
  if (prev === undefined) {
    return false;
  }
  const aux = prev.pos & POS4;
  if (aux === 助動詞_タ || aux === 助動詞_タイ) {
    return true;
  }
  const form = prev.pos & POS5A;
  return form === 意志推量形_ || form === 命令形_;
}

function quotedPropositionMood(
  hostStem: RuntimeHaruToken | undefined,
  previousOps: readonly AuxOpNode[],
  quotedSfp?: SfpNode | null,
  closedByQuestionMarker = false
): QuotedPropositionMood {
  const sfpMood = closedByQuestionMarker ? "interrogative" : quotedMoodForClosingSfpEffect(quotedSfp?.effect);
  if (sfpMood !== null) {
    return sfpMood;
  }
  if (hostStem !== undefined && isImperativeInflection(hostStem.pos)) {
    return "imperative";
  }
  if (moodBearingOpBlocksVolitionalSpeechAct(previousOps.at(-1))) {
    return "declarative";
  }
  if (inflectionCarriesVolitionalSpeechAct(hostStem)) {
    return "volitional";
  }
  const moodBearer = previousOps.at(-1);
  if (
    moodBearer !== undefined &&
    hostStem !== undefined &&
    isVerbPredicateToken(hostStem) &&
    opSourceIsVolitionalInChain(moodBearer, previousOps)
  ) {
    return "volitional";
  }
  const closing = previousOps.at(-1);
  if (
    closing?.kind === "polite" &&
    hostStem !== undefined &&
    isVerbPredicateToken(hostStem) &&
    isVolitionalInflection(opLastSourceToken(closing)?.pos ?? 0)
  ) {
    return "volitional";
  }
  return "declarative";
}

function inflectionCarriesVolitionalSpeechAct(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && isVerbPredicateToken(token) && isVolitionalInflection(token.pos);
}

function quotedMoodPayload(
  mood: QuotedPropositionMood
): Pick<PredicateQuoteCarrierOp, "quotedMood"> {
  return mood === "declarative" ? {} : { quotedMood: mood };
}

function absorbBareTeDirectiveIntoCarrier(
  ops: AuxOpNode[],
  carrier: PredicateQuoteCarrierOp,
  hostStem?: RuntimeHaruToken
): PredicateQuoteCarrierOp {
  if (carrier.sourceTerminal !== true) {
    return carrier;
  }
  const last = ops.at(-1);
  if (last?.kind !== "connective" || last.connective !== "te_form") {
    return carrier;
  }
  if (carrier.surface !== "と" && carrier.quotedSfp === undefined) {
    return carrier;
  }
  if (chainCarriesRequestOrProhibitionAspect(ops)) {
    return carrier;
  }
  const teHead = ops.at(-2) === undefined
    ? hostStem
    : opLastSourceToken(ops[ops.length - 2]!) ?? hostStem;
  if (!isTeFormPredicateHeadToken(teHead)) {
    return carrier;
  }
  ops.pop();
  return {
    ...carrier,
    quotedMood: "imperative",
    ...(carrier.quotedSfp === undefined ? {} : { quotedChainMood: "imperative" as const }),
    source: {
      tokens: [...last.source.tokens, ...carrier.source.tokens],
      tokenIndices: [...last.source.tokenIndices, ...carrier.source.tokenIndices]
    }
  };
}

function chainCarriesRequestOrProhibitionAspect(previousOps: readonly AuxOpNode[]): boolean {
  return previousOps.some((op) =>
    op.kind === "aspect" &&
    (op.aspect === "te_kudasai" ||
      op.aspect === "te_kure_tanomu" ||
      op.aspect === "naide_kudasai"));
}

function quotedPropositionMoodIsDirective(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousOps: readonly AuxOpNode[]
): boolean {
  const requestMood = previousOps.some((op) =>
    op.kind === "aspect" &&
    (op.aspect === "te_kudasai" ||
      op.aspect === "te_kure_tanomu" ||
      op.aspect === "naide_kudasai")
  );
  return requestMood || ((tokens[markerPos - 1]?.pos ?? 0) & POS5A) === 命令形_;
}

export function buildElidedHostCommandQuotativeOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "と",
    quotativeMood: "imperative",
    source
  });
}

export function buildHostlessQuotativeClosureOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "と",
    quotativeClosure: "hostless_source_terminal",
    source
  });
}

function matchElidedHostPoliteVolitionalQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined
  ) {
    return null;
  }
  const lastOp = previousOps.at(-1);
  if (
    lastOp?.kind !== "polite" ||
    ((opLastSourceToken(lastOp)?.pos ?? 0) & (POS4 | POS5A)) !== (助動詞_マス | 意志推量形_)
  ) {
    return null;
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 1, contextTokens.length);
  if (nextIdx !== null && !isBoundaryPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

function matchElidedHostPoliteCopulaQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    cursor.peek(1) !== undefined ||
    previousOps[0]?.kind !== "copula" ||
    !previousOps.some((op) => op.kind === "polite")
  ) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

function matchElidedHostConditionalQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ConnectiveOp | null {
  const marker = cursor.current();
  const conditional = previousOps.at(-1);
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    cursor.peek(1) !== undefined ||
    !(
      (conditional?.kind === "connective" && conditional.connective === "conditional") ||
      (conditional?.kind === "copula" && conditional.variant === "conditional_nara")
    )
  ) {
    return null;
  }
  if (
    conditional?.kind === "connective" &&
    conditional.conditionalQuoteEllipsis === "prohibitive_concern"
  ) {
    return null;
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 1, contextTokens.length);
  if (nextIdx !== null && !isHardTerminalPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(1);
  return buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 1, 1));
}

function matchElidedHostQuoteFocusEvenConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const marker = cursor.current();
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  const focus = dewaScopeBridgeRelationAt(cursor.tokens, cursor.pos + 1, {
    consumers: ["tail_multi_clause"]
  });
  if (focus === null || focus.focusParticle !== "mo") {
    return null;
  }
  for (let offset = 3; cursor.peek(offset) !== undefined; offset += 1) {
    const rest = cursor.peek(offset)!;
    if (!pos0in(rest.pos, PUNCTUATION_BITS)) {
      return null;
    }
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  const nextIdx = nextNonSpaceIndex(contextTokens, contextCursor.pos + 3, contextTokens.length);
  if (nextIdx !== null && !isHardTerminalPunctuationToken(contextTokens[nextIdx])) {
    return null;
  }
  cursor.advance(3);
  return {
    ...buildHostlessQuotativeClosureOp(srcSlice(cursor.tokens, cursor.pos - 3, 3)),
    quoteBoundary: {
      koreanClauseForm: "다고",
      requestTailKind: null,
      focusParticle: "でも"
    }
  };
}

const ELIDED_HOST_EXCLAMATIVE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close"
]);

function matchElidedHostQuoteTopicExclamativeSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  const marker = cursor.current();
  if (
    !opsCanAcceptTerminalSfp(ops) ||
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞) ||
    quotedPropositionMoodIsDirective(cursor.tokens, cursor.pos, ops)
  ) {
    return null;
  }
  if (topicFocusMarkerRelationForToken(cursor.peek(1), cursor.pos + 1, {
    acceptedSurfaces: ["は"],
    acceptedParticleSubtypes: [係助詞],
    consumers: ["tail_multi_clause"]
  }) === null) {
    return null;
  }
  let consumed = 2;
  while (((cursor.peek(consumed)?.pos ?? 0) & POS01) === 助詞_終助詞) {
    consumed += 1;
  }
  for (let offset = consumed; cursor.peek(offset) !== undefined; offset += 1) {
    const rest = cursor.peek(offset)!;
    if (!pos0in(rest.pos, PUNCTUATION_BITS)) {
      return null;
    }
  }
  const contextCursor = contextCursorForInputPosition(input, cursor.pos);
  if (quoteStructuralRelationAt(contextCursor, input.lookups) !== undefined) {
    return null;
  }
  const contextTokens = input.contextTokens ?? input.tokens;
  if (!ELIDED_HOST_EXCLAMATIVE_CLOSURES.has(
    utteranceClosureAfter(activeProtoLayout(), contextTokens, contextCursor.pos + consumed).closure
  )) {
    return null;
  }
  const source = srcSlice(cursor.tokens, cursor.pos, consumed);
  cursor.advance(consumed);
  return {
    effect: "quotative_topic_excl",
    surface: "とは",
    consumed,
    repeatCount: 1,
    source
  };
}

function matchBareTteQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens, pos } = cursor;
  const marker = quoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "って") return null;
  if (cursor.peek(1) !== undefined) return null;
  if (!hasRealContentAfterIndex(tokens, marker.span.endExclusive)) return null;
  cursor.advance(marker.span.endExclusive - pos);
  return createConnectiveOp({

    connective: "quotative",
    surface: marker.surface,
    source: srcSlice(tokens, pos, marker.span.endExclusive - pos)
  });
}

function isContractedNegativeConditionalToken(token: RuntimeHaruToken): boolean {
  return (token.surface === "なけりゃ" || token.surface === "なきゃ") &&
    (token.pos & POS5A) === 仮定形_ &&
    (
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) ||
      isAdjNai(token)
    );
}

function matchQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const tokens = input.tokens;
  const pos = cursor.pos;
  const contextCursor = contextCursorForInputPosition(input, pos);
  const contextTokens = contextCursor.tokens;
  const relation = quoteStructuralRelationStartingAt(contextCursor, input.lookups);
  if (
    relation === undefined ||
    (relation.quote.slotKind !== "quoted_content" && relation.quote.slotKind !== "request_content")
  ) return null;
  const boundary = quoteClauseBoundaryFromRelation(contextTokens, relation, input.lookups);
  const markerSpan = quoteConsumedMarkerSpanFromRelation(contextTokens, relation, input.lookups);
  const surface = quoteBoundarySurfaceFromRelation(contextTokens, relation, input.lookups);
  const sourcePos = sourceIndexForInputPosition(input, pos);
  if (
    boundary === null ||
    boundary.kind === "terminal" ||
    markerSpan === null ||
    markerSpan.start !== sourcePos ||
    surface === null
  ) return null;
  if (tariKeijoujiAdverbialToEvidence(contextCursorForInputPosition(input, pos), {
    allowProtoFollowingPredicateEvidence: true,
    lookups: input.lookups
  }) !== null) {
    return null;
  }
  cursor.advance(markerSpan.endExclusive - markerSpan.start);
  return buildQuoteConnectiveOpFromBoundary(
    srcSlice(tokens, pos, markerSpan.endExclusive - markerSpan.start),
    boundary,
    "quotative"
  );
}

function matchBareTeRequestQuoteConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null || teHead.focusParticle !== undefined || teHead.consumed !== 1) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, pos + teHead.consumed, cursor.end);
  if (markerIdx === null) {
    return null;
  }
  const boundary = quoteRequestComplementBoundaryForInput(input, markerIdx);
  if (boundary === null) {
    return null;
  }
  const markerSourceIdx = sourceIndexForInputPosition(input, markerIdx);
  if (boundary.tokenSpan.start !== markerSourceIdx) {
    return null;
  }
  const markerTokenCount = boundary.tokenSpan.end - boundary.tokenSpan.start + 1;
  const consumed = markerIdx - pos + markerTokenCount;
  cursor.advance(consumed);
  return buildQuoteConnectiveOpFromBoundary(srcSlice(tokens, pos, consumed), boundary);
}

function matchQuoteFocusQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  if (!ops.some((op) => op.kind === "modal" && op.modal === "youda")) {
    return null;
  }
  const frame = quoteFocusMarkerStartingAt(cursor);
  if (frame === null) {
    return null;
  }
  cursor.advance();
  return createConnectiveOp({

    connective: "quotative",
    surface: "と",
    source: srcSlice(cursor.tokens, frame.quoteIdx, 1)
  });
}

function matchQuestionQuotativeConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: tokens.length
  });
  if (questionQuote?.continuationKind !== "question_quote_marker") return null;
  if (tokens[questionQuote.span.endExclusive] !== undefined) return null;
  cursor.advance(questionQuote.span.endExclusive - pos);
  return createConnectiveOp({

    connective: "question_quotative",
    surface: questionQuote.surface,
    source: srcSlice(tokens, pos, questionQuote.span.endExclusive - pos)
  });
}

function isQuestionParticleToken(token: RuntimeHaruToken | undefined): boolean {
  return kaMarkerRelationForToken(token, -1, ["tail_multi_clause"]) !== null;
}

export function buildNodaOp(source: OpSource, polite: boolean, past = false): NodaModalOp {
  return createModalOp({

    modal: "noda",
    source,
    polite,
    past
  });
}

export function wakeExplanatoryCopulaPolite(
  t0: RuntimeHaruToken | undefined,
  t1: RuntimeHaruToken | undefined,
  options: { readonly terminalOnly?: boolean } = {}
): boolean | null {
  if (!isWakeNounToken(t0) || t1 === undefined) {
    return null;
  }
  const t1pos5A = t1.pos & POS5A;
  const formAccepted = options.terminalOnly === true
    ? t1pos5A === 終止形_
    : t1pos5A === 終止形_ || t1pos5A === 連用形_;
  if (!formAccepted) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  if (t1pos4 === 助動詞_ダ) {
    return false;
  }
  if (t1pos4 === 助動詞_デス) {
    return true;
  }
  return null;
}

export function wakeExplanatoryCopulaConjecture(
  t0: RuntimeHaruToken | undefined,
  t1: RuntimeHaruToken | undefined
): boolean | null {
  if (!isWakeNounToken(t0) || t1 === undefined) {
    return null;
  }
  if ((t1.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  if (t1pos4 === 助動詞_ダ) {
    return false;
  }
  if (t1pos4 === 助動詞_デス) {
    return true;
  }
  return null;
}

function matchWake(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (!isWakeNounToken(t0)) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return null;
  }
  const t1pos5A = t1.pos & POS5A;

  if (
    (t1.pos & POS4) === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    isPredicativeCopulaSupportVerbAt(tokens, pos + 2)
  ) {
    return {
      op: buildWakeOp(srcSlice(tokens, pos, 3), "explanatory", "affirmative", false),
      consumed: 3
    };
  }

  const explanatoryPolite = wakeExplanatoryCopulaPolite(t0, t1);
  if (explanatoryPolite !== null) {
    return { op: buildWakeOp(srcSlice(tokens, pos, 2), "explanatory", "affirmative", explanatoryPolite), consumed: 2 };
  }
  const directNegEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true, allowConjecture: true });
  if (directNegEnd !== null) {
    return modalMatchWithFusedConjecture({
      op: buildWakeOp(srcSlice(tokens, pos, 1 + directNegEnd.consumed), "rhetorical_no_way", "negative", directNegEnd.polite),
      consumed: 1 + directNegEnd.consumed
    }, directNegEnd, tokens, pos);
  }
  if (
    isAruVerbToken(t1) &&
    (t1pos5A === 終止形_ || t1pos5A === 連体形_)
  ) {
    const afterAru = tokens[pos + 2];
    if (
      afterAru === undefined ||
      isQuestionParticleToken(afterAru) ||
      (afterAru.pos & POS0) === 補助記号 ||
      (afterAru.pos & POS0) === 記号
    ) {
      return {
        op: buildWakeOp(srcSlice(tokens, pos, 2), "rhetorical_possibility", "affirmative", false),
        consumed: 2
      };
    }
  }
  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "rhetorical_no_way", "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  const wakeDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (wakeDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, wakeDewa.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = wakeDewa.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, consumed), "partial_negation", "negative", negEnd.polite),
        consumed
      }, negEnd, tokens, pos);
    }
  }
  if (t1.surface === "でも" && (t1.pos & POS1) === 副助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "weakened_partial_negation", "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  if (canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)) {
    return { op: buildWakeOp(srcSlice(tokens, pos, 1), "explanatory", "affirmative", false), consumed: 1 };
  }
  return null;
}

export function buildWakeOp(
  source: OpSource,
  variant: "explanatory" | "rhetorical_no_way" | "rhetorical_possibility" | "partial_negation" | "weakened_partial_negation",
  polarity: "affirmative" | "negative",
  polite: boolean
): WakeModalOp {
  return createModalOp({

    modal: "wake",
    source,
    variant,
    polarity,
    polite,
    past: false
  });
}

function matchMai(
  cursor: TokenCursor<RuntimeHaruToken>
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (
    t0 === undefined ||
    ((t0.pos & POS4) !== 助動詞_マイ && (t0.pos & POS4) !== 文語助動詞_マジ)
  ) {
    return null;
  }
  const t0pos5A = t0.pos & POS5A;
  if (t0pos5A !== 終止形_ && t0pos5A !== 連体形_ && t0pos5A !== 連用形_) {
    return null;
  }
  return { op: buildMaiOp(srcSlice(tokens, pos, 1)), consumed: 1 };
}

export function buildMaiOp(source: OpSource): MaiModalOp {
  return createModalOp({

    modal: "mai",
    source,
    polite: false,
    past: false
  });
}

export function buildLimitNegationOp(
  source: OpSource,
  focus: LimitNegationFocus,
  polite: boolean
): LimitNegationModalOp {
  return createModalOp({

    modal: "limit_negation",
    source,
    focus,
    polite,
    past: false
  });
}

function matchLimitNegationModal(
  cursor: TokenCursor<RuntimeHaruToken>
): LimitNegationModalOp | null {
  const { tokens, pos } = cursor;
  const frame = quoteFocusLimitNegationTailStartingAt(cursor.fork());
  if (frame === null) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, frame.limitVerbIdx + 1, { allowAttributive: true });
  if (negEnd === null || frame.limitVerbIdx + 1 + negEnd.consumed > cursor.end) {
    return null;
  }
  const consumed = frame.limitVerbIdx + 1 + negEnd.consumed - pos;
  cursor.advance(consumed);
  return buildLimitNegationOp(
    srcSlice(tokens, pos, consumed),
    frame.marker.focusSurface === "も" ? "mo" : "wa",
    negEnd.polite
  );
}

function matchYouda(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx?: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (ctx?.lookups !== undefined && youNiQuoteDirectiveProjectionCoordinate(tokens, pos, ctx.lookups)) {
    return null;
  }
  if (kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) !== null) {
    const you = tokens[pos + 2];
    if (
      nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
      you?.surface === "よう" &&
      (you.pos & POS1) === 助動詞語幹
    ) {
      const after = tokens[pos + 3];
      if (after === undefined) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      if (cursor.lookahead(3, c => matchScopeBridgeTail(c, null)) !== null) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      if (after.surface === "だって") {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      const afterPos4 = after.pos & POS4;
      const afterPos5A = after.pos & POS5A;
      if (
        ((afterPos4 & POS4) === 助動詞_ダ || (afterPos4 & POS4) === 助動詞_デス) &&
        ((afterPos5A & POS5A) === 終止形_ || (afterPos5A & POS5A) === 連用形_ || (afterPos5A & POS5A) === 連体形_)
      ) {
        const terminal: YoudaTerminal = (afterPos5A & POS5A) === 連体形_ ? "attributive_na" : "predicative";
        return {
          op: buildYoudaOp(srcSlice(tokens, pos, 4), "youda", (afterPos4 & POS4) === 助動詞_デス, terminal),
          consumed: 4
        };
      }
    }
  }
  if (t0.surface !== "よう" && t0.surface !== "みたい") return null;
  if ((t0.pos & POS1) !== 助動詞語幹) return null;
  const form: "youda" | "mitai" = t0.surface === "よう" ? "youda" : "mitai";

  if (pos + 1 >= n) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }
  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (!isNominalLike(stemToken) && cursor.lookahead(1, isTerminalSfpBeforeClauseEnd)) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (t1pos4 === 助動詞_ダ && t1pos5A === 仮定形_) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  const dewaRelation = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (dewaRelation !== null) {
    const bridgeForm: ScopeBridgeForm = dewaRelation.focusParticle === "mo" ? "demo" : "dewa";
    const markerConsumed = dewaRelation.span.endExclusive - (pos + 1);
    const bridgeCloses = cursor.lookahead(
      1 + markerConsumed,
      c => (scopeBridgeBodyClosesAt(c, bridgeForm, pos + 1) ? true : null)
    ) === true;
    if (
      bridgeCloses ||
      dewaRelation.focusParticle !== "wa" ||
      likenessNegativeScopeBodyFollowsAt(tokens, dewaRelation.span.endExclusive) ||
      !youdaEvaluativeConditionHasConsequent(cursor, ctx, pos, markerConsumed)
    ) {
      return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
    }
    return youdaEvaluativeConditionMatch(tokens, pos, form, markerConsumed);
  }
  if (isFusedCopulaDewaFocusToken(t1)) {
    const bridgeCloses = cursor.lookahead(
      2,
      c => (scopeBridgeBodyClosesAt(c, "ja", pos + 1) ? true : null)
    ) === true;
    if (
      !bridgeCloses &&
      !likenessNegativeScopeBodyFollowsAt(tokens, pos + 2) &&
      youdaEvaluativeConditionHasConsequent(cursor, ctx, pos, 1)
    ) {
      return youdaEvaluativeConditionMatch(tokens, pos, form, 1);
    }
  }
  if (cursor.lookahead(1, c => matchScopeBridgeTail(c, null)) !== null) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (t1.surface === "だって") {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (isFusedCopulaSupportConditionalToken(t1)) {
    const youda = buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative");
    const connective: ConnectiveOp = createConnectiveOp({
      connective: "conditional",
      surface: "ば",
      source: srcSlice(tokens, pos + 1, 1)
    });
    return { op: youda, ops: [youda, connective], consumed: 2 };
  }

  if ((t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス) && t1pos5A === 意志推量形_) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_ && t1pos5A !== 連体形_) return null;

  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, pos + 2)) {
      return { op: buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative"), consumed: 3 };
    }
    const youdaSimultaneousTokens = copulaSupportSimultaneousConnectiveTokenCountAt(tokens, pos + 2);
    if (youdaSimultaneousTokens !== null) {
      const youda = buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative");
      const connective: ConnectiveOp = createConnectiveOp({
        connective: "simultaneous",
        surface: DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
        source: srcSlice(tokens, pos + 1, 2 + youdaSimultaneousTokens)
      });
      return { op: youda, ops: [youda, connective], consumed: 3 + youdaSimultaneousTokens };
    }
    const support = tokens[pos + 2];
    if (isAffirmativeCopulaSupportVerbToken(support)) {
      if ((support.pos & POS5) === 連用形_促音便) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative"), consumed: 3 };
      }
      if ((support.pos & POS5A) === 連用形_ && renyouChuushiPauseFollowsSupport(cursor, ctx, pos + 3)) {
        const youda = buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative");
        const connective: ConnectiveOp = createConnectiveOp({
          connective: "listing",
          surface: DEARI_LISTING_CONNECTIVE_SURFACE,
          source: srcSlice(tokens, pos + 1, 2)
        });
        return { op: youda, ops: [youda, connective], consumed: 3 };
      }
    }
  }

  const slot = likenessCarrierCopulaSlotAt(tokens, pos + 1);
  if (slot !== null) {
    const terminal: YoudaTerminal = slot.slot === "adnominal" ? "attributive_na" : "predicative";
    return {
      op: buildYoudaOp(srcSlice(tokens, pos, 2), form, slot.polite, terminal),
      consumed: 2
    };
  }
  return null;
}

export const RENYOU_CHUUSHI_PAUSE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause",
  "clause_boundary"
]);

function utteranceClosureAfterParsePosition(input: ParseInput, pos: number): UtteranceClosureKind {
  const tokens = input.contextTokens ?? input.tokens;
  return utteranceClosureAfter(activeProtoLayout(), tokens, sourceIndexForInputPosition(input, pos) + 1).closure;
}

function renyouChuushiPauseFollowsSupport(
  cursor: TokenCursor<RuntimeHaruToken>,
  ctx: ModalMatchContext | undefined,
  pos: number
): boolean {
  const tokens = ctx?.input === undefined
    ? cursor.tokens
    : ctx.input.contextTokens ?? ctx.input.tokens;
  const idx = ctx?.input === undefined ? pos : sourceIndexForInputPosition(ctx.input, pos);
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, idx),
    RENYOU_CHUUSHI_PAUSE_CLOSURES
  );
}

function youNiQuoteDirectiveProjectionCoordinate(
  tokens: readonly RuntimeHaruToken[],
  youIdx: number,
  lookups: LookupTables
): boolean {
  const span = youNiQuoteDirectiveProjectionSpanAt(tokens, youIdx, lookups);
  return span !== null && youNiQuoteDirectiveFollowerAt(tokens, span.markerEndExclusive, lookups);
}

function youdaEvaluativeConditionHasConsequent(
  cursor: TokenCursor<RuntimeHaruToken>,
  ctx: ModalMatchContext | undefined,
  pos: number,
  markerConsumed: number
): boolean {
  const contextCursor = ctx?.input === undefined
    ? cursor.fork(pos, cursor.tokens.length, pos)
    : contextCursorForInputPosition(ctx.input, pos);
  return likenessEvaluativeConditionHasConsequentAt(
    contextCursor,
    contextCursor.pos + 1 + markerConsumed
  );
}

function youdaEvaluativeConditionMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  form: "youda" | "mitai",
  markerConsumed: number
): ModalMatch {
  const youda = buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative");
  const connective: ConnectiveOp = createConnectiveOp({
    connective: "conditional",
    surface: "では",
    source: srcSlice(tokens, pos + 1, markerConsumed)
  });
  return { op: youda, ops: [youda, connective], consumed: 1 + markerConsumed };
}

export function buildYoudaOp(
  source: OpSource,
  form: "youda" | "mitai",
  polite: boolean,
  terminal: YoudaTerminal = "predicative"
): YoudaModalOp {
  return createModalOp({

    modal: "youda",
    source,
    form,
    terminal,
    reading: "likeness",
    candidates: ["likeness"],
    polite,
    past: false
  });
}

function matchSoudaHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;

  const isDirectAfterStem = pos >= 1 && tokens[pos - 1] === stemToken;
  const stemPos5A = stemToken.pos & POS5A;
  const recoveredYotaiStem =
    t0.surface === "そう" &&
    (t0.pos & POS0) === 副詞 &&
    isDirectAfterStem &&
    (stemPos5A === 連用形_ || stemPos5A === 語幹_);
  if (!isSoudaAuxiliaryStemToken(t0) && !recoveredYotaiStem) return null;

  let reading: "hearsay" | "yotai" = "hearsay";
  if (isDirectAfterStem) {
    if (stemPos5A === 連用形_ || stemPos5A === 語幹_ || isBareNaAdjYotaiStemToken(stemToken)) {
      reading = "yotai";
    }
  } else if (isDirectAfterYotaiCarrier(ctx.previousOps, pos)) {
    reading = "yotai";
  }

  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), false, reading), consumed: 1 };
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  const t1IsPoliteCopula = t1pos4 === 助動詞_デス;
  const t1IsAdnominalCopula = t1pos5A === 連体形_ &&
    ((t1.surface === "な" && t1pos4 === 助動詞_ダ) || t1IsPoliteCopula);
  const nominalizerSupportsAdnominalCopula = t1IsAdnominalCopula &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  const terminalNodaSupportsAdnominalCopula = t1IsAdnominalCopula &&
    t1.surface === "な" &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  const adnominalHeadTerminal = t1IsAdnominalCopula &&
    reading === "yotai" &&
    t1.surface === "な" &&
    ctx.input?.allowAdnominalCopulaTerminal === true &&
    pos + 2 >= n &&
    !nominalizerSupportsAdnominalCopula;
  if (
    t1IsAdnominalCopula &&
    (
      nominalizerSupportsAdnominalCopula ||
      terminalNodaSupportsAdnominalCopula ||
      (reading === "yotai" &&
        t1.surface === "な" &&
        ctx.lookups !== undefined &&
        attributiveCopulaTailFollows(tokens, pos + 2, ctx.lookups)) ||
      adnominalHeadTerminal ||
      (reading === "hearsay" &&
        t1.surface === "な" &&
        utteranceClosesAtChunkPosition(cursor, pos + 2, ctx.input))
    )
  ) {
    return {
      op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), t1IsPoliteCopula, reading),
      consumed: 2,
      ...(adnominalHeadTerminal ? { terminal: "attributive" as const } : {})
    };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    const bareFocusNegation = reading === "yotai"
      ? soudaAppearanceFocusNegationAt(tokens, pos + 1)
      : null;
    if (bareFocusNegation !== null) {
      const consumed = 2 + bareFocusNegation.supportConsumed;
      return {
        op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading, bareFocusNegation.particle),
        consumed
      };
    }
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
      ? { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), false, reading), consumed: 1 }
      : null;
  }

  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaNiMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    const focusNegation = soudaAppearanceFocusNegationAt(tokens, pos + 2);
    if (focusNegation !== null) {
      const consumed = 3 + focusNegation.supportConsumed;
      return {
        op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading, focusNegation.particle),
        consumed
      };
    }
  }

  const soudaDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (
    soudaDewa?.focusParticle === "wa" &&
    matchNegationEnding(tokens, soudaDewa.span.endExclusive, { allowAttributive: true }) !== null
  ) {
    const consumed = soudaDewa.span.endExclusive - pos;
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading), consumed };
  }

  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    (copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null ||
      copulaNiMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null) &&
    isPredicativeCopulaSupportVerbAt(tokens, pos + 2)
  ) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 3), false, reading), consumed: 3 };
  }

  if (isAssertiveCopulaMarkerToken(t1)) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), false, reading), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), true, reading), consumed: 2 };
  }
  return null;
}

function isSoudaAuxiliaryStemToken(token: RuntimeHaruToken): boolean {
  if (token.surface !== "そう") {
    return false;
  }
  if ((token.pos & POS1) === 助動詞語幹) {
    return true;
  }
  return false;
}

function isBareNaAdjYotaiStemToken(stemToken: RuntimeHaruToken): boolean {
  return isNaAdjCapable(stemToken);
}

function isNegationStemYotaiCarrier(op: AuxOpNode): boolean {
  if (op.kind !== "negation") return false;
  const last = op.source.tokens[op.source.tokens.length - 1];
  return last !== undefined && isNaiOrNuToken(last) && (last.pos & POS5A) === 語幹_;
}

function isDirectAfterYotaiCarrier(previousOps: readonly AuxOpNode[], pos: number): boolean {
  const previous = previousOps[previousOps.length - 1];
  if (previous === undefined) return false;
  if (previous.kind === "tense" || previous.kind === "polite") {
    return false;
  }
  if (previous.kind === "negation" && !isNegationStemYotaiCarrier(previous)) {
    return false;
  }
  const lastIdx = previous.source.tokenIndices[previous.source.tokenIndices.length - 1];
  if (lastIdx !== pos - 1) return false;
  const lastToken = previous.source.tokens[previous.source.tokens.length - 1];
  const pos5A = (lastToken?.pos ?? 0) & POS5A;
  return pos5A === 連用形_ || pos5A === 語幹_;
}

export function buildSoudaHearsayOp(
  source: OpSource,
  polite: boolean,
  reading: "hearsay" | "yotai",
  negationFocusParticle?: NegationFocusParticle
): SoudaHearsayModalOp {
  return createModalOp({

    modal: "souda_hearsay",
    source,
    reading,
    candidates: [reading],
    polite,
    past: false,
    ...(negationFocusParticle === undefined ? {} : { negationFocusParticle })
  });
}

function soudaAppearanceFocusNegationAt(
  tokens: readonly RuntimeHaruToken[],
  focusIdx: number
): { readonly particle: NegationFocusParticle; readonly supportConsumed: number } | null {
  const focus = tokens[focusIdx];
  if (focus === undefined || (focus.pos & POS01) !== 助詞_係助詞) {
    return null;
  }
  const particle = negationFocusParticleForMarker(focus.surface);
  if (particle === null || matchNegationEnding(tokens, focusIdx + 1, { allowAttributive: true }) === null) {
    return null;
  }
  return {
    particle,
    supportConsumed: isPredicativeCopulaSupportVerbAt(tokens, focusIdx + 1) ? 1 : 0
  };
}

function matchTonokotoHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  _ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const token = tokens[pos];
  if (token === undefined || token.dictionaryForm !== "とのことだ") {
    return null;
  }
  if (token.surface !== "とのことだ" && token.surface !== "とのことです") {
    return null;
  }
  return {
    op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), token.surface === "とのことです", "hearsay"),
    consumed: 1
  };
}

function matchTsumori(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isTsumoriHeadToken(t0)) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return canBareBoundModalCarrierTerminate(pos + 1, n)
      ? { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (t1.surface === "は" && (t1.pos & POS1) === 係助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "topic_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  const tsumoriDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (tsumoriDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, tsumoriDewa.span.endExclusive, { allowAttributive: true });
    if (negEnd !== null) {
      const consumed = tsumoriDewa.span.endExclusive - pos + negEnd.consumed;
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, consumed), negEnd.polite, "copula_negative"),
        consumed
      };
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "copula_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  if (
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    !isObligationSpanStartingAtToken(
      tokens,
      pos + 2,
      ctx.elidedColloquialObligationContext ?? "terminal"
    )
  ) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "copula_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
      ? { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 }
      : null;
  }
  if (t1pos4 === 助動詞_ダ) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 2), false, "affirmative"), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 2), true, "affirmative"), consumed: 2 };
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
  ) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 };
  }
  return null;
}

function isTsumoriHeadToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 名詞) return false;
  const head = token.dictionaryForm || token.surface;
  return head === "つもり" || head === "積もり";
}

export function buildTsumoriOp(
  source: OpSource,
  polite: boolean,
  variant: TsumoriModalOp["variant"]
): TsumoriModalOp {
  return createModalOp({

    modal: "tsumori",
    source,
    variant,
    reading: "intention",
    candidates: ["intention"],
    polarity: variant === "affirmative" ? "affirmative" : "negative",
    polite,
    past: false
  });
}

function matchTokoro(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || t0.surface !== "ところ" || (t0.pos & POS0) !== 名詞) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) return null;
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  if (
    isTokoroAdnominalCopulaBridge(t1) &&
    tokoroAdnominalCopulaTailFollows(tokens, pos + 2, ctx.lookups)
  ) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), t1pos4 === 助動詞_デス), consumed: 2 };
  }
  const focusBridge = cursor.lookahead(1, c => matchScopeBridgeTail(c, null));
  if (focusBridge !== null && focusBridge.polarity === "affirmative") {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)
      ? { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }

  if (
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    t1pos5A === 連用形_
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, pos + 2)) {
      return { op: buildTokoroOp(srcSlice(tokens, pos, 3), false), consumed: 3 };
    }
    const support = tokens[pos + 2];
    if (isAffirmativeCopulaSupportVerbToken(support)) {
      if ((support.pos & POS5) === 連用形_促音便) {
        return { op: buildTokoroOp(srcSlice(tokens, pos, 3), false), consumed: 3 };
      }
      if ((support.pos & POS5A) === 連用形_ && renyouChuushiPauseFollowsSupport(cursor, ctx, pos + 3)) {
        const tokoro = buildTokoroOp(srcSlice(tokens, pos, 3), false);
        const connective: ConnectiveOp = createConnectiveOp({
          connective: "listing",
          surface: DEARI_LISTING_CONNECTIVE_SURFACE,
          source: srcSlice(tokens, pos + 1, 2)
        });
        return { op: tokoro, ops: [tokoro, connective], consumed: 3 };
      }
    }
  }

  if (t1pos4 === 助動詞_ダ) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), false), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), true), consumed: 2 };
  }
  if (canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  return null;
}

function isTokoroAdnominalCopulaBridge(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const pos5A = token.pos & POS5A;
  return (pos4 === 助動詞_ダ || pos4 === 助動詞_デス) &&
    pos5A === 連体形_;
}

function tokoroAdnominalCopulaTailFollows(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): boolean {
  return attributiveCopulaTailFollows(tokens, pos, lookups) ||
    terminalNodaCarrierFollowsAdnominalCopula(tokens, pos);
}

export function buildTokoroOp(
  source: OpSource,
  polite: boolean
): TokoroModalOp {
  return createModalOp({

    modal: "tokoro",
    source,
    variant: "temporal",
    candidates: ["temporal", "place", "intention"],
    reading: "temporal",
    polite,
    past: false
  });
}

interface BekiMatch {
  readonly op: ObligationIdiomOp;
  readonly ops?: readonly AuxOpNode[];
  readonly consumed: number;
}

function matchBekiNegationEnding(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): ReturnType<typeof matchNegationEnding> {
  const terminal = matchNegationEnding(tokens, start);
  if (terminal !== null) {
    return terminal;
  }
  const attributive = matchNegationEnding(tokens, start, { allowAttributive: true });
  if (attributive === null) {
    return null;
  }
  return bekiNegationNominalizerRunClosesAsQuestion(tokens, start + attributive.consumed, lookups)
    ? null
    : attributive;
}

function bekiNegationNominalizerRunClosesAsQuestion(
  tokens: readonly RuntimeHaruToken[],
  nominalizerIdx: number,
  lookups: LookupTables
): boolean {
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return false;
  }
  const carrierIdx = nextNonSpaceIndex(tokens, nominalizerIdx + 1, tokens.length);
  if (carrierIdx === null) {
    return predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    }) === null;
  }
  const carrier = tokens[carrierIdx];
  if (carrier === undefined || isTerminalishPunctuationToken(carrier)) {
    return true;
  }
  if (kaOwnershipKindAt(tokens, carrierIdx, lookups) === "question") {
    return true;
  }
  if (!isTerminalCopulaFamilyToken(carrier) && conjectureCopulaPoliteness(carrier.pos) === null) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, carrierIdx + 1, tokens.length);
  return kaIdx !== null && kaOwnershipKindAt(tokens, kaIdx, lookups) === "question";
}

function matchBeki(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): BekiMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || (t0.pos & POS4) !== 文語助動詞_ベシ) return null;
  if (t0.surface === "べく" && (t0.pos & POS5A) === 連用形_) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return cursor.lookahead(1, canCloseBareBekiBeforeBoundary)
      ? {
        op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
        consumed: 1
      }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (isConjectureAuxToken(t1)) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }

  const bekiDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (bekiDewa?.focusParticle === "wa") {
    const negEnd = matchBekiNegationEnding(tokens, bekiDewa.span.endExclusive, input.lookups);
    if (negEnd !== null) {
      const consumed = bekiDewa.span.endExclusive - pos + negEnd.consumed;
      return {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, consumed),
          "beki",
          "negative",
          negEnd.polite
        ),
        consumed
      };
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchBekiNegationEnding(tokens, pos + 2, input.lookups);
    if (negEnd !== null) {
      return {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, 2 + negEnd.consumed),
          "beki",
          "negative",
          negEnd.polite
        ),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  const obligationOp = (source: OpSource, polite = false): ObligationIdiomOp =>
    buildObligationIdiomOp(source, "beki", "affirmative", polite);

  const bekiCopulaDe = copulaDeMarkerRelationForToken(t1, pos + 1, {
    consumers: ["tail_multi_clause"]
  });
  if (
    bekiCopulaDe !== null &&
    t1pos5A === 連用形_ &&
    isAffirmativeCopulaSupportVerbToken(tokens[pos + 2])
  ) {
    const supported = matchBekiCopulaSupport(input, cursor, pos + 1);
    if (supported !== null) {
      return supported;
    }
  }

  if (bekiRedundantQuoteCopulaBoundaryStartsAt(input, pos + 1)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }

  if (
    (t1pos5A === 終止形_ || t1pos5A === 連用形_) &&
    (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス)
  ) {
    return {
      op: buildObligationIdiomOp(
        srcSlice(tokens, pos, 2),
        "beki",
        "affirmative",
        t1pos4 === 助動詞_デス
      ),
      consumed: 2
    };
  }
  if (cursor.lookahead(1, c => canBekiFeedPredicateQuoteCarrier(c, input.lookups, input))) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (bekiClosesBeforeTypedQuoteBoundary(input, pos + 1)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (t1pos5A === 連体形_ && (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_ジャ || t1pos4 === 助動詞_ヤ)) {
    return {
      op: obligationOp(srcSlice(tokens, pos, 1)),
      consumed: 1
    };
  }
  if (cursor.lookahead(1, canCloseBareBekiBeforeBoundary)) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }
  if (
    (t0.pos & POS5A) === 連体形_ &&
    isTerminalParticleToken(t1) &&
    (isTerminalYoSfpSurface(t1) || isTerminalNeSfpSurface(t1)) &&
    remainderIsChainFinalSfpRun(cursor, pos + 1, t0)
  ) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki"),
      consumed: 1
    };
  }
  return null;
}

function matchBekiCopulaSupport(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  copulaPos: number
): BekiMatch | null {
  const { tokens, pos } = cursor;
  const match = matchCopula(tokens, copulaPos, input.lookups, {
    sourceContext: {
      tokens: input.contextTokens ?? input.tokens,
      index: sourceIndexForInputPosition(input, copulaPos)
    }
  });
  if (match === null || match.consumed < copulaPos - pos + 1) {
    return null;
  }
  const trailing = (match.ops ?? []).filter(op => op !== match.op);
  const consumed = copulaPos - pos + match.consumed;
  if (match.op.polarity === "negative") {
    return match.op.variant === "basic" && trailing.length === 0
      ? {
        op: buildObligationIdiomOp(
          srcSlice(tokens, pos, consumed),
          "beki",
          "negative",
          match.op.polite
        ),
        consumed
      }
      : null;
  }
  const negationIdx = copulaPos + match.consumed;
  const negation = tokens[negationIdx];
  if (
    negation !== undefined &&
    trailing.length === 0 &&
    match.op.variant === "basic" &&
    isNegationToken(negation, tokens[negationIdx + 1]) &&
    !isObligationSpanStartingAtToken(tokens, negationIdx)
  ) {
    return {
      op: buildObligationIdiomOp(srcSlice(tokens, pos, consumed + 1), "beki", "negative", false),
      consumed: consumed + 1
    };
  }
  if (trailing.length > 0) {
    if (match.op.variant !== "basic") {
      return null;
    }
    const op = buildObligationIdiomOp(srcSlice(tokens, pos, 1), "beki");
    return { op, ops: [op, ...trailing], consumed };
  }
  if (match.op.variant === "basic") {
    return { op: buildObligationIdiomOp(srcSlice(tokens, pos, consumed), "beki"), consumed };
  }
  if (match.op.variant === "conjecture") {
    const op = buildObligationIdiomOp(srcSlice(tokens, pos, copulaPos - pos + 1), "beki");
    const conjecture = buildConjectureOp(
      srcSlice(tokens, copulaPos + 1, consumed - (copulaPos - pos + 1)),
      false
    );
    return { op, ops: [op, conjecture], consumed };
  }
  return null;
}

function matchBekiAtCursor(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly op: ObligationIdiomOp; readonly ops?: readonly AuxOpNode[] } | null {
  const match = matchBeki(input, cursor);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops })
  };
}

function bekiRedundantQuoteCopulaBoundaryStartsAt(
  input: ParseInput,
  copulaPos: number
): boolean {
  const copula = input.tokens[copulaPos];
  if (!isRedundantPredicateQuoteCopula(copula)) {
    return false;
  }
  const quotePos = copulaPos + 1;
  const quote = input.tokens[quotePos];
  if (quote === undefined) {
    return false;
  }

  const startIndex = sourceIndexForInputPosition(input, copulaPos);
  const endIndex = sourceIndexForInputPosition(input, quotePos);
  const hint = input.outgoingBoundaryHint;
  if (
    hint !== undefined &&
    hint.quoteBoundary !== undefined &&
    hint.tokenSpan.start === startIndex &&
    hint.tokenSpan.end === endIndex
  ) {
    return true;
  }

  const relation = quoteStructuralRelationStartingAt(contextCursorForInputPosition(input, copulaPos), input.lookups);
  const markerSpan = relation === undefined
    ? null
    : quoteConsumedMarkerSpanFromRelation(input.tokens, relation, input.lookups);
  return relation !== undefined &&
    relation.quote.slotKind === "quoted_content" &&
    markerSpan !== null &&
    markerSpan.start === copulaPos &&
    markerSpan.endExclusive - 1 === quotePos;
}

function bekiClosesBeforeTypedQuoteBoundary(
  input: ParseInput,
  boundaryPos: number
): boolean {
  const hint = input.outgoingBoundaryHint;
  if (hint === undefined || input.tokens[boundaryPos] === undefined) {
    return false;
  }
  if (hint.tokenSpan.start !== sourceIndexForInputPosition(input, boundaryPos)) {
    return false;
  }
  return hint.quoteBoundary !== undefined ||
    (hint.connectiveKind === "predicate_projection_quote_attributive" && hint.attributiveBoundary !== undefined);
}

function canBekiFeedPredicateQuoteCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  input?: ParseInput
): boolean {
  const { tokens, pos } = cursor;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return false;
  }
  const carrier = tokens[quoteMarker.span.endExclusive];
  if (carrier === undefined) {
    return false;
  }
  const after = quoteMarker.span.endExclusive + 1;
  return predicateQuoteCarrierStyle(cursor, carrier, after, lookups, input) !== null &&
    cursor.lookahead(after - pos, c => predicateQuoteCarrierCanContinue(c, lookups));
}

function isConjectureAuxToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const pos5A = token.pos & POS5A;
  return pos5A === 意志推量形_ &&
    (pos4 === 助動詞_ダ || pos4 === 助動詞_デス || pos4 === 助動詞_ヤ);
}

function matchKotoGaDekiru(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): PotentialKotoGaDekiruIdiomOp | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isKotoNounToken(t0)) return null;

  let scan = pos + 1;
  let focusParticle: PotentialKotoDekiruFocusParticle | null = null;
  const focusCanonical = secondaryParticleCanonical(tokens[scan]);
  if (focusCanonical !== null && isPotentialKotoDekiruFocusParticle(focusCanonical, lookups)) {
    focusParticle = focusCanonical;
    scan += 1;
  }

  let particleKind: PotentialKotoDekiruParticleKind | null = null;
  const particle = tokens[scan];
  if (particle !== undefined && (particle.pos & POS0) === 助詞) {
    const particlePos1 = particle.pos & POS1;
    if ((particle.surface === "が" || particle.surface === "の") && (particlePos1 & POS1) === 格助詞) {
      particleKind = "ga";
      scan += 1;
    } else if (particle.surface === "は" && (particlePos1 & POS1) === 係助詞) {
      particleKind = "wa";
      scan += 1;
    } else if (particle.surface === "も" && (particlePos1 & POS1) === 係助詞) {
      particleKind = "mo";
      scan += 1;
    }
  }

  if (particleKind === null) {
    if (focusParticle === null) {
      return null;
    }
    particleKind = "focus";
  }
  if (focusParticle !== null && particleKind === "ga") {
    return null;
  }

  const dekiru = tokens[scan];
  if (dekiru === undefined || !isPotentialDekiruToken(dekiru)) return null;
  const dekiruPos5A = dekiru.pos & POS5A;
  if (
    dekiruPos5A !== 終止形_ &&
    dekiruPos5A !== 連体形_ &&
    dekiruPos5A !== 連用形_ &&
    dekiruPos5A !== 未然形_ &&
    dekiruPos5A !== 仮定形_
  ) {
    return null;
  }
  const consumed = (scan - pos) + 1;
  cursor.advance(consumed);
  return buildPotentialKotoGaDekiruIdiomOp(
    srcSlice(tokens, pos, consumed),
    particleKind,
    focusParticle
  );
}

export function buildPotentialKotoGaDekiruIdiomOp(
  source: OpSource,
  particleKind: PotentialKotoDekiruParticleKind,
  focusParticle: PotentialKotoDekiruFocusParticle | null
): PotentialKotoGaDekiruIdiomOp {
  return createIdiomOp({

    idiom: "potential_koto_ga_dekiru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    particleKind,
    focusParticle
  });
}

function matchExperienceKotoGaAru(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ExperienceIdiomOp | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isKotoNounToken(t0) || t0.surface !== "こと") return null;
  if (!previousOpsHaveExperiencePastAttributive(previousOps)) return null;

  const particle = tokens[pos + 1];
  if (
    particle === undefined ||
    (particle.pos & POS0) !== 助詞 ||
    !(particle.surface === "が" || particle.surface === "も")
  ) {
    return null;
  }
  const particleKind: ExperienceIdiomOp["particleKind"] = particle.surface === "も" ? "mo" : "ga";

  const predicatePos = pos + 2;
  const predicate = tokens[predicatePos];
  if (predicate === undefined) return null;

  if (isAruVerbToken(predicate)) {
    const pos5A = predicate.pos & POS5A;
    if (
      pos5A !== 終止形_ &&
      pos5A !== 連体形_ &&
      pos5A !== 連用形_
    ) {
      return null;
    }
    const nextAfterPredicate = tokens[predicatePos + 1];
    if (
      pos5A === 連用形_ &&
      isTeConnectiveToken(nextAfterPredicate)
    ) {
      return null;
    }

    const negativeEnding = matchNegationEnding(tokens, predicatePos);
    if (negativeEnding !== null && negativeEnding.consumed > 1) {
      let consumed = 2 + negativeEnding.consumed;
      let past = false;
      const desu = tokens[pos + consumed];
      const ta = tokens[pos + consumed + 1];
      if (
        desu?.dictionaryForm === "です" &&
        (desu.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_) &&
        ta !== undefined &&
        (ta.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_)
      ) {
        consumed += 2;
        past = true;
      }
      cursor.advance(consumed);
      return buildExperienceIdiomOp(
        srcSlice(tokens, pos, consumed),
        particleKind,
        "negative",
        true,
        past
      );
    }

    cursor.advance(3);
    return buildExperienceIdiomOp(srcSlice(tokens, pos, 3), particleKind);
  }

  const negativeEnding = matchNegationEnding(tokens, predicatePos, { allowAttributive: true });
  if (negativeEnding !== null) {
    const consumed = 2 + negativeEnding.consumed;
    cursor.advance(consumed);
    return buildExperienceIdiomOp(
      srcSlice(tokens, pos, consumed),
      particleKind,
      "negative",
      negativeEnding.polite
    );
  }

  return null;
}

export function buildExperienceIdiomOp(
  source: OpSource,
  particleKind: ExperienceIdiomOp["particleKind"],
  polarity: ExperienceIdiomOp["polarity"] = "affirmative",
  polite = false,
  past = false
): ExperienceIdiomOp {
  return createIdiomOp({

    idiom: "experience_koto_ga_aru",
    source,
    polarity,
    polite,
    past,
    particleKind
  });
}

function matchDecisionKotoNiSuru(
  cursor: TokenCursor<RuntimeHaruToken>
): DecisionKotoNiSuruIdiomOp | null {
  const { tokens, pos } = cursor;
  const koto = tokens[pos];
  if (koto === undefined || !isKotoNounToken(koto) || koto.surface !== "こと") return null;
  const ni = tokens[pos + 1];
  if (caseParticleMarkerRelationForToken(ni, pos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) === null) return null;
  const suru = tokens[pos + 2];
  if (suru === undefined || !isVerbLemma(suru, "する")) return null;
  const suruPos5A = suru.pos & POS5A;
  if (
    suruPos5A !== 終止形_ &&
    suruPos5A !== 連用形_ &&
    suruPos5A !== 連体形_ &&
    !(suruPos5A === 意志推量形_ && !hasRealContentAfterIndex(tokens, pos + 3) && !kotoStemIsPastAttributive(tokens, pos))
  ) {
    return null;
  }
  const close = tokens[pos + 3];
  const volitionalClose =
    suruPos5A === 終止形_ &&
    close !== undefined &&
    (close.pos & POS01) === 助詞_終助詞 &&
    ["か", "かな", "かね"].includes(close.surface) &&
    !hasRealContentAfterIndex(tokens, pos + 4);
  cursor.advance(3);
  return buildDecisionKotoNiSuruIdiomOp(srcSlice(tokens, pos, 3), volitionalClose);
}

export function buildDecisionKotoNiSuruIdiomOp(
  source: OpSource,
  volitionalClose = false
): DecisionKotoNiSuruIdiomOp {
  return createIdiomOp({

    idiom: "decision_koto_ni_suru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    ...(volitionalClose ? { volitionalClose: true as const } : {})
  });
}

function kotoStemIsPastAttributive(tokens: readonly RuntimeHaruToken[], kotoIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kotoIdx);
  if (prevIdx === null) return false;
  return ((tokens[prevIdx]?.pos ?? 0) & POS4) === 助動詞_タ;
}

function matchOutcomeKotoNiNaru(
  cursor: TokenCursor<RuntimeHaruToken>
): OutcomeKotoNiNaruIdiomOp | null {
  const { tokens, pos } = cursor;
  const match = matchOutcomeKotoNiNaruSurfaceAt(tokens, pos);
  if (match === null) return null;
  cursor.advance(match.consumed);
  return buildOutcomeKotoNiNaruIdiomOp(
    srcSlice(tokens, pos, match.consumed),
    match.stative
  );
}

export function buildOutcomeKotoNiNaruIdiomOp(
  source: OpSource,
  stative = false
): OutcomeKotoNiNaruIdiomOp {
  return createIdiomOp({

    idiom: "outcome_koto_ni_naru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    ...(stative ? { stative: true as const } : {})
  });
}

function matchDecisionToSuru(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken | undefined
): DecisionKotoNiSuruIdiomOp | null {
  if (ops.length !== 0 || stemTok === undefined) return null;
  if ((stemTok.pos & (POS0 | POS5A)) !== (動詞 | 終止形_)) return null;
  const { tokens, pos } = cursor;
  const marker = quoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "と") return null;
  const suruIdx = marker.span.endExclusive;
  const suru = tokens[suruIdx];
  if (suru === undefined || !isVerbLemma(suru, "する") || !isSuruVerbToken(suru)) return null;
  const suruPos5A = suru.pos & POS5A;
  if (suruPos5A !== 意志推量形_ && suruPos5A !== 終止形_) return null;
  const close = tokens[suruIdx + 1];
  if (
    close === undefined ||
    (close.pos & POS01) !== 助詞_終助詞 ||
    !["か", "かな", "かね"].includes(close.surface) ||
    hasRealContentAfterIndex(tokens, suruIdx + 2)
  ) {
    return null;
  }
  const consumed = suruIdx + 1 - pos;
  cursor.advance(consumed);
  return buildDecisionKotoNiSuruIdiomOp(
    srcSlice(tokens, pos, consumed),
    suruPos5A === 終止形_
  );
}

function previousOpsBlockKotoWaNeedless(previousOps: readonly AuxOpNode[]): boolean {
  return previousOps.some((op) =>
    op.kind === "negation" ||
    op.kind === "tense"
  );
}

function matchKotoWaPoliteNegativeExistential(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly polite: boolean; readonly past: boolean; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const aru = tokens[pos];
  if (
    !isAruVerbToken(aru) ||
    (aru.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const masu = tokens[pos + 1];
  const n = tokens[pos + 2];
  if (
    masu === undefined ||
    n === undefined ||
    (masu.pos & (POS4 | POS5A)) !== (助動詞_マス | 未然形_) ||
    (n.pos & POS4) !== 助動詞_ヌ
  ) {
    return null;
  }
  const desu = tokens[pos + 3];
  const ta = tokens[pos + 4];
  if (
    desu !== undefined &&
    ta !== undefined &&
    desu.dictionaryForm === "です" &&
    (desu.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_) &&
    (ta.pos & POS4) === 助動詞_タ
  ) {
    cursor.advance(5);
    return { polite: true, past: true, consumed: 5 };
  }
  cursor.advance(3);
  return { polite: true, past: false, consumed: 3 };
}

function matchNegativeNecessityKotoWa(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemToken: RuntimeHaruToken
): NegativeNecessityKotoWaIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const koto = cursor.current();
  const topic = cursor.peek(1);
  if (
    koto === undefined ||
    topic === undefined ||
    !isKotoNounToken(koto) ||
    topic.surface !== "は" ||
    (topic.pos & POS01) !== 助詞_係助詞
  ) {
    return null;
  }
  if ((stemToken.pos & POS0) !== 動詞 || previousOpsBlockKotoWaNeedless(previousOps)) {
    return null;
  }

  const tail = tokens[pos + 2];
  if (tail === undefined) {
    return null;
  }
  if (isNegationToken(tail)) {
    cursor.advance(2);
    return buildNegativeNecessityKotoWaIdiomOp(srcSlice(tokens, pos, 2));
  }
  const politeNegative = cursor.lookahead(2, matchKotoWaPoliteNegativeExistential);
  if (politeNegative !== null) {
    const consumed = 2 + politeNegative.consumed;
    cursor.advance(consumed);
    return buildNegativeNecessityKotoWaIdiomOp(
      srcSlice(tokens, pos, consumed),
      "negative",
      politeNegative.polite,
      politeNegative.past
    );
  }
  return null;
}

export function buildNegativeNecessityKotoWaIdiomOp(
  source: OpSource,
  polarity: NegativeNecessityKotoWaIdiomOp["polarity"] = "affirmative",
  polite = false,
  past = false
): NegativeNecessityKotoWaIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_koto_wa",
    source,
    polarity,
    polite,
    past
  });
}

function isHokaOnlyOptionToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (token.surface === "ほか" || token.surface === "他") &&
    (token.reading === "ホカ" || token.dictionaryForm === "ほか" || token.dictionaryForm === "他");
}

function isShikaOnlyOptionToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    token.surface === "しか";
}

function matchOnlyOptionNaruNegative(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly polite: boolean; readonly consumed: number } | null {
  const naru = tokens[pos];
  if (
    naru === undefined ||
    (naru.pos & (POS0 | POS5A)) !== (動詞 | 未然形_) ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "成る")
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  return { polite: negEnd.polite, consumed: 1 + negEnd.consumed };
}

function matchOnlyOption(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken
): OnlyOptionIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if ((stemToken.pos & POS0) !== 動詞) {
    return null;
  }
  const markerToken = cursor.current();
  const marker = isShikaOnlyOptionToken(markerToken)
    ? "shika"
    : isHokaOnlyOptionToken(markerToken)
      ? "hoka"
      : null;
  if (marker === null) {
    return null;
  }
  const directNeg = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
  const hokaNaruNeg = marker === "hoka"
    ? matchOnlyOptionNaruNegative(tokens, pos + 1)
    : null;
  const negEnd = directNeg ?? hokaNaruNeg;
  if (negEnd === null) {
    return null;
  }
  const consumed = 1 + negEnd.consumed;
  cursor.advance(consumed);
  return buildOnlyOptionIdiomOp(srcSlice(tokens, pos, consumed), marker, negEnd.polite);
}

export function buildOnlyOptionIdiomOp(
  source: OpSource,
  marker: OnlyOptionIdiomOp["marker"],
  polite = false
): OnlyOptionIdiomOp {
  return createIdiomOp({

    idiom: "only_option_shika_nai",
    marker,
    source,
    polarity: "negative",
    polite,
    past: false
  });
}

function matchWakeImpossibleIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): WakeImpossibleIdiomOp | null {
  const { tokens, pos } = cursor;
  const wake = tokens[pos];
  const ni = tokens[pos + 1];
  const focus = tokens[pos + 2];
  const iku = tokens[pos + 3];
  if (
    wake === undefined ||
    (wake.pos & POS0) !== 名詞 ||
    wake.reading !== "ワケ" ||
    caseParticleMarkerRelationForToken(ni, pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    (focus?.surface !== "は" && focus?.surface !== "も") ||
    (focus.pos & POS0) !== 助詞 ||
    (iku === undefined || (iku.pos & POS0) !== 動詞) ||
    (iku.dictionaryForm !== "いく" && iku.dictionaryForm !== "ゆく")
  ) {
    return null;
  }

  const aux = cursor.lookahead(4, collectAuxTokens);
  let auxLen = aux.length;
  while (auxLen > 0 && ((aux[auxLen - 1]?.pos ?? 0) & POS5A) === 意志推量形_) {
    auxLen -= 1;
  }
  const idiomAux = aux.slice(0, auxLen);
  if (!auxHasNegation(idiomAux) && !auxHasNegativePolite(idiomAux)) {
    return null;
  }
  const consumed = 4 + auxLen;
  cursor.advance(consumed);
  return buildWakeImpossibleIdiomOp(
    srcSlice(tokens, pos, consumed),
    focus.surface === "も" ? "mo" : "wa",
    auxHasPolite(idiomAux),
    auxHasPast(idiomAux)
  );
}

export function buildWakeImpossibleIdiomOp(
  source: OpSource,
  focus: WakeImpossibleIdiomOp["focus"],
  polite = false,
  past = false
): WakeImpossibleIdiomOp {
  return createIdiomOp({

    idiom: "wake_impossible",
    source,
    polarity: "negative",
    polite,
    past,
    focus
  });
}

function matchInevitableZaruOEnaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): InevitableIdiomOp | null {
  const { tokens, pos } = cursor;
  const zaru = tokens[pos];
  const possibleParticle = tokens[pos + 1];
  const particleRelation = caseParticleMarkerRelationForToken(possibleParticle, pos + 1, {
    acceptedSurfaces: ["を"],
    consumers: ["tail_multi_clause"]
  });
  const hasParticle = particleRelation !== null;
  const eruOffset = hasParticle ? 2 : 1;
  const eru = tokens[pos + eruOffset];
  if (
    zaru === undefined ||
    zaru.surface !== "ざる" ||
    zaru.dictionaryForm !== "ぬ" ||
    (zaru.pos & (POS4 | POS5A)) !== (助動詞_ヌ | 連体形_) ||
    (eru === undefined || (eru.pos & POS0) !== 動詞) ||
    (eru.dictionaryForm !== "得る" && eru.dictionaryForm !== "える")
  ) {
    return null;
  }
  const eruPos5A = eru.pos & POS5A;
  const auxStart = eruOffset + 1;
  const aux = cursor.lookahead(auxStart, collectAuxTokens);
  if (!auxHasNegation(aux) && !auxHasNegativePolite(aux)) {
    return null;
  }
  const acceptsNegative =
    (eruPos5A & POS5A) === 未然形_ ||
    (auxHasNegativePolite(aux) && (eruPos5A & POS5A) === 連用形_) ||
    (auxHasPolite(aux) && (eruPos5A & POS5A) === 連用形_);
  if (!acceptsNegative) {
    return null;
  }
  const consumed = auxStart + aux.length;
  cursor.advance(consumed);
  return buildInevitableIdiomOp(
    srcSlice(tokens, pos, consumed),
    auxHasPolite(aux),
    auxHasPast(aux)
  );
}

export function buildInevitableIdiomOp(
  source: OpSource,
  polite = false,
  past = false
): InevitableIdiomOp {
  return createIdiomOp({

    idiom: "inevitable_zaru_o_enai",
    source,
    polarity: "negative",
    polite,
    past
  });
}

export function matchCannotRefrainNegativeDewaIrarenai(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): CannotRefrainIdiomOp | null {
  const { tokens, pos, end: n } = cursor;
  const previous = previousOps[previousOps.length - 1];
  if (previous?.kind !== "negation") {
    return null;
  }
  const marker = matchCannotRefrainFocusMarker(tokens, pos);
  if (marker === null) {
    return null;
  }
  const iruPos = pos + marker.consumed;
  const iru = tokens[iruPos];
  const rareru = tokens[iruPos + 1];
  if (
    !isIruVerbToken(iru) ||
    (iru.pos & POS5A) !== 未然形_ ||
    rareru === undefined ||
    (rareru.pos & POS4) !== 助動詞_レル
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, iruPos + 2, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  const rareruPos5A = rareru.pos & POS5A;
  const acceptsNegation =
    (rareruPos5A & POS5A) === 未然形_ ||
    (negEnd.startsWithMasen === true && (rareruPos5A & POS5A) === 連用形_);
  if (!acceptsNegation) {
    return null;
  }
  const consumed = marker.consumed + 2 + negEnd.consumed;
  if (pos + consumed > n) {
    return null;
  }
  cursor.advance(consumed);
  return buildCannotRefrainIdiomOp(srcSlice(tokens, pos, consumed), negEnd.polite);
}

export function buildCannotRefrainIdiomOp(
  source: OpSource,
  polite = false
): CannotRefrainIdiomOp {
  return createIdiomOp({

    idiom: "cannot_refrain_negative_dewa_irarenai",
    source,
    polarity: "negative",
    polite,
    past: false
  });
}

function matchCannotRefrainFocusMarker(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number } | null {
  const dewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (dewa?.focusParticle === "wa") {
    return { consumed: dewa.span.endExclusive - pos };
  }
  const ni = tokens[pos];
  const wa = tokens[pos + 1];
  if (
    caseParticleMarkerRelationForToken(ni, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    wa?.surface === "は" &&
    (wa.pos & POS01) === 助詞_係助詞
  ) {
    return { consumed: 2 };
  }
  return null;
}

function matchMethodYouGaNaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): MethodYouGaNaiIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = (methodYouIdiomHostIsVerbalRenyouAt(tokens, pos)
    ? methodYouGaNaiIdiomShapeAt(tokens, pos)
    : null) ??
    fusedVolitionalMethodYouIdiomShapeAt(tokens, pos);
  if (shape === null) {
    return null;
  }
  cursor.advance(shape.consumed);
  return buildMethodYouGaNaiIdiomOp(
    srcSlice(tokens, pos, shape.consumed),
    shape.surface,
    shape.particleKind,
    shape.polite,
    shape.past
  );
}

export function buildMethodYouGaNaiIdiomOp(
  source: OpSource,
  surface: MethodYouGaNaiIdiomOp["surface"],
  particleKind: MethodYouGaNaiIdiomOp["particleKind"] = "ga",
  polite = false,
  past = false
): MethodYouGaNaiIdiomOp {
  return createIdiomOp({

    idiom: "method_you_ga_nai",
    source,
    polarity: "negative",
    polite,
    past,
    surface,
    particleKind
  });
}

function matchMadeMoNaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): NegativeNecessityMadeMoIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const made = cursor.current();
  const mo = cursor.peek(1);
  if (
    made === undefined ||
    made.surface !== "まで" ||
    (made.pos & POS1) !== 副助詞 ||
    mo?.surface !== "も" ||
    (mo.pos & POS01) !== 助詞_係助詞
  ) {
    return null;
  }
  const negEnd = matchNegativeExistentialEndingWithPast(tokens, pos + 2);
  if (negEnd === null) {
    return null;
  }
  const consumed = 2 + negEnd.consumed;
  cursor.advance(consumed);
  return buildNegativeNecessityMadeMoIdiomOp(
    srcSlice(tokens, pos, consumed),
    negEnd.polite,
    negEnd.past
  );
}

export function buildNegativeNecessityMadeMoIdiomOp(
  source: OpSource,
  polite = false,
  past = false
): NegativeNecessityMadeMoIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_made_mo",
    source,
    polarity: "negative",
    polite,
    past
  });
}

function previousOpsHaveExperiencePastAttributive(ops: readonly AuxOpNode[]): boolean {
  const last = ops.length > 0 ? ops[ops.length - 1] : undefined;
  if (last?.kind === "tense" && last.tense === "past") {
    return true;
  }
  if (last?.kind === "negation" && last.chainPast) {
    return true;
  }
  return false;
}

function isPotentialDekiruToken(token: RuntimeHaruToken): boolean {
  return isVerbLemma(token, "できる", "出来る");
}

function isPotentialKotoDekiruFocusParticle(surface: string, lookups: LookupTables): surface is PotentialKotoDekiruFocusParticle {
  return lookups.KOTO_DEKIRU_FOCUS_PARTICLES.has(surface);
}


interface TeConnectiveHead {
  readonly consumed: number;
  readonly focusParticle?: "は" | "も";
}

function teFamilyContinuationHostAdmitted(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): boolean {
  return teDeContinuationRelationAt(tokens, pos, {
    consumers: ["tail_boundary_readiness"],
    lookups
  }) !== null;
}

function matchTeConnectiveHead(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): TeConnectiveHead | null {
  const head = matchTeConnectiveHeadAt(tokens, pos);
  if (head === null) {
    return null;
  }
  return head.focusParticle === undefined
    ? { consumed: head.consumed }
    : { consumed: head.consumed, focusParticle: head.focusParticle };
}

function matchSimpleAspect(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): readonly [SimpleAspectOp] | readonly [SimpleAspectOp, VoiceOp] | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = tokens[pos + teHead.consumed];
  if (t1 === undefined) return null;
  const imperativeFormEntry = teTailImperativeFormEntryForToken(t1);
  if (imperativeFormEntry === undefined) {
    if ((t1.pos & POS01) !== 動詞_非自立可能) return null;
    if (!isSimpleAspectAuxActivationAccepted(t1, tokens[pos + teHead.consumed + 1])) return null;
  }
  if (classifyTeTailContinuation(t1, lookups) !== "simple_aspect") return null;
  const potentialDerivation = teTailContinuationDerivationForToken(t1) === "potential";
  const aspectLemma = imperativeFormEntry?.forms[0] ??
    (potentialDerivation ? teTailContinuationLexemeEntryForToken(t1)?.forms[0] : undefined) ??
    t1.dictionaryForm;

  let aspect: SimpleAspectOp["aspect"];
  const directionalAspect = directionalTeAspectFromAux(t1, tokens, pos + teHead.consumed);
  if (directionalAspect !== null) {
    const t1Form = t1.dictionaryForm || t1.surface;
    if (
      (t1Form === "まいる" || t1Form === "参る") &&
      ["ある", "有る"].includes(stemTok.dictionaryForm || "")
    ) {
      return null;
    }
    aspect = directionalAspect;
  } else switch (aspectLemma) {
    case "いる":
    case "居る":
    case "おる":
    case "いらっしゃる":
    case "いらしゃる":
    case "ござる":
    case "御座る":
      aspect = "te_iru";
      break;
    case "ある":
    case "有る":
      aspect = "te_aru";
      break;
    case "おく":
    case "置く":
      aspect = "te_oku";
      break;
    case "しまう":
      aspect = "te_shimau";
      break;
    case "みる":
    case "見る":
      aspect = "te_miru";
      break;
    case "回る":
    case "廻る":
    case "まわる":
      if (teMawaruItinerantVetoed(stemTok.dictionaryForm || stemTok.surface, t1.dictionaryForm || t1.surface, lookups)) {
        return null;
      }
      aspect = "te_mawaru";
      break;
    default:
      return null;
  }
  if (
    aspect === "te_kuru" &&
    lookups.TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS.has(teKuruRequestSourceKey(stemTok)) &&
    teKuruAuxHasFollowingBenefactiveTail(tokens, pos + teHead.consumed, lookups)
  ) {
    return null;
  }
  const splitVolitionalConsumed = splitTeIruVolitionalSuffixConsumed(cursor, pos + teHead.consumed, aspect, lookups);
  const consumed = teHead.consumed + 1 + splitVolitionalConsumed;
  const terminalMood = imperativeFormEntry !== undefined || (t1.pos & POS5A) === 命令形_ ? "imperative" : undefined;
  const lexemeEntry = teTailContinuationLexemeEntryForToken(t1);
  const followingRareruReading = lexemeEntry?.followingRareruReading;
  const auxiliaryHonorific = lexemeEntry?.auxiliaryHonorific;
  if (auxiliaryHonorific === "respect" && (t1.pos & POS5A) === 命令形_) {
    return null;
  }
  cursor.advance(consumed);
  const aspectOp = buildSimpleAspectOp(srcSlice(tokens, pos, consumed), aspect, {
    ...(auxiliaryHonorific === undefined ? {} : { auxiliaryHonorific }),
    ...(terminalMood === undefined ? {} : { terminalMood }),
    ...(followingRareruReading === undefined ? {} : { followingRareruReading }),
    ...(teHead.focusParticle === undefined ? {} : { teFocusParticle: teHead.focusParticle })
  });
  return potentialDerivation
    ? [aspectOp, buildVoiceOp(srcSingle(t1, pos + teHead.consumed), "potential")]
    : [aspectOp];
}

function teKuruRequestSourceKey(token: RuntimeHaruToken): string {
  const form = token.dictionaryForm || token.surface;
  return (token.pos & (POS0 | POS2)) === (名詞 | サ変可能) ? `${form}する` : form;
}

function teKuruAuxHasFollowingBenefactiveTail(
  tokens: readonly RuntimeHaruToken[],
  auxPos: number,
  lookups: LookupTables
): boolean {
  const tePos = auxPos + 1;
  const nextAuxPos = auxPos + 2;
  const te = tokens[tePos];
  const nextAux = tokens[nextAuxPos];
  return te !== undefined &&
    isTeConnectiveToken(te) &&
    nextAux !== undefined &&
    (nextAux.pos & POS01) === 動詞_非自立可能 &&
    isTeBenefactiveActivationAccepted(nextAux, tokens[nextAuxPos + 1]) &&
    classifyTeTailContinuation(nextAux, lookups) === "benefactive";
}

function splitTeIruVolitionalSuffixConsumed(
  cursor: TokenCursor<RuntimeHaruToken>,
  auxPos: number,
  aspect: SimpleAspectOp["aspect"],
  lookups: LookupTables
): number {
  const { tokens } = cursor;
  if (aspect !== "te_iru" || !isSplitTeIruVolitionalStemAt(tokens, auxPos + 1)) {
    return 0;
  }
  const afterYou = auxPos + 2;
  const confirmationCursor = cursor.fork(afterYou, tokens.length, afterYou);
  if (
    confirmationCursor.lookahead(0, matchVolitionalConfirmationJanaiKa) !== null ||
    confirmationCursor.lookahead(0, c => matchJaNaiConfirmationSequence(c, lookups)) !== null ||
    confirmationCursor.lookahead(0, c => matchDewaNaiKaConfirmationSequence(c, lookups)) !== null ||
    confirmationCursor.lookahead(0, c => matchDirectDewaNaiKaConfirmationSequence(c, lookups)) !== null
  ) {
    return 1;
  }
  const next = tokens[afterYou];
  if (next !== undefined && (next.pos & PUNCTUATION_BITS) !== 0) {
    return 1;
  }
  if (
    next !== undefined &&
    next.surface === "と" &&
    quoteMarkerRelationAt(tokens, afterYou, { consumers: ["quote_content"] }) !== null
  ) {
    return 1;
  }
  return 0;
}

function isSplitTeIruVolitionalStemAt(tokens: readonly RuntimeHaruToken[], youPos: number): boolean {
  const iru = tokens[youPos - 1];
  const you = tokens[youPos];
  if (
    iru === undefined ||
    you === undefined ||
    (iru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return false;
  }
  const form = iru.dictionaryForm || iru.surface;
  if (form !== "いる" && form !== "居る" && form !== "おる") {
    return false;
  }
  return you.surface === "よう" &&
    (you.pos & POS01) === 形状詞_助動詞語幹;
}

function directionalTeAspectFromAux(
  token: RuntimeHaruToken,
  tokens?: readonly RuntimeHaruToken[],
  tokenIdx?: number
): "te_kuru" | "te_iku" | null {
  switch (teTailContinuationDirectionForToken(token)) {
    case "te_kuru":
      return "te_kuru";
    case "te_iku":
      return "te_iku";
    case "by_tense":
      return tokens !== undefined && tokenIdx !== undefined &&
        auxFollowedByPastTa(tokens, tokenIdx)
        ? "te_kuru"
        : "te_iku";
    case undefined:
      return null;
  }
}

function auxFollowedByPastTa(tokens: readonly RuntimeHaruToken[], auxIdx: number): boolean {
  const n1 = tokens[auxIdx + 1];
  if (n1 === undefined) return false;
  if ((n1.pos & POS4) === 助動詞_タ) return true;
  if (n1.dictionaryForm === "ます") {
    const n2 = tokens[auxIdx + 2];
    return n2 !== undefined && (n2.pos & POS4) === 助動詞_タ;
  }
  return false;
}

export function matchTsutsuAruAspect(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  const t1 = cursor.peek(1);
  if (
    t0 === undefined ||
    t1 === undefined ||
    t0.surface !== "つつ" ||
    !isAruVerbToken(t1)
  ) {
    return null;
  }
  cursor.advance(2);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 2), "tsutsu_aru", {
    semantic: {
      reading: "progressive",
      renderStrategy: "resultative_state",
      projection: "default"
    }
  });
}

const CARRIER_TERMINAL_MOOD_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

interface CarrierTerminalReach {
  readonly ok: boolean;
  readonly sfpAbsorbed: boolean;
  readonly atChunkEnd: boolean;
}

function carrierTerminalReachWithinChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number
): CarrierTerminalReach {
  const scope = activeProtoLayout();
  let probe = start;
  let sawSfp = false;
  for (;;) {
    const closure = utteranceClosureAfter(scope, tokens, probe);
    if (closesUtteranceAs(closure, CARRIER_TERMINAL_MOOD_CLOSURES)) {
      return { ok: true, sfpAbsorbed: sawSfp, atChunkEnd: closure.closure === "eos" };
    }
    if (closure.closure !== "none") {
      return { ok: false, sfpAbsorbed: sawSfp, atChunkEnd: false };
    }
    const token = tokens[closure.tokenIdx];
    if (token === undefined || (token.pos & POS01) !== 助詞_終助詞) {
      return { ok: false, sfpAbsorbed: sawSfp, atChunkEnd: false };
    }
    sawSfp = true;
    probe = closure.tokenIdx + 1;
  }
}

export const CARRIER_TERMINAL_QUOTE_CONTINUATION_BLOCKERS: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    "eos",
    "hard_terminal",
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "clause_boundary"
  ]);

function carrierTerminalQuoteContinuationFollows(
  context: CarrierTerminalContext,
  start: number
): boolean {
  const stream = context.tokens;
  const scope = activeProtoLayout();
  let probe = context.indexOf(start - 1) + 1;
  for (;;) {
    const closure = utteranceClosureAfter(scope, stream, probe);
    if (closure.closure === "weak_pause") {
      probe = closure.tokenIdx + 1;
      continue;
    }
    const closureIdx = utteranceClosureTokenIdx(closure);
    if (closureIdx === null || closesUtteranceAs(closure, CARRIER_TERMINAL_QUOTE_CONTINUATION_BLOCKERS)) {
      return false;
    }
    const token = stream[closureIdx];
    if (token !== undefined && (token.pos & POS01) === 助詞_終助詞) {
      probe = closureIdx + 1;
      continue;
    }
    return quoteMarkerRelationAt(stream, closureIdx, {
      consumers: ["tail_boundary_readiness"]
    }) !== null;
  }
}

function isCarrierTerminalMoodPosition(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  context: CarrierTerminalContext | null,
  admitsQuoteContinuation: boolean
): boolean {
  const reach = carrierTerminalReachWithinChunk(tokens, start);
  if (!reach.ok) {
    return false;
  }
  if (admitsQuoteContinuation || !reach.sfpAbsorbed || !reach.atChunkEnd || context === null) {
    return true;
  }
  return !carrierTerminalQuoteContinuationFollows(context, start);
}

interface CarrierTerminalContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly indexOf: (pos: number) => number;
}

function carrierTerminalContextFor(input: ParseInput): CarrierTerminalContext {
  return {
    tokens: input.contextTokens ?? input.tokens,
    indexOf: (pos: number) => sourceIndexForInputPosition(input, pos)
  };
}

function isStateChangeCarrierImperativeTerminal(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  token: RuntimeHaruToken,
  context: CarrierTerminalContext | null
): boolean {
  if ((token.pos & POS5A) !== 命令形_) return false;
  if (token.dictionaryForm !== "なる" && token.dictionaryForm !== "する") return false;
  return isCarrierTerminalMoodPosition(tokens, pos + 1, context, false);
}

function isStateChangeCarrierVolitionalTerminal(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  token: RuntimeHaruToken,
  context: CarrierTerminalContext | null
): boolean {
  if ((token.pos & POS5A) !== 意志推量形_) return false;
  if (token.dictionaryForm !== "なる" && token.dictionaryForm !== "する") return false;
  const nextIdx = nextNonSpaceIndex(tokens, pos + 1, tokens.length);
  if (
    nextIdx !== null &&
    nextIdx !== undefined &&
    quoteMarkerRelationAt(tokens, nextIdx, { consumers: ["tail_boundary_readiness"] }) !== null
  ) {
    return true;
  }
  return isCarrierTerminalMoodPosition(tokens, pos + 1, context, true);
}

function isHonorificNasaiImperativeToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  if ((token.pos & (POS0 | POS5A)) !== (動詞 | 命令形_)) return false;
  const form = token.dictionaryForm || token.surface;
  return form === "なさる" || form === "為さる" || token.surface === "なさい";
}

export function matchPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  lookups: LookupTables,
  precedingPrefixForm: string | null,
  carrierTerminalContext: CarrierTerminalContext | null = null,
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || !isPostverbAuxiliaryToken(token)) return null;
  const accustomedAuxiliary = accustomedAuxiliaryPayloadForToken(token, stem, ops);
  const auxiliaries = accustomedAuxiliary === undefined
    ? postverbAuxiliaryPayloadsForForm(token.dictionaryForm)
    : [accustomedAuxiliary];
  if (auxiliaries.length === 0) return null;
  const activationAccepted = isPostverbAuxiliaryActivationAccepted(token, tokens[pos + 1]);
  const carrierImperativeTerminal = !activationAccepted &&
    isStateChangeCarrierImperativeTerminal(tokens, pos, token, carrierTerminalContext);
  const declaredImperativeTerminal = !activationAccepted &&
    !carrierImperativeTerminal &&
    (token.pos & POS5A) === 命令形_ &&
    isCarrierTerminalMoodPosition(tokens, pos + 1, carrierTerminalContext, false);
  if (!activationAccepted && !carrierImperativeTerminal && !declaredImperativeTerminal) {
    return null;
  }
  const followsStateChange = previousOpIsStateChangePostverbAuxiliary(ops);
  const followsCopulaSupportRenyou = previousOpIsCopulaSupportRenyouHost(ops);
  for (const auxiliary of auxiliaries) {
    if (!postverbAuxiliarySourceTokenClassMatches(auxiliary, token)) {
      continue;
    }
    if (declaredImperativeTerminal && auxiliary.admitsImperativeTerminal !== true) {
      continue;
    }
    if (!postverbAuxiliaryChainStateAdmitted(auxiliary, ops)) {
      continue;
    }
    if (
      auxiliary.requiredPrefixForms !== undefined &&
      (precedingPrefixForm === null || !auxiliary.requiredPrefixForms.includes(precedingPrefixForm))
    ) {
      continue;
    }
    if (!hostChainAttachesForPostverbAuxiliary(stem, ops, auxiliary.requiredHostForms ?? [])) {
      continue;
    }
    if (
      auxiliary.followingAuxiliaryKind !== undefined &&
      !postverbAuxiliaryPayloadsForForm(tokens[pos + 1]?.dictionaryForm).some(
        (following) => following.kind === auxiliary.followingAuxiliaryKind
      )
    ) {
      continue;
    }
    if (auxiliary.kind === "determined_completion") {
      continue;
    }
    if (auxiliary.kind === "accustomed" && !stemCanHostAccustomedPostverb(stem)) {
      continue;
    }
    if (auxiliary.kind === "appearance_control" && !stemCanProjectAdjectivalPredicate(stem)) {
      continue;
    }
    if (!postverbAuxiliaryHostMatches(auxiliary, stemTok, lookups)) {
      continue;
    }
    if (isStateChangePostverbAuxiliaryKind(auxiliary.kind)) {
      if (!stemCanProjectStateChange(stem) || !canOpenStateChangePostverb(stem, ops)) {
        continue;
      }
    } else if (auxiliary.kind === "make_state_change") {
      const makeStateChangeNext = tokens[pos + 1];
      if (
        canOpenMakeStateChangeCausativePostverb(stem, stemTok, ops, makeStateChangeNext) &&
        !isCausativeItadakuHumbleFollower(tokens, pos)
      ) {
        cursor.advance(2);
        return buildPostverbAuxiliaryOp(
          srcSlice(tokens, pos, 2),
          { ...auxiliary, kind: "make_state_change_causative" }
        );
      }
      if (!canOpenMakeStateChangePostverb(stem, stemTok, ops, makeStateChangeNext)) {
        continue;
      }
    } else if (
      !followsStateChange &&
      !(auxiliary.kind === "potential" && followsCopulaSupportRenyou) &&
      !stemCanHostPostverbAuxiliary(auxiliary, stem)
    ) {
      continue;
    }
    if (auxiliary.kind === "difficulty") {
      const negative = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
      if (negative !== null) {
        cursor.advance(1 + negative.consumed);
        return buildPostverbAuxiliaryOp(
          srcSlice(tokens, pos, 1 + negative.consumed),
          {
            ...auxiliary,
            kind: "risk_potential",
            ...(negative.polite ? { polite: true } : {})
          }
        );
      }
    }
    cursor.advance(1);
    return buildPostverbAuxiliaryOp(
      srcSlice(tokens, pos, 1),
      auxiliary,
      auxiliary.kind === "potential" && followsCopulaSupportRenyou
        ? { hostAttach: "copula_support" }
        : {}
    );
  }
  return null;
}

function rebuildsPredicateBaseForPostverbAdmission(op: AuxOpNode): boolean {
  return op.kind === "postverbAuxiliary" || op.kind === "predicateQuoteCarrier";
}

function postverbAuxiliaryChainStateAdmitted(
  auxiliary: PostverbAuxiliaryPayload,
  ops: readonly AuxOpNode[]
): boolean {
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index]!;
    if (rebuildsPredicateBaseForPostverbAdmission(op)) {
      return true;
    }
    if (op.kind === "tense" || op.kind === "polite") {
      return false;
    }
    if (op.kind === "negation" && auxiliary.admitsPrecedingNegation !== true) {
      return false;
    }
  }
  return true;
}

function postverbAuxiliaryHostMatches(
  auxiliary: PostverbAuxiliaryPayload,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  const lookupName = auxiliary.hostLookup;
  if (lookupName === undefined) {
    return true;
  }
  const lookup = lookups.named(lookupName);
  if (lookup === undefined) {
    return false;
  }
  return lookupSetMatches(lookup, stemTok.dictionaryForm) ||
    lookupSetMatches(lookup, stemTok.surface);
}

function accustomedAuxiliaryPayloadForToken(
  token: RuntimeHaruToken,
  stem: StemNode,
  ops: readonly AuxOpNode[]
): PostverbAuxiliaryPayload | undefined {
  if (
    token.dictionaryForm !== "なれる" ||
    !stemCanHostAccustomedPostverb(stem) ||
    followsCopulaProjection(ops)
  ) {
    return undefined;
  }
  return postverbAuxiliaryPayloadForForm("慣れる");
}

function followsCopulaProjection(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => op.kind === "copula");
}

function stemCanHostAccustomedPostverb(stem: StemNode): boolean {
  return stemCanHostVerbPostverbAuxiliary(stem);
}

function stemCanHostVerbPostverbAuxiliary(stem: StemNode): boolean {
  return stemHasSourceVerbalPredicateEvidence(stem) &&
    stemSupportsProjectionCategory(stem, "verbal_predicate");
}

function postverbAuxiliaryDeclaresVerbalAttach(auxiliary: PostverbAuxiliaryPayload): boolean {
  return postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "verb_renyou") ||
    postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "te_form") ||
    postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "sahen_stem");
}

function stemCanHostPostverbAuxiliary(
  auxiliary: PostverbAuxiliaryPayload,
  stem: StemNode
): boolean {
  const contract = headContractForPostverbAuxiliary(auxiliary.kind);
  if (contract !== undefined && !stemSupportsAnyProjectionKind(stem, contract.accepts)) {
    return false;
  }
  if (auxiliary.kind === "excessive") {
    return stemCanHostVerbPostverbAuxiliary(stem) || stemCanHostAdjectiveExcessivePostverb(stem);
  }
  if (!postverbAuxiliaryDeclaresVerbalAttach(auxiliary)) {
    return stemCanProjectAdjectivalPredicate(stem);
  }
  return stemCanHostVerbPostverbAuxiliary(stem);
}

function stemCanProjectAdjectivalPredicate(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

function stemSupportsAnyProjectionKind(stem: StemNode, projectionKinds: readonly HeadProjectionKind[]): boolean {
  if (stem.kind === "candidateSet") {
    return stem.headHypothesis?.candidates.some((candidate) =>
      candidate.status === "admitted" &&
      candidate.headProfile?.capabilities.some((capability) =>
        capability.choices.some((choice) => projectionKinds.includes(choice.projectionKind))
      ) === true
    ) === true;
  }
  return projectionKinds.includes(directProjectionKindForStem(stem)) ||
    (stem.kind === "adj" && projectionKinds.includes("adverbialized_adjectival")) ||
    (stem.kind === "verb" && projectionKinds.includes("adverbialized_verbal"));
}

function directProjectionKindForStem(stem: Exclude<StemNode, { readonly kind: "candidateSet" }>): HeadProjectionKind {
  if (stem.kind === "noun") {
    return "direct_nominal";
  }
  if (stem.kind === "adj") {
    return "direct_adjectival";
  }
  if (stem.kind === "verb") {
    return "direct_verbal";
  }
  return "direct_adverbial";
}

function stemCanHostAdjectiveExcessivePostverb(stem: StemNode): boolean {
  return stemCanProjectAdjectivalPredicate(stem);
}

function matchTeYaruDeterminedCompletion(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const support = tokens[pos + teHead.consumed];
  if (support === undefined || (support.pos & POS01) !== 動詞_非自立可能) return null;
  const auxiliary = postverbAuxiliaryPayloadForForm(support.dictionaryForm);
  if (auxiliary?.kind !== "determined_completion") return null;
  if (!postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "te_form")) return null;
  if (!isTeBenefactiveActivationAccepted(support, tokens[pos + teHead.consumed + 1])) return null;
  if (stemTok.dictionaryForm !== support.dictionaryForm && !(stemTok.dictionaryForm === "遣る" && support.dictionaryForm === "やる")) {
    return null;
  }
  cursor.advance(teHead.consumed + 1);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, teHead.consumed + 1), auxiliary);
}

function reanchoringDerivationalSuffixProfileForHost(
  dictionaryForm: string,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): { readonly profile: DerivationalSuffixProfile; readonly hostIsVerbal: boolean } | undefined {
  const chainFinalCategory = chainFinalOpHostCategory(ops.at(-1));
  const profile = chainFinalCategory !== undefined
    ? derivationalSuffixProfileFor(dictionaryForm, chainFinalCategory)
    : resolveDerivationalSuffixProfile(stemTok, dictionaryForm);
  if (profile === undefined || profile.hostForm === "noun_compound") {
    return undefined;
  }
  const hostIsVerbal = chainFinalCategory !== undefined
    ? chainFinalCategory === "verbal_predicate"
    : (profile.hostCategories.length === 1 && profile.hostCategories[0] === "verbal_predicate");
  return { profile, hostIsVerbal };
}

function chainFinalHostAttachToken(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): RuntimeHaruToken | undefined {
  const source = ops.at(-1)?.source ?? stem.source;
  return source.tokens.at(-1);
}

function hostChainAttachesAsRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach);
}

function chainClosesWithCategory(
  stem: StemNode,
  ops: readonly AuxOpNode[],
  category: DerivationalSuffixHostCategory,
  tokenIsCategory: (token: RuntimeHaruToken) => boolean
): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  if (attach === undefined) {
    return false;
  }
  const lastOp = ops.at(-1);
  const declared = lastOp === undefined ? undefined : chainFinalOpHostCategory(lastOp);
  return declared === undefined ? tokenIsCategory(attach) : declared === category;
}

function hostChainAttachesAsVerbalRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  return hostChainAttachesAsRenyou(stem, ops) &&
    chainClosesWithCategory(stem, ops, "verbal_predicate", isVerbPredicateToken);
}

function hostChainAttachesAsAdjectivalRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined &&
    isRenyouInflectedToken(attach) &&
    !isNaiOrNuToken(attach) &&
    chainClosesWithCategory(stem, ops, "adjectival_predicate", isIAdjectivePredicateToken);
}

function hostChainAttachesAsNegativeRenyou(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach) && isNaiOrNuToken(attach);
}

function hostChainAttachesAsCopulaNi(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const lastOp = ops.at(-1);
  if (lastOp?.kind === "copula") {
    return lastOp.basicForm === "adverbial_ni";
  }
  return copulaNiMarkerRelationForToken(chainFinalHostAttachToken(stem, ops), 0, {
    consumers: ["tail_boundary_readiness"]
  }) !== null;
}

function hostChainAttachesAsAdjectiveStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined &&
    (attach.pos & POS5A) === 語幹_ &&
    chainClosesWithCategory(stem, ops, "adjectival_predicate", isIAdjectivePredicateToken);
}

function hostChainAttachesAsNominalCopulaStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  if (ops.length !== 0) {
    return false;
  }
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && (isNominalCopulaHostPos(attach.pos) || isPureNaAdjStem(attach));
}

function hostChainAttachesAsNaStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isNaAdjCapable(attach);
}

function hostChainAttachesAsSahenStem(stem: StemNode, ops: readonly AuxOpNode[]): boolean {
  if (ops.length !== 0 || !stemHasSahenSourcePredicate(stem)) {
    return false;
  }
  const attach = chainFinalHostAttachToken(stem, ops);
  return attach !== undefined && isRenyouInflectedToken(attach);
}

function hostChainAttachesForPostverbAuxiliary(
  stem: StemNode,
  ops: readonly AuxOpNode[],
  attachForms: readonly PostverbHostAttachForm[]
): boolean {
  return attachForms.some((form) => {
    switch (form) {
      case "te_form":
        return ops.at(-1)?.kind === "connective" && (ops.at(-1) as ConnectiveOp).connective === "te_form";
      case "verb_renyou":
        return hostChainAttachesAsVerbalRenyou(stem, ops);
      case "adjectival_renyou":
        return hostChainAttachesAsAdjectivalRenyou(stem, ops);
      case "negative_renyou":
        return hostChainAttachesAsNegativeRenyou(stem, ops);
      case "copula_ni":
        return hostChainAttachesAsCopulaNi(stem, ops);
      case "adjective_stem":
        return hostChainAttachesAsAdjectiveStem(stem, ops);
      case "na_stem":
        return hostChainAttachesAsNaStem(stem, ops);
      case "sahen_stem":
        return hostChainAttachesAsSahenStem(stem, ops);
    }
  });
}

function matchPredicateSuffix(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  lookups: LookupTables
): PredicateSuffixOp | null {
  const token = cursor.current();
  if (token === undefined) return null;
  if (
    !isAdjectivalDerivationalSuffix(token) &&
    !isNaAdjectiveDerivationalSuffix(token) &&
    !isVerbalDerivationalSuffixToken(token) &&
    !isNominalDerivationalSuffix(token)
  ) return null;
  if (!stemSupportsAnyProjectionCategory(stem, ["adjectival_predicate", "verbal_predicate"])) {
    return null;
  }

  if (isAdjectivalDerivationalSuffix(token) || isVerbalDerivationalSuffixToken(token)) {
    const inChainProfile = derivationalSuffixProfileFor(token.dictionaryForm, "verbal_predicate")
      ?? derivationalSuffixProfileFor(token.dictionaryForm, "adjectival_predicate");
    if (inChainProfile === undefined || inChainProfile.hostForm === "noun_compound") {
      return null;
    }
    if (
      inChainProfile.hostForm !== "nominal_ki" &&
      !lexicalHostAdmitsDerivationalProfile(inChainProfile, stemTok, token.dictionaryForm, ops)
    ) {
      return null;
    }
    return consumePredicateSuffix(cursor, token, inChainProfile);
  }

  const resolved = reanchoringDerivationalSuffixProfileForHost(token.dictionaryForm, stemTok, ops);
  if (resolved === undefined) {
    return null;
  }
  const profile = resolved.profile;
  if (
    profile.hostForm === "stem_root" &&
    !lexicalHostAdmitsDerivationalProfile(profile, stemTok, token.dictionaryForm, ops)
  ) {
    return null;
  }
  if (profile.sourcePos === "接尾辞-名詞的" && resolved.hostIsVerbal && !hostChainAttachesAsRenyou(stem, ops)) {
    return null;
  }
  if (profile.sourcePos === "接尾辞-名詞的" && !copulaStartsPredicateAt(cursor.tokens, cursor.pos + 1, lookups)) {
    return null;
  }
  return consumePredicateSuffix(cursor, token, profile);
}

function lexicalHostAdmitsDerivationalProfile(
  profile: DerivationalSuffixProfile,
  stemTok: RuntimeHaruToken,
  dictionaryForm: string | undefined,
  ops: readonly AuxOpNode[]
): boolean {
  return ops.length === 0 &&
    resolveDerivationalSuffixProfile(stemTok, dictionaryForm)?.id === profile.id;
}

function consumePredicateSuffix(
  cursor: TokenCursor<RuntimeHaruToken>,
  token: RuntimeHaruToken,
  profile: DerivationalSuffixProfile
): PredicateSuffixOp {
  cursor.advance(1);
  return buildPredicateSuffixOp(
    srcSlice(cursor.tokens, cursor.pos - 1, 1),
    profile.legacySuffixKind ?? null,
    profile.id,
    token.surface
  );
}

export function buildPredicateSuffixOp(
  source: OpSource,
  suffix: PredicateSuffixOp["suffix"],
  profileId: string,
  surface: string
): PredicateSuffixOp {
  return createPredicateSuffixOp({

    suffix,
    profileId,
    surface,
    source
  });
}

function previousOpIsReanchoringDerivationalSuffix(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previous !== undefined && reanchoringDerivationalProfile(previous) !== null;
}

function previousOpIsCopulaSupportRenyouHost(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (previous === undefined) {
    return false;
  }
  if (previous.kind !== "copula" && previous.kind !== "scopeBridge") {
    return false;
  }
  if (previous.polarity !== "affirmative") {
    return false;
  }
  if (previous.kind === "scopeBridge") {
    if (previous.head !== null || (previous.particle !== "wa" && previous.particle !== "mo")) {
      return false;
    }
    if (previous.particle === "wa" && previous.markerTagging !== "copula") {
      return false;
    }
  }
  const attach = previous.source.tokens.at(-1);
  return attach !== undefined &&
    isAffirmativeCopulaSupportVerbToken(attach) &&
    (attach.pos & POS5A) === 連用形_;
}

function previousOpIsStateChangePostverbAuxiliary(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previous?.kind === "postverbAuxiliary" &&
    isStateChangePostverbAuxiliaryKind(previous.auxiliary.kind);
}

function isFusedJaCopulaTerminalBeforeSfp(
  lastOp: AuxOpNode,
  lastTok: RuntimeHaruToken,
  sfp: SfpNode | null
): boolean {
  return sfp !== null &&
    lastOp.kind === "copula" &&
    lastOp.variant === "basic" &&
    lastOp.polarity === "affirmative" &&
    lastOp.source.tokens.length === 1 &&
    isFusedJaCopulaToken(lastTok);
}

function previousOpIsAffirmativeCopulaNi(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previousOpIsAffirmativeBasicCopula(ops) &&
    previous !== undefined &&
    previous.source.tokens.some((token, index) =>
      copulaNiMarkerRelationForToken(token, index, {
        consumers: ["tail_boundary_readiness"]
      }) !== null
    );
}

function previousOpIsSoudaYotaiAdverbialNi(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (
    previous?.kind !== "modal" ||
    previous.modal !== "souda_hearsay" ||
    previous.reading !== "yotai"
  ) {
    return false;
  }
  return previous.source.tokens.some((token, index) =>
    copulaNiMarkerRelationForToken(token, index, {
      consumers: ["tail_boundary_readiness"]
    }) !== null
  );
}

function previousOpIsAffirmativeBasicCopula(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return (
    previous?.kind === "copula" &&
    previous.variant === "basic" &&
    previous.polarity === "affirmative"
  );
}

function previousOpFeedsStateChangePostverb(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (previous === undefined) {
    return false;
  }
  if (chainFinalOpHostCategory(previous) === "adjectival_predicate") {
    return true;
  }
  if (previous.kind === "copula" || previous.kind === "scopeBridge") {
    return previous.polarity === "negative";
  }
  return previous.kind === "idiom" && stateChangeCanFollowIdiom(previous);
}

function stateChangeCanFollowIdiom(op: Extract<AuxOpNode, { readonly kind: "idiom" }>): boolean {
  switch (op.idiom) {
    case "obligation":
    case "forbidden":
    case "negative_necessity_sumu":
    case "negative_necessity_koto_wa":
    case "inevitable_zaru_o_enai":
    case "cannot_refrain_negative_dewa_irarenai":
    case "method_you_ga_nai":
    case "wake_impossible":
    case "only_option_shika_nai":
      return true;
    default:
      return false;
  }
}

function canOpenStateChangePostverb(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): boolean {
  if (ops.length === 0) {
    return stem.commitment === "suppletive_negation" || stemCanProjectAdjectivalPredicate(stem);
  }
  if (previousOpIsAffirmativeBasicCopula(ops)) {
    return true;
  }
  return previousOpFeedsStateChangePostverb(ops) && stemCanProjectStateChange(stem);
}

function stemCanProjectStateChange(stem: StemNode): boolean {
  if (stem.kind === "verb" || stem.kind === "adj" || stem.kind === "noun") {
    return true;
  }
  return stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate", "nominal"]);
}

function stemCanProjectFormalToStateResult(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

function canOpenMakeStateChangePostverb(
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  nextTok: RuntimeHaruToken | undefined
): boolean {
  return (
    previousOpIsAffirmativeBasicCopula(ops) &&
    (stemCanProjectFormalToStateResult(stem) || copulaHostIsMakeStateDerivationalNoun(ops)) &&
    (stemTok.pos & POS1) !== 助動詞語幹 &&
    (copulaHostIsMakeStateDerivationalNoun(ops) || !isCausativeSuruAuxiliaryFollower(nextTok))
  );
}

function copulaHostIsMakeStateDerivationalNoun(ops: readonly AuxOpNode[]): boolean {
  const host = ops.at(-2);
  return host?.kind === "predicateSuffix" &&
    derivationalSuffixProfileById(host.profileId)?.makeStateCarrier !== undefined;
}

function canOpenMakeStateChangeCausativePostverb(
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  nextTok: RuntimeHaruToken | undefined
): boolean {
  return (
    previousOpIsAffirmativeBasicCopula(ops) &&
    stemCanProjectFormalToStateResult(stem) &&
    (stemTok.pos & POS1) !== 助動詞語幹 &&
    isCausativeSuruAuxiliaryFollower(nextTok)
  );
}

function isCausativeSuruAuxiliaryFollower(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

function isCausativeItadakuHumbleFollower(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const te = tokens[pos + 2];
  const receive = tokens[pos + 3];
  return te !== undefined &&
    te.surface === "て" &&
    (te.pos & POS01) === 助詞_接続助詞 &&
    receive !== undefined &&
    (receive.pos & POS0) === 動詞 &&
    (receive.dictionaryForm === "いただく" ||
      receive.dictionaryForm === "頂く" ||
      receive.dictionaryForm === "いただける" ||
      receive.dictionaryForm === "頂ける");
}

export function matchFormalToStateResultPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  options: { readonly suppressToSuruControl?: boolean } = {}
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (ops.length !== 0 || !stemCanProjectFormalToStateResult(stem)) {
    return null;
  }
  const marker = cursor.current();
  const verb = cursor.peek(1);
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS01) !== 助詞_格助詞 ||
    verb === undefined ||
    (verb.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(verb, tokens[pos + 2])
  ) {
    return null;
  }
  let kind: PostverbAuxiliaryKind;
  switch (verb.dictionaryForm) {
    case "なる":
      kind = "adverbial_change";
      break;
    case "なれる":
      kind = "adverbial_change_potential";
      break;
    case "する":
      return null;
    default:
      return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 2),
    { kind, headProjection: "formal_state_result" }
  );
}

export function matchAdverbialNiPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stem: StemNode
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (!isAdverbCapable(stemTok) || !stemSupportsProjectionCategory(stem, "adverbial")) {
    return null;
  }
  const marker = cursor.current();
  const verb = cursor.peek(1);
  if (
    caseParticleMarkerRelationForToken(marker, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    verb === undefined ||
    (verb.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(verb, tokens[pos + 2])
  ) {
    return null;
  }
  let kind: PostverbAuxiliaryKind;
  switch (verb.dictionaryForm) {
    case "なる":
      kind = "adverbial_change";
      break;
    case "なれる":
      kind = "adverbial_change_potential";
      break;
    case "する":
      if (!isBoundedAdverbialControlSuruCarrier(verb, tokens[pos + 2])) {
        return null;
      }
      kind = "adverbial_control";
      break;
    default:
      return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 2), { kind });
}

function isBoundedAdverbialControlSuruCarrier(
  verb: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): boolean {
  const form = verb.pos & POS5A;
  if (form === 終止形_) {
    return next === undefined || (next.pos & POS0) === 補助記号;
  }
  return form === 連用形_ &&
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_);
}

function isPassiveSuruAuxiliaryFollower(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_レル);
}

export function matchYouNiNaruPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  context: CarrierTerminalContext | null = null
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const likeness = cursor.current();
  const ni = cursor.peek(1);
  const naru = cursor.peek(2);
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹 ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "なれる") ||
    (!isTeAuxActivationAccepted(naru, tokens[pos + 3]) &&
      !isStateChangeCarrierImperativeTerminal(tokens, pos + 2, naru, context) &&
      !isStateChangeCarrierVolitionalTerminal(tokens, pos + 2, naru, context))
  ) {
    return null;
  }
  const simileBecome =
    isPastAuxiliaryToken(tokens[pos - 1]) && isTeAuxActivationAccepted(naru, tokens[pos + 3]);
  const becomeKind = naru.dictionaryForm === "なれる"
    ? (simileBecome ? "manner_simile_become_potential" : "adverbial_change_potential")
    : (simileBecome ? "manner_simile_become" : "adverbial_change");
  if (
    naru.dictionaryForm === "なる" &&
    (naru.pos & POS5A) === 連用形_ &&
    isHonorificNasaiImperativeToken(tokens[pos + 3])
  ) {
    if (isCarrierTerminalMoodPosition(tokens, pos + 4, context, false)) {
      cursor.advance(4);
      return buildPostverbAuxiliaryOp(
        srcSlice(tokens, pos, 4),
        { kind: "adverbial_change" }
      );
    }
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 3), { kind: becomeKind });
}

export function matchSouNiNaruPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const naru = cursor.peek(2);
  if (
    appearancePerceptionProjectionForToken(marker) !== "sou_appearance" ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "なれる") ||
    !isTeAuxActivationAccepted(naru, tokens[pos + 3])
  ) {
    return null;
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    {
      kind: naru.dictionaryForm === "なれる"
        ? "appearance_state_change_potential"
        : "appearance_state_change",
      perceptionProjection: "sou_appearance"
    }
  );
}

export function matchSouNiSuruAppearanceBehaviorPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const suru = cursor.peek(2);
  if (
    appearancePerceptionProjectionForToken(marker) !== "sou_appearance" ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    suru === undefined ||
    (suru.pos & POS0) !== 動詞 ||
    suru.dictionaryForm !== "する" ||
    !isTeAuxActivationAccepted(suru, tokens[pos + 3])
  ) {
    return null;
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    { kind: "appearance_behavior", perceptionProjection: "sou_appearance" }
  );
}

function absorbMannerActionControlPastTense(
  ops: AuxOpNode[],
  carrier: PostverbAuxiliaryOp
): void {
  if (carrier.auxiliary.kind !== "manner_action_control") {
    return;
  }
  const carrierStart = carrier.source.tokenIndices[0];
  const last = ops[ops.length - 1];
  if (
    carrierStart === undefined ||
    last?.kind !== "tense" ||
    last.source.tokenIndices.length !== 1 ||
    last.source.tokenIndices[0] !== carrierStart - 1
  ) {
    return;
  }
  ops.pop();
}

export function matchYouNiSuruControlPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostIsVolitionalMannerHost: boolean,
  context: CarrierTerminalContext | null = null
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const you = cursor.current();
  const ni = cursor.peek(1);
  const suru = cursor.peek(2);
  if (
    you === undefined ||
    (you.surface !== "よう" && you.surface !== "様") ||
    (you.pos & POS1) !== 助動詞語幹 ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    suru === undefined ||
    (suru.pos & POS0) !== 動詞 ||
    suru.dictionaryForm !== "する" ||
    (!isTeAuxActivationAccepted(suru, tokens[pos + 3]) &&
      !isStateChangeCarrierImperativeTerminal(tokens, pos + 2, suru, context) &&
      !isStateChangeCarrierVolitionalTerminal(tokens, pos + 2, suru, context))
  ) {
    return null;
  }
  const isPast = isPastAuxiliaryToken(tokens[pos - 1]);
  if (isPast && !hostIsVolitionalMannerHost) {
    return null;
  }
  if (!isPast && !hostIsVolitionalMannerHost && (suru.pos & POS5A) === 連用形_ && isHonorificNasaiImperativeToken(tokens[pos + 3])) {
    if (isCarrierTerminalMoodPosition(tokens, pos + 4, context, false)) {
      cursor.advance(4);
      return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 4), { kind: "scope_control" });
    }
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    { kind: isPast ? "manner_action_control" : "scope_control" }
  );
}

export { perceptionCarrierVerbMatch };

export function matchYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const verb = cursor.peek(2);
  const projection = appearancePerceptionProjectionForToken(marker);
  const carrier = perceptionCarrierVerbMatch(verb, cursor.peek(3));
  if (
    projection === null ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    carrier === null ||
    !isTeAuxActivationAccepted(carrier.terminal, tokens[pos + 2 + carrier.span])
  ) {
    return null;
  }
  cursor.advance(2 + carrier.span);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 2 + carrier.span),
    {
      kind: "appearance_perception",
      perception: carrier.reading,
      perceptionProjection: projection
    }
  );
}

function matchKaNoYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const admission = kaNoYouNiPerceptionCarrierAt(tokens, pos);
  if (admission === null) {
    return null;
  }
  cursor.advance(admission.consumed);
  return buildAppearancePerceptionPostverbOp(tokens, pos, admission.consumed, admission.reading);
}

function buildAppearancePerceptionPostverbOp(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  sourceLength: number,
  perception: "visual" | "inferential" | "inferential_passive" | "felt"
): PostverbAuxiliaryOp {
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, sourceLength),
    {
      kind: "appearance_perception",
      perception,
      perceptionProjection: "attributive_like"
    }
  );
}

function matchBenefactive(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  lookups: LookupTables,
  previousOps: readonly AuxOpNode[]
): BenefactiveAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined) return null;

  const contractedRequest = cursor.lookahead(0, c => matchRequest(c, lookups));
  if (
    contractedRequest?.aspect === "te_kure_tanomu" &&
    cursor.lookahead(2, c => matchNoda(c, stemToken, {
      previousOps: [...previousOps, contractedRequest],
      lookups
    })) !== null
  ) {
    cursor.advance(2);
    return buildParserBenefactiveAspectOp(contractedRequest.source, "te_kureru");
  }

  const isDirectiveAgeruImperative =
    (t1.pos & POS5A) === 命令形_ && isAgeruClassBenefactiveTail(t1);
  if (!isTeBenefactiveActivationAccepted(t1, tokens[pos + 2]) && !isDirectiveAgeruImperative) {
    return null;
  }
  if (classifyTeTailContinuation(t1, lookups) !== "benefactive") return null;

  const metadata = teBenefactiveContinuationMetadataForToken(t1);
  if (metadata === null) return null;
  if (metadata.aspect === "te_ageru" && (t1.dictionaryForm === "やる" || t1.dictionaryForm === "遣る")) {
    if (stemToken.dictionaryForm === "やる" || stemToken.dictionaryForm === "遣る") return null;
    if (teYaruContinuationOpensTeKuruChainAt(tokens, pos + 1, lookups)) return null;
  }

  const terminalMood = (t1.pos & POS5A) === 命令形_ ? "imperative" : undefined;
  cursor.advance(2);
  return buildParserBenefactiveAspectOp(
    srcSlice(tokens, pos, 2),
    metadata.aspect,
    terminalMood,
    isSashiageruBenefactiveTail(t1)
  );
}

export function buildParserBenefactiveAspectOp(
  source: OpSource,
  aspect: BenefactiveAspectOp["aspect"],
  terminalMood?: BenefactiveAspectOp["terminalMood"],
  sashiageruTail = false
): BenefactiveAspectOp {
  const benefactive: BenefactivePayload = {
    kind: benefactiveKindForAspect(aspect),
    pivot: "unresolved",
    honorific: aspect === "te_kudasaru" || aspect === "te_itadaku" || aspect === "te_itadakeru",
    potential: aspect === "te_moraeru" || aspect === "te_itadakeru",
    tailLemma: sashiageruTail ? "드리다" : null,
    tailIrregular: null,
    tailKoreanPos: sashiageruTail ? 동사 : null,
    lexicalTailAbsorptionKind: null,
    agentParticleIdx: null,
    recipientParticleIdx: null,
    needsBenefactivePivot: false,
    recipientSideHumble: false,
    causativeAgentPolicy: null,
    causativeRenderPolicy: null
  };
  return createAspectOp({

    aspect,
    source,
    ...(terminalMood === undefined ? {} : { terminalMood }),
    benefactive
  });
}

function isSashiageruBenefactiveTail(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "さしあげる" || form === "差し上げる";
}

function isAgeruClassBenefactiveTail(token: RuntimeHaruToken): boolean {
  switch (token.dictionaryForm) {
    case "やる":
    case "遣る":
    case "あげる":
    case "上げる":
    case "さしあげる":
    case "差し上げる":
      return true;
    default:
      return false;
  }
}

function benefactiveKindForAspect(aspect: BenefactiveAspectOp["aspect"]): BenefactivePayload["kind"] {
  switch (aspect) {
    case "te_kureru":
      return "kureru";
    case "te_kudasaru":
      return "kudasaru";
    case "te_ageru":
      return "ageru";
    case "te_morau":
    case "te_moraeru":
      return "morau";
    case "te_itadaku":
    case "te_itadakeru":
      return "itadaku";
  }
}

function matchDesiderative(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): DesiderativeAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || (t1.pos & POS01) !== (形容詞0 | 非自立可能)) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "desiderative") return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  if (!isTeAuxActivationAccepted(t1, tokens[pos + 2])) return null;

  cursor.advance(2);
  return buildDesiderativeAspectOp(srcSlice(tokens, pos, 2));
}

export function buildDesiderativeAspectOp(source: OpSource): DesiderativeAspectOp {
  const desiderative: DesiderativePayload = {
    kind: "te_hoshii",
    desiredPredicateNegative: false,
    desireNegative: false,
    desirePast: false,
    polite: false,
    desiredClauseForm: "default"
  };
  return createAspectOp({  aspect: "te_hoshii", source, desiderative });
}

function matchMiseru(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): MiseruAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || (t1.pos & POS01) !== 動詞_非自立可能) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "miseru") return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  if (!isTeAuxActivationAccepted(t1, tokens[pos + 2])) return null;
  cursor.advance(2);
  return buildMiseruAspectOp(srcSlice(tokens, pos, 2));
}

export function buildMiseruAspectOp(
  source: OpSource
): MiseruAspectOp {
  return createAspectOp({ aspect: "te_miseru", source });
}

function matchCollapsedAspect(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  const aspect = collapsedAspectAuxKind(t0);
  if (aspect === null) return null;
  if (!isSimpleAspectAuxActivationAccepted(t0, tokens[pos + 1])) return null;
  if (aspect === "te_oku" && !hasCollapsedTeOkuTeFormHost(tokens, pos)) return null;
  cursor.advance(1);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 1), aspect);
}

function matchSplitCollapsedTeIruNegation(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stem: StemNode,
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchEllipticTeIruMarkerHead(tokens, pos, stem);
  const negative = teHead === null ? undefined : tokens[pos + teHead.consumed];
  const precedingMarker = tokens[pos - 1];
  const directMarker = teHead?.focusParticle === undefined && teHead?.consumed === 1;
  const focusedMarker = teHead?.focusParticle !== undefined && teHead.consumed === 2;
  const negativePast = teHead !== null && negative !== undefined &&
    isPastAuxiliaryPos(tokens[pos + teHead.consumed + 1]?.pos ?? 0);
  const negationEnding = teHead === null
    ? null
    : matchNegationEnding(tokens, pos + teHead.consumed, { allowAttributive: true });
  const followingNegativeTeHead = teHead === null || negationEnding === null
    ? null
    : matchTeConnectiveHead(tokens, pos + teHead.consumed + negationEnding.consumed);
  const focusedNegativeTeContinuation = followingNegativeTeHead !== null && (
    followingNegativeTeHead.focusParticle === undefined ||
    (followingNegativeTeHead.focusParticle === "も" && teHead?.focusParticle !== "も")
  );
  const focusedNegativeForm = negative !== undefined &&
    (isTerminalOrAttributiveInflection(negative.pos) ||
      (isRenyouInflection(negative.pos) && (
        negativePast ||
        focusedNegativeTeContinuation
      )));
  if (
    teHead === null ||
    (!directMarker && !focusedMarker) ||
    negative === undefined ||
    !isAdjNai(negative) ||
    !ops.reduce(
      sourceVerbalPredicateAfterAuxOp,
      stemHasSourceVerbalPredicateEvidence(stem),
    ) ||
    (focusedMarker && (
      ops.some((op) => op.kind === "negation") ||
      (precedingMarker !== undefined && isNegationToken(precedingMarker)) ||
      !focusedNegativeForm
    )) ||
    negationEnding === null
  ) {
    return null;
  }
  cursor.advance(teHead.consumed);
  return markEllipticTeIruSourceHost(buildSimpleAspectOp(
    srcSlice(tokens, pos, teHead.consumed),
    "te_iru",
    {
    ...(teHead.focusParticle === undefined ? {} : { teFocusParticle: teHead.focusParticle }),
    ...(teHead.focusParticle === undefined ? {} : { teFocusTarget: "aspect_auxiliary_negation" as const }),
    }
  ));
}

function matchEllipticTeIruMarkerHead(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stem: StemNode,
): TeConnectiveHead | null {
  const connective = matchTeConnectiveHead(tokens, pos);
  if (connective !== null) {
    return connective;
  }
  const marker = tokens[pos];
  if (
    marker?.surface !== "で" ||
    copulaDeMarkerRelationForToken(marker, pos, { consumers: ["tail_multi_clause"] }) === null ||
    !stemHasVoicedTeFormHostEvidence(stem)
  ) {
    return null;
  }
  return { consumed: 1 };
}

export function markEllipticTeIruSourceHost(aspect: SimpleAspectOp): SimpleAspectOp {
  return {
    ...aspect,
    ellipticTeIruSourceHost: "verbal_predicate",
  };
}

function collapsedTeIruTokenMarksEllipticNegative(aspect: SimpleAspectOp): boolean {
  const marker = aspect.source.tokens[0];
  return aspect.aspect === "te_iru" &&
    aspect.source.tokens.length === 1 &&
    (marker?.surface === "て" || marker?.surface === "で");
}

function hasCollapsedTeOkuTeFormHost(
  tokens: readonly RuntimeHaruToken[],
  auxPos: number
): boolean {
  const previous = tokens[auxPos - 1];
  if (previous === undefined) {
    return false;
  }
  if (isCausativeAuxTeFormHost(previous) || isCollapsedShimauAuxTeFormHost(previous)) {
    return true;
  }
  if ((previous.pos & POS0) !== 動詞) {
    return false;
  }
  const form = previous.pos & POS5A;
  if (form === 連用形_) {
    return true;
  }
  return form === 未然形_ && (is上一段(previous.pos) || is下一段(previous.pos));
}

function isCausativeAuxTeFormHost(token: RuntimeHaruToken): boolean {
  if (!isSeruCausativeAuxToken(token) && !isShimeruCausativeAuxToken(token)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ || form === 未然形_;
}

function isCollapsedShimauAuxTeFormHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return (form === 連用形_ || form === 連用形_促音便) &&
    (
      token.dictionaryForm === "ちゃう" ||
      token.dictionaryForm === "じゃう" ||
      token.dictionaryForm === "ちまう" ||
      token.dictionaryForm === "じまう"
    );
}

function matchCollapsedHonorific(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  if ((t0.pos & POS0) !== 助動詞) return null;
  if (!isSimpleAspectAuxActivationAccepted(t0, tokens[pos + 1])) return null;
  const form = t0.dictionaryForm || t0.surface;
  if (form !== "てらっしゃる" && form !== "てらしゃる" &&
    form !== "でらっしゃる" && form !== "でらしゃる") return null;
  cursor.advance(1);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 1), "te_iru", { collapsed: "honorific" });
}

function matchRequest(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined) return null;
  if (isChoudaiRequestContinuationToken(t1)) {
    cursor.advance(2);
    return buildRequestAspectOp(srcSlice(tokens, pos, 2), "chodai");
  }
  if ((t1.pos & POS01) !== 動詞_非自立可能) return null;
  const t1pos5A = t1.pos & POS5A;
  if (t1pos5A !== 命令形_) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "request") return null;

  let requestKind: RequestAspectKind;
  switch (t1.dictionaryForm) {
    case "くださる":
    case "下さる":
      requestKind = "te_kudasai";
      break;
    case "くれる":
    case "呉れる":
      requestKind = "te_kure_tanomu";
      break;
    default:
      return null;
  }

  cursor.advance(2);
  return buildRequestAspectOp(srcSlice(tokens, pos, 2), requestKind);
}

function matchProhibition(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput
): ProhibitionAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  if (!isNaiOrNuToken(t0)) return null;
  const t0pos5A = t0.pos & POS5A;
  if (t0pos5A !== 終止形_) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || !isTeConnectiveToken(t1) || t1.surface.charAt(0) !== "で") return null;
  const t2 = cursor.peek(2);
  let polite: boolean;
  let requestTail: ProhibitionPayload["requestTail"];
  if (t2 !== undefined && (t2.pos & POS01) === 動詞_非自立可能) {
    const t2pos5A = t2.pos & POS5A;
    if (t2pos5A !== 命令形_) return null;
    if (
      t2.dictionaryForm !== "くださる" &&
      t2.dictionaryForm !== "下さる" &&
      t2.dictionaryForm !== "くれる" &&
      t2.dictionaryForm !== "呉れる"
    ) return null;
    if (matchTeTailContinuationAt(tokens, pos, input.lookups)?.kind !== "prohibition") return null;
    cursor.advance(3);
    requestTail = t2.dictionaryForm === "くださる" || t2.dictionaryForm === "下さる"
      ? "kudasai"
      : "kure";
    polite = requestTail === "kudasai";
  } else {
    const quoteCarrier = cursor.lookahead(2, c => matchPredicateQuoteCarrier(c, input.lookups));
    const requestQuoteMarker = quoteRequestComplementBoundaryForInput(input, pos + 2);
    if (quoteCarrier === null && requestQuoteMarker === null) {
      return null;
    }
    cursor.advance(2);
    polite = false;
    requestTail = "bare";
  }

  return buildProhibitionAspectOp(
    srcSlice(tokens, pos, cursor.pos - pos),
    polite,
    requestTail
  );
}

export function buildProhibitionAspectOp(
  source: OpSource,
  polite: boolean,
  requestTail: ProhibitionPayload["requestTail"]
): ProhibitionAspectOp {
  return createAspectOp({

    aspect: "naide_kudasai",
    source,
    prohibition: { kind: "naide_kudasai", polite, requestTail }
  });
}

export function buildSimpleAspectOp(
  source: OpSource,
  aspect: SimpleAspectOp["aspect"],
  options: Omit<SimpleAspectOp, "kind" | "aspect" | "source"> = {}
): SimpleAspectOp {
  return createAspectOp({  aspect, source, ...options });
}

function quoteRequestComplementBoundaryForInput(
  input: ParseInput,
  inputPos: number
): Exclude<ClauseBoundary, { readonly kind: "terminal" }> | null {
  const cursor = contextCursorForInputPosition(input, inputPos);
  const relation = quoteStructuralRelationStartingAt(cursor, input.lookups);
  if (relation === undefined || relation.quote.slotKind !== "request_content") {
    return null;
  }
  const boundary = quoteClauseBoundaryFromRelation(cursor.tokens, relation, input.lookups);
  if (boundary?.kind !== "接続助詞" || boundary.connectiveKind !== "request_complement") {
    return null;
  }
  return boundary;
}

function matchForbidden(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  precedingOps: readonly AuxOpNode[]
): ForbiddenIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null || teHead.focusParticle !== "は") {
    return null;
  }
  const predicate = matchProhibitionPredicateAt(tokens, pos + teHead.consumed, {
    hostCannotHostDirectionalIku: stemSourceCannotHostDirectionalIku(stem, precedingOps)
  });
  if (predicate === null) {
    return null;
  }
  const consumed = teHead.consumed + predicate.consumed;
  cursor.advance(consumed);
  return buildForbiddenIdiomOp(
    srcSlice(tokens, pos, consumed),
    forbiddenSourceAllomorphFor(predicate),
    predicate.polite,
    predicate.past
  );
}

function forbiddenSourceAllomorphFor(predicate: ProhibitionPredicateMatch): ForbiddenIdiomOp["sourceAllomorph"] {
  switch (predicate.body) {
    case "dame":
      return "copular_dame";
    case "dialect_verb":
      return "verb_dialect_aku";
    case "verb":
      return predicate.bodyLemma === "いける" ? "verb_ikeru" :
        predicate.bodyLemma === "いく" ? "verb_iku" : "verb_naru";
  }
}

function stemSourceCannotHostDirectionalIku(
  stem: StemNode,
  precedingOps: readonly AuxOpNode[]
): boolean {
  switch (stem.sourcePredicateShape) {
    case "na_adjective":
    case "nominal":
    case "particle_phrase":
      {
        const previous = precedingOps.at(-1);
        return previous?.kind === "copula" &&
          previous.variant === "basic" &&
          previous.polarity === "affirmative";
      }
    case "i_adjective":
    case "verb":
    case "sahen_verbalization":
    case "lexical_adverb":
    case undefined:
      return false;
  }
  return false;
}

export function buildForbiddenIdiomOp(
  source: OpSource,
  sourceAllomorph: ForbiddenIdiomOp["sourceAllomorph"],
  polite = false,
  past = false
): ForbiddenIdiomOp {
  return createIdiomOp({

    idiom: "forbidden",
    source,
    polarity: "negative",
    polite,
    past,
    sourceAllomorph
  });
}

const MODAL_MATCHERS: readonly ModalMatcher[] = [
  matchHazu, matchKamo, matchNodaDatteHearsay, matchNoda,
  matchWake, matchMai, matchYouda, matchSoudaHearsay, matchTonokotoHearsay, matchTsumori, matchTokoro, matchMono
];

function tryMatchModal(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  for (const matcher of MODAL_MATCHERS) {
    const match = matcher(cursor, stemToken, ctx);
    if (match !== null) return match;
  }
  return null;
}

function matchModalAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): { readonly op: ModalOp; readonly ops?: readonly AuxOpNode[]; readonly terminal?: AuxLayerNode["terminal"] } | null {
  const match = tryMatchModal(cursor, stemToken, ctx);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    ...(match.terminal === undefined ? {} : { terminal: match.terminal })
  };
}

function matchNaitoAfterNegativeNounCopula(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  allowElidedNaitoObligation: boolean
): ObligationIdiomOp | null {
  const hasNegativeCopulaOp =
    ops.length === 1 &&
    ops[0]?.kind === "copula" &&
    ops[0].polarity === "negative";
  const hasAffirmativeCopulaExternalNegation =
    ops.length === 2 &&
    ops[0]?.kind === "copula" &&
    ops[0].polarity === "affirmative" &&
    ops[1]?.kind === "negation" &&
    ops[1].chainDepth === 1 &&
    !ops[1].chainPast;
  if (!hasNegativeCopulaOp && !hasAffirmativeCopulaExternalNegation) {
    return null;
  }
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const marker = c.current();
    if (marker === undefined || conditionalToConnectiveRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) === null) {
      return null;
    }
    const bodyPattern: ObligationPattern = {
      variant: "colloquial_naito",
      prefix: [],
      bodyVerbs: ["なる", "成る", "いける", "行ける", "いく", "行く"],
      allowDameBody: true
    };
    c.advance();
    const bodyPolite = matchObligationBody(c, bodyPattern);
    const variant = bodyPolite === null ? "colloquial_naito_elided" : "colloquial_naito";
    if (bodyPolite === null) {
      if (!allowElidedNaitoObligation) return null;
      const nextTok = tokens[pos + 1];
      if (nextTok !== undefined && (nextTok.pos & POS0) !== 補助記号) return null;
    }
    return buildObligationIdiomOp(
      srcSlice(tokens, pos, c.pos - pos),
      variant,
      "affirmative",
      bodyPolite ?? false
    );
  });
}

function isAdjLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

function isVerbLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "verbal_predicate");
}

function isNounLikeStemNode(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "nominal");
}

function matchRenyouNominalCopulaReasonConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stemNode: StemNode
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (
    !isVerbLikeStemNode(stemNode) ||
    (stemTok.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const copula = tokens[pos];
  const kara = tokens[pos + 1];
  const koso = tokens[pos + 2];
  const copulaPos4 = (copula?.pos ?? 0) & POS4;
  const copulaPos5A = (copula?.pos ?? 0) & POS5A;
  if (
    copula === undefined ||
    (copula.pos & POS0) !== 助動詞 ||
    (copulaPos4 !== 助動詞_ダ && copulaPos4 !== 助動詞_デス) ||
    copulaPos5A !== 終止形_
  ) {
    return null;
  }
  if (
    caseParticleMarkerRelationForToken(kara, pos + 1, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    koso?.surface !== "こそ" ||
    (koso.pos & POS0) !== 助詞
  ) {
    return null;
  }
  cursor.advance(3);
  return createConnectiveOp({

    connective: "origin",
    surface: "からこそ",
    source: srcSlice(tokens, pos, 3)
  });
}

function matchAdjCopulaNegationBridge(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: AdjCopulaBridgeOp; readonly nextPos: number } | null {
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (isCopulaJaNegativeBridgeToken(t0)) {
    const supportAru = supportAruBeforeMasen(tokens, pos + 1);
    const next = tokens[pos + 1];
    if (!supportAru && (next === undefined || !isNaiOrNuToken(next))) {
      return null;
    }
    const consumed = supportAru ? 2 : 1;
    return {
      op: buildAdjCopulaBridgeOp(srcSlice(tokens, pos, consumed), "ja", supportAru),
      nextPos: pos + consumed
    };
  }

  const adjDewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (adjDewa?.focusParticle === "wa") {
    const supportAru = supportAruBeforeMasen(tokens, adjDewa.span.endExclusive);
    const next = tokens[adjDewa.span.endExclusive];
    if (!supportAru && (next === undefined || !isNaiOrNuToken(next))) {
      return null;
    }
    const consumed = adjDewa.span.endExclusive - pos + (supportAru ? 1 : 0);
    return {
      op: buildAdjCopulaBridgeOp(srcSlice(tokens, pos, consumed), "dewa", supportAru),
      nextPos: pos + consumed
    };
  }

  return null;
}

export function buildAdjCopulaBridgeOp(
  source: OpSource,
  form: AdjCopulaBridgeOp["form"],
  supportAru: boolean
): AdjCopulaBridgeOp {
  return createAdjCopulaBridgeOp({  source, form, supportAru });
}

function supportAruBeforeMasen(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const aru = tokens[pos];
  const masu = tokens[pos + 1];
  const nu = tokens[pos + 2];
  return (
    isAruVerbToken(aru) &&
    (aru.pos & POS5A) === 連用形_ &&
    masu !== undefined &&
    (masu.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_) &&
    nu !== undefined &&
    (nu.pos & POS4) === 助動詞_ヌ
  );
}


function elidedColloquialObligationContextFor(input: ParseInput): ElidedColloquialObligationContext {
  return normalizeElidedColloquialObligationContext(
    input.allowElidedColloquialObligation ??
    input.allowElidedNaitoObligation ??
    true
  );
}

interface StemHostedSuppletiveObligation {
  readonly op: AuxOpNode;
  readonly cursorStart: number;
  readonly stem: StemInput;
}

function matchStemHostedSuppletiveObligation(
  input: ParseInput,
  stemTok: RuntimeHaruToken
): StemHostedSuppletiveObligation | null {
  const { tokens, start, stem } = input;
  if (
    !isAdjNai(stemTok) ||
    (stemTok.pos & POS5A) !== 仮定形_ ||
    (stem.kind !== "adj" && stem.kind !== "verb")
  ) {
    return null;
  }
  const affirmativeLemma = input.lookups.SUPPLETIVE_AFFIRMATIVE_KOREAN_LEMMAS.get(stemTok.dictionaryForm);
  if (affirmativeLemma === undefined || !hasExistentialArgumentMarkerBefore(input, start)) {
    return null;
  }
  const cursor = new TokenCursor(tokens, start);
  const op = tryMatchObligation(cursor, "none");
  if (op === null) {
    return null;
  }
  return {
    op,
    cursorStart: cursor.pos,
    stem: { ...stem, lemma: affirmativeLemma, irregular: null, commitment: "resolved_sense" }
  };
}

function hasExistentialArgumentMarkerBefore(input: ParseInput, start: number): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  const markerIdx = previousNonSpaceIndex(contextTokens, sourceIndexForInputPosition(input, start));
  if (markerIdx === null) {
    return false;
  }
  const marker = contextTokens[markerIdx];
  const isExistentialMarker = caseParticleMarkerRelationForToken(marker, markerIdx, {
    acceptedSurfaces: ["が", "に"],
    consumers: ["tail_multi_clause"]
  }) !== null ||
    topicFocusMarkerRelationForToken(marker, markerIdx, { consumers: ["tail_multi_clause"] }) !== null;
  return isExistentialMarker &&
    getArgumentNounBeforeParticle(
      contextTokens,
      existentialArgumentNounQueryIndex(contextTokens, markerIdx),
      input.lookups
    ) !== null;
}

function existentialArgumentNounQueryIndex(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): number {
  const closeIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (closeIdx === null) {
    return markerIdx;
  }
  return parentheticalSpanEndingAt(tokens, closeIdx) === null ? markerIdx : closeIdx;
}

export function parseTail(input: ParseInput): ParseOutcome {
  const { tokens, start, stem } = input;
  const stemTok = tokens[start];
  if (stemTok === undefined) {
    return { ok: false, reason: "stem token out of range", position: start };
  }
  const semanticStemTok = input.semanticStemToken ?? stemTok;

  const hostQuoteClose = hostEnclosingQuoteCloseInParseSlice(input, start);
  const stemHostedObligation = matchStemHostedSuppletiveObligation(input, stemTok);
  const stemNode = applyNominalHostQuoteDecoration(
    buildStemNode(stemHostedObligation?.stem ?? stem, stemTok, start, input.headHypothesis),
    hostQuoteClose?.surface ?? ""
  );
  const ops: AuxOpNode[] = [];
  const precedingPrefixForm = precedingPrefixFormForStem(input);
  let sfp: SfpNode | null = null;
  let explicitTerminal: AuxLayerNode["terminal"] = null;
  let explicitTerminalPayload: AuxLayerNode["terminalPayload"] | undefined;
  let adnominalCopulaTerminalMarkerPos: number | null = null;
  const elidedColloquialObligationContext = elidedColloquialObligationContextFor(input);
  const allowElidedNaitoObligation = elidedColloquialObligationContext === "terminal";

  const cursor = new TokenCursor(tokens, stemHostedObligation?.cursorStart ?? start + 1);
  if (stemHostedObligation !== null) {
    ops.push(stemHostedObligation.op);
  }

  while (cursor.pos < cursor.end) {
    const token = tokens[cursor.pos];
    if (token === undefined) {
      break;
    }
    if (
      input.allowExplicitAdnominalNoTerminal === true &&
      ops.length === 0 &&
      cursor.pos === cursor.end - 1 &&
      isAdnominalGenitiveMarkerToken(token)
    ) {
      cursor.advance();
      explicitTerminal = "attributive";
      break;
    }
    if (ops.length === 0 && isNounLikeStemNode(stemNode)) {
      const contextTokens = input.contextTokens ?? tokens;
      const sourceHostStart = sourceIndexForInputPosition(input, start);
      const sourcePos = sourceIndexForInputPosition(input, cursor.pos);
      if (skipHostEnclosingQuoteClose(contextTokens, sourceHostStart, sourcePos) !== sourcePos) {
        cursor.advance();
        continue;
      }
    }
    if (
      !predicateQuoteCarrierStartsAt(cursor, input.lookups, input) &&
      tariKeijoujiAdverbialToEvidence(contextCursorForInputPosition(input, cursor.pos), {
        allowProtoFollowingPredicateEvidence: true,
        lookups: input.lookups
      }) !== null
    ) {
      break;
    }

    const limitNegationMatch = matchLimitNegationModal(cursor);
    if (limitNegationMatch !== null) {
      ops.push(limitNegationMatch);
      continue;
    }

    if (
      hostChainAttachesAsNominalCopulaStem(stemNode, ops) ||
      hostChainAttachesAsAdjectivalRenyou(stemNode, ops) ||
      hostChainAttachesAsNegativeRenyou(stemNode, ops) ||
      hostChainAttachesAsVerbalRenyou(stemNode, ops)
    ) {
      const degreeIntensifierMatch = matchDegreeIntensifierIdiom(cursor, input.lookups);
      if (degreeIntensifierMatch !== null) {
        ops.push(degreeIntensifierMatch);
        continue;
      }
    }

    if (isNounLikeStemNode(stemNode) && ops.length === 0) {
      const nominalLikenessMatch = matchNominalHostLikenessAtCursor(cursor);
      if (nominalLikenessMatch !== null) {
        ops.push(...nominalLikenessMatch);
        continue;
      }
      const focusBridgeOp = cursor.tx(c =>
        matchScopeBridgeBeforeBasicCopula(c, { allowFocusIdentityBridge: true }));
      if (focusBridgeOp !== null) {
        pushScopeBridgeOps(ops, focusBridgeOp, cursor.tokens);
        continue;
      }
      const copulaStart = cursor.pos;
      const copulaMatch = matchCopulaAtCursor(cursor, input.lookups, {
        allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true && stemCanProjectStateChange(stemNode)
      }, input);
      if (copulaMatch !== null) {
        if (copulaMatch.adnominal) {
          explicitTerminal = "attributive";
          adnominalCopulaTerminalMarkerPos = copulaStart;
        }
        ops.push(...(copulaMatch.ops ?? [copulaMatch.op]));
        continue;
      }
    }

    if (previousOpIsReanchoringDerivationalSuffix(ops)) {
      const derivedCopulaStart = cursor.pos;
      const derivedCopulaMatch = matchCopulaAtCursor(cursor, input.lookups, {
        allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
      }, input);
      if (derivedCopulaMatch !== null) {
        if (derivedCopulaMatch.adnominal) {
          explicitTerminal = "attributive";
          adnominalCopulaTerminalMarkerPos = derivedCopulaStart;
        }
        ops.push(...(derivedCopulaMatch.ops ?? [derivedCopulaMatch.op]));
        continue;
      }
      const derivedFocusBridgeOp = cursor.tx(matchScopeBridgeBeforeBasicCopula);
      if (derivedFocusBridgeOp !== null) {
        pushScopeBridgeOps(ops, derivedFocusBridgeOp, cursor.tokens);
        continue;
      }
    }

    if (isAdjLikeStemNode(stemNode) && ops.length === 0) {
      const adjFocusBridgeOp = cursor.tx(matchScopeBridgeBeforeBasicCopula);
      if (adjFocusBridgeOp !== null) {
        pushScopeBridgeOps(ops, adjFocusBridgeOp, cursor.tokens);
        continue;
      }
      const bridge = matchAdjCopulaNegationBridge(tokens, cursor.pos);
      if (bridge !== null) {
        ops.push(bridge.op);
        cursor.advance(bridge.nextPos - cursor.pos);
        continue;
      }
      const copulaStart = cursor.pos;
      const copulaMatch = cursor.tx(c => {
        const match = matchCopulaAtCursor(c, input.lookups, {
          allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
        }, input);
        if (match === null) {
          return null;
        }
        const predicateCopula =
          match.op.variant === "basic" &&
          match.op.polarity === "affirmative" &&
          (
            (stemTok.pos & POS5A) === 連体形_ ||
            isSyntheticDeicticStemToken(stemTok)
          );
        return match.adnominal || predicateCopula ? match : null;
      });
      if (copulaMatch !== null) {
        const adnominalCopula = copulaMatch.adnominal;
        if (adnominalCopula) {
          explicitTerminal = "attributive";
          adnominalCopulaTerminalMarkerPos = copulaStart;
        }
        ops.push(...(copulaMatch.ops ?? [copulaMatch.op]));
        continue;
      }
    }

    const renyouNominalCopulaConnective = matchRenyouNominalCopulaReasonConnective(cursor, stemTok, stemNode);
    if (renyouNominalCopulaConnective !== null) {
      ops.push(renyouNominalCopulaConnective);
      continue;
    }

    const obligationOp = cursor.tx(c => tryMatchObligation(c, elidedColloquialObligationContext));
    if (obligationOp !== null) {
      ops.push(obligationOp);
      continue;
    }

    if (isContractedNegativeConditionalToken(token)) {
      const chainStartFailure = validateNegationChainStart({
        pos: cursor.pos,
        start,
        stemTok,
        token,
        previousOp: ops.length > 0 ? ops[ops.length - 1] : undefined
      });
      if (chainStartFailure !== null) {
        return chainStartFailure;
      }
      ops.push(
        createNegationOp({

          source: srcSingle(token, cursor.pos),
          chainDepth: 1,
          chainPast: false,
          stemAux: [],
          preferShortNegation: false
        }),
        createConnectiveOp({

          connective: "conditional",
          surface: token.surface,
          conditionalFlavor: "plain",
          source: srcSingle(token, cursor.pos)
        })
      );
      cursor.advance();
      continue;
    }

    const nounCopulaNaitoMatch = matchNaitoAfterNegativeNounCopula(
      cursor,
      ops,
      allowElidedNaitoObligation
    );
    if (nounCopulaNaitoMatch !== null) {
      ops.push(nounCopulaNaitoMatch);
      continue;
    }

    const bekiMatch = matchBekiAtCursor(input, cursor);
    if (bekiMatch !== null) {
      ops.push(...(bekiMatch.ops ?? [bekiMatch.op]));
      continue;
    }

    const forbiddenMatch = matchForbidden(cursor, stemNode, ops);
    if (forbiddenMatch !== null) {
      ops.push(forbiddenMatch);
      continue;
    }

    const dekiruMatch = matchKotoGaDekiru(cursor, input.lookups);
    if (dekiruMatch !== null) {
      ops.push(dekiruMatch);
      continue;
    }

    const experienceMatch = matchExperienceKotoGaAru(cursor, ops);
    if (experienceMatch !== null) {
      ops.push(experienceMatch);
      continue;
    }

    const decisionKotoNiSuruMatch = matchDecisionKotoNiSuru(cursor);
    if (decisionKotoNiSuruMatch !== null) {
      ops.push(decisionKotoNiSuruMatch);
      continue;
    }

    const decisionToSuruMatch = matchDecisionToSuru(cursor, ops, stemTok);
    if (decisionToSuruMatch !== null) {
      ops.push(decisionToSuruMatch);
      continue;
    }

    const outcomeKotoNiNaruMatch = matchOutcomeKotoNiNaru(cursor);
    if (outcomeKotoNiNaruMatch !== null) {
      ops.push(outcomeKotoNiNaruMatch);
      continue;
    }

    const negativeNecessityKotoWaMatch = matchNegativeNecessityKotoWa(cursor, ops, stemTok);
    if (negativeNecessityKotoWaMatch !== null) {
      ops.push(negativeNecessityKotoWaMatch);
      continue;
    }

    const onlyOptionMatch = matchOnlyOption(cursor, stemTok);
    if (onlyOptionMatch !== null) {
      ops.push(onlyOptionMatch);
      continue;
    }

    const wakeImpossibleMatch = matchWakeImpossibleIdiom(cursor);
    if (wakeImpossibleMatch !== null) {
      ops.push(wakeImpossibleMatch);
      continue;
    }

    const cannotRefrainMatch = matchCannotRefrainNegativeDewaIrarenai(cursor, ops);
    if (cannotRefrainMatch !== null) {
      ops.push(cannotRefrainMatch);
      continue;
    }

    const inevitableZaruMatch = matchInevitableZaruOEnaiIdiom(cursor);
    if (inevitableZaruMatch !== null) {
      ops.push(inevitableZaruMatch);
      continue;
    }

    const methodYouGaNaiMatch = matchMethodYouGaNaiIdiom(cursor);
    if (methodYouGaNaiMatch !== null) {
      ops.push(methodYouGaNaiMatch);
      continue;
    }

    const madeMoNaiMatch = matchMadeMoNaiIdiom(cursor);
    if (madeMoNaiMatch !== null) {
      ops.push(madeMoNaiMatch);
      continue;
    }

    const tsutsuAruMatch = matchTsutsuAruAspect(cursor);
    if (tsutsuAruMatch !== null) {
      ops.push(tsutsuAruMatch);
      continue;
    }

    const formalToStateResultMatch = matchFormalToStateResultPostverbAuxiliary(cursor, stemNode, ops, {
      suppressToSuruControl: input.suppressFormalToSuruControl === true
    });
    if (formalToStateResultMatch !== null) {
      ops.push(formalToStateResultMatch);
      continue;
    }

    const adverbialNiPostverbMatch = matchAdverbialNiPostverbAuxiliary(cursor, stemTok, stemNode);
    if (adverbialNiPostverbMatch !== null) {
      ops.push(adverbialNiPostverbMatch);
      continue;
    }

    const postverbAuxiliaryMatch = matchPostverbAuxiliary(
      cursor,
      stemTok,
      stemNode,
      ops,
      input.lookups,
      precedingPrefixForm,
      carrierTerminalContextFor(input),
    );
    if (postverbAuxiliaryMatch !== null) {
      ops.push(postverbAuxiliaryMatch);
      continue;
    }

    const predicateSuffixMatch = matchPredicateSuffix(cursor, stemNode, stemTok, ops, input.lookups);
    if (predicateSuffixMatch !== null) {
      ops.push(predicateSuffixMatch);
      continue;
    }

    const splitCollapsedTeIruNegation = matchSplitCollapsedTeIruNegation(cursor, ops, stemNode);
    if (splitCollapsedTeIruNegation !== null) {
      ops.push(splitCollapsedTeIruNegation);
      continue;
    }

    const aspectMatch = ops.at(-1)?.kind === "polite"
      ? null
      : matchSimpleAspect(cursor, semanticStemTok, input.lookups);
    if (aspectMatch !== null) {
      ops.push(...aspectMatch);
      continue;
    }

    const teYaruDeterminedCompletionMatch = matchTeYaruDeterminedCompletion(cursor, stemTok, input.lookups);
    if (teYaruDeterminedCompletionMatch !== null) {
      ops.push(teYaruDeterminedCompletionMatch);
      continue;
    }

    const benefactiveMatch = matchBenefactive(cursor, stemTok, input.lookups, ops);
    if (benefactiveMatch !== null) {
      ops.push(benefactiveMatch);
      continue;
    }

    const requestMatch = matchRequest(cursor, input.lookups);
    if (requestMatch !== null) {
      ops.push(requestMatch);
      continue;
    }

    const prohibitionMatch = matchProhibition(cursor, input);
    if (prohibitionMatch !== null) {
      ops.push(prohibitionMatch);
      continue;
    }

    const bareTeRequestQuoteMatch = matchBareTeRequestQuoteConnective(input, cursor);
    if (bareTeRequestQuoteMatch !== null) {
      ops.push(bareTeRequestQuoteMatch);
      continue;
    }

    const collapsedMatch = matchCollapsedAspect(cursor);
    if (collapsedMatch !== null) {
      const collapsedNegation = matchNegationEnding(cursor.tokens, cursor.pos, { allowAttributive: true });
      const afterCollapsedNegation = collapsedNegation === null
        ? undefined
        : cursor.tokens[cursor.pos + collapsedNegation.consumed];
      const feedsNaideProhibition = afterCollapsedNegation?.surface === "で" &&
        isTeConnectiveToken(afterCollapsedNegation);
      const ellipticNegative = collapsedTeIruTokenMarksEllipticNegative(collapsedMatch) &&
        ops.reduce(
          sourceVerbalPredicateAfterAuxOp,
          stemHasSourceVerbalPredicateEvidence(stemNode),
        ) &&
        cursor.current() !== undefined &&
        (isAdjNai(cursor.current()!) || isNegationToken(cursor.current()!)) &&
        collapsedNegation !== null &&
        !feedsNaideProhibition;
      ops.push(ellipticNegative ? markEllipticTeIruSourceHost(collapsedMatch) : collapsedMatch);
      continue;
    }

    const collapsedHonorificMatch = matchCollapsedHonorific(cursor);
    if (collapsedHonorificMatch !== null) {
      ops.push(collapsedHonorificMatch);
      continue;
    }

    const desiderativeMatch = matchDesiderative(cursor, input.lookups);
    if (desiderativeMatch !== null) {
      ops.push(desiderativeMatch);
      continue;
    }

    const miseruMatch = matchMiseru(cursor, input.lookups);
    if (miseruMatch !== null) {
      ops.push(miseruMatch);
      continue;
    }

    const outgoingBoundaryHintMatch = matchOutgoingBoundaryHint(input, cursor, ops, stemNode, stemTok);
    if (outgoingBoundaryHintMatch !== null) {
      ops.push(outgoingBoundaryHintMatch);
      continue;
    }

    if (matchDialectalRedundantTerminalParticle(input, cursor, ops)) {
      continue;
    }

    const terminalPastQuoteAllomorphMatch = matchTerminalPastQuoteAllomorphCarrier(input, cursor, ops);
    if (terminalPastQuoteAllomorphMatch !== null) {
      ops.push(terminalPastQuoteAllomorphMatch);
      continue;
    }

    const reformulationMatch = matchReformulationConnective(cursor, input);
    if (reformulationMatch !== null) {
      ops.push(reformulationMatch);
      continue;
    }

    const predicateQuoteCarrierMatch = input.stopAtUnparsedTail === true
      ? null
      : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input);
    if (predicateQuoteCarrierMatch !== null) {
      ops.push(absorbBareTeDirectiveIntoCarrier(ops, predicateQuoteCarrierMatch, stemTok));
      continue;
    }

    const volitionalConfirmationQuotativeMatch = matchVolitionalConfirmationQuotativeConnective(input, cursor, stemTok, ops);
    if (volitionalConfirmationQuotativeMatch !== null) {
      ops.push(volitionalConfirmationQuotativeMatch);
      continue;
    }

    const predicateConfirmationJanaiBeforeBridgeMatch = isVolitionalTerminalContext(stemTok, ops)
      ? matchPredicateConfirmationJanaiSfp(input, cursor, stemTok, ops)
      : null;
    if (predicateConfirmationJanaiBeforeBridgeMatch !== null) {
      sfp = predicateConfirmationJanaiBeforeBridgeMatch;
      break;
    }

    const implicitFocusOp = cursor.tx(c => matchImplicitNegativeFocusBridge(c, stemNode, ops[ops.length - 1]));
    if (implicitFocusOp !== null) {
      pushScopeBridgeOps(ops, implicitFocusOp, cursor.tokens);
      continue;
    }
    const elidedNominalizerBridgeOp = cursor.tx(c => matchElidedNominalizerScopeBridge(c, ops[ops.length - 1]));
    if (elidedNominalizerBridgeOp !== null) {
      ops.push(elidedNominalizerBridgeOp);
      continue;
    }
    const scopeBridgeOp = cursor.tx(c => matchScopeBridge(c, {
      allowElidedNegativeBody: input.allowElidedDewaNegativeBody !== undefined
    }));
    if (scopeBridgeOp !== null) {
      pushScopeBridgeOps(ops, scopeBridgeOp, cursor.tokens);
      continue;
    }

    const boundNominalReasonMatch = matchBoundNominalReasonConnective(input, cursor);
    if (boundNominalReasonMatch !== null) {
      ops.push(
        boundNominalReasonQuoteCarrierHostAt(input, ops, start)
          ? { ...boundNominalReasonMatch, boundNominalReasonQuoteCarrierHost: true }
          : boundNominalReasonMatch
      );
      continue;
    }
    const boundNominalListingMatch = matchBoundNominalListingConnective(cursor);
    if (boundNominalListingMatch !== null) {
      ops.push(boundNominalListingMatch);
      continue;
    }

    const tameQuotedJudgmentPassiveMatch = matchTameQuotedJudgmentPassiveConnective(cursor);
    if (tameQuotedJudgmentPassiveMatch !== null) {
      ops.push(tameQuotedJudgmentPassiveMatch);
      continue;
    }

    const tameConnectiveMatch = matchTameConnective(cursor, ops, stemTok, input.lookups);
    if (tameConnectiveMatch !== null) {
      ops.push(tameConnectiveMatch);
      continue;
    }

    const tokoroResultConnectiveMatch = matchTokoroResultConnective(input, cursor, ops);
    if (tokoroResultConnectiveMatch !== null) {
      ops.push(tokoroResultConnectiveMatch);
      continue;
    }

    const hokaAdditiveMatch = matchHokaAdditiveConnective(cursor);
    if (hokaAdditiveMatch !== null) {
      ops.push(hokaAdditiveMatch);
      continue;
    }
    const monoNoConcessiveMatch = matchMonoNoConcessiveConnective(cursor);
    if (monoNoConcessiveMatch !== null) {
      ops.push(monoNoConcessiveMatch);
      continue;
    }
    const kuseNiConcessiveMatch = cursor.tx(c => matchKuseNiConcessiveConnective(c, stemTok)) ??
      cursor.tx(matchNaBridgedKuseNiConcessiveConnective);
    if (kuseNiConcessiveMatch !== null) {
      ops.push(kuseNiConcessiveMatch);
      continue;
    }
    const predicateProjectionConnectiveOptions = {
      allowNoQuoteReportingProjection: input.allowNoQuoteReportingProjection === true,
      lookups: input.lookups,
      ...(input.quoteAttributiveHeadFrame === undefined
        ? {}
        : { quoteAttributiveHeadFrame: input.quoteAttributiveHeadFrame }),
      purposeMotionClosureAfterMarker: (markerPos: number) => utteranceClosureAfterParsePosition(input, markerPos)
    };
    const predicateProjectionConnectiveMatch = matchPredicateProjectionConnective(
      cursor,
      predicateProjectionConnectiveOptions
    );
    if (predicateProjectionConnectiveMatch !== null) {
      ops.push(predicateProjectionConnectiveMatch);
      continue;
    }
    const focusConnectiveMatch = matchFocusConnective(cursor);
    if (focusConnectiveMatch !== null) {
      ops.push(focusConnectiveMatch);
      continue;
    }
    const predicateProjectionCarrierMatch = matchPredicateProjectionCarrier(cursor, ops, input.lookups, input, stemTok);
    if (predicateProjectionCarrierMatch !== null) {
      ops.push(predicateProjectionCarrierMatch);
      continue;
    }
    const predicateProjectionBeforeSfpMatch = matchPredicateProjectionConnectiveBeforeTerminalSfp(cursor, {
      ...predicateProjectionConnectiveOptions,
      stemToken: stemTok
    });
    if (predicateProjectionBeforeSfpMatch !== null) {
      ops.push(predicateProjectionBeforeSfpMatch);
      continue;
    }

    const youNiNaruPostverbMatch = matchYouNiNaruPostverbAuxiliary(cursor, carrierTerminalContextFor(input));
    if (youNiNaruPostverbMatch !== null) {
      ops.push(youNiNaruPostverbMatch);
      continue;
    }

    const souNiNaruPostverbMatch = matchSouNiNaruPostverbAuxiliary(cursor);
    if (souNiNaruPostverbMatch !== null) {
      ops.push(souNiNaruPostverbMatch);
      continue;
    }

    const souNiSuruBehaviorPostverbMatch = matchSouNiSuruAppearanceBehaviorPostverbAuxiliary(cursor);
    if (souNiSuruBehaviorPostverbMatch !== null) {
      ops.push(souNiSuruBehaviorPostverbMatch);
      continue;
    }

    const hostIsVolitionalMannerHost =
      YOU_NI_VOLITIONAL_MANNER_HOSTS.has(stemTok.dictionaryForm || stemTok.surface);
    const youNiSuruControlPostverbMatch = matchYouNiSuruControlPostverbAuxiliary(cursor, hostIsVolitionalMannerHost, carrierTerminalContextFor(input));
    if (youNiSuruControlPostverbMatch !== null) {
      absorbMannerActionControlPastTense(ops, youNiSuruControlPostverbMatch);
      ops.push(youNiSuruControlPostverbMatch);
      continue;
    }

    const kaNoYouNiPerceptionPostverbMatch = matchKaNoYouNiPerceptionPostverbAuxiliary(cursor);
    if (kaNoYouNiPerceptionPostverbMatch !== null) {
      ops.push(kaNoYouNiPerceptionPostverbMatch);
      continue;
    }

    const kaNoYouNiSimileMatch = matchKaNoYouNiMannerSimileConnectiveAt(
      cursor.tokens,
      cursor.pos,
      input.lookups
    );
    if (kaNoYouNiSimileMatch !== null) {
      ops.push(createConnectiveOp({
        connective: kaNoYouNiSimileMatch.connective,
        surface: kaNoYouNiSimileMatch.surface,
        source: srcSlice(cursor.tokens, cursor.pos, kaNoYouNiSimileMatch.consumed)
      }));
      cursor.advance(kaNoYouNiSimileMatch.consumed);
      continue;
    }

    const youNiPerceptionPostverbMatch = matchYouNiPerceptionPostverbAuxiliary(cursor);
    if (youNiPerceptionPostverbMatch !== null) {
      ops.push(youNiPerceptionPostverbMatch);
      continue;
    }

    const epistemicHedgePostverbMatch = matchEpistemicHedgePostverbAuxiliary(cursor);
    if (epistemicHedgePostverbMatch !== null) {
      ops.push(epistemicHedgePostverbMatch);
      continue;
    }

    const youNiProjectionConnectiveMatch = matchYouNiPredicateProjectionConnective(cursor, {
      allowZeroNiPurpose: input.allowZeroNiPurposeTerminal === true,
      lookups: input.lookups
    });
    if (youNiProjectionConnectiveMatch !== null) {
      ops.push(youNiProjectionConnectiveMatch);
      continue;
    }

    const gotokuMatch = matchGotokuMannerSimileConnectiveAt(cursor.tokens, cursor.pos);
    if (gotokuMatch !== null) {
      ops.push(createConnectiveOp({
        connective: gotokuMatch.connective,
        surface: gotokuMatch.surface,
        source: srcSlice(cursor.tokens, cursor.pos, gotokuMatch.consumed)
      }));
      cursor.advance(gotokuMatch.consumed);
      continue;
    }

    const bridgedPerception = matchAttributiveBridgedYouNiPerceptionPostverbAuxiliary(cursor);
    if (bridgedPerception !== null) {
      ops.push(bridgedPerception);
      continue;
    }

    const bridgedProjection = matchAttributiveBridgedYouNiProjectionConnective(cursor, input.lookups);
    if (bridgedProjection !== null) {
      ops.push(bridgedProjection);
      continue;
    }

    const sfpBridgedQuotative = matchSfpBridgedQuotativeMannerSimileConnective(input, cursor, ops, stemTok);
    if (sfpBridgedQuotative !== null) {
      ops.push(sfpBridgedQuotative);
      continue;
    }

    const nodeConnectiveMatch = cursor.tx(c => matchNodeReasonConnective(c, input.lookups))
      ?? cursor.tx(c => matchNoNiAdversativeConnective(c, stemTok, input));
    if (nodeConnectiveMatch !== null) {
      ops.push(nodeConnectiveMatch);
      continue;
    }
    const externalNominalizerMatch = matchExternalNominalizerConnective(cursor);
    if (externalNominalizerMatch !== null) {
      ops.push(externalNominalizerMatch);
      continue;
    }
    const nominalizedEvenIfMatch = matchNominalizedEvenIfConnective(cursor);
    if (nominalizedEvenIfMatch !== null) {
      ops.push(nominalizedEvenIfMatch);
      continue;
    }
    const negativeNecessitySumuMatch = matchNegativeNecessitySumuIdiom(cursor, ops, stemNode);
    if (negativeNecessitySumuMatch !== null) {
      ops.push(negativeNecessitySumuMatch);
      continue;
    }
    const teEvaluationMatch = matchTeEvaluationIdiom(cursor, input.lookups);
    if (teEvaluationMatch !== null) {
      ops.push(teEvaluationMatch);
      continue;
    }
    const permissionMatch = matchPermissionIdiom(cursor, stemNode, ops, input.lookups);
    if (permissionMatch !== null) {
      ops.push(permissionMatch);
      continue;
    }
    const baSufficiencyMatch = matchBaSufficiencyConditionalIdiom(cursor);
    if (baSufficiencyMatch !== null) {
      ops.push(baSufficiencyMatch);
      continue;
    }
    const focusedNegationMatch = cursor.tx(matchFocusedNegation);
    if (focusedNegationMatch !== null) {
      ops.push(...focusedNegationMatch);
      continue;
    }
    const focusSupportMatch = matchAffirmativeFocusSupport(cursor);
    if (focusSupportMatch !== null) {
      ops.push(focusSupportMatch);
      continue;
    }
    const teMoMatch = matchTeMoConnective(cursor, stemTok, input);
    if (teMoMatch !== null) {
      ops.push(teMoMatch);
      continue;
    }
    const tomoConcessiveMatch = matchAdjectivalConcessiveTomoConnective(cursor);
    if (tomoConcessiveMatch !== null) {
      ops.push(tomoConcessiveMatch);
      continue;
    }
    const copulaMoFocusMatch = matchCopulaMoFocusConnective(cursor, input);
    if (copulaMoFocusMatch !== null) {
      ops.push(copulaMoFocusMatch);
      continue;
    }
    const renyouFocusEllipsisMatch = matchRenyouFocusSupportEllipsisConnective(cursor, input);
    if (renyouFocusEllipsisMatch !== null) {
      ops.push(renyouFocusEllipsisMatch);
      continue;
    }
    const bareMoConcessionMatch = matchBareMoConcessiveConnective(cursor, input);
    if (bareMoConcessionMatch !== null) {
      ops.push(bareMoConcessionMatch);
      continue;
    }
    const terminalTokaCarrier = input.stopAtUnparsedTail === true
      ? null
      : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input, {
          allowTerminalToka: true
        });
    if (terminalTokaCarrier !== null) {
      ops.push(terminalTokaCarrier);
      continue;
    }
    const datteFocusMatch = matchDatteFocusParticleConnective(input, cursor, ops);
    if (datteFocusMatch !== null) {
      ops.push(datteFocusMatch);
      continue;
    }
    const teKaraMatch = matchTeKaraSequenceConnective(cursor);
    if (teKaraMatch !== null) {
      ops.push(teKaraMatch);
      continue;
    }
    const teIraiMatch = matchTeIraiTemporalSinceConnective(cursor);
    if (teIraiMatch !== null) {
      ops.push(teIraiMatch);
      continue;
    }
    const zuniMatch = matchZuniConnective(cursor, ops, stemNode);
    if (zuniMatch !== null) {
      ops.push(zuniMatch);
      continue;
    }
    const tariMatch = matchTariEnumerativeConnective(cursor);
    if (tariMatch !== null) {
      ops.push(tariMatch);
      continue;
    }
    const naraBaMatch = matchNaraBaConnective(cursor);
    if (naraBaMatch !== null) {
      ops.push(naraBaMatch);
      continue;
    }
    const taraBaMatch = matchClassicalConditionalBaConnective(cursor, ops);
    if (taraBaMatch !== null) {
      ops.push(taraBaMatch);
      continue;
    }
    const inventoryCompositeMatch = matchInventoryCompositeConnective(cursor, stemTok);
    if (inventoryCompositeMatch !== null) {
      ops.push(inventoryCompositeMatch);
      continue;
    }
    const postpositionalConnectiveMatch = matchPostpositionalInventoryConnective(cursor, ops, stemNode);
    if (postpositionalConnectiveMatch !== null) {
      ops.push(postpositionalConnectiveMatch);
      continue;
    }
    const bareVolitionalExemplification = matchBareVolitionalClosedExemplificationConnective(input, cursor);
    if (bareVolitionalExemplification !== null) {
      ops.push({ ...bareVolitionalExemplification, closedChainMood: quotedPropositionMood(stemTok, ops, null) });
      continue;
    }
    const exemplificationMatch = matchExemplificationConnective(cursor, input.lookups);
    if (exemplificationMatch !== null) {
      ops.push(exemplificationMatch);
      continue;
    }
    const quotedConcessiveMatch = matchQuotedConcessiveConnective(cursor);
    if (quotedConcessiveMatch !== null) {
      ops.push(quotedConcessiveMatch);
      continue;
    }
    const retrospectiveQuoteMatch = matchRetrospectiveQuoteConnective(cursor, stemNode);
    if (retrospectiveQuoteMatch !== null) {
      ops.push(retrospectiveQuoteMatch);
      continue;
    }
    const questionReformulationMatch = matchQuestionReformulationConnective(cursor);
    if (questionReformulationMatch !== null) {
      ops.push(questionReformulationMatch);
      continue;
    }
    const questionQuotativeMatch = matchQuestionQuotativeConnective(cursor);
    if (questionQuotativeMatch !== null) {
      ops.push(questionQuotativeMatch);
      continue;
    }
    const quoteFocusMatch = matchQuoteFocusQuotativeConnective(cursor, ops);
    if (quoteFocusMatch !== null) {
      ops.push(quoteFocusMatch);
      continue;
    }
    const quotativeMatch = matchQuotativeConnective(input, cursor);
    if (quotativeMatch !== null) {
      ops.push(quotativeMatch);
      continue;
    }
    const bareTteMatch = matchBareTteQuotativeConnective(cursor);
    if (bareTteMatch !== null) {
      ops.push(bareTteMatch);
      continue;
    }
    const lastOpForToCond = ops.length > 0 ? ops[ops.length - 1] : undefined;
    const isAfterNegation = lastOpForToCond?.kind === "negation";
    const politeVolitionalQuotativeMatch =
      matchElidedHostPoliteVolitionalQuotativeConnective(input, cursor, ops);
    if (politeVolitionalQuotativeMatch !== null) {
      ops.push(politeVolitionalQuotativeMatch);
      continue;
    }
    const volitionalPurposeToMatch = matchVolitionalPurposeToConnective(input, cursor, stemTok, ops);
    if (volitionalPurposeToMatch !== null) {
      ops.push(volitionalPurposeToMatch);
      continue;
    }
    const commandQuotativeMatch = matchElidedHostCommandQuotativeConnective(cursor, ops);
    if (commandQuotativeMatch !== null) {
      ops.push(commandQuotativeMatch);
      continue;
    }
    const politeCopulaQuotativeMatch = matchElidedHostPoliteCopulaQuotativeConnective(cursor, ops);
    if (politeCopulaQuotativeMatch !== null) {
      ops.push(politeCopulaQuotativeMatch);
      continue;
    }
    const conditionalQuotativeMatch = matchElidedHostConditionalQuotativeConnective(input, cursor, ops);
    if (conditionalQuotativeMatch !== null) {
      ops.push(conditionalQuotativeMatch);
      continue;
    }
    const quoteFocusEvenMatch = matchElidedHostQuoteFocusEvenConnective(input, cursor);
    if (quoteFocusEvenMatch !== null) {
      ops.push(quoteFocusEvenMatch);
      continue;
    }
    const quoteTopicExclamativeMatch = matchElidedHostQuoteTopicExclamativeSfp(input, cursor, ops);
    if (quoteTopicExclamativeMatch !== null) {
      sfp = quoteTopicExclamativeMatch;
      break;
    }
    if (!isAfterNegation || !allowElidedNaitoObligation) {
      const terminalBareToCarrier = input.stopAtUnparsedTail === true
        ? null
        : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input, {
            allowTerminalBareTo: true
          });
      if (terminalBareToCarrier !== null) {
        ops.push(absorbBareTeDirectiveIntoCarrier(ops, terminalBareToCarrier, stemTok));
        continue;
      }
      const toCondMatch = matchToConditionalConnective(cursor);
      if (toCondMatch !== null) {
        ops.push(toCondMatch);
        continue;
      }
    }

    const closesAsQuotativeMannerAttributive = ops.at(-1)?.kind === "connective" &&
      (ops.at(-1) as ConnectiveOp).connective === "predicate_projection_quotative_manner_simile_attributive";
    const nominalizerTerminal = closesAsQuotativeMannerAttributive ? null : matchPlainNominalizerTerminal(
      input,
      cursor,
      input.allowPlainNominalizerTerminal === true,
      input.lookups
    );
    if (nominalizerTerminal !== null) {
      explicitTerminal = "nominalized";
      explicitTerminalPayload = nominalizerTerminal;
      break;
    }

    const arimasenSupportMatch = matchArimasenPoliteNegativeSupport(cursor, stemNode, ops);
    if (arimasenSupportMatch !== null) {
      const lastOp = ops[ops.length - 1];
      if (lastOp?.kind === "negation") {
        ops[ops.length - 1] = mergeNegationOps(lastOp, arimasenSupportMatch.negation);
        ops.push(arimasenSupportMatch.polite);
      } else {
        ops.push(arimasenSupportMatch.polite, arimasenSupportMatch.negation);
      }
      continue;
    }

    const noBridgedModal = matchNoBridgedLikenessModal(cursor, stemTok, {
      previousOps: ops,
      lookups: input.lookups,
      input,
      elidedColloquialObligationContext
    });
    if (noBridgedModal !== null) {
      ops.push(...(noBridgedModal.ops ?? [noBridgedModal.op]));
      if (noBridgedModal.terminal !== undefined) {
        explicitTerminal = noBridgedModal.terminal;
        break;
      }
      continue;
    }

    const modalMatch = matchModalAtCursor(cursor, stemTok, {
      previousOps: ops,
      lookups: input.lookups,
      input,
      elidedColloquialObligationContext
    });
    if (modalMatch !== null) {
      ops.push(...(modalMatch.ops ?? [modalMatch.op]));
      if (modalMatch.terminal !== undefined) {
        explicitTerminal = modalMatch.terminal;
        break;
      }
      continue;
    }

    const sfpBridgedQuoteCarrier = cursor.tx((c) => {
      let quotedSfp: SfpNode | null = null;
      for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
        const next = matchTerminalSfpArbitration(input, c, stemTok, ops);
        if (next === null) {
          return null;
        }
        if (quotedSfp === null) {
          quotedSfp = next;
        }
        const carrier = matchPredicateQuoteCarrier(c, input.lookups, stemTok, ops, input, {
          allowTerminalBareTo: true,
          allowTerminalToka: true,
          quotedPropositionClosedBySfp: true
        });
        if (carrier === null) {
          continue;
        }
        if (carrier.sourceTerminal === true) {
          return { quotedSfp, carrier };
        }
        return input.quoteAttributiveHeadFrame?.quotedContentHeadBinding === true
          ? { quotedSfp, carrier }
          : null;
      }
      return null;
    });
    if (sfpBridgedQuoteCarrier !== null) {
      {
        const bridgedMood = quotedPropositionMood(
          stemTok, ops, sfpBridgedQuoteCarrier.quotedSfp
        );
        const chainMood = sfpBridgedQuoteCarrier.carrier.quotedMood;
        ops.push(absorbBareTeDirectiveIntoCarrier(ops, {
          ...sfpBridgedQuoteCarrier.carrier,
          quotedSfp: sfpBridgedQuoteCarrier.quotedSfp,
          ...quotedMoodPayload(bridgedMood),
          ...(chainMood === undefined ? {} : { quotedChainMood: chainMood })
        }, stemTok));
      }
      sfp = matchTerminalSfpArbitration(input, cursor, stemTok, ops);
      break;
    }

    const sfpClosedExemplification = cursor.tx((c) => {
      let closedSfp: SfpNode | null = null;
      for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
        const next = matchTerminalSfpArbitration(input, c, stemTok, ops);
        if (next === null) {
          return null;
        }
        if (closedSfp === null) {
          closedSfp = next;
        }
        const connective = matchSfpClosedExemplificationConnective(input, c);
        if (connective !== null) {
          return { ...connective, closedSfp, closedChainMood: quotedPropositionMood(stemTok, ops, null) };
        }
      }
      return null;
    });
    if (sfpClosedExemplification !== null) {
      ops.push(sfpClosedExemplification);
      continue;
    }

    const terminalSfpMatch = matchTerminalSfpArbitration(input, cursor, stemTok, ops);
    if (terminalSfpMatch !== null) {
      sfp = terminalSfpMatch;
      break;
    }

    const precedingIdx = previousNonSpaceIndex(tokens, cursor.pos);
    const pairedConcessiveNegativeAux =
      input.outgoingBoundaryHint?.pairedConcessive?.negativeAuxIdx ===
      sourceIndexForInputPosition(input, cursor.pos);
    const result = pairedConcessiveNegativeAux
      ? NEGATION_OK
      : classifyTailAux(
        token,
        tokens[cursor.pos + 1],
        stemNode,
        precedingIdx === null ? undefined : tokens[precedingIdx],
        ops
      );
    const classifiedConnective = result.classifications.includes("connective")
      ? lookupConnectiveBySurface(token.surface)
      : undefined;
    if (
      classifiedConnective !== undefined &&
      connectiveSurfaceRequiresFinalPosition(classifiedConnective, token.surface) &&
      cursor.pos + 1 < cursor.end
    ) {
      if (input.stopAtUnparsedTail === true) {
        break;
      }
      return {
        ok: false,
        reason: `position ${cursor.pos} (surface=${token.surface}): connective is admitted only at chain-final position`,
        position: cursor.pos
      };
    }
    if (
      result.classifications.includes("connective") &&
      teDeContinuationRelationAt(tokens, cursor.pos, {
        consumers: ["tail_multi_clause"],
        lookups: input.lookups
      }) !== null
    ) {
      if (input.stopAtUnparsedTail === true) {
        break;
      }
      return {
        ok: false,
        reason: `position ${cursor.pos} (surface=${token.surface}): te/de connective opens postverb operator tail`,
        position: cursor.pos
      };
    }
    if (result.classifications.length === 0) {
      const p4 = token.pos & POS4;
      const dialectYaOnRealizedChain = p4 === 助動詞_ヤ && (
        ops.some((op) => op.kind === "copula") ||
        (
          (token.pos & POS5) === 連用形_促音便 &&
          ops.some((op) => op.kind === "tense")
        )
      );
      if (
        !dialectYaOnRealizedChain &&
        (p4 === 助動詞_ダ || p4 === 助動詞_デス || p4 === 助動詞_ジャ || p4 === 助動詞_ヤ)
      ) {
        const copulaStart = cursor.pos;
        const copulaRecovery = matchCopulaAtCursor(cursor, input.lookups, {
          allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
        }, input);
        if (copulaRecovery !== null) {
          if (copulaRecovery.adnominal) {
            explicitTerminal = "attributive";
            adnominalCopulaTerminalMarkerPos = copulaStart;
          }
          ops.push(...(copulaRecovery.ops ?? [copulaRecovery.op]));
          continue;
        }
      }
      if (input.stopAtUnparsedTail === true) {
        break;
      }
      const reason = result.reason ?? `out-of-subset token: pos=${JSON.stringify(token.pos)}`;
      return {
        ok: false,
        reason: `position ${cursor.pos} (surface=${token.surface}): ${reason}`,
        position: cursor.pos
      };
    }

    if (
      result.classifications.length === 1 &&
      result.classifications[0] === "negation" &&
      isNaiOrNuToken(token)
    ) {
      const chainStartFailure = validateNegationChainStart({
        pos: cursor.pos,
        start,
        stemTok,
        token,
        previousOp: ops.length > 0 ? ops[ops.length - 1] : undefined
      });
      if (chainStartFailure !== null) {
        return chainStartFailure;
      }
      ops.push(collectNegationChain(cursor, pairedConcessiveNegativeAux));
      continue;
    }

    for (const cls of result.classifications) {
      const built = buildOpFromClassification(cls, token, cursor.pos, ops);
      const previous = ops.at(-1);
      if (
        built.kind === "negation" &&
        previous?.kind === "negation" &&
        ((previous.source.tokens.at(-1)?.pos ?? 0) & POS5A) === 連用形_
      ) {
        ops[ops.length - 1] = mergeNegationOps(previous, built);
      } else {
        ops.push(built);
      }
    }
    cursor.advance();
  }

  let consumedEnd = cursor.pos;
  const isStemFragmentForm = (pos5A: number): boolean =>
    pos5A === 連用形_ || pos5A === 仮定形_ || pos5A === 未然形_;
  const isOpsFragmentForm = (pos5A: number): boolean =>
    pos5A === 連用形_ || pos5A === 仮定形_;

  let terminal: AuxLayerNode["terminal"] = explicitTerminal;
  let terminalPayload: AuxLayerNode["terminalPayload"] | undefined = explicitTerminalPayload;
  if (terminal === null && ops.length === 0 && input.allowAdverbialModifierTerminal === "none") {
    terminal = "adverbial_modifier";
  }
  const lastCarrierOp = ops.at(-1);
  if (
    terminal === null &&
    lastCarrierOp?.kind === "predicateProjectionCarrier" &&
    declaredProjectionCarrierBranchTerminal(lastCarrierOp.sourceAllomorph) === "adverbial_modifier"
  ) {
    terminal = "adverbial_modifier";
  }
  if (
    terminal === "attributive" &&
    adnominalCopulaTerminalMarkerPos !== null &&
    cursor.pos > adnominalCopulaTerminalMarkerPos + 1
  ) {
    terminal = null;
  }
  if (ops.length > 0) {
    const lastOp = ops[ops.length - 1]!;
    if (
      lastOp.kind !== "connective" &&
      !(lastOp.kind === "copula" && lastOp.variant === "conditional_nara") &&
      !(lastOp.kind === "modal" && lastOp.modal === "youda" && lastOp.terminal === "adverbial_ni") &&
      !isElidedColloquialObligationTerminal(lastOp)
    ) {
      const lastTok = opLastSourceToken(lastOp);
      if (
        lastTok !== undefined &&
        isOpsFragmentForm(lastTok.pos & POS5A) &&
        sfp?.effect !== "na_soft_imperative" &&
        !isFusedJaCopulaTerminalBeforeSfp(lastOp, lastTok, sfp)
      ) {
        if (
          input.allowAdverbialModifierTerminal === "copula_ni" &&
          (previousOpIsAffirmativeCopulaNi(ops) || previousOpIsSoudaYotaiAdverbialNi(ops))
        ) {
          terminal = "adverbial_modifier";
        } else if (canOpenOpsRenyouCompoundPrenominalTerminal(input, stemNode, ops, lastTok)) {
          terminal = "attributive";
        } else if (canOpenRenyouChuushiTerminal(input, stemNode, ops, lastOp, lastTok)) {
          terminal = "renyou_chuushi";
          terminalPayload = renyouChuushiPayloadForOp(lastOp, input.renyouChuushiTerminalRole);
        } else if (canOpenMalformedConditionalFragmentTerminal(input, stemNode, lastOp, lastTok)) {
          ops.push(missingConditionalMarkerConnective(lastOp.source));
        } else if (input.stopAtUnparsedTail === true) {
          const trimmedEnd = trimTrailingFragmentOps(ops, isOpsFragmentForm);
          if (trimmedEnd === null) {
            return {
              ok: false,
              reason: `ops end with fragment form (kind=${lastOp.kind}, surface=${lastTok.surface}, pos5A=${posToString(lastTok.pos)}) — chain/connect signal without terminal`,
              position: cursor.pos
            };
          }
          consumedEnd = trimmedEnd;
        } else {
          return {
            ok: false,
            reason: `ops end with fragment form (kind=${lastOp.kind}, surface=${lastTok.surface}, pos5A=${posToString(lastTok.pos)}) — chain/connect signal without terminal`,
            position: cursor.pos
          };
        }
      }
    }
  } else if (input.stemTerminalOwnedByCaller === true) {
    const hostTok = stemNode.source.tokens[0];
    if (
      terminal === null &&
      hostTok !== undefined &&
      sfp === null &&
      canOpenStemRenyouChuushiTerminal(input, stemNode, hostTok)
    ) {
      terminal = "renyou_chuushi";
      terminalPayload = renyouChuushiPayloadForSource(stemNode.source, input.renyouChuushiTerminalRole);
    }
  } else if (terminal !== "adverbial_modifier") {
    const stemTok = stemNode.source.tokens[0];
    if (stemTok !== undefined && isStemFragmentForm(stemTok.pos & POS5A) && sfp?.effect !== "na_soft_imperative") {
      if (canOpenStemRenyouCompoundPrenominalTerminal(input, stemNode, stemTok)) {
        terminal = "attributive";
      } else if (canOpenStemRenyouChuushiTerminal(input, stemNode, stemTok)) {
        terminal = "renyou_chuushi";
        terminalPayload = renyouChuushiPayloadForSource(stemNode.source, input.renyouChuushiTerminalRole);
      } else if (canOpenStemMalformedConditionalFragmentTerminal(input, stemNode, stemTok)) {
        ops.push(missingConditionalMarkerConnective(stemNode.source));
      } else {
        return {
          ok: false,
          reason: `stem ends with fragment form (surface=${stemTok.surface}, pos5A=${posToString(stemTok.pos)}) — chain/connect signal without terminal`,
          position: cursor.pos
        };
      }
    }
  }

  if (terminal === null && ops.length > 0) {
    const lastOp = ops[ops.length - 1]!;
    if (lastOp.kind !== "aspect" && lastOp.kind !== "connective") {
      const lastTok = opLastSourceToken(lastOp);
      if (lastTok !== undefined && (lastTok.pos & POS5A) === 命令形_) {
        terminal = "imperative";
      }
    }
  }

  if (terminal === null && ops.length === 0) {
    const cmdTok = stemNode.source.tokens[stemNode.conjugationAnchor] ?? stemNode.source.tokens[0];
    if (cmdTok !== undefined && (cmdTok.pos & POS5A) === 命令形_) {
      terminal = "imperative";
    }
  }

  if (
    terminal === null &&
    input.allowElidedNominalizerTerminal === true &&
    cursor.pos >= cursor.end
  ) {
    terminal = "nominalized";
    terminalPayload = {
      kind: "nominalized",
      nominalizerSource: "elided",
      source: { tokens: [], tokenIndices: [] }
    };
  }

  const inabilityOps = applyNegationInabilityPolicy(ops, stemNode, input.lookups);
  const policyOps = stemNode.kind === "verb" || stemNode.kind === "adj"
    ? applyShortTailPolicy(inabilityOps, stemNode.kind, stemNode, input.lookups)
    : inabilityOps;
  const normalizedOps = normalizeTosuruModeForTerminal(policyOps, terminalPayload);
  const layer: AuxLayerNode = {
    kind: "auxLayer",
    stem: stemNode,
    ops: normalizedOps,
    terminal,
    ...(terminalPayload === undefined ? {} : { terminalPayload })
  };

  const streamStart = input.streamStart ?? 0;
  let finalizedRoot: ParsedTailRoot;
  try {
    finalizedRoot = relocateRoot(
      { tail: layer, sfp },
      streamStart,
      input.prependSource,
      input.conjugationAnchor,
      input.semanticAnchors,
      input.sourceIndexMap,
      input.stemSourceOverride
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `relocateRoot: ${message}`, position: cursor.pos };
  }

  return {
    ok: true,
    root: finalizedRoot,
    consumed: consumedEnd - start
  };
}

function trimTrailingFragmentOps(
  ops: AuxOpNode[],
  isFragmentForm: (pos5A: number) => boolean
): number | null {
  let end: number | null = null;
  while (ops.length > 0) {
    const lastOp = ops[ops.length - 1]!;
    const lastTok = opLastSourceToken(lastOp);
    if (lastTok === undefined || !isFragmentForm(lastTok.pos & POS5A)) {
      return end;
    }
    const start = lastOp.source.tokenIndices[0];
    if (start === undefined) {
      return null;
    }
    end = start;
    ops.pop();
  }
  return end;
}

export function predicateQuoteCarrierSpanEnd(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): number | null {
  if (markerIdx < 0 || markerIdx >= tokens.length) {
    return null;
  }
  const cursor = new TokenCursor(tokens, markerIdx, tokens.length);
  const carrier = matchPredicateQuoteCarrier(cursor, lookups);
  if (carrier === null) {
    return null;
  }
  const last = carrier.source.tokenIndices.at(-1);
  return last === undefined ? null : last + 1;
}

export interface TailContinuationInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hostIdx: number;
  readonly semanticHostIdx?: number;
  readonly cursorStart: number;
  readonly reachEndExclusive: number;
  readonly stem: StemInput;
  readonly lookups: LookupTables;
  readonly allowZeroNiPurposeTerminal?: boolean;
  readonly clauseContinuesAfterReach?: boolean;
  readonly allowElidedColloquialObligation?: ElidedColloquialObligationContext;
  readonly outgoingBoundaryHint?: ParseOutgoingBoundaryHint;
}

export interface TailContinuation {
  readonly ops: readonly AuxOpNode[];
  readonly sfp: SfpNode | null;
  readonly terminal: AuxLayerNode["terminal"];
  readonly terminalPayload?: AuxLayerNode["terminalPayload"];
  readonly endExclusive: number;
}

export function parseTailContinuation(input: TailContinuationInput): TailContinuation | null {
  const { tokens, hostIdx, cursorStart, reachEndExclusive } = input;
  const hostToken = tokens[hostIdx];
  if (hostToken === undefined || cursorStart <= hostIdx || reachEndExclusive < cursorStart) {
    return null;
  }
  const parseSlice = [hostToken, ...tokens.slice(cursorStart, reachEndExclusive)];
  const semanticHostToken = input.semanticHostIdx === undefined ? undefined : tokens[input.semanticHostIdx];
  const parsed = parseTail({
    tokens: parseSlice,
    start: 0,
    stem: input.stem,
    lookups: input.lookups,
    contextTokens: tokens,
    stopAtUnparsedTail: true,
    stemTerminalOwnedByCaller: true,
    allowRenyouChuushiTerminal: input.clauseContinuesAfterReach === true,
    ...(semanticHostToken === undefined ? {} : { semanticStemToken: semanticHostToken }),
    ...(input.allowZeroNiPurposeTerminal === true ? { allowZeroNiPurposeTerminal: true } : {}),
    ...(input.allowElidedColloquialObligation === undefined
      ? {}
      : { allowElidedColloquialObligation: input.allowElidedColloquialObligation }),
    ...(input.outgoingBoundaryHint === undefined ? {} : { outgoingBoundaryHint: input.outgoingBoundaryHint }),
    sourceIndexMap: [hostIdx, ...continuationIndices(cursorStart, reachEndExclusive)]
  });
  if (!parsed.ok) {
    return null;
  }
  const layer = firstAuxLayer(parsed.root.tail);
  if (layer === null) {
    return null;
  }
  return {
    ops: layer.ops,
    sfp: parsed.root.sfp,
    terminal: layer.terminal,
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
    endExclusive: cursorStart + (parsed.consumed - 1)
  };
}

function continuationIndices(start: number, endExclusive: number): readonly number[] {
  const indices: number[] = [];
  for (let idx = start; idx < endExclusive; idx += 1) {
    indices.push(idx);
  }
  return indices;
}

function isElidedColloquialObligationTerminal(op: AuxOpNode): boolean {
  return op.kind === "idiom" &&
    op.idiom === "obligation" &&
    (op.variant === "colloquial_nakya" || op.variant === "colloquial_nakucha") &&
    op.source.tokens.length <= 2;
}

function relocateRoot(
  root: ParsedTailRoot,
  streamStart: number,
  prependSource: OpSource | undefined,
  finalConjugationAnchor: number | undefined,
  finalSemanticAnchors: readonly number[] | undefined,
  sourceIndexMap: readonly number[] | undefined,
  stemSourceOverride: OpSource | undefined
): ParsedTailRoot {
  if (prependSource !== undefined &&
    prependSource.tokens.length !== prependSource.tokenIndices.length) {
    throw new Error(
      `relocateRoot: prependSource length mismatch (tokens=${prependSource.tokens.length}, ` +
      `tokenIndices=${prependSource.tokenIndices.length}) — OpSource pair invariant 위반`
    );
  }
  if (stemSourceOverride !== undefined &&
    stemSourceOverride.tokens.length !== stemSourceOverride.tokenIndices.length) {
    throw new Error(
      `relocateRoot: stemSourceOverride length mismatch (tokens=${stemSourceOverride.tokens.length}, ` +
      `tokenIndices=${stemSourceOverride.tokenIndices.length}) — OpSource pair invariant 위반`
    );
  }

  const mapIndex = (i: number): number => sourceIndexMap?.[i] ?? (i + streamStart);

  const shiftSource = (src: OpSource): OpSource => ({
    tokens: src.tokens,
    tokenIndices: src.tokenIndices.map(mapIndex)
  });

  const finalizeTopStem = (stem: StemNode): StemNode => {
    const baseSource = stemSourceOverride ?? shiftSource(stem.source);
    if (prependSource === undefined || prependSource.tokens.length === 0) {
      const needsAnchorOverride =
        stemSourceOverride !== undefined ||
        finalConjugationAnchor !== undefined ||
        finalSemanticAnchors !== undefined;
      if (!needsAnchorOverride) {
        switch (stem.kind) {
          case "verb": return { ...stem, source: baseSource };
          case "adj": return { ...stem, source: baseSource };
          case "noun": return { ...stem, source: baseSource };
          case "adverb": return { ...stem, source: baseSource };
          case "candidateSet": return { ...stem, source: baseSource };
        }
      }
      const conjugationAnchor = finalConjugationAnchor ?? stem.conjugationAnchor;
      const semanticAnchors = finalSemanticAnchors ?? stem.semanticAnchors;
      assertStemAnchorBounds(baseSource, conjugationAnchor, semanticAnchors);
      switch (stem.kind) {
        case "verb": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "adj": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "noun": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "adverb": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "candidateSet": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
      }
    }
    const newSource: OpSource = {
      tokens: [...prependSource.tokens, ...baseSource.tokens],
      tokenIndices: [...prependSource.tokenIndices, ...baseSource.tokenIndices]
    };
    const conjugationAnchor = finalConjugationAnchor ?? prependSource.tokens.length;
    const semanticAnchors = finalSemanticAnchors ??
      Array.from({ length: prependSource.tokens.length }, (_, i) => i);
    assertStemAnchorBounds(newSource, conjugationAnchor, semanticAnchors);
    switch (stem.kind) {
      case "verb": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "adj": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "noun": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "adverb": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "candidateSet": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
    }
  };

  const walkAuxOp = (op: AuxOpNode): AuxOpNode => {
    if ("inner" in op && (op as { inner?: TailNode }).inner !== undefined) {
      throw new Error(
        `relocateRoot: AuxOp.inner not supported (op kind=${op.kind}) — walker 갱신 필요`
      );
    }
    if (op.kind === "connective" && op.closedSfp !== undefined) {
      return {
        ...op,
        source: shiftSource(op.source),
        closedSfp: { ...op.closedSfp, source: shiftSource(op.closedSfp.source) }
      };
    }
    if (op.kind === "predicateQuoteCarrier" && op.quotedSfp !== undefined) {
      return {
        ...op,
        source: shiftSource(op.source),
        quotedSfp: { ...op.quotedSfp, source: shiftSource(op.quotedSfp.source) }
      };
    }
    return { ...op, source: shiftSource(op.source) };
  };

  const walkTerminalPayload = (payload: NonNullable<AuxLayerNode["terminalPayload"]>): NonNullable<AuxLayerNode["terminalPayload"]> =>
    payload.kind === "renyouChuushi" ? { ...payload, source: shiftSource(payload.source) } : payload;

  const walkAuxLayer = (layer: AuxLayerNode, isTopLevel: boolean): AuxLayerNode => ({
    ...layer,
    stem: isTopLevel
      ? materializeStemMood(finalizeTopStem(layer.stem))
      : { ...layer.stem, source: shiftSource(layer.stem.source) },
    ops: layer.ops.map(walkAuxOp),
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: walkTerminalPayload(layer.terminalPayload) })
  });

  const walkTail = (tail: TailNode, isTopLevel: boolean): TailNode => {
    if (tail.kind === "auxLayer") return walkAuxLayer(tail, isTopLevel);
    return {
      ...tail,
      inner: walkAuxLayer(tail.inner, isTopLevel),
      source: shiftSource(tail.source),
      outer: walkTail(tail.outer, false)
    };
  };

  return {
    ...root,
    tail: walkTail(root.tail, true),
    sfp: root.sfp !== null ? { ...root.sfp, source: shiftSource(root.sfp.source) } : null
  };
}

function materializeStemMood(stem: StemNode): StemNode {
  const stemMood = inflectionStemMood(stem.source.tokens[stem.conjugationAnchor]);
  return stemMood === undefined ? stem : { ...stem, stemMood };
}

export function inflectionStemMood(sourceToken: RuntimeHaruToken | undefined): StemMood | undefined {
  if (sourceToken === undefined || !isVolitionalInflection(sourceToken.pos)) {
    return undefined;
  }
  if (inflectionCarriesVolitionalSpeechAct(sourceToken)) {
    return "volitional";
  }
  if (isIAdjectivePredicateToken(sourceToken)) {
    return "conjectural";
  }
  return undefined;
}

function assertStemAnchorBounds(
  source: OpSource,
  conjugationAnchor: number,
  semanticAnchors: readonly number[]
): void {
  const finalLen = source.tokens.length;
  if (conjugationAnchor < 0 || conjugationAnchor >= finalLen) {
    throw new Error(
      `relocateRoot: conjugationAnchor ${conjugationAnchor} out of bounds [0, ${finalLen}) — anchor invariant 위반`
    );
  }
  for (const idx of semanticAnchors) {
    if (idx < 0 || idx >= finalLen) {
      throw new Error(
        `relocateRoot: semanticAnchors index ${idx} out of bounds [0, ${finalLen}) — anchor invariant 위반`
      );
    }
  }
}

function opLastSourceToken(op: AuxOpNode): RuntimeHaruToken | undefined {
  const src = op.source.tokens;
  return src.length > 0 ? src[src.length - 1] : undefined;
}

function validateNegationChainStart(
  input: {
    readonly pos: number;
    readonly start: number;
    readonly stemTok: RuntimeHaruToken;
    readonly token: RuntimeHaruToken;
    readonly previousOp: AuxOpNode | undefined;
  }
): ParseOutcome | null {
  const { pos, start, stemTok, token, previousOp } = input;
  if (pos === start + 1) {
    const stemPos5A = stemTok.pos & POS5A;
    const isStemTerminal = stemPos5A === 終止形_ || stemPos5A === 連体形_;
    if (isStemTerminal) {
      return {
        ok: false,
        reason: `position ${pos} (surface=${token.surface}): chain 시작 비정상 — stem '${stemTok.surface}' (활용형 ${stemPos5A}) + 부정 토큰 의 비표준 합성. 정상 chain stem = 連用/未然.`,
        position: pos
      };
    }
  }

  if (previousOp?.kind === "copula" && previousOp.polarity === "negative") {
    const anchor = opLastSourceToken(previousOp);
    const anchorPos5A = (anchor?.pos ?? 0) & POS5A;
    if (anchorPos5A !== 連用形_) {
      return {
        ok: false,
        reason: `position ${pos} (surface=${token.surface}): N+Copula negative chain 시작 비정상 — 직전 copula 부정 token '${anchor?.surface ?? "<none>"}' (활용형 ${anchorPos5A}) 뒤 부정 토큰. 정상 chain anchor = 連用形 (例: ではなくない).`,
        position: pos
      };
    }
  }

  return null;
}

export function normalizeTosuruModeForTerminal(
  ops: readonly AuxOpNode[],
  terminalPayload: AuxLayerNode["terminalPayload"] | undefined
): readonly AuxOpNode[] {
  if (terminalPayload?.kind !== "attributiveBoundary") {
    return ops;
  }
  const follower = terminalPayload.source.tokens[0];
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

function applyNegationInabilityPolicy(
  ops: readonly AuxOpNode[],
  stem: StemNode,
  lookups: LookupTables
): readonly AuxOpNode[] {
  const negIdx = ops.findIndex((op) => op.kind !== "polite");
  const first = negIdx < 0 ? undefined : ops[negIdx];
  if (first?.kind !== "negation" || first.inability === true) {
    return ops;
  }
  const verbs = lookups.NEGATION_INABILITY_VERBS;
  const lexical = [...stem.semanticAnchors, stem.conjugationAnchor].some((anchorIdx) => {
    const token = stem.source.tokens[anchorIdx];
    return token !== undefined && verbs.has(token.dictionaryForm);
  });
  if (!lexical) {
    return ops;
  }
  const result = [...ops];
  result[negIdx] = { ...first, inability: true, preferShortNegation: false };
  return result;
}

export function applyShortTailPolicy(
  ops: readonly AuxOpNode[],
  stemKind: "verb" | "adj",
  stem: StemNode,
  lookups: LookupTables
): readonly AuxOpNode[] {
  if (stemKind !== "verb") {
    return ops;
  }
  if (stemPrefersLongNegation(stem, lookups) || !stemHasKnownShortNegationPolicy(stem)) {
    return ops;
  }
  const negIdx = ops.findIndex((op) => op.kind === "negation");
  if (negIdx === -1) {
    return ops;
  }
  const neg = ops[negIdx];
  if (neg === undefined || neg.kind !== "negation") {
    return ops;
  }
  if (neg.chainDepth !== 1 || !negationOpAdmitsShortForm(neg)) {
    return ops;
  }
  const allShortTail = ops.every(
    (op) => op.kind === "negation" || op.kind === "tense" || op.kind === "polite"
  );
  if (!allShortTail) {
    return ops;
  }
  const updated: NegationOp = { ...neg, preferShortNegation: true };
  const result = [...ops];
  result[negIdx] = updated;
  return result;
}

function stemPrefersLongNegation(stem: StemNode, lookups: LookupTables): boolean {
  if (stem.kind === "verb") {
    return lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS.has(stem.lemma);
  }
  return false;
}

function stemHasKnownShortNegationPolicy(stem: StemNode): boolean {
  if (stem.kind === "verb") {
    return policyAllowsShortNegation(shortNegationPolicyForCommittedStem(stem.lemma, stem.shortNegationPolicy));
  }
  if (stem.kind === "candidateSet") {
    return false;
  }
  return false;
}

function buildOpFromClassification(
  cls: AuxClass,
  token: RuntimeHaruToken,
  pos: number,
  previousOps: readonly AuxOpNode[] = []
): AuxOpNode {
  switch (cls) {
    case "negation": {
      return buildNegationOp(srcSingle(token, pos), 1, false);
    }
    case "tense_past": {
      return buildTenseOp(srcSingle(token, pos));
    }
    case "polite": {
      return buildPoliteOp(srcSingle(token, pos));
    }
    case "classical_aux_residue": {
      return buildClassicalAuxResidueOp(
        srcSingle(token, pos),
        classicalAuxResidueKindForToken(token)
      );
    }
    case "conjecture": {
      return buildConjectureOp(srcSingle(token, pos), false);
    }
    case "conjecture_polite": {
      return buildConjectureOp(srcSingle(token, pos), true);
    }
    case "rashii": {
      return buildRashiiModalOp(srcSingle(token, pos));
    }
    case "desire": {
      return buildDesireOp(srcSingle(token, pos));
    }
    case "voice_passive": {
      return buildVoiceOp(srcSingle(token, pos), "passive", [
        "passive",
        "potential",
        "honorific"
      ]);
    }
    case "voice_causative": {
      return buildVoiceOp(srcSingle(token, pos), "causative");
    }
    case "voice_honorific": {
      return buildVoiceOp(srcSingle(token, pos), "honorific");
    }
    case "connective": {
      return buildClassifiedConnectiveOp(token, pos, previousOps);
    }
    default:
      return assertNever(cls);
  }
}

export function buildTenseOp(source: OpSource): TenseOp {
  return createTenseOp({  source, tense: "past" });
}

export function buildPoliteOp(source: OpSource): PoliteOp {
  return createPoliteOp({  source });
}

export function buildClassicalAuxResidueOp(
  source: OpSource,
  residue: ClassicalAuxResidueOp["residue"]
): ClassicalAuxResidueOp {
  return createClassicalAuxResidueOp({  residue, source });
}

function pushScopeBridgeOps(
  ops: AuxOpNode[],
  bridge: ScopeBridgeOp,
  tokens: readonly RuntimeHaruToken[]
): void {
  ops.push(bridge);
  if (bridge.conjecture !== true) {
    return;
  }
  const conjectureIdx = bridge.source.tokenIndices[bridge.source.tokenIndices.length - 1];
  const conjectureToken = conjectureIdx === undefined ? undefined : tokens[conjectureIdx];
  if (conjectureToken === undefined || conjectureIdx === undefined) {
    return;
  }
  ops.push(buildConjectureOp(srcSingle(conjectureToken, conjectureIdx), false));
}

export function buildConjectureOp(source: OpSource, polite: boolean): ConjectureOp {
  return createConjectureOp({  source, polite });
}

export function buildDesireOp(source: OpSource): DesireOp {
  return createDesireOp({ source, ...(isTagaruTailAuxToken(source.tokens.at(-1)) ? { form: "tagaru" as const } : {}) });
}

export function buildRashiiModalOp(source: OpSource): RashiiModalOp {
  return createModalOp({

    modal: "rashii",
    source,
    reading: "likeness",
    candidates: ["likeness"],
    polite: false,
    past: false
  });
}

export function buildVoiceOp(
  source: OpSource,
  voice: VoiceOp["voice"],
  candidates?: VoiceOp["candidates"],
  options: { readonly honorificFormulaicConstruction?: true } = {}
): VoiceOp {
  return createVoiceOp({

    source,
    voice,
    ...(candidates === undefined ? {} : { candidates }),
    ...(options.honorificFormulaicConstruction === undefined
      ? {}
      : { honorificFormulaicConstruction: options.honorificFormulaicConstruction }),
    forcePassive: false,
    adversativePassive: false,
    adversativePassiveAgentPromoted: false
  });
}

export function buildClassifiedConnectiveOp(
  token: RuntimeHaruToken,
  pos: number,
  previousOps: readonly AuxOpNode[] = [],
  source: OpSource = srcSingle(token, pos)
): ConnectiveOp {
  const surface = token.surface;
  const kind = inferConnectiveKind(token, surface);
  const conditionalQuoteEllipsis = conditionalQuoteEllipsisClassForSurface(surface);
  return createConnectiveOp({

    connective: kind,
    surface,
    ...connectiveFlavorFields(token, previousOps),
    ...(conditionalQuoteEllipsis === undefined
      ? {}
      : { conditionalQuoteEllipsis }),
    source
  });
}

function classicalAuxResidueKindForToken(token: RuntimeHaruToken): ClassicalAuxResidueOp["residue"] {
  const pos4 = token.pos & POS4;
  if (pos4 === 文語助動詞_リ) {
    return "resultative_ri";
  }
  if (pos4 === 文語助動詞_ヌ) {
    return "perfective_nu";
  }
  return "assertive_nari";
}

function inferConnectiveKind(token: RuntimeHaruToken, surface: string): ConnectiveKind {
  if (isPastAuxConditionalForm(token.pos)) {
    return "conditional";
  }
  const kind = lookupConnectiveBySurface(surface);
  if (kind !== undefined) return kind;
  return "adversative";
}

function matchPostpositionalInventoryConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode
): ConnectiveOp | null {
  const pos = cursor.pos;
  const token = cursor.current();
  const registered = registeredClauseConnectiveRelationForToken(token, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (token === undefined || registered === null) {
    return null;
  }
  const kind = registered.connectiveKind;
  if (
    token.surface === "が" &&
    (token.pos & POS1) === 格助詞 &&
    kind === "adversative" &&
    previousOps.some((op) => op.kind === "copula")
  ) {
    cursor.advance(1);
    return createConnectiveOp({

      connective: kind,
      surface: token.surface,
      source: srcSingle(token, pos)
    });
  }
  if (token.surface === "も") {
    return null;
  }
  if (kind !== "concession") {
    return null;
  }
  if (
    token.surface === "にもかかわらず" &&
    !canOwnNimoKakawarazuConnective(previousOps, stemNode)
  ) {
    return null;
  }
  cursor.advance(1);
  return createConnectiveOp({

    connective: kind,
    surface: token.surface,
    source: srcSingle(token, pos)
  });
}

function matchEpistemicHedgePostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const match = matchEpistemicHedgePostverbAuxiliaryAt(cursor.tokens, cursor.pos);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return match.op;
}

function canOwnNimoKakawarazuConnective(
  ops: readonly AuxOpNode[],
  stemNode: StemNode
): boolean {
  return isVerbLikeStemNode(stemNode) ||
    isAdjLikeStemNode(stemNode) ||
    (stemNode.source.tokens[0] !== undefined && (stemNode.source.tokens[0].pos & POS2) === 形状詞可能) ||
    hasNimoKakawarazuCopulaOwnerOp(ops);
}

function hasNimoKakawarazuCopulaOwnerOp(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => op.kind === "copula");
}

function connectiveFlavorFields(
  token: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): { readonly conditionalFlavor?: ConditionalFlavor } {
  if (!isTaraConditionalToken(token)) {
    return {};
  }
  const previousOp = previousOps.length > 0 ? previousOps[previousOps.length - 1] : undefined;
  if (previousOp?.kind === "negation" && negationOpEndsWithNaiSokuon(previousOp)) {
    return {
      conditionalFlavor: hasOperatorBeforeFinalNegation(previousOps)
        ? "counterfactual"
        : "plain"
    };
  }
  if (opEndsWithHoshiiSokuon(previousOp)) {
    return { conditionalFlavor: "counterfactual" };
  }
  return { conditionalFlavor: "plain" };
}

function isTaraConditionalToken(token: RuntimeHaruToken): boolean {
  return token.surface === "たら" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
}

function negationOpEndsWithNaiSokuon(op: NegationOp): boolean {
  const src = op.source.tokens;
  const last = src.length > 0 ? src[src.length - 1] : undefined;
  if (last === undefined) return false;
  const lemma = last.dictionaryForm || last.surface;
  return (lemma === "ない" || lemma === "無い") &&
    (last.pos & POS5) === 連用形_促音便;
}

function opEndsWithHoshiiSokuon(op: AuxOpNode | undefined): boolean {
  if (op?.kind !== "aspect" || op.aspect !== "te_hoshii") {
    return false;
  }
  const src = op.source.tokens;
  const last = src.length > 0 ? src[src.length - 1] : undefined;
  if (last === undefined) return false;
  const lemma = last.dictionaryForm || last.surface;
  return (lemma === "ほしい" || lemma === "欲しい") &&
    (last.pos & POS5) === 連用形_促音便;
}

function hasOperatorBeforeFinalNegation(previousOps: readonly AuxOpNode[]): boolean {
  const lastIndex = previousOps.length - 1;
  for (let i = 0; i < lastIndex; i++) {
    const op = previousOps[i];
    if (op === undefined) continue;
    if (
      op.kind === "aspect" ||
      op.kind === "modal" ||
      op.kind === "desire" ||
      op.kind === "voice" ||
      op.kind === "conjecture" ||
      op.kind === "scopeBridge" ||
      (op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru")
    ) {
      return true;
    }
  }
  return false;
}

function buildStemNode(
  stem: StemInput,
  sourceToken: RuntimeHaruToken,
  stemPos: number,
  headHypothesis: ParseInput["headHypothesis"]
): StemNode {
  const source: OpSource = { tokens: [sourceToken], tokenIndices: [stemPos] };
  const conjugationAnchor = 0;
  const semanticAnchors: readonly number[] = [0];
  if (stem.kind === "candidateSet") {
    const candidateHeadHypothesis = stem.headHypothesis ?? headHypothesis;
    return {
      kind: "candidateSet",
      candidates: stem.candidates,
      ...(candidateHeadHypothesis === undefined ? {} : { headHypothesis: candidateHeadHypothesis }),
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: stem.shortNegationPolicy }),
      ...(stem.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "verb") {
    return {
      kind: "verb",
      lemma: stem.lemma,
      conj: stem.conj ?? "godan",
      irregular: stem.irregular,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: stem.shortNegationPolicy }),
      ...(stem.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "noun") {
    return {
      kind: "noun",
      lemma: stem.lemma,
      sahen: stem.sahen ?? false,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.numericBase === undefined ? {} : { numericBase: stem.numericBase }),
      ...(stem.pronominalNoHeadBase === undefined ? {} : { pronominalNoHeadBase: stem.pronominalNoHeadBase }),
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.nominalTargetForVerbalSource === true
        ? { nominalTargetForVerbalSource: true as const }
        : {}),
      ...(stem.interjection === undefined ? {} : { interjection: stem.interjection }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  if (stem.kind === "adverb") {
    return {
      kind: "adverb",
      lemma: stem.lemma,
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
      ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
      ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
      ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
    };
  }
  return {
    kind: "adj",
    lemma: stem.lemma,
    irregular: stem.irregular,
    source,
    conjugationAnchor,
    semanticAnchors,
    ...(stem.commitment === undefined ? {} : { commitment: stem.commitment }),
    ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
    ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
    ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
  };
}

function matchNominalHostLikeness(
  cursor: TokenCursor<RuntimeHaruToken>
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (
    keijoujiAttributiveMarkerAt(tokens, pos) === "no" ||
    fusedNoYouNiKeijoujiAttributiveAt(tokens, pos)
  ) {
    return null;
  }
  if (t0.surface === "のように" && (t0.pos & POS0) === 助詞) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), "youda", false, "adverbial_ni"), consumed: 1 };
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessPos = hasNoMarker ? pos + 1 : pos;
  const likeness = tokens[likenessPos];
  if (likeness === undefined || (likeness.surface !== "よう" && likeness.surface !== "みたい")) {
    return null;
  }
  if ((likeness.pos & POS1) !== 助動詞語幹) {
    return null;
  }
  if (!hasNoMarker && likeness.surface !== "みたい") {
    return null;
  }
  const form: "youda" | "mitai" = likeness.surface === "よう" ? "youda" : "mitai";
  const copulaPos = likenessPos + 1;
  if (copulaPos >= n) return null;
  const copula = tokens[copulaPos];
  if (copula === undefined) return null;
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;

  if (dewaScopeBridgeRelationAt(tokens, copulaPos, {
    anchorIdx: likenessPos,
    consumers: ["tail_multi_clause"]
  }) !== null && cursor.lookahead(copulaPos - pos, c => matchScopeBridgeTail(c, null)) !== null) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, likenessPos - pos + 1), form, false, "predicative"), consumed: likenessPos - pos + 1 };
  }

  if (copula.surface === "だって" && (copula.pos & POS0) === 助詞) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, likenessPos - pos + 1), form, false, "predicative"), consumed: likenessPos - pos + 1 };
  }

  if (copulaPos5A !== 終止形_ && copulaPos5A !== 連用形_ && copulaPos5A !== 連体形_) {
    return null;
  }
  const consumed = copulaPos - pos + 1;

  if (
    copulaPos4 === 助動詞_ダ &&
    copulaPos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(copula, copulaPos, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, copulaPos + 1)) {
      return {
        op: buildYoudaOp(srcSlice(tokens, pos, consumed + 1), form, false, "predicative"),
        consumed: consumed + 1
      };
    }
    const nominalSimultaneousTokens = copulaSupportSimultaneousConnectiveTokenCountAt(tokens, copulaPos + 1);
    if (nominalSimultaneousTokens !== null) {
      const youda = buildYoudaOp(srcSlice(tokens, pos, consumed + 1), form, false, "predicative");
      const connective: ConnectiveOp = createConnectiveOp({
        connective: "simultaneous",
        surface: DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
        source: srcSlice(tokens, copulaPos, 2 + nominalSimultaneousTokens)
      });
      return { op: youda, ops: [youda, connective], consumed: consumed + 1 + nominalSimultaneousTokens };
    }
  }

  if (copulaPos4 === 助動詞_ダ) {
    const terminal: YoudaTerminal = copulaPos5A === 連体形_
      ? "attributive_na"
      : (copula.pos & POS5) === 連用形_ニ
        ? "adverbial_ni"
        : "predicative";
    return { op: buildYoudaOp(srcSlice(tokens, pos, consumed), form, false, terminal), consumed };
  }
  if (copulaPos4 === 助動詞_デス) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, consumed), form, true), consumed };
  }
  return null;
}

function matchNominalHostLikenessAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>
): readonly AuxOpNode[] | null {
  const match = matchNominalHostLikeness(cursor);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return match.ops ?? [match.op];
}

function canAttachPastToNegationChainFinal(
  negationToken: RuntimeHaruToken,
  pastToken: RuntimeHaruToken | undefined
): pastToken is RuntimeHaruToken {
  if ((negationToken.pos & POS5) !== 連用形_促音便) return false;
  if (pastToken === undefined) return false;
  if ((pastToken.pos & POS4) !== 助動詞_タ) return false;
  const pastInflection5A = pastToken.pos & POS5A;
  return pastInflection5A === 終止形_ || pastInflection5A === 連体形_;
}

function collectNegationChain(
  cursor: TokenCursor<RuntimeHaruToken>,
  admitPairedVolitionalFinal = false
): NegationOp {
  const { tokens, pos: start, end: n } = cursor;
  let depth = 0;
  let pos = start;
  let chainPast = false;
  const sourceTokens: RuntimeHaruToken[] = [];
  const sourceIndices: number[] = [];

  while (pos < n) {
    const token = tokens[pos];
    if (token === undefined) {
      break;
    }
    const pairedVolitionalFinal =
      admitPairedVolitionalFinal &&
      pos === start &&
      isNaiOrNuToken(token) &&
      isVolitionalInflection(token.pos);
    if (!isNegationToken(token, tokens[pos + 1]) && !pairedVolitionalFinal) {
      break;
    }
    const pos5A = token.pos & POS5A;

    depth += 1;
    sourceTokens.push(token);
    sourceIndices.push(pos);
    pos += 1;
    const pastToken = tokens[pos];
    if (canAttachPastToNegationChainFinal(token, pastToken)) {
      sourceTokens.push(pastToken);
      sourceIndices.push(pos);
      pos += 1;
      chainPast = true;
      break;
    }
    if (pos5A === 連用形_) {
      continue;
    }
    break;
  }

  const op = buildNegationOp(srcList(sourceTokens, sourceIndices), depth, chainPast);
  cursor.advance(pos - start);
  return op;
}

export function buildNegationOp(
  source: OpSource,
  chainDepth: number,
  chainPast: boolean,
  preferShortNegation = false
): NegationOp {
  return createNegationOp({

    source,
    chainDepth,
    chainPast,
    stemAux: [],
    preferShortNegation
  });
}

export const MONO_MODAL_SAMPLE_NO_EVIDENCE: MonoModalEvidence = MONO_MODAL_NO_EVIDENCE;
